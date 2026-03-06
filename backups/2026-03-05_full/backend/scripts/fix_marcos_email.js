/**
 * SCRIPT DE MANUTENÇÃO — Corrigir email admin Marcos
 * Executar: node scripts/fix_marcos_email.js
 * (rodar DENTRO do container/servidor onde o banco está acessível)
 */
require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log('[OK] Conectado ao banco:', process.env.DATABASE_URL.split('@')[1]);

    // Ver estado atual
    const antes = await client.query('SELECT id, nome, cpf, email, role FROM portal_users ORDER BY id');
    console.log('\n=== PORTAL_USERS (ANTES) ===');
    antes.rows.forEach(u => console.log(`  ID:${u.id} | ${u.nome} | CPF:${u.cpf} | EMAIL:${u.email} | ROLE:${u.role}`));

    // Corrigir email do Marcos
    const result = await client.query(
        `UPDATE portal_users 
         SET email = 'marcosnelsonss@gmail.com'
         WHERE cpf = '11111111111'
         RETURNING id, nome, cpf, email`
    );

    if (result.rows.length > 0) {
        console.log('\n[CORRIGIDO] Email atualizado:');
        result.rows.forEach(u => console.log(`  ${u.nome} | ${u.cpf} => ${u.email}`));
    } else {
        console.warn('\n[AVISO] Nenhum registro encontrado com CPF 11111111111');
        console.log('Listando todos os CPFs disponíveis:');
        const cpfs = await client.query('SELECT id, nome, cpf FROM portal_users');
        cpfs.rows.forEach(u => console.log(`  ID:${u.id} | ${u.nome} | CPF:"${u.cpf}"`));
    }

    // Ver estado final
    const depois = await client.query('SELECT id, nome, cpf, email, role FROM portal_users ORDER BY id');
    console.log('\n=== PORTAL_USERS (DEPOIS) ===');
    depois.rows.forEach(u => console.log(`  ID:${u.id} | ${u.nome} | CPF:${u.cpf} | EMAIL:${u.email} | ROLE:${u.role}`));

    await client.end();
    console.log('\n[DONE] Correção finalizada.');
}

main().catch(e => {
    console.error('[ERRO]', e.message);
    process.exit(1);
});
