const EarlyWarning = require('../models/EarlyWarning');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { detectHotspots } = require('./hotspotService');
const { forecastDepartmentResources } = require('./resourceForecastService');

/**
 * Evaluate civic conditions and generate deduplicated Early Warnings
 */
const evaluateEarlyWarnings = async () => {
  const warnings = [];
  const complaints = await Complaint.find().lean();
  const total = complaints.length;

  const hotspots = await detectHotspots();
  const departmentForecasts = await forecastDepartmentResources();

  // 1. Check for Critical & High Hotspots
  for (const spot of hotspots) {
    if (spot.riskLevel === 'Critical') {
      const dedupKey = `HOTSPOT_CRITICAL_${spot.dominantCategory}_${Math.round(spot.latitude*100)}_${Math.round(spot.longitude*100)}`;
      warnings.push({
        title: `🚨 Critical Civic Risk Hotspot: ${spot.dominantCategory}`,
        message: `High-density hazard cluster detected with ${spot.complaintCount} incidents. Risk Score: ${spot.riskScore}/100. Immediate intervention advised.`,
        category: spot.dominantCategory,
        department: spot.dominantDepartment,
        area: `${spot.latitude}, ${spot.longitude}`,
        level: 'CRITICAL',
        metric: `Risk Score ${spot.riskScore}/100`,
        threshold: 'Score >= 80',
        dedupKey
      });
    } else if (spot.riskLevel === 'High') {
      const dedupKey = `HOTSPOT_HIGH_${spot.dominantCategory}_${Math.round(spot.latitude*100)}_${Math.round(spot.longitude*100)}`;
      warnings.push({
        title: `⚠️ High Risk Hotspot: ${spot.dominantCategory}`,
        message: `Emerging risk cluster identified with ${spot.complaintCount} reports. Risk Score: ${spot.riskScore}/100.`,
        category: spot.dominantCategory,
        department: spot.dominantDepartment,
        area: `${spot.latitude}, ${spot.longitude}`,
        level: 'WARNING',
        metric: `Risk Score ${spot.riskScore}/100`,
        threshold: 'Score >= 60',
        dedupKey
      });
    }
  }

  // 2. Check for Overloaded Departments
  for (const dept of departmentForecasts) {
    if (dept.overloadRisk === 'Overloaded') {
      const dedupKey = `DEPT_OVERLOAD_${dept.department}_${dept.predicted7DayDemand}`;
      warnings.push({
        title: `⚠️ Department Capacity Overload: ${dept.department}`,
        message: `${dept.department} demand projected at ${dept.predicted7DayDemand} tasks against ${dept.currentWorkers} active field workers. Recommended staff: ${dept.recommendedWorkers}.`,
        category: 'Workforce',
        department: dept.department,
        area: 'Department-wide',
        level: dept.riskLevel === 'Critical' ? 'CRITICAL' : 'WARNING',
        metric: `Workload Score ${dept.workloadScore}/100`,
        threshold: 'Score >= 60',
        dedupKey
      });
    }
  }

  // 3. SLA Breach Spike Warning
  const breachedComplaints = complaints.filter(c => c.sla?.status === 'Breached');
  if (breachedComplaints.length >= 3) {
    const dedupKey = `SLA_BREACH_SPIKE_${breachedComplaints.length}`;
    warnings.push({
      title: `⏱️ SLA Compliance Risk Alert`,
      message: `${breachedComplaints.length} municipal complaints have breached statutory response deadlines. Operational escalation in progress.`,
      category: 'Operations',
      department: 'Municipality',
      area: 'Citywide',
      level: breachedComplaints.length >= 5 ? 'CRITICAL' : 'WARNING',
      metric: `${breachedComplaints.length} Breaches`,
      threshold: 'Breaches >= 3',
      dedupKey
    });
  }

  // 4. Repeated Rework / Reopening Warning
  const reopenedComplaints = complaints.filter(c => (c.reopenCount && c.reopenCount >= 1) || c.status === 'Reopened');
  if (reopenedComplaints.length >= 2) {
    const dedupKey = `REOPEN_SPIKE_${reopenedComplaints.length}`;
    warnings.push({
      title: `🔄 Quality Audit Warning: Recurring Reopens`,
      message: `${reopenedComplaints.length} complaints have been rejected by citizens for incomplete resolution. Field quality audit required.`,
      category: 'Quality Assurance',
      department: 'Municipality',
      area: 'Citywide',
      level: 'WATCH',
      metric: `${reopenedComplaints.length} Reopened Tasks`,
      threshold: 'Reopens >= 2',
      dedupKey
    });
  }

  // 5. General Info Level
  if (warnings.length === 0) {
    warnings.push({
      title: `ℹ️ Municipal Operations Stable`,
      message: `Predictive models report normal grievance velocity and balanced department workload across all civic sectors.`,
      category: 'Operations',
      department: 'Municipality',
      area: 'Citywide',
      level: 'INFO',
      metric: `${total} Total Reports`,
      threshold: 'Normal Baseline',
      dedupKey: `SYSTEM_STABLE_${new Date().toISOString().slice(0, 10)}`
    });
  }

  // Persist into MongoDB EarlyWarning collection with deduplication
  const savedWarnings = [];
  for (const w of warnings) {
    let doc = await EarlyWarning.findOne({ dedupKey: w.dedupKey });
    if (!doc) {
      doc = await EarlyWarning.create({
        ...w,
        status: 'Active'
      });

      // If CRITICAL warning, dispatch notification to Government Admins
      if (w.level === 'CRITICAL') {
        const admins = await User.find({ role: { $in: ['Admin', 'Government'] } }).select('_id');
        for (const admin of admins) {
          await Notification.create({
            user: admin._id,
            title: w.title,
            message: w.message,
            type: 'alert'
          }).catch(() => {});
        }
      }
    }
    savedWarnings.push(doc);
  }

  return savedWarnings;
};

module.exports = {
  evaluateEarlyWarnings
};
