const Complaint = require('../models/Complaint');
const PreventiveAction = require('../models/PreventiveAction');
const { getRiskLevel } = require('./hotspotService');

/**
 * Generate preventive maintenance recommendations from complaint patterns
 */
const generatePreventiveActions = async () => {
  const complaints = await Complaint.find().lean();
  if (!complaints || complaints.length === 0) {
    return [];
  }

  // Group by Area & Category
  const patternMap = {};

  for (const c of complaints) {
    const area = (c.address || 'City Center').split(',')[0].trim();
    const cat = c.category || 'General';
    const dept = c.department || 'Municipality';
    const key = `${area}::${cat}`;

    if (!patternMap[key]) {
      patternMap[key] = {
        area,
        category: cat,
        department: dept,
        complaints: [],
        reopenCount: 0,
        emergencyCount: 0,
        breachedCount: 0
      };
    }

    patternMap[key].complaints.push(c);
    if (c.reopenCount) patternMap[key].reopenCount += c.reopenCount;
    if (c.priority === 'Emergency') patternMap[key].emergencyCount++;
    if (c.sla?.status === 'Breached') patternMap[key].breachedCount++;
  }

  const recommendations = [];

  for (const key of Object.keys(patternMap)) {
    const pattern = patternMap[key];
    const count = pattern.complaints.length;

    // Minimum 2 complaints in an area/category to constitute a pattern
    if (count >= 2) {
      const rawScore = Math.min(100, Math.round(
        (count * 12) +
        (pattern.emergencyCount * 20) +
        (pattern.reopenCount * 15) +
        (pattern.breachedCount * 10)
      ));
      const riskScore = Math.max(25, rawScore);
      const riskLevel = getRiskLevel(riskScore);

      // Tailored action text by category
      let recommendedAction = `Perform comprehensive preventive audit of ${pattern.category} infrastructure in ${pattern.area}.`;
      let title = `Preventive Maintenance: ${pattern.category} in ${pattern.area}`;

      if (pattern.category.toLowerCase().includes('drain') || pattern.category.toLowerCase().includes('flood')) {
        title = `Desilting & Stormwater Drainage Inspection in ${pattern.area}`;
        recommendedAction = `Conduct mechanical desilting of primary stormwater drains and clear culverts before monsoon runoff.`;
      } else if (pattern.category.toLowerCase().includes('road') || pattern.category.toLowerCase().includes('pothole')) {
        title = `Pavement Resurfacing & Base Compaction in ${pattern.area}`;
        recommendedAction = `Resurface asphalt corridor and compact road sub-base to prevent recurring potholes.`;
      } else if (pattern.category.toLowerCase().includes('light') || pattern.category.toLowerCase().includes('electric')) {
        title = `Electrical Feeder & Luminaire Audit in ${pattern.area}`;
        recommendedAction = `Inspect underground junction boxes and replace damaged LED fixtures along sector poles.`;
      } else if (pattern.category.toLowerCase().includes('water') || pattern.category.toLowerCase().includes('pipe')) {
        title = `Main Pipeline Pressure Testing & Valve Replacement in ${pattern.area}`;
        recommendedAction = `Perform acoustic leak detection along distribution pipeline and replace degraded supply joints.`;
      } else if (pattern.category.toLowerCase().includes('garbage') || pattern.category.toLowerCase().includes('sanitat')) {
        title = `Sanitation Logistics & Secondary Dump Elimination in ${pattern.area}`;
        recommendedAction = `Deploy high-capacity compactor bins and double daily collection frequency during peak hours.`;
      }

      const urgency = riskLevel;
      const estimatedImpact = `Prevents up to ${Math.round(count * 2.5)} future citizen complaints and reduces municipal repair expenditure by ~40%.`;
      const evidence = pattern.complaints.slice(0, 3).map(c => `CMP ID: ${c.complaintId || c._id} - ${c.title}`);

      // Upsert into PreventiveAction collection
      let actionDoc = await PreventiveAction.findOne({
        area: pattern.area,
        category: pattern.category
      });

      if (!actionDoc) {
        actionDoc = await PreventiveAction.create({
          title,
          category: pattern.category,
          department: pattern.department,
          area: pattern.area,
          riskScore,
          recommendedAction,
          urgency,
          estimatedImpact,
          evidence,
          status: 'Recommended'
        });
      } else {
        actionDoc.riskScore = riskScore;
        actionDoc.urgency = urgency;
        actionDoc.estimatedImpact = estimatedImpact;
        actionDoc.evidence = evidence;
        await actionDoc.save();
      }

      recommendations.push(actionDoc);
    }
  }

  return recommendations.sort((a, b) => b.riskScore - a.riskScore);
};

module.exports = {
  generatePreventiveActions
};
