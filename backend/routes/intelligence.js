const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Worker = require('../models/Worker');
const User = require('../models/User');
const ComplaintSupport = require('../models/ComplaintSupport');
const { protect, admin } = require('../middleware/auth');
const { calculateCivicImpactScore } = require('../services/civicImpactService');
const { predictSlaRisk } = require('../services/slaPredictionService');
const { recommendWorkersForComplaint } = require('../services/workerRecommendationService');
const { estimateEnvironmentalImpact } = require('../services/environmentalImpactService');
const { generateDecisionSimulation, generateActionPlan } = require('../services/decisionSimulatorService');

// All intelligence endpoints require Auth + Government/Admin role
router.use(protect, admin);

/**
 * GET /api/government/intelligence/heatmap
 * Production-Ready Real Complaint Heatmap & Zone Cluster Intelligence API
 * Supports category, severity, status, timeRange, department, and limit parameters.
 */
router.get('/heatmap', async (req, res) => {
  try {
    const { 
      category, 
      severity, 
      status, 
      timeRange, 
      timeframe, 
      department,
      limit = 2000 
    } = req.query;

    const rawTimeRange = timeRange || timeframe;

    // 1. Parameter Validation
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 10000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILTER',
          message: 'Invalid limit value. Max limit is 10000'
        }
      });
    }

    const ALLOWED_SEVERITIES = ['all', 'low', 'medium', 'high', 'emergency', 'critical'];
    if (severity && severity !== 'All' && !ALLOWED_SEVERITIES.includes(severity.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILTER',
          message: 'Invalid severity value'
        }
      });
    }

    const ALLOWED_STATUSES = ['all', 'open', 'resolved', 'pending', 'verified', 'assigned', 'in progress', 'rejected', 'reopened', 'solved', 'review_required', 'verification_failed', 'resolution pending verification'];
    if (status && status !== 'All' && !ALLOWED_STATUSES.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILTER',
          message: 'Invalid status value'
        }
      });
    }

    const ALLOWED_TIMERANGES = ['all', 'today', '7d', '7days', '30d', '30days', '90d', '90days'];
    if (rawTimeRange && rawTimeRange !== 'All' && !ALLOWED_TIMERANGES.includes(rawTimeRange.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILTER',
          message: 'Invalid timeRange value. Allowed: all, today, 7d, 30d, 90d'
        }
      });
    }

    // 2. Build MongoDB Query Dynamically
    const query = {
      latitude: { $ne: null, $exists: true, $gte: -90, $lte: 90 },
      longitude: { $ne: null, $exists: true, $gte: -180, $lte: 180 }
    };

    if (category && category !== 'All' && category !== 'all') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (department && department !== 'All' && department !== 'all') {
      query.department = { $regex: new RegExp(department, 'i') };
    }

    if (severity && severity !== 'All' && severity !== 'all') {
      const sevLower = severity.toLowerCase();
      if (sevLower === 'critical' || sevLower === 'emergency') {
        query.$or = [
          { priority: 'Emergency' },
          { priority: 'Critical' },
          { 'aiAnalysis.priority': 'Emergency' },
          { 'aiAnalysis.severity': 'Critical' },
          { 'decisionSupport.priorityLevel': 'Critical' }
        ];
      } else {
        const sevRegex = new RegExp(`^${severity}$`, 'i');
        query.$or = [
          { priority: sevRegex },
          { 'aiAnalysis.priority': sevRegex },
          { 'aiAnalysis.severity': sevRegex },
          { 'decisionSupport.priorityLevel': sevRegex }
        ];
      }
    }

    if (status && status !== 'All' && status !== 'all') {
      const statLower = status.toLowerCase();
      if (statLower === 'open') {
        query.status = { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolution Pending Verification', 'REVIEW_REQUIRED', 'Reopened'] };
      } else if (statLower === 'resolved') {
        query.status = { $in: ['Resolved', 'SOLVED'] };
      } else {
        query.status = { $regex: new RegExp(`^${status}$`, 'i') };
      }
    }

    if (rawTimeRange && rawTimeRange !== 'All' && rawTimeRange !== 'all') {
      const trLower = rawTimeRange.toLowerCase();
      const now = new Date();
      if (trLower === 'today') {
        query.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
      } else if (trLower === '7d' || trLower === '7days') {
        query.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
      } else if (trLower === '30d' || trLower === '30days') {
        query.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
      } else if (trLower === '90d' || trLower === '90days') {
        query.createdAt = { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
      }
    }

    // 3. Compute Server-Side Summary Metrics from MongoDB across ALL matching complaints
    const [
      totalCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      openCount,
      inProgressCount,
      resolvedCount
    ] = await Promise.all([
      Complaint.countDocuments(query),
      Complaint.countDocuments({
        ...query,
        $or: [
          { priority: 'Emergency' },
          { priority: 'Critical' },
          { 'aiAnalysis.priority': 'Emergency' },
          { 'aiAnalysis.severity': 'Critical' },
          { 'decisionSupport.priorityLevel': 'Critical' }
        ]
      }),
      Complaint.countDocuments({ ...query, priority: 'High' }),
      Complaint.countDocuments({ ...query, priority: 'Medium' }),
      Complaint.countDocuments({ ...query, priority: 'Low' }),
      Complaint.countDocuments({
        ...query,
        status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolution Pending Verification', 'REVIEW_REQUIRED', 'Reopened'] }
      }),
      Complaint.countDocuments({ ...query, status: 'In Progress' }),
      Complaint.countDocuments({ ...query, status: { $in: ['Resolved', 'SOLVED'] } })
    ]);

    const summary = {
      total: totalCount,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount
    };

    // 4. Fetch up to limit map-safe complaint records
    const rawComplaints = await Complaint.find(query)
      .select('_id complaintId title category department priority status address latitude longitude duplicateCount supportCount createdAt')
      .sort('-createdAt')
      .limit(parsedLimit)
      .lean();

    // Map & sanitize map points (no passwords, citizen emails, citizen phone numbers, private docs)
    const points = [];
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let hasCoords = false;

    rawComplaints.forEach((c) => {
      const lat = Number(c.latitude);
      const lng = Number(c.longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) {
        return; // Ignore invalid coordinates
      }

      hasCoords = true;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;

      const isResolved = ['Resolved', 'SOLVED'].includes(c.status);
      const isCritical = ['Emergency', 'Critical'].includes(c.priority);
      const isHigh = c.priority === 'High';
      const isMedium = c.priority === 'Medium';

      const riskLevel = isResolved ? 'resolved' : (isCritical ? 'critical' : (isHigh ? 'high' : (isMedium ? 'medium' : 'low')));
      const weight = isCritical ? 1.0 : (isHigh ? 0.8 : (isMedium ? 0.5 : 0.2));

      points.push({
        id: c._id.toString(),
        complaintId: c.complaintId || c._id.toString(),
        latitude: lat,
        longitude: lng,
        category: c.category || 'General',
        severity: c.priority || 'Medium',
        status: c.status || 'Pending',
        department: c.department || 'Municipal',
        createdAt: c.createdAt,
        title: c.title || 'Civic Complaint',
        riskLevel,
        // Backward-compatible fields for UI
        _id: c._id,
        lat,
        lng,
        priority: c.priority || 'Medium',
        weight,
        address: c.address
      });
    });

    // 5. Grid/Zone Hotspot Clusters Aggregation
    const zoneMap = new Map();
    points.forEach((p) => {
      // Group by ~1km grid (0.01 lat/lng precision)
      const latGrid = (Math.round(p.latitude * 100) / 100).toFixed(2);
      const lngGrid = (Math.round(p.longitude * 100) / 100).toFixed(2);
      const zoneKey = `Sector (${latGrid}, ${lngGrid})`;

      if (!zoneMap.has(zoneKey)) {
        zoneMap.set(zoneKey, {
          zoneName: zoneKey,
          latitude: p.latitude,
          longitude: p.longitude,
          centerLat: p.latitude,
          centerLng: p.longitude,
          lats: [p.latitude],
          lngs: [p.longitude],
          count: 0,
          totalComplaints: 0,
          critical: 0,
          criticalComplaints: 0,
          high: 0,
          highComplaints: 0,
          medium: 0,
          low: 0,
          openComplaints: 0,
          resolvedComplaints: 0,
          affectedCitizens: 0
        });
      }

      const z = zoneMap.get(zoneKey);
      z.count += 1;
      z.totalComplaints += 1;
      z.lats.push(p.latitude);
      z.lngs.push(p.longitude);

      if (p.riskLevel === 'critical') {
        z.critical += 1;
        z.criticalComplaints += 1;
      } else if (p.riskLevel === 'high') {
        z.high += 1;
        z.highComplaints += 1;
      } else if (p.riskLevel === 'medium') {
        z.medium += 1;
      } else {
        z.low += 1;
      }

      if (p.riskLevel === 'resolved') {
        z.resolvedComplaints += 1;
      } else {
        z.openComplaints += 1;
      }
      z.affectedCitizens += 1;
    });

    const clusters = Array.from(zoneMap.values()).map((z) => {
      const avgLat = z.lats.reduce((a, b) => a + b, 0) / z.lats.length;
      const avgLng = z.lngs.reduce((a, b) => a + b, 0) / z.lngs.length;
      const riskLevel = z.critical > 0 ? 'critical' : (z.high > 0 ? 'high' : (z.openComplaints > 0 ? 'medium' : 'low'));
      return {
        zoneName: z.zoneName,
        latitude: avgLat,
        longitude: avgLng,
        centerLat: avgLat,
        centerLng: avgLng,
        count: z.count,
        totalComplaints: z.totalComplaints,
        critical: z.critical,
        criticalComplaints: z.criticalComplaints,
        high: z.high,
        highComplaints: z.highComplaints,
        medium: z.medium,
        low: z.low,
        openComplaints: z.openComplaints,
        resolvedComplaints: z.resolvedComplaints,
        affectedCitizens: z.affectedCitizens,
        riskLevel
      };
    });

    // 6. Calculate Bounding Box
    const bounds = hasCoords
      ? { south: minLat, west: minLng, north: maxLat, east: maxLng }
      : null;

    // 7. Return Standard Response Format (with backward compatible root properties)
    res.json({
      success: true,
      data: {
        points,
        clusters,
        summary,
        bounds,
        meta: {
          totalMatching: summary.total,
          returnedPoints: points.length,
          limit: parsedLimit,
          filters: {
            category: category || null,
            severity: severity || null,
            status: status || null,
            timeRange: rawTimeRange || 'all',
            department: department || null
          },
          generatedAt: new Date().toISOString()
        }
      },
      // Backward compatibility top-level fields for existing UI components
      totalHeatPoints: points.length,
      totalZoneClusters: clusters.length,
      heatPoints: points,
      clusters: clusters
    });
  } catch (error) {
    console.error('Heatmap API error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to generate civic heatmap intelligence'
      }
    });
  }
});

