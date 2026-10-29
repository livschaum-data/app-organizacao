(() => {
  'use strict';
  // Chave antiga mantida para preservar os dados já salvos neste navegador.
  const STORAGE_KEY = 'ritmo-routine-tracker-v1';
  const LAST_SYNC_KEY = `${STORAGE_KEY}-last-sync`;
  const PENDING_KEY = `${STORAGE_KEY}-pending-sync`;
  const SIDEBAR_KEY = 'ancora-sidebar-collapsed-v1';
  const SEED_TIMESTAMP = '2025-01-01T00:00:00.000Z';
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DAILY_VIEW_GROUPS=[['routines','Rotinas','primary',true],['tasks-weekly','Tarefas semanais','secondary',true],['tasks-biweekly','Tarefas quinzenais','secondary',true],['blocks','Blocos','secondary',true],['consultations','Consultas','secondary',true],['actions','Ações','secondary',true],['occurrence-reminder','Lembretes','secondary',true],['occurrence-event','Eventos','secondary',true],['occurrence-holiday','Feriados','secondary',true],['occurrence-birthday','Aniversários','secondary',true],['occurrence-cycle','Ciclos','secondary',true]];
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
  const COLOR_PALETTE = ['#808080','#FFC001','#5DFF5D','#31869B','#FF5399','#CC66FF','#366092','#60497A','#963634','#76933C','#E26B0A'];
  const OCCURRENCE_TYPES = {reminder:{label:'Lembrete',icon:'◉'},event:{label:'Evento',icon:'◆'},holiday:{label:'Feriado',icon:'⚑'},birthday:{label:'Aniversário',icon:'🎂'},cycle:{label:'Ciclo',icon:'↻'}};
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
  function refreshColorPalettes(){
    $$('.color-input').forEach(input=>{
      const selected=input.value.toUpperCase();
      $$('.color-swatch',input.nextElementSibling).forEach(button=>{
        const active=button.dataset.color===selected;
        button.classList.toggle('is-selected',active);
        button.setAttribute('aria-pressed',String(active));
      });
    });
  }
  function setupColorPalettes(){
    $$('.color-input').forEach(input=>{
      const palette=document.createElement('div');palette.className='color-palette';
      palette.setAttribute('role','group');palette.setAttribute('aria-label',`Cores sugeridas para ${input.labels?.[0]?.textContent.trim()||'este item'}`);
      for(const color of COLOR_PALETTE){
        const button=document.createElement('button');button.type='button';button.className='color-swatch';
        button.dataset.color=color;button.style.backgroundColor=color;
        button.setAttribute('aria-label',`Usar cor ${color}`);button.title=color;
        button.addEventListener('click',()=>{input.value=color;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
        palette.append(button);
      }
      input.insertAdjacentElement('afterend',palette);
      input.addEventListener('input',refreshColorPalettes);
      input.addEventListener('change',refreshColorPalettes);
    });
    refreshColorPalettes();
  }
  let state = loadState();
  let selectedDate = isoToday();
  let selectedWeekDate = isoToday();
  let selectedMonthlyMonth = isoToday().slice(0,7);
  let selectedTaskWeekDate = isoToday();
  let selectedSummaryMonth = isoToday().slice(0,7);
  let selectedActionMonth = isoToday().slice(0,7);
  let selectedActionWeekDate = isoToday();
  let actionView = 'annual';
  let selectedOccurrenceMonth = isoToday().slice(0,7);
  let occurrenceView = 'annual';
  let renderedCalendarDate = isoToday();
  let renderedNotesDate = '';
  let selectedAnchorArea = '';
  let anchorView = 'anchors';
  const openManageRoutines = new Set();
  const openManageTasks = new Set();
  let activeRoutineId = null;
  let activeTaskId = null;
  let activeTaskDate = null;
  let currentSection = 'timeline';
  let taskFocusOriginSection = 'planner';
  let supabaseClient = null, session = null, syncTimer = null, saving = false, saveAgain = false;
  let syncKind = 'offline', syncMessage = 'Somente neste aparelho', localRevision = 0, lastAutoSyncAt = 0;

  function makeSeed() {
    const now = SEED_TIMESTAMP;
    return {version:7, dailyViews:Object.fromEntries(DAILY_VIEW_GROUPS.map(([key,,view,,weekly])=>[key,{view,weekly}])),dailyViewsUpdatedAt:'', routines:SEED.map(([icon,name,color,items], i) => ({id:`routine-seed-${i+1}`,name,description:'',icon,color,scheduledTime:'',weekdays:[0,1,2,3,4,5,6],startDate:'',endDate:'',items:items.map((label,j)=>({id:`routine-seed-${i+1}-item-${j+1}`,label,description:'',active:true})),updatedAt:now,deleted:false})),tasks:[],actions:[],occurrences:[],actionAreas:[],taskHistory:{},dayNotes:{},globalEntries:{text:'',updatedAt:''},areas:makeAreaSeed(),anchors:makeAnchorSeed(),history:{}};
  }
  function makeAreaSeed(){return AREA_SEED.map(([id,name,color],order)=>({id:`area-${id}`,name,color,dailyView:'primary',weeklyView:true,order:id==='tema-do-dia'?-1:order,updatedAt:SEED_TIMESTAMP,deleted:false}));}
  function makeAnchorSeed(){return ANCHOR_SEED.map(([area,icon,title,weekdays],index)=>({id:`anchor-seed-${index+1}`,areaId:`area-${area}`,icon,title,description:'',weekdays,monthWeeks:[],startDate:'',endDate:'',updatedAt:SEED_TIMESTAMP,deleted:false}));}
  function plannerNeedsUpgrade(data){
    return !Array.isArray(data.areas)||!Array.isArray(data.anchors)||!Array.isArray(data.occurrences)||!data.globalEntries||typeof data.globalEntries!=='object'||
      makeAreaSeed().some(seed=>!data.areas.some(area=>area.id===seed.id))||
      makeAnchorSeed().some(seed=>!data.anchors.some(anchor=>anchor.id===seed.id));
  }
  function ensurePlannerData(data){
    if(!Array.isArray(data.areas))data.areas=[];
    if(!Array.isArray(data.anchors))data.anchors=[];
    if(!Array.isArray(data.tasks))data.tasks=[];
    if(!Array.isArray(data.actions))data.actions=[];
    if(!Array.isArray(data.occurrences))data.occurrences=[];
    if(!Array.isArray(data.actionAreas))data.actionAreas=[];
    if(!data.dailyViews||typeof data.dailyViews!=='object')data.dailyViews={};
    if(typeof data.dailyViewsUpdatedAt!=='string')data.dailyViewsUpdatedAt='';
    for(const [key,,view,,weekly] of DAILY_VIEW_GROUPS){if(typeof data.dailyViews[key]==='string')data.dailyViews[key]={view:data.dailyViews[key],weekly};if(!data.dailyViews[key]||typeof data.dailyViews[key]!=='object')data.dailyViews[key]={view,weekly};if(data.dailyViews[key].view!=='primary'&&data.dailyViews[key].view!=='secondary')data.dailyViews[key].view=view;if(typeof data.dailyViews[key].weekly!=='boolean')data.dailyViews[key].weekly=weekly;}
    for(const action of data.actions){
      if(!action.createdAt)action.createdAt=action.updatedAt||SEED_TIMESTAMP;
      if(action.completed&&!action.completedAt)action.completedAt=action.completionChangedAt||action.updatedAt||'';
      if(!action.completed)action.completedAt='';
    }
    if(!data.taskHistory||typeof data.taskHistory!=='object')data.taskHistory={};
    if(!data.dayNotes||typeof data.dayNotes!=='object')data.dayNotes={};
    if(!data.globalEntries||typeof data.globalEntries!=='object')data.globalEntries={text:'',updatedAt:''};
    if(typeof data.globalEntries.text!=='string')data.globalEntries.text='';
    if(typeof data.globalEntries.updatedAt!=='string')data.globalEntries.updatedAt='';
    data.version=7;
    const areaIds=new Set(data.areas.map(area=>area.id)),anchorIds=new Set(data.anchors.map(anchor=>anchor.id));
    for(const area of makeAreaSeed())if(!areaIds.has(area.id))data.areas.push(area);
    for(const area of data.areas)if(typeof area.weeklyView!=='boolean')area.weeklyView=true;
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
  function monthWeekNumber(date){
    const thursday=safeDate(date);
    thursday.setDate(thursday.getDate()-(thursday.getDay()+6)%7+3);
    return Math.ceil(thursday.getDate()/7);
  }
  function dayIsScheduled(routine, date) {
    if (routine.deleted) return false;
    if (routine.startDate && date < routine.startDate) return false;
    if (routine.endDate && date > routine.endDate) return false;
    if (Array.isArray(routine.monthWeeks) && routine.monthWeeks.length && !routine.monthWeeks.includes(monthWeekNumber(date))) return false;
    return (routine.weekdays || []).includes(safeDate(date).getDay());
  }
  function taskIsScheduled(task,date){
    if(!dayIsScheduled(task,date))return false;
    if(task.frequency!=='biweekly')return true;
    if(!task.startDate)return false;
    const mondayUTC=value=>{const day=safeDate(value);day.setDate(day.getDate()-(day.getDay()+6)%7);return Date.UTC(day.getFullYear(),day.getMonth(),day.getDate());};
    const weeks=Math.round((mondayUTC(date)-mondayUTC(task.startDate))/604800000);
    return weeks>=0&&weeks%2===0;
  }
  function actionIsScheduled(action,date){
    if(action.deleted)return false;
    if(action.schedule==='date')return action.scheduledDate===date;
    return action.scheduledMonth===date.slice(0,7)&&(!action.week||Number(action.week)===monthWeekNumber(date));
  }
  function dailyViewOfGroup(group){return state.dailyViews?.[group]?.view==='primary'?'primary':'secondary';}
  function groupInWeekly(group){return state.dailyViews?.[group]?.weekly!==false;}
  function groupInTimeline(group){return state.dailyViews?.[group]?.timeline!==false;}
  function actionAreaName(action){return state.actionAreas.find(area=>area.id===action.areaId&&!area.deleted)?.name||'';}
  function actionScheduleLabel(action){
    if(action.schedule==='date'&&action.scheduledDate)return fmtDate(action.scheduledDate,{day:'numeric',month:'short'});
    return action.week?`Semana ${action.week}`:'';
  }
  function taskIsConsultation(task){
    const catalog=state.tasks.find(entry=>entry.id===(task.taskId||task.id));
    return catalog?catalog.consultation===true:task.consultation===true;
  }
  function blockStatusOf(task){
    if(task.kind!=='block')return '';
    return ['realized','partial','not-realized'].includes(task.blockStatus)?task.blockStatus:task.done?'realized':'';
  }
  function taskIsRegistered(task){if(taskIsConsultation(task))return true;return task.kind==='block'?Boolean(blockStatusOf(task)):Boolean(task.done||task.doneTouched);}
  function markOpenTasksNotDone(day,changedAt){
    for(const task of Object.values(day.tasks||{})){
      if(task.consultation===true)continue;
      if(task.kind==='block'&&!blockStatusOf(task)){
        task.blockStatus='not-realized';task.done=true;task.doneTouched=true;task.doneChangedAt=changedAt;
      }else if(task.kind!=='block'&&!task.done&&!task.doneTouched){
        task.done=false;task.doneTouched=true;task.doneChangedAt=changedAt;
      }
      for(const item of task.items||[])if(!item.done&&!item.touched){item.done=false;item.touched=true;item.changedAt=changedAt;}
    }
  }
  function blockStatusLabel(status){return {realized:'Realizado',partial:'Realizado parcialmente','not-realized':'Não realizado'}[status]||'Pendente';}
  function taskIsVisibleOnDay(task,date){return date>=isoToday()||!taskIsConsultation(task);}
  function ensureTaskDay(date){
    const isNew=!state.taskHistory[date];
    if(isNew)state.taskHistory[date]={tasks:{},excludedTasks:{},finalized:false,updatedAt:stamp()};
    const day=state.taskHistory[date];
    if(!day.tasks)day.tasks={};
    if(!day.excludedTasks)day.excludedTasks={};
    if(isNew||date>=isoToday())reconcileTaskDay(date,day,state.tasks,isNew);
    return day;
  }
  function reconcileTaskDay(date,day,tasks,includePast=false){
    if(day.finalized)return false;
    if(!includePast&&date<isoToday())return false;
    if(!day.excludedTasks)day.excludedTasks={};
    const scheduled=new Map(tasks.filter(task=>taskIsScheduled(task,date)).map(task=>[task.id,task]));
    const now=stamp();let changed=false;
    for(const id of Object.keys(day.tasks||{}))if(!scheduled.has(id)||day.excludedTasks[id]){delete day.tasks[id];changed=true;}
    for(const [id,task] of scheduled){
      if(day.excludedTasks[id])continue;
      let snapshot=day.tasks[id];
      if(!snapshot){snapshot={taskId:id,items:[],done:false,doneTouched:false,doneChangedAt:now,blockStatus:''};day.tasks[id]=snapshot;changed=true;}
      for(const [key,value] of Object.entries({name:task.name,description:task.description||'',icon:task.icon,color:task.color,frequency:task.frequency,scheduledTime:task.scheduledTime||'',durationMinutes:task.durationMinutes||45,consultation:task.consultation===true,kind:task.kind==='block'?'block':'regular'})){
        if(snapshot[key]!==value){snapshot[key]=value;changed=true;}
      }
      const previous=new Map((snapshot.items||[]).map(item=>[item.id,item]));
      const items=(task.items||[]).filter(item=>item.active!==false).map(item=>{
        const old=previous.get(item.id);
        return old?{...old,label:item.label,description:item.description||''}:{id:item.id,label:item.label,description:item.description||'',done:false,touched:false,changedAt:now};
      });
      if(JSON.stringify(snapshot.items)!==JSON.stringify(items)){snapshot.items=items;changed=true;}
    }
    if(changed)day.updatedAt=now;
    return changed;
  }
  function ensureDay(date) {
    const isNew=!state.history[date];
    if (isNew) state.history[date] = {routines:{}, finalized:false, updatedAt:stamp()};
    const day = state.history[date];
    if (!day.routines) day.routines = {};
    if (!day.excludedRoutines) day.excludedRoutines = {};
    if(isNew||date>=isoToday())reconcileDay(date,day,state.routines,isNew);
    return day;
  }
  function reconcileDay(date,day,routines,includePast=false){
    if(day.finalized||(!includePast&&date<isoToday()))return false;
    const scheduled=new Map(routines.filter(routine=>dayIsScheduled(routine,date)).map(routine=>[routine.id,routine]));
    const now=stamp();let changed=false;
    for(const id of Object.keys(day.routines||{}))if(!scheduled.has(id)||day.excludedRoutines?.[id]){delete day.routines[id];changed=true;}
    for(const [id,routine] of scheduled){
      if(day.excludedRoutines?.[id])continue;
      let snapshot=day.routines[id];
      if(!snapshot){snapshot={routineId:id,items:[]};day.routines[id]=snapshot;changed=true;}
      for(const [key,value] of Object.entries({name:routine.name,description:routine.description||'',icon:routine.icon,color:routine.color,scheduledTime:routine.scheduledTime||'',durationMinutes:routine.durationMinutes||45})){
        if(snapshot[key]!==value){snapshot[key]=value;changed=true;}
      }
      const previous=new Map((snapshot.items||[]).map(item=>[item.id,item]));
      const items=routine.items.filter(item=>item.active!==false).map(item=>{
        const old=previous.get(item.id);
        return old?{...old,label:item.label,description:item.description||''}:{id:item.id,label:item.label,description:item.description||'',done:false,touched:false,changedAt:now};
      });
      if(JSON.stringify(snapshot.items)!==JSON.stringify(items)){snapshot.items=items;changed=true;}
    }
    if(changed)day.updatedAt=now;
    return changed;
  }
  function saveLocal() {
    localRevision++;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.setItem(PENDING_KEY,session?.user?.id||'local'); }
    catch { toast('O armazenamento deste navegador está cheio. Exporte seu histórico para guardar uma cópia.'); }
    setSyncStatus(session?.user?'syncing':'offline',session?.user?'Alterações aguardando sincronização...':'Dados neste aparelho');
    scheduleSync();
  }
  function mutateDay(fn) {
    const day = ensureDay(selectedDate); fn(day); day.updatedAt = stamp(); saveLocal(); renderDay(); renderPlanner(); renderWeekly(); renderSummary(); renderFocusRoutine();
  }
  function renderDateHeader() {
    $('#selected-date').value = selectedDate;
    $('#routine-weekday').textContent=fmtDate(selectedDate,{weekday:'long'});
    const d = safeDate(selectedDate), today = isoToday();
    $('#today-label').textContent = selectedDate === today ? 'UM PONTO DE APOIO PARA O SEU DIA' : fmtDate(selectedDate).toLocaleUpperCase('pt-BR');
    $('#greeting').textContent = selectedDate === today ? 'Um passo de cada vez.' : fmtDate(selectedDate, {day:'numeric',month:'long'});
    $('#today-button').classList.toggle('hidden', selectedDate === today);
    renderDayStatus('#routine-day-status',selectedDate,'routines');
  }
  function renderProgress() {
    const day = ensureDay(selectedDate), items = Object.values(day.routines).flatMap(r=>r.items);
    const done = items.filter(i=>i.done).length, pct = items.length ? Math.round(done/items.length*100) : 0;
    $('#progress-value').textContent = `${pct}%`;
    $('#progress-label').textContent = items.length ? `${done} de ${items.length} passos concluídos` : 'Seu progresso';
    $('#progress-bar').style.width = `${pct}%`;
    $('#finish-day').textContent = day.finalized ? 'Rotinas concluídas ✓' : 'Concluir rotinas';
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
    $('#manage-list').innerHTML = routines.length ? routines.map(r=>{
      const items=r.items.filter(item=>item.active!==false),expanded=openManageRoutines.has(r.id);
      return `<article class="manage-card${expanded?' is-open':''}" style="--routine-color:${escapeHTML(r.color)}"><div class="manage-card-main"><span class="routine-icon">${escapeHTML(r.icon)}</span><div class="manage-info"><strong>${escapeHTML(r.name)}</strong><small>${r.scheduledTime?`${escapeHTML(r.scheduledTime)} · `:''}${items.length} passos · ${r.weekdays.length===7?'todos os dias':r.weekdays.length===5&&r.weekdays.includes(1)&&r.weekdays.includes(5)?'dias úteis':r.weekdays.length===2&&r.weekdays.includes(0)&&r.weekdays.includes(6)?'fim de semana':r.weekdays.map(d=>WEEKDAYS[d]).join(', ')}</small></div><button type="button" class="manage-toggle" data-manage-toggle="${escapeHTML(r.id)}" aria-expanded="${expanded}" aria-controls="manage-steps-${escapeHTML(r.id)}" aria-label="${expanded?'Ocultar':'Mostrar'} passos de ${escapeHTML(r.name)}">▾</button><button type="button" class="small-edit" data-edit="${escapeHTML(r.id)}">Editar</button></div><div id="manage-steps-${escapeHTML(r.id)}" class="manage-step-list${expanded?'':' hidden'}"><ol>${items.map(item=>`<li>${escapeHTML(item.label)}</li>`).join('')}</ol></div></article>`;
    }).join('') : '<div class="empty-state"><span>✦</span><h3>Suas rotinas começam aqui</h3><p>Crie uma rotina que combine com seu dia.</p></div>';
  }
  function renderHistory() {
    const days=Object.keys(state.history).filter(date=>Object.values(state.history[date]?.routines||{}).length).sort((a,b)=>b.localeCompare(a));
    $('#history-list').innerHTML = days.length ? days.map(date=>{
      const day=state.history[date], items=Object.values(day.routines||{}).flatMap(r=>r.items||[]), done=items.filter(i=>i.done).length, pct=items.length?Math.round(done/items.length*100):0;
      return `<button class="history-card${date<isoToday()&&dayStatus(date).routinePending?' is-incomplete':''}" data-history-date="${date}"><span class="history-date"><strong>${escapeHTML(fmtDate(date,{day:'numeric'}))}</strong><small>${escapeHTML(fmtDate(date,{weekday:'long',month:'long'}))}</small></span><span class="history-stat"><strong>${done}/${items.length}</strong><small>passos concluídos</small></span><span class="history-meter"><i style="width:${pct}%"></i></span><span class="history-percent">${pct}%</span><span class="history-arrow">→</span></button>`;
    }).join('') : '<div class="empty-state"><span>♡</span><h3>Seu histórico vai aparecer aqui</h3><p>Comece uma rotina e seus passos ficam registrados por dia.</p></div>';
  }
  function taskSnapshots(day,frequency,date=selectedDate,kind='regular',view='',group='',consultation=null){
    return Object.values(day.tasks||{}).filter(task=>(!frequency||task.frequency===frequency)&&(task.kind==='block'?'block':'regular')===kind&&taskIsVisibleOnDay(task,date)&&(consultation===null||taskIsConsultation(task)===consultation)&&(!view||dailyViewOfGroup(group)===view)).sort((a,b)=>(a.scheduledTime||'99:99').localeCompare(b.scheduledTime||'99:99')||a.name.localeCompare(b.name,'pt-BR'));
  }
  function taskRow(task,showRemove=true){
    const items=task.items||[],consultation=taskIsConsultation(task),result=blockStatusOf(task);
    return `<div class="task-entry${showRemove?' has-remove':''}"><button type="button" class="task-row${(task.kind==='block'?Boolean(result):task.done)&&!consultation?' is-done':''}" data-open-task="${escapeHTML(task.taskId)}"><span class="task-row-main"><span class="task-row-icon" aria-hidden="true">${escapeHTML(task.icon||'✓')}</span><span class="task-row-name">${escapeHTML(task.name)}</span>${consultation?'<small class="task-consultation-badge">Consulta</small>':task.kind==='block'?`<small class="task-block-frequency">${task.frequency==='biweekly'?'Quinzenal':'Semanal'}</small>${result?`<small class="block-result-badge is-${result}">${blockStatusLabel(result)}</small>`:''}`:''}${task.scheduledTime?`<time>${escapeHTML(task.scheduledTime)}</time>`:''}</span>${items.length?`<span class="task-row-steps">${items.map(item=>`<span class="task-row-step${item.done&&!consultation?' is-done':''}">${escapeHTML(item.label)}</span>`).join('')}</span>`:''}</button>${showRemove?`<button type="button" class="task-remove-day" data-remove-task-day="${escapeHTML(task.taskId)}">Remover deste dia</button>`:''}</div>`;
  }
  function taskGroup(day,frequency,planner=false,view='',group='',consultation=null){
    const tasks=taskSnapshots(day,frequency,selectedDate,'regular',view,group,consultation),label=consultation?'Consultas':frequency==='biweekly'?'Quinzenais':'Semanais';
    if(planner)return `<section class="planner-block planner-task-block${frequency==='biweekly'?' planner-task-biweekly':''}"><h2><button type="button" class="planner-block-link" data-open-task-day><span class="planner-heading-icon" aria-hidden="true">${frequency==='biweekly'?'◫':'☑'}</span><span>Tarefas ${label.toLowerCase()}</span></button></h2><div class="planner-block-body">${tasks.length?tasks.map(task=>taskRow(task,false)).join(''):'<p class="planner-empty">Nenhuma tarefa neste dia.</p>'}</div></section>`;
    return `<section class="task-group"><h3>${label}</h3>${tasks.length?tasks.map(task=>taskRow(task)).join(''):'<p class="planner-empty">Nenhuma tarefa neste dia.</p>'}</section>`;
  }
  function blockGroup(day,planner=false,view=''){
    const tasks=taskSnapshots(day,null,selectedDate,'block',view,'blocks');
    if(planner)return `<section class="planner-block planner-task-block planner-block-tasks"><h2><button type="button" class="planner-block-link" data-open-task-day><span class="planner-heading-icon" aria-hidden="true">▣</span><span>Blocos</span></button></h2><div class="planner-block-body">${tasks.length?tasks.map(task=>taskRow(task,false)).join(''):'<p class="planner-empty">Nenhum bloco neste dia.</p>'}</div></section>`;
    return `<section class="task-group task-block-group"><h3>Blocos</h3>${tasks.length?tasks.map(task=>taskRow(task)).join(''):'<p class="planner-empty">Nenhum bloco neste dia.</p>'}</section>`;
  }
  function renderTasks(){
    $('#task-date').value=selectedDate;
    $('#task-weekday').textContent=fmtDate(selectedDate,{weekday:'long'});
    $('#task-date-label').textContent=fmtDate(selectedDate);
    $('#task-today').classList.toggle('hidden',selectedDate===isoToday());
    renderDayStatus('#task-day-status',selectedDate,'tasks');
    const day=ensureTaskDay(selectedDate);
    $('#finish-tasks-day').textContent=day.finalized?'Tarefas e blocos concluídos ✓':'Concluir tarefas e blocos';
    $('#finish-tasks-day').disabled=Boolean(day.finalized);
    $('#task-day-list').innerHTML=taskGroup(day,'weekly')+taskGroup(day,'biweekly')+blockGroup(day);
    const tasks=state.tasks.filter(task=>!task.deleted).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    $('#task-manage-list').innerHTML=tasks.length?tasks.map(task=>{
      const items=(task.items||[]).filter(item=>item.active!==false),expanded=openManageTasks.has(task.id);
      return `<article class="manage-card task-manage-card${expanded?' is-open':''}" style="--routine-color:${escapeHTML(task.color)}"><div class="manage-card-main"><span class="routine-icon">${escapeHTML(task.icon||'✓')}</span><div class="manage-info"><strong>${escapeHTML(task.name)}</strong><small>${task.consultation?'Consulta · ':task.kind==='block'?'Bloco · ':''}${task.frequency==='biweekly'?'Quinzenal':'Semanal'} · ${items.length} passos · ${(task.weekdays||[]).map(day=>WEEKDAYS[day]).join(', ')}${task.startDate?` · desde ${escapeHTML(fmtDate(task.startDate,{day:'numeric',month:'short',year:'numeric'}))}`:''}</small></div>${items.length?`<button type="button" class="manage-toggle" data-task-manage-toggle="${escapeHTML(task.id)}" aria-expanded="${expanded}" aria-controls="task-manage-steps-${escapeHTML(task.id)}" aria-label="${expanded?'Ocultar':'Mostrar'} passos de ${escapeHTML(task.name)}">▾</button>`:''}<button type="button" class="small-edit" data-edit-task="${escapeHTML(task.id)}">Editar</button></div>${items.length?`<div id="task-manage-steps-${escapeHTML(task.id)}" class="manage-step-list${expanded?'':' hidden'}"><ol>${items.map(item=>`<li>${escapeHTML(item.label)}</li>`).join('')}</ol></div>`:''}</article>`;
    }).join(''):'<div class="empty-state"><span>✓</span><h3>Suas tarefas começam aqui</h3><p>Crie uma tarefa semanal ou quinzenal, com passos se desejar.</p></div>';
    const dates=Object.keys(state.taskHistory).filter(date=>Object.values(state.taskHistory[date]?.tasks||{}).some(task=>taskIsVisibleOnDay(task,date))).sort((a,b)=>b.localeCompare(a));
    $('#task-history-list').innerHTML=dates.length?dates.map(date=>{
      const entries=Object.values(state.taskHistory[date].tasks).filter(task=>taskIsVisibleOnDay(task,date)),registered=entries.filter(task=>taskIsRegistered(task)).length;
      return `<button class="history-card${date<isoToday()&&dayStatus(date).taskPending?' is-incomplete':''}" data-task-history-date="${date}"><span class="history-date"><strong>${escapeHTML(fmtDate(date,{day:'numeric'}))}</strong><small>${escapeHTML(fmtDate(date,{weekday:'long',month:'long'}))}</small></span><span class="history-stat"><strong>${registered}/${entries.length}</strong><small>tarefas registradas</small></span><span class="history-arrow">→</span></button>`;
    }).join(''):'<div class="empty-state"><span>✓</span><h3>Seu histórico vai aparecer aqui</h3><p>As tarefas programadas ficam registradas por dia.</p></div>';
  }
  function renderTaskFocus(){
    if(!activeTaskId)return;
    const date=activeTaskDate||selectedDate,day=ensureTaskDay(date),task=day.tasks[activeTaskId],locked=Boolean(day.finalized);
    if(!task||!taskIsVisibleOnDay(task,date)){$('#task-focus-dialog').close();return;}
    const consultation=taskIsConsultation(task);
    $('#task-focus-dialog').style.setProperty('--routine-color',task.color);
    $('#task-focus-date').textContent=fmtDate(date).toLocaleUpperCase('pt-BR');
    $('#task-focus-icon').textContent=task.icon||'✓';
    $('#task-focus-name').textContent=task.name;
    $('#task-focus-day').textContent=({planner:'Voltar à visão diária','planner-secondary':'Voltar à visão secundária',weekly:'Voltar à visão semanal'}[taskFocusOriginSection]||'Voltar ao dia');
    const done=(task.items||[]).filter(item=>item.done).length,total=task.items?.length||0;
    $('#task-focus-count').textContent=(consultation?`${task.frequency==='biweekly'?'Consulta quinzenal':'Consulta semanal'} · sem conclusão necessária`:`${task.kind==='block'?'Bloco':'Tarefa'} ${task.frequency==='biweekly'?'quinzenal':'semanal'}${total?` · ${done} de ${total} passos`:''}`)+(locked?' · dia concluído':'');
    $('#task-focus-description').textContent=task.description||'';
    $('#task-focus-description').classList.toggle('hidden',!task.description);
    $('#task-focus-complete').checked=Boolean(task.done);
    $('#task-focus-complete').disabled=locked;
    $('#task-focus-complete').closest('.task-completion').classList.toggle('hidden',consultation||task.kind==='block');
    const result=blockStatusOf(task);
    $('#task-focus-block-result').classList.toggle('hidden',consultation||task.kind!=='block');
    $$('#task-focus-block-result input').forEach(input=>{input.checked=input.value===result;input.disabled=locked;});
    $('#task-focus-block-clear').classList.toggle('hidden',!result||locked);
    $('#task-focus-step-section').classList.toggle('hidden',!total);
    $('#task-focus-step-section .focus-section-label').textContent=consultation?'ITENS PARA CONSULTA':task.kind==='block'?'PASSOS DESTE BLOCO':'PASSOS DESTA TAREFA';
    $('#task-focus-steps').innerHTML=(task.items||[]).map(item=>consultation?`<div class="consultation-step"><span>${escapeHTML(item.label)}</span>${item.description?`<small>${escapeHTML(item.description)}</small>`:''}</div>`:`<label class="focus-step ${item.done?'is-done':''}"><input type="checkbox" data-task-item="${escapeHTML(item.id)}" ${item.done?'checked':''} ${locked?'disabled':''}><span class="focus-check"></span><span class="focus-step-copy"><span>${escapeHTML(item.label)}</span>${item.description?`<small>${escapeHTML(item.description)}</small>`:''}</span></label>`).join('');
  }
  function openTaskFocus(id,date=selectedDate,fromWeek=false){
    const task=ensureTaskDay(date).tasks[id];
    if(!task||!taskIsVisibleOnDay(task,date))return;
    activeTaskId=id;activeTaskDate=date;taskFocusOriginSection=currentSection;
    renderTaskFocus();$('#task-focus-dialog').showModal();
  }
  function mutateTaskDay(fn){
    const day=ensureTaskDay(activeTaskDate||selectedDate);if(day.finalized){toast('Este dia já foi concluído e não pode mais ser alterado.');renderTaskFocus();return;}fn(day);day.updatedAt=stamp();saveLocal();renderTasks();renderPlanner();renderWeekly();renderTaskWeekly();renderSummary();renderTaskFocus();
  }
  function orderedAreas(){return state.areas.filter(area=>!area.deleted).sort((a,b)=>(a.order??0)-(b.order??0)||a.name.localeCompare(b.name,'pt-BR'));}
  function scheduledRoutines(day){return Object.values(day.routines||{}).sort((a,b)=>(a.scheduledTime||'99:99').localeCompare(b.scheduledTime||'99:99'));}
  function dayStatus(date){
    const trackedDates=[...Object.entries(state.history).filter(([,day])=>Object.keys(day.routines||{}).length||day.finalized).map(([key])=>key),...Object.entries(state.taskHistory).filter(([date,day])=>Object.values(day.tasks||{}).some(task=>taskIsVisibleOnDay(task,date))).map(([key])=>key)];
    const firstTracked=trackedDates.sort()[0]||isoToday();
    if(date<firstTracked)return {routinePending:false,taskPending:false,hasRoutines:false,hasTasks:false,past:date<isoToday()};
    const routineDay=state.history[date],taskDay=state.taskHistory[date];
    const routines=routineDay?Object.values(routineDay.routines||{}):state.routines.filter(routine=>dayIsScheduled(routine,date));
    const tasks=(taskDay?Object.values(taskDay.tasks||{}):state.tasks.filter(task=>taskIsScheduled(task,date))).filter(task=>taskIsVisibleOnDay(task,date));
    const routinePending=routines.length>0&&!routineDay?.finalized;
    const taskPending=tasks.some(task=>!taskIsRegistered(task));
    return {routinePending,taskPending,hasRoutines:routines.length>0,hasTasks:tasks.length>0,past:date<isoToday()};
  }
  function renderDayStatus(selector,date,kind='both'){
    const status=dayStatus(date);
    const hasItems=kind==='routines'?status.hasRoutines:kind==='tasks'?status.hasTasks:status.hasRoutines||status.hasTasks;
    const hasPending=kind==='routines'?status.routinePending:kind==='tasks'?status.taskPending:status.routinePending||status.taskPending;
    const pending=status.past&&hasPending,complete=date<=isoToday()&&hasItems&&!hasPending;
    const element=$(selector);
    element.classList.toggle('hidden',!pending&&!complete);
    element.classList.toggle('is-complete',complete);
    element.textContent=pending?'Dia incompleto':complete?'Dia completo':'';
  }
  function renderNotes(){
    $('#planner-notes-date').textContent=fmtDate(selectedDate);
    const input=$('#planner-notes-input');
    if(renderedNotesDate!==selectedDate||document.activeElement!==input)input.value=state.dayNotes?.[selectedDate]?.text||'';
    renderedNotesDate=selectedDate;
  }
  function renderEntries(){
    const input=$('#planner-entries-input');
    if(document.activeElement!==input)input.value=state.globalEntries?.text||'';
  }
  function renderTimeline(){
    const unscheduledOpen=$('#planner-timeline .timeline-unscheduled')?.open??true;
    const date=selectedDate,day=ensureDay(date),taskDay=ensureTaskDay(date),areas=orderedAreas();
    const areaById=new Map(areas.map(area=>[area.id,area]));
    const scheduledAnchors=state.anchors.filter(anchor=>areaById.has(anchor.areaId)&&areaById.get(anchor.areaId)?.weeklyView!==false&&dayIsScheduled(anchor,date));
    const hasTime=entry=>/^\d{2}:\d{2}$/.test(entry.scheduledTime||'');
    const todayTheme=scheduledAnchors.filter(anchor=>anchor.areaId==='area-tema-do-dia'&&!hasTime(anchor));
    const scheduledRoutines=groupInTimeline('routines')?Object.values(day.routines||{}):[];
    const taskGroup=task=>task.kind==='block'?'blocks':taskIsConsultation(task)?'consultations':task.frequency==='biweekly'?'tasks-biweekly':'tasks-weekly';
    const visibleTasks=Object.values(taskDay.tasks||{}).filter(task=>taskIsVisibleOnDay(task,date)&&groupInTimeline(taskGroup(task)));
    const scheduledActions=groupInTimeline('actions')?state.actions.filter(action=>actionIsScheduled(action,date)):[];
    const timed=[...scheduledRoutines.map(routine=>({...routine,type:'routine',id:routine.routineId})),...visibleTasks.map(task=>({...task,type:'task',id:task.taskId})),...scheduledAnchors.map(anchor=>({...anchor,type:'anchor',name:anchor.title,color:areaById.get(anchor.areaId)?.color||'#8eada8'})),...scheduledActions.map(action=>({...action,type:'action',name:action.title}))].filter(hasTime).sort((a,b)=>a.scheduledTime.localeCompare(b.scheduledTime));
    const untimedRoutines=scheduledRoutines.filter(routine=>!hasTime(routine));
    const untimedTasks=visibleTasks.filter(task=>!hasTime(task));
    const untimedActions=scheduledActions.filter(action=>!hasTime(action));
    const anchors=areas.filter(area=>area.id!=='area-tema-do-dia').map(area=>({area,entries:scheduledAnchors.filter(anchor=>anchor.areaId===area.id&&!hasTime(anchor))})).filter(group=>group.entries.length);
    const minutes=value=>Number(value.slice(0,2))*60+Number(value.slice(3,5));
    const isToday=date===isoToday(),now=new Date();
    const nowMinutes=now.getHours()*60+now.getMinutes();
    const startHour=Math.min(5,...timed.map(entry=>Math.floor(minutes(entry.scheduledTime)/60)),...(isToday?[Math.floor(nowMinutes/60)]:[]));
    const duration=entry=>Math.max(15,Math.min(480,Number(entry.durationMinutes)||45));
    const endHour=Math.max(isToday?24:23,...timed.map(entry=>Math.ceil((minutes(entry.scheduledTime)+duration(entry))/60)));
    const hourHeight=70,range=(endHour-startHour)*hourHeight;
    const lanes=[];
    const events=timed.map(entry=>{
      const start=minutes(entry.scheduledTime),lane=lanes.findIndex(end=>end<=start);
      const index=lane<0?lanes.length:lane;lanes[index]=start+duration(entry);
      return {...entry,lane:index,top:(start-startHour*60)/60*hourHeight,height:duration(entry)/60*hourHeight};
    });
    const markers=Array.from({length:endHour-startHour+1},(_,index)=>`<div class="timeline-hour" style="top:${index*hourHeight}px"><time>${String(startHour+index).padStart(2,'0')}:00</time></div>`).join('');
    const eventMarkup=events.map(entry=>{
      const style=`top:${entry.top}px;height:${Math.max(30,entry.height-4)}px;left:calc(75px + (100% - 85px) * ${entry.lane/Math.max(lanes.length,1)});width:calc((100% - 85px) * ${1/Math.max(lanes.length,1)} - 5px);--event-color:${escapeHTML(entry.color||'#7daaa1')}`;
      const content=`<time>${escapeHTML(entry.scheduledTime)}</time><span>${entry.icon?`${escapeHTML(entry.icon)} `:''}${escapeHTML(entry.name)}</span>`;
      return entry.type==='anchor'?`<div class="timeline-event timeline-anchor" style="${style}" title="${escapeHTML(entry.description||entry.name)}">${content}</div>`:`<button type="button" class="timeline-event timeline-${entry.type}${entry.kind==='block'?' timeline-block':''}" style="${style}" data-timeline-${entry.type}="${escapeHTML(entry.id)}">${content}</button>`;
    }).join('');
    const themeMarkup=todayTheme.length?`<div class="timeline-theme"><strong>Tema do dia</strong>${todayTheme.map(anchor=>`<span>${escapeHTML(anchor.icon)} ${escapeHTML(anchor.title)}</span>`).join('')}</div>`:'';
    const untimedGroups=[
      {label:'Rotinas',entries:untimedRoutines.map(entry=>`<button type="button" data-timeline-routine="${escapeHTML(entry.routineId)}">${entry.icon?`${escapeHTML(entry.icon)} `:''}${escapeHTML(entry.name)}</button>`)},
      {label:'Tarefas',entries:untimedTasks.filter(task=>task.kind!=='block').map(entry=>`<button type="button" data-timeline-task="${escapeHTML(entry.taskId)}">${entry.icon?`${escapeHTML(entry.icon)} `:''}${escapeHTML(entry.name)}</button>`)},
      {label:'Blocos',entries:untimedTasks.filter(task=>task.kind==='block').map(entry=>`<button type="button" data-timeline-task="${escapeHTML(entry.taskId)}">${entry.icon?`${escapeHTML(entry.icon)} `:''}${escapeHTML(entry.name)}</button>`)},
      ...anchors.map(({area,entries})=>({label:area.name,entries:entries.map(anchor=>`<span>${anchor.icon?`${escapeHTML(anchor.icon)} `:''}${escapeHTML(anchor.title)}</span>`)})),
      {label:'Ações',entries:untimedActions.map(action=>`<button type="button" data-timeline-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}</button>`)}
    ].filter(group=>group.entries.length);
    const unscheduled=untimedGroups.map(group=>`<div class="timeline-anchor-group"><strong>${escapeHTML(group.label)}</strong>${group.entries.join('')}</div>`);
    const untimedCount=untimedGroups.reduce((total,group)=>total+group.entries.length,0);
    const nowMarker=isToday?`<div class="timeline-now" style="top:${(nowMinutes-startHour*60)/60*hourHeight}px" aria-label="Horário atual ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}"><time>${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}</time></div>`:'';
    $('#planner-timeline').innerHTML=`${themeMarkup}${unscheduled.length?`<details class="timeline-unscheduled"${unscheduledOpen?' open':''}><summary>Sem horário · ${untimedCount} ${untimedCount===1?'item':'itens'}</summary><div>${unscheduled.join('')}</div></details>`:''}<div class="timeline-axis" style="height:${range}px" data-start-hour="${startHour}" data-hour-height="${hourHeight}">${markers}${eventMarkup}${nowMarker}</div>`;
  }
  function updateTimelineNow(){
    if(selectedDate!==isoToday()||!$('#timeline-workspace').classList.contains('active-workspace'))return;
    const axis=$('#planner-timeline .timeline-axis'),marker=axis?.querySelector('.timeline-now');
    if(!marker)return;
    const now=new Date(),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    marker.style.top=`${(now.getHours()*60+now.getMinutes()-Number(axis.dataset.startHour)*60)/60*Number(axis.dataset.hourHeight)}px`;
    marker.setAttribute('aria-label',`Horário atual ${time}`);
    marker.querySelector('time').textContent=time;
  }
  function renderPlanner(){
    $('#planner-date').value=selectedDate;
    $('#planner-date-label').textContent=fmtDate(selectedDate);
    $('#planner-weekday').textContent=fmtDate(selectedDate,{weekday:'long'});
    $('#planner-today').classList.toggle('hidden',selectedDate===isoToday());
    $('#timeline-date').value=selectedDate;
    $('#timeline-date-label').textContent=fmtDate(selectedDate);
    $('#timeline-weekday').textContent=fmtDate(selectedDate,{weekday:'long'});
    $('#timeline-today').classList.toggle('hidden',selectedDate===isoToday());
    $('#planner-secondary-date').value=selectedDate;
    $('#planner-secondary-date-label').textContent=fmtDate(selectedDate);
    $('#planner-secondary-weekday').textContent=fmtDate(selectedDate,{weekday:'long'});
    $('#planner-secondary-today').classList.toggle('hidden',selectedDate===isoToday());
    renderDayStatus('#planner-day-status',selectedDate);
    renderDayStatus('#planner-secondary-day-status',selectedDate);
    renderDayStatus('#timeline-day-status',selectedDate);
    const areas=orderedAreas(),day=ensureDay(selectedDate);
    const areaBlocks=new Map(areas.map(area=>{
      const anchors=state.anchors.filter(anchor=>anchor.areaId===area.id&&dayIsScheduled(anchor,selectedDate)).sort((a,b)=>(a.scheduledTime||'99:99').localeCompare(b.scheduledTime||'99:99')||a.title.localeCompare(b.title,'pt-BR'));
      return [area.id,`<section class="planner-block${area.id==='area-tema-do-dia'?' planner-theme':''}" style="--area-color:${escapeHTML(area.color)};--heading-ink:${plannerHeadingInk(area.color)}"><h2><span class="planner-heading-icon" aria-hidden="true">${AREA_ICONS[area.id]||'✦'}</span><span>${escapeHTML(area.name)}</span></h2><div class="planner-block-body">${anchors.length?anchors.map(anchor=>`<div class="planner-item"><span class="planner-item-icon">${escapeHTML(anchor.icon||'✦')}</span><div><strong>${escapeHTML(anchor.title)}</strong>${anchor.description?`<p>${escapeHTML(anchor.description)}</p>`:''}</div>${anchor.scheduledTime?`<time class="planner-anchor-time">${escapeHTML(anchor.scheduledTime)}</time>`:''}</div>`).join(''):'<p class="planner-empty">Nenhuma âncora neste dia.</p>'}</div></section>`];
    }));
    const primaryAreas=areas.filter(area=>area.dailyView!=='secondary');
    const secondaryAreas=areas.filter(area=>area.dailyView==='secondary');
    const blocksFor=selected=>({theme:selected.some(area=>area.id==='area-tema-do-dia')?areaBlocks.get('area-tema-do-dia'):'',other:selected.filter(area=>area.id!=='area-tema-do-dia').map(area=>areaBlocks.get(area.id)).join('')});
    const primaryBlocks=blocksFor(primaryAreas),secondaryBlocks=blocksFor(secondaryAreas);
    const routines=scheduledRoutines(day);
    const taskDay=ensureTaskDay(selectedDate);
    const routineBlock=view=>{const entries=dailyViewOfGroup('routines')===view?routines:[];return `<section class="planner-block planner-routines"><h2><button type="button" class="planner-block-link" data-open-routine-day><span class="planner-heading-icon" aria-hidden="true">☑</span><span>Rotinas do dia</span></button></h2><div class="planner-block-body">${entries.length?entries.map(r=>`<button type="button" class="planner-routine" data-planner-routine="${escapeHTML(r.routineId)}"><span>${escapeHTML(r.icon)}</span><strong>${escapeHTML(r.name)}</strong>${r.scheduledTime?`<time class="planner-routine-time">${escapeHTML(r.scheduledTime)}</time>`:''}</button>`).join(''):'<p class="planner-empty">Nenhuma rotina nesta visão.</p>'}</div></section>`;};
    const actions=state.actions.filter(action=>actionIsScheduled(action,selectedDate)).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
    const actionBlock=view=>{const entries=dailyViewOfGroup('actions')===view?actions:[];return entries.length?`<section class="planner-block planner-block-actions"><h2><span class="planner-heading-icon" aria-hidden="true">✦</span><span>Ações</span></h2><div class="planner-block-body">${entries.map(action=>{const area=state.actionAreas.find(entry=>entry.id===action.areaId&&!entry.deleted);return `<div class="planner-item planner-action-item"><button type="button" class="planner-action-link" data-open-action="${escapeHTML(action.id)}">${escapeHTML(action.title)}</button>${area?`<span class="planner-action-area-tag" style="--tag-color:${escapeHTML(area.color||'#dcebe7')};--tag-ink:${plannerHeadingInk(area.color)}">${escapeHTML(area.name)}</span>`:''}</div>`;}).join('')}</div></section>`:'';};
    const occurrences=state.occurrences.filter(item=>occurrenceIsScheduled(item,selectedDate)).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
    const occurrenceBlock=view=>{const entries=occurrences.filter(item=>dailyViewOfGroup(`occurrence-${item.type}`)===view);return entries.length?`<section class="planner-block planner-block-occurrences"><h2><span class="planner-heading-icon" aria-hidden="true">◉</span><span>Acontecimentos</span></h2><div class="planner-block-body">${entries.map(item=>{const kind=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder;return `<div class="planner-item planner-action-item"><span class="planner-item-icon" aria-hidden="true">${escapeHTML(item.icon||kind.icon)}</span><button type="button" class="planner-action-link" data-open-occurrence="${escapeHTML(item.id)}">${escapeHTML(item.title)}</button><span class="occurrence-type occurrence-type-${escapeHTML(item.type)}">${escapeHTML(kind.label)}</span></div>`;}).join('')}</div></section>`:'';};
    const plannerExtras=view=>`${dailyViewOfGroup('routines')===view?routineBlock(view):''}${dailyViewOfGroup('tasks-weekly')===view?taskGroup(taskDay,'weekly',true,view,'tasks-weekly'):''}${dailyViewOfGroup('tasks-biweekly')===view?taskGroup(taskDay,'biweekly',true,view,'tasks-biweekly'):''}${dailyViewOfGroup('consultations')===view?taskGroup(taskDay,null,true,view,'consultations',true):''}${dailyViewOfGroup('blocks')===view?blockGroup(taskDay,true,view):''}${actionBlock(view)}${occurrenceBlock(view)}`;
    $('#planner-grid').innerHTML=`${primaryBlocks.theme}<div class="planner-areas">${primaryBlocks.other||'<p class="planner-empty">Nenhuma área na visão principal.</p>'}</div>${plannerExtras('primary')}`;
    $('#planner-secondary-grid').innerHTML=`${secondaryBlocks.theme}${secondaryBlocks.other}${plannerExtras('secondary')}`;
    if($('#timeline-workspace').classList.contains('active-workspace'))renderTimeline();
    renderNotes();
    renderEntries();
  }
  function weekDates(selectedDate){
    const start=safeDate(selectedDate);
    start.setDate(start.getDate()-(start.getDay()+6)%7);
    return Array.from({length:7},(_,index)=>{const day=new Date(start);day.setDate(start.getDate()+index);return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;});
  }
  function renderSummary(){
    const openPeriods=new Set($$('#summary-content .summary-period[open]').map(period=>period.dataset.summaryPeriod));
    $('#summary-date').value=selectedSummaryMonth;
    $('#summary-today').classList.toggle('hidden',selectedSummaryMonth===isoToday().slice(0,7));
    const [year,month]=selectedSummaryMonth.split('-').map(Number),length=new Date(year,month,0).getDate();
    const dates=Array.from({length},(_,index)=>`${selectedSummaryMonth}-${String(index+1).padStart(2,'0')}`).filter(date=>date<=isoToday());
    const details=dates.map(date=>({date,...dayStatus(date)}));
    const pending=details.filter(day=>day.routinePending||day.taskPending);
    const counts=days=>({routines:days.filter(day=>day.routinePending).length,tasks:days.filter(day=>day.taskPending).length});
    const monthCounts=counts(details);
    const dayRow=day=>`<div class="summary-day${day.routinePending||day.taskPending?' is-pending':''}"><span>${escapeHTML(fmtDate(day.date,{weekday:'short',day:'numeric',month:'short'}))}</span><div>${day.routinePending?`<button type="button" data-summary-date="${day.date}" data-summary-section="routines">Rotinas pendentes →</button>`:''}${day.taskPending?`<button type="button" data-summary-date="${day.date}" data-summary-section="tasks">Tarefas pendentes →</button>`:''}</div></div>`;
    const weeks=new Map();
    for(const day of details){const monday=weekDates(day.date)[0];if(!weeks.has(monday))weeks.set(monday,[]);weeks.get(monday).push(day);}
    $('#summary-content').innerHTML=`<div class="summary-totals"><article><span>ROTINAS</span><strong>${monthCounts.routines}</strong><p>${monthCounts.routines===1?'dia incompleto':'dias incompletos'} no mês</p></article><article><span>TAREFAS</span><strong>${monthCounts.tasks}</strong><p>${monthCounts.tasks===1?'dia incompleto':'dias incompletos'} no mês</p></article></div><details class="summary-period" data-summary-period="month"${openPeriods.has('month')?' open':''}><summary><span>Mês de ${escapeHTML(fmtDate(`${selectedSummaryMonth}-01`,{month:'long',year:'numeric'}))}</span><strong>${pending.length} ${pending.length===1?'dia pendente':'dias pendentes'}</strong></summary><div class="summary-days">${pending.length?pending.map(dayRow).join(''):'<p>Nenhum dia incompleto até agora.</p>'}</div></details><h2 class="summary-week-heading">Por semana</h2>${[...weeks].map(([monday,days])=>{const total=counts(days),pendingDays=days.filter(day=>day.routinePending||day.taskPending);return `<details class="summary-period" data-summary-period="${monday}"${openPeriods.has(monday)?' open':''}><summary><span>${escapeHTML(fmtDate(days[0].date,{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(days[days.length-1].date,{day:'numeric',month:'short'}))}</span><strong>${total.routines} rotinas · ${total.tasks} tarefas</strong></summary><div class="summary-days">${pendingDays.length?pendingDays.map(dayRow).join(''):'<p>Nenhum dia incompleto nesta semana.</p>'}</div></details>`;}).join('')}`;
  }
  function weeklyHeaders(dates,kind='both'){
    return dates.map((date,index)=>{const status=dayStatus(date),incomplete=kind==='actions'?false:status.past&&(kind==='tasks'?status.taskPending:status.routinePending||status.taskPending),content=`<strong>${escapeHTML(fmtDate(date,{weekday:'long'}))}</strong><small>${escapeHTML(fmtDate(date,{day:'numeric',month:'short'}))}</small>${incomplete?'<em>Incompleto</em>':''}`,body=kind==='both'?`<button type="button" class="weekly-day-link" data-weekly-open-date="${date}" aria-label="Abrir visão diária de ${escapeHTML(fmtDate(date))}">${content}</button>`:content;return `<th scope="col" class="weekly-day weekly-day-${(index+1)%7}${date===isoToday()?' weekly-today':''}${incomplete?' weekly-incomplete':''}" ${date===isoToday()?'aria-current="date"':''}>${body}</th>`;}).join('');
  }
  function renderWeekly(){
    const dates=weekDates(selectedWeekDate);
    const areas=orderedAreas().filter(area=>area.weeklyView!==false);
    $('#weekly-date').value=selectedWeekDate;
    $('#weekly-range-label').textContent=`${fmtDate(dates[0],{day:'numeric',month:'short'})} a ${fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'})}`;
    $('#weekly-today').classList.toggle('hidden',dates.includes(isoToday()));
    const headers=weeklyHeaders(dates);
    const areaRows=areas.map(area=>{
      const cells=dates.map(date=>{
        const anchors=state.anchors.filter(anchor=>anchor.areaId===area.id&&dayIsScheduled(anchor,date)).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
        return `<td>${anchors.map(anchor=>`<div class="weekly-anchor" title="${escapeHTML(anchor.description||anchor.title)}"><span aria-hidden="true">${escapeHTML(anchor.icon||'✦')}</span><span>${escapeHTML(anchor.title)}</span></div>`).join('')}</td>`;
      }).join('');
      return `<tr style="--area-color:${escapeHTML(area.color)}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${AREA_ICONS[area.id]||'✦'}</span><span>${escapeHTML(area.name)}</span></th>${cells}</tr>`;
    }).join('');
    const snapshots=dates.map(taskWeekSnapshot);
    const taskEntries=(index,frequency,kind='regular',consultation=false)=>taskSnapshots(snapshots[index],frequency,dates[index],kind,'','',consultation);
    const card=(icon,title,attrs='',extraClass='')=>`<button type="button" class="weekly-anchor weekly-global-item${extraClass?` ${extraClass}`:''}" ${attrs}><span aria-hidden="true">${escapeHTML(icon||'✦')}</span><span>${escapeHTML(title)}</span></button>`;
    const groupDefinitions=[
      ['routines','Rotinas','#e2eee6','☑',(date)=>state.routines.filter(item=>!item.deleted&&dayIsScheduled(item,date)).map(item=>card(item.icon,item.name,`data-weekly-routine="${escapeHTML(item.id)}"`))],
      ['tasks-weekly','Tarefas semanais','#e9e3f0','✓',(_,index)=>taskEntries(index,'weekly').map(item=>card(item.done?'✓':item.icon,item.name,`data-open-task="${escapeHTML(item.taskId)}" data-task-week-date="${dates[index]}" aria-label="${escapeHTML(item.name)}${item.done?' — concluída':' — não concluída'}"`,`weekly-task${item.done?' is-done':''}`))],
      ['tasks-biweekly','Tarefas quinzenais','#eee5dc','◫',(_,index)=>taskEntries(index,'biweekly').map(item=>card(item.done?'✓':item.icon,item.name,`data-open-task="${escapeHTML(item.taskId)}" data-task-week-date="${dates[index]}" aria-label="${escapeHTML(item.name)}${item.done?' — concluída':' — não concluída'}"`,`weekly-task${item.done?' is-done':''}`))],
      ['blocks','Blocos','#e6edf2','▣',(_,index)=>taskEntries(index,null,'block',false).map(item=>{const result=blockStatusOf(item);return card(result?'✓':item.icon,item.name,`data-open-task="${escapeHTML(item.taskId)}" data-task-week-date="${dates[index]}"`,`weekly-task${result?' is-done':''}`);} )],
      ['consultations','Consultas','#edf0e5','◌',(_,index)=>taskEntries(index,null,'regular',true).map(item=>card(item.icon,item.name,`data-open-task="${escapeHTML(item.taskId)}" data-task-week-date="${dates[index]}"`))],
      ['actions','Ações','#f3e6d7','✦',(date)=>state.actions.filter(item=>!item.deleted&&item.schedule==='date'&&actionIsScheduled(item,date)).map(item=>card(item.icon,item.title,`data-open-action="${escapeHTML(item.id)}"`))],
      ...Object.entries(OCCURRENCE_TYPES).map(([type,kind])=>[`occurrence-${type}`,`${kind.label}${type==='holiday'?'s':'s'}`,'#e8eeee',kind.icon,(date)=>state.occurrences.filter(item=>!item.deleted&&item.type===type&&occurrenceIsScheduled(item,date)).map(item=>card(item.icon||kind.icon,item.title,`data-open-occurrence="${escapeHTML(item.id)}"`))])
    ];
    const groupRows=groupDefinitions.filter(([key])=>groupInWeekly(key)).map(([,label,color,icon,entriesFor])=>{
      const cells=dates.map((date,index)=>`<td>${entriesFor(date,index).join('')}</td>`).join('');
      return `<tr class="weekly-global-row" style="--area-color:${color}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${icon}</span><span>${escapeHTML(label)}</span></th>${cells}</tr>`;
    }).join('');
    $('#weekly-grid').innerHTML=`<table class="weekly-table"><thead><tr><th scope="col" class="weekly-corner">Grupo</th>${headers}</tr></thead><tbody>${areaRows}${groupRows}</tbody></table>`;
  }
  function renderMonthly(){
    const [year,month]=selectedMonthlyMonth.split('-').map(Number),weeks=[1,2,3,4,5];
    const firstThursday=new Date(year,month-1,1,12);
    while(firstThursday.getDay()!==4)firstThursday.setDate(firstThursday.getDate()+1);
    const firstMonday=new Date(firstThursday);firstMonday.setDate(firstMonday.getDate()-3);
    const asISO=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const datesByWeek=new Map(weeks.map(week=>{
      const thursday=new Date(firstThursday);thursday.setDate(firstThursday.getDate()+(week-1)*7);
      const monday=new Date(firstMonday);monday.setDate(firstMonday.getDate()+(week-1)*7);
      return [week,thursday.getMonth()===month-1?weekDates(asISO(monday)):[]];
    }));
    const specificAnchors=state.anchors.filter(anchor=>!anchor.deleted&&Array.isArray(anchor.monthWeeks)&&anchor.monthWeeks.length>0&&!weeks.every(week=>anchor.monthWeeks.includes(week)));
    const areas=orderedAreas().filter(area=>specificAnchors.some(anchor=>anchor.areaId===area.id&&weeks.some(week=>anchor.monthWeeks.includes(week)&&datesByWeek.get(week).some(date=>dayIsScheduled(anchor,date)))));
    $('#monthly-date').value=selectedMonthlyMonth;
    $('#monthly-range-label').textContent=fmtDate(`${selectedMonthlyMonth}-01`,{month:'long',year:'numeric'});
    $('#monthly-today').classList.toggle('hidden',selectedMonthlyMonth===isoToday().slice(0,7));
    const headers=weeks.map(week=>{
      const days=datesByWeek.get(week),range=days.length?`${fmtDate(days[0],{day:'numeric',month:'short'})} a ${fmtDate(days[days.length-1],{day:'numeric',month:'short'})}`:'Sem dias neste mês';
      return `<th scope="col" class="monthly-week monthly-week-${week}${days.length?'':' is-empty'}"><span class="monthly-week-pill">semana ${week}</span><small>${escapeHTML(range)}</small></th>`;
    }).join('');
    if(!areas.length){$('#monthly-grid').innerHTML=`<table class="weekly-table monthly-table"><thead><tr><th scope="col" class="weekly-corner">Área</th>${headers}</tr></thead><tbody><tr><td colspan="6" class="monthly-empty">Nenhuma âncora de semanas específicas neste mês. Edite uma âncora e escolha as semanas para vê-la aqui.</td></tr></tbody></table>`;return;}
    const rows=areas.map(area=>{
      const cells=weeks.map(week=>{
        const entries=specificAnchors.filter(anchor=>anchor.areaId===area.id&&anchor.monthWeeks.includes(week)).map(anchor=>({anchor,days:datesByWeek.get(week).filter(date=>dayIsScheduled(anchor,date))})).filter(entry=>entry.days.length).sort((left,right)=>left.anchor.title.localeCompare(right.anchor.title,'pt-BR'));
        return `<td>${entries.map(({anchor})=>`<div class="weekly-anchor monthly-anchor" title="${escapeHTML(anchor.description||anchor.title)}"><span aria-hidden="true">${escapeHTML(anchor.icon||'✦')}</span><span>${escapeHTML(anchor.title)}</span></div>`).join('')}</td>`;
      }).join('');
      return `<tr style="--area-color:${escapeHTML(area.color)}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${AREA_ICONS[area.id]||'✦'}</span><span>${escapeHTML(area.name)}</span></th>${cells}</tr>`;
    }).join('');
    $('#monthly-grid').innerHTML=`<table class="weekly-table monthly-table"><thead><tr><th scope="col" class="weekly-corner">Área</th>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  function taskWeekSnapshot(date){
    const existing=state.taskHistory[date];
    if(existing&&date<isoToday())return existing;
    const preview=structuredClone(existing||{tasks:{}});
    reconcileTaskDay(date,preview,state.tasks,true);
    return preview;
  }
  function renderTaskWeekly(){
    const dates=weekDates(selectedTaskWeekDate);
    $('#task-week-date').value=selectedTaskWeekDate;
    $('#task-week-range-label').textContent=`${fmtDate(dates[0],{day:'numeric',month:'short'})} a ${fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'})}`;
    $('#task-week-today').classList.toggle('hidden',dates.includes(isoToday()));
    const snapshots=dates.map(taskWeekSnapshot);
    const rows=[['weekly','Semanais','#e2eee6','☑','regular','tasks-weekly',false],['biweekly','Quinzenais','#e9e3f0','◫','regular','tasks-biweekly',false],[null,'Consultas','#edf0e5','◌','regular','consultations',true],[null,'Blocos','#e6edf2','▣','block','blocks',null]].map(([frequency,label,color,icon,kind,,consultation])=>{
      const cells=snapshots.map((day,index)=>{
        const tasks=taskSnapshots(day,frequency,dates[index],kind,'','',consultation);
        return `<td>${tasks.map(task=>{const result=blockStatusOf(task),completed=task.kind==='block'?Boolean(result):task.done;return `<button type="button" class="weekly-anchor weekly-task${completed&&!taskIsConsultation(task)?' is-done':''}" data-open-task="${escapeHTML(task.taskId)}" data-task-week-date="${dates[index]}" aria-label="${escapeHTML(task.name)}${taskIsConsultation(task)?' — consulta':task.kind==='block'?` — ${blockStatusLabel(result).toLowerCase()}`:task.done?' — concluída':' — não concluída'}"><span aria-hidden="true">${escapeHTML(task.icon||'✓')}</span><span>${escapeHTML(task.name)}</span>${result&&task.kind==='block'?`<small class="weekly-block-result is-${result}">${blockStatusLabel(result)}</small>`:''}</button>`;}).join('')}</td>`;
      }).join('');
      return `<tr style="--area-color:${color}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${icon}</span><span>${label}</span></th>${cells}</tr>`;
    }).join('');
    $('#task-week-grid').innerHTML=`<table class="weekly-table task-week-table"><thead><tr><th scope="col" class="weekly-corner">Tarefas</th>${weeklyHeaders(dates,'tasks')}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  function actionCard(action){
    const schedule=actionScheduleLabel(action);
    return `<div class="action-card${action.completed?' is-complete':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action="${escapeHTML(action.id)}"><button type="button" class="action-card-main" data-edit-action="${escapeHTML(action.id)}" title="Abrir ou arrastar para outro mês"><span class="action-card-title">${action.icon?`<span class="action-card-mark">${escapeHTML(action.icon)}</span>`:''}<strong>${escapeHTML(action.title)}</strong></span>${schedule?`<small>${escapeHTML(schedule)}</small>`:''}</button></div>`;
  }
  function actionMonth(action){return action.schedule==='date'?action.scheduledDate?.slice(0,7)||'':action.scheduledMonth||'';}
  function actionWeek(action){return action.schedule==='date'&&action.scheduledDate?monthWeekNumber(action.scheduledDate):Number(action.week)||null;}
  function actionDueDate(action){
    if(action.dueDate)return action.dueDate;
    if(action.schedule==='date')return action.scheduledDate||'';
    if(!/^\d{4}-\d{2}$/.test(action.scheduledMonth||''))return '';
    const [year,month]=action.scheduledMonth.split('-').map(Number),last=new Date(year,month,0).getDate();
    if(!action.week)return `${action.scheduledMonth}-${String(last).padStart(2,'0')}`;
    for(let day=last;day>=1;day--){const date=`${action.scheduledMonth}-${String(day).padStart(2,'0')}`;if(monthWeekNumber(date)===Number(action.week))return date;}
    return '';
  }
  function actionStatus(action){return action.completed?'Concluída':actionDueDate(action)<isoToday()&&actionDueDate(action)?'Vencida':'Em aberto';}
  function renderActionWeekly(actions){
    const dates=weekDates(selectedActionWeekDate);
    $('#action-week-date').value=selectedActionWeekDate;
    $('#action-week-today').classList.toggle('hidden',dates.includes(isoToday()));
    const datedActions=actions.filter(action=>action.schedule==='date'),undatedActions=actions.filter(action=>action.schedule==='month'&&dates.some(date=>actionIsScheduled(action,date)));
    const cells=dates.map(date=>{
      const entries=datedActions.filter(action=>actionIsScheduled(action,date));
      return `<td data-action-week-date="${date}"><div class="weekly-action-dropzone">${entries.map(action=>`<div class="weekly-action${action.completed?' is-complete':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action-week="${escapeHTML(action.id)}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}</button></div>`).join('')}</div></td>`;
    }).join('');
    const undatedCards=undatedActions.map(action=>`<div class="weekly-action${action.completed?' is-complete':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action-week="${escapeHTML(action.id)}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}<small>${action.week?`Semana ${action.week}`:'Mês inteiro'}</small></button></div>`).join('');
    $('#actions-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(dates[0],{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'}))}</h3><div class="action-monthly-layout"><div class="weekly-scroll"><table class="weekly-table action-week-table"><thead><tr><th scope="col" class="weekly-corner">Ações</th>${weeklyHeaders(dates,'actions')}</tr></thead><tbody><tr style="--area-color:#f3e6d7"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">✦</span><span>Com data</span></th>${cells}</tr></tbody></table></div><aside class="action-monthly-undated"><h4>Não agendadas</h4><p>Agendadas apenas por mês ou semana.</p><div>${undatedCards||'<span class="planner-empty">Nenhuma ação nesta categoria.</span>'}</div></aside></div>`;
  }
  function renderActionMonthly(actions){
    const [year,month]=selectedActionMonth.split('-').map(Number),weeks=[1,2,3,4,5];
    const headers=weeks.map(week=>`<th scope="col" class="monthly-week monthly-week-${week}"><span class="monthly-week-pill">semana ${week}</span></th>`).join('');
    const inMonth=action=>action.schedule==='date'?action.scheduledDate?.slice(0,7)===selectedActionMonth:action.scheduledMonth===selectedActionMonth;
    const datedActions=actions.filter(action=>inMonth(action)&&action.schedule==='date'),undatedActions=actions.filter(action=>inMonth(action)&&action.schedule==='month');
    const cells=weeks.map(week=>{const weekActions=datedActions.filter(action=>actionWeek(action)===week);return `<td data-action-month-week="${week}">${weekActions.map(action=>`<div class="weekly-action${action.completed?' is-complete':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action-monthly="${escapeHTML(action.id)}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}</button></div>`).join('')}</td>`;}).join('');
    const undatedCards=undatedActions.map(action=>`<div class="weekly-action${action.completed?' is-complete':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action-monthly="${escapeHTML(action.id)}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}<small>${action.week?`Semana ${action.week}`:'Mês inteiro'}</small></button></div>`).join('');
    $('#actions-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedActionMonth}-01`,{month:'long',year:'numeric'}))}</h3><div class="action-monthly-layout"><div class="weekly-scroll"><table class="weekly-table monthly-table action-monthly-table"><thead><tr><th scope="col" class="weekly-corner">Ações</th>${headers}</tr></thead><tbody>${datedActions.length?`<tr style="--area-color:#f3e6d7"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">✦</span><span>Com data</span></th>${cells}</tr>`:'<tr><td colspan="6" class="monthly-empty">Nenhuma ação com data específica neste mês.</td></tr>'}</tbody></table></div><aside class="action-monthly-undated"><h4>Sem data específica</h4><p>Agendadas por mês ou semana.</p><div>${undatedCards||'<span class="planner-empty">Nenhuma ação nesta categoria.</span>'}</div></aside></div>`;
  }
  function renderActionList(actions){
    const areaSelect=$('#action-filter-area'),selectedArea=areaSelect.value;
    areaSelect.innerHTML='<option value="">Todas</option>'+state.actionAreas.filter(area=>!area.deleted).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    areaSelect.value=selectedArea;
    const get=id=>$(id).value;
    const search=get('#action-filter-search').trim().toLocaleLowerCase('pt-BR'),status=get('#action-filter-status'),area=get('#action-filter-area'),schedule=get('#action-filter-schedule'),month=get('#action-filter-month'),week=get('#action-filter-week');
    const createdFrom=get('#action-filter-created-from'),createdTo=get('#action-filter-created-to'),completedFrom=get('#action-filter-completed-from'),completedTo=get('#action-filter-completed-to'),dueFrom=get('#action-filter-due-from'),dueTo=get('#action-filter-due-to');
    const within=(date,from,to)=>(!from||date&&date>=from)&&(!to||date&&date<=to);
    const filtered=actions.filter(action=>{
      const created=(action.createdAt||'').slice(0,10),completed=(action.completedAt||'').slice(0,10),due=actionDueDate(action);
      const statusMatches=!status||(status==='open'&&!action.completed)||(status==='completed'&&action.completed)||(status==='overdue'&&actionStatus(action)==='Vencida');
      return (!search||[action.title,action.description,action.notes,actionAreaName(action)].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(search)))
        &&statusMatches
        &&(!area||action.areaId===area)&&(!schedule||action.schedule===schedule)&&(!month||actionMonth(action)===month)&&(!week||actionWeek(action)===Number(week))
        &&within(created,createdFrom,createdTo)&&within(completed,completedFrom,completedTo)&&within(due,dueFrom,dueTo);
    });
    const sortBy=get('#action-sort-by'),direction=get('#action-sort-direction')==='desc'?-1:1;
    const sortValue=action=>({due:actionDueDate(action),title:action.title,area:actionAreaName(action),created:(action.createdAt||'').slice(0,10),completed:(action.completedAt||'').slice(0,10),month:actionMonth(action),week:actionWeek(action)?String(actionWeek(action)).padStart(2,'0'):'',status:actionStatus(action)})[sortBy]||'';
    filtered.sort((a,b)=>{const left=sortValue(a),right=sortValue(b);if(!left)return right?1:0;if(!right)return -1;return direction*left.localeCompare(right,'pt-BR',{numeric:true})||a.title.localeCompare(b.title,'pt-BR');});
    const dateLabel=value=>value?escapeHTML(fmtDate(value.slice(0,10),{day:'2-digit',month:'2-digit',year:'numeric'})):'—';
    const rows=filtered.map(action=>{const due=actionDueDate(action),stateLabel=actionStatus(action);return `<tr class="${action.completed?'is-complete':''}"><td><div class="action-list-title"><button type="button" class="action-complete-toggle" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}" aria-pressed="${action.completed?'true':'false'}">${action.completed?'✓':''}</button><span>${action.icon?`${escapeHTML(action.icon)} `:''}<strong>${escapeHTML(action.title)}</strong></span></div></td><td>${escapeHTML(actionAreaName(action)||'—')}</td><td>${actionMonth(action)?escapeHTML(fmtDate(`${actionMonth(action)}-01`,{month:'short',year:'numeric'})):'—'}</td><td>${actionWeek(action)?`Semana ${actionWeek(action)}`:'—'}</td><td>${dateLabel(due)}</td><td>${dateLabel(action.createdAt||'')}</td><td>${dateLabel(action.completedAt||'')}</td><td><span class="action-status is-${stateLabel==='Concluída'?'done':stateLabel==='Vencida'?'late':'open'}">${stateLabel}</span></td><td><button type="button" class="small-edit" data-edit-action="${escapeHTML(action.id)}">Editar</button></td></tr>`;}).join('');
    $('#actions-content').innerHTML=`<p class="action-list-count">${filtered.length} ${filtered.length===1?'ação encontrada':'ações encontradas'}</p><div class="action-list-scroll"><table class="action-list-table"><thead><tr><th>Ação</th><th>Área geral</th><th>Mês</th><th>Semana</th><th>Vencimento</th><th>Criação</th><th>Conclusão</th><th>Estado</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="9" class="action-list-empty">Nenhuma ação corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
  }
  function renderActions(){
    $('#action-month').value=selectedActionMonth;
    $('#action-current-month').classList.toggle('hidden',selectedActionMonth===isoToday().slice(0,7));
    $('.action-month-navigator').classList.toggle('hidden',actionView==='list'||actionView==='week');
    $('.action-week-navigator').classList.toggle('hidden',actionView!=='week');
    $('#action-list-filters').classList.toggle('hidden',actionView!=='list');
    $$('.action-tab').forEach(button=>{const active=button.dataset.actionView===actionView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const actions=state.actions.filter(action=>!action.deleted).sort((a,b)=>(a.scheduledDate||`${a.scheduledMonth}-01`).localeCompare(b.scheduledDate||`${b.scheduledMonth}-01`)||a.title.localeCompare(b.title,'pt-BR'));
    const monthOf=action=>action.schedule==='date'?action.scheduledDate?.slice(0,7):action.scheduledMonth;
    const [year,month]=selectedActionMonth.split('-').map(Number);
    if(actionView==='annual'){
      const columns=Array.from({length:12},(_,i)=>{
        const key=`${year}-${String(i+1).padStart(2,'0')}`,entries=actions.filter(action=>monthOf(action)===key);
        const name=fmtDate(`${key}-01`,{month:'short'});
        return `<section class="action-month-column${key===selectedActionMonth?' is-selected':''}" data-action-month="${key}"><header><span>${escapeHTML(name)}</span><b>${entries.length}</b></header><div class="action-card-list">${entries.map(actionCard).join('')}<button type="button" class="action-add-inline" data-add-action-month="${key}">＋ Adicionar ação</button></div></section>`;
      });
      $('#actions-content').innerHTML=`<h3 class="action-period-title">${year}</h3><div class="action-month-board" role="region" aria-label="Ações por mês" tabindex="0">${columns.join('')}</div>`;
      const board=$('.action-month-board'),selected=$('.action-month-column.is-selected',board);
      if(selected)board.scrollLeft=Math.max(0,selected.offsetLeft-board.offsetLeft-12);
    }else if(actionView==='monthly'){
      renderActionMonthly(actions);
    }else if(actionView==='week'){
      renderActionWeekly(actions);
    }else if(actionView==='date'){
      const first=new Date(year,month-1,1),start=new Date(year,month-1,1-(first.getDay()+6)%7),last=new Date(year,month,0),weeks=Math.ceil(((first.getDay()+6)%7+last.getDate())/7);
      const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const heads=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map(label=>`<div class="action-calendar-heading">${label}</div>`).join('');
      const cells=Array.from({length:weeks*7},(_,index)=>{
        const day=new Date(start);day.setDate(start.getDate()+index);const key=dateKey(day),entries=actions.filter(action=>action.schedule==='date'&&action.scheduledDate===key);
        return `<div class="action-calendar-day${day.getMonth()!==month-1?' is-outside':''}${key===isoToday()?' is-today':''}"><div class="action-calendar-day-head"><span>${day.getDate()}</span><button type="button" data-add-action-date="${key}" aria-label="Adicionar ação em ${escapeHTML(fmtDate(key))}">＋</button></div><div class="action-calendar-items">${entries.map(action=>`<div class="action-calendar-item${action.completed?' is-complete':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}" aria-pressed="${action.completed?'true':'false'}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`<span>${escapeHTML(action.icon)}</span>`:''}${escapeHTML(action.title)}<small>${escapeHTML([actionAreaName(action),`Semana ${monthWeekNumber(key)}`].filter(Boolean).join(' · '))}</small></button></div>`).join('')}</div></div>`;
      }).join('');
      $('#actions-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedActionMonth}-01`,{month:'long',year:'numeric'}))}</h3><div class="action-calendar-scroll"><div class="action-calendar">${heads}${cells}</div></div>`;
    }else{
      renderActionList(actions);
    }
    const actionAreas=state.actionAreas.filter(area=>!area.deleted).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    $('#action-area-list').innerHTML=actionAreas.length?actionAreas.map(area=>`<article class="area-card"><span class="area-swatch" style="background:${escapeHTML(area.color||'#dcebe7')}"></span><strong>${escapeHTML(area.name)}</strong><small class="area-view-tag">${state.actions.filter(action=>!action.deleted&&action.areaId===area.id).length} ações</small><button type="button" class="small-edit" data-edit-action-area="${escapeHTML(area.id)}">Editar</button></article>`).join(''):'<p class="planner-empty">Crie áreas gerais para organizar as ações.</p>';
  }
  function openActionDialog(id=null){
    const action=state.actions.find(entry=>entry.id===id&&!entry.deleted);
    $('#action-form').reset();$('#action-id').value=action?.id||'';
    $('#action-dialog-title').textContent=action?'Editar ação':'Nova ação';
    $('#action-title').value=action?.title||'';$('#action-description').value=action?.description||'';
    $('#action-icon').value=action?.icon||'';$('#action-color').value=action?.color||'#bbdcd8';
    const actionAreas=state.actionAreas.filter(area=>!area.deleted).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    $('#action-area').innerHTML='<option value="">Sem área geral</option>'+actionAreas.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    if(action?.areaId&&!actionAreas.some(area=>area.id===action.areaId))$('#action-area').insertAdjacentHTML('beforeend',`<option value="${escapeHTML(action.areaId)}">Área indisponível</option>`);
    $('#action-area').value=action?.areaId||'';
    $('#action-schedule').value=action?.schedule||'month';
    $('#action-scheduled-month').value=action?.scheduledMonth||selectedActionMonth;
    $('#action-scheduled-date').value=action?.scheduledDate||selectedDate;
    $('#action-due').value=action?.dueDate||'';
    $('#action-week').value=action?.week||'';
    $('#action-completed').checked=action?.completed===true;
    $('#action-created-at').textContent=action?`Criada em ${fmtDate((action.createdAt||action.updatedAt).slice(0,10),{day:'numeric',month:'long',year:'numeric'})}`:'';
    $('#action-created-at').classList.toggle('hidden',!action);
    $('#action-notes').value=action?.notes||'';
    $('#delete-action').classList.toggle('hidden',!action);
    updateActionSchedule();refreshColorPalettes();$('#action-dialog').showModal();
  }
  function updateActionSchedule(){
    const date=$('#action-schedule').value==='date';
    $('#action-month-field').classList.toggle('hidden',date);
    $('#action-date-field').classList.toggle('hidden',!date);
    $('#action-date-week').textContent=date&&$('#action-scheduled-date').value?`Semana ${monthWeekNumber($('#action-scheduled-date').value)} · calculada a partir da data`:'';
  }
  function saveAction(event){
    event.preventDefault();
    const title=$('#action-title').value.trim(),schedule=$('#action-schedule').value,scheduledMonth=$('#action-scheduled-month').value,scheduledDate=$('#action-scheduled-date').value;
    if(!title){toast('Dê um nome à ação.');return;}
    if(schedule==='date'?!scheduledDate:!scheduledMonth){toast('Escolha a data ou o mês da ação.');return;}
    const id=$('#action-id').value||uid(),existing=state.actions.find(action=>action.id===id),now=stamp(),completed=$('#action-completed').checked;
    const next={id,title,description:$('#action-description').value.trim(),notes:$('#action-notes').value.trim(),icon:$('#action-icon').value.trim(),color:$('#action-color').value,areaId:$('#action-area').value,schedule,scheduledMonth:schedule==='month'?scheduledMonth:'',scheduledDate:schedule==='date'?scheduledDate:'',week:schedule==='month'?Number($('#action-week').value)||null:null,dueDate:$('#action-due').value,createdAt:existing?.createdAt||isoToday(),completed,completedAt:completed?(existing?.completed?existing.completedAt||existing.completionChangedAt||isoToday():isoToday()):'',completionChangedAt:existing?.completed===completed?existing?.completionChangedAt||'':now,updatedAt:now,deleted:false};
    const index=state.actions.findIndex(action=>action.id===id);
    if(index<0)state.actions.push(next);else state.actions[index]=next;
    selectedActionMonth=(schedule==='date'?scheduledDate:scheduledMonth).slice(0,7);
    saveLocal();$('#action-dialog').close();renderActions();renderPlanner();toast('Ação salva.');
  }
  function deleteAction(){
    const action=state.actions.find(entry=>entry.id===$('#action-id').value&&!entry.deleted);if(!action)return;
    if(!confirm(`Excluir a ação “${action.title}”?`))return;
    action.deleted=true;action.updatedAt=stamp();saveLocal();$('#action-dialog').close();renderActions();renderPlanner();toast('Ação excluída.');
  }
  function toggleAction(id){
    const action=state.actions.find(entry=>entry.id===id&&!entry.deleted);if(!action)return;
    const scroll=$('.action-month-board')?.scrollLeft;
    action.completed=!action.completed;action.completionChangedAt=stamp();action.completedAt=action.completed?isoToday():'';action.updatedAt=action.completionChangedAt;
    saveLocal();renderActions();if(scroll!==undefined&&$('.action-month-board'))$('.action-month-board').scrollLeft=scroll;renderPlanner();
  }
  function moveActionToMonth(id,monthKey){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey))return;
    const action=state.actions.find(entry=>entry.id===id&&!entry.deleted);
    if(!action||actionMonth(action)===monthKey)return;
    const [year,month]=monthKey.split('-').map(Number),lastDay=new Date(year,month,0).getDate();
    if(action.schedule==='date'){
      const day=Math.min(Number(action.scheduledDate?.slice(8,10))||1,lastDay);
      action.scheduledDate=`${monthKey}-${String(day).padStart(2,'0')}`;
    }else{
      action.scheduledMonth=monthKey;
      if(action.week){
        const weeks=Array.from({length:lastDay},(_,index)=>monthWeekNumber(`${monthKey}-${String(index+1).padStart(2,'0')}`));
        action.week=Math.min(Number(action.week),Math.max(...weeks));
      }
    }
    action.updatedAt=stamp();selectedActionMonth=monthKey;
    saveLocal();renderActions();renderPlanner();
    toast(`Ação movida para ${fmtDate(`${monthKey}-01`,{month:'long',year:'numeric'})}.`);
  }
  function moveActionToWeekDate(id,date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const action=state.actions.find(entry=>entry.id===id&&!entry.deleted);if(!action)return;
    if(action.schedule==='date'){
      if(action.scheduledDate===date)return;
      action.scheduledDate=date;
    }else{
      const month=date.slice(0,7),week=monthWeekNumber(date);
      if(action.scheduledMonth===month&&Number(action.week)===week)return;
      action.scheduledMonth=month;action.week=week;
    }
    action.updatedAt=stamp();selectedActionWeekDate=date;selectedActionMonth=date.slice(0,7);
    saveLocal();renderActions();renderPlanner();toast('Ação movida para a semana escolhida.');
  }
  function moveActionToMonthlyWeek(id,week){
    const action=state.actions.find(entry=>entry.id===id&&!entry.deleted),targetWeek=Number(week);if(!action||!targetWeek)return;
    const [year,month]=selectedActionMonth.split('-').map(Number),lastDay=new Date(year,month,0).getDate();
    const targetDay=Array.from({length:lastDay},(_,index)=>index+1).find(day=>monthWeekNumber(`${selectedActionMonth}-${String(day).padStart(2,'0')}`)===targetWeek);
    if(!targetDay)return;
    const date=`${selectedActionMonth}-${String(targetDay).padStart(2,'0')}`;
    if(action.schedule==='date'&&action.scheduledDate===date)return;
    action.schedule='date';action.scheduledDate=date;action.scheduledMonth='';action.week=null;action.updatedAt=stamp();
    saveLocal();renderActions();renderPlanner();toast(`Ação movida para a semana ${targetWeek}.`);
  }
  function openActionAreaDialog(id=null){
    const area=state.actionAreas.find(entry=>entry.id===id&&!entry.deleted);
    $('#action-area-form').reset();$('#action-area-id').value=area?.id||'';
    $('#action-area-dialog-title').textContent=area?'Editar área geral':'Nova área geral';
    $('#action-area-name').value=area?.name||'';$('#action-area-color').value=area?.color||'#dcebe7';
    $('#delete-action-area').classList.toggle('hidden',!area);refreshColorPalettes();$('#action-area-dialog').showModal();
  }
  function saveActionArea(event){
    event.preventDefault();const name=$('#action-area-name').value.trim();if(!name){toast('Dê um nome à área geral.');return;}
    const id=$('#action-area-id').value||uid(),next={id,name,color:$('#action-area-color').value,updatedAt:stamp(),deleted:false};
    const index=state.actionAreas.findIndex(area=>area.id===id);
    if(index<0)state.actionAreas.push(next);else state.actionAreas[index]=next;
    saveLocal();$('#action-area-dialog').close();renderActions();renderPlanner();toast('Área geral salva.');
  }
  function deleteActionArea(){
    const area=state.actionAreas.find(entry=>entry.id===$('#action-area-id').value&&!entry.deleted);if(!area)return;
    if(state.actions.some(action=>!action.deleted&&action.areaId===area.id)){toast('Mova ou exclua as ações desta área antes de excluí-la.');return;}
    if(!confirm(`Excluir a área geral “${area.name}”?`))return;
    area.deleted=true;area.updatedAt=stamp();saveLocal();$('#action-area-dialog').close();renderActions();toast('Área geral excluída.');
  }
  function occurrenceIsScheduled(item,date){
    if(item.deleted)return false;
    if(item.type==='birthday')return Boolean(item.scheduledDate)&&item.scheduledDate.slice(5)===date.slice(5);
    if(item.schedule==='date')return Boolean(item.scheduledDate)&&date>=item.scheduledDate&&date<=(item.scheduledEndDate||item.scheduledDate);
    if(item.schedule==='month')return item.scheduledMonth===date.slice(0,7)&&(!item.week||Number(item.week)===monthWeekNumber(date));
    if(item.schedule!=='recurrence'||item.type!=='reminder')return false;
    if(item.startDate&&date<item.startDate)return false;
    if(item.endDate&&date>item.endDate)return false;
    if(Array.isArray(item.monthWeeks)&&item.monthWeeks.length&&!item.monthWeeks.includes(monthWeekNumber(date)))return false;
    return (item.weekdays||[]).includes(safeDate(date).getDay());
  }
  function occurrenceDatesInMonth(item,monthKey){
    const [year,month]=monthKey.split('-').map(Number),length=new Date(year,month,0).getDate(),dates=[];
    for(let day=1;day<=length;day++){const date=`${monthKey}-${String(day).padStart(2,'0')}`;if(occurrenceIsScheduled(item,date))dates.push(date);}
    return dates;
  }
  function occurrenceMonth(item,year=Number(selectedOccurrenceMonth.slice(0,4))){
    if(item.type==='birthday'&&item.scheduledDate)return `${year}-${item.scheduledDate.slice(5,7)}`;
    if(item.schedule==='date')return item.scheduledDate?.slice(0,7)||'';
    return item.schedule==='month'?item.scheduledMonth||'':'';
  }
  function occurrenceScheduleLabel(item){
    if(item.type==='birthday'&&item.scheduledDate)return `Todo ano em ${fmtDate(item.scheduledDate,{day:'numeric',month:'long'})}`;
    if(item.schedule==='date'&&item.scheduledDate){const start=fmtDate(item.scheduledDate,{day:'numeric',month:'short',year:'numeric'});return item.scheduledEndDate&&item.scheduledEndDate!==item.scheduledDate?`${start} a ${fmtDate(item.scheduledEndDate,{day:'numeric',month:'short',year:'numeric'})}`:start;}
    if(item.schedule==='month')return `${item.week?`Semana ${item.week} · `:''}${fmtDate(`${item.scheduledMonth}-01`,{month:'long',year:'numeric'})}`;
    const days=(item.weekdays||[]).map(day=>WEEKDAYS[day]).join(', '),weeks=item.monthWeeks?.length?` · semanas ${item.monthWeeks.join(', ')}`:'';
    return `${days||'Sem dias'}${weeks}`;
  }
  function occurrenceCard(item){
    const type=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder;
    return `<button type="button" class="action-card occurrence-card" style="--action-color:${escapeHTML(item.color||'#5DFF5D')}" data-edit-occurrence="${escapeHTML(item.id)}"><span class="action-card-main"><span class="action-card-title"><span class="action-card-mark">${escapeHTML(item.icon||type.icon)}</span><strong>${escapeHTML(item.title)}</strong></span><small>${escapeHTML(type.label)}${item.schedule==='recurrence'?` · ${escapeHTML(occurrenceScheduleLabel(item))}`:''}</small></span></button>`;
  }
  function renderOccurrenceList(items){
    const search=$('#occurrence-filter-search').value.trim().toLocaleLowerCase('pt-BR'),type=$('#occurrence-filter-type').value,schedule=$('#occurrence-filter-schedule').value,month=$('#occurrence-filter-month').value;
    const filtered=items.filter(item=>(!search||[item.title,item.description,item.notes].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(search)))&&(!type||item.type===type)&&(!schedule||(item.type==='birthday'?schedule==='recurrence':item.schedule===schedule))&&(!month||(item.schedule==='month'?occurrenceMonth(item,Number(month.slice(0,4)))===month:occurrenceDatesInMonth(item,month).length>0)));
    const sortBy=$('#occurrence-sort-by').value,direction=$('#occurrence-sort-direction').value==='desc'?-1:1;
    const sortValue=item=>({date:item.type==='birthday'?item.scheduledDate?.slice(5)||'':item.scheduledDate||item.scheduledMonth||item.startDate||'',title:item.title,type:OCCURRENCE_TYPES[item.type]?.label||'',created:(item.createdAt||'').slice(0,10)})[sortBy]||'';
    filtered.sort((a,b)=>direction*sortValue(a).localeCompare(sortValue(b),'pt-BR',{numeric:true})||a.title.localeCompare(b.title,'pt-BR'));
    const rows=filtered.map(item=>{const kind=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder;return `<tr><td><div class="action-list-title"><span>${escapeHTML(item.icon||kind.icon)}</span><strong>${escapeHTML(item.title)}</strong></div></td><td><span class="occurrence-type occurrence-type-${escapeHTML(item.type)}">${escapeHTML(kind.label)}</span></td><td>${escapeHTML(occurrenceScheduleLabel(item))}</td><td>${item.createdAt?escapeHTML(fmtDate(item.createdAt.slice(0,10),{day:'2-digit',month:'2-digit',year:'numeric'})):'—'}</td><td><button type="button" class="small-edit" data-edit-occurrence="${escapeHTML(item.id)}">Editar</button></td></tr>`;}).join('');
    $('#occurrences-content').innerHTML=`<p class="action-list-count">${filtered.length} ${filtered.length===1?'acontecimento encontrado':'acontecimentos encontrados'}</p><div class="action-list-scroll"><table class="action-list-table occurrence-list-table"><thead><tr><th>Acontecimento</th><th>Tipo</th><th>Agendamento</th><th>Criação</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="action-list-empty">Nenhum acontecimento corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
  }
  function renderOccurrenceCalendarCells(items,start,weeks,visibleMonth){
    const keyOf=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const weekMarkup=[];
    for(let week=0;week<weeks;week++){
      const days=Array.from({length:7},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+week*7+index);return {date,key:keyOf(date)};});
      const segments=[];
      for(const item of items){
        if(item.schedule==='month')continue;
        if(item.schedule==='date'&&item.scheduledDate&&item.scheduledEndDate&&item.scheduledEndDate>item.scheduledDate){
          const first=days.findIndex(day=>day.key>=item.scheduledDate&&day.key<=item.scheduledEndDate),last=days.findLastIndex(day=>day.key>=item.scheduledDate&&day.key<=item.scheduledEndDate);
          if(first>=0)segments.push({item,start:first,end:last});
        }else days.forEach((day,index)=>{if(occurrenceIsScheduled(item,day.key))segments.push({item,start:index,end:index});});
      }
      segments.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start)||a.item.title.localeCompare(b.item.title,'pt-BR'));
      const lanes=[];
      for(const segment of segments){let lane=lanes.findIndex(occupied=>Array.from({length:segment.end-segment.start+1},(_,offset)=>!occupied[segment.start+offset]).every(Boolean));if(lane<0){lane=lanes.length;lanes.push(Array(7).fill(false));}for(let index=segment.start;index<=segment.end;index++)lanes[lane][index]=true;segment.lane=lane;}
      for(let dayIndex=0;dayIndex<7;dayIndex++){
        const {date,key}=days[dayIndex],slots=Array.from({length:lanes.length},(_,lane)=>{
          const segment=segments.find(entry=>entry.lane===lane&&entry.start===dayIndex);
          if(segment){const {item}=segment,kind=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder,span=segment.end-segment.start+1,width=`calc(${span*100}% + ${(span-1)*13}px)`;return `<button type="button" class="action-calendar-item occurrence-calendar-item occurrence-calendar-range" style="--action-color:${escapeHTML(item.color||'#5DFF5D')};width:${width}" data-edit-occurrence="${escapeHTML(item.id)}"><span>${escapeHTML(item.icon||kind.icon)}</span><span>${escapeHTML(item.title)}<small>${escapeHTML(kind.label)}</small></span></button>`;}
          return `<span class="occurrence-calendar-slot${segments.some(entry=>entry.lane===lane&&entry.start<dayIndex&&entry.end>=dayIndex)?' is-continuation':''}" aria-hidden="true"></span>`;
        }).join('');
        weekMarkup.push(`<div class="action-calendar-day occurrence-calendar-day${date.getMonth()!==visibleMonth-1?' is-outside':''}${key===isoToday()?' is-today':''}"><div class="action-calendar-day-head"><span>${date.getDate()}</span><button type="button" data-add-occurrence-date="${key}" aria-label="Adicionar acontecimento em ${escapeHTML(fmtDate(key))}">＋</button></div><div class="action-calendar-items occurrence-calendar-items">${slots}</div></div>`);
      }
    }
    return weekMarkup.join('');
  }
  function renderOccurrences(){
    $('#occurrence-month').value=selectedOccurrenceMonth;
    $('#occurrence-current-month').classList.toggle('hidden',selectedOccurrenceMonth===isoToday().slice(0,7));
    $('.occurrence-month-navigator').classList.toggle('hidden',occurrenceView==='list'||occurrenceView==='week');
    $('#occurrence-list-filters').classList.toggle('hidden',occurrenceView!=='list');
    $$('.occurrence-tab').forEach(button=>{const active=button.dataset.occurrenceView===occurrenceView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const items=state.occurrences.filter(item=>!item.deleted),[year,month]=selectedOccurrenceMonth.split('-').map(Number);
    if(occurrenceView==='annual'){
      const columns=Array.from({length:12},(_,index)=>{const key=`${year}-${String(index+1).padStart(2,'0')}`;const entries=items.filter(item=>item.schedule==='month'?occurrenceMonth(item,year)===key:occurrenceDatesInMonth(item,key).length>0).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));return `<section class="action-month-column occurrence-month-column${key===selectedOccurrenceMonth?' is-selected':''}"><header><span>${escapeHTML(fmtDate(`${key}-01`,{month:'short'}))}</span><b>${entries.length}</b></header><div class="action-card-list">${entries.map(occurrenceCard).join('')}<button type="button" class="action-add-inline" data-add-occurrence-month="${key}">＋ Adicionar acontecimento</button></div></section>`;});
      $('#occurrences-content').innerHTML=`<h3 class="action-period-title">${year}</h3><div class="action-month-board" role="region" aria-label="Acontecimentos por mês" tabindex="0">${columns.join('')}</div>`;
      const board=$('#occurrences-content .action-month-board'),selected=$('#occurrences-content .action-month-column.is-selected');if(selected)board.scrollLeft=Math.max(0,selected.offsetLeft-board.offsetLeft-12);
    }else if(occurrenceView==='monthly'){
      const weeks=[1,2,3,4,5], headers=weeks.map(week=>`<th scope="col" class="monthly-week"><span class="monthly-week-pill">semana ${week}</span></th>`).join('');
      const entries=items.filter(item=>item.schedule==='month'?occurrenceMonth(item,year)===selectedOccurrenceMonth:occurrenceDatesInMonth(item,selectedOccurrenceMonth).length>0);
      const cells=weeks.map(week=>`<td>${entries.filter(item=>item.schedule==='month'?Number(item.week)===week||!item.week:occurrenceDatesInMonth(item,selectedOccurrenceMonth).some(date=>monthWeekNumber(date)===week)).map(occurrenceCard).join('')}</td>`).join('');
      $('#occurrences-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedOccurrenceMonth}-01`,{month:'long',year:'numeric'}))}</h3><div class="weekly-scroll"><table class="weekly-table monthly-table"><thead><tr><th class="weekly-corner">Acontecimentos</th>${headers}</tr></thead><tbody><tr><th>Todos</th>${cells}</tr></tbody></table></div>`;
    }else if(occurrenceView==='week'){
      const dates=weekDates(selectedOccurrenceMonth+'-01'), entries=items.filter(item=>dates.some(date=>occurrenceIsScheduled(item,date)));
      $('#occurrences-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(dates[0],{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'}))}</h3><div class="weekly-scroll"><table class="weekly-table"><thead><tr><th class="weekly-corner">Acontecimentos</th>${weeklyHeaders(dates,'occurrences')}</tr></thead><tbody><tr><th>Todos</th>${dates.map(date=>`<td>${entries.filter(item=>occurrenceIsScheduled(item,date)).map(occurrenceCard).join('')}</td>`).join('')}</tr></tbody></table></div>`;
    }else if(occurrenceView==='date'){
      const first=new Date(year,month-1,1),start=new Date(year,month-1,1-(first.getDay()+6)%7),last=new Date(year,month,0),weeks=Math.ceil(((first.getDay()+6)%7+last.getDate())/7),dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const heads=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map(label=>`<div class="action-calendar-heading">${label}</div>`).join('');
      const cells=renderOccurrenceCalendarCells(items,start,weeks,month);
      $('#occurrences-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedOccurrenceMonth}-01`,{month:'long',year:'numeric'}))}</h3><div class="action-calendar-scroll"><div class="action-calendar">${heads}${cells}</div></div>`;
    }else renderOccurrenceList(items);
  }
  function buildOccurrenceOptions(item={}){
    $('#occurrence-weekday-options').innerHTML=WEEKDAYS.map((day,index)=>`<label class="weekday-option"><input type="checkbox" value="${index}" ${(item.weekdays||[]).includes(index)?'checked':''}><span>${day}</span></label>`).join('');
    $('#occurrence-month-week-options').innerHTML=[1,2,3,4,5].map(week=>`<label class="weekday-option"><input type="checkbox" value="${week}" ${(item.monthWeeks||[]).includes(week)?'checked':''}><span>Semana ${week}</span></label>`).join('');
  }
  function updateOccurrenceForm(){
    const type=$('#occurrence-type').value,schedule=$('#occurrence-schedule'),recurrenceOption=$('#occurrence-schedule option[value="recurrence"]');
    recurrenceOption.disabled=type!=='reminder';recurrenceOption.hidden=type!=='reminder';
    if(type==='birthday')schedule.value='date';else if(schedule.value==='recurrence'&&type!=='reminder')schedule.value='date';
    schedule.disabled=type==='birthday';
    const mode=schedule.value;
    $('#occurrence-month-field').classList.toggle('hidden',mode!=='month');$('#occurrence-date-field').classList.toggle('hidden',mode!=='date');$('#occurrence-recurrence-field').classList.toggle('hidden',mode!=='recurrence');
    $('#occurrence-end-date-field').classList.toggle('hidden',mode!=='date'||!['event','holiday','cycle'].includes(type));
    $('#occurrence-annual-hint').classList.toggle('hidden',type!=='birthday');
    $('#occurrence-month-weeks-field').classList.toggle('hidden',mode!=='recurrence'||$('#occurrence-repeat-mode').value!=='month-weeks');
  }
  function openOccurrenceDialog(id=null){
    const item=state.occurrences.find(entry=>entry.id===id&&!entry.deleted);
    $('#occurrence-form').reset();$('#occurrence-id').value=item?.id||'';$('#occurrence-dialog-title').textContent=item?'Editar acontecimento':'Novo acontecimento';
    $('#occurrence-title').value=item?.title||'';$('#occurrence-type').value=item?.type||'reminder';$('#occurrence-description').value=item?.description||'';$('#occurrence-icon').value=item?.icon||'';$('#occurrence-color').value=item?.color||'#5DFF5D';
    $('#occurrence-schedule').value=item?.schedule||'date';$('#occurrence-scheduled-month').value=item?.scheduledMonth||selectedOccurrenceMonth;$('#occurrence-scheduled-date').value=item?.scheduledDate||selectedDate;$('#occurrence-scheduled-end-date').value=item?.scheduledEndDate||'';$('#occurrence-week').value=item?.week||'';
    $('#occurrence-repeat-mode').value=item?.monthWeeks?.length?'month-weeks':'every-week';$('#occurrence-start').value=item?.startDate||'';$('#occurrence-end').value=item?.endDate||'';$('#occurrence-notes').value=item?.notes||'';
    buildOccurrenceOptions(item);$('#delete-occurrence').classList.toggle('hidden',!item);updateOccurrenceForm();refreshColorPalettes();$('#occurrence-dialog').showModal();
  }
  function saveOccurrence(event){
    event.preventDefault();const title=$('#occurrence-title').value.trim(),type=$('#occurrence-type').value,schedule=type==='birthday'?'date':$('#occurrence-schedule').value,scheduledMonth=$('#occurrence-scheduled-month').value,scheduledDate=$('#occurrence-scheduled-date').value;
    const scheduledEndDate=['event','holiday','cycle'].includes(type)&&schedule==='date'?$('#occurrence-scheduled-end-date').value:'';
    if(!title){toast('Dê um nome ao acontecimento.');return;}if(schedule==='date'&&!scheduledDate){toast('Escolha a data do acontecimento.');return;}if(schedule==='month'&&!scheduledMonth){toast('Escolha o mês do acontecimento.');return;}if(scheduledEndDate&&scheduledEndDate<scheduledDate){toast('A data final deve ser igual ou posterior à data inicial.');return;}
    const weekdays=$$('#occurrence-weekday-options input:checked').map(input=>Number(input.value)),monthWeeks=$('#occurrence-repeat-mode').value==='month-weeks'?$$('#occurrence-month-week-options input:checked').map(input=>Number(input.value)):[];
    if(schedule==='recurrence'&&!weekdays.length){toast('Escolha ao menos um dia da semana.');return;}if(schedule==='recurrence'&&$('#occurrence-repeat-mode').value==='month-weeks'&&!monthWeeks.length){toast('Escolha ao menos uma semana do mês.');return;}
    const id=$('#occurrence-id').value||uid(),existing=state.occurrences.find(item=>item.id===id),next={id,title,type,description:$('#occurrence-description').value.trim(),notes:$('#occurrence-notes').value.trim(),icon:$('#occurrence-icon').value.trim(),color:$('#occurrence-color').value,schedule,scheduledMonth:schedule==='month'?scheduledMonth:'',scheduledDate:schedule==='date'?scheduledDate:'',scheduledEndDate,week:schedule==='month'?Number($('#occurrence-week').value)||null:null,weekdays:schedule==='recurrence'?weekdays:[],monthWeeks:schedule==='recurrence'?monthWeeks:[],startDate:schedule==='recurrence'?$('#occurrence-start').value:'',endDate:schedule==='recurrence'?$('#occurrence-end').value:'',createdAt:existing?.createdAt||isoToday(),updatedAt:stamp(),deleted:false};
    const index=state.occurrences.findIndex(item=>item.id===id);if(index<0)state.occurrences.push(next);else state.occurrences[index]=next;
    selectedOccurrenceMonth=(schedule==='date'?`${selectedOccurrenceMonth.slice(0,4)}-${scheduledDate.slice(5,7)}`:schedule==='month'?scheduledMonth:selectedOccurrenceMonth);saveLocal();$('#occurrence-dialog').close();renderOccurrences();renderPlanner();toast('Acontecimento salvo.');
  }
  function deleteOccurrence(){
    const item=state.occurrences.find(entry=>entry.id===$('#occurrence-id').value&&!entry.deleted);if(!item)return;if(!confirm(`Excluir o acontecimento “${item.title}”?`))return;
    item.deleted=true;item.updatedAt=stamp();saveLocal();$('#occurrence-dialog').close();renderOccurrences();renderPlanner();toast('Acontecimento excluído.');
  }
  function renderAnchors(){
    const areas=orderedAreas(),areaById=new Map(areas.map(area=>[area.id,area]));
    if(selectedAnchorArea&&!areaById.has(selectedAnchorArea))selectedAnchorArea='';
    $('#anchor-area-filter').innerHTML='<option value="">Todas as áreas</option>'+areas.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    $('#anchor-area-filter').value=selectedAnchorArea;
    const anchors=state.anchors.filter(anchor=>!anchor.deleted&&(!selectedAnchorArea||anchor.areaId===selectedAnchorArea)).sort((a,b)=>(areaById.get(a.areaId)?.order??999)-(areaById.get(b.areaId)?.order??999)||a.title.localeCompare(b.title,'pt-BR'));
    $('#anchor-list').innerHTML=anchors.length?anchors.map(anchor=>`<article class="anchor-card"><span class="anchor-icon">${escapeHTML(anchor.icon||'✦')}</span><div class="anchor-info"><strong>${escapeHTML(anchor.title)}</strong><small>${escapeHTML(areaById.get(anchor.areaId)?.name||'Área indisponível')} · ${anchor.weekdays?.length===7?'Todos os dias':(anchor.weekdays||[]).map(day=>WEEKDAYS[day]).join(', ')}${anchor.monthWeeks?.length?` · semanas ${escapeHTML(anchor.monthWeeks.join(', '))}`:''}${anchor.scheduledTime?` · ${escapeHTML(anchor.scheduledTime)} (${Number(anchor.durationMinutes)||45} min)`:''}${anchor.startDate?` · a partir de ${escapeHTML(fmtDate(anchor.startDate,{day:'numeric',month:'short',year:'numeric'}))}`:''}${anchor.endDate?` · até ${escapeHTML(fmtDate(anchor.endDate,{day:'numeric',month:'short',year:'numeric'}))}`:''}</small>${anchor.description?`<p>${escapeHTML(anchor.description)}</p>`:''}</div><button type="button" class="small-edit" data-edit-anchor="${escapeHTML(anchor.id)}">Editar</button></article>`).join(''):selectedAnchorArea?'<div class="empty-state"><h3>Nenhuma âncora nesta área</h3><p>Escolha outra área ou crie uma nova âncora.</p></div>':'<div class="empty-state"><h3>Suas âncoras começam aqui</h3><p>Crie uma âncora para organizar seu dia.</p></div>';
    $('#area-list').innerHTML=areas.map((area,index)=>`<article class="area-card"><span class="area-swatch" style="background:${escapeHTML(area.color)}"></span><strong>${escapeHTML(area.name)}</strong><small class="area-view-tag">${area.dailyView==='secondary'?'Visão secundária':'Visão principal'}</small><div class="area-card-actions"><button type="button" data-move-area="up" data-area-id="${escapeHTML(area.id)}" aria-label="Mover ${escapeHTML(area.name)} para cima" ${index===0?'disabled':''}>↑</button><button type="button" data-move-area="down" data-area-id="${escapeHTML(area.id)}" aria-label="Mover ${escapeHTML(area.name)} para baixo" ${index===areas.length-1?'disabled':''}>↓</button><button type="button" class="small-edit" data-edit-area="${escapeHTML(area.id)}">Editar</button></div></article>`).join('');
    $('#daily-view-groups').innerHTML=DAILY_VIEW_GROUPS.map(([key,label])=>`<div class="daily-view-group-row"><strong>${escapeHTML(label)}</strong><label class="daily-view-select"><span>Visão diária</span><select class="text-input" id="daily-view-${key}" data-daily-view-group="${key}"><option value="primary" ${dailyViewOfGroup(key)==='primary'?'selected':''}>Principal</option><option value="secondary" ${dailyViewOfGroup(key)==='secondary'?'selected':''}>Secundária</option></select></label><label class="daily-weekly-toggle"><input type="checkbox" data-daily-weekly-group="${key}" ${groupInWeekly(key)?'checked':''}><span class="settings-check" aria-hidden="true"></span><span class="settings-toggle-label">Visão semanal</span></label><label class="daily-weekly-toggle"><input type="checkbox" data-daily-timeline-group="${key}" ${groupInTimeline(key)?'checked':''}><span class="settings-check" aria-hidden="true"></span><span class="settings-toggle-label">Cronograma</span></label></div>`).join('');
  }
  function saveDailyViewGroups(event){event.preventDefault();for(const input of $$('#daily-view-groups [data-daily-view-group]')){const key=input.dataset.dailyViewGroup;state.dailyViews[key]={view:input.value==='primary'?'primary':'secondary',weekly:$(`[data-daily-weekly-group="${key}"]`).checked,timeline:$(`[data-daily-timeline-group="${key}"]`).checked};}state.dailyViewsUpdatedAt=stamp();saveLocal();renderPlanner();renderTimeline();renderAnchors();renderTaskWeekly();renderActions();toast('Configurações salvas.');}
  function render() { renderDay(); renderManage(); renderHistory(); renderTasks(); renderPlanner(); renderWeekly(); renderMonthly(); renderTaskWeekly(); renderSummary(); renderAnchors(); renderActions(); renderOccurrences(); if($('#routine-focus-dialog').open)renderFocusRoutine(); if($('#task-focus-dialog').open)renderTaskFocus(); }
  function setSection(section){
    currentSection=section;
    $$('.workspace-view').forEach(view=>view.classList.toggle('active-workspace',view.id===`${section}-workspace`));
    $$('.sidebar-link').forEach(link=>{const active=link.dataset.section===section;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    if(section==='actions')renderActions();
    if(section==='occurrences')renderOccurrences();
    if(section==='timeline')renderTimeline();
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
    $$('#routines-workspace .tab').forEach(t=>t.classList.toggle('active',t.dataset.view===view));
    $$('#routines-workspace .view').forEach(v=>v.classList.toggle('active-view',v.id===`${view}-view`));
    $('#routines-open-tasks').classList.toggle('hidden',view!=='day');
    if(view==='history')renderHistory(); if(view==='manage')renderManage();
  }
  function setTaskView(view){
    $$('.task-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.taskView===view));
    $$('.task-view').forEach(section=>section.classList.toggle('active-view',section.id===`task-${view}-view`));
    $('#task-day-navigator').classList.toggle('hidden',view==='week');
    $('#task-date-label').classList.toggle('hidden',view==='week');
    $('#task-open-planner').classList.toggle('hidden',view!=='day');
    if(view==='history'||view==='manage')renderTasks();
    if(view==='week')renderTaskWeekly();
  }
  function buildWeekdayOptions(selected=[0,1,2,3,4,5,6],target='#weekday-options') {
    $(target).innerHTML = WEEKDAYS.map((day,i)=>`<label class="weekday-option"><input type="checkbox" value="${i}" ${selected.includes(i)?'checked':''}><span>${day}</span></label>`).join('');
  }
  function buildMonthWeekOptions(selected=[]){
    $('#anchor-month-week-options').innerHTML=[1,2,3,4,5].map(week=>`<label class="weekday-option"><input type="checkbox" value="${week}" ${selected.includes(week)?'checked':''}><span>Semana ${week}</span></label>`).join('');
  }
  function updateAnchorRepeatMode(){
    $('#anchor-month-weeks-field').classList.toggle('hidden',$('#anchor-repeat-mode').value!=='month-weeks');
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
    $('#routine-name').value=r?.name||''; $('#routine-description').value=r?.description||''; $('#routine-notes').value=r?.notes||''; $('#routine-notes-field').classList.toggle('hidden',!r); $('#routine-icon').value=r?.icon||'✨'; $('#routine-color').value=r?.color||'#e8a59c';$('#routine-time').value=r?.scheduledTime||'';$('#routine-duration').value=r?.durationMinutes||'';
    $('#routine-start').value=r?.startDate||''; $('#routine-end').value=r?.endDate||'';
    buildWeekdayOptions(r?.weekdays||[0,1,2,3,4,5,6]);
    $('#routine-items-editor').innerHTML=''; (r?.items.filter(i=>i.active!==false)||['']).forEach(addItemEditor);
    $('#delete-routine').classList.toggle('hidden',!r);refreshColorPalettes(); $('#routine-dialog').showModal();
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
    const next={id,name,description:$('#routine-description').value.trim(),notes:existing?$('#routine-notes').value.trim():'',icon:$('#routine-icon').value.trim()||'✨',color:$('#routine-color').value,scheduledTime:$('#routine-time').value,durationMinutes:Number($('#routine-duration').value)||45,weekdays,startDate:$('#routine-start').value,endDate:$('#routine-end').value,items:items.map(item=>({...previousItems.get(item.id),...item})),updatedAt:stamp(),deleted:false};
    if(existing)state.routines=state.routines.map(x=>x.id===id?next:x);else state.routines.push(next);
    for(const [date,day] of Object.entries(state.history))if(date>=isoToday()&&!day.finalized)reconcileDay(date,day,state.routines);
    saveLocal(); $('#routine-dialog').close(); render(); toast('Rotina salva.');
  }
  function updateTaskItemOrderButtons(){
    const rows=$$('.item-editor-row',$('#task-items-editor'));
    rows.forEach((row,index)=>{row.querySelector('[data-task-move="up"]').disabled=index===0;row.querySelector('[data-task-move="down"]').disabled=index===rows.length-1;});
  }
  function addTaskItemEditor(item=''){
    const row=document.createElement('div');row.className='item-editor-row';
    row.dataset.itemId=typeof item==='string'?uid():item.id;
    const label=typeof item==='string'?item:item.label,description=typeof item==='string'?'':item.description||'';
    row.innerHTML=`<div class="item-editor-main"><div class="item-order-actions"><button type="button" data-task-move="up" aria-label="Mover passo para cima">↑</button><button type="button" data-task-move="down" aria-label="Mover passo para baixo">↓</button></div><input class="text-input item-name-input" maxlength="120" value="${escapeHTML(label)}" aria-label="Nome do passo" placeholder="Nome do passo"><button type="button" class="remove-item task-remove-item" aria-label="Remover passo">×</button></div><textarea class="text-input description-input item-description-input" maxlength="300" rows="2" aria-label="Descrição do passo" placeholder="Descrição do passo (opcional)">${escapeHTML(description)}</textarea>`;
    $('#task-items-editor').append(row);updateTaskItemOrderButtons();
  }
  function updateTaskFrequency(){
    const biweekly=$('#task-frequency').value==='biweekly';
    $('#task-start').required=biweekly;
    $('#task-biweekly-hint').classList.toggle('hidden',!biweekly);
    if(biweekly&&!$('#task-start').value)$('#task-start').value=selectedDate;
  }
  function updateTaskKind(){
    const hints={regular:'Pode ser concluída com ou sem passos.',block:'Aparece em um cartão separado e pode ser concluído com ou sem passos.',consultation:'Aparece nos dias agendados e desaparece quando o dia passa, sem exigir conclusão.'};
    $('#task-kind-hint').textContent=hints[$('#task-kind').value]||hints.regular;
  }
  function openTaskDialog(id=null){
    const task=state.tasks.find(item=>item.id===id&&!item.deleted);
    $('#task-form').reset();$('#task-id').value=task?.id||'';
    $('#task-dialog-title').textContent=task?'Editar tarefa':'Nova tarefa';
    $('#task-name').value=task?.name||'';$('#task-description').value=task?.description||'';$('#task-notes').value=task?.notes||'';$('#task-notes-field').classList.toggle('hidden',!task);
    $('#task-icon').value=task?.icon||'✓';$('#task-color').value=task?.color||'#87aaa2';
    $('#task-time').value=task?.scheduledTime||'';$('#task-duration').value=task?.durationMinutes||'';$('#task-frequency').value=task?.frequency||'weekly';$('#task-kind').value=task?.consultation===true?'consultation':task?.kind==='block'?'block':'regular';
    $('#task-start').value=task?.startDate||'';$('#task-end').value=task?.endDate||'';
    buildWeekdayOptions(task?.weekdays||[safeDate(selectedDate).getDay()],'#task-weekday-options');
    $('#task-items-editor').innerHTML='';(task?.items||[]).filter(item=>item.active!==false).forEach(addTaskItemEditor);
    updateTaskFrequency();updateTaskKind();$('#task-delete').classList.toggle('hidden',!task);refreshColorPalettes();$('#task-dialog').showModal();
  }
  function saveTask(event){
    event.preventDefault();
    const id=$('#task-id').value||uid(),existing=state.tasks.find(task=>task.id===id),name=$('#task-name').value.trim();
    const frequency=$('#task-frequency').value,weekdays=$$('#task-weekday-options input:checked').map(input=>Number(input.value));
    const items=$$('.item-editor-row',$('#task-items-editor')).map(row=>({id:row.dataset.itemId,label:$('.item-name-input',row).value.trim(),description:$('.item-description-input',row).value.trim(),active:true})).filter(item=>item.label);
    if(!name){toast('Dê um nome para a tarefa.');return;}
    if(!weekdays.length){toast('Escolha ao menos um dia da semana.');return;}
    if(frequency==='biweekly'&&!$('#task-start').value){toast('Escolha a data inicial da tarefa quinzenal.');return;}
    if($('#task-end').value&&$('#task-start').value&&$('#task-end').value<$('#task-start').value){toast('A data final precisa ser igual ou posterior à inicial.');return;}
    const oldItems=new Map((existing?.items||[]).map(item=>[item.id,item]));
    const kind=$('#task-kind').value;
    const next={id,name,description:$('#task-description').value.trim(),notes:existing?$('#task-notes').value.trim():'',icon:$('#task-icon').value.trim()||'✓',color:$('#task-color').value,scheduledTime:$('#task-time').value,durationMinutes:Number($('#task-duration').value)||45,kind:kind==='block'?'block':'regular',consultation:kind==='consultation',frequency,weekdays,startDate:$('#task-start').value,endDate:$('#task-end').value,items:items.map(item=>({...oldItems.get(item.id),...item})),updatedAt:stamp(),deleted:false};
    if(existing)state.tasks=state.tasks.map(task=>task.id===id?next:task);else state.tasks.push(next);
    for(const [date,day] of Object.entries(state.taskHistory))if(date>=isoToday())reconcileTaskDay(date,day,state.tasks);
    saveLocal();$('#task-dialog').close();render();toast('Tarefa salva.');
  }
  function deleteTask(){
    const task=state.tasks.find(item=>item.id===$('#task-id').value);if(!task)return;
    if(!confirm(`Excluir “${task.name}”? Os registros anteriores permanecem no histórico.`))return;
    task.deleted=true;task.updatedAt=stamp();
    for(const [date,day] of Object.entries(state.taskHistory))if(date>=isoToday())reconcileTaskDay(date,day,state.tasks);
    saveLocal();$('#task-dialog').close();render();toast('Tarefa excluída.');
  }
  function openAnchorDialog(id=null){
    const anchor=state.anchors.find(item=>item.id===id&&!item.deleted),areas=orderedAreas();
    if(!areas.length){toast('Crie uma área antes de adicionar âncoras.');return;}
    $('#anchor-form').reset();$('#anchor-id').value=anchor?.id||'';
    $('#anchor-dialog-title').textContent=anchor?'Editar âncora':'Nova âncora';
    $('#anchor-title').value=anchor?.title||'';$('#anchor-icon').value=anchor?.icon||'✨';
    $('#anchor-description').value=anchor?.description||'';$('#anchor-time').value=anchor?.scheduledTime||'';$('#anchor-duration').value=anchor?.durationMinutes??'';$('#anchor-notes').value=anchor?.notes||'';$('#anchor-notes-field').classList.toggle('hidden',!anchor);
    $('#anchor-area').innerHTML=areas.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    $('#anchor-area').value=anchor?.areaId||areas[0].id;
    $('#anchor-start').value=anchor?.startDate||'';$('#anchor-end').value=anchor?.endDate||'';
    $('#anchor-repeat-mode').value=anchor?.monthWeeks?.length?'month-weeks':'every-week';
    buildMonthWeekOptions(anchor?.monthWeeks||[]);updateAnchorRepeatMode();
    buildWeekdayOptions(anchor?.weekdays||[0,1,2,3,4,5,6],'#anchor-weekday-options');
    $('#delete-anchor').classList.toggle('hidden',!anchor);$('#anchor-dialog').showModal();
  }
  function saveAnchor(event){
    event.preventDefault();
    const id=$('#anchor-id').value||uid(),existing=state.anchors.find(anchor=>anchor.id===id);
    const title=$('#anchor-title').value.trim(),weekdays=$$('#anchor-weekday-options input:checked').map(input=>Number(input.value));
    const monthWeeks=$('#anchor-repeat-mode').value==='month-weeks'?$$('#anchor-month-week-options input:checked').map(input=>Number(input.value)):[];
    if(!title){toast('Dê um nome à âncora.');return;}
    if(!weekdays.length){toast('Escolha ao menos um dia da semana.');return;}
    if($('#anchor-repeat-mode').value==='month-weeks'&&!monthWeeks.length){toast('Escolha ao menos uma semana do mês.');return;}
    if(!orderedAreas().some(area=>area.id===$('#anchor-area').value)){toast('Escolha uma área disponível.');return;}
    if($('#anchor-end').value&&$('#anchor-start').value&&$('#anchor-end').value<$('#anchor-start').value){toast('A data final precisa ser igual ou posterior à inicial.');return;}
    const next={id,title,icon:$('#anchor-icon').value.trim()||'✦',description:$('#anchor-description').value.trim(),notes:existing?$('#anchor-notes').value.trim():'',scheduledTime:$('#anchor-time').value,durationMinutes:$('#anchor-duration').value?Number($('#anchor-duration').value):null,areaId:$('#anchor-area').value,weekdays,monthWeeks,startDate:$('#anchor-start').value,endDate:$('#anchor-end').value,updatedAt:stamp(),deleted:false};
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
    $('#area-name').value=area?.name||'';$('#area-color').value=area?.color||'#e8e5dd';$('#area-daily-view').value=area?.dailyView==='secondary'?'secondary':'primary';$('#area-weekly-view').checked=area?.weeklyView!==false;
    $('#delete-area').classList.toggle('hidden',!area);refreshColorPalettes();$('#area-dialog').showModal();
  }
  function saveArea(event){
    event.preventDefault();const id=$('#area-id').value||uid(),name=$('#area-name').value.trim();
    if(!name){toast('Dê um nome à área.');return;}
    const existing=state.areas.find(area=>area.id===id);
    const next={id,name,color:$('#area-color').value,dailyView:$('#area-daily-view').value==='secondary'?'secondary':'primary',weeklyView:$('#area-weekly-view').checked,order:existing?.order??state.areas.length,updatedAt:stamp(),deleted:false};
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
    saveLocal();renderAnchors();renderPlanner();renderWeekly();
  }
  function deleteRoutine() {
    const id=$('#routine-id').value;if(!id)return;
    const r=state.routines.find(x=>x.id===id); if(!r)return;
    if(!confirm(`Excluir “${r.name}”? Os registros antigos continuam no histórico.`))return;
    r.deleted=true;r.updatedAt=stamp();
    for(const [date,day] of Object.entries(state.history))if(date>=isoToday()&&!day.finalized)reconcileDay(date,day,state.routines);
    saveLocal();$('#routine-dialog').close();render();toast('Rotina excluída.');
  }
  function removeRoutineFromDay(routineId) {
    const day=ensureDay(selectedDate),routine=day.routines[routineId];if(!routine)return;
    if(!confirm(`Remover “${routine.name}” de ${fmtDate(selectedDate)}? O registro e seus passos serão excluídos somente deste dia. A programação da rotina continua igual.`))return;
    day.excludedRoutines={...day.excludedRoutines,[routineId]:stamp()};
    delete day.routines[routineId];day.updatedAt=stamp();
    if(activeRoutineId===routineId){activeRoutineId=null;$('#routine-focus-dialog').close();}
    saveLocal();render();toast('Rotina removida apenas deste dia.');
  }
  function removeTaskFromDay(taskId){
    const day=ensureTaskDay(selectedDate),task=day.tasks[taskId];if(!task)return;
    if(!confirm(`Remover “${task.name}” de ${fmtDate(selectedDate)}? O registro e seus passos serão excluídos somente deste dia. A programação da tarefa continua igual.`))return;
    day.excludedTasks={...day.excludedTasks,[taskId]:stamp()};
    delete day.tasks[taskId];day.updatedAt=stamp();
    if(activeTaskId===taskId&&activeTaskDate===selectedDate)$('#task-focus-dialog').close();
    saveLocal();render();toast('Tarefa removida apenas deste dia.');
  }
  function finishRoutineDay() {
    const day=ensureDay(selectedDate);if(day.finalized)return;
    if(!confirm('Concluir as rotinas deste dia? Os passos ainda abertos serão registrados como não realizados.'))return;
    const now=stamp();
    for(const r of Object.values(day.routines))for(const i of r.items)if(!i.done){i.done=false;i.changedAt=now;}
    day.finalized=true;day.updatedAt=now;
    saveLocal();render();toast('Rotinas registradas no histórico.');
  }
  function finishTaskDay(){
    const day=ensureTaskDay(selectedDate);if(day.finalized)return;
    if(!confirm('Concluir as tarefas e blocos deste dia? Os itens ainda abertos serão registrados como não realizados.'))return;
    const now=stamp();markOpenTasksNotDone(day,now);
    day.finalized=true;day.updatedAt=now;
    saveLocal();render();toast('Tarefas e blocos registrados no histórico.');
  }
  function setSelectedDate(date) {
    if(!date)return; selectedDate=date;ensureDay(date);ensureTaskDay(date);saveLocal();renderDay();renderTasks();renderPlanner();renderWeekly();renderTaskWeekly();renderSummary();
  }
  function shiftSelectedDate(amount){
    const date=safeDate(selectedDate);date.setDate(date.getDate()+amount);
    setSelectedDate(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
  }
  function shiftWeek(amount){
    const date=safeDate(selectedWeekDate);date.setDate(date.getDate()+amount*7);
    selectedWeekDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    renderWeekly();
  }
  function shiftTaskWeek(amount){
    const date=safeDate(selectedTaskWeekDate);date.setDate(date.getDate()+amount*7);
    selectedTaskWeekDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    renderTaskWeekly();
  }
  function csvCell(value) { return `"${String(value??'').replace(/"/g,'""')}"`; }
  function exportCSV() {
    const rows=[['Data','Rotina','Ícone','Passo','Status','Dia concluído','Descrição da rotina','Descrição do passo','Horário agendado','Duração (minutos)','Anotações do dia']];
    for(const date of new Set([...Object.keys(state.history),...Object.keys(state.dayNotes||{})].sort())) {
      const day=state.history[date]||{},note=state.dayNotes?.[date]?.text||'';
      const previous=rows.length;
      for(const routine of Object.values(day.routines||{}))for(const item of routine.items||[]) rows.push([date,routine.name,routine.icon,item.label,item.done?'Realizado':'Não realizado',day.finalized?'Sim':'Não',routine.description||'',item.description||'',routine.scheduledTime||'',routine.durationMinutes||45,note]);
      if(previous===rows.length&&note)rows.push([date,'','','','','','','','','',note]);
    }
    if(rows.length===1){toast('Ainda não há registros para exportar.');return;}
    const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`ancora-historico-${isoToday()}.csv`;a.click();URL.revokeObjectURL(url);toast('Histórico exportado em CSV.');
  }
  function exportTaskCSV(){
    const rows=[['Data','Frequência','Tipo','Tarefa','Ícone','Tarefa concluída','Resultado do bloco','Passo','Passo realizado','Descrição da tarefa','Descrição do passo','Horário sugerido','Duração (minutos)']];
    for(const date of Object.keys(state.taskHistory).sort())for(const task of Object.values(state.taskHistory[date].tasks||{})){
      const consultation=taskIsConsultation(task);
      const base=[date,task.frequency==='biweekly'?'Quinzenal':'Semanal',consultation?'Consulta':task.kind==='block'?'Bloco':'Regular',task.name,task.icon,consultation&&!task.done?'Não se aplica':task.done?'Sim':'Não',task.kind==='block'?blockStatusLabel(blockStatusOf(task)):''];
      if(!task.items?.length)rows.push([...base,'','',task.description||'','',task.scheduledTime||'',task.durationMinutes||45]);
      else for(const item of task.items)rows.push([...base,item.label,consultation&&!item.done?'Não se aplica':item.done?'Sim':'Não',task.description||'',item.description||'',task.scheduledTime||'',task.durationMinutes||45]);
    }
    if(rows.length===1){toast('Ainda não há tarefas no histórico.');return;}
    const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
    link.href=url;link.download=`ancora-tarefas-${isoToday()}.csv`;link.click();URL.revokeObjectURL(url);toast('Histórico de tarefas exportado em CSV.');
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
    const areas=mergeRecords(a.areas,b.areas),anchors=mergeRecords(a.anchors,b.anchors),tasks=mergeRecords(a.tasks,b.tasks),actions=mergeRecords(a.actions,b.actions),occurrences=mergeRecords(a.occurrences,b.occurrences),actionAreas=mergeRecords(a.actionAreas,b.actionAreas);
    const leftActions=new Map(a.actions.map(action=>[action.id,action])),rightActions=new Map(b.actions.map(action=>[action.id,action]));
    for(const action of actions){
      const left=leftActions.get(action.id),right=rightActions.get(action.id);
      if(!left||!right)continue;
      const leftCompletion=Date.parse(left.completionChangedAt||0)||0,rightCompletion=Date.parse(right.completionChangedAt||0)||0;
      const completion=rightCompletion>=leftCompletion?right:left;
      action.completed=completion.completed===true;
      action.completedAt=action.completed?completion.completedAt||completion.completionChangedAt||'':'';
      action.completionChangedAt=completion.completionChangedAt||'';
      action.createdAt=[left.createdAt,right.createdAt].filter(Boolean).sort()[0]||action.createdAt;
    }
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
      history[date]={routines:routinesForDay,excludedRoutines,finalized,updatedAt:new Date(maxStamp||Date.now()).toISOString()};
      if(!finalized&&date>=isoToday())reconcileDay(date,history[date],[...routines.values()]);
    }
    const taskHistory={};
    for(const date of new Set([...Object.keys(a.taskHistory||{}),...Object.keys(b.taskHistory||{})])){
      const x=a.taskHistory?.[date]||{},y=b.taskHistory?.[date]||{},tasksForDay={};
      const excludedTasks={};
      for(const id of new Set([...Object.keys(x.excludedTasks||{}),...Object.keys(y.excludedTasks||{})])){
        const left=x.excludedTasks?.[id]||'',right=y.excludedTasks?.[id]||'';
        excludedTasks[id]=left>right?left:right;
      }
      for(const id of new Set([...Object.keys(x.tasks||{}),...Object.keys(y.tasks||{})])){
        if(excludedTasks[id])continue;
        const p=x.tasks?.[id],q=y.tasks?.[id];
        if(!p||!q){tasksForDay[id]=structuredClone(p||q);continue;}
        const base=(Date.parse(y.updatedAt||'')||0)>=(Date.parse(x.updatedAt||'')||0)?q:p;
        const completionChoice=[p,q].sort((left,right)=>{
          const touchedLeft=left.doneTouched===true||left.done===true,touchedRight=right.doneTouched===true||right.done===true;
          if(touchedLeft!==touchedRight)return touchedLeft?1:-1;
          return (Date.parse(left.doneChangedAt||'')||0)-(Date.parse(right.doneChangedAt||'')||0);
        })[1];
        const itemMap=new Map();
        for(const item of [...(p.items||[]),...(q.items||[])]){
          const old=itemMap.get(item.id),changed=item.touched===true||item.done===true,oldChanged=old&&(old.touched===true||old.done===true);
          const time=Date.parse(item.changedAt||'')||0,oldTime=Date.parse(old?.changedAt||'')||0;
          if(!old||(changed&&!oldChanged)||(changed===oldChanged&&(time>oldTime||(time===oldTime&&item.done&&!old.done))))itemMap.set(item.id,{...structuredClone(item),touched:changed});
        }
        tasksForDay[id]={...structuredClone(base),items:[...itemMap.values()],done:Boolean(completionChoice.done),doneTouched:completionChoice.doneTouched===true||completionChoice.done===true,doneChangedAt:completionChoice.doneChangedAt||'',blockStatus:completionChoice.blockStatus||''};
      }
      const updatedAt=new Date(Math.max(Date.parse(x.updatedAt||0)||0,Date.parse(y.updatedAt||0)||0)||Date.now()).toISOString();
      const finalized=Boolean(x.finalized||y.finalized);
      taskHistory[date]={tasks:tasksForDay,excludedTasks,finalized,updatedAt};
      if(finalized)markOpenTasksNotDone(taskHistory[date],updatedAt);
      if(!finalized&&date>=isoToday())reconcileTaskDay(date,taskHistory[date],tasks);
    }
    const dayNotes={};
    for(const date of new Set([...Object.keys(a.dayNotes||{}),...Object.keys(b.dayNotes||{})])){
      const left=a.dayNotes?.[date],right=b.dayNotes?.[date];
      dayNotes[date]=structuredClone(!left?right:!right?left:(right.updatedAt||'')>=(left.updatedAt||'')?right:left);
    }
    const leftEntries=a.globalEntries,rightEntries=b.globalEntries;
    const globalEntries=structuredClone(!leftEntries?rightEntries:!rightEntries?leftEntries:(rightEntries.updatedAt||'')>=(leftEntries.updatedAt||'')?rightEntries:leftEntries);
    const leftDailyViewsAt=a.dailyViewsUpdatedAt||'',rightDailyViewsAt=b.dailyViewsUpdatedAt||'';
    const useRightDailyViews=rightDailyViewsAt?rightDailyViewsAt>=leftDailyViewsAt:!leftDailyViewsAt&&Boolean(b.dailyViews);
    const dailyViews=structuredClone((useRightDailyViews?b.dailyViews:a.dailyViews)||b.dailyViews||a.dailyViews||Object.fromEntries(DAILY_VIEW_GROUPS.map(([key,,view,,weekly])=>[key,{view,weekly}])));
    const dailyViewsUpdatedAt=useRightDailyViews?rightDailyViewsAt:leftDailyViewsAt;
    return {version:7,dailyViews,dailyViewsUpdatedAt,routines:[...routines.values()],tasks,actions,occurrences,actionAreas,areas,anchors,history,taskHistory,dayNotes,globalEntries};
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
  // As ações têm uma cópia em outro registro: clientes antigos ainda abertos
  // podem regravar o registro principal sem conhecer o campo "actions".
  function actionRecordId(){return `${window.ANCORA_SUPABASE.recordId}-acoes`;}
  async function readActionBackup(){
    const c=window.ANCORA_SUPABASE;
    const {data,error}=await supabaseClient.from(c.table).select('data,updated_at').eq('user_id',session.user.id).eq('id',actionRecordId()).maybeSingle();
    if(error)throw error;return data;
  }
  function actionBackupData(){return {actions:state.actions,actionAreas:state.actionAreas};}
  async function syncActionBackup(initialBackup){
    let backup=initialBackup;
    for(let attempt=0;attempt<7;attempt++){
      state=mergeState(state,backup?.data||{});
      const data=actionBackupData();
      if(backup&&JSON.stringify(data)===JSON.stringify(backup.data))return;
      const updatedAt=new Date(Math.max(Date.now(),(Date.parse(backup?.updated_at||'')||0)+1)).toISOString();
      const c=window.ANCORA_SUPABASE;
      const query=supabaseClient.from(c.table);
      const result=backup
        ?await query.update({data,updated_at:updatedAt}).eq('user_id',session.user.id).eq('id',actionRecordId()).eq('updated_at',backup.updated_at).select('updated_at').maybeSingle()
        :await query.insert({user_id:session.user.id,id:actionRecordId(),data,updated_at:updatedAt}).select('updated_at').maybeSingle();
      if(result.error?.code==='23505'){backup=await readActionBackup();continue;}
      if(result.error)throw result.error;
      if(result.data)return;
      backup=await readActionBackup();
    }
    throw new Error('As ações mudaram em outro aparelho. Tente sincronizar novamente.');
  }
  async function pushSync(successMessage='Sincronizado com a nuvem') {
    if(!configureSupabase()||!session?.user)return false;
    if(saving){saveAgain=true;return false;} saving=true;setSyncStatus('syncing','Sincronizando…');
    try {
      do {
        saveAgain=false;let committed=false;
        for(let attempt=0;attempt<7&&!committed;attempt++) {
          const revisionAtStart=localRevision;
          const [remote,actionBackup]=await Promise.all([readRemote(),readActionBackup()]),remoteJson=JSON.stringify(remote?.data||{});
          state=mergeState(mergeState(state,remote?.data||{}),actionBackup?.data||{});
          await syncActionBackup(actionBackup);
          localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
          if(remote&&JSON.stringify(state)===remoteJson){
            committed=true;
            if(localRevision!==revisionAtStart)saveAgain=true;
            break;
          }
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
      const [remote,actionBackup]=await Promise.all([readRemote(),readActionBackup()]);
      if(!remote&&!actionBackup){setSyncStatus('online','Ainda não há dados na nuvem para baixar.');return true;}
      state=mergeState(mergeState(state,remote?.data||{}),actionBackup?.data||{});
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      if(JSON.stringify(state)!==JSON.stringify(remote?.data||{})||JSON.stringify(actionBackupData())!==JSON.stringify(actionBackup?.data||{})){
        localStorage.setItem(PENDING_KEY,session.user.id);
        scheduleSync();
      }
      localStorage.setItem(LAST_SYNC_KEY,stamp());render();
      setSyncStatus('online','Dados da nuvem baixados e mesclados.');return true;
    } catch(error){console.error('Falha ao baixar dados:',error);setSyncStatus('error',`Não foi possível baixar: ${error.message||'verifique sua conexão'}`);return false;}
  }
  function scheduleSync() { if(!session?.user)return;clearTimeout(syncTimer);syncTimer=setTimeout(pushSync,900); }
  function refreshFromCloud(){
    if(!session?.user||saving||document.hidden||Date.now()-lastAutoSyncAt<2000)return;
    lastAutoSyncAt=Date.now();
    pushSync();
  }
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
  $('.brand').onclick=event=>{event.preventDefault();setSection('timeline');};
  $$('#routines-workspace .tab').forEach(tab=>tab.addEventListener('click',()=>setView(tab.dataset.view)));
  $$('.planner-daily-tab').forEach(tab=>tab.addEventListener('click',()=>{
    const view=tab.dataset.plannerView;
    $$('.planner-daily-tab').forEach(button=>button.classList.toggle('active',button===tab));
    $$('.planner-daily-panel').forEach(panel=>panel.classList.toggle('active-panel',panel.id===`planner-${view}-panel`));
    if(view==='entries')renderEntries();
  }));
  $$('.task-tab').forEach(tab=>tab.addEventListener('click',()=>setTaskView(tab.dataset.taskView)));
  $('#prev-day').onclick=$('#planner-prev-day').onclick=$('#timeline-prev-day').onclick=$('#planner-secondary-prev-day').onclick=$('#task-prev-day').onclick=()=>shiftSelectedDate(-1);
  $('#next-day').onclick=$('#planner-next-day').onclick=$('#timeline-next-day').onclick=$('#planner-secondary-next-day').onclick=$('#task-next-day').onclick=()=>shiftSelectedDate(1);
  $('#today-button').onclick=()=>setSelectedDate(isoToday());$('#selected-date').onchange=e=>setSelectedDate(e.target.value);
  $('#planner-today').onclick=()=>setSelectedDate(isoToday());$('#planner-date').onchange=e=>setSelectedDate(e.target.value);
  $('#timeline-today').onclick=()=>setSelectedDate(isoToday());$('#timeline-date').onchange=e=>setSelectedDate(e.target.value);
  $('#planner-secondary-today').onclick=()=>setSelectedDate(isoToday());$('#planner-secondary-date').onchange=e=>setSelectedDate(e.target.value);
  $('#routines-open-tasks').onclick=()=>{setSection('tasks');setTaskView('day');window.scrollTo({top:0,behavior:'smooth'});};
  $('#task-open-planner').onclick=()=>{setSection('routines');setView('day');window.scrollTo({top:0,behavior:'smooth'});};
  $('#planner-notes-input').addEventListener('input',event=>{
    state.dayNotes[selectedDate]={text:event.target.value,updatedAt:stamp()};
    saveLocal();
  });
  $('#planner-entries-input').addEventListener('input',event=>{
    state.globalEntries={text:event.target.value,updatedAt:stamp()};
    saveLocal();
  });
  $('#task-today').onclick=()=>setSelectedDate(isoToday());$('#task-date').onchange=e=>setSelectedDate(e.target.value);
  const shiftSummaryMonth=amount=>{const [year,month]=selectedSummaryMonth.split('-').map(Number);const date=new Date(year,month-1+amount,1);selectedSummaryMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;renderSummary();};
  $('#summary-prev-month').onclick=()=>shiftSummaryMonth(-1);$('#summary-next-month').onclick=()=>shiftSummaryMonth(1);
  $('#summary-today').onclick=()=>{selectedSummaryMonth=isoToday().slice(0,7);renderSummary();};
  $('#summary-date').onchange=event=>{if(event.target.value){selectedSummaryMonth=event.target.value;renderSummary();}};
  $('#summary-content').addEventListener('click',event=>{const button=event.target.closest('[data-summary-date][data-summary-section]');if(!button)return;setSelectedDate(button.dataset.summaryDate);setSection(button.dataset.summarySection==='tasks'?'tasks':'routines');if(button.dataset.summarySection==='tasks')setTaskView('day');else setView('day');});
  $('#weekly-prev').onclick=()=>shiftWeek(-1);$('#weekly-next').onclick=()=>shiftWeek(1);
  $('#weekly-today').onclick=()=>{selectedWeekDate=isoToday();renderWeekly();};
  $('#weekly-date').onchange=e=>{if(e.target.value){selectedWeekDate=e.target.value;renderWeekly();}};
  const shiftMonthlyMonth=amount=>{const [year,month]=selectedMonthlyMonth.split('-').map(Number),date=new Date(year,month-1+amount,1);selectedMonthlyMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;renderMonthly();};
  $('#monthly-prev').onclick=()=>shiftMonthlyMonth(-1);$('#monthly-next').onclick=()=>shiftMonthlyMonth(1);
  $('#monthly-today').onclick=()=>{selectedMonthlyMonth=isoToday().slice(0,7);renderMonthly();};
  $('#monthly-date').onchange=event=>{if(event.target.value){selectedMonthlyMonth=event.target.value;renderMonthly();}};
  $('#task-week-prev').onclick=()=>shiftTaskWeek(-1);$('#task-week-next').onclick=()=>shiftTaskWeek(1);
  $('#task-week-today').onclick=()=>{selectedTaskWeekDate=isoToday();renderTaskWeekly();};
  $('#task-week-date').onchange=e=>{if(e.target.value){selectedTaskWeekDate=e.target.value;renderTaskWeekly();}};
  const shiftActionWeek=amount=>{const date=safeDate(selectedActionWeekDate);date.setDate(date.getDate()+amount*7);selectedActionWeekDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;renderActions();};
  $('#action-week-prev').onclick=()=>shiftActionWeek(-1);$('#action-week-next').onclick=()=>shiftActionWeek(1);
  $('#action-week-today').onclick=()=>{selectedActionWeekDate=isoToday();renderActions();};
  $('#action-week-date').onchange=e=>{if(e.target.value){selectedActionWeekDate=e.target.value;renderActions();}};
  $$('.action-tab').forEach(button=>button.onclick=()=>{actionView=button.dataset.actionView;renderActions();});
  $('#action-list-filters').addEventListener('input',renderActions);
  $('#action-list-filters').addEventListener('change',renderActions);
  $('#action-clear-filters').onclick=()=>{
    $$('#action-list-filters input').forEach(input=>input.value='');
    $$('#action-list-filters select').forEach(select=>select.selectedIndex=0);
    renderActions();
  };
  const shiftActionPeriod=amount=>{const [year,month]=selectedActionMonth.split('-').map(Number),next=new Date(year,month-1+(actionView==='annual'?amount*12:amount),1);selectedActionMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;renderActions();};
  $('#action-prev-month').onclick=()=>shiftActionPeriod(-1);$('#action-next-month').onclick=()=>shiftActionPeriod(1);
  $('#action-current-month').onclick=()=>{selectedActionMonth=isoToday().slice(0,7);renderActions();};
  $('#action-month').onchange=event=>{if(event.target.value){selectedActionMonth=event.target.value;renderActions();}};
  $('#add-action').onclick=()=>openActionDialog();
  $('#add-action-area').onclick=()=>openActionAreaDialog();
  $('#action-area-form').addEventListener('submit',saveActionArea);$('#delete-action-area').onclick=deleteActionArea;
  $('#action-area-list').addEventListener('click',event=>{const edit=event.target.closest('[data-edit-action-area]');if(edit)openActionAreaDialog(edit.dataset.editActionArea);});
  $('#action-schedule').onchange=updateActionSchedule;
  $('#action-scheduled-date').onchange=updateActionSchedule;
  $('#action-form').addEventListener('submit',saveAction);$('#delete-action').onclick=deleteAction;
  $$('.occurrence-tab').forEach(button=>button.onclick=()=>{occurrenceView=button.dataset.occurrenceView;renderOccurrences();});
  $('#occurrence-list-filters').addEventListener('input',renderOccurrences);$('#occurrence-list-filters').addEventListener('change',renderOccurrences);
  $('#occurrence-clear-filters').onclick=()=>{$$('#occurrence-list-filters input').forEach(input=>input.value='');$$('#occurrence-list-filters select').forEach(select=>select.selectedIndex=0);renderOccurrences();};
  const shiftOccurrencePeriod=amount=>{const [year,month]=selectedOccurrenceMonth.split('-').map(Number),next=new Date(year,month-1+(occurrenceView==='annual'?amount*12:amount),1);selectedOccurrenceMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;renderOccurrences();};
  $('#occurrence-prev-month').onclick=()=>shiftOccurrencePeriod(-1);$('#occurrence-next-month').onclick=()=>shiftOccurrencePeriod(1);$('#occurrence-current-month').onclick=()=>{selectedOccurrenceMonth=isoToday().slice(0,7);renderOccurrences();};
  $('#occurrence-month').onchange=event=>{if(event.target.value){selectedOccurrenceMonth=event.target.value;renderOccurrences();}};
  $('#add-occurrence').onclick=()=>openOccurrenceDialog();$('#occurrence-form').addEventListener('submit',saveOccurrence);$('#delete-occurrence').onclick=deleteOccurrence;
  $('#occurrence-type').onchange=updateOccurrenceForm;$('#occurrence-schedule').onchange=updateOccurrenceForm;$('#occurrence-repeat-mode').onchange=updateOccurrenceForm;
  $('#occurrences-content').addEventListener('click',event=>{const edit=event.target.closest('[data-edit-occurrence]');if(edit){openOccurrenceDialog(edit.dataset.editOccurrence);return;}const month=event.target.closest('[data-add-occurrence-month]');if(month){openOccurrenceDialog();$('#occurrence-schedule').value='month';$('#occurrence-scheduled-month').value=month.dataset.addOccurrenceMonth;updateOccurrenceForm();return;}const date=event.target.closest('[data-add-occurrence-date]');if(date){openOccurrenceDialog();$('#occurrence-schedule').value='date';$('#occurrence-scheduled-date').value=date.dataset.addOccurrenceDate;updateOccurrenceForm();}});
  const actionsContent=$('#actions-content');
  let draggedActionId='',draggedWeeklyActionId='',draggedMonthlyActionId='',actionDropTarget=null,touchActionDrag=null,ignoreActionClickUntil=0;
  const setActionDropTarget=column=>{
    if(actionDropTarget===column)return;
    actionDropTarget?.classList.remove('is-drop-target');
    actionDropTarget=column;
    actionDropTarget?.classList.add('is-drop-target');
  };
  actionsContent.addEventListener('dragstart',event=>{
    const card=event.target.closest('[data-drag-action]');
    if(actionView==='monthly'){
      const monthlyCard=event.target.closest('[data-drag-action-monthly]');if(!monthlyCard)return;
      draggedMonthlyActionId=monthlyCard.dataset.dragActionMonthly;monthlyCard.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggedMonthlyActionId);return;
    }
    if(actionView==='week'){
      const weeklyCard=event.target.closest('[data-drag-action-week]');if(!weeklyCard)return;
      draggedWeeklyActionId=weeklyCard.dataset.dragActionWeek;weeklyCard.classList.add('is-dragging');
      event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggedWeeklyActionId);return;
    }
    if(actionView!=='annual'||!card)return;
    draggedActionId=card.dataset.dragAction;
    card.classList.add('is-dragging');
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',draggedActionId);
  });
  actionsContent.addEventListener('dragover',event=>{
    if(actionView==='monthly'&&draggedMonthlyActionId){const target=event.target.closest('[data-action-month-week]');if(target){event.preventDefault();target.classList.add('is-drop-target');}return;}
    if(actionView==='week'&&draggedWeeklyActionId){const target=event.target.closest('[data-action-week-date]');if(target){event.preventDefault();target.classList.add('is-drop-target');}return;}
    if(!draggedActionId)return;
    const board=$('.action-month-board'),rect=board?.getBoundingClientRect();
    if(rect&&event.clientX>rect.right-34)board.scrollLeft+=18;
    else if(rect&&event.clientX<rect.left+34)board.scrollLeft-=18;
    const column=event.target.closest('[data-action-month]');
    setActionDropTarget(column);
    if(column){event.preventDefault();event.dataTransfer.dropEffect='move';}
  });
  actionsContent.addEventListener('drop',event=>{
    if(actionView==='monthly'&&draggedMonthlyActionId){const target=event.target.closest('[data-action-month-week]'),id=draggedMonthlyActionId;$$('[data-action-month-week]',actionsContent).forEach(cell=>cell.classList.remove('is-drop-target'));draggedMonthlyActionId='';if(target){event.preventDefault();moveActionToMonthlyWeek(id,target.dataset.actionMonthWeek);}return;}
    if(actionView==='week'&&draggedWeeklyActionId){const target=event.target.closest('[data-action-week-date]'),id=draggedWeeklyActionId;$$('[data-action-week-date]',actionsContent).forEach(cell=>cell.classList.remove('is-drop-target'));draggedWeeklyActionId='';if(target){event.preventDefault();moveActionToWeekDate(id,target.dataset.actionWeekDate);}return;}
    const column=event.target.closest('[data-action-month]'),id=draggedActionId;
    if(column&&id){event.preventDefault();setActionDropTarget(null);draggedActionId='';moveActionToMonth(id,column.dataset.actionMonth);}
  });
  actionsContent.addEventListener('dragend',()=>{
    actionsContent.querySelector('.action-monthly-table .weekly-action.is-dragging')?.classList.remove('is-dragging');$$('[data-action-month-week]',actionsContent).forEach(cell=>cell.classList.remove('is-drop-target'));draggedMonthlyActionId='';
    actionsContent.querySelector('.weekly-action.is-dragging')?.classList.remove('is-dragging');$$('[data-action-week-date]',actionsContent).forEach(cell=>cell.classList.remove('is-drop-target'));draggedWeeklyActionId='';
    actionsContent.querySelector('.action-card.is-dragging')?.classList.remove('is-dragging');
    setActionDropTarget(null);draggedActionId='';
  });
  const finishTouchActionDrag=()=>{
    if(!touchActionDrag)return;
    clearTimeout(touchActionDrag.timer);
    touchActionDrag.preview?.remove();
    touchActionDrag.source.classList.remove('is-dragging');
    $$('[data-action-week-date]',actionsContent).forEach(cell=>cell.classList.remove('is-drop-target'));
    $$('[data-action-month-week]',actionsContent).forEach(cell=>cell.classList.remove('is-drop-target'));
    touchActionDrag=null;setActionDropTarget(null);
  };
  actionsContent.addEventListener('touchstart',event=>{
    if(!['annual','week','monthly'].includes(actionView)||event.touches.length!==1)return;
    const weekly=actionView==='week',monthly=actionView==='monthly',card=event.target.closest(monthly?'[data-drag-action-monthly]':weekly?'[data-drag-action-week]':'[data-drag-action]');if(!card)return;
    const touch=event.touches[0];
    touchActionDrag={id:monthly?card.dataset.dragActionMonthly:weekly?card.dataset.dragActionWeek:card.dataset.dragAction,weekly,monthly,touchId:touch.identifier,startX:touch.clientX,startY:touch.clientY,x:touch.clientX,y:touch.clientY,source:card,preview:null,active:false,timer:null};
    touchActionDrag.timer=setTimeout(()=>{
      const drag=touchActionDrag;if(!drag)return;
      drag.active=true;drag.source.classList.add('is-dragging');
      drag.preview=drag.source.cloneNode(true);drag.preview.removeAttribute('draggable');drag.preview.classList.add('action-drag-preview');
      drag.preview.style.width=`${drag.source.getBoundingClientRect().width}px`;
      document.body.append(drag.preview);
      drag.preview.style.left=`${drag.x}px`;drag.preview.style.top=`${drag.y}px`;
    },300);
  },{passive:true});
  actionsContent.addEventListener('touchmove',event=>{
    const drag=touchActionDrag;if(!drag)return;
    const touch=[...event.touches].find(item=>item.identifier===drag.touchId);if(!touch)return;
    drag.x=touch.clientX;drag.y=touch.clientY;
    if(!drag.active){if(Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>10)finishTouchActionDrag();return;}
    event.preventDefault();
    drag.preview.style.left=`${drag.x}px`;drag.preview.style.top=`${drag.y}px`;
    if(drag.monthly){const target=document.elementFromPoint(drag.x,drag.y)?.closest('[data-action-month-week]');$$('[data-action-month-week]',actionsContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
    else if(drag.weekly){const target=document.elementFromPoint(drag.x,drag.y)?.closest('[data-action-week-date]');$$('[data-action-week-date]',actionsContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
    else{const board=$('.action-month-board'),rect=board?.getBoundingClientRect();if(rect&&drag.x>rect.right-34)board.scrollLeft+=18;else if(rect&&drag.x<rect.left+34)board.scrollLeft-=18;setActionDropTarget(document.elementFromPoint(drag.x,drag.y)?.closest('[data-action-month]')||null);}
  },{passive:false});
  actionsContent.addEventListener('touchend',event=>{
    const drag=touchActionDrag;if(!drag)return;
    const touch=[...event.changedTouches].find(item=>item.identifier===drag.touchId);if(!touch)return;
    const id=drag.id,active=drag.active,target=document.elementFromPoint(touch.clientX,touch.clientY),month=target?.closest('[data-action-month]')?.dataset.actionMonth,date=target?.closest('[data-action-week-date]')?.dataset.actionWeekDate,week=target?.closest('[data-action-month-week]')?.dataset.actionMonthWeek;
    finishTouchActionDrag();
    if(active){ignoreActionClickUntil=Date.now()+500;if(drag.monthly&&week)moveActionToMonthlyWeek(id,week);else if(drag.weekly&&date)moveActionToWeekDate(id,date);else if(month)moveActionToMonth(id,month);}
  });
  actionsContent.addEventListener('touchcancel',finishTouchActionDrag);
  $('#actions-content').addEventListener('click',event=>{
    if(Date.now()<ignoreActionClickUntil){event.preventDefault();return;}
    const toggle=event.target.closest('[data-toggle-action]');if(toggle){toggleAction(toggle.dataset.toggleAction);return;}
    const edit=event.target.closest('[data-edit-action]');if(edit){openActionDialog(edit.dataset.editAction);return;}
    const month=event.target.closest('[data-add-action-month]');if(month){openActionDialog();$('#action-schedule').value='month';$('#action-scheduled-month').value=month.dataset.addActionMonth;updateActionSchedule();return;}
    const date=event.target.closest('[data-add-action-date]');if(date){openActionDialog();$('#action-schedule').value='date';$('#action-scheduled-date').value=date.dataset.addActionDate;updateActionSchedule();}
  });
  $('#planner-grid').addEventListener('click',event=>{
    if(event.target.closest('[data-open-routine-day]')){setSection('routines');setView('day');window.scrollTo({top:0,behavior:'smooth'});return;}
    if(event.target.closest('[data-open-task-day]')){setSection('tasks');setTaskView('day');window.scrollTo({top:0,behavior:'smooth'});return;}
    const routine=event.target.closest('[data-planner-routine]'),task=event.target.closest('[data-open-task]'),action=event.target.closest('[data-open-action]'),occurrence=event.target.closest('[data-open-occurrence]');if(routine)openFocusRoutine(routine.dataset.plannerRoutine);else if(task)openTaskFocus(task.dataset.openTask);else if(action)openActionDialog(action.dataset.openAction);else if(occurrence)openOccurrenceDialog(occurrence.dataset.openOccurrence);
  });
  $('#planner-timeline').addEventListener('click',event=>{const routine=event.target.closest('[data-timeline-routine]'),task=event.target.closest('[data-timeline-task]'),action=event.target.closest('[data-timeline-action]');if(routine)openFocusRoutine(routine.dataset.timelineRoutine);else if(task)openTaskFocus(task.dataset.timelineTask);else if(action)openActionDialog(action.dataset.timelineAction);});
  for(const selector of ['#planner-secondary-grid','#task-day-list'])$(selector).addEventListener('click',event=>{
    if(event.target.closest('[data-open-task-day]')){setSection('tasks');setTaskView('day');window.scrollTo({top:0,behavior:'smooth'});return;}
    const openAction=event.target.closest('[data-open-action]');if(openAction){openActionDialog(openAction.dataset.openAction);return;}
    const openOccurrence=event.target.closest('[data-open-occurrence]');if(openOccurrence){openOccurrenceDialog(openOccurrence.dataset.openOccurrence);return;}
    const action=event.target.closest('[data-toggle-action]');if(action){toggleAction(action.dataset.toggleAction);return;}
    const remove=event.target.closest('[data-remove-task-day]');if(remove){removeTaskFromDay(remove.dataset.removeTaskDay);return;}
    const button=event.target.closest('[data-open-task]');if(button)openTaskFocus(button.dataset.openTask);
  });
  $('#task-week-grid').addEventListener('click',event=>{const button=event.target.closest('[data-task-week-date][data-open-task]');if(button)openTaskFocus(button.dataset.openTask,button.dataset.taskWeekDate,true);});
  $('#weekly-grid').addEventListener('click',event=>{const day=event.target.closest('[data-weekly-open-date]'),routine=event.target.closest('[data-weekly-routine]'),task=event.target.closest('[data-task-week-date][data-open-task]'),action=event.target.closest('[data-open-action]'),occurrence=event.target.closest('[data-open-occurrence]');if(day){setSelectedDate(day.dataset.weeklyOpenDate);setSection('planner');window.scrollTo({top:0,behavior:'smooth'});}else if(routine)openFocusRoutine(routine.dataset.weeklyRoutine);else if(task)openTaskFocus(task.dataset.openTask,task.dataset.taskWeekDate,true);else if(action)openActionDialog(action.dataset.openAction);else if(occurrence)openOccurrenceDialog(occurrence.dataset.openOccurrence);});
  $('#task-focus-complete').onchange=event=>mutateTaskDay(day=>{const task=day.tasks[activeTaskId];if(task&&task.kind!=='block'&&!taskIsConsultation(task)){task.done=event.target.checked;task.doneTouched=true;task.doneChangedAt=stamp();}});
  $('#task-focus-block-result').addEventListener('change',event=>{
    const input=event.target.closest('input[name="block-result"]');if(!input)return;
    mutateTaskDay(day=>{const task=day.tasks[activeTaskId];if(task?.kind!=='block'||taskIsConsultation(task))return;task.blockStatus=input.value;task.done=true;task.doneTouched=true;task.doneChangedAt=stamp();});
  });
  $('#task-focus-block-clear').onclick=()=>mutateTaskDay(day=>{const task=day.tasks[activeTaskId];if(task?.kind!=='block'||taskIsConsultation(task))return;task.blockStatus='';task.done=false;task.doneTouched=true;task.doneChangedAt=stamp();});
  $('#task-focus-steps').addEventListener('change',event=>{
    const input=event.target.closest('[data-task-item]');if(!input)return;
    mutateTaskDay(day=>{
      const task=day.tasks[activeTaskId],item=task?.items.find(entry=>entry.id===input.dataset.taskItem);if(!item||taskIsConsultation(task))return;
      item.done=input.checked;item.touched=true;item.changedAt=stamp();
      if(task.kind!=='block'&&(task.items.every(entry=>entry.done)||!input.checked)){task.done=task.items.every(entry=>entry.done);task.doneTouched=true;task.doneChangedAt=stamp();}
    });
  });
  $('#close-task-focus').onclick=()=>$('#task-focus-dialog').close();
  $('#task-focus-day').onclick=()=>{const origin=taskFocusOriginSection||'planner';$('#task-focus-dialog').close();setSection(origin);window.scrollTo({top:0,behavior:'smooth'});};
  $('#task-focus-done').onclick=()=>{ $('#task-focus-dialog').close();setSection('tasks');setTaskView('manage');window.scrollTo({top:0,behavior:'smooth'}); };
  $('#task-focus-dialog').addEventListener('close',()=>{activeTaskId=null;activeTaskDate=null;taskFocusOriginSection=currentSection;});
  $('#add-task').onclick=()=>openTaskDialog();
  $('#task-form').addEventListener('submit',saveTask);$('#task-delete').onclick=deleteTask;
  $('#task-frequency').onchange=updateTaskFrequency;$('#task-kind').onchange=updateTaskKind;$('#task-add-step').onclick=()=>addTaskItemEditor();
  $('#task-items-editor').addEventListener('click',event=>{
    const row=event.target.closest('.item-editor-row');if(!row)return;
    if(event.target.closest('.task-remove-item'))row.remove();
    else{
      const move=event.target.closest('[data-task-move]');if(!move)return;
      if(move.dataset.taskMove==='up'&&row.previousElementSibling)row.parentNode.insertBefore(row,row.previousElementSibling);
      if(move.dataset.taskMove==='down'&&row.nextElementSibling)row.parentNode.insertBefore(row,row.nextElementSibling);
    }
    updateTaskItemOrderButtons();
  });
  $('#task-manage-list').addEventListener('click',event=>{
    const toggle=event.target.closest('[data-task-manage-toggle]');
    if(toggle){
      const id=toggle.dataset.taskManageToggle,card=toggle.closest('.manage-card'),expanded=!openManageTasks.has(id);
      if(expanded)openManageTasks.add(id);else openManageTasks.delete(id);
      card.classList.toggle('is-open',expanded);
      card.querySelector('.manage-step-list').classList.toggle('hidden',!expanded);
      toggle.setAttribute('aria-expanded',String(expanded));
      toggle.setAttribute('aria-label',`${expanded?'Ocultar':'Mostrar'} passos de ${card.querySelector('.manage-info strong').textContent}`);
      return;
    }
    const button=event.target.closest('[data-edit-task]');if(button)openTaskDialog(button.dataset.editTask);
  });
  $('#task-history-list').addEventListener('click',event=>{const button=event.target.closest('[data-task-history-date]');if(button){setSelectedDate(button.dataset.taskHistoryDate);setSection('tasks');setTaskView('day');}});
  $('#task-history-export').onclick=exportTaskCSV;
  $('#add-anchor').onclick=()=>openAnchorDialog();$('#anchor-form').addEventListener('submit',saveAnchor);$('#delete-anchor').onclick=deleteAnchor;$('#daily-view-groups-form').addEventListener('submit',saveDailyViewGroups);
  $$('.anchor-tab').forEach(button=>button.onclick=()=>{anchorView=button.dataset.anchorView;$$('.anchor-tab').forEach(tab=>tab.classList.toggle('active',tab===button));$$('.anchor-view').forEach(view=>view.classList.toggle('active-view',view.id===`anchor-view-${anchorView}`));$('#add-anchor').classList.toggle('hidden',anchorView!=='anchors');});
  $('#anchor-repeat-mode').onchange=updateAnchorRepeatMode;
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
  $('#finish-day').onclick=finishRoutineDay;$('#finish-tasks-day').onclick=finishTaskDay;$('#export-button').onclick=$('#history-export').onclick=exportCSV;
  $('#manage-list').addEventListener('click',e=>{
    const toggle=e.target.closest('[data-manage-toggle]');
    if(toggle){
      const id=toggle.dataset.manageToggle,card=toggle.closest('.manage-card'),expanded=!openManageRoutines.has(id);
      if(expanded)openManageRoutines.add(id);else openManageRoutines.delete(id);
      card.classList.toggle('is-open',expanded);
      card.querySelector('.manage-step-list').classList.toggle('hidden',!expanded);
      toggle.setAttribute('aria-expanded',String(expanded));
      toggle.setAttribute('aria-label',`${expanded?'Ocultar':'Mostrar'} passos de ${card.querySelector('.manage-info strong').textContent}`);
      return;
    }
    const button=e.target.closest('[data-edit]');if(button)openRoutineDialog(button.dataset.edit);
  });
  $('#history-list').addEventListener('click',e=>{const button=e.target.closest('[data-history-date]');if(button){setSelectedDate(button.dataset.historyDate);setSection('routines');setView('day');}});
  $('#sync-indicator').onclick=()=>{updateAccountDialog();$('#account-dialog').showModal();};
  $('#account-form').addEventListener('submit',e=>e.preventDefault());$('#sign-up').onclick=()=>connectAccount(true);$('#sign-in').onclick=()=>connectAccount(false);
  $('#sync-now').onclick=()=>pushSync();
  $('#sync-download').onclick=()=>pullSync();
  $('#sync-upload').onclick=()=>pushSync('Dados enviados para a nuvem.');
  $('#sign-out').onclick=async()=>{try{const {error}=await supabaseClient.auth.signOut();if(error)throw error;session=null;setSyncStatus('offline','Somente neste aparelho');updateAccountDialog();toast('Você saiu da conta.');}catch(error){toast(error.message||'Não foi possível sair da conta.');}};
  function refreshCalendarDay(){if(renderedCalendarDate!==isoToday()){renderedCalendarDate=isoToday();render();}}
  window.addEventListener('focus',()=>{refreshCalendarDay();updateTimelineNow();refreshFromCloud();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshCalendarDay();updateTimelineNow();refreshFromCloud();}});
  window.addEventListener('online',refreshFromCloud);
  setInterval(()=>{refreshCalendarDay();updateTimelineNow();refreshFromCloud();},60000);
  setupColorPalettes();render();initializeSync();
})();
