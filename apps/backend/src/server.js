const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const EVERYTHING_URL = process.env.EVERYTHING_URL || 'http://127.0.0.1:8080';
// Repo root: apps/backend/src -> ../../.. -> repo root, matching the ".cache/thumbs"
// location described in the architecture document.
const CACHE_DIR = path.resolve(__dirname, '../../../.cache/thumbs');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']);

fs.mkdirSync(CACHE_DIR, { recursive: true });

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}));

function parseImagePath(rawPath) {
  if (!rawPath) return null;

  const decoded = decodeURIComponent(String(rawPath).trim());
  if (!decoded) return null;

  return decoded;
}

function isImageFile(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function getCachePath(filePath) {
  const digest = crypto.createHash('sha256').update(filePath).digest('hex');
  return path.join(CACHE_DIR, `${digest}.webp`);
}

// Everything's JSON only includes "path" (the parent folder) and "size" when
// explicitly requested via path_column=1 / size_column=1. "path" is NEVER the
// full file path by itself -- it must be joined with "name".
function buildFullPath(dirPath, name) {
  const dir = String(dirPath || '').trim();
  const fileName = String(name || '').trim();

  if (!dir) return fileName;

  return dir.endsWith('\\') ? `${dir}${fileName}` : `${dir}\\${fileName}`;
}

function parseSize(rawSize) {
  const size = Number(rawSize);
  return Number.isFinite(size) ? size : 0;
}

function serializeResult(entry) {
  const type = entry.type === 'folder' ? 'folder' : 'file';
  const fileName = String(entry.name || '').trim();
  const fullPath = buildFullPath(entry.path, fileName);
  const isImage = type === 'file' && isImageFile(fullPath);

  return {
    name: fileName,
    path: fullPath,
    size: parseSize(entry.size),
    type,
    isImage,
    thumbnailUrl: isImage ? `/api/thumbnail?path=${encodeURIComponent(fullPath)}` : null,
  };
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'aguacero-backend',
    everythingUrl: EVERYTHING_URL,
    cacheDir: CACHE_DIR,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const offset = Number(req.query.offset || 0);
  const count = Number(req.query.count || 50);

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const params = new URLSearchParams({
      search: q,
      json: '1',
      offset: String(offset),
      count: String(count),
      path_column: '1',
      size_column: '1',
    });

    const response = await fetch(`${EVERYTHING_URL}/?${params.toString()}`);
    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).send(text);
    }

    const payload = JSON.parse(text);
    const rawResults = Array.isArray(payload.results) ? payload.results : [];
    const totalResults = Number(payload.totalResults || rawResults.length || 0);

    const results = rawResults.map(serializeResult);

    return res.json({
      totalResults,
      results,
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Unable to reach Everything HTTP server.',
      details: error.message,
    });
  }
});

app.get('/api/thumbnail', async (req, res) => {
  const filePath = parseImagePath(req.query.path);
  const width = Math.max(32, Math.min(800, Number(req.query.w || 200)));

  if (!filePath) {
    return res.status(400).json({ error: 'Query parameter "path" is required.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file not found.' });
  }

  if (!isImageFile(filePath)) {
    return res.status(415).json({ error: 'Unsupported file type for thumbnail generation.' });
  }

  const cachePath = getCachePath(filePath);

  try {
    if (!fs.existsSync(cachePath)) {
      await sharp(filePath)
        .resize({ width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(cachePath);
    }

    return res.type('image/webp').sendFile(cachePath);
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to generate thumbnail image.',
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Aguacero backend running on http://localhost:${PORT}`);
  console.log(`Everything target: ${EVERYTHING_URL}`);
  console.log(`Thumbnail cache: ${CACHE_DIR}`);
});
