document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('broker_ia_token');
    const userData = JSON.parse(localStorage.getItem('broker_ia_user') || '{}');
    const API_URL = '/api'; // Versão relativa para facilitar deploy

    // Redireciona se não estiver logado
    if (!token || !userData.id) {
        window.location.href = 'index.html';
        return;
    }

    // Preenche dados básicos e da organização
    document.getElementById('welcomeName').textContent = `Olá, ${userData.nome.split(' ')[0]}!`;
    document.getElementById('orgName').textContent = userData.org_nome || 'Portal Broker IA';

    // Preencher Rodapé Institucional (Dados da Corretora)
    function renderFooter() {
        if (userData.contatos_org) {
            document.getElementById('footerOrgName').textContent = userData.org_nome;
            document.getElementById('footerAddress').textContent = userData.contatos_org.endereco || 'Endereço não informado';

            const footerContacts = document.getElementById('footerContacts');
            const c = userData.contatos_org;

            footerContacts.innerHTML = `
                <div class="contact-group">
                    <h4>Atendimento Digital</h4>
                    ${c.site ? `<a href="${c.site.startsWith('http') ? c.site : 'https://' + c.site}" target="_blank" class="footer-link"><i class="fas fa-globe"></i> ${c.site.replace('https://', '').replace(/\/$/, '')}</a>` : ''}
                    ${c.email ? `<a href="mailto:${c.email}" class="footer-link"><i class="fas fa-envelope"></i> ${c.email}</a>` : ''}
                </div>
                <div class="contact-group">
                    <h4>Fale Conosco</h4>
                    ${c.fixo ? `<a href="tel:${c.fixo.replace(/\D/g, '')}" class="footer-link"><i class="fas fa-phone-alt"></i> ${c.fixo} (Fixo)</a>` : ''}
                    ${c.celular ? `<a href="https://wa.me/${c.celular.replace(/\D/g, '')}" target="_blank" class="footer-link" style="color: #25d366;"><i class="fab fa-whatsapp"></i> ${c.celular} (WhatsApp)</a>` : ''}
                </div>
            `;
        }
    }
    renderFooter();

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

    function checkPdfLink(link) {
        if (!link) return false;
        const normalized = String(link).toLowerCase().trim();
        if (normalized === "" || normalized === "null" || normalized === "undefined" || normalized === "none") return false;
        return true;
    }

    // Converte qualquer link do Google Drive para download direto
    function getDownloadLink(link) {
        if (!link) return '#';
        // Formato: https://drive.google.com/file/d/FILE_ID/view?...
        const matchFile = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (matchFile) {
            return `https://drive.google.com/uc?export=download&id=${matchFile[1]}`;
        }
        // Formato: https://drive.google.com/open?id=FILE_ID
        const matchOpen = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (matchOpen) {
            return `https://drive.google.com/uc?export=download&id=${matchOpen[1]}`;
        }
        // Link direto (não é Google Drive) — retorna como está
        return link;
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
                const pdfLink = policy.link_url_apolice || policy.url_pdf || policy.url_link;
                const hasPdf = checkPdfLink(pdfLink);

                return `
                    <div class="policy-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 1.5rem; margin-bottom: 1rem; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <span class="seguradora-tag">${policy.seguradora || 'Buscando...'}</span>
                            <i class="${icon}" style="color: var(--primary); font-size: 1.2rem;"></i>
                        </div>
                        
                        <h3 style="margin: 0.5rem 0; font-size: 1.1rem;">${policy.ramo} ${policy.placa ? `(${policy.placa})` : ''}</h3>
                        <p style="color: #888; font-size: 0.8rem; margin-bottom: 1.5rem;">Apólice: ${policy.numero_apolice}</p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                            <button onclick="showPolicyDetails(${policy.id})" style="padding: 12px; background: rgba(16, 185, 129, 0.1); color: var(--primary); border: 1px solid var(--primary-glow); border-radius: 12px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-search-plus"></i> Detalhes
                            </button>
                            <button onclick="renewPolicy(${policy.id})" style="padding: 12px; background: rgba(59, 130, 246, 0.1); color: var(--secondary); border: 1px solid rgba(59,130,246,0.3); border-radius: 12px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-sync-alt"></i> Renovar
                            </button>
                        </div>
                        ${hasPdf ? `
                            <a href="${pdfLink}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; text-decoration: none; font-weight: 600;">
                                <i class="fas fa-file-pdf"></i> Baixar Apólice Digital
                            </a>
                        ` : '<p style="font-size:0.75rem; color:#64748b; text-align:center;">Documento não disponível</p>'}
                    </div>
                `;
            }).join('');
        } else {
            // Layout de TABELA DARK (Premium)
            policiesGrid.style.display = 'block';
            policiesGrid.style.overflowX = 'auto';
            let html = `
                <table style="width: 100%; border-collapse: collapse; background: rgba(13, 20, 31, 0.6); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(10px);">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left;">
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">RAMO / ITEM</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">APÓLICE</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">SEGURADORA</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">VIGÊNCIA</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; text-align: center;">AÇÕES</th>
                            <th style="padding: 1.5rem; color: #fff; font-family: 'Outfit'; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; text-align: center;">DOWNLOAD</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            policies.forEach(policy => {
                const icon = getIcon(policy.ramo);
                const formatDate = (d) => {
                    if (!d) return 'N/A';
                    const dt = new Date(d);
                    return isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleDateString('pt-BR');
                };
                const vigencia = `${formatDate(policy.data_inicio || policy.vigencia_inicio)}<br><span style="color: #444;">até</span><br>${formatDate(policy.data_fim || policy.vigencia_fim)}`;

                const pdfLink = policy.link_url_apolice || policy.url_pdf || policy.url_link;
                const hasPdf = checkPdfLink(pdfLink);

                html += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                        <td style="padding: 1.2rem; display: flex; align-items: center; gap: 15px;">
                            <div style="width: 40px; height: 40px; background: rgba(16, 185, 129, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                <i class="${icon}" style="color: var(--primary); font-size: 1.1rem;"></i>
                            </div>
                            <div>
                                <span style="font-weight: 600; color: #fff; display: block;">${policy.ramo}</span>
                                <span style="font-size: 0.75rem; color: #64748b;">${policy.placa || policy.chassi || 'Seguro Ativo'}</span>
                            </div>
                        </td>
                        <td style="padding: 1.2rem; color: #888; font-family: monospace; font-size: 0.9rem;">${policy.numero_apolice}</td>
                        <td style="padding: 1.2rem; color: #ccc;">${policy.seguradora || '-'}</td>
                        <td style="padding: 1.2rem; font-size: 0.85rem; color: #ccc; line-height: 1.4;">${vigencia}</td>
                        <td style="padding: 1.2rem; text-align: center;">
                            <div style="display: flex; gap: 10px; justify-content: center;">
                                <button onclick="showPolicyDetails(${policy.id})" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); width: 36px; height: 36px; border-radius: 8px; color: var(--primary); cursor: pointer; transition: all 0.2s;" title="Ver Detalhes">
                                    <i class="fas fa-search-plus"></i>
                                </button>
                                <button onclick="renewPolicy(${policy.id})" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59,130,246,0.2); width: 36px; height: 36px; border-radius: 8px; color: var(--secondary); cursor: pointer; transition: all 0.2s;" title="Solicitar Renovação">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </td>
                        <td style="padding: 1.2rem; text-align: center;">
                            ${hasPdf ? `
                                <a href="${pdfLink}" target="_blank" style="color: #ef4444; font-size: 1.4rem; transition: transform 0.2s; display: inline-block;" title="Baixar PDF da Apólice" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                                    <i class="fas fa-file-pdf"></i>
                                </a>
                            ` : `
                                <span style="color: #475569; font-size: 0.75rem;" title="Documento não vinculado">—</span>
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
        const r = ramo.toUpperCase();
        if (r.includes('AUTO')) return 'fas fa-car';
        if (r.includes('RESIDENCIAL')) return 'fas fa-home';
        if (r.includes('VIDA')) return 'fas fa-heartbeat';
        if (r.includes('TRANSPORTE')) return 'fas fa-truck';
        return 'fas fa-file-contract';
    }

    // --- Lógica do Modal de Detalhes ---
    const policyModal = document.getElementById('policyModal');
    const closeModal = document.getElementById('closeModal');
    const modalBody = document.getElementById('modalBody');

    closeModal.onclick = () => policyModal.style.display = 'none';
    window.onclick = (event) => { if (event.target == policyModal) policyModal.style.display = 'none'; }

    window.renewPolicy = (policyId) => {
        const policy = window.allPolicies.find(p => p.id == policyId);
        if (!policy) return;

        // Salva os dados da apólice atual no localStorage para o formulário de cotação ler
        localStorage.setItem('renewal_data', JSON.stringify({
            tipo_cotacao: 'RENOVACAO',
            categoria: policy.ramo,
            seguradora: policy.seguradora,
            numero_apolice: policy.numero_apolice,
            placa: policy.placa,
            chassi: policy.chassi,
            bonus: policy.classe_bonus || 0, // se existir no banco
            vigencia_fim: policy.data_fim
        }));

        alert('Iniciando processo de renovação para a apólice ' + policy.numero_apolice);
        window.location.href = 'cotacao.html';
    };

    window.showPolicyDetails = (policyId) => {
        const policy = window.allPolicies.find(p => p.id == policyId);
        if (!policy) return;

        // Mapeamento de Labels Amigáveis (Enriquecido para o cliente)
        const labels = {
            numero_apolice: 'Número da Apólice',
            seguradora: 'Seguradora / Companhia',
            ramo: 'Ramo de Seguro',
            status: 'Situação Atual',
            placa: 'Placa do Veículo',
            chassi: 'Número do Chassi',
            premio_total: 'Valor do Prêmio (R$)',
            data_inicio: 'Início da Vigência',
            data_fim: 'Fim da Vigência',
            franquia: 'Tipo de Franquia',
            bonus: 'Classe de Bônus'
        };

        let detailsHtml = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 1rem;">
                <h2 style="margin: 0; font-family: 'Outfit'; font-size: 1.5rem; color: #fff;">
                    <i class="fas fa-shield-alt" style="color: var(--primary); margin-right: 10px;"></i>
                    Detalhes Técnicos
                </h2>
                 <span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 6px 16px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${policy.status || 'ATIVA'}
                </span>
            </div>
            <div class="details-grid">
        `;

        Object.keys(labels).forEach(key => {
            let value = policy[key] || '-';
            if (key.includes('data') || key.includes('vigencia')) {
                value = value !== '-' ? new Date(value).toLocaleDateString('pt-BR') : '-';
            }

            detailsHtml += `
                <div class="detail-box">
                    <span class="detail-label">${labels[key]}</span>
                    <span class="detail-value" style="color: ${value === '-' ? '#444' : '#fff'}">${value}</span>
                </div>
            `;
        });

        detailsHtml += `</div>`;

        const currentPdfLink = policy.link_url_apolice || policy.url_pdf || policy.url_link;
        const hasPdf = checkPdfLink(currentPdfLink);

        detailsHtml += `
            <div style="margin-top: 2.5rem; display: flex; gap: 1rem;">
                ${hasPdf ? `
                    <a href="${currentPdfLink}" target="_blank" class="btn-login" style="flex: 1; margin: 0; display: inline-flex; align-items: center; justify-content: center; gap: 10px; text-decoration: none;">
                        <i class="fas fa-file-pdf"></i> Visualizar PDF Oficial
                    </a>
                ` : ''}
                <button onclick="renewPolicy(${policy.id})" class="btn-login" style="flex: 1; margin: 0; background: rgba(59, 130, 246, 0.1); color: var(--secondary); border: 1px solid var(--secondary); display: inline-flex; align-items: center; justify-content: center; gap: 10px;">
                    <i class="fas fa-sync-alt"></i> Solicitar Renovação
                </button>
            </div>
        `;

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

        addMessage('user', text);
        chatInput.value = '';
        chatInput.disabled = true;
        sendMessage.disabled = true;

        // Inicia chamada ao n8n IMEDIATAMENTE em paralelo com a animação
        const n8nPromise = fetch(`${API_URL}/policies/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: text })
        });

        // Animação contextual
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
            const resposta = data.response || data.output || data.text || 'Não recebi resposta do agente.';
            addMessageHTML('bot', renderMarkdown(resposta));
        } catch (error) {
            console.error('Erro no chat:', error);
            agentStatus.remove();
            addMessage('bot', 'Desculpe, tive um problema técnico. Pode repetir?');
        } finally {
            chatInput.disabled = false;
            sendMessage.disabled = false;
            chatInput.focus();
        }
    }

    sendMessage.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) handleSend();
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
});
