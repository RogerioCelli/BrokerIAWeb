const db = require('./index');
const { migrate } = require('../migrate'); // Importa a migração de estrutura

/**
 * Função para garantir que o banco de dados esteja com o schema atualizado.
 * Isso evita erros de "tabela não encontrada" após atualizações de versão.
 */
async function runMigrations() {
    try {
        console.log('[DB] Verificando integridade das tabelas...');

        // 0. Rodar Migração de Estrutura de Seguros/Veículos (Automático)
        await migrate();

        // 1. Criar Tabela de Seguradoras se não existir
        await db.query(`
            CREATE TABLE IF NOT EXISTS seguradoras (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nome VARCHAR(100) UNIQUE NOT NULL,
                telefone_capital VARCHAR(20),
                telefone_0800 VARCHAR(20),
                email VARCHAR(255),
                site_url TEXT,
                observacao TEXT,
                ativo BOOLEAN DEFAULT TRUE
            );
        `);

        // 1.1 Criar Tabela de Usuários Administrativos (Portal)
        await db.query(`
            CREATE TABLE IF NOT EXISTS portal_users (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                cpf VARCHAR(20) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                role VARCHAR(20) DEFAULT 'admin', -- 'master' ou 'admin'
                ativo BOOLEAN DEFAULT TRUE,
                data_criacao TIMESTAMP DEFAULT NOW()
            );
        `);

        // 1.2 Popular Usuários Iniciais se a tabela estiver vazia
        const userCheck = await db.query('SELECT COUNT(*) FROM portal_users');
        if (parseInt(userCheck.rows[0].count) === 0) {
            console.log('[DB] Cadastrando usuários administrativos iniciais...');
            const initialAdmins = [
                ['Rogério Celli', '11806562880', 'rogerio.celli@gmail.com', 'master'],
                ['Marcos Nelson', '11111111111', 'marcosnelsonss@gmail.com', 'admin'],
                ['Washington Oliveira', '22222222222', 'dwfcorretoradeseguros@hotmail.com', 'admin'],
                ['Magui CS', '17592369850', 'maguics@gmail.com', 'admin']
            ];

            for (const [nome, cpf, email, role] of initialAdmins) {
                await db.query(`
                    INSERT INTO portal_users (nome, cpf, email, role)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (cpf) DO NOTHING;
                `, [nome, cpf, email, role]);
            }
        }

        // 1.3 Criar Tabela de Tokens de Acesso EXCLUSIVA para Administração
        await db.query(`
            CREATE TABLE IF NOT EXISTS portal_admin_tokens (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES portal_users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL,
                expira_em TIMESTAMP NOT NULL,
                usado BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `).catch(err => console.error('[DB] Erro ao criar portal_admin_tokens:', err));

        // 2. Garantir pdf_url na tabela oficial e adicionar dados de contato na organizacoes
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='apolices_brokeria' AND column_name='data_sincronizacao') THEN
                    -- Como a tabela de apólices é acessada por db.apolicesQuery
                    RAISE NOTICE 'Aguardando criação da coluna data_sincronizacao via apolicesQuery';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='endereco') THEN
                    ALTER TABLE organizacoes ADD COLUMN endereco TEXT;
                    ALTER TABLE organizacoes ADD COLUMN telefone_fixo VARCHAR(20);
                    ALTER TABLE organizacoes ADD COLUMN telefone_celular VARCHAR(20);
                    ALTER TABLE organizacoes ADD COLUMN email_contato VARCHAR(255);
                    ALTER TABLE organizacoes ADD COLUMN website_url TEXT;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='data_sincronizacao') THEN
                     ALTER TABLE organizacoes ADD COLUMN data_sincronizacao TIMESTAMP WITH TIME ZONE;
                END IF;
            END $$;
        `);

        // Garantir a coluna no banco de apólices (DB Externo)
        await db.apolicesQuery(`
            ALTER TABLE apolices_brokeria ADD COLUMN IF NOT EXISTS data_sincronizacao TIMESTAMP WITH TIME ZONE;
        `);

        // 3. Atualizar Org Demo com dados de contato
        await db.query(`
            UPDATE organizacoes SET 
        endereco = 'Av. Paulista, 1000 - São Paulo/SP',
            telefone_fixo = '(11) 4004-0000',
            telefone_celular = '(11) 99999-9999',
            email_contato = 'contato@brokeriaweb.com.br',
            website_url = 'https://brokeriaweb.com.br'
            WHERE slug = 'corretora-demo'
            `);

        // 4. Popular Seguradoras (Se tabela estiver vazia)
        const check = await db.query('SELECT COUNT(*) FROM seguradoras');
        if (parseInt(check.rows[0].count) < 20) {
            console.log('[DB] Populando base mestra de seguradoras...');
            const seguradoras = [
                ['AIG Seguros', null, '0800 726 6130', 'https://www.aig.com.br', 'sac.brasil@aig.com', 'SAC'],
                ['Alfa Seguradora', '4003 2532', '0800 888 2532', 'https://www.segurosalfa.com.br', 'sac@segurosalfa.com.br', 'SAC'],
                ['Allianz', null, '0800 130 700', 'https://www.allianz.com.br', 'sac@allianz.com.br', 'SAC / Assistência'],
                ['Azul Seguros', '4004 3700', '0800 703 0203', 'https://www.azulseguros.com.br', 'atendimento@azulseguros.com.br', 'Auto'],
                ['Aruana Seguradora', null, '0800 701 4887', 'https://www.aruanaseguradora.com.br', 'sac@aruanaseguradora.com.br', 'SAC'],
                ['BB Seguros', null, '0800 729 7000', 'https://www.bbseguros.com.br', 'atendimento@bbseguros.com.br', 'SAC'],
                ['Berkley', null, '0800 777 3123', 'https://www.berkley.com.br', 'sac@berkley.com.br', 'SAC'],
                ['Bradesco Seguros', '4004 2757', '0800 701 2757', 'https://www.bradescoseguros.com.br', 'sac@bradescoseguros.com.br', 'SAC / Sinistro'],
                ['Chubb', null, '0800 055 9091', 'https://www.chubb.com/br', 'sac.brasil@chubb.com', 'SAC'],
                ['Ezze Seguros', null, '0800 702 9985', 'https://www.ezzeseguros.com.br', 'sac@ezzeseguros.com.br', 'SAC'],
                ['Generali', null, '0800 707 0211', 'https://www.generali.com.br', 'sac@generali.com.br', 'SAC'],
                ['HDI Seguros', '3003 5390', '0800 434 4340', 'https://www.hdiseguros.com.br', 'sac@hdiseguros.com.br', 'SAC / Assistência'],
                ['Icatu Seguros', '4002 004', '0800 285 3000', 'https://www.icatuseguros.com.br', 'atendimento@icatu.com.br', 'Vida / Previdência'],
                ['Itaú Seguros', '3003 1010', '0800 720 1010', 'https://www.itauseguros.com.br', 'sac@itauseguros.com.br', 'SAC'],
                ['Justos', null, '0800 591 2259', 'https://www.justos.com.br', 'ajuda@justos.com.br', 'Auto'],
                ['Kovr Seguradora', null, '0800 646 8378', 'https://www.kovr.com.br', 'sac@kovr.com.br', 'Garantia'],
                ['Liberty Seguros', null, '0800 701 4120', 'https://www.libertyseguros.com.br', 'sac@libertyseguros.com.br', 'Assistência'],
                ['MAPFRE', '4002 1000', '0800 775 1000', 'https://www.mapfre.com.br', 'sac@mapfre.com.br', 'SAC'],
                ['Pier', null, '0800 770 9356', 'https://www.pier.digital', 'ajuda@pier.digital', 'Auto'],
                ['Porto Seguro', '4004 7678', '0800 727 0800', 'https://www.portoseguro.com.br', 'sac@portoseguro.com.br', 'SAC / Assistência'],
                ['Previsul', null, '0800 722 0264', 'https://www.previsul.com.br', 'sac@previsul.com.br', 'Vida'],
                ['Sompo', null, '0800 016 2727', 'https://www.sompo.com.br', 'sac@sompo.com.br', 'SAC'],
                ['Suhai', null, '0800 327 8424', 'https://www.suhaiseguradora.com', 'sac@suhaiseguradora.com', 'Auto'],
                ['Sura', null, '0800 774 0772', 'https://www.segurossura.com.br', 'sac@segurossura.com.br', 'SAC'],
                ['Tokio Marine', null, '0800 318 6546', 'https://www.tokiomarine.com.br', 'sac@tokiomarine.com.br', 'SAC'],
                ['Líder DPVAT', null, '0800 022 1204', 'https://www.seguradoralider.com.br', 'dpvat@seguradoralider.com.br', 'Sinistro DPVAT']
            ];

            for (const [nome, cap, tel0800, site, email, obs] of seguradoras) {
                await db.query(`
                    INSERT INTO seguradoras(nome, telefone_capital, telefone_0800, site_url, email, observacao)
        VALUES($1, $2, $3, $4, $5, $6)
                    ON CONFLICT(nome) DO UPDATE SET
        telefone_capital = EXCLUDED.telefone_capital,
            telefone_0800 = EXCLUDED.telefone_0800,
            site_url = EXCLUDED.site_url,
            email = EXCLUDED.email,
            observacao = EXCLUDED.observacao;
        `, [nome, cap, tel0800, site, email, obs]);
            }
        }

        // 5. Garantir Tabela de Apólices (AUTO-FIX para banco vazio)
        try {
            console.log('[DB-AUTOFIX] Verificando existência de apolices_brokeria...');
            const { rows: tableExists } = await db.apolicesQuery(`
                SELECT 1 FROM information_schema.tables WHERE table_name = 'apolices_brokeria'
            `);

            if (tableExists.length === 0) {
                console.log('⚠️ [DB-AUTOFIX] Tabela apolices_brokeria não encontrada no container atual. CRIANDO AGORA...');

                await db.apolicesQuery(`
                    CREATE TABLE IF NOT EXISTS public.apolices_brokeria(
                id_apolice SERIAL PRIMARY KEY,
                numero_apolice VARCHAR(100) NOT NULL UNIQUE,
                seguradora VARCHAR(100) NOT NULL,
                ramo VARCHAR(100) NOT NULL,
                vigencia_inicio DATE NOT NULL,
                vigencia_fim DATE NOT NULL,
                status_apolice VARCHAR(50) DEFAULT 'ATIVA',
                url_pdf TEXT,
                placa VARCHAR(20),
                cpf VARCHAR(20) NOT NULL,
                cliente_nome VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

                await db.apolicesQuery(`
                    CREATE TABLE IF NOT EXISTS public.apolices_detalhes_auto(
            id_detalhe SERIAL PRIMARY KEY,
            id_apolice INTEGER REFERENCES public.apolices_brokeria(id_apolice) ON DELETE CASCADE,
            modelo VARCHAR(150),
            marca VARCHAR(100),
            ano_modelo VARCHAR(4),
            chassi VARCHAR(50)
        );
        `);

                // Inserir dados de exemplo para o CPF do Rogério (se não existir)
                console.log('[DB-AUTOFIX] Inserindo dados de exemplo para teste...');
                await db.apolicesQuery(`
                    INSERT INTO public.apolices_brokeria
            (numero_apolice, seguradora, ramo, vigencia_inicio, vigencia_fim, status_apolice, cpf, placa, cliente_nome, url_pdf)
        VALUES
            ('8026111111111', 'Porto Seguro', 'Automóvel', '2025-01-01', '2026-01-01', 'ATIVA', '11806562280', 'ABC-1234', 'Rogério Celli', 'https://exemplo.com/doc.pdf')
                    ON CONFLICT(numero_apolice) DO NOTHING;
        `);

                // Inserir segundo exemplo para confirmar CPF sem formatação
                await db.apolicesQuery(`
                    INSERT INTO public.apolices_brokeria
            (numero_apolice, seguradora, ramo, vigencia_inicio, vigencia_fim, status_apolice, cpf, placa, cliente_nome)
        VALUES
            ('8026222222222', 'Allianz', 'Residencial', '2025-02-01', '2026-02-01', 'ATIVA', '11806562280', NULL, 'Rogério Celli')
                    ON CONFLICT(numero_apolice) DO NOTHING;
        `);

                console.log('✅ [DB-AUTOFIX] Tabela criada e populada com sucesso!');
            } else {
                console.log('✅ [DB] Tabela apolices_brokeria já existe.');
            }
        } catch (errAutoFix) {
            console.error('❌ [DB-AUTOFIX-ERROR] Falha ao tentar criar tabela:', errAutoFix.message);
        }

        // 6. Verificação final
        console.log('✅ Banco de dados sincronizado e pronto.');
    } catch (error) {
        console.error('❌ Falha ao sincronizar banco de dados:', error);
    }
}

module.exports = { runMigrations };
