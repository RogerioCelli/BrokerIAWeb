const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:brokeriaweb_secret_123@localhost:5432/brokeria_db'
});

async function run() {
    try {
        const res = await pool.query('SELECT dados_json FROM importacoes_pendentes ORDER BY id DESC LIMIT 1');
        if (res.rows.length > 0) {
            console.dir(res.rows[0].dados_json, { depth: null });
        } else {
            console.log("No pending imports.");
        }
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        pool.end();
    }
}

run();
