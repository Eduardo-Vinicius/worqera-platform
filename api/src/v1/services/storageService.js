const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

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

function publicUrl(key, { publicAccess } = {}) {
  const safe = normalizeKey(key);
  const usePublic = publicAccess === true || isPublicBrandingKey(safe);
  const rel = usePublic ? `/api/v1/public/files/${safe}` : `/api/v1/files/${safe}`;
  const base = (process.env.PUBLIC_API_URL || '').replace(/\/+$/, '');
  return base ? `${base}${rel}` : rel;
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
      url: publicUrl(safe, { publicAccess: isPublicBrandingKey(safe) }),
      location: result.Location,
    };
  }

  const full = absolutePath(safe);
  await ensureDirFor(full);
  await fsp.writeFile(full, buffer);
  return {
    key: safe,
    url: publicUrl(safe, { publicAccess: isPublicBrandingKey(safe) }),
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
      url: publicUrl(obj.Key),
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
          url: publicUrl(rel),
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
    // prefix may point at a folder that doesn't exist yet
    const parent = path.dirname(dir);
    const baseName = path.basename(dir);
    if (fs.existsSync(parent)) {
      const entries = await fsp.readdir(parent, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(baseName) && entry.isFile()) {
          const full = path.join(parent, entry.name);
          const rel = path.posix.join(path.dirname(baseRel), entry.name);
          const stat = await fsp.stat(full);
          items.push({ key: rel, url: publicUrl(rel), size: stat.size, lastModified: stat.mtime });
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

module.exports = {
  BASE_DIR,
  publicUrl,
  putBuffer,
  getBuffer,
  list,
  deletePrefix,
  photosPrefix,
  pdfsPrefix,
  brandingPrefix,
  isPublicBrandingKey,
  normalizeKey,
};
