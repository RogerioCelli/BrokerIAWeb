const db = require('../db');

/**
 * Controller para buscar apólices reais no banco de apólices
 */
const policyController = {
    // Lista todas as apólices do cliente logado pesquisando em múltiplos bancos
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

            let result = null;
            const pools = [
                { name: 'APOLICES_DATABASE_URL', query: db.apolicesQuery },
                { name: 'MASTER_DATABASE_URL', query: db.masterQuery },
                { name: 'DATABASE_URL', query: db.query }
            ];

            for (const pool of pools) {
                try {
                    const resSearch = await pool.query(queryText, [userCpf]);
                    result = resSearch;
                    console.log(`✅ [POLICIES] Tabela encontrada em ${pool.name}`);
                    break;
                } catch (e) {
                    continue; // Tenta o próximo
                }
            }

            if (!result) {
                return res.status(404).json({ error: 'Tabela apolices_brokeria não encontrada em nenhum banco.' });
            }

            res.json(result.rows);
        } catch (error) {
            console.error('[POLICIES-ERROR]', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // Detalhes específicos
    getPolicyDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const { cpf } = req.user;
            const query = `SELECT id_apolice as id, * FROM apolices_brokeria WHERE id_apolice = $1 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = REPLACE(REPLACE($2, '.', ''), '-', '')`;

            let result = null;
            const pools = [db.apolicesQuery, db.masterQuery, db.query];
            for (const q of pools) {
                try {
                    const r = await q(query, [id, cpf]);
                    if (r.rows.length > 0) { result = r; break; }
                } catch (e) { continue; }
            }

            if (!result) return res.status(404).json({ error: 'Não encontrada' });
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Chat IA com Contexto Real
    chatWithAI: async (req, res) => {
        try {
            const { message } = req.body;
            const { cpf: userCpf } = req.user;

            const query = `SELECT numero_apolice, ramo, seguradora, vigencia_fim as data_fim, placa, status_apolice as status FROM apolices_brokeria WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = REPLACE(REPLACE($1, '.', ''), '-', '')`;

            let result = null;
            const pools = [db.apolicesQuery, db.masterQuery, db.query];
            for (const q of pools) {
                try {
                    const r = await q(query, [userCpf]);
                    result = r;
                    break;
                } catch (e) { continue; }
            }

            const policies = result ? result.rows : [];
            const n8nWebhook = process.env.N8N_WEBHOOK_URL;

            const response = await fetch(n8nWebhook, {
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
