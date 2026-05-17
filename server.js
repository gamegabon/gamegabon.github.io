import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import WebTorrent from 'webtorrent';

// Recréation de __dirname indispensable pour le mode ESM (modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialisation du client de streaming
const torrentClient = new WebTorrent();

app.use(express.static(path.join(__dirname, 'public')));

// Convertit la taille des fichiers en chaînes lisibles
function formatSize(bytes) {
    const sizeInBytes = parseInt(bytes, 10);
    if (isNaN(sizeInBytes) || sizeInBytes === 0) return 'Taille inconnue';
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    return (sizeInBytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

// Endpoint de recherche ApiBay
app.get('/api/search', async (req, res) => {
    const query = req.query.query;
    if (!query) return res.status(400).json({ error: 'Query manquante' });

    try {
        const response = await axios.get(`https://apibay.org/q.php?q=${encodeURIComponent(query)}`, { timeout: 10000 });
        const data = response.data;

        if (!Array.isArray(data) || (data.length === 1 && data[0].id === '0')) {
            return res.json([]);
        }

        const formattedResults = data
            .filter(t => t.info_hash && t.info_hash !== '0000000000000000000000000000000000000000')
            .map(torrent => {
                const magnetLink = `magnet:?xt=urn:btih:${torrent.info_hash}&dn=${encodeURIComponent(torrent.name)}`;
                return {
                    title: torrent.name,
                    size: formatSize(torrent.size),
                    seeders: parseInt(torrent.seeders, 10) || 0,
                    leechers: parseInt(torrent.leechers, 10) || 0,
                    magnet: magnetLink
                };
            });

        formattedResults.sort((a, b) => b.seeders - a.seeders);
        res.json(formattedResults);
    } catch (error) {
        console.error('Erreur recherche:', error.message);
        res.json([]);
    }
});

// Endpoint de conversion Torrent -> Flux vidéo HTTP direct
app.get('/api/stream', (req, res) => {
    const magnet = req.query.magnet;
    if (!magnet) return res.status(400).send('Magnet link requis');

    let torrent = torrentClient.get(magnet);

    if (!torrent) {
        torrent = torrentClient.add(magnet, (t) => {
            handleVideoStreaming(t, req, res);
        });
        torrent.on('error', (err) => {
            console.error('Erreur WebTorrent:', err.message);
            if (!res.headersSent) res.status(500).send('Erreur lors du traitement du flux');
        });
    } else {
        if (torrent.ready) {
            handleVideoStreaming(torrent, req, res);
        } else {
            torrent.once('ready', () => handleVideoStreaming(torrent, req, res));
        }
    }
});

function handleVideoStreaming(torrent, req, res) {
    const file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.webm')) || torrent.files[0];

    if (!file) {
        return res.status(404).send('Aucun fichier vidéo trouvé dans ce torrent.');
    }

    let contentType = 'video/mp4';
    if (file.name.endsWith('.webm')) contentType = 'video/webm';
    if (file.name.endsWith('.mkv')) contentType = 'video/x-matroska';

    const total = file.length;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunksize = (end - start) + 1;

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType
        });

        const stream = file.createReadStream({ start, end });
        stream.pipe(res);
    } else {
        res.writeHead(200, {
            'Content-Length': total,
            'Content-Type': contentType
        });
        file.createReadStream().pipe(res);
    }
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` 🎬 Serveur StreamFlix V2 (ESM Mode) Actif !`);
    console.log(` Port de communication : ${PORT}`);
    console.log(`=======================================================`);
});
