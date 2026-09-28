(() => {
  const normalize = value => (value || '').toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  const ordinal = n => Number.isFinite(Number(n)) ? Number(n) + '.º' : '—';
  const escapeHtml = value => String(value || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

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
      if (count) count.textContent = n + ' ' + (n === 1 ? 'resultado' : 'resultados');
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
      clubs.slice().sort((a,b) => (a.club || '').localeCompare(b.club || '', 'pt')).forEach(club => {
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
  const urlInput = form.querySelector('[data-result-url]');
  const pdfInput = form.querySelector('[data-result-pdf]');
  const fileName = form.querySelector('[data-result-file-name]');
  const testUrlButton = form.querySelector('[data-test-result-url]');
  const testPdfButton = form.querySelector('[data-test-result-pdf]');
  const analysisHost = form.querySelector('[data-result-analysis]');
  const athleteInput = form.querySelector('[name="velejador"]');
  const declaredResult = form.querySelector('[name="resultado"]');
  const overlay = document.querySelector('[data-result-review]');
  const dataHost = document.querySelector('[data-result-review-data]');
  const confirmation = document.querySelector('[data-result-confirmation]');
  const simulate = document.querySelector('[data-simulate-submit]');

  let lastAnalysis = null;

  const setError = message => {
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  };

  const sourceAvailable = () => Boolean(urlInput?.value.trim() || pdfInput?.files?.[0]);

  pdfInput?.addEventListener('change', () => {
    const file = pdfInput.files?.[0];
    if (fileName) fileName.textContent = file ? file.name : '';
    setError('');
    if (file && file.size > 12 * 1024 * 1024) {
      setError('O PDF excede 12 MB.');
      pdfInput.value = '';
      if (fileName) fileName.textContent = '';
    }
    lastAnalysis = null;
    if (analysisHost) analysisHost.hidden = true;
  });

  urlInput?.addEventListener('input', () => {
    lastAnalysis = null;
    if (analysisHost) analysisHost.hidden = true;
  });

  function renderLoading(label) {
    if (!analysisHost) return;
    analysisHost.hidden = false;
    analysisHost.className = 'result-analysis result-analysis--loading';
    analysisHost.innerHTML = '<strong>' + escapeHtml(label) + '</strong><p>Procuro a classificação e calculo a posição do país até ao velejador indicado.</p>';
  }

  function mapServerResult(payload, sourceLabel) {
    const a = payload?.analysis;
    if (!a) {
      return {
        found:false,
        rows:payload?.rows_parsed || 0,
        reason:payload?.note || 'Não foi possível identificar a classificação nesta fonte.',
        sourceLabel
      };
    }
    return {
      found:true,
      rows:a.rows_parsed || 0,
      athlete:a.athlete || athleteInput?.value || '',
      general:a.result_general,
      country:a.country_code || '—',
      countryResult:a.result_country,
      evidence:a.evidence || '',
      confidence:a.confidence || 'média',
      sourceLabel,
      sourceUrl:payload?.source_url || '',
      sourceType:payload?.source_type || ''
    };
  }

  function renderAnalysis(result) {
    if (!analysisHost) return;
    analysisHost.hidden = false;

    const declared = Number((declaredResult?.value || '').match(/\d+/)?.[0] || NaN);
    const agrees = result.found && Number.isFinite(declared) ? declared === Number(result.general) : null;

    if (!result.found) {
      analysisHost.className = 'result-analysis result-analysis--manual';
      analysisHost.innerHTML =
        '<span class="result-analysis-kicker">Validação manual</span>' +
        '<strong>Não consegui fechar o cálculo automaticamente.</strong>' +
        '<p>' + escapeHtml(result.reason) + '</p>' +
        '<small>Fonte: ' + escapeHtml(result.sourceLabel || 'fonte oficial') + '</small>';
      lastAnalysis = result;
      return;
    }

    analysisHost.className = 'result-analysis result-analysis--success';
    const compare = agrees === true
      ? '<span class="analysis-match analysis-match--ok">O resultado indicado coincide com a fonte.</span>'
      : agrees === false
        ? '<span class="analysis-match analysis-match--warn">Atenção: indicaste ' + ordinal(declared) + ', mas a leitura encontrou ' + ordinal(result.general) + '.</span>'
        : '';

    const sourceLink = result.sourceUrl
      ? '<a class="analysis-source-link" href="' + escapeHtml(result.sourceUrl) + '" target="_blank" rel="noreferrer">Abrir fonte analisada ↗</a>'
      : '';

    analysisHost.innerHTML =
      '<div class="result-analysis-head"><div><span class="result-analysis-kicker">Leitura automática</span><strong>Resultado identificado</strong></div><span class="analysis-confidence">Confiança ' + escapeHtml(result.confidence) + '</span></div>' +
      '<div class="result-analysis-grid">' +
        '<div><span>Resultado geral</span><strong>' + ordinal(result.general) + '</strong></div>' +
        '<div><span>Resultado País</span><strong>' + ordinal(result.countryResult) + '</strong></div>' +
        '<div><span>País</span><strong>' + escapeHtml(result.country) + '</strong></div>' +
        '<div><span>Linhas lidas</span><strong>' + escapeHtml(result.rows || '—') + '</strong></div>' +
      '</div>' +
      compare +
      (result.evidence ? '<details><summary>Ver linha encontrada</summary><code>' + escapeHtml(result.evidence) + '</code></details>' : '') +
      sourceLink +
      '<p class="analysis-caveat">Este cálculo é uma ajuda à validação. A FPV deve confirmar sempre a classificação oficial antes de publicar.</p>';

    lastAnalysis = result;
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new Error(payload?.error || 'Não foi possível analisar a fonte.');
    return payload;
  }

  async function analyzeUrl() {
    const url = urlInput?.value.trim();
    if (!athleteInput?.value.trim()) throw new Error('Preenche primeiro o campo “Velejador / tripulação”.');
    if (!url) throw new Error('Cola primeiro o link oficial.');
    if (/^file:/i.test(url)) throw new Error('Um endereço file:/// só existe no teu computador. Usa “Carregar PDF”.');

    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('Indica um link http/https válido.'); }
    if (!['http:','https:'].includes(parsed.protocol)) throw new Error('Indica um link http/https válido.');

    renderLoading('A analisar o link no servidor…');
    const payload = await requestJson('/api/analyze-url', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({url,athlete:athleteInput.value.trim()})
    });
    renderAnalysis(mapServerResult(payload, parsed.hostname + ' · link oficial'));
  }

  async function analyzePdf() {
    const file = pdfInput?.files?.[0];
    if (!athleteInput?.value.trim()) throw new Error('Preenche primeiro o campo “Velejador / tripulação”.');
    if (!file) throw new Error('Seleciona primeiro um PDF.');
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('O ficheiro tem de ser PDF.');
    if (file.size > 12 * 1024 * 1024) throw new Error('O PDF excede 12 MB.');

    renderLoading('A analisar o PDF no servidor…');
    const data = new FormData();
    data.append('file', file);
    data.append('athlete', athleteInput.value.trim());

    const payload = await requestJson('/api/analyze-pdf', { method:'POST', body:data });
    renderAnalysis(mapServerResult(payload, file.name + ' · PDF'));
  }

  async function runAnalysis(button, fn) {
    setError('');
    button.disabled = true;
    try {
      await fn();
    } catch (e) {
      const message = String(e.message || e);
      setError(message);
      if (analysisHost) {
        analysisHost.hidden = false;
        analysisHost.className = 'result-analysis result-analysis--manual';
        analysisHost.innerHTML =
          '<span class="result-analysis-kicker">Não foi possível analisar</span>' +
          '<strong>Esta fonte precisa de validação manual.</strong>' +
          '<p>' + escapeHtml(message) + '</p>';
      }
    } finally {
      button.disabled = false;
    }
  }

  testUrlButton?.addEventListener('click', () => runAnalysis(testUrlButton, analyzeUrl));
  testPdfButton?.addEventListener('click', () => runAnalysis(testPdfButton, analyzePdf));

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
    setError('');
    if (!form.reportValidity()) return;

    if (start?.value && end?.value && end.value < start.value) {
      setError('A data de fim não pode ser anterior à data de início.');
      end.focus();
      return;
    }

    if (!sourceAvailable()) {
      setError('Indica um link oficial ou carrega o PDF dos resultados.');
      urlInput?.focus();
      return;
    }

    const values = new FormData(form);
    const file = pdfInput?.files?.[0];
    const sourceValue = values.get('link_resultados') || (file ? file.name + ' (PDF)' : '—');
    const labels = [
      ['Data de início', values.get('data_inicio')],
      ['Data de fim', values.get('data_fim')],
      ['Velejador / tripulação', values.get('velejador')],
      ['Clube', values.get('clube')],
      ['Resultado', values.get('resultado')],
      ['Fonte oficial', sourceValue]
    ];

    if (lastAnalysis?.found) {
      labels.push(['Leitura automática', ordinal(lastAnalysis.general) + ' geral · ' + ordinal(lastAnalysis.countryResult) + ' por país']);
    }

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