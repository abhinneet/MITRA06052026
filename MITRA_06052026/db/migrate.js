const { Pool } = require('pg');

// 1. Connection Setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 2. The Migration Logic
async function runAllMigrations() {
    console.log("⚡ Starting MITRA Database Migrations...");
    try {
        // ---------------------------------------------------------
        // 🛠️ 1. CREATE ALL BASE TABLES
        // ---------------------------------------------------------
        await pool.query(`
            CREATE TABLE IF NOT EXISTS compliance_findings (id SERIAL PRIMARY KEY);
            CREATE TABLE IF NOT EXISTS dpdpa_checklist (id SERIAL PRIMARY KEY);
            CREATE TABLE IF NOT EXISTS consent_logs (id SERIAL PRIMARY KEY);
            CREATE TABLE IF NOT EXISTS compliance_officers (role VARCHAR(50) PRIMARY KEY, name VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), updated_at TIMESTAMP);
            CREATE TABLE IF NOT EXISTS incident_reports (id SERIAL PRIMARY KEY, title VARCHAR(255), description TEXT, severity VARCHAR(50), reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS compliance_settings (key VARCHAR(100) PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS app_configs (key VARCHAR(255) PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, user_id TEXT, action VARCHAR(255), details JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        `);

        // ---------------------------------------------------------
        // 🛠️ 2. PATCH EXISTING TABLES (Adding missing columns safely)
        // ---------------------------------------------------------
        // Findings Table
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS title VARCHAR(255);`);
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS description TEXT;`);
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS severity VARCHAR(50);`);
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open';`);
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS purge_reason TEXT;`);
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS mfa_enforced BOOLEAN DEFAULT false;`);

        // Checklist Table
        await pool.query(`ALTER TABLE dpdpa_checklist ADD COLUMN IF NOT EXISTS item_text TEXT;`);
        await pool.query(`ALTER TABLE dpdpa_checklist ADD COLUMN IF NOT EXISTS label TEXT;`);
        await pool.query(`ALTER TABLE dpdpa_checklist ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT false;`);

        // Consent Logs (Fixing the Integer vs String issue)
        await pool.query(`ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS consent_type VARCHAR(50);`);
        await pool.query(`ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS consent_given BOOLEAN;`);
        await pool.query(`ALTER TABLE consent_logs ALTER COLUMN user_id TYPE VARCHAR(255);`);


        // ---------------------------------------------------------
        // 🛠️ 3. INJECT DUMMY DATA FOR DASHBOARD UI
        // ---------------------------------------------------------
        // Fake Findings
        await pool.query(`
            INSERT INTO compliance_findings (title, description, severity, status)
            SELECT 'Unencrypted Endpoint', 'Found API without HTTPS', 'high', 'open'
            WHERE NOT EXISTS (SELECT 1 FROM compliance_findings WHERE title = 'Unencrypted Endpoint');
        `);

        // Fake DPDPA Tracker
        await pool.query(`
            INSERT INTO dpdpa_checklist (item_text, label, done)
            SELECT 'Appoint Data Protection Officer (DPO)', 'DPO Appointment', true
            WHERE NOT EXISTS (SELECT 1 FROM dpdpa_checklist WHERE label = 'DPO Appointment');

            INSERT INTO dpdpa_checklist (item_text, label, done)
            SELECT 'Implement Parental Consent mechanism', 'Parental Consent', false
            WHERE NOT EXISTS (SELECT 1 FROM dpdpa_checklist WHERE label = 'Parental Consent');
        `);

        // Fake Consent Logs (For the Charts)
        await pool.query(`
            INSERT INTO consent_logs (user_id, consent_type, consent_given)
            SELECT 'demo_user_01', 'parental', true
            WHERE NOT EXISTS (SELECT 1 FROM consent_logs WHERE user_id = 'demo_user_01');
            
            INSERT INTO consent_logs (user_id, consent_type, consent_given)
            SELECT 'demo_user_02', 'standard', true
            WHERE NOT EXISTS (SELECT 1 FROM consent_logs WHERE user_id = 'demo_user_02');
        `);

        // Default Settings
        await pool.query(`
            INSERT INTO compliance_settings (key, value)
            VALUES ('auto_purge', 'disabled')
            ON CONFLICT (key) DO NOTHING;
        `);

        console.log("✅ Migrations finished successfully.");
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1); 
    } finally {
        await pool.end();
    }
}

// 3. Execute the function
runAllMigrations();
