const db = require('../db');

/**
 * Controller de Apólices - Versão 1.1.26 (DIAGNÓSTICO DE REDE)
 * Focado em identificar se o erro é isolamento de projeto no Easypanel
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

            // [FIX-FINAL] O N8N provou que as apólices estão no banco de CLIENTES.
            // Redirecionando a busca para a conexão de Clientes.

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
                FROM apolices_brokeria
                WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1
                ORDER BY vigencia_fim DESC
            `;

            // USANDO clientesQuery (Mesmo banco do N8N)
            const { rows } = await db.clientesQuery(queryText, [cleanCpf]);

            // Detalhes
            const enrichedRows = await Promise.all(rows.map(async (p) => {
                try {
                    const { rows: details } = await db.clientesQuery(
                        `SELECT modelo, marca FROM apolices_detalhes_auto WHERE id_apolice = $1`,
                        [p.id]
                    );
                    return { ...p, detalhes_veiculo: details[0] || { modelo: 'N/A', marca: 'N/A', placa: p.placa } };
                } catch (e) {
                    return { ...p, detalhes_veiculo: { modelo: 'N/A', marca: 'N/A', placa: p.placa } };
                }
            }));

            res.json(enrichedRows);

        } catch (error) {
            console.error('[CRITICAL-ERROR]', error.message);

            // RAIO-X: Se a tabela não existe, me mostre o que existe!
            let tablesFound = 'Nenhuma tabela';
            let currentDbName = 'Desconhecido';

            if (error.message.includes('does not exist')) {
                try {
                    const { rows: dbInfo } = await db.clientesQuery('SELECT current_database() as db_name');
                    currentDbName = dbInfo[0].db_name;

                    const { rows } = await db.clientesQuery(`
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    `);
                    tablesFound = rows.map(r => r.table_name).join(', ') || 'Nenhuma (Banco Vazio?)';
                    console.error('[RAIO-X] Tabelas encontradas no banco:', tablesFound);
                } catch (scanErr) {
                    console.error('[RAIO-X] Falha ao escanear:', scanErr.message);
                }
            }

            res.status(500).json({ error: `Erro no Banco (${currentDbName}): ${error.message}. (O que existe lá: ${tablesFound})` });
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
