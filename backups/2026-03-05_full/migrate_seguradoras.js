const db = require('./backend/db');

async function migrate() {
    try {
        console.log('--- Iniciando Migração Completa de Seguradoras (V2) ---');

        // 1. Alterar Tabela (Adicionar e-mail)
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seguradoras' AND column_name='email') THEN
                    ALTER TABLE seguradoras ADD COLUMN email VARCHAR(255);
                END IF;
            END $$;
        `);
        console.log('✅ Coluna email verificada/adicionada.');

        // 2. Inserir Dados Completos
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
                INSERT INTO seguradoras (nome, telefone_capital, telefone_0800, site_url, email, observacao)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (nome) DO UPDATE SET 
                    telefone_capital = EXCLUDED.telefone_capital,
                    telefone_0800 = EXCLUDED.telefone_0800,
                    site_url = EXCLUDED.site_url,
                    email = EXCLUDED.email,
                    observacao = EXCLUDED.observacao;
            `, [nome, cap, tel0800, site, email, obs]);
        }
        console.log('✅ Todos os dados atualizados com sucesso.');

        console.log('--- Migração Concluída ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

migrate();
