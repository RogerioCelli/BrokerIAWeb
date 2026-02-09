document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('broker_ia_token');
    const userData = JSON.parse(localStorage.getItem('broker_ia_user') || '{}');
    const API_URL = 'https://brokeria-api-brokeriaweb.cx0m9g.easypanel.host/api';

    // Redireciona se não estiver logado
    if (!token || !userData.id) {
        window.location.href = 'index.html';
        return;
    }

    // Preenche dados básicos e da organização
    document.getElementById('welcomeName').textContent = `Olá, ${userData.nome.split(' ')[0]}!`;
    document.getElementById('orgName').textContent = userData.org_nome || 'Broker IA Corretora Demo';

    // Preencher Rodapé Institucional (Dados da Corretora)
    if (userData.contatos_org) {
        document.getElementById('footerOrgName').textContent = userData.org_nome;
        document.getElementById('footerAddress').textContent = userData.contatos_org.endereco || 'Endereço não informado';

        const footerContacts = document.getElementById('footerContacts');
        const c = userData.contatos_org;

        footerContacts.innerHTML = `
            <div class="contact-group">
                <h4>Atendimento Digital</h4>
                ${c.site ? `<a href="${c.site}" target="_blank" class="footer-link"><i class="fas fa-globe"></i> ${c.site.replace('https://', '').replace(/\/$/, '')}</a>` : ''}
                ${c.email ? `<a href="mailto:${c.email}" class="footer-link"><i class="fas fa-envelope"></i> ${c.email}</a>` : ''}
            </div>
            <div class="contact-group">
                <h4>Fale Conosco</h4>
                ${c.fixo ? `<a href="tel:${c.fixo.replace(/\D/g, '')}" class="footer-link"><i class="fas fa-phone-alt"></i> ${c.fixo} (Fixo)</a>` : ''}
                ${c.celular ? `<a href="https://wa.me/${c.celular.replace(/\D/g, '')}" target="_blank" class="footer-link" style="color: #25d366;"><i class="fab fa-whatsapp"></i> ${c.celular} (WhatsApp)</a>` : ''}
            </div>
        `;
    }

    const policiesGrid = document.getElementById('policiesGrid');
    const logoutBtn = document.getElementById('logoutBtn');

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Manipulação de cliques em ações das apólices (Documentos e Envio de Docs)
    policiesGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-action');
        if (!btn) return;

        const isDocuments = btn.classList.contains('btn-documents');
        const policyNum = btn.closest('.policy-card').querySelector('.policy-details').textContent;

        if (isDocuments) {
            console.log(`Documentos Disponíveis (${policyNum})`);
            // Aqui podemos abrir um modal no futuro
        } else {
            const safePath = userData.cpf_cnpj.replace(/\D/g, '');
            console.log(`Módulo de Envio para pasta: /upload_cliente/${safePath}/`);
            // Aqui podemos abrir um modal no futuro
        }
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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Erro ao carregar apólices');
        }

        const policies = await response.json();
        renderPolicies(policies);
    } catch (error) {
        console.error(error);
        policiesGrid.innerHTML = `
            <div class="policy-card" style="border-color: #ff3b30">
                <p style="color: #ff3b30">Erro: ${error.message}</p>
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

            // Lógica Simplificada conforme solicitado (Apenas dados da tabela Mestra)
            const detailLabel = 'Ramo'; // Antes detalhe do veiculo
            const detailValue = policy.ramo;

            // Se não temos mais detalhes do veiculo, mostramos apenas a placa se existir na tabela principal
            const placaInfo = policy.placa ? `(Placa: ${policy.placa})` : '';

            // Falback simples para contatos se não vier no objeto (pois vinha de join as vezes)
            const tel0800 = 'Central 24h';

            return `
                <div class="policy-card">
                    <div class="policy-header">
                        <div class="seguradora-container">
                            <span class="seguradora-tag">${policy.seguradora}</span>
                        </div>
                        <i class="${icon} ramo-icon"></i>
                    </div>
                    
                    <div class="policy-title">${policy.ramo} ${placaInfo}</div>
                    <div class="policy-details">Apólice: ${policy.numero_apolice}</div>
                    
                    <div class="policy-info-item">
                        <span class="policy-info-label">Vigência Início</span>
                        <span class="policy-info-value">${new Date(policy.data_inicio).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div class="policy-info-item">
                        <span class="policy-info-label">Vencimento</span>
                        <span class="policy-info-value">${new Date(policy.data_fim).toLocaleDateString('pt-BR')}</span>
                    </div>

                    <div class="policy-info-item">
                        <span class="policy-info-label">Status</span>
                        <span class="policy-info-value" style="color: ${policy.status === 'ATIVA' ? '#10b981' : '#f59e0b'}">
                            ${policy.status}
                        </span>
                    </div>

                    <div class="policy-actions" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button class="btn-action btn-documents" style="flex: 1; padding: 0.5rem; border-radius: 8px; font-size: 0.75rem; cursor: pointer; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2);">
                            <i class="fas fa-eye"></i> Visualizar Detalhes
                        </button>
                    </div>
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
            // --- Orquestração de Agentes dinâmica ---
            let statusText = '<i class="fas fa-search"></i> Agente de Busca consultando banco de dados...';
            if (text.toLowerCase().includes('cobertura') || text.toLowerCase().includes('guincho') || text.toLowerCase().includes('granizo')) {
                statusText = '<i class="fas fa-file-pdf"></i> Agente de Documentos analisando apólice digitalizada...';
            }

            const agentStatus = showAgentStatus(statusText);

            // Simula delay de orquestração
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            await delay(1200);

            if (text.toLowerCase().includes('cobertura') || text.toLowerCase().includes('guincho')) {
                agentStatus.innerHTML = '<i class="fas fa-microchip"></i> Extraindo cláusulas de assistência 24h...';
            } else {
                agentStatus.innerHTML = '<i class="fas fa-brain"></i> Agente de Análise processando apólice...';
            }
            await delay(1500);

            agentStatus.innerHTML = '<i class="fas fa-check-circle"></i> Resposta gerada com sucesso';
            await delay(500);
            agentStatus.remove();

            const response = await fetch(`${API_URL} /policies/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token} `,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            addMessage('bot', data.response);

        } catch (error) {
            console.error('Erro no chat:', error);
            const status = document.querySelector('.agent-status');
            if (status) status.remove();
            addMessage('bot', 'Desculpe, tive um problema técnico. Pode repetir?');
        }
    }

    sendMessage.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    function addMessage(type, text) {
        const div = document.createElement('div');
        div.className = `message ${type} `;
        div.textContent = text;
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
});
