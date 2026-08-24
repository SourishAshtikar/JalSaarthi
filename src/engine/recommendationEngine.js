const cropsData = require('../data/crops.json');
const practicesData = require('../data/irrigationPractices.json');
const { classifyGroundwater } = require('./groundwaterClassifier');
const { classifyRainfall } = require('./rainfallClassifier');
const { translateReport } = require('./reportTranslator');
const { scoreIrrigationTechniques, generateReasons, TECHNIQUES } = require('./agronomicScorer');

// Map agronomic scorer technique IDs to practice data entries
function resolvePracticeFromTechniqueId(techniqueId) {
  const searchId = (techniqueId || '').toLowerCase();
  // Try exact match on id
  let practice = practicesData.practices.find(p => p.id.toLowerCase() === searchId);
  if (practice) return practice;
  // Fuzzy match on name
  practice = practicesData.practices.find(p =>
    p.name.toLowerCase().includes(searchId) || searchId.includes(p.id.toLowerCase())
  );
  return practice || practicesData.practices.find(p => p.id === 'Drip') || practicesData.practices[0];
}

// Baseline crop seasonal water requirements (m³/ha) based on ICAR & FAO-56 agricultural guidelines
const CROP_WATER_REQUIREMENT_M3_HA = {
  'rice': 12500,
  'paddy': 12500,
  'sugarcane': 18000,
  'cotton': 7000,
  'wheat': 4500,
  'potato': 5500,
  'tomato': 6000,
  'turmeric': 9000,
  'mustard': 3000,
  'maize': 5000,
  'sunflower': 5000,
  'groundnut': 5500,
  'onion': 4500,
  'watermelon': 4000,
  'bajra': 3000,
  'millet': 3000,
  'jowar': 3200,
  'moong': 2800,
  'gram': 2600,
  'masoor': 2400,
  'guar': 2500,
  'vegetables': 4500
};

function computeWaterSavedVolume(practice, crop) {
  const cropKey = (crop?.name || '').toLowerCase();
  let baseReq = 5500;
  for (const [key, val] of Object.entries(CROP_WATER_REQUIREMENT_M3_HA)) {
    if (cropKey.includes(key)) {
      baseReq = val;
      break;
    }
  }
  const savingFraction = (practice.waterSavingsPct || practice.waterSavingsPercentage || 0) / 100;
  return Math.round(baseReq * savingFraction);
}

