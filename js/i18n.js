/* ============================================================
   Internacionalización: idioma actual, diccionario de interfaz
   (es/en/fr) y motor de resolución de contenido multilingüe.
   ============================================================ */

const I18N = (() => {
  const LANG_KEY = "testamento_lang";
  const SUPPORTED = ["es", "en", "fr"];

  function detectDefault() {
    const nav = (navigator.language || "es").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : null; // null = aún no elegido
  }

  function getLang() {
    return localStorage.getItem(LANG_KEY) || null;
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    localStorage.setItem(LANG_KEY, lang);
  }

  /* --- Resolución de contenido multilingüe ---
     Un "nodo i18n" es un objeto con únicamente claves es/en/fr, cuyo
     valor puede ser texto, un array (p.ej. directions) o incluso un
     objeto anidado. resolve() recorre cualquier estructura (GAME_DATA,
     las 6 pruebas del backend...) y sustituye cada nodo i18n por el
     valor del idioma pedido, con el español como red de seguridad si
     falta alguna traducción. */
  function isI18nNode(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return false;
    const keys = Object.keys(node);
    return (
      keys.length > 0 &&
      keys.every((k) => SUPPORTED.includes(k)) &&
      "es" in node
    );
  }

  function resolve(node, lang) {
    if (Array.isArray(node)) return node.map((x) => resolve(x, lang));
    if (node && typeof node === "object") {
      if (isI18nNode(node)) {
        const val = node[lang] !== undefined ? node[lang] : node.es;
        return resolve(val, lang);
      }
      const out = {};
      for (const k in node) out[k] = resolve(node[k], lang);
      return out;
    }
    return node;
  }

  /* --- Diccionario de interfaz (textos fijos, no el guion del juego) --- */
  const STRINGS = {
    es: {
      home_title: "Tabernas con Historia",
      home_tagline: "Ruta de bares históricos de Madrid",
      home_choose_lang: "Elige tu idioma",
      home_credit: "",
      currency: "chatos",

      gps_unsupported: "Este dispositivo no dispone de GPS.",
      gps_checking: "Consultando la brújula real…",
      gps_arrived: "✔ ¡Habéis llegado al lugar señalado!",
      gps_distance: "Estáis a {d} m del objetivo. ¡Seguid caminando!",
      gps_far: "Estáis muy lejos de Madrid… pero podéis jugar en modo sofá igualmente.",
      gps_denied: "Sin señal de GPS (permiso denegado). Podéis continuar sin él.",
      gps_button: "📍 ¿Estoy cerca?",

      pin_title: "Vuestra posición aproximada",
      pin_approx: "(os situamos donde el plano alcanza)",
      pin_exact: "· ⚜ marcados en el plano",

      maps_link: "🗺 Cómo llegar a {label}",

      speaker_prologue: "os encomienda una misión",
      speaker_narrative: "relata la historia del lugar",
      speaker_enigma: "os plantea el enigma",
      speaker_google_intro: "os concede una excepción",
      speaker_google_question: "os plantea la pregunta",
      speaker_walk: "os indica el camino",
      speaker_freetour: "os cuenta una anécdota del lugar",
      listen_freetour: "Escuchar la explicación",
      listen_required_hint: "🔒 Escuchad la explicación de arriba para continuar",
      speaker_victory: "os da las gracias",
      speaker_hint_subtle: "Casiano os susurra una pista",
      speaker_hint_direct: "Casiano os guía paso a paso",
      speaker_hint_reveal: "Casiano revela el secreto",
      hint_request_button: "💡 Pedir una pista (−{cost} chatos)",

      photo_alt: "Foto de la parada",
      photo_repeat: "📸 Repetir foto de recuerdo",
      photo_take: "📸 Foto de tu bebida (o del local) en {location}",
      photo_saved: "⚜ Foto sellada en la crónica",
      photo_no_space: "No hay espacio para guardar la foto",
      photo_heading: "La prueba de que habéis brindado en {location}",
      photo_continue: "Continuar →",
      photo_mandatory_hint: "No se desbloquea el siguiente sello sin esta foto: vuestra bebida, una tapa, o el propio local.",

      title_meta: "5 sellos escondidos en 5 tabernas históricas<br />De Lavapiés a la Plaza de Santa Ana · ~1,5 h a pie<br />Recomendado: jugar en equipo, con hambre y sed",
      title_continue: "▶ Continuar la investigación",
      title_start: "Comenzar la aventura",
      title_restart: "Empezar de nuevo",
      title_restart_confirm: "¿Borrar la partida guardada y empezar de nuevo?",

      license_error_empty: "Escribe el código de tu licencia.",
      license_error_noconn: "No hay conexión. Necesitas internet una sola vez, para desbloquear la aventura.",
      license_error_invalid: "Código no válido.",
      license_error_checkout_conn: "No se pudo conectar con la pasarela de pago.",
      license_error_checkout_failed: "No se pudo iniciar el pago.",
      license_label: "🔑 Licencia de equipo",
      license_text: "Esta aventura requiere una licencia por equipo (válida para hasta 6 personas jugando juntas desde un mismo móvil). Si ya la has comprado, introduce aquí tu código:",
      license_placeholder: "TABERNAS-XXXXXX",
      license_unlock: "Desbloquear la aventura",
      license_checking: "Comprobando…",
      license_activated: "⚜ Licencia activada. ¡Que comience la aventura!",
      license_buy: "💳 Comprar licencia — {price}",
      license_buy_bundle: "🎁 Comprar las 2 aventuras — {price}",
      license_bundle_note: "Incluye también «El Testamento del Siglo de Oro». Al pagar recibiréis dos códigos, uno para cada aventura.",
      license_opening_payment: "Abriendo pago…",
      license_note: "El código se activa en este móvil la primera vez que se usa. Solo hace falta conexión para este paso — el resto de la aventura funciona sin cobertura.",

      context_kicker: "Antes de empezar",
      speaker_context: "os pone en situación",
      context_continue: "Continuar →",
      prologue_kicker: "Prólogo",
      listen_narration: "Escuchar narración",
      listen_enigma: "Escuchar enigma",
      listen_instructions: "Escuchar indicaciones",
      who_guides: "⚜ Quién os guía",
      figure_bio_label: "¿Quién fue?",
      photo_note_label: "Sobre esta imagen",
      ar_close: "Cerrar",
      ar_requesting_camera: "Activando la cámara…",
      ar_camera_error: "No se pudo acceder a la cámara. Comprueba los permisos e inténtalo de nuevo.",
      arrived_start: "He llegado a la Taberna Antonio Sánchez",

      history_kicker: "Sello {n} de {total}",
      history_continue: "Ver el enigma →",

      stage_kicker: "Sello {n} de {total}",
      stage_timer: "⏱ {timer} · bonus si resolvéis en 2 min",
      answer_format: "Formato: {format}",
      answer_placeholder: "Escribid aquí la clave…",
      seal_answer: "Sellar la respuesta",
      continue_route: "Continuar la ruta →",
      stage_solved_help: "Sello abierto con ayuda · +{pts} chatos",
      stage_correct_bonus: "⚜ ¡Correcto! +{pts} chatos (¡bonus de celeridad!)",
      stage_correct: "⚜ ¡Correcto! +{pts} chatos",
      wrong_1: "Esa no es la clave… Casiano os ofrece una pista.",
      wrong_2: "Aún no… seguid las instrucciones directas.",
      wrong_3: "Casiano revela el secreto. Leed y continuad.",

      google_kicker: "Prueba especial · Única búsqueda permitida",
      google_title: "El oráculo de internet",
      google_open: "🔎 Abrir Google",
      google_placeholder: "Calle y número…",
      google_confirm: "Confirmar dirección",
      google_reveal: "La dirección es <strong>{answer}</strong>. Pulsad de nuevo para continuar.",
      google_correct: "⚜ ¡Exacto! +{pts} chatos",
      google_wrong: "Esa no es la dirección exacta…",

      transition_kicker: "Sello {n} abierto ⚜",
      transition_heading: "Rumbo a {location}",
      transition_points: "+{pts} chatos ganados",
      arrived_next: "He llegado — abrir el siguiente sello",

      victory_chronicle: "⚜ Crónica de la expedición",
      victory_time: "Tiempo total: {time}",
      victory_album: "📸 Álbum de la expedición",
      victory_certificate: "🎖️ Generar certificado",
      victory_share: "📤 Compartir hazaña",
      victory_leaderboard: "🏆 Ver ranking de equipos",
      victory_again: "Jugar de nuevo",

      leaderboard_title: "🏆 Ranking de equipos",
      leaderboard_subtitle: "Los tiempos más rápidos de todos los equipos",
      leaderboard_team_label: "Nombre de vuestro equipo",
      leaderboard_team_placeholder: "Ej.: Los Sedientos",
      leaderboard_submit: "Enviar nuestro tiempo",
      leaderboard_submitting: "Enviando…",
      leaderboard_submitted: "¡Ya estáis en el ranking!",
      leaderboard_your_rank: "Puesto #{rank} de {total} equipos",
      leaderboard_col_team: "Equipo",
      leaderboard_col_time: "Tiempo",
      leaderboard_col_score: "Chatos",
      leaderboard_empty: "Todavía no hay nadie en el ranking — ¡sed el primer equipo!",
      leaderboard_error_nolicense: "Necesitáis una licencia activa para entrar en el ranking.",
      leaderboard_error_conn: "No se ha podido conectar con el ranking. Probad de nuevo más tarde.",
      leaderboard_back: "← Volver",
      certificate_eyebrow: "Certificado de finalización",
      certificate_subtitle: "Tabernas con Historia · Ruta de bares históricos",
      certificate_body: "Este equipo ha recorrido cinco tabernas históricas de Madrid, de Lavapiés a la Plaza de Santa Ana, y ha descifrado sus cinco sellos brindando en cada una.",
      certificate_time_label: "Tiempo",
      certificate_date_label: "Fecha",
      certificate_download: "⬇️ Descargar",
      certificate_share: "📤 Compartir",
      copied_clipboard: "Copiado al portapapeles",
      share_text: '⚜ He completado "{title}" en Madrid: {score} chatos en {time}. ¿Superarás mi marca?',
    },

    en: {
      home_title: "Historic Taverns",
      home_tagline: "A Historic Bar Route through Madrid",
      home_choose_lang: "Choose your language",
      home_credit: "",
      currency: "rounds",

      gps_unsupported: "This device has no GPS.",
      gps_checking: "Checking the royal compass…",
      gps_arrived: "✔ You've reached the marked spot!",
      gps_distance: "You are {d} m from the target. Keep walking!",
      gps_far: "You're very far from Madrid… but you can still play from the sofa.",
      gps_denied: "No GPS signal (permission denied). You can continue without it.",
      gps_button: "📍 Am I close?",

      pin_title: "Your approximate position",
      pin_approx: "(placed as close as this map fragment allows)",
      pin_exact: "· ⚜ marked on the map",

      maps_link: "🗺 How to get to {label}",

      speaker_prologue: "entrusts you with a mission",
      speaker_narrative: "tells the story of this place",
      speaker_enigma: "poses the riddle",
      speaker_google_intro: "grants you an exception",
      speaker_google_question: "asks the question",
      speaker_walk: "shows you the way",
      speaker_freetour: "shares a story about this place",
      listen_freetour: "Listen to the story",
      listen_required_hint: "🔒 Listen to the story above to continue",
      speaker_victory: "thanks you",
      speaker_hint_subtle: "Casiano whispers a clue",
      speaker_hint_direct: "Casiano guides you step by step",
      speaker_hint_reveal: "Casiano reveals the secret",
      hint_request_button: "💡 Ask for a hint (−{cost} rounds)",

      photo_alt: "Photo of the stop",
      photo_repeat: "📸 Retake keepsake photo",
      photo_take: "📸 Photo of your drink (or the venue) at {location}",
      photo_saved: "⚜ Photo sealed into the chronicle",
      photo_no_space: "No room left to save the photo",
      photo_heading: "Proof that you stopped for a drink at {location}",
      photo_continue: "Continue →",
      photo_mandatory_hint: "The next seal won't unlock without this photo: your drink, a tapa, or the venue itself.",

      title_meta: "5 seals hidden across 5 historic taverns<br />From Lavapiés to Plaza de Santa Ana · ~1.5 h on foot<br />Recommended: play as a team, hungry and thirsty",
      title_continue: "▶ Continue the investigation",
      title_start: "Begin the adventure",
      title_restart: "Start over",
      title_restart_confirm: "Delete the saved game and start over?",

      license_error_empty: "Enter your licence code.",
      license_error_noconn: "No connection. You only need internet once, to unlock the adventure.",
      license_error_invalid: "Invalid code.",
      license_error_checkout_conn: "Could not connect to the payment gateway.",
      license_error_checkout_failed: "Could not start the payment.",
      license_label: "🔑 Team licence",
      license_text: "This adventure requires a team licence (valid for up to 6 people playing together from one phone). If you've already bought one, enter your code here:",
      license_placeholder: "TABERNAS-XXXXXX",
      license_unlock: "Unlock the adventure",
      license_checking: "Checking…",
      license_activated: "⚜ Licence activated. Let the adventure begin!",
      license_buy: "💳 Buy licence — {price}",
      license_buy_bundle: "🎁 Buy both adventures — {price}",
      license_bundle_note: "Also includes \"El Testamento del Siglo de Oro.\" You'll receive two codes at checkout, one for each adventure.",
      license_opening_payment: "Opening payment…",
      license_note: "The code activates on this phone the first time it's used. You only need a connection for this step — the rest of the adventure works without coverage.",

      context_kicker: "Before we begin",
      speaker_context: "sets the scene",
      context_continue: "Continue →",
      prologue_kicker: "Prologue",
      listen_narration: "Listen to narration",
      listen_enigma: "Listen to riddle",
      listen_instructions: "Listen to directions",
      who_guides: "⚜ Who guides you",
      figure_bio_label: "Who was he?",
      photo_note_label: "About this photo",
      ar_close: "Close",
      ar_requesting_camera: "Activating camera…",
      ar_camera_error: "Couldn't access the camera. Check your permissions and try again.",
      arrived_start: "I've reached Taberna Antonio Sánchez",

      history_kicker: "Seal {n} of {total}",
      history_continue: "See the riddle →",

      stage_kicker: "Seal {n} of {total}",
      stage_timer: "⏱ {timer} · bonus if solved within 2 min",
      answer_format: "Format: {format}",
      answer_placeholder: "Write the code here…",
      seal_answer: "Seal the answer",
      continue_route: "Continue the route →",
      stage_solved_help: "Seal opened with help · +{pts} rounds",
      stage_correct_bonus: "⚜ Correct! +{pts} rounds (speed bonus!)",
      stage_correct: "⚜ Correct! +{pts} rounds",
      wrong_1: "That's not the key… the Historian offers you a clue.",
      wrong_2: "Not quite… follow the direct instructions.",
      wrong_3: "The Historian reveals the secret. Read on and continue.",

      google_kicker: "Special challenge · The only search allowed",
      google_title: "The oracle of the internet",
      google_open: "🔎 Open Google",
      google_placeholder: "Street and number…",
      google_confirm: "Confirm address",
      google_reveal: "The address is <strong>{answer}</strong>. Tap again to continue.",
      google_correct: "⚜ Exact! +{pts} rounds",
      google_wrong: "That's not the exact address…",

      transition_kicker: "Seal {n} opened ⚜",
      transition_heading: "Heading to {location}",
      transition_points: "+{pts} rounds earned",
      arrived_next: "I've arrived — open the next seal",

      victory_chronicle: "⚜ Chronicle of the expedition",
      victory_time: "Total time: {time}",
      victory_album: "📸 Expedition album",
      victory_certificate: "🎖️ Generate certificate",
      victory_share: "📤 Share your feat",
      victory_leaderboard: "🏆 View team leaderboard",
      victory_again: "Play again",

      leaderboard_title: "🏆 Team leaderboard",
      leaderboard_subtitle: "The fastest times from every team",
      leaderboard_team_label: "Your team's name",
      leaderboard_team_placeholder: "E.g.: The Thirsty Ones",
      leaderboard_submit: "Submit our time",
      leaderboard_submitting: "Submitting…",
      leaderboard_submitted: "You're on the leaderboard!",
      leaderboard_your_rank: "Rank #{rank} of {total} teams",
      leaderboard_col_team: "Team",
      leaderboard_col_time: "Time",
      leaderboard_col_score: "Rounds",
      leaderboard_empty: "No one on the leaderboard yet — be the first team!",
      leaderboard_error_nolicense: "You need an active licence to join the leaderboard.",
      leaderboard_error_conn: "Couldn't connect to the leaderboard. Please try again later.",
      leaderboard_back: "← Back",
      certificate_eyebrow: "Certificate of completion",
      certificate_subtitle: "Historic Taverns · Madrid Bar Route",
      certificate_body: "This team visited five historic taverns in Madrid, from Lavapiés to Plaza de Santa Ana, deciphering all five seals with a drink at each stop.",
      certificate_time_label: "Time",
      certificate_date_label: "Date",
      certificate_download: "⬇️ Download",
      certificate_share: "📤 Share",
      copied_clipboard: "Copied to clipboard",
      share_text: '⚜ I completed "{title}" in Madrid: {score} rounds in {time}. Can you beat my score?',
    },

    fr: {
      home_title: "Tavernes Historiques",
      home_tagline: "Route des bars historiques de Madrid",
      home_choose_lang: "Choisissez votre langue",
      home_credit: "",
      currency: "tournées",

      gps_unsupported: "Cet appareil ne dispose pas de GPS.",
      gps_checking: "Consultation de la boussole royale…",
      gps_arrived: "✔ Vous êtes arrivés au lieu indiqué !",
      gps_distance: "Vous êtes à {d} m de l'objectif. Continuez à marcher !",
      gps_far: "Vous êtes très loin de Madrid… mais vous pouvez quand même jouer depuis votre canapé.",
      gps_denied: "Pas de signal GPS (permission refusée). Vous pouvez continuer sans.",
      gps_button: "📍 Suis-je proche ?",

      pin_title: "Votre position approximative",
      pin_approx: "(placé là où cette carte s'arrête)",
      pin_exact: "· ⚜ marqué sur la carte",

      maps_link: "🗺 Comment aller à {label}",

      speaker_prologue: "vous confie une mission",
      speaker_narrative: "raconte l'histoire du lieu",
      speaker_enigma: "vous pose l'énigme",
      speaker_google_intro: "vous accorde une exception",
      speaker_google_question: "vous pose la question",
      speaker_walk: "vous indique le chemin",
      speaker_freetour: "vous raconte une anecdote du lieu",
      listen_freetour: "Écouter le récit",
      listen_required_hint: "🔒 Écoutez le récit ci-dessus pour continuer",
      speaker_victory: "vous remercie",
      speaker_hint_subtle: "Casiano vous souffle un indice",
      speaker_hint_direct: "Casiano vous guide pas à pas",
      speaker_hint_reveal: "Casiano révèle le secret",
      hint_request_button: "💡 Demander un indice (−{cost} tournées)",

      photo_alt: "Photo de l'étape",
      photo_repeat: "📸 Reprendre la photo souvenir",
      photo_take: "📸 Photo de votre boisson (ou du lieu) à {location}",
      photo_saved: "⚜ Photo scellée dans la chronique",
      photo_no_space: "Plus de place pour enregistrer la photo",
      photo_heading: "La preuve que vous vous êtes arrêtés à {location}",
      photo_continue: "Continuer →",
      photo_mandatory_hint: "Le sceau suivant ne se débloque pas sans cette photo : votre boisson, une tapa, ou le lieu lui-même.",

      title_meta: "5 sceaux cachés dans 5 tavernes historiques<br />De Lavapiés à la Plaza de Santa Ana · ~1,5 h à pied<br />Recommandé : jouer en équipe, affamés et assoiffés",
      title_continue: "▶ Continuer l'enquête",
      title_start: "Commencer l'aventure",
      title_restart: "Recommencer",
      title_restart_confirm: "Supprimer la partie sauvegardée et recommencer ?",

      license_error_empty: "Saisissez le code de votre licence.",
      license_error_noconn: "Pas de connexion. Une connexion internet n'est nécessaire qu'une seule fois, pour débloquer l'aventure.",
      license_error_invalid: "Code invalide.",
      license_error_checkout_conn: "Impossible de se connecter à la passerelle de paiement.",
      license_error_checkout_failed: "Impossible de lancer le paiement.",
      license_label: "🔑 Licence d'équipe",
      license_text: "Cette aventure nécessite une licence par équipe (valable pour jusqu'à 6 personnes jouant ensemble depuis un même téléphone). Si vous l'avez déjà achetée, saisissez votre code ici :",
      license_placeholder: "TABERNAS-XXXXXX",
      license_unlock: "Débloquer l'aventure",
      license_checking: "Vérification…",
      license_activated: "⚜ Licence activée. Que l'aventure commence !",
      license_buy: "💳 Acheter la licence — {price}",
      license_buy_bundle: "🎁 Acheter les 2 aventures — {price}",
      license_bundle_note: "Comprend aussi « El Testamento del Siglo de Oro ». Vous recevrez deux codes après le paiement, un pour chaque aventure.",
      license_opening_payment: "Ouverture du paiement…",
      license_note: "Le code s'active sur ce téléphone dès la première utilisation. Une connexion n'est nécessaire que pour cette étape — le reste de l'aventure fonctionne sans réseau.",

      context_kicker: "Avant de commencer",
      speaker_context: "vous plante le décor",
      context_continue: "Continuer →",
      prologue_kicker: "Prologue",
      listen_narration: "Écouter le récit",
      listen_enigma: "Écouter l'énigme",
      listen_instructions: "Écouter les indications",
      who_guides: "⚜ Qui vous guide",
      figure_bio_label: "Qui était-il ?",
      photo_note_label: "À propos de cette photo",
      ar_close: "Fermer",
      ar_requesting_camera: "Activation de la caméra…",
      ar_camera_error: "Impossible d'accéder à la caméra. Vérifiez les autorisations et réessayez.",
      arrived_start: "Je suis arrivé à la Taberna Antonio Sánchez",

      history_kicker: "Sceau {n} sur {total}",
      history_continue: "Voir l'énigme →",

      stage_kicker: "Sceau {n} sur {total}",
      stage_timer: "⏱ {timer} · bonus si résolu en 2 min",
      answer_format: "Format : {format}",
      answer_placeholder: "Écrivez le code ici…",
      seal_answer: "Sceller la réponse",
      continue_route: "Continuer la route →",
      stage_solved_help: "Sceau ouvert avec aide · +{pts} tournées",
      stage_correct_bonus: "⚜ Correct ! +{pts} tournées (bonus de rapidité !)",
      stage_correct: "⚜ Correct ! +{pts} tournées",
      wrong_1: "Ce n'est pas la clé… l'Historien vous offre un indice.",
      wrong_2: "Pas encore… suivez les instructions directes.",
      wrong_3: "L'Historien révèle le secret. Lisez et continuez.",

      google_kicker: "Épreuve spéciale · La seule recherche autorisée",
      google_title: "L'oracle d'internet",
      google_open: "🔎 Ouvrir Google",
      google_placeholder: "Rue et numéro…",
      google_confirm: "Confirmer l'adresse",
      google_reveal: "L'adresse est <strong>{answer}</strong>. Appuyez à nouveau pour continuer.",
      google_correct: "⚜ Exact ! +{pts} tournées",
      google_wrong: "Ce n'est pas l'adresse exacte…",

      transition_kicker: "Sceau {n} ouvert ⚜",
      transition_heading: "En route vers {location}",
      transition_points: "+{pts} tournées gagnées",
      arrived_next: "Je suis arrivé — ouvrir le sceau suivant",

      victory_chronicle: "⚜ Chronique de l'expédition",
      victory_time: "Temps total : {time}",
      victory_album: "📸 Album de l'expédition",
      victory_certificate: "🎖️ Générer le certificat",
      victory_share: "📤 Partager l'exploit",
      victory_leaderboard: "🏆 Voir le classement des équipes",
      victory_again: "Rejouer",

      leaderboard_title: "🏆 Classement des équipes",
      leaderboard_subtitle: "Les temps les plus rapides de toutes les équipes",
      leaderboard_team_label: "Nom de votre équipe",
      leaderboard_team_placeholder: "Ex. : Les Assoiffés",
      leaderboard_submit: "Envoyer notre temps",
      leaderboard_submitting: "Envoi…",
      leaderboard_submitted: "Vous êtes dans le classement !",
      leaderboard_your_rank: "Place n°{rank} sur {total} équipes",
      leaderboard_col_team: "Équipe",
      leaderboard_col_time: "Temps",
      leaderboard_col_score: "Tournées",
      leaderboard_empty: "Personne dans le classement pour l'instant — soyez la première équipe !",
      leaderboard_error_nolicense: "Il vous faut une licence active pour rejoindre le classement.",
      leaderboard_error_conn: "Impossible de se connecter au classement. Réessayez plus tard.",
      leaderboard_back: "← Retour",
      certificate_eyebrow: "Certificat de réussite",
      certificate_subtitle: "Tavernes Historiques · Route des bars de Madrid",
      certificate_body: "Cette équipe a visité cinq tavernes historiques de Madrid, de Lavapiés à la Plaza de Santa Ana, déchiffrant les cinq sceaux en trinquant à chaque étape.",
      certificate_time_label: "Temps",
      certificate_date_label: "Date",
      certificate_download: "⬇️ Télécharger",
      certificate_share: "📤 Partager",
      copied_clipboard: "Copié dans le presse-papiers",
      share_text: '⚜ J\'ai terminé « {title} » à Madrid : {score} tournées en {time}. Battrez-vous mon score ?',
    },
  };

  function t(key, vars) {
    const lang = getLang() || "es";
    let str = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.es[key] || key;
    if (vars) {
      for (const k in vars) str = str.replaceAll(`{${k}}`, vars[k]);
    }
    return str;
  }

  return { SUPPORTED, detectDefault, getLang, setLang, resolve, t };
})();
