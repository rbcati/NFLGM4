(function() {
  'use strict';

  const overlay = document.createElement('div');
  overlay.id = 'errorOverlay';
  overlay.className = 'error-overlay hidden';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-live', 'assertive');

  const template = `
    <div class="error-panel">
      <div class="error-header">
        <div>
          <div class="error-title">Something went wrong</div>
          <div class="error-subtitle">This pop-up is only visible to testers. Screenshot it for developers.</div>
        </div>
        <div class="error-actions">
          <button type="button" class="btn" id="errorCopy">Copy details</button>
          <button type="button" class="btn" id="errorClose">Close</button>
        </div>
      </div>
      <div class="error-body">
        <div class="error-meta">
          <div><span class="label">Time:</span> <span id="errorTime"></span></div>
          <div><span class="label">Page:</span> <span id="errorRoute"></span></div>
          <div><span class="label">Last action:</span> <span id="errorAction">Unknown</span></div>
        </div>
        <div class="error-section">
          <div class="label">Message</div>
          <div id="errorMessage" class="error-message"></div>
        </div>
        <div class="error-section">
          <div class="label">Stack Trace</div>
          <pre id="errorStack" class="error-stack"></pre>
        </div>
        <div class="error-section muted small">If a button stopped working, include this pop-up in your screenshot so developers can see the console error.</div>
      </div>
    </div>
  `;

  overlay.innerHTML = template;
  document.body.appendChild(overlay);

  const stackEl = overlay.querySelector('#errorStack');
  const messageEl = overlay.querySelector('#errorMessage');
  const timeEl = overlay.querySelector('#errorTime');
  const routeEl = overlay.querySelector('#errorRoute');
  const actionEl = overlay.querySelector('#errorAction');
  const closeBtn = overlay.querySelector('#errorClose');
  const copyBtn = overlay.querySelector('#errorCopy');

  let lastAction = 'None recorded yet';

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button) {
      const label = button.innerText?.trim() || button.ariaLabel || button.id || 'Unnamed button';
      lastAction = `Clicked: ${label}`;
    }
  }, { capture: true });

  function formatError(details) {
    const now = new Date();
    const stack = (details.stack || '').toString().trim();
    stackEl.textContent = stack || 'No stack trace available';
    messageEl.textContent = details.message || 'Unknown error';
    timeEl.textContent = now.toLocaleString();
    routeEl.textContent = window.location.hash || '/';
    actionEl.textContent = lastAction;
  }

  function copyErrorDetails() {
    const content = [
      `Message: ${messageEl.textContent}`,
      `Route: ${routeEl.textContent}`,
      `Last action: ${actionEl.textContent}`,
      `Time: ${timeEl.textContent}`,
      'Stack:',
      stackEl.textContent
    ].join('\n');

    navigator.clipboard?.writeText(content).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy details'; }, 1200);
    }).catch(() => {
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => { copyBtn.textContent = 'Copy details'; }, 1200);
    });
  }

  function showOverlay(details) {
    formatError(details);
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  closeBtn.addEventListener('click', hideOverlay);
  copyBtn.addEventListener('click', copyErrorDetails);

  window.addEventListener('error', (event) => {
    const info = {
      message: event?.message,
      stack: event?.error?.stack || `${event.filename || ''}:${event.lineno || ''}`
    };
    showOverlay(info);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason || {};
    const info = {
      message: reason.message || 'Unhandled promise rejection',
      stack: reason.stack || JSON.stringify(reason, null, 2)
    };
    showOverlay(info);
  });

  window.showTesterError = showOverlay;
})();
