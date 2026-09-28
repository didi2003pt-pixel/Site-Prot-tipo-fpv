(() => {
  const normalize = value => (value || '').toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  const ordinal = n => Number.isFinite(Number(n)) ? Number(n) + '.º' : '—';

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
  const testButton = form.querySelector('[data-test-result-source]');
  const analysisHost = form.querySelector('[data-result-analysis]');
  const athleteInput = form.querySelector('[name="velejador"]');
  const declaredResult = form.querySelector('[name="resultado"]');
  const overlay = document.querySelector('[data-result-review]');
  const dataHost = document.querySelector('[data-result-review-data]');
  const confirmation = document.querySelector('[data-result-confirmation]');
  const simulate = document.querySelector('[data-simulate-submit]');

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

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
    if (file && file.size > 12 * 1024 * 1024) {
      setError('O PDF excede 12 MB.');
      pdfInput.value = '';
      if (fileName) fileName.textContent = '';
    } else {
      setError('');
    }
    lastAnalysis = null;
    if (analysisHost) analysisHost.hidden = true;
  });

  urlInput?.addEventListener('input', () => {
    lastAnalysis = null;
    if (analysisHost) analysisHost.hidden = true;
  });

  function groupPdfItemsIntoLines(items) {
    const groups = [];
    for (const item of items) {
      const str = (item.str || '').trim();
      if (!str) continue;
      const x = item.transform?.[4] || 0;
      const y = item.transform?.[5] || 0;
      let group = groups.find(g => Math.abs(g.y - y) <= 2.2);
      if (!group) {
        group = { y, parts: [] };
        groups.push(group);
      }
      group.parts.push({ x, str });
    }
    return groups
      .sort((a,b) => b.y - a.y)
      .map(g => g.parts.sort((a,b) => a.x - b.x).map(p => p.str).join(' ').replace(/\s+/g,' ').trim())
      .filter(Boolean);
  }

  async function readPdf(arrayBuffer) {
    if (!window.pdfjsLib) throw new Error('O leitor de PDF não ficou disponível. Atualiza a página e tenta novamente.');
    const task = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const doc = await task.promise;
    const lines = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      lines.push(...groupPdfItemsIntoLines(content.items));
    }
    return { lines, pages: doc.numPages };
  }

  function firstCountryCode(line) {
    const matches = line.match(/\b[A-Z]{3}\b/g) || [];
    const exclusions = new Set(['BFD','DNF','DNS','DSQ','DNC','RET','OCS','UFD','DPI','RDG','SCP','DNE']);
    return matches.find(code => !exclusions.has(code)) || null;
  }

  function rankFromLine(line) {
    const m = String(line).match(/^\s*(\d{1,4})(?:\.|º|ª|\)|\s)/);
    return m ? Number(m[1]) : null;
  }

  function athleteMatches(line, athlete) {
    const hay = normalize(line);
    const tokens = normalize(athlete).split(' ').filter(t => t.length > 1);
    return tokens.length > 0 && tokens.every(token => hay.includes(token));
  }

  function analyzeClassificationLines(lines, athlete) {
    const rows = [];
    for (const line of lines) {
      const rank = rankFromLine(line);
      const country = firstCountryCode(line);
      if (rank && country) rows.push({ rank, country, line });
    }

    if (!rows.length) {
      return { found:false, rows:0, reason:'Não encontrei linhas de classificação com posição e código de país.' };
    }

    const target = rows.find(r => athleteMatches(r.line, athlete));
    if (!target) {
      return {
        found:false,
        rows:rows.length,
        reason:'Li a classificação, mas não consegui identificar o velejador/tripulação indicado.'
      };
    }

    const ordered = rows.slice().sort((a,b) => a.rank - b.rank);
    const countries = [];
    for (const row of ordered) {
      if (!countries.includes(row.country)) countries.push(row.country);
      if (row === target || (row.rank === target.rank && row.line === target.line)) break;
    }

    const resultCountry = countries.indexOf(target.country) + 1;
    const duplicateRankCount = ordered.length - new Set(ordered.map(r => r.rank)).size;
    const confidence = rows.length >= 10 && duplicateRankCount <= Math.max(2, Math.floor(rows.length * 0.08)) ? 'alta' : 'média';

    return {
      found:true,
      rows:rows.length,
      athlete,
      general:target.rank,
      country:target.country,
      countryResult:resultCountry > 0 ? resultCountry : null,
      evidence:target.line,
      confidence,
      duplicateRankCount
    };
  }

  function rowsFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const lines = [];
    doc.querySelectorAll('tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('th,td')].map(cell => cell.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);
      if (cells.length) lines.push(cells.join(' '));
    });
    if (!lines.length) {
      doc.querySelectorAll('p,li,div').forEach(el => {
        const text = el.textContent.replace(/\s+/g,' ').trim();
        if (text && text.length < 500) lines.push(text);
      });
    }
    return lines;
  }

  function renderAnalysis(result, sourceLabel, extra = {}) {
    if (!analysisHost) return;
    analysisHost.hidden = false;
    const declared = Number((declaredResult?.value || '').match(/\d+/)?.[0] || NaN);
    const agrees = result.found && Number.isFinite(declared) ? declared === result.general : null;

    if (!result.found) {
      analysisHost.className = 'result-analysis result-analysis--manual';
      analysisHost.innerHTML =
        '<span class="result-analysis-kicker">Validação manual</span>' +
        '<strong>Não consegui fechar o cálculo automaticamente.</strong>' +
        '<p>' + result.reason + '</p>' +
        '<small>Fonte: ' + sourceLabel + (result.rows ? ' · ' + result.rows + ' linhas de classificação detetadas' : '') + '</small>';
      lastAnalysis = { ...result, sourceLabel, ...extra };
      return;
    }

    analysisHost.className = 'result-analysis result-analysis--success';
    const compare = agrees === true
      ? '<span class="analysis-match analysis-match--ok">O resultado indicado coincide com a fonte.</span>'
      : agrees === false
        ? '<span class="analysis-match analysis-match--warn">Atenção: indicaste ' + ordinal(declared) + ', mas a leitura encontrou ' + ordinal(result.general) + '.</span>'
        : '';

    analysisHost.innerHTML =
      '<div class="result-analysis-head"><div><span class="result-analysis-kicker">Leitura experimental</span><strong>Resultado identificado</strong></div><span class="analysis-confidence">Confiança ' + result.confidence + '</span></div>' +
      '<div class="result-analysis-grid">' +
        '<div><span>Resultado geral</span><strong>' + ordinal(result.general) + '</strong></div>' +
        '<div><span>Resultado País</span><strong>' + ordinal(result.countryResult) + '</strong></div>' +
        '<div><span>País</span><strong>' + result.country + '</strong></div>' +
        '<div><span>Linhas lidas</span><strong>' + result.rows + '</strong></div>' +
      '</div>' +
      compare +
      '<details><summary>Ver linha encontrada</summary><code>' + result.evidence.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</code></details>' +
      '<p class="analysis-caveat">Este cálculo é uma ajuda à validação. A FPV deve confirmar sempre a classificação oficial antes de publicar.</p>';

    lastAnalysis = { ...result, sourceLabel, ...extra };
  }

  async function analyzePdfFile(file) {
    if (!file) throw new Error('Seleciona um PDF.');
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('O ficheiro tem de ser PDF.');
    if (file.size > 12 * 1024 * 1024) throw new Error('O PDF excede 12 MB.');
    const parsed = await readPdf(await file.arrayBuffer());
    const result = analyzeClassificationLines(parsed.lines, athleteInput?.value || '');
    renderAnalysis(result, file.name, { sourceType:'pdf', pages:parsed.pages });
  }

  async function analyzeUrl(url) {
    if (/^file:/i.test(url)) throw new Error('Um endereço file:/// só existe no teu computador. Seleciona esse ficheiro em “Carregar PDF”.');
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch { throw new Error('Indica um link http/https válido.'); }
    if (!['http:','https:'].includes(parsedUrl.protocol)) throw new Error('Indica um link público http/https.');

    let response;
    try {
      response = await fetch(parsedUrl.toString(), { mode:'cors' });
    } catch {
      throw new Error('O browser não conseguiu abrir este link diretamente. Se for um PDF, transfere-o e usa “Carregar PDF”. No sistema final, o servidor WordPress poderá fazer esta leitura sem esta limitação do browser.');
    }
    if (!response.ok) throw new Error('A fonte respondeu com HTTP ' + response.status + '.');

    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (type.includes('pdf') || /\.pdf(?:$|\?)/i.test(parsedUrl.pathname + parsedUrl.search)) {
      const parsed = await readPdf(await response.arrayBuffer());
      const result = analyzeClassificationLines(parsed.lines, athleteInput?.value || '');
      renderAnalysis(result, parsedUrl.hostname + ' · PDF', { sourceType:'pdf-url', pages:parsed.pages });
      return;
    }

    const html = await response.text();
    const lines = rowsFromHtml(html);
    const result = analyzeClassificationLines(lines, athleteInput?.value || '');
    renderAnalysis(result, parsedUrl.hostname + ' · página web', { sourceType:'html' });
  }

  testButton?.addEventListener('click', async () => {
    setError('');
    if (analysisHost) {
      analysisHost.hidden = false;
      analysisHost.className = 'result-analysis result-analysis--loading';
      analysisHost.innerHTML = '<strong>A analisar a fonte…</strong><p>Procuro a classificação e os países até ao velejador indicado.</p>';
    }

    if (!athleteInput?.value.trim()) {
      setError('Preenche primeiro o campo “Velejador / tripulação”.');
      athleteInput?.focus();
      if (analysisHost) analysisHost.hidden = true;
      return;
    }

    const file = pdfInput?.files?.[0];
    const url = urlInput?.value.trim();

    if (!file && !url) {
      setError('Indica um link oficial ou carrega o PDF dos resultados.');
      if (analysisHost) analysisHost.hidden = true;
      return;
    }

    testButton.disabled = true;
    try {
      if (file) await analyzePdfFile(file);
      else await analyzeUrl(url);
    } catch (e) {
      if (analysisHost) {
        analysisHost.hidden = false;
        analysisHost.className = 'result-analysis result-analysis--manual';
        analysisHost.innerHTML = '<span class="result-analysis-kicker">Não foi possível analisar</span><strong>Esta fonte precisa de outro caminho.</strong><p>' + String(e.message || e).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p>';
      }
    } finally {
      testButton.disabled = false;
    }
  });

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