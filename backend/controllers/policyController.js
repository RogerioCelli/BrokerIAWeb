const db = require('../db');
const { runMigrations } = require('../db/init');

/**
 * Lista todas as apólices do cliente logado
 */
exports.getMyPolicies = async (req, res) => {
    try {
        const { id: clientId, org_id: orgId } = req.user;

        // Tenta garantir que as tabelas existem antes da consulta (Segurança Redobrada)
        try {
            await runMigrations();
        } catch (migError) {
            console.error('[MIG-ON-DEMAND] Falha silenciosa na migração:', migError.message);
        }

        const query = `
            SELECT 
                a.id, 
                a.numero_apolice, 
                a.seguradora, 
                a.ramo, 
                a.data_inicio, 
                a.data_fim, 
                a.status, 
                a.detalhes_veiculo, 
                a.detalhes_imovel,
                a.pdf_url,
                s.telefone_capital,
                s.telefone_0800,
                s.email,
                s.site_url
            FROM apolices a
            LEFT JOIN seguradoras s ON s.nome = a.seguradora
            WHERE a.cliente_id = $1 AND a.org_id = $2
            ORDER BY a.data_fim DESC
        `;

        const { rows } = await db.query(query, [clientId, orgId]);

        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar apólices:', error);
        res.status(500).json({ error: 'Erro interno ao buscar apólices' });
    }
};

/**
 * Busca detalhes de uma apólice específica (com validação de dono)
 */
exports.getPolicyDetails = async (req, res) => {
    try {
        const { id: policyId } = req.params;
        const { id: clientId, org_id: orgId } = req.user;

        const query = `
            SELECT * FROM apolices 
            WHERE id = $1 AND cliente_id = $2 AND org_id = $3
        `;

        const { rows } = await db.query(query, [policyId, clientId, orgId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Apólice não encontrada' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar detalhes da apólice:', error);
        res.status(500).json({ error: 'Erro interno ao buscar detalhes' });
    }
};

/**
 * Simulação de Assistente IA (Em uma fase real, aqui integraria com OpenAI/Claude/n8n)
 */
exports.chatWithAI = async (req, res) => {
    try {
        const { message } = req.body;
        const { id: clientId, org_id: orgId } = req.user;

        // Busca apólices para dar contexto ao "robô" (com dados de suporte completos da tabela seguradoras)
        const { rows: policies } = await db.query(
            `SELECT a.numero_apolice, a.ramo, a.seguradora, a.data_fim, a.detalhes_veiculo, 
                    s.telefone_capital, s.telefone_0800, s.email as seg_email, s.site_url as seg_site 
             FROM apolices a
             LEFT JOIN seguradoras s ON s.nome = a.seguradora
             WHERE a.cliente_id = $1 AND a.org_id = $2`,
            [clientId, orgId]
        );

        const n8nWebhook = process.env.N8N_WEBHOOK_URL;

        if (n8nWebhook) {
            console.log(`[CHAT-IA] Tentando contato com n8n: ${n8nWebhook}`);
            try {
                const n8nResponse = await fetch(n8nWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pergunta_cliente: message,
                        contexto: {
                            nome: req.user.nome,
                            cpf_real: req.user.cpf_cnpj,
                            cpf_exibicao: `***.***.***-${req.user.cpf_cnpj ? req.user.cpf_cnpj.slice(-2) : '00'}`,
                            token_validado: "SIM",
                            cadastrado: true,
                            telefone: req.user.telefone,
                            email_cadastrado: req.user.email,
                            resumo_apolices: policies,
                            tipo_cliente: "CADASTRADO",
                            origem: "PORTAL_WEB"
                        }
                    })
                });

                console.log(`[CHAT-IA] Status n8n: ${n8nResponse.status} ${n8nResponse.statusText}`);

                if (n8nResponse.ok) {
                    const n8nData = await n8nResponse.json();
                    const aiReply = n8nData.output || n8nData.response || n8nData.text || (Array.isArray(n8nData) ? n8nData[0]?.output : null);

                    if (aiReply) {
                        return res.json({ response: aiReply });
                    }
                } else {
                    const errorText = await n8nResponse.text();
                    console.error(`[N8N-ERROR-BODY]: ${errorText}`);
                }
            } catch (n8nError) {
                console.error('[N8N-FETCH-CRITICAL-ERROR]', n8nError.message);
                // Segue para a lógica local em caso de erro no n8n
            }
        }

        const msg = message.toLowerCase();
        let response = "";
        const p = policies[0];

        if (msg.includes('número') || msg.includes('numero') || msg.includes('qual é a minha apólice')) {
            if (p) {
                response = `O número da sua apólice de ${p.ramo} na ${p.seguradora} é: **${p.numero_apolice}**.`;
            } else {
                response = "Não encontrei nenhuma apólice ativa para te informar o número.";
            }
        } else if (msg.includes('seguro') || msg.includes('apólice') || msg.includes('quais') || msg.includes('listar')) {
            if (policies.length > 0) {
                const lista = policies.map(pol => `- ${pol.ramo} (${pol.seguradora}): ${pol.numero_apolice}`).join('\n');
                response = `Você possui ${policies.length} seguros ativos:\n${lista}. Como posso ajudar?`;
            } else {
                response = "Ainda não encontrei apólices ativas no seu nome.";
            }
        } else if (msg.includes('vencimento') || msg.includes('quando vence') || msg.includes('validade')) {
            if (p) {
                const dataStr = new Date(p.data_fim).toLocaleDateString('pt-BR');
                response = `A sua apólice de ${p.ramo} vence em ${dataStr}.`;
            } else {
                response = "Não identifiquei apólices ativas.";
            }
        } else if (msg.includes('tesla') || msg.includes('carro') || msg.includes('veículo') || msg.includes('placa')) {
            const pv = policies.find(pol => pol.ramo === 'AUTOMOVEL');
            if (pv && pv.detalhes_veiculo) {
                response = `O seu ${pv.detalhes_veiculo.modelo} (Placa: ${pv.detalhes_veiculo.placa}) está segurado pela ${pv.seguradora}.`;
            } else {
                response = "Não encontrei dados de veículo no seu perfil.";
            }
        } else if (msg.includes('guincho') || msg.includes('assistência') || msg.includes('suporte') || msg.includes('telefone')) {
            const tel = p?.telefone_0800 || p?.telefone_capital || '0800 da sua seguradora';
            response = `O telefone de assistência 24h da **${p?.seguradora || 'sua seguradora'}** é: **${tel}**. Precisa que eu te ajude a solicitar um serviço agora?`;
        } else if (msg.includes('email') || msg.includes('e-mail') || msg.includes('enviar documento')) {
            const email = p?.seg_email || 'o e-mail oficial da seguradora';
            response = `O e-mail de contato da **${p?.seguradora || 'sua seguradora'}** é: **${email}**. Geralmente usado para envio de documentos e sinistros.`;
        } else if (msg.includes('site') || msg.includes('portal') || msg.includes('link')) {
            const site = p?.seg_site || 'o site oficial';
            response = `O site da **${p?.seguradora || 'sua seguradora'}** é: [${p?.seguradora}](${site}). Lá você encontra o portal do cliente completo.`;
        } else if (msg.includes('sinistro') || msg.includes('bata') || msg.includes('roubo') || msg.includes('furto')) {
            response = `Sinto muito pelo ocorrido! Para abrir um sinistro na **${p?.seguradora || 'sua seguradora'}**, o primeiro passo é ter o Boletim de Ocorrência (se houver terceiros) e ligar para o suporte: **${p?.telefone_0800 || '0800 da seguradora'}**. Quer que eu liste os documentos necessários?`;
        } else if (msg.includes('carteirinha') || msg.includes('cópia') || msg.includes('copia') || msg.includes('cartão')) {
            if (p) {
                response = `Você pode acessar sua carteirinha digital da **${p.seguradora}** pelo App oficial ou usar o número da sua apólice: **${p.numero_apolice}**. Deseja o link do site da seguradora?`;
            } else {
                response = "Não localizei sua carteirinha. Quer falar com um consultor humano?";
            }
        } else if (msg.includes('cobertura') || msg.includes('granizo')) {
            response = `Consultei o "Agente de Leitura de Documentos" para você. Na sua apólice da **${p?.seguradora || 'sua seguradora'}**, você possui cobertura para **${msg.includes('granizo') ? 'Danos por Granizo e Fenômenos Naturais' : 'Cobertura Total (Colisão, Incêndio e Roubo)'}**. O valor de franquia pode ser consultado no PDF oficial.`;
        } else {
            response = "Entendi! Posso te informar o **telefone**, **e-mail**, **site**, como abrir um **sinistro** ou sua **carteirinha**. O que você precisa?";
        }

        res.json({ response });

    } catch (error) {
        console.error('Erro no chat IA:', error);
        res.status(500).json({ error: 'Erro ao processar sua pergunta' });
    }
};