async function evaluateRecommendation(context) {
  const { village, cropName, currentPracticeName, groundwater, weather, soil, assessment } = context;

  // 1. Resolve Crop Record
  const cropStr = (cropName || 'Rice').toLowerCase();
  const crop = cropsData.crops.find(c =>
    c.name.toLowerCase().includes(cropStr) || cropStr.includes(c.name.toLowerCase().split(' ')[0])
  ) || cropsData.crops[0];

  // 2. Classify Groundwater (determines urgency)
  const gwClass = classifyGroundwater(groundwater ? groundwater.levelMeters : null, groundwater ? groundwater.trend : 'UNKNOWN');

  // 3. Classify Rainfall
  const rfClass = classifyRainfall(
    weather ? weather.rainfallRecentMm : null,
    weather ? weather.rainfallForecastMm : null
  );

  // 4. Resolve Current Irrigation Practice
  const currPracticeStr = (currentPracticeName || 'Flood').toLowerCase();
  const currentPractice = practicesData.practices.find(p =>
    p.name.toLowerCase().includes(currPracticeStr) || currPracticeStr.includes(p.id.toLowerCase())
  ) || practicesData.practices[0];

  // 5. Compute Stage of Extraction from DB assessment (or estimate from GW level)
  let stagePct = null;
  if (assessment && assessment.extraction_all_uses_bcm && assessment.extractable_resources_bcm) {
    stagePct = (assessment.extraction_all_uses_bcm / assessment.extractable_resources_bcm) * 100;
  } else if (assessment && assessment.recharge_bcm && assessment.extraction_all_uses_bcm) {
    const extractable = assessment.recharge_bcm * 0.91;
    stagePct = (assessment.extraction_all_uses_bcm / extractable) * 100;
  }

  // 6. Run Agronomic Scoring Engine (transparent, honest scoring)
  const scoringResult = scoreIrrigationTechniques({
    stagePct,
    soilTexture: soil?.texture || soil?.soilType || 'Medium',
    drainage: soil?.drainage || 'Moderate',
    cropWaterClass: crop.waterRequirementClass || 'Medium',
    rainfallMm: assessment?.rainfall_mm || weather?.rainfallRecentMm || 600,
    currentPracticeId: currentPractice.id,
  });

  const bestPractice = resolvePracticeFromTechniqueId(scoringResult.recommended.id);
  const confidenceScore = scoringResult.confidenceScore;
  const isCurrentBest = bestPractice.id === currentPractice.id;

  // 7. Determine action
  let actionRequired;
  if (gwClass.category === 'NORMAL' && isCurrentBest) {
    actionRequired = 'MAINTAIN_CURRENT_PRACTICE';
  } else if (isCurrentBest) {
    actionRequired = 'MAINTAIN_OR_OPTIMIZE';
  } else {
    actionRequired = gwClass.category === 'CRITICAL' || gwClass.category === 'HIGH'
      ? 'CHANGE_RECOMMENDED'
      : 'CHANGE_RECOMMENDED';
  }

  // 8. Generate reasons
  const reasons = generateReasons({
    recommended: scoringResult.recommended,
    stagePct,
    soilTexture: soil?.texture || soil?.soilType,
    drainage: soil?.drainage,
    cropWaterClass: crop.waterRequirementClass,
    rainfallMm: assessment?.rainfall_mm || weather?.rainfallRecentMm,
    cropName: crop.name,
    groundwaterTrend: groundwater?.trend,
    confidenceScore,
  });

  // 9. Compute water saved volume dynamically based on crop water requirements & practice
  const estimatedWaterSavedM3PerHa = computeWaterSavedVolume(scoringResult.recommended, crop);

  // 10. Assemble full diagnostics including ML assessment values
  const mlAssessment = assessment ? {
    recharge_bcm: assessment.recharge_bcm,
    extraction_bcm: assessment.extraction_all_uses_bcm,
    extractable_bcm: assessment.extractable_resources_bcm,
    stage_of_extraction_pct: stagePct,
    category: assessment.category || gwClass.category,
    rainfall_mm: assessment.rainfall_mm,
  } : null;

  const report = {
    priority: gwClass.priority,
    groundwaterStatus: gwClass.category,
    actionRequired,
    recommendedPractice: bestPractice,
    waterSavingsPercentage: scoringResult.recommended.waterSavingsPct || bestPractice.waterSavingsPercentage || 55,
    estimatedWaterSavedM3PerHa,
    energySavedPercentage: scoringResult.recommended.energySavingsPct || bestPractice.energySavingsPercentage || 40,
    confidenceScore,
    aiPowered: true,
    modelSource: 'Agronomic Scoring Engine (FAO-56 + ICAR · 5 weighted factors)',
    village,
    crop,
    currentPractice: currentPractice.name,
    reasons,
    diagnostics: {
      groundwaterLevelMeters: groundwater?.levelMeters,
      groundwaterTrend: groundwater?.trend || 'UNKNOWN',
      groundwaterCategory: gwClass.category,
      weatherStatus: weather?.weatherStatus || 'AVAILABLE',
      rainfallRecentMm: weather?.rainfallRecentMm,
      rainfallForecastMm: weather?.rainfallForecastMm,
      temperature: weather?.temperature,
      et0: weather?.et0,
      soilType: soil?.soilType || 'Loamy Alluvium',
      soilTexture: soil?.texture || 'Medium',
      // ML Assessment values in diagnostics
      mlAssessment,
    },
    criticalStages: crop.criticalIrrigationStages,
    scoringBreakdown: scoringResult.ranked.slice(0, 3).map(r => ({
      technique: r.id,
      score: Math.round(r.score),
    })),
  };

  report.multilingualReport = translateReport(report);
  return report;
}

module.exports = { evaluateRecommendation };
