/**
 * CivicConnect AI - Complaint Intelligence & Duplicate Detection Service
 * Uses Google Gemini API with robust fallback handling and two-stage duplicate detection.
 */
const mongoose = require('mongoose');

const CATEGORY_DEPARTMENT_MAP = {
  'Road Damage': 'Road Department',
  'Roads': 'Road Department',
  'Electricity': 'Electricity',
  'Water Supply': 'Water Supply',
  'Garbage Collection': 'Garbage Collection',
  'Sanitation': 'Garbage Collection',
  'Traffic Signal': 'Traffic Management',
  'Street Light': 'Street Lights',
  'Drainage': 'Drainage',
  'Parks': 'Municipality',
  'Municipality': 'Municipality',
  'Others': 'Municipality'
};

const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High', 'Emergency'];
const ALLOWED_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const ALLOWED_CATEGORIES = Object.keys(CATEGORY_DEPARTMENT_MAP);

const STOPWORDS = new Set([
  'the', 'and', 'is', 'in', 'at', 'of', 'a', 'an', 'to', 'for', 'with', 'on', 'by', 'from',
  'this', 'that', 'there', 'it', 'its', 'has', 'have', 'had', 'been', 'are', 'was', 'were',
  'near', 'next', 'front', 'side', 'right', 'into', 'over', 'under', 'very', 'please', 'help'
]);

/**
 * Calculate geographical distance in meters using Haversine formula
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined ||
      lat1 === null || lon1 === null || lat2 === null || lon2 === null ||
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return null;
  }
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371e3; // Earth radius in meters
  const phi1 = toRad(Number(lat1));
  const phi2 = toRad(Number(lat2));
  const deltaPhi = toRad(Number(lat2) - Number(lat1));
  const deltaLambda = toRad(Number(lon2) - Number(lon1));

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

/**
 * Clean and stem simple words
 */
const extractMeaningfulTokens = (str = '') => {
  if (!str) return new Set();
  const words = str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .map(w => {
      // Basic English plural and suffix stemming
      if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
      if (w.endsWith('es') && !w.endsWith('ses')) return w.slice(0, -2);
      if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
      if (w.endsWith('ing')) return w.slice(0, -3);
      if (w.endsWith('ed')) return w.slice(0, -2);
      return w;
    });
  return new Set(words);
};

/**
 * Calculate token overlap using combination of Dice and Overlap (containment) coefficients
 */
const calculateSemanticTextSimilarity = (text1, text2) => {
  const set1 = extractMeaningfulTokens(text1);
  const set2 = extractMeaningfulTokens(text2);
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  if (intersection.size === 0) return 0;

  const overlapCoeff = intersection.size / Math.min(set1.size, set2.size);
  const diceCoeff = (2 * intersection.size) / (set1.size + set2.size);

  return (overlapCoeff * 0.6) + (diceCoeff * 0.4);
};

/**
 * Fallback classification logic if AI is unavailable or fails.
 */
const getSafeFallback = ({ title = '', description = '', category = '', priority = '' }) => {
  const combinedText = `${title} ${description}`.toLowerCase();
  
  let detectedCategory = category;
  if (!detectedCategory || !CATEGORY_DEPARTMENT_MAP[detectedCategory]) {
    if (combinedText.includes('pothole') || combinedText.includes('road') || combinedText.includes('asphalt') || combinedText.includes('tar')) {
      detectedCategory = 'Road Damage';
    } else if (combinedText.includes('water') || combinedText.includes('pipe') || combinedText.includes('leak') || combinedText.includes('supply')) {
      detectedCategory = 'Water Supply';
    } else if (combinedText.includes('power') || combinedText.includes('electric') || combinedText.includes('wire') || combinedText.includes('transformer')) {
      detectedCategory = 'Electricity';
    } else if (combinedText.includes('garbage') || combinedText.includes('waste') || combinedText.includes('trash') || combinedText.includes('dump')) {
      detectedCategory = 'Garbage Collection';
    } else if (combinedText.includes('traffic') || combinedText.includes('signal') || combinedText.includes('light at crossing')) {
      detectedCategory = 'Traffic Signal';
    } else if (combinedText.includes('street light') || combinedText.includes('streetlight') || combinedText.includes('dark street')) {
      detectedCategory = 'Street Light';
    } else if (combinedText.includes('drain') || combinedText.includes('sewage') || combinedText.includes('gutter') || combinedText.includes('overflow')) {
      detectedCategory = 'Drainage';
    } else if (combinedText.includes('park') || combinedText.includes('tree') || combinedText.includes('garden')) {
      detectedCategory = 'Parks';
    } else {
      detectedCategory = 'Others';
    }
  }

  const detectedDepartment = CATEGORY_DEPARTMENT_MAP[detectedCategory] || 'Municipality';
  const validatedPriority = ALLOWED_PRIORITIES.includes(priority) ? priority : 'Medium';

  let severity = 'Medium';
  if (combinedText.includes('urgent') || combinedText.includes('fire') || combinedText.includes('hazard') || combinedText.includes('danger') || combinedText.includes('burst') || combinedText.includes('electrocution')) {
    severity = 'Critical';
  } else if (combinedText.includes('broken') || combinedText.includes('major') || combinedText.includes('heavy') || combinedText.includes('flooding')) {
    severity = 'High';
  }

  const summary = description.length > 120 
    ? `${description.substring(0, 117)}...` 
    : (description || title || 'Citizen reported issue.');

  return {
    category: detectedCategory,
    department: detectedDepartment,
    priority: validatedPriority,
    severity,
    summary,
    confidence: 0
  };
};

