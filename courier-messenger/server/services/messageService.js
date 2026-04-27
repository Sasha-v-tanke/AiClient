// Placeholder service — extend as needed
const Message = require('../models/Message');
const Chat = require('../models/Chat');

const getUnreadCount = async (userId) => {
  const chats = await Chat.find({ participants: userId, isActive: true });
  let total = 0;
  for (const chat of chats) {
    const count = await Message.countDocuments({
      chat: chat._id,
      isDeleted: false,
      'readBy.user': { $ne: userId },
    });
    total += count;
  }
  return total;
};

module.exports = { getUnreadCount };
