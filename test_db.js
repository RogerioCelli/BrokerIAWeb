const db = require('./backend/db');

async function test() {
    try {
        console.log("Checking tables in APOLICES_DATABASE_URL...");
        const { rows } = await db.apolicesQuery(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        `);
        console.log("Tables found:", rows);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit();
    }
}

test();
