/* Local, static displacement texture. No page capture or animation loop. */
(() => {
  'use strict';
  const header = document.querySelector('header.header');
  if (!header || !window.ResizeObserver) return;
  const desktop = matchMedia('(min-width: 981px) and (hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
  // SVG backdrop displacement varies by browser. Keep the CSS material elsewhere.
  if (!/Chrome|Chromium|Edg/.test(navigator.userAgent) || /Android/.test(navigator.userAgent)) return;
  if (!CSS.supports('backdrop-filter', 'blur(12px) url("#liquid-nav-refraction")')) return;

  const ns = 'http://www.w3.org/2000/svg';
  const create = (name, attrs) => {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  const svg = create('svg', { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' });
  svg.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden';
  const defs = create('defs', {});
  const filter = create('filter', { id: 'liquid-nav-refraction', x: '0', y: '0', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' });
  const texture = create('feImage', { result: 'displacement', preserveAspectRatio: 'none' });
  const displacement = create('feDisplacementMap', { in: 'SourceGraphic', in2: 'displacement', scale: '18', xChannelSelector: 'R', yChannelSelector: 'G' });
  filter.append(texture, displacement);
  defs.append(filter);
  svg.append(defs);
  document.body.append(svg);

  let frame = 0;
  let previousSize = '';
  function update() {
    frame = 0;
    const enabled = desktop.matches && !reducedMotion.matches && !reducedTransparency.matches;
    header.classList.toggle('liquid-refraction', enabled);
    if (!enabled) return;
    const { width, height } = header.getBoundingClientRect();
    const w = Math.round(width), h = Math.round(height);
    const size = w + ':' + h;
    if (!w || !h || size === previousSize) return;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { header.classList.remove('liquid-refraction'); return; }
    const image = ctx.createImageData(w, h);
    const radius = Math.min(36, h / 2);
    const edge = 14;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x + .5 - w / 2, py = y + .5 - h / 2;
        const qx = Math.abs(px) - (w / 2 - radius);
        const qy = Math.abs(py) - (h / 2 - radius);
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
        const length = Math.hypot(ox, oy);
        const depth = radius - length - Math.min(Math.max(qx, qy), 0);
        let nx = 0, ny = 0;
        if (length > 0) { nx = ox / length * Math.sign(px); ny = oy / length * Math.sign(py); }
        else if (qx > qy) nx = Math.sign(px);
        else ny = Math.sign(py);
        const strength = depth > 0 && depth < edge ? Math.sin(depth / edge * Math.PI) ** 2 * .42 : 0;
        const i = (y * w + x) * 4;
        image.data[i] = Math.round((.5 - nx * strength) * 255);
        image.data[i + 1] = Math.round((.5 - ny * strength) * 255);
        image.data[i + 2] = 128; image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    texture.setAttribute('href', canvas.toDataURL());
    texture.setAttribute('width', w);
    texture.setAttribute('height', h);
    previousSize = size;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  new ResizeObserver(schedule).observe(header);
  desktop.addEventListener('change', schedule);
  reducedMotion.addEventListener('change', schedule);
  reducedTransparency.addEventListener('change', schedule);
  schedule();
})();
