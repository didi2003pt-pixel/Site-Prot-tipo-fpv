
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


/* FPV Master v1 — filtros, pesquisa e estados */
(() => {
  const normalize = value => (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  // Current navigation state
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.desktop-nav a').forEach(a => {
    const href=(a.getAttribute('href')||'').split('?')[0].toLowerCase();
    const sectionMap = {
      'institucional.html':'federacao.html','assembleia-geral.html':'federacao.html','conselho-arbitragem.html':'federacao.html','documentacao.html':'federacao.html',
      'formacoes.html':'formacao.html','formacao-detalhe.html':'formacao.html',
      'projeto-olimpico.html':'alto-rendimento.html','historico-olimpico.html':'alto-rendimento.html'
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
      ['Página','Competição','Calendário, rankings, resultados e serviços competitivos','competicao.html'],
      ['Alto Rendimento','Atletas','Equipa Olímpica e atletas por classe','atletas-equipas.html'],
      ['Alto Rendimento','Projeto Olímpico — LA 2028','Ciclo olímpico atual e documentação','projeto-olimpico.html'],
      ['Federação','Centro de Documentação','Regulamentos, formulários, atas, relatórios e critérios','documentacao.html'],
      ['Federação','Conselho de Arbitragem','Arbitragem, formulários, mapas, atas e decisões','conselho-arbitragem.html'],
      ['Federação','Mesa da Assembleia Geral','Decisões, convocatórias e eleições','assembleia-geral.html'],
      ['Formação','Formação FPV','Certificação, treinadores e árbitros','formacao.html'],
      ['Formação','Curso de Treinadores de Vela — Grau II','Formação de treinadores · 2026','formacao-detalhe.html'],
      ['Clubes','Clubes e entidades','Pesquisa de clubes por região','clubes.html'],
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
