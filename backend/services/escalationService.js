const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Evaluate and trigger escalation for a complaint based on civic triggers
 */
const evaluateAndEscalate = async (complaint, triggerContext = {}) => {
  let isEscalated = false;
  let level = 'None';
  let reason = '';

  const priority = complaint.priority;
  const severity = complaint.aiAnalysis?.severity;
  const reopenCount = complaint.reopenCount || 0;
  const slaStatus = complaint.sla?.status;
  const qualityScore = complaint.resolutionQuality?.score;
  const feedback = complaint.citizenFeedback;

  // 1. Level: Municipal Commissioner (Severe breaches / repeated failures)
  if (reopenCount >= 2) {
    isEscalated = true;
    level = 'Municipal Commissioner';
    reason = `Complaint has been reopened ${reopenCount} times by the citizen. Severe service failure requiring executive intervention.`;
  } else if (priority === 'Emergency' && slaStatus === 'Breached') {
    isEscalated = true;
    level = 'Municipal Commissioner';
    reason = 'Emergency civic hazard has breached its SLA target without operational resolution.';
  }
  // 2. Level: Senior Officer (Critical breaches / single reopen / poor quality)
  else if (reopenCount === 1 || feedback?.resolvedByCitizen === false) {
    isEscalated = true;
    level = 'Senior Officer';
    reason = `Citizen rejected field resolution: "${feedback?.comment || 'Issue not resolved'}". Rework escalated to Senior Municipal Officer.`;
  } else if ((severity === 'Critical' || priority === 'High') && slaStatus === 'Breached') {
    isEscalated = true;
    level = 'Senior Officer';
    reason = `High-impact complaint has breached its SLA deadline. Senior Officer review required.`;
  } else if (typeof qualityScore === 'number' && qualityScore < 50) {
    isEscalated = true;
    level = 'Senior Officer';
    reason = `Resolution quality score fell to ${qualityScore}/100 (Poor). Technical audit required.`;
  }
  // 3. Level: Department Head (Standard SLA breaches)
  else if (slaStatus === 'Breached') {
    isEscalated = true;
    level = 'Department';
    reason = `Standard SLA target exceeded. Escalated to Department Supervisor.`;
  }

  // If triggered by an explicit context
  if (triggerContext.forcedReason) {
    isEscalated = true;
    reason = triggerContext.forcedReason;
    if (triggerContext.level) level = triggerContext.level;
  }

  // Update complaint document if newly escalated or level upgraded
  const prevLevel = complaint.escalation?.level || 'None';
  if (isEscalated && level !== 'None' && level !== prevLevel) {
    complaint.escalation = {
      isEscalated: true,
      reason,
      level,
      escalatedAt: new Date()
    };

    if (!complaint.timeline) complaint.timeline = [];
    complaint.timeline.push({
      status: complaint.status || 'Escalated',
      title: `Complaint Escalated to ${level}`,
      description: reason,
      updatedBy: triggerContext.userId || null,
      createdAt: new Date()
    });

    if (typeof complaint.save === 'function') {
      await complaint.save();
    }

    // Notify all Government Admins
    const admins = await User.find({ role: { $in: ['Admin', 'Government'] } }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        title: `🚨 Escalation Alert (${level})`,
        message: `Complaint ${complaint.complaintId} escalated to ${level}: ${reason}`,
        type: 'alert',
        complaint: complaint._id
      }).catch(() => {});
    }
  }

  return { isEscalated, level, reason };
};

module.exports = {
  evaluateAndEscalate
};
