/* AURA · Frankfurt Kitchen 2040 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const STR = window.AURA_I18N;
  const RITUALS = window.AURA_RITUALS;
  const pad = n => String(n).padStart(2, '0');

  /* ---------- language ---------- */
  const store = {
    get() { try { return localStorage.getItem('aura-lang'); } catch (_) { return null; } },
    set(v) { try { localStorage.setItem('aura-lang', v); } catch (_) {} }
  };
  let lang = store.get() || ((navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en');
  const t = k => (STR[lang] && STR[lang][k]) || STR.en[k] || '';

  const applyLang = () => {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => {
      const v = t(el.dataset.i18n);
      if (!v) return;
      if (el.dataset.tz) { el.dataset.city = v; return; }
      el.innerHTML = v;
    });
    if (document.body.classList.contains('page-home')) document.title = t('meta.title');
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
    $$('[data-ring]').forEach(b => b.setAttribute('aria-label', t('h.hold')));
    renderRitual(true);
    renderNow();
    tick();
    const lk = $('.linked'); if (lk && lk._relang) lk._relang();
  };
  $$('.lang button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; store.set(lang); applyLang(); }));

  /* ---------- every page opens at its top (unless a #section is asked for) ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toTop = () => { if (!location.hash) { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); document.documentElement.style.scrollBehavior = ''; } };
  toTop();
  addEventListener('pageshow', toTop);

  /* ---------- load ---------- */
  requestAnimationFrame(() => { document.documentElement.classList.add('loaded'); document.body.classList.add('loaded'); });

  /* ---------- home: show the small mark once the hero is gone ---------- */
  const heroEl = $('.page-home .hero');
  if (heroEl) new IntersectionObserver(([e]) => document.body.classList.toggle('scrolled', !e.isIntersecting), { rootMargin: '-40% 0px 0px 0px' }).observe(heroEl);

  /* ---------- top bar turns dark while the dark section sits under it ---------- */
  const darkEl = $('.linked');
  if (darkEl) new IntersectionObserver(([e]) => document.body.classList.toggle('bar-dark', e.isIntersecting), { rootMargin: '0px 0px -94% 0px' }).observe(darkEl);

  /* ---------- the brew overlay uses SMIL for the cone droplets; hold it still for reduced motion ---------- */
  const over = $('.drawing__over');
  if (over && matchMedia('(prefers-reduced-motion: reduce)').matches && over.pauseAnimations) over.pauseAnimations();

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .end').forEach(el => io.observe(el));

  /* ---------- videos: play only while on screen ---------- */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = $('video', e.target); if (!v) return;
    if (e.isIntersecting) { v.preload = 'auto'; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    else v.pause();
  }), { threshold: 0.25 });
  $$('[data-video]').forEach(el => vio.observe(el));

  /* ---------- brew steps (more page) ---------- */
  const brew = $('.drawing--brew');
  const steps = $$('.step');
  if (brew && steps.length) {
    const wide = matchMedia('(min-width: 820px)');
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = innerHeight, target = vh * (wide.matches ? 0.5 : 0.8), band = vh * (wide.matches ? 0.28 : 0.16);
      let best = 0, bestO = 0.5;
      steps.forEach(s => {
        const r = $('p', s).getBoundingClientRect();
        const o = Math.max(0, Math.min(1, 1.35 - Math.abs(r.top + r.height / 2 - target) / band));
        s.style.setProperty('--o', o.toFixed(3));
        if (o > bestO) { bestO = o; best = +s.dataset.step; }
      });
      if (best && String(best) !== brew.dataset.step) brew.dataset.step = best;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- rituals (both pages) ---------- */
  const day = $('.day');
  const full = $('.ritual');
  const mini = $('.ritual-mini');
  const nowEl = $('.now');
  let cur = -1;

  const ritualNow = () => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    let i = RITUALS.length - 1;
    RITUALS.forEach((r, k) => { if (h >= r.h) i = k; });
    if (h < RITUALS[0].h) i = RITUALS.length - 1;
    return { i, label: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
  };

  function renderNow() {
    if (!nowEl) return;
    const n = ritualNow();
    nowEl.innerHTML = t('now').replace('{t}', n.label).replace('{r}', RITUALS[n.i].name);
  }

  function renderRitual(force) {
    if (cur < 0) return;
    const r = RITUALS[cur], L = r[lang] || r.en;
    if (day) $$('button', day).forEach((b, k) => b.setAttribute('aria-selected', k === cur));
    if (full) {
      full.style.setProperty('--rc', r.line);
      full.setAttribute('aria-labelledby', `tab-${r.id}`);
      full.innerHTML = `
        <div class="ritual__in">
          <div class="ritual__head">
            <div><h3 class="ritual__name">${r.name}</h3><p class="ritual__sub">${L.sub}</p></div>
            <span class="mono ritual__time">${r.time}</span>
          </div>
          <div class="ritual__img"><img src="img/ritual_${r.id}.webp" width="607" height="433" alt=""></div>
          <div class="ritual__tea">
            <img src="img/tea_${r.img}.jpg" width="480" height="480" alt="${r.tea}">
            <div><h3>${r.tea}</h3><p>${L.origin}</p></div>
          </div>
          <p class="ritual__why">${L.why}</p>
          <dl>
            <div><dt class="mono">${t('r.notes')}</dt><dd>${L.notes}</dd></div>
            <div><dt class="mono">${t('r.taste')}</dt><dd>${L.taste}</dd></div>
            <div><dt class="mono">${t('r.brew')}</dt><dd>${r.brew}</dd></div>
          </dl>
          <div class="ritual__nav">
            <button class="mono" data-go="-1">← ${RITUALS[(cur + 5) % 6].name}</button>
            <button class="mono" data-go="1">${RITUALS[(cur + 1) % 6].name} →</button>
          </div>
        </div>`;
    }
    if (mini) {
      mini.style.setProperty('--rc', r.line);
      mini.innerHTML = `
        <img src="img/tea_${r.img}.jpg" width="132" height="132" alt="">
        <span><span class="mono s" style="display:block;margin:0 0 6px">${r.time}</span><span class="n" style="display:block">${r.name}</span><span class="s" style="display:block">${r.tea}</span></span>
        <span class="go" aria-hidden="true">→</span>`;
      if (!force) { mini.classList.remove('swap'); void mini.offsetWidth; mini.classList.add('swap'); }
    }
  }

  const show = (i, focus) => {
    i = (i + RITUALS.length) % RITUALS.length;
    if (i === cur) return;
    cur = i;
    renderRitual(false);
    if (focus) $(`#tab-${RITUALS[i].id}`).focus();
  };

  if (day) {
    day.innerHTML = RITUALS.map((r, i) => `
      <button role="tab" id="tab-${r.id}" aria-selected="false" data-i="${i}" style="--c:${r.color}" aria-label="${r.name}, ${r.time}">
        <span class="dot"></span><span class="mono t">${r.time}</span>
      </button>`).join('');
    day.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(+b.dataset.i); });
    day.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, true); }
    });
  }
  if (full) {
    full.setAttribute('role', 'tabpanel');
    full.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) show(cur + +b.dataset.go); });
    let sx = null, sy = null;
    full.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    full.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(cur + (dx < 0 ? 1 : -1));
      sx = null;
    }, { passive: true });
  }
  if (day) cur = ritualNow().i;

  /* ---------- Light Ring: touch and hold ---------- */
  const rings = $$('[data-ring]').map(btn => {
    const ni = ritualNow().i;
    const { steep } = window.AURA_buildRing($('svg', btn), RITUALS, ni);
    const nameEl = $('.ring__name', btn);
    nameEl.textContent = `${RITUALS[ni].name} · ${RITUALS[ni].time}`;
    window.AURA_hold(btn, steep, () => { if (day && cur !== ni) show(ni); });
    return btn;
  });
  rings.forEach(r => io.observe(r));

  /* ---------- Linked Auras: hold to send a glow ---------- */
  const linked = $('.linked');
  if (linked) {
    const me = $('[data-link]', linked), flow = $('.p-flow', linked), hint = $('.linked__hint', linked);
    let t0 = 0, raf = 0, sent = false;
    const set = p => flow.style.strokeDashoffset = String(1 - p);
    const frame = ts => {
      const p = Math.min(1, (ts - t0) / 1600); set(p);
      if (p < 1) raf = requestAnimationFrame(frame);
      else if (!sent) { sent = true; linked.classList.add('sent'); hint.textContent = t('l.linked.sent'); }
    };
    const start = e => { e.preventDefault(); if (sent) return; linked.classList.add('held'); t0 = performance.now(); raf = requestAnimationFrame(frame); if (navigator.vibrate) navigator.vibrate([16, 520, 16, 520, 16]); };
    const stop = () => { linked.classList.remove('held'); cancelAnimationFrame(raf); if (!sent) set(0); if (navigator.vibrate) navigator.vibrate(0); };
    me.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => me.addEventListener(ev, stop));
    me.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
    me.addEventListener('keyup', stop);
    me.addEventListener('contextmenu', e => e.preventDefault());
    set(0);
    linked._relang = () => { if (sent) hint.textContent = t('l.linked.sent'); };
  }

  /* ---------- live clocks (more page) ---------- */
  const clocks = $$('[data-tz]');
  function tick() {
    clocks.forEach(el => {
      const city = el.dataset.city || el.textContent.split(' ·')[0];
      try {
        const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: el.dataset.tz }).format(new Date());
        // under the halos: city on one line, time on the next
        if (el.closest('.pair2')) el.innerHTML = `${city}<br>${time}`;
        else el.textContent = `${city} · ${time}`;
      } catch (_) { el.textContent = city; }
    });
  }
  setInterval(tick, 30000);

  applyLang();
})();
