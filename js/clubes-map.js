(() => {
  const search = document.querySelector('[data-club-search]');
  const region = document.querySelector('[data-club-region]');
  const certified = document.querySelector('[data-club-certified]');
  const host = document.querySelector('[data-club-grid]');
  const count = document.querySelector('[data-club-count]');
  if (!host) return;

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

  const escapeHtml = value => String(value || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  const existingCards = new Map(
    [...document.querySelectorAll('[data-club-id]')].map(card => [card.dataset.clubId, card])
  );

  function createCard(club, association) {
    const article = document.createElement('article');
    article.className = 'club-card real-club-card visible';
    article.dataset.clubId = club.id;
    article.dataset.region = club.region;
    article.dataset.certified = club.school_certified || '';

    const tags = [
      '<span class="tag">' + escapeHtml(association.code) + '</span>',
      club.school_certified === 'Sim' ? '<span class="tag tag-live">Escola certificada</span>' : ''
    ].join('');

    const contacts = [];
    if (club.address) contacts.push('<span>' + escapeHtml(club.address) + '</span>');
    if (club.email) contacts.push('<a href="mailto:' + escapeHtml(club.email) + '">' + escapeHtml(club.email) + '</a>');
    if (club.phone) contacts.push('<span>' + escapeHtml(club.phone) + '</span>');
    if (club.website) contacts.push('<a href="' + escapeHtml(club.website) + '" rel="noreferrer" target="_blank">Website ↗</a>');

    const destination = encodeURIComponent(club.geocode_query || [club.club, club.address, 'Portugal'].filter(Boolean).join(', '));

    article.innerHTML =
      '<div class="club-card-tags">' + tags + '</div>' +
      '<h3>' + escapeHtml(club.club) + '</h3>' +
      '<div class="club-contact">' + contacts.join('') + '</div>' +
      '<a class="club-maps-link" href="https://www.google.com/maps/dir/?api=1&destination=' + destination + '" rel="noopener noreferrer" target="_blank">Abrir no Maps <span>↗</span></a>';

    return article;
  }

  function matches(club) {
    const q = normalize(search?.value);
    const r = region?.value || 'all';
    const c = certified?.value || 'all';
    const hay = normalize([club.club, club.address, club.email, club.region].join(' '));
    return (!q || hay.includes(q)) &&
      (r === 'all' || club.region === r) &&
      (c === 'all' || club.school_certified === c);
  }

  fetch('assets/clubes-fpv.json', { cache:'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Não foi possível carregar o diretório de clubes.');
      return response.json();
    })
    .then(clubs => {
      const groupSections = new Map();
      const cardMap = new Map();

      clubs.forEach(club => {
        const association = associations.find(a => a.region === club.region);
        if (!association) return;

        let card = existingCards.get(club.id);
        if (!card) card = createCard(club, association);

        card.removeAttribute('data-reveal');
        card.classList.add('visible');
        card.dataset.region = club.region;
        card.dataset.certified = club.school_certified || '';

        const firstTag = card.querySelector('.club-card-tags .tag');
        if (firstTag) {
          firstTag.textContent = association.code;
          firstTag.title = association.name;
        }
        cardMap.set(club.id, card);
      });

      const fragment = document.createDocumentFragment();

      associations.forEach(association => {
        const section = document.createElement('section');
        section.className = 'club-association-group';
        section.dataset.regionGroup = association.region;

        const header = document.createElement('div');
        header.className = 'club-association-heading';
        const website = association.url
          ? '<a href="' + association.url + '" target="_blank" rel="noreferrer">Website da associação ↗</a>'
          : '';
        header.innerHTML =
          '<div><span class="regional-code">' + association.code + '</span>' +
          '<h3>' + association.name + '</h3>' +
          '<span class="club-association-count" data-association-count="' + association.region + '"></span></div>' +
          website;

        const grid = document.createElement('div');
        grid.className = 'club-cards real-club-grid association-club-grid';

        clubs
          .filter(club => club.region === association.region)
          .sort((a,b) => a.club.localeCompare(b.club, 'pt'))
          .forEach(club => {
            const card = cardMap.get(club.id);
            if (card) grid.appendChild(card);
          });

        section.append(header, grid);
        fragment.appendChild(section);
        groupSections.set(association.region, section);
      });

      host.className = 'club-association-directory';
      host.replaceChildren(fragment);

      // Profile links are generated here so newly researched clubs behave like existing ones.
      cardMap.forEach((card, id) => {
        if (card.querySelector('.club-profile-link')) return;
        const link = document.createElement('a');
        link.className = 'club-profile-link';
        link.href = 'clube.html?clube=' + encodeURIComponent(id);
        link.innerHTML = '<span>Ver perfil do clube</span><span aria-hidden="true">→</span>';
        const maps = card.querySelector('.club-maps-link');
        if (maps) card.insertBefore(link, maps); else card.appendChild(link);
      });

      function applyFilters() {
        let total = 0;
        const perAssociation = new Map(associations.map(a => [a.region, 0]));

        clubs.forEach(club => {
          const show = matches(club);
          const card = cardMap.get(club.id);
          if (card) card.hidden = !show;
          if (show) {
            total++;
            perAssociation.set(club.region, (perAssociation.get(club.region) || 0) + 1);
          }
        });

        associations.forEach(association => {
          const n = perAssociation.get(association.region) || 0;
          const section = groupSections.get(association.region);
          if (section) section.hidden = n === 0;
          const el = document.querySelector('[data-association-count="' + association.region + '"]');
          if (el) el.textContent = n + ' ' + (n === 1 ? 'entidade' : 'entidades') + ' neste diretório';
        });

        if (count) count.textContent = total + ' ' + (total === 1 ? 'resultado' : 'resultados');
      }

      [search, region, certified].forEach(el =>
        el?.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', applyFilters)
      );

      applyFilters();
    })
    .catch(error => {
      console.error(error);
      if (count) count.textContent = 'Diretório temporariamente indisponível';
    });
})();