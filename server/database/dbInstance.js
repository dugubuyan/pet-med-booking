const Database = require('./db');

// Create singleton database instance
const dbPath = process.env.DATABASE_PATH || './database/petcare.db';
const dbInstance = new Database(dbPath);

// Initialize database immediately
let initPromise = null;
const ensureInitialized = () => {
  if (!initPromise) {
    initPromise = dbInstance.initialize();
  }
  return initPromise;
};

// Start initialization
ensureInitialized();

// Export both the instance and initialization promise
module.exports = dbInstance;
module.exports.ensureInitialized = ensureInitialized;
