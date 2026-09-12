/* ============================================================
   TABERNAS CON HISTORIA — Backend de licencias
   Cloudflare Worker · sin dependencias · desplegable copiando y
   pegando este archivo en el panel de Cloudflare (Quick Edit).
   ============================================================

   RUTAS:
     POST /api/checkout          → crea una sesión de pago (Stripe)
     POST /api/stripe-webhook    → Stripe notifica el pago; genera el código
     GET  /api/code-for-session  → la página de "gracias" recupera el código
     POST /api/redeem            → valida código + dispositivo, entrega el
                                    juego en el idioma pedido (es/en/fr)

   VARIABLES DE ENTORNO NECESARIAS (Settings → Variables del Worker):
     STRIPE_SECRET_KEY     (Encrypt) — clave secreta de Stripe (sk_live_...)
     STRIPE_WEBHOOK_SECRET (Encrypt) — firma del webhook (whsec_...)
     STRIPE_PRICE_ID                 — ID del precio creado en Stripe (price_...)
     SITE_URL                        — https://dgarciaesc.github.io/scape-room (con ruta)
     ALLOWED_ORIGIN                  — https://dgarciaesc.github.io (SIN ruta: el navegador
                                        nunca incluye la ruta en la cabecera Origin)

   BINDING NECESARIO:
     DB → la base de datos D1 creada con schema.sql
   ============================================================ */

/* ---------- i18n: mismo motor que js/i18n.js del frontend ----------
   Un "nodo i18n" es un objeto con únicamente claves es/en/fr. resolve()
   recorre las 5 paradas y sustituye cada nodo por el texto del idioma
   pedido (con español de red de seguridad si falta una traducción). */
const LANGS = ["es", "en", "fr"];

function isI18nNode(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  const keys = Object.keys(node);
  return keys.length > 0 && keys.every((k) => LANGS.includes(k)) && "es" in node;
}

function resolveI18n(node, lang) {
  if (Array.isArray(node)) return node.map((x) => resolveI18n(x, lang));
  if (node && typeof node === "object") {
    if (isI18nNode(node)) {
      const val = node[lang] !== undefined ? node[lang] : node.es;
      return resolveI18n(val, lang);
    }
    const out = {};
    for (const k in node) out[k] = resolveI18n(node[k], lang);
    return out;
  }
  return node;
}

/* ---------- Contenido real del juego: las 5 paradas ----------
   El contenido real (narrativa, enigmas, respuestas) solo se entrega
   tras validar una licencia — por eso el repo público ya no contiene
   ni los enigmas ni las respuestas.
   Los campos {es,en,fr} se traducen; el resto (coords, fotos,
   respuestas) es igual en cualquier idioma, porque son transcripción
   literal de piedra, latín o cifras — no cambian con el idioma de la
   interfaz. */
