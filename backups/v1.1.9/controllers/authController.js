const db = require('../db');
const clientesDb = require('../db/clientes_db'); // Nova conexão para o banco de clientes
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

// Memória temporária para tokens (Portal)
const portalTokens = new Map();

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

            // 1. Buscar a organização pelo slug (No banco de SEGUROS)
            const orgResult = await db.query('SELECT id FROM organizacoes WHERE slug = $1 AND ativo = TRUE', [org_slug]);
            if (orgResult.rows.length === 0) {
                return res.status(404).json({ error: 'Corretora não encontrada ou inativa' });
            }
            const orgId = orgResult.rows[0].id;

            // 2. Buscar o cliente (CPF ou E-mail) no BANCO DE CLIENTES (cliente-brokeria)
            const cleanIdentifier = identifier.includes('@') ? identifier : identifier.replace(/\D/g, '');

            console.log(`[AUTH-DEBUG] Buscando cliente ${cleanIdentifier} no banco brokeria_clientes-postgres`);

            const clientResult = await clientesDb.query(
                `SELECT 
                    id_cliente as id, 
                    nome_completo as nome, 
                    email, 
                    celular as telefone, 
                    cpf 
                 FROM public.clientes_brokeria 
                 WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1 
                    OR email = $1`,
                [cleanIdentifier]
            );

            if (clientResult.rows.length === 0) {
                return res.status(404).json({ error: 'Segurado não encontrado em nossa base' });
            }
            const client = clientResult.rows[0];

            // 3. Gerar um token de 6 dígitos
            const token = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutos

            // Guardar na memória
            portalTokens.set(client.id, { token, expiresAt });

            console.log(`[AUTH-PORTAL] Token gerado para ${client.nome}: ${token}`);

            // 4. Preparar dados mascarados para o frontend
            const maskedEmail = client.email ? client.email.replace(/(.{2})(.*)(@.*)/, "$1******$3") : "Não cadastrado";
            const maskedPhone = client.telefone ? client.telefone.replace(/.*(\d{2})$/, "(**) *****-**$1") : "Não cadastrado";

            const { channel } = req.body;

            // 5. Envio (WhatsApp via n8n ou E-mail)
            if (channel === 'email' && client.email) {
                const mailOptions = {
                    from: `"Portal Broker IA" <${process.env.SMTP_USER}>`,
                    to: client.email,
                    subject: `Código de Acesso: ${token}`,
                    html: `<h3>Olá, ${client.nome}!</h3><p>Seu código é: <b>${token}</b></p>`
                };
                transporter.sendMail(mailOptions).catch(err => console.error('[AUTH-SMTP-ERR]', err.message));
            } else if (channel === 'whatsapp' && process.env.N8N_WEBHOOK_URL) {
                fetch(process.env.N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'SEND_2FA_TOKEN',
                        channel: 'whatsapp',
                        client_name: client.nome,
                        target: client.telefone,
                        token: token,
                        cpf: (client.cpf || "").replace(/\D/g, '')
                    })
                }).catch(e => console.error('[AUTH-N8N-ERR]', e.message));
            }

            return res.json({
                message: channel ? 'Token enviado conforme solicitado' : 'Selecione o canal de envio',
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

            // 1. Validar na Memória (Simple & Fast)
            const tokenData = portalTokens.get(client_id);

            if (!tokenData || tokenData.token !== token || Date.now() > tokenData.expiresAt) {
                return res.status(401).json({ error: 'Token inválido ou expirado' });
            }

            // Consumir token
            portalTokens.delete(client_id);

            // 2. Buscar dados completos do cliente para a sessão
            const clientResult = await clientesDb.query(
                `SELECT id_cliente as id, nome_completo as nome, cpf, email FROM public.clientes_brokeria WHERE id_cliente = $1`,
                [client_id]
            );
            const user = clientResult.rows[0];

            // 3. Gerar o JWT (Sessão de 8 horas)
            const sessionToken = jwt.sign(
                { id: user.id, nome: user.nome, role: 'customer' },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                message: 'Bem-vindo ao portal!',
                token: sessionToken,
                user: {
                    id: user.id,
                    nome: user.nome,
                    cpf_cnpj: user.cpf,
                    org_nome: "Portal Broker IA"
                }
            });

        } catch (error) {
            console.error('Erro ao validar token:', error);
            res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }
};

module.exports = authController;
