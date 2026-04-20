import React, { useState } from 'react';
import './LoginModal.css';

const LoginModal = ({ onSelectLoginType, onClose }) => {
  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>Welcome! Select Login Type</h2>
          <p>Choose how you want to access the system</p>
        </div>

        <div className="login-options">
          <div 
            className="login-option admin-option"
            onClick={() => onSelectLoginType('admin')}
          >
            <div className="option-icon">👑</div>
            <h3>Admin Login</h3>
            <p>Full access to create, edit, delete data</p>
            <span className="option-badge">Full Control</span>
          </div>

          <div 
            className="login-option employee-option"
            onClick={() => onSelectLoginType('employee')}
          >
            <div className="option-icon">👤</div>
            <h3>Employee Login</h3>
            <p>View-only access to data</p>
            <span className="option-badge view-only">View Only</span>
          </div>

          <div 
            className="login-option user-option"
            onClick={() => onSelectLoginType('user')}
          >
            <div className="option-icon">🔑</div>
            <h3>User Login</h3>
            <p>Regular user access</p>
            <span className="option-badge">Standard</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
