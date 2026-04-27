const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Ссылка на чат обязательна'],
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Отправитель обязателен'],
  },
  content: {
    type: String,
    required: [true, 'Содержимое сообщения обязательно'],
    trim: true,
    maxlength: [5000, 'Максимум 5000 символов'],
  },
  messageType: {
    type: String,
    enum: {
      values: ['text', 'image', 'location', 'status_update', 'system'],
      message: 'Допустимые типы: text, image, location, status_update, system',
    },
    default: 'text',
  },
  metadata: {
    // Для location — координаты
    location: {
      lat: Number,
      lng: Number,
    },
    // Для image — URL
    imageUrl: String,
    // Для status_update — ссылка на DeliveryStatus
    deliveryStatusRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryStatus',
    },
  },
  readBy: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isEdited: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Индекс для быстрой выборки сообщений чата
messageSchema.index({ chat: 1, timestamp: -1 });

// **Перекрёстная валидация с Chat**: отправитель должен быть участником чата
messageSchema.pre('save', async function (next) {
  if (this.isNew) {
    const Chat = mongoose.model('Chat');
    const chat = await Chat.findById(this.chat);

    if (!chat) {
      return next(new Error('Чат не найден'));
    }

    if (!chat.isActive) {
      return next(new Error('Невозможно отправить сообщение в неактивный чат'));
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === this.sender.toString()
    );

    if (!isParticipant && this.messageType !== 'system') {
      return next(new Error('Отправитель не является участником чата'));
    }
  }
  next();
});

// После сохранения — обновляем lastMessage в чате
messageSchema.post('save', async function () {
  const Chat = mongoose.model('Chat');
  await Chat.findByIdAndUpdate(this.chat, {
    lastMessage: this._id,
    updatedAt: Date.now(),
  });
});

module.exports = mongoose.model('Message', messageSchema);
