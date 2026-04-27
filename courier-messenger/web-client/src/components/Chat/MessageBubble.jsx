import React from 'react';
import { useAuth } from '../../context/AuthContext';

const MessageBubble = ({ message }) => {
  const { user } = useAuth();
  const isSent = message.sender?._id === user?._id;
  const isSystem = message.messageType === 'system' || message.messageType === 'status_update';

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isSystem) {
    return (
      <div className="message system">
        <div className="message-bubble">
          {message.content}
          <div className="message-time">{formatTime(message.timestamp)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`message ${isSent ? 'sent' : 'received'}`}>
      <div className="message-bubble">
        {!isSent && (
          <div className="message-sender">
            {message.sender?.username} ({message.sender?.role})
          </div>
        )}
        {message.messageType === 'location' && message.metadata?.location ? (
          <div>
            📍 Координаты: {message.metadata.location.lat.toFixed(4)},{' '}
            {message.metadata.location.lng.toFixed(4)}
            <br />
            {message.content}
          </div>
        ) : (
          message.content
        )}
        <div className="message-time">
          {formatTime(message.timestamp)}
          {isSent && (
            <span style={{ marginLeft: 4 }}>
              {message.readBy?.length > 1 ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
