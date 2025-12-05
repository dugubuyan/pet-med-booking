const db = require('../database/dbInstance');
const { v4: uuidv4 } = require('uuid');

/**
 * Conversation Service
 * Manages conversation sessions and message storage
 */
class ConversationService {
  /**
   * Create a new conversation session
   * @param {string|null} userId - User ID (null for guest)
   * @param {string} language - Language code (en, zh, sv)
   * @returns {Promise<Object>} Created conversation with sessionId
   */
  async createConversation(userId = null, language = 'en') {
    const sessionId = uuidv4();
    const isGuest = userId === null;

    try {
      const result = await db.run(`
        INSERT INTO conversations (session_id, user_id, is_guest, language)
        VALUES (?, ?, ?, ?)
      `, [sessionId, userId, isGuest ? 1 : 0, language]);

      return {
        id: result.lastID,
        sessionId,
        userId,
        isGuest,
        language,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation session');
    }
  }

  /**
   * Get conversation by session ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Conversation object or null
   */
  async getConversation(sessionId) {
    try {
      const conversation = await db.get(`
        SELECT * FROM conversations WHERE session_id = ?
      `, [sessionId]);

      if (!conversation) {
        return null;
      }

      return {
        id: conversation.id,
        sessionId: conversation.session_id,
        userId: conversation.user_id,
        isGuest: conversation.is_guest === 1,
        language: conversation.language,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      };
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw new Error('Failed to retrieve conversation');
    }
  }

  /**
   * Store a message in the conversation
   * @param {number} conversationId - Conversation database ID
   * @param {string} role - Message role ('user' or 'assistant')
   * @param {string} content - Message content
   * @returns {Promise<Object>} Created message
   */
  async storeMessage(conversationId, role, content) {
    if (!['user', 'assistant'].includes(role)) {
      throw new Error('Invalid message role. Must be "user" or "assistant"');
    }

    try {
      const result = await db.run(`
        INSERT INTO messages (conversation_id, role, content)
        VALUES (?, ?, ?)
      `, [conversationId, role, content]);

      // Update conversation updated_at timestamp
      await db.run(`
        UPDATE conversations 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [conversationId]);

      return {
        id: result.lastID,
        conversationId,
        role,
        content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error storing message:', error);
      throw new Error('Failed to store message');
    }
  }

  /**
   * Get conversation history (all messages)
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Array of messages
   */
  async getConversationHistory(sessionId) {
    try {
      const conversation = await this.getConversation(sessionId);
      
      if (!conversation) {
        return [];
      }

      const messages = await db.all(`
        SELECT * FROM messages 
        WHERE conversation_id = ? 
        ORDER BY timestamp ASC
      `, [conversation.id]);

      return messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw new Error('Failed to retrieve conversation history');
    }
  }

  /**
   * Get or create conversation session
   * @param {string|null} sessionId - Existing session ID or null for new
   * @param {string|null} userId - User ID (null for guest)
   * @param {string} language - Language code
   * @returns {Promise<Object>} Conversation object
   */
  async getOrCreateConversation(sessionId, userId = null, language = 'en') {
    if (sessionId) {
      const existing = await this.getConversation(sessionId);
      if (existing) {
        return existing;
      }
    }

    // Create new conversation if sessionId not provided or not found
    return await this.createConversation(userId, language);
  }

  /**
   * Extract context from conversation messages
   * Parses messages to find owner info, pet info, and symptoms
   * @param {Array} messages - Array of message objects
   * @returns {Object} Extracted context
   */
  extractContext(messages) {
    const context = {
      ownerInfo: {
        name: null,
        phone: null,
        email: null
      },
      petInfo: {
        name: null,
        type: null,
        age: null,
        breed: null,
        weight: null
      },
      symptoms: []
    };

    // Simple extraction logic - looks for patterns in messages
    const allText = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    // Extract email (simple regex)
    const emailMatch = allText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      context.ownerInfo.email = emailMatch[0];
    }

    // Extract phone (simple pattern for various formats)
    const phoneMatch = allText.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\d{10}\b/);
    if (phoneMatch) {
      context.ownerInfo.phone = phoneMatch[0];
    }

    // Note: More sophisticated extraction would use NLP or structured prompts
    // For now, this provides basic pattern matching

    return context;
  }

  /**
   * Extract appointment data from conversation
   * Uses AI responses and user messages to extract structured data
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Extracted appointment data with validation
   */
  async extractAppointmentData(sessionId) {
    try {
      const messages = await this.getConversationHistory(sessionId);
      
      if (messages.length === 0) {
        return {
          isComplete: false,
          data: {},
          missingFields: ['All information']
        };
      }

      const data = {
        ownerName: null,
        phone: null,
        email: null,
        petName: null,
        petType: null,
        petAge: null,
        petBreed: null,
        petWeight: null,
        symptoms: null
      };

      // Combine all messages for analysis
      const allMessages = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
      const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content).join(' ');

      // Extract email
      const emailMatch = allMessages.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) {
        data.email = emailMatch[0];
      }

      // Extract phone (various formats)
      const phonePatterns = [
        /\b\+?1?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})\b/,
        /\b\d{10}\b/,
        /\b\+\d{1,3}[-.\s]?\d{6,14}\b/
      ];
      
      for (const pattern of phonePatterns) {
        const phoneMatch = allMessages.match(pattern);
        if (phoneMatch) {
          data.phone = phoneMatch[0];
          break;
        }
      }

      // Extract owner name (look for patterns like "my name is", "I'm", "I am")
      const namePatterns = [
        /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /(?:owner|name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
      ];
      
      for (const pattern of namePatterns) {
        const nameMatch = userMessages.match(pattern);
        if (nameMatch && nameMatch[1]) {
          data.ownerName = nameMatch[1].trim();
          break;
        }
      }

      // Extract pet name (look for patterns)
      const petNamePatterns = [
        /(?:pet(?:'s)? name is|(?:his|her|their) name is)\s+([A-Z][a-z]+)/i,
        /(?:pet|dog|cat|animal):\s*([A-Z][a-z]+)/i,
        /\b([A-Z][a-z]+)\s+(?:is|has|seems)/
      ];
      
      for (const pattern of petNamePatterns) {
        const petNameMatch = userMessages.match(pattern);
        if (petNameMatch && petNameMatch[1] && petNameMatch[1].length > 1) {
          data.petName = petNameMatch[1].trim();
          break;
        }
      }

      // Extract pet type
      const petTypes = ['dog', 'cat', 'bird', 'rabbit', 'hamster', 'guinea pig', 'fish', 'reptile', 'turtle', 'snake', 'lizard'];
      for (const type of petTypes) {
        const regex = new RegExp(`\\b${type}\\b`, 'i');
        if (userMessages.match(regex)) {
          data.petType = type.charAt(0).toUpperCase() + type.slice(1);
          break;
        }
      }

      // Extract age (look for patterns like "2 years", "5 months", "3 year old")
      const agePatterns = [
        /(\d+)\s*(?:year|yr)s?(?:\s*old)?/i,
        /(\d+)\s*(?:month|mo)s?(?:\s*old)?/i,
        /(?:age|aged)\s*(\d+)/i
      ];
      
      for (const pattern of agePatterns) {
        const ageMatch = allMessages.match(pattern);
        if (ageMatch) {
          data.petAge = ageMatch[0].trim();
          break;
        }
      }

      // Extract breed
      const breedPatterns = [
        /(?:breed is|breed:)\s*([A-Za-z\s]+?)(?:\.|,|$)/i,
        /\b(golden retriever|labrador|german shepherd|poodle|bulldog|beagle|persian|siamese|maine coon|bengal)\b/i
      ];
      
      for (const pattern of breedPatterns) {
        const breedMatch = allMessages.match(pattern);
        if (breedMatch && breedMatch[1]) {
          data.petBreed = breedMatch[1].trim();
          break;
        }
      }

      // Extract weight
      const weightPatterns = [
        /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|lbs?|pounds?)/i,
        /(?:weighs?|weight)\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|lbs?|pounds?)/i
      ];
      
      for (const pattern of weightPatterns) {
        const weightMatch = allMessages.match(pattern);
        if (weightMatch) {
          data.petWeight = weightMatch[0].trim();
          break;
        }
      }

      // Extract symptoms (collect from user messages)
      const symptomKeywords = ['symptom', 'problem', 'issue', 'concern', 'sick', 'hurt', 'pain', 'vomit', 'diarrhea', 'cough', 'sneez', 'scratch', 'limp', 'bleed', 'swell'];
      const symptomsText = [];
      
      for (const msg of messages.filter(m => m.role === 'user')) {
        const hasSymptomKeyword = symptomKeywords.some(keyword => 
          msg.content.toLowerCase().includes(keyword)
        );
        if (hasSymptomKeyword || msg.content.length > 20) {
          symptomsText.push(msg.content);
        }
      }
      
      if (symptomsText.length > 0) {
        data.symptoms = symptomsText.join('. ');
      }

      // Validate completeness
      const requiredFields = ['ownerName', 'phone', 'email', 'petName', 'petType'];
      const missingFields = requiredFields.filter(field => !data[field]);

      return {
        isComplete: missingFields.length === 0,
        data,
        missingFields: missingFields.map(field => {
          const labels = {
            ownerName: 'Owner name',
            phone: 'Phone number',
            email: 'Email address',
            petName: 'Pet name',
            petType: 'Pet type'
          };
          return labels[field] || field;
        })
      };
    } catch (error) {
      console.error('Error extracting appointment data:', error);
      throw new Error('Failed to extract appointment data from conversation');
    }
  }

  /**
   * Request missing information from user
   * Generates a message asking for missing fields
   * @param {Array} missingFields - Array of missing field labels
   * @param {string} language - Language code
   * @returns {string} Message requesting missing information
   */
  requestMissingInformation(missingFields, language = 'en') {
    const messages = {
      en: {
        prefix: "I need a bit more information to complete your appointment booking. Could you please provide:",
        suffix: "Once I have this information, I can help you schedule an appointment."
      },
      zh: {
        prefix: "我需要更多信息来完成您的预约。请提供：",
        suffix: "一旦我获得这些信息，我就可以帮您安排预约。"
      },
      sv: {
        prefix: "Jag behöver lite mer information för att slutföra din bokning. Kan du ge:",
        suffix: "När jag har denna information kan jag hjälpa dig att boka en tid."
      }
    };

    const lang = messages[language] || messages.en;
    const fieldList = missingFields.map(field => `- ${field}`).join('\n');
    
    return `${lang.prefix}\n\n${fieldList}\n\n${lang.suffix}`;
  }

  /**
   * Get all conversations for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of conversations to return
   * @returns {Promise<Array>} Array of conversations with preview
   */
  async getUserConversations(userId, limit = 20) {
    try {
      const conversations = await db.all(`
        SELECT c.*, 
               (SELECT content FROM messages 
                WHERE conversation_id = c.id 
                ORDER BY timestamp ASC LIMIT 1) as first_message
        FROM conversations c
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `, [userId, limit]);

      return conversations.map(conv => ({
        sessionId: conv.session_id,
        language: conv.language,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        preview: conv.first_message ? conv.first_message.substring(0, 100) : ''
      }));
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw new Error('Failed to retrieve user conversations');
    }
  }

  /**
   * Delete a conversation and all its messages
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async deleteConversation(sessionId, userId) {
    try {
      const conversation = await this.getConversation(sessionId);
      
      if (!conversation) {
        return false;
      }

      // Verify ownership
      if (conversation.userId !== userId) {
        throw new Error('Unauthorized to delete this conversation');
      }

      // Delete messages first (foreign key constraint)
      await db.run(`
        DELETE FROM messages WHERE conversation_id = ?
      `, [conversation.id]);

      // Delete conversation
      await db.run(`
        DELETE FROM conversations WHERE id = ?
      `, [conversation.id]);

      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }
}

module.exports = new ConversationService();
