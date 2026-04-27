import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { token, user } = useAuth();

  useEffect(() => {
    if (token && user) {
      const newSocket = io(
        process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
        {
          auth: { token },
          transports: ['websocket', 'polling'],
        }
      );

      newSocket.on('connect', () => {
        console.log('✅ Socket подключён');
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket отключён');
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket error:', err.message);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token, user]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