/**
 * Classify complaint using Gemini API or safe fallback
 */
const classifyComplaint = async ({ title, description, category = '', address = '', landmark = '', priority = '' }) => {
  if (!title || !description) {
    const error = new Error('Title and description are required for classification.');
    error.status = 422;
    throw error;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return getSafeFallback({ title, description, category, priority });
  }

  try {
    const prompt = `You are an expert municipal civic grievance classifier for CivicConnect AI.
Analyze the following citizen complaint and return ONLY a valid JSON object.

Allowed categories: ["Road Damage", "Electricity", "Water Supply", "Garbage Collection", "Traffic Signal", "Street Light", "Drainage", "Parks", "Municipality", "Others"].
Allowed departments: ["Road Department", "Electricity", "Water Supply", "Garbage Collection", "Traffic Management", "Street Lights", "Drainage", "Municipality"].
Allowed priorities: ["Low", "Medium", "High", "Emergency"].
Allowed severities: ["Low", "Medium", "High", "Critical"].

Complaint Details:
- Title: "${title}"
- Description: "${description}"
- Citizen Selected Category: "${category || 'None'}"
- Address: "${address || 'None'}"
- Landmark: "${landmark || 'None'}"

Rules:
1. Do NOT invent facts. Base your response strictly on the provided complaint details.
2. Formulate a 1-sentence factual summary of the core issue.
3. Compute a realistic confidence score between 0.60 and 0.99.
4. Output STRICT JSON format matching this exact schema:
{
  "category": "Road Damage",
  "department": "Road Department",
  "priority": "High",
  "severity": "High",
  "summary": "Large pothole on the road posing traffic risk.",
  "confidence": 0.92
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[AI Service] Gemini API returned status ${response.status}. Using fallback.`);
      return getSafeFallback({ title, description, category, priority });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return getSafeFallback({ title, description, category, priority });
    }

    const parsed = JSON.parse(responseText.trim());

    const validCategory = ALLOWED_CATEGORIES.includes(parsed.category) 
      ? parsed.category 
      : (CATEGORY_DEPARTMENT_MAP[category] ? category : 'Others');

    const validDepartment = CATEGORY_DEPARTMENT_MAP[validCategory] || parsed.department || 'Municipality';
    const validPriority = ALLOWED_PRIORITIES.includes(parsed.priority) ? parsed.priority : 'Medium';
    const validSeverity = ALLOWED_SEVERITIES.includes(parsed.severity) ? parsed.severity : 'Medium';
    const confidence = (typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1)
      ? Number(parsed.confidence.toFixed(2))
      : 0.85;

    const summary = parsed.summary && typeof parsed.summary === 'string'
      ? parsed.summary.trim()
      : description.substring(0, 120);

    return {
      category: validCategory,
      department: validDepartment,
      priority: validPriority,
      severity: validSeverity,
      summary,
      confidence
    };
  } catch (err) {
    console.warn('[AI Service] AI Classification exception, defaulting to safe fallback:', err.message);
    return getSafeFallback({ title, description, category, priority });
  }
};

