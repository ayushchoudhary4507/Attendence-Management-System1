const mongoose = require('mongoose');

const PRESET_CARDS = [
  {
    id: 'total_employees',
    title: 'Total Employees',
    enabled: true,
    order: 1,
    icon: 'groups_rounded',
    color: '#6366f1',
    route: '/employees',
    dataType: 'total_employees',
    description: 'Total registered employees in the system'
  },
  {
    id: 'present_today',
    title: 'Present Today',
    enabled: true,
    order: 2,
    icon: 'check_circle_rounded',
    color: '#10b981',
    route: '/attendance',
    dataType: 'present_today',
    description: 'Employees marked present today'
  },
  {
    id: 'on_leave_today',
    title: 'On Leave Today',
    enabled: true,
    order: 3,
    icon: 'calendar_month_rounded',
    color: '#f59e0b',
    route: '/attendance',
    dataType: 'on_leave_today',
    description: 'Employees on approved leave today'
  },
  {
    id: 'absent_today',
    title: 'Absent Today',
    enabled: true,
    order: 4,
    icon: 'cancel_rounded',
    color: '#ef4444',
    route: '/attendance',
    dataType: 'absent_today',
    description: 'Employees absent today'
  }
];

const PRESET_BOTTOM_NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'home',
    enabled: true,
    order: 1,
    route: '/admin/dashboard'
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: 'people',
    enabled: true,
    order: 2,
    route: '/admin/employees'
  },
  {
    id: 'leaves',
    label: 'Leaves',
    icon: 'business_center',
    enabled: true,
    order: 3,
    route: '/admin/leaves'
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: 'chat',
    enabled: true,
    order: 4,
    route: '/chat'
  },
  {
    id: 'more',
    label: 'More',
    icon: 'more_horiz',
    enabled: true,
    order: 5,
    route: '/admin/more'
  }
];

const dashboardCardSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  order: { type: Number, required: true, default: 1 },
  icon: { type: String, default: 'dashboard_customize_rounded' },
  color: { type: String, default: '#6366f1' },
  route: { type: String, default: '' },
  dataType: { type: String, default: 'custom' },
  customValue: { type: String, default: '' },
  description: { type: String, default: '' }
}, { _id: false });

const bottomNavItemSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  icon: { type: String, default: 'home' },
  enabled: { type: Boolean, default: true },
  order: { type: Number, required: true, default: 1 },
  route: { type: String, default: '' }
}, { _id: false });

const dashboardConfigSchema = new mongoose.Schema({
  organizationId: {
    type: String,
    default: 'default',
    index: true,
    trim: true
  },
  platform: {
    type: String,
    enum: ['mobile', 'web', 'all'],
    default: 'mobile'
  },
  cards: {
    type: [dashboardCardSchema],
    default: () => PRESET_CARDS
  },
  bottomNav: {
    type: [bottomNavItemSchema],
    default: () => PRESET_BOTTOM_NAV
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

dashboardConfigSchema.statics.getDefaultCards = function() {
  return JSON.parse(JSON.stringify(PRESET_CARDS));
};

dashboardConfigSchema.statics.getDefaultBottomNav = function() {
  return JSON.parse(JSON.stringify(PRESET_BOTTOM_NAV));
};

dashboardConfigSchema.statics.getOrCreateConfig = async function(organizationId = 'default', platform = 'mobile') {
  let config = await this.findOne({ organizationId, platform });
  
  if (!config) {
    config = await this.create({
      organizationId,
      platform,
      cards: PRESET_CARDS,
      bottomNav: PRESET_BOTTOM_NAV
    });
  } else {
    // If bottomNav is missing or empty on legacy records, seed it
    if (!config.bottomNav || config.bottomNav.length === 0) {
      config.bottomNav = PRESET_BOTTOM_NAV;
      await config.save();
    }
  }

  // Sort
  if (config.cards && Array.isArray(config.cards)) {
    config.cards.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  if (config.bottomNav && Array.isArray(config.bottomNav)) {
    config.bottomNav.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return config;
};

module.exports = mongoose.model('DashboardConfig', dashboardConfigSchema);
