const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const transporter = require('../config/mailer');
const notificationTemplate = require('../templates/notificationEmailTamplete');

// ============================================
// LEGACY EMAIL NOTIFICATION (Keep for compatibility)
// ============================================

// SEND NOTIFICATION EMAIL
router.post('/send', async (req, res) => {
  const { email, title, message, name } = req.body;

  if (!email || !message)
    return res.status(400).json({ error: 'Email and message are required' });

  try {
    await transporter.sendMail({
      from: '"LivoRent" <livorent@gmail.com>',
      to: email,
      subject: title || 'Notification from LivoRent',
      html: notificationTemplate(
        title || 'Notification',
        message,
        name
      ),
    });

    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ============================================
// NEW REAL-TIME NOTIFICATION ROUTES
// ============================================

// All routes require authentication
router.use(authMiddleware);

// Get all notifications for current user
router.get('/', NotificationController.getAll);

// Get notifications by days (7, 15, 30)
router.get('/filter/:days', NotificationController.getByDays);

// Get unread count
router.get('/unread/count', NotificationController.getUnreadCount);

// Get single notification by ID
router.get('/:notificationId', NotificationController.getById);

// Mark notification as read
router.patch('/:notificationId/read', NotificationController.markAsRead);

// Mark all notifications as read
router.patch('/read/all', NotificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', NotificationController.delete);

// Clear all notifications for user
router.delete('/clear/all', NotificationController.clearAll);

// Server-Sent Events subscription for real-time updates
router.get('/stream/subscribe', NotificationController.subscribe);

// ============================================
// ADMIN NOTIFICATION ROUTES
// ============================================

// Create notification for specific user (Admin)
router.post(
  '/admin/send',
  roleMiddleware(['admin']),
  NotificationController.create
);

// Send broadcast notification to all users (Admin)
router.post(
  '/admin/broadcast',
  roleMiddleware(['admin']),
  NotificationController.sendBroadcast
);

module.exports = router;
