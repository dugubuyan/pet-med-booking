const db = require('../database/dbInstance');

/**
 * Appointment Service
 * Manages appointment creation and storage
 */
class AppointmentService {
  /**
   * Generate unique booking ID
   * @returns {string} Booking ID in format PET-XXXXXX
   */
  generateBookingId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `PET-${timestamp}${random}`;
  }

  /**
   * Generate demo appointment details for missing fields
   * @param {Object} data - Appointment data
   * @returns {Object} Data with demo values filled in
   */
  fillDemoData(data) {
    const result = { ...data };
    
    // Fill in appointment date if missing (tomorrow)
    if (!result.appointmentDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.appointmentDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    
    // Fill in appointment time if missing (random morning slot)
    if (!result.appointmentTime) {
      const times = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'];
      result.appointmentTime = times[Math.floor(Math.random() * times.length)];
    }
    
    // Fill in location if missing (random clinic)
    if (!result.location) {
      const locations = [
        'Downtown Veterinary Clinic, 123 Main Street',
        'Northside Animal Hospital, 456 North Avenue',
        'West End Pet Care, 789 West Boulevard'
      ];
      result.location = locations[Math.floor(Math.random() * locations.length)];
    }
    
    return result;
  }

  /**
   * Create appointment from conversation data
   * @param {Object} appointmentData - Appointment information
   * @param {number|null} conversationId - Associated conversation ID (optional)
   * @param {boolean} isGuest - Whether user is a guest
   * @returns {Promise<Object>} Created appointment with booking ID
   */
  async createAppointment(appointmentData, conversationId = null, isGuest = true) {
    // Fill in demo data for missing fields
    const completeData = this.fillDemoData(appointmentData);
    
    const {
      ownerName,
      phone,
      email,
      petName,
      petType,
      petAge,
      petBreed,
      petWeight,
      symptoms,
      appointmentDate,
      appointmentTime,
      location
    } = completeData;

    // Validate required fields
    if (!ownerName || !phone || !email || !petName || !petType) {
      throw new Error('Missing required appointment information');
    }

    const bookingId = this.generateBookingId();

    try {
      const result = await db.run(`
        INSERT INTO appointments (
          booking_id, conversation_id, owner_name, phone, email,
          pet_name, pet_type, pet_age, pet_breed, pet_weight,
          symptoms, appointment_date, appointment_time, location, is_guest
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        bookingId,
        conversationId,
        ownerName,
        phone,
        email,
        petName,
        petType,
        petAge || null,
        petBreed || null,
        petWeight || null,
        symptoms || null,
        appointmentDate || null,
        appointmentTime || null,
        location || null,
        isGuest ? 1 : 0
      ]);

      return {
        id: result.lastID,
        bookingId,
        ownerName,
        phone,
        email,
        petName,
        petType,
        petAge,
        petBreed,
        petWeight,
        symptoms,
        appointmentDate,
        appointmentTime,
        location,
        isGuest,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw new Error('Failed to create appointment');
    }
  }

  /**
   * Get appointment by booking ID
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object|null>} Appointment object or null
   */
  async getAppointment(bookingId) {
    try {
      const appointment = await db.get(`
        SELECT * FROM appointments WHERE booking_id = ?
      `, [bookingId]);

      if (!appointment) {
        return null;
      }

      return {
        id: appointment.id,
        bookingId: appointment.booking_id,
        conversationId: appointment.conversation_id,
        ownerName: appointment.owner_name,
        phone: appointment.phone,
        email: appointment.email,
        petName: appointment.pet_name,
        petType: appointment.pet_type,
        petAge: appointment.pet_age,
        petBreed: appointment.pet_breed,
        petWeight: appointment.pet_weight,
        symptoms: appointment.symptoms,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        location: appointment.location,
        isGuest: appointment.is_guest === 1,
        createdAt: appointment.created_at
      };
    } catch (error) {
      console.error('Error getting appointment:', error);
      throw new Error('Failed to retrieve appointment');
    }
  }

  /**
   * Get all appointments for a conversation
   * @param {number} conversationId - Conversation database ID
   * @returns {Promise<Array>} Array of appointments
   */
  async getAppointmentsByConversation(conversationId) {
    try {
      const appointments = await db.all(`
        SELECT * FROM appointments 
        WHERE conversation_id = ?
        ORDER BY created_at DESC
      `, [conversationId]);

      return appointments.map(apt => ({
        id: apt.id,
        bookingId: apt.booking_id,
        ownerName: apt.owner_name,
        phone: apt.phone,
        email: apt.email,
        petName: apt.pet_name,
        petType: apt.pet_type,
        petAge: apt.pet_age,
        petBreed: apt.pet_breed,
        petWeight: apt.pet_weight,
        symptoms: apt.symptoms,
        appointmentDate: apt.appointment_date,
        appointmentTime: apt.appointment_time,
        location: apt.location,
        isGuest: apt.is_guest === 1,
        createdAt: apt.created_at
      }));
    } catch (error) {
      console.error('Error getting appointments by conversation:', error);
      throw new Error('Failed to retrieve appointments');
    }
  }

  /**
   * Validate appointment data completeness
   * @param {Object} data - Appointment data to validate
   * @returns {Object} Validation result with missing fields
   */
  validateAppointmentData(data) {
    const required = {
      ownerName: 'Owner name',
      phone: 'Phone number',
      email: 'Email address',
      petName: 'Pet name',
      petType: 'Pet type'
    };

    const missing = [];
    
    for (const [field, label] of Object.entries(required)) {
      if (!data[field] || data[field].trim() === '') {
        missing.push(label);
      }
    }

    // Validate email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      missing.push('Valid email address');
    }

    // Validate phone format (basic check)
    if (data.phone && !/^[\d\s\-\(\)\+]+$/.test(data.phone)) {
      missing.push('Valid phone number');
    }

    return {
      isValid: missing.length === 0,
      missingFields: missing
    };
  }

  /**
   * Get available clinic locations (demo data)
   * @returns {Array} List of clinic locations
   */
  getAvailableLocations() {
    return [
      {
        id: 'downtown',
        name: 'Downtown Veterinary Clinic',
        address: '123 Main Street, City Center',
        phone: '+1-555-0100'
      },
      {
        id: 'northside',
        name: 'Northside Animal Hospital',
        address: '456 North Avenue, Northside',
        phone: '+1-555-0200'
      },
      {
        id: 'westend',
        name: 'West End Pet Care',
        address: '789 West Boulevard, West End',
        phone: '+1-555-0300'
      }
    ];
  }

  /**
   * Get available appointment time slots for a given date (demo data)
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array} List of available time slots
   */
  getAvailableTimeSlots(date) {
    // For demo purposes, return fixed time slots
    // In production, this would check actual availability
    return [
      '09:00 AM',
      '10:00 AM',
      '11:00 AM',
      '02:00 PM',
      '03:00 PM',
      '04:00 PM'
    ];
  }
}

module.exports = new AppointmentService();
