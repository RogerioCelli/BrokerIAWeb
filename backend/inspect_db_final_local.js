const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Tenta carregar o .env do local correto
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    const dbUrl = process.env.DATABASE_URL;
    const apolicesUrl = process.env.APOLICES_DATABASE_URL;

    if (!dbUrl || !apolicesUrl) {
        console.error('URLs não encontradas no .env');
        process.exit(1);
    }

    console.log('--- Inspecting CLIENTES_BROKERIA ---');
    const p1 = new Pool({ connectionString: dbUrl });
    const c1 = await p1.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'clientes_brokeria'
        ORDER BY ordinal_position
    `);
    console.table(c1.rows);
    await p1.end();

    console.log('\n--- Inspecting APOLICES_BROKERIA ---');
    const p2 = new Pool({ connectionString: apolicesUrl });
    const c2 = await p2.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'apolices_brokeria'
        ORDER BY ordinal_position
    `);
    console.table(c2.rows);
    await p2.end();
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
