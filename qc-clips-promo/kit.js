// QC Clips promo: shared timing helpers. Every function maps t to a picture; nothing keeps state between frames.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
/** 0 → 1 as t goes from start to start + dur */
export const prog = (t, start, dur) => clamp((t - start) / dur);

export const ease = {
  out: (k) => 1 - Math.pow(1 - k, 3),
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outQuint: (k) => 1 - Math.pow(1 - k, 5),
  back: (k) => { const c = 1.7, c3 = c + 1; return 1 + c3 * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  // a soft spring that overshoots once and settles: for bubbles and stars
  spring: (k) => (k >= 1 ? 1 : 1 - Math.exp(-6.5 * k) * Math.cos(10 * k)),
};

/** Seeded random, so the same page always scatters the same dust. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Fill .bg with gold dust; drift(t) moves it. */
export function dust(bg, seed = 7, n = 46) {
  const r = rng(seed), motes = [];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    d.className = 'dust';
    const size = 2 + r() * 6;
    Object.assign(d.style, { width: size + 'px', height: size + 'px', left: r() * 1080 + 'px', top: r() * 1920 + 'px' });
    bg.appendChild(d);
    motes.push({ d, sp: 8 + r() * 26, ph: r() * 6.28, op: 0.15 + r() * 0.45 });
  }
  return (t) => motes.forEach((m) => {
    m.d.style.transform = `translate(${Math.sin(t * 0.6 + m.ph) * 10}px, ${-t * m.sp}px)`;
    m.d.style.opacity = (m.op * (0.6 + 0.4 * Math.sin(t * 1.4 + m.ph))).toFixed(3);
  });
}

/** Split a caption into word spans once (keeps .hl spans), then reveal them word by word. */
export function caption(el) {
  const out = [];
  const split = (node, parent) => {
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        c.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w'; w.textContent = part;
          parent.appendChild(w); out.push(w);
        });
      } else {
        const clone = c.cloneNode(false); parent.appendChild(clone); split(c, clone);
      }
    });
  };
  const frag = document.createDocumentFragment();
  split(el, frag);
  el.textContent = ''; el.appendChild(frag);
  return (t, start = 0.15, stagger = 0.07) => out.forEach((w, i) => {
    const k = prog(t, start + i * stagger, 0.55);
    w.style.opacity = ease.out(k);
    w.style.transform = `translateY(${(1 - ease.out(k)) * 46}px) scale(${lerp(0.92, 1, ease.out(k))})`;
    w.style.filter = `blur(${(1 - k) * 8}px)`;
  });
}

/** A message bubble popping in like iMessage: from small and low to full size with a soft spring. */
export function pop(el, t, start, dur = 0.6) {
  const k = prog(t, start, dur);
  if (k <= 0) { el.style.opacity = 0; el.style.transform = 'scale(.5)'; return 0; }
  el.style.opacity = clamp(k * 3);
  el.style.transform = `translateY(${(1 - ease.out(k)) * 30}px) scale(${lerp(0.5, 1, ease.spring(k))})`;
  return k;
}

/** Typing dots between start and end; each dot bounces in turn. Collapses once the reply arrives. */
export function typing(el, t, start, end) {
  const on = t >= start && t < end;
  el.style.display = on ? 'flex' : 'none';
  if (!on) return;
  const k = ease.out(prog(t, start, 0.3));
  el.style.opacity = k;
  el.style.transform = `scale(${lerp(0.6, 1, k)})`;
  [...el.children].forEach((d, i) => {
    const ph = ((t - start) * 2.6 - i * 0.18) % 1;
    const b = ph > 0 && ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI) : 0;
    d.style.transform = `translateY(${-b * 12}px)`;
    d.style.opacity = 0.45 + b * 0.55;
  });
}

/** Phone buzz: a short horizontal shake starting at `at`. */
export const buzz = (t, at, len = 0.45) => {
  const k = (t - at) / len;
  return k > 0 && k < 1 ? Math.sin(k * Math.PI * 9) * 9 * (1 - k) : 0;
};

/** Type `text` into el between start and start + dur, with a blinking caret while active. */
export function type(el, text, t, start, dur, placeholder = '') {
  const k = prog(t, start, dur);
  const n = Math.round(text.length * k);
  if (t < start) { el.innerHTML = placeholder ? `<span class="ph">${placeholder}</span>` : ''; return; }
  const caret = k < 1 || (t - start - dur < 0.5 && Math.floor(t * 3) % 2 === 0) ? '<span class="caret"></span>' : '';
  el.innerHTML = '';
  el.append(document.createTextNode(text.slice(0, n)));
  if (caret) el.insertAdjacentHTML('beforeend', caret);
}
