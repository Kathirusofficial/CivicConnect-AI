const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const { protect } = require('../middleware/auth');
const decisionSupportService = require('../services/decisionSupportService');

// POST /api/complaints - Create new complaint (Authenticated Citizen)
router.post('/', protect, async (req, res) => {
  try {
    const { 
      title, category, department, description, priority, 
      address, landmark, latitude, longitude, images, aiAnalysis,
      duplicateOf 
    } = req.body;

    if (!title || !description || !address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, description, and address are required fields.' 
      });
    }

    const deptName = department || category || 'Municipality';
    
    // Find matching department in DB to link ObjectId reference
    let matchedDept = await Department.findOne({ 
      name: { $regex: new RegExp(`^${deptName}$`, 'i') } 
    });
    if (!matchedDept && category) {
      matchedDept = await Department.findOne({
        name: { $regex: new RegExp(category, 'i') }
      });
    }

    const year = new Date().getFullYear();
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const complaintId = `CMP-${year}-${randomDigits}`;

    // Handle duplicate linking if specified by citizen
    let linkedDuplicateOf = null;
    let linkedDuplicateGroupId = null;

    if (duplicateOf) {
      let parentQuery;
      if (mongoose.Types.ObjectId.isValid(duplicateOf)) {
        parentQuery = { $or: [{ _id: duplicateOf }, { complaintId: duplicateOf }] };
      } else {
        parentQuery = { complaintId: duplicateOf };
      }
      const parentComplaint = await Complaint.findOne(parentQuery);
      if (parentComplaint) {
        if (!parentComplaint.duplicateGroupId) {
          parentComplaint.duplicateGroupId = parentComplaint.complaintId || `GRP-${parentComplaint._id}`;
          await parentComplaint.save();
        }
        linkedDuplicateOf = parentComplaint._id;
        linkedDuplicateGroupId = parentComplaint.duplicateGroupId;
      }
    }

    const complaint = new Complaint({
      complaintId,
      title: title.trim(),
      category: category || deptName,
      department: matchedDept ? matchedDept.name : deptName,
      description: description.trim(),
      priority: priority || 'Medium',
      status: 'Pending',
      address: address.trim(),
      landmark: landmark ? landmark.trim() : '',
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      images: Array.isArray(images) ? images : (images ? [images] : []),
      citizen: req.user._id,
      assignedDepartment: matchedDept ? matchedDept._id : null,
      duplicateOf: linkedDuplicateOf,
      duplicateGroupId: linkedDuplicateGroupId,
      aiAnalysis: aiAnalysis ? {
        category: aiAnalysis.category,
        department: aiAnalysis.department,
        priority: aiAnalysis.priority,
        severity: aiAnalysis.severity,
        summary: aiAnalysis.summary,
        confidence: typeof aiAnalysis.confidence === 'number' ? aiAnalysis.confidence : 0,
        analyzedAt: aiAnalysis.analyzedAt ? new Date(aiAnalysis.analyzedAt) : new Date(),
        classificationSource: aiAnalysis.classificationSource || 'AI Recommended'
      } : undefined,
      timeline: [
        {
          status: 'Pending',
          title: 'Complaint Submitted',
          description: linkedDuplicateOf 
            ? 'Complaint registered and linked to ongoing civic issue report group.' 
            : 'Complaint submitted by citizen and pending municipal verification.',
          createdAt: new Date()
        }
      ]
    });

    await complaint.save();

    // Auto-calculate Decision Support for municipal operations
    try {
      await decisionSupportService.calculateDecisionSupport(complaint);
      if (linkedDuplicateOf) {
        await decisionSupportService.calculateDecisionSupport(linkedDuplicateOf);
      }
    } catch (dsErr) {
      console.warn('Auto Decision Support warning:', dsErr.message);
    }

    if (matchedDept) {
      matchedDept.stats.totalComplaints = (matchedDept.stats.totalComplaints || 0) + 1;
      await matchedDept.save();
    }

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedDepartment', 'name head contactEmail')
      .populate('assignedWorker', 'name contact status')
      .populate('duplicateOf', 'complaintId title status');

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint: populatedComplaint
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating complaint' });
  }
});

// GET /api/complaints/my - Get complaints belonging to the logged-in citizen
router.get('/my', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({ citizen: req.user._id })
      .populate('assignedDepartment', 'name head contactEmail')
      .populate('assignedWorker', 'name status contact')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    console.error('Error fetching citizen complaints:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error fetching complaints' });
  }
});

// GET /api/complaints/:id - Get single complaint by ID or complaintId
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    let query;

    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { complaintId: id }] };
    } else {
      query = { complaintId: id };
    }

    const complaint = await Complaint.findOne(query)
      .populate('citizen', 'name email avatar mobile')
      .populate('assignedDepartment', 'name head contactEmail')
      .populate('assignedWorker', 'name status contact department')
      .populate('duplicateOf', 'complaintId title status');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Access check: If regular citizen, must be owner of the complaint
    const isOwner = complaint.citizen && complaint.citizen._id.toString() === req.user._id.toString();
    const isAdminUser = req.user.role === 'Admin' || req.user.role === 'Government';

    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access forbidden: You can only view your own complaints' 
      });
    }

    // Fetch related duplicate reports if part of a duplicate group
    let relatedDuplicates = [];
    if (complaint.duplicateGroupId) {
      relatedDuplicates = await Complaint.find({
        duplicateGroupId: complaint.duplicateGroupId,
        _id: { $ne: complaint._id }
      }).select('_id complaintId title status createdAt').lean();
    }

    res.json({ 
      success: true, 
      complaint,
      relatedDuplicates,
      duplicateCount: relatedDuplicates.length + 1
    });
  } catch (error) {
    console.error('Error fetching complaint details:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error fetching complaint' });
  }
});

// GET /api/complaints - General list (for Admin / Government roles)
router.get('/', protect, async (req, res) => {
  try {
    const isAdminUser = req.user.role === 'Admin' || req.user.role === 'Government';
    const query = isAdminUser ? {} : { citizen: req.user._id };

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email avatar')
      .populate('assignedDepartment', 'name')
      .populate('assignedWorker', 'name status')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
