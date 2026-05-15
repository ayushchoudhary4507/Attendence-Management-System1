import React, { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../services/api';
import { 
  FiSend, 
  FiUser, 
  FiCpu, 
  FiMessageSquare,
  FiLoader,
  FiTrash2
} from 'react-icons/fi';
import './AIChat.css';

const AIChat = () => {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hello! I am your AI Attendance Assistant. You can ask me questions about employee attendance, department performance, or trends. How can I help you today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      const data = await aiAPI.chat(input);

      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message || 'Sorry, I encountered an error processing your request.' }]);
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'I am having trouble connecting to the AI service right now. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ 
      role: 'assistant', 
      content: 'Hello! I am your AI Attendance Assistant. How can I help you today?' 
    }]);
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <FiMessageSquare className="ai-chat-icon" />
          <h2>AI Attendance Assistant</h2>
        </div>
        <button onClick={clearChat} className="ai-clear-btn" title="Clear Chat">
          <FiTrash2 />
        </button>
      </div>

      <div className="ai-messages-wrapper">
        {messages.map((msg, index) => (
          <div key={index} className={`ai-message ${msg.role}`}>
            <div className="ai-avatar">
              {msg.role === 'assistant' ? <FiCpu /> : <FiUser />}
            </div>
            <div className="ai-message-content">
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-message assistant">
            <div className="ai-avatar">
              <FiCpu />
            </div>
            <div className="ai-message-content loading">
              <FiLoader className="ai-chat-spinner" />
              <span>AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="ai-input-wrapper" onSubmit={handleSend}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything (e.g., 'Who was absent today?')"
          disabled={loading}
        />
        <button type="submit" disabled={!input.trim() || loading}>
          <FiSend />
        </button>
      </form>
      
      <div className="ai-chat-suggestions">
        <button onClick={() => setInput("Who was late this week?")}>Who was late this week?</button>
        <button onClick={() => setInput("Show low attendance employees")}>Low attendance employees</button>
        <button onClick={() => setInput("Which department is best?")}>Best department</button>
      </div>
    </div>
  );
};

export default AIChat;
