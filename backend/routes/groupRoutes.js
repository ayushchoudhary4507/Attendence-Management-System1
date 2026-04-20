const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');
const { protect: auth } = require('../middleware/authMiddleware');

// @route   POST /api/groups/create
// @desc    Create a new group
// @access  Private
router.post('/create', auth, async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const createdBy = req.user.userId;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one member is required' });
    }

    // Validate all member IDs
    const validMembers = members.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validMembers.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid member IDs provided' });
    }

    // Check if all users exist and get their details
    const users = await User.find({ _id: { $in: validMembers } });
    if (users.length !== validMembers.length) {
      return res.status(400).json({ success: false, message: 'Some members do not exist' });
    }

    // Create a map of user details for quick lookup
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Ensure creator is in members list
    if (!validMembers.includes(createdBy)) {
      validMembers.push(createdBy);
      const creator = await User.findById(createdBy);
      if (creator && !userMap.has(createdBy.toString())) {
        userMap.set(createdBy.toString(), creator);
      }
    }

    // Create members array with details
    const membersArray = validMembers.map(userId => {
      const user = userMap.get(userId.toString());
      return {
        userId,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        role: userId.toString() === createdBy.toString() ? 'admin' : 'member',
        joinedAt: new Date()
      };
    });

    // Generate group avatar
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4F46E5&color=fff&size=128`;

    // Create group
    const group = new Group({
      name: name.trim(),
      description: description || '',
      avatar,
      members: membersArray,
      createdBy,
      lastMessage: null
    });

    await group.save();

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ success: false, message: 'Failed to create group', error: error.message });
  }
});

// @route   GET /api/groups
// @desc    Get all groups for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find all groups where user is a member
    const groups = await Group.find({ 'members.userId': userId })
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email')
      .populate('lastMessage.senderId', 'name')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch groups', error: error.message });
  }
});

// @route   GET /api/groups/unread-count
// @desc    Get unread message count for all groups
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find all groups where user is a member
    const groups = await Group.find({ 'members.userId': userId });
    const groupIds = groups.map(g => g._id.toString());

    // Count unread messages per group
    // A message is unread if the current user's ID is NOT in the readBy array
    const unreadCounts = await GroupMessage.aggregate([
      {
        $match: {
          groupId: { $in: groupIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $addFields: {
          isRead: {
            $in: [new mongoose.Types.ObjectId(userId), '$readBy.userId']
          }
        }
      },
      {
        $match: {
          isRead: false
        }
      },
      {
        $group: {
          _id: '$groupId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format: { groupId: count }
    const counts = {};
    unreadCounts.forEach(item => {
      counts[item._id.toString()] = item.count;
    });

    res.json({
      success: true,
      unreadCounts: counts
    });
  } catch (error) {
    console.error('Error fetching group unread counts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread counts', error: error.message });
  }
});

// @route   GET /api/groups/:groupId
// @desc    Get single group details
// @access  Private
router.get('/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const group = await Group.findById(groupId)
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is member
    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch group', error: error.message });
  }
});

// @route   GET /api/groups/:groupId/messages
// @desc    Get messages for a group
// @access  Private
router.get('/:groupId/messages', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const { limit = 50, before } = req.query;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    // Check if group exists and user is member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    // Build query
    const query = { groupId };
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    // Fetch messages
    const messages = await GroupMessage.find(query)
      .populate('senderId', 'name email')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    // Mark messages as read
    const unreadMessages = messages.filter(
      msg => !msg.readBy.some(rb => rb.userId.toString() === userId.toString())
    );

    if (unreadMessages.length > 0) {
      const readPromises = unreadMessages.map(msg => {
        msg.readBy.push({ userId, readAt: new Date() });
        return msg.save();
      });
      await Promise.all(readPromises);
    }

    res.json({
      success: true,
      messages: messages.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages', error: error.message });
  }
});

// @route   POST /api/groups/:groupId/messages
// @desc    Send message to group (via API - socket handles real-time)
// @access  Private
router.post('/:groupId/messages', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message, messageType = 'text' } = req.body;
    const senderId = req.user.userId;
    const senderName = req.user.name || req.user.email;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Check if group exists and user is member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(senderId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    // Create message
    const groupMessage = new GroupMessage({
      groupId,
      senderId,
      senderName,
      message: message.trim(),
      messageType,
      timestamp: new Date(),
      readBy: [{ userId: senderId, readAt: new Date() }]
    });

    await groupMessage.save();

    // Update group's last message using findByIdAndUpdate to avoid full document validation
    await Group.findByIdAndUpdate(groupId, {
      lastMessage: {
        message: message.trim(),
        senderId,
        timestamp: new Date()
      }
    }, { runValidators: false });

    // Populate sender info
    await groupMessage.populate('senderId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: groupMessage
    });
  } catch (error) {
    console.error('❌ Error sending group message:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request params:', req.params);
    console.error('Request body:', req.body);
    console.error('User:', req.user);
    res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
  }
});

// @route   PATCH /api/groups/:groupId/mark-read
// @desc    Mark all messages in a group as read for current user
// @access  Private
router.patch('/:groupId/mark-read', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    // Check if group exists and user is member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    // Find all messages in the group where user hasn't read
    const unreadMessages = await GroupMessage.find({
      groupId,
      'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) }
    });

    // Add user to readBy for each unread message
    const updatePromises = unreadMessages.map(msg => {
      msg.readBy.push({ userId: new mongoose.Types.ObjectId(userId), readAt: new Date() });
      return msg.save();
    });

    await Promise.all(updatePromises);

    // Get updated unread count for this group
    const unreadCount = await GroupMessage.countDocuments({
      groupId,
      'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) }
    });

    res.json({
      success: true,
      message: 'Messages marked as read',
      markedCount: unreadMessages.length,
      unreadCount
    });
  } catch (error) {
    console.error('Error marking group messages as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark messages as read', error: error.message });
  }
});

// @route   POST /api/groups/:groupId/members
// @desc    Add members to group
// @access  Private
router.post('/:groupId/members', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only admin can add members
    if (!group.isAdmin(userId)) {
      return res.status(403).json({ success: false, message: 'Only group admin can add members' });
    }

    // Filter valid member IDs
    const validMembers = members.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    // Filter out existing members
    const newMembers = validMembers.filter(
      id => !group.members.some(m => m.userId.toString() === id.toString())
    );

    if (newMembers.length === 0) {
      return res.status(400).json({ success: false, message: 'No new members to add' });
    }

    // Fetch user details for new members
    const newUsers = await User.find({ _id: { $in: newMembers } });
    const userMap = new Map(newUsers.map(u => [u._id.toString(), u]));

    // Add new members with details
    newMembers.forEach(memberId => {
      const user = userMap.get(memberId.toString());
      group.members.push({
        userId: memberId,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        role: 'member',
        joinedAt: new Date()
      });
    });

    await group.save();

    // Emit socket event to notify group members
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${groupId}`).emit('group_members_updated', {
        groupId,
        action: 'members_added',
        members: group.members
      });
    }

    res.json({
      success: true,
      message: 'Members added successfully',
      group
    });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({ success: false, message: 'Failed to add members', error: error.message });
  }
});

