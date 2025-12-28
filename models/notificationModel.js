const db = require('../config/db');

const Notification = {
  // Create new notification
  create: async (notificationData) => {
    const {
      user_id,
      type,
      message,
      title,
      description,
      related_id,
      related_type,
    } = notificationData;

    try {
      const query = `
        INSERT INTO notifications 
        (user_id, type, message, title, description, related_id, related_type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
      `;

      const [result] = await db.query(query, [
        user_id,
        type,
        message,
        title,
        description,
        related_id,
        related_type,
      ]);

      return {
        id: result.insertId,
        user_id,
        type,
        message,
        title,
        description,
        related_id,
        related_type,
        is_read: 0,
        created_at: new Date(),
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get all notifications for a user
  getByUserId: async (userId, days = null) => {
    try {
      let query = `
        SELECT * FROM notifications 
        WHERE user_id = ?
      `;

      const params = [userId];

      if (days) {
        query += ` AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
        params.push(days);
      }

      query += ` ORDER BY created_at DESC`;

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Get unread count
  getUnreadCount: async (userId) => {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = ? AND is_read = 0`,
        [userId]
      );
      return rows[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId, userId) => {
    try {
      const [result] = await db.query(
        `UPDATE notifications SET is_read = 1 
         WHERE id = ? AND user_id = ?`,
        [notificationId, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all as read for user
  markAllAsRead: async (userId) => {
    try {
      const [result] = await db.query(
        `UPDATE notifications SET is_read = 1 
         WHERE user_id = ? AND is_read = 0`,
        [userId]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },

  // Delete notification
  delete: async (notificationId, userId) => {
    try {
      const [result] = await db.query(
        `DELETE FROM notifications 
         WHERE id = ? AND user_id = ?`,
        [notificationId, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Clear all notifications for user
  clearAll: async (userId) => {
    try {
      const [result] = await db.query(
        `DELETE FROM notifications WHERE user_id = ?`,
        [userId]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  },

  // Get notification by ID
  getById: async (notificationId, userId) => {
    try {
      const [rows] = await db.query(
        `SELECT * FROM notifications 
         WHERE id = ? AND user_id = ?`,
        [notificationId, userId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error fetching notification:', error);
      throw error;
    }
  },

  // Create broadcast notification for all users
  createBroadcast: async (broadcastData) => {
    const { type, message, title, description } = broadcastData;

    try {
      // Get all active users
      const [users] = await db.query(`SELECT id FROM users WHERE is_active = 1`);

      if (users.length === 0) {
        return { success: true, count: 0 };
      }

      // Insert notification for each user
      const insertPromises = users.map((user) =>
        db.query(
          `INSERT INTO notifications 
           (user_id, type, message, title, description, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, 0, NOW())`,
          [user.id, type, message, title, description]
        )
      );

      await Promise.all(insertPromises);

      return { success: true, count: users.length };
    } catch (error) {
      console.error('Error creating broadcast notification:', error);
      throw error;
    }
  },

  // Get recent notifications for all users (for admin)
  getRecent: async (limit = 50) => {
    try {
      const [rows] = await db.query(
        `SELECT * FROM notifications 
         ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );
      return rows;
    } catch (error) {
      console.error('Error fetching recent notifications:', error);
      throw error;
    }
  },
};

module.exports = Notification;
