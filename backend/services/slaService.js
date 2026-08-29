const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Determine target resolution hours based on priority and AI severity
 */
const getTargetHours = (priority, severity) => {
  if (priority === 'Emergency') return 4;
  if (severity === 'Critical') return 8;
  if (priority === 'High') return 24;
  if (priority === 'Medium') return 48;
  return 72; // Low
};

/**
 * Calculate SLA state for a single complaint document
 */
const calculateComplaintSLA = (complaint) => {
  const priority = complaint.priority || 'Medium';
  const severity = complaint.aiAnalysis?.severity || 'Medium';
  const targetHours = complaint.sla?.targetHours || getTargetHours(priority, severity);
  
  const createdAt = new Date(complaint.createdAt || Date.now());
  const now = new Date();
  const deadline = new Date(createdAt.getTime() + targetHours * 60 * 60 * 1000);

  // If complaint is resolved
  if (['Resolved', 'Completed'].includes(complaint.status) || complaint.fieldWork?.resolvedAt) {
    const resolvedTime = new Date(complaint.fieldWork?.resolvedAt || complaint.updatedAt || now);
    const elapsedHours = Math.max(0, Math.round(((resolvedTime - createdAt) / (1000 * 60 * 60)) * 10) / 10);
    const wasBreached = resolvedTime > deadline;

    return {
      targetHours,
      deadline,
      status: 'Completed',
      breachedAt: wasBreached ? deadline : null,
      elapsedHours
    };
  }

  // Active / in-progress complaint
  const elapsedMs = now - createdAt;
  const elapsedHours = Math.max(0, Math.round((elapsedMs / (1000 * 60 * 60)) * 10) / 10);
  const remainingHours = Math.max(0, Math.round(((deadline - now) / (1000 * 60 * 60)) * 10) / 10);

  let status = 'Within SLA';
  let breachedAt = null;

  if (now > deadline) {
    status = 'Breached';
    breachedAt = deadline;
  } else if (elapsedHours >= 0.8 * targetHours) {
    status = 'At Risk';
  }

  return {
    targetHours,
    deadline,
    status,
    breachedAt,
    elapsedHours,
    remainingHours
  };
};

/**
 * Recalculate SLA for all active / unresolved complaints in MongoDB
 */
const recalculateAllActiveSLAs = async () => {
  const activeComplaints = await Complaint.find({
    status: { $nin: ['Resolved', 'Rejected'] }
  });

  const summary = {
    totalChecked: activeComplaints.length,
    withinSLA: 0,
    atRisk: 0,
    breached: 0,
    escalationsTriggered: 0
  };

  const admins = await User.find({ role: { $in: ['Admin', 'Government'] } }).select('_id');

  for (const complaint of activeComplaints) {
    const prevStatus = complaint.sla?.status;
    const slaData = calculateComplaintSLA(complaint);
    
    complaint.sla = {
      targetHours: slaData.targetHours,
      deadline: slaData.deadline,
      status: slaData.status,
      breachedAt: slaData.breachedAt,
      elapsedHours: slaData.elapsedHours
    };

    if (slaData.status === 'Breached') summary.breached++;
    else if (slaData.status === 'At Risk') summary.atRisk++;
    else summary.withinSLA++;

    // Notification on newly breached or at-risk
    if (prevStatus !== slaData.status) {
      if (slaData.status === 'Breached') {
        for (const admin of admins) {
          await Notification.create({
            user: admin._id,
            title: 'SLA Breached Alert',
            message: `Complaint ${complaint.complaintId} has BREACHED its SLA target (${slaData.targetHours}h). Immediate intervention required.`,
            type: 'alert',
            complaint: complaint._id
          }).catch(() => {});
        }
      } else if (slaData.status === 'At Risk' && prevStatus !== 'At Risk') {
        for (const admin of admins) {
          await Notification.create({
            user: admin._id,
            title: 'SLA At Risk Alert',
            message: `Complaint ${complaint.complaintId} is at 80% SLA window and risks breach shortly.`,
            type: 'alert',
            complaint: complaint._id
          }).catch(() => {});
        }
      }
    }

    await complaint.save();
  }

  return summary;
};

module.exports = {
  getTargetHours,
  calculateComplaintSLA,
  recalculateAllActiveSLAs
};
