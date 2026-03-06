const db = require('./db');

async function checkAllDatabases() {
    const pools = [
        { name: 'Portal (db-brokeriaweb)', pool: db.poolPortal },
        { name: 'Master (brokeria-seguros)', pool: db.poolMaster },
        { name: 'Clientes (clientes-brokeria)', pool: db.poolClientes },
        { name: 'Registros (registros-brokeria)', pool: db.poolRegistros },
        { name: 'Apolices (apolices-brokeria)', pool: db.poolApolices }
    ];

    for (const p of pools) {
        console.log(`\n--- TABLES IN ${p.name} ---`);
        try {
            const res = await p.pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            console.log(res.rows.map(r => r.table_name));
        } catch (err) {
            console.log(`❌ Error: ${err.message}`);
        }
    }
    process.exit();
}

checkAllDatabases();