const STAGES_I18N = [
  {
    id: "taberna_1_antonio_sanchez",
    num: 1,
    title: {
      es: "La Taberna de los Cuatro Siglos",
      en: "The Tavern of the Four Centuries",
      fr: "La Taverne des Quatre Siècles",
    },
    location: "Calle del Mesón de Paredes, 13",
    landmark: {
      es: "Cabezas de toro disecadas · Taberna Antonio Sánchez",
      en: "Taxidermied bull heads · Taberna Antonio Sánchez",
      fr: "Têtes de taureau naturalisées · Taberna Antonio Sánchez",
    },
    coords: { lat: 40.41111, lng: -3.70486 },
    photo: "img/etapa1_antoniosanchez.jpg",
    photoCaption: {
      es: "Portada de la Taberna Antonio Sánchez · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Taberna Antonio Sánchez · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de la Taberna Antonio Sánchez · Photo : Tamorlan (CC BY 3.0)",
    },
    locationPhoto: "img/etapa1_antoniosanchez.jpg",
    locationPhotoCaption: {
      es: "Portada de la Taberna Antonio Sánchez · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Taberna Antonio Sánchez · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de la Taberna Antonio Sánchez · Photo : Tamorlan (CC BY 3.0)",
    },
    narrative: {
      es: "Bienvenidos a Lavapiés, y a lo que muchos consideran la taberna más antigua de Madrid en activo: sus orígenes se remontan a 1787, según las investigaciones del historiador Antonio Pàsies.\n\nLe da nombre Antonio Sánchez, comerciante de vinos manchego que compró el local en 1884. Su hijo, también Antonio, fue torero y tomó la alternativa en 1922 de la mano de Ignacio Sánchez Mejías — de ahí la decoración taurina que cubre sus paredes.\n\nPor aquí pasaron Pío Baroja, el pintor Ignacio Zuloaga o Gregorio Marañón, y sus torrijas eran tan famosas que el mismísimo Alfonso XIII las pedía para desayunar.",
      en: "Welcome to Lavapiés, and to what many consider Madrid's oldest tavern still in business: its origins go back to 1787, according to research by historian Antonio Pàsies.\n\nIt takes its name from Antonio Sánchez, a wine merchant from La Mancha who bought the place in 1884. His son, also Antonio, was a bullfighter who took his 'alternativa' in 1922 under Ignacio Sánchez Mejías — hence the bullfighting decor covering its walls.\n\nPío Baroja, the painter Ignacio Zuloaga and Gregorio Marañón all drank here, and its torrijas (a Spanish version of French toast) were so famous that King Alfonso XIII himself would order them for breakfast.",
      fr: "Bienvenue à Lavapiés, et dans ce que beaucoup considèrent comme la plus ancienne taverne de Madrid encore en activité : ses origines remontent à 1787, selon les recherches de l'historien Antonio Pàsies.\n\nElle doit son nom à Antonio Sánchez, marchand de vin originaire de la Manche, qui racheta le local en 1884. Son fils, également prénommé Antonio, fut torero et reçut son « alternativa » en 1922 des mains d'Ignacio Sánchez Mejías — d'où le décor tauromachique qui recouvre ses murs.\n\nPío Baroja, le peintre Ignacio Zuloaga ou Gregorio Marañón y burent un verre, et ses torrijas étaient si célèbres que le roi Alphonse XIII lui-même les faisait venir pour son petit-déjeuner.",
    },
    enigma: {
      es: "En las paredes de la taberna se conservan cabezas de toro disecadas, trofeos de animales lidiados en 1902.\n\nConvierte ese año al lenguaje de los romanos — el mismo que usaban los carteles de toros de la época para anunciar la fecha de la corrida.",
      en: "On the tavern's walls hang taxidermied bull heads, trophies from bulls fought in the ring in 1902.\n\nConvert that year into the language of the Romans — the same one bullfight posters of the time used to announce the date.",
      fr: "Sur les murs de la taverne sont accrochées des têtes de taureau naturalisées, trophées d'animaux combattus dans l'arène en 1902.\n\nConvertissez cette année dans la langue des Romains — celle-là même qu'utilisaient les affiches de corridas de l'époque pour annoncer la date.",
    },
    answerFormat: {
      es: "NÚMERO ROMANO",
      en: "ROMAN NUMERAL",
      fr: "CHIFFRE ROMAIN",
    },
    hintSubtle: {
      es: "Busca en la pared las cabezas de toro disecadas — suelen llevar una pequeña placa con el año en que se lidió a cada animal. El año que buscas es 1902. Recuerda: M=1000, CM=900, II=2.",
      en: "Look on the wall for the taxidermied bull heads — they usually carry a small plaque with the year each bull was fought. The year you need is 1902. Remember: M=1000, CM=900, II=2.",
      fr: "Cherchez sur le mur les têtes de taureau naturalisées — elles portent généralement une petite plaque avec l'année du combat. L'année recherchée est 1902. Rappel : M=1000, CM=900, II=2.",
    },
    directions: {
      es: ["Entra en la Taberna Antonio Sánchez, Calle del Mesón de Paredes, 13.", "Busca en las paredes las cabezas de toro disecadas y localiza el año 1902.", "Convierte 1902 a números romanos: MCMII."],
      en: ["Go into Taberna Antonio Sánchez, Calle del Mesón de Paredes, 13.", "Look on the walls for the taxidermied bull heads and find the year 1902.", "Convert 1902 into Roman numerals: MCMII."],
      fr: ["Entrez dans la Taberna Antonio Sánchez, Calle del Mesón de Paredes, 13.", "Cherchez sur les murs les têtes de taureau naturalisées et repérez l'année 1902.", "Convertissez 1902 en chiffres romains : MCMII."],
    },
    answer: "MCMII",
    acceptedAnswers: ["MCMII", "mcmii"],
    revealExplanation: {
      es: "1902 en números romanos se escribe MCMII (M=1000, CM=900, II=2). Es el año en que fueron lidiados los toros cuyas cabezas decoran hoy la taberna, parte de la tradición taurina que dio nombre al segundo Antonio Sánchez, hijo del fundador.",
      en: "1902 in Roman numerals is written MCMII (M=1000, CM=900, II=2). That's the year the bulls whose heads decorate the tavern today were fought — part of the bullfighting tradition that gave the second Antonio Sánchez, the founder's son, his name.",
      fr: "1902 s'écrit MCMII en chiffres romains (M=1000, CM=900, II=2). C'est l'année où furent combattus les taureaux dont les têtes décorent aujourd'hui la taverne, partie de la tradition tauromachique qui donna son nom au second Antonio Sánchez, fils du fondateur.",
    },
    transition: {
      type: "walk",
      text: {
        es: "Sal de la taberna y sube por la Calle del Mesón de Paredes hacia el norte; continúa por la Calle de la Cabeza hasta enlazar con la Calle de Toledo. Sigue por Toledo en dirección a la Plaza Mayor y busca, a tu izquierda, el Arco de Cuchilleros: bájalo hasta la Calle de Cuchilleros.",
        en: "Leave the tavern and head north up Calle del Mesón de Paredes; continue onto Calle de la Cabeza until it meets Calle de Toledo. Follow Toledo toward Plaza Mayor and look on your left for the Arco de Cuchilleros archway: go down it onto Calle de Cuchilleros.",
        fr: "Quittez la taverne et remontez vers le nord par la Calle del Mesón de Paredes ; continuez par la Calle de la Cabeza jusqu'à rejoindre la Calle de Toledo. Suivez Toledo en direction de la Plaza Mayor et repérez, sur votre gauche, l'arche de l'Arco de Cuchilleros : descendez-la jusqu'à la Calle de Cuchilleros.",
      },
    },
  },
  {
    id: "taberna_2_botin",
    num: 2,
    title: {
      es: "La Fecha Mentirosa",
      en: "The Lying Date",
      fr: "La Date Menteuse",
    },
    location: "Calle de Cuchilleros, 17",
    landmark: {
      es: "Portada de piedra · Sobrino de Botín",
      en: "Stone doorway · Sobrino de Botín",
      fr: "Portail de pierre · Sobrino de Botín",
    },
    coords: { lat: 40.41421, lng: -3.70809 },
    photo: "img/etapa2_botin.jpg",
    photoCaption: {
      es: "Portada de Sobrino de Botín, Calle de Cuchilleros · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Sobrino de Botín, Calle de Cuchilleros · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de Sobrino de Botín, Calle de Cuchilleros · Photo : Tamorlan (CC BY 3.0)",
    },
    locationPhoto: "img/etapa2_botin.jpg",
    locationPhotoCaption: {
      es: "Portada de Sobrino de Botín, Calle de Cuchilleros · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Sobrino de Botín, Calle de Cuchilleros · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de Sobrino de Botín, Calle de Cuchilleros · Photo : Tamorlan (CC BY 3.0)",
    },
    narrative: {
      es: "Botín figura en el Libro Guinness de los Récords como el restaurante más antiguo del mundo, gracias a una fecha grabada en la portada de piedra de su entrada. Millones de visitantes la fotografían cada año.\n\nHay un problema: los historiadores han demostrado que esa fecha corresponde solo a la antigüedad del edificio, no del negocio. El restaurante, bajo el nombre \"Sobrino de Botín\", no abrió hasta 1865, cuando Cándido Remis —sobrino del pastelero conocido como \"Botín\"— rompió con el dueño anterior y montó su propio local en esta misma calle.\n\nSea como sea, esa fecha discutida es hoy el reclamo comercial más fotografiado de todo Madrid — y la clave que necesitáis para este sello.",
      en: "Botín is listed in the Guinness Book of Records as the world's oldest restaurant, thanks to a date carved into the stone doorway of its entrance. Millions of visitors photograph it every year.\n\nThere's a catch: historians have shown that date only proves the age of the building, not of the business. The restaurant, under the name 'Sobrino de Botín,' didn't open until 1865, when Cándido Remis — nephew of a pastry-maker known as 'Botín' — broke away from the previous owner and opened his own place on this very street.\n\nEither way, that disputed date is today Madrid's most photographed marketing claim — and the key you need for this seal.",
      fr: "Botín figure au Livre Guinness des records comme le plus ancien restaurant du monde, grâce à une date gravée sur le portail de pierre de son entrée. Des millions de visiteurs la photographient chaque année.\n\nIl y a un hic : les historiens ont démontré que cette date ne prouve que l'ancienneté du bâtiment, pas celle du commerce. Le restaurant, sous le nom « Sobrino de Botín », n'ouvrit qu'en 1865, quand Cándido Remis — neveu d'un pâtissier surnommé « Botín » — rompit avec le précédent propriétaire et ouvrit son propre établissement dans cette même rue.\n\nQuoi qu'il en soit, cette date contestée est aujourd'hui l'argument commercial le plus photographié de tout Madrid — et la clé dont vous avez besoin pour ce sceau.",
    },
    enigma: {
      es: "Busca, sobre la puerta de entrada, la fecha grabada en piedra que Guinness reconoce como la de fundación del restaurante más antiguo del mundo — aunque los historiadores no estén tan seguros.\n\nEscribe esa fecha, tal como está grabada.",
      en: "Look above the entrance door for the date carved in stone — the one Guinness recognises as the founding date of the world's oldest restaurant, even if historians aren't so sure.\n\nWrite down that date, exactly as it's carved.",
      fr: "Cherchez, au-dessus de la porte d'entrée, la date gravée dans la pierre — celle que le Guinness reconnaît comme la date de fondation du plus ancien restaurant du monde, même si les historiens en doutent.\n\nÉcrivez cette date, telle qu'elle est gravée.",
    },
    answerFormat: {
      es: "CUATRO CIFRAS",
      en: "FOUR DIGITS",
      fr: "QUATRE CHIFFRES",
    },
    hintSubtle: {
      es: "Levanta la vista hacia la portada de piedra, justo encima de la puerta de la calle Cuchilleros, 17. Ahí hay grabado un año de cuatro cifras, muy anterior al nacimiento del propio restaurante.",
      en: "Look up at the stone doorway, right above the entrance at Calle de Cuchilleros, 17. There's a four-digit year carved there, much earlier than the restaurant itself.",
      fr: "Levez les yeux vers le portail de pierre, juste au-dessus de la porte au 17 Calle de Cuchilleros. Une année de quatre chiffres y est gravée, bien antérieure à la naissance du restaurant lui-même.",
    },
    directions: {
      es: ["Sitúate frente a la entrada de Sobrino de Botín, Calle de Cuchilleros, 17.", "Busca la fecha grabada en la portada de piedra, sobre la puerta.", "Escribe esa fecha de cuatro cifras."],
      en: ["Stand in front of the entrance to Sobrino de Botín, Calle de Cuchilleros, 17.", "Find the date carved in the stone doorway, above the door.", "Write down that four-digit date."],
      fr: ["Placez-vous devant l'entrée de Sobrino de Botín, Calle de Cuchilleros, 17.", "Trouvez la date gravée dans le portail de pierre, au-dessus de la porte.", "Écrivez cette date de quatre chiffres."],
    },
    answer: "1725",
    acceptedAnswers: ["1725"],
    revealExplanation: {
      es: "La fecha grabada es 1725. Es la que Guinness usa para certificar a Botín como el restaurante más antiguo del mundo, aunque en realidad solo demuestra que el edificio (no el negocio) ya existía entonces — el propio restaurante, bajo ese nombre, abrió en 1865.",
      en: "The carved date is 1725. It's the one Guinness uses to certify Botín as the world's oldest restaurant, though it really only proves the building (not the business) already existed then — the restaurant itself, under that name, opened in 1865.",
      fr: "La date gravée est 1725. C'est celle que le Guinness utilise pour certifier Botín comme le plus ancien restaurant du monde, bien qu'elle ne prouve en réalité que l'existence du bâtiment (pas du commerce) à cette époque — le restaurant lui-même, sous ce nom, ouvrit en 1865.",
    },
    transition: {
      type: "walk",
      text: {
        es: "Sube por la Calle de Cuchilleros hasta el Arco de Cuchilleros y entra en la Plaza Mayor. Crúzala en diagonal y sal por la Calle de Postas, que desemboca directamente en la Puerta del Sol. Busca, saliendo de Sol, la Calle de Tetuán.",
        en: "Go up Calle de Cuchilleros to the Arco de Cuchilleros archway and step into Plaza Mayor. Cross it diagonally and exit onto Calle de Postas, which leads straight into Puerta del Sol. From Sol, look for Calle de Tetuán.",
        fr: "Remontez la Calle de Cuchilleros jusqu'à l'arche de l'Arco de Cuchilleros et entrez sur la Plaza Mayor. Traversez-la en diagonale et sortez par la Calle de Postas, qui débouche directement sur la Puerta del Sol. Depuis Sol, repérez la Calle de Tetuán.",
      },
    },
  },
  {
    id: "taberna_3_casa_labra",
    num: 3,
    title: {
      es: "El Nacimiento Clandestino",
      en: "The Clandestine Birth",
      fr: "La Naissance Clandestine",
    },
    location: "Calle de Tetuán, 12",
    landmark: {
      es: "Placa conmemorativa · Casa Labra",
      en: "Commemorative plaque · Casa Labra",
      fr: "Plaque commémorative · Casa Labra",
    },
    coords: { lat: 40.41716, lng: -3.70461 },
    photo: "img/etapa3_casalabra.jpg",
    photoCaption: {
      es: "Fachada de Casa Labra, Calle de Tetuán · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Casa Labra, Calle de Tetuán · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de Casa Labra, Calle de Tetuán · Photo : Tamorlan (CC BY 3.0)",
    },
    locationPhoto: "img/etapa3_casalabra.jpg",
    locationPhotoCaption: {
      es: "Fachada de Casa Labra, Calle de Tetuán · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Casa Labra, Calle de Tetuán · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de Casa Labra, Calle de Tetuán · Photo : Tamorlan (CC BY 3.0)",
    },
    narrative: {
      es: "Casa Labra abrió sus puertas en 1860, a un paso de la Puerta del Sol. Es célebre por sus soldaditos de Pavía (bacalao rebozado) y por un espejo de época que advierte: «El que bien bebe hace lo que debe».\n\nPero su verdadera fama es política: el 2 de mayo de 1879, un grupo de obreros e intelectuales se reunió aquí en secreto, bajo la vigilancia de la policía de la Restauración, para fundar el Partido Socialista Obrero Español.\n\nLos encabezaba un joven tipógrafo llamado Pablo Iglesias, que llegaría a ser el primer líder del partido. Hoy, una placa en la fachada recuerda aquel encuentro clandestino que cambiaría la política española.",
      en: "Casa Labra opened its doors in 1860, a stone's throw from Puerta del Sol. It's famous for its soldaditos de Pavía (battered salt cod) and for a period mirror that warns: 'He who drinks well does his duty.'\n\nBut its true fame is political: on 2 May 1879, a group of workers and intellectuals met here in secret, under the watch of the Restoration-era police, to found the Spanish Socialist Workers' Party (PSOE).\n\nThey were led by a young typesetter named Pablo Iglesias, who would become the party's first leader. Today a plaque on the façade commemorates that clandestine meeting that would change Spanish politics.",
      fr: "Casa Labra ouvrit ses portes en 1860, à deux pas de la Puerta del Sol. Elle est célèbre pour ses soldaditos de Pavía (morue frite en beignet) et pour un miroir d'époque qui avertit : « Qui boit bien fait son devoir ».\n\nMais sa véritable renommée est politique : le 2 mai 1879, un groupe d'ouvriers et d'intellectuels se réunit ici en secret, sous la surveillance de la police de la Restauration, pour fonder le Parti Socialiste Ouvrier Espagnol (PSOE).\n\nIls étaient menés par un jeune typographe nommé Pablo Iglesias, qui deviendrait le premier dirigeant du parti. Aujourd'hui, une plaque sur la façade rappelle cette réunion clandestine qui allait changer la politique espagnole.",
    },
    enigma: {
      es: "En la fachada de Casa Labra hay una placa que recuerda la fundación clandestina de un partido político, en pleno siglo XIX.\n\nBusca el apellido de quien lideró aquel grupo de obreros e intelectuales, y el año exacto en que se reunieron.",
      en: "On the façade of Casa Labra there's a plaque commemorating the clandestine founding of a political party, in the middle of the 19th century.\n\nFind the surname of the person who led that group of workers and intellectuals, and the exact year they met.",
      fr: "Sur la façade de Casa Labra se trouve une plaque commémorant la fondation clandestine d'un parti politique, en plein XIXe siècle.\n\nTrouvez le nom de famille de la personne qui dirigea ce groupe d'ouvriers et d'intellectuels, ainsi que l'année exacte de cette réunion.",
    },
    answerFormat: {
      es: "APELLIDO-AÑO",
      en: "SURNAME-YEAR",
      fr: "NOM-ANNÉE",
    },
    hintSubtle: {
      es: "La placa está en la fachada exterior del local, en la Calle de Tetuán, 12. Recuerda a un tipógrafo que lideró la reunión: su apellido es Iglesias. El año en que ocurrió fue 1879.",
      en: "The plaque is on the outside façade of the building, at Calle de Tetuán, 12. It honours a typesetter who led the meeting: his surname is Iglesias. It happened in the year 1879.",
      fr: "La plaque se trouve sur la façade extérieure du local, au 12 Calle de Tetuán. Elle honore un typographe qui dirigea la réunion : son nom est Iglesias. Cela se passa en l'année 1879.",
    },
    directions: {
      es: ["Sitúate frente a la fachada de Casa Labra, Calle de Tetuán, 12.", "Busca la placa conmemorativa y lee el nombre del líder y el año.", "Escribe el apellido seguido del año, unidos por un guion."],
      en: ["Stand in front of the façade of Casa Labra, Calle de Tetuán, 12.", "Find the commemorative plaque and read the leader's name and the year.", "Write the surname followed by the year, joined by a hyphen."],
      fr: ["Placez-vous devant la façade de Casa Labra, Calle de Tetuán, 12.", "Trouvez la plaque commémorative et lisez le nom du dirigeant et l'année.", "Écrivez le nom de famille suivi de l'année, reliés par un tiret."],
    },
    answer: "IGLESIAS-1879",
    acceptedAnswers: ["IGLESIAS-1879", "PABLO IGLESIAS-1879", "IGLESIAS 1879"],
    revealExplanation: {
      es: "El 2 de mayo de 1879, Pablo Iglesias Posse y un grupo de obreros e intelectuales fundaron aquí, clandestinamente, el PSOE. Iglesias sería su primer presidente y, más tarde, el primer diputado socialista en el Congreso español.",
      en: "On 2 May 1879, Pablo Iglesias Posse and a group of workers and intellectuals clandestinely founded the PSOE here. Iglesias would become its first president and, later, the first socialist deputy in the Spanish Congress.",
      fr: "Le 2 mai 1879, Pablo Iglesias Posse et un groupe d'ouvriers et d'intellectuels fondèrent ici, clandestinement, le PSOE. Iglesias en deviendrait le premier président puis le premier député socialiste au Congrès espagnol.",
    },
    transition: {
      type: "walk",
      text: {
        es: "Vuelve a la Puerta del Sol y busca la salida hacia la Carrera de San Jerónimo, la calle que sale de Sol en dirección al Congreso de los Diputados. Camina por ella poco más de 200 metros: el número 8 queda a tu derecha.",
        en: "Return to Puerta del Sol and find the exit onto Carrera de San Jerónimo, the street leading out of Sol toward the Congress of Deputies. Walk just over 200 metres along it: number 8 will be on your right.",
        fr: "Retournez à la Puerta del Sol et trouvez la sortie vers la Carrera de San Jerónimo, la rue qui part de Sol en direction du Congrès des Députés. Marchez un peu plus de 200 mètres : le numéro 8 sera sur votre droite.",
      },
    },
  },
  {
    id: "taberna_4_lhardy",
    num: 4,
    title: {
      es: "El Consomé del Samovar",
      en: "The Samovar Consommé",
      fr: "Le Consommé du Samovar",
    },
    location: "Carrera de San Jerónimo, 8",
    landmark: {
      es: "Puerta de caoba y samovar · Lhardy",
      en: "Mahogany door and samovar · Lhardy",
      fr: "Porte en acajou et samovar · Lhardy",
    },
    coords: { lat: 40.4166, lng: -3.70138 },
    photo: "img/etapa4_lhardy.jpg",
    photoCaption: {
      es: "Portada de Lhardy, Carrera de San Jerónimo · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Lhardy, Carrera de San Jerónimo · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de Lhardy, Carrera de San Jerónimo · Photo : Tamorlan (CC BY 3.0)",
    },
    locationPhoto: "img/etapa4_lhardy.jpg",
    locationPhotoCaption: {
      es: "Portada de Lhardy, Carrera de San Jerónimo · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Lhardy, Carrera de San Jerónimo · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de Lhardy, Carrera de San Jerónimo · Photo : Tamorlan (CC BY 3.0)",
    },
    narrative: {
      es: "El francés Émile Huguenin, convertido en «Emilio Lhardy» —quizá por inspiración del Café Hardy de París—, abrió este establecimiento en 1839, cuando la Carrera de San Jerónimo era, según Galdós, una de las calles más transitadas de Madrid.\n\nEmpezó como pastelería y con el tiempo se convirtió en el restaurante de la alta sociedad madrileña, con salones donde se celebraron cenas de Estado. Su seña de identidad, desde el principio, es el consomé caliente que los clientes se sirven ellos mismos de un samovar plateado, junto al mostrador de la tienda.\n\nEn 1885, el decorador Rafael Guerrero instaló la elegante puerta de caoba antillana que hoy sigue recibiendo a los clientes — casi medio siglo después de que el propio restaurante abriera sus puertas por primera vez.",
      en: "The Frenchman Émile Huguenin, who became 'Emilio Lhardy' — perhaps inspired by the Café Hardy in Paris — opened this establishment in 1839, when Carrera de San Jerónimo was, according to novelist Galdós, one of the busiest streets in Madrid.\n\nIt started as a pastry shop and over time became the restaurant of Madrid high society, with function rooms that hosted state dinners. Its hallmark, from the very beginning, has been the hot consommé that customers serve themselves from a silver samovar by the shop counter.\n\nIn 1885, decorator Rafael Guerrero installed the elegant West Indian mahogany door that still greets customers today — almost half a century after the restaurant itself first opened.",
      fr: "Le Français Émile Huguenin, devenu « Emilio Lhardy » — peut-être inspiré par le Café Hardy de Paris —, ouvrit cet établissement en 1839, quand la Carrera de San Jerónimo était, selon le romancier Galdós, l'une des rues les plus fréquentées de Madrid.\n\nIl débuta comme pâtisserie et devint avec le temps le restaurant de la haute société madrilène, avec des salons où se tinrent des dîners d'État. Sa marque de fabrique, dès le départ, est le consommé chaud que les clients se servent eux-mêmes depuis un samovar argenté, près du comptoir de la boutique.\n\nEn 1885, le décorateur Rafael Guerrero installa l'élégante porte en acajou des Antilles qui accueille encore les clients aujourd'hui — près d'un demi-siècle après l'ouverture même du restaurant.",
    },
    enigma: {
      es: "La elegante puerta de caoba de la entrada es obra de un decorador de 1885 — pero el restaurante ya llevaba décadas sirviendo consomé cuando se instaló esa puerta.\n\nBusca, dentro del local, el año real en que abrió Lhardy por primera vez.",
      en: "The elegant mahogany door at the entrance is the work of a decorator from 1885 — but the restaurant had already been serving consommé for decades by the time that door was installed.\n\nFind, inside the venue, the real year Lhardy first opened.",
      fr: "L'élégante porte en acajou de l'entrée est l'œuvre d'un décorateur de 1885 — mais le restaurant servait déjà du consommé depuis des décennies quand cette porte fut installée.\n\nTrouvez, à l'intérieur de l'établissement, l'année réelle où Lhardy a ouvert pour la première fois.",
    },
    answerFormat: {
      es: "CUATRO CIFRAS",
      en: "FOUR DIGITS",
      fr: "QUATRE CHIFFRES",
    },
    hintSubtle: {
      es: "No es 1885 (esa es la fecha de la puerta de caoba). Busca en la tienda, cerca del samovar plateado donde se sirve el consomé, alguna referencia al año de apertura del negocio: 1839.",
      en: "It's not 1885 (that's the mahogany door's date). Look in the shop, near the silver samovar where the consommé is served, for a reference to the year the business opened: 1839.",
      fr: "Ce n'est pas 1885 (c'est la date de la porte en acajou). Cherchez dans la boutique, près du samovar argenté où l'on sert le consommé, une référence à l'année d'ouverture du commerce : 1839.",
    },
    directions: {
      es: ["Entra en Lhardy, Carrera de San Jerónimo, 8.", "Busca en la tienda el año de fundación del restaurante, no el de la puerta.", "Escribe ese año: 1839."],
      en: ["Go into Lhardy, Carrera de San Jerónimo, 8.", "Find, inside the shop, the restaurant's founding year — not the door's.", "Write down that year: 1839."],
      fr: ["Entrez chez Lhardy, Carrera de San Jerónimo, 8.", "Trouvez dans la boutique l'année de fondation du restaurant, pas celle de la porte.", "Écrivez cette année : 1839."],
    },
    answer: "1839",
    acceptedAnswers: ["1839"],
    revealExplanation: {
      es: "Lhardy abrió en 1839, fundado por Émile Huguenin —«Emilio Lhardy»—. La puerta de caoba es 46 años más joven que el propio negocio: la instaló el decorador Rafael Guerrero en 1885, cuando el restaurante ya era toda una institución madrileña.",
      en: "Lhardy opened in 1839, founded by Émile Huguenin — 'Emilio Lhardy.' The mahogany door is 46 years younger than the business itself: decorator Rafael Guerrero installed it in 1885, by which point the restaurant was already a Madrid institution.",
      fr: "Lhardy ouvrit en 1839, fondé par Émile Huguenin — « Emilio Lhardy ». La porte en acajou a 46 ans de moins que le commerce lui-même : le décorateur Rafael Guerrero l'installa en 1885, alors que le restaurant était déjà une institution madrilène.",
    },
    transition: {
      type: "walk",
      text: {
        es: "Sigue por la Carrera de San Jerónimo en la misma dirección y toma la primera bocacalle a la izquierda, la Calle del Príncipe. Camina por ella hasta que desemboque en la Plaza de Santa Ana: la Cervecería Alemana está en el número 6, en la propia plaza.",
        en: "Continue along Carrera de San Jerónimo in the same direction and take the first side street on your left, Calle del Príncipe. Walk down it until it opens onto Plaza de Santa Ana: Cervecería Alemana is at number 6, right on the square.",
        fr: "Continuez sur la Carrera de San Jerónimo dans la même direction et prenez la première rue à gauche, la Calle del Príncipe. Suivez-la jusqu'à déboucher sur la Plaza de Santa Ana : la Cervecería Alemana se trouve au numéro 6, sur la place même.",
      },
    },
  },
  {
    id: "taberna_5_cerveceria_alemana",
    num: 5,
    title: {
      es: "El Rincón Bávaro — Clímax final",
      en: "The Bavarian Corner — Final Climax",
      fr: "Le Coin Bavarois — Apothéose finale",
    },
    location: "Plaza de Santa Ana, 6",
    landmark: {
      es: "Fachada de madera · Cervecería Alemana",
      en: "Wooden façade · Cervecería Alemana",
      fr: "Façade en bois · Cervecería Alemana",
    },
    coords: { lat: 40.41447, lng: -3.70035 },
    photo: "img/etapa5_alemana.jpg",
    photoCaption: {
      es: "Fachada de la Cervecería Alemana, Plaza de Santa Ana · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Cervecería Alemana, Plaza de Santa Ana · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de la Cervecería Alemana, Plaza de Santa Ana · Photo : Tamorlan (CC BY 3.0)",
    },
    locationPhoto: "img/etapa5_alemana.jpg",
    locationPhotoCaption: {
      es: "Fachada de la Cervecería Alemana, Plaza de Santa Ana · Foto: Tamorlan (CC BY 3.0)",
      en: "Façade of Cervecería Alemana, Plaza de Santa Ana · Photo: Tamorlan (CC BY 3.0)",
      fr: "Façade de la Cervecería Alemana, Plaza de Santa Ana · Photo : Tamorlan (CC BY 3.0)",
    },
    narrative: {
      es: "En 1904, un grupo de comerciantes alemanes instalados en Madrid abrió esta cervecería en la Plaza de Santa Ana, recreando en su interior el ambiente de una taberna bávara — con su gran espejo y su chimenea, hoy perdidos.\n\nEn 1924 pasó a manos de un joven empresario asturiano, Ramón González Peláez, cuya familia la regenta desde entonces. En 1980 fue reconocida como Establecimiento Tradicional Madrileño.\n\nPor su barra han pasado embajadores, toreros como Luis Miguel Dominguín y estrellas de Hollywood como Ava Gardner — pero fue un escritor, premio Nobel de Literatura, quien la hizo célebre en medio mundo. Aquí termina vuestra ruta por los bares con más historia de Madrid.",
      en: "In 1904, a group of German merchants settled in Madrid opened this beer hall on Plaza de Santa Ana, recreating inside it the atmosphere of a Bavarian tavern — complete with a large mirror and a fireplace, both long since lost.\n\nIn 1924 it passed into the hands of a young businessman from Asturias, Ramón González Peláez, whose family has run it ever since. In 1980 it was recognised as a Traditional Madrid Establishment.\n\nAmbassadors, bullfighters like Luis Miguel Dominguín and Hollywood stars like Ava Gardner have all stood at its bar — but it was a writer, a Nobel Prize winner, who made it famous across half the world. Here your route through Madrid's most historic bars comes to an end.",
      fr: "En 1904, un groupe de commerçants allemands installés à Madrid ouvrit cette brasserie sur la Plaza de Santa Ana, y recréant l'ambiance d'une taverne bavaroise — avec son grand miroir et sa cheminée, aujourd'hui disparus.\n\nEn 1924, elle passa entre les mains d'un jeune entrepreneur asturien, Ramón González Peláez, dont la famille la dirige depuis. En 1980, elle fut reconnue comme Établissement Traditionnel Madrilène.\n\nDes ambassadeurs, des toreros comme Luis Miguel Dominguín et des stars hollywoodiennes comme Ava Gardner sont passés à son comptoir — mais c'est un écrivain, prix Nobel de littérature, qui la rendit célèbre dans la moitié du monde. C'est ici que s'achève votre route à travers les bars les plus chargés d'histoire de Madrid.",
    },
    enigma: {
      es: "En este rincón bávaro en pleno Madrid se reunían embajadores, toreros y estrellas de cine — pero fue un escritor, ganador del Premio Nobel años después de frecuentar la casa, quien la hizo famosa en medio mundo.\n\nBusca el año en que este local abrió sus puertas y el apellido de ese escritor para sellar la clave final de la ruta.",
      en: "In this Bavarian corner of Madrid, ambassadors, bullfighters and film stars used to gather — but it was a writer, who won the Nobel Prize years after being a regular here, who made it famous across half the world.\n\nFind the year this venue opened its doors and the surname of that writer to seal the final key of the route.",
      fr: "Dans ce coin bavarois en plein Madrid se retrouvaient ambassadeurs, toreros et stars de cinéma — mais c'est un écrivain, prix Nobel des années après avoir fréquenté la maison, qui la rendit célèbre dans la moitié du monde.\n\nTrouvez l'année d'ouverture de cet établissement et le nom de cet écrivain pour sceller la clé finale de la route.",
    },
    answerFormat: {
      es: "APELLIDO-AÑO",
      en: "SURNAME-YEAR",
      fr: "NOM-ANNÉE",
    },
    hintSubtle: {
      es: "El escritor, premio Nobel de Literatura en 1954, se llamaba Ernest Hemingway. El año de fundación de la cervecería está en su fachada de madera tradicional: 1904.",
      en: "The writer, who won the Nobel Prize in Literature in 1954, was named Ernest Hemingway. The beer hall's founding year is on its traditional wooden façade: 1904.",
      fr: "L'écrivain, prix Nobel de littérature en 1954, s'appelait Ernest Hemingway. L'année de fondation de la brasserie figure sur sa façade en bois traditionnelle : 1904.",
    },
    directions: {
      es: ["Sitúate frente a la Cervecería Alemana, Plaza de Santa Ana, 6.", "Busca en la fachada de madera el año de fundación del local.", "Añade el apellido del escritor y Nobel que la hizo famosa: Hemingway."],
      en: ["Stand in front of Cervecería Alemana, Plaza de Santa Ana, 6.", "Find the venue's founding year on the wooden façade.", "Add the surname of the Nobel-winning writer who made it famous: Hemingway."],
      fr: ["Placez-vous devant la Cervecería Alemana, Plaza de Santa Ana, 6.", "Trouvez l'année de fondation du lieu sur la façade en bois.", "Ajoutez le nom de l'écrivain Nobel qui la rendit célèbre : Hemingway."],
    },
    answer: "HEMINGWAY-1904",
    acceptedAnswers: ["HEMINGWAY-1904", "ERNEST HEMINGWAY-1904", "HEMINGWAY 1904"],
    revealExplanation: {
      es: "La Cervecería Alemana abrió en 1904. Entre sus parroquianos más ilustres estuvo Ernest Hemingway, premio Nobel de Literatura en 1954, que la convirtió en parada obligada de cuantos seguían sus pasos por Madrid.",
      en: "Cervecería Alemana opened in 1904. Among its most illustrious regulars was Ernest Hemingway, who won the Nobel Prize in Literature in 1954, turning it into a must-visit stop for anyone following his footsteps through Madrid.",
      fr: "La Cervecería Alemana ouvrit en 1904. Parmi ses habitués les plus illustres figurait Ernest Hemingway, prix Nobel de littérature en 1954, qui en fit une étape incontournable pour quiconque suivait ses traces à Madrid.",
    },
    transition: { type: "victory" },
  },
];

