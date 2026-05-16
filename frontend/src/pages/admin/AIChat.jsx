import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Loader2, Sparkles, Trash2, 
  ChevronRight, Brain, Zap, ShieldAlert, MoreHorizontal,
  Maximize2, Minimize2, Terminal, Info
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = '/api/ai';

const AIChat = () => {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hello! I am your Advanced AI HR Assistant. I have deep access to all attendance records, performance metrics, and behavioral patterns. How can I assist you today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(document.body.classList.contains('dark-theme'));
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains('dark-theme'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/chat`, { query: input });
      const reply = res.data.response || "I processed your request but have no specific details to share at this moment.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error connecting to the AI Engine. Please check if the backend service is running.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ 
      role: 'assistant', 
      content: 'Chat history cleared. How else can I help you today?' 
    }]);
  };

  const suggestions = [
    { text: "Who was absent today?", icon: <Zap size={14} color="#f59e0b" /> },
    { text: "Predict absence risks", icon: <ShieldAlert size={14} color="#ef4444" /> },
    { text: "Top performers this month", icon: <Brain size={14} color="#6366f1" /> }
  ];

  // Premium Theme Config
  const theme = {
    bg: isDarkMode ? '#030712' : '#f8fafc',
    surface: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.9)',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    text: isDarkMode ? '#f8fafc' : '#0f172a',
    textMuted: isDarkMode ? '#94a3b8' : '#64748b',
    accent: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    userBubble: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    aiBubble: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    inputArea: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)',
    shadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  };

  return (
    <div style={{
      position: isFullScreen ? 'fixed' : 'relative',
      inset: isFullScreen ? 0 : 'auto',
      zIndex: isFullScreen ? 9999 : 1,
      height: isFullScreen ? '100vh' : 'calc(100vh - 140px)',
      width: isFullScreen ? '100vw' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      background: theme.bg,
      borderRadius: isFullScreen ? 0 : '32px',
      border: isFullScreen ? 'none' : `1px solid ${theme.border}`,
      boxShadow: theme.shadow,
      margin: isFullScreen ? 0 : '0 24px',
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Premium Chat Header */}
      <div style={{
        padding: '24px 32px',
        background: theme.gradient,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Decoration */}
        <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: '400px', height: '400px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', blur: '80px' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 2 }}>
           <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)' }}>
             <Bot size={28} color="white" />
           </div>
           <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <h2 style={{ color: 'white', margin: 0, fontWeight: 900, fontSize: '22px', letterSpacing: '-0.5px' }}>Neural Assistant</h2>
               <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.4)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <div style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', animate: 'pulse 2s infinite' }}></div>
                 System Online
               </div>
             </div>
             <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: '4px 0 0 0', fontWeight: 600 }}>v2.4 Enterprise Analytics Engine</p>
           </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 2 }}>
          <button onClick={() => setIsFullScreen(!isFullScreen)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <button onClick={clearChat} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Message Canvas */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        background: isDarkMode ? '#020617' : '#f8fafc',
        backgroundImage: isDarkMode ? 'radial-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px)' : 'radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} className="custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: '16px',
                maxWidth: '80%'
              }}>
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '16px', 
                  background: msg.role === 'user' ? theme.gradient : theme.aiBubble,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  border: `1px solid ${theme.border}`
                }}>
                  {msg.role === 'user' ? <User size={20} color="white" /> : <Sparkles size={20} color={theme.accent} />}
                </div>

                <div>
                  <div style={{
                    padding: '20px 24px',
                    borderRadius: '24px',
                    background: msg.role === 'user' ? theme.userBubble : theme.aiBubble,
                    color: msg.role === 'user' ? 'white' : theme.text,
                    fontSize: '15px',
                    lineHeight: '1.6',
                    fontWeight: 500,
                    boxShadow: theme.shadow,
                    border: `1px solid ${theme.border}`,
                    borderTopRightRadius: msg.role === 'user' ? '4px' : '24px',
                    borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '24px',
                    backdropFilter: 'blur(10px)'
                  }}>
                    {msg.content}
                  </div>
                  <p style={{ 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    color: theme.textMuted, 
                    margin: '8px 0 0 0', 
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {msg.role === 'user' ? 'Authorized Admin' : 'Neural Core'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '60px' }}>
            <Loader2 size={16} color={theme.accent} className="animate-spin" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, letterSpacing: '1px' }}>PROCESSING NEURAL FEEDBACK...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Terminal */}
      <div style={{
        padding: '32px',
        background: theme.inputArea,
        borderTop: `1px solid ${theme.border}`,
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Suggestions */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s.text)}
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'white',
                  border: `1px solid ${theme.border}`,
                  padding: '8px 18px',
                  borderRadius: '20px',
                  color: theme.text,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.background = isDarkMode ? 'rgba(99, 102, 241, 0.1)' : '#eef2ff'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.03)' : 'white'; }}
              >
                {s.icon}
                {s.text}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} style={{ position: 'relative' }}>
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Inquire about workforce metrics or predictive patterns..."
               style={{
                 width: '100%',
                 padding: '20px 80px 20px 28px',
                 borderRadius: '24px',
                 background: isDarkMode ? '#0f172a' : 'white',
                 border: `2px solid ${isDarkMode ? '#1e293b' : '#f1f5f9'}`,
                 color: theme.text,
                 fontSize: '16px',
                 fontWeight: 500,
                 outline: 'none',
                 boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                 transition: 'all 0.3s'
               }}
               onFocus={(e) => e.target.style.borderColor = theme.accent}
               onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#1e293b' : '#f1f5f9'}
             />
             <button
               type="submit"
               disabled={!input.trim() || loading}
               style={{
                 position: 'absolute',
                 right: '10px',
                 top: '50%',
                 transform: 'translateY(-50%)',
                 background: theme.gradient,
                 border: 'none',
                 width: '54px',
                 height: '54px',
                 borderRadius: '18px',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 color: 'white',
                 cursor: input.trim() ? 'pointer' : 'default',
                 opacity: input.trim() ? 1 : 0.5,
                 transition: 'all 0.3s',
                 boxShadow: '0 8px 15px -5px rgba(99, 102, 241, 0.4)'
               }}
             >
               <Send size={24} />
             </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 10px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.textMuted }}>
                <Terminal size={12} />
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>Authorized Session: Admin_ROOT</span>
             </div>
             <div style={{ display: 'flex', gap: '20px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: theme.accent, cursor: 'pointer', textTransform: 'uppercase' }}>Advanced Mode</span>
                <span style={{ fontSize: '10px', fontWeight: 800, color: theme.textMuted, cursor: 'pointer', textTransform: 'uppercase' }}>Export Log</span>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1e293b' : '#cbd5e1'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${theme.accent}; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default AIChat;
