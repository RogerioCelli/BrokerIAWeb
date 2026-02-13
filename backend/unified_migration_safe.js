const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// CONFIGURAÇÃO DO NOVO BANCO (ALVO)
const TARGET_DB_URL = "postgres://postgres:ebfe67aa013c3555ead9@brokeria_brokeria_db:5432/brokeria_db?sslmode=disable";

// FONTES DE DADOS (ORIGENS)
const sources = [
    { name: 'PORTAL', url: process.env.DATABASE_URL, tables: ['portal_users', 'portal_admin_tokens', 'seguradoras', 'organizacoes'] },
    { name: 'CLIENTES', url: process.env.CLIENTES_DATABASE_URL, tables: ['clientes_brokeria'] },
    { name: 'APOLICES', url: process.env.APOLICES_DATABASE_URL, tables: ['apolices_brokeria'] },
    { name: 'REGISTROS', url: process.env.REGISTROS_DATABASE_URL, tables: ['brokeria_registros_brokeria'] }
];

async function migrate() {
    const targetPool = new Pool({ connectionString: TARGET_DB_URL });
    console.log('🚀 Iniciando Migração Unificada para brokeria_db (Modo de Cópia Segura)...\n');

    for (const source of sources) {
        if (!source.url) {
            console.log(`⚠️  Pulando ${source.name}: URL não encontrada no .env`);
            continue;
        }

        const sourcePool = new Pool({ connectionString: source.url });
        console.log(`--- Processando Banco: ${source.name} ---`);

        for (const tableName of source.tables) {
            try {
                // 1. Pega os dados da origem
                const dataRes = await sourcePool.query(`SELECT * FROM ${tableName}`);

                if (dataRes.rows.length === 0) {
                    console.log(`    ℹ️  Tabela ${tableName} está vazia na origem.`);
                    continue;
                }

                // 2. Prepara a estrutura no destino se não existir (Baseado no primeiro registro)
                const firstRow = dataRes.rows[0];
                const cols = Object.keys(firstRow);

                // Nota: Criar tabelas via código é complexo para tipos específicos. 
                // Se as tabelas já existirem no destino (via init.js por exemplo), o INSERT abaixo funciona.
                // Se não existirem, este script tentará um INSERT que pode falhar se o schema não estiver pronto.
                // Assumimos que o banco está limpo e usaremos uma técnica de inserção dinâmica.

                console.log(`    📦 Copiando ${dataRes.rows.length} registros para ${tableName}...`);

                let successCount = 0;
                for (const row of dataRes.rows) {
                    const keys = Object.keys(row);
                    const values = Object.values(row);
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                    const columnsName = keys.join(', ');

                    try {
                        await targetPool.query(
                            `INSERT INTO ${tableName} (${columnsName}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                            values
                        );
                        successCount++;
                    } catch (e) {
                        // Se a tabela não existir, tentamos criar uma versão básica (texto para tudo para não travar a migração de dados bruta)
                        if (e.message.includes('relation') && e.message.includes('does not exist')) {
                            const createCols = keys.map(k => `${k} TEXT`).join(', ');
                            await targetPool.query(`CREATE TABLE IF NOT EXISTS ${tableName} (${createCols})`);
                            // Tenta novamente
                            await targetPool.query(`INSERT INTO ${tableName} (${columnsName}) VALUES (${placeholders})`, values);
                            successCount++;
                        } else {
                            throw e;
                        }
                    }
                }
                console.log(`    ✅ ${successCount} registros migrados para ${tableName}.`);
            } catch (err) {
                console.error(`    ❌ Erro na tabela ${tableName}:`, err.message);
            }
        }
        await sourcePool.end();
    }

    // CURA DE DADOS - RELACIONAMENTOS
    console.log('\n--- Realizando Cura de Relacionamentos (Vínculo Cliente <-> Apólice) ---');
    try {
        const fixRelRes = await targetPool.query(`
            UPDATE public.apolices_brokeria a
            SET id_cliente = c.id_cliente,
                cliente_nome = c.nome_completo
            FROM public.clientes_brokeria c
            WHERE REGEXP_REPLACE(CAST(a.cpf AS TEXT), '\\D', '', 'g') = REGEXP_REPLACE(CAST(c.cpf AS TEXT), '\\D', '', 'g')
               OR REGEXP_REPLACE(CAST(a.cnpj AS TEXT), '\\D', '', 'g') = REGEXP_REPLACE(CAST(c.cpf AS TEXT), '\\D', '', 'g');
        `);
        console.log(`✅ Relacionamentos curados! ${fixRelRes.rowCount} apólices agora estão vinculadas corretamente aos seus clientes.`);
    } catch (err) {
        console.log('ℹ️ Cura de dados pulada ou não necessária (talvez tabelas vazias ou CPFs não batem):', err.message);
    }

    console.log('\n✨ MOP FINALIZADO: Os dados foram copiados para o novo brokeria_db.');
    console.log('Próximos passos: Testar o acesso via BrokerIAWeb e n8n usando a nova URL.');
    await targetPool.end();
}

migrate();
