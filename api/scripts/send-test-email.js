#!/usr/bin/env node
/**
 * Testa o mailer v1 (SMTP Gmail ou console).
 *
 * Uso:
 *   node scripts/send-test-email.js seu@email.com
 *
 * Requer no .env:
 *   WORQERA_Email__Enabled=true
 *   WORQERA_Email__Smtp__Username=...
 *   WORQERA_Email__Smtp__Password=...   (App Password, 16 chars)
 */
require('dotenv').config();
const { sendMail } = require('../src/v1/services/mailer');

async function main() {
  const to = process.argv[2] || process.env.SEED_ADMIN_EMAIL;
  if (!to || !String(to).includes('@')) {
    console.error('Uso: node scripts/send-test-email.js seu@email.com');
    process.exit(1);
  }

  const result = await sendMail({
    to,
    subject: 'Teste Worqera — e-mail ok',
    html: `<p>Olá,</p>
<p>Se você recebeu esta mensagem, o SMTP da Worqera está funcionando.</p>
<p style="color:#64748b;font-size:13px">Ambiente: <code>${process.env.NODE_ENV || 'development'}</code></p>`,
    text: 'Teste Worqera — se você leu isto, o e-mail está ok.',
    shop: { name: 'Worqera', branding: { displayName: 'Worqera' } },
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.preview) {
    console.log('\n→ Sem SMTP configurado: mensagem só no console. Preencha WORQERA_Email__* no .env.');
  } else if (result.ok) {
    console.log(`\n→ Enviado via ${result.provider} para ${to}`);
  }
}

main().catch((err) => {
  console.error('[send-test-email] falhou:', err.message || err);
  process.exit(1);
});
