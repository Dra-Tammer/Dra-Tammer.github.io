(() => {
    'use strict';
    const cities = window.FOOTPRINT_CITIES.map(([lat, lng, city, province, adcode], index) => ({ lat, lng, city, province, adcode, index }));
    const data = window.FOOTPRINT_MAP;
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    const hitContext = document.createElement('canvas').getContext('2d');
    const tip = document.getElementById('mapTip');
    const visited = new Set(cities.map(city => city.adcode));
    const visitedProvinces = new Set(cities.map(city => Math.floor(city.adcode / 10000) * 10000));
    // Start with province boundaries; show city boundaries after enlarging by 80%.
    const CITY_DETAIL_ZOOM = 1.8;
    const municipalities = new Set([110000, 120000, 310000, 500000, 810000, 820000]);
    const project = (lng, lat) => ({ x: lng, y: -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI });

    // GeoJSON -> native Canvas paths. All rings, including islands and holes, are preserved.
    function makeRegion(region) {
        const shape = new Path2D();
        const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
        const polygons = region.geometry.type === 'Polygon' ? [region.geometry.coordinates] : region.geometry.coordinates;
        for (const polygon of polygons) {
            for (const ring of polygon) {
                ring.forEach(([lng, lat], index) => {
                    const p = project(lng, lat);
                    if (index === 0) shape.moveTo(p.x, p.y); else shape.lineTo(p.x, p.y);
                    bounds.left = Math.min(bounds.left, p.x); bounds.right = Math.max(bounds.right, p.x);
                    bounds.top = Math.min(bounds.top, p.y); bounds.bottom = Math.max(bounds.bottom, p.y);
                });
                shape.closePath();
            }
        }
        return { ...region, shape, bounds, visited: visited.has(region.adcode) || (municipalities.has(region.parent) && visited.has(region.parent)) };
    }
    const provinces = data.provinces.map(makeRegion);
    provinces.forEach(province => { province.visited = visitedProvinces.has(province.adcode); });
    const regions = data.cities.map(makeRegion);
    const countryBounds = { left: 73, right: 136, top: project(0, 54.5).y, bottom: project(0, 17.5).y };
    let width = 1, height = 1, fit = 1, dpr = 1;
    let zoom = 1, panX = 0, panY = 0;
    let selected = null, selectedRegion = null, hovered = null;
    let renderFrame = 0;
    const pointer = { id: null, down: false, moved: false, x: 0, y: 0, panX: 0, panY: 0 };
    const midpoint = { x: (countryBounds.left + countryBounds.right) / 2, y: (countryBounds.top + countryBounds.bottom) / 2 };

    function toScreen(p) {
        return { x: width / 2 + panX + (p.x - midpoint.x) * fit * zoom, y: height / 2 + panY + (p.y - midpoint.y) * fit * zoom };
    }
    function toWorld(x, y) {
        return { x: midpoint.x + (x - width / 2 - panX) / (fit * zoom), y: midpoint.y + (y - height / 2 - panY) / (fit * zoom) };
    }
    function visible(region) {
        const a = toScreen({ x: region.bounds.left, y: region.bounds.top });
        const b = toScreen({ x: region.bounds.right, y: region.bounds.bottom });
        return a.x < width && b.x > 0 && a.y < height && b.y > 0;
    }
    function requestDraw() {
        if (!renderFrame) renderFrame = requestAnimationFrame(() => { renderFrame = 0; draw(); });
    }
    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2 + panX, height / 2 + panY);
        ctx.scale(fit * zoom, fit * zoom);
        ctx.translate(-midpoint.x, -midpoint.y);
        for (const region of provinces) {
            if (!visible(region)) continue;
            const active = selectedRegion === region || hovered === region;
            ctx.fillStyle = active ? '#466a7e' : (zoom < CITY_DETAIL_ZOOM && region.visited ? '#315d73' : '#192f43');
            ctx.fill(region.shape, 'evenodd');
        }
        for (const region of zoom >= CITY_DETAIL_ZOOM ? regions : []) {
            if (!visible(region)) continue;
            const active = selectedRegion === region || hovered === region;
            ctx.fillStyle = active ? '#466a7e' : (region.visited ? '#315d73' : '#192f43');
            ctx.fill(region.shape, 'evenodd');
            ctx.lineWidth = .65 / (fit * zoom);
            ctx.strokeStyle = zoom > 2 ? 'rgba(164, 198, 218, .50)' : 'rgba(164, 198, 218, .28)';
            ctx.stroke(region.shape);
        }
        // Province boundaries remain visible at both levels.
        ctx.lineWidth = .8 / (fit * zoom);
        ctx.strokeStyle = 'rgba(181, 211, 230, .48)';
        for (const province of provinces) if (visible(province)) ctx.stroke(province.shape);
        ctx.restore();
        for (const city of cities) {
            const p = toScreen(project(city.lng, city.lat));
            if (p.x < -12 || p.x > width + 12 || p.y < -12 || p.y > height + 12) continue;
            const active = city === selected || city === hovered;
            ctx.beginPath(); ctx.arc(p.x, p.y, active ? 9 : 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ff806822'; ctx.fill();
            ctx.beginPath(); ctx.arc(p.x, p.y, active ? 4.5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = active ? '#ffd08b' : '#ff8068'; ctx.fill();
            ctx.lineWidth = 1.3; ctx.strokeStyle = '#fff0da'; ctx.stroke();
        }
    }
    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = Math.max(1, rect.width); height = Math.max(1, rect.height);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        fit = Math.min((width - 32) / (countryBounds.right - countryBounds.left), (height - 32) / (countryBounds.bottom - countryBounds.top));
        hideTip(); requestDraw();
    }
    function hideTip() { tip.hidden = true; hovered = null; }
    function showTip(name, x, y) {
        tip.textContent = name; tip.hidden = false;
        const box = tip.getBoundingClientRect();
        tip.style.left = Math.max(8, Math.min(width - box.width - 8, x + 12)) + 'px';
        tip.style.top = Math.max(8, Math.min(height - box.height - 8, y - box.height - 12)) + 'px';
    }
    function zoomAt(factor, x = width / 2, y = height / 2) {
        const next = Math.max(.75, Math.min(24, zoom * factor));
        const ratio = next / zoom;
        panX = x - width / 2 - (x - width / 2 - panX) * ratio;
        panY = y - height / 2 - (y - height / 2 - panY) * ratio;
        zoom = next; hideTip(); requestDraw();
    }
    function pick(x, y) {
        let nearest = null, distance = 12;
        for (const city of cities) {
            const p = toScreen(project(city.lng, city.lat));
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < distance) { distance = d; nearest = city; }
        }
        if (nearest) return nearest;
        const p = toWorld(x, y);
        const visibleRegions = zoom >= CITY_DETAIL_ZOOM ? regions : provinces;
        return visibleRegions.find(region => p.x >= region.bounds.left && p.x <= region.bounds.right && p.y >= region.bounds.top && p.y <= region.bounds.bottom && hitContext.isPointInPath(region.shape, p.x, p.y, 'evenodd')) || null;
    }
    function setSelection(item) {
        selected = item && 'city' in item ? item : null;
        selectedRegion = item && 'shape' in item ? item : null;
        requestDraw();
    }
    document.getElementById('cityCount').textContent = cities.length;
    document.getElementById('provinceCount').textContent = visitedProvinces.size;
    document.getElementById('zoomIn').addEventListener('click', () => zoomAt(1.4));
    document.getElementById('zoomOut').addEventListener('click', () => zoomAt(1 / 1.4));
    canvas.addEventListener('wheel', event => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
        zoomAt(Math.exp(-Math.max(-200, Math.min(200, pixels)) * .0025), event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: false });
    canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0 || pointer.down) return;
        Object.assign(pointer, { id: event.pointerId, down: true, moved: false, x: event.clientX, y: event.clientY, panX, panY });
        hideTip(); canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', event => {
        if (pointer.down && event.pointerId !== pointer.id) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        if (pointer.down) {
            const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
            if (Math.hypot(dx, dy) > 4) pointer.moved = true;
            if (pointer.moved) { panX = pointer.panX + dx; panY = pointer.panY + dy; }
        } else {
            hovered = pick(x, y);
            canvas.style.cursor = hovered ? 'pointer' : 'grab';
            if (hovered) showTip(hovered.city || hovered.name, x, y); else hideTip();
        }
        requestDraw();
    });
    canvas.addEventListener('pointerup', event => {
        if (pointer.id !== event.pointerId) return;
        pointer.down = false; canvas.style.cursor = 'grab';
        if (!pointer.moved) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left, y = event.clientY - rect.top;
            const item = pick(x, y); setSelection(item);
            if (item) showTip(item.city || item.name, x, y);
        }
    });
    canvas.addEventListener('pointercancel', event => { if (event.pointerId === pointer.id) { pointer.down = false; canvas.style.cursor = 'grab'; hideTip(); requestDraw(); } });
    canvas.addEventListener('pointerleave', () => { hideTip(); requestDraw(); });
    window.addEventListener('resize', resize);
    resize();
})();
