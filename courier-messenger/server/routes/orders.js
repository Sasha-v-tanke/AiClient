const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const DeliveryStatus = require('../models/DeliveryStatus');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect, authorize } = require('../middleware/auth');

// GET /api/orders — список заказов
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'courier') {
      filter.courier = req.user._id;
    } else if (req.user.role === 'dispatcher') {
      filter.dispatcher = req.user._id;
    }
    // admin видит все

    const { status, page = 1, limit = 20 } = req.query;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .populate('courier', 'username phone isOnline location')
      .populate('dispatcher', 'username phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: orders,
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

// POST /api/orders — создать заказ (диспетчер/админ)
router.post(
  '/',
  protect,
  authorize('dispatcher', 'admin'),
  async (req, res) => {
    try {
      const order = await Order.create({
        ...req.body,
        dispatcher: req.user._id,
      });

      await order.populate('dispatcher', 'username phone');

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/orders/:orderId/assign — назначить курьера
router.put(
  '/:orderId/assign',
  protect,
  authorize('dispatcher', 'admin'),
  async (req, res) => {
    try {
      const { courierId } = req.body;
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: 'Заказ не найден' });
      }

      // Создаём запись DeliveryStatus (она проверит корректность перехода)
      const deliveryStatus = await DeliveryStatus.create({
        order: order._id,
        previousStatus: order.status,
        newStatus: 'assigned',
        updatedBy: req.user._id,
        note: `Назначен курьер`,
      });

      // Назначаем курьера
      order.courier = courierId;
      await order.save();

      // Создаём чат для заказа
      const chat = await Chat.create({
        participants: [req.user._id, courierId],
        type: 'order',
        name: `Заказ ${order.orderNumber}`,
        orderRef: order._id,
        createdBy: req.user._id,
      });

      // Системное сообщение
      await Message.create({
        chat: chat._id,
        sender: req.user._id,
        content: `Заказ ${order.orderNumber} назначен. Адрес забора: ${order.pickupAddress}`,
        messageType: 'system',
      });

      await order.populate('courier', 'username phone');

      // Оповещаем через Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${courierId}`).emit('order_assigned', {
          order,
          chatId: chat._id,
        });
      }

      res.json({
        success: true,
        data: { order, chat, deliveryStatus },
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/orders/:orderId/status — обновить статус
router.put('/:orderId/status', protect, async (req, res) => {
  try {
    const { newStatus, note, location } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Заказ не найден' });
    }

    // ⭐ DeliveryStatus проверит корректность перехода и обновит Order
    const deliveryStatus = await DeliveryStatus.create({
      order: order._id,
      previousStatus: order.status,
      newStatus,
      updatedBy: req.user._id,
      note,
      location: location
        ? { type: 'Point', coordinates: [location.lng, location.lat] }
        : undefined,
    });

    // Отправляем системное сообщение в чат заказа
    const chat = await Chat.findOne({
      orderRef: order._id,
      type: 'order',
    });

    if (chat) {
      const statusMessages = {
        picked_up: '📦 Заказ забран',
        in_transit: '🚗 Заказ в пути',
        delivered: '✅ Заказ доставлен',
        problem: '⚠️ Проблема с заказом',
        cancelled: '❌ Заказ отменён',
      };

      const message = await Message.create({
        chat: chat._id,
        sender: req.user._id,
        content: `${statusMessages[newStatus] || 'Статус обновлён'}${
          note ? ': ' + note : ''
        }`,
        messageType: 'status_update',
        metadata: { deliveryStatusRef: deliveryStatus._id },
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${chat._id}`).emit('status_update', {
          order: await Order.findById(order._id),
          deliveryStatus,
          message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        order: await Order.findById(order._id).populate(
          'courier dispatcher',
          'username phone'
        ),
        deliveryStatus,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/orders/:orderId/history — история статусов
router.get('/:orderId/history', protect, async (req, res) => {
  try {
    const history = await DeliveryStatus.find({ order: req.params.orderId })
      .populate('updatedBy', 'username role')
      .sort({ timestamp: 1 });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
