const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getClientId() {
    try {
        const res = await pool.query("SELECT id_cliente, nome_completo FROM public.clientes_brokeria WHERE cpf = '11806562880'");
        if (res.rows.length > 0) {
            console.log("CLIENTE_ENCONTRADO:");
            console.table(res.rows);
        } else {
            console.log("CLIENTE_NAO_ENCONTRADO");
        }
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await pool.end();
    }
}

getClientId();
