const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkColumns() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'portal_users'");
        console.table(res.rows);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await pool.end();
    }
}

checkColumns();
