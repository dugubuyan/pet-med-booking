// User Routes - handles user profile endpoints
const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * GET /api/users/profile
 * Get current user's profile
 * Protected route - requires authentication
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const db = req.app.locals.db;
    const user = await userService.getUserById(userId, db);
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: error.message || 'Failed to get user profile' });
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile
 * Protected route - requires authentication
 */
router.put('/profile',
  authenticateToken,
  [
    body('fullName')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^\+?[\d\s\-\(\)]+$/)
      .withMessage('Invalid phone number format')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: errors.array()[0].msg,
          errors: errors.array() 
        });
      }

      const userId = req.userId || req.user.id;
      const { fullName, phone } = req.body;
      const db = req.app.locals.db;

      const updatedUser = await userService.updateProfile(userId, { fullName, phone }, db);
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: error.message || 'Failed to update user profile' });
    }
  }
);

module.exports = router;
