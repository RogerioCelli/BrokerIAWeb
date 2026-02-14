const Redis = require('ioredis');
require('dotenv').config();

// Tenta conectar ao Redis. Se não houver REDIS_URL, loga erro mas não trava o server.
const rawUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Loga a URL (mascarando a senha se houver)
try {
    const logUrl = rawUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`[REDIS] Tentando conectar em: ${logUrl}`);
} catch (e) {
    console.log(`[REDIS] Tentando conectar...`);
}

const redis = new Redis(rawUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
        if (times > 3) {
            console.error('[REDIS] Falha crítica de conexão. Verifique o servidor Redis.');
            return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
    }
});

redis.on('connect', () => console.log('✅ [REDIS] Conectado com sucesso.'));
redis.on('error', (err) => console.error('❌ [REDIS] Erro de conexão:', err.message));

module.exports = redis;
