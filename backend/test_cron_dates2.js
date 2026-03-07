const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runTest() {
    const apolicesUrl = process.env.APOLICES_DATABASE_URL;
    if (!apolicesUrl) {
        console.error("No APOLICES_DATABASE_URL found in .env");
        process.exit(1);
    }

    const pool = new Pool({ connectionString: apolicesUrl });

    try {
        console.log("Conectado. Buscando apólices Ativas e Pendentes com data...");
        const result = await pool.query(`
            SELECT id_apolice, numero_apolice, vigencia_fim, status_apolice 
            FROM apolices_brokeria 
            WHERE status_apolice != 'VENCIDA' AND vigencia_fim IS NOT NULL AND trim(vigencia_fim) != ''
        `);

        console.log(`Total encontrado: ${result.rows.length} apólices`);
        let expired = 0;
        let errors = 0;

        for (const row of result.rows) {
            try {
                // Testa se o banco consegue processar essa string specífica
                const check = await pool.query(`
                    SELECT 
                        $1::text as raw_date,
                        TO_DATE($1, 'DD/MM/YYYY') as casted_date,
                        TO_DATE($1, 'DD/MM/YYYY') < CURRENT_DATE as is_expired
                `, [row.vigencia_fim]);

                const isExp = check.rows[0].is_expired;
                if (isExp) {
                    expired++;
                    console.log(`[VENCIDA] Apólice ${row.numero_apolice} - Fim: '${row.vigencia_fim}' -> ${check.rows[0].casted_date}`);
                }
            } catch (e) {
                errors++;
                console.log(`[ERRO DE CAST] Apólice ${row.numero_apolice} falhou no TO_DATE com a data: '${row.vigencia_fim}'. Erro: ${e.message}`);
            }
        }

        console.log(`\nResumo: ${expired} deveriam expirar. ${errors} falharam na conversão.`);

        // Testar a query do cron inteira simulada:
        console.log("\nSimulando a Query do CRON com TRY-CATCH SQL...");
        const updateCheck = await pool.query(`
            SELECT numero_apolice, vigencia_fim 
            FROM apolices_brokeria
            WHERE 
                vigencia_fim LIKE '%/%/%'
                AND length(vigencia_fim) >= 8
                AND status_apolice != 'VENCIDA'
        `);
        console.log(`Query do cron encontrou ${updateCheck.rowCount} linhas viáveis pro LIKE.`);

    } catch (e) {
        console.error("Erro fatal:", e);
    } finally {
        await pool.end();
    }
}

runTest();
