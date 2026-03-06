const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '../../marcas_modelos');
const OUTPUT_FILE = path.join(__dirname, 'import_veiculos.sql');

const categories = [
    { brand: 'marcas-carros.csv', model: 'modelos-carro.csv', type: 'CARRO' },
    { brand: 'marcas-motos.csv', model: 'modelos-moto.csv', type: 'MOTO' },
    { brand: 'marcas-caminhao.csv', model: 'modelos-caminhao.csv', type: 'CAMINHAO' },
    { brand: 'marcas-nautica.csv', model: 'modelos-nautica.csv', type: 'NAUTICA' }
];

let sql = `-- SCRIPT DE IMPORTAÇÃO DE VEÍCULOS (GERADO AUTOMATICAMENTE)\n`;
sql += `-- LIMPEZA DE TABELA\n`;
sql += `TRUNCATE TABLE veiculos_base RESTART IDENTITY CASCADE;\n\n`;

let currentId = 1;

for (const cat of categories) {
    sql += `-- ==========================================\n`;
    sql += `-- CATEGORIA: ${cat.type}\n`;
    sql += `-- ==========================================\n\n`;

    const brandPath = path.join(CSV_DIR, cat.brand);
    if (!fs.existsSync(brandPath)) {
        console.warn(`Arquivo não encontrado: ${brandPath}`);
        continue;
    }

    const brandLines = fs.readFileSync(brandPath, 'utf-8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('ID;'));

    const brandMap = new Map();

    for (const line of brandLines) {
        const [csvId, name] = line.split(';');
        if (!name) continue;
        const cleanName = name.replace(/'/g, "''").trim().toUpperCase();
        sql += `INSERT INTO veiculos_base (nome, tipo, categoria_veiculo) VALUES ('${cleanName}', 'MARCA', '${cat.type}'); -- ID: ${currentId}\n`;
        brandMap.set(csvId, currentId);
        currentId++;
    }

    sql += `\n`;

    const modelPath = path.join(CSV_DIR, cat.model);
    if (!fs.existsSync(modelPath)) {
        console.warn(`Arquivo não encontrado: ${modelPath}`);
        continue;
    }

    const modelLines = fs.readFileSync(modelPath, 'utf-8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('ID;'));

    for (const line of modelLines) {
        const parts = line.split(';');
        if (parts.length < 3) continue;
        const brandCsvId = parts[1];
        const name = parts[2];

        const parentId = brandMap.get(brandCsvId);
        if (!parentId) continue;

        const cleanName = name.replace(/'/g, "''").trim().toUpperCase();
        sql += `INSERT INTO veiculos_base (nome, tipo, categoria_veiculo, parent_id) VALUES ('${cleanName}', 'MODELO', '${cat.type}', ${parentId});\n`;
        currentId++;
    }
    sql += `\n`;
}

fs.writeFileSync(OUTPUT_FILE, sql);
console.log('✅ SQL gerado com sucesso em: ' + OUTPUT_FILE);
