const mongoose = require('mongoose');

const preventiveActionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  recommendedAction: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Recommended', 'Planned', 'Dispatched', 'Completed', 'Dismissed'],
    default: 'Recommended',
    index: true
  },
  evidence: [{
    type: String
  }],
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  estimatedImpact: {
    type: String,
    default: ''
  },
  plannedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

preventiveActionSchema.index({ category: 1, department: 1, area: 1, status: 1 });

module.exports = mongoose.model('PreventiveAction', preventiveActionSchema);
