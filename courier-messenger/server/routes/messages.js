const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');
const {
  messageValidation,
  handleValidationErrors,
} = require('../middleware/validator');

// GET /api/messages/:chatId — сообщения чата с пагинацией
router.get('/:chatId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Проверяем, что пользователь — участник чата
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id,
    });

    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: 'Чат не найден' });
    }

    const messages = await Message.find({
      chat: req.params.chatId,
      isDeleted: false,
    })
      .populate('sender', 'username role avatar')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({
      chat: req.params.chatId,
      isDeleted: false,
    });

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/messages/:chatId — отправить сообщение
router.post(
  '/:chatId',
  protect,
  messageValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { content, messageType, metadata } = req.body;

      const message = await Message.create({
        chat: req.params.chatId,
        sender: req.user._id,
        content,
        messageType: messageType || 'text',
        metadata,
        readBy: [{ user: req.user._id }],
      });

      await message.populate('sender', 'username role avatar');

      // Оповещаем через Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${req.params.chatId}`).emit('new_message', message);
      }

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/messages/:messageId/read — отметить как прочитанное
router.put('/:messageId/read', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId).populate(
      'sender',
      'username role avatar'
    );

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: 'Сообщение не найдено' });
    }

    const chat = await Chat.findOne({
      _id: message.chat,
      participants: req.user._id,
    });

    if (!chat) {
      return res
        .status(403)
        .json({ success: false, message: 'Нет доступа к сообщению' });
    }

    const alreadyRead = message.readBy.some(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      message.readBy.push({ user: req.user._id });
      await message.save();
      await message.populate('sender', 'username role avatar');

      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${message.chat}`).emit('message_read', {
          messageId: message._id,
          userId: req.user._id,
          readBy: message.readBy,
        });
      }
    }

    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
