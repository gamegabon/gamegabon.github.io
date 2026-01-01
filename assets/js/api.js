// API helper for GAMEGABON frontend (GitHub Pages compatible)
// Set API base by:
// 1) window.GAMEGABON_API_BASE = "https://your-api.onrender.com"
// OR 2) localStorage.setItem("GAMEGABON_API_BASE", "...")

(function(){
  const DEFAULT_BASE = "";
  function getBase(){
    return (window.GAMEGABON_API_BASE || localStorage.getItem("GAMEGABON_API_BASE") || DEFAULT_BASE).replace(/\/$/,'');
  }

  async function request(path, opts={}){
    const base = getBase();
    const url = (base ? base : "") + path;
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers||{});
    const res = await fetch(url, Object.assign({}, opts, { headers }));
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json().catch(()=>null) : await res.text().catch(()=>null);
    if(!res.ok){
      const msg = (data && data.message) ? data.message : ("HTTP " + res.status);
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  window.GGAPI = {
    getBase,
    setBase: (v)=> localStorage.setItem("GAMEGABON_API_BASE", v),
    games: {
      list: (q={})=>{
        const p = new URLSearchParams();
        if(q.search) p.set("search", q.search);
        if(q.genre) p.set("genre", q.genre);
        if(q.platform) p.set("platform", q.platform);
        if(q.free !== undefined) p.set("free", String(q.free));
        if(q.limit) p.set("limit", String(q.limit));
        if(q.offset) p.set("offset", String(q.offset));
        return request("/api/games?"+p.toString(), { method: "GET" });
      },
      get: (id)=> request("/api/games/"+encodeURIComponent(id), { method:"GET" }),
      create: (payload)=> request("/api/games", { method:"POST", body: JSON.stringify(payload) }),
    },
    users: {
      create: (payload)=> request("/api/users", { method:"POST", body: JSON.stringify(payload) }),
    },
    payments: {
      create: (payload)=> request("/api/payments", { method:"POST", body: JSON.stringify(payload) }),
      byUser: (userId)=> request("/api/payments/user/"+encodeURIComponent(userId), { method:"GET" }),
    }
  };
})();
