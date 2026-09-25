const express = require('express');
const router = express.Router();
const db = require('../database');
const { autenticar, apenasAdmin } = require('../middlewares/auth');
const { enviarEmail, configurado } = require('../utils/email');

// ============================================================
// ROTAS PÚBLICAS (sem autenticação)
// ============================================================

// POST /api/contato — recebe mensagem do formulário de manutenção
router.post('/contato', async (req, res) => {
  const { nome, email, mensagem, origem, userAgent } = req.body;

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ erro: 'Dados incompletos' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO contatos (nome, email, mensagem, origem, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, criado_em`,
      [nome, email, mensagem, origem || 'manutencao', userAgent || '']
    );
    res.status(201).json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error('Erro ao salvar contato:', err.message);
    res.json({ ok: true, aviso: 'Contato recebido (offline)' });
  }
});

// POST /api/notify-back-online — agenda notificação por e-mail
router.post('/notify-back-online', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: 'E-mail obrigatório' });

  try {
    // Evita duplicatas
    const { rows: existe } = await db.query(
      `SELECT id FROM notificacoes
       WHERE email = $1 AND status = 'pendente'
       LIMIT 1`,
      [email]
    );

    if (existe.length > 0) {
      return res.json({ ok: true, mensagem: 'Você já está na lista!' });
    }

    await db.query(
      `INSERT INTO notificacoes (email, origem)
       VALUES ($1, 'manutencao')`,
      [email]
    );

    console.log(`📧 Agendada notificação para ${email}`);
    res.json({ ok: true, mensagem: 'Você será avisado quando voltarmos!' });
  } catch (err) {
    console.error('Erro ao agendar notificação:', err.message);
    res.status(500).json({ erro: 'Falha ao agendar' });
  }
});

// ============================================================
// ROTAS ADMIN — CONTATOS
// ============================================================

router.get('/contatos', autenticar, apenasAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM contatos ORDER BY criado_em DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/contatos/:id/respondido', autenticar, apenasAdmin, async (req, res) => {
  const { respondido } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE contatos SET respondido = $1 WHERE id = $2 RETURNING *',
      [!!respondido, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Contato não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.delete('/contatos/:id', autenticar, apenasAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM contatos WHERE id = $1',
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ erro: 'Contato não encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// ROTAS ADMIN — NOTIFICAÇÕES
// ============================================================

// GET /api/notificacoes — lista todos os e-mails agendados
router.get('/notificacoes', autenticar, apenasAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, origem, status, erro, criado_em, enviado_em
       FROM notificacoes
       ORDER BY criado_em DESC`
    );

    const pendentes = rows.filter((r) => r.status === 'pendente').length;
    const enviados = rows.filter((r) => r.status === 'enviado').length;
    const erros = rows.filter((r) => r.status === 'erro').length;

    res.json({
      total: rows.length,
      pendentes,
      enviados,
      erros,
      smtp_configurado: configurado,
      itens: rows,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/notify-send — admin dispara os e-mails para todos os pendentes
router.post('/notify-send', autenticar, apenasAdmin, async (req, res) => {
  try {
    const { rows: pendentes } = await db.query(
      `SELECT id, email FROM notificacoes WHERE status = 'pendente'`
    );

    if (pendentes.length === 0) {
      return res.json({ ok: true, enviados: 0, mensagem: 'Nenhum e-mail pendente' });
    }

    const resultados = [];
    const agora = new Date().toLocaleString('pt-BR');

    for (const n of pendentes) {
      try {
        await enviarEmail({
          to: n.email,
          subject: '✅ Sistema de Estoque voltou ao ar!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="background: #0b3d91; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">✅ Sistema Online</h1>
              </div>
              <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
                <p>Olá!</p>
                <p>Boa notícia: <strong>o Sistema de Estoque voltou ao ar</strong> e está funcionando normalmente.</p>
                <p>Você solicitou ser avisado quando o serviço fosse restabelecido.</p>
                <p style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.APP_URL || 'http://localhost:5173'}"
                     style="background: #0b3d91; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Acessar o sistema
                  </a>
                </p>
                <p style="color: #6b7280; font-size: 13px;">
                  Restabelecido em: <strong>${agora}</strong>
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  Esta é uma mensagem automática do Sistema de Estoque.
                </p>
              </div>
            </div>
          `,
        });

        await db.query(
          `UPDATE notificacoes
           SET status = 'enviado', enviado_em = NOW(), erro = NULL
           WHERE id = $1`,
          [n.id]
        );

        resultados.push({ id: n.id, email: n.email, ok: true });
      } catch (err) {
        console.error(`Erro ao enviar para ${n.email}:`, err.message);
        await db.query(
          `UPDATE notificacoes
           SET status = 'erro', erro = $1
           WHERE id = $2`,
          [err.message, n.id]
        );
        resultados.push({ id: n.id, email: n.email, ok: false, erro: err.message });
      }
    }

    const enviados = resultados.filter((r) => r.ok).length;
    const falhas = resultados.length - enviados;

    res.json({
      ok: true,
      enviados,
      falhas,
      smtp_configurado: configurado,
      resultados,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/notificacoes/:id
router.delete('/notificacoes/:id', autenticar, apenasAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM notificacoes WHERE id = $1',
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ erro: 'Notificação não encontrada' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;