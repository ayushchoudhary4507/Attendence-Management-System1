import React from 'react';
import { useNotifications, timeAgo } from '../context/NotificationContext';
import './Notifications.css';

const NotificationsPage = () => {
  const { 
    filteredNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    setFilter,
    filter,
    unreadCount
  } = useNotifications();

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

  return (
    <div className="notifications-page-container">
      <div className="notifications-page-header">
        <div className="header-title">
          <h1>Notifications</h1>
          <span className="unread-badge">{unreadCount} Unread</span>
        </div>
        <button onClick={markAllAsRead} className="mark-all-read-btn">
          Mark All as Read
        </button>
      </div>

      <div className="notifications-page-filters">
        {['all', 'leave_request', 'user_activity', 'project_update', 'message', 'shift_assigned', 'salary_generated'].map(f => {
          const filterLabels = {
            all: 'All Notifications',
            leave_request: '📅 Leave Requests',
            user_activity: '👤 User Activity',
            project_update: '📊 Projects',
            message: '💬 Messages',
            shift_assigned: '🗓️ Shifts',
            salary_generated: '💰 Salary'
          };
          return (
            <button
              key={f}
              className={`page-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {filterLabels[f]}
            </button>
          );
        })}
      </div>

      <div className="notifications-page-list">
        {filteredNotifications.length === 0 ? (
          <div className="page-empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No notifications found</h3>
            <p>You're all caught up! Check back later for new updates.</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div 
              key={notification.id || notification._id} 
              className={`page-notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={() => markAsRead(notification.id || notification._id)}
            >
              <div className="page-notification-icon">{getIcon(notification.type)}</div>
              <div className="page-notification-content">
                <div className="item-header">
                  <h4 className="item-title">{notification.title || 'Notification'}</h4>
                  <span className="item-time">{timeAgo(notification.createdAt)}</span>
                </div>
                <p className="item-message">{notification.message}</p>
                {!notification.read && <span className="unread-dot"></span>}
              </div>
              <button 
                className="page-delete-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id || notification._id);
                }}
                title="Delete notification"
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

export default NotificationsPage;
