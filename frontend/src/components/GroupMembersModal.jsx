import React, { useState, useEffect } from 'react';
import { groupAPI } from '../services/api';
import './GroupMembersModal.css';

const GroupMembersModal = ({ isOpen, onClose, group, currentUserId, onGroupUpdated, onMemberRemoved, onAdminUpdated, availableUsers }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingMember, setUpdatingMember] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const isAdmin = group?.members?.find(m => String(m.userId) === String(currentUserId))?.role === 'admin';

  useEffect(() => {
    if (isOpen && group?._id) {
      fetchMembers();
    }
  }, [isOpen, group]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await groupAPI.getGroupMembers(group._id);
      console.log('Members response:', response);
      if (response.success) {
        setMembers(response.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError(err.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      setUpdatingMember(memberId);
      const response = await groupAPI.updateMemberRole(group._id, memberId, newRole);
      if (response.success) {
        setMembers(prev => prev.map(m => 
          String(m.userId) === String(memberId) ? { ...m, role: newRole } : m
        ));
        if (onAdminUpdated) onAdminUpdated(group._id, memberId, newRole);
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleMakeAdmin = async (memberId) => {
    try {
      setUpdatingMember(memberId);
      const response = await groupAPI.makeMemberAdmin(group._id, memberId);
      if (response.success) {
        setMembers(prev => prev.map(m => 
          String(m.userId) === String(memberId) ? { ...m, role: 'admin' } : m
        ));
        if (onAdminUpdated) onAdminUpdated(group._id, memberId, 'admin');
      }
    } catch (err) {
      console.error('Failed to make admin:', err);
      setError(err.response?.data?.message || 'Failed to make admin');
    } finally {
      setUpdatingMember(null);
    }
  };

  const confirmRemoveMember = (member) => {
    setMemberToRemove(member);
    setShowConfirmDialog(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      setUpdatingMember(memberToRemove.userId);
      const response = await groupAPI.removeGroupMember(group._id, memberToRemove.userId);
      if (response.success) {
        setMembers(prev => prev.filter(m => String(m.userId) !== String(memberToRemove.userId)));
        if (onMemberRemoved) onMemberRemoved(group._id, memberToRemove.userId);
        setShowConfirmDialog(false);
        setMemberToRemove(null);
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleChangeGroupName = async () => {
    if (!newGroupName.trim()) return;
    
    try {
      setIsUpdatingName(true);
      const response = await groupAPI.changeGroupName(group._id, newGroupName.trim());
      if (response.success) {
        if (onGroupUpdated) onGroupUpdated(group._id, { name: response.group.name, avatar: response.group.avatar });
        setIsEditingName(false);
        setNewGroupName('');
      }
    } catch (err) {
      console.error('Failed to change group name:', err);
      setError(err.response?.data?.message || 'Failed to change group name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const startEditingName = () => {
    setNewGroupName(group?.name || '');
    setIsEditingName(true);
  };

  const getAvatarUrl = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=4F46E5&color=fff&size=40`;
  };

  const handleAddMembers = async () => {
    if (selectedUsersToAdd.length === 0) return;
    
    try {
      setIsAddingMembers(true);
      const response = await groupAPI.addGroupMembers(group._id, selectedUsersToAdd);
      if (response.success) {
        setMembers(response.group.members);
        setSelectedUsersToAdd([]);
        setShowAddMember(false);
      }
    } catch (err) {
      console.error('Failed to add members:', err);
      setError(err.response?.data?.message || 'Failed to add members');
    } finally {
      setIsAddingMembers(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsersToAdd(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Filter out users who are already members
  const getAvailableUsersToAdd = () => {
    if (!availableUsers) return [];
    const memberIds = members.map(m => String(m.userId));
    return availableUsers.filter(u => !memberIds.includes(String(u._id || u.id)));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="members-modal" onClick={(e) => e.stopPropagation()}>
        <div className="members-modal-header">
          <div className="header-content">
            {isEditingName ? (
              <div className="edit-name-form">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  disabled={isUpdatingName}
                  autoFocus
                />
                <div className="edit-actions">
                  <button 
                    className="btn-save" 
                    onClick={handleChangeGroupName}
                    disabled={isUpdatingName || !newGroupName.trim()}
                  >
                    {isUpdatingName ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    className="btn-cancel" 
                    onClick={() => {
                      setIsEditingName(false);
                      setNewGroupName('');
                    }}
                    disabled={isUpdatingName}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="title-section">
                <h2>{group?.name}</h2>
                {isAdmin && (
                  <button className="btn-edit" onClick={startEditingName} title="Edit group name">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="members-modal-body">
          {loading ? (
            <div className="members-loading">Loading members...</div>
          ) : error ? (
            <div className="members-error">{error}</div>
          ) : (
            <div className="members-list">
              {members.map((member) => (
                <div key={member.userId} className="member-item">
                  <div className="member-avatar">
                    <img src={getAvatarUrl(member.name)} alt={member.name} />
                  </div>
                  <div className="member-info">
                    <div className="member-name-row">
                      <span className="member-name">{member.name}</span>
                      {member.role === 'admin' && (
                        <span className="admin-badge">Admin</span>
                      )}
                    </div>
                    <span className="member-email">{member.email}</span>
                  </div>
                  <div className="member-actions">
                    {isAdmin && String(member.userId) !== String(currentUserId) && (
                      updatingMember === member.userId ? (
                        <span className="updating-text">Updating...</span>
                      ) : (
                        <div className="admin-actions">
                          {member.role !== 'admin' && (
                            <>
                              <button
                                className="btn-make-admin"
                                onClick={() => handleMakeAdmin(member.userId)}
                                title="Make Admin"
                              >
                                Make Admin
                              </button>
                              <button
                                className="btn-remove"
                                onClick={() => confirmRemoveMember(member)}
                                title="Remove Member"
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                              </button>
                            </>
                          )}
                          {member.role === 'admin' && (
                            <button
                              className="btn-make-member"
                              onClick={() => handleRoleChange(member.userId, 'member')}
                              title="Make Member"
                            >
                              Make Member
                            </button>
                          )}
                        </div>
                      )
                    )}
                    {String(member.userId) === String(currentUserId) && (
                      <span className="you-badge">You</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="members-modal-footer">
          <span className="members-count">{members.length} members</span>
          <div className="footer-actions">
            {isAdmin && (
              <button 
                className="btn-add-member" 
                onClick={() => setShowAddMember(true)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Add Member
              </button>
            )}
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && memberToRemove && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <h3>Remove Member?</h3>
              <p>Are you sure you want to remove <strong>{memberToRemove.name}</strong> from the group?</p>
              <div className="confirm-actions">
                <button 
                  className="btn-cancel" 
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setMemberToRemove(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-confirm-remove" 
                  onClick={handleRemoveMember}
                  disabled={updatingMember === memberToRemove.userId}
                >
                  {updatingMember === memberToRemove.userId ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Member Dialog */}
        {showAddMember && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog add-member-dialog">
              <h3>Add Members</h3>
              <div className="available-users-list">
                {getAvailableUsersToAdd().length === 0 ? (
                  <p className="no-users">No users available to add</p>
                ) : (
                  getAvailableUsersToAdd().map(user => (
                    <div 
                      key={user._id || user.id} 
                      className={`user-to-add ${selectedUsersToAdd.includes(user._id || user.id) ? 'selected' : ''}`}
                      onClick={() => toggleUserSelection(user._id || user.id)}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedUsersToAdd.includes(user._id || user.id)}
                        onChange={() => {}}
                      />
                      <img src={getAvatarUrl(user.name)} alt={user.name} />
                      <div className="user-info">
                        <span className="user-name">{user.name}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="confirm-actions">
                <button 
                  className="btn-cancel" 
                  onClick={() => {
                    setShowAddMember(false);
                    setSelectedUsersToAdd([]);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-confirm-add" 
                  onClick={handleAddMembers}
                  disabled={selectedUsersToAdd.length === 0 || isAddingMembers}
                >
                  {isAddingMembers ? 'Adding...' : `Add ${selectedUsersToAdd.length} Member${selectedUsersToAdd.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMembersModal;
