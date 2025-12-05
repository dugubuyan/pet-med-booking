// Authentication Service with Backend API Integration
import apiService from './apiService';

const TOKEN_KEY = 'pet_app_token';
const CURRENT_USER_KEY = 'pet_app_current_user';

export const authService = {
  // Register new user
  register: async (userData) => {
    try {
      const response = await apiService.register(userData);
      
      // Store token and user data
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(response.user));
      
      return response.user;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await apiService.login(email, password);
      
      // Store token and user data
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(response.user));
      
      return response.user;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  // Get current logged-in user
  getCurrentUser: () => {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Get JWT token
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return !!(token && user);
  },

  // Get fresh profile from backend
  getProfile: async () => {
    try {
      const user = await apiService.getProfile();
      
      // Update local storage
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      
      return user;
    } catch (error) {
      throw new Error(error.message || 'Failed to get profile');
    }
  },

  // Update user profile
  updateProfile: async (updates) => {
    try {
      const updatedUser = await apiService.updateProfile(updates);
      
      // Update local storage
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      throw new Error(error.message || 'Profile update failed');
    }
  },

  // Add pet to user profile
  addPet: async (petData) => {
    try {
      const newPet = await apiService.addPet(petData);
      
      // Update current user with new pet
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        currentUser.pets = [...(currentUser.pets || []), newPet];
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      }
      
      return currentUser;
    } catch (error) {
      throw new Error(error.message || 'Failed to add pet');
    }
  },

  // Update pet in user profile
  updatePet: async (petId, petData) => {
    try {
      const updatedPet = await apiService.updatePet(petId, petData);
      
      // Update current user's pet list
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        currentUser.pets = currentUser.pets.map(pet =>
          pet.id === petId ? updatedPet : pet
        );
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      }
      
      return currentUser;
    } catch (error) {
      throw new Error(error.message || 'Failed to update pet');
    }
  },

  // Delete pet from user profile
  deletePet: async (petId) => {
    try {
      await apiService.deletePet(petId);
      
      // Update current user's pet list
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        currentUser.pets = currentUser.pets.filter(pet => pet.id !== petId);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      }
      
      return currentUser;
    } catch (error) {
      throw new Error(error.message || 'Failed to delete pet');
    }
  }
};
