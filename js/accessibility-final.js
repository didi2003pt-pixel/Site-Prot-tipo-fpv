(()=> {
  const body=document.body;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  // Explicit search label and current navigation state.
  document.querySelectorAll('[data-open-search]').forEach(btn=>{
    if(!btn.querySelector('.search-label')){
      const label=document.createElement('span');
      label.className='search-label';
      label.textContent='Pesquisar';
      btn.appendChild(label);
    }
  });
  const sectionMap={
    'institucional.html':'federacao.html','assembleia-geral.html':'federacao.html',
    'conselho-arbitragem.html':'federacao.html','documentacao.html':'federacao.html',
    'formacoes.html':'formacao.html','formacao-detalhe.html':'formacao.html',
    'projeto-olimpico.html':'alto-rendimento.html','historico-olimpico.html':'alto-rendimento.html',
    'perfil-alto-rendimento.html':'alto-rendimento.html','atletas-equipas.html':'alto-rendimento.html',
    'estrutura-alto-rendimento.html':'alto-rendimento.html','clube.html':'clubes.html',
    'resultados-internacionais.html':'competicao.html','submeter-resultado.html':'competicao.html'
  };
  document.querySelectorAll('.desktop-nav a').forEach(a=>{
    const href=(a.getAttribute('href')||'').split('?')[0].toLowerCase();
    if(href===(sectionMap[page]||page)) a.setAttribute('aria-current','page');
  });

  // Ensure skip link exists.
  if(!document.querySelector('.skip-link')){
    const skip=document.createElement('a');
    skip.className='skip-link'; skip.href='#conteudo'; skip.textContent='Saltar para o conteúdo';
    body.prepend(skip);
  }
  const main=document.querySelector('main');
  if(main && !main.id) main.id='conteudo';

  // Add profile links to every club card without duplicating existing ones.
  document.querySelectorAll('.real-club-card[data-club-id]').forEach(card=>{
    if(card.querySelector('.club-profile-link')) return;
    const slug=card.dataset.clubId;
    const a=document.createElement('a');
    a.className='club-profile-link';
    a.href='clube.html?clube='+encodeURIComponent(slug);
    a.innerHTML='<span>Ver perfil do clube</span><span aria-hidden="true">→</span>';
    const maps=card.querySelector('.club-maps-link');
    if(maps) card.insertBefore(a,maps); else card.appendChild(a);
  });

  // Focus management for the search dialog.
  const overlay=document.querySelector('[data-search-overlay]');
  if(overlay){
    const panel=overlay.querySelector('.search-panel');
    let previousFocus=null;
    const focusables=()=>[...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
    document.querySelectorAll('[data-open-search]').forEach(btn=>btn.addEventListener('click',()=>{previousFocus=btn;}));
    const observer=new MutationObserver(()=>{
      if(overlay.classList.contains('active')){
        const f=focusables(); if(f.length) setTimeout(()=>f[0].focus(),0);
      } else if(previousFocus && document.contains(previousFocus)){ previousFocus.focus(); previousFocus=null; }
    });
    observer.observe(overlay,{attributes:true,attributeFilter:['class']});
    overlay.addEventListener('keydown',e=>{
      if(e.key!=='Tab'||!overlay.classList.contains('active')) return;
      const f=focusables(); if(!f.length) return;
      const first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
  }
})();