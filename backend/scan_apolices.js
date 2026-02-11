const db = require('./db');
async function scan() {
    try {
        console.log('--- [PORTAL-SCAN] Lendo apólices no banco... ---');
        const { rows } = await db.apolicesQuery("SELECT id_apolice, numero_apolice, cpf, status_apolice FROM apolices_brokeria LIMIT 5");
        console.log(`[SCAN] Total de registros encontrados: ${rows.length}`);

        if (rows.length > 0) {
            console.log('[SCAN] Amostra de dados:');
            rows.forEach(r => {
                console.log(` - ID: ${r.id_apolice} | CPF no Banco: "${r.cpf}" | Status: ${r.status_apolice}`);
            });
        } else {
            console.log('[SCAN] A tabela apolices_brokeria está VAZIA ou não pôde ser lida.');
        }
    } catch (e) { console.error('[SCAN-ERROR]', e.message); }
    process.exit();
}
scan();
