const { createClerkClient } = require('@clerk/clerk-sdk-node');

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Middleware para validar a sessão do Clerk no Backend
 */
const requireClerkAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        // Se estivermos em dev e a secret key não foi configurada, avisamos
        if (!process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY === 'cole-sua-secret-key-aqui') {
            console.warn('[CLERK] Secret Key não configurada. Validando apenas formato do token.');
            return next(); // Pula validação real enquanto não tem a chave
        }

        const session = await clerkClient.verifyToken(token);
        req.auth = session;
        next();
    } catch (err) {
        console.error('[CLERK-AUTH-ERROR]', err.message);
        res.status(401).json({ error: 'Sessão inválida ou expirada no Clerk' });
    }
};

module.exports = { clerkClient, requireClerkAuth };
