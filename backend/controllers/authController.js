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

            // 2. Buscar o cliente (CPF ou E-mail) na tabela LEGADA (clientes_brokeria)
            const cleanIdentifier = identifier.includes('@') ? identifier : identifier.replace(/\D/g, '');

            console.log(`[DEBUG-AUTH] Buscando: ${cleanIdentifier} (Bruto: ${identifier}) na tabela public.clientes_brokeria`);

            // --- BYPASS DE LOGIN TEMPORÁRIO (Multibanco) ---
            if (cleanIdentifier === '11806562880') {
                console.log('[DEBUG-AUTH] Login Rogério Celli (Bypass Ativado)');
                const fakeClient = {
                    id: '99999999-9999-9999-9999-999999999999',
                    nome: 'Rogério Celli',
                    email: 'rogerio.celli@gmail.com',
                    telefone: '5511972155241',
                    cpf: '118.065.628-80',
                    org_id: orgId
                };

                // Continua o fluxo simulando que achou no banco
                // Gera token, manda email/zap... (vai logar no console)

                // Pular a query real que daria erro
                var client = fakeClient;
            } else {
                // Query Real (Só vai funcionar quando apontarmos pro banco de clientes)
                const clientResult = await db.query(
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
                    return res.status(404).json({ error: 'Segurado não encontrado nesta corretora' });
                }
                var client = clientResult.rows[0];
                client.org_id = orgId;
            }

            // 3. Gerar um token de 6 dígitos
            const token = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

            // 4. MODO DEBUG TEMPORÁRIO (Evita erro de tabela tokens_acesso inexistente)
            // TODO: Definir onde persistir esse token no Banco Master
            console.log(`[AUTH-MASTER] TOKEN GERADO PARA ${client.nome}: >>> ${token} <<<`);

            /* 
            await db.query(
                'INSERT INTO tokens_acesso (cliente_id, token_hash, expira_em) VALUES ($1, $2, $3)',
                [client.id, token, expiresAt]
            );
            */

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
                        email: client.email,
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

            // MODO DEBUG: Aceitar qualquer token válido (ou específico) enquanto não temos tabela
            // Em produção, descomentar a consulta ao banco
            /*
            const tokenResult = await db.query(
                'SELECT * FROM tokens_acesso WHERE cliente_id = $1 AND token_hash = $2 AND usado = FALSE AND expira_em > NOW()',
                [client_id, token]
            );

            if (tokenResult.rows.length === 0) {
                return res.status(401).json({ error: 'Token inválido ou expirado' });
            }

            // 2. Marcar token como usado
            await db.query('UPDATE tokens_acesso SET usado = TRUE WHERE id = $1', [tokenResult.rows[0].id]);
            */

            console.log(`[AUTH-DEBUG] Bypass de validação para cliente ${client_id} com token ${token}`);
            if (token !== '123456' && token.length !== 6) {
                // return res.status(401).json({ error: 'Token inválido (Simulação)' });
            }

            // 3. Buscar dados completos do cliente (ADAPTADO PARA LEGADO)

            var user;
            if (client_id === '99999999-9999-9999-9999-999999999999') {
                // BYPASS ROGÉRIO
                user = {
                    id: '99999999-9999-9999-9999-999999999999',
                    nome: 'Rogério Celli',
                    email: 'rogerio.celli@gmail.com',
                    cpf: '118.065.628-80'
                };
            } else {
                const clientData = await db.query(
                    `SELECT 
                        id_cliente as id, 
                        nome_completo as nome, 
                        cpf,
                        email
                    FROM public.clientes_brokeria 
                    WHERE id_cliente = $1`,
                    [client_id]
                );
                user = clientData.rows[0];
            }

            // Mock da Organização (Já que não tem join)
            user.org_nome = "Broker IA Demo";
            user.logo_url = "https://cdn.icon-icons.com/icons2/2699/PNG/512/microsoft_azure_logo_icon_168977.png";
            user.org_id = "00000000-0000-0000-0000-000000000000";
            user.org_slug = "corretora-demo";
            user.endereco = "Av. Paulista, 1000";
            user.telefone_fixo = "11 4004-0000";
            user.telefone_celular = "11 99999-9999";
            user.email_contato = "contato@brokeria.com.br";
            user.website_url = "brokeria.com.br";

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
                    cpf_cnpj: user.cpf, // Ajuste para campo legado
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
