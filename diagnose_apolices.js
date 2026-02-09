const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

// Força o uso da URL fornecida pelo usuário no inicio
const connectionString = 'postgres://postgres:adb24c7c56e0659343d0@brokeria_apolices:5432/apolices-brokeria?sslmode=disable';

const pool = new Pool({
    connectionString: connectionString,
    ssl: false
});

async function diagnose() {
    console.log("--- DIAGNÓSTICO DIRETO DO BANCO DE APÓLICES ---");
    console.log("URL:", connectionString);

    try {
        // 1. Listar todas as tabelas
        console.log("\n1. Listando Tabelas no Banco:");
        const resTables = await pool.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        if (resTables.rows.length === 0) {
            console.log("   ❌ NENHUMA TABELA ENCONTRADA!");
        } else {
            resTables.rows.forEach(r => console.log(`   - ${r.table_schema}.${r.table_name}`));
        }

        // 2. Verificar se apolices_brokeria existe
        const tableExists = resTables.rows.some(r => r.table_name === 'apolices_brokeria');
        if (!tableExists) {
            console.error("\n❌ CRÍTICO: Tabela 'apolices_brokeria' NÃO EXISTE neste banco.");
            process.exit(1);
        }

        // 3. Dump dos primeiros 5 registros (qualquer CPF)
        console.log("\n2. Dump de Dados (Top 5):");
        const resData = await pool.query(`SELECT * FROM apolices_brokeria LIMIT 5`);
        if (resData.rows.length === 0) {
            console.log("   ⚠️ A tabela existe mas está VAZIA.");
        } else {
            console.log(JSON.stringify(resData.rows, null, 2));
        }

        // 4. Verificar Colunas
        console.log("\n3. Estrutura da Tabela:");
        const resCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'apolices_brokeria'
        `);
        resCols.rows.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));

    } catch (err) {
        console.error("\n❌ ERRO DE CONEXÃO/QUERY:", err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

diagnose();
