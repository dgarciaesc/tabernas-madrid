-- ============================================================
-- El Testamento del Siglo de Oro — esquema de licencias (D1)
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
