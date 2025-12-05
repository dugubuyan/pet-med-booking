// User Service - handles user profile operations

/**
 * Get user profile by ID
 */
async function getUserById(userId, db) {
  try {
    const user = await db.get(`
      SELECT id, email, full_name, phone, created_at, updated_at
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!user) {
      throw new Error('User not found');
    }

    // Get user's pets
    const pets = await db.all(`
      SELECT id, name, type, age, breed, weight, created_at
      FROM pets
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      pets: pets || [],
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
async function updateProfile(userId, updates, db) {
  try {
    const { fullName, phone } = updates;

    // Validate input
    if (!fullName || !phone) {
      throw new Error('Full name and phone are required');
    }

    // Validate phone format
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      throw new Error('Invalid phone number format');
    }

    // Update user
    const result = await db.run(`
      UPDATE users
      SET full_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [fullName, phone, userId]);

    if (result.changes === 0) {
      throw new Error('User not found');
    }

    // Return updated user profile
    return await getUserById(userId, db);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

module.exports = {
  getUserById,
  updateProfile
};
