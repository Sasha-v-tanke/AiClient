const mongoose = require('mongoose');

// Допустимые переходы статусов
const VALID_STATUS_TRANSITIONS = {
  created: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'problem', 'cancelled'],
  problem: ['in_transit', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: [true, 'Номер заказа обязателен'],
    unique: true,
  },
  customer: {
    name: {
      type: String,
      required: [true, 'Имя клиента обязательно'],
    },
    phone: {
      type: String,
      required: [true, 'Телефон клиента обязателен'],
    },
    address: {
      type: String,
      required: [true, 'Адрес клиента обязателен'],
    },
  },
  courier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  dispatcher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Диспетчер обязателен'],
  },
  pickupAddress: {
    type: String,
    required: [true, 'Адрес забора обязателен'],
  },
  deliveryAddress: {
    type: String,
    required: [true, 'Адрес доставки обязателен'],
  },
  status: {
    type: String,
    enum: {
      values: [
        'created',
        'assigned',
        'picked_up',
        'in_transit',
        'delivered',
        'problem',
        'cancelled',
      ],
      message: 'Недопустимый статус заказа',
    },
    default: 'created',
  },
  items: [
    {
      name: String,
      quantity: { type: Number, default: 1 },
      weight: Number,
    },
  ],
  totalWeight: {
    type: Number,
    default: 0,
  },
  estimatedDelivery: {
    type: Date,
  },
  notes: {
    type: String,
    maxlength: [1000, 'Максимум 1000 символов'],
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Генерация номера заказа
orderSchema.pre('validate', function (next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  next();
});

// **КЛЮЧЕВОЙ МЕТОД**: проверка допустимости перехода статуса
orderSchema.methods.canTransitionTo = function (newStatus) {
  const allowed = VALID_STATUS_TRANSITIONS[this.status];
  if (!allowed) return false;
  return allowed.includes(newStatus);
};

// Валидация при назначении курьера
orderSchema.pre('save', async function (next) {
  if (this.isModified('courier') && this.courier) {
    const User = mongoose.model('User');
    const courier = await User.findById(this.courier);

    if (!courier) {
      return next(new Error('Курьер не найден'));
    }
    if (courier.role !== 'courier') {
      return next(new Error('Назначенный пользователь не является курьером'));
    }
  }

  // Проверка: диспетчер должен иметь роль dispatcher/admin
  if (this.isNew) {
    const User = mongoose.model('User');
    const dispatcher = await User.findById(this.dispatcher);

    if (!dispatcher) {
      return next(new Error('Диспетчер не найден'));
    }
    if (!['dispatcher', 'admin'].includes(dispatcher.role)) {
      return next(new Error('Назначенный диспетчер не имеет нужной роли'));
    }
  }

  this.updatedAt = Date.now();
  next();
});

// Статический метод: допустимые переходы
orderSchema.statics.VALID_STATUS_TRANSITIONS = VALID_STATUS_TRANSITIONS;

module.exports = mongoose.model('Order', orderSchema);
