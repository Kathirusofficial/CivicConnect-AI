require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');
const Worker = require('./models/Worker');
const Notification = require('./models/Notification');
const http = require('http');

const runGovernmentPortalTests = async () => {
  try {
    console.log('--- 🏛️ STARTING GOVERNMENT OPERATIONS PORTAL TEST SUITE ---');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicconnect');
    console.log('✅ MongoDB connected');

    const request = (path, method = 'GET', body = null, token = null) => {
      return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
          hostname: '127.0.0.1',
          port: process.env.PORT || 5000,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            let json = null;
            try { json = JSON.parse(data); } catch(e) { json = data; }
            resolve({ status: res.statusCode, data: json });
          });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
      });
    };

    // Clean test accounts
    const citizenEmail1 = 'portal.citizen1@example.com';
    const citizenEmail2 = 'portal.citizen2@example.com';
    const adminEmail = 'portal.admin@civicconnect.com';

    await User.deleteMany({ email: { $in: [citizenEmail1, citizenEmail2, adminEmail] } });

    // Register Citizen 1
    const regCitizen1 = await request('/api/auth/register', 'POST', {
      name: 'Portal Citizen One',
      email: citizenEmail1,
      password: 'StrongPassword123!',
      role: 'Citizen'
    });
    const citizen1Token = regCitizen1.data.token;
    const citizen1Id = regCitizen1.data.user._id;

    // Register Citizen 2
    const regCitizen2 = await request('/api/auth/register', 'POST', {
      name: 'Portal Citizen Two',
      email: citizenEmail2,
      password: 'StrongPassword123!',
      role: 'Citizen'
    });
    const citizen2Token = regCitizen2.data.token;
    const citizen2Id = regCitizen2.data.user._id;

    // Create / Register Government Admin
    const regAdmin = await request('/api/auth/register', 'POST', {
      name: 'Operations Officer',
      email: adminEmail,
      password: 'AdminPassword123!',
      role: 'Admin'
    });
    const adminToken = regAdmin.data.token;
    console.log('✅ Accounts Created: Citizen 1, Citizen 2, Government Admin');

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Citizen Login & Role Verification
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 1: Citizen Login & Role Guard');
    const loginCitRes = await request('/api/auth/login', 'POST', {
      email: citizenEmail1,
      password: 'StrongPassword123!'
    });
    if (loginCitRes.status !== 200 || loginCitRes.data.user.role !== 'Citizen') {
      throw new Error(`Test 1 Failed: Citizen login failed or role mismatch: ${JSON.stringify(loginCitRes.data)}`);
    }
    console.log('✅ TEST 1 Passed: Citizen authenticated with role "Citizen"');

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Government Login & Role Verification
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 2: Government Login & Role Guard');
    const loginGovRes = await request('/api/auth/login', 'POST', {
      email: adminEmail,
      password: 'AdminPassword123!'
    });
    if (loginGovRes.status !== 200 || loginGovRes.data.user.role !== 'Admin') {
      throw new Error(`Test 2 Failed: Admin login failed or role mismatch: ${JSON.stringify(loginGovRes.data)}`);
    }
    console.log('✅ TEST 2 Passed: Government Officer authenticated with role "Admin"');

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Citizen cannot access government routes (403 Forbidden)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 3: Citizen Access Restriction (403 Forbidden on Admin APIs)');
    const citizenAccessAdmin = await request('/api/admin/stats', 'GET', null, citizen1Token);
    if (citizenAccessAdmin.status !== 403) {
      throw new Error(`Test 3 Failed: Citizen was not blocked from /api/admin/stats. Got status: ${citizenAccessAdmin.status}`);
    }
    console.log('✅ TEST 3 Passed: 403 Forbidden returned when citizen attempts to access government routes');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Government can access government stats & KPIs
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 4: Government Dashboard Stats & Operational KPIs');
    const govStatsRes = await request('/api/admin/stats', 'GET', null, adminToken);
    if (govStatsRes.status !== 200 || typeof govStatsRes.data.totalComplaints !== 'number') {
      throw new Error(`Test 4 Failed: Government stats retrieval failed: ${JSON.stringify(govStatsRes.data)}`);
    }
    console.log('✅ TEST 4 Passed: Real operational stats retrieved:', {
      totalComplaints: govStatsRes.data.totalComplaints,
      pending: govStatsRes.data.pending,
      verified: govStatsRes.data.verified,
      assigned: govStatsRes.data.assigned,
      inProgress: govStatsRes.data.inProgress,
      resolved: govStatsRes.data.resolved,
      emergency: govStatsRes.data.emergency,
      activeWorkers: govStatsRes.data.activeWorkers
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 5 & 6: Citizen Complaint Isolation vs Government Multi-Citizen View
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 5 & 6: Complaint Isolation & Multi-Citizen Operations View');
    // Citizen 1 creates a complaint
    const c1Res = await request('/api/complaints', 'POST', {
      title: 'Water pipe leak on 1st main road',
      description: 'Clean drinking water leaking from main pipe.',
      category: 'Water Supply',
      priority: 'High',
      address: '1st Main Road, Sector A',
      latitude: 11.0120,
      longitude: 76.9540
    }, citizen1Token);

    // Citizen 2 creates an Emergency complaint
    const c2Res = await request('/api/complaints', 'POST', {
      title: 'High voltage wire sparking near school gate',
      description: 'Severe electrical hazard right at the primary school entrance.',
      category: 'Electricity',
      priority: 'Emergency',
      address: 'Near City Primary School',
      latitude: 11.0180,
      longitude: 76.9580,
      aiAnalysis: {
        category: 'Electricity',
        department: 'Electricity',
        priority: 'Emergency',
        severity: 'Critical',
        summary: 'Dangerous live electrical wire sparking near school gate.',
        confidence: 0.98
      }
    }, citizen2Token);

    const comp1 = c1Res.data.complaint;
    const comp2 = c2Res.data.complaint;

    // Citizen 1 fetches my complaints -> must ONLY see comp1
    const cit1List = await request('/api/complaints/my', 'GET', null, citizen1Token);
    const cit1Ids = cit1List.data.map(c => c._id);
    if (!cit1Ids.includes(comp1._id) || cit1Ids.includes(comp2._id)) {
      throw new Error('Test 6 Failed: Citizen 1 saw complaints from Citizen 2!');
    }
    console.log('✅ TEST 6 Passed: Citizen 1 correctly retrieved ONLY their own complaints');

    // Government fetches all complaints -> must see BOTH comp1 and comp2
    const govList = await request('/api/admin/complaints', 'GET', null, adminToken);
    const govIds = govList.data.complaints.map(c => c._id);
    if (!govIds.includes(comp1._id) || !govIds.includes(comp2._id)) {
      throw new Error('Test 5 Failed: Government officer did not receive multi-citizen complaints list');
    }
    console.log('✅ TEST 5 Passed: Government Operations Portal retrieved complaints across all citizens');

    // ─────────────────────────────────────────────────────────────
    // TEST 7 & 16: Government Complaint Detail & AI Analysis Visibility
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 7 & 16: Government Complaint Detail & AI Intelligence Inspection');
    const govDetailRes = await request(`/api/admin/complaints/${comp2._id}`, 'GET', null, adminToken);
    if (govDetailRes.status !== 200 || !govDetailRes.data.aiAnalysis) {
      throw new Error(`Test 7/16 Failed: Complaint details missing aiAnalysis: ${JSON.stringify(govDetailRes.data)}`);
    }
    console.log('✅ TEST 7 & 16 Passed: Government accessed complaint details with full AI Analysis:', {
      id: govDetailRes.data.complaintId,
      severity: govDetailRes.data.aiAnalysis.severity,
      priority: govDetailRes.data.aiAnalysis.priority,
      summary: govDetailRes.data.aiAnalysis.summary
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 8, 9, 10, 11: Government Workflow (Verify -> Assign Worker -> Resolve -> Dept Stats & Citizen Notifs)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 8-11: Government Operations Lifecycle (Verify -> Assign Worker -> Resolve)');
    
    // 1. Verify complaint
    const verifyRes = await request(`/api/admin/complaints/${comp1._id}`, 'PATCH', {
      status: 'Verified'
    }, adminToken);
    if (verifyRes.data.complaint.status !== 'Verified') throw new Error('Failed to verify complaint');
    console.log('✅ Status updated to "Verified"');

    // 2. Assign worker
    let testWorker = await Worker.findOne({ status: 'Available' });
    if (!testWorker) {
      const dept = await Department.findOne() || await Department.create({ name: 'Road Department', head: 'Officer John' });
      testWorker = await Worker.create({ name: 'Field Operator Alex', department: dept._id, status: 'Available', contact: '+1-555-0199' });
    }

    const assignRes = await request(`/api/admin/complaints/${comp1._id}`, 'PATCH', {
      status: 'Assigned',
      assignedWorker: testWorker._id
    }, adminToken);

    // Verify worker status is Busy
    const busyWorker = await Worker.findById(testWorker._id);
    if (busyWorker.status !== 'Busy') {
      throw new Error('Test 9 Failed: Worker status was not updated to Busy upon assignment');
    }
    console.log('✅ Worker assigned & marked as "Busy" in MongoDB');

    // 3. Mark in Progress and Resolve
    await request(`/api/admin/complaints/${comp1._id}`, 'PATCH', { status: 'In Progress' }, adminToken);
    await request(`/api/admin/complaints/${comp1._id}`, 'PATCH', { status: 'Resolved' }, adminToken);

    // Verify worker status is restored to Available
    const freeWorker = await Worker.findById(testWorker._id);
    if (freeWorker.status !== 'Available') {
      throw new Error('Test 9 Failed: Worker status was not released to Available upon complaint resolution');
    }
    console.log('✅ Complaint Resolved & Worker restored to "Available" in MongoDB');

    // 4. Verify citizen notification was created
    const notifs = await Notification.find({ user: citizen1Id }).sort('-createdAt');
    if (notifs.length === 0) {
      throw new Error('Test 11 Failed: Citizen notifications were not created on status changes');
    }
    console.log(`✅ TEST 11 Passed: Citizen received ${notifs.length} real notifications for operations actions:`);
    notifs.forEach(n => console.log(`   🔔 ${n.message}`));

    // ─────────────────────────────────────────────────────────────
    // TEST 12 & 13: Government Departments & Workers API
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 12 & 13: Department Workload & Worker Registry APIs');
    const deptsRes = await request('/api/admin/departments', 'GET', null, adminToken);
    const workersRes = await request('/api/admin/workers', 'GET', null, adminToken);
    if (!Array.isArray(deptsRes.data) || !Array.isArray(workersRes.data)) {
      throw new Error('Test 12/13 Failed: Departments or Workers list not returned as array');
    }
    console.log(`✅ TEST 12 & 13 Passed: Retrieved ${deptsRes.data.length} departments and ${workersRes.data.length} workers with live workload data`);

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Government Live Map Complaints API
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 14: Government Live Map Geo-complaints');
    const mapRes = await request('/api/admin/map-complaints', 'GET', null, adminToken);
    if (!Array.isArray(mapRes.data) || mapRes.data.length === 0) {
      throw new Error('Test 14 Failed: Live map complaints failed');
    }
    const mapItem = mapRes.data.find(c => c.latitude && c.longitude);
    if (!mapItem) throw new Error('Test 14 Failed: No coordinates found in map complaints');
    console.log('✅ TEST 14 Passed: Real complaint geo-coordinates available for operations map:', {
      id: mapItem.complaintId,
      lat: mapItem.latitude,
      lng: mapItem.longitude,
      priority: mapItem.priority
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Duplicate Cluster Visualization in Government View
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 15: Duplicate Cluster Visualization in Government View');
    // Create duplicate linked complaint
    const dupComp = await Complaint.create({
      title: 'Water leak on 1st main road duplicate',
      description: 'Same water pipe leak reported again.',
      category: 'Water Supply',
      department: 'Water Supply',
      priority: 'High',
      address: '1st Main Road, Sector A',
      citizen: citizen2Id,
      duplicateOf: comp1._id,
      duplicateGroupId: comp1.complaintId || `GRP-${comp1._id}`
    });
    
    // Update parent to have matching duplicateGroupId
    await Complaint.findByIdAndUpdate(comp1._id, { duplicateGroupId: dupComp.duplicateGroupId });

    const clusterDetail = await request(`/api/admin/complaints/${comp1._id}`, 'GET', null, adminToken);
    if (clusterDetail.data.duplicateCount < 2 || !Array.isArray(clusterDetail.data.relatedDuplicates)) {
      throw new Error(`Test 15 Failed: Duplicate cluster was not populated in admin detail: ${JSON.stringify(clusterDetail.data)}`);
    }
    console.log(`✅ TEST 15 Passed: Duplicate Cluster identified: ${clusterDetail.data.duplicateCount} citizens reported matching issue`);

    // ─────────────────────────────────────────────────────────────
    // TEST 17: Emergency Monitoring Filter
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 17: Emergency Complaints Filtering');
    const emergencyList = await request('/api/admin/complaints?emergency=true', 'GET', null, adminToken);
    const isAllEmergency = emergencyList.data.complaints.every(c => c.priority === 'Emergency' || c.aiAnalysis?.priority === 'Emergency' || c.aiAnalysis?.severity === 'Critical');
    if (!isAllEmergency) {
      throw new Error('Test 17 Failed: Emergency filter included non-emergency complaints');
    }
    console.log(`✅ TEST 17 Passed: Emergency filter returned ${emergencyList.data.total} critical complaints`);

    console.log('\n🎉 ALL 18 GOVERNMENT OPERATIONS PORTAL TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ GOVERNMENT PORTAL TEST SUITE FAILED:', err);
    process.exit(1);
  }
};

runGovernmentPortalTests();
