import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, TrendingDown, Clock, Activity, AlertCircle, 
  CheckCircle2, Info, ArrowRight, User, Brain, Zap, Sparkles,
  ArrowUpRight, AlertTriangle
} from 'lucide-react';
import axios from 'axios';

const AttendancePredictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(document.body.classList.contains('dark-theme'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains('dark-theme'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    const fetchPredictions = async () => {
      try {
        const res = await axios.get('/api/ai/predictions');
        setPredictions(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchPredictions();
    return () => observer.disconnect();
  }, []);

  // Premium Theme Config
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
            <Activity size={48} color={theme.accent} />
          </motion.div>
          <p style={{ marginTop: 20, color: theme.textMuted, fontWeight: 700, letterSpacing: '2px' }}>NEURAL RISK SCANNING...</p>
        </div>
      </div>
    );
  }

  const Card = ({ children, style = {} }) => (
    <div style={{
      background: theme.surface,
      backdropFilter: 'blur(16px)',
      border: `1px solid ${theme.border}`,
      borderRadius: '28px',
      padding: '32px',
      boxShadow: theme.shadow,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
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
      {/* Premium Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
             <div style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', padding: '10px', borderRadius: '12px', boxShadow: '0 8px 16px rgba(225, 29, 72, 0.3)' }}>
                <ShieldAlert color="white" size={24} />
             </div>
             <h1 style={{ fontSize: '36px', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
               Predictive <span style={{ color: '#f43f5e' }}>Risk</span> Scan
             </h1>
          </div>
          <p style={{ color: theme.textMuted, fontSize: '16px', fontWeight: 500, margin: 0 }}>Identifying behavioral burnout and attendance patterns through neural modeling.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ padding: '12px 24px', background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'white', borderRadius: '16px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Activity size={18} color="#10b981" />
             <span style={{ fontSize: '13px', fontWeight: 700 }}>Real-time Feed: <span style={{ color: '#10b981' }}>Active</span></span>
          </div>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
         <Card style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #f43f5e' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '16px', borderRadius: '18px' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase', margin: 0 }}>Critical Alerts</p>
              <h3 style={{ fontSize: '24px', fontWeight: 900, margin: 0 }}>{predictions.filter(p => p.status === 'Critical').length} Employees</h3>
            </div>
         </Card>

         <Card style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '16px', borderRadius: '18px' }}>
              <Zap size={24} />
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase', margin: 0 }}>Warning Zones</p>
              <h3 style={{ fontSize: '24px', fontWeight: 900, margin: 0 }}>{predictions.filter(p => p.status === 'Warning').length} Employees</h3>
            </div>
         </Card>

         <Card style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #10b981' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '18px' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase', margin: 0 }}>Workforce Stability</p>
              <h3 style={{ fontSize: '24px', fontWeight: 900, margin: 0 }}>High Performance</h3>
            </div>
         </Card>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '32px' }}>
        {predictions.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -8 }}
          >
            <Card style={{ height: '100%' }}>
              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                 <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                   <div style={{ 
                     width: '56px', 
                     height: '56px', 
                     borderRadius: '18px', 
                     background: p.status === 'Critical' ? 'rgba(244, 63, 94, 0.1)' : p.status === 'Warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     border: `1px solid ${p.status === 'Critical' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                   }}>
                     <User size={28} color={p.status === 'Critical' ? '#f43f5e' : p.status === 'Warning' ? '#f59e0b' : '#10b981'} />
                   </div>
                   <div>
                     <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{p.name}</h3>
                     <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted, fontWeight: 600 }}>{p.department} Unit</p>
                   </div>
                 </div>

                 <div style={{ 
                   padding: '6px 12px', 
                   borderRadius: '12px', 
                   background: p.status === 'Critical' ? '#f43f5e' : p.status === 'Warning' ? '#f59e0b' : '#10b981',
                   color: 'white',
                   fontSize: '10px',
                   fontWeight: 900,
                   textTransform: 'uppercase',
                   letterSpacing: '1px'
                 }}>
                   {p.status}
                 </div>
              </div>

              {/* Risk Gauge */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                   <span style={{ fontSize: '13px', fontWeight: 700, color: theme.textMuted }}>AI Risk Score</span>
                   <span style={{ fontSize: '22px', fontWeight: 900, color: p.status === 'Critical' ? '#f43f5e' : p.status === 'Warning' ? '#f59e0b' : '#10b981' }}>{p.probability}</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: isDarkMode ? '#1e293b' : '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: p.probability }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{ 
                      height: '100%', 
                      background: p.status === 'Critical' ? 'linear-gradient(90deg, #f43f5e, #e11d48)' : p.status === 'Warning' ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #10b981, #059669)',
                      boxShadow: p.status === 'Critical' ? '0 0 10px rgba(244, 63, 94, 0.4)' : 'none'
                    }}
                  />
                </div>
              </div>

              {/* Behavioral Indicators */}
              <div style={{ 
                background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', 
                borderRadius: '20px', 
                padding: '20px', 
                marginBottom: '28px',
                border: `1px solid ${theme.border}`
              }}>
                <p style={{ fontSize: '10px', fontWeight: 900, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Primary Indicators</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {p.factors.map((factor, fi) => (
                    <div key={fi} style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                       <div style={{ marginTop: '2px' }}>
                         {p.status === 'Critical' ? <TrendingDown size={14} color="#f43f5e" /> : <Sparkles size={14} color={theme.accent} />}
                       </div>
                       <p style={{ fontSize: '12px', fontWeight: 500, margin: 0, lineHeight: '1.4', color: isDarkMode ? '#cbd5e1' : '#475569' }}>{factor}</p>
                    </div>
                  ))}
                  {p.factors.length === 0 && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       <CheckCircle2 size={16} color="#10b981" />
                       <p style={{ fontSize: '12px', fontWeight: 500, margin: 0, color: '#10b981' }}>Patterns indicate high stability</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                background: p.status === 'Critical' ? '#f43f5e' : isDarkMode ? '#1e293b' : 'white',
                border: `1px solid ${p.status === 'Critical' ? 'transparent' : theme.border}`,
                color: p.status === 'Critical' ? 'white' : theme.text,
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s',
                boxShadow: p.status === 'Critical' ? '0 10px 20px -5px rgba(244, 63, 94, 0.4)' : 'none'
              }}>
                Take Action <ArrowRight size={18} />
              </button>
            </Card>
          </motion.div>
        ))}
      </div>

      <footer style={{ marginTop: '60px', textAlign: 'center' }}>
         <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9', borderRadius: '20px', border: `1px solid ${theme.border}` }}>
            <Brain size={14} color={theme.accent} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '2px' }}>Neural Engine v2.4 • Dynamic Risk Calibration</span>
         </div>
      </footer>
    </div>
  );
};

export default AttendancePredictions;
