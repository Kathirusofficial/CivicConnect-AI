const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Worker = require('../models/Worker');
const decisionSupportService = require('../services/decisionSupportService');

// All routes require Auth + Admin/Government role
router.use(protect, admin);

/**
 * @route   POST /api/decision-support/calculate/:complaintId
 * @desc    Calculate or refresh AI decision support score for a complaint
 * @access  Private (Admin / Government only)
 */
router.post('/calculate/:complaintId', async (req, res) => {
  try {
    const { complaintId } = req.params;
    let complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      complaint = await Complaint.findOne({ complaintId });
    }
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const decisionSupport = await decisionSupportService.calculateDecisionSupport(complaint);

    res.json({
      success: true,
      data: {
        complaintId: complaint.complaintId || complaint._id,
        _id: complaint._id,
        priorityScore: decisionSupport.priorityScore,
        priorityLevel: decisionSupport.priorityLevel,
        citizenImpactCount: decisionSupport.citizenImpactCount,
        breakdown: decisionSupport.breakdown,
        recommendedAction: decisionSupport.recommendedAction,
        explanation: decisionSupport.explanation,
        calculatedAt: decisionSupport.calculatedAt
      }
    });
  } catch (error) {
    console.error('Error calculating decision support:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/decision-support/recalculate
 * @desc    Bulk recalculate decision support for all active complaints
 * @access  Private (Admin / Government only)
 */
router.post('/recalculate', async (req, res) => {
  try {
    const results = await decisionSupportService.recalculateAllActive();
    res.json({
      success: true,
      message: `Recalculated AI decision support for ${results.length} active complaints`,
      totalUpdated: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error in bulk recalculation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/decision-support/action-center
 * @desc    Get operational action center counters & metrics for government dashboard
 * @access  Private (Admin / Government only)
 */
router.get('/action-center', async (req, res) => {
  try {
    const activeFilter = { status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress'] } };

    // 1. Critical attention (priorityScore >= 80 or priorityLevel = Critical)
    const criticalAttention = await Complaint.countDocuments({
      ...activeFilter,
      $or: [
        { 'decisionSupport.priorityLevel': 'Critical' },
        { 'decisionSupport.priorityScore': { $gte: 80 } },
        { priority: 'Emergency' }
      ]
    });

    // 2. High priority (priorityLevel = High)
    const highPriority = await Complaint.countDocuments({
      ...activeFilter,
      'decisionSupport.priorityLevel': 'High'
    });

    // 3. Long pending (>24 hours and not resolved)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const longPending = await Complaint.countDocuments({
      status: { $in: ['Pending', 'Verified'] },
      createdAt: { $lte: twentyFourHoursAgo }
    });

    // 4. Citizen impact alerts (duplicateGroupId or citizenImpactCount >= 2)
    const citizenImpactAlerts = await Complaint.countDocuments({
      ...activeFilter,
      $or: [
        { duplicateGroupId: { $ne: null } },
        { 'decisionSupport.citizenImpactCount': { $gte: 2 } }
      ]
    });

    // 5. Unassigned Critical (priorityScore >= 80 & assignedWorker == null)
    const unassignedCritical = await Complaint.countDocuments({
      ...activeFilter,
      assignedWorker: null,
      $or: [
        { 'decisionSupport.priorityLevel': 'Critical' },
        { priority: 'Emergency' }
      ]
    });

    // 6. Overloaded departments
    const departments = await Department.find();
    let overloadedDepts = 0;
    for (const d of departments) {
      const activeCount = await Complaint.countDocuments({ department: d.name, ...activeFilter });
      const availableWorkers = await Worker.countDocuments({ department: d._id, status: 'Available' });
      const ratio = availableWorkers === 0 ? (activeCount > 0 ? 10 : 0) : (activeCount / availableWorkers);
      if (ratio >= 3) overloadedDepts++;
    }

    res.json({
      success: true,
      criticalAttention,
      highPriority,
      longPending,
      citizenImpactAlerts,
      unassignedCritical,
      overloadedDepartments: overloadedDepts
    });
  } catch (error) {
    console.error('Error fetching action center data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/decision-support/top-priority
 * @desc    Get top 5 highest priority complaints requiring government intervention
 * @access  Private (Admin / Government only)
 */
router.get('/top-priority', async (req, res) => {
  try {
    const activeFilter = { status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress'] } };
    const complaints = await Complaint.find(activeFilter)
      .populate('citizen', 'name')
      .populate('assignedWorker', 'name status')
      .sort({ 'decisionSupport.priorityScore': -1, createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      complaints
    });
  } catch (error) {
    console.error('Error fetching top priority complaints:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
