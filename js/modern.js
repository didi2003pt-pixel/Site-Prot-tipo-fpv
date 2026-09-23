/* Progressive enhancement: content remains visible without JavaScript. */
(() => {
  const header = document.querySelector('.site-header');
  let queued = false;
  const update = () => { header?.classList.toggle('is-scrolled', scrollY > 12); queued = false; };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, {passive:true});
  update();
  const menu = document.querySelector('[data-mobile-menu]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const closeMenu = () => { menu?.classList.remove('active'); document.body.classList.remove('menu-open'); toggle?.setAttribute('aria-expanded','false'); toggle?.setAttribute('aria-label','Abrir menu'); };
  toggle?.addEventListener('click', () => { toggle.setAttribute('aria-label', toggle.getAttribute('aria-expanded') === 'true' ? 'Fechar menu' : 'Abrir menu'); });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && menu?.classList.contains('active')) {closeMenu();toggle?.focus();} });
  const desktop = matchMedia('(min-width:1201px)');
  desktop.addEventListener('change', e => { if(e.matches) closeMenu(); });
  const overlay = document.querySelector('[data-search-overlay]');
  let returnFocus;
  document.querySelectorAll('[data-open-search]').forEach(button => button.addEventListener('click', () => {returnFocus=button;closeMenu();}));
  document.querySelectorAll('[data-close-search]').forEach(button => button.addEventListener('click', () => returnFocus?.focus()));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && returnFocus) { returnFocus.focus(); returnFocus = null; }
    const scope = overlay?.classList.contains('active') ? overlay : menu?.classList.contains('active') ? header : null;
    if(e.key !== 'Tab' || !scope) return;
    const focusable = [...scope.querySelectorAll('a[href],button,input,select')].filter(el=>el.getClientRects().length && !el.disabled);
    const first=focusable[0],last=focusable.at(-1);
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
  });
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('motion-enter');observer.unobserve(entry.target);}}),{threshold:.08});
    document.querySelectorAll('main [data-reveal]').forEach(el=>observer.observe(el));
  }
})();
