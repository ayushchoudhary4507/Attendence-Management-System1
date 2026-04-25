const Project = require('../models/Project');
const User = require('../models/User');

// Get all projects - show all projects to admin, filtered to employees
exports.getAllProjects = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const user = await User.findById(userId);
    
    let query = {};
    
    // If not admin, show all projects (for demo purposes)
    // In production, you might want to filter by team membership
    if (role !== 'admin') {
      // For employees, show all projects for now
      // Later you can filter by: { team: { $in: [user.name, user.email] } }
      query = {}; // Show all projects for demo
    }
    
    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get project by ID - only if user is in team or is admin/creator
exports.getProjectById = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const user = await User.findById(userId);
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check if user has access (admin, creator, or team member)
    const isAdmin = role === 'admin';
    const isCreator = project.createdBy?.toString() === userId;
    const isTeamMember = project.team.includes(user.name) || project.team.includes(user.email);
    
    if (!isAdmin && !isCreator && !isTeamMember) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this project.' });
    }
    
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new project
exports.createProject = async (req, res) => {
  try {
    const { name, description, status, progress, team, deadline, priority } = req.body;
    const project = new Project({
      name,
      description,
      status,
      progress,
      team,
      deadline,
      priority,
      createdBy: req.user.userId
    });
    await project.save();

    // Send project_update notification to admin
    try {
      const Notification = require('../models/Notification');
      const User = require('../models/User');
      const creator = await User.findById(req.user.userId).select('name');
      const creatorName = creator ? creator.name : 'Unknown';
      const admins = await User.find({ role: 'admin' }).select('_id');

      // Create notification for each admin
      const projectNotifications = [];
      for (const admin of admins) {
        const adminNotification = await Notification.create({
          type: 'project_update',
          title: 'New Project Created',
          message: `${creatorName} created project "${name}"`,
          senderId: req.user.userId,
          senderName: creatorName,
          receiverId: admin._id,
          link: '/projects'
        });
        projectNotifications.push(adminNotification);
      }
      console.log('✅ Project notifications created for admins');

      // Emit to admins via socket
      const io = global._io;
      if (io) {
        const onlineUsersMap = io.onlineUsers;
        for (const admin of admins) {
          const adminId = admin._id.toString();
          const adminOnline = onlineUsersMap ? onlineUsersMap.get(adminId) : null;
          if (adminOnline && adminOnline.isOnline) {
            const notification = projectNotifications.find(n => n.receiverId.toString() === adminId);
            if (notification) {
              io.to(adminOnline.socketId).emit('newNotification', {
                id: notification._id,
                type: 'project_update',
                title: 'New Project Created',
                message: `${creatorName} created project "${name}"`,
                senderId: req.user.userId,
                senderName: creatorName,
                link: '/projects',
                createdAt: new Date(),
                read: false
              });
            }
          }
        }
      }
    } catch (notifError) {
      console.error('Failed to send project notification:', notifError.message);
    }

    res.status(201).json({ success: true, message: 'Project created successfully', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update project - only admin or creator can update
exports.updateProject = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Only admin or creator can update
    const isAdmin = role === 'admin';
    const isCreator = project.createdBy?.toString() === userId;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: 'Access denied. Only admin or project creator can update.' });
    }
    
    const { name, description, status, progress, team, deadline, priority } = req.body;
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, status, progress, team, deadline, priority },
      { new: true, runValidators: true }
    );

    // Send project_update notification to admin
    try {
      const Notification = require('../models/Notification');
      const User = require('../models/User');
      const updater = await User.findById(userId).select('name');
      const updaterName = updater ? updater.name : 'Unknown';
      const admins = await User.find({ role: 'admin' }).select('_id');

      // Create notification for each admin
      const projectNotifications = [];
      for (const admin of admins) {
        const adminNotification = await Notification.create({
          type: 'project_update',
          title: 'Project Updated',
          message: `${updaterName} updated project "${updatedProject.name}"`,
          senderId: userId,
          senderName: updaterName,
          receiverId: admin._id,
          link: '/projects'
        });
        projectNotifications.push(adminNotification);
      }
      console.log('✅ Project update notifications created for admins');

      const io = global._io;
      if (io) {
        const onlineUsersMap = io.onlineUsers;
        for (const admin of admins) {
          const adminId = admin._id.toString();
          const adminOnline = onlineUsersMap ? onlineUsersMap.get(adminId) : null;
          if (adminOnline && adminOnline.isOnline) {
            const notification = projectNotifications.find(n => n.receiverId.toString() === adminId);
            if (notification) {
              io.to(adminOnline.socketId).emit('newNotification', {
                id: notification._id,
                type: 'project_update',
                title: 'Project Updated',
                message: `${updaterName} updated project "${updatedProject.name}"`,
                senderId: userId,
                senderName: updaterName,
                link: '/projects',
                createdAt: new Date(),
                read: false
              });
            }
          }
        }
      }
    } catch (notifError) {
      console.error('Failed to send project update notification:', notifError.message);
    }

    res.json({ success: true, message: 'Project updated successfully', data: updatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete project - only admin or creator can delete
exports.deleteProject = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Only admin or creator can delete
    const isAdmin = role === 'admin';
    const isCreator = project.createdBy?.toString() === userId;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: 'Access denied. Only admin or project creator can delete.' });
    }
    
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get projects by status - filtered by user access
exports.getProjectsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { userId, role } = req.user;
    const user = await User.findById(userId);
    
    let query = { status };
    
    // If not admin, only show projects where user is in team or is creator
    if (role !== 'admin') {
      query = {
        status,
        $or: [
          { team: { $in: [user.name, user.email] } },
          { createdBy: userId }
        ]
      };
    }
    
    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
