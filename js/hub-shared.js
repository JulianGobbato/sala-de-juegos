/**
 * Hub de Juegos de Mesa - Gestor Global de Jugadores
 * Almacena y sincroniza la lista de participantes en localStorage ("hub_jugadores")
 */
(function(window) {
  'use strict';

  const STORAGE_KEY = 'hub_jugadores';
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 10;

  const DEFAULT_AVATARS = ['🧢', '🧣', '🕶️', '🎸', '🎩', '🎧', '🧉', '🦺', '🚲', '👑', '🦁', '🍕', '🚀', '⭐'];

  const DEFAULT_PLAYERS = [
    { id: 1, name: 'El Piti', emoji: '🧢' },
    { id: 2, name: 'La Sole', emoji: '🧣' },
    { id: 3, name: 'Nacho', emoji: '🕶️' },
    { id: 4, name: 'Cami', emoji: '🎸' },
    { id: 5, name: 'El Polaco', emoji: '🎩' },
    { id: 6, name: 'Martu', emoji: '🎧' }
  ];

  /**
   * Normaliza un jugador asegurando id numérico (1-based), name string, y emoji.
   */
  function normalizePlayer(p, index) {
    if (!p) {
      return {
        id: index + 1,
        name: `Jugador ${index + 1}`,
        emoji: DEFAULT_AVATARS[index % DEFAULT_AVATARS.length]
      };
    }
    if (typeof p === 'string') {
      const name = p.trim() || `Jugador ${index + 1}`;
      return {
        id: index + 1,
        name: name,
        emoji: DEFAULT_AVATARS[index % DEFAULT_AVATARS.length]
      };
    }
    const name = (typeof p.name === 'string' && p.name.trim()) ? p.name.trim() : `Jugador ${index + 1}`;
    const emoji = p.emoji || DEFAULT_AVATARS[index % DEFAULT_AVATARS.length];
    return {
      id: index + 1,
      name: name,
      emoji: emoji
    };
  }

  /**
   * Obtiene la lista actual de jugadores del hub.
   * @param {boolean} [autoInit=true] - Si no hay datos guardados, inicializa con la mesa de 6 amigos por defecto.
   * @returns {Array<{id: number, name: string, emoji: string}>}
   */
  function getHubPlayers(autoInit = true) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((p, idx) => normalizePlayer(p, idx));
        }
      }
      if (autoInit) {
        // Inicializar por defecto con la mesa de 6 amigos
        saveHubPlayers(DEFAULT_PLAYERS);
        return [...DEFAULT_PLAYERS];
      }
      return [];
    } catch (e) {
      console.warn('Error al leer hub_jugadores de localStorage:', e);
      return autoInit ? [...DEFAULT_PLAYERS] : [];
    }
  }

  /**
   * Guarda la lista de jugadores en localStorage y notifica cambios.
   * @param {Array} players - Array de jugadores (objetos o strings).
   * @returns {Array} Lista normalizada guardada.
   */
  function saveHubPlayers(players) {
    try {
      const list = Array.isArray(players) ? players.slice(0, MAX_PLAYERS) : [];
      const normalized = list.map((p, idx) => normalizePlayer(p, idx));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

      // Disparar evento para que otras pestañas o vistas se sincronicen
      try {
        window.dispatchEvent(new CustomEvent('hubPlayersChanged', { detail: normalized }));
      } catch (_) {}

      return normalized;
    } catch (e) {
      console.warn('Error al guardar hub_jugadores en localStorage:', e);
      return [];
    }
  }

  /**
   * Agrega un nuevo jugador a la mesa.
   * @param {string} name - Nombre del participante.
   * @param {string} [emoji] - Emoji o avatar.
   * @returns {{success: boolean, players: Array, error?: string}}
   */
  function addHubPlayer(name, emoji) {
    const current = getHubPlayers(false);
    if (current.length >= MAX_PLAYERS) {
      return { success: false, players: current, error: `Máximo ${MAX_PLAYERS} jugadores.` };
    }
    const trimmed = (name || '').trim();
    const finalName = trimmed || `Jugador ${current.length + 1}`;
    const finalEmoji = emoji || DEFAULT_AVATARS[current.length % DEFAULT_AVATARS.length];
    current.push({
      id: current.length + 1,
      name: finalName,
      emoji: finalEmoji
    });
    const saved = saveHubPlayers(current);
    return { success: true, players: saved };
  }

  /**
   * Elimina un jugador según su índice (0-based) o id (1-based).
   * @param {number} identifier - Índice o ID del jugador a quitar.
   * @returns {Array} Lista actualizada.
   */
  function removeHubPlayer(identifier) {
    const current = getHubPlayers(false);
    let targetIndex = -1;
    if (typeof identifier === 'number') {
      // Buscar primero por ID exacto
      targetIndex = current.findIndex(p => p.id === identifier);
      // Si no se encuentra, usar como índice posicional
      if (targetIndex === -1 && identifier >= 0 && identifier < current.length) {
        targetIndex = identifier;
      }
    }
    if (targetIndex >= 0 && targetIndex < current.length) {
      current.splice(targetIndex, 1);
    }
    return saveHubPlayers(current);
  }

  /**
   * Mezcla aleatoriamente el orden de los turnos de los jugadores (Shuffle / Fisher-Yates).
   * @returns {Array} Lista reordenada guardada.
   */
  function shuffleHubPlayers() {
    const current = getHubPlayers(false);
    for (let i = current.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [current[i], current[j]] = [current[j], current[i]];
    }
    return saveHubPlayers(current);
  }

  /**
   * Reordena la lista de jugadores directamente.
   * @param {Array<number>} newOrderIndices - Array de índices en el nuevo orden.
   */
  function reorderHubPlayers(newOrderIndices) {
    const current = getHubPlayers(false);
    if (!Array.isArray(newOrderIndices) || newOrderIndices.length !== current.length) {
      return current;
    }
    const reordered = newOrderIndices.map(idx => current[idx]).filter(Boolean);
    return saveHubPlayers(reordered);
  }

  /**
   * Restablece la mesa a los 6 amigos por defecto.
   * @returns {Array}
   */
  function resetHubPlayersToDefault() {
    return saveHubPlayers(DEFAULT_PLAYERS);
  }

  /**
   * Limpia todos los jugadores de la mesa.
   * @returns {Array}
   */
  function clearHubPlayers() {
    return saveHubPlayers([]);
  }

  // Exportar globalmente
  const HubShared = {
    STORAGE_KEY,
    MIN_PLAYERS,
    MAX_PLAYERS,
    DEFAULT_PLAYERS,
    DEFAULT_AVATARS,
    getHubPlayers,
    saveHubPlayers,
    addHubPlayer,
    removeHubPlayer,
    shuffleHubPlayers,
    reorderHubPlayers,
    resetHubPlayersToDefault,
    clearHubPlayers
  };

  window.HubShared = HubShared;
  window.getHubPlayers = getHubPlayers;
  window.saveHubPlayers = saveHubPlayers;
  window.addHubPlayer = addHubPlayer;
  window.removeHubPlayer = removeHubPlayer;
  window.shuffleHubPlayers = shuffleHubPlayers;
  window.resetHubPlayersToDefault = resetHubPlayersToDefault;
  window.clearHubPlayers = clearHubPlayers;

})(typeof window !== 'undefined' ? window : this);
