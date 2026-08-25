const pool = require('../db');
const cropMetadataConfig = require('../config/cropMetadata.json');

async function getSeasons() {
  const res = await pool.query('SELECT id, name, code FROM seasons ORDER BY id ASC');
  return res.rows;
}

async function getSeasonById(seasonId) {
  const res = await pool.query('SELECT id, name, code FROM seasons WHERE id = $1', [seasonId]);
  return res.rows[0] || null;
}

async function getCrops(seasonId) {
  if (seasonId) {
    const res = await pool.query(
      'SELECT id, name, water_requirement_class, season_id FROM crops WHERE season_id = $1 ORDER BY name ASC',
      [seasonId]
    );
    return res.rows;
  } else {
    const res = await pool.query(
      'SELECT id, name, water_requirement_class, season_id FROM crops ORDER BY name ASC'
    );
    return res.rows;
  }
}

async function getCropById(cropId) {
  const res = await pool.query(
    'SELECT id, name, water_requirement_class, season_id FROM crops WHERE id = $1',
    [cropId]
  );

  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  const meta = cropMetadataConfig.crops.find(c => c.id === row.id) || {};

  return {
    id: row.id,
    name: row.name,
    waterRequirementClass: row.water_requirement_class || meta.waterRequirementClass || 'High',
    seasonId: row.season_id,
    suitableIrrigationPractices: meta.suitableIrrigationPractices || [2, 3],
    unsuitableIrrigationPractices: meta.unsuitableIrrigationPractices || [1],
    criticalIrrigationStages: meta.criticalIrrigationStages || []
  };
}

async function getIrrigationMethods() {
  const res = await pool.query('SELECT id, name FROM irrigation_methods ORDER BY id ASC');
  return res.rows;
}

async function getIrrigationMethodById(methodId) {
  const res = await pool.query('SELECT id, name FROM irrigation_methods WHERE id = $1', [methodId]);
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
