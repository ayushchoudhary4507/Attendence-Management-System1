import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, attendanceAPI } from '../../services/api';
import LiveQRGeoVerificationModal from './LiveQRGeoVerificationModal';
import './Attendance.css';

const Attendance = () => {
  // Role-based system: admin sees GPS + Standard check-in controls, employee sees simple check-in
  const storedUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
  const userRole = (storedUser.role || localStorage.getItem('role') || sessionStorage.getItem('role') || 'employee').toLowerCase();
  const isAdmin = userRole === 'admin';
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

  // Admin-only: GPS & Standard Time verification state
  const [adminCheckMode, setAdminCheckMode] = useState(null); // 'gps' | 'standard' | 'qr' | null
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | fetching | success | error
  const [gpsCoords, setGpsCoords] = useState(null);
  const [standardTimeNote, setStandardTimeNote] = useState('');
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false); // QR/Barcode scan modal
  const [qrModalTab, setQrModalTab] = useState('kiosk_qr');

  // Admin-only: Staff Attendance Records & Time Editing
  const [allStaffAttendance, setAllStaffAttendance] = useState([]);
  const [staffAttendanceLoading, setStaffAttendanceLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    checkInTime: '',
    checkOutTime: '',
    status: 'Present',
    notes: '',
    clearCheckOut: false
  });
  const [savingEdit, setSavingEdit] = useState(false);

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

  // Fetch today's staff attendance records for admin
  const fetchStaffAttendance = async () => {
    if (!isAdmin) return;
    try {
      setStaffAttendanceLoading(true);
      const res = await attendanceAPI.getTodayAttendanceStatus();
      if (res && res.success && Array.isArray(res.data)) {
        // Filter employees with active or marked attendance today
        const markedEmployees = res.data.filter(emp => emp.attendanceToday && (emp.attendanceToday.checkInTime || emp.attendanceToday.status));
        setAllStaffAttendance(markedEmployees);
      }
    } catch (err) {
      console.error('Error fetching staff attendance for admin:', err);
    } finally {
      setStaffAttendanceLoading(false);
    }
  };

  const toTimeInputValue = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const handleOpenEditAttendance = (employeeRecord) => {
    const att = employeeRecord.attendanceToday;
    if (!att) return;
    setEditingRecord({
      ...att,
      employeeName: employeeRecord.name,
      employeeEmail: employeeRecord.email,
      empId: employeeRecord._id
    });
    setEditForm({
      checkInTime: toTimeInputValue(att.checkInTime) || '09:30',
      checkOutTime: toTimeInputValue(att.checkOutTime) || '',
      status: att.status || 'Present',
      notes: att.notes || '',
      clearCheckOut: false
    });
  };

  const handleSaveAttendanceEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord?._id) return;
    
    try {
      setSavingEdit(true);
      const updatePayload = {
        status: editForm.status,
        notes: editForm.notes
      };

      const baseDate = editingRecord.date ? new Date(editingRecord.date) : new Date();

      if (editForm.checkInTime) {
        const [h, m] = editForm.checkInTime.split(':');
        const checkInDate = new Date(baseDate);
        checkInDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        updatePayload.checkInTime = checkInDate.toISOString();
      }

      if (editForm.checkOutTime) {
        const [h, m] = editForm.checkOutTime.split(':');
        const checkOutDate = new Date(baseDate);
        checkOutDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        updatePayload.checkOutTime = checkOutDate.toISOString();
      } else if (editForm.clearCheckOut) {
        updatePayload.checkOutTime = null;
      }

      const res = await attendanceAPI.updateAttendance(editingRecord._id, updatePayload);
      if (res && res.success) {
        setMessage(`✅ Updated attendance time for ${editingRecord.employeeName || 'employee'}`);
        setMessageType('success');
        setEditingRecord(null);
        fetchStaffAttendance();
        checkTodayAttendance();
        setTimeout(() => setMessage(''), 4000);
      } else {
        alert(res.message || 'Failed to update attendance time');
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
      alert('Error updating attendance: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    console.log('Attendance component mounted');
    checkTodayAttendance();
    fetchMyLeaves();
    if (isAdmin) {
      fetchStaffAttendance();
    }

    const handleSync = (event) => {
      console.log('🔄 [Attendance Page] Attendance updated event received, refreshing data...', event?.detail);
      checkTodayAttendance();
      if (isAdmin) fetchStaffAttendance();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkTodayAttendance();
        if (isAdmin) fetchStaffAttendance();
      }
    };

    window.addEventListener('attendance_updated', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);

    const timer = setInterval(() => {
      checkTodayAttendance();
      if (isAdmin) fetchStaffAttendance();
    }, 25000);

    return () => {
      window.removeEventListener('attendance_updated', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(timer);
    };
  }, [isAdmin]);

  // Admin GPS Check-In
  const handleGpsCheckIn = async () => {
    if (!navigator.geolocation) {
      setMessage('GPS not supported on this device/browser');
      setMessageType('error');
      return;
    }
    setGpsStatus('fetching');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsCoords({ latitude, longitude, accuracy });
        setGpsStatus('success');
        // Now mark attendance with GPS metadata
        const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
        setAdminCheckLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({
              status: 'Present',
              notes: `GPS Check-in | Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)} | Accuracy: ${Math.round(accuracy)}m`,
              verificationMethod: 'gps',
              location: { lat: latitude, lng: longitude, accuracy }
            })
          });
          const data = await response.json();
          if (response.ok) {
            setMessage(`✅ GPS Check-in successful! Location captured with ${Math.round(accuracy)}m accuracy.`);
            setMessageType('success');
            setTodayAttendance(data.data);
            setAdminCheckMode(null);
          } else {
            setMessage(data.message || 'GPS check-in failed');
            setMessageType('error');
          }
        } catch (err) {
          setMessage('Server error during GPS check-in');
          setMessageType('error');
        } finally {
          setAdminCheckLoading(false);
          setTimeout(() => setMessage(''), 5000);
        }
      },
      (err) => {
        setGpsStatus('error');
        setMessage('Unable to get location. Please allow location access.');
        setMessageType('error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Admin Standard Time Check-In
  const handleStandardCheckIn = async () => {
    const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
    setAdminCheckLoading(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const shiftStart = new Date();
      shiftStart.setHours(9, 30, 0, 0);
      const gracePeriod = new Date();
      gracePeriod.setHours(9, 45, 0, 0);
      const isOnTime = now <= gracePeriod;
      const isLate = now > gracePeriod;
      const noteText = standardTimeNote || `Standard Time Check-in at ${timeStr} | ${isOnTime ? 'On Time' : 'Late Arrival'}`;
      const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({
          status: isLate ? 'Half Day' : 'Present',
          notes: noteText,
          verificationMethod: 'standard'
        })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`✅ Standard check-in at ${timeStr}${isLate ? ' (Late Arrival - marked Half Day)' : ' - On Time!'}`);
        setMessageType('success');
        setTodayAttendance(data.data);
        setAdminCheckMode(null);
        setStandardTimeNote('');
      } else {
        setMessage(data.message || 'Check-in failed');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
      setMessageType('error');
    } finally {
      setAdminCheckLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

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

      if (response.ok && data.data) {
        setTodayAttendance(data.data);
        const checkIn = new Date(data.data.checkInTime);
        const checkOutTime = new Date(data.data.checkOutTime || Date.now());
        const diffMs = Math.max(0, checkOutTime - checkIn);
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setMessage(`🎉 Checked out successfully! Total work time today: ${hours} Hours ${minutes} Minutes.`);
        setMessageType('success');
      } else {
        setMessage(data.message || 'Failed to check out');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 6000);
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
          <h1>Attendance & Leaves</h1>
          <p>Mark daily presence, track shift durations, and manage leave applications</p>
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
              className="btn-refresh-attendance"
              title="Refresh attendance status"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowLeaveDropdown(!showLeaveDropdown)}
            disabled={applyLeaveLoading}
            className="btn-apply-leave"
          >
            {applyLeaveLoading ? (
              <div className="loading-container">
                <div className="loading-spinner" style={{ width: '18px', height: '18px' }}></div>
              </div>
            ) : 'Apply for Leave ▼'}
          </button>
          {showLeaveDropdown && (
            <div className="leave-dropdown-menu">
              {leaveTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => openLeaveForm(type.id)}
                  className="leave-dropdown-item"
                  style={{ color: type.color }}
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
          <div className="status-title-group">
            <h2>Today's Status</h2>
            <span className="status-subtitle">Mark your daily entry and track working progress</span>
          </div>
          <div className="status-header-meta">
            <span className="current-date">
              📅 {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>

        {todayAttendance ? (
          <div className="attendance-details">
            <div className="status-badge-wrapper">
              <span className="status-badge" style={{ 
                backgroundColor: getStatusColor(todayAttendance.status),
                color: 'white'
              }}>
                ● {todayAttendance.status}
              </span>
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
                  ) : '🚪 Check Out Now'}
                </button>
              ) : (
                <div className="completed-message">
                  ✓ Attendance completed for today
                </div>
              )}
            </div>
          </div>
        ) : isAdmin ? (
          /* ── ADMIN ROLE: GPS + Standard Time Check-in Panel ── */
          <div className="admin-checkin-panel">
            <div className="admin-checkin-header">
              <span className="admin-role-badge">🛡️ Admin Mode</span>
              <h3>Select Verification Method</h3>
              <p>Choose how to record today's attendance — GPS capture, standard shift-time, or generate office QR code</p>
            </div>

            <div className="admin-checkin-methods">
              {/* GPS Method */}
              <div
                className={`checkin-method-card ${adminCheckMode === 'gps' ? 'selected' : ''}`}
                onClick={() => { setAdminCheckMode('gps'); setGpsStatus('idle'); setGpsCoords(null); }}
              >
                <div className="method-icon gps-icon">📍</div>
                <div className="method-info">
                  <h4>GPS Verification</h4>
                  <p>Capture live coordinates &amp; verify office proximity</p>
                  <span className="method-tag">High Accuracy</span>
                </div>
                <div className={`method-radio ${adminCheckMode === 'gps' ? 'active' : ''}`}></div>
              </div>

              {/* Standard Time Method */}
              <div
                className={`checkin-method-card ${adminCheckMode === 'standard' ? 'selected' : ''}`}
                onClick={() => setAdminCheckMode('standard')}
              >
                <div className="method-icon time-icon">🕒</div>
                <div className="method-info">
                  <h4>Standard Time Check-in</h4>
                  <p>Time-stamp based — auto marks late arrival after 09:45 AM</p>
                  <span className="method-tag">Shift-Based</span>
                </div>
                <div className={`method-radio ${adminCheckMode === 'standard' ? 'active' : ''}`}></div>
              </div>

              {/* Generate Office QR Code Method */}
              <div
                className={`checkin-method-card ${adminCheckMode === 'qr' ? 'selected' : ''}`}
                onClick={() => { 
                  setAdminCheckMode('qr'); 
                  setQrModalTab('kiosk_qr');
                  setShowQRModal(true); 
                }}
              >
                <div className="method-icon qr-icon">🔲</div>
                <div className="method-info">
                  <h4>Generate Office QR Code</h4>
                  <p>Display live rotating QR code for employee mobile check-ins</p>
                  <span className="method-tag qr-tag">Office Kiosk QR</span>
                </div>
                <div className={`method-radio ${adminCheckMode === 'qr' ? 'active' : ''}`}></div>
              </div>
            </div>

            {/* GPS Panel Detail */}
            {adminCheckMode === 'gps' && (
              <div className="method-detail-panel">
                <div className="method-detail-header">
                  <span>📍 GPS Location Capture</span>
                  {gpsStatus === 'success' && gpsCoords && (
                    <span className="gps-success-badge">✅ Location Acquired</span>
                  )}
                </div>
                {gpsStatus === 'idle' && (
                  <p className="method-hint">Click the button below to capture your current GPS coordinates. Ensure location permissions are enabled in your browser.</p>
                )}
                {gpsStatus === 'fetching' && (
                  <div className="gps-fetching">
                    <div className="gps-pulse"></div>
                    <p>Acquiring GPS signal...</p>
                  </div>
                )}
                {gpsStatus === 'success' && gpsCoords && (
                  <div className="gps-coords-display">
                    <div className="coord-item">
                      <span className="coord-label">Latitude</span>
                      <span className="coord-value">{gpsCoords.latitude.toFixed(6)}°</span>
                    </div>
                    <div className="coord-item">
                      <span className="coord-label">Longitude</span>
                      <span className="coord-value">{gpsCoords.longitude.toFixed(6)}°</span>
                    </div>
                    <div className="coord-item">
                      <span className="coord-label">Accuracy</span>
                      <span className="coord-value">{Math.round(gpsCoords.accuracy)}m</span>
                    </div>
                  </div>
                )}
                {gpsStatus === 'error' && (
                  <p className="gps-error">⚠️ Could not access location. Check browser permissions.</p>
                )}
                <button
                  className="btn-admin-checkin gps-btn"
                  onClick={handleGpsCheckIn}
                  disabled={adminCheckLoading || gpsStatus === 'fetching'}
                >
                  {adminCheckLoading ? (
                    <><div className="loading-spinner sm"></div> Marking Attendance...</>
                  ) : gpsStatus === 'fetching' ? (
                    '📡 Acquiring Signal...'
                  ) : gpsStatus === 'success' ? (
                    '✅ Confirm GPS Check-in'
                  ) : (
                    '📍 Capture Location & Check In'
                  )}
                </button>
              </div>
            )}

            {/* Standard Time Panel Detail */}
            {adminCheckMode === 'standard' && (
              <div className="method-detail-panel">
                <div className="method-detail-header">
                  <span>🕒 Standard Time Check-in</span>
                  <span className="time-now-badge">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </div>
                <div className="shift-details-grid">
                  <div className="shift-detail-item">
                    <span className="shift-detail-icon">⏰</span>
                    <div>
                      <strong>Shift Start</strong>
                      <p>09:30 AM</p>
                    </div>
                  </div>
                  <div className="shift-detail-item">
                    <span className="shift-detail-icon">⚡</span>
                    <div>
                      <strong>Grace Period</strong>
                      <p>Until 09:45 AM</p>
                    </div>
                  </div>
                  <div className="shift-detail-item">
                    <span className="shift-detail-icon">🏁</span>
                    <div>
                      <strong>Shift End</strong>
                      <p>06:30 PM</p>
                    </div>
                  </div>
                  <div className="shift-detail-item">
                    <span className="shift-detail-icon">📊</span>
                    <div>
                      <strong>Total Hours</strong>
                      <p>9 Hours / Day</p>
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Note (optional)</label>
                  <input
                    type="text"
                    value={standardTimeNote}
                    onChange={(e) => setStandardTimeNote(e.target.value)}
                    placeholder="e.g. Working from HQ / Client visit..."
                    className="notes-input"
                  />
                </div>
                <button
                  className="btn-admin-checkin standard-btn"
                  onClick={handleStandardCheckIn}
                  disabled={adminCheckLoading}
                >
                  {adminCheckLoading ? (
                    <><div className="loading-spinner sm"></div> Marking Attendance...</>
                  ) : '🕒 Confirm Standard Check-in'}
                </button>
              </div>
            )}

            {/* Generate QR Code Panel Detail */}
            {adminCheckMode === 'qr' && !showQRModal && (
              <div className="method-detail-panel">
                <div className="method-detail-header">
                  <span className="method-detail-title">🔲 Office QR Code Generator</span>
                  <span className="gps-success-badge" style={{ background: '#ede9fe', border: '1px solid #c7d2fe', color: '#4f46e5' }}>Kiosk Mode</span>
                </div>
                <p className="method-detail-desc">
                  Generate a live rotating QR code for your reception, office entrance, or display screen. Employees can scan the code with their mobile app cameras to record their daily attendance instantly.
                </p>
                <button
                  className="btn-admin-checkin"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(99,102,241,0.35)',
                    marginTop: '14px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '14px 24px',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setQrModalTab('kiosk_qr');
                    setShowQRModal(true);
                  }}
                >
                  🔲 Launch Live Office QR Code Screen
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── EMPLOYEE ROLE: Simple Check-in ── */
          <div className="checkin-container-grid">
            {/* Left Column: Check In Form */}
            <div className="checkin-form-card">
              <div className="form-header-badge">
                <span className="badge-dot"></span>
                <span>Not Marked For Today</span>
              </div>

              <div className="mark-attendance-form">
                <div className="form-group">
                  <label>Status</label>
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
                  <label>Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Working from office / Remote..."
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
                  ) : '✓ Standard Check In'}
                </button>

                <div style={{ marginTop: '12px' }}>
                  <button 
                    type="button"
                    className="btn-checkin"
                    style={{ 
                      background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                    }}
                    onClick={() => setShowQRModal(true)}
                  >
                    <span>⚡ AI Face Lock / QR / GPS Verification Hub</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Shift / Guidelines Widget */}
            <div className="shift-info-widget">
              <h3>Shift Guidelines</h3>
              <div className="shift-info-item">
                <span className="info-icon">⏰</span>
                <div className="info-text">
                  <strong>Standard Shift</strong>
                  <p>09:30 AM - 06:30 PM (9 Hours)</p>
                </div>
              </div>
              <div className="shift-info-item">
                <span className="info-icon">⚡</span>
                <div className="info-text">
                  <strong>Grace Period</strong>
                  <p>Check in before 09:45 AM to avoid late mark</p>
                </div>
              </div>
              <div className="shift-info-item">
                <span className="info-icon">📊</span>
                <div className="info-text">
                  <strong>Automatic Tracking</strong>
                  <p>Work hours and duration calculate automatically on checkout</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ADMIN ONLY: Today's Staff Attendance Records & Time Edit Section ── */}
      {isAdmin && (
        <div className="admin-staff-attendance-section">
          <div className="staff-attendance-header">
            <div>
              <div className="admin-section-tag">ADMIN TIMESHEET CONTROL</div>
              <h2>Today's Staff Attendance Records</h2>
              <p>View all employee check-ins for today. Click <strong>Edit Time</strong> to adjust arrival/departure time.</p>
            </div>
            <div className="staff-header-actions">
              <span className="staff-count-badge">
                {allStaffAttendance.length} Checked In Today
              </span>
              <button
                onClick={fetchStaffAttendance}
                disabled={staffAttendanceLoading}
                className="btn-refresh-staff"
                title="Refresh staff records"
              >
                {staffAttendanceLoading ? '⏳ Refreshing...' : '🔄 Refresh List'}
              </button>
            </div>
          </div>

          {staffAttendanceLoading && allStaffAttendance.length === 0 ? (
            <div className="staff-loading-card">
              <div className="loading-spinner"></div>
              <p>Loading today's attendance records...</p>
            </div>
          ) : allStaffAttendance.length === 0 ? (
            <div className="staff-empty-card">
              <div className="empty-icon">👥</div>
              <h4>No Employee Attendance Records Yet Today</h4>
              <p>When employees check in via Standard, GPS, or QR Code, their time records will appear here for admin adjustments.</p>
            </div>
          ) : (
            <div className="staff-attendance-grid">
              {allStaffAttendance.map((emp) => {
                const att = emp.attendanceToday || {};
                const checkInStr = att.checkInTime ? formatTime(att.checkInTime) : '--:--';
                const checkOutStr = att.checkOutTime ? formatTime(att.checkOutTime) : (att.isActive ? '🟢 In Progress' : '--:--');
                
                // Calculate duration
                let durationStr = '--';
                if (att.checkInTime) {
                  const checkIn = new Date(att.checkInTime);
                  const checkOut = att.checkOutTime ? new Date(att.checkOutTime) : new Date();
                  const diffMin = Math.max(0, Math.floor((checkOut - checkIn) / (1000 * 60)));
                  const h = Math.floor(diffMin / 60);
                  const m = diffMin % 60;
                  durationStr = `${h}h ${m}m`;
                }

                return (
                  <div key={emp._id || att._id} className="staff-record-card">
                    <div className="staff-record-top">
                      <div className="staff-info-col">
                        <div className="staff-avatar-initial">
                          {(emp.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong className="staff-name">{emp.name}</strong>
                          <span className="staff-email">{emp.email}</span>
                        </div>
                      </div>
                      <div className="staff-status-col">
                        <span className={`status-pill ${att.status?.toLowerCase() || 'present'}`}>
                          ● {att.status || 'Present'}
                        </span>
                        {att.verificationMethod && (
                          <span className="method-pill">
                            {att.verificationMethod === 'gps' || att.verificationMethod === 'geolocation' ? '📍 GPS' :
                             att.verificationMethod === 'qr_code' ? '📷 QR' : '🕒 Standard'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="staff-times-row">
                      <div className="staff-time-box">
                        <span className="time-sub-label">Check In</span>
                        <strong className="time-val-strong">{checkInStr}</strong>
                      </div>
                      <div className="staff-time-box">
                        <span className="time-sub-label">Check Out</span>
                        <strong className="time-val-strong">{checkOutStr}</strong>
                      </div>
                      <div className="staff-time-box highlight-box">
                        <span className="time-sub-label">Duration</span>
                        <strong className="time-val-strong">{durationStr}</strong>
                      </div>
                    </div>

                    {att.notes && (
                      <div className="staff-note-preview">
                        <strong>Note:</strong> {att.notes}
                      </div>
                    )}

                    <div className="staff-action-bar">
                      <button
                        className="btn-edit-staff-time"
                        onClick={() => handleOpenEditAttendance(emp)}
                      >
                        ✏️ Edit Time &amp; Status
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ADMIN: Edit Attendance Time Modal ── */}
      {isAdmin && editingRecord && (
        <div className="admin-time-modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="admin-time-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-time-modal-header">
              <div>
                <span className="modal-tag">ADMIN TIME EDITOR</span>
                <h3>Edit Attendance Record</h3>
                <p>Modify logged hours and status for <strong>{editingRecord.employeeName}</strong></p>
              </div>
              <button className="btn-close-modal" onClick={() => setEditingRecord(null)}>×</button>
            </div>

            <form onSubmit={handleSaveAttendanceEdit} className="admin-time-form">
              <div className="time-inputs-grid">
                <div className="form-group">
                  <label>🕒 Check-In Time</label>
                  <input
                    type="time"
                    value={editForm.checkInTime}
                    onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                    required
                    className="time-input-field"
                  />
                  <span className="field-hint">Original: {editingRecord.checkInTime ? formatTime(editingRecord.checkInTime) : 'N/A'}</span>
                </div>

                <div className="form-group">
                  <label>🚪 Check-Out Time</label>
                  <input
                    type="time"
                    value={editForm.checkOutTime}
                    onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value, clearCheckOut: false })}
                    className="time-input-field"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span className="field-hint">Original: {editingRecord.checkOutTime ? formatTime(editingRecord.checkOutTime) : 'Not checked out'}</span>
                    {editForm.checkOutTime && (
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, checkOutTime: '', clearCheckOut: true })}
                        className="btn-clear-checkout"
                      >
                        Reset Check-out
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>📌 Attendance Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="status-select-field"
                >
                  <option value="Present">Present</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>📝 Admin Note / Adjustment Reason</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="e.g. Adjusted check-in time per manager approval"
                  className="note-input-field"
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={() => setEditingRecord(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save-time"
                  disabled={savingEdit}
                >
                  {savingEdit ? '💾 Saving Updates...' : '💾 Save Time Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showLeaveForm && (
        <div className="leave-modal-overlay">
          <div className="leave-modal-card">
            <h2 className="leave-modal-title">
              Apply for {appliedLeaveType?.toLowerCase().endsWith('leave') ? appliedLeaveType : `${appliedLeaveType} Leave`}
            </h2>
            
            <div className="leave-form-group">
              <label className="leave-form-label">
                Start Date:
              </label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                className="leave-form-input"
              />
            </div>
            
            <div className="leave-form-group">
              <label className="leave-form-label">
                End Date:
              </label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                min={leaveStartDate}
                className="leave-form-input"
              />
            </div>
            
            <div className="leave-form-group" style={{ marginBottom: '25px' }}>
              <label className="leave-form-label">
                Reason (optional):
              </label>
              <textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Enter reason for leave..."
                rows="3"
                className="leave-form-textarea"
              />
            </div>
            
            <div className="leave-modal-actions">
              <button
                type="button"
                onClick={() => setShowLeaveForm(false)}
                disabled={applyLeaveLoading}
                className="btn-leave-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyLeave}
                disabled={applyLeaveLoading}
                className="btn-leave-submit"
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
        <div className="leave-modal-overlay">
          <div className="leave-success-card">
            <div className="leave-success-icon">✅</div>
            <h2 className="leave-success-title">Leave Applied Successfully!</h2>
            <p className="leave-success-desc">
              Your <strong>{appliedLeaveType?.toLowerCase().endsWith('leave') ? appliedLeaveType : `${appliedLeaveType} Leave`}</strong> for today has been submitted successfully.
            </p>
            <div style={{ marginBottom: '25px' }}>
              <span className="leave-success-status">
                ⏳ Pending (Waiting for Admin Approval)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLeaveSuccessPopup(false)}
              className="btn-leave-submit"
              style={{ width: '100%' }}
            >
              OK, Got it!
            </button>
          </div>
        </div>
      )}

      {/* My Leaves Section */}
      {myLeaves.length > 0 && (
        <div className="my-leaves-section">
          <div className="my-leaves-header">
            <h2>
              <span>📋 My Leave Requests</span>
              <span className="leaves-count-badge">{myLeaves.length} Total</span>
            </h2>
          </div>
          
          <div className="leaves-list-grid">
            {myLeaves.map((leave) => (
              <div key={leave._id} className="leave-request-card">
                <div className="leave-card-top">
                  <div className="leave-type-info">
                    <span className="leave-type-name">{leave.leaveType}</span>
                  </div>
                  <span className={`leave-status-pill ${leave.status?.toLowerCase()}`}>
                    {leave.status === 'Approved' ? '✓ Approved' : 
                     leave.status === 'Pending' ? '⏳ Pending' : '✕ Rejected'}
                  </span>
                </div>
                
                <div className="leave-dates-row">
                  <div className="leave-date-col">
                    <span className="date-label">From</span>
                    <strong className="date-val">{new Date(leave.startDate).toLocaleDateString()}</strong>
                  </div>
                  <div className="leave-date-col">
                    <span className="date-label">To</span>
                    <strong className="date-val">{new Date(leave.endDate).toLocaleDateString()}</strong>
                  </div>
                  <div className="leave-date-col">
                    <span className="date-label">Total Duration</span>
                    <strong className="date-val">{leave.totalDays} {leave.totalDays === 1 ? 'Day' : 'Days'}</strong>
                  </div>
                </div>
                
                {leave.reason && (
                  <div className="leave-reason-box">
                    <span className="reason-label">Reason:</span>
                    <span className="reason-text">{leave.reason}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Verification Modal (GPS / QR / Face Lock) */}
      <LiveQRGeoVerificationModal
        isOpen={showQRModal}
        initialTab={qrModalTab}
        onClose={() => { setShowQRModal(false); setAdminCheckMode(null); }}
        onSuccess={(attendanceData) => {
          setTodayAttendance(attendanceData);
          checkTodayAttendance();
          if (isAdmin) fetchStaffAttendance();
          setMessage('✅ AI Face Verification successful! Attendance synchronized.');
          setMessageType('success');
          setShowQRModal(false);
          setAdminCheckMode(null);
          setTimeout(() => setMessage(''), 5000);
        }}
        user={storedUser}
      />
    </div>
  );
};

export default Attendance;
