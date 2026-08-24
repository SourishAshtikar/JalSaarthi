const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { query, pool } = require('../src/db');

const districtNameMap = {
  'AMBALA': 'Ambala',
  'BHIWANI': 'Bhiwani',
  'CHARKI DADRI': 'Charkhi Dadri',
  'CHARKHI DADRI': 'Charkhi Dadri',
  'FARIDABAD': 'Faridabad',
  'FATEHABAD': 'Fatehabad',
  'GURGAON': 'Gurugram',
  'GURUGRAM': 'Gurugram',
  'HISAR': 'Hisar',
  'HISSAR': 'Hisar',
  'JHAJJAR': 'Jhajjar',
  'JIND': 'Jind',
  'KAITHAL': 'Kaithal',
  'KARNAL': 'Karnal',
  'KURUKSHETRA': 'Kurukshetra',
  'MAHENDRAGARH': 'Mahendragarh',
  'MOHINDERGARH': 'Mahendragarh',
  'MEWAT': 'Nuh',
  'NUH': 'Nuh',
  'PALWAL': 'Palwal',
  'PANCHKULA': 'Panchkula',
  'PANIPAT': 'Panipat',
  'REWARI': 'Rewari',
  'ROHTAK': 'Rohtak',
  'SIRSA': 'Sirsa',
  'SONEPAT': 'Sonipat',
  'SONIPAT': 'Sonipat',
  'YAMUNA NAGAR': 'Yamunanagar',
  'YAMUNANAGAR': 'Yamunanagar'
};

function getCategory(dtw) {
  if (dtw === null || dtw === undefined || isNaN(dtw)) return 'No Data';
  if (dtw < 5.0) return 'Safe';
  if (dtw < 10.0) return 'Semi Critical';
  if (dtw < 20.0) return 'Critical';
  return 'Over Exploited';
}

async function run() {
  console.log("=== Historical Groundwater Level Seeder Starting ===");
  
  // 1. Fetch District and Village master records
  const districtsRes = await query('SELECT district_id, name FROM districts');
  const villagesRes = await query('SELECT village_id, name, district_id FROM villages');
  
  const dbDistricts = {};
  districtsRes.rows.forEach(d => {
    dbDistricts[d.name.toLowerCase()] = d.district_id;
  });
  
  const dbVillages = {};
  villagesRes.rows.forEach(v => {
    dbVillages[v.name.toLowerCase()] = {
      village_id: v.village_id,
      district_id: v.district_id
    };
  });
  
  // 2. Read and Parse CSV
  const csvPath = path.join(__dirname, '../Dataset/gwl_manual_quarterly_cgwb_hr_1991_2020.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`Dataset not found at ${csvPath}`);
    process.exit(1);
  }
  
  console.log("Reading CSV file...");
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Parsing ${lines.length} lines...`);
  
  const headers = lines[0].split(',');
  
  // We want to group measurements by location & agricultural year
  const districtYearGroups = {}; // key: district_id:year -> array of levels
  const villageYearGroups = {};  // key: village_id:year -> array of levels
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = line.split(',');
    if (row.length < 21) continue;
    
    const rawDistrict = row[6]; // District
    const rawVillage = row[9];  // Village
    const dateStr = row[19];    // Data Acquisition Time
    const rawGwl = row[20];     // Groundwater Level Quarterly Manual (meter)
    
    const gwl = parseFloat(rawGwl);
    if (isNaN(gwl)) continue;
    
    // Normalize District
    const normDistrictName = districtNameMap[rawDistrict.toUpperCase()];
    if (!normDistrictName) continue;
    
    const districtId = dbDistricts[normDistrictName.toLowerCase()];
    if (!districtId) continue;
    
    // Parse Year and Month to get Agricultural Year
    const datePart = dateStr.split(' ')[0];
    let year, month;
    if (datePart.includes('-')) {
      const parts = datePart.split('-');
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      } else {
        year = parseInt(parts[2], 10);
        month = parseInt(parts[1], 10);
      }
    } else if (datePart.includes('/')) {
      const parts = datePart.split('/');
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      } else {
        year = parseInt(parts[2], 10);
        month = parseInt(parts[1], 10);
      }
    }
    
    if (isNaN(year) || isNaN(month)) continue;
    
    let startYear = year;
    if (month < 4) {
      startYear = year - 1;
    }
    const assessmentYear = `${startYear}-${startYear + 1}`;
    
    // Check if it belongs to one of our mapped villages
    const villageMeta = dbVillages[rawVillage.toLowerCase()];
    if (villageMeta && villageMeta.district_id === districtId) {
      const vKey = `${villageMeta.village_id}:${assessmentYear}`;
      if (!villageYearGroups[vKey]) villageYearGroups[vKey] = [];
      villageYearGroups[vKey].push(gwl);
    } else {
      const dKey = `${districtId}:${assessmentYear}`;
      if (!districtYearGroups[dKey]) districtYearGroups[dKey] = [];
      districtYearGroups[dKey].push(gwl);
    }
  }
  
  console.log("Calculated groups. Clearing old pre-2023 records from database...");
  // Clear any existing pre-2023 records to prevent primary key conflicts on re-runs
  await query("DELETE FROM groundwater_assessments WHERE assessment_year NOT IN ('2023-2024', '2024-2025', '2025-2026', '2026-2027')");
  
  console.log("Inserting aggregated district records...");
  let districtInsertCount = 0;
  for (const [key, list] of Object.entries(districtYearGroups)) {
    const [districtId, year] = key.split(':');
    const sum = list.reduce((a, b) => a + b, 0);
    const avgDtw = sum / list.length;
    const cat = getCategory(avgDtw);
    
    // For historical pre-2023 data, we don't have BCM recharge/extraction, so we insert nulls
    await query(`
      INSERT INTO groundwater_assessments 
        (district_id, assessment_year, is_predicted, category, dtw_m_bgl)
      VALUES 
        ($1, $2, false, $3, $4)
      ON CONFLICT (district_id, assessment_year, is_predicted) WHERE village_id IS NULL
      DO UPDATE SET dtw_m_bgl = EXCLUDED.dtw_m_bgl, category = EXCLUDED.category
    `, [parseInt(districtId, 10), year, cat, parseFloat(avgDtw.toFixed(2))]);
    
    districtInsertCount++;
  }
  
  console.log(`Inserted ${districtInsertCount} district assessment records.`);
  
  console.log("Inserting aggregated village records...");
  let villageInsertCount = 0;
  for (const [key, list] of Object.entries(villageYearGroups)) {
    const [villageId, year] = key.split(':');
    const sum = list.reduce((a, b) => a + b, 0);
    const avgDtw = sum / list.length;
    const cat = getCategory(avgDtw);
    
    await query(`
      INSERT INTO groundwater_assessments 
        (village_id, assessment_year, is_predicted, category, dtw_m_bgl)
      VALUES 
        ($1, $2, false, $3, $4)
      ON CONFLICT (village_id, assessment_year, is_predicted) WHERE district_id IS NULL
      DO UPDATE SET dtw_m_bgl = EXCLUDED.dtw_m_bgl, category = EXCLUDED.category
    `, [parseInt(villageId, 10), year, cat, parseFloat(avgDtw.toFixed(2))]);
    
    villageInsertCount++;
  }
  
  console.log(`Inserted ${villageInsertCount} village assessment records.`);
  console.log("=== Seeding Historical GWL Completed Successfully! ===");
}

run().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
}).finally(() => {
  pool.end();
});
