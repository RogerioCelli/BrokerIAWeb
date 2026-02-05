const db = require('../db');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Configuração do Transportador de E-mail (SMTP)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS.replace(/\s/g, '')
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Controller para Autenticação de Segurados (Login 2FA)
 */
const authController = {
    // Passo 1: Solicitar acesso (Gera o Token)
    async requestAccess(req, res) {
        try {
            const { identifier, org_slug } = req.body;

            if (!identifier || !org_slug) {
                return res.status(400).json({ error: 'Identificador e organização são obrigatórios' });
            }

            // 1. Buscar a organização pelo slug
            const orgResult = await db.query('SELECT id FROM organizacoes WHERE slug = $1 AND ativo = TRUE', [org_slug]);
            if (orgResult.rows.length === 0) {
                return res.status(404).json({ error: 'Corretora não encontrada ou inativa' });
            }
            const orgId = orgResult.rows[0].id;

            // 2. Buscar o cliente (CPF ou E-mail) dentro dessa organização
            const cleanIdentifier = identifier.includes('@') ? identifier : identifier.replace(/\D/g, '');

            console.log(`[DEBUG-AUTH] Buscando: ${cleanIdentifier} (Bruto: ${identifier}) na Org: ${orgId}`);

            const clientResult = await db.query(
                `SELECT id, nome, email, telefone, cpf_cnpj FROM clientes 
                 WHERE org_id = $1 AND REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', '') = $2`,
                [orgId, cleanIdentifier]
            );

            if (clientResult.rows.length === 0) {
                return res.status(404).json({ error: 'Segurado não encontrado nesta corretora' });
            }
            const client = clientResult.rows[0];

            // 3. Gerar um token de 6 dígitos
            const token = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

            // 4. Salvar o token no banco
            await db.query(
                'INSERT INTO tokens_acesso (cliente_id, token_hash, expira_em) VALUES ($1, $2, $3)',
                [client.id, token, expiresAt]
            );

            // 5. Preparar dados mascarados para o frontend
            const maskedEmail = client.email ? client.email.replace(/(.{2})(.*)(@.*)/, "$1******$3") : "Não cadastrado";
            const maskedPhone = client.telefone ? client.telefone.replace(/.*(\\d{2})$/, "(**) *****-**$1") : "Não cadastrado";

            const { channel } = req.body;

            // 6. Envio Omnichannel (E-mail Local ou WhatsApp via n8n)
            if (channel === 'email') {
                console.log(`[AUTH-LOCAL] Enviando E-mail direto para ${client.nome}: ${client.email}`);

                const mailOptions = {
                    from: `"Portal DWF Seguros" <${process.env.SMTP_USER}>`,
                    to: client.email,
                    subject: `Código de Acesso: ${token}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2>Olá, ${client.nome}!</h2>
                            <p>Seu código de acesso ao portal DWF Seguros é:</p>
                            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; padding: 20px 0;">
                                ${token}
                            </div>
                            <p>Este código expira em 10 minutos.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #999;">Se você não solicitou este código, ignore este e-mail.</p>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions).catch(err => {
                    console.error('[AUTH-SMTP-ERROR]', err.message);
                });
            } else if (channel === 'whatsapp' && process.env.N8N_WEBHOOK_URL) {
                const cpfFinal = (client.cpf_cnpj || cleanIdentifier || "").toString().replace(/\D/g, '');

                console.log(`[AUTH-WHATSAPP] Disparando n8n para ${client.nome} no WhatsApp: ${client.telefone}`);

                fetch(process.env.N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'SEND_2FA_TOKEN',
                        channel: 'whatsapp',
                        client_name: client.nome,
                        target: client.telefone,
                        token: token,
                        cpf: cpfFinal
                    })
                }).catch(e => console.error('[AUTH-N8N-FETCH-ERROR]', e.message));
            }

            if (channel) {
                console.log(`[AUTH-LOG] Token para ${client.nome}: ${token}`);
            }

            return res.json({
                message: channel ? 'Token enviado com sucesso' : 'Selecione o canal de envio',
                step: channel ? 'VALIDATION' : 'CHANNEL_SELECTION',
                client_id: client.id,
                masked_email: maskedEmail,
                masked_phone: maskedPhone
            });

        } catch (error) {
            console.error('Erro ao solicitar acesso:', error);
            res.status(500).json({ error: 'Erro interno no servidor' });
        }
    },

    // Passo 2: Validar Token e Gerar JWT
    async validateToken(req, res) {
        try {
            const { client_id, token } = req.body;

            if (!client_id || !token) {
                return res.status(400).json({ error: 'Dados incompletos' });
            }

            // 1. Buscar token válido no banco
            const tokenResult = await db.query(
                'SELECT * FROM tokens_acesso WHERE cliente_id = $1 AND token_hash = $2 AND usado = FALSE AND expira_em > NOW()',
                [client_id, token]
            );

            if (tokenResult.rows.length === 0) {
                return res.status(401).json({ error: 'Token inválido ou expirado' });
            }

            // 2. Marcar token como usado
            await db.query('UPDATE tokens_acesso SET usado = TRUE WHERE id = $1', [tokenResult.rows[0].id]);

            // 3. Buscar dados completos do cliente e da org para o JWT
            const clientData = await db.query(
                `SELECT c.*, o.nome as org_nome, o.logo_url, 
                        o.endereco, o.telefone_fixo, o.telefone_celular, 
                        o.email_contato, o.website_url 
                 FROM clientes c 
                 JOIN organizacoes o ON c.org_id = o.id 
                 WHERE c.id = $1`,
                [client_id]
            );

            const user = clientData.rows[0];

            // 4. Gerar o JWT (Token de Sessão)
            const sessionToken = jwt.sign(
                {
                    id: user.id,
                    nome: user.nome,
                    org_id: user.org_id,
                    org_slug: user.org_slug,
                    role: 'customer'
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                message: 'Acesso autorizado',
                token: sessionToken,
                user: {
                    id: user.id,
                    nome: user.nome,
                    cpf_cnpj: user.cpf_cnpj,
                    org_nome: user.org_nome,
                    logo: user.logo_url,
                    contatos_org: {
                        endereco: user.endereco,
                        fixo: user.telefone_fixo,
                        celular: user.telefone_celular,
                        email: user.email_contato,
                        site: user.website_url
                    }
                }
            });

        } catch (error) {
            console.error('Erro ao validar token:', error);
            res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }
};

module.exports = authController;
