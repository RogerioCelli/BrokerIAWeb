const db = require('./db');

async function inspect() {
    try {
        console.log('--- PORTAL TABLES (db-brokeriaweb) ---');
        const portalTables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(portalTables.rows.map(r => r.table_name));

        console.log('\n--- MASTER TABLES (brokeria-seguros) ---');
        const masterTables = await db.masterQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(masterTables.rows.map(r => r.table_name));

        // Check columns of suspected tables
        if (masterTables.rows.some(r => r.table_name === 'categorias_seguros')) {
            console.log('\n--- categorias_seguros COLUMNS ---');
            const cols = await db.masterQuery("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categorias_seguros'");
            console.log(cols.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
