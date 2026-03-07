const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixClienteId() {
    const clientesUrl = process.env.CLIENTES_DATABASE_URL;
    if (!clientesUrl) {
        console.error("No CLIENTES_DATABASE_URL found in .env");
        process.exit(1);
    }

    const pool = new Pool({ connectionString: clientesUrl });

    try {
        console.log("Conectado ao Banco de Clientes. Reparando a sequência do id_cliente...");

        // 1. Criar a sequence se não existir
        await pool.query(`CREATE SEQUENCE IF NOT EXISTS clientes_brokeria_id_cliente_seq;`);

        // 2. Apontar o default da coluna para essa sequence
        await pool.query(`ALTER TABLE public.clientes_brokeria ALTER COLUMN id_cliente SET DEFAULT nextval('clientes_brokeria_id_cliente_seq');`);

        // 3. Atualizar o contador da sequence para o maior ID atual, para evitar conflitos de unique constraint
        await pool.query(`SELECT setval('clientes_brokeria_id_cliente_seq', COALESCE((SELECT MAX(id_cliente) FROM public.clientes_brokeria), 0) + 1, false);`);

        // 4. (Opcional) Tentar consertar os registros que ficaram com id_cliente NULL
        const { rowCount } = await pool.query(`UPDATE public.clientes_brokeria SET id_cliente = nextval('clientes_brokeria_id_cliente_seq') WHERE id_cliente IS NULL;`);

        console.log(`Reparo concluído! ${rowCount} clientes com ID nulo foram consertados e numerados.`);

    } catch (e) {
        console.error("Erro ao reparar:", e);
    } finally {
        await pool.end();
    }
}

fixClienteId();
