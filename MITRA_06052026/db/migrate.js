const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function ultimateFix() {
  try {
    console.log('⚡ Forging Final Admin Record and Logbooks...');
    
    // 1. Add dependencies
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await pool.query(`
      DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'editor', 'viewer');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Build the users table EXACTLY like their blueprint
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name       VARCHAR(150) NOT NULL,
        email           VARCHAR(255) UNIQUE NOT NULL,
        password_hash   VARCHAR(255) NOT NULL,
        role            user_role NOT NULL DEFAULT 'viewer',
        assigned_state  VARCHAR(100) DEFAULT 'All India',
        assigned_district VARCHAR(100),
        is_active       BOOLEAN DEFAULT TRUE,
        perm_publish_apps    BOOLEAN DEFAULT FALSE,
        perm_upload_unity    BOOLEAN DEFAULT FALSE,
        perm_manage_geo      BOOLEAN DEFAULT FALSE,
        perm_view_analytics  BOOLEAN DEFAULT FALSE,
        perm_create_users    BOOLEAN DEFAULT FALSE,
        perm_edit_curriculum BOOLEAN DEFAULT FALSE,
        perm_approve_content BOOLEAN DEFAULT FALSE,
        perm_export_data     BOOLEAN DEFAULT FALSE,
        perm_manage_ads      BOOLEAN DEFAULT FALSE,
        perm_replay_analytics BOOLEAN DEFAULT FALSE,
        perm_view_dashboard    BOOLEAN DEFAULT FALSE,
        perm_view_curriculum   BOOLEAN DEFAULT FALSE,
        perm_view_controls     BOOLEAN DEFAULT FALSE,
        perm_view_ar_assets    BOOLEAN DEFAULT FALSE,
        perm_view_notif        BOOLEAN DEFAULT FALSE,
        perm_view_users        BOOLEAN DEFAULT FALSE,
        perm_view_legal        BOOLEAN DEFAULT FALSE,
        perm_view_settings     BOOLEAN DEFAULT FALSE,
        perm_delete_users      BOOLEAN DEFAULT FALSE,
        perm_manage_compliance BOOLEAN DEFAULT FALSE,
        perm_view_app_builder  BOOLEAN DEFAULT FALSE,
        last_login_at   TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Build the refresh_tokens table EXACTLY like the blueprint you found
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        token_hash  VARCHAR(255) UNIQUE NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Securely Inject the Admin (Using ON CONFLICT so it never duplicates)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await pool.query(`
      INSERT INTO users (
        full_name, email, password_hash, role, is_active,
        perm_view_dashboard, perm_view_users, perm_view_settings, perm_view_ar_assets, perm_view_curriculum
      ) 
      VALUES (
        'MITRA System Admin', 'admin@mitra.com', $1, 'admin', true,
        true, true, true, true, true
      )
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        is_active = true;
    `, [hashedPassword]);
    
    console.log('✅ Blueprint matched perfectly. Logbooks built. Admin forged.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

ultimateFix();
