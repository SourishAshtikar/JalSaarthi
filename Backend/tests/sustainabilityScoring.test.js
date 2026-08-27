const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/db');
const { calculateAndPersistScore } = require('../src/services/sustainabilityScore.service');

async function runTests() {
  console.log('\n--- Running Sustainability Scoring Model Bias Correction Tests ---');

  try {
    // Force pre-cleanup of test records from previous crashed runs
    await db.query("DELETE FROM sustainability_scores WHERE farm_id IN (SELECT farm_id FROM farms WHERE name IN ('Farm A', 'Farm B', 'Farm C'))");
    await db.query("DELETE FROM audits WHERE record_id IN (SELECT record_id FROM farm_crop_records WHERE farm_id IN (SELECT farm_id FROM farms WHERE name IN ('Farm A', 'Farm B', 'Farm C')))");
    await db.query("DELETE FROM farm_crop_records WHERE farm_id IN (SELECT farm_id FROM farms WHERE name IN ('Farm A', 'Farm B', 'Farm C'))");
    await db.query("DELETE FROM farms WHERE name IN ('Farm A', 'Farm B', 'Farm C')");
    await db.query("DELETE FROM villages WHERE name = 'Test Scoring Village'");
    await db.query("DELETE FROM districts WHERE name = 'Test Scoring District'");
    await db.query("DELETE FROM states WHERE name = 'Test Scoring State'");
    await db.query("DELETE FROM crops WHERE name = 'Test Scoring Crop'");

    // Fetch an existing user to satisfy not-null auditor_id constraint (column is named id)
    const userRes = await db.query("SELECT id FROM users LIMIT 1");
    if (userRes.rows.length === 0) {
      throw new Error("No users found in the database to act as auditor.");
    }
    const auditorId = userRes.rows[0].id;

    // 1. Setup clean test village, district, state
    const stateRes = await db.query("INSERT INTO states (name) VALUES ('Test Scoring State') RETURNING state_id");
    const stateId = stateRes.rows[0].state_id;

    const distRes = await db.query(
      "INSERT INTO districts (name, state_id) VALUES ('Test Scoring District', $1) RETURNING district_id",
      [stateId]
    );
    const districtId = distRes.rows[0].district_id;

    const villRes = await db.query(
      "INSERT INTO villages (name, district_id) VALUES ('Test Scoring Village', $1) RETURNING village_id",
      [districtId]
    );
    const villageId = villRes.rows[0].village_id;

    // Fetch existing or insert Kharif season
    let seasonId;
    const existingSeason = await db.query("SELECT season_id FROM seasons WHERE name = 'Kharif'");
    if (existingSeason.rows.length > 0) {
      seasonId = existingSeason.rows[0].season_id;
    } else {
      const seasonRes = await db.query("INSERT INTO seasons (name) VALUES ('Kharif') RETURNING season_id");
      seasonId = seasonRes.rows[0].season_id;
    }

    // Insert unique crop
    const cropRes = await db.query("INSERT INTO crops (name, water_requirement_class) VALUES ('Test Scoring Crop', 'HIGH') RETURNING crop_id");
    const cropId = cropRes.rows[0].crop_id;

    // Fetch existing or insert Drip irrigation method
    let methodId;
    const existingMethod = await db.query("SELECT method_id FROM irrigation_methods WHERE name = 'Drip Irrigation'");
    if (existingMethod.rows.length > 0) {
      methodId = existingMethod.rows[0].method_id;
    } else {
      const methodRes = await db.query("INSERT INTO irrigation_methods (name, water_savings_percentage) VALUES ('Drip Irrigation', 55) RETURNING method_id");
      methodId = methodRes.rows[0].method_id;
    }

    // 2. Test Case A: First-time adopter (only 1 seasonal record, ADOPTED)
    console.log('\n1. Testing first-time adopter (1 season total)...');
    const farmARes = await db.query(
      "INSERT INTO farms (name, owner_name, village_id, total_land_area_hectares) VALUES ('Farm A', 'Owner A', $1, 10.0) RETURNING farm_id",
      [villageId]
    );
    const farmAId = farmARes.rows[0].farm_id;

    // Insert 1 crop record
    const recARes = await db.query(
      "INSERT INTO farm_crop_records (farm_id, season_id, agricultural_year, crop_id, current_irrigation_method_id, cultivated_area_hectares) VALUES ($1, $2, '2025-2026', $3, $4, 5.0) RETURNING record_id",
      [farmAId, seasonId, cropId, methodId]
    );
    const recordAId = recARes.rows[0].record_id;

    // Insert 1 adopted audit
    await db.query(
      "INSERT INTO audits (record_id, adoption_status, actual_irrigation_method_id, audit_date, auditor_id) VALUES ($1, 'ADOPTED', $2, CURRENT_DATE, $3)",
      [recordAId, methodId, auditorId]
    );

    // Calculate score
    const scoreA = await calculateAndPersistScore(farmAId, seasonId, '2025-2026');
    console.log(`   ✓ Sustainability Score computed: ${scoreA.sustainability_score}`);
    console.log(`   ✓ Component 1 (Adoption): ${scoreA.adoption_score} (Expected: 50)`);
    console.log(`   ✓ Component 2 (Continuity): ${scoreA.continued_adoption_score} (Expected: 10)`);
    console.log(`   ✓ Component 3 (Audit): ${scoreA.audit_score} (Expected: 20)`);

    if (Number(scoreA.sustainability_score) === 80) {
      console.log('   ✓ First-time adopter score correctly capped at 80 (bias resolved!)');
    } else {
      throw new Error(`Expected first-time adopter score of 80, but got ${scoreA.sustainability_score}`);
    }

    // 3. Test Case B: Experienced adopter with 3 historical adoptions
    console.log('\n2. Testing experienced adopter (3 seasons total)...');
    const farmBRes = await db.query(
      "INSERT INTO farms (name, owner_name, village_id, total_land_area_hectares) VALUES ('Farm B', 'Owner B', $1, 10.0) RETURNING farm_id",
      [villageId]
    );
    const farmBId = farmBRes.rows[0].farm_id;

    // Insert 3 crop records for 3 seasons/years
    const years = ['2023-2024', '2024-2025', '2025-2026'];
    for (let i = 0; i < 3; i++) {
      const recRes = await db.query(
        "INSERT INTO farm_crop_records (farm_id, season_id, agricultural_year, crop_id, current_irrigation_method_id, cultivated_area_hectares) VALUES ($1, $2, $3, $4, $5, 5.0) RETURNING record_id",
        [farmBId, seasonId, years[i], cropId, methodId]
      );
      const recId = recRes.rows[0].record_id;

      await db.query(
        "INSERT INTO audits (record_id, adoption_status, actual_irrigation_method_id, audit_date, auditor_id) VALUES ($1, 'ADOPTED', $2, CURRENT_DATE, $3)",
        [recId, methodId, auditorId]
      );
    }

    // Calculate score for the latest year
    const scoreB = await calculateAndPersistScore(farmBId, seasonId, '2025-2026');
    console.log(`   ✓ Sustainability Score computed: ${scoreB.sustainability_score}`);
    console.log(`   ✓ Component 1 (Adoption): ${scoreB.adoption_score} (Expected: 50)`);
    console.log(`   ✓ Component 2 (Continuity): ${scoreB.continued_adoption_score} (Expected: 30)`);
    console.log(`   ✓ Component 3 (Audit): ${scoreB.audit_score} (Expected: 20)`);

    if (Number(scoreB.sustainability_score) === 100) {
      console.log('   ✓ Experienced adopter score correctly reached 100!');
    } else {
      throw new Error(`Expected experienced adopter score of 100, but got ${scoreB.sustainability_score}`);
    }

    // 4. Test Case C: Experienced adopter with a minor historical slip
    console.log('\n3. Testing experienced adopter with a minor historical slip (4 adoptions, 1 non-adoption)...');
    const farmCRes = await db.query(
      "INSERT INTO farms (name, owner_name, village_id, total_land_area_hectares) VALUES ('Farm C', 'Owner C', $1, 10.0) RETURNING farm_id",
      [villageId]
    );
    const farmCId = farmCRes.rows[0].farm_id;

    // 5 records total: 4 ADOPTED, 1 NOT_ADOPTED
    const yearsC = ['2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026'];
    const statuses = ['ADOPTED', 'NOT_ADOPTED', 'ADOPTED', 'ADOPTED', 'ADOPTED'];
    
    for (let i = 0; i < 5; i++) {
      const recRes = await db.query(
        "INSERT INTO farm_crop_records (farm_id, season_id, agricultural_year, crop_id, current_irrigation_method_id, cultivated_area_hectares) VALUES ($1, $2, $3, $4, $5, 5.0) RETURNING record_id",
        [farmCId, seasonId, yearsC[i], cropId, methodId]
      );
      const recId = recRes.rows[0].record_id;

      await db.query(
        "INSERT INTO audits (record_id, adoption_status, actual_irrigation_method_id, audit_date, auditor_id) VALUES ($1, $2, $3, CURRENT_DATE, $4)",
        [recId, statuses[i], methodId, auditorId]
      );
    }

    const scoreC = await calculateAndPersistScore(farmCId, seasonId, '2025-2026');
    console.log(`   ✓ Sustainability Score computed: ${scoreC.sustainability_score}`);
    console.log(`   ✓ Component 1 (Adoption): ${scoreC.adoption_score} (Expected: 50)`);
    console.log(`   ✓ Component 2 (Continuity): ${scoreC.continued_adoption_score} (Expected: 30)`);
    console.log(`   ✓ Component 3 (Audit): ${scoreC.audit_score} (Expected: 20)`);

    if (Number(scoreC.sustainability_score) === 100) {
      console.log('   ✓ Experienced adopter with past slip correctly reached 100 (not heavily penalized!)');
    } else {
      throw new Error(`Expected score of 100, but got ${scoreC.sustainability_score}`);
    }

    // Cleanup test data
    console.log('\nCleaning up test records...');
    await db.query("DELETE FROM sustainability_scores WHERE farm_id IN ($1, $2, $3)", [farmAId, farmBId, farmCId]);
    await db.query("DELETE FROM audits WHERE record_id IN (SELECT record_id FROM farm_crop_records WHERE farm_id IN ($1, $2, $3))", [farmAId, farmBId, farmCId]);
    await db.query("DELETE FROM farm_crop_records WHERE farm_id IN ($1, $2, $3)", [farmAId, farmBId, farmCId]);
    await db.query("DELETE FROM farms WHERE farm_id IN ($1, $2, $3)", [farmAId, farmBId, farmCId]);
    await db.query("DELETE FROM villages WHERE village_id = $1", [villageId]);
    await db.query("DELETE FROM districts WHERE district_id = $1", [districtId]);
    await db.query("DELETE FROM states WHERE state_id = $1", [stateId]);
    await db.query("DELETE FROM crops WHERE crop_id = $1", [cropId]);

    console.log('\n========================================================================');
    console.log('ALL SUSTAINABILITY SCORING BIAS CORRECTION TESTS PASSED!');
    console.log('========================================================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test execution failed with error:', error);
    process.exit(1);
  }
}

runTests();
