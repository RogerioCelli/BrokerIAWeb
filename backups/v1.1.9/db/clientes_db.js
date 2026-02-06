const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Conexão com o Banco de Dados de Clientes (cliente-brokeria)
 */
const pool = new Pool({
    connectionString: process.env.CLIENTES_DATABASE_URL,
    ssl: process.env.CLIENTES_DATABASE_URL && process.env.CLIENTES_DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Ajuste para conexões internas (Easypanel/Docker) que não usam SSL
if (process.env.CLIENTES_DATABASE_URL && (process.env.CLIENTES_DATABASE_URL.includes('brokeria_') || process.env.CLIENTES_DATABASE_URL.includes('sslmode=disable'))) {
    pool.options.ssl = false;
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
