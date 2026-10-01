/* ============================================================
   PUENTE tabernas.hiddenmadrid.com — Cloudflare Worker
   ============================================================
   Sirve el juego (alojado en GitHub Pages) bajo el SUBDOMINIO
   tabernas.hiddenmadrid.com, independiente de la raíz del dominio
   (que sigue sirviendo la web de Lovable sin verse afectada).

   Por qué un subdominio y no una subruta (hiddenmadrid.com/tabernas):
   Lovable exige que el registro DNS de la raíz de hiddenmadrid.com
   esté en modo "DNS only" (nube gris) para su propia verificación de
   dominio — y una Route de Worker solo intercepta tráfico en registros
   "Proxied" (nube naranja). Un subdominio tiene su PROPIO registro DNS,
   así que puede ir proxied sin tocar para nada la raíz ni la
   integración con Lovable.

   Este Worker NO toca el backend de licencias de Tabernas — es un
   Worker aparte, solo para servir los ficheros estáticos del juego
   bajo ese subdominio. El frontend sigue llamando directamente a la URL
   del Worker de licencias (js/license.js → WORKER_URL), como siempre.

   DESPLIEGUE:
     1. Cloudflare → DNS → Add record → Type: CNAME, Name: tabernas,
        Target: (cualquier valor válido, p.ej. el propio dominio
        tabernas.hiddenmadrid.com o "tabernas-proxy.workers.dev" si
        ya existe el Worker) → Proxy status: Proxied (nube naranja).
        [Si Cloudflare no deja guardar un CNAME así, usa un registro A
        con la IP ficticia 192.0.2.1 — solo hace falta que exista el
        registro y esté "Proxied" para que la Route lo intercepte;
        el Worker nunca llega a usar ese valor.]
     2. Cloudflare → Workers & Pages → Create → Create Worker.
     3. Nombre sugerido: "tabernas-proxy" → Deploy (con el código de
        ejemplo; luego lo sustituyes).
     4. Edit code → borra todo, pega este archivo entero → Save and deploy.
     5. En el propio Worker → Settings → Domains & Routes → Add →
        "Route": introduce   tabernas.hiddenmadrid.com/*
        (con el asterisco al final, sin espacios) y selecciona la zona
        hiddenmadrid.com. Guarda.
   ============================================================ */

const UPSTREAM_ORIGIN = "https://dgarciaesc.github.io";
const UPSTREAM_BASE_PATH = "/tabernas-madrid"; // ruta real del juego en GitHub Pages

export default {
  async fetch(request) {
    const url = new URL(request.url);

    const upstreamUrl = UPSTREAM_ORIGIN + UPSTREAM_BASE_PATH + url.pathname + url.search;

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
