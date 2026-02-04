-- ########################################################
-- BROKER IA WEB - DADOS INICIAIS DE TESTE (SEED)
-- ########################################################

-- 1. Criar a Organização Demo
INSERT INTO organizacoes (id, nome, cnpj, slug, logo_url, primaria_color, secundaria_color, configuracoes)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- ID Fixo para facilitar testes
    'Broker IA Corretora Demo',
    '12.345.678/0001-90',
    'corretora-demo',
    'https://img.icons8.com/fluency/96/shield.png',
    '#10b981',
    '#050a10',
    '{"tom_voz": "profissional", "assistente_nome": "BrokerIA"}'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Criar um Usuário Administrador para a Corretora
INSERT INTO usuarios_admin (org_id, nome, email, senha_hash, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Rogerio Celli',
    'rogerio.celli@gmail.com',
    '$2b$10$SomethingSecure', -- Senha fictícia para exemplo
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- 3. Criar um Cliente (O Segurado que vai fazer login)
-- IMPORTANTE: Use este CPF para testar o login no portal
INSERT INTO clientes (id, org_id, nome, cpf_cnpj, email, telefone)
VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Rogerio Cliente Teste',
    '123.456.789-00',
    'rogerio.celli@gmail.com',
    '+5511999999999'
) ON CONFLICT (org_id, cpf_cnpj) DO NOTHING;

-- 4. Criar uma Apólice para este cliente
INSERT INTO apolices (org_id, cliente_id, numero_apolice, seguradora, ramo, data_inicio, data_fim, status, detalhes_veiculo)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'AP-2026-X100',
    'Porto Seguro',
    'AUTOMOVEL',
    '2026-01-01',
    '2027-01-01',
    'ATIVA',
    '{"placa": "ABC-1234", "modelo": "Tesla Model S", "ano": 2024}'
) ON CONFLICT (org_id, numero_apolice) DO NOTHING;

-- 5. Criar outra Apólice (Residencial)
INSERT INTO apolices (org_id, cliente_id, numero_apolice, seguradora, ramo, data_inicio, data_fim, status, detalhes_imovel)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'RE-2026-Z200',
    'Liberty Seguros',
    'RESIDENCIAL',
    '2025-06-01',
    '2026-06-01',
    'ATIVA',
    '{"endereco": "Av. Paulista, 1000 - São Paulo/SP", "tipo": "Apartamento"}'
) ON CONFLICT (org_id, numero_apolice) DO NOTHING;
