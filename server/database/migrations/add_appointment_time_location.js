const db = require('../dbInstance');

/**
 * Migration: Add appointment_date, appointment_time, and location to appointments table
 */
async function migrate() {
  try {
    console.log('Running migration: add_appointment_time_location');
    
    // Check if columns already exist
    const tableInfo = await db.all("PRAGMA table_info(appointments)");
    const columnNames = tableInfo.map(col => col.name);
    
    if (!columnNames.includes('appointment_date')) {
      await db.run('ALTER TABLE appointments ADD COLUMN appointment_date TEXT');
      console.log('✓ Added appointment_date column');
    }
    
    if (!columnNames.includes('appointment_time')) {
      await db.run('ALTER TABLE appointments ADD COLUMN appointment_time TEXT');
      console.log('✓ Added appointment_time column');
    }
    
    if (!columnNames.includes('location')) {
      await db.run('ALTER TABLE appointments ADD COLUMN location TEXT');
      console.log('✓ Added location column');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrate;
