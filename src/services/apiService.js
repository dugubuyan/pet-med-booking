// API Service for backend communication
// Use empty string in development to use Vite proxy, or explicit URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiService {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  async request(endpoint, options = {}, retries = 2) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json'
      }
    };

    console.log('apiService.request - URL:', url);
    console.log('apiService.request - config:', config);
    console.log('apiService.request - headers:', config.headers);
    console.log('apiService.request - body:', config.body);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Backend server is not responding correctly. Please check if the server is running.');
        }
        
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
      } catch (error) {
        console.error(`API request failed (attempt ${attempt + 1}/${retries + 1}): ${endpoint}`, error);
        
        // If this is the last attempt or it's not a network error, throw
        if (attempt === retries || error.message.includes('backend')) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  /**
   * Get authorization header with JWT token
   */
  getAuthHeader() {
    const token = localStorage.getItem('pet_app_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // ============ Authentication Endpoints ============

  /**
   * Register new user
   */
  async register(userData) {
    return await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * Login user
   */
  async login(email, password) {
    return await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  // ============ User Endpoints ============

  /**
   * Get user profile
   */
  async getProfile() {
    return await this.request('/api/users/profile', {
      method: 'GET',
      headers: this.getAuthHeader()
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    return await this.request('/api/users/profile', {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(updates)
    });
  }

  // ============ Pet Endpoints ============

  /**
   * Add new pet
   */
  async addPet(petData) {
    return await this.request('/api/pets', {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(petData)
    });
  }

  /**
   * Update pet
   */
  async updatePet(petId, petData) {
    return await this.request(`/api/pets/${petId}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(petData)
    });
  }

  /**
   * Delete pet
   */
  async deletePet(petId) {
    return await this.request(`/api/pets/${petId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader()
    });
  }

  // ============ Chat Endpoints ============

  /**
   * Create a new chat session
   */
  async createChatSession(language = 'en') {
    return await this.request('/api/chat/session', {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ language })
    }, 0); // 0 retries - simple database operation
  }

  /**
   * Send chat message
   * Note: No client-side retries - backend handles retry logic for AI requests
   */
  async sendChatMessage(message, sessionId, userContext, language) {
    const payload = {
      message,
      sessionId,
      userContext,
      language
    };
    console.log('apiService.sendChatMessage - payload:', payload);
    console.log('apiService.sendChatMessage - stringified:', JSON.stringify(payload));
    
    return await this.request('/api/chat', {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(payload)
    }, 0); // 0 retries - backend handles this
  }

  /**
   * Get conversation history
   */
  async getConversation(sessionId) {
    return await this.request(`/api/conversations/${sessionId}`, {
      method: 'GET',
      headers: this.getAuthHeader()
    });
  }

  // ============ Appointment Endpoints ============

  /**
   * Extract appointment data from conversation
   */
  async extractAppointmentData(sessionId) {
    return await this.request('/api/appointments/extract', {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ sessionId })
    });
  }

  /**
   * Create appointment
   */
  async createAppointment(sessionId, appointmentData) {
    return await this.request('/api/appointments', {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({
        sessionId,
        appointmentData
      })
    });
  }

  /**
   * Get appointment by booking ID
   */
  async getAppointment(bookingId) {
    return await this.request(`/api/appointments/${bookingId}`, {
      method: 'GET',
      headers: this.getAuthHeader()
    });
  }

  // ============ Health Check ============

  /**
   * Check backend health
   */
  async healthCheck() {
    try {
      const response = await this.request('/api/health');
      return response.status === 'ok';
    } catch (error) {
      return false;
    }
  }
}

const apiService = new ApiService();
export default apiService;
