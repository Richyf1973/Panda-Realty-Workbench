/**
 * Browser-side adapter injected ahead of the Property Sale Timeline page.
 *
 * The timeline was first built as a Claude artifact and talks to storage through
 * `window.claude.use("db" | "user" | "downloads" | "mcp")`. This adapter provides the
 * same small surface, backed by the app's own API (`/api/admin/sale-timeline/docs`),
 * so the timeline code runs unchanged inside Panda Realty.
 *
 *  - db: `collection(name).doc(id?).set/delete`, `collection(name).onSnapshot`,
 *        `doc("collection/id").set/onSnapshot` (polled every 15 s, and after each write)
 *  - user: always allowed to write (the page is behind the admin login)
 *  - downloads: saves files through the browser
 *  - mcp: not connected, so the timeline shows its copy-and-paste email flow
 */
export const SALE_TIMELINE_SHIM = String.raw`<script>
(function(){
  var API = "/api/admin/sale-timeline/docs";
  var listeners = [];
  function newId(){ return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/-/g,""); }
  async function call(method, query, body){
    var res = await fetch(API + (query ? "?" + query : ""), {
      method: method, credentials: "same-origin",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok){ var e = new Error("Save failed (" + res.status + ")"); e.code = res.status === 401 ? "revoked" : "failed"; throw e; }
    return res.status === 204 ? null : res.json();
  }
  function refreshAll(){ listeners.forEach(function(l){ l(); }); }
  function docRef(collection, id){
    return {
      id: id,
      set: async function(data){ await call("PUT", "", { collection: collection, id: id, data: data }); setTimeout(refreshAll, 50); },
      delete: async function(){ await call("DELETE", "collection=" + encodeURIComponent(collection) + "&id=" + encodeURIComponent(id)); setTimeout(refreshAll, 50); },
      onSnapshot: function(cb, onErr){
        async function load(){
          try {
            var r = await call("GET", "collection=" + encodeURIComponent(collection) + "&id=" + encodeURIComponent(id));
            var d = r && r.data;
            cb({ exists: d != null, data: function(){ return d; } });
          } catch(e){ if (onErr) onErr(e); }
        }
        listeners.push(load); load();
        var t = setInterval(load, 15000);
        return function(){ clearInterval(t); };
      }
    };
  }
  var db = {
    doc: function(path){ var p = String(path).split("/"); return docRef(p[0], p[1]); },
    collection: function(name){
      return {
        doc: function(id){ return docRef(name, id || newId()); },
        onSnapshot: function(cb, onErr){
          async function load(){
            try {
              var r = await call("GET", "collection=" + encodeURIComponent(name));
              var docs = (r && r.docs || []).map(function(x){ return { id: x.id, data: function(){ return x.data; } }; });
              cb({ docs: docs });
            } catch(e){ if (onErr) onErr(e); }
          }
          listeners.push(load); load();
          var t = setInterval(load, 15000);
          return function(){ clearInterval(t); };
        }
      };
    }
  };
  var user = { can: async function(){ return true; } };
  var downloads = {
    save: async function(o){
      var blob = o.data instanceof ArrayBuffer ? new Blob([o.data], { type: "application/pdf" })
               : new Blob([o.data], { type: "text/html" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = o.filename || "download";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
    }
  };
  window.claude = { use: async function(cap){
    if (cap === "db") return db;
    if (cap === "user") return user;
    if (cap === "downloads") return downloads;
    return null;
  } };
})();
</script>`
