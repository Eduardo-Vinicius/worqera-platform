const app = require('./app');
const { connectMongo, getMongoUri } = require('./v1/db/mongo');

const PORT = Number(process.env.PORT || 3001);

async function main() {
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
