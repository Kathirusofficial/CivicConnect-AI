const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, admin } = require('../middleware/auth');
const { calculateComplaintSLA, recalculateAllActiveSLAs } = require('../services/slaService');

// Middleware to restrict to Admin / Government roles
const govOnly = [protect, admin];

/**
 * @route   GET /api/sla/dashboard
 * @desc    Get comprehensive SLA compliance metrics and health overview
 * @access  Private (Government / Admin)
 */
router.get('/dashboard', govOnly, async (req, res) => {
  try {
    const allComplaints = await Complaint.find();

    const activeComplaints = allComplaints.filter(c => !['Resolved', 'Rejected'].includes(c.status));
    const resolvedComplaints = allComplaints.filter(c => c.status === 'Resolved');

    let withinSLA = 0;
    let atRisk = 0;
    let breached = 0;
    let emergencyBreached = 0;

    for (const c of activeComplaints) {
      const sla = calculateComplaintSLA(c);
      if (sla.status === 'Breached') {
        breached++;
        if (c.priority === 'Emergency') emergencyBreached++;
      } else if (sla.status === 'At Risk') {
        atRisk++;
      } else {
        withinSLA++;
      }
    }

    // Calculate resolution times for completed complaints
    let totalResolvedHours = 0;
    let completedWithinSLA = 0;

    for (const r of resolvedComplaints) {
      const sla = calculateComplaintSLA(r);
      totalResolvedHours += sla.elapsedHours || 0;
      if (!sla.breachedAt) completedWithinSLA++;
    }

    const averageResolutionHours = resolvedComplaints.length > 0 
      ? Math.round((totalResolvedHours / resolvedComplaints.length) * 10) / 10 
      : 24;

    const totalEvaluated = completedWithinSLA + breached;
    const slaComplianceRate = totalEvaluated > 0 
      ? `${Math.round((completedWithinSLA / totalEvaluated) * 100)}%` 
      : '95%';

    res.json({
      success: true,
      totalActive: activeComplaints.length,
      totalResolved: resolvedComplaints.length,
      withinSLA,
      atRisk,
      breached,
      emergencyBreached,
      averageResolutionHours,
      slaComplianceRate,
      healthStatus: breached > 5 ? 'Critical Attention' : atRisk > 5 ? 'Moderate Risk' : 'Healthy'
    });
  } catch (error) {
    console.error('SLA dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/sla/breached
 * @desc    Get all complaints currently violating their SLA deadline
 * @access  Private (Government / Admin)
 */
router.get('/breached', govOnly, async (req, res) => {
  try {
    const activeComplaints = await Complaint.find({
      status: { $nin: ['Resolved', 'Rejected'] }
    })
    .populate('assignedDepartment', 'name head')
    .populate('assignedWorker', 'name status contact')
    .sort({ priority: 1, createdAt: 1 });

    const breachedList = [];

    for (const c of activeComplaints) {
      const sla = calculateComplaintSLA(c);
      if (sla.status === 'Breached') {
        const doc = c.toObject();
        doc.sla = sla;
        breachedList.push(doc);
      }
    }

    res.json({
      success: true,
      count: breachedList.length,
      breachedComplaints: breachedList
    });
  } catch (error) {
    console.error('SLA breached list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/sla/at-risk
 * @desc    Get complaints approaching their SLA deadline (>= 80% elapsed)
 * @access  Private (Government / Admin)
 */
router.get('/at-risk', govOnly, async (req, res) => {
  try {
    const activeComplaints = await Complaint.find({
      status: { $nin: ['Resolved', 'Rejected'] }
    })
    .populate('assignedDepartment', 'name head')
    .populate('assignedWorker', 'name status contact')
    .sort({ createdAt: 1 });

    const atRiskList = [];

    for (const c of activeComplaints) {
      const sla = calculateComplaintSLA(c);
      if (sla.status === 'At Risk') {
        const doc = c.toObject();
        doc.sla = sla;
        atRiskList.push(doc);
      }
    }

    res.json({
      success: true,
      count: atRiskList.length,
      atRiskComplaints: atRiskList
    });
  } catch (error) {
    console.error('SLA at-risk list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/sla/recalculate
 * @desc    Recalculate SLA states across all active complaints and trigger notifications
 * @access  Private (Government / Admin)
 */
router.post('/recalculate', govOnly, async (req, res) => {
  try {
    const summary = await recalculateAllActiveSLAs();
    res.json({
      success: true,
      message: `Recalculated SLA states for ${summary.totalChecked} active complaints.`,
      summary
    });
  } catch (error) {
    console.error('SLA recalculation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
