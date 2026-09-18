-- ============================================================
-- Tabernas con Historia — esquema de licencias (D1)
-- ============================================================
-- Pega esto en el panel de Cloudflare: Workers & Pages → D1 →
-- tu base de datos → pestaña "Console".
--
-- Las consultas de soporte (liberar un código, generarlo a mano, ver
-- el listado de ventas) están en backend/README.md, no aquí — la
-- consola de Cloudflare a veces falla ("Requests without any query
-- are not supported") si el bloque pegado termina en comentarios sin
-- una sentencia real detrás.

CREATE TABLE IF NOT EXISTS licenses (
  code TEXT PRIMARY KEY,                  -- p.ej. MADRID-7F3K9Q
  stripe_session_id TEXT UNIQUE,          -- sesión de Stripe que lo generó
  email TEXT,                             -- email del comprador, si Stripe lo capturó
  status TEXT NOT NULL DEFAULT 'unused',  -- unused | active
  device_id TEXT,                         -- fijado en la primera redención
  created_at INTEGER NOT NULL,            -- epoch ms
  activated_at INTEGER                    -- epoch ms, null hasta redimir
);

CREATE INDEX IF NOT EXISTS idx_licenses_session ON licenses(stripe_session_id);

-- Ranking de equipos: una fila por código de licencia (= un equipo),
-- se sobrescribe solo si el nuevo tiempo es mejor que el guardado.
CREATE TABLE IF NOT EXISTS leaderboard (
  code TEXT PRIMARY KEY,          -- mismo código que en licenses
  team_name TEXT NOT NULL,
  seconds INTEGER NOT NULL,       -- tiempo total en segundos (menor = mejor)
  score INTEGER NOT NULL,
  lang TEXT,
  completed_at INTEGER NOT NULL   -- epoch ms
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_seconds ON leaderboard(seconds);

-- Analítica: registro cronológico de eventos por equipo (una fila por
-- acción: licencia activada, entra en una prueba, falla, pide pista,
-- resuelve, hace foto, termina la prueba de Google, victoria, envía su
-- tiempo al ranking...). event_data guarda detalles en JSON libre.
-- Pensado para consultarse directamente por SQL (sin panel propio):
--   SELECT * FROM events WHERE code = 'TABERNAS-XXXXXX' ORDER BY created_at;
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,             -- código de licencia = equipo
  device_id TEXT NOT NULL,
  event_type TEXT NOT NULL,       -- p.ej. stage_started, hint_used, stage_completed...
  event_data TEXT,                -- JSON con detalles del evento
  created_at INTEGER NOT NULL     -- epoch ms
);

CREATE INDEX IF NOT EXISTS idx_events_code ON events(code);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