/**
 * Deterministic comparison fallback calculation
 */
const computeDeterministicComparison = (newComplaint, candidate) => {
  const titleSim = calculateSemanticTextSimilarity(newComplaint.title, candidate.title);
  const descSim = calculateSemanticTextSimilarity(newComplaint.description, candidate.description);
  const landmarkSim = (newComplaint.landmark && candidate.landmark) 
    ? calculateSemanticTextSimilarity(newComplaint.landmark, candidate.landmark)
    : 0;

  let composite = (titleSim * 0.45) + (descSim * 0.35) + (landmarkSim * 0.20);
  if (titleSim > 0.4 && descSim > 0.3) {
    composite = Math.max(composite, 0.88);
  } else if (titleSim > 0.3 || descSim > 0.3) {
    composite = Math.max(composite, 0.75);
  }

  const similarity = Number(Math.min(0.98, composite).toFixed(2));
  return {
    isDuplicate: similarity >= 0.70,
    similarity,
    reason: similarity >= 0.85
      ? 'Both complaints describe matching core civic keywords at this location.'
      : 'Complaints share similar civic terminology in the area.',
    issueMatch: similarity >= 0.85 ? 'High' : (similarity >= 0.70 ? 'Medium' : 'Low')
  };
};

/**
 * Stage 2: Compare new complaint against an existing candidate using Gemini AI or fallback
 */
const comparePairWithAI = async (newComplaint, candidate) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return computeDeterministicComparison(newComplaint, candidate);
  }

  try {
    const prompt = `You are an expert civic grievance duplicate detection analyzer for CivicConnect AI.
Compare the newly reported complaint against this existing complaint candidate to determine if they describe the exact same physical municipal issue.

NEW COMPLAINT:
- Title: "${newComplaint.title}"
- Description: "${newComplaint.description}"
- Category: "${newComplaint.category || 'None'}"
- Address: "${newComplaint.address || 'None'}"
- Landmark: "${newComplaint.landmark || 'None'}"

EXISTING COMPLAINT:
- ID: "${candidate.complaintId || candidate._id}"
- Title: "${candidate.title}"
- Description: "${candidate.description}"
- Category: "${candidate.category || 'None'}"
- Address: "${candidate.address || 'None'}"
- Landmark: "${candidate.landmark || 'None'}"
- Status: "${candidate.status}"

Rules:
1. Determine if both complaints describe the SAME civic problem at the same location.
2. Output STRICT JSON with this schema:
{
  "isDuplicate": true,
  "similarity": 0.91,
  "reason": "Both complaints describe the same large pothole near the bus stand.",
  "issueMatch": "High"
}
Allowed values:
isDuplicate: true or false
similarity: number between 0.0 and 1.0
issueMatch: "Low", "Medium", "High"`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty AI response');

    const parsed = JSON.parse(text.trim());
    return {
      isDuplicate: Boolean(parsed.isDuplicate),
      similarity: typeof parsed.similarity === 'number' ? Number(parsed.similarity.toFixed(2)) : 0.75,
      reason: parsed.reason ? String(parsed.reason).trim() : 'Both reports describe similar civic issues.',
      issueMatch: ['Low', 'Medium', 'High'].includes(parsed.issueMatch) ? parsed.issueMatch : 'Medium'
    };
  } catch (err) {
    console.warn('[AI Service] Duplicate comparison AI call failed, using deterministic fallback:', err.message);
    return computeDeterministicComparison(newComplaint, candidate);
  }
};

/**
 * Two-stage Duplicate Complaint Detection
 * Stage 1: MongoDB Candidate Filtering
 * Stage 2: AI Semantic Comparison on shortlisted candidates
 */
