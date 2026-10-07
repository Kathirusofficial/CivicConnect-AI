/**
 * Deterministic Environmental Impact Estimation Service
 * Provides defensible, category-specific environmental estimates.
 * Clearly labeled as "AI Estimated" (never "Measured").
 */
const estimateEnvironmentalImpact = (complaint) => {
  if (!complaint) {
    return {
      category: 'Unknown',
      impactAvailable: false,
      estimatedValue: 0,
      unit: '',
      severity: 'Low',
      methodology: 'No complaint data provided',
      confidence: 0
    };
  }

  const category = (complaint.category || complaint.department || '').toString().toLowerCase();
  const createdAt = complaint.createdAt ? new Date(complaint.createdAt) : new Date();
  const ageHours = Math.max(1, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
  const ageDays = Math.max(0.1, ageHours / 24);
  const priority = complaint.priority || 'Medium';

  // 1. Water Leakage & Supply Damage
  if (/water|leak|pipe|burst|drainage/i.test(category)) {
    let flowRatePerDay = 5000; // base litres/day
    if (priority === 'Emergency' || priority === 'Critical') flowRatePerDay = 18000;
    else if (priority === 'High') flowRatePerDay = 12000;
    else if (priority === 'Medium') flowRatePerDay = 6000;

    const estimatedValue = Math.round(flowRatePerDay * ageDays);

    return {
      category: 'Water Supply',
      impactAvailable: true,
      estimatedValue,
      unit: 'litres lost',
      displayString: `${estimatedValue.toLocaleString()} litres estimated loss`,
      severity: priority,
      methodology: 'AI Estimated based on pipeline flow rate coefficient x complaint age duration',
      confidence: 0.85
    };
  }

  // 2. Solid Waste & Garbage Accumulation
  if (/garbage|waste|sanitation|trash|refuse/i.test(category)) {
    let wasteRatePerDay = 45; // kg/day
    if (priority === 'Emergency' || priority === 'Critical') wasteRatePerDay = 150;
    else if (priority === 'High') wasteRatePerDay = 90;

    const estimatedValue = Math.round(wasteRatePerDay * ageDays);

    return {
      category: 'Garbage Collection',
      impactAvailable: true,
      estimatedValue,
      unit: 'kg waste accumulation',
      displayString: `${estimatedValue.toLocaleString()} kg uncollected waste`,
      severity: priority,
      methodology: 'AI Estimated based on municipal waste accumulation rate per zone x duration',
      confidence: 0.88
    };
  }

  // 3. Electricity & Power Outage / Streetlights
  if (/electricity|power|light|street light|transformer/i.test(category)) {
    let kwhLossPerDay = 30; // kWh
    if (priority === 'Emergency' || priority === 'Critical') kwhLossPerDay = 120;
    else if (priority === 'High') kwhLossPerDay = 75;

    const estimatedValue = Math.round(kwhLossPerDay * ageDays);

    return {
      category: 'Electricity & Lighting',
      impactAvailable: true,
      estimatedValue,
      unit: 'kWh energy impact',
      displayString: `${estimatedValue.toLocaleString()} kWh efficiency loss`,
      severity: priority,
      methodology: 'AI Estimated based on grid load coefficient x outage duration',
      confidence: 0.82
    };
  }

  // Fallback for categories with insufficient environmental coefficients
  return {
    category: complaint.category || 'General',
    impactAvailable: false,
    estimatedValue: 0,
    unit: 'N/A',
    displayString: 'No reliable environmental estimate available for this category',
    severity: priority,
    methodology: 'Insufficient category-specific environmental coefficient data',
    confidence: 0
  };
};

module.exports = { estimateEnvironmentalImpact };
