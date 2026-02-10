const { Pool } = require('pg');
require('dotenv').config();

// Conexão com o Banco do Portal
const pool = new Pool({
    connectionString: 'postgres://postgres:5f5ed0131fdf16b8c387@brokeria_db-brokeriaweb:5432/db-brokeriaweb?sslmode=disable'
});

async function restore() {
    try {
        console.log('--- Restaurando Equipe no Portal ---');
        await pool.query(`
            INSERT INTO portal_users (nome, cpf, email, role) 
            VALUES 
                ('Marcos', '15309831804', 'marcos@dwfcorretora.com.br', 'admin'),
                ('Washington Oliveira', '22222222222', 'dwfcorretoradeseguros@hotmail.com', 'admin'),
                ('Magui', '11111111111', 'magui@exemplo.com', 'admin')
            ON CONFLICT (cpf) DO UPDATE SET 
                nome = EXCLUDED.nome,
                email = EXCLUDED.email,
                role = EXCLUDED.role;
        `);
        console.log('✅ Equipe restaurada com sucesso!');

        console.log('\n--- Verificando Apólices do Washington ---');
        const poolApolices = new Pool({
            connectionString: 'postgres://postgres:adb24c7c56e0659343d0@brokeria_apolices:5432/apolices-brokeria?sslmode=disable'
        });

        const { rows } = await poolApolices.query(`
            SELECT cpf, numero_apolice, seguradora 
            FROM apolices_brokeria 
            WHERE cpf LIKE '%222%' OR cpf LIKE '%22222222222%'
        `);

        if (rows.length === 0) {
            console.log('⚠️ AVISO: Nenhuma apólice encontrada para o Washington no banco apolices-brokeria.');
            console.log('Sugestão: Verifique se o n8n já sincronizou os dados para este novo banco.');
        } else {
            console.log(`✅ Encontradas ${rows.length} apólices para o Washington!`);
            console.table(rows);
        }

        await poolApolices.end();
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

restore();
