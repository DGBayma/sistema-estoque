const db = require('../database');
const { enviarEmail, configurado } = require('./email');

let ultimoEstado = 'desconhecido';

async function verificarEEnviar() {
  try {
    await db.query('SELECT 1');

    if (ultimoEstado === 'offline') {
      console.log('🔔 Sistema voltou! Disparando e-mails agendados...');

      const { rows } = await db.query(
        `SELECT id, email FROM notificacoes WHERE status = 'pendente'`
      );

      for (const n of rows) {
        try {
          await enviarEmail({
            to: n.email,
            subject: '✅ Sistema de Estoque voltou ao ar!',
            html: `
              <h2>✅ Sistema restabelecido</h2>
              <p>Você pediu para ser avisado. Estamos online novamente!</p>
              <p><a href="${process.env.APP_URL || 'http://localhost:5173'}">Acessar o sistema</a></p>
            `,
          });
          await db.query(
            `UPDATE notificacoes SET status = 'enviado', enviado_em = NOW() WHERE id = $1`,
            [n.id]
          );
        } catch (err) {
          console.error(`Erro para ${n.email}:`, err.message);
        }
      }
    }

    ultimoEstado = 'online';
  } catch (err) {
    ultimoEstado = 'offline';
  }
}

function iniciarAutoNotify() {
  if (!configurado) {
    console.log('⚠️  autoNotify desativado (SMTP não configurado)');
    return;
  }
  console.log('🤖 autoNotify iniciado (verifica a cada 60s)');
  setInterval(verificarEEnviar, 60000);
  verificarEEnviar();
}

module.exports = { iniciarAutoNotify };