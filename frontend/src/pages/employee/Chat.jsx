import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { chatAPI, groupAPI } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import CreateGroupModal from '../../components/admin/CreateGroupModal';
import GroupMembersModal from '../../components/admin/GroupMembersModal';
import './Chat.css';

const SOCKET_URL = import.meta.env.PROD 
  ? 'https://attendence-management-system1.onrender.com'
  : 'http://127.0.0.1:5005';

// Format bytes into readable string (e.g. 2.4 MB)
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + (sizes[i] || 'MB');
};

// Format seconds into MM:SS
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Check if message is an image file
const isImageFile = (msg) => {
  if (!msg) return false;
  if (msg.messageType === 'image') return true;
  const type = msg.fileType || msg.mimeType || '';
  if (type.startsWith('image/')) return true;
  const url = (msg.fileUrl || msg.file || msg.image || msg.url || '').toLowerCase();
  const name = (msg.fileName || msg.message || '').toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url) || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) return true;
  if (typeof url === 'string' && url.startsWith('data:image/')) return true;
  return false;
};

// Format sidebar preview snippet safely
const renderSidebarSnippet = (msg, msgType, fileName) => {
  const category = getFileCategory({ message: msg, messageType: msgType, fileName, fileUrl: msg });
  if (category === 'image') return '📷 Photo';
  if (category === 'video') return '🎥 Video';
  if (category === 'voice') return '🎤 Voice Message';
  if (category === 'audio') return '🎵 Audio';
  if (category === 'pdf') return `📄 ${fileName || 'PDF Document'}`;
  if (category === 'word' || category === 'excel' || category === 'ppt' || category === 'archive' || category === 'document') {
    return msg && msg.startsWith('📎 ') ? msg : `📁 ${fileName || 'Document'}`;
  }
  if (!msg) return '';
  return msg.length > 32 ? msg.substring(0, 32) + '...' : msg;
};

// Determine file category from type / filename
const getFileCategory = (msg) => {
  if (!msg) return 'text';
  if (msg.messageType && msg.messageType !== 'file') return msg.messageType;
  
  const rawUrl = (msg.fileUrl || msg.file || msg.image || msg.url || '').toLowerCase();
  const rawName = (msg.fileName || msg.message || '').toLowerCase();
  const rawType = (msg.fileType || msg.mimeType || '').toLowerCase();

  if (rawName.includes('voice_message') || rawName.includes('voice-record') || msg.messageType === 'voice') {
    return 'voice';
  }
  if (rawType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(rawName) || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(rawUrl)) {
    return 'image';
  }
  if (rawType.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(rawName) || /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(rawUrl)) {
    return 'video';
  }
  if (rawType.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(rawName) || /\.(mp3|wav|m4a|aac|ogg)$/i.test(rawUrl)) {
    return 'audio';
  }
  if (rawType === 'application/pdf' || /\.pdf$/i.test(rawName) || /\.pdf$/i.test(rawUrl)) {
    return 'pdf';
  }
  if (/\.(doc|docx)$/i.test(rawName) || rawType.includes('word')) {
    return 'word';
  }
  if (/\.(xls|xlsx|csv)$/i.test(rawName) || rawType.includes('excel') || rawType.includes('spreadsheet')) {
    return 'excel';
  }
  if (/\.(ppt|pptx)$/i.test(rawName) || rawType.includes('presentation') || rawType.includes('powerpoint')) {
    return 'ppt';
  }
  if (/\.(zip|rar|7z|tar|gz)$/i.test(rawName) || rawType.includes('zip') || rawType.includes('compressed')) {
    return 'archive';
  }
  if (/\.(txt|md|json|log)$/i.test(rawName) || rawType.startsWith('text/')) {
    return 'text_doc';
  }
  if (msg.fileUrl) {
    return 'document';
  }
  return 'text';
};

// ============================================
// SUB-COMPONENT: Custom Audio Player
// ============================================
const ChatAudioPlayer = ({ src, fileName, fileSize }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error('Audio play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  return (
    <div className="chat-custom-audio-player">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
      />
      <button 
        type="button" 
        className={`audio-play-btn ${isPlaying ? 'playing' : ''}`}
        onClick={togglePlay}
        title={isPlaying ? 'Pause' : 'Play audio'}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      <div className="audio-details">
        <div className="audio-top-row">
          <span className="audio-filename">{fileName || 'Audio Message'}</span>
          <span className="audio-size">{fileSize ? formatBytes(fileSize) : ''}</span>
        </div>
        <div className="audio-seek-row">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="audio-seek-bar"
          />
          <div className="audio-time-row">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
      <a href={src} download={fileName || 'audio.mp3'} target="_blank" rel="noopener noreferrer" className="audio-dl-btn" title="Download Audio">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
      </a>
    </div>
  );
};

