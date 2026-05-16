import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Brain, TrendingUp, AlertTriangle, Users, Calendar, 
  FileText, MessageSquare, Award, Zap, ShieldAlert, ChevronRight,
  Activity, Star, Download, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_BASE_URL = '/api/ai';

const AIInsights = () => {
  const [rankings, setRankings] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(document.body.classList.contains('dark-theme'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains('dark-theme'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    fetchData();
    return () => observer.disconnect();
  }, []);

  const fetchData = async () => {
    try {
      const [rRes, pRes, aRes, dRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/performance-ranking`),
        axios.get(`${API_BASE_URL}/predictions`),
        axios.get(`${API_BASE_URL}/anomalies`),
        axios.get(`${API_BASE_URL}/department-report/all`)
      ]);
      setRankings(rRes.data);
      setPredictions(pRes.data);
      setAnomalies(aRes.data);
      setDeptStats(dRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching AI data:", error);
      setError("Failed to connect to AI Engine.");
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/export/intelligence-report`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'AI-Intelligence-Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to generate report.");
    }
  };

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  // Deep Premium Theme Config
  const theme = {
    bg: isDarkMode ? '#030712' : '#f8fafc',
    surface: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.9)',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    text: isDarkMode ? '#f8fafc' : '#0f172a',
    textMuted: isDarkMode ? '#94a3b8' : '#64748b',
    accent: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    shadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: theme.bg }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
            <Brain size={48} color={theme.accent} />
          </motion.div>
          <p style={{ marginTop: 20, color: theme.textMuted, fontWeight: 700, letterSpacing: '2px' }}>INITIALIZING NEURAL ENGINE...</p>
        </div>
      </div>
    );
  }

  const Card = ({ children, style = {} }) => (
    <div style={{
      background: theme.surface,
      backdropFilter: 'blur(16px)',
      border: `1px solid ${theme.border}`,
      borderRadius: '24px',
      padding: '24px',
      boxShadow: theme.shadow,
      ...style
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: theme.bg, 
      padding: '40px', 
      color: theme.text,
      fontFamily: "'Inter', sans-serif",
      transition: 'all 0.4s ease'
    }}>
      {/* Dynamic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
             <div style={{ background: theme.gradient, padding: '10px', borderRadius: '12px' }}>
                <Brain color="white" size={24} />
             </div>
             <h1 style={{ fontSize: '36px', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
               Neural <span style={{ color: theme.accent }}>Intelligence</span>
             </h1>
          </div>
          <p style={{ color: theme.textMuted, fontSize: '16px', fontWeight: 500, margin: 0 }}>Advanced Workforce Behavioral Analytics Console</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/ai-chat" style={{ textDecoration: 'none' }}>
            <button style={{ 
              padding: '12px 24px', 
              borderRadius: '14px', 
              background: isDarkMode ? '#1e293b' : 'white', 
              border: `1px solid ${theme.border}`,
              color: theme.text,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <MessageSquare size={18} color={theme.accent} /> AI Chat Assistant
            </button>
          </Link>
          <button 
            onClick={handleExportReport}
            style={{ 
              padding: '12px 24px', 
              borderRadius: '14px', 
              background: theme.gradient, 
              border: 'none',
              color: 'white',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Download size={18} /> Export Intelligence
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {[
          { label: "Stability Index", value: "94.2%", icon: TrendingUp, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
          { label: "Neural Risks", value: predictions.filter(p => p.status === 'Critical').length, icon: ShieldAlert, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
          { label: "Anomalies", value: anomalies.length, icon: Zap, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
          { label: "Analyzed Entities", value: rankings.length, icon: Users, color: theme.accent, bg: "rgba(99, 102, 241, 0.1)" }
        ].map((kpi, i) => (
          <Card key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: kpi.bg, color: kpi.color, padding: '16px', borderRadius: '20px' }}>
              <kpi.icon size={28} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', margin: '0 0 4px 0' }}>{kpi.label}</p>
              <h3 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{kpi.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px', marginBottom: '40px' }}>
        {/* Main Chart */}
        <Card style={{ gridColumn: 'span 2' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={20} color={theme.accent} /> Department Performance Matrix
              </h2>
              <div style={{ color: theme.accent, fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                LIVE FEED <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', animate: 'pulse 2s infinite' }}></div>
              </div>
           </div>
           <div style={{ height: '300px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={deptStats}>
                 <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} vertical={false} />
                 <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{fill: theme.textMuted, fontSize: 11}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: theme.textMuted, fontSize: 11}} />
                 <Tooltip cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: theme.shadow }} />
                 <Bar dataKey="avgAttendance" fill={theme.accent} radius={[6, 6, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </Card>

        {/* Prediction Radar */}
        <Card>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>Neural Absence Risk</h2>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Stable', value: predictions.filter(p => p.status === 'Stable').length || 1 },
                    { name: 'Warning', value: predictions.filter(p => p.status === 'Warning').length },
                    { name: 'Critical', value: predictions.filter(p => p.status === 'Critical').length },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={10}
                  dataKey="value"
                >
                  {COLORS.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: '20px', padding: '16px', background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: '16px', border: `1px solid ${theme.border}` }}>
             <p style={{ fontSize: '12px', color: theme.textMuted, margin: 0, fontStyle: 'italic' }}>
               "Predictive models suggest a 12% increase in seasonal absenteeism for the next cycle."
             </p>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        {/* Hall of Fame */}
        <Card>
           <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Award size={22} color="#f59e0b" /> Elite Performers
           </h2>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rankings.slice(0, 5).map((rank, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '16px', 
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'white',
                  borderRadius: '16px',
                  border: `1px solid ${theme.border}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: 32, height: 32, background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : '#cd7f32', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 800 }}>
                      {i + 1}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, margin: 0 }}>{rank.name}</p>
                      <p style={{ fontSize: '10px', color: theme.textMuted, textTransform: 'uppercase', margin: 0 }}>{rank.department}</p>
                    </div>
                  </div>
                  <div style={{ color: theme.accent, fontWeight: 800 }}>{rank.overallScore}%</div>
                </div>
              ))}
           </div>
        </Card>

        {/* Live Alerts */}
        <Card>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Zap size={22} color="#ef4444" /> System Alerts
           </h2>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              {anomalies.map((alert, i) => (
                <div key={i} style={{ 
                  padding: '16px', 
                  borderLeft: `4px solid ${alert.severity === 'Critical' ? '#ef4444' : '#f59e0b'}`,
                  background: isDarkMode ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.02)',
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: alert.severity === 'Critical' ? '#ef4444' : '#f59e0b' }}>{alert.type}</span>
                    <span style={{ fontSize: '10px', color: theme.textMuted }}>{new Date().toLocaleTimeString()}</span>
                  </div>
                  <p style={{ fontWeight: 700, margin: '0 0 4px 0' }}>{alert.name}</p>
                  <p style={{ fontSize: '12px', color: theme.textMuted, margin: 0 }}>{alert.description}</p>
                </div>
              ))}
           </div>
        </Card>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default AIInsights;
