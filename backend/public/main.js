const ORG_SLUG = 'corretora-demo';
const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    let currentStep = 'IDENTIFICATION'; // IDENTIFICATION, CHANNEL, TOKEN
    let clientId = null;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (mainButton.disabled) return;
        mainButton.disabled = true;
        const originalBtnText = mainButton.textContent;

        try {
            if (currentStep === 'IDENTIFICATION') {
                const val = identifierInput.value.trim();

                // Regex: CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
                const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
                const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

                if (!CPF_REGEX.test(val) && !CNPJ_REGEX.test(val)) {
                    throw new Error('Formato inválido. Use CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00).');
                }

                mainButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

                const response = await fetch(`${API_URL}/auth/request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identifier: identifierInput.value,
                        org_slug: ORG_SLUG
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro na identificação');

                // Prepara próxima etapa (Seleção de Canal)
                clientId = data.client_id;
                if (maskedPhone) maskedPhone.textContent = data.masked_phone || 'Não cadastrado';
                maskedEmail.textContent = data.masked_email || 'Não cadastrado';

                identifierGroup.style.display = 'none';
                channelGroup.style.display = 'block';
                mainButton.textContent = 'Receber Código';
                currentStep = 'CHANNEL';

            } else if (currentStep === 'CHANNEL') {
                const selectedChannel = document.querySelector('input[name="auth_channel"]:checked').value;
                mainButton.innerHTML = '<i class="fas fa-paper-plane fa-spin"></i> Enviando Código...';

                // Simula re-envio especificando o canal
                const response = await fetch(`${API_URL}/auth/request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identifier: identifierInput.value,
                        org_slug: ORG_SLUG,
                        channel: selectedChannel
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro ao enviar código');

                channelGroup.style.display = 'none';
                tokenGroup.style.display = 'block';
                mainButton.textContent = 'Validar Acesso';
                currentStep = 'TOKEN';

            } else if (currentStep === 'TOKEN') {
                mainButton.innerHTML = '<i class="fas fa-shield-alt fa-spin"></i> Validando...';

                const response = await fetch(`${API_URL}/auth/validate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_id: clientId,
                        token: tokenInput.value
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Token inválido');

                localStorage.setItem('broker_ia_token', data.token);
                localStorage.setItem('broker_ia_user', JSON.stringify(data.user));

                mainButton.innerHTML = '<i class="fas fa-check"></i> Sucesso! Entrando...';
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 600);
            }
        } catch (error) {
            mainButton.textContent = 'Erro: ' + error.message;
            setTimeout(() => {
                // Restaura o texto correto baseado no step atual
                if (currentStep === 'IDENTIFICATION') mainButton.textContent = 'Verificar Acesso';
                else if (currentStep === 'CHANNEL') mainButton.textContent = 'Receber Código';
                else mainButton.textContent = 'Validar Acesso';
            }, 3000);
        } finally {
            mainButton.disabled = false;
        }
    });
});

// --- Lógica do Chat Público (Novo Cliente / Lead) ---
const chatFab = document.getElementById('chatFab');
const chatContainer = document.getElementById('chatContainer');
const closeChat = document.getElementById('closeChat');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessage = document.getElementById('sendMessage');

// Abre/Fecha Chat
chatFab.addEventListener('click', async () => {
    chatContainer.style.display = 'flex';
    chatFab.style.display = 'none';
    chatInput.focus();

    // Se for a primeira vez que abre (mensagens <= 1), dispara o gatilho de boas-vindas
    if (chatMessages.children.length <= 1) {
        try {
            const response = await fetch(`${API_URL}/policies/public-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '[GATILHO_INICIAL]' })
            });
            const data = await response.json();
            if (data && data.response) {
                addMessage('bot', data.response);
            }
        } catch (error) {
            console.error('Erro ao iniciar chat:', error);
        }
    }
});

closeChat.addEventListener('click', () => {
    chatContainer.style.display = 'none';
    chatFab.style.display = 'flex';
});

const addMessage = (type, text) => {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
};

const showAgentStatus = (html) => {
    const div = document.createElement('div');
    div.className = 'agent-status';
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
};

const handleSend = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    chatInput.value = '';

    try {
        // --- Orquestração de Agentes dinâmica (Auditiva/Visual) ---
        let statusText = '<i class="fas fa-search"></i> Agente Local buscando informações gerais...';
        if (text.toLowerCase().includes('apólice') || text.toLowerCase().includes('seguro') || text.toLowerCase().includes('meu')) {
            statusText = '<i class="fas fa-user-lock"></i> Identificando intenção de acesso privado...';
        }

        const agentStatus = showAgentStatus(statusText);
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        await delay(1000);
        agentStatus.innerHTML = '<i class="fas fa-brain"></i> IA processando resposta personalizada...';
        await delay(1200);
        agentStatus.remove();

        const response = await fetch(`${API_URL}/policies/public-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();

        // Especial: Se a IA sugerir login ou falar de apólice, dar um destaque
        if (text.toLowerCase().includes('apólice') || text.toLowerCase().includes('meu seguro')) {
            addMessage('bot', data.response + " Para ver detalhes agora, basta informar seu CPF ou E-mail acima no portal.");
        } else {
            addMessage('bot', data.response);
        }

    } catch (error) {
        console.error('[CHAT-ERROR]', error);
        alert('DEBUG CHAT ERROR: ' + error.message);
        addMessage('bot', `ERRO DE CONEXÃO: ${error.message}`);
    }
};

sendMessage.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});
