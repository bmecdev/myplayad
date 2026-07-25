/**
 * Servidor local de cache de videos — corre en la PANTALLA (no en el VPS).
 *
 * Responsabilidades:
 *   1. Al recibir GET /api/cache/:screenId  →  sincroniza contra el servidor
 *      remoto (REMOTE_VIDEO_SERVER_URL):
 *        - Descarga los videos que están en el remoto y no existen localmente.
 *        - Elimina los videos locales que ya no existen en el remoto.
 *        - Devuelve la lista local actualizada.
 *   2. Sirve los archivos en GET /videos/:screenId/:filename  →  el navegador
 *      reproduce desde localhost, sin tocar internet.
 *
 * Uso:
 *   REMOTE_VIDEO_SERVER_URL=https://videos.myplayad.com node server.js
 *
 * Variables de entorno:
 *   REMOTE_VIDEO_SERVER_URL  URL base del servidor remoto de videos (requerido)
 *   VIDEOS_DIR               Carpeta local donde se guardan los videos
 *                            (default: ./videos)
 *   PORT                     Puerto local del servidor (default: 8090)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

// ─── Configuración ───────────────────────────────────────────────────────────

const REMOTE = (process.env.REMOTE_VIDEO_SERVER_URL || '').replace(/\/$/, '');
const VIDEOS_DIR = path.resolve(process.env.VIDEOS_DIR || path.join(__dirname, 'videos'));
const PORT = parseInt(process.env.PORT || '8090', 10);

if (!REMOTE) {
    console.error('[ERROR] Debes definir la variable de entorno REMOTE_VIDEO_SERVER_URL');
    console.error('        Ejemplo: REMOTE_VIDEO_SERVER_URL=https://videos.myplayad.com node server.js');
    process.exit(1);
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIDEO_EXT_RE = /\.(mp4|webm|ogg)$/i;
const MIME = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg' };

function isVideo(filename) {
    return VIDEO_EXT_RE.test(filename || '');
}

async function listLocal(screenId) {
    const dir = path.join(VIDEOS_DIR, screenId);
    try {
        const files = await fs.promises.readdir(dir);
        return files.filter(isVideo).sort();
    } catch (_) {
        return [];
    }
}

// ─── Sincronización ──────────────────────────────────────────────────────────

// Evita que dos peticiones para el mismo screenId disparen dos syncs en paralelo.
const activeSyncs = new Map();

async function syncScreen(screenId) {
    if (activeSyncs.has(screenId)) {
        return activeSyncs.get(screenId);
    }

    const promise = (async () => {
        // 1. Obtener lista remota (fuente de verdad)
        const listRes = await fetch(`${REMOTE}/api/videos/${screenId}`);
        if (!listRes.ok) {
            throw new Error(`El servidor remoto respondió ${listRes.status} al listar videos`);
        }
        const listData = await listRes.json();
        const remoteVideos = (listData.videos || []).filter(isVideo).sort();
        const remoteSet = new Set(remoteVideos);

        const screenDir = path.join(VIDEOS_DIR, screenId);
        await fs.promises.mkdir(screenDir, { recursive: true });

        // 2. Descargar los que faltan localmente
        let downloaded = 0;
        for (const filename of remoteVideos) {
            const safe = path.basename(filename);
            const dest = path.join(screenDir, safe);
            const tmp  = `${dest}.part`;

            // Si ya existe, saltar
            try {
                await fs.promises.access(dest, fs.constants.F_OK);
                continue;
            } catch (_) {}

            console.log(`[sync][${screenId}] descargando: ${safe}`);
            const fileRes = await fetch(`${REMOTE}/videos/${screenId}/${encodeURIComponent(safe)}`);
            if (!fileRes.ok || !fileRes.body) {
                console.warn(`[sync][${screenId}] no se pudo descargar ${safe} (${fileRes.status})`);
                continue;
            }
            await pipeline(Readable.fromWeb(fileRes.body), fs.createWriteStream(tmp));
            await fs.promises.rename(tmp, dest);
            downloaded += 1;
        }

        // 3. Eliminar los que ya no están en el remoto
        let removed = 0;
        const localFiles = await fs.promises.readdir(screenDir).catch(() => []);
        for (const filename of localFiles) {
            if (!isVideo(filename)) continue;
            if (remoteSet.has(filename)) continue;
            await fs.promises.unlink(path.join(screenDir, filename));
            console.log(`[sync][${screenId}] eliminado: ${filename}`);
            removed += 1;
        }

        // 4. Devolver lista local (debe coincidir con remota tras sync)
        const videos = await listLocal(screenId);
        return { screenId, videos, downloaded, removed };
    })();

    activeSyncs.set(screenId, promise);
    try {
        return await promise;
    } finally {
        activeSyncs.delete(screenId);
    }
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'GET')    { res.writeHead(405); res.end('Method Not Allowed'); return; }

    const url   = new URL(req.url, `http://localhost:${PORT}`);
    const parts = url.pathname.split('/').filter(Boolean);

    // GET /api/cache/:screenId
    // Sincroniza contra el remoto y devuelve la playlist local actualizada.
    if (parts[0] === 'api' && parts[1] === 'cache' && parts[2]) {
        const screenId = parts[2];
        if (!GUID_RE.test(screenId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'screenId inválido' }));
            return;
        }
        syncScreen(screenId)
            .then(result => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            })
            .catch(err => {
                console.error(`[cache][${screenId}] error:`, err.message);
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error sincronizando videos', detail: err.message, videos: [] }));
            });
        return;
    }

    // GET /api/videos/:screenId
    // Devuelve la playlist local sin sincronizar (para consultas rápidas).
    if (parts[0] === 'api' && parts[1] === 'videos' && parts[2]) {
        const screenId = parts[2];
        if (!GUID_RE.test(screenId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'screenId inválido' }));
            return;
        }
        listLocal(screenId).then(videos => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ screenId, videos }));
        });
        return;
    }

    // GET /videos/:screenId/:filename
    // Sirve el archivo de video desde disco local con soporte de Range (seek).
    if (parts[0] === 'videos' && parts[1] && parts[2]) {
        const screenId = parts[1];
        const filename = path.basename(parts[2]);
        if (!GUID_RE.test(screenId) || !isVideo(filename)) {
            res.writeHead(400); res.end('Petición inválida'); return;
        }
        const filePath = path.join(VIDEOS_DIR, screenId, filename);
        fs.stat(filePath, (err, stat) => {
            if (err) { res.writeHead(404); res.end('No encontrado'); return; }

            const mime  = MIME[path.extname(filename).toLowerCase()] || 'application/octet-stream';
            const range = req.headers.range;

            if (range) {
                const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
                const start = parseInt(startStr, 10);
                const end   = endStr ? parseInt(endStr, 10) : stat.size - 1;
                const chunk = end - start + 1;
                res.writeHead(206, {
                    'Content-Range':  `bytes ${start}-${end}/${stat.size}`,
                    'Accept-Ranges':  'bytes',
                    'Content-Length': chunk,
                    'Content-Type':   mime
                });
                fs.createReadStream(filePath, { start, end }).pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': stat.size,
                    'Content-Type':   mime,
                    'Accept-Ranges':  'bytes'
                });
                fs.createReadStream(filePath).pipe(res);
            }
        });
        return;
    }

    // Serve frontend files (index.html, style.css, main.js)
    if (parts.length === 0 || parts[0] === 'index.html' || parts[0] === 'style.css' || parts[0] === 'main.js') {
        const file = parts.length === 0 ? 'index.html' : parts[0];
        const filePath = path.join(__dirname, 'frontend', file);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const mimeType = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'text/html';
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        });
        return;
    }

    res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[screen-server] escuchando en http://localhost:${PORT}`);
    console.log(`[screen-server] videos dir:    ${VIDEOS_DIR}`);
    console.log(`[screen-server] remote source: ${REMOTE}`);
});

server.on('error', err => {
    console.error('[screen-server] error fatal:', err.message);
    process.exit(1);
});
