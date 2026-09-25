const express = require('express');
const router = express.Router();
const db = require('../database');
const { autenticar, verificarPermissao } = require('../middlewares/auth');

router.use(autenticar);

// ========================
// LEITURA
// ========================

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM fornecedores ORDER BY nome');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM fornecedores WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Fornecedor não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========================
// ESCRITA (com permissões)
// ========================

router.post('/', verificarPermissao('adicionar'), async (req, res) => {
  const { nome, cnpj, email, telefone, endereco, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  try {
    const { rows } = await db.query(
      `INSERT INTO fornecedores (nome, cnpj, email, telefone, endereco, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nome, cnpj, email, telefone, endereco, observacoes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.put('/:id', verificarPermissao('editar'), async (req, res) => {
  const { nome, cnpj, email, telefone, endereco, observacoes, ativo } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE fornecedores
       SET nome=$1, cnpj=$2, email=$3, telefone=$4, endereco=$5, observacoes=$6, ativo=$7
       WHERE id=$8 RETURNING *`,
      [nome, cnpj, email, telefone, endereco, observacoes, ativo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Fornecedor não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.delete('/:id', verificarPermissao('excluir'), async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM fornecedores WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Fornecedor não encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;