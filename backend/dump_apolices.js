const { Pool } = require('pg');
require('dotenv').config({ path: 'e:/Projetos/Antigravity/BrokerIAWeb/backend/.env' });

async function dumpApolices() {
    const url = process.env.APOLICES_DATABASE_URL;
    if (!url) {
        console.error('APOLICES_DATABASE_URL não configurada.');
        return;
    }

    const pool = new Pool({ connectionString: url });

    try {
        console.log('--- EXAMINANDO TABELA apolices_brokeria ---');

        // Check columns
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'apolices_brokeria'
            ORDER BY ordinal_position
        `);
        console.log('\nESTRUTURA DA TABELA:');
        console.table(cols.rows);

        // Get all data (limited for sanity, but enough to see everything)
        const res = await pool.query('SELECT * FROM public.apolices_brokeria ORDER BY id_apolice DESC');

        console.log(`\nTOTAL DE REGISTROS: ${res.rows.length}`);
        console.log('\nDADOS COMPLETOS:');

        if (res.rows.length === 0) {
            console.log('Tabela está vazia.');
        } else {
            // Print table in chunks if too big, or just focus on key fields first
            console.table(res.rows.map(r => ({
                id: r.id_apolice,
                cliente: r.cliente_nome,
                cpf: r.cpf,
                cnpj: r.cnpj,
                apolice: r.numero_apolice,
                veiculo: r.veiculo_modelo || r.bem_segurado,
                placa: r.placa,
                vencimento: r.vigencia_fim,
                status: r.status_apolice
            })));

            console.log('\n--- ÚLTIMO REGISTRO EM JSON (Detalhado) ---');
            console.log(JSON.stringify(res.rows[0], null, 2));
        }

    } catch (e) {
        console.error('❌ ERRO:', e.message);
    } finally {
        await pool.end();
    }
}

dumpApolices();
