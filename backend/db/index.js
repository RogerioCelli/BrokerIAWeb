const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Função utilitária para executar queries com segurança.
 * @param {string} text - A query SQL
 * @param {Array} params - Os parâmetros da query
 */
const query = (text, params) => pool.query(text, params);

/**
 * MIDDLEWARE DE ISOLAMENTO (MULTITENANCY)
 * Garante que qualquer query feita no contexto de uma corretora
 * seja filtrada pelo ID da organização.
 */
const tenantFilter = (orgId) => {
    return {
        wrap: (sql) => {
            // Adiciona logicamente o filtro de org_id se não estiver presente
            if (sql.toLowerCase().includes('where')) {
                return sql.replace(/where/i, `WHERE org_id = '${orgId}' AND `);
            }
            return `${sql} WHERE org_id = '${orgId}'`;
        }
    };
};

module.exports = {
    pool,
    query,
    tenantFilter
};
