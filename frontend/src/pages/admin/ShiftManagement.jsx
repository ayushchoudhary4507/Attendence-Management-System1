import { useState, useEffect } from 'react';
import { shiftAPI } from '../../services/api';
import './ShiftManagement.css';

const ShiftManagement = ({ user }) => {
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shifts');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    shiftName: 'Morning',
    startTime: '09:00',
    endTime: '17:00',
    description: ''
  });
  const [assignData, setAssignData] = useState({
    employeeIds: [],
    shiftId: '',
    dates: []
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchShifts();
    fetchAssignments();
    fetchEmployees();
  }, []);

  const fetchShifts = async () => {
    try {
      const data = await shiftAPI.getAllShifts();
      if (data.success) setShifts(data.data);
    } catch (err) {
      console.error('Error fetching shifts:', err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const data = await shiftAPI.getAllAssignments();
      if (data.success) setAssignments(data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch('http://localhost:5005/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setEmployees(data.employees || data.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      const data = await shiftAPI.createShift(formData);
      if (data.success) {
        setMessage({ type: 'success', text: 'Shift created successfully!' });
        setShowCreateModal(false);
        setFormData({ shiftName: 'Morning', startTime: '09:00', endTime: '17:00', description: '' });
        fetchShifts();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to create shift' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error creating shift' });
    }
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();
    try {
      const data = await shiftAPI.assignShift(assignData);
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowAssignModal(false);
        setAssignData({ employeeIds: [], shiftId: '', dates: [] });
        fetchAssignments();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to assign shift' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error assigning shift' });
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;
    try {
      const data = await shiftAPI.deleteShift(id);
      if (data.success) {
        setMessage({ type: 'success', text: 'Shift deleted successfully' });
        fetchShifts();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting shift' });
    }
  };

  const handleRemoveAssignment = async (id) => {
    if (!window.confirm('Remove this shift assignment?')) return;
    try {
      const data = await shiftAPI.removeAssignment(id);
      if (data.success) {
        setMessage({ type: 'success', text: 'Assignment removed' });
        fetchAssignments();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error removing assignment' });
    }
  };

  const toggleEmployeeSelection = (empId) => {
    setAssignData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(empId)
        ? prev.employeeIds.filter(id => id !== empId)
        : [...prev.employeeIds, empId]
    }));
  };

  const handleDateToggle = (dateStr) => {
    setAssignData(prev => ({
      ...prev,
      dates: prev.dates.includes(dateStr)
        ? prev.dates.filter(d => d !== dateStr)
        : [...prev.dates, dateStr]
    }));
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="shift-management">
      <div className="page-header">
        <div className="header-left">
          <h1>Shift Management</h1>
          <p>Create and assign shifts to employees</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Create Shift
          </button>
          <button className="btn btn-secondary" onClick={() => { setShowAssignModal(true); setAssignData(prev => ({ ...prev, shiftId: shifts[0]?._id || '' })); }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            Assign Shift
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'shifts' ? 'active' : ''}`} onClick={() => setActiveTab('shifts')}>Shifts</button>
        <button className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>Assignments</button>
      </div>

      {activeTab === 'shifts' && (
        <div className="shifts-grid">
          {shifts.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <h3>No Shifts Created</h3>
              <p>Create your first shift to get started</p>
            </div>
          ) : (
            shifts.map(shift => (
              <div key={shift._id} className="shift-card">
                <div className="shift-card-header">
                  <span className={`shift-badge shift-${shift.shiftName.toLowerCase()}`}>{shift.shiftName}</span>
                  <div className="shift-card-actions">
                    <button className="btn-icon danger" onClick={() => handleDeleteShift(shift._id)} title="Delete">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </div>
                </div>
                <div className="shift-card-body">
                  <div className="shift-time">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                  </div>
                  {shift.description && <p className="shift-desc">{shift.description}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="assignments-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Shift</th>
                <th>Date</th>
                <th>Time</th>
                <th>Notified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan="6" className="empty-cell">No shift assignments yet</td></tr>
              ) : (
                assignments.map(a => (
                  <tr key={a._id}>
                    <td>{a.employeeId?.name || 'N/A'}</td>
                    <td><span className={`shift-badge shift-${(a.shiftId?.shiftName || '').toLowerCase()}`}>{a.shiftId?.shiftName || 'N/A'}</span></td>
                    <td>{new Date(a.date).toLocaleDateString()}</td>
                    <td>{a.shiftId ? `${formatTime(a.shiftId.startTime)} - ${formatTime(a.shiftId.endTime)}` : 'N/A'}</td>
                    <td>{a.isNotified ? <span className="badge badge-success">Yes</span> : <span className="badge badge-warning">No</span>}</td>
                    <td>
                      <button className="btn-icon danger" onClick={() => handleRemoveAssignment(a._id)} title="Remove">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Shift Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Shift</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateShift}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Shift Name</label>
                  <select value={formData.shiftName} onChange={e => setFormData({ ...formData, shiftName: e.target.value })}>
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Regular morning shift" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Shift Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Shift to Employees</h2>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <form onSubmit={handleAssignShift}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Shift</label>
                  <select value={assignData.shiftId} onChange={e => setAssignData({ ...assignData, shiftId: e.target.value })} required>
                    <option value="">-- Select Shift --</option>
                    {shifts.map(s => (
                      <option key={s._id} value={s._id}>{s.shiftName} ({formatTime(s.startTime)} - {formatTime(s.endTime)})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Select Employees</label>
                  <div className="employee-checkbox-grid">
                    {employees.map(emp => (
                      <label key={emp._id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={assignData.employeeIds.includes(emp._id)}
                          onChange={() => toggleEmployeeSelection(emp._id)}
                        />
                        <span>{emp.name} ({emp.designation})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Dates</label>
                  <div className="date-checkbox-grid">
                    {getNext7Days().map(dateStr => {
                      const date = new Date(dateStr + 'T00:00:00');
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <label key={dateStr} className="checkbox-label date-label">
                          <input
                            type="checkbox"
                            checked={assignData.dates.includes(dateStr)}
                            onChange={() => handleDateToggle(dateStr)}
                          />
                          <span>{dayName}, {displayDate}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!assignData.shiftId || assignData.employeeIds.length === 0 || assignData.dates.length === 0}>
                  Assign Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;
