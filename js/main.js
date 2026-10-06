
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
    if (!searchResult) return;
    const cleaned = (value || '').trim();
    searchResult.hidden = cleaned.length < 2;
    searchResult.replaceChildren();
    if (cleaned.length < 2) return;
    const link = document.createElement('a');
    link.className = 'btn btn-dark';
    link.href = `pesquisa.html?q=${encodeURIComponent(cleaned)}`;
    link.textContent = `Pesquisar “${cleaned}” →`;
    searchResult.append(link);
  };
  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && searchInput.value.trim().length >= 2) {
      location.href = `pesquisa.html?q=${encodeURIComponent(searchInput.value.trim())}`;
    }
  });
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
})();


/* FPV Master v1 — filtros, pesquisa e estados */
(() => {
  const normalize = value => (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  // Current navigation state
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.desktop-nav a[href="formacao.html"]').forEach(a => {
    a.textContent = 'Formação & Certificação';
  });
  document.querySelectorAll('.mobile-menu a[href="formacao.html"]').forEach(a => {
    const number = a.querySelector('span')?.textContent || '04';
    a.innerHTML = '<span>' + number + '</span> Formação &amp; Certificação';
  });

  document.querySelectorAll('.desktop-nav a').forEach(a => {
    const href=(a.getAttribute('href')||'').split('?')[0].toLowerCase();
    const sectionMap = {
      'institucional.html':'federacao.html','assembleia-geral.html':'federacao.html','conselho-arbitragem.html':'federacao.html','documentacao.html':'federacao.html',
      'formacoes.html':'formacao.html','formacao-detalhe.html':'formacao.html',
      'projeto-olimpico.html':'alto-rendimento.html','historico-olimpico.html':'alto-rendimento.html',
      'classes.html':'descobrir.html'
    };
    if (href === (sectionMap[current] || current)) a.setAttribute('aria-current','page');
  });

  // Documentation explorer
  const docList=document.querySelector('[data-doc-list]');
  if(docList){
    const rows=[...docList.querySelectorAll('[data-document]')];
    const search=document.querySelector('[data-doc-search]');
    const category=document.querySelector('[data-doc-category]');
    const year=document.querySelector('[data-doc-year]');
    const sort=document.querySelector('[data-doc-sort]');
    const count=document.querySelector('[data-doc-count]');
    const empty=document.querySelector('[data-doc-empty]');
    const params=new URLSearchParams(location.search);
    if(params.get('search') && search) search.value=params.get('search');
    if(params.get('categoria') && category){
      const wanted=normalize(params.get('categoria'));
      [...category.options].forEach(o=>{ if(normalize(o.value)===wanted) category.value=o.value; });
    }
    if(params.get('subcategoria') && search) search.value=params.get('subcategoria');
    if(params.get('area') && search) search.value=params.get('area');

    const filterDocs=()=>{
      const q=normalize(search?.value);
      const c=category?.value||'all';
      const y=year?.value||'all';
      let visible=rows.filter(row=>{
        const hitQ=!q || normalize(row.dataset.search).includes(q);
        const hitC=c==='all' || row.dataset.category===c;
        const hitY=y==='all' || row.dataset.year===y;
        row.hidden=!(hitQ&&hitC&&hitY);
        return !row.hidden;
      });
      const mode=sort?.value||'recent';
      visible.sort((a,b)=>{
        if(mode==='az') return a.dataset.title.localeCompare(b.dataset.title,'pt');
        const ay=Number(a.dataset.year), by=Number(b.dataset.year);
        return mode==='old'? ay-by : by-ay;
      });
      visible.forEach(r=>docList.appendChild(r));
      if(count) count.textContent=`${visible.length} ${visible.length===1?'documento':'documentos'}`;
      if(empty) empty.hidden=visible.length!==0;
    };
    [search,category,year,sort].forEach(el=>el?.addEventListener(el.tagName==='INPUT'?'input':'change',filterDocs));
    document.querySelector('[data-doc-reset]')?.addEventListener('click',()=>{
      if(search)search.value=''; if(category)category.value='all'; if(year)year.value='all'; if(sort)sort.value='recent'; filterDocs();
    });
    filterDocs();
  }

  // Formation filters + deep-link
  const courseButtons=[...document.querySelectorAll('[data-course-filter]')];
  const courseRows=[...document.querySelectorAll('[data-course-kind]')];
  if(courseButtons.length){
    const wanted=new URLSearchParams(location.search).get('tipo')||'all';
    const apply=(kind)=>{
      courseButtons.forEach(b=>b.classList.toggle('active',b.dataset.courseFilter===kind));
      courseRows.forEach(r=>r.hidden=kind!=='all' && r.dataset.courseKind!==kind);
    };
    courseButtons.forEach(b=>b.addEventListener('click',()=>apply(b.dataset.courseFilter)));
    apply(courseButtons.some(b=>b.dataset.courseFilter===wanted)?wanted:'all');
  }

  // Search page
  const searchBox=document.querySelector('[data-global-search-page]');
  const resultHost=document.querySelector('[data-global-search-results]');
  const resultCount=document.querySelector('[data-global-search-count]');
  if(searchBox && resultHost){
    const index=[
      ['Página','Descobrir a Vela','Começar, experimentar, barcos e escolas','descobrir.html'],
      ['Descobrir','Classes de Vela','Percursos, classes praticadas, vela adaptada e olímpicas LA28','classes.html'],
      ['Página','Competição','Calendário, rankings, resultados e serviços competitivos','competicao.html'],
      ['Alto Rendimento','Atletas','Equipa Olímpica e atletas por classe','atletas-equipas.html'],
      ['Alto Rendimento','Projeto Olímpico — LA 2028','Ciclo olímpico atual e documentação','projeto-olimpico.html'],
      ['Federação','Centro de Documentação','Regulamentos, formulários, atas, relatórios e critérios','documentacao.html'],
      ['Federação','Conselho de Arbitragem','Arbitragem, formulários, mapas, atas e decisões','conselho-arbitragem.html'],
      ['Federação','Mesa da Assembleia Geral','Decisões, convocatórias e eleições','assembleia-geral.html'],
      ['Formação','Formação FPV','Certificação, treinadores e árbitros','formacao.html'],
      ['Formação','Curso de Treinadores de Vela — Grau II','Formação de treinadores · 2026','formacao-detalhe.html'],
      ['Clubes','Clubes e entidades','Pesquisa de clubes por Associação Regional','clubes.html'],
      ['Notícias','Notícias FPV','Atualidade da vela portuguesa','noticias.html'],
      ['Notícias','XXXVIII Campeonato de Portugal de Juniores e Absoluto','7 Jul 2026','artigo.html']
    ];
    const render=()=>{
      const q=normalize(searchBox.value);
      const matches=index.filter(item=>!q || normalize(item.join(' ')).includes(q));
      resultCount.textContent=q?`${matches.length} ${matches.length===1?'resultado':'resultados'} para “${searchBox.value}”`:`${matches.length} resultados`;
      resultHost.innerHTML=matches.map(([type,title,desc,url])=>`<article class="global-result"><span>${type}</span><div><strong>${title}</strong><small>${desc}</small></div><a href="${url}">Abrir →</a></article>`).join('') || '<div class="empty-state"><strong>Nenhum resultado encontrado.</strong><p>Experimenta outro termo de pesquisa.</p></div>';
    };
    const q=new URLSearchParams(location.search).get('q')||'';
    searchBox.value=q; render(); searchBox.addEventListener('input',render);
  }

  // Search overlay: suggestion buttons update search destination
  document.querySelectorAll('[data-suggestion]').forEach(btn=>btn.addEventListener('click',()=>{
    const input=document.querySelector('[data-search-input]');
    if(input){input.value=btn.dataset.suggestion; input.dispatchEvent(new Event('input',{bubbles:true}));}
  }));
})();


