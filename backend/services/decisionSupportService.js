const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Worker = require('../models/Worker');

class DecisionSupportService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
  }

  /**
   * Calculates dynamic decision support metrics for a complaint.
   * @param {Object|String} complaintOrId - Mongoose doc or complaint _id
   * @returns {Object} decisionSupport subdocument object
   */
  async calculateDecisionSupport(complaintOrId) {
    let complaint = complaintOrId;
    if (typeof complaintOrId === 'string' || complaintOrId instanceof require('mongoose').Types.ObjectId) {
      complaint = await Complaint.findById(complaintOrId);
    }
    if (!complaint) throw new Error('Complaint not found');

    const isResolvedOrClosed = complaint.status === 'Resolved' || complaint.status === 'Rejected';

    // 1. PRIORITY WEIGHT (Max 25 pts)
    const prioVal = (complaint.priority || complaint.aiAnalysis?.priority || 'Medium').toLowerCase();
    let priorityBase = 50;
    if (prioVal === 'emergency') priorityBase = 100;
    else if (prioVal === 'high') priorityBase = 75;
    else if (prioVal === 'medium') priorityBase = 50;
    else if (prioVal === 'low') priorityBase = 25;
    const priorityContribution = (priorityBase * 0.25);

    // 2. SEVERITY WEIGHT (Max 25 pts)
    const sevVal = (complaint.aiAnalysis?.severity || (prioVal === 'emergency' ? 'Critical' : prioVal === 'high' ? 'High' : 'Medium')).toLowerCase();
    let severityBase = 50;
    if (sevVal === 'critical') severityBase = 100;
    else if (sevVal === 'high') severityBase = 75;
    else if (sevVal === 'medium') severityBase = 50;
    else if (sevVal === 'low') severityBase = 25;
    const severityContribution = (severityBase * 0.25);

    // 3. CITIZEN IMPACT & DUPLICATE CLUSTER (Max 20 pts)
    let citizenImpactCount = 1;
    if (complaint.duplicateGroupId) {
      const groupCount = await Complaint.countDocuments({ duplicateGroupId: complaint.duplicateGroupId });
      citizenImpactCount = Math.max(1, groupCount);
    } else if (complaint.duplicateOf) {
      const parentCount = await Complaint.countDocuments({ 
        $or: [{ _id: complaint.duplicateOf }, { duplicateOf: complaint.duplicateOf }] 
      });
      citizenImpactCount = Math.max(1, parentCount);
    }

    let impactBase = 20;
    if (citizenImpactCount >= 10) impactBase = 100;
    else if (citizenImpactCount >= 6) impactBase = 85;
    else if (citizenImpactCount >= 2) impactBase = 60;
    else impactBase = 20;
    const impactContribution = (impactBase * 0.20);

    // 4. COMPLAINT AGE (Max 10 pts)
    let ageBase = 0;
    let ageScore = 0;
    if (!isResolvedOrClosed && complaint.createdAt) {
      const ageHours = Math.max(0, (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60));
      if (ageHours >= 48) ageBase = 100;
      else if (ageHours >= 24) ageBase = 80;
      else if (ageHours >= 12) ageBase = 60;
      else if (ageHours >= 4) ageBase = 40;
      else ageBase = 20;
      ageScore = ageBase;
    }
    const ageContribution = (ageBase * 0.10);

    // 5. DUPLICATE IMPACT SCORE (Max 10 pts)
    let duplicateImpactBase = 0;
    if (citizenImpactCount > 1) {
      duplicateImpactBase = Math.min(100, citizenImpactCount * 15);
    }
    const duplicateContribution = (duplicateImpactBase * 0.10);

    // 6. URGENCY / EMERGENCY BOOSTER (Max 10 pts)
    let urgencyBase = 20;
    if (prioVal === 'emergency' || sevVal === 'critical') {
      urgencyBase = 100;
    } else if (prioVal === 'high' || sevVal === 'high') {
      urgencyBase = 60;
    }
    const urgencyContribution = (urgencyBase * 0.10);

    // 7. DEPARTMENT WORKLOAD FACTOR
    const deptName = complaint.department || complaint.assignedDepartment;
    let departmentLoadScore = 0;
    let departmentLoadStatus = 'Normal';

    if (deptName) {
      const activeDeptComplaints = await Complaint.countDocuments({
        department: deptName,
        status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress'] }
      });
      const deptDoc = await Department.findOne({ name: deptName });
      const availableWorkers = deptDoc 
        ? await Worker.countDocuments({ department: deptDoc._id, status: 'Available' })
        : await Worker.countDocuments({ status: 'Available' });

      const loadRatio = availableWorkers === 0 ? (activeDeptComplaints > 0 ? 10 : 0) : (activeDeptComplaints / availableWorkers);
      if (loadRatio >= 5) {
        departmentLoadScore = 90;
        departmentLoadStatus = 'Critical';
      } else if (loadRatio >= 3) {
        departmentLoadScore = 75;
        departmentLoadStatus = 'Overloaded';
      } else if (loadRatio >= 1.5) {
        departmentLoadScore = 50;
        departmentLoadStatus = 'Busy';
      } else {
        departmentLoadScore = 25;
        departmentLoadStatus = 'Normal';
      }
    }

    // CALCULATE FINAL NORMALIZED SCORE (0 - 100)
    let rawScore = (
      priorityContribution +
      severityContribution +
      impactContribution +
      ageContribution +
      duplicateContribution +
      urgencyContribution
    );

    // Emergency safety floor: Critical safety hazards must not wait for age/duplicates to reach Critical priority
    if (!isResolvedOrClosed) {
      if (prioVal === 'emergency' && sevVal === 'critical') {
        rawScore = Math.max(rawScore, 90);
      } else if (prioVal === 'emergency' || sevVal === 'critical') {
        rawScore = Math.max(rawScore, 82);
      }
    }

    // If resolved or rejected, clamp operational priority
    if (complaint.status === 'Resolved') rawScore = Math.min(rawScore, 10);
    if (complaint.status === 'Rejected') rawScore = 0;

    const finalPriorityScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // DETERMINE LEVEL
    let priorityLevel = 'Low';
    if (finalPriorityScore >= 80) priorityLevel = 'Critical';
    else if (finalPriorityScore >= 60) priorityLevel = 'High';
    else if (finalPriorityScore >= 40) priorityLevel = 'Medium';
    else priorityLevel = 'Low';

    // RECOMMENDED ACTION
    const recommendedAction = this.generateRecommendedAction(complaint, priorityLevel, finalPriorityScore, citizenImpactCount, ageBase);

    // EXPLANATION
    const explanation = await this.generateExplanation({
      title: complaint.title,
      category: complaint.category || complaint.department,
      priority: complaint.priority,
      severity: sevVal,
      citizenImpactCount,
      priorityLevel,
      priorityScore: finalPriorityScore,
      status: complaint.status,
      recommendedAction,
      departmentLoadStatus
    });

    const result = {
      priorityScore: finalPriorityScore,
      priorityLevel,
      citizenImpactCount,
      duplicateImpactScore: Math.round(duplicateImpactBase),
      ageScore: Math.round(ageScore),
      severityScore: Math.round(severityBase),
      urgencyScore: Math.round(urgencyBase),
      departmentLoadScore: Math.round(departmentLoadScore),
      breakdown: {
        priorityContribution: Number(priorityContribution.toFixed(1)),
        severityContribution: Number(severityContribution.toFixed(1)),
        impactContribution: Number(impactContribution.toFixed(1)),
        ageContribution: Number(ageContribution.toFixed(1)),
        duplicateContribution: Number(duplicateContribution.toFixed(1)),
        urgencyContribution: Number(urgencyContribution.toFixed(1))
      },
      recommendedAction,
      explanation,
      calculatedAt: new Date()
    };

    // Save directly to complaint if mongoose doc
    if (complaint.save && typeof complaint.save === 'function') {
      complaint.decisionSupport = result;
      await complaint.save();
    } else {
      await Complaint.findByIdAndUpdate(complaint._id, { decisionSupport: result });
    }

    return result;
  }

  generateRecommendedAction(complaint, level, score, impactCount, ageBase) {
    if (complaint.status === 'Resolved') {
      return 'Issue successfully resolved. No further municipal action required.';
    }
    if (complaint.status === 'Rejected') {
      return 'Complaint closed with rejection notes.';
    }
    if (level === 'Critical' && !complaint.assignedWorker) {
      return 'Immediate field response recommended. Dispatch an emergency crew immediately.';
    }
    if (level === 'Critical' && complaint.assignedWorker) {
      return 'Emergency response in progress. Monitor field crew status closely until resolved.';
    }
    if (impactCount >= 5) {
      return 'Treat as high-impact cluster incident and coordinate a unified departmental crew.';
    }
    if (ageBase >= 80 && !complaint.assignedWorker) {
      return 'Escalation review recommended. Long-pending complaint requires immediate worker assignment.';
    }
    if (level === 'High' && !complaint.assignedWorker) {
      return 'Assign an available field worker within the current operational shift.';
    }
    if (level === 'Medium') {
      return 'Process through standard departmental queue in chronological order.';
    }
    return 'Schedule during routine departmental maintenance.';
  }

  async generateExplanation(data) {
    const fallbackText = `This complaint is ranked ${data.priorityLevel} (Score: ${data.priorityScore}/100) based on ${data.severity} severity, ${data.priority} priority, and ${data.citizenImpactCount} citizen report${data.citizenImpactCount > 1 ? 's' : ''}. Recommended action: ${data.recommendedAction}`;

    const apiKey = process.env.GEMINI_API_KEY || this.apiKey;
    if (!apiKey) {
      return fallbackText;
    }

    try {
      const prompt = `You are an AI Municipal Operations Decision Support Engine.
Generate a concise 1-2 sentence operational explanation for a government officer explaining why this complaint was ranked ${data.priorityLevel} (Score: ${data.priorityScore}/100).

Complaint Details:
- Title: ${data.title}
- Category: ${data.category}
- Priority: ${data.priority}
- AI Severity: ${data.severity}
- Citizen Impact Count: ${data.citizenImpactCount}
- Department Workload: ${data.departmentLoadStatus}
- Status: ${data.status}
- Action: ${data.recommendedAction}

Keep it professional, factual, and strictly focused on public safety and municipal priority. Output plain text only.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) return fallbackText;

      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return text && text.length > 10 ? text : fallbackText;
    } catch (err) {
      return fallbackText;
    }
  }

  /**
   * Bulk recalculates decision support for all active complaints.
   */
  async recalculateAllActive() {
    const activeComplaints = await Complaint.find({
      status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress'] }
    });

    const results = [];
    for (const comp of activeComplaints) {
      try {
        const ds = await this.calculateDecisionSupport(comp);
        results.push({ id: comp.complaintId || comp._id, score: ds.priorityScore, level: ds.priorityLevel });
      } catch (e) {
        console.error(`Failed to calculate decision support for ${comp._id}:`, e);
      }
    }
    return results;
  }
}

module.exports = new DecisionSupportService();
