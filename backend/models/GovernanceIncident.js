const mongoose = require('mongoose');

const governanceIncidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    unique: true,
    index: true
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
  incidentType: {
    type: String,
    enum: [
      'Complaint Surge',
      'Civic Hotspot',
      'SLA Crisis',
      'Department Overload',
      'Recurring Failure',
      'Emergency Cluster',
      'Citizen Dissatisfaction',
      'Infrastructure Risk'
    ],
    required: true,
    index: true
  },
  category: {
    type: String,
    default: 'General',
    index: true
  },
  department: {
    type: String,
    default: 'Municipality',
    index: true
  },
  area: {
    type: String,
    default: 'Citywide',
    index: true
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  severity: {
    type: String,
    enum: ['INFO', 'WATCH', 'WARNING', 'CRITICAL'],
    default: 'INFO',
    index: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
    index: true
  },
  sourceReferences: {
    complaintIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint'
    }],
    hotspotRef: {
      type: String,
      default: ''
    },
    warningRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EarlyWarning'
    },
    preventiveActionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PreventiveAction'
    }
  },
  status: {
    type: String,
    enum: [
      'Detected',
      'Acknowledged',
      'Action Planned',
      'Dispatched',
      'Monitoring',
      'Resolved',
      'Closed'
    ],
    default: 'Detected',
    index: true
  },
  assignedDepartment: {
    type: String,
    default: 'Municipality'
  },
  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  recommendedAction: {
    type: String,
    default: ''
  },
  actionTaken: {
    type: String,
    default: ''
  },
  responseDeadline: {
    type: Date,
    default: null
  },
  dedupKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  contributingFactors: {
    complaintSurge: { type: Number, default: 0 },
    severity: { type: Number, default: 0 },
    slaBreach: { type: Number, default: 0 },
    citizenDissatisfaction: { type: Number, default: 0 },
    departmentOverload: { type: Number, default: 0 }
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  timeline: [{
    eventType: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

governanceIncidentSchema.pre('save', async function () {
  if (!this.incidentId) {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.incidentId = `INC-${year}-${randomDigits}`;
  }
});

module.exports = mongoose.model('GovernanceIncident', governanceIncidentSchema);