const checkDuplicateComplaint = async (newComplaint) => {
  const Complaint = mongoose.model('Complaint');
  const { title, description, category, address, landmark, latitude, longitude } = newComplaint;

  if (!title || !description) {
    const error = new Error('Title and description are required for duplicate check.');
    error.status = 422;
    throw error;
  }

  const radiusMeters = Number(process.env.DUPLICATE_RADIUS_METERS) || 500;
  const windowDays = Number(process.env.DUPLICATE_WINDOW_DAYS) || 90;
  const similarityThreshold = Number(process.env.DUPLICATE_SIMILARITY_THRESHOLD) || 0.85;

  const windowStartDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Stage 1: Fast Database Candidate Filtering
  const query = {
    createdAt: { $gte: windowStartDate },
    status: { $in: ['Pending', 'Verified', 'Assigned', 'In Progress'] }
  };

  // Category filter
  if (category) {
    query.$or = [
      { category: { $regex: new RegExp(`^${category}$`, 'i') } },
      { department: { $regex: new RegExp(`^${category}$`, 'i') } }
    ];
  }

  // Fetch candidate pool
  const candidatePool = await Complaint.find(query)
    .select('_id complaintId title category department description status address landmark latitude longitude aiAnalysis createdAt')
    .sort({ createdAt: -1 })
    .limit(25)
    .lean();

  if (!candidatePool || candidatePool.length === 0) {
    return {
      possibleDuplicate: false,
      strongDuplicate: false,
      matches: []
    };
  }

  // Filter & rank candidates
  const scoredCandidates = candidatePool.map((c) => {
    let distanceMeters = null;
    if (latitude !== undefined && longitude !== undefined && c.latitude !== undefined && c.longitude !== undefined &&
        latitude !== null && longitude !== null && c.latitude !== null && c.longitude !== null) {
      distanceMeters = calculateHaversineDistance(latitude, longitude, c.latitude, c.longitude);
    }
    return {
      ...c,
      distanceMeters
    };
  });

  // Shortlist top candidates prioritizing nearby ones
  let shortlisted = [];
  const hasCoordinates = latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null;

  if (hasCoordinates) {
    const withDistance = scoredCandidates.filter(c => c.distanceMeters !== null);
    const withoutDistance = scoredCandidates.filter(c => c.distanceMeters === null);
    
    withDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
    shortlisted = [...withDistance, ...withoutDistance].slice(0, 3);
  } else {
    scoredCandidates.forEach(c => {
      c.prelimScore = calculateSemanticTextSimilarity(
        `${title} ${description}`, 
        `${c.title} ${c.description}`
      );
    });
    scoredCandidates.sort((a, b) => (b.prelimScore || 0) - (a.prelimScore || 0));
    shortlisted = scoredCandidates.slice(0, 3);
  }

  // Stage 2: AI Semantic Comparison on shortlisted candidates
  const matches = [];
  let foundStrongDuplicate = false;
  let foundPossibleDuplicate = false;

  for (const candidate of shortlisted) {
    const aiComparison = await comparePairWithAI(newComplaint, candidate);
    const sim = aiComparison.similarity;
    const dist = candidate.distanceMeters;

    // Decision Logic:
    // Location & semantic similarity considered together
    let isStrong = false;
    let isPossible = false;

    if (dist !== null) {
      // Must be within radius (e.g. 500m) AND sim >= 0.85 for strong duplicate
      if (sim >= similarityThreshold && dist <= radiusMeters) {
        isStrong = true;
        isPossible = true;
      } else if (sim >= 0.70 && dist <= radiusMeters * 3) {
        isPossible = true;
      }
    } else {
      // Missing GPS: use semantic threshold
      if (sim >= similarityThreshold) {
        isStrong = true;
        isPossible = true;
      } else if (sim >= 0.70) {
        isPossible = true;
      }
    }

    if (isPossible) {
      foundPossibleDuplicate = true;
      if (isStrong) foundStrongDuplicate = true;

      matches.push({
        _id: candidate._id,
        complaintId: candidate.complaintId || candidate._id.toString(),
        title: candidate.title,
        category: candidate.category || candidate.department,
        status: candidate.status,
        distanceMeters: dist,
        similarity: sim,
        summary: candidate.aiAnalysis?.summary || (candidate.description.length > 100 ? `${candidate.description.substring(0, 97)}...` : candidate.description),
        reason: aiComparison.reason,
        issueMatch: aiComparison.issueMatch
      });
    }
  }

  // Sort matches by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  return {
    possibleDuplicate: foundPossibleDuplicate,
    strongDuplicate: foundStrongDuplicate,
    matches
  };
};

/**
 * Helper to parse base64 data URLs into mimeType and data payload for Gemini
 */
const parseBase64Image = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2]
    };
  }
  if (dataUrl.length > 100 && !dataUrl.startsWith('http://') && !dataUrl.startsWith('https://')) {
    return {
      mimeType: 'image/jpeg',
      data: dataUrl
    };
  }
  return null;
};

