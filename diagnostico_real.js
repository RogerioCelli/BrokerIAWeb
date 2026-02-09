const { Pool } = require('pg');
require('dotenv').config();

async function diagnostico() {
    console.log('--- DIAGNÓSTICO DE CONEXÃO ---');
    console.log('URL de Apólices Configurada:', process.env.APOLICES_DATABASE_URL ? 'OK (Configurada)' : 'ERRO (Vazia)');

    if (!process.env.APOLICES_DATABASE_URL) return;

    const pool = new Pool({ connectionString: process.env.APOLICES_DATABASE_URL });

    try {
        const client = await pool.connect();
        console.log('✅ Conexão estabelecida com sucesso.');

        // 1. Listar colunas reais da tabela
        const resCols = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'apolices_brokeria'
        `);

        console.log('\n--- COLUNAS ENCONTRADAS NA TABELA apolices_brokeria ---');
        if (resCols.rows.length === 0) {
            console.log('❌ TABELA NÃO ENCONTRADA OU ESTÁ VAZIA!');
        } else {
            resCols.rows.forEach(row => console.log('->', row.column_name));
        }

        client.release();
    } catch (err) {
        console.error('❌ ERRO AO CONECTAR NO BANCO:', err.message);
    } finally {
        await pool.end();
    }
}

diagnostico();
