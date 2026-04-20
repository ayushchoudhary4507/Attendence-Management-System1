import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import './AdminLeavePopup.css';

const AdminLeavePopup = ({ onClose }) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAllLeaves();
  }, []);

  const fetchAllLeaves = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getAllLeaves(); // Get ALL leaves
      if (response.success) {
        setLeaves(response.data);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      const response = await attendanceAPI.approveRejectLeave(leaveId, 'Approved');
      if (response.success) {
        setMessage('Leave approved!');
        fetchAllLeaves();
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (leaveId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await attendanceAPI.approveRejectLeave(leaveId, 'Rejected', reason);
      if (response.success) {
        setMessage('Leave rejected!');
        fetchAllLeaves();
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to reject');
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString();

  return (
    <div className="admin-leave-popup-overlay">
      <div className="admin-leave-popup">
        <div className="popup-header">
          <h2>All Leave Requests ({leaves.length})</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {message && <div className="popup-message">{message}</div>}

        {loading ? (
          <div className="popup-loading">Loading...</div>
        ) : leaves.length === 0 ? (
          <div className="popup-empty">
            <p>No leave requests found</p>
          </div>
        ) : (
          <div className="popup-content">
            {leaves.map(leave => (
              <div key={leave._id} className="leave-request-card">
                <div className="leave-request-header">
                  <div className="employee-info">
                    <strong>{leave.employeeId?.name || 'Unknown'}</strong>
                    <span className="employee-id">{leave.employeeId?.employeeId || ''}</span>
                  </div>
                  <div className="leave-badges">
                    <span className={`status-badge ${leave.status?.toLowerCase()}`}>{leave.status}</span>
                    <span className="leave-type">{leave.leaveType}</span>
                  </div>
                </div>

                <div className="leave-dates">
                  <div>
                    <span className="label">From:</span> {formatDate(leave.startDate)}
                  </div>
                  <div>
                    <span className="label">To:</span> {formatDate(leave.endDate)}
                  </div>
                  <div>
                    <span className="label">Days:</span> {leave.totalDays}
                  </div>
                </div>

                <div className="leave-reason">
                  <span className="label">Reason:</span>
                  <p>{leave.reason}</p>
                </div>

                <div className="leave-actions">
                  <button 
                    className="btn-approve"
                    onClick={() => handleApprove(leave._id)}
                  >
                    Approve
                  </button>
                  <button 
                    className="btn-reject"
                    onClick={() => handleReject(leave._id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeavePopup;
