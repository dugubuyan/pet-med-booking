// Pet Service - handles pet CRUD operations
const { v4: uuidv4 } = require('uuid');

/**
 * Get all pets for a user
 */
async function getUserPets(userId, db) {
  try {
    const pets = await db.all(`
      SELECT id, name, type, age, breed, weight, created_at
      FROM pets
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    return pets || [];
  } catch (error) {
    console.error('Error getting user pets:', error);
    throw error;
  }
}

/**
 * Get a specific pet by ID
 */
async function getPetById(petId, userId, db) {
  try {
    const pet = await db.get(`
      SELECT id, name, type, age, breed, weight, created_at
      FROM pets
      WHERE id = ? AND user_id = ?
    `, [petId, userId]);

    if (!pet) {
      throw new Error('Pet not found');
    }

    return pet;
  } catch (error) {
    console.error('Error getting pet by ID:', error);
    throw error;
  }
}

/**
 * Create a new pet
 */
async function createPet(userId, petData, db) {
  try {
    const { name, type, age, breed, weight } = petData;

    // Validate required fields
    if (!name || !type || !age) {
      throw new Error('Pet name, type, and age are required');
    }

    // Generate unique ID
    const petId = uuidv4();

    // Insert pet
    await db.run(`
      INSERT INTO pets (id, user_id, name, type, age, breed, weight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [petId, userId, name, type, age, breed || null, weight || null]);

    // Return created pet
    return await getPetById(petId, userId, db);
  } catch (error) {
    console.error('Error creating pet:', error);
    throw error;
  }
}

/**
 * Update a pet
 */
async function updatePet(petId, userId, petData, db) {
  try {
    const { name, type, age, breed, weight } = petData;

    // Validate required fields
    if (!name || !type || !age) {
      throw new Error('Pet name, type, and age are required');
    }

    // Check if pet exists and belongs to user
    const existingPet = await getPetById(petId, userId, db);
    if (!existingPet) {
      throw new Error('Pet not found or does not belong to user');
    }

    // Update pet
    const result = await db.run(`
      UPDATE pets
      SET name = ?, type = ?, age = ?, breed = ?, weight = ?
      WHERE id = ? AND user_id = ?
    `, [name, type, age, breed || null, weight || null, petId, userId]);

    if (result.changes === 0) {
      throw new Error('Pet not found or does not belong to user');
    }

    // Return updated pet
    return await getPetById(petId, userId, db);
  } catch (error) {
    console.error('Error updating pet:', error);
    throw error;
  }
}

/**
 * Delete a pet
 */
async function deletePet(petId, userId, db) {
  try {
    // Check if pet exists and belongs to user
    const existingPet = await getPetById(petId, userId, db);
    if (!existingPet) {
      throw new Error('Pet not found or does not belong to user');
    }

    // Delete pet
    const result = await db.run(`
      DELETE FROM pets
      WHERE id = ? AND user_id = ?
    `, [petId, userId]);

    if (result.changes === 0) {
      throw new Error('Pet not found or does not belong to user');
    }

    return { success: true, message: 'Pet deleted successfully' };
  } catch (error) {
    console.error('Error deleting pet:', error);
    throw error;
  }
}

module.exports = {
  getUserPets,
  getPetById,
  createPet,
  updatePet,
  deletePet
};
