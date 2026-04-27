import React, { useState, useEffect } from 'react';
import { orderAPI, userAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [couriers, setCouriers] = useState([]);
  const { user } = useAuth();

  const [newOrder, setNewOrder] = useState({
    customer: { name: '', phone: '', address: '' },
    pickupAddress: '',
    deliveryAddress: '',
    items: [{ name: '', quantity: 1 }],
    priority: 'normal',
  });

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getAll();
      setOrders(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    if (['dispatcher', 'admin'].includes(user?.role)) {
      userAPI.getAll({ role: 'courier' }).then((res) => {
        setCouriers(res.data.data);
      });
    }
  }, [user]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await orderAPI.create(newOrder);
      setShowCreate(false);
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Ошибка создания заказа');
    }
  };

  const handleAssign = async (orderId, courierId) => {
    try {
      await orderAPI.assign(orderId, courierId);
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Ошибка назначения');
    }
  };

  const handleStatusUpdate = async (orderId, currentStatus) => {
    const transitions = {
      assigned: 'picked_up',
      picked_up: 'in_transit',
      in_transit: 'delivered',
    };
    const newStatus = transitions[currentStatus];
    if (!newStatus) return;

    try {
      await orderAPI.updateStatus(orderId, { newStatus });
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Ошибка обновления статуса');
    }
  };

  const statusLabels = {
    created: '🆕 Создан',
    assigned: '👤 Назначен',
    picked_up: '📦 Забран',
    in_transit: '🚗 В пути',
    delivered: '✅ Доставлен',
    problem: '⚠️ Проблема',
    cancelled: '❌ Отменён',
  };

  if (loading) {
    return <div className="empty-state"><p>Загрузка заказов...</p></div>;
  }

  return (
    <div className="order-list">
      {['dispatcher', 'admin'].includes(user?.role) && (
        <button
          className="btn btn-primary"
          style={{ marginBottom: 12, padding: '10px 16px', fontSize: 14, borderRadius: 8 }}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? 'Отмена' : '+ Новый заказ'}
        </button>
      )}

      {showCreate && (
        <form onSubmit={handleCreateOrder} className="order-card">
          <h4 style={{ marginBottom: 12 }}>Новый заказ</h4>
          <div className="form-group">
            <label>Имя клиента</label>
            <input
              value={newOrder.customer.name}
              onChange={(e) =>
                setNewOrder({
                  ...newOrder,
                  customer: { ...newOrder.customer, name: e.target.value },
                })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Телефон клиента</label>
            <input
              value={newOrder.customer.phone}
              onChange={(e) =>
                setNewOrder({
                  ...newOrder,
                  customer: { ...newOrder.customer, phone: e.target.value },
                })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Адрес клиента</label>
            <input
              value={newOrder.customer.address}
              onChange={(e) =>
                setNewOrder({
                  ...newOrder,
                  customer: { ...newOrder.customer, address: e.target.value },
                })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Адрес забора</label>
            <input
              value={newOrder.pickupAddress}
              onChange={(e) =>
                setNewOrder({ ...newOrder, pickupAddress: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Адрес доставки</label>
            <input
              value={newOrder.deliveryAddress}
              onChange={(e) =>
                setNewOrder({ ...newOrder, deliveryAddress: e.target.value })
              }
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Создать заказ
          </button>
        </form>
      )}

      {orders.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-box-open"></i>
          <h3>Нет заказов</h3>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order._id} className="order-card">
            <div className="order-number">{order.orderNumber}</div>
            <div className="order-address">
              📍 {order.pickupAddress} → {order.deliveryAddress}
            </div>
            <div className="order-address">
              👤 {order.customer?.name} • {order.customer?.phone}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className={`order-status status-${order.status}`}>
                {statusLabels[order.status]}
              </span>
              {order.courier && (
                <span style={{ fontSize: 13 }}>
                  🚴 {order.courier.username}
                </span>
              )}
            </div>

            {/* Назначить курьера */}
            {order.status === 'created' &&
              ['dispatcher', 'admin'].includes(user?.role) && (
                <div style={{ marginTop: 8 }}>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleAssign(order._id, e.target.value);
                    }}
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
                  >
                    <option value="">Назначить курьера...</option>
                    {couriers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.username} {c.isOnline ? '🟢' : '🔴'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Обновить статус (курьер) */}
            {user?.role === 'courier' &&
              ['assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                <button
                  onClick={() => handleStatusUpdate(order._id, order.status)}
                  style={{
                    marginTop: 8,
                    padding: '8px 16px',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {order.status === 'assigned' && '📦 Забрал'}
                  {order.status === 'picked_up' && '🚗 В пути'}
                  {order.status === 'in_transit' && '✅ Доставил'}
                </button>
              )}
          </div>
        ))
      )}
    </div>
  );
};

export default OrderList;
