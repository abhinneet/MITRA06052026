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
    // ⚡ MISSING TABLES & COLUMNS INJECTED HERE ⚡
    // ---------------------------------------------------------
    
    // 1. Create Curriculum Topics Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS curriculum_topics (
            id SERIAL PRIMARY KEY,
            topic_name VARCHAR(255) NOT NULL,
            standard VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Create Push Notifications / Ads Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS push_notifications (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'sent',
            target_state VARCHAR(100),
            impressions INT DEFAULT 0,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. FORCE-PATCH push_notifications (Executed one by one to guarantee they apply)
    await pool.query(`ALTER TABLE push_notifications ADD COLUMN IF NOT EXISTS topic VARCHAR(255);`);
    await pool.query(`ALTER TABLE push_notifications ADD COLUMN IF NOT EXISTS subject VARCHAR(255);`);
    await pool.query(`ALTER TABLE push_notifications ADD COLUMN IF NOT EXISTS class_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE push_notifications DROP COLUMN IF EXISTS sent_by;`);
    await pool.query(`ALTER TABLE push_notifications ADD COLUMN IF NOT EXISTS sent_by UUID;`);

    // 4. Create Notification Analytics Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_analytics (
            id SERIAL PRIMARY KEY,
            notification_id INT,
            impressions INT DEFAULT 0,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 5. FORCE-PATCH analytics (Fixing the 'clicked' naming issue)
    await pool.query(`ALTER TABLE notification_analytics ADD COLUMN IF NOT EXISTS delivered INT DEFAULT 0;`);
    await pool.query(`ALTER TABLE notification_analytics ADD COLUMN IF NOT EXISTS opened INT DEFAULT 0;`);
    await pool.query(`ALTER TABLE notification_analytics ADD COLUMN IF NOT EXISTS clicked INT DEFAULT 0;`);
    // ---------------------------------------------------------

    // ---------------------------------------------------------
    // ⚡ COMPLIANCE DASHBOARD: SELF-HEALING TABLES & DATA ⚡
    // ---------------------------------------------------------
    
    // 1. Ensure Tables exist
    await pool.query(`
        CREATE TABLE IF NOT EXISTS compliance_findings (id SERIAL PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS dpdpa_checklist (id SERIAL PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS consent_logs (id SERIAL PRIMARY KEY);
    `);

    // 2. Force-patch the columns (One by one for safety)
    // For Findings
    await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS title VARCHAR(255);`);
    await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS description TEXT;`);
    await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS severity VARCHAR(50);`);
    await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open';`);

    // For Checklist (This fixes your specific error!)
    await pool.query(`ALTER TABLE dpdpa_checklist ADD COLUMN IF NOT EXISTS item_text TEXT;`);
    await pool.query(`ALTER TABLE dpdpa_checklist ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT false;`);

    // For Consent Logs
    await pool.query(`ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);`);
    await pool.query(`ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS consent_type VARCHAR(50);`);
    await pool.query(`ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS consent_given BOOLEAN;`);

    // 3. Inject Dummy Data
    await pool.query(`
        INSERT INTO compliance_findings (title, description, severity, status)
        SELECT 'Unencrypted Endpoint', 'Found API without HTTPS', 'high', 'open'
        WHERE NOT EXISTS (SELECT 1 FROM compliance_findings WHERE title = 'Unencrypted Endpoint');

        INSERT INTO dpdpa_checklist (item_text, done)
        SELECT 'Appoint Data Protection Officer (DPO)', true
        WHERE NOT EXISTS (SELECT 1 FROM dpdpa_checklist WHERE item_text = 'Appoint Data Protection Officer (DPO)');

        INSERT INTO consent_logs (user_id, consent_type, consent_given)
        SELECT 'demo_user_01', 'parental', true
        WHERE NOT EXISTS (SELECT 1 FROM consent_logs WHERE user_id = 'demo_user_01');
    `);
    
    // Delete till here---------------------------------------------------------
      
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
