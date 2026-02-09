const db = require('./backend/db');

async function dumpData() {
    try {
        console.log("--- DUMPING apolices_brokeria SAMPLE ---");
        const { rows } = await db.apolicesQuery(`
            SELECT id_apolice, numero_apolice, cpf, id_cliente 
            FROM public.apolices_brokeria 
            LIMIT 5
        `);
        console.log("Sample rows:", JSON.stringify(rows, null, 2));

        console.log("--- CHECKING CPF MATCH ---");
        const testCpf = '11806562880';
        const { rows: match } = await db.apolicesQuery(`
            SELECT id_apolice, cpf 
            FROM public.apolices_brokeria 
            WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1
        `, [testCpf]);
        console.log(`Matches for ${testCpf}:`, match.length);
        if (match.length > 0) console.log("Match sample:", match[0]);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit();
    }
}

dumpData();
