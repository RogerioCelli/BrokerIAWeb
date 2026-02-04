# Projeto Broker IA Web - Visão Geral do Produto

O **Broker IA Web** é uma plataforma SaaS (Software as a Service) multitenant projetada para modernizar a interação entre segurados e corretoras de seguros por meio de Inteligência Artificial avançada.

## 🚀 Arquitetura do Produto

### 1. Portal Multitenant (Frontend)
- Interface única que se adapta dinamicamente à marca de cada corretora.
- Login via 2FA (Sem senhas tradicionais, apenas Token por E-mail/SMS).
- Chatbot Web integrado nativamente.
- Dashboard do Segurado (Minhas Apólices, Sinistros, Pagamentos).

### 2. Backend Central (API)
- Arquitetura Node.js escalável.
- Isolamento de dados por `org_id`.
- Integração fluida com n8n (Orquestrador de IA).

### 3. Engine de IA (n8n + Gemini/OpenRouter)
- Atendimento híbrido (Vendas, Administrativo, Sinistros).
- Processamento de documentos (OCR para CNH, Documento do Carro, etc).

## 📂 Estrutura de Pastas
- `/backend`: API Server e Lógica de Negócio.
- `/frontend`: Aplicação Web Premium (React/Next.js ou Vite).
- `/database`: Scripts de migração e modelos de dados multitenant.
- `/docs`: Documentação técnica e de negócio.

## 🎯 Objetivos Iniciais
1. Desenvolver a Landing Page/Login do Portal.
2. Criar o Banco de Dados Multitenant do zero.
3. Integrar o Web Chat com o fluxo da IA.
