(() => {
  const body = document.body;
  if (!body.classList.contains('visual-v2')) return;

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const progress = document.createElement('div');
  progress.className = 'v2-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span></span>';
  body.prepend(progress);

  document.querySelectorAll('.section, .quick-links').forEach(section => {
    [...section.querySelectorAll('[data-reveal]')].forEach((el, index) => {
      el.style.setProperty('--reveal-delay', `${Math.min(index, 4) * 70}ms`);
    });
  });

  let raf = 0;
  const update = () => {
    raf = 0;
    const y = window.scrollY || 0;
    const max = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
    root.style.setProperty('--scroll-progress', Math.min(y / max, 1).toFixed(4));
    root.style.setProperty('--hero-shift', `${Math.min(y * .075, 54)}px`);
    root.style.setProperty('--hero-scale', String(1.015 + Math.min(y / 18000, .035)));
    header?.classList.toggle('is-scrolled', y > 28);
  };
  const requestUpdate = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  addEventListener('scroll', requestUpdate, { passive:true });
  addEventListener('resize', requestUpdate, { passive:true });
  update();

  if (hero && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      root.style.setProperty('--hero-x', `${Math.max(48, Math.min(92, x)).toFixed(1)}%`);
      root.style.setProperty('--hero-y', `${Math.max(12, Math.min(72, y)).toFixed(1)}%`);
    }, { passive:true });
    hero.addEventListener('pointerleave', () => {
      root.style.setProperty('--hero-x', '72%');
      root.style.setProperty('--hero-y', '28%');
    });
  }
})();