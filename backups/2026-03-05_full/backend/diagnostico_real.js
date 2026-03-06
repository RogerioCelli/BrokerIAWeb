const { Pool } = require('pg');
require('dotenv').config();

async function diagnostico() {
    console.log('\n--- RAIO-X DE CONEXÃO DO PORTAL ---');

    const pools = {
        'CLIENTES (DATABASE_URL)': process.env.DATABASE_URL,
        'APÓLICES (APOLICES_DATABASE_URL)': process.env.APOLICES_DATABASE_URL
    };

    for (const [nome, url] of Object.entries(pools)) {
        if (!url) {
            console.log(`\n❌ ${nome}: Variável não configurada!`);
            continue;
        }

        const pool = new Pool({ connectionString: url });
        try {
            const client = await pool.connect();
            const res = await client.query('SELECT current_database(), current_user, inet_server_addr()');
            const data = res.rows[0];

            console.log(`\n✅ ${nome}:`);
            console.log(`   -> Banco: ${data.current_database}`);
            console.log(`   -> Usuário: ${data.current_user}`);
            console.log(`   -> IP Servidor: ${data.inet_server_addr}`);

            // Verificar tabela de apólices especificamente no banco de apólices
            if (nome.includes('APÓLICES')) {
                const resCount = await client.query("SELECT count(*) FROM public.apolices_brokeria");
                console.log(`   -> Total de Apólices na tabela public.apolices_brokeria: ${resCount.rows[0].count}`);

                const resSample = await client.query("SELECT numero_apolice, cpf FROM public.apolices_brokeria LIMIT 1");
                if (resSample.rows.length > 0) {
                    console.log(`   -> Amostra: Apólice ${resSample.rows[0].numero_apolice} | CPF: ${resSample.rows[0].cpf}`);
                }
            }

            client.release();
        } catch (err) {
            console.log(`\n❌ ${nome}: Erro de conexão - ${err.message}`);
        }
        await pool.end();
    }
}

diagnostico();
