const fetch = require('node-fetch');

const N8N_URL = 'https://brokeria-n8n.cx0m9g.easypanel.host/webhook/portal-web-chat';

async function testConnection() {
    console.log('--- DIAGNÓSTICO DE CONEXÃO ---');
    console.log(`Testando URL: ${N8N_URL}`);
    console.log(`Horário: ${new Date().toISOString()}`);

    try {
        const payload = {
            action: 'chat_test_diagnostico',
            pergunta_cliente: 'teste de conectividade',
            origem: 'DIAGNOSTICO_VPS',
            timestamp: new Date().toISOString()
        };

        console.log('Enviando payload...');

        const response = await fetch(N8N_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        const text = await response.text();
        console.log('Resposta do n8n:', text);

        if (response.ok) {
            console.log('\n✅ CONEXÃO ESTABELECIDA COM SUCESSO!');
            console.log('Se você não viu uma execução no n8n, verifique se o workflow está ATIVADO.');
        } else {
            console.log('\n❌ O N8N RECEBEU A CHAMADA MAS REJEITOU.');
            console.log('Verifique se a URL do webhook está correta e se o método é POST.');
        }

    } catch (error) {
        console.error('\n🚨 ERRO CRÍTICO DE REDE:');
        console.error('Mensagem:', error.message);

        if (error.message.includes('getaddrinfo')) {
            console.error('Causa: O servidor não conseguiu resolver o DNS da URL. Verifique se o endereço está correto.');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error('Causa: Conexão recusada. O serviço n8n pode estar fora do ar ou em outra porta.');
        } else {
            console.error('Causa provável: Firewall, isolamento de rede no Easypanel ou URL inacessível.');
        }
    }
}

testConnection();
