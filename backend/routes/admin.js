const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Worker = require('../models/Worker');
const Notification = require('../models/Notification');
const decisionSupportService = require('../services/decisionSupportService');
const aiService = require('../services/aiService');

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
    if (status) {
      if (status.toLowerCase() === 'active') {
        query.status = { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Reopened', 'Active', 'Detected', 'Acknowledged'] };
      } else {
        query.status = status;
      }
    }
    if (priority) {
      if (priority.toLowerCase() === 'critical' || priority.toLowerCase() === 'emergency') {
        query.$or = [
          { priority: 'Emergency' },
          { 'aiAnalysis.priority': 'Emergency' },
          { 'aiAnalysis.severity': 'Critical' },
          { 'decisionSupport.priorityLevel': 'Critical' }
        ];
      } else {
        query.priority = priority;
      }
    }
    if (category) query.category = { $regex: category, $options: 'i' };
    if (department) query.department = { $regex: department, $options: 'i' };
    if (aiPriorityLevel) {
      if (aiPriorityLevel.toLowerCase() === 'critical') {
        query.$or = [
          { 'decisionSupport.priorityLevel': 'Critical' },
          { 'aiAnalysis.severity': 'Critical' },
          { priority: 'Emergency' }
        ];
      } else {
        query['decisionSupport.priorityLevel'] = aiPriorityLevel;
      }
    }
    
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

// Helper to resolve department by ID, slug or name
const resolveDepartmentDoc = async (deptParam) => {
  if (!deptParam) return null;
  const mongoose = require('mongoose');
  if (mongoose.Types.ObjectId.isValid(deptParam)) {
    const doc = await Department.findById(deptParam);
    if (doc) return doc;
  }
  
  const slugMap = {
    'road': 'Road Department',
    'road-department': 'Road Department',
    'roads': 'Road Department',
    'water': 'Water Supply',
    'water-supply': 'Water Supply',
    'electricity': 'Electricity',
    'power': 'Electricity',
    'garbage': 'Garbage Collection',
    'garbage-collection': 'Garbage Collection',
    'sanitation': 'Garbage Collection',
    'traffic': 'Traffic Management',
    'traffic-management': 'Traffic Management',
    'drainage': 'Drainage',
    'street-lights': 'Street Lights',
    'street-light': 'Street Lights',
    'streetlights': 'Street Lights',
    'municipality': 'Municipality'
  };

  const normalized = deptParam.toLowerCase().trim();
  const mappedName = slugMap[normalized];
  if (mappedName) {
    const doc = await Department.findOne({ name: { $regex: new RegExp(`^${mappedName}$`, 'i') } });
    if (doc) return doc;
  }

  const cleanName = deptParam.replace(/[-_]/g, ' ');
  let doc = await Department.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
  if (!doc) {
    doc = await Department.findOne({ name: { $regex: new RegExp(cleanName, 'i') } });
  }
  return doc;
};

// GET /departments/:department/complaints - Department-specific complaint management
router.get('/departments/:department/complaints', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { department: deptParam } = req.params;
    const { search, status, priority, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const deptDoc = await resolveDepartmentDoc(deptParam);
    const deptName = deptDoc ? deptDoc.name : deptParam.replace(/[-_]/g, ' ');

    // Match complaints by department Name regex or assignedDepartment ObjectId
    const deptFilter = deptDoc 
      ? { $or: [{ department: { $regex: new RegExp(deptDoc.name, 'i') } }, { assignedDepartment: deptDoc._id }] }
      : { department: { $regex: new RegExp(deptName, 'i') } };

    // Live Stats calculation for this specific department
    const [total, pending, verified, assigned, inProgressDocs, resolved] = await Promise.all([
      Complaint.countDocuments(deptFilter),
      Complaint.countDocuments({ ...deptFilter, status: 'Pending' }),
      Complaint.countDocuments({ ...deptFilter, status: 'Verified' }),
      Complaint.countDocuments({ ...deptFilter, status: 'Assigned' }),
      Complaint.countDocuments({ ...deptFilter, status: { $in: ['In Progress', 'Resolution Pending Verification'] } }),
      Complaint.countDocuments({ ...deptFilter, status: { $in: ['Resolved', 'SOLVED'] } }),
    ]);

    const inProgress = verified + assigned + inProgressDocs;

    // Build query with filters
    const query = { ...deptFilter };

    if (status) {
      const statusLower = status.toLowerCase();
      if (statusLower === 'pending') {
        query.status = 'Pending';
      } else if (statusLower === 'in progress' || statusLower === 'in_progress' || statusLower === 'inprogress') {
        query.status = { $in: ['Verified', 'Assigned', 'In Progress', 'Resolution Pending Verification'] };
      } else if (statusLower === 'solved' || statusLower === 'resolved') {
        query.status = { $in: ['Resolved', 'SOLVED'] };
      } else if (statusLower !== 'all') {
        query.status = status;
      }
    }

    if (priority && priority !== 'all' && priority !== 'All') {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      const searchOr = [
        { complaintId: searchRegex },
        { title: searchRegex },
        { address: searchRegex },
        { landmark: searchRegex },
        { description: searchRegex }
      ];
      query.$and = [{ ...deptFilter }, { $or: searchOr }];
      delete query.$or;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filteredTotal = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedWorker', 'name status contact department')
      .populate('assignedDepartment', 'name head contactEmail')
      .populate('resolution.solvedBy', 'name email avatar role')
      .populate('resolution.verifiedBy', 'name email avatar role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      department: deptDoc || { name: deptName },
      stats: {
        total,
        pending,
        inProgress,
        solved: resolved
      },
      complaints,
      total: filteredTotal,
      page: parseInt(page),
      totalPages: Math.ceil(filteredTotal / parseInt(limit))
    });
  } catch (error) {
    console.error('Department complaints fetch error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error fetching department complaints' });
  }
});

