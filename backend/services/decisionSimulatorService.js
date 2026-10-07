const Complaint = require('../models/Complaint');
const { calculateCivicImpactScore } = require('./civicImpactService');
const { predictSlaRisk } = require('./slaPredictionService');
const { estimateEnvironmentalImpact } = require('./environmentalImpactService');
const aiService = require('./aiService');

/**
 * AI Decision Simulator Service
 * Generates ranked civic decision metrics and strategic action plans.
 */
const generateDecisionSimulation = async (filters = {}) => {
  const query = { status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolution Pending Verification', 'REVIEW_REQUIRED', 'Reopened'] } };

  if (filters.department) {
    query.department = { $regex: new RegExp(filters.department, 'i') };
  }
  if (filters.category) {
    query.category = { $regex: new RegExp(filters.category, 'i') };
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }

  const complaints = await Complaint.find(query).lean();

  const rankedSimulations = await Promise.all(
    complaints.map(async (c) => {
      const impact = await calculateCivicImpactScore(c);
      const slaRisk = await predictSlaRisk(c);
      const envImpact = estimateEnvironmentalImpact(c);

      // Composite Rank Score (0-100)
      const rankScore = Math.min(100, Math.round(
        (impact.impactScore * 0.45) +
        (slaRisk.riskScore * 0.35) +
        (envImpact.impactAvailable ? 20 : 0)
      ));

      let recommendedPriority = 'Medium Priority';
      if (rankScore >= 85) recommendedPriority = 'Immediate Dispatch Required';
      else if (rankScore >= 70) recommendedPriority = 'High Priority Action';
      else if (rankScore >= 50) recommendedPriority = 'Standard Priority';

      return {
        _id: c._id,
        complaintId: c.complaintId || `CMP-${c._id.toString().slice(-6)}`,
        title: c.title,
        category: c.category || c.department,
        department: c.department,
        location: c.address,
        latitude: c.latitude,
        longitude: c.longitude,
        status: c.status,
        priority: c.priority,
        affectedCitizens: impact.affectedCitizens,
        impactScore: impact.impactScore,
        impactLevel: impact.impactLevel,
        slaRiskScore: slaRisk.riskScore,
        slaRiskLevel: slaRisk.riskLevel,
        predictedBreach: slaRisk.predictedBreach,
        hoursRemaining: slaRisk.hoursRemaining,
        environmentalImpact: envImpact,
        rankScore,
        recommendedPriority
      };
    })
  );

  // Sort by highest rankScore descending
  rankedSimulations.sort((a, b) => b.rankScore - a.rankScore);

  return rankedSimulations;
};

/**
 * Generates an Action Plan combining deterministic ranking DATA
 * with an optional Gemini AI natural language executive summary overlay.
 */
const generateActionPlan = async (filters = {}) => {
  const rankedItems = await generateDecisionSimulation(filters);
  const topPriorityItems = rankedItems.slice(0, 10);

  // Structural DATA response
  const actionPlanData = {
    generatedAt: new Date(),
    totalActiveComplaintsAnalyzed: rankedItems.length,
    highImpactCount: rankedItems.filter(i => i.impactScore >= 70).length,
    criticalSlaCount: rankedItems.filter(i => i.slaRiskLevel === 'CRITICAL' || i.slaRiskLevel === 'HIGH').length,
    topRankedIssues: topPriorityItems
  };

  // Optional Gemini AI Interpretation Overlay
  let aiExplanation = '';
  try {
    const summaryPromptData = topPriorityItems.map((item, idx) => 
      `${idx + 1}. [${item.complaintId}] ${item.title} (${item.department}) - Impact: ${item.impactScore}/100, SLA Risk: ${item.slaRiskLevel}, Affected: ${item.affectedCitizens}`
    ).join('\n');

    if (aiService && typeof aiService.generateText === 'function') {
      aiExplanation = await aiService.generateText(
        `Synthesize a concise 3-bullet executive municipal action plan based on these top-ranked civic issues:\n${summaryPromptData}`
      );
    }
  } catch (err) {
    aiExplanation = `Strategic Action Plan compiled for ${topPriorityItems.length} top-ranked issues. Immediate deployment recommended for high impact and SLA risk clusters.`;
  }

  if (!aiExplanation) {
    aiExplanation = `Executive Action Plan: ${topPriorityItems.length} priority issues identified. Immediate field resource deployment recommended for top-ranked civic hazards.`;
  }

  return {
    DATA: actionPlanData,
    AI_EXPLANATION: aiExplanation
  };
};

module.exports = {
  generateDecisionSimulation,
  generateActionPlan
};
