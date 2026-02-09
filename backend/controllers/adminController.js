const db = require('../db');

const adminController = {
    getAllClients: async (req, res) => {
        try {
            console.log("[ADMIN] Buscando clientes no host brokeria_clientes-postgres...");
            // Conecta ao banco 'cliente-brokeria' (Host brokeria_clientes-postgres)
            const query = `
                SELECT 
                    id_cliente as id, 
                    nome_completo as nome, 
                    email, 
                    celular,
                    telefone,
                    cpf,
                    data_cadastro
                FROM clientes_brokeria 
                ORDER BY data_cadastro DESC NULLS LAST
                LIMIT 50
            `;
            const { rows } = await db.clientesQuery(query);
            res.json(rows);
        } catch (error) {
            console.error("[ADMIN] Erro ao buscar clientes:", error);
            res.status(500).json({ error: error.message, database: 'cliente-brokeria' });
        }
    },

    getAllPolicies: async (req, res) => {
        try {
            console.log("[ADMIN] Buscando apólices no host brokeria_apolices...");
            // Conecta ao banco 'apolices-brokeria' (Host brokeria_apolices)
            const query = `
                SELECT 
                    id_apolice as id,
                    numero_apolice,
                    seguradora,
                    ramo,
                    vigencia_inicio as data_inicio,
                    vigencia_fim as data_fim,
                    status_apolice as status,
                    placa,
                    cpf,
                    url_pdf,
                    link_url_apolice,
                    data_criacao
                FROM apolices_brokeria
                ORDER BY data_criacao DESC NULLS LAST
                LIMIT 50
            `;
            const { rows } = await db.apolicesQuery(query);
            res.json(rows);
        } catch (error) {
            console.error("[ADMIN] Erro ao buscar apólices:", error);
            res.status(500).json({ error: error.message, database: 'apolices-brokeria' });
        }
    },

    cleanupInvalidLinks: async (req, res) => {
        try {
            console.log("[ADMIN] Executando limpeza de links inválidos no banco de apólices...");
            const query = `
                UPDATE apolices_brokeria 
                SET url_pdf = NULL, link_url_apolice = NULL
                WHERE 
                   (url_pdf LIKE '%demo.brokeria.com.br%' OR url_pdf LIKE '%exemplo.com%' OR url_pdf = 'undefined' OR url_pdf = '')
                   OR
                   (link_url_apolice LIKE '%demo.brokeria.com.br%' OR link_url_apolice LIKE '%exemplo.com%' OR link_url_apolice = 'undefined' OR link_url_apolice = '')
            `;
            const result = await db.apolicesQuery(query);
            res.json({
                success: true,
                message: `Limpeza concluída! ${result.rowCount} registros resetados para 'Pendente'.`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("[ADMIN] Erro na limpeza de links:", error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = adminController;
