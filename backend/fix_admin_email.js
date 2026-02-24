const { Client } = require('pg');

const DB_URL = 'postgres://postgres:5f5ed0131fdf16b8c387@brokeria_db-brokeriaweb:5432/db-brokeriaweb?sslmode=disable';

async function main() {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();
    console.log('Conectado ao banco.');

    // 1. Ver todos os usuários admin
    const users = await client.query('SELECT id, nome, cpf, email, role FROM portal_users ORDER BY id');
    console.log('\n=== PORTAL_USERS ATUAL ===');
    users.rows.forEach(u => console.log(u));

    // 2. Corrigir o email do Marcos (CPF: 11111111111)
    const fix = await client.query(
        `UPDATE portal_users 
         SET email = 'marcosnelsonss@gmail.com'
         WHERE cpf = '11111111111'
         RETURNING id, nome, cpf, email, role`
    );

    if (fix.rows.length > 0) {
        console.log('\n=== CORRIGIDO ===');
        fix.rows.forEach(u => console.log(u));
    } else {
        console.log('\nNenhum registro com CPF 11111111111 encontrado. Verificando por nome...');
        // Tenta pelo nome
        const byName = await client.query(
            `UPDATE portal_users
             SET email = 'marcosnelsonss@gmail.com'
             WHERE LOWER(nome) LIKE '%marcos%'
             RETURNING id, nome, cpf, email, role`
        );
        console.log('Por nome:', byName.rows);
    }

    // 3. Ver estado final
    const final = await client.query('SELECT id, nome, cpf, email, role FROM portal_users ORDER BY id');
    console.log('\n=== ESTADO FINAL ===');
    final.rows.forEach(u => console.log(u));

    await client.end();
}

main().catch(e => {
    console.error('ERRO:', e.message);
    process.exit(1);
});
