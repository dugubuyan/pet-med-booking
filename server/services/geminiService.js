const axios = require('axios');

/**
 * Gemini AI Service
 * Handles all interactions with Google's Gemini 2.0 Flash API
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    this.maxRetries = process.env.GEMINI_MAX_RETRIES !== undefined 
      ? parseInt(process.env.GEMINI_MAX_RETRIES) 
      : 2;
    this.retryDelay = 1000; // Initial delay in ms
    
    // Validate API key on initialization
    if (!this.apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables');
    }
    
    console.log(`🤖 Gemini Service initialized with model: ${this.model}, max retries: ${this.maxRetries}`);
  }

  /**
   * Validate API key format
   * @returns {boolean} True if API key is valid
   */
  validateApiKey() {
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      return false;
    }
    return this.apiKey.length > 20; // Basic validation
  }

  /**
   * Format conversation history for Gemini API
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Array} Formatted contents array for Gemini
   */
  formatConversationHistory(messages) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  /**
   * Send message to Gemini API with retry logic
   * @param {Array} conversationHistory - Full conversation history
   * @param {Object} options - Additional options (temperature, tools, etc.)
   * @returns {Promise<string|Object>} AI response text or function call
   */
  async sendMessage(conversationHistory, options = {}) {
    if (!this.validateApiKey()) {
      throw new Error('Invalid or missing Gemini API key. Please configure GEMINI_API_KEY in .env file');
    }

    const formattedHistory = this.formatConversationHistory(conversationHistory);
    
    const requestBody = {
      contents: formattedHistory,
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxOutputTokens || 2048  // Increased from 1024 to prevent truncation
      }
    };

    // Add function calling tools if provided
    if (options.tools) {
      requestBody.tools = options.tools;
    }

    return this.sendRequestWithRetry(requestBody);
  }

  /**
   * Send request with exponential backoff retry logic
   * @param {Object} requestBody - Request payload
   * @param {number} attempt - Current attempt number
   * @returns {Promise<string>} AI response text
   */
  async sendRequestWithRetry(requestBody, attempt = 1) {
    const startTime = Date.now();
    
    try {
      // Log what we're sending to LLM
      console.log('\n========== LLM REQUEST ==========');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Attempt:', `${attempt}/${this.maxRetries}`);
      console.log('Model:', this.model);
      console.log('\n--- Request Body ---');
      console.log(JSON.stringify(requestBody, null, 2));
      console.log('\n--- Conversation Contents ---');
      requestBody.contents.forEach((msg, idx) => {
        console.log(`\n[${idx}] Role: ${msg.role}`);
        console.log(`Content: ${msg.parts[0].text.substring(0, 200)}${msg.parts[0].text.length > 200 ? '...' : ''}`);
      });
      console.log('\n--- Generation Config ---');
      console.log(JSON.stringify(requestBody.generationConfig, null, 2));
      console.log('================================\n');

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      const duration = Date.now() - startTime;

      // Log what we received from LLM
      console.log('\n========== LLM RESPONSE ==========');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Duration:', `${duration}ms`);
      console.log('Status:', response.status);
      console.log('\n--- Full Response Data ---');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Check if response contains a function call
      const candidate = response.data?.candidates?.[0];
      const parts = candidate?.content?.parts;
      
      if (parts && parts[0]?.functionCall) {
        const functionCall = parts[0].functionCall;
        console.log('\n--- Function Call Detected ---');
        console.log('Function Name:', functionCall.name);
        console.log('Arguments:', JSON.stringify(functionCall.args, null, 2));
        console.log('==================================\n');
        
        return {
          type: 'function_call',
          functionCall: functionCall
        };
      }
      
      // Extract response text from Gemini API response
      if (parts && parts[0]?.text) {
        const responseText = parts[0].text;
        console.log('\n--- Extracted Response Text ---');
        console.log(responseText);
        console.log('\n--- Response Metadata ---');
        console.log('Finish Reason:', candidate.finishReason);
        console.log('Safety Ratings:', JSON.stringify(candidate.safetyRatings, null, 2));
        if (response.data.usageMetadata) {
          console.log('Usage Metadata:', JSON.stringify(response.data.usageMetadata, null, 2));
        }
        console.log('==================================\n');
        
        return responseText;
      } else {
        console.error('\n--- INVALID RESPONSE FORMAT ---');
        console.error('Response structure:', JSON.stringify(response.data, null, 2));
        console.error('================================\n');
        throw new Error('Invalid response format from Gemini API');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error details
      console.error('\n========== LLM ERROR ==========');
      console.error('Timestamp:', new Date().toISOString());
      console.error('Duration:', `${duration}ms`);
      console.error('Attempt:', `${attempt}/${this.maxRetries}`);
      console.error('Error Message:', error.message);
      console.error('Error Code:', error.code);
      console.error('Status:', error.response?.status);
      console.error('\n--- Error Response Data ---');
      console.error(JSON.stringify(error.response?.data, null, 2));
      console.error('===============================\n');

      // Check if we should retry
      if (attempt < this.maxRetries && this.shouldRetry(error)) {
        // Use longer delay for rate limit errors (429)
        const isRateLimit = error.response?.status === 429;
        const baseDelay = isRateLimit ? 5000 : this.retryDelay; // 5 seconds for rate limits
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⚠️  ${isRateLimit ? 'Rate limit hit.' : ''} Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.sendRequestWithRetry(requestBody, attempt + 1);
      }

      // Transform error for better client handling
      throw this.transformError(error);
    }
  }

  /**
   * Determine if error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} True if should retry
   */
  shouldRetry(error) {
    // Retry on network errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on specific HTTP status codes
    const status = error.response?.status;
    if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
      return true;
    }

    return false;
  }

  /**
   * Transform error into user-friendly format
   * @param {Error} error - Original error
   * @returns {Error} Transformed error
   */
  transformError(error) {
    const status = error.response?.status;
    
    if (status === 400) {
      return new Error('Invalid request to AI service. Please try again.');
    } else if (status === 401 || status === 403) {
      return new Error('AI service authentication failed. Please check API key configuration.');
    } else if (status === 429) {
      return new Error('AI service rate limit exceeded. Please try again in a moment.');
    } else if (status >= 500) {
      return new Error('AI service is temporarily unavailable. Please try again later.');
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new Error('AI service request timed out. Please try again.');
    } else {
      return new Error('Failed to communicate with AI service. Please try again.');
    }
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new GeminiService();
