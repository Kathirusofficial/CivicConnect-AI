require('dotenv').config();
const mongoose = require('mongoose');
const { recalculateAllActiveSLAs } = require('../services/slaService');

const run = async () => {
  try {
    console.log('🔄 STARTING SLA MONITORING & RECALCULATION JOB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicconnect');
    console.log('✅ MongoDB connected');

    const summary = await recalculateAllActiveSLAs();
    console.log('✅ SLA Recalculation Complete:');
    console.log(`   Total Active Evaluated: ${summary.totalChecked}`);
    console.log(`   Within SLA:             ${summary.withinSLA}`);
    console.log(`   At Risk:                ${summary.atRisk}`);
    console.log(`   Breached:               ${summary.breached}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ SLA recalculation failed:', err);
    process.exit(1);
  }
};

run();