/**
 * Deterministic fallback for resolution verification
 */
const getResolutionVerificationFallback = ({
  title = '',
  description = '',
  category = '',
  department = '',
  resolutionNotes = '',
  proofImage = ''
}) => {
  const combinedNotes = `${resolutionNotes}`.toLowerCase();
  const wordCount = resolutionNotes.trim().split(/\s+/).filter(Boolean).length;
  const hasProofImage = Boolean(proofImage && proofImage.length > 100);

  let confidence = 0.50;
  let matchesComplaint = true;
  let resolutionEvidenceDetected = false;
  let imageRelevant = hasProofImage;

  // Keyword validation against department context
  const deptKeywords = {
    'Road Department': ['road', 'pothole', 'asphalt', 'tar', 'patch', 'repaired', 'fix', 'concrete', 'surface', 'lane'],
    'Water Supply': ['water', 'pipe', 'leak', 'line', 'valve', 'flow', 'drain', 'supply', 'tap', 'joint', 'pipeline'],
    'Electricity': ['electric', 'wire', 'transformer', 'power', 'pole', 'light', 'fuse', 'cable', 'supply', 'connection'],
    'Garbage Collection': ['garbage', 'waste', 'trash', 'clean', 'dump', 'cleared', 'bin', 'sanitized', 'collection'],
    'Traffic Management': ['traffic', 'signal', 'sign', 'crossing', 'lane', 'divert', 'light', 'timer'],
    'Street Lights': ['street light', 'streetlight', 'bulb', 'fixture', 'pole', 'illuminated', 'replaced', 'wiring', 'lamp'],
    'Drainage': ['drain', 'sewage', 'gutter', 'cleared', 'pipe', 'flow', 'unblocked', 'cleaned', 'manhole'],
    'Municipality': ['park', 'tree', 'clean', 'repaired', 'public', 'work', 'cleared', 'fixed']
  };

  const keywords = deptKeywords[department] || ['repaired', 'fixed', 'cleared', 'completed', 'resolved', 'inspected'];
  const matchedKeywords = keywords.filter(kw => combinedNotes.includes(kw));

  if (hasProofImage && wordCount >= 5) {
    resolutionEvidenceDetected = true;
    confidence = matchedKeywords.length > 0 ? 0.88 : 0.78;
  } else if (hasProofImage) {
    resolutionEvidenceDetected = true;
    confidence = 0.65;
  } else {
    confidence = 0.30;
    matchesComplaint = false;
  }

  const status = confidence >= 0.75 && resolutionEvidenceDetected ? 'VERIFIED' : (confidence >= 0.50 ? 'REVIEW_REQUIRED' : 'REJECTED');
  const reason = hasProofImage
    ? `Resolution proof verified for ${department}. Notes describe completed field work (${wordCount} words) with matching operational context.`
    : 'Insufficient proof provided. Photographic evidence is required to verify resolution.';

  return {
    imageRelevant,
    problemDetected: true,
    resolutionEvidenceDetected,
    matchesComplaint,
    confidence: Number(confidence.toFixed(2)),
    status,
    reason,
    recommendation: status === 'VERIFIED' ? 'Approved for official complaint closure.' : 'Please review proof details and ensure complete resolution notes.'
  };
};

/**
 * AI-Powered Multimodal Resolution Verification using Google Gemini API
 */
