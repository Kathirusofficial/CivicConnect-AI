require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');
const Worker = require('./models/Worker');
const aiService = require('./services/aiService');
const http = require('http');

const runAiTests = async () => {
  try {
    console.log('--- 🧠 STARTING AI COMPLAINT CLASSIFICATION TEST SUITE ---');
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
    const testEmail = 'ai.citizen.test@example.com';
    await User.deleteOne({ email: testEmail });

    // Register test citizen
    const regRes = await request('/api/auth/register', 'POST', {
      name: 'AI Test Citizen',
      email: testEmail,
      password: 'StrongPassword123!',
      role: 'Citizen'
    });
    const citizenToken = regRes.data.token;
    console.log('✅ Test Citizen Authenticated with JWT');

    // TEST 1: Valid complaint classification
    console.log('\n▶ TEST 1: Valid complaint classification');
    const classifyRes = await request('/api/ai/classify-complaint', 'POST', {
      title: 'Massive water pipe bursting near metro station',
      description: 'The main underground water pipeline has ruptured and is flooding the entire road, causing severe damage and water shortage in the neighborhood.',
      category: 'Water Supply',
      priority: 'High',
      address: 'Near Central Metro Station, Gate 2',
      landmark: 'Metro Station'
    }, citizenToken);

    if (classifyRes.status !== 200 || !classifyRes.data.success || !classifyRes.data.data) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(classifyRes)}`);
    }
    const aiData = classifyRes.data.data;
    console.log('✅ TEST 1 Passed. Classification Result:', aiData);
    if (!aiData.category || !aiData.department || !aiData.priority || !aiData.severity || !aiData.summary || typeof aiData.confidence !== 'number') {
      throw new Error('Test 1 Failed: Missing required fields in AI response structure');
    }

    // TEST 2: AI invalid response / Fallback logic
    console.log('\n▶ TEST 2: Fallback logic on irregular/unstructured input');
    const fallbackRes = aiService.getSafeFallback({
      title: 'Power outage and sparks from transformer',
      description: 'Wires are sparking violently on 7th cross avenue.',
      priority: 'High'
    });
    console.log('✅ TEST 2 Passed. Fallback Result:', fallbackRes);
    if (fallbackRes.category !== 'Electricity' || fallbackRes.department !== 'Electricity' || fallbackRes.confidence !== 0) {
      throw new Error('Test 2 Failed: Fallback did not resolve properly');
    }

    // TEST 3: AI Service failure resilience - Complaint creation remains possible
    console.log('\n▶ TEST 3: Complaint creation remains fully possible even with fallback AI');
    const compFallbackRes = await request('/api/complaints', 'POST', {
      title: 'Pothole on 10th street',
      description: 'Road surface is broken into pieces.',
      category: fallbackRes.category,
      department: fallbackRes.department,
      priority: fallbackRes.priority,
      address: '10th Street North',
      aiAnalysis: fallbackRes
    }, citizenToken);

    if (compFallbackRes.status !== 201) {
      throw new Error(`Test 3 Failed: ${JSON.stringify(compFallbackRes)}`);
    }
    console.log('✅ TEST 3 Passed: Complaint created successfully with fallback AI');

    // TEST 4: Missing title/description validation error (422)
    console.log('\n▶ TEST 4: Missing title/description (422 validation error)');
    const invalidReq = await request('/api/ai/classify-complaint', 'POST', {
      title: '',
      description: ''
    }, citizenToken);
    if (invalidReq.status !== 422) {
      throw new Error(`Test 4 Failed: Expected 422, got ${invalidReq.status}`);
    }
    console.log('✅ TEST 4 Passed: 422 Validation Error returned for empty title/description');

    // TEST 5: Unauthenticated request (401)
    console.log('\n▶ TEST 5: Unauthenticated request (401 Unauthorized)');
    const unauthReq = await request('/api/ai/classify-complaint', 'POST', {
      title: 'Test Title',
      description: 'Test Description'
    }, null);
    if (unauthReq.status !== 401) {
      throw new Error(`Test 5 Failed: Expected 401, got ${unauthReq.status}`);
    }
    console.log('✅ TEST 5 Passed: 401 Unauthorized returned for unauthenticated call');

    // TEST 6: AI API Key missing safe fallback
    console.log('\n▶ TEST 6: AI API key missing safe fallback');
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const noKeyClassify = await aiService.classifyComplaint({
      title: 'Garbage dump overflowing on side road',
      description: 'Waste has not been collected for 5 days.',
      category: 'Garbage Collection'
    });
    if (noKeyClassify.confidence !== 0 || noKeyClassify.department !== 'Garbage Collection') {
      throw new Error('Test 6 Failed: Safe fallback did not handle missing API key');
    }
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    console.log('✅ TEST 6 Passed: Safe fallback returned with confidence: 0 when API key is not present');

    // TEST 7: Complaint creation with AI analysis stored in MongoDB
    console.log('\n▶ TEST 7: Complaint creation with AI analysis stored in MongoDB');
    const compWithAiRes = await request('/api/complaints', 'POST', {
      title: 'Dangerous live wire hanging from pole',
      category: 'Electricity',
      department: 'Electricity',
      priority: 'Emergency',
      description: 'A storm snapped the pole cable and live electric wire is dangling over the sidewalk.',
      address: '22 Elm Street',
      landmark: 'Near city park',
      aiAnalysis: {
        category: 'Electricity',
        department: 'Electricity',
        priority: 'Emergency',
        severity: 'Critical',
        summary: 'Live electrical wire hanging over sidewalk following storm.',
        confidence: 0.95,
        analyzedAt: new Date(),
        classificationSource: 'AI Recommended'
      }
    }, citizenToken);

    if (compWithAiRes.status !== 201 || !compWithAiRes.data.complaint) {
      throw new Error(`Test 7 Failed: ${JSON.stringify(compWithAiRes)}`);
    }
    const createdComp = compWithAiRes.data.complaint;
    const dbComp = await Complaint.findById(createdComp._id);

    if (!dbComp.aiAnalysis) throw new Error('Test 7 Failed: aiAnalysis was not saved to MongoDB document');
    if (dbComp.aiAnalysis.category !== 'Electricity' || dbComp.aiAnalysis.severity !== 'Critical' || dbComp.aiAnalysis.confidence !== 0.95) {
      throw new Error(`Test 7 Failed: aiAnalysis fields mismatch: ${JSON.stringify(dbComp.aiAnalysis)}`);
    }
    console.log('✅ TEST 7 Passed: MongoDB document verified with full aiAnalysis sub-document:', dbComp.aiAnalysis);

    // TEST 8: Citizen modifies AI recommendation
    console.log('\n▶ TEST 8: Citizen modifies AI recommendation');
    const modifiedCompRes = await request('/api/complaints', 'POST', {
      title: 'Water clogging near street market',
      category: 'Drainage', // Citizen changed from Water Supply to Drainage
      department: 'Drainage',
      priority: 'Medium', // Citizen chose Medium instead of AI High
      description: 'Rainwater clogging the street drain.',
      address: 'Market Yard Road',
      aiAnalysis: {
        category: 'Water Supply', // Original AI recommendation preserved
        department: 'Water Supply',
        priority: 'High',
        severity: 'High',
        summary: 'Water accumulation in market area.',
        confidence: 0.88,
        analyzedAt: new Date(),
        classificationSource: 'Citizen Modified'
      }
    }, citizenToken);

    const modComp = await Complaint.findById(modifiedCompRes.data.complaint._id);
    if (modComp.category !== 'Drainage' || modComp.priority !== 'Medium') {
      throw new Error('Test 8 Failed: Final complaint values did not respect citizen override');
    }
    if (modComp.aiAnalysis.category !== 'Water Supply' || modComp.aiAnalysis.classificationSource !== 'Citizen Modified') {
      throw new Error('Test 8 Failed: aiAnalysis was not preserved with classificationSource: Citizen Modified');
    }
    console.log('✅ TEST 8 Passed: Citizen final overrides stored in complaint while preserving original AI analysis');

    // TEST 9: Existing complaints without aiAnalysis work normally
    console.log('\n▶ TEST 9: Existing complaints without aiAnalysis compatibility');
    const legacyComp = await Complaint.create({
      title: 'Legacy pothole complaint',
      department: 'Road Department',
      description: 'No ai analysis recorded here.',
      priority: 'Low',
      address: 'Old Town',
      citizen: regRes.data.user._id
    });
    const fetchedLegacy = await Complaint.findById(legacyComp._id);
    if (!fetchedLegacy || fetchedLegacy.title !== 'Legacy pothole complaint') {
      throw new Error('Test 9 Failed: Legacy complaint retrieval failed');
    }
    console.log('✅ TEST 9 Passed: Legacy complaints without aiAnalysis continue working seamlessly');

    console.log('\n🎉 ALL 9 AI COMPLAINT INTELLIGENCE TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ AI TEST SUITE FAILED:', err);
    process.exit(1);
  }
};

runAiTests();
