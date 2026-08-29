const Department = require('../models/Department');
const Worker = require('../models/Worker');
const Complaint = require('../models/Complaint');
const { getRiskLevel } = require('./hotspotService');

/**
 * Forecast department demand and workload capacity strain
 */
const forecastDepartmentResources = async () => {
  const departments = await Department.find().lean();
  const workers = await Worker.find().lean();
  const complaints = await Complaint.find().lean();

  const results = departments.map((dept) => {
    // Current workers in department
    const deptWorkers = workers.filter(w => 
      w.department && w.department.toString() === dept._id.toString()
    );
    const workerCount = Math.max(1, deptWorkers.length);

    // Complaints assigned to this department
    const deptComplaints = complaints.filter(c => 
      (c.assignedDepartment && c.assignedDepartment.toString() === dept._id.toString()) ||
      c.department === dept.name
    );

    const totalHistorical = deptComplaints.length;
    const activeComplaints = deptComplaints.filter(c => !['Resolved', 'Rejected'].includes(c.status)).length;

    // Daily run-rate
    const avgDaily = totalHistorical > 0 ? Math.max(0.5, Math.round((totalHistorical / 30) * 10) / 10) : 1;

    // Projected intake
    const predicted7DayDemand = Math.max(activeComplaints, Math.round(activeComplaints + (avgDaily * 7)));
    const predicted30DayDemand = Math.max(activeComplaints * 2, Math.round(activeComplaints + (avgDaily * 30)));

    // Capacity ratio: active tasks per worker
    const currentRatio = activeComplaints / workerCount;
    const projectedRatio = predicted7DayDemand / workerCount;

    // Recommended workers assuming healthy target of max 4-5 active tasks per worker
    const recommendedWorkers = Math.max(workerCount, Math.ceil(predicted7DayDemand / 4));

    // Workload Score (0-100)
    // 1 worker per 5 tasks is baseline (50 pts). >10 tasks per worker is severe (>80 pts).
    const ratioScore = Math.min(60, Math.round(projectedRatio * 8));
    const backlogScore = Math.min(40, Math.round(activeComplaints * 3));
    const workloadScore = Math.min(100, Math.max(10, ratioScore + backlogScore));
    const riskLevel = getRiskLevel(workloadScore);

    return {
      _id: dept._id,
      department: dept.name,
      currentWorkers: workerCount,
      activeComplaints,
      averageDailyComplaints: avgDaily,
      predicted7DayDemand,
      predicted30DayDemand,
      recommendedWorkers,
      workloadScore,
      riskLevel,
      overloadRisk: riskLevel === 'Critical' || riskLevel === 'High' ? 'Overloaded' : 'Normal',
      capacityUtilization: `${Math.min(250, Math.round((projectedRatio / 4) * 100))}%`
    };
  });

  return results.sort((a, b) => b.workloadScore - a.workloadScore);
};

module.exports = {
  forecastDepartmentResources
};
