const express = require('express');
const { clientDb, generateId } = require('../utils/jsonDb');
const router = express.Router();

// Simple auth middleware check (we'll add proper auth later)
const auth = (req, res, next) => {
  // For now, just pass through - we'll implement proper JWT auth later
  next();
};

// @route   GET /api/clients
// @desc    Get all clients with pagination and search
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let clients = await clientDb.getAll();

    // Apply search filter
    if (search) {
      clients = clients.filter(client => 
        client.name?.toLowerCase().includes(search.toLowerCase()) ||
        client.email?.toLowerCase().includes(search.toLowerCase()) ||
        client.company?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (status) {
      clients = clients.filter(client => client.status === status);
    }

    // Sort by creation date (newest first)
    clients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const total = clients.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedClients = clients.slice(startIndex, endIndex);

    res.json({
      clients: paginatedClients,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalClients: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching clients',
      error: error.message 
    });
  }
});

// @route   GET /api/clients/:id
// @desc    Get single client
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const clients = await clientDb.getAll();
    const client = clients.find(c => c.id === req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ client });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching client',
      error: error.message 
    });
  }
});

// @route   POST /api/clients
// @desc    Create new client
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      email,
      company,
      whatsapp,
      phone,
      address,
      notes,
      status
    } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({ 
        message: 'Name and email are required' 
      });
    }

    // Check if client with email already exists
    const clients = await clientDb.getAll();
    const existingClient = clients.find(c => c.email === email);
    if (existingClient) {
      return res.status(400).json({ 
        message: 'Client with this email already exists' 
      });
    }

    const newClient = {
      id: generateId(),
      name,
      email,
      company: company || '',
      whatsapp: whatsapp || '',
      phone: phone || '',
      address: address || '',
      notes: notes || '',
      status: status || 'active',
      totalProjects: 0,
      totalRevenue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const client = await clientDb.create(newClient);

    res.status(201).json({
      message: 'Client created successfully',
      client
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ 
      message: 'Server error while creating client',
      error: error.message 
    });
  }
});

// @route   PUT /api/clients/:id
// @desc    Update client
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name,
      email,
      company,
      whatsapp,
      phone,
      address,
      notes,
      status
    } = req.body;

    const clients = await clientDb.getAll();
    const clientIndex = clients.findIndex(c => c.id === req.params.id);
    
    if (clientIndex === -1) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const client = clients[clientIndex];

    // Check if email is being changed and if it already exists
    if (email && email !== client.email) {
      const existingClient = clients.find(c => c.email === email && c.id !== req.params.id);
      if (existingClient) {
        return res.status(400).json({ 
          message: 'Client with this email already exists' 
        });
      }
    }

    // Update client
    const updatedClient = {
      ...client,
      name: name || client.name,
      email: email || client.email,
      company: company !== undefined ? company : client.company,
      whatsapp: whatsapp !== undefined ? whatsapp : client.whatsapp,
      phone: phone !== undefined ? phone : client.phone,
      address: address !== undefined ? address : client.address,
      notes: notes !== undefined ? notes : client.notes,
      status: status || client.status,
      updatedAt: new Date().toISOString()
    };

    clients[clientIndex] = updatedClient;
    await clientDb.writeAll(clients);

    res.json({
      message: 'Client updated successfully',
      client: updatedClient
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ 
      message: 'Server error while updating client',
      error: error.message 
    });
  }
});

// @route   DELETE /api/clients/:id
// @desc    Delete client
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const clients = await clientDb.getAll();
    const clientIndex = clients.findIndex(c => c.id === req.params.id);
    
    if (clientIndex === -1) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Remove client from array
    clients.splice(clientIndex, 1);
    await clientDb.writeAll(clients);

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting client',
      error: error.message 
    });
  }
});

// @route   GET /api/clients/stats/overview
// @desc    Get clients statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const clients = await clientDb.getAll();
    
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const inactiveClients = clients.filter(c => c.status === 'inactive').length;
    const prospects = clients.filter(c => c.status === 'prospect').length;

    // Get top clients by revenue
    const topClients = clients
      .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        totalRevenue: c.totalRevenue || 0,
        totalProjects: c.totalProjects || 0
      }));

    // Get recent clients
    const recentClients = clients
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        email: c.email,
        createdAt: c.createdAt,
        status: c.status
      }));

    res.json({
      overview: {
        total: totalClients,
        active: activeClients,
        inactive: inactiveClients,
        prospects: prospects
      },
      topClients,
      recentClients
    });
  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching client statistics',
      error: error.message 
    });
  }
});

module.exports = router;
