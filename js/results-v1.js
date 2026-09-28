(() => {
  const normalize = value => (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  // Public results filters
  const list = document.querySelector('[data-results-list]');
  if (list) {
    const rows = [...list.querySelectorAll('[data-result]')];
    const search = document.querySelector('[data-result-search]');
    const year = document.querySelector('[data-result-year]');
    const resultClass = document.querySelector('[data-result-class]');
    const count = document.querySelector('[data-result-count]');
    const empty = document.querySelector('[data-results-empty]');

    const apply = () => {
      const q = normalize(search?.value);
      const y = year?.value || 'all';
      const c = resultClass?.value || 'all';
      let n = 0;
      rows.forEach(row => {
        const show = (!q || normalize(row.dataset.search).includes(q))
          && (y === 'all' || row.dataset.year === y)
          && (c === 'all' || row.dataset.class === c);
        row.hidden = !show;
        if (show) n++;
      });
      if (count) count.textContent = `${n} ${n === 1 ? 'resultado' : 'resultados'}`;
      if (empty) empty.hidden = n !== 0;
    };
    [search, year, resultClass].forEach(el => el?.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', apply));
    apply();
  }

  // Submission form
  const form = document.querySelector('[data-result-form]');
  if (!form) return;

  const clubSelect = form.querySelector('[data-result-club]');
  fetch('assets/clubes-fpv.json')
    .then(r => r.ok ? r.json() : [])
    .then(clubs => {
      clubs
        .slice()
        .sort((a,b) => (a.club || '').localeCompare(b.club || '', 'pt'))
        .forEach(club => {
          const option = document.createElement('option');
          option.value = club.club;
          option.textContent = club.club;
          clubSelect?.appendChild(option);
        });
    })
    .catch(() => {});

  const start = form.querySelector('[data-start-date]');
  const end = form.querySelector('[data-end-date]');
  const error = form.querySelector('[data-result-form-error]');
  const overlay = document.querySelector('[data-result-review]');
  const dataHost = document.querySelector('[data-result-review-data]');
  const confirmation = document.querySelector('[data-result-confirmation]');
  const simulate = document.querySelector('[data-simulate-submit]');

  const close = () => {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove('result-review-open');
    confirmation && (confirmation.hidden = true);
    simulate && (simulate.hidden = false);
  };
  document.querySelectorAll('[data-close-result-review]').forEach(el => el.addEventListener('click', close));

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (error) { error.hidden = true; error.textContent = ''; }

    if (!form.reportValidity()) return;

    if (start?.value && end?.value && end.value < start.value) {
      if (error) {
        error.textContent = 'A data de fim não pode ser anterior à data de início.';
        error.hidden = false;
      }
      end.focus();
      return;
    }

    const values = new FormData(form);
    const labels = [
      ['Data de início', values.get('data_inicio')],
      ['Data de fim', values.get('data_fim')],
      ['Velejador / tripulação', values.get('velejador')],
      ['Clube', values.get('clube')],
      ['Resultado', values.get('resultado')],
      ['Link oficial', values.get('link_resultados')]
    ];

    if (dataHost) {
      dataHost.replaceChildren(...labels.map(([label,value]) => {
        const row = document.createElement('div');
        const l = document.createElement('span');
        const v = document.createElement('strong');
        l.textContent = label;
        v.textContent = value || '—';
        row.append(l,v);
        return row;
      }));
    }

    if (overlay) {
      overlay.hidden = false;
      document.body.classList.add('result-review-open');
      setTimeout(() => overlay.querySelector('.close-btn')?.focus(), 0);
    }
  });

  simulate?.addEventListener('click', () => {
    simulate.hidden = true;
    if (confirmation) confirmation.hidden = false;
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay && !overlay.hidden) close();
  });
})();