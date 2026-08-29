const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const predictiveService = require('../services/predictiveService');

// Require Admin or Government authentication for all predictive endpoints
router.use(protect);
router.use(admin);

/**
 * @route   GET /api/predictive/dashboard
 * @desc    Get aggregate predictive dashboard intelligence summary
 * @access  Private (Admin/Government only)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const data = await predictiveService.getPredictiveDashboard();
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Predictive Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve predictive dashboard metrics.' });
  }
});

/**
 * @route   GET /api/predictive/hotspots
 * @desc    Get detected geographic civic hotspots with risk scores
 * @access  Private (Admin/Government only)
 */
router.get('/hotspots', async (req, res) => {
  try {
    const windowDays = parseInt(req.query.days) || 30;
    const radiusMeters = parseInt(req.query.radius) || 500;
    const hotspots = await predictiveService.detectHotspots(windowDays, radiusMeters);
    res.json({ success: true, count: hotspots.length, hotspots });
  } catch (err) {
    console.error('Hotspot detection error:', err);
    res.status(500).json({ success: false, message: 'Failed to detect civic hotspots.' });
  }
});

/**
 * @route   GET /api/predictive/category-trends
 * @desc    Get category velocity, period-over-period growth rates, and risk levels
 * @access  Private (Admin/Government only)
 */
router.get('/category-trends', async (req, res) => {
  try {
    const windowDays = parseInt(req.query.days) || 30;
    const trends = await predictiveService.detectCategoryTrends(windowDays);
    res.json({ success: true, count: trends.length, trends });
  } catch (err) {
    console.error('Category trends error:', err);
    res.status(500).json({ success: false, message: 'Failed to analyze category trends.' });
  }
});

/**
 * @route   GET /api/predictive/department-risks
 * @desc    Get department workload forecasts, capacity strain, and risk levels
 * @access  Private (Admin/Government only)
 */
router.get('/department-risks', async (req, res) => {
  try {
    const departmentRisks = await predictiveService.detectDepartmentRisks();
    res.json({ success: true, count: departmentRisks.length, departmentRisks });
  } catch (err) {
    console.error('Department risk error:', err);
    res.status(500).json({ success: false, message: 'Failed to evaluate department risks.' });
  }
});

/**
 * @route   GET /api/predictive/emerging-issues
 * @desc    Get rapidly emerging civic problems and weekly velocity spikes
 * @access  Private (Admin/Government only)
 */
router.get('/emerging-issues', async (req, res) => {
  try {
    const emergingIssues = await predictiveService.detectEmergingIssues();
    res.json({ success: true, count: emergingIssues.length, emergingIssues });
  } catch (err) {
    console.error('Emerging issues error:', err);
    res.status(500).json({ success: false, message: 'Failed to detect emerging civic issues.' });
  }
});

/**
 * @route   GET /api/predictive/forecast
 * @desc    Get statistical trend-based complaint volume forecasts
 * @access  Private (Admin/Government only)
 */
router.get('/forecast', async (req, res) => {
  try {
    const forecast = await predictiveService.calculateForecast();
    res.json({ success: true, ...forecast });
  } catch (err) {
    console.error('Forecast calculation error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute trend forecast.' });
  }
});

/**
 * @route   POST /api/predictive/recalculate
 * @desc    Trigger full recalculation and persist to MongoDB CivicRisk collection
 * @access  Private (Admin/Government only)
 */
router.post('/recalculate', async (req, res) => {
  try {
    const result = await predictiveService.recalculateAndPersist();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Predictive recalculation error:', err);
    res.status(500).json({ success: false, message: 'Failed to recalculate predictive intelligence.' });
  }
});

module.exports = router;
