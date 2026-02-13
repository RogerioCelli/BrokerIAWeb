const { Pool } = require('pg');
require('dotenv').config();

/**
 * Função para garantir que a URL do banco existe antes de tentar a query.
 */
function validateDbConfig(name) {
    const url = process.env[name];
    if (!url || url.trim() === "" || url.includes('localhost')) {
        // Fallback para DATABASE_URL se o banco específico não estiver setado (modo unificado)
        if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
        throw new Error(`[CONFIG-ERRO] A variável '${name}' não foi configurada corretamente no Easypanel.`);
    }
    return url;
}

// BANCO UNIFICADO: Todas as consultas agora apontam para o pool único
// Usamos DATABASE_URL como a fonte da verdade para o banco unificado brokeria_db
const poolUnified = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost/missing_db',
    ssl: (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=disable')) ? false : { rejectUnauthorized: false }
});

module.exports = {
    // A query genérica agora usa o pool unificado
    query: (text, params) => {
        validateDbConfig('DATABASE_URL');
        return poolUnified.query(text, params);
    },

    // Mantemos as funções específicas para compatibilidade com os controllers atuais,
    // mas todas agora consultam o MESMO pool unificado.
    portalQuery: (text, params) => poolUnified.query(text, params),
    masterQuery: (text, params) => poolUnified.query(text, params),
    clientesQuery: (text, params) => poolUnified.query(text, params),
    registrosQuery: (text, params) => poolUnified.query(text, params),
    apolicesQuery: (text, params) => poolUnified.query(text, params),

    // Exportamos o pool único e mantemos aliases para não quebrar referências
    poolUnified,
    poolPortal: poolUnified,
    poolMaster: poolUnified,
    poolClientes: poolUnified,
    poolRegistros: poolUnified,
    poolApolices: poolUnified
};
