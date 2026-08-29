const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Worker = require('../models/Worker');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, worker } = require('../middleware/auth');

// All worker routes require Worker authentication
router.use(protect);
router.use(worker);

// Helper to sanitize operational complaint output (remove citizen PII)
const sanitizeComplaint = (c) => {
  return {
    _id: c._id,
    complaintId: c.complaintId,
    title: c.title,
    description: c.description,
    category: c.category,
    department: c.department,
    status: c.status,
    priority: c.priority,
    address: c.address,
    landmark: c.landmark,
    latitude: c.latitude,
    longitude: c.longitude,
    images: c.images || [],
    aiAnalysis: c.aiAnalysis ? {
      category: c.aiAnalysis.category,
      department: c.aiAnalysis.department,
      priority: c.aiAnalysis.priority,
      severity: c.aiAnalysis.severity,
      summary: c.aiAnalysis.summary,
      confidence: c.aiAnalysis.confidence
    } : null,
    decisionSupport: c.decisionSupport ? {
      priorityScore: c.decisionSupport.priorityScore,
      priorityLevel: c.decisionSupport.priorityLevel,
      urgencyScore: c.decisionSupport.urgencyScore,
      recommendedAction: c.decisionSupport.recommendedAction,
      explanation: c.decisionSupport.explanation
    } : null,
    duplicateGroupId: c.duplicateGroupId,
    fieldWork: c.fieldWork || {},
    resolution: c.resolution || {},
    evidence: c.evidence || [],
    timeline: c.timeline || [],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  };
};

/**
 * @route   GET /api/worker/dashboard
 * @desc    Worker operational overview, KPI counters & prioritized active tasks
 * @access  Private (Worker only)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const workerId = req.user._id;

    const [
      assignedCount,
      inProgressCount,
      resolutionPendingCount,
      completedCount,
      emergencyCount,
      criticalCount,
      activeTasksDocs
    ] = await Promise.all([
      Complaint.countDocuments({ assignedWorker: workerId, status: 'Assigned' }),
      Complaint.countDocuments({ assignedWorker: workerId, status: 'In Progress' }),
      Complaint.countDocuments({ assignedWorker: workerId, status: 'Resolution Pending Verification' }),
      Complaint.countDocuments({ assignedWorker: workerId, status: 'Resolved' }),
      Complaint.countDocuments({ assignedWorker: workerId, priority: 'Emergency', status: { $ne: 'Resolved' } }),
      Complaint.countDocuments({ assignedWorker: workerId, 'decisionSupport.priorityLevel': 'Critical', status: { $ne: 'Resolved' } }),
      Complaint.find({
        assignedWorker: workerId,
        status: { $in: ['Assigned', 'In Progress', 'Resolution Pending Verification'] }
      }).sort({ 'decisionSupport.priorityScore': -1, createdAt: -1 })
    ]);

    const activeTasks = activeTasksDocs.map(sanitizeComplaint);

    res.json({
      success: true,
      summary: {
        assignedTasks: assignedCount,
        inProgress: inProgressCount,
        resolutionPending: resolutionPendingCount,
        completed: completedCount,
        emergency: emergencyCount,
        critical: criticalCount,
        totalActive: assignedCount + inProgressCount + resolutionPendingCount
      },
      activeTasks
    });
  } catch (error) {
    console.error('Worker dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/worker/tasks
 * @desc    List all complaints assigned to authenticated worker with filters
 * @access  Private (Worker only)
 */
