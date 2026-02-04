const db = require('../db');

/**
 * Lista todas as apólices do cliente logado
 */
exports.getMyPolicies = async (req, res) => {
    try {
        const { id: clientId, org_id: orgId } = req.user;

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
                s.telefone_0800
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

        // Busca apólices para dar contexto ao "robô" (com dados de suporte da tabela seguradoras)
        const { rows: policies } = await db.query(
            `SELECT a.numero_apolice, a.ramo, a.seguradora, a.data_fim, a.detalhes_veiculo, 
                    s.telefone_capital, s.telefone_0800 
             FROM apolices a
             LEFT JOIN seguradoras s ON s.nome = a.seguradora
             WHERE a.cliente_id = $1 AND a.org_id = $2`,
            [clientId, orgId]
        );

        const msg = message.toLowerCase();
        let response = "";

        if (msg.includes('número') || msg.includes('numero') || msg.includes('qual é a minha apólice')) {
            const p = policies[0];
            if (p) {
                response = `O número da sua apólice de ${p.ramo} na ${p.seguradora} é: **${p.numero_apolice}**.`;
            } else {
                response = "Não encontrei nenhuma apólice ativa para te informar o número.";
            }
        } else if (msg.includes('seguro') || msg.includes('apólice') || msg.includes('quais') || msg.includes('listar')) {
            if (policies.length > 0) {
                const lista = policies.map(p => `- ${p.ramo} (${p.seguradora}): ${p.numero_apolice}`).join('\n');
                response = `Você possui ${policies.length} seguros ativos:\n${lista}. Como posso ajudar?`;
            } else {
                response = "Ainda não encontrei apólices ativas no seu nome.";
            }
        } else if (msg.includes('vencimento') || msg.includes('quando vence') || msg.includes('validade')) {
            const p = policies[0];
            if (p) {
                const dataStr = new Date(p.data_fim).toLocaleDateString('pt-BR');
                response = `A sua apólice de ${p.ramo} vence em ${dataStr}.`;
            } else {
                response = "Não identifiquei apólices ativas.";
            }
        } else if (msg.includes('tesla') || msg.includes('carro') || msg.includes('veículo') || msg.includes('placa')) {
            const p = policies.find(p => p.ramo === 'AUTOMOVEL');
            if (p && p.detalhes_veiculo) {
                response = `O seu ${p.detalhes_veiculo.modelo} (Placa: ${p.detalhes_veiculo.placa}) está segurado pela ${p.seguradora}.`;
            } else {
                response = "Não encontrei dados de veículo no seu perfil.";
            }
        } else if (msg.includes('guincho') || msg.includes('assistência') || msg.includes('suporte') || msg.includes('telefone')) {
            const p = policies[0];
            const tel = p?.telefone_0800 || p?.telefone_capital || '0800 da sua seguradora (ver verso da carteirinha)';
            response = `O telefone de assistência 24h da **${p?.seguradora || 'sua seguradora'}** é: **${tel}**. Precisa que eu te ajude a solicitar um serviço agora?`;
        } else if (msg.includes('sinistro') || msg.includes('bata') || msg.includes('roubo') || msg.includes('furto')) {
            const p = policies[0];
            response = `Sinto muito pelo ocorrido! Para abrir um sinistro na **${p?.seguradora || 'sua seguradora'}**, o primeiro passo é ter o Boletim de Ocorrência (se houver terceiros) e ligar para o suporte. Quer que eu liste os documentos necessários para agilizar o processo?`;
        } else if (msg.includes('carteirinha') || msg.includes('cópia') || msg.includes('copia') || msg.includes('cartão')) {
            const p = policies[0];
            if (p) {
                response = `Você pode acessar sua carteirinha digital da **${p.seguradora}** pelo App oficial deles ou usar o número da sua apólice: **${p.numero_apolice}**. Deseja o link para baixar o App?`;
            } else {
                response = "Não localizei sua carteirinha. Quer falar com um consultor humano?";
            }
        } else if (msg.includes('cobertura') || msg.includes('granizo')) {
            response = `Consultei o "Agente de Leitura de Documentos" para você. Na sua apólice da **${policies[0]?.seguradora || 'sua seguradora'}**, você possui cobertura para **${msg.includes('granizo') ? 'Danos por Granizo e Fenômenos Naturais' : 'Cobertura Total (Colisão, Incêndio e Roubo)'}**. O valor de franquia pode ser consultado no PDF oficial.`;
        } else {
            response = "Entendi! Posso te informar o **telefone de suporte**, como abrir um **sinistro**, sua **carteirinha** ou analisar o seu **PDF de coberturas**. O que você precisa?";
        }

        res.json({ response });

    } catch (error) {
        console.error('Erro no chat IA:', error);
        res.status(500).json({ error: 'Erro ao processar sua pergunta' });
    }
};
