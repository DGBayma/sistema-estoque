-- ============================================
-- USUÁRIOS (com permissões granulares)
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
    pode_adicionar BOOLEAN NOT NULL DEFAULT FALSE,
    pode_editar BOOLEAN NOT NULL DEFAULT FALSE,
    pode_excluir BOOLEAN NOT NULL DEFAULT FALSE,
    pode_relatorios BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FUNCIONÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS funcionarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    salario NUMERIC(10,2) NOT NULL DEFAULT 0,
    data_admissao DATE NOT NULL DEFAULT CURRENT_DATE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FORNECEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS fornecedores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(150),
    telefone VARCHAR(20),
    endereco TEXT,
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PRODUTOS (sem preco_venda)
-- ============================================
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    categoria VARCHAR(100),
    preco_custo NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantidade INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 5,
    imagem VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MOVIMENTAÇÕES
-- ============================================
CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    produto_id INT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    funcionario_id INT REFERENCES funcionarios(id) ON DELETE SET NULL,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade INT NOT NULL CHECK (quantidade > 0),
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CONTATOS (mensagens da página de manutenção)
-- ============================================
CREATE TABLE IF NOT EXISTS contatos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    mensagem TEXT NOT NULL,
    origem VARCHAR(50),
    user_agent TEXT,
    respondido BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICAÇÕES (e-mails agendados para "sistema voltou")
-- ============================================
CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    origem VARCHAR(50) DEFAULT 'manutencao',
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro')),
    erro TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enviado_em TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_email ON notificacoes(email);

-- ============================================
-- SEEDS (dados iniciais)
-- ============================================

-- Admin com TODAS as permissões (senha: admin123)
INSERT INTO usuarios (nome, email, senha_hash, role, pode_adicionar, pode_editar, pode_excluir, pode_relatorios) VALUES
('Administrador', 'admin@estoque.com', '$2a$10$0mjpUqfdpgCKc1ATj8YQcucaHUx16KXVqZNa8DoqQUyp9/F0L4ZmS', 'admin', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO funcionarios (nome, cpf, email, cargo, salario) VALUES
('João Silva', '111.111.111-11', 'joao@empresa.com', 'Gerente', 5000.00),
('Maria Souza', '222.222.222-22', 'maria@empresa.com', 'Vendedora', 2800.00)
ON CONFLICT (cpf) DO NOTHING;

INSERT INTO fornecedores (nome, cnpj, email, telefone) VALUES
('Distribuidora ABC', '12.345.678/0001-90', 'contato@abc.com', '(11) 98765-4321'),
('Tech Import', '98.765.432/0001-10', 'vendas@techimport.com', '(11) 91234-5678')
ON CONFLICT (cnpj) DO NOTHING;

INSERT INTO produtos (nome, descricao, sku, categoria, preco_custo, quantidade, estoque_minimo) VALUES
('Notebook Dell', 'Notebook i5 8GB', 'NB-DELL-001', 'Informática', 2500.00, 10, 3),
('Mouse Logitech', 'Mouse sem fio', 'MS-LOG-001', 'Periféricos', 50.00, 50, 10),
('Teclado Mecânico', 'RGB ABNT2', 'TC-MEC-001', 'Periféricos', 150.00, 25, 5),
('Monitor LG 24"', 'Full HD IPS', 'MN-LG-001', 'Informática', 600.00, 8, 2),
('Headset HyperX', 'Cloud Stinger', 'HS-HX-001', 'Áudio', 200.00, 15, 4)
ON CONFLICT (sku) DO NOTHING;

-- Movimentações de exemplo
INSERT INTO movimentacoes (produto_id, funcionario_id, tipo, quantidade, observacao, criado_em) VALUES
  (2, 1, 'saida', 8,  'Venda balcão',       NOW() - INTERVAL '1 day'),
  (2, 2, 'saida', 5,  'Venda online',       NOW() - INTERVAL '2 days'),
  (2, 1, 'saida', 3,  'Venda corporativa',  NOW() - INTERVAL '3 days'),
  (1, 1, 'saida', 2,  'Venda balcão',       NOW() - INTERVAL '5 days'),
  (1, 2, 'saida', 1,  'Venda online',       NOW() - INTERVAL '7 days'),
  (3, 2, 'saida', 6,  'Venda balcão',       NOW() - INTERVAL '1 day'),
  (3, 1, 'saida', 4,  'Venda online',       NOW() - INTERVAL '4 days'),
  (5, 2, 'saida', 3,  'Venda corporativa',  NOW() - INTERVAL '2 days'),
  (5, 1, 'saida', 2,  'Venda balcão',       NOW() - INTERVAL '6 days'),
  (4, 2, 'saida', 1,  'Venda online',       NOW() - INTERVAL '8 days'),
  (2, 1, 'entrada', 20, 'Reposição fornecedor', NOW() - INTERVAL '10 days'),
  (3, 2, 'entrada', 15, 'Compra mensal',        NOW() - INTERVAL '12 days'),
  (1, 1, 'entrada', 5,  'Reposição urgente',    NOW() - INTERVAL '9 days'),
  (5, 2, 'entrada', 10, 'Compra trimestral',    NOW() - INTERVAL '11 days'),
  (4, 1, 'entrada', 4,  'Reposição',            NOW() - INTERVAL '13 days');