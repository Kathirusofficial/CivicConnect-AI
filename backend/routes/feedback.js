const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { calculateResolutionQuality } = require('../services/resolutionQualityService');
const { evaluateAndEscalate } = require('../services/escalationService');

/**
 * @route   POST /api/feedback/:complaintId
 * @desc    Submit citizen satisfaction feedback and trigger outcome evaluation
 * @access  Private (Citizen owner only)
 */
router.post('/:complaintId', protect, async (req, res) => {
  try {
    const { rating, resolvedByCitizen, comment } = req.body;
    const userId = req.user._id;

    // Validate rating
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Ownership check (Citizen must own this complaint)
    if (!complaint.citizen || complaint.citizen.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only submit feedback for your own complaints' });
    }

    // Feedback can only be submitted for Resolved or previously Resolved complaints
    if (!['Resolved', 'Reopened', 'Completed'].includes(complaint.status) && !complaint.fieldWork?.resolvedAt) {
      return res.status(400).json({
        success: false,
        message: `Feedback can only be submitted after the municipal administration has marked the complaint as Resolved.`
      });
    }

    // Prevent duplicate feedback if already submitted
    if (complaint.citizenFeedback && complaint.citizenFeedback.submittedAt && req.query.allowUpdate !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Feedback has already been submitted for this complaint.'
      });
    }

    // Sanitize comment
    const sanitizedComment = (comment || '').trim().slice(0, 1000);
    const isResolved = resolvedByCitizen !== false;

    complaint.citizenFeedback = {
      rating: numRating,
      resolvedByCitizen: isResolved,
      comment: sanitizedComment,
      submittedAt: new Date()
    };

    // Timeline event
    complaint.timeline.push({
      status: isResolved ? complaint.status : 'Reopened',
      title: 'Citizen Feedback Submitted',
      description: `Citizen rated resolution ${numRating}/5 stars. ${isResolved ? 'Confirmed resolved.' : 'Reported issue as UNRESOLVED.'}`,
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    // If citizen indicates issue is NOT resolved -> Reopen complaint & escalate
    if (!isResolved) {
      complaint.status = 'Reopened';
      complaint.reopenCount = (complaint.reopenCount || 0) + 1;

      complaint.timeline.push({
        status: 'Reopened',
        title: 'Complaint Reopened',
        description: `Citizen indicated issue remains unresolved: "${sanitizedComment || 'Inadequate resolution'}". Reopened for rework.`,
        updatedBy: req.user._id,
        createdAt: new Date()
      });

      // Notify Government Admins
      const admins = await User.find({ role: { $in: ['Admin', 'Government'] } }).select('_id');
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: '⚠️ Complaint Reopened by Citizen',
          message: `Complaint ${complaint.complaintId} was marked UNRESOLVED by the citizen (Rating: ${numRating}/5). Reopened for investigation.`,
          type: 'alert',
          complaint: complaint._id
        }).catch(() => {});
      }

      // Notify assigned worker
      if (complaint.assignedWorker) {
        await Notification.create({
          user: complaint.assignedWorker,
          title: 'Task Reopened for Rework',
          message: `Citizen reported complaint ${complaint.complaintId} as unresolved. Reopened for field rework.`,
          type: 'alert',
          complaint: complaint._id
        }).catch(() => {});
      }
    }

    // Calculate Resolution Quality
    const qualityResult = await calculateResolutionQuality(complaint);
    complaint.resolutionQuality = qualityResult;

    // Evaluate Escalations
    await evaluateAndEscalate(complaint, { userId });

    await complaint.save();

    res.json({
      success: true,
      message: isResolved ? 'Feedback recorded successfully. Thank you!' : 'Complaint has been reopened and escalated for municipal rework.',
      feedback: complaint.citizenFeedback,
      resolutionQuality: complaint.resolutionQuality,
      status: complaint.status
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/feedback/:complaintId
 * @desc    Get feedback and outcome score for a complaint
 * @access  Private (Citizen owner or Admin/Gov)
 */
router.get('/:complaintId', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId)
      .select('complaintId citizen citizenFeedback resolutionQuality sla status reopenCount escalation');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const isOwner = complaint.citizen && complaint.citizen.toString() === req.user._id.toString();
    const isGov = ['Admin', 'Government'].includes(req.user.role);

    if (!isOwner && !isGov) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to view this feedback' });
    }

    res.json({
      success: true,
      complaintId: complaint.complaintId,
      status: complaint.status,
      feedback: complaint.citizenFeedback,
      resolutionQuality: complaint.resolutionQuality,
      sla: complaint.sla,
      reopenCount: complaint.reopenCount,
      escalation: complaint.escalation
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
