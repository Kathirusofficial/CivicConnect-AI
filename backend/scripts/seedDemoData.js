/**
 * CivicConnect AI — Realistic Demo Data Seeder
 * Populates MongoDB with authentic civic records across all operational phases:
 * - Departments & Field Workers
 * - Citizens & Government Officers
 * - Complaints across all lifecycle states (Pending, Verified, Assigned, In Progress, Resolved, Reopened)
 * - Duplicate clusters, Emergency issues, SLA breached & at-risk records
 * - Before/After work evidence & citizen ratings
 * - Preventive maintenance actions, Early warnings, and Governance Command Center incidents
 *
 * Usage: node scripts/seedDemoData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Department = require('../models/Department');
const Worker = require('../models/Worker');
const Complaint = require('../models/Complaint');
const CivicRisk = require('../models/CivicRisk');
const PreventiveAction = require('../models/PreventiveAction');
const EarlyWarning = require('../models/EarlyWarning');
const GovernanceIncident = require('../models/GovernanceIncident');
const GovernanceAction = require('../models/GovernanceAction');
const Notification = require('../models/Notification');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicconnect';

async function seed() {
  console.log('🌱 Starting CivicConnect AI Demo Data Seeder...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  // 1. Clear Demo Data Safely
  console.log('🧹 Cleaning previous demo records...');
  await User.deleteMany({ email: { $regex: /@(civicconnect\.com|civicconnect\.gov|demo\.civicconnect)$/ } });
  await Department.deleteMany({});
  await Worker.deleteMany({});
  await Complaint.deleteMany({});
  await CivicRisk.deleteMany({});
  await PreventiveAction.deleteMany({});
  await EarlyWarning.deleteMany({});
  await GovernanceIncident.deleteMany({});
  await GovernanceAction.deleteMany({});
  await Notification.deleteMany({});

  const defaultPassword = 'DemoPass123!';

  // 2. Create Departments
  console.log('🏢 Seeding Municipal Departments...');
  const deptData = [
    { name: 'Road Department', head: 'John Mercer', contactEmail: 'roads@civicconnect.gov', description: 'Potholes, resurfacing, bridges, pedestrian paths' },
    { name: 'Water Supply', head: 'Robert Vance', contactEmail: 'water@civicconnect.gov', description: 'Pipeline bursts, contamination, supply pressure' },
    { name: 'Electricity', head: 'Sarah Jenkins', contactEmail: 'power@civicconnect.gov', description: 'Power outages, transformer sparks, open wires' },
    { name: 'Garbage Collection', head: 'Gary Rubbish', contactEmail: 'sanitation@civicconnect.gov', description: 'Solid waste management, overflow bins, public dumping' },
    { name: 'Traffic Management', head: 'Elena Rostova', contactEmail: 'traffic@civicconnect.gov', description: 'Signals, signs, road markings, congestion nodes' },
    { name: 'Drainage', head: 'David Sewer', contactEmail: 'drainage@civicconnect.gov', description: 'Stormwater drains, sewage blockages, flood relief' },
    { name: 'Street Lights', head: 'Thomas Edison', contactEmail: 'lights@civicconnect.gov', description: 'Luminaire repair, feeder lines, timer automation' },
    { name: 'Municipality', head: 'Mayor Higgins', contactEmail: 'municipality@civicconnect.gov', description: 'General civic governance and public permits' }
  ];
  const departments = await Department.insertMany(deptData);
  const deptMap = {};
  departments.forEach(d => { deptMap[d.name] = d; });

  // 3. Create Users
  console.log('👥 Seeding Users (Admin, Citizens, Workers)...');
  const adminUser = await User.create({
    name: 'Chief Municipal Officer',
    email: 'admin@civicconnect.com',
    password: defaultPassword,
    role: 'Admin',
    phone: '+1 555-0100'
  });

  const govUser = await User.create({
    name: 'Deputy Commissioner Rao',
    email: 'gov.officer@civicconnect.gov',
    password: defaultPassword,
    role: 'Government',
    phone: '+1 555-0101'
  });

  const citizenA = await User.create({
    name: 'Alexandra Chen',
    email: 'demo.citizen@civicconnect.com',
    password: defaultPassword,
    role: 'Citizen',
    phone: '+91 98765 43210',
    mobile: '+91 98765 43210',
    state: 'Tamil Nadu',
    city: 'Coimbatore',
    address: '14 Cross Cut Road, Gandhipuram',
    pinCode: '641012'
  });

  const citizenB = await User.create({
    name: 'Marcus Brody',
    email: 'marcus.brody@civicconnect.com',
    password: defaultPassword,
    role: 'Citizen',
    phone: '+91 98765 43211',
    mobile: '+91 98765 43211',
    state: 'Karnataka',
    city: 'Bengaluru',
    address: '88 Indiranagar 100ft Road',
    pinCode: '560038'
  });

  const citizenC = await User.create({
    name: 'Priya Patel',
    email: 'priya.patel@civicconnect.com',
    password: defaultPassword,
    role: 'Citizen',
    phone: '+91 98765 43212',
    mobile: '+91 98765 43212',
    state: 'Maharashtra',
    city: 'Mumbai',
    address: '22 Marine Lines',
    pinCode: '400020'
  });

  // 4. Create Field Workers
  console.log('👷 Seeding Field Workers...');
  const workerData = [
    { name: 'Will Smith', email: 'will.smith@civicconnect.com', password: defaultPassword, employeeId: 'WRK-ROAD-01', department: deptMap['Road Department']._id, status: 'Available', contact: '+1 555-1001', completedComplaints: 14, activeTasks: 0 },
    { name: 'John Doe', email: 'john.doe@civicconnect.com', password: defaultPassword, employeeId: 'WRK-ROAD-02', department: deptMap['Road Department']._id, status: 'Busy', contact: '+1 555-1002', completedComplaints: 9, activeTasks: 1 },
    { name: 'Alice Johnson', email: 'alice.johnson@civicconnect.com', password: defaultPassword, employeeId: 'WRK-WATER-01', department: deptMap['Water Supply']._id, status: 'Busy', contact: '+1 555-2001', completedComplaints: 22, activeTasks: 2 },
    { name: 'Bob Myers', email: 'bob.myers@civicconnect.com', password: defaultPassword, employeeId: 'WRK-WATER-02', department: deptMap['Water Supply']._id, status: 'Available', contact: '+1 555-2002', completedComplaints: 11, activeTasks: 0 },
    { name: 'Charlie Green', email: 'charlie.green@civicconnect.com', password: defaultPassword, employeeId: 'WRK-ELEC-01', department: deptMap['Electricity']._id, status: 'Busy', contact: '+1 555-3001', completedComplaints: 18, activeTasks: 1 },
    { name: 'Diana Ross', email: 'diana.ross@civicconnect.com', password: defaultPassword, employeeId: 'WRK-ELEC-02', department: deptMap['Electricity']._id, status: 'Available', contact: '+1 555-3002', completedComplaints: 15, activeTasks: 0 },
    { name: 'Edward Norton', email: 'edward.norton@civicconnect.com', password: defaultPassword, employeeId: 'WRK-GARB-01', department: deptMap['Garbage Collection']._id, status: 'Available', contact: '+1 555-4001', completedComplaints: 30, activeTasks: 0 },
    { name: 'Frank Grillo', email: 'frank.grillo@civicconnect.com', password: defaultPassword, employeeId: 'WRK-TRAF-01', department: deptMap['Traffic Management']._id, status: 'Available', contact: '+1 555-5001', completedComplaints: 12, activeTasks: 0 }
  ];
  const workers = [];
  for (const wd of workerData) {
    const w = await Worker.create(wd);
    workers.push(w);
  }
  const workerMap = {};
  workers.forEach(w => { workerMap[w.employeeId] = w; });

  // Create Worker user logins
  for (const w of workers) {
    await User.create({
      name: w.name,
      email: `${w.name.toLowerCase().replace(' ', '.')}@civicconnect.com`,
      password: defaultPassword,
      role: 'Worker',
      workerId: w._id,
      phone: w.contact
    });
  }

  // 5. Create Authentic Complaints Across Lifecycle
  console.log('📋 Seeding Realistic Complaints & Lifecycles...');
  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000);
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 3600 * 1000);

  // A. Emergency & Critical Open Complaints
  const c1 = await Complaint.create({
    complaintId: 'CMP-2026-900001',
    citizen: citizenA._id,
    title: 'Severe Water Main Rupture Flooding Sector 9 Junction',
    description: 'High pressure drinking water pipe has burst underground. Water is gushing onto the carriageway creating a 2-foot flood hazard and road subsidence risk.',
    category: 'Water Supply',
    department: 'Water Supply',
    assignedDepartment: deptMap['Water Supply']._id,
    priority: 'Emergency',
    severity: 'High',
    status: 'In Progress',
    assignedWorker: workerMap['WRK-WATER-01']._id,
    workerStatus: 'In Progress',
    address: 'Sector 9 Waterway Junction, Main Arterial Road',
    latitude: 11.0168,
    longitude: 76.9558,
    isDemo: true,
    createdAt: hoursAgo(3),
    workEvidence: {
      before: {
        images: ['https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800'],
        notes: 'Arrived at site with hydraulic pressure crew. High volume leak confirmed.',
        capturedAt: hoursAgo(2)
      }
    },
    decisionSupport: {
      priorityScore: 96,
      priorityLevel: 'Critical',
      citizenImpactCount: 8,
      recommendedDepartment: 'Water Supply',
      confidenceScore: 0.94,
      aiSummary: 'Emergency water main rupture causing acute road flooding and traffic blockage.',
      calculatedAt: hoursAgo(3)
    },
    sla: {
      targetHours: 4,
      deadline: new Date(now.getTime() + 1 * 3600 * 1000),
      isBreached: false,
      status: 'At Risk'
    },
    timeline: [
      { status: 'Pending', message: 'Complaint registered by citizen Alexandra Chen.', timestamp: hoursAgo(3), actor: citizenA.name },
      { status: 'Verified', message: 'Verified by Municipal Support as Critical Emergency.', timestamp: hoursAgo(2.8), actor: adminUser.name },
      { status: 'Assigned', message: 'Assigned to field technician Alice Johnson.', timestamp: hoursAgo(2.5), actor: adminUser.name },
      { status: 'In Progress', message: 'Field work commenced. Before inspection evidence logged.', timestamp: hoursAgo(2), actor: 'Alice Johnson' }
    ]
  });

  // Duplicate companion complaint for c1
  const c1_dup = await Complaint.create({
    complaintId: 'CMP-2026-900002',
    citizen: citizenB._id,
    title: 'Huge water leakage and puddle on Sector 9 main road',
    description: 'Road is completely flooded near Sector 9 junction due to broken pipeline.',
    category: 'Water Supply',
    department: 'Water Supply',
    assignedDepartment: deptMap['Water Supply']._id,
    priority: 'Emergency',
    status: 'In Progress',
    duplicateOf: c1._id,
    duplicateGroupId: 'DUP-SECT9-WATER',
    address: 'Sector 9 Waterway Junction',
    latitude: 11.0169,
    longitude: 76.9559,
    isDemo: true,
    createdAt: hoursAgo(2.5),
    decisionSupport: {
      priorityScore: 92,
      priorityLevel: 'Critical',
      citizenImpactCount: 8,
      calculatedAt: hoursAgo(2.5)
    }
  });

  // B. SLA Breached Complaint (Electricity)
  const c2 = await Complaint.create({
    complaintId: 'CMP-2026-900003',
    citizen: citizenC._id,
    title: 'Low Hanging Sparking Power Cable Near School Gate',
    description: 'Overhead transformer line got detached in storm winds and is hanging 5 feet above the ground sparking intermittently near Central Academy.',
    category: 'Electricity',
    department: 'Electricity',
    assignedDepartment: deptMap['Electricity']._id,
    priority: 'Emergency',
    status: 'Assigned',
    assignedWorker: workerMap['WRK-ELEC-01']._id,
    workerStatus: 'Assigned',
    address: '15 High Volt Street, Central Zone',
    latitude: 11.0100,
    longitude: 76.9500,
    isDemo: true,
    createdAt: hoursAgo(10),
    decisionSupport: {
      priorityScore: 98,
      priorityLevel: 'Critical',
      citizenImpactCount: 15,
      calculatedAt: hoursAgo(10)
    },
    sla: {
      targetHours: 4,
      deadline: hoursAgo(6),
      isBreached: true,
      breachedAt: hoursAgo(6),
      status: 'Breached'
    },
    timeline: [
      { status: 'Pending', message: 'Reported by Priya Patel.', timestamp: hoursAgo(10), actor: citizenC.name },
      { status: 'Verified', message: 'Verified as Critical Hazard.', timestamp: hoursAgo(9), actor: adminUser.name },
      { status: 'Assigned', message: 'Assigned to Charlie Green.', timestamp: hoursAgo(8), actor: adminUser.name }
    ]
  });

  // C. Resolved Complaint with Full Evidence, Approvals, Feedback & SLA
  const c3 = await Complaint.create({
    complaintId: 'CMP-2026-900004',
    citizen: citizenA._id,
    title: 'Hazardous Open Trench & Pothole Repaired on 4th Cross',
    description: 'Deep road cavity on 4th Cross repaired with rapid cold-mix asphalt.',
    category: 'Road Damage',
    department: 'Road Department',
    assignedDepartment: deptMap['Road Department']._id,
    priority: 'High',
    status: 'Resolved',
    assignedWorker: workerMap['WRK-ROAD-01']._id,
    workerStatus: 'Approved',
    address: '4th Cross, Gandhi Nagar',
    latitude: 11.0180,
    longitude: 76.9520,
    isDemo: true,
    createdAt: daysAgo(3),
    workEvidence: {
      before: {
        images: ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800'],
        notes: 'Pothole measured 1.2m wide, 15cm deep.',
        capturedAt: daysAgo(2.5)
      },
      after: {
        images: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800'],
        notes: 'Excavated edge, filled with bitumen grade 60/70, leveled and roller compacted.',
        capturedAt: daysAgo(1.5)
      },
      submittedAt: daysAgo(1.5),
      approvedAt: daysAgo(1),
      verifiedBy: adminUser._id
    },
    decisionSupport: {
      priorityScore: 78,
      priorityLevel: 'High',
      calculatedAt: daysAgo(3)
    },
    sla: {
      targetHours: 24,
      deadline: daysAgo(2),
      completedAt: daysAgo(1.5),
      isBreached: false,
      status: 'Completed'
    },
    citizenFeedback: {
      rating: 5,
      resolvedByCitizen: true,
      comment: 'Super fast turnaround! The road surface is completely smooth now.',
      submittedAt: daysAgo(0.8)
    },
    resolutionQuality: {
      score: 95,
      level: 'Excellent',
      evidenceQuality: 95,
      timelinessScore: 92,
      citizenRatingScore: 100,
      repeatPenalty: 0,
      summary: 'Prompt repair completed within SLA with verified before/after photographic proof.',
      calculatedAt: daysAgo(1)
    },
    timeline: [
      { status: 'Pending', message: 'Registered by Alexandra Chen.', timestamp: daysAgo(3), actor: citizenA.name },
      { status: 'Verified', message: 'Verified by Operations.', timestamp: daysAgo(2.8), actor: adminUser.name },
      { status: 'Assigned', message: 'Assigned to Will Smith.', timestamp: daysAgo(2.6), actor: adminUser.name },
      { status: 'In Progress', message: 'Worker on site.', timestamp: daysAgo(2.5), actor: 'Will Smith' },
      { status: 'Resolution Submitted', message: 'Resolution evidence uploaded.', timestamp: daysAgo(1.5), actor: 'Will Smith' },
      { status: 'Resolved', message: 'Government verified and approved.', timestamp: daysAgo(1), actor: adminUser.name }
    ]
  });

  // D. Reopened Complaint due to Incomplete Work
  const c4 = await Complaint.create({
    complaintId: 'CMP-2026-900005',
    citizen: citizenB._id,
    title: 'Recurring Sewage Drain Overflow on Market Road',
    description: 'Blocked drain backing up foul wastewater into storefronts.',
    category: 'Drainage',
    department: 'Drainage',
    assignedDepartment: deptMap['Drainage']._id,
    priority: 'High',
    status: 'Reopened',
    assignedWorker: workerMap['WRK-GARB-01']._id,
    address: 'Market Road Commercial Area',
    latitude: 11.0250,
    longitude: 76.9650,
    isDemo: true,
    reopenCount: 2,
    createdAt: daysAgo(5),
    decisionSupport: {
      priorityScore: 84,
      priorityLevel: 'High',
      calculatedAt: daysAgo(5)
    },
    sla: {
      targetHours: 24,
      deadline: daysAgo(4),
      isBreached: true,
      status: 'Breached'
    },
    citizenFeedback: {
      rating: 1,
      resolvedByCitizen: false,
      comment: 'The team only cleaned the surface grate. The main underground channel is still jammed with debris!',
      submittedAt: daysAgo(2)
    },
    timeline: [
      { status: 'Pending', message: 'Filed by Marcus Brody.', timestamp: daysAgo(5), actor: citizenB.name },
      { status: 'Assigned', message: 'Assigned to sanitation crew.', timestamp: daysAgo(4.5), actor: adminUser.name },
      { status: 'Resolved', message: 'Marked clean by crew.', timestamp: daysAgo(3), actor: adminUser.name },
      { status: 'Reopened', message: 'Citizen gave 1-star feedback: blockage recurred next morning.', timestamp: daysAgo(2), actor: citizenB.name }
    ]
  });

  // 6. Seed Preventive Actions & Early Warnings
  console.log('🔮 Seeding Preventive Actions & Early Warnings...');
  const prev1 = await PreventiveAction.create({
    title: 'Acoustic Leak Detection & Pressure Relief Valve Replacement',
    category: 'Water Supply',
    department: 'Water Supply',
    area: 'Sector 9 Waterway Junction',
    riskScore: 92,
    recommendedAction: 'High velocity pipeline inspection and valve overhaul across Sector 9 corridor to prevent catastrophic bursts.',
    priority: 'Critical',
    urgency: 'Critical',
    estimatedImpact: 'Prevents major supply disruptions for ~8,000 residents',
    status: 'Dispatched',
    plannedAt: hoursAgo(2),
    dispatchedAt: hoursAgo(1)
  });

  const prev2 = await PreventiveAction.create({
    title: 'Milling & Thermoplastic Resurfacing Preventive Drive',
    category: 'Road Damage',
    department: 'Road Department',
    area: 'Market Road Commercial Area',
    riskScore: 78,
    recommendedAction: 'Pre-monsoon sub-base stabilization and heavy load lane resurfacing.',
    priority: 'High',
    urgency: 'High',
    estimatedImpact: 'Eliminates structural deterioration along arterial commute artery',
    status: 'Planned',
    plannedAt: hoursAgo(4)
  });

  await EarlyWarning.create({
    title: 'Water Supply Surge & Infrastructure Strain Alert',
    message: 'Complaint volume surged +150% in Sector 9 within 24 hours. Multiple high-pressure leaks detected.',
    category: 'Water Supply',
    department: 'Water Supply',
    area: 'Sector 9 Waterway Junction',
    level: 'CRITICAL',
    metric: '+150% 24h Volume Surge',
    threshold: '50% Surge Limit',
    dedupKey: 'Water Supply_Sector 9 Waterway Junction_Surge',
    status: 'Active'
  });

  await EarlyWarning.create({
    title: 'SLA Crisis: Transformer Feeder Overhead Risk',
    message: 'Multiple active power line hazard complaints exceeding standard emergency SLA turnaround.',
    category: 'Electricity',
    department: 'Electricity',
    area: '15 High Volt Street',
    level: 'WARNING',
    metric: '4-Hour SLA Exceeded',
    threshold: 'Zero Emergency Breaches',
    dedupKey: 'Electricity_15 High Volt Street_SLA',
    status: 'Active'
  });

  // 7. Seed Governance Command Center Incidents
  console.log('🚨 Seeding Governance Command Center Incidents...');
  const inc1 = await GovernanceIncident.create({
    incidentId: 'INC-2026-001001',
    title: 'Critical Emergency Cluster: Water Main Rupture & Road Subsidence',
    description: 'High-severity pipeline rupture in Sector 9 causing traffic disruption and infrastructure erosion.',
    incidentType: 'Emergency Cluster',
    category: 'Water Supply',
    department: 'Water Supply',
    area: 'Sector 9 Waterway Junction',
    latitude: 11.0168,
    longitude: 76.9558,
    severity: 'CRITICAL',
    riskScore: 98,
    status: 'Dispatched',
    assignedDepartment: 'Water Supply',
    assignedOfficer: govUser._id,
    sourceReferences: {
      complaintIds: [c1._id, c1_dup._id],
      preventiveActionRef: prev1._id
    },
    contributingFactors: {
      complaintSurge: 25,
      severity: 30,
      slaBreach: 15,
      citizenDissatisfaction: 10,
      departmentOverload: 18
    },
    recommendedAction: 'Deploy emergency containment crew and initiate acoustic pipe scan.',
    dedupKey: 'Emergency Cluster_Water Supply_Water Supply_sector_9_waterway_junction',
    timeline: [
      { eventType: 'Detection', message: 'Incident autonomously identified by Civic Response Engine.', actor: adminUser._id, timestamp: hoursAgo(2) },
      { eventType: 'Acknowledgement', message: 'Acknowledged by Deputy Commissioner Rao.', actor: govUser._id, timestamp: hoursAgo(1.5) },
      { eventType: 'Dispatch', message: 'Crew dispatched for urgent onsite repair.', actor: adminUser._id, timestamp: hoursAgo(1) }
    ]
  });

  await GovernanceAction.create({
    incidentId: inc1._id,
    actionType: 'Deploy Workers',
    title: 'Emergency Trench Containment & Valve Isolation',
    description: 'Shut down isolating valves and excavate repair zone.',
    department: 'Water Supply',
    priority: 'Emergency',
    requiredWorkers: 3,
    assignedWorkers: [workerMap['WRK-WATER-01']._id, workerMap['WRK-WATER-02']._id],
    preventiveActionId: prev1._id,
    relatedComplaintIds: [c1._id, c1_dup._id],
    estimatedDuration: '4 hours',
    status: 'In Progress',
    createdBy: adminUser._id
  });

  const inc2 = await GovernanceIncident.create({
    incidentId: 'INC-2026-001002',
    title: 'SLA Breach Crisis: High Voltage Overhead Cable Hazard',
    description: 'Active power line hazard complaint breached emergency 4-hour SLA window.',
    incidentType: 'SLA Crisis',
    category: 'Electricity',
    department: 'Electricity',
    area: '15 High Volt Street',
    latitude: 11.0100,
    longitude: 76.9500,
    severity: 'WARNING',
    riskScore: 84,
    status: 'Action Planned',
    assignedDepartment: 'Electricity',
    assignedOfficer: adminUser._id,
    sourceReferences: {
      complaintIds: [c2._id]
    },
    contributingFactors: {
      complaintSurge: 10,
      severity: 30,
      slaBreach: 30,
      citizenDissatisfaction: 5,
      departmentOverload: 9
    },
    recommendedAction: 'Reassign available power technician and escalate to Assistant Executive Engineer.',
    dedupKey: 'SLA Crisis_Electricity_Electricity_15_high_volt_street',
    timeline: [
      { eventType: 'Detection', message: 'SLA breach detected by Automated Monitoring.', actor: adminUser._id, timestamp: hoursAgo(5) },
      { eventType: 'Action Planned', message: 'Emergency escalation ticket logged.', actor: adminUser._id, timestamp: hoursAgo(4) }
    ]
  });

  // 8. Seed Notifications
  console.log('🔔 Seeding System Notifications...');
  await Notification.create([
    {
      user: adminUser._id,
      message: '🚨 CRITICAL: Emergency Cluster detected in Sector 9 Waterway Junction.',
      link: `/government/incidents/${inc1._id}`,
      read: false,
      createdAt: hoursAgo(2)
    },
    {
      user: adminUser._id,
      message: '⚠️ WARNING: SLA breached for High Voltage Power Line on 15 High Volt Street.',
      link: `/government/incidents/${inc2._id}`,
      read: false,
      createdAt: hoursAgo(5)
    },
    {
      user: citizenA._id,
      message: 'Your complaint CMP-2026-900004 has been verified and resolved by the Road Department.',
      link: `/citizen/complaint/${c3._id}`,
      read: true,
      createdAt: daysAgo(1)
    }
  ]);

  console.log('====================================================');
  console.log('🎉 CIVICCONNECT AI DEMO SEED COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  console.log('👤 Admin Login:     admin@civicconnect.com      / DemoPass123!');
  console.log('🏛️ Gov Officer:     gov.officer@civicconnect.gov / DemoPass123!');
  console.log('👤 Citizen Login:   demo.citizen@civicconnect.com / DemoPass123!');
  console.log('👷 Worker Login:    will.smith@civicconnect.com   / DemoPass123!');
  console.log('====================================================');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

seed().catch(err => {
  console.error('❌ Demo seed failed:', err);
  process.exit(1);
});
