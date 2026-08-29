const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Worker = require('../models/Worker');
const CivicRisk = require('../models/CivicRisk');

const CATEGORIES = [
  'Road Damage',
  'Water Supply',
  'Electricity',
  'Garbage Collection',
  'Drainage',
  'Traffic Signal',
  'Street Light',
  'Parks',
  'Others'
];

const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

class PredictiveService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
  }

  /**
   * Helper to get temporal cutoff dates
   */
  getWindows(days = 30) {
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
    const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev7DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    return { now, currentStart, previousStart, last7DaysStart, prev7DaysStart, days };
  }

  /**
   * 1. HOTSPOT CLUSTERING & RISK SCORING
   */
  async detectHotspots(windowDays = 30, radiusMeters = 500) {
    const { currentStart, previousStart, last7DaysStart } = this.getWindows(windowDays);

    const complaints = await Complaint.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
      createdAt: { $gte: previousStart }
    }).lean();

    if (!complaints || complaints.length === 0) {
      return [];
    }

    const currentComplaints = complaints.filter(c => new Date(c.createdAt) >= currentStart);
    const prevComplaints = complaints.filter(c => new Date(c.createdAt) < currentStart);

    // Group current complaints into spatial clusters
    const visited = new Set();
    const clusters = [];

    for (let i = 0; i < currentComplaints.length; i++) {
      if (visited.has(currentComplaints[i]._id.toString())) continue;

      const seed = currentComplaints[i];
      const clusterMembers = [seed];
      visited.add(seed._id.toString());

      for (let j = i + 1; j < currentComplaints.length; j++) {
        const candidate = currentComplaints[j];
        if (visited.has(candidate._id.toString())) continue;

        const dist = haversineDistanceMeters(seed.latitude, seed.longitude, candidate.latitude, candidate.longitude);
        if (dist <= radiusMeters) {
          clusterMembers.push(candidate);
          visited.add(candidate._id.toString());
        }
      }

      clusters.push(clusterMembers);
    }

    // Process clusters into Hotspots
    const hotspots = [];
    for (const members of clusters) {
      const count = members.length;
      // Compute centroid
      const avgLat = members.reduce((acc, m) => acc + m.latitude, 0) / count;
      const avgLng = members.reduce((acc, m) => acc + m.longitude, 0) / count;

      // Find historical complaints in the same spatial radius during previous window
      const prevMatching = prevComplaints.filter(p => 
        haversineDistanceMeters(avgLat, avgLng, p.latitude, p.longitude) <= radiusMeters
      );
      const prevCount = prevMatching.length;

      // Growth percentage
      const growthPercentage = prevCount === 0 
        ? (count > 0 ? 100 : 0) 
        : Number((((count - prevCount) / prevCount) * 100).toFixed(1));

      // Category breakdown & dominant category
      const categoryCounts = {};
      let unresolvedCount = 0;
      let duplicateCount = 0;
      let citizenImpact = 0;
      let recent7DayCount = 0;
      const severityDist = { critical: 0, high: 0, medium: 0, low: 0 };

      members.forEach(m => {
        const cat = m.category || m.department || 'Others';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        if (['Pending', 'Verified', 'Assigned', 'In Progress'].includes(m.status)) {
          unresolvedCount++;
        }

        if (m.duplicateGroupId || m.duplicateOf) {
          duplicateCount++;
        }

        const impact = m.decisionSupport?.citizenImpactCount || 1;
        citizenImpact += impact;

        if (new Date(m.createdAt) >= last7DaysStart) {
          recent7DayCount++;
        }

        const sev = (m.aiAnalysis?.severity || (m.priority === 'Emergency' ? 'Critical' : m.priority === 'High' ? 'High' : 'Medium')).toLowerCase();
        if (sev === 'critical') severityDist.critical++;
        else if (sev === 'high') severityDist.high++;
        else if (sev === 'medium') severityDist.medium++;
        else severityDist.low++;
      });

      const dominantCategory = Object.keys(categoryCounts).reduce((a, b) => 
        categoryCounts[a] > categoryCounts[b] ? a : b, 'Others'
      );

      // Best human readable name/landmark for cluster
      const bestName = members.find(m => m.landmark)?.landmark || 
                       members.find(m => m.address)?.address || 
                       `${dominantCategory} Cluster (${avgLat.toFixed(4)}, ${avgLng.toFixed(4)})`;

      // Deterministic Risk Score Formula:
      // frequency * 0.25 + trend * 0.20 + severity * 0.15 + unresolved * 0.15 + citizenImpact * 0.10 + duplicateImpact * 0.10 + recentActivity * 0.05
      const freqScore = Math.min(25, (count / 10) * 25);
      const trendScore = growthPercentage > 0 ? Math.min(20, (growthPercentage / 100) * 20) : 0;
      const sevRatio = (severityDist.critical * 1.0 + severityDist.high * 0.7 + severityDist.medium * 0.4 + severityDist.low * 0.1) / count;
      const sevScore = Math.min(15, sevRatio * 15);
      const unresolvedScore = Math.min(15, (unresolvedCount / Math.max(1, count)) * 15);
      const impactScore = Math.min(10, (citizenImpact / 10) * 10);
      const dupScore = Math.min(10, (duplicateCount / 5) * 10);
      const recencyScore = Math.min(5, (recent7DayCount / 5) * 5);

      let rawRiskScore = freqScore + trendScore + sevScore + unresolvedScore + impactScore + dupScore + recencyScore;

      // Emergency boost for critical life safety in hotspot
      if (severityDist.critical > 0) {
        rawRiskScore = Math.max(rawRiskScore, 75);
      }

      const riskScore = Math.min(100, Math.max(0, Math.round(rawRiskScore)));

      let riskLevel = 'Low';
      if (riskScore >= 80) riskLevel = 'Critical';
      else if (riskScore >= 60) riskLevel = 'High';
      else if (riskScore >= 40) riskLevel = 'Medium';
      else riskLevel = 'Low';

      const recommendedAction = this.generateHotspotRecommendation(dominantCategory, riskLevel, unresolvedCount, count);
      const explanation = `Hotspot identified at ${bestName} with ${count} ${dominantCategory} complaints (${growthPercentage >= 0 ? '+' : ''}${growthPercentage}% trend, ${unresolvedCount} unresolved). Risk level assessed as ${riskLevel} (${riskScore}/100).`;

      hotspots.push({
        type: 'Hotspot',
        name: bestName,
        category: dominantCategory,
        department: members[0]?.department || 'Municipality',
        latitude: Number(avgLat.toFixed(5)),
        longitude: Number(avgLng.toFixed(5)),
        radiusMeters,
        riskScore,
        riskLevel,
        complaintCount: count,
        activeComplaintCount: unresolvedCount,
        unresolvedCount,
        growthPercentage,
        citizenImpact,
        duplicateCount,
        severityDistribution: severityDist,
        recommendedAction,
        explanation,
        dataWindow: `${windowDays}_days`,
        calculatedAt: new Date()
      });
    }

    return hotspots.sort((a, b) => b.riskScore - a.riskScore);
  }

  generateHotspotRecommendation(category, level, unresolved, count) {
    if (level === 'Critical') {
      return `Deploy high-priority preventive maintenance crew to ${category} hotspot and resolve ${unresolved} pending issues immediately.`;
    }
    if (level === 'High') {
      return `Schedule targeted departmental field inspection for ${category} infrastructure within 48 hours.`;
    }
    if (level === 'Medium') {
      return `Increase regular monitoring frequency and address open ${category} service requests.`;
    }
    return `Maintain routine monitoring in this sector.`;
  }

  /**
   * 2. CATEGORY TREND DETECTION
   */
  async detectCategoryTrends(windowDays = 30) {
    const { currentStart, previousStart } = this.getWindows(windowDays);

    const complaints = await Complaint.find({
      createdAt: { $gte: previousStart }
    }).lean();

    const trends = [];
    for (const cat of CATEGORIES) {
      const currentInCat = complaints.filter(c => 
        (c.category === cat || (!c.category && c.department?.includes(cat.split(' ')[0]))) && 
        new Date(c.createdAt) >= currentStart
      );
      const prevInCat = complaints.filter(c => 
        (c.category === cat || (!c.category && c.department?.includes(cat.split(' ')[0]))) && 
        new Date(c.createdAt) < currentStart
      );

      const currentCount = currentInCat.length;
      const prevCount = prevInCat.length;

      let growthPercentage = 0;
      if (prevCount === 0) {
        growthPercentage = currentCount > 0 ? 100 : 0;
      } else {
        growthPercentage = Number((((currentCount - prevCount) / prevCount) * 100).toFixed(1));
      }

      const activeCount = currentInCat.filter(c => 
        ['Pending', 'Verified', 'Assigned', 'In Progress'].includes(c.status)
      ).length;

      const criticalCount = currentInCat.filter(c => 
        c.priority === 'Emergency' || c.aiAnalysis?.severity === 'Critical'
      ).length;

      // Risk level based on volume, growth, and critical issues
      let riskScore = 20;
      if (currentCount >= 5 && growthPercentage >= 50) riskScore = 85;
      else if (currentCount >= 3 && growthPercentage >= 25) riskScore = 70;
      else if (currentCount >= 2 || growthPercentage > 0) riskScore = 50;
      else if (currentCount === 0) riskScore = 10;

      if (criticalCount >= 2) riskScore = Math.max(riskScore, 85);
      else if (criticalCount === 1) riskScore = Math.max(riskScore, 70);

      let riskLevel = 'Low';
      if (riskScore >= 80) riskLevel = 'Critical';
      else if (riskScore >= 60) riskLevel = 'High';
      else if (riskScore >= 40) riskLevel = 'Medium';
      else riskLevel = 'Low';

      const recommendedAction = this.generateCategoryRecommendation(cat, riskLevel, growthPercentage);
      const explanation = `${cat} complaints recorded ${currentCount} issues in the last ${windowDays} days (Growth: ${growthPercentage >= 0 ? '+' : ''}${growthPercentage}% vs prior period). Active backlog: ${activeCount}.`;

      trends.push({
        type: 'CategoryTrend',
        name: cat,
        category: cat,
        department: currentInCat[0]?.department || cat,
        riskScore,
        riskLevel,
        complaintCount: currentCount,
        previousCount: prevCount,
        activeComplaintCount: activeCount,
        growthPercentage,
        criticalCount,
        recommendedAction,
        explanation,
        dataWindow: `${windowDays}_days`,
        calculatedAt: new Date()
      });
    }

    return trends.sort((a, b) => b.growthPercentage - a.growthPercentage);
  }

  generateCategoryRecommendation(cat, level, growth) {
    if (growth >= 50 || level === 'Critical') {
      return `Rapid growth in ${cat} (+${growth}%). Initiate preventive inspection and allocate supplementary field staff.`;
    }
    if (level === 'High') {
      return `Schedule proactive maintenance review for ${cat} to avoid municipal service disruptions.`;
    }
    if (level === 'Medium') {
      return `Monitor ${cat} resolution turnaround and track incoming report velocity.`;
    }
    return `Category trend is within stable municipal operating parameters.`;
  }

  /**
   * 3. DEPARTMENT WORKLOAD RISK & CAPACITY FORECAST
   */
  async detectDepartmentRisks() {
    const departments = await Department.find({}).lean();
    const activeComplaints = await Complaint.find({
      status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress'] }
    }).lean();

    const resolvedComplaints = await Complaint.find({
      status: 'Resolved'
    }).lean();

    const deptRisks = [];
    for (const dept of departments) {
      const deptActive = activeComplaints.filter(c => 
        c.department === dept.name || c.assignedDepartment?.toString() === dept._id.toString()
      );
      const activeCount = deptActive.length;

      const availableWorkers = await Worker.countDocuments({ department: dept._id, status: 'Available' });
      const busyWorkers = await Worker.countDocuments({ department: dept._id, status: 'Busy' });
      const totalWorkers = availableWorkers + busyWorkers;

      const criticalActive = deptActive.filter(c => c.priority === 'Emergency' || c.decisionSupport?.priorityLevel === 'Critical').length;

      // Calculate average resolution time for department
      const deptResolved = resolvedComplaints.filter(c => 
        c.department === dept.name || c.assignedDepartment?.toString() === dept._id.toString()
      );
      let avgResolutionHours = 24; // baseline 24h
      if (deptResolved.length > 0) {
        const totalDuration = deptResolved.reduce((acc, c) => {
          const start = new Date(c.createdAt).getTime();
          const end = new Date(c.updatedAt || c.createdAt).getTime();
          return acc + Math.max(1, (end - start) / (1000 * 60 * 60));
        }, 0);
        avgResolutionHours = Number((totalDuration / deptResolved.length).toFixed(1));
      }

      // Load ratio (active complaints per available worker)
      const loadRatio = availableWorkers === 0 ? (activeCount > 0 ? 10 : 0) : Number((activeCount / availableWorkers).toFixed(1));

      let riskScore = 25;
      let riskLevel = 'Normal';

      if (loadRatio >= 5 || (criticalActive >= 2 && availableWorkers === 0)) {
        riskScore = 90;
        riskLevel = 'Critical';
      } else if (loadRatio >= 3 || criticalActive >= 1) {
        riskScore = 75;
        riskLevel = 'High Risk';
      } else if (loadRatio >= 1.5 || busyWorkers > availableWorkers) {
        riskScore = 50;
        riskLevel = 'Busy';
      } else {
        riskScore = 25;
        riskLevel = 'Normal';
      }

      let recommendedAction = 'Workforce capacity is adequate for current civic workload.';
      if (riskLevel === 'Critical') {
        recommendedAction = 'Emergency workforce overload. Mobilize emergency field units and reassign cross-departmental staff.';
      } else if (riskLevel === 'High Risk') {
        recommendedAction = 'High operational strain. Consider temporary workload redistribution to prevent resolution delays.';
      } else if (riskLevel === 'Busy') {
        recommendedAction = 'Workforce is near peak capacity. Prioritize high-impact and emergency complaints.';
      }

      const explanation = `${dept.name} has ${activeCount} active complaints with ${availableWorkers} available worker(s) and ${busyWorkers} busy worker(s). Workload ratio: ${loadRatio}:1. Avg resolution time: ${avgResolutionHours}h.`;

      deptRisks.push({
        type: 'DepartmentRisk',
        name: dept.name,
        department: dept.name,
        riskScore,
        riskLevel,
        activeComplaintCount: activeCount,
        availableWorkers,
        busyWorkers,
        totalWorkers,
        criticalActive,
        loadRatio,
        avgResolutionHours,
        recommendedAction,
        explanation,
        dataWindow: '30_days',
        calculatedAt: new Date()
      });
    }

    return deptRisks.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * 4. EMERGING CIVIC ISSUES (Velocity Spikes in last 7 days vs previous 7 days)
   */
  async detectEmergingIssues() {
    const { last7DaysStart, prev7DaysStart } = this.getWindows(30);

    const complaints = await Complaint.find({
      createdAt: { $gte: prev7DaysStart }
    }).lean();

    const emerging = [];
    for (const cat of CATEGORIES) {
      const thisWeek = complaints.filter(c => 
        (c.category === cat || (!c.category && c.department?.includes(cat.split(' ')[0]))) && 
        new Date(c.createdAt) >= last7DaysStart
      );
      const lastWeek = complaints.filter(c => 
        (c.category === cat || (!c.category && c.department?.includes(cat.split(' ')[0]))) && 
        new Date(c.createdAt) < last7DaysStart
      );

      const thisCount = thisWeek.length;
      const lastCount = lastWeek.length;

      // Spike criteria: count >= 2 and either growth >= 100% or lastCount === 0 with thisCount >= 2
      const isSpike = (lastCount === 0 && thisCount >= 2) || (lastCount > 0 && (thisCount - lastCount) / lastCount >= 0.75);

      if (isSpike) {
        const growthPercentage = lastCount === 0 ? 100 : Number((((thisCount - lastCount) / lastCount) * 100).toFixed(1));
        const activeCount = thisWeek.filter(c => ['Pending', 'Verified', 'Assigned', 'In Progress'].includes(c.status)).length;
        const criticalCount = thisWeek.filter(c => c.priority === 'Emergency' || c.aiAnalysis?.severity === 'Critical').length;

        const riskScore = Math.min(100, Math.max(50, Math.round(50 + (growthPercentage / 10) + (criticalCount * 15))));
        let riskLevel = riskScore >= 80 ? 'Critical' : (riskScore >= 60 ? 'High' : 'Medium');

        emerging.push({
          type: 'EmergingIssue',
          name: `${cat} Surge Alert`,
          category: cat,
          department: thisWeek[0]?.department || cat,
          riskScore,
          riskLevel,
          complaintCount: thisCount,
          previousCount: lastCount,
          activeComplaintCount: activeCount,
          growthPercentage,
          criticalCount,
          recommendedAction: `Emerging civic risk detected. Deploy proactive inspection team before ${cat} reports escalate.`,
          explanation: `Emerging civic risk detected: ${cat} complaints increased by ${growthPercentage >= 0 ? '+' : ''}${growthPercentage}% this week (${thisCount} new reports vs ${lastCount} last week).`,
          dataWindow: '7_days',
          calculatedAt: new Date()
        });
      }
    }

    return emerging.sort((a, b) => b.growthPercentage - a.growthPercentage);
  }

  /**
   * 5. STATISTICAL TREND-BASED FORECASTING
   */
  async calculateForecast() {
    const totalComplaintsCount = await Complaint.countDocuments({});
    
    // If insufficient data points exist in MongoDB
    if (totalComplaintsCount < 3) {
      return {
        status: 'Insufficient historical data',
        message: 'Insufficient data for reliable forecast.',
        isSufficient: false,
        forecastWindow7Days: null,
        forecastWindow30Days: null,
        weeklyVelocity: 0,
        growthTrend: 0,
        byCategory: {}
      };
    }

    const { currentStart, previousStart, last7DaysStart, prev7DaysStart } = this.getWindows(30);

    const [recent30Count, prior30Count, recent7Count, prior7Count] = await Promise.all([
      Complaint.countDocuments({ createdAt: { $gte: currentStart } }),
      Complaint.countDocuments({ createdAt: { $gte: previousStart, $lt: currentStart } }),
      Complaint.countDocuments({ createdAt: { $gte: last7DaysStart } }),
      Complaint.countDocuments({ createdAt: { $gte: prev7DaysStart, $lt: last7DaysStart } })
    ]);

    const weeklyGrowthRate = prior7Count === 0 
      ? 0.15 
      : (recent7Count - prior7Count) / Math.max(1, prior7Count);

    const monthlyGrowthRate = prior30Count === 0 
      ? 0.10 
      : (recent30Count - prior30Count) / Math.max(1, prior30Count);

    // Trend-based volume projection
    const projected7Days = Math.max(1, Math.round(recent7Count * (1 + Math.max(-0.5, Math.min(1.5, weeklyGrowthRate)))));
    const projected30Days = Math.max(3, Math.round(recent30Count * (1 + Math.max(-0.5, Math.min(1.5, monthlyGrowthRate)))));

    // Category breakdown forecast
    const categoryForecasts = {};
    for (const cat of CATEGORIES) {
      const cCount = await Complaint.countDocuments({
        createdAt: { $gte: currentStart },
        $or: [{ category: cat }, { department: { $regex: cat.split(' ')[0], $options: 'i' } }]
      });
      if (cCount > 0) {
        categoryForecasts[cat] = {
          current30Days: cCount,
          projectedNext30Days: Math.max(1, Math.round(cCount * (1 + monthlyGrowthRate)))
        };
      }
    }

    return {
      status: 'Trend-based forecast',
      message: `Trend-based forecast indicates approximately ${projected7Days} complaints next week and ${projected30Days} complaints in the upcoming month based on historical trajectory.`,
      isSufficient: true,
      current7DayVolume: recent7Count,
      projected7DayVolume: projected7Days,
      current30DayVolume: recent30Count,
      projected30DayVolume: projected30Days,
      growthTrendPercentage: Number((monthlyGrowthRate * 100).toFixed(1)),
      byCategory: categoryForecasts,
      calculatedAt: new Date()
    };
  }

  /**
   * 6. FULL DASHBOARD INTELLIGENCE AGGREGATE
   */
  async getPredictiveDashboard() {
    const [hotspots, trends, departmentRisks, emergingIssues, forecast] = await Promise.all([
      this.detectHotspots(30),
      this.detectCategoryTrends(30),
      this.detectDepartmentRisks(),
      this.detectEmergingIssues(),
      this.calculateForecast()
    ]);

    const criticalHotspots = hotspots.filter(h => h.riskLevel === 'Critical' || h.riskLevel === 'High');
    const highRiskDepts = departmentRisks.filter(d => d.riskLevel === 'Critical' || d.riskLevel === 'High Risk');
    const fastestGrowing = trends.length > 0 && trends[0].growthPercentage > 0 ? trends[0] : null;

    return {
      summary: {
        highRiskHotspotsCount: criticalHotspots.length,
        emergingIssuesCount: emergingIssues.length,
        departmentsAtRiskCount: highRiskDepts.length,
        rapidGrowthCategoriesCount: trends.filter(t => t.growthPercentage >= 25).length,
        fastestGrowingCategory: fastestGrowing ? `${fastestGrowing.name} (+${fastestGrowing.growthPercentage}%)` : 'Stable'
      },
      hotspots: hotspots.slice(0, 10),
      categoryTrends: trends,
      departmentRisks,
      emergingIssues,
      forecast,
      calculatedAt: new Date()
    };
  }

  /**
   * 7. BULK RECALCULATE & PERSIST TO MONGODB
   */
  async recalculateAndPersist() {
    const [hotspots, trends, deptRisks, emerging] = await Promise.all([
      this.detectHotspots(30),
      this.detectCategoryTrends(30),
      this.detectDepartmentRisks(),
      this.detectEmergingIssues()
    ]);

    // Clear old calculated risks for current window to prevent unbounded growth
    await CivicRisk.deleteMany({ dataWindow: { $in: ['7_days', '30_days'] } });

    const recordsToInsert = [
      ...hotspots,
      ...trends,
      ...deptRisks,
      ...emerging
    ];

    if (recordsToInsert.length > 0) {
      await CivicRisk.insertMany(recordsToInsert);
    }

    return {
      success: true,
      totalRisksIdentified: recordsToInsert.length,
      hotspotsCount: hotspots.length,
      trendsCount: trends.length,
      departmentRisksCount: deptRisks.length,
      emergingCount: emerging.length,
      calculatedAt: new Date()
    };
  }
}

module.exports = new PredictiveService();
