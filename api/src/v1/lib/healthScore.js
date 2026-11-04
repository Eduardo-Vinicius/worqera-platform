/**
 * System health 0–100 (same rule as the Procedy console): start at 100 and take penalties
 * for 5xx rate, p95 latency and the system status. Pure, so the grade is testable.
 */
function errorPenalty(rate, requests) {
  if (requests < 20) return 0;
  if (rate >= 5) return 40;
  if (rate >= 2) return 25;
  if (rate >= 1) return 15;
  if (rate >= 0.5) return 5;
  return 0;
}

function latencyPenalty(p95, requests) {
  if (requests < 20) return 0;
  if (p95 > 2500) return 25;
  if (p95 > 1000) return 15;
  if (p95 > 500) return 8;
  return 0;
}

function systemPenalty(status, reasons = []) {
  if (status === 'down') return 100;
  if (status === 'degraded') return Math.min(30, 10 * Math.max(1, reasons.length));
  return 0;
}

function grade(score) {
  if (score >= 90) return { grade: 'excellent', label: 'Excelente' };
  if (score >= 75) return { grade: 'good', label: 'Bom' };
  if (score >= 50) return { grade: 'attention', label: 'Atenção' };
  return { grade: 'critical', label: 'Crítico' };
}

function healthScore({ requests = 0, errorRate = 0, p95Ms = 0, status = 'healthy', reasons = [] } = {}) {
  const components = [
    { key: 'errors', label: 'Taxa de erro 5xx', value: `${errorRate}%`, penalty: errorPenalty(errorRate, requests) },
    { key: 'latency', label: 'Latência p95', value: `${Math.round(p95Ms)} ms`, penalty: latencyPenalty(p95Ms, requests) },
    { key: 'system', label: 'Banco e coleta', value: status, penalty: systemPenalty(status, reasons) },
  ];
  const score = Math.max(0, Math.min(100, 100 - components.reduce((sum, c) => sum + c.penalty, 0)));
  return { score, ...grade(score), components, reasons, requests };
}

module.exports = { healthScore, errorPenalty, latencyPenalty, systemPenalty, grade };
