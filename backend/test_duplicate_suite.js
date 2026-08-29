require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');
const aiService = require('./services/aiService');
const http = require('http');

const runDuplicateTests = async () => {
  try {
    console.log('--- 🔍 STARTING AI DUPLICATE COMPLAINT DETECTION TEST SUITE ---');
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

    // Clean test citizen
    const testEmail = 'ai.duplicate.citizen@example.com';
    await User.deleteOne({ email: testEmail });

    // Register test citizen
    const regRes = await request('/api/auth/register', 'POST', {
      name: 'Duplicate Test Citizen',
      email: testEmail,
      password: 'StrongPassword123!',
      role: 'Citizen'
    });
    const citizenToken = regRes.data.token;
    const citizenId = regRes.data.user._id;
    console.log('✅ Test Citizen Authenticated with JWT');

    // Clean any prior test complaints for this category
    await Complaint.deleteMany({ citizen: citizenId });

    // Baseline coordinates (Central Bus Stand)
    const baseLat = 11.0168;
    const baseLon = 76.9558;

    // Create Base Existing Complaint 1: Road Damage at Central Bus Stand
    const existingRoadComplaint = await Complaint.create({
      title: 'Large dangerous pothole near central bus stand',
      description: 'A deep crater and pothole has formed right in front of the central bus terminal entrance. Buses and bikes are swerving and crashing.',
      category: 'Road Damage',
      department: 'Road Department',
      priority: 'High',
      status: 'In Progress',
      address: 'Central Bus Terminal Road',
      landmark: 'Central Bus Stand Gate 1',
      latitude: baseLat,
      longitude: baseLon,
      citizen: citizenId,
      aiAnalysis: {
        category: 'Road Damage',
        department: 'Road Department',
        priority: 'High',
        severity: 'High',
        summary: 'Deep crater and pothole near central bus terminal causing accidents.',
        confidence: 0.94,
        classificationSource: 'AI Recommended'
      }
    });
    console.log(`✅ Seeded base complaint: ${existingRoadComplaint.complaintId} (${existingRoadComplaint._id})`);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: No duplicate (Completely different issue & category)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 1: No duplicate check');
    const noDupRes = await request('/api/ai/check-duplicate', 'POST', {
      title: 'Streetlight completely broken and dark alley',
      description: 'The lamp post on 14th avenue is not turning on at night, leaving the whole street pitch black.',
      category: 'Street Light',
      address: '14th Cross Avenue',
      landmark: 'Near City Park',
      latitude: 11.0500,
      longitude: 76.9900
    }, citizenToken);

    if (noDupRes.status !== 200 || !noDupRes.data.success) {
      throw new Error(`Test 1 Failed: Request failed with status ${noDupRes.status}`);
    }
    if (noDupRes.data.data.possibleDuplicate !== false || noDupRes.data.data.matches.length !== 0) {
      throw new Error(`Test 1 Failed: Expected no duplicates, received: ${JSON.stringify(noDupRes.data.data)}`);
    }
    console.log('✅ TEST 1 Passed: No duplicate correctly identified (possibleDuplicate = false, matches = [])');

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Strong duplicate (Same issue, same category, ~40m away)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 2: Strong duplicate check (Close vicinity + semantic match)');
    const strongDupRes = await request('/api/ai/check-duplicate', 'POST', {
      title: 'Huge pothole beside bus stand damaging vehicles',
      description: 'Large broken road and pothole right next to the bus terminal. Multiple bikes fell into it today.',
      category: 'Road Damage',
      address: 'Central Bus Stand Main Entrance',
      landmark: 'Central Bus Stand',
      latitude: 11.0170, // ~25 meters away
      longitude: 76.9560
    }, citizenToken);

    if (strongDupRes.status !== 200 || !strongDupRes.data.data.possibleDuplicate || !strongDupRes.data.data.strongDuplicate) {
      throw new Error(`Test 2 Failed: Expected strong duplicate, received: ${JSON.stringify(strongDupRes.data)}`);
    }
    const match = strongDupRes.data.data.matches[0];
    if (!match || match.complaintId !== existingRoadComplaint.complaintId || match.distanceMeters > 200) {
      throw new Error(`Test 2 Failed: Matched complaint mismatch: ${JSON.stringify(match)}`);
    }
    console.log('✅ TEST 2 Passed: Strong duplicate detected:', {
      complaintId: match.complaintId,
      similarity: match.similarity,
      distanceMeters: match.distanceMeters,
      status: match.status
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Far-away issue (Similar description but 15km away)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 3: Far-away issue (Should NOT be strong duplicate)');
    const farDupRes = await request('/api/ai/check-duplicate', 'POST', {
      title: 'Large dangerous pothole near central bus stand',
      description: 'A deep crater and pothole has formed near the bus stop.',
      category: 'Road Damage',
      address: 'Outer Ring Highway km 42',
      landmark: 'Highway Stop',
      latitude: 11.2000, // ~20km away
      longitude: 77.1000
    }, citizenToken);

    if (farDupRes.data.data.strongDuplicate === true) {
      throw new Error('Test 3 Failed: Far-away issue was incorrectly marked as strong duplicate');
    }
    console.log('✅ TEST 3 Passed: Far-away complaint (>500m) not marked as strong duplicate');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Different category in same location
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 4: Different category in same location');
    const diffCatRes = await request('/api/ai/check-duplicate', 'POST', {
      title: 'Garbage bins overflowing and rotting trash',
      description: 'Garbage dump near bus stand is overflowing with waste.',
      category: 'Garbage Collection',
      address: 'Central Bus Stand Main Entrance',
      landmark: 'Bus Stand',
      latitude: baseLat,
      longitude: baseLon
    }, citizenToken);

    if (diffCatRes.data.data.strongDuplicate === true) {
      throw new Error('Test 4 Failed: Different category was incorrectly flagged as strong duplicate');
    }
    console.log('✅ TEST 4 Passed: Different category filtered out from strong duplicates');

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Missing coordinates (Text/Address duplicate matching)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 5: Missing GPS coordinates duplicate check');
    const noGpsRes = await request('/api/ai/check-duplicate', 'POST', {
      title: 'Dangerous deep pothole at Central Bus Terminal Road',
      description: 'Crater and pothole in front of central bus terminal entrance causing accidents.',
      category: 'Road Damage',
      address: 'Central Bus Terminal Road',
      landmark: 'Central Bus Stand Gate 1'
    }, citizenToken);

    if (!noGpsRes.data.data.possibleDuplicate) {
      throw new Error(`Test 5 Failed: Text/Address similarity failed when GPS is missing: ${JSON.stringify(noGpsRes.data)}`);
    }
    console.log('✅ TEST 5 Passed: Duplicate detected using textual/semantic address match without GPS');

    // ─────────────────────────────────────────────────────────────
    // TEST 6: AI Failure Resilience / Safe Fallback
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 6: AI Failure Resilience / Fallback');
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const fallbackDupRes = await aiService.checkDuplicateComplaint({
      title: 'Large dangerous pothole near central bus stand',
      description: 'Deep crater and pothole near central bus terminal.',
      category: 'Road Damage',
      address: 'Central Bus Terminal Road',
      latitude: baseLat,
      longitude: baseLon
    });
    if (origKey) process.env.GEMINI_API_KEY = origKey;

    if (!fallbackDupRes || !Array.isArray(fallbackDupRes.matches)) {
      throw new Error('Test 6 Failed: Fallback check returned invalid structure');
    }
    console.log('✅ TEST 6 Passed: Deterministic fallback executed safely without exception');

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Unauthorized request (401)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 7: Unauthorized request (401 Unauthorized)');
    const unauthRes = await request('/api/ai/check-duplicate', 'POST', {
      title: 'Pothole',
      description: 'Pothole description'
    }, null);
    if (unauthRes.status !== 401) {
      throw new Error(`Test 7 Failed: Expected 401, got ${unauthRes.status}`);
    }
    console.log('✅ TEST 7 Passed: 401 Unauthorized properly returned for unauthenticated request');

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Privacy security check (No citizen email/password leak)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 8: Privacy security check');
    const returnedMatch = strongDupRes.data.data.matches[0];
    if (returnedMatch.citizen || returnedMatch.email || returnedMatch.password || returnedMatch.mobile) {
      throw new Error('Test 8 Failed: Match payload leaked private citizen profile information!');
    }
    console.log('✅ TEST 8 Passed: Match payload contains only safe public civic issue data');

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Citizen submits complaint anyway
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 9: Citizen chooses Submit Anyway');
    const submitAnywayRes = await request('/api/complaints', 'POST', {
      title: 'Huge pothole beside bus stand damaging vehicles',
      description: 'Submitting anyway as an independent report.',
      category: 'Road Damage',
      department: 'Road Department',
      priority: 'High',
      address: 'Central Bus Stand Main Entrance',
      latitude: baseLat,
      longitude: baseLon
    }, citizenToken);

    if (submitAnywayRes.status !== 201 || !submitAnywayRes.data.complaint) {
      throw new Error(`Test 9 Failed: Submit anyway complaint creation failed: ${JSON.stringify(submitAnywayRes)}`);
    }
    const independentComp = submitAnywayRes.data.complaint;
    if (independentComp.duplicateOf) {
      throw new Error('Test 9 Failed: duplicateOf was unexpectedly set when submitting anyway');
    }
    console.log('✅ TEST 9 Passed: Independent complaint created successfully without duplicateOf');

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Citizen links complaint to existing issue
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 10: Citizen chooses to link to existing issue');
    const linkRes = await request('/api/complaints', 'POST', {
      title: 'Another report for bus stand pothole',
      description: 'I also noticed this large pothole and would like to link to the existing issue.',
      category: 'Road Damage',
      department: 'Road Department',
      priority: 'High',
      address: 'Central Bus Stand',
      duplicateOf: existingRoadComplaint._id
    }, citizenToken);

    if (linkRes.status !== 201 || !linkRes.data.complaint) {
      throw new Error(`Test 10 Failed: ${JSON.stringify(linkRes)}`);
    }
    const linkedComp = await Complaint.findById(linkRes.data.complaint._id);
    const parentComp = await Complaint.findById(existingRoadComplaint._id);

    if (!linkedComp.duplicateOf || linkedComp.duplicateOf.toString() !== existingRoadComplaint._id.toString()) {
      throw new Error('Test 10 Failed: linked complaint duplicateOf mismatch');
    }
    if (!linkedComp.duplicateGroupId || linkedComp.duplicateGroupId !== parentComp.duplicateGroupId) {
      throw new Error(`Test 10 Failed: duplicateGroupId mismatch between parent and child (${parentComp.duplicateGroupId} vs ${linkedComp.duplicateGroupId})`);
    }
    console.log('✅ TEST 10 Passed: duplicateOf and shared duplicateGroupId successfully populated in MongoDB:', {
      parentId: parentComp._id,
      duplicateGroupId: linkedComp.duplicateGroupId,
      duplicateOf: linkedComp.duplicateOf
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Legacy complaint compatibility
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 11: Legacy complaints compatibility');
    const legacyComp = await Complaint.create({
      title: 'Old Legacy Issue',
      department: 'Municipality',
      description: 'Legacy complaint without duplicate fields.',
      priority: 'Low',
      address: 'Old District',
      citizen: citizenId
    });
    const fetchedLegacy = await Complaint.findById(legacyComp._id);
    if (!fetchedLegacy || fetchedLegacy.duplicateOf !== null || fetchedLegacy.duplicateGroupId !== null) {
      throw new Error('Test 11 Failed: Legacy complaint fields unexpected');
    }
    console.log('✅ TEST 11 Passed: Legacy complaints without duplicate fields operate normally');

    console.log('\n🎉 ALL 11 AI DUPLICATE DETECTION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ AI DUPLICATE TEST SUITE FAILED:', err);
    process.exit(1);
  }
};

runDuplicateTests();
