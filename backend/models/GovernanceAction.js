const mongoose = require('mongoose');

const governanceActionSchema = new mongoose.Schema({
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GovernanceIncident',
    required: true,
    index: true
  },
  actionType: {
    type: String,
    enum: [
      'Drainage Cleaning',
      'Road Repair',
      'Water Supply Repair',
      'Electricity Repair',
      'Garbage Collection',
      'Street Light Repair',
      'Traffic Management',
      'Emergency Response',
      'Infrastructure Maintenance',
      'Preventive Maintenance',
      'Deploy Workers',
      'Public Advisory',
      'Inspect',
      'Repair',
      'Monitor',
      'Increase Capacity',
      'Other'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Emergency'],
    default: 'High'
  },
  requiredWorkers: {
    type: Number,
    default: 1
  },
  assignedWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }],
  preventiveActionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PreventiveAction',
    default: null
  },
  relatedComplaintIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint'
  }],
  estimatedDuration: {
    type: String,
    default: '24 Hours'
  },
  status: {
    type: String,
    enum: [
      'Recommended',
      'Approved',
      'Dispatched',
      'In Progress',
      'Completed',
      'Cancelled'
    ],
    default: 'Recommended',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('GovernanceAction', governanceActionSchema);
