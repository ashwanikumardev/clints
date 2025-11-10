const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/invoices', require('./routes/invoices'));

// Root route - Welcome page
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Welcome to AugCodex Client Manager API (JSON Mode)',
    version: '1.0.0',
    status: 'Running',
    database: 'JSON Files (No MongoDB Required)',
    endpoints: {
      health: '/api/health',
      testPage: '/test.html',
      auth: '/api/auth',
      clients: '/api/clients',
      projects: '/api/projects',
      invoices: '/api/invoices'
    },
    documentation: 'Visit /test.html for API testing interface'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'JSON Files'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    requestedPath: req.originalUrl,
    availableEndpoints: {
      root: '/',
      health: '/api/health',
      testPage: '/test.html',
      auth: '/api/auth'
    },
    suggestion: 'Visit / for API information or /test.html for testing interface'
  });
});

// Only start server if not running as serverless function (Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: JSON Files (No MongoDB required)`);
    console.log(`🌐 API URL: http://localhost:${PORT}`);
  });
}

module.exports = app;
