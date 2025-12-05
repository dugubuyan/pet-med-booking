const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');

const router = express.Router();

/**
 * Validation middleware for registration
 */
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
];

/**
 * Validation middleware for login
 */
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array()[0].msg 
      });
    }
    
    const { email, password, fullName, phone } = req.body;
    const db = req.app.locals.db;
    
    // Register user
    const result = await authService.register({
      email,
      password,
      fullName,
      phone
    }, db);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific errors
    if (error.message === 'Email already registered') {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(400).json({ 
      error: error.message || 'Registration failed' 
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array()[0].msg 
      });
    }
    
    const { email, password } = req.body;
    const db = req.app.locals.db;
    
    // Login user
    const result = await authService.login(email, password, db);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle authentication errors
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: error.message });
    }
    
    res.status(400).json({ 
      error: error.message || 'Login failed' 
    });
  }
});

module.exports = router;
