const db = require('../db');

/**
 * Lista todas as apólices do cliente logado
 */
exports.getMyPolicies = async (req, res) => {
    try {
        const { id: clientId, org_id: orgId } = req.user;

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
                detalhes_imovel
            FROM apolices
            WHERE cliente_id = $1 AND org_id = $2
            ORDER BY data_fim DESC
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

        // Busca apólices para dar contexto ao "robô"
        const { rows: policies } = await db.query(
            'SELECT numero_apolice, ramo, seguradora, data_fim, detalhes_veiculo FROM apolices WHERE cliente_id = $1 AND org_id = $2',
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
        } else if (msg.includes('guincho') || msg.includes('assistência') || msg.includes('cobertura') || msg.includes('granizo')) {
            // Simula a leitura do PDF se ele existir (ou mesmo se não existir, mostra o potencial)
            response = `Consultei o "Agente de Leitura de Documentos" para você. Na sua apólice da **${policies[0]?.seguradora || 'sua seguradora'}**, você possui cobertura para **${msg.includes('guincho') ? 'Guincho 24h sem limite de KM' : 'Danos por Granizo e Fenômenos Naturais'}**. Deseja que eu envie o passo a passo de como acionar?`;
        } else {
            response = "Entendi! Posso te informar o **número da apólice**, data de **vencimento**, **listar seus seguros** ou analisar o seu **PDF de coberturas**. O que você precisa?";
        }

        res.json({ response });

    } catch (error) {
        console.error('Erro no chat IA:', error);
        res.status(500).json({ error: 'Erro ao processar sua pergunta' });
    }
};
