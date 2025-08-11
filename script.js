// script.js

;(function () {
  'use strict';

  // Global error handler
  window.addEventListener('error', function (e) {
    try {
      var div = document.createElement('div');
      div.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#3b0d0d;color:#fff;padding:8px 12px;font-family:system-ui;box-shadow:0 2px 6px rgba(0,0,0,.4)';
      div.textContent = 'JS error: ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || '');
      document.body.appendChild(div);
    } catch (_) {}
  });

  // App initialization
  function init() {
    if (localStorage.getItem(state.SAVE_KEY) && JSON.parse(localStorage.getItem(state.SAVE_KEY)).onboarded) {
      loadGame();
    } else {
      openOnboard();
    }
    setupEventListeners();
    const hash = location.hash.replace('#/','') || 'hub';
    show(routes.indexOf(hash) >= 0 ? hash : 'hub');
  }

  // Initial call
  init();

})();
