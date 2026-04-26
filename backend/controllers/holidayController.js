const Holiday = require('../models/Holiday');

// Get all holidays for a specific year
exports.getHolidays = async (req, res) => {
  try {
    const { year, type } = req.query;
    const currentYear = year || new Date().getFullYear();
    
    const filter = { year: currentYear, isActive: true };
    if (type) {
      filter.type = type;
    }

    const holidays = await Holiday.find(filter).sort({ date: 1 });
    
    res.json({
      success: true,
      data: holidays
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get holiday by ID
exports.getHolidayById = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    
    if (!holiday) {
      return res.status(404).json({ 
        success: false, 
        message: 'Holiday not found' 
      });
    }

    res.json({
      success: true,
      data: holiday
    });
  } catch (error) {
    console.error('Get holiday error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Create new holiday (admin only)
exports.createHoliday = async (req, res) => {
  try {
    const { name, date, type, description, recurring } = req.body;
    
    if (!name || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Holiday name and date are required' 
      });
    }

    const holidayDate = new Date(date);
    const year = holidayDate.getFullYear();

    // Check if holiday already exists for this date
    const existingHoliday = await Holiday.findOne({
      date: holidayDate,
      year,
      isActive: true
    });

    if (existingHoliday) {
      return res.status(400).json({ 
        success: false, 
        message: 'Holiday already exists for this date' 
      });
    }

    const holiday = await Holiday.create({
      name,
      date: holidayDate,
      type: type || 'company',
      description: description || '',
      year,
      recurring: recurring || false,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: holiday
    });
  } catch (error) {
    console.error('Create holiday error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update holiday (admin only)
exports.updateHoliday = async (req, res) => {
  try {
    const { name, date, type, description, recurring, isActive } = req.body;
    
    const holiday = await Holiday.findById(req.params.id);
    
    if (!holiday) {
      return res.status(404).json({ 
        success: false, 
        message: 'Holiday not found' 
      });
    }

    // If date is being updated, update year as well
    if (date) {
      const newDate = new Date(date);
      holiday.date = newDate;
      holiday.year = newDate.getFullYear();
    }

    if (name) holiday.name = name;
    if (type) holiday.type = type;
    if (description !== undefined) holiday.description = description;
    if (recurring !== undefined) holiday.recurring = recurring;
    if (isActive !== undefined) holiday.isActive = isActive;

    await holiday.save();

    res.json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday
    });
  } catch (error) {
    console.error('Update holiday error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Delete holiday (admin only)
exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    
    if (!holiday) {
      return res.status(404).json({ 
        success: false, 
        message: 'Holiday not found' 
      });
    }

    // Soft delete - set isActive to false
    holiday.isActive = false;
    await holiday.save();

    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Check if a specific date is a holiday
exports.checkHoliday = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date parameter is required' 
      });
    }

    const checkDate = new Date(date);
    const year = checkDate.getFullYear();

    const holiday = await Holiday.findOne({
      date: checkDate,
      year,
      isActive: true
    });

    res.json({
      success: true,
      isHoliday: !!holiday,
      holiday: holiday || null
    });
  } catch (error) {
    console.error('Check holiday error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Import public holidays (admin only)
exports.importPublicHolidays = async (req, res) => {
  try {
    const { year, country } = req.body;
    const targetYear = year || new Date().getFullYear();
    
    // Common public holidays (can be extended with API integration)
    const publicHolidays = [
      { name: 'New Year\'s Day', date: `${targetYear}-01-01` },
      { name: 'Republic Day', date: `${targetYear}-01-26` },
      { name: 'Independence Day', date: `${targetYear}-08-15` },
      { name: 'Gandhi Jayanti', date: `${targetYear}-10-02` },
      { name: 'Christmas Day', date: `${targetYear}-12-25` }
    ];

    let imported = 0;
    let skipped = 0;

    for (const holiday of publicHolidays) {
      const holidayDate = new Date(holiday.date);
      
      const existing = await Holiday.findOne({
        date: holidayDate,
        year: targetYear,
        type: 'public'
      });

      if (!existing) {
        await Holiday.create({
          name: holiday.name,
          date: holidayDate,
          type: 'public',
          year: targetYear,
          recurring: true,
          createdBy: req.user.userId
        });
        imported++;
      } else {
        skipped++;
      }
    }

    res.json({
      success: true,
      message: `Imported ${imported} holidays, skipped ${skipped} existing holidays`,
      data: {
        imported,
        skipped,
        total: publicHolidays.length
      }
    });
  } catch (error) {
    console.error('Import holidays error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
