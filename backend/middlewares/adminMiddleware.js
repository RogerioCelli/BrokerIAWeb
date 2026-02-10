const jwt = require('jsonwebtoken');

const isAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Faça login como administrador.' });
    }

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
