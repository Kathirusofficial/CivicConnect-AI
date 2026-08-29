const mongoose = require('mongoose');

const civicRiskSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Hotspot', 'CategoryTrend', 'DepartmentRisk', 'EmergingIssue'],
    required: true,
    index: true
  },
  name: { type: String, required: true },
  category: { type: String },
  department: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  radiusMeters: { type: Number, default: 500 },
  riskScore: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 0,
    index: true 
  },
  riskLevel: { 
    type: String, 
    enum: ['Critical', 'High', 'Medium', 'Low', 'Normal'], 
    default: 'Normal',
    index: true 
  },
  complaintCount: { type: Number, default: 0 },
  activeComplaintCount: { type: Number, default: 0 },
  unresolvedCount: { type: Number, default: 0 },
  growthPercentage: { type: Number, default: 0 },
  citizenImpact: { type: Number, default: 0 },
  duplicateCount: { type: Number, default: 0 },
  severityDistribution: {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 }
  },
  forecastValue: { type: Number, default: null },
  forecastWindow: { type: String, default: null },
  forecastConfidence: { type: String, default: null },
  recommendedAction: { type: String, default: '' },
  explanation: { type: String, default: '' },
  dataWindow: { 
    type: String, 
    enum: ['7_days', '30_days', '90_days', '180_days'], 
    default: '30_days',
    index: true 
  },
  calculatedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  }
}, {
  timestamps: true
});

civicRiskSchema.index({ type: 1, riskLevel: 1 });
civicRiskSchema.index({ type: 1, dataWindow: 1 });
civicRiskSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('CivicRisk', civicRiskSchema);
