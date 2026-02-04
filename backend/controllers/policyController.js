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
            'SELECT ramo, seguradora, data_fim, detalhes_veiculo FROM apolices WHERE cliente_id = $1 AND org_id = $2',
            [clientId, orgId]
        );

        const msg = message.toLowerCase();
        let response = "";

        if (msg.includes('seguro') || msg.includes('apólice') || msg.includes('quais')) {
            if (policies.length > 0) {
                const lista = policies.map(p => `- ${p.ramo} na ${p.seguradora}`).join('\n');
                response = `Você possui ${policies.length} seguros ativos comigo:\n${lista}. Como posso ajudar com algum deles?`;
            } else {
                response = "Ainda não encontrei apólices ativas no seu nome. Quer que eu verifique com o time de suporte?";
            }
        } else if (msg.includes('vencimento') || msg.includes('quando vence') || msg.includes('validade')) {
            const p = policies[0];
            if (p) {
                const dataStr = new Date(p.data_fim).toLocaleDateString('pt-BR');
                response = `Sua apólice de ${p.ramo} está protegida até o dia ${dataStr}. Fique tranquilo!`;
            } else {
                response = "Não identifiquei apólices ativas para checar o vencimento.";
            }
        } else if (msg.includes('tesla') || msg.includes('carro') || msg.includes('veículo')) {
            const p = policies.find(p => p.ramo === 'AUTOMOVEL');
            if (p && p.detalhes_veiculo) {
                response = `O seu ${p.detalhes_veiculo.modelo} de placa ${p.detalhes_veiculo.placa} está com cobertura total na ${p.seguradora}.`;
            } else {
                response = "Não encontrei um seguro de automóvel no seu perfil.";
            }
        } else {
            response = "Entendi! Sou o Broker IA e estou aqui para facilitar sua vida. Posso te falar sobre seus vencimentos, coberturas ou listar seus seguros. O que prefere?";
        }

        res.json({ response });

    } catch (error) {
        console.error('Erro no chat IA:', error);
        res.status(500).json({ error: 'Erro ao processar sua pergunta' });
    }
};
