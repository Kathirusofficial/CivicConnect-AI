const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const GovernanceIncident = require('./models/GovernanceIncident');
const GovernanceAction = require('./models/GovernanceAction');
const User = require('./models/User');

const ACTION_TYPES_TO_TEST = [
  'Drainage Cleaning',
  'Road Repair',
  'Water Supply Repair',
  'Electricity Repair',
  'Garbage Collection',
  'Street Light Repair',
  'Traffic Management',
  'Emergency Response',
  'Infrastructure Maintenance',
  'Preventive Maintenance',
  'Deploy Workers',
  'Public Advisory',
  'Inspect',
  'Repair',
  'Monitor',
  'Increase Capacity',
  'Other'
];

async function runTest() {
  console.log('🚀 Starting Governance Action Enum & Action Plan Validation Test...');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/civicconnect';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Find or create admin user for createdBy
  let admin = await User.findOne({ role: 'Admin' });
  if (!admin) {
    admin = await User.create({
      name: 'System Admin',
      email: 'sysadmin@civicconnect.test',
      password: 'hashedpassword123',
      role: 'Admin'
    });
  }

  // Create a test Governance Incident
  const testIncident = await GovernanceIncident.create({
    title: 'Test Incident: Drainage Clog in Ward 12',
    description: 'Severe stormwater drain overflow detected.',
    incidentType: 'Infrastructure Risk',
    category: 'Drainage',
    department: 'Drainage',
    area: 'Ward 12 South',
    severity: 'WARNING',
    riskScore: 78,
    dedupKey: `INC_TEST_VALIDATION_${Date.now()}`,
    recommendedAction: 'Dispatch drainage clearing unit to clear blockage.'
  });
  console.log(`✅ Test Incident created: #${testIncident._id}`);

  console.log('\n--- Testing all action types ---');
  for (const actionType of ACTION_TYPES_TO_TEST) {
    try {
      const action = await GovernanceAction.create({
        incidentId: testIncident._id,
        actionType: actionType,
        title: `Action Plan: ${actionType} at Ward 12`,
        description: `Automated test execution for ${actionType}`,
        department: 'Drainage',
        priority: 'High',
        requiredWorkers: 4,
        estimatedDuration: '2 days',
        status: 'Approved',
        createdBy: admin._id
      });

      // Query it back from MongoDB to verify persistence
      const persisted = await GovernanceAction.findById(action._id);
      if (!persisted || persisted.actionType !== actionType) {
        throw new Error(`Persisted actionType does not match: expected "${actionType}", got "${persisted?.actionType}"`);
      }

      console.log(`  ✅ [PASSED] actionType "${actionType}" successfully created and saved (ID: ${action._id})`);
    } catch (err) {
      console.error(`  ❌ [FAILED] actionType "${actionType}":`, err.message);
      throw err;
    }
  }

  // Verify finding all actions for the incident
  const allActions = await GovernanceAction.find({ incidentId: testIncident._id }).lean();
  console.log(`\n✅ Verified: ${allActions.length}/${ACTION_TYPES_TO_TEST.length} action plans saved in MongoDB for test incident.`);

  // Cleanup test data
  await GovernanceAction.deleteMany({ incidentId: testIncident._id });
  await GovernanceIncident.findByIdAndDelete(testIncident._id);
  console.log('🧹 Test cleanup completed.');

  console.log('\n🎉 ALL GOVERNANCE ACTION VALIDATION TESTS PASSED PERFECTLY!\n');
  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
