const mongoose = require('mongoose');

const governanceCycleSchema = new mongoose.Schema({
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // milliseconds
    default: 0
  },
  complaintsAnalyzed: {
    type: Number,
    default: 0
  },
  incidentsDetected: {
    type: Number,
    default: 0
  },
  warningsGenerated: {
    type: Number,
    default: 0
  },
  preventiveActionsGenerated: {
    type: Number,
    default: 0
  },
  departmentsAtRisk: {
    type: Number,
    default: 0
  },
  executionErrors: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['Success', 'Partial', 'Failed'],
    default: 'Success'
  }
}, { timestamps: true });

module.exports = mongoose.model('GovernanceCycle', governanceCycleSchema);
