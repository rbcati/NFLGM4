// navbar-fix.js - Complete navigation system fix
'use strict';

(function() {
  console.log('🧭 Loading complete navigation fix...');

  // Enhanced router function
  function fixedRouter() {
    const path = location.hash || '#/hub';
    const viewName = path.slice(2);
    
    console.log('🧭 Routing to:', viewName, 'from path:', path);
    
    // Hide all views first
    document.querySelectorAll('.view').forEach(view => {
      view.hidden = true;
      view.style.display = 'none';
    });
    
    // Show target view
    const targetView = document.getElementById(viewName);
    if (targetView) {
      targetView.hidden = false;
      targetView.style.display = 'block';
      console.log('✅ Showing view:', viewName);
    } else {
      console.warn('⚠️ View not found:', viewName, 'falling back to hub');
      // Fallback to hub if view not found
      const hubView = document.getElementById('hub');
      if (hubView) {
        hubView.hidden = false;
        hubView.style.display = 'block';
      }
    }
    
    // Update navigation active states
    document.querySelectorAll('.nav-pill').forEach(pill => {
      const href = pill.getAttribute('href');
      const isActive = href === path;
      
      // Remove all active classes and attributes
      pill.classList.remove('active');
      pill.removeAttribute('aria-current');
      
      // Add active state to current page
      if (isActive) {
        pill.classList.add('active');
        pill.setAttribute('aria-current', 'page');
      }
    });
    
    // Only render content if game is ready
    if (!state.league || !state.onboarded) {
      console.log('Game not ready, skipping content rendering');
      return;
    }
    
    // Render view-specific content
    setTimeout(() => {
      try {
        switch(viewName) {
          case 'hub':
            if (window.renderHub) {
              window.renderHub();
              console.log('✅ Hub rendered');
            }
            break;
          case 'roster':
            if (window.renderRoster) {
              window.renderRoster();
              console.log('✅ Roster rendered');
            }
            break;
          case 'standings':
            if (window.renderStandingsPage) {
              window.renderStandingsPage();
              console.log('✅ Standings rendered');
            } else if (window.renderStandings) {
              window.renderStandings();
              console.log('✅ Standings (legacy) rendered');
            }
            break;
          case 'freeagency':
            if (window.renderFreeAgency) {
              window.renderFreeAgency();
              console.log('✅ Free Agency rendered');
            }
            break;
          case 'draft':
          case 'scouting':
            if (window.renderDraft) {
              window.renderDraft();
              console.log('✅ Draft/Scouting rendered');
            }
            break;
          case 'trade':
            if (window.renderTradeCenter) {
              window.renderTradeCenter();
              console.log('✅ Trade center rendered');
            } else if (window.renderTrade) {
              window.renderTrade();
              console.log('✅ Trade (legacy) rendered');
            }
            break;
          case 'coaching':
            if (window.renderCoachingStats) {
              window.renderCoachingStats();
              console.log('✅ Coaching rendered');
            }
            break;
          case 'settings':
            renderSettings();
            console.log('✅ Settings rendered');
            break;
          case 'hallOfFame':
            if (window.renderHallOfFame) {
              window.renderHallOfFame();
              console.log('✅ Hall of Fame rendered');
            }
            break;
          default:
            console.log('No specific renderer for view:', viewName);
        }
      } catch (error) {
        console.error('Error rendering view:', viewName, error);
      }
    }, 50);
  }
  
  // Basic settings renderer
  function renderSettings() {
    const settingsView = document.getElementById('settings');
    if (settingsView && !settingsView.dataset.rendered) {
      settingsView.innerHTML = `
        <div class="card">
          <h2>Settings</h2>
          <div class="section">
            <label for="settingsYear">Current Season</label>
            <input type="number" id="settingsYear" value="${state.league?.year || 2025}" readonly>
          </div>
          <div class="section">
            <label>Game Mode</label>
            <p>${state.gameMode === 'gm' ? 'General Manager' : 'Career Mode'}</p>
          </div>
          <div class="section">
            <label>Your Role</label>
            <p>${state.playerRole || 'GM'}</p>
          </div>
          <div class="section">
            <label>Team Names</label>
            <p>${state.namesMode === 'real' ? 'Real NFL Teams' : 'Fictional Teams'}</p>
          </div>
          <div class="section">
            <button id="btnResetGame" class="btn danger">Reset Game</button>
          </div>
        </div>
      `;
      
      // Add reset functionality
      const resetBtn = document.getElementById('btnResetGame');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
            localStorage.clear();
            location.reload();
          }
        });
      }
      
      settingsView.dataset.rendered = 'true';
    }
  }
  
  // Enhanced navigation click handler
  function setupNavigation() {
    console.log('🔧 Setting up enhanced navigation...');
    
    // Remove existing hash change listeners
    window.removeEventListener('hashchange', window.router);
    window.removeEventListener('hashchange', fixedRouter);
    
    // Add new hash change listener
    window.addEventListener('hashchange', fixedRouter);
    
    // Enhanced click handling for navigation
    document.addEventListener('click', function(e) {
      // Handle nav pill clicks
      if (e.target.classList.contains('nav-pill')) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        
        if (href && href.startsWith('#/')) {
          console.log('🖱️ Nav click:', href);
          
          // Immediately update hash (this will trigger hashchange)
          location.hash = href;
        }
        return;
      }
      
      // Handle any other navigation links
      if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#/')) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        location.hash = href;
      }
    });
    
    console.log('✅ Enhanced navigation set up');
  }
  
  // Fix navigation visibility and styling
  function fixNavigationStyles() {
    console.log('🎨 Fixing navigation styles...');
    
    const navCSS = `
      /* Enhanced Navigation Styles */
      .topbar {
        position: sticky !important;
        top: 0 !important;
        z-index: 100 !important;
        display: grid !important;
        grid-template-columns: auto 1fr auto !important;
        align-items: center !important;
        padding: var(--space-4) var(--space-6) !important;
        background: rgba(22, 27, 34, 0.95) !important;
        backdrop-filter: blur(20px) !important;
        border-bottom: 1px solid var(--hairline) !important;
      }
      
      .brand {
        font-weight: 700 !important;
        font-size: var(--text-xl) !important;
        background: linear-gradient(135deg, var(--accent), var(--accent-hover)) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      
      .nav-pills {
        display: flex !important;
        gap: var(--space-2) !important;
        justify-content: center !important;
        background: var(--surface) !important;
        border-radius: var(--radius-pill) !important;
        padding: var(--space-1) !important;
        border: 1px solid var(--hairline) !important;
      }
      
      .nav-pill {
        display: inline-flex !important;
        align-items: center !important;
        gap: var(--space-2) !important;
        height: 36px !important;
        padding: 0 var(--space-4) !important;
        border-radius: var(--radius-pill) !important;
        color: var(--text-muted) !important;
        text-decoration: none !important;
        font-weight: 500 !important;
        font-size: var(--text-sm) !important;
        transition: all var(--dur) var(--ease) !important;
        cursor: pointer !important;
        user-select: none !important;
      }
      
      .nav-pill:hover {
        color: var(--text) !important;
        background: rgba(255, 255, 255, 0.05) !important;
        transform: translateY(-1px) !important;
      }
      
      .nav-pill.active,
      .nav-pill[aria-current="page"] {
        color: white !important;
        background: linear-gradient(135deg, var(--accent), var(--accent-hover)) !important;
        box-shadow: var(--shadow-sm) !important;
        transform: none !important;
      }
      
      .nav-pill.active:hover,
      .nav-pill[aria-current="page"]:hover {
        transform: none !important;
        filter: brightness(1.1) !important;
      }
      
      /* Mobile navigation toggle - hide by default */
      .nav-toggle {
        display: none !important;
      }
      
      @media (max-width: 1024px) {
        .nav-pills {
          flex-wrap: wrap !important;
          justify-content: flex-start !important;
        }
        
        .nav-pill {
          font-size: 0.875rem !important;
          padding: 0 var(--space-3) !important;
        }
      }
      
      @media (max-width: 768px) {
        .topbar {
          grid-template-columns: 1fr !important;
          gap: var(--space-4) !important;
          text-align: center !important;
        }
        
        .nav-pills {
          order: 2 !important;
          width: 100% !important;
        }
        
        .brand {
          order: 1 !important;
        }
      }
      
      /* Ensure views are properly styled */
      .view {
        display: none !important;
      }
      
      .view:not([hidden]) {
        display: block !important;
      }
      
      /* Fix any z-index issues */
      .modal {
        z-index: 1000 !important;
      }
      
      .topbar {
        z-index: 100 !important;
      }
    `;
    
    // Inject CSS
    const styleEl = document.createElement('style');
    styleEl.id = 'enhanced-nav-styles';
    styleEl.textContent = navCSS;
    
    // Remove old style if exists
    const oldStyle = document.getElementById('enhanced-nav-styles');
    if (oldStyle) oldStyle.remove();
    
    document.head.appendChild(styleEl);
    console.log('✅ Navigation styles fixed');
  }
  
  // Fix the navigation HTML structure if needed
  function fixNavigationHTML() {
    console.log('🔧 Checking navigation HTML...');
    
    const nav = document.querySelector('#site-nav');
    if (!nav) {
      console.warn('Navigation element not found');
      return;
    }
    
    // Ensure all nav pills have correct attributes
    nav.querySelectorAll('.nav-pill').forEach(pill => {
      if (!pill.getAttribute('href')) {
        const view = pill.dataset.view;
        if (view) {
          pill.setAttribute('href', `#/${view}`);
        }
      }
    });
    
    // Add missing navigation items if needed
    const expectedNavItems = [
      { href: '#/hub', text: 'Home', view: 'hub' },
      { href: '#/roster', text: 'Roster', view: 'roster' },
      { href: '#/trade', text: 'Trades', view: 'trade' },
      { href: '#/standings', text: 'Standings', view: 'standings' },
      { href: '#/freeagency', text: 'Free Agency', view: 'freeagency' },
      { href: '#/draft', text: 'Draft', view: 'draft' },
      { href: '#/scouting', text: 'Scouting', view: 'scouting' },
      { href: '#/settings', text: 'Settings', view: 'settings' }
    ];
    
    expectedNavItems.forEach(item => {
      const existingLink = nav.querySelector(`[href="${item.href}"]`);
      if (!existingLink) {
        console.log('Adding missing nav item:', item.text);
        const newLink = document.createElement('a');
        newLink.href = item.href;
        newLink.className = 'nav-pill';
        newLink.dataset.view = item.view;
        newLink.textContent = item.text;
        nav.appendChild(newLink);
      }
    });
    
    console.log('✅ Navigation HTML checked and fixed');
  }
  
  // Main initialization function
  function initializeNavigationFix() {
    console.log('🚀 Initializing complete navigation fix...');
    
    // Fix HTML structure
    fixNavigationHTML();
    
    // Fix CSS styles
    fixNavigationStyles();
    
    // Set up enhanced event handling
    setupNavigation();
    
    // Override the global router
    window.router = fixedRouter;
    
    // Initial route
    setTimeout(() => {
      console.log('🎯 Running initial route...');
      fixedRouter();
    }, 100);
    
    console.log('✅ Complete navigation fix initialized');
  }
  
  // Diagnostic function
  function diagnoseNavigation() {
    console.log('🔍 Navigation Diagnostic');
    console.log('========================');
    
    const nav = document.querySelector('#site-nav');
    const pills = document.querySelectorAll('.nav-pill');
    const views = document.querySelectorAll('.view');
    
    console.log('Navigation container found:', !!nav);
    console.log('Navigation pills found:', pills.length);
    console.log('Views found:', views.length);
    
    console.log('Navigation pills:');
    pills.forEach((pill, i) => {
      const href = pill.getAttribute('href');
      const text = pill.textContent;
      const active = pill.getAttribute('aria-current') === 'page' || pill.classList.contains('active');
      console.log(`  ${i + 1}. "${text}" -> ${href} ${active ? '(ACTIVE)' : ''}`);
    });
    
    console.log('Views:');
    views.forEach((view, i) => {
      const id = view.id;
      const hidden = view.hidden;
      const display = view.style.display;
      const visible = !hidden && display !== 'none';
      console.log(`  ${i + 1}. #${id} - Hidden: ${hidden}, Display: ${display}, Visible: ${visible}`);
    });
    
    console.log('Current hash:', location.hash);
    console.log('========================');
  }
  
  // Expose functions globally for debugging
  window.fixNavigation = initializeNavigationFix;
  window.diagnoseNavigation = diagnoseNavigation;
  window.fixedRouter = fixedRouter;
