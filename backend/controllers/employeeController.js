const Employee = require('../models/Employee');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// Helper function to check if user has admin privileges
const checkAdminAccess = (user) => {
  return user && user.role === 'admin';
};

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
const getEmployees = async (req, res) => {
  try {
    console.log('=== GET EMPLOYEES DEBUG ===');
    const { role, status, search } = req.query;
    
    console.log('Query params:', { role, status, search });
    
    // Build filter object
    let filter = {};
    
    if (role && role !== 'All') {
      filter.role = role;
    }
    
    if (status && status !== 'All') {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('Filter:', filter);
    console.log('Employee model:', Employee);
    
    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    console.log('Employees found:', employees.length);
    console.log('First employee:', employees[0]);
    
    // Also fetch users from User collection (for messaging compatibility)
    const users = await User.find({
      role: { $in: ['admin', 'employee'] }
    }).select('name email role createdAt');
    console.log('Users found:', users.length);

    // Get today's attendance for all employees
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    });

    // Create attendance map
    const attendanceMap = {};
    attendances.forEach(att => {
      if (att.employeeId) {
        attendanceMap[att.employeeId.toString()] = att;
      }
    });

    // Add attendance status to each employee
    const employeesWithAttendance = employees.map(emp => {
      const empObj = emp.toObject();
      const attendance = attendanceMap[emp._id.toString()];
      
      // Determine status: checked in (isActive=true) = active, checked out or no attendance = inactive
      let status = 'inactive';
      if (attendance) {
        status = attendance.isActive ? 'active' : 'inactive';
      }
      
      return {
        ...empObj,
        attendanceToday: status,
        attendanceData: attendance || null,
        isCheckedIn: attendance ? attendance.isActive : false,
        checkInTime: attendance ? attendance.checkInTime : null,
        checkOutTime: attendance ? attendance.checkOutTime : null
      };
    });
    
    // Add users from User collection (for messaging compatibility)
    // Filter out users who are already in employees list (by email)
    const employeeEmails = new Set(employees.map(e => e.email.toLowerCase()));
    const uniqueUsers = users.filter(u => !employeeEmails.has(u.email.toLowerCase()));
    
    // Convert users to employee-like format
    const usersAsEmployees = uniqueUsers.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role === 'admin' ? 'Admin' : 'Employee',
      designation: user.department || 'Employee',
      employeeId: 'USER-' + user._id.toString().slice(-4),
      status: 'Active',
      reportingTo: 'Admin',
      createdAt: user.createdAt,
      isUser: true, // Flag to identify user vs employee
      attendanceToday: 'inactive',
      attendanceData: null,
      isCheckedIn: false,
      checkInTime: null,
      checkOutTime: null
    }));
    
    // Merge employees and users
    const allPeople = [...employeesWithAttendance, ...usersAsEmployees];
    
    res.json({
      success: true,
      count: allPeople.length,
      data: allPeople
    });
  } catch (error) {
    console.error('Get employees error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
      error: error.message
    });
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new employee
// @route   POST /api/employees
// @access  Admin only
const createEmployee = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!checkAdminAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required to create employees.'
      });
    }

    const { name, email, designation, role, reportingTo, employeeId } = req.body;
    
    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this email already exists'
      });
    }
    
    // Generate employee ID if not provided
    let newEmployeeId = employeeId;
    if (!newEmployeeId) {
      const count = await Employee.countDocuments();
      newEmployeeId = String(count + 1).padStart(3, '0');
    }
    
    // Check if employee ID already exists
    const existingId = await Employee.findOne({ employeeId: newEmployeeId });
    if (existingId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }
    
    const employee = await Employee.create({
      employeeId: newEmployeeId,
      name,
      email,
      designation,
      role,
      reportingTo,
      status: 'Active',
      createdBy: req.user ? req.user.id : null
    });
    
    res.status(201).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Admin only
const updateEmployee = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!checkAdminAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required to update employees.'
      });
    }

    const { name, email, designation, role, reportingTo, status } = req.body;
    
    let employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Check if email is being changed and already exists
    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({ email });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: 'Employee with this email already exists'
        });
      }
    }
    
    employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { name, email, designation, role, reportingTo, status },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Admin only
const deleteEmployee = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!checkAdminAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required to delete employees.'
      });
    }

    const { id } = req.params;

    // Try to find and delete from Employee collection first
    let employee = await Employee.findById(id);
    
    if (employee) {
      await employee.deleteOne();
      return res.json({
        success: true,
        message: 'Employee deleted successfully'
      });
    }

    // If not found in Employee, try User collection
    // (since getEmployees returns merged data from both collections)
    const user = await User.findById(id);
    
    if (user) {
      await User.findByIdAndDelete(id);
      return res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }
    
    // Not found in either collection
    return res.status(404).json({
      success: false,
      message: 'Employee/User not found'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Invite employee (send invitation)
// @route   POST /api/employees/invite
// @access  Admin only
const inviteEmployee = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!checkAdminAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required to invite employees.'
      });
    }

    const { email, role, message } = req.body;
    
    // Here you would typically send an email invitation
    // For now, we'll just create a pending employee or return success
    
    res.json({
      success: true,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Invite employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Import employees from CSV
// @route   POST /api/employees/import
// @access  Admin only
const importEmployees = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!checkAdminAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required to import employees.'
      });
    }

    const { employees } = req.body;
    
    const importedEmployees = [];
    const errors = [];
    
    for (const empData of employees) {
      try {
        const existingEmployee = await Employee.findOne({ email: empData.email });
        if (existingEmployee) {
          errors.push(`Employee with email ${empData.email} already exists`);
          continue;
        }
        
        const count = await Employee.countDocuments();
        const employeeId = String(count + 1).padStart(3, '0');
        
        const employee = await Employee.create({
          employeeId,
          ...empData,
          status: 'Active'
        });
        
        importedEmployees.push(employee);
      } catch (error) {
        errors.push(`Error importing ${empData.name}: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      imported: importedEmployees.length,
      errors: errors.length > 0 ? errors : null,
      data: importedEmployees
    });
  } catch (error) {
    console.error('Import employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  inviteEmployee,
  importEmployees
};
