document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const tokenGroup = document.getElementById('tokenGroup');
    const mainButton = document.getElementById('mainButton');
    const identifierInput = document.getElementById('identifier');

    let isTokenStep = false;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!isTokenStep) {
            // Step 1: Request Token
            const identifier = identifierInput.value;
            console.log('Solicitando token para:', identifier);

            // Simulação de transição
            mainButton.textContent = 'Enviando...';
            mainButton.disabled = true;

            setTimeout(() => {
                identifierInput.disabled = true;
                tokenGroup.style.display = 'block';
                tokenGroup.style.animation = 'fadeInScale 0.5s ease forwards';
                mainButton.textContent = 'Validar Acesso';
                mainButton.disabled = false;
                isTokenStep = true;
            }, 1200);

        } else {
            // Step 2: Validate Token
            const token = document.getElementById('token').value;
            console.log('Validando código:', token);

            mainButton.textContent = 'Autenticando...';

            setTimeout(() => {
                // Aqui redirecionaríamos para o Dashboard
                alert('Acesso autorizado! Bem-vindo ao portal Broker IA.');
            }, 1500);
        }
    });
});
