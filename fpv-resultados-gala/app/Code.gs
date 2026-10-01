const SPREADSHEET_ID = '1dsZUfvE32-QHOiLWw_oV9HVndptgihclEM2ZZQYMa18';
const SHEET_NAME = 'Submissões';
const PDF_FOLDER_ID = '1no4n9kFXx9HjXY3N2H87b7ebzbRfsael';

const CLUBS = [
  "Alhandra Sporting Club",
  "Angra Iate Clube",
  "Associação Náutica da Gafanha da Encarnação",
  "Associação Náutica da Madeira",
  "Associação Náutica da Torreira",
  "Associação Náutica do Seixal",
  "Associação Naval de Lisboa",
  "Associação Naval do Guadiana",
  "AVELA - Associação Aveirense de Vela de Cruzeiro",
  "Beira Mar Náutica — Associação Desportiva",
  "Capable Planet Clube Náutico",
  "Centro Náutico de São Martinho do Porto",
  "Centro Treino Mar",
  "CIMAV - Clube Internacional da Marina de Vilamoura",
  "Clube Amigos da Vela de Cruzeiro e do Mar",
  "Clube de Caça e Pesca do Alto Douro",
  "Clube de Vela Atlântico",
  "Clube de Vela Costa Nova",
  "Clube de Vela de Lagos",
  "Clube de Vela de Portugal",
  "CLUBE DE VELA DE VIANA DO CASTELO",
  "Clube de Vela do Barreiro",
  "Clube de vela do Sado",
  "Clube de Vela e Canoagem de Montargil",
  "Clube Desportivo de Paço de Arcos",
  "Clube do Mar Costa do Sol",
  "Clube do Mar de Coimbra - Associação para o Desenvolvimento da Vela",
  "Clube Dom Pedro",
  "Clube dos Oficiais da Marinha Mercante",
  "Clube Fluvial Vilacondense",
  "Clube Força 5",
  "Clube Náutico Boca da Barra",
  "Clube Náutico da Figueira da Foz",
  "Clube Náutico da Lagoa",
  "Clube Náutico das Lajes do Pico",
  "Clube Náutico de Almada",
  "Clube Náutico de Angra do Heroísmo",
  "Clube Náutico de Caldas de Aregos",
  "Clube Náutico de Sines",
  "Clube Náutico de Tavira",
  "Clube Náutico dos Oficiais e Cadetes da Armada",
  "Clube Naval da Calheta",
  "Clube Naval da Fuzeta",
  "Clube Naval da Horta",
  "Clube Naval da Ilha Graciosa",
  "Clube Naval da Madalena",
  "Clube Naval da Nazaré",
  "Clube Naval da Povoação",
  "Clube Naval da Praia da Vitória",
  "Clube Naval de Cascais",
  "Clube Naval de Lajes das Flores",
  "Clube Naval de Leça",
  "Clube Naval de Lisboa",
  "Clube Naval de Peniche",
  "Clube Naval de Ponta Delgada",
  "Clube Naval de Portimão",
  "Clube Naval de Santa Maria",
  "Clube Naval de São João do Porto",
  "Clube Naval de São Mateus da Calheta",
  "Clube Naval de São Roque do Pico",
  "Clube Naval de Sesimbra",
  "Clube Naval de Velas",
  "Clube Naval de Vila Franca do Campo",
  "Clube Naval do Funchal",
  "Clube Naval do Porto Santo",
  "Clube Naval do Seixal",
  "Clube Naval Povoense",
  "Clube Naval Setubalense",
  "Clube Nortada Aventura",
  "Clube Sportivo de Pedrouços",
  "Clube Turismo da Madeira",
  "Clube We Do Sailing / BBDOURO",
  "Douro Gaia Sport Club",
  "Escola Nacional de Vela Adaptada",
  "Fórum Esposendense",
  "Foz do Ave Sailing Team",
  "Ginásio Clube Naval de Faro",
  "Grupo Naval de Olhão",
  "Iate Clube da Marina de Portimão",
  "Iate Clube Santa Cruz",
  "Lisbon International Sailing Club",
  "Mentor- Academia de Desenvolvimento de Competências Pessoais e Desportivas",
  "NÁUTICA DESPORTIVA OVARENSE - NADO",
  "Náutico Clube Boa Esperança",
  "Seawoman — Associação para a Promoção da Mulher através do Desporto e Atividades Náuticas",
  "Sharpie Club Portugal",
  "Sport Algés e Dafundo",
  "Sport Club do Porto",
  "Sporting Clube de Aveiro",
  "União Desportiva Vilafranquense",
  "Vela Solidária",
  "Yate Clube do Porto"
];

