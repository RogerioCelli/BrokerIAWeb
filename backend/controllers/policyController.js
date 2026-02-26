const db = require('../db');

/**
 * Controller de Apólices - Versão 1.6.5 (PRODUÇÃO - MULTI-V10)
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

            // Busca dados completos do cliente para enriquecer contexto
            let clienteInfo = { nome: req.user.nome || 'Cliente', email: '', telefone: '' };
            try {
                const clientResult = await db.clientesQuery(
                    `SELECT nome_completo as nome, email, celular as telefone FROM public.clientes_brokeria WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1 LIMIT 1`,
                    [cleanCpf]
                );
                if (clientResult.rows.length > 0) clienteInfo = clientResult.rows[0];
            } catch (e) {
                console.warn('[CHAT] Não foi possível buscar dados do cliente:', e.message);
            }

            console.log(`[CHAT-PORTAL] CPF=${cleanCpf} | MSG="${message.slice(0, 80)}"`);

            // Envia para o n8n com campos que o NormalizarEntrada espera
            const n8nPayload = {
                action: 'chat_dashboard',
                // Campos que o NormalizarEntrada do n8n usa:
                pergunta_cliente: message,
                message: message,
                cpf: cleanCpf,
                identifier: cleanCpf,
                client_name: clienteInfo.nome,
                email: clienteInfo.email,
                telefone: clienteInfo.telefone,
                target: clienteInfo.telefone,
                origem: 'PORTAL_WEB',
                authenticated: true,
                user_id: req.user.id
            };

            const n8nRes = await fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(n8nPayload)
            });

            if (!n8nRes.ok) {
                const errText = await n8nRes.text();
                console.error(`[CHAT-PORTAL] n8n ERROR ${n8nRes.status}:`, errText);
                return res.status(200).json({
                    response: `Erro no Assistente (n8n ${n8nRes.status}). Detalhes: ${errText.slice(0, 100)}... Verifique o log de execuções no n8n.`
                });
            }

            const data = await n8nRes.json();

            // Normaliza a resposta — o n8n pode retornar em vários formatos
            const resposta = data.output || data.response || data.text || data.message
                || (typeof data === 'string' ? data : null)
                || 'Não consegui processar sua mensagem. Tente novamente.';

            res.json({ response: resposta });

        } catch (error) {
            console.error('[CHAT-PORTAL-ERROR]', error.message);
            res.status(200).json({
                response: 'Ocorreu um erro técnico. O assistente voltará em breve.'
            });
        }
    },

    publicChat: async (req, res) => {
        try {
            const { message } = req.body;
            const targetUrl = process.env.N8N_WEBHOOK_URL;

            console.log(`[PUBLIC-CHAT-DEBUG] Iniciando chamada n8n...`);
            console.log(`[PUBLIC-CHAT-DEBUG] URL: ${targetUrl}`);
            console.log(`[PUBLIC-CHAT-DEBUG] MSG recebida: "${message}"`);

            if (!targetUrl) {
                console.error('[PUBLIC-CHAT-ERROR] N8N_WEBHOOK_URL não definida no ambiente!');
                return res.status(200).json({ response: 'Erro de configuração: Webhook não definido.' });
            }

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_publico',
                    message: message,
                    timestamp: new Date().toISOString()
                })
            });

            console.log(`[PUBLIC-CHAT-DEBUG] Status n8n: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[PUBLIC-CHAT-ERROR] n8n retornou erro:`, errText);
                return res.status(200).json({
                    response: 'O assistente está em manutenção técnica. Por favor, tente pelo WhatsApp por enquanto.'
                });
            }

            const data = await response.json();

            // Normaliza a resposta
            const resposta = data.response || data.output || data.text || data.message
                || (typeof data === 'string' ? data : null)
                || 'Olá! No momento não consegui processar sua dúvida. Pode tentar de novo?';

            res.json({ response: resposta });
        } catch (error) {
            console.error('[PUBLIC-CHAT-ERROR]', error.message);
            res.status(200).json({
                response: 'Ocorreu um problema ao conectar com o assistente. Tente novamente mais tarde.'
            });
        }
    }
};

module.exports = policyController;
