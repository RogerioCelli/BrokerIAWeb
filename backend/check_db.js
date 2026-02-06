const { Client } = require('pg');

const client = new Client({
    connectionString: "postgres://postgres:7210db57a23c5f304368@localhost:5432/broker_ia_web"
});

async function run() {
    await client.connect();
    try {
        console.log("Checking clientes_brokeria table columns:");
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'clientes_brokeria'
      ORDER BY ordinal_position;
    `);
        console.log(res.rows);

        console.log("\nSearching for CPF 11806562880:");
        const resCpf = await client.query(`
      SELECT * 
      FROM public.clientes_brokeria 
      WHERE REGEXP_REPLACE(cpf, '\\D', '', 'g') = '11806562880'
      LIMIT 1;
    `);
        console.log(resCpf.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
