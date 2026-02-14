const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path'); // Import path
require('dotenv').config();

// Importar Rotas
const authRoutes = require('./routes/authRoutes');
const policyRoutes = require('./routes/policyRoutes');
const segurosRoutes = require('./routes/seguros');
const magicLinkRoutes = require('./routes/magicLinkRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Desabilitando temporariamente para evitar bloqueio de scripts inline/externos
}));
app.use(cors({
    origin: [
        'https://brokeria-api-brokeriaweb.cx0m9g.easypanel.host',
        'http://localhost:3000',
        'null'
    ],
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Servir Arquivos Estáticos (Frontend movido para public)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/admin', require('./routes/adminRoutes')); // Novo Painel Admin
app.use('/api/seguros', segurosRoutes); // Endpoint Público de Seguros
app.use('/api/magic-link', magicLinkRoutes);

// Rotas Base
app.get('/', (req, res) => {
    const packageJson = require('./package.json');
    res.json({
        message: 'Broker IA Web API - Ativa e Escalável',
        version: packageJson.version,
        status: 'Sistema Pronto e Monitorado'
    });
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const { runMigrations } = require('./db/init');

// Inicialização
app.listen(PORT, async () => {
    // Garantir que o banco de dados está sincronizado antes de atender requisições
    await runMigrations();

    // Listar rotas registradas para debug
    console.log('🛣️  Rotas de API registradas:');
    app._router.stack.forEach(r => {
        if (r.route && r.route.path) console.log(`   - ${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`);
        else if (r.name === 'router') r.handle.stack.forEach(sr => {
            if (sr.route) console.log(`   - ${Object.keys(sr.route.methods).join(',').toUpperCase()} ${sr.regexp} -> ${sr.route.path}`);
        });
    });

    const packageJson = require('./package.json');
    console.log(`
    🚀 Broker IA Web SaaS Rodando! [VERSÃO ${packageJson.version}]
    📡 Porta: ${PORT}
    🏠 Ambiente: ${process.env.NODE_ENV}
    ⏰ Hora do Start: ${new Date().toLocaleString('pt-BR')}
    🗄️  Banco Portal: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : 'NÃO CONFIGURADO'}
    `);

    // Relógio de Autoverificação (Heartbeat) - Se isso não mudar no log, o log travou!
    setInterval(() => {
        console.log(`[HEARTBEAT] Servidor Ativo: ${new Date().toLocaleTimeString('pt-BR')}`);
    }, 5000);
});
