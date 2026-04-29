import { useState, useEffect } from 'react';
import { shiftAPI } from '../../services/api';
import './MyShifts.css';

const MyShifts = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [todayShift, setTodayShift] = useState(null);
  const [nextShift, setNextShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user?.id) fetchShifts();
  }, [user, viewMonth, viewYear]);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const startDate = new Date(viewYear, viewMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(viewYear, viewMonth + 1, 0).toISOString().split('T')[0];
      const data = await shiftAPI.getMyShifts(startDate, endDate);
      if (data.success) {
        setAssignments(data.data);
        setTodayShift(data.todayShift);
        setNextShift(data.nextShift);
      }
    } catch (err) {
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const isToday = (date) => {
    const d = new Date(date);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const isPast = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="my-shifts">
      <div className="page-header">
        <div className="header-left">
          <h1>My Shifts</h1>
          <p>View your assigned shifts and schedule</p>
        </div>
      </div>

      {/* Today's Shift Card */}
      {todayShift && todayShift.shiftId && (
        <div className="today-shift-card">
          <div className="today-shift-badge">TODAY'S SHIFT</div>
          <div className="today-shift-content">
            <div className="today-shift-name">
              <span className={`shift-badge shift-${(todayShift.shiftId.shiftName || '').toLowerCase()}`}>
                {todayShift.shiftId.shiftName}
              </span>
            </div>
            <div className="today-shift-time">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              {formatTime(todayShift.shiftId.startTime)} - {formatTime(todayShift.shiftId.endTime)}
            </div>
          </div>
        </div>
      )}

      {!todayShift && (
        <div className="no-today-shift">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
          <span>No shift assigned for today</span>
        </div>
      )}

      {/* Next Shift Card */}
      {nextShift && nextShift.shiftId && (
        <div className="next-shift-card">
          <div className="next-shift-label">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            NEXT SHIFT
          </div>
          <div className="next-shift-content">
            <div className="next-shift-date">{new Date(nextShift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div className="next-shift-details">
              <span className={`shift-badge shift-${(nextShift.shiftId.shiftName || '').toLowerCase()}`}>{nextShift.shiftId.shiftName}</span>
              <span className="next-shift-time">{formatTime(nextShift.shiftId.startTime)} - {formatTime(nextShift.shiftId.endTime)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Calendar View */}
      <div className="month-nav">
        <button className="btn-icon" onClick={prevMonth}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <h3>{monthName}</h3>
        <button className="btn-icon" onClick={nextMonth}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>

      <div className="shifts-list">
        {assignments.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>
            <h3>No Shifts This Month</h3>
            <p>No shifts have been assigned for this period</p>
          </div>
        ) : (
          assignments.map(a => {
            const shiftName = a.shiftId?.shiftName || 'N/A';
            return (
              <div key={a._id} className={`shift-list-item ${isToday(a.date) ? 'is-today' : ''} ${isPast(a.date) ? 'is-past' : ''}`}>
                <div className="shift-list-date">
                  <span className="shift-day">{new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="shift-date-num">{new Date(a.date).getDate()}</span>
                </div>
                <div className="shift-list-info">
                  <span className={`shift-badge shift-${shiftName.toLowerCase()}`}>{shiftName}</span>
                  <span className="shift-list-time">
                    {a.shiftId ? `${formatTime(a.shiftId.startTime)} - ${formatTime(a.shiftId.endTime)}` : 'N/A'}
                  </span>
                </div>
                {isToday(a.date) && <span className="today-tag">Today</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyShifts;
