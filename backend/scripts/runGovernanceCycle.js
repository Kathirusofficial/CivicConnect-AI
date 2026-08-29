require('dotenv').config();
const mongoose = require('mongoose');
const GovernanceCycle = require('../models/GovernanceCycle');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');

const { detectHotspots } = require('../services/hotspotService');
const { generateForecast } = require('../services/forecastService');
const { forecastDepartmentResources } = require('../services/resourceForecastService');
const { generatePreventiveActions } = require('../services/preventiveMaintenanceService');
const { evaluateEarlyWarnings } = require('../services/earlyWarningService');
const { runGovernanceOrchestration } = require('../services/governanceOrchestratorService');

const executeCycle = async () => {
  const startedAt = new Date();
  const errors = [];
  let complaintsAnalyzed = 0;
  let incidentsDetected = 0;
  let warningsGenerated = 0;
  let preventiveActionsGenerated = 0;
  let departmentsAtRisk = 0;

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicconnect');
    }

    complaintsAnalyzed = await Complaint.countDocuments();

    // 1. Hotspots
    try {
      await detectHotspots(1000);
    } catch (e) {
      errors.push(`Hotspots: ${e.message}`);
    }

    // 2. Forecasts & Dept Resources
    try {
      await generateForecast();
      const depts = await forecastDepartmentResources();
      departmentsAtRisk = depts.filter(d => d.overloadRisk === 'Overloaded' || d.workloadScore >= 70).length;
    } catch (e) {
      errors.push(`Forecasting: ${e.message}`);
    }

    // 3. Preventive Maintenance
    try {
      const actions = await generatePreventiveActions();
      preventiveActionsGenerated = actions.length;
    } catch (e) {
      errors.push(`PreventiveMaintenance: ${e.message}`);
    }

    // 4. Early Warnings
    try {
      const warnings = await evaluateEarlyWarnings();
      warningsGenerated = warnings.length;
    } catch (e) {
      errors.push(`EarlyWarnings: ${e.message}`);
    }

    // 5. Governance Orchestration & Incident Detection
    try {
      const incidents = await runGovernanceOrchestration();
      incidentsDetected = incidents.length;
    } catch (e) {
      errors.push(`GovernanceOrchestration: ${e.message}`);
    }

    const completedAt = new Date();
    const duration = completedAt - startedAt;
    const status = errors.length === 0 ? 'Success' : (incidentsDetected > 0 ? 'Partial' : 'Failed');

    const cycleLog = await GovernanceCycle.create({
      startedAt,
      completedAt,
      duration,
      complaintsAnalyzed,
      incidentsDetected,
      warningsGenerated,
      preventiveActionsGenerated,
      departmentsAtRisk,
      executionErrors: errors,
      status
    });

    console.log(`✅ Governance Cycle completed in ${duration}ms [Status: ${status}]. Incidents: ${incidentsDetected}, Warnings: ${warningsGenerated}`);
    return cycleLog;
  } catch (err) {
    console.error('❌ Governance Cycle Critical Failure:', err);
    return null;
  }
};

if (require.main === module) {
  executeCycle().then(() => process.exit(0));
}

module.exports = { executeCycle };
