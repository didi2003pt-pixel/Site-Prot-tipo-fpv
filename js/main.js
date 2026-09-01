
(() => {
  const body = document.body;

  // Mobile navigation
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('active');
      body.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  // Search palette
  const overlay = document.querySelector('[data-search-overlay]');
  const searchInput = document.querySelector('[data-search-input]');
  const searchResult = document.querySelector('[data-search-result]');
  const searchResultTitle = document.querySelector('[data-search-result-title]');
  const openSearch = () => {
    if (!overlay) return;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    body.classList.add('search-open');
    setTimeout(() => searchInput?.focus(), 30);
  };
  const closeSearch = () => {
    overlay?.classList.remove('active');
    overlay?.setAttribute('aria-hidden', 'true');
    body.classList.remove('search-open');
  };
  document.querySelectorAll('[data-open-search]').forEach(el => el.addEventListener('click', openSearch));
  document.querySelectorAll('[data-close-search]').forEach(el => el.addEventListener('click', closeSearch));
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch();
  });
  const showDemoResult = value => {
    if (!searchResult || !searchResultTitle) return;
    const cleaned = (value || '').trim();
    searchResult.hidden = cleaned.length < 2;
    searchResultTitle.textContent = cleaned ? `Resultados para “${cleaned}”` : '';
  };
  searchInput?.addEventListener('input', e => showDemoResult(e.target.value));
  document.querySelectorAll('[data-suggestion]').forEach(btn => btn.addEventListener('click', () => {
    if (searchInput) searchInput.value = btn.dataset.suggestion;
    showDemoResult(btn.dataset.suggestion);
  }));

  // Reveal on scroll
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  // Calendar filters
  const eventSearch = document.querySelector('[data-event-search]');
  const eventRegion = document.querySelector('[data-event-region]');
  const eventScope = document.querySelector('[data-event-scope]');
  const events = [...document.querySelectorAll('.calendar-event')];
  const eventCount = document.querySelector('[data-event-count]');
  const eventEmpty = document.querySelector('[data-event-empty]');
  const filterEvents = () => {
    if (!events.length) return;
    const q = (eventSearch?.value || '').toLowerCase().trim();
    const region = eventRegion?.value || 'all';
    const scope = eventScope?.value || 'all';
    let count = 0;
    events.forEach(event => {
      const hitQ = !q || event.dataset.name.includes(q);
      const hitRegion = region === 'all' || event.dataset.region === region;
      const hitScope = scope === 'all' || event.dataset.scope === scope;
      const show = hitQ && hitRegion && hitScope;
      event.hidden = !show;
      if (show) count++;
    });
    if (eventCount) eventCount.textContent = `${count} ${count === 1 ? 'evento' : 'eventos'}`;
    if (eventEmpty) eventEmpty.hidden = count !== 0;
  };
  [eventSearch, eventRegion, eventScope].forEach(el => el?.addEventListener(el?.tagName === 'INPUT' ? 'input' : 'change', filterEvents));
  document.querySelector('[data-reset-events]')?.addEventListener('click', () => {
    if (eventSearch) eventSearch.value = '';
    if (eventRegion) eventRegion.value = 'all';
    if (eventScope) eventScope.value = 'all';
    filterEvents();
  });

  // News filters
  const newsButtons = document.querySelectorAll('[data-news-filter]');
  const newsCards = document.querySelectorAll('[data-news-category]');
  newsButtons.forEach(btn => btn.addEventListener('click', () => {
    newsButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.newsFilter;
    newsCards.forEach(card => card.hidden = filter !== 'all' && card.dataset.newsCategory !== filter);
  }));

  // Club demo filtering
  const clubRegion = document.querySelector('[data-club-region]');
  clubRegion?.addEventListener('change', () => {
    const region = clubRegion.value;
    document.querySelectorAll('.club-card').forEach(card => {
      card.hidden = region !== 'all' && card.dataset.region !== region;
    });
  });
})();
