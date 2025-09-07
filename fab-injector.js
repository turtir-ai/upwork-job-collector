(function(){
  try {
    if (!/upwork\.com/i.test(location.hostname)) return;

    const HOST_ID = 'upai-fab-host';

    function setAnalyzeActiveIfPanel(panel) {
      try {
        const tabs = panel.querySelectorAll('.tab-btn');
        const panes = panel.querySelectorAll('.tab-content');
        tabs && tabs.forEach(el => el.classList.remove('active'));
        panes && panes.forEach(el => el.classList.remove('active'));
        const a = panel.querySelector('[data-tab="analyze"]');
        a && a.classList.add('active');
        const pane = panel.querySelector('#analyze-tab');
        pane && pane.classList.add('active');
      } catch (_) {}
    }

    function togglePanel() {
      const panel = document.getElementById('upwork-ai-panel');
      if (panel) {
        const isHidden = (panel.style.display === 'none' || !panel.style.display);
        panel.style.display = isHidden ? 'block' : 'none';
        if (isHidden) setAnalyzeActiveIfPanel(panel);
        return;
      }
      // If panel not present yet, retry shortly and try common fallbacks
      setTimeout(() => {
        const p = document.getElementById('upwork-ai-panel');
        if (p) {
          p.style.display = 'block';
          setAnalyzeActiveIfPanel(p);
        } else {
          const builtInFab = document.getElementById('upwork-ai-floating-button');
          if (builtInFab) builtInFab.click();
          const analyzeBtn = document.getElementById('analyze-job-btn');
          if (analyzeBtn) analyzeBtn.click();
        }
      }, 300);
    }

    function mountFabShadow() {
      if (document.getElementById(HOST_ID)) return;
      const host = document.createElement('div');
      host.id = HOST_ID;
      host.style.position = 'fixed';
      host.style.right = '16px';
      host.style.bottom = '16px';
      host.style.zIndex = '2147483647';
      // Ensure clicks work even if ancestors set pointer-events: none
      host.style.pointerEvents = 'none';

      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `
        :host { all: initial; }
        .fab {
          all: initial;
          pointer-events: auto;
          width: 56px; height: 56px;
          display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          cursor: pointer; user-select: none;
          transition: transform .2s ease;
        }
        .fab:hover { transform: scale(1.06); }
        .icon { width: 24px; height: 24px; fill: currentColor; }
      `;
      const btn = document.createElement('button');
      btn.className = 'fab';
      btn.title = 'Upwork AI Assistant';
      btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1-7.07 2.93A10 10 0 0 1 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
      btn.addEventListener('click', togglePanel);

      shadow.appendChild(style);
      shadow.appendChild(btn);
      document.documentElement.appendChild(host);
    }

    function ensureFab() {
      mountFabShadow();
    }

    function setupSpaGuards() {
      let lastUrl = location.href;
      const checkUrl = () => {
        if (lastUrl !== location.href) {
          lastUrl = location.href;
          // re-ensure after navigation
          setTimeout(ensureFab, 0);
        }
      };
      const wrap = (name) => {
        const orig = history[name];
        history[name] = function(...args){
          const ret = orig.apply(this, args);
          queueMicrotask(checkUrl);
          return ret;
        };
      };
      wrap('pushState');
      wrap('replaceState');
      window.addEventListener('popstate', checkUrl);
      // Fallback: if DOM changes and our host disappeared, recreate it
      const mo = new MutationObserver(() => ensureFab());
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Initial run
    ensureFab();
    setupSpaGuards();
  } catch (_) {}
})();

