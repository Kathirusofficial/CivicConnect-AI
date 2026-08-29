/**
 * Generate natural language executive explanation for predictive planning
 */
const generatePredictionExplanation = async (metrics) => {
  const { category, growthRate, complaintCount, hotspotArea, recommendedAction } = metrics;

  const fallback = `${category || 'Civic'} complaints increased by ${growthRate || '+25%'} over the observation window with ${complaintCount || 5} active reports concentrated in ${hotspotArea || 'the metropolitan area'}. Preventive intervention is recommended: ${recommendedAction || 'Schedule infrastructural inspection.'}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const prompt = `Convert the following calculated municipal metrics into a single concise, professional executive sentence for a Municipal Commissioner:
- Category: ${category}
- Intake Growth: ${growthRate}
- Incidents: ${complaintCount}
- Concentration Area: ${hotspotArea}
- Recommended Action: ${recommendedAction}

Rules:
1. Do NOT invent new numbers or statistics.
2. Use ONLY the provided factual data.
3. Be professional and actionable.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) {
        return text.trim();
      }
    }
  } catch (err) {
    // Return fallback on timeout or failure
  }

  return fallback;
};

module.exports = {
  generatePredictionExplanation
};
