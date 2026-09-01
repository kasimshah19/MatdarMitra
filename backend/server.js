require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const morgan = require('morgan');
const axios = require('axios');
const FormData = require('form-data');

// Import Models
const Voter = require('./models/Voter');
const FamilyList = require('./models/FamilyList');
const Document = require('./models/Document');

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000/extract';
console.log('=================================');
console.log(`[BOOT] PYTHON_SERVICE_URL resolves to:`, PYTHON_SERVICE_URL);
console.log('=================================');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: true // Ensure compound indexes are built
}).then(() => {
    console.log('✅ MongoDB connected successfully! (Mongoose readyState: ' + mongoose.connection.readyState + ')');
}).catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Stack:', err.stack);
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(morgan('dev'));

// Silence Chrome Devtools ping and favicon errors
app.use('/.well-known', (req, res) => res.status(204).end());
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Root path so the browser doesn't throw a default 404 if visited
app.get('/', (req, res) => {
    res.json({ message: "MatdarMitra Backend is running. Frontend should be at http://localhost:3000" });
});

// Multer configs for processing PDFs in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB Max limit for heavy scans
});

/**
 * Basic health check that also verifies downstream service availability
 */
app.get('/api/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    let pythonStatus = { reachable: false, error: null };

    try {
        const pythonBase = new URL(PYTHON_SERVICE_URL).origin;
        // Hit the dedicated health route we just added to Python
        await axios.get(`${pythonBase}/health`, { timeout: 3000 });
        pythonStatus = { reachable: true, error: null };
    } catch (err) {
        pythonStatus.error = {
            code: err.code,
            message: err.message,
            status: err.response ? err.response.status : null,
            data: err.response ? err.response.data : null
        };
    }

    res.json({
        status: 'ok',
        db: dbStatus,
        pythonService: pythonStatus
    });
});

/**
 * Handle new PDF Uploads
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        console.log(`[Upload] Received file: ${req.file.originalname}. Forwarding to Python service...`);

        // Prepare multi-part form data to send the in-memory buffer directly
        const form = new FormData();
        form.append('file', req.file.buffer, req.file.originalname);

        // Send async request to Python service
        const pyResponse = await axios.post(`${PYTHON_SERVICE_URL}-async`, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const { jobId } = pyResponse.data;

        // Save job reference in Mongo for persistence
        const doc = await Document.create({
            fileName: req.file.originalname,
            status: "queued",
            jobId: jobId
        });

        // Immediately return Document ID to frontend to start polling, with status 202 (Accepted)
        res.status(202).json({
            success: true,
            documentId: doc._id,
            jobId: jobId,
            status: "queued",
            message: "Extraction job started"
        });
    } catch (apiErr) {
        console.error('Upload Error:', apiErr);
        res.status(502).json({ error: 'Failed to communicate with extraction microservice' });
    }
});

// Polling endpoint for frontend 
app.get('/api/upload-status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const pyStatusRes = await axios.get(`http://localhost:8000/status/${jobId}`);
        const jobData = pyStatusRes.data;
        const docObj = await Document.findOne({ jobId });

        if (jobData.status === 'completed' && jobData.result) {
            // Once Python is done, insert the data to MongoDB
            const { metadata, voters, summary } = jobData.result;
            let needsReviewCount = 0;
            const validVoters = (voters || []).filter(v => v && v.epcNo && v.epcNo.trim().length > 0);

            const bulkOps = (voters || []).map(v => {
                let epcValue = v.epcNo ? v.epcNo.trim() : "";
                if (!epcValue) {
                    epcValue = `REVIEW-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
                    v.needsReview = true;
                }
                const doc = {
                    srNo: parseInt(v.srNo) || null,
                    epcNo: epcValue,
                    voterName: v.voterName || 'Unknown',
                    relativeName: v.relativeName || 'Unknown',
                    relationType: v.relationType || 'Other',
                    houseNo: v.houseNo || '-',
                    age: parseInt(v.age) || null,
                    gender: v.gender || 'Other',
                    partNo: v.partNo || metadata.partNumber,
                    boothName: metadata.pollingStation,
                    assemblyConstituency: metadata.assemblyConstituency,
                    pageNo: v.pageNo,
                    cardIndex: v.cardIndex || 0,
                    confidence: v.confidence ?? 1.0,
                    needsReview: v.needsReview || false,
                    documentId: docObj ? docObj._id : null
                };
                if (doc.needsReview) needsReviewCount++;
                return {
                    updateOne: {
                        filter: { epcNo: doc.epcNo, partNo: doc.partNo },
                        update: { $set: doc },
                        upsert: true
                    }
                };
            });

            // Use ordered: false so if one record fails validation, it doesn't crash the entire batch
            const bulkResult = bulkOps.length > 0
                ? await Voter.bulkWrite(bulkOps, { ordered: false })
                : { upsertedCount: 0, modifiedCount: 0 };

            // Update document state
            if (docObj) {
                docObj.status = 'completed';
                docObj.totalPages = jobData.totalPages;
                docObj.expectedRecords = jobData.expectedVoters;
                docObj.processingStats = {
                    totalExtracted: (voters || []).length,
                    needsReviewCount: needsReviewCount
                };
                await docObj.save();
            }

            return res.json({
                status: 'completed',
                summary: {
                    totalExtracted: (voters || []).length,
                    newRecords: bulkResult.upsertedCount || 0,
                    updatedRecords: bulkResult.modifiedCount || 0,
                    needsReviewCount: needsReviewCount
                }
            });
        }

        // Return raw progress state
        res.json({
            status: jobData.status,
            pagesProcessed: jobData.pagesProcessed,
            totalPages: jobData.totalPages,
            recordsExtracted: jobData.recordsExtracted,
            expectedVoters: jobData.expectedVoters || 1096,
            error: jobData.error
        });

    } catch (err) {
        console.error("Status Check Error:", err.message);
        res.status(500).json({ error: "Could not check job status" });
    }
});

/**
 * 1. GET /api/voters
 * Fetches extracted voters with server-side pagination and filtering.
 */
