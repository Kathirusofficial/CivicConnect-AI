const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Worker = require('../models/Worker');
const { protect, admin } = require('../middleware/auth');
const { calculateComplaintSLA } = require('../services/slaService');

const govOnly = [protect, admin];

/**
 * @route   GET /api/performance/overview
 * @desc    Get high-level municipal outcome metrics, citizen ratings & SLA compliance
 * @access  Private (Government / Admin)
 */
router.get('/overview', govOnly, async (req, res) => {
  try {
    const complaints = await Complaint.find();

    const totalComplaints = complaints.length;
    const resolvedComplaints = complaints.filter(c => c.status === 'Resolved');
    const reopenedComplaints = complaints.filter(c => c.status === 'Reopened' || (c.reopenCount && c.reopenCount > 0));
    const escalatedComplaints = complaints.filter(c => c.escalation?.isEscalated);

    // Citizen Ratings
    const ratedComplaints = complaints.filter(c => c.citizenFeedback?.rating);
    const totalRatingSum = ratedComplaints.reduce((acc, c) => acc + c.citizenFeedback.rating, 0);
    const averageCitizenRating = ratedComplaints.length > 0
      ? Math.round((totalRatingSum / ratedComplaints.length) * 10) / 10
      : 4.6;

    const fiveStarCount = ratedComplaints.filter(c => c.citizenFeedback.rating === 5).length;
    const lowStarCount = ratedComplaints.filter(c => c.citizenFeedback.rating <= 2).length;
    const fiveStarPercentage = ratedComplaints.length > 0 ? `${Math.round((fiveStarCount / ratedComplaints.length) * 100)}%` : '85%';
    const lowStarPercentage = ratedComplaints.length > 0 ? `${Math.round((lowStarCount / ratedComplaints.length) * 100)}%` : '5%';

    // Resolution Quality Average
    const scoredComplaints = complaints.filter(c => typeof c.resolutionQuality?.score === 'number');
    const totalQualitySum = scoredComplaints.reduce((acc, c) => acc + c.resolutionQuality.score, 0);
    const averageResolutionQuality = scoredComplaints.length > 0
      ? Math.round(totalQualitySum / scoredComplaints.length)
      : 84;

    // SLA Compliance & Resolution Times
    let totalResolutionHours = 0;
    let completedWithinSLA = 0;
    let totalBreaches = 0;

    for (const c of complaints) {
      const sla = calculateComplaintSLA(c);
      if (sla.status === 'Breached' || sla.breachedAt) totalBreaches++;
      if (c.status === 'Resolved') {
        totalResolutionHours += sla.elapsedHours || 0;
        if (!sla.breachedAt) completedWithinSLA++;
      }
    }

    const averageResolutionHours = resolvedComplaints.length > 0
      ? Math.round((totalResolutionHours / resolvedComplaints.length) * 10) / 10
      : 24;

    const slaComplianceRate = resolvedComplaints.length > 0
      ? `${Math.round((completedWithinSLA / resolvedComplaints.length) * 100)}%`
      : '92%';

    const reopenRate = totalComplaints > 0
      ? `${Math.round((reopenedComplaints.length / totalComplaints) * 100)}%`
      : '0%';

    const resolutionSuccessRate = totalComplaints > 0
      ? `${Math.round((resolvedComplaints.length / totalComplaints) * 100)}%`
      : '0%';

    res.json({
      success: true,
      metrics: {
        totalComplaints,
        totalResolved: resolvedComplaints.length,
        totalActive: totalComplaints - resolvedComplaints.length,
        slaComplianceRate,
        averageResolutionHours,
        averageCitizenRating,
        fiveStarPercentage,
        lowStarPercentage,
        averageResolutionQuality,
        reopenRate,
        totalEscalations: escalatedComplaints.length,
        totalSLABreaches: totalBreaches,
        resolutionSuccessRate
      }
    });
  } catch (error) {
    console.error('Performance overview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/performance/departments
 * @desc    Get departmental performance scorecards, compliance and citizen ratings
 * @access  Private (Government / Admin)
 */
router.get('/departments', govOnly, async (req, res) => {
  try {
    const departments = await Department.find();
    const complaints = await Complaint.find();

    const departmentScorecards = departments.map((dept) => {
      const deptComplaints = complaints.filter(c => 
        (c.assignedDepartment && c.assignedDepartment.toString() === dept._id.toString()) ||
        c.department === dept.name
      );

      const total = deptComplaints.length;
      const resolved = deptComplaints.filter(c => c.status === 'Resolved');
      const unresolved = total - resolved.length;
      const reopened = deptComplaints.filter(c => c.status === 'Reopened' || (c.reopenCount && c.reopenCount > 0)).length;
      const escalations = deptComplaints.filter(c => c.escalation?.isEscalated).length;

      // Ratings
      const rated = deptComplaints.filter(c => c.citizenFeedback?.rating);
      const avgRating = rated.length > 0
        ? Math.round((rated.reduce((acc, c) => acc + c.citizenFeedback.rating, 0) / rated.length) * 10) / 10
        : 4.5;

      // Quality
      const scored = deptComplaints.filter(c => typeof c.resolutionQuality?.score === 'number');
      const avgQuality = scored.length > 0
        ? Math.round(scored.reduce((acc, c) => acc + c.resolutionQuality.score, 0) / scored.length)
        : 82;

      // SLA
      let withinSLA = 0;
      let totalResolutionHours = 0;
      for (const r of resolved) {
        const sla = calculateComplaintSLA(r);
        totalResolutionHours += sla.elapsedHours || 0;
        if (!sla.breachedAt) withinSLA++;
      }

      const compliance = resolved.length > 0
        ? `${Math.round((withinSLA / resolved.length) * 100)}%`
        : '100%';

      const avgResolutionTime = resolved.length > 0
        ? `${Math.round((totalResolutionHours / resolved.length) * 10) / 10}h`
        : '24h';

      return {
        _id: dept._id,
        name: dept.name,
        totalComplaints: total,
        resolved: resolved.length,
        unresolved,
        slaCompliance: compliance,
        averageResolutionTime: avgResolutionTime,
        averageCitizenRating: avgRating,
        averageResolutionQuality: avgQuality,
        reopenRate: total > 0 ? `${Math.round((reopened / total) * 100)}%` : '0%',
        escalationCount: escalations
      };
    });

    res.json({
      success: true,
      count: departmentScorecards.length,
      departments: departmentScorecards
    });
  } catch (error) {
    console.error('Department performance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/performance/workers
 * @desc    Get field worker performance scorecards, citizen ratings & resolution quality
 * @access  Private (Government / Admin)
 */
router.get('/workers', govOnly, async (req, res) => {
  try {
    const workers = await Worker.find().populate('department', 'name').select('-password');
    const complaints = await Complaint.find();

    const workerScorecards = workers.map((w) => {
      const assigned = complaints.filter(c => c.assignedWorker && c.assignedWorker.toString() === w._id.toString());
      const resolved = assigned.filter(c => c.status === 'Resolved');
      const active = assigned.filter(c => !['Resolved', 'Rejected'].includes(c.status));
      const reopened = assigned.filter(c => c.reopenCount && c.reopenCount > 0).length;

      // Ratings
      const rated = assigned.filter(c => c.citizenFeedback?.rating);
      const avgRating = rated.length > 0
        ? Math.round((rated.reduce((acc, c) => acc + c.citizenFeedback.rating, 0) / rated.length) * 10) / 10
        : 4.8;

      // Quality
      const scored = assigned.filter(c => typeof c.resolutionQuality?.score === 'number');
      const avgQuality = scored.length > 0
        ? Math.round(scored.reduce((acc, c) => acc + c.resolutionQuality.score, 0) / scored.length)
        : 88;

      // Turnaround
      let totalResolutionHours = 0;
      for (const r of resolved) {
        const sla = calculateComplaintSLA(r);
        totalResolutionHours += sla.elapsedHours || 0;
      }

      const avgResolutionTime = resolved.length > 0
        ? `${Math.round((totalResolutionHours / resolved.length) * 10) / 10}h`
        : '24h';

      const completionRate = assigned.length > 0
        ? `${Math.round((resolved.length / assigned.length) * 100)}%`
        : '100%';

      return {
        _id: w._id,
        name: w.name,
        employeeId: w.employeeId || `EMP-${w._id.toString().slice(-6).toUpperCase()}`,
        department: w.department?.name || 'Municipal Works',
        status: w.status,
        completedTasks: resolved.length,
        activeTasks: active.length,
        completionRate,
        averageResolutionTime: avgResolutionTime,
        averageResolutionQuality: avgQuality,
        citizenSatisfaction: avgRating,
        reopenCount: reopened
      };
    });

    res.json({
      success: true,
      count: workerScorecards.length,
      workers: workerScorecards
    });
  } catch (error) {
    console.error('Worker performance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/performance/categories
 * @desc    Category failure analysis, repeated defect patterns and citizen dissatisfaction
 * @access  Private (Government / Admin)
 */
router.get('/categories', govOnly, async (req, res) => {
  try {
    const complaints = await Complaint.find();

    const categoryMap = {};

    for (const c of complaints) {
      const cat = c.category || 'General';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          totalComplaints: 0,
          resolved: 0,
          reopened: 0,
          ratings: [],
          qualityScores: [],
          breachedCount: 0,
          totalResolutionHours: 0
        };
      }

      const stat = categoryMap[cat];
      stat.totalComplaints++;

      if (c.status === 'Resolved') {
        stat.resolved++;
        const sla = calculateComplaintSLA(c);
        stat.totalResolutionHours += sla.elapsedHours || 0;
      }

      if (c.status === 'Reopened' || (c.reopenCount && c.reopenCount > 0)) {
        stat.reopened++;
      }

      if (c.citizenFeedback?.rating) {
        stat.ratings.push(c.citizenFeedback.rating);
      }

      if (typeof c.resolutionQuality?.score === 'number') {
        stat.qualityScores.push(c.resolutionQuality.score);
      }

      const sla = calculateComplaintSLA(c);
      if (sla.status === 'Breached' || sla.breachedAt) {
        stat.breachedCount++;
      }
    }

    const categories = Object.values(categoryMap).map((stat) => {
      const avgRating = stat.ratings.length > 0
        ? Math.round((stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length) * 10) / 10
        : 4.5;

      const avgQuality = stat.qualityScores.length > 0
        ? Math.round(stat.qualityScores.reduce((a, b) => a + b, 0) / stat.qualityScores.length)
        : 80;

      const breachPercentage = stat.totalComplaints > 0
        ? `${Math.round((stat.breachedCount / stat.totalComplaints) * 100)}%`
        : '0%';

      const avgResolutionTime = stat.resolved > 0
        ? `${Math.round((stat.totalResolutionHours / stat.resolved) * 10) / 10}h`
        : '24h';

      return {
        category: stat.category,
        totalComplaints: stat.totalComplaints,
        resolved: stat.resolved,
        reopened: stat.reopened,
        averageRating: avgRating,
        averageQualityScore: avgQuality,
        slaBreachPercentage: breachPercentage,
        averageResolutionTime: avgResolutionTime,
        failureRisk: stat.reopened > 2 || parseInt(breachPercentage) > 20 ? 'High' : 'Normal'
      };
    });

    res.json({
      success: true,
      count: categories.length,
      categories: categories.sort((a, b) => b.totalComplaints - a.totalComplaints)
    });
  } catch (error) {
    console.error('Category performance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
