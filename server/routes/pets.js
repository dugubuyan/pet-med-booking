// Pet Routes - handles pet CRUD endpoints
const express = require('express');
const router = express.Router();
const petService = require('../services/petService');
const { authenticateToken } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

/**
 * GET /api/pets
 * Get all pets for current user
 * Protected route - requires authentication
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    const pets = await petService.getUserPets(userId, db);
    
    res.json(pets);
  } catch (error) {
    console.error('Error getting user pets:', error);
    res.status(500).json({ error: error.message || 'Failed to get pets' });
  }
});

/**
 * POST /api/pets
 * Create a new pet
 * Protected route - requires authentication
 */
router.post('/',
  authenticateToken,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Pet name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Pet name must be between 1 and 50 characters'),
    body('type')
      .trim()
      .notEmpty()
      .withMessage('Pet type is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Pet type must be between 1 and 50 characters'),
    body('age')
      .trim()
      .notEmpty()
      .withMessage('Pet age is required')
      .isLength({ min: 1, max: 20 })
      .withMessage('Pet age must be between 1 and 20 characters'),
    body('breed')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Breed must be less than 50 characters'),
    body('weight')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Weight must be less than 20 characters')
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

      const userId = req.user.id;
      const petData = req.body;
      const db = req.app.locals.db;

      const newPet = await petService.createPet(userId, petData, db);
      
      res.status(201).json(newPet);
    } catch (error) {
      console.error('Error creating pet:', error);
      res.status(500).json({ error: error.message || 'Failed to create pet' });
    }
  }
);

/**
 * PUT /api/pets/:petId
 * Update a pet
 * Protected route - requires authentication
 */
router.put('/:petId',
  authenticateToken,
  [
    param('petId')
      .trim()
      .notEmpty()
      .withMessage('Pet ID is required'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Pet name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Pet name must be between 1 and 50 characters'),
    body('type')
      .trim()
      .notEmpty()
      .withMessage('Pet type is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Pet type must be between 1 and 50 characters'),
    body('age')
      .trim()
      .notEmpty()
      .withMessage('Pet age is required')
      .isLength({ min: 1, max: 20 })
      .withMessage('Pet age must be between 1 and 20 characters'),
    body('breed')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Breed must be less than 50 characters'),
    body('weight')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Weight must be less than 20 characters')
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

      const userId = req.user.id;
      const { petId } = req.params;
      const petData = req.body;
      const db = req.app.locals.db;

      const updatedPet = await petService.updatePet(petId, userId, petData, db);
      
      res.json(updatedPet);
    } catch (error) {
      console.error('Error updating pet:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: error.message || 'Failed to update pet' });
    }
  }
);

/**
 * DELETE /api/pets/:petId
 * Delete a pet
 * Protected route - requires authentication
 */
router.delete('/:petId',
  authenticateToken,
  [
    param('petId')
      .trim()
      .notEmpty()
      .withMessage('Pet ID is required')
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

      const userId = req.user.id;
      const { petId } = req.params;
      const db = req.app.locals.db;

      const result = await petService.deletePet(petId, userId, db);
      
      res.json(result);
    } catch (error) {
      console.error('Error deleting pet:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: error.message || 'Failed to delete pet' });
    }
  }
);

module.exports = router;
