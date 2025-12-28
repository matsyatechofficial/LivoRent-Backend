const Notification = require('../models/notificationModel');

const NotificationController = {
  // Create a new notification
  create: async (req, res) => {
    try {
      const { user_id, type, message, title, description, related_id, related_type } = req.body;

      // Validate required fields
      if (!user_id || !type || !message) {
        return res.status(400).json({
          success: false,
          error: 'user_id, type, and message are required',
        });
      }

      const notification = await Notification.create({
        user_id,
        type,
        message,
        title,
        description,
        related_id,
        related_type,
      });

      // Emit event for real-time updates
      if (global.eventSubscribers && global.eventSubscribers[user_id]) {
        global.eventSubscribers[user_id].forEach((res) => {
          res.write(`data: ${JSON.stringify(notification)}\n\n`);
        });
      }

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        notification,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create notification',
      });
    }
  },

  // Get all notifications for the current user
  getAll: async (req, res) => {
    try {
      const userId = req.user.id;
      const { days } = req.query;

      const notifications = await Notification.getByUserId(userId, days ? parseInt(days) : null);

      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        count: notifications.length,
        unreadCount,
        notifications,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
      });
    }
  },

  // Get notifications by days (7, 15, 30)
  getByDays: async (req, res) => {
    try {
      const userId = req.user.id;
      const { days } = req.params;

      if (![7, 15, 30].includes(parseInt(days))) {
        return res.status(400).json({
          success: false,
          error: 'Days must be 7, 15, or 30',
        });
      }

      const notifications = await Notification.getByUserId(userId, parseInt(days));

      res.json({
        success: true,
        count: notifications.length,
        notifications,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
      });
    }
  },

  // Get unread count
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.id;
      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        unreadCount,
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unread count',
      });
    }
  },

  // Mark notification as read
  markAsRead: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const success = await Notification.markAsRead(notificationId, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
      });
    }
  },

  // Mark all as read
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.id;
      const count = await Notification.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
        markedCount: count,
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all as read',
      });
    }
  },

  // Delete notification
  delete: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const success = await Notification.delete(notificationId, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
      });
    }
  },

  // Clear all notifications
  clearAll: async (req, res) => {
    try {
      const userId = req.user.id;
      const count = await Notification.clearAll(userId);

      res.json({
        success: true,
        message: 'All notifications cleared',
        deletedCount: count,
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear notifications',
      });
    }
  },

  // Send broadcast notification (Admin only)
  sendBroadcast: async (req, res) => {
    try {
      const { type, message, title, description } = req.body;

      if (!type || !message) {
        return res.status(400).json({
          success: false,
          error: 'type and message are required',
        });
      }

      const result = await Notification.createBroadcast({
        type,
        message,
        title,
        description,
      });

      // Broadcast to all connected clients
      if (global.eventSubscribers) {
        Object.keys(global.eventSubscribers).forEach((userId) => {
          global.eventSubscribers[userId].forEach((res) => {
            res.write(`data: ${JSON.stringify({
              id: 0,
              user_id: userId,
              type,
              message,
              title,
              description,
              is_read: 0,
              created_at: new Date(),
            })}\n\n`);
          });
        });
      }

      res.json({
        success: true,
        message: 'Broadcast notification sent successfully',
        notificationsSent: result.count,
      });
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send broadcast notification',
      });
    }
  },

  // Server-Sent Events endpoint for real-time notifications
  subscribe: (req, res) => {
    const userId = req.user.id;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Initialize subscribers object if needed
    if (!global.eventSubscribers) {
      global.eventSubscribers = {};
    }

    // Add this response to subscribers
    if (!global.eventSubscribers[userId]) {
      global.eventSubscribers[userId] = [];
    }
    global.eventSubscribers[userId].push(res);

    // Send initial connection message
    res.write(`:connected\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      global.eventSubscribers[userId] = global.eventSubscribers[userId].filter(
        (subscriber) => subscriber !== res
      );

      if (global.eventSubscribers[userId].length === 0) {
        delete global.eventSubscribers[userId];
      }

      res.end();
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30000);

    req.on('close', () => clearInterval(heartbeat));
  },

  // Get single notification
  getById: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const notification = await Notification.getById(notificationId, userId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
      }

      res.json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification',
      });
    }
  },
};

module.exports = NotificationController;
