const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],
  type: {
    type: String,
    enum: {
      values: ['direct', 'group', 'order'],
      message: 'Тип чата: direct, group или order',
    },
    default: 'direct',
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Максимум 100 символов'],
  },
  orderRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

// Валидация: минимум 2 участника
chatSchema.pre('validate', function (next) {
  if (this.participants.length < 2) {
    this.invalidate('participants', 'Минимум 2 участника в чате');
  }

  // Direct чат — ровно 2 участника
  if (this.type === 'direct' && this.participants.length !== 2) {
    this.invalidate('participants', 'Личный чат должен содержать ровно 2 участника');
  }

  // Order чат должен ссылаться на заказ
  if (this.type === 'order' && !this.orderRef) {
    this.invalidate('orderRef', 'Чат заказа должен ссылаться на заказ');
  }

  next();
});

// Обновляем updatedAt при каждом сохранении
chatSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// **Перекрёстная валидация с Order**: при создании чата типа "order"
// проверяем, что заказ существует и его статус позволяет создать чат
chatSchema.pre('save', async function (next) {
  if (this.type === 'order' && this.orderRef && this.isNew) {
    const Order = mongoose.model('Order');
    const order = await Order.findById(this.orderRef);

    if (!order) {
      return next(new Error('Заказ не найден — невозможно создать чат'));
    }

    if (order.status === 'cancelled' || order.status === 'delivered') {
      return next(
        new Error(`Невозможно создать чат для заказа со статусом "${order.status}"`)
      );
    }
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
