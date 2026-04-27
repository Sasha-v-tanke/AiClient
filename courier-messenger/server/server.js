require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const setupSocket = require('./socket/socketHandler');

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);

// Socket.IO с поддержкой CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Делаем io доступным в routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Подключение БД и запуск
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // Настройка Socket.IO
  setupSocket(io);

  server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║  🚀 Courier Messenger Server             ║
    ║  📡 HTTP: http://localhost:${PORT}          ║
    ║  🔌 WebSocket: ws://localhost:${PORT}       ║
    ║  📋 API: http://localhost:${PORT}/api       ║
    ╚══════════════════════════════════════════╝
    `);
  });
});

module.exports = { app, server, io };
