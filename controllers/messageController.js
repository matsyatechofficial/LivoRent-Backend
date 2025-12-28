const Message = require('../models/messageModel');

const messageController = {
  create: async (req, res) => {
    try {
      const { receiver_id, property_id, subject, message, parent_id } = req.body;
      
      const messageId = await Message.create({
        sender_id: req.user.id,
        receiver_id,
        property_id,
        subject,
        message,
        parent_id
      });

      res.status(201).json({
        message: 'Message sent successfully',
        messageId
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getMyMessages: async (req, res) => {
    try {
      const messages = await Message.findUserMessages(req.user.id);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getConversation: async (req, res) => {
    try {
      const conversation = await Message.findConversation(req.params.id);
      
      // Mark messages as read
      for (const msg of conversation) {
        if (msg.receiver_id === req.user.id && !msg.is_read) {
          await Message.markAsRead(msg.id);
        }
      }

      res.json({ conversation });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      const count = await Message.getUnreadCount(req.user.id);
      res.json({ unreadCount: count });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};