const COL = {
  ID:1,SUBMITTED_AT:2,EMAIL:3,START_DATE:4,END_DATE:5,ATHLETE:6,CLUB:7,
  DECLARED_RESULT:8,SOURCE_TYPE:9,SOURCE_URL:10,PDF_URL:11,DETECTED_GENERAL:12,
  RESULT_COUNTRY:13,COUNTRY_CODE:14,PARTICIPANTS:15,PARTICIPANT_COUNTRIES:16,
  CLASS:17,EVENT:18,LOCATION:19,CONFIDENCE:20,ANALYSIS_STATUS:21,FPV_STATUS:22,
  NOTES:23,VALIDATED_BY:24,VALIDATED_AT:25,EMAIL_SENT:26,EMAIL_AT:27,EMAIL_ERROR:28
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('FPV — Resultados Internacionais')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getClubs() {
  return CLUBS.slice();
}

function analyzeUrlServer(url, athlete, declaredResult) {
  return analyzeUrl_(String(url || ''), String(athlete || ''), String(declaredResult || ''));
}

function submitResult(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    payload = payload || {};
    if (clean_(payload.website)) throw new Error('Submissão inválida.');

    const email = clean_(payload.email);
    const startDate = clean_(payload.startDate);
    const endDate = clean_(payload.endDate);
    const athlete = clean_(payload.athlete);
    const club = clean_(payload.club);
    const declared = clean_(payload.declaredResult);
    const sourceUrl = clean_(payload.sourceUrl);
    const consent = payload.consent === true;

    enforceRateLimit_(email);
    if (CLUBS.indexOf(club) < 0) throw new Error('Seleciona um clube válido da lista FPV.');
    if (sourceUrl) validatePublicUrl_(sourceUrl);

    if (!validEmail_(email) || !startDate || !endDate || !athlete || !club || !declared || !consent) {
      throw new Error('Confirma todos os campos obrigatórios.');
    }
    if (endDate < startDate) throw new Error('A data de fim não pode ser anterior à data de início.');
    if (!sourceUrl && !payload.pdfBase64) throw new Error('Indica um link oficial ou carrega um PDF.');

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Folha de submissões indisponível.');

    const dup = findDuplicate_(sheet, email, athlete, declared, sourceUrl);
    if (dup) throw new Error('Esta submissão parece já ter sido recebida. Referência: ' + dup);

    const id = nextReference_(sheet);
    let pdfUrl = '';
    let analysis = null;
    let sourceType = sourceUrl ? 'LINK' : 'PDF';

    if (sourceUrl) {
      try {
        analysis = analyzeUrl_(sourceUrl, athlete, declared);
      } catch (err) {
        analysis = { ok:false, manualRequired:true, note:'Análise automática inconclusiva.' };
      }
    }

    if (payload.pdfBase64) {
      const bytes = Utilities.base64Decode(String(payload.pdfBase64));
      if (bytes.length > 12 * 1024 * 1024) throw new Error('O PDF excede 12 MB.');
      const blob = Utilities.newBlob(bytes, 'application/pdf', safeFileName_(payload.pdfName || (id + '.pdf')));
      const file = DriveApp.getFolderById(PDF_FOLDER_ID).createFile(blob);
      file.setDescription('Resultado internacional ' + id + ' — recebido pela plataforma FPV.');
      pdfUrl = file.getUrl();

      if (!analysis && payload.clientAnalysis && payload.clientAnalysis.found) {
        analysis = {
          ok:true,
          manualRequired:false,
          sourceType:'pdf-client',
          analysis:{
            athlete:clean_(payload.clientAnalysis.athlete || athlete),
            resultGeneral:value_(payload.clientAnalysis.general),
            resultCountry:value_(payload.clientAnalysis.countryResult),
            countryCode:clean_(payload.clientAnalysis.country),
            participants:value_(payload.clientAnalysis.rows),
            participantCountries:value_(payload.clientAnalysis.countriesCounted),
            confidence:clean_(payload.clientAnalysis.confidence || 'média')
          }
        };
      }
    }

    const a = analysis && analysis.analysis ? analysis.analysis : {};
    const row = [
      id,
      new Date(),
      email,
      parseDate_(startDate),
      parseDate_(endDate),
      athlete,
      club,
      declared,
      sourceType,
      sourceUrl,
      pdfUrl,
      value_(a.resultGeneral),
      value_(a.resultCountry),
      clean_(a.countryCode),
      value_(a.participants),
      value_(a.participantCountries),
      clean_(a.className),
      clean_(a.eventName),
      clean_(a.location),
      clean_(a.confidence),
      analysis && analysis.analysis ? 'CONCLUÍDA' : 'INCONCLUSIVA',
      'PENDENTE',
      '',
      '',
      '',
      false,
      '',
      ''
    ];

    sheet.appendRow(row);
    const rn = sheet.getLastRow();
    sheet.getRange(rn, COL.SUBMITTED_AT).setNumberFormat('dd/mm/yyyy hh:mm');
    sheet.getRange(rn, COL.START_DATE, 1, 2).setNumberFormat('dd/mm/yyyy');

    return {
      ok:true,
      reference:id,
      analysis:analysis && analysis.analysis ? analysis.analysis : null,
      message:'Submissão recebida.'
    };
  } finally {
    lock.releaseLock();
  }
}

