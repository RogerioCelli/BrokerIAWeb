const fs = require('fs');
const path = require('path');
const db = require('./db');

async function importFull() {
    console.log('--- Iniciando Importação Completa ---');
    try {
        const sqlPath = path.join(__dirname, 'scripts', 'import_veiculos_v3.sql');
        if (!fs.existsSync(sqlPath)) {
            throw new Error('Arquivo SQL não encontrado: ' + sqlPath);
        }

        console.log('Lendo arquivo SQL...');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Dividir por ponto e vírgula, mas ignorar comentários e linhas vazias
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`Total de instruções detectadas: ${statements.length}`);

        // Executar em batches para não travar o banco
        const batchSize = 100;
        for (let i = 0; i < statements.length; i += batchSize) {
            const batch = statements.slice(i, i + batchSize);
            const batchSql = batch.join(';') + ';';

            process.stdout.write(`Processando batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(statements.length / batchSize)}... `);
            await db.query(batchSql);
            console.log('OK');
        }

        console.log('--- Importação Concluída com Sucesso ---');
        process.exit(0);
    } catch (e) {
        console.error('Erro na importação:', e);
        process.exit(1);
    }
}

importFull();
