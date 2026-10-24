/* Keyboard and dialog enhancements around NexT's existing click handlers. */
(() => {
  'use strict';
  function init() {
    const body = document.body;
    const overlay = document.querySelector('.search-pop-overlay');
    const dialog = overlay?.querySelector('.search-popup');
    const input = dialog?.querySelector('.search-input');
    const close = dialog?.querySelector('.popup-btn-close');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const menu = document.querySelector('.site-nav');
    const menuToggle = document.querySelector('.site-nav-toggle .toggle');
    const mobile = matchMedia('(max-width: 767px)');

    if (overlay) body.append(overlay);
    if (dialog) {
      dialog.id = 'site-search-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', '站内搜索');
      input?.setAttribute('aria-label', '搜索文章');
      close?.setAttribute('aria-label', '关闭搜索');
      document.querySelectorAll('.popup-trigger').forEach(trigger => {
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', dialog.id);
      });
    }
    sidebarToggle?.setAttribute('aria-label', '切换侧栏');
    for (const [panel, toggle, id] of [[sidebar, sidebarToggle, 'site-sidebar'], [menu, menuToggle, 'site-navigation']]) {
      if (!panel || !toggle) continue;
      panel.id ||= id;
      toggle.setAttribute('aria-controls', panel.id);
    }

    document.querySelectorAll('.popup-trigger, .popup-btn-close, .sidebar-toggle, .site-nav-toggle .toggle, .back-to-top').forEach(control => {
      if (control.matches('button, input, a[href]')) return;
      control.tabIndex = 0;
      control.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        control.click();
      });
    });

    let searchOpen = false;
    let returnFocus;
    const blocked = new Map();
    function sync() {
      const open = Boolean(dialog && body.classList.contains('search-active'));
      if (open !== searchOpen) {
        searchOpen = open;
        if (open) {
          returnFocus = document.activeElement;
          input?.focus();
          for (const element of body.children) {
            if (element === overlay || element.matches('script, style, link')) continue;
            blocked.set(element, element.inert);
            element.inert = true;
          }
        } else {
          for (const [element, wasInert] of blocked) element.inert = wasInert;
          blocked.clear();
          if (returnFocus?.isConnected) returnFocus.focus();
        }
      }
      const sidebarOpen = body.classList.contains('sidebar-active');
      if (sidebar) sidebar.inert = open || !sidebarOpen;
      sidebarToggle?.setAttribute('aria-expanded', String(sidebarOpen));
      const menuOpen = !mobile.matches || body.classList.contains('site-nav-on');
      if (menu) menu.inert = open || !menuOpen;
      menuToggle?.setAttribute('aria-expanded', String(menuOpen));
    }
    new MutationObserver(sync).observe(body, { attributes: true, attributeFilter: ['class'] });
    mobile.addEventListener('change', sync);
    sync();

    document.addEventListener('keydown', event => {
      if (!searchOpen || event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('a[href], button, input, [tabindex="0"]')]
        .filter(element => !element.disabled && element.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
