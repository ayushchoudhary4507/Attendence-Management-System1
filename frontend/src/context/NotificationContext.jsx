import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const NotificationContext = createContext();

const SOCKET_URL = import.meta.env.PROD
  ? 'https://attendence-management-system1.onrender.com'
  : 'http://localhost:5005';

const API_URL = import.meta.env.PROD
  ? 'https://attendence-management-system1.onrender.com/api'
  : 'http://localhost:5005/api';

// Helper: time ago formatting
export const timeAgo = (date) => {
  if (!date) return 'just now';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return past.toLocaleDateString();
};

// Helper: API call with token
const apiCall = async (method, path, body = null) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, opts);
  return res.json();
};

export const NotificationProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotifications, setToastNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'leave_request', 'user_activity', 'project_update', 'message'
  const notificationsRef = useRef([]);
  const addNotificationRef = useRef(null);
  const showToastRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio play failed:', e);
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      console.log('📡 Fetching notifications from API...');
      const data = await apiCall('GET', '/notifications');
      console.log('📥 Notifications API response:', data);
      if (data.success && data.data) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount || data.data.filter(n => !n.read).length);
        console.log(`✅ Loaded ${data.data.length} notifications`);
      } else {
        console.log('⚠️ No notifications or API returned unsuccessful');
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    }
  }, []);

  // Add notification (local state)
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  // Show toast notification popup
  const showToast = useCallback((title, message, type = 'info') => {
    const toast = {
      id: Date.now() + Math.random(),
      title: title || 'Notification',
      message: message || '',
      type: type || 'info',
      createdAt: new Date()
    };
    setToastNotifications(prev => [toast, ...prev].slice(0, 5));
    playNotificationSound();
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToastNotifications(prev => prev.filter(t => t.id !== toast.id));
    }, 5000);
  }, [playNotificationSound]);

  // Keep refs updated for use in socket handlers
  addNotificationRef.current = addNotification;
  showToastRef.current = showToast;

  // Initialize socket connection
  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const userId = user.id || user._id;

    if (!token || !userId) {
      console.log('No user/token found, skipping socket connection');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('🔔 Notification socket connected:', newSocket.id, 'userId:', userId);
      setIsConnected(true);
      newSocket.emit('join', userId);
    });

    newSocket.on('disconnect', () => {
      console.log('Notification socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // ===== MAIN NOTIFICATION HANDLER =====
    newSocket.on('newNotification', (data) => {
      console.log('🔔🔔🔔 newNotification received:', data);
      const addNotif = addNotificationRef.current;
      const showT = showToastRef.current;
      if (!addNotif || !showT) return;

      // Filter: only show if this notification is for the current user
      const currentUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
      const currentUserId = currentUser.id || currentUser._id;
      if (data.receiverId && String(data.receiverId) !== String(currentUserId)) {
        console.log('Notification not for this user, skipping');
        return;
      }

      const notification = {
        id: data.id || Date.now(),
        type: data.type || 'other',
        title: data.title || 'Notification',
        message: data.message || '',
        senderId: data.senderId,
        senderName: data.senderName,
        link: data.link,
        receiverId: data.receiverId,
        createdAt: data.createdAt || new Date(),
        read: false
      };
      addNotif(notification);
      showT(notification.title, notification.message, notification.type);
    });

    // Handle leave status update (for employees)
    newSocket.on('leave_status_updated', (data) => {
      console.log('Leave status updated:', data);
      const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
      const currentUserId = user.id || user._id;
      if (data.userId === currentUserId || String(data.userId) === String(currentUserId)) {
        const addNotif = addNotificationRef.current;
        const showT = showToastRef.current;
        if (!addNotif || !showT) return;
        addNotif({
          id: Date.now(),
          type: 'leave_request',
          title: data.notification.title,
          message: data.notification.message,
          createdAt: data.notification.createdAt || new Date(),
          read: false
        });
        showT(data.notification.title, data.notification.message, 'leave_request');
      }
    });

    // Handle legacy events for backward compatibility
    newSocket.on('new_leave_request', (data) => {
      console.log('Legacy new_leave_request:', data);
      const addNotif = addNotificationRef.current;
      const showT = showToastRef.current;
      if (!addNotif || !showT) return;
      addNotif({
        id: Date.now(),
        type: 'leave_request',
        title: data.title,
        message: data.message,
        employeeName: data.employeeName,
        createdAt: data.createdAt || new Date(),
        read: false
      });
      showT(data.title, data.message, 'leave_request');
    });

    newSocket.on('new_message_notification', (data) => {
      console.log('Legacy new_message_notification:', data);
      const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
      const currentUserId = user.id || user._id;
      const targetId = data.userId || data.receiverId;
      if (targetId === currentUserId || String(targetId) === String(currentUserId)) {
        const addNotif = addNotificationRef.current;
        const showT = showToastRef.current;
        if (!addNotif || !showT) return;
        addNotif({
          id: Date.now(),
          type: 'message',
          title: data.notification.title,
          message: data.notification.message,
          senderName: data.notification.senderName,
          createdAt: data.notification.createdAt || new Date(),
          read: false
        });
        showT(data.notification.title, data.notification.message, 'message');
      }
    });

    newSocket.on('receive_notification', (data) => {
      console.log('Legacy receive_notification:', data);
      const addNotif = addNotificationRef.current;
      const showT = showToastRef.current;
      if (!addNotif || !showT) return;
      addNotif({
        id: Date.now(),
        ...data.notification,
        createdAt: data.notification?.createdAt || new Date(),
        read: false
      });
      showT(data.notification?.title || 'Notification', data.notification?.message || '', data.notification?.type || 'info');
    });

    setSocket(newSocket);
    fetchNotifications();

    return () => {
      newSocket.off('newNotification');
      newSocket.off('leave_status_updated');
      newSocket.off('new_leave_request');
      newSocket.off('new_message_notification');
      newSocket.off('receive_notification');
      newSocket.close();
    };
  }, [fetchNotifications]);

  // Mark as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => prev.map(n =>
      (n.id === notificationId || n._id === notificationId) ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
    apiCall('PUT', `/notifications/${notificationId}/read`).catch(err =>
      console.log('Failed to mark as read:', err.message)
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    apiCall('PUT', '/notifications/mark-all-read').catch(err =>
      console.log('Failed to mark all as read:', err.message)
    );
  }, []);

  // Delete notification
  const deleteNotification = useCallback((notificationId) => {
    const notification = notificationsRef.current.find(n =>
      n.id === notificationId || n._id === notificationId
    );
    setNotifications(prev => prev.filter(n =>
      n.id !== notificationId && n._id !== notificationId
    ));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    apiCall('DELETE', `/notifications/${notificationId}`).catch(err =>
      console.log('Failed to delete notification:', err.message)
    );
  }, []);

  // Clear all
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Remove toast
  const removeToast = useCallback((toastId) => {
    setToastNotifications(prev => prev.filter(t => t.id !== toastId));
  }, []);

  // Test notification
  const testNotification = useCallback(() => {
    const addNotif = addNotificationRef.current;
    const showT = showToastRef.current;
    if (!addNotif || !showT) return;
    console.log('🧪 Creating test notification...');
    addNotif({
      id: Date.now(),
      type: 'message',
      title: 'Test Notification',
      message: 'This is a test notification from console',
      createdAt: new Date(),
      read: false
    });
    showT('Test Notification', 'This is a test notification', 'message');
    console.log('✅ Test notification created');
  }, []);

  // Create notification via API
  const createTestNotification = useCallback(async () => {
    try {
      console.log('🧪 Creating test notification via API...');
      const data = await apiCall('POST', '/notifications', {
        type: 'message',
        title: 'Test API Notification',
        message: 'This is a test notification created via API',
      });
      console.log('📥 Create notification API response:', data);
      if (data.success) {
        console.log('✅ Test notification created via API');
        await fetchNotifications();
      }
    } catch (error) {
      console.error('❌ Error creating test notification:', error);
    }
  }, [fetchNotifications]);

  // Filtered notifications
  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  const value = {
    notifications,
    filteredNotifications,
    unreadCount,
    toastNotifications,
    isConnected,
    filter,
    setFilter,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
    removeToast,
    showToast,
    testNotification,
    createTestNotification,
    timeAgo
  };

  // Debug
  useEffect(() => {
    window.testNotification = testNotification;
    window.createTestNotification = createTestNotification;
    window.notificationDebug = { notifications, unreadCount, isConnected };
  }, [testNotification, createTestNotification, notifications, unreadCount, isConnected]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