function onEditValidation(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME || e.range.getColumn() !== COL.FPV_STATUS || e.range.getRow() < 2) return;
  if (String(e.value || '').toUpperCase() !== 'VALIDADO') return;

  const row = e.range.getRow();
  if (sheet.getRange(row, COL.EMAIL_SENT).getValue() === true) return;

  const email = String(sheet.getRange(row, COL.EMAIL).getValue() || '').trim();
  const athlete = String(sheet.getRange(row, COL.ATHLETE).getValue() || '').trim();
  const id = String(sheet.getRange(row, COL.ID).getValue() || '').trim();
  const eventName = String(sheet.getRange(row, COL.EVENT).getValue() || '').trim();
  const declared = String(sheet.getRange(row, COL.DECLARED_RESULT).getValue() || '').trim();
  const resultCountry = String(sheet.getRange(row, COL.RESULT_COUNTRY).getValue() || '').trim();

  if (!email) {
    sheet.getRange(row, COL.EMAIL_ERROR).setValue('Email em falta.');
    return;
  }

  const now = new Date();
  sheet.getRange(row, COL.VALIDATED_BY).setValue(Session.getActiveUser().getEmail() || 'FPV');
  sheet.getRange(row, COL.VALIDATED_AT).setValue(now).setNumberFormat('dd/mm/yyyy hh:mm');

  const body = [
    'Olá ' + (athlete || 'velejador/a') + ',',
    '',
    'O resultado internacional que submeteste à Federação Portuguesa de Vela foi revisto e validado.',
    '',
    'Referência: ' + id,
    eventName ? 'Competição: ' + eventName : '',
    declared ? 'Resultado: ' + declared : '',
    resultCountry ? 'Resultado País: ' + resultCountry : '',
    '',
    'Obrigado por contribuíres para mantermos atualizada a informação sobre a participação portuguesa em competições internacionais.',
    '',
    'Federação Portuguesa de Vela'
  ].filter(Boolean).join('\n');

  try {
    MailApp.sendEmail({
      to: email,
      subject: 'FPV — Resultado internacional validado',
      body: body,
      name: 'Federação Portuguesa de Vela'
    });
    sheet.getRange(row, COL.EMAIL_SENT).setValue(true);
    sheet.getRange(row, COL.EMAIL_AT).setValue(new Date()).setNumberFormat('dd/mm/yyyy hh:mm');
    sheet.getRange(row, COL.EMAIL_ERROR).clearContent();
  } catch (err) {
    sheet.getRange(row, COL.EMAIL_ERROR).setValue(String(err && err.message || err).slice(0, 500));
  }
}

function setup() {
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'onEditValidation');
  if (!exists) {
    ScriptApp.newTrigger('onEditValidation').forSpreadsheet(SPREADSHEET_ID).onEdit().create();
  }
  return 'Configuração concluída.';
}

