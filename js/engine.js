/* ============================================================
   Motor del juego: validación, pistas progresivas, estado
   ============================================================ */

const Engine = (() => {
  const SAVE_KEY = "tabernas_madrid_v1";

  /* --- Normalización de respuestas (regla 3 de la espec.) ---
     Ignora mayúsculas, tildes, puntuación y separadores. */
  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // tildes y diéresis (ñ → n)
      .replace(/[^a-z0-9]/g, ""); // fuera espacios, guiones, puntuación
  }

  function checkAnswer(input, stage) {
    const norm = normalize(input);
    if (!norm) return false;
    if (norm === normalize(stage.answer)) return true;
    return stage.acceptedAnswers.some((a) => normalize(a) === norm);
  }

  /* La prueba de Google se valida por palabras clave (calle + número) */
  function checkGoogleAnswer(input, transition) {
    const norm = normalize(input);
    if (!norm) return false;
    return transition.acceptedKeywords.every((kw) => norm.includes(normalize(kw)));
  }

  /* --- Estado --- */
  function freshState() {
    return {
      screen: "title", // title | prologue | stage | google | transition | victory
      stageIndex: 0,
      attempts: 0, // fallos en el enigma actual
      hintUsed: false, // pista sutil pedida voluntariamente en la prueba actual
      googleAttempts: 0,
      stageEnteredAt: null, // cronómetro de la prueba en curso
      score: 0,
      startedAt: null,
      finishedAt: null,
      stageLog: [], // {id, attempts, revealed, hintUsed, points}
      leaderboardSubmitted: false, // ya se envió este resultado al ranking
      teamName: "", // nombre de equipo, se pide una vez y se reutiliza
      victoryTracked: false, // evita duplicar el evento "game_finished" si se revisita la pantalla
    };
  }

  /* Objeto único mutado en sitio: la UI conserva una referencia viva */
  const state = freshState();

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      /* modo incógnito: se juega sin guardado */
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data.stageIndex === "number") {
          Object.assign(state, freshState(), data);
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function reset() {
    const fresh = freshState();
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh);
    clearPhotos();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
  }

  function currentStage() {
    return GAME_DATA.stages[state.stageIndex];
  }

  /* --- Resolución de una etapa --- */
  function stagePoints(attempts, revealed, hintUsed) {
    let pts = SCORING.stageBase - attempts * SCORING.failPenalty;
    if (revealed) pts -= SCORING.revealPenalty;
    if (hintUsed) pts -= SCORING.hintCost;
    return Math.max(pts, 100); // resolver siempre suma algo
  }

  /* Pide la pista sutil de forma voluntaria, antes de fallar el enigma
     (regla nueva: la pista ya no es gratis). Idempotente — pedirla dos
     veces no cobra dos veces. Devuelve true si se acaba de activar. */
  function useHint() {
    if (state.hintUsed) return false;
    state.hintUsed = true;
    save();
    return true;
  }

  function completeStage(revealed) {
    const stage = currentStage();
    let pts = stagePoints(state.attempts, revealed, state.hintUsed);
    const seconds = state.stageEnteredAt
      ? Math.round((Date.now() - state.stageEnteredAt) / 1000)
      : null;
    // Bonus de celeridad: resuelta a la primera en menos de 2 minutos,
    // sin pistas de pago
    let bonus = 0;
    if (!revealed && state.attempts === 0 && !state.hintUsed && seconds !== null && seconds <= 120) {
      bonus = SCORING.speedBonus;
      pts += bonus;
    }
    state.score += pts;
    state.stageLog.push({
      id: stage.id,
      title: stage.title,
      attempts: state.attempts,
      revealed: !!revealed,
      hintUsed: !!state.hintUsed,
      points: pts,
      seconds,
      bonus,
    });
    state.attempts = 0;
    state.hintUsed = false;
    state.stageEnteredAt = null;
    save();
    return pts;
  }

  function completeGoogle(revealed) {
    let pts = SCORING.googleBase - state.googleAttempts * SCORING.failPenalty;
    if (revealed) pts -= SCORING.revealPenalty;
    pts = Math.max(pts, 50);
    state.score += pts;
    state.googleAttempts = 0;
    save();
    return pts;
  }

  function advanceStage() {
    if (state.stageIndex < GAME_DATA.stages.length - 1) {
      state.stageIndex++;
      state.attempts = 0;
      save();
      return true;
    }
    state.finishedAt = Date.now();
    save();
    return false; // era la última: victoria
  }

  /* --- Geolocalización: distancia haversine en metros --- */
  function distanceMeters(a, b) {
    const R = 6371000;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* --- Proyección sobre un mapa histórico georreferenciado ---
     Convierte lat/lng real en una posición porcentual (0-100) dentro de
     la imagen, vía la transformación afín calibrada en data.js. Se deja
     un margen para que el punto nunca caiga pegado al borde ni fuera de
     la imagen, aunque el usuario esté lejos de la zona calibrada. */
  function projectToMap(coords, georef) {
    const x = georef.a * coords.lat + georef.b * coords.lng + georef.c;
    const y = georef.d * coords.lat + georef.e * coords.lng + georef.f;
    const margin = 22;
    const cx = Math.min(georef.imageWidth - margin, Math.max(margin, x));
    const cy = Math.min(georef.imageHeight - margin, Math.max(margin, y));
    return {
      xPercent: (cx / georef.imageWidth) * 100,
      yPercent: (cy / georef.imageHeight) * 100,
      // si hubo que recortar la posición, el punto real cae fuera de
      // este fragmento del plano: la posición mostrada es orientativa
      approximate: cx !== x || cy !== y,
    };
  }

  /* --- Fotos de recuerdo (clave aparte: pueden pesar) --- */
  const PHOTO_KEY = "tabernas_fotos_v1";

  function getPhotos() {
    try {
      return JSON.parse(localStorage.getItem(PHOTO_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function savePhoto(stageId, dataUrl) {
    try {
      const photos = getPhotos();
      photos[stageId] = dataUrl;
      localStorage.setItem(PHOTO_KEY, JSON.stringify(photos));
      return true;
    } catch (e) {
      return false; // cuota llena: la foto no se guarda pero el juego sigue
    }
  }

  function clearPhotos() {
    try {
      localStorage.removeItem(PHOTO_KEY);
    } catch (e) {}
  }

  function formatSeconds(s) {
    if (s === null || s === undefined) return "—";
    const m = Math.floor(s / 60);
    return m > 0 ? `${m} min ${s % 60} s` : `${s} s`;
  }

  function elapsedText() {
    if (!state.startedAt) return "—";
    const end = state.finishedAt || Date.now();
    const mins = Math.floor((end - state.startedAt) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  }

  /* Segundos totales en bruto (para el ranking, no para mostrar) */
  function elapsedSeconds() {
    if (!state.startedAt) return null;
    const end = state.finishedAt || Date.now();
    return Math.round((end - state.startedAt) / 1000);
  }

  function teamName() {
    return state.teamName || "";
  }

  function setTeamName(name) {
    state.teamName = (name || "").trim().slice(0, 40);
    save();
  }

  function markLeaderboardSubmitted() {
    state.leaderboardSubmitted = true;
    save();
  }

  return {
    normalize,
    checkAnswer,
    checkGoogleAnswer,
    get state() {
      return state;
    },
    save,
    load,
    reset,
    currentStage,
    completeStage,
    completeGoogle,
    useHint,
    advanceStage,
    distanceMeters,
    projectToMap,
    elapsedText,
    elapsedSeconds,
    teamName,
    setTeamName,
    markLeaderboardSubmitted,
    getPhotos,
    savePhoto,
    formatSeconds,
  };
})();
