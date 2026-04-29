import { useState, useEffect } from 'react';
import { reportAPI, shiftAPI } from '../../services/api';
import './EmployeeReports.css';

const EmployeeReports = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    if (user?.id) fetchReportData();
  }, [user, viewMonth, viewYear]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [reportData, shiftsData] = await Promise.all([
        reportAPI.getMyReport(viewMonth, viewYear),
        shiftAPI.getMyShifts()
      ]);
      
      if (reportData.success) setReport(reportData.data);
      if (shiftsData.success) setShifts(shiftsData.data || []);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' });

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'present': return 'status-present';
      case 'absent': return 'status-absent';
      case 'half day': return 'status-half';
      case 'leave': return 'status-leave';
      default: return 'status-default';
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="employee-reports">
      <div className="report-header">
        <h1>My Monthly Report</h1>
        <div className="month-selector">
          <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {report && (
        <>
          {/* Employee Info */}
          <div className="report-section">
            <h2>Employee Details</h2>
            <div className="info-grid">
              <div className="info-card">
                <label>Name</label>
                <span>{report.employee?.name || user?.name || '-'}</span>
              </div>
              <div className="info-card">
                <label>Email</label>
                <span>{report.employee?.email || user?.email || '-'}</span>
              </div>
              <div className="info-card">
                <label>Designation</label>
                <span>{report.employee?.designation || '-'}</span>
              </div>
              <div className="info-card">
                <label>Employee ID</label>
                <span>{report.employee?.employeeId || '-'}</span>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="report-section">
            <h2>Attendance Summary - {monthName} {viewYear}</h2>
            <div className="stats-grid">
              <div className="stat-card present">
                <div className="stat-value">{report.attendance?.totalPresent || 0}</div>
                <div className="stat-label">Days Present</div>
              </div>
              <div className="stat-card absent">
                <div className="stat-value">{report.attendance?.totalAbsent || 0}</div>
                <div className="stat-label">Days Absent</div>
              </div>
              <div className="stat-card half">
                <div className="stat-value">{report.attendance?.halfDays || 0}</div>
                <div className="stat-label">Half Days</div>
              </div>
              <div className="stat-card leave">
                <div className="stat-value">{report.attendance?.totalLeave || 0}</div>
                <div className="stat-label">Leaves</div>
              </div>
              <div className="stat-card working-hours">
                <div className="stat-value">{report.attendance?.totalWorkingHours?.toFixed(1) || 0}</div>
                <div className="stat-label">Total Hours</div>
              </div>
              <div className="stat-card late">
                <div className="stat-value">{report.attendance?.lateCount || 0}</div>
                <div className="stat-label">Late Entries</div>
              </div>
            </div>
          </div>

          {/* Shift Details */}
          <div className="report-section">
            <h2>Shift Details</h2>
            <div className="shift-summary">
              <div className="summary-item">
                <span className="summary-label">Total Shifts Assigned:</span>
                <span className="summary-value">{shifts.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Shifts This Month:</span>
                <span className="summary-value">
                  {shifts.filter(s => {
                    const date = new Date(s.date);
                    return date.getMonth() + 1 === viewMonth && date.getFullYear() === viewYear;
                  }).length}
                </span>
              </div>
            </div>
            {shifts.length > 0 ? (
              <div className="shifts-table-wrapper">
                <table className="shifts-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Shift Name</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts
                      .filter(s => {
                        const date = new Date(s.date);
                        return date.getMonth() + 1 === viewMonth && date.getFullYear() === viewYear;
                      })
                      .map((shift, idx) => (
                        <tr key={idx}>
                          <td>{new Date(shift.date).toLocaleDateString()}</td>
                          <td>{shift.shiftId?.shiftName || '-'}</td>
                          <td>{shift.shiftId?.startTime || '-'}</td>
                          <td>{shift.shiftId?.endTime || '-'}</td>
                          <td>
                            <span className={`status-badge ${getStatusClass(shift.status)}`}>
                              {shift.status || 'Scheduled'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">No shifts assigned for this month</div>
            )}
          </div>

          {/* Performance Note */}
          <div className="report-section">
            <h2>Performance Summary</h2>
            <div className="performance-card">
              <div className="performance-item">
                <span className="performance-label">Attendance Rate:</span>
                <span className="performance-value">
                  {report.attendance?.attendancePercentage?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Punctuality:</span>
                <span className="performance-value">
                  {report.attendance?.lateCount > 0 ? 'Needs Improvement' : 'Excellent'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="no-data">No report data available for {monthName} {viewYear}</div>
      )}
    </div>
  );
};

export default EmployeeReports;
