const db = require('./backend/db');

async function scanAll() {
    const pools = [
        { name: 'Portal (DATABASE_URL)', query: db.query },
        { name: 'Master (MASTER_DATABASE_URL)', query: db.masterQuery },
        { name: 'Clientes (CLIENTES_DATABASE_URL)', query: db.clientesQuery },
        { name: 'Apolices (APOLICES_DATABASE_URL)', query: db.apolicesQuery }
    ];

    console.log("--- SCANNING FOR 'apolices_brokeria' ---");

    for (const pool of pools) {
        try {
            const { rows } = await pool.query(`
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name = 'apolices_brokeria'
            `);
            if (rows.length > 0) {
                console.log(`✅ FOUND in [${pool.name}]: Schema [${rows[0].table_schema}]`);
            } else {
                console.log(`❌ NOT FOUND in [${pool.name}]`);
            }
        } catch (err) {
            console.log(`⚠️ ERROR in [${pool.name}]: ${err.message}`);
        }
    }
    process.exit();
}

scanAll();
