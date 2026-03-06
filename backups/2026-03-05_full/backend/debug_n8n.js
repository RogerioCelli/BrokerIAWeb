require('dotenv').config();

async function test() {
    console.log('--- DIAGNÓSTICO DE CONEXÃO N8N ---');
    console.log('URL configurada:', process.env.N8N_WEBHOOK_URL);

    if (!process.env.N8N_WEBHOOK_URL) {
        console.error('ERRO: N8N_WEBHOOK_URL não está definida no .env!');
        return;
    }

    try {
        const res = await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'teste de conexao', action: 'diagnostico' })
        });

        console.log('Status HTTP:', res.status);
        const text = await res.text();
        console.log('Resposta do n8n:', text);
    } catch (err) {
        console.error('ERRO NA CONEXÃO:', err.message);
        if (err.code === 'ENOTFOUND') console.error('Motivo: DNS não encontrado. A URL está correta?');
        if (err.code === 'ECONNREFUSED') console.error('Motivo: Conexão recusada. O n8n está rodando?');
    }
}

test();
