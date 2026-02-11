const db = require('../db');

/**
 * Controller de Apólices - Versão 1.2.0 (PRODUÇÃO - MULTI-V10)
 * Conectado ao banco 'apolices-brokeria' conforme ambiente de produção.
 */
const policyController = {
    getMyPolicies: async (req, res) => {
        try {
            const { cpf: userCpf } = req.user;
            if (!userCpf) return res.status(400).json({ error: 'Sessão sem CPF' });

            const cleanCpf = userCpf.replace(/\D/g, '');
            console.log(`[NETWORK-DIAG] Testando conectividade com banco de apólices para CPF: ${cleanCpf}`);

            // Teste de conexão simples
            try {
                // Tenta um SELECT 1 para ver se o banco responde
                await db.apolicesQuery('SELECT 1');
                console.log('✅ [NETWORK-DIAG] Conexão com banco APOLICES estabelecida com sucesso.');
            } catch (connErr) {
                console.error('❌ [NETWORK-DIAG] Falha de conexão com banco APOLICES:', connErr.message);
                // Se der erro de nome/host, é isolamento de rede
                if (connErr.message.includes('getaddrinfo') || connErr.message.includes('ECONNREFUSED')) {
                    return res.status(500).json({
                        error: 'Erro de Rede: O Portal (Projeto A) não consegue ver o Banco (Projeto B). Use o IP interno ou URL pública.'
                    });
                }
            }

            // Consulta solicitada: SELECT * na apolices_brokeria
            // Consulta Direta (Como funcionava antes)
            const queryText = `SELECT * FROM apolices_brokeria WHERE cpf = $1 ORDER BY vigencia_fim DESC`;

            console.log(`[PORTAL-SEARCH] Buscando apólices para o CPF: ${cleanCpf}`);
            const { rows } = await db.apolicesQuery(queryText, [cleanCpf]);

            console.log(`[PORTAL-SEARCH] Resultado: ${rows.length} apólices found.`);
            res.json(rows);

        } catch (error) {
            console.error('[CRITICAL-ERROR]', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    getPolicyDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `SELECT id_apolice as id, * FROM apolices_brokeria WHERE id_apolice = $1`;
            const { rows } = await db.apolicesQuery(query, [id]);
            res.json(rows[0] || {});
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    chatWithAI: async (req, res) => {
        try {
            const { message } = req.body;
            const cleanCpf = req.user.cpf.replace(/\D/g, '');
            const query = `SELECT numero_apolice, ramo, seguradora, status_apolice as status FROM apolices_brokeria WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1`;
            const { rows: policies } = await db.apolicesQuery(query, [cleanCpf]);

            const response = await fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_dashboard',
                    message,
                    user_cpf: cleanCpf,
                    policies_context: policies
                })
            });
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    publicChat: async (req, res) => {
        try {
            const { message } = req.body;
            const response = await fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'chat_publico', message })
            });
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = policyController;
