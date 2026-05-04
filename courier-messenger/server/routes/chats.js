const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// GET /api/chats — список чатов текущего пользователя
router.get('/', protect, async (req, res) => {
  try {
    console.log(`Запрос чатов для пользователя: ${req.user._id} (${req.user.username})`);

    const chats = await Chat.find({
      participants: req.user._id
    })
      .populate('participants', 'username role isOnline avatar lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' }
      })
      .populate('orderRef', 'orderNumber status')
      .sort({ updatedAt: -1 });

    console.log(`Найдено чатов: ${chats.length}`);

    res.json({
      success: true,
      data: chats,
    });
  } catch (error) {
    console.error('Ошибка при получении чатов:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/chats — создать чат
router.post('/', protect, async (req, res) => {
  try {
    const { participants, type, name, orderRef } = req.body;

    // Добавляем текущего пользователя в участники, если его там нет
    const currentUserId = req.user._id.toString();
    let allParticipants = participants || [];
    if (!allParticipants.includes(currentUserId)) {
      allParticipants.push(currentUserId);
    }

    // Очистка от дубликатов
    allParticipants = [...new Set(allParticipants)];

    // Для direct чата проверяем, что такой чат ещё не существует
    if (type === 'direct' || (!type && allParticipants.length === 2)) {
      const existingChat = await Chat.findOne({
        type: 'direct',
        participants: { $all: allParticipants, $size: 2 }
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
