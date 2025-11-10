const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Simple in-memory storage
let users = [
  {
    id: '1',
    name: 'Demo User',
    email: 'demo@example.com',
    password: 'password123',
    role: 'admin'
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Simple API is running',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt:', req.body);
  
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      message: 'Please provide email and password' 
    });
  }

  // Find user
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // For demo, accept any password for demo user, or correct password for others
  if (email === 'demo@example.com' || password === user.password) {
    const token = `token_${user.id}_${Date.now()}`;
    
    console.log('✅ Login successful for:', email);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  console.log('📝 Register attempt:', req.body);
  
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ 
      message: 'Please provide name, email, and password' 
    });
  }

  // Check if user exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Create new user
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password,
    role: 'user'
  };

  users.push(newUser);

  const token = `token_${newUser.id}_${Date.now()}`;
  
  console.log('✅ Registration successful for:', email);

  res.status(201).json({
    message: 'Registration successful',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    }
  });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const userId = token.split('_')[1];
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: true,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/register');
  console.log('  GET  /api/auth/me');
  console.log('');
  console.log('🧪 Test login: demo@example.com (any password)');
});
