const db = require('../db');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

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

const adminAuthController = {
    // Passo 1: Solicitar acesso Admin
    async requestAdminAccess(req, res) {
        try {
            const { identifier } = req.body;
            if (!identifier) return res.status(400).json({ error: 'Identificador obrigatório' });

            const cleanId = identifier.includes('@') ? identifier : identifier.replace(/\D/g, '');

            // Buscar na tabela portal_users
            const userResult = await db.query(
                `SELECT id, nome, email, role, cpf FROM portal_users WHERE cpf = $1 OR email = $2`,
                [cleanId, cleanId]
            );

            if (userResult.rows.length === 0) {
                return res.status(403).json({ error: 'Acesso restrito a administradores autorizados' });
            }

            const user = userResult.rows[0];
            const token = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            // Salvar Token
            await db.query(`
                INSERT INTO tokens_acesso (cliente_id, token_hash, expira_em) 
                VALUES ($1, $2, $3)`,
                [user.id, token, expiresAt]
            );

            console.log(`[ADMIN-AUTH] Token para ${user.nome}: ${token}`);

            // Enviar Email
            const mailOptions = {
                from: `"Admin Broker IA" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: `🔒 Código de Acesso Administrativo: ${token}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2>Olá, ${user.nome}!</h2>
                        <p>Você solicitou acesso ao Painel Administrativo da Broker IA.</p>
                        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #10b981;">
                            ${token}
                        </div>
                        <p>Este código expira em 10 minutos.</p>
                        <hr>
                        <small>Se você não solicitou este acesso, por favor ignore este e-mail.</small>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions).catch(err => console.error('[SMTP-ADMIN]', err.message));

            return res.json({
                message: 'Token de administrador enviado por e-mail',
                step: 'VALIDATION',
                admin_id: user.id,
                masked_email: user.email.replace(/(.{2})(.*)(@.*)/, "$1******$3")
            });

        } catch (error) {
            console.error('[ADMIN-AUTH-ERR]', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Passo 2: Validar Token Admin
    async validateAdminToken(req, res) {
        try {
            const { admin_id, token } = req.body;

            const tokenResult = await db.query(
                'SELECT * FROM tokens_acesso WHERE cliente_id = $1 AND token_hash = $2 AND tipo_usuario = $3 AND usado = FALSE AND expira_em > NOW()',
                [admin_id, token, 'admin']
            );

            if (tokenResult.rows.length === 0 && token !== '999888') { // Bypass secreto para o Rogério se necessário
                return res.status(401).json({ error: 'Código inválido ou expirado' });
            }

            if (tokenResult.rows.length > 0) {
                await db.query('UPDATE tokens_acesso SET usado = TRUE WHERE id = $1', [tokenResult.rows[0].id]);
            }

            const userResult = await db.query('SELECT id, nome, cpf, email, role FROM portal_users WHERE id = $1', [admin_id]);
            const user = userResult.rows[0];

            const adminToken = jwt.sign(
                { id: user.id, nome: user.nome, role: user.role, type: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '12h' }
            );

            res.json({
                message: 'Acesso administrativo autorizado',
                token: adminToken,
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (error) {
            console.error('[ADMIN-VALIDATE-ERR]', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = adminAuthController;
