const db = require('./db'); // Ajustado para rodar de dentro de backend/

async function migrate() {
    try {
        console.log('--- Iniciando Criação de Estrutura de Seguros e Veículos ---');

        // 1. Criar Tabelas de Categoria e Tipos de Seguro
        console.log('Criando tabelas de seguros...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS categorias_seguros (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) UNIQUE NOT NULL
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS tipos_seguros (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                categoria_id INTEGER REFERENCES categorias_seguros(id) ON DELETE CASCADE,
                UNIQUE(nome, categoria_id)
            );
        `);

        // 2. Criar Tabela Unificada de Veículos (Estrutura Hierárquica)
        console.log('Criando tabela unificada de veículos...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS veiculos_base (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                tipo VARCHAR(50) NOT NULL, -- MARCA, MODELO, VERSAO
                fipe_codigo VARCHAR(50), 
                parent_id INTEGER REFERENCES veiculos_base(id) ON DELETE CASCADE, -- Auto-relacionamento
                categoria_veiculo VARCHAR(50) -- CARRO, MOTO, CAMINHAO
            );
        `);

        // 3. Popular Categorias e Tipos
        console.log('Populando dados de Seguros...');

        const estruturaSeguros = {
            "Seguros para Pessoas": [
                "Vida Individual", "Vida em Grupo", "Funeral", "Acidentes Pessoais", "Doenças Graves", "Viagem", "Saúde"
            ],
            "Mobilidade e Transporte": [
                "Automóvel", "Moto", "Caminhão", "Frota", "Transporte de Carga"
            ],
            "Patrimoniais": [
                "Residencial", "Condomínio", "Empresarial"
            ],
            "Responsabilidade Civil": [
                "RC Profissional", "RC Geral", "RC Obras", "RC Eventos", "RC D&O (Diretores)"
            ],
            "Rurais": [
                "Agricola", "Pecuário", "Benfeitorias", "Florestas"
            ],
            "Empresas e Negócios": [
                "Riscos de Engenharia", "Garantia", "Lucros Cessantes", "Cyber Risk (Cibernético)"
            ],
            "Financeiros": [
                "Fiança Locatícia", "Capitalização", "Previdência Privada"
            ],
            "Náutico e Aeronáutico": [
                "Embarcações (Casco)", "Aeronáutico (Reta e Casco)"
            ],
            "Especiais": [
                "Equipamentos Portáteis", "Bicicleta", "Animais (Pet)"
            ]
        };

        for (const [categoria, tipos] of Object.entries(estruturaSeguros)) {
            // Inserir Categoria
            const resCat = await db.query(
                `INSERT INTO categorias_seguros (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
                [categoria]
            );
            const catId = resCat.rows[0].id;

            // Inserir Tipos
            for (const tipo of tipos) {
                await db.query(
                    `INSERT INTO tipos_seguros (nome, categoria_id) VALUES ($1, $2) ON CONFLICT (nome, categoria_id) DO NOTHING`,
                    [tipo, catId]
                );
            }
        }

        console.log('✅ Estrutura criada e populada com sucesso!');

        // 4. Inserir Exemplo de Veículos (Apenas para teste)
        console.log('Inserindo exemplos de veículos...');
        const resMarca = await db.query(`
            INSERT INTO veiculos_base (nome, tipo, categoria_veiculo) 
            VALUES ('Chevrolet', 'MARCA', 'CARRO') 
            RETURNING id
        `);

        if (resMarca.rows.length > 0) {
            const marcaId = resMarca.rows[0].id;
            await db.query(`
                INSERT INTO veiculos_base (nome, tipo, parent_id, categoria_veiculo) 
                VALUES ('Onix 1.0 Turbo', 'MODELO', $1, 'CARRO')
            `, [marcaId]);
        }

        console.log('--- Migração Concluída ---');
        return; // Retorna para continuar o startup do servidor
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        throw error; // Lança o erro para ser tratado quem chamou
    }
}

// Exporta a função para ser usada no startup do servidor
module.exports = { migrate };
