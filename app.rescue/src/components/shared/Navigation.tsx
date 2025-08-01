import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/pets', label: 'Pets', icon: '🐕' },
    { path: '/applications', label: 'Applications', icon: '📋' },
    { path: '/staff', label: 'Staff', icon: '👥' },
    { path: '/communication', label: 'Messages', icon: '💬' },
    { path: '/events', label: 'Events', icon: '🗓️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="main-navigation">
      <div className="nav-header">
        <h2>🏠 Rescue Portal</h2>
      </div>
      
      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.path} className="nav-item">
            <Link
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="nav-footer">
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <div className="user-details">
            <span className="user-name">Sarah Johnson</span>
            <span className="user-role">Rescue Administrator</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