app.get('/api/voters', async (req, res) => {
    try {
        const { search, gender, ageMin, ageMax, partNo, page = 1, limit = 5000 } = req.query;
        const filter = {};

        // Fuzzy Search Support
        if (search) {
            const srchRegex = new RegExp(search, 'i');
            filter.$or = [
                { voterName: srchRegex },
                { relativeName: srchRegex },
                { epcNo: srchRegex },
                { houseNo: srchRegex }
            ];
        }

        if (gender && gender !== 'All') {
            filter.gender = gender;
        }

        if (ageMin || ageMax) {
            const ageCond = {};
            if (ageMin) ageCond.$gte = Number(ageMin);
            if (ageMax) ageCond.$lte = Number(ageMax);

            // Allow voters whose age failed to parse (null) to still show up by default
            filter.$or = filter.$or || [];
            if (filter.$or.length > 0) {
                // wrap existing $or in $and to combine safely
                filter.$and = [{ $or: filter.$or }, { $or: [{ age: ageCond }, { age: null }] }];
                delete filter.$or;
            } else {
                filter.$or = [{ age: ageCond }, { age: null }];
            }
        }

        if (partNo) {
            filter.partNo = partNo;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const voters = await Voter.find(filter)
            .sort({ srNo: 1, _id: 1 }) // Deterministic sort by actual sequential serial number mapped across document
            .skip(skip)
            .limit(Number(limit));

        const total = await Voter.countDocuments(filter);

        res.json({
            voters,
            total,
            page: Number(page),
            limit: Number(limit)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 2. GET /api/family-list
 * Fetches the user's populated family list.
 */
app.get('/api/family-list', async (req, res) => {
    try {
        // Findone might return null if empty db
        let list = await FamilyList.findOne();

        if (!list) {
            // Safely return empty list structure to prevent null errors on the frontend
            return res.json({ name: "My Family", voterIds: [] });
        }

        // Populate if it exists
        await list.populate('voterIds');
        res.json(list);
    } catch (err) {
        console.error('\n--- FAMILY LIST ERROR ---');
        console.error('Name:', err.name);
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        console.error('-------------------------\n');
        res.status(500).json({ error: err.message });
    }
});

/**
 * 3. POST /api/family-list
 * Upserts the entire family list array via batch selections.
 */
app.post('/api/family-list', async (req, res) => {
    try {
        const { voterIds } = req.body;
        // Since there is only one family list right now, we find any and update/upsert
        let list = await FamilyList.findOneAndUpdate(
            {},
            { voterIds },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).populate('voterIds');

        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 4. DELETE /api/family-list/:voterId
 * Removes a singular voter from the list manually.
 */
app.delete('/api/family-list/:voterId', async (req, res) => {
    try {
        let list = await FamilyList.findOneAndUpdate(
            {},
            { $pull: { voterIds: req.params.voterId } },
            { new: true }
        ).populate('voterIds');

        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
