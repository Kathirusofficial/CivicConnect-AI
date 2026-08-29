require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');
const Worker = require('./models/Worker');
const Notification = require('./models/Notification');
const http = require('http');

const runTests = async () => {
  try {
    console.log('--- 🧪 STARTING BACKEND INTEGRATION TESTS ---');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicconnect');
    console.log('✅ MongoDB connected successfully');

    // Helper for making API requests
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

    // Clean test user if exists
    const testEmail = 'integration.citizen@test.com';
    await User.deleteOne({ email: testEmail });
    await User.deleteOne({ email: 'other.citizen@test.com' });

    // TEST 1: Registration
    console.log('\n▶ TEST 1: Citizen Registration');
    const regRes = await request('/api/auth/register', 'POST', {
      name: 'Integration Citizen',
      email: testEmail,
      password: 'SecurePassword123!',
      mobile: '+1-555-888-9999',
      role: 'Citizen'
    });
    if (regRes.status !== 201 || !regRes.data.token) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes)}`);
    }
    const citizenToken = regRes.data.token;
    const citizenId = regRes.data.user._id;
    console.log('✅ Registration Passed: Token received, User created in MongoDB with ID:', citizenId);

    // TEST 2: Wrong Password Login
    console.log('\n▶ TEST 2: Login with Wrong Password');
    const wrongPassRes = await request('/api/auth/login', 'POST', {
      email: testEmail,
      password: 'WrongPassword!'
    });
    if (wrongPassRes.status !== 401) {
      throw new Error(`Expected 401 on wrong password, got: ${wrongPassRes.status}`);
    }
    console.log('✅ Wrong Password Rejection Passed: 401 Unauthorized returned');

    // TEST 3: Correct Login
    console.log('\n▶ TEST 3: Login with Correct Password');
    const loginRes = await request('/api/auth/login', 'POST', {
      email: testEmail,
      password: 'SecurePassword123!'
    });
    if (loginRes.status !== 200 || !loginRes.data.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
    }
    console.log('✅ Correct Login Passed: JWT token generated');

    // TEST 4: Create Complaint
    console.log('\n▶ TEST 4: Citizen Creates Complaint');
    const compRes = await request('/api/complaints', 'POST', {
      title: 'Water Leakage on Elm Street',
      category: 'Water Supply',
      department: 'Water Supply',
      description: 'Major pipeline ruptured near house 45, water pooling rapidly on road.',
      priority: 'High',
      address: '45 Elm Street, Sector 2',
      landmark: 'Opposite Community Library',
      latitude: 12.9716,
      longitude: 77.5946,
      images: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd']
    }, citizenToken);

    if (compRes.status !== 201 || !compRes.data.complaint) {
      throw new Error(`Create complaint failed: ${JSON.stringify(compRes)}`);
    }
    const createdComp = compRes.data.complaint;
    console.log('✅ Create Complaint Passed:', {
      _id: createdComp._id,
      complaintId: createdComp.complaintId,
      status: createdComp.status,
      citizen: createdComp.citizen?._id,
      timelineEvents: createdComp.timeline?.length
    });

    if (!createdComp.complaintId.startsWith('CMP-')) {
      throw new Error(`Complaint ID format invalid: ${createdComp.complaintId}`);
    }

    // TEST 5: Citizen My Complaints API
    console.log('\n▶ TEST 5: Citizen Fetches My Complaints');
    const myCompsRes = await request('/api/complaints/my', 'GET', null, citizenToken);
    if (myCompsRes.status !== 200 || !Array.isArray(myCompsRes.data)) {
      throw new Error(`My Complaints failed: ${JSON.stringify(myCompsRes)}`);
    }
    const foundMy = myCompsRes.data.find(c => c._id.toString() === createdComp._id.toString());
    if (!foundMy) {
      throw new Error('Created complaint not found in citizen my complaints query!');
    }
    console.log(`✅ My Complaints Query Passed: Retrieved ${myCompsRes.data.length} complaints for citizen`);

    // TEST 6: Authorization check - Another citizen cannot view this complaint
    console.log('\n▶ TEST 6: Authorization Security Check (Cross-Citizen Access)');
    const regOther = await request('/api/auth/register', 'POST', {
      name: 'Other Citizen',
      email: 'other.citizen@test.com',
      password: 'SecurePassword123!',
      role: 'Citizen'
    });
    const otherToken = regOther.data.token;
    const unauthorizedCheck = await request(`/api/complaints/${createdComp._id}`, 'GET', null, otherToken);
    if (unauthorizedCheck.status !== 403) {
      throw new Error(`Expected 403 Forbidden for other citizen viewing complaint, got: ${unauthorizedCheck.status}`);
    }
    console.log('✅ Authorization Guard Passed: 403 Forbidden correctly returned for unauthorized user');

    // TEST 7: Admin Login
    console.log('\n▶ TEST 7: Admin Login');
    const adminLogin = await request('/api/auth/login', 'POST', {
      email: 'admin@civicconnect.com',
      password: 'adminpassword'
    });
    if (adminLogin.status !== 200 || !adminLogin.data.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin)}`);
    }
    const adminToken = adminLogin.data.token;
    console.log('✅ Admin Login Passed');

    // TEST 8: Admin Status Update & Worker Assignment
    console.log('\n▶ TEST 8: Admin Status Transition and Worker Assignment');
    const availWorker = await Worker.findOne({ status: 'Available' });
    if (!availWorker) throw new Error('No available worker found to assign');

    const updateRes = await request(`/api/admin/complaints/${createdComp._id}`, 'PATCH', {
      status: 'Assigned',
      assignedWorker: availWorker._id,
      remarks: 'Inspected and assigned to priority response team'
    }, adminToken);

    if (updateRes.status !== 200) {
      throw new Error(`Admin update failed: ${JSON.stringify(updateRes)}`);
    }
    console.log('✅ Admin Status Update Passed');

    // Verify Worker Status in DB is now 'Busy'
    const workerAfterAssign = await Worker.findById(availWorker._id);
    if (workerAfterAssign.status !== 'Busy') {
      throw new Error(`Worker status was not set to Busy. Current status: ${workerAfterAssign.status}`);
    }
    console.log('✅ Worker Status Update Passed: Worker marked as "Busy" in MongoDB');

    // TEST 9: Admin Resolves Complaint & Worker Released
    console.log('\n▶ TEST 9: Admin Resolves Complaint');
    const resolveRes = await request(`/api/admin/complaints/${createdComp._id}`, 'PATCH', {
      status: 'Resolved',
      remarks: 'Water pipeline successfully repaired and tested.'
    }, adminToken);
    if (resolveRes.status !== 200) throw new Error(`Resolve failed: ${JSON.stringify(resolveRes)}`);

    const workerAfterResolve = await Worker.findById(availWorker._id);
    if (workerAfterResolve.status !== 'Available') {
      throw new Error(`Worker was not released to Available upon resolution. Current status: ${workerAfterResolve.status}`);
    }
    console.log('✅ Worker Status Release Passed: Worker restored to "Available" in MongoDB');

    // TEST 10: Citizen Notifications Verification
    console.log('\n▶ TEST 10: Citizen Notifications Verification');
    const notifsRes = await request('/api/notifications', 'GET', null, citizenToken);
    if (notifsRes.status !== 200 || !notifsRes.data.notifications) {
      throw new Error(`Failed to fetch notifications: ${JSON.stringify(notifsRes)}`);
    }
    const notifs = notifsRes.data.notifications;
    console.log(`✅ Citizen Notifications Passed: Found ${notifs.length} notifications in MongoDB for citizen:`);
    notifs.forEach(n => console.log(`   🔔 [${n.read ? 'READ' : 'UNREAD'}] ${n.message}`));

    console.log('\n🎉 ALL 10 INTEGRATION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  }
};

runTests();
