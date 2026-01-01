# GAMEGABON — Marketplace de jeux (Frontend GitHub Pages + API Render)

Ce dépôt contient :
- **Frontend statique** (HTML/CSS/JS) → parfait pour **GitHub Pages**
- **API Node/Express + PostgreSQL** → déployable sur **Render** (ou Railway)

✅ Les anciennes **simulations (faux JSON / faux paiement)** ont été retirées :
- Le catalogue charge les jeux depuis **/api/games**
- La page “Devenir vendeur” crée un compte + publie un jeu via **/api/users** et **/api/games**
- L’achat crée une commande via **/api/payments** (workflow **manuel** pour l’instant)

---

## 1) Frontend (GitHub Pages)

Ouvre `index.html` / `games.html`.

Sur GitHub Pages, tu dois configurer l’URL de l’API :
- Sur le site, un bandeau “⚙️ API non configurée” s’affiche.
- Clique **Configurer** → colle ton URL Render (ex: `https://gamegabon-api.onrender.com`)
- L’URL est sauvegardée dans `localStorage`.

---

## 2) API (Node + PostgreSQL)

### Prérequis
- Node.js 18+
- Une base PostgreSQL (Render Postgres ou local)

### Lancer en local
```bash
npm install
export DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DBNAME"
npm run start
# API: http://localhost:5000/api/health
```

Au démarrage, l’API crée automatiquement les tables (`users`, `games`, `payments`) si elles n’existent pas.

---

## 3) Déploiement Render (recommandé)

1) **Create PostgreSQL** sur Render → récupère `DATABASE_URL`
2) **Create Web Service** (Node) depuis ce repo
3) Variables d’environnement :
- `DATABASE_URL` = valeur Render
4) Commande :
- Build: `npm install`
- Start: `npm start`

Ensuite colle l’URL de ton service Render dans le bandeau du frontend.

---

## Endpoints utiles

- `GET /api/games?search=&genre=&platform=&free=true|false`
- `GET /api/games/:id`
- `POST /api/games`
- `POST /api/users`
- `POST /api/payments`
- `GET /api/payments/user/:userId`

---

## Notes “paiement”
Pour l’instant, `/api/payments` crée une **référence** et le paiement est **manuel** (Airtel/Moov/espèces).
Prochaine étape : intégrer un vrai PSP / Mobile Money + confirmation automatique.

Licence : MIT
