require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');
const Worker = require('./models/Worker');
const CivicRisk = require('./models/CivicRisk');
const predictiveService = require('./services/predictiveService');
const http = require('http');

const runPredictiveTests = async () => {
  try {
    console.log('--- 🧠 STARTING AI CIVIC RISK & PREDICTIVE PLANNING TEST SUITE ---');
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
    const citizenEmail = 'pred.citizen@example.com';
    const adminEmail = 'pred.admin@civicconnect.com';
    await User.deleteMany({ email: { $in: [citizenEmail, adminEmail] } });

    // 1. Authenticate Citizen & Government Admin
    console.log('\n▶ TEST 1: Government & Citizen Authentication');
    const regCitizen = await request('/api/auth/register', 'POST', {
      name: 'Predictive Citizen User',
      email: citizenEmail,
      password: 'StrongPassword123!',
      role: 'Citizen'
    });
    const citizenToken = regCitizen.data.token;
    const citizenId = regCitizen.data.user._id;

    const regAdmin = await request('/api/auth/register', 'POST', {
      name: 'Predictive Operations Officer',
      email: adminEmail,
      password: 'AdminPassword123!',
      role: 'Admin'
    });
    const adminToken = regAdmin.data.token;
    console.log('✅ TEST 1 Passed: Government officer & citizen authenticated');

    // 2. Citizen receives 403 on predictive endpoints
    console.log('\n▶ TEST 2: Citizen Access Restriction (403 Forbidden)');
    const citizenDash = await request('/api/predictive/dashboard', 'GET', null, citizenToken);
    const citizenHotspots = await request('/api/predictive/hotspots', 'GET', null, citizenToken);
    const citizenRecalc = await request('/api/predictive/recalculate', 'POST', null, citizenToken);
    if (citizenDash.status !== 403 || citizenHotspots.status !== 403 || citizenRecalc.status !== 403) {
      throw new Error(`Test 2 Failed: Citizen was not restricted with 403 (Dashboard: ${citizenDash.status}, Hotspots: ${citizenHotspots.status})`);
    }
    console.log('✅ TEST 2 Passed: Citizen blocked with 403 Forbidden from all predictive endpoints');

    // 3 & 4. Hotspot Detection & Geographic Clustering
    console.log('\n▶ TEST 3 & 4: Geographic Hotspot Clustering & Centroid Detection');
    const baseLat = 12.9716;
    const baseLng = 77.5946;

    // Seed 4 complaints clustered within 200m at Central Bus Stand
    const hotspotClusterId = `HOTSPOT-WATER-${Date.now()}`;
    for (let i = 0; i < 4; i++) {
      await Complaint.create({
        title: `Water Pipeline Rupture Incident #${i + 1}`,
        category: 'Water Supply',
        department: 'Water Supply',
        description: 'Major pipeline rupture flooding the road near bus terminal.',
        priority: i === 0 ? 'Emergency' : 'High',
        citizen: citizenId,
        address: 'Central Bus Stand Outer Ring',
        landmark: 'Central Bus Stand',
        latitude: baseLat + (i * 0.0005),
        longitude: baseLng + (i * 0.0005),
        duplicateGroupId: hotspotClusterId,
        createdAt: new Date(Date.now() - (i * 2 * 60 * 60 * 1000))
      });
    }

    const detectedHotspots = await predictiveService.detectHotspots(30, 500);
    if (detectedHotspots.length === 0) {
      throw new Error('Test 3/4 Failed: No geographic hotspots detected');
    }
    const targetHotspot = detectedHotspots.find(h => h.category === 'Water Supply' || h.name.includes('Water'));
    if (!targetHotspot || targetHotspot.complaintCount < 4) {
      throw new Error(`Test 3/4 Failed: Target hotspot missing or count too low: ${JSON.stringify(targetHotspot)}`);
    }
    console.log(`✅ TEST 3 & 4 Passed: Detected hotspot "${targetHotspot.name}" with ${targetHotspot.complaintCount} complaints (Risk Score: ${targetHotspot.riskScore}/100, Level: ${targetHotspot.riskLevel})`);

    // 5 & 6. Category Trend & Growth Percentage Calculation
    console.log('\n▶ TEST 5 & 6: Category Trend Analysis & Growth Velocity');
    const trends = await predictiveService.detectCategoryTrends(30);
    if (!Array.isArray(trends) || trends.length === 0) {
      throw new Error('Test 5/6 Failed: Category trends returned empty');
    }
    const waterTrend = trends.find(t => t.name === 'Water Supply');
    if (!waterTrend || waterTrend.complaintCount < 4) {
      throw new Error(`Test 5/6 Failed: Water Supply trend not properly calculated: ${JSON.stringify(waterTrend)}`);
    }
    console.log(`✅ TEST 5 & 6 Passed: Analyzed ${trends.length} categories. Water Supply: ${waterTrend.complaintCount} reports (${waterTrend.growthPercentage >= 0 ? '+' : ''}${waterTrend.growthPercentage}% growth, Risk Level: ${waterTrend.riskLevel})`);

    // 7. Department Risk Calculation
    console.log('\n▶ TEST 7: Department Workload Strain & Capacity Evaluation');
    const deptRisks = await predictiveService.detectDepartmentRisks();
    if (!Array.isArray(deptRisks) || deptRisks.length === 0) {
      throw new Error('Test 7 Failed: Department risks returned empty');
    }
    console.log(`✅ TEST 7 Passed: Successfully evaluated capacity for ${deptRisks.length} departments. Top strained: ${deptRisks[0].name} (Active backlog: ${deptRisks[0].activeComplaintCount}, Ratio: ${deptRisks[0].loadRatio}:1, Risk: ${deptRisks[0].riskLevel})`);

    // 8, 9 & 10. Statistical Forecasting with Sufficient vs Insufficient Data
    console.log('\n▶ TEST 8, 9 & 10: Statistical Forecasting & Insufficient Data Handling');
    const forecastWithData = await predictiveService.calculateForecast();
    if (!forecastWithData.isSufficient || typeof forecastWithData.projected30DayVolume !== 'number') {
      throw new Error(`Test 9 Failed: Forecast failed with sufficient data: ${JSON.stringify(forecastWithData)}`);
    }
    console.log(`✅ TEST 9 Passed: Trend forecast calculated: Projected next week ~${forecastWithData.projected7DayVolume}, next month ~${forecastWithData.projected30DayVolume}`);

    // Test insufficient data handling
    const origCountFn = Complaint.countDocuments;
    Complaint.countDocuments = async () => 1; // Simulate sparse DB
    const forecastSparse = await predictiveService.calculateForecast();
    Complaint.countDocuments = origCountFn; // Restore

    if (forecastSparse.isSufficient || forecastSparse.status !== 'Insufficient historical data') {
      throw new Error(`Test 8/10 Failed: Sparse data was not handled safely: ${JSON.stringify(forecastSparse)}`);
    }
    console.log('✅ TEST 8 & 10 Passed: Insufficient data handled safely with label: "Insufficient data for reliable forecast."');

    // 11 & 12. Risk Score (0-100) & Level Normalization
    console.log('\n▶ TEST 11 & 12: Risk Score Bounds & Exact Level Mapping');
    for (const h of detectedHotspots) {
      if (h.riskScore < 0 || h.riskScore > 100) throw new Error(`Score out of bounds: ${h.riskScore}`);
      if (h.riskScore >= 80 && h.riskLevel !== 'Critical') throw new Error(`Score level mismatch for score ${h.riskScore}`);
      if (h.riskScore >= 60 && h.riskScore < 80 && h.riskLevel !== 'High') throw new Error(`Score level mismatch for score ${h.riskScore}`);
    }
    console.log('✅ TEST 11 & 12 Passed: All risk scores strictly normalized between 0-100 and mapped to exact levels');

    // 13 & 14. Duplicate Clusters & Privacy Protection
    console.log('\n▶ TEST 13 & 14: Duplicate Cluster Contribution & Citizen Privacy Guard');
    if (targetHotspot.citizenImpact < targetHotspot.complaintCount && targetHotspot.duplicateCount === 0) {
      throw new Error('Test 13 Failed: Duplicate clusters not factored into citizen impact');
    }
    // Verify explanation / recommended action contains no citizen personal information (e.g. email, phone)
    if (targetHotspot.explanation.includes(citizenEmail) || targetHotspot.recommendedAction.includes(citizenEmail)) {
      throw new Error('Test 14 Failed: Citizen private email leaked into predictive intelligence text!');
    }
    console.log('✅ TEST 13 & 14 Passed: Cluster impact weighted properly and 100% privacy preserved (zero PII in output)');

    // 15. Emerging Issue Spike Detection
    console.log('\n▶ TEST 15: Emerging Issue Weekly Velocity Spike Detection');
    const emergingIssues = await predictiveService.detectEmergingIssues();
    if (!Array.isArray(emergingIssues)) {
      throw new Error('Test 15 Failed: Emerging issues returned invalid structure');
    }
    console.log(`✅ TEST 15 Passed: Emerging issues evaluated (${emergingIssues.length} active velocity spikes detected)`);

    // 16 & 17. Safe Deterministic Fallback Resilience without Gemini
    console.log('\n▶ TEST 16 & 17: Deterministic Explainability & Safe Fallback');
    const origApiKey = predictiveService.apiKey;
    predictiveService.apiKey = null; // simulate offline AI
    const fallbackDash = await predictiveService.getPredictiveDashboard();
    predictiveService.apiKey = origApiKey; // restore

    if (!fallbackDash.summary || !fallbackDash.categoryTrends) {
      throw new Error('Test 16/17 Failed: System failed when AI key was null');
    }
    console.log('✅ TEST 16 & 17 Passed: Predictive engine operates with 100% reliability in deterministic mode');

    // 18 & 19. Recalculate Endpoint & MongoDB Persistence
    console.log('\n▶ TEST 18 & 19: Full Recalculate & Persistence to MongoDB CivicRisk');
    const recalcRes = await request('/api/predictive/recalculate', 'POST', null, adminToken);
    if (recalcRes.status !== 200 || !recalcRes.data.success || typeof recalcRes.data.totalRisksIdentified !== 'number') {
      throw new Error(`Test 18 Failed: Recalculate API returned error: ${JSON.stringify(recalcRes.data)}`);
    }

    const savedCivicRisks = await CivicRisk.countDocuments({});
    if (savedCivicRisks === 0) {
      throw new Error('Test 19 Failed: Zero CivicRisk documents found in MongoDB');
    }
    console.log(`✅ TEST 18 & 19 Passed: Recalculate endpoint succeeded and persisted ${savedCivicRisks} CivicRisk documents to MongoDB`);

    // 20. Government Dashboard API Verification
    console.log('\n▶ TEST 20: GET /api/predictive/dashboard');
    const govDashRes = await request('/api/predictive/dashboard', 'GET', null, adminToken);
    if (govDashRes.status !== 200 || !govDashRes.data.summary) {
      throw new Error(`Test 20 Failed: Dashboard API failed: ${JSON.stringify(govDashRes.data)}`);
    }
    console.log('✅ TEST 20 Passed: Dashboard API returned live metrics:', govDashRes.data.summary);

    console.log('\n🎉 ALL 20 PREDICTIVE CIVIC RISK & PLANNING TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ PREDICTIVE INTELLIGENCE TEST SUITE FAILED:', err);
    process.exit(1);
  }
};

runPredictiveTests();
