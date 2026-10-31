/** Asaas REST client. Only HTTP here; the billing rules live in billingService. */
const BASE = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
};

function config() {
  const env = process.env.WORQERA_Asaas__Env === 'production' ? 'production' : 'sandbox';
  return { apiKey: process.env.WORQERA_Asaas__ApiKey || '', env, baseUrl: BASE[env] };
}

function configured() {
  return Boolean(config().apiKey);
}

async function request(method, path, body, { fetchImpl = fetch } = {}) {
  const { apiKey, baseUrl } = config();
  const res = await fetchImpl(`${baseUrl}${path}`, {
    method,
    headers: { access_token: apiKey, 'Content-Type': 'application/json', 'User-Agent': 'Worqera/1.0' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.errors?.[0]?.description || `Asaas HTTP ${res.status}`);
    err.status = res.status >= 400 && res.status < 500 ? 400 : 502;
    err.code = 'BILLING_PROVIDER_ERROR';
    throw err;
  }
  return data;
}

module.exports = {
  config,
  configured,
  createCustomer: (body, opts) => request('POST', '/customers', body, opts),
  createSubscription: (body, opts) => request('POST', '/subscriptions', body, opts),
  updateSubscription: (id, body, opts) => request('PUT', `/subscriptions/${encodeURIComponent(id)}`, body, opts),
  deleteSubscription: (id, opts) => request('DELETE', `/subscriptions/${encodeURIComponent(id)}`, null, opts),
  listSubscriptionPayments: (id, status, opts) =>
    request(
      'GET',
      `/subscriptions/${encodeURIComponent(id)}/payments${status ? `?status=${encodeURIComponent(status)}` : ''}`,
      null,
      opts
    ),
};
