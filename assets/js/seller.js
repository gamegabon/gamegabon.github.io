(function(){
  if(!window.GGAPI){
    console.error("GGAPI missing");
    return;
  }

  function $(sel){ return document.querySelector(sel); }

  const form = $('#seller-form');
  const status = $('#status');
  if(!form) return;

  function setStatus(msg, kind){
    if(!status) return;
    status.className = kind ? ('note '+kind) : 'note';
    status.textContent = msg;
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    // Normalize
    payload.price = Number(payload.price || 0);
    payload.free = payload.price === 0;
    payload.platforms = [payload.platform].filter(Boolean);
    delete payload.platform;

    // Images: comma-separated urls
    payload.images = (payload.images || '')
      .split(',')
      .map(s=>s.trim())
      .filter(Boolean);

    // Basic validation
    if(!payload.email || !payload.username || !payload.password){
      setStatus("Email, nom d'utilisateur et mot de passe sont obligatoires.", "error");
      return;
    }
    if(!payload.name || !payload.download_url){
      setStatus("Nom du jeu et URL de téléchargement sont obligatoires.", "error");
      return;
    }

    setStatus("Envoi…");

    try{
      // Create (or reuse) user
      const userResp = await GGAPI.users.create({
        username: payload.username,
        email: payload.email,
        password: payload.password,
        first_name: payload.first_name || null,
        last_name: payload.last_name || null
      });

      const user = userResp.data || userResp;

      // Create game
      await GGAPI.games.create({
        name: payload.name,
        developer: payload.developer || payload.username,
        description: payload.description || "",
        price: payload.price,
        currency: "FCFA",
        genre: payload.genre || "",
        version: payload.version || "1.0.0",
        size: payload.size || "",
        platforms: payload.platforms,
        images: payload.images,
        free: payload.free,
        download_url: payload.download_url,
        seller_user_id: user.id
      });

      setStatus("✅ Jeu soumis ! Il apparaît maintenant dans la liste (si l’API est en ligne).");
      form.reset();
    } catch(err){
      console.error(err);
      setStatus("Erreur: " + err.message, "error");
    }
  });

})();