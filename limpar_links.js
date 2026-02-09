const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

async function cleanup() {
    // Tenta pegar a URL do .env ou usa uma de fallback para teste local
    const connectionString = process.env.APOLICES_DATABASE_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ Erro: Nenhuma URL de banco de dados encontrada no .env");
        process.exit(1);
    }

    console.log("--- LIMPANDO LINKS DE EXEMPLO NO BANCO ---");
    console.log("Conectando em:", connectionString.split('@')[1]); // Mostra apenas o host para segurança

    const pool = new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        const query = `
            UPDATE apolices_brokeria 
            SET url_pdf = NULL 
            WHERE url_pdf LIKE '%demo.brokeria.com.br%' 
               OR url_pdf LIKE '%exemplo.com%'
               OR url_pdf = 'undefined'
        `;

        const res = await pool.query(query);
        console.log(`✅ Limpeza concluída! ${res.rowCount} registros resetados para 'Pendente'.`);

    } catch (err) {
        console.error("❌ Erro na limpeza:", err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

cleanup();
