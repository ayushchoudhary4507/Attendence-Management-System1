import React, { useEffect, useRef } from 'react';
import { useNotifications, timeAgo } from '../../context/NotificationContext';
import './NotificationPanel.css';

const NotificationPanel = ({ isOpen, onClose, mode = 'absolute' }) => {
  const { 
    filteredNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    setFilter,
    filter
  } = useNotifications();
  
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mode === 'absolute' && panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen && mode === 'absolute') {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, mode]);

  const getIcon = (type) => {
    switch (type) {
      case 'leave_request': return '📅';
      case 'leave_approved': return '✅';
      case 'leave_rejected': return '❌';
      case 'late_login': return '⏰';
      case 'user_activity': return '👤';
      case 'project_update': return '📊';
      case 'message': return '💬';
      case 'leave': return '📅';
      case 'attendance': return '⏰';
      case 'checkin': return '✅';
      case 'checkout': return '🏠';
      case 'shift_assigned': return '🗓️';
      case 'salary_generated': return '💰';
      default: return '🔔';
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`notification-panel ${mode}`} ref={panelRef}>
      <div className="notification-header">
        <h3>Notifications</h3>
        <div className="header-actions">
          <button onClick={markAllAsRead} className="mark-all-read">Mark all read</button>
          {mode === 'absolute' && <button onClick={onClose} className="close-panel">✕</button>}
        </div>
      </div>
      
      <div className="notification-filters">
        {['all', 'leave_request', 'user_activity', 'project_update', 'message', 'shift_assigned', 'salary_generated'].map(f => {
          const filterLabels = {
            all: 'All',
            leave_request: '📅 Leave',
            user_activity: '👤 Activity',
            project_update: '📊 Project',
            message: '💬 Message',
            shift_assigned: '🗓️ Shift',
            salary_generated: '💰 Salary'
          };
          return (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setFilter(f);
              }}
            >
              {filterLabels[f]}
            </button>
          );
        })}
      </div>

      <div className="notification-list">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">No notifications yet</div>
        ) : (
          filteredNotifications.map((notification) => (
            <div 
              key={notification.id || notification._id} 
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={(e) => {
                e.stopPropagation();
                markAsRead(notification.id || notification._id);
              }}
            >
              <div className="notification-icon">{getIcon(notification.type)}</div>
              <div className="notification-content">
                <p className="notification-title">{notification.title || 'Notification'}</p>
                <p className="notification-message">{notification.message}</p>
                <span className="notification-time">
                  {timeAgo(notification.createdAt)}
                </span>
              </div>
              <button 
                className="delete-notification" 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id || notification._id);
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
