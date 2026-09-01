const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
    srNo: Number,
    epcNo: { type: String, required: true },
    voterName: String,
    relativeName: String,
    relationType: { type: String, enum: ['Father', 'Husband', 'Wife', 'Other'] },
    houseNo: String,
    age: Number,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    partNo: String,
    boothName: String,
    assemblyConstituency: String,
    pageNo: Number,
    needsReview: { type: Boolean, default: false }
}, {
    timestamps: true
});

// A unique index on EPC Number + Part Number to prevent duplicating records 
// when the same PDF is uploaded multiple times. Uniqueness in the same part guarantees no duplication.
voterSchema.index({ epcNo: 1, partNo: 1 }, { unique: true });

module.exports = mongoose.model('Voter', voterSchema);
