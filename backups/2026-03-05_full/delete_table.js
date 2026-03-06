const db = require('./backend/db');

async function deleteTable() {
    try {
        console.log("--- INICIANDO EXCLUSÃO DA TABELA public.apolices ---");

        // Verificando se a tabela existe antes de deletar
        const { rows: check } = await db.apolicesQuery(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'apolices'
            );
        `);

        if (check[0].exists) {
            await db.apolicesQuery('DROP TABLE public.apolices;');
            console.log("✅ TABELA public.apolices EXCLUÍDA COM SUCESSO!");
        } else {
            console.log("ℹ️ A tabela public.apolices já não existe no banco.");
        }

    } catch (err) {
        console.error("❌ ERRO AO DELETAR TABELA:", err.message);
    } finally {
        process.exit();
    }
}

deleteTable();
