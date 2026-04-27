const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  handleValidationErrors,
} = require('../middleware/validator');

// POST /api/auth/register
router.post(
  '/register',
  registerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, password, phone, role } = req.body;

      // Проверка уникальности
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким email или именем уже существует',
        });
      }

      const user = await User.create({
        username,
        email,
        password,
        phone,
        role,
      });

      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        data: {
          user: user.toPublicJSON(),
          token,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Неверные учётные данные',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Неверные учётные данные',
        });
      }

      // Обновляем статус
      user.isOnline = true;
      user.lastSeen = Date.now();
      await user.save();

      const token = generateToken(user._id);

      res.json({
        success: true,
        data: {
          user: user.toPublicJSON(),
          token,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    data: req.user.toPublicJSON(),
  });
});

// POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    req.user.isOnline = false;
    req.user.lastSeen = Date.now();
    await req.user.save();

    res.json({
      success: true,
      message: 'Вы вышли из системы',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
