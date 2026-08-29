const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const PreventiveAction = require('../models/PreventiveAction');
const EarlyWarning = require('../models/EarlyWarning');
const { protect, admin } = require('../middleware/auth');
const { detectHotspots } = require('../services/hotspotService');
const { generateForecast } = require('../services/forecastService');
const { forecastDepartmentResources } = require('../services/resourceForecastService');
const { generatePreventiveActions } = require('../services/preventiveMaintenanceService');
const { evaluateEarlyWarnings } = require('../services/earlyWarningService');
const { simulateResourceImpact } = require('../services/simulationService');
const { generatePredictionExplanation } = require('../services/predictionExplanationService');

// All prediction endpoints require Government/Admin authorization
const govOnly = [protect, admin];

/**
 * @route   GET /api/predictions/overview
 * @desc    Get executive predictive summary, forecasts, hotspot counts & early warnings
 * @access  Private (Government / Admin)
 */
router.get('/overview', govOnly, async (req, res) => {
  try {
    const [forecast, hotspots, deptForecasts, preventiveActions, warnings] = await Promise.all([
      generateForecast(),
      detectHotspots(),
      forecastDepartmentResources(),
      generatePreventiveActions(),
      evaluateEarlyWarnings()
    ]);

    const criticalHotspots = hotspots.filter(h => h.riskLevel === 'Critical');
    const highRiskHotspots = hotspots.filter(h => h.riskLevel === 'High');
    const deptsAtRisk = deptForecasts.filter(d => d.riskLevel === 'Critical' || d.riskLevel === 'High');

    res.json({
      success: true,
      summary: {
        predictedNext7Days: forecast.predictedVolume.next7Days,
        predictedNext30Days: forecast.predictedVolume.next30Days,
        trendPercentage: forecast.trendPercentage,
        confidence: forecast.confidence,
        explanation: forecast.explanation,
        totalHotspotsCount: hotspots.length,
        criticalHotspotsCount: criticalHotspots.length,
        highRiskHotspotsCount: highRiskHotspots.length,
        departmentsAtRiskCount: deptsAtRisk.length,
        preventiveActionsCount: preventiveActions.length,
        activeWarningsCount: warnings.filter(w => w.status === 'Active').length
      },
      criticalHotspots,
      departmentsAtRisk: deptsAtRisk,
      preventiveActions: preventiveActions.slice(0, 5),
      earlyWarnings: warnings
    });
  } catch (error) {
    console.error('Predictions overview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/predictions/hotspots
 * @desc    Get geographic risk hotspots with centroids and radius
 * @access  Private (Government / Admin)
 */
router.get('/hotspots', govOnly, async (req, res) => {
  try {
    const radius = parseInt(req.query.radius) || 800;
    const hotspots = await detectHotspots(radius);
    res.json({
      success: true,
      count: hotspots.length,
      hotspots
    });
  } catch (error) {
    console.error('Predictions hotspots error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/predictions/forecast
 * @desc    Get grievance forecasts with optional category/department/area filters
 * @access  Private (Government / Admin)
 */
router.get('/forecast', govOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.area) filter.area = req.query.area;

    const forecast = await generateForecast(filter);
    res.json({
      success: true,
      forecast
    });
  } catch (error) {
    console.error('Predictions forecast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/predictions/departments
 * @desc    Get departmental demand forecast and workforce capacity strain
 * @access  Private (Government / Admin)
 */
router.get('/departments', govOnly, async (req, res) => {
  try {
    const departments = await forecastDepartmentResources();
    res.json({
      success: true,
      count: departments.length,
      departments
    });
  } catch (error) {
    console.error('Predictions departments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/predictions/preventive-actions
 * @desc    Get all preventive maintenance recommendations
 * @access  Private (Government / Admin)
 */
router.get('/preventive-actions', govOnly, async (req, res) => {
  try {
    let actions = await PreventiveAction.find().sort({ riskScore: -1 });
    if (actions.length === 0) {
      actions = await generatePreventiveActions();
    }
    res.json({
      success: true,
      count: actions.length,
      actions
    });
  } catch (error) {
    console.error('Predictions preventive actions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   PATCH /api/predictions/preventive-actions/:id/status
 * @desc    Update status of a preventive action (Planned, Dispatched, Completed, Dismissed)
 * @access  Private (Government / Admin)
 */
router.patch('/preventive-actions/:id/status', govOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Recommended', 'Planned', 'Dispatched', 'Completed', 'Dismissed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }

    const action = await PreventiveAction.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ success: false, message: 'Preventive action not found' });
    }

    action.status = status;
    action.updatedBy = req.user._id;
    if (status === 'Planned') action.plannedAt = new Date();
    if (status === 'Completed') action.completedAt = new Date();

    await action.save();
    res.json({
      success: true,
      message: `Preventive action updated to "${status}"`,
      action
    });
  } catch (error) {
    console.error('Update preventive action error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/predictions/warnings
 * @desc    Get active early warnings
 * @access  Private (Government / Admin)
 */
router.get('/warnings', govOnly, async (req, res) => {
  try {
    const warnings = await evaluateEarlyWarnings();
    res.json({
      success: true,
      count: warnings.length,
      warnings
    });
  } catch (error) {
    console.error('Predictions warnings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   PATCH /api/predictions/warnings/:id/acknowledge
 * @desc    Acknowledge an early warning
 * @access  Private (Government / Admin)
 */
router.patch('/warnings/:id/acknowledge', govOnly, async (req, res) => {
  try {
    const warning = await EarlyWarning.findById(req.params.id);
    if (!warning) {
      return res.status(404).json({ success: false, message: 'Early warning not found' });
    }

    warning.status = 'Acknowledged';
    await warning.save();

    res.json({
      success: true,
      message: 'Early warning acknowledged',
      warning
    });
  } catch (error) {
    console.error('Acknowledge warning error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/predictions/simulate
 * @desc    Pure mathematical workforce simulation (read-only)
 * @access  Private (Government / Admin)
 */
router.post('/simulate', govOnly, async (req, res) => {
  try {
    const { department, additionalWorkers } = req.body;
    const result = await simulateResourceImpact({
      department: department || 'General',
      additionalWorkers: additionalWorkers || 1
    });

    res.json({
      success: true,
      simulation: result
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/predictions/recalculate
 * @desc    Recalculate all predictive intelligence and persist to MongoDB
 * @access  Private (Government / Admin)
 */
router.post('/recalculate', govOnly, async (req, res) => {
  try {
    const [hotspots, forecast, deptForecasts, preventiveActions, warnings] = await Promise.all([
      detectHotspots(),
      generateForecast(),
      forecastDepartmentResources(),
      generatePreventiveActions(),
      evaluateEarlyWarnings()
    ]);

    // Update active complaints with predictive intelligence
    const activeComplaints = await Complaint.find({
      status: { $nin: ['Resolved', 'Rejected'] }
    });

    for (const c of activeComplaints) {
      // Find matching hotspot if any
      const matchingHotspot = hotspots.find(h => 
        h.dominantCategory === c.category || (h.latitude && Math.abs(h.latitude - (c.latitude || 0)) < 0.02)
      );

      const riskScore = matchingHotspot ? matchingHotspot.riskScore : (c.decisionSupport?.score || 50);
      const riskLevel = matchingHotspot ? matchingHotspot.riskLevel : 'Medium';

      c.predictiveIntelligence = {
        riskScore,
        riskLevel,
        predictedCategory: c.category,
        predictedComplaintVolume: {
          next7Days: forecast.predictedVolume.next7Days,
          next30Days: forecast.predictedVolume.next30Days
        },
        hotspotScore: matchingHotspot ? matchingHotspot.complaintCount : 1,
        trendScore: parseInt(forecast.trendPercentage) || 0,
        repeatIssueScore: (c.reopenCount || 0) * 20,
        slaRiskScore: c.sla?.status === 'Breached' ? 80 : c.sla?.status === 'At Risk' ? 50 : 20,
        resourceRiskScore: 40,
        preventiveRecommendation: matchingHotspot?.recommendation || 'Continue routine municipal surveillance.',
        explanation: forecast.explanation,
        calculatedAt: new Date()
      };

      await c.save();
    }

    res.json({
      success: true,
      message: `Predictive civic intelligence recalculated for ${activeComplaints.length} active complaints.`,
      hotspotsCount: hotspots.length,
      preventiveActionsCount: preventiveActions.length,
      warningsCount: warnings.length
    });
  } catch (error) {
    console.error('Predictions recalculate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
