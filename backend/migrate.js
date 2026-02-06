const db = require('./db');

/**
 * Migração para o Banco do Portal (db-brokeriaweb)
 * Cria apenas as tabelas necessárias para o funcionamento do site,
 * sem mexer nos bancos Master ou de Clientes.
 */
async function migrate() {
    try {
        console.log('--- [PORTAL] Iniciando Migração de Tabelas Internas ---');

        // 0. Habilitar Extensão de UUID se não existir
        await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        // 1. Tabela de Organizações (Cache Local do Portal)
        console.log('[PORTAL] Garantindo tabela de organizações...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS organizacoes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nome VARCHAR(255) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                logo_url TEXT,
                ativo BOOLEAN DEFAULT TRUE,
                config_json JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Inserir Corretora Padrão se não existir (Demo)
        await db.query(`
            INSERT INTO organizacoes (nome, slug, logo_url)
            VALUES ('Broker IA', 'corretora-demo', 'https://cdn.icon-icons.com/icons2/2699/PNG/512/microsoft_azure_logo_icon_168977.png')
            ON CONFLICT (slug) DO NOTHING;
        `);

        // 3. Tabela de Tokens de Acesso (2FA do Portal)
        console.log('[PORTAL] Garantindo tabela de tokens_acesso...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS tokens_acesso (
                id SERIAL PRIMARY KEY,
                cliente_id VARCHAR(255) UNIQUE NOT NULL, -- ID do banco de clientes (ou CPF)
                token_hash VARCHAR(255) NOT NULL,
                expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
                usado BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ [PORTAL] Estrutura interna configurada com sucesso!');
        return;
    } catch (error) {
        console.error('❌ [PORTAL] Erro na migração:', error);
        throw error;
    }
}

module.exports = { migrate };
