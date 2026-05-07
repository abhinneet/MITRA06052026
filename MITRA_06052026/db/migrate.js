/**
 * db/migrate.js — Run all schema migrations in order
 * Usage: node db/migrate.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const SQL_FILES = [
  'schema.sql',
  'schema_quiz.sql',
  'schema_v4.sql',
  // FIX: v4.1 migration was never included — tenant_app_files + notification_log tables
  path.join('migrations', 'v4.1_notifications_compliance.sql')
];

async function runMigrations() {
  const client = await pool.connect();
  console.log('🔌 Connected:', process.env.DB_NAME || 'mitra_dashboard');
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY, filename VARCHAR(200) UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    for (const file of SQL_FILES) {
      const fp = path.join(__dirname, file);
      if (!fs.existsSync(fp)) { console.log(`⚠️  Skipping ${file} (not found)`); continue; }
      const migKey = path.basename(file);
      const check = await client.query('SELECT id FROM _migrations WHERE filename=$1', [migKey]);
      if (check.rows.length) { console.log(`✅ Already applied: ${file}`); continue; }
      console.log(`⏳ Running: ${file}`);
      await client.query(fs.readFileSync(fp, 'utf8'));
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [migKey]);
      console.log(`✅ Applied: ${file}`);
    }

    const seedCheck = await client.query('SELECT COUNT(*) FROM india_states');
    if (parseInt(seedCheck.rows[0].count) === 0) {
      console.log('🌍 Seeding India locations...');
      try { require('./seed_india_locations'); } catch(e) { console.warn('⚠️  Seed manually: node db/seed_india_locations.js'); }
    } else {
      console.log(`✅ India states: ${seedCheck.rows[0].count} records exist`);
    }
    console.log('\n🎉 All migrations complete!\n');
  } catch (err) {
    console.error('❌ Migration error:', err.message); process.exit(1);
  } finally { client.release(); await pool.end(); }
}
runMigrations();

async function seedAdmin() {
  const adminEmail = 'admin@mitra.com';
  const adminPassword = 'Ah4361!@'; // Change this to your preferred password

try {
    // 1. Ensure the users table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add the missing is_active column!
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    // 3. Check if the admin already exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    

    if (userCheck.rows.length === 0) {
      // 3. Insert the admin user
      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        [adminEmail, adminPassword, 'admin']
      );
      console.log('✅ Admin user created successfully: ' + adminEmail);
    } else {
      console.log('ℹ️ Admin user already exists.');
    }
  } catch (err) {
    console.error('❌ Error seeding admin user:', err.message);
  }
}

// Trigger the function
seedAdmin();
