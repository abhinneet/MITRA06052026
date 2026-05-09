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
    // ⚡ COMPLIANCE DASHBOARD: FINAL "NOT-NULL" REPAIR ⚡
    // ---------------------------------------------------------
    
    // 1. Ensure Columns exist (Handling both 'label' and 'item_text' naming styles)
    await pool.query(`ALTER TABLE dpdpa_checklist ADD COLUMN IF NOT EXISTS item_text TEXT;`);
    await pool.query(`ALTER TABLE dpdpa_checklist ADD COLUMN IF NOT EXISTS label TEXT;`);
    await pool.query(`ALTER TABLE dpdpa_checklist ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT false;`);

    // 2. Inject Dummy Data (Filling BOTH columns so the NOT-NULL constraint is satisfied)**Delete Dummy data after going live**
    await pool.query(`
        INSERT INTO dpdpa_checklist (item_text, label, done)
        SELECT 
            'Appoint Data Protection Officer (DPO)', 
            'DPO Appointment', 
            true
        WHERE NOT EXISTS (
            SELECT 1 FROM dpdpa_checklist 
            WHERE item_text = 'Appoint Data Protection Officer (DPO)' 
            OR label = 'DPO Appointment'
        );

        INSERT INTO dpdpa_checklist (item_text, label, done)
        SELECT 
            'Implement Parental Consent mechanism', 
            'Parental Consent', 
            false
        WHERE NOT EXISTS (
            SELECT 1 FROM dpdpa_checklist 
            WHERE item_text = 'Implement Parental Consent mechanism' 
            OR label = 'Parental Consent'
        );
    `);

    // ---------------------------------------------------------
    // ⚡ 3. Populate Consent Logs (With Type-Correction) ⚡
    // ---------------------------------------------------------
    
    // First, fix the 'Integer' roadblock by changing the column to VARCHAR
    await pool.query(`
        ALTER TABLE consent_logs 
        ALTER COLUMN user_id TYPE VARCHAR(255);
    `);

    // Now, safely insert the demo data
    await pool.query(`
        INSERT INTO consent_logs (user_id, consent_type, consent_given)
        SELECT 'demo_user_01', 'parental', true
        WHERE NOT EXISTS (SELECT 1 FROM consent_logs WHERE user_id = 'demo_user_01');

        INSERT INTO consent_logs (user_id, consent_type, consent_given)
        SELECT 'demo_user_02', 'standard', true
        WHERE NOT EXISTS (SELECT 1 FROM consent_logs WHERE user_id = 'demo_user_02');
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
// ---------------------------------------------------------
    // 🛠️ FINAL ARCHITECTURE REPAIR: MISSING COMPLIANCE COLUMNS
    // ---------------------------------------------------------

    // 1. Fix the "Purge Reason" and "Incident Reports" errors
    await pool.query(`
        -- Add missing columns to compliance_findings if they don't exist
        ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS purge_reason TEXT;
        ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS mfa_enforced BOOLEAN DEFAULT false;

        -- Create the Incident Reports table
        CREATE TABLE IF NOT EXISTS incident_reports (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            description TEXT,
            severity VARCHAR(50),
            reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create the Compliance Settings table
        CREATE TABLE IF NOT EXISTS compliance_settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Inject a default setting so the 'auto-purge-status' route finds something
        INSERT INTO compliance_settings (key, value)
        VALUES ('auto_purge', 'disabled')
        ON CONFLICT (key) DO NOTHING;
    `);

    // 2. Fix the "UUID = INTEGER" mismatch
    // This happens because the audit-logs query is trying to compare a 
    // number to a UUID. We ensure the audit_logs table uses the correct type.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_id TEXT, -- Changed to TEXT to avoid UUID/INT conflicts
            action VARCHAR(255),
            details JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

ultimateBoot();
