(() => {
  'use strict';
  // Chave antiga mantida para preservar os dados já salvos neste navegador.
  const STORAGE_KEY = 'ritmo-routine-tracker-v1';
  const LAST_SYNC_KEY = `${STORAGE_KEY}-last-sync`;
  const PENDING_KEY = `${STORAGE_KEY}-pending-sync`;
  const SIDEBAR_KEY = 'ancora-sidebar-collapsed-v1';
  const SEED_TIMESTAMP = '2025-01-01T00:00:00.000Z';
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const SEED = [
    ['💗✨','Preparo para o dia','#d98ba8',['Hidratar estrias','Vestir roupa dia','Tomar café da manhã','Comida pets','Tour pets manhã (recolher cacas, ver nível água)','Ajustar janelas','Lavar o rosto','Skincare manhã','Escovar os dentes','Make do dia','Captura e registros digitais (entradas, hábitos, vestuário, Elisa, sono)']],
    ['💼✨','Preparo para o trabalho focado','#7484a8',['Limpar mesa e notebooks','Limpar caixa de entrada de e-mails','Escrever tarefas do dia','Ligar música de fundo','Ligar contador','Bloquear notificações e distrações']],
    ['🌞🧹','Geral da manhã','#dba866',['Organizar cama','Atividades lavanderia','Colocar coisas salas e quarto no lugar']],
    ['🍝','Almoço','#d58663',['Snacks pets','Almoçar','Tomar vitaminas','Escovar dentes']],
    ['🍏🧹','Geral da tarde','#88a67a',['Comer lanche','Reabastecer itens Elisa','Alocar entradas','Suplementos pets']],
    ['📉','Fim do expediente','#7a8391',['Escrever minhas tarefas','Desligar note trabalho','Descansar sem telas']],
    ['🌇🧹','Geral do entardecer','#df9a72',['Molhar plantas de fora','Ajustar janelas','Comidas pets noite','Recolher roupas varal']],
    ['🫧🌷','Momento do auto-cuidado','#b189aa',['Beber água','Alongar','Tomar banho','Escovar os dentes','Passar fio dental','Escovar e prender cabelo','Hidratar corpo']],
    ['🌚🧹','Geral da noite','#647388',['Colocar coisas fundos no lugar','Organizar cozinha','Limpar bancadas cozinha','Trocar lixos','Tour pets noite (recolher cacas, ver nível água)']],
    ['💤🛏️','Sono tranquilo','#7589a1',['Escovar dentes','Colocar pijama','Revisar portas e coisas ligadas','Skincare noite','Colocar água e chá na cabeceira','Captura e registros digitais (entradas, hábitos, vestuário, Elisa, sono)','Hidratar pés','Beber chá','Prece','Leitura']]
  ];
  const AREA_SEED = [
    ['casa','Casa','#f3e4d6'],['lazer','Lazer','#f4e1e9'],['estudos','Estudos','#e8e7f3'],
    ['movimento','Movimento','#e3eddf'],['extras','Extras','#ede6df'],
    ['tema-do-dia','Tema do dia','#e9e1ec']
  ];
  const AREA_ICONS = {'area-tema-do-dia':'♡','area-casa':'⌂','area-lazer':'♡','area-estudos':'✎','area-movimento':'✳','area-extras':'✦'};
  // Títulos legíveis nos exemplos enviados. Os campos e os dias podem ser editados.
  const ANCHOR_SEED = [
    ['casa','🍳','Janta, marmita e almoço',[1,2,4]],
    ['casa','🍳','Aquecer e preparos rápidos',[3]],
    ['casa','🍳','Janta e preparos especiais',[5]],
    ['casa','🍳','Preparos especiais',[6]],
    ['casa','🍳','Marmita',[0]],
    ['lazer','🌿','Mindfulness',[1]],
    ['lazer','☀️','Sol',[2,0]],
    ['lazer','🎵','Música | Chimas',[3]],
    ['lazer','🧉','Chimas',[4,5,6]],
    ['movimento','🏃','Cardio',[1]],
    ['movimento','🤸','Funcional',[4]],
    ['movimento','🏋️','Treino de força',[6]],
    ['movimento','🚶','Caminhada',[0]],
    ['lazer','📚','Leitura',[1]],
    ['lazer','🎨','Colorir ou jogar',[3]],
    ['lazer','🏊','Piscina',[4,0]],
    ['lazer','🎬','Filmes e/ou seriados',[5,6]],
    ['extras','👽','Atividades PC',[1,4]],
    ['extras','👽','Geral cozinha',[2]],
    ['extras','🌷','Cuidado pessoal',[3]],
    ['extras','🧵','Dobrar/costurar roupas',[5]],
    ['extras','🛍️','Compras',[6,0]],
    ['casa','💧','Roupas escuras',[1]],
    ['casa','💧','Roupas brancas',[2]],
    ['casa','💧','Roupas de bebê',[3,6]],
    ['casa','💧','Toalhas',[3]],
    ['casa','💧','Roupas de cama',[4]],
    ['casa','💧','Lingerie',[5]],
    ['casa','💧','Panos de cozinha e chão',[6]],
    ['tema-do-dia','🌅','Segunda: Start semana',[1]],
    ['tema-do-dia','➡️','Terça: Ordem no digital',[2]],
    ['tema-do-dia','🌿','Quarta: Meu espaço',[3]],
    ['tema-do-dia','🏠','Quinta: Ordem na casa',[4]],
    ['tema-do-dia','💼','Sexta: Profissional e fechamento em dia',[5]],
    ['tema-do-dia','🚗','Sábado: Casa e voltas extras',[6]],
    ['tema-do-dia','💛','Domingo: Descanso e relações em dia',[0]]
  ];

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const stamp = () => new Date().toISOString();
  const safeDate = (s) => { const d = new Date(`${s}T12:00:00`); return Number.isNaN(d.getTime()) ? new Date() : d; };
  const fmtDate = (s, opts = {weekday:'long', day:'numeric', month:'long'}) => new Intl.DateTimeFormat('pt-BR', opts).format(safeDate(s));
  const escapeHTML = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plannerHeadingInk = color => {
    const match=/^#([0-9a-f]{6})$/i.exec(color||'');
    if(!match)return '#25474c';
    const channels=[0,2,4].map(index=>.84*parseInt(match[1].slice(index,index+2),16)+.16*[201,208,205][index/2]);
    const luminance=channels.map(value=>{const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;});
    return luminance[0]*.2126+luminance[1]*.7152+luminance[2]*.0722<.35?'#fffdfa':'#25474c';
  };
  let state = loadState();
  let selectedDate = isoToday();
  let selectedAnchorArea = '';
  let activeRoutineId = null;
  let supabaseClient = null, session = null, syncTimer = null, saving = false, saveAgain = false;
  let syncKind = 'offline', syncMessage = 'Somente neste aparelho', localRevision = 0;

  function makeSeed() {
    const now = SEED_TIMESTAMP;
    return {version:3, routines:SEED.map(([icon,name,color,items], i) => ({id:`routine-seed-${i+1}`,name,description:'',icon,color,scheduledTime:'',weekdays:[0,1,2,3,4,5,6],startDate:'',endDate:'',items:items.map((label,j)=>({id:`routine-seed-${i+1}-item-${j+1}`,label,description:'',active:true})),updatedAt:now,deleted:false})),areas:makeAreaSeed(),anchors:makeAnchorSeed(),history:{}};
  }
  function makeAreaSeed(){return AREA_SEED.map(([id,name,color],order)=>({id:`area-${id}`,name,color,order:id==='tema-do-dia'?-1:order,updatedAt:SEED_TIMESTAMP,deleted:false}));}
  function makeAnchorSeed(){return ANCHOR_SEED.map(([area,icon,title,weekdays],index)=>({id:`anchor-seed-${index+1}`,areaId:`area-${area}`,icon,title,description:'',weekdays,startDate:'',endDate:'',updatedAt:SEED_TIMESTAMP,deleted:false}));}
  function plannerNeedsUpgrade(data){
    return !Array.isArray(data.areas)||!Array.isArray(data.anchors)||
      makeAreaSeed().some(seed=>!data.areas.some(area=>area.id===seed.id))||
      makeAnchorSeed().some(seed=>!data.anchors.some(anchor=>anchor.id===seed.id));
  }
  function ensurePlannerData(data){
    if(!Array.isArray(data.areas))data.areas=[];
    if(!Array.isArray(data.anchors))data.anchors=[];
    const areaIds=new Set(data.areas.map(area=>area.id)),anchorIds=new Set(data.anchors.map(anchor=>anchor.id));
    for(const area of makeAreaSeed())if(!areaIds.has(area.id))data.areas.push(area);
    for(const anchor of makeAnchorSeed())if(!anchorIds.has(anchor.id))data.anchors.push(anchor);
    return data;
  }
  function normalizeSeedItemIds(data) {
    for(let i=0;i<SEED.length;i++) {
      const routine=data.routines?.find(r=>r.id===`routine-seed-${i+1}`);if(!routine)continue;
      const idsByLabel=new Map(SEED[i][3].map((label,j)=>[label,`routine-seed-${i+1}-item-${j+1}`]));
      const remap=new Map(),used=new Set();
      for(const item of routine.items||[]) {
        const stableId=idsByLabel.get(item.label);
        if(!stableId||used.has(stableId))continue;
        used.add(stableId);remap.set(item.id,stableId);item.id=stableId;
      }
      for(const day of Object.values(data.history||{}))for(const item of day.routines?.[routine.id]?.items||[])if(remap.has(item.id))item.id=remap.get(item.id);
    }
    return data;
  }
  function loadState() {
    let parsed;
    try {parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));} catch {}
    if(parsed && Array.isArray(parsed.routines) && parsed.history) {
      const needsUpgrade=plannerNeedsUpgrade(parsed);
      const normalized=ensurePlannerData(normalizeSeedItemIds(parsed));
      try {localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));if(needsUpgrade)localStorage.setItem(PENDING_KEY,'local');} catch {}
      return normalized;
    }
    const fresh = makeSeed();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); localStorage.setItem(PENDING_KEY,'local'); } catch {}
    return fresh;
  }
  function dayIsScheduled(routine, date) {
    if (routine.deleted) return false;
    if (routine.startDate && date < routine.startDate) return false;
    if (routine.endDate && date > routine.endDate) return false;
    return (routine.weekdays || []).includes(safeDate(date).getDay());
  }
  function ensureDay(date) {
    if (!state.history[date]) state.history[date] = {routines:{}, finalized:false, updatedAt:stamp()};
    const day = state.history[date];
    if (!day.routines) day.routines = {};
    if (!day.excludedRoutines) day.excludedRoutines = {};
    for (const r of state.routines.filter(x => dayIsScheduled(x,date))) {
      if (day.routines[r.id] || day.excludedRoutines[r.id]) continue;
      day.routines[r.id] = {routineId:r.id,name:r.name,description:r.description||'',icon:r.icon,color:r.color,scheduledTime:r.scheduledTime||'',items:r.items.filter(x=>x.active!==false).map(item=>({id:item.id,label:item.label,description:item.description||'',done:false,touched:false,changedAt:day.updatedAt}))};
      day.updatedAt = stamp();
    }
    return day;
  }
  function sortSnapshotItems(snapshot,routine) {
    if(!Array.isArray(snapshot.items))return;
    const byId=new Map(routine.items.map((item,index)=>[item.id,index]));
    const byLabel=new Map(routine.items.map((item,index)=>[item.label,index]));
    const position=item=>byId.get(item.id)??byLabel.get(item.label)??Number.MAX_SAFE_INTEGER;
    snapshot.items.sort((a,b)=>position(a)-position(b));
  }
  function saveLocal() {
    localRevision++;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.setItem(PENDING_KEY,session?.user?.id||'local'); }
    catch { toast('O armazenamento deste navegador está cheio. Exporte seu histórico para guardar uma cópia.'); }
    setSyncStatus(session?.user?'syncing':'offline',session?.user?'Alterações aguardando sincronização...':'Dados neste aparelho');
    scheduleSync();
  }
  function mutateDay(fn) {
    const day = ensureDay(selectedDate); fn(day); day.updatedAt = stamp(); saveLocal(); renderDay(); renderPlanner(); renderFocusRoutine();
  }
  function renderDateHeader() {
    $('#selected-date').value = selectedDate;
    const d = safeDate(selectedDate), today = isoToday();
    $('#today-label').textContent = selectedDate === today ? 'UM PONTO DE APOIO PARA O SEU DIA' : fmtDate(selectedDate).toLocaleUpperCase('pt-BR');
    $('#greeting').textContent = selectedDate === today ? 'Um passo de cada vez.' : fmtDate(selectedDate, {day:'numeric',month:'long'});
    $('#today-button').classList.toggle('hidden', selectedDate === today);
  }
  function renderProgress() {
    const day = ensureDay(selectedDate), items = Object.values(day.routines).flatMap(r=>r.items);
    const done = items.filter(i=>i.done).length, pct = items.length ? Math.round(done/items.length*100) : 0;
    $('#progress-value').textContent = `${pct}%`;
    $('#progress-label').textContent = items.length ? `${done} de ${items.length} passos concluídos` : 'Seu progresso';
    $('#progress-bar').style.width = `${pct}%`;
    $('#finish-day').textContent = day.finalized ? 'Dia concluído ✓' : 'Concluir meu dia';
    $('#finish-day').disabled = day.finalized;
  }
  function renderDay() {
    renderDateHeader();
    const day = ensureDay(selectedDate), list = $('#routine-list');
    const routines = Object.values(day.routines).sort((a,b)=>{
      const aTime=a.scheduledTime||'99:99',bTime=b.scheduledTime||'99:99';
      return aTime.localeCompare(bTime);
    });
    $('#empty-day').classList.toggle('hidden', routines.length>0);
    list.innerHTML = routines.map(r => {
      const done=r.items.filter(i=>i.done).length, total=r.items.length;
      return `<article class="routine-card" style="--routine-color:${escapeHTML(r.color)}">
        <button class="routine-card-head" data-open-routine="${escapeHTML(r.routineId)}"><span class="routine-icon">${escapeHTML(r.icon)}</span><span class="routine-title"><strong>${escapeHTML(r.name)}</strong><small>${r.scheduledTime?`${escapeHTML(r.scheduledTime)} · `:''}${done} de ${total} passos</small></span></button>
        <div class="routine-card-actions"><button type="button" class="routine-remove-day" data-remove-routine-day="${escapeHTML(r.routineId)}">Remover deste dia</button></div>
      </article>`;
    }).join('');
    renderProgress();
  }
  function renderFocusRoutine() {
    if(!activeRoutineId)return;
    const day=ensureDay(selectedDate),routine=day.routines[activeRoutineId];
    if(!routine){$('#routine-focus-dialog').close();return;}
    const done=routine.items.filter(item=>item.done).length,total=routine.items.length;
    const focus=$('#routine-focus-dialog');focus.style.setProperty('--routine-color',routine.color);
    $('#focus-date').textContent=fmtDate(selectedDate).toLocaleUpperCase('pt-BR');
    $('#focus-routine-icon').textContent=routine.icon;
    $('#focus-routine-name').textContent=routine.name;
    $('#focus-routine-count').textContent=`${routine.scheduledTime?`${routine.scheduledTime} · `:''}${done} de ${total} passos concluídos`;
    $('#focus-routine-description').textContent=routine.description||'';
    $('#focus-routine-description').classList.toggle('hidden',!routine.description);
    $('#focus-progress-bar').style.width=`${total?done/total*100:0}%`;
    $('#focus-steps').innerHTML=routine.items.map(item=>`<label class="focus-step ${item.done?'is-done':''}"><input type="checkbox" data-focus-item="${escapeHTML(item.id)}" ${item.done?'checked':''} ${day.finalized?'disabled':''}><span class="focus-check"></span><span class="focus-step-copy"><span>${escapeHTML(item.label)}</span>${item.description?`<small>${escapeHTML(item.description)}</small>`:''}</span></label>`).join('');
  }
  function openFocusRoutine(id) {
    if(!ensureDay(selectedDate).routines[id])return;
    activeRoutineId=id;renderFocusRoutine();$('#routine-focus-dialog').showModal();
  }
  function renderManage() {
    const routines=state.routines.filter(r=>!r.deleted).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    $('#manage-list').innerHTML = routines.length ? routines.map(r=>`<article class="manage-card" style="--routine-color:${escapeHTML(r.color)}"><span class="routine-icon">${escapeHTML(r.icon)}</span><div class="manage-info"><strong>${escapeHTML(r.name)}</strong><small>${r.scheduledTime?`${escapeHTML(r.scheduledTime)} · `:''}${r.items.filter(x=>x.active!==false).length} passos · ${r.weekdays.length===7?'todos os dias':r.weekdays.length===5&&r.weekdays.includes(1)&&r.weekdays.includes(5)?'dias úteis':r.weekdays.length===2&&r.weekdays.includes(0)&&r.weekdays.includes(6)?'fim de semana':r.weekdays.map(d=>WEEKDAYS[d]).join(', ')}</small></div><button class="small-edit" data-edit="${escapeHTML(r.id)}">Editar</button></article>`).join('') : '<div class="empty-state"><span>✦</span><h3>Suas rotinas começam aqui</h3><p>Crie uma rotina que combine com seu dia.</p></div>';
  }
  function renderHistory() {
    const days=Object.keys(state.history).filter(date=>Object.values(state.history[date]?.routines||{}).length).sort((a,b)=>b.localeCompare(a));
    $('#history-list').innerHTML = days.length ? days.map(date=>{
      const day=state.history[date], items=Object.values(day.routines||{}).flatMap(r=>r.items||[]), done=items.filter(i=>i.done).length, pct=items.length?Math.round(done/items.length*100):0;
      return `<button class="history-card" data-history-date="${date}"><span class="history-date"><strong>${escapeHTML(fmtDate(date,{day:'numeric'}))}</strong><small>${escapeHTML(fmtDate(date,{weekday:'long',month:'long'}))}</small></span><span class="history-stat"><strong>${done}/${items.length}</strong><small>passos concluídos</small></span><span class="history-meter"><i style="width:${pct}%"></i></span><span class="history-percent">${pct}%</span><span class="history-arrow">→</span></button>`;
    }).join('') : '<div class="empty-state"><span>♡</span><h3>Seu histórico vai aparecer aqui</h3><p>Comece uma rotina e seus passos ficam registrados por dia.</p></div>';
  }
  function orderedAreas(){return state.areas.filter(area=>!area.deleted).sort((a,b)=>(a.order??0)-(b.order??0)||a.name.localeCompare(b.name,'pt-BR'));}
  function scheduledRoutines(day){return Object.values(day.routines||{}).sort((a,b)=>(a.scheduledTime||'99:99').localeCompare(b.scheduledTime||'99:99'));}
  function renderPlanner(){
    $('#planner-date').value=selectedDate;
    $('#planner-date-label').textContent=fmtDate(selectedDate);
    $('#planner-today').classList.toggle('hidden',selectedDate===isoToday());
    const areas=orderedAreas(),day=ensureDay(selectedDate);
    const areaBlocks=areas.map(area=>{
      const anchors=state.anchors.filter(anchor=>anchor.areaId===area.id&&dayIsScheduled(anchor,selectedDate)).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
      return `<section class="planner-block${area.id==='area-tema-do-dia'?' planner-theme':''}" style="--area-color:${escapeHTML(area.color)};--heading-ink:${plannerHeadingInk(area.color)}"><h2><span class="planner-heading-icon" aria-hidden="true">${AREA_ICONS[area.id]||'✦'}</span><span>${escapeHTML(area.name)}</span></h2><div class="planner-block-body">${anchors.length?anchors.map(anchor=>`<div class="planner-item"><span class="planner-item-icon">${escapeHTML(anchor.icon||'✦')}</span><div><strong>${escapeHTML(anchor.title)}</strong>${anchor.description?`<p>${escapeHTML(anchor.description)}</p>`:''}</div></div>`).join(''):'<p class="planner-empty">Nenhuma âncora neste dia.</p>'}</div></section>`;
    });
    const routines=scheduledRoutines(day);
    const routineBlock=`<section class="planner-block planner-routines"><h2><span class="planner-heading-icon" aria-hidden="true">☑</span><span>Rotinas do dia</span></h2><div class="planner-block-body">${routines.length?routines.map(r=>`<button type="button" class="planner-routine" data-planner-routine="${escapeHTML(r.routineId)}"><span>${escapeHTML(r.icon)}</span><strong>${escapeHTML(r.name)}</strong></button>`).join(''):'<p class="planner-empty">Nenhuma rotina neste dia.</p>'}</div></section>`;
    const themeIndex=areas.findIndex(area=>area.id==='area-tema-do-dia');
    const themeBlock=themeIndex<0?'':areaBlocks[themeIndex];
    const otherBlocks=areaBlocks.filter((_,index)=>index!==themeIndex);
    $('#planner-grid').innerHTML=`${themeBlock}<div class="planner-areas">${otherBlocks.join('')}</div>${routineBlock}`;
  }
  function renderAnchors(){
    const areas=orderedAreas(),areaById=new Map(areas.map(area=>[area.id,area]));
    if(selectedAnchorArea&&!areaById.has(selectedAnchorArea))selectedAnchorArea='';
    $('#anchor-area-filter').innerHTML='<option value="">Todas as áreas</option>'+areas.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    $('#anchor-area-filter').value=selectedAnchorArea;
    const anchors=state.anchors.filter(anchor=>!anchor.deleted&&(!selectedAnchorArea||anchor.areaId===selectedAnchorArea)).sort((a,b)=>(areaById.get(a.areaId)?.order??999)-(areaById.get(b.areaId)?.order??999)||a.title.localeCompare(b.title,'pt-BR'));
    $('#anchor-list').innerHTML=anchors.length?anchors.map(anchor=>`<article class="anchor-card"><span class="anchor-icon">${escapeHTML(anchor.icon||'✦')}</span><div class="anchor-info"><strong>${escapeHTML(anchor.title)}</strong><small>${escapeHTML(areaById.get(anchor.areaId)?.name||'Área indisponível')} · ${anchor.weekdays?.length===7?'Todos os dias':(anchor.weekdays||[]).map(day=>WEEKDAYS[day]).join(', ')}${anchor.startDate?` · a partir de ${escapeHTML(fmtDate(anchor.startDate,{day:'numeric',month:'short',year:'numeric'}))}`:''}${anchor.endDate?` · até ${escapeHTML(fmtDate(anchor.endDate,{day:'numeric',month:'short',year:'numeric'}))}`:''}</small>${anchor.description?`<p>${escapeHTML(anchor.description)}</p>`:''}</div><button type="button" class="small-edit" data-edit-anchor="${escapeHTML(anchor.id)}">Editar</button></article>`).join(''):selectedAnchorArea?'<div class="empty-state"><h3>Nenhuma âncora nesta área</h3><p>Escolha outra área ou crie uma nova âncora.</p></div>':'<div class="empty-state"><h3>Suas âncoras começam aqui</h3><p>Crie uma âncora para organizar seu dia.</p></div>';
    $('#area-list').innerHTML=areas.map((area,index)=>`<article class="area-card"><span class="area-swatch" style="background:${escapeHTML(area.color)}"></span><strong>${escapeHTML(area.name)}</strong><div class="area-card-actions"><button type="button" data-move-area="up" data-area-id="${escapeHTML(area.id)}" aria-label="Mover ${escapeHTML(area.name)} para cima" ${index===0?'disabled':''}>↑</button><button type="button" data-move-area="down" data-area-id="${escapeHTML(area.id)}" aria-label="Mover ${escapeHTML(area.name)} para baixo" ${index===areas.length-1?'disabled':''}>↓</button><button type="button" class="small-edit" data-edit-area="${escapeHTML(area.id)}">Editar</button></div></article>`).join('');
  }
  function render() { renderDay(); renderManage(); renderHistory(); renderPlanner(); renderAnchors(); if($('#routine-focus-dialog').open)renderFocusRoutine(); }
  function setSection(section){
    $$('.workspace-view').forEach(view=>view.classList.toggle('active-workspace',view.id===`${section}-workspace`));
    $$('.sidebar-link').forEach(link=>{const active=link.dataset.section===section;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    document.body.classList.remove('sidebar-open');updateSidebarToggle();
  }
  function updateSidebarToggle(){
    const mobile=window.matchMedia('(max-width:700px)').matches;
    const expanded=mobile?document.body.classList.contains('sidebar-open'):!document.body.classList.contains('sidebar-collapsed');
    const button=$('#sidebar-toggle');
    button.setAttribute('aria-expanded',String(expanded));
    button.setAttribute('aria-label',mobile?(expanded?'Fechar menu':'Abrir menu'):(expanded?'Recolher menu':'Expandir menu'));
  }
  function setView(view) {
    $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===view));
    $$('.view').forEach(v=>v.classList.toggle('active-view',v.id===`${view}-view`));
    if(view==='history')renderHistory(); if(view==='manage')renderManage();
  }
  function buildWeekdayOptions(selected=[0,1,2,3,4,5,6],target='#weekday-options') {
    $(target).innerHTML = WEEKDAYS.map((day,i)=>`<label class="weekday-option"><input type="checkbox" value="${i}" ${selected.includes(i)?'checked':''}><span>${day}</span></label>`).join('');
  }
  function updateItemOrderButtons() {
    const rows=$$('.item-editor-row',$('#routine-items-editor'));
    rows.forEach((row,index)=>{row.querySelector('[data-move="up"]').disabled=index===0;row.querySelector('[data-move="down"]').disabled=index===rows.length-1;});
  }
  function addItemEditor(item='') {
    const row=document.createElement('div'); row.className='item-editor-row';
    row.dataset.itemId=typeof item==='string'?uid():item.id;
    const value=typeof item==='string'?item:item.label;
    const description=typeof item==='string'?'':item.description||'';
    row.innerHTML=`<div class="item-editor-main"><div class="item-order-actions"><button type="button" data-move="up" aria-label="Mover passo para cima" title="Mover para cima">↑</button><button type="button" data-move="down" aria-label="Mover passo para baixo" title="Mover para baixo">↓</button></div><input class="text-input item-name-input" maxlength="120" value="${escapeHTML(value)}" aria-label="Nome do passo" placeholder="Nome do passo"><button type="button" class="remove-item" aria-label="Remover passo">×</button></div><textarea class="text-input description-input item-description-input" maxlength="300" rows="2" aria-label="Descrição do passo ${escapeHTML(value||'novo')}" placeholder="Descrição do passo (opcional)">${escapeHTML(description)}</textarea>`;
    $('#routine-items-editor').append(row);updateItemOrderButtons();
  }
  function openRoutineDialog(id=null) {
    const r=state.routines.find(x=>x.id===id && !x.deleted);
    $('#routine-form').reset(); $('#routine-id').value=r?.id||''; $('#routine-dialog-title').textContent=r?'Editar rotina':'Nova rotina';
    $('#routine-name').value=r?.name||''; $('#routine-description').value=r?.description||''; $('#routine-icon').value=r?.icon||'✨'; $('#routine-color').value=r?.color||'#e8a59c';$('#routine-time').value=r?.scheduledTime||'';
    $('#routine-start').value=r?.startDate||''; $('#routine-end').value=r?.endDate||'';
    buildWeekdayOptions(r?.weekdays||[0,1,2,3,4,5,6]);
    $('#routine-items-editor').innerHTML=''; (r?.items.filter(i=>i.active!==false)||['']).forEach(addItemEditor);
    $('#delete-routine').classList.toggle('hidden',!r); $('#routine-dialog').showModal();
  }
  function saveRoutine(event) {
    event.preventDefault();
    const id=$('#routine-id').value||uid(), existing=state.routines.find(x=>x.id===id), name=$('#routine-name').value.trim();
    const items=$$('.item-editor-row',$('#routine-items-editor')).map(row=>({id:row.dataset.itemId,label:$('.item-name-input',row).value.trim(),description:$('.item-description-input',row).value.trim(),active:true})).filter(item=>item.label);
    if(!name){toast('Dê um nome para a rotina.');return;}
    if(!items.length){toast('Adicione pelo menos um passo.');return;}
    const weekdays=$$('#weekday-options input:checked').map(input=>Number(input.value));
    if(!weekdays.length){toast('Escolha ao menos um dia da semana.');return;}
    if($('#routine-end').value && $('#routine-start').value && $('#routine-end').value < $('#routine-start').value){toast('A data final precisa ser igual ou posterior à data inicial.');return;}
    const previousItems=new Map((existing?.items||[]).map(item=>[item.id,item]));
    const next={id,name,description:$('#routine-description').value.trim(),icon:$('#routine-icon').value.trim()||'✨',color:$('#routine-color').value,scheduledTime:$('#routine-time').value,weekdays,startDate:$('#routine-start').value,endDate:$('#routine-end').value,items:items.map(item=>({...previousItems.get(item.id),...item})),updatedAt:stamp(),deleted:false};
    if(existing)state.routines=state.routines.map(x=>x.id===id?next:x);else state.routines.push(next);
    for(const [date,day] of Object.entries(state.history))if(date>=isoToday()&&!day.finalized&&day.routines?.[id]){
      const snapshot=day.routines[id],currentItems=new Map(next.items.map(item=>[item.id,item]));
      snapshot.name=next.name;snapshot.description=next.description;snapshot.icon=next.icon;snapshot.color=next.color;snapshot.scheduledTime=next.scheduledTime;
      for(const item of snapshot.items){const current=currentItems.get(item.id);if(current){item.label=current.label;item.description=current.description;}}
      sortSnapshotItems(snapshot,next);day.updatedAt=stamp();
    }
    saveLocal(); $('#routine-dialog').close(); render(); toast('Rotina salva.');
  }
  function openAnchorDialog(id=null){
    const anchor=state.anchors.find(item=>item.id===id&&!item.deleted),areas=orderedAreas();
    if(!areas.length){toast('Crie uma área antes de adicionar âncoras.');return;}
    $('#anchor-form').reset();$('#anchor-id').value=anchor?.id||'';
    $('#anchor-dialog-title').textContent=anchor?'Editar âncora':'Nova âncora';
    $('#anchor-title').value=anchor?.title||'';$('#anchor-icon').value=anchor?.icon||'✨';
    $('#anchor-description').value=anchor?.description||'';
    $('#anchor-area').innerHTML=areas.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    $('#anchor-area').value=anchor?.areaId||areas[0].id;
    $('#anchor-start').value=anchor?.startDate||'';$('#anchor-end').value=anchor?.endDate||'';
    buildWeekdayOptions(anchor?.weekdays||[0,1,2,3,4,5,6],'#anchor-weekday-options');
    $('#delete-anchor').classList.toggle('hidden',!anchor);$('#anchor-dialog').showModal();
  }
  function saveAnchor(event){
    event.preventDefault();
    const id=$('#anchor-id').value||uid(),existing=state.anchors.find(anchor=>anchor.id===id);
    const title=$('#anchor-title').value.trim(),weekdays=$$('#anchor-weekday-options input:checked').map(input=>Number(input.value));
    if(!title){toast('Dê um nome à âncora.');return;}
    if(!weekdays.length){toast('Escolha ao menos um dia da semana.');return;}
    if(!orderedAreas().some(area=>area.id===$('#anchor-area').value)){toast('Escolha uma área disponível.');return;}
    if($('#anchor-end').value&&$('#anchor-start').value&&$('#anchor-end').value<$('#anchor-start').value){toast('A data final precisa ser igual ou posterior à inicial.');return;}
    const next={id,title,icon:$('#anchor-icon').value.trim()||'✦',description:$('#anchor-description').value.trim(),areaId:$('#anchor-area').value,weekdays,startDate:$('#anchor-start').value,endDate:$('#anchor-end').value,updatedAt:stamp(),deleted:false};
    if(existing)state.anchors=state.anchors.map(anchor=>anchor.id===id?next:anchor);else state.anchors.push(next);
    saveLocal();$('#anchor-dialog').close();render();toast('Âncora salva.');
  }
  function deleteAnchor(){
    const anchor=state.anchors.find(item=>item.id===$('#anchor-id').value);if(!anchor)return;
    if(!confirm(`Excluir a âncora “${anchor.title}”?`))return;
    anchor.deleted=true;anchor.updatedAt=stamp();saveLocal();$('#anchor-dialog').close();render();toast('Âncora excluída.');
  }
  function openAreaDialog(id=null){
    const area=state.areas.find(item=>item.id===id&&!item.deleted);
    $('#area-form').reset();$('#area-id').value=area?.id||'';
    $('#area-dialog-title').textContent=area?'Editar área':'Nova área';
    $('#area-name').value=area?.name||'';$('#area-color').value=area?.color||'#e8e5dd';
    $('#delete-area').classList.toggle('hidden',!area);$('#area-dialog').showModal();
  }
  function saveArea(event){
    event.preventDefault();const id=$('#area-id').value||uid(),name=$('#area-name').value.trim();
    if(!name){toast('Dê um nome à área.');return;}
    const existing=state.areas.find(area=>area.id===id);
    const next={id,name,color:$('#area-color').value,order:existing?.order??state.areas.length,updatedAt:stamp(),deleted:false};
    if(existing)state.areas=state.areas.map(area=>area.id===id?next:area);else state.areas.push(next);
    saveLocal();$('#area-dialog').close();render();toast('Área salva.');
  }
  function deleteArea(){
    const area=state.areas.find(item=>item.id===$('#area-id').value);if(!area)return;
    if(state.anchors.some(anchor=>!anchor.deleted&&anchor.areaId===area.id)){toast('Mova ou exclua as âncoras desta área antes de excluí-la.');return;}
    if(!confirm(`Excluir a área “${area.name}”?`))return;
    area.deleted=true;area.updatedAt=stamp();saveLocal();$('#area-dialog').close();render();toast('Área excluída.');
  }
  function moveArea(id,direction){
    const areas=orderedAreas(),index=areas.findIndex(area=>area.id===id),other=index+(direction==='up'?-1:1);
    if(index<0||other<0||other>=areas.length)return;
    [areas[index],areas[other]]=[areas[other],areas[index]];
    const now=stamp();areas.forEach((area,order)=>{if(area.order!==order){area.order=order;area.updatedAt=now;}});
    saveLocal();renderAnchors();renderPlanner();
  }
  function deleteRoutine() {
    const id=$('#routine-id').value;if(!id)return;
    const r=state.routines.find(x=>x.id===id); if(!r)return;
    if(!confirm(`Excluir “${r.name}”? Os registros antigos continuam no histórico.`))return;
    r.deleted=true;r.updatedAt=stamp();saveLocal();$('#routine-dialog').close();render();toast('Rotina excluída.');
  }
  function removeRoutineFromDay(routineId) {
    const day=ensureDay(selectedDate),routine=day.routines[routineId];if(!routine)return;
    if(!confirm(`Remover “${routine.name}” de ${fmtDate(selectedDate)}? O registro e seus passos serão excluídos somente deste dia. A programação da rotina continua igual.`))return;
    day.excludedRoutines={...day.excludedRoutines,[routineId]:stamp()};
    delete day.routines[routineId];day.updatedAt=stamp();
    if(activeRoutineId===routineId){activeRoutineId=null;$('#routine-focus-dialog').close();}
    saveLocal();render();toast('Rotina removida apenas deste dia.');
  }
  function finishDay() {
    const day=ensureDay(selectedDate); if(day.finalized)return;
    if(!confirm('Concluir este dia? Os passos ainda abertos serão registrados como não realizados.'))return;
    for(const r of Object.values(day.routines))for(const i of r.items)if(!i.done){i.done=false;i.changedAt=stamp();}
    day.finalized=true;day.updatedAt=stamp();saveLocal();renderDay();renderPlanner();renderHistory();toast('Dia registrado no histórico.');
  }
  function setSelectedDate(date) {
    if(!date)return; selectedDate=date;ensureDay(date);saveLocal();renderDay();renderPlanner();
  }
  function shiftSelectedDate(amount){
    const date=safeDate(selectedDate);date.setDate(date.getDate()+amount);
    setSelectedDate(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
  }
  function csvCell(value) { return `"${String(value??'').replace(/"/g,'""')}"`; }
  function exportCSV() {
    const rows=[['Data','Rotina','Ícone','Passo','Status','Dia concluído','Descrição da rotina','Descrição do passo','Horário agendado']];
    for(const date of Object.keys(state.history).sort()) {
      const day=state.history[date];
      for(const routine of Object.values(day.routines||{}))for(const item of routine.items||[]) rows.push([date,routine.name,routine.icon,item.label,item.done?'Realizado':'Não realizado',day.finalized?'Sim':'Não',routine.description||'',item.description||'',routine.scheduledTime||'']);
    }
    if(rows.length===1){toast('Ainda não há registros para exportar.');return;}
    const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`ancora-historico-${isoToday()}.csv`;a.click();URL.revokeObjectURL(url);toast('Histórico exportado em CSV.');
  }
  function toast(message) {
    const node=$('#toast'); node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),3200);
  }

  function mergeState(a={},b={}) {
    a=ensurePlannerData(normalizeSeedItemIds(a));b=ensurePlannerData(normalizeSeedItemIds(b));
    const mergeRecords=(left,right)=>{
      const records=new Map();
      for(const record of [...left,...right]){
        const previous=records.get(record.id),currentTime=Date.parse(record.updatedAt||0)||0,previousTime=Date.parse(previous?.updatedAt||0)||0;
        if(!previous||currentTime>=previousTime)records.set(record.id,structuredClone(record));
      }
      return [...records.values()];
    };
    const areas=mergeRecords(a.areas,b.areas),anchors=mergeRecords(a.anchors,b.anchors);
    const routines=new Map();
    for(const r of [...(a.routines||[]),...(b.routines||[])]) {
      const prev=routines.get(r.id), rt=Date.parse(r.updatedAt||0)||0, pt=Date.parse(prev?.updatedAt||0)||0;
      if(!prev||rt>=pt)routines.set(r.id,structuredClone(r));
    }
    const history={};
    for(const date of new Set([...Object.keys(a.history||{}),...Object.keys(b.history||{})])) {
      const x=a.history?.[date]||{},y=b.history?.[date]||{},routinesForDay={};
      const excludedRoutines={};
      for(const rid of new Set([...Object.keys(x.excludedRoutines||{}),...Object.keys(y.excludedRoutines||{})])){
        const left=x.excludedRoutines?.[rid]||'',right=y.excludedRoutines?.[rid]||'';
        excludedRoutines[rid]=left>right?left:right;
      }
      for(const rid of new Set([...Object.keys(x.routines||{}),...Object.keys(y.routines||{})])) {
        if(excludedRoutines[rid])continue;
        const p=x.routines?.[rid],q=y.routines?.[rid];if(!p||!q){routinesForDay[rid]=structuredClone(p||q);continue;}
        const base=(Date.parse(y.updatedAt||'')||0)>=(Date.parse(x.updatedAt||'')||0)?q:p;
        const itemMap=new Map();
        for(const it of [...(p.items||[]),...(q.items||[])]){
          const old=itemMap.get(it.id);
          // Um passo recém-criado como incompleto não substitui uma ação da pessoa,
          // mesmo que o outro aparelho tenha aberto o dia mais tarde.
          const changed=it.touched===true||it.done===true;
          const oldChanged=old&&(old.touched===true||old.done===true);
          const time=Date.parse(it.changedAt||'')||0,oldTime=Date.parse(old?.changedAt||'')||0;
          if(!old||(changed&&!oldChanged)||(changed===oldChanged&&(time>oldTime||(time===oldTime&&it.done&&!old.done)))){
            itemMap.set(it.id,{...structuredClone(it),touched:changed});
          }
        }
        routinesForDay[rid]={...structuredClone(base),items:[...itemMap.values()]};
      }
      const maxStamp=Math.max(Date.parse(x.updatedAt||0)||0,Date.parse(y.updatedAt||0)||0);
      const finalized=Boolean(x.finalized||y.finalized);
      if(!finalized&&date>=isoToday())for(const [rid,snapshot] of Object.entries(routinesForDay)){
        const routine=routines.get(rid);if(routine&&!routine.deleted){
          snapshot.name=routine.name;snapshot.description=routine.description||'';snapshot.icon=routine.icon;snapshot.color=routine.color;snapshot.scheduledTime=routine.scheduledTime||'';
          const currentItems=new Map(routine.items.map(item=>[item.id,item]));
          for(const item of snapshot.items){const current=currentItems.get(item.id);if(current){item.label=current.label;item.description=current.description||'';}}
          sortSnapshotItems(snapshot,routine);
        }
      }
      history[date]={routines:routinesForDay,excludedRoutines,finalized,updatedAt:new Date(maxStamp||Date.now()).toISOString()};
    }
    return {version:3,routines:[...routines.values()],areas,anchors,history};
  }
  function configured() { const c=window.ANCORA_SUPABASE;return Boolean(window.supabase?.createClient&&c?.url&&c?.anonKey); }
  function configureSupabase() {
    if(!configured()){setSyncStatus('offline','Configure o Supabase para sincronizar entre dispositivos.');return false;}
    if(!supabaseClient){const c=window.ANCORA_SUPABASE;supabaseClient=window.supabase.createClient(c.url,c.anonKey);}
    return true;
  }
  function setSyncStatus(kind,message) {
    syncKind=kind;syncMessage=message;
    const el=$('#sync-indicator');el.className=`sync-indicator ${kind}`;$('#sync-label').textContent=message;
    $('#account-status').textContent=message;
    ['sync-now','sync-download','sync-upload'].forEach(id=>{$(`#${id}`).disabled=kind==='syncing';});
    updateSyncSummary();
  }
  function updateSyncSummary() {
    const labels={offline:'Desconectada',syncing:'Sincronizando',online:'Conectada',error:'Pendente'};
    $('#sync-detail-status').textContent=configured()?labels[syncKind]||'Verificando':'Não configurada';
    const last=localStorage.getItem(LAST_SYNC_KEY);
    $('#sync-detail-last').textContent=last?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(last)):'Ainda não confirmada';
    $('#sync-detail-account').textContent=session?.user?.email||'Nenhuma conta conectada';
    $('#sync-detail-pending').textContent=localStorage.getItem(PENDING_KEY)?'Aguardando confirmação':'Nenhuma pendente';
  }
  async function readRemote() {
    const c=window.ANCORA_SUPABASE;
    const {data,error}=await supabaseClient.from(c.table).select('data,updated_at').eq('user_id',session.user.id).eq('id',c.recordId).maybeSingle();
    if(error)throw error;return data;
  }
  async function pushSync(successMessage='Sincronizado com a nuvem') {
    if(!configureSupabase()||!session?.user)return false;
    if(saving){saveAgain=true;return false;} saving=true;setSyncStatus('syncing','Sincronizando…');
    try {
      do {
        saveAgain=false;let committed=false;
        for(let attempt=0;attempt<7&&!committed;attempt++) {
          const revisionAtStart=localRevision;
          const remote=await readRemote();state=mergeState(state,remote?.data||{});localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
          const updatedAt=new Date(Math.max(Date.now(),(Date.parse(remote?.updated_at||'')||0)+1)).toISOString();
          let result;
          if(remote) result=await supabaseClient.from(window.ANCORA_SUPABASE.table).update({data:state,updated_at:updatedAt}).eq('user_id',session.user.id).eq('id',window.ANCORA_SUPABASE.recordId).eq('updated_at',remote.updated_at).select('updated_at').maybeSingle();
          else result=await supabaseClient.from(window.ANCORA_SUPABASE.table).insert({user_id:session.user.id,id:window.ANCORA_SUPABASE.recordId,data:state,updated_at:updatedAt}).select('updated_at').maybeSingle();
          if(result.error?.code==='23505')continue;if(result.error)throw result.error;if(!result.data)continue;committed=true;
          if(localRevision!==revisionAtStart)saveAgain=true;
        }
        if(!committed)throw new Error('Os dados mudaram em outro aparelho. Tente sincronizar novamente.');
        render();
      } while(saveAgain);
      try {localStorage.removeItem(PENDING_KEY);localStorage.setItem(LAST_SYNC_KEY,stamp());} catch {}
      setSyncStatus('online',successMessage);return true;
    } catch(error) { console.error('Falha na sincronização:',error);try{localStorage.setItem(PENDING_KEY,session.user.id);}catch{}setSyncStatus('error',`Pendente: ${error.message||'falha na conexão'}`);toast('A alteração ficou neste aparelho, mas ainda não foi confirmada na nuvem.');return false; }
    finally {saving=false;}
  }
  async function pullSync() {
    if(!configureSupabase()||!session?.user)return false;
    setSyncStatus('syncing','Baixando dados da nuvem...');
    try {
      const remote=await readRemote();
      if(!remote){setSyncStatus('online','Ainda não há dados na nuvem para baixar.');return true;}
      state=mergeState(state,remote.data||{});
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      if(JSON.stringify(state)!==JSON.stringify(remote.data)){
        localStorage.setItem(PENDING_KEY,session.user.id);
        scheduleSync();
      }
      localStorage.setItem(LAST_SYNC_KEY,stamp());render();
      setSyncStatus('online','Dados da nuvem baixados e mesclados.');return true;
    } catch(error){console.error('Falha ao baixar dados:',error);setSyncStatus('error',`Não foi possível baixar: ${error.message||'verifique sua conexão'}`);return false;}
  }
  function scheduleSync() { if(!session?.user)return;clearTimeout(syncTimer);syncTimer=setTimeout(pushSync,900); }
  async function connectAccount(signUp=false) {
    if(!configureSupabase()){updateAccountDialog();return;}
    const email=$('#account-email').value.trim(),password=$('#account-password').value;
    if(!email||!password){toast('Preencha seu e-mail e sua senha.');return;}
    try {
      const response=signUp?await supabaseClient.auth.signUp({email,password}):await supabaseClient.auth.signInWithPassword({email,password});
      if(response.error)throw response.error;
      session=response.data.session;
      if(!session){$('#account-status').textContent='Conta criada. Confirme o e-mail e depois entre.';return;}
      await pushSync();updateAccountDialog();toast('Conta conectada.');
    } catch(error){$('#account-status').textContent=error.message||'Não foi possível conectar.';}
  }
  function updateAccountDialog() {
    const ready=configured(),logged=Boolean(session?.user);
    $('#account-fields').classList.toggle('hidden',logged||!ready);
    $('#connected-actions').classList.toggle('hidden',!logged);
    $('#account-status').textContent=!ready?'Configure o Supabase para sincronizar este aplicativo.':syncMessage;
    updateSyncSummary();
  }
  async function initializeSync() {
    if(!configureSupabase()){setSyncStatus('offline','Somente neste aparelho');return;}
    try {
      const {data,error}=await supabaseClient.auth.getSession();if(error)throw error;session=data.session;
      if(session?.user){await pushSync();}else setSyncStatus('offline','Somente neste aparelho');
    } catch(error){console.error('Não foi possível iniciar sincronização:',error);setSyncStatus('error','Salvo neste aparelho · nuvem indisponível');}
    supabaseClient.auth.onAuthStateChange((_event,newSession)=>{session=newSession;if(session?.user)pushSync();else setSyncStatus('offline','Somente neste aparelho');updateAccountDialog();});
  }

  $$('.sidebar-link').forEach(link=>link.addEventListener('click',()=>setSection(link.dataset.section)));
  try{if(localStorage.getItem(SIDEBAR_KEY)==='true')document.body.classList.add('sidebar-collapsed');}catch{}
  updateSidebarToggle();
  $('#sidebar-toggle').onclick=()=>{
    if(window.matchMedia('(max-width:700px)').matches)document.body.classList.toggle('sidebar-open');
    else{const collapsed=document.body.classList.toggle('sidebar-collapsed');try{localStorage.setItem(SIDEBAR_KEY,String(collapsed));}catch{}}
    updateSidebarToggle();
  };
  $('#sidebar-scrim').onclick=()=>{document.body.classList.remove('sidebar-open');updateSidebarToggle();};
  window.matchMedia('(max-width:700px)').addEventListener('change',()=>{document.body.classList.remove('sidebar-open');updateSidebarToggle();});
  $('.brand').onclick=event=>{event.preventDefault();setSection('planner');};
  $$('.tab').forEach(tab=>tab.addEventListener('click',()=>setView(tab.dataset.view)));
  $('#prev-day').onclick=$('#planner-prev-day').onclick=()=>shiftSelectedDate(-1);
  $('#next-day').onclick=$('#planner-next-day').onclick=()=>shiftSelectedDate(1);
  $('#today-button').onclick=()=>setSelectedDate(isoToday());$('#selected-date').onchange=e=>setSelectedDate(e.target.value);
  $('#planner-today').onclick=()=>setSelectedDate(isoToday());$('#planner-date').onchange=e=>setSelectedDate(e.target.value);
  $('#planner-grid').addEventListener('click',event=>{const button=event.target.closest('[data-planner-routine]');if(button)openFocusRoutine(button.dataset.plannerRoutine);});
  $('#add-anchor').onclick=()=>openAnchorDialog();$('#anchor-form').addEventListener('submit',saveAnchor);$('#delete-anchor').onclick=deleteAnchor;
  $('#anchor-area-filter').onchange=event=>{selectedAnchorArea=event.target.value;renderAnchors();};
  $('#anchor-list').addEventListener('click',event=>{const button=event.target.closest('[data-edit-anchor]');if(button)openAnchorDialog(button.dataset.editAnchor);});
  $('#add-area').onclick=()=>openAreaDialog();$('#area-form').addEventListener('submit',saveArea);$('#delete-area').onclick=deleteArea;
  $('#area-list').addEventListener('click',event=>{
    const move=event.target.closest('[data-move-area]');if(move){moveArea(move.dataset.areaId,move.dataset.moveArea);return;}
    const edit=event.target.closest('[data-edit-area]');if(edit)openAreaDialog(edit.dataset.editArea);
  });
  $('#routine-list').addEventListener('click',e=>{
    const remove=e.target.closest('[data-remove-routine-day]');if(remove){removeRoutineFromDay(remove.dataset.removeRoutineDay);return;}
    const button=e.target.closest('[data-open-routine]');if(button)openFocusRoutine(button.dataset.openRoutine);
  });
  $('#focus-steps').addEventListener('change',e=>{
    if(!e.target.matches('[data-focus-item]'))return;
    const itemId=e.target.dataset.focusItem,checked=e.target.checked,routineId=activeRoutineId;
    mutateDay(day=>{const item=day.routines[routineId]?.items.find(x=>x.id===itemId);if(item){item.done=checked;item.touched=true;item.changedAt=stamp();}});
  });
  $('#close-routine-focus').onclick=$('#focus-done').onclick=()=>$('#routine-focus-dialog').close();
  $('#routine-focus-dialog').addEventListener('close',()=>{activeRoutineId=null;});
  $('#add-routine').onclick=$('#add-routine-from-day').onclick=$('#empty-add').onclick=()=>openRoutineDialog();
  $('#routine-form').addEventListener('submit',saveRoutine);$('#add-item').onclick=()=>addItemEditor();$('#delete-routine').onclick=deleteRoutine;
  $('#routine-items-editor').addEventListener('click',event=>{
    const row=event.target.closest('.item-editor-row');if(!row)return;
    if(event.target.closest('.remove-item'))row.remove();
    else {
      const move=event.target.closest('[data-move]');
      if(!move)return;
      if(move.dataset.move==='up'&&row.previousElementSibling)row.parentNode.insertBefore(row,row.previousElementSibling);
      if(move.dataset.move==='down'&&row.nextElementSibling)row.parentNode.insertBefore(row.nextElementSibling,row);
    }
    updateItemOrderButtons();
  });
  $$('[data-close]').forEach(button=>button.onclick=()=>$('#'+button.dataset.close).close());
  $('#finish-day').onclick=finishDay;$('#export-button').onclick=$('#history-export').onclick=exportCSV;
  $('#manage-list').addEventListener('click',e=>{const button=e.target.closest('[data-edit]');if(button)openRoutineDialog(button.dataset.edit);});
  $('#history-list').addEventListener('click',e=>{const button=e.target.closest('[data-history-date]');if(button){setSelectedDate(button.dataset.historyDate);setSection('routines');setView('day');}});
  $('#sync-indicator').onclick=()=>{updateAccountDialog();$('#account-dialog').showModal();};
  $('#account-form').addEventListener('submit',e=>e.preventDefault());$('#sign-up').onclick=()=>connectAccount(true);$('#sign-in').onclick=()=>connectAccount(false);
  $('#sync-now').onclick=()=>pushSync();
  $('#sync-download').onclick=()=>pullSync();
  $('#sync-upload').onclick=()=>pushSync('Dados enviados para a nuvem.');
  $('#sign-out').onclick=async()=>{try{const {error}=await supabaseClient.auth.signOut();if(error)throw error;session=null;setSyncStatus('offline','Somente neste aparelho');updateAccountDialog();toast('Você saiu da conta.');}catch(error){toast(error.message||'Não foi possível sair da conta.');}};
  render();initializeSync();
})();
