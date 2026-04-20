import React, { useState } from 'react';

const Input = ({ label, value, onChange, type = 'text', placeholder, required }) => (
  <div className="form-group">
    <label>{label}{required && ' *'}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} />
  </div>
);

const Select = ({ label, value, onChange, options, required }) => (
  <div className="form-group">
    <label>{label}{required && ' *'}</label>
    <select value={value} onChange={e => onChange(e.target.value)} required={required}>
      <option value="">Select</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export const AddEmployeeModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({ name: '', email: '', designation: '', role: '', reportingTo: '', employeeId: '' });
  
  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onSubmit(form);
    if (result.success) onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Employee</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <Input label="Full Name" value={form.name} onChange={v => updateField('name', v)} required />
            <Input label="Email" type="email" value={form.email} onChange={v => updateField('email', v)} required />
          </div>
          <div className="form-row">
            <Select label="Designation" value={form.designation} onChange={v => updateField('designation', v)} 
              options={['Intern', 'Software Development', 'Manager']} required />
            <Select label="Role" value={form.role} onChange={v => updateField('role', v)} 
              options={['Employee', 'Interns', 'Manager']} required />
          </div>
          <div className="form-row">
            <Input label="Reporting To" value={form.reportingTo} onChange={v => updateField('reportingTo', v)} required />
            <Input label="Employee ID (Optional)" value={form.employeeId} onChange={v => updateField('employeeId', v)} />
          </div>
          <div style={{background: '#dbeafe', padding: '10px', borderRadius: '5px', margin: '15px 0', color: '#1e40af', fontSize: '14px'}}>
            💾 Will be saved to MongoDB Atlas
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const InviteModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({ email: '', role: '', message: '' });
  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onSubmit(form);
    if (result.success) onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite Employee</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={form.email} onChange={v => updateField('email', v)} required />
          <Select label="Role" value={form.role} onChange={v => updateField('role', v)} 
            options={['Employee', 'Interns', 'Manager']} required />
          <div className="form-group">
            <label>Message</label>
            <textarea value={form.message} onChange={e => updateField('message', e.target.value)} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Send</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default { AddEmployeeModal, InviteModal };
