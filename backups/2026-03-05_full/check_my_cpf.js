const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const connectionString = 'postgres://postgres:adb24c7c56e0659343d0@brokeria_apolices:5432/apolices-brokeria?sslmode=disable';

const pool = new Pool({
    connectionString: connectionString,
    ssl: false
});

async function checkCpf() {
    const testCpf = '11806562880';
    console.log(`--- VERIFICANDO CPF: ${testCpf} NO BANCO DE APÓLICES ---`);

    try {
        // 1. Busca exata
        console.log("\n1. Tentando busca exata (WHERE cpf = $1):");
        const resExact = await pool.query('SELECT * FROM apolices_brokeria WHERE cpf = $1', [testCpf]);
        console.log(`   Resultados: ${resExact.rows.length}`);
        if (resExact.rows.length > 0) console.log(JSON.stringify(resExact.rows, null, 2));

        // 2. Busca com limpeza de formatação
        console.log("\n2. Tentando busca com limpeza (REPLACE):");
        const resClean = await pool.query(`
            SELECT * FROM apolices_brokeria 
            WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1
        `, [testCpf]);
        console.log(`   Resultados: ${resClean.rows.length}`);
        if (resClean.rows.length > 0) console.log(JSON.stringify(resClean.rows, null, 2));

        // 3. Ver todos os CPFs disponíveis para comparação
        console.log("\n3. Listando todos os CPFs na tabela (Apenas os primeiros 10):");
        const resAll = await pool.query('SELECT DISTINCT cpf FROM apolices_brokeria LIMIT 10');
        resAll.rows.forEach(r => console.log(`   - CPF: "${r.cpf}"`));

    } catch (err) {
        console.error("\n❌ ERRO NA QUERY:", err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

checkCpf();