// GET single complaint detail (accepts MongoDB ObjectId or complaintId string)
router.get('/complaints/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { id } = req.params;
    let query;
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { complaintId: id }] };
    } else {
      query = { complaintId: id };
    }

    const complaint = await Complaint.findOne(query)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedWorker', 'name status contact department employeeId')
      .populate('assignedDepartment', 'name head contactEmail')
      .populate('resolution.solvedBy', 'name email avatar role')
      .populate('resolution.verifiedBy', 'name email avatar role')
      .populate('duplicateOf', 'complaintId title status');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

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

// PATCH update status (Pending -> In Progress, etc.)
router.patch('/complaints/:id/status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { status } = req.body;
    const { id } = req.params;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    if (['Resolved', 'SOLVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'To mark a complaint as solved, please use the Solve Complaint resolution workflow with a resolution proof photo.'
      });
    }

    let query;
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { complaintId: id }] };
    } else {
      query = { complaintId: id };
    }

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const prevStatus = complaint.status;
    complaint.status = status;

    complaint.timeline.push({
      status,
      title: `Status Updated to ${status}`,
      description: `Government officer updated complaint status from ${prevStatus} to ${status}.`,
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    await complaint.save();

    // Recalculate decision support
    try {
      await decisionSupportService.calculateDecisionSupport(complaint);
    } catch (dsErr) {
      console.warn('Decision support update warning:', dsErr.message);
    }

    const trackingId = complaint.complaintId || complaint._id;
    if (complaint.citizen) {
      await Notification.create({
        user: complaint.citizen,
        title: 'Complaint Status Updated',
        message: `Your complaint ${trackingId} status has been updated to "${status}".`,
        type: 'status_update',
        complaint: complaint._id,
        link: `/complaints/${trackingId}`
      });
    }

    const updated = await Complaint.findById(complaint._id)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedWorker', 'name status contact department')
      .populate('assignedDepartment', 'name head contactEmail')
      .populate('resolution.solvedBy', 'name email avatar role');

    res.json({
      success: true,
      message: `Complaint status updated to ${status}`,
      complaint: updated
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating status' });
  }
});

// POST /complaints/:id/verify-resolution - AI + Geolocation Verification Workflow
const verifyResolutionHandler = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { notes, proofImage, latitude, longitude, accuracy, reverseGeocodedAddress } = req.body;
    const { id } = req.params;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resolution notes are required to verify resolution.' 
      });
    }

    if (!proofImage || !proofImage.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resolution proof photo is required to verify resolution.' 
      });
    }

    let query;
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { complaintId: id }] };
    } else {
      query = { complaintId: id };
    }

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Run AI Multimodal Vision + Geolocation Verification
    const verification = await aiService.verifyComplaintResolution({
      complaint,
      proofImage: proofImage.trim(),
      resolutionNotes: notes.trim(),
      officerLatitude: latitude,
      officerLongitude: longitude,
      gpsAccuracy: accuracy,
      reverseGeocodedAddress: reverseGeocodedAddress,
      userId: req.user._id
    });

    // Save verification result and draft proof on complaint
    complaint.resolutionVerification = verification;
    if (!complaint.resolution) complaint.resolution = {};
    complaint.resolution.notes = notes.trim();
    complaint.resolution.proofImage = proofImage.trim();

    const prevStatus = complaint.status;
    if (verification.status === 'VERIFIED') {
      complaint.status = 'Resolution Pending Verification';
    } else if (verification.status === 'REVIEW_REQUIRED') {
      complaint.status = 'REVIEW_REQUIRED';
    } else if (verification.status === 'REJECTED') {
      complaint.status = 'VERIFICATION_FAILED';
    }

    complaint.timeline.push({
      status: complaint.status,
      title: `Resolution Verification: ${verification.status}`,
      description: `AI & GPS verification performed by ${req.user.name}. Confidence: ${verification.confidence}%. ${verification.aiReason}`,
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    await complaint.save();

    const updated = await Complaint.findById(complaint._id)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedWorker', 'name status contact department employeeId')
      .populate('assignedDepartment', 'name head contactEmail')
      .populate('resolution.solvedBy', 'name email avatar role')
      .populate('resolution.verifiedBy', 'name email avatar role');

    return res.json({
      success: true,
      verification,
      complaint: updated,
      message: verification.status === 'VERIFIED'
        ? 'AI & GPS Resolution Verification passed! You can now solve the complaint.'
        : verification.status === 'REVIEW_REQUIRED'
          ? 'Verification requires supervisor review or higher clarity proof image.'
          : 'Verification rejected. Please ensure you are on-site with matching photographic evidence.'
    });
  } catch (error) {
    console.error('Verify resolution error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error verifying resolution' });
  }
};

