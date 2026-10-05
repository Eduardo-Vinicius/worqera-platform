const { createClient } = require('redis');

let client = null;
let connecting = null;
let disabledUntil = 0;

function redisUrl() {
  if (process.env.REDIS_URL) return String(process.env.REDIS_URL).trim();
  if (process.env.NODE_ENV === 'production') return '';
  return 'redis://127.0.0.1:6379';
}

async function getRedis() {
  if (client?.isOpen) return client;
  if (Date.now() < disabledUntil) return null;
  if (connecting) return connecting;
  const url = redisUrl();
  if (!url) return null;

  connecting = (async () => {
    const created = createClient({
      url,
      socket: {
        connectTimeout: 1500,
        reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 200, 1000)),
      },
    });
    created.on('error', () => {});
    try {
      await created.connect();
      client = created;
      disabledUntil = 0;
      return created;
    } catch (err) {
      try {
        created.destroy();
      } catch {
        /* ignore */
      }
      client = null;
      disabledUntil = Date.now() + 15000;
      console.warn('[redis] indisponível:', err.message);
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

async function redisCmd(fn) {
  try {
    const redis = await getRedis();
    if (!redis) return null;
    return await fn(redis);
  } catch (err) {
    console.warn('[redis]', err.message);
    return null;
  }
}

module.exports = { getRedis, redisCmd, redisUrl };
