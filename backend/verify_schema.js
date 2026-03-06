const { Pool } = require('pg');

const apolicesPool = new Pool({
    connectionString: process.env.APOLICES_DATABASE_URL || 'postgres://postgres:adb24c7c56e0659343d0@brokeria_apolices:5432/apolices-brokeria?sslmode=disable'
});

const clientesPool = new Pool({
    connectionString: process.env.CLIENTES_DATABASE_URL || 'postgres://postgres:99d82edbb839b7bcaa63@brokeria_clientes-postgres:5432/cliente-brokeria?sslmode=disable'
});

async function run() {
    try {
        const apQuery = "SELECT data_type FROM information_schema.columns WHERE table_name = 'apolices_brokeria' AND column_name = 'id_cliente';";
        const cliQuery = "SELECT data_type FROM information_schema.columns WHERE table_name = 'clientes_brokeria' AND column_name = 'id_cliente';";

        const res1 = await apolicesPool.query(apQuery);
        console.log("apolices_brokeria.id_cliente type:", res1.rows[0]?.data_type);

        const res2 = await clientesPool.query(cliQuery);
        console.log("clientes_brokeria.id_cliente type:", res2.rows[0]?.data_type);

    } catch (e) {
        console.error(e);
    } finally {
        apolicesPool.end();
        clientesPool.end();
    }
}

run();
