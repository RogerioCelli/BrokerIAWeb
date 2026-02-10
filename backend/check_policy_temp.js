const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://postgres:adb24c7c56e0659343d0@brokeria_apolices:5432/apolices-brokeria?sslmode=disable',
});

async function checkMissingSync() {
    try {
        console.log('--- Verificando CPF 11111111111 no Banco ---');
        const query = `
            SELECT id_apolice, numero_apolice, cpf, link_url_apolice, data_sincronizacao 
            FROM apolices_brokeria 
            WHERE cpf LIKE '%11111111111%' OR numero_apolice LIKE '%8012345678111%'
        `;
        const res = await pool.query(query);

        if (res.rows.length === 0) {
            console.log('AVISO: Não existe registro no banco para o CPF 11111111111 ou a apólice 8012345678111.');
        } else {
            console.log('Registros encontrados:');
            console.table(res.rows);
        }

        console.log('\n--- Verificando outros CPFs que estavam no n8n ---');
        const others = ['96490467097', '70769550777', '60062870672'];
        const othersQuery = `SELECT cpf, numero_apolice, data_sincronizacao FROM apolices_brokeria WHERE cpf ANY($1)`;
        // Using a simpler query for multiple CPFs
        const resOthers = await pool.query("SELECT cpf, numero_apolice FROM apolices_brokeria WHERE cpf IN ('96490467097', '70769550777', '60062870672', '11111111111')");
        console.log('Status desses CPFs no banco:');
        console.table(resOthers.rows);

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkMissingSync();
