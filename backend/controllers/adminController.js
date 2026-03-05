const db = require('../db');

const adminController = {
    getAllClients: async (req, res) => {
        try {
            console.log("[ADMIN] Buscando clientes e contando apólices...");

            // 1. Buscar clientes
            const clientQuery = `
                SELECT 
                    id_cliente as id, 
                    nome_completo as nome, 
                    email, 
                    celular,
                    telefone,
                    cpf,
                    data_cadastro
                FROM clientes_brokeria 
                ORDER BY data_cadastro DESC NULLS LAST
                LIMIT 50
            `;
            const { rows: clients } = await db.clientesQuery(clientQuery);

            // 2. Buscar contagem de apólices no outro banco para esses CPFs
            const cpfs = clients.map(c => c.cpf.replace(/\D/g, '')).filter(cpf => cpf);
            let policyCounts = {};

            if (cpfs.length > 0) {
                // Busca simplificada para contagem de todos os CPFs do banco de apólices
                const { rows: counts } = await db.apolicesQuery(`
                    SELECT REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') as cpf_limpo, COUNT(*) as total 
                    FROM apolices_brokeria 
                    GROUP BY cpf_limpo
                `);

                counts.forEach(row => {
                    if (row.cpf_limpo) {
                        policyCounts[row.cpf_limpo] = parseInt(row.total);
                    }
                });
            }

            // 3. Mesclar dados
            const result = clients.map(c => ({
                ...c,
                total_apolices: policyCounts[c.cpf ? c.cpf.replace(/\D/g, '') : ''] || 0
            }));

            res.json(result);
        } catch (error) {
            console.error("[ADMIN] Erro ao buscar clientes:", error);
            res.status(500).json({ error: error.message });
        }
    },

    getClientPolicies: async (req, res) => {
        try {
            const { cpf } = req.params;
            console.log(`[ADMIN] Buscando apólices para o CPF: ${cpf}`);
            const query = `
                SELECT 
                    id_apolice as id,
                    numero_apolice,
                    seguradora,
                    ramo,
                    vigencia_inicio as data_inicio,
                    vigencia_fim as data_fim,
                    status_apolice as status,
                    placa,
                    COALESCE(link_url_apolice, url_pdf, url_link) as link_url_apolice,
                    data_sincronizacao
                FROM apolices_brokeria
                WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = $1
                ORDER BY data_sincronizacao DESC NULLS LAST
            `;
            const cleanCpf = cpf.replace(/\D/g, '');
            const { rows } = await db.apolicesQuery(query, [cleanCpf]);
            res.json(rows);
        } catch (error) {
            console.error("[ADMIN] Erro ao buscar apólices do cliente:", error);
            res.status(500).json({ error: error.message });
        }
    },

    getAllPolicies: async (req, res) => {
        try {
            console.log("[ADMIN] Buscando apólices no host brokeria_apolices...");
            // Conecta ao banco 'apolices-brokeria' (Host brokeria_apolices)
            const query = `
                SELECT 
                    id_apolice as id,
                    numero_apolice,
                    seguradora,
                    ramo,
                    vigencia_inicio as data_inicio,
                    vigencia_fim as data_fim,
                    status_apolice as status,
                    placa,
                    cpf,
                    url_pdf,
                    COALESCE(link_url_apolice, url_pdf, url_link) as link_url_apolice,
                    data_criacao,
                    data_sincronizacao
                FROM apolices_brokeria
                ORDER BY data_sincronizacao DESC NULLS LAST, data_criacao DESC NULLS LAST
                LIMIT 100
            `;
            const { rows } = await db.apolicesQuery(query);
            res.json(rows);
        } catch (error) {
            console.error("[ADMIN] Erro ao buscar apólices:", error);
            res.status(500).json({ error: error.message, database: 'apolices-brokeria' });
        }
    },

    cleanupInvalidLinks: async (req, res) => {
        try {
            console.log("[ADMIN] Executando limpeza de links inválidos no banco de apólices...");
            const query = `
                UPDATE apolices_brokeria 
                SET url_pdf = NULL, link_url_apolice = NULL
                WHERE 
                   (url_pdf LIKE '%demo.brokeria.com.br%' OR url_pdf LIKE '%exemplo.com%' OR url_pdf = 'undefined' OR url_pdf = '')
                   OR
                   (link_url_apolice LIKE '%demo.brokeria.com.br%' OR link_url_apolice LIKE '%exemplo.com%' OR link_url_apolice = 'undefined' OR link_url_apolice = '')
            `;
            const result = await db.apolicesQuery(query);
            res.json({
                success: true,
                message: `Limpeza concluída! ${result.rowCount} registros resetados para 'Pendente'.`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("[ADMIN] Erro na limpeza de links:", error);
            res.status(500).json({ error: error.message });
        }
    },

    syncDriveWithN8N: async (req, res) => {
        try {
            console.log("[ADMIN] Iniciando disparo de trigger para n8n (Sync Drive)...");

            // Webhook do n8n (Placeholder - O usuário deve configurar no .env ou aqui)
            const N8N_WEBHOOK_URL = process.env.N8N_SYNC_WEBHOOK_URL || 'https://n8n.brokeria.com.br/webhook/sync-apolices';
            console.log(`[ADMIN] Chamando n8n em: ${N8N_WEBHOOK_URL}`);

            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    triggered_by: 'admin_portal',
                    timestamp: new Date().toISOString()
                })
            });

            const responseData = await response.text();
            console.log(`[ADMIN] Resposta do n8n (Status ${response.status}):`, responseData);

            if (!response.ok) {
                throw new Error(`Falha ao chamar n8n: ${response.statusText} - ${responseData}`);
            }

            res.json({
                success: true,
                message: "Sync enviado para o n8n com sucesso!"
            });

        } catch (error) {
            console.error("[ADMIN] Erro ao sincronizar com n8n:", error);
            res.status(500).json({
                success: false,
                error: "Não foi possível disparar o n8n. Verifique se o webhook está ativo."
            });
        }
    },

    // --- Gestão de Usuários Administrativos ---

    getPortalUsers: async (req, res) => {
        try {
            const { rows } = await db.query('SELECT id, nome, cpf, email, celular, role, ativo, data_criacao FROM portal_users ORDER BY role DESC, nome ASC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    createPortalUser: async (req, res) => {
        try {
            const { nome, cpf, email, celular, role } = req.body;
            if (!nome || !cpf || !email) return res.status(400).json({ error: 'Dados incompletos' });

            const cleanCpf = cpf.replace(/\D/g, '');
            const cleanCelular = celular ? celular.replace(/\D/g, '') : null;

            await db.query(
                `INSERT INTO portal_users (nome, cpf, email, celular, role) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (cpf) 
                 DO UPDATE SET nome = $1, email = $3, celular = $4, role = $5`,
                [nome, cleanCpf, email, cleanCelular, role || 'admin']
            );

            res.json({ success: true, message: 'Usuário administrativo cadastrado/atualizado!' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deletePortalUser: async (req, res) => {
        try {
            const { id } = req.params;

            // Impedir que o master se delete (opcional, por segurança)
            const check = await db.query('SELECT role FROM portal_users WHERE id = $1', [id]);
            if (check.rows[0]?.role === 'master') {
                return res.status(403).json({ error: 'O usuário MASTER não pode ser removido.' });
            }

            await db.query('DELETE FROM portal_users WHERE id = $1', [id]);
            res.json({ success: true, message: 'Usuário removido com sucesso.' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- ÁREA DE STAGING (IMPORTAÇÕES PENDENTES) ---

    saveToStaging: async (req, res) => {
        try {
            const data = req.body;
            const cliente = data.Segurado || data.cliente || {};
            const apolice = data.DadosApolice || data.apolice || {};

            const nomeSegurado = cliente.NomeCompleto || cliente.nome || "Não Identificado";
            const tipoDoc = apolice.Ramo || data.Identificacao?.TipoDocumento || "Documento";

            await db.query(`
                INSERT INTO importacoes_pendentes (dados_json, tipo_documento, nome_segurado)
                VALUES ($1, $2, $3)
            `, [JSON.stringify(data), tipoDoc, nomeSegurado]);

            res.json({ success: true, message: 'Dados enviados para validação com sucesso!' });
        } catch (error) {
            console.error('[STAGING-SAVE-ERR]', error);
            res.status(500).json({ error: error.message });
        }
    },

    getPendingImports: async (req, res) => {
        try {
            const result = await db.query(`
                SELECT id, nome_segurado, tipo_documento, created_at, status 
                FROM importacoes_pendentes 
                WHERE status = 'PENDENTE'
                ORDER BY created_at DESC
            `);
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getPendingImportDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const result = await db.query('SELECT * FROM importacoes_pendentes WHERE id = $1', [id]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Importação não encontrada' });
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    bulkDeleteImports: async (req, res) => {
        try {
            const { ids } = req.body; // Array de IDs
            if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Nenhum ID fornecido' });

            await db.query('DELETE FROM importacoes_pendentes WHERE id = ANY($1)', [ids]);
            res.json({ success: true, message: `${ids.length} registros removidos.` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    bulkApproveImports: async (req, res) => {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Nenhum ID fornecido' });

        const results = { success: 0, errors: 0 };

        for (const id of ids) {
            try {
                const importRes = await db.query('SELECT dados_json FROM importacoes_pendentes WHERE id = $1', [id]);
                if (importRes.rows.length > 0) {
                    const data = importRes.rows[0].dados_json;

                    // Simula uma requisição interna para reaproveitar a lógica de ingestão
                    const mockReq = { body: data };
                    const mockRes = {
                        json: () => { results.success++; },
                        status: () => ({ json: () => { results.errors++; } })
                    };

                    // Use 'adminController' para chamar o método existente
                    await adminController.ingestPolicyData(mockReq, mockRes);
                    // Marca como processado ou remove
                    await db.query('DELETE FROM importacoes_pendentes WHERE id = $1', [id]);
                }
            } catch (err) {
                console.error(`[BULK-APP-ERR] Erro no ID ${id}:`, err);
                results.errors++;
            }
        }

        res.json({
            success: true,
            message: `Processamento concluído. Sucesso: ${results.success}, Erros: ${results.errors}`,
            details: results
        });
    },


    ingestPolicyData: async (req, res) => {
        try {
            const data = req.body;
            console.log("[INGEST] Recebendo dados para ingestão...");

            // --- Normalização da Estrutura (Compatibilidade com formato hierárquico) ---
            const cliente = data.Segurado || data.cliente || {};
            const apolice = data.DadosApolice || data.apolice || {};
            const item = data.ItemSegurado || data.detalhes_especificos || {};
            const seguradora = data.Seguradora || {};

            // Mapeamento de campos internos (Extraindo do novo padrão)
            const nomeCli = cliente.NomeCompleto || cliente.nome || cliente.nome_completo;
            const docCli = cliente.CPF || cliente.CNPJ || cliente.cpf_cnpj;
            const numApo = apolice.NumeroApolice || apolice.numero_apolice;

            if (!docCli || !numApo) {
                return res.status(400).json({ error: 'Dados obrigatórios ausentes (CPF/CNPJ ou Número da Apólice)' });
            }

            const rawIdentifier = String(docCli).replace(/\D/g, '');
            const isCnpj = rawIdentifier.length === 14;
            const clienteCpf = !isCnpj ? rawIdentifier : null;
            const clienteCnpj = isCnpj ? rawIdentifier : null;

            // Tratamento de Telefones (Múltiplos campos no novo padrão)
            const contatos = cliente.Contatos || {};
            const emailCli = cliente.Email || contatos.Email || cliente.email || null;
            let clienteCelular = (contatos.Celular || cliente.celular || "").replace(/\D/g, '');
            let clienteTelefone = (contatos.TelefoneFixoResidencial || contatos.TelefoneFixoComercial || cliente.telefone_fixo || cliente.telefone || "").replace(/\D/g, '');

            // Endereço (Novo padrão objeto vs antigo flat)
            const end = cliente.EnderecoCompleto || {};
            const enderecoStr = end.Logradouro ? `${end.Logradouro}${end.Numero ? ', ' + end.Numero : ''}` : (cliente.endereco || null);
            const bairro = end.Bairro || cliente.bairro || null;
            const cidade = end.Cidade || cliente.cidade || null;
            const estado = end.Estado || cliente.estado || null;
            const cep = end.CEP ? String(end.CEP).replace(/\D/g, '') : (cliente.cep ? String(cliente.cep).replace(/\D/g, '') : null);

            const clienteNomeEmpresa = isCnpj ? (cliente.nome_empresa || cliente.nome || cliente.NomeCompleto) : null;

            // 1. Buscar ou Criar Cliente
            const existingClient = await db.clientesQuery(`
                SELECT id_cliente FROM clientes_brokeria 
                WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = $1 
                   OR REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '-', ''), ' ', '') = $1
                LIMIT 1
            `, [rawIdentifier]);

            let clienteId;
            if (existingClient.rows.length > 0) {
                clienteId = existingClient.rows[0].id_cliente;
                await db.clientesQuery(`
                    UPDATE clientes_brokeria SET 
                        nome_completo = COALESCE($1, nome_completo),
                        email = COALESCE($2, email),
                        celular = COALESCE($3, celular),
                        telefone = COALESCE($4, telefone),
                        cpf = COALESCE($5, cpf),
                        cnpj = COALESCE($6, cnpj),
                        nome_empresa = COALESCE($7, nome_empresa),
                        data_nascimento = COALESCE($8, data_nascimento),
                        endereco = COALESCE($9, endereco),
                        bairro = COALESCE($10, bairro),
                        cidade = COALESCE($11, cidade),
                        estado = COALESCE($12, estado),
                        cep = COALESCE($13, cep)
                    WHERE id_cliente = $14
                `, [
                    nomeCli, cliente.email || cliente.Email, clienteCelular, clienteTelefone,
                    clienteCpf, clienteCnpj, clienteNomeEmpresa, cliente.data_nascimento || cliente.DataNascimento,
                    enderecoStr, bairro, cidade, estado, cep,
                    clienteId
                ]);
            } else {
                const insertRes = await db.clientesQuery(`
                    INSERT INTO clientes_brokeria (
                        nome_completo, cpf, cnpj, email, celular, telefone, nome_empresa, 
                        data_nascimento, endereco, bairro, cidade, estado, cep, data_cadastro
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                    RETURNING id_cliente
                `, [
                    nomeCli, clienteCpf, clienteCnpj, cliente.email || cliente.Email, clienteCelular, clienteTelefone,
                    clienteNomeEmpresa, cliente.data_nascimento || cliente.DataNascimento, enderecoStr, bairro,
                    cidade, estado, cep
                ]);
                clienteId = insertRes.rows[0].id_cliente;
            }

            // 2. Upsert APOLICE com Máximo de Dados
            // Nota: Campos como RG, Profissao, Renda, NumeroParcelas, etc serão salvos no dados_adicionais_json
            await db.apolicesQuery(`
                INSERT INTO apolices_brokeria (
                    numero_apolice, seguradora, ramo, produto, chassi, premio_total, forma_pagamento,
                    vigencia_inicio, vigencia_fim, status_apolice, cpf, cnpj, placa, id_cliente,
                    dados_adicionais_json, data_criacao, data_ultima_atualizacao
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
                ON CONFLICT (numero_apolice)
                DO UPDATE SET
                    seguradora = EXCLUDED.seguradora,
                    ramo = EXCLUDED.ramo,
                    produto = COALESCE(EXCLUDED.produto, apolices_brokeria.produto),
                    chassi = COALESCE(EXCLUDED.chassi, apolices_brokeria.chassi),
                    premio_total = COALESCE(EXCLUDED.premio_total, apolices_brokeria.premio_total),
                    forma_pagamento = COALESCE(EXCLUDED.forma_pagamento, apolices_brokeria.forma_pagamento),
                    vigencia_inicio = EXCLUDED.vigencia_inicio,
                    vigencia_fim = EXCLUDED.vigencia_fim,
                    status_apolice = EXCLUDED.status_apolice,
                    cpf = EXCLUDED.cpf,
                    cnpj = EXCLUDED.cnpj,
                    placa = COALESCE(EXCLUDED.placa, apolices_brokeria.placa),
                    id_cliente = EXCLUDED.id_cliente,
                    dados_adicionais_json = EXCLUDED.dados_adicionais_json,
                    data_ultima_atualizacao = NOW()
            `, [
                numApo,
                seguradora.Nome || apolice.seguradora || apolice.seguradora?.nome || "Não informada",
                apolice.Ramo || apolice.ramo,
                apolice.NomeProduto || apolice.produto || apolice.nome_produto || null,
                apolice.Chassi || item.Chassi || apolice.chassi || null,
                apolice.ValorPremioTotal || apolice.premio_total || apolice.valor_premio_total || null,
                apolice.FormaPagamento || apolice.forma_pagamento || null,
                apolice.VigenciaInicio || apolice.data_inicio || apolice.vigencia_inicio,
                apolice.VigenciaFim || apolice.data_fim || apolice.vigencia_fim,
                apolice.status || 'ATIVA',
                clienteCpf,
                clienteCnpj,
                item.Placa || item.placa || null,
                clienteId,
                JSON.stringify({
                    ...req.body,
                    ingestion_timestamp: new Date().toISOString()
                })
            ]);

            res.json({
                success: true,
                message: `Ingestão concluída para ${cliente.nome} (Apólice ${apolice.numero_apolice})`
            });

        } catch (error) {
            console.error("[INGEST] Erro na ingestão:", error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = adminController;
