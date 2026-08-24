require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./db');
const { ensureDatabaseInitialized } = require('./db/autoMigrate');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await testConnection();
    await ensureDatabaseInitialized();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup aborted due to database connection error:', error.message);
    process.exit(1);
  }
};

startServer();
