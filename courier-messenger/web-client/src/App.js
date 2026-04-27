import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Sidebar from './components/Layout/Sidebar';
import ChatWindow from './components/Chat/ChatWindow';
import './styles/main.css';

const MainApp = () => {
  const [activeChat, setActiveChat] = useState(null);

  return (
    <SocketProvider>
      <div className="app-container">
        <Sidebar
          activeChat={activeChat?._id}
          onSelectChat={setActiveChat}
        />
        {activeChat ? (
          <ChatWindow chat={activeChat} />
        ) : (
          <div className="chat-window">
            <div className="empty-state">
              <i className="fas fa-comment-dots"></i>
              <h3>Courier Messenger</h3>
              <p>Выберите чат из списка или создайте заказ</p>
            </div>
          </div>
        )}
      </div>
    </SocketProvider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ color: 'white', fontSize: 18 }}>Загрузка...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
