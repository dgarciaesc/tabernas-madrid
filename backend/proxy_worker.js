/* ============================================================
   PUENTE /tabernas — Cloudflare Worker
   ============================================================
   Sirve el juego (alojado en GitHub Pages) bajo la ruta
   hiddenmadrid.com/tabernas, mientras el resto del dominio
   (la raíz, y también /goldenage) sigue sirviendo lo que ya
   sirven sin verse afectados.

   Este Worker NO toca el backend de licencias de Tabernas — es un
   Worker aparte, solo para servir los ficheros estáticos del juego
   bajo esa ruta. El frontend sigue llamando directamente a la URL
   del Worker de licencias (js/license.js → WORKER_URL), como
   siempre.

   DESPLIEGUE:
     1. Cloudflare → Workers & Pages → Create → Create Worker.
     2. Nombre sugerido: "tabernas-proxy" → Deploy (con el código de
        ejemplo; luego lo sustituyes).
     3. Edit code → borra todo, pega este archivo entero → Save and deploy.
     4. En el propio Worker → Settings → Domains & Routes → Add →
        "Route": introduce   hiddenmadrid.com/tabernas*
        (con el asterisco al final, sin espacios) y selecciona la zona
        hiddenmadrid.com. Guarda.

   IMPORTANTE — requisito de DNS:
     Esta ruta SOLO intercepta el tráfico si el registro DNS de
     hiddenmadrid.com en Cloudflare está "Proxied" (nube naranja).
     Como la raíz ya cuelga de un dominio personalizado de Cloudflare
     Pages (ver proxy_worker.js del otro juego), esto ya se cumple:
     no hace falta tocar nada de DNS para este paso.
   ============================================================ */

const UPSTREAM_ORIGIN = "https://dgarciaesc.github.io";
const UPSTREAM_BASE_PATH = "/tabernas-madrid"; // ruta real del juego en GitHub Pages
const PUBLIC_PREFIX = "/tabernas"; // ruta pública bajo hiddenmadrid.com

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Redirección con barra final: /tabernas -> /tabernas/
    // (necesario para que las rutas relativas del juego, tipo
    // "js/app.js", resuelvan bien contra /tabernas/js/app.js).
    if (url.pathname === PUBLIC_PREFIX) {
      const redirectUrl = new URL(url);
      redirectUrl.pathname = PUBLIC_PREFIX + "/";
      return Response.redirect(redirectUrl.toString(), 301);
    }

    const rest = url.pathname.startsWith(PUBLIC_PREFIX)
      ? url.pathname.slice(PUBLIC_PREFIX.length)
      : url.pathname;

    const upstreamUrl = UPSTREAM_ORIGIN + UPSTREAM_BASE_PATH + rest + url.search;

    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "follow",
    });

    const response = await fetch(upstreamRequest);

    const headers = new Headers(response.headers);
    headers.delete("content-security-policy"); // por si GitHub Pages la fija y choca con el dominio nuevo

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
