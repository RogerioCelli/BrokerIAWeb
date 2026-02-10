const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgres://postgres:adb24c7c56e0659343d0@brokeria_apolices:5432/apolices-brokeria?sslmode=disable',
});

async function check() {
    try {
        console.log("--- INSPEÇÃO PROFUNDA DE CPFS ---");
        const { rows } = await pool.query("SELECT id_apolice, cpf, LENGTH(cpf) as len, url_pdf FROM apolices_brokeria LIMIT 30");
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
