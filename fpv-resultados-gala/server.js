const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const cheerio = require('cheerio');
const dns = require('node:dns').promises;
const net = require('node:net');
const path = require('node:path');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 1 } });
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

app.use(express.json({ limit: '64kb' }));
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health',(req,res)=>res.json({ok:true,service:'fpv-results-analyzer',version:'0.1.0'}));

function normalize(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
}

function isPrivateIp(ip){
  if(net.isIPv4(ip)){
    const p=ip.split('.').map(Number);
    return p[0]===10 || p[0]===127 || p[0]===0 ||
      (p[0]===169&&p[1]===254) || (p[0]===172&&p[1]>=16&&p[1]<=31) ||
      (p[0]===192&&p[1]===168) || (p[0]===100&&p[1]>=64&&p[1]<=127) || p[0]>=224;
  }
  if(net.isIPv6(ip)){
    const x=ip.toLowerCase();
    return x==='::1' || x==='::' || x.startsWith('fc') || x.startsWith('fd') ||
      x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb');
  }
  return true;
}

async function assertPublicUrl(raw){
  let u;
  try { u = new URL(raw); } catch { throw new Error('URL inválido.'); }
  if(!['http:','https:'].includes(u.protocol)) throw new Error('Usa um link público http/https.');
  const h=u.hostname.toLowerCase();
  if(h==='localhost'||h.endsWith('.local')) throw new Error('O link tem de ser público.');
  const answers=await dns.lookup(h,{all:true});
  if(!answers.length || answers.some(a=>isPrivateIp(a.address))) throw new Error('O link não pode apontar para uma rede privada.');
  return u;
}

async function safeFetch(raw){
  let current=(await assertPublicUrl(raw)).toString();
  for(let n=0;n<4;n++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    let response;
    try{
      response=await fetch(current,{redirect:'manual',signal:controller.signal,headers:{'User-Agent':'FPV-Results-Validator/0.1'}});
    } finally { clearTimeout(timer); }
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get('location');
      if(!location) throw new Error('Redirecionamento inválido.');
      current=new URL(location,current).toString();
      await assertPublicUrl(current);
      continue;
    }
    if(!response.ok) throw new Error('A fonte respondeu com HTTP '+response.status+'.');
    const length=Number(response.headers.get('content-length')||0);
    if(length>12*1024*1024) throw new Error('A fonte excede 12 MB.');
    const buf=Buffer.from(await response.arrayBuffer());
    if(buf.length>12*1024*1024) throw new Error('A fonte excede 12 MB.');
    return {buffer:buf, contentType:(response.headers.get('content-type')||'').toLowerCase(), finalUrl:current};
  }
  throw new Error('Demasiados redirecionamentos.');
}

function tableRowsFromHtml(html){
  const $=cheerio.load(html);
  const tables=[];
  $('table').each((_,table)=>{
    const trs=[];
    $(table).find('tr').each((__,tr)=>{
      const cells=$(tr).find('th,td').map((___,el)=>$(el).text().replace(/\s+/g,' ').trim()).get();
      if(cells.length>=2) trs.push(cells);
    });
    if(trs.length) tables.push(trs);
  });
  return {title:$('title').first().text().trim(),tables,text:$('body').text().replace(/\s+/g,' ').trim()};
}

const COUNTRY_CODE=/\b[A-Z]{3}\b/;
function rankNumber(value){
  const m=String(value||'').match(/(?:^|\s)(\d{1,4})(?:\.|º|ª|st|nd|rd|th)?(?:\s|$)/i);
  return m?Number(m[1]):null;
}

function athleteNameMatches(name, athlete){
  const hay=normalize(name);
  const tokens=normalize(athlete).split(' ').filter(t=>t.length>1);
  return tokens.length>0 && tokens.every(t=>hay.includes(t));
}

function numericDeclaredResult(value){
  const m=String(value||'').match(/\d{1,4}/);
  return m?Number(m[0]):null;
}

function extractCountryCode(value){
  const exclusions=new Set(['BFD','DNF','DNS','DSQ','DNC','RET','OCS','UFD','DPI','RDG','SCP','DNE']);
  const matches=String(value||'').toUpperCase().match(/\b[A-Z]{3}\b/g)||[];
  return matches.find(x=>!exclusions.has(x))||null;
}

