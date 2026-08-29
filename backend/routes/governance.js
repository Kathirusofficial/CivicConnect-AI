const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const GovernanceIncident = require('../models/GovernanceIncident');
const GovernanceAction = require('../models/GovernanceAction');
const PreventiveAction = require('../models/PreventiveAction');
const EarlyWarning = require('../models/EarlyWarning');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Worker = require('../models/Worker');
const GovernanceCycle = require('../models/GovernanceCycle');

const { runGovernanceOrchestration } = require('../services/governanceOrchestratorService');
const { generateGovernanceRecommendation } = require('../services/governanceRecommendationService');

// All endpoints guarded by Admin/Government authorization
router.use(protect);
router.use(admin);

/**
 * @route   GET /api/governance/overview
 * @desc    Top KPI command center metrics
 */
router.get('/overview', async (req, res) => {
  try {
    const activeIncidents = await GovernanceIncident.countDocuments({
      status: { $in: ['Detected', 'Acknowledged', 'Action Planned', 'Dispatched', 'Monitoring'] }
    });

    const criticalIncidents = await GovernanceIncident.countDocuments({
      status: { $in: ['Detected', 'Acknowledged', 'Action Planned', 'Dispatched', 'Monitoring'] },
      severity: 'CRITICAL'
    });

    const slaCrises = await GovernanceIncident.countDocuments({
      status: { $in: ['Detected', 'Acknowledged', 'Action Planned', 'Dispatched', 'Monitoring'] },
      incidentType: 'SLA Crisis'
    });

    const overloadedDepts = await GovernanceIncident.countDocuments({
      status: { $in: ['Detected', 'Acknowledged', 'Action Planned', 'Dispatched', 'Monitoring'] },
      incidentType: 'Department Overload'
    });

    const emergencyClusters = await GovernanceIncident.countDocuments({
      status: { $in: ['Detected', 'Acknowledged', 'Action Planned', 'Dispatched', 'Monitoring'] },
      incidentType: 'Emergency Cluster'
    });

    const warnings = await EarlyWarning.countDocuments({ status: 'Active' });
    const pendingPreventiveActions = await PreventiveAction.countDocuments({ status: { $in: ['Recommended', 'Planned'] } });

    const totalWorkers = await Worker.countDocuments();
    const availableWorkers = await Worker.countDocuments({ status: 'Available' });
    const busyWorkers = await Worker.countDocuments({ status: 'Busy' });

    const totalActiveComplaints = await Complaint.countDocuments({
      status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Reopened'] }
    });
    const withinSlaComplaints = await Complaint.countDocuments({
      status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Reopened'] },
      'sla.status': { $in: ['Within SLA', 'Completed'] }
    });

    const responseCompliance = totalActiveComplaints > 0
      ? `${Math.round((withinSlaComplaints / totalActiveComplaints) * 100)}%`
      : '98%';

    const lastCycle = await GovernanceCycle.findOne().sort({ createdAt: -1 });

    res.json({
      success: true,
      summary: {
        activeIncidents,
        criticalIncidents,
        slaCrises,
        overloadedDepts,
        emergencyClusters,
        warnings,
        pendingPreventiveActions,
        totalWorkers,
        availableWorkers,
        busyWorkers,
        responseCompliance,
        lastCycleTime: lastCycle?.completedAt || new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   GET /api/governance/incidents
 * @desc    Paginated, filtered and sorted list of governance incidents
 */
router.get('/incidents', async (req, res) => {
  try {
    const {
      severity,
      department,
      category,
      area,
      status,
      incidentType,
      search,
      page = 1,
      limit = 20,
      sort = '-riskScore'
    } = req.query;

    const query = {};

    if (severity) query.severity = severity;
    if (department) query.department = department;
    if (category) query.category = category;
    if (area) query.area = new RegExp(area, 'i');
    if (status) query.status = status;
    if (incidentType) query.incidentType = incidentType;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { area: new RegExp(search, 'i') },
        { incidentId: new RegExp(search, 'i') }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [incidents, total] = await Promise.all([
      GovernanceIncident.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      GovernanceIncident.countDocuments(query)
    ]);

    res.json({
      success: true,
      incidents,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   GET /api/governance/incidents/:id
 * @desc    Incident intelligence detail
 */
router.get('/incidents/:id', async (req, res) => {
  try {
    const incident = await GovernanceIncident.findById(req.params.id)
      .populate('sourceReferences.complaintIds', 'complaintId title category department priority status address citizenFeedback')
      .populate('sourceReferences.warningRef')
      .populate('sourceReferences.preventiveActionRef')
      .populate('assignedOfficer', 'name email role')
      .populate('timeline.actor', 'name email');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Governance incident not found' });
    }

    const actionPlans = await GovernanceAction.find({ incidentId: incident._id })
      .populate('assignedWorkers', 'name employeeId status contact')
      .populate('createdBy', 'name');

    // Available workers for assignment
    const availableWorkers = await Worker.find({
      status: 'Available'
    }).select('name employeeId department status contact');

    // Fetch department capacity
    const deptInfo = await Department.findOne({ name: incident.department });

    res.json({
      success: true,
      incident,
      actionPlans,
      availableWorkers,
      departmentStats: deptInfo || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   POST /api/governance/recalculate
 * @desc    Trigger autonomous orchestration across all active datasets
 */
router.post('/recalculate', async (req, res) => {
  try {
    const incidents = await runGovernanceOrchestration();
    res.json({
      success: true,
      message: `Orchestration complete. ${incidents.length} active governance incidents evaluated.`,
      incidentsCount: incidents.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   POST /api/governance/incidents/:id/acknowledge
 * @desc    Officer acknowledges an incident
 */
router.post('/incidents/:id/acknowledge', async (req, res) => {
  try {
    const incident = await GovernanceIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    incident.status = 'Acknowledged';
    incident.acknowledgedAt = new Date();
    incident.assignedOfficer = req.user._id;
    incident.timeline.push({
      eventType: 'Officer Acknowledged',
      message: `Acknowledged by ${req.user.name} (${req.user.email}). Response workflow initiated.`,
      actor: req.user._id,
      timestamp: new Date()
    });

    await incident.save();
    res.json({ success: true, incident });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   POST /api/governance/incidents/:id/action-plan
 * @desc    Create an action plan for an incident
 */
router.post('/incidents/:id/action-plan', async (req, res) => {
  try {
    const {
      title,
      description,
      actionType = 'Inspect',
      priority = 'High',
      requiredWorkers = 1,
      estimatedDuration = '24 Hours'
    } = req.body;

    const incident = await GovernanceIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const action = await GovernanceAction.create({
      incidentId: incident._id,
      actionType,
      title: title || `Action Plan: ${incident.title}`,
      description: description || incident.recommendedAction || 'Execute targeted field intervention.',
      department: incident.department,
      priority,
      requiredWorkers,
      estimatedDuration,
      status: 'Approved',
      relatedComplaintIds: incident.sourceReferences?.complaintIds || [],
      preventiveActionId: incident.sourceReferences?.preventiveActionRef || null,
      createdBy: req.user._id
    });

    incident.status = 'Action Planned';
    incident.timeline.push({
      eventType: 'Action Plan Created',
      message: `Plan "${action.title}" created with priority ${priority} (${requiredWorkers} workers required).`,
      actor: req.user._id,
      timestamp: new Date()
    });

    await incident.save();

    res.json({ success: true, action, incident });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   POST /api/governance/incidents/:id/dispatch
 * @desc    Dispatch workers to execute action plan or preventive action
 */
router.post('/incidents/:id/dispatch', async (req, res) => {
  try {
    const { workerIds = [], actionId, instructions } = req.body;

    const incident = await GovernanceIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    let action = null;
    if (actionId) {
      action = await GovernanceAction.findById(actionId);
    } else {
      action = await GovernanceAction.findOne({ incidentId: incident._id });
    }

    if (action) {
      action.status = 'Dispatched';
      action.assignedWorkers = workerIds;
      await action.save();
    }

    // Update assigned workers to Busy
    if (workerIds.length > 0) {
      await Worker.updateMany(
        { _id: { $in: workerIds } },
        { $set: { status: 'Busy' } }
      );
    }

    // If incident is linked to a PreventiveAction, advance its status to Dispatched
    if (incident.sourceReferences?.preventiveActionRef) {
      await PreventiveAction.findByIdAndUpdate(incident.sourceReferences.preventiveActionRef, {
        status: 'Dispatched',
        plannedAt: new Date()
      });
    }

    incident.status = 'Dispatched';
    incident.timeline.push({
      eventType: 'Field Crew Dispatched',
      message: `${workerIds.length} worker(s) dispatched to execute response: ${instructions || incident.recommendedAction}`,
      actor: req.user._id,
      timestamp: new Date()
    });

    await incident.save();

    res.json({ success: true, incident, action });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   POST /api/governance/incidents/:id/close
 * @desc    Close incident after verification
 */
router.post('/incidents/:id/close', async (req, res) => {
  try {
    const { resolutionNotes } = req.body;

    const incident = await GovernanceIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    incident.status = 'Closed';
    incident.closedAt = new Date();
    incident.resolvedAt = new Date();
    incident.actionTaken = resolutionNotes || 'Action completed and verified by municipal authority.';
    incident.timeline.push({
      eventType: 'Incident Closed',
      message: `Incident resolved and closed. Notes: ${resolutionNotes || 'Operational verification complete.'}`,
      actor: req.user._id,
      timestamp: new Date()
    });

    await incident.save();

    // Mark related actions Completed
    await GovernanceAction.updateMany(
      { incidentId: incident._id },
      { $set: { status: 'Completed', completedAt: new Date() } }
    );

    res.json({ success: true, incident });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   GET /api/governance/action-center
 * @desc    Ranked recommended government actions across all open incidents
 */
router.get('/action-center', async (req, res) => {
  try {
    const incidents = await GovernanceIncident.find({
      status: { $in: ['Detected', 'Acknowledged', 'Action Planned'] }
    })
      .sort({ riskScore: -1, createdAt: -1 })
      .limit(10)
      .lean();

    const rankedActions = incidents.map((inc, index) => ({
      rank: index + 1,
      incidentId: inc._id,
      incidentCode: inc.incidentId,
      title: inc.title,
      type: inc.incidentType,
      severity: inc.severity,
      riskScore: inc.riskScore,
      department: inc.department,
      area: inc.area,
      recommendedAction: inc.recommendedAction,
      responseDeadline: inc.responseDeadline,
      status: inc.status
    }));

    res.json({
      success: true,
      actions: rankedActions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   GET /api/governance/executive-report
 * @desc    Daily Municipal Situation Report
 */
router.get('/executive-report', async (req, res) => {
  try {
    const topRisks = await GovernanceIncident.find({
      status: { $nin: ['Closed', 'Resolved'] }
    }).sort({ riskScore: -1 }).limit(5).lean();

    const criticalCount = await GovernanceIncident.countDocuments({
      status: { $nin: ['Closed', 'Resolved'] },
      severity: 'CRITICAL'
    });

    const depts = await Department.find().lean();
    const activeComplaints = await Complaint.countDocuments({
      status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress', 'Reopened'] }
    });
    const resolvedCount = await Complaint.countDocuments({ status: 'Resolved' });
    const totalWorkers = await Worker.countDocuments();
    const availableWorkers = await Worker.countDocuments({ status: 'Available' });

    res.json({
      success: true,
      report: {
        date: new Date().toISOString().slice(0, 10),
        situationSummary: criticalCount > 0
          ? `${criticalCount} Critical governance incidents requiring immediate command intervention across ${topRisks.map(r => r.area).join(', ')}.`
          : 'Civic operations are stable with standard preventive maintenance ongoing.',
        criticalIncidentsCount: criticalCount,
        activeComplaintsCount: activeComplaints,
        resolvedComplaintsCount: resolvedCount,
        topRisks,
        workerCapacity: `${availableWorkers} of ${totalWorkers} workers available`,
        recommendations: [
          'Prioritize emergency cluster mitigation in identified high-risk zones.',
          'Reallocate field technicians to departments with active SLA compliance strain.',
          'Execute scheduled preventive maintenance actions to avoid recurring infrastructure failures.'
        ]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
