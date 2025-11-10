const express = require('express');
const { invoiceDb, clientDb, projectDb, generateId } = require('../utils/jsonDb');
const router = express.Router();

// Simple auth middleware
const auth = (req, res, next) => {
  next();
};

// @route   GET /api/invoices
// @desc    Get all invoices with pagination and search
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const clientId = req.query.clientId || '';

    let invoices = await invoiceDb.getAll();
    const clients = await clientDb.getAll();
    const projects = await projectDb.getAll();

    // Add client and project info to invoices
    invoices = invoices.map(invoice => {
      const client = clients.find(c => c.id === invoice.clientId);
      const project = projects.find(p => p.id === invoice.projectId);
      return {
        ...invoice,
        clientName: client ? client.name : 'Unknown Client',
        clientCompany: client ? client.company : '',
        projectTitle: project ? project.title : 'No Project'
      };
    });

    // Apply search filter
    if (search) {
      invoices = invoices.filter(invoice => 
        invoice.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
        invoice.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        invoice.projectTitle?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (status) {
      invoices = invoices.filter(invoice => invoice.status === status);
    }

    // Apply client filter
    if (clientId) {
      invoices = invoices.filter(invoice => invoice.clientId === clientId);
    }

    // Sort by creation date (newest first)
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const total = invoices.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedInvoices = invoices.slice(startIndex, endIndex);

    res.json({
      invoices: paginatedInvoices,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalInvoices: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching invoices',
      error: error.message 
    });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await invoiceDb.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Get client and project info
    const client = await clientDb.findById(invoice.clientId);
    const project = invoice.projectId ? await projectDb.findById(invoice.projectId) : null;

    res.json({ 
      invoice: {
        ...invoice,
        clientName: client ? client.name : 'Unknown Client',
        clientCompany: client ? client.company : '',
        clientEmail: client ? client.email : '',
        clientAddress: client ? client.address : '',
        projectTitle: project ? project.title : 'No Project'
      }
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching invoice',
      error: error.message 
    });
  }
});

// @route   POST /api/invoices
// @desc    Create new invoice
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      clientId,
      projectId,
      items,
      dueDate,
      notes,
      discount,
      tax
    } = req.body;

    // Validation
    if (!clientId || !items || items.length === 0) {
      return res.status(400).json({ 
        message: 'Client and at least one item are required' 
      });
    }

    // Check if client exists
    const client = await clientDb.findById(clientId);
    if (!client) {
      return res.status(400).json({ 
        message: 'Client not found' 
      });
    }

    // Generate invoice number
    const invoices = await invoiceDb.getAll();
    const invoiceNumber = `INV-${String(invoices.length + 1).padStart(4, '0')}`;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const discountAmount = discount ? (subtotal * discount / 100) : 0;
    const taxAmount = tax ? ((subtotal - discountAmount) * tax / 100) : 0;
    const total = subtotal - discountAmount + taxAmount;

    const newInvoice = {
      invoiceNumber,
      clientId,
      projectId: projectId || null,
      items: items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate
      })),
      subtotal,
      discount: discount || 0,
      discountAmount,
      tax: tax || 0,
      taxAmount,
      total,
      status: 'draft',
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      notes: notes || '',
      paidAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const invoice = await invoiceDb.create(newInvoice);

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ 
      message: 'Server error while creating invoice',
      error: error.message 
    });
  }
});

// @route   PUT /api/invoices/:id
// @desc    Update invoice
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      clientId,
      projectId,
      items,
      dueDate,
      notes,
      discount,
      tax,
      status,
      paidAmount
    } = req.body;

    const invoice = await invoiceDb.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Calculate totals if items are provided
    let updateData = { ...req.body };
    if (items) {
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
      const discountAmount = discount ? (subtotal * discount / 100) : 0;
      const taxAmount = tax ? ((subtotal - discountAmount) * tax / 100) : 0;
      const total = subtotal - discountAmount + taxAmount;

      updateData = {
        ...updateData,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate
        })),
        subtotal,
        discountAmount,
        taxAmount,
        total
      };
    }

    const updatedInvoice = await invoiceDb.update(req.params.id, updateData);

    res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ 
      message: 'Server error while updating invoice',
      error: error.message 
    });
  }
});

// @route   DELETE /api/invoices/:id
// @desc    Delete invoice
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await invoiceDb.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Only allow deletion of draft invoices
    if (invoice.status !== 'draft') {
      return res.status(400).json({ 
        message: 'Only draft invoices can be deleted' 
      });
    }

    await invoiceDb.delete(req.params.id);

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting invoice',
      error: error.message 
    });
  }
});

// @route   PUT /api/invoices/:id/status
// @desc    Update invoice status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const invoice = await invoiceDb.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const updatedInvoice = await invoiceDb.update(req.params.id, { status });

    res.json({
      message: 'Invoice status updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({ 
      message: 'Server error while updating invoice status',
      error: error.message 
    });
  }
});

// @route   GET /api/invoices/stats/overview
// @desc    Get invoices statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const invoices = await invoiceDb.getAll();
    
    const totalInvoices = invoices.length;
    const draftInvoices = invoices.filter(i => i.status === 'draft').length;
    const sentInvoices = invoices.filter(i => i.status === 'sent').length;
    const paidInvoices = invoices.filter(i => i.status === 'paid').length;
    const overdueInvoices = invoices.filter(i => {
      return i.status !== 'paid' && new Date(i.dueDate) < new Date();
    }).length;

    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const pendingAmount = invoices
      .filter(i => ['sent', 'overdue'].includes(i.status))
      .reduce((sum, i) => sum + (i.total || 0), 0);

    // Get recent invoices
    const recentInvoices = invoices
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        total: i.total,
        dueDate: i.dueDate,
        createdAt: i.createdAt
      }));

    res.json({
      overview: {
        total: totalInvoices,
        draft: draftInvoices,
        sent: sentInvoices,
        paid: paidInvoices,
        overdue: overdueInvoices,
        totalRevenue: totalRevenue,
        pendingAmount: pendingAmount
      },
      recentInvoices
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching invoice statistics',
      error: error.message 
    });
  }
});

module.exports = router;
