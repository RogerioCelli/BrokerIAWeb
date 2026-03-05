const ORG_SLUG = 'corretora-demo';
const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const mainButton = document.getElementById('mainButton');
    const identifierInput = document.getElementById('identifier');
    const identifierGroup = document.getElementById('identifierGroup');
    const channelGroup = document.getElementById('channelGroup');
    const tokenGroup = document.getElementById('tokenGroup');
    const maskedEmail = document.getElementById('maskedEmail');
    const maskedPhone = document.getElementById('maskedPhone');
    const tokenInput = document.getElementById('token');


    let currentStep = 'IDENTIFICATION'; // IDENTIFICATION, CHANNEL, TOKEN
    let clientId = null;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (mainButton.disabled) return;
        mainButton.disabled = true;

        try {
            if (currentStep === 'IDENTIFICATION') {
                let val = identifierInput.value.trim();

                // Allow both formatted (000.000.000-00) and unformatted (digits only)
                const CPF_REGEX = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/;
                const CNPJ_REGEX = /^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})$/;

                if (!CPF_REGEX.test(val) && !CNPJ_REGEX.test(val)) {
                    throw new Error('Formato inválido. Use CPF ou CNPJ (apenas números ou com pontos/traços).');
                }

                mainButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

                const response = await fetch(`${API_URL}/auth/request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identifier: val,
                        org_slug: ORG_SLUG
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro na identificação');

                // Prepara próxima etapa (Seleção de Canal)
                clientId = data.client_id;
                if (maskedPhone) maskedPhone.textContent = data.masked_phone || 'Não cadastrado';
                if (maskedEmail) maskedEmail.textContent = data.masked_email || 'Não cadastrado';

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

/**
 * Mantém um ID de sessão estável para o chat público (vivido apenas nesta aba/janela)
 * Isso permite que o n8n mantenha o contexto da conversa (ex: processo de 2FA).
 */
const getChatSessionId = () => {
    let sid = sessionStorage.getItem('pub_chat_session_id');
    if (!sid) {
        sid = 'pub_' + Math.random().toString(36).substring(2, 15) + Date.now();
        sessionStorage.setItem('pub_chat_session_id', sid);
    }
    return sid;
};

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
                body: JSON.stringify({
                    message: '[GATILHO_INICIAL]',
                    session_id: getChatSessionId()
                })
            });
            const data = await response.json();
            if (data && data.response) {
                addMessageHTML('bot', renderMarkdown(data.response));
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

function renderMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.15);padding:2px 5px;border-radius:3px;font-size:0.85em;">$1</code>')
        .replace(/^[\-\*•] (.+)$/gm, '<li>$1</li>')
        .replace(/((?:<li>.*<\/li>[\n]?)+)/g, '<ul style="margin:6px 0 6px 16px;padding:0;">$1</ul>')
        .replace(/\n/g, '<br>');
}

function addMessage(type, text) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function addMessageHTML(type, html) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function showAgentStatus(html) {
    const div = document.createElement('div');
    div.className = 'agent-status';
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

const handleSend = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    chatInput.value = '';
    chatInput.disabled = true;
    sendMessage.disabled = true;

    // Inicia chamada ao n8n IMEDIATAMENTE em paralelo com a animação
    const n8nPromise = fetch(`${API_URL}/policies/public-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: text,
            session_id: getChatSessionId()
        })
    });

    // Animação contextual (Copiado do Dashboard)
    let statusText = '<i class="fas fa-brain"></i> Consultando Broker IA...';
    if (/cobertura|guincho|granizo|sinistro/i.test(text)) {
        statusText = '<i class="fas fa-file-pdf"></i> Analisando apólice...';
    } else if (/apólice|apolice|venc/i.test(text)) {
        statusText = '<i class="fas fa-search"></i> Buscando dados da apólice...';
    } else if (/cotação|cotacao|renovar/i.test(text)) {
        statusText = '<i class="fas fa-calculator"></i> Preparando informações...';
    }
    const agentStatus = showAgentStatus(statusText);

    try {
        const response = await n8nPromise;
        agentStatus.remove();
        const data = await response.json();
        const resposta = data.response || 'Não recebi resposta do agente.';
        addMessageHTML('bot', renderMarkdown(resposta));

    } catch (error) {
        console.error('[CHAT-ERROR]', error);
        agentStatus.remove();
        addMessage('bot', 'Desculpe, tive um problema técnico. Pode repetir?');
    } finally {
        chatInput.disabled = false;
        sendMessage.disabled = false;
        chatInput.focus();
    }
};

sendMessage.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});
