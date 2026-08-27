const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');
const { ensureDatabaseInitialized } = require('../src/db/autoMigrate');
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
  
  // Create admin user
  const adminEmail = 'token_admin_test@example.com';
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
  `, ['Admin Test', adminEmail, passwordHash, 'ADMIN']);

  const adminLoginRes = await request('POST', '/api/auth/login', { email: adminEmail, password: 'password123' });
  adminToken = adminLoginRes.body?.data?.token;

  // Create normal auditor user
  const normalEmail = 'token_normal_test@example.com';
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
  `, ['Normal Test', normalEmail, passwordHash, 'AUDITOR']);

  const normalLoginRes = await request('POST', '/api/auth/login', { email: normalEmail, password: 'password123' });
  normalToken = normalLoginRes.body?.data?.token;
}

async function runTests() {
  console.log('\n--- Running Registration Invite Token Integration Tests ---\n');

  // 1. Generate token with district jurisdiction (Admin only)
  console.log('1. Testing generate registration token with district jurisdiction...');
  const generateRes = await request('POST', '/api/users/tokens', { role: 'AUDITOR', district_id: 1 }, adminToken);
  if (generateRes.status !== 201) {
    console.error('generateRes body:', generateRes.body);
  }
  assert(generateRes.status === 201, 'Admin can generate token (201 Created)');
  assert(generateRes.body.status === 'SUCCESS', 'Response status is SUCCESS');
  assert(generateRes.body.data.token.token !== undefined, 'Returned token is defined');
  assert(generateRes.body.data.token.district_id === 1, 'Token records district_id');
  const generatedToken = generateRes.body.data.token.token;
  console.log(`   Generated Token: ${generatedToken}`);

  // 1.1 Non-admin generate token rejected
  console.log('1.1 Testing non-admin generate token...');
  const badGenerateRes = await request('POST', '/api/users/tokens', { role: 'AUDITOR' }, normalToken);
  assert(badGenerateRes.status === 403, 'Normal user generate token rejected with 403 Forbidden');

  // 2. Public validate token
  console.log('2. Testing public validate token...');
  const validateRes = await request('POST', '/api/auth/validate-token', { token: generatedToken });
  assert(validateRes.status === 200, 'Public token validation succeeds (200 OK)');
  assert(validateRes.body.status === 'success', 'Response status is success');
  assert(validateRes.body.data.role === 'AUDITOR', 'Validated token maps to the correct role');
  assert(validateRes.body.data.district_id === 1, 'Validated token returns district_id');

  // 2.1 Validate invalid token
  console.log('2.1 Testing invalid token validation...');
  const badValidateRes = await request('POST', '/api/auth/validate-token', { token: 'INVALID_TOKEN_ABC' });
  assert(badValidateRes.status === 400, 'Invalid token validation rejected with 400 Bad Request');

  // 3. Register user with valid token
  console.log('3. Testing register user with valid token...');
  const newEmail = 'new_registered_auditor@example.com';
  await pool.query('DELETE FROM users WHERE email = $1', [newEmail]);

  const registerRes = await request('POST', '/api/auth/register', {
    name: 'Invite Auditor',
    email: newEmail,
    password: 'password123',
    token: generatedToken
  });

  assert(registerRes.status === 201, 'User registered successfully (201 Created)');
  assert(registerRes.body.status === 'success', 'Response status is success');
  assert(registerRes.body.data.user.role === 'AUDITOR', 'Registered user has correct role assigned');
  assert(registerRes.body.data.user.district_id === 1, 'Registered user has correct district assigned');

  // 4. Test already used token registration fails
  console.log('4. Testing registration with used token fails...');
  const secondEmail = 'second_registered_user@example.com';
  const badRegisterRes = await request('POST', '/api/auth/register', {
    name: 'Second User',
    email: secondEmail,
    password: 'password123',
    token: generatedToken
  });
  assert(badRegisterRes.status === 400, 'Reusing used token rejected with 400 Bad Request');
  assert(badRegisterRes.body.message.includes('already been used'), 'Message explains token is used');

  // 5. Test list tokens (Admin only)
  console.log('5. Testing admin list tokens...');
  const listTokensRes = await request('GET', '/api/users/tokens', null, adminToken);
  assert(listTokensRes.status === 200, 'Admin can list tokens (200 OK)');
  assert(listTokensRes.body.status === 'SUCCESS', 'Response status is SUCCESS');
  assert(Array.isArray(listTokensRes.body.data), 'Tokens data is an array');

  const foundToken = listTokensRes.body.data.find(t => t.token === generatedToken);
  assert(foundToken !== undefined, 'Generated token is in the list');
  assert(foundToken.is_used === true, 'Generated token is marked as used');
  assert(foundToken.used_by_username === 'Invite Auditor', 'Token records who used it');

  // 5.1 Non-admin list tokens fails
  console.log('5.1 Testing non-admin list tokens...');
  const badListRes = await request('GET', '/api/users/tokens', null, normalToken);
  assert(badListRes.status === 403, 'Normal user listing tokens rejected with 403 Forbidden');

  // Clean up test data
  await pool.query('DELETE FROM users WHERE email IN ($1, $2, $3)', ['token_admin_test@example.com', 'token_normal_test@example.com', 'new_registered_auditor@example.com']);
  await pool.query('DELETE FROM registration_tokens WHERE token = $1', [generatedToken]);

  console.log('\n========================================================================');
  console.log('ALL REGISTRATION INVITE TOKEN INTEGRATION TESTS PASSED!');
  console.log('========================================================================\n');
}

async function start() {
  server = app.listen(0, async () => {
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    try {
      await ensureDatabaseInitialized();
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
