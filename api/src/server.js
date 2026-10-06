const app = require('./app');
const { connectMongo, getMongoUri } = require('./v1/db/mongo');

const PORT = Number(process.env.PORT || 3001);

function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  const jwt = String(process.env.JWT_SECRET || '');
  const refresh = String(process.env.REFRESH_SECRET || '');
  const file = String(process.env.FILE_URL_SECRET || process.env.JWT_SECRET || '');
  const weak = (value, banned) => !value || value === banned || value.length < 24;
  if (weak(jwt, 'changeme') || weak(refresh, 'refreshchangeme') || weak(file, 'changeme')) {
    console.error('[Worqera API] JWT_SECRET, REFRESH_SECRET ou FILE_URL_SECRET fraco. Produção não sobe com o padrão de desenvolvimento.');
    process.exit(1);
  }
}

async function main() {
  assertProductionSecrets();
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`[Worqera API] listening on http://127.0.0.1:${PORT}`);
    console.log(`[Worqera API] health  → http://127.0.0.1:${PORT}/health`);
    console.log(`[Worqera API] v1      → http://127.0.0.1:${PORT}/api/v1`);
    console.log(`[Worqera API] mongo   → ${getMongoUri()}`);
  });
}

main().catch((err) => {
  console.error('[Worqera API] Failed to start:', err);
  process.exit(1);
});