router.post('/complaints/:id/verify-resolution', verifyResolutionHandler);

// POST /complaints/:id/resolve - Full Resolution Workflow (Officer solves complaint with proof photo)
const resolveComplaintHandler = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { notes, proofImage } = req.body;
    const { id } = req.params;

    let query;
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { complaintId: id }] };
    } else {
      query = { complaintId: id };
    }

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // STRICT GUARD: Must have verified resolution
    if (!complaint.resolutionVerification || complaint.resolutionVerification.status !== 'VERIFIED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot solve complaint without valid AI and GPS resolution verification. Please run Verify Resolution first.' 
      });
    }

    const resolvedNotes = (notes && notes.trim()) || complaint.resolution?.notes || complaint.resolutionVerification?.aiReason || 'Resolved by field operations.';
    const resolvedProofImage = (proofImage && proofImage.trim()) || complaint.resolution?.proofImage || '';

    const prevStatus = complaint.status;
    complaint.status = 'Resolved';

    complaint.resolution = {
      status: 'Resolved',
      notes: resolvedNotes,
      proofImage: resolvedProofImage,
      solvedBy: req.user._id,
      solvedAt: new Date(),
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      rejectionReason: ''
    };

    if (!complaint.fieldWork) complaint.fieldWork = {};
    complaint.fieldWork.resolvedAt = new Date();

    // Add resolution proof to evidence
    if (resolvedProofImage) {
      if (!complaint.evidence) complaint.evidence = [];
      complaint.evidence.push({
        type: 'after',
        url: resolvedProofImage,
        description: resolvedNotes,
        uploadedBy: req.user._id,
        uploadedAt: new Date()
      });
    }

    // Add timeline record
    complaint.timeline.push({
      status: 'Resolved',
      title: 'Complaint Marked as SOLVED (AI & GPS Verified)',
      description: `Officially solved by ${req.user.name}. AI Confidence: ${complaint.resolutionVerification.confidence}%. Notes: "${resolvedNotes}"`,
      updatedBy: req.user._id,
      createdAt: new Date()
    });

    // Release assigned worker
    if (complaint.assignedWorker) {
      await Worker.findByIdAndUpdate(complaint.assignedWorker, { status: 'Available' });
    }

    // Update department stats
    if (prevStatus !== 'Resolved' && prevStatus !== 'SOLVED') {
      const deptQuery = complaint.assignedDepartment 
        ? { _id: complaint.assignedDepartment } 
        : { name: complaint.department };
      await Department.findOneAndUpdate(deptQuery, { $inc: { 'stats.resolvedComplaints': 1 } });
    }

    await complaint.save();

    // Recalculate decision support
    try {
      await decisionSupportService.calculateDecisionSupport(complaint);
    } catch (dsErr) {
      console.warn('Decision support update warning on resolve:', dsErr.message);
    }

    const trackingId = complaint.complaintId || complaint._id;

    // Notify Citizen
    if (complaint.citizen) {
      await Notification.create({
        user: complaint.citizen,
        title: 'Complaint Solved',
        message: `Your complaint ${trackingId} has been successfully resolved and verified by government operations.`,
        type: 'status_update',
        complaint: complaint._id,
        link: `/complaints/${trackingId}`
      });
    }

    const updated = await Complaint.findById(complaint._id)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedWorker', 'name status contact department employeeId')
      .populate('assignedDepartment', 'name head contactEmail')
      .populate('resolution.solvedBy', 'name email avatar role')
      .populate('resolution.verifiedBy', 'name email avatar role');

    res.json({
      success: true,
      message: 'Complaint solved successfully',
      complaint: updated
    });
  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error solving complaint' });
  }
};

