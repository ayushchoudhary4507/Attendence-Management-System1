const DashboardConfig = require('../models/DashboardConfig');
const logger = require('../utils/logger');

// Get Dashboard Configuration
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

// Update Dashboard Configuration (Admin only)
const updateDashboardConfig = async (req, res) => {
  try {
    const organizationId = req.body.organizationId || req.user?.organizationId || 'default';
    const platform = req.body.platform || 'mobile';
    const { cards } = req.body;

    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cards data. An array of cards is required.'
      });
    }

    // Format & sanitize card items - preserving custom titles, icons, routes, and dataTypes
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

    // Sort by order
    sanitizedCards.sort((a, b) => a.order - b.order);

    let config = await DashboardConfig.findOne({ organizationId, platform });
    if (!config) {
      config = new DashboardConfig({
        organizationId,
        platform,
        cards: sanitizedCards,
        updatedBy: req.user?._id || null
      });
    } else {
      config.cards = sanitizedCards;
      config.updatedBy = req.user?._id || null;
    }

    await config.save();

    // Broadcast change via Socket.io if attached
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dashboard_config_updated', {
          organizationId: config.organizationId,
          platform: config.platform,
          cards: config.cards
        });
      }
    } catch (socketErr) {
      logger.warn('Socket broadcast failed for dashboard_config_updated:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard configuration updated successfully',
      data: config.cards,
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

    let config = await DashboardConfig.findOne({ organizationId, platform });
    if (!config) {
      config = new DashboardConfig({
        organizationId,
        platform,
        cards: defaultCards,
        updatedBy: req.user?._id || null
      });
    } else {
      config.cards = defaultCards;
      config.updatedBy = req.user?._id || null;
    }

    await config.save();

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dashboard_config_updated', {
          organizationId: config.organizationId,
          platform: config.platform,
          cards: config.cards
        });
      }
    } catch (socketErr) {
      logger.warn('Socket broadcast failed for dashboard_config_updated:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard configuration reset to factory defaults successfully',
      data: config.cards,
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
