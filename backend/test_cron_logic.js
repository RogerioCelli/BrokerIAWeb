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

    const db = new Pool({ connectionString: apolicesUrl });

    try {
        console.log("Conectado! Verificando apólices...");
        const query = `
            SELECT id_apolice, numero_apolice, vigencia_fim 
            FROM apolices_brokeria 
            WHERE status_apolice != 'VENCIDA' 
              AND vigencia_fim IS NOT NULL 
              AND TRIM(vigencia_fim) != ''
        `;

        const { rows } = await db.query(query);
        console.log(`Encontradas ${rows.length} apólices...`);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const idsToExpire = [];

        for (const row of rows) {
            try {
                const vigenciaFormat = String(row.vigencia_fim).trim();
                let dataFim = null;

                if (vigenciaFormat.includes('/')) {
                    const parts = vigenciaFormat.split('/');
                    if (parts.length === 3) {
                        const dia = parseInt(parts[0], 10);
                        const mes = parseInt(parts[1], 10) - 1; // 0-11
                        const ano = parseInt(parts[2], 10);
                        dataFim = new Date(ano, mes, dia);
                    }
                } else if (vigenciaFormat.includes('-')) {
                    dataFim = new Date(vigenciaFormat);
                }

                if (dataFim) {
                    dataFim.setHours(0, 0, 0, 0);

                    if (!isNaN(dataFim.getTime()) && dataFim < hoje) {
                        idsToExpire.push(row.id_apolice);
                        console.log(`DEVERIA EXPIRAR: ID ${row.id_apolice} - ${row.numero_apolice} (Data banco: ${row.vigencia_fim} | Var: ${dataFim.toISOString()})`);
                    }
                }
            } catch (e) { }
        }

        console.log(`Temos ${idsToExpire.length} apólices marcadas na queue de expiração.`);

        if (idsToExpire.length > 0) {
            console.log(`Query seria: UPDATE apolices_brokeria SET status_apolice = 'VENCIDA' WHERE id_apolice = ANY(ARRAY[${idsToExpire.join(',')}])`);
        }

    } catch (e) {
        console.error("Erro fatal:", e);
    } finally {
        await db.end();
    }
}

runTest();
