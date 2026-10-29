// QC Clips end card animation, shared by end.html (pitch) and end-demo.html (own page)
import { prog, ease, lerp, clamp, dust } from './kit.js';

export function endCard() {
  const $ = (id) => document.getElementById(id);
  const drift = dust($('bg'), 89, 60);
  const frame = $('frame'), tri = $('tri'), line = $('line'), cta = $('cta'), sub = $('sub'), glow = $('glow');
  const letters = [...$('word').textContent].map((ch) => {
    const s = document.createElement('span');
    s.textContent = ch; s.style.display = 'inline-block'; s.style.whiteSpace = 'pre';
    return s;
  });
  $('word').textContent = '';
  letters.forEach((s) => $('word').appendChild(s));
  const shine = document.createElement('div');
  shine.id = 'shine';
  $('word').appendChild(shine);
  const FRAME_LEN = 1000;

  return {
    duration: 3,
    frame(t) {
      drift(t);
      glow.style.opacity = lerp(0.3, 1, ease.out(prog(t, 0, 1.2)));
      frame.style.strokeDashoffset = FRAME_LEN * (1 - ease.inOut(prog(t, 0, 0.7)));
      const tk = prog(t, 0.3, 0.7);
      tri.style.opacity = clamp(tk * 3);
      tri.style.transform = `scale(${ease.spring(tk)})`;
      letters.forEach((s, i) => {
        const k = prog(t, 0.55 + i * 0.045, 0.55);
        s.style.opacity = ease.out(k);
        s.style.transform = `translateY(${(1 - ease.out(k)) * 60}px)`;
      });
      line.style.transform = `scaleX(${ease.inOut(prog(t, 1.0, 0.5))})`;
      const ck = ease.out(prog(t, 1.25, 0.55));
      cta.style.opacity = ck;
      cta.style.transform = `translateY(${(1 - ck) * 30}px) scale(${lerp(0.96, 1, ck)})`;
      const sk = ease.out(prog(t, 1.55, 0.5));
      sub.style.opacity = sk * 0.8;
      shine.style.transform = `translateX(${lerp(-700, 900, ease.inOut(prog(t, 1.7, 0.9)))}px) skewX(-20deg)`;
      shine.style.opacity = t > 1.7 && t < 2.6 ? 1 : 0;
    },
  };
}
