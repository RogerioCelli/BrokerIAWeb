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


