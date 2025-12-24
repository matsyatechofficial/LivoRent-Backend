const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/env');

const AuthService = {
  // Tenant/Owner Signup
  signup: async (userData) => {
    // Check if email already exists
    const emailExists = await User.emailExists(userData.email);
    if (emailExists) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const userId = await User.create({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role // tenant or owner
    });

    return { id: userId, name: userData.name, email: userData.email, role: userData.role };
  },

  // Tenant/Owner Login
  login: async (email, password) => {
    const user = await User.findByEmail(email);
    
    if (!user || !user.is_active) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token
    await User.saveRefreshToken(user.id, refreshToken);

    // Remove password from response
    const { password: _, refresh_token: __, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      accessToken,
      refreshToken
    };
  },

  // Admin Login (separate for security)
  adminLogin: async (email, password) => {
    const user = await User.findByEmail(email);
    
    if (!user || user.role !== 'admin') {
      throw new Error('Invalid admin credentials');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Invalid admin credentials');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token
    await User.saveRefreshToken(user.id, refreshToken);

    // Remove password from response
    const { password: _, refresh_token: __, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      accessToken,
      refreshToken
    };
  },

  // Refresh Access Token
  refreshToken: async (refreshToken) => {
    if (!refreshToken) {
      throw new Error('Refresh token required');
    }

    // Find user by refresh token
    const user = await User.findByRefreshToken(refreshToken);
    if (!user) {
      throw new Error('Invalid refresh token');
    }

    // Verify refresh token
    jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return { accessToken: newAccessToken };
  },

  // Get user profile
  getProfile: async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  },

  // Logout (clear refresh token)
  logout: async (userId) => {
    await User.saveRefreshToken(userId, null);
    return true;
  }
};

module.exports = AuthService;