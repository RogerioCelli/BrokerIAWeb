const db = require('./db');

async function test() {
    const cpf = '11806562880';
    try {
        const { rows } = await db.apolicesQuery(
            "SELECT count(*) FROM apolices_brokeria WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1",
            [cpf]
        );
        console.log(`[TEST] Encontradas ${rows[0].count} apólices para o CPF ${cpf}`);

        const { rows: all } = await db.apolicesQuery("SELECT count(*) FROM apolices_brokeria");
        console.log(`[TEST] Total de apólices no banco: ${all[0].count}`);

        const { rows: dbName } = await db.apolicesQuery("SELECT current_database()");
        console.log(`[TEST] Banco atual: ${dbName[0].current_database}`);
    } catch (e) {
        console.error('[TEST-ERROR]', e.message);
    }
    process.exit();
}

test();
