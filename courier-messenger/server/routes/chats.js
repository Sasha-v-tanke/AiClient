const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// GET /api/chats — список чатов текущего пользователя
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
      isActive: true,
    })
      .populate('participants', 'username role isOnline avatar lastSeen')
      .populate('lastMessage')
      .populate('orderRef', 'orderNumber status')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: chats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/chats — создать чат
router.post('/', protect, async (req, res) => {
  try {
    const { participants, type, name, orderRef } = req.body;

    // Добавляем текущего пользователя в участники
    const allParticipants = [
      ...new Set([req.user._id.toString(), ...participants]),
    ];

    // Для direct чата проверяем, что такой чат ещё не существует
    if (type === 'direct') {
      const existingChat = await Chat.findOne({
        type: 'direct',
        participants: { $all: allParticipants, $size: 2 },
        isActive: true,
      });

      if (existingChat) {
        return res.json({
          success: true,
          data: await existingChat.populate(
            'participants',
            'username role isOnline avatar'
          ),
        });
      }
    }

    const chat = await Chat.create({
      participants: allParticipants,
      type: type || 'direct',
      name,
      orderRef,
      createdBy: req.user._id,
    });

    await chat.populate('participants', 'username role isOnline avatar');

    res.status(201).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/chats/:chatId — получить чат по ID
router.get('/:chatId', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id,
    })
      .populate('participants', 'username role isOnline avatar lastSeen')
      .populate('orderRef');

    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: 'Чат не найден' });
    }

    res.json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
