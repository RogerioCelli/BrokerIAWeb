const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTypes() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('clientes_brokeria', 'apolices_brokeria') 
            AND column_name = 'id_cliente'
        `);
        console.log("TYPES_FOUND:");
        console.table(res.rows);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await pool.end();
    }
}

checkTypes();
