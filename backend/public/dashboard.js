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
        window.allPolicies = policies; // Salva para o modal
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
            policiesGrid.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">Você ainda não possui apólices cadastradas.</p>';
            return;
        }

        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            // Layout de CARDS para Celular (Mobile First)
            policiesGrid.style.display = 'block';
            policiesGrid.innerHTML = policies.map(policy => {
                const icon = getIcon(policy.ramo);
                return `
                    <div class="policy-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 1.5rem; margin-bottom: 1rem; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <span class="seguradora-tag">${policy.seguradora}</span>
                            <i class="${icon}" style="color: var(--primary); font-size: 1.2rem;"></i>
                        </div>
                        
                        <h3 style="margin: 0.5rem 0; font-size: 1.1rem;">${policy.ramo} ${policy.placa ? `(${policy.placa})` : ''}</h3>
                        <p style="color: #888; font-size: 0.8rem; margin-bottom: 1.5rem;">Apólice: ${policy.numero_apolice}</p>
                        
                        <div style="display: flex; gap: 10px;">
                            <button onclick="showPolicyDetails(${policy.id})" style="flex: 1; padding: 12px; background: rgba(16, 185, 129, 0.1); color: var(--primary); border: 1px solid var(--primary-glow); border-radius: 12px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-search-plus"></i> Detalhes
                            </button>
                            ${policy.url_pdf && policy.url_pdf !== 'undefined' ? `
                                <a href="${policy.url_pdf}" target="_blank" style="width: 50px; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px;">
                                    <i class="fas fa-file-pdf"></i>
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // Layout de TABELA DARK (Conforme aprovado na imagem)
            policiesGrid.style.display = 'block';
            policiesGrid.style.overflowX = 'auto';
            let html = `
                <table style="width: 100%; border-collapse: collapse; background: rgba(13, 20, 31, 0.6); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(10px);">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left;">
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">RAMO</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">APÓLICE</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">SEGURADORA</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">VIGÊNCIA</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; text-align: center;">DETALHES</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; text-align: center;">DOWNLOAD</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            policies.forEach(policy => {
                const icon = getIcon(policy.ramo);
                const vigencia = `${new Date(policy.data_inicio).toLocaleDateString('pt-BR')}<br><span style="color: #555;">-</span><br>${new Date(policy.data_fim).toLocaleDateString('pt-BR')}`;

                html += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                        <td style="padding: 1.2rem; display: flex; align-items: center; gap: 15px;">
                            <i class="${icon}" style="color: var(--primary); font-size: 1.2rem; width: 24px;"></i>
                            <span style="font-weight: 500; color: #fff;">${policy.ramo}</span>
                        </td>
                        <td style="padding: 1.2rem; color: #888; font-family: monospace; font-size: 0.9rem;">${policy.numero_apolice}</td>
                        <td style="padding: 1.2rem; color: #ccc;">${policy.seguradora || '-'}</td>
                        <td style="padding: 1.2rem; font-size: 0.85rem; color: #ccc; line-height: 1.2;">${vigencia}</td>
                        <td style="padding: 1.2rem; text-align: center;">
                            <button onclick="showPolicyDetails(${policy.id})" style="background: none; border: none; color: var(--primary); cursor: pointer; font-size: 1.3rem; transition: transform 0.2s;" title="Ver Detalhes" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                                <i class="fas fa-search-plus"></i>
                            </button>
                        </td>
                        <td style="padding: 1.2rem; text-align: center;">
                            ${policy.url_pdf && policy.url_pdf !== 'undefined' ? `
                                <a href="${policy.url_pdf}" target="_blank" style="color: #ef4444; font-size: 1.3rem; transition: transform 0.2s; display: inline-block;" title="Baixar PDF" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                                    <i class="fas fa-file-pdf"></i>
                                </a>
                            ` : `
                                <i class="fas fa-clock" style="color: #333; font-size: 1.1rem;" title="Aguardando Sincronização"></i>
                            `}
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            policiesGrid.innerHTML = html;
        }
    }

    function getIcon(ramo) {
        if (!ramo) return 'fas fa-file-contract';
        switch (ramo.toUpperCase()) {
            case 'AUTOMOVEL': return 'fas fa-car';
            case 'RESIDENCIAL': return 'fas fa-home';
            case 'VIDA': return 'fas fa-heartbeat';
            default: return 'fas fa-file-contract';
        }
    }

    // --- Lógica do Modal de Detalhes ---
    const policyModal = document.getElementById('policyModal');
    const closeModal = document.getElementById('closeModal');
    const modalBody = document.getElementById('modalBody');

    closeModal.onclick = () => policyModal.style.display = 'none';
    window.onclick = (event) => { if (event.target == policyModal) policyModal.style.display = 'none'; }

    window.showPolicyDetails = (policyId) => {
        const policy = window.allPolicies.find(p => p.id == policyId);
        if (!policy) return;

        // Mapeamento de Labels Amigáveis para os campos técnicos do banco
        const labels = {
            numero_apolice: 'Número da Apólice',
            seguradora: 'Seguradora',
            ramo: 'Ramo de Seguro',
            produto: 'Produto / Descrição',
            placa: 'Placa do Veículo',
            chassi: 'Chassi',
            vigencia_inicio: 'Início da Vigência',
            vigencia_fim: 'Fim da Vigência',
            premio_total: 'Prêmio Total',
            forma_pagamento: 'Forma de Pagamento',
            status_apolice: 'Status Atual',
            endereco_apolice: 'Localização/Endereço',
            cidade_apolice: 'Cidade',
            uf_apolice: 'Estado (UF)',
            cep_apolice: 'CEP',
            data_criacao: 'Data do Registro'
        };

        let detailsHtml = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
                <h2 style="margin: 0; font-family: 'Outfit'; font-size: 1.8rem;">Detalhes da Apólice</h2>
                 <span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">
                    ${policy.status}
                </span>
            </div>
            <div class="details-grid">
        `;

        // Itera por todos os campos que queremos mostrar
        Object.keys(labels).forEach(key => {
            let value = policy[key] || policy[key.replace('status_apolice', 'status')] || '-';

            // Tratamento especial para datas
            if (key.includes('data') || key.includes('vigencia')) {
                value = value !== '-' ? new Date(value).toLocaleDateString('pt-BR') : '-';
            }

            detailsHtml += `
                <div class="detail-box">
                    <span class="detail-label">${labels[key]}</span>
                    <span class="detail-value">${value}</span>
                </div>
            `;
        });

        detailsHtml += `</div>`;

        if (policy.url_pdf && policy.url_pdf !== 'undefined') {
            detailsHtml += `
            <div style="margin-top: 2rem; padding: 1rem; background: rgba(59, 130, 246, 0.05); border-radius: 12px; border: 1px border-style: dashed; border-color: #3b82f6; text-align: center;">
                <p style="margin-bottom: 1rem; font-size: 0.9rem; color: #3b82f6;">Documento PDF disponível para visualização oficial.</p>
                <a href="${policy.url_pdf}" target="_blank" class="btn-login" style="max-width: 300px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; text-decoration: none;">
                    <i class="fas fa-file-pdf"></i> Abrir Apólice Digital
                </a>
            </div>
            `;
        }

        modalBody.innerHTML = detailsHtml;
        policyModal.style.display = 'flex';
    };

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
