/* Resolve before painting, then remember an explicit visitor choice. */
(() => {
  'use strict';
  const root = document.documentElement;
  const preference = matchMedia('(prefers-color-scheme: dark)');
  const key = 'axelconflux-theme';
  let choice;
  try { choice = localStorage.getItem(key); } catch (_) { /* Storage can be unavailable. */ }
  if (!['light', 'dark'].includes(choice)) choice = null;

  function apply() {
    root.dataset.theme = choice || (preference.matches ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('site:themechange', { detail: root.dataset.theme }));
  }
  apply();
  preference.addEventListener('change', () => { if (!choice) apply(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    choice = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    apply();
  });
  function init() {
    const header = document.querySelector('header.header');
    if (!header) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.innerHTML = '<svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 13.2A9 9 0 0 1 10.8 3.3 9 9 0 1 0 20.7 13.2Z"/></svg>';
    header.append(button);
    function update() {
      const dark = root.dataset.theme === 'dark';
      const label = dark ? '切换到浅色模式' : '切换到深色模式';
      button.setAttribute('aria-label', label);
      button.title = label;
      button.setAttribute('aria-pressed', String(dark));
      // Keep the comments iframe in sync without reloading or losing drafts.
      const comments = document.querySelector('iframe.utterances-frame');
      comments?.contentWindow.postMessage({ type: 'set-theme', theme: dark ? 'github-dark' : 'github-light' }, 'https://utteranc.es');
    }
    button.addEventListener('click', () => {
      choice = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, choice); } catch (_) { /* In-memory choice still works. */ }
      apply();
    });
    window.addEventListener('site:themechange', update);
    // Utterances loads lazily. Update its initial theme when its iframe arrives.
    const container = document.querySelector('.utterances-container');
    if (container) {
      container.addEventListener('load', update, true);
      new MutationObserver(update).observe(container, { childList: true });
    }
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
