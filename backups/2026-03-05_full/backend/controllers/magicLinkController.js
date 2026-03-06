const db = require('../db');
const redis = require('../utils/redis');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configuração do Transportador de E-mail (Gmail)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const magicLinkController = {
    /**
     * Gera um link mágico para o WhatsApp (Chamado pelo n8n)
     */
    generate: async (req, res) => {
        try {
            const { phoneNumber, cpf } = req.body;
            if (!phoneNumber || !cpf) {
                return res.status(400).json({ error: 'PhoneNumber e CPF são obrigatórios' });
            }

            const cleanCpf = cpf.replace(/\D/g, '');
            const cleanPhone = phoneNumber.replace(/\D/g, '');

            // 1. Busca o e-mail do cliente no banco oficial
            const clientResult = await db.query(
                'SELECT email, nome_completo, celular, telefone FROM public.clientes_brokeria WHERE REGEXP_REPLACE(cpf, \'\\D\', \'g\') = $1 LIMIT 1',
                [cleanCpf]
            );

            if (clientResult.rows.length === 0) {
                return res.status(404).json({ error: 'Cliente não localizado para este CPF' });
            }

            const client = clientResult.rows[0];
            const uuid = crypto.randomUUID();
            const expiraEm = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

            // 2. Registra o link no banco
            await db.query(
                'INSERT INTO magic_links (uuid, phone_number, cpf, expira_em) VALUES ($1, $2, $3, $4)',
                [uuid, cleanPhone, cleanCpf, expiraEm]
            );

            const baseUrl = process.env.PUBLIC_URL || 'https://brokeria-api-brokeriaweb.cx0m9g.easypanel.host';
            const link = `${baseUrl}/valida.html?t=${uuid}`;

            // 3. LÓGICA DE SEGURANÇA: Se o telefone de origem for diferente do cadastro, envia E-MAIL obrigatoriamente
            const registeredPhone = (client.celular || client.telefone || '').replace(/\D/g, '');
            const phoneMismatch = cleanPhone !== registeredPhone;

            if (phoneMismatch || req.body.forceEmail) {
                console.log(`[MAGIC-LINK] Telefones diferentes: ${cleanPhone} vs ${registeredPhone}. Enviando e-mail para seguranca.`);

                const mailOptions = {
                    from: `"BrokerIA Security" <${process.env.SMTP_USER}>`,
                    to: client.email,
                    subject: 'Autorização de Acesso - BrokerIA',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                            <h2 style="color: #6366f1;">BrokerIA - Verificação de Identidade</h2>
                            <p>Olá <strong>${client.nome_completo}</strong>,</p>
                            <p>Detectamos uma solicitação de acesso aos seus dados via WhatsApp. Para sua segurança, clique no botão abaixo para autorizar o acesso:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${link}" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Autorizar Acesso</a>
                            </div>
                            <p style="color: #64748b; font-size: 0.9rem;">Se você não solicitou este acesso, por favor, ignore este e-mail. O link expira em 15 minutos.</p>
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                            <p style="font-size: 0.8rem; color: #94a3b8;">Atenciosamente,<br>Equipe DWF Seguros</p>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions).catch(err => console.error('[SMTP-ERROR]', err));
            }

            // Retorna o link para o n8n (o n8n pode decidir se envia ou não via WhatsApp)
            res.json({
                success: true,
                link,
                emailSent: phoneMismatch || req.body.forceEmail,
                registredEmail: client.email.replace(/(.{3})(.*)(?=@)/, (m, g1, g2) => g1 + "*".repeat(g2.length))
            });

        } catch (error) {
            console.error('[MAGIC-LINK] Erro ao gerar:', error);
            res.status(500).json({ error: 'Erro interno ao gerar link mágico' });
        }
    },

    /**
     * Valida o UUID e retorna dados básicos (Chamado pelo frontend)
     */
    verify: async (req, res) => {
        try {
            const { uuid } = req.params;
            const { rows } = await db.query(
                `SELECT ml.*, c.nome_completo 
                 FROM magic_links ml 
                 LEFT JOIN public.clientes_brokeria c ON ml.cpf = c.cpf 
                 WHERE ml.uuid = $1 AND ml.expira_em > NOW() AND ml.validado = FALSE`,
                [uuid]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Link inválido ou expirado' });
            }

            res.json({
                success: true,
                nome: rows[0].nome_completo || 'Cliente',
                phone: rows[0].phone_number
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao verificar link' });
        }
    },

    /**
     * Confirma a validação e atualiza o Redis (Chamado pelo frontend ao clicar no botão)
     */
    confirm: async (req, res) => {
        try {
            const { uuid } = req.body;

            const { rows } = await db.query(
                'UPDATE magic_links SET validado = TRUE WHERE uuid = $1 AND expira_em > NOW() RETURNING phone_number',
                [uuid]
            );

            if (rows.length === 0) {
                return res.status(400).json({ error: 'Link expirado ou já utilizado' });
            }

            const phone = rows[0].phone_number;

            // 🚀 MÁGICA: Escreve no Redis para o n8n perceber a mudança instantaneamente
            await redis.set(`status_2fa:${phone}`, 'VALIDADO', 'EX', 1800);

            console.log(`✅ [MAGIC-LINK] CPF Validado para o telefone: ${phone}`);

            // 📱 Notifica o cliente no WhatsApp que o acesso foi liberado
            const wahaUrl = process.env.WAHA_URL || 'http://waha:3000';
            console.log(`[WAHA-NOTIFY] Tentando: ${wahaUrl}/api/sendText | chatId: ${phone}@c.us`);
            fetch(`${wahaUrl}/api/sendText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session: 'default',
                    chatId: `${phone}@c.us`,
                    text: '✅ *Acesso liberado com sucesso!*\n\nSeu acesso foi confirmado. Por favor, repita o que gostaria de saber sobre seus dados ou apólices. 😊'
                })
            })
                .then(r => console.log(`[WAHA-NOTIFY] ✅ Status: ${r.status}`))
                .catch(err => console.error(`[WAHA-NOTIFY] ❌ Falhou (${wahaUrl}) | Erro: ${err.message}`));

            res.json({ success: true, message: 'Acesso autorizado! Você já pode voltar ao WhatsApp.' });
        } catch (error) {
            console.error('[MAGIC-LINK] Erro ao confirmar:', error);
            res.status(500).json({ error: 'Erro ao processar confirmação' });
        }
    }

};

module.exports = magicLinkController;
