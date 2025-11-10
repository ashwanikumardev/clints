// Vercel serverless function wrapper for Express app
// This file acts as the entry point for all /api/* routes on Vercel

const app = require('../server/index');

// Export handler for Vercel serverless functions
module.exports = (req, res) => {
  // Set Vercel environment flag
  process.env.VERCEL = '1';
  
  // Handle the request with Express app
  return app(req, res);
};

