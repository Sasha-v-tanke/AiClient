const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// GET /api/users — список пользователей
router.get('/', protect, async (req, res) => {
  try {
    const { role, search } = req.query;
    let filter = {};

    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).select('-password');

    res.json({
      success: true,
      data: users.map((u) => u.toPublicJSON()),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/location — обновить геолокацию
router.put('/location', protect, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    req.user.location = {
      type: 'Point',
      coordinates: [lng, lat],
    };
    await req.user.save();

    res.json({
      success: true,
      data: req.user.toPublicJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/couriers/online — онлайн-курьеры
router.get(
  '/couriers/online',
  protect,
  authorize('dispatcher', 'admin'),
  async (req, res) => {
    try {
      const couriers = await User.find({
        role: 'courier',
        isOnline: true,
      });

      res.json({
        success: true,
        data: couriers.map((c) => c.toPublicJSON()),
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
