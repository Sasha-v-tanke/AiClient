const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Имя пользователя обязательно'],
    unique: true,
    trim: true,
    minlength: [3, 'Минимум 3 символа'],
    maxlength: [30, 'Максимум 30 символов'],
  },
  email: {
    type: String,
    required: [true, 'Email обязателен'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Некорректный email'],
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Минимум 6 символов'],
    select: false,
  },
  role: {
    type: String,
    enum: {
      values: ['courier', 'dispatcher', 'admin'],
      message: 'Роль должна быть: courier, dispatcher или admin',
    },
    default: 'courier',
  },
  phone: {
    type: String,
    required: [true, 'Телефон обязателен'],
    match: [/^\+?[\d\s\-()]{10,15}$/, 'Некорректный номер телефона'],
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
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
  avatar: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Индекс для геолокации
userSchema.index({ location: '2dsphere' });

// Хеширование пароля перед сохранением
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Метод проверки пароля
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Метод получения публичного профиля
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    phone: this.phone,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    location: this.location,
    avatar: this.avatar,
  };
};

module.exports = mongoose.model('User', userSchema);
