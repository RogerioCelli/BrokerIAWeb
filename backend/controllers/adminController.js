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

    normalizeData: (raw) => {
        if (!raw) return { Segurado: {}, DadosApolice: {}, Endereco: {}, BemAuto: {} };
        let data = typeof raw === 'string' ? JSON.parse(raw) : raw;

        // n8n frequentemente envia um array com um objeto dentro
        if (Array.isArray(data)) data = data[0];
        if (!data) return { Segurado: {}, DadosApolice: {}, Endereco: {}, BemAuto: {} };

        // Suporte para wrapper "OrganizaDados" (Case Insensitive)
        const wrapperKey = Object.keys(data).find(k => k.toLowerCase() === 'organizadados');
        if (wrapperKey) data = data[wrapperKey];

        // Se após extrair o wrapper ainda for array
        if (Array.isArray(data)) data = data[0];

        // ─── HELPER: busca chave case-insensitive em um objeto ───────────────
        const getKey = (obj, ...aliases) => {
            if (!obj || typeof obj !== 'object') return undefined;
            const found = Object.keys(obj).find(k => aliases.includes(k.toLowerCase()));
            return found ? obj[found] : undefined;
        };

        const norm = { Segurado: {}, DadosApolice: {}, Endereco: {}, BemAuto: {}, Extras: {} };

        // ─── 1. IDENTIFICACAO / Segurado ─────────────────────────────────────
        const iden = getKey(data, 'segurado', 'identificacao', 'identificação', 'cliente') || data;

        const cpfRaw = String(iden.cpf || iden.CPF || iden.cpf_cnpj || iden.CPF_CNPJ || '').replace(/\D/g, '');
        const cnpjRaw = String(iden.cnpj || iden.CNPJ || '').replace(/\D/g, '');
        const docRaw = cpfRaw || cnpjRaw || '';

        norm.Segurado.NomeCompleto = iden.nome || iden.Nome || iden.Nome_Segurado || iden.NomeCompleto || iden.nome_completo || 'Não Identificado';
        if (docRaw.length === 11) norm.Segurado.CPF = docRaw;
        else if (docRaw.length === 14) norm.Segurado.CNPJ = docRaw;

        norm.Segurado.RG = iden.rg || iden.RG || '';
        norm.Segurado.DataNascimento = iden.data_nascimento || iden.DataNascimento || null;
        norm.Segurado.Profissao = iden.profissao || iden.Profissao || '';
        norm.Segurado.EstadoCivil = iden.estado_civil || iden.Estado_Civil || '';

        // Suporte para extras (novo n8n)
        const extrasBlock = data.extras || getKey(data, 'outros') || {};
        norm.Segurado.CPFConjuge = extrasBlock.cpf_conjuge || iden.cpf_conjuge || iden.CPF_Conjuge || '';

        // ─── 2. CONTATOS ─────────────────────────────────────────────────────
        const cont = getKey(data, 'contatos_segurado', 'contatos') || iden.Contatos || iden.contatos || {};
        const emails = cont.emails || cont.Emails || [];

        norm.Segurado.Email = (Array.isArray(emails) ? emails[0] : emails) || cont.email || cont.Email || iden.email || iden.Email || '';
        norm.Segurado.Email2 = (Array.isArray(emails) && emails.length > 1 ? emails[1] : '');

        norm.Segurado.Celular = cont.celular || cont.Celular || iden.celular || iden.Celular || '';

        const comPhone = cont.telefone_comercial || cont.Telefone_Comercial || '';
        const resPhone = cont.telefone_residencial || cont.Telefone_Residencial || '';
        norm.Segurado.TelefoneFixo = comPhone || resPhone || '';
        norm.Segurado.Telefone2 = comPhone && resPhone ? resPhone : '';

        // ─── 3. ENDERECO ─────────────────────────────────────────────────────
        let endObj = getKey(data, 'enderecos_segurado', 'endereco_principal', 'endereco', 'enderecocompleto') || iden.Endereco || iden.Endereço || {};
        // novo n8n manda um array de enderecos
        if (Array.isArray(endObj) && endObj.length > 0) endObj = endObj[0];

        norm.Endereco.Logradouro = endObj.logradouro || endObj.Logradouro || '';
        norm.Endereco.Numero = endObj.numero || endObj.Numero || '';
        norm.Endereco.Complemento = endObj.complemento || endObj.Complemento || '';
        norm.Endereco.Bairro = endObj.bairro || endObj.Bairro || '';
        norm.Endereco.Cidade = endObj.cidade || endObj.Cidade || '';
        norm.Endereco.Estado = endObj.estado || endObj.Estado || '';
        norm.Endereco.CEP = String(endObj.cep || endObj.CEP || '').replace(/\D/g, '');

        // ─── 4. DADOS_DA_APOLICE ─────────────────────────────────────────────
        const apol = getKey(data, 'dados_apolice', 'dados_da_apolice', 'dados_da_apólice', 'dadosapolice', 'apolice') || {};
        norm.DadosApolice.NumeroApolice = apol.numero_apolice || apol.Numero || apol.NumeroApolice || apol.numero || '';
        const segRaw = apol.seguradora || apol.Seguradora || '';
        norm.DadosApolice.Seguradora = (typeof segRaw === 'object' && segRaw !== null) ? (segRaw.nome || segRaw.Nome || JSON.stringify(segRaw)) : segRaw;
        norm.DadosApolice.Ramo = apol.ramo || apol.Ramo || '';
        norm.DadosApolice.NomeProduto = apol.nome_produto || apol.Nome_do_Produto || apol.NomeProduto || apol.produto || '';
        norm.DadosApolice.ValorPremioTotal = apol.premio_total || apol.Valor_Premio_Total || apol.ValorPremioTotal || apol.valor_premio_total || '';
        norm.DadosApolice.FormaPagamento = apol.forma_pagamento || apol.Forma_Pagamento || apol.FormaPagamento || '';
        norm.DadosApolice.NumeroParcelas = apol.numero_parcelas || apol.Numero_Parcelas || apol.NumeroParcelas || '';
        norm.DadosApolice.FrequenciaPagamento = apol.frequencia_pagamento || apol.Frequencia_Pagamento || '';
        norm.DadosApolice.NumeroProposta = apol.numero_proposta || apol.Numero_Proposta || '';

        // Opcional do bloco de extras do novo n8n
        if (!norm.DadosApolice.NumeroProposta && extrasBlock.documento_informacoes) {
            norm.DadosApolice.NumeroProposta = extrasBlock.documento_informacoes.numero_proposta_endosso || '';
        }

        norm.DadosApolice.VigenciaInicio = apol.vigencia_inicio || apol.Vigencia_Inicio || apol.VigenciaInicio || '';
        norm.DadosApolice.VigenciaFim = apol.vigencia_fim || apol.Vigencia_Fim || apol.VigenciaFim || '';

        // ─── 5. DADOS_DO_BEM_AUTO ────────────────────────────────────────────
        const auto = getKey(data, 'dados_bem_auto', 'dados_do_bem_auto', 'bemauto', 'itemsegurado') || {};
        norm.BemAuto.Placa = auto.placa || auto.Placa || '';
        norm.BemAuto.Chassi = auto.chassi || auto.Chassi || '';
        norm.BemAuto.Modelo = auto.modelo || auto.Modelo || '';
        norm.BemAuto.Fabricante = auto.fabricante || auto.Fabricante || '';
        norm.BemAuto.AnoModelo = auto.ano_modelo || auto.Ano_Modelo || auto.AnoModelo || '';
        norm.BemAuto.AnoFabricacao = auto.ano_fabricacao || auto.Ano_Fabricacao || auto.AnoFabricacao || '';
        norm.BemAuto.Renavam = auto.renavam || auto.Renavam || '';
        norm.BemAuto.CodigoFIPE = auto.codigo_fipe || auto.Codigo_FIPE || auto.CodigoFIPE || '';
        norm.BemAuto.CorVeiculo = auto.cor || auto.Cor || auto.cor_veiculo || '';
        norm.BemAuto.Combustivel = auto.combustivel || auto.Combustivel || '';
        norm.BemAuto.Kilometragem = auto.kilometragem || auto.Kilometragem || '';
        norm.BemAuto.Blindado = auto.blindado || auto.Blindado || false;
        norm.BemAuto.KitGas = auto.kit_gas || auto.Kit_Gas || false;
        norm.BemAuto.CambioAutomatico = auto.cambio_automatico || auto.Cambio_Automatico || false;

        // Franquia geral
        let franq = auto.franquia_geral || auto.Franquia_Tipo || auto.franquia_tipo || '';
        if (!franq && Array.isArray(data.franquias) && data.franquias.length > 0) {
            franq = data.franquias.map(f => `${f.tipo}: ${f.valor}`).join(', ');
        }
        norm.BemAuto.FranquiaTipo = franq;

        // ─── 6. EXTRAS ───────────────────────────────────────────────────────
        norm.Extras = {
            Corretor: extrasBlock.corretora || extrasBlock.Corretor || {},
            Coberturas: Array.isArray(data.coberturas) ? data.coberturas.map(c => typeof c === 'string' ? c : `${c.tipo}${c.limite_indenizacao ? ` (${c.limite_indenizacao})` : ''}`) : (extrasBlock.Coberturas_Principais || extrasBlock.coberturas || []),
            Condutor: data.condutores || extrasBlock.Principal_Condutor || extrasBlock.condutor || {},
            DadosAdicionais: extrasBlock.dados_bancarios_debito || extrasBlock.OutrosDados || extrasBlock
        };

        return norm;

    },

    saveToStaging: async (req, res) => {
        try {
            let data = req.body;
            console.log(`[STAGING] Recebendo carga de: ${typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : data}`);

            // Se for array do n8n, descompacta
            if (Array.isArray(data)) data = data[0];

            const norm = adminController.normalizeData(data);

            const nomeSegurado = norm.Segurado.NomeCompleto || norm.Segurado.nome || "Não Identificado";
            const tipoDoc = norm.DadosApolice.Ramo || data.Identificacao?.TipoDocumento || "Documento";

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
                SELECT id, nome_segurado, tipo_documento, created_at, status, dados_json 
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
            const rawData = req.body;
            console.log("[INGEST] Recebendo dados para ingestão...");

            // Normalização Obrigatória (suporta formato antigo e novo MAIUSCULO)
            const norm = adminController.normalizeData(rawData);
            const cliente = norm.Segurado;
            const apolice = norm.DadosApolice;
            // Campos directos do rawBody para retrocompatibilidade com v19
            const item = rawData.ItemSegurado || rawData.detalhes_especificos || rawData.DADOS_DO_BEM_AUTO || {};
            const seguradora = rawData.Seguradora || {};

            const nomeCli = cliente.NomeCompleto;
            const docCliRaw = String(cliente.CPF || cliente.CNPJ || '');
            const numApo = apolice.NumeroApolice;

            const rawIdentifier = docCliRaw.replace(/\D/g, '');

            if (!rawIdentifier || (rawIdentifier.length !== 11 && rawIdentifier.length !== 14) || !numApo) {
                return res.status(400).json({ error: 'Dados obrigatórios ausentes ou inválidos. CPF precisa ter 11 dígitos, CNPJ 14 dígitos, e Número da Apólice é obrigatório.' });
            }

            const isCnpj = rawIdentifier.length === 14;
            const clienteCpf = !isCnpj ? rawIdentifier : null;
            const clienteCnpj = isCnpj ? rawIdentifier : null;

            // Tratamento de Telefones — suporta formato normalizado e formato v19 direto
            const emailCli = cliente.Email || null;
            const clienteCelular = String(cliente.Celular || '').replace(/\D/g, '');
            const clienteTelefone = String(cliente.TelefoneFixo || '').replace(/\D/g, '');

            // Endereço — usa Endereco normalizado (cobre ambos os formatos)
            const endNorm = norm.Endereco;
            const enderecoStr = endNorm.Logradouro
                ? `${endNorm.Logradouro}${endNorm.Numero ? ', ' + endNorm.Numero : ''}${endNorm.Complemento ? ' ' + endNorm.Complemento : ''}`
                : null;
            const bairro = endNorm.Bairro || null;
            const cidade = endNorm.Cidade || null;
            const estado = endNorm.Estado || null;
            const cep = endNorm.CEP || null;

            const clienteNomeEmpresa = isCnpj ? nomeCli : null;

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
                        celular = COALESCE($3, celular) ,
                        telefone = COALESCE($4, telefone),
                        cpf = COALESCE($5, cpf),
                        cnpj = COALESCE($6, cnpj),
                        nome_empresa = COALESCE($7, nome_empresa),
                        data_nascimento = COALESCE($8, data_nascimento),
                        endereco = COALESCE($9, endereco),
                        bairro = COALESCE($10, bairro),
                        cidade = COALESCE($11, cidade),
                        estado = COALESCE($12, estado),
                        cep = COALESCE($13, cep),
                        rg = COALESCE($14, rg),
                        profissao = COALESCE($15, profissao),
                        estado_civil = COALESCE($16, estado_civil),
                        telefone2 = COALESCE($17, telefone2),
                        email2 = COALESCE($18, email2),
                        cpf_conjuge = COALESCE($19, cpf_conjuge)
                    WHERE id_cliente = $20
                `, [
                    nomeCli, emailCli, clienteCelular, clienteTelefone,
                    clienteCpf, clienteCnpj, clienteNomeEmpresa, cliente.DataNascimento || null,
                    enderecoStr, bairro, cidade, estado, cep,
                    cliente.RG, cliente.Profissao, cliente.EstadoCivil, cliente.Telefone2, cliente.Email2, cliente.CPFConjuge,
                    clienteId
                ]);
            } else {
                const insertRes = await db.clientesQuery(`
                    INSERT INTO clientes_brokeria (
                        nome_completo, cpf, cnpj, email, celular, telefone, nome_empresa, 
                        data_nascimento, endereco, bairro, cidade, estado, cep, 
                        rg, profissao, estado_civil, telefone2, email2, cpf_conjuge,
                        data_cadastro
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
                    RETURNING id_cliente
                `, [
                    nomeCli, clienteCpf, clienteCnpj, emailCli, clienteCelular, clienteTelefone,
                    clienteNomeEmpresa, cliente.DataNascimento || null, enderecoStr, bairro,
                    cidade, estado, cep,
                    cliente.RG, cliente.Profissao, cliente.EstadoCivil, cliente.Telefone2, cliente.Email2, cliente.CPFConjuge
                ]);
                clienteId = insertRes.rows[0].id_cliente;
            }

            // 2. Upsert APOLICE com Máximo de Dados
            const bem = norm.BemAuto;
            const extras = norm.Extras || {};

            await db.apolicesQuery(`
                INSERT INTO apolices_brokeria (
                    numero_apolice, seguradora, ramo, produto, chassi, premio_total, forma_pagamento,
                    vigencia_inicio, vigencia_fim, status_apolice, cpf, cnpj, placa, id_cliente,
                    modelo, fabricante, ano_modelo, ano_fabricacao, cor_veiculo, combustivel,
                    codigo_fipe, renavam, kilometragem, blindado, kit_gas, cambio_automatico,
                    franquia_tipo, numero_parcelas, frequencia_pagamento, numero_proposta,
                    corretor_nome, corretor_codigo, coberturas, condutor_detalhes, dados_adicionais,
                    data_criacao, data_ultima_atualizacao
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
                    $27, $28, $29, $30, $31, $32, $33, $34, $35,
                    NOW(), NOW()
                )
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
                    modelo = COALESCE(EXCLUDED.modelo, apolices_brokeria.modelo),
                    fabricante = COALESCE(EXCLUDED.fabricante, apolices_brokeria.fabricante),
                    ano_modelo = COALESCE(EXCLUDED.ano_modelo, apolices_brokeria.ano_modelo),
                    ano_fabricacao = COALESCE(EXCLUDED.ano_fabricacao, apolices_brokeria.ano_fabricacao),
                    cor_veiculo = COALESCE(EXCLUDED.cor_veiculo, apolices_brokeria.cor_veiculo),
                    combustivel = COALESCE(EXCLUDED.combustivel, apolices_brokeria.combustivel),
                    codigo_fipe = COALESCE(EXCLUDED.codigo_fipe, apolices_brokeria.codigo_fipe),
                    renavam = COALESCE(EXCLUDED.renavam, apolices_brokeria.renavam),
                    kilometragem = COALESCE(EXCLUDED.kilometragem, apolices_brokeria.kilometragem),
                    blindado = COALESCE(EXCLUDED.blindado, apolices_brokeria.blindado),
                    kit_gas = COALESCE(EXCLUDED.kit_gas, apolices_brokeria.kit_gas),
                    cambio_automatico = COALESCE(EXCLUDED.cambio_automatico, apolices_brokeria.cambio_automatico),
                    franquia_tipo = COALESCE(EXCLUDED.franquia_tipo, apolices_brokeria.franquia_tipo),
                    numero_parcelas = COALESCE(EXCLUDED.numero_parcelas, apolices_brokeria.numero_parcelas),
                    frequencia_pagamento = COALESCE(EXCLUDED.frequencia_pagamento, apolices_brokeria.frequencia_pagamento),
                    numero_proposta = COALESCE(EXCLUDED.numero_proposta, apolices_brokeria.numero_proposta),
                    corretor_nome = COALESCE(EXCLUDED.corretor_nome, apolices_brokeria.corretor_nome),
                    corretor_codigo = COALESCE(EXCLUDED.corretor_codigo, apolices_brokeria.corretor_codigo),
                    coberturas = COALESCE(EXCLUDED.coberturas, apolices_brokeria.coberturas),
                    condutor_detalhes = COALESCE(EXCLUDED.condutor_detalhes, apolices_brokeria.condutor_detalhes),
                    dados_adicionais = EXCLUDED.dados_adicionais,
                    data_ultima_atualizacao = NOW()
            `, [
                numApo,
                seguradora.Nome || apolice.Seguradora || apolice.seguradora || 'Não informada',
                apolice.Ramo || null,
                apolice.NomeProduto || null,
                bem.Chassi || item.Chassi || item.chassi || null,
                apolice.ValorPremioTotal || null,
                apolice.FormaPagamento || null,
                apolice.VigenciaInicio || null,
                apolice.VigenciaFim || null,
                'ATIVA',
                clienteCpf,
                clienteCnpj,
                bem.Placa || item.Placa || item.placa || null,
                clienteId,
                bem.Modelo || null,
                bem.Fabricante || null,
                bem.AnoModelo || null,
                bem.AnoFabricacao || null,
                bem.CorVeiculo || null,
                bem.Combustivel || null,
                bem.CodigoFIPE || null,
                bem.Renavam || null,
                bem.Kilometragem || null,
                bem.Blindado ? 'SIM' : 'NÃO',
                bem.KitGas ? 'SIM' : 'NÃO',
                bem.CambioAutomatico ? 'SIM' : 'NÃO',
                bem.FranquiaTipo || null,
                apolice.NumeroParcelas ? String(apolice.NumeroParcelas) : null,
                apolice.FrequenciaPagamento || null,
                apolice.NumeroProposta || null,
                extras.Corretor?.Nome || null,
                extras.Corretor?.Codigo || null,
                JSON.stringify(extras.Coberturas || []),
                JSON.stringify(extras.Condutor || {}),
                JSON.stringify(extras.DadosAdicionais || {}),
            ]);

            res.json({
                success: true,
                message: `Ingestão concluída para ${nomeCli} (Apólice ${numApo})`
            });

        } catch (error) {
            console.error("[INGEST] Erro na ingestão:", error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = adminController;
