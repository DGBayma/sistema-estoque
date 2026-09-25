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
    const { rows } = await db.query(`
      SELECT m.*, p.nome AS produto_nome, f.nome AS funcionario_nome
      FROM movimentacoes m
      LEFT JOIN produtos p ON p.id = m.produto_id
      LEFT JOIN funcionarios f ON f.id = m.funcionario_id
      ORDER BY m.id DESC LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
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
      SELECT COALESCE(SUM(quantidade),0) AS itens_total
      FROM produtos
    `); 

    res.json({
      topProdutos: topProdutos.rows,
      porCategoria: porCategoria.rows,
      movPorDia: movPorDia.rows,
      totalEstoque: totalEstoque.rows[0],
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========================
// ESCRITA (com permissão)
// ========================

router.post('/', verificarPermissao('adicionar'), async (req, res) => {
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
    if (tipo === 'entrada') {
      novaQtd += quantidade;
    } else {
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