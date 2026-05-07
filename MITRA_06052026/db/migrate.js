const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function godMode() {
  try {
    console.log('⚡ Initiating God Mode Setup...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // 1. Try to update the existing account to fix it
    const updateRes = await pool.query(
        `UPDATE users SET password = $1, is_active = true, role = 'admin' WHERE email = 'admin@mitra.com'`, 
        [hashedPassword]
    );
    
    // 2. If it doesn't exist, create it from scratch
    if (updateRes.rowCount === 0) {
        console.log('⚠️ Admin not found. Forging brand new record...');
        await pool.query(`
          INSERT INTO users (email, password, role, is_active) 
          VALUES ('admin@mitra.com', $1, 'admin', true)
        `, [hashedPassword]);
    }
    
    console.log('✅ Admin account completely secured. You are cleared for login.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error in God Mode:', err.message);
    process.exit(1);
  }
}

godMode();