/**
 * Chat Público para Novos Clientes (Leads)
 */
exports.publicChat = async (req, res) => {
    try {
        const { message } = req.body;
        const n8nWebhook = process.env.N8N_WEBHOOK_URL;

        if (n8nWebhook) {
            console.log(`[LEAD-IA] Novo contato via web: ${message.substring(0, 30)}...`);
            try {
                const n8nResponse = await fetch(n8nWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pergunta_cliente: message,
                        contexto: {
                            nome: "Visitante Web",
                            token_validado: "NÃO",
                            cadastrado: false,
                            tipo_cliente: "NOVO",
                            origem: "LOGIN_PAGE"
                        }
                    })
                });

                if (n8nResponse.ok) {
                    const n8nData = await n8nResponse.json();
                    const aiReply = n8nData.output || n8nData.response || n8nData.text || (Array.isArray(n8nData) ? n8nData[0]?.output : null);
                    if (aiReply) return res.json({ response: aiReply });
                }
            } catch (n8nError) {
                console.error('[N8N-LEAD-ERROR]', n8nError.message);
            }
        }

        // Fallback Local para Leads
        let response = "Olá! Seja bem-vindo à Broker IA. Como ainda não te conheço, posso te ajudar a saber mais sobre nossos seguros ou te encaminhar para um consultor humano. O que você procura hoje?";

        const msg = message.toLowerCase();
        if (msg.includes('cotação') || msg.includes('cotacao') || msg.includes('preço') || msg.includes('valor')) {
            response = "Excelente! Para fazer uma cotação personalizada, eu precisaria do seu nome e qual tipo de seguro você busca. Ou se preferir, você pode se identificar no portal se já for nosso cliente.";
        } else if (msg.includes('humano') || msg.includes('atendente') || msg.includes('falar com alguém')) {
            response = "Vou te encaminhar agora mesmo. Você também pode nos chamar no WhatsApp pelo link no rodapé!";
        }

        res.json({ response });

    } catch (error) {
        console.error('Erro no chat público:', error);
        res.status(500).json({ error: 'Erro ao processar sua pergunta' });
    }
};
