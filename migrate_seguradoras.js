const db = require('./backend/db');

async function migrate() {
    try {
        console.log('--- Iniciando Migração de Seguradoras ---');

        // 1. Criar Tabela
        await db.query(`
            CREATE TABLE IF NOT EXISTS seguradoras (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nome VARCHAR(100) UNIQUE NOT NULL,
                telefone_capital VARCHAR(20),
                telefone_0800 VARCHAR(20),
                observacao TEXT,
                site_url TEXT,
                ativo BOOLEAN DEFAULT TRUE
            );
        `);
        console.log('✅ Tabela seguradoras criada/verificada.');

        // 2. Inserir Dados
        const seguradoras = [
            ['AIG Seguros', null, '0800 726 6130', 'SAC'],
            ['Alfa Seguradora', '4003 2532', '0800 888 2532', 'SAC'],
            ['Allianz', null, '0800 130 700', 'SAC / Assistência'],
            ['Azul Seguros', '4004 3700', '0800 703 0203', 'Auto'],
            ['Aruana Seguradora', null, '0800 701 4887', 'SAC'],
            ['BB Seguros', null, '0800 729 7000', 'SAC'],
            ['Berkley', null, '0800 777 3123', 'SAC'],
            ['Bradesco Seguros', '4004 2757', '0800 701 2757', 'SAC / Sinistro'],
            ['Chubb', null, '0800 055 9091', 'SAC'],
            ['Ezze Seguros', null, '0800 702 9985', 'SAC'],
            ['Generali', null, '0800 707 0211', 'SAC'],
            ['HDI Seguros', '3003 5390', '0800 434 4340', 'SAC / Assistência'],
            ['Icatu Seguros', '4002 004', '0800 285 3000', 'Vida / Previdência'],
            ['Itaú Seguros', '3003 1010', '0800 720 1010', 'SAC'],
            ['Justos', null, '0800 591 2259', 'Auto'],
            ['Kovr Seguradora', null, '0800 646 8378', 'Garantia'],
            ['Liberty Seguros', null, '0800 701 4120', 'Assistência'],
            ['MAPFRE', '4002 1000', '0800 775 1000', 'SAC'],
            ['Pier', null, '0800 770 9356', 'Auto'],
            ['Porto Seguro', '4004 7678', '0800 727 0800', 'SAC / Assistência'],
            ['Previsul', null, '0800 722 0264', 'Vida'],
            ['Sompo', null, '0800 016 2727', 'SAC'],
            ['Suhai', null, '0800 327 8424', 'Auto'],
            ['Sura', null, '0800 774 0772', 'SAC'],
            ['Tokio Marine', null, '0800 318 6546', 'SAC'],
            ['Líder DPVAT', null, '0800 022 1204', 'Sinistro DPVAT']
        ];

        for (const [nome, cap, tel0800, obs] of seguradoras) {
            await db.query(`
                INSERT INTO seguradoras (nome, telefone_capital, telefone_0800, observacao)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (nome) DO UPDATE SET 
                    telefone_capital = EXCLUDED.telefone_capital,
                    telefone_0800 = EXCLUDED.telefone_0800,
                    observacao = EXCLUDED.observacao;
            `, [nome, cap, tel0800, obs]);
        }
        console.log('✅ Dados das seguradoras inseridos/atualizados.');

        // 3. Adicionar coluna pdf_url se não existir (para funcionalidade de PDF que mencionei antes)
        await db.query(`ALTER TABLE apolices ADD COLUMN IF NOT EXISTS pdf_url TEXT;`);
        console.log('✅ Coluna pdf_url verificada.');

        console.log('--- Migração Concluída com Sucesso ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

migrate();
