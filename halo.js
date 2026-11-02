/* AURA Light Ring: the halo the product projects onto the table.
   A 24-hour day ring (17:00 at the bottom, clockwise), the six ritual windows in their colours,
   and an inner steeping track that fills while you touch and hold. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const C = 200, R_DAY = 150, R_DOTS = 166, R_STEEP = 134;
  const ang = h => (90 + (h - 17) * 15) * Math.PI / 180;           // 17:00 at the bottom
  const pt = (h, r) => [C + r * Math.cos(ang(h)), C + r * Math.sin(ang(h))];
  const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const arc = (h0, h1, r) => {
    let span = (h1 - h0 + 24) % 24 || 24;
    const [x0, y0] = pt(h0, r), [x1, y1] = pt(h0 + span, r);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${span > 12 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };

  window.AURA_buildRing = (svg, rituals, nowIndex) => {
    svg.setAttribute('viewBox', '0 0 400 400');
    el('circle', { cx: C, cy: C, r: R_DAY, class: 'lr-base' }, svg);
    const g = el('g', { class: 'lr-arcs' }, svg);
    rituals.forEach((r, i) => {
      const next = rituals[(i + 1) % rituals.length].h;
      el('path', { d: arc(r.h, next, R_DAY), stroke: r.line, class: 'lr-arc' + (i === nowIndex ? ' is-now' : '') }, g);
    });
    for (let h = 0; h < 24; h++) {
      const [x, y] = pt(h, R_DOTS);
      el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: h % 6 ? 1.6 : 2.6, class: 'lr-hour' }, svg);
    }
    rituals.forEach((r, i) => {
      const [x, y] = pt(r.h, R_DAY);
      el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: i === nowIndex ? 8 : 5.5, fill: r.color, class: 'lr-mark' + (i === nowIndex ? ' is-now' : '') }, svg);
    });
    el('circle', { cx: C, cy: C, r: R_STEEP, class: 'lr-track' }, svg);
    const steep = el('circle', { cx: C, cy: C, r: R_STEEP, class: 'lr-steep', pathLength: 1, transform: `rotate(-90 ${C} ${C})`, stroke: rituals[nowIndex].line }, svg);
    const pulses = el('g', { class: 'lr-pulses' }, svg);
    for (let k = 0; k < 3; k++) el('circle', { cx: C, cy: C, r: 40, stroke: rituals[nowIndex].line, class: 'lr-pulse' }, pulses);
    el('circle', { cx: C, cy: C, r: 30, class: 'lr-core', style: `--glow:${rituals[nowIndex].line}` }, svg);
    return { steep };
  };

  /* touch-and-hold: fills the steeping track; calls onDone when full */
  window.AURA_hold = (btn, steep, onDone, ms = 2200) => {
    let t0 = 0, raf = 0, done = false;
    const set = p => steep.style.strokeDashoffset = String(1 - p);
    const frame = t => {
      const p = Math.min(1, (t - t0) / ms); set(p);
      if (p < 1) raf = requestAnimationFrame(frame);
      else if (!done) { done = true; btn.classList.add('done'); onDone && onDone(); }
    };
    const start = e => {
      if (e) e.preventDefault();
      if (done) return;
      btn.classList.add('held'); t0 = performance.now(); raf = requestAnimationFrame(frame);
      if (navigator.vibrate) navigator.vibrate([16, 520, 16, 520, 16, 520, 16]);
    };
    const stop = () => {
      btn.classList.remove('held'); cancelAnimationFrame(raf);
      if (!done) { steep.style.transition = 'stroke-dashoffset .5s'; set(0); setTimeout(() => steep.style.transition = '', 520); }
      if (navigator.vibrate) navigator.vibrate(0);
    };
    btn.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
    btn.addEventListener('keyup', stop);
    btn.addEventListener('contextmenu', e => e.preventDefault());
    set(0);
    return { reset() { done = false; btn.classList.remove('done'); set(0); } };
  };
})();