router.get('/tasks', async (req, res) => {
  try {
    const workerId = req.user._id;
    const { status, priority, aiPriorityLevel, emergency, search } = req.query;

    const query = { assignedWorker: workerId };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (aiPriorityLevel) {
      query['decisionSupport.priorityLevel'] = aiPriorityLevel;
    }

    if (emergency === 'true') {
      query.priority = 'Emergency';
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { complaintId: searchRegex },
        { title: searchRegex },
        { category: searchRegex },
        { address: searchRegex },
        { landmark: searchRegex }
      ];
    }

    const tasks = await Complaint.find(query)
      .sort({ 'decisionSupport.priorityScore': -1, createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks: tasks.map(sanitizeComplaint)
    });
  } catch (error) {
    console.error('Worker tasks fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/worker/tasks/:id
 * @desc    Get sanitized operational complaint details (verifies worker assignment)
 * @access  Private (Worker only)
 */
router.get('/tasks/:id', async (req, res) => {
  try {
    const workerId = req.user._id;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!complaint.assignedWorker || complaint.assignedWorker.toString() !== workerId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: This task is not assigned to you' });
    }

    res.json({
      success: true,
      task: sanitizeComplaint(complaint)
    });
  } catch (error) {
    console.error('Worker task detail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   PATCH /api/worker/tasks/:id/accept
 * @desc    Worker accepts assigned task (Assigned -> In Progress)
 * @access  Private (Worker only)
 */
router.patch('/tasks/:id/accept', async (req, res) => {
  try {
    const workerId = req.user._id;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!complaint.assignedWorker || complaint.assignedWorker.toString() !== workerId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this task' });
    }

    if (complaint.status !== 'Assigned') {
      return res.status(400).json({ success: false, message: `Cannot accept task with status "${complaint.status}"` });
    }

    complaint.status = 'In Progress';
    if (!complaint.fieldWork) complaint.fieldWork = {};
    complaint.fieldWork.acceptedAt = new Date();

    complaint.timeline.push({
      status: 'In Progress',
      title: 'Field Worker Accepted Assignment',
      description: `Field worker ${req.user.name} accepted the assignment.`,
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    await complaint.save();

    // Notify citizen
    if (complaint.citizen) {
      await Notification.create({
        user: complaint.citizen,
        title: 'Field Work Scheduled',
        message: `Field worker ${req.user.name} has accepted your complaint ${complaint.complaintId} and scheduled field work.`,
        type: 'status_update',
        complaint: complaint._id
      });
    }

    // Notify government
    const admins = await User.find({ role: { $in: ['Admin', 'Government'] } }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        title: 'Worker Accepted Task',
        message: `Worker ${req.user.name} accepted assignment for ${complaint.complaintId}.`,
        type: 'status_update',
        complaint: complaint._id
      });
    }

    res.json({
      success: true,
      message: 'Task accepted successfully',
      task: sanitizeComplaint(complaint)
    });
  } catch (error) {
    console.error('Accept task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   PATCH /api/worker/tasks/:id/start
 * @desc    Worker starts active field work on site
 * @access  Private (Worker only)
 */
router.patch('/tasks/:id/start', async (req, res) => {
  try {
    const workerId = req.user._id;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!complaint.assignedWorker || complaint.assignedWorker.toString() !== workerId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this task' });
    }

    if (!['Assigned', 'In Progress'].includes(complaint.status)) {
      return res.status(400).json({ success: false, message: `Cannot start work for complaint in "${complaint.status}" status` });
    }

    complaint.status = 'In Progress';
    if (!complaint.fieldWork) complaint.fieldWork = {};
    if (!complaint.fieldWork.startedAt) {
      complaint.fieldWork.startedAt = new Date();
    }

    complaint.timeline.push({
      status: 'In Progress',
      title: 'Field Work Started',
      description: `Field worker ${req.user.name} has arrived at the location and started physical field work.`,
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    await complaint.save();

    // Notify citizen
    if (complaint.citizen) {
      await Notification.create({
        user: complaint.citizen,
        title: 'Field Work in Progress',
        message: `Field worker has started physical repairs for complaint ${complaint.complaintId}.`,
        type: 'status_update',
        complaint: complaint._id
      });
    }

    res.json({
      success: true,
      message: 'Field work started successfully',
      task: sanitizeComplaint(complaint)
    });
  } catch (error) {
    console.error('Start work error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/worker/tasks/:id/evidence
 * @desc    Upload / add photographic or textual evidence (Before / After / General)
 * @access  Private (Worker only)
 */
router.post('/tasks/:id/evidence', async (req, res) => {
  try {
    const workerId = req.user._id;
    const { type, url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'Evidence URL or data is required' });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!complaint.assignedWorker || complaint.assignedWorker.toString() !== workerId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this task' });
    }

    const validTypes = ['before', 'after', 'general'];
    const evidenceType = validTypes.includes(type) ? type : 'general';

    if (!complaint.evidence) complaint.evidence = [];
    complaint.evidence.push({
      type: evidenceType,
      url,
      uploadedBy: workerId,
      uploadedAt: new Date()
    });

    complaint.timeline.push({
      status: complaint.status,
      title: `Evidence Uploaded (${evidenceType.toUpperCase()})`,
      description: `Field worker uploaded ${evidenceType} work evidence.`,
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    await complaint.save();

    res.json({
      success: true,
      message: `${evidenceType} evidence recorded successfully`,
      evidence: complaint.evidence
    });
  } catch (error) {
    console.error('Upload evidence error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   PATCH /api/worker/tasks/:id/submit-resolution
 * @desc    Submit resolution with notes and evidence (In Progress -> Resolution Pending Verification)
 * @access  Private (Worker only)
 */
router.patch('/tasks/:id/submit-resolution', async (req, res) => {
  try {
    const workerId = req.user._id;
    const { notes, evidence } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Resolution notes describing the work completed are required' });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!complaint.assignedWorker || complaint.assignedWorker.toString() !== workerId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this task' });
    }

    if (complaint.status === 'Resolved') {
      return res.status(400).json({ success: false, message: 'Cannot submit resolution for an already resolved complaint.' });
    }

    if (!['In Progress', 'Assigned'].includes(complaint.status)) {
      return res.status(400).json({ success: false, message: `Cannot submit resolution for task in "${complaint.status}" status` });
    }

    // Append optional evidence items if passed in payload
    if (Array.isArray(evidence) && evidence.length > 0) {
      if (!complaint.evidence) complaint.evidence = [];
      for (const ev of evidence) {
        if (ev.url) {
          complaint.evidence.push({
            type: ev.type || 'after',
            url: ev.url,
            description: ev.description || '',
            uploadedBy: workerId,
            uploadedAt: new Date()
          });
        }
      }
    }

    // Validate at least one after work evidence exists
    const hasAfterEvidence = complaint.evidence && complaint.evidence.some(e => e.type === 'after');
    if (!hasAfterEvidence) {
      return res.status(422).json({
        success: false,
        message: 'At least one AFTER work evidence photo is required before submitting resolution.'
      });
    }

    complaint.status = 'Resolution Pending Verification';
    if (!complaint.fieldWork) complaint.fieldWork = {};
    complaint.fieldWork.resolutionSubmittedAt = new Date();

    complaint.resolution = {
      status: 'Pending Verification',
      notes: notes.trim(),
      submittedBy: workerId,
      submittedAt: new Date(),
      rejectionReason: ''
    };

    complaint.timeline.push({
      status: 'Resolution Pending Verification',
      title: 'Resolution Submitted',
      description: notes.trim(),
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    await complaint.save();

    // Notify citizen
    if (complaint.citizen) {
      await Notification.create({
        user: complaint.citizen,
        title: 'Field Work Completed — Verification Pending',
        message: `Field work completed and awaiting government verification for complaint ${complaint.complaintId}.`,
        type: 'status_update',
        complaint: complaint._id
      });
    }

    // Notify Government Officers
    const admins = await User.find({ role: { $in: ['Admin', 'Government'] } }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        title: 'Resolution Verification Required',
        message: `Worker ${req.user.name} submitted field resolution for ${complaint.complaintId}. Review and approve required.`,
        type: 'status_update',
        complaint: complaint._id
      });
    }

    res.json({
      success: true,
      message: 'Resolution submitted successfully for government verification',
      task: sanitizeComplaint(complaint)
    });
  } catch (error) {
    console.error('Submit resolution error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/worker/history
 * @desc    Get completed/resolved task history for authenticated worker
 * @access  Private (Worker only)
 */
router.get('/history', async (req, res) => {
  try {
    const workerId = req.user._id;

    const completedTasks = await Complaint.find({
      assignedWorker: workerId,
      status: 'Resolved'
    }).sort({ 'fieldWork.resolvedAt': -1, updatedAt: -1 });

    res.json({
      success: true,
      count: completedTasks.length,
      history: completedTasks.map(sanitizeComplaint)
    });
  } catch (error) {
    console.error('Worker history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/worker/profile
 * @desc    Get worker profile and performance scorecard
 * @access  Private (Worker only)
 */
router.get('/profile', async (req, res) => {
  try {
    const workerId = req.user._id;

    const [workerDoc, completedCount, activeCount, rejectedCount] = await Promise.all([
      Worker.findById(workerId).populate('department').select('-password'),
      Complaint.countDocuments({ assignedWorker: workerId, status: 'Resolved' }),
      Complaint.countDocuments({ assignedWorker: workerId, status: { $in: ['Assigned', 'In Progress', 'Resolution Pending Verification'] } }),
      Complaint.countDocuments({ assignedWorker: workerId, 'resolution.status': 'Rejected' })
    ]);

    const totalHandled = completedCount + activeCount;
    const completionRate = totalHandled > 0 ? Math.round((completedCount / totalHandled) * 100) : 100;

    res.json({
      success: true,
      profile: {
        _id: workerDoc._id,
        name: workerDoc.name,
        email: workerDoc.email,
        employeeId: workerDoc.employeeId || `EMP-${workerDoc._id.toString().slice(-6).toUpperCase()}`,
        department: workerDoc.department?.name || 'Municipal Field Operations',
        contact: workerDoc.contact,
        status: workerDoc.status,
        avatar: workerDoc.avatar
      },
      performance: {
        completedTasks: completedCount,
        activeTasks: activeCount,
        rejectedResolutions: rejectedCount,
        completionRate: `${completionRate}%`,
        averageResolutionHours: 24
      }
    });
  } catch (error) {
    console.error('Worker profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
