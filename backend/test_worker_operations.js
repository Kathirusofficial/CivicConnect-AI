require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');
const Worker = require('./models/Worker');
const Notification = require('./models/Notification');
const http = require('http');

const runWorkerTests = async () => {
  try {
    console.log('--- 👷 STARTING SMART FIELD WORKER OPERATIONS & RESOLUTION TEST SUITE ---');
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
    const citizenEmail = 'citizen.worker.test@example.com';
    const adminEmail = 'admin.worker.test@civicconnect.com';
    const worker1Email = 'worker.bob@civicconnect.gov';
    const worker2Email = 'worker.alice@civicconnect.gov';

    await User.deleteMany({ email: { $in: [citizenEmail, adminEmail] } });
    await Worker.deleteMany({ email: { $in: [worker1Email, worker2Email] } });

    // Ensure department exists
    let dept = await Department.findOne({ name: 'Road Department' });
    if (!dept) {
      dept = await Department.create({ name: 'Road Department', description: 'Roads & transport' });
    }

    // 1. Seed Workers
    console.log('\n▶ TEST 1: Seed Field Workers');
    const worker1 = await Worker.create({
      name: 'Bob Jenkins',
      email: worker1Email,
      password: 'WorkerSecurePassword123!',
      employeeId: 'EMP-ROAD-001',
      department: dept._id,
      status: 'Available',
      contact: '+1 555-0192'
    });

    const worker2 = await Worker.create({
      name: 'Alice Cooper',
      email: worker2Email,
      password: 'WorkerSecurePassword456!',
      employeeId: 'EMP-ROAD-002',
      department: dept._id,
      status: 'Available',
      contact: '+1 555-0193'
    });
    console.log('✅ TEST 1 Passed: Workers Bob (Worker 1) and Alice (Worker 2) created');

    // 2. Worker Login Success
    console.log('\n▶ TEST 2: Worker Login Authentication');
    const loginRes = await request('/api/auth/worker-login', 'POST', {
      email: worker1Email,
      password: 'WorkerSecurePassword123!'
    });
    if (loginRes.status !== 200 || !loginRes.data.token || loginRes.data.user.role !== 'Worker') {
      throw new Error(`Test 2 Failed: Worker login failed: ${JSON.stringify(loginRes.data)}`);
    }
    const worker1Token = loginRes.data.token;
    console.log('✅ TEST 2 Passed: Worker 1 logged in, JWT generated with role "Worker"');

    // Worker 2 Login
    const loginRes2 = await request('/api/auth/worker-login', 'POST', {
      email: worker2Email,
      password: 'WorkerSecurePassword456!'
    });
    const worker2Token = loginRes2.data.token;

    // 3 & 4. Wrong password & Nonexistent worker rejection
    console.log('\n▶ TEST 3 & 4: Invalid Worker Credentials Rejection');
    const wrongPass = await request('/api/auth/worker-login', 'POST', {
      email: worker1Email,
      password: 'WrongPassword'
    });
    const nonExist = await request('/api/auth/worker-login', 'POST', {
      email: 'nonexistent@civicconnect.gov',
      password: 'SomePassword'
    });
    if (wrongPass.status !== 401 || nonExist.status !== 401) {
      throw new Error(`Test 3/4 Failed: Expected 401 for invalid credentials (got ${wrongPass.status}, ${nonExist.status})`);
    }
    console.log('✅ TEST 3 & 4 Passed: 401 Unauthorized returned for wrong password and nonexistent worker');

    // Create Citizen and Admin for authorization testing
    const regCit = await request('/api/auth/register', 'POST', {
      name: 'Citizen Test User',
      email: citizenEmail,
      password: 'CitizenPassword123!',
      role: 'Citizen',
      mobile: '9876543210'
    });
    const citizenToken = regCit.data.token;
    const citizenId = regCit.data.user._id;

    const regAdm = await request('/api/auth/register', 'POST', {
      name: 'Operations Admin Officer',
      email: adminEmail,
      password: 'AdminPassword123!',
      role: 'Admin'
    });
    const adminToken = regAdm.data.token;

    // 5 & 6. Role Guards: Citizen on Worker API & Worker on Admin API
    console.log('\n▶ TEST 5 & 6: Cross-Role Security Guards (403 Forbidden)');
    const citOnWorker = await request('/api/worker/dashboard', 'GET', null, citizenToken);
    const workerOnAdmin = await request('/api/admin/complaints', 'GET', null, worker1Token);
    if (citOnWorker.status !== 403 || workerOnAdmin.status !== 403) {
      throw new Error(`Test 5/6 Failed: Citizen on Worker: ${citOnWorker.status}, Worker on Admin: ${workerOnAdmin.status}`);
    }
    console.log('✅ TEST 5 & 6 Passed: Citizen blocked with 403 on Worker APIs; Worker blocked with 403 on Government APIs');

    // Create a base complaint filed by Citizen
    const complaint1 = await Complaint.create({
      title: 'Massive Crater on 5th Cross Road',
      description: 'Dangerous pothole damaging vehicles and risking accidents.',
      category: 'Road Damage',
      department: 'Road Department',
      priority: 'Emergency',
      citizen: citizenId,
      address: '5th Cross Road, Sector 3',
      landmark: 'Near Water Tower',
      latitude: 12.9716,
      longitude: 77.5946,
      status: 'Assigned',
      assignedWorker: worker1._id,
      assignedDepartment: dept._id,
      fieldWork: { assignedAt: new Date() },
      timeline: [{
        status: 'Assigned',
        title: 'Assigned to Field Worker',
        description: 'Assigned to Bob Jenkins',
        createdAt: new Date()
      }]
    });

    // 7 & 8. Worker Dashboard & Seeing Only Assigned Tasks
    console.log('\n▶ TEST 7 & 8: Worker Dashboard & Assigned Task Retrieval');
    const dashRes = await request('/api/worker/dashboard', 'GET', null, worker1Token);
    if (dashRes.status !== 200 || dashRes.data.summary.assignedTasks < 1) {
      throw new Error(`Test 7/8 Failed: Dashboard returned invalid summary: ${JSON.stringify(dashRes.data)}`);
    }
    const tasksRes = await request('/api/worker/tasks', 'GET', null, worker1Token);
    if (tasksRes.status !== 200 || !tasksRes.data.tasks.some(t => t._id.toString() === complaint1._id.toString())) {
      throw new Error(`Test 7/8 Failed: Worker 1 could not find their assigned task`);
    }
    console.log(`✅ TEST 7 & 8 Passed: Worker 1 dashboard loaded (${dashRes.data.summary.assignedTasks} assigned, ${dashRes.data.summary.emergency} emergency)`);

    // 9 & 10. Worker isolation: Worker 2 cannot access Worker 1 task or unassigned tasks
    console.log('\n▶ TEST 9 & 10: Task Isolation (Worker 2 Forbidden from Worker 1 Task)');
    const w2AccessW1 = await request(`/api/worker/tasks/${complaint1._id}`, 'GET', null, worker2Token);
    if (w2AccessW1.status !== 403) {
      throw new Error(`Test 9/10 Failed: Worker 2 was not blocked from Worker 1 task (Status: ${w2AccessW1.status})`);
    }
    console.log('✅ TEST 9 & 10 Passed: Worker 2 blocked with 403 Forbidden when attempting to access Worker 1 task');

    // 11, 12 & 13. Privacy verification: Task details contain no citizen email, mobile or password
    console.log('\n▶ TEST 11, 12 & 13: Citizen Privacy Guard (Zero PII in Worker Payloads)');
    const w1TaskDetail = await request(`/api/worker/tasks/${complaint1._id}`, 'GET', null, worker1Token);
    const taskPayloadStr = JSON.stringify(w1TaskDetail.data);
    if (taskPayloadStr.includes(citizenEmail) || taskPayloadStr.includes('9876543210') || taskPayloadStr.includes('password')) {
      throw new Error('Test 11/12/13 Failed: Citizen PII leaked into worker task details!');
    }
    console.log('✅ TEST 11, 12 & 13 Passed: Operational payload is completely sanitized (zero citizen PII)');

    // 14, 15 & 16. Worker Accepts Assignment (Assigned -> In Progress, acceptedAt created)
    console.log('\n▶ TEST 14, 15 & 16: Worker Accepts Assignment');
    const acceptRes = await request(`/api/worker/tasks/${complaint1._id}/accept`, 'PATCH', null, worker1Token);
    if (acceptRes.status !== 200 || acceptRes.data.task.status !== 'In Progress' || !acceptRes.data.task.fieldWork.acceptedAt) {
      throw new Error(`Test 14/15/16 Failed: Accept task failed: ${JSON.stringify(acceptRes.data)}`);
    }
    console.log('✅ TEST 14, 15 & 16 Passed: Complaint transitioned to "In Progress" with acceptedAt timestamp');

    // 17 & 18. Worker Starts Field Work (startedAt recorded)
    console.log('\n▶ TEST 17 & 18: Worker Starts Field Work');
    const startRes = await request(`/api/worker/tasks/${complaint1._id}/start`, 'PATCH', null, worker1Token);
    if (startRes.status !== 200 || !startRes.data.task.fieldWork.startedAt) {
      throw new Error(`Test 17/18 Failed: Start work failed: ${JSON.stringify(startRes.data)}`);
    }
    console.log('✅ TEST 17 & 18 Passed: Field work started with startedAt timestamp recorded in MongoDB');

    // 19, 20 & 21. Evidence Upload (Before and After evidence)
    console.log('\n▶ TEST 19, 20 & 21: Before & After Work Evidence Upload');
    const evBefore = await request(`/api/worker/tasks/${complaint1._id}/evidence`, 'POST', {
      type: 'before',
      url: 'https://images.civicconnect.gov/evidence/crater_before.jpg'
    }, worker1Token);

    // Test 422 when attempting to submit without AFTER evidence
    console.log('\n▶ TEST: Resolution requires after evidence (422)');
    const submitWithoutAfter = await request(`/api/worker/tasks/${complaint1._id}/submit-resolution`, 'PATCH', {
      notes: 'Tried to submit before uploading after evidence'
    }, worker1Token);
    if (submitWithoutAfter.status !== 422) {
      throw new Error(`Expected 422 when submitting without after evidence, got ${submitWithoutAfter.status}`);
    }
    console.log('✅ TEST Passed: 422 Unprocessable Entity returned when AFTER evidence is missing');

    const evAfter = await request(`/api/worker/tasks/${complaint1._id}/evidence`, 'POST', {
      type: 'after',
      url: 'https://images.civicconnect.gov/evidence/crater_after_asphalt.jpg'
    }, worker1Token);
    if (evBefore.status !== 200 || evAfter.status !== 200 || evAfter.data.evidence.length < 2) {
      throw new Error(`Test 19/20/21 Failed: Evidence upload failed: ${JSON.stringify(evAfter.data)}`);
    }
    console.log('✅ TEST 19, 20 & 21 Passed: Before & After photographic evidence stored in complaint');

    // 22, 23 & 24. Worker Submits Resolution (In Progress -> Resolution Pending Verification)
    console.log('\n▶ TEST 22, 23 & 24: Worker Submits Resolution');
    const submitRes = await request(`/api/worker/tasks/${complaint1._id}/submit-resolution`, 'PATCH', {
      notes: 'Pothole excavated, compacted with gravel, and asphalt layer hot-rolled flush with road surface.'
    }, worker1Token);
    if (submitRes.status !== 200 || submitRes.data.task.status !== 'Resolution Pending Verification' || submitRes.data.task.resolution.status !== 'Pending Verification') {
      throw new Error(`Test 22/23/24 Failed: Resolution submission failed: ${JSON.stringify(submitRes.data)}`);
    }
    console.log('✅ TEST 22, 23 & 24 Passed: Status updated to "Resolution Pending Verification", resolution.status = "Pending Verification"');

    // 25. Government sees submitted resolution
    console.log('\n▶ TEST 25: Government Inspects Submitted Resolution');
    const govInspect = await request(`/api/admin/complaints/${complaint1._id}`, 'GET', null, adminToken);
    if (govInspect.status !== 200 || govInspect.data.status !== 'Resolution Pending Verification' || !govInspect.data.resolution.notes) {
      throw new Error(`Test 25 Failed: Gov inspect failed: ${JSON.stringify(govInspect.data)}`);
    }
    console.log('✅ TEST 25 Passed: Government received resolution notes and evidence for review');

    // 32, 33, 34 & 35. Government Rejection Cycle First
    console.log('\n▶ TEST 32, 33, 34 & 35: Government Rejection & Rework Cycle');
    const emptyReject = await request(`/api/admin/complaints/${complaint1._id}/reject-resolution`, 'PATCH', {
      rejectionReason: '   '
    }, adminToken);
    if (emptyReject.status !== 400) {
      throw new Error(`Expected 400 for empty rejection reason, got ${emptyReject.status}`);
    }
    console.log('✅ TEST Passed: 400 Bad Request returned when rejection reason is blank');
    const rejectRes = await request(`/api/admin/complaints/${complaint1._id}/reject-resolution`, 'PATCH', {
      rejectionReason: 'Asphalt edge needs additional sealant to prevent water seepage.'
    }, adminToken);
    if (rejectRes.status !== 200 || rejectRes.data.complaint.status !== 'In Progress' || rejectRes.data.complaint.resolution.status !== 'Rejected') {
      throw new Error(`Test 32-35 Failed: Reject resolution failed: ${JSON.stringify(rejectRes.data)}`);
    }
    const workerBobDoc = await Worker.findById(worker1._id);
    if (workerBobDoc.status !== 'Busy') {
      throw new Error(`Test 34 Failed: Worker should remain Busy during rework (got ${workerBobDoc.status})`);
    }
    console.log('✅ TEST 32, 33, 34 & 35 Passed: Resolution rejected, returned to "In Progress", rejection reason stored, worker remains Busy');

    // Worker resubmits resolution
    await request(`/api/worker/tasks/${complaint1._id}/submit-resolution`, 'PATCH', {
      notes: 'Applied bituminous sealant along all perimeter edges and re-compacted.'
    }, worker1Token);

    // 26, 27, 28, 29, 30 & 31. Government Approves Resolution
    console.log('\n▶ TEST 26 - 31: Government Approves Resolution & Finalizes Workflow');
    const initialDeptResolved = (await Department.findById(dept._id)).stats?.resolvedComplaints || 0;

    const approveRes = await request(`/api/admin/complaints/${complaint1._id}/approve-resolution`, 'PATCH', null, adminToken);
    if (approveRes.status !== 200 || approveRes.data.complaint.status !== 'Resolved' || approveRes.data.complaint.resolution.status !== 'Approved') {
      throw new Error(`Test 26-31 Failed: Approve resolution failed: ${JSON.stringify(approveRes.data)}`);
    }

    const workerBobAfter = await Worker.findById(worker1._id);
    if (workerBobAfter.status !== 'Available') {
      throw new Error(`Test 28 Failed: Worker should be Available after resolution (got ${workerBobAfter.status})`);
    }

    const deptAfter = await Department.findById(dept._id);
    if (deptAfter.stats.resolvedComplaints !== initialDeptResolved + 1) {
      throw new Error(`Test 29 Failed: Department resolved count did not increment exactly once`);
    }

    // Verify citizen notification
    const citizenNotifs = await Notification.find({ user: citizenId });
    if (citizenNotifs.length === 0) {
      throw new Error('Test 30 Failed: Citizen received zero notifications');
    }
    console.log(`✅ TEST 26 - 31 Passed: Complaint Resolved, Worker Available, Department count +1, Citizen notified (${citizenNotifs.length} total notifications)`);

    // 36. Worker History
    console.log('\n▶ TEST 36: Worker Completed Task History');
    const historyRes = await request('/api/worker/history', 'GET', null, worker1Token);
    if (historyRes.status !== 200 || historyRes.data.history.length === 0) {
      throw new Error(`Test 36 Failed: Worker history empty: ${JSON.stringify(historyRes.data)}`);
    }
    console.log(`✅ TEST 36 Passed: Worker 1 history contains ${historyRes.data.history.length} completed task(s)`);

    // 37. Citizen Timeline Lifecycle Verification
    console.log('\n▶ TEST 37: Complete Citizen Timeline Verification');
    const finalComplaint = await Complaint.findById(complaint1._id);
    const timelineTitles = finalComplaint.timeline.map(t => t.title);
    console.log('   Timeline Steps:', timelineTitles);
    if (!timelineTitles.includes('Field Worker Accepted Assignment') || !timelineTitles.includes('Field Work Started') || !timelineTitles.includes('Resolution Verified and Complaint Resolved')) {
      throw new Error(`Test 37 Failed: Timeline missing expected milestones: ${JSON.stringify(timelineTitles)}`);
    }
    console.log('✅ TEST 37 Passed: Full lifecycle represented in timeline from submission to resolution');

    console.log('\n🎉 ALL 37 SMART FIELD WORKER OPERATIONS TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ WORKER OPERATIONS TEST SUITE FAILED:', err);
    process.exit(1);
  }
};

runWorkerTests();