/**
 * GET /api/government/intelligence/sla-risk
 * SLA Risk Prediction Endpoint
 */
router.get('/sla-risk', async (req, res) => {
  try {
    const { department, status, riskLevel } = req.query;
    const query = { status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolution Pending Verification', 'REVIEW_REQUIRED', 'Reopened'] } };

    if (department && department !== 'All') {
      query.department = { $regex: new RegExp(department, 'i') };
    }
    if (status && status !== 'All') {
      query.status = status;
    }

    const complaints = await Complaint.find(query).populate('assignedWorker', 'name status').lean();

    const predictions = await Promise.all(
      complaints.map(async (c) => {
        const sla = await predictSlaRisk(c);
        return {
          _id: c._id,
          complaintId: c.complaintId || `CMP-${c._id.toString().slice(-6)}`,
          title: c.title,
          category: c.category,
          department: c.department,
          priority: c.priority,
          status: c.status,
          assignedWorker: c.assignedWorker ? c.assignedWorker.name : 'Unassigned',
          createdAt: c.createdAt,
          ...sla
        };
      })
    );

    let filtered = predictions;
    if (riskLevel && riskLevel !== 'All') {
      filtered = predictions.filter(p => p.riskLevel === riskLevel);
    }

    filtered.sort((a, b) => b.riskScore - a.riskScore);

    const summary = {
      criticalCount: predictions.filter(p => p.riskLevel === 'CRITICAL').length,
      highCount: predictions.filter(p => p.riskLevel === 'HIGH').length,
      mediumCount: predictions.filter(p => p.riskLevel === 'MEDIUM').length,
      lowCount: predictions.filter(p => p.riskLevel === 'LOW').length,
      totalActive: predictions.length
    };

    res.json({
      success: true,
      summary,
      predictions: filtered
    });
  } catch (error) {
    console.error('SLA risk endpoint error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch SLA risk predictions' });
  }
});

