import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import './TaskManager.css';

const TaskManager = ({ employees, onClose, onTaskCreated }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'Medium',
    notes: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getAllTasks();
      if (response.success) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const response = await taskAPI.createTask(formData);
      if (response.success) {
        alert('Task created successfully!');
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          assignedTo: '',
          dueDate: '',
          priority: 'Medium',
          notes: ''
        });
        fetchTasks();
        if (onTaskCreated) onTaskCreated();
      }
    } catch (error) {
      alert('Error creating task: ' + (error.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const response = await taskAPI.deleteTask(taskId);
      if (response.success) {
        alert('Task deleted!');
        fetchTasks();
      }
    } catch (error) {
      alert('Error deleting task');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed': return 'status-badge completed';
      case 'In Progress': return 'status-badge in-progress';
      case 'Pending': return 'status-badge pending';
      case 'Cancelled': return 'status-badge cancelled';
      default: return 'status-badge';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Urgent': return 'priority-badge urgent';
      case 'High': return 'priority-badge high';
      case 'Medium': return 'priority-badge medium';
      case 'Low': return 'priority-badge low';
      default: return 'priority-badge';
    }
  };

  return (
    <div className="task-manager-overlay">
      <div className="task-manager-modal">
        <div className="task-manager-header">
          <h2>Task Manager</h2>
          <div className="header-actions">
            <button className="btn-create" onClick={() => setShowCreateModal(true)}>
              + Create Task
            </button>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="task-manager-content">
          {loading ? (
            <div className="loading">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks created yet</p>
              <button className="btn-create" onClick={() => setShowCreateModal(true)}>
                Create First Task
              </button>
            </div>
          ) : (
            <div className="tasks-table-container">
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task._id}>
                      <td className="task-title">{task.title}</td>
                      <td>
                        {task.assignedTo?.name || task.assignedToEmail || 'Unknown'}
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(task.status)}>
                          {task.status}
                        </span>
                      </td>
                      <td>
                        <span className={getPriorityBadgeClass(task.priority)}>
                          {task.priority}
                        </span>
                      </td>
                      <td>{new Date(task.dueDate).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDeleteTask(task._id)}
                          title="Delete Task"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="create-task-modal-overlay">
          <div className="create-task-modal">
            <div className="modal-header">
              <h3>Create New Task</h3>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateTask} className="create-task-form">
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  placeholder="Enter task title"
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  placeholder="Enter task description"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Assign To *</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees?.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
