const Complaint = require('../models/Complaint');

/**
 * Calculate statistical trend and linear projection
 */
const calculateTrendProjection = (counts7d, counts30d, counts90d, totalComplaints) => {
  if (totalComplaints === 0) {
    return {
      next7Days: 0,
      next30Days: 0,
      trendPercentage: '+0%',
      confidence: 0.1,
      explanation: 'Insufficient historical grievance data to establish reliable projection.'
    };
  }

  // Daily run-rates
  const dailyRate7d = counts7d / 7;
  const dailyRate30d = counts30d > 0 ? counts30d / 30 : dailyRate7d;
  const dailyRate90d = counts90d > 0 ? counts90d / 90 : dailyRate30d;

  // Weighted daily velocity (give more weight to recent 7d & 30d momentum)
  const weightedDaily = (dailyRate7d * 0.5) + (dailyRate30d * 0.35) + (dailyRate90d * 0.15);

  const next7Days = Math.max(1, Math.round(weightedDaily * 7));
  const next30Days = Math.max(2, Math.round(weightedDaily * 30));

  // Trend percentage (comparing 7d pace to baseline 30d pace)
  let trendPct = 0;
  if (dailyRate30d > 0) {
    trendPct = Math.round(((dailyRate7d - dailyRate30d) / dailyRate30d) * 100);
  }

  const trendPercentage = `${trendPct >= 0 ? '+' : ''}${trendPct}%`;

  // Confidence based on sample size and observation span
  let confidence = 0.55;
  if (totalComplaints >= 50) confidence = 0.92;
  else if (totalComplaints >= 20) confidence = 0.85;
  else if (totalComplaints >= 5) confidence = 0.70;

  const momentumWord = trendPct > 15 ? 'accelerating rapidly' : trendPct > 0 ? 'increasing moderately' : trendPct < -15 ? 'declining noticeably' : 'remaining stable';

  const explanation = `Based on historical intake analysis across 7d (${counts7d}), 30d (${counts30d}), and 90d (${counts90d}) windows, grievance volume is ${momentumWord} at ${weightedDaily.toFixed(1)} reports/day.`;

  return {
    next7Days,
    next30Days,
    trendPercentage,
    confidence,
    explanation
  };
};

/**
 * Generate municipal forecast with optional category/dept filters
 */
const generateForecast = async (filter = {}) => {
  const query = {};
  if (filter.category) query.category = filter.category;
  if (filter.department) query.department = filter.department;
  if (filter.area) query.address = { $regex: filter.area, $options: 'i' };

  const allComplaints = await Complaint.find(query).select('createdAt category department address').lean();
  const totalCount = allComplaints.length;

  const now = Date.now();
  const t7d = now - 7 * 24 * 36e5;
  const t30d = now - 30 * 24 * 36e5;
  const t90d = now - 90 * 24 * 36e5;

  let c7d = 0;
  let c30d = 0;
  let c90d = 0;

  for (const c of allComplaints) {
    const time = new Date(c.createdAt || now).getTime();
    if (time >= t7d) c7d++;
    if (time >= t30d) c30d++;
    if (time >= t90d) c90d++;
  }

  // If testing with fresh seeded records (all created just now)
  if (totalCount > 0 && c7d === totalCount) {
    c30d = totalCount;
    c90d = totalCount;
  }

  const projection = calculateTrendProjection(c7d, c30d, c90d, totalCount);

  // Forecast breakdown by Category
  const categoryMap = {};
  for (const c of allComplaints) {
    const cat = c.category || 'General';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  }

  const categoryForecasts = Object.keys(categoryMap).map(cat => {
    const count = categoryMap[cat];
    const cat7d = Math.max(1, Math.round((count / totalCount) * projection.next7Days));
    const cat30d = Math.max(1, Math.round((count / totalCount) * projection.next30Days));
    return {
      category: cat,
      currentCount: count,
      predictedNext7Days: cat7d,
      predictedNext30Days: cat30d,
      share: `${Math.round((count / totalCount) * 100)}%`
    };
  });

  return {
    totalHistoricalComplaints: totalCount,
    filterApplied: filter,
    predictedVolume: {
      next7Days: projection.next7Days,
      next30Days: projection.next30Days
    },
    trendPercentage: projection.trendPercentage,
    confidence: projection.confidence,
    explanation: projection.explanation,
    categoryForecasts: categoryForecasts.sort((a, b) => b.predictedNext7Days - a.predictedNext7Days)
  };
};

module.exports = {
  generateForecast,
  calculateTrendProjection
};