// FPV footer ecosystem — current fpvela.pt parity
(() => {
  const footer = document.querySelector('.site-footer');
  if (!footer || footer.querySelector('.fpv-supporters')) return;

  const svgIcons = {
    Facebook: '<svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M13.6 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.5 1.6-1.5H17V4c-.3 0-1.4-.1-2.6-.1-2.7 0-4.5 1.6-4.5 4.5V10H7v3h2.9v8h3.7Z"/></svg>',
    X: '<svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M18.9 2h3.7l-8.1 9.2L24 22h-7.4l-5.8-7.6L4.2 22H.5l8.5-9.7L0 2h7.6l5.2 6.9L18.9 2Zm-1.3 18.1h2L6.5 3.8H4.4l13.2 16.3Z"/></svg>',
    YouTube: '<svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15.3V8.7L15.8 12l-6.1 3.3Z"/></svg>'
  };
  const socialUrls = {
    Facebook: 'https://www.facebook.com/Federacaoportuguesadevela/',
    X: 'https://x.com/fp_vela',
    YouTube: 'https://www.youtube.com/channel/UCiWY5kshidF3N0tqkukSu_w'
  };
  footer.querySelectorAll('.footer-social a[aria-label]').forEach(a => {
    const name = a.getAttribute('aria-label');
    if (!svgIcons[name]) return;
    a.href = socialUrls[name];
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = svgIcons[name];
  });

  const social = footer.querySelector('.footer-social');
  if (social && !social.querySelector('a[aria-label="Instagram"]')) {
    const instagram = document.createElement('a');
    instagram.setAttribute('aria-label', 'Instagram');
    instagram.href = 'https://www.instagram.com/fpvela_oficial/';
    instagram.target = '_blank';
    instagram.rel = 'noopener noreferrer';
    instagram.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm8.7 1.5a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>';
    social.appendChild(instagram);
  }

  const logo = (pos, label) =>
    '<span class="fpv-logo-mark" aria-hidden="true" style="background-position:center ' + pos + 'px"></span><span class="sr-only">' + label + '</span>';
  const ext = (href, pos, label, cls='') =>
    '<a class="fpv-support-link ' + cls + '" href="' + href + '" target="_blank" rel="noopener noreferrer" aria-label="' + label + '">' + logo(pos, label) + '</a>';

  const section = document.createElement('section');
  section.className = 'fpv-supporters';
  section.setAttribute('aria-label', 'Entidades, patrocinadores e parcerias');
  section.innerHTML = `
    <div class="container fpv-supporters-inner">
      <div class="fpv-institutional-logos" aria-label="Entidades institucionais">
        ${ext('https://ipdj.gov.pt/', 0, 'Instituto Português do Desporto e Juventude')}
        ${ext('https://comiteolimpicoportugal.pt/', -75, 'Comité Olímpico de Portugal')}
        ${ext('https://paralimpicos.pt/', -150, 'Comité Paralímpico de Portugal')}
        ${ext('https://ipdj.gov.pt/pt/plano-nacional-de-etica-no-desporto-pned', -225, 'Plano Nacional de Ética no Desporto', 'fpv-support-link--wide')}
        ${ext('https://www.sailing.org/', -300, 'World Sailing')}
        ${ext('https://eurosaf.org/', -375, 'EUROSAF')}
        ${ext('https://orc.org/', -450, 'Offshore Racing Congress')}
      </div>

      <div class="fpv-cofunded" aria-label="Cofinanciamento">
        <span class="fpv-logo-mark fpv-logo-mark--funding" aria-hidden="true" style="background-position:center -525px"></span>
        <span class="sr-only">Cofinanciado por COMPETE 2020, Portugal 2020 e União Europeia — Fundo Europeu de Desenvolvimento Regional</span>
      </div>

      <div class="fpv-sponsor-block">
        <h2>Patrocinadores</h2>
        ${ext('https://www.fidelidade.pt/', -600, 'Fidelidade', 'fpv-support-link--sponsor')}
      </div>

      <div class="fpv-partner-block">
        <h2>Parcerias</h2>
        <div class="fpv-partners-grid">
          ${ext('https://www.alpha-ropes.com/', -675, 'Alpha Ropes', 'fpv-support-link--partner')}
          ${ext('https://companhianautica.com/', -750, 'Companhia Náutica', 'fpv-support-link--partner')}
          ${ext('https://www.dompedro.com/pt/', -825, 'Dom Pedro Hotels', 'fpv-support-link--partner')}
          ${ext('https://www.cnalges.pt/', -900, 'Centro Náutico de Algés', 'fpv-support-link--partner')}
          ${ext('https://www.sopromar.com/', -975, 'Sopromar Centro Náutico', 'fpv-support-link--partner')}
        </div>
      </div>
    </div>`;

  const bottom = footer.querySelector('.footer-bottom');
  if (bottom) bottom.insertAdjacentElement('beforebegin', section);
  else footer.appendChild(section);
})();


// FPV legal footer — local policies
(() => {
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  const links = footer.querySelector('.footer-bottom > div');
  if (!links) return;

  const privacy = [...links.querySelectorAll('a')].find(a => a.textContent.trim() === 'Privacidade');
  if (privacy) {
    privacy.href = 'privacidade.html';
    privacy.removeAttribute('target');
    privacy.removeAttribute('rel');
  }

  if (![...links.querySelectorAll('a')].some(a => a.textContent.trim() === 'Cookies')) {
    const cookies = document.createElement('a');
    cookies.href = 'cookies.html';
    cookies.textContent = 'Cookies';
    if (privacy?.nextSibling) links.insertBefore(cookies, privacy.nextSibling);
    else links.appendChild(cookies);
  }
})();
