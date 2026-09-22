/* ============================================================
   Interfaz: pantallas, narración TTS, GPS, progreso
   ============================================================ */

(() => {
  const $screen = document.getElementById("screen");
  const $topbar = document.getElementById("topbar");
  const $sealTrack = document.getElementById("sealTrack");
  const $scoreValue = document.getElementById("scoreValue");
  const $scoreLabel = document.querySelector(".score-label");
  const $toast = document.getElementById("toast");

  const S = Engine.state;
  const t = I18N.t; // atajo muy usado

  /* ---------- Utilidades ---------- */
  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  let toastTimer;
  function toast(msg, ms = 2600) {
    $toast.textContent = msg;
    $toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.add("hidden"), ms);
  }

  /* ---------- Narración (Web Speech API) ----------
     Don Baltasar debe sonar a hombre. El catálogo de voces varía mucho
     entre dispositivos y la primera voz "es"/"en"/"fr" suele ser
     femenina (Mónica en Apple, Google español en Android), así que se
     elige por nombre. La voz sigue el idioma activo de la interfaz. */

  const BCP47 = { es: "es-ES", en: "en-GB", fr: "fr-FR" };

  // Voces masculinas conocidas por idioma y plataforma, de más a menos
  // preferida. Cubre Apple/Microsoft/Android.
  const MALE_VOICES = {
    es: [
      "jorge", "diego", "pablo", "raul", "raúl", "alvaro", "álvaro",
      "carlos", "juan", "enrique", "javier", "miguel", "paco",
      "reed", "rocko", "eddy", "grandpa",
    ],
    en: [
      "daniel", "arthur", "oliver", "ryan", "aaron", "fred", "gordon",
      "reed", "rocko", "eddy", "grandpa", "george", "james",
    ],
    fr: [
      "thomas", "daniel", "nicolas", "yannick", "aurelien", "aurélien",
      "reed", "rocko", "eddy", "grandpa",
    ],
  };

  // Femeninas habituales, para descartarlas cuando no hay coincidencia clara
  const FEMALE_VOICES = [
    "monica", "mónica", "paulina", "marisol", "esperanza", "helena", "laura",
    "sabina", "dalia", "elena", "lucia", "lucía", "penelope", "penélope",
    "flo", "sandy", "shelley", "grandma", "isabela", "camila", "google español",
    "samantha", "kate", "serena", "moira", "tessa", "karen", "google uk english",
    "amelie", "amélie", "audrey", "chantal", "google français",
  ];

  const tts = {
    _voice: undefined,
    _voiceLang: undefined, // idioma para el que se calculó _voice

    pickVoice(lang) {
      const voices = speechSynthesis.getVoices();
      if (!voices.length) return null;
      const prefix = lang; // "es" | "en" | "fr"
      const pool = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
      if (!pool.length) return null;

      const bcp = BCP47[lang].toLowerCase();
      const byLocale = (list) => [
        ...list.filter((v) => v.lang.toLowerCase() === bcp),
        ...list.filter((v) => v.lang.toLowerCase() !== bcp),
      ];
      const name = (v) => (v.name + " " + (v.voiceURI || "")).toLowerCase();
      const wantedList = MALE_VOICES[lang] || [];

      for (const wanted of wantedList) {
        const hit = byLocale(pool).find((v) => name(v).includes(wanted));
        if (hit) return hit;
      }
      const tagged = byLocale(pool).find((v) => /male|masculin|homme|hombre/.test(name(v)));
      if (tagged && !/female|femenin|féminin/.test(name(tagged))) return tagged;
      const neutral = byLocale(pool).find(
        (v) => !FEMALE_VOICES.some((f) => name(v).includes(f))
      );
      return neutral || byLocale(pool)[0];
    },

    pitchFor(voice) {
      if (!voice) return 0.85;
      const n = (voice.name + " " + (voice.voiceURI || "")).toLowerCase();
      return FEMALE_VOICES.some((f) => n.includes(f)) ? 0.6 : 0.85;
    },

    voice() {
      const lang = I18N.getLang() || "es";
      if (this._voice === undefined || this._voiceLang !== lang) {
        const v = this.pickVoice(lang);
        if (v === null) return null; // catálogo aún vacío: no memorizar
        this._voice = v;
        this._voiceLang = lang;
      }
      return this._voice;
    },

    /* `onComplete(finished)` es opcional: se llama con `true` solo si la
       narración terminó de forma natural (para gatear contenido que hay
       que "escuchar sí o sí", como la explicación entre pruebas). Si el
       usuario la cancela a mitad, o falla toda vía de voz, se llama con
       `false` — quien use esto decide su propio plan B. */
    _audioEl: null,
    _speakingBtn: null,

    audioUrl(audioId) {
      return `audio/${audioId}.${I18N.getLang() || "es"}.mp3`;
    },

    /* Para si algo estaba sonando (mp3 o voz del navegador) y limpia el
       botón que lo mostraba. No dispara onComplete: lo hace quien llama. */
    _stopCurrent() {
      if (this._audioEl) {
        this._audioEl.pause();
        this._audioEl = null;
      }
      if ("speechSynthesis" in window && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      if (this._speakingBtn) {
        this._speakingBtn.dataset.speaking = "";
        this._speakingBtn.textContent = "🔊";
      }
      this._speakingBtn = null;
    },

    /* `audioId` (opcional): clip pregenerado con ElevenLabs, p.ej.
       "stage3_enigma". Si existe el mp3 se reproduce tal cual; si falta o
       falla (offline la primera vez, error de red…) cae automáticamente
       en la voz sintética del navegador con el mismo texto. */
    speak(text, btn, onComplete, audioId) {
      const wasThisBtn = !!btn && this._speakingBtn === btn;
      this._stopCurrent();
      if (wasThisBtn) {
        if (onComplete) onComplete(false); // cancelada: no cuenta como escuchada
        return;
      }
      if (audioId) {
        this._speakFile(audioId, text, btn, onComplete);
      } else {
        this._speakBrowser(text, btn, onComplete);
      }
    },

    _speakFile(audioId, fallbackText, btn, onComplete) {
      const audio = new Audio(this.audioUrl(audioId));
      this._audioEl = audio;
      this._speakingBtn = btn || null;
      if (btn) { btn.dataset.speaking = "1"; btn.textContent = "⏸"; }
      audio.onended = () => {
        if (this._audioEl === audio) this._audioEl = null;
        if (this._speakingBtn === btn) this._speakingBtn = null;
        if (btn) { btn.dataset.speaking = ""; btn.textContent = "🔊"; }
        if (onComplete) onComplete(true);
      };
      const fallback = () => {
        if (this._audioEl === audio) this._audioEl = null;
        if (this._speakingBtn === btn) this._speakingBtn = null;
        if (btn) { btn.dataset.speaking = ""; btn.textContent = "🔊"; }
        this._speakBrowser(fallbackText, btn, onComplete);
      };
      audio.onerror = fallback;
      audio.play().catch(fallback);
    },

    _speakBrowser(text, btn, onComplete) {
      if (!("speechSynthesis" in window)) {
        toast(t("gps_unsupported")); // reutilizamos aviso genérico de "no soportado"
        if (onComplete) onComplete(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = BCP47[I18N.getLang() || "es"];
      u.rate = 1.0;
      const voice = this.voice();
      if (voice) u.voice = voice;
      u.pitch = this.pitchFor(voice); // grave: es un cronista entrado en años
      this._speakingBtn = btn || null;
      if (btn) {
        btn.dataset.speaking = "1";
        btn.textContent = "⏸";
      }
      u.onend = () => {
        if (this._speakingBtn === btn) this._speakingBtn = null;
        if (btn) { btn.dataset.speaking = ""; btn.textContent = "🔊"; }
        if (onComplete) onComplete(true);
      };
      u.onerror = () => {
        if (this._speakingBtn === btn) this._speakingBtn = null;
        if (btn) { btn.dataset.speaking = ""; btn.textContent = "🔊"; }
        if (onComplete) onComplete(false);
      };
      speechSynthesis.speak(u);
    },
    stop() {
      this._stopCurrent();
    },
  };

  /* El catálogo de voces se carga de forma asíncrona: se pide cuanto antes
     y se reevalúa la elección cuando el sistema lo completa. */
  if ("speechSynthesis" in window) {
    speechSynthesis.getVoices();
    speechSynthesis.addEventListener("voiceschanged", () => {
      tts._voice = undefined;
    });
  }

  /* ---------- Barra superior ---------- */
  function renderTopbar() {
    $topbar.classList.toggle(
      "hidden",
      S.screen === "home" ||
        S.screen === "title" ||
        S.screen === "context" ||
        S.screen === "prologue"
    );
    $scoreValue.textContent = S.score;
    $scoreLabel.textContent = t("currency");
    $sealTrack.innerHTML = "";
    GAME_DATA.stages.forEach((st, i) => {
      const done =
        i < S.stageIndex || (S.screen === "victory" && i <= S.stageIndex);
      const cls = done ? "seal done" : i === S.stageIndex ? "seal current" : "seal";
      $sealTrack.appendChild(el(`<div class="${cls}">${done ? "✦" : st.num}</div>`));
    });
  }

  /* ---------- GPS ----------
     `onMap`, si se pasa, georreferencia al jugador sobre un plano
     histórico: {georef, container} donde container es el <figure> de la
     imagen. Hoy solo se usa en el prólogo, con el plano de Texeira. */
  function gpsCheck(targetCoords, $status, onMap) {
    if (!("geolocation" in navigator)) {
      $status.textContent = t("gps_unsupported");
      return;
    }
    $status.textContent = t("gps_checking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const d = Engine.distanceMeters(here, targetCoords);
        if (d < 120) {
          $status.textContent = t("gps_arrived");
          $status.classList.add("near");
        } else if (d < 100000) {
          $status.textContent = t("gps_distance", { d: Math.round(d) });
          $status.classList.remove("near");
        } else {
          $status.textContent = t("gps_far");
        }
        if (onMap) placePinOnMap(here, onMap, $status);
      },
      () => {
        $status.textContent = t("gps_denied");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  /* Dibuja (o mueve) el punto "estáis aquí" sobre un plano histórico
     georreferenciado, usando la transformación afín de data.js. */
  function placePinOnMap(here, { georef, container }, $status) {
    if (!container) return;
    const pos = Engine.projectToMap(here, georef);
    let pin = container.querySelector(".user-map-pin");
    if (!pin) {
      pin = el(`
        <div class="user-map-pin" title="${t("pin_title")}">
          <span class="pin-ring"></span>
          <span class="pin-dot"></span>
        </div>`);
      container.appendChild(pin);
    }
    pin.style.left = pos.xPercent + "%";
    pin.style.top = pos.yPercent + "%";
    pin.classList.toggle("approximate", pos.approximate);
    if ($status) {
      $status.insertAdjacentHTML(
        "beforeend",
        ` <span class='pin-note'>${pos.approximate ? t("pin_approx") : t("pin_exact")}</span>`
      );
    }
  }

  /* Identificador estable de cada etapa para los clips de audio
     pregenerados con ElevenLabs (audio/stageN_tipo.lang.mp3). No se
     puede usar `stage.num` (posición actual en la ruta, que cambia si
     se reordena el recorrido) porque el audio ya está grabado con el
     número que llevaba cada etapa cuando se generó — que es, y sigue
     siendo, el número fijo dentro de su `id` (p.ej. "etapa_3_..." →
     3), invariable aunque la etapa pase a ser la primera o la última. */
  function audioStageNum(stage) {
    const m = /etapa_(\d+)_/.exec(stage.id);
    return m ? m[1] : stage.num;
  }

  /* Convierte un texto con párrafos separados por línea en blanco
     (\n\n) en varios <p>, para que las anécdotas largas del "recorrido
     libre" no lleguen como un único bloque de texto. Si no hay saltos
     de párrafo (texto corto, o algún idioma sin marcar), se queda en
     un único <p> como antes. */
  function paragraphs(text) {
    return text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p}</p>`)
      .join("");
  }

  function mapsLink(coords, label) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=walking`;
    return `<a class="map-link" href="${url}" target="_blank" rel="noopener">${t("maps_link", { label })}</a>`;
  }

  /* ---------- El Historiador: cabecera con su avatar ----------
     Se antepone a todo texto que pronuncia el guía, para que se vea
     quién habla. `tagKey` es una clave de I18N.STRINGS que describe el
     tipo de intervención. */
  const NARRATOR = GAME_DATA.narrator;

  function speaker(tagKey) {
    return `
      <div class="speaker">
        <img class="speaker-avatar" src="${NARRATOR.avatar}"
             alt="${NARRATOR.name}, ${NARRATOR.role}" />
        <div class="speaker-id">
          <span class="speaker-name">${NARRATOR.name}</span>
          <span class="speaker-tag">${t(tagKey)}</span>
        </div>
      </div>`;
  }

  /* Avatar suelto y pequeño, para pistas y avisos breves */
  function miniAvatar() {
    return `<img class="mini-avatar" src="${NARRATOR.avatar}" alt="${NARRATOR.name}" />`;
  }

  /* ---------- Obra de arte de cada etapa ---------- */
  /* Cuadro/grabado histórico (photo) con su crédito; si la etapa no
     tiene imagen, cae al grabado SVG de art.js */
  function artCard(item, alt, id) {
    // El id va en el envoltorio de la imagen (no en el <figure>): así el
    // pie de foto no descuadra los porcentajes al posicionar un punto
    // sobre la imagen (ver placePinOnMap).
    const idAttr = id ? ` id="${id}"` : "";
    if (item.photo) {
      return `
        <figure class="art-card">
          <div class="art-card-imgwrap"${idAttr}>
            <img src="${item.photo}" alt="${alt}" loading="lazy" />
          </div>
          ${
            item.figureBio
              ? `<div class="art-card-bio">
                   <span class="art-card-bio-label">${t("figure_bio_label")}</span>
                   <p>${item.figureBio}</p>
                 </div>`
              : ""
          }
          ${
            item.photoNote
              ? `<div class="art-card-bio">
                   <span class="art-card-bio-label">${t("photo_note_label")}</span>
                   <p>${item.photoNote}</p>
                 </div>`
              : ""
          }
          ${item.photoCaption ? `<figcaption>${item.photoCaption}</figcaption>` : ""}
        </figure>`;
    }
    const key = item.id || "prologue";
    return STAGE_ART[key] ? `<div class="art-card"${idAttr}>${STAGE_ART[key]}</div>` : "";
  }

  /* ---------- Superposición de cámara (comparador histórico) ----------
     Abre la cámara del móvil a pantalla completa y superpone una imagen
     histórica sobre el directo, con un deslizante para comparar (mismo
     mecanismo que un slider de "antes/ahora": un clip-path que se mueve
     al arrastrar). Sin librerías. Si el jugador no da permiso de cámara,
     o el dispositivo no la soporta, se avisa dentro del propio recuadro
     sin romper el resto del juego. `overlay` es el campo st.arOverlay
     de la etapa (image/buttonLabel/caption/credit). */
  function openArOverlay(overlay) {
    const ov = el(`
      <div class="ar-overlay">
        <button class="ar-close" aria-label="${t("ar_close")}">✕</button>
        <div class="ar-stage" id="arStage">
          <video class="ar-video" id="arVideo" autoplay playsinline muted></video>
          <img class="ar-old" id="arOld" src="${overlay.image}" alt="" />
          <div class="ar-handle" id="arHandle"><div class="ar-handle-grip">↔</div></div>
          <p class="ar-status" id="arStatus">${t("ar_requesting_camera")}</p>
        </div>
        <div class="ar-caption">
          <p>${overlay.caption}</p>
          <p class="ar-credit">${overlay.credit}</p>
        </div>
      </div>
    `);
    document.body.appendChild(ov);
    document.body.classList.add("no-scroll");

    const $video = ov.querySelector("#arVideo");
    const $stage = ov.querySelector("#arStage");
    const $old = ov.querySelector("#arOld");
    const $handle = ov.querySelector("#arHandle");
    const $status = ov.querySelector("#arStatus");
    let stream = null;

    function setPos(pct) {
      const p = Math.max(2, Math.min(98, pct));
      $old.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
      $handle.style.left = p + "%";
    }
    setPos(50);

    function posFromEvent(e) {
      const rect = $stage.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return (x / rect.width) * 100;
    }
    let dragging = false;
    const onDown = (e) => {
      dragging = true;
      setPos(posFromEvent(e));
    };
    const onMove = (e) => {
      if (dragging) setPos(posFromEvent(e));
    };
    const onUp = () => {
      dragging = false;
    };
    $stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    function close() {
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.classList.remove("no-scroll");
      ov.remove();
    }
    ov.querySelector(".ar-close").onclick = close;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $status.textContent = t("ar_camera_error");
      $status.classList.add("ar-status-error");
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then((s) => {
          stream = s;
          $video.srcObject = s;
          $status.remove();
        })
        .catch(() => {
          $status.textContent = t("ar_camera_error");
          $status.classList.add("ar-status-error");
        });
    }
  }

  /* ---------- Certificado de finalización ----------
     Genera, en un <canvas>, una imagen tipo diploma con el emblema del
     juego, la puntuación, el tiempo y hasta 6 fotos del equipo (una
     por etapa, las que se hayan hecho). Todo en el propio dispositivo,
     sin servidor: se puede descargar como PNG o compartir con
     navigator.share si el navegador lo soporta (en escritorio, sin
     API de compartir, se ofrece solo la descarga). */
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // que un fallo no bloquee el resto
      img.src = src;
    });
  }

  /* Centra texto envuelto a `maxWidth`, devuelve la y tras la última
     línea (para poder seguir dibujando debajo sin solaparse). Con
     `dryRun` no pinta nada: solo calcula cuánto ocupará el texto —
     lo usa drawCertificate() para saber la altura final ANTES de
     pintar un solo píxel (ver más abajo). */
  function wrapCenteredText(ctx, text, cx, y, maxWidth, lineHeight, dryRun) {
    const words = text.split(/\s+/);
    let line = "";
    let cy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        if (!dryRun) ctx.fillText(line, cx, cy);
        line = word;
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      if (!dryRun) ctx.fillText(line, cx, cy);
      cy += lineHeight;
    }
    return cy;
  }

  /* Recorre todo el contenido del certificado (cabecera, estadísticas,
     álbum) sobre un contexto dado. En modo `dryRun` solo mide (ningún
     fillText/drawImage real) y sirve para saber la altura final del
     documento; con dryRun:false pinta de verdad. Así el marco y el
     degradado de fondo, que se dibujan aparte una vez conocida esa
     altura, siempre encajan justo con el contenido, tenga 0 o 6 fotos
     y independientemente de en cuántas líneas envuelva el título en
     cada idioma. */
  function layoutCertificate(ctx, W, photoImgs, dryRun) {
    const ink = "#2b1d0e";
    const inkSoft = "#4a3620";
    const gold = "#b8860b";
    const goldBright = "#d4a017";
    const cx = W / 2;
    ctx.textAlign = "center";

    let y = 340;
    ctx.fillStyle = goldBright;
    ctx.font = "700 22px Georgia, serif";
    if (!dryRun) ctx.fillText(t("certificate_eyebrow").toUpperCase(), cx, y);

    y += 56;
    ctx.fillStyle = ink;
    ctx.font = "700 46px 'Iowan Old Style', Georgia, serif";
    y = wrapCenteredText(ctx, GAME_DATA.title, cx, y, W - 200, 54, dryRun);

    y += 6;
    ctx.fillStyle = inkSoft;
    ctx.font = "italic 24px 'Iowan Old Style', Georgia, serif";
    if (!dryRun) ctx.fillText(t("certificate_subtitle"), cx, y);

    y += 44;
    ctx.fillStyle = gold;
    ctx.font = "26px Georgia, serif";
    if (!dryRun) ctx.fillText("❦ ❦ ❦", cx, y);

    y += 50;
    ctx.fillStyle = inkSoft;
    ctx.font = "24px 'Iowan Old Style', Georgia, serif";
    y = wrapCenteredText(ctx, t("certificate_body"), cx, y, W - 220, 34, dryRun);

    // Estadísticas: ducados / tiempo / fecha
    y += 34;
    const stats = [
      { label: t("currency"), value: String(S.score) },
      { label: t("certificate_time_label"), value: Engine.elapsedText() },
      {
        label: t("certificate_date_label"),
        value: new Date(S.finishedAt || Date.now()).toLocaleDateString(I18N.getLang() || "es"),
      },
    ];
    const colW = (W - 200) / 3;
    if (!dryRun) {
      stats.forEach((s, i) => {
        const scx = 100 + colW * i + colW / 2;
        ctx.fillStyle = ink;
        ctx.font = "700 40px Georgia, serif";
        ctx.fillText(s.value, scx, y);
        ctx.fillStyle = gold;
        ctx.font = "700 15px Georgia, serif";
        ctx.fillText(s.label.toUpperCase(), scx, y + 30);
        if (i > 0) {
          ctx.strokeStyle = "rgba(184,134,11,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(100 + colW * i, y - 42);
          ctx.lineTo(100 + colW * i, y + 40);
          ctx.stroke();
        }
      });
    }

    // Álbum: hasta 6 fotos en cuadrícula 3×2
    y += 76;
    if (photoImgs.length) {
      const cols = 3;
      const gap = 14;
      const cell = (W - 200 - gap * (cols - 1)) / cols;
      if (!dryRun) {
        photoImgs.forEach((img, i) => {
          if (!img) return;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const px = 100 + col * (cell + gap);
          const py = y + row * (cell + gap);
          // recorte centrado a cuadrado (cover)
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.save();
          ctx.strokeStyle = gold;
          ctx.lineWidth = 3;
          ctx.strokeRect(px, py, cell, cell);
          ctx.drawImage(img, sx, sy, side, side, px, py, cell, cell);
          ctx.restore();
        });
      }
      y += Math.ceil(photoImgs.length / cols) * (cell + gap);
    }

    // Pie
    y += 60;
    ctx.fillStyle = gold;
    ctx.font = "700 16px Georgia, serif";
    if (!dryRun) ctx.fillText("TABERNAS CON HISTORIA", cx, y); // TODO: cambia esto cuando haya dominio/marca definitiva
    y += 40;

    return y; // altura total del contenido, usada para dimensionar el lienzo
  }

  async function drawCertificate(canvas) {
    const W = 1080;

    const photosMap = Engine.getPhotos();
    const photoImgs = await Promise.all(
      GAME_DATA.stages
        .map((st) => photosMap[st.id])
        .filter(Boolean)
        .slice(0, 6)
        .map(loadImage)
    );

    // Pasada 1 (medir): mismo recorrido de dibujo pero sin pintar nada,
    // solo para saber cuánto va a ocupar el contenido real.
    const measureCtx = document.createElement("canvas").getContext("2d");
    const contentH = layoutCertificate(measureCtx, W, photoImgs, true);

    // Pasada 2 (pintar): ahora sí, sobre un lienzo del tamaño exacto.
    canvas.width = W;
    canvas.height = contentH + 48; // margen inferior a juego con el marco
    const H = canvas.height;
    const ctx = canvas.getContext("2d");
    const gold = "#b8860b";

    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#f7eed9");
    bgGrad.addColorStop(1, "#efe0c0");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    const emblem = await loadImage("img/emblem.png");
    if (emblem) {
      const cx = W / 2;
      const size = 190;
      const ar = emblem.width / emblem.height;
      const ew = ar >= 1 ? size : size * ar;
      const eh = ar >= 1 ? size / ar : size;
      ctx.drawImage(emblem, cx - ew / 2, 90, ew, eh);
    }

    layoutCertificate(ctx, W, photoImgs, false);
  }

  function openCertificate() {
    const ov = el(`
      <div class="ar-overlay cert-overlay">
        <button class="ar-close" aria-label="${t("ar_close")}">✕</button>
        <div class="cert-stage">
          <canvas class="cert-canvas" id="certCanvas"></canvas>
        </div>
        <div class="cert-actions">
          <button class="btn-primary" id="btnCertDownload">${t("certificate_download")}</button>
          <button class="btn-secondary" id="btnCertShare">${t("certificate_share")}</button>
        </div>
      </div>
    `);
    document.body.appendChild(ov);
    document.body.classList.add("no-scroll");

    function close() {
      document.body.classList.remove("no-scroll");
      ov.remove();
    }
    ov.querySelector(".ar-close").onclick = close;

    const canvas = ov.querySelector("#certCanvas");
    drawCertificate(canvas);

    ov.querySelector("#btnCertDownload").onclick = () => {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "madrid-aventure-certificado.png";
      a.click();
    };
    ov.querySelector("#btnCertShare").onclick = async () => {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "madrid-aventure-certificado.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: GAME_DATA.title });
            return;
          } catch (e) {
            return; // cancelado por el usuario, no hacer nada más
          }
        }
        // sin API de compartir con ficheros (típico en escritorio): descargar
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "madrid-aventure-certificado.png";
        a.click();
      }, "image/png");
    };
  }

  /* ---------- Fotos de recuerdo ---------- */
  function photoSection(stage, onSaved) {
    const existing = Engine.getPhotos()[stage.id];
    const wrap = el(`
      <div class="photo-section">
        <div id="photoPreview">${
          existing
            ? `<div class="photo-frame"><img src="${existing}" alt="${t("photo_alt")}" />
                 <div class="photo-seal">✦</div></div>`
            : ""
        }</div>
        <button class="btn-secondary" id="btnPhoto">
          ${existing ? t("photo_repeat") : t("photo_take", { location: stage.location })}
        </button>
        <input type="file" accept="image/*" capture="environment" id="photoInput" hidden />
      </div>
    `);
    const $input = wrap.querySelector("#photoInput");
    wrap.querySelector("#btnPhoto").onclick = () => $input.click();
    $input.onchange = () => {
      const file = $input.files && $input.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        // reducir a máx. 640 px para no agotar el almacenamiento local
        const scale = Math.min(1, 640 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        URL.revokeObjectURL(img.src);
        if (Engine.savePhoto(stage.id, dataUrl)) {
          wrap.querySelector("#photoPreview").innerHTML = `
            <div class="photo-frame"><img src="${dataUrl}" alt="${t("photo_alt")}" />
              <div class="photo-seal">✦</div></div>`;
          wrap.querySelector("#btnPhoto").textContent = t("photo_repeat");
          toast(t("photo_saved"));
          License.trackEvent("photo_taken", { stageId: stage.id });
          if (onSaved) onSaved();
        } else {
          toast(t("photo_no_space"));
        }
      };
      img.src = URL.createObjectURL(file);
    };
    return wrap;
  }

  /* ---------- Navegación entre pantallas ---------- */
  let stageTimerInterval = null;

  function go(screen) {
    tts.stop();
    clearInterval(stageTimerInterval);
    S.screen = screen;
    Engine.save();
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    renderTopbar();
    $screen.innerHTML = "";
    const views = {
      home: viewHome,
      title: viewTitle,
      context: viewContext,
      prologue: viewPrologue,
      history: viewHistory,
      stage: viewStage,
      photo: viewPhoto,
      google: viewGoogle,
      transition: viewTransition,
      victory: viewVictory,
      leaderboard: viewLeaderboard,
    };
    (views[S.screen] || viewHome)();
  }

  /* Cambia de idioma en caliente: re-resuelve GAME_DATA, refresca el
     contenido de las 6 pruebas si ya había una licencia activa, y
     vuelve a pintar la pantalla actual. */
  async function changeLanguage(lang) {
    I18N.setLang(lang);
    applyLanguage(lang);
    document.documentElement.lang = lang;
    if (License.isUnlocked()) {
      const before = JSON.stringify(GAME_DATA.stages.map((s) => s.id));
      await License.refreshLanguage(lang);
      const refreshed = License.cachedStages();
      if (refreshed && JSON.stringify(refreshed.map((s) => s.id)) === before) {
        GAME_DATA.stages = refreshed;
      }
    }
    render();
  }

  /* ---------- Pantalla: home (marca + selector de idioma) ----------
     Es la primerísima pantalla, antes incluso del candado de licencia.
     Solo se muestra si no hay idioma elegido todavía; una vez elegido,
     se recuerda (localStorage) y no vuelve a aparecer. */
  function viewHome() {
    const v = el(`
      <div class="home-screen">
        <div class="home-photo">
          <img src="img/home_madrid.jpg" alt="Madrid" />
          <div class="home-scrim"></div>
          <div class="home-content">
            <img class="home-emblem" src="img/emblem.png" alt="Tabernas con Historia" />
            <h1 class="home-title">${t("home_title")}</h1>
            <p class="home-tagline" id="homeTagline"></p>
            <div class="home-langs">
              <button class="home-lang-btn" data-lang="es">
                <span class="flag">🇪🇸</span> Español
              </button>
              <button class="home-lang-btn" data-lang="en">
                <span class="flag">🇬🇧</span> English
              </button>
              <button class="home-lang-btn" data-lang="fr">
                <span class="flag">🇫🇷</span> Français
              </button>
            </div>
          </div>
          <p class="home-credit">Foto: Pablomfa (CC BY-SA 3.0)</p>
        </div>
      </div>
    `);

    // El tagline rota entre los 3 idiomas — nadie ha elegido uno
    // todavía, así que no presuponemos que el jugador lee español.
    // Acceso directo a los 3 textos, sin tocar el idioma activo global
    // (que aún no existe en este punto).
    const $tagline = v.querySelector("#homeTagline");
    const rawStrings = {
      es: "Ruta de bares históricos de Madrid",
      en: "A Historic Bar Route through Madrid",
      fr: "Route des bars historiques de Madrid",
    };
    let i = 0;
    const langs3 = ["es", "en", "fr"];
    function tickTagline() {
      $tagline.textContent = rawStrings[langs3[i % 3]];
      i++;
    }
    tickTagline();
    const taglineInterval = setInterval(tickTagline, 2600);

    v.querySelectorAll(".home-lang-btn").forEach((btn) => {
      btn.onclick = () => {
        clearInterval(taglineInterval);
        const lang = btn.dataset.lang;
        I18N.setLang(lang);
        applyLanguage(lang);
        document.documentElement.lang = lang;
        go("title");
      };
    });

    $screen.appendChild(v);
  }

  /* ---------- Pantalla: título ---------- */
  function viewTitle() {
    if (!License.isUnlocked()) return viewLicenseGate();

    const hasSave = S.startedAt && !S.finishedAt;
    const v = el(`
      <div class="title-screen">
        ${langSwitcher()}
        <img class="title-emblem" src="img/emblem.png" alt="${GAME_DATA.title}" />
        <h1>${GAME_DATA.title}</h1>
        <p class="title-sub">${GAME_DATA.subtitle}</p>
        <div class="ornament">❦ ❦ ❦</div>
        <p class="title-meta">${t("title_meta")}</p>
        <button class="btn-primary" id="btnStart">
          ${hasSave ? t("title_continue") : t("title_start")}
        </button>
        ${hasSave ? `<button class="btn-ghost" id="btnReset">${t("title_restart")}</button>` : ""}
      </div>
    `);
    wireLangSwitcher(v);
    v.querySelector("#btnStart").onclick = () => {
      if (hasSave) {
        go(resumeScreen());
      } else {
        go("context");
      }
    };
    const btnReset = v.querySelector("#btnReset");
    if (btnReset)
      btnReset.onclick = () => {
        if (confirm(t("title_restart_confirm"))) {
          Engine.reset();
          location.reload();
        }
      };
    $screen.appendChild(v);
  }

  /* Pequeño selector de idioma (banderas) reutilizado en título y
     candado de licencia, para poder corregirlo sin volver a la home. */
  function langSwitcher() {
    const current = I18N.getLang() || "es";
    const flags = { es: "🇪🇸", en: "🇬🇧", fr: "🇫🇷" };
    return `
      <div class="lang-switcher">
        ${I18N.SUPPORTED.map(
          (l) => `<button class="lang-chip ${l === current ? "active" : ""}" data-lang="${l}">${flags[l]}</button>`
        ).join("")}
      </div>`;
  }
  function wireLangSwitcher(v) {
    v.querySelectorAll(".lang-chip").forEach((btn) => {
      btn.onclick = () => changeLanguage(btn.dataset.lang);
    });
  }

  /* ---------- Pantalla: licencia (candado antes de jugar) ----------
     Sin código válido no hay pruebas que cargar: GAME_DATA.stages
     está vacío hasta que License.redeem() las descarga del backend. */
  function viewLicenseGate() {
    const v = el(`
      <div class="title-screen">
        ${langSwitcher()}
        <div class="title-emblem">🔑</div>
        <h1>${GAME_DATA.title}</h1>
        <p class="title-sub">${GAME_DATA.subtitle}</p>
        <div class="ornament">❦ ❦ ❦</div>

        <div class="card">
          <div class="card-label">${t("license_label")}</div>
          <p>${t("license_text")}</p>
          <form class="answer-form" id="licenseForm">
            <input type="text" id="licenseInput" placeholder="${t("license_placeholder")}"
                   autocomplete="off" autocapitalize="characters" enterkeyhint="go" />
            <div id="licenseError"></div>
            <button type="submit" class="btn-primary" id="btnRedeem">
              ${t("license_unlock")}
            </button>
          </form>
        </div>

        <button class="btn-secondary" id="btnBuy">
          ${t("license_buy", { price: GAME_DATA.price || "9,99€" })}
        </button>
        <button class="btn-secondary" id="btnBuyBundle">
          ${t("license_buy_bundle", { price: GAME_DATA.bundlePrice || "14,99€" })}
        </button>
        <p class="title-meta">${t("license_bundle_note")}</p>
        <p class="title-meta">${t("license_note")}</p>
      </div>
    `);
    wireLangSwitcher(v);

    const $input = v.querySelector("#licenseInput");
    const $error = v.querySelector("#licenseError");
    const $btnRedeem = v.querySelector("#btnRedeem");
    const $btnBuy = v.querySelector("#btnBuy");
    const $btnBuyBundle = v.querySelector("#btnBuyBundle");

    v.querySelector("#licenseForm").onsubmit = async (e) => {
      e.preventDefault();
      $error.innerHTML = "";
      $btnRedeem.disabled = true;
      $btnRedeem.textContent = t("license_checking");
      try {
        const stages = await License.redeem($input.value);
        GAME_DATA.stages = stages;
        toast(t("license_activated"));
        License.trackEvent("license_redeemed", { lang: I18N.getLang() });
        go("title");
      } catch (err) {
        $error.innerHTML = `<div class="hint-box direct">${err.message}</div>`;
        $btnRedeem.disabled = false;
        $btnRedeem.textContent = t("license_unlock");
      }
    };

    $btnBuy.onclick = async () => {
      $btnBuy.disabled = true;
      $btnBuy.textContent = t("license_opening_payment");
      try {
        await License.startCheckout();
      } catch (err) {
        toast(err.message);
        $btnBuy.disabled = false;
        $btnBuy.textContent = t("license_buy", { price: GAME_DATA.price || "9,99€" });
      }
    };

    $btnBuyBundle.onclick = async () => {
      $btnBuyBundle.disabled = true;
      $btnBuyBundle.textContent = t("license_opening_payment");
      try {
        await License.startBundleCheckout();
      } catch (err) {
        toast(err.message);
        $btnBuyBundle.disabled = false;
        $btnBuyBundle.textContent = t("license_buy_bundle", { price: GAME_DATA.bundlePrice || "14,99€" });
      }
    };

    $screen.appendChild(v);
  }

  function resumeScreen() {
    // reanudar en la pantalla guardada, con respaldo a la etapa actual
    const valid = [
      "history",
      "stage",
      "photo",
      "google",
      "transition",
      "victory",
      "context",
      "prologue",
    ];
    return valid.includes(S.savedScreen) ? S.savedScreen : "history";
  }

  /* ---------- Pantalla: contexto histórico ----------
     Antepuesta al prólogo: sitúa la dinastía de los Austrias y el
     Siglo de Oro antes de que Don Baltasar pida ayuda con su misión
     concreta. Sin candado de escucha obligatoria (a diferencia del
     recorrido libre entre pruebas): es ambientación, no una pista
     necesaria para resolver nada. */
  function viewContext() {
    const c = GAME_DATA.historicalContext;
    const art = artCard(c, c.title);
    const v = el(`
      <div>
        <div class="stage-header">
          <div class="stage-kicker">${t("context_kicker")}</div>
          <h2>${c.title}</h2>
        </div>

        ${art}

        <div class="card">
          <button class="btn-audio" title="${t("listen_narration")}">🔊</button>
          ${speaker("speaker_context")}
          ${paragraphs(c.text)}
        </div>
        <button class="btn-primary" id="btnContextGo">${t("context_continue")}</button>
      </div>
    `);
    v.querySelector(".btn-audio").onclick = (e) =>
      tts.speak(c.text, e.currentTarget, null, "historical_context");
    v.querySelector("#btnContextGo").onclick = () => go("prologue");
    $screen.appendChild(v);
  }

  /* ---------- Pantalla: prólogo ---------- */
  function viewPrologue() {
    const p = GAME_DATA.prologue;
    const v = el(`
      <div>
        <div class="stage-header">
          <div class="stage-kicker">${t("prologue_kicker")}</div>
          <h2>${p.title}</h2>
        </div>
        <figure class="art-card narrator-portrait">
          <img src="${NARRATOR.portrait}" alt="${NARRATOR.name}" />
          <figcaption>
            <strong>${NARRATOR.name}</strong> · ${NARRATOR.role}<br />
            <span class="art-credit">${NARRATOR.portraitCaption}</span>
          </figcaption>
        </figure>
        <div class="card">
          <button class="btn-audio" title="${t("listen_narration")}">🔊</button>
          ${speaker("speaker_prologue")}
          <p>${p.text}</p>
        </div>
        ${mapsLink(p.startCoords, p.startLocation)}
        <p class="gps-status" id="gpsStatus"></p>
        <button class="btn-secondary" id="btnGps">${t("gps_button")}</button>
        <button class="btn-primary" id="btnGo">${t("arrived_start")}</button>
      </div>
    `);
    v.querySelector(".btn-audio").onclick = (e) => tts.speak(p.text, e.currentTarget, null, "prologue");
    v.querySelector("#btnGps").onclick = () => gpsCheck(p.startCoords, v.querySelector("#gpsStatus"));
    v.querySelector("#btnGo").onclick = () => {
      if (!S.startedAt) S.startedAt = Date.now();
      go("history");
    };
    $screen.appendChild(v);
  }

  /* ---------- Pantalla: historia del lugar (antes del enigma) ----------
     Don Baltasar cuenta quién construyó cada cosa, para qué y qué
     anécdotas ocurrieron aquí — separado del enigma en sí para que leer
     la historia no cuente para el cronómetro de la prueba. */
  function viewHistory() {
    const st = Engine.currentStage();
    const art = artCard(st, st.landmark);
    const v = el(`
      <div>
        <div class="stage-header">
          <div class="stage-kicker">${t("history_kicker", { n: st.num, total: GAME_DATA.stages.length })}</div>
          <h2>${st.title}</h2>
          <p class="location-line">📍 ${st.location} · ${st.landmark}</p>
        </div>

        ${art}

        <div class="card">
          <button class="btn-audio" title="${t("listen_narration")}">🔊</button>
          ${speaker("speaker_narrative")}
          <p>${st.narrative}</p>
        </div>

        <button class="btn-primary" id="btnToEnigma">${t("history_continue")}</button>
      </div>
    `);

    v.querySelector(".btn-audio").onclick = (e) =>
      tts.speak(st.narrative, e.currentTarget, null, `stage${audioStageNum(st)}_narrative`);
    v.querySelector("#btnToEnigma").onclick = () => go("stage");

    $screen.appendChild(v);
  }

  /* ---------- Pantalla: etapa (enigma) ---------- */
  function viewStage() {
    const st = Engine.currentStage();
    // arranca el cronómetro de la prueba (persiste entre recargas)
    if (!S.stageEnteredAt) {
      S.stageEnteredAt = Date.now();
      Engine.save();
      License.trackEvent("stage_started", { stageId: st.id, stageIndex: st.num });
    }
    const locationArt = artCard(
      { photo: st.locationPhoto, photoCaption: st.locationPhotoCaption },
      st.location
    );
    const enigmaArt = st.enigmaPhoto
      ? artCard(
          {
            photo: st.enigmaPhoto,
            photoCaption: st.enigmaPhotoCaption,
            photoNote: st.enigmaPhotoNote,
          },
          st.location
        )
      : "";
    const v = el(`
      <div>
        <div class="stage-header">
          <div class="stage-kicker">${t("stage_kicker", { n: st.num, total: GAME_DATA.stages.length })}</div>
          <h2>${st.title}</h2>
          <p class="location-line">📍 ${st.location} · ${st.landmark}</p>
          <p class="stage-timer">${t("stage_timer", { timer: "0 s" })}</p>
        </div>

        ${locationArt}
        ${
          st.arOverlay
            ? `<button class="btn-secondary btn-ar" id="btnArOverlay">${st.arOverlay.buttonLabel}</button>`
            : ""
        }

        <div class="card enigma">
          <button class="btn-audio" title="${t("listen_enigma")}">🔊</button>
          ${speaker("speaker_enigma")}
          ${paragraphs(st.enigma)}
        </div>
        ${enigmaArt}

        <form class="answer-form" id="answerForm">
          <p class="answer-format">${t("answer_format", { format: st.answerFormat })}</p>
          <input type="text" id="answerInput" placeholder="${t("answer_placeholder")}"
                 autocomplete="off" autocapitalize="characters" enterkeyhint="go" />
          <div class="attempts-dots" id="attemptDots"></div>
          <button type="button" class="btn-ghost btn-hint" id="btnRequestHint">
            ${t("hint_request_button", { cost: SCORING.hintCost })}
          </button>
          <div id="hintArea"></div>
          <button type="submit" class="btn-primary" id="btnSubmit">${t("seal_answer")}</button>
        </form>
      </div>
    `);

    v.querySelector(".btn-audio").onclick = (e) => {
      e.preventDefault();
      tts.speak(st.enigma, e.currentTarget, null, `stage${audioStageNum(st)}_enigma`);
    };

    const $btnAr = v.querySelector("#btnArOverlay");
    if ($btnAr) $btnAr.onclick = () => openArOverlay(st.arOverlay);

    const $input = v.querySelector("#answerInput");
    const $hintArea = v.querySelector("#hintArea");
    const $dots = v.querySelector("#attemptDots");
    const $btnSubmit = v.querySelector("#btnSubmit");
    const $btnHint = v.querySelector("#btnRequestHint");

    function renderDots() {
      $dots.innerHTML = "";
      for (let i = 0; i < 3; i++) {
        $dots.appendChild(
          el(`<div class="attempt-dot ${i < S.attempts ? "used" : ""}"></div>`)
        );
      }
    }

    function renderHints() {
      // el botón de pedir pista solo tiene sentido antes de que la pista
      // sutil aparezca ya gratis (tras el primer fallo)
      $btnHint.hidden = S.attempts >= 1 || S.hintUsed;

      $hintArea.innerHTML = "";
      if (S.attempts >= 1 || S.hintUsed) {
        $hintArea.appendChild(
          el(`<div class="hint-box subtle">
                <div class="hint-title">${miniAvatar()} ${t("speaker_hint_subtle")}</div>
                ${st.hintSubtle}
              </div>`)
        );
      }
      if (S.attempts >= 2) {
        $hintArea.appendChild(
          el(`<div class="hint-box direct">
                <div class="hint-title">${miniAvatar()} ${t("speaker_hint_direct")}</div>
                <ol>${st.directions.map((d) => `<li>${d}</li>`).join("")}</ol>
              </div>`)
        );
      }
      if (S.attempts >= 3) {
        $hintArea.appendChild(
          el(`<div class="hint-box reveal">
                <div class="hint-title">${miniAvatar()} ${t("speaker_hint_reveal")}</div>
                ${st.revealExplanation}
              </div>`)
        );
        $btnSubmit.textContent = t("continue_route");
      }
    }

    $btnHint.onclick = () => {
      if (Engine.useHint()) {
        License.trackEvent("hint_used", { stageId: st.id });
      }
      renderHints();
    };

    renderDots();
    renderHints();

    // cronómetro visible de la prueba
    const $timerLine = v.querySelector(".stage-timer");
    const tick = () => {
      const s = Math.round((Date.now() - S.stageEnteredAt) / 1000);
      $timerLine.textContent = t("stage_timer", { timer: Engine.formatSeconds(s) });
      $timerLine.classList.toggle("over", s > 120);
    };
    tick();
    stageTimerInterval = setInterval(tick, 1000);

    v.querySelector("#answerForm").onsubmit = (e) => {
      e.preventDefault();
      // tras 3 fallos, el botón avanza directamente (regla 4 de la espec.)
      if (S.attempts >= 3) {
        const pts = Engine.completeStage(true);
        S.lastPoints = pts;
        const revealedEntry = S.stageLog[S.stageLog.length - 1];
        License.trackEvent("stage_completed", revealedEntry);
        toast(t("stage_solved_help", { pts }));
        go("photo");
        return;
      }
      const val = $input.value;
      if (!val.trim()) return;
      if (Engine.checkAnswer(val, st)) {
        const pts = Engine.completeStage(false);
        S.lastPoints = pts;
        const last = S.stageLog[S.stageLog.length - 1];
        License.trackEvent("stage_completed", last);
        toast(t(last.bonus ? "stage_correct_bonus" : "stage_correct", { pts }));
        go("photo");
      } else {
        S.attempts++;
        Engine.save();
        License.trackEvent("wrong_attempt", { stageId: st.id, attempt: S.attempts });
        $input.classList.remove("shake");
        void $input.offsetWidth; // reiniciar animación
        $input.classList.add("shake");
        $input.select();
        renderDots();
        renderHints();
        renderTopbar();
        const keys = ["wrong_1", "wrong_2", "wrong_3"];
        toast(t(keys[Math.min(S.attempts - 1, 2)]));
      }
    };

    $screen.appendChild(v);
  }

  /* ---------- Pantalla: foto de recuerdo (justo tras resolver) ----------
     Intermedia entre el enigma y la siguiente parada: aquí es donde se
     pide la foto de equipo, con el sello recién abierto todavía fresco.
     `Engine.currentStage()` sigue apuntando a la etapa que se acaba de
     resolver — el índice no avanza hasta pulsar "he llegado" en la
     pantalla de transición. */
  function viewPhoto() {
    const st = Engine.currentStage();
    const v = el(`
      <div>
        <div class="stage-header">
          <div class="stage-kicker">${t("transition_kicker", { n: st.num })}</div>
          <h2>${t("photo_heading", { location: st.location })}</h2>
          ${S.lastPoints ? `<p class="location-line">${t("transition_points", { pts: S.lastPoints })}</p>` : ""}
        </div>
        <div class="card">
          <p>${t("photo_mandatory_hint")}</p>
        </div>
        <div id="photoSlot"></div>
        <button class="btn-primary" id="btnPhotoContinue" disabled>${t("photo_continue")}</button>
      </div>
    `);

    const $btnContinue = v.querySelector("#btnPhotoContinue");
    // Foto obligatoria: a diferencia del recuerdo opcional del otro
    // juego, aquí no se puede seguir sin ella — es la prueba de que el
    // equipo ha parado a consumir en el local.
    const already = !!Engine.getPhotos()[st.id];
    if (already) $btnContinue.disabled = false;

    v.querySelector("#photoSlot").appendChild(
      photoSection(st, () => {
        $btnContinue.disabled = false;
      })
    );

    $btnContinue.onclick = () => {
      if ($btnContinue.disabled) return;
      const tr = st.transition;
      if (tr.type === "victory") { Engine.advanceStage(); go("victory"); return; }
      go("transition");
    };

    $screen.appendChild(v);
  }

  /* ---------- Pantalla: prueba de Google (etapa 2 → 3) ---------- */
  function viewGoogle() {
    const st = GAME_DATA.stages[1]; // transición definida en la etapa 2
    const tr = st.transition;
    const v = el(`
      <div>
        <div class="stage-header">
          <div class="stage-kicker">${t("google_kicker")}</div>
          <h2>${t("google_title")}</h2>
        </div>
        <div class="card">
          ${speaker("speaker_google_intro")}
          <p>${tr.text}</p>
        </div>
        <div class="card enigma">
          ${speaker("speaker_google_question")}
          <p>${tr.question}</p>
        </div>
        <a class="map-link" href="https://www.google.com/search?q=Casa+Museo+Lope+de+Vega+Madrid+direcci%C3%B3n"
           target="_blank" rel="noopener">${t("google_open")}</a>
        <form class="answer-form" id="googleForm">
          <input type="text" id="googleInput" placeholder="${t("google_placeholder")}"
                 autocomplete="off" enterkeyhint="go" />
          <div id="googleHints"></div>
          <button type="submit" class="btn-primary">${t("google_confirm")}</button>
        </form>
      </div>
    `);

    const $input = v.querySelector("#googleInput");
    const $hints = v.querySelector("#googleHints");

    function renderGoogleHints() {
      $hints.innerHTML = "";
      if (S.googleAttempts >= 1)
        $hints.appendChild(
          el(`<div class="hint-box subtle">
                <div class="hint-title">${miniAvatar()} ${t("speaker_hint_subtle")}</div>
                ${tr.hintSubtle}
              </div>`)
        );
      if (S.googleAttempts >= 2)
        $hints.appendChild(
          el(`<div class="hint-box direct">
                <div class="hint-title">${miniAvatar()} ${t("speaker_hint_direct")}</div>
                <ol>${tr.directions.map((d) => `<li>${d}</li>`).join("")}</ol>
              </div>`)
        );
      if (S.googleAttempts >= 3)
        $hints.appendChild(
          el(`<div class="hint-box reveal">
                <div class="hint-title">${miniAvatar()} ${t("speaker_hint_reveal")}</div>
                ${t("google_reveal", { answer: tr.answer })}
              </div>`)
        );
    }
    renderGoogleHints();

    v.querySelector("#googleForm").onsubmit = (e) => {
      e.preventDefault();
      if (S.googleAttempts >= 3) {
        const attemptsBefore = S.googleAttempts;
        const pts = Engine.completeGoogle(true);
        S.lastPoints = pts;
        S.pendingWalkText = tr.walkText;
        License.trackEvent("google_bonus_completed", { revealed: true, attempts: attemptsBefore, points: pts });
        Engine.advanceStage();
        go("transition");
        return;
      }
      if (Engine.checkGoogleAnswer($input.value, tr)) {
        const attemptsBefore = S.googleAttempts;
        const pts = Engine.completeGoogle(false);
        S.lastPoints = pts;
        S.pendingWalkText = tr.walkText;
        License.trackEvent("google_bonus_completed", { revealed: false, attempts: attemptsBefore, points: pts });
        toast(t("google_correct", { pts }));
        Engine.advanceStage();
        go("transition");
      } else {
        S.googleAttempts++;
        Engine.save();
        $input.classList.remove("shake");
        void $input.offsetWidth;
        $input.classList.add("shake");
        renderGoogleHints();
        toast(t("google_wrong"));
      }
    };

    $screen.appendChild(v);
  }

  /* ---------- Pantalla: transición a pie ---------- */
  /* Se muestra tras resolver una etapa. Dos casos:
     a) etapa con transición "walk"/"victory": aún NO se ha avanzado
     b) tras la prueba de Google: ya se avanzó, S.pendingWalkText definido */
  function viewTransition() {
    const afterGoogle = !!S.pendingWalkText;
    const solvedStage = afterGoogle
      ? GAME_DATA.stages[S.stageIndex - 1]
      : Engine.currentStage();
    const tr = solvedStage.transition;

    // Caso especial: la etapa 2 desemboca en la prueba de Google
    if (!afterGoogle && tr.type === "google") {
      go("google");
      return;
    }
    if (!afterGoogle && tr.type === "victory") {
      Engine.advanceStage(); // marca fin de partida
      go("victory");
      return;
    }

    const next = afterGoogle
      ? Engine.currentStage()
      : GAME_DATA.stages[S.stageIndex + 1];
    const walkText = afterGoogle ? S.pendingWalkText : tr.text;
    const walkAudioId = afterGoogle
      ? `stage${audioStageNum(solvedStage)}_google_walktext`
      : `stage${audioStageNum(solvedStage)}_transition`;
    const freeTour = next.freeTourIntro; // solo la prueba 1 (cubierta por el prólogo) no tiene
    const freeTourAudioId = `stage${audioStageNum(next)}_freetour`;
    const freeTourArt = freeTour
      ? artCard({ photo: next.freeTourPhoto, photoCaption: next.freeTourPhotoCaption }, next.location)
      : "";

    const v = el(`
      <div>
        <div class="stage-header">
          <div class="stage-kicker">${t("transition_kicker", { n: solvedStage.num })}</div>
          <h2>${t("transition_heading", { location: next.location })}</h2>
          ${S.lastPoints ? `<p class="location-line">${t("transition_points", { pts: S.lastPoints })}</p>` : ""}
        </div>
        <div class="card">
          <button class="btn-audio" title="${t("listen_instructions")}">🔊</button>
          ${speaker("speaker_walk")}
          <p>${walkText}</p>
        </div>
        ${
          freeTour
            ? `${freeTourArt}
               <div class="card enigma freetour-card">
                 <button class="btn-audio" title="${t("listen_freetour")}">🔊</button>
                 ${speaker("speaker_freetour")}
                 ${paragraphs(freeTour)}
               </div>`
            : ""
        }
        ${mapsLink(next.coords, next.location)}
        <p class="gps-status" id="gpsStatus"></p>
        <button class="btn-secondary" id="btnGps">${t("gps_button")}</button>
        <p class="listen-required-hint" id="listenHint"></p>
        <button class="btn-primary" id="btnArrived">${t("arrived_next")}</button>
      </div>
    `);

    v.querySelector(".card:not(.freetour-card) .btn-audio").onclick = (e) =>
      tts.speak(walkText, e.currentTarget, null, walkAudioId);
    v.querySelector("#btnGps").onclick = () =>
      gpsCheck(next.coords, v.querySelector("#gpsStatus"));

    /* La explicación estilo free tour es obligatoria: el botón de
       "he llegado" queda bloqueado hasta que termine de sonar entera al
       menos una vez. Si el navegador no soporta voz (o algo falla y
       nunca dispara el final), un plan B por tiempo de lectura evita
       que nadie se quede atascado sin poder avanzar. */
    const $btnArrived = v.querySelector("#btnArrived");
    const $listenHint = v.querySelector("#listenHint");
    let unlocked = !freeTour;

    function unlockArrive() {
      if (unlocked) return;
      unlocked = true;
      $btnArrived.disabled = false;
      $listenHint.classList.add("hidden");
    }

    if (freeTour) {
      $btnArrived.disabled = true;
      $listenHint.textContent = t("listen_required_hint");
      const $ftBtn = v.querySelector(".freetour-card .btn-audio");
      $ftBtn.onclick = (e) => tts.speak(freeTour, e.currentTarget, (finished) => {
        if (finished) unlockArrive();
      }, freeTourAudioId);
      // Red de seguridad: si algo impide detectar el final de la voz
      // (navegador raro, fallo puntual), no dejamos a nadie bloqueado
      // para siempre — se desbloquea solo tras un tiempo generoso de
      // lectura (bastante más que lo que se tarda en escucharlo).
      const words = freeTour.split(/\s+/).length;
      const safetyMs = Math.max(15000, (words / 2.3) * 1000 * 2.5);
      setTimeout(unlockArrive, safetyMs);
    } else {
      $listenHint.classList.add("hidden");
    }

    $btnArrived.onclick = () => {
      if (!unlocked) return;
      S.pendingWalkText = null;
      S.lastPoints = 0;
      if (!afterGoogle) Engine.advanceStage();
      go("history");
    };

    $screen.appendChild(v);
  }

  /* ---------- Pantalla: victoria ---------- */
  function viewVictory() {
    if (!S.victoryTracked) {
      S.victoryTracked = true;
      Engine.save();
      License.trackEvent("game_finished", { score: S.score, seconds: Engine.elapsedSeconds() });
    }
    const vic = GAME_DATA.victory;
    const rows = S.stageLog
      .map(
        (l) =>
          `<tr><td>${l.title}</td>
           <td class="time-cell">${Engine.formatSeconds(l.seconds)}${l.bonus ? " ⚡" : ""}</td>
           <td>${l.revealed ? "🔓" : l.hintUsed ? "💡" : l.attempts === 0 ? "⚜" : "✔"} ${l.points}</td></tr>`
      )
      .join("");
    const photos = Engine.getPhotos();
    const gallery = GAME_DATA.stages
      .filter((st) => photos[st.id])
      .map(
        (st) => `
          <figure class="photo-frame gallery-item">
            <img src="${photos[st.id]}" alt="${st.location}" />
            <div class="photo-seal">✦</div>
            <figcaption>${st.location}</figcaption>
          </figure>`
      )
      .join("");
    const v = el(`
      <div class="victory-screen">
        <div class="victory-emblem">🏆</div>
        <h1>${vic.title}</h1>
        <div class="ornament">❦ ❦ ❦</div>
        <div class="card">
          <button class="btn-audio" title="${t("listen_narration")}">🔊</button>
          ${speaker("speaker_victory")}
          <p>${vic.text}</p>
        </div>
        <div class="card">
          <div class="card-label">${t("victory_chronicle")}</div>
          <div class="big-score">${S.score} ${t("currency")}</div>
          <p class="location-line">${t("victory_time", { time: Engine.elapsedText() })}</p>
          <table class="stats-table"><tbody>${rows}</tbody></table>
        </div>
        ${
          gallery
            ? `<div class="card"><div class="card-label">${t("victory_album")}</div>
                 <div class="photo-grid">${gallery}</div></div>`
            : ""
        }
        <div id="finalPhotoSlot"></div>
        <button class="btn-primary" id="btnCertificate">${t("victory_certificate")}</button>
        <button class="btn-secondary" id="btnLeaderboard">${t("victory_leaderboard")}</button>
        <button class="btn-secondary" id="btnShare">${t("victory_share")}</button>
        <button class="btn-ghost" id="btnAgain">${t("victory_again")}</button>
      </div>
    `);
    v.querySelector(".btn-audio").onclick = (e) => tts.speak(vic.text, e.currentTarget, null, "victory");
    // foto de la victoria en la última etapa (Plaza de Oriente)
    const lastStage = GAME_DATA.stages[GAME_DATA.stages.length - 1];
    const slot = v.querySelector("#finalPhotoSlot");
    slot.appendChild(photoSection(lastStage, render)); // re-render: entra en el álbum
    v.querySelector("#btnCertificate").onclick = () => openCertificate();
    v.querySelector("#btnLeaderboard").onclick = () => go("leaderboard");
    v.querySelector("#btnShare").onclick = async () => {
      const text = t("share_text", {
        title: GAME_DATA.title,
        score: S.score,
        time: Engine.elapsedText(),
      });
      if (navigator.share) {
        try {
          await navigator.share({ title: GAME_DATA.title, text });
        } catch (e) {}
      } else {
        try {
          await navigator.clipboard.writeText(text);
          toast(t("copied_clipboard"));
        } catch (e) {
          toast(text, 5000);
        }
      }
    };
    v.querySelector("#btnAgain").onclick = () => {
      Engine.reset();
      location.reload();
    };
    $screen.appendChild(v);
  }

  /* ---------- Pantalla: ranking de equipos ----------
     Solo accesible tras terminar la aventura (se llega desde el botón
     de la pantalla de victoria). Si el equipo aún no ha enviado su
     tiempo, primero pide el nombre; una vez enviado (o si ya se había
     enviado en una sesión anterior), muestra la tabla de los mejores
     tiempos de todos los equipos. */
  function viewLeaderboard() {
    const alreadySubmitted = S.leaderboardSubmitted;
    const v = el(`
      <div class="leaderboard-screen">
        <button class="btn-ghost btn-back" id="btnLbBack">${t("leaderboard_back")}</button>
        <h1>${t("leaderboard_title")}</h1>
        <p class="location-line">${t("leaderboard_subtitle")}</p>
        <div id="lbSubmitArea"></div>
        <div id="lbTableArea" class="card"><p>…</p></div>
      </div>
    `);
    v.querySelector("#btnLbBack").onclick = () => go("victory");

    const $submitArea = v.querySelector("#lbSubmitArea");
    const $tableArea = v.querySelector("#lbTableArea");

    function renderTable(rows) {
      if (!rows.length) {
        $tableArea.innerHTML = `<p>${t("leaderboard_empty")}</p>`;
        return;
      }
      const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`);
      const body = rows
        .map(
          (r, i) => `<tr>
            <td>${medal(i)}</td>
            <td>${r.teamName}</td>
            <td class="time-cell">${Engine.formatSeconds(r.seconds)}</td>
            <td>${r.score}</td>
          </tr>`
        )
        .join("");
      $tableArea.innerHTML = `
        <table class="stats-table leaderboard-table">
          <thead><tr>
            <th></th>
            <th>${t("leaderboard_col_team")}</th>
            <th>${t("leaderboard_col_time")}</th>
            <th>${t("leaderboard_col_score")}</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>`;
    }

    async function loadTable() {
      try {
        const rows = await License.fetchLeaderboardTop(10);
        renderTable(rows);
      } catch (e) {
        $tableArea.innerHTML = `<p>${e.message}</p>`;
      }
    }

    function renderSubmitted(rank, total) {
      $submitArea.innerHTML = `
        <div class="card">
          <p>✅ ${t("leaderboard_submitted")}</p>
          ${rank ? `<p class="leaderboard-rank">${t("leaderboard_your_rank", { rank, total })}</p>` : ""}
        </div>`;
    }

    function renderForm() {
      $submitArea.innerHTML = `
        <div class="card">
          <label class="field-label" for="lbTeamInput">${t("leaderboard_team_label")}</label>
          <input type="text" id="lbTeamInput" maxlength="40"
                 placeholder="${t("leaderboard_team_placeholder")}"
                 value="${Engine.teamName()}" autocomplete="off" />
          <button class="btn-primary" id="btnLbSubmit">${t("leaderboard_submit")}</button>
        </div>`;
      const $input = v.querySelector("#lbTeamInput");
      const $btn = v.querySelector("#btnLbSubmit");
      $btn.onclick = async () => {
        const name = $input.value.trim();
        if (!name) {
          $input.focus();
          return;
        }
        $btn.disabled = true;
        $btn.textContent = t("leaderboard_submitting");
        try {
          const { rank, total } = await License.submitLeaderboard({
            teamName: name,
            seconds: Engine.elapsedSeconds() || 0,
            score: S.score,
            lang: I18N.getLang(),
          });
          Engine.setTeamName(name);
          Engine.markLeaderboardSubmitted();
          License.trackEvent("leaderboard_submitted", {
            teamName: name,
            seconds: Engine.elapsedSeconds() || 0,
            score: S.score,
            rank,
            total,
          });
          renderSubmitted(rank, total);
          loadTable();
        } catch (e) {
          toast(e.message);
          $btn.disabled = false;
          $btn.textContent = t("leaderboard_submit");
        }
      };
    }

    if (alreadySubmitted) {
      renderSubmitted(null, null);
    } else {
      renderForm();
    }
    loadTable();

    $screen.appendChild(v);
  }

  /* ---------- Arranque ---------- */
  // Si ya se validó una licencia antes, las 6 pruebas se recuperan de
  // la caché local (sin red); si no, GAME_DATA.stages queda vacío y
  // viewTitle() mostrará el candado de licencia.
  GAME_DATA.stages = License.cachedStages() || [];
  if (I18N.getLang()) document.documentElement.lang = I18N.getLang();

  const restored = Engine.load();
  if (!I18N.getLang()) {
    // primera vez en este dispositivo: elegir idioma antes que nada
    S.screen = "home";
  } else if (!GAME_DATA.stages.length) {
    // sin licencia válida en caché no hay nada que reanudar: al candado
    S.screen = "title";
  } else if (restored && S.startedAt && !S.finishedAt) {
    S.savedScreen = S.screen; // recordar dónde iba para "Continuar"
    S.screen = "title";
  } else if (restored && S.finishedAt) {
    // partida acabada: mostrar victoria de nuevo
    S.screen = "victory";
  } else {
    S.screen = "title";
  }
  render();

  /* Refresco silencioso en segundo plano: si el jugador ya tenía las
     pruebas cacheadas de una activación anterior, se piden de nuevo al
     Worker nada más abrir la app (sin bloquear el arranque, que sigue
     siendo offline-first con la caché). Así, si hemos publicado un
     cambio de contenido (como este reordenamiento), llega solo, sin
     que el jugador tenga que cambiar de idioma dos veces a mano para
     forzar la descarga. Si falla (sin red) no pasa nada: se sigue
     jugando con lo que ya había en caché. */
  if (License.isUnlocked()) {
    const before = JSON.stringify(GAME_DATA.stages.map((s) => s.id));
    License.redeem(License.currentCode(), I18N.getLang())
      .then((fresh) => {
        if (!fresh || !fresh.length) return;
        if (JSON.stringify(fresh.map((s) => s.id)) !== before) return; // guarda de seguridad
        GAME_DATA.stages = fresh;
        if (S.screen === "title") render(); // no interrumpir si ya está jugando
      })
      .catch(() => {}); // sin conexión: se queda con la caché tal cual
  }
})();
