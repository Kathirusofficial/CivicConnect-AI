const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  head: { type: String },
  contactEmail: { type: String },
  stats: {
    totalComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
