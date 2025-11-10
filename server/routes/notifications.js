const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications with pagination
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || '';
    const type = req.query.type || '';

    // Build query
    let query = { userId: req.user.userId };
    
    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    // Execute query with pagination
    const notifications = await Notification.find(query)
      .populate('clientId', 'name company')
      .populate('projectId', 'title')
      .populate('invoiceId', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await Notification.countDocuments(query);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      userId: req.user.userId,
      status: 'unread'
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching notifications',
      error: error.message 
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user.userId,
      status: 'unread'
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching unread count',
      error: error.message 
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.markAsRead();

    res.json({ 
      message: 'Notification marked as read',
      notification 
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(500).json({ 
      message: 'Server error while marking notification as read',
      error: error.message 
    });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, status: 'unread' },
      { status: 'read', readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ 
      message: 'Server error while marking all notifications as read',
      error: error.message 
    });
  }
});

// @route   PUT /api/notifications/:id/archive
// @desc    Archive notification
// @access  Private
router.put('/:id/archive', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.archive();

    res.json({ 
      message: 'Notification archived',
      notification 
    });
  } catch (error) {
    console.error('Archive notification error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(500).json({ 
      message: 'Server error while archiving notification',
      error: error.message 
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(500).json({ 
      message: 'Server error while deleting notification',
      error: error.message 
    });
  }
});

// @route   POST /api/notifications
// @desc    Create new notification (for testing or manual creation)
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      clientId,
      projectId,
      invoiceId,
      priority
    } = req.body;

    const notification = await Notification.createNotification({
      type,
      title,
      message,
      clientId,
      projectId,
      invoiceId,
      userId: req.user.userId,
      priority: priority || 'medium'
    });

    await notification.populate([
      { path: 'clientId', select: 'name company' },
      { path: 'projectId', select: 'title' },
      { path: 'invoiceId', select: 'invoiceNumber' }
    ]);

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ 
      message: 'Server error while creating notification',
      error: error.message 
    });
  }
});

// @route   GET /api/notifications/stats
// @desc    Get notification statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalNotifications = await Notification.countDocuments({ userId });
    const unreadNotifications = await Notification.countDocuments({ 
      userId, 
      status: 'unread' 
    });
    const readNotifications = await Notification.countDocuments({ 
      userId, 
      status: 'read' 
    });
    const archivedNotifications = await Notification.countDocuments({ 
      userId, 
      status: 'archived' 
    });

    // Get notifications by type
    const notificationsByType = await Notification.aggregate([
      { $match: { userId: req.user.userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get notifications by priority
    const notificationsByPriority = await Notification.aggregate([
      { $match: { userId: req.user.userId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      overview: {
        total: totalNotifications,
        unread: unreadNotifications,
        read: readNotifications,
        archived: archivedNotifications
      },
      byType: notificationsByType,
      byPriority: notificationsByPriority
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching notification statistics',
      error: error.message 
    });
  }
});

module.exports = router;
