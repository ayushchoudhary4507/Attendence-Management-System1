import { useState, useEffect } from 'react';
import { salaryAPI } from '../../services/api';
import './AdminSalary.css';

const AdminSalary = ({ user }) => {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [employees, setEmployees] = useState([]);
  const [calcData, setCalcData] = useState({
    employeeId: '',
    basicSalary: 20000,
    perDaySalary: 0,
    perHourSalary: 0,
    deductions: 0,
    bonus: 0,
    overtimePay: 0,
    notes: ''
  });

  useEffect(() => {
    fetchSalaries();
    fetchEmployees();
  }, [viewMonth, viewYear]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const data = await salaryAPI.getAllSalaries(viewMonth, viewYear);
      if (data.success) setSalaries(data.data);
    } catch (err) {
      console.error('Error fetching salaries:', err);
    } finally {
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

  const handleCalculate = async (e) => {
    e.preventDefault();
    try {
      const data = await salaryAPI.calculateSalary({
        ...calcData,
        month: viewMonth,
        year: viewYear
      });
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowCalcModal(false);
        fetchSalaries();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to calculate salary' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error calculating salary' });
    }
  };

  const handleBulkCalculate = async () => {
    try {
      const data = await salaryAPI.bulkCalculate(viewMonth, viewYear);
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowBulkModal(false);
        fetchSalaries();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error in bulk calculation' });
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      const data = await salaryAPI.markAsPaid(id);
      if (data.success) {
        setMessage({ type: 'success', text: 'Salary marked as paid' });
        fetchSalaries();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error marking as paid' });
    }
  };

  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' });
  const totalSalary = salaries.reduce((sum, s) => sum + s.finalSalary, 0);
  const paidCount = salaries.filter(s => s.isPaid).length;

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="admin-salary">
      <div className="page-header">
        <div className="header-left">
          <h1>Salary Management</h1>
          <p>Calculate and manage employee salaries</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowCalcModal(true)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Calculate Salary
          </button>
          <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)}>
            Bulk Calculate
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      <div className="salary-controls">
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

      {/* Summary */}
      <div className="salary-summary-row">
        <div className="summary-stat">
          <span className="stat-value">{salaries.length}</span>
          <span className="stat-label">Calculated</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{paidCount}</span>
          <span className="stat-label">Paid</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{salaries.length - paidCount}</span>
          <span className="stat-label">Unpaid</span>
        </div>
        <div className="summary-stat total">
          <span className="stat-value">₹{totalSalary.toLocaleString()}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      {/* Salaries Table */}
      <div className="salary-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Basic</th>
              <th>Present Days</th>
              <th>Working Hrs</th>
              <th>Deductions</th>
              <th>Bonus</th>
              <th>Final Salary</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {salaries.length === 0 ? (
              <tr><td colSpan="9" className="empty-cell">No salary records for {monthName} {viewYear}</td></tr>
            ) : (
              salaries.map(s => (
                <tr key={s._id}>
                  <td>
                    <div className="employee-info">
                      <span className="emp-name">{s.employeeId?.name || 'N/A'}</span>
                      <span className="emp-email">{s.employeeId?.email || ''}</span>
                    </div>
                  </td>
                  <td>₹{s.basicSalary?.toLocaleString()}</td>
                  <td>{s.totalPresentDays}</td>
                  <td>{s.totalWorkingHours?.toFixed(1)}h</td>
                  <td className="deduction-col">₹{s.deductions?.toLocaleString()}</td>
                  <td className="bonus-col">₹{s.bonus?.toLocaleString()}</td>
                  <td className="final-col">₹{s.finalSalary?.toLocaleString()}</td>
                  <td>
                    <span className={`paid-badge ${s.isPaid ? 'paid' : 'unpaid'}`}>
                      {s.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td>
                    {!s.isPaid && (
                      <button className="btn btn-sm btn-success" onClick={() => handleMarkPaid(s._id)}>
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Calculate Salary Modal */}
      {showCalcModal && (
        <div className="modal-overlay" onClick={() => setShowCalcModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Calculate Salary</h2>
              <button className="modal-close" onClick={() => setShowCalcModal(false)}>×</button>
            </div>
            <form onSubmit={handleCalculate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Employee</label>
                  <select value={calcData.employeeId} onChange={e => setCalcData({ ...calcData, employeeId: e.target.value })} required>
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.designation})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Basic Salary (₹)</label>
                  <input type="number" value={calcData.basicSalary} onChange={e => setCalcData({ ...calcData, basicSalary: Number(e.target.value) })} required min="0" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Per Day Salary (₹)</label>
                    <input type="number" value={calcData.perDaySalary} onChange={e => setCalcData({ ...calcData, perDaySalary: Number(e.target.value) })} min="0" placeholder="Auto-calculated if empty" />
                  </div>
                  <div className="form-group">
                    <label>Per Hour Salary (₹)</label>
                    <input type="number" value={calcData.perHourSalary} onChange={e => setCalcData({ ...calcData, perHourSalary: Number(e.target.value) })} min="0" placeholder="Auto-calculated if empty" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Deductions (₹)</label>
                    <input type="number" value={calcData.deductions} onChange={e => setCalcData({ ...calcData, deductions: Number(e.target.value) })} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Bonus (₹)</label>
                    <input type="number" value={calcData.bonus} onChange={e => setCalcData({ ...calcData, bonus: Number(e.target.value) })} min="0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Overtime Pay (₹)</label>
                    <input type="number" value={calcData.overtimePay} onChange={e => setCalcData({ ...calcData, overtimePay: Number(e.target.value) })} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <input type="text" value={calcData.notes} onChange={e => setCalcData({ ...calcData, notes: e.target.value })} placeholder="Optional notes" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCalcModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!calcData.employeeId}>Calculate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Calculate Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bulk Calculate Salary</h2>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>This will calculate salary for all active employees for <strong>{monthName} {viewYear}</strong> who don't already have a salary record.</p>
              <p className="warning-text">Note: Default basic salary of ₹20,000 will be used. You can edit individual records later.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkCalculate}>Calculate All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSalary;
