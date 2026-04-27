import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user } = useAuth();

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--card-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
    }}>
      <span style={{ fontWeight: 600 }}>🚚 Courier Messenger</span>
      {user && (
        <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--secondary)' }}>
          {user.username} ({user.role})
        </span>
      )}
    </header>
  );
};

export default Header;