/* ============================================================
   Utilidades
   ============================================================ */

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/* Orígenes de desarrollo local permitidos además del de producción — así
   se puede probar el juego con `python3 serve.py` sin CORS-checks a mano.
   No es una rendija de seguridad real: solo se añaden estos orígenes
   concretos y conocidos, nunca un comodín "*". */
const LOCAL_DEV_ORIGINS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

function resolveOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (origin && LOCAL_DEV_ORIGINS.includes(origin)) return origin;
  return env.ALLOWED_ORIGIN || "*";
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

/* Código legible sin caracteres ambiguos (0/O, 1/I/L) */
function generateCode() {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `MADRID-${code}`;
}

/* Verificación de la firma del webhook de Stripe (esquema HMAC-SHA256
   documentado por Stripe), implementada con Web Crypto — sin SDK. */
async function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => p.split("="))
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedPayload = `${timestamp}.${rawBody}`;
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

async function stripeFetch(env, path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Error de Stripe");
  return data;
}

/* ============================================================
   Rutas
   ============================================================ */

/* POST /api/checkout — crea una sesión de pago y devuelve la URL
   a la que redirigir al comprador. */
async function handleCheckout(request, env) {
  const session = await stripeFetch(env, "checkout/sessions", {
    mode: "payment",
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    success_url: `${env.SITE_URL}/gracias.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.SITE_URL}/`,
  });
  return json({ url: session.url }, 200, env);
}

