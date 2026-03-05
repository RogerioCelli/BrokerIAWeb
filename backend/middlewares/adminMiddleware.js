const jwt = require('jsonwebtoken');

const isAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Faça login como administrador.' });
    }

    // 1. Verificar se é a Chave de API fixa do n8n (para automações)
    const n8nApiKey = process.env.N8N_API_KEY || 'corretora-robo-n8n-access-2025';
    if (token === n8nApiKey) {
        req.admin = { id: 'n8n_automation', type: 'admin', role: 'master' };
        return next();
    }

    // 2. Senão, verificar como JWT normal
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Sessão administrativa expirada.' });
        }

        if (decoded.type !== 'admin') {
            return res.status(403).json({ error: 'Acesso restrito a administradores.' });
        }

        req.admin = decoded;
        next();
    });
};

const isMaster = (req, res, next) => {
    isAdmin(req, res, () => {
        if (req.admin.role !== 'master') {
            return res.status(403).json({ error: 'Ação restrita ao usuário MASTER.' });
        }
        next();
    });
};

module.exports = { isAdmin, isMaster };
