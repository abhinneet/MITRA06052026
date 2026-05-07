const { Pool } = require('pg');
let bcrypt;

// This safely finds your app's encryption tool
try { 
    bcrypt = require('bcrypt'); 
} catch(e) { 
    try { bcrypt = require('bcryptjs'); } catch(e) {} 
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function fixAdmin() {
  try {
    console.log('🔧 Applying Surgical Database Fix...');
    
    // 1. Add the missing is_active column so the login doesn't crash
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`);
    console.log('✅ is_active column verified.');

    // 2. Scramble the password the exact way your dashboard expects
    if (bcrypt) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.query(`UPDATE users SET password = $1 WHERE email = 'admin@mitra.com';`, [hashedPassword]);
        console.log('✅ Password successfully scrambled.');
    } else {
        console.log('⚠️ Could not find encryption tool. Password left as plain text.');
    }

    console.log('🎉 Fix complete! Booting the dashboard...');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fix error:', err.message);
    process.exit(1);
  }
}

fixAdmin();
