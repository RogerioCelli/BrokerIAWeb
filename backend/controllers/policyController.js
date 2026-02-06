const db = require('../db');

/**
 * Controller para buscar apólices reais no banco de apólices
 */
const policyController = {
    // Lista todas as apólices do cliente logado (Cruzando com o banco de Apolices)
    getMyPolicies: async (req, res) => {
        try {
            const { cpf: userCpf } = req.user;

            if (!userCpf) {
                return res.status(400).json({ error: 'CPF do usuário não identificado na sessão' });
            }

            console.log(`[POLICIES] Buscando apólices para CPF: ${userCpf}...`);

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

            let result;
            try {
                // Tenta no banco de apólices dedicado
                result = await db.apolicesQuery(queryText, [userCpf]);
            } catch (err) {
                // Se o erro for "tabela não existe", tenta no banco principal do portal
                if (err.message.includes('relation') && err.message.includes('does not exist')) {
                    console.log(`[POLICIES-FALLBACK] Tabela não encontrada no banco dedicado. Tentando no banco principal...`);
                    result = await db.query(queryText, [userCpf]);
                } else {
                    throw err;
                }
            }

            console.log(`[POLICIES] Concluído. Encontradas ${result.rows.length} apólices.`);
            res.json(result.rows);

        } catch (error) {
            console.error('[POLICIES-ERROR]', error.message);
            res.status(500).json({ error: 'Apólices não encontradas: ' + error.message });
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

            let result;
            try {
                result = await db.apolicesQuery(query, [id, cpf]);
            } catch (err) {
                if (err.message.includes('relation')) {
                    result = await db.query(query, [id, cpf]);
                } else {
                    throw err;
                }
            }

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Apólice não encontrada ou acesso negado' });
            }

            res.json(result.rows[0]);

        } catch (error) {
            console.error('[POLICY-DETAIL-ERROR]', error.message);
            res.status(500).json({ error: 'Erro ao buscar detalhes da apólice' });
        }
    },

    // Integração com Chat IA para usuários logados
    chatWithAI: async (req, res) => {
        try {
            const { message } = req.body;
            const { cpf: userCpf } = req.user;

            const query = `SELECT numero_apolice, ramo, seguradora, vigencia_fim as data_fim, placa, status_apolice as status
                 FROM apolices_brokeria 
                 WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = REPLACE(REPLACE($1, '.', ''), '-', '')`;

            let result;
            try {
                result = await db.apolicesQuery(query, [userCpf]);
            } catch (err) {
                if (err.message.includes('relation')) {
                    result = await db.query(query, [userCpf]);
                } else {
                    throw err;
                }
            }
            const policies = result.rows;

            const n8nWebhook = process.env.N8N_WEBHOOK_URL;

            if (n8nWebhook) {
                const n8nResponse = await fetch(n8nWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pergunta_cliente: message,
                        contexto: {
                            nome: req.user.nome,
                            cpf: userCpf,
                            token_validado: "SIM",
                            cadastrado: true,
                            apolices: policies,
                            origem: "PORTAL_WEB_LOGADO"
                        }
                    })
                });

                if (n8nResponse.ok) {
                    const n8nData = await n8nResponse.json();
                    const aiReply = n8nData.output || n8nData.response || n8nData.text;
                    if (aiReply) return res.json({ response: aiReply });
                }
            }

            res.json({ response: "Estou analisando seus dados de seguro. Em que posso ajudar hoje?" });
        } catch (error) {
            console.error('[CHAT-IA-LOGADO-ERR]', error.message);
            res.status(500).json({ error: 'Erro ao processar chat' });
        }
    },

    // Chat Público para Leads
    publicChat: async (req, res) => {
        try {
            const { message } = req.body;
            const n8nWebhook = process.env.N8N_WEBHOOK_URL;

            if (n8nWebhook) {
                const n8nResponse = await fetch(n8nWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pergunta_cliente: message,
                        contexto: {
                            nome: "Visitante Web",
                            token_validado: "NÃO",
                            cadastrado: false,
                            origem: "PORTAL_WEB_PUBLICO"
                        }
                    })
                });

                if (n8nResponse.ok) {
                    const n8nData = await n8nResponse.json();
                    const aiReply = n8nData.output || n8nData.response || n8nData.text;
                    if (aiReply) return res.json({ response: aiReply });
                }
            }

            res.json({ response: "Olá! Como posso ajudar você a proteger o que é importante hoje?" });
        } catch (error) {
            console.error('[CHAT-IA-PUBLIC-ERR]', error.message);
            res.status(500).json({ error: 'Erro ao processar chat' });
        }
    }
};

module.exports = policyController;
