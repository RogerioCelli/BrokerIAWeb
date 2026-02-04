document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const tokenGroup = document.getElementById('tokenGroup');
    const mainButton = document.getElementById('mainButton');
    const identifierInput = document.getElementById('identifier');
    const tokenInput = document.getElementById('token');

    const ORG_SLUG = 'corretora-demo';
    const API_URL = 'http://localhost:5000/api';

    let isTokenStep = false;
    let clientId = null;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        mainButton.disabled = true;
        const originalBtnText = mainButton.textContent;

        try {
            if (!isTokenStep) {
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
                if (!response.ok) throw new Error(data.error || 'Erro ao solicitar acesso');

                clientId = data.client_id;
                identifierInput.disabled = true;
                tokenGroup.style.display = 'block';
                tokenGroup.style.animation = 'fadeInScale 0.5s ease forwards';
                if (tokenInput) tokenInput.focus();

                mainButton.textContent = 'Validar Acesso';
                mainButton.disabled = false;
                isTokenStep = true;

            } else {
                mainButton.textContent = 'Autenticando...';

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
                }, 500);
            }
        } catch (error) {
            alert(error.message);
            mainButton.textContent = originalBtnText;
            mainButton.disabled = false;
        }
    });
});
