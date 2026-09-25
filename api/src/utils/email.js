const nodemailer = require('nodemailer');

// ============================================================
// Verifica se as credenciais SMTP estão configuradas
// ============================================================
const configurado = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

let transporter = null;

if (configurado) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // TLS via STARTTLS (porta 587)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Testa a conexão ao iniciar
  transporter.verify((err) => {
    if (err) {
      console.error('❌ Erro SMTP:', err.message);
    } else {
      console.log('✅ SMTP pronto para envio');
    }
  });
} else {
  console.warn('⚠️  SMTP não configurado — e-mails serão simulados no console');
}

// ============================================================
// Função principal de envio
// ============================================================
async function enviarEmail({ to, subject, html, text }) {
  // Modo simulado (sem SMTP configurado)
  if (!configurado) {
    console.log('\n📧 [SIMULADO] E-mail seria enviado:');
    console.log(`   Para: ${to}`);
    console.log(`   Assunto: ${subject}`);
    console.log(`   Texto: ${text || '(HTML)'}`);
    console.log('');
    return { simulado: true, messageId: `simulado-${Date.now()}` };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Sistema" <no-reply@estoque.local>',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });

  return info;
}

module.exports = { enviarEmail, configurado };