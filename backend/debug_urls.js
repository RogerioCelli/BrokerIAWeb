const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgres://postgres:adb24c7c56e0659343d0@brokeria_apolices:5432/apolices-brokeria?sslmode=disable',
});

async function check() {
    try {
        const { rows } = await pool.query("SELECT id_apolice, cpf, url_pdf FROM apolices_brokeria WHERE url_pdf IS NOT NULL LIMIT 10");
        console.log("POLICIES WITH URL:");
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
