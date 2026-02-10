const db = require('./backend/db');

async function findTable() {
    const queries = [
        { name: 'Portal (DATABASE_URL)', query: db.query },
        { name: 'Master (MASTER_DATABASE_URL)', query: db.masterQuery },
        { name: 'Clientes (CLIENTES_DATABASE_URL)', query: db.clientesQuery },
        { name: 'Registros (REGISTROS_DATABASE_URL)', query: db.registrosQuery },
        { name: 'Apolices (APOLICES_DATABASE_URL)', query: db.apolicesQuery }
    ];

    console.log("--- BUSCANDO TABELA 'apolices' OU 'apolices_brokeria' EM TODAS AS CONEXÕES ---");

    for (const q of queries) {
        try {
            const { rows } = await q.query(`
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name LIKE 'apolice%'
            `);
            if (rows.length > 0) {
                console.log(`✅ ACHADO na conexão [${q.name}]:`, rows.map(r => `${r.table_schema}.${r.table_name}`).join(', '));
            } else {
                console.log(`❌ Não encontrado em [${q.name}]`);
            }
        } catch (err) {
            console.log(`⚠️ Erro ao consultar [${q.name}]:`, err.message);
        }
    }
    process.exit();
}

findTable();
