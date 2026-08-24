const DashboardConfig = require('../models/DashboardConfig');
const logger = require('../utils/logger');

// Get Dashboard & Bottom Navigation Configuration
const getDashboardConfig = async (req, res) => {
  try {
    const organizationId = req.query.organizationId || req.user?.organizationId || 'default';
    const platform = req.query.platform || 'mobile';

    const config = await DashboardConfig.getOrCreateConfig(organizationId, platform);

    res.status(200).json({
      success: true,
      message: 'Dashboard configuration retrieved successfully',
      organizationId: config.organizationId,
      platform: config.platform,
      data: config.cards,
      cards: config.cards,
      bottomNav: config.bottomNav || [],
      updatedAt: config.updatedAt
    });
  } catch (error) {
    logger.error('Error fetching dashboard configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard configuration',
      error: error.message
    });
  }
};

// Update Dashboard & Bottom Navigation Configuration (Admin only)
const updateDashboardConfig = async (req, res) => {
  try {
    const organizationId = req.body.organizationId || req.user?.organizationId || 'default';
    const platform = req.body.platform || 'mobile';
    const { cards, bottomNav } = req.body;

    let config = await DashboardConfig.getOrCreateConfig(organizationId, platform);

    // If cards provided, sanitize & update
    if (cards && Array.isArray(cards)) {
      const sanitizedCards = cards.map((card, index) => ({
        id: String(card.id || `card_${Date.now()}_${index}`).trim(),
        title: String(card.title || 'Untitled Card').trim(),
        subtitle: card.subtitle ? String(card.subtitle).trim() : '',
        enabled: Boolean(card.enabled !== undefined ? card.enabled : true),
        order: typeof card.order === 'number' ? card.order : (index + 1),
        icon: card.icon ? String(card.icon).trim() : 'dashboard_customize_rounded',
        color: card.color ? String(card.color).trim() : '#6366f1',
        route: card.route ? String(card.route).trim() : '',
        dataType: card.dataType ? String(card.dataType).trim() : 'custom',
        customValue: card.customValue !== undefined ? String(card.customValue).trim() : '',
        description: card.description ? String(card.description).trim() : ''
      }));
      sanitizedCards.sort((a, b) => a.order - b.order);
      config.cards = sanitizedCards;
    }

    // If bottomNav provided, sanitize & update
    if (bottomNav && Array.isArray(bottomNav)) {
      const sanitizedBottomNav = bottomNav.map((item, index) => ({
        id: String(item.id || `tab_${index + 1}`).trim(),
        label: String(item.label || item.title || 'Tab').trim(),
        icon: item.icon ? String(item.icon).trim() : 'home',
        enabled: Boolean(item.enabled !== undefined ? item.enabled : true),
        order: typeof item.order === 'number' ? item.order : (index + 1),
        route: item.route ? String(item.route).trim() : ''
      }));
      sanitizedBottomNav.sort((a, b) => a.order - b.order);
      config.bottomNav = sanitizedBottomNav;
    }

    config.updatedBy = req.user?._id || null;
    await config.save();

    // Broadcast change via Socket.io if attached
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dashboard_config_updated', {
          organizationId: config.organizationId,
          platform: config.platform,
          cards: config.cards,
          bottomNav: config.bottomNav
        });
      }
    } catch (socketErr) {
      logger.warn('Socket broadcast failed for dashboard_config_updated:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard and Bottom Navigation settings updated successfully',
      data: config.cards,
      cards: config.cards,
      bottomNav: config.bottomNav,
      updatedAt: config.updatedAt
    });
  } catch (error) {
    logger.error('Error updating dashboard configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dashboard configuration',
      error: error.message
    });
  }
};

// Reset Dashboard Configuration to Default (Admin only)
const resetDashboardConfig = async (req, res) => {
  try {
    const organizationId = req.body.organizationId || req.user?.organizationId || 'default';
    const platform = req.body.platform || 'mobile';

    const defaultCards = DashboardConfig.getDefaultCards();
    const defaultBottomNav = DashboardConfig.getDefaultBottomNav();

    let config = await DashboardConfig.findOne({ organizationId, platform });
    if (!config) {
      config = new DashboardConfig({
        organizationId,
        platform,
        cards: defaultCards,
        bottomNav: defaultBottomNav,
        updatedBy: req.user?._id || null
      });
    } else {
      config.cards = defaultCards;
      config.bottomNav = defaultBottomNav;
      config.updatedBy = req.user?._id || null;
    }

    await config.save();

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dashboard_config_updated', {
          organizationId: config.organizationId,
          platform: config.platform,
          cards: config.cards,
          bottomNav: config.bottomNav
        });
      }
    } catch (socketErr) {
      logger.warn('Socket broadcast failed for dashboard_config_updated:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard and Bottom Navigation settings reset to factory defaults',
      data: config.cards,
      cards: config.cards,
      bottomNav: config.bottomNav,
      updatedAt: config.updatedAt
    });
  } catch (error) {
    logger.error('Error resetting dashboard configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset dashboard configuration',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardConfig,
  updateDashboardConfig,
  resetDashboardConfig
};
