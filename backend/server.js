const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importar Rotas
const authRoutes = require('./routes/authRoutes');
const policyRoutes = require('./routes/policyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);

// Rotas Base
app.get('/', (req, res) => {
    res.json({
        message: 'Broker IA Web API - Ativa e Escalável',
        version: '1.0.0',
        status: 'Multitenant Engine Ready'
    });
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Inicialização
app.listen(PORT, () => {
    console.log(`
    🚀 Broker IA Web SaaS Rodando!
    📡 Porta: ${PORT}
    🏠 Ambiente: ${process.env.NODE_ENV}
    `);
});
