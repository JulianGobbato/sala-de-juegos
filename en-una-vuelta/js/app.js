/**
 * ¡En Una Vuelta! - Lógica Principal del Juego
 * Basado en las reglas oficiales de "One Round?" (Devir / Schmidt)
 * Soporta TV + 1 Celular Control Remoto vía WebRTC (PeerJS) y Modo Solo Dispositivo.
 */

(function(window, document) {
  'use strict';

  // =========================================================================
  // CONSTANTES & CONFIGURACIÓN
  // =========================================================================
  const ROOM_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const PEER_PREFIX = 'en-una-vuelta-';
  const SOUND_STORAGE_KEY = 'en_una_vuelta_sound_enabled';
  const ROOM_STORAGE_KEY = 'en_una_vuelta_room';

  // =========================================================================
  // SISTEMA DE AUDIO (Web Audio API nativo sintetizado)
  // =========================================================================
  let audioCtx = null;
  let soundEnabled = localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';
  let timerInterval = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function setSoundEnabled(val) {
    soundEnabled = !!val;
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled);
    } catch (_) {}
    updateSoundIcons();
  }

  function updateSoundIcons() {
    document.querySelectorAll('.btn-sound-toggle span').forEach(el => {
      el.textContent = soundEnabled ? '🔊' : '🔇';
    });
  }

  function playTickSound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.035);
    } catch (_) {}
  }

  function playTimerWarningSound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);
    } catch (_) {}
  }

  function playCorrectSound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.22, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.32);
      });
    } catch (_) {}
  }

  function playErrorSound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      [280, 220, 160].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.22);
      });
    } catch (_) {}
  }

  function playOvertimeSound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.4);
      osc.frequency.linearRampToValueAtTime(400, now + 0.8);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.92);
    } catch (_) {}
  }

  function playVictorySound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const chords = [
        [523.25, 659.25, 783.99],
        [587.33, 739.99, 880.00],
        [659.25, 830.61, 987.77],
        [783.99, 987.77, 1174.66, 1567.98]
      ];
      chords.forEach((chord, step) => {
        chord.forEach(freq => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + step * 0.22);
          gain.gain.setValueAtTime(0.18, now + step * 0.22);
          gain.gain.exponentialRampToValueAtTime(0.001, now + step * 0.22 + 0.55);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + step * 0.22);
          osc.stop(now + step * 0.22 + 0.58);
        });
      });
    } catch (_) {}
  }

  // =========================================================================
  // SISTEMA DE CONFETI
  // =========================================================================
  let confettiParticles = [];
  let confettiAnimId = null;

  function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    confettiParticles = [];
    const colors = ['#10b981', '#34d399', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

    for (let i = 0; i < 110; i++) {
      confettiParticles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 300,
        y: canvas.height * 0.55,
        vx: (Math.random() - 0.5) * 18,
        vy: -Math.random() * 16 - 7,
        size: Math.random() * 9 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.35,
        alpha: 1
      });
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);

    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      confettiParticles.forEach(p => {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.alpha -= 0.007;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        confettiAnimId = requestAnimationFrame(update);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    update();
  }

  // =========================================================================
  // MODELO DE ESTADO DEL JUEGO
  // =========================================================================
  let wordPool = [];

  let setupConfig = {
    mode: 'cooperative',         // 'cooperative' | 'teams'
    timerEnabled: true,
    timerDuration: 20,           // 20, 30, 45, 60 o personalizado
    warmupRounds: true,          // Primeras 2 cartas sin tiempo
    initialWordsType: 'random',  // 'random' | 'manual'
    manualWords: {
      w0: 'Pastel',
      w33: 'Trabajo',
      w66: 'Fruta'
    }
  };

  let state = {
    role: null,                  // 'menu' | 'tv' | 'remote' | 'single'
    phase: 0,                    // 0: Configuración, 1: Dar pista, 2: Elegir hueco, 3: Resolución
    mode: 'cooperative',
    timerEnabled: true,
    timerDuration: 20,
    warmupRounds: true,
    activeTeam: 'blue',          // 'blue' | 'red' (para modo 2 equipos)
    teamLives: { blue: 3, red: 3 },
    lives: 3,                    // vidas cooperativas
    isOvertime: false,           // ¡Tiempo Extra!
    currentRound: 1,             // ronda / número de carta jugada
    totalCardsTarget: 12,        // 12 cartas en el mazo principal
    placedCards: [],             // [{ number: 0, word: "Pastel" }, { number: 33, word: "Trabajo" }, { number: 66, word: "Fruta" }]
    mainDeck: [],                // array de números [83, 14, 52...]
    replacementDeck: [],         // números restantes para reemplazos
    currentCard: null,           // { number: 83, clueWord: '' }
    selectedGapId: null,         // 'A', 'B', 'C'...
    lastResolution: null,        // { correct: bool, chosenGapId, correctGapId, card: {...}, stealAttempt: null }
    timerSeconds: 20,
    timerRunning: false,
    isTimerPaused: false,
    isGameOver: false,
    winner: null,                // 'win' (coop) o 'blue' | 'red'
    phoneSecretOpen: false       // privado en celular
  };

  // PeerJS
  let peer = null;
  let activeConn = null;
  let roomCode = null;

  // =========================================================================
  // GESTIÓN DE PALABRAS Y COLORES
  // =========================================================================
  function loadWordBank() {
    if (window.PALABRAS_DATA && Array.isArray(window.PALABRAS_DATA.palabras)) {
      wordPool = [...window.PALABRAS_DATA.palabras];
    } else {
      fetch('data/palabras.json')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.palabras)) {
            wordPool = [...data.palabras];
          }
        })
        .catch(err => console.warn('Error al cargar palabras.json:', err));
    }
  }

  function getRandomWord() {
    if (!wordPool || !wordPool.length) return 'Palabra';
    return wordPool[Math.floor(Math.random() * wordPool.length)];
  }

  function getCardColor(num) {
    if (num === 0 || num === 100) return { bg: '#7c3aed', text: '#ffffff', name: 'Violeta' };
    if (num <= 19) return { bg: '#2563eb', text: '#ffffff', name: 'Azul' };
    if (num <= 39) return { bg: '#0891b2', text: '#ffffff', name: 'Turquesa' };
    if (num <= 49) return { bg: '#059669', text: '#ffffff', name: 'Verde' };
    if (num <= 59) return { bg: '#ca8a04', text: '#000000', name: 'Amarillo' };
    if (num <= 79) return { bg: '#ea580c', text: '#ffffff', name: 'Naranja' };
    return { bg: '#e11d48', text: '#ffffff', name: 'Rosa/Rojo' };
  }

  // =========================================================================
  // MATEMÁTICA Y GESTIÓN DE HUECOS DEL CÍRCULO
  // =========================================================================
  /**
   * Genera los huecos disponibles entre las cartas colocadas en el círculo.
   * Las cartas están ordenadas por número ascendente: 0, 33, 66...
   */
  function calculateCurrentGaps() {
    const cards = [...state.placedCards].sort((a, b) => a.number - b.number);
    const gaps = [];

    for (let i = 0; i < cards.length; i++) {
      const prev = cards[i];
      const next = cards[(i + 1) % cards.length];
      const letter = String.fromCharCode(65 + i); // 'A', 'B', 'C'...

      const prevNumStr = prev.number === 0 ? '100/0' : prev.number;
      const nextNumStr = next.number === 0 ? '100/0' : next.number;

      gaps.push({
        id: letter,
        index: i,
        prevCard: prev,
        nextCard: next,
        prevCardIndex: i,
        nextCardIndex: (i + 1) % cards.length,
        prevNumStr,
        nextNumStr,
        label: `Hueco ${letter}: [${prevNumStr} ${prev.word}] ↔ [${nextNumStr} ${next.word}]`,
        description: `Entre [${prevNumStr}: ${prev.word}] y [${nextNumStr}: ${next.word}]`
      });
    }
    return gaps;
  }

  /**
   * Determina a qué hueco (id 'A', 'B'...) pertenece un número dado.
   */
  function getCorrectGapForNumber(num) {
    const gaps = calculateCurrentGaps();
    for (const g of gaps) {
      const min = g.prevCard.number;
      const max = g.nextCard.number;

      if (max === 0) {
        // Hueco entre la carta más alta y el 100/0 (cubre desde min+1 hasta 99)
        if (num > min) return g.id;
      } else {
        if (num > min && num < max) return g.id;
      }
    }
    return gaps[0] ? gaps[0].id : 'A';
  }

  // =========================================================================
  // INICIALIZACIÓN DE LA APLICACIÓN
  // =========================================================================
  function initApp() {
    loadWordBank();
    setupHeaderButtons();
    setupMenuRoleButtons();
    checkAutoConnectParams();
  }

  function checkAutoConnectParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const salaParam = urlParams.get('sala') || urlParams.get('code');
    const storedRoom = sessionStorage.getItem(ROOM_STORAGE_KEY);

    if (salaParam) {
      startRemoteRole(salaParam.toUpperCase().trim());
    } else if (storedRoom && window.location.hash === '#remote') {
      startRemoteRole(storedRoom);
    } else {
      showView('viewMenu');
    }
  }

  function setupHeaderButtons() {
    updateSoundIcons();
    document.querySelectorAll('.btn-sound-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        initAudioContext();
        setSoundEnabled(!soundEnabled);
      });
    });

    const btnFs = document.getElementById('btnToggleFullscreen');
    if (btnFs) {
      btnFs.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      const fsIcon = document.getElementById('fsIcon');
      if (fsIcon) fsIcon.textContent = isFs ? '🪟' : '📺';
    });
  }

  function showView(viewId) {
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
  }

  // =========================================================================
  // SELECCIÓN DE ROL DESDE EL MENÚ
  // =========================================================================
  function setupMenuRoleButtons() {
    const btnTv = document.getElementById('btnSelectRoleTv');
    if (btnTv) {
      btnTv.addEventListener('click', () => {
        initAudioContext();
        startTvRole();
      });
    }

    const btnRemote = document.getElementById('btnSelectRoleRemote');
    if (btnRemote) {
      btnRemote.addEventListener('click', () => {
        const code = prompt('Ingresá el código de 4 letras que aparece en la TV (ej. K7M2):');
        if (code) startRemoteRole(code.toUpperCase().trim());
      });
    }

    const btnSingle = document.getElementById('btnSelectRoleSingle');
    if (btnSingle) {
      btnSingle.addEventListener('click', () => {
        initAudioContext();
        startSingleDeviceRole();
      });
    }
  }

  // =========================================================================
  // ROL 1: PANTALLA TV (HOST VISUAL)
  // =========================================================================
  function generateRoomCode() {
    let res = '';
    for (let i = 0; i < 4; i++) {
      res += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
    }
    return res;
  }

  function startTvRole() {
    state.role = 'tv';
    showView('viewTv');
    initDefaultGameState();

    roomCode = generateRoomCode();
    const peerId = PEER_PREFIX + roomCode;

    showTvConnectModal(roomCode);

    try {
      peer = new Peer(peerId);

      peer.on('connection', (conn) => {
        activeConn = conn;
        hideTvConnectModal();

        conn.on('open', () => {
          broadcastStateToRemote();
        });

        conn.on('data', (data) => {
          handleRemoteMessage(data);
        });

        conn.on('close', () => {
          const ticker = document.getElementById('tvStatusTicker');
          if (ticker) ticker.textContent = '⚠️ Celular desconectado temporalmente. Esperando reconexión...';
        });
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          roomCode = generateRoomCode();
          startTvRole();
        }
      });
    } catch (e) {
      console.error(e);
    }

    renderTvBoard();
  }

  function showTvConnectModal(code) {
    const modal = document.getElementById('tvConnectModal');
    if (!modal) return;
    modal.classList.remove('d-none');

    const codeBadge = document.getElementById('tvRoomCodeText');
    if (codeBadge) codeBadge.textContent = code;

    const url = `${window.location.origin}${window.location.pathname}?sala=${code}`;
    const qrContainer = document.getElementById('tvQrContainer');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
          text: url,
          width: 200,
          height: 200,
          colorDark: '#01140e',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
        img.alt = 'Código QR de conexión';
        qrContainer.appendChild(img);
      }
    }
  }

  function hideTvConnectModal() {
    const modal = document.getElementById('tvConnectModal');
    if (modal) modal.classList.add('d-none');
    const ticker = document.getElementById('tvStatusTicker');
    if (ticker) ticker.textContent = '🟢 Celular Control Remoto conectado. ¡Configuren la partida desde el teléfono!';
  }

  function broadcastStateToRemote() {
    if (activeConn && activeConn.open) {
      const payload = { ...state, phoneSecretOpen: undefined };
      activeConn.send({ type: 'SYNC_STATE', payload });
    }
  }

  // =========================================================================
  // ROL 2: CELULAR CONTROL REMOTO
  // =========================================================================
  function startRemoteRole(code) {
    state.role = 'remote';
    roomCode = code;
    sessionStorage.setItem(ROOM_STORAGE_KEY, code);
    window.location.hash = '#remote';

    showView('viewRemote');
    renderRemoteHeader();

    initRemotePeerConnection();
  }

  function renderRemoteHeader() {
    const label = document.getElementById('remoteRoomCodeDisplay');
    if (label) label.textContent = roomCode;
  }

  function initRemotePeerConnection() {
    const peerIdTv = PEER_PREFIX + roomCode;
    const dot = document.getElementById('remoteConnDot');
    const label = document.getElementById('remoteConnLabel');

    if (dot) dot.className = 'connection-dot offline';
    if (label) label.textContent = 'Conectando a TV (' + roomCode + ')...';

    try {
      peer = new Peer();

      peer.on('open', () => {
        connectToTvHost(peerIdTv);
      });

      peer.on('error', () => {
        if (label) label.textContent = 'Error de conexión. Reintentando...';
        setTimeout(() => connectToTvHost(peerIdTv), 2500);
      });
    } catch (e) {
      console.error(e);
    }
  }

  function connectToTvHost(targetId) {
    if (!peer || peer.destroyed) return;
    const dot = document.getElementById('remoteConnDot');
    const label = document.getElementById('remoteConnLabel');

    activeConn = peer.connect(targetId, { reliable: true });

    activeConn.on('open', () => {
      if (dot) dot.className = 'connection-dot';
      if (label) label.textContent = '🟢 TV Conectada (' + roomCode + ')';
    });

    activeConn.on('data', (data) => {
      if (data && data.type === 'SYNC_STATE') {
        const localSecret = state.phoneSecretOpen;
        state = { ...data.payload, role: 'remote', phoneSecretOpen: localSecret };
        if (state.mode) setupConfig.mode = state.mode;
        if (state.timerEnabled !== undefined) setupConfig.timerEnabled = state.timerEnabled;
        if (state.timerDuration) setupConfig.timerDuration = state.timerDuration;
        if (state.warmupRounds !== undefined) setupConfig.warmupRounds = state.warmupRounds;
        renderRemoteUI();
      }
    });

    activeConn.on('close', () => {
      if (dot) dot.className = 'connection-dot offline';
      if (label) label.textContent = '⚠️ Reconectando con la TV...';
      setTimeout(() => connectToTvHost(targetId), 2000);
    });
  }

  function sendRemoteAction(type, payload = {}) {
    if (activeConn && activeConn.open) {
      activeConn.send({ type, ...payload });
    }
  }

  // =========================================================================
  // GESTOR DE ACCIONES EN LA TV (Recibidos del Celular)
  // =========================================================================
  function handleRemoteMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'START_GAME':
        applySetupConfig(msg.config);
        startNewGameMatch();
        break;

      case 'GO_TO_SETUP':
        stopTimer();
        state.phase = 0;
        state.isGameOver = false;
        broadcastStateToRemote();
        renderTvBoard();
        break;

      case 'SUBMIT_CLUE':
        handleClueSubmission(msg.clueWord);
        break;

      case 'SELECT_GAP_PREVIEW':
        state.selectedGapId = msg.gapId;
        renderTvBoard();
        break;

      case 'CONFIRM_GAP':
        resolveGapChoice(msg.gapId);
        break;

      case 'STEAL_ATTEMPT':
        resolveStealAttempt(msg.gapId);
        break;

      case 'DISCARD_AND_REPLACE':
        discardCurrentCard(false);
        break;

      case 'GIVE_UP_NO_CLUE':
        discardCurrentCard(true); // pierde vida
        break;

      case 'NEXT_CARD':
        advanceToNextCard();
        break;

      case 'TIMER_PAUSE_TOGGLE':
        toggleTimerPause();
        break;

      case 'TIMER_ADD_10':
        addTimerSeconds(10);
        break;
    }
  }

  // =========================================================================
  // ROL 3: UN SOLO DISPOSITIVO (SIN PEERJS)
  // =========================================================================
  function startSingleDeviceRole() {
    state.role = 'single';
    showView('viewTv');
    initDefaultGameState();

    const singleControls = document.getElementById('singleDeviceControls');
    if (singleControls) singleControls.classList.remove('d-none');

    renderTvBoard();
    renderSingleControls();
  }

  // =========================================================================
  // LÓGICA DE PARTIDA (REGLAS OFICIALES DE "ONE ROUND?")
  // =========================================================================
  function initDefaultGameState() {
    state.phase = 0;
    state.lives = 3;
    state.teamLives = { blue: 3, red: 3 };
    state.activeTeam = 'blue';
    state.isOvertime = false;
    state.currentRound = 1;
    state.totalCardsTarget = 12;
    state.isGameOver = false;
    state.winner = null;
    state.currentCard = null;
    state.selectedGapId = null;
    state.lastResolution = null;
    state.phoneSecretOpen = false;
    stopTimer();
  }

  function applySetupConfig(config) {
    if (!config) return;
    setupConfig = { ...setupConfig, ...config };

    state.mode = setupConfig.mode || 'cooperative';
    state.timerEnabled = !!setupConfig.timerEnabled;
    state.timerDuration = parseInt(setupConfig.timerDuration, 10) || 20;
    state.warmupRounds = !!setupConfig.warmupRounds;
  }

  function startNewGameMatch() {
    stopTimer();
    state.phase = 1;
    state.lives = 3;
    state.teamLives = { blue: 3, red: 3 };
    state.activeTeam = 'blue';
    state.isOvertime = false;
    state.currentRound = 1;
    state.totalCardsTarget = 12;
    state.isGameOver = false;
    state.winner = null;
    state.selectedGapId = null;
    state.lastResolution = null;
    state.phoneSecretOpen = false;

    // 1. Preparar las 3 cartas iniciales (100/0, 33 y 66)
    let w0 = setupConfig.manualWords.w0;
    let w33 = setupConfig.manualWords.w33;
    let w66 = setupConfig.manualWords.w66;

    if (setupConfig.initialWordsType !== 'manual' || !w0 || !w33 || !w66) {
      w0 = getRandomWord();
      do { w33 = getRandomWord(); } while (w33 === w0);
      do { w66 = getRandomWord(); } while (w66 === w0 || w66 === w33);
    }

    state.placedCards = [
      { number: 0, word: w0 },
      { number: 33, word: w33 },
      { number: 66, word: w66 }
    ];

    // 2. Barajar los números del 1 al 99 (excluyendo 33 y 66)
    const allNums = [];
    for (let n = 1; n <= 99; n++) {
      if (n !== 33 && n !== 66) allNums.push(n);
    }
    // Barajar
    for (let i = allNums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allNums[i], allNums[j]] = [allNums[j], allNums[i]];
    }

    // 12 cartas para el mazo principal y el resto como reemplazo
    state.mainDeck = allNums.slice(0, 12);
    state.replacementDeck = allNums.slice(12);

    // 3. Tomar la primera carta del mazo
    drawNextCardFromDeck();

    broadcastStateToRemote();
    renderTvBoard();
    if (state.role === 'single') renderSingleControls();
  }

  function drawNextCardFromDeck() {
    if (!state.mainDeck.length) {
      checkGameEndCondition();
      return;
    }

    const nextNum = state.mainDeck[0];
    state.currentCard = {
      number: nextNum,
      clueWord: ''
    };
    state.phase = 1;
    state.selectedGapId = null;
    state.phoneSecretOpen = false;

    // Configurar reloj si corresponde
    if (state.timerEnabled) {
      // Si están en rondas de calentamiento (primeras 2 cartas), sin tiempo
      if (state.warmupRounds && state.currentRound <= 2 && !state.isOvertime) {
        state.timerRunning = false;
        state.timerSeconds = state.timerDuration;
      } else {
        startTimer(state.timerDuration);
      }
    } else {
      state.timerRunning = false;
      state.timerSeconds = state.timerDuration;
    }
  }

  // =========================================================================
  // GESTIÓN DEL TEMPORIZADOR
  // =========================================================================
  function startTimer(seconds) {
    stopTimer();
    state.timerSeconds = seconds;
    state.timerRunning = true;
    state.isTimerPaused = false;

    timerInterval = setInterval(() => {
      if (state.isTimerPaused) return;

      state.timerSeconds--;
      if (state.timerSeconds <= 5 && state.timerSeconds > 0) {
        playTimerWarningSound();
      }

      if (state.timerSeconds <= 0) {
        state.timerSeconds = 0;
        stopTimer();
        handleTimerExpired();
      }

      updateTimerVisuals();
      broadcastStateToRemote();
    }, 1000);

    updateTimerVisuals();
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    state.timerRunning = false;
  }

  function toggleTimerPause() {
    if (!state.timerRunning) return;
    state.isTimerPaused = !state.isTimerPaused;
    broadcastStateToRemote();
    renderTvBoard();
    if (state.role === 'single') renderSingleControls();
  }

  function addTimerSeconds(extra) {
    if (!state.timerRunning) return;
    state.timerSeconds = Math.min(120, state.timerSeconds + extra);
    updateTimerVisuals();
    broadcastStateToRemote();
    renderTvBoard();
  }

  function handleTimerExpired() {
    playErrorSound();
    // Si expira en Fase 1 (Informante pensando pista):
    if (state.phase === 1) {
      // Pierde 1 vida por tiempo agotado y descarta
      discardCurrentCard(true);
    }
    // Si expira en Fase 2 (Equipo debatiendo en Tiempo Extra):
    else if (state.phase === 2) {
      resolveGapChoice(null); // Fallo automático por tiempo
    }
  }

  function updateTimerVisuals() {
    const numEl = document.getElementById('tvTimerNumber');
    const pill = document.getElementById('tvTimerPill');
    const ring = document.getElementById('timerProgressRing');

    if (numEl) numEl.textContent = state.timerSeconds;
    if (pill) {
      pill.classList.toggle('urgent', state.timerSeconds <= 5 && state.timerRunning);
      if (!state.timerEnabled || (state.warmupRounds && state.currentRound <= 2 && !state.isOvertime)) {
        pill.innerHTML = '<span>♾️</span> Sin tiempo';
      } else {
        pill.innerHTML = `<span>⏱️</span><span id="tvTimerNumber">${state.timerSeconds}</span>s`;
      }
    }

    if (ring) {
      const total = state.timerDuration || 20;
      const frac = Math.max(0, Math.min(1, state.timerSeconds / total));
      const circumference = 879.6; // 2 * PI * 140
      ring.style.strokeDashoffset = (circumference * (1 - frac)).toFixed(1);
    }
  }

  // =========================================================================
  // FASE 1 -> FASE 2: PISTA DADA POR EL INFORMANTE
  // =========================================================================
  function handleClueSubmission(clueWord) {
    if (!clueWord || !clueWord.trim()) return;

    state.currentCard.clueWord = clueWord.trim().toUpperCase();
    state.phase = 2;
    state.selectedGapId = null;
    stopTimer();

    // En Fase 2: si están en TIEMPO EXTRA y el reloj está habilitado, corre el tiempo para el equipo
    if (state.isOvertime && state.timerEnabled) {
      startTimer(state.timerDuration);
    }

    broadcastStateToRemote();
    renderTvBoard();
    if (state.role === 'single') renderSingleControls();
  }

  function discardCurrentCard(loseLife = false) {
    stopTimer();

    if (loseLife) {
      applyLifePenalty();
    }

    // Quitar la carta actual del mazo y pasar a reemplazo
    if (state.mainDeck.length) {
      state.mainDeck.shift();
    }
    // Agregar 1 del mazo de reemplazo para mantener las cartas de la partida
    if (state.replacementDeck.length) {
      state.mainDeck.push(state.replacementDeck.shift());
    }

    if (!state.isGameOver) {
      drawNextCardFromDeck();
      broadcastStateToRemote();
      renderTvBoard();
      if (state.role === 'single') renderSingleControls();
    }
  }

  // =========================================================================
  // FASE 2 -> FASE 3: RESOLUCIÓN Y COLOCACIÓN DE LA CARTA
  // =========================================================================
  function resolveGapChoice(chosenGapId) {
    stopTimer();
    const correctGapId = getCorrectGapForNumber(state.currentCard.number);
    const isCorrect = chosenGapId === correctGapId;
    const isLastCard = state.mainDeck.length === 1;

    state.phase = 3;
    state.lastResolution = {
      correct: isCorrect,
      chosenGapId,
      correctGapId,
      card: { ...state.currentCard },
      isLastCard,
      awaitingSteal: false
    };

    if (isCorrect) {
      playCorrectSound();
      insertCardIntoCircle(state.currentCard.number, state.currentCard.clueWord);

      if (isLastCard) {
        // ¡VICTORIA! Acertaron la última carta
        handleVictoryCondition();
        return;
      }
    } else {
      playErrorSound();

      // En Modo 2 Equipos: si el rival perdió vidas previamente, dar chance de robo
      const rivalTeam = state.activeTeam === 'blue' ? 'red' : 'blue';
      const rivalLostLives = state.mode === 'teams' && state.teamLives[rivalTeam] < 3;

      if (rivalLostLives) {
        state.lastResolution.awaitingSteal = true;
        broadcastStateToRemote();
        renderTvBoard();
        if (state.role === 'single') renderSingleControls();
        return; // Espera intento de robo antes de colocar la carta
      }

      // Penalización de vida habitual
      applyLifePenalty();

      // REGLA CRÍTICA: La carta SIEMPRE se coloca en su hueco correcto
      if (!state.isGameOver) {
        insertCardIntoCircle(state.currentCard.number, state.currentCard.clueWord);

        // REGLA DE LA ÚLTIMA CARTA:
        // Si fallan en la carta 12 pero no perdieron, se agrega 1 carta de reemplazo para que deban ganar acertando
        if (isLastCard && state.replacementDeck.length) {
          state.mainDeck.push(state.replacementDeck.shift());
          state.totalCardsTarget++;
        }
      }
    }

    broadcastStateToRemote();
    renderTvBoard();
    if (state.role === 'single') renderSingleControls();
  }

  function resolveStealAttempt(chosenGapId) {
    const correctGapId = state.lastResolution.correctGapId;
    const rivalTeam = state.activeTeam === 'blue' ? 'red' : 'blue';
    const stoleSuccess = chosenGapId === correctGapId;

    state.lastResolution.awaitingSteal = false;
    state.lastResolution.stealSuccess = stoleSuccess;

    if (stoleSuccess) {
      playCorrectSound();
      // Rival recupera +1 vida
      state.teamLives[rivalTeam] = Math.min(3, state.teamLives[rivalTeam] + 1);
    } else {
      playErrorSound();
    }

    // Aplicar penalización al equipo activo que falló
    applyLifePenalty();

    // Colocar la carta en su lugar
    if (!state.isGameOver) {
      insertCardIntoCircle(state.currentCard.number, state.currentCard.clueWord);

      if (state.lastResolution.isLastCard && state.replacementDeck.length) {
        state.mainDeck.push(state.replacementDeck.shift());
        state.totalCardsTarget++;
      }
    }

    broadcastStateToRemote();
    renderTvBoard();
    if (state.role === 'single') renderSingleControls();
  }

  function applyLifePenalty() {
    if (state.mode === 'teams') {
      state.teamLives[state.activeTeam]--;
      if (state.teamLives[state.activeTeam] <= 0) {
        if (!state.isOvertime) {
          state.isOvertime = true;
          playOvertimeSound();
        } else {
          // Ya estaban en tiempo extra y volvieron a fallar -> DERROTA
          state.isGameOver = true;
          state.winner = state.activeTeam === 'blue' ? 'red' : 'blue';
          return;
        }
      }
    } else {
      state.lives--;
      if (state.lives <= 0) {
        if (!state.isOvertime) {
          state.isOvertime = true;
          playOvertimeSound();
        } else {
          state.isGameOver = true;
          state.winner = 'defeat';
          return;
        }
      }
    }
  }

  function insertCardIntoCircle(number, word) {
    state.placedCards.push({ number, word });
    state.placedCards.sort((a, b) => a.number - b.number);
  }

  function advanceToNextCard() {
    if (state.isGameOver) {
      initDefaultGameState();
      broadcastStateToRemote();
      renderTvBoard();
      if (state.role === 'single') renderSingleControls();
      return;
    }

    // Quitar la carta actual jugada
    if (state.mainDeck.length) {
      state.mainDeck.shift();
    }

    state.currentRound++;

    // Alternar equipo en modo 2 equipos
    if (state.mode === 'teams') {
      state.activeTeam = state.activeTeam === 'blue' ? 'red' : 'blue';
    }

    drawNextCardFromDeck();
    broadcastStateToRemote();
    renderTvBoard();
    if (state.role === 'single') renderSingleControls();
  }

  function handleVictoryCondition() {
    stopTimer();
    state.isGameOver = true;
    state.winner = state.mode === 'teams' ? state.activeTeam : 'win';
    playVictorySound();
    launchConfetti();
    broadcastStateToRemote();
    renderTvBoard();
    if (state.role === 'single') renderSingleControls();
  }

  function checkGameEndCondition() {
    if (!state.mainDeck.length) {
      handleVictoryCondition();
    }
  }

  // =========================================================================
  // RENDERIZADO VISUAL DEL TABLERO CIRCULAR EN LA TV
  // =========================================================================
  function renderTvBoard() {
    // Marcador y Top Bar
    const modeBadge = document.getElementById('tvModeBadge');
    const counterBadge = document.getElementById('tvCardsCounter');
    const overtimeBanner = document.getElementById('tvOvertimeBanner');

    if (modeBadge) {
      if (state.mode === 'teams') {
        const isBlue = state.activeTeam === 'blue';
        modeBadge.className = `tv-team-badge ${isBlue ? 'tv-team-blue' : 'tv-team-red'}`;
        modeBadge.textContent = isBlue ? '🔵 Turno Equipo Azul' : '🔴 Turno Equipo Rojo';
      } else {
        modeBadge.className = 'tv-team-badge tv-team-coop';
        modeBadge.textContent = '🤝 Partida Cooperativa';
      }
    }

    if (counterBadge) {
      const placedCount = state.placedCards.length - 3;
      counterBadge.textContent = `Carta ${Math.min(placedCount, state.totalCardsTarget)} / ${state.totalCardsTarget}`;
    }

    // Vidas
    const h1 = document.getElementById('tvHeart1');
    const h2 = document.getElementById('tvHeart2');
    const h3 = document.getElementById('tvHeart3');
    const currentLives = state.mode === 'teams' ? state.teamLives[state.activeTeam] : state.lives;

    if (h1) h1.classList.toggle('lost', currentLives < 1);
    if (h2) h2.classList.toggle('lost', currentLives < 2);
    if (h3) h3.classList.toggle('lost', currentLives < 3);

    // Banner de Tiempo Extra
    if (overtimeBanner) {
      overtimeBanner.classList.toggle('d-none', !state.isOvertime || state.isGameOver);
    }

    updateTimerVisuals();

    // RENDERIZAR TABLERO CIRCULAR SVG
    renderCircleBoardSvg();

    // Dashboard Central del SVG
    renderCenterDashboard();

    // Ticker inferior
    updateTvTicker();
  }

  function renderCircleBoardSvg() {
    const cardsLayer = document.getElementById('circleCardsLayer');
    const gapsLayer = document.getElementById('circleGapsLayer');
    const gapsArcs = document.getElementById('circleGapsArcs');
    const ticksGroup = document.getElementById('circleTicks');

    if (!cardsLayer || !gapsLayer) return;

    cardsLayer.innerHTML = '';
    gapsLayer.innerHTML = '';
    if (gapsArcs) gapsArcs.innerHTML = '';

    const cards = [...state.placedCards].sort((a, b) => a.number - b.number);
    const N = cards.length;
    if (N === 0) return;

    // Radio único para el carril circular donde se intercalan cartas y huecos
    const R_TRACK = 295;
    const scale = N > 12 ? 0.76 : (N > 10 ? 0.86 : 1.0);
    const gapScale = N > 12 ? 0.80 : (N > 10 ? 0.88 : 1.0);

    const gaps = calculateCurrentGaps();
    const selectedGap = gaps.find(g => g.id === state.selectedGapId);

    // 1. Ticks decorativos en el borde exterior de la mesa
    if (ticksGroup && !ticksGroup.children.length) {
      for (let i = 0; i < 100; i += 10) {
        const angle = (i / 100) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const x1 = 400 + 360 * Math.cos(rad);
        const y1 = 400 + 360 * Math.sin(rad);
        const x2 = 400 + 375 * Math.cos(rad);
        const y2 = 400 + 375 * Math.sin(rad);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1.toFixed(1));
        line.setAttribute('y1', y1.toFixed(1));
        line.setAttribute('x2', x2.toFixed(1));
        line.setAttribute('y2', y2.toFixed(1));
        ticksGroup.appendChild(line);
      }
    }

    // 2. Arco conector iluminado entre las dos cartas del hueco seleccionado
    if (selectedGap && state.phase >= 2 && gapsArcs) {
      const idx = selectedGap.index;
      const angleStart = -90 + (idx * (360 / N));
      const angleEnd = -90 + ((idx + 1) * (360 / N));
      const radStart = (angleStart * Math.PI) / 180;
      const radEnd = (angleEnd * Math.PI) / 180;
      const p1x = 400 + R_TRACK * Math.cos(radStart);
      const p1y = 400 + R_TRACK * Math.sin(radStart);
      const p2x = 400 + R_TRACK * Math.cos(radEnd);
      const p2y = 400 + R_TRACK * Math.sin(radEnd);

      const arcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arcPath.setAttribute('d', `M ${p1x.toFixed(1)} ${p1y.toFixed(1)} A ${R_TRACK} ${R_TRACK} 0 0 1 ${p2x.toFixed(1)} ${p2y.toFixed(1)}`);
      arcPath.setAttribute('fill', 'none');
      arcPath.setAttribute('stroke', '#f59e0b');
      arcPath.setAttribute('stroke-width', '6');
      arcPath.setAttribute('stroke-linecap', 'round');
      arcPath.setAttribute('filter', 'url(#goldGlowEffect)');
      gapsArcs.appendChild(arcPath);
    }

    // 3. Dibujar Cartas Colocadas (Distribución equidistante: ángulo = -90 + i * (360 / N))
    cards.forEach((card, i) => {
      const angle = -90 + (i * (360 / N));
      const rad = (angle * Math.PI) / 180;
      const cx = 400 + R_TRACK * Math.cos(rad);
      const cy = 400 + R_TRACK * Math.sin(rad);
      const col = getCardColor(card.number);

      // Iluminar cartas vecinas si su hueco intermedio está seleccionado
      const isNeighborOfSelected = (state.phase >= 2) && selectedGap &&
        (selectedGap.prevCardIndex === i || selectedGap.nextCardIndex === i);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) scale(${scale})`);

      // Fondo píldora de la carta
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '-50');
      rect.setAttribute('y', '-22');
      rect.setAttribute('width', '100');
      rect.setAttribute('height', '44');
      rect.setAttribute('rx', '10');
      rect.setAttribute('fill', isNeighborOfSelected ? '#06382b' : '#021a14');
      rect.setAttribute('stroke', isNeighborOfSelected ? '#f59e0b' : col.bg);
      rect.setAttribute('stroke-width', isNeighborOfSelected ? '3.5' : '2');
      rect.setAttribute('filter', isNeighborOfSelected ? 'url(#goldGlowEffect)' : 'url(#glowEffect)');
      g.appendChild(rect);

      // Número
      const txtNum = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txtNum.setAttribute('x', '0');
      txtNum.setAttribute('y', '-4');
      txtNum.setAttribute('text-anchor', 'middle');
      txtNum.setAttribute('font-family', 'Bebas Neue');
      txtNum.setAttribute('font-size', '19');
      txtNum.setAttribute('fill', isNeighborOfSelected ? '#fef08a' : col.bg);
      txtNum.textContent = card.number === 0 ? '100 / 0' : card.number;
      g.appendChild(txtNum);

      // Palabra
      const txtWord = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txtWord.setAttribute('x', '0');
      txtWord.setAttribute('y', '14');
      txtWord.setAttribute('text-anchor', 'middle');
      txtWord.setAttribute('font-family', 'Outfit');
      txtWord.setAttribute('font-weight', '700');
      txtWord.setAttribute('font-size', '12');
      txtWord.setAttribute('fill', '#ffffff');
      txtWord.textContent = card.word;
      g.appendChild(txtWord);

      cardsLayer.appendChild(g);
    });

    // 4. Dibujar Huecos Disponibles sobre el mismo anillo (Ángulo medio: -90 + (i + 0.5) * (360 / N))
    // Casillero / Slot punteado con signo "+" y la letra grande (+ A, + B...)
    if (state.phase >= 2) {
      gaps.forEach((gap, i) => {
        const angleGap = -90 + ((i + 0.5) * (360 / N));
        const radGap = (angleGap * Math.PI) / 180;
        const gx = 400 + R_TRACK * Math.cos(radGap);
        const gy = 400 + R_TRACK * Math.sin(radGap);

        const isSelected = state.selectedGapId === gap.id;

        // Comprobación de estado en Fase 3 (Resultado)
        let isCorrectReveal = false;
        let isWrongReveal = false;
        if (state.phase === 3 && state.lastResolution) {
          if (state.lastResolution.correctGapId === gap.id) isCorrectReveal = true;
          if (!state.lastResolution.correct && state.lastResolution.chosenGapId === gap.id) isWrongReveal = true;
        }

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'gap-slot-group');
        g.setAttribute('transform', `translate(${gx.toFixed(1)}, ${gy.toFixed(1)}) scale(${gapScale})`);
        g.style.cursor = 'pointer';

        // Slot punteado del casillero
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '-35');
        rect.setAttribute('y', '-18');
        rect.setAttribute('width', '70');
        rect.setAttribute('height', '36');
        rect.setAttribute('rx', '10');
        rect.setAttribute('class', 'gap-slot-rect');

        if (isCorrectReveal) {
          rect.setAttribute('fill', '#10b981');
          rect.setAttribute('stroke', '#6ee7b7');
          rect.setAttribute('stroke-width', '3');
          rect.setAttribute('filter', 'url(#glowEffect)');
        } else if (isWrongReveal) {
          rect.setAttribute('fill', '#ef4444');
          rect.setAttribute('stroke', '#fca5a5');
          rect.setAttribute('stroke-width', '3');
        } else if (isSelected) {
          rect.setAttribute('fill', '#f59e0b');
          rect.setAttribute('stroke', '#fef08a');
          rect.setAttribute('stroke-width', '3');
          rect.setAttribute('filter', 'url(#goldGlowEffect)');
        } else {
          rect.setAttribute('fill', '#021a14');
          rect.setAttribute('stroke', 'rgba(52, 211, 153, 0.7)');
          rect.setAttribute('stroke-width', '2');
          rect.setAttribute('stroke-dasharray', '4 3');
        }
        g.appendChild(rect);

        // Texto "+ A", "+ B"...
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', '0');
        txt.setAttribute('y', '6');
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-family', 'Bebas Neue');
        txt.setAttribute('font-size', isSelected || isCorrectReveal ? '20' : '17');
        txt.setAttribute('letter-spacing', '1');

        if (isCorrectReveal || isWrongReveal || isSelected) {
          txt.setAttribute('fill', '#021a14');
          txt.setAttribute('font-weight', '900');
        } else {
          txt.setAttribute('fill', '#34d399');
          txt.setAttribute('font-weight', 'bold');
        }
        txt.textContent = `+ ${gap.id}`;
        g.appendChild(txt);

        // Permitir clic directo en pantalla para seleccionar el hueco
        g.addEventListener('click', () => {
          if (state.phase === 2 || (state.phase === 3 && state.lastResolution && state.lastResolution.awaitingSteal)) {
            state.selectedGapId = gap.id;
            if (state.role === 'remote') {
              sendRemoteAction('SELECT_GAP_PREVIEW', { gapId: gap.id });
              renderRemoteUI();
            } else {
              renderTvBoard();
              if (state.role === 'single') renderSingleControls();
            }
          }
        });

        gapsLayer.appendChild(g);
      });
    }
  }

  function renderCenterDashboard() {
    const titleEl = document.getElementById('centerStatusTitle');
    const clueEl = document.getElementById('centerClueDisplay');
    const helpEl = document.getElementById('centerHelpDisplay');

    if (!titleEl || !clueEl) return;

    if (state.phase === 0) {
      titleEl.textContent = 'CONFIGURANDO PARTIDA';
      clueEl.textContent = '¡EN UNA VUELTA!';
      clueEl.setAttribute('fill', '#34d399');
      if (helpEl) helpEl.textContent = 'Configurá las opciones para comenzar';
    } else if (state.phase === 1) {
      titleEl.textContent = 'FASE 1: DAR PISTA';
      clueEl.textContent = '🤫 PENSANDO...';
      clueEl.setAttribute('fill', '#fbbf24');
      if (helpEl) helpEl.textContent = 'El Informante está mirando su número en privado';
    } else if (state.phase === 2) {
      titleEl.textContent = 'FASE 2: ENCONTRAR EL HUECO';
      clueEl.textContent = `"${state.currentCard ? state.currentCard.clueWord : ''}"`;
      clueEl.setAttribute('fill', '#ffffff');
      if (helpEl) helpEl.textContent = 'Debatan en equipo y elijan el hueco en el celular';
    } else if (state.phase === 3) {
      titleEl.textContent = 'FASE 3: RESOLUCIÓN';
      const res = state.lastResolution;
      if (res) {
        if (res.awaitingSteal) {
          clueEl.textContent = '⚡ ¡OPCIÓN DE ROBO!';
          clueEl.setAttribute('fill', '#f59e0b');
          if (helpEl) helpEl.textContent = 'El equipo rival puede robar si acierta el hueco';
        } else if (res.correct) {
          clueEl.textContent = `✅ ¡ACIERTO! (${res.card.number})`;
          clueEl.setAttribute('fill', '#34d399');
          if (helpEl) helpEl.textContent = `Carta colocada en el Hueco ${res.correctGapId}`;
        } else {
          clueEl.textContent = `❌ ERA EN ${res.correctGapId} (${res.card.number})`;
          clueEl.setAttribute('fill', '#f87171');
          if (helpEl) helpEl.textContent = `-1 Vida. La carta se coloca en su hueco correcto`;
        }
      }
    }
  }

  function updateTvTicker() {
    const ticker = document.getElementById('tvStatusTicker');
    if (!ticker) return;

    if (state.phase === 0) {
      ticker.textContent = state.role === 'single'
        ? '⚙️ Configurá la partida en el panel inferior y hacé clic en Iniciar.'
        : '⚙️ Esperando inicio de partida desde el Celular Control Remoto...';
    } else if (state.phase === 1) {
      ticker.textContent = '🤫 El Informante tiene el celular en la mano mirando su número secreto...';
    } else if (state.phase === 2) {
      ticker.textContent = `🗣️ Pista en la mesa: "${state.currentCard ? state.currentCard.clueWord : ''}". ¿Dónde se ubica la carta?`;
    } else if (state.phase === 3) {
      ticker.textContent = '🎯 ¡Carta revelada y colocada en el círculo!';
    }
  }

  // =========================================================================
  // RENDERIZADO VISUAL DEL CELULAR CONTROL REMOTO
  // =========================================================================
  function renderRemoteUI() {
    const container = document.getElementById('remotePhaseContainer');
    if (!container) return;

    if (state.isGameOver) {
      renderRemoteGameOver();
      return;
    }

    if (state.phase === 0) {
      renderRemoteSetup();
      return;
    }

    // FASE 1: INFORMANTE (DAR PISTA SECRETA)
    if (state.phase === 1) {
      const cardNum = state.currentCard ? state.currentCard.number : 0;
      const col = getCardColor(cardNum);
      const gaps = calculateCurrentGaps();
      const correctGapId = getCorrectGapForNumber(cardNum);
      const gapObj = gaps.find(g => g.id === correctGapId);
      const prevCard = gapObj ? gapObj.prevCard : null;
      const nextCard = gapObj ? gapObj.nextCard : null;
      const prevNumStr = gapObj ? gapObj.prevNumStr : '';
      const nextNumStr = gapObj ? gapObj.nextNumStr : '';
      const prevCol = prevCard ? getCardColor(prevCard.number) : { bg: '#334155', text: '#fff' };
      const nextCol = nextCard ? getCardColor(nextCard.number) : { bg: '#334155', text: '#fff' };

      container.innerHTML = `
        <div class="remote-phase-banner">
          <h2 class="remote-phase-title" style="color: #34d399;">🎤 FASE 1: TU PISTA SECRETA</h2>
          <p class="remote-phase-help">Mirá tu número en privado sin que nadie vea tu celular.</p>
        </div>

        <div class="secret-card-box">
          <span class="badge" style="background: ${col.bg}; color: ${col.text}; font-size: 0.95rem; font-weight: 800;">
            ${col.name}
          </span>
          <br>
          <div class="secret-number-badge" style="background: ${col.bg}; color: ${col.text};">
            ${cardNum}
          </div>

          <div class="neighbor-cards-row">
            <div class="neighbor-card-block">
              <span class="neighbor-num-badge" style="background: ${prevCol.bg}; color: ${prevCol.text};">
                ${prevNumStr}
              </span>
              <span class="neighbor-word-text">${escapeHtml(prevCard ? prevCard.word : '')}</span>
            </div>
            <div class="neighbor-center-arrow">
              <div class="neighbor-arrow-icon">↔️</div>
              <div class="neighbor-arrow-label">TU HUECO (${gapObj ? gapObj.id : ''})</div>
            </div>
            <div class="neighbor-card-block">
              <span class="neighbor-num-badge" style="background: ${nextCol.bg}; color: ${nextCol.text};">
                ${nextNumStr}
              </span>
              <span class="neighbor-word-text">${escapeHtml(nextCard ? nextCard.word : '')}</span>
            </div>
          </div>

          <p class="small text-muted mb-2">
            Ingresá 1 sola palabra que relacione a ambas vecinas de forma que tu equipo deduzca el hueco:
          </p>

          <input type="text" id="remoteClueInput" class="form-control clue-input-field mb-3" placeholder="Escribí tu pista acá" maxlength="25" autocomplete="off" autocapitalize="characters">

          ${state.timerRunning ? `
            <div class="d-flex justify-content-center gap-2 mb-3">
              <button type="button" class="btn btn-sm btn-outline-warning" id="btnRemotePauseTimer">
                ${state.isTimerPaused ? '▶️ Reanudar' : '⏸️ Pausar'}
              </button>
              <button type="button" class="btn btn-sm btn-outline-warning" id="btnRemoteAdd10">
                +10s
              </button>
            </div>
          ` : ''}

          <button type="button" class="btn-action-primary" id="btnRemoteSubmitClue">
            🗣️ Confirmar Pista
          </button>

          <div class="d-flex gap-2 mt-3">
            <button type="button" class="btn-action-secondary" id="btnRemoteDiscard" style="font-size: 0.8rem;">
              🔄 Descartar y robar otra
            </button>
            <button type="button" class="btn-action-secondary text-danger" id="btnRemoteGiveUp" style="font-size: 0.8rem;">
              ⏱️ Me rindo (-1 vida)
            </button>
          </div>
        </div>
      `;

      const input = document.getElementById('remoteClueInput');
      const btnSubmit = document.getElementById('btnRemoteSubmitClue');
      if (btnSubmit && input) {
        btnSubmit.addEventListener('click', () => {
          const val = input.value.trim();
          if (val) sendRemoteAction('SUBMIT_CLUE', { clueWord: val });
        });
        input.addEventListener('keyup', (e) => {
          if (e.key === 'Enter') {
            const val = input.value.trim();
            if (val) sendRemoteAction('SUBMIT_CLUE', { clueWord: val });
          }
        });
      }

      const btnDiscard = document.getElementById('btnRemoteDiscard');
      if (btnDiscard) {
        btnDiscard.addEventListener('click', () => {
          if (confirm('¿Descartar esta carta por error y robar un reemplazo?')) {
            sendRemoteAction('DISCARD_AND_REPLACE');
          }
        });
      }

      const btnGiveUp = document.getElementById('btnRemoteGiveUp');
      if (btnGiveUp) {
        btnGiveUp.addEventListener('click', () => {
          if (confirm('¿No se te ocurre pista? El equipo perderá 1 vida y pasará a la siguiente.')) {
            sendRemoteAction('GIVE_UP_NO_CLUE');
          }
        });
      }

      const btnPause = document.getElementById('btnRemotePauseTimer');
      if (btnPause) {
        btnPause.addEventListener('click', () => {
          sendRemoteAction('TIMER_PAUSE_TOGGLE');
        });
      }

      const btnAdd10 = document.getElementById('btnRemoteAdd10');
      if (btnAdd10) {
        btnAdd10.addEventListener('click', () => {
          sendRemoteAction('TIMER_ADD_10');
        });
      }
      return;
    }

    // FASE 2: ENCONTRAR EL HUECO (DELIBERACIÓN DE LA MESA)
    if (state.phase === 2) {
      const gaps = calculateCurrentGaps();
      const clue = state.currentCard ? state.currentCard.clueWord : '';

      container.innerHTML = `
        <div class="remote-phase-banner">
          <h2 class="remote-phase-title" style="color: #fbbf24;">🔍 FASE 2: ENCONTRAR EL HUECO</h2>
          <p class="remote-phase-help">Debatan mirando el televisor y seleccionen el hueco.</p>
        </div>

        <div class="secret-card-box">
          <div class="text-muted small uppercase mb-1">Pista activa:</div>
          <div class="fw-bold fs-2 text-warning mb-3">"${escapeHtml(clue)}"</div>

          <div class="gaps-select-grid">
            ${gaps.map(g => `
              <button type="button" class="gap-select-btn ${state.selectedGapId === g.id ? 'selected' : ''}" data-gap="${g.id}">
                <div class="d-flex align-items-center w-100">
                  <span class="gap-letter-tag">${g.id}</span>
                  <div class="gap-desc-content">
                    <div class="gap-title-line">Hueco ${g.id}</div>
                    <div class="gap-neighbors-line">
                      <span class="badge-neighbor">[${g.prevNumStr} ${escapeHtml(g.prevCard.word)}]</span>
                      <span class="gap-arrow">↔</span>
                      <span class="badge-neighbor">[${g.nextNumStr} ${escapeHtml(g.nextCard.word)}]</span>
                    </div>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>

          <button type="button" class="btn-action-primary btn-action-gold mt-2" id="btnRemoteConfirmGap" ${!state.selectedGapId ? 'disabled' : ''}>
            🔒 Confirmar Hueco Elegido
          </button>
        </div>
      `;

      document.querySelectorAll('.gap-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const gapId = btn.dataset.gap;
          state.selectedGapId = gapId;
          sendRemoteAction('SELECT_GAP_PREVIEW', { gapId });
          renderRemoteUI();
        });
      });

      const btnConfirm = document.getElementById('btnRemoteConfirmGap');
      if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
          if (state.selectedGapId) {
            sendRemoteAction('CONFIRM_GAP', { gapId: state.selectedGapId });
          }
        });
      }
      return;
    }

    // FASE 3: RESOLUCIÓN Y COLOCACIÓN
    if (state.phase === 3) {
      const res = state.lastResolution;
      if (!res) return;

      if (res.awaitingSteal) {
        const rivalTeamName = state.activeTeam === 'blue' ? 'Equipo Rojo' : 'Equipo Azul';
        const gaps = calculateCurrentGaps();

        container.innerHTML = `
          <div class="remote-phase-banner">
            <h2 class="remote-phase-title text-danger">⚡ ¡CHANCE DE ROBO!</h2>
            <p class="remote-phase-help">Pasale el celular al <strong>${escapeHtml(rivalTeamName)}</strong>.</p>
          </div>

          <div class="secret-card-box">
            <p class="mb-3">
              El equipo activo falló. Si señalan el hueco correcto, ¡recuperan +1 vida ❤️!
            </p>

            <div class="gaps-select-grid">
              ${gaps.map(g => `
                <button type="button" class="gap-select-btn ${state.selectedGapId === g.id ? 'selected' : ''}" data-gap="${g.id}">
                  <div class="d-flex align-items-center w-100">
                    <span class="gap-letter-tag">${g.id}</span>
                    <div class="gap-desc-content">
                      <div class="gap-title-line">Hueco ${g.id}</div>
                      <div class="gap-neighbors-line">
                        <span class="badge-neighbor">[${g.prevNumStr} ${escapeHtml(g.prevCard.word)}]</span>
                        <span class="gap-arrow">↔</span>
                        <span class="badge-neighbor">[${g.nextNumStr} ${escapeHtml(g.nextCard.word)}]</span>
                      </div>
                    </div>
                  </div>
                </button>
              `).join('')}
            </div>

            <button type="button" class="btn-action-primary btn-action-gold mt-2" id="btnRemoteConfirmSteal" ${!state.selectedGapId ? 'disabled' : ''}>
              🎯 Confirmar Intento de Robo
            </button>
          </div>
        `;

        document.querySelectorAll('.gap-select-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            state.selectedGapId = btn.dataset.gap;
            renderRemoteUI();
          });
        });

        const btnSteal = document.getElementById('btnRemoteConfirmSteal');
        if (btnSteal) {
          btnSteal.addEventListener('click', () => {
            if (state.selectedGapId) {
              sendRemoteAction('STEAL_ATTEMPT', { gapId: state.selectedGapId });
            }
          });
        }
        return;
      }

      container.innerHTML = `
        <div class="remote-phase-banner">
          <h2 class="remote-phase-title ${res.correct ? 'text-success' : 'text-danger'}">
            ${res.correct ? '🎉 ¡ACIERTO!' : '❌ FALLO'}
          </h2>
          <p class="remote-phase-help">Mirá la mesa circular en el televisor.</p>
        </div>

        <div class="secret-card-box">
          <div class="mb-3">
            La carta era el número <strong>${res.card.number}</strong> (Pista: "${escapeHtml(res.card.clueWord)}").<br>
            Iba en el <strong>Hueco ${res.correctGapId}</strong>.
          </div>

          ${res.stealSuccess !== undefined ? `
            <div class="alert ${res.stealSuccess ? 'alert-success' : 'alert-secondary'} p-2 mb-3">
              ${res.stealSuccess ? '⚡ ¡El equipo rival acertó y recuperó +1 vida!' : 'El equipo rival no acertó el robo.'}
            </div>
          ` : ''}

          <button type="button" class="btn-action-primary my-2" id="btnRemoteNextCard">
            ➡️ Siguiente Carta
          </button>
        </div>
      `;

      const btnNext = document.getElementById('btnRemoteNextCard');
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          sendRemoteAction('NEXT_CARD');
        });
      }
    }
  }

  // =========================================================================
  // FASE 0: CONFIGURACIÓN PREVIA (SETUP DESDE EL CELULAR)
  // =========================================================================
  function renderRemoteSetup() {
    const container = document.getElementById('remotePhaseContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="setup-card">
        <h2 class="setup-title">⚙️ CONFIGURAR PARTIDA</h2>

        <!-- 1. Modo de Juego -->
        <div class="mb-3">
          <label class="setup-group-label">Modo de Juego:</label>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-light flex-fill pill-option ${setupConfig.mode === 'cooperative' ? 'active' : ''}" id="btnSetupCoop">
              🤝 Cooperativo
            </button>
            <button type="button" class="btn btn-outline-light flex-fill pill-option ${setupConfig.mode === 'teams' ? 'active' : ''}" id="btnSetupTeams">
              ⚔️ 2 Equipos (Azul vs Rojo)
            </button>
          </div>
        </div>

        <!-- 2. Temporizador / Reloj -->
        <div class="mb-3">
          <label class="setup-group-label">Límite de Tiempo:</label>
          <div class="d-flex gap-2 mb-2">
            <button type="button" class="btn btn-outline-light flex-fill pill-option ${setupConfig.timerEnabled ? 'active' : ''}" id="btnTimerOn">
              ⏱️ Con Reloj
            </button>
            <button type="button" class="btn btn-outline-light flex-fill pill-option ${!setupConfig.timerEnabled ? 'active' : ''}" id="btnTimerOff">
              ♾️ Sin Límite
            </button>
          </div>

          ${setupConfig.timerEnabled ? `
            <div class="d-flex gap-1 mb-2">
              <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-setup-dur ${setupConfig.timerDuration === 20 ? 'active' : ''}" data-dur="20">20s (Oficial)</button>
              <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-setup-dur ${setupConfig.timerDuration === 30 ? 'active' : ''}" data-dur="30">30s</button>
              <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-setup-dur ${setupConfig.timerDuration === 45 ? 'active' : ''}" data-dur="45">45s</button>
              <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-setup-dur ${setupConfig.timerDuration === 60 ? 'active' : ''}" data-dur="60">60s</button>
            </div>

            <div class="form-check mt-2">
              <input class="form-check-input" type="checkbox" id="checkWarmup" ${setupConfig.warmupRounds ? 'checked' : ''}>
              <label class="form-check-label small text-muted" for="checkWarmup">
                Primeras 2 cartas sin tiempo (Calentamiento)
              </label>
            </div>
          ` : ''}
        </div>

        <!-- 3. Palabras Iniciales (100/0, 33 y 66) -->
        <div class="mb-3">
          <label class="setup-group-label">Palabras Iniciales (100/0, 33, 66):</label>
          <div class="d-flex gap-2 mb-2">
            <button type="button" class="btn btn-sm btn-outline-light flex-fill pill-option ${setupConfig.initialWordsType === 'random' ? 'active' : ''}" id="btnWordsRandom">
              🎲 Sortear al azar
            </button>
            <button type="button" class="btn btn-sm btn-outline-light flex-fill pill-option ${setupConfig.initialWordsType === 'manual' ? 'active' : ''}" id="btnWordsManual">
              ✍️ Escribir a mano
            </button>
          </div>

          ${setupConfig.initialWordsType === 'random' ? `
            <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background: rgba(0,0,0,0.3);">
              <span class="small text-muted">Trío sugerido:</span>
              <button type="button" class="btn btn-sm btn-outline-info py-0 px-2" id="btnRerollRandomWords" style="font-size: 0.8rem;">
                🔄 Sortear otro
              </button>
            </div>
            <div class="d-flex justify-content-around mt-2 small fw-bold text-warning">
              <span>100/0: ${escapeHtml(setupConfig.manualWords.w0)}</span>
              <span>33: ${escapeHtml(setupConfig.manualWords.w33)}</span>
              <span>66: ${escapeHtml(setupConfig.manualWords.w66)}</span>
            </div>
          ` : `
            <div class="d-flex flex-column gap-2 mt-2">
              <input type="text" class="form-control form-control-sm" id="inputManualW0" placeholder="Palabra para 100/0" value="${escapeHtml(setupConfig.manualWords.w0)}">
              <input type="text" class="form-control form-control-sm" id="inputManualW33" placeholder="Palabra para 33" value="${escapeHtml(setupConfig.manualWords.w33)}">
              <input type="text" class="form-control form-control-sm" id="inputManualW66" placeholder="Palabra para 66" value="${escapeHtml(setupConfig.manualWords.w66)}">
            </div>
          `}
        </div>

        <button type="button" class="btn-action-primary btn-action-gold mt-3" id="btnStartGameAction">
          🚀 Iniciar Partida
        </button>
      </div>
    `;

    // Eventos Modo
    const bCoop = document.getElementById('btnSetupCoop');
    const bTeams = document.getElementById('btnSetupTeams');
    if (bCoop) bCoop.addEventListener('click', () => { setupConfig.mode = 'cooperative'; renderRemoteSetup(); });
    if (bTeams) bTeams.addEventListener('click', () => { setupConfig.mode = 'teams'; renderRemoteSetup(); });

    // Eventos Tiempo
    const bTimerOn = document.getElementById('btnTimerOn');
    const bTimerOff = document.getElementById('btnTimerOff');
    if (bTimerOn) bTimerOn.addEventListener('click', () => { setupConfig.timerEnabled = true; renderRemoteSetup(); });
    if (bTimerOff) bTimerOff.addEventListener('click', () => { setupConfig.timerEnabled = false; renderRemoteSetup(); });

    document.querySelectorAll('.btn-setup-dur').forEach(btn => {
      btn.addEventListener('click', () => {
        setupConfig.timerDuration = parseInt(btn.dataset.dur, 10);
        renderRemoteSetup();
      });
    });

    const cWarm = document.getElementById('checkWarmup');
    if (cWarm) cWarm.addEventListener('change', (e) => { setupConfig.warmupRounds = e.target.checked; });

    // Eventos Palabras
    const bWRand = document.getElementById('btnWordsRandom');
    const bWMan = document.getElementById('btnWordsManual');
    if (bWRand) bWRand.addEventListener('click', () => { setupConfig.initialWordsType = 'random'; renderRemoteSetup(); });
    if (bWMan) bWMan.addEventListener('click', () => { setupConfig.initialWordsType = 'manual'; renderRemoteSetup(); });

    const bReroll = document.getElementById('btnRerollRandomWords');
    if (bReroll) {
      bReroll.addEventListener('click', () => {
        setupConfig.manualWords.w0 = getRandomWord();
        do { setupConfig.manualWords.w33 = getRandomWord(); } while (setupConfig.manualWords.w33 === setupConfig.manualWords.w0);
        do { setupConfig.manualWords.w66 = getRandomWord(); } while (setupConfig.manualWords.w66 === setupConfig.manualWords.w0 || setupConfig.manualWords.w66 === setupConfig.manualWords.w33);
        renderRemoteSetup();
      });
    }

    const in0 = document.getElementById('inputManualW0');
    const in33 = document.getElementById('inputManualW33');
    const in66 = document.getElementById('inputManualW66');
    if (in0) in0.addEventListener('input', (e) => { setupConfig.manualWords.w0 = e.target.value.trim(); });
    if (in33) in33.addEventListener('input', (e) => { setupConfig.manualWords.w33 = e.target.value.trim(); });
    if (in66) in66.addEventListener('input', (e) => { setupConfig.manualWords.w66 = e.target.value.trim(); });

    // Botón Iniciar
    const btnStart = document.getElementById('btnStartGameAction');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        sendRemoteAction('START_GAME', { config: setupConfig });
      });
    }
  }

  function renderRemoteGameOver() {
    const container = document.getElementById('remotePhaseContainer');
    if (!container) return;

    let title = '';
    let sub = '';

    if (state.mode === 'teams') {
      title = state.winner === 'blue' ? '🏆 ¡VICTORIA DEL EQUIPO AZUL!' : '🏆 ¡VICTORIA DEL EQUIPO ROJO!';
      sub = `Cartas colocadas: ${state.placedCards.length - 3}`;
    } else {
      if (state.winner === 'win') {
        title = '🏆 ¡VICTORIA TOTAL EN UNA VUELTA!';
        sub = `¡Completaron las ${state.placedCards.length - 3} cartas del círculo con éxito!`;
      } else {
        title = '💀 PARTIDA PERDIDA';
        sub = `Se quedaron sin vidas en Tiempo Extra. Llegaron a colocar ${state.placedCards.length - 3} cartas.`;
      }
    }

    container.innerHTML = `
      <div class="secret-card-box text-center">
        <h2 class="text-warning mb-2">${escapeHtml(title)}</h2>
        <p class="text-light fw-bold mb-3">${escapeHtml(sub)}</p>

        <div class="d-flex flex-column gap-2 mt-3">
          <button type="button" class="btn-action-primary" id="btnRemoteRestartMatch">
            🔄 Jugar Misma Configuración
          </button>
          <button type="button" class="btn-action-secondary" id="btnRemoteGoToSetup">
            ⚙️ Cambiar Configuración
          </button>
        </div>
      </div>
    `;

    const bRest = document.getElementById('btnRemoteRestartMatch');
    if (bRest) {
      bRest.addEventListener('click', () => {
        sendRemoteAction('START_GAME', { config: setupConfig });
      });
    }

    const bSet = document.getElementById('btnRemoteGoToSetup');
    if (bSet) {
      bSet.addEventListener('click', () => {
        sendRemoteAction('GO_TO_SETUP');
      });
    }
  }

  // =========================================================================
  // MODO SOLO DISPOSITIVO (CONTROLES EN PANTALLA)
  // =========================================================================
  function renderSingleControls() {
    const container = document.getElementById('singleControlsContent');
    if (!container) return;

    if (state.phase === 0) {
      container.innerHTML = `
        <div class="setup-card my-0 p-3" style="max-width: 520px; margin: 0 auto;">
          <h4 class="text-warning text-center fw-bold mb-3">⚙️ CONFIGURAR PARTIDA</h4>

          <div class="mb-3">
            <label class="setup-group-label">Modo:</label>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-outline-light flex-fill pill-option ${setupConfig.mode === 'cooperative' ? 'active' : ''}" id="btnSingleModeCoop">
                🤝 Cooperativo
              </button>
              <button type="button" class="btn btn-sm btn-outline-light flex-fill pill-option ${setupConfig.mode === 'teams' ? 'active' : ''}" id="btnSingleModeTeams">
                ⚔️ 2 Equipos
              </button>
            </div>
          </div>

          <div class="mb-3">
            <label class="setup-group-label">Tiempo:</label>
            <div class="d-flex gap-2 mb-2">
              <button type="button" class="btn btn-sm btn-outline-light flex-fill pill-option ${setupConfig.timerEnabled ? 'active' : ''}" id="btnSingleTimerOn">
                ⏱️ Con Reloj
              </button>
              <button type="button" class="btn btn-sm btn-outline-light flex-fill pill-option ${!setupConfig.timerEnabled ? 'active' : ''}" id="btnSingleTimerOff">
                ♾️ Sin Límite
              </button>
            </div>
          </div>

          <button type="button" class="btn btn-warning w-100 py-2 fw-bold" id="btnSingleStartGame">
            🚀 Iniciar Partida
          </button>
        </div>
      `;

      const bC = document.getElementById('btnSingleModeCoop');
      const bT = document.getElementById('btnSingleModeTeams');
      if (bC) bC.addEventListener('click', () => { setupConfig.mode = 'cooperative'; renderSingleControls(); });
      if (bT) bT.addEventListener('click', () => { setupConfig.mode = 'teams'; renderSingleControls(); });

      const bTon = document.getElementById('btnSingleTimerOn');
      const bToff = document.getElementById('btnSingleTimerOff');
      if (bTon) bTon.addEventListener('click', () => { setupConfig.timerEnabled = true; renderSingleControls(); });
      if (bToff) bToff.addEventListener('click', () => { setupConfig.timerEnabled = false; renderSingleControls(); });

      const bStart = document.getElementById('btnSingleStartGame');
      if (bStart) {
        bStart.addEventListener('click', () => {
          applySetupConfig(setupConfig);
          startNewGameMatch();
        });
      }
      return;
    }

    if (state.phase === 1) {
      const cardNum = state.currentCard ? state.currentCard.number : 0;
      const col = getCardColor(cardNum);
      const gaps = calculateCurrentGaps();
      const correctGapId = getCorrectGapForNumber(cardNum);
      const gapObj = gaps.find(g => g.id === correctGapId);
      const prevCard = gapObj ? gapObj.prevCard : null;
      const nextCard = gapObj ? gapObj.nextCard : null;
      const prevNumStr = gapObj ? gapObj.prevNumStr : '';
      const nextNumStr = gapObj ? gapObj.nextNumStr : '';
      const prevCol = prevCard ? getCardColor(prevCard.number) : { bg: '#334155', text: '#fff' };
      const nextCol = nextCard ? getCardColor(nextCard.number) : { bg: '#334155', text: '#fff' };

      container.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2" style="max-width: 520px; margin: 0 auto; width: 100%;">
          <div class="text-warning fw-bold fs-5">🎤 Turno del Informante</div>
          <button type="button" class="btn ${state.phoneSecretOpen ? 'btn-danger' : 'btn-warning'} btn-sm px-3" id="btnSingleToggleSecret">
            ${state.phoneSecretOpen ? '🙈 Tapar Número Secreto' : '👁️ Ver Número Secreto en Privado'}
          </button>

          ${state.phoneSecretOpen ? `
            <div class="secret-card-box w-100 mt-2 mb-2">
              <span class="badge" style="background: ${col.bg}; color: ${col.text}; font-size: 0.95rem; font-weight: 800;">
                ${col.name}
              </span>
              <br>
              <div class="secret-number-badge" style="background: ${col.bg}; color: ${col.text};">
                ${cardNum}
              </div>

              <div class="neighbor-cards-row">
                <div class="neighbor-card-block">
                  <span class="neighbor-num-badge" style="background: ${prevCol.bg}; color: ${prevCol.text};">
                    ${prevNumStr}
                  </span>
                  <span class="neighbor-word-text">${escapeHtml(prevCard ? prevCard.word : '')}</span>
                </div>
                <div class="neighbor-center-arrow">
                  <div class="neighbor-arrow-icon">↔️</div>
                  <div class="neighbor-arrow-label">TU HUECO (${gapObj ? gapObj.id : ''})</div>
                </div>
                <div class="neighbor-card-block">
                  <span class="neighbor-num-badge" style="background: ${nextCol.bg}; color: ${nextCol.text};">
                    ${nextNumStr}
                  </span>
                  <span class="neighbor-word-text">${escapeHtml(nextCard ? nextCard.word : '')}</span>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="w-100 mt-2">
            <input type="text" id="singleClueInput" class="form-control clue-input-field w-100 mb-2" placeholder="Escribí tu palabra pista" maxlength="25" autocomplete="off" autocapitalize="characters">
            <button class="btn btn-primary fw-bold w-100 py-2 fs-5" id="btnSingleSubmitClue">🗣️ Dar Pista</button>
          </div>
        </div>
      `;

      const bSec = document.getElementById('btnSingleToggleSecret');
      if (bSec) {
        bSec.addEventListener('click', () => {
          state.phoneSecretOpen = !state.phoneSecretOpen;
          renderSingleControls();
        });
      }

      const inClue = document.getElementById('singleClueInput');
      const bSub = document.getElementById('btnSingleSubmitClue');
      if (bSub && inClue) {
        bSub.addEventListener('click', () => {
          const val = inClue.value.trim();
          if (val) handleClueSubmission(val);
        });
        inClue.addEventListener('keyup', (e) => {
          if (e.key === 'Enter') {
            const val = inClue.value.trim();
            if (val) handleClueSubmission(val);
          }
        });
      }
      return;
    }

    if (state.phase === 2) {
      const gaps = calculateCurrentGaps();

      container.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2" style="max-width: 600px; margin: 0 auto; width: 100%;">
          <div class="fw-bold text-center text-warning fs-5 mb-1">
            Elegí el hueco en el tablero o en la lista:
          </div>
          <div class="gaps-select-grid w-100 mb-2">
            ${gaps.map(g => `
              <button type="button" class="gap-select-btn ${state.selectedGapId === g.id ? 'selected' : ''}" data-gap="${g.id}">
                <div class="d-flex align-items-center w-100">
                  <span class="gap-letter-tag">${g.id}</span>
                  <div class="gap-desc-content">
                    <div class="gap-title-line">Hueco ${g.id}</div>
                    <div class="gap-neighbors-line">
                      <span class="badge-neighbor">[${g.prevNumStr} ${escapeHtml(g.prevCard.word)}]</span>
                      <span class="gap-arrow">↔</span>
                      <span class="badge-neighbor">[${g.nextNumStr} ${escapeHtml(g.nextCard.word)}]</span>
                    </div>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
          <button type="button" class="btn btn-action-primary btn-action-gold py-2" id="btnSingleConfirmGap" ${!state.selectedGapId ? 'disabled' : ''}>
            🔒 Confirmar Hueco Elegido
          </button>
        </div>
      `;

      container.querySelectorAll('.gap-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.selectedGapId = btn.dataset.gap;
          renderTvBoard();
          renderSingleControls();
        });
      });

      const bConf = document.getElementById('btnSingleConfirmGap');
      if (bConf) {
        bConf.addEventListener('click', () => {
          if (state.selectedGapId) resolveGapChoice(state.selectedGapId);
        });
      }
      return;
    }

    if (state.phase === 3) {
      container.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2">
          <button type="button" class="btn btn-primary btn-lg fw-bold" id="btnSingleNext">
            ➡️ Siguiente Carta
          </button>
        </div>
      `;

      const bNxt = document.getElementById('btnSingleNext');
      if (bNxt) {
        bNxt.addEventListener('click', () => {
          advanceToNextCard();
        });
      }
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', initApp);

})(window, document);
