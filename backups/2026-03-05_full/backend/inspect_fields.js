const db = require('./db/index');

async function inspect() {
    try {
        console.log('--- Inspecting CLIENTES_BROKERIA ---');
        const clientesCols = await db.clientesQuery(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clientes_brokeria'
        `);
        console.table(clientesCols.rows);

        console.log('--- Inspecting APOLICES_BROKERIA ---');
        const apolicesCols = await db.apolicesQuery(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'apolices_brokeria'
        `);
        console.table(apolicesCols.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