/* POST /api/stripe-webhook — Stripe notifica el pago confirmado.
   Genera el código de licencia y lo guarda en D1. */
async function handleWebhook(request, env) {
  const rawBody = await request.text();
  const sig = request.headers.get("Stripe-Signature");
  const valid = await verifyStripeSignature(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return new Response("firma inválida", { status: 400 });

  const event = JSON.parse(rawBody);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const code = generateCode();
    await env.DB.prepare(
      `INSERT INTO licenses (code, stripe_session_id, email, status, created_at)
       VALUES (?, ?, ?, 'unused', ?)`
    )
      .bind(code, session.id, session.customer_details?.email || null, Date.now())
      .run();
  }
  return new Response("ok", { status: 200 });
}

/* GET /api/code-for-session?session_id=... — la página de "gracias"
   recupera el código recién generado para mostrarlo al comprador. */
async function handleCodeForSession(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return json({ error: "falta session_id" }, 400, env);

  const row = await env.DB.prepare(
    "SELECT code FROM licenses WHERE stripe_session_id = ?"
  )
    .bind(sessionId)
    .first();

  if (!row) {
    // el webhook de Stripe puede tardar unos segundos en llegar
    return json({ pending: true }, 202, env);
  }
  return json({ code: row.code }, 200, env);
}

