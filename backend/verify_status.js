const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkRealStatus() {
    const apolicesUrl = process.env.APOLICES_DATABASE_URL;
    if (!apolicesUrl) {
        console.error("No APOLICES_DATABASE_URL found in .env");
        process.exit(1);
    }

    const pool = new Pool({ connectionString: apolicesUrl });

    try {
        console.log("Conectado. Buscando os reais status das apólices problemáticas do print (ID 19, 10, 12, 11)...");
        const { rows } = await pool.query(`
            SELECT id_apolice, numero_apolice, vigencia_fim, status_apolice 
            FROM apolices_brokeria 
            WHERE id_apolice IN (19, 10, 12, 11)
        `);

        console.table(rows);

        console.log("Contagem Geral VENCIDAS:");
        const vencCount = await pool.query('SELECT count(*) FROM apolices_brokeria WHERE status_apolice = $1', ['VENCIDA']);
        console.log(`Total Vencidas: ${vencCount.rows[0].count}`);

    } catch (e) {
        console.error("Erro:", e);
    } finally {
        await pool.end();
    }
}

checkRealStatus();
