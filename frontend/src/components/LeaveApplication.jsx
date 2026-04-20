import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import './LeaveApplication.css';

const LeaveApplication = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    leaveType: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      startDate: today,
      endDate: today
    }));
  }, []);

  const leaveTypes = [
    { id: 'Paid Leave', label: 'Paid Leave' },
    { id: 'Casual Leave', label: 'Casual Leave' },
    { id: 'Sick Leave', label: 'Sick Leave' },
    { id: 'Emergency Leave', label: 'Emergency Leave' },
    { id: 'Unpaid Leave', label: 'Unpaid Leave' }
  ];

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await attendanceAPI.applyLeave(formData);
      if (response.success) {
        onSubmit?.(response.data);
        onClose?.();
      } else {
        setError(response.message || 'Failed to apply leave');
      }
    } catch (err) {
      setError('Error applying leave. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="leave-application-overlay">
      <div className="leave-application-modal">
        <div className="leave-application-header">
          <h2>Apply for Leave</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="leave-application-form">
          <div className="form-group">
            <label>Leave Type</label>
            <select 
              name="leaveType" 
              value={formData.leaveType}
              onChange={handleChange}
              required
            >
              {leaveTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate}
                required
              />
            </div>
          </div>

          <div className="days-summary">
            <span>Total Days: <strong>{calculateDays()}</strong></span>
          </div>

          <div className="form-group">
            <label>Reason</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
              placeholder="Enter reason for leave..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Apply Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveApplication;
