// save-data-manager.js
// Centralized, robust save/load for NFLGM4

(function (global) {
  'use strict';

  const C = global.Constants || {};
  const SAVE_KEY = (C.GAME_CONFIG && C.GAME_CONFIG.SAVE_KEY) || 'nflGM4.league';

  /**
   * Build a clean, serializable snapshot of the league.
   * (Avoid putting DOM nodes, functions, or circular refs in here.)
   */
  function buildSavePayload() {
    if (!global.state || !global.state.league) return null;

    return {
      version: 1,
      savedAt: new Date().toISOString(),
      league: global.state.league
    };
  }

  /**
   * Save the current league to localStorage.
   */
  function saveLeague() {
    try {
      const payload = buildSavePayload();
      if (!payload) {
        console.warn('[Save] No league in state to save');
        return false;
      }

      const json = JSON.stringify(payload);
      global.localStorage.setItem(SAVE_KEY, json);

      // Optional: status message in your UI
      if (typeof global.setStatus === 'function') {
        global.setStatus('Game saved');
      }

      return true;
    } catch (err) {
      console.error('[Save] Error saving league:', err);
      return false;
    }
  }

  /**
   * Load league from localStorage into global.state.
   * Returns the loaded league or null.
   */
  function loadLeague() {
    try {
      const raw = global.localStorage.getItem(SAVE_KEY);
      if (!raw) {
        console.log('[Save] No existing save found for key', SAVE_KEY);
        return null;
      }

      const payload = JSON.parse(raw);
      if (!payload || !payload.league) {
        console.warn('[Save] Save payload missing league, ignoring');
        return null;
      }

      global.state = global.state || {};
      global.state.league = payload.league;

      // If you track the user’s team in the league object:
      if (payload.league.userTeamId !== undefined) {
        global.state.userTeamId = payload.league.userTeamId;
      }

      console.log('[Save] League loaded from storage');
      return payload.league;
    } catch (err) {
      console.error('[Save] Error loading league:', err);
      return null;
    }
  }

  /**
   * Clear save (for starting fresh).
   */
  function clearSavedLeague() {
    try {
      global.localStorage.removeItem(SAVE_KEY);
      console.log('[Save] Save cleared');
    } catch (err) {
      console.error('[Save] Error clearing save:', err);
    }
  }

  // Optional: auto-save when tab closes
  function hookAutoSave() {
    global.addEventListener('beforeunload', function () {
      try {
        saveLeague();
      } catch (err) {
        // swallow; user is leaving anyway
      }
    });
  }

  // Expose globally
  global.saveLeague = saveLeague;
  global.loadLeague = loadLeague;
  global.clearSavedLeague = clearSavedLeague;
  global.hookAutoSave = hookAutoSave;

  // Install autosave by default
  hookAutoSave();

})(window);