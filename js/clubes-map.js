(() => {
  const dataEl = document.getElementById('fpv-club-data');
  if (!dataEl) return;
  const clubs = JSON.parse(dataEl.textContent);
  const search = document.querySelector('[data-club-search]');
  const region = document.querySelector('[data-club-region]');
  const certified = document.querySelector('[data-club-certified]');
  const cards = [...document.querySelectorAll('[data-club-id]')];
  const count = document.querySelector('[data-club-count]');

  const normalize = value => (value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  function matches(club) {
    const q = normalize(search?.value);
    const r = region?.value || 'all';
    const c = certified?.value || 'all';
    const hay = normalize(`${club.club} ${club.address} ${club.email}`);
    return (!q || hay.includes(q)) && (r === 'all' || club.region === r) && (c === 'all' || club.school_certified === c);
  }

  function applyFilters() {
    let n = 0;
    const visibleIds = new Set();
    clubs.forEach(club => { if (matches(club)) { n++; visibleIds.add(club.id); } });
    cards.forEach(card => card.hidden = !visibleIds.has(card.dataset.clubId));
    if (count) count.textContent = `${n} ${n === 1 ? 'resultado' : 'resultados'}`;
  }

  [search, region, certified].forEach(el => el?.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', applyFilters));
  applyFilters();
})();
