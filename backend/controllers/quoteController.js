const db = require('../db');

const quoteController = {
    async submitQuote(req, res) {
        try {
            const data = req.body;
            console.log('[QUOTE] Recebendo nova solicitação:', data);

            const {
                nome,
                telefone,
                email,
                categoria_nome,
                tipo_seguro,
                observacoes,
                veiculo_marca_nome,
                veiculo_modelo,
                uso_veiculo,
                tipo_imovel,
                cep_imovel,
                idade,
                profissao
            } = data;

            // Formata o resumo da conversa/detalhes
            let resumo = `Solicitação via Portal Web\n`;
            resumo += `E-mail: ${email}\n`;
            resumo += `Categoria/Ramo: ${categoria_nome} - ${tipo_seguro || 'Não especificado'}\n`;

            if (veiculo_marca_nome) resumo += `Veículo: ${veiculo_marca_nome} ${veiculo_modelo} (${uso_veiculo})\n`;
            if (tipo_imovel) resumo += `Imóvel: ${tipo_imovel} - CEP: ${cep_imovel}\n`;
            if (idade) resumo += `Perfil: ${idade} anos - Profissão: ${profissao}\n`;
            if (observacoes) resumo += `\nObservações: ${observacoes}`;

            // Insere na tabela de registros (Dashboard)
            const query = `
                INSERT INTO public.brokeria_registros_brokeria (
                    telefone_whatsapp,
                    nome_cliente,
                    resumo_conversa,
                    assunto_principal,
                    canal,
                    status_atendimento,
                    qtde_mensagens,
                    etapa_funil,
                    data_atendimento,
                    hora_inicio
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                RETURNING id_atendimento
            `;

            const values = [
                telefone.replace(/\D/g, ''),
                nome,
                resumo,
                `COTAÇÃO: ${categoria_nome}`,
                'WEB_PORTAL',
                'PENDENTE',
                1,
                'PRIMEIRO_CONTATO'
            ];

            const result = await db.registrosQuery(query, values);

            return res.json({
                success: true,
                message: 'Solicitação registrada com sucesso',
                id: result.rows[0].id_atendimento
            });

        } catch (error) {
            console.error('[QUOTE-ERR]', error);
            res.status(500).json({ error: 'Erro ao processar sua solicitação. Tente novamente mais tarde.' });
        }
    }
};

module.exports = quoteController;
