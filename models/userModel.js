const db = require('../config/db');

const User = {
  // Find user by email
  findByEmail: async (email) => {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  },

  // Find user by ID
  findById: async (id) => {
    const [rows] = await db.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Create new user
  create: async (userData) => {
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [userData.name, userData.email, userData.password, userData.role]
    );
    return result.insertId;
  },

  // Save refresh token
  saveRefreshToken: async (userId, refreshToken) => {
    await db.query(
      'UPDATE users SET refresh_token = ? WHERE id = ?',
      [refreshToken, userId]
    );
  },

  // Find user by refresh token
  findByRefreshToken: async (refreshToken) => {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE refresh_token = ?',
      [refreshToken]
    );
    return rows[0];
  },

  // Check if email exists
  emailExists: async (email) => {
    const [rows] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    return rows.length > 0;
  }
};

module.exports = User;