const { Pool } = require('pg');

// 1. Connection Setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 2. The Migration Logic (Wrapped in a function)
async function runAllMigrations() {
    console.log("⚡ Starting MITRA Database Migrations...");
    try {
        // --- ALL YOUR QUERIES GO INSIDE HERE ---
        
        await pool.query(`CREATE TABLE IF NOT EXISTS compliance_findings (id SERIAL PRIMARY KEY);`);
        
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS title VARCHAR(255);`);
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS severity VARCHAR(50);`);
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS status VARCHAR(50);`);
        await pool.query(`ALTER TABLE compliance_findings ADD COLUMN IF NOT EXISTS purge_reason TEXT;`);
        
        await pool.query(`CREATE TABLE IF NOT EXISTS dpdpa_checklist (id SERIAL PRIMARY KEY, label TEXT, item_text TEXT, done BOOLEAN DEFAULT false);`);
        
        await pool.query(`
            ALTER TABLE consent_logs 
            ALTER COLUMN user_id TYPE VARCHAR(255);
        `);

        // Add any other table/column queries we discussed here...

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
