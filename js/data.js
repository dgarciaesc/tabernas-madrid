/* ============================================================
   TABERNAS CON HISTORIA — Datos del juego
   Ruta de bares históricos de Madrid (1787-1904)
   ============================================================
   Los campos marcados {es,en,fr} son "nodos i18n": I18N.resolve()
   los sustituye por el texto del idioma elegido al arrancar la app
   (ver el final de este archivo). El resto de campos (coords, fotos,
   nombres de lugar) es el mismo en cualquier idioma. */

const GAME_DATA_I18N = {
  title: {
    es: "Tabernas con Historia",
    en: "Historic Taverns",
    fr: "Tavernes Historiques",
  },
  subtitle: {
    es: "Ruta de bares históricos de Madrid",
    en: "A Historic Bar Route through Madrid",
    fr: "Route des bars historiques de Madrid",
  },
  city: "Madrid",
  price: { es: "9€ por equipo", en: "€9 per team", fr: "9 € par équipe" },

  /* Guía ficticio de la ruta: un veterano tabernero que ha heredado el
     oficio (y las historias) de generaciones de su familia. */
  narrator: {
    name: "Casiano",
    role: {
      es: "Tabernero de toda la vida",
      en: "Lifelong Tavern Keeper",
      fr: "Tavernier depuis toujours",
    },
    avatar: "img/narrador_retrato.jpg",
    portrait: "img/narrador_retrato.jpg",
    portraitCaption: {
      es: "«Le Bon Bock», Édouard Manet (1873) · Philadelphia Museum of Art",
      en: "\"Le Bon Bock,\" Édouard Manet (1873) · Philadelphia Museum of Art",
      fr: "« Le Bon Bock », Édouard Manet (1873) · Philadelphia Museum of Art",
    },
    bio: {
      es:
        "He pasado la vida entera detrás de barras de Madrid, heredando de " +
        "mi padre y de mi abuelo el oficio de tabernero y los secretos de " +
        "cada casa. Conozco historias que no están en ningún libro: quién " +
        "fundó un partido en la trastienda, qué fecha miente en una " +
        "portada de piedra, en qué samovar se sirve el consomé desde hace " +
        "casi dos siglos. Hoy os llevo de barra en barra, brindando por el " +
        "pasado.",
      en:
        "I've spent my whole life behind bars in Madrid, inheriting from " +
        "my father and grandfather the trade of tavern-keeping and the " +
        "secrets of every house. I know stories that aren't in any book: " +
        "who founded a party in a back room, which date lies on a stone " +
        "doorway, which samovar has served consommé for almost two " +
        "centuries. Today I'll take you from bar to bar, toasting to the " +
        "past.",
      fr:
        "J'ai passé toute ma vie derrière les comptoirs de Madrid, " +
        "héritant de mon père et de mon grand-père le métier de tavernier " +
        "et les secrets de chaque maison. Je connais des histoires qui ne " +
        "sont dans aucun livre : qui fonda un parti dans l'arrière-" +
        "boutique, quelle date ment sur un portail de pierre, dans quel " +
        "samovar on sert le consommé depuis presque deux siècles. " +
        "Aujourd'hui, je vous emmène de comptoir en comptoir, à trinquer " +
        "au passé.",
    },
  },

  /* Prólogo histórico: contexto general de la tradición tabernaria
     madrileña, antes de que Casiano proponga la ruta concreta. */
  historicalContext: {
    title: {
      es: "El tapeo, una tradición de siglos",
      en: "Tapeo: A Centuries-Old Tradition",
      fr: "Le Tapeo, une Tradition Séculaire",
    },
    text: {
      es:
        "Madrid ha sido, desde el siglo XVIII, una ciudad de tabernas: " +
        "locales pequeños, de barra estañada y toneles a la vista, donde " +
        "el vino y la conversación corrían a partes iguales. Muchas de " +
        "aquellas casas siguen abiertas hoy, casi sin cambiar, en el " +
        "mismo local y a veces con los mismos apellidos al frente." +
        "\n\n" +
        "Por sus barras han pasado toreros, escritores, políticos " +
        "clandestinos y hasta algún rey de incógnito. Algunas escondieron " +
        "reuniones que cambiarían la historia de España; otras fueron, " +
        "simplemente, el lugar donde generaciones de madrileños se " +
        "tomaron la primera caña del día." +
        "\n\n" +
        "En esta ruta recorreréis cinco de esas casas, de finales del " +
        "siglo XVIII a principios del XX, deteniéndoos en cada una a " +
        "tomar algo — como se ha hecho aquí durante más de doscientos " +
        "años.",
      en:
        "Since the 18th century, Madrid has been a city of taverns: small " +
        "establishments with tin-clad bars and barrels on display, where " +
        "wine and conversation flowed in equal measure. Many of those " +
        "houses are still open today, almost unchanged, in the same " +
        "premises and sometimes run by the very same families." +
        "\n\n" +
        "Bullfighters, writers, clandestine politicians and even the odd " +
        "king in disguise have all stood at their bars. Some hosted " +
        "meetings that would change the course of Spanish history; others " +
        "were simply where generations of Madrileños had the first beer " +
        "of the day." +
        "\n\n" +
        "On this route you'll visit five of those houses, from the late " +
        "18th century to the early 20th, stopping at each to have a " +
        "drink — just as people have done here for more than two hundred " +
        "years.",
      fr:
        "Depuis le XVIIIe siècle, Madrid est une ville de tavernes : de " +
        "petits établissements aux comptoirs étamés et aux tonneaux " +
        "apparents, où le vin et la conversation coulaient à parts " +
        "égales. Beaucoup de ces maisons sont encore ouvertes aujourd'hui, " +
        "presque inchangées, dans les mêmes locaux et parfois tenues par " +
        "les mêmes familles." +
        "\n\n" +
        "Des toreros, des écrivains, des politiciens clandestins et même " +
        "quelque roi incognito sont passés à leurs comptoirs. Certaines " +
        "abritèrent des réunions qui allaient changer le cours de " +
        "l'histoire espagnole ; d'autres furent simplement le lieu où des " +
        "générations de Madrilènes prirent la première bière du jour." +
        "\n\n" +
        "Sur cette route, vous visiterez cinq de ces maisons, de la fin " +
        "du XVIIIe siècle au début du XXe, en vous arrêtant à chacune " +
        "pour boire un verre — comme on le fait ici depuis plus de deux " +
        "cents ans.",
    },
    photo: "img/home_madrid.jpg",
    photoCaption: {
      es: "Plaza de la Paja, en pleno barrio de La Latina · Foto: Pablomfa (CC BY-SA 3.0)",
      en: "Plaza de la Paja, in the heart of La Latina · Photo: Pablomfa (CC BY-SA 3.0)",
      fr: "Plaza de la Paja, au cœur de La Latina · Photo : Pablomfa (CC BY-SA 3.0)",
    },
  },

  prologue: {
    title: {
      es: "La invitación de Casiano",
      en: "Casiano's Invitation",
      fr: "L'Invitation de Casiano",
    },
    text: {
      es:
        "Buenas, forasteros. Me llamo Casiano, y llevo detrás de una barra " +
        "más años de los que puedo contar. Conozco cinco casas en Madrid " +
        "que guardan, cada una, un secreto que solo se descubre estando " +
        "allí, copa en mano: una fecha grabada en piedra que no es lo que " +
        "parece, la cuna secreta de un partido político, un consomé que " +
        "lleva sirviéndose igual desde antes de que naciera mi abuelo. " +
        "Vuestra misión: recorrer las cinco, pedir algo de beber en cada " +
        "una, y descifrar su clave antes de seguir a la siguiente. " +
        "Empezamos en Lavapiés, en la que muchos llaman la taberna más " +
        "vieja de Madrid. ¡Salud y buena suerte!",
      en:
        "Evening, strangers. My name's Casiano, and I've been behind a " +
        "bar longer than I can count. I know five houses in Madrid that " +
        "each hold a secret you can only uncover by being there, glass in " +
        "hand: a date carved in stone that isn't what it seems, the " +
        "secret cradle of a political party, a consommé that's been " +
        "served the same way since before my grandfather was born. Your " +
        "mission: visit all five, order a drink at each one, and decipher " +
        "its key before moving to the next. We start in Lavapiés, at what " +
        "many call Madrid's oldest tavern. Cheers, and good luck!",
      fr:
        "Bonsoir, étrangers. Je m'appelle Casiano, et je tiens un " +
        "comptoir depuis plus longtemps que je ne saurais compter. Je " +
        "connais cinq maisons à Madrid qui gardent chacune un secret " +
        "qu'on ne découvre qu'en y étant, verre en main : une date gravée " +
        "dans la pierre qui n'est pas ce qu'elle semble, le berceau " +
        "secret d'un parti politique, un consommé servi de la même façon " +
        "depuis avant la naissance de mon grand-père. Votre mission : " +
        "visiter les cinq, commander à boire à chacune, et déchiffrer sa " +
        "clé avant de passer à la suivante. On commence à Lavapiés, dans " +
        "ce que beaucoup appellent la plus vieille taverne de Madrid. " +
        "Santé, et bonne chance !",
    },
    startLocation: "Calle del Mesón de Paredes, 13",
    startCoords: { lat: 40.41111, lng: -3.70486 },
  },

  victory: {
    title: {
      es: "¡RUTA COMPLETADA!",
      en: "ROUTE COMPLETE!",
      fr: "ROUTE TERMINÉE !",
    },
    text: {
      es:
        "Habéis recorrido cinco siglos de tabernas madrileñas, de Lavapiés " +
        "a la Plaza de Santa Ana, brindando en cada parada como han hecho " +
        "generaciones antes que vosotros. Casiano os invita a la última " +
        "ronda: la habéis ganado a pulso.",
      en:
        "You've journeyed through five centuries of Madrid taverns, from " +
        "Lavapiés to Plaza de Santa Ana, raising a glass at every stop " +
        "just as generations did before you. Casiano's buying the last " +
        "round: you've earned it.",
      fr:
        "Vous avez traversé cinq siècles de tavernes madrilènes, de " +
        "Lavapiés à la Plaza de Santa Ana, levant votre verre à chaque " +
        "étape comme des générations avant vous. Casiano vous offre la " +
        "dernière tournée : vous l'avez bien méritée.",
    },
  },

  /* Las 5 paradas (narrativa, enigmas, pistas y respuestas) NO viven
     aquí: se descargan del backend (backend/worker.js) solo tras validar
     un código de licencia de pago (ver js/license.js). Así el repo
     público no contiene ni las respuestas ni el guion de las pruebas —
     solo se sirven, por HTTPS, a quien ya ha pagado.
     Engine.state.stages sustituye a este array una vez desbloqueado. */
  stages: [],
};

/* GAME_DATA es la versión "resuelta" para el idioma activo: el resto
   de la app (app.js, engine.js) sigue leyendo GAME_DATA.title,
   GAME_DATA.prologue.text, etc. como texto plano de siempre — la
   traducción es transparente para ellos. applyLanguage() se llama al
   arrancar y cada vez que el jugador cambia de idioma. */
const GAME_DATA = {};

function applyLanguage(lang) {
  const stagesBackup = GAME_DATA.stages; // no perder las etapas ya descargadas
  Object.assign(GAME_DATA, I18N.resolve(GAME_DATA_I18N, lang));
  if (stagesBackup && stagesBackup.length && !GAME_DATA_I18N.stages.length) {
    GAME_DATA.stages = stagesBackup;
  }
}
applyLanguage(I18N.getLang() || I18N.detectDefault() || "es");

/* Puntuación */
const SCORING = {
  stageBase: 1000,      // puntos por sello resuelto
  failPenalty: 100,     // por intento fallido
  revealPenalty: 250,   // adicional si se revela la respuesta
  googleBase: 500,      // sin uso en este juego (mecanismo retirado)
  speedBonus: 150,      // resolver a la primera en menos de 2 min
};
