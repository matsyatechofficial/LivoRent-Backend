# Backend Notification Integration Guide

## Database Schema

```javascript
// models/notificationModel.js

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  message: String,
  type: {
    type: String,
    enum: ['success', 'error', 'warning', 'info', 'booking', 'payment', 'reminder', 'admin'],
    default: 'info',
  },
  description: String,
  read: {
    type: Boolean,
    default: false,
  },
  relatedId: String,
  broadcast: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', notificationSchema);
```

---

## Backend Service Layer

```javascript
// services/notificationService.js

const Notification = require('../models/notificationModel');
const { io } = require('../server'); // Your Socket.io instance

class NotificationService {
  // Create and send notification
  static async createNotification(userId, data) {
    try {
      const notification = new Notification({
        userId,
        message: data.message,
        type: data.type || 'info',
        description: data.description,
        relatedId: data.relatedId,
      });

      await notification.save();

      // Emit to connected user via Socket.io or EventSource
      io.to(userId.toString()).emit('notification', notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Broadcast to all users
  static async broadcastNotification(data) {
    try {
      const notifications = [];
      const users = await User.find();

      for (const user of users) {
        const notification = new Notification({
          userId: user._id,
          message: data.message,
          type: data.type || 'admin',
          description: data.description,
          broadcast: true,
        });

        await notification.save();
        notifications.push(notification);

        // Emit to each user
        io.to(user._id.toString()).emit('notification', notification);
      }

      return notifications;
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw error;
    }
  }

  // Get user notifications
  static async getUserNotifications(userId, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const notifications = await Notification.find({
        userId,
        createdAt: { $gte: cutoffDate },
      }).sort({ createdAt: -1 });

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Get unread count
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        read: false,
      });

      return count;
    } catch (error) {
      console.error('Error counting unread notifications:', error);
      return 0;
    }
  }

  // Mark as read
  static async markAsRead(notificationId) {
    try {
      await Notification.findByIdAndUpdate(notificationId, {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all as read
  static async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { userId, read: false },
        { read: true }
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId) {
    try {
      await Notification.findByIdAndDelete(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Clear all notifications for user
  static async clearAllNotifications(userId) {
    try {
      await Notification.deleteMany({ userId });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
```

---

## API Routes

```javascript
// routes/notificationRoutes.js

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const NotificationService = require('../services/notificationService');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const days = req.query.days || 30;
    const notifications = await NotificationService.getUserNotifications(
      req.user.id,
      days
    );

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread/count', async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark as read
router.patch('/:id/read', async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    await NotificationService.deleteNotification(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all notifications
router.delete('/', async (req, res) => {
  try {
    await NotificationService.clearAllNotifications(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Server-Sent Events stream for real-time notifications
router.get('/stream', (req, res) => {
  const userId = req.user.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Listen for new notifications for this user
  const handleNewNotification = (notification) => {
    if (notification.userId.toString() === userId.toString()) {
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    }
  };

  // Use your event emitter (Socket.io, EventEmitter, etc.)
  global.notificationEmitter?.on('new', handleNewNotification);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    global.notificationEmitter?.removeListener('new', handleNewNotification);
    res.end();
  });
});

// Broadcast notification (admin only)
router.post('/broadcast', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const notifications = await NotificationService.broadcastNotification(
      req.body
    );

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## Integration: Booking Confirmation

```javascript
// routes/bookingRoutes.js

const express = require('express');
const NotificationService = require('../services/notificationService');

router.patch('/bookings/:id/confirm', authMiddleware, async (req, res) => {
  try {
    // Update booking status
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed' },
      { new: true }
    ).populate('tenantId propertyId');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Create notification for tenant
    await NotificationService.createNotification(
      booking.tenantId._id,
      {
        message: '✅ Booking confirmed successfully',
        type: 'booking',
        description: `Your booking for ${booking.propertyId.title} has been confirmed`,
        relatedId: booking._id,
      }
    );

    // Optional: Create notification for property owner
    await NotificationService.createNotification(
      booking.propertyId.ownerId,
      {
        message: '✅ Booking confirmed',
        type: 'booking',
        description: `A new booking for ${booking.propertyId.title} has been confirmed`,
        relatedId: booking._id,
      }
    );

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Integration: Payment Success

```javascript
// routes/paymentRoutes.js

const express = require('express');
const NotificationService = require('../services/notificationService');

router.post('/payments/confirm', authMiddleware, async (req, res) => {
  try {
    // Process payment
    const payment = await Payment.findByIdAndUpdate(
      req.body.paymentId,
      { status: 'success', confirmedAt: new Date() },
      { new: true }
    ).populate('bookingId userId');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Create notification for tenant
    await NotificationService.createNotification(
      payment.userId._id,
      {
        message: '💰 Payment received',
        type: 'payment',
        description: `Payment of Rs. ${payment.amount} has been received successfully`,
        relatedId: payment._id,
      }
    );

    // Optional: Create notification for property owner
    const booking = await Booking.findById(payment.bookingId).populate('propertyId');
    await NotificationService.createNotification(
      booking.propertyId.ownerId,
      {
        message: '💰 Payment received',
        type: 'payment',
        description: `Payment of Rs. ${payment.amount} for your property has been received`,
        relatedId: payment._id,
      }
    );

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Setup Instructions

1. **Install Socket.io** (for real-time notifications):
```bash
npm install socket.io
```

2. **Register routes in server.js**:
```javascript
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);
```

3. **Initialize EventEmitter**:
```javascript
const EventEmitter = require('events');
global.notificationEmitter = new EventEmitter();
```

4. **Emit notifications when events occur**:
```javascript
global.notificationEmitter.emit('new', notification);
```

5. **Frontend** will automatically:
   - Receive notifications
   - Show toast
   - Update bell count
   - Play sound
   - Display in panel

---

## Testing

```bash
# Test notification API
curl -X POST http://localhost:5000/api/notifications/broadcast \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "📢 System maintenance at 10 PM",
    "type": "admin",
    "description": "The system will be under maintenance for 2 hours"
  }'
```

---

## That's All!

Your notification system is now fully integrated and ready to use! 🎉

Just add calls to `NotificationService.createNotification()` wherever you want to send notifications.
