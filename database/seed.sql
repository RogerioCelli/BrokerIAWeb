-- ########################################################
-- BROKER IA WEB - DADOS INICIAIS DE TESTE (SEED)
-- ########################################################

-- 0. Popular Seguradoras do Brasil
INSERT INTO seguradoras (nome, telefone_capital, telefone_0800, observacao) VALUES
('AIG Seguros', NULL, '0800 726 6130', 'SAC'),
('Alfa Seguradora', '4003 2532', '0800 888 2532', 'SAC'),
('Allianz', NULL, '0800 130 700', 'SAC / Assistência'),
('Azul Seguros', '4004 3700', '0800 703 0203', 'Auto'),
('Aruana Seguradora', NULL, '0800 701 4887', 'SAC'),
('BB Seguros', NULL, '0800 729 7000', 'SAC'),
('Berkley', NULL, '0800 777 3123', 'SAC'),
('Bradesco Seguros', '4004 2757', '0800 701 2757', 'SAC / Sinistro'),
('Chubb', NULL, '0800 055 9091', 'SAC'),
('Ezze Seguros', NULL, '0800 702 9985', 'SAC'),
('Generali', NULL, '0800 707 0211', 'SAC'),
('HDI Seguros', '3003 5390', '0800 434 4340', 'SAC / Assistência'),
('Icatu Seguros', '4002 004', '0800 285 3000', 'Vida / Previdência'),
('Itaú Seguros', '3003 1010', '0800 720 1010', 'SAC'),
('Justos', NULL, '0800 591 2259', 'Auto'),
('Kovr Seguradora', NULL, '0800 646 8378', 'Garantia'),
('Liberty Seguros', NULL, '0800 701 4120', 'Assistência'),
('MAPFRE', '4002 1000', '0800 775 1000', 'SAC'),
('Pier', NULL, '0800 770 9356', 'Auto'),
('Porto Seguro', '4004 7678', '0800 727 0800', 'SAC / Assistência'),
('Previsul', NULL, '0800 722 0264', 'Vida'),
('Sompo', NULL, '0800 016 2727', 'SAC'),
('Suhai', NULL, '0800 327 8424', 'Auto'),
('Sura', NULL, '0800 774 0772', 'SAC'),
('Tokio Marine', NULL, '0800 318 6546', 'SAC'),
('Líder DPVAT', NULL, '0800 022 1204', 'Sinistro DPVAT')
ON CONFLICT (nome) DO UPDATE SET 
    telefone_capital = EXCLUDED.telefone_capital,
    telefone_0800 = EXCLUDED.telefone_0800,
    observacao = EXCLUDED.observacao;

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
