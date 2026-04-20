import { useState } from 'react';
import { attendanceAPI } from '../services/api';
import './AttendanceButton.css';

const AttendanceButton = ({ onCheckIn, onCheckOut, status }) => {
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.markAttendance('Present', '');
      if (response.success && onCheckIn) {
        onCheckIn(response.data);
      }
    } catch (error) {
      console.error('Check-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.checkOut();
      if (response.success && onCheckOut) {
        onCheckOut(response.data);
      }
    } catch (error) {
      console.error('Check-out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-button-container">
      {status === 'checked-in' ? (
        <button 
          className="attendance-btn check-out"
          onClick={handleCheckOut}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Check Out'}
        </button>
      ) : (
        <button 
          className="attendance-btn check-in"
          onClick={handleCheckIn}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Check In'}
        </button>
      )}
    </div>
  );
};

export default AttendanceButton;