/* POST /api/redeem — valida código + dispositivo y, si es correcto,
   entrega el contenido real del juego (las 6 pruebas) en el idioma
   pedido. `lang` es opcional (es/en/fr, por defecto es); se puede
   volver a llamar con el mismo código+dispositivo para recargar el
   contenido en otro idioma sin gastar una nueva activación. */
const REDEEM_ERRORS = {
  missing: { es: "Faltan datos.", en: "Missing data.", fr: "Données manquantes." },
  notFound: {
    es: "Código no reconocido.",
    en: "Code not recognised.",
    fr: "Code non reconnu.",
  },
  otherDevice: {
    es: "Este código ya está activado en otro dispositivo.",
    en: "This code is already active on another device.",
    fr: "Ce code est déjà activé sur un autre appareil.",
  },
};

async function handleRedeem(request, env) {
  const { code, deviceId, lang } = await request.json();
  const safeLang = LANGS.includes(lang) ? lang : "es";
  if (!code || !deviceId)
    return json({ error: REDEEM_ERRORS.missing[safeLang] }, 400, env);

  const normalized = code.trim().toUpperCase();
  const row = await env.DB.prepare("SELECT * FROM licenses WHERE code = ?")
    .bind(normalized)
    .first();

  if (!row) return json({ error: REDEEM_ERRORS.notFound[safeLang] }, 404, env);

  const stages = resolveI18n(STAGES_I18N, safeLang);

  if (row.status === "unused") {
    await env.DB.prepare(
      "UPDATE licenses SET status='active', device_id=?, activated_at=? WHERE code=?"
    )
      .bind(deviceId, Date.now(), normalized)
      .run();
    return json({ stages }, 200, env);
  }

  if (row.status === "active" && row.device_id === deviceId) {
    // reinstalación / reapertura del mismo dispositivo, o simplemente
    // el jugador cambió de idioma: se permite sin gastar el código
    return json({ stages }, 200, env);
  }

  return json({ error: REDEEM_ERRORS.otherDevice[safeLang] }, 403, env);
}

/* ============================================================
   Entrada
   ============================================================ */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // env "efectivo" para esta petición: mismo objeto, pero con
    // ALLOWED_ORIGIN ya resuelto (producción o localhost de desarrollo).
    const scopedEnv = { ...env, ALLOWED_ORIGIN: resolveOrigin(request, env) };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(scopedEnv) });
    }

    try {
      if (url.pathname === "/api/checkout" && request.method === "POST")
        return await handleCheckout(request, scopedEnv);

      if (url.pathname === "/api/stripe-webhook" && request.method === "POST")
        return await handleWebhook(request, scopedEnv);

      if (url.pathname === "/api/code-for-session" && request.method === "GET")
        return await handleCodeForSession(request, scopedEnv);

      if (url.pathname === "/api/redeem" && request.method === "POST")
        return await handleRedeem(request, scopedEnv);

      return json({ error: "not found" }, 404, scopedEnv);
    } catch (err) {
      return json({ error: err.message || "error interno" }, 500, scopedEnv);
    }
  },
};
