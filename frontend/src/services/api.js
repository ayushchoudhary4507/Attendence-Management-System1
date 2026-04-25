import axios from 'axios';

// Conditional API URL based on environment
const API_BASE_URL = import.meta.env.PROD
  ? 'https://attendence-management-system1.onrender.com/api'
  : 'http://localhost:5005/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
  timeoutErrorMessage: 'Request timed out. Server may be starting up, please try again.'
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (email, password) => {
    try {
      console.log('Making login request to:', API_BASE_URL + '/login');
      const response = await api.post('/login', { email, password });
      console.log('Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        code: error.code,
        response: error.response,
        request: error.request
      });
      
      // Handle timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw { 
          message: 'Server is taking too long to respond. This usually happens when the server is starting up after being idle. Please wait 30 seconds and try again.', 
          popup: {
            type: 'warning',
            title: 'Server Waking Up',
            message: 'Our free server is starting up. Please try again in 30 seconds.'
          }
        };
      }
      
      throw error.response ? error.response.data : { message: 'Network error: ' + error.message };
    }
  },

  signup: async (name, email, password, phone) => {
    try {
      const response = await api.post('/register', { name, email, password, phone });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // OTP Authentication
  sendOTP: async (email, mobile) => {
    try {
      const response = await api.post('/auth/send', { email, mobile });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  verifyOTP: async (otp, email, mobile) => {
    try {
      const response = await api.post('/auth/verify', { otp, email, mobile });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  resendOTP: async (email, mobile) => {
    try {
      const response = await api.post('/auth/resend', { email, mobile });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
};

export const settingsAPI = {
  // Profile
  getProfile: async () => {
    const response = await api.get('/settings/profile');
    return response.data;
  },
  
  updateProfile: async (profileData) => {
    const response = await api.put('/settings/profile', profileData);
    return response.data;
  },
  
  // Appearance/Theme
  updateAppearance: async (theme) => {
    const response = await api.put('/settings/appearance', { theme });
    return response.data;
  },
  
  // Settings - expects { settings: { appearance: {...}, notifications: {...} } }
  updateSettings: async (settingsData) => {
    const response = await api.put('/settings/settings', settingsData);
    return response.data;
  },
  
  // Notifications
  getNotifications: async () => {
    const response = await api.get('/settings/notifications');
    return response.data;
  },
  
  addNotification: async (notification) => {
    const response = await api.post('/settings/notifications', notification);
    return response.data;
  },
  
  markNotificationRead: async (notificationId) => {
    const response = await api.put('/settings/notifications/read', { notificationId });
    return response.data;
  },
  
  markAllNotificationsRead: async () => {
    const response = await api.put('/settings/notifications/read-all');
    return response.data;
  },
  
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/settings/notifications/${notificationId}`);
    return response.data;
  },
};

export const projectsAPI = {
  // Get all projects
  getAllProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },
  
  // Get projects by status
  getProjectsByStatus: async (status) => {
    const response = await api.get(`/projects/status/${status}`);
    return response.data;
  },
  
  // Get single project
  getProjectById: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },
  
  // Create project
  createProject: async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },
  
  // Update project
  updateProject: async (id, projectData) => {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },
  
  // Delete project
  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  // Get dashboard stats
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },
  
  // Get all users
  getAllUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  
  // Get user by ID
  getUserById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  
  // Create new user
  createUser: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },
  
  // Update user
  updateUser: async (id, userData) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },
  
  // Update user role
  updateUserRole: async (id, role) => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },
  
  // Delete user
  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
};

// Attendance API
export const attendanceAPI = {
  // Mark attendance for today
  markAttendance: async (status = 'Present', notes = '') => {
    const response = await api.post('/attendance/mark', { status, notes });
    return response.data;
  },
  
  // Check out
  checkOut: async () => {
    const response = await api.put('/attendance/checkout');
    return response.data;
  },
  
  // Get my today's attendance
  getMyTodayAttendance: async () => {
    const response = await api.get('/attendance/my-today');
    return response.data;
  },
  
  // Get all employees with today's attendance (admin only)
  getTodayAllAttendance: async () => {
    const response = await api.get('/attendance/today');
    return response.data;
  },
  
  // Get today's attendance status with active/inactive (admin only)
  getTodayAttendanceStatus: async () => {
    const response = await api.get('/attendance/today-status');
    return response.data;
  },
  
  // Get attendance history for an employee
  getAttendanceHistory: async (employeeId, startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await api.get(`/attendance/history/${employeeId}`, { params });
    return response.data;
  },

  // Get attendance by specific date
  getAttendanceByDate: async (date) => {
    const response = await api.get('/attendance/by-date', { params: { date } });
    return response.data;
  },

  // LEAVE MANAGEMENT
  // Apply for leave
  applyLeave: async (leaveData) => {
    const response = await api.post('/attendance/leave/apply', leaveData);
    return response.data;
  },

  // Get my leaves
  getMyLeaves: async () => {
    const response = await api.get('/attendance/leave/my-leaves');
    return response.data;
  },

  // Get all leaves (admin)
  getAllLeaves: async (status) => {
    const params = status ? { status } : {};
    const response = await api.get('/attendance/leave/all', { params });
    return response.data;
  },

  // Get pending leaves count (admin popup)
  getPendingLeavesCount: async () => {
    const response = await api.get('/attendance/leave/pending-count');
    return response.data;
  },

  // Approve/Reject leave (admin)
  approveRejectLeave: async (leaveId, status, rejectionReason) => {
    const body = { status };
    if (rejectionReason) body.rejectionReason = rejectionReason;
    const response = await api.put(`/attendance/leave/approve/${leaveId}`, body);
    return response.data;
  },

  // Cancel leave
  cancelLeave: async (leaveId) => {
    const response = await api.put(`/attendance/leave/cancel/${leaveId}`);
    return response.data;
  },
};

// Task API
export const taskAPI = {
  // Create new task (admin only)
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },
  
  // Get all tasks (admin sees all, employee sees own)
  getAllTasks: async () => {
    const response = await api.get('/tasks');
    return response.data;
  },
  
  // Get my tasks (employee only)
  getMyTasks: async () => {
    const response = await api.get('/tasks/my-tasks');
    return response.data;
  },
  
  // Get task stats (admin only)
  getTaskStats: async () => {
    const response = await api.get('/tasks/stats');
    return response.data;
  },
  
  // Update task status
  updateTask: async (taskId, status, notes) => {
    const response = await api.put(`/tasks/${taskId}`, { status, notes });
    return response.data;
  },
  
  // Delete task (admin only)
  deleteTask: async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  // Get dashboard analytics data
  getDashboard: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },
  
  // Get real-time attendance stats
  getRealtime: async () => {
    const response = await api.get('/analytics/realtime');
    return response.data;
  },
};

// Chat/Messaging API
export const chatAPI = {
  // Get all users for chat list
  getUsers: async () => {
    const response = await api.get('/messages/users');
    return response.data;
  },
  
  // Get chat history with a specific user
  getMessages: async (userId) => {
    const response = await api.get(`/messages/${userId}`);
    return response.data;
  },
  
  // Send a message
  sendMessage: async (receiverId, message) => {
    const response = await api.post('/messages', { receiverId, message });
    return response.data;
  },
  
  // Get unread message count
  getUnreadCount: async () => {
    const response = await api.get('/messages/unread-count');
    return response.data;
  },
  
  // Get conversations list
  getConversations: async () => {
    const response = await api.get('/messages/conversations');
    return response.data;
  },

  // Mark all messages from a specific user as read
  markAsRead: async (userId) => {
    const response = await api.put(`/messages/read/${userId}`);
    return response.data;
  },

  // Upload file
  uploadFile: async (formData) => {
    const response = await api.post('/messages/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Group Chat API
export const groupAPI = {
  // Create a new group
  createGroup: async (name, description, members) => {
    const response = await api.post('/groups/create', { name, description, members });
    return response.data;
  },
  
  // Get all groups for logged-in user
  getGroups: async () => {
    const response = await api.get('/groups');
    return response.data;
  },
  
  // Get single group details
  getGroup: async (groupId) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },
  
  // Get messages for a group
  getGroupMessages: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/messages`);
    return response.data;
  },
  
  // Send message to group
  sendGroupMessage: async (groupId, message, messageType = 'text') => {
    const response = await api.post(`/groups/${groupId}/messages`, { message, messageType });
    return response.data;
  },
  
  // Add members to group
  addGroupMembers: async (groupId, members) => {
    const response = await api.post(`/groups/${groupId}/members`, { members });
    return response.data;
  },
  
  // Remove member from group (or leave group)
  removeGroupMember: async (groupId, memberId) => {
    const response = await api.delete(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  },
  
  // Delete group
  deleteGroup: async (groupId) => {
    const response = await api.delete(`/groups/${groupId}`);
    return response.data;
  },

  // Get group members
  getGroupMembers: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/members`);
    return response.data;
  },

  // Update member role
  updateMemberRole: async (groupId, memberId, role) => {
    const response = await api.put(`/groups/${groupId}/members/${memberId}/role`, { role });
    return response.data;
  },

  // Change group name (admin only)
  changeGroupName: async (groupId, name) => {
    const response = await api.patch(`/groups/${groupId}/name`, { name });
    return response.data;
  },

  // Make member admin (admin only)
  makeMemberAdmin: async (groupId, userId) => {
    const response = await api.patch(`/groups/${groupId}/make-admin/${userId}`);
    return response.data;
  },

  // Get unread message count for all groups
  getUnreadCount: async () => {
    const response = await api.get('/groups/unread-count');
    return response.data;
  },

  // Mark all messages in a group as read
  markAsRead: async (groupId) => {
    const response = await api.patch(`/groups/${groupId}/mark-read`);
    return response.data;
  }
};

export { API_BASE_URL };
export default api;
