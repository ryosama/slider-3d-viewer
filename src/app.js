(function () {
  'use strict';
  const C = window.Orbite;
  const $ = id => document.getElementById(id);
  let deck, index = 0, angle = 0, radius = 1000, animation = null, zoom = 0, urls = [];
  let noticeTimer;
  function notice(message) {
    $('notice').textContent = message;
    $('notice').classList.add('visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => $('notice').classList.remove('visible'), 6500);
  }
  function theme(config) {
    const map = { 'slide-border-width': ['--border-width', 'border-width'], 'slide-border-color': ['--border-color', 'color'], 'slide-border-radius': ['--border-radius', 'border-radius'], 'slide-background-color': ['--slide-bg', 'color'], 'background-color': ['--page-bg', 'color'], 'text-color': ['--text', 'color'], 'font-face': ['--font', 'font-family'], 'breadcrumb-color': ['--trail', 'color'] };
    for (const [key, [variable, property]] of Object.entries(map)) {
      const value = config[key];
      document.documentElement.style.removeProperty(variable);
      if (CSS.supports(property, value) && !/url\s*\(/i.test(value)) document.documentElement.style.setProperty(variable, value);
    }
    const transparency = /^\d+(?:\.\d+)?%$/.test(config['slide-transparency']) ? parseFloat(config['slide-transparency']) : 10;
    document.documentElement.style.setProperty('--slide-alpha', 1 - C.number(transparency, 10, 0, 100) / 100);
  }
  function camera() { $('world').style.transform = `translateZ(${-radius - zoom}px) rotateY(${-angle}rad)`; }
  function resize() {
    const scale = Math.min(Math.max(.2, ($('viewport').clientWidth - 34) / 760), $('viewport').clientHeight / 520);
    $('scaler').style.transform = `scale(${scale})`;
  }
  function breadcrumbs() {
    const style = deck.config.theme['breadcrumb-style'];
    if (style === 'none' || deck.slides.length < 2) return;
    const count = deck.slides.length;
    const steps = count * 24;
    for (let j = 0; j < steps; j++) {
      const a = j * 2 * Math.PI / steps, b = (j + 1) * 2 * Math.PI / steps;
      const x = radius * Math.sin(a), z = radius * Math.cos(a);
      const dx = radius * Math.sin(b) - x, dz = radius * Math.cos(b) - z;
      const line = document.createElement('div');
      line.className = 'trail';
      line.style.width = `${Math.hypot(dx, dz) + .6}px`;
      line.style.borderTop = `2px ${style === 'plain' ? 'solid' : style} var(--trail)`;
      line.style.transform = `translate3d(${x}px,238px,${z}px) rotateY(${-Math.atan2(dz, dx)}rad)`;
      $('world').append(line);
    }
    for (let j = 0; j < count; j++) {
      const a = j * 2 * Math.PI / count;
      const dot = document.createElement('div');
      dot.className = 'trail-node';
      dot.style.transform = `translate3d(${radius * Math.sin(a) - 3}px,235px,${radius * Math.cos(a)}px)`;
      $('world').append(dot);
    }
  }
  function showDeck(next, label) {
    if (animation) cancelAnimationFrame(animation);
    animation = null; deck = next; index = 0; angle = 0; zoom = 0;
    radius = Math.max(600, deck.slides.length * 130);
    theme(deck.config.theme);
    $('world').replaceChildren(); $('filmstrip').replaceChildren();
    deck.slides.forEach((slide, i) => {
      const card = document.createElement('article');
      card.className = 'slide'; card.tabIndex = -1;
      card.style.transform = `rotateY(${i * 2 * Math.PI / deck.slides.length}rad) translateZ(${radius}px)`;
      card.setAttribute('aria-label', `${i + 1}. ${slide.title}`);
      const meta = document.createElement('div'); meta.className = 'slide-meta';
      const category = document.createElement('span'); category.textContent = label === 'Démo intégrée' ? 'BUREAUX LIBRES / COLLECTION 01' : 'PRÉSENTATION LOCALE';
      const position = document.createElement('span'); position.textContent = `${String(i + 1).padStart(2, '0')} — ${String(deck.slides.length).padStart(2, '0')}`;
      meta.append(category, position); card.append(meta);
      const body = document.createElement('div');
      body.innerHTML = C.markdown(slide.text, { image(path) {
        // Relative images remain local. External images are intentionally not fetched.
        if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) return null;
        return deck.assets[C.resolve(slide.path, path)] || null;
      } });
      body.addEventListener('click', event => {
        const link = event.target.closest('[data-slide-link]');
        if (!link) return;
        event.preventDefault();
        const target = link.dataset.slideLink.split('#')[0];
        const destination = target ? deck.slides.findIndex(s => s.path === C.resolve(slide.path, target)) : i;
        if (destination < 0) notice(`Diapositive introuvable : ${target}`);
        else go(destination, 'another');
      });
      card.append(body); $('world').append(card);
      const tab = document.createElement('button');
      const num = document.createElement('small'); num.textContent = String(i + 1).padStart(2, '0');
      tab.append(num, document.createTextNode(slide.title));
      tab.addEventListener('click', () => go(i, 'another'));
      $('filmstrip').append(tab);
    });
    breadcrumbs(); camera(); resize(); update();

  }
  function update() {
    const title = deck.slides[index].title;
    $('counter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(deck.slides.length).padStart(2, '0')}`;
    $('current-title').textContent = title;
    $('counter').setAttribute('aria-label', `Diapositive ${index + 1} sur ${deck.slides.length} : ${title}`);
    $('counter').setAttribute('aria-live', 'polite');
    $('previous').disabled = index === 0; $('next').disabled = index === deck.slides.length - 1;
    document.querySelectorAll('.slide').forEach((card, i) => { card.classList.toggle('active', i === index); card.inert = i !== index; card.setAttribute('aria-hidden', String(i !== index)); });
    [...$('filmstrip').children].forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
  }
  function go(destination, kind) {
    destination = Math.max(0, Math.min(deck.slides.length - 1, destination));
    if (destination === index) return;
    if (animation) cancelAnimationFrame(animation);
    const from = angle, fromZoom = zoom;
    const to = destination * 2 * Math.PI / deck.slides.length;
    const t = deck.config.transition;
    const style = t[`when-slide-to-${kind}`];
    const outTime = 500 / C.number(t['zoom-out-speed'], 1);
    const inTime = 500 / C.number(t['zoom-in-speed'], 1);
    const travelTime = style === 'follow-breadcrumb' ? Math.max(180, Math.abs(to - from) * 850 / C.number(t['follow-breadcrumb-speed'], 1)) : 450;
    const duration = style === 'follow-breadcrumb' ? travelTime : outTime + travelTime + inTime;
    const peak = 1100 * (C.number(t['zoom-out-ratio'], 1.7, 1, 5) - 1);
    const start = performance.now();
    const ease = x => x * x * (3 - 2 * x);
    index = destination; update();
    function tick(now) {
      const elapsed = Math.min(duration, now - start);
      if (style === 'follow-breadcrumb') {
        const p = ease(elapsed / duration); angle = from + (to - from) * p; zoom = fromZoom * (1 - p);
      } else if (elapsed < outTime) { angle = from; zoom = fromZoom + (peak - fromZoom) * ease(elapsed / outTime); }
      else if (elapsed < outTime + travelTime) { angle = from + (to - from) * ease((elapsed - outTime) / travelTime); zoom = peak; }
      else { angle = to; zoom = peak * (1 - ease((elapsed - outTime - travelTime) / inTime)); }
      camera();
      if (elapsed < duration) animation = requestAnimationFrame(tick);
      else { animation = null; angle = to; zoom = 0; camera(); }
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { angle = to; zoom = 0; animation = null; camera(); }
    else animation = requestAnimationFrame(tick);
  }
  let importVersion = 0;
  async function loadFiles(files, stripRoot) {
    const version = ++importVersion;
    const nextUrls = [];
    try {
      if (!files.length) return;
      const entries = new Map();
      for (const file of files) {
        let path = file.webkitRelativePath || file.name;
        if (stripRoot && path.includes('/')) path = path.slice(path.indexOf('/') + 1);
        path = C.normalize(path);
        if (entries.has(path)) throw new Error(`Nom de fichier en double : ${path}`);
        entries.set(path, file);
      }
      const configFile = entries.get('config.md');
      if (!configFile) throw new Error('Le dossier doit contenir config.md à sa racine.');
      const config = C.parseConfig(await configFile.text());
      if (!config.order.length) throw new Error('La section order de config.md est vide.');
      const unique = new Set();
      const slides = [];
      for (const name of config.order) {
        const path = C.normalize(name);
        if (unique.has(path)) throw new Error(`Diapositive en double dans order : ${path}`);
        unique.add(path);
        if (!/\.md$/i.test(path) || path === 'config.md' || !entries.has(path)) throw new Error(`Diapositive introuvable : ${name}`);
        const text = await entries.get(path).text();
        slides.push({ path, text, title: C.title(text, path) });
      }
      const assets = {};
      for (const [path, file] of entries) {
        if (/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(path)) { const url = URL.createObjectURL(file); nextUrls.push(url); assets[path] = url; }
      }
      if (version !== importVersion) { nextUrls.forEach(URL.revokeObjectURL); return; }
      showDeck({ config, slides, assets }, 'Présentation locale');
      urls.forEach(URL.revokeObjectURL); urls = nextUrls;
      notice(`${slides.length} diapositives chargées. Tout reste sur cet appareil.`);
    } catch (error) { nextUrls.forEach(URL.revokeObjectURL); if (version === importVersion) notice(error.message); }
  }
  function reset() {
    importVersion++;
    showDeck({ ...window.ORBITE_DEMO, config: C.parseConfig(window.ORBITE_DEMO.config) }, window.ORBITE_DEMO.label || 'Démo intégrée');
    urls.forEach(URL.revokeObjectURL); urls = [];
  }
  $('folder').addEventListener('change', event => { loadFiles([...event.target.files], true); event.target.value = ''; });
  $('previous').addEventListener('click', () => go(index - 1, 'previous'));
  $('next').addEventListener('click', () => go(index + 1, 'next'));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (event.code === 'Space' && event.target.closest('a,button')) return;
    if (event.key.toLowerCase() === 'o') { event.preventDefault(); $('folder').click(); return; }
    if (event.key === 'ArrowRight' || event.code === 'Space') { event.preventDefault(); go(index + 1, 'next'); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1, 'previous'); }
    else if (event.key === 'Home') { event.preventDefault(); go(0, 'another'); }
    else if (event.key === 'End') { event.preventDefault(); go(deck.slides.length - 1, 'another'); }
  });
  document.addEventListener('dragover', event => { event.preventDefault(); document.body.classList.add('dragging'); });
  document.addEventListener('dragleave', event => { if (!event.relatedTarget) document.body.classList.remove('dragging'); });
  document.addEventListener('drop', event => { event.preventDefault(); document.body.classList.remove('dragging'); loadFiles([...event.dataTransfer.files], false); });
  let touchX = null;
  $('viewport').addEventListener('touchstart', event => { touchX = event.touches[0].clientX; }, { passive: true });
  $('viewport').addEventListener('touchend', event => { if (touchX === null) return; const delta = event.changedTouches[0].clientX - touchX; touchX = null; if (Math.abs(delta) > 60) go(index + (delta < 0 ? 1 : -1), delta < 0 ? 'next' : 'previous'); }, { passive: true });
  window.addEventListener('resize', resize);
  reset();
})();
