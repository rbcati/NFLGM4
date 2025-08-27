// troubleshoot-teams.js - Run this in console to fix team selection issues
'use strict';

(function() {
  console.log('🔧 NFL GM Team Selection Troubleshooter');
  console.log('=====================================');
  
  // Diagnostic function
  window.fixTeamSelection = function() {
    console.log('🔍 Running team selection diagnostic...');
    
    // Step 1: Check if basic objects exist
    console.log('1️⃣ Checking basic objects...');
    console.log('Constants exist:', !!window.Constants);
    console.log('Teams exist:', !!window.Teams);
    console.log('Utils exist:', !!window.Utils);
    
    // Step 2: Check team data
    console.log('2️⃣ Checking team data...');
    if (window.Constants) {
      console.log('Constants.TEAMS_REAL:', window.Constants.TEAMS_REAL?.length || 'missing');
      console.log('Constants.TEAMS_FICTIONAL:', window.Constants.TEAMS_FICTIONAL?.length || 'missing');
    }
    
    if (window.Teams) {
      console.log('Teams.real:', window.Teams.real?.length || 'missing');
      console.log('Teams.fictional:', window.Teams.fictional?.length || 'missing');
      console.log('Teams.TEAM_META_REAL:', window.Teams.TEAM_META_REAL?.length || 'missing');
      console.log('Teams.TEAM_META_FICTIONAL:', window.Teams.TEAM_META_FICTIONAL?.length || 'missing');
    }
    
    // Step 3: Fix missing team data
    console.log('3️⃣ Attempting to fix team data...');
    
    if (!window.Teams) {
      console.log('Creating Teams object...');
      window.Teams = {};
    }
    
    if (window.Constants?.TEAMS_REAL && window.Constants?.TEAMS_FICTIONAL) {
      console.log('Copying team data from Constants...');
      window.Teams.real = window.Constants.TEAMS_REAL;
      window.Teams.fictional = window.Constants.TEAMS_FICTIONAL;
      window.Teams.TEAM_META_REAL = window.Constants.TEAMS_REAL;
      window.Teams.TEAM_META_FICTIONAL = window.Constants.TEAMS_FICTIONAL;
      
      // Also ensure Constants has the expected properties
      window.Constants.TEAM_META_REAL = window.Constants.TEAMS_REAL;
      window.Constants.TEAM_META_FICTIONAL = window.Constants.TEAMS_FICTIONAL;
      
      console.log('✅ Team data fixed!');
    } else {
      console.log('❌ Constants team data missing, creating basic teams...');
      
      // Create basic team data as fallback
      const basicRealTeams = [
        { abbr: 'BUF', name: 'Buffalo Bills', conf: 0, div: 0 },
        { abbr: 'MIA', name: 'Miami Dolphins', conf: 0, div: 0 },
        { abbr: 'NE', name: 'New England Patriots', conf: 0, div: 0 },
        { abbr: 'NYJ', name: 'New York Jets', conf: 0, div: 0 },
        { abbr: 'KC', name: 'Kansas City Chiefs', conf: 0, div: 3 },
        { abbr: 'LAC', name: 'Los Angeles Chargers', conf: 0, div: 3 },
        { abbr: 'DEN', name: 'Denver Broncos', conf: 0, div: 3 },
        { abbr: 'LV', name: 'Las Vegas Raiders', conf: 0, div: 3 }
      ];
      
      const basicFictionalTeams = [
        { abbr: 'BOS', name: 'Boston Minutemen', conf: 0, div: 0 },
        { abbr: 'TOR', name: 'Toronto Huskies', conf: 0, div: 0 },
        { abbr: 'MIA', name: 'Miami Sharks', conf: 0, div: 0 },
        { abbr: 'NJ', name: 'New Jersey Generals', conf: 0, div: 0 },
        { abbr: 'DEN', name: 'Denver Gold', conf: 0, div: 3 },
        { abbr: 'SD', name: 'San Diego Chargers', conf: 0, div: 3 },
        { abbr: 'OAK', name: 'Oakland Invaders', conf: 0, div: 3 },
        { abbr: 'POR', name: 'Portland Beavers', conf: 0, div: 3 }
      ];
      
      // Expand to 32 teams
      while (basicRealTeams.length < 32) {
        const index = basicRealTeams.length;
        basicRealTeams.push({
          abbr: `T${index}`,
          name: `Team ${index + 1}`,
          conf: Math.floor(index / 16),
          div: Math.floor((index % 16) / 4)
        });
      }
      
      while (basicFictionalTeams.length < 32) {
        const index = basicFictionalTeams.length;
        basicFictionalTeams.push({
          abbr: `F${index}`,
          name: `Fictional Team ${index + 1}`,
          conf: Math.floor(index / 16),
          div: Math.floor((index % 16) / 4)
        });
      }
      
      // Set up all the team data
      if (!window.Constants) window.Constants = {};
      window.Constants.TEAMS_REAL = basicRealTeams;
      window.Constants.TEAMS_FICTIONAL = basicFictionalTeams;
      window.Constants.TEAM_META_REAL = basicRealTeams;
      window.Constants.TEAM_META_FICTIONAL = basicFictionalTeams;
      
      window.Teams.real = basicRealTeams;
      window.Teams.fictional = basicFictionalTeams;
      window.Teams.TEAM_META_REAL = basicRealTeams;
      window.Teams.TEAM_META_FICTIONAL = basicFictionalTeams;
      
      console.log('✅ Created basic team data as fallback');
    }
    
    // Step 4: Test listByMode function
    console.log('4️⃣ Testing listByMode function...');
    const fictional = window.listByMode('fictional');
    const real = window.listByMode('real');
    console.log('Fictional teams found:', fictional.length);
    console.log('Real teams found:', real.length);
    
    if (fictional.length > 0 && real.length > 0) {
      console.log('✅ listByMode working correctly');
    } else {
      console.log('❌ listByMode still not working');
      return false;
    }
    
    // Step 5: Test team dropdown population
    console.log('5️⃣ Testing team dropdown...');
    const teamSelect = document.getElementById('onboardTeam');
    if (teamSelect) {
      console.log('Team select found, populating...');
      if (window.populateTeamDropdown) {
        window.populateTeamDropdown('fictional');
        console.log('Team dropdown populated with', teamSelect.options.length, 'options');
        
        if (teamSelect.options.length > 0) {
          console.log('✅ Team dropdown working');
          console.log('Sample teams:', Array.from(teamSelect.options).slice(0, 3).map(o => o.textContent));
        } else {
          console.log('❌ Team dropdown empty');
          return false;
        }
      } else {
        console.log('❌ populateTeamDropdown function not found');
        return false;
      }
    } else {
      console.log('❌ Team select element not found');
    }
    
    // Step 6: Show the modal
    console.log('6️⃣ Opening onboarding modal...');
    if (window.openOnboard) {
      window.openOnboard();
      console.log('✅ Modal opened');
    } else {
      console.log('❌ openOnboard function not found');
    }
    
    console.log('=====================================');
    console.log('🎉 Team selection fix complete!');
    console.log('💡 You should now be able to select teams in the modal');
    
    return true;
  };
  
  // Quick fix function for immediate testing
  window.quickFixTeams = function() {
    console.log('⚡ Quick team selection fix...');
    
    // Force show modal
    const modal = document.getElementById('onboardModal');
    if (modal) {
      modal.hidden = false;
      modal.style.display = 'flex';
    }
    
    // Force populate dropdown
    const teamSelect = document.getElementById('onboardTeam');
    if (teamSelect && window.listByMode) {
      const teams = window.listByMode('fictional');
      teamSelect.innerHTML = '';
      teams.forEach((team, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${team.abbr} — ${team.name}`;
        teamSelect.appendChild(option);
      });
      console.log(`✅ Quick fix complete - ${teams.length} teams loaded`);
    } else {
      console.log('❌ Quick fix failed - elements missing');
    }
  };
  
  // Auto-run the fix
  setTimeout(() => {
    console.log('🚀 Auto-running team selection fix...');
    window.fixTeamSelection();
  }, 500);
  
})();
