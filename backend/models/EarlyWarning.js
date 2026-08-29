const mongoose = require('mongoose');

const earlyWarningSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'General'
  },
  department: {
    type: String,
    default: 'Municipality'
  },
  area: {
    type: String,
    default: 'Citywide'
  },
  level: {
    type: String,
    enum: ['INFO', 'WATCH', 'WARNING', 'CRITICAL'],
    default: 'INFO',
    index: true
  },
  metric: {
    type: String,
    default: ''
  },
  threshold: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Acknowledged', 'Resolved'],
    default: 'Active',
    index: true
  },
  dedupKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('EarlyWarning', earlyWarningSchema);
