import React from 'react';

const OrderCard = ({ order, onAssign, onStatusUpdate, couriers, userRole }) => {
  const statusLabels = {
    created: '🆕 Создан',
    assigned: '👤 Назначен',
    picked_up: '📦 Забран',
    in_transit: '🚗 В пути',
    delivered: '✅ Доставлен',
    problem: '⚠️ Проблема',
    cancelled: '❌ Отменён',
  };

  return (
    <div className="order-card">
      <div className="order-number">{order.orderNumber}</div>
      <div className="order-address">
        📍 {order.pickupAddress} → {order.deliveryAddress}
      </div>
      <div className="order-address">
        👤 {order.customer?.name} • {order.customer?.phone}
      </div>
      <div style={{ marginTop: 8 }}>
        <span className={`order-status status-${order.status}`}>
          {statusLabels[order.status]}
        </span>
      </div>
    </div>
  );
};

export default OrderCard;