function analyzeStructuredTables(tables, athlete, declaredResult=null){
  const declared=numericDeclaredResult(declaredResult);
  let best=null;
  let bestScore=-Infinity;

  for(const rows of tables){
    if(rows.length<2) continue;
    const headers=rows[0].map(normalize);

    let rankIdx=headers.findIndex(h=>/^(rank|place|pos|position|overall|classifica)/.test(h));
    if(rankIdx<0 && rankNumber(rows[1]?.[0])) rankIdx=0;

    let natIdx=headers.findIndex(h=>/(^nat$|nation|country|pais|país)/.test(h));
    const sailIdx=headers.findIndex(h=>/^sail(?:\s*#|\s*no|\s*number)?$/.test(h)||h==='sail #');
    if(natIdx<0 && sailIdx>=0) natIdx=sailIdx;

    const nameIdx=headers.findIndex(h=>/(sailor|name|nome|helm|skipper|velejador|crew|team)/.test(h));
    if(rankIdx<0 || natIdx<0) continue;

    const parsed=[];
    for(let i=1;i<rows.length;i++){
      const cells=rows[i];
      let rank=rankNumber(cells[rankIdx]);
      // SailTi's overall table stores a sort key such as "a_0000001010"
      // in the first cell instead of a visible rank. The row order itself is
      // the official overall position, so use the data-row index as fallback.
      if(!rank && rankIdx===0 && headers[0]==='' && extractCountryCode(cells[natIdx])) rank=i;
      const nat=extractCountryCode(cells[natIdx]);
      const name=nameIdx>=0?(cells[nameIdx]||''):cells.join(' ');
      if(rank && nat) parsed.push({rank,nat,name,cells});
    }
    if(!parsed.length) continue;

    const athleteRow=athlete ? parsed.find(r=>athleteNameMatches(r.name,athlete)) : null;
    const targetRow=athleteRow || (!athlete ? parsed.find(r=>r.nat==='POR') : null);
    if(!targetRow) continue;

    const countries=[];
    const ordered=parsed.slice().sort((a,b)=>a.rank-b.rank);
    for(const r of ordered){
      if(!countries.includes(r.nat)) countries.push(r.nat);
      if(r===targetRow || (r.rank===targetRow.rank && r.name===targetRow.name)) break;
    }
    const countryRank=countries.indexOf(targetRow.nat)+1;

    const candidate={
      method:sailIdx>=0 && nameIdx>=0 ? 'sailti-table' : 'html-table',
      athlete:targetRow.name.trim(),
      result_general:targetRow.rank,
      country_code:targetRow.nat,
      result_country:countryRank>0?countryRank:null,
      rows_parsed:parsed.length,
      countries_counted:countries.length,
      confidence:'alta',
      evidence:targetRow.cells.join(' | ')
    };

    let score=parsed.length;
    if(declared!==null && candidate.result_general===declared) score+=10000;
    if(candidate.method==='sailti-table') score+=500;
    if(candidate.country_code==='POR') score+=100;

    if(score>bestScore){
      best=candidate;
      bestScore=score;
    }
  }
  return best;
}

function linesFromText(text){
  return String(text||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
}

function analyzeText(text, athlete){
  const lines=linesFromText(text);
  const target=normalize(athlete);
  const rowCandidates=[];
  for(const line of lines){
    const rank=rankNumber(line);
    const nat=line.match(COUNTRY_CODE)?.[0];
    if(rank && nat) rowCandidates.push({rank,nat,name:line,line});
  }
  if(!rowCandidates.length) return null;

  let porRow=null;
  if(target) porRow=rowCandidates.find(r=>normalize(r.line).includes(target));
  if(!porRow) porRow=rowCandidates.find(r=>r.nat==='POR');
  if(!porRow) return null;

  const ordered=rowCandidates.slice().sort((a,b)=>a.rank-b.rank);
  const countries=[];
  for(const r of ordered){
    if(!countries.includes(r.nat)) countries.push(r.nat);
    if(r===porRow || (r.rank===porRow.rank && r.nat===porRow.nat)) break;
  }

  return {
    method:'text-lines',
    athlete:athlete || porRow.line,
    result_general:porRow.rank,
    country_code:porRow.nat,
    result_country:countries.indexOf(porRow.nat)+1 || null,
    rows_parsed:rowCandidates.length,
    countries_counted:countries.length,
    confidence: target && normalize(porRow.line).includes(target) ? 'média' : 'baixa',
    evidence:porRow.line
  };
}

async function maybeFollowEmbeddedResultSource(buffer, contentType, baseUrl){
  if(contentType.includes('pdf')) return null;
  const html=buffer.toString('utf8');
  const $=cheerio.load(html);
  const candidates=[];
  $('a[href],iframe[src],embed[src],object[data]').each((_,el)=>{
    const raw=$(el).attr('href')||$(el).attr('src')||$(el).attr('data');
    if(!raw) return;
    let absolute;
    try { absolute=new URL(raw,baseUrl).toString(); } catch { return; }
    const label=normalize($(el).text()+' '+raw);
    if(/\.pdf(?:$|[?#])/i.test(absolute) || /result|classifica|ranking|final|overall/.test(label)) candidates.push(absolute);
  });
  const unique=[...new Set(candidates)].slice(0,8);
  for(const candidate of unique){
    try{
      const fetched=await safeFetch(candidate);
      if(fetched.contentType.includes('pdf') || /^%PDF-/.test(fetched.buffer.subarray(0,5).toString())){
        return {...fetched, discoveredFrom:baseUrl};
      }
    }catch{}
  }
  return null;
}

function analyzeSailtiHtml(html, athlete, declaredResult=null){
  const $=cheerio.load(html);
  const declared=numericDeclaredResult(declaredResult);
  let best=null;
  let bestScore=-Infinity;

  $('table.result, table.table-result').each((_,table)=>{
    const $table=$(table);
    const id=String($table.attr('id')||'');
    const isEuro=/euro/i.test(id);
    const rows=[];

    $table.find('tr').each((rowIndex,tr)=>{
      const cells=$(tr).find('th,td').map((__,el)=>$(el).text().replace(/\s+/g,' ').trim()).get();
      if(cells.length) rows.push(cells);
    });
    if(rows.length<2) return;

    const headers=rows[0].map(normalize);
    const sailIdx=headers.findIndex(h=>h==='sail #' || /^sail/.test(h));
    const crewIdx=headers.findIndex(h=>/crew|team|sailor|helm|skipper/.test(h));
    if(sailIdx<0 || crewIdx<0) return;

    const parsed=[];
    for(let i=1;i<rows.length;i++){
      const cells=rows[i];
      const nat=extractCountryCode(cells[sailIdx]);
      const name=cells[crewIdx]||'';
      if(!nat) continue;

      let rank=null;
      if(isEuro) rank=rankNumber(cells[0]);
      else rank=i; // SailTi overall rows are already in official finishing order.
      if(!rank) continue;

      parsed.push({rank,nat,name,cells});
    }
    const target=parsed.find(r=>athleteNameMatches(r.name,athlete));
    if(!target) return;

    const countries=[];
    for(const r of parsed.slice().sort((a,b)=>a.rank-b.rank)){
      if(!countries.includes(r.nat)) countries.push(r.nat);
      if(r===target) break;
    }

    const candidate={
      method:isEuro?'sailti-europe-table':'sailti-overall-table',
      athlete:target.name.trim(),
      result_general:target.rank,
      country_code:target.nat,
      result_country:countries.indexOf(target.nat)+1 || null,
      rows_parsed:parsed.length,
      countries_counted:countries.length,
      confidence:'alta',
      evidence:target.cells.join(' | '),
      ranking_scope:isEuro?'europe':'overall'
    };

    let score=parsed.length;
    if(!isEuro) score+=1000;
    if(declared!==null && candidate.result_general===declared) score+=10000;

    if(score>bestScore){
      best=candidate;
      bestScore=score;
    }
  });

  return best;
}

function extractSailtiAjaxUrls(html, baseUrl){
  const urls=[];
  const patterns=[
    /url\s*:\s*['"]([^'"]*resultsajax[^'"]*)['"]/gi,
    /['"]([^'"]*\/resultsajax\?[^'"]+)['"]/gi
  ];
  for(const re of patterns){
    let m;
    while((m=re.exec(html))){
      const raw=(m[1]||'').replace(/&amp;/g,'&');
      try{urls.push(new URL(raw,baseUrl).toString());}catch{}
    }
  }
  return [...new Set(urls)].slice(0,20);
}

async function analyzeSailtiDynamic(buffer, contentType, baseUrl, athlete, declaredResult=null){
  if(contentType.includes('pdf')) return null;
  const html=buffer.toString('utf8');
  const ajaxUrls=extractSailtiAjaxUrls(html,baseUrl);
  if(!ajaxUrls.length) return null;

  const candidates=[];
  for(const ajaxUrl of ajaxUrls){
    try{
      const fetched=await safeFetch(ajaxUrl);
      const ajaxHtml=fetched.buffer.toString('utf8');
      const analysis=analyzeSailtiHtml(ajaxHtml,athlete,declaredResult);
      if(analysis) candidates.push({analysis,ajaxUrl});
    }catch{}
  }
  if(!candidates.length) return null;

  const declared=numericDeclaredResult(declaredResult);
  candidates.sort((a,b)=>{
    const ae=declared!==null && a.analysis.result_general===declared ? 1:0;
    const be=declared!==null && b.analysis.result_general===declared ? 1:0;
    if(ae!==be) return be-ae;
    return (b.analysis.rows_parsed||0)-(a.analysis.rows_parsed||0);
  });

  const chosen=candidates[0];
  return {
    source_type:'sailti',
    analysis:chosen.analysis,
    manual_required:false,
    note:'Classificação SailTi carregada através da fonte dinâmica oficial. Confirmar sempre antes de publicar.',
    resolved_source_url:chosen.ajaxUrl,
    sailti_sources_checked:ajaxUrls.length
  };
}

async function analyzeBuffer(buffer, contentType, athlete, hintName='', declaredResult=null){
  const isPdf=contentType.includes('pdf') || /^%PDF-/.test(buffer.subarray(0,5).toString()) || /\.pdf$/i.test(hintName);
  if(isPdf){
    const parsed=await pdf(buffer);
    const result=analyzeText(parsed.text,athlete);
    return {
      source_type:'pdf',
      pages:parsed.numpages||null,
      text_length:parsed.text?.length||0,
      analysis:result,
      manual_required:!result || result.confidence==='baixa',
      note: result ? 'Leitura automática experimental. Confirmar sempre na fonte oficial.' : 'Não foi possível identificar com segurança a classificação nesta estrutura de PDF.'
    };
  }

  const html=buffer.toString('utf8');
  const doc=tableRowsFromHtml(html);
  const result=analyzeStructuredTables(doc.tables,athlete,declaredResult) || analyzeText(doc.text,athlete);
  return {
    source_type:'html',
    title:doc.title||null,
    tables_found:doc.tables.length,
    analysis:result,
    manual_required:!result || result.confidence==='baixa',
    note: result ? 'Leitura automática experimental. Confirmar sempre na fonte oficial.' : 'Não foi possível identificar com segurança uma tabela de classificação nesta página.'
  };
}


async function analyzeUrlSource(url, athlete='', declaredResult=null){
  const fetched=await safeFetch(url);
  let result=await analyzeBuffer(fetched.buffer,fetched.contentType,athlete,fetched.finalUrl,declaredResult);
  let resolvedSourceUrl=fetched.finalUrl;

  if(!fetched.contentType.includes('pdf')){
    const sailti=await analyzeSailtiDynamic(fetched.buffer,fetched.contentType,fetched.finalUrl,athlete,declaredResult);
    if(sailti?.analysis){
      result=sailti;
      resolvedSourceUrl=sailti.resolved_source_url||resolvedSourceUrl;
    }else if(!result.analysis || result.manual_required){
      const discovered=await maybeFollowEmbeddedResultSource(fetched.buffer,fetched.contentType,fetched.finalUrl);
      if(discovered){
        const pdfResult=await analyzeBuffer(discovered.buffer,discovered.contentType,athlete,discovered.finalUrl,declaredResult);
        if(pdfResult.analysis){
          result={...pdfResult, discovered_from:fetched.finalUrl};
          resolvedSourceUrl=discovered.finalUrl;
        }
      }
    }
  }

  return {
    ok:true,
    source_url:fetched.finalUrl,
    resolved_source_url:resolvedSourceUrl,
    ...result
  };
}

app.post('/api/analyze-url',async(req,res)=>{
  try{
    const {url,athlete='',declaredResult=null}=req.body||{};
    if(!url) return res.status(400).json({ok:false,error:'Indica o link oficial.'});
    res.json(await analyzeUrlSource(url,athlete,declaredResult));
  }catch(error){
    res.status(422).json({ok:false,error:error.message||'Não foi possível analisar a fonte.'});
  }
});

app.post('/api/analyze-pdf',upload.single('file'),async(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({ok:false,error:'Seleciona um PDF.'});
    const type=(req.file.mimetype||'').toLowerCase();
    if(!type.includes('pdf') && !/\.pdf$/i.test(req.file.originalname||'')) return res.status(400).json({ok:false,error:'O ficheiro tem de ser PDF.'});
    const result=await analyzeBuffer(req.file.buffer,'application/pdf',req.body?.athlete||'',req.file.originalname||'',req.body?.declaredResult||null);
    res.json({ok:true,file_name:req.file.originalname,...result});
  }catch(error){
    res.status(422).json({ok:false,error:error.message||'Não foi possível analisar o PDF.'});
  }
});


const submissionLimiter = require('express-rate-limit').rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok:false, error:'Foram efetuadas várias submissões em pouco tempo. Tenta novamente dentro de alguns minutos.' }
});

function cleanText(value,max=500){
  return String(value||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
}
function validEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());
}
function makeReference(){
  const year=new Date().getFullYear();
  const stamp=Date.now().toString(36).toUpperCase().slice(-5);
  const rand=Math.random().toString(36).toUpperCase().slice(2,5);
  return 'RI-'+year+'-'+stamp+rand;
}

app.post('/api/submit', submissionLimiter, async (req,res)=>{
  try{
    const webhook=process.env.SHEET_WEBHOOK_URL;
    const webhookSecret=process.env.SHEET_WEBHOOK_SECRET;
    if(!webhook || !webhookSecret){
      return res.status(503).json({ok:false,error:'A receção de submissões ainda não está ligada ao backoffice FPV.'});
    }

    const body=req.body||{};
    if(cleanText(body.website,120)) return res.status(400).json({ok:false,error:'Submissão inválida.'});

    const email=cleanText(body.email,180);
    const athlete=cleanText(body.athlete,300);
    const club=cleanText(body.club,300);
    const declaredResult=cleanText(body.declaredResult,50);
    const startDate=cleanText(body.startDate,20);
    const endDate=cleanText(body.endDate,20);
    const sourceUrl=cleanText(body.sourceUrl,1600);
    const consent=body.consent===true;

    if(!validEmail(email) || !athlete || !club || !declaredResult || !startDate || !endDate || !sourceUrl || !consent){
      return res.status(400).json({ok:false,error:'Confirma os campos obrigatórios antes de enviar.'});
    }
    if(endDate < startDate) return res.status(400).json({ok:false,error:'A data de fim não pode ser anterior à data de início.'});

    let source;
    try{ source=new URL(sourceUrl); }catch{ return res.status(400).json({ok:false,error:'O link oficial não é válido.'}); }
    if(!['http:','https:'].includes(source.protocol)) return res.status(400).json({ok:false,error:'O link oficial deve começar por http:// ou https://.'});

    let analysis=null;
    try{
      analysis=await analyzeUrlSource(source.toString(),athlete,declaredResult);
    }catch(error){
      analysis={ok:false,error:'Análise automática inconclusiva.'};
    }

    const reference=makeReference();
    const payload={
      secret:webhookSecret,
      action:'create_submission',
      record:{
        id:reference,
        submittedAt:new Date().toISOString(),
        email,
        startDate,
        endDate,
        athlete,
        club,
        declaredResult,
        sourceType:'LINK',
        sourceUrl:source.toString(),
        pdfDriveUrl:'',
        detectedGeneral:analysis?.analysis?.result_general ?? '',
        resultCountry:analysis?.analysis?.result_country ?? '',
        countryCode:analysis?.analysis?.country_code ?? '',
        participants:analysis?.analysis?.rows_parsed ?? '',
        participantCountries:analysis?.analysis?.countries_counted ?? '',
        className:'',
        eventName:'',
        location:'',
        confidence:analysis?.analysis?.confidence ?? '',
        analysisStatus:analysis?.analysis ? 'CONCLUÍDA' : 'INCONCLUSIVA',
        fpvStatus:'PENDENTE',
        notes:'',
        validatedBy:'',
        validatedAt:'',
        emailSent:false,
        emailAt:'',
        emailError:''
      }
    };

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    let response;
    try{
      response=await fetch(webhook,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        signal:controller.signal,
        redirect:'follow'
      });
    } finally { clearTimeout(timer); }

    const text=await response.text();
    let result={};
    try{result=JSON.parse(text);}catch{}
    if(!response.ok || result.ok===false) throw new Error('Falha ao guardar no backoffice.');

    res.status(201).json({
      ok:true,
      reference,
      analysis: analysis?.analysis || null,
      message:'Submissão recebida. A FPV irá rever a informação antes da validação.'
    });
  }catch(error){
    res.status(500).json({ok:false,error:'Não foi possível concluir a submissão. Tenta novamente.'});
  }
});

app.use((err,req,res,next)=>{
  if(err?.code==='LIMIT_FILE_SIZE') return res.status(413).json({ok:false,error:'O PDF excede 12 MB.'});
  res.status(500).json({ok:false,error:'Erro interno do analisador.'});
});

const SITE_ROOT = path.resolve(__dirname, 'public');
app.use(express.static(SITE_ROOT, { extensions:['html'], maxAge:0, etag:true }));
app.get('*',(req,res)=>{
  if(req.path.startsWith('/api/')) return res.status(404).json({ok:false,error:'Endpoint não encontrado.'});
  res.sendFile(path.join(SITE_ROOT,'index.html'));
});

app.listen(PORT,()=>console.log('FPV Gala results service listening on '+PORT));