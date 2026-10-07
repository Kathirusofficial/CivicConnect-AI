const Complaint = require('../models/Complaint');
const Worker = require('../models/Worker');

/**
 * Deterministic Rule-Based SLA Breach Prediction Service
 * Calculates breach probability risk (0-100) based on operational metrics.
 */
const predictSlaRisk = async (complaint) => {
  if (!complaint) return null;

  const targetHours = complaint.sla?.targetHours || 72;
  const createdAt = complaint.createdAt ? new Date(complaint.createdAt) : new Date();
  const elapsedHours = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
  const hoursRemaining = Math.max(0, Math.round(targetHours - elapsedHours));

  let riskScore = 0;
  const factors = [];

  // 1. Time Remaining Factor
  if (elapsedHours >= targetHours) {
    riskScore += 90;
    factors.push(`SLA timeline of ${targetHours}h has already elapsed.`);
  } else {
    const timeUsedRatio = elapsedHours / targetHours;
    if (timeUsedRatio > 0.85) {
      riskScore += 50;
      factors.push(`Only ${hoursRemaining} hours remain before target deadline (${Math.round(timeUsedRatio * 100)}% elapsed).`);
    } else if (timeUsedRatio > 0.6) {
      riskScore += 30;
      factors.push(`${hoursRemaining} hours remaining in resolution SLA window.`);
    } else {
      riskScore += 10;
    }
  }

  // 2. Status & Assignment Factor
  const status = complaint.status || 'Pending';
  if (status === 'Pending') {
    riskScore += 25;
    factors.push('Complaint is still Pending initial department assignment.');
  } else if (status === 'Verified') {
    riskScore += 20;
    factors.push('Verified issue awaiting field worker dispatch.');
  } else if (status === 'Assigned' || status === 'In Progress') {
    riskScore += 10;
  } else if (status === 'Resolved' || status === 'SOLVED') {
    return {
      riskScore: 0,
      riskLevel: 'LOW',
      predictedBreach: false,
      hoursRemaining,
      factors: ['Complaint has already been resolved and closed.']
    };
  }

  // 3. Worker Workload Factor
  if (complaint.assignedWorker) {
    try {
      const workerId = complaint.assignedWorker._id || complaint.assignedWorker;
      const activeWorkerTasks = await Complaint.countDocuments({
        assignedWorker: workerId,
        status: { $in: ['Assigned', 'In Progress'] }
      });
      if (activeWorkerTasks >= 4) {
        riskScore += 20;
        factors.push(`Assigned field worker has a heavy workload (${activeWorkerTasks} active tasks).`);
      } else if (activeWorkerTasks >= 2) {
        riskScore += 10;
      }
    } catch (err) {
      // Graceful fallback if query fails
    }
  } else {
    riskScore += 15;
    factors.push('No field worker is currently assigned.');
  }

  // 4. Severity & Complexity Factor
  const priority = complaint.priority || 'Medium';
  if (priority === 'Emergency' || priority === 'High') {
    riskScore += 10;
    factors.push(`High operational priority (${priority}) requires expedited resolution.`);
  }

  // Normalize final score to 0-100
  riskScore = Math.min(100, Math.max(0, Math.round(riskScore)));

  // Categorize Risk Level
  let riskLevel = 'LOW';
  let predictedBreach = false;
  if (riskScore >= 80) {
    riskLevel = 'CRITICAL';
    predictedBreach = true;
  } else if (riskScore >= 65) {
    riskLevel = 'HIGH';
    predictedBreach = true;
  } else if (riskScore >= 40) {
    riskLevel = 'MEDIUM';
    predictedBreach = false;
  }

  return {
    riskScore,
    riskLevel,
    predictedBreach,
    hoursRemaining,
    factors
  };
};

module.exports = { predictSlaRisk };
