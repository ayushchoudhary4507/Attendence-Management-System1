import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import './ToastNotification.css';

const ToastNotification = () => {
  const { toastNotifications, removeToast } = useNotifications();

  const getIcon = (type, meta = {}) => {
    const method = (meta?.method || meta?.verificationMethod || type || '').toString().toLowerCase();

    if (method.includes('face')) return '👤';
    if (method.includes('qr')) return '📱';
    if (method.includes('geo') || method.includes('gps')) return '📍';
    if (type === 'checkout') return '🏠';
    if (type === 'leave_request' || type === 'leave') return '📅';
    if (type === 'leave_approved') return '✅';
    if (type === 'leave_rejected') return '❌';
    if (type === 'late_login') return '⏰';
    if (type === 'user_activity') return '👤';
    if (type === 'project_update') return '📊';
    if (type === 'message') return '💬';
    if (type === 'success') return '✅';
    if (type === 'warning') return '⚠️';
    if (type === 'error') return '❌';
    if (type === 'attendance' || type === 'checkin') return '⏰';
    return '🔔';
  };

  const getMethodBadge = (toast) => {
    const raw = (toast.meta?.method || toast.meta?.verificationMethod || toast.type || '').toString().toLowerCase();
    if (raw.includes('face')) return { label: 'AI Face Lock', className: 'badge-face' };
    if (raw.includes('qr')) return { label: 'QR Code', className: 'badge-qr' };
    if (raw.includes('geo') || raw.includes('gps')) return { label: 'GPS Verified', className: 'badge-gps' };
    if (toast.type === 'checkout') return { label: 'Clock-Out', className: 'badge-checkout' };
    if (toast.type === 'attendance' || toast.type === 'checkin') return { label: 'Attendance', className: 'badge-attendance' };
    return null;
  };

  const handleClick = (toast) => {
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    if (toast.type === 'message') {
      window.location.href = '/chat';
    } else if (toast.type === 'leave_request' || toast.type === 'leave' || toast.type === 'leave_approved' || toast.type === 'leave_rejected') {
      if (user.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/attendance';
      }
    } else if (toast.type === 'attendance' || toast.type === 'checkin' || toast.type === 'checkout' || toast.type === 'user_activity' || toast.type === 'late_login') {
      if (user.role === 'admin') {
        window.location.href = '/employees';
      } else {
        window.location.href = '/attendance';
      }
    } else if (toast.type === 'project_update') {
      window.location.href = '/projects';
    }
    removeToast(toast.id);
  };

  if (!toastNotifications || toastNotifications.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toastNotifications.map((toast) => {
        const methodBadge = getMethodBadge(toast);
        const isLate = toast.meta?.isLate;

        return (
          <div
            key={toast.id}
            className={`toast-notification ${toast.type} ${toast.meta?.method ? `method-${toast.meta.method}` : ''}`}
            onClick={() => handleClick(toast)}
          >
            <div className="toast-icon-wrapper">
              <span className="toast-icon">{getIcon(toast.type, toast.meta)}</span>
            </div>

            <div className="toast-content">
              <div className="toast-header-row">
                <h4 className="toast-title">{toast.title}</h4>
                {methodBadge && (
                  <span className={`toast-badge ${methodBadge.className}`}>
                    {methodBadge.label}
                  </span>
                )}
                {isLate !== undefined && (
                  <span className={`toast-badge ${isLate ? 'badge-late' : 'badge-ontime'}`}>
                    {isLate ? 'Late' : 'On Time'}
                  </span>
                )}
              </div>
              <p className="toast-message">{toast.message}</p>
            </div>

            <button
              className="toast-close"
              aria-label="Close notification"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              ×
            </button>
            <div className="toast-progress-bar"></div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastNotification;
