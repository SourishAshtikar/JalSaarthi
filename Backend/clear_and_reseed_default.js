const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { query, pool } = require('./src/db');
const { calculateAndPersistScore } = require('./src/services/sustainabilityScore.service');

async function run() {
  console.log('🧹 Clearing all scores, registration tokens, audits, crop records, farms, and users...');

  try {
    // Clear dynamic tables in correct dependency order
    await query('DELETE FROM sustainability_scores');
    await query('DELETE FROM registration_tokens');
    await query('DELETE FROM audits');
    await query('DELETE FROM farm_crop_records');
    await query('DELETE FROM farms');
    await query('DELETE FROM users');

    // Reset database sequences for clean incremental IDs
    try {
      await query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE farms_farm_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE farm_crop_records_record_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE audits_audit_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE sustainability_scores_score_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE registration_tokens_id_seq RESTART WITH 1');
    } catch (e) {
      console.log('Sequence reset warning:', e.message);
    }

    console.log('👥 Creating default users for all active roles...');
    const passwordHash = await bcrypt.hash('123456789', 10);

    // 1. Create ADMIN
    await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
      ['Admin User', 'admin@example.com', passwordHash, 'ADMIN']
    );
    console.log('✅ Created ADMIN user -> Email: admin@example.com, Password: 123456789');

    // 2. Create AUDITOR (assigned to Karnal district_id = 1)
    await query(
      "INSERT INTO users (name, email, password_hash, role, district_id) VALUES ($1, $2, $3, $4, $5)",
      ['Auditor User', 'auditor@example.com', passwordHash, 'AUDITOR', 1]
    );
    console.log('✅ Created AUDITOR user -> Email: auditor@example.com, Password: 123456789 (District: Karnal)');

    // 3. Create SARPANCH / VILLAGE_HEAD (assigned to Gharaunda village_id = 1, district_id = 1)
    await query(
      "INSERT INTO users (name, email, password_hash, role, village_id, district_id) VALUES ($1, $2, $3, $4, $5, $6)",
      ['Sarpanch User', 'sarpanch@example.com', passwordHash, 'VILLAGE_HEAD', 1, 1]
    );
    console.log('✅ Created SARPANCH (VILLAGE_HEAD) user -> Email: sarpanch@example.com, Password: 123456789 (Village: Gharaunda)');

    // Fetch the newly created Auditor's ID to associate with audits
    const auditorRes = await query("SELECT id FROM users WHERE role = 'AUDITOR' LIMIT 1");
    if (auditorRes.rows.length === 0) {
      throw new Error("Failed to retrieve created Auditor ID.");
    }
    const auditorId = auditorRes.rows[0].id;

    console.log('🌾 Seeding clean dummy farms, crop records, audits, and sustainability scores...');
    
    // Define realistic farms
    const farmDefinitions = [
      {
        name: 'Golden Harvest Agro Farm',
        owner_name: 'Baldev Singh',
        village_id: 1,
        total_land_area_hectares: 4.5,
        latitude: 29.5378,
        longitude: 76.9731,
        records: [
          { season_id: 1, year: '2025', crop_id: 1, area: 4.0, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Drip installed successfully' },
          { season_id: 2, year: '2025', crop_id: 2, area: 4.0, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Micro-irrigation continued' },
          { season_id: 1, year: '2026', crop_id: 1, area: 4.5, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Full compliance verified' }
        ]
      },
      {
        name: 'Kisan Pragati Kendra',
        owner_name: 'Devender Rawat',
        village_id: 1,
        total_land_area_hectares: 4.2,
        latitude: 29.5380,
        longitude: 76.9720,
        records: [
          { season_id: 1, year: '2026', crop_id: 1, area: 4.2, method_id: 3, audited: true, status: 'ADOPTED', actual_method: 3, notes: 'First season verified adoption' }
        ]
      },
      {
        name: 'Brahma Sarovar Farm',
        owner_name: 'Manish Chawla',
        village_id: 3, // Pehowa
        total_land_area_hectares: 4.8,
        latitude: 29.9810,
        longitude: 76.5835,
        records: [
          { season_id: 1, year: '2025', crop_id: 1, area: 4.5, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Pehowa drip model' },
          { season_id: 1, year: '2026', crop_id: 1, area: 4.8, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Verified 100% adoption' }
        ]
      },
      {
        name: 'Green Fields Micro-Irrigation Estate',
        owner_name: 'Sukhwinder Kaur',
        village_id: 1,
        total_land_area_hectares: 3.2,
        latitude: 29.5365,
        longitude: 76.9715,
        records: [
          { season_id: 1, year: '2025', crop_id: 1, area: 3.0, method_id: 1, audited: true, status: 'NOT_ADOPTED', actual_method: 1, notes: 'Conventional flood noted' },
          { season_id: 2, year: '2025', crop_id: 2, area: 3.0, method_id: 3, audited: true, status: 'ADOPTED', actual_method: 3, notes: 'Sprinkler adopted' },
          { season_id: 1, year: '2026', crop_id: 1, area: 3.2, method_id: 3, audited: true, status: 'ADOPTED', actual_method: 3, notes: 'Sprinkler active & working' }
        ]
      },
      {
        name: 'Satluj Eco Agro Holdings',
        owner_name: 'Virender Hooda',
        village_id: 1,
        total_land_area_hectares: 4.0,
        latitude: 29.5360,
        longitude: 76.9760,
        records: [
          { season_id: 1, year: '2025', crop_id: 1, area: 4.0, method_id: 1, audited: true, status: 'NOT_ADOPTED', actual_method: 1, notes: 'Flood irrigation' },
          { season_id: 2, year: '2025', crop_id: 2, area: 4.0, method_id: 1, audited: true, status: 'NOT_ADOPTED', actual_method: 1, notes: 'Flood irrigation' },
          { season_id: 1, year: '2026', crop_id: 1, area: 4.0, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Micro-irrigation adopted this Kharif' }
        ]
      },
      {
        name: 'Vedic Ganga Agro Farm',
        owner_name: 'Kuldeep Nain',
        village_id: 1,
        total_land_area_hectares: 3.5,
        latitude: 29.5370,
        longitude: 76.9748,
        records: [
          { season_id: 1, year: '2024', crop_id: 1, area: 3.5, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Drip verified' },
          { season_id: 1, year: '2025', crop_id: 1, area: 3.5, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Drip verified' },
          { season_id: 2, year: '2025', crop_id: 2, area: 3.5, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Sprinkler verified' },
          { season_id: 1, year: '2026', crop_id: 1, area: 3.5, method_id: 2, audited: true, status: 'NOT_ADOPTED', actual_method: 1, notes: 'Paddy flooded due to pump repair' }
        ]
      },
      {
        name: 'Pawanputra Krishi Kendra',
        owner_name: 'Rajesh Sharma',
        village_id: 1,
        total_land_area_hectares: 2.8,
        latitude: 29.5390,
        longitude: 76.9740,
        records: [
          { season_id: 1, year: '2025', crop_id: 1, area: 2.5, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Drip verified' },
          { season_id: 2, year: '2025', crop_id: 2, area: 2.5, method_id: 2, audited: true, status: 'ADOPTED', actual_method: 2, notes: 'Sprinkler verified' },
          { season_id: 1, year: '2026', crop_id: 1, area: 2.8, method_id: 1, audited: true, status: 'NOT_ADOPTED', actual_method: 1, notes: 'Canal flood used' }
        ]
      },
      {
        name: 'Navdeep Agro Orchards',
        owner_name: 'Navdeep Malik',
        village_id: 1,
        total_land_area_hectares: 5.0,
        latitude: 29.5350,
        longitude: 76.9705,
        records: [
          { season_id: 1, year: '2026', crop_id: 1, area: 5.0, method_id: 1, audited: true, status: 'NOT_ADOPTED', actual_method: 1, notes: 'Conventional flood irrigation' }
        ]
      },
      {
        name: 'Yamuna Basin Organic Farm',
        owner_name: 'Harpreet Dhillon',
        village_id: 1,
        total_land_area_hectares: 3.8,
        latitude: 29.5385,
        longitude: 76.9755,
        records: [
          { season_id: 1, year: '2026', crop_id: 1, area: 3.5, method_id: 3, audited: false, notes: 'Awaiting seasonal audit inspection' }
        ]
      }
    ];

    for (const f of farmDefinitions) {
      const farmRes = await query(`
        INSERT INTO farms (name, owner_name, village_id, total_land_area_hectares, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING farm_id
      `, [f.name, f.owner_name, f.village_id, f.total_land_area_hectares, f.latitude, f.longitude]);

      const farmId = farmRes.rows[0].farm_id;

      for (const r of f.records) {
        const recRes = await query(`
          INSERT INTO farm_crop_records (farm_id, season_id, agricultural_year, crop_id, cultivated_area_hectares, current_irrigation_method_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING record_id
        `, [farmId, r.season_id, r.year, r.crop_id, r.area, r.method_id]);

        const recordId = recRes.rows[0].record_id;

        if (r.audited) {
          await query(`
            INSERT INTO audits (record_id, auditor_id, actual_irrigation_method_id, adoption_status, audit_date, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [recordId, auditorId, r.actual_method, r.status, '2026-08-20', r.notes]);
        }
      }

      // Calculate score for 2026 Kharif
      await calculateAndPersistScore(farmId, 1, '2026');
    }

    console.log('🎉 Database reinitialized with default users and farms successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup/reseeding:', error);
    process.exit(1);
  }
}

run();
