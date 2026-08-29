const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Worker = require('../models/Worker');
const Notification = require('../models/Notification');
const decisionSupportService = require('../services/decisionSupportService');

// All routes require auth + admin role
router.use(protect, admin);

/* ─────────────── DASHBOARD STATS ─────────────── */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalComplaints, pending, verified, assigned, inProgress, 
      resolved, rejected, emergency, departments, activeWorkers, totalWorkers
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'Verified' }),
      Complaint.countDocuments({ status: 'Assigned' }),
      Complaint.countDocuments({ status: 'In Progress' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ status: 'Rejected' }),
      Complaint.countDocuments({ 
        $or: [
          { priority: 'Emergency' }, 
          { 'aiAnalysis.priority': 'Emergency' }, 
          { 'aiAnalysis.severity': 'Critical' }
        ] 
      }),
      Department.countDocuments(),
      Worker.countDocuments({ status: 'Available' }),
      Worker.countDocuments(),
    ]);

    // Count duplicate cluster instances
    const duplicateGroups = await Complaint.distinct('duplicateGroupId', { duplicateGroupId: { $ne: null } });
    const duplicateClustersCount = duplicateGroups.length;

    // Avg resolution time
    const resolvedComplaints = await Complaint.find({ status: 'Resolved' });
    let avgResolutionTime = 0;
    if (resolvedComplaints.length > 0) {
      const totalMs = resolvedComplaints.reduce((sum, c) => {
        return sum + (new Date(c.updatedAt) - new Date(c.createdAt));
      }, 0);
      avgResolutionTime = Math.max(1, Math.round((totalMs / resolvedComplaints.length) / (1000 * 60 * 60))); // in hours
    }

    res.json({
      totalComplaints,
      pending,
      verified,
      assigned,
      inProgress,
      resolved,
      rejected,
      emergency,
      departments,
      activeWorkers,
      totalWorkers,
      duplicateClusters: duplicateClustersCount,
      avgResolutionTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ─────────────── COMPLAINTS ─────────────── */
// GET all complaints (with filters/search/pagination)
router.get('/complaints', async (req, res) => {
  try {
    const { 
      search, status, priority, category, department, emergency, assigned, duplicateOnly,
      aiPriorityLevel, aiQueue,
      page = 1, limit = 10, sort = '-createdAt' 
    } = req.query;
    const query = {};

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { complaintId: searchRegex },
        { title: searchRegex },
        { address: searchRegex },
        { landmark: searchRegex },
        { description: searchRegex }
      ];
    }
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = { $regex: category, $options: 'i' };
    if (department) query.department = { $regex: department, $options: 'i' };
    if (aiPriorityLevel) query['decisionSupport.priorityLevel'] = aiPriorityLevel;
    
    if (emergency === 'true' || emergency === true) {
      query.$or = [
        { priority: 'Emergency' },
        { 'aiAnalysis.priority': 'Emergency' },
        { 'aiAnalysis.severity': 'Critical' },
        { 'decisionSupport.priorityLevel': 'Critical' }
      ];
    }

    if (assigned === 'assigned') {
      query.assignedWorker = { $ne: null };
    } else if (assigned === 'unassigned') {
      query.assignedWorker = null;
    }

    if (duplicateOnly === 'true' || duplicateOnly === true) {
      query.duplicateGroupId = { $ne: null };
    }

    let sortOption = sort;
    if (aiQueue === 'true' || aiQueue === true || sort === 'aiPriority' || sort === '-aiScore') {
      sortOption = { 'decisionSupport.priorityScore': -1, createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedWorker', 'name status contact')
      .populate('assignedDepartment', 'name')
      .populate('duplicateOf', 'complaintId title status')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ 
      complaints, 
      total, 
      page: parseInt(page), 
      totalPages: Math.ceil(total / parseInt(limit)) 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single complaint detail
router.get('/complaints/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email avatar')
      .populate('assignedWorker', 'name status contact department')
      .populate('assignedDepartment', 'name head contactEmail')
      .populate('duplicateOf', 'complaintId title status');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    let relatedDuplicates = [];
    if (complaint.duplicateGroupId) {
      relatedDuplicates = await Complaint.find({
        duplicateGroupId: complaint.duplicateGroupId,
        _id: { $ne: complaint._id }
      }).select('_id complaintId title status createdAt citizen').populate('citizen', 'name email').lean();
    }

    const complaintObj = complaint.toObject();
    complaintObj.relatedDuplicates = relatedDuplicates;
    complaintObj.duplicateCount = relatedDuplicates.length + 1;

    res.json(complaintObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update complaint (status, priority, worker, department, remarks)
router.patch('/complaints/:id', async (req, res) => {
  try {
    const { status, priority, assignedWorker, assignedDepartment, remarks, moreInfoRequested, moreInfoText, timelineEntry } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const prevStatus = complaint.status;
    const prevWorkerId = complaint.assignedWorker ? complaint.assignedWorker.toString() : null;

    if (status) complaint.status = status;
    if (priority) complaint.priority = priority;
    if (assignedWorker !== undefined) complaint.assignedWorker = assignedWorker || null;
    if (assignedDepartment !== undefined) complaint.assignedDepartment = assignedDepartment || null;
    if (moreInfoRequested !== undefined) complaint.moreInfoRequested = moreInfoRequested;
    if (moreInfoText) complaint.moreInfoText = moreInfoText;

    if (remarks) {
      complaint.remarks.push({
        author: req.user.name,
        text: remarks,
        createdAt: new Date()
      });
    }

    // Handle timeline entry
    if (timelineEntry) {
      complaint.timeline.push({
        status: timelineEntry.status || status || complaint.status,
        title: timelineEntry.title,
        description: timelineEntry.description,
        updatedBy: req.user._id,
        createdAt: new Date()
      });
    } else if (status && status !== prevStatus) {
      let timelineTitle = `Status updated to ${status}`;
      let timelineDesc = `Complaint status changed from ${prevStatus} to ${status} by administrator.`;
      
      if (status === 'Verified') {
        timelineTitle = 'Complaint Verified';
        timelineDesc = 'Complaint verified by municipal authority and accepted for resolution.';
      } else if (status === 'In Progress') {
        timelineTitle = 'Work In Progress';
        timelineDesc = 'Field workforce is actively working on the site.';
      } else if (status === 'Resolved') {
        timelineTitle = 'Complaint Resolved';
        timelineDesc = 'Issue resolved successfully. Municipal operations completed.';
      } else if (status === 'Rejected') {
        timelineTitle = 'Complaint Rejected';
        timelineDesc = remarks ? `Complaint rejected: ${remarks}` : 'Complaint could not be processed.';
      }

      complaint.timeline.push({
        status,
        title: timelineTitle,
        description: timelineDesc,
        updatedBy: req.user._id,
        createdAt: new Date()
      });
    }

    // Handle Worker Status Transitions
    const newWorkerId = complaint.assignedWorker ? complaint.assignedWorker.toString() : null;
    let assignedWorkerDoc = null;

    if (assignedWorker !== undefined && newWorkerId !== prevWorkerId) {
      // Release previous worker if any
      if (prevWorkerId) {
        await Worker.findByIdAndUpdate(prevWorkerId, { status: 'Available' });
      }
      // Set new worker to Busy
      if (newWorkerId) {
        assignedWorkerDoc = await Worker.findByIdAndUpdate(newWorkerId, { status: 'Busy' }, { new: true });
        if (!timelineEntry) {
          complaint.timeline.push({
            status: complaint.status,
            title: 'Worker Assigned',
            description: `Assigned to field worker ${assignedWorkerDoc ? assignedWorkerDoc.name : 'Staff'}.`,
            updatedBy: req.user._id,
            createdAt: new Date()
          });
        }
      }
    }

    // If complaint is Resolved or Rejected, release current worker
    if ((status === 'Resolved' || status === 'Rejected') && complaint.assignedWorker) {
      await Worker.findByIdAndUpdate(complaint.assignedWorker, { status: 'Available' });
    }

    // Update department stats if resolved
    if (status === 'Resolved' && prevStatus !== 'Resolved') {
      const deptQuery = complaint.assignedDepartment 
        ? { _id: complaint.assignedDepartment } 
        : { name: complaint.department };
      await Department.findOneAndUpdate(deptQuery, { $inc: { 'stats.resolvedComplaints': 1 } });
    }

    await complaint.save();

    // Recalculate decision support for municipal operations
    try {
      await decisionSupportService.calculateDecisionSupport(complaint);
    } catch (dsErr) {
      console.warn('Admin update decision support warning:', dsErr.message);
    }

    const trackingId = complaint.complaintId || complaint._id;

    // Create notifications for citizen
    if (complaint.citizen) {
      if (status && status !== prevStatus) {
        let notifMsg = `Your complaint ${trackingId} has been updated to "${status}".`;
        if (status === 'Verified') notifMsg = `Your complaint ${trackingId} has been verified.`;
        if (status === 'In Progress') notifMsg = `Your complaint ${trackingId} is now In Progress.`;
        if (status === 'Resolved') notifMsg = `Your complaint ${trackingId} has been resolved.`;
        if (status === 'Rejected') notifMsg = `Your complaint ${trackingId} has been rejected.`;

        await Notification.create({
          user: complaint.citizen,
          message: notifMsg,
          read: false,
          link: `/complaints/${trackingId}`
        });
      }

      if (assignedWorker !== undefined && newWorkerId && newWorkerId !== prevWorkerId) {
        if (!assignedWorkerDoc) {
          assignedWorkerDoc = await Worker.findById(newWorkerId);
        }
        await Notification.create({
          user: complaint.citizen,
          message: `Your complaint ${trackingId} has been assigned to worker ${assignedWorkerDoc ? assignedWorkerDoc.name : 'Staff'}.`,
          read: false,
          link: `/complaints/${trackingId}`
        });
      }

      if (moreInfoRequested && moreInfoText) {
        await Notification.create({
          user: complaint.citizen,
          message: `Additional information requested for complaint ${trackingId}: "${moreInfoText}"`,
          read: false,
          link: `/complaints/${trackingId}`
        });
      }
    }

    const updated = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedWorker', 'name status contact department')
      .populate('assignedDepartment', 'name head contactEmail');

    res.json({ message: 'Complaint updated', complaint: updated });
  } catch (error) {
    console.error('Error updating complaint in admin:', error);
    res.status(500).json({ error: error.message });
  }
});

// APPROVE RESOLUTION
router.patch('/complaints/:id/approve-resolution', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.status !== 'Resolution Pending Verification') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot approve resolution for complaint with status "${complaint.status}". Must be "Resolution Pending Verification"` 
      });
    }

    const prevStatus = complaint.status;
    complaint.status = 'Resolved';
    
    if (!complaint.resolution) complaint.resolution = {};
    complaint.resolution.status = 'Approved';
    complaint.resolution.verifiedBy = req.user._id;
    complaint.resolution.verifiedAt = new Date();
    
    if (!complaint.fieldWork) complaint.fieldWork = {};
    complaint.fieldWork.resolvedAt = new Date();

    // Release assigned worker
    if (complaint.assignedWorker) {
      await Worker.findByIdAndUpdate(complaint.assignedWorker, { status: 'Available' });
    }

    // Update department stats (exactly once)
    if (prevStatus !== 'Resolved') {
      const deptQuery = complaint.assignedDepartment 
        ? { _id: complaint.assignedDepartment } 
        : { name: complaint.department };
      await Department.findOneAndUpdate(deptQuery, { $inc: { 'stats.resolvedComplaints': 1 } });
    }

    complaint.timeline.push({
      status: 'Resolved',
      title: 'Resolution Verified and Complaint Resolved',
      description: `Government officer verified field resolution evidence and officially marked complaint as resolved.`,
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    await complaint.save();

    // Recalculate decision support
    try {
      await decisionSupportService.calculateDecisionSupport(complaint);
    } catch (dsErr) {
      console.warn('Decision support update warning on approval:', dsErr.message);
    }

    const trackingId = complaint.complaintId || complaint._id;

    // Notify Citizen
    if (complaint.citizen) {
      await Notification.create({
        user: complaint.citizen,
        title: 'Complaint Resolved',
        message: `Your complaint ${trackingId} has been verified and resolved by the municipal administration.`,
        type: 'status_update',
        complaint: complaint._id
      });
    }

    // Notify Assigned Worker
    if (complaint.assignedWorker) {
      // If worker is linked to User or has direct worker notification
      await Notification.create({
        user: complaint.assignedWorker,
        title: 'Resolution Approved',
        message: `Your field resolution for ${trackingId} has been approved by the administration. Task completed!`,
        type: 'status_update',
        complaint: complaint._id
      }).catch(() => {});
    }

    const updated = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedWorker', 'name status contact department employeeId')
      .populate('assignedDepartment', 'name head contactEmail');

    res.json({ success: true, message: 'Resolution approved and complaint resolved', complaint: updated });
  } catch (error) {
    console.error('Approve resolution error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// REJECT RESOLUTION
router.patch('/complaints/:id/reject-resolution', async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.status !== 'Resolution Pending Verification') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot reject resolution for complaint with status "${complaint.status}". Must be "Resolution Pending Verification"` 
      });
    }

    complaint.status = 'In Progress';
    
    if (!complaint.resolution) complaint.resolution = {};
    complaint.resolution.status = 'Rejected';
    complaint.resolution.rejectionReason = rejectionReason.trim();

    // Worker remains busy
    if (complaint.assignedWorker) {
      await Worker.findByIdAndUpdate(complaint.assignedWorker, { status: 'Busy' });
    }

    complaint.timeline.push({
      status: 'In Progress',
      title: 'Resolution Rejected — Rework Required',
      description: `Resolution rejected by government officer. Reason: ${rejectionReason.trim()}`,
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    await complaint.save();

    const trackingId = complaint.complaintId || complaint._id;

    // Notify Assigned Worker
    if (complaint.assignedWorker) {
      await Notification.create({
        user: complaint.assignedWorker,
        title: 'Resolution Rejected — Rework Required',
        message: `Resolution rejected for ${trackingId}: "${rejectionReason.trim()}". Please revisit location and submit rework.`,
        type: 'status_update',
        complaint: complaint._id
      }).catch(() => {});
    }

    // Notify Citizen
    if (complaint.citizen) {
      await Notification.create({
        user: complaint.citizen,
        title: 'Field Work Ongoing',
        message: `Field work on complaint ${trackingId} is undergoing further technical refinement.`,
        type: 'status_update',
        complaint: complaint._id
      });
    }

    const updated = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedWorker', 'name status contact department employeeId')
      .populate('assignedDepartment', 'name head contactEmail');

    res.json({ success: true, message: 'Resolution rejected, task returned to In Progress', complaint: updated });
  } catch (error) {
    console.error('Reject resolution error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE complaint
router.delete('/complaints/:id', async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: 'Complaint deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ─────────────── DEPARTMENTS ─────────────── */
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find();
    // Attach live complaint counts & AI Workload Intelligence
    const depts = await Promise.all(departments.map(async (dept) => {
      const total = await Complaint.countDocuments({ department: dept.name });
      const pending = await Complaint.countDocuments({ department: dept.name, status: 'Pending' });
      const verified = await Complaint.countDocuments({ department: dept.name, status: 'Verified' });
      const inProgress = await Complaint.countDocuments({ department: dept.name, status: { $in: ['Assigned', 'In Progress'] } });
      const resolved = await Complaint.countDocuments({ department: dept.name, status: 'Resolved' });
      const activeCount = pending + verified + inProgress;

      const workerCount = await Worker.countDocuments({ department: dept._id });
      const availableWorkers = await Worker.countDocuments({ department: dept._id, status: 'Available' });
      const busyWorkers = await Worker.countDocuments({ department: dept._id, status: 'Busy' });

      const loadRatio = availableWorkers === 0 ? (activeCount > 0 ? 10 : 0) : (activeCount / availableWorkers);
      let aiWorkload = 'Normal';
      if (loadRatio >= 5) aiWorkload = 'Critical';
      else if (loadRatio >= 3) aiWorkload = 'Overloaded';
      else if (loadRatio >= 1.5) aiWorkload = 'Busy';

      // Find top unresolved priority
      const topComp = await Complaint.findOne({
        department: dept.name,
        status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress'] }
      }).sort({ 'decisionSupport.priorityScore': -1, createdAt: -1 });

      const topUnresolvedPriority = topComp?.decisionSupport?.priorityLevel || topComp?.priority || 'Normal';

      return {
        ...dept.toObject(),
        liveStats: { total, pending, inProgress, resolved, active: activeCount },
        workerCount,
        availableWorkers,
        busyWorkers,
        aiWorkload,
        topUnresolvedPriority
      };
    }));
    res.json(depts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/departments/:id', async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const complaints = await Complaint.find({ department: dept.name })
      .populate('citizen', 'name email')
      .populate('assignedWorker', 'name status')
      .sort('-createdAt')
      .limit(20);

    const workers = await Worker.find({ department: dept._id });

    res.json({ department: dept, complaints, workers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json(dept);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(dept);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* ─────────────── WORKERS ─────────────── */
router.get('/workers', async (req, res) => {
  try {
    const { status, department } = req.query;
    const query = {};
    if (status) query.status = status;
    if (department) query.department = department;

    const workers = await Worker.find(query).populate('department', 'name').select('-password');

    // Attach workload & performance metrics
    const workersWithLoad = await Promise.all(workers.map(async (w) => {
      const assigned = await Complaint.countDocuments({ assignedWorker: w._id });
      const completed = await Complaint.countDocuments({ assignedWorker: w._id, status: 'Resolved' });
      const active = await Complaint.countDocuments({ 
        assignedWorker: w._id, 
        status: { $in: ['Assigned', 'In Progress', 'Resolution Pending Verification'] } 
      });
      const resolvedList = await Complaint.find({ assignedWorker: w._id, status: 'Resolved' });

      let avgResHours = 24;
      if (resolvedList.length > 0) {
        const totalMs = resolvedList.reduce((acc, c) => acc + (new Date(c.updatedAt) - new Date(c.createdAt)), 0);
        avgResHours = Math.max(1, Math.round(totalMs / (resolvedList.length * 1000 * 60 * 60)));
      }

      const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 100;

      return { 
        ...w.toObject(), 
        employeeId: w.employeeId || `EMP-${w._id.toString().slice(-6).toUpperCase()}`,
        assignedComplaints: assigned, 
        completedComplaints: completed,
        tasksCompleted: completed,
        activeTasks: active,
        currentWorkload: active,
        completionRate: `${rate}%`,
        averageResolutionTime: `${avgResHours}h`
      };
    }));

    res.json(workersWithLoad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workers', async (req, res) => {
  try {
    const worker = await Worker.create(req.body);
    const populated = await Worker.findById(worker._id).populate('department', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/workers/:id', async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('department', 'name');
    res.json(worker);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/workers/:id', async (req, res) => {
  try {
    await Worker.findByIdAndDelete(req.params.id);
    res.json({ message: 'Worker removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ─────────────── USERS (Citizens) ─────────────── */
router.get('/users', async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const usersWithStats = await Promise.all(users.map(async (u) => {
      const totalComplaints = await Complaint.countDocuments({ citizen: u._id });
      const resolvedComplaints = await Complaint.countDocuments({ citizen: u._id, status: 'Resolved' });
      return { ...u.toObject(), totalComplaints, resolvedComplaints };
    }));

    res.json({ users: usersWithStats, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const complaints = await Complaint.find({ citizen: user._id }).sort('-createdAt').limit(10);
    res.json({ user, complaints });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ─────────────── NOTIFICATIONS ─────────────── */
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(20);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ─────────────── ANALYTICS ─────────────── */
router.get('/analytics', async (req, res) => {
  try {
    // Monthly complaints for past 6 months
    const now = new Date();
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = await Complaint.countDocuments({ createdAt: { $gte: start, $lte: end } });
      const resolvedCount = await Complaint.countDocuments({ createdAt: { $gte: start, $lte: end }, status: 'Resolved' });
      monthlyData.push({
        month: start.toLocaleString('default', { month: 'short' }),
        total: count,
        resolved: resolvedCount
      });
    }

    // Department wise
    const departments = await Department.find();
    const deptWise = await Promise.all(departments.map(async (d) => ({
      name: d.name,
      total: await Complaint.countDocuments({ department: d.name }),
      resolved: await Complaint.countDocuments({ department: d.name, status: 'Resolved' }),
      pending: await Complaint.countDocuments({ department: d.name, status: 'Pending' }),
    })));

    // Status distribution
    const [totalPending, totalInProgress, totalResolved, totalRejected, totalVerified, totalAssigned] = await Promise.all([
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'In Progress' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ status: 'Rejected' }),
      Complaint.countDocuments({ status: 'Verified' }),
      Complaint.countDocuments({ status: 'Assigned' }),
    ]);

    const statusDistribution = [
      { name: 'Pending', value: totalPending },
      { name: 'Verified', value: totalVerified },
      { name: 'Assigned', value: totalAssigned },
      { name: 'In Progress', value: totalInProgress },
      { name: 'Resolved', value: totalResolved },
      { name: 'Rejected', value: totalRejected },
    ];

    // Priority distribution
    const priorityDistribution = await Promise.all(['Low', 'Medium', 'High', 'Emergency'].map(async (p) => ({
      name: p,
      value: await Complaint.countDocuments({ priority: p })
    })));

    // AI Decision Support Priority distribution
    const aiPriorityDistribution = await Promise.all(['Critical', 'High', 'Medium', 'Low'].map(async (lvl) => ({
      name: lvl,
      value: await Complaint.countDocuments({ 'decisionSupport.priorityLevel': lvl })
    })));

    // AI Metrics
    const activeComplaints = await Complaint.find({ status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress'] } });
    let avgAiPriorityScore = 0;
    if (activeComplaints.length > 0) {
      const sumScores = activeComplaints.reduce((acc, c) => acc + (c.decisionSupport?.priorityScore || 0), 0);
      avgAiPriorityScore = Math.round(sumScores / activeComplaints.length);
    }

    const highImpactCount = await Complaint.countDocuments({ 'decisionSupport.citizenImpactCount': { $gte: 2 } });
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const longPendingCount = await Complaint.countDocuments({
      status: { $in: ['Pending', 'Verified'] },
      createdAt: { $lte: twentyFourHoursAgo }
    });
    const duplicateImpactCount = await Complaint.countDocuments({ duplicateGroupId: { $ne: null } });

    res.json({ 
      monthlyData, 
      deptWise, 
      statusDistribution, 
      priorityDistribution,
      aiPriorityDistribution,
      avgAiPriorityScore,
      highImpactCount,
      longPendingCount,
      duplicateImpactCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ─────────────── MAP DATA ─────────────── */
router.get('/map-complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .select('complaintId title category department status priority latitude longitude address landmark duplicateGroupId citizen decisionSupport createdAt')
      .populate('citizen', 'name email');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
