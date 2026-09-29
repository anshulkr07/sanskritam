// src/index.js
var ORIGIN = "https://shabd-api-829757572630.asia-south1.run.app";
var ALLOWED = /* @__PURE__ */ new Set(["/privacy", "/delete-account"]);
var LANDING = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sanskritam \u2014 Legal</title>
<style>body{margin:0;background:#FFF8EE;color:#2B2118;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:44rem;margin:0 auto;padding:4rem 1.25rem}h1{font-size:1.9rem;margin:0 0 .5rem}
a{color:#B5441A;display:block;margin:.5rem 0;font-size:1.1rem}</style>
</head><body><main>
<h1>Sanskritam</h1>
<p>Legal information for the Sanskritam app.</p>
<a href="/privacy">Privacy Policy</a>
<a href="/delete-account">Delete your account</a>
</main></body></html>`;
var index_default = {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response(LANDING, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
    if (!ALLOWED.has(url.pathname)) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }
    const upstream = await fetch(ORIGIN + url.pathname, {
      method: "GET",
      headers: { "user-agent": "sanskritam-legal-worker" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "text/html; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
