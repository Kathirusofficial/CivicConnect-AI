const ComplaintSupport = require('../models/ComplaintSupport');

/**
 * Calculates a deterministic, normalized 0-100 AI Civic Impact Score
 * based on real complaint data from MongoDB.
 * 
 * Factors:
 * 1. Community Affected Count (30%): (1 + duplicates + supports)
 * 2. Severity Level (25%): Critical=25, High=20, Medium=12, Low=5
 * 3. Category Urgency (15%): Emergency/Road/Water/Electricity=15, Garbage/Drainage=12, Street Light/Traffic=10, Others=5
 * 4. Geographic Concentration / Duplicate Cluster (15%): duplicateCount * 3
 * 5. SLA Urgency & Age (15%): Ratio of elapsed time to SLA deadline
 */
const calculateCivicImpactScore = async (complaint) => {
  if (!complaint) return null;

  // Fetch actual support count if not stored on document
  let supportCount = complaint.supportCount || 0;
  if (complaint._id) {
    try {
      supportCount = await ComplaintSupport.countDocuments({ complaintId: complaint._id });
    } catch (err) {
      supportCount = complaint.supportCount || 0;
    }
  }

  const duplicateCount = Math.max(1, complaint.duplicateCount || 1);
  const totalAffected = (duplicateCount - 1) + 1 + supportCount;

  // 1. Community Impact Score (max 30 pts)
  const communityScore = Math.min(30, Math.round((totalAffected / 35) * 30));

  // 2. Severity Score (max 25 pts)
  const severityVal = (complaint.aiAnalysis?.severity || complaint.priority || 'Medium').toString();
  let severityScore = 12;
  if (severityVal === 'Critical' || severityVal === 'Emergency') severityScore = 25;
  else if (severityVal === 'High') severityScore = 20;
  else if (severityVal === 'Medium') severityScore = 12;
  else severityScore = 5;

  // 3. Category Urgency Score (max 15 pts)
  const category = (complaint.category || complaint.department || '').toString();
  let categoryScore = 8;
  if (/road|water|electricity|emergency/i.test(category)) categoryScore = 15;
  else if (/garbage|drainage|sanitation/i.test(category)) categoryScore = 12;
  else if (/street|light|traffic/i.test(category)) categoryScore = 10;

  // 4. Geographic Cluster Score (max 15 pts)
  const geographicScore = Math.min(15, Math.round(duplicateCount * 3));

  // 5. Urgency Score (max 15 pts)
  let urgencyScore = 5;
  const createdAt = complaint.createdAt ? new Date(complaint.createdAt) : new Date();
  const ageHours = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
  
  if (complaint.sla?.status === 'Breached') urgencyScore = 15;
  else if (complaint.sla?.status === 'At Risk' || ageHours > 48) urgencyScore = 12;
  else if (ageHours > 24) urgencyScore = 8;

  // Total Impact Score (0-100)
  const impactScore = Math.min(100, communityScore + severityScore + categoryScore + geographicScore + urgencyScore);

  // Impact Level
  let impactLevel = 'Low Impact';
  if (impactScore >= 85) impactLevel = 'Very High Impact';
  else if (impactScore >= 70) impactLevel = 'High Impact';
  else if (impactScore >= 40) impactLevel = 'Medium Impact';

  // Explanations generated strictly from empirical complaint data
  const explanation = [];
  explanation.push(`${totalAffected} citizen${totalAffected > 1 ? 's are' : ' is'} affected/supporting this civic issue.`);
  explanation.push(`Complaint severity is rated as ${severityVal}.`);
  if (duplicateCount > 1) {
    explanation.push(`Cluster contains ${duplicateCount} linked report instances in the vicinity.`);
  }
  if (complaint.sla?.status === 'Breached') {
    explanation.push('SLA target timeline has been breached.');
  } else if (ageHours > 24) {
    explanation.push(`Issue has been active for ${Math.round(ageHours)} hours.`);
  }

  return {
    impactScore,
    impactLevel,
    affectedCitizens: totalAffected,
    communityScore,
    severityScore,
    categoryScore,
    geographicScore,
    urgencyScore,
    explanation
  };
};

module.exports = { calculateCivicImpactScore };