// @route   DELETE /api/groups/:groupId/members/:memberId
// @desc    Remove member from group
// @access  Private
router.delete('/:groupId/members/:memberId', auth, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only admin can remove members (or user can leave themselves)
    const isAdmin = group.isAdmin(userId);
    const isSelf = userId.toString() === memberId.toString();

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: 'Not authorized to remove this member' });
    }

    // Cannot remove the creator
    if (memberId.toString() === group.createdBy.toString() && !isSelf) {
      return res.status(403).json({ success: false, message: 'Cannot remove the group creator' });
    }

    // Remove member
    group.members = group.members.filter(m => m.userId.toString() !== memberId.toString());
    await group.save();

    // Emit socket event to notify group members
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${groupId}`).emit('group_members_updated', {
        groupId,
        action: 'member_removed',
        memberId,
        members: group.members
      });
    }

    res.json({
      success: true,
      message: isSelf ? 'You left the group' : 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member', error: error.message });
  }
});

// @route   DELETE /api/groups/:groupId
// @desc    Delete group
// @access  Private
router.delete('/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only creator can delete group
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only group creator can delete the group' });
    }

    // Delete all messages in the group
    await GroupMessage.deleteMany({ groupId });

    // Delete group
    await Group.findByIdAndDelete(groupId);

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ success: false, message: 'Failed to delete group', error: error.message });
  }
});

// @route   GET /api/groups/:groupId/members
// @desc    Get all members of a group
// @access  Private
router.get('/:groupId/members', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is member
    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    // Populate member details if missing (for older groups)
    const memberIds = group.members.filter(m => !m.name).map(m => m.userId);
    let userMap = new Map();
    if (memberIds.length > 0) {
      const users = await User.find({ _id: { $in: memberIds } });
      userMap = new Map(users.map(u => [u._id.toString(), u]));
    }

    // Convert members to plain objects with proper name/email
    const populatedMembers = group.members.map(member => {
      const memberObj = member.toObject ? member.toObject() : member;
      if (!memberObj.name) {
        const user = userMap.get(memberObj.userId.toString());
        memberObj.name = user?.name || 'Unknown';
        memberObj.email = user?.email || '';
      }
      return memberObj;
    });

    res.json({
      success: true,
      members: populatedMembers
    });
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members', error: error.message });
  }
});

// @route   PUT /api/groups/:groupId/members/:memberId/role
// @desc    Update member role (make admin or member)
// @access  Private (Admin only)
router.put('/:groupId/members/:memberId/role', auth, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs' });
    }

    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be admin or member' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only admin can change roles
    if (!group.isAdmin(userId)) {
      return res.status(403).json({ success: false, message: 'Only group admin can change member roles' });
    }

    // Cannot change own role (prevent removing yourself as admin)
    if (memberId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });
    }

    // Find and update member
    const member = group.members.find(m => m.userId.toString() === memberId.toString());
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found in group' });
    }

    member.role = role;
    await group.save();

    // Emit socket event to notify group members
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${groupId}`).emit('group_members_updated', {
        groupId,
        action: 'role_updated',
        memberId,
        role,
        members: group.members
      });
    }

    res.json({
      success: true,
      message: `Member role updated to ${role}`,
      member
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ success: false, message: 'Failed to update role', error: error.message });
  }
});

