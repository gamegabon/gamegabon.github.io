// Client-side renderer for games.html and game.html using the real API (GGAPI)
(async function(){
  if(!window.GGAPI){
    console.error("GGAPI missing. Did you include assets/js/api.js?");
    return;
  }

  function el(tag, attrs={}, children=[]){
    const e = document.createElement(tag);
    for(const k in attrs) {
      if(k === 'class') e.className = attrs[k];
      else if(k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (Array.isArray(children)?children:[children]).forEach(c => {
      if(!c) return;
      e.append(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function money(x, currency){
    if(x === null || x === undefined) return '';
    const n = Number(x);
    if(Number.isNaN(n)) return String(x);
    return n.toLocaleString('fr-FR') + ' ' + (currency || 'FCFA');
  }

  function getQuery(){
    const params = new URLSearchParams(location.search);
    return Object.fromEntries(params.entries());
  }

  // Small banner to help set API base on GitHub Pages
  function ensureApiBaseBanner(){
    const base = GGAPI.getBase();
    if(base) return;
    const b = el('div',{class:'api-banner'},[
      el('div',{class:'container'},[
        el('strong',{},['⚙️ API non configurée — ']),
        el('span',{},['définis l’URL de ton backend Render. ']),
        el('button',{class:'btn',id:'set-api-btn',type:'button'},['Configurer'])
      ])
    ]);
    document.body.prepend(b);
    document.getElementById('set-api-btn').addEventListener('click', ()=>{
      const v = prompt("Colle l’URL de ton API (ex: https://gamegabon-api.onrender.com)");
      if(v){ GGAPI.setBase(v.trim()); location.reload(); }
    });
  }

  ensureApiBaseBanner();

  const gamesListEl = document.getElementById('games-list');
  const gameDetailEl = document.getElementById('game-detail');
  const filtersEl = document.getElementById('filters');

  async function renderGamesPage(){
    if(!gamesListEl) return;

    // Filters (optional)
    const q = getQuery();
    const search = q.search || "";
    const genre = q.genre || "";
    const platform = q.platform || "";
    const free = q.free;
    const freeBool = (free === "true") ? true : (free === "false") ? false : undefined;

    // Build filter UI if exists
    if(filtersEl){
      const searchInput = el('input',{class:'input',type:'search',placeholder:'Rechercher…',value:search,id:'filter-search'});
      const genreInput = el('input',{class:'input',type:'text',placeholder:'Genre (ex: Action)',value:genre,id:'filter-genre'});
      const platformInput = el('input',{class:'input',type:'text',placeholder:'Plateforme (ex: Android)',value:platform,id:'filter-platform'});
      const freeSelect = el('select',{class:'input',id:'filter-free'},[
        el('option',{value:''},['Tous']),
        el('option',{value:'true'},['Gratuits']),
        el('option',{value:'false'},['Payants']),
      ]);
      freeSelect.value = free ?? '';

      const apply = el('button',{class:'btn',type:'button'},['Filtrer']);
      apply.addEventListener('click', ()=>{
        const p = new URLSearchParams();
        const s = searchInput.value.trim(); if(s) p.set('search', s);
        const g = genreInput.value.trim(); if(g) p.set('genre', g);
        const pl = platformInput.value.trim(); if(pl) p.set('platform', pl);
        const fr = freeSelect.value; if(fr) p.set('free', fr);
        location.search = p.toString();
      });

      filtersEl.innerHTML = '';
      filtersEl.appendChild(el('div',{class:'filters-row'},[searchInput, genreInput, platformInput, freeSelect, apply]));
    }

    gamesListEl.innerHTML = '<p class="muted">Chargement…</p>';

    try{
      const resp = await GGAPI.games.list({ search, genre, platform, free: freeBool, limit: 60, offset: 0 });
      const games = resp.data || resp.rows || resp || [];
      if(!Array.isArray(games) || games.length===0){
        gamesListEl.innerHTML = '<p class="muted">Aucun jeu trouvé.</p>';
        return;
      }

      gamesListEl.innerHTML = '';
      games.forEach(g=>{
        const cover = (g.images && g.images[0]) ? g.images[0] : (g.cover_url || 'assets/img/cover-fallback.svg');
        const priceText = (g.free || Number(g.price)===0) ? 'Gratuit' : money(g.price, g.currency);
        const card = el('article',{class:'game-card'},[
          el('a',{href:`game.html?id=${encodeURIComponent(g.id)}`},[
            el('img',{src:cover,alt:g.name || 'Jeu'}),
            el('div',{class:'game-card-body'},[
              el('h3',{},[g.name || 'Sans titre']),
              el('p',{class:'muted'},[(g.developer || 'Studio inconnu') + ' • ' + (g.genre || 'Genre')]),
              el('p',{class:'price'},[priceText]),
            ])
          ])
        ]);
        gamesListEl.appendChild(card);
      });
    } catch(err){
      console.error(err);
      gamesListEl.innerHTML = `<p class="error">Erreur: ${err.message}. Vérifie l’API.</p>`;
    }
  }

  async function renderGameDetail(){
    if(!gameDetailEl) return;
    const q = getQuery();
    const id = q.id;
    if(!id){
      gameDetailEl.innerHTML = '<p class="error">ID du jeu manquant.</p>';
      return;
    }

    gameDetailEl.innerHTML = '<p class="muted">Chargement…</p>';

    try{
      const resp = await GGAPI.games.get(id);
      const g = resp.data || resp;
      if(!g){
        gameDetailEl.innerHTML = '<p class="error">Jeu introuvable.</p>';
        return;
      }

      const images = (g.images && Array.isArray(g.images) && g.images.length) ? g.images : [g.cover_url || 'assets/img/cover-fallback.svg'];
      const gallery = el('div',{class:'gallery'}, images.map(u => el('img',{src:u,alt:g.name||'jeu'})));

      const priceText = (g.free || Number(g.price)===0) ? 'Gratuit' : money(g.price, g.currency);
      const info = el('div',{class:'game-info'},[
        el('h2',{},[g.name || 'Sans titre']),
        el('p',{class:'muted'},[(g.developer || 'Studio') + ' • ' + (g.genre || 'Genre')]),
        el('p',{},[g.description || '']),
        el('ul',{class:'meta'},[
          el('li',{},['Version: ' + (g.version || '—')]),
          el('li',{},['Taille: ' + (g.size || '—')]),
          el('li',{},['Plateformes: ' + ((g.platforms && g.platforms.join) ? g.platforms.join(', ') : (g.platforms||'—'))]),
          el('li',{},['Prix: ' + priceText]),
        ]),
      ]);

      // Download / Purchase
      const downloadUrl = g.download_url || g.downloadUrl;
      if(downloadUrl){
        if(g.free || Number(g.price)===0){
          info.appendChild(el('a',{class:'btn',href:downloadUrl,target:'_blank',rel:'noopener'},['⬇️ Télécharger']));
        } else {
          const payBtn = el('button',{class:'btn',type:'button'},['💳 Acheter']);
          payBtn.addEventListener('click', async ()=>{
            const email = prompt("Ton email (pour retrouver ton achat) :");
            if(!email) return;
            try{
              const payment = await GGAPI.payments.create({
                email,
                game_id: g.id,
                amount: Number(g.price),
                currency: g.currency || 'FCFA',
                method: 'manual',
              });
              alert("Commande créée ✅\n\n" +
                    "Référence: " + (payment.data?.reference || payment.reference || '—') + "\n" +
                    "Tu recevras les instructions de paiement / livraison par email (mode manuel).");
            } catch(e){
              alert("Erreur paiement: " + e.message);
            }
          });
          info.appendChild(payBtn);
          info.appendChild(el('p',{class:'small'},['Paiement en mode manuel (Airtel/Moov/espèces) — l’équipe valide ensuite et envoie le lien.']));
        }
      } else {
        info.appendChild(el('p',{class:'small'},['Téléchargement indisponible pour le moment.']));
      }

      gameDetailEl.innerHTML = '';
      gameDetailEl.appendChild(gallery);
      gameDetailEl.appendChild(info);
    } catch(err){
      console.error(err);
      gameDetailEl.innerHTML = `<p class="error">Erreur: ${err.message}</p>`;
    }
  }

  await renderGamesPage();
  await renderGameDetail();
})();
