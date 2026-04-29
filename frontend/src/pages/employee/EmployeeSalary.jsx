import { useState, useEffect } from 'react';
import { salaryAPI, reportAPI, payslipAPI } from '../../services/api';
import './EmployeeSalary.css';

const EmployeeSalary = ({ user }) => {
  const [salaries, setSalaries] = useState([]);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (user?.id) fetchSalaryData();
  }, [user, viewMonth, viewYear]);

  const fetchSalaryData = async () => {
    try {
      setLoading(true);
      const salaryData = await salaryAPI.getMySalary();
      if (salaryData.success) {
        setSalaries(salaryData.data);
        const current = salaryData.data.find(s => s.month === viewMonth && s.year === viewYear);
        setSelectedSalary(current || null);
      }
      const reportData = await reportAPI.getMyReport(viewMonth, viewYear);
      if (reportData.success) setReport(reportData.data);
    } catch (err) {
      console.error('Error fetching salary:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' });

  const handleDownloadPayslip = async () => {
    try {
      setDownloading(true);
      const response = await payslipAPI.downloadMyPayslip(viewMonth, viewYear);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${monthName}_${viewYear}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading payslip:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="employee-salary">
      <div className="page-header">
        <div className="header-left">
          <h1>My Salary</h1>
          <p>View your salary details and breakdown</p>
        </div>
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
      </div>

      {selectedSalary ? (
        <div className="salary-content">
          {/* Salary Summary Card */}
          <div className="salary-summary-card">
            <div className="summary-header">
              <h2>{monthName} {viewYear} Salary</h2>
              <span className={`paid-badge ${selectedSalary.isPaid ? 'paid' : 'unpaid'}`}>
                {selectedSalary.isPaid ? 'Paid' : 'Unpaid'}
              </span>
              <button className="payslip-btn" onClick={handleDownloadPayslip} disabled={downloading}>
                {downloading ? 'Generating...' : 'Download Payslip'}
              </button>
            </div>
            <div className="summary-amount">
              <span className="currency">₹</span>
              <span className="amount">{selectedSalary.finalSalary?.toLocaleString()}</span>
            </div>
            {selectedSalary.isPaid && selectedSalary.paidOn && (
              <div className="paid-date">Paid on {new Date(selectedSalary.paidOn).toLocaleDateString()}</div>
            )}
          </div>

          {/* Salary Breakdown */}
          <div className="salary-breakdown">
            <h3>Salary Breakdown</h3>
            <div className="breakdown-grid">
              <div className="breakdown-item">
                <span className="breakdown-label">Basic Salary</span>
                <span className="breakdown-value">₹{selectedSalary.basicSalary?.toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Per Day Salary</span>
                <span className="breakdown-value">₹{selectedSalary.perDaySalary?.toFixed(2)}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Per Hour Salary</span>
                <span className="breakdown-value">₹{selectedSalary.perHourSalary?.toFixed(2)}</span>
              </div>
              <div className="breakdown-divider"></div>
              <div className="breakdown-item">
                <span className="breakdown-label">Present Days</span>
                <span className="breakdown-value positive">{selectedSalary.totalPresentDays}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Absent Days</span>
                <span className="breakdown-value negative">{selectedSalary.totalAbsentDays}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Working Hours</span>
                <span className="breakdown-value">{selectedSalary.totalWorkingHours?.toFixed(1)}h</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Late Count</span>
                <span className="breakdown-value negative">{selectedSalary.lateCount}</span>
              </div>
              <div className="breakdown-divider"></div>
              <div className="breakdown-item">
                <span className="breakdown-label">Overtime Pay</span>
                <span className="breakdown-value positive">+₹{selectedSalary.overtimePay?.toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Bonus</span>
                <span className="breakdown-value positive">+₹{selectedSalary.bonus?.toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Deductions</span>
                <span className="breakdown-value negative">-₹{selectedSalary.deductions?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Report Summary */}
          {report && report.attendance && (
            <div className="attendance-summary">
              <h3>Attendance Summary - {monthName} {viewYear}</h3>
              <div className="attendance-stats">
                <div className="stat-item present">
                  <span className="stat-num">{report.attendance.totalPresent}</span>
                  <span className="stat-label">Present</span>
                </div>
                <div className="stat-item absent">
                  <span className="stat-num">{report.attendance.totalAbsent}</span>
                  <span className="stat-label">Absent</span>
                </div>
                <div className="stat-item leave">
                  <span className="stat-num">{report.attendance.totalLeave}</span>
                  <span className="stat-label">Leave</span>
                </div>
                <div className="stat-item late">
                  <span className="stat-num">{report.attendance.lateCount}</span>
                  <span className="stat-label">Late</span>
                </div>
                <div className="stat-item hours">
                  <span className="stat-num">{report.attendance.totalWorkingHours?.toFixed(1)}</span>
                  <span className="stat-label">Hours</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="no-salary">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.04c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
          <h3>No Salary Data</h3>
          <p>Salary for {monthName} {viewYear} has not been calculated yet</p>
        </div>
      )}

      {/* Salary History */}
      {salaries.length > 0 && (
        <div className="salary-history">
          <h3>Salary History</h3>
          <div className="history-list">
            {salaries.map(s => (
              <div key={s._id} className="history-item" onClick={() => { setViewMonth(s.month); setViewYear(s.year); }}>
                <div className="history-month">{new Date(s.year, s.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}</div>
                <div className="history-amount">₹{s.finalSalary?.toLocaleString()}</div>
                <span className={`paid-badge small ${s.isPaid ? 'paid' : 'unpaid'}`}>
                  {s.isPaid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSalary;