/**
 * GET /api/government/intelligence/worker-recommendations/:complaintId
 * Smart Worker Assignment Recommendation
 */
router.get('/worker-recommendations/:complaintId', async (req, res) => {
  try {
    const { complaintId } = req.params;
    const recommendations = await recommendWorkersForComplaint(complaintId);
    res.json({
      success: true,
      complaintId,
      recommendations
    });
  } catch (error) {
    console.error('Worker recommendation error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate worker recommendations' });
  }
});

/**
 * GET /api/government/intelligence/decision-simulator
 * AI Decision Simulator Endpoint
 */
router.get('/decision-simulator', async (req, res) => {
  try {
    const simulations = await generateDecisionSimulation(req.query);
    res.json({
      success: true,
      count: simulations.length,
      simulations
    });
  } catch (error) {
    console.error('Decision simulator error:', error);
    res.status(500).json({ success: false, message: 'Failed to run decision simulator' });
  }
});

/**
 * POST /api/government/intelligence/action-plan
 * Generate Strategic Action Plan
 */
router.post('/action-plan', async (req, res) => {
  try {
    const plan = await generateActionPlan(req.body);
    res.json({
      success: true,
      ...plan
    });
  } catch (error) {
    console.error('Action plan error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate strategic action plan' });
  }
});

