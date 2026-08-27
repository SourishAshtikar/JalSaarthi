const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { PUBLIC_REGISTRATION_ROLES } = require('../utils/constants');

const register = async ({ name, email, password, token }) => {
  // 1. Validation
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

  if (!token || typeof token !== 'string' || !token.trim()) {
    const error = new Error('Registration token is required');
    error.statusCode = 400;
    throw error;
  }

  // Validate token
  const tokenRes = await query('SELECT * FROM registration_tokens WHERE token = $1', [token.trim()]);
  if (tokenRes.rows.length === 0) {
    const error = new Error('Invalid registration token');
    error.statusCode = 400;
    throw error;
  }

  const tokenRecord = tokenRes.rows[0];
  if (tokenRecord.is_used) {
    const error = new Error('Registration token has already been used');
    error.statusCode = 400;
    throw error;
  }

  const resolvedRole = tokenRecord.role;
  const districtId = tokenRecord.district_id;
  const villageId = tokenRecord.village_id;

  // 2. Check duplicate email
  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  // 3. Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // 4. Insert user
  const result = await query(
    'INSERT INTO users (name, email, password_hash, role, district_id, village_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, district_id, village_id, created_at',
    [name.trim(), normalizedEmail, passwordHash, resolvedRole, districtId || null, villageId || null]
  );

  const newUser = result.rows[0];

  // Mark token as used
  await query(
    'UPDATE registration_tokens SET is_used = true, used_by = $1 WHERE token = $2',
    [newUser.id, tokenRecord.token]
  );

  return newUser;
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find user by email with village/district names joined
  const result = await query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.district_id, u.village_id, u.created_at,
            v.name AS village_name, d.name AS district_name
     FROM users u
     LEFT JOIN villages v ON u.village_id = v.village_id
     LEFT JOIN districts d ON u.district_id = d.district_id
     WHERE u.email = $1`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  // Generate JWT token with minimum necessary claims (id and role)
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      district_id: user.district_id,
      village_id: user.village_id,
      village_name: user.village_name,
      district_name: user.district_name,
      created_at: user.created_at
    }
  };
};

const getUserById = async (userId) => {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.role, u.district_id, u.village_id, u.created_at,
            v.name AS village_name, d.name AS district_name
     FROM users u
     LEFT JOIN villages v ON u.village_id = v.village_id
     LEFT JOIN districts d ON u.district_id = d.district_id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

module.exports = {
  register,
  login,
  getUserById
};
