const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("TABLES_FOUND:");
        console.table(res.rows);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await pool.end();
    }
}

checkTables();
