import { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import './MyTasks.css';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getMyTasks();
      if (response.success) {
        setTasks(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const response = await taskAPI.updateTask(taskId, newStatus, '');
      if (response.success) {
        setTasks(prev => prev.map(task => 
          task._id === taskId ? { ...task, status: newStatus } : task
        ));
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status.toLowerCase() === filter.toLowerCase();
  });

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

  if (loading) {
    return <div className="my-tasks-loading">Loading tasks...</div>;
  }

  return (
    <div className="my-tasks-container">
      <div className="my-tasks-header">
        <h2>My Tasks</h2>
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'pending' ? 'active' : ''} 
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={filter === 'in progress' ? 'active' : ''} 
            onClick={() => setFilter('in progress')}
          >
            In Progress
          </button>
          <button 
            className={filter === 'completed' ? 'active' : ''} 
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="no-tasks">
          <p>No tasks found</p>
        </div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map(task => (
            <div key={task._id} className="task-card">
              <div className="task-header">
                <h3>{task.title}</h3>
                <span className={getPriorityBadgeClass(task.priority)}>
                  {task.priority}
                </span>
              </div>
              
              <p className="task-description">{task.description}</p>
              
              <div className="task-meta">
                <span className="due-date">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </span>
                <span className={getStatusBadgeClass(task.status)}>
                  {task.status}
                </span>
              </div>

              {task.status !== 'Completed' && task.status !== 'Cancelled' && (
                <div className="task-actions">
                  {task.status === 'Pending' && (
                    <button 
                      className="btn-start"
                      onClick={() => handleUpdateStatus(task._id, 'In Progress')}
                    >
                      Start Task
                    </button>
                  )}
                  {task.status === 'In Progress' && (
                    <button 
                      className="btn-complete"
                      onClick={() => handleUpdateStatus(task._id, 'Completed')}
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasks;
