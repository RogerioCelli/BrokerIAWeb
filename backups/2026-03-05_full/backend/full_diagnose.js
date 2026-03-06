const db = require('./db');
async function diagnose() {
    const databases = [
        { name: 'PORTAL', query: db.query },
        { name: 'MASTER', query: db.masterQuery },
        { name: 'CLIENTES', query: db.clientesQuery },
        { name: 'REGISTROS', query: db.registrosQuery },
        { name: 'APOLICES', query: db.apolicesQuery }
    ];

    for (const d of databases) {
        try {
            console.log(`\n--- Verificando Banco: ${d.name} ---`);
            const { rows: tables } = await d.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            console.log(`Tabelas encontradas: ${tables.map(t => t.table_name).join(', ')}`);

            for (const t of tables) {
                try {
                    const { rows: count } = await d.query(`SELECT count(*) FROM ${t.table_name}`);
                    console.log(` - Tabela ${t.table_name}: ${count[0].count} registros`);

                    // Se a tabela tiver "apolice" no nome, tenta buscar o CPF
                    if (t.table_name.toLowerCase().includes('apolice')) {
                        try {
                            const { rows: find } = await d.query(`
                                SELECT count(*) FROM ${t.table_name} 
                                WHERE REPLACE(REPLACE(CAST(cpf AS TEXT), '.', ''), '-', '') = '11806562880'
                            `);
                            if (parseInt(find[0].count) > 0) {
                                console.log(` >>> ⭐ SUCESSO! Encontrados ${find[0].count} registros para o CPF 11806562880 na tabela ${t.table_name} do banco ${d.name}`);
                            }
                        } catch (e) { }
                    }
                } catch (e) { }
            }
        } catch (err) {
            console.log(`Erro ao acessar banco ${d.name}: ${err.message}`);
        }
    }
    process.exit();
}
diagnose();
