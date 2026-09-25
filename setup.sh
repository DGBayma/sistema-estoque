#!/bin/bash
set -e

echo "📁 Criando estrutura de pastas..."
mkdir -p api/src/{routes,middlewares,controllers,utils}
mkdir -p api/db
mkdir -p api/uploads
mkdir -p api/tests
mkdir -p frontend/src/{pages,components,services,contexts}
mkdir -p frontend/public

echo "📝 Criando arquivos..."

# ============================================
# DOCKER COMPOSE
# ============================================
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: estoque_db
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
      POSTGRES_DB: estoque
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./api/db/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - estoque_net

  api:
    build: ./api
    container_name: estoque_api
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: admin
      DB_PASSWORD: admin123
      DB_NAME: estoque
      PORT: 3000
      JWT_SECRET: super_secret_jwt_key_change_me
      JWT_EXPIRES: 8h
    volumes:
      - uploads_data:/app/uploads
    networks:
      - estoque_net

  frontend:
    build: ./frontend
    container_name: estoque_frontend
    restart: always
    ports:
      - "5173:5173"
    depends_on:
      - api
    environment:
      VITE_API_URL: http://localhost:3000
    networks:
      - estoque_net

volumes:
  postgres_data:
  uploads_data:

networks:
  estoque_net:
    driver: bridge
EOF

# ============================================
# API - Dockerfile
# ============================================
cat > api/Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "src/server.js"]
EOF

# ============================================
# API - package.json
# ============================================
cat > api/package.json << 'EOF'
{
  "name": "sistema-estoque-api",
  "version": "3.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --runInBand --forceExit"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "exceljs": "^4.4.0",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.15.0",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.4",
    "supertest": "^7.0.0"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
EOF

# ============================================
# API - .env
# ============================================
cat > api/.env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=admin123
DB_NAME=estoque
PORT=3000
JWT_SECRET=super_secret_jwt_key_change_me
JWT_EXPIRES=8h
EOF

# ============================================
# API - init.sql (com coluna imagem)
# ============================================
cat > api/db/init.sql << 'EOF'
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    categoria VARCHAR(100),
    preco_custo NUMERIC(10,2) NOT NULL DEFAULT 0,
    preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantidade INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 5,
    imagem VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

INSERT INTO usuarios (nome, email, senha_hash, role) VALUES
('Administrador', 'admin@estoque.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin');

INSERT INTO funcionarios (nome, cpf, email, cargo, salario) VALUES
('João Silva', '111.111.111-11', 'joao@empresa.com', 'Gerente', 5000.00),
('Maria Souza', '222.222.222-22', 'maria@empresa.com', 'Vendedora', 2800.00);

INSERT INTO produtos (nome, descricao, sku, categoria, preco_custo, preco_venda, quantidade, estoque_minimo) VALUES
('Notebook Dell', 'Notebook i5 8GB', 'NB-DELL-001', 'Informática', 2500.00, 3500.00, 10, 3),
('Mouse Logitech', 'Mouse sem fio', 'MS-LOG-001', 'Periféricos', 50.00, 120.00, 50, 10),
('Teclado Mecânico', 'RGB ABNT2', 'TC-MEC-001', 'Periféricos', 150.00, 300.00, 25, 5),
('Monitor LG 24"', 'Full HD IPS', 'MN-LG-001', 'Informática', 600.00, 950.00, 8, 2),
('Headset HyperX', 'Cloud Stinger', 'HS-HX-001', 'Áudio', 200.00, 380.00, 15, 4);

INSERT INTO movimentacoes (produto_id, funcionario_id, tipo, quantidade, observacao) VALUES
(1, 1, 'entrada', 5, 'Compra inicial'),
(2, 2, 'saida', 3, 'Venda balcão'),
(3, 1, 'entrada', 10, 'Reposição'),
(4, 2, 'saida', 1, 'Venda online');
EOF

# ============================================
# API - database.js
# ============================================
cat > api/src/database.js << 'EOF'
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'estoque',
});

pool.on('connect', () => console.log('✅ Conectado ao PostgreSQL'));
pool.on('error', (err) => console.error('❌ Erro no PostgreSQL:', err));

module.exports = pool;
EOF

# ============================================
# API - middlewares/auth.js
# ============================================
cat > api/src/middlewares/auth.js << 'EOF'
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: 'Token não fornecido' });

  const [, token] = authHeader.split(' ');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function apenasAdmin(req, res, next) {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }
  next();
}

module.exports = { autenticar, apenasAdmin };
EOF

# ============================================
# API - middlewares/upload.js (Multer)
# ============================================
cat > api/src/middlewares/upload.js << 'EOF'
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nome = `prod_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, nome);
  },
});

function fileFilter(req, file, cb) {
  const ok = /jpeg|jpg|png|webp/.test(file.mimetype);
  cb(ok ? null : new Error('Apenas imagens jpg/png/webp são permitidas'), ok);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
EOF

# ============================================
# API - routes/auth.js
# ============================================
cat > api/src/routes/auth.js << 'EOF'
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { autenticar } = require('../middlewares/auth');

const router = express.Router();

router.post('/registrar', async (req, res) => {
  const { nome, email, senha, role } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Dados incompletos' });
  try {
    const hash = await bcrypt.hash(senha, 10);
    const { rows } = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role) VALUES ($1,$2,$3,$4)
       RETURNING id, nome, email, role`,
      [nome, email, hash, role === 'admin' ? 'admin' : 'user']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ erro: err.message }); }
});

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ erro: 'Credenciais inválidas' });
    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });
    const token = jwt.sign(
      { id: user.id, nome: user.nome, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '8h' }
    );
    res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.get('/me', autenticar, (req, res) => res.json(req.usuario));

module.exports = router;
EOF

