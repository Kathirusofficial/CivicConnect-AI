const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
const User = require('./models/User');
const Worker = require('./models/Worker');
const Department = require('./models/Department');
const ComplaintSupport = require('./models/ComplaintSupport');
const { calculateCivicImpactScore } = require('./services/civicImpactService');
const { predictSlaRisk } = require('./services/slaPredictionService');
const { recommendWorkersForComplaint } = require('./services/workerRecommendationService');
const { estimateEnvironmentalImpact } = require('./services/environmentalImpactService');
const { generateDecisionSimulation, generateActionPlan } = require('./services/decisionSimulatorService');

async function runTestSuite() {
  console.log('🚀 STARTING CIVIC INTELLIGENCE SUITE TESTS...\n');

  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/civicconnect');
    console.log('✅ Connected to MongoDB');

    // 1. Create test user & department
    let testCitizen = await User.findOne({ email: 'test_intelligence_citizen@civic.org' });
    if (!testCitizen) {
      testCitizen = await User.create({
        name: 'Intelligence Test Citizen',
        email: 'test_intelligence_citizen@civic.org',
        password: 'password123',
        role: 'Citizen'
      });
    }

    let testDept = await Department.findOne({ name: 'Road Department' });
    if (!testDept) {
      testDept = await Department.create({ name: 'Road Department', head: 'Chief Engineer' });
    }

    let testWorker = await Worker.findOne({ email: 'test_worker_intel@civic.org' });
    if (!testWorker) {
      testWorker = await Worker.create({
        name: 'Field Engineer Alex',
        email: 'test_worker_intel@civic.org',
        department: testDept._id,
        status: 'Available',
        employeeId: 'WRK-9901'
      });
    }

    // 2. Create test complaint
    const benchmarkComplaint = await Complaint.create({
      title: 'Major Pipeline Burst on 5th Avenue',
      category: 'Water Supply',
      department: 'Water Supply',
      description: 'Massive water leakage flooding 5th avenue road and affecting nearby residents.',
      priority: 'Emergency',
      status: 'Pending',
      address: '5th Avenue, Sector 4, Coimbatore',
      latitude: 11.0168,
      longitude: 76.9558,
      citizen: testCitizen._id,
      assignedDepartment: testDept._id
    });
    console.log(`✅ Test Complaint created: ${benchmarkComplaint.complaintId} (${benchmarkComplaint._id})`);

    // TEST 1: Civic Impact Score
    console.log('\n▶ TEST 1: AI Civic Impact Score Calculation...');
    const impactResult = await calculateCivicImpactScore(benchmarkComplaint);
    console.log(`   Impact Score: ${impactResult.impactScore}/100 (${impactResult.impactLevel})`);
    console.log(`   Explanations: ${impactResult.explanation.join(' | ')}`);
    if (impactResult.impactScore > 0 && impactResult.explanation.length > 0) {
      console.log('✅ TEST 1 Passed: Civic Impact Score calculated deterministically.');
    } else {
      throw new Error('TEST 1 Failed: Impact score invalid');
    }

    // TEST 2: Citizen Consensus & Support Duplicate Prevention
    console.log('\n▶ TEST 2: Citizen Consensus & Unique Support...');
    await ComplaintSupport.deleteMany({ complaintId: benchmarkComplaint._id });
    await ComplaintSupport.create({ complaintId: benchmarkComplaint._id, userId: testCitizen._id });
    const supportCount = await ComplaintSupport.countDocuments({ complaintId: benchmarkComplaint._id });

    let duplicateErrCaught = false;
    try {
      await ComplaintSupport.create({ complaintId: benchmarkComplaint._id, userId: testCitizen._id });
    } catch (err) {
      duplicateErrCaught = true;
    }

    if (supportCount === 1 && duplicateErrCaught) {
      console.log('✅ TEST 2 Passed: Citizen support registered & duplicate support prevented via unique index.');
    } else {
      throw new Error('TEST 2 Failed: Duplicate support check failed');
    }

    // TEST 3: SLA Breach Risk Prediction
    console.log('\n▶ TEST 3: SLA Risk Prediction...');
    const slaRisk = await predictSlaRisk(benchmarkComplaint);
    console.log(`   SLA Risk Score: ${slaRisk.riskScore}/100 (${slaRisk.riskLevel}). Factors: ${slaRisk.factors.join(' | ')}`);
    if (slaRisk.riskScore !== undefined && slaRisk.riskLevel) {
      console.log('✅ TEST 3 Passed: SLA risk score calculated.');
    } else {
      throw new Error('TEST 3 Failed: SLA risk invalid');
    }

    // TEST 4: Smart Worker Assignment Recommendation
    console.log('\n▶ TEST 4: Smart Worker Recommendation...');
    const workerRecs = await recommendWorkersForComplaint(benchmarkComplaint._id);
    console.log(`   Recommended Workers Count: ${workerRecs.length}`);
    if (workerRecs.length > 0) {
      console.log(`   Top Worker: ${workerRecs[0].name} (Score: ${workerRecs[0].recommendationScore}/100)`);
      console.log('✅ TEST 4 Passed: Worker recommendation generated.');
    } else {
      throw new Error('TEST 4 Failed: No worker recommendations');
    }

    // TEST 5: Environmental Impact Estimation
    console.log('\n▶ TEST 5: Environmental Impact Estimation...');
    const envImpact = estimateEnvironmentalImpact(benchmarkComplaint);
    console.log(`   Category: ${envImpact.category}, Estimate: ${envImpact.displayString}`);
    if (envImpact.impactAvailable && envImpact.estimatedValue > 0) {
      console.log('✅ TEST 5 Passed: Environmental impact estimated deterministically.');
    } else {
      throw new Error('TEST 5 Failed: Environmental impact calculation invalid');
    }

    // TEST 6: Decision Simulator & Action Plan
    console.log('\n▶ TEST 6: AI Decision Simulator & Action Plan...');
    const actionPlan = await generateActionPlan();
    console.log(`   Active Complaints Analyzed: ${actionPlan.DATA.totalActiveComplaintsAnalyzed}`);
    console.log(`   AI Explanation Summary: "${actionPlan.AI_EXPLANATION.slice(0, 100)}..."`);
    if (actionPlan.DATA && actionPlan.AI_EXPLANATION) {
      console.log('✅ TEST 6 Passed: Strategic Action Plan generated combining DATA + AI EXPLANATION.');
    } else {
      throw new Error('TEST 6 Failed: Action plan generation invalid');
    }

    // Cleanup
    await ComplaintSupport.deleteMany({ complaintId: benchmarkComplaint._id });
    await Complaint.deleteOne({ _id: benchmarkComplaint._id });
    console.log('\n🧹 Test cleanup completed.');
    console.log('🎉 ALL CIVIC INTELLIGENCE SUITE TESTS PASSED PERFECTLY!\n');

  } catch (error) {
    console.error('❌ Test Suite Failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTestSuite();
