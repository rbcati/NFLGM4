// main.js - Fixed Initialization
;(function () {
  'use strict';

  console.log('Main.js loading...');

  function refreshAll() {
    console.log('Refreshing all views...');
    try {
      if (window.fillTeamSelect) {
        const userTeamSelect = document.getElementById('userTeam');
        if (userTeamSelect) {
          window.fillTeamSelect(userTeamSelect);
          if (state.userTeamId !== undefined) {
            userTeamSelect.value = String(state.userTeamId);
          }
        }
      }

      if (window.rebuildTeamLabels) {
        window.rebuildTeamLabels(state.namesMode);
      }

      // Render all views
      if (window.renderHub) window.renderHub();
      if (window.renderRoster) window.renderRoster();
      if (window.renderStandings) window.renderStandings();
      if (window.renderDraft) window.renderDraft();
      if (window.updateCapSidebar) window.updateCapSidebar();
      
      console.log('All views refreshed successfully');
    } catch (error) {
      console.error('Error refreshing views:', error);
    }
  }

  function saveGame() {
    console.log('Saving game...');
    try {
      const C = window.Constants;
      const saveKey = C?.GAME_CONFIG?.SAVE_KEY || 'nflGM4.league';
      
      const payload = JSON.stringify({
        league: state.league,
        freeAgents: state.freeAgents,
        playoffs: state.playoffs,
        namesMode: state.namesMode,
        onboarded: state.onboarded,
        pendingOffers: state.pendingOffers,
        userTeamId: state.userTeamId,
        gameMode: state.gameMode,
        playerRole: state.playerRole,
        draftClass: state.draftClass,
        trainingPlan: state.trainingPlan,
        version: '1.0',
        timestamp: Date.now()
      });
      
      localStorage.setItem(saveKey, payload);
      window.setStatus('Game saved successfully');
      console.log('Game saved successfully');
    } catch (error) {
      console.error('Error saving game:', error);
      window.setStatus('Error saving game');
    }
  }

  function loadGame() {
    console.log('Loading game...');
    try {
      const C = window.Constants;
      const saveKey = C?.GAME_CONFIG?.SAVE_KEY || 'nflGM4.league';
      const raw = localStorage.getItem(saveKey);
      
      if (!raw) { 
        window.setStatus('No saved game found'); 
        return false;
      }
      
      let obj = {};
      try { 
        obj = JSON.parse(raw) || {}; 
      } catch (e) { 
        console.error('Error parsing saved data:', e);
        window.setStatus('Error loading saved game - corrupted data');
        return false;
      }
      
      // Load saved data with fallbacks
      state.league = obj.league || null;
      state.freeAgents = obj.freeAgents || [];
      state.playoffs = obj.playoffs || null;
      state.namesMode = obj.namesMode || 'fictional';
      state.onboarded = !!obj.onboarded;
      state.pendingOffers = obj.pendingOffers || [];
      state.userTeamId = obj.userTeamId !== undefined ? obj.userTeamId : 0;
      state.gameMode = obj.gameMode || 'gm';
      state.playerRole = obj.playerRole || 'GM';
      state.draftClass = obj.draftClass || [];
      state.trainingPlan = obj.trainingPlan || null;
      
      // Validate loaded data
      if (state.league && state.league.teams) {
        console.log(`Loaded league: Year ${state.league.year}, Week ${state.league.week}`);
        refreshAll();
        window.setStatus('Game loaded successfully');
        return true;
      } else {
        console.warn('Invalid league data in save file');
        state.onboarded = false;
        return false;
      }
    } catch (error) {
      console.error('Error loading game:', error);
      window.setStatus('Error loading game');
      state.onboarded = false;
      return false;
    }
  }

  function checkDependencies() {
    const requiredObjects = [
      'Constants', 'Teams', 'Utils', 'makeLeague', 'listByMode', 
      'show', 'setStatus', 'openOnboard', 'closeOnboard'
    ];
    
    const missing = [];
    requiredObjects.forEach(obj => {
      if (!window[obj]) {
        missing.push(obj);
      }
    });
    
    if (missing.length > 0) {
      console.error('Missing required objects:', missing);
      return false;
    }
    
    return true;
  }

  function initializeNewGame() {
    console.log('Initializing new game...');
    
    // Reset state to defaults
    state.league = null;
    state.freeAgents = [];
    state.playoffs = null;
    state.namesMode = 'fictional';
    state.onboarded = false;
    state.pendingOffers = [];
    state.userTeamId = 0;
    state.gameMode = 'gm';
    state.playerRole = 'GM';
    state.draftClass = [];
    state.trainingPlan = null;
    
    // Show onboarding modal
    window.openOnboard();
  }

  function init() {
    console.log('Initializing game...');
    
    // Wait for all dependencies to load
    let checkCount = 0;
    const maxChecks = 50; // 5 seconds max wait time
    
    function waitForDependencies() {
      checkCount++;
      
      if (checkDependencies()) {
        console.log('All dependencies loaded, proceeding with initialization');
        proceedWithInit();
      } else if (checkCount < maxChecks) {
        console.log(`Waiting for dependencies... (${checkCount}/${maxChecks})`);
        setTimeout(waitForDependencies, 100);
      } else {
        console.error('Timeout waiting for dependencies');
        document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Game failed to load properly. Please refresh the page.</div>';
      }
    }
    
    waitForDependencies();
  }

  function proceedWithInit() {
    try {
      // Set up event listeners
      if (window.setupEventListeners) {
        window.setupEventListeners();
      }

      // Try to load existing save
      const C = window.Constants;
      const saveKey = C?.GAME_CONFIG?.SAVE_KEY || 'nflGM4.league';
      const savedState = localStorage.getItem(saveKey);
      
      if (savedState) {
        console.log('Found saved game, attempting to load...');
        try {
          const parsed = JSON.parse(savedState);
          if (parsed && parsed.onboarded && parsed.league) {
            console.log('Valid save found, loading...');
            if (loadGame()) {
              // Successfully loaded, go to hub
              const hash = location.hash.replace('#/','') || 'hub';
              const validRoutes = C?.GAME_CONFIG?.ROUTES || 
                                 ['hub','roster','cap','schedule','standings','trade','freeagency','draft','playoffs','settings', 'hallOfFame', 'scouting'];
              const route = validRoutes.indexOf(hash) >= 0 ? hash : 'hub';
              window.show(route);
              console.log('Game loaded and UI initialized');
              return;
            }
          }
        } catch (e) {
          console.warn('Error parsing saved game:', e);
        }
      }
      
      // No valid save found, start new game
      console.log('No valid save found, starting new game...');
      initializeNewGame();
      
    } catch (error) {
      console.error('Error in init:', error);
      document.body.innerHTML = '<div style="padding: 20px; color: red;">Error initializing game: ' + error.message + '</div>';
    }
  }

  // Make functions globally available
  window.saveGame = saveGame;
  window.loadGame = loadGame;
  window.refreshAll = refreshAll;
  window.initializeNewGame = initializeNewGame;

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM is already ready
    init();
  }

  console.log('Main.js loaded');
})();
