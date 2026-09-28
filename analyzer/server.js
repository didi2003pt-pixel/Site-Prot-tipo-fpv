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

function analyzeStructuredTables(tables, athlete){
  const target=normalize(athlete);
  let best=null;
  for(const rows of tables){
    if(rows.length<2) continue;
    const headers=rows[0].map(normalize);
    const rankIdx=headers.findIndex(h=>/^(rank|place|pos|position|overall|classifica)/.test(h));
    const natIdx=headers.findIndex(h=>/(^nat$|nation|country|pais|país)/.test(h));
    const nameIdx=headers.findIndex(h=>/(sailor|name|nome|helm|skipper|velejador|crew|team)/.test(h));
    if(rankIdx<0 || natIdx<0) continue;

    const parsed=[];
    for(let i=1;i<rows.length;i++){
      const cells=rows[i];
      const rank=rankNumber(cells[rankIdx]);
      const nat=(cells[natIdx]||'').toUpperCase().match(COUNTRY_CODE)?.[0] || (cells[natIdx]||'').toUpperCase().trim();
      const name=nameIdx>=0?(cells[nameIdx]||''):cells.join(' ');
      if(rank && nat) parsed.push({rank,nat,name,cells});
    }
    if(!parsed.length) continue;

    const athleteRow=target?parsed.find(r=>normalize(r.name).includes(target)||target.includes(normalize(r.name))):parsed.find(r=>r.nat==='POR');
    const porRow=athleteRow || parsed.find(r=>r.nat==='POR');
    if(!porRow) continue;

    const countries=[];
    for(const r of parsed.slice().sort((a,b)=>a.rank-b.rank)){
      if(!countries.includes(r.nat)) countries.push(r.nat);
      if(r===porRow || (r.rank===porRow.rank && r.nat===porRow.nat)) break;
    }
    const countryRank=countries.indexOf(porRow.nat)+1;
    const candidate={
      method:'html-table',
      athlete:porRow.name.trim(),
      result_general:porRow.rank,
      country_code:porRow.nat,
      result_country:countryRank>0?countryRank:null,
      rows_parsed:parsed.length,
      countries_counted:countries.length,
      confidence: athleteRow ? 'alta' : 'média',
      evidence: porRow.cells.join(' | ')
    };
    if(!best || candidate.confidence==='alta') best=candidate;
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

async function analyzeBuffer(buffer, contentType, athlete, hintName=''){
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
  const result=analyzeStructuredTables(doc.tables,athlete) || analyzeText(doc.text,athlete);
  return {
    source_type:'html',
    title:doc.title||null,
    tables_found:doc.tables.length,
    analysis:result,
    manual_required:!result || result.confidence==='baixa',
    note: result ? 'Leitura automática experimental. Confirmar sempre na fonte oficial.' : 'Não foi possível identificar com segurança uma tabela de classificação nesta página.'
  };
}


app.get('/api/inspect-sailti', async (req,res)=>{
  try{
    const raw=String(req.query.url||'');
    if(!raw) return res.status(400).json({ok:false,error:'url required'});
    const fetched=await safeFetch(raw);
    const html=fetched.buffer.toString('utf8');
    const $=cheerio.load(html);
    const scripts=[];
    $('script').each((_,el)=>{
      const src=$(el).attr('src');
      const txt=$(el).html()||'';
      scripts.push(src ? {src:new URL(src,fetched.finalUrl).toString()} : {inline:txt.slice(0,1500)});
    });
    const links=[];
    $('a[href],form[action],iframe[src],embed[src],object[data]').each((_,el)=>{
      const rawv=$(el).attr('href')||$(el).attr('action')||$(el).attr('src')||$(el).attr('data');
      if(!rawv) return;
      try{links.push(new URL(rawv,fetched.finalUrl).toString());}catch{}
    });
    const interesting=[...new Set(links.filter(x=>/result|race|pdf|ajax|api|json|text/i.test(x)))].slice(0,100);
    res.json({
      ok:true,
      final_url:fetched.finalUrl,
      content_type:fetched.contentType,
      title:$('title').text().trim(),
      scripts,
      interesting_links:interesting,
      html_markers:{
        loading:/Loading results/i.test(html),
        sailti:/sailti/i.test(html),
        text_params:(html.match(/text[\/'"=:?&-][A-Za-z0-9._-]+/gi)||[]).slice(0,40),
        ajax_refs:(html.match(/[^"'\s]{0,80}(?:ajax|api|results)[^"'\s]{0,120}/gi)||[]).slice(0,40)
      }
    });
  }catch(error){res.status(422).json({ok:false,error:error.message||String(error)});}
});


app.get('/api/inspect-script', async (req,res)=>{
  try{
    const raw=String(req.query.url||'');
    if(!raw) return res.status(400).json({ok:false,error:'url required'});
    const fetched=await safeFetch(raw);
    const text=fetched.buffer.toString('utf8');
    const terms=['result','results','race','ajax','getJSON','post','load(','$.get','$.post','url:','json','pdf','text/'];
    const hits={};
    for(const term of terms){
      const lower=text.toLowerCase();
      const t=term.toLowerCase();
      const snippets=[];
      let from=0;
      while(snippets.length<20){
        const i=lower.indexOf(t,from);
        if(i<0) break;
        snippets.push(text.slice(Math.max(0,i-240),Math.min(text.length,i+520)));
        from=i+t.length;
      }
      if(snippets.length) hits[term]=snippets;
    }
    res.json({ok:true,final_url:fetched.finalUrl,length:text.length,hits});
  }catch(error){res.status(422).json({ok:false,error:error.message||String(error)});}
});

app.post('/api/analyze-url',async(req,res)=>{
  try{
    const {url,athlete=''}=req.body||{};
    if(!url) return res.status(400).json({ok:false,error:'Indica o link oficial.'});
    const fetched=await safeFetch(url);
    let result=await analyzeBuffer(fetched.buffer,fetched.contentType,athlete,fetched.finalUrl);
    let sourceUrl=fetched.finalUrl;
    if((!result.analysis || result.manual_required) && !fetched.contentType.includes('pdf')){
      const discovered=await maybeFollowEmbeddedResultSource(fetched.buffer,fetched.contentType,fetched.finalUrl);
      if(discovered){
        const pdfResult=await analyzeBuffer(discovered.buffer,discovered.contentType,athlete,discovered.finalUrl);
        if(pdfResult.analysis){
          result={...pdfResult, discovered_from:fetched.finalUrl};
          sourceUrl=discovered.finalUrl;
        }
      }
    }
    res.json({ok:true,source_url:sourceUrl,...result});
  }catch(error){
    res.status(422).json({ok:false,error:error.message||'Não foi possível analisar a fonte.'});
  }
});

app.post('/api/analyze-pdf',upload.single('file'),async(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({ok:false,error:'Seleciona um PDF.'});
    const type=(req.file.mimetype||'').toLowerCase();
    if(!type.includes('pdf') && !/\.pdf$/i.test(req.file.originalname||'')) return res.status(400).json({ok:false,error:'O ficheiro tem de ser PDF.'});
    const result=await analyzeBuffer(req.file.buffer,'application/pdf',req.body?.athlete||'',req.file.originalname||'');
    res.json({ok:true,file_name:req.file.originalname,...result});
  }catch(error){
    res.status(422).json({ok:false,error:error.message||'Não foi possível analisar o PDF.'});
  }
});

app.use((err,req,res,next)=>{
  if(err?.code==='LIMIT_FILE_SIZE') return res.status(413).json({ok:false,error:'O PDF excede 12 MB.'});
  res.status(500).json({ok:false,error:'Erro interno do analisador.'});
});

const SITE_ROOT = path.resolve(__dirname, '..');
app.use(express.static(SITE_ROOT, { extensions:['html'], maxAge:0, etag:true }));
app.get('*',(req,res)=>{
  if(req.path.startsWith('/api/')) return res.status(404).json({ok:false,error:'Endpoint não encontrado.'});
  res.sendFile(path.join(SITE_ROOT,'index.html'));
});

app.listen(PORT,()=>console.log('FPV results analyzer listening on '+PORT));