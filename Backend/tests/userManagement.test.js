const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');
const app = require('../src/app');
const http = require('http');

let server;
let baseUrl;
let adminToken;
let normalToken;

async function request(method, path, body = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`   ✓ ${message}`);
}

async function setupTestData() {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // 1. Create admin user
  const adminEmail = 'admin_user_test@example.com';
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
  `, ['Admin Test', adminEmail, passwordHash, 'ADMIN']);

  const adminLoginRes = await request('POST', '/api/auth/login', { email: adminEmail, password: 'password123' });
  adminToken = adminLoginRes.body?.data?.token;

  // 2. Create normal (auditor) user
  const normalEmail = 'normal_user_test@example.com';
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
  `, ['Normal Test', normalEmail, passwordHash, 'AUDITOR']);

  const normalLoginRes = await request('POST', '/api/auth/login', { email: normalEmail, password: 'password123' });
  normalToken = normalLoginRes.body?.data?.token;

  if (!adminToken || !normalToken) {
    throw new Error('Failed to set up auth tokens for test');
  }
}

async function runTests() {
  console.log('\n--- Running Admin User Management Integration Tests ---\n');

  // 1. Unauthenticated request rejected
  console.log('1. Testing unauthenticated request to /api/users...');
  const unauthRes = await request('GET', '/api/users');
  assert(unauthRes.status === 401, 'Unauthenticated request rejected with 401 Unauthorized');

  // 2. Non-admin request rejected
  console.log('2. Testing non-admin (AUDITOR role) request to /api/users...');
  const forbiddenRes = await request('GET', '/api/users', null, normalToken);
  assert(forbiddenRes.status === 403, 'Auditor request rejected with 403 Forbidden');

  // 3. Admin request succeeds
  console.log('3. Testing admin list users...');
  const listRes = await request('GET', '/api/users', null, adminToken);
  assert(listRes.status === 200, 'Admin request returns 200 OK');
  assert(listRes.body.status === 'SUCCESS', 'Response status is SUCCESS');
  assert(Array.isArray(listRes.body.data), 'Data is an array');

  // 3.1 Admin get stats succeeds
  console.log('3.1 Testing admin get stats...');
  const statsRes = await request('GET', '/api/users/stats', null, adminToken);
  assert(statsRes.status === 200, 'Admin stats request returns 200 OK');
  assert(statsRes.body.status === 'SUCCESS', 'Response status is SUCCESS');
  assert(statsRes.body.data.totalUsers !== undefined, 'Stats has totalUsers');
  assert(statsRes.body.data.roles !== undefined, 'Stats has roles object');

  // 4. Admin create user (Village Head assigned to village 1)
  console.log('4. Testing admin create user...');
  const testUserEmail = 'new_village_head@example.com';
  
  // Clean up any existing test user first
  await pool.query('DELETE FROM users WHERE email = $1', [testUserEmail]);

  const createRes = await request('POST', '/api/users', {
    name: 'New Village Head',
    email: testUserEmail,
    password: 'password123',
    role: 'VILLAGE_HEAD',
    village_id: 1
  }, adminToken);

  assert(createRes.status === 201, 'User created successfully (201 Created)');
  assert(createRes.body.status === 'SUCCESS', 'Response status is SUCCESS');
  assert(createRes.body.data.user.id !== undefined, 'Returned user has an ID');
  assert(createRes.body.data.user.role === 'VILLAGE_HEAD', 'Returned user role is correct');
  assert(createRes.body.data.user.village_id === 1, 'Returned user village assignment is correct');
  const createdUserId = createRes.body.data.user.id;

  // 5. Admin update user (Change name, reassign to district 1 as Auditor)
  console.log('5. Testing admin update user...');
  const updateRes = await request('PUT', `/api/users/${createdUserId}`, {
    name: 'Updated Auditor',
    role: 'AUDITOR',
    district_id: 1,
    village_id: null
  }, adminToken);

  assert(updateRes.status === 200, 'User updated successfully (200 OK)');
  assert(updateRes.body.status === 'SUCCESS', 'Response status is SUCCESS');
  assert(updateRes.body.data.user.name === 'Updated Auditor', 'Returned user name is updated');
  assert(updateRes.body.data.user.role === 'AUDITOR', 'Returned user role is updated to AUDITOR');
  assert(updateRes.body.data.user.district_id === 1, 'Returned user district assignment is correct');
  assert(updateRes.body.data.user.village_id === null, 'Returned user village assignment is cleared');

  // 6. Admin delete user
  console.log('6. Testing admin delete user...');
  const deleteRes = await request('DELETE', `/api/users/${createdUserId}`, null, adminToken);
  assert(deleteRes.status === 200, 'User deleted successfully (200 OK)');
  assert(deleteRes.body.status === 'SUCCESS', 'Response status is SUCCESS');
  assert(deleteRes.body.data.id === createdUserId, 'Returned deleted user ID matches');

  // Clean up admin and auditor test users
  await pool.query('DELETE FROM users WHERE email IN ($1, $2)', ['admin_user_test@example.com', 'normal_user_test@example.com']);

  console.log('\n========================================================================');
  console.log('ALL USER MANAGEMENT API INTEGRATION TESTS PASSED!');
  console.log('========================================================================\n');
}

async function start() {
  server = app.listen(0, async () => {
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    try {
      await setupTestData();
      await runTests();
    } catch (err) {
      console.error('Test execution error:', err);
      process.exit(1);
    } finally {
      server.close();
      await pool.end();
    }
  });
}

start();
