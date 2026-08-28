import React, { useState, useEffect } from 'react';
import { dashboardConfigAPI } from '../../services/api';
import './MobileDashboardConfig.css';

// All modules & features available across the website & sidebar
const WEBSITE_MODULE_PRESETS = [
  {
    id: 'total_employees',
    title: 'Total Employees',
    dataType: 'total_employees',
    icon: 'groups_rounded',
    color: '#6366f1',
    route: '/employees',
    sampleValue: '48',
    description: 'Total registered workforce count'
  },
  {
    id: 'present_today',
    title: 'Present Today',
    dataType: 'present_today',
    icon: 'check_circle_rounded',
    color: '#10b981',
    route: '/attendance',
    sampleValue: '42',
    description: 'Staff marked present today'
  },
  {
    id: 'on_leave_today',
    title: 'On Leave Today',
    dataType: 'on_leave_today',
    icon: 'calendar_month_rounded',
    color: '#f59e0b',
    route: '/attendance',
    sampleValue: '3',
    description: 'Staff on approved leave today'
  },
  {
    id: 'absent_today',
    title: 'Absent Today',
    dataType: 'absent_today',
    icon: 'cancel_rounded',
    color: '#ef4444',
    route: '/attendance',
    sampleValue: '3',
    description: 'Staff absent today'
  },
  {
    id: 'projects',
    title: 'Total Projects',
    dataType: 'total_projects',
    icon: 'folder_rounded',
    color: '#06b6d4',
    route: '/projects',
    sampleValue: '12',
    description: 'Active and completed company projects'
  },
  {
    id: 'shifts',
    title: 'Shift Management',
    dataType: 'total_shifts',
    icon: 'schedule_rounded',
    color: '#8b5cf6',
    route: '/shifts',
    sampleValue: '4',
    description: 'Total active work shifts scheduled'
  },
  {
    id: 'holidays',
    title: 'Upcoming Holidays',
    dataType: 'total_holidays',
    icon: 'beach_access_rounded',
    color: '#ec4899',
    route: '/holidays',
    sampleValue: '2',
    description: 'Company & public holidays this month'
  },
  {
    id: 'salary',
    title: 'Salary & Payroll',
    dataType: 'salary',
    icon: 'payments_rounded',
    color: '#10b981',
    route: '/salary',
    sampleValue: '₹4.8L',
    description: 'Payroll overview and disbursed salaries'
  },
  {
    id: 'tasks',
    title: 'Pending Tasks',
    dataType: 'pending_tasks',
    icon: 'task_alt_rounded',
    color: '#3b82f6',
    route: '/tasks',
    sampleValue: '9',
    description: 'Unresolved or active department tasks'
  },
  {
    id: 'pending_leaves',
    title: 'Pending Leave Requests',
    dataType: 'pending_leaves',
    icon: 'pending_actions_rounded',
    color: '#f97316',
    route: '/attendance',
    sampleValue: '5',
    description: 'Leave applications awaiting admin approval'
  },
  {
    id: 'reports',
    title: 'Monthly Reports',
    dataType: 'reports',
    icon: 'analytics_rounded',
    color: '#14b8a6',
    route: '/reports',
    sampleValue: '98%',
    description: 'Attendance rate & monthly analytics'
  },
  {
    id: 'workhours',
    title: 'Work Hours',
    dataType: 'workhours',
    icon: 'timer_rounded',
    color: '#a855f7',
    route: '/workhours',
    sampleValue: '8.5h',
    description: 'Average employee daily active work hours'
  },
  {
    id: 'ai_insights',
    title: 'AI Assistant',
    dataType: 'ai_insights',
    icon: 'psychology_rounded',
    color: '#6366f1',
    route: '/ai-chat',
    sampleValue: 'AI On',
    description: 'AI attendance predictions and insights'
  }
];

