import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, attendanceAPI } from '../../services/api';
import LiveQRGeoVerificationModal from './LiveQRGeoVerificationModal';
import './Attendance.css';

const Attendance = () => {
  // Stored User & Role Isolation
  const storedUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
  const userRole = (storedUser.role || localStorage.getItem('role') || sessionStorage.getItem('role') || 'employee').toLowerCase();
  const isAdmin = userRole === 'admin';

  // Common Attendance States
  const [status, setStatus] = useState('Present');
  const [notes, setNotes] = useState('');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Leave Application & Personal Leaves States
  const [showLeaveDropdown, setShowLeaveDropdown] = useState(false);
  const [showLeaveSuccessPopup, setShowLeaveSuccessPopup] = useState(false);
  const [appliedLeaveType, setAppliedLeaveType] = useState('');
  const [applyLeaveLoading, setApplyLeaveLoading] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [myLeaves, setMyLeaves] = useState([]);

  // Verification & Scanner Modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [adminCheckMode, setAdminCheckMode] = useState(null); // 'gps' | 'standard' | 'qr' | null
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [standardTimeNote, setStandardTimeNote] = useState('');
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // EMPLOYEE-SPECIFIC STATES (STRICT PRIVACY & PERSONAL HISTORY)
  // ─────────────────────────────────────────────────────────────
  const [myStats, setMyStats] = useState({
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    totalWorkHours: 0,
    attendanceRate: 100,
    allTimePresent: 0
  });
  const [myHistory, setMyHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

  // ─────────────────────────────────────────────────────────────
  // ADMIN-SPECIFIC STATES (ORGANIZATION-WIDE METRICS & STAFF TIMESHEETS)
  // ─────────────────────────────────────────────────────────────
  const [adminStats, setAdminStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    activeNow: 0
  });
  const [allStaffAttendance, setAllStaffAttendance] = useState([]);
  const [staffAttendanceLoading, setStaffAttendanceLoading] = useState(false);
  const [adminStaffFilter, setAdminStaffFilter] = useState('all'); // 'all' | 'present' | 'absent' | 'leave'
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSelectedDate, setAdminSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Admin: Staff Leave Approvals
  const [allStaffLeaves, setAllStaffLeaves] = useState([]);
  const [staffLeavesLoading, setStaffLeavesLoading] = useState(false);
  const [adminLeaveFilter, setAdminLeaveFilter] = useState('all'); // 'all' | 'Pending' | 'Approved' | 'Rejected'
  const [leaveActionLoading, setLeaveActionLoading] = useState({});

  // Admin: Time Editor Modal
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
    { id: 'Paid Leave', label: 'Paid Leave', color: '#10B981' },
    { id: 'Casual Leave', label: 'Casual Leave', color: '#3B82F6' },
    { id: 'Sick Leave', label: 'Sick Leave', color: '#EF4444' },
    { id: 'Emergency Leave', label: 'Emergency Leave', color: '#F59E0B' },
    { id: 'Unpaid Leave', label: 'Unpaid Leave', color: '#6B7280' }
  ];

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING & SYNCHRONIZATION
  // ─────────────────────────────────────────────────────────────

  // Check today's attendance status for logged-in user
  const checkTodayAttendance = async () => {
    try {
      const res = await attendanceAPI.getMyTodayAttendance();
      if (res && res.success) {
        setTodayAttendance(res.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error checking today attendance:', err);
    }
  };

  // Fetch personal stats for employee
  const fetchMyStats = async () => {
    try {
      const res = await attendanceAPI.getMyStats();
      if (res && res.success && res.stats) {
        setMyStats(res.stats);
      }
    } catch (err) {
      console.error('Error fetching my stats:', err);
    }
  };

  // Fetch personal history for employee (Only this employee's records)
  const fetchMyHistory = async (m = historyMonth, y = historyYear) => {
    try {
      setHistoryLoading(true);
      const res = await attendanceAPI.getMyAttendanceHistory(null, null, m, y);
      if (res && res.success) {
        setMyHistory(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching personal attendance history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch my leaves
  const fetchMyLeaves = async () => {
    try {
      const res = await attendanceAPI.getMyLeaves();
      if (res && res.success) {
        setMyLeaves(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching personal leaves:', err);
    }
  };

  // Admin: Fetch org-wide stats
  const fetchAdminStats = async () => {
    if (!isAdmin) return;
    try {
      const res = await attendanceAPI.getAttendanceStats();
      if (res && res.success) {
        setAdminStats({
          total: res.total || 0,
          present: res.present || 0,
          absent: res.absent || 0,
          late: res.late || res.lateArrival || 0,
          onLeave: res.onLeave || 0,
          activeNow: res.activeNow || 0
        });
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  };

  // Admin: Fetch all staff attendance (by selected date or today status)
  const fetchStaffAttendance = async (date = adminSelectedDate) => {
    if (!isAdmin) return;
    try {
      setStaffAttendanceLoading(true);
      const isToday = date === new Date().toISOString().split('T')[0];
      if (isToday) {
        const res = await attendanceAPI.getTodayAttendanceStatus();
        if (res && res.success && Array.isArray(res.data)) {
          setAllStaffAttendance(res.data);
        }
      } else {
        const res = await attendanceAPI.getAttendanceByDate(date);
        if (res && res.success && Array.isArray(res.data)) {
          setAllStaffAttendance(res.data);
        }
      }
    } catch (err) {
      console.error('Error fetching staff attendance for admin:', err);
    } finally {
      setStaffAttendanceLoading(false);
    }
  };

  // Admin: Fetch all staff leaves
  const fetchAllStaffLeaves = async () => {
    if (!isAdmin) return;
    try {
      setStaffLeavesLoading(true);
      const res = await attendanceAPI.getAllLeaves();
      if (res && res.success) {
        setAllStaffLeaves(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching staff leaves:', err);
    } finally {
      setStaffLeavesLoading(false);
    }
  };

  // Initial load and real-time event listeners
  useEffect(() => {
    checkTodayAttendance();
    fetchMyLeaves();

    if (isAdmin) {
      fetchAdminStats();
      fetchStaffAttendance();
      fetchAllStaffLeaves();
    } else {
      fetchMyStats();
      fetchMyHistory();
    }

    const handleSync = () => {
      checkTodayAttendance();
      fetchMyLeaves();
      if (isAdmin) {
        fetchAdminStats();
        fetchStaffAttendance();
        fetchAllStaffLeaves();
      } else {
        fetchMyStats();
        fetchMyHistory();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };

    window.addEventListener('attendance_updated', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);

    const timer = setInterval(() => {
      handleSync();
    }, 25000);

    return () => {
      window.removeEventListener('attendance_updated', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(timer);
    };
  }, [isAdmin]);

  // ─────────────────────────────────────────────────────────────
  // ATTENDANCE ACTIONS (CHECK IN / CHECK OUT / LEAVE / ADMIN TIME EDIT)
  // ─────────────────────────────────────────────────────────────

  // Check In (Employee standard)
  const markAttendance = async () => {
    setLoading(true);
    try {
      const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
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
        setMessage('✅ Attendance marked successfully!');
        setMessageType('success');
        setTodayAttendance(data.data);
        fetchMyStats();
        fetchMyHistory();
      } else {
        setMessage(data.message || 'Failed to mark attendance');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error marking attendance. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // Check Out
  const checkOut = async () => {
    setLoading(true);
    try {
      const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/attendance/checkout`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${currentToken}` }
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
        setMessage(`🎉 Checked out successfully! Work Duration: ${hours}h ${minutes}m.`);
        setMessageType('success');
        fetchMyStats();
        fetchMyHistory();
      } else {
        setMessage(data.message || 'Failed to check out');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error during checkout.');
      setMessageType('error');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Apply for Leave
  const openLeaveForm = (type) => {
    setAppliedLeaveType(type);
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
          reason: leaveReason || `${appliedLeaveType} applied`,
          autoApprove: true
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowLeaveForm(false);
        setShowLeaveSuccessPopup(true);
        fetchMyLeaves();
        fetchMyStats();
      } else {
        setMessage(data.message || 'Failed to apply leave');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error applying leave.');
      setMessageType('error');
    } finally {
      setApplyLeaveLoading(false);
    }
  };

  // Admin GPS Check In
  const handleGpsCheckIn = async () => {
    if (!navigator.geolocation) {
      setMessage('GPS not supported on this browser');
      setMessageType('error');
      return;
    }
    setGpsStatus('fetching');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsCoords({ latitude, longitude, accuracy });
        setGpsStatus('success');
        setAdminCheckLoading(true);
        try {
          const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
          const res = await fetch(`${API_BASE_URL}/attendance/mark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({
              status: 'Present',
              notes: `GPS Check-in | Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`,
              verificationMethod: 'gps',
              location: { lat: latitude, lng: longitude, accuracy }
            })
          });
          const data = await res.json();
          if (res.ok) {
            setMessage(`✅ GPS Check-in recorded (${Math.round(accuracy)}m accuracy)`);
            setMessageType('success');
            setTodayAttendance(data.data);
            setAdminCheckMode(null);
            fetchAdminStats();
            fetchStaffAttendance();
          } else {
            setMessage(data.message || 'GPS check-in failed');
            setMessageType('error');
          }
        } catch (err) {
          setMessage('Server error during GPS check-in');
          setMessageType('error');
        } finally {
          setAdminCheckLoading(false);
          setTimeout(() => setMessage(''), 4000);
        }
      },
      () => {
        setGpsStatus('error');
        setMessage('Location access denied. Please allow permissions.');
        setMessageType('error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Admin Standard Shift Check In
  const handleStandardCheckIn = async () => {
    const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
    setAdminCheckLoading(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const gracePeriod = new Date();
      gracePeriod.setHours(9, 45, 0, 0);
      const isLate = now > gracePeriod;

      const res = await fetch(`${API_BASE_URL}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({
          status: isLate ? 'Half Day' : 'Present',
          notes: standardTimeNote || `Standard Shift Check-in at ${timeStr}`,
          verificationMethod: 'standard'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Check-in recorded at ${timeStr}${isLate ? ' (Late Arrival)' : ''}`);
        setMessageType('success');
        setTodayAttendance(data.data);
        setAdminCheckMode(null);
        setStandardTimeNote('');
        fetchAdminStats();
        fetchStaffAttendance();
      } else {
        setMessage(data.message || 'Check-in failed');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error during check-in');
      setMessageType('error');
    } finally {
      setAdminCheckLoading(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // Admin: Approve / Reject Staff Leave
  const handleLeaveDecision = async (leaveId, decisionStatus, rejectionReason = '') => {
    try {
      setLeaveActionLoading(prev => ({ ...prev, [leaveId]: true }));
      const res = await attendanceAPI.approveRejectLeave(leaveId, decisionStatus, rejectionReason);
      if (res && res.success) {
        setMessage(`✅ Leave request ${decisionStatus.toLowerCase()} successfully.`);
        setMessageType('success');
        fetchAllStaffLeaves();
        fetchAdminStats();
      } else {
        setMessage(res.message || `Failed to update leave status`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error updating leave status');
      setMessageType('error');
    } finally {
      setLeaveActionLoading(prev => ({ ...prev, [leaveId]: false }));
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // Admin: Time Editor Open
  const toTimeInputValue = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const handleOpenEditAttendance = (employeeRecord) => {
    const att = employeeRecord.attendanceToday || employeeRecord;
    setEditingRecord({
      ...att,
      employeeName: employeeRecord.name || att.employeeId?.name || 'Staff Member',
      employeeEmail: employeeRecord.email || att.employeeId?.email || '',
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
        setMessage(`✅ Updated attendance for ${editingRecord.employeeName}`);
        setMessageType('success');
        setEditingRecord(null);
        fetchStaffAttendance();
        fetchAdminStats();
      } else {
        setMessage(res.message || 'Failed to update attendance');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error updating attendance.');
      setMessageType('error');
    } finally {
      setSavingEdit(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // Helpers
  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const calculateDuration = (inTime, outTime) => {
    if (!inTime) return '--';
    const checkIn = new Date(inTime);
    const checkOut = outTime ? new Date(outTime) : new Date();
    const diff = Math.max(0, Math.floor((checkOut - checkIn) / (1000 * 60)));
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  // Filtering Staff for Admin
  const filteredStaffList = allStaffAttendance.filter((emp) => {
    const att = emp.attendanceToday || emp;
    const isPresent = att.status === 'Present' || att.status === 'half-day' || att.status === 'Half Day';
    const isLeave = att.status === 'Leave' || att.status === 'leave';
    const isAbsent = !att.checkInTime && (!att.status || att.status === 'Absent' || att.status === 'absent');

    if (adminStaffFilter === 'present' && !isPresent) return false;
    if (adminStaffFilter === 'absent' && !isAbsent) return false;
    if (adminStaffFilter === 'leave' && !isLeave) return false;

    if (adminSearchQuery.trim()) {
      const q = adminSearchQuery.toLowerCase();
      const name = (emp.name || att.employeeId?.name || '').toLowerCase();
      const email = (emp.email || att.employeeId?.email || '').toLowerCase();
      const empId = (emp.employeeId || att.employeeId?.employeeId || '').toLowerCase();
      const dept = (emp.department || att.employeeId?.department || '').toLowerCase();
      return name.includes(q) || email.includes(q) || empId.includes(q) || dept.includes(q);
    }
    return true;
  });

  // Filtering Leaves for Admin
  const filteredLeavesList = allStaffLeaves.filter((leave) => {
    if (adminLeaveFilter !== 'all' && leave.status !== adminLeaveFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="attendance-page">
      {/* ─────────────────────────────────────────────────────────────
          ROLE-BASED HERO HEADER
          ───────────────────────────────────────────────────────────── */}
      <div className="attendance-header">
        <div className="header-info-block">
          <div className="role-tag-row">
            {isAdmin ? (
              <span className="role-chip admin-chip">👑 Admin Control Hub</span>
            ) : (
              <span className="role-chip employee-chip">👤 Employee Attendance Portal</span>
            )}
            <span className="live-sync-indicator">
              <span className="sync-pulse"></span>
              Live Sync Active
            </span>
          </div>
          <h1>
            {isAdmin
              ? 'Workforce Attendance & Timesheets'
              : `Welcome, ${storedUser.name || 'Employee'}!`}
          </h1>
          <p>
            {isAdmin
              ? 'Organization-wide real-time attendance monitoring, employee check-ins, and leave management.'
              : 'Track your personal attendance records, monthly presence stats, and apply for leaves.'}
          </p>
          <div className="last-sync-meta">
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            <button
              onClick={() => {
                setIsRefreshing(true);
                checkTodayAttendance();
                fetchMyLeaves();
                if (isAdmin) {
                  fetchAdminStats();
                  fetchStaffAttendance();
                  fetchAllStaffLeaves();
                } else {
                  fetchMyStats();
                  fetchMyHistory();
                }
                setTimeout(() => setIsRefreshing(false), 800);
              }}
              disabled={isRefreshing}
              className="btn-refresh-attendance"
            >
              {isRefreshing ? '⏳ Syncing...' : '🔄 Refresh Data'}
            </button>
          </div>
        </div>

        <div className="header-action-block">
          <button
            onClick={() => setShowLeaveDropdown(!showLeaveDropdown)}
            disabled={applyLeaveLoading}
            className="btn-apply-leave"
          >
            {applyLeaveLoading ? '⏳ Applying...' : 'Apply for Leave ▼'}
          </button>
          {showLeaveDropdown && (
            <div className="leave-dropdown-menu">
              {leaveTypes.map((type) => (
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

      {message && <div className={`message ${messageType}`}>{message}</div>}

      {/* ─────────────────────────────────────────────────────────────
          EMPLOYEE VIEW: PERSONAL ATTENDANCE STATS CARDS
          ───────────────────────────────────────────────────────────── */}
      {!isAdmin && (
        <div className="personal-stats-grid">
          <div className="stat-metric-card present-card">
            <div className="stat-icon-wrap">🟢</div>
            <div className="stat-text-wrap">
              <span className="metric-label">Days Present</span>
              <strong className="metric-value">{myStats.presentDays} Days</strong>
              <span className="metric-sub">This Month ({myStats.allTimePresent} Total)</span>
            </div>
          </div>

          <div className="stat-metric-card absent-card">
            <div className="stat-icon-wrap">🔴</div>
            <div className="stat-text-wrap">
              <span className="metric-label">Days Absent</span>
              <strong className="metric-value">{myStats.absentDays} Days</strong>
              <span className="metric-sub">Recorded unexcused</span>
            </div>
          </div>

          <div className="stat-metric-card late-card">
            <div className="stat-icon-wrap">⏳</div>
            <div className="stat-text-wrap">
              <span className="metric-label">Half-Days / Late</span>
              <strong className="metric-value">{myStats.halfDays} Days</strong>
              <span className="metric-sub">After 09:45 AM</span>
            </div>
          </div>

          <div className="stat-metric-card leave-card">
            <div className="stat-icon-wrap">🏖️</div>
            <div className="stat-text-wrap">
              <span className="metric-label">Leaves Taken</span>
              <strong className="metric-value">{myStats.leaveDays} Days</strong>
              <span className="metric-sub">{myStats.approvedLeavesCount} Approved</span>
            </div>
          </div>

          <div className="stat-metric-card hours-card">
            <div className="stat-icon-wrap">⏱️</div>
            <div className="stat-text-wrap">
              <span className="metric-label">Total Work Hours</span>
              <strong className="metric-value">{myStats.totalWorkHours} hrs</strong>
              <span className="metric-sub">Logged Duration</span>
            </div>
          </div>

          <div className="stat-metric-card score-card">
            <div className="stat-icon-wrap">📈</div>
            <div className="stat-text-wrap">
              <span className="metric-label">Attendance Rate</span>
              <strong className="metric-value">{myStats.attendanceRate}%</strong>
              <span className="metric-sub">Monthly Presence</span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ADMIN VIEW: ORGANIZATION-WIDE METRICS
          ───────────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card total-staff">
            <div className="admin-stat-icon">👥</div>
            <div>
              <span className="admin-stat-label">Total Staff</span>
              <strong className="admin-stat-val">{adminStats.total} Employees</strong>
            </div>
          </div>

          <div className="admin-stat-card present-staff">
            <div className="admin-stat-icon">🟢</div>
            <div>
              <span className="admin-stat-label">Present Today</span>
              <strong className="admin-stat-val">{adminStats.present} Present</strong>
            </div>
          </div>

          <div className="admin-stat-card absent-staff">
            <div className="admin-stat-icon">🔴</div>
            <div>
              <span className="admin-stat-label">Absent Today</span>
              <strong className="admin-stat-val">{adminStats.absent} Absent</strong>
            </div>
          </div>

          <div className="admin-stat-card leave-staff">
            <div className="admin-stat-icon">🏖️</div>
            <div>
              <span className="admin-stat-label">On Leave Today</span>
              <strong className="admin-stat-val">{adminStats.onLeave} On Leave</strong>
            </div>
          </div>

          <div className="admin-stat-card active-staff">
            <div className="admin-stat-icon">⚡</div>
            <div>
              <span className="admin-stat-label">Active Working</span>
              <strong className="admin-stat-val">{adminStats.activeNow} Online</strong>
            </div>
          </div>

          <div className="admin-stat-card late-staff">
            <div className="admin-stat-icon">⏳</div>
            <div>
              <span className="admin-stat-label">Late Arrivals</span>
              <strong className="admin-stat-val">{adminStats.late} Late</strong>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TODAY'S STATUS & VERIFICATION PANEL
          ───────────────────────────────────────────────────────────── */}
      <div className="today-status-card">
        <div className="status-header">
          <div className="status-title-group">
            <h2>Today's Presence &amp; Status</h2>
            <span className="status-subtitle">
              {isAdmin
                ? 'Your personal admin check-in and shift verification controls'
                : 'Mark your presence and monitor today’s active work duration'}
            </span>
          </div>
          <div className="status-header-meta">
            <span className="current-date">
              📅{' '}
              {new Date().toLocaleDateString('en-US', {
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
              <span
                className="status-badge"
                style={{
                  backgroundColor:
                    todayAttendance.status === 'Present'
                      ? '#10b981'
                      : todayAttendance.status === 'Half Day'
                      ? '#f59e0b'
                      : '#ef4444',
                  color: 'white'
                }}
              >
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
                  {todayAttendance.checkOutTime
                    ? formatTime(todayAttendance.checkOutTime)
                    : '--:--'}
                </span>
              </div>
              <div className="time-stat highlight">
                <span className="time-label">Duration</span>
                <span className="time-value">
                  {calculateDuration(
                    todayAttendance.checkInTime,
                    todayAttendance.checkOutTime
                  )}
                </span>
              </div>
            </div>

            {todayAttendance.notes && (
              <div className="attendance-note">
                <strong>Note:</strong> {todayAttendance.notes}
              </div>
            )}

            <div className="action-section">
              {todayAttendance.isActive ? (
                <button className="btn-checkout" onClick={checkOut} disabled={loading}>
                  {loading ? '🚪 Checking out...' : '🚪 Check Out Now'}
                </button>
              ) : (
                <div className="completed-message">
                  ✓ Attendance completed for today ({formatTime(todayAttendance.checkOutTime)})
                </div>
              )}
            </div>
          </div>
        ) : isAdmin ? (
          /* Admin Check-in Options */
          <div className="admin-checkin-panel">
            <div className="admin-checkin-header">
              <span className="admin-role-badge">🛡️ Admin Verification</span>
              <h3>Select Check-in Method</h3>
              <p>Record your personal presence via GPS, standard shift time, or AI Face Scanner Hub</p>
            </div>

            <div className="admin-checkin-methods">
              <div
                className={`checkin-method-card ${adminCheckMode === 'gps' ? 'selected' : ''}`}
                onClick={() => {
                  setAdminCheckMode('gps');
                  setGpsStatus('idle');
                  setGpsCoords(null);
                }}
              >
                <div className="method-icon gps-icon">📍</div>
                <div className="method-info">
                  <h4>GPS Verification</h4>
                  <p>Capture live coordinates &amp; verify office proximity</p>
                </div>
              </div>

              <div
                className={`checkin-method-card ${adminCheckMode === 'standard' ? 'selected' : ''}`}
                onClick={() => setAdminCheckMode('standard')}
              >
                <div className="method-icon time-icon">🕒</div>
                <div className="method-info">
                  <h4>Standard Shift Time</h4>
                  <p>Auto-timestamp (09:30 AM Shift, grace until 09:45 AM)</p>
                </div>
              </div>

              <div
                className={`checkin-method-card ${adminCheckMode === 'qr' ? 'selected' : ''}`}
                onClick={() => {
                  setAdminCheckMode('qr');
                  setShowQRModal(true);
                }}
              >
                <div className="method-icon qr-icon">📷</div>
                <div className="method-info">
                  <h4>AI Face Lock &amp; QR Hub</h4>
                  <p>Live AI Face scanner, rotating office QR, and GPS</p>
                </div>
              </div>
            </div>

            {adminCheckMode === 'gps' && (
              <div className="method-detail-panel">
                <div className="method-detail-header">
                  <span>📍 GPS Location Capture</span>
                  {gpsStatus === 'success' && gpsCoords && (
                    <span className="gps-success-badge">✅ Location Acquired</span>
                  )}
                </div>
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
                <button
                  className="btn-admin-checkin gps-btn"
                  onClick={handleGpsCheckIn}
                  disabled={adminCheckLoading || gpsStatus === 'fetching'}
                >
                  {adminCheckLoading ? 'Marking Attendance...' : '📍 Capture Location & Check In'}
                </button>
              </div>
            )}

            {adminCheckMode === 'standard' && (
              <div className="method-detail-panel">
                <div className="method-detail-header">
                  <span>🕒 Standard Time Check-in</span>
                  <span className="time-now-badge">
                    {new Date().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label>Note (optional)</label>
                  <input
                    type="text"
                    value={standardTimeNote}
                    onChange={(e) => setStandardTimeNote(e.target.value)}
                    placeholder="e.g. Working from office..."
                    className="notes-input"
                  />
                </div>
                <button
                  className="btn-admin-checkin standard-btn"
                  onClick={handleStandardCheckIn}
                  disabled={adminCheckLoading}
                >
                  {adminCheckLoading ? 'Marking Attendance...' : '🕒 Confirm Standard Check-in'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Employee Check-in Controls */
          <div className="checkin-container-grid">
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
                    placeholder="e.g. Working from desk / Remote..."
                    className="notes-input"
                  />
                </div>

                <button className="btn-checkin" onClick={markAttendance} disabled={loading}>
                  {loading ? 'Marking...' : '✓ Standard Check In'}
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

      {/* ─────────────────────────────────────────────────────────────
          EMPLOYEE VIEW: PERSONAL ATTENDANCE HISTORY TABLE
          ───────────────────────────────────────────────────────────── */}
      {!isAdmin && (
        <div className="my-history-section">
          <div className="section-header-flex">
            <div>
              <span className="sub-badge">PERSONAL LOG</span>
              <h2>📅 My Attendance History</h2>
              <p>Complete record of your logged presence, work hours, and verification methods.</p>
            </div>
            <div className="history-filter-controls">
              <div className="filter-item">
                <label>Month:</label>
                <select
                  value={historyMonth}
                  onChange={(e) => {
                    const m = parseInt(e.target.value, 10);
                    setHistoryMonth(m);
                    fetchMyHistory(m, historyYear);
                  }}
                  className="history-select"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label>Year:</label>
                <select
                  value={historyYear}
                  onChange={(e) => {
                    const y = parseInt(e.target.value, 10);
                    setHistoryYear(y);
                    fetchMyHistory(historyMonth, y);
                  }}
                  className="history-select"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div className="loading-history-card">
              <div className="loading-spinner"></div>
              <p>Loading your attendance records...</p>
            </div>
          ) : myHistory.length === 0 ? (
            <div className="empty-history-card">
              <div className="empty-icon">📅</div>
              <h4>No Attendance Records Found</h4>
              <p>No records logged for the selected period. Check in to log your presence!</p>
            </div>
          ) : (
            <div className="table-responsive-container">
              <table className="custom-attendance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Duration</th>
                    <th>Method</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {myHistory.map((rec) => {
                    const dateStr = rec.date
                      ? new Date(rec.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'N/A';
                    const inStr = formatTime(rec.checkInTime);
                    const outStr = formatTime(rec.checkOutTime);
                    const durStr = calculateDuration(rec.checkInTime, rec.checkOutTime);

                    return (
                      <tr key={rec._id}>
                        <td>
                          <strong>{dateStr}</strong>
                        </td>
                        <td>
                          <span className={`status-pill ${rec.status?.toLowerCase() || 'present'}`}>
                            ● {rec.status}
                          </span>
                        </td>
                        <td>{inStr}</td>
                        <td>{outStr}</td>
                        <td>
                          <strong className="dur-text">{durStr}</strong>
                        </td>
                        <td>
                          <span className="method-pill">
                            {rec.verificationMethod === 'face_recognition'
                              ? '👤 Face Recognition'
                              : rec.verificationMethod === 'gps' ||
                                rec.verificationMethod === 'geolocation'
                              ? '📍 GPS'
                              : rec.verificationMethod === 'qr_code'
                              ? '📷 QR Code'
                              : '🕒 Standard'}
                          </span>
                        </td>
                        <td className="note-col">{rec.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ADMIN VIEW: ALL STAFF ATTENDANCE TIMESHEET & MANAGEMENT
          ───────────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="admin-staff-attendance-section">
          <div className="staff-attendance-header">
            <div>
              <div className="admin-section-tag">ADMIN TIMESHEET CONTROL</div>
              <h2>👥 All Staff Attendance Timesheet</h2>
              <p>Real-time view of present, absent, and on-leave employees with time adjustment controls.</p>
            </div>
            <div className="staff-header-actions">
              <div className="date-picker-wrap">
                <label>Date:</label>
                <input
                  type="date"
                  value={adminSelectedDate}
                  onChange={(e) => {
                    setAdminSelectedDate(e.target.value);
                    fetchStaffAttendance(e.target.value);
                  }}
                  className="admin-date-input"
                />
              </div>
              <button
                onClick={() => fetchStaffAttendance(adminSelectedDate)}
                disabled={staffAttendanceLoading}
                className="btn-refresh-staff"
              >
                {staffAttendanceLoading ? '⏳ Loading...' : '🔄 Refresh List'}
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="admin-controls-bar">
            <div className="filter-pills-row">
              <button
                className={`filter-tab-pill ${adminStaffFilter === 'all' ? 'active' : ''}`}
                onClick={() => setAdminStaffFilter('all')}
              >
                All Staff ({allStaffAttendance.length})
              </button>
              <button
                className={`filter-tab-pill present ${
                  adminStaffFilter === 'present' ? 'active' : ''
                }`}
                onClick={() => setAdminStaffFilter('present')}
              >
                🟢 Present (
                {
                  allStaffAttendance.filter(
                    (e) =>
                      (e.attendanceToday?.status === 'Present' ||
                        e.attendanceToday?.status === 'Half Day' ||
                        e.status === 'Present') &&
                      (e.attendanceToday?.checkInTime || e.checkInTime)
                  ).length
                }
                )
              </button>
              <button
                className={`filter-tab-pill absent ${
                  adminStaffFilter === 'absent' ? 'active' : ''
                }`}
                onClick={() => setAdminStaffFilter('absent')}
              >
                🔴 Absent (
                {
                  allStaffAttendance.filter(
                    (e) =>
                      !e.attendanceToday?.checkInTime &&
                      !e.checkInTime &&
                      e.attendanceToday?.status !== 'Leave'
                  ).length
                }
                )
              </button>
              <button
                className={`filter-tab-pill leave ${
                  adminStaffFilter === 'leave' ? 'active' : ''
                }`}
                onClick={() => setAdminStaffFilter('leave')}
              >
                🏖️ On Leave (
                {
                  allStaffAttendance.filter(
                    (e) =>
                      e.attendanceToday?.status === 'Leave' ||
                      e.status === 'Leave'
                  ).length
                }
                )
              </button>
            </div>

            <div className="admin-search-box">
              <input
                type="text"
                value={adminSearchQuery}
                onChange={(e) => setAdminSearchQuery(e.target.value)}
                placeholder="Search staff by name, email, department, or ID..."
                className="admin-search-input"
              />
            </div>
          </div>

          {staffAttendanceLoading ? (
            <div className="staff-loading-card">
              <div className="loading-spinner"></div>
              <p>Loading staff attendance records...</p>
            </div>
          ) : filteredStaffList.length === 0 ? (
            <div className="staff-empty-card">
              <div className="empty-icon">👥</div>
              <h4>No Staff Records Found</h4>
              <p>No employee records matched the selected filters.</p>
            </div>
          ) : (
            <div className="staff-attendance-grid">
              {filteredStaffList.map((emp) => {
                const att = emp.attendanceToday || emp;
                const isCheckedIn = !!att.checkInTime;
                const checkInStr = att.checkInTime ? formatTime(att.checkInTime) : '--:--';
                const checkOutStr = att.checkOutTime
                  ? formatTime(att.checkOutTime)
                  : att.isActive
                  ? '🟢 In Progress'
                  : '--:--';
                const durationStr = calculateDuration(att.checkInTime, att.checkOutTime);

                const currentStatus =
                  att.status ||
                  (isCheckedIn ? 'Present' : 'Absent');

                return (
                  <div key={emp._id || att._id} className="staff-record-card">
                    <div className="staff-record-top">
                      <div className="staff-info-col">
                        <div className="staff-avatar-initial">
                          {(emp.name || att.employeeId?.name || '?')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <strong className="staff-name">
                            {emp.name || att.employeeId?.name || 'Staff Member'}
                          </strong>
                          <span className="staff-email">
                            {emp.email || att.employeeId?.email || ''}
                          </span>
                          {(emp.designation || att.employeeId?.designation) && (
                            <span className="staff-dept">
                              {emp.designation || att.employeeId?.designation}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="staff-status-col">
                        <span className={`status-pill ${currentStatus.toLowerCase()}`}>
                          ● {currentStatus}
                        </span>
                        {att.verificationMethod && (
                          <span className="method-pill">
                            {att.verificationMethod === 'face_recognition'
                              ? '👤 Face Lock'
                              : att.verificationMethod === 'gps' ||
                                att.verificationMethod === 'geolocation'
                              ? '📍 GPS'
                              : att.verificationMethod === 'qr_code'
                              ? '📷 QR'
                              : '🕒 Standard'}
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
                      {isCheckedIn ? (
                        <button
                          className="btn-edit-staff-time"
                          onClick={() => handleOpenEditAttendance(emp)}
                        >
                          ✏️ Edit Time &amp; Status
                        </button>
                      ) : (
                        <button
                          className="btn-edit-staff-time"
                          style={{
                            background: '#ede9fe',
                            borderColor: '#c7d2fe',
                            color: '#4f46e5'
                          }}
                          onClick={() => handleOpenEditAttendance(emp)}
                        >
                          ➕ Mark Attendance
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ADMIN VIEW: ALL STAFF LEAVES MANAGEMENT & APPROVALS
          ───────────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="admin-leaves-management-section">
          <div className="section-header-flex">
            <div>
              <span className="sub-badge">LEAVE REQUESTS</span>
              <h2>🏖️ Staff Leave Applications &amp; Approvals</h2>
              <p>Review employee leave submissions and approve or reject with real-time sync.</p>
            </div>
            <div className="filter-pills-row">
              <button
                className={`filter-tab-pill ${adminLeaveFilter === 'all' ? 'active' : ''}`}
                onClick={() => setAdminLeaveFilter('all')}
              >
                All ({allStaffLeaves.length})
              </button>
              <button
                className={`filter-tab-pill late ${
                  adminLeaveFilter === 'Pending' ? 'active' : ''
                }`}
                onClick={() => setAdminLeaveFilter('Pending')}
              >
                ⏳ Pending (
                {allStaffLeaves.filter((l) => l.status === 'Pending').length}
                )
              </button>
              <button
                className={`filter-tab-pill present ${
                  adminLeaveFilter === 'Approved' ? 'active' : ''
                }`}
                onClick={() => setAdminLeaveFilter('Approved')}
              >
                ✓ Approved (
                {allStaffLeaves.filter((l) => l.status === 'Approved').length}
                )
              </button>
              <button
                className={`filter-tab-pill absent ${
                  adminLeaveFilter === 'Rejected' ? 'active' : ''
                }`}
                onClick={() => setAdminLeaveFilter('Rejected')}
              >
                ✕ Rejected (
                {allStaffLeaves.filter((l) => l.status === 'Rejected').length}
                )
              </button>
            </div>
          </div>

          {staffLeavesLoading ? (
            <div className="loading-history-card">
              <div className="loading-spinner"></div>
              <p>Loading staff leave applications...</p>
            </div>
          ) : filteredLeavesList.length === 0 ? (
            <div className="empty-history-card">
              <div className="empty-icon">🏖️</div>
              <h4>No Leave Applications Found</h4>
              <p>No employee leave applications match the selected filter.</p>
            </div>
          ) : (
            <div className="leaves-list-grid">
              {filteredLeavesList.map((leave) => {
                const isActioning = leaveActionLoading[leave._id];
                const empName = leave.employeeId?.name || 'Staff Member';
                const empEmail = leave.employeeId?.email || '';

                return (
                  <div key={leave._id} className="leave-request-card">
                    <div className="leave-card-top">
                      <div className="leave-type-info">
                        <div className="staff-avatar-initial sm">
                          {empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong className="leave-type-name">{empName}</strong>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#64748b',
                              display: 'block'
                            }}
                          >
                            {empEmail} • <strong>{leave.leaveType}</strong>
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`leave-status-pill ${leave.status?.toLowerCase()}`}>
                          {leave.status === 'Approved'
                            ? '✓ Approved'
                            : leave.status === 'Pending'
                            ? '⏳ Pending'
                            : '✕ Rejected'}
                        </span>
                      </div>
                    </div>

                    <div className="leave-dates-row">
                      <div className="leave-date-col">
                        <span className="date-label">From</span>
                        <strong className="date-val">
                          {new Date(leave.startDate).toLocaleDateString()}
                        </strong>
                      </div>
                      <div className="leave-date-col">
                        <span className="date-label">To</span>
                        <strong className="date-val">
                          {new Date(leave.endDate).toLocaleDateString()}
                        </strong>
                      </div>
                      <div className="leave-date-col">
                        <span className="date-label">Total Duration</span>
                        <strong className="date-val">
                          {leave.totalDays}{' '}
                          {leave.totalDays === 1 ? 'Day' : 'Days'}
                        </strong>
                      </div>
                    </div>

                    {leave.reason && (
                      <div className="leave-reason-box">
                        <span className="reason-label">Reason:</span>
                        <span className="reason-text">{leave.reason}</span>
                      </div>
                    )}

                    {leave.status === 'Pending' && (
                      <div className="leave-admin-actions">
                        <button
                          className="btn-leave-action approve"
                          onClick={() => handleLeaveDecision(leave._id, 'Approved')}
                          disabled={isActioning}
                        >
                          {isActioning ? '...' : '✓ Approve Leave'}
                        </button>
                        <button
                          className="btn-leave-action reject"
                          onClick={() => handleLeaveDecision(leave._id, 'Rejected')}
                          disabled={isActioning}
                        >
                          {isActioning ? '...' : '✕ Reject Leave'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EMPLOYEE VIEW: MY LEAVE REQUESTS SECTION
          ───────────────────────────────────────────────────────────── */}
      {!isAdmin && myLeaves.length > 0 && (
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
                    {leave.status === 'Approved'
                      ? '✓ Approved'
                      : leave.status === 'Pending'
                      ? '⏳ Pending'
                      : '✕ Rejected'}
                  </span>
                </div>

                <div className="leave-dates-row">
                  <div className="leave-date-col">
                    <span className="date-label">From</span>
                    <strong className="date-val">
                      {new Date(leave.startDate).toLocaleDateString()}
                    </strong>
                  </div>
                  <div className="leave-date-col">
                    <span className="date-label">To</span>
                    <strong className="date-val">
                      {new Date(leave.endDate).toLocaleDateString()}
                    </strong>
                  </div>
                  <div className="leave-date-col">
                    <span className="date-label">Total Duration</span>
                    <strong className="date-val">
                      {leave.totalDays} {leave.totalDays === 1 ? 'Day' : 'Days'}
                    </strong>
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

      {/* ─────────────────────────────────────────────────────────────
          MODALS: LEAVE APPLICATION & SUCCESS POPUP & TIME EDITOR
          ───────────────────────────────────────────────────────────── */}
      {/* Apply Leave Modal */}
      {showLeaveForm && (
        <div className="leave-modal-overlay">
          <div className="leave-modal-card">
            <h2 className="leave-modal-title">
              Apply for{' '}
              {appliedLeaveType?.toLowerCase().endsWith('leave')
                ? appliedLeaveType
                : `${appliedLeaveType} Leave`}
            </h2>

            <div className="leave-form-group">
              <label className="leave-form-label">Start Date:</label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                className="leave-form-input"
              />
            </div>

            <div className="leave-form-group">
              <label className="leave-form-label">End Date:</label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                min={leaveStartDate}
                className="leave-form-input"
              />
            </div>

            <div className="leave-form-group" style={{ marginBottom: '25px' }}>
              <label className="leave-form-label">Reason (optional):</label>
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
                {applyLeaveLoading ? 'Applying...' : 'Apply Leave'}
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
              Your{' '}
              <strong>
                {appliedLeaveType?.toLowerCase().endsWith('leave')
                  ? appliedLeaveType
                  : `${appliedLeaveType} Leave`}
              </strong>{' '}
              has been submitted successfully.
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

      {/* Admin Time & Status Editor Modal */}
      {isAdmin && editingRecord && (
        <div
          className="admin-time-modal-overlay"
          onClick={() => setEditingRecord(null)}
        >
          <div className="admin-time-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-time-modal-header">
              <div>
                <span className="modal-tag">ADMIN TIME EDITOR</span>
                <h3>Edit Attendance Record</h3>
                <p>
                  Modify logged hours and status for{' '}
                  <strong>{editingRecord.employeeName}</strong>
                </p>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setEditingRecord(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveAttendanceEdit} className="admin-time-form">
              <div className="time-inputs-grid">
                <div className="form-group">
                  <label>🕒 Check-In Time</label>
                  <input
                    type="time"
                    value={editForm.checkInTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, checkInTime: e.target.value })
                    }
                    required
                    className="time-input-field"
                  />
                  <span className="field-hint">
                    Original:{' '}
                    {editingRecord.checkInTime
                      ? formatTime(editingRecord.checkInTime)
                      : 'N/A'}
                  </span>
                </div>

                <div className="form-group">
                  <label>🚪 Check-Out Time</label>
                  <input
                    type="time"
                    value={editForm.checkOutTime}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        checkOutTime: e.target.value,
                        clearCheckOut: false
                      })
                    }
                    className="time-input-field"
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '4px'
                    }}
                  >
                    <span className="field-hint">
                      Original:{' '}
                      {editingRecord.checkOutTime
                        ? formatTime(editingRecord.checkOutTime)
                        : 'Not checked out'}
                    </span>
                    {editForm.checkOutTime && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            checkOutTime: '',
                            clearCheckOut: true
                          })
                        }
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
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
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
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  placeholder="e.g. Adjusted check-in time per approval"
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

      {/* AI Face Recognition / Live QR / Geolocation Modal */}
      <LiveQRGeoVerificationModal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          setAdminCheckMode(null);
        }}
        onSuccess={(attendanceData) => {
          setTodayAttendance(attendanceData);
          checkTodayAttendance();
          if (isAdmin) {
            fetchAdminStats();
            fetchStaffAttendance();
          } else {
            fetchMyStats();
            fetchMyHistory();
          }
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
