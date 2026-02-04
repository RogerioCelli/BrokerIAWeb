document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('broker_ia_token');
    const userData = JSON.parse(localStorage.getItem('broker_ia_user') || '{}');
    const API_URL = 'https://brokeriaweb-api-brokeriaweb.cx0m9g.easypanel.host/api';

    // Redireciona se não estiver logado
    if (!token || !userData.id) {
        window.location.href = 'index.html';
        return;
    }

    // Preenche dados básicos
    document.getElementById('welcomeName').textContent = `Olá, ${userData.nome.split(' ')[0]}!`;
    document.getElementById('orgName').textContent = 'Broker IA Corretora Demo';

    const policiesGrid = document.getElementById('policiesGrid');
    const logoutBtn = document.getElementById('logoutBtn');

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Carrega Apólices
    try {
        const response = await fetch(`${API_URL}/policies/my`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar apólices');
        }

        const policies = await response.json();
        renderPolicies(policies);
    } catch (error) {
        console.error(error);
        policiesGrid.innerHTML = `
            <div class="policy-card" style="border-color: #ff3b30">
                <p style="color: #ff3b30">Não foi possível carregar suas apólices. Tente novamente mais tarde.</p>
            </div>
        `;
    }

    function renderPolicies(policies) {
        if (policies.length === 0) {
            policiesGrid.innerHTML = '<p>Você ainda não possui apólices cadastradas.</p>';
            return;
        }

        policiesGrid.innerHTML = policies.map(policy => {
            const icon = getIcon(policy.ramo);
            const detailLabel = policy.ramo === 'AUTOMOVEL' ? 'Veículo' : 'Imóvel';
            const detailValue = policy.ramo === 'AUTOMOVEL'
                ? `${policy.detalhes_veiculo?.modelo} (${policy.detalhes_veiculo?.placa})`
                : 'Residencial';

            return `
                <div class="policy-card">
                    <div class="policy-header">
                        <span class="seguradora-tag">${policy.seguradora}</span>
                        <i class="${icon} ramo-icon"></i>
                    </div>
                    <div class="policy-title">${policy.ramo}</div>
                    <div class="policy-details">Nº ${policy.numero_apolice}</div>
                    
                    <div class="policy-info-item">
                        <span class="policy-info-label">${detailLabel}</span>
                        <span class="policy-info-value">${detailValue}</span>
                    </div>
                    <div class="policy-info-item">
                        <span class="policy-info-label">Vencimento</span>
                        <span class="policy-info-value">${new Date(policy.data_fim).toLocaleDateString('pt-BR')}</span>
                    </div>
                    
                    <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <span class="status-badge status-ativa">${policy.status}</span>
                        <button style="background: none; border: none; color: #10b981; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                            VER DETALHES <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getIcon(ramo) {
        switch (ramo.toUpperCase()) {
            case 'AUTOMOVEL': return 'fas fa-car';
            case 'RESIDENCIAL': return 'fas fa-home';
            case 'VIDA': return 'fas fa-heartbeat';
            default: return 'fas fa-file-contract';
        }
    }

    // --- Lógica do Chat ---
    const chatFab = document.getElementById('chatFab');
    const chatContainer = document.getElementById('chatContainer');
    const closeChat = document.getElementById('closeChat');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');

    // Abre/Fecha Chat
    chatFab.addEventListener('click', () => {
        chatContainer.style.display = 'flex';
        chatFab.style.display = 'none';
        chatInput.focus();
    });

    closeChat.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        chatFab.style.display = 'flex';
    });

    // Enviar Mensagem
    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Adiciona mensagem do usuário
        addMessage('user', text);
        chatInput.value = '';

        try {
            // Typing indicator (opcional)
            const botMsg = addMessage('bot', 'Digitando...');

            const response = await fetch(`${API_URL}/policies/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();

            // Remove o "Digitando..." e coloca a resposta real
            botMsg.remove();
            addMessage('bot', data.response);

        } catch (error) {
            console.error('Erro no chat:', error);
            addMessage('bot', 'Desculpe, tive um problema técnico. Pode repetir?');
        }
    }

    sendMessage.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    function addMessage(type, text) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }
});
