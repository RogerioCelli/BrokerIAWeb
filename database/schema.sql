-- ########################################################
-- BROKER IA WEB - SCHEMA MULTITENANT (PÓS-GRADUADO)
-- ########################################################

-- 0. Tabela de Seguradoras (Master Data)
CREATE TABLE IF NOT EXISTS seguradoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) UNIQUE NOT NULL,
    telefone_capital VARCHAR(20),
    telefone_0800 VARCHAR(20),
    observacao TEXT,
    site_url TEXT,
    ativo BOOLEAN DEFAULT TRUE
);

-- 1. Tabela de Organizações (As Corretoras que assinam o SaaS)
CREATE TABLE IF NOT EXISTS organizacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    slug VARCHAR(50) UNIQUE NOT NULL, -- Ex: 'corretora-robo', 'xyz-seguros' (usado na URL)
    logo_url TEXT,
    primaria_color VARCHAR(7) DEFAULT '#10b981',
    secundaria_color VARCHAR(7) DEFAULT '#050a10',
    configuracoes JSONB DEFAULT '{}', -- Configurações de IA, tom de voz, etc.
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT TRUE
);

-- 2. Tabela de Usuários Administrativos (Donos e Atendentes da Corretora)
CREATE TABLE IF NOT EXISTS usuarios_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizacoes(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'atendente', -- 'admin', 'supervisor', 'atendente'
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Clientes (Segurados de cada Corretora) -- CONCEITO MULTITENANT AQUI
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizacoes(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(18) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    data_nascimento DATE,
    cadastrado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, cpf_cnpj) -- O mesmo cliente pode estar em corretoras diferentes, mas não duplicado na mesma.
);

-- 4. Tabela de Apólices (O core do negócio)
CREATE TABLE IF NOT EXISTS apolices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizacoes(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    numero_apolice VARCHAR(50) NOT NULL,
    seguradora VARCHAR(100) NOT NULL,
    ramo VARCHAR(50) NOT NULL, -- 'AUTOMOVEL', 'RESIDENCIAL', etc.
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ATIVA', -- 'ATIVA', 'CANCELADA', 'VENCIDA'
    detalhes_veiculo JSONB, -- Se for auto
    detalhes_imovel JSONB, -- Se for residencial
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, numero_apolice)
);

-- 5. Tabela de Tokens (Para o Login 2FA do Segurado)
CREATE TABLE IF NOT EXISTS tokens_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Sessões/Histórico de Chat (Independente do canal)
CREATE TABLE IF NOT EXISTS atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizacoes(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    canal VARCHAR(20) DEFAULT 'WEB', -- 'WEB', 'WHATSAPP'
    assunto_principal VARCHAR(100),
    prioridade VARCHAR(20) DEFAULT 'Média',
    status VARCHAR(20) DEFAULT 'PENDENTE',
    historico_json JSONB DEFAULT '[]', -- Armazena o log completo da conversa
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_ultima_msg TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES para performance em escala
CREATE INDEX idx_apolices_org ON apolices(org_id);
CREATE INDEX idx_clientes_org ON clientes(org_id);
CREATE INDEX idx_atendimentos_org ON atendimentos(org_id);
CREATE INDEX idx_clientes_documento ON clientes(cpf_cnpj);
