const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { SYSTEM_ROLES } = require('../utils/constants');

async function runSQLFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await query(sql);
}

async function runDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    await runSQLFile(path.join(dirPath, file));
  }
}

async function ensureDatabaseInitialized() {
  try {
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);

    if (!checkTable.rows[0].exists) {
      console.log('⚡ Initializing database schema (auto-running migrations and seeds)...');
      
      const dbDir = path.join(__dirname, '../../database');
      await runDirectory(path.join(dbDir, 'migrations'));
      await runDirectory(path.join(dbDir, 'seeds'));

      const passwordHash = await bcrypt.hash('password123', 10);
      for (const role of SYSTEM_ROLES) {
        const name = `Test ${role.replace('_', ' ').toLowerCase()}`;
        const email = `test_${role.toLowerCase()}@example.com`;
        
        await query(
          `INSERT INTO users (name, email, password_hash, role, district_id, village_id) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (email) DO NOTHING`,
          [
            name, 
            email, 
            passwordHash, 
            role, 
            role === 'ADMIN' ? null : 1, 
            role === 'VILLAGE_HEAD' ? 1 : null
          ]
        );
      }
      console.log('✅ Database initialization and test seed complete.');
    }

    const checkTokensTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'registration_tokens'
      )
    `);

    if (!checkTokensTable.rows[0].exists) {
      console.log('⚡ Creating registration_tokens table...');
      await query(`
        CREATE TABLE IF NOT EXISTS registration_tokens (
          id SERIAL PRIMARY KEY,
          token VARCHAR(255) NOT NULL UNIQUE,
          role VARCHAR(50) NOT NULL CHECK (role IN ('VILLAGE_HEAD', 'AUDITOR', 'GOVERNMENT_EMPLOYEE', 'ADMIN')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          is_used BOOLEAN DEFAULT FALSE NOT NULL,
          used_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      console.log('✅ registration_tokens table created successfully.');
    }
  } catch (error) {
    console.warn('⚠️ Auto-migration check warning:', error.message);
  }
}

module.exports = {
  ensureDatabaseInitialized
};
