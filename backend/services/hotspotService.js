const Complaint = require('../models/Complaint');

/**
 * Calculate Haversine distance between two coordinates in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Determine risk level from numeric risk score (0-100)
 */
const getRiskLevel = (score) => {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

/**
 * Detect geographic hotspots using deterministic spatial clustering
 */
const detectHotspots = async (customRadiusMeters = 800) => {
  const complaints = await Complaint.find({
    latitude: { $exists: true, $ne: null },
    longitude: { $exists: true, $ne: null }
  }).lean();

  if (!complaints || complaints.length === 0) {
    return [];
  }

  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < complaints.length; i++) {
    if (visited.has(i)) continue;

    const current = complaints[i];
    const clusterMembers = [current];
    visited.add(i);

    for (let j = i + 1; j < complaints.length; j++) {
      if (visited.has(j)) continue;
      const other = complaints[j];
      const dist = calculateDistance(current.latitude, current.longitude, other.latitude, other.longitude);

      if (dist <= customRadiusMeters) {
        clusterMembers.push(other);
        visited.add(j);
      }
    }

    clusters.push(clusterMembers);
  }

  // Process clusters into Hotspot objects
  const hotspots = clusters.map((members) => {
    const complaintCount = members.length;
    const avgLat = members.reduce((sum, m) => sum + m.latitude, 0) / complaintCount;
    const avgLon = members.reduce((sum, m) => sum + m.longitude, 0) / complaintCount;

    // Find max radius from centroid
    let maxDist = 200; // minimum radius
    for (const m of members) {
      const d = calculateDistance(avgLat, avgLon, m.latitude, m.longitude);
      if (d > maxDist) maxDist = d;
    }
    const radiusMeters = Math.min(2500, Math.round(maxDist + 50));

    // Category frequency
    const catCounts = {};
    const deptCounts = {};
    let emergencyCount = 0;
    let criticalSeverityCount = 0;
    let slaBreachCount = 0;
    let reopenCountSum = 0;
    let lowFeedbackCount = 0;

    for (const m of members) {
      const cat = m.category || 'General';
      const dept = m.department || 'Municipality';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;

      if (m.priority === 'Emergency') emergencyCount++;
      if (m.aiAnalysis?.severity === 'Critical') criticalSeverityCount++;
      if (m.sla?.status === 'Breached') slaBreachCount++;
      if (m.reopenCount) reopenCountSum += m.reopenCount;
      if (m.citizenFeedback?.rating && m.citizenFeedback.rating <= 2) lowFeedbackCount++;
    }

    // Dominant Category & Department
    const dominantCategory = Object.keys(catCounts).reduce((a, b) => (catCounts[a] >= catCounts[b] ? a : b), 'General');
    const dominantDepartment = Object.keys(deptCounts).reduce((a, b) => (deptCounts[a] >= deptCounts[b] ? a : b), 'Municipality');

    // Risk Calculation (0-100)
    // Volume component (up to 40 pts)
    const volumeScore = Math.min(40, complaintCount * 5);
    // Severity & Emergency component (up to 25 pts)
    const severityScore = Math.min(25, (emergencyCount * 12) + (criticalSeverityCount * 8));
    // Operational failure component: SLA breaches + reopens (up to 20 pts)
    const operationalFailureScore = Math.min(20, (slaBreachCount * 7) + (reopenCountSum * 5));
    // Citizen Dissatisfaction component (up to 15 pts)
    const dissatisfactionScore = Math.min(15, lowFeedbackCount * 5);

    const rawRiskScore = volumeScore + severityScore + operationalFailureScore + dissatisfactionScore;
    const riskScore = Math.max(10, Math.min(100, Math.round(rawRiskScore)));
    const riskLevel = getRiskLevel(riskScore);

    // Trend & Predicted Volume
    const recentMembers = members.filter(m => {
      const created = new Date(m.createdAt || Date.now());
      return Date.now() - created.getTime() <= 7 * 24 * 36e5;
    });
    const recentCount = recentMembers.length;
    const trend = recentCount >= Math.ceil(complaintCount * 0.4) ? 'Surging' : complaintCount >= 5 ? 'Elevated' : 'Stable';

    const predicted7Days = Math.max(1, Math.round(complaintCount * 0.45 + (trend === 'Surging' ? 3 : 1)));
    const predicted30Days = Math.max(2, Math.round(complaintCount * 1.6 + (trend === 'Surging' ? 8 : 2)));

    // Recommendation
    let recommendation = `Schedule routine maintenance for ${dominantCategory} infrastructure.`;
    if (riskLevel === 'Critical') {
      recommendation = `CRITICAL CIVIC ALERT: Immediate multi-agency field inspection and rapid intervention required in ${dominantCategory} zone.`;
    } else if (riskLevel === 'High') {
      recommendation = `High incident concentration in ${dominantCategory}. Dispatch supervisor survey and schedule preventive repairs.`;
    } else if (riskLevel === 'Medium') {
      recommendation = `Moderate recurrence in ${dominantCategory}. Increase routine monitoring and audit resolution quality.`;
    }

    return {
      latitude: Math.round(avgLat * 1e6) / 1e6,
      longitude: Math.round(avgLon * 1e6) / 1e6,
      radiusMeters,
      complaintCount,
      dominantCategory,
      dominantDepartment,
      riskScore,
      riskLevel,
      trend,
      predictedVolume: {
        next7Days: predicted7Days,
        next30Days: predicted30Days
      },
      recommendation
    };
  });

  return hotspots.sort((a, b) => b.riskScore - a.riskScore);
};

module.exports = {
  detectHotspots,
  getRiskLevel
};
