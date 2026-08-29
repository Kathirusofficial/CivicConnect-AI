const Department = require('../models/Department');
const Worker = require('../models/Worker');
const Complaint = require('../models/Complaint');

/**
 * Perform pure read-only mathematical workforce simulation
 */
const simulateResourceImpact = async ({ department: deptName, additionalWorkers = 1 }) => {
  const extraWorkers = Math.max(0, parseInt(additionalWorkers) || 0);

  // Find department
  const dept = await Department.findOne({
    name: { $regex: new RegExp(`^${deptName}$`, 'i') }
  }).lean();

  const deptQuery = dept ? { assignedDepartment: dept._id } : { department: deptName };
  const complaints = await Complaint.find(deptQuery).lean();
  const workers = dept ? await Worker.find({ department: dept._id }).lean() : [];

  const currentWorkerCount = Math.max(1, workers.length);
  const simulatedWorkerCount = currentWorkerCount + extraWorkers;

  const totalComplaints = complaints.length;
  const activeComplaints = complaints.filter(c => !['Resolved', 'Rejected'].includes(c.status)).length;
  const breachedComplaints = complaints.filter(c => c.sla?.status === 'Breached').length;

  // Base metrics
  const currentRatio = Math.round((activeComplaints / currentWorkerCount) * 10) / 10;
  const simulatedRatio = Math.round((activeComplaints / simulatedWorkerCount) * 10) / 10;

  // Current SLA compliance
  const currentCompliance = totalComplaints > 0
    ? Math.max(50, Math.min(100, Math.round(((totalComplaints - breachedComplaints) / totalComplaints) * 100)))
    : 92;

  // Projected SLA compliance improvement
  // Each added worker reduces turnaround strain and increases resolution throughput
  const capacityMultiplier = simulatedWorkerCount / currentWorkerCount;
  const complianceBoost = Math.min(100 - currentCompliance, Math.round((capacityMultiplier - 1) * 20));
  const projectedSlaCompliance = `${Math.min(100, currentCompliance + complianceBoost)}%`;

  // Projected backlog reduction
  const projectedBacklog = Math.max(0, Math.round(activeComplaints / capacityMultiplier));
  const reducedBacklogCount = activeComplaints - projectedBacklog;

  const currentWorkload = `${currentRatio} active cases / worker`;
  const projectedWorkload = `${simulatedRatio} active cases / worker`;

  const estimatedImpact = `Adding ${extraWorkers} field worker(s) to ${deptName || 'Department'} increases operational capacity by ${Math.round((capacityMultiplier - 1) * 100)}%, resolving ~${reducedBacklogCount} backlog complaints faster and boosting SLA compliance to ${projectedSlaCompliance}.`;

  const explanation = `Workforce scale simulation: Baseline of ${currentWorkerCount} worker(s) handling ${activeComplaints} active issues (${currentRatio} ratio) simulated with +${extraWorkers} personnel (${simulatedWorkerCount} total) achieves safe capacity target of ${simulatedRatio} cases/worker.`;

  return {
    department: deptName || 'All Departments',
    currentWorkers: currentWorkerCount,
    additionalWorkers: extraWorkers,
    simulatedTotalWorkers: simulatedWorkerCount,
    activeComplaints,
    currentWorkload,
    projectedWorkload,
    currentSlaCompliance: `${currentCompliance}%`,
    projectedSlaCompliance,
    currentBacklog: activeComplaints,
    projectedBacklog,
    estimatedImpact,
    explanation
  };
};

module.exports = {
  simulateResourceImpact
};
