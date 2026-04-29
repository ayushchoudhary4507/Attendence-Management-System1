const Shift = require('../models/Shift');
const ShiftAssignment = require('../models/ShiftAssignment');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');

// Helper: format time from "HH:mm" to "h:mm AM/PM"
const formatTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Create a new shift (Admin only)
const createShift = async (req, res) => {
  try {
    const { shiftName, startTime, endTime, description } = req.body;

    if (!shiftName || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shift name, start time, and end time are required' 
      });
    }

    // Check for duplicate shift name
    const existingShift = await Shift.findOne({ shiftName, isActive: true });
    if (existingShift) {
      return res.status(400).json({ 
        success: false, 
        message: `Shift "${shiftName}" already exists` 
      });
    }

    const shift = new Shift({
      shiftName,
      startTime,
      endTime,
      description: description || '',
      createdBy: req.userId
    });

    await shift.save();

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: shift
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all shifts
const getAllShifts = async (req, res) => {
  try {
    const shifts = await Shift.find({ isActive: true }).sort({ startTime: 1 });
    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get shift by ID
const getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    res.json({ success: true, data: shift });
  } catch (error) {
    console.error('Error fetching shift:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update shift (Admin only)
const updateShift = async (req, res) => {
  try {
    const { shiftName, startTime, endTime, description, isActive } = req.body;
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { shiftName, startTime, endTime, description, isActive },
      { new: true, runValidators: true }
    );
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    res.json({ success: true, message: 'Shift updated successfully', data: shift });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete shift (Admin only - soft delete)
const deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    res.json({ success: true, message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Assign shift to employee(s) (Admin only)
const assignShift = async (req, res) => {
  try {
    const { employeeIds, shiftId, dates } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one employee ID is required' });
    }
    if (!shiftId) {
      return res.status(400).json({ success: false, message: 'Shift ID is required' });
    }
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one date is required' });
    }

    // Verify shift exists
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const assignments = [];
    const errors = [];

    for (const employeeId of employeeIds) {
      // Find employee - try Employee collection first, then User collection
      let employee = await Employee.findById(employeeId);
      const User = require('../models/User');
      let user = null;

      if (!employee) {
        // The ID might be from the User collection (merged employees list)
        user = await User.findById(employeeId);
        if (!user) {
          errors.push(`Employee/User ${employeeId} not found`);
          continue;
        }
        // Try to find matching Employee by email
        employee = await Employee.findOne({ email: user.email });
      } else {
        // Find user by email
        user = await User.findOne({ email: employee.email });
      }

      if (!user) {
        errors.push(`User for employee ${employee?.name || employeeId} not found`);
        continue;
      }

      // Use the Employee ID for the assignment if we have one, otherwise use the User ID
      const assignEmployeeId = employee ? employee._id : employeeId;

      for (const dateStr of dates) {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);

        try {
          // Upsert: update if exists, create if not
          const assignment = await ShiftAssignment.findOneAndUpdate(
            { employeeId: assignEmployeeId, date },
            {
              employeeId: assignEmployeeId,
              userId: user._id,
              shiftId,
              date,
              assignedBy: req.userId,
              isNotified: false
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          assignments.push(assignment);
        } catch (err) {
          if (err.code === 11000) {
            // Duplicate key - already assigned
            errors.push(`${employee?.name || user.name} already has a shift on ${dateStr}`);
          } else {
            errors.push(`Error assigning shift to ${employee?.name || user.name} on ${dateStr}: ${err.message}`);
          }
        }
      }

      // Send real-time notification to the assigned employee
      try {
        const shiftMsg = `Your shift for ${dates.length === 1 ? new Date(dates[0]).toLocaleDateString('en-US', { weekday: 'long' }) : 'selected dates'} is ${shift.shiftName} (${formatTime(shift.startTime)} - ${formatTime(shift.endTime)})`;
        
        const notification = await Notification.create({
          type: 'shift_assigned',
          title: 'Shift Assigned',
          message: shiftMsg,
          receiverId: user._id,
          senderId: req.userId,
          senderName: req.user?.name || 'Admin',
          employeeId: assignEmployeeId,
          employeeName: employee?.name || user.name,
          employeeEmail: employee?.email || user.email,
          link: '/my-shifts',
          read: false
        });

        // Emit via Socket.IO
        const io = global._io;
        if (io) {
          const onlineUsersMap = io.onlineUsers;
          const targetUser = onlineUsersMap ? onlineUsersMap.get(user._id.toString()) : null;
          if (targetUser && targetUser.isOnline) {
            io.to(targetUser.socketId).emit('newNotification', {
              id: notification._id,
              type: 'shift_assigned',
              title: 'Shift Assigned',
              message: shiftMsg,
              senderId: req.userId,
              senderName: req.user?.name || 'Admin',
              receiverId: user._id,
              link: '/my-shifts',
              createdAt: notification.createdAt,
              read: false
            });
            console.log(`📢 Shift assignment notification sent to user ${user._id}`);
          }
        }

        // Mark as notified
        await ShiftAssignment.updateMany(
          { employeeId, shiftId, date: { $in: dates.map(d => new Date(d)) } },
          { isNotified: true }
        );
      } catch (notifError) {
        console.error('Failed to send shift notification:', notifError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Shift assigned successfully to ${assignments.length} assignment(s)`,
      data: assignments,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error assigning shift:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get shifts for a specific user (Employee view)
const getUserShifts = async (req, res) => {
  try {
    // Employees can only see their own shifts; admins can specify any userId
    let userId = req.params.userId || req.userId;
    if (req.user.role !== 'admin' && req.params.userId && req.params.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    // For /my-shifts route (no params), always use logged-in user's ID
    if (!req.params.userId) {
      userId = req.userId;
    }

    const { startDate, endDate } = req.query;

    let query = { userId };
    
    if (startDate && endDate) {
      query.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else {
      // Default: current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const assignments = await ShiftAssignment.find(query)
      .populate('shiftId')
      .populate('employeeId', 'name email designation')
      .sort({ date: 1 });

    // Find today's shift and next shift
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAssignment = assignments.find(a => {
      const assignDate = new Date(a.date);
      assignDate.setHours(0, 0, 0, 0);
      return assignDate.getTime() === today.getTime();
    });

    const nextAssignment = assignments.find(a => {
      const assignDate = new Date(a.date);
      assignDate.setHours(0, 0, 0, 0);
      return assignDate > today;
    });

    res.json({
      success: true,
      data: assignments,
      todayShift: todayAssignment || null,
      nextShift: nextAssignment || null
    });
  } catch (error) {
    console.error('Error fetching user shifts:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all shift assignments (Admin view)
const getAllAssignments = async (req, res) => {
  try {
    const { date, shiftId } = req.query;
    let query = {};

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: targetDate, $lt: nextDay };
    }

    if (shiftId) {
      query.shiftId = shiftId;
    }

    const assignments = await ShiftAssignment.find(query)
      .populate('shiftId')
      .populate('employeeId', 'name email designation')
      .populate('userId', 'name email')
      .sort({ date: 1 });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Remove shift assignment
const removeAssignment = async (req, res) => {
  try {
    const assignment = await ShiftAssignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    res.json({ success: true, message: 'Shift assignment removed successfully' });
  } catch (error) {
    console.error('Error removing assignment:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createShift,
  getAllShifts,
  getShiftById,
  updateShift,
  deleteShift,
  assignShift,
  getUserShifts,
  getAllAssignments,
  removeAssignment,
  formatTime
};