// ============================================
// SUB-COMPONENT: Custom Voice Message Player
// ============================================
const ChatVoicePlayer = ({ src, duration: initialDuration }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error('Voice play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && (!duration || isNaN(duration) || duration === 0)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="chat-voice-note-bubble">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
      />
      <button 
        type="button" 
        className={`voice-play-btn ${isPlaying ? 'playing' : ''}`}
        onClick={togglePlay}
        title={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      <div className="voice-waveform-container">
        {/* Animated Sound Wave Bars */}
        <div className={`voice-wave-bars ${isPlaying ? 'animating' : ''}`}>
          {[40, 70, 90, 60, 30, 80, 100, 50, 75, 95, 60, 85, 45, 65, 90, 40, 80, 55, 70, 35].map((h, idx) => (
            <span 
              key={idx} 
              style={{ height: `${h}%` }}
              className={`wave-bar ${((idx / 20) * 100) <= progressPercent ? 'active' : ''}`}
            />
          ))}
        </div>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.05"
          value={currentTime}
          onChange={handleSeek}
          className="voice-seek-overlay"
        />
        <div className="voice-time-display">
          <span>{isPlaying ? formatDuration(currentTime) : formatDuration(duration || currentTime)}</span>
          <span className="voice-mic-badge">🎤 Voice Note</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT: Chat
// ============================================
const Chat = ({ user }) => {
  const { fetchUnreadMessageCount, fetchNotifications } = useNotifications();
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [groupTypingUsers, setGroupTypingUsers] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [groupUnreadCounts, setGroupUnreadCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'groups'
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  
  // Media Upload & Recording States
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadFileName, setUploadFileName] = useState('');
  
  // Modals
  const [previewImage, setPreviewImage] = useState(null);
  const [previewPdf, setPreviewPdf] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordingPreviewPlaying, setRecordingPreviewPlaying] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);
  
  // Specific file input refs for Attachment Menu options
  const generalFileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const documentInputRef = useRef(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const previewAudioRef = useRef(null);

  const currentUserId = user?.id || user?._id;
  const currentUserName = user?.name || 'Current User';
  
  const selectedUserRef = useRef(selectedUser);
  const selectedGroupRef = useRef(selectedGroup);
  selectedUserRef.current = selectedUser;
  selectedGroupRef.current = selectedGroup;

  // Resolve file URL safely
  const getFileUrl = (fileUrl) => {
    if (!fileUrl || typeof fileUrl !== 'string') return '';
    const clean = fileUrl.trim().replace(/\\/g, '/');
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) return clean;
    const base = (SOCKET_URL || 'http://127.0.0.1:5005').replace(/\/api\/?$/, '').replace(/\/$/, '');
    const normalized = clean.startsWith('/') ? clean : `/${clean}`;
    return `${base}${normalized}`;
  };

  // Get user avatar URL
  const getAvatarUrl = (name, profileImage) => {
    if (profileImage && typeof profileImage === 'string' && profileImage.trim() !== '') {
      const clean = profileImage.trim().replace(/\\/g, '/');
      if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) return clean;
      const base = (SOCKET_URL || 'http://127.0.0.1:5005').replace(/\/api\/?$/, '').replace(/\/$/, '');
      const normalized = clean.startsWith('/') ? clean : `/${clean}`;
      return `${base}${normalized}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=4F46E5&color=fff&size=45`;
  };

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await chatAPI.getConversations();
      if (response.success) {
        setConversations(response.conversations || []);
        const counts = {};
        (response.conversations || []).forEach(conv => {
          if (conv.unreadCount > 0) {
            counts[conv.userId] = conv.unreadCount;
          }
        });
        setUnreadCounts(prev => ({ ...prev, ...counts }));
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      const response = await groupAPI.getGroups();
      if (response.success && response.groups) {
        setGroups(prev => {
          const existingMap = new Map(prev.map(g => [String(g._id), g]));
          return response.groups.map(newGroup => {
            const existing = existingMap.get(String(newGroup._id));
            if (existing?.lastMessage?.timestamp && newGroup?.lastMessage?.timestamp) {
              const existingTime = new Date(existing.lastMessage.timestamp).getTime();
              const newTime = new Date(newGroup.lastMessage.timestamp).getTime();
              if (existingTime > newTime) {
                return { ...newGroup, lastMessage: existing.lastMessage };
              }
            }
            return newGroup;
          });
        });
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }, []);

  // Fetch group unread counts
  const fetchGroupUnreadCounts = useCallback(async () => {
    try {
      const response = await groupAPI.getUnreadCount();
      if (response.success) {
        setGroupUnreadCounts(response.unreadCounts || {});
      }
    } catch (err) {
      console.error('Failed to load group unread counts:', err);
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!currentUserId) return;
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      newSocket.emit('join', currentUserId);
    });

    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      if (newSocket.connected) {
        newSocket.disconnect();
      } else {
        newSocket.off();
      }
    };
  }, [currentUserId]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !currentUserId) return;

    if (socket.connected) {
      socket.emit('join', currentUserId);
    }

    const handleReceiveMessage = (data) => {
      const currentSelected = selectedUserRef.current;
      const isFromSelectedUser = String(data.senderId) === String(currentSelected?.id);
      const isToSelectedUser = String(data.receiverId) === String(currentSelected?.id);
      const isForMe = String(data.receiverId) === String(currentUserId);
      
      if (isFromSelectedUser || isToSelectedUser || (isForMe && currentSelected && String(data.senderId) === String(currentSelected.id))) {
        setMessages((prev) => {
          if (prev.some(m => m.id === data.id || (m.tempId && m.tempId === data.tempId))) return prev;
          return [...prev, {
            id: data.id,
            tempId: data.tempId,
            senderId: data.senderId,
            senderName: data.senderName,
            receiverId: data.receiverId,
            message: data.message,
            messageType: data.messageType || getFileCategory(data),
            fileUrl: data.fileUrl || null,
            fileName: data.fileName || null,
            fileType: data.fileType || data.mimeType || null,
            mimeType: data.mimeType || data.fileType || null,
            fileSize: data.fileSize || 0,
            duration: data.duration || 0,
            timestamp: new Date(data.timestamp),
            read: true
          }];
        });

        if (String(data.senderId) !== String(currentUserId)) {
          socket.emit('mark_read', { messageId: data.id, senderId: data.senderId });
          chatAPI.markAsRead(data.senderId).catch(err => console.error('Failed to mark as read:', err));
        }
      }

      if (String(data.senderId) !== String(currentUserId) && String(currentSelected?.id) !== String(data.senderId)) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }));
      }
      
      fetchConversations();
    };

    const handleMessageSent = (data) => {
      setMessages((prev) => {
        const hasTemp = prev.some(m => m.tempId === data.tempId || m.status === 'sending');
        if (hasTemp) {
          return prev.map(m => 
            (m.tempId === data.tempId || (m.status === 'sending' && m.receiverId === data.receiverId && m.message === data.message))
              ? { ...m, id: data.id, status: 'sent', tempId: undefined }
              : m
          );
        }
        
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, {
          id: data.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          message: data.message,
          messageType: data.messageType || getFileCategory(data),
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileType: data.fileType || null,
          mimeType: data.mimeType || null,
          fileSize: data.fileSize || 0,
          duration: data.duration || 0,
          timestamp: new Date(data.timestamp),
          status: 'sent',
          read: false
        }];
      });
      
      fetchConversations();
    };

    const handleReceiveGroupMessage = (data) => {
      const currentSelectedGroup = selectedGroupRef.current;
      const isFromMe = String(data.senderId) === String(currentUserId);
      const isGroupOpen = currentSelectedGroup && String(data.groupId) === String(currentSelectedGroup._id);

      if (isGroupOpen) {
        setMessages((prev) => {
          if (prev.some(m => m.id === data.id || (m.tempId && m.tempId === data.tempId))) return prev;
          return [...prev, {
            id: data.id,
            tempId: data.tempId,
            groupId: data.groupId,
            senderId: data.senderId,
            senderName: data.senderName,
            message: data.message,
            messageType: data.messageType || getFileCategory(data),
            fileUrl: data.fileUrl || null,
            fileName: data.fileName || null,
            fileType: data.fileType || data.mimeType || null,
            mimeType: data.mimeType || data.fileType || null,
            fileSize: data.fileSize || 0,
            duration: data.duration || 0,
            timestamp: new Date(data.timestamp),
            read: true,
            isGroupMessage: true
          }];
        });

        if (!isFromMe) {
          socket.emit('group_message_read', { groupId: data.groupId, messageId: data.id, senderId: data.senderId });
          groupAPI.markAsRead(data.groupId).catch(err => console.error('Failed to mark group messages as read:', err));
        }
      } else {
        if (!isFromMe) {
          setGroupUnreadCounts(prev => ({
            ...prev,
            [data.groupId]: (prev[data.groupId] || 0) + 1
          }));
        }
      }

      const groupIdStr = String(data.groupId);
      setGroups(prev => prev.map(g => {
        if (String(g._id) === groupIdStr) {
          return {
            ...g,
            lastMessage: {
              message: data.message,
              senderId: { name: data.senderName },
              timestamp: new Date()
            }
          };
        }
        return g;
      }));
    };

    const handleGroupMessageSent = (data) => {
      setMessages((prev) => {
        const hasTemp = prev.some(m => m.tempId === data.tempId || m.status === 'sending');
        if (hasTemp) {
          return prev.map(m =>
            (m.tempId === data.tempId || (m.status === 'sending' && m.groupId === data.groupId && m.message === data.message))
              ? { ...m, id: data.id, status: 'sent', tempId: undefined }
              : m
          );
        }

        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, {
          id: data.id,
          groupId: data.groupId,
          senderId: data.senderId,
          senderName: data.senderName,
          message: data.message,
          messageType: data.messageType || getFileCategory(data),
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileType: data.fileType || null,
          mimeType: data.mimeType || null,
          fileSize: data.fileSize || 0,
          duration: data.duration || 0,
          timestamp: new Date(data.timestamp),
          status: 'sent',
          read: true,
          isGroupMessage: true
        }];
      });

      const groupIdStr = String(data.groupId);
      setGroups(prev => prev.map(g => {
        if (String(g._id) === groupIdStr) {
          return {
            ...g,
            lastMessage: {
              message: data.message,
              senderId: { name: data.senderName },
              timestamp: new Date()
            }
          };
        }
        return g;
      }));
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('online_users', (ids) => setOnlineUsers(new Set(ids)));
    socket.on('user_status', (data) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (data.isOnline) next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    });
    socket.on('typing', (data) => {
      setTypingUsers(prev => {
        const next = new Map(prev);
        if (data.isTyping) next.set(data.userId, true);
        else next.delete(data.userId);
        return next;
      });
    });
    socket.on('message_read', (data) => {
      setMessages(prev => prev.map(msg => msg.id === data.messageId ? { ...msg, read: true, readAt: new Date(data.readAt) } : msg));
    });
    socket.on('receive_group_message', handleReceiveGroupMessage);
    socket.on('group_message_sent', handleGroupMessageSent);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('online_users');
      socket.off('user_status');
      socket.off('typing');
      socket.off('message_read');
      socket.off('receive_group_message', handleReceiveGroupMessage);
      socket.off('group_message_sent', handleGroupMessageSent);
    };
  }, [socket, currentUserId, fetchConversations, fetchGroups]);

  // Initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [usersRes, convRes, groupsRes] = await Promise.all([
          chatAPI.getUsers(),
          chatAPI.getConversations(),
          groupAPI.getGroups()
        ]);

        if (usersRes.success && usersRes.users) {
          setUsers(usersRes.users);
        }

        if (convRes.success && convRes.conversations) {
          setConversations(convRes.conversations);
          const counts = {};
          convRes.conversations.forEach(conv => {
            if (conv.unreadCount > 0) {
              counts[conv.userId] = conv.unreadCount;
            }
          });
          setUnreadCounts(counts);
        }

        if (groupsRes.success && groupsRes.groups) {
          setGroups(groupsRes.groups);
        }

        await fetchGroupUnreadCounts();
      } catch (err) {
        console.error('Failed to load chat data:', err);
        setError('Failed to load chat data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [fetchGroupUnreadCounts]);

  // Load chat messages when user is selected
  useEffect(() => {
    if (!selectedUser) return;
    setSelectedGroup(null);
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await chatAPI.getMessages(selectedUser.id);
        if (!isMounted) return;
        
        if (response.success && response.messages) {
          setMessages(response.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
          setUnreadCounts(prev => ({ ...prev, [selectedUser.id]: 0 }));

          if (socket && socket.connected) {
            const unreadMessages = response.messages.filter(
              m => String(m.receiverId) === String(currentUserId) && !m.read
            );
            unreadMessages.forEach(msg => {
              socket.emit('mark_read', { messageId: msg.id, senderId: msg.senderId });
            });
          }
        }
      } catch (err) {
        console.error('Fetch messages error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();
    return () => { isMounted = false; };
  }, [selectedUser?.id]);

  // Load group messages when group is selected
  useEffect(() => {
    if (!selectedGroup) return;
    setSelectedUser(null);
    
    if (socket && socket.connected) {
      socket.emit('join_group', selectedGroup._id);
    }

    let isMounted = true;

    const fetchGroupMessages = async () => {
      try {
        setLoading(true);
        const response = await groupAPI.getGroupMessages(selectedGroup._id);
        if (!isMounted) return;
        
        if (response.success && response.messages) {
          setMessages(response.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            isGroupMessage: true
          })));
        }
      } catch (err) {
        console.error('Fetch group messages error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGroupMessages();
    return () => {
      isMounted = false;
      if (socket && socket.connected && selectedGroup) {
        socket.emit('leave_group', selectedGroup._id);
      }
    };
  }, [selectedGroup?._id, socket]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle emoji click
  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Helper to infer explicit message type from file
  const inferExplicitType = (file) => {
    if (!file) return 'file';
    const type = file.type || '';
    const name = file.name || '';
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) return 'image';
    if (type.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(name)) return 'video';
    if (type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(name)) return 'audio';
    if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
    return 'document';
  };

  // Generic File Upload Handler
  const handleFileUpload = async (file, explicitType = null) => {
    if (!file) return;
    if ((!selectedUser && !selectedGroup) || !currentUserId) {
      alert('Please select a recipient or group first.');
      return;
    }

    // 50MB limit validation
    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds the 50MB maximum limit.');
      return;
    }

    setShowAttachMenu(false);
    setUploadFileName(file.name);
    setUploadProgress(1);
    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('senderId', currentUserId);
      formData.append('senderName', currentUserName);

      if (selectedUser) {
        formData.append('receiverId', selectedUser.id);
      } else if (selectedGroup) {
        formData.append('groupId', selectedGroup._id);
      }

      // Upload with progress callback
      const uploadRes = await chatAPI.uploadFile(formData, (percent) => {
        setUploadProgress(percent);
      });

      if (!uploadRes.success) {
        throw new Error(uploadRes.message || 'File upload failed');
      }

      const fileData = uploadRes.data || {};
      const fileUrl = fileData.fileUrl || uploadRes.fileUrl;
      const fileName = fileData.fileName || file.name;
      const mimeType = fileData.mimeType || fileData.fileType || file.type;
      const fileSize = fileData.fileSize || file.size;
      const messageType = explicitType || inferExplicitType(file);

      // Default text preview
      let displayMsg = '';
      if (messageType === 'voice') displayMsg = '🎤 Voice Message';
      else if (messageType === 'image') displayMsg = '📷 Photo';
      else if (messageType === 'video') displayMsg = '🎥 Video';
      else if (messageType === 'audio') displayMsg = '🎵 Audio';
      else if (messageType === 'pdf') displayMsg = `📄 ${fileName}`;
      else displayMsg = `📁 ${fileName}`;

      let savedMessage = null;

      if (selectedGroup) {
        const dbRes = await groupAPI.sendGroupMessage(
          selectedGroup._id,
          displayMsg,
          messageType,
          {
            fileUrl,
            fileName,
            fileType: mimeType,
            mimeType,
            fileSize,
            duration: file._duration || 0
          }
        );

        savedMessage = dbRes.data;

        const fileMessage = {
          id: savedMessage?._id || savedMessage?.id || Date.now(),
          groupId: selectedGroup._id,
          senderId: currentUserId,
          senderName: currentUserName,
          message: displayMsg,
          messageType,
          fileUrl,
          fileName,
          fileType: mimeType,
          mimeType,
          fileSize,
          duration: file._duration || 0,
          timestamp: new Date(),
          isGroupMessage: true,
          status: 'sent'
        };

        if (socket && socket.connected) {
          socket.emit('send_group_message', {
            ...fileMessage,
            groupId: selectedGroup._id,
            tempId: Date.now()
          });
        }

        setMessages(prev => [...prev, fileMessage]);
      } else if (selectedUser) {
        const dbRes = await chatAPI.sendMessage(
          selectedUser.id,
          displayMsg,
          {
            fileUrl,
            fileName,
            fileType: mimeType,
            mimeType,
            fileSize,
            duration: file._duration || 0,
            messageType
          }
        );

        savedMessage = dbRes.data;

        const fileMessage = {
          id: savedMessage?.id || savedMessage?._id || Date.now(),
          senderId: currentUserId,
          senderName: currentUserName,
          receiverId: selectedUser.id,
          message: displayMsg,
          messageType,
          fileUrl,
          fileName,
          fileType: mimeType,
          mimeType,
          fileSize,
          duration: file._duration || 0,
          timestamp: new Date(),
          status: 'sent'
        };

        if (socket && socket.connected) {
          socket.emit('send_message', {
            ...fileMessage,
            tempId: Date.now()
          });
        }

        setMessages(prev => [...prev, fileMessage]);
      }

      fetchConversations();
    } catch (err) {
      console.error('File upload error:', err);
      alert(err.message || 'Failed to upload and send file. Please try again.');
    } finally {
      setUploadingFile(false);
      setUploadProgress(null);
      setUploadFileName('');
      // Reset input refs
      if (generalFileInputRef.current) generalFileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (audioInputRef.current) audioInputRef.current.value = '';
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  // ============================================
  // VOICE RECORDING HANDLERS
  // ============================================
  const startVoiceRecording = async () => {
    setShowAttachMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : '';
      }

      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(audioUrl);
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start duration counter
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Unable to access microphone. Please check your browser microphone permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setIsRecording(false);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
    setRecordingPreviewPlaying(false);
  };

  const sendVoiceRecording = async () => {
    if (!recordedAudioBlob) return;
    const duration = recordingSeconds;
    const voiceFile = new File([recordedAudioBlob], `voice_message_${Date.now()}.webm`, {
      type: recordedAudioBlob.type || 'audio/webm'
    });
    voiceFile._duration = duration;

    // Discard preview state
    cancelVoiceRecording();

    // Upload & send
    await handleFileUpload(voiceFile, 'voice');
  };

  const toggleRecordingPreview = () => {
    if (!previewAudioRef.current) return;
    if (recordingPreviewPlaying) {
      previewAudioRef.current.pause();
      setRecordingPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => setRecordingPreviewPlaying(true)).catch(e => console.error(e));
    }
  };

  // Text message send
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || (!selectedUser && !selectedGroup) || !currentUserId) return;

    const tempId = `temp-${Date.now()}`;
    const messageText = newMessage.trim();

    if (selectedGroup) {
      const optimisticMessage = {
        id: tempId,
        tempId: tempId,
        groupId: selectedGroup._id,
        senderId: currentUserId,
        senderName: currentUserName,
        message: messageText,
        messageType: 'text',
        timestamp: new Date(),
        read: true,
        status: 'sending',
        isGroupMessage: true
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      try {
        const response = await groupAPI.sendGroupMessage(selectedGroup._id, messageText);
        if (response.success && response.data) {
          const serverMessage = response.data;
          setMessages(prev => 
            prev.map(m => 
              m.tempId === tempId 
                ? { 
                    ...m, 
                    id: serverMessage.id || serverMessage._id, 
                    tempId: undefined,
                    status: 'sent',
                    timestamp: new Date(serverMessage.timestamp)
                  } 
                : m
            )
          );

          if (socket && socket.connected) {
            socket.emit('send_group_message', {
              id: serverMessage.id || serverMessage._id,
              tempId: tempId,
              groupId: selectedGroup._id,
              senderId: currentUserId,
              senderName: currentUserName,
              message: messageText,
              messageType: 'text',
              timestamp: serverMessage.timestamp
            });
          }
          setTimeout(fetchGroups, 1500);
        }
      } catch (err) {
        console.error('Failed to send group message:', err);
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' } : m));
      }
      return;
    }

    if (selectedUser) {
      const optimisticMessage = {
        id: tempId,
        tempId: tempId,
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: selectedUser.id,
        message: messageText,
        messageType: 'text',
        timestamp: new Date(),
        read: false,
        status: 'sending'
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      try {
        const response = await chatAPI.sendMessage(selectedUser.id, messageText);
        if (response.success && response.data) {
          const serverMessage = response.data;
          setMessages(prev => 
            prev.map(m => 
              m.tempId === tempId 
                ? { 
                    ...m, 
                    id: serverMessage.id, 
                    tempId: undefined,
                    status: 'sent',
                    timestamp: new Date(serverMessage.timestamp)
                  } 
                : m
            )
          );
          
          if (socket && socket.connected) {
            socket.emit('send_message', {
              id: serverMessage.id,
              tempId: tempId,
              senderId: currentUserId,
              senderName: currentUserName,
              receiverId: selectedUser.id,
              message: messageText,
              messageType: 'text',
              timestamp: serverMessage.timestamp
            });
          }
          fetchConversations();
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' } : m));
      }
    }
  };

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (!socket || !socket.connected) return;

    if (selectedUser) {
      socket.emit('typing', { receiverId: selectedUser.id, isTyping: true });
    } else if (selectedGroup) {
      socket.emit('group_typing', { groupId: selectedGroup._id, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (selectedUser) {
        socket.emit('typing', { receiverId: selectedUser.id, isTyping: false });
      } else if (selectedGroup) {
        socket.emit('group_typing', { groupId: selectedGroup._id, isTyping: false });
      }
    }, 3000);
  }, [socket, selectedUser, selectedGroup]);

  // Format timestamp
  const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(new Date(date));
  };

  const formatDate = (date) => {
    const today = new Date();
    const messageDate = new Date(date);
    if (today.toDateString() === messageDate.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.toDateString() === messageDate.toDateString()) return 'Yesterday';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(messageDate);
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groupsMap = {};
    messages.forEach((msg) => {
      const dateKey = formatDate(msg.timestamp);
      if (!groupsMap[dateKey]) groupsMap[dateKey] = [];
      groupsMap[dateKey].push(msg);
    });
    return groupsMap;
  };

  const messageGroups = groupMessagesByDate();

  // Render message bubble body with support for all media types
  const renderMessageContent = (msg) => {
    const category = getFileCategory(msg);
    const resolvedUrl = msg.fileUrl ? getFileUrl(msg.fileUrl) : null;
    const fileName = msg.fileName || (resolvedUrl ? resolvedUrl.split('/').pop() : 'Attachment');
    const hasText = msg.message && !msg.message.startsWith('📎 ') && msg.message !== fileName && msg.message !== '📷 Photo' && msg.message !== '🎥 Video' && msg.message !== '🎵 Audio' && msg.message !== '🎤 Voice Message' && msg.message !== 'Attachment';

    return (
      <div className="message-body-content">
        {/* 1. IMAGE */}
        {category === 'image' && resolvedUrl && (
          <div className="message-image-container" onClick={() => setPreviewImage(resolvedUrl)}>
            <img 
              src={resolvedUrl} 
              alt={fileName} 
              className="message-image"
              loading="lazy"
              onError={(e) => {
                console.error('Image load error:', resolvedUrl);
              }}
            />
            <div className="media-overlay-badge">
              <span>🔍 Tap to view</span>
            </div>
          </div>
        )}

        {/* 2. VIDEO */}
        {category === 'video' && resolvedUrl && (
          <div className="message-video-container">
            <video 
              src={resolvedUrl} 
              controls 
              className="message-video-player"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
            <div className="video-card-meta">
              <span className="video-name">{fileName}</span>
              {msg.fileSize > 0 && <span className="video-size">{formatBytes(msg.fileSize)}</span>}
            </div>
          </div>
        )}

        {/* 3. AUDIO */}
        {category === 'audio' && resolvedUrl && (
          <ChatAudioPlayer 
            src={resolvedUrl} 
            fileName={fileName} 
            fileSize={msg.fileSize}
          />
        )}

        {/* 4. VOICE NOTE */}
        {category === 'voice' && resolvedUrl && (
          <ChatVoicePlayer 
            src={resolvedUrl} 
            duration={msg.duration} 
          />
        )}

        {/* 5. PDF DOCUMENT */}
        {category === 'pdf' && resolvedUrl && (
          <div className="message-pdf-card">
            <div className="pdf-icon-badge">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
              </svg>
            </div>
            <div className="pdf-info">
              <span className="pdf-filename" title={fileName}>{fileName}</span>
              <span className="pdf-meta">{msg.fileSize ? formatBytes(msg.fileSize) : 'PDF Document'}</span>
            </div>
            <div className="pdf-actions">
              <button 
                type="button" 
                className="pdf-preview-btn" 
                onClick={() => setPreviewPdf({ url: resolvedUrl, name: fileName })}
                title="Preview PDF"
              >
                👁️ Preview
              </button>
              <a 
                href={resolvedUrl} 
                download={fileName} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="pdf-download-btn"
                title="Download PDF"
              >
                📥
              </a>
            </div>
          </div>
        )}

        {/* 6. OTHER DOCUMENTS (Word, Excel, PPT, Zip, Text, Generic) */}
        {category !== 'image' && category !== 'video' && category !== 'audio' && category !== 'voice' && category !== 'pdf' && resolvedUrl && (
          <div className={`message-doc-card doc-type-${category}`}>
            <div className="doc-icon-badge">
              {category === 'word' ? '📄' : category === 'excel' ? '📊' : category === 'ppt' ? '📑' : category === 'archive' ? '🗜️' : '📁'}
            </div>
            <div className="doc-info">
              <span className="doc-filename" title={fileName}>{fileName}</span>
              <span className="doc-meta">
                <span className="doc-type-label">{category.toUpperCase()}</span>
                {msg.fileSize > 0 && <span> • {formatBytes(msg.fileSize)}</span>}
              </span>
            </div>
            <a 
              href={resolvedUrl} 
              download={fileName} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="doc-download-btn"
              title="Download Document"
            >
              📥 Download
            </a>
          </div>
        )}

        {/* Text Body */}
        {hasText && (
          <p className="message-text">{msg.message}</p>
        )}
      </div>
    );
  };

  // Build sidebar users list
  const getSidebarUsers = () => {
    const userMap = new Map(users.map(u => [String(u.id), u]));
    const sidebarItems = conversations.map(conv => {
      const userFromList = userMap.get(String(conv.userId));
      const profileImage = conv.profileImage || userFromList?.profileImage || '';
      return {
        userId: conv.userId,
        userName: conv.userName,
        userEmail: conv.userEmail,
        profileImage,
        unreadCount: conv.unreadCount || 0,
        lastMessageTime: conv.lastMessage?.timestamp,
        lastMessage: conv.lastMessage?.message || '',
        lastMessageType: conv.lastMessage?.messageType || 'text',
        lastFileName: conv.lastMessage?.fileName || '',
        hasConversation: true
      };
    });
    
    const conversationUserIds = new Set(conversations.map(c => String(c.userId)));
    users.forEach(u => {
      if (!conversationUserIds.has(String(u.id))) {
        sidebarItems.push({
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          profileImage: u.profileImage || '',
          unreadCount: unreadCounts[u.id] || 0,
          lastMessageTime: null,
          lastMessage: '',
          lastMessageType: 'text',
          lastFileName: '',
          hasConversation: false
        });
      }
    });
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return sidebarItems.filter(item => 
        item.userName.toLowerCase().includes(q) ||
        item.userEmail.toLowerCase().includes(q)
      );
    }
    return sidebarItems;
  };

  const sidebarUsers = getSidebarUsers();

  return (
    <>
      <div className="chat-container">
        {/* Hidden File Inputs for Attachment Options */}
        <input
          type="file"
          ref={generalFileInputRef}
          onChange={(e) => handleFileUpload(e.target.files[0])}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files[0], 'image')}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={videoInputRef}
          accept="video/*"
          onChange={(e) => handleFileUpload(e.target.files[0], 'video')}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={audioInputRef}
          accept="audio/*"
          onChange={(e) => handleFileUpload(e.target.files[0], 'audio')}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={pdfInputRef}
          accept=".pdf,application/pdf"
          onChange={(e) => handleFileUpload(e.target.files[0], 'pdf')}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={documentInputRef}
          accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
          onChange={(e) => handleFileUpload(e.target.files[0], 'document')}
          style={{ display: 'none' }}
        />

        {/* Sidebar */}
        <div className={`chat-sidebar ${showMobileSidebar ? 'visible' : 'hidden'}`}>
          <div className="chat-sidebar-header">
            <h2>Messages</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(sidebarUsers.some(u => u.unreadCount > 0) || Object.values(groupUnreadCounts).some(c => c > 0)) && (
                <button
                  className="mark-all-read-btn"
                  onClick={async () => {
                    try {
                      await chatAPI.markAllAsRead();
                      setUnreadCounts({});
                      setGroupUnreadCounts({});
                      setConversations(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
                      fetchUnreadMessageCount();
                      fetchNotifications();
                    } catch (err) {
                      console.error('Failed to mark all as read:', err);
                    }
                  }}
                  title="Mark all messages as read"
                  style={{
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#6366f1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ✓ Read All
                </button>
              )}
              <button 
                className="create-group-btn"
                onClick={() => setShowCreateGroupModal(true)}
                title="Create Group"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="chat-tabs">
            <button 
              className={`chat-tab ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              Chats
              {sidebarUsers.reduce((sum, u) => sum + (Number(u.unreadCount) || 0), 0) > 0 && (
                <span className="tab-badge">
                  {sidebarUsers.reduce((sum, u) => sum + (Number(u.unreadCount) || 0), 0)}
                </span>
              )}
            </button>
            <button 
              className={`chat-tab ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              Groups
              {Object.values(groupUnreadCounts).reduce((sum, c) => sum + (Number(c) || 0), 0) > 0 && (
                <span className="tab-badge">
                  {Object.values(groupUnreadCounts).reduce((sum, c) => sum + (Number(c) || 0), 0)}
                </span>
              )}
            </button>
          </div>
          
          <div className="chat-search">
            <input 
              type="text" 
              placeholder={activeTab === 'chats' ? "Search users..." : "Search groups..."}
              className="chat-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="chat-users-list">
            {activeTab === 'chats' ? (
              sidebarUsers.length === 0 ? (
                <div className="chat-empty-state">
                  <p>No users available</p>
                </div>
              ) : (
                sidebarUsers.map((item) => (
                  <div
                    key={item.userId}
                    className={`chat-user-item ${selectedUser?.id === item.userId ? 'active' : ''}`}
                    onClick={async () => {
                      if (item.unreadCount > 0) {
                        setUnreadCounts(prev => ({ ...prev, [item.userId]: 0 }));
                        setConversations(prev => 
                          prev.map(conv => 
                            conv.userId === item.userId ? { ...conv, unreadCount: 0 } : conv
                          )
                        );
                        try {
                          await chatAPI.markAsRead(item.userId);
                          fetchUnreadMessageCount();
                          fetchNotifications();
                        } catch (err) {
                          console.error('Failed to mark messages as read:', err);
                        }
                      }
                      setSelectedUser({
                        id: item.userId,
                        name: item.userName,
                        email: item.userEmail,
                        profileImage: item.profileImage
                      });
                      setSelectedGroup(null);
                      if (window.innerWidth <= 768) {
                        setShowMobileSidebar(false);
                      }
                    }}
                  >
                    <div className="chat-user-avatar">
                      <img 
                        src={getAvatarUrl(item.userName, item.profileImage)} 
                        alt={item.userName} 
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName || 'User')}&background=4F46E5&color=fff&size=40`;
                        }}
                      />
                      {onlineUsers.has(item.userId) && (
                        <span className="online-indicator"></span>
                      )}
                    </div>
                    <div className="chat-user-info">
                      <h4 className={`chat-user-name ${item.unreadCount > 0 ? 'unread' : ''}`}>
                        {item.userName}
                      </h4>
                      {typingUsers.has(item.userId) ? (
                        <span className="typing-indicator">typing...</span>
                      ) : item.lastMessage ? (
                        <p className={`last-message ${item.unreadCount > 0 ? 'unread' : ''}`}>
                          {renderSidebarSnippet(item.lastMessage, item.lastMessageType, item.lastFileName)}
                        </p>
                      ) : (
                        <p className="user-email">{item.userEmail}</p>
                      )}
                    </div>
                    {item.unreadCount > 0 && (
                      <span className="unread-badge">{item.unreadCount}</span>
                    )}
                  </div>
                ))
              )
            ) : (
              groups.length === 0 ? (
                <div className="chat-empty-state">
                  <p>No groups yet</p>
                  <button
                    className="create-group-link"
                    onClick={() => setShowCreateGroupModal(true)}
                  >
                    Create your first group
                  </button>
                </div>
              ) : (
                groups.map((group) => {
                  const unreadCount = groupUnreadCounts[group._id] || 0;
                  const senderName = group.lastMessage?.senderId?.name || 'Someone';
                  const gMsg = group.lastMessage?.message || '';
                  const gType = group.lastMessage?.messageType || '';
                  const gFile = group.lastMessage?.fileName || '';

                  return (
                    <div
                      key={group._id}
                      className={`chat-user-item ${selectedGroup?._id === group._id ? 'active' : ''}`}
                      onClick={async () => {
                        if (unreadCount > 0) {
                          setGroupUnreadCounts(prev => ({ ...prev, [group._id]: 0 }));
                          try {
                            await groupAPI.markAsRead(group._id);
                            fetchUnreadMessageCount();
                            fetchNotifications();
                          } catch (err) {
                            console.error('Failed to mark group messages as read:', err);
                          }
                        }
                        setSelectedGroup(group);
                        setSelectedUser(null);
                        if (window.innerWidth <= 768) {
                          setShowMobileSidebar(false);
                        }
                      }}
                    >
                      <div className="chat-user-avatar group-avatar">
                        <img src={group.avatar || getAvatarUrl(group.name)} alt={group.name} />
                        <span className="group-indicator">👥</span>
                      </div>
                      <div className="chat-user-info">
                        <h4 className={`chat-user-name ${unreadCount > 0 ? 'unread' : ''}`}>
                          {group.name}
                        </h4>
                        {group.lastMessage ? (
                          <p className={`last-message ${unreadCount > 0 ? 'unread' : ''}`}>
                            <span className="last-message-sender">{senderName}: </span>
                            <span>{renderSidebarSnippet(gMsg, gType, gFile)}</span>
                          </p>
                        ) : (
                          <p className="user-email">{group.members?.length || 0} members</p>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-main">
          {selectedUser || selectedGroup ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-user">
                  <button
                    className="chat-back-btn"
                    onClick={() => setShowMobileSidebar(true)}
                    title="Back to conversations"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                    </svg>
                  </button>
                  <div className={`chat-header-avatar ${selectedGroup ? 'group-avatar' : ''}`}>
                    <img 
                      src={selectedUser ? getAvatarUrl(selectedUser.name, selectedUser.profileImage) : (selectedGroup?.avatar || getAvatarUrl(selectedGroup?.name))} 
                      alt={selectedUser ? selectedUser.name : selectedGroup?.name} 
                      style={{ objectFit: 'cover' }}
                    />
                    {selectedUser && onlineUsers.has(selectedUser.id) && (
                      <span className="online-indicator"></span>
                    )}
                  </div>
                  <div className="chat-header-info">
                    <h3 className="chat-header-name">{selectedUser ? selectedUser.name : selectedGroup?.name}</h3>
                    <span className={`chat-header-status ${selectedUser && onlineUsers.has(selectedUser.id) ? 'online' : ''}`}>
                      {selectedUser ? (
                        typingUsers.has(selectedUser.id)
                          ? 'typing...'
                          : onlineUsers.has(selectedUser.id)
                            ? 'online'
                            : 'offline'
                      ) : (
                        `${selectedGroup?.members?.length || 0} members`
                      )}
                    </span>
                  </div>
                </div>

                {selectedGroup && (
                  <button 
                    className="members-btn"
                    onClick={() => setShowMembersModal(true)}
                    title="View members"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                    Members
                  </button>
                )}
              </div>

              {/* Messages Area */}
              <div className="chat-messages">
                {loading ? (
                  <div className="chat-loading">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-conversation">
                    <div className="empty-state-icon">💬</div>
                    <p>No messages yet</p>
                    <span>Start a conversation with {selectedUser ? selectedUser.name : selectedGroup?.name}</span>
                  </div>
                ) : (
                  Object.entries(messageGroups).map(([date, msgs]) => (
                    <div key={date} className="message-group">
                      <div className="date-divider">
                        <span>{date}</span>
                      </div>
                      {msgs.map((msg, index) => {
                        const isSentByMe = String(msg.senderId) === String(currentUserId);
                        const isFirstInGroup = index === 0 || msgs[index - 1].senderId !== msg.senderId;
                        
                        return (
                          <div
                            key={msg.id || index}
                            className={`message-bubble ${isSentByMe ? 'sent' : 'received'} ${isFirstInGroup ? 'first' : ''}`}
                          >
                            <div className="message-content">
                              {!isSentByMe && selectedGroup && (
                                <span className="message-sender">{msg.senderName}</span>
                              )}
                              {renderMessageContent(msg)}
                              <div className="message-meta">
                                <span className="message-time">
                                  {formatTime(msg.timestamp)}
                                </span>
                                {isSentByMe && (
                                  <span className={`message-status ${msg.read ? 'read' : 'sent'}`}>
                                    {msg.read ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Upload Progress Bar */}
              {uploadingFile && (
                <div className="chat-upload-progress-container">
                  <div className="upload-progress-info">
                    <span className="uploading-spinner">⏳</span>
                    <span className="upload-filename">Uploading {uploadFileName || 'file'}...</span>
                    <span className="upload-percent">{uploadProgress !== null ? `${uploadProgress}%` : 'Please wait...'}</span>
                  </div>
                  <div className="upload-progress-bar-track">
                    <div 
                      className="upload-progress-bar-fill"
                      style={{ width: `${uploadProgress || 15}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Message Input & Composer */}
              <div className="chat-input-wrapper">
                {/* Voice Recording Bar (Active Recording / Preview) */}
                {isRecording || recordedAudioBlob ? (
                  <div className="chat-voice-recorder-bar">
                    {recordedAudioBlob ? (
                      /* Preview Mode */
                      <div className="voice-preview-mode">
                        <audio 
                          ref={previewAudioRef} 
                          src={recordedAudioUrl} 
                          onEnded={() => setRecordingPreviewPlaying(false)}
                        />
                        <button 
                          type="button" 
                          className="voice-btn-cancel" 
                          onClick={cancelVoiceRecording}
                          title="Discard Recording"
                        >
                          🗑️
                        </button>
                        <button 
                          type="button" 
                          className="voice-btn-play-preview" 
                          onClick={toggleRecordingPreview}
                          title={recordingPreviewPlaying ? 'Pause Preview' : 'Play Preview'}
                        >
                          {recordingPreviewPlaying ? '⏸️' : '▶️'}
                        </button>
                        <span className="voice-preview-duration">Voice Note ({formatDuration(recordingSeconds)})</span>
                        <button 
                          type="button" 
                          className="voice-btn-send" 
                          onClick={sendVoiceRecording}
                          title="Send Voice Message"
                        >
                          🚀 Send
                        </button>
                      </div>
                    ) : (
                      /* Live Recording Mode */
                      <div className="voice-recording-mode">
                        <div className="voice-recording-dot"></div>
                        <span className="voice-recording-timer">{formatDuration(recordingSeconds)}</span>
                        <div className="voice-live-waves">
                          <span /><span /><span /><span /><span />
                        </div>
                        <button 
                          type="button" 
                          className="voice-btn-cancel" 
                          onClick={cancelVoiceRecording}
                          title="Cancel Recording"
                        >
                          ❌ Cancel
                        </button>
                        <button 
                          type="button" 
                          className="voice-btn-stop" 
                          onClick={stopVoiceRecording}
                          title="Stop and Preview"
                        >
                          ⏹️ Stop
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard Chat Input Form */
                  <form className="chat-input-area" onSubmit={handleSendMessage}>
                    <div className="chat-input-container">
                      {/* Emoji Picker Popover */}
                      {showEmojiPicker && (
                        <div className="emoji-picker" ref={emojiPickerRef}>
                          <div className="emoji-list">
                            {['😀', '😂', '🥰', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '😊', '😉', '🤗', '😴', '😭', '😡', '👋', '🙏', '💪', '🤝', '🎂', '🎁', '⚡', '⭐', '✅', '❌'].map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                className="emoji-item"
                                onClick={() => handleEmojiClick(emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attachment Popover Menu */}
                      {showAttachMenu && (
                        <div className="attachment-menu-popover" ref={attachMenuRef}>
                          <div className="attachment-menu-header">
                            <span>Share Media & Files</span>
                          </div>
                          <div className="attachment-menu-grid">
                            <button
                              type="button"
                              className="attachment-menu-item item-image"
                              onClick={() => imageInputRef.current?.click()}
                            >
                              <div className="attach-icon-circle">📷</div>
                              <span>Image</span>
                            </button>
                            <button
                              type="button"
                              className="attachment-menu-item item-video"
                              onClick={() => videoInputRef.current?.click()}
                            >
                              <div className="attach-icon-circle">🎥</div>
                              <span>Video</span>
                            </button>
                            <button
                              type="button"
                              className="attachment-menu-item item-audio"
                              onClick={() => audioInputRef.current?.click()}
                            >
                              <div className="attach-icon-circle">🎵</div>
                              <span>Audio</span>
                            </button>
                            <button
                              type="button"
                              className="attachment-menu-item item-voice"
                              onClick={startVoiceRecording}
                            >
                              <div className="attach-icon-circle">🎤</div>
                              <span>Voice Note</span>
                            </button>
                            <button
                              type="button"
                              className="attachment-menu-item item-pdf"
                              onClick={() => pdfInputRef.current?.click()}
                            >
                              <div className="attach-icon-circle">📄</div>
                              <span>PDF</span>
                            </button>
                            <button
                              type="button"
                              className="attachment-menu-item item-doc"
                              onClick={() => documentInputRef.current?.click()}
                            >
                              <div className="attach-icon-circle">📁</div>
                              <span>Document</span>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Emoji Trigger Button */}
                      <button 
                        type="button" 
                        className="chat-emoji-btn" 
                        title="Add emoji"
                        onClick={() => {
                          setShowEmojiPicker(!showEmojiPicker);
                          setShowAttachMenu(false);
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                        </svg>
                      </button>
                      
                      {/* Attachment Trigger Button (📎) */}
                      <button 
                        type="button" 
                        className={`chat-attachment-btn ${showAttachMenu ? 'active' : ''}`}
                        title="Attach Media or File"
                        onClick={() => {
                          setShowAttachMenu(!showAttachMenu);
                          setShowEmojiPicker(false);
                        }}
                        disabled={uploadingFile}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                        </svg>
                      </button>
                      
                      {/* Text Input */}
                      <input
                        type="text"
                        placeholder={selectedGroup ? `Message ${selectedGroup.name}...` : "Type a message..."}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        className="chat-input"
                      />

                      {/* Quick Mic Button (if input is empty) */}
                      {!newMessage.trim() && (
                        <button
                          type="button"
                          className="chat-mic-quick-btn"
                          title="Record Voice Note"
                          onClick={startVoiceRecording}
                        >
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                          </svg>
                        </button>
                      )}

                      {/* Send Button */}
                      <button 
                        type="submit" 
                        className="chat-send-btn"
                        disabled={!newMessage.trim()}
                        title="Send Message"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="chat-no-selection">
              <div className="no-selection-content">
                <div className="no-selection-icon">💬</div>
                <h3>Select a chat to start messaging</h3>
                <p>Choose from your contacts or groups on the left to send text, photos, videos, voice notes, PDFs and documents.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={(newGroup) => {
          setGroups(prev => [newGroup, ...prev]);
          setActiveTab('groups');
          setSelectedGroup(newGroup);
        }}
        currentUserId={currentUserId}
      />

      {/* Group Members Modal */}
      <GroupMembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        group={selectedGroup}
        currentUserId={currentUserId}
        availableUsers={users}
        onGroupUpdated={(groupId, updates) => {
          setGroups(prev => prev.map(g => g._id === groupId ? { ...g, ...updates } : g));
          if (selectedGroup?._id === groupId) {
            setSelectedGroup(prev => ({ ...prev, ...updates }));
          }
        }}
        onMemberRemoved={(groupId, memberId) => {
          if (String(memberId) === String(currentUserId)) {
            if (selectedGroup?._id === groupId) {
              setSelectedGroup(null);
              setMessages([]);
            }
            setGroups(prev => prev.filter(g => g._id !== groupId));
          } else {
            setGroups(prev => prev.map(g => {
              if (g._id === groupId) {
                return { ...g, members: g.members.filter(m => String(m.userId) !== String(memberId)) };
              }
              return g;
            }));
            if (selectedGroup?._id === groupId) {
              setSelectedGroup(prev => ({
                ...prev,
                members: prev.members.filter(m => String(m.userId) !== String(memberId))
              }));
            }
          }
        }}
        onAdminUpdated={(groupId, memberId, newRole) => {
          setGroups(prev => prev.map(g => {
            if (g._id === groupId) {
              return {
                ...g,
                members: g.members.map(m => String(m.userId) === String(memberId) ? { ...m, role: newRole } : m)
              };
            }
            return g;
          }));
          if (selectedGroup?._id === groupId) {
            setSelectedGroup(prev => ({
              ...prev,
              members: prev.members.map(m => String(m.userId) === String(memberId) ? { ...m, role: newRole } : m)
            }));
          }
        }}
      />

      {/* 1. Image Lightbox Modal */}
      {previewImage && (
        <div className="media-modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="media-modal-content" onClick={e => e.stopPropagation()}>
            <button className="media-modal-close" onClick={() => setPreviewImage(null)} title="Close Preview">✕</button>
            <img src={previewImage} alt="Preview" className="media-modal-img" />
            <div className="media-modal-actions">
              <a href={previewImage} target="_blank" rel="noopener noreferrer" className="media-modal-download-btn" download>
                📥 Download Full Size
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. PDF Preview Modal */}
      {previewPdf && (
        <div className="media-modal-overlay" onClick={() => setPreviewPdf(null)}>
          <div className="media-modal-pdf-content" onClick={e => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <span className="pdf-modal-title">📄 {previewPdf.name}</span>
              <div className="pdf-modal-header-actions">
                <a href={previewPdf.url} download={previewPdf.name} target="_blank" rel="noopener noreferrer" className="pdf-modal-dl-btn">
                  📥 Download
                </a>
                <button className="media-modal-close" onClick={() => setPreviewPdf(null)} title="Close PDF">✕</button>
              </div>
            </div>
            <iframe 
              src={`${previewPdf.url}#toolbar=1`} 
              title={previewPdf.name} 
              className="pdf-modal-iframe"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Chat;
