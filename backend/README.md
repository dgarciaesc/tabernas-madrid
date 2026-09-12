# Backend de licencias — despliegue

Todo se hace **desde el panel web de Cloudflare y Stripe**, sin instalar
nada en el ordenador.

Este es un proyecto **independiente** del primer juego (El Testamento del
Siglo de Oro / HiddenMadrid): necesita su propio repositorio de GitHub
Pages, su propia base de datos D1, su propio Worker y su propio producto
de Stripe — no reutiliza nada del otro backend.

Coste fijo mensual a esta escala: **0 €**. Solo paga Stripe su comisión
por transacción (~1.5% + 0.25€).

**Nota sobre idiomas:** `worker.js` sirve las 5 paradas en español,
inglés o francés según el `lang` que mande el cliente en `/api/redeem`
(`js/data.js`/`js/i18n.js` en el frontend). Si en el futuro cambias el
guion de una prueba, edítalo en las tres versiones dentro de `STAGES_I18N`
y vuelve a pegar el archivo entero en "Edit code" — no hay build ni
despliegue parcial, el paso es siempre "sustituir todo el código y
Save and deploy".

---

## 0. Publicar el frontend (GitHub Pages)

Este proyecto todavía no está subido a ningún repositorio. Antes de nada:

```bash
cd /Users/David/tabernas_madrid
git init
git add -A
git commit -m "Primera versión: Tabernas con Historia"
```

Crea un repositorio nuevo en GitHub (por ejemplo `tabernas-madrid`) y
súbelo (`git remote add origin ...` + `git push`), luego activa GitHub
Pages en Settings → Pages de ese repositorio. Apunta un dominio propio si
quieres (fichero `CNAME`), igual que se hizo con `hiddenmadrid.com` para
el primer juego.

## 1. Cloudflare: base de datos D1

