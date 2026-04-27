const mongoose = require('mongoose');

const deliveryStatusSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Ссылка на заказ обязательна'],
  },
  previousStatus: {
    type: String,
    required: true,
  },
  newStatus: {
    type: String,
    required: [true, 'Новый статус обязателен'],
    enum: [
      'created',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'problem',
      'cancelled',
    ],
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Автор обновления обязателен'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  note: {
    type: String,
    maxlength: [500, 'Максимум 500 символов'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isValid: {
    type: Boolean,
    default: true,
  },
  validationErrors: [
    {
      type: String,
    },
  ],
});

// =====================================================
// ⭐ ПЕРЕКРЁСТНАЯ ВАЛИДАЦИЯ: DeliveryStatus ПРОВЕРЯЕТ Order
// =====================================================
deliveryStatusSchema.pre('save', async function (next) {
  if (!this.isNew) return next();

  const Order = mongoose.model('Order');
  const User = mongoose.model('User');
  const errors = [];

  // 1. Проверяем существование заказа
  const order = await Order.findById(this.order);
  if (!order) {
    errors.push('Заказ не найден в базе данных');
    this.isValid = false;
    this.validationErrors = errors;
    return next(new Error('Заказ не найден'));
  }

  // 2. Проверяем, что previousStatus совпадает с текущим статусом заказа
  if (this.previousStatus !== order.status) {
    errors.push(
      `Несоответствие статусов: указан предыдущий "${this.previousStatus}", ` +
        `а в заказе текущий "${order.status}"`
    );
  }

  // 3. Проверяем допустимость перехода статуса через модель Order
  if (!order.canTransitionTo(this.newStatus)) {
    errors.push(
      `Недопустимый переход статуса: "${order.status}" → "${this.newStatus}". ` +
        `Допустимые: ${
          Order.VALID_STATUS_TRANSITIONS[order.status]?.join(', ') || 'нет'
        }`
    );
  }

  // 4. Проверяем права пользователя на изменение статуса
  const user = await User.findById(this.updatedBy);
  if (!user) {
    errors.push('Пользователь, обновляющий статус, не найден');
  } else {
    // Курьер может менять только свои заказы
    if (user.role === 'courier') {
      if (!order.courier || order.courier.toString() !== user._id.toString()) {
        errors.push('Курьер может обновлять только назначенные ему заказы');
      }
      // Курьер не может назначать заказ (assigned)
      if (this.newStatus === 'assigned') {
        errors.push('Курьер не может самостоятельно назначать заказ');
      }
    }

    // Только диспетчер/админ может отменять заказ
    if (
      this.newStatus === 'cancelled' &&
      !['dispatcher', 'admin'].includes(user.role)
    ) {
      errors.push('Только диспетчер или админ может отменить заказ');
    }
  }

  // 5. Проверяем: для picked_up и далее должен быть назначен курьер
  if (
    ['picked_up', 'in_transit', 'delivered'].includes(this.newStatus) &&
    !order.courier
  ) {
    errors.push(
      `Для статуса "${this.newStatus}" заказу должен быть назначен курьер`
    );
  }

  // 6. Проверяем хронологию — нет ли более нового статуса
  const latestStatus = await mongoose
    .model('DeliveryStatus')
    .findOne({ order: this.order })
    .sort({ timestamp: -1 });

  if (latestStatus && latestStatus.timestamp > this.timestamp) {
    errors.push('Существует более новое обновление статуса');
  }

  // Сохраняем результат валидации
  if (errors.length > 0) {
    this.isValid = false;
    this.validationErrors = errors;
    return next(new Error(`Ошибки валидации: ${errors.join('; ')}`));
  }

  this.isValid = true;
  this.validationErrors = [];

  // Если валидация прошла — обновляем статус заказа
  order.status = this.newStatus;
  await order.save();

  next();
});

// Индекс для быстрого поиска истории заказа
deliveryStatusSchema.index({ order: 1, timestamp: -1 });

module.exports = mongoose.model('DeliveryStatus', deliveryStatusSchema);
