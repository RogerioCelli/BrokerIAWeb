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
                    celular as telefone, 
                    cpf
                FROM clientes_brokeria 
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
                    cpf
                FROM apolices_brokeria
                ORDER BY id_apolice DESC
                LIMIT 50
            `;
            const { rows } = await db.apolicesQuery(query);
            res.json(rows);
        } catch (error) {
            console.error("[ADMIN] Erro ao buscar apólices:", error);
            res.status(500).json({ error: error.message, database: 'apolices-brokeria' });
        }
    }
};

module.exports = adminController;
