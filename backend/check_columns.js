const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('clientes_brokeria', 'apolices_brokeria')
            ORDER BY table_name, ordinal_position
        `);
        console.log("COLUMNS:");
        console.table(res.rows);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await pool.end();
    }
}
check();
