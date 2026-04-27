import React, { useState, useEffect } from 'react';
import { chatAPI, userAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const ChatList = ({ activeChat, onSelectChat }) => {
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const socket = useSocket();

  const fetchChats = async () => {
    try {
      const response = await chatAPI.getAll();
      setChats(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAll();
      setUsers(response.data.data.filter((item) => item._id !== user?._id));
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (user?._id) {
      fetchUsers();
    }
  }, [user?._id]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', () => {
        fetchChats(); // Обновляем список при новом сообщении
      });

      return () => {
        socket.off('new_message');
      };
    }
  }, [socket]);

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct') {
      const otherUser = chat.participants.find(
        (p) => p._id !== user._id
      );
      return otherUser?.username || 'Неизвестный';
    }
    return 'Групповой чат';
  };

  const getChatAvatar = (chat) => {
    const name = getChatName(chat);
    return name.charAt(0).toUpperCase();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      setCreating(true);
      setError('');
      const response = await chatAPI.create({
        participants: [selectedUserId],
        type: 'direct',
      });
      const createdChat = response.data.data;
      await fetchChats();
      onSelectChat(createdChat);
      setSelectedUserId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось создать чат');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div>
      <form className="chat-create-form" onSubmit={handleCreateChat}>
        <select
          className="chat-create-select"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">Выберите пользователя для чата</option>
          {users.map((item) => (
            <option key={item._id} value={item._id}>
              {item.username} ({item.role})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="chat-create-button"
          disabled={!selectedUserId || creating}
        >
          {creating ? 'Создание...' : 'Новый чат'}
        </button>
        {error && <div className="chat-create-error">{error}</div>}
      </form>

      {chats.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-comments"></i>
          <h3>Нет чатов</h3>
          <p>Начните новый диалог</p>
        </div>
      ) : (
        chats.map((chat) => (
        <div
          key={chat._id}
          className={`chat-item ${activeChat === chat._id ? 'active' : ''}`}
          onClick={() => onSelectChat(chat)}
        >
          <div className="chat-avatar">
            {chat.type === 'order' ? '📦' : getChatAvatar(chat)}
          </div>
          <div className="chat-info">
            <div className="chat-name">{getChatName(chat)}</div>
            <div className="chat-last-message">
              {chat.lastMessage?.content || 'Нет сообщений'}
            </div>
          </div>
          <div className="chat-meta">
            <div className="chat-time">
              {formatTime(chat.updatedAt)}
            </div>
            {chat.orderRef && (
              <span className={`order-status status-${chat.orderRef.status}`}>
                {chat.orderRef.status}
              </span>
            )}
          </div>
        </div>
        ))
      )}
    </div>
  );
};

export default ChatList;
