(() => {
  const dataEl = document.getElementById('fpv-club-data');
  if (!dataEl) return;

  const clubs = JSON.parse(dataEl.textContent);
  const search = document.querySelector('[data-club-search]');
  const region = document.querySelector('[data-club-region]');
  const certified = document.querySelector('[data-club-certified]');
  const host = document.querySelector('[data-club-grid]');
  const cards = [...document.querySelectorAll('[data-club-id]')];
  const count = document.querySelector('[data-club-count]');

  const associations = [
    { region:'Norte', code:'ARVN', name:'Associação Regional de Vela do Norte', url:'https://arvn.pt/' },
    { region:'Centro', code:'ARVC', name:'Associação Regional de Vela do Centro', url:'https://arvc.pt/' },
    { region:'Sul', code:'ARVS', name:'Associação Regional de Vela do Sul', url:'' },
    { region:'Madeira', code:'ARVM', name:'Associação Regional de Vela da Madeira', url:'https://arvm.pt/' },
    { region:'Açores', code:'ARVA', name:'Associação Regional de Vela dos Açores', url:'https://velazores.com/' }
  ];

  const normalize = value => (value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  // Build one visual section per regional association while keeping every club card reusable.
  const groupSections = new Map();
  if (host) {
    const fragment = document.createDocumentFragment();

    associations.forEach(association => {
      const section = document.createElement('section');
      section.className = 'club-association-group';
      section.dataset.regionGroup = association.region;

      const header = document.createElement('div');
      header.className = 'club-association-heading';
      const website = association.url
        ? `<a href="${association.url}" target="_blank" rel="noreferrer">Website da associação ↗</a>`
        : '';
      header.innerHTML = `
        <div>
          <span class="regional-code">${association.code}</span>
          <h3>${association.name}</h3>
          <span class="club-association-count" data-association-count="${association.region}"></span>
        </div>
        ${website}
      `;

      const grid = document.createElement('div');
      grid.className = 'club-cards real-club-grid association-club-grid';

      cards
        .filter(card => card.dataset.region === association.region)
        .forEach(card => {
          // Cards in the directory must never depend on scroll-reveal to become usable.
          card.removeAttribute('data-reveal');
          card.classList.add('visible');
          const firstTag = card.querySelector('.club-card-tags .tag');
          if (firstTag) {
            firstTag.textContent = association.code;
            firstTag.title = association.name;
          }
          grid.appendChild(card);
        });

      section.append(header, grid);
      fragment.appendChild(section);
      groupSections.set(association.region, section);
    });

    host.className = 'club-association-directory';
    host.replaceChildren(fragment);
  }

  function matches(club) {
    const q = normalize(search?.value);
    const r = region?.value || 'all';
    const c = certified?.value || 'all';
    const hay = normalize(`${club.club} ${club.address} ${club.email} ${club.region}`);
    return (!q || hay.includes(q)) &&
      (r === 'all' || club.region === r) &&
      (c === 'all' || club.school_certified === c);
  }

  function applyFilters() {
    let total = 0;
    const visibleIds = new Set();
    const perAssociation = new Map(associations.map(a => [a.region, 0]));

    clubs.forEach(club => {
      if (matches(club)) {
        total++;
        visibleIds.add(club.id);
        perAssociation.set(club.region, (perAssociation.get(club.region) || 0) + 1);
      }
    });

    cards.forEach(card => {
      card.hidden = !visibleIds.has(card.dataset.clubId);
    });

    associations.forEach(association => {
      const n = perAssociation.get(association.region) || 0;
      const section = groupSections.get(association.region);
      if (section) section.hidden = n === 0;
      const el = document.querySelector(`[data-association-count="${association.region}"]`);
      if (el) el.textContent = `${n} ${n === 1 ? 'entidade' : 'entidades'} neste diretório`;
    });

    if (count) count.textContent = `${total} ${total === 1 ? 'resultado' : 'resultados'}`;
  }

  [search, region, certified].forEach(el =>
    el?.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', applyFilters)
  );

  applyFilters();
})();