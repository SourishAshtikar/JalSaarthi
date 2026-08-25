const { query } = require('../db');
const cropMetadataConfig = require('../config/cropMetadata.json');

async function getSeasons() {
  const res = await query('SELECT season_id AS id, name FROM seasons ORDER BY season_id ASC');
  return res.rows;
}

async function getSeasonById(seasonId) {
  const res = await query('SELECT season_id AS id, name FROM seasons WHERE season_id = $1', [seasonId]);
  return res.rows[0] || null;
}

async function getCrops(seasonId) {
  // The current schema does not associate a crop with one season. Keep the
  // optional parameter API-compatible while returning the shared catalogue.
  void seasonId;
  const res = await query('SELECT crop_id AS id, name, water_requirement AS water_requirement_class FROM crops ORDER BY name ASC');
  return res.rows;
}

async function getCropById(cropId) {
  const res = await query(
    'SELECT crop_id AS id, name, water_requirement AS water_requirement_class FROM crops WHERE crop_id = $1',
    [cropId]
  );

  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  const meta = cropMetadataConfig.crops.find(c => c.id === row.id) || {};

  return {
    id: row.id,
    name: row.name,
    waterRequirementClass: row.water_requirement_class || meta.waterRequirementClass || 'High',
    seasonId: null,
    suitableIrrigationPractices: meta.suitableIrrigationPractices || [2, 3],
    unsuitableIrrigationPractices: meta.unsuitableIrrigationPractices || [1],
    criticalIrrigationStages: meta.criticalIrrigationStages || []
  };
}

async function getIrrigationMethods() {
  const res = await query('SELECT method_id AS id, name FROM irrigation_methods ORDER BY method_id ASC');
  return res.rows;
}

async function getIrrigationMethodById(methodId) {
  const res = await query('SELECT method_id AS id, name FROM irrigation_methods WHERE method_id = $1', [methodId]);
  return res.rows[0] || null;
}

module.exports = {
  getSeasons,
  getSeasonById,
  getCrops,
  getCropById,
  getIrrigationMethods,
  getIrrigationMethodById
};
