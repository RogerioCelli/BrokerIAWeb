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
            // Tentando primeiro 'apolices' conforme definido no schema.sql
            const query = `
                SELECT 
                    id,
                    numero_apolice,
                    seguradora,
                    ramo,
                    data_inicio,
                    data_fim,
                    status,
                    detalhes_veiculo,
                    pdf_url
                FROM public.apolices
                WHERE REPLACE(REPLACE(cpf_segurado, '.', ''), '-', '') = REPLACE(REPLACE($1, '.', ''), '-', '')
                ORDER BY data_fim DESC
            `;

            const { rows } = await db.apolicesQuery(query, [userCpf]);

            console.log(`[POLICIES] Encontradas ${rows.length} apólices.`);
            res.json(rows);

        } catch (error) {
            console.error('[POLICIES-ERROR]', error.message);

            // Log diagnóstico SUPER BROAD para Rogério
            if (error.message.includes('relation') || error.message.includes('does not exist')) {
                try {
                    const { rows: allTables } = await db.apolicesQuery(`
                        SELECT table_schema, table_name 
                        FROM information_schema.tables 
                        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
                    `);

                    if (allTables.length === 0) {
                        console.log('[POLICIES-DIAGNOSTIC] CRÍTICO: O banco de dados conectado está VAZIO (zero tabelas em qualquer schema). Verifique se a APOLICES_DATABASE_URL no Easypanel está apontando para o banco correto.');
                    } else {
                        const list = allTables.map(t => `${t.table_schema}.${t.table_name}`).join(', ');
                        console.log('[POLICIES-DIAGNOSTIC] Tabelas encontradas em outros schemas:', list);
                    }

                    // Verificar qual a URL (mascarada) que está sendo usada
                    const url = process.env.APOLICES_DATABASE_URL || "";
                    const maskedUrl = url.replace(/:([^@]+)@/, ':****@').split('?')[0];
                    console.log('[POLICIES-DIAGNOSTIC] Conectado em:', maskedUrl);

                } catch (diagErr) {
                    console.error('[POLICIES-DIAGNOSTIC-ERR]', diagErr.message);
                }
            }

            res.status(500).json({ error: 'Erro ao buscar dados reais de apólices: ' + error.message });
        }
    },

    // Detalhes de uma apólice específica
    getPolicyDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const { cpf } = req.user;

            const query = `
                SELECT * FROM public.apolices 
                WHERE id = $1 AND REPLACE(REPLACE(cpf_segurado, '.', ''), '-', '') = REPLACE(REPLACE($2, '.', ''), '-', '')
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

    // Integração com Chat IA para usuários logados
    chatWithAI: async (req, res) => {
        try {
            const { message } = req.body;
            const { cpf: userCpf } = req.user;

            // Busca contexto real de apólices para a IA
            const { rows: policies } = await db.apolicesQuery(
                `SELECT numero_apolice, ramo, seguradora, data_fim, detalhes_veiculo, status
                 FROM public.apolices 
                 WHERE REPLACE(REPLACE(cpf_segurado, '.', ''), '-', '') = REPLACE(REPLACE($1, '.', ''), '-', '')`,
                [userCpf]
            );

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
