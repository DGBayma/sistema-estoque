const express = require('express');
const router = express.Router();
const db = require('../database');
const { autenticar, verificarPermissao } = require('../middlewares/auth');

// Toda rota abaixo exige login
router.use(autenticar);

// ========================
// LEITURA (todos autenticados)
// ========================

// Listar todos
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM funcionarios ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Buscar por ID
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM funcionarios WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Funcionário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========================
// ESCRITA (com permissões)
// ========================

// Criar (exige permissão "adicionar")
router.post('/', verificarPermissao('adicionar'), async (req, res) => {
  const { nome, cpf, email, cargo, salario, data_admissao } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO funcionarios (nome, cpf, email, cargo, salario, data_admissao)
       VALUES ($1,$2,$3,$4,$5, COALESCE($6, CURRENT_DATE)) RETURNING *`,
      [nome, cpf, email, cargo, salario, data_admissao]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Atualizar (exige permissão "editar")
router.put('/:id', verificarPermissao('editar'), async (req, res) => {
  const { nome, cpf, email, cargo, salario, ativo } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE funcionarios SET nome=$1, cpf=$2, email=$3, cargo=$4, salario=$5, ativo=$6
       WHERE id=$7 RETURNING *`,
      [nome, cpf, email, cargo, salario, ativo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Funcionário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Deletar (exige permissão "excluir")
router.delete('/:id', verificarPermissao('excluir'), async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM funcionarios WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Funcionário não encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;