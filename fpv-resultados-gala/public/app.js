(() => {
  const form=document.getElementById('resultForm');
  if(!form) return;

  const clubSelect=document.getElementById('clubSelect');
  const analysis=document.getElementById('analysis');
  const error=document.getElementById('formError');
  const analyzeUrlBtn=document.getElementById('analyzeUrl');
  const analyzePdfBtn=document.getElementById('analyzePdf');
  const modal=document.getElementById('reviewModal');
  const reviewData=document.getElementById('reviewData');
  const confirmBtn=document.getElementById('confirmSubmit');
  const success=document.getElementById('successScreen');
  const referenceId=document.getElementById('referenceId');
  const newSubmission=document.getElementById('newSubmission');

  let lastAnalysis=null;

  const escapeHtml=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const ordinal=n=>Number.isFinite(Number(n))?Number(n)+'.º':'—';
  const setError=msg=>{error.textContent=msg||'';error.hidden=!msg};

  fetch('/data/clubes-fpv.json')
    .then(r=>r.json())
    .then(clubs=>clubs.sort((a,b)=>a.club.localeCompare(b.club,'pt')).forEach(c=>{
      const o=document.createElement('option');o.value=c.club;o.textContent=c.club;clubSelect.appendChild(o);
    }))
    .catch(()=>{});

  function fields(){
    const fd=new FormData(form);
    return {
      email:String(fd.get('email')||'').trim(),
      startDate:String(fd.get('startDate')||''),
      endDate:String(fd.get('endDate')||''),
      athlete:String(fd.get('athlete')||'').trim(),
      club:String(fd.get('club')||''),
      declaredResult:String(fd.get('declaredResult')||'').trim(),
      sourceUrl:String(fd.get('sourceUrl')||'').trim(),
      consent:fd.get('consent')==='on',
      website:String(fd.get('website')||'')
    };
  }

  function validateBasics(requireSource=true){
    setError('');
    if(!form.reportValidity()) return false;
    const v=fields();
    if(v.endDate<v.startDate){setError('A data de fim não pode ser anterior à data de início.');return false}
    const file=form.elements.pdf.files?.[0];
    if(requireSource && !v.sourceUrl && !file){setError('Indica um link oficial ou carrega um PDF.');return false}
    if(file && file.size>12*1024*1024){setError('O PDF excede 12 MB.');return false}
    return true;
  }

  function renderAnalysis(payload,label){
    lastAnalysis=payload?.analysis||null;
    analysis.hidden=false;
    if(!lastAnalysis){
      analysis.className='analysis manual';
      analysis.innerHTML='<span class="eyebrow">Validação manual</span><h3>Análise automática inconclusiva.</h3><p>'+escapeHtml(payload?.note||'A FPV poderá validar esta fonte manualmente após a submissão.')+'</p>';
      return;
    }
    analysis.className='analysis success';
    analysis.innerHTML=
      '<div class="analysis-head"><div><span class="eyebrow">'+escapeHtml(label)+'</span><h3>Resultado identificado</h3></div><span class="confidence">Confiança '+escapeHtml(lastAnalysis.confidence||'média')+'</span></div>'+
      '<div class="analysis-grid">'+
      '<div><span>Resultado geral</span><strong>'+ordinal(lastAnalysis.result_general)+'</strong></div>'+
      '<div><span>Resultado País</span><strong>'+ordinal(lastAnalysis.result_country)+'</strong></div>'+
      '<div><span>País</span><strong>'+escapeHtml(lastAnalysis.country_code||'—')+'</strong></div>'+
      '<div><span>Participantes</span><strong>'+escapeHtml(lastAnalysis.rows_parsed||'—')+'</strong></div></div>'+
      '<p>Esta leitura é uma ajuda à validação. A FPV confirma sempre a fonte oficial antes de considerar o resultado validado.</p>';
  }

  async function jsonRequest(url,options){
    const r=await fetch(url,options);let p={};try{p=await r.json()}catch{}
    if(!r.ok) throw new Error(p.error||'Não foi possível concluir a operação.');
    return p;
  }

  analyzeUrlBtn.addEventListener('click',async()=>{
    setError('');const v=fields();
    if(!v.athlete){setError('Preenche primeiro o nome do velejador / tripulação.');return}
    if(!v.sourceUrl){setError('Cola primeiro o link oficial.');return}
    analyzeUrlBtn.disabled=true;analysis.hidden=false;analysis.className='analysis';analysis.innerHTML='<h3>A analisar o link…</h3><p>A procurar a classificação oficial.</p>';
    try{
      const p=await jsonRequest('/api/analyze-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:v.sourceUrl,athlete:v.athlete,declaredResult:v.declaredResult})});
      renderAnalysis(p,'Fonte oficial');
    }catch(e){renderAnalysis({note:e.message},'Fonte oficial')}
    finally{analyzeUrlBtn.disabled=false}
  });

  analyzePdfBtn.addEventListener('click',async()=>{
    setError('');const v=fields();const file=form.elements.pdf.files?.[0];
    if(!v.athlete){setError('Preenche primeiro o nome do velejador / tripulação.');return}
    if(!file){setError('Seleciona primeiro um PDF.');return}
    if(file.size>12*1024*1024){setError('O PDF excede 12 MB.');return}
    analyzePdfBtn.disabled=true;analysis.hidden=false;analysis.className='analysis';analysis.innerHTML='<h3>A analisar o PDF…</h3><p>A procurar a classificação oficial.</p>';
    try{
      const fd=new FormData();fd.append('file',file);fd.append('athlete',v.athlete);fd.append('declaredResult',v.declaredResult);
      const p=await jsonRequest('/api/analyze-pdf',{method:'POST',body:fd});renderAnalysis(p,'PDF');
    }catch(e){renderAnalysis({note:e.message},'PDF')}
    finally{analyzePdfBtn.disabled=false}
  });

  form.addEventListener('submit',e=>{
    e.preventDefault();if(!validateBasics(true)) return;
    const v=fields();const file=form.elements.pdf.files?.[0];
    const rows=[
      ['Email',v.email],['Data de início',v.startDate],['Data de fim',v.endDate],
      ['Velejador / tripulação',v.athlete],['Clube',v.club],['Resultado declarado',v.declaredResult],
      ['Fonte',v.sourceUrl||file?.name||'—']
    ];
    if(lastAnalysis) rows.push(['Análise automática',ordinal(lastAnalysis.result_general)+' geral · '+ordinal(lastAnalysis.result_country)+' por país']);
    reviewData.replaceChildren(...rows.map(([k,val])=>{const d=document.createElement('div'),s=document.createElement('span'),b=document.createElement('strong');s.textContent=k;b.textContent=val;d.append(s,b);return d}));
    modal.hidden=false;document.body.style.overflow='hidden';confirmBtn.focus();
  });

  document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>{modal.hidden=true;document.body.style.overflow=''}));

  confirmBtn.addEventListener('click',async()=>{
    if(!validateBasics(true)) return;
    confirmBtn.disabled=true;confirmBtn.textContent='A enviar…';
    const v=fields();const file=form.elements.pdf.files?.[0];
    try{
      let p;
      if(file && !v.sourceUrl){
        const fd=new FormData();
        Object.entries(v).forEach(([k,val])=>fd.append(k,String(val)));
        fd.append('file',file);
        p=await jsonRequest('/api/submit-pdf',{method:'POST',body:fd});
      }else{
        p=await jsonRequest('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});
      }
      modal.hidden=true;document.body.style.overflow='';referenceId.textContent=p.reference||p.id||'—';success.hidden=false;
    }catch(e){setError(e.message);modal.hidden=true;document.body.style.overflow=''}
    finally{confirmBtn.disabled=false;confirmBtn.innerHTML='Enviar à FPV <span>→</span>'}
  });

  newSubmission.addEventListener('click',()=>{success.hidden=true;form.reset();analysis.hidden=true;lastAnalysis=null;window.scrollTo({top:0,behavior:'smooth'})});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden){modal.hidden=true;document.body.style.overflow=''}});
})();