const DEFAULT_BOTTOM_NAV_PRESETS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', enabled: true, order: 1, route: '/admin/dashboard' },
  { id: 'employees', label: 'Employees', icon: 'people', enabled: true, order: 2, route: '/admin/employees' },
  { id: 'leaves', label: 'Leaves', icon: 'business_center', enabled: true, order: 3, route: '/admin/leaves' },
  { id: 'messages', label: 'Messages', icon: 'chat', enabled: true, order: 4, route: '/chat' },
  { id: 'more', label: 'More', icon: 'more_horiz', enabled: true, order: 5, route: '/admin/more' },
  { id: 'projects', label: 'Projects', icon: 'folder', enabled: false, order: 6, route: '/admin/projects' },
  { id: 'shifts', label: 'Shifts', icon: 'schedule', enabled: false, order: 7, route: '/admin/shifts' },
  { id: 'salary', label: 'Salary', icon: 'payments', enabled: false, order: 8, route: '/admin/salary' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics', enabled: false, order: 9, route: '/admin/analytics' },
  { id: 'holidays', label: 'Holidays', icon: 'beach_access', enabled: false, order: 10, route: '/admin/holidays' },
  { id: 'tasks', label: 'Tasks', icon: 'task_alt', enabled: false, order: 11, route: '/admin/tasks' }
];

const COLOR_OPTIONS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
  '#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6', 
  '#f97316', '#14b8a6', '#64748b'
];

const MobileDashboardConfig = () => {
  // Navigation settings tabs: 'cards' | 'bottomNav'
  const [activeSection, setActiveSection] = useState('cards');

  const [cards, setCards] = useState([]);
  const [bottomNav, setBottomNav] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Modal for adding a new card / module from website
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(WEBSITE_MODULE_PRESETS[0].id);
  const [customTitle, setCustomTitle] = useState('');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [customValue, setCustomValue] = useState('');

  // Load config from backend
  const loadConfig = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await dashboardConfigAPI.getConfig({ platform: 'mobile' });
      
      // Load Cards
      if (res && res.cards && Array.isArray(res.cards) && res.cards.length > 0) {
        const sortedCards = res.cards.map((c, idx) => ({
          ...c,
          order: typeof c.order === 'number' ? c.order : idx + 1,
          color: c.color || '#6366f1',
          dataType: c.dataType || c.id || 'custom'
        }));
        sortedCards.sort((a, b) => a.order - b.order);
        setCards(sortedCards);
      } else if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const sortedCards = res.data.map((c, idx) => ({
          ...c,
          order: typeof c.order === 'number' ? c.order : idx + 1,
          color: c.color || '#6366f1',
          dataType: c.dataType || c.id || 'custom'
        }));
        sortedCards.sort((a, b) => a.order - b.order);
        setCards(sortedCards);
      } else {
        setCards(WEBSITE_MODULE_PRESETS.slice(0, 4).map((p, idx) => ({
          ...p,
          enabled: true,
          order: idx + 1
        })));
      }

      // Load Bottom Navigation
      if (res && res.bottomNav && Array.isArray(res.bottomNav) && res.bottomNav.length > 0) {
        const sortedNav = res.bottomNav.map((item, idx) => ({
          ...item,
          order: typeof item.order === 'number' ? item.order : idx + 1
        }));
        sortedNav.sort((a, b) => a.order - b.order);
        setBottomNav(sortedNav);
      } else {
        setBottomNav(DEFAULT_BOTTOM_NAV_PRESETS);
      }

      setHasChanges(false);
    } catch (err) {
      console.error('Failed to load dashboard configuration:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to load configuration from server. Showing default options.'
      });
      setCards(WEBSITE_MODULE_PRESETS.slice(0, 4).map((p, idx) => ({
        ...p,
        enabled: true,
        order: idx + 1
      })));
      setBottomNav(DEFAULT_BOTTOM_NAV_PRESETS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // --- CARDS HANDLERS ---
  const handleCardTitleChange = (index, newTitle) => {
    setCards((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], title: newTitle };
      return updated;
    });
    setHasChanges(true);
    setStatusMessage(null);
  };

  const handleCardToggle = (index) => {
    setCards((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], enabled: !updated[index].enabled };
      return updated;
    });
    setHasChanges(true);
    setStatusMessage(null);
  };

  const handleCardColorChange = (index, color) => {
    setCards((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], color };
      return updated;
    });
    setHasChanges(true);
  };

  const handleDeleteCard = (index) => {
    if (cards.length <= 1) {
      alert('You must have at least 1 card in the configuration list.');
      return;
    }
    const cardToDelete = cards[index];
    if (!window.confirm(`Are you sure you want to remove "${cardToDelete.title}" from the dashboard list?`)) {
      return;
    }
    const updated = cards.filter((_, i) => i !== index).map((c, i) => ({
      ...c,
      order: i + 1
    }));
    setCards(updated);
    setHasChanges(true);
    setStatusMessage(null);
  };

  const handleCardMoveUp = (index) => {
    if (index === 0) return;
    const newCards = [...cards];
    const temp = newCards[index - 1];
    newCards[index - 1] = newCards[index];
    newCards[index] = temp;
    newCards.forEach((c, idx) => { c.order = idx + 1; });
    setCards(newCards);
    setHasChanges(true);
    setStatusMessage(null);
  };

  const handleCardMoveDown = (index) => {
    if (index === cards.length - 1) return;
    const newCards = [...cards];
    const temp = newCards[index + 1];
    newCards[index + 1] = newCards[index];
    newCards[index] = temp;
    newCards.forEach((c, idx) => { c.order = idx + 1; });
    setCards(newCards);
    setHasChanges(true);
    setStatusMessage(null);
  };

  // --- BOTTOM NAV HANDLERS ---
  const handleNavLabelChange = (index, newLabel) => {
    setBottomNav((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], label: newLabel };
      return updated;
    });
    setHasChanges(true);
    setStatusMessage(null);
  };

  const handleNavToggle = (index) => {
    setBottomNav((prev) => {
      const updated = [...prev];
      const target = updated[index];
      const currentlyEnabled = prev.filter(x => x.enabled).length;
      if (target.enabled && currentlyEnabled <= 2) {
        alert('Bottom Navigation bar must have at least 2 active tabs.');
        return prev;
      }
      updated[index] = { ...target, enabled: !target.enabled };
      return updated;
    });
    setHasChanges(true);
    setStatusMessage(null);
  };

  const handleNavMoveUp = (index) => {
    if (index === 0) return;
    const newNav = [...bottomNav];
    const temp = newNav[index - 1];
    newNav[index - 1] = newNav[index];
    newNav[index] = temp;
    newNav.forEach((item, idx) => { item.order = idx + 1; });
    setBottomNav(newNav);
    setHasChanges(true);
    setStatusMessage(null);
  };

  const handleNavMoveDown = (index) => {
    if (index === bottomNav.length - 1) return;
    const newNav = [...bottomNav];
    const temp = newNav[index + 1];
    newNav[index + 1] = newNav[index];
    newNav[index] = temp;
    newNav.forEach((item, idx) => { item.order = idx + 1; });
    setBottomNav(newNav);
    setHasChanges(true);
    setStatusMessage(null);
  };

  // Open Add Card Modal
  const openAddModal = () => {
    setSelectedPreset(WEBSITE_MODULE_PRESETS[0].id);
    setCustomTitle(WEBSITE_MODULE_PRESETS[0].title);
    setCustomColor(WEBSITE_MODULE_PRESETS[0].color);
    setCustomValue(WEBSITE_MODULE_PRESETS[0].sampleValue || '');
    setShowAddModal(true);
  };

  // Handle Preset selection change inside modal
  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    if (presetId === 'custom_box') {
      setCustomTitle('Custom Metric');
      setCustomColor('#8b5cf6');
      setCustomValue('100');
    } else {
      const p = WEBSITE_MODULE_PRESETS.find(x => x.id === presetId);
      if (p) {
        setCustomTitle(p.title);
        setCustomColor(p.color);
        setCustomValue(p.sampleValue || '');
      }
    }
  };

  // Add Card to Dashboard
  const handleAddCard = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) {
      alert('Please enter a box name / title.');
      return;
    }

    let newCardObj;
    if (selectedPreset === 'custom_box') {
      const uniqueId = `custom_${Date.now()}`;
      newCardObj = {
        id: uniqueId,
        title: customTitle.trim(),
        dataType: 'custom',
        customValue: customValue || '0',
        icon: 'dashboard_customize_rounded',
        color: customColor,
        route: '',
        enabled: true,
        order: cards.length + 1,
        description: 'Custom metric box'
      };
    } else {
      const preset = WEBSITE_MODULE_PRESETS.find(x => x.id === selectedPreset);
      const uniqueId = cards.some(c => c.id === preset.id) 
        ? `${preset.id}_${Date.now()}` 
        : preset.id;

      newCardObj = {
        id: uniqueId,
        title: customTitle.trim(),
        dataType: preset.dataType || preset.id,
        customValue: customValue || preset.sampleValue || '',
        icon: preset.icon,
        color: customColor || preset.color,
        route: preset.route || '',
        enabled: true,
        order: cards.length + 1,
        description: preset.description || ''
      };
    }

    setCards([...cards, newCardObj]);
    setShowAddModal(false);
    setHasChanges(true);
    setStatusMessage({
      type: 'success',
      text: `Added box "${customTitle.trim()}". Click "Save Settings" to apply to mobile app.`
    });
  };

  // Save changes to backend
  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);

      const payload = {
        platform: 'mobile',
        cards: cards.map((c, idx) => ({
          id: c.id,
          title: c.title.trim() || 'Untitled Box',
          dataType: c.dataType || c.id || 'custom',
          enabled: Boolean(c.enabled),
          order: idx + 1,
          icon: c.icon || 'dashboard_customize_rounded',
          color: c.color || '#6366f1',
          route: c.route || '',
          customValue: c.customValue || '',
          description: c.description || ''
        })),
        bottomNav: bottomNav.map((item, idx) => ({
          id: item.id,
          label: item.label.trim() || 'Tab',
          icon: item.icon || 'home',
          enabled: Boolean(item.enabled),
          order: idx + 1,
          route: item.route || ''
        }))
      };

      const res = await dashboardConfigAPI.updateConfig(payload);

      if (res && res.success) {
        setStatusMessage({
          type: 'success',
          text: '✅ App Dashboard Settings saved successfully! Mobile overview cards and bottom navigation bar will update accordingly.'
        });
        setHasChanges(false);
      } else {
        throw new Error(res?.message || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Failed to save dashboard configuration:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to save configuration to backend.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset to default cards & bottom nav
  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all boxes & bottom nav tabs to factory default settings?')) {
      return;
    }

    try {
      setSaving(true);
      setStatusMessage(null);
      const res = await dashboardConfigAPI.resetConfig();
      if (res && res.success) {
        if (Array.isArray(res.cards)) {
          setCards(res.cards.map((c, idx) => ({
            ...c,
            order: idx + 1,
            color: c.color || '#6366f1',
            dataType: c.dataType || c.id
          })));
        }
        if (Array.isArray(res.bottomNav)) {
          setBottomNav(res.bottomNav.map((item, idx) => ({
            ...item,
            order: idx + 1
          })));
        }
        setHasChanges(false);
        setStatusMessage({
          type: 'success',
          text: 'Dashboard boxes and bottom nav reset to defaults successfully!'
        });
      }
    } catch (err) {
      console.error('Failed to reset dashboard configuration:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to reset configuration.'
      });
    } finally {
      setSaving(false);
    }
  };

  const enabledCards = cards.filter((c) => c.enabled);
  const enabledBottomNav = bottomNav.filter((n) => n.enabled);

  // Helper icon renderer for mock bottom bar
  const renderNavIcon = (iconType) => {
    switch (iconType) {
      case 'home': return '🏠';
      case 'people': return '👥';
      case 'business_center': return '💼';
      case 'chat': return '💬';
      case 'more_horiz': return '⋯';
      case 'folder': return '📁';
      case 'schedule': return '🗓️';
      case 'payments': return '💰';
      case 'analytics': return '📈';
      case 'beach_access': return '🏖️';
      case 'task_alt': return '✅';
      default: return '🔘';
    }
  };

  return (
    <div className="dashboard-config-page">
      {/* Page Header */}
      <div className="config-header-row">
        <div className="config-title-group">
          <div className="config-badge-chip">
            <span className="live-pulse"></span> Dynamic Mobile App Settings
          </div>
          <h1 className="config-page-title">App Dashboard Settings</h1>
          <p className="config-page-subtitle">
            Configure both the <strong>Overview Cards</strong> and <strong>Bottom Navigation Bar</strong> for the Flutter mobile app.
          </p>
        </div>

        <div className="config-action-group">
          {activeSection === 'cards' && (
            <button
              className="config-btn btn-add"
              onClick={openAddModal}
              disabled={loading || saving}
            >
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span> Add Box / Feature
            </button>
          )}
          <button
            className="config-btn btn-secondary"
            onClick={loadConfig}
            disabled={loading || saving}
            title="Reload from server"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh
          </button>
          <button
            className="config-btn btn-outline"
            onClick={handleReset}
            disabled={loading || saving}
          >
            Reset Defaults
          </button>
          <button
            className={`config-btn btn-primary ${hasChanges ? 'highlight-save' : ''}`}
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? (
              <>
                <span className="spinner-sm"></span>
                Saving...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Section Navigation Switcher */}
      <div className="section-tab-switcher">
        <button
          className={`section-tab-btn ${activeSection === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveSection('cards')}
        >
          <span className="tab-icon">📊</span>
          Overview Stat Cards ({enabledCards.length} Active)
        </button>
        <button
          className={`section-tab-btn ${activeSection === 'bottomNav' ? 'active' : ''}`}
          onClick={() => setActiveSection('bottomNav')}
        >
          <span className="tab-icon">📱</span>
          Bottom Navigation Bar ({enabledBottomNav.length} Active Tabs)
        </button>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div className={`config-alert-banner ${statusMessage.type}`}>
          <div className="alert-icon">
            {statusMessage.type === 'success' ? '✅' : '⚠️'}
          </div>
          <div className="alert-text">{statusMessage.text}</div>
          <button
            className="alert-dismiss"
            onClick={() => setStatusMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="config-grid-layout">
        {/* Left Column: Config Panel */}
        <div className="config-cards-panel">
          {activeSection === 'cards' ? (
            /* --- SECTION 1: OVERVIEW STAT CARDS --- */
            <>
              <div className="panel-card-header">
                <div>
                  <h2 className="panel-heading">Dashboard Overview Boxes</h2>
                  <p className="panel-subtext">
                    Type any custom name for the box. Tick (☑) to display that box on the mobile screen.
                  </p>
                </div>
                <span className="active-counter-pill">
                  <strong>{enabledCards.length}</strong> of {cards.length} Active
                </span>
              </div>

              {loading ? (
                <div className="config-loading-state">
                  <div className="spinner-lg"></div>
                  <p>Loading dashboard settings...</p>
                </div>
              ) : (
                <div className="cards-config-list">
                  {cards.map((card, index) => {
                    const isEnabled = Boolean(card.enabled);
                    const cardColor = card.color || '#6366f1';

                    return (
                      <div
                        key={card.id || index}
                        className={`card-config-item ${isEnabled ? 'is-enabled' : 'is-disabled'}`}
                        style={{ borderLeftColor: isEnabled ? cardColor : undefined }}
                      >
                        {/* Checkbox Tick */}
                        <div className="checkbox-tick-container">
                          <label className="checkbox-custom-label" title={isEnabled ? "Ticked (Showing in App)" : "Unticked (Hidden)"}>
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleCardToggle(index)}
                            />
                            <span className="checkbox-custom-box">
                              {isEnabled && '✓'}
                            </span>
                          </label>
                        </div>

                        {/* Order Sequence */}
                        <div className="card-order-controls">
                          <button
                            className="order-btn"
                            onClick={() => handleCardMoveUp(index)}
                            disabled={index === 0}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <span className="order-number">#{index + 1}</span>
                          <button
                            className="order-btn"
                            onClick={() => handleCardMoveDown(index)}
                            disabled={index === cards.length - 1}
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>

                        {/* Card Color Indicator */}
                        <div 
                          className="card-color-dot"
                          style={{ backgroundColor: cardColor }}
                          title="Card Color"
                        />

                        {/* Editable Title and Type */}
                        <div className="card-input-wrapper">
                          <div className="card-type-row">
                            <span className="card-data-badge">
                              Module: <strong>{card.dataType || card.id}</strong>
                            </span>
                            {card.route && (
                              <span className="card-route-badge">
                                🔗 {card.route}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            className="card-title-input"
                            value={card.title}
                            onChange={(e) => handleCardTitleChange(index, e.target.value)}
                            placeholder="Enter box name to show in App..."
                          />
                        </div>

                        {/* Color picker */}
                        <div className="color-picker-mini">
                          {COLOR_OPTIONS.slice(0, 4).map((c) => (
                            <span
                              key={c}
                              className={`color-swatch ${cardColor === c ? 'selected' : ''}`}
                              style={{ backgroundColor: c }}
                              onClick={() => handleCardColorChange(index, c)}
                            />
                          ))}
                        </div>

                        {/* Delete Button */}
                        <button
                          className="card-delete-btn"
                          onClick={() => handleDeleteCard(index)}
                          title="Remove box"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="panel-bottom-actions">
                <button className="add-box-bottom-btn" onClick={openAddModal}>
                  <span>➕</span> Add Another Website Box / Custom Metric
                </button>
              </div>
            </>
          ) : (
            /* --- SECTION 2: BOTTOM NAVIGATION BAR --- */
            <>
              <div className="panel-card-header">
                <div>
                  <h2 className="panel-heading">Mobile Bottom Navigation Tabs</h2>
                  <p className="panel-subtext">
                    Rename bottom navigation tabs, tick (☑) to show on the mobile bottom bar, and reorder (▲/▼).
                  </p>
                </div>
                <span className="active-counter-pill">
                  <strong>{enabledBottomNav.length}</strong> Tabs Enabled
                </span>
              </div>

              {loading ? (
                <div className="config-loading-state">
                  <div className="spinner-lg"></div>
                  <p>Loading bottom navigation settings...</p>
                </div>
              ) : (
                <div className="cards-config-list">
                  {bottomNav.map((item, index) => {
                    const isEnabled = Boolean(item.enabled);

                    return (
                      <div
                        key={item.id || index}
                        className={`card-config-item ${isEnabled ? 'is-enabled' : 'is-disabled'}`}
                        style={{ borderLeftColor: isEnabled ? '#6366f1' : undefined }}
                      >
                        {/* Checkbox Tick */}
                        <div className="checkbox-tick-container">
                          <label className="checkbox-custom-label" title={isEnabled ? "Ticked (Visible in Bottom Bar)" : "Unticked (Hidden)"}>
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleNavToggle(index)}
                            />
                            <span className="checkbox-custom-box">
                              {isEnabled && '✓'}
                            </span>
                          </label>
                        </div>

                        {/* Order Sequence */}
                        <div className="card-order-controls">
                          <button
                            className="order-btn"
                            onClick={() => handleNavMoveUp(index)}
                            disabled={index === 0}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <span className="order-number">#{index + 1}</span>
                          <button
                            className="order-btn"
                            onClick={() => handleNavMoveDown(index)}
                            disabled={index === bottomNav.length - 1}
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>

                        {/* Icon display */}
                        <div className="nav-tab-icon-badge">
                          {renderNavIcon(item.icon)}
                        </div>

                        {/* Editable Tab Name */}
                        <div className="card-input-wrapper">
                          <div className="card-type-row">
                            <span className="card-data-badge">
                              Tab Key: <strong>{item.id}</strong>
                            </span>
                            {item.route && (
                              <span className="card-route-badge">
                                🔗 {item.route}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            className="card-title-input"
                            value={item.label}
                            onChange={(e) => handleNavLabelChange(index, e.target.value)}
                            placeholder="Enter tab name (e.g. Dashboard, Employees, Leaves)..."
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="nav-help-info">
                💡 <strong>Tip:</strong> You can rename tabs like <em>"Leaves"</em> to <em>"Leave Requests"</em> or <em>"Employees"</em> to <em>"Staff"</em>. The Flutter Mobile Bottom Navigation Bar will show your exact custom labels!
              </div>
            </>
          )}
        </div>

        {/* Right Column: Live Mobile Mockup Preview */}
        <div className="config-preview-panel">
          <div className="preview-header-bar">
            <h3 className="preview-heading">📱 Real-time Mobile Screen</h3>
            <span className="preview-live-tag">Live Dynamic View</span>
          </div>

          <div className="phone-mockup-frame">
            {/* Phone Top Notch */}
            <div className="phone-top-notch">
              <span className="phone-time">9:41</span>
              <div className="phone-speaker"></div>
              <div className="phone-icons">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Mobile Header Bar */}
            <div className="phone-app-header">
              <div className="phone-header-left">
                <span className="phone-menu-icon">☰</span>
                <div>
                  <div className="phone-app-title">Admin Dashboard</div>
                  <div className="phone-app-date">Live Overview Cards</div>
                </div>
              </div>
              <div className="phone-header-right">
                <span className="phone-bell-icon">🔔</span>
              </div>
            </div>

            {/* Phone Body / Overview Section */}
            <div className="phone-body-content">
              <div className="phone-section-title-row">
                <span className="phone-section-title">Overview</span>
                <span className="phone-refresh-btn">🔄</span>
              </div>

              {enabledCards.length === 0 ? (
                <div className="phone-empty-state">
                  <div className="empty-icon">📭</div>
                  <p className="empty-title">All Boxes Unticked</p>
                  <p className="empty-subtitle">Tick (☑) any box on the left to display it here in the mobile app.</p>
                </div>
              ) : (
                <div className="phone-cards-grid">
                  {enabledCards.map((card) => {
                    const cardColor = card.color || '#6366f1';
                    const sampleVal = card.customValue || 
                      WEBSITE_MODULE_PRESETS.find(p => p.id === card.id || p.dataType === card.dataType)?.sampleValue || 
                      '0';

                    return (
                      <div
                        key={card.id || card.title}
                        className="phone-stat-card"
                        style={{
                          borderLeft: `3px solid ${cardColor}`
                        }}
                      >
                        <div className="stat-card-top">
                          <div
                            className="stat-icon-wrapper"
                            style={{
                              color: cardColor,
                              backgroundColor: `${cardColor}20`
                            }}
                          >
                            <span>📊</span>
                          </div>
                          <span className="stat-value">{sampleVal}</span>
                        </div>
                        <div className="stat-title" title={card.title}>
                          {card.title || 'Untitled'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mock Quick Actions */}
              <div className="phone-mock-footer-section">
                <div className="mock-subheading">Quick Actions</div>
                <div className="mock-actions-row">
                  <div className="mock-action-chip">⚡ QR Check-in</div>
                  <div className="mock-action-chip">👤 Face ID</div>
                </div>
              </div>
            </div>

            {/* --- LIVE BOTTOM NAVIGATION BAR PREVIEW --- */}
            <div className="phone-live-bottom-nav">
              {enabledBottomNav.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`phone-bottom-nav-item ${idx === 0 ? 'active' : ''}`}
                >
                  <span className="nav-item-icon">{renderNavIcon(item.icon)}</span>
                  <span className="nav-item-label">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Phone Home Bar */}
            <div className="phone-home-indicator"></div>
          </div>
        </div>
      </div>

      {/* Add Box Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Add Box to Mobile Dashboard</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddCard} className="modal-form">
              <div className="form-group">
                <label>Select Website Module / Sidebar Feature:</label>
                <select
                  className="form-select"
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                >
                  <optgroup label="Website Sidebar Features">
                    {WEBSITE_MODULE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.title} ({preset.description})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Custom Options">
                    <option value="custom_box">⭐ Custom Metric Box (Create your own)</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label>Box Name / Title (Show in Mobile App):</label>
                <input
                  type="text"
                  className="form-input"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Total Staff, Present Today, Projects, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label>Theme Color:</label>
                <div className="color-palette-selector">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={`color-btn ${customColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCustomColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="config-btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="config-btn btn-primary"
                >
                  Add Box (☑ Ticked)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDashboardConfig;
