-- ########################################################
-- BROKER IA WEB - DADOS INICIAIS DE TESTE (SEED)
-- ########################################################

-- 0. Popular Seguradoras do Brasil (Dados Completos)
INSERT INTO seguradoras (nome, telefone_capital, telefone_0800, site_url, email, observacao) VALUES
('AIG Seguros', NULL, '0800 726 6130', 'https://www.aig.com.br', 'sac.brasil@aig.com', 'SAC'),
('Alfa Seguradora', '4003 2532', '0800 888 2532', 'https://www.segurosalfa.com.br', 'sac@segurosalfa.com.br', 'SAC'),
('Allianz', NULL, '0800 130 700', 'https://www.allianz.com.br', 'sac@allianz.com.br', 'SAC / Assistência'),
('Azul Seguros', '4004 3700', '0800 703 0203', 'https://www.azulseguros.com.br', 'atendimento@azulseguros.com.br', 'Auto'),
('Aruana Seguradora', NULL, '0800 701 4887', 'https://www.aruanaseguradora.com.br', 'sac@aruanaseguradora.com.br', 'SAC'),
('BB Seguros', NULL, '0800 729 7000', 'https://www.bbseguros.com.br', 'atendimento@bbseguros.com.br', 'SAC'),
('Berkley', NULL, '0800 777 3123', 'https://www.berkley.com.br', 'sac@berkley.com.br', 'SAC'),
('Bradesco Seguros', '4004 2757', '0800 701 2757', 'https://www.bradescoseguros.com.br', 'sac@bradescoseguros.com.br', 'SAC / Sinistro'),
('Chubb', NULL, '0800 055 9091', 'https://www.chubb.com/br', 'sac.brasil@chubb.com', 'SAC'),
('Ezze Seguros', NULL, '0800 702 9985', 'https://www.ezzeseguros.com.br', 'sac@ezzeseguros.com.br', 'SAC'),
('Generali', NULL, '0800 707 0211', 'https://www.generali.com.br', 'sac@generali.com.br', 'SAC'),
('HDI Seguros', '3003 5390', '0800 434 4340', 'https://www.hdiseguros.com.br', 'sac@hdiseguros.com.br', 'SAC / Assistência'),
('Icatu Seguros', '4002 004', '0800 285 3000', 'https://www.icatuseguros.com.br', 'atendimento@icatu.com.br', 'Vida / Previdência'),
('Itaú Seguros', '3003 1010', '0800 720 1010', 'https://www.itauseguros.com.br', 'sac@itauseguros.com.br', 'SAC'),
('Justos', NULL, '0800 591 2259', 'https://www.justos.com.br', 'ajuda@justos.com.br', 'Auto'),
('Kovr Seguradora', NULL, '0800 646 8378', 'https://www.kovr.com.br', 'sac@kovr.com.br', 'Garantia'),
('Liberty Seguros', NULL, '0800 701 4120', 'https://www.libertyseguros.com.br', 'sac@libertyseguros.com.br', 'Assistência'),
('MAPFRE', '4002 1000', '0800 775 1000', 'https://www.mapfre.com.br', 'sac@mapfre.com.br', 'SAC'),
('Pier', NULL, '0800 770 9356', 'https://www.pier.digital', 'ajuda@pier.digital', 'Auto'),
('Porto Seguro', '4004 7678', '0800 727 0800', 'https://www.portoseguro.com.br', 'sac@portoseguro.com.br', 'SAC / Assistência'),
('Previsul', NULL, '0800 722 0264', 'https://www.previsul.com.br', 'sac@previsul.com.br', 'Vida'),
('Sompo', NULL, '0800 016 2727', 'https://www.sompo.com.br', 'sac@sompo.com.br', 'SAC'),
('Suhai', NULL, '0800 327 8424', 'https://www.suhaiseguradora.com', 'sac@suhaiseguradora.com', 'Auto'),
('Sura', NULL, '0800 774 0772', 'https://www.segurossura.com.br', 'sac@segurossura.com.br', 'SAC'),
('Tokio Marine', NULL, '0800 318 6546', 'https://www.tokiomarine.com.br', 'sac@tokiomarine.com.br', 'SAC'),
('Líder DPVAT', NULL, '0800 022 1204', 'https://www.seguradoralider.com.br', 'dpvat@seguradoralider.com.br', 'Sinistro DPVAT')
ON CONFLICT (nome) DO UPDATE SET 
    telefone_capital = EXCLUDED.telefone_capital,
    telefone_0800 = EXCLUDED.telefone_0800,
    site_url = EXCLUDED.site_url,
    email = EXCLUDED.email,
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
