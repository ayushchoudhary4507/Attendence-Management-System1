import React, { useState } from 'react';
import { useNotifications, timeAgo } from '../context/NotificationContext';
import './Notifications.css';

const NotificationsPage = () => {
  const { 
    filteredNotifications, 
    notifications,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    setFilter,
    filter,
    unreadCount
  } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');

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

  const getTypeLabel = (type) => {
    switch (type) {
      case 'leave_request': return 'Leave Request';
      case 'leave_approved': return 'Leave Approved';
      case 'leave_rejected': return 'Leave Rejected';
      case 'late_login': return 'Late Login';
      case 'user_activity': return 'User Activity';
      case 'project_update': return 'Project';
      case 'message': return 'Message';
      case 'shift_assigned': return 'Shift';
      case 'salary_generated': return 'Salary';
      default: return 'System Alert';
    }
  };

  // Filter with search term
  const displayedNotifications = (filteredNotifications || []).filter(n => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (n.title && n.title.toLowerCase().includes(term)) ||
      (n.message && n.message.toLowerCase().includes(term)) ||
      (n.type && n.type.toLowerCase().includes(term))
    );
  });

  const totalCount = notifications?.length || filteredNotifications?.length || 0;
  const readCount = Math.max(0, totalCount - unreadCount);

  return (
    <div className="notifications-page">
      {/* Top Header Section */}
      <div className="notifications-header-section">
        <div className="header-info">
          <h1>Notifications ({displayedNotifications.length})</h1>
          <p>Manage and monitor all organization alerts, activities, and system updates</p>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="btn-mark-all">
              ✓ Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Top Stat Cards (Matching Employee Table Stat Cards) */}
      <div className="notifications-stats-row">
        <div className="notif-stat-card">
          <div className="stat-icon-wrapper purple">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h20v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
            </svg>
          </div>
          <div className="stat-content-wrapper">
            <span className="stat-num">{totalCount}</span>
            <span className="stat-lbl">Total Notifications</span>
          </div>
        </div>

        <div className="notif-stat-card">
          <div className="stat-icon-wrapper green">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="stat-content-wrapper">
            <span className="stat-num">{unreadCount}</span>
            <span className="stat-lbl">Unread Alerts</span>
          </div>
        </div>

        <div className="notif-stat-card">
          <div className="stat-icon-wrapper yellow">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
            </svg>
          </div>
          <div className="stat-content-wrapper">
            <span className="stat-num">{readCount}</span>
            <span className="stat-lbl">Processed / Read</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="notifications-controls-bar">
        <div className="filter-pills-scroll">
          {['all', 'attendance', 'leave_request', 'user_activity', 'project_update', 'message', 'shift_assigned', 'salary_generated'].map(f => {
            const filterLabels = {
              all: 'All Notifications',
              attendance: 'Attendance',
              leave_request: 'Leave Requests',
              user_activity: 'User Activity',
              project_update: 'Projects',
              message: 'Messages',
              shift_assigned: 'Shifts',
              salary_generated: 'Salary'
            };
            return (
              <button
                key={f}
                className={`filter-pill ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {filterLabels[f]}
              </button>
            );
          })}
        </div>

        <div className="notif-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search notifications..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* Main Unified Table Container (Matching Employee Table) */}
      <div className="table-container notifications-table-container">
        {displayedNotifications.length === 0 ? (
          <div className="notifications-empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No notifications found</h3>
            <p>You're all caught up! There are no notifications matching your current filter.</p>
          </div>
        ) : (
          <table className="notifications-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No.</th>
                <th style={{ width: '160px' }}>Type</th>
                <th>Title</th>
                <th>Details</th>
                <th style={{ width: '120px' }}>Time</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedNotifications.map((notification, index) => {
                const notifId = notification.id || notification._id;
                const isUnread = !notification.read;

                return (
                  <tr 
                    key={notifId} 
                    className={isUnread ? 'unread-row' : 'read-row'}
                    onClick={() => isUnread && markAsRead(notifId)}
                  >
                    <td className="serial-col">{index + 1}</td>
                    <td className="type-col">
                      <div className="type-badge">
                        <span className="type-icon">{getIcon(notification.type)}</span>
                        <span className="type-text">{getTypeLabel(notification.type)}</span>
                      </div>
                    </td>
                    <td className="title-col">
                      <span className="notif-title">{notification.title || 'Notification'}</span>
                    </td>
                    <td className="message-col">
                      <span className="notif-message">{notification.message}</span>
                    </td>
                    <td className="time-col">
                      <span className="notif-time">{timeAgo(notification.createdAt)}</span>
                    </td>
                    <td className="status-col">
                      <span className={`status-pill ${isUnread ? 'unread' : 'read'}`}>
                        {isUnread ? 'Unread' : 'Read'}
                      </span>
                    </td>
                    <td className="action-col" onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        {isUnread && (
                          <button 
                            className="btn-action check"
                            onClick={() => markAsRead(notifId)}
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                        <button 
                          className="btn-action delete"
                          onClick={() => deleteNotification(notifId)}
                          title="Delete notification"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