function analyzeUrl_(url, athlete, declaredResult) {
  validatePublicUrl_(url);
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions:true,
    followRedirects:true,
    validateHttpsCertificates:true,
    headers:{'User-Agent':'FPV-Resultados/1.0'}
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 400) {
    throw new Error('A fonte respondeu com HTTP ' + response.getResponseCode() + '.');
  }

  const contentType = String(response.getHeaders()['Content-Type'] || response.getHeaders()['content-type'] || '').toLowerCase();
  if (contentType.indexOf('pdf') >= 0) {
    return { ok:true, manualRequired:true, sourceType:'pdf-url', note:'PDF acessível. Requer validação manual nesta versão.' };
  }

  const html = response.getContentText();
  const ajaxUrls = extractSailtiAjaxUrls_(html, url);
  if (ajaxUrls.length) {
    const candidates = [];
    ajaxUrls.forEach(ajaxUrl => {
      try {
        const r = UrlFetchApp.fetch(ajaxUrl, {muteHttpExceptions:true, followRedirects:true});
        if (r.getResponseCode() >= 200 && r.getResponseCode() < 400) {
          const parsed = parseSailtiHtml_(r.getContentText(), athlete, declaredResult);
          if (parsed) candidates.push(parsed);
        }
      } catch (ignore) {}
    });

    if (candidates.length) {
      const declared = number_(declaredResult);
      candidates.sort((a,b) => {
        const am = declared && a.resultGeneral === declared ? 1 : 0;
        const bm = declared && b.resultGeneral === declared ? 1 : 0;
        if (am !== bm) return bm - am;
        if (a.scope !== b.scope) return a.scope === 'overall' ? -1 : 1;
        return b.participants - a.participants;
      });
      const c = candidates[0];
      return {
        ok:true,
        manualRequired:false,
        sourceType:'sailti',
        analysis:c,
        note:'Classificação dinâmica SailTi identificada.'
      };
    }
  }

  return { ok:true, manualRequired:true, sourceType:'html', note:'Página acessível, mas sem classificação estruturada reconhecida automaticamente.' };
}

function extractSailtiAjaxUrls_(html, baseUrl) {
  const urls = [];
  const patterns = [
    /url\s*:\s*['"]([^'"]*resultsajax[^'"]*)['"]/gi,
    /['"]([^'"]*\/resultsajax\?[^'"]+)['"]/gi
  ];
  patterns.forEach(re => {
    let m;
    while ((m = re.exec(html))) {
      const raw = String(m[1] || '').replace(/&amp;/g,'&');
      try { urls.push(resolveUrl_(baseUrl, raw)); } catch (ignore) {}
    }
  });
  return [...new Set(urls)].slice(0,20);
}

function parseSailtiHtml_(html, athlete, declaredResult) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) || [];
  const candidates = [];
  tables.forEach(table => {
    const id = (table.match(/id=["']([^"']*)["']/i) || [,''])[1];
    if (!/myTable/i.test(id)) return;
    const scope = /euro/i.test(id) ? 'europe' : 'overall';

    const rows = table.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    if (rows.length < 2) return;
    const headers = cells_(rows[0]).map(normalize_);
    const sailIdx = headers.findIndex(h => /^sail/.test(h));
    const crewIdx = headers.findIndex(h => /crew|team|sailor|helm|skipper/.test(h));
    if (sailIdx < 0 || crewIdx < 0) return;

    const parsed = [];
    for (let i=1;i<rows.length;i++) {
      const cells = cells_(rows[i]);
      const country = countryCode_(cells[sailIdx] || '');
      const crew = cells[crewIdx] || '';
      if (!country) continue;
      const rank = scope === 'overall' ? i : number_(cells[0]);
      if (!rank) continue;
      parsed.push({rank,country,crew,cells});
    }

    const target = parsed.find(r => athleteMatches_(r.crew, athlete));
    if (!target) return;

    const seen = [];
    parsed.slice().sort((a,b)=>a.rank-b.rank).some(r => {
      if (seen.indexOf(r.country) < 0) seen.push(r.country);
      return r === target;
    });

    candidates.push({
      athlete: target.crew,
      resultGeneral: target.rank,
      resultCountry: seen.indexOf(target.country) + 1,
      countryCode: target.country,
      participants: parsed.length,
      participantCountries: seen.length,
      confidence:'alta',
      scope:scope
    });
  });

  if (!candidates.length) return null;
  const declared = number_(declaredResult);
  candidates.sort((a,b) => {
    const am = declared && a.resultGeneral === declared ? 1 : 0;
    const bm = declared && b.resultGeneral === declared ? 1 : 0;
    if (am !== bm) return bm - am;
    if (a.scope !== b.scope) return a.scope === 'overall' ? -1 : 1;
    return b.participants - a.participants;
  });
  return candidates[0];
}

