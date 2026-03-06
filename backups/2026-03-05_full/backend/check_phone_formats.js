const { Pool } = require('pg');
require('dotenv').config({ path: 'e:/Projetos/Antigravity/BrokerIAWeb/backend/.env' });

async function checkPhoneFormats() {
    const url = process.env.CLIENTES_DATABASE_URL;
    if (!url) {
        console.error('CLIENTES_DATABASE_URL não configurada.');
        return;
    }

    const pool = new Pool({ connectionString: url });

    try {
        console.log('--- Analisando Formatos de Telefone em clientes_brokeria ---');
        const res = await pool.query('SELECT id_cliente, nome_completo, celular, telefone FROM public.clientes_brokeria LIMIT 20');

        console.table(res.rows.map(r => ({
            id: r.id_cliente,
            nome: r.nome_completo,
            celular: r.celular,
            celular_limpo: r.celular ? r.celular.replace(/\D/g, '') : 'NULl',
            telefone: r.telefone,
            telefone_limpo: r.telefone ? r.telefone.replace(/\D/g, '') : 'NULL'
        })));

    } catch (e) {
        console.error('Erro:', e.message);
    } finally {
        await pool.end();
    }
}

checkPhoneFormats();
