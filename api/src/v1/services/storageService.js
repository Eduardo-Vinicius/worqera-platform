const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const BASE_DIR = () =>
  path.resolve(process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads'));
const useS3 = () => Boolean(String(process.env.S3_BUCKET_NAME || '').trim());

let s3Client = null;
function getS3() {
  if (!s3Client) {
    const AWS = require('aws-sdk');
    s3Client = new AWS.S3({ region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1' });
  }
  return s3Client;
}

function normalizeKey(key) {
  return String(key || '')
    .replace(/^\/+/, '')
    .replace(/\.\./g, '');
}

function absolutePath(key) {
  const safe = normalizeKey(key);
  const root = BASE_DIR();
  const full = path.resolve(root, safe);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (full !== root && !full.startsWith(rootPrefix)) {
    const err = new Error('Invalid storage key');
    err.status = 400;
    err.code = 'INVALID_KEY';
    throw err;
  }
  return full;
}

function isPublicBrandingKey(key) {
  return /^shops\/[^/]+\/branding\//.test(normalizeKey(key));
}

function apiBaseUrl() {
  return (process.env.PUBLIC_API_URL || process.env.WORQERA_PublicApiUrl || '').replace(/\/+$/, '');
}

function publicUrl(key, { publicAccess } = {}) {
  const safe = normalizeKey(key);
  const usePublic = publicAccess === true || isPublicBrandingKey(safe);
  const rel = usePublic ? `/api/v1/public/files/${safe}` : `/api/v1/files/${safe}`;
  const base = apiBaseUrl();
  return base ? `${base}${rel}` : rel;
}

function fileSignSecret() {
  return process.env.FILE_URL_SECRET || process.env.JWT_SECRET || 'changeme';
}

function signFileAccess(key, exp) {
  return crypto
    .createHmac('sha256', fileSignSecret())
    .update(`${normalizeKey(key)}.${exp}`)
    .digest('hex')
    .slice(0, 32);
}

function verifyFileAccess(key, exp, sig) {
  const e = Number(exp);
  const s = String(sig || '');
  if (!e || !s || e < Math.floor(Date.now() / 1000)) return false;
  const expected = signFileAccess(key, e);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s));
  } catch {
    return false;
  }
}

/**
 * Browser-loadable URL for <img>/<a>.
 * S3 → temporary signed getObject URL.
 * Disk → /api/v1/files/...?exp=&sig= (no Bearer required).
 */
