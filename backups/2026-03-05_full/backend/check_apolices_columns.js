const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkApolicesColumns() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'apolices_brokeria'");
        console.log("COLUMNS_FOUND:");
        console.table(res.rows);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await pool.end();
    }
}

checkApolicesColumns();
