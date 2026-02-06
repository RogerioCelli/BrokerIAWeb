const db = require('../db');

/**
 * Controller para buscar apólices reais no banco de apólices
 */
const policyController = {
    // Lista todas as apólices do cliente logado (Cruzando com o banco de Apolices)
    getMyPolicies: async (req, res) => {
        try {
            // O req.user vem do authMiddleware (contendo id, cpf, etc.)
            const { cpf: userCpf } = req.user;

            if (!userCpf) {
                return res.status(400).json({ error: 'CPF do usuário não identificado na sessão' });
            }

            console.log(`[POLICIES] Buscando apólices para CPF: ${userCpf}...`);

            // Consulta no BANCO DE APOLICES (apolicesQuery)
            // A tabela pode se chamar 'apolices_brokeria' ou 'public.apolices_brokeria'
            const query = `
                SELECT 
                    id_apolice as id,
                    numero_apolice,
                    seguradora,
                    ramo,
                    data_inicio,
                    data_fim,
                    status_apolice as status,
                    detalhes_veiculo,
                    pdf_url
                FROM public.apolices_brokeria
                WHERE REPLACE(REPLACE(cpf_segurado, '.', ''), '-', '') = REPLACE(REPLACE($1, '.', ''), '-', '')
                ORDER BY data_fim DESC
            `;

            const { rows } = await db.apolicesQuery(query, [userCpf]);

            console.log(`[POLICIES] Encontradas ${rows.length} apólices.`);
            res.json(rows);

        } catch (error) {
            console.error('[POLICIES-ERROR]', error.message);
            res.status(500).json({ error: 'Erro ao buscar dados reais de apólices' });
        }
    },

    // Detalhes de uma apólice específica
    getPolicyDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const { cpf } = req.user;

            const query = `
                SELECT * FROM public.apolices_brokeria 
                WHERE id_apolice = $1 AND REPLACE(REPLACE(cpf_segurado, '.', ''), '-', '') = REPLACE(REPLACE($2, '.', ''), '-', '')
            `;

            const { rows } = await db.apolicesQuery(query, [id, cpf]);

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Apólice não encontrada ou acesso negado' });
            }

            res.json(rows[0]);

        } catch (error) {
            console.error('[POLICY-DETAIL-ERROR]', error.message);
            res.status(500).json({ error: 'Erro ao buscar detalhes da apólice' });
        }
    },

    // Integração com Chat IA (pode ser expandida conforme o n8n for configurado)
    chatWithAI: async (req, res) => {
        // ... Lógica similar ao chat anterior, mas buscando contexto no banco de apólices real ...
        res.json({ response: "O Agente de IA está sendo conectado aos seus dados reais. Em breve poderei responder tudo sobre elas!" });
    }
};

module.exports = policyController;
