const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function ultimateBoot() {
  try {
    console.log('⚡ Booting full MITRA Architecture...');
    
    // 1. Read and execute the entire schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);

    // ---------------------------------------------------------
    // ⚡ MISSING TABLES INJECTED HERE ⚡
    // ---------------------------------------------------------
    
    // 2a. Create Curriculum Topics Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS curriculum_topics (
            id SERIAL PRIMARY KEY,
            topic_name VARCHAR(255) NOT NULL,
            standard VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2b. Create Push Notifications / Ads Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS push_notifications (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            topic VARCHAR(255),
            status VARCHAR(50) DEFAULT 'sent',
            target_state VARCHAR(100),
            impressions INT DEFAULT 0,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    // ---------------------------------------------------------
      
    console.log('✅ All database tables (including Quizzes, Curriculum, & Ads) perfectly built.');

    // 3. Securely Inject the Master Admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await pool.query(`
      INSERT INTO users (
        full_name, email, password_hash, role, is_active,
        perm_view_dashboard, perm_view_users, perm_view_settings, perm_view_ar_assets, perm_view_curriculum, perm_upload_unity
      ) 
      VALUES (
        'MITRA System Admin', 'admin@mitra.com', $1, 'master_admin', true,
        true, true, true, true, true, true
      )
      ON CONFLICT (email) DO UPDATE SET 
        role = 'master_admin',
        perm_view_ar_assets = true,
        perm_upload_unity = true,
        is_active = true;
    `, [hashedPassword]);
    
    console.log('✅ Master Admin clearance granted. AR Assets Unlocked.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

ultimateBoot();
