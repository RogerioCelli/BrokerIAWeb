const { runMigrations } = require('./db/init');

async function main() {
    console.log('--- Iniciando Migração Manual ---');
    try {
        await runMigrations();
        console.log('--- Migração Concluída com Sucesso ---');
        process.exit(0);
    } catch (e) {
        console.error('Erro na migração:', e);
        process.exit(1);
    }
}

main();
