const authService = require('../services/auth.service');

const register = async (req, res) => {
  try {
    const { name, email, password, token } = req.body || {};
    const user = await authService.register({ name, email, password, token });

    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'An unexpected error occurred during registration' : error.message;

    if (statusCode === 500) {
      console.error('Registration error:', error);
    }

    return res.status(statusCode).json({
      status: 'error',
      message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await authService.login({ email, password });

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'An unexpected error occurred during login' : error.message;

    if (statusCode === 500) {
      console.error('Login error:', error);
    }

    return res.status(statusCode).json({
      status: 'error',
      message
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);

    return res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'An unexpected error occurred' : error.message;

    if (statusCode === 500) {
      console.error('Get profile error:', error);
    }

    return res.status(statusCode).json({
      status: 'error',
      message
    });
  }
};

const adminTest = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Admin authorization verified successfully',
    data: {
      user: req.user
    }
  });
};

const { query } = require('../db');

const validateToken = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is required'
      });
    }

    const tokenRes = await query('SELECT * FROM registration_tokens WHERE token = $1', [token.trim()]);
    if (tokenRes.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid registration token'
      });
    }

    const tokenRecord = tokenRes.rows[0];
    if (tokenRecord.is_used) {
      return res.status(400).json({
        status: 'error',
        message: 'Registration token has already been used'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        token: tokenRecord.token,
        role: tokenRecord.role,
        district_id: tokenRecord.district_id,
        village_id: tokenRecord.village_id
      }
    });
  } catch (error) {
    console.error('Validate token error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred during token validation'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  adminTest,
  validateToken
};
