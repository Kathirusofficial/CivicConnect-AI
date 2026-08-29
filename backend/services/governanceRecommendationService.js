/**
 * AI Governance Recommendation Service
 * Uses Gemini API for qualitative reasoning and municipal decision guidance
 * with strict deterministic fallback.
 */

const generateGovernanceRecommendation = async (incidentData) => {
  const {
    incidentType,
    category,
    department,
    area,
    riskScore,
    severity,
    complaintCount,
    slaBreaches,
    overloadRisk,
    recommendedWorkers
  } = incidentData;

  // 1. Fallback Deterministic Generator
  const generateFallback = () => {
    let action = 'Deploy standard municipal inspection team to assess the reported location.';
    let reason = `Risk Score is ${riskScore}/100 with ${complaintCount || 1} active complaints reported.`;
    let urgency = 'Today';
    let departmentAction = `Instruct ${department || 'Municipality'} supervisor to log an emergency field audit.`;
    let resourceRecommendation = `Dispatch ${recommendedWorkers || 1} certified field technician(s).`;
    let citizenCommunication = `Municipal crews have been alerted to the ${category || 'civic'} issue in ${area || 'the area'} and are conducting field mitigation.`;

    if (incidentType === 'Emergency Cluster' || severity === 'CRITICAL' || riskScore >= 80) {
      urgency = 'Immediate';
      action = `Dispatch emergency response unit to ${area || 'reported sector'} to contain immediate hazard.`;
      reason = `Critical emergency cluster detected with high risk score (${riskScore}/100) and public safety implications.`;
      departmentAction = `Escalate to ${department || 'Municipal'} Chief Officer; issue immediate field intervention order.`;
      resourceRecommendation = `Deploy ${Math.max(2, recommendedWorkers || 2)} senior emergency response technicians with heavy equipment.`;
      citizenCommunication = `Emergency civic crew deployed to ${area || 'the vicinity'}. Sector isolated for urgent repair.`;
    } else if (incidentType === 'SLA Crisis') {
      urgency = 'Within 4 Hours';
      action = `Reallocate field technicians to clear ${slaBreaches || 2} breached high-priority complaints in ${department}.`;
      reason = `${slaBreaches || 2} complaints have breached municipal service level agreement thresholds.`;
      departmentAction = `Supervisor reallocation of all available field workers to overdue tasks.`;
      resourceRecommendation = `Assign ${recommendedWorkers || 2} additional workers from low-strain departments.`;
      citizenCommunication = `Resolution priority escalated for outstanding grievances in ${area || 'your sector'}.`;
    } else if (incidentType === 'Department Overload') {
      urgency = 'Within 4 Hours';
      action = `Initiate cross-departmental worker balancing to support ${department}.`;
      reason = `Current demand exceeds capacity with high active case backlog.`;
      departmentAction = `Authorize overtime shifts and temporary inter-departmental resource transfer.`;
      resourceRecommendation = `Temporarily assign ${recommendedWorkers || 3} workers from other municipal divisions.`;
      citizenCommunication = `Municipal operations mobilized to address heightened workload in ${department}.`;
    } else if (incidentType === 'Recurring Failure' || incidentType === 'Infrastructure Risk') {
      urgency = 'This Week';
      action = `Schedule comprehensive infrastructure overhaul and preventive maintenance in ${area}.`;
      reason = `Recurring failure patterns indicate structural degradation rather than isolated damage.`;
      departmentAction = `Log civil engineering audit for permanent reconstruction/replacement.`;
      resourceRecommendation = `Commission engineering inspection team and heavy maintenance crew.`;
      citizenCommunication = `Scheduled preventive infrastructure maintenance planned for ${area}.`;
    } else if (incidentType === 'Citizen Dissatisfaction') {
      urgency = 'Within 4 Hours';
      action = `Conduct field quality audit on previously closed complaints and re-inspect workmanship.`;
      reason = `Multiple reopened complaints or low satisfaction ratings detected in ${category}.`;
      departmentAction = `Require mandatory supervisor sign-off before closing future resolutions.`;
      resourceRecommendation = `Dispatch senior quality inspector for on-site verification.`;
      citizenCommunication = `Municipal quality audit initiated. A senior inspector is re-evaluating the resolution.`;
    }

    return {
      recommendedAction: action,
      reason,
      urgency,
      departmentAction,
      resourceRecommendation,
      citizenCommunication
    };
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return generateFallback();
  }

  try {
    const prompt = `You are the AI Municipal Governance Orchestrator for CivicConnect AI.
Provide an operational decision and response plan for the following municipal incident:
- Incident Type: ${incidentType}
- Category: ${category}
- Department: ${department}
- Area: ${area}
- Severity: ${severity}
- Risk Score: ${riskScore}/100
- Complaint Count: ${complaintCount || 1}
- SLA Breaches: ${slaBreaches || 0}
- Department Overload Status: ${overloadRisk || 'Normal'}
- Recommended Worker Count: ${recommendedWorkers || 1}

Respond with ONLY a valid JSON object strictly matching this schema:
{
  "recommendedAction": "Concise primary action string",
  "reason": "Clear explanation based on data",
  "urgency": "Immediate" | "Within 4 Hours" | "Today" | "This Week",
  "departmentAction": "Specific instructions for the municipal department",
  "resourceRecommendation": "Field workforce and equipment allocation",
  "citizenCommunication": "Public advisory or transparency update for affected citizens"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return generateFallback();
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return generateFallback();
    }

    const parsed = JSON.parse(candidateText);
    if (!parsed.recommendedAction || !parsed.reason) {
      return generateFallback();
    }

    return {
      recommendedAction: parsed.recommendedAction,
      reason: parsed.reason,
      urgency: parsed.urgency || 'Today',
      departmentAction: parsed.departmentAction || `Coordinate with ${department} team.`,
      resourceRecommendation: parsed.resourceRecommendation || `Dispatch ${recommendedWorkers || 1} field worker(s).`,
      citizenCommunication: parsed.citizenCommunication || 'Municipal crew dispatched to resolve civic issue.'
    };
  } catch (err) {
    return generateFallback();
  }
};

module.exports = {
  generateGovernanceRecommendation
};
