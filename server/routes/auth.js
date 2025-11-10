const express = require('express');
const jwt = require('jsonwebtoken');
const { userDb } = require('../utils/jsonDb');
const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    console.log('🔐 Registration attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      console.log('❌ Registration validation failed: missing fields');
      return res.status(400).json({ 
        message: 'Please provide name, email, and password' 
      });
    }

    if (password.length < 6) {
      console.log('❌ Registration validation failed: password too short');
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Create user
    const user = await userDb.create({ name, email, password });
    console.log('✅ User created successfully:', user.email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    console.log('✅ Registration successful for:', user.email);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    if (error.message === 'User already exists') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('❌ Login validation failed: missing fields');
      return res.status(400).json({ 
        message: 'Please provide email and password' 
      });
    }

    // Validate user credentials
    const user = await userDb.validatePassword(email, password);
    if (!user) {
      console.log('❌ Login failed: invalid credentials for', email);
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Update last login
    await userDb.updateLastLogin(user.id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', user.email);
    res.json({
      message: 'Login successful',
      token,
      user
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await userDb.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
