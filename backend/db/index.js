const { Pool } = require('pg');
const path = require('path');
require('dotenv').config(); // Prefira o ambiente real do contêiner

// Debug de Inicialização (Mascarado)
console.log('--- [DB-CHECK] Verificando Configurações de Banco ---');
const checkVar = (name) => {
    const val = process.env[name];
    if (!val || val.trim() === "") {
        console.warn(`⚠️ ALERTA: Variável ${name} NÃO LOCALIZADA ou VAZIA!`);
        return null;
    }
    // Mostra o Host para conferirmos o destino
    const host = val.split('@')[1]?.split(':')[0] || 'host-desconhecido';
    console.log(`✅ ${name}: Configurada (Destino: ${host})`);
    return val;
};

const portalUrl = checkVar('DATABASE_URL');
const masterUrl = checkVar('MASTER_DATABASE_URL');
const clientesUrl = checkVar('CLIENTES_DATABASE_URL');
const registrosUrl = checkVar('REGISTROS_DATABASE_URL');

/**
 * CONEXÃO 1: Banco do Portal (db-brokeriaweb)
 */
const poolPortal = new Pool({ connectionString: portalUrl });

/**
 * CONEXÃO 2: Banco Master (brokeria-seguros)
 */
const poolMaster = new Pool({ connectionString: masterUrl });

/**
 * CONEXÃO 3: Banco de Clientes (cliente-brokeria)
 */
const poolClientes = new Pool({ connectionString: clientesUrl });

/**
 * CONEXÃO 4: Banco de Registros (registros-brokeria)
 */
const poolRegistros = new Pool({ connectionString: registrosUrl });

// Helper para tratar SSL em conexões internas
const disableSSL = (pool) => {
    const connStr = pool.options.connectionString;
    if (!connStr) return;

    // Desabilitar SSL para hosts internos ou se explicitamente solicitado
    if (connStr.includes('brokeria_') || connStr.includes('sslmode=disable') || connStr.includes('127.0.0.1')) {
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
    // Padrão (Portal)
    query: (text, params) => poolPortal.query(text, params),
    poolPortal,
    // Master (Seguros)
    masterQuery: (text, params) => poolMaster.query(text, params),
    poolMaster,
    // Clientes (Identidade)
    clientesQuery: (text, params) => poolClientes.query(text, params),
    poolClientes,
    // Registros (Central)
    registrosQuery: (text, params) => poolRegistros.query(text, params),
    poolRegistros
};
