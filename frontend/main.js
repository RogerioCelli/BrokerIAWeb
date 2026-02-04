document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const identifierGroup = document.getElementById('identifierGroup');
    const channelGroup = document.getElementById('channelGroup');
    const tokenGroup = document.getElementById('tokenGroup');
    const mainButton = document.getElementById('mainButton');

    const identifierInput = document.getElementById('identifier');
    const tokenInput = document.getElementById('token');
    const maskedPhone = document.getElementById('maskedPhone');
    const maskedEmail = document.getElementById('maskedEmail');

    // Máscara Dinâmica para CPF (11) ou CNPJ (14)
    identifierInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            // CPF: 000.000.000-00
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            // CNPJ: 00.000.000/0000-00
            value = value.slice(0, 14);
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        e.target.value = value;
    });

    const ORG_SLUG = 'corretora-demo';
    const API_URL = 'https://brokeriaweb-api-brokeriaweb.cx0m9g.easypanel.host/api';

    let currentStep = 'IDENTIFICATION'; // IDENTIFICATION, CHANNEL, TOKEN
    let clientId = null;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (mainButton.disabled) return;
        mainButton.disabled = true;
        const originalBtnText = mainButton.textContent;

        try {
            if (currentStep === 'IDENTIFICATION') {
                mainButton.textContent = 'Verificando...';

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
                maskedPhone.textContent = data.masked_phone || 'Não cadastrado';
                maskedEmail.textContent = data.masked_email || 'Não cadastrado';

                identifierGroup.style.display = 'none';
                channelGroup.style.display = 'block';
                mainButton.textContent = 'Enviar Código';
                currentStep = 'CHANNEL';

            } else if (currentStep === 'CHANNEL') {
                const selectedChannel = document.querySelector('input[name="auth_channel"]:checked').value;
                mainButton.textContent = 'Enviando...';

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
                mainButton.textContent = 'Validando...';

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

                mainButton.textContent = 'Sucesso!';
                setTimeout(() => {
                    alert(`Bem-vindo, ${data.user.nome}! Redirecionando...`);
                    window.location.href = 'dashboard.html';
                }, 500);
            }
        } catch (error) {
            alert(error.message);
            mainButton.textContent = originalBtnText;
        } finally {
            mainButton.disabled = false;
        }
    });
});
