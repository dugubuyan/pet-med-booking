const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 6 characters
 */
function validatePassword(password) {
  return password && password.length >= 6;
}

/**
 * Generate JWT token
 */
function generateToken(userId) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign({ userId }, secret, { expiresIn });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Register new user
 */
async function register(userData, db) {
  const { email, password, fullName, phone } = userData;
  
  // Validate input
  if (!email || !password || !fullName || !phone) {
    throw new Error('All fields are required');
  }
  
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  if (!validatePassword(password)) {
    throw new Error('Password must be at least 6 characters');
  }
  
  // Check if user already exists
  const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    throw new Error('Email already registered');
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Generate user ID
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Insert user into database
  await db.run(
    'INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (?, ?, ?, ?, ?)',
    [userId, email, passwordHash, fullName, phone]
  );
  
  // Generate JWT token
  const token = generateToken(userId);
  
  // Return user data (without password hash)
  return {
    user: {
      id: userId,
      email,
      fullName,
      phone,
      pets: []
    },
    token
  };
}

/**
 * Login user
 */
async function login(email, password, db) {
  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  // Find user by email
  const user = await db.get(
    'SELECT id, email, password_hash, full_name, phone FROM users WHERE email = ?',
    [email]
  );
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Verify password
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }
  
  // Get user's pets
  const pets = await db.all(
    'SELECT id, name, type, age, breed, weight FROM pets WHERE user_id = ?',
    [user.id]
  );
  
  // Generate JWT token
  const token = generateToken(user.id);
  
  // Return user data (without password hash)
  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      pets: pets || []
    },
    token
  };
}

/**
 * Get user by ID
 */
async function getUserById(userId, db) {
  const user = await db.get(
    'SELECT id, email, full_name, phone, created_at FROM users WHERE id = ?',
    [userId]
  );
  
  if (!user) {
    return null;
  }
  
  // Get user's pets
  const pets = await db.all(
    'SELECT id, name, type, age, breed, weight FROM pets WHERE user_id = ?',
    [userId]
  );
  
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    pets: pets || [],
    createdAt: user.created_at
  };
}

module.exports = {
  register,
  login,
  getUserById,
  generateToken,
  verifyToken,
  validateEmail,
  validatePassword
};
