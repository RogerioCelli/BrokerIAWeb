const db = require('../db');

/**
 * Controller de Apólices - Versão 1.1.24 (SCHEMA DETECTOR)
 * Detecta automaticamente onde a tabela está antes de consultar
 */
const policyController = {
    getMyPolicies: async (req, res) => {
        try {
            const { cpf: userCpf } = req.user;
            if (!userCpf) return res.status(400).json({ error: 'Sessão sem CPF' });

            const cleanCpf = userCpf.replace(/\D/g, '');
            console.log(`[SCHEMA-DETECT] Iniciando busca para CPF: ${cleanCpf}`);

            // 1. DETECTAR SCHEMA
            let tableName = 'apolices_brokeria'; // Fallback
            let schemaTable = 'Nenhuma tabela detectada';

            try {
                const { rows: found } = await db.apolicesQuery(`
                    SELECT table_schema, table_name 
                    FROM information_schema.tables 
                    WHERE table_name = 'apolices_brokeria'
                `);

                if (found.length > 0) {
                    const schema = found[0].table_schema;
                    tableName = `"${schema}"."apolices_brokeria"`;
                    console.log(`✅ [SCHEMA-DETECT] Tabela localizada em: ${tableName}`);
                    schemaTable = tableName;
                } else {
                    console.log(`❌ [SCHEMA-DETECT] Tabela apolices_brokeria NÃO encontrada no information_schema.`);
                    // Vamos tentar listar o que existe para debug
                    const { rows: allTables } = await db.apolicesQuery(`
                        SELECT table_name FROM information_schema.tables 
                        WHERE table_schema = 'public' LIMIT 5
                    `);
                    schemaTable = 'Não encontrada. Visíveis: ' + (allTables.map(t => t.table_name).join(', ') || 'Nenhuma');
                }
            } catch (e) {
                console.error('[SCHEMA-DETECT-ERR]', e.message);
            }

            // 2. CONSULTA BLINDADA
            const queryText = `
                SELECT 
                    id_apolice as id,
                    numero_apolice,
                    seguradora,
                    ramo,
                    vigencia_inicio as data_inicio,
                    vigencia_fim as data_fim,
                    status_apolice as status,
                    url_pdf as pdf_url,
                    placa
                FROM ${tableName}
                WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1
                ORDER BY vigencia_fim DESC
            `;

            const { rows } = await db.apolicesQuery(queryText, [cleanCpf]);

            // Busca detalhes
            const enrichedRows = await Promise.all(rows.map(async (p) => {
                try {
                    const { rows: details } = await db.apolicesQuery(
                        `SELECT modelo, marca FROM apolices_detalhes_auto WHERE id_apolice = $1`,
                        [p.id]
                    );
                    return {
                        ...p,
                        detalhes_veiculo: details.length > 0 ? details[0] : { modelo: 'N/A', marca: 'N/A', placa: p.placa }
                    };
                } catch (e) {
                    return { ...p, detalhes_veiculo: { modelo: 'N/A', marca: 'N/A', placa: p.placa } };
                }
            }));

            res.json(enrichedRows);

        } catch (error) {
            console.error('[POLICIES-CRITICAL]', error.message);
            res.status(500).json({ error: `Erro Crítico: ${error.message}` });
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
            const query = `SELECT numero_apolice, ramo, seguradora, status_apolice as status FROM apolices_brokeria WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1`;
            const { rows: policies } = await db.apolicesQuery(query, [cleanCpf]);

            const response = await fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_dashboard',
                    message,
                    user_cpf: cleanCpf,
                    policies_context: policies
                })
            });
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    publicChat: async (req, res) => {
        try {
            const { message } = req.body;
            const response = await fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'chat_publico', message })
            });
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = policyController;
