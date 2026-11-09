/**
 * Sintonía Fina - Juego de Telepatía y Extremos (Inspirado en Wavelength)
 * Soporta Arquitectura "TV + 1 Celular Control Remoto" vía WebRTC (PeerJS) y Modo Solo Dispositivo.
 * Modo simplificado: 🔵 Equipo Azul vs 🔴 Equipo Rojo (sin nombres individuales).
 */

(function(window, document) {
  'use strict';

  // =========================================================================
  // CONSTANTES Y CONFIGURACIÓN
  // =========================================================================
  const ROOM_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin 0, 1, I, O
  const PEER_PREFIX = 'sintonia-fina-';
  const SOUND_STORAGE_KEY = 'sintonia_fina_sound_enabled';
  const ROOM_STORAGE_KEY = 'sintonia_fina_room';

  // Configuración de Dial y Zonas de Puntaje: 5 zonas de 4.5 unidades (8.1° cada una, total 22.5 unidades / 40.5°)
  // 100 unidades = 180 grados -> 1 unidad = 1.8 grados
  const ZONE_HALF_WIDTH_DEG = {
    z4: 4.05,  // 4 pts: dentro de ±4.05° (±2.25 unidades)
    z3: 12.15, // 3 pts: dentro de ±12.15° (±6.75 unidades)
    z2: 20.25  // 2 pts: dentro de ±20.25° (±11.25 unidades)
  };

  const AVAILABLE_CATEGORIES = [
    { id: 'cotidiano', name: 'Cotidiano', icon: '🏠' },
    { id: 'argentina', name: 'Argentina', icon: '🧉' },
    { id: 'cultura_pop', name: 'Cultura Pop', icon: '🎬' },
    { id: 'general', name: 'General', icon: '🧠' },
    { id: 'bizarro', name: 'Bizarro', icon: '🤪' }
  ];

  // =========================================================================
  // SISTEMA DE AUDIO (Web Audio API nativo sintetizado)
  // =========================================================================
  let audioCtx = null;
  let soundEnabled = localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';
  let lastTickTime = 0;

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

  // 1. Tick mecánico de la aguja (cooldown 60ms)
  function playTickSound() {
    if (!soundEnabled) return;
    const now = Date.now();
    if (now - lastTickTime < 60) return;
    lastTickTime = now;

    try {
      initAudioContext();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.025);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.025);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.028);
    } catch (_) {}
  }

  // 2. Bloqueo de aguja / Apuesta rival
  function playLockSound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      [520, 680].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.12);
      });
    } catch (_) {}
  }

  // 3. Suspenso de Cortina (Barrido ascendente ~1.2s)
  function playDrumrollSound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 1.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 1.0);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 1.26);
    } catch (_) {}
  }

  // 4. Resultado según puntaje
  function playResultSound(points) {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;

      if (points === 4) {
        // Fanfarria triunfal mayor (C5, E5, G5, C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.25, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.38);
        });
      } else if (points >= 2) {
        // Acorde positivo alegre (E5, G5)
        [659.25, 783.99].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.22, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.28);
        });
      } else {
        // Sonido de pifie / desilusión (notas descendentes wah-wah)
        const notes = [380, 340, 290, 240];
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.14);
          gain.gain.setValueAtTime(0.18, now + idx * 0.14);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.2);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.14);
          osc.stop(now + idx * 0.14 + 0.22);
        });
      }
    } catch (_) {}
  }

  // 5. Punto robado por el rival (+1)
  function playStolenPointSound() {
    if (!soundEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      [987.77, 1318.51].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.2, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.28);
      });
    } catch (_) {}
  }

  // =========================================================================
  // SISTEMA DE CONFETI (CANVAS)
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
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#38bdf8', '#10b981', '#f43f5e'];

    for (let i = 0; i < 90; i++) {
      confettiParticles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.6,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 6,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
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
        p.alpha -= 0.008;

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
  // MODELO DE ESTADO GLOBAL DEL JUEGO
  // =========================================================================
  let allSpectra = [];

  let state = {
    role: null,            // 'menu' | 'tv' | 'remote' | 'single'
    mode: 'competitive',   // 'competitive' | 'cooperative'
    targetScore: 15,       // 10, 15, 20
    totalRounds: 7,        // para cooperativo
    currentRound: 1,
    phase: 0,              // 0: Configuración, 1: Locutor, 2: Aguja, 3: Apuesta rival, 4: Revelar
    activeTeam: 'blue',    // 'blue' | 'red'
    scores: { blue: 0, red: 0 },
    coopScore: 0,
    spectrum: null,
    targetValue: 50,       // 14 a 86
    needleValue: 50,       // 0..100
    needleLocked: false,
    rivalGuess: null,      // 'left' | 'right' | null
    isCurtainOpen: false,
    selectedCategories: ['cotidiano', 'argentina', 'cultura_pop', 'general', 'bizarro'],
    usedIds: [],
    lastRoundResult: null,
    isGameOver: false,
    winner: null,
    phoneSecretOpen: false // Solo local en el celular
  };

  let setupConfig = {
    mode: 'competitive',
    targetScore: 15,
    totalRounds: 7,
    selectedCategories: ['cotidiano', 'argentina', 'cultura_pop', 'general', 'bizarro']
  };

  // PeerJS
  let peer = null;
  let activeConn = null;
  let roomCode = null;
  let throttleTimer = null;

  // =========================================================================
  // FUNCIONES AUXILIARES DE EQUIPO Y TURNO
  // =========================================================================
  function getActiveTeamKey() {
    if (state.mode === 'cooperative') return 'blue';
    return (state.currentRound % 2 === 1) ? 'blue' : 'red';
  }

  function getRivalTeamKey() {
    if (state.mode === 'cooperative') return 'blue';
    return (state.currentRound % 2 === 1) ? 'red' : 'blue';
  }

  function getActiveTeamName() {
    if (state.mode === 'cooperative') return 'Equipo Cooperativo';
    return getActiveTeamKey() === 'blue' ? 'Equipo Azul' : 'Equipo Rojo';
  }

  function getRivalTeamName() {
    return getRivalTeamKey() === 'blue' ? 'Equipo Azul' : 'Equipo Rojo';
  }

  function getLocutorTitle() {
    if (state.mode === 'cooperative') return '🎤 Locutor de la Ronda';
    return getActiveTeamKey() === 'blue' ? '🔵 Locutor Azul' : '🔴 Locutor Rojo';
  }

  // =========================================================================
  // INICIALIZACIÓN Y CARGA DE DATOS
  // =========================================================================
  async function initApp() {
    loadSpectraData();
    setupHeaderButtons();
    setupMenuRoleButtons();
    checkAutoConnectParams();
  }

  function loadSpectraData() {
    if (window.ESPECTROS_DATA && window.ESPECTROS_DATA.espectros) {
      allSpectra = window.ESPECTROS_DATA.espectros;
    } else {
      fetch('data/espectros.json')
        .then(res => res.json())
        .then(data => {
          if (data && data.espectros) {
            allSpectra = data.espectros;
          }
        })
        .catch(err => console.warn('Error al cargar espectros.json:', err));
    }
  }

  function checkAutoConnectParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const salaParam = urlParams.get('sala') || urlParams.get('code');
    const storedRoom = sessionStorage.getItem(ROOM_STORAGE_KEY);

    if (salaParam) {
      // Si la URL vino con ?sala=XXXX, conectarse automáticamente como control remoto
      const code = salaParam.toUpperCase().trim();
      startRemoteRole(code);
    } else if (storedRoom && window.location.hash === '#remote') {
      startRemoteRole(storedRoom);
    } else {
      // SIEMPRE mostrar menú principal por defecto
      showView('viewMenu');
    }
  }

  // =========================================================================
  // BOTONES DEL HEADER
  // =========================================================================
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
      btnFs.addEventListener('click', toggleFullscreen);
    }

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      const fsIcon = document.getElementById('fsIcon');
      if (fsIcon) fsIcon.textContent = isFs ? '🪟' : '📺';
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
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
        initAudioContext(); // Desbloqueo clave para TV
        startTvRole();
      });
    }

    const btnRemote = document.getElementById('btnSelectRoleRemote');
    if (btnRemote) {
      btnRemote.addEventListener('click', () => {
        promptRemoteConnectModal();
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

    // Generar código de sala único
    roomCode = generateRoomCode();
    const peerId = PEER_PREFIX + roomCode;

    // Mostrar overlay de conexión QR
    showTvConnectModal(roomCode);

    // Inicializar PeerJS como anfitrión
    try {
      peer = new Peer(peerId);

      peer.on('open', (id) => {
        console.log('TV Peer abierto con ID:', id);
      });

      peer.on('connection', (conn) => {
        console.log('¡Celular Control Remoto conectado!');
        activeConn = conn;

        // Ocultar modal de QR inmediatamente tras el primer escaneo
        hideTvConnectModal();

        conn.on('open', () => {
          // Enviar estado inicial sincronizado (Fase 0)
          broadcastStateToRemote();
        });

        conn.on('data', (data) => {
          handleRemoteMessage(data);
        });

        conn.on('close', () => {
          console.warn('Conexión con el celular cerrada.');
          const ticker = document.getElementById('tvStatusTicker');
          if (ticker) ticker.textContent = '⚠️ Celular desconectado temporalmente. Esperando reconexión...';
        });
      });

      peer.on('error', (err) => {
        console.warn('Error en PeerJS TV:', err.type, err);
        if (err.type === 'unavailable-id') {
          roomCode = generateRoomCode();
          startTvRole();
        }
      });
    } catch (e) {
      console.error('Error al inicializar PeerJS:', e);
    }

    renderTvBoard();
  }

  function showTvConnectModal(code) {
    const modal = document.getElementById('tvConnectModal');
    if (!modal) return;
    modal.classList.remove('d-none');

    const codeBadge = document.getElementById('tvRoomCodeText');
    if (codeBadge) codeBadge.textContent = code;

    // URL completa para el QR
    const url = `${window.location.origin}${window.location.pathname}?sala=${code}`;
    const qrContainer = document.getElementById('tvQrContainer');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
          text: url,
          width: 200,
          height: 200,
          colorDark: '#090915',
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
  function promptRemoteConnectModal() {
    const code = prompt('Ingresá el código de 4 letras que aparece en la TV (ej. K7M2):');
    if (code) {
      startRemoteRole(code.toUpperCase().trim());
    }
  }

  function startRemoteRole(code) {
    state.role = 'remote';
    roomCode = code;
    sessionStorage.setItem(ROOM_STORAGE_KEY, code);
    window.location.hash = '#remote';

    showView('viewRemote');
    renderRemoteHeader();

    initRemotePeerConnection();
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

      peer.on('error', (err) => {
        console.warn('Error en PeerJS Celular:', err);
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
        // Sincronizar también setupConfig si la TV envía configuración
        if (state.mode) setupConfig.mode = state.mode;
        if (state.targetScore) setupConfig.targetScore = state.targetScore;
        if (state.totalRounds) setupConfig.totalRounds = state.totalRounds;
        if (state.selectedCategories) setupConfig.selectedCategories = [...state.selectedCategories];
        renderRemoteUI();
      }
    });

    activeConn.on('close', () => {
      if (dot) dot.className = 'connection-dot offline';
      if (label) label.textContent = '⚠️ Reconectando con la TV...';
      setTimeout(() => connectToTvHost(targetId), 2000);
    });
  }

  // Envío de eventos desde el celular hacia la TV
  function sendRemoteAction(type, payload = {}) {
    if (activeConn && activeConn.open) {
      activeConn.send({ type, ...payload });
    }
  }

  // =========================================================================
  // GESTOR DE MENSAJES EN LA TV (Recibidos del Celular)
  // =========================================================================
  function handleRemoteMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'START_GAME':
        applySetupConfig(msg.config);
        startNewRound(true);
        break;

      case 'GO_TO_SETUP':
        state.phase = 0;
        state.isGameOver = false;
        broadcastStateToRemote();
        renderTvBoard();
        break;

      case 'MOVE_NEEDLE':
        if (!state.needleLocked) {
          const oldVal = state.needleValue;
          state.needleValue = Math.max(0, Math.min(100, msg.value));
          if (Math.abs(oldVal - state.needleValue) >= 0.5) {
            playTickSound();
          }
          updateTvNeedleOnly();
        }
        break;

      case 'PASS_TO_DEBATE':
        state.phase = 2;
        broadcastStateToRemote();
        renderTvBoard();
        break;

      case 'LOCK_NEEDLE':
        state.needleLocked = true;
        playLockSound();
        if (state.mode === 'competitive') {
          state.phase = 3; // Pasa a apuesta rival
        } else {
          state.phase = 4; // Cooperativo pasa a revelar
        }
        broadcastStateToRemote();
        renderTvBoard();
        break;

      case 'RIVAL_GUESS':
        state.rivalGuess = msg.direction; // 'left' | 'right'
        playLockSound();
        state.phase = 4; // Habilitar revelación
        broadcastStateToRemote();
        renderTvBoard();
        break;

      case 'REVEAL':
        executeRevealOnTv();
        break;

      case 'NEXT_ROUND':
        advanceToNextRound();
        break;

      case 'DISCARD_SPECTRUM':
        drawNewSpectrum();
        broadcastStateToRemote();
        renderTvBoard();
        break;

      case 'RESTART_GAME':
        initDefaultGameState();
        broadcastStateToRemote();
        renderTvBoard();
        break;

      case 'TOGGLE_MUTE':
        setSoundEnabled(msg.muted);
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
  // LÓGICA DE PARTIDA (ESTADO, RONDAS Y PUNTUACIÓN)
  // =========================================================================
  function initDefaultGameState() {
    state.scores = { blue: 0, red: 0 };
    state.coopScore = 0;
    state.currentRound = 1;
    state.phase = 0; // Inicia en Fase 0 (Configuración previa)
    state.activeTeam = 'blue';
    state.usedIds = [];
    state.isGameOver = false;
    state.winner = null;
    state.lastRoundResult = null;
    state.phoneSecretOpen = false;

    drawNewSpectrum();
    resetDialForNewRound();
  }

  function applySetupConfig(config) {
    if (!config) return;
    state.mode = config.mode === 'cooperative' ? 'cooperative' : 'competitive';
    state.targetScore = parseInt(config.targetScore, 10) || 15;
    state.totalRounds = parseInt(config.totalRounds, 10) || 7;
    if (Array.isArray(config.selectedCategories) && config.selectedCategories.length > 0) {
      state.selectedCategories = config.selectedCategories;
    } else {
      state.selectedCategories = ['cotidiano', 'argentina', 'cultura_pop', 'general', 'bizarro'];
    }
    state.scores = { blue: 0, red: 0 };
    state.coopScore = 0;
    state.currentRound = 1;
    state.activeTeam = 'blue';
    state.usedIds = [];
    state.isGameOver = false;
    state.winner = null;
    state.lastRoundResult = null;
  }

  function drawNewSpectrum() {
    let pool = allSpectra.filter(s => state.selectedCategories.includes(s.categoria));
    if (!pool.length) pool = allSpectra;

    let available = pool.filter(s => !state.usedIds.includes(s.id));
    if (!available.length) {
      state.usedIds = [];
      available = pool;
    }

    const chosen = available[Math.floor(Math.random() * available.length)];
    state.spectrum = chosen;
    if (chosen && chosen.id) {
      state.usedIds.push(chosen.id);
    }

    // Objetivo al azar entre 14 y 86 para no quedar cortado en los bordes
    state.targetValue = Math.floor(Math.random() * 73) + 14;
  }

  function resetDialForNewRound() {
    state.needleValue = 50;
    state.needleLocked = false;
    state.rivalGuess = null;
    state.isCurtainOpen = false;
    state.phoneSecretOpen = false;
  }

  function startNewRound(isFirst = false) {
    if (!isFirst) {
      state.currentRound++;
    }
    // Turnos alternados ronda a ronda:
    // Ronda impar = 🔵 Equipo Azul (Locutor Azul)
    // Ronda par = 🔴 Equipo Rojo (Locutor Rojo)
    state.activeTeam = getActiveTeamKey();
    drawNewSpectrum();
    resetDialForNewRound();
    state.phase = 1;

    broadcastStateToRemote();
    renderTvBoard();
    if (state.role === 'single') renderSingleControls();
  }

  // =========================================================================
  // FASE 4: REVELACIÓN Y CÁLCULO DE PUNTOS
  // =========================================================================
  function executeRevealOnTv() {
    state.phase = 4;
    state.isCurtainOpen = true;

    // 1. Sonido de suspenso y animación de apertura
    playDrumrollSound();
    animateCurtainOpenTv();

    // 2. Calcular puntos tras el suspenso (~1.2s)
    setTimeout(() => {
      calculateRoundScores();
      broadcastStateToRemote();
      renderTvBoard();
      if (state.role === 'single') renderSingleControls();
    }, 1250);
  }

  function calculateRoundScores() {
    const distVal = Math.abs(state.needleValue - state.targetValue);
    const distDeg = distVal * 1.8;

    let pts = 0;
    if (distDeg <= ZONE_HALF_WIDTH_DEG.z4) {
      pts = 4;
    } else if (distDeg <= ZONE_HALF_WIDTH_DEG.z3) {
      pts = 3;
    } else if (distDeg <= ZONE_HALF_WIDTH_DEG.z2) {
      pts = 2;
    } else {
      pts = 0;
    }

    // Efecto sonoro y festejo
    playResultSound(pts);
    if (pts === 4) {
      launchConfetti();
    }

    // Interferencia del rival (en modo competitivo)
    let rivalStole = false;
    const rivalTeam = getRivalTeamKey();

    if (state.mode === 'competitive') {
      state.scores[state.activeTeam] += pts;

      // Si el equipo activo NO clavó el 4 y el rival acertó el lado
      if (pts < 4 && state.rivalGuess) {
        const centerIsLeft = state.targetValue < state.needleValue;
        const centerIsRight = state.targetValue > state.needleValue;

        if ((state.rivalGuess === 'left' && centerIsLeft) || (state.rivalGuess === 'right' && centerIsRight)) {
          state.scores[rivalTeam] += 1;
          rivalStole = true;
          setTimeout(() => playStolenPointSound(), 600);
        }
      }

      checkCompetitiveGameOver();
    } else {
      // Modo cooperativo
      state.coopScore += pts;
      if (state.currentRound >= state.totalRounds) {
        state.isGameOver = true;
      }
    }

    state.lastRoundResult = {
      pts,
      rivalStole,
      rivalGuess: state.rivalGuess,
      targetValue: state.targetValue,
      needleValue: state.needleValue
    };
  }

  function checkCompetitiveGameOver() {
    const target = state.targetScore;
    const b = state.scores.blue;
    const r = state.scores.red;

    if (b >= target || r >= target) {
      if (b !== r) {
        state.isGameOver = true;
        state.winner = b > r ? 'blue' : 'red';
      }
    }
  }

  function advanceToNextRound() {
    if (state.isGameOver) {
      initDefaultGameState();
      broadcastStateToRemote();
      renderTvBoard();
      if (state.role === 'single') renderSingleControls();
    } else {
      startNewRound(false);
    }
  }

  // =========================================================================
  // RENDERIZADO VISUAL DEL DIAL EN SVG (TV & SINGLE)
  // =========================================================================
  function renderTvBoard() {
    const scoreBlue = document.getElementById('tvScoreBlue');
    const scoreRed = document.getElementById('tvScoreRed');
    const scoreBoxComp = document.getElementById('tvScoreBoxComp');
    const scoreBoxCoop = document.getElementById('tvScoreBoxCoop');
    const coopScoreVal = document.getElementById('tvCoopScoreVal');
    const cardBlue = document.getElementById('teamCardBlue');
    const cardRed = document.getElementById('teamCardRed');

    // FASE 0: CONFIGURACIÓN
    if (state.phase === 0) {
      if (scoreBoxComp) scoreBoxComp.classList.remove('d-none');
      if (scoreBoxCoop) scoreBoxCoop.classList.add('d-none');
      if (scoreBlue) scoreBlue.textContent = '0';
      if (scoreRed) scoreRed.textContent = '0';
      if (cardBlue) cardBlue.classList.remove('active-turn');
      if (cardRed) cardRed.classList.remove('active-turn');

      const roundText = document.getElementById('tvRoundIndicator');
      if (roundText) roundText.textContent = 'Configuración';

      const locutorName = document.getElementById('tvLocutorName');
      if (locutorName) locutorName.textContent = '⚙️ Configurando partida...';

      const phaseText = document.getElementById('tvPhaseStatus');
      if (phaseText) phaseText.textContent = 'Fase 0: Configuración';

      const txtLeft = document.getElementById('tvConceptLeft');
      const txtRight = document.getElementById('tvConceptRight');
      const tagCat = document.getElementById('tvCategoryTag');
      if (txtLeft) txtLeft.textContent = '⬅️ Extremo A';
      if (txtRight) txtRight.textContent = 'Extremo B ➡️';
      if (tagCat) tagCat.textContent = 'Sintonía Fina';

      const curtain = document.getElementById('tvDialCurtain');
      const targetWedges = document.getElementById('target-wedges');
      const needleGroup = document.getElementById('tvNeedleGroup');
      const rivalBox = document.getElementById('tvRivalBetBadge');

      if (curtain) {
        curtain.style.display = 'block';
        curtain.classList.remove('opened');
      }
      if (targetWedges) {
        targetWedges.style.display = 'none';
        targetWedges.style.opacity = '0';
      }
      if (needleGroup) needleGroup.style.display = 'none';
      if (rivalBox) rivalBox.classList.add('d-none');

      const ticker = document.getElementById('tvStatusTicker');
      if (ticker) {
        ticker.textContent = state.role === 'single'
          ? '⚙️ Seleccioná las categorías y meta de puntos abajo para comenzar.'
          : '⚙️ Esperando configuración desde el Celular Control Remoto...';
      }
      return;
    }

    // FASES DE JUEGO (1 A 4)
    if (state.mode === 'competitive') {
      if (scoreBoxComp) scoreBoxComp.classList.remove('d-none');
      if (scoreBoxCoop) scoreBoxCoop.classList.add('d-none');
      if (scoreBlue) scoreBlue.textContent = state.scores.blue;
      if (scoreRed) scoreRed.textContent = state.scores.red;

      if (cardBlue) cardBlue.classList.toggle('active-turn', state.activeTeam === 'blue');
      if (cardRed) cardRed.classList.toggle('active-turn', state.activeTeam === 'red');
    } else {
      if (scoreBoxComp) scoreBoxComp.classList.add('d-none');
      if (scoreBoxCoop) scoreBoxCoop.classList.remove('d-none');
      if (coopScoreVal) coopScoreVal.textContent = state.coopScore;
    }

    // Info de ronda
    const roundText = document.getElementById('tvRoundIndicator');
    if (roundText) {
      roundText.textContent = state.mode === 'competitive'
        ? `Ronda ${state.currentRound} (A ${state.targetScore} pts)`
        : `Ronda ${state.currentRound} / ${state.totalRounds}`;
    }

    // Locutor de turno (Azul vs Rojo)
    const locutorName = document.getElementById('tvLocutorName');
    if (locutorName) {
      if (state.mode === 'competitive') {
        locutorName.textContent = state.activeTeam === 'blue'
          ? '🔵 Equipo Azul (Locutor Azul)'
          : '🔴 Equipo Rojo (Locutor Rojo)';
      } else {
        locutorName.textContent = '🤝 Equipo Cooperativo (Locutor de Turno)';
      }
    }

    // Texto de Fase
    const phaseText = document.getElementById('tvPhaseStatus');
    if (phaseText) {
      switch (state.phase) {
        case 1:
          phaseText.textContent = 'Fase 1: Pensando pista';
          break;
        case 2:
          phaseText.textContent = 'Fase 2: Debate y Aguja';
          break;
        case 3:
          phaseText.textContent = 'Fase 3: Interferencia Rival';
          break;
        case 4:
        default:
          phaseText.textContent = 'Fase 4: Resultado';
          break;
      }
    }

    // Conceptos Extremos
    const txtLeft = document.getElementById('tvConceptLeft');
    const txtRight = document.getElementById('tvConceptRight');
    const tagCat = document.getElementById('tvCategoryTag');

    if (state.spectrum) {
      if (txtLeft) txtLeft.textContent = state.spectrum.izq;
      if (txtRight) txtRight.textContent = state.spectrum.der;
      if (tagCat) tagCat.textContent = (state.spectrum.categoria || '').replace('_', ' ');
    }

    // Renderizar franja objetivo en el SVG
    renderSvgTargetSlice('target-wedges', state.targetValue);

    // Visibilidad de Dial, Cortina y Aguja
    const targetWedges = document.getElementById('target-wedges');
    const curtain = document.getElementById('tvDialCurtain');
    const needleGroup = document.getElementById('tvNeedleGroup');

    if (state.phase === 1) {
      // En Fase 1 ocultar la aguja roja en la TV
      if (needleGroup) needleGroup.style.display = 'none';

      if (state.role === 'single' && state.phoneSecretOpen) {
        if (targetWedges) {
          targetWedges.style.display = 'block';
          targetWedges.style.opacity = '1';
        }
        if (curtain) curtain.style.display = 'none';
      } else {
        if (targetWedges) {
          targetWedges.style.display = 'none';
          targetWedges.style.opacity = '0';
        }
        if (curtain) {
          curtain.style.display = 'block';
          curtain.classList.remove('opened');
        }
      }
    } else if (state.phase === 4 && state.isCurtainOpen) {
      if (needleGroup) needleGroup.style.display = 'block';
      if (targetWedges) {
        targetWedges.style.display = 'block';
        targetWedges.style.opacity = '1';
      }
      if (curtain) {
        curtain.style.display = 'none';
        curtain.classList.add('opened');
      }
    } else {
      if (needleGroup) needleGroup.style.display = 'block';
      if (targetWedges) {
        targetWedges.style.display = 'none';
        targetWedges.style.opacity = '0';
      }
      if (curtain) {
        curtain.style.display = 'block';
        curtain.classList.remove('opened');
      }
    }

    // Posicionar aguja
    updateTvNeedleOnly();

    // Indicador apuesta rival
    const rivalBox = document.getElementById('tvRivalBetBadge');
    if (rivalBox) {
      if (state.rivalGuess && state.mode === 'competitive') {
        const rivalName = state.activeTeam === 'blue' ? 'Equipo Rojo' : 'Equipo Azul';
        const dirText = state.rivalGuess === 'left' ? '⬅️ A la IZQUIERDA' : 'A la DERECHA ➡️';
        rivalBox.textContent = `Apuesta ${rivalName}: ${dirText}`;
        rivalBox.classList.remove('d-none');
      } else {
        rivalBox.classList.add('d-none');
      }
    }

    // Ticker inferior informativo
    const ticker = document.getElementById('tvStatusTicker');
    if (ticker) {
      if (state.phase === 1) {
        ticker.textContent = state.mode === 'competitive'
          ? `🤫 El Locutor del ${getActiveTeamName()} está mirando el objetivo en secreto y pensando su pista...`
          : '🤫 El Locutor está mirando el objetivo en secreto y pensando su pista...';
      } else if (state.phase === 2) {
        ticker.textContent = state.mode === 'competitive'
          ? `🗣️ ¡A debatir el ${getActiveTeamName()}! Muevan la aguja desde el celular.`
          : '🗣️ ¡A debatir en equipo! Muevan la aguja desde el celular.';
      } else if (state.phase === 3) {
        ticker.textContent = `👀 ${getRivalTeamName()}: ¿La respuesta está a la Izquierda o Derecha de la aguja?`;
      } else if (state.phase === 4) {
        if (state.lastRoundResult) {
          ticker.textContent = `🎯 Puntos sumados: +${state.lastRoundResult.pts}${state.lastRoundResult.rivalStole ? ' | ⚡ ¡Rival robó +1 punto!' : ''}`;
        } else {
          ticker.textContent = '🎉 ¡Revelando en la TV!';
        }
      }
    }
  }

  function updateTvNeedleOnly() {
    const needleGroup = document.getElementById('tvNeedleGroup');
    if (!needleGroup) return;

    if (state.phase === 0 || state.phase === 1) {
      needleGroup.style.display = 'none';
    } else {
      needleGroup.style.display = 'block';
    }

    const angle = valorAAngulo(state.needleValue);
    needleGroup.setAttribute('transform', `rotate(${angle}, 250, 240)`);
  }

  function animateCurtainOpenTv() {
    const curtain = document.getElementById('tvDialCurtain');
    const targetWedges = document.getElementById('target-wedges');
    if (curtain) {
      curtain.classList.add('opened');
      curtain.style.display = 'none';
    }
    if (targetWedges) {
      targetWedges.style.display = 'block';
      targetWedges.style.opacity = '1';
    }
    const phaseText = document.getElementById('tvPhaseStatus');
    if (phaseText) phaseText.textContent = 'Fase 4: Resultado';
  }

  // =========================================================================
  // GEOMETRÍA Y MATEMÁTICA DEL DIAL SEMICIRCULAR (SVG)
  // cx = 250, cy = 240, rInner = 85, rOuter = 205
  // =========================================================================
  function valorAAngulo(valor) {
    return ((valor - 50) / 50) * 90; // 0 -> -90°, 50 -> 0°, 100 -> +90°
  }

  function polarACartesiano(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function crearPathSector(cx, cy, rInner, rOuter, startDeg, endDeg) {
    const p1 = polarACartesiano(cx, cy, rOuter, startDeg);
    const p2 = polarACartesiano(cx, cy, rOuter, endDeg);
    const p3 = polarACartesiano(cx, cy, rInner, endDeg);
    const p4 = polarACartesiano(cx, cy, rInner, startDeg);
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 0 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  const WEDGE_DEFS = [
    { from: -20.25, to: -12.15, pts: '2', fill: '#6366f1', textFill: '#ffffff' },
    { from: -12.15, to: -4.05,  pts: '3', fill: '#0ea5e9', textFill: '#ffffff' },
    { from: -4.05,  to: 4.05,   pts: '4', fill: '#f59e0b', textFill: '#000000' },
    { from: 4.05,   to: 12.15,  pts: '3', fill: '#0ea5e9', textFill: '#ffffff' },
    { from: 12.15,  to: 20.25,  pts: '2', fill: '#6366f1', textFill: '#ffffff' }
  ];

  function renderSvgTargetSlice(containerOrId, centerVal) {
    const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    if (!container) return;
    container.innerHTML = '';

    const cx = 250;
    const cy = 240;
    const rInner = 85;
    const rOuter = 205;
    const rMid = (rInner + rOuter) / 2; // 145

    const targetAngle = valorAAngulo(centerVal);

    WEDGE_DEFS.forEach(seg => {
      const a1 = targetAngle + seg.from;
      const a2 = targetAngle + seg.to;
      const pathD = crearPathSector(cx, cy, rInner, rOuter, a1, a2);

      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', pathD);
      pathEl.setAttribute('fill', seg.fill);
      pathEl.setAttribute('stroke', '#090915');
      pathEl.setAttribute('stroke-width', '1.5');
      container.appendChild(pathEl);

      const midAngle = (a1 + a2) / 2;
      const pText = polarACartesiano(cx, cy, rMid, midAngle);

      const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('x', pText.x.toFixed(2));
      textEl.setAttribute('y', pText.y.toFixed(2));
      textEl.setAttribute('dominant-baseline', 'central');
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('fill', seg.textFill);
      textEl.setAttribute('font-family', 'Outfit, sans-serif');
      textEl.setAttribute('font-weight', '900');
      textEl.setAttribute('font-size', seg.pts === '4' ? '18' : '15');
      textEl.textContent = seg.pts;
      container.appendChild(textEl);
    });
  }

  // =========================================================================
  // RENDERIZADO VISUAL DEL CELULAR CONTROL REMOTO
  // =========================================================================
  function renderRemoteHeader() {
    const label = document.getElementById('remoteRoomCodeDisplay');
    if (label) label.textContent = roomCode;
  }

  function renderRemoteUI() {
    if (state.isGameOver) {
      renderRemoteGameOver();
      return;
    }

    const container = document.getElementById('remotePhaseContainer');
    if (!container) return;

    // FASE 0: CONFIGURACIÓN PREVIA (SETUP)
    if (state.phase === 0) {
      renderRemoteSetup();
      return;
    }

    // FASE 1: LOCUTOR
    if (state.phase === 1) {
      const activeTeamName = getActiveTeamName();
      const locutorTitle = getLocutorTitle();
      const isBlue = getActiveTeamKey() === 'blue';
      const teamColor = state.mode === 'competitive' ? (isBlue ? '#38bdf8' : '#f43f5e') : '#f59e0b';

      container.innerHTML = `
        <div class="remote-phase-banner">
          <h2 class="remote-phase-title" style="color: ${teamColor};">🎤 ${escapeHtml(locutorTitle.toUpperCase())}</h2>
          <p class="remote-phase-help">
            ${state.mode === 'competitive'
              ? `Pasale el celular al jugador del <strong>${escapeHtml(activeTeamName)}</strong> que sea el Locutor de esta ronda para que piense la pista.`
              : 'Pasale el celular al Locutor de esta ronda para que piense la pista.'}
          </p>
        </div>

        <div class="locutor-secret-card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="badge bg-secondary">${escapeHtml((state.spectrum && state.spectrum.categoria ? state.spectrum.categoria : '').replace('_', ' '))}</span>
            <button type="button" class="btn btn-sm btn-outline-light" id="btnRemoteDiscard">
              🔄 Cambiar carta
            </button>
          </div>

          <div class="p-3 mb-3" style="background: rgba(0,0,0,0.3); border-radius: 12px;">
            <div style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">Extremos de la carta:</div>
            <div class="fw-bold fs-5 text-info mt-1">⬅️ ${escapeHtml(state.spectrum ? state.spectrum.izq : '')}</div>
            <div class="text-muted my-1">vs</div>
            <div class="fw-bold fs-5 text-danger">➡️ ${escapeHtml(state.spectrum ? state.spectrum.der : '')}</div>
          </div>

          <div class="target-secret-box">
            <p style="font-size: 0.88rem; color: #fcd34d; margin-bottom: 10px;">
              🔒 <strong>Regla de Privacidad:</strong> Mirá dónde cayó el objetivo sin que nadie más vea tu pantalla.
            </p>
            <button type="button" class="btn-toggle-secret" id="btnToggleSecret">
              ${state.phoneSecretOpen ? '🙈 Tapar Objetivo en el Celular' : '👁️ Destapar Objetivo en el Celular'}
            </button>

            <!-- DIAL SEMICIRCULAR DEL CELULAR -->
            <div class="phone-dial-wrap">
              <svg id="remoteDialSvg" class="phone-dial-svg" viewBox="0 0 500 280">
                <defs>
                  <linearGradient id="phoneBezelGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#334155" />
                    <stop offset="50%" stop-color="#1e293b" />
                    <stop offset="100%" stop-color="#0f172a" />
                  </linearGradient>
                  <radialGradient id="phoneCurtainGrad1" cx="50%" cy="100%" r="90%">
                    <stop offset="0%" stop-color="#2a2050" />
                    <stop offset="70%" stop-color="#14112c" />
                    <stop offset="100%" stop-color="#0a0818" />
                  </radialGradient>
                </defs>

                <path d="M 35,240 A 215,215 0 0,1 465,240 L 445,240 A 195,195 0 0,0 55,240 Z" fill="url(#phoneBezelGrad1)" stroke="#475569" stroke-width="2" />
                <path d="M 45,240 A 205,205 0 0,1 455,240 L 335,240 A 85,85 0 0,0 165,240 Z" fill="#0a0e1a" stroke="#334155" stroke-width="1.5" />

                <g stroke="rgba(255,255,255,0.22)" stroke-width="1.5">
                  <line x1="250" y1="35" x2="250" y2="50" />
                  <line x1="105.1" y1="95.1" x2="115.7" y2="105.7" />
                  <line x1="394.9" y1="95.1" x2="384.3" y2="105.7" />
                  <line x1="45" y1="240" x2="60" y2="240" />
                  <line x1="455" y1="240" x2="440" y2="240" />
                </g>

                <g id="remote-target-wedges" style="display: ${state.phoneSecretOpen ? 'block' : 'none'}; opacity: ${state.phoneSecretOpen ? '1' : '0'};"></g>

                <g id="remoteDialCurtain" style="display: ${state.phoneSecretOpen ? 'none' : 'block'};">
                  <path d="M 45,240 A 205,205 0 0,1 455,240 L 335,240 A 85,85 0 0,0 165,240 Z" fill="url(#phoneCurtainGrad1)" stroke="#475569" stroke-width="2" />
                  <text x="250" y="165" text-anchor="middle" font-size="12" fill="#64748b" font-weight="bold" letter-spacing="2">OBJETIVO OCULTO</text>
                </g>

                <g id="remoteNeedleGroup" style="display: none;">
                  <polygon points="246,240 254,240 252,50 250,38 248,50" fill="#f43f5e" />
                  <line x1="250" y1="225" x2="250" y2="45" stroke="#ffffff" stroke-width="1.5" />
                  <circle cx="250" cy="45" r="4.5" fill="#fde047" stroke="#b45309" stroke-width="1.5" />
                </g>

                <g id="remote-dial-pivot">
                  <circle cx="250" cy="240" r="28" fill="#1e293b" stroke="#64748b" stroke-width="3" />
                  <circle cx="250" cy="240" r="14" fill="#f43f5e" />
                  <circle cx="250" cy="240" r="4" fill="#ffffff" />
                </g>
              </svg>
            </div>
          </div>

          <p class="small text-muted mb-3">
            Cuando tengas tu pista pensada, decila en voz alta a todos y tocá el botón de abajo:
          </p>

          <button type="button" class="btn-action-primary" id="btnRemotePassDebate">
            ✅ Ya di la pista (Pasar a Debate)
          </button>
        </div>
      `;

      if (state.phoneSecretOpen) {
        renderSvgTargetSlice('remote-target-wedges', state.targetValue);
      }

      const btnSecret = document.getElementById('btnToggleSecret');
      if (btnSecret) {
        btnSecret.addEventListener('click', () => {
          state.phoneSecretOpen = !state.phoneSecretOpen;
          renderRemoteUI();
        });
      }

      const btnDiscard = document.getElementById('btnRemoteDiscard');
      if (btnDiscard) {
        btnDiscard.addEventListener('click', () => {
          sendRemoteAction('DISCARD_SPECTRUM');
        });
      }

      const btnPass = document.getElementById('btnRemotePassDebate');
      if (btnPass) {
        btnPass.addEventListener('click', () => {
          state.phoneSecretOpen = false;
          sendRemoteAction('PASS_TO_DEBATE');
        });
      }
      return;
    }

    // FASE 2: MOVER AGUJA
    if (state.phase === 2) {
      const activeTeamName = getActiveTeamName();
      const isBlue = getActiveTeamKey() === 'blue';
      const teamColor = state.mode === 'competitive' ? (isBlue ? '#38bdf8' : '#f43f5e') : '#f59e0b';

      container.innerHTML = `
        <div class="remote-phase-banner">
          <h2 class="remote-phase-title" style="color: ${teamColor};">🎛️ FASE 2: DEBATE DEL ${escapeHtml(activeTeamName.toUpperCase())}</h2>
          <p class="remote-phase-help">Debatan mirando el televisor y ajusten la aguja en tiempo real.</p>
        </div>

        <div class="needle-controls-card">
          <div class="phone-dial-wrap">
            <svg id="remoteDialSvg2" class="phone-dial-svg" viewBox="0 0 500 280">
              <defs>
                <linearGradient id="phoneBezelGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#334155" />
                  <stop offset="50%" stop-color="#1e293b" />
                  <stop offset="100%" stop-color="#0f172a" />
                </linearGradient>
                <radialGradient id="phoneCurtainGrad2" cx="50%" cy="100%" r="90%">
                  <stop offset="0%" stop-color="#2a2050" />
                  <stop offset="70%" stop-color="#14112c" />
                  <stop offset="100%" stop-color="#0a0818" />
                </radialGradient>
              </defs>

              <path d="M 35,240 A 215,215 0 0,1 465,240 L 445,240 A 195,195 0 0,0 55,240 Z" fill="url(#phoneBezelGrad2)" stroke="#475569" stroke-width="2" />
              <path d="M 45,240 A 205,205 0 0,1 455,240 L 335,240 A 85,85 0 0,0 165,240 Z" fill="#0a0e1a" stroke="#334155" stroke-width="1.5" />

              <g stroke="rgba(255,255,255,0.22)" stroke-width="1.5">
                <line x1="250" y1="35" x2="250" y2="50" />
                <line x1="105.1" y1="95.1" x2="115.7" y2="105.7" />
                <line x1="394.9" y1="95.1" x2="384.3" y2="105.7" />
                <line x1="45" y1="240" x2="60" y2="240" />
                <line x1="455" y1="240" x2="440" y2="240" />
              </g>

              <g id="remoteDialCurtain2">
                <path d="M 45,240 A 205,205 0 0,1 455,240 L 335,240 A 85,85 0 0,0 165,240 Z" fill="url(#phoneCurtainGrad2)" stroke="#475569" stroke-width="2" />
                <text x="250" y="165" text-anchor="middle" font-size="12" fill="#64748b" font-weight="bold" letter-spacing="2">OBJETIVO OCULTO</text>
              </g>

              <g id="remoteNeedleGroup" transform="rotate(${valorAAngulo(state.needleValue)}, 250, 240)">
                <polygon points="246,240 254,240 252,50 250,38 248,50" fill="#f43f5e" />
                <line x1="250" y1="225" x2="250" y2="45" stroke="#ffffff" stroke-width="1.5" />
                <circle cx="250" cy="45" r="4.5" fill="#fde047" stroke="#b45309" stroke-width="1.5" />
              </g>

              <g id="remote-dial-pivot2">
                <circle cx="250" cy="240" r="28" fill="#1e293b" stroke="#64748b" stroke-width="3" />
                <circle cx="250" cy="240" r="14" fill="#f43f5e" />
                <circle cx="250" cy="240" r="4" fill="#ffffff" />
              </g>
            </svg>
          </div>

          <div class="d-flex justify-content-between text-muted small mb-1">
            <span>⬅️ ${escapeHtml(state.spectrum ? state.spectrum.izq : '')}</span>
            <span>${escapeHtml(state.spectrum ? state.spectrum.der : '')} ➡️</span>
          </div>

          <div class="custom-slider-wrap">
            <input type="range" class="needle-range-input" id="remoteNeedleRange" min="0" max="100" step="0.5" value="${state.needleValue}">
          </div>

          <div class="needle-fine-buttons">
            <button type="button" class="btn-fine-step" data-step="-5">-5</button>
            <button type="button" class="btn-fine-step" data-step="-1">-1</button>
            <button type="button" class="btn-fine-step" data-step="1">+1</button>
            <button type="button" class="btn-fine-step" data-step="5">+5</button>
          </div>

          <button type="button" class="btn-action-primary btn-action-gold" id="btnRemoteLockNeedle">
            🔒 Fijar Aguja
          </button>
        </div>
      `;

      const slider = document.getElementById('remoteNeedleRange');
      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          state.needleValue = val;
          updateRemoteNeedleOnly();
          throttleSendNeedle(val);
        });
      }

      document.querySelectorAll('.btn-fine-step').forEach(btn => {
        btn.addEventListener('click', () => {
          const step = parseFloat(btn.dataset.step);
          state.needleValue = Math.max(0, Math.min(100, state.needleValue + step));
          if (slider) slider.value = state.needleValue;
          updateRemoteNeedleOnly();
          throttleSendNeedle(state.needleValue);
        });
      });

      const btnLock = document.getElementById('btnRemoteLockNeedle');
      if (btnLock) {
        btnLock.addEventListener('click', () => {
          sendRemoteAction('LOCK_NEEDLE');
        });
      }
      return;
    }

    // FASE 3: APUESTA RIVAL (Interferencia)
    if (state.phase === 3) {
      const rivalName = getRivalTeamName();
      const isRed = getRivalTeamKey() === 'red';
      const rivalColor = isRed ? '#f43f5e' : '#38bdf8';

      container.innerHTML = `
        <div class="remote-phase-banner">
          <h2 class="remote-phase-title" style="color: ${rivalColor};">⚡ FASE 3: INTERFERENCIA DEL ${escapeHtml(rivalName.toUpperCase())}</h2>
          <p class="remote-phase-help">Pasale el celular al <strong>${escapeHtml(rivalName)}</strong> para que apueste el lado.</p>
        </div>

        <div class="needle-controls-card">
          <p class="mb-3">
            Mirando la TV: ¿El centro del objetivo está a la <strong>IZQUIERDA</strong> o a la <strong>DERECHA</strong> de la aguja fijada?
          </p>

          <div class="rival-buttons-grid">
            <button type="button" class="btn-rival-guess ${state.rivalGuess === 'left' ? 'selected' : ''}" id="btnRivalLeft">
              <span style="font-size: 1.8rem;">⬅️</span>
              <span>A la IZQUIERDA</span>
            </button>
            <button type="button" class="btn-rival-guess ${state.rivalGuess === 'right' ? 'selected' : ''}" id="btnRivalRight">
              <span style="font-size: 1.8rem;">➡️</span>
              <span>A la DERECHA</span>
            </button>
          </div>

          <p class="small text-muted mt-3 mb-0">
            Si aciertan y el equipo activo no clavó los 4 puntos, ¡suman +1 punto de robo!
          </p>
        </div>
      `;

      const btnL = document.getElementById('btnRivalLeft');
      const btnR = document.getElementById('btnRivalRight');

      if (btnL) {
        btnL.addEventListener('click', () => {
          sendRemoteAction('RIVAL_GUESS', { direction: 'left' });
        });
      }
      if (btnR) {
        btnR.addEventListener('click', () => {
          sendRemoteAction('RIVAL_GUESS', { direction: 'right' });
        });
      }
      return;
    }

    // FASE 4: REVELAR Y SIGUIENTE RONDA
    if (state.phase === 4) {
      const canReveal = !state.isCurtainOpen;

      container.innerHTML = `
        <div class="remote-phase-banner">
          <h2 class="remote-phase-title">🎉 FASE 4: REVELACIÓN</h2>
          <p class="remote-phase-help">Mirá la pantalla grande del televisor.</p>
        </div>

        <div class="needle-controls-card">
          ${canReveal ? `
            <button type="button" class="btn-action-primary btn-action-gold my-3" id="btnRemoteReveal">
              🎉 ¡Revelar Resultado en la TV!
            </button>
          ` : `
            <div class="alert alert-dark border-secondary p-3 mb-3">
              <div class="fw-bold text-warning fs-5">¡Cortina abierta en la TV!</div>
              <div class="text-light mt-1">
                Puntos sumados: <strong>+${state.lastRoundResult ? state.lastRoundResult.pts : 0} pts</strong>
                ${state.lastRoundResult && state.lastRoundResult.rivalStole ? '<br><span class="text-info">⚡ ¡Rival sumó +1 por interferencia!</span>' : ''}
              </div>
            </div>

            <button type="button" class="btn-action-primary my-2" id="btnRemoteNextRound">
              ➡️ Siguiente Ronda
            </button>
          `}
        </div>
      `;

      const btnReveal = document.getElementById('btnRemoteReveal');
      if (btnReveal) {
        btnReveal.addEventListener('click', () => {
          sendRemoteAction('REVEAL');
        });
      }

      const btnNext = document.getElementById('btnRemoteNextRound');
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          sendRemoteAction('NEXT_ROUND');
        });
      }
    }
  }

  // =========================================================================
  // FASE 0: CONFIGURACIÓN PREVIA (SETUP DESDE CELULAR)
  // =========================================================================
  function renderRemoteSetup() {
    const container = document.getElementById('remotePhaseContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="setup-box">
        <h2 class="setup-title">⚙️ CONFIGURAR PARTIDA</h2>

        <div class="mb-3">
          <label class="setup-group-label">Modo de Juego:</label>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-light flex-fill py-2 pill-option ${setupConfig.mode === 'competitive' ? 'active' : ''}" id="btnSetupModeComp">
              ⚔️ Competitivo (Azul vs Rojo)
            </button>
            <button type="button" class="btn btn-outline-light flex-fill py-2 pill-option ${setupConfig.mode === 'cooperative' ? 'active' : ''}" id="btnSetupModeCoop">
              🤝 Cooperativo
            </button>
          </div>
        </div>

        ${setupConfig.mode === 'competitive' ? `
          <div class="mb-3">
            <label class="setup-group-label">Meta de puntos para ganar:</label>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-outline-warning flex-fill btn-setup-score ${setupConfig.targetScore === 10 ? 'active' : ''}" data-score="10">10 pts</button>
              <button type="button" class="btn btn-outline-warning flex-fill btn-setup-score ${setupConfig.targetScore === 15 ? 'active' : ''}" data-score="15">15 pts ⭐</button>
              <button type="button" class="btn btn-outline-warning flex-fill btn-setup-score ${setupConfig.targetScore === 20 ? 'active' : ''}" data-score="20">20 pts</button>
            </div>
          </div>
        ` : `
          <div class="mb-3">
            <label class="setup-group-label">Cantidad de rondas:</label>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-outline-warning flex-fill btn-setup-rounds ${setupConfig.totalRounds === 5 ? 'active' : ''}" data-rounds="5">5 rondas</button>
              <button type="button" class="btn btn-outline-warning flex-fill btn-setup-rounds ${setupConfig.totalRounds === 7 ? 'active' : ''}" data-rounds="7">7 rondas ⭐</button>
              <button type="button" class="btn btn-outline-warning flex-fill btn-setup-rounds ${setupConfig.totalRounds === 10 ? 'active' : ''}" data-rounds="10">10 rondas</button>
            </div>
          </div>
        `}

        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="setup-group-label mb-0">Categorías de Espectros:</label>
            <button type="button" class="btn btn-sm btn-outline-info" id="btnSelectAllCats" style="font-size: 0.8rem;">
              ✨ Seleccionar Todas
            </button>
          </div>
          <div class="setup-cats-grid">
            ${AVAILABLE_CATEGORIES.map(cat => `
              <div class="setup-cat-pill ${setupConfig.selectedCategories.includes(cat.id) ? 'active' : ''}" data-cat="${cat.id}">
                <span>${cat.icon}</span>
                <span>${cat.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <button type="button" class="btn-action-primary btn-action-gold mt-3" id="btnStartGameAction">
          🚀 Iniciar Partida
        </button>
      </div>
    `;

    // Eventos Modo
    const bComp = document.getElementById('btnSetupModeComp');
    const bCoop = document.getElementById('btnSetupModeCoop');
    if (bComp) {
      bComp.addEventListener('click', () => {
        setupConfig.mode = 'competitive';
        renderRemoteSetup();
      });
    }
    if (bCoop) {
      bCoop.addEventListener('click', () => {
        setupConfig.mode = 'cooperative';
        renderRemoteSetup();
      });
    }

    // Eventos Puntos
    document.querySelectorAll('.btn-setup-score').forEach(btn => {
      btn.addEventListener('click', () => {
        setupConfig.targetScore = parseInt(btn.dataset.score, 10);
        renderRemoteSetup();
      });
    });

    // Eventos Rondas
    document.querySelectorAll('.btn-setup-rounds').forEach(btn => {
      btn.addEventListener('click', () => {
        setupConfig.totalRounds = parseInt(btn.dataset.rounds, 10);
        renderRemoteSetup();
      });
    });

    // Evento Seleccionar Todas
    const btnAll = document.getElementById('btnSelectAllCats');
    if (btnAll) {
      btnAll.addEventListener('click', () => {
        setupConfig.selectedCategories = AVAILABLE_CATEGORIES.map(c => c.id);
        renderRemoteSetup();
      });
    }

    // Evento Toggle Categoría individual
    document.querySelectorAll('.setup-cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const catId = pill.dataset.cat;
        const idx = setupConfig.selectedCategories.indexOf(catId);
        if (idx > -1) {
          if (setupConfig.selectedCategories.length > 1) {
            setupConfig.selectedCategories.splice(idx, 1);
          }
        } else {
          setupConfig.selectedCategories.push(catId);
        }
        renderRemoteSetup();
      });
    });

    // Botón Iniciar
    const btnStart = document.getElementById('btnStartGameAction');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        sendRemoteAction('START_GAME', { config: setupConfig });
      });
    }
  }

  function updateRemoteNeedleOnly() {
    const needle = document.getElementById('remoteNeedleGroup');
    if (needle) {
      const angle = valorAAngulo(state.needleValue);
      needle.setAttribute('transform', `rotate(${angle}, 250, 240)`);
    }
  }

  function throttleSendNeedle(val) {
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      sendRemoteAction('MOVE_NEEDLE', { value: val });
    }, 30);
  }

  function renderRemoteGameOver() {
    const container = document.getElementById('remotePhaseContainer');
    if (!container) return;

    let winnerTitle = '';
    let subtitle = '';
    if (state.mode === 'competitive') {
      winnerTitle = state.winner === 'blue' ? '🏆 ¡GANÓ EL EQUIPO AZUL!' : '🏆 ¡GANÓ EL EQUIPO ROJO!';
      subtitle = `Marcador final: Azul ${state.scores.blue} - ${state.scores.red} Rojo`;
    } else {
      winnerTitle = `🏆 ¡PUNTAJE FINAL: ${state.coopScore} PUNTOS!`;
      subtitle = `Rondas completadas: ${state.totalRounds}`;
    }

    container.innerHTML = `
      <div class="needle-controls-card text-center">
        <h2 class="text-warning mb-2">${escapeHtml(winnerTitle)}</h2>
        <p class="text-light fw-bold mb-1">${escapeHtml(subtitle)}</p>
        <p class="text-muted small mb-4">¡Gran partida de sintonía fina!</p>
        
        <div class="d-flex flex-column gap-2">
          <button type="button" class="btn-action-primary" id="btnRemoteRestart">
            🔄 Jugar Misma Configuración
          </button>
          <button type="button" class="btn-action-secondary" id="btnRemoteNewSetup">
            ⚙️ Cambiar Configuración
          </button>
        </div>
      </div>
    `;

    const btnRestart = document.getElementById('btnRemoteRestart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        sendRemoteAction('START_GAME', { config: setupConfig });
      });
    }

    const btnNewSetup = document.getElementById('btnRemoteNewSetup');
    if (btnNewSetup) {
      btnNewSetup.addEventListener('click', () => {
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

    // FASE 0: CONFIGURACIÓN
    if (state.phase === 0) {
      container.innerHTML = `
        <div class="setup-box my-0 p-3" style="max-width: 520px;">
          <h4 class="text-warning text-center fw-bold mb-3">⚙️ CONFIGURAR PARTIDA</h4>

          <div class="mb-3">
            <label class="setup-group-label">Modo:</label>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-outline-light flex-fill pill-option ${setupConfig.mode === 'competitive' ? 'active' : ''}" id="btnSingleModeComp">
                ⚔️ Competitivo
              </button>
              <button type="button" class="btn btn-sm btn-outline-light flex-fill pill-option ${setupConfig.mode === 'cooperative' ? 'active' : ''}" id="btnSingleModeCoop">
                🤝 Cooperativo
              </button>
            </div>
          </div>

          ${setupConfig.mode === 'competitive' ? `
            <div class="mb-3">
              <label class="setup-group-label">Meta de puntos:</label>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-single-score ${setupConfig.targetScore === 10 ? 'active' : ''}" data-score="10">10 pts</button>
                <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-single-score ${setupConfig.targetScore === 15 ? 'active' : ''}" data-score="15">15 pts ⭐</button>
                <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-single-score ${setupConfig.targetScore === 20 ? 'active' : ''}" data-score="20">20 pts</button>
              </div>
            </div>
          ` : `
            <div class="mb-3">
              <label class="setup-group-label">Rondas:</label>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-single-rounds ${setupConfig.totalRounds === 5 ? 'active' : ''}" data-rounds="5">5 rondas</button>
                <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-single-rounds ${setupConfig.totalRounds === 7 ? 'active' : ''}" data-rounds="7">7 rondas ⭐</button>
                <button type="button" class="btn btn-sm btn-outline-warning flex-fill btn-single-rounds ${setupConfig.totalRounds === 10 ? 'active' : ''}" data-rounds="10">10 rondas</button>
              </div>
            </div>
          `}

          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="setup-group-label mb-0">Categorías:</label>
              <button type="button" class="btn btn-sm btn-outline-info py-0 px-2" id="btnSingleSelectAllCats" style="font-size: 0.75rem;">
                ✨ Todas
              </button>
            </div>
            <div class="setup-cats-grid">
              ${AVAILABLE_CATEGORIES.map(cat => `
                <div class="setup-cat-pill ${setupConfig.selectedCategories.includes(cat.id) ? 'active' : ''}" data-cat="${cat.id}">
                  <span>${cat.icon}</span>
                  <span>${cat.name}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <button type="button" class="btn btn-warning w-100 py-2 fw-bold" id="btnSingleStartGame">
            🚀 Iniciar Partida
          </button>
        </div>
      `;

      const bComp = document.getElementById('btnSingleModeComp');
      const bCoop = document.getElementById('btnSingleModeCoop');
      if (bComp) {
        bComp.addEventListener('click', () => {
          setupConfig.mode = 'competitive';
          renderSingleControls();
        });
      }
      if (bCoop) {
        bCoop.addEventListener('click', () => {
          setupConfig.mode = 'cooperative';
          renderSingleControls();
        });
      }

      document.querySelectorAll('.btn-single-score').forEach(btn => {
        btn.addEventListener('click', () => {
          setupConfig.targetScore = parseInt(btn.dataset.score, 10);
          renderSingleControls();
        });
      });

      document.querySelectorAll('.btn-single-rounds').forEach(btn => {
        btn.addEventListener('click', () => {
          setupConfig.totalRounds = parseInt(btn.dataset.rounds, 10);
          renderSingleControls();
        });
      });

      const btnAll = document.getElementById('btnSingleSelectAllCats');
      if (btnAll) {
        btnAll.addEventListener('click', () => {
          setupConfig.selectedCategories = AVAILABLE_CATEGORIES.map(c => c.id);
          renderSingleControls();
        });
      }

      document.querySelectorAll('.setup-cat-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const catId = pill.dataset.cat;
          const idx = setupConfig.selectedCategories.indexOf(catId);
          if (idx > -1) {
            if (setupConfig.selectedCategories.length > 1) {
              setupConfig.selectedCategories.splice(idx, 1);
            }
          } else {
            setupConfig.selectedCategories.push(catId);
          }
          renderSingleControls();
        });
      });

      const bStart = document.getElementById('btnSingleStartGame');
      if (bStart) {
        bStart.addEventListener('click', () => {
          applySetupConfig(setupConfig);
          startNewRound(true);
        });
      }
      return;
    }

    // FASE 1: LOCUTOR
    if (state.phase === 1) {
      const locutorTitle = getLocutorTitle();

      container.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2">
          <div class="text-warning fw-bold fs-5">${escapeHtml(locutorTitle)}</div>
          <p class="small text-muted text-center mb-1">
            Locutor: destapá el objetivo en el dial superior sin que tus compañeros espíen la pantalla.
          </p>
          <button type="button" class="btn ${state.phoneSecretOpen ? 'btn-danger' : 'btn-warning'} btn-lg px-4" id="btnSingleSecret">
            ${state.phoneSecretOpen ? '🙈 Tapar Objetivo en Pantalla' : '👁️ Destapar Objetivo en Pantalla'}
          </button>
          <button type="button" class="btn btn-primary mt-2" id="btnSinglePass">
            ✅ Ya di la pista (Pasar a debate)
          </button>
        </div>
      `;

      const btnS = document.getElementById('btnSingleSecret');
      if (btnS) {
        btnS.addEventListener('click', () => {
          state.phoneSecretOpen = !state.phoneSecretOpen;
          renderTvBoard();
          renderSingleControls();
        });
      }
      const btnP = document.getElementById('btnSinglePass');
      if (btnP) {
        btnP.addEventListener('click', () => {
          state.phoneSecretOpen = false;
          state.phase = 2;
          renderTvBoard();
          renderSingleControls();
        });
      }
      return;
    }

    // FASE 2: MOVER AGUJA
    if (state.phase === 2) {
      container.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2" style="max-width: 450px; margin: 0 auto; width: 100%;">
          <div class="fw-bold">🗣️ Muevan la aguja y fijen la posición:</div>
          <input type="range" class="needle-range-input" id="singleNeedleRange" min="0" max="100" step="0.5" value="${state.needleValue}">
          <button type="button" class="btn btn-warning mt-2" id="btnSingleLock">
            🔒 Fijar Aguja
          </button>
        </div>
      `;

      const slider = document.getElementById('singleNeedleRange');
      if (slider) {
        slider.addEventListener('input', (e) => {
          state.needleValue = parseFloat(e.target.value);
          playTickSound();
          updateTvNeedleOnly();
        });
      }

      const btnL = document.getElementById('btnSingleLock');
      if (btnL) {
        btnL.addEventListener('click', () => {
          state.needleLocked = true;
          playLockSound();
          state.phase = state.mode === 'competitive' ? 3 : 4;
          renderTvBoard();
          renderSingleControls();
        });
      }
      return;
    }

    // FASE 3: APUESTA RIVAL
    if (state.phase === 3) {
      const rivalName = getRivalTeamName();

      container.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2">
          <div class="fw-bold text-danger">⚡ Apuesta del ${escapeHtml(rivalName)}: ¿Dónde está el centro?</div>
          <div class="d-flex gap-3 mt-1">
            <button type="button" class="btn btn-outline-info" id="btnSingleRivalL">⬅️ A la IZQUIERDA</button>
            <button type="button" class="btn btn-outline-danger" id="btnSingleRivalR">A la DERECHA ➡️</button>
          </div>
        </div>
      `;

      const bl = document.getElementById('btnSingleRivalL');
      const br = document.getElementById('btnSingleRivalR');
      if (bl) {
        bl.addEventListener('click', () => {
          state.rivalGuess = 'left';
          playLockSound();
          state.phase = 4;
          renderTvBoard();
          renderSingleControls();
        });
      }
      if (br) {
        br.addEventListener('click', () => {
          state.rivalGuess = 'right';
          playLockSound();
          state.phase = 4;
          renderTvBoard();
          renderSingleControls();
        });
      }
      return;
    }

    // FASE 4: REVELAR
    if (state.phase === 4) {
      container.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2">
          ${!state.isCurtainOpen ? `
            <button type="button" class="btn btn-warning btn-lg" id="btnSingleReveal">
              🎉 ¡Revelar Resultado!
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-lg" id="btnSingleNext">
              ➡️ Siguiente Ronda
            </button>
          `}
        </div>
      `;

      const bRev = document.getElementById('btnSingleReveal');
      if (bRev) {
        bRev.addEventListener('click', () => {
          executeRevealOnTv();
        });
      }

      const bNxt = document.getElementById('btnSingleNext');
      if (bNxt) {
        bNxt.addEventListener('click', () => {
          advanceToNextRound();
        });
      }
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // Ejecutar al cargar el DOM
  document.addEventListener('DOMContentLoaded', initApp);

})(window, document);
