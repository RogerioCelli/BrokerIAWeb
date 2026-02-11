const db = require('../db');

const quoteController = {
    async submitQuote(req, res) {
        try {
            const data = req.body;
            console.log('[QUOTE] Recebendo nova solicitação detalhada:', data);

            const {
                nome,
                telefone,
                email,
                categoria_nome,
                tipo_seguro,
                tipo_cotacao, // NOVA ou RENOVACAO
                cpf,
                observacoes
            } = data;

            // Prepara o JSON de dados específicos baseado na categoria
            const dadosJson = { ...data };
            // Remove dados básicos para não duplicar no JSON se preferir, ou mantém tudo
            delete dadosJson.nome;
            delete dadosJson.telefone;
            delete dadosJson.email;
            delete dadosJson.categoria_nome;
            delete dadosJson.tipo_seguro;
            delete dadosJson.tipo_cotacao;
            delete dadosJson.observacoes;

            // 1. Salva na nova tabela estruturada 'cotacoes'
            const qCotacao = `
                INSERT INTO cotacoes (
                    tipo_cotacao, categoria, subtipo, nome_cliente, 
                    cpf_cliente, email_cliente, telefone_cliente, 
                    dados_json, observacoes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;
            const vCotacao = [
                tipo_cotacao || 'NOVA',
                categoria_nome,
                tipo_seguro,
                nome,
                cpf ? cpf.replace(/\D/g, '') : null,
                email,
                telefone ? telefone.replace(/\D/g, '') : null,
                dadosJson,
                observacoes
            ];
            await db.query(qCotacao, vCotacao);

            // 2. Mantém a integração com a tabela de registros (Dashboard do Atendimento)
            let resumo = `Solicitação via Portal Web (${tipo_cotacao || 'NOVA'})\n`;
            resumo += `E-mail: ${email}\n`;
            resumo += `CPF: ${cpf || 'Não informado'}\n`;
            resumo += `Ramo: ${categoria_nome} - ${tipo_seguro || 'Não especificado'}\n\n`;

            resumo += `--- Detalhes do Perfil ---\n`;
            resumo += JSON.stringify(dadosJson, null, 2);

            if (observacoes) resumo += `\n\nObservações: ${observacoes}`;

            const qRegistro = `
                INSERT INTO public.brokeria_registros_brokeria (
                    telefone_whatsapp, nome_cliente, resumo_conversa,
                    assunto_principal, canal, status_atendimento,
                    qtde_mensagens, etapa_funil, data_atendimento, hora_inicio
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                RETURNING id_atendimento
            `;

            const vRegistro = [
                telefone.replace(/\D/g, ''),
                nome,
                resumo,
                `COTAÇÃO ${tipo_cotacao || 'NOVA'}: ${categoria_nome}`,
                'WEB_PORTAL',
                'PENDENTE',
                1,
                'PRIMEIRO_CONTATO'
            ];

            const result = await db.registrosQuery(qRegistro, vRegistro);

            return res.json({
                success: true,
                message: 'Solicitação registrada com sucesso',
                id: result.rows[0].id_atendimento
            });

        } catch (error) {
            console.error('[QUOTE-ERR]', error);
            res.status(500).json({ error: 'Erro ao processar sua solicitação.' });
        }
    }
};

module.exports = quoteController;
