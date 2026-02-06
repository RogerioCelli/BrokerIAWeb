const db = require('../db');

/**
 * Controller para buscar apólices REAIS exclusivamente no banco de apólices
 * Conforme instrução: Consultar apenas em APOLICES_DATABASE_URL
 */
const policyController = {
    // Lista todas as apólices do cliente logado no banco de apólices dedicado
    getMyPolicies: async (req, res) => {
        try {
            const { cpf: userCpf } = req.user;
            if (!userCpf) return res.status(400).json({ error: 'CPF não identificado' });

            const queryText = `
                SELECT 
                    a.id_apolice as id,
                    a.numero_apolice,
                    a.seguradora,
                    a.ramo,
                    a.vigencia_inicio as data_inicio,
                    a.vigencia_fim as data_fim,
                    a.status_apolice as status,
                    a.url_pdf as pdf_url,
                    json_build_object(
                        'modelo', d.modelo,
                        'marca', d.marca,
                        'placa', a.placa
                    ) as detalhes_veiculo
                FROM apolices_brokeria a
                LEFT JOIN apolices_detalhes_auto d ON a.id_apolice = d.id_apolice
                WHERE REPLACE(REPLACE(a.cpf, '.', ''), '-', '') = REPLACE(REPLACE($1, '.', ''), '-', '')
                ORDER BY a.vigencia_fim DESC
            `;

            console.log(`[POLICIES] Consultando banco dedicado APOLICES para CPF: ${userCpf}`);
            const { rows } = await db.apolicesQuery(queryText, [userCpf]);

            res.json(rows);
        } catch (error) {
            console.error('[POLICIES-ERROR]', error.message);
            res.status(500).json({ error: 'Erro no banco de apólices: ' + error.message });
        }
    },

    // Detalhes de uma apólice específica
    getPolicyDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const { cpf } = req.user;
            const query = `
                SELECT 
                    id_apolice as id,
                    * 
                FROM apolices_brokeria 
                WHERE id_apolice = $1 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = REPLACE(REPLACE($2, '.', ''), '-', '')
            `;
            const { rows } = await db.apolicesQuery(query, [id, cpf]);
            if (rows.length === 0) return res.status(404).json({ error: 'Apólice não encontrada' });
            res.json(rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Chat com IA usando contexto do banco de apólices
    chatWithAI: async (req, res) => {
        try {
            const { message } = req.body;
            const { cpf: userCpf } = req.user;

            const query = `
                SELECT numero_apolice, ramo, seguradora, vigencia_fim as data_fim, placa, status_apolice as status 
                FROM apolices_brokeria 
                WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = REPLACE(REPLACE($1, '.', ''), '-', '')
            `;

            const { rows: policies } = await db.apolicesQuery(query, [userCpf]);

            const response = await fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_dashboard',
                    message,
                    user_cpf: userCpf,
                    policies_context: policies
                })
            });

            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = policyController;
