/* ============================================================
   Licencia de pago: habla con el backend (backend/worker.js) para
   validar un código y descargar el contenido real del juego (las 5
   paradas), que no vive en este repositorio público.
   ============================================================ */

const License = (() => {
  const WORKER_URL = "https://taberns.supermoncho.workers.dev";

  const DEVICE_KEY = "tabernas_device_id";
  const STAGES_CACHE_KEY = "tabernas_stages_v1";
  const STAGES_LANG_KEY = "tabernas_stages_lang";
  const CODE_KEY = "tabernas_license_code";

  /* Identificador estable de este móvil/navegador — es lo que ata un
     código a "un dispositivo" tal como se pidió. Sobrevive a cerrar la
     app; se pierde si el usuario borra datos del navegador. */
  function deviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function cachedStages() {
    try {
      const raw = localStorage.getItem(STAGES_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function isUnlocked() {
    return !!cachedStages();
  }

  function currentCode() {
    return localStorage.getItem(CODE_KEY) || "";
  }

  /* Valida el código contra el backend y descarga las 5 paradas en el
     idioma pedido (por defecto, el idioma activo de la app). Se cachean
     junto al idioma en que se pidieron — a partir de ahí el juego
     funciona offline igual que antes, ya no hace falta volver a llamar
     al servidor salvo que el jugador cambie de idioma (ver
     refreshLanguage). */
  async function redeem(rawCode, lang) {
    const code = (rawCode || "").trim().toUpperCase();
    if (!code) throw new Error(I18N.t("license_error_empty"));
    const targetLang = lang || I18N.getLang() || "es";

    let res;
    try {
      res = await fetch(`${WORKER_URL}/api/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, deviceId: deviceId(), lang: targetLang }),
      });
    } catch (e) {
      throw new Error(I18N.t("license_error_noconn"));
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || I18N.t("license_error_invalid"));
    }

    localStorage.setItem(STAGES_CACHE_KEY, JSON.stringify(data.stages));
    localStorage.setItem(CODE_KEY, code);
    localStorage.setItem(STAGES_LANG_KEY, targetLang);
    return data.stages;
  }

  /* Si el jugador ya tiene licencia activa pero cambia de idioma desde
     el título, se vuelve a pedir el contenido en el nuevo idioma sin
     gastar la activación (el backend lo permite: mismo código+
     dispositivo). Si algo falla (sin red, por ejemplo), se mantiene el
     contenido cacheado tal cual estaba. */
  function cachedLang() {
    return localStorage.getItem(STAGES_LANG_KEY) || "es";
  }

  async function refreshLanguage(lang) {
    if (!isUnlocked() || cachedLang() === lang) return false;
    try {
      await redeem(currentCode(), lang);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Inicia el pago: pide al backend una sesión de Stripe Checkout y
     redirige al comprador allí. */
  async function startCheckout() {
    let res;
    try {
      res = await fetch(`${WORKER_URL}/api/checkout`, { method: "POST" });
    } catch (e) {
      throw new Error(I18N.t("license_error_checkout_conn"));
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      throw new Error(data.error || I18N.t("license_error_checkout_failed"));
    }
    location.href = data.url;
  }

  /* Envía el resultado de la partida al ranking (POST /api/leaderboard/
     submit). El backend valida que el código+dispositivo pertenece a
     una licencia activa antes de guardar nada — no se puede falsear
     un tiempo sin tener una licencia real redimida en este móvil. */
  async function submitLeaderboard({ teamName, seconds, score, lang }) {
    const code = currentCode();
    if (!code) throw new Error(I18N.t("leaderboard_error_nolicense"));

    let res;
    try {
      res = await fetch(`${WORKER_URL}/api/leaderboard/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          deviceId: deviceId(),
          teamName,
          seconds,
          score,
          lang: lang || I18N.getLang() || "es",
        }),
      });
    } catch (e) {
      throw new Error(I18N.t("leaderboard_error_conn"));
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || I18N.t("leaderboard_error_conn"));
    return data; // { rank, total }
  }

  /* Trae el top N del ranking (GET /api/leaderboard/top). */
  async function fetchLeaderboardTop(limit = 10) {
    let res;
    try {
      res = await fetch(`${WORKER_URL}/api/leaderboard/top?limit=${limit}`);
    } catch (e) {
      throw new Error(I18N.t("leaderboard_error_conn"));
    }
    if (!res.ok) throw new Error(I18N.t("leaderboard_error_conn"));
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data.rows) ? data.rows : [];
  }

  /* Analítica: registra un evento puntual del equipo (POST /api/events/
     track), en plan "disparar y olvidar" — nunca bloquea la partida ni
     muestra un error si falla (sin red, licencia aún no activa, etc.).
     El backend valida código+dispositivo igual que en submitLeaderboard. */
  function trackEvent(eventType, eventData) {
    const code = currentCode();
    if (!code) return;
    fetch(`${WORKER_URL}/api/events/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        deviceId: deviceId(),
        eventType,
        eventData: eventData || {},
        lang: I18N.getLang() || "es",
      }),
    }).catch(() => {});
  }

  return {
    WORKER_URL,
    deviceId,
    cachedStages,
    cachedLang,
    isUnlocked,
    currentCode,
    redeem,
    refreshLanguage,
    startCheckout,
    submitLeaderboard,
    fetchLeaderboardTop,
    trackEvent,
  };
})();
