const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../db');

/**
 * List all users with their district and village names
 */
async function listUsers() {
  const sql = `
    SELECT u.id, u.name, u.email, u.role, u.district_id, u.village_id, u.created_at,
           d.name AS district_name, v.name AS village_name
    FROM users u
    LEFT JOIN districts d ON u.district_id = d.district_id
    LEFT JOIN villages v ON u.village_id = v.village_id
    ORDER BY u.created_at DESC
  `;
  const res = await query(sql);
  return res.rows;
}

/**
 * Create a new user with validation and optional district/village assignment
 */
async function createUser({ name, email, password, role, district_id, village_id }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    const error = new Error('Name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    const error = new Error('Email is required');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    const error = new Error('Invalid email format');
    error.statusCode = 400;
    throw error;
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    const error = new Error('Password must be at least 6 characters long');
    error.statusCode = 400;
    throw error;
  }

  const allowedRoles = ['VILLAGE_HEAD', 'AUDITOR', 'GOVERNMENT_EMPLOYEE', 'ADMIN'];
  if (!role || !allowedRoles.includes(role)) {
    const error = new Error(`Invalid role. Allowed roles are: ${allowedRoles.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Check duplicate email
  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const parsedDistrictId = district_id ? parseInt(district_id, 10) : null;
  const parsedVillageId = village_id ? parseInt(village_id, 10) : null;

  const sql = `
    INSERT INTO users (name, email, password_hash, role, district_id, village_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, email, role, district_id, village_id, created_at
  `;
  const res = await query(sql, [name.trim(), normalizedEmail, passwordHash, role, parsedDistrictId, parsedVillageId]);
  return res.rows[0];
}

/**
 * Update an existing user's information and assignments
 */
async function updateUser(id, { name, email, password, role, district_id, village_id }) {
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    const error = new Error('Invalid user ID');
    error.statusCode = 400;
    throw error;
  }

  // Check if user exists
  const checkUser = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (checkUser.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const user = checkUser.rows[0];
  const updatedName = name !== undefined ? name.trim() : user.name;
  if (!updatedName) {
    const error = new Error('Name cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  let updatedEmail = user.email;
  if (email !== undefined && email.trim().toLowerCase() !== user.email) {
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      const error = new Error('Invalid email format');
      error.statusCode = 400;
      throw error;
    }

    // Check duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1 AND id <> $2', [normalizedEmail, userId]);
    if (existing.rows.length > 0) {
      const error = new Error('An account with this email already exists');
      error.statusCode = 409;
      throw error;
    }
    updatedEmail = normalizedEmail;
  }

  let updatedPasswordHash = user.password_hash;
  if (password !== undefined && password !== null && password.trim()) {
    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      throw error;
    }
    updatedPasswordHash = await bcrypt.hash(password, 10);
  }

  const allowedRoles = ['VILLAGE_HEAD', 'AUDITOR', 'GOVERNMENT_EMPLOYEE', 'ADMIN'];
  const updatedRole = role !== undefined ? role : user.role;
  if (!allowedRoles.includes(updatedRole)) {
    const error = new Error(`Invalid role. Allowed roles are: ${allowedRoles.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const updatedDistrictId = district_id !== undefined ? (district_id ? parseInt(district_id, 10) : null) : user.district_id;
  const updatedVillageId = village_id !== undefined ? (village_id ? parseInt(village_id, 10) : null) : user.village_id;

  const sql = `
    UPDATE users
    SET name = $1, email = $2, password_hash = $3, role = $4, district_id = $5, village_id = $6
    WHERE id = $7
    RETURNING id, name, email, role, district_id, village_id
  `;
  const res = await query(sql, [updatedName, updatedEmail, updatedPasswordHash, updatedRole, updatedDistrictId, updatedVillageId, userId]);
  return res.rows[0];
}

/**
 * Delete a user by ID
 */
async function deleteUser(id) {
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    const error = new Error('Invalid user ID');
    error.statusCode = 400;
    throw error;
  }

  const res = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
  if (res.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return { id: userId };
}

/**
 * Get system-wide statistics for the admin dashboard
 */
async function getAdminStats() {
  const [usersCount, farmsCount, auditsCount, schemesCount, roleCounts] = await Promise.all([
    query('SELECT COUNT(*) as count FROM users'),
    query('SELECT COUNT(*) as count FROM farms'),
    query('SELECT COUNT(*) as count FROM audits'),
    query('SELECT COUNT(*) as count FROM schemes'),
    query('SELECT role, COUNT(*) as count FROM users GROUP BY role')
  ]);

  const roles = {
    ADMIN: 0,
    AUDITOR: 0,
    VILLAGE_HEAD: 0,
    GOVERNMENT_EMPLOYEE: 0
  };
  roleCounts.rows.forEach(r => {
    roles[r.role] = parseInt(r.count, 10);
  });

  return {
    totalUsers: parseInt(usersCount.rows[0].count, 10),
    totalFarms: parseInt(farmsCount.rows[0].count, 10),
    totalAudits: parseInt(auditsCount.rows[0].count, 10),
    totalSchemes: parseInt(schemesCount.rows[0].count, 10),
    roles
  };
}

/**
 * Generate a unique 16-character registration token for a specific role and jurisdiction
 */
async function generateRegistrationToken(role, districtId = null, villageId = null) {
  const allowedRoles = ['VILLAGE_HEAD', 'AUDITOR', 'GOVERNMENT_EMPLOYEE', 'ADMIN'];
  if (!role || !allowedRoles.includes(role)) {
    const error = new Error(`Invalid role. Allowed roles are: ${allowedRoles.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const token = crypto.randomBytes(8).toString('hex').toUpperCase();

  const sql = `
    INSERT INTO registration_tokens (token, role, district_id, village_id)
    VALUES ($1, $2, $3, $4)
    RETURNING token, role, district_id, village_id, created_at, is_used
  `;
  const res = await query(sql, [token, role, districtId || null, villageId || null]);
  return res.rows[0];
}

/**
 * List all generated registration tokens with status, used by username, and jurisdiction details
 */
async function listRegistrationTokens() {
  const sql = `
    SELECT 
      rt.token, 
      rt.role, 
      rt.created_at, 
      rt.is_used, 
      rt.used_by, 
      u.name AS used_by_username,
      d.name AS district_name,
      v.name AS village_name
    FROM registration_tokens rt
    LEFT JOIN users u ON rt.used_by = u.id
    LEFT JOIN districts d ON rt.district_id = d.district_id
    LEFT JOIN villages v ON rt.village_id = v.village_id
    ORDER BY rt.created_at DESC
  `;
  const res = await query(sql);
  return res.rows;
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getAdminStats,
  generateRegistrationToken,
  listRegistrationTokens
};
