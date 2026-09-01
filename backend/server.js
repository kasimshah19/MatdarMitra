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

        // Call the Python FastAPI OCR service, with a 2 minute timeout for large PDFs
        let pyResponse;
        try {
            pyResponse = await axios.post(PYTHON_SERVICE_URL, form, {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
        } catch (apiErr) {
            console.error('\n--- PYTHON SERVICE COMM FAILURE ---');
            console.error('URL Attempted:', PYTHON_SERVICE_URL);
            console.error('Error Code:', apiErr.code);
            console.error('Error Message:', apiErr.message);
            console.error('Response Status:', apiErr.response?.status);
            console.error('Response Data:', apiErr.response?.data);
            console.error('-----------------------------------\n');

            return res.status(502).json({
                error: 'Failed to communicate with extraction microservice',
                details: apiErr.response ? apiErr.response.data : apiErr.message,
                code: apiErr.code
            });
        }

        const extractionData = pyResponse.data;

        // Upsert logic for DB processing
        const { metadata, voters, summary } = extractionData;
        let needsReviewCount = 0;

        const bulkOps = voters.map(v => {
            // Enforce the strict types mapped via the frontend requirements
            const doc = {
                srNo: parseInt(v.srNo) || null,
                epcNo: v.epcNo,
                voterName: v.voterName,
                relativeName: v.relativeName,
                relationType: v.relationType,
                houseNo: v.houseNo,
                age: parseInt(v.age) || null,
                gender: v.gender,
                partNo: v.partNo || metadata.partNumber,
                boothName: metadata.pollingStation,
                assemblyConstituency: metadata.assemblyConstituency,
                pageNo: v.pageNo,
                needsReview: v.needsReview || false
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

        const bulkResult = await Voter.bulkWrite(bulkOps);

        res.json({
            success: true,
            summary: {
                totalExtracted: voters.length,
                newRecords: bulkResult.upsertedCount || 0,
                updatedRecords: bulkResult.modifiedCount || 0,
                needsReviewCount: needsReviewCount
            }
        });

    } catch (error) {
        console.error('Unexpected server error during upload sequence:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

/**
 * 1. GET /api/voters
 * Fetches extracted voters with server-side pagination and filtering.
 */
app.get('/api/voters', async (req, res) => {
    try {
        const { search, gender, ageMin, ageMax, partNo, page = 1, limit = 100 } = req.query;
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
            filter.age = {};
            if (ageMin) filter.age.$gte = Number(ageMin);
            if (ageMax) filter.age.$lte = Number(ageMax);
        }

        if (partNo) {
            filter.partNo = partNo;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const voters = await Voter.find(filter)
            .sort({ createdAt: -1 }) // Or partNo/pageNo/srNo
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
