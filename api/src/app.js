const express = require('express');
const cors = require('cors');
const path = require('path');

const publicoRoutes = require('./routes/publico');
const authRoutes = require('./routes/auth');
const funcionariosRoutes = require('./routes/funcionarios');
const produtosRoutes = require('./routes/produtos');
const movimentacoesRoutes = require('./routes/movimentacoes');
const relatoriosRoutes = require('./routes/relatorios');
const fornecedoresRoutes = require('./routes/fornecedores');

const app = express();
app.use(cors());
app.use(express.json());

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req, res) => {
  res.json({
    sistema: '📦 Gerenciamento da Empresa',
    recursos: ['JWT', 'React', 'PDF', 'Excel', 'Upload', 'Recharts'],
  });
});

app.use('/api', publicoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.message || 'Erro interno do servidor' });
});

module.exports = app;