function accessibleUrl(key, { ttlSec = 6 * 3600 } = {}) {
  const safe = normalizeKey(key);
  if (!safe) return '';
  if (isPublicBrandingKey(safe)) {
    return publicUrl(safe, { publicAccess: true });
  }
  if (useS3()) {
    return getS3().getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: safe,
      Expires: Math.min(Math.max(Number(ttlSec) || 3600, 60), 7 * 24 * 3600),
    });
  }
  const exp =
    Math.floor(Date.now() / 1000) +
    Math.min(Math.max(Number(ttlSec) || 3600, 60), 7 * 24 * 3600);
  const sig = signFileAccess(safe, exp);
  const base = publicUrl(safe);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}exp=${exp}&sig=${sig}`;
}

/** Resolve stored photo object / legacy URL into a loadable URL. */
function resolvePhotoUrl(photo) {
  if (!photo) return null;
  if (typeof photo === 'string') {
    const s = photo.trim();
    if (!s) return null;
    const filesIdx = s.indexOf('/api/v1/files/');
    if (filesIdx >= 0) {
      const rest = s.slice(filesIdx + '/api/v1/files/'.length).split('?')[0];
      try {
        return accessibleUrl(decodeURIComponent(rest));
      } catch {
        return accessibleUrl(rest);
      }
    }
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    return accessibleUrl(s);
  }
  if (photo.key) return accessibleUrl(photo.key);
  if (photo.url) return resolvePhotoUrl(photo.url);
  return null;
}

function photosPrefix(shopId, orderId) {
  return `shops/${shopId}/orders/${orderId}/fotos/`;
}

function pdfsPrefix(shopId, orderId) {
  return `shops/${shopId}/orders/${orderId}/pdfs/`;
}

function brandingPrefix(shopId) {
  return `shops/${shopId}/branding/`;
}

async function ensureDirFor(filePath) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
}

async function putBuffer(key, buffer, contentType) {
  const safe = normalizeKey(key);
  if (useS3()) {
    const result = await getS3()
      .upload({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: safe,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      })
      .promise();
    return {
      key: safe,
      url: accessibleUrl(safe),
      location: result.Location,
    };
  }

  const full = absolutePath(safe);
  await ensureDirFor(full);
  await fsp.writeFile(full, buffer);
  return {
    key: safe,
    url: accessibleUrl(safe),
  };
}

async function getBuffer(key) {
  const safe = normalizeKey(key);
  if (useS3()) {
    const result = await getS3()
      .getObject({ Bucket: process.env.S3_BUCKET_NAME, Key: safe })
      .promise();
    return {
      buffer: Buffer.isBuffer(result.Body) ? result.Body : Buffer.from(result.Body),
      contentType: result.ContentType || 'application/octet-stream',
    };
  }

  const full = absolutePath(safe);
  const buffer = await fsp.readFile(full);
  const ext = path.extname(full).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
  };
  return { buffer, contentType: types[ext] || 'application/octet-stream' };
}

async function list(prefix) {
  const safePrefix = normalizeKey(prefix);
  if (useS3()) {
    const result = await getS3()
      .listObjectsV2({ Bucket: process.env.S3_BUCKET_NAME, Prefix: safePrefix })
      .promise();
    return (result.Contents || []).map((obj) => ({
      key: obj.Key,
      url: accessibleUrl(obj.Key),
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  }

  const dir = absolutePath(safePrefix);
  const items = [];
  async function walk(current, relBase) {
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.posix.join(relBase, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else {
        const stat = await fsp.stat(full);
        items.push({
          key: rel,
          url: accessibleUrl(rel),
          size: stat.size,
          lastModified: stat.mtime,
        });
      }
    }
  }

  const baseRel = safePrefix.replace(/\/+$/, '');
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    await walk(dir, baseRel);
  } else {
    const parent = path.dirname(dir);
    const baseName = path.basename(dir);
    if (fs.existsSync(parent)) {
      const entries = await fsp.readdir(parent, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(baseName) && entry.isFile()) {
          const full = path.join(parent, entry.name);
          const rel = path.posix.join(path.dirname(baseRel), entry.name);
          const stat = await fsp.stat(full);
          items.push({
            key: rel,
            url: accessibleUrl(rel),
            size: stat.size,
            lastModified: stat.mtime,
          });
        }
      }
    }
  }
  return items;
}

async function deletePrefix(prefix) {
  const safePrefix = normalizeKey(prefix);
  if (useS3()) {
    const listed = await getS3()
      .listObjectsV2({ Bucket: process.env.S3_BUCKET_NAME, Prefix: safePrefix })
      .promise();
    if (!listed.Contents || listed.Contents.length === 0) return 0;
    await getS3()
      .deleteObjects({
        Bucket: process.env.S3_BUCKET_NAME,
        Delete: { Objects: listed.Contents.map((o) => ({ Key: o.Key })) },
      })
      .promise();
    return listed.Contents.length;
  }

  const dir = absolutePath(safePrefix);
  let removed = 0;
  async function rm(current) {
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await rm(full);
        await fsp.rmdir(full).catch(() => {});
      } else {
        await fsp.unlink(full);
        removed += 1;
      }
    }
  }
  await rm(dir);
  await fsp.rmdir(dir).catch(() => {});
  return removed;
}

async function deleteObject(key) {
  const safe = normalizeKey(key);
  if (!safe) return false;
  if (useS3()) {
    await getS3()
      .deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: safe })
      .promise();
    return true;
  }
  const full = absolutePath(safe);
  try {
    await fsp.unlink(full);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

module.exports = {
  BASE_DIR,
  publicUrl,
  accessibleUrl,
  resolvePhotoUrl,
  verifyFileAccess,
  putBuffer,
  getBuffer,
  list,
  deletePrefix,
  deleteObject,
  photosPrefix,
  pdfsPrefix,
  brandingPrefix,
  isPublicBrandingKey,
  normalizeKey,
};
