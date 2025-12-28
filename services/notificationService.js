const db = require('../config/db');
const Notification = require('../models/notificationModel');

const NotificationService = {
  // Trigger notification when booking is confirmed
  onBookingConfirmed: async (bookingId, tenantId, propertyId) => {
    try {
      const notification = await Notification.create({
        user_id: tenantId,
        type: 'booking',
        message: '✅ Your booking has been confirmed',
        title: 'Booking Confirmed',
        description: 'Your property booking has been successfully confirmed.',
        related_id: bookingId,
        related_type: 'booking',
      });

      // Emit real-time update
      NotificationService.emitNotification(tenantId, notification);

      return notification;
    } catch (error) {
      console.error('Error on booking confirmed:', error);
      throw error;
    }
  },

  // Trigger notification when payment is received
  onPaymentReceived: async (paymentId, userId, amount) => {
    try {
      const notification = await Notification.create({
        user_id: userId,
        type: 'payment',
        message: `💰 Payment received: Rs. ${amount}`,
        title: 'Payment Received',
        description: `Payment of Rs. ${amount} has been received successfully.`,
        related_id: paymentId,
        related_type: 'payment',
      });

      NotificationService.emitNotification(userId, notification);
      return notification;
    } catch (error) {
      console.error('Error on payment received:', error);
      throw error;
    }
  },

  // Trigger notification for payment due reminder
  onPaymentDueReminder: async (userId, dueDate) => {
    try {
      const notification = await Notification.create({
        user_id: userId,
        type: 'reminder',
        message: '⏰ Payment is due soon',
        title: 'Payment Reminder',
        description: `Your payment is due on ${new Date(dueDate).toLocaleDateString()}. Please complete the payment before the due date.`,
        related_type: 'payment',
      });

      NotificationService.emitNotification(userId, notification);
      return notification;
    } catch (error) {
      console.error('Error on payment due reminder:', error);
      throw error;
    }
  },

  // Trigger notification when booking is cancelled
  onBookingCancelled: async (bookingId, tenantId) => {
    try {
      const notification = await Notification.create({
        user_id: tenantId,
        type: 'warning',
        message: '⚠️ Your booking has been cancelled',
        title: 'Booking Cancelled',
        description: 'Your property booking has been cancelled. Please contact support for more details.',
        related_id: bookingId,
        related_type: 'booking',
      });

      NotificationService.emitNotification(tenantId, notification);
      return notification;
    } catch (error) {
      console.error('Error on booking cancelled:', error);
      throw error;
    }
  },

  // Trigger notification for admin broadcast
  onAdminBroadcast: async (type, message, title, description) => {
    try {
      const result = await Notification.createBroadcast({
        type,
        message,
        title,
        description,
      });

      // Emit to all connected users
      if (global.eventSubscribers) {
        Object.keys(global.eventSubscribers).forEach((userId) => {
          const notification = {
            user_id: userId,
            type,
            message,
            title,
            description,
            is_read: 0,
            created_at: new Date(),
          };
          global.eventSubscribers[userId].forEach((res) => {
            res.write(`data: ${JSON.stringify(notification)}\n\n`);
          });
        });
      }

      return result;
    } catch (error) {
      console.error('Error on admin broadcast:', error);
      throw error;
    }
  },

  // Trigger notification when property is reviewed
  onPropertyReview: async (ownerUserId, reviewerName) => {
    try {
      const notification = await Notification.create({
        user_id: ownerUserId,
        type: 'info',
        message: `ℹ️ ${reviewerName} reviewed your property`,
        title: 'New Review',
        description: `${reviewerName} has left a review for your property. Check it out!`,
        related_type: 'review',
      });

      NotificationService.emitNotification(ownerUserId, notification);
      return notification;
    } catch (error) {
      console.error('Error on property review:', error);
      throw error;
    }
  },

  // Trigger notification for system error
  onSystemError: async (userId, errorMessage) => {
    try {
      const notification = await Notification.create({
        user_id: userId,
        type: 'error',
        message: `❌ ${errorMessage}`,
        title: 'Error Occurred',
        description: 'An error occurred while processing your request. Please try again or contact support.',
        related_type: 'error',
      });

      NotificationService.emitNotification(userId, notification);
      return notification;
    } catch (error) {
      console.error('Error on system error:', error);
      throw error;
    }
  },

  // Emit real-time notification to specific user
  emitNotification: (userId, notification) => {
    if (global.eventSubscribers && global.eventSubscribers[userId]) {
      global.eventSubscribers[userId].forEach((res) => {
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
      });
    }
  },

  // Emit notification to all users
  emitToAll: (notification) => {
    if (global.eventSubscribers) {
      Object.keys(global.eventSubscribers).forEach((userId) => {
        global.eventSubscribers[userId].forEach((res) => {
          res.write(`data: ${JSON.stringify(notification)}\n\n`);
        });
      });
    }
  },

  // Get notifications for specific days
  getNotificationsByDays: async (userId, days) => {
    try {
      const validDays = [7, 15, 30];
      if (!validDays.includes(days)) {
        throw new Error('Days must be 7, 15, or 30');
      }

      return await Notification.getByUserId(userId, days);
    } catch (error) {
      console.error('Error fetching notifications by days:', error);
      throw error;
    }
  },

  // Get unread notification count
  getUnreadCount: async (userId) => {
    try {
      return await Notification.getUnreadCount(userId);
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId, userId) => {
    try {
      return await Notification.markAsRead(notificationId, userId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Delete notification
  deleteNotification: async (notificationId, userId) => {
    try {
      return await Notification.delete(notificationId, userId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Get user notifications
  getUserNotifications: async (userId, days = null) => {
    try {
      return await Notification.getByUserId(userId, days);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  },
};

module.exports = NotificationService;
