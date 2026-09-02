const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { readPsd, initializeCanvas } = require('ag-psd');

// Initialize ag-psd without needing native node-canvas or C++ build tools
initializeCanvas(
  (width, height) => ({ width, height }),
  (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })
);

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const EVERYTHING_URL = process.env.EVERYTHING_URL || 'http://127.0.0.1:8080';
// Repo root: apps/backend/src -> ../../.. -> repo root, matching the ".cache/thumbs"
// location described in the architecture document.
const CACHE_DIR = path.resolve(__dirname, '../../../.cache/thumbs');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']);
const PSD_EXTENSIONS = new Set(['.psd', '.psb']);
// Everything HTTP server only accepts these values for the "sort" query
// string parameter (see References/EverythingHTTP_INFO.md).
const ALLOWED_SORT_FIELDS = new Set(['name', 'path', 'date_modified', 'size']);

fs.mkdirSync(CACHE_DIR, { recursive: true });

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}));

function parseFilePath(rawPath) {
  if (!rawPath) return null;

  const decoded = decodeURIComponent(String(rawPath).trim());
  if (!decoded) return null;

  return decoded;
}

function isPsdFile(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  return PSD_EXTENSIONS.has(ext);
}

function isImageFile(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext) || PSD_EXTENSIONS.has(ext);
}

function getCachePath(filePath, suffix = '') {
  const digest = crypto.createHash('sha256').update(filePath).digest('hex');
  return path.join(CACHE_DIR, `${digest}${suffix}.webp`);
}

// Concurrency limiter for CPU/memory-heavy thumbnail generation (e.g. PSD parsing).
// Allows fast, staggered processing (cascade) without starving CPU or locking the event loop.
const MAX_CONCURRENT_GENERATIONS = 2;
let activeGenerations = 0;
const generationQueue = [];
const inFlightGenerations = new Map();

function enqueueGenerationTask(taskFn) {
  return new Promise((resolve, reject) => {
    generationQueue.push({ taskFn, resolve, reject });
    processNextGenerationTask();
  });
}

function processNextGenerationTask() {
  if (activeGenerations >= MAX_CONCURRENT_GENERATIONS || generationQueue.length === 0) {
    return;
  }

  const { taskFn, resolve, reject } = generationQueue.shift();
  activeGenerations++;

  Promise.resolve()
    .then(taskFn)
    .then(resolve, reject)
    .finally(() => {
      activeGenerations--;
      processNextGenerationTask();
    });
}

// Generates or awaits an in-flight generation task for a specific cache output file
function generateThumbnailCached(cachePath, generateFn) {
  if (fs.existsSync(cachePath)) {
    return Promise.resolve(cachePath);
  }

  if (inFlightGenerations.has(cachePath)) {
    return inFlightGenerations.get(cachePath);
  }

  const promise = enqueueGenerationTask(async () => {
    if (!fs.existsSync(cachePath)) {
      await generateFn();
    }
    return cachePath;
  }).finally(() => {
    inFlightGenerations.delete(cachePath);
  });

  inFlightGenerations.set(cachePath, promise);
  return promise;
}

