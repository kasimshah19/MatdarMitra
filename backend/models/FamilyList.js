const mongoose = require('mongoose');

const familyListSchema = new mongoose.Schema({
    name: { type: String, default: 'My Family' },
    voterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Voter' }]
}, {
    timestamps: true
});

module.exports = mongoose.model('FamilyList', familyListSchema);
