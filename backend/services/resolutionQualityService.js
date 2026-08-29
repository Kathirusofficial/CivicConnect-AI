/**
 * Deterministic Resolution Quality Scoring Engine
 */
const calculateDeterministicQuality = (complaint) => {
  let evidenceScore = 0;
  let completionScore = 0;
  let feedbackScore = 0;
  let processScore = 0;
  let verificationScore = 0;

  // 1. Evidence Quality (25 pts)
  const evidenceList = complaint.evidence || [];
  const hasBefore = evidenceList.some(e => e.type === 'before');
  const hasAfter = evidenceList.some(e => e.type === 'after');

  if (hasBefore) evidenceScore += 12.5;
  if (hasAfter) evidenceScore += 12.5;
  else if (evidenceList.length > 0) evidenceScore += 8;

  // 2. Completion Detail & Notes (25 pts)
  const notes = complaint.resolution?.notes || '';
  const wordCount = notes.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= 15) completionScore = 25;
  else if (wordCount >= 8) completionScore = 18;
  else if (wordCount > 0) completionScore = 12;
  else completionScore = 5;

  // 3. Citizen Feedback & Satisfaction (25 pts)
  const feedback = complaint.citizenFeedback;
  if (feedback && feedback.rating) {
    if (feedback.resolvedByCitizen === false) {
      feedbackScore = 0;
    } else {
      const r = feedback.rating;
      if (r === 5) feedbackScore = 25;
      else if (r === 4) feedbackScore = 20;
      else if (r === 3) feedbackScore = 14;
      else if (r === 2) feedbackScore = 7;
      else feedbackScore = 2;
    }
  } else {
    // Neutral default before citizen submits feedback
    feedbackScore = 18;
  }

  // 4. Resolution Process & SLA (15 pts)
  const slaStatus = complaint.sla?.status;
  if (slaStatus === 'Within SLA' || (complaint.sla && !complaint.sla.breachedAt)) {
    processScore = 15;
  } else if (slaStatus === 'At Risk') {
    processScore = 10;
  } else if (slaStatus === 'Breached') {
    processScore = 4;
  } else {
    processScore = 12;
  }

  // 5. Government Verification (10 pts)
  if (complaint.resolution?.status === 'Approved' && complaint.resolution?.verifiedAt) {
    verificationScore = 10;
  } else if (complaint.status === 'Resolved') {
    verificationScore = 8;
  } else {
    verificationScore = 4;
  }

  // Reopen penalty
  let reopenPenalty = 0;
  if (complaint.reopenCount > 0) {
    reopenPenalty = Math.min(30, complaint.reopenCount * 15);
  }

  const rawScore = Math.max(0, Math.min(100, Math.round(evidenceScore + completionScore + feedbackScore + processScore + verificationScore - reopenPenalty)));

  let level = 'Needs Review';
  if (rawScore >= 80) level = 'Excellent';
  else if (rawScore >= 65) level = 'Good';
  else if (rawScore >= 50) level = 'Needs Review';
  else level = 'Poor';

  const explanation = `Resolution evaluated with score ${rawScore}/100 (${level}) based on evidence (${Math.round(evidenceScore)}/25), work completion detail (${Math.round(completionScore)}/25), citizen outcome (${Math.round(feedbackScore)}/25), and SLA timeliness (${Math.round(processScore)}/15).`;
  
  let recommendation = 'Standard municipal resolution workflow satisfied.';
  if (rawScore < 50 || complaint.reopenCount > 0) {
    recommendation = 'Field operative follow-up or supervisor audit recommended due to low outcome score or rework.';
  } else if (rawScore >= 85) {
    recommendation = 'Exemplary field resolution adhering to high municipal standards.';
  }

  return {
    score: rawScore,
    level,
    evidenceScore: Math.round(evidenceScore * 10) / 10,
    feedbackScore: Math.round(feedbackScore * 10) / 10,
    completionScore: Math.round(completionScore * 10) / 10,
    aiExplanation: explanation,
    recommendation,
    calculatedAt: new Date()
  };
};

/**
 * Calculate Resolution Quality with Gemini AI support and deterministic fallback
 */
const calculateResolutionQuality = async (complaint) => {
  const deterministicResult = calculateDeterministicQuality(complaint);
  const apiKey = process.env.GEMINI_API_KEY;

  // If Gemini API Key is missing, return deterministic calculation directly
  if (!apiKey) {
    return deterministicResult;
  }

  try {
    const prompt = `Analyze this civic complaint field resolution quality and return strict JSON:
Complaint Title: ${complaint.title}
Category: ${complaint.category}
Description: ${complaint.description}
Worker Notes: ${complaint.resolution?.notes || 'None'}
Evidence Count: ${complaint.evidence?.length || 0}
Citizen Rating: ${complaint.citizenFeedback?.rating || 'Not provided'}
Citizen Resolved: ${complaint.citizenFeedback?.resolvedByCitizen}
Citizen Comment: ${complaint.citizenFeedback?.comment || 'None'}
SLA Status: ${complaint.sla?.status}
Reopen Count: ${complaint.reopenCount || 0}

Respond ONLY in valid JSON with schema:
{
  "score": (number 0-100),
  "level": ("Excellent" | "Good" | "Needs Review" | "Poor"),
  "explanation": "brief description of resolution quality",
  "recommendation": "actionable administrative guidance"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        if (typeof parsed.score === 'number' && parsed.level) {
          return {
            score: Math.max(0, Math.min(100, Math.round(parsed.score))),
            level: ['Excellent', 'Good', 'Needs Review', 'Poor'].includes(parsed.level) ? parsed.level : deterministicResult.level,
            evidenceScore: deterministicResult.evidenceScore,
            feedbackScore: deterministicResult.feedbackScore,
            completionScore: deterministicResult.completionScore,
            aiExplanation: parsed.explanation || deterministicResult.aiExplanation,
            recommendation: parsed.recommendation || deterministicResult.recommendation,
            calculatedAt: new Date()
          };
        }
      }
    }
  } catch (err) {
    // Silently fall back to deterministic scoring on timeout or parsing error
  }

  return deterministicResult;
};

module.exports = {
  calculateDeterministicQuality,
  calculateResolutionQuality
};
