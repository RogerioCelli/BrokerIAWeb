const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function verifyAndNormalize() {
    console.log('--- Verificando Conexão com Banco de Clientes ---');
    try {
        // Forçar injeção no process.env para o db/index.js carregar certo
        const test = await db.clientesQuery('SELECT 1 as connected');
        console.log('✅ Conexão OK:', test.rows[0].connected);

        console.log('\n--- Amostra de dados ANTES da normalização ---');
        const sample = await db.clientesQuery('SELECT id_cliente, nome_completo, celular, telefone FROM public.clientes_brokeria LIMIT 10');
        console.table(sample.rows);

        const directSQL = `
        UPDATE public.clientes_brokeria
        SET 
          celular = (
            CASE 
              WHEN LENGTH(REGEXP_REPLACE(celular, '\\D', '', 'g')) = 10 
                THEN '55' || SUBSTR(REGEXP_REPLACE(celular, '\\D', '', 'g'), 1, 2) || '9' || SUBSTR(REGEXP_REPLACE(celular, '\\D', '', 'g'), 3)
              WHEN LENGTH(REGEXP_REPLACE(celular, '\\D', '', 'g')) = 11 AND SUBSTR(REGEXP_REPLACE(celular, '\\D', '', 'g'), 1, 2) != '55' 
                THEN '55' || REGEXP_REPLACE(celular, '\\D', '', 'g')
              WHEN LENGTH(REGEXP_REPLACE(celular, '\\D', '', 'g')) = 11 AND SUBSTR(REGEXP_REPLACE(celular, '\\D', '', 'g'), 1, 2) = '55' 
                THEN '55' || SUBSTR(REGEXP_REPLACE(celular, '\\D', '', 'g'), 3, 2) || '9' || SUBSTR(REGEXP_REPLACE(celular, '\\D', '', 'g'), 5)
              WHEN LENGTH(REGEXP_REPLACE(celular, '\\D', '', 'g')) = 12 AND SUBSTR(REGEXP_REPLACE(celular, '\\D', '', 'g'), 1, 2) = '55' 
                THEN '55' || SUBSTR(REGEXP_REPLACE(celular, '\\D', '', 'g'), 3, 2) || '9' || SUBSTR(REGEXP_REPLACE(celular, '\\D', '', 'g'), 5)
              WHEN LENGTH(REGEXP_REPLACE(celular, '\\D', '', 'g')) = 13
                THEN REGEXP_REPLACE(celular, '\\D', '', 'g')
              ELSE REGEXP_REPLACE(celular, '\\D', '', 'g')
            END
          ),
          telefone = (
            CASE 
              WHEN LENGTH(REGEXP_REPLACE(telefone, '\\D', '', 'g')) = 10 
                THEN '55' || SUBSTR(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 1, 2) || '9' || SUBSTR(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 3)
              WHEN LENGTH(REGEXP_REPLACE(telefone, '\\D', '', 'g')) = 11 AND SUBSTR(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 1, 2) != '55' 
                THEN '55' || REGEXP_REPLACE(telefone, '\\D', '', 'g')
              WHEN LENGTH(REGEXP_REPLACE(telefone, '\\D', '', 'g')) = 11 AND SUBSTR(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 1, 2) = '55' 
                THEN '55' || SUBSTR(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 3, 2) || '9' || SUBSTR(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 5)
              WHEN LENGTH(REGEXP_REPLACE(telefone, '\\D', '', 'g')) = 12 AND SUBSTR(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 1, 2) = '55' 
                THEN '55' || SUBSTR(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 3, 2) || '9' || SUBSTR(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 5)
              WHEN LENGTH(REGEXP_REPLACE(telefone, '\\D', '', 'g')) = 13
                THEN REGEXP_REPLACE(telefone, '\\D', '', 'g')
              ELSE REGEXP_REPLACE(telefone, '\\D', '', 'g')
            END
          )
        WHERE celular IS NOT NULL OR telefone IS NOT NULL;
        `;

        console.log('\n--- Executando Normalização de Dados ---');
        const updateRes = await db.clientesQuery(directSQL);
        console.log(`✅ Sucesso! Linhas afetadas: ${updateRes.rowCount}`);

        console.log('\n--- Amostra de dados DEPOIS da normalização ---');
        const sampleAfter = await db.clientesQuery('SELECT id_cliente, nome_completo, celular, telefone FROM public.clientes_brokeria LIMIT 10');
        console.table(sampleAfter.rows);

    } catch (e) {
        console.error('❌ ERRO:', e.message);
    }
    process.exit();
}

verifyAndNormalize();
