const { Pool } = require('pg');
require('dotenv').config();

/**
 * Função para garantir que a URL do banco existe antes de tentar a query.
 */
function validateDbConfig(name) {
    const url = process.env[name];
    if (!url || url.trim() === "" || url.includes('localhost')) {
        throw new Error(`[CONFIG-ERRO] A variável '${name}' não foi configurada corretamente no Easypanel.`);
    }

    // Alerta específico para o banco de apólices solicitado pelo Rogério
    if (name === 'APOLICES_DATABASE_URL' && url.includes('/postgres')) {
        console.warn('⚠️ AVISO: APOLICES_DATABASE_URL ainda está apontando para o banco /postgres. O correto deve ser /apolices-brokeria');
    }

    return url;
}

// Inicializa os pools
const poolPortal = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://localhost/missing_portal' });
const poolMaster = new Pool({ connectionString: process.env.MASTER_DATABASE_URL || 'postgres://localhost/missing_master' });
const poolClientes = new Pool({ connectionString: process.env.CLIENTES_DATABASE_URL || 'postgres://localhost/missing_clientes' });
const poolRegistros = new Pool({ connectionString: process.env.REGISTROS_DATABASE_URL || 'postgres://localhost/missing_registros' });
const poolApolices = new Pool({ connectionString: process.env.APOLICES_DATABASE_URL || 'postgres://localhost/missing_apolices' });

const setupSSL = (pool) => {
    const connStr = pool.options.connectionString;
    if (!connStr || connStr.includes('missing_') || connStr.includes('localhost')) {
        pool.options.ssl = false;
        return;
    }
    if (connStr.includes('brokeria_') || connStr.includes('sslmode=disable')) {
        pool.options.ssl = false;
    } else {
        pool.options.ssl = { rejectUnauthorized: false };
    }
};

[poolPortal, poolMaster, poolClientes, poolRegistros, poolApolices].forEach(setupSSL);

module.exports = {
    query: (text, params) => { validateDbConfig('DATABASE_URL'); return poolPortal.query(text, params); },
    masterQuery: (text, params) => { validateDbConfig('MASTER_DATABASE_URL'); return poolMaster.query(text, params); },
    clientesQuery: (text, params) => { validateDbConfig('CLIENTES_DATABASE_URL'); return poolClientes.query(text, params); },
    registrosQuery: (text, params) => { validateDbConfig('REGISTROS_DATABASE_URL'); return poolRegistros.query(text, params); },
    apolicesQuery: (text, params) => { validateDbConfig('APOLICES_DATABASE_URL'); return poolApolices.query(text, params); },
    poolPortal, poolMaster, poolClientes, poolRegistros, poolApolices
};