# ============================================
# API - routes/funcionarios.js
# ============================================
cat > api/src/routes/funcionarios.js << 'EOF'
const express = require('express');
const router = express.Router();
const db = require('../database');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM funcionarios ORDER BY id');
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM funcionarios WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Funcionário não encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.post('/', async (req, res) => {
  const { nome, cpf, email, cargo, salario, data_admissao } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO funcionarios (nome, cpf, email, cargo, salario, data_admissao)
       VALUES ($1,$2,$3,$4,$5, COALESCE($6, CURRENT_DATE)) RETURNING *`,
      [nome, cpf, email, cargo, salario, data_admissao]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ erro: err.message }); }
});

router.put('/:id', async (req, res) => {
  const { nome, cpf, email, cargo, salario, ativo } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE funcionarios SET nome=$1, cpf=$2, email=$3, cargo=$4, salario=$5, ativo=$6
       WHERE id=$7 RETURNING *`,
      [nome, cpf, email, cargo, salario, ativo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Funcionário não encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ erro: err.message }); }
});

router.delete('/:id', apenasAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM funcionarios WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Funcionário não encontrado' });
    res.status(204).send();
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

module.exports = router;
EOF

# ============================================
# API - routes/produtos.js (com upload de imagem)
# ============================================
cat > api/src/routes/produtos.js << 'EOF'
const express = require('express');
const router = express.Router();
const db = require('../database');
const { autenticar, apenasAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(autenticar);

router.get('/alertas/baixo-estoque', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM produtos WHERE quantidade <= estoque_minimo ORDER BY quantidade'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM produtos ORDER BY id');
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Criar (com upload opcional de imagem)
router.post('/', upload.single('imagem'), async (req, res) => {
  const { nome, descricao, sku, categoria, preco_custo, preco_venda, quantidade, estoque_minimo } = req.body;
  const imagem = req.file ? req.file.filename : null;
  try {
    const { rows } = await db.query(
      `INSERT INTO produtos (nome, descricao, sku, categoria, preco_custo, preco_venda, quantidade, estoque_minimo, imagem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [nome, descricao, sku, categoria, preco_custo, preco_venda, quantidade || 0, estoque_minimo || 5, imagem]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ erro: err.message }); }
});

// Atualizar (com upload opcional)
router.put('/:id', upload.single('imagem'), async (req, res) => {
  const { nome, descricao, sku, categoria, preco_custo, preco_venda, quantidade, estoque_minimo } = req.body;
  try {
    let sql, params;
    if (req.file) {
      sql = `UPDATE produtos SET nome=$1, descricao=$2, sku=$3, categoria=$4, preco_custo=$5,
             preco_venda=$6, quantidade=$7, estoque_minimo=$8, imagem=$9 WHERE id=$10 RETURNING *`;
      params = [nome, descricao, sku, categoria, preco_custo, preco_venda, quantidade, estoque_minimo, req.file.filename, req.params.id];
    } else {
      sql = `UPDATE produtos SET nome=$1, descricao=$2, sku=$3, categoria=$4, preco_custo=$5,
             preco_venda=$6, quantidade=$7, estoque_minimo=$8 WHERE id=$9 RETURNING *`;
      params = [nome, descricao, sku, categoria, preco_custo, preco_venda, quantidade, estoque_minimo, req.params.id];
    }
    const { rows } = await db.query(sql, params);
    if (!rows[0]) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ erro: err.message }); }
});

// Upload separado de imagem
router.post('/:id/imagem', upload.single('imagem'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  try {
    const { rows } = await db.query(
      'UPDATE produtos SET imagem = $1 WHERE id = $2 RETURNING *',
      [req.file.filename, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ erro: err.message }); }
});

router.delete('/:id', apenasAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.status(204).send();
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

module.exports = router;
EOF

# ============================================
# API - routes/movimentacoes.js
# ============================================
cat > api/src/routes/movimentacoes.js << 'EOF'
const express = require('express');
const router = express.Router();
const db = require('../database');
const { autenticar } = require('../middlewares/auth');

router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT m.*, p.nome AS produto_nome, f.nome AS funcionario_nome
      FROM movimentacoes m
      LEFT JOIN produtos p ON p.id = m.produto_id
      LEFT JOIN funcionarios f ON f.id = m.funcionario_id
      ORDER BY m.id DESC LIMIT 200
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Estatísticas para o Dashboard
router.get('/estatisticas', async (req, res) => {
  try {
    const topProdutos = await db.query(`
      SELECT p.nome, SUM(m.quantidade) AS total
      FROM movimentacoes m
      JOIN produtos p ON p.id = m.produto_id
      WHERE m.tipo = 'saida'
      GROUP BY p.nome
      ORDER BY total DESC LIMIT 5
    `);

    const porCategoria = await db.query(`
      SELECT COALESCE(categoria,'Sem categoria') AS categoria,
             SUM(quantidade) AS total
      FROM produtos GROUP BY categoria
    `);

    const movPorDia = await db.query(`
      SELECT TO_CHAR(criado_em, 'DD/MM') AS dia,
             SUM(CASE WHEN tipo='entrada' THEN quantidade ELSE 0 END) AS entradas,
             SUM(CASE WHEN tipo='saida' THEN quantidade ELSE 0 END) AS saidas
      FROM movimentacoes
      WHERE criado_em >= NOW() - INTERVAL '14 days'
      GROUP BY TO_CHAR(criado_em, 'DD/MM'), DATE_TRUNC('day', criado_em)
      ORDER BY DATE_TRUNC('day', criado_em)
    `);

    const totalEstoque = await db.query(`
      SELECT COALESCE(SUM(preco_venda * quantidade),0) AS valor_total,
             COALESCE(SUM(quantidade),0) AS itens_total
      FROM produtos
    `);

    res.json({
      topProdutos: topProdutos.rows,
      porCategoria: porCategoria.rows,
      movPorDia: movPorDia.rows,
      totalEstoque: totalEstoque.rows[0],
    });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.post('/', async (req, res) => {
  const { produto_id, funcionario_id, tipo, quantidade, observacao } = req.body;
  if (!['entrada', 'saida'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo deve ser "entrada" ou "saida"' });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const prodRes = await client.query('SELECT * FROM produtos WHERE id = $1 FOR UPDATE', [produto_id]);
    const produto = prodRes.rows[0];
    if (!produto) throw new Error('Produto não encontrado');

    let novaQtd = produto.quantidade;
    if (tipo === 'entrada') novaQtd += quantidade;
    else {
      if (produto.quantidade < quantidade) throw new Error('Estoque insuficiente');
      novaQtd -= quantidade;
    }

    await client.query('UPDATE produtos SET quantidade = $1 WHERE id = $2', [novaQtd, produto_id]);
    const movRes = await client.query(
      `INSERT INTO movimentacoes (produto_id, funcionario_id, usuario_id, tipo, quantidade, observacao)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [produto_id, funcionario_id || null, req.usuario.id, tipo, quantidade, observacao]
    );
    await client.query('COMMIT');
    res.status(201).json({ movimentacao: movRes.rows[0], estoque_atual: novaQtd });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
EOF

# ============================================
# API - routes/relatorios.js (PDF + EXCEL)
# ============================================
cat > api/src/routes/relatorios.js << 'EOF'
const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../database');
const { autenticar } = require('../middlewares/auth');

const router = express.Router();
router.use(autenticar);

// ---------- PDF HELPERS ----------
function gerarCabecalho(doc, titulo) {
  doc.fontSize(20).fillColor('#0b3d91').text('Sistema de Estoque', { align: 'left' });
  doc.fontSize(14).fillColor('#333').text(titulo, { align: 'left' });
  doc.moveDown();
  doc.fontSize(9).fillColor('#666').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ccc').stroke();
  doc.moveDown();
}

function gerarRodape(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#999').text(`Página ${i + 1} de ${range.count}`, 50, 800, { align: 'center' });
  }
}

// ---------- PDF ROTAS ----------
router.get('/produtos', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM produtos ORDER BY nome');
    const doc = new PDFDocument({ margin: 50, bufferPages: true, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=produtos.pdf');
    doc.pipe(res);
    gerarCabecalho(doc, 'Relatório de Produtos');
    const headerY = doc.y;
    doc.fontSize(10).fillColor('#0b3d91').font('Helvetica-Bold');
    doc.text('SKU', 50, headerY, { width: 80 });
    doc.text('Nome', 130, headerY, { width: 180 });
    doc.text('Categoria', 310, headerY, { width: 100 });
    doc.text('Qtd', 410, headerY, { width: 40, align: 'right' });
    doc.text('Venda', 460, headerY, { width: 80, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#0b3d91').stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor('#000');
    rows.forEach((p) => {
      const y = doc.y;
      doc.fontSize(9).text(p.sku, 50, y, { width: 80 });
      doc.text(p.nome, 130, y, { width: 180 });
      doc.text(p.categoria || '-', 310, y, { width: 100 });
      doc.text(String(p.quantidade), 410, y, { width: 40, align: 'right' });
      doc.text(`R$ ${Number(p.preco_venda).toFixed(2)}`, 460, y, { width: 80, align: 'right' });
      doc.moveDown(1.2);
      if (doc.y > 760) doc.addPage();
    });
    gerarRodape(doc);
    doc.end();
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.get('/funcionarios', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM funcionarios ORDER BY nome');
    const doc = new PDFDocument({ margin: 50, bufferPages: true, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=funcionarios.pdf');
    doc.pipe(res);
    gerarCabecalho(doc, 'Relatório de Funcionários');
    const headerY = doc.y;
    doc.fontSize(10).fillColor('#0b3d91').font('Helvetica-Bold');
    doc.text('Nome', 50, headerY, { width: 150 });
    doc.text('CPF', 200, headerY, { width: 100 });
    doc.text('Cargo', 300, headerY, { width: 120 });
    doc.text('Salário', 420, headerY, { width: 80, align: 'right' });
    doc.text('Ativo', 500, headerY, { width: 50, align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#0b3d91').stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor('#000');
    rows.forEach((f) => {
      const y = doc.y;
      doc.fontSize(9).text(f.nome, 50, y, { width: 150 });
      doc.text(f.cpf, 200, y, { width: 100 });
      doc.text(f.cargo, 300, y, { width: 120 });
      doc.text(`R$ ${Number(f.salario).toFixed(2)}`, 420, y, { width: 80, align: 'right' });
      doc.text(f.ativo ? 'Sim' : 'Não', 500, y, { width: 50, align: 'center' });
      doc.moveDown(1.2);
      if (doc.y > 760) doc.addPage();
    });
    gerarRodape(doc);
    doc.end();
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.get('/movimentacoes', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT m.*, p.nome AS produto_nome, f.nome AS funcionario_nome
      FROM movimentacoes m
      LEFT JOIN produtos p ON p.id = m.produto_id
      LEFT JOIN funcionarios f ON f.id = m.funcionario_id
      ORDER BY m.id DESC LIMIT 500
    `);
    const doc = new PDFDocument({ margin: 50, bufferPages: true, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=movimentacoes.pdf');
    doc.pipe(res);
    gerarCabecalho(doc, 'Relatório de Movimentações');
    const headerY = doc.y;
    doc.fontSize(10).fillColor('#0b3d91').font('Helvetica-Bold');
    doc.text('Data', 50, headerY, { width: 90 });
    doc.text('Produto', 140, headerY, { width: 150 });
    doc.text('Tipo', 290, headerY, { width: 60 });
    doc.text('Qtd', 350, headerY, { width: 40, align: 'right' });
    doc.text('Funcionário', 400, headerY, { width: 150 });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#0b3d91').stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor('#000');
    rows.forEach((m) => {
      const y = doc.y;
      doc.fontSize(9).text(new Date(m.criado_em).toLocaleDateString('pt-BR'), 50, y, { width: 90 });
      doc.text(m.produto_nome || '-', 140, y, { width: 150 });
      doc.fillColor(m.tipo === 'entrada' ? 'green' : 'red').text(m.tipo.toUpperCase(), 290, y, { width: 60 });
      doc.fillColor('#000').text(String(m.quantidade), 350, y, { width: 40, align: 'right' });
      doc.text(m.funcionario_nome || '-', 400, y, { width: 150 });
      doc.moveDown(1.2);
      if (doc.y > 760) doc.addPage();
    });
    gerarRodape(doc);
    doc.end();
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ---------- EXCEL ROTAS ----------
function estilizarHeader(sheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B3D91' } };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  header.height = 22;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

router.get('/excel/produtos', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM produtos ORDER BY nome');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Produtos');
    ws.columns = [
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'Categoria', key: 'categoria', width: 18 },
      { header: 'Preço Custo', key: 'preco_custo', width: 15 },
      { header: 'Preço Venda', key: 'preco_venda', width: 15 },
      { header: 'Quantidade', key: 'quantidade', width: 12 },
      { header: 'Estoque Mínimo', key: 'estoque_minimo', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    rows.forEach((p) => ws.addRow({
      ...p,
      status: p.quantidade <= p.estoque_minimo ? 'BAIXO' : 'OK',
    }));
    estilizarHeader(ws);
    ws.eachRow((row, i) => {
      if (i === 1) return;
      if (row.getCell('status').value === 'BAIXO') {
        row.getCell('status').font = { color: { argb: 'FFCC0000' }, bold: true };
      }
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=produtos.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.get('/excel/funcionarios', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM funcionarios ORDER BY nome');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Funcionários');
    ws.columns = [
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Cargo', key: 'cargo', width: 20 },
      { header: 'Salário', key: 'salario', width: 15 },
      { header: 'Admissão', key: 'data_admissao', width: 15 },
      { header: 'Ativo', key: 'ativo', width: 10 },
    ];
    rows.forEach((f) => ws.addRow({
      ...f,
      data_admissao: new Date(f.data_admissao).toLocaleDateString('pt-BR'),
      ativo: f.ativo ? 'Sim' : 'Não',
    }));
    estilizarHeader(ws);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=funcionarios.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.get('/excel/movimentacoes', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT m.*, p.nome AS produto_nome, f.nome AS funcionario_nome
      FROM movimentacoes m
      LEFT JOIN produtos p ON p.id = m.produto_id
      LEFT JOIN funcionarios f ON f.id = m.funcionario_id
      ORDER BY m.id DESC
    `);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Movimentações');
    ws.columns = [
      { header: 'Data', key: 'data', width: 20 },
      { header: 'Produto', key: 'produto_nome', width: 30 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Quantidade', key: 'quantidade', width: 12 },
      { header: 'Funcionário', key: 'funcionario_nome', width: 25 },
      { header: 'Observação', key: 'observacao', width: 35 },
    ];
    rows.forEach((m) => ws.addRow({
      ...m,
      data: new Date(m.criado_em).toLocaleString('pt-BR'),
      tipo: m.tipo.toUpperCase(),
    }));
    estilizarHeader(ws);
    ws.eachRow((row, i) => {
      if (i === 1) return;
      const cell = row.getCell('tipo');
      cell.font = { color: { argb: cell.value === 'ENTRADA' ? 'FF007700' : 'FFCC0000' }, bold: true };
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=movimentacoes.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

module.exports = router;
EOF

# ============================================
# API - app.js (separado para testes)
# ============================================
cat > api/src/app.js << 'EOF'
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const funcionariosRoutes = require('./routes/funcionarios');
const produtosRoutes = require('./routes/produtos');
const movimentacoesRoutes = require('./routes/movimentacoes');
const relatoriosRoutes = require('./routes/relatorios');

const app = express();
app.use(cors());
app.use(express.json());

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req, res) => {
  res.json({
    sistema: 'Sistema de Estoque e Funcionários v3.0',
    recursos: ['JWT', 'React', 'PDF', 'Excel', 'Upload', 'Recharts'],
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/relatorios', relatoriosRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.message || 'Erro interno do servidor' });
});

module.exports = app;
EOF

# ============================================
# API - server.js
# ============================================
cat > api/src/server.js << 'EOF'
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API rodando em http://localhost:${PORT}`));
EOF

# ============================================
# API - TESTES JEST
# ============================================
cat > api/tests/auth.test.js << 'EOF'
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/database');

jest.setTimeout(20000);

beforeAll(async () => {
  await db.query('DELETE FROM usuarios WHERE email LIKE $1', ['test_%']);
});

afterAll(async () => {
  await db.query('DELETE FROM usuarios WHERE email LIKE $1', ['test_%']);
  await db.end();
});

describe('Auth', () => {
  const email = `test_${Date.now()}@exemplo.com`;

  test('POST /api/auth/registrar cria usuário', async () => {
    const res = await request(app)
      .post('/api/auth/registrar')
      .send({ nome: 'Teste', email, senha: 'senha123' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe(email);
  });

  test('POST /api/auth/login retorna token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, senha: 'senha123' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/auth/login com senha errada = 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, senha: 'errada' });
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/auth/me sem token = 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});
EOF

cat > api/tests/produtos.test.js << 'EOF'
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/database');

jest.setTimeout(20000);
let token;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@estoque.com', senha: 'admin123' });
  token = res.body.token;
});

afterAll(async () => {
  await db.end();
});

describe('Produtos', () => {
  test('GET /api/produtos sem token = 401', async () => {
    const res = await request(app).get('/api/produtos');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/produtos com token = 200', async () => {
    const res = await request(app)
      .get('/api/produtos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/produtos/alertas/baixo-estoque', async () => {
    const res = await request(app)
      .get('/api/produtos/alertas/baixo-estoque')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/movimentacoes/estatisticas retorna dados do dashboard', async () => {
    const res = await request(app)
      .get('/api/movimentacoes/estatisticas')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('topProdutos');
    expect(res.body).toHaveProperty('porCategoria');
    expect(res.body).toHaveProperty('movPorDia');
    expect(res.body).toHaveProperty('totalEstoque');
  });
});
EOF

# ============================================
# FRONTEND - Dockerfile
# ============================================
cat > frontend/Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
EOF

# ============================================
# FRONTEND - package.json
# ============================================
cat > frontend/package.json << 'EOF'
{
  "name": "sistema-estoque-frontend",
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.0",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.1"
  }
}
EOF

# ============================================
# FRONTEND - vite.config.js
# ============================================
cat > frontend/vite.config.js << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173 },
});
EOF

# ============================================
# FRONTEND - index.html
# ============================================
cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sistema de Estoque</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# ============================================
# FRONTEND - main.jsx
# ============================================
cat > frontend/src/main.jsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
EOF

# ============================================
# FRONTEND - styles.css
# ============================================
cat > frontend/src/styles.css << 'EOF'
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Segoe UI', Tahoma, sans-serif;
  background: #f4f6fa;
  color: #222;
}

.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-card {
  background: white; padding: 40px; border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
  width: 100%; max-width: 400px;
}
.auth-card h1 { margin-bottom: 8px; color: #0b3d91; }
.auth-card p { color: #666; margin-bottom: 24px; font-size: 14px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 10px 12px; border: 1px solid #ddd;
  border-radius: 6px; font-size: 14px; transition: border .2s;
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: #0b3d91; }

.btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;
  font-size: 14px; font-weight: 600; transition: all .2s; }
.btn-primary { background: #0b3d91; color: white; }
.btn-primary:hover { background: #082a66; }
.btn-danger { background: #dc3545; color: white; }
.btn-danger:hover { background: #a71d2a; }
.btn-secondary { background: #6c757d; color: white; }
.btn-secondary:hover { background: #545b62; }
.btn-success { background: #28a745; color: white; }
.btn-success:hover { background: #1e7e34; }
.btn-block { width: 100%; }
.btn:disabled { opacity: .6; cursor: not-allowed; }

.layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #0b3d91; color: white; padding: 20px; display: flex; flex-direction: column; }
.sidebar h2 { font-size: 18px; margin-bottom: 24px; }
.sidebar nav { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.sidebar a { color: rgba(255,255,255,.85); text-decoration: none; padding: 10px 12px;
  border-radius: 6px; transition: background .2s; font-size: 14px; }
.sidebar a:hover, .sidebar a.active { background: rgba(255,255,255,.15); color: white; }
.sidebar .user-info { padding-top: 16px; border-top: 1px solid rgba(255,255,255,.2);
  font-size: 12px; margin-bottom: 8px; }

.main-content { flex: 1; padding: 30px; overflow-y: auto; }
.main-content h1 { margin-bottom: 24px; color: #0b3d91; }

.card { background: white; border-radius: 10px; padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06); margin-bottom: 20px; }

.toolbar { display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
.toolbar .actions { display: flex; gap: 10px; flex-wrap: wrap; }

table { width: 100%; border-collapse: collapse; }
table th, table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
table th { background: #f8f9fb; font-weight: 600; color: #333; }
table tr:hover { background: #f8f9fb; }

.badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.badge-success { background: #d4edda; color: #155724; }
.badge-danger { background: #f8d7da; color: #721c24; }
.badge-warning { background: #fff3cd; color: #856404; }
.badge-info { background: #d1ecf1; color: #0c5460; }

.error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 6px;
  margin-bottom: 12px; font-size: 14px; }
.success { background: #d4edda; color: #155724; padding: 10px; border-radius: 6px;
  margin-bottom: 12px; font-size: 14px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px; }
.modal { background: white; padding: 28px; border-radius: 10px;
  width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal h2 { margin-bottom: 20px; color: #0b3d91; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px; margin-bottom: 24px; }
.stat-card { background: white; padding: 20px; border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06); border-left: 4px solid #0b3d91; }
.stat-card h3 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
.stat-card .value { font-size: 28px; font-weight: 700; color: #0b3d91; }

.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
@media (max-width: 900px) {
  .charts-grid { grid-template-columns: 1fr; }
  .sidebar { width: 180px; }
}

.img-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; }
.img-preview { width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px;
  border: 1px solid #eee; background: #fafafa; }
EOF

# ============================================
# FRONTEND - services/api.js
# ============================================
cat > frontend/src/services/api.js << 'EOF'
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const API_URL = api.defaults.baseURL;
export default api;
EOF

# ============================================
# FRONTEND - contexts/AuthContext.jsx
# ============================================
cat > frontend/src/contexts/AuthContext.jsx << 'EOF'
import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('usuario');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  async function login(email, senha) {
    const { data } = await api.post('/api/auth/login', { email, senha });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
    return data;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, logado: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
EOF

# ============================================
# FRONTEND - components/Layout.jsx
# ============================================
cat > frontend/src/components/Layout.jsx << 'EOF'
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>📦 Estoque</h2>
        <nav>
          <NavLink to="/" end>📊 Dashboard</NavLink>
          <NavLink to="/produtos">📦 Produtos</NavLink>
          <NavLink to="/funcionarios">👥 Funcionários</NavLink>
          <NavLink to="/movimentacoes">🔄 Movimentações</NavLink>
          <NavLink to="/relatorios">📄 Relatórios</NavLink>
        </nav>
        <div className="user-info">
          <strong>{usuario?.nome}</strong><br />
          {usuario?.email}<br />
          <span className="badge badge-info">{usuario?.role}</span>
        </div>
        <button className="btn btn-danger btn-block" onClick={handleLogout}>Sair</button>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
EOF

# ============================================
# FRONTEND - components/Modal.jsx
# ============================================
cat > frontend/src/components/Modal.jsx << 'EOF'
export default function Modal({ titulo, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
EOF

# ============================================
# FRONTEND - pages/Login.jsx
# ============================================
cat > frontend/src/pages/Login.jsx << 'EOF'
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@estoque.com');
  const [senha, setSenha] = useState('admin123');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(''); setLoading(true);
    try { await login(email, senha); navigate('/'); }
    catch (err) { setErro(err.response?.data?.erro || 'Erro ao fazer login'); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>📦 Sistema de Estoque</h1>
        <p>Faça login para continuar</p>
        {erro && <div className="error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          Não tem conta? <Link to="/registrar">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
EOF

# ============================================
# FRONTEND - pages/Registrar.jsx
# ============================================
cat > frontend/src/pages/Registrar.jsx << 'EOF'
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Registrar() {
  const [form, setForm] = useState({ nome: '', email: '', senha: '' });
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault(); setErro('');
    try {
      await api.post('/api/auth/registrar', form);
      alert('Usuário criado! Faça login.');
      navigate('/login');
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao registrar'); }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>📝 Criar Conta</h1>
        <p>Preencha os dados abaixo</p>
        {erro && <div className="error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Nome</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
          <div className="form-group"><label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="form-group"><label>Senha</label>
            <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required /></div>
          <button className="btn btn-primary btn-block">Registrar</button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
EOF

# ============================================
# FRONTEND - pages/Dashboard.jsx (com Recharts)
# ============================================
cat > frontend/src/pages/Dashboard.jsx << 'EOF'
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import api from '../services/api';

const CORES = ['#0b3d91', '#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6f42c1'];

export default function Dashboard() {
  const [stats, setStats] = useState({ produtos: 0, funcionarios: 0, movimentacoes: 0, alertas: 0 });
  const [dados, setDados] = useState({
    topProdutos: [], porCategoria: [], movPorDia: [],
    totalEstoque: { valor_total: 0, itens_total: 0 },
  });

  useEffect(() => {
    async function load() {
      const [p, f, m, a, est] = await Promise.all([
        api.get('/api/produtos'),
        api.get('/api/funcionarios'),
        api.get('/api/movimentacoes'),
        api.get('/api/produtos/alertas/baixo-estoque'),
        api.get('/api/movimentacoes/estatisticas'),
      ]);
      setStats({
        produtos: p.data.length,
        funcionarios: f.data.length,
        movimentacoes: m.data.length,
        alertas: a.data.length,
      });
      setDados(est.data);
    }
    load();
  }, []);

  const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <>
      <h1>📊 Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total de Produtos</h3>
          <div className="value">{stats.produtos}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#28a745' }}>
          <h3>Funcionários</h3>
          <div className="value">{stats.funcionarios}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#17a2b8' }}>
          <h3>Movimentações</h3>
          <div className="value">{stats.movimentacoes}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#dc3545' }}>
          <h3>Alertas de Estoque</h3>
          <div className="value">{stats.alertas}</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: '#ffc107' }}>
          <h3>Valor Total em Estoque</h3>
          <div className="value" style={{ fontSize: 22 }}>{fmt(dados.totalEstoque.valor_total)}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#6f42c1' }}>
          <h3>Itens em Estoque</h3>
          <div className="value">{Number(dados.totalEstoque.itens_total)}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <h3 style={{ marginBottom: 16, color: '#0b3d91' }}>🏆 Top 5 Produtos (saídas)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dados.topProdutos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#0b3d91" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, color: '#0b3d91' }}>🥧 Estoque por Categoria</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={dados.porCategoria} dataKey="total" nameKey="categoria" outerRadius={90} label>
                {dados.porCategoria.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, color: '#0b3d91' }}>📈 Movimentações nos últimos 14 dias</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dados.movPorDia}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="entradas" stroke="#28a745" strokeWidth={2} name="Entradas" />
            <Line type="monotone" dataKey="saidas" stroke="#dc3545" strokeWidth={2} name="Saídas" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
EOF

# ============================================
# FRONTEND - pages/Produtos.jsx (com upload)
# ============================================
cat > frontend/src/pages/Produtos.jsx << 'EOF'
import { useEffect, useState } from 'react';
import api, { API_URL } from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const vazio = { nome: '', descricao: '', sku: '', categoria: '', preco_custo: 0, preco_venda: 0, quantidade: 0, estoque_minimo: 5 };

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [imagem, setImagem] = useState(null);
  const [preview, setPreview] = useState('');
  const [erro, setErro] = useState('');
  const { usuario } = useAuth();

  async function carregar() {
    const { data } = await api.get('/api/produtos');
    setProdutos(data);
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm(vazio); setImagem(null); setPreview('');
    setEditando('novo'); setErro('');
  }
  function abrirEditar(p) {
    setForm(p); setImagem(null);
    setPreview(p.imagem ? `${API_URL}/uploads/${p.imagem}` : '');
    setEditando(p.id); setErro('');
  }
  function fechar() { setEditando(null); }

  function selecionarImagem(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImagem(file);
    setPreview(URL.createObjectURL(file));
  }

  async function salvar(e) {
    e.preventDefault(); setErro('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k !== 'imagem') fd.append(k, v);
    });
    if (imagem) fd.append('imagem', imagem);

    try {
      if (editando === 'novo') await api.post('/api/produtos', fd);
      else await api.put(`/api/produtos/${editando}`, fd);
      fechar(); carregar();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar'); }
  }

  async function excluir(id) {
    if (!confirm('Excluir produto?')) return;
    try { await api.delete(`/api/produtos/${id}`); carregar(); }
    catch (err) { alert(err.response?.data?.erro || 'Erro ao excluir'); }
  }

  return (
    <>
      <div className="toolbar">
        <h1>📦 Produtos</h1>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Produto</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Foto</th><th>SKU</th><th>Nome</th><th>Categoria</th><th>Qtd</th><th>Venda</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.imagem
                    ? <img src={`${API_URL}/uploads/${p.imagem}`} alt={p.nome} className="img-thumb" />
                    : <div className="img-thumb" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>N/A</div>}
                </td>
                <td>{p.sku}</td>
                <td>{p.nome}</td>
                <td>{p.categoria || '-'}</td>
                <td>{p.quantidade}</td>
                <td>R$ {Number(p.preco_venda).toFixed(2)}</td>
                <td>
                  {p.quantidade <= p.estoque_minimo
                    ? <span className="badge badge-danger">Baixo</span>
                    : <span className="badge badge-success">OK</span>}
                </td>
                <td>
                  <button className="btn btn-secondary" style={{ marginRight: 6, padding: '6px 12px', fontSize: 12 }} onClick={() => abrirEditar(p)}>Editar</button>
                  {usuario?.role === 'admin' && (
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => excluir(p.id)}>Excluir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal titulo={editando === 'novo' ? 'Novo Produto' : 'Editar Produto'} onClose={fechar}>
          {erro && <div className="error">{erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-group"><label>Nome</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div className="form-group"><label>SKU</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></div>
            <div className="form-group"><label>Categoria</label><input value={form.categoria || ''} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
            <div className="form-group"><label>Descrição</label><textarea rows="2" value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label>Preço Custo</label><input type="number" step="0.01" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} /></div>
              <div className="form-group"><label>Preço Venda</label><input type="number" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} /></div>
              <div className="form-group"><label>Quantidade</label><input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
              <div className="form-group"><label>Estoque Mínimo</label><input type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} /></div>
            </div>
            <div className="form-group">
              <label>Imagem (jpg/png/webp até 5MB)</label>
              <input type="file" accept="image/*" onChange={selecionarImagem} />
            </div>
            {preview && <img src={preview} alt="Preview" className="img-preview" style={{ marginBottom: 12 }} />}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={fechar}>Cancelar</button>
              <button className="btn btn-primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
EOF

# ============================================
# FRONTEND - pages/Funcionarios.jsx
# ============================================
cat > frontend/src/pages/Funcionarios.jsx << 'EOF'
import { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const vazio = { nome: '', cpf: '', email: '', cargo: '', salario: 0, ativo: true };

export default function Funcionarios() {
  const [lista, setLista] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState('');
  const { usuario } = useAuth();

  async function carregar() {
    const { data } = await api.get('/api/funcionarios');
    setLista(data);
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() { setForm(vazio); setEditando('novo'); setErro(''); }
  function abrirEditar(f) { setForm(f); setEditando(f.id); setErro(''); }
  function fechar() { setEditando(null); }

  async function salvar(e) {
    e.preventDefault();
    try {
      if (editando === 'novo') await api.post('/api/funcionarios', form);
      else await api.put(`/api/funcionarios/${editando}`, form);
      fechar(); carregar();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar'); }
  }

  async function excluir(id) {
    if (!confirm('Excluir funcionário?')) return;
    try { await api.delete(`/api/funcionarios/${id}`); carregar(); }
    catch (err) { alert(err.response?.data?.erro || 'Erro ao excluir'); }
  }

  return (
    <>
      <div className="toolbar">
        <h1>👥 Funcionários</h1>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Funcionário</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Nome</th><th>CPF</th><th>Email</th><th>Cargo</th><th>Salário</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id}>
                <td>{f.nome}</td>
                <td>{f.cpf}</td>
                <td>{f.email}</td>
                <td>{f.cargo}</td>
                <td>R$ {Number(f.salario).toFixed(2)}</td>
                <td>{f.ativo ? <span className="badge badge-success">Ativo</span> : <span className="badge badge-danger">Inativo</span>}</td>
                <td>
                  <button className="btn btn-secondary" style={{ marginRight: 6, padding: '6px 12px', fontSize: 12 }} onClick={() => abrirEditar(f)}>Editar</button>
                  {usuario?.role === 'admin' && (
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => excluir(f.id)}>Excluir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal titulo={editando === 'novo' ? 'Novo Funcionário' : 'Editar Funcionário'} onClose={fechar}>
          {erro && <div className="error">{erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-group"><label>Nome</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div className="form-group"><label>CPF</label><input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="form-group"><label>Cargo</label><input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} required /></div>
            <div className="form-group"><label>Salário</label><input type="number" step="0.01" value={form.salario} onChange={(e) => setForm({ ...form, salario: e.target.value })} /></div>
            <div className="form-group">
              <label><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo</label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={fechar}>Cancelar</button>
              <button className="btn btn-primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
EOF

# ============================================
# FRONTEND - pages/Movimentacoes.jsx
# ============================================
cat > frontend/src/pages/Movimentacoes.jsx << 'EOF'
import { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function Movimentacoes() {
  const [lista, setLista] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ produto_id: '', funcionario_id: '', tipo: 'entrada', quantidade: 1, observacao: '' });
  const [erro, setErro] = useState('');

  async function carregar() {
    const [m, p, f] = await Promise.all([
      api.get('/api/movimentacoes'),
      api.get('/api/produtos'),
      api.get('/api/funcionarios'),
    ]);
    setLista(m.data); setProdutos(p.data); setFuncionarios(f.data);
  }
  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault(); setErro('');
    try {
      await api.post('/api/movimentacoes', form);
      setAberto(false);
      setForm({ produto_id: '', funcionario_id: '', tipo: 'entrada', quantidade: 1, observacao: '' });
      carregar();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro'); }
  }

  return (
    <>
      <div className="toolbar">
        <h1>🔄 Movimentações</h1>
        <button className="btn btn-primary" onClick={() => { setAberto(true); setErro(''); }}>+ Nova Movimentação</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Funcionário</th><th>Observação</th></tr>
          </thead>
          <tbody>
            {lista.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.criado_em).toLocaleString('pt-BR')}</td>
                <td>{m.produto_nome}</td>
                <td>
                  {m.tipo === 'entrada'
                    ? <span className="badge badge-success">ENTRADA</span>
                    : <span className="badge badge-danger">SAÍDA</span>}
                </td>
                <td>{m.quantidade}</td>
                <td>{m.funcionario_nome || '-'}</td>
                <td>{m.observacao || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aberto && (
        <Modal titulo="Nova Movimentação" onClose={() => setAberto(false)}>
          {erro && <div className="error">{erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-group">
              <label>Produto</label>
              <select value={form.produto_id} onChange={(e) => setForm({ ...form, produto_id: e.target.value })} required>
                <option value="">Selecione...</option>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} (Qtd: {p.quantidade})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Funcionário</label>
              <select value={form.funcionario_id} onChange={(e) => setForm({ ...form, funcionario_id: e.target.value })}>
                <option value="">-- Nenhum --</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantidade</label>
              <input type="number" min="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label>Observação</label>
              <textarea rows="2" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setAberto(false)}>Cancelar</button>
              <button className="btn btn-primary">Registrar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
EOF

# ============================================
# FRONTEND - pages/Relatorios.jsx (PDF + Excel)
# ============================================
cat > frontend/src/pages/Relatorios.jsx << 'EOF'
import { useState } from 'react';
import { API_URL } from '../services/api';

export default function Relatorios() {
  const [baixando, setBaixando] = useState('');

  async function baixar(endpoint, nome) {
    setBaixando(endpoint);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao gerar arquivo');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nome; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert(err.message); }
    finally { setBaixando(''); }
  }

  const grupos = [
    {
      titulo: '📦 Produtos',
      itens: [
        { label: 'PDF', endpoint: '/api/relatorios/produtos', nome: 'produtos.pdf', cor: 'btn-danger' },
        { label: 'Excel', endpoint: '/api/relatorios/excel/produtos', nome: 'produtos.xlsx', cor: 'btn-success' },
      ],
    },
    {
      titulo: '👥 Funcionários',
      itens: [
        { label: 'PDF', endpoint: '/api/relatorios/funcionarios', nome: 'funcionarios.pdf', cor: 'btn-danger' },
        { label: 'Excel', endpoint: '/api/relatorios/excel/funcionarios', nome: 'funcionarios.xlsx', cor: 'btn-success' },
      ],
    },
    {
      titulo: '🔄 Movimentações',
      itens: [
        { label: 'PDF', endpoint: '/api/relatorios/movimentacoes', nome: 'movimentacoes.pdf', cor: 'btn-danger' },
        { label: 'Excel', endpoint: '/api/relatorios/excel/movimentacoes', nome: 'movimentacoes.xlsx', cor: 'btn-success' },
      ],
    },
  ];

  return (
    <>
      <h1>📄 Relatórios</h1>
      <div className="stats-grid">
        {grupos.map((g) => (
          <div key={g.titulo} className="stat-card" style={{ borderLeftColor: '#0b3d91' }}>
            <h3>{g.titulo}</h3>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {g.itens.map((it) => (
                <button
                  key={it.endpoint}
                  className={`btn ${it.cor}`}
                  onClick={() => baixar(it.endpoint, it.nome)}
                  disabled={baixando === it.endpoint}
                >
                  {baixando === it.endpoint ? 'Gerando...' : `Baixar ${it.label}`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
EOF

# ============================================
# FRONTEND - App.jsx
# ============================================
cat > frontend/src/App.jsx << 'EOF'
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Registrar from './pages/Registrar';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Funcionarios from './pages/Funcionarios';
import Movimentacoes from './pages/Movimentacoes';
import Relatorios from './pages/Relatorios';

function RotaProtegida({ children }) {
  const { logado } = useAuth();
  return logado ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registrar" element={<Registrar />} />
      <Route path="/" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
      <Route path="/produtos" element={<RotaProtegida><Produtos /></RotaProtegida>} />
      <Route path="/funcionarios" element={<RotaProtegida><Funcionarios /></RotaProtegida>} />
      <Route path="/movimentacoes" element={<RotaProtegida><Movimentacoes /></RotaProtegida>} />
      <Route path="/relatorios" element={<RotaProtegida><Relatorios /></RotaProtegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
EOF

echo ""
echo "✅ Estrutura v3.0 criada com sucesso!"
echo ""
echo "▶️  Agora execute:"
echo "    docker compose up --build"
echo ""
echo "🌐 Acesse:"
echo "    Frontend: http://localhost:5173"
echo "    API:      http://localhost:3000"
echo ""
echo "🔑 Login padrão: admin@estoque.com / admin123"
echo ""
echo "🧪 Para rodar os testes:"
echo "    docker compose exec api npm test"
echo ""