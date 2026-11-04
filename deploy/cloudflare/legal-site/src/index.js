// Sanskritam homepage and legal-site edge proxy at sanskritam.vedicvalor.com.
//
// The real content lives on the backend (app/routers/legal.py). This worker
// forwards the two Play-required pages; the homepage and its files are static.

const ORIGIN = "https://shabd-api-829757572630.asia-south1.run.app";
const ALLOWED = new Set(["/privacy", "/delete-account"]);

// The zone has no "Always Use HTTPS" toggle reachable with our token, so the
// worker enforces it at the edge: any plain-http request is 301'd to https.
// HSTS then keeps browsers on https for repeat visits.
const HSTS = "max-age=31536000; includeSubDomains";

export default {
  async fetch(request, env) {
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

    if (url.pathname === "/" || url.pathname === "/index.html" ||
        url.pathname === "/robots.txt" || url.pathname === "/app-ads.txt" || url.pathname.startsWith("/assets/")) {
      const asset = await env.ASSETS.fetch(request);
      const response = new Response(asset.body, asset);
      response.headers.set("strict-transport-security", HSTS);
      if (url.pathname === "/app-ads.txt") {
        response.headers.set("content-type", "text/plain; charset=utf-8");
        response.headers.set("cache-control", "public, max-age=300");
      }
      return response;
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
