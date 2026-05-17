const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
// Railway attribue dynamiquement un port via process.env.PORT
const PORT = process.env.PORT || 3000;

// Servir les fichiers statiques du dossier public (où se trouve ton index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Liste optimisée de trackers publics pour accélérer la recherche de pairs (peers) sous WebTorrent
const TRACKERS = [
    'udp://tracker.coppersurfer.tk:6969/announce',
    'udp://tracker.openbittorrent.com:6969/announce',
    'udp://open.demonii.com:1337/announce',
    'udp://tracker.leechers-paradise.org:6969/announce',
    'udp://tracker.cyberia.is:6969/announce',
    'udp://p4p.arenabg.com:1337/announce',
    'udp://9.rarbg.to:2710/announce',
    'udp://9.rarbg.me:2710/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://tracker.torrent.eu.org:451/announce'
].map(tr => `&tr=${encodeURIComponent(tr)}`).join('');

// Formatage de la taille brute (bytes) renvoyée par ApiBay en chaînes lisibles (GB, MB)
function formatSize(bytes) {
    const sizeInBytes = parseInt(bytes, 10);
    if (isNaN(sizeInBytes) || sizeInBytes === 0) return 'Taille inconnue';
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    return (sizeInBytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

// Endpoint de recherche consommé par StreamFlix (index.html)
app.get('/api/search', async (req, res) => {
    const query = req.query.query;
    
    if (!query) {
        return res.status(400).json({ error: 'Le paramètre de recherche "query" est obligatoire.' });
    }

    try {
        // Requête vers l'API d'ApiBay (moteur de recherche lié à The Pirate Bay)
        const targetUrl = `https://apibay.org/q.php?q=${encodeURIComponent(query)}`;
        const response = await axios.get(targetUrl, { timeout: 10000 }); // Timeout de 10s pour éviter les blocages de requêtes suspendues
        
        const data = response.data;

        // Si l'API ne renvoie pas de tableau ou retourne un indicateur "aucun résultat" [{id: "0", ...}]
        if (!Array.isArray(data) || (data.length === 1 && data[0].id === '0')) {
            return res.json([]);
        }

        // Nettoyage et structuration des données reçues pour l'interface de streaming
        const formattedResults = data
            .filter(torrent => torrent.info_hash && torrent.info_hash !== '0000000000000000000000000000000000000000')
            .map(torrent => {
                // Construction du lien magnet universel requis par webtorrent.js
                const magnetLink = `magnet:?xt=urn:btih:${torrent.info_hash}&dn=${encodeURIComponent(torrent.name)}${TRACKERS}`;

                return {
                    title: torrent.name,
                    size: formatSize(torrent.size),
                    seeders: parseInt(torrent.seeders, 10) || 0,
                    leechers: parseInt(torrent.leechers, 10) || 0,
                    magnet: magnetLink
                };
            });

        // Tri automatique : les torrents avec le plus de seeders (meilleure vitesse de flux) en premier
        formattedResults.sort((a, b) => b.seeders - a.seeders);

        // Envoi des résultats nettoyés au frontend
        res.json(formattedResults);

    } catch (error) {
        console.error(`[Erreur API] Recherche impossible pour "${query}":`, error.message);
        // On renvoie un tableau vide plutôt qu'un crash de l'application pour une meilleure expérience utilisateur
        res.status(500).json({ error: 'Erreur lors de la récupération des flux P2P depuis la base de données.' });
    }
});

// Route globale de secours : renvoie vers l'interface StreamFlix pour toutes les autres requêtes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage de l'application
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` 🎬 Serveur StreamFlix démarré avec succès !`);
    console.log(` 🌐 URL locale : http://localhost:${PORT}`);
    console.log(` 🚀 Prêt pour le déploiement sur Railway`);
    console.log(`=======================================================`);
});