router.post('/complaints/:id/resolve', resolveComplaintHandler);
router.patch('/complaints/:id/resolve', resolveComplaintHandler);

// PATCH update complaint (status, priority, worker, department, remarks)
router.patch('/complaints/:id', async (req, res) => {
  try {
    const { status, priority, assignedWorker, assignedDepartment, remarks, moreInfoRequested, moreInfoText, timelineEntry } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (['Resolved', 'SOLVED'].includes(status)) {
      if (!complaint.resolutionVerification || complaint.resolutionVerification.status !== 'VERIFIED') {
        return res.status(400).json({
          success: false,
          message: 'To mark a complaint as solved, you must first complete AI & GPS Resolution Verification with photographic proof.'
        });
      }
    }

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
      const deptFilter = { 
        $or: [
          { department: { $regex: new RegExp(`^${dept.name}$`, 'i') } },
          { department: { $regex: new RegExp(dept.name, 'i') } },
          { assignedDepartment: dept._id }
        ] 
      };

      const total = await Complaint.countDocuments(deptFilter);
      const pending = await Complaint.countDocuments({ ...deptFilter, status: 'Pending' });
      const verified = await Complaint.countDocuments({ ...deptFilter, status: 'Verified' });
      const inProgress = await Complaint.countDocuments({ ...deptFilter, status: { $in: ['Assigned', 'In Progress', 'Resolution Pending Verification'] } });
      const resolved = await Complaint.countDocuments({ ...deptFilter, status: { $in: ['Resolved', 'SOLVED'] } });
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
        ...deptFilter,
        status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress'] }
      }).sort({ 'decisionSupport.priorityScore': -1, createdAt: -1 });

      const topUnresolvedPriority = topComp?.decisionSupport?.priorityLevel || topComp?.priority || 'Normal';

      return {
        ...dept.toObject(),
        liveStats: { total, pending, inProgress: verified + inProgress, resolved, active: activeCount },
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
