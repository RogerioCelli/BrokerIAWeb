const db = require('./db');

/**
 * Migração para o Banco do Portal (db-brokeriaweb)
 * Cria as tabelas necessárias para o funcionamento do portal,
 * incluindo a estrutura de seguros e tokens de acesso.
 */
async function migrate() {
    try {
        console.log('--- [PORTAL-MIGRATE] Iniciando v1.5.2 ---');

        // 0. Estrutura de Seguros
        console.log('[PORTAL-MIGRATE] Passo 0: Tabelas de Seguros...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS categorias_seguros (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) UNIQUE NOT NULL,
                ordem INTEGER DEFAULT 99
            );

            CREATE TABLE IF NOT EXISTS tipos_seguros (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                categoria_id INTEGER REFERENCES categorias_seguros(id) ON DELETE CASCADE,
                UNIQUE(nome, categoria_id)
            );
        `);

        // 1. Veículos
        console.log('[PORTAL-MIGRATE] Passo 1: Tabela de Veículos...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS veiculos_base (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                tipo VARCHAR(50) NOT NULL, 
                parent_id INTEGER REFERENCES veiculos_base(id) ON DELETE CASCADE,
                categoria_veiculo VARCHAR(50), 
                fipe_codigo VARCHAR(50)
            );
        `);

        // 2. Organizações e Outros
        console.log('[PORTAL-MIGRATE] Passo 2: Organizações...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS organizacoes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nome VARCHAR(255) NOT NULL,
                logo_url TEXT,
                ativo BOOLEAN DEFAULT TRUE,
                config_json JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
            ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS dominio VARCHAR(255) UNIQUE;
        `);

        // 4. Popular Seguros
        console.log('[PORTAL-MIGRATE] Passo 4: Verificando Dados de Seguros...');
        const checkSeguros = await db.query('SELECT COUNT(*) FROM categorias_seguros');
        if (parseInt(checkSeguros.rows[0].count) < 3) {
            console.log('[PORTAL-MIGRATE] Inserindo Categorias Master...');
            const estruturaSeguros = {
                "Automóvel": ["Carro Passeio", "Pesados", "Moto", "App/Uber"],
                "Transporte": ["Carga", "Logística", "Transporte de Carga"],
                "Patrimoniais": ["Residencial", "Condomínio", "Empresarial"],
                "Vida": ["Vida Individual", "Vida em Grupo", "Saúde"],
                "Responsabilidade Civil": ["RC Profissional", "RC Geral"],
                "Financeiros": ["Fiança Locatícia", "Capitalização"]
            };

            const categoriasOrdem = {
                "Automóvel": 1,
                "Transporte": 2,
                "Patrimoniais": 3,
                "Vida": 4,
                "Responsabilidade Civil": 5,
                "Financeiros": 6
            };

            for (const [categoria, tipos] of Object.entries(estruturaSeguros)) {
                const resCat = await db.query(
                    `INSERT INTO categorias_seguros (nome, ordem) VALUES ($1, $2) ON CONFLICT (nome) DO UPDATE SET ordem = EXCLUDED.ordem RETURNING id`,
                    [categoria, categoriasOrdem[categoria]]
                );
                const catId = resCat.rows[0].id;
                for (const tipo of tipos) {
                    await db.query(`INSERT INTO tipos_seguros (nome, categoria_id) VALUES ($1, $2) ON CONFLICT (nome, categoria_id) DO NOTHING`, [tipo, catId]);
                }
            }
            console.log('[PORTAL-MIGRATE] ✅ Seguros populados.');
        }

        // 5. Popular Marcas
        console.log('[PORTAL-MIGRATE] Passo 5: Verificando Marcas...');
        const checkVeiculos = await db.query('SELECT COUNT(*) FROM veiculos_base');
        if (parseInt(checkVeiculos.rows[0].count) === 0) {
            console.log('[PORTAL-MIGRATE] Inserindo Marcas...');
            const marcas = [
                ['Chevrolet', 'CARRO'], ['Fiat', 'CARRO'], ['Volkswagen', 'CARRO'],
                ['Toyota', 'CARRO'], ['Honda', 'CARRO'], ['Yamaha', 'MOTO']
            ];
            for (const [nome, categoria] of marcas) {
                await db.query(`INSERT INTO veiculos_base (nome, tipo, categoria_veiculo) VALUES ($1, 'MARCA', $2)`, [nome, categoria]);
            }
            console.log('[PORTAL-MIGRATE] ✅ Marcas populadas.');
        }

        // 6. Tabela de Cotações (Estruturada)
        console.log('[PORTAL-MIGRATE] Passo 6: Tabela de Cotações...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS cotacoes (
                id SERIAL PRIMARY KEY,
                cliente_id UUID, -- Opcional: Se for cliente logado
                tipo_cotacao VARCHAR(50) NOT NULL, -- 'NOVA' ou 'RENOVACAO'
                categoria VARCHAR(100) NOT NULL,
                subtipo VARCHAR(100),
                nome_cliente VARCHAR(255) NOT NULL,
                cpf_cliente VARCHAR(20),
                email_cliente VARCHAR(255),
                telefone_cliente VARCHAR(255),
                dados_json JSONB, -- Aqui guardamos o perfil de risco detalhado (Auto, Vida, Res)
                status VARCHAR(50) DEFAULT 'PENDENTE',
                observacoes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ [PORTAL-MIGRATE] Fim da v1.5.2');
        return;
    } catch (error) {
        console.error('❌ [PORTAL] Erro na migração:', error);
        throw error;
    }
}

module.exports = { migrate };