// @route   PATCH /api/groups/:groupId/name
// @desc    Change group name (Admin only)
// @access  Private
router.patch('/:groupId/name', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only admin can change group name
    if (!group.isAdmin(userId)) {
      return res.status(403).json({ success: false, message: 'Only group admin can change the group name' });
    }

    // Update group name and avatar
    group.name = name.trim();
    group.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=4F46E5&color=fff&size=128`;
    await group.save();

    // Emit socket event to notify group members
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${groupId}`).emit('group_updated', {
        groupId,
        action: 'name_changed',
        name: group.name,
        avatar: group.avatar
      });
    }

    res.json({
      success: true,
      message: 'Group name updated successfully',
      group
    });
  } catch (error) {
    console.error('Error updating group name:', error);
    res.status(500).json({ success: false, message: 'Failed to update group name', error: error.message });
  }
});

// @route   PATCH /api/groups/:groupId/make-admin/:userId
// @desc    Make a member admin (Admin only)
// @access  Private
router.patch('/:groupId/make-admin/:userId', auth, async (req, res) => {
  try {
    const { groupId, userId: targetUserId } = req.params;
    const adminId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only admin can make another member admin
    if (!group.isAdmin(adminId)) {
      return res.status(403).json({ success: false, message: 'Only group admin can promote members' });
    }

    // Cannot promote if already admin
    if (group.isAdmin(targetUserId)) {
      return res.status(400).json({ success: false, message: 'User is already an admin' });
    }

    // Find and update member
    const member = group.members.find(m => m.userId.toString() === targetUserId.toString());
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found in group' });
    }

    member.role = 'admin';
    await group.save();

    // Emit socket event to notify group members
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${groupId}`).emit('admin_updated', {
        groupId,
        action: 'promoted',
        userId: targetUserId,
        members: group.members
      });
    }

    res.json({
      success: true,
      message: 'Member promoted to admin successfully',
      member
    });
  } catch (error) {
    console.error('Error promoting member:', error);
    res.status(500).json({ success: false, message: 'Failed to promote member', error: error.message });
  }
});

module.exports = router;
