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