1. **[dash.cloudflare.com](https://dash.cloudflare.com)** (misma cuenta que ya usas para el otro Worker vale)
2. Menú lateral → **Workers & Pages** → pestaña **D1** → **Create database**
3. Nombre: `tabernas-licencias` → Create
4. Entra en la base de datos creada → pestaña **Console**
5. Abre [schema.sql](schema.sql) de este repo, copia todo su contenido, pégalo en la consola y ejecútalo (botón "Execute")
6. Verifica: `SELECT * FROM licenses;` — debe devolver una tabla vacía sin error

## 2. Cloudflare: el Worker

1. **Workers & Pages** → **Create** → **Workers** → **Create Worker**
2. Nombre: `tabernas-licencias` (o el que prefieras) → Deploy (con el código de ejemplo, luego lo sustituimos)
3. Una vez creado, pulsa **Edit code** (el editor "Quick Edit")
4. Borra todo el contenido y pega el de [worker.js](worker.js) de este repo → **Save and deploy**
5. **Copia la URL** que te asigna Cloudflare, arriba del editor — algo como `https://tabernas-licencias.tu-usuario.workers.dev`. La necesitarás en el paso 4 de abajo.

### Conectar el Worker con la base de datos

6. En el Worker → **Settings** → **Bindings** → **Add binding** → **D1 database**
7. Variable name: `DB` (exactamente así, en mayúsculas) → selecciona `tabernas-licencias` → Save

### Variables de entorno

8. **Settings** → **Variables and Secrets** → añade estas 5 (marca **Encrypt** en las tres primeras):

   | Nombre | Valor | Encrypt |
   |---|---|---|
   | `STRIPE_SECRET_KEY` | tu clave secreta de Stripe (paso 3) | ✅ |
   | `STRIPE_WEBHOOK_SECRET` | la firma del webhook (paso 3) | ✅ |
   | `STRIPE_PRICE_ID` | el ID del precio creado en Stripe (paso 3) | ✅ |
   | `SITE_URL` | la URL de tu GitHub Pages o dominio propio (con la ruta, sin barra final) | — |
   | `ALLOWED_ORIGIN` | el mismo dominio, **con `https://` y sin ninguna ruta** (⚠️ el error más habitual: olvidarse del `https://`, ver más abajo) | — |

   Guarda y **vuelve a desplegar** el Worker tras añadirlas (Deploy).

   ⚠️ **Sobre `ALLOWED_ORIGIN`**: tiene que ser el origen completo,
   p.ej. `https://tabernas-madrid.tu-usuario.github.io` o
   `https://tudominio.com` — **con el esquema `https://` delante**. Si
   pones solo el dominio a secas (`tudominio.com`), el navegador
   rechazará las peticiones aunque el Worker responda 200 (visto en el
   primer juego: por ahí perdimos un rato la primera vez).

## 3. Stripe: cobro

1. Misma cuenta de **[stripe.com](https://dashboard.stripe.com)** que el otro juego, o una nueva
2. **Product catalog** → **Add product**: nombre "Tabernas con Historia — Licencia de equipo", precio único (p.ej. 15€), tipo "One time" → guarda
3. Copia el **Price ID** (`price_...`) → `STRIPE_PRICE_ID`
4. **Developers → API keys** → copia la **Secret key** (`sk_test_...` mientras pruebas) → `STRIPE_SECRET_KEY`
5. **Developers → Webhooks** → **Add endpoint**:
   - URL: `https://TU-WORKER.workers.dev/api/stripe-webhook`
   - Evento: `checkout.session.completed`
   - Crea el endpoint → copia el **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`

**Recomendación:** prueba primero en modo **Test** (tarjeta `4242 4242 4242 4242`) antes de pasar a modo real.

## 4. Conectar el frontend

Edita **[js/license.js](../js/license.js)**, línea `WORKER_URL` (ahora mismo
tiene un valor de relleno, `https://CAMBIA-ESTO.workers.dev`), y pon la
URL real del Worker (paso 2.5). Luego:

```bash
git add -A
git commit -m "Conectar backend de licencias"
git push
```

## 5. Probar de punta a punta

1. Abre tu URL de GitHub Pages en una pestaña nueva (o borra `localStorage`)
2. Pulsa "Comprar licencia" → paga con la tarjeta de prueba `4242 4242 4242 4242`
3. Deberías caer en `gracias.html` con un código `TABERNAS-XXXXXX`
4. Vuelve al juego, introdúcelo → debería desbloquear las 5 paradas

## Soporte: incidencias habituales

- **Cliente perdió el móvil / borró datos y no puede reactivar su código**:
  ```sql
  UPDATE licenses SET status='unused', device_id=NULL WHERE code='TABERNAS-XXXXXX';
  ```
- **Generar un código sin pasar por Stripe** (regalo, prensa, ensayo):
  ```sql
  INSERT INTO licenses (code, status, created_at) VALUES ('TABERNAS-REGALO1', 'unused', unixepoch()*1000);
  ```
- **Ver todas las licencias vendidas**:
  ```sql
  SELECT code, status, email, datetime(created_at/1000,'unixepoch') AS creado FROM licenses ORDER BY created_at DESC;
  ```

## Qué falta todavía (aparte del despliegue)

- **Icono/PWA**: no hay `icons/` ni sello propio para este juego — el
  favicon y el icono de instalación quedan pendientes de un diseño,
  igual que se hizo para el primer juego (ver `manifest.webmanifest`,
  ahora mismo con `"icons": []`).
- **Narración en audio**: el guía "Casiano" tiene texto completo en los
  3 idiomas pero, a diferencia del primer juego, no se ha generado
  audio con ElevenLabs todavía — la app usa la voz del navegador
  (`speechSynthesis`) como único método por ahora. Se puede añadir con
  el mismo script `backend/generate_audio.py` cuando se decida la voz.
- No envía el código por email automáticamente, no hay panel de
  administración, no hay reventa masiva de códigos — igual que en el
  primer backend.
