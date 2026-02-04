document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('broker_ia_token');
    const userData = JSON.parse(localStorage.getItem('broker_ia_user') || '{}');
    const API_URL = 'https://brokeriaweb-api-brokeriaweb.cx0m9g.easypanel.host/api';

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
            alert(`Documentos Disponíveis (${policyNum}):\n\n1. Carteirinha Digital.pdf\n2. Guia de Assistência 24h.pdf\n3. Condições Gerais ${userData.nome.split(' ')[0]}.pdf\n\n(Acesso liberado pelo repositório da Corretora)`);
        } else {
            const safePath = userData.cpf_cnpj.replace(/\D/g, '');
            alert(`Módulo de Envio:\nSeus arquivos (Fotos de vistoria, CNH, etc) serão salvos na sua pasta exclusiva de cliente:\n/upload_cliente/${safePath}/\n\nA corretora será notificada para conferência.`);
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

            const tel0800 = policy.telefone_0800 || 'Assitência 24h';
            const telCap = policy.telefone_capital ? `${policy.telefone_capital} / ` : '';
            const telFull = `${telCap}${tel0800}`;
            const siteUrl = policy.site_url || '#';
            const email = policy.email || '';

            return `
                <div class="policy-card">
                    <div class="policy-header">
                        <div class="seguradora-container">
                            <span class="seguradora-tag">${policy.seguradora}</span>
                            <div class="support-links">
                                <a href="tel:${tel0800.replace(/\D/g, '')}" class="support-item">
                                    <i class="fas fa-phone-alt"></i> ${telFull}
                                </a>
                                ${policy.site_url ? `
                                <a href="${siteUrl}" target="_blank" class="support-item">
                                    <i class="fas fa-globe"></i> Website Oficial
                                </a>` : ''}
                                ${policy.email ? `
                                <a href="mailto:${email}" class="support-item">
                                    <i class="fas fa-envelope"></i> ${email}
                                </a>` : ''}
                            </div>
                        </div>
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

                    <div class="pdf-status ${policy.pdf_url ? 'ready' : ''}" style="margin-top: 1rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas ${policy.pdf_url ? 'fa-file-medical' : 'fa-file-circle-exclamation'}" style="color: ${policy.pdf_url ? '#10b981' : '#94a3b8'}"></i>
                        <span>${policy.pdf_url ? 'Carteirinha Digital Disponível' : 'Aguardando Documento Oficial'}</span>
                    </div>

                    <div class="policy-actions" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button class="btn-action btn-documents" style="flex: 1; padding: 0.5rem; border-radius: 8px; font-size: 0.75rem; cursor: pointer; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2);">
                            <i class="fas fa-folder-open"></i> Documentos
                        </button>
                        <button class="btn-action btn-upload-pdf" style="flex: 1; padding: 0.5rem; border-radius: 8px; font-size: 0.75rem; cursor: pointer; background: rgba(255, 255, 255, 0.05); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);" title="Envio de fotos de vistoria, CNH, etc.">
                            <i class="fas fa-camera"></i> Enviar Docs
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

            const response = await fetch(`${API_URL}/policies/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
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
        div.className = `message ${type}`;
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
