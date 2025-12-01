// state-save-manager.js - Unified State Management and Persistence

(function (global) {
  'use strict';

  // --- Configuration Variables ---
  // Using const to define variables previously in var blocks for modern JS
  const C = global.Constants || {};
  const SAVE_KEY_BASE = (C.GAME_CONFIG && C.GAME_CONFIG.SAVE_KEY) || 'nflGM4.state'; // Base key for multi-slot saves
  const YEAR_START = (C.GAME_CONFIG && C.GAME_CONFIG.YEAR_START) || 2025;

  const MAX_SAVE_SLOTS = 5;

  function normalizeSlot(slot) {
    const parsed = parseInt(slot, 10);
    if (isNaN(parsed) || parsed < 1) return 1;
    if (parsed > MAX_SAVE_SLOTS) return MAX_SAVE_SLOTS;
    return parsed;
  }

  function getActiveSaveSlot() {
    const stored = global.localStorage.getItem('nflGM4.activeSlot');
    return normalizeSlot(stored || 1);
  }

  function setActiveSaveSlot(slot) {
    const normalized = normalizeSlot(slot);
    try {
      global.localStorage.setItem('nflGM4.activeSlot', normalized);
      if (global.state) {
        global.state.saveSlot = normalized;
      }
    } catch (err) {
      console.warn('Unable to persist active save slot', err);
    }
    return normalized;
  }

  function saveKeyFor(slot) {
    const normalized = normalizeSlot(slot);
    return `${SAVE_KEY_BASE}.slot${normalized}`;
  }
  
  // Game Routes (used for UI)
  const routes = [
    'hub', 'roster', 'cap', 'schedule', 'standings', 'trade', 'freeagency',
    'draft', 'playoffs', 'settings', 'hallOfFame', 'scouting'
  ];

  // --- Name Data (Fallbacks for Player Generation) ---
  // Use EXPANDED_ names if they exist, otherwise fall back to small array
  const FIRST_NAMES = global.EXPANDED_FIRST_NAMES || [
    'James', 'Michael', 'John', 'Robert', 'David', 'William', 'Richard', 'Joseph', 
    'Thomas', 'Christopher', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Andrew', 'Joshua'
  ];
  const LAST_NAMES = global.EXPANDED_LAST_NAMES || [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'
  ];

  // --- State Management System ---

  /**
   * Centralized utility object for managing the game state schema.
   */
  const State = {
    /**
     * Initialize a clean game state object.
     * @returns {Object} Fresh state object
     */
    init() {
      console.log('Initializing fresh state...');
      
      const freshState = {
        // Core game data
        league: null,
        season: 1,
        year: YEAR_START,
        
        // Player/Team data
        player: {
          teamId: 0,
          name: 'GM',
          role: 'GM'
        },
        userTeamId: 0,
        
        // Game settings
        namesMode: 'fictional',  // 'fictional' or 'real'
        gameMode: 'gm',         // 'gm' or 'career'
        playerRole: 'GM',       // 'GM', 'OC', 'DC'
        onboarded: false,
        
        // Game systems
        freeAgents: [],
        draftClass: [],
        playoffs: null,
        trainingPlan: null,
        pendingOffers: [],
        
        // User interface
        currentView: 'hub',
        theme: 'dark',
        
        // Settings
        settings: {
          autoSave: true,
          difficulty: 'normal',
          simSpeed: 'normal',
          notifications: true,
          sound: false,
          salaryCapEnabled: true,
          allowCoachFiring: true
        },

        // Persistence helpers
        saveSlot: getActiveSaveSlot(),
        
        // Version info and persistence
        version: '4.0.0',
        lastSaved: null,
        created: new Date().toISOString()
      };
      
      console.log('Fresh state created');
      return freshState;
    },
    
    /**
     * Validate that state has all required properties.
     */
    validate(stateObj) {
      if (!stateObj || typeof stateObj !== 'object') {
        return { valid: false, errors: ['State is null or undefined'] };
      }
      
      const errors = [];
      const requiredProps = [
        'namesMode', 'onboarded', 'gameMode', 'playerRole', 'userTeamId', 'version'
      ];
      
      requiredProps.forEach(prop => {
        if (stateObj[prop] === undefined) {
          errors.push(`Missing required property: ${prop}`);
        }
      });
      
      // Basic value validation
      if (!['fictional', 'real'].includes(stateObj.namesMode)) {
        errors.push('Invalid namesMode');
      }
      
      return { valid: errors.length === 0, errors };
    },
    
    /**
     * Migrate old state to current version (handles missing/outdated properties).
     */
    migrate(oldState) {
      if (!oldState) return this.init();
      
      console.log('Migrating state from version:', oldState.version || 'unknown');
      
      const newState = this.init();
      
      // Function to safely copy properties from old to new state
      const safeCopy = (prop, fallback) => {
        if (oldState[prop] !== undefined && oldState[prop] !== null) {
          newState[prop] = oldState[prop];
        } else if (fallback !== undefined) {
          newState[prop] = fallback;
        }
      };
      
      // Copy core properties and systems
      ['league', 'freeAgents', 'playoffs', 'trainingPlan', 'pendingOffers', 'draftClass'].forEach(safeCopy);

      // Copy settings and user data
      safeCopy('namesMode', 'fictional');
      safeCopy('onboarded', false);
      safeCopy('gameMode', 'gm');
      safeCopy('playerRole', 'GM');
      safeCopy('userTeamId', 0);
      safeCopy('currentView', 'hub');
      safeCopy('theme', 'dark');

      if (oldState.player) {
        newState.player = { ...newState.player, ...oldState.player };
      }
      if (oldState.settings) {
        newState.settings = { ...newState.settings, ...oldState.settings };
      }
      
      // Final updates
      newState.version = this.init().version; // Ensure current version
      newState.lastSaved = new Date().toISOString();
      
      console.log('State migration complete');
      return newState;
    },
    
    /**
     * Reset state to initial values.
     */
    reset() {
      console.log('Resetting state...');
      const newState = this.init();
      // Clear all properties on the existing global state object
      Object.keys(global.state).forEach(key => {
        delete global.state[key];
      });
      // Assign new properties
      Object.assign(global.state, newState);
      return global.state;
    }
  };

  // --- Persistence Functions ---
  
  /**
   * Load game state from localStorage, validate, and migrate if necessary.
   * @returns {Object|null} Loaded state or null
   */
  function loadState() {
    try {
      console.log('Loading state...');
      
      const activeSlot = getActiveSaveSlot();
      const activeKey = saveKeyFor(activeSlot);
      let saved = global.localStorage.getItem(activeKey);
      let legacyKeyUsed = false;
      if (!saved) {
        // Migrate legacy single-save key if present
        saved = global.localStorage.getItem(SAVE_KEY_BASE);
        legacyKeyUsed = !!saved;
      }
      if (!saved) {
        console.log('No saved state found');
        return null;
      }
      
      const parsed = JSON.parse(saved);
      const validation = State.validate(parsed);
      
      let loadedState;
      
      if (!validation.valid || parsed.version !== State.init().version) {
        console.warn('Invalid or outdated state found, migrating...', validation.errors);
        loadedState = State.migrate(parsed);
      } else {
        console.log('Valid state loaded');
        loadedState = parsed;
      }
      
      // Overwrite/initialize global state with loaded data
      global.state = global.state || State.init();
      Object.assign(global.state, loadedState, { saveSlot: activeSlot });

      if (legacyKeyUsed) {
        // Re-save into the active slot to migrate forward
        saveState(loadedState);
        try { global.localStorage.removeItem(SAVE_KEY_BASE); } catch (err) { /* ignore */ }
      }

      return global.state;
      
    } catch (error) {
      console.error('Error loading state:', error);
      return null;
    }
  }

  /**
   * Save the entire game state to localStorage.
   * @param {Object} stateToSave - State to save (optional, uses global.state by default)
   * @returns {boolean} Success status
   */
  function saveState(stateToSave = null) {
    try {
      const stateObj = stateToSave || global.state;
      
      if (!stateObj) {
        console.error('No state object available to save');
        return false;
      }
      
      // Update save timestamp
      stateObj.lastSaved = new Date().toISOString();
      
      // Ensure current version is recorded
      if (!stateObj.version) stateObj.version = State.init().version;

      const serialized = JSON.stringify(stateObj);
      const activeSlot = stateObj.saveSlot || getActiveSaveSlot();
      const saveKey = saveKeyFor(activeSlot);
      global.localStorage.setItem(saveKey, serialized);

      
      console.log('State saved successfully');

      if (typeof global.setStatus === 'function') {
        global.setStatus('Game saved');
      }

      return true;

    } catch (error) {
      if (error?.name === 'QuotaExceededError') {
        console.warn('Save failed: storage quota exceeded');
        if (typeof global.setStatus === 'function') {
          global.setStatus('Save failed: storage is full. Please clear a slot and try again.', 'error');
        }
      } else {
        console.error('Error saving state:', error);
      }
      return false;
    }
  }

  /**
   * Clear saved game data from localStorage.
   */
  function clearSavedState() {
    try {
      const slot = getActiveSaveSlot();
      const saveKey = saveKeyFor(slot);
      global.localStorage.removeItem(saveKey);
      console.log('Saved state cleared');
      // Optional: Reset in-memory state after clearing save
      State.reset(); 
    } catch (err) {
      console.error('Error clearing save:', err);
    }
  }
  
  /**
   * Set up an automatic save when the user closes the tab/window.
   */
  function hookAutoSave() {
    // Only hook if setting is enabled, if it exists
    if (!global.state || global.state.settings?.autoSave !== false) {
      global.addEventListener('beforeunload', function () {
        try {
          saveState();
        } catch (err) {
          // swallow; user is leaving anyway
        }
      });
      console.log('Auto-save hook installed');
    }
  }

  function getSaveMetadata(slot) {
    const normalized = normalizeSlot(slot);
    const key = saveKeyFor(normalized);
    const raw = global.localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return {
        slot: normalized,
        lastSaved: parsed.lastSaved || null,
        team: parsed.league?.teams?.[parsed.userTeamId || 0]?.name || null,
        season: parsed.season || 1,
        mode: parsed.namesMode || 'fictional'
      };
    } catch (err) {
      console.warn('Could not parse save metadata for slot', normalized, err);
      return null;
    }
  }

  function listSaveSlots() {
    const slots = [];
    for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
      slots.push(getSaveMetadata(i));
    }
    return slots;
  }

  // --- UI/Helper Functions (Moved from original state.js) ---

  /**
   * Get current team based on user selection
   */
  function currentTeam() {
    const L = global.state.league;
    if (!L || !L.teams) return null;
    
    const teamId = global.state.userTeamId || global.state.player?.teamId || 0;
    return L.teams[teamId] || null;
  }

  /**
   * Get teams by conference
   */
  function getTeamsByConference(conference) {
    const L = global.state.league;
    if (!L || !L.teams) return [];
    
    return L.teams.filter(team => team.conf === conference);
  }

  /**
   * Get teams by division
   */
  function getTeamsByDivision(conference, division) {
    const L = global.state.league;
    if (!L || !L.teams) return [];
    
    return L.teams.filter(team => team.conf === conference && team.div === division);
  }



  // --- Initialization and Global Exposure ---

  /**
   * Initialize the global state object if it doesn't exist.
   * Attempt to load a saved game first.
   */
  function initializeGlobalState() {
    if (!global.state) {
      // Try to load state first
      const loaded = loadState(); 
      if (!loaded) {
          console.log('Creating initial global state (no save found)...');
          global.state = State.init();
      }
    } else {
      console.log('Global state already exists, skipping initialization.');
    }
  }

  // 1. Initialize state immediately (attempts load first)
  initializeGlobalState();
  
  // 2. Expose functions globally
  global.State = State;
  global.loadState = loadState;
  global.saveState = saveState;
  global.clearSavedState = clearSavedState;
  global.hookAutoSave = hookAutoSave;
  global.getActiveSaveSlot = getActiveSaveSlot;
  global.setActiveSaveSlot = setActiveSaveSlot;
  global.saveKeyFor = saveKeyFor;
  global.getSaveMetadata = getSaveMetadata;
  global.listSaveSlots = listSaveSlots;
  
  global.currentTeam = currentTeam;
  global.getTeamsByConference = getTeamsByConference;
  global.getTeamsByDivision = getTeamsByDivision;
  
  // Legacy aliases
  global.saveLeague = saveState; // New games should use saveState
  global.loadLeague = loadState; // New games should use loadState
  
  // 3. Install autosave hook
  hookAutoSave();

  // 4. Expose name arrays for generation (if they were not globally defined already)
  global.FIRST_NAMES = global.FIRST_NAMES || FIRST_NAMES;
  global.LAST_NAMES = global.LAST_NAMES || LAST_NAMES;

  console.log('✅ State-Save Manager loaded. Full state persistence is active.');

})(window);
