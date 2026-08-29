const Complaint = require('../models/Complaint');
const GovernanceIncident = require('../models/GovernanceIncident');
const GovernanceAction = require('../models/GovernanceAction');
const PreventiveAction = require('../models/PreventiveAction');
const EarlyWarning = require('../models/EarlyWarning');
const Department = require('../models/Department');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Notification = require('../models/Notification');

const { detectHotspots } = require('./hotspotService');
const { forecastDepartmentResources } = require('./resourceForecastService');
const { generateGovernanceRecommendation } = require('./governanceRecommendationService');

/**
 * Runs the central governance orchestration engine across all active civic datasets.
 */
const runGovernanceOrchestration = async () => {
  const detectedIncidents = [];

  // 1. Fetch active complaints
  const activeComplaints = await Complaint.find({
    status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Reopened', 'Resolution Pending Verification'] }
  }).lean();

  const allComplaints = await Complaint.find({}).lean();

  // 2. Fetch Hotspots
  let hotspots = [];
  try {
    hotspots = await detectHotspots(1000);
  } catch (err) {
    hotspots = [];
  }

  // 3. Fetch Department Forecasts & Strain
  let deptWorkloads = [];
  try {
    deptWorkloads = await forecastDepartmentResources();
  } catch (err) {
    deptWorkloads = [];
  }

  // 4. Fetch Preventive Actions & Early Warnings
  const preventiveActions = await PreventiveAction.find({ status: { $in: ['Recommended', 'Planned', 'Dispatched'] } }).lean();
  const earlyWarnings = await EarlyWarning.find({ status: 'Active' }).lean();

  // Helper for sanitized areas
  const getArea = (c) => (c.address ? c.address.split(',')[0].trim() : 'City Center');

  // ==========================================================
  // SITUATION A: EMERGENCY CLUSTERS
  // ==========================================================
  const emergencyComplaints = activeComplaints.filter(c => c.priority === 'Emergency' || c.severity === 'Critical');
  const emergencyByArea = {};
  emergencyComplaints.forEach(c => {
    const area = getArea(c);
    if (!emergencyByArea[area]) emergencyByArea[area] = [];
    emergencyByArea[area].push(c);
  });

  for (const [area, list] of Object.entries(emergencyByArea)) {
    if (list.length >= 2) {
      const topCat = list[0].category || 'General';
      const topDept = list[0].department || 'Municipality';
      const dedupKey = `INC_EMERGENCY_CLUSTER_${topCat}_${topDept}_${area.replace(/\s+/g, '_')}`;

      const riskScore = Math.min(100, 80 + list.length * 5);
      const contributingFactors = {
        complaintSurge: 20,
        severity: 40,
        slaBreach: 15,
        citizenDissatisfaction: 10,
        departmentOverload: 15
      };

      detectedIncidents.push({
        title: `🚨 Emergency Cluster: ${list.length} Critical Hazards in ${area}`,
        description: `Multiple critical emergency complaints concentrated in ${area} requiring immediate civic mobilization.`,
        incidentType: 'Emergency Cluster',
        category: topCat,
        department: topDept,
        area,
        latitude: list[0].latitude || null,
        longitude: list[0].longitude || null,
        severity: 'CRITICAL',
        riskScore,
        sourceReferences: {
          complaintIds: list.map(c => c._id)
        },
        dedupKey,
        contributingFactors,
        responseDeadline: new Date(Date.now() + 2 * 3600 * 1000) // 2 hours
      });
    }
  }

  // ==========================================================
  // SITUATION B: CIVIC HOTSPOTS (CRITICAL & HIGH)
  // ==========================================================
  for (const h of hotspots) {
    if (h.riskScore >= 60) {
      const dedupKey = `INC_CIVIC_HOTSPOT_${h.dominantCategory}_${h.dominantDepartment}_${h.latitude}_${h.longitude}`;
      const severity = h.riskScore >= 80 ? 'CRITICAL' : 'WARNING';

      const contributingFactors = {
        complaintSurge: Math.round(h.riskScore * 0.35),
        severity: Math.round(h.riskScore * 0.30),
        slaBreach: Math.round(h.riskScore * 0.15),
        citizenDissatisfaction: Math.round(h.riskScore * 0.10),
        departmentOverload: Math.round(h.riskScore * 0.10)
      };

      detectedIncidents.push({
        title: `🔥 High-Risk Hotspot: ${h.dominantCategory} Zone (${h.riskScore}/100)`,
        description: `Spatial hazard cluster identified with ${h.complaintCount} reports within ${h.radiusMeters}m radius.`,
        incidentType: 'Civic Hotspot',
        category: h.dominantCategory,
        department: h.dominantDepartment,
        area: `${h.dominantCategory} Sector`,
        latitude: h.latitude,
        longitude: h.longitude,
        severity,
        riskScore: h.riskScore,
        sourceReferences: {
          hotspotRef: `${h.latitude},${h.longitude}`
        },
        dedupKey,
        contributingFactors,
        responseDeadline: new Date(Date.now() + (severity === 'CRITICAL' ? 4 : 12) * 3600 * 1000)
      });
    }
  }

  // ==========================================================
  // SITUATION C: SLA CRISIS
  // ==========================================================
  const breachedByDept = {};
  activeComplaints.forEach(c => {
    if (c.sla?.status === 'Breached' || c.sla?.status === 'At Risk') {
      const dept = c.department || 'Municipality';
      if (!breachedByDept[dept]) breachedByDept[dept] = [];
      breachedByDept[dept].push(c);
    }
  });

  for (const [dept, list] of Object.entries(breachedByDept)) {
    if (list.length >= 2) {
      const dedupKey = `INC_SLA_CRISIS_${dept}`;
      const riskScore = Math.min(100, 65 + list.length * 6);
      const severity = riskScore >= 80 ? 'CRITICAL' : 'WARNING';

      const contributingFactors = {
        complaintSurge: 15,
        severity: 25,
        slaBreach: 45,
        citizenDissatisfaction: 10,
        departmentOverload: 5
      };

      detectedIncidents.push({
        title: `⏱️ SLA Compliance Crisis: ${dept}`,
        description: `${list.length} active complaints in ${dept} have breached or are near breaching SLA resolution targets.`,
        incidentType: 'SLA Crisis',
        category: list[0].category || 'General',
        department: dept,
        area: 'Department-wide',
        severity,
        riskScore,
        sourceReferences: {
          complaintIds: list.map(c => c._id)
        },
        dedupKey,
        contributingFactors,
        responseDeadline: new Date(Date.now() + 4 * 3600 * 1000)
      });
    }
  }

  // ==========================================================
  // SITUATION D: DEPARTMENT OVERLOAD
  // ==========================================================
  for (const dw of deptWorkloads) {
    if (dw.overloadRisk === 'Overloaded' || dw.workloadScore >= 70) {
      const dedupKey = `INC_DEPT_OVERLOAD_${dw.department.replace(/\s+/g, '_')}`;
      const severity = dw.workloadScore >= 80 ? 'CRITICAL' : 'WARNING';

      const contributingFactors = {
        complaintSurge: 30,
        severity: 15,
        slaBreach: 20,
        citizenDissatisfaction: 5,
        departmentOverload: 30
      };

      detectedIncidents.push({
        title: `🏢 Department Capacity Overload: ${dw.department}`,
        description: `Projected 7-day intake (${dw.predicted7DayDemand} cases) significantly exceeds workforce capacity (${dw.currentWorkers} workers).`,
        incidentType: 'Department Overload',
        category: dw.department,
        department: dw.department,
        area: 'Department-wide',
        severity,
        riskScore: dw.workloadScore,
        dedupKey,
        contributingFactors,
        responseDeadline: new Date(Date.now() + 8 * 3600 * 1000)
      });
    }
  }

  // ==========================================================
  // SITUATION E & H: RECURRING FAILURE & INFRASTRUCTURE RISK
  // ==========================================================
  const complaintsByCatArea = {};
  allComplaints.forEach(c => {
    const area = getArea(c);
    const key = `${c.category || 'General'}___${area}`;
    if (!complaintsByCatArea[key]) complaintsByCatArea[key] = [];
    complaintsByCatArea[key].push(c);
  });

  for (const [key, list] of Object.entries(complaintsByCatArea)) {
    const [cat, area] = key.split('___');
    if (list.length >= 3) {
      const dedupKey = `INC_RECURRING_FAILURE_${cat}_${area.replace(/\s+/g, '_')}`;
      const matchingPrev = preventiveActions.find(p => p.category === cat && p.area === area);
      const isInfrastructure = ['Drainage', 'Road Department', 'Water Supply', 'Street Lights', 'Electricity'].includes(cat);

      const incidentType = (isInfrastructure && list.length >= 4) ? 'Infrastructure Risk' : 'Recurring Failure';
      const riskScore = Math.min(100, 50 + list.length * 7);
      const severity = riskScore >= 75 ? 'WARNING' : 'WATCH';

      const contributingFactors = {
        complaintSurge: 25,
        severity: 20,
        slaBreach: 15,
        citizenDissatisfaction: 25,
        departmentOverload: 15
      };

      detectedIncidents.push({
        title: `${incidentType === 'Infrastructure Risk' ? '🏗️ Infrastructure Degradation' : '🔄 Recurring Civic Failure'}: ${cat} in ${area}`,
        description: `${list.length} repeated complaints recorded for ${cat} in ${area}. Structural investigation recommended.`,
        incidentType,
        category: cat,
        department: list[0].department || 'Municipality',
        area,
        latitude: list[0].latitude || null,
        longitude: list[0].longitude || null,
        severity,
        riskScore,
        sourceReferences: {
          complaintIds: list.slice(0, 10).map(c => c._id),
          preventiveActionRef: matchingPrev ? matchingPrev._id : null
        },
        dedupKey,
        contributingFactors,
        responseDeadline: new Date(Date.now() + 24 * 3600 * 1000)
      });
    }
  }

  // ==========================================================
  // SITUATION F: CITIZEN DISSATISFACTION / REOPENS
  // ==========================================================
  const reopenedComplaints = activeComplaints.filter(c => (c.reopenCount && c.reopenCount >= 1) || c.status === 'Reopened');
  if (reopenedComplaints.length >= 2) {
    const dedupKey = `INC_CITIZEN_DISSATISFACTION_REOPENS`;
    const riskScore = Math.min(100, 55 + reopenedComplaints.length * 10);
    const severity = riskScore >= 75 ? 'WARNING' : 'WATCH';

    const contributingFactors = {
      complaintSurge: 10,
      severity: 15,
      slaBreach: 20,
      citizenDissatisfaction: 45,
      departmentOverload: 10
    };

    detectedIncidents.push({
      title: `👎 Citizen Dissatisfaction Surge: ${reopenedComplaints.length} Reopened Tasks`,
      description: `Multiple complaints have been rejected by citizens following resolution, signaling workmanship deficiencies.`,
      incidentType: 'Citizen Dissatisfaction',
      category: reopenedComplaints[0].category || 'General',
      department: reopenedComplaints[0].department || 'Municipality',
      area: 'Citywide',
      severity,
      riskScore,
      sourceReferences: {
        complaintIds: reopenedComplaints.map(c => c._id)
      },
      dedupKey,
      contributingFactors,
      responseDeadline: new Date(Date.now() + 12 * 3600 * 1000)
    });
  }

  // ==========================================================
  // PERSISTENCE & DEDUPLICATION IN MONGODB
  // ==========================================================
  const savedIncidents = [];
  const admins = await User.find({ role: { $in: ['Admin', 'Government'] } }).select('_id');

  for (const raw of detectedIncidents) {
    // Generate AI Decision & Recommendation
    const rec = await generateGovernanceRecommendation({
      incidentType: raw.incidentType,
      category: raw.category,
      department: raw.department,
      area: raw.area,
      riskScore: raw.riskScore,
      severity: raw.severity,
      complaintCount: raw.sourceReferences?.complaintIds?.length || 1,
      slaBreaches: raw.contributingFactors?.slaBreach || 0,
      overloadRisk: raw.incidentType === 'Department Overload' ? 'Overloaded' : 'Normal',
      recommendedWorkers: Math.ceil(raw.riskScore / 30)
    });

    let existing = await GovernanceIncident.findOne({ dedupKey: raw.dedupKey });

    if (existing) {
      // Update existing active incident if not closed
      if (existing.status !== 'Closed') {
        existing.title = raw.title;
        existing.description = raw.description;
        existing.riskScore = raw.riskScore;
        existing.severity = raw.severity;
        existing.contributingFactors = raw.contributingFactors;
        existing.recommendedAction = rec.recommendedAction;
        if (raw.sourceReferences) {
          existing.sourceReferences = raw.sourceReferences;
        }
        await existing.save();
      }
      savedIncidents.push(existing);
    } else {
      // Create new incident
      const newInc = await GovernanceIncident.create({
        ...raw,
        recommendedAction: rec.recommendedAction,
        timeline: [{
          eventType: 'Incident Detected',
          message: `Autonomous Governance Engine detected ${raw.incidentType} with Risk Score ${raw.riskScore}/100.`,
          timestamp: new Date()
        }]
      });

      // Dispatch alert notification to Government officers on CRITICAL / WARNING
      if (raw.severity === 'CRITICAL' || raw.severity === 'WARNING') {
        for (const admin of admins) {
          await Notification.create({
            user: admin._id,
            title: `[${raw.severity}] ${raw.title}`,
            message: `${raw.description} Recommended action: ${rec.recommendedAction}`,
            type: 'alert'
          }).catch(() => {});
        }
      }

      savedIncidents.push(newInc);
    }
  }

  return savedIncidents;
};

module.exports = {
  runGovernanceOrchestration
};
