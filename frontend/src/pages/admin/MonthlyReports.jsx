import { useState, useEffect } from 'react';
import { reportAPI } from '../../services/api';
import './MonthlyReports.css';

const MonthlyReports = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') fetchReports();
  }, [user, viewMonth, viewYear]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await reportAPI.getAllMonthlyReports(viewMonth, viewYear);
      if (data.success) setReports(data.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' });

  const filteredReports = reports.filter(r =>
    r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.employeeEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = filteredReports.reduce((acc, r) => ({
    present: acc.present + (r.attendance?.totalPresent || 0),
    absent: acc.absent + (r.attendance?.totalAbsent || 0),
    leave: acc.leave + (r.attendance?.totalLeave || 0),
    late: acc.late + (r.attendance?.lateCount || 0),
    salary: acc.salary + (r.salary?.finalSalary || 0)
  }), { present: 0, absent: 0, leave: 0, late: 0, salary: 0 });

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="monthly-reports">
      <div className="page-header">
        <div className="header-left">
          <h1>Monthly Reports</h1>
          <p>View attendance and salary reports for all employees</p>
        </div>
      </div>

      <div className="report-controls">
        <div className="month-selector">
          <select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="search-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card present">
          <span className="summary-num">{totals.present}</span>
          <span className="summary-label">Total Present</span>
        </div>
        <div className="summary-card absent">
          <span className="summary-num">{totals.absent}</span>
          <span className="summary-label">Total Absent</span>
        </div>
        <div className="summary-card leave">
          <span className="summary-num">{totals.leave}</span>
          <span className="summary-label">Total Leave</span>
        </div>
        <div className="summary-card late">
          <span className="summary-num">{totals.late}</span>
          <span className="summary-label">Late Count</span>
        </div>
        <div className="summary-card salary">
          <span className="summary-num">₹{totals.salary.toLocaleString()}</span>
          <span className="summary-label">Total Salary</span>
        </div>
      </div>

      {/* Reports Table */}
      <div className="reports-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Designation</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Leave</th>
              <th>Late</th>
              <th>Hours</th>
              <th>Final Salary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr><td colSpan="9" className="empty-cell">No reports found for {monthName} {viewYear}</td></tr>
            ) : (
              filteredReports.map(r => (
                <tr key={r.employeeId}>
                  <td>
                    <div className="employee-info">
                      <span className="emp-name">{r.employeeName}</span>
                      <span className="emp-email">{r.employeeEmail}</span>
                    </div>
                  </td>
                  <td>{r.designation}</td>
                  <td className="stat-present">{r.attendance?.totalPresent || 0}</td>
                  <td className="stat-absent">{r.attendance?.totalAbsent || 0}</td>
                  <td className="stat-leave">{r.attendance?.totalLeave || 0}</td>
                  <td className="stat-late">{r.attendance?.lateCount || 0}</td>
                  <td>{r.attendance?.totalWorkingHours?.toFixed(1) || 0}h</td>
                  <td className="salary-col">₹{r.salary?.finalSalary?.toLocaleString() || 'N/A'}</td>
                  <td>
                    {r.salary ? (
                      <span className={`paid-badge ${r.salary.isPaid ? 'paid' : 'unpaid'}`}>
                        {r.salary.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    ) : (
                      <span className="badge-na">N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyReports;
