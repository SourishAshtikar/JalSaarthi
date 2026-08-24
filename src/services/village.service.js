const pool = require('../db');

async function getStates() {
  const res = await pool.query('SELECT id, name, code FROM states ORDER BY name ASC');
  return res.rows;
}

async function getDistricts(stateId = 1) {
  const res = await pool.query(
    'SELECT id, name, code, state_id FROM districts WHERE state_id = $1 ORDER BY name ASC',
    [stateId]
  );
  return res.rows;
}

async function getVillages(districtId) {
  if (districtId) {
    const res = await pool.query(
      'SELECT id, name, district_id, latitude, longitude, block_name, lgd_code FROM villages WHERE district_id = $1 ORDER BY name ASC',
      [districtId]
    );
    return res.rows;
  } else {
    const res = await pool.query(
      'SELECT id, name, district_id, latitude, longitude, block_name, lgd_code FROM villages ORDER BY name ASC LIMIT 100'
    );
    return res.rows;
  }
}

async function getVillageById(villageId) {
  const res = await pool.query(
    `SELECT v.id, v.name, v.district_id, v.latitude, v.longitude, v.block_name, v.lgd_code,
            d.name as district_name, d.state_id, s.name as state_name
     FROM villages v
     JOIN districts d ON v.district_id = d.id
     JOIN states s ON d.state_id = s.id
     WHERE v.id = $1`,
    [villageId]
  );

  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    districtId: row.district_id,
    districtName: row.district_name,
    stateId: row.state_id,
    stateName: row.state_name,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
    blockName: row.block_name,
    lgdCode: row.lgd_code
  };
}

module.exports = {
  getStates,
  getDistricts,
  getVillages,
  getVillageById
};