/**
 * GET /api/government/intelligence/dashboard
 * Civic Intelligence Center Overview Dashboard Metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalActiveComplaints,
      resolvedComplaints,
      totalCitizens,
      activeWorkers,
      complaints
    ] = await Promise.all([
      Complaint.countDocuments({ status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolution Pending Verification', 'REVIEW_REQUIRED', 'Reopened'] } }),
      Complaint.countDocuments({ status: { $in: ['Resolved', 'SOLVED'] } }),
      User.countDocuments({ role: { $in: ['Citizen', 'citizen'] } }),
      Worker.countDocuments({ status: 'Available' }),
      Complaint.find({ status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolution Pending Verification', 'REVIEW_REQUIRED', 'Reopened'] } }).lean()
    ]);

    // Aggregate Impact, SLA & Environmental totals
    let highImpactCount = 0;
    let criticalSlaCount = 0;
    let totalWaterLossLitres = 0;
    let totalWasteKg = 0;

    await Promise.all(
      complaints.map(async (c) => {
        const impact = await calculateCivicImpactScore(c);
        const sla = await predictSlaRisk(c);
        const env = estimateEnvironmentalImpact(c);

        if (impact.impactScore >= 70) highImpactCount++;
        if (sla.riskLevel === 'CRITICAL' || sla.riskLevel === 'HIGH') criticalSlaCount++;

        if (env.unit.includes('litres')) totalWaterLossLitres += env.estimatedValue;
        if (env.unit.includes('kg')) totalWasteKg += env.estimatedValue;
      })
    );

    res.json({
      success: true,
      overview: {
        totalActiveComplaints,
        resolvedComplaints,
        totalCitizens,
        activeWorkers,
        highImpactCount,
        criticalSlaCount,
        environmentalTotals: {
          waterLossLitres: totalWaterLossLitres,
          wasteKg: totalWasteKg
        }
      }
    });
  } catch (error) {
    console.error('Intelligence dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch intelligence dashboard metrics' });
  }
});

module.exports = router;
