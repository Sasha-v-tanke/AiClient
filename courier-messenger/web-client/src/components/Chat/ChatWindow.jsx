import React, { useState, useEffect, useRef } from 'react';
import { messageAPI } from '../../api/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import MessageBubble from './MessageBubble';

const ChatWindow = ({ chat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(null);
  const messagesEndRef = useRef(null);
  const socket = useSocket();
  const { user } = useAuth();

  const fetchMessages = async () => {
    try {
      const response = await messageAPI.getByChat(chat._id);
      setMessages(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (socket) {
      socket.emit('join_chat', chat._id);

      socket.on('new_message', (message) => {
        if (message.chat === chat._id) {
          setMessages((prev) => {
            if (prev.some((item) => item._id === message._id)) {
              return prev;
            }
            return [...prev, message];
          });
        }
      });

      socket.on('message_read', ({ messageId, readBy }) => {
        setMessages((prev) =>
          prev.map((message) =>
            message._id === messageId ? { ...message, readBy } : message
          )
        );
      });

      socket.on('user_typing', ({ username, chatId }) => {
        if (chatId === chat._id) {
          setTyping(username);
          setTimeout(() => setTyping(null), 3000);
        }
      });

      socket.on('user_stop_typing', ({ chatId }) => {
        if (chatId === chat._id) {
          setTyping(null);
        }
      });

      return () => {
        socket.emit('leave_chat', chat._id);
        socket.off('new_message');
        socket.off('message_read');
        socket.off('user_typing');
        socket.off('user_stop_typing');
      };
    }
  }, [chat._id, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unreadMessages = messages.filter(
      (message) =>
        message.sender?._id &&
        message.sender._id !== user?._id &&
        !message.readBy?.some((entry) => entry.user === user?._id)
    );

    unreadMessages.forEach((message) => {
      messageAPI.markRead(message._id).catch((error) => {
        console.error('Ошибка отметки прочтения:', error);
      });
    });
  }, [messages, user?._id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await messageAPI.send(chat._id, {
        content: newMessage.trim(),
      });
      setNewMessage('');

      if (socket) {
        socket.emit('stop_typing', { chatId: chat._id });
      }
    } catch (error) {
      console.error('Ошибка отправки:', error);
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', { chatId: chat._id });
    }
  };

  const getChatTitle = () => {
    return chat.name || chat.participants?.map((p) => p.username).join(', ');
  };

  if (!chat) {
    return (
      <div className="chat-window">
        <div className="empty-state">
          <i className="fas fa-comment-dots"></i>
          <h3>Выберите чат</h3>
          <p>Выберите диалог из списка слева</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-avatar" style={{ marginRight: 12 }}>
          {chat.type === 'order' ? '📦' : getChatTitle().charAt(0)}
        </div>
        <div className="chat-header-info">
          <h3>{getChatTitle()}</h3>
          <p>
            {chat.type === 'order'
              ? `Заказ • ${chat.orderRef?.status || ''}`
              : `${chat.participants?.length || 0} участников`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {loading ? (
          <div className="empty-state">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-paper-plane"></i>
            <h3>Нет сообщений</h3>
            <p>Напишите первое сообщение</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg._id} message={msg} />
          ))
        )}
        {typing && (
          <div className="typing-indicator">
            {typing} печатает...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="message-input-area" onSubmit={handleSend}>
        <input
          type="text"
          className="message-input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleTyping}
          placeholder="Введите сообщение..."
        />
        <button type="submit" className="send-btn">
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
