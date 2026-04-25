import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import './ToastNotification.css';

const ToastNotification = () => {
  const { toastNotifications, removeToast } = useNotifications();

  const getIcon = (type) => {
    switch (type) {
      case 'leave_request':
      case 'leave':
        return '📅';
      case 'user_activity':
        return '👤';
      case 'project_update':
        return '📊';
      case 'message':
        return '💬';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'attendance':
      case 'checkin':
        return '⏰';
      case 'checkout':
        return '�';
      default:
        return '🔔';
    }
  };

  const handleClick = (toast) => {
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    if (toast.type === 'message') {
      window.location.href = '/chat';
    } else if (toast.type === 'leave_request' || toast.type === 'leave') {
      if (user.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/attendance';
      }
    } else if (toast.type === 'user_activity') {
      if (user.role === 'admin') {
        window.location.href = '/employees';
      }
    } else if (toast.type === 'project_update') {
      window.location.href = '/projects';
    }
    removeToast(toast.id);
  };

  return (
    <div className="toast-container">
      {toastNotifications.map((toast) => (
        <div
          key={toast.id}
          className={`toast-notification ${toast.type}`}
          onClick={() => handleClick(toast)}
        >
          <div className="toast-icon">{getIcon(toast.type)}</div>
          <div className="toast-content">
            <h4 className="toast-title">{toast.title}</h4>
            <p className="toast-message">{toast.message}</p>
          </div>
          <button
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;
