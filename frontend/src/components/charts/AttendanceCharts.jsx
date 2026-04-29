import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  halfDay: '#f59e0b',
  leave: '#3b82f6'
};

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

const AttendanceCharts = ({ dailyBreakdown = [], pieData = null, employeeSummary = [] }) => {
  // Prepare bar chart data
  const barData = dailyBreakdown.map(d => ({
    date: d.label || d.date,
    Present: d.present || 0,
    Absent: d.absent || 0,
    'Half Day': d.halfDay || 0,
    Leave: d.leave || 0
  }));

  // Prepare pie chart data
  const pieChartData = pieData ? [
    { name: 'Present', value: pieData.present || 0 },
    { name: 'Absent', value: pieData.absent || 0 },
    { name: 'Half Day', value: pieData.halfDay || 0 },
    { name: 'Leave', value: pieData.leave || 0 }
  ].filter(d => d.value > 0) : [];

  // Prepare employee bar data (top 10)
  const employeeBarData = employeeSummary.slice(0, 10).map(e => ({
    name: e.name?.split(' ')[0] || 'Unknown',
    Present: e.present || 0,
    Absent: e.absent || 0,
    'Half Day': e.halfDay || 0,
    Leave: e.leave || 0
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="attendance-charts">
      {/* Bar Chart - Daily Attendance */}
      {barData.length > 0 && (
        <div className="chart-section">
          <h3>Daily Attendance Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.2)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Present" fill={COLORS.present} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Absent" fill={COLORS.absent} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Half Day" fill={COLORS.halfDay} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Leave" fill={COLORS.leave} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie Chart - Present vs Absent */}
      {pieChartData.length > 0 && (
        <div className="chart-section">
          <h3>Attendance Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieChartData.map((entry, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Employee-wise Bar Chart */}
      {employeeBarData.length > 0 && (
        <div className="chart-section">
          <h3>Employee-wise Attendance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employeeBarData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Present" fill={COLORS.present} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Absent" fill={COLORS.absent} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Half Day" fill={COLORS.halfDay} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Leave" fill={COLORS.leave} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AttendanceCharts;
