const express = require('express');
const router = express.Router();
const appointmentService = require('../services/appointmentService');
const conversationService = require('../services/conversationService');
const { body, validationResult } = require('express-validator');

/**
 * POST /api/appointments
 * Create a new appointment from conversation data
 */
router.post(
  '/',
  [
    body('appointmentData.ownerName').trim().notEmpty().withMessage('Owner name is required'),
    body('appointmentData.phone').trim().notEmpty().withMessage('Phone number is required'),
    body('appointmentData.email').isEmail().withMessage('Valid email is required'),
    body('appointmentData.petName').trim().notEmpty().withMessage('Pet name is required'),
    body('appointmentData.petType').trim().notEmpty().withMessage('Pet type is required'),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { sessionId, appointmentData } = req.body;

      // Additional validation using service
      const validation = appointmentService.validateAppointmentData(appointmentData);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Incomplete appointment data',
          missingFields: validation.missingFields
        });
      }

      // Get conversation if sessionId provided
      let conversationId = null;
      if (sessionId) {
        const conversation = await conversationService.getConversation(sessionId);
        if (conversation) {
          conversationId = conversation.id;
        }
      }

      // Determine if user is guest
      const isGuest = !req.user; // req.user is set by auth middleware if authenticated

      // Create appointment
      const appointment = await appointmentService.createAppointment(
        appointmentData,
        conversationId,
        isGuest
      );

      res.status(201).json({
        success: true,
        bookingId: appointment.bookingId,
        message: 'Appointment created successfully',
        appointment: {
          bookingId: appointment.bookingId,
          ownerName: appointment.ownerName,
          petName: appointment.petName,
          petType: appointment.petType,
          createdAt: appointment.createdAt
        }
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      res.status(500).json({
        error: 'Failed to create appointment',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/appointments/:bookingId
 * Get appointment by booking ID
 */
router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const appointment = await appointmentService.getAppointment(bookingId);

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Error getting appointment:', error);
    res.status(500).json({
      error: 'Failed to retrieve appointment',
      message: error.message
    });
  }
});

/**
 * POST /api/appointments/extract
 * Extract appointment data from conversation
 */
router.post('/extract', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required'
      });
    }

    const extractedData = await conversationService.extractAppointmentData(sessionId);

    res.json({
      success: true,
      ...extractedData
    });
  } catch (error) {
    console.error('Error extracting appointment data:', error);
    res.status(500).json({
      error: 'Failed to extract appointment data',
      message: error.message
    });
  }
});

module.exports = router;
