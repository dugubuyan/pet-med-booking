const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { optionalAuthenticateToken, authenticateToken } = require('../middleware/auth');
const conversationService = require('../services/conversationService');
const geminiService = require('../services/geminiService');
const promptService = require('../services/promptService');

/**
 * POST /api/chat
 * Send a message and get AI response
 */
router.post(
  '/',
  optionalAuthenticateToken,
  [
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('sessionId').optional({ nullable: true }).isString(),
    body('language').optional().isIn(['en', 'zh', 'sv']).withMessage('Invalid language'),
    body('userContext').optional().isObject()
  ],
  async (req, res) => {
    // Debug logging
    // console.log('=== CHAT REQUEST DEBUG ===');
    // console.log('Headers:', req.headers);
    // console.log('Body:', req.body);
    // console.log('Body type:', typeof req.body);
    // console.log('Body keys:', Object.keys(req.body));
    // console.log('Message value:', req.body.message);
    // console.log('Message type:', typeof req.body.message);
    // console.log('========================');
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      console.error('Request body:', req.body);
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    try {
      const { message, sessionId, language = 'en', userContext = {} } = req.body;
      
      // Extract user ID from JWT token if authenticated
      const userId = req.user?.id || null;
      
      // Get or create conversation
      const conversation = await conversationService.getOrCreateConversation(
        sessionId,
        userId,
        language
      );

      // Store user message
      await conversationService.storeMessage(
        conversation.id,
        'user',
        message
      );

      // Get conversation history
      const history = await conversationService.getConversationHistory(conversation.sessionId);

      // Build conversation for Gemini (include system prompt as first message)
      const systemPrompt = promptService.getSystemPrompt(language, userContext);
      
      // Get language-specific acknowledgment
      const acknowledgments = {
        en: 'I understand. I will help as a pet health consultation assistant.',
        zh: '我明白了。我将作为宠物健康咨询助手为您提供帮助。',
        sv: 'Jag förstår. Jag kommer att hjälpa som assistent för husdjurshälsa.'
      };
      const acknowledgment = acknowledgments[language] || acknowledgments.en;
      
      const conversationForGemini = [
        { role: 'user', content: systemPrompt },
        { role: 'assistant', content: acknowledgment },
        ...history.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Log key conversation info
      console.log('Chat session:', conversation.sessionId, '| Language:', language, '| Pet:', userContext.petInfo?.currentPet?.name || 'none');



      // Define function calling tools for appointment booking
      const tools = [{
        functionDeclarations: [{
          name: 'book_appointment',
          description: 'Books a veterinary appointment. Call this when the user wants to book and you have: ownerName, phone, email, petName, petType. Optional fields: symptoms, appointmentDate, appointmentTime, location, petAge, petBreed, petWeight.',
          parameters: {
            type: 'object',
            properties: {
              ownerName: {
                type: 'string',
                description: 'Full name of the pet parent'
              },
              phone: {
                type: 'string',
                description: 'Phone number of the pet parent'
              },
              email: {
                type: 'string',
                description: 'Email address of the pet parent'
              },
              petName: {
                type: 'string',
                description: 'Name of the pet'
              },
              petType: {
                type: 'string',
                description: 'Type of pet (e.g., dog, cat, bird, rabbit)'
              },
              petAge: {
                type: 'string',
                description: 'Age of the pet (optional)'
              },
              petBreed: {
                type: 'string',
                description: 'Breed of the pet (optional)'
              },
              petWeight: {
                type: 'string',
                description: 'Weight of the pet (optional)'
              },
              symptoms: {
                type: 'string',
                description: 'Description of the pet\'s symptoms and health concerns (optional - use "Not specified" if owner prefers not to share)'
              },
              appointmentDate: {
                type: 'string',
                description: 'Preferred appointment date in YYYY-MM-DD format (optional - OMIT if not specified by user, system will auto-assign, e.g., 2024-12-15)'
              },
              appointmentTime: {
                type: 'string',
                description: 'Preferred appointment time (optional - OMIT if not specified by user, system will auto-assign, e.g., "10:00 AM", "2:00 PM")'
              },
              location: {
                type: 'string',
                description: 'Preferred clinic location (optional - OMIT if not specified by user, system will auto-assign a clinic, e.g., "Downtown Veterinary Clinic", "Northside Animal Hospital", "West End Pet Care")'
              }
            },
            required: ['ownerName', 'phone', 'email', 'petName', 'petType']
          }
        }]
      }];

      // Get AI response from Gemini with function calling
      const startTime = Date.now();
      const aiResponse = await geminiService.sendMessage(conversationForGemini, { tools });
      const duration = Date.now() - startTime;

      // Check if AI wants to call a function
      if (aiResponse.type === 'function_call' && aiResponse.functionCall.name === 'book_appointment') {
        console.log('\n========== FUNCTION CALL DETECTED ==========');
        console.log('Function Name:', aiResponse.functionCall.name);
        console.log('Function Arguments (from AI):');
        console.log(JSON.stringify(aiResponse.functionCall.args, null, 2));
        console.log('===========================================\n');
        
        const appointmentService = require('../services/appointmentService');
        const appointmentData = aiResponse.functionCall.args;
        
        try {
          // Create appointment
          console.log('📞 Calling appointmentService.createAppointment...');
          const appointment = await appointmentService.createAppointment(
            appointmentData,
            conversation.id,
            userId === null
          );
          
          console.log('\n========== APPOINTMENT CREATED ==========');
          console.log('✅ Appointment successfully created!');
          console.log('Booking ID:', appointment.bookingId);
          console.log('Full Appointment Data:');
          console.log(JSON.stringify(appointment, null, 2));
          console.log('=========================================\n');
          
          // Send function result back to AI to generate a response with full appointment details
          const appointmentDetails = {
            bookingId: appointment.bookingId,
            ownerName: appointment.ownerName,
            phone: appointment.phone,
            email: appointment.email,
            petName: appointment.petName,
            petType: appointment.petType,
            petAge: appointment.petAge,
            petBreed: appointment.petBreed,
            petWeight: appointment.petWeight,
            symptoms: appointment.symptoms,
            createdAt: appointment.createdAt
          };
          
          const functionResultMessage = `Function result: Appointment successfully booked! Here are the complete details:
- Booking ID: ${appointment.bookingId}
- Owner: ${appointment.ownerName}
- Phone: ${appointment.phone}
- Email: ${appointment.email}
- Pet: ${appointment.petName} (${appointment.petType})
${appointment.petAge ? `- Pet Age: ${appointment.petAge}` : ''}
${appointment.petBreed ? `- Breed: ${appointment.petBreed}` : ''}
${appointment.petWeight ? `- Weight: ${appointment.petWeight}` : ''}
${appointment.symptoms ? `- Symptoms: ${appointment.symptoms}` : ''}
${appointment.appointmentDate ? `- Date: ${appointment.appointmentDate}` : ''}
${appointment.appointmentTime ? `- Time: ${appointment.appointmentTime}` : ''}
${appointment.location ? `- Location: ${appointment.location}` : ''}
- Booked at: ${appointment.createdAt}

Please confirm the booking with the user and provide them with all these details. ${appointment.appointmentDate && appointment.appointmentTime && appointment.location ? 'The appointment is fully scheduled.' : 'Let them know the clinic will contact them to confirm the appointment time and location if not specified.'}`;
          
          console.log('\n========== SENDING FUNCTION RESULT TO AI ==========');
          console.log('Sending appointment details back to AI for natural language response...');
          console.log('Function Result Message:');
          console.log(functionResultMessage);
          console.log('===================================================\n');
          
          const functionResultConversation = [
            ...conversationForGemini,
            {
              role: 'assistant',
              content: JSON.stringify(aiResponse.functionCall)
            },
            {
              role: 'user',
              content: functionResultMessage
            }
          ];
          
          const finalResponse = await geminiService.sendMessage(functionResultConversation);
          
          console.log('\n========== AI FINAL RESPONSE ==========');
          console.log('AI generated confirmation message:');
          console.log(finalResponse);
          console.log('=======================================\n');
          
          // Store the final response
          await conversationService.storeMessage(
            conversation.id,
            'assistant',
            finalResponse
          );
          
          // Return response with appointment info
          res.json({
            success: true,
            response: finalResponse,
            sessionId: conversation.sessionId,
            appointmentBooked: true,
            bookingId: appointment.bookingId,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('\n========== APPOINTMENT BOOKING FAILED ==========');
          console.error('❌ Error:', error.message);
          console.error('Error Details:', error);
          console.error('================================================\n');
          
          // Tell AI that booking failed
          const errorMessage = `Function result: Failed to book appointment. Error: ${error.message}. Please apologize to the user and ask them to try again.`;
          
          console.log('\n========== SENDING ERROR TO AI ==========');
          console.log('Error Message to AI:');
          console.log(errorMessage);
          console.log('=========================================\n');
          
          const errorConversation = [
            ...conversationForGemini,
            {
              role: 'user',
              content: errorMessage
            }
          ];
          
          const errorResponse = await geminiService.sendMessage(errorConversation);
          
          console.log('\n========== AI ERROR RESPONSE ==========');
          console.log('AI generated error message:');
          console.log(errorResponse);
          console.log('=======================================\n');
          
          await conversationService.storeMessage(
            conversation.id,
            'assistant',
            errorResponse
          );
          
          res.json({
            success: true,
            response: errorResponse,
            sessionId: conversation.sessionId,
            timestamp: new Date().toISOString()
          });
        }
        
        return;
      }

      // Log LLM response
      console.log('\n========== LLM RESPONSE ==========');
      console.log('Duration:', duration, 'ms');
      console.log('Response Length:', aiResponse.length, 'characters');
      console.log('Response:');
      console.log(aiResponse);
      console.log('==================================\n');

      // Store AI response
      await conversationService.storeMessage(
        conversation.id,
        'assistant',
        aiResponse
      );

      // Return response
      res.json({
        success: true,
        response: aiResponse,
        sessionId: conversation.sessionId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Chat endpoint error:', error);
      
      // Return user-friendly error message
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process chat message',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/conversations/:sessionId
 * Get conversation history
 */
router.get('/conversations/:sessionId', optionalAuthenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get conversation
    const conversation = await conversationService.getConversation(sessionId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Check authorization for non-guest conversations
    if (!conversation.isGuest && req.user?.id !== conversation.userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this conversation'
      });
    }

    // Get messages
    const messages = await conversationService.getConversationHistory(sessionId);

    res.json({
      success: true,
      conversation: {
        sessionId: conversation.sessionId,
        language: conversation.language,
        isGuest: conversation.isGuest,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      },
      messages
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation'
    });
  }
});

/**
 * GET /api/conversations
 * Get all conversations for authenticated user
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    // Require authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const limit = parseInt(req.query.limit) || 20;
    const conversations = await conversationService.getUserConversations(req.user.id, limit);

    res.json({
      success: true,
      conversations
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversations'
    });
  }
});

/**
 * DELETE /api/conversations/:sessionId
 * Delete a conversation
 */
router.delete('/conversations/:sessionId', authenticateToken, async (req, res) => {
  try {
    // Require authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { sessionId } = req.params;
    const deleted = await conversationService.deleteConversation(sessionId, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete conversation'
    });
  }
});

/**
 * POST /api/chat/session
 * Create a new chat session
 */
router.post('/session', optionalAuthenticateToken, async (req, res) => {
  try {
    const { language = 'en' } = req.body;
    const userId = req.user?.id || null;
    
    // Create new conversation session
    const conversation = await conversationService.createConversation(userId, language);
    
    res.json({
      success: true,
      sessionId: conversation.sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
});

/**
 * POST /api/chat/greeting
 * Get initial greeting message
 */
router.post('/greeting', async (req, res) => {
  try {
    const { language = 'en', userContext = {} } = req.body;
    
    const greeting = promptService.getGreeting(language, userContext);
    
    res.json({
      success: true,
      greeting,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Greeting endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate greeting'
    });
  }
});

module.exports = router;