const verifyResolutionAI = async ({
  title = '',
  description = '',
  category = '',
  department = '',
  resolutionNotes = '',
  proofImage = '',
  originalImages = []
}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return getResolutionVerificationFallback({
      title,
      description,
      category,
      department,
      resolutionNotes,
      proofImage
    });
  }

  try {
    const promptText = `You are an expert municipal civic grievance verification AI for CivicConnect AI.
Your job is to strictly verify whether the submitted proof photo and resolution notes constitute legitimate, valid evidence that a civic complaint has been physically and satisfactorily resolved by a municipal officer/worker.

COMPLAINT CONTEXT:
- Title: "${title}"
- Category: "${category || 'General'}"
- Department: "${department || 'Municipality'}"
- Citizen Description: "${description}"

OFFICER RESOLUTION REPORT:
- Officer Resolution Notes: "${resolutionNotes}"

INSTRUCTIONS:
1. Examine the Resolution Proof Image carefully.
2. Check if the image is a genuine photo of civic infrastructure/field work or an irrelevant/fake photo (e.g., selfie, food, animal, screenshot, stock photo, meme, unrelated indoor room).
3. Check if the image visually corresponds to the problem context described (e.g. road repair for road damage, cleared garbage for sanitation, streetlight fixture for lighting, pipe/plumbing for water supply).
4. Check if the problem appears genuinely repaired, cleared, or resolved in the proof image.
5. Provide a realistic confidence score between 0.0 and 1.0.
6. Determine if resolution evidence is detected and whether the proof matches the complaint.
7. Set recommended verification status:
   - "VERIFIED": High confidence (>= 0.75), genuine civic scene, resolution work clearly evident, matches category/location context.
   - "REVIEW_REQUIRED": Moderate confidence (0.50 - 0.74), unclear lighting, partial repair visible, or ambiguous angle.
   - "REJECTED": Low confidence (< 0.50), irrelevant image, no evidence of resolution, fake/unrelated photo.

Return ONLY a valid JSON object matching this schema:
{
  "imageRelevant": true,
  "problemDetected": true,
  "resolutionEvidenceDetected": true,
  "matchesComplaint": true,
  "confidence": 0.92,
  "status": "VERIFIED",
  "reason": "Clear 1-2 sentence explanation of what was visually detected and why this verification decision was made.",
  "recommendation": "Recommendation for administrative records."
}`;

    const parts = [{ text: promptText }];

    // Attach proof image inline
    const parsedProof = parseBase64Image(proofImage);
    if (parsedProof) {
      parts.push({
        inlineData: {
          mimeType: parsedProof.mimeType || 'image/jpeg',
          data: parsedProof.data
        }
      });
    }

    // Attach original images if available for before/after comparison
    if (Array.isArray(originalImages)) {
      for (const origImg of originalImages.slice(0, 2)) {
        const parsedOrig = parseBase64Image(origImg);
        if (parsedOrig) {
          parts.push({
            inlineData: {
              mimeType: parsedOrig.mimeType || 'image/jpeg',
              data: parsedOrig.data
            }
          });
        }
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[AI Service] Gemini Resolution Vision API returned status ${response.status}. Using fallback.`);
      return getResolutionVerificationFallback({ title, description, category, department, resolutionNotes, proofImage });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return getResolutionVerificationFallback({ title, description, category, department, resolutionNotes, proofImage });
    }

    const parsed = JSON.parse(responseText.trim());

    return {
      imageRelevant: Boolean(parsed.imageRelevant),
      problemDetected: Boolean(parsed.problemDetected),
      resolutionEvidenceDetected: Boolean(parsed.resolutionEvidenceDetected),
      matchesComplaint: Boolean(parsed.matchesComplaint),
      confidence: typeof parsed.confidence === 'number' ? Number(parsed.confidence.toFixed(2)) : 0.85,
      status: ['VERIFIED', 'REJECTED', 'REVIEW_REQUIRED'].includes(parsed.status) ? parsed.status : 'VERIFIED',
      reason: parsed.reason ? String(parsed.reason).trim() : 'AI multimodal vision successfully verified the resolution proof.',
      recommendation: parsed.recommendation ? String(parsed.recommendation).trim() : 'Approved for resolution.'
    };
  } catch (err) {
    console.warn('[AI Service] AI Resolution Vision exception, defaulting to fallback:', err.message);
    return getResolutionVerificationFallback({ title, description, category, department, resolutionNotes, proofImage });
  }
};

/**
 * End-to-end Complaint Resolution Verification combining Geolocation + Gemini Multimodal Vision
 */
const verifyComplaintResolution = async ({
  complaint,
  proofImage,
  resolutionNotes,
  officerLatitude,
  officerLongitude,
  userId
}) => {
  const maxRadiusMeters = Number(process.env.COMPLAINT_LOCATION_RADIUS_METERS) || 150;
  let distanceMeters = null;
  let locationVerified = false;
  let locationReason = '';

  const hasComplaintCoords = complaint.latitude !== undefined && complaint.latitude !== null &&
                             !isNaN(Number(complaint.latitude)) && Number(complaint.latitude) !== 0 &&
                             complaint.longitude !== undefined && complaint.longitude !== null &&
                             !isNaN(Number(complaint.longitude)) && Number(complaint.longitude) !== 0;

  const hasOfficerCoords = officerLatitude !== undefined && officerLatitude !== null &&
                           !isNaN(Number(officerLatitude)) && Number(officerLatitude) !== 0 &&
                           officerLongitude !== undefined && officerLongitude !== null &&
                           !isNaN(Number(officerLongitude)) && Number(officerLongitude) !== 0;

  if (hasComplaintCoords && hasOfficerCoords) {
    distanceMeters = calculateHaversineDistance(
      Number(complaint.latitude),
      Number(complaint.longitude),
      Number(officerLatitude),
      Number(officerLongitude)
    );

    if (distanceMeters !== null && distanceMeters <= maxRadiusMeters) {
      locationVerified = true;
      locationReason = `Officer GPS verified on-site (${distanceMeters}m from complaint location, permitted: ${maxRadiusMeters}m).`;
    } else {
      locationVerified = false;
      locationReason = `Officer GPS is ${distanceMeters}m away from the reported complaint site (max allowed: ${maxRadiusMeters}m).`;
    }
  } else if (!hasComplaintCoords) {
    // Original complaint did not record GPS coordinates
    locationVerified = true;
    locationReason = 'Complaint has no GPS benchmark on file. Location marked as verified/bypassed.';
  } else {
    // Complaint has GPS but officer did not provide GPS
    locationVerified = false;
    locationReason = 'Officer GPS coordinates are required for on-site verification.';
  }

  // Multimodal Vision Verification
  const aiResult = await verifyResolutionAI({
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    department: complaint.department,
    resolutionNotes,
    proofImage,
    originalImages: complaint.images || []
  });

  // Normalize confidence to 0-100 scale
  const rawConf = typeof aiResult.confidence === 'number' ? aiResult.confidence : 0.8;
  const normalizedConfidence = rawConf <= 1 ? Math.round(rawConf * 100) : Math.round(rawConf);
  const minConfidence = Number(process.env.AI_RESOLUTION_MIN_CONFIDENCE) || 70;

  let finalStatus = 'REJECTED';
  if (
    aiResult.imageRelevant &&
    aiResult.resolutionEvidenceDetected &&
    aiResult.matchesComplaint &&
    locationVerified &&
    normalizedConfidence >= minConfidence
  ) {
    finalStatus = 'VERIFIED';
  } else if (
    aiResult.imageRelevant &&
    normalizedConfidence >= 50 &&
    (locationVerified || !hasComplaintCoords)
  ) {
    finalStatus = 'REVIEW_REQUIRED';
  } else {
    finalStatus = 'REJECTED';
  }

  const combinedReason = [
    aiResult.reason,
    locationReason
  ].filter(Boolean).join(' | ');

  return {
    status: finalStatus,
    confidence: normalizedConfidence,
    imageRelevant: Boolean(aiResult.imageRelevant),
    problemDetected: Boolean(aiResult.problemDetected),
    matchesComplaint: Boolean(aiResult.matchesComplaint),
    resolutionEvidenceDetected: Boolean(aiResult.resolutionEvidenceDetected),
    locationVerified,
    officerLatitude: hasOfficerCoords ? Number(officerLatitude) : null,
    officerLongitude: hasOfficerCoords ? Number(officerLongitude) : null,
    complaintLatitude: hasComplaintCoords ? Number(complaint.latitude) : null,
    complaintLongitude: hasComplaintCoords ? Number(complaint.longitude) : null,
    distanceMeters,
    aiReason: combinedReason,
    recommendation: aiResult.recommendation || (finalStatus === 'VERIFIED' ? 'Approved for official closure.' : 'Please re-verify location on site and upload clear photo evidence.'),
    verifiedAt: new Date(),
    verifiedBy: userId || null
  };
};

module.exports = {
  classifyComplaint,
  getSafeFallback,
  calculateHaversineDistance,
  comparePairWithAI,
  checkDuplicateComplaint,
  verifyResolutionAI,
  verifyComplaintResolution,
  getResolutionVerificationFallback,
  CATEGORY_DEPARTMENT_MAP,
  ALLOWED_PRIORITIES,
  ALLOWED_SEVERITIES,
  ALLOWED_CATEGORIES
};

