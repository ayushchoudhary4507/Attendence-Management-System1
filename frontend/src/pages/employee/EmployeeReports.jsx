import { useState, useEffect } from 'react';
import { reportAPI, shiftAPI, advancedReportAPI } from '../../services/api';
import AttendanceCharts from '../../components/charts/AttendanceCharts';
import '../../components/charts/AttendanceCharts.css';
import './EmployeeReports.css';

const EmployeeReports = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('monthly');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [chartsData, setChartsData] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user?.id) fetchReportData();
  }, [user, viewMonth, viewYear, activeTab]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'monthly') {
        const [reportData, shiftsData, chartsRes] = await Promise.all([
          reportAPI.getMyReport(viewMonth, viewYear),
          shiftAPI.getMyShifts(),
          advancedReportAPI.getMonthlyCharts(viewMonth, viewYear).catch(() => ({ success: false, data: null }))
        ]);
        if (reportData.success) setReport(reportData.data);
        if (shiftsData.success) setShifts(shiftsData.data || []);
        if (chartsRes?.success) setChartsData(chartsRes.data);
        else setChartsData(null);
      } else if (activeTab === 'daily') {
        const data = await advancedReportAPI.getDailyReport(selectedDate);
        if (data.success) setDailyReport(data.data);
      } else if (activeTab === 'weekly') {
        const data = await advancedReportAPI.getWeeklyReport();
        if (data.success) setWeeklyReport(data.data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const response = await advancedReportAPI.exportAttendanceExcel(viewMonth, viewYear);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${viewMonth}_${viewYear}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting:', err);
    } finally {
      setExporting(false);
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
        <h1>My Reports</h1>
        <div className="header-actions">
          <div className="tab-buttons">
            <button className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>Daily</button>
            <button className={`tab-btn ${activeTab === 'weekly' ? 'active' : ''}`} onClick={() => setActiveTab('weekly')}>Weekly</button>
            <button className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>Monthly</button>
          </div>
          <div className="month-selector">
            {activeTab === 'daily' && (
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            )}
            {activeTab === 'monthly' && (
              <>
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
              </>
            )}
          </div>
          <button className="export-btn" onClick={handleExportExcel} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Daily Report */}
      {activeTab === 'daily' && dailyReport && (
        <div className="report-section">
          <h2>Daily Report - {dailyReport.date}</h2>
          <div className="stats-grid">
            <div className="stat-card present">
              <div className="stat-value">{dailyReport.summary.present}</div>
              <div className="stat-label">Present</div>
            </div>
            <div className="stat-card absent">
              <div className="stat-value">{dailyReport.summary.absent}</div>
              <div className="stat-label">Absent</div>
            </div>
            <div className="stat-card half">
              <div className="stat-value">{dailyReport.summary.halfDay}</div>
              <div className="stat-label">Half Day</div>
            </div>
            <div className="stat-card leave">
              <div className="stat-value">{dailyReport.summary.leave}</div>
              <div className="stat-label">Leave</div>
            </div>
            <div className="stat-card working-hours">
              <div className="stat-value">{dailyReport.summary.notMarked}</div>
              <div className="stat-label">Not Marked</div>
            </div>
          </div>
          {dailyReport.records.length > 0 && (
            <div className="shifts-table-wrapper">
              <table className="shifts-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyReport.records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td><span className={`status-badge ${getStatusClass(r.status)}`}>{r.status}</span></td>
                      <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '-'}</td>
                      <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '-'}</td>
                      <td>{r.workHours || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Weekly Report */}
      {activeTab === 'weekly' && weeklyReport && (
        <>
          <div className="report-section">
            <h2>Weekly Report - {weeklyReport.weekStart} to {weeklyReport.weekEnd}</h2>
            <div className="stats-grid">
              {weeklyReport.dailyData.map((d, i) => (
                <div key={i} className="stat-card present">
                  <div className="stat-value">{d.present}</div>
                  <div className="stat-label">{d.dayName}</div>
                  <div className="stat-sub">A:{d.absent} H:{d.halfDay} L:{d.leave}</div>
                </div>
              ))}
            </div>
          </div>
          {weeklyReport.employeeSummary.length > 0 && (
            <div className="report-section">
              <h2>Employee Summary</h2>
              <div className="shifts-table-wrapper">
                <table className="shifts-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Half Day</th>
                      <th>Leave</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyReport.employeeSummary.map((e, i) => (
                      <tr key={i}>
                        <td>{e.name}</td>
                        <td>{e.present}</td>
                        <td>{e.absent}</td>
                        <td>{e.halfDay}</td>
                        <td>{e.leave}</td>
                        <td>{e.totalHours?.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Monthly Report */}
      {activeTab === 'monthly' && report && (
        <>
          {/* Employee Info */}
          <div className="report-section">
            <h2>Employee Details</h2>
            <div className="info-grid">
              <div className="info-card">
                <label>Name</label>
                <span>{report.employeeName || user?.name || '-'}</span>
              </div>
              <div className="info-card">
                <label>Email</label>
                <span>{report.employeeEmail || user?.email || '-'}</span>
              </div>
              <div className="info-card">
                <label>Designation</label>
                <span>{report.designation || '-'}</span>
              </div>
              <div className="info-card">
                <label>Employee ID</label>
                <span>{report.employeeId || '-'}</span>
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

          {/* Charts */}
          {(chartsData || report) && (
            <div className="report-section">
              <h2>Attendance Charts</h2>
              <AttendanceCharts
                dailyBreakdown={chartsData?.dailyBreakdown || []}
                pieData={chartsData?.pieData || (report ? {
                  present: report.attendance?.totalPresent || 0,
                  absent: report.attendance?.totalAbsent || 0,
                  halfDay: report.attendance?.halfDays || 0,
                  leave: report.attendance?.totalLeave || 0
                } : null)}
                employeeSummary={chartsData?.employeeSummary || []}
              />
            </div>
          )}

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

          {/* Performance Summary */}
          <div className="report-section">
            <h2>Performance Summary</h2>
            <div className="performance-card">
              <div className="performance-item">
                <span className="performance-label">Attendance Rate:</span>
                <span className="performance-value">
                  {report.attendance?.attendancePercentage?.toFixed(1) || '0'}%
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

      {activeTab === 'monthly' && !report && !loading && (
        <div className="no-data">No report data available for {monthName} {viewYear}</div>
      )}
    </div>
  );
};

export default EmployeeReports;
