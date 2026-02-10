const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://postgres:adb24c7c56e0659343d0@brokeria_apolices:5432/postgres?sslmode=disable',
});

async function verifySync() {
    try {
        console.log('--- Verificando Sincronização Recente ---');
        // Busca as últimas 10 apólices sincronizadas (com data de sincronização não nula)
        const query = `
            SELECT id_apolice, numero_apolice, cpf, link_url_apolice, data_sincronizacao 
            FROM apolices_brokeria 
            WHERE data_sincronizacao IS NOT NULL 
            ORDER BY data_sincronizacao DESC 
            LIMIT 10
        `;
        const res = await pool.query(query);

        if (res.rows.length === 0) {
            console.log('Nenhuma apólice encontrada com data_sincronizacao preenchida.');
        } else {
            console.table(res.rows.map(row => ({
                ID: row.id_apolice,
                'Nº Apólice': row.numero_apolice,
                CPF: row.cpf,
                'URL Sincronizada': row.link_url_apolice ? 'Sim (OK)' : 'Não (Erro)',
                'Data Sync': row.data_sincronizacao
            })));

            console.log('\n--- Detalhes das URLs ---');
            res.rows.forEach(row => {
                console.log(`Apólice ${row.numero_apolice} (${row.cpf}): ${row.link_url_apolice}`);
            });
        }

    } catch (err) {
        console.error('Erro ao verificar banco:', err.message);
    } finally {
        await pool.end();
    }
}

verifySync();
