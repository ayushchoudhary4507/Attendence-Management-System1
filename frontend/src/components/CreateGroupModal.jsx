import React, { useState, useEffect } from 'react';
import { groupAPI, chatAPI } from '../services/api';
import './CreateGroupModal.css';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated, currentUserId }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [error, setError] = useState('');

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      // Auto-select current user as member
      setSelectedMembers(new Set([currentUserId]));
    }
  }, [isOpen, currentUserId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setDescription('');
      setSelectedMembers(new Set());
      setSearchQuery('');
      setError('');
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setFetchingUsers(true);
      const response = await chatAPI.getUsers();
      if (response.success && response.users) {
        // Filter out current user from the list (already auto-selected)
        const filteredUsers = response.users.filter(u => u.id !== currentUserId);
        setUsers(filteredUsers);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleToggleMember = (userId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedMembers.size < 2) {
      setError('At least 2 members are required (including you)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const memberIds = Array.from(selectedMembers);
      const response = await groupAPI.createGroup(
        groupName.trim(),
        description.trim(),
        memberIds
      );

      if (response.success) {
        onGroupCreated(response.group);
        onClose();
      } else {
        setError(response.message || 'Failed to create group');
      }
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAvatarUrl = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=4F46E5&color=fff&size=40`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Group</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleCreateGroup}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Group Name *</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                maxLength={50}
                disabled={loading}
              />
              <span className="char-count">{groupName.length}/50</span>
            </div>

            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description..."
                maxLength={200}
                rows={2}
                disabled={loading}
              />
              <span className="char-count">{description.length}/200</span>
            </div>

            <div className="form-group">
              <label>Select Members *</label>
              <div className="selected-count">
                {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
              </div>

              <div className="member-search">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  disabled={loading}
                />
              </div>

              <div className="members-list">
                {fetchingUsers ? (
                  <div className="loading-users">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="no-users">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`member-item ${selectedMembers.has(user.id) ? 'selected' : ''}`}
                      onClick={() => handleToggleMember(user.id)}
                    >
                      <div className="member-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(user.id)}
                          onChange={() => {}} // Handled by parent click
                        />
                      </div>
                      <img
                        src={getAvatarUrl(user.name)}
                        alt={user.name}
                        className="member-avatar"
                      />
                      <div className="member-info">
                        <span className="member-name">{user.name}</span>
                        <span className="member-email">{user.email}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-btn"
              disabled={loading || selectedMembers.size < 2 || !groupName.trim()}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
