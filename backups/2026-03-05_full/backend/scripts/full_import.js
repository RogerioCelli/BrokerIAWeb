const fs = require('fs');
const path = require('path');
const db = require('../db');

async function importFull() {
    console.log('--- Iniciando Importação Completa ---');
    try {
        const sqlPath = path.join(__dirname, 'import_veiculos_v3.sql');
        if (!fs.existsSync(sqlPath)) {
            throw new Error('Arquivo SQL não encontrado: ' + sqlPath);
        }

        console.log('Lendo arquivo SQL...');
        let sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comentários de linha única antes de qualquer outra coisa
        // para evitar que o comando seja ignorado ao remover as quebras de linha
        sql = sql.replace(/--.*$/gm, '');

        // Agora podemos remover quebras de linha extras e processar os comandos
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Total de instruções detectadas: ${statements.length}`);

        // Executar em batches para não travar o banco
        const batchSize = 100;
        for (let i = 0; i < statements.length; i += batchSize) {
            const batch = statements.slice(i, i + batchSize);
            const batchSql = batch.join(';') + ';';

            process.stdout.write(`Processando batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(statements.length / batchSize)}... `);
            try {
                await db.query(batchSql);
                console.log('OK');
            } catch (err) {
                console.log('ERRO');
                console.error(`[BATCH-ERROR] Erro no batch começando em ${i}:`, err.message);
                // Opcional: decidir se continua ou para. Aqui vamos parar para garantir integridade.
                throw err;
            }
        }

        console.log('--- Importação Concluída com Sucesso ---');
        process.exit(0);
    } catch (e) {
        console.error('Erro na importação:', e);
        process.exit(1);
    }
}

importFull();
