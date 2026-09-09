const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: { 
    type: String, 
    unique: true, 
    index: true 
  },
  title: { type: String, required: true },
  category: { type: String },
  department: { type: String, required: true },
  description: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Emergency'], 
    required: true,
    default: 'Medium'
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolution Pending Verification', 'VERIFICATION_FAILED', 'REVIEW_REQUIRED', 'Resolved', 'SOLVED', 'Rejected', 'Reopened'], 
    default: 'Pending' 
  },
  address: { type: String, required: true },
  landmark: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  images: [{ type: String }],
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
  assignedDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  remarks: [{
    author: { type: String },
    text: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  aiAnalysis: {
    category: { type: String },
    department: { type: String },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Emergency'] },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
    summary: { type: String },
    confidence: { type: Number, default: 0 },
    analyzedAt: { type: Date, default: Date.now },
    classificationSource: { 
      type: String, 
      enum: ['AI Recommended', 'Citizen Modified', 'Admin Modified', 'Manual'], 
      default: 'AI Recommended' 
    }
  },
  duplicateOf: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Complaint', 
    default: null 
  },
  duplicateGroupId: { 
    type: String, 
    default: null, 
    index: true 
  },
  duplicateCount: { 
    type: Number, 
    default: 1 
  },
  decisionSupport: {
    priorityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    priorityLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium'
    },
    recommendedAction: {
      type: String,
      default: 'Awaiting review and initial prioritization.'
    },
    explanation: {
      type: String,
      default: 'Decision support calculated from operational parameters.'
    },
    breakdown: {
      priorityContribution: { type: Number, default: 0 },
      severityContribution: { type: Number, default: 0 },
      impactContribution: { type: Number, default: 0 },
      ageContribution: { type: Number, default: 0 },
      duplicateContribution: { type: Number, default: 0 },
      urgencyContribution: { type: Number, default: 0 }
    },
    calculatedAt: {
      type: Date,
      default: Date.now
    }
  },
  // PHASE 7: CITIZEN SATISFACTION, SLA & RESOLUTION QUALITY
  citizenFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    resolvedByCitizen: {
      type: Boolean,
      default: null
    },
    comment: {
      type: String,
      default: ''
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  sla: {
    targetHours: {
      type: Number,
      default: 72
    },
    deadline: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['Within SLA', 'At Risk', 'Breached', 'Completed'],
      default: 'Within SLA'
    },
    breachedAt: {
      type: Date,
      default: null
    },
    elapsedHours: {
      type: Number,
      default: 0
    }
  },
  resolutionQuality: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    level: {
      type: String,
      enum: ['Excellent', 'Good', 'Needs Review', 'Poor'],
      default: null
    },
    evidenceScore: {
      type: Number,
      default: 0
    },
    feedbackScore: {
      type: Number,
      default: 0
    },
    completionScore: {
      type: Number,
      default: 0
    },
    aiExplanation: {
      type: String,
      default: ''
    },
    recommendation: {
      type: String,
      default: ''
    },
    calculatedAt: {
      type: Date,
      default: null
    }
  },
  escalation: {
    isEscalated: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      default: ''
    },
    level: {
      type: String,
      enum: ['None', 'Department', 'Senior Officer', 'Municipal Commissioner'],
      default: 'None'
    },
    escalatedAt: {
      type: Date,
      default: null
    }
  },
  reopenCount: {
    type: Number,
    default: 0
  },
  fieldWork: {
    assignedAt: { type: Date },
    acceptedAt: { type: Date },
    startedAt: { type: Date },
    resolutionSubmittedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  resolution: {
    status: { 
      type: String, 
      enum: ['Not Submitted', 'Pending Verification', 'Submitted', 'Pending', 'Approved', 'Rejected', 'Resolved', 'SOLVED'], 
      default: 'Not Submitted' 
    },
    notes: { type: String, default: '' },
    proofImage: { type: String, default: '' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    submittedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    solvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    solvedAt: { type: Date },
    rejectionReason: { type: String, default: '' }
  },
  resolutionVerification: {
    status: {
      type: String,
      enum: ['NOT_VERIFIED', 'VERIFIED', 'REJECTED', 'REVIEW_REQUIRED'],
      default: 'NOT_VERIFIED'
    },
    confidence: { type: Number, default: 0 },
    imageRelevant: { type: Boolean, default: false },
    problemDetected: { type: Boolean, default: false },
    matchesComplaint: { type: Boolean, default: false },
    resolutionEvidenceDetected: { type: Boolean, default: false },
    locationVerified: { type: Boolean, default: false },
    officerLatitude: { type: Number, default: null },
    officerLongitude: { type: Number, default: null },
    complaintLatitude: { type: Number, default: null },
    complaintLongitude: { type: Number, default: null },
    distanceMeters: { type: Number, default: null },
    aiReason: { type: String, default: '' },
    recommendation: { type: String, default: '' },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  evidence: [{
    type: { 
      type: String, 
      enum: ['before', 'after', 'general'], 
      default: 'general' 
    },
    url: { type: String, required: true },
    description: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  predictiveIntelligence: {
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
      index: true
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: null,
      index: true
    },
    predictedCategory: {
      type: String,
      default: null
    },
    predictedComplaintVolume: {
      next7Days: {
        type: Number,
        default: null
      },
      next30Days: {
        type: Number,
        default: null
      }
    },
    hotspotScore: {
      type: Number,
      default: 0
    },
    trendScore: {
      type: Number,
      default: 0
    },
    repeatIssueScore: {
      type: Number,
      default: 0
    },
    slaRiskScore: {
      type: Number,
      default: 0
    },
    resourceRiskScore: {
      type: Number,
      default: 0
    },
    preventiveRecommendation: {
      type: String,
      default: ''
    },
    explanation: {
      type: String,
      default: ''
    },
    calculatedAt: {
      type: Date,
      default: null
    }
  },
  moreInfoRequested: { type: Boolean, default: false },
  moreInfoText: { type: String },
  timeline: [{
    status: { type: String },
    title: { type: String },
    description: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Compound indexes for fast candidate searching & analytics
complaintSchema.index({ category: 1, status: 1, createdAt: -1 });
complaintSchema.index({ latitude: 1, longitude: 1 });
complaintSchema.index({ 'sla.status': 1 });
complaintSchema.index({ 'sla.deadline': 1 });
complaintSchema.index({ 'citizenFeedback.rating': 1 });
complaintSchema.index({ 'resolutionQuality.score': 1 });
complaintSchema.index({ 'escalation.isEscalated': 1 });

// Auto-generate human readable tracking ID if not provided
complaintSchema.pre('save', async function () {
  if (!this.complaintId) {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.complaintId = `CMP-${year}-${randomDigits}`;
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
