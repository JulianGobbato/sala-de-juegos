/**
 * ¡TOCO TIMBRE! ME BAJO DEL BONDI
 * Lógica principal del juego (Vanilla JS ES6+)
 * Soporte para Sistema Escalable de Categorías y Niveles de Dificultad
 * 100% Client-side, ultra liviano y mobile-first
 */

(function () {
  'use strict';

  // =========================================================================
  // DEFINICIONES MAESTRAS DE RESPALDO (Garantiza offline & doble-clic local)
  // =========================================================================
  const DEFAULT_METADATA = {
    dificultades: [
      { id: "facil", nombre: "Fácil", icono: "🟢", color: "#22c55e" },
      { id: "medio", nombre: "Medio", icono: "🟡", color: "#eab308" },
      { id: "dificil", nombre: "Difícil", icono: "🟠", color: "#f97316" },
      { id: "extremo", nombre: "Extremo", icono: "🔴", color: "#ef4444" }
    ],
    categorias: [
      { id: "argentina", nombre: "Cultura Argentina", icono: "🇦🇷", archivo: "data/preguntas/argentina.json" },
      { id: "deportes", nombre: "Deportes y Mundiales", icono: "⚽", archivo: "data/preguntas/deportes.json" },
      { id: "cine_tv", nombre: "Cine, Series y TV", icono: "🎬", archivo: "data/preguntas/cine_tv.json" },
      { id: "musica", nombre: "Música y Recitales", icono: "🎵", archivo: "data/preguntas/musica.json" },
      { id: "geografia", nombre: "Geografía y Mundo", icono: "🌍", archivo: "data/preguntas/geografia.json" },
      { id: "historia", nombre: "Historia Universal", icono: "🏛️", archivo: "data/preguntas/historia.json" },
      { id: "ciencia", nombre: "Ciencia y Naturaleza", icono: "🔬", archivo: "data/preguntas/ciencia.json" },
      { id: "cultura_pop", nombre: "Cultura Pop, Gaming y Tech", icono: "🎮", archivo: "data/preguntas/cultura_pop.json" },
      { id: "cotidiano", nombre: "Comida y Vida Cotidiana", icono: "🍔", archivo: "data/preguntas/cotidiano.json" },
      { id: "bizarro", nombre: "Récords Bizarros y Curiosidades", icono: "🤯", archivo: "data/preguntas/bizarro.json" }
    ]
  };

  const AVATARS = ['🧢', '🕶️', '🧉', '🎸', '🧣', '🎩', '🦺', '🎧', '🚲', '👑'];
  const DEFAULT_NAMES = ['El Piti', 'La Sole', 'Nacho', 'Cami', 'El Polaco', 'Martu', 'El Chango', 'Valen', 'Tito', 'Flor'];

  const STORAGE_KEY = 'toco_timbre_game_state_v2';
  const FILTERS_STORAGE_KEY = 'toco_timbre_filters_v2';
  const PLAYERS_STORAGE_KEY = 'toco_timbre_players_v2';
  const SOUND_STORAGE_KEY = 'toco_timbre_sound_enabled';

  // =========================================================================
  // SISTEMA DE AUDIO (Web Audio API nativo sintetizado)
  // =========================================================================
  let audioCtx = null;
  let soundEnabled = localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.2, gainVal = 0.3) {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  function playBellSound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(784, now); // Sol 5
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1175, now); // Re 6
      gain2.gain.setValueAtTime(0.3, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now);
      osc2.stop(now + 0.7);

      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 120]);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  function playHonkSound() {
    playTone(330, 'sawtooth', 0.22, 0.25);
    setTimeout(() => playTone(392, 'sawtooth', 0.26, 0.28), 100);
  }

  function playSuccessSound() {
    playTone(523.25, 'triangle', 0.15, 0.3);
    setTimeout(() => playTone(659.25, 'triangle', 0.15, 0.3), 120);
    setTimeout(() => playTone(783.99, 'triangle', 0.3, 0.35), 240);
  }

  function playBrakeSound() {
    playTone(300, 'sawtooth', 0.2, 0.35);
    setTimeout(() => playTone(220, 'sawtooth', 0.2, 0.35), 150);
    setTimeout(() => playTone(150, 'sawtooth', 0.4, 0.4), 300);
  }

  // =========================================================================
  // SISTEMA DE CONFETI NATIVO
  // =========================================================================
  const confettiCanvas = document.getElementById('confettiCanvas');
  const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
  let confettiParticles = [];
  let confettiAnimationId = null;

  function resizeCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerConfetti(durationMs = 3000) {
    if (!confettiCtx) return;
    resizeCanvas();
    const colors = ['#f59e0b', '#0284c7', '#dc2626', '#16a34a', '#fbbf24', '#38bdf8', '#ffffff'];
    confettiParticles = [];

    for (let i = 0; i < 90; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: Math.random() * -confettiCanvas.height * 0.5,
        w: Math.random() * 10 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 4 + 3,
        vx: Math.random() * 3 - 1.5,
        rot: Math.random() * 360,
        rotSpeed: Math.random() * 10 - 5
      });
    }

    const startTime = performance.now();
    cancelAnimationFrame(confettiAnimationId);

    function frame(now) {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      const elapsed = now - startTime;

      confettiParticles.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.rotSpeed;

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rot * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      });

      if (elapsed < durationMs) {
        confettiAnimationId = requestAnimationFrame(frame);
      } else {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }
    confettiAnimationId = requestAnimationFrame(frame);
  }

  // =========================================================================
  // NORMALIZACIÓN DE TEXTO (Para evitar errores de tildes/mayúsculas)
  // =========================================================================
  function normalizarClave(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  // =========================================================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // =========================================================================
  let metaData = { ...DEFAULT_METADATA };
  let allQuestions = [];
  let questionsCache = [];
  let isQuestionsLoaded = false;
  let loadPromise = null;
  const questionsByCategory = {};

  // Filtros activos guardados
  let activeFilters = {
    categorias: DEFAULT_METADATA.categorias.map(c => normalizarClave(c.id)),
    dificultades: DEFAULT_METADATA.dificultades.map(d => normalizarClave(d.id)),
    cardsPerCombination: 0, // 0 = 'all' (por defecto: todas las disponibles), 1, 3, 5, 10, o personalizado
    customCardsPerComb: 15
  };

  const state = {
    mode: 'menu', // 'menu' | 'tarjetero' | 'digital'
    activeViewId: 'viewMenu',

    // Modo Tarjetero
    tarjetero: {
      usedIds: [],
      currentQuestion: null,
      isRevealed: false,
      sessionDeck: null
    },

    // Modo Digital
    digital: {
      config: {
        totalRounds: 8,
        players: [
          { id: 0, name: 'El Piti', emoji: '🧢' },
          { id: 1, name: 'La Sole', emoji: '🕶️' },
          { id: 2, name: 'Nacho', emoji: '🧉' }
        ]
      },
      currentRound: 1,
      roundInitialChoferIndex: 0,
      usedQuestionIds: [],
      currentQuestion: null,
      sessionDeck: null,
      scores: {},
      roundPhase: 'chofer_input',

      bidding: {
        choferIndex: 0,
        currentBet: null,
        turnPlayerIndex: null,
        playerStatus: {},
        passengersAgreed: {}
      },

      roundResult: null
    }
  };

  // Helper para mezclar arrays al azar (Fisher-Yates)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Fallback offline robusto: 40 preguntas (4 por cada una de las 10 categorías, 1 por dificultad)
  function getOfflineFallbackQuestions() {
    return [
      // Argentina
      { id: "arg_fb1", categoria: "argentina", dificultad: "facil", pregunta: "¿En qué año ganó Argentina su tercera Copa del Mundo en Qatar?", respuesta: 2022, unidad: "año", nota: "Venció por penales a Francia el 18 de diciembre." },
      { id: "arg_fb2", categoria: "argentina", dificultad: "medio", pregunta: "¿Cuántos kilómetros de largo tiene la emblemática Ruta Nacional 40?", respuesta: 5194, unidad: "km", nota: "Atraviesa 11 provincias argentinas bordeando los Andes." },
      { id: "arg_fb3", categoria: "argentina", dificultad: "dificil", pregunta: "¿Cuántos kilómetros recorre el Tren a las Nubes hasta el viaducto La Polvorilla?", respuesta: 217, unidad: "km", nota: "Alcanza los 4.220 metros sobre el nivel del mar." },
      { id: "arg_fb4", categoria: "argentina", dificultad: "extremo", pregunta: "¿Cuántos metros cuadrados de superficie tiene la Plaza de Mayo de Buenos Aires?", respuesta: 19700, unidad: "m²", nota: "Escenario histórico de las grandes manifestaciones argentinas." },

      // Deportes
      { id: "dep_fb1", categoria: "deportes", dificultad: "facil", pregunta: "¿Cuántos minutos reglamentarios dura un partido oficial de fútbol sin alargue?", respuesta: 90, unidad: "minutos", nota: "Dos tiempos de 45 minutos." },
      { id: "dep_fb2", categoria: "deportes", dificultad: "medio", pregunta: "¿Cuántos hoyos conforman una ronda reglamentaria en un campo de golf estándar?", respuesta: 18, unidad: "hoyos", nota: "Estándar fijado en St Andrews en 1764." },
      { id: "dep_fb3", categoria: "deportes", dificultad: "dificil", pregunta: "¿Cuántos puntos anotó Wilt Chamberlain en su récord histórico en un solo partido de la NBA?", respuesta: 100, unidad: "puntos", nota: "El 2 de marzo de 1962 jugando para Philadelphia Warriors." },
      { id: "dep_fb4", categoria: "deportes", dificultad: "extremo", pregunta: "¿Cuántos kilómetros completan en total las tres pruebas de un triatlón distancia Ironman?", respuesta: 226, unidad: "km", nota: "3,8 km de natación, 180 km de ciclismo y 42,2 km de maratón." },

      // Cine y TV
      { id: "cin_fb1", categoria: "cine_tv", dificultad: "facil", pregunta: "¿Cuántas estatuillas del premio Óscar ganó la película 'Titanic' de 1997?", respuesta: 11, unidad: "premios Óscar", nota: "Récord histórico compartido con Ben-Hur y El Retorno del Rey." },
      { id: "cin_fb2", categoria: "cine_tv", dificultad: "medio", pregunta: "¿Cuántos minutos dura la versión extendida de 'El Señor de los Anillos: El Retorno del Rey'?", respuesta: 251, unidad: "minutos", nota: "Más de 4 horas y 11 minutos de épica cinematográfica." },
      { id: "cin_fb3", categoria: "cine_tv", dificultad: "dificil", pregunta: "¿Cuántos capítulos en total tuvo la serie clásica de televisión 'Friends'?", respuesta: 236, unidad: "capítulos", nota: "Emitidos a lo largo de 10 exitosas temporadas." },
      { id: "cin_fb4", categoria: "cine_tv", dificultad: "extremo", pregunta: "¿Cuántos días duró la filmación principal de la caótica producción de 'Apocalypse Now' en Filipinas?", respuesta: 238, unidad: "días", nota: "Dirigida por Francis Ford Coppola entre 1976 y 1977." },

      // Música
      { id: "mus_fb1", categoria: "musica", dificultad: "facil", pregunta: "¿Cuántas cuerdas tiene una guitarra criolla tradicional?", respuesta: 6, unidad: "cuerdas", nota: "Afinadas habitualmente en Mi, La, Re, Sol, Si, Mi." },
      { id: "mus_fb2", categoria: "musica", dificultad: "medio", pregunta: "¿Cuántos conciertos récord dio la banda Coldplay en el estadio Monumental de River en 2022?", respuesta: 10, unidad: "recitales", nota: "Superó el récord previo de Roger Waters de 9 shows." },
      { id: "mus_fb3", categoria: "musica", dificultad: "dificil", pregunta: "¿Cuántas teclas en total tiene un piano de concierto estándar moderno?", respuesta: 88, unidad: "teclas", nota: "52 teclas blancas y 36 teclas negras (7 octavas y una tercera)." },
      { id: "mus_fb4", categoria: "musica", dificultad: "extremo", pregunta: "¿Cuántos millones de personas asistieron al concierto gratuito de Rod Stewart en Copacabana en 1994?", respuesta: 4, unidad: "millones de personas", nota: "Estimado por Guinness como el concierto gratuito más masivo." },

      // Geografía
      { id: "geo_fb1", categoria: "geografia", dificultad: "facil", pregunta: "¿Cuántos continentes se reconocen habitualmente según el modelo tradicional de la ONU?", respuesta: 6, unidad: "continentes", nota: "América, Europa, Asia, África, Oceanía y Antártida." },
      { id: "geo_fb2", categoria: "geografia", dificultad: "medio", pregunta: "¿Cuántos países soberanos componen el subcontinente de América del Sur?", respuesta: 12, unidad: "países", nota: "Además de Guayana Francesa como territorio de ultramar." },
      { id: "geo_fb3", categoria: "geografia", dificultad: "dificil", pregunta: "¿Cuántos estados federales (más el Distrito Federal) integran la República Federativa del Brasil?", respuesta: 26, unidad: "estados", nota: "26 estados federales y el Distrito Federal de Brasilia." },
      { id: "geo_fb4", categoria: "geografia", dificultad: "extremo", pregunta: "¿Cuántos metros de profundidad tiene la Fosa de las Marianas en el Abismo de Challenger?", respuesta: 10994, unidad: "metros", nota: "El punto más profundo conocido de todos los océanos." },

      // Historia
      { id: "his_fb1", categoria: "historia", dificultad: "facil", pregunta: "¿En qué año llegó Cristóbal Colón por primera vez a tierras americanas?", respuesta: 1492, unidad: "año", nota: "Desembarcó en la isla de Guanahani el 12 de octubre." },
      { id: "his_fb2", categoria: "historia", dificultad: "medio", pregunta: "¿Cuántos años duró la construcción de la Torre Eiffel en París hasta inaugurarse en 1889?", respuesta: 2, unidad: "años", nota: "Construida en tiempo récord de 2 años, 2 meses y 5 días." },
      { id: "his_fb3", categoria: "historia", dificultad: "dificil", pregunta: "¿Cuántos meses duró la expedición científica de Charles Darwin a bordo del HMS Beagle?", respuesta: 57, unidad: "meses", nota: "Casi 5 años recorriendo el hemisferio sur entre 1831 y 1836." },
      { id: "his_fb4", categoria: "historia", dificultad: "extremo", pregunta: "¿En qué año se firmó el Tratado de Tordesillas para repartir el Nuevo Mundo?", respuesta: 1494, unidad: "año", nota: "Firmado en Castilla entre representantes de España y Portugal." },

      // Ciencia
      { id: "cie_fb1", categoria: "ciencia", dificultad: "facil", pregunta: "¿Cuántos huesos tiene el esqueleto de una persona adulta promedio?", respuesta: 206, unidad: "huesos", nota: "Al nacer son cerca de 270 y varios se fusionan con el crecimiento." },
      { id: "cie_fb2", categoria: "ciencia", dificultad: "medio", pregunta: "¿A cuántos grados Celsius hierve el agua destilada a presión atmosférica normal a nivel del mar?", respuesta: 100, unidad: "grados", nota: "Punto de ebullición estándar en la escala Celsius." },
      { id: "cie_fb3", categoria: "ciencia", dificultad: "dificil", pregunta: "¿Cuántos elementos químicos confirmados componen la tabla periódica moderna?", respuesta: 118, unidad: "elementos", nota: "Desde el Hidrógeno (1) hasta el Oganesón (118)." },
      { id: "cie_fb4", categoria: "ciencia", dificultad: "extremo", pregunta: "¿Cuántos millones de kilómetros separan en promedio a la Tierra del Sol (una Unidad Astronómica)?", respuesta: 150, unidad: "millones de km", nota: "Aproximadamente 149,6 millones de kilómetros." },

      // Cultura Pop
      { id: "pop_fb1", categoria: "cultura_pop", dificultad: "facil", pregunta: "¿Cuántos Pokémon integraban la Pokédex de la primera generación en la región de Kanto?", respuesta: 151, unidad: "Pokémon", nota: "Desde Bulbasaur (#001) hasta Mew (#151)." },
      { id: "pop_fb2", categoria: "cultura_pop", dificultad: "medio", pregunta: "¿Cuántos bloques de altura tiene el límite superior de construcción vertical en Minecraft moderno?", respuesta: 320, unidad: "bloques", nota: "Desde la actualización Caves & Cliffs (límite y=320)." },
      { id: "pop_fb3", categoria: "cultura_pop", dificultad: "dificil", pregunta: "¿En qué año se lanzó a la venta la primera consola Sony PlayStation en Japón?", respuesta: 1994, unidad: "año", nota: "Llegó al mercado japonés el 3 de diciembre de 1994." },
      { id: "pop_fb4", categoria: "cultura_pop", dificultad: "extremo", pregunta: "¿Cuántos millones de consolas vendió la PlayStation 2 en toda su historia?", respuesta: 155, unidad: "millones de consolas", nota: "La consola hogareña de videojuegos más vendida de todos los tiempos." },

      // Cotidiano
      { id: "cot_fb1", categoria: "cotidiano", dificultad: "facil", pregunta: "¿Cuántas medialunas vienen en una docena tradicional de panadería?", respuesta: 12, unidad: "medialunas", nota: "La unidad estándar de las facturas argentinas." },
      { id: "cot_fb2", categoria: "cotidiano", dificultad: "medio", pregunta: "¿Cuántos gramos pesa un paquete clásico estándar de yerba mate en el supermercado?", respuesta: 500, unidad: "gramos", nota: "El clásico paquete de medio kilo." },
      { id: "cot_fb3", categoria: "cotidiano", dificultad: "dificil", pregunta: "¿Cuántos granos de café tostado se necesitan aproximadamente para extraer un pocillo de café expreso?", respuesta: 70, unidad: "granos", nota: "Equivalente a entre 7 y 8 gramos de café molido fino." },
      { id: "cot_fb4", categoria: "cotidiano", dificultad: "extremo", pregunta: "¿Cuántos días puede mantenerse en buen estado un huevo refrigerado antes de consumirse?", respuesta: 35, unidad: "días", nota: "Aproximadamente 4 a 5 semanas conservado en heladera." },

      // Bizarro
      { id: "biz_fb1", categoria: "bizarro", dificultad: "facil", pregunta: "¿Cuántos corazones tiene en su cuerpo un pulpo común?", respuesta: 3, unidad: "corazones", nota: "Dos bombean sangre a las branquias y uno al resto del cuerpo." },
      { id: "biz_fb2", categoria: "bizarro", dificultad: "medio", pregunta: "¿Cuántas horas seguidas duró el récord Guinness del beso más largo del mundo?", respuesta: 58, unidad: "horas", nota: "Logrado en Tailandia en 2013 con 58 horas y 35 minutos." },
      { id: "biz_fb3", categoria: "bizarro", dificultad: "dificil", pregunta: "¿Cuántas velas de cumpleaños encendidas sopló Mike Buytas de un solo soplido para su récord?", respuesta: 1227, unidad: "velas", nota: "Apagadas en una enorme torta de varios niveles." },
      { id: "biz_fb4", categoria: "bizarro", dificultad: "extremo", pregunta: "¿Cuántas bicicletas completas comió a lo largo de su vida Monsieur Mangetout masticando metal?", respuesta: 18, unidad: "bicicletas", nota: "Michel Lotito ingería metales finamente cortados junto con aceite mineral." }
    ];
  }

  // =========================================================================
  // PRECARGA EN CACHÉ Y BANCO MODULAR DE PREGUNTAS
  // =========================================================================
  async function loadMetadataAndQuestions() {
    if (isQuestionsLoaded && questionsCache.length > 0) {
      return questionsCache;
    }
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = (async () => {
      // 1. Cargar metadatos desde window.BONDI_METADATA o data/categorias.json
      if (typeof window !== 'undefined' && window.BONDI_METADATA && window.BONDI_METADATA.categorias) {
        metaData = window.BONDI_METADATA;
      } else {
        try {
          const catRes = await fetch('data/categorias.json');
          if (catRes.ok) {
            const catData = await catRes.json();
            if (catData.categorias && catData.dificultades) {
              metaData = catData;
            }
          }
        } catch (e) {
          console.warn('Usando metadatos base:', e.message);
        }
      }

      // 2. Si el bundle global existe con las 1.000 preguntas verificadas (elimina bloqueos en file://)
      if (typeof window !== 'undefined' && window.BONDI_QUESTIONS_BUNDLE && Array.isArray(window.BONDI_QUESTIONS_BUNDLE) && window.BONDI_QUESTIONS_BUNDLE.length >= 1000) {
        questionsCache = window.BONDI_QUESTIONS_BUNDLE.map(q => ({
          ...q,
          categoria: normalizarClave(q.categoria),
          dificultad: normalizarClave(q.dificultad || q.nivel || 'facil')
        }));
        allQuestions = questionsCache;
        isQuestionsLoaded = true;
        console.log(`Cargadas ${allQuestions.length} preguntas verificadas desde el bundle global.`);
        loadSavedFilters();
        return allQuestions;
      }

      // 3. Cargar en memoria todos los archivos de categorías en paralelo con Promise.all
      const fetchPromises = metaData.categorias.map(async (cat) => {
        try {
          const qRes = await fetch(cat.archivo);
          if (qRes.ok) {
            const qList = await qRes.json();
            if (Array.isArray(qList)) {
              return qList.map((q, idx) => ({
                ...q,
                id: q.id || `${cat.id}_${String(idx + 1).padStart(3, '0')}`,
                categoria: normalizarClave(q.categoria || cat.id),
                dificultad: normalizarClave(q.dificultad || q.nivel || 'facil')
              }));
            }
          }
        } catch (err) {
          // Ignorar fallo puntual para continuar con las demás categorías
        }
        return [];
      });

      const results = await Promise.all(fetchPromises);
      const loaded = results.flat();

      if (loaded.length > 0) {
        questionsCache = loaded;
        allQuestions = loaded;
      } else {
        // Fallback offline
        questionsCache = getOfflineFallbackQuestions();
        allQuestions = questionsCache;
      }

      isQuestionsLoaded = true;
      console.log(`Cargadas ${allQuestions.length} preguntas en memoria para el mazo.`);

      loadSavedFilters();
      return allQuestions;
    })();

    return loadPromise;
  }

  function loadSavedFilters() {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.categorias) && parsed.categorias.length > 0) {
          activeFilters.categorias = parsed.categorias
            .map(normalizarClave)
            .filter(id => metaData.categorias.some(c => normalizarClave(c.id) === id));
        }
        if (Array.isArray(parsed.dificultades) && parsed.dificultades.length > 0) {
          activeFilters.dificultades = parsed.dificultades
            .map(normalizarClave)
            .filter(id => metaData.dificultades.some(d => normalizarClave(d.id) === id));
        }
        if (typeof parsed.cardsPerCombination === 'number') {
          activeFilters.cardsPerCombination = parsed.cardsPerCombination;
        }
        if (typeof parsed.customCardsPerComb === 'number') {
          activeFilters.customCardsPerComb = parsed.customCardsPerComb;
        }
      }
    } catch (e) {
      console.warn('Error al leer filtros de LocalStorage:', e);
    }

    if (!activeFilters.categorias.length) {
      activeFilters.categorias = metaData.categorias.map(c => normalizarClave(c.id));
    }
    if (!activeFilters.dificultades.length) {
      activeFilters.dificultades = metaData.dificultades.map(d => normalizarClave(d.id));
    }
    if (typeof activeFilters.cardsPerCombination !== 'number') {
      activeFilters.cardsPerCombination = 0;
    }
    if (typeof activeFilters.customCardsPerComb !== 'number') {
      activeFilters.customCardsPerComb = 15;
    }
  }

  function saveFilters() {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(activeFilters));
    } catch (e) {
      console.warn('Error al guardar filtros:', e);
    }
  }

  function loadSavedPlayers() {
    try {
      const raw = localStorage.getItem(PLAYERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          state.digital.config.players = parsed;
        }
      }
    } catch (e) {
      console.warn('Error al leer jugadores de LocalStorage:', e);
    }
  }

  function savePlayers() {
    try {
      localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(state.digital.config.players));
    } catch (e) {
      console.warn('Error al guardar jugadores en LocalStorage:', e);
    }
  }

  // =========================================================================
  // GESTIÓN DE PREGUNTAS REPORTADAS / DESCARTADAS
  // =========================================================================
  const REPORTED_STORAGE_KEY = 'toco_timbre_reportadas';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getReportedQuestions() {
    try {
      const raw = localStorage.getItem(REPORTED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Error al leer preguntas reportadas:', e);
      return [];
    }
  }

  function getReportedQuestionIds() {
    return new Set(getReportedQuestions().map(q => q.id));
  }

  function saveReportedQuestion(question) {
    if (!question || !question.id) return;
    const list = getReportedQuestions();
    if (!list.some(q => q.id === question.id)) {
      list.push({
        id: question.id,
        categoria: question.categoria,
        dificultad: question.dificultad || question.nivel,
        pregunta: question.pregunta,
        respuesta: question.respuesta,
        unidad: question.unidad,
        nota: question.nota,
        fecha: new Date().toISOString()
      });
      try {
        localStorage.setItem(REPORTED_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.warn('Error al guardar pregunta reportada:', e);
      }
    }
    updateReportedUIIndicators();
  }

  // Devuelve TODAS las preguntas que coinciden con las categorías y dificultades seleccionadas (excluyendo reportadas)
  function getFilteredMatchingQuestions() {
    const normCats = activeFilters.categorias.map(normalizarClave);
    const normDiffs = activeFilters.dificultades.map(normalizarClave);
    const reportedIds = getReportedQuestionIds();

    return allQuestions.filter(p => {
      if (reportedIds.has(p.id)) return false;
      const pCat = normalizarClave(p.categoria);
      const pDiff = normalizarClave(p.dificultad || p.nivel);
      return normCats.includes(pCat) && normDiffs.includes(pDiff);
    });
  }

  // Alias para retrocompatibilidad
  function getFilteredQuestions() {
    return getFilteredMatchingQuestions();
  }

  // Calcula cantidades: total disponible vs total del mazo a jugar
  function computeDeckCounts() {
    const normCats = activeFilters.categorias.map(normalizarClave);
    const normDiffs = activeFilters.dificultades.map(normalizarClave);
    const totalMatching = getFilteredMatchingQuestions().length;
    const perComb = activeFilters.cardsPerCombination || 0;
    const reportedIds = getReportedQuestionIds();

    if (totalMatching === 0) {
      return { totalMatching: 0, playableCount: 0 };
    }

    // Si es 'all' (0), el mazo a jugar incluye todas las coincidentes
    if (perComb <= 0) {
      return { totalMatching, playableCount: totalMatching };
    }

    // Si está parametrizado por combinación (1, 3, 5, 10 o personalizado)
    let playableCount = 0;
    for (const cat of normCats) {
      for (const diff of normDiffs) {
        const countInComb = allQuestions.filter(p => {
          if (reportedIds.has(p.id)) return false;
          return normalizarClave(p.categoria) === cat && normalizarClave(p.dificultad || p.nivel) === diff;
        }).length;
        playableCount += Math.min(countInComb, perComb);
      }
    }

    return { totalMatching, playableCount };
  }

  // Construye el mazo a jugar según el parámetro de cartas por combinación
  function buildPlayableDeck() {
    const normCats = activeFilters.categorias.map(normalizarClave);
    const normDiffs = activeFilters.dificultades.map(normalizarClave);
    const perComb = activeFilters.cardsPerCombination || 0;
    const reportedIds = getReportedQuestionIds();

    // Si es 0 ("Todas las disponibles"), devuelve todas las coincidentes
    if (perComb <= 0) {
      return shuffleArray([...getFilteredMatchingQuestions()]);
    }

    const deck = [];
    for (const cat of normCats) {
      for (const diff of normDiffs) {
        const matchingInComb = allQuestions.filter(p => {
          if (reportedIds.has(p.id)) return false;
          return normalizarClave(p.categoria) === cat && normalizarClave(p.dificultad || p.nivel) === diff;
        });

        if (matchingInComb.length > 0) {
          // Mezclar al azar antes de cortar para que la selección sea variada
          const shuffled = shuffleArray([...matchingInComb]);
          const selected = shuffled.slice(0, perComb);
          deck.push(...selected);
        }
      }
    }

    return shuffleArray(deck);
  }

  // Helpers para obtener info de Categoría y Dificultad
  function getCategoryInfo(catId) {
    const norm = normalizarClave(catId);
    return metaData.categorias.find(c => normalizarClave(c.id) === norm || normalizarClave(c.nombre) === norm) || { id: catId, nombre: catId, icono: '🚌' };
  }

  function getDifficultyInfo(diffId) {
    const norm = normalizarClave(diffId);
    return metaData.dificultades.find(d => normalizarClave(d.id) === norm || normalizarClave(d.nombre) === norm) || { id: diffId, nombre: diffId, icono: '⚪', color: '#94a3b8' };
  }

  // =========================================================================
  // PERSISTENCIA DEL ESTADO DE PARTIDA EN LOCALSTORAGE
  // =========================================================================
  function hasActiveSavedGame(saved) {
    if (!saved) return false;
    if (saved.mode === 'digital') {
      const d = saved.digital;
      return !!(d && d.roundPhase && d.roundPhase !== 'game_over' && d.currentQuestion && d.currentRound >= 1);
    }
    if (saved.mode === 'tarjetero') {
      const t = saved.tarjetero;
      return !!(t && t.currentQuestion && Array.isArray(t.usedIds) && t.usedIds.length > 0);
    }
    return false;
  }

  function saveState() {
    try {
      // Solo guardar en localStorage si existe una partida activa en juego
      if (hasActiveSavedGame(state)) {
        const dataToSave = {
          mode: state.mode,
          activeViewId: state.activeViewId,
          tarjetero: {
            usedIds: state.tarjetero.usedIds,
            currentQuestion: state.tarjetero.currentQuestion,
            isRevealed: state.tarjetero.isRevealed
          },
          digital: {
            config: state.digital.config,
            currentRound: state.digital.currentRound,
            roundInitialChoferIndex: state.digital.roundInitialChoferIndex,
            usedQuestionIds: state.digital.usedQuestionIds,
            currentQuestion: state.digital.currentQuestion,
            scores: state.digital.scores,
            roundPhase: state.digital.roundPhase,
            bidding: state.digital.bidding,
            roundResult: state.digital.roundResult
          },
          activeFilters: activeFilters
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      }
    } catch (e) {
      console.warn('Error al guardar estado en LocalStorage:', e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Error al leer estado desde LocalStorage:', e);
      return null;
    }
  }

  function clearSavedGame() {
    localStorage.removeItem(STORAGE_KEY);
    state.tarjetero.usedIds = [];
    state.tarjetero.currentQuestion = null;
    state.tarjetero.isRevealed = false;
    state.tarjetero.sessionDeck = null;

    state.digital.currentRound = 1;
    state.digital.roundInitialChoferIndex = 0;
    state.digital.usedQuestionIds = [];
    state.digital.currentQuestion = null;
    state.digital.sessionDeck = null;
    state.digital.scores = {};
    state.digital.roundPhase = 'chofer_input';
    state.digital.roundResult = null;
    // No invocar saveState() para asegurar que la clave quede eliminada
  }

  // =========================================================================
  // NAVEGACIÓN Y VISTAS
  // =========================================================================
  function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.remove('active');
    });

    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      state.activeViewId = viewId;
    }

    updateCarteleraHeader();
    saveState();
  }

  function updateCarteleraHeader() {
    const titleEl = document.getElementById('carteleraTitle');
    const subtitleEl = document.getElementById('carteleraSubtitle');
    const lineaEl = document.getElementById('headerLineaText');

    if (!titleEl || !subtitleEl) return;

    if (state.mode === 'menu') {
      lineaEl.textContent = 'LÍNEA 60';
      titleEl.textContent = '¡TOCO TIMBRE! ME BAJO';
      subtitleEl.textContent = 'DESTINO: LA GLORIA';
    } else if (state.mode === 'tarjetero') {
      lineaEl.textContent = 'TARJETERO';
      if (state.activeViewId === 'viewTarjeteroSetup') {
        titleEl.textContent = 'CONFIGURAR MAZO';
        subtitleEl.textContent = 'SELECCIÓN DE PREGUNTAS';
      } else {
        const totalInDeck = (state.tarjetero.sessionDeck && state.tarjetero.sessionDeck.length > 0)
          ? state.tarjetero.sessionDeck.length
          : computeDeckCounts().playableCount;
        titleEl.textContent = 'MAZO DE PREGUNTAS';
        subtitleEl.textContent = `VISTAS: ${state.tarjetero.usedIds.length} / ${totalInDeck}`;
      }
    } else if (state.mode === 'digital') {
      const d = state.digital;
      const roundStr = d.config.totalRounds > 0 
        ? `RONDA ${d.currentRound} / ${d.config.totalRounds}`
        : `RONDA ${d.currentRound} (LIBRE)`;

      lineaEl.textContent = `LÍNEA ${d.currentRound * 10 || 152}`;

      if (state.activeViewId === 'viewDigitalSetup') {
        titleEl.textContent = 'TERMINAL DE CONTROL';
        subtitleEl.textContent = 'CONFIGURANDO EL BONDI';
      } else if (state.activeViewId === 'viewDigitalRoundResult') {
        titleEl.textContent = 'PARADA FINAL';
        subtitleEl.textContent = 'RESOLUCIÓN DE PUNTOS';
      } else if (state.activeViewId === 'viewDigitalGameOver') {
        titleEl.textContent = 'TERMINAL DE RETIRO';
        subtitleEl.textContent = 'PODIO DEL BONDI';
      } else {
        titleEl.textContent = roundStr;
        if (d.bidding.currentBet !== null) {
          const chofer = d.config.players[d.bidding.choferIndex];
          subtitleEl.textContent = `AL VOLANTE: ${chofer ? chofer.name : 'CHOFER'}`;
        } else {
          subtitleEl.textContent = 'ESPERANDO ARRANQUE';
        }
      }
    }
  }

  function showToast(message, icon = '🔔') {
    const existing = document.querySelector('.toast-notice');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notice';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 320);
    }, 2200);
  }

  // =========================================================================
  // UI DINÁMICA DE FILTROS (CATEGORÍAS Y DIFICULTADES)
  // =========================================================================
  function renderFilterPills(catsContainerId, diffsContainerId, onFilterChangeCallback) {
    const catsContainer = document.getElementById(catsContainerId);
    const diffsContainer = document.getElementById(diffsContainerId);

    if (catsContainer) {
      catsContainer.innerHTML = '';
      metaData.categorias.forEach(cat => {
        const catNorm = normalizarClave(cat.id);
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'filter-pill';
        const isSelected = activeFilters.categorias.some(c => normalizarClave(c) === catNorm);
        if (isSelected) pill.classList.add('active');
        pill.dataset.catId = catNorm;
        pill.innerHTML = `<span>${cat.icono}</span> <span>${cat.nombre}</span>`;

        pill.addEventListener('click', () => {
          if (activeFilters.categorias.some(c => normalizarClave(c) === catNorm)) {
            activeFilters.categorias = activeFilters.categorias.filter(c => normalizarClave(c) !== catNorm);
            pill.classList.remove('active');
          } else {
            activeFilters.categorias.push(catNorm);
            pill.classList.add('active');
          }
          saveFilters();
          if (onFilterChangeCallback) onFilterChangeCallback();
        });
        catsContainer.appendChild(pill);
      });
    }

    if (diffsContainer) {
      diffsContainer.innerHTML = '';
      metaData.dificultades.forEach(diff => {
        const diffNorm = normalizarClave(diff.id);
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'filter-pill filter-pill-diff';
        pill.dataset.diff = diffNorm;
        const isSelected = activeFilters.dificultades.some(d => normalizarClave(d) === diffNorm);
        if (isSelected) pill.classList.add('active');
        pill.innerHTML = `<span>${diff.icono}</span> <span>${diff.nombre}</span>`;

        pill.addEventListener('click', () => {
          if (activeFilters.dificultades.some(d => normalizarClave(d) === diffNorm)) {
            activeFilters.dificultades = activeFilters.dificultades.filter(d => normalizarClave(d) !== diffNorm);
            pill.classList.remove('active');
          } else {
            activeFilters.dificultades.push(diffNorm);
            pill.classList.add('active');
          }
          saveFilters();
          if (onFilterChangeCallback) onFilterChangeCallback();
        });
        diffsContainer.appendChild(pill);
      });
    }
  }

  function renderPerCombSelector(containerId, customRowId, customInputId, onChangeCallback) {
    const container = document.getElementById(containerId);
    const customRow = document.getElementById(customRowId);
    const customInput = document.getElementById(customInputId);
    if (!container) return;

    const currentVal = activeFilters.cardsPerCombination || 0;
    const isCustom = ![0, 1, 3, 5, 10].includes(currentVal);

    if (customInput) {
      customInput.value = isCustom ? currentVal : (activeFilters.customCardsPerComb || 15);
      customInput.oninput = (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 25) val = 25;
        activeFilters.cardsPerCombination = val;
        activeFilters.customCardsPerComb = val;
        saveFilters();
        if (onChangeCallback) onChangeCallback();
      };
    }

    if (customRow) {
      if (isCustom) {
        customRow.classList.remove('d-none');
        customRow.classList.add('d-flex');
      } else {
        customRow.classList.add('d-none');
        customRow.classList.remove('d-flex');
      }
    }

    const buttons = container.querySelectorAll('.deck-size-pill');
    buttons.forEach(btn => {
      const perAttr = btn.dataset.per;
      const isThisActive = (perAttr === 'custom' && isCustom) || (!isCustom && parseInt(perAttr, 10) === currentVal);
      if (isThisActive) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }

      btn.onclick = () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (perAttr === 'custom') {
          if (customRow) {
            customRow.classList.remove('d-none');
            customRow.classList.add('d-flex');
          }
          const val = parseInt(customInput?.value, 10) || activeFilters.customCardsPerComb || 15;
          activeFilters.cardsPerCombination = val;
        } else {
          if (customRow) {
            customRow.classList.add('d-none');
            customRow.classList.remove('d-flex');
          }
          activeFilters.cardsPerCombination = parseInt(perAttr, 10) || 0;
        }

        saveFilters();
        if (onChangeCallback) onChangeCallback();
      };
    });
  }

  function updateDeckCounterUI(statusTextId, counterNumberId, btnStartId, mode = 'tarjetero') {
    const statusTextEl = document.getElementById(statusTextId);
    const counterNumberEl = document.getElementById(counterNumberId);
    const btnStartEl = document.getElementById(btnStartId);

    const { totalMatching, playableCount } = computeDeckCounts();

    const usedList = mode === 'tarjetero' ? state.tarjetero.usedIds : state.digital.usedQuestionIds;
    const filteredAll = getFilteredMatchingQuestions();
    const seenMatchingCount = filteredAll.filter(q => usedList.includes(q.id)).length;

    // Actualizar indicador de preguntas vistas
    const seenCountEl = document.getElementById(mode === 'tarjetero' ? 'tarjeteroSeenCount' : 'digitalSeenCount');
    if (seenCountEl) seenCountEl.textContent = seenMatchingCount;

    const btnResetSeen = document.getElementById(mode === 'tarjetero' ? 'btnResetSeenTarjetero' : 'btnResetSeenDigital');
    if (btnResetSeen) {
      btnResetSeen.style.display = seenMatchingCount > 0 ? 'inline-block' : 'none';
    }

    if (counterNumberEl) counterNumberEl.textContent = playableCount;

    if (totalMatching === 0) {
      if (statusTextEl) statusTextEl.textContent = 'Mazo vacío: seleccioná al menos 1 categoría y 1 dificultad';
      if (btnStartEl) {
        btnStartEl.disabled = true;
        btnStartEl.style.opacity = '0.5';
        btnStartEl.style.cursor = 'not-allowed';
      }
    } else {
      if (statusTextEl) {
        statusTextEl.textContent = `Total disponibles que coinciden: ${totalMatching} cartas | Mazo a jugar: ${playableCount} cartas`;
      }
      if (btnStartEl) {
        btnStartEl.disabled = false;
        btnStartEl.style.opacity = '1';
        btnStartEl.style.cursor = 'pointer';
      }
    }

    updateReportedUIIndicators();
  }

  function updateReportedUIIndicators() {
    const list = getReportedQuestions();
    const count = list.length;

    const tCont = document.getElementById('tarjeteroReportedContainer');
    const tCount = document.getElementById('tarjeteroReportedCount');
    if (tCont && tCount) {
      tCount.textContent = count;
      tCont.style.display = count > 0 ? 'block' : 'none';
    }

    const dCont = document.getElementById('digitalReportedContainer');
    const dCount = document.getElementById('digitalReportedCount');
    if (dCont && dCount) {
      dCount.textContent = count;
      dCont.style.display = count > 0 ? 'block' : 'none';
    }
  }

  function openReportedModal() {
    const list = getReportedQuestions();
    const modal = document.getElementById('modalReportedQuestions');
    const totalEl = document.getElementById('modalReportedTotal');
    const listContainer = document.getElementById('reportedListContainer');
    if (!modal || !totalEl || !listContainer) return;

    totalEl.textContent = list.length;
    listContainer.innerHTML = '';

    if (list.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-4" style="color: #94a3b8;">
          No hay preguntas reportadas actualmente.
        </div>
      `;
    } else {
      list.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'reported-item';
        div.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="badge bg-secondary" style="font-size: 0.75rem;">#${idx + 1} (${item.id})</span>
            <span class="badge bg-dark border border-secondary" style="font-size: 0.72rem;">${escapeHtml(item.categoria)} / ${escapeHtml(item.dificultad)}</span>
          </div>
          <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">${escapeHtml(item.pregunta)}</div>
          <div style="font-size: 0.85rem; color: var(--bondi-yellow);">
            R: <strong>${item.respuesta}</strong> (${escapeHtml(item.unidad)})
          </div>
          ${item.nota ? `<div style="font-size: 0.78rem; color: #94a3b8; margin-top: 3px;">${escapeHtml(item.nota)}</div>` : ''}
        `;
        listContainer.appendChild(div);
      });
    }

    modal.classList.remove('d-none');
  }

  function closeReportedModal() {
    const modal = document.getElementById('modalReportedQuestions');
    if (modal) modal.classList.add('d-none');
  }

  function clearReportedQuestions() {
    const list = getReportedQuestions();
    if (list.length === 0) return;
    if (!confirm('¿Deseás borrar todas las preguntas reportadas? Volverán a estar habilitadas en futuros juegos.')) {
      return;
    }
    try {
      localStorage.removeItem(REPORTED_STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
    updateReportedUIIndicators();
    updateDeckCounterUI('tarjeteroDeckStatusText', 'tarjeteroDeckCounterNumber', 'btnStartTarjetero', 'tarjetero');
    updateDeckCounterUI('digitalDeckStatusText', 'digitalDeckCounterNumber', 'btnStartGame', 'digital');
    openReportedModal();
  }

  function exportReportedQuestions() {
    const list = getReportedQuestions();
    if (list.length === 0) {
      alert('No hay preguntas reportadas para exportar.');
      return;
    }
    const jsonStr = JSON.stringify(list, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        alert(`📋 Se copiaron ${list.length} preguntas reportadas en formato JSON al portapapeles.`);
      }).catch(() => {
        prompt('Copiá el JSON de preguntas reportadas:', jsonStr);
      });
    } else {
      prompt('Copiá el JSON de preguntas reportadas:', jsonStr);
    }
  }

  function handleReportTarjetero() {
    const q = state.tarjetero.currentQuestion;
    if (!q) return;

    if (!confirm(`¿Reportar esta pregunta como dato dudoso?\n\n"${q.pregunta}"\n\nSe guardará en preguntas reportadas, se descartará de futuros mazos y se cambiará por otra inmediatamente.`)) {
      return;
    }

    saveReportedQuestion(q);

    // Si hay mazo de sesión, remover la pregunta reportada
    if (Array.isArray(state.tarjetero.sessionDeck)) {
      state.tarjetero.sessionDeck = state.tarjetero.sessionDeck.filter(item => item.id !== q.id);
    }

    const nextQ = getRandomUnusedFilteredQuestion(state.tarjetero.usedIds, state.tarjetero.sessionDeck);
    if (nextQ) {
      state.tarjetero.currentQuestion = nextQ;
      state.tarjetero.usedIds.push(nextQ.id);
      state.tarjetero.isRevealed = false;
      renderTarjeteroCard();
      saveState();
      showToast('Pregunta descartada y reportada', '🚩');
    } else {
      alert('🚩 Pregunta reportada. No quedan más preguntas disponibles en este mazo.');
    }
  }

  function handleReportDigital() {
    const d = state.digital;
    const q = d.currentQuestion;
    if (!q) return;

    if (!confirm(`¿Reportar esta pregunta como dato dudoso?\n\n"${q.pregunta}"\n\nSe anularán los puntos de esta ronda, se descartará de futuros juegos y el Chofer recibirá una nueva pregunta de reemplazo.`)) {
      return;
    }

    saveReportedQuestion(q);

    // Revertir puntos de la ronda si ya fueron calculados
    if (d.roundResult && d.roundResult.scoreChanges) {
      d.config.players.forEach((_, idx) => {
        d.scores[idx] = (d.scores[idx] || 0) - (d.roundResult.scoreChanges[idx] || 0);
      });
    }

    // Si hay mazo de sesión, remover la pregunta reportada
    if (Array.isArray(d.sessionDeck)) {
      d.sessionDeck = d.sessionDeck.filter(item => item.id !== q.id);
    }

    const nextQ = getRandomUnusedFilteredQuestion(d.usedQuestionIds, d.sessionDeck);
    if (!nextQ) {
      alert('🚩 Pregunta reportada, pero no quedan más preguntas disponibles en este mazo.');
      return;
    }

    d.currentQuestion = nextQ;
    d.usedQuestionIds.push(nextQ.id);
    d.roundResult = null;

    // Reiniciar estado de la ronda para la nueva pregunta
    d.currentStep = 0;
    d.choferAnswers = {};
    d.playerChoices = {};
    d.firstRungIndex = null;
    d.isRoundOver = false;

    showView('viewDigitalGame');
    renderDigitalGameScreen();
    saveState();
    showToast('Ronda anulada y nueva pregunta cargada', '🚩');
  }

  // =========================================================================
  // GESTOR DE PREGUNTAS (CON FILTROS, LÍMITE Y RECICLADO AUTOMÁTICO)
  // =========================================================================
  function getRandomUnusedFilteredQuestion(usedIdsList, sessionDeck = null) {
    const pool = (Array.isArray(sessionDeck) && sessionDeck.length > 0)
      ? sessionDeck
      : buildPlayableDeck();

    if (pool.length === 0) {
      return null;
    }

    let available = pool.filter(q => !usedIdsList.includes(q.id));
    if (available.length === 0) {
      // Se agotaron las preguntas del mazo activo: reciclar automáticamente
      const poolIds = new Set(pool.map(q => q.id));
      for (let i = usedIdsList.length - 1; i >= 0; i--) {
        if (poolIds.has(usedIdsList[i])) {
          usedIdsList.splice(i, 1);
        }
      }
      available = [...pool];
      showToast('¡Se recorrió todo el mazo! Reciclando preguntas...', '🎴');
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    const chosen = available[randomIndex];
    usedIdsList.push(chosen.id);
    return chosen;
  }

  // =========================================================================
  // MODO A: TARJETERO (PRESENCIAL)
  // =========================================================================
  async function initTarjeteroSetup() {
    state.mode = 'tarjetero';
    await loadMetadataAndQuestions();

    refreshTarjeteroFiltersUI();
    showView('viewTarjeteroSetup');
  }

  function refreshTarjeteroFiltersUI() {
    renderFilterPills('tarjeteroCatsContainer', 'tarjeteroDiffsContainer', () => {
      updateDeckCounterUI('tarjeteroDeckStatusText', 'tarjeteroDeckCounterNumber', 'btnStartTarjetero', 'tarjetero');
    });
    renderPerCombSelector('tarjeteroPerCombContainer', 'tarjeteroCustomPerCombRow', 'tarjeteroCustomPerCombInput', () => {
      updateDeckCounterUI('tarjeteroDeckStatusText', 'tarjeteroDeckCounterNumber', 'btnStartTarjetero', 'tarjetero');
    });
    updateDeckCounterUI('tarjeteroDeckStatusText', 'tarjeteroDeckCounterNumber', 'btnStartTarjetero', 'tarjetero');
  }

  function startTarjeteroGame() {
    const playable = buildPlayableDeck();
    if (playable.length === 0) {
      showToast('Seleccioná al menos una categoría y una dificultad con preguntas', '⚠️');
      return;
    }

    state.tarjetero.sessionDeck = playable;
    state.tarjetero.usedIds = [];

    nextTarjeteroCard();
    showView('viewTarjetero');
  }

  function nextTarjeteroCard() {
    const q = getRandomUnusedFilteredQuestion(state.tarjetero.usedIds, state.tarjetero.sessionDeck);
    if (!q) {
      showToast('No hay preguntas disponibles con los filtros actuales', '⚠️');
      initTarjeteroSetup();
      return;
    }

    state.tarjetero.currentQuestion = q;
    state.tarjetero.isRevealed = false;
    renderTarjeteroCard();
    saveState();
  }

  function renderTarjeteroCard() {
    const q = state.tarjetero.currentQuestion;
    if (!q) return;

    const catInfo = getCategoryInfo(q.categoria);
    const diffInfo = getDifficultyInfo(q.dificultad || q.nivel);

    // Badges en Tarjeta
    const catBadge = document.getElementById('tarjeteroCategory');
    if (catBadge) {
      catBadge.innerHTML = `<span>${catInfo.icono}</span> <span>${catInfo.nombre}</span>`;
    }

    const diffBadge = document.getElementById('tarjeteroDifficulty');
    if (diffBadge) {
      diffBadge.className = `badge-difficulty ${diffInfo.id}`;
      diffBadge.innerHTML = `<span>${diffInfo.icono}</span> <span>${diffInfo.nombre}</span>`;
    }

    document.getElementById('tarjeteroQuestion').textContent = q.pregunta;
    document.getElementById('tarjeteroUnit').textContent = q.unidad;

    const totalInSession = (state.tarjetero.sessionDeck && state.tarjetero.sessionDeck.length > 0)
      ? state.tarjetero.sessionDeck.length
      : getFilteredQuestions().length;
    document.getElementById('tarjeteroProgressText').textContent = 
      `Tarjeta ${state.tarjetero.usedIds.length} / ${totalInSession}`;

    const answerContainer = document.getElementById('tarjeteroAnswerContainer');
    const btnReveal = document.getElementById('btnTarjeteroReveal');

    if (state.tarjetero.isRevealed) {
      document.getElementById('tarjeteroAnswerValue').textContent = q.respuesta;
      document.getElementById('tarjeteroAnswerUnitLabel').textContent = q.unidad;
      document.getElementById('tarjeteroNote').textContent = q.nota || 'Dato verificado.';
      answerContainer.classList.remove('d-none');
      btnReveal.classList.add('d-none');
    } else {
      answerContainer.classList.add('d-none');
      btnReveal.classList.remove('d-none');
    }
  }

  function revealTarjeteroAnswer() {
    state.tarjetero.isRevealed = true;
    playSuccessSound();
    renderTarjeteroCard();
    saveState();
  }

  // =========================================================================
  // MODO B: CONFIGURACIÓN DIGITAL
  // =========================================================================
  async function initDigitalSetup() {
    state.mode = 'digital';
    await loadMetadataAndQuestions();

    loadSavedPlayers();

    renderPlayersSetupList();
    refreshDigitalFiltersUI();
    showView('viewDigitalSetup');
  }

  function refreshDigitalFiltersUI() {
    renderFilterPills('digitalCatsContainer', 'digitalDiffsContainer', () => {
      updateDeckCounterUI('digitalDeckStatusText', 'digitalDeckCounterNumber', 'btnStartGame', 'digital');
    });
    renderPerCombSelector('digitalPerCombContainer', 'digitalCustomPerCombRow', 'digitalCustomPerCombInput', () => {
      updateDeckCounterUI('digitalDeckStatusText', 'digitalDeckCounterNumber', 'btnStartGame', 'digital');
    });
    updateDeckCounterUI('digitalDeckStatusText', 'digitalDeckCounterNumber', 'btnStartGame', 'digital');
  }

  function renderPlayersSetupList() {
    const container = document.getElementById('playersListContainer');
    if (!container) return;
    container.innerHTML = '';

    const players = state.digital.config.players;
    players.forEach((p, i) => { p.id = i; });

    players.forEach((p, index) => {
      const row = document.createElement('div');
      row.className = 'd-flex align-items-center gap-2';

      const avatarBadge = document.createElement('span');
      avatarBadge.style.fontSize = '1.4rem';
      avatarBadge.textContent = p.emoji || '🧍';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control-bondi flex-fill';
      input.value = p.name;
      input.placeholder = `Pasajero ${index + 1}`;
      input.maxLength = 16;
      input.addEventListener('input', (e) => {
        p.name = e.target.value.trim() || `Pasajero ${index + 1}`;
        savePlayers();
        saveState();
      });

      row.appendChild(avatarBadge);
      row.appendChild(input);

      if (players.length > 2) {
        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn btn-outline-danger btn-sm';
        btnDel.style.borderRadius = '50%';
        btnDel.style.width = '34px';
        btnDel.style.height = '34px';
        btnDel.innerHTML = '✕';
        btnDel.title = 'Quitar pasajero';
        btnDel.addEventListener('click', () => {
          players.splice(index, 1);
          players.forEach((pl, i) => { pl.id = i; });
          savePlayers();
          renderPlayersSetupList();
          saveState();
        });
        row.appendChild(btnDel);
      }

      container.appendChild(row);
    });

    const btnAdd = document.getElementById('btnAddPlayer');
    if (btnAdd) {
      btnAdd.style.display = players.length >= 10 ? 'none' : 'block';
    }
  }

  function randomizeNames() {
    const players = state.digital.config.players;
    const shuffled = [...DEFAULT_NAMES].sort(() => 0.5 - Math.random());
    players.forEach((p, idx) => {
      p.name = shuffled[idx % shuffled.length];
      p.emoji = AVATARS[idx % AVATARS.length];
    });
    savePlayers();
    renderPlayersSetupList();
    saveState();
  }

  function addPlayer() {
    const players = state.digital.config.players;
    if (players.length >= 10) return;
    const nextIdx = players.length;
    players.push({
      id: nextIdx,
      name: DEFAULT_NAMES[nextIdx % DEFAULT_NAMES.length] || `Pasajero ${nextIdx + 1}`,
      emoji: AVATARS[nextIdx % AVATARS.length]
    });
    savePlayers();
    renderPlayersSetupList();
    saveState();
  }

  // =========================================================================
  // MODO B: INICIO DE PARTIDA Y DINÁMICA DE RONDAS
  // =========================================================================
  function startDigitalGame() {
    const players = state.digital.config.players;
    if (players.length < 2) {
      showToast('Se necesitan al menos 2 pasajeros para arrancar el bondi', '⚠️');
      return;
    }

    const playable = buildPlayableDeck();
    if (playable.length === 0) {
      showToast('Seleccioná al menos una categoría y dificultad con preguntas', '⚠️');
      return;
    }

    state.digital.sessionDeck = playable;

    state.digital.scores = {};
    players.forEach((p, idx) => {
      p.id = idx;
      state.digital.scores[idx] = 0;
    });

    state.digital.currentRound = 1;
    state.digital.usedQuestionIds = [];
    state.digital.roundInitialChoferIndex = 0;

    startDigitalRound();
  }

  function startDigitalRound() {
    const d = state.digital;
    const players = d.config.players;

    const q = getRandomUnusedFilteredQuestion(d.usedQuestionIds, d.sessionDeck);
    if (!q) {
      showToast('No hay preguntas disponibles con los filtros actuales', '⚠️');
      initDigitalSetup();
      return;
    }

    d.currentQuestion = q;
    d.roundInitialChoferIndex = (d.currentRound - 1) % players.length;

    d.bidding = {
      choferIndex: d.roundInitialChoferIndex,
      currentBet: null,
      turnPlayerIndex: null,
      playerStatus: {},
      passengersAgreed: {}
    };

    players.forEach((p, idx) => {
      if (idx === d.roundInitialChoferIndex) {
        d.bidding.playerStatus[idx] = 'chofer';
      } else {
        d.bidding.playerStatus[idx] = 'pasajero';
      }
      d.bidding.passengersAgreed[idx] = false;
    });

    d.roundPhase = 'chofer_input';
    d.roundResult = null;

    saveState();
    renderDigitalGameScreen();
    showView('viewDigitalGame');
  }

  // =========================================================================
  // RENDERIZADO DE PANTALLA DIGITAL DE JUEGO
  // =========================================================================
  function renderDigitalGameScreen() {
    const d = state.digital;
    const players = d.config.players;
    const q = d.currentQuestion;
    if (!q) return;

    const catInfo = getCategoryInfo(q.categoria);
    const diffInfo = getDifficultyInfo(q.dificultad);

    // 1. Badges y Pregunta
    document.getElementById('gameRoundBadge').textContent = d.config.totalRounds > 0 
      ? `Ronda ${d.currentRound} de ${d.config.totalRounds}`
      : `Ronda ${d.currentRound} (Modo Libre)`;

    const gameCatBadge = document.getElementById('gameCategoryBadge');
    if (gameCatBadge) {
      gameCatBadge.innerHTML = `<span>${catInfo.icono}</span> <span>${catInfo.nombre}</span>`;
    }

    const gameDiffBadge = document.getElementById('gameDifficultyBadge');
    if (gameDiffBadge) {
      gameDiffBadge.className = `badge-difficulty ${diffInfo.id}`;
      gameDiffBadge.innerHTML = `<span>${diffInfo.icono}</span> <span>${diffInfo.nombre}</span>`;
    }

    document.getElementById('gameQuestionText').textContent = q.pregunta;
    document.getElementById('gameUnitText').textContent = q.unidad;

    // 2. Tablero de Apuesta Actual
    const betBoardValue = document.getElementById('betBoardValue');
    const betBoardUnit = document.getElementById('betBoardUnit');
    const betBoardLabel = document.getElementById('betBoardLabel');
    const chofer = players[d.bidding.choferIndex];

    if (d.bidding.currentBet === null) {
      betBoardValue.textContent = '---';
      betBoardUnit.textContent = 'esperando número inicial';
      betBoardLabel.textContent = `El Chofer (${chofer.name}) debe arrancar`;
    } else {
      betBoardValue.textContent = d.bidding.currentBet;
      betBoardUnit.textContent = q.unidad;
      betBoardLabel.textContent = `Número fijado por: ${chofer.name}`;
    }

    document.getElementById('currentChoferName').textContent = `${chofer.emoji} ${chofer.name}`;
    document.getElementById('currentChoferStatus').textContent = 'Chofer al volante 🛞';

    // 3. Renderizar Lista de Pasajeros y Estados
    const passengersContainer = document.getElementById('passengersStatusContainer');
    passengersContainer.innerHTML = '';

    players.forEach((p, idx) => {
      const pill = document.createElement('div');
      pill.className = 'passenger-pill';

      const status = d.bidding.playerStatus[idx];
      const isTurn = (d.bidding.turnPlayerIndex === idx && d.roundPhase === 'bidding') ||
                     (d.roundPhase === 'chofer_input' && idx === d.bidding.choferIndex);

      if (status === 'chofer') pill.classList.add('is-chofer');
      if (status === 'bajado') pill.classList.add('is-bajado');
      if (d.bidding.passengersAgreed[idx]) pill.classList.add('is-agreed');
      if (isTurn) pill.classList.add('is-active-turn');

      let iconStatus = '🧍';
      let textStatus = 'En el bondi';

      if (status === 'chofer') {
        iconStatus = '🚌';
        textStatus = 'Al volante';
      } else if (status === 'bajado') {
        iconStatus = '🚏';
        textStatus = 'En la parada';
      } else if (d.bidding.passengersAgreed[idx]) {
        iconStatus = '✅';
        textStatus = 'Confía';
      }

      pill.innerHTML = `
        <div class="d-flex align-items-center gap-1">
          <span>${p.emoji}</span>
          <span class="passenger-name-truncate">${p.name}</span>
        </div>
        <div style="font-size: 0.78rem;">
          ${iconStatus} <span style="font-size: 0.72rem; color: #94a3b8;">${textStatus}</span>
        </div>
      `;
      passengersContainer.appendChild(pill);
    });

    // 4. Subfases interactivas
    const subphaseChofer = document.getElementById('subphaseChoferInitial');
    const subphasePassenger = document.getElementById('subphasePassengerTurn');

    if (d.roundPhase === 'chofer_input') {
      subphaseChofer.classList.remove('d-none');
      subphasePassenger.classList.add('d-none');

      document.getElementById('initialChoferPlayerName').textContent = `${chofer.emoji} ${chofer.name}`;
      const inputInitial = document.getElementById('inputInitialBet');
      inputInitial.value = '';
      inputInitial.focus();
    } else if (d.roundPhase === 'bidding') {
      subphaseChofer.classList.add('d-none');
      subphasePassenger.classList.remove('d-none');

      const turnPlayer = players[d.bidding.turnPlayerIndex];
      if (turnPlayer) {
        document.getElementById('passengerTurnPlayerName').textContent = `${turnPlayer.emoji} ${turnPlayer.name}`;
      }
      document.getElementById('passengerTurnCurrentBet').textContent = d.bidding.currentBet;
      document.getElementById('passengerTurnBetUnit').textContent = q.unidad;

      document.getElementById('raiseBetFormContainer').classList.add('d-none');
      document.getElementById('passengerActionButtons').classList.remove('d-none');
    } else if (d.roundPhase === 'round_result') {
      showView('viewDigitalRoundResult');
      renderDigitalRoundResultScreen();
    }
  }

  // =========================================================================
  // SUBFASE A: CHOFER INICIAL INGRESA APUESTA
  // =========================================================================
  function handleConfirmInitialBet() {
    const input = document.getElementById('inputInitialBet');
    const value = parseInt(input.value, 10);

    if (isNaN(value) || value < 0) {
      showToast('Por favor ingresá un número entero positivo o cero', '⚠️');
      input.focus();
      return;
    }

    const d = state.digital;
    d.bidding.currentBet = value;
    d.roundPhase = 'bidding';

    playHonkSound();
    showToast(`¡El bondi arrancó con ${value} ${d.currentQuestion.unidad}!`, '🚌');

    setNextPassengerTurn(d.bidding.choferIndex);
    saveState();
    renderDigitalGameScreen();
  }

  // =========================================================================
  // LOGICA DE TURNOS DE DECISIÓN (SUBFASE B)
  // =========================================================================
  function getActivePassengerIndices() {
    const d = state.digital;
    const list = [];
    d.config.players.forEach((_, idx) => {
      if (d.bidding.playerStatus[idx] === 'pasajero') {
        list.push(idx);
      }
    });
    return list;
  }

  function advanceToNextPendingPassenger(fromIndex) {
    const d = state.digital;
    const total = d.config.players.length;
    let nextIdx = (fromIndex + 1) % total;
    let checked = 0;

    while (checked < total) {
      if (d.bidding.playerStatus[nextIdx] === 'pasajero' && !d.bidding.passengersAgreed[nextIdx]) {
        d.bidding.turnPlayerIndex = nextIdx;
        return true;
      }
      nextIdx = (nextIdx + 1) % total;
      checked++;
    }
    return false;
  }

  function setNextPassengerTurn(fromIndex) {
    const hasNext = advanceToNextPendingPassenger(fromIndex);
    if (!hasNext) {
      finishBiddingPhase();
    }
  }

  // =========================================================================
  // OPCIÓN 1: AGARRAR EL VOLANTE (SUBIR NÚMERO)
  // =========================================================================
  function handleOpenRaiseForm() {
    const d = state.digital;
    document.getElementById('raiseMinBetLabel').textContent = `${d.bidding.currentBet} ${d.currentQuestion.unidad}`;
    const inputRaise = document.getElementById('inputRaiseBet');
    inputRaise.value = '';
    inputRaise.min = d.bidding.currentBet + 1;

    document.getElementById('passengerActionButtons').classList.add('d-none');
    document.getElementById('raiseBetFormContainer').classList.remove('d-none');
    inputRaise.focus();
  }

  function handleCancelRaiseForm() {
    document.getElementById('raiseBetFormContainer').classList.add('d-none');
    document.getElementById('passengerActionButtons').classList.remove('d-none');
  }

  function handleConfirmRaiseBet() {
    const d = state.digital;
    const input = document.getElementById('inputRaiseBet');
    const newBet = parseInt(input.value, 10);

    if (isNaN(newBet) || newBet <= d.bidding.currentBet) {
      showToast(`El número debe ser estrictamente mayor a ${d.bidding.currentBet}`, '⚠️');
      input.focus();
      return;
    }

    const newChoferIndex = d.bidding.turnPlayerIndex;
    const oldChoferIndex = d.bidding.choferIndex;
    const players = d.config.players;

    d.bidding.playerStatus[oldChoferIndex] = 'pasajero';
    d.bidding.choferIndex = newChoferIndex;
    d.bidding.playerStatus[newChoferIndex] = 'chofer';
    d.bidding.currentBet = newBet;

    players.forEach((_, idx) => {
      d.bidding.passengersAgreed[idx] = false;
    });

    playHonkSound();
    showToast(`¡${players[newChoferIndex].name} agarró el volante con ${newBet}!`, '🛞');

    setNextPassengerTurn(newChoferIndex);
    saveState();
    renderDigitalGameScreen();
  }

  // =========================================================================
  // OPCIÓN 2: QUEDARME EN EL BONDI (CONFIAR)
  // =========================================================================
  function handleStayOnBus() {
    const d = state.digital;
    const currentPlayerIdx = d.bidding.turnPlayerIndex;
    const players = d.config.players;

    d.bidding.passengersAgreed[currentPlayerIdx] = true;
    playTone(440, 'triangle', 0.12, 0.2);

    showToast(`${players[currentPlayerIdx].name} confía y se queda arriba`, '🧍');

    const hasNext = advanceToNextPendingPassenger(currentPlayerIdx);
    if (!hasNext) {
      finishBiddingPhase();
    }

    saveState();
    renderDigitalGameScreen();
  }

  // =========================================================================
  // OPCIÓN 3: ¡TOCO TIMBRE! ME BAJO
  // =========================================================================
  function handleRingBell() {
    const d = state.digital;
    const currentPlayerIdx = d.bidding.turnPlayerIndex;
    const players = d.config.players;

    d.bidding.playerStatus[currentPlayerIdx] = 'bajado';
    d.bidding.passengersAgreed[currentPlayerIdx] = false;

    playBellSound();
    showToast(`¡DING DONG! ${players[currentPlayerIdx].name} tocó timbre y se bajó`, '🔔');

    const activePassengers = getActivePassengerIndices();

    if (activePassengers.length === 0) {
      finishBiddingPhase();
    } else {
      const hasNext = advanceToNextPendingPassenger(currentPlayerIdx);
      if (!hasNext) {
        finishBiddingPhase();
      }
    }

    saveState();
    renderDigitalGameScreen();
  }

  // =========================================================================
  // FINAL DE LA FASE DE APUESTAS & CALCULO DE PUNTUACIÓN
  // =========================================================================
  function finishBiddingPhase() {
    const d = state.digital;
    const players = d.config.players;
    const q = d.currentQuestion;

    d.roundPhase = 'round_result';

    const finalBet = d.bidding.currentBet;
    const finalChoferIndex = d.bidding.choferIndex;
    const realAnswer = q.respuesta;

    const didBust = finalBet > realAnswer;
    const isExact = finalBet === realAnswer;

    const stayedPlayerIndices = [];
    const rungPlayerIndices = [];

    players.forEach((_, idx) => {
      if (d.bidding.playerStatus[idx] === 'pasajero') {
        stayedPlayerIndices.push(idx);
      } else if (d.bidding.playerStatus[idx] === 'bajado') {
        rungPlayerIndices.push(idx);
      }
    });

    const scoreChanges = {};
    const explanations = {};

    players.forEach((_, idx) => {
      scoreChanges[idx] = 0;
      explanations[idx] = '';
    });

    if (!didBust) {
      if (stayedPlayerIndices.length === 0) {
        scoreChanges[finalChoferIndex] = 6;
        explanations[finalChoferIndex] = '¡Chofer Solitario! Todos se bajaron y no te pasaste (+6 pts)';
      } else {
        scoreChanges[finalChoferIndex] = 3;
        explanations[finalChoferIndex] = 'Chofer exitoso con pasajeros (+3 pts)';

        stayedPlayerIndices.forEach(pIdx => {
          scoreChanges[pIdx] = 2;
          explanations[pIdx] = 'Confiaste en el Chofer y no se pasó (+2 pts)';
        });
      }

      if (isExact) {
        scoreChanges[finalChoferIndex] += 2;
        explanations[finalChoferIndex] += ' ⭐ ¡BONUS EXACTO! Clavaste la cifra (+2 pts extra)';
      }

      rungPlayerIndices.forEach(pIdx => {
        scoreChanges[pIdx] = 0;
        explanations[pIdx] = 'Tocaste timbre pero el chofer no se pasó (0 pts)';
      });
    } else {
      scoreChanges[finalChoferIndex] = -1;
      explanations[finalChoferIndex] = 'Te fuiste a la banquina: te pasaste de la cifra (-1 pto)';

      stayedPlayerIndices.forEach(pIdx => {
        scoreChanges[pIdx] = 0;
        explanations[pIdx] = 'Te quedaste arriba con un chofer que se pasó (0 pts)';
      });

      rungPlayerIndices.forEach(pIdx => {
        scoreChanges[pIdx] = 2;
        explanations[pIdx] = '¡Te bajaste a tiempo antes de la banquina! (+2 pts)';
      });
    }

    players.forEach((_, idx) => {
      d.scores[idx] = (d.scores[idx] || 0) + scoreChanges[idx];
    });

    d.roundResult = {
      revealed: false,
      finalBet,
      finalChoferIndex,
      realAnswer,
      unit: q.unidad,
      note: q.nota,
      didBust,
      isExact,
      stayedPlayerIndices,
      rungPlayerIndices,
      scoreChanges,
      explanations
    };

    saveState();
  }

  // =========================================================================
  // VISTA 5: RESULTADOS DE LA RONDA
  // =========================================================================
  function renderDigitalRoundResultScreen() {
    const d = state.digital;
    const r = d.roundResult;
    const players = d.config.players;
    if (!r) return;

    const chofer = players[r.finalChoferIndex];
    document.getElementById('resultChoferName').textContent = `${chofer.emoji} ${chofer.name}`;
    document.getElementById('resultFinalBet').textContent = r.finalBet;
    document.getElementById('resultFinalUnit').textContent = r.unit;

    const stayedNames = r.stayedPlayerIndices.map(idx => players[idx].name).join(', ') || 'Nadie';
    document.getElementById('resultStayedPlayers').textContent = stayedNames;

    const rungNames = r.rungPlayerIndices.map(idx => players[idx].name).join(', ') || 'Nadie';
    document.getElementById('resultRungPlayers').textContent = rungNames;

    const preReveal = document.getElementById('resultPreRevealAction');
    const postReveal = document.getElementById('resultPostRevealSection');

    if (!r.revealed) {
      preReveal.classList.remove('d-none');
      postReveal.classList.add('d-none');
    } else {
      preReveal.classList.add('d-none');
      postReveal.classList.remove('d-none');

      document.getElementById('resultRealAnswer').textContent = r.realAnswer;
      document.getElementById('resultRealUnit').textContent = r.unit;
      document.getElementById('resultQuestionNote').textContent = r.note || 'Dato comprobado.';

      const verdictBadge = document.getElementById('verdictBadgeText');
      const verdictBox = document.getElementById('verdictBox');

      if (!r.didBust) {
        verdictBox.style.borderColor = 'var(--bondi-green)';
        verdictBadge.style.background = 'rgba(22, 163, 74, 0.25)';
        verdictBadge.style.color = '#4ade80';
        verdictBadge.innerHTML = r.isExact
          ? '⭐ ¡CLAVÓ LA RESPUESTA EXACTA! ¡IMPECABLE!'
          : '🟢 ¡EL CHOFER NO SE PASÓ! VIAJE SEGURO';
      } else {
        verdictBox.style.borderColor = 'var(--bondi-red)';
        verdictBadge.style.background = 'rgba(220, 38, 38, 0.25)';
        verdictBadge.style.color = '#f87171';
        verdictBadge.innerHTML = '🔴 ¡EL CHOFER SE FUE A LA BANQUINA! SE PASÓ';
      }

      const scoreChangesList = document.getElementById('roundScoreChangesList');
      scoreChangesList.innerHTML = '';

      players.forEach((p, idx) => {
        const change = r.scoreChanges[idx];
        const item = document.createElement('div');
        item.className = 'd-flex justify-content-between align-items-center p-2 rounded';
        item.style.background = 'rgba(0, 0, 0, 0.25)';

        let changeBadge = '';
        if (change > 0) {
          changeBadge = `<span class="badge" style="background: #16a34a; font-size: 0.95rem;">+${change} pts</span>`;
        } else if (change < 0) {
          changeBadge = `<span class="badge" style="background: #dc2626; font-size: 0.95rem;">${change} pto</span>`;
        } else {
          changeBadge = `<span class="badge" style="background: #64748b; font-size: 0.95rem;">0 pts</span>`;
        }

        item.innerHTML = `
          <div>
            <div style="font-weight: 700;">${p.emoji} ${p.name}</div>
            <div style="font-size: 0.78rem; color: #94a3b8;">${r.explanations[idx]}</div>
          </div>
          <div>${changeBadge}</div>
        `;
        scoreChangesList.appendChild(item);
      });

      renderSubeLeaderboard('subeLeaderboardList');

      const isLastRound = d.config.totalRounds > 0 && d.currentRound >= d.config.totalRounds;
      const btnNext = document.getElementById('btnNextRoundOrFinish');
      if (isLastRound) {
        btnNext.textContent = '🏆 Ver Gran Podio Final';
        btnNext.className = 'btn-bondi btn-bondi-gold';
      } else {
        btnNext.textContent = `➡️ Siguiente Ronda (${d.currentRound + 1})`;
        btnNext.className = 'btn-bondi btn-bondi-primary';
      }
    }
  }

  function revealOfficialAnswer() {
    const d = state.digital;
    const r = d.roundResult;
    if (!r) return;

    r.revealed = true;

    if (r.didBust) {
      playBrakeSound();
    } else {
      playSuccessSound();
      if (r.isExact || r.stayedPlayerIndices.length === 0) {
        triggerConfetti(2500);
      }
    }

    saveState();
    renderDigitalRoundResultScreen();
  }

  // =========================================================================
  // TABLA DE POSICIONES (SALDO SUBE)
  // =========================================================================
  function renderSubeLeaderboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const d = state.digital;
    const players = d.config.players;

    const sorted = [...players].sort((a, b) => {
      const scoreA = d.scores[a.id] || 0;
      const scoreB = d.scores[b.id] || 0;
      return scoreB - scoreA;
    });

    sorted.forEach((p, rank) => {
      const row = document.createElement('div');
      row.className = 'sube-row';

      let medal = `${rank + 1}°`;
      if (rank === 0) medal = '🥇 1°';
      else if (rank === 1) medal = '🥈 2°';
      else if (rank === 2) medal = '🥉 3°';

      const points = d.scores[p.id] || 0;

      row.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <span style="font-weight: 700; font-size: 0.88rem; width: 45px;">${medal}</span>
          <span>${p.emoji}</span>
          <span style="font-weight: 600;">${p.name}</span>
        </div>
        <div class="sube-points">
          $${points} <span style="font-size: 0.75rem; text-transform: uppercase;">pts</span>
        </div>
      `;
      container.appendChild(row);
    });
  }

  // =========================================================================
  // SIGUIENTE RONDA O FIN DE PARTIDA
  // =========================================================================
  function nextRoundOrFinish() {
    const d = state.digital;
    const isLastRound = d.config.totalRounds > 0 && d.currentRound >= d.config.totalRounds;

    if (isLastRound) {
      showGameOverScreen();
    } else {
      d.currentRound++;
      startDigitalRound();
    }
  }

  function showGameOverScreen() {
    state.digital.roundPhase = 'game_over';
    renderPodium();
    renderSubeLeaderboard('finalLeaderboardList');
    showView('viewDigitalGameOver');
    triggerConfetti(5000);
    playSuccessSound();
    // Limpiar estado activo de localStorage para que no quede colgada como pendiente
    clearSavedGame();
  }

  function renderPodium() {
    const container = document.getElementById('podiumContainer');
    if (!container) return;
    container.innerHTML = '';

    const d = state.digital;
    const players = d.config.players;
    const sorted = [...players].sort((a, b) => (d.scores[b.id] || 0) - (d.scores[a.id] || 0));

    const p1 = sorted[0];
    const p2 = sorted[1];
    const p3 = sorted[2];

    const podiumOrder = [
      { player: p2, rank: 2, className: 'podium-2', medal: '🥈 2°' },
      { player: p1, rank: 1, className: 'podium-1', medal: '👑 1°' },
      { player: p3, rank: 3, className: 'podium-3', medal: '🥉 3°' }
    ];

    podiumOrder.forEach(item => {
      if (!item.player) return;
      const step = document.createElement('div');
      step.className = `podium-step ${item.className}`;
      const score = d.scores[item.player.id] || 0;

      step.innerHTML = `
        <div style="font-size: 1.6rem; margin-bottom: 2px;">${item.player.emoji}</div>
        <div class="podium-player-name">${item.player.name}</div>
        <div class="podium-score">$${score} pts</div>
        <div style="font-size: 0.8rem; font-weight: 700; color: #fff; margin-top: 2px;">${item.medal}</div>
      `;
      container.appendChild(step);
    });
  }

  // =========================================================================
  // MANEJO DE PARTIDA GUARDADA EN EL MENÚ
  // =========================================================================
  function checkSavedGameBanner() {
    const saved = loadState();
    const banner = document.getElementById('resumeGameCard');
    const info = document.getElementById('resumeGameInfo');
    if (!banner || !info) return;

    if (saved && hasActiveSavedGame(saved)) {
      if (saved.mode === 'digital' && saved.digital && saved.digital.config) {
        const d = saved.digital;
        const roundStr = d.config.totalRounds > 0 
          ? `Ronda ${d.currentRound} de ${d.config.totalRounds}`
          : `Ronda ${d.currentRound} (Modo Libre)`;
        const playerCount = (d.config.players && d.config.players.length) || 0;
        info.innerHTML = `<strong>🎮 Modo App Completa:</strong> ${roundStr} con ${playerCount} pasajeros arriba del bondi.`;
      } else if (saved.mode === 'tarjetero' && saved.tarjetero) {
        const cardNum = (saved.tarjetero.usedIds && saved.tarjetero.usedIds.length) || 1;
        info.innerHTML = `<strong>🎴 Modo Presencial (Tarjetero):</strong> Tarjeta #${cardNum} en curso.`;
      } else {
        info.textContent = 'Partida en curso detectada en tu dispositivo.';
      }
      banner.classList.remove('d-none');
    } else {
      banner.classList.add('d-none');
    }
  }

  function resumeSavedGame() {
    const saved = loadState();
    if (!saved || !hasActiveSavedGame(saved)) return;

    Object.assign(state, saved);
    if (saved.activeFilters) {
      activeFilters = saved.activeFilters;
    }

    if (state.mode === 'tarjetero') {
      if (!state.tarjetero.sessionDeck) {
        state.tarjetero.sessionDeck = buildPlayableDeck();
      }
      renderTarjeteroCard();
      showView('viewTarjetero');
      showToast('Partida presencial reanudada', '🎴');
    } else if (state.mode === 'digital') {
      if (!state.digital.sessionDeck) {
        state.digital.sessionDeck = buildPlayableDeck();
      }
      if (state.digital.roundPhase === 'round_result') {
        showView('viewDigitalRoundResult');
        renderDigitalRoundResultScreen();
      } else if (state.digital.roundPhase === 'game_over') {
        showGameOverScreen();
      } else {
        showView('viewDigitalGame');
        renderDigitalGameScreen();
      }
      showToast('Partida digital reanudada', '🎮');
    } else {
      showView('viewMenu');
    }
  }

  // =========================================================================
  // INICIALIZACIÓN DE EVENT LISTENERS
  // =========================================================================
  function setupEventListeners() {
    // Controles de cabecera
    const btnSound = document.getElementById('btnToggleSound');
    const soundIcon = document.getElementById('soundIcon');
    if (btnSound && soundIcon) {
      soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
      btnSound.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled);
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        if (soundEnabled) playBellSound();
      });
    }

    const rulesModalEl = document.getElementById('rulesModal');
    const rulesModal = rulesModalEl ? new bootstrap.Modal(rulesModalEl) : null;
    document.getElementById('btnOpenRules')?.addEventListener('click', () => rulesModal?.show());
    document.getElementById('btnRulesFromMenu')?.addEventListener('click', () => rulesModal?.show());

    const resetModalEl = document.getElementById('resetConfirmModal');
    const resetModal = resetModalEl ? new bootstrap.Modal(resetModalEl) : null;
    document.getElementById('btnResetGame')?.addEventListener('click', () => {
      if (state.mode === 'menu') return;
      resetModal?.show();
    });

    document.getElementById('btnAbandonTarjetero')?.addEventListener('click', () => {
      resetModal?.show();
    });

    document.getElementById('btnAbandonDigitalGame')?.addEventListener('click', () => {
      resetModal?.show();
    });

    document.getElementById('btnAbandonFromResults')?.addEventListener('click', () => {
      resetModal?.show();
    });

    document.getElementById('btnConfirmReset')?.addEventListener('click', () => {
      resetModal?.hide();
      clearSavedGame();
      state.mode = 'menu';
      showView('viewMenu');
      checkSavedGameBanner();
      showToast('Partida abandonada', '🚪');
    });

    // Menú principal: iniciar nueva partida descarta la guardada anterior
    document.getElementById('btnSelectModeTarjetero')?.addEventListener('click', () => {
      clearSavedGame();
      checkSavedGameBanner();
      initTarjeteroSetup();
    });

    document.getElementById('btnSelectModeDigital')?.addEventListener('click', () => {
      clearSavedGame();
      checkSavedGameBanner();
      initDigitalSetup();
    });

    document.getElementById('btnResumeGame')?.addEventListener('click', () => {
      resumeSavedGame();
    });

    document.getElementById('btnDiscardSavedGame')?.addEventListener('click', () => {
      clearSavedGame();
      checkSavedGameBanner();
      showToast('Partida guardada descartada', '🗑️');
    });

    // Modo Tarjetero Setup
    document.getElementById('btnTarjeteroSetupBack')?.addEventListener('click', () => {
      state.mode = 'menu';
      showView('viewMenu');
      checkSavedGameBanner();
    });

    document.getElementById('btnTarjeteroSelectAllCats')?.addEventListener('click', () => {
      activeFilters.categorias = metaData.categorias.map(c => normalizarClave(c.id));
      saveFilters();
      refreshTarjeteroFiltersUI();
    });

    document.getElementById('btnTarjeteroClearAllCats')?.addEventListener('click', () => {
      activeFilters.categorias = [];
      saveFilters();
      refreshTarjeteroFiltersUI();
    });

    document.getElementById('btnTarjeteroSelectAllDiffs')?.addEventListener('click', () => {
      activeFilters.dificultades = metaData.dificultades.map(d => normalizarClave(d.id));
      saveFilters();
      refreshTarjeteroFiltersUI();
    });

    document.getElementById('btnResetSeenTarjetero')?.addEventListener('click', () => {
      state.tarjetero.usedIds = [];
      saveState();
      updateDeckCounterUI('tarjeteroDeckStatusText', 'tarjeteroDeckCounterNumber', 'btnStartTarjetero', 'tarjetero');
      showToast('Preguntas vistas restablecidas: mazo completo', '🔄');
    });

    document.getElementById('btnStartTarjetero')?.addEventListener('click', startTarjeteroGame);

    // Modo Tarjetero Juego
    document.getElementById('btnTarjeteroBack')?.addEventListener('click', () => {
      state.mode = 'menu';
      showView('viewMenu');
      checkSavedGameBanner();
    });

    document.getElementById('btnTarjeteroOpenFilters')?.addEventListener('click', () => {
      initTarjeteroSetup();
    });

    document.getElementById('btnTarjeteroReveal')?.addEventListener('click', revealTarjeteroAnswer);
    document.getElementById('btnTarjeteroNext')?.addEventListener('click', nextTarjeteroCard);

    // Configuración Digital
    document.getElementById('btnSetupBack')?.addEventListener('click', () => {
      state.mode = 'menu';
      showView('viewMenu');
      checkSavedGameBanner();
    });

    document.getElementById('btnAddPlayer')?.addEventListener('click', addPlayer);
    document.getElementById('btnRandomizeNames')?.addEventListener('click', randomizeNames);

    document.getElementById('btnDigitalSelectAllCats')?.addEventListener('click', () => {
      activeFilters.categorias = metaData.categorias.map(c => normalizarClave(c.id));
      saveFilters();
      refreshDigitalFiltersUI();
    });

    document.getElementById('btnDigitalClearAllCats')?.addEventListener('click', () => {
      activeFilters.categorias = [];
      saveFilters();
      refreshDigitalFiltersUI();
    });

    document.getElementById('btnDigitalSelectAllDiffs')?.addEventListener('click', () => {
      activeFilters.dificultades = metaData.dificultades.map(d => normalizarClave(d.id));
      saveFilters();
      refreshDigitalFiltersUI();
    });

    document.getElementById('btnResetSeenDigital')?.addEventListener('click', () => {
      state.digital.usedQuestionIds = [];
      saveState();
      updateDeckCounterUI('digitalDeckStatusText', 'digitalDeckCounterNumber', 'btnStartGame', 'digital');
      showToast('Preguntas vistas restablecidas: mazo completo', '🔄');
    });

    // Selector de rondas
    document.querySelectorAll('.round-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.round-select-btn').forEach(b => {
          b.classList.remove('btn-bondi-gold', 'active');
          b.classList.add('btn-bondi-secondary');
        });
        btn.classList.remove('btn-bondi-secondary');
        btn.classList.add('btn-bondi-gold', 'active');
        state.digital.config.totalRounds = parseInt(btn.dataset.rounds, 10);
        saveState();
      });
    });

    document.getElementById('btnStartGame')?.addEventListener('click', startDigitalGame);

    // Pantalla de Juego Digital
    document.getElementById('btnConfirmInitialBet')?.addEventListener('click', handleConfirmInitialBet);
    document.getElementById('inputInitialBet')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleConfirmInitialBet();
    });

    document.getElementById('btnOpenRaiseBet')?.addEventListener('click', handleOpenRaiseForm);
    document.getElementById('btnCancelRaiseBet')?.addEventListener('click', handleCancelRaiseForm);
    document.getElementById('btnConfirmRaiseBet')?.addEventListener('click', handleConfirmRaiseBet);
    document.getElementById('inputRaiseBet')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleConfirmRaiseBet();
    });

    document.getElementById('btnStayOnBus')?.addEventListener('click', handleStayOnBus);
    document.getElementById('btnRingBell')?.addEventListener('click', handleRingBell);

    // Resultados de Ronda
    document.getElementById('btnRevealOfficialAnswer')?.addEventListener('click', revealOfficialAnswer);
    document.getElementById('btnNextRoundOrFinish')?.addEventListener('click', nextRoundOrFinish);

    // Fin de partida
    document.getElementById('btnPlayAgainSame')?.addEventListener('click', () => {
      startDigitalGame();
    });
    document.getElementById('btnGameOverToMenu')?.addEventListener('click', () => {
      clearSavedGame();
      state.mode = 'menu';
      showView('viewMenu');
      checkSavedGameBanner();
    });

    // Preguntas Reportadas / Descartar Dato Dudoso
    document.getElementById('btnReportTarjetero')?.addEventListener('click', handleReportTarjetero);
    document.getElementById('btnReportDigital')?.addEventListener('click', handleReportDigital);
    document.getElementById('btnOpenReportedTarjetero')?.addEventListener('click', openReportedModal);
    document.getElementById('btnOpenReportedDigital')?.addEventListener('click', openReportedModal);
    document.getElementById('btnCloseModalReported')?.addEventListener('click', closeReportedModal);
    document.getElementById('btnClearReported')?.addEventListener('click', clearReportedQuestions);
    document.getElementById('btnExportReported')?.addEventListener('click', exportReportedQuestions);
    document.getElementById('modalReportedQuestions')?.addEventListener('click', (e) => {
      if (e.target.id === 'modalReportedQuestions') {
        closeReportedModal();
      }
    });
  }

  // =========================================================================
  // ARRANQUE DE LA APLICACIÓN
  // =========================================================================
  async function init() {
    loadSavedPlayers();
    await loadMetadataAndQuestions();
    setupEventListeners();

    // Regla 1: Abrir siempre en el Menú Principal (Inicio) al cargar la página
    state.mode = 'menu';
    state.activeViewId = 'viewMenu';
    showView('viewMenu');

    // Regla 2: Mostrar aviso o botón "Continuar partida en curso" si hay una activa
    checkSavedGameBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
