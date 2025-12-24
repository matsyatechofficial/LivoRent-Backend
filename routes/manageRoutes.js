const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', messageController.create);
router.get('/', messageController.getMyMessages);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/:id', messageController.getConversation);

module.exports = router;