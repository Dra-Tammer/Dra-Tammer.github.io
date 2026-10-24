/* Resolve the embedded map's theme from the actual blog material. */
(() => {
    'use strict';
    const root = document.documentElement;
    const preference = matchMedia('(prefers-color-scheme: dark)');
    function sync() {
        let dark = preference.matches;
        try {
            if (window.parent !== window) {
                const style = window.parent.getComputedStyle(window.parent.document.documentElement);
                const surface = style.getPropertyValue('--glass-solid').trim();
                const hex = /^#([0-9a-f]{6})$/i.exec(surface);
                if (hex) {
                    const rgb = [0, 2, 4].map(offset => parseInt(hex[1].slice(offset, offset + 2), 16));
                    dark = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 < 128;
                }
                root.dataset.embedded = 'true';
            }
        } catch (_) { /* Standalone and cross-origin embeds use system preference. */ }
        root.dataset.theme = dark ? 'dark' : 'light';
        // A mismatched iframe color scheme can force an opaque browser canvas.
        root.style.colorScheme = root.dataset.theme;
        window.dispatchEvent(new Event('footprint:themechange'));
    }
    preference.addEventListener('change', sync);
    try {
        if (window.parent !== window) {
            // Use the blog's theme event rather than observing another document.
            const parentWindow = window.parent;
            const connect = () => {
                parentWindow.addEventListener('site:themechange', sync);
                sync();
            };
            connect();
            window.addEventListener('pageshow', connect);
            window.addEventListener('pagehide', () => parentWindow.removeEventListener('site:themechange', sync));
        }
    } catch (_) { /* Parent access can be restricted for external embeds. */ }
    sync();
})();
