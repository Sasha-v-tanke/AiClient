const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const setupSocket = (io) => {
  // Middleware аутентификации для Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Требуется авторизация'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('Пользователь не найден'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Невалидный токен'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🟢 Подключился: ${socket.user.username} (${socket.user.role})`);

    // Обновляем статус онлайн
    socket.user.isOnline = true;
    socket.user.lastSeen = Date.now();
    await socket.user.save();

    // Подписка на личный канал
    socket.join(`user:${socket.user._id}`);

    // Оповещаем других о подключении
    socket.broadcast.emit('user_online', {
      userId: socket.user._id,
      username: socket.user.username,
    });

    // Присоединение к чату
    socket.on('join_chat', (chatId) => {
      socket.join(`chat:${chatId}`);
      console.log(`${socket.user.username} вошёл в чат ${chatId}`);
    });

    // Выход из чата
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    // Индикатор набора текста
    socket.on('typing', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user_typing', {
        userId: socket.user._id,
        username: socket.user.username,
        chatId,
      });
    });

    // Прекращение набора
    socket.on('stop_typing', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user_stop_typing', {
        userId: socket.user._id,
        chatId,
      });
    });

    // Обновление геолокации курьера
    socket.on('update_location', async ({ lat, lng }) => {
      socket.user.location = {
        type: 'Point',
        coordinates: [lng, lat],
      };
      await socket.user.save();

      // Оповещаем диспетчеров
      io.emit('courier_location_update', {
        courierId: socket.user._id,
        location: { lat, lng },
        username: socket.user.username,
      });
    });

    // Отключение
    socket.on('disconnect', async () => {
      console.log(`🔴 Отключился: ${socket.user.username}`);
      socket.user.isOnline = false;
      socket.user.lastSeen = Date.now();
      await socket.user.save();

      socket.broadcast.emit('user_offline', {
        userId: socket.user._id,
        username: socket.user.username,
      });
    });
  });
};

module.exports = setupSocket;
