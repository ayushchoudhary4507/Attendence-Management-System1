import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../services/api';
import './Attendance.css';

const Attendance = () => {
  const [status, setStatus] = useState('Present');
  const [notes, setNotes] = useState('');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // Refs for change detection
  const previousLeavesRef = useRef([]);
  const previousAttendanceRef = useRef(null);
  const changeCountRef = useRef(0);

  const [showLeaveDropdown, setShowLeaveDropdown] = useState(false);
  const [showLeaveSuccessPopup, setShowLeaveSuccessPopup] = useState(false);
  const [appliedLeaveType, setAppliedLeaveType] = useState('');
  const [applyLeaveLoading, setApplyLeaveLoading] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [myLeaves, setMyLeaves] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const leaveTypes = [
    { id: 'Paid Leave', label: ' Paid Leave', color: '#10B981' },
    { id: 'Casual Leave', label: 'Casual Leave', color: '#3B82F6' },
    { id: 'Sick Leave', label: 'Sick Leave', color: '#EF4444' },
    { id: 'Emergency Leave', label: ' Emergency Leave', color: '#F59E0B' },
    { id: 'Unpaid Leave', label: ' Unpaid Leave', color: '#6B7280' }
  ];

  const openLeaveForm = (leaveType) => {
    setAppliedLeaveType(leaveType);
    const today = new Date().toISOString().split('T')[0];
    setLeaveStartDate(today);
    setLeaveEndDate(today);
    setLeaveReason('');
    setShowLeaveForm(true);
    setShowLeaveDropdown(false);
  };

  const handleApplyLeave = async () => {
    if (!leaveStartDate || !leaveEndDate) {
      setMessage('Please select start and end dates');
      setMessageType('error');
      return;
    }

    setApplyLeaveLoading(true);
    
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/attendance/leave/apply-auto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leaveType: appliedLeaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          reason: leaveReason || `${appliedLeaveType} leave applied`,
          autoApprove: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowLeaveForm(false);
        setShowLeaveSuccessPopup(true);
        fetchMyLeaves(); // Refresh leaves list
      } else {
        setMessage(data.message || 'Failed to apply leave');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error applying leave. Please try again.');
      setMessageType('error');
    } finally {
      setApplyLeaveLoading(false);
    }
  };

  // Check today's attendance status
  const checkTodayAttendance = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        console.error('No token found - user not logged in');
        setMessage('Please login to access attendance');
        setMessageType('error');
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/attendance/my-today`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        console.error('Token expired or invalid - please login again');
        setMessage('Session expired. Please login again.');
        setMessageType('error');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setTodayAttendance(data.data);
        setLastUpdated(new Date());
        
        // Detect attendance changes
        const currentAttendance = data.data;
        const previousAttendance = previousAttendanceRef.current;
        
        if (JSON.stringify(currentAttendance) !== JSON.stringify(previousAttendance)) {
          console.log('🔄 ATTENDANCE CHANGE DETECTED');
          console.log('📊 Previous:', previousAttendance?.status || 'No data');
          console.log('📊 Current:', currentAttendance?.status || 'No data');
          console.log('⏰ Changed at:', new Date().toLocaleTimeString());
          console.log('---');
        }
        
        previousAttendanceRef.current = currentAttendance;
      }
    } catch (err) {
      console.error('Error checking attendance:', err);
    }
  };

  useEffect(() => {
    console.log('Attendance component mounted');
    checkTodayAttendance();
    fetchMyLeaves();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing attendance data...');
      checkTodayAttendance();
      fetchMyLeaves();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Mark attendance (Check In)
  const markAttendance = async () => {
    const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!currentToken) {
      setMessage('Please login to mark attendance');
      setMessageType('error');
      window.location.href = '/login';
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ status, notes })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Attendance marked successfully!');
        setMessageType('success');
        setTodayAttendance(data.data);
      } else {
        setMessage(data.message || 'Failed to mark attendance');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Check Out
  const checkOut = async () => {
    const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!currentToken) {
      setMessage('Please login to check out');
      setMessageType('error');
      window.location.href = '/login';
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/checkout`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Checked out successfully!');
        setMessageType('success');
        setTodayAttendance(data.data);
      } else {
        setMessage(data.message || 'Failed to check out');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Fetch my leaves
  const fetchMyLeaves = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/attendance/leave/my-leaves`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        console.error('Token expired');
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setMyLeaves(data.data || []);
        setLastUpdated(new Date());
        
        // Detect changes and log automatically
        const currentLeaves = data.data || [];
        const previousLeaves = previousLeavesRef.current;
        
        if (JSON.stringify(currentLeaves) !== JSON.stringify(previousLeaves)) {
          changeCountRef.current += 1;
          console.log(`🔄 CHANGE DETECTED #${changeCountRef.current}`);
          console.log('📊 Previous leaves:', previousLeaves.length, 'records');
          console.log('📊 Current leaves:', currentLeaves.length, 'records');
          console.log('📝 New leaves:', currentLeaves.filter(l => !previousLeaves.some(p => p._id === l._id)));
          console.log('❌ Removed leaves:', previousLeaves.filter(p => !currentLeaves.some(l => l._id === p._id)));
          console.log('⏰ Updated at:', new Date().toLocaleTimeString());
          console.log('---');
        }
        
        previousLeavesRef.current = currentLeaves;
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateDuration = () => {
    if (!todayAttendance?.checkInTime) return '--';
    const checkIn = new Date(todayAttendance.checkInTime);
    const checkOut = todayAttendance.checkOutTime 
      ? new Date(todayAttendance.checkOutTime) 
      : new Date();
    const diff = Math.floor((checkOut - checkIn) / (1000 * 60)); // minutes
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#10b981';
      case 'Absent': return '#ef4444';
      case 'Half Day': return '#f59e0b';
      case 'Leave': return '#6366f1';
      default: return '#10b981';
    }
  };

  return (
    <div className="attendance-page">
      <div className="attendance-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1>My Attendance</h1>
          <p>Mark your daily attendance and check-out when you leave</p>
          <div style={{ 
            fontSize: '12px', 
            color: '#6B7280', 
            marginTop: '5px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              background: '#10B981', 
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></span>
            Last updated: {lastUpdated.toLocaleTimeString()}
            <button
              onClick={() => {
                setIsRefreshing(true);
                checkTodayAttendance();
                fetchMyLeaves();
                setTimeout(() => setIsRefreshing(false), 1000);
              }}
              disabled={isRefreshing}
              style={{
                marginLeft: '10px',
                padding: '2px 8px',
                background: '#F3F4F6',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: isRefreshing ? 'not-allowed' : 'pointer'
              }}
            >
              {isRefreshing ? '🔄' : '🔄'} Refresh
            </button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowLeaveDropdown(!showLeaveDropdown)}
            disabled={applyLeaveLoading}
            style={{
              padding: '10px 20px',
              background: '#F59E0B',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: applyLeaveLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              opacity: applyLeaveLoading ? 0.7 : 1,
              minWidth: '180px'
            }}
          >
            {applyLeaveLoading ? (
              <div className="loading-container">
                <div className="loading-spinner" style={{ width: '18px', height: '18px' }}></div>
              </div>
            ) : ' Apply for Leave ▼'}
          </button>
          {showLeaveDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: '8px',
              padding: '8px 0',
              minWidth: '200px',
              zIndex: 100,
              marginTop: '8px'
            }}>
              {leaveTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => openLeaveForm(type.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: type.color,
                    borderBottom: '1px solid #F3F4F6'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      {/* Today's Status Card */}
      <div className="today-status-card">
        <div className="status-header">
          <h2>Today's Status</h2>
          <span className="current-date">{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>

        {todayAttendance ? (
          <div className="attendance-details">
            <div className="status-badge" style={{ 
              backgroundColor: getStatusColor(todayAttendance.status),
              color: 'white'
            }}>
              {todayAttendance.status}
            </div>
            
            <div className="time-stats">
              <div className="time-stat">
                <span className="time-label">Check In</span>
                <span className="time-value">{formatTime(todayAttendance.checkInTime)}</span>
              </div>
              <div className="time-stat">
                <span className="time-label">Check Out</span>
                <span className="time-value">
                  {todayAttendance.checkOutTime ? formatTime(todayAttendance.checkOutTime) : '--:--'}
                </span>
              </div>
              <div className="time-stat highlight">
                <span className="time-label">Duration</span>
                <span className="time-value">{calculateDuration()}</span>
              </div>
            </div>

            {todayAttendance.notes && (
              <div className="attendance-note">
                <strong>Note:</strong> {todayAttendance.notes}
              </div>
            )}

            {/* Action Button */}
            <div className="action-section">
              {todayAttendance.isActive ? (
                <button 
                  className="btn-checkout"
                  onClick={checkOut}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                    </div>
                  ) : 'Check Out'}
                </button>
              ) : (
                <div className="completed-message">
                  ✓ Attendance completed for today
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="no-attendance">
            <div className="no-attendance-icon">📋</div>
            <p>You haven't marked attendance for today yet.</p>
            
            {/* Mark Attendance Form */}
            <div className="mark-attendance-form">
              <div className="form-group">
                <label>Status:</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  className="status-select"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Notes (optional):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes..."
                  className="notes-input"
                />
              </div>

              <button 
                className="btn-checkin"
                onClick={markAttendance}
                disabled={loading}
              >
                {loading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                  </div>
                ) : 'Check In'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leave Form Modal */}
      {showLeaveForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1F2937', fontSize: '22px' }}>
               Apply for {appliedLeaveType} Leave
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Start Date:
              </label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                End Date:
              </label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                min={leaveStartDate}
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Reason (optional):
              </label>
              <textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Enter reason for leave..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '15px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLeaveForm(false)}
                disabled={applyLeaveLoading}
                style={{
                  padding: '12px 24px',
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyLeave}
                disabled={applyLeaveLoading}
                style={{
                  padding: '12px 24px',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: applyLeaveLoading ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  opacity: applyLeaveLoading ? 0.7 : 1
                }}
              >
                {applyLeaveLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner" style={{ width: '18px', height: '18px' }}></div>
                  </div>
                ) : 'Apply Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Success Popup */}
      {showLeaveSuccessPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              fontSize: '60px',
              marginBottom: '15px'
            }}>✅</div>
            <h2 style={{
              color: '#10B981',
              marginBottom: '10px',
              fontSize: '22px'
            }}>Leave Applied Successfully!</h2>
            <p style={{
              color: '#6B7280',
              marginBottom: '20px',
              fontSize: '16px'
            }}>
              Your <strong>{appliedLeaveType} Leave</strong> for today has been submitted successfully.
            </p>
            <p style={{
              color: '#9CA3AF',
              fontSize: '14px',
              marginBottom: '25px'
            }}>
              Status: <span style={{ color: '#F59E0B', fontWeight: '600' }}>⏳ Pending (Waiting for Admin Approval)</span>
            </p>
            <button
              onClick={() => setShowLeaveSuccessPopup(false)}
              style={{
                padding: '12px 30px',
                background: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600'
              }}
            >
              OK, Got it!
            </button>
          </div>
        </div>
      )}

      {/* My Leaves Section */}
      {myLeaves.length > 0 && (
        <div className="my-leaves-section" style={{
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            marginBottom: '20px', 
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
          My Leave Requests
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myLeaves.map((leave) => (
              <div 
                key={leave._id}
                style={{
                  background: '#F9FAFB',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <span style={{
                      fontSize: '14px',
                      color: '#6B7280',
                      fontWeight: '500'
                    }}>
                      {leave.leaveType}
                    </span>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: leave.status === 'Approved' ? '#D1FAE5' : 
                                     leave.status === 'Pending' ? '#FEF3C7' : '#FEE2E2',
                    color: leave.status === 'Approved' ? '#065F46' : 
                           leave.status === 'Pending' ? '#92400E' : '#991B1B'
                  }}>
                    {leave.status === 'Approved' ? '✅ Approved' : 
                     leave.status === 'Pending' ? ' Pending' : '❌ Rejected'}
                  </span>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px',
                  fontSize: '14px'
                }}>
                  <div>
                    <span style={{ color: '#6B7280' }}>From: </span>
                    <strong style={{ color: '#374151' }}>
                      {new Date(leave.startDate).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280' }}>To: </span>
                    <strong style={{ color: '#374151' }}>
                      {new Date(leave.endDate).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280' }}>Days: </span>
                    <strong style={{ color: '#374151' }}>{leave.totalDays}</strong>
                  </div>
                </div>
                
                {leave.reason && (
                  <div style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    background: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}>
                    <strong>Reason:</strong> {leave.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="attendance-instructions">
        <h3>How it works:</h3>
        <ul>
          <li>Click <strong>"Check In"</strong> when you start your work day</li>
          <li>Click <strong>"Check Out"</strong> when you finish your work day</li>
          <li>Your work hours will be calculated automatically</li>
          <li>You can only mark attendance once per day</li>
        </ul>
      </div>
    </div>
  );
};

export default Attendance;
