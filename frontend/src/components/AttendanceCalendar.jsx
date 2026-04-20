import { useState, useEffect } from 'react';
import api from '../services/api';
import './AttendanceCalendar.css';

const AttendanceCalendar = ({ employeeId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonthlyAttendance();
  }, [currentMonth, employeeId]);

  const fetchMonthlyAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/calendar', {
        params: {
          year: currentMonth.getFullYear(),
          month: currentMonth.getMonth() + 1,
          employeeId
        }
      });
      if (response.data.success) {
        setAttendanceData(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#10b981';
      case 'Absent': return '#ef4444';
      case 'Half Day': return '#f59e0b';
      case 'Leave': return '#6366f1';
      default: return '#e5e7eb';
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const attendanceRecord = attendanceData.find(record => {
        const recordDate = new Date(record.date);
        return recordDate.getDate() === i;
      });
      days.push({
        date: i,
        fullDate: date,
        status: attendanceRecord?.status || null,
        checkIn: attendanceRecord?.checkInTime,
        checkOut: attendanceRecord?.checkOutTime
      });
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return <div className="calendar-loading">Loading calendar...</div>;
  }

  return (
    <div className="attendance-calendar">
      <div className="calendar-header">
        <button className="nav-btn" onClick={() => navigateMonth(-1)}>‹</button>
        <h3>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button className="nav-btn" onClick={() => navigateMonth(1)}>›</button>
      </div>

      <div className="calendar-weekdays">
        {weekDays.map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-days">
        {getDaysInMonth().map((day, index) => (
          <div 
            key={index} 
            className={`calendar-day ${day ? 'has-day' : 'empty'} ${
              day?.status ? 'has-status' : ''
            }`}
            style={day?.status ? { 
              backgroundColor: getStatusColor(day.status),
              color: 'white'
            } : {}}
          >
            {day && (
              <>
                <span className="day-number">{day.date}</span>
                {day.status && <span className="status-label">{day.status}</span>}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
          <span>Present</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
          <span>Absent</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
          <span>Half Day</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#6366f1' }}></span>
          <span>Leave</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
