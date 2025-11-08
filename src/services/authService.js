// Mock Authentication Service
// In production, this would connect to a real backend API

const USERS_KEY = 'pet_app_users';
const CURRENT_USER_KEY = 'pet_app_current_user';

// Mock user database
const initializeMockUsers = () => {
  const users = localStorage.getItem(USERS_KEY);
  if (!users) {
    // Create some demo users for testing
    const demoUsers = [
      {
        id: '1',
        email: 'demo@petcare.com',
        password: 'demo123', // In production, this would be hashed
        fullName: 'John Smith',
        phone: '+1-555-0123',
        pets: [
          {
            id: 'pet1',
            name: 'Max',
            type: 'Dog',
            breed: 'Golden Retriever',
            age: '3 years',
            weight: '30 kg'
          }
        ],
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
  }
};

// Initialize on load
initializeMockUsers();

export const authService = {
  // Register new user
  register: (userData) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    // Check if email already exists
    if (users.find(u => u.email === userData.email)) {
      throw new Error('Email already registered');
    }

    const newUser = {
      id: Date.now().toString(),
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      phone: userData.phone,
      pets: [],
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Auto login after registration
    const { password, ...userWithoutPassword } = newUser;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));

    return userWithoutPassword;
  },

  // Login user
  login: (email, password) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Store current user (without password)
    const { password: _, ...userWithoutPassword } = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));

    return userWithoutPassword;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  // Get current logged-in user
  getCurrentUser: () => {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem(CURRENT_USER_KEY);
  },

  // Update user profile
  updateProfile: (updates) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Update user data
    users[userIndex] = { ...users[userIndex], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Update current user
    const { password, ...userWithoutPassword } = users[userIndex];
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));

    return userWithoutPassword;
  },

  // Add pet to user profile
  addPet: (petData) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const newPet = {
      id: Date.now().toString(),
      ...petData,
      createdAt: new Date().toISOString()
    };

    const updatedPets = [...(currentUser.pets || []), newPet];
    return authService.updateProfile({ pets: updatedPets });
  },

  // Update pet in user profile
  updatePet: (petId, petData) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const updatedPets = currentUser.pets.map(pet =>
      pet.id === petId ? { ...pet, ...petData } : pet
    );

    return authService.updateProfile({ pets: updatedPets });
  },

  // Delete pet from user profile
  deletePet: (petId) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const updatedPets = currentUser.pets.filter(pet => pet.id !== petId);
    return authService.updateProfile({ pets: updatedPets });
  }
};