function cells_(rowHtml) {
  const out = [];
  const re = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
  let m;
  while ((m = re.exec(rowHtml))) {
    out.push(stripHtml_(m[1]));
  }
  return out;
}

function stripHtml_(s) {
  return String(s || '')
    .replace(/<br\s*\/?\s*>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}

function resolveUrl_(base, rel) {
  if (/^https?:\/\//i.test(rel)) return rel;
  const root = String(base).match(/^(https?:\/\/[^\/]+)/i);
  if (!root) throw new Error('URL base inválido.');
  if (rel.charAt(0) === '/') return root[1] + rel;
  const dir = String(base).replace(/[#?].*$/,'').replace(/\/[^\/]*$/,'/');
  return dir + rel;
}

function athleteMatches_(name, athlete) {
  const hay = normalize_(name);
  const tokens = normalize_(athlete).split(' ').filter(t => t.length > 1);
  return tokens.length > 0 && tokens.every(t => hay.indexOf(t) >= 0);
}

function countryCode_(value) {
  const exclusions = {BFD:1,DNF:1,DNS:1,DSQ:1,DNC:1,RET:1,OCS:1,UFD:1,DPI:1,RDG:1,SCP:1,DNE:1};
  const matches = String(value || '').toUpperCase().match(/\b[A-Z]{3}\b/g) || [];
  return matches.find(x => !exclusions[x]) || '';
}

function number_(value) {
  const m = String(value || '').match(/\d{1,4}/);
  return m ? Number(m[0]) : null;
}

function normalize_(value) {
  return String(value || '').toLowerCase()
    .replace(/[áàâã]/g,'a').replace(/[éê]/g,'e').replace(/í/g,'i')
    .replace(/[óôõ]/g,'o').replace(/ú/g,'u').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,' ').trim();
}


function enforceRateLimit_(email) {
  const cache = CacheService.getScriptCache();
  const key = 'rate_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(email || '').toLowerCase())
  ).slice(0, 32);
  const current = Number(cache.get(key) || 0);
  if (current >= 5) {
    throw new Error('Foram efetuadas várias submissões em pouco tempo. Tenta novamente dentro de alguns minutos.');
  }
  cache.put(key, String(current + 1), 15 * 60);
}

function validatePublicUrl_(url) {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw)) throw new Error('O link oficial deve começar por http:// ou https://.');
  const m = raw.match(/^https?:\/\/([^\/:?#]+)/i);
  const host = String(m && m[1] || '').toLowerCase();
  if (!host) throw new Error('O link oficial não é válido.');
  if (
    host === 'localhost' || host.endsWith('.local') ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || /^0\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '::1' || host === '[::1]'
  ) {
    throw new Error('O link oficial tem de ser público.');
  }
}

function nextReference_(sheet) {
  const year = new Date().getFullYear();
  const lastRow = sheet.getLastRow();
  let max = 0;
  if (lastRow >= 2) {
    sheet.getRange(2, COL.ID, lastRow - 1, 1).getDisplayValues().flat().forEach(id => {
      const m = String(id).match(new RegExp('^RI-' + year + '-(\\d{4})$'));
      if (m) max = Math.max(max, Number(m[1]));
    });
  }
  return 'RI-' + year + '-' + String(max + 1).padStart(4,'0');
}

function findDuplicate_(sheet, email, athlete, declared, sourceUrl) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return '';
  const start = Math.max(2, lastRow - 199);
  const vals = sheet.getRange(start,1,lastRow-start+1,10).getDisplayValues();
  for (let i=vals.length-1;i>=0;i--) {
    const r=vals[i];
    if (
      String(r[2]||'').toLowerCase() === email.toLowerCase() &&
      String(r[5]||'').toLowerCase() === athlete.toLowerCase() &&
      String(r[7]||'').toLowerCase() === declared.toLowerCase() &&
      String(r[9]||'').toLowerCase() === sourceUrl.toLowerCase()
    ) return r[0] || '';
  }
  return '';
}

function parseDate_(value) {
  const d = new Date(String(value) + 'T12:00:00');
  return isNaN(d.getTime()) ? '' : d;
}
function validEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'')); }
function clean_(v) { return String(v == null ? '' : v).replace(/[<>]/g,'').trim().slice(0,2000); }
function value_(v) { return v == null ? '' : v; }
function safeFileName_(name) { return String(name||'resultado.pdf').replace(/[^a-zA-Z0-9._()\- áàâãéêíóôõúç]/g,'_').slice(0,160); }
