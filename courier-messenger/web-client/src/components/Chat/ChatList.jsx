import React, { useState, useEffect } from 'react';
import { chatAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const ChatList = ({ activeChat, onSelectChat }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchChats();
  }, []);

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

  if (loading) {
    return (
      <div className="empty-state">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="empty-state">
        <i className="fas fa-comments"></i>
        <h3>Нет чатов</h3>
        <p>Начните новый диалог</p>
      </div>
    );
  }

  return (
    <div>
      {chats.map((chat) => (
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
      ))}
    </div>
  );
};

export default ChatList;
