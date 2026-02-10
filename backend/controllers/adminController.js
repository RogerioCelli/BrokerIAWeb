const db = require('../db');

const adminController = {
    getAllClients: async (req, res) => {
        try {
            console.log("[ADMIN] Buscando clientes e contando apólices...");

            // 1. Buscar clientes
            const clientQuery = `
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
            const { rows: clients } = await db.clientesQuery(clientQuery);

            // 2. Buscar contagem de apólices no outro banco para esses CPFs
            const cpfs = clients.map(c => c.cpf).filter(cpf => cpf);
            let policyCounts = {};

            if (cpfs.length > 0) {
                const countQuery = `
                    SELECT cpf, COUNT(*) as total 
                    FROM apolices_brokeria 
                    WHERE cpf ANY($1)
                    GROUP BY cpf
                `;
                // Note: Using a slightly different approach for the IN/ANY clause depending on pg driver
                const { rows: counts } = await db.apolicesQuery('SELECT cpf, COUNT(*) as total FROM apolices_brokeria GROUP BY cpf');

                counts.forEach(row => {
                    policyCounts[row.cpf] = parseInt(row.total);
                });
            }

            // 3. Mesclar dados
            const result = clients.map(c => ({
                ...c,
                total_apolices: policyCounts[c.cpf] || 0
            }));

            res.json(result);
        } catch (error) {
            console.error("[ADMIN] Erro ao buscar clientes:", error);
            res.status(500).json({ error: error.message });
        }
    },

    getClientPolicies: async (req, res) => {
        try {
            const { cpf } = req.params;
            console.log(`[ADMIN] Buscando apólices para o CPF: ${cpf}`);
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
                    link_url_apolice,
                    data_sincronizacao
                FROM apolices_brokeria
                WHERE cpf = $1
                ORDER BY data_sincronizacao DESC NULLS LAST
            `;
            const { rows } = await db.apolicesQuery(query, [cpf]);
            res.json(rows);
        } catch (error) {
            console.error("[ADMIN] Erro ao buscar apólices do cliente:", error);
            res.status(500).json({ error: error.message });
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
                    data_criacao,
                    data_sincronizacao
                FROM apolices_brokeria
                ORDER BY data_sincronizacao DESC NULLS LAST, data_criacao DESC NULLS LAST
                LIMIT 100
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
    },

    syncDriveWithN8N: async (req, res) => {
        try {
            console.log("[ADMIN] Iniciando disparo de trigger para n8n (Sync Drive)...");

            // Webhook do n8n (Placeholder - O usuário deve configurar no .env ou aqui)
            const N8N_WEBHOOK_URL = process.env.N8N_SYNC_WEBHOOK_URL || 'https://n8n.brokeria.com.br/webhook/sync-apolices';

            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    triggered_by: 'admin_portal',
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Falha ao chamar n8n: ${response.statusText}`);
            }

            res.json({
                success: true,
                message: "Sync enviado para o n8n com sucesso!"
            });

        } catch (error) {
            console.error("[ADMIN] Erro ao sincronizar com n8n:", error);
            res.status(500).json({
                success: false,
                error: "Não foi possível disparar o n8n. Verifique se o webhook está ativo."
            });
        }
    }
};

module.exports = adminController;
