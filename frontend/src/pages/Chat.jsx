import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { chatAPI, groupAPI } from '../services/api';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupMembersModal from '../components/GroupMembersModal';
import './Chat.css';

const SOCKET_URL = 'http://localhost:5005';

const Chat = ({ user }) => {
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const currentUserId = user?.id || user?._id;
  const currentUserName = user?.name || 'Current User';
  
  // Use refs to track selected user/group in socket handlers (avoid stale closures)
  const selectedUserRef = useRef(selectedUser);
  const selectedGroupRef = useRef(selectedGroup);
  selectedUserRef.current = selectedUser;
  selectedGroupRef.current = selectedGroup;

  // Fetch conversations (sorted by last message)
  const fetchConversations = useCallback(async () => {
    try {
      const response = await chatAPI.getConversations();
      if (response.success) {
        setConversations(response.conversations || []);
        // Update unread counts from conversations
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
          // Merge with existing groups to preserve optimistic updates
          const existingMap = new Map(prev.map(g => [String(g._id), g]));
          
          return response.groups.map(newGroup => {
            const existing = existingMap.get(String(newGroup._id));
            
            // If we have a newer optimistic lastMessage in state, keep it
            if (existing?.lastMessage?.timestamp && newGroup?.lastMessage?.timestamp) {
              const existingTime = new Date(existing.lastMessage.timestamp).getTime();
              const newTime = new Date(newGroup.lastMessage.timestamp).getTime();
              
              if (existingTime > newTime) {
                // Keep the optimistic update
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

    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      // Only close if socket was actually connected to avoid "closed before connection" error
      if (newSocket.connected) {
        newSocket.disconnect();
      } else {
        newSocket.off();
      }
    };
  }, [currentUserId]);

  // Join socket room and set up listeners
  useEffect(() => {
    if (!socket || !currentUserId) return;

    // Join with user ID
    socket.emit('join', currentUserId);

    // Handle incoming messages - use ref to get current selectedUser
    const handleReceiveMessage = (data) => {
      const currentSelected = selectedUserRef.current;
      const isFromSelectedUser = String(data.senderId) === String(currentSelected?.id);
      const isToSelectedUser = String(data.receiverId) === String(currentSelected?.id);
      const isForMe = String(data.receiverId) === String(currentUserId);
      const isFromMe = String(data.senderId) === String(currentUserId);
      
      // Add to current chat if it's part of the active conversation
      if (isFromSelectedUser || isToSelectedUser || (isForMe && currentSelected && String(data.senderId) === String(currentSelected.id))) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some(m => m.id === data.id || (m.tempId && m.tempId === data.tempId))) return prev;
          return [...prev, {
            id: data.id,
            tempId: data.tempId,
            senderId: data.senderId,
            senderName: data.senderName,
            receiverId: data.receiverId,
            message: data.message,
            timestamp: new Date(data.timestamp),
            read: true // Mark as read since chat is open
          }];
        });

        // Auto-mark as read since chat is open with this sender
        if (String(data.senderId) !== String(currentUserId)) {
          // Emit socket event to mark as read
          socket.emit('mark_read', { messageId: data.id, senderId: data.senderId });
          // Call API to persist read status
          chatAPI.markAsRead(data.senderId).catch(err => console.error('Failed to mark as read:', err));
        }
      }

      // Update unread count if not currently chatting with sender
      if (String(data.senderId) !== String(currentUserId) &&
          String(currentSelected?.id) !== String(data.senderId)) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }));
      }
      
      // Refresh conversations
      fetchConversations();
    };

    // Handle message sent confirmation
    const handleMessageSent = (data) => {
      setMessages((prev) => {
        // Update any temp message with real ID
        const hasTemp = prev.some(m => m.tempId === data.tempId || m.status === 'sending');
        if (hasTemp) {
          return prev.map(m => 
            (m.tempId === data.tempId || (m.status === 'sending' && m.receiverId === data.receiverId && m.message === data.message))
              ? { ...m, id: data.id, status: 'sent', tempId: undefined }
              : m
          );
        }
        
        // If no temp message, add the sent message (if not already exists)
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, {
          id: data.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          message: data.message,
          timestamp: new Date(data.timestamp),
          status: 'sent',
          read: false
        }];
      });
      
      fetchConversations();
    };

    // Handle online users list
    const handleOnlineUsers = (userIds) => {
      setOnlineUsers(new Set(userIds));
    };

    // Handle user status changes
    const handleUserStatus = (data) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (data.isOnline) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    // Handle typing indicators
    const handleTyping = (data) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        if (data.isTyping) {
          newMap.set(data.userId, true);
        } else {
          newMap.delete(data.userId);
        }
        return newMap;
      });
    };

    // Handle message read receipts
    const handleMessageRead = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, read: true, readAt: new Date(data.readAt) } : msg
        )
      );
    };

    // ==================== GROUP CHAT SOCKET HANDLERS ====================

    // Handle incoming group messages
    const handleReceiveGroupMessage = (data) => {
      console.log('📨 Group message received:', data);
      const currentSelectedGroup = selectedGroupRef.current;
      const isFromMe = String(data.senderId) === String(currentUserId);
      const isGroupOpen = currentSelectedGroup && String(data.groupId) === String(currentSelectedGroup._id);

      // Add to current chat if it's the active group
      if (isGroupOpen) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some(m => m.id === data.id || (m.tempId && m.tempId === data.tempId))) return prev;
          return [...prev, {
            id: data.id,
            tempId: data.tempId,
            groupId: data.groupId,
            senderId: data.senderId,
            senderName: data.senderName,
            message: data.message,
            timestamp: new Date(data.timestamp),
            read: true, // Mark as read since group chat is open
            isGroupMessage: true
          }];
        });

        // Auto-mark as read since group chat is open and message is from someone else
        if (!isFromMe) {
          socket.emit('group_message_read', { groupId: data.groupId, messageId: data.id, senderId: data.senderId });
          groupAPI.markAsRead(data.groupId).catch(err => console.error('Failed to mark group messages as read:', err));
        }
      } else {
        // Group is not open, increment unread count (if not from me)
        if (!isFromMe) {
          setGroupUnreadCounts(prev => ({
            ...prev,
            [data.groupId]: (prev[data.groupId] || 0) + 1
          }));
        }
      }

      // Update groups state immediately to show last message in sidebar
      const groupIdStr = String(data.groupId);
      console.log('🔄 Updating group last message for:', groupIdStr);
      setGroups(prev => {
        const updated = prev.map(g => {
          if (String(g._id) === groupIdStr) {
            console.log('✅ Found group to update:', g.name);
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
        });
        console.log('📊 Updated groups:', updated.map(g => ({ name: g.name, lastMsg: g.lastMessage?.message })));
        return updated;
      });
    };

    // Handle group message sent confirmation
    const handleGroupMessageSent = (data) => {
      console.log('📤 Group message sent confirmation:', data);
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
          timestamp: new Date(data.timestamp),
          status: 'sent',
          read: true,
          isGroupMessage: true
        }];
      });

      // Update sidebar immediately for sender
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

    // Handle group typing indicators
    const handleGroupTyping = (data) => {
      setGroupTypingUsers((prev) => {
        const newMap = new Map(prev);
        const key = `${data.groupId}:${data.userId}`;
        if (data.isTyping) {
          newMap.set(key, { userId: data.userId, groupId: data.groupId });
        } else {
          newMap.delete(key);
        }
        return newMap;
      });
    };

    // Handle group members update (add, remove, role change)
    const handleGroupMembersUpdated = (data) => {
      const { groupId, members } = data;
      
      // Update the groups list with new members
      setGroups(prev => prev.map(g => {
        if (g._id === groupId) {
          return { ...g, members };
        }
        return g;
      }));
      
      // Update selected group if it's the one being modified
      setSelectedGroup(prev => {
        if (prev && prev._id === groupId) {
          return { ...prev, members };
        }
        return prev;
      });
    };

    // Handle group name/avatar update
    const handleGroupUpdated = (data) => {
      const { groupId, name, avatar } = data;
      
      // Update the groups list
      setGroups(prev => prev.map(g => {
        if (g._id === groupId) {
          return { ...g, name, avatar };
        }
        return g;
      }));
      
      // Update selected group if it's the one being modified
      setSelectedGroup(prev => {
        if (prev && prev._id === groupId) {
          return { ...prev, name, avatar };
        }
        return prev;
      });
    };

    // Handle member removed from group
    const handleMemberRemoved = (data) => {
      const { groupId, memberId } = data;
      
      // If current user was removed, deselect the group and remove from list
      if (String(memberId) === String(currentUserId)) {
        if (selectedGroupRef.current?._id === groupId) {
          setSelectedGroup(null);
          setMessages([]);
        }
        setGroups(prev => prev.filter(g => g._id !== groupId));
      } else {
        // Update the groups list
        setGroups(prev => prev.map(g => {
          if (g._id === groupId) {
            return { ...g, members: g.members.filter(m => String(m.userId) !== String(memberId)) };
          }
          return g;
        }));
        
        // Update selected group if it's the one being modified
        setSelectedGroup(prev => {
          if (prev && prev._id === groupId) {
            return { ...prev, members: prev.members.filter(m => String(m.userId) !== String(memberId)) };
          }
          return prev;
        });
      }
    };

    // Handle admin update
    const handleAdminUpdated = (data) => {
      const { groupId, userId, members } = data;
      
      // Update the groups list with new members
      setGroups(prev => prev.map(g => {
        if (g._id === groupId) {
          return { ...g, members };
        }
        return g;
      }));
      
      // Update selected group if it's the one being modified
      setSelectedGroup(prev => {
        if (prev && prev._id === groupId) {
          return { ...prev, members };
        }
        return prev;
      });
    };

    // Handle group last message update for sidebar
    const handleGroupLastMessageUpdated = (data) => {
      console.log('🔔 RECEIVED group_last_message_updated:', data);
      const { groupId, lastMessage } = data;
      
      if (!groupId || !lastMessage) {
        console.error('❌ Invalid data received:', data);
        return;
      }
      
      setGroups(prev => {
        console.log('📊 Current groups:', prev.map(g => ({ id: g._id, name: g.name })));
        const updated = prev.map(g => {
          if (String(g._id) === String(groupId)) {
            console.log('✅ Updating sidebar for group:', g.name, 'with lastMessage:', lastMessage);
            return {
              ...g,
              lastMessage: lastMessage
            };
          }
          return g;
        });
        console.log('📊 Updated groups:', updated.map(g => ({ id: g._id, name: g.name, lastMsg: g.lastMessage?.message?.substring(0, 20) })));
        return updated;
      });
    };

    // Register listeners
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('online_users', handleOnlineUsers);
    socket.on('user_status', handleUserStatus);
    socket.on('typing', handleTyping);
    socket.on('message_read', handleMessageRead);
    socket.on('receive_group_message', handleReceiveGroupMessage);
    socket.on('group_message_sent', handleGroupMessageSent);
    socket.on('group_last_message_updated', handleGroupLastMessageUpdated);
    socket.on('group_typing', handleGroupTyping);
    socket.on('group_members_updated', handleGroupMembersUpdated);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('member_removed', handleMemberRemoved);
    socket.on('admin_updated', handleAdminUpdated);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('online_users', handleOnlineUsers);
      socket.off('user_status', handleUserStatus);
      socket.off('typing', handleTyping);
      socket.off('message_read', handleMessageRead);
      socket.off('receive_group_message', handleReceiveGroupMessage);
      socket.off('group_message_sent', handleGroupMessageSent);
      socket.off('group_last_message_updated', handleGroupLastMessageUpdated);
      socket.off('group_typing', handleGroupTyping);
      socket.off('group_members_updated', handleGroupMembersUpdated);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('member_removed', handleMemberRemoved);
      socket.off('admin_updated', handleAdminUpdated);
    };
  }, [socket, currentUserId, fetchConversations, fetchGroups]);

  // Fetch users, conversations and groups on mount
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

        // Fetch group unread counts
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


  // Fetch messages when selecting a user
  useEffect(() => {
    if (!selectedUser) return;
    
    // Clear selected group when selecting a user
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

          // Mark unread messages as read via socket
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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedUser?.id]);

  // Fetch messages when selecting a group
  useEffect(() => {
    if (!selectedGroup) return;
    
    // Clear selected user when selecting a group
    setSelectedUser(null);
    
    // Join socket room for this group
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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGroupMessages();

    return () => {
      isMounted = false;
      // Leave group room when switching
      if (socket && socket.connected && selectedGroup) {
        socket.emit('leave_group', selectedGroup._id);
      }
    };
  }, [selectedGroup?._id, socket]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message (handles both direct and group messages)
  // Handle emoji selection
  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Max 10MB allowed.');
      return;
    }

    try {
      setUploadingFile(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('senderId', currentUserId);
      formData.append('senderName', currentUserName);
      
      if (selectedUser) {
        formData.append('receiverId', selectedUser.id);
      } else if (selectedGroup) {
        formData.append('groupId', selectedGroup._id);
      }

      // Upload file
      const response = await chatAPI.uploadFile(formData);
      
      if (response.success) {
        // Add file message to UI
        const fileMessage = {
          id: response.data.id || Date.now(),
          senderId: currentUserId,
          senderName: currentUserName,
          message: `📎 ${file.name}`,
          fileUrl: response.data.fileUrl,
          fileName: file.name,
          fileType: file.type,
          timestamp: new Date(),
          messageType: 'file'
        };

        if (selectedGroup) {
          // Send via socket for group
          socket.emit('send_group_message', {
            ...fileMessage,
            groupId: selectedGroup._id,
            tempId: Date.now()
          });
        } else if (selectedUser) {
          // Send via socket for direct message
          socket.emit('send_message', {
            ...fileMessage,
            receiverId: selectedUser.id,
            tempId: Date.now()
          });
        }

        setMessages(prev => [...prev, { ...fileMessage, status: 'sent' }]);
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || (!selectedUser && !selectedGroup) || !currentUserId) return;

    const tempId = `temp-${Date.now()}`;
    const messageText = newMessage.trim();

    // Handle group message
    if (selectedGroup) {
      // Create optimistic group message with tempId
      const optimisticMessage = {
        id: tempId,
        tempId: tempId,
        groupId: selectedGroup._id,
        senderId: currentUserId,
        senderName: currentUserName,
        message: messageText,
        timestamp: new Date(),
        read: true,
        status: 'sending',
        isGroupMessage: true
      };

      // Add to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      try {
        // Save to database
        const response = await groupAPI.sendGroupMessage(selectedGroup._id, messageText);
        
        if (response.success && response.data) {
          const serverMessage = response.data;
          
          // Update message with real ID from server
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
          
          // Update sidebar immediately for sender (optimistic update)
          console.log('🔄 Optimistic sidebar update for group:', selectedGroup._id, selectedGroup.name);
          console.log('🆔 selectedGroup._id type:', typeof selectedGroup._id, 'value:', selectedGroup._id);
          console.log('👤 currentUserId:', currentUserId, 'currentUserName:', currentUserName);
          const newLastMessage = {
            message: messageText,
            senderId: { name: currentUserName },
            timestamp: new Date()
          };
          console.log('📝 New lastMessage:', newLastMessage);
          
          setGroups(prev => {
            console.log('📋 Current groups count:', prev.length);
            const updated = prev.map(g => {
              const groupIdStr = String(g._id);
              const selectedIdStr = String(selectedGroup._id);
              console.log('🔍 Comparing:', groupIdStr, '===', selectedIdStr, '?', groupIdStr === selectedIdStr);
              if (groupIdStr === selectedIdStr) {
                console.log('✏️ Updating group lastMessage locally:', g.name);
                return {
                  ...g,
                  lastMessage: newLastMessage
                };
              }
              return g;
            });
            console.log('📊 Updated groups for sidebar:', updated.map(g => ({ 
              id: g._id,
              name: g.name, 
              lastMsg: g.lastMessage?.message?.substring(0, 20),
              sender: g.lastMessage?.senderId?.name 
            })));
            // Force new array reference
            return [...updated];
          });
          
          // Emit via socket for real-time delivery to all group members
          if (socket && socket.connected) {
            socket.emit('send_group_message', {
              id: serverMessage.id || serverMessage._id,
              tempId: tempId,
              groupId: selectedGroup._id,
              senderId: currentUserId,
              senderName: currentUserName,
              message: messageText,
              timestamp: serverMessage.timestamp,
              messageType: 'text'
            });
          }
          
          // Refresh groups from API after a longer delay to ensure DB is updated
          setTimeout(fetchGroups, 1500);
        }
      } catch (err) {
        console.error('Failed to send group message:', err);
        // Mark as failed
        setMessages(prev => 
          prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' } : m)
        );
      }
      return;
    }

    // Handle direct message (existing logic)
    if (selectedUser) {
      const optimisticMessage = {
        id: tempId,
        tempId: tempId,
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: selectedUser.id,
        message: messageText,
        timestamp: new Date(),
        read: false,
        status: 'sending'
      };

      // Add to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      try {
        // Save to database
        const response = await chatAPI.sendMessage(selectedUser.id, messageText);
        
        if (response.success && response.data) {
          const serverMessage = response.data;
          
          // Update message with real ID from server
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
          
          // Emit via socket for real-time delivery to receiver
          if (socket && socket.connected) {
            socket.emit('send_message', {
              id: serverMessage.id,
              tempId: tempId,
              senderId: currentUserId,
              senderName: currentUserName,
              receiverId: selectedUser.id,
              message: messageText,
              timestamp: serverMessage.timestamp
            });
          }
          
          // Refresh conversations
          fetchConversations();
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        // Mark as failed
        setMessages(prev => 
          prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' } : m)
        );
      }
    }
  };

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!socket || !socket.connected) return;

    if (selectedUser) {
      socket.emit('typing', {
        receiverId: selectedUser.id,
        isTyping: true
      });
    } else if (selectedGroup) {
      socket.emit('group_typing', {
        groupId: selectedGroup._id,
        isTyping: true
      });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedUser) {
        socket.emit('typing', {
          receiverId: selectedUser.id,
          isTyping: false
        });
      } else if (selectedGroup) {
        socket.emit('group_typing', {
          groupId: selectedGroup._id,
          isTyping: false
        });
      }
    }, 3000);
  }, [socket, selectedUser, selectedGroup]);

  // Format timestamp
  const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const formatDate = (date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (today.toDateString() === messageDate.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.toDateString() === messageDate.toDateString()) {
      return 'Yesterday';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(messageDate);
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach((msg) => {
      const dateKey = formatDate(msg.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  // Get user avatar URL
  const getAvatarUrl = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=4F46E5&color=fff&size=40`;
  };

  // Get last seen text
  const getLastSeenText = (userId) => {
    if (onlineUsers.has(userId)) {
      return 'online';
    }
    return 'offline';
  };

  // Check if user is typing
  const isTyping = (userId) => {
    return typingUsers.has(userId);
  };

  // Check if group member is typing
  const isGroupTyping = () => {
    if (!selectedGroup) return false;
    const typingInGroup = Array.from(groupTypingUsers.values()).filter(
      t => t.groupId === selectedGroup._id && t.userId !== currentUserId
    );
    return typingInGroup.length > 0;
  };

  // Get typing users in group
  const getGroupTypingUsers = () => {
    if (!selectedGroup) return [];
    return Array.from(groupTypingUsers.values())
      .filter(t => t.groupId === selectedGroup._id && t.userId !== currentUserId)
      .map(t => {
        const member = selectedGroup.members?.find(m => m.userId._id === t.userId || m.userId.id === t.userId);
        return member?.userId?.name || 'Someone';
      });
  };

  // Build sidebar users sorted by latest message (from conversations)
  const getSidebarUsers = () => {
    // Create a map of all users
    const userMap = new Map(users.map(u => [u.id, u]));
    
    // Start with users who have conversations (already sorted by last message)
    const sidebarItems = conversations.map(conv => ({
      userId: conv.userId,
      userName: conv.userName,
      userEmail: conv.userEmail,
      unreadCount: conv.unreadCount || 0,
      lastMessageTime: conv.lastMessage?.timestamp,
      lastMessage: conv.lastMessage?.message || '',
      hasConversation: true
    }));
    
    // Add users without conversations at the end
    const conversationUserIds = new Set(conversations.map(c => c.userId));
    users.forEach(user => {
      if (!conversationUserIds.has(user.id)) {
        sidebarItems.push({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          unreadCount: unreadCounts[user.id] || 0,
          lastMessageTime: null,
          lastMessage: '',
          hasConversation: false
        });
      }
    });
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return sidebarItems.filter(item => 
        item.userName.toLowerCase().includes(query) ||
        item.userEmail.toLowerCase().includes(query)
      );
    }
    
    return sidebarItems;
  };

  const sidebarUsers = getSidebarUsers();

  return (
    <>
      <div className="chat-container">
        {/* Sidebar - User List & Groups */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h2>Messages</h2>
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
          
          {/* Tabs */}
          <div className="chat-tabs">
            <button 
              className={`chat-tab ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              Chats
              {sidebarUsers.some(u => u.unreadCount > 0) && (
                <span className="tab-badge"></span>
              )}
            </button>
            <button 
              className={`chat-tab ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              Groups
              {groups.length > 0 && (
                <span className="tab-badge">{groups.length}</span>
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
                      // Immediately clear notification badge from UI
                      if (item.unreadCount > 0) {
                        setUnreadCounts(prev => ({ ...prev, [item.userId]: 0 }));
                        // Update conversations to remove unread count
                        setConversations(prev => 
                          prev.map(conv => 
                            conv.userId === item.userId 
                              ? { ...conv, unreadCount: 0 }
                              : conv
                          )
                        );
                        // Call API to mark messages as read
                        try {
                          await chatAPI.markAsRead(item.userId);
                          console.log('✅ Messages marked as read for user:', item.userId);
                        } catch (err) {
                          console.error('Failed to mark messages as read:', err);
                        }
                      }
                      setSelectedUser({
                        id: item.userId,
                        name: item.userName,
                        email: item.userEmail
                      });
                    }}
                  >
                    <div className="chat-user-avatar">
                      <img src={getAvatarUrl(item.userName)} alt={item.userName} />
                      {onlineUsers.has(item.userId) && (
                        <span className="online-indicator"></span>
                      )}
                    </div>
                    <div className="chat-user-info">
                      <h4 className={`chat-user-name ${item.unreadCount > 0 ? 'unread' : ''}`}>
                        {item.userName}
                      </h4>
                      {isTyping(item.userId) ? (
                        <span className="typing-indicator">typing...</span>
                      ) : item.lastMessage ? (
                        <p className={`last-message ${item.unreadCount > 0 ? 'unread' : ''}`}>
                          {item.lastMessage.length > 35
                            ? item.lastMessage.substring(0, 35) + '...'
                            : item.lastMessage}
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
              // Groups Tab
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
                  // Debug logging for sidebar
                  if (group.lastMessage) {
                    console.log('📋 Sidebar rendering group:', group.name, 'lastMessage:', group.lastMessage.message?.substring(0, 20));
                  }
                  return (
                    <div
                      key={group._id}
                      className={`chat-user-item ${selectedGroup?._id === group._id ? 'active' : ''}`}
                      onClick={async () => {
                        // Immediately clear notification badge from UI
                        if (unreadCount > 0) {
                          setGroupUnreadCounts(prev => ({ ...prev, [group._id]: 0 }));
                          // Call API to mark messages as read
                          try {
                            await groupAPI.markAsRead(group._id);
                            console.log('✅ Group messages marked as read for:', group._id);
                          } catch (err) {
                            console.error('Failed to mark group messages as read:', err);
                          }
                        }
                        setSelectedGroup(group);
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
                            <span className="last-message-sender">
                              {group.lastMessage.senderId?.name || 'Someone'}:
                            </span>
                            {group.lastMessage.message?.length > 25
                              ? group.lastMessage.message.substring(0, 25) + '...'
                              : group.lastMessage.message}
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
          {selectedUser ? (
            <>
              {/* Chat Header - Direct Message */}
              <div className="chat-header">
                <div className="chat-header-user">
                  <div className="chat-header-avatar">
                    <img src={getAvatarUrl(selectedUser.name)} alt={selectedUser.name} />
                    {onlineUsers.has(selectedUser.id) && (
                      <span className="online-indicator"></span>
                    )}
                  </div>
                  <div className="chat-header-info">
                    <h3 className="chat-header-name">{selectedUser.name}</h3>
                    <span className={`chat-header-status ${getLastSeenText(selectedUser.id)}`}>
                      {isTyping(selectedUser.id) 
                        ? 'typing...' 
                        : onlineUsers.has(selectedUser.id) 
                          ? 'online' 
                          : 'offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="chat-messages">
                {loading ? (
                  <div className="chat-loading">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-conversation">
                    <div className="empty-state-icon">💬</div>
                    <p>No messages yet</p>
                    <span>Start a conversation with {selectedUser.name}</span>
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
                              {!isSentByMe && isFirstInGroup && (
                                <span className="message-sender">{msg.senderName}</span>
                              )}
                              <p className="message-text">{msg.message}</p>
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

              {/* Message Input */}
              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <div className="chat-input-container">
                  {/* Emoji Picker */}
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
                  
                  <button 
                    type="button" 
                    className="chat-emoji-btn" 
                    title="Add emoji"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                    </svg>
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                  />
                  <button 
                    type="button" 
                    className="chat-attachment-btn" 
                    title="Attach file"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <span className="uploading-spinner">⏳</span>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                      </svg>
                    )}
                  </button>
                  
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    className="chat-input"
                  />
                  <button 
                    type="submit" 
                    className="chat-send-btn"
                    disabled={!newMessage.trim()}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : selectedGroup ? (
            <>
              {/* Chat Header - Group */}
              <div className="chat-header">
                <div className="chat-header-user">
                  <div className="chat-header-avatar group-avatar">
                    <img src={selectedGroup.avatar || getAvatarUrl(selectedGroup.name)} alt={selectedGroup.name} />
                  </div>
                  <div className="chat-header-info">
                    <h3 className="chat-header-name">{selectedGroup.name}</h3>
                    <span className="chat-header-status group-status">
                      {isGroupTyping() 
                        ? `${getGroupTypingUsers().join(', ')} typing...`
                        : `${selectedGroup.members?.length || 0} members`}
                    </span>
                  </div>
                </div>
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
              </div>

              {/* Messages Area - Group */}
              <div className="chat-messages">
                {loading ? (
                  <div className="chat-loading">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-conversation">
                    <div className="empty-state-icon">👥</div>
                    <p>No messages yet</p>
                    <span>Start a conversation in {selectedGroup.name}</span>
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
                              {/* Show sender name for all received messages in groups */}
                              {!isSentByMe && (
                                <span className="message-sender">{msg.senderName}</span>
                              )}
                              <p className="message-text">{msg.message}</p>
                              <div className="message-meta">
                                <span className="message-time">
                                  {formatTime(msg.timestamp)}
                                </span>
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

              {/* Message Input - Group */}
              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <div className="chat-input-container">
                  {/* Emoji Picker */}
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
                  
                  <button 
                    type="button" 
                    className="chat-emoji-btn" 
                    title="Add emoji"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                    </svg>
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                  />
                  <button 
                    type="button" 
                    className="chat-attachment-btn" 
                    title="Attach file"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <span className="uploading-spinner">⏳</span>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                      </svg>
                    )}
                  </button>
                  
                  <input
                    type="text"
                    placeholder={`Message ${selectedGroup.name}...`}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    className="chat-input"
                  />
                  <button 
                    type="submit" 
                    className="chat-send-btn"
                    disabled={!newMessage.trim()}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="chat-no-selection">
              <div className="no-selection-content">
                <div className="no-selection-icon">💬</div>
                <h3>Select a chat to start messaging</h3>
                <p>Choose from your contacts or groups on the left</p>
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
          // Update group name in sidebar and chat header
          setGroups(prev => prev.map(g => 
            g._id === groupId ? { ...g, ...updates } : g
          ));
          if (selectedGroup?._id === groupId) {
            setSelectedGroup(prev => ({ ...prev, ...updates }));
          }
        }}
        onMemberRemoved={(groupId, memberId) => {
          // If current user was removed, deselect the group
          if (String(memberId) === String(currentUserId)) {
            if (selectedGroup?._id === groupId) {
              setSelectedGroup(null);
              setMessages([]);
            }
            // Remove from groups list
            setGroups(prev => prev.filter(g => g._id !== groupId));
          } else {
            // Update member count in groups list
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
          // Update admin status in groups list
          setGroups(prev => prev.map(g => {
            if (g._id === groupId) {
              return {
                ...g,
                members: g.members.map(m => 
                  String(m.userId) === String(memberId) ? { ...m, role: newRole } : m
                )
              };
            }
            return g;
          }));
          if (selectedGroup?._id === groupId) {
            setSelectedGroup(prev => ({
              ...prev,
              members: prev.members.map(m => 
                String(m.userId) === String(memberId) ? { ...m, role: newRole } : m
              )
            }));
          }
        }}
      />
    </>
  );
};

export default Chat;
