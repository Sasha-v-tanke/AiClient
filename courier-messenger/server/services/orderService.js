// Placeholder service — extend as needed
const Order = require('../models/Order');

const getOrderStats = async (userId, role) => {
  const filter = role === 'courier' ? { courier: userId } : role === 'dispatcher' ? { dispatcher: userId } : {};
  const total = await Order.countDocuments(filter);
  const active = await Order.countDocuments({ ...filter, status: { $in: ['assigned', 'picked_up', 'in_transit'] } });
  const delivered = await Order.countDocuments({ ...filter, status: 'delivered' });
  return { total, active, delivered };
};

module.exports = { getOrderStats };
