const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const payload = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      pode_adicionar: user.pode_adicionar,
      pode_editar: user.pode_editar,
      pode_excluir: user.pode_excluir,
      pode_relatorios: user.pode_relatorios,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || '8h',
    });

    res.json({ token, usuario: payload });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Retorna o usuário logado (útil para refresh)
router.get('/me', autenticar, (req, res) => res.json(req.usuario));

// Criar usuário — SÓ ADMIN
router.post('/registrar', autenticar, apenasAdmin, async (req, res) => {
  const { nome, email, senha, role, pode_adicionar, pode_editar, pode_excluir, pode_relatorios } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Dados incompletos' });
  try {
    const hash = await bcrypt.hash(senha, 10);
    const { rows } = await db.query(
      `INSERT INTO usuarios
        (nome, email, senha_hash, role, pode_adicionar, pode_editar, pode_excluir, pode_relatorios)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, nome, email, role, pode_adicionar, pode_editar, pode_excluir, pode_relatorios`,
      [
        nome, email, hash,
        role === 'admin' ? 'admin' : 'user',
        !!pode_adicionar, !!pode_editar, !!pode_excluir, !!pode_relatorios,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Listar usuários — SÓ ADMIN
router.get('/usuarios', autenticar, apenasAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, email, role,
              pode_adicionar, pode_editar, pode_excluir, pode_relatorios, criado_em
       FROM usuarios ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Atualizar permissões/dados do usuário — SÓ ADMIN
router.put('/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  const { nome, email, role, pode_adicionar, pode_editar, pode_excluir, pode_relatorios, nova_senha } = req.body;
  try {
    let sql, params;
    if (nova_senha) {
      const hash = await bcrypt.hash(nova_senha, 10);
      sql = `UPDATE usuarios SET
              nome=$1, email=$2, role=$3,
              pode_adicionar=$4, pode_editar=$5, pode_excluir=$6, pode_relatorios=$7,
              senha_hash=$8
             WHERE id=$9
             RETURNING id, nome, email, role, pode_adicionar, pode_editar, pode_excluir, pode_relatorios`;
      params = [nome, email, role, !!pode_adicionar, !!pode_editar, !!pode_excluir, !!pode_relatorios, hash, req.params.id];
    } else {
      sql = `UPDATE usuarios SET
              nome=$1, email=$2, role=$3,
              pode_adicionar=$4, pode_editar=$5, pode_excluir=$6, pode_relatorios=$7
             WHERE id=$8
             RETURNING id, nome, email, role, pode_adicionar, pode_editar, pode_excluir, pode_relatorios`;
      params = [nome, email, role, !!pode_adicionar, !!pode_editar, !!pode_excluir, !!pode_relatorios, req.params.id];
    }
    const { rows } = await db.query(sql, params);
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Excluir usuário — SÓ ADMIN (não pode se auto-excluir)
router.delete('/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  if (Number(req.params.id) === Number(req.usuario.id)) {
    return res.status(400).json({ erro: 'Você não pode excluir a si mesmo' });
  }
  try {
    const { rowCount } = await db.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;