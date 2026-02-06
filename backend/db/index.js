const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * CONEXÃO 1: Banco do Portal (db-brokeriaweb)
 * Onde guardamos tokens, sessões e controle do próprio site.
 */
const poolPortal = new Pool({
    connectionString: process.env.DATABASE_URL, // O banco do Easypanel deste projeto
});

/**
 * CONEXÃO 2: Banco Master (brokeria-seguros)
 * Onde estão as Seguradoras, Categorias e Veículos.
 */
const poolMaster = new Pool({
    connectionString: process.env.MASTER_DATABASE_URL,
});

/**
 * CONEXÃO 3: Banco de Clientes (cliente-brokeria)
 * Onde estão os cadastros de CPF/Email/Telefone.
 */
const poolClientes = new Pool({
    connectionString: process.env.CLIENTES_DATABASE_URL,
});

/**
 * CONEXÃO 4: Banco de Registros (registros-brokeria)
 * Onde o Master salva o histórico e as cotações oficiais.
 */
const poolRegistros = new Pool({
    connectionString: process.env.REGISTROS_DATABASE_URL,
});

// Helper para tratar SSL em conexões internas
const disableSSL = (pool) => {
    if (pool.options.connectionString && (pool.options.connectionString.includes('brokeria_') || pool.options.connectionString.includes('sslmode=disable'))) {
        pool.options.ssl = false;
    } else {
        pool.options.ssl = { rejectUnauthorized: false };
    }
};

disableSSL(poolPortal);
disableSSL(poolMaster);
disableSSL(poolClientes);
disableSSL(poolRegistros);

module.exports = {
    // Padrão (Portal - Sessões/Tokens)
    query: (text, params) => poolPortal.query(text, params),
    poolPortal,
    // Master (Inteligência - Categorias/Seguros)
    masterQuery: (text, params) => poolMaster.query(text, params),
    poolMaster,
    // Clientes (Identidade - CPF/Cadastro)
    clientesQuery: (text, params) => poolClientes.query(text, params),
    poolClientes,
    // Registros (Central de Cotações - Onde o Master e o Portal guardam tudo)
    registrosQuery: (text, params) => poolRegistros.query(text, params),
    poolRegistros
};
