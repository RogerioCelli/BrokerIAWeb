const fs = require('fs');
const path = require('path');
const db = require('../db');

/**
 * Script de Importação de Marcas e Modelos de Veículos
 * Localização: E:\Projetos\Antigravity\BrokerIAWeb\marcas_modelos
 */

const CSV_DIR = path.join(__dirname, '../../marcas_modelos');

const categories = [
    { brand: 'marcas-carros.csv', model: 'modelos-carro.csv', type: 'CARRO' },
    { brand: 'marcas-motos.csv', model: 'modelos-moto.csv', type: 'MOTO' },
    { brand: 'marcas-caminhao.csv', model: 'modelos-caminhao.csv', type: 'CAMINHAO' },
    { brand: 'marcas-nautica.csv', model: 'modelos-nautica.csv', type: 'NAUTICA' }
];

async function run() {
    try {
        console.log('\n--- [VEHICLE-IMPORT] Iniciando Processamento ---');
        console.log(`Pasta de CSVs: ${CSV_DIR}`);

        for (const cat of categories) {
            console.log(`\n[${cat.type}] Lendo marcas...`);

            const brandPath = path.join(CSV_DIR, cat.brand);
            if (!fs.existsSync(brandPath)) {
                console.warn(`[${cat.type}] ⚠️ Arquivo de marcas não encontrado.`);
                continue;
            }

            const brandContent = fs.readFileSync(brandPath, 'utf-8');
            const brandLines = brandContent.split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('ID;'));

            const brandMap = new Map(); // CSV_ID -> DB_ID
            let brandsAdded = 0;

            for (const line of brandLines) {
                const [csvId, name] = line.split(';');
                if (!name) continue;

                const cleanName = name.trim().toUpperCase();

                // Busca se já existe ou insere
                let resBrand = await db.query(
                    'SELECT id FROM veiculos_base WHERE nome = $1 AND tipo = \'MARCA\' AND categoria_veiculo = $2',
                    [cleanName, cat.type]
                );

                let dbId;
                if (resBrand.rows.length === 0) {
                    const insertRes = await db.query(
                        'INSERT INTO veiculos_base (nome, tipo, categoria_veiculo) VALUES ($1, \'MARCA\', $2) RETURNING id',
                        [cleanName, cat.type]
                    );
                    dbId = insertRes.rows[0].id;
                    brandsAdded++;
                } else {
                    dbId = resBrand.rows[0].id;
                }
                brandMap.set(csvId, dbId);
            }
            console.log(`[${cat.type}] ✅ ${brandMap.size} marcas mapeadas (${brandsAdded} novas).`);

            // Modelos
            console.log(`[${cat.type}] Lendo modelos...`);
            const modelPath = path.join(CSV_DIR, cat.model);
            if (!fs.existsSync(modelPath)) {
                console.warn(`[${cat.type}] ⚠️ Arquivo de modelos não encontrado.`);
                continue;
            }

            const modelContent = fs.readFileSync(modelPath, 'utf-8');
            const modelLines = modelContent.split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('ID;'));

            let modelsAdded = 0;
            for (const line of modelLines) {
                const [csvId, brandCsvId, name] = line.split(';');
                if (!name || !brandCsvId) continue;

                const cleanName = name.trim().toUpperCase();
                const parentId = brandMap.get(brandCsvId);

                if (!parentId) continue;

                // Verifica se modelo já existe para este pai
                const resModel = await db.query(
                    'SELECT id FROM veiculos_base WHERE nome = $1 AND tipo = \'MODELO\' AND parent_id = $2',
                    [cleanName, parentId]
                );

                if (resModel.rows.length === 0) {
                    await db.query(
                        'INSERT INTO veiculos_base (nome, tipo, categoria_veiculo, parent_id) VALUES ($1, \'MODELO\', $2, $3)',
                        [cleanName, cat.type, parentId]
                    );
                    modelsAdded++;
                }
            }
            console.log(`[${cat.type}] ✅ ${modelsAdded} novos modelos inseridos.`);
        }

        console.log('\n--- [VEHICLE-IMPORT] ✅ Operação Finalizada ---');
        process.exit(0);
    } catch (err) {
        console.error('\n--- [VEHICLE-IMPORT] ❌ ERRO FATAL ---');
        console.error(err);
        process.exit(1);
    }
}

module.exports = { run };
