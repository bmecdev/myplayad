const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const VIDEOS_DIR = process.env.VIDEOS_DIR || '/videos';
const PORT = process.env.VIDEO_PORT || 8090;
const REMOTE_VIDEO_SERVER_URL = (process.env.REMOTE_VIDEO_SERVER_URL || 'https://videos.myplayad.com').replace(/\/$/, '');

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MIME = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg' };
const pendingSyncByScreen = new Map();

function isVideoFile(filename) {
    return /\.(mp4|webm|ogg)$/i.test(filename || '');
}

function listLocalVideos(screenId) {
    const folderPath = path.join(VIDEOS_DIR, screenId);
    return fs.promises.readdir(folderPath)
        .then(files => files.filter(isVideoFile).sort())
        .catch(() => []);
}

async function fetchRemotePlaylist(screenId) {
    if (!REMOTE_VIDEO_SERVER_URL) {
        throw new Error('REMOTE_VIDEO_SERVER_URL no está configurado');
    }

    const url = `${REMOTE_VIDEO_SERVER_URL}/api/videos/${screenId}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`No se pudo obtener playlist remota (${res.status})`);
    }

    const data = await res.json();
    return (data.videos || []).filter(isVideoFile).sort();
}

async function downloadRemoteVideo(screenId, filename) {
    const safeFilename = path.basename(filename);
    const targetDir = path.join(VIDEOS_DIR, screenId);
    const targetPath = path.join(targetDir, safeFilename);
    const tempPath = `${targetPath}.part`;

    try {
        await fs.promises.access(targetPath, fs.constants.F_OK);
        return false;
    } catch (_) {
        // Archivo no existe, se descarga.
    }

    await fs.promises.mkdir(targetDir, { recursive: true });

    const sourceUrl = `${REMOTE_VIDEO_SERVER_URL}/videos/${screenId}/${encodeURIComponent(safeFilename)}`;
    const res = await fetch(sourceUrl);
    if (!res.ok || !res.body) {
        throw new Error(`No se pudo descargar ${safeFilename} (${res.status})`);
    }

    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tempPath));
    await fs.promises.rename(tempPath, targetPath);
    return true;
}

async function removeLocalVideosNotInList(screenId, remoteVideos) {
    const targetDir = path.join(VIDEOS_DIR, screenId);
    const remoteSet = new Set(remoteVideos.map(name => path.basename(name)));
    let removed = 0;

    let localFiles = [];
    try {
        localFiles = await fs.promises.readdir(targetDir);
    } catch (_) {
        return removed;
    }

    for (const filename of localFiles) {
        if (!isVideoFile(filename)) continue;
        if (remoteSet.has(filename)) continue;
        await fs.promises.unlink(path.join(targetDir, filename));
        removed += 1;
    }

    return removed;
}

async function syncScreenVideos(screenId) {
    if (pendingSyncByScreen.has(screenId)) {
        return pendingSyncByScreen.get(screenId);
    }

    const syncPromise = (async () => {
        const remoteVideos = await fetchRemotePlaylist(screenId);
        let downloaded = 0;
        for (const filename of remoteVideos) {
            const wasDownloaded = await downloadRemoteVideo(screenId, filename);
            if (wasDownloaded) downloaded += 1;
        }

        const removed = await removeLocalVideosNotInList(screenId, remoteVideos);

        const videos = await listLocalVideos(screenId);
        return { screenId, videos, downloaded, removed };
    })();

    pendingSyncByScreen.set(screenId, syncPromise);

    try {
        return await syncPromise;
    } finally {
        pendingSyncByScreen.delete(screenId);
    }
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'x-file-name, content-type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'GET' && req.method !== 'POST') { res.writeHead(405); res.end(); return; }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const parts = url.pathname.split('/').filter(Boolean);

    // POST /api/upload/:screenId  → recibe stream de video directamente
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'upload' && parts[2]) {
        const screenId = parts[2];
        if (!GUID_RE.test(screenId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'screenId inválido' }));
            return;
        }

        const encodedFilename = req.headers['x-file-name'] || 'video.mp4';
        const safeOriginalName = decodeURIComponent(encodedFilename).replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${Date.now()}-${safeOriginalName}`;
        const targetDir = path.join(VIDEOS_DIR, screenId);

        try {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            const targetPath = path.join(targetDir, filename);
            const writeStream = fs.createWriteStream(targetPath);

            req.pipe(writeStream);

            req.on('end', () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename: `${screenId}/${filename}` }));
            });

            req.on('error', (err) => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error recibiendo archivo' }));
            });
            
            writeStream.on('error', (err) => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error guardando archivo' }));
            });
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // GET /api/cache/:screenId  → sincroniza remoto -> local y devuelve playlist local
    if (parts[0] === 'api' && parts[1] === 'cache' && parts[2]) {
        const screenId = parts[2];
        if (!GUID_RE.test(screenId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'screenId inválido' }));
            return;
        }

        if (!REMOTE_VIDEO_SERVER_URL) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'REMOTE_VIDEO_SERVER_URL no configurado', videos: [] }));
            return;
        }

        syncScreenVideos(screenId)
            .then(result => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            })
            .catch(err => {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error sincronizando videos', detail: err.message, videos: [] }));
            });
        return;
    }

    // GET /api/videos/:screenId  →  lista de videos de esa pantalla desde el portal
    if (parts[0] === 'api' && parts[1] === 'videos' && parts[2]) {
        const screenId = parts[2];
        if (!GUID_RE.test(screenId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'screenId inválido' }));
            return;
        }
        
        // Consultar el Portal para obtener la lista de videos de la pantalla
        const portalUrl = process.env.PORTAL_URL || 'http://portal:3000';
        fetch(`${portalUrl}/api/public/screens/${screenId}/videos`)
            .then(portalRes => portalRes.json())
            .then(data => {
                const videos = data.videos || [];
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ screenId, videos }));
            })
            .catch(err => {
                console.error(`Error fetching videos for screen ${screenId} from portal:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error interno obteniendo videos', videos: [] }));
            });
        
        return;
    }

    // GET /videos/:screenId/:filename  →  stream del archivo (ignora screenId y usa pool)
    if (parts[0] === 'videos' && parts[1] && parts[2]) {
        const screenId = parts[1];
        const filename = path.basename(parts[2]); // basename evita path traversal
        if (!GUID_RE.test(screenId)) {
            res.writeHead(400); res.end('screenId inválido'); return;
        }
        // TODOS los videos ahora están en la carpeta 'pool'
        const filePath = path.join(VIDEOS_DIR, 'pool', filename);
        fs.stat(filePath, (err, stat) => {
            if (err) { res.writeHead(404); res.end('No encontrado'); return; }
            const ext = path.extname(filename).toLowerCase();
            const mime = MIME[ext] || 'application/octet-stream';
            const range = req.headers.range;
            if (range) {
                const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
                const start = parseInt(startStr, 10);
                const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': end - start + 1,
                    'Content-Type': mime
                });
                fs.createReadStream(filePath, { start, end }).pipe(res);
            } else {
                res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': mime, 'Accept-Ranges': 'bytes' });
                fs.createReadStream(filePath).pipe(res);
            }
        });
        return;
    }

    res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`Servidor de videos iniciado en el puerto ${PORT}`);
    console.log(`Videos dir: ${VIDEOS_DIR}`);
    console.log(`Remote video source: ${REMOTE_VIDEO_SERVER_URL || 'deshabilitado'}`);
});
