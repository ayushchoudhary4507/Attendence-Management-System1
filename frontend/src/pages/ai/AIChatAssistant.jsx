import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Brain, X, Minimize2, Maximize2, Sparkles, AlertCircle } from 'lucide-react';
import axios from 'axios';

const AIChatAssistant = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm your AI HR Assistant. I can help you analyze employee performance, predict absence risks, and generate attendance reports. How can I assist you today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsTyping(true);

    try {
      const response = await axios.post('http://localhost:5005/api/ai/chat', { query });
      setMessages(prev => [...prev, { role: 'assistant', text: response.data.response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm sorry, I'm having trouble connecting to the analytics engine right now. Please try again in a moment." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Brain size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">AI HR Assistant</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-slate-500 font-medium">Enterprise Engine Online</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Sparkles size={20} />
          </button>
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-4 rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex justify-start"
            >
              <div className="flex gap-3 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm ml-11">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span className="text-xs text-slate-400 font-medium italic">Analyzing data context...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="p-6 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about employee performance, attendance trends, or risk reports..."
            className="w-full p-4 pr-16 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
          />
          <button 
            onClick={handleSend}
            disabled={!query.trim() || isTyping}
            className="absolute right-2 top-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
          >
            <Send size={20} />
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-4">
          {["Show low attendance", "Who is at risk?", "Top 5 employees"].map((hint, i) => (
            <button 
              key={i}
              onClick={() => setQuery(hint)}
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 rounded-full border border-slate-200 transition-all"
            >
              {hint}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default AIChatAssistant;
