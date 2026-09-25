const express = require('express');
const router = express.Router();
const db = require('../database');
const { autenticar, verificarPermissao } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(autenticar);

// ========================
// LEITURA
// ========================

router.get('/alertas/baixo-estoque', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM produtos WHERE quantidade <= estoque_minimo ORDER BY quantidade'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM produtos ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========================
// ESCRITA (com permissões)
// ========================

// Criar
router.post('/', verificarPermissao('adicionar'), upload.single('imagem'), async (req, res) => {
  const { nome, descricao, sku, categoria, preco_custo, quantidade, estoque_minimo } = req.body;
  const imagem = req.file ? req.file.filename : null;
  try {
    const { rows } = await db.query(
      `INSERT INTO produtos
        (nome, descricao, sku, categoria, preco_custo, quantidade, estoque_minimo, imagem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nome, descricao, sku, categoria, preco_custo || 0, quantidade || 0, estoque_minimo || 5, imagem]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Atualizar
router.put('/:id', verificarPermissao('editar'), upload.single('imagem'), async (req, res) => {
  const { nome, descricao, sku, categoria, preco_custo, quantidade, estoque_minimo } = req.body;
  try {
    let sql, params;
    if (req.file) {
      sql = `UPDATE produtos SET nome=$1, descricao=$2, sku=$3, categoria=$4, preco_custo=$5,
             quantidade=$6, estoque_minimo=$7, imagem=$8 WHERE id=$9 RETURNING *`;
      params = [nome, descricao, sku, categoria, preco_custo, quantidade, estoque_minimo, req.file.filename, req.params.id];
    } else {
      sql = `UPDATE produtos SET nome=$1, descricao=$2, sku=$3, categoria=$4, preco_custo=$5,
             quantidade=$6, estoque_minimo=$7 WHERE id=$8 RETURNING *`;
      params = [nome, descricao, sku, categoria, preco_custo, quantidade, estoque_minimo, req.params.id];
    }
    const { rows } = await db.query(sql, params);
    if (!rows[0]) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Upload de imagem separado
router.post('/:id/imagem', verificarPermissao('editar'), upload.single('imagem'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  try {
    const { rows } = await db.query(
      'UPDATE produtos SET imagem = $1 WHERE id = $2 RETURNING *',
      [req.file.filename, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Deletar
router.delete('/:id', verificarPermissao('excluir'), async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;