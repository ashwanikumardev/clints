const express = require('express');
const Project = require('../models/Project');
const { auth } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/events
// @desc    Get calendar events (project deadlines)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { start, end } = req.query;

    // Build query
    let query = {};
    
    // Filter by date range if provided
    if (start && end) {
      query.deadline = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

    // Get projects with deadlines
    const projects = await Project.find(query)
      .populate('clientId', 'name company')
      .select('title deadline status priority clientId description amount')
      .sort({ deadline: 1 });

    // Transform projects into calendar events
    const events = projects.map(project => {
      let color = '#6366f1'; // Default indigo
      
      // Color coding based on status
      switch (project.status) {
        case 'completed':
          color = '#10b981'; // Green
          break;
        case 'in-progress':
          color = '#f59e0b'; // Yellow/Orange
          break;
        case 'pending':
          color = '#6366f1'; // Indigo
          break;
        case 'cancelled':
          color = '#6b7280'; // Gray
          break;
        case 'on-hold':
          color = '#8b5cf6'; // Purple
          break;
        default:
          color = '#6366f1';
      }

      // Override color for overdue projects
      const isOverdue = new Date(project.deadline) < new Date() && 
                       !['completed', 'cancelled'].includes(project.status);
      if (isOverdue) {
        color = '#ef4444'; // Red
      }

      // Priority-based styling
      let borderColor = color;
      if (project.priority === 'urgent') {
        borderColor = '#dc2626'; // Dark red border
      } else if (project.priority === 'high') {
        borderColor = '#ea580c'; // Orange border
      }

      return {
        id: project._id,
        title: project.title,
        start: project.deadline,
        end: project.deadline,
        allDay: true,
        backgroundColor: color,
        borderColor: borderColor,
        textColor: '#ffffff',
        extendedProps: {
          projectId: project._id,
          clientId: project.clientId._id,
          clientName: project.clientId.name,
          clientCompany: project.clientId.company,
          status: project.status,
          priority: project.priority,
          description: project.description,
          amount: project.amount,
          isOverdue: isOverdue
        }
      };
    });

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching calendar events',
      error: error.message 
    });
  }
});

// @route   GET /api/events/upcoming
// @desc    Get upcoming events (next 30 days)
// @access  Private
router.get('/upcoming', auth, async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const projects = await Project.find({
      deadline: {
        $gte: today,
        $lte: thirtyDaysFromNow
      },
      status: { $in: ['pending', 'in-progress'] }
    })
    .populate('clientId', 'name company')
    .select('title deadline status priority clientId')
    .sort({ deadline: 1 })
    .limit(10);

    const upcomingEvents = projects.map(project => ({
      id: project._id,
      title: project.title,
      deadline: project.deadline,
      status: project.status,
      priority: project.priority,
      client: {
        id: project.clientId._id,
        name: project.clientId.name,
        company: project.clientId.company
      },
      daysUntilDeadline: Math.ceil((new Date(project.deadline) - today) / (1000 * 60 * 60 * 24))
    }));

    res.json({ upcomingEvents });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching upcoming events',
      error: error.message 
    });
  }
});

// @route   GET /api/events/overdue
// @desc    Get overdue projects
// @access  Private
router.get('/overdue', auth, async (req, res) => {
  try {
    const today = new Date();

    const projects = await Project.find({
      deadline: { $lt: today },
      status: { $in: ['pending', 'in-progress'] }
    })
    .populate('clientId', 'name company')
    .select('title deadline status priority clientId')
    .sort({ deadline: 1 });

    const overdueEvents = projects.map(project => ({
      id: project._id,
      title: project.title,
      deadline: project.deadline,
      status: project.status,
      priority: project.priority,
      client: {
        id: project.clientId._id,
        name: project.clientId.name,
        company: project.clientId.company
      },
      daysOverdue: Math.ceil((today - new Date(project.deadline)) / (1000 * 60 * 60 * 24))
    }));

    res.json({ overdueEvents });
  } catch (error) {
    console.error('Get overdue events error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching overdue events',
      error: error.message 
    });
  }
});

// @route   GET /api/events/today
// @desc    Get today's events
// @access  Private
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const projects = await Project.find({
      deadline: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    })
    .populate('clientId', 'name company')
    .select('title deadline status priority clientId')
    .sort({ deadline: 1 });

    const todayEvents = projects.map(project => ({
      id: project._id,
      title: project.title,
      deadline: project.deadline,
      status: project.status,
      priority: project.priority,
      client: {
        id: project.clientId._id,
        name: project.clientId.name,
        company: project.clientId.company
      }
    }));

    res.json({ todayEvents });
  } catch (error) {
    console.error('Get today events error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching today\'s events',
      error: error.message 
    });
  }
});

// @route   GET /api/events/stats
// @desc    Get calendar statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Today's deadlines
    const todayDeadlines = await Project.countDocuments({
      deadline: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    });

    // This week's deadlines
    const weekDeadlines = await Project.countDocuments({
      deadline: {
        $gte: startOfWeek,
        $lt: endOfWeek
      }
    });

    // This month's deadlines
    const monthDeadlines = await Project.countDocuments({
      deadline: {
        $gte: startOfMonth,
        $lt: endOfMonth
      }
    });

    // Overdue projects
    const overdueProjects = await Project.countDocuments({
      deadline: { $lt: today },
      status: { $in: ['pending', 'in-progress'] }
    });

    // Upcoming deadlines (next 7 days)
    const upcomingDeadlines = await Project.countDocuments({
      deadline: {
        $gte: today,
        $lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      },
      status: { $in: ['pending', 'in-progress'] }
    });

    res.json({
      today: todayDeadlines,
      thisWeek: weekDeadlines,
      thisMonth: monthDeadlines,
      overdue: overdueProjects,
      upcoming: upcomingDeadlines
    });
  } catch (error) {
    console.error('Get calendar stats error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching calendar statistics',
      error: error.message 
    });
  }
});

module.exports = router;
