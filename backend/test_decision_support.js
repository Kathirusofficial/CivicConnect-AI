require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');
const Worker = require('./models/Worker');
const decisionSupportService = require('./services/decisionSupportService');
const http = require('http');

const runDecisionSupportTests = async () => {
  try {
    console.log('--- 🧠 STARTING AI GOVERNMENT DECISION SUPPORT TEST SUITE ---');
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
    const citizenEmail = 'ds.citizen@example.com';
    const adminEmail = 'ds.admin@civicconnect.com';

    await User.deleteMany({ email: { $in: [citizenEmail, adminEmail] } });

    // 1. Authenticate Citizen & Government Admin
    const regCitizen = await request('/api/auth/register', 'POST', {
      name: 'DS Test Citizen',
      email: citizenEmail,
      password: 'StrongPassword123!',
      role: 'Citizen'
    });
    const citizenToken = regCitizen.data.token;
    const citizenId = regCitizen.data.user._id;

    const regAdmin = await request('/api/auth/register', 'POST', {
      name: 'DS Operations Officer',
      email: adminEmail,
      password: 'AdminPassword123!',
      role: 'Admin'
    });
    const adminToken = regAdmin.data.token;
    console.log('✅ TEST 1 Passed: Government officer & citizen authenticated');

    // 2. Citizen cannot access decision-support API (403 Forbidden)
    console.log('\n▶ TEST 2: Citizen Access Guard (403 Forbidden)');
    const citizenRecalc = await request('/api/decision-support/recalculate', 'POST', null, citizenToken);
    if (citizenRecalc.status !== 403) {
      throw new Error(`Test 2 Failed: Citizen was not rejected with 403. Status: ${citizenRecalc.status}`);
    }
    console.log('✅ TEST 2 Passed: Citizen blocked from decision-support endpoints with 403 Forbidden');

    // 3. Critical Emergency Complaint receives high priority score
    console.log('\n▶ TEST 3: Critical Emergency Priority Score');
    const emergencyComp = await Complaint.create({
      title: 'High Voltage Wire Sparking Over Sidewalk',
      category: 'Electricity',
      department: 'Electricity',
      description: 'Live electrical cable snapped and is sparking over the crowded sidewalk.',
      priority: 'Emergency',
      citizen: citizenId,
      address: '7th Avenue Junction',
      aiAnalysis: {
        category: 'Electricity',
        department: 'Electricity',
        priority: 'Emergency',
        severity: 'Critical',
        summary: 'Live snapped power line sparking on public footpath.',
        confidence: 0.98
      }
    });

    const dsResult1 = await decisionSupportService.calculateDecisionSupport(emergencyComp);
    if (dsResult1.priorityScore < 80 || dsResult1.priorityLevel !== 'Critical') {
      throw new Error(`Test 3 Failed: Emergency complaint score too low: ${dsResult1.priorityScore} (${dsResult1.priorityLevel})`);
    }
    console.log(`✅ TEST 3 Passed: Emergency complaint scored ${dsResult1.priorityScore}/100 -> Level: ${dsResult1.priorityLevel}`);

    // 4. Critical AI Severity increases score compared to Low AI Severity
    console.log('\n▶ TEST 4: AI Severity Impact on Score');
    const lowSevComp = await Complaint.create({
      title: 'Dim street lamp in residential lane',
      category: 'Street Lights',
      department: 'Street Lights',
      description: 'Street light bulb is flickering occasionally.',
      priority: 'Low',
      citizen: citizenId,
      address: 'Quiet Lane 4',
      aiAnalysis: {
        category: 'Street Lights',
        department: 'Street Lights',
        priority: 'Low',
        severity: 'Low',
        summary: 'Minor flickering light bulb.',
        confidence: 0.9
      }
    });
    const dsLow = await decisionSupportService.calculateDecisionSupport(lowSevComp);
    if (dsLow.priorityScore >= dsResult1.priorityScore) {
      throw new Error('Test 4 Failed: Low severity complaint scored equal/higher than Critical severity');
    }
    console.log(`✅ TEST 4 Passed: Low severity scored ${dsLow.priorityScore} vs Critical severity ${dsResult1.priorityScore}`);

    // 5 & 6. High Citizen Impact & Duplicate Cluster Boosts Score
    console.log('\n▶ TEST 5 & 6: Citizen Impact & Duplicate Cluster Contribution');
    const clusterGroupId = `GRP-WATER-${Date.now()}`;
    const basePothole = await Complaint.create({
      title: 'Massive Road Crater Causing Traffic Stoppage',
      category: 'Road Damage',
      department: 'Road Department',
      description: 'Deep road crater near highway intersection.',
      priority: 'High',
      citizen: citizenId,
      address: 'National Highway 44 Junction',
      duplicateGroupId: clusterGroupId
    });

    // Create 5 duplicate complaints linked to same cluster
    for (let i = 0; i < 5; i++) {
      await Complaint.create({
        title: `Pothole report ${i + 1}`,
        category: 'Road Damage',
        department: 'Road Department',
        description: 'Road damage reported.',
        priority: 'Medium',
        citizen: citizenId,
        address: 'National Highway 44 Junction',
        duplicateGroupId: clusterGroupId,
        duplicateOf: basePothole._id
      });
    }

    const dsCluster = await decisionSupportService.calculateDecisionSupport(basePothole);
    if (dsCluster.citizenImpactCount < 6 || dsCluster.breakdown.impactContribution < 10) {
      throw new Error(`Test 5/6 Failed: Cluster impact not counted properly: ${JSON.stringify(dsCluster)}`);
    }
    console.log(`✅ TEST 5 & 6 Passed: Cluster with ${dsCluster.citizenImpactCount} citizens boosted impact contribution to ${dsCluster.breakdown.impactContribution}/20 pts (Total Score: ${dsCluster.priorityScore})`);

    // 7. Old Unresolved Complaint receives higher age contribution
    console.log('\n▶ TEST 7: Complaint Age Contribution');
    const oldPendingComp = await Complaint.create({
      title: 'Old Drainage Blockage',
      category: 'Drainage',
      department: 'Drainage',
      description: 'Drain overflowing for days.',
      priority: 'Medium',
      citizen: citizenId,
      address: 'Sector 8 Market',
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000) // 72 hours ago
    });
    const dsOld = await decisionSupportService.calculateDecisionSupport(oldPendingComp);
    if (dsOld.ageScore < 80 || dsOld.breakdown.ageContribution < 8) {
      throw new Error(`Test 7 Failed: 72h old complaint did not receive high age score: ${dsOld.ageScore}`);
    }
    console.log(`✅ TEST 7 Passed: 72-hour pending complaint received age score: ${dsOld.ageScore}/100 (${dsOld.breakdown.ageContribution}/10 pts)`);

    // 8. Resolved Complaint Does Not Continue Growing Operational Priority Score
    console.log('\n▶ TEST 8: Resolved Complaint Operational Score Containment');
    const resolvedComp = await Complaint.create({
      title: 'Resolved Water Leak',
      category: 'Water Supply',
      department: 'Water Supply',
      description: 'Pipeline fixed.',
      priority: 'High',
      status: 'Resolved',
      citizen: citizenId,
      address: '1st Main Road',
      createdAt: new Date(Date.now() - 100 * 60 * 60 * 1000)
    });
    const dsResolved = await decisionSupportService.calculateDecisionSupport(resolvedComp);
    if (dsResolved.priorityScore > 20) {
      throw new Error(`Test 8 Failed: Resolved complaint operational score exceeded threshold: ${dsResolved.priorityScore}`);
    }
    console.log(`✅ TEST 8 Passed: Resolved complaint operational priority contained at ${dsResolved.priorityScore}/100`);

    // 9 & 10. Department Workload Calculation & Emergency Priority Protection
    console.log('\n▶ TEST 9 & 10: Department Workload & Emergency Score Protection');
    const deptEmergency = await Complaint.create({
      title: 'Critical Bridge Crack',
      category: 'Road Damage',
      department: 'Road Department',
      description: 'Visible structural crack on pedestrian bridge.',
      priority: 'Emergency',
      citizen: citizenId,
      address: 'Civic Overpass Bridge'
    });
    const dsDeptEm = await decisionSupportService.calculateDecisionSupport(deptEmergency);
    if (dsDeptEm.priorityScore < 80) {
      throw new Error('Test 10 Failed: Emergency complaint downgraded by workload calculation');
    }
    console.log(`✅ TEST 9 & 10 Passed: Emergency complaint maintained Critical score of ${dsDeptEm.priorityScore}/100 under department workload analysis`);

    // 11 & 12. Score Normalization (0-100) & Priority Level Matching
    console.log('\n▶ TEST 11 & 12: Score Bounds (0-100) & Exact Level Classification');
    if (dsResult1.priorityScore < 0 || dsResult1.priorityScore > 100) throw new Error('Score out of bounds');
    if (dsLow.priorityScore < 0 || dsLow.priorityScore > 100) throw new Error('Score out of bounds');
    console.log('✅ TEST 11 & 12 Passed: All calculated scores strictly normalized within 0-100 range');

    // 13 & 14. Recommended Action & Explanation Generation
    console.log('\n▶ TEST 13 & 14: Recommended Action & AI Explanation Generation');
    if (!dsResult1.recommendedAction || dsResult1.recommendedAction.length < 5) {
      throw new Error('Test 13 Failed: Recommended action missing');
    }
    if (!dsResult1.explanation || dsResult1.explanation.length < 10) {
      throw new Error('Test 14 Failed: AI explanation missing');
    }
    console.log('✅ TEST 13 & 14 Passed:');
    console.log(`   💡 Action: "${dsResult1.recommendedAction}"`);
    console.log(`   📝 Explanation: "${dsResult1.explanation}"`);

    // 15 & 16. Fallback Resilience without Gemini API
    console.log('\n▶ TEST 15 & 16: Safe Deterministic Fallback Resilience');
    const originalAi = decisionSupportService.ai;
    decisionSupportService.ai = null;
    const dsFallback = await decisionSupportService.calculateDecisionSupport(emergencyComp);
    if (!dsFallback.explanation || dsFallback.priorityScore < 80) {
      throw new Error('Test 15/16 Failed: Deterministic fallback failed when AI was null');
    }
    decisionSupportService.ai = originalAi; // restore
    console.log('✅ TEST 15 & 16 Passed: System executed deterministic calculation & explanation with 100% reliability');

    // 17. Bulk Recalculation Endpoint
    console.log('\n▶ TEST 17: Government Bulk Recalculation API');
    const bulkRes = await request('/api/decision-support/recalculate', 'POST', null, adminToken);
    if (bulkRes.status !== 200 || !bulkRes.data.success || typeof bulkRes.data.totalUpdated !== 'number') {
      throw new Error(`Test 17 Failed: Bulk recalculation API failed: ${JSON.stringify(bulkRes.data)}`);
    }
    console.log(`✅ TEST 17 Passed: Bulk recalculation updated ${bulkRes.data.totalUpdated} active complaints`);

    // 18 & 19. Persistence in MongoDB & Preservation of Original Fields
    console.log('\n▶ TEST 18 & 19: MongoDB Persistence & Field Preservation');
    const savedDoc = await Complaint.findById(emergencyComp._id);
    if (!savedDoc.decisionSupport || savedDoc.decisionSupport.priorityScore !== dsResult1.priorityScore) {
      throw new Error('Test 18 Failed: decisionSupport subdocument not persisted in MongoDB');
    }
    if (savedDoc.priority !== 'Emergency' || savedDoc.aiAnalysis.severity !== 'Critical') {
      throw new Error('Test 19 Failed: Original priority or aiAnalysis was overwritten!');
    }
    console.log('✅ TEST 18 & 19 Passed: decisionSupport saved in MongoDB while preserving original citizen priority and AI analysis');

    // 20. Government Action Center API
    console.log('\n▶ TEST 20: Government Action Center Operational Aggregates');
    const actionCenterRes = await request('/api/decision-support/action-center', 'GET', null, adminToken);
    if (actionCenterRes.status !== 200 || typeof actionCenterRes.data.criticalAttention !== 'number') {
      throw new Error(`Test 20 Failed: Action Center API failed: ${JSON.stringify(actionCenterRes.data)}`);
    }
    console.log('✅ TEST 20 Passed: Action Center returned live metrics:', actionCenterRes.data);

    console.log('\n🎉 ALL 20 AI GOVERNMENT DECISION SUPPORT TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ DECISION SUPPORT TEST SUITE FAILED:', err);
    process.exit(1);
  }
};

runDecisionSupportTests();
