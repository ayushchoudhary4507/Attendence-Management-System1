import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Brain, TrendingUp, AlertTriangle, Users, Calendar, 
  FileText, MessageSquare, Award, Zap, ShieldAlert
} from 'lucide-react';
import axios from 'axios';

const AIAnalyticsDashboard = () => {
  const [rankings, setRankings] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rRes, pRes, aRes, dRes] = await Promise.all([
        axios.get('http://localhost:5005/api/ai/performance-ranking'),
        axios.get('http://localhost:5005/api/ai/predictions'),
        axios.get('http://localhost:5005/api/ai/anomalies'),
        axios.get('http://localhost:5005/api/ai/department-report/all')
      ]);
      setRankings(rRes.data);
      setPredictions(pRes.data);
      setAnomalies(aRes.data);
      setDeptStats(dRes.data);
      setLoading(loading => false);
    } catch (error) {
      console.error("Error fetching AI data:", error);
      setLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center">
          <Brain className="w-12 h-12 text-indigo-600 animate-pulse" />
          <p className="mt-4 text-slate-600 font-medium">Powering up AI Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Brain className="text-indigo-600" />
            AI HR Analytics Engine
          </h1>
          <p className="text-slate-500 mt-1">Enterprise-level employee performance & behavioral intelligence</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <FileText size={18} /> Export Full Report
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2">
            <Zap size={18} /> Generate Insights
          </button>
        </div>
      </header>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: "Avg. Performance", value: "84.2%", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
          { title: "Risk Alerts", value: predictions.filter(p => p.status === "Critical").length, icon: ShieldAlert, color: "text-rose-600", bg: "bg-rose-50" },
          { title: "Detected Anomalies", value: anomalies.length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { title: "Active Employees", value: rankings.length, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Award className="text-indigo-600" size={20} /> Department Performance Comparison
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="department" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="avgAttendance" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prediction Pie Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Absence Risk Distribution</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Stable', value: predictions.filter(p => p.status === 'Stable').length },
                    { name: 'Warning', value: predictions.filter(p => p.status === 'Warning').length },
                    { name: 'Critical', value: predictions.filter(p => p.status === 'Critical').length },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performers */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Award className="text-emerald-500" size={20} /> AI Performance Rankings
          </h2>
          <div className="space-y-4">
            {rankings.slice(0, 5).map((rank, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{rank.name}</p>
                    <p className="text-xs text-slate-500">{rank.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-600">{rank.overallScore}%</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Overall Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Anomalies List */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <AlertTriangle className="text-rose-500" size={20} /> Critical Behavior Anomalies
          </h2>
          <div className="space-y-4">
            {anomalies.slice(0, 5).map((anomaly, i) => (
              <div key={i} className="p-4 border-l-4 border-rose-500 bg-rose-50 rounded-r-xl">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-rose-900">{anomaly.type}</h4>
                  <span className="px-2 py-0.5 bg-rose-200 text-rose-700 text-[10px] font-bold rounded uppercase">
                    {anomaly.severity}
                  </span>
                </div>
                <p className="text-sm text-rose-800 mb-2">{anomaly.name}</p>
                <p className="text-xs text-rose-600 italic">"{anomaly.description}"</p>
              </div>
            ))}
            {anomalies.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ShieldAlert size={48} className="mb-4 opacity-20" />
                <p>No behavioral anomalies detected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalyticsDashboard;
