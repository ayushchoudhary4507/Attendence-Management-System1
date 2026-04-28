import { useState, useEffect } from 'react';
import './Holidays.css';

const Holidays = ({ user }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'company',
    description: '',
    recurring: false
  });
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`http://localhost:5005/api/holidays?year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setHolidays(data.data);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date) => {
    if (user?.role !== 'admin') return;
    
    const existingHoliday = holidays.find(h => {
      const holidayDate = new Date(h.date);
      holidayDate.setHours(0, 0, 0, 0);
      const clickedDate = new Date(date);
      clickedDate.setHours(0, 0, 0, 0);
      return holidayDate.getTime() === clickedDate.getTime();
    });

    if (existingHoliday) {
      setSelectedDate(existingHoliday);
      setFormData({
        name: existingHoliday.name,
        type: existingHoliday.type,
        description: existingHoliday.description || '',
        recurring: existingHoliday.recurring || false
      });
    } else {
      // Convert date to ISO string for proper handling
      const dateObj = new Date(date);
      setSelectedDate({ date: dateObj.toISOString() });
      setFormData({
        name: '',
        type: 'company',
        description: '',
        recurring: false
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setFormData({
      name: '',
      type: 'company',
      description: '',
      recurring: false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      
      // Check if editing existing holiday
      const existingHoliday = holidays.find(h => {
        const holidayDate = new Date(h.date);
        holidayDate.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate.date);
        selectedDateObj.setHours(0, 0, 0, 0);
        return holidayDate.getTime() === selectedDateObj.getTime();
      });

      if (existingHoliday) {
        // Update existing holiday
        const response = await fetch(`http://localhost:5005/api/holidays/${existingHoliday._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        if (data.success) {
          alert('Holiday updated successfully');
          handleCloseModal();
          fetchHolidays();
        } else {
          alert(data.message || 'Failed to update holiday');
        }
      } else {
        // Create new holiday
        const response = await fetch('http://localhost:5005/api/holidays', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...formData,
            date: selectedDate.date
          })
        });
        
        const data = await response.json();
        if (data.success) {
          alert('Holiday added successfully');
          handleCloseModal();
          fetchHolidays();
        } else {
          alert(data.message || 'Failed to add holiday');
        }
      }
    } catch (error) {
      console.error('Error saving holiday:', error);
      alert('Error saving holiday');
    }
  };

  const handleDelete = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) {
      return;
    }
    
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`http://localhost:5005/api/holidays/${holidayId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Holiday deleted successfully');
        handleCloseModal();
        fetchHolidays();
      } else {
        alert(data.message || 'Failed to delete holiday');
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Error deleting holiday');
    }
  };

  const getHolidayForDate = (date) => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    return holidays.find(h => {
      const holidayDate = new Date(h.date);
      holidayDate.setHours(0, 0, 0, 0);
      return holidayDate.getTime() === dateObj.getTime();
    });
  };

  const generateCalendar = () => {
    const months = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay();
      
      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDay; i++) {
        days.push({ day: null, date: null });
      }
      
      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const holiday = getHolidayForDate(date);
        days.push({ day, date, holiday });
      }
      
      months.push({
        name: monthNames[month],
        days
      });
    }
    
    return months;
  };

  const calendarData = generateCalendar();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="holidays-page">
      <div className="holidays-header">
        <h1>Holiday Calendar</h1>
        <div className="holidays-controls">
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="year-select"
          >
            {[year - 1, year, year + 1, year + 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          
          {isAdmin && (
            <button 
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('This will import common public holidays for ' + year + '. Continue?')) {
                  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
                  fetch('http://localhost:5005/api/holidays/import', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ year })
                  })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      alert(data.message);
                      fetchHolidays();
                    } else {
                      alert(data.message);
                    }
                  });
                }
              }}
            >
              Import Public Holidays
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading holidays...</div>
      ) : (
        <div className="calendar-grid">
          {calendarData.map((month, monthIndex) => (
            <div key={monthIndex} className="calendar-month">
              <h3 className="month-name">{month.name} {year}</h3>
              <div className="calendar-days">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="day-header">{day}</div>
                ))}
              </div>
              <div className="calendar-dates">
                {month.days.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`calendar-day ${day.holiday ? 'holiday' : ''} ${day.holiday?.type} ${isAdmin ? 'clickable' : ''}`}
                    onClick={() => day.date && handleDateClick(day.date)}
                    title={day.holiday ? day.holiday.name : isAdmin ? 'Click to mark holiday' : ''}
                  >
                    {day.day && (
                      <>
                        <span className="day-number">{day.day}</span>
                        {day.holiday && (
                          <div className="holiday-indicator">
                            <span className="holiday-icon">{day.holiday.type === 'public' ? '🏛️' : '🏢'}</span>
                            <span className="holiday-name">{day.holiday.name}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && isAdmin && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDate._id ? 'Edit Holiday' : 'Add Holiday'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="holiday-form">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={selectedDate.date ? selectedDate.date.split('T')[0] : ''}
                  disabled
                />
              </div>
              
              <div className="form-group">
                <label>Holiday Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Diwali, Company Anniversary"
                />
              </div>
              
              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="company">Company Holiday</option>
                  <option value="public">Public Holiday</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows="3"
                />
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.recurring}
                    onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                  />
                  <span>Recurring (repeats every year)</span>
                </label>
              </div>
              
              <div className="form-actions">
                {selectedDate._id && (
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={() => handleDelete(selectedDate._id)}
                  >
                    Delete
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedDate._id ? 'Update' : 'Add'} Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Holidays;
