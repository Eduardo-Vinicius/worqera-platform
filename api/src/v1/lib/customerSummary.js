/**
 * "O que vamos fazer" (página do QR e laudo). O texto da IA está pausado:
 * ele falava coisas diferentes do combinado no balcão. Religar com WORQERA_AI__CustomerSummary=1.
 */

function customerSummaryAiEnabled(env = process.env) {
  const raw = String(env.WORQERA_AI__CustomerSummary || '').trim().toLowerCase();
  return raw === '1' || raw === 'true';
}

/** Text the customer may see: always the team's own wording; the AI's only when enabled. */
function publicCustomerSummary(order, env = process.env) {
  const summary = order?.customerSummary;
  const text = String(summary?.text || '').trim();
  if (!text) return '';
  if (summary.ai === true && !summary.edited && !customerSummaryAiEnabled(env)) return '';
  return text;
}

module.exports = { customerSummaryAiEnabled, publicCustomerSummary };
