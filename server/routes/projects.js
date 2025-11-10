const express = require('express');
const { projectDb, clientDb, generateId } = require('../utils/jsonDb');
const router = express.Router();

// Simple auth middleware
const auth = (req, res, next) => {
  next();
};

// @route   GET /api/projects
// @desc    Get all projects with pagination and search
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const clientId = req.query.clientId || '';

    let projects = await projectDb.getAll();
    const clients = await clientDb.getAll();

    // Add client info to projects
    projects = projects.map(project => {
      const client = clients.find(c => c.id === project.clientId);
      return {
        ...project,
        clientName: client ? client.name : 'Unknown Client',
        clientCompany: client ? client.company : ''
      };
    });

    // Apply search filter
    if (search) {
      projects = projects.filter(project => 
        project.title?.toLowerCase().includes(search.toLowerCase()) ||
        project.description?.toLowerCase().includes(search.toLowerCase()) ||
        project.clientName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (status) {
      projects = projects.filter(project => project.status === status);
    }

    // Apply client filter
    if (clientId) {
      projects = projects.filter(project => project.clientId === clientId);
    }

    // Sort by creation date (newest first)
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const total = projects.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProjects = projects.slice(startIndex, endIndex);

    res.json({
      projects: paginatedProjects,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProjects: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching projects',
      error: error.message 
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await projectDb.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get client info
    const client = await clientDb.findById(project.clientId);

    res.json({ 
      project: {
        ...project,
        clientName: client ? client.name : 'Unknown Client',
        clientCompany: client ? client.company : ''
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching project',
      error: error.message 
    });
  }
});

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      clientId,
      startDate,
      endDate,
      budget,
      status,
      priority,
      tags,
      milestones
    } = req.body;

    // Validation
    if (!title || !clientId) {
      return res.status(400).json({ 
        message: 'Title and client are required' 
      });
    }

    // Check if client exists
    const client = await clientDb.findById(clientId);
    if (!client) {
      return res.status(400).json({ 
        message: 'Client not found' 
      });
    }

    const newProject = {
      title,
      description: description || '',
      clientId,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || null,
      budget: budget || 0,
      status: status || 'pending',
      priority: priority || 'medium',
      tags: tags || [],
      milestones: milestones || [],
      progress: 0,
      totalHours: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const project = await projectDb.create(newProject);

    // Update client's project count
    const clients = await clientDb.getAll();
    const clientIndex = clients.findIndex(c => c.id === clientId);
    if (clientIndex !== -1) {
      clients[clientIndex].totalProjects = (clients[clientIndex].totalProjects || 0) + 1;
      await clientDb.writeAll(clients);
    }

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ 
      message: 'Server error while creating project',
      error: error.message 
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      clientId,
      startDate,
      endDate,
      budget,
      status,
      priority,
      tags,
      milestones,
      progress
    } = req.body;

    const project = await projectDb.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if client exists (if clientId is being changed)
    if (clientId && clientId !== project.clientId) {
      const client = await clientDb.findById(clientId);
      if (!client) {
        return res.status(400).json({ 
          message: 'Client not found' 
        });
      }
    }

    // Update project
    const updatedProject = await projectDb.update(req.params.id, {
      title: title || project.title,
      description: description !== undefined ? description : project.description,
      clientId: clientId || project.clientId,
      startDate: startDate || project.startDate,
      endDate: endDate !== undefined ? endDate : project.endDate,
      budget: budget !== undefined ? budget : project.budget,
      status: status || project.status,
      priority: priority || project.priority,
      tags: tags !== undefined ? tags : project.tags,
      milestones: milestones !== undefined ? milestones : project.milestones,
      progress: progress !== undefined ? progress : project.progress
    });

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ 
      message: 'Server error while updating project',
      error: error.message 
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await projectDb.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await projectDb.delete(req.params.id);

    // Update client's project count
    const clients = await clientDb.getAll();
    const clientIndex = clients.findIndex(c => c.id === project.clientId);
    if (clientIndex !== -1) {
      clients[clientIndex].totalProjects = Math.max(0, (clients[clientIndex].totalProjects || 1) - 1);
      await clientDb.writeAll(clients);
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting project',
      error: error.message 
    });
  }
});

// @route   GET /api/projects/stats/overview
// @desc    Get projects statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const projects = await projectDb.getAll();
    
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => ['pending', 'in-progress'].includes(p.status)).length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const overdueProjects = projects.filter(p => {
      if (!p.endDate) return false;
      return new Date(p.endDate) < new Date() && p.status !== 'completed';
    }).length;

    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const avgProgress = projects.length > 0 ? 
      projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length : 0;

    // Get recent projects
    const recentProjects = projects
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        progress: p.progress,
        endDate: p.endDate,
        createdAt: p.createdAt
      }));

    res.json({
      overview: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        overdue: overdueProjects,
        totalBudget: totalBudget,
        avgProgress: Math.round(avgProgress)
      },
      recentProjects
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching project statistics',
      error: error.message 
    });
  }
});

module.exports = router;
