import React, { useState, useEffect } from 'react';
import './Projects.css';
import { projectsAPI } from '../services/api';

const Projects = ({ userRole }) => {
  const isAdmin = userRole === 'admin';
  const isEmployee = userRole === 'employee';
  
  // Get current logged in user info
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
  }, []);
  const [filter, setFilter] = useState('All');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Form state for new project
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'Planning',
    progress: 0,
    team: '',
    deadline: '',
    priority: 'Medium'
  });

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getAllProjects();
      if (response.success) {
        // Format the data for display
        let formattedProjects = response.data.map(p => ({
          ...p,
          deadline: p.deadline ? new Date(p.deadline).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }) : 'No deadline'
        }));
        
        // Filter projects based on role
        if (isEmployee && currentUser?.email) {
          // Employee sees projects they are part of
          formattedProjects = formattedProjects.filter(proj => 
            proj.team?.some(member => 
              member?.toLowerCase().includes(currentUser.name?.toLowerCase()) ||
              member?.toLowerCase().includes(currentUser.email?.split('@')[0]?.toLowerCase())
            )
          );
        }
        // Admin sees all projects (no filter)
        
        setProjects(formattedProjects);
      }
    } catch (err) {
      setError('Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Access denied. Only admin can create projects.');
      return;
    }
    try {
      const projectData = {
        ...newProject,
        team: newProject.team.split(',').map(t => t.trim()).filter(t => t)
      };
      await projectsAPI.createProject(projectData);
      setShowAddModal(false);
      setNewProject({
        name: '',
        description: '',
        status: 'Planning',
        progress: 0,
        team: '',
        deadline: '',
        priority: 'Medium'
      });
      fetchProjects();
    } catch (err) {
      alert('Failed to create project');
      console.error('Error creating project:', err);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!isAdmin) {
      alert('Access denied. Only admin can delete projects.');
      return;
    }
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await projectsAPI.deleteProject(id);
        fetchProjects();
      } catch (err) {
        alert('Failed to delete project');
        console.error('Error deleting project:', err);
      }
    }
  };

  const handleEditClick = (project) => {
    if (!isAdmin) {
      alert('Access denied. Only admin can edit projects.');
      return;
    }
    setEditingProject(project);
    setNewProject({
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress,
      team: Array.isArray(project.team) ? project.team.join(', ') : project.team,
      deadline: project.deadline && project.deadline !== 'No deadline' 
        ? new Date(project.deadline).toISOString().split('T')[0] 
        : '',
      priority: project.priority
    });
    setShowEditModal(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      const projectData = {
        ...newProject,
        team: newProject.team.split(',').map(t => t.trim()).filter(t => t)
      };
      await projectsAPI.updateProject(editingProject._id, projectData);
      setShowEditModal(false);
      setEditingProject(null);
      setNewProject({
        name: '',
        description: '',
        status: 'Planning',
        progress: 0,
        team: '',
        deadline: '',
        priority: 'Medium'
      });
      fetchProjects();
    } catch (err) {
      alert('Failed to update project');
      console.error('Error updating project:', err);
    }
  };

  const filteredProjects = filter === 'All' ? projects : projects.filter(p => p.status === filter);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#10B981';
      case 'In Progress': return '#3B82F6';
      case 'Planning': return '#F59E0B';
      case 'On Hold': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div className="projects-page loading-page">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Loading projects from Atlas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="projects-page"><div className="error">{error}</div></div>;
  }

  return (
    <div className="projects-page">
      <div className="projects-header">
        <h1>Projects</h1>
        <div className="header-actions">
          <div className="projects-stats-row">
            <button 
              className={`btn-add ${!isAdmin ? 'disabled' : ''}`} 
              onClick={() => {
                if (isAdmin) {
                  setShowAddModal(true);
                } else {
                  alert('Access denied. Only admin can add new projects.');
                }
              }}
              title={isAdmin ? 'Add new project' : 'Only admin can add projects'}
              style={!isAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              + Add Project
            </button>
            <div className="stat-card">
              <span className="stat-value">{projects.length}</span>
              <span className="stat-label">Total Projects</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{projects.filter(p => p.status === 'In Progress').length}</span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{projects.filter(p => p.status === 'Completed').length}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="projects-filters">
        {['All', 'In Progress', 'Completed', 'Planning', 'On Hold'].map((status) => (
          <button
            key={status}
            className={`filter-btn ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="projects-grid">
        {filteredProjects.map((project) => (
          <div key={project._id} className="project-card">
            <div className="project-header">
              <h3>{project.name}</h3>
              <div className="header-actions">
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(project.status) + '20', color: getStatusColor(project.status) }}
                >
                  {project.status}
                </span>
                <button 
                  className={`btn-edit ${!isAdmin ? 'disabled' : ''}`}
                  onClick={() => handleEditClick(project)}
                  title={isAdmin ? 'Edit project' : 'View only - Admin access required'}
                  style={!isAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  ✎
                </button>
                <button 
                  className={`btn-delete ${!isAdmin ? 'disabled' : ''}`}
                  onClick={() => handleDeleteProject(project._id)}
                  title={isAdmin ? 'Delete project' : 'View only - Admin access required'}
                  style={!isAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  ×
                </button>
              </div>
            </div>
            <p className="project-description">{project.description}</p>
            
            <div className="project-progress">
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${project.progress}%`, backgroundColor: getStatusColor(project.status) }}></div>
                </div>
                <span className="progress-text">{project.progress}%</span>
              </div>
            </div>

            <div className="project-details">
              <div className="detail detail-team">
                <span className="label">Team:</span>
                <div className="team-avatars">
                  {project.team.slice(0, 4).map((member, i) => (
                    <span key={i} className="avatar" title={member}>{member[0]}</span>
                  ))}
                  {project.team.length > 4 && (
                    <span className="avatar avatar-more" title={`${project.team.length - 4} more members`}>+{project.team.length - 4}</span>
                  )}
                </div>
              </div>
              <div className="detail">
                <span className="label">Deadline:</span>
                <span>{project.deadline}</span>
              </div>
              <div className="detail detail-priority">
                <span className="label">Priority:</span>
                <span className={`priority ${project.priority?.toLowerCase() || 'medium'}`}>{project.priority || 'Medium'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Project</h2>
            <form onSubmit={handleUpdateProject}>
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  >
                    <option>Planning</option>
                    <option>In Progress</option>
                    <option>On Hold</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProject.progress}
                    onChange={(e) => setNewProject({ ...newProject, progress: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Team Members (comma separated)</label>
                <input
                  type="text"
                  value={newProject.team}
                  onChange={(e) => setNewProject({ ...newProject, team: e.target.value })}
                  placeholder="John, Sarah, Mike"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Project to Atlas</h2>
            <form onSubmit={handleAddProject}>
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  >
                    <option>Planning</option>
                    <option>In Progress</option>
                    <option>On Hold</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProject.progress}
                    onChange={(e) => setNewProject({ ...newProject, progress: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Team Members (comma separated)</label>
                <input
                  type="text"
                  value={newProject.team}
                  onChange={(e) => setNewProject({ ...newProject, team: e.target.value })}
                  placeholder="John, Sarah, Mike"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
