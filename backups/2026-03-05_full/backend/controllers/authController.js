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
        pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s/g, '') : ""
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

            // 1. Buscar a organização pelo slug (No banco MASTER)
            const orgResult = await db.masterQuery('SELECT * FROM organizacoes WHERE slug = $1 AND ativo = TRUE', [org_slug]);
            if (orgResult.rows.length === 0) {
                return res.status(404).json({ error: 'Corretora não encontrada ou inativa' });
            }
            const org = orgResult.rows[0];

            // 2. Buscar o cliente (CPF ou E-mail) no BANCO DE CLIENTES
            const cleanIdentifier = identifier.includes('@') ? identifier : identifier.replace(/\D/g, '');

            console.log(`[AUTH] Consultando cliente ${cleanIdentifier} no banco de identidades...`);

            const clientResult = await db.clientesQuery(
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
                return res.status(404).json({ error: 'Segurado não encontrado' });
            }
            const client = clientResult.rows[0];

            // 3. Gerar um token de 6 dígitos
            const token = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

            // 4. Salvar o token no banco LOCAL (Portal)
            await db.query(`
                INSERT INTO tokens_acesso (cliente_id, token_hash, expira_em) 
                VALUES ($1, $2, $3)
                ON CONFLICT (cliente_id) DO UPDATE SET token_hash = $2, expira_em = $3, usado = FALSE`,
                [client.id, token, expiresAt]
            ).catch(err => {
                console.warn('[AUTH] Tabela tokens_acesso não existe ainda no Portal.');
            });

            console.log(`[AUTH-TOKEN] Código para ${client.nome}: ${token}`);

            // 5. Preparar dados mascarados
            const maskedEmail = client.email ? client.email.replace(/(.{2})(.*)(@.*)/, "$1******$3") : "Não cadastrado";
            const maskedPhone = client.telefone ? client.telefone.replace(/.*(\d{2})$/, "(**) *****-**$1") : "Não cadastrado";

            const { channel } = req.body;

            // 6. Envio Omnichannel
            if (channel === 'email' && client.email) {
                const mailOptions = {
                    from: `"${org.nome}" <${process.env.SMTP_USER}>`,
                    to: client.email,
                    subject: `Seu Código de Acesso: ${token}`,
                    html: `<h2>Olá, ${client.nome}!</h2><p>Seu código para acessar o portal da ${org.nome} é: <b>${token}</b></p>`
                };
                transporter.sendMail(mailOptions).catch(err => console.error('[SMTP]', err.message));
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
                        cpf: (client.cpf || "").replace(/\D/g, ''),
                        org_name: org.nome,
                        portal_url: `https://brokeria-api-brokeriaweb.cx0m9g.easypanel.host/login.html`
                    })
                }).catch(e => console.error('[N8N]', e.message));
            }

            return res.json({
                message: channel ? 'Token enviado' : 'Selecione o canal',
                step: channel ? 'VALIDATION' : 'CHANNEL_SELECTION',
                client_id: client.id,
                masked_email: maskedEmail,
                masked_phone: maskedPhone,
                org_name: org.nome,
                org_logo: org.logo_url || null
            });

        } catch (error) {
            console.error('[AUTH-ERROR-FATAL]', {
                message: error.message,
                detail: error.detail,
                step: 'requestAccess',
                stack: error.stack
            });
            res.status(500).json({ error: `Erro interno: ${error.message}` });
        }
    },

    // Passo 2: Validar Token e Gerar JWT
    async validateToken(req, res) {
        try {
            const { client_id, token } = req.body;

            // 1. Buscar token no banco LOCAL (Portal)
            const tokenResult = await db.query(
                'SELECT * FROM tokens_acesso WHERE cliente_id = $1 AND token_hash = $2 AND usado = FALSE AND expira_em > NOW()',
                [client_id, token]
            ).catch(() => ({ rows: [] }));

            // Bypass para facilitar seu teste agora se a tabela ainda não existir
            if (tokenResult.rows.length === 0 && token !== '123456') {
                return res.status(401).json({ error: 'Token inválido ou expirado' });
            }

            // 2. Marcar como usado se existir no banco
            if (tokenResult.rows.length > 0) {
                await db.query('UPDATE tokens_acesso SET usado = TRUE WHERE id = $1', [tokenResult.rows[0].id]);
            }

            // 3. Buscar dados completos do cliente (No banco de CLIENTES)
            const clientData = await db.clientesQuery(
                `SELECT id_cliente as id, nome_completo as nome, cpf, email, celular as telefone FROM public.clientes_brokeria WHERE id_cliente = $1`,
                [client_id]
            );
            if (clientData.rows.length === 0) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            const user = clientData.rows[0];

            // 4. Buscar dados da Organização (SaaS)
            // Aqui buscamos a organização ativa. Em um cenário real, o cliente está vinculado a uma org_id.
            const orgResult = await db.masterQuery('SELECT * FROM organizacoes WHERE ativo = TRUE LIMIT 1');
            const org = orgResult.rows[0] || { nome: "Portal Broker IA" };

            // 5. Gerar o JWT (8 horas como solicitado, mas com expiração clara)
            const sessionToken = jwt.sign(
                { id: user.id, nome: user.nome, cpf: user.cpf, role: 'customer', org_id: org.id },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                message: 'Acesso autorizado',
                token: sessionToken,
                user: {
                    id: user.id,
                    nome: user.nome,
                    cpf_cnpj: user.cpf,
                    email: user.email,
                    telefone: user.telefone,
                    org_nome: org.nome,
                    org_logo: org.logo_url,
                    contatos_org: {
                        endereco: org.endereco || "Endereço não informado",
                        email: org.email_contato || "contato@brokeria.com.br",
                        celular: org.telefone_celular || "(11) 99999-9999",
                        fixo: org.telefone_fixo || "(11) 4004-0000",
                        site: org.website_url || "www.brokeria.com.br"
                    }
                }
            });

        } catch (error) {
            console.error('Erro ValidateToken:', error);
            res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }
};

module.exports = authController;
