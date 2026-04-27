import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatList from '../Chat/ChatList';
import OrderList from '../Orders/OrderList';

const Sidebar = ({ activeChat, onSelectChat, readStateVersion }) => {
  const [activeTab, setActiveTab] = useState('chats');
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🚚 Courier MSG</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12 }}>
            {user?.username} ({user?.role})
          </span>
          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          <i className="fas fa-comments"></i> Чаты
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <i className="fas fa-box"></i> Заказы
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'chats' ? (
          <ChatList
            activeChat={activeChat}
            onSelectChat={onSelectChat}
            readStateVersion={readStateVersion}
          />
        ) : (
          <OrderList />
        )}
      </div>
    </div>
  );
};

export default Sidebar;