async function renderPsdToWebp(filePath, outputPath, width) {
  const buffer = await fs.promises.readFile(filePath);
  // Yield briefly to event loop before synchronous parsing
  await new Promise((resolve) => setImmediate(resolve));

  const psd = readPsd(buffer, {
    useImageData: true,
    skipLayerImageData: true,
    useRawThumbnail: true,
  });

  if (psd.imageData && psd.imageData.data) {
    const rawBuffer = Buffer.from(
      psd.imageData.data.buffer,
      psd.imageData.data.byteOffset,
      psd.imageData.data.byteLength
    );
    let pipeline = sharp(rawBuffer, {
      raw: {
        width: psd.imageData.width || psd.width,
        height: psd.imageData.height || psd.height,
        channels: 4,
      },
    });

    if (width) {
      pipeline = pipeline.resize({ width, fit: 'inside', withoutEnlargement: true });
    }

    await pipeline.webp({ quality: 80 }).toFile(outputPath);
    return;
  }

  const rawThumbnail = psd.thumbnailRaw || (psd.imageResources && psd.imageResources.thumbnailRaw);
  if (rawThumbnail) {
    let pipeline = sharp(rawThumbnail);
    if (width) {
      pipeline = pipeline.resize({ width, fit: 'inside', withoutEnlargement: true });
    }
    await pipeline.webp({ quality: 80 }).toFile(outputPath);
    return;
  }

  throw new Error('No composite image or thumbnail found in PSD file.');
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

// Builds an Everything search-syntax clause that restricts results to the
// given extensions, e.g. "ext:jpg;png;gif". Everything's "ext:" function
// accepts a semicolon-separated list of extensions (without leading dots).
function buildExtensionClause(rawExt) {
  const extensions = String(rawExt || '')
    .split(',')
    .map((value) => value.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean);

  if (!extensions.length) return '';

  return `ext:${extensions.join(';')}`;
}

function parseSortField(rawSort) {
  const sort = String(rawSort || '').trim().toLowerCase();
  return ALLOWED_SORT_FIELDS.has(sort) ? sort : 'name';
}

function parseAscending(rawAscending) {
  if (rawAscending === undefined) return true;
  return String(rawAscending) !== '0' && String(rawAscending).toLowerCase() !== 'false';
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
    previewUrl: isImage ? `/api/preview?path=${encodeURIComponent(fullPath)}` : null,
    downloadUrl: type === 'file' ? `/api/download?path=${encodeURIComponent(fullPath)}` : null,
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
  const extensionClause = buildExtensionClause(req.query.ext);
  const sort = parseSortField(req.query.sort);
  const ascending = parseAscending(req.query.ascending);

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const search = extensionClause ? `${extensionClause} ${q}` : q;

    const params = new URLSearchParams({
      search,
      json: '1',
      offset: String(offset),
      count: String(count),
      path_column: '1',
      size_column: '1',
      sort,
      ascending: ascending ? '1' : '0',
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

// Deletes every cached thumbnail file so the next /api/thumbnail request for
// each image regenerates it from scratch. Used by the frontend's "refresh
// thumbnails" button.
app.delete('/api/thumbnails', (_req, res) => {
  try {
    const entries = fs.readdirSync(CACHE_DIR);

    for (const entry of entries) {
      fs.rmSync(path.join(CACHE_DIR, entry), { force: true });
    }

    return res.json({ ok: true, removed: entries.length });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to clear thumbnail cache.',
      details: error.message,
    });
  }
});

app.get('/api/thumbnail', async (req, res) => {
  const filePath = parseFilePath(req.query.path);
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
      await generateThumbnailCached(cachePath, async () => {
        if (isPsdFile(filePath)) {
          await renderPsdToWebp(filePath, cachePath, width);
        } else {
          await sharp(filePath)
            .resize({ width, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(cachePath);
        }
      });
    }

    return res.type('image/webp').sendFile(cachePath);
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to generate thumbnail image.',
      details: error.message,
    });
  }
});

// Serves the original, full-resolution image file (unlike /api/thumbnail,
// which returns a resized/cached preview) for use in the frontend's
// lightbox. Sent inline so it renders directly instead of prompting a
// download like /api/download does. For PSD files, converts to a WebP
// preview because browsers cannot display raw PSD files natively.
app.get('/api/preview', async (req, res) => {
  const filePath = parseFilePath(req.query.path);

  if (!filePath) {
    return res.status(400).json({ error: 'Query parameter "path" is required.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file not found.' });
  }

  if (!fs.statSync(filePath).isFile() || !isImageFile(filePath)) {
    return res.status(415).json({ error: 'Unsupported file type for preview.' });
  }

  if (isPsdFile(filePath)) {
    const previewCachePath = getCachePath(filePath, '_preview');
    try {
      if (!fs.existsSync(previewCachePath)) {
        await generateThumbnailCached(previewCachePath, async () => {
          await renderPsdToWebp(filePath, previewCachePath, 1920);
        });
      }
      res.set('Content-Disposition', 'inline');
      return res.type('image/webp').sendFile(previewCachePath);
    } catch (error) {
      return res.status(500).json({
        error: 'Unable to generate PSD preview.',
        details: error.message,
      });
    }
  }

  res.set('Content-Disposition', 'inline');
  return res.sendFile(filePath);
});

app.get('/api/download', (req, res) => {
  const filePath = parseFilePath(req.query.path);

  if (!filePath) {
    return res.status(400).json({ error: 'Query parameter "path" is required.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found.' });
  }

  if (!fs.statSync(filePath).isFile()) {
    return res.status(400).json({ error: 'Path does not point to a file.' });
  }

  const fileName = path.basename(filePath);

  return res.download(filePath, fileName, (error) => {
    if (error && !res.headersSent) {
      res.status(500).json({
        error: 'Unable to download file.',
        details: error.message,
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Aguacero backend running on http://localhost:${PORT}`);
  console.log(`Everything target: ${EVERYTHING_URL}`);
  console.log(`Thumbnail cache: ${CACHE_DIR}`);
});
