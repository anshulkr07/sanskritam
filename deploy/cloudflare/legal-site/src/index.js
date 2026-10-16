// Legal-site edge proxy for sanskritam.vedicvalor.com.
//
// The real content lives on the backend (app/routers/legal.py). This worker
// forwards only the two Play-required pages and renders a tiny landing at /.

const ORIGIN = "https://shabd-api-829757572630.asia-south1.run.app";
const ALLOWED = new Set(["/privacy", "/delete-account", "/commerce/terms"]);

// The zone has no "Always Use HTTPS" toggle reachable with our token, so the
// worker enforces it at the edge: any plain-http request is 301'd to https.
// HSTS then keeps browsers on https for repeat visits.
const HSTS = "max-age=31536000; includeSubDomains";

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "strict-transport-security": HSTS,
    },
  });
}

const LANDING = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sanskritam — Legal</title>
<style>body{margin:0;background:#FFF8EE;color:#2B2118;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:44rem;margin:0 auto;padding:4rem 1.25rem}h1{font-size:1.9rem;margin:0 0 .5rem}
a{color:#B5441A;display:block;margin:.5rem 0;font-size:1.1rem}</style>
</head><body><main>
<h1>Sanskritam</h1>
<p>Legal information for the Sanskritam app.</p>
<a href="/privacy">Privacy Policy</a>
<a href="/delete-account">Delete your account</a>
<a href="/commerce/terms">Memberships, credits and purchase terms</a>
</main></body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Force HTTPS. Prefer x-forwarded-proto (Cloudflare sets it) so the check
    // is correct behind the edge and locally testable.
    const proto = (request.headers.get("x-forwarded-proto") || url.protocol)
      .replace(":", "");
    if (proto === "http") {
      const secure = new URL(request.url);
      secure.protocol = "https:";
      return Response.redirect(secure.toString(), 301);
    }

    if (url.pathname === "/") {
      return html(LANDING);
    }

    if (!ALLOWED.has(url.pathname)) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "strict-transport-security": HSTS,
        },
      });
    }

    const upstream = await fetch(ORIGIN + url.pathname, {
      method: "GET",
      headers: { "user-agent": "sanskritam-legal-worker" },
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "strict-transport-security": HSTS,
      },
    });
  },
};
