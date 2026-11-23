(() => {
  'use strict';
  // Chave antiga mantida para preservar os dados já salvos neste navegador.
  const STORAGE_KEY = 'ritmo-routine-tracker-v1';
  const LAST_SYNC_KEY = `${STORAGE_KEY}-last-sync`;
  const PENDING_KEY = `${STORAGE_KEY}-pending-sync`;
  const STORAGE_FORMAT_PREFIX = 'ancora-gz1:';
  function decodeStoredState(value) {
    if (!window.pako) throw new Error('Compactador indisponível');
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return JSON.parse(window.pako.inflate(bytes, { to: 'string' }));
  }
  function readStoredState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      if (raw.startsWith(STORAGE_FORMAT_PREFIX)) return decodeStoredState(raw.slice(STORAGE_FORMAT_PREFIX.length));
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.ancoraCompressed === 'string') return decodeStoredState(parsed.ancoraCompressed);
      return parsed;
    } catch (error) {
      console.error('Falha ao ler os dados salvos:', error);
      return null;
    }
  }
  function writeStoredState(data) {
    const json = JSON.stringify(data);
    let value = json;
    if (window.pako) {
      try {
        const compressed = window.pako.deflate(json, { level: 9 });
        const chunks = [];
        const chunkSize = 0x8000;
        for (let index = 0; index < compressed.length; index += chunkSize) chunks.push(String.fromCharCode.apply(null, compressed.subarray(index, index + chunkSize)));
        value = JSON.stringify({ ancoraCompressed: btoa(chunks.join('')), routines: [], history: {} });
      } catch (error) {
        console.warn('Não foi possível compactar os dados; salvando sem compactação.', error);
      }
    }
    localStorage.setItem(STORAGE_KEY, value);
  }
  const SIDEBAR_KEY = 'ancora-sidebar-collapsed-v1';
  const SEED_TIMESTAMP = '2025-01-01T00:00:00.000Z';
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DAILY_VIEW_GROUPS=[['routines','Rotinas','primary',true,true],['overdue','Tarefas vencidas','primary',false,false],['actions-overdue','Ações vencidas','primary',false,false],['occurrences-overdue','Acontecimentos vencidos','primary',false,false],['tasks-weekly','Tarefas semanais','secondary',true,true],['tasks-biweekly','Tarefas quinzenais','secondary',true,true],['tasks-monthly','Tarefas mensais','secondary',true,true],['blocks','Blocos','secondary',true,true],['consultations','Consultas','secondary',true,true],['actions','Ações','secondary',true,true],['studies','Estudos','secondary',true,true],['leisure','Lazer','secondary',true,true],['habits','Hábitos','secondary',true,false],['occurrence-reminder','Lembretes','secondary',true,true],['occurrence-event','Eventos','secondary',true,true],['occurrence-holiday','Feriados','secondary',true,true],['occurrence-birthday','Aniversários','secondary',true,true],['occurrence-cycle','Ciclos','secondary',true,true]];
  const MONTHLY_TASK_FREQUENCIES=['monthly','bimonthly','quarterly','semiannual','annual'];
  const TASK_FREQUENCY_LABELS={daily:'Diário',weekly:'Semanal',biweekly:'Quinzenal',monthly:'Mensal',bimonthly:'Bimestral',quarterly:'Trimestral',semiannual:'Semestral',annual:'Anual'};
  const RECORD_FREQUENCY_LABELS={daily:'Diária',weekly:'Semanal',biweekly:'Quinzenal',monthly:'Mensal',bimonthly:'Bimestral',quarterly:'Trimestral',semiannual:'Semestral',annual:'Anual'};
  const RECORD_CATEGORY_LABELS={record:'Registro',review:'Revisão',planning:'Planejamento',alignment:'Alinhamento',capture:'Entrada | Captura',processing:'Entrada | Processamento'};
  const RECORD_CATEGORY_COLORS={record:'#8fb2aa',review:'#9fbcd9',planning:'#e3cf7f',alignment:'#7484a8',capture:'#d98ba8',processing:'#c77fa6'};
  const TASK_FREQUENCY_PLURAL={daily:'Diários',weekly:'Semanais',biweekly:'Quinzenais',monthly:'Mensais',bimonthly:'Bimestrais',quarterly:'Trimestrais',semiannual:'Semestrais',annual:'Anuais'};
  const TASK_FREQUENCY_MONTHS={monthly:1,bimonthly:2,quarterly:3,semiannual:6,annual:12};
  const MONTH_WEEK_OPTIONS=[1,2,3,4,5,6];
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
  const LEISURE_TYPE_SEED = [
    ['film','Filme','🎬','#f7dfe6',false],
    ['series','Série','📺','#e9e2f6',true],
    ['book','Livro','📚','#e5efe4',false],
    ['painting','Pintura','🎨','#f7e8d8',false],
    ['craft','Artesanato','🧵','#f3e6ef',false],
    ['game','Jogo','🎮','#e2ecf6',false],
    ['podcast','Podcast','🎧','#e8e7f3',false],
    ['music','Música','🎵','#f0e6f6',false],
    ['course','Curso','🎓','#e6f0ee',false],
    ['trip','Viagem','🧭','#f5efd9',false],
    ['other','Outro','✦','#eceae4',false]
  ];
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
  const PROJECT_SEED = [
    {id:'project-2004',title:'Me aproximar dos amigos que quero manter',description:'Projeto de relacionamento inspirado na planilha de objetivos.',area:'Relacionamentos',status:'Em andamento',type:'Descrição',startDate:'2020-01-01',endDate:'',icon:'◈',color:'#6657e8',notes:'',tasks:[
      {id:'project-task-2004-1',title:'interagir confraria e demais amigos',frequency:'weekly',status:'Remodelada',progress:99,icon:'★',color:'#b8a092'},
      {id:'project-task-2004-2',title:'visitar Keler, bebê Isa',frequency:'monthly',status:'Concluída',progress:100,icon:'▰',color:'#35bc83'},
      {id:'project-task-2004-3',title:'mandar mensagem de aniversário',frequency:'annual',status:'Concluída',progress:100,icon:'▰',color:'#35bc83'},
      {id:'project-task-2004-4',title:'comentar ou interagir nos posts de outros',frequency:'weekly',status:'Em andamento',progress:50,icon:'▰',color:'#6657e8'},
      {id:'project-task-2004-5',title:'postar conteúdo na confraria cada 2 meses',frequency:'bimonthly',status:'Em andamento',progress:67,icon:'▰',color:'#e5a97d'},
      {id:'project-task-2004-6',title:'conversar com Keller a cada 3 meses',frequency:'quarterly',status:'Em andamento',progress:84,icon:'▰',color:'#6657e8'}]},
    {id:'project-2002',title:'Melhorar relação com o Dani, trazendo mais paixão',description:'',area:'Relacionamentos',status:'Em andamento',type:'Descrição',startDate:'2020-01-01',endDate:'',icon:'◆',color:'#d58ca6',notes:'',tasks:[]},
    {id:'project-2404',title:'Cuidar mais de mim',description:'',area:'Saúde e Alimentação',status:'Em andamento',type:'Descrição',startDate:'2024-01-01',endDate:'',icon:'◆',color:'#73a47e',notes:'',tasks:[]},
    {id:'project-2207',title:'Finalizar doutorado',description:'',area:'Carreiras e Trabalho',status:'Stand-by',type:'Descrição',startDate:'2022-01-01',endDate:'',icon:'◆',color:'#e0a06e',notes:'',tasks:[]},
    {id:'project-2104',title:'Remodelar meu estilo ao me vestir',description:'',area:'Beleza e Estilo',status:'Concluída',type:'Descrição',startDate:'2021-01-01',endDate:'2026-01-01',icon:'◆',color:'#8cba8a',notes:'',tasks:[]}
  ];

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const TOP_SCROLL_SELECTOR = '.weekly-scroll, .action-month-board';
  const topScrollRegistry = new WeakMap();
  function releaseTopScroll(scroller){
    if(!scroller)return;
    const state=topScrollRegistry.get(scroller);
    if(state){state.observer?.disconnect();state.mutation?.disconnect();state.bar.remove();topScrollRegistry.delete(scroller);}
    scroller.classList.remove('has-top-scroll');
  }
  function releaseTopScrolls(root){if(root)$$(TOP_SCROLL_SELECTOR,root).forEach(releaseTopScroll);}
  function setupTopScroll(scroller){
    if(!scroller)return;
    let state=topScrollRegistry.get(scroller);
    if(!state){
      const bar=document.createElement('div');
      bar.className='top-scroll';
      bar.setAttribute('aria-hidden','true');
      const inner=document.createElement('div');
      inner.className='top-scroll-inner';
      bar.appendChild(inner);
      scroller.parentNode.insertBefore(bar,scroller);
      scroller.classList.add('has-top-scroll');
      state={bar,inner,observer:null,mutation:null};
      topScrollRegistry.set(scroller,state);
      bar.addEventListener('scroll',()=>{if(scroller.scrollLeft!==bar.scrollLeft)scroller.scrollLeft=bar.scrollLeft;},{passive:true});
      scroller.addEventListener('scroll',()=>{if(bar.scrollLeft!==scroller.scrollLeft)bar.scrollLeft=scroller.scrollLeft;},{passive:true});
      bar.addEventListener('wheel',event=>{if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;scroller.scrollLeft+=event.deltaY;event.preventDefault();},{passive:false});
    }
    const update=()=>{
      if(!scroller.isConnected){releaseTopScroll(scroller);return;}
      state.inner.style.width=`${scroller.scrollWidth}px`;
      const overflowing=scroller.scrollWidth-scroller.clientWidth>1;
      state.bar.classList.toggle('is-empty',!overflowing);
      if(state.bar.scrollLeft!==scroller.scrollLeft)state.bar.scrollLeft=scroller.scrollLeft;
    };
    state.observer?.disconnect();state.mutation?.disconnect();
    if(typeof ResizeObserver==='function'){
      state.observer=new ResizeObserver(update);
      state.observer.observe(scroller);
      if(scroller.firstElementChild)state.observer.observe(scroller.firstElementChild);
    }
    state.mutation=new MutationObserver(update);
    state.mutation.observe(scroller,{childList:true,subtree:true,characterData:true});
    update();
    requestAnimationFrame(update);
  }
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const isoDateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const stamp = () => new Date().toISOString();
  const safeDate = (s) => { const d = s instanceof Date ? new Date(s.getTime()) : new Date(`${s}T12:00:00`); return Number.isNaN(d.getTime()) ? new Date() : d; };
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
  const MENU_ICON_DEFAULTS = new Map($$('.sidebar-link[data-section]').map(link=>[link.dataset.section,link.querySelector('span')?.textContent.trim()||'•']));
  let state = loadState();
  let selectedDate = isoToday();
  let selectedWeekDate = isoToday();
  let selectedWeeklyView = 'days';
  let selectedMonthlyMonth = isoToday().slice(0,7);
  let selectedMonthlyView = 'weeks';
  let selectedRegistriesView = 'trackers';
  let selectedSettingsView = 'views';
  let selectedRecordTypeCategory = '';
  let selectedRecordTypeView = 'cards';
  let recordTypeSort = { key: 'name', dir: 'asc' };
  let selectedRecordLinkedView = 'cards';
  let recordLinkedSort = { key: 'name', dir: 'asc' };
  let recordDirectorySearch = '';
  let recordTypeSearch = '';
  let recordLinkedSearch = '';
  let selectedTaskWeekDate = isoToday();
  let selectedTaskMonth = isoToday().slice(0,7);
  let selectedTaskYear = Number(isoToday().slice(0,4));
  let selectedTaskManageView = 'cards';
  let taskManageSort = { key: 'name', dir: 'asc' };
  let taskAnnualMonthlyHidden = false;
  const annualHiddenMonths={tasks:new Set(),actions:new Set(),occurrences:new Set(),anchors:new Set()};
  let selectedSummaryMonth = isoToday().slice(0,7);
  let selectedSummaryView = 'summary';
  let selectedEsmaltesMonth = '';
  let selectedActionMonth = isoToday().slice(0,7);
  let selectedActionWeekDate = isoToday();
  let actionView = 'annual';
  let hideCompletedActions = false;
  let studyView = 'annual';
  let hideCompletedStudies = false;
  let hideCompletedLeisure = false;
  let ignoreStudyClickUntil = 0;
  let ignoreLeisureClickUntil = 0;
  let selectedStudyMonth = isoToday().slice(0,7), selectedStudyWeekDate = isoToday();
  let leisureView = 'annual';
  let selectedLeisureMonth = isoToday().slice(0,7), selectedLeisureWeekDate = isoToday();
  let selectedOccurrenceMonth = isoToday().slice(0,7);
  let selectedOccurrenceWeekDate = isoToday();
  let occurrenceView = 'annual';
  let occurrenceListSort = { key: 'schedule', dir: 'asc' };
  let actionListSort = { key: 'due', dir: 'asc' };
  let renderedCalendarDate = isoToday();
  let renderedNotesDate = '';
  let anchorView = 'day';
  let selectedAnchorArea='',selectedAnchorSchedule='';
  let selectedAnchorDate=isoToday(),selectedAnchorWeekDate=isoToday(),selectedAnchorMonth=isoToday().slice(0,7),selectedAnchorYear=Number(isoToday().slice(0,4));
  const openManageRoutines = new Set();
  const openManageTasks = new Set();
  const openTaskHistoryDates = new Set();
  let activeRoutineId = null;
  let activeRoutineDate = null;
  let activeTaskId = null;
  let postponedOriginsCache = { date: '', map: null };
  let activeTaskDate = null;
  let activeOccurrenceId = null;
  let activeOccurrenceDate = '';
  let activeOccurrenceKey = '';
  let currentSection = 'timeline';
  let taskFocusOriginSection = 'planner';
  let supabaseClient = null, session = null, syncTimer = null, saving = false, saveAgain = false, recoveryMode = false, pendingRecovery = false;
  let syncKind = 'offline', syncMessage = 'Somente neste aparelho', localRevision = 0, lastAutoSyncAt = 0;

  function makeProjectSeedData(){
    if(Array.isArray(window.ANCORA_PROJECT_IMPORT_SEED)&&window.ANCORA_PROJECT_IMPORT_SEED.length)return structuredClone(window.ANCORA_PROJECT_IMPORT_SEED);
    return PROJECT_SEED.map((project,projectOrder)=>({...project,code:project.id.replace('project-',''),order:projectOrder,history:{},source:'example',updatedAt:SEED_TIMESTAMP,deleted:false,tasks:project.tasks.map((task,taskOrder)=>({...task,code:`${project.id.replace('project-','')}-${taskOrder+1}`,order:taskOrder+1,type:'Tarefa',recurring:true,history:{},criteria:[],occurrences:[],projectId:project.id,updatedAt:SEED_TIMESTAMP,deleted:false,completed:task.status==='Concluída'}))}));
  }
  function makeSeed() {
    const now = SEED_TIMESTAMP;
    return {version:13, dailyViews:Object.fromEntries(DAILY_VIEW_GROUPS.map(([key,,view,weekly,timeline])=>[key,{view,weekly,timeline}])),dailyViewsUpdatedAt:'',menuIcons:{},menuIconsUpdatedAt:'',leisureTypes:makeLeisureTypeSeed(), routines:SEED.map(([icon,name,color,items], i) => ({id:`routine-seed-${i+1}`,name,description:'',icon,color,scheduledTime:'',weekdays:[0,1,2,3,4,5,6],startDate:'',endDate:'',items:items.map((label,j)=>({id:`routine-seed-${i+1}-item-${j+1}`,label,description:'',active:true})),updatedAt:now,deleted:false})),tasks:[],actions:[],occurrences:[],actionAreas:[],projects:makeProjectSeedData(),taskHistory:{},dayNotes:{},weekNotes:{},monthNotes:{},weekRegistries:{},monthRegistries:{},recordTypes:[],globalEntries:{text:'',updatedAt:''},areas:makeAreaSeed(),anchors:makeAnchorSeed(),history:{}};
  }
  function makeAreaSeed(){return AREA_SEED.map(([id,name,color],order)=>({id:`area-${id}`,name,color,dailyView:'primary',weeklyView:true,timelineView:true,order:id==='tema-do-dia'?-1:order,updatedAt:SEED_TIMESTAMP,deleted:false}));}
  function makeLeisureTypeSeed(){return LEISURE_TYPE_SEED.map(([id,name,icon,color,usesSeasons],order)=>({id,name,icon,color,usesSeasons,order,updatedAt:SEED_TIMESTAMP,deleted:false}));}
  function makeAnchorSeed(){return ANCHOR_SEED.map(([area,icon,title,weekdays],index)=>({id:`anchor-seed-${index+1}`,areaId:`area-${area}`,icon,title,description:'',scheduleType:'day',weekdays,monthWeeks:[],scheduledMonths:[],startDate:'',endDate:'',updatedAt:SEED_TIMESTAMP,deleted:false}));}
  function plannerNeedsUpgrade(data){
    return !Array.isArray(data.areas)||!Array.isArray(data.anchors)||!Array.isArray(data.occurrences)||!data.globalEntries||typeof data.globalEntries!=='object'||
      makeAreaSeed().some(seed=>!data.areas.some(area=>area.id===seed.id))||
      makeAnchorSeed().some(seed=>!data.anchors.some(anchor=>anchor.id===seed.id));
  }
  function ensurePlannerData(data, options={}){
    const previousVersion=Number(data.version)||0;
    if(!Array.isArray(data.areas))data.areas=[];
    if(!Array.isArray(data.anchors))data.anchors=[];
    if(!Array.isArray(data.tasks))data.tasks=[];
    for(const task of data.tasks){if(MONTHLY_TASK_FREQUENCIES.includes(task.frequency)&&(!Number.isInteger(Number(task.monthWeek))||Number(task.monthWeek)<1||Number(task.monthWeek)>6))task.monthWeek=1;if(!task.createdAt)task.createdAt=task.startDate||task.updatedAt||SEED_TIMESTAMP;if(typeof task.areaId!=='string')task.areaId='';}
    if(!Array.isArray(data.actions))data.actions=[];
    if(!Array.isArray(data.occurrences))data.occurrences=[];
    for(const item of data.occurrences){if(!Array.isArray(item.completionHistory))item.completionHistory=[];if(!Array.isArray(item.dateExceptions))item.dateExceptions=[];if(!Array.isArray(item.completedDates))item.completedDates=[];if(typeof item.consultative!=='boolean')item.consultative=false;item.leadDays=Math.max(0,Math.min(365,Number(item.leadDays)||0));if(item.repeatMode==='after-completion'&&!item.recurrenceMode)item.recurrenceMode='after-completion';if(!Number.isFinite(Number(item.intervalDays))&&['after-completion','after-date'].includes(item.recurrenceMode))item.intervalDays=1;if(item.schedule==='recurrence'&&!item.scheduledDate)item.scheduledDate=item.startDate||(item.createdAt||'').slice(0,10);}
    if(!Array.isArray(data.actionAreas))data.actionAreas=[];
    data.actionAreas.forEach((area,index)=>{if(!Number.isFinite(Number(area.order)))area.order=index;if(typeof area.deleted!=='boolean')area.deleted=false;});
    if(!Array.isArray(data.leisureTypes))data.leisureTypes=[];
    if(previousVersion<12){const knownTypes=new Set(data.leisureTypes.map(type=>type.id));for(const type of makeLeisureTypeSeed())if(!knownTypes.has(type.id))data.leisureTypes.push(type);}
    data.leisureTypes.forEach((type,index)=>{
      if(typeof type.id!=='string'||!type.id)type.id=`leisure-type-${index+1}`;
      if(typeof type.name!=='string'||!type.name.trim())type.name='Tipo de lazer';
      if(typeof type.icon!=='string')type.icon='';
      if(!/^#[0-9a-f]{6}$/i.test(type.color||''))type.color='#eceae4';
      if(typeof type.usesSeasons!=='boolean')type.usesSeasons=false;
      if(!Number.isFinite(Number(type.order)))type.order=index;
      if(typeof type.deleted!=='boolean')type.deleted=false;
      if(!type.updatedAt)type.updatedAt=SEED_TIMESTAMP;
    });
    if(!Array.isArray(data.projects))data.projects=[];
    if(!data.projects.length)data.projects=makeProjectSeedData();
    else if(previousVersion<9&&Array.isArray(window.ANCORA_PROJECT_IMPORT_SEED)&&window.ANCORA_PROJECT_IMPORT_SEED.length){const custom=data.projects.filter(project=>!['example','spreadsheet'].includes(project.source));data.projects=[...makeProjectSeedData(),...custom];}
    for(const [projectIndex,project] of data.projects.entries()){
      if(typeof project.areaId!=='string')project.areaId='';if(typeof project.area!=='string')project.area='';
      ensureProjectArea(data,project);
      if(!Array.isArray(project.tasks))project.tasks=[];if(!project.history||typeof project.history!=='object')project.history={};if(!project.statusHistory||typeof project.statusHistory!=='object'||Array.isArray(project.statusHistory))project.statusHistory={};if(!project.monthNotes||typeof project.monthNotes!=='object'||Array.isArray(project.monthNotes))project.monthNotes={};if(!project.code)project.code=project.id?.replace('project-','')||'';if(!Number.isFinite(Number(project.order)))project.order=projectIndex;if(!project.source)project.source='app';
      for(const [taskIndex,task] of project.tasks.entries()){
        task.projectId=project.id;if(!task.code)task.code=`${project.code||project.id}-${task.order||taskIndex+1}`;if(!Number.isFinite(Number(task.order)))task.order=taskIndex+1;if(!task.type)task.type='Tarefa';if(typeof task.recurring!=='boolean')task.recurring=Boolean(task.frequency);if(!task.history||typeof task.history!=='object')task.history={};if(!task.statusHistory||typeof task.statusHistory!=='object'||Array.isArray(task.statusHistory))task.statusHistory={};if(!Array.isArray(task.criteria))task.criteria=[];if(!Array.isArray(task.occurrences))task.occurrences=[];if(task.progress!==null&&task.progress!==''&&!Number.isFinite(Number(task.progress)))task.progress=null;if(task.progress===''||task.progress===undefined)task.progress=task.completed||task.status==='Concluída'?100:null;if(task.criteria.length){const criteria=task.criteria.filter(item=>!item.deleted&&!['Remodelada','Descartada'].includes(item.status)),totalWeight=criteria.reduce((sum,item)=>sum+Math.max(0,Number(item.weight)||0),0),currentProgress=task.progress===null||task.progress===undefined||task.progress===''?null:Number(task.progress);if(totalWeight&&currentProgress===null){const weighted=criteria.reduce((sum,item)=>sum+Math.max(0,Number(item.weight)||0)*Math.max(0,Math.min(100,Number(item.progress)||0)),0)/totalWeight;task.progress=Math.max(0,Math.min(100,weighted));}task.criteria=[];}if(typeof task.completed!=='boolean')task.completed=task.status==='Concluída';if(!task.updatedAt)task.updatedAt=project.updatedAt||SEED_TIMESTAMP;if(typeof task.deleted!=='boolean')task.deleted=false;if(taskIsHabit(task)){task.recurring=true;if(!task.frequency)task.frequency='daily';if(!Number.isFinite(Number(task.habitTarget))||Number(task.habitTarget)<1)task.habitTarget=defaultHabitTarget(task.frequency);}
      }
    }
    if(!data.dailyViews||typeof data.dailyViews!=='object')data.dailyViews={};
    if(typeof data.dailyViewsUpdatedAt!=='string')data.dailyViewsUpdatedAt='';
    for(const [key,,view,weekly,timeline] of DAILY_VIEW_GROUPS){if(typeof data.dailyViews[key]==='string')data.dailyViews[key]={view:data.dailyViews[key],weekly,timeline};if(!data.dailyViews[key]||typeof data.dailyViews[key]!=='object')data.dailyViews[key]={view,weekly,timeline};if(data.dailyViews[key].view!=='primary'&&data.dailyViews[key].view!=='secondary')data.dailyViews[key].view=view;if(typeof data.dailyViews[key].weekly!=='boolean')data.dailyViews[key].weekly=weekly;if(typeof data.dailyViews[key].timeline!=='boolean')data.dailyViews[key].timeline=timeline;}
    if(!data.menuIcons||typeof data.menuIcons!=='object'||Array.isArray(data.menuIcons))data.menuIcons={};
    if(typeof data.menuIconsUpdatedAt!=='string')data.menuIconsUpdatedAt='';
    for(const [section,value] of Object.entries(data.menuIcons)){
      const icon=typeof value==='string'?value.trim():'';
      if(icon)data.menuIcons[section]=Array.from(icon).slice(0,12).join('');else delete data.menuIcons[section];
    }
    for(const action of data.actions){
      if(typeof action.study!=='boolean')action.study=false;
      if(action.study&&action.areaId)action.areaId='';if(action.leisure&&action.areaId)action.areaId='';
      if(typeof action.leisure!=='boolean')action.leisure=false;
      if(typeof action.leisureType!=='string')action.leisureType='';
      if(typeof action.backlog!=='boolean')action.backlog=false;
      if(typeof action.seasonOf!=='string')action.seasonOf='';
      if(!Number.isFinite(Number(action.season)))action.season=null;
      if(typeof action.parentId!=='string')action.parentId='';
      if(!action.createdAt)action.createdAt=action.updatedAt||SEED_TIMESTAMP;
      if(action.completed&&!action.completedAt)action.completedAt=action.completionChangedAt||action.updatedAt||'';
      if(!action.completed)action.completedAt='';
    }
    for(const series of data.actions.filter(action=>!action.deleted&&action.leisure&&!action.seasonOf&&action.season&&action.parentId)){
      const number=Number(series.season);if(!number)continue;
      const seasonId=`${series.id}-season-${number}`;
      if(!data.actions.some(action=>action.id===seasonId))data.actions.push({...structuredClone(series),id:seasonId,seasonOf:series.id,season:number,backlog:series.backlog===true,updatedAt:series.updatedAt||SEED_TIMESTAMP});
      series.season=null;series.backlog=true;
    }
    if(previousVersion<13&&options.skipLeisureCategoryMigration!==true){
      const now=new Date().toISOString(),categoryIds=new Set(data.actions.filter(action=>!action.deleted&&action.leisure&&!action.parentId&&!action.seasonOf).map(action=>action.id));
      if(categoryIds.size){
        for(const action of data.actions){
          if(categoryIds.has(action.id)){action.deleted=true;action.updatedAt=now;continue;}
          if(action.parentId&&categoryIds.has(action.parentId)){action.parentId='';action.updatedAt=now;}
        }
      }
    }
    if(!Array.isArray(data.recordTypes))data.recordTypes=[];
    for(const type of data.recordTypes){
      if(typeof type.name!=='string')type.name='';
      if(typeof type.icon!=='string')type.icon='';
      if(!RECORD_FREQUENCY_LABELS[type.frequency])type.frequency='weekly';
      const previousCategory=type.category;
      if(type.category==='entries')type.category='capture';
      else if(type.category==='Entrada | Captura')type.category='capture';
      else if(type.category==='Entrada | Processamento')type.category='processing';
      if(!RECORD_CATEGORY_LABELS[type.category])type.category='record';
      if(previousCategory!==type.category&&typeof type.categoryUpdatedAt!=='string')type.categoryUpdatedAt=type.updatedAt||type.createdAt||SEED_TIMESTAMP;
      if(typeof type.categoryUpdatedAt!=='string')type.categoryUpdatedAt='';
      if(!['task','routine'].includes(type.kind))type.kind='task';
      if(typeof type.targetId!=='string')type.targetId='';
      if(typeof type.stepId!=='string')type.stepId='';
      if(typeof type.deleted!=='boolean')type.deleted=false;
      if(!type.updatedAt)type.updatedAt=SEED_TIMESTAMP;
    }
    if(!data.taskHistory||typeof data.taskHistory!=='object')data.taskHistory={};
    if(!data.dayNotes||typeof data.dayNotes!=='object')data.dayNotes={};
    if(!data.weekNotes||typeof data.weekNotes!=='object')data.weekNotes={};
    if(!data.monthNotes||typeof data.monthNotes!=='object')data.monthNotes={};
    if(!data.weekRegistries||typeof data.weekRegistries!=='object')data.weekRegistries={};
    if(!data.monthRegistries||typeof data.monthRegistries!=='object')data.monthRegistries={};
    if(!data.globalEntries||typeof data.globalEntries!=='object')data.globalEntries={text:'',updatedAt:''};
    if(typeof data.globalEntries.text!=='string')data.globalEntries.text='';
    if(typeof data.globalEntries.updatedAt!=='string')data.globalEntries.updatedAt='';
    const activeActionIds=new Set(data.actions.filter(action=>!action.deleted).map(action=>action.id));
    for(const action of data.actions)if(action.parentId===action.id||action.parentId&&!activeActionIds.has(action.parentId))action.parentId='';
    for(const action of data.actions)if(action.seasonOf&&(action.seasonOf===action.id||!activeActionIds.has(action.seasonOf)))action.seasonOf='';
    data.version=13;
    const areaIds=new Set(data.areas.map(area=>area.id)),anchorIds=new Set(data.anchors.map(anchor=>anchor.id));
    for(const area of makeAreaSeed())if(!areaIds.has(area.id))data.areas.push(area);
    for(const area of data.areas){if(typeof area.weeklyView!=='boolean')area.weeklyView=true;if(typeof area.timelineView!=='boolean')area.timelineView=area.weeklyView;}
    for(const anchor of makeAnchorSeed())if(!anchorIds.has(anchor.id))data.anchors.push(anchor);
    for(const anchor of data.anchors){if(!['none','day','week','month'].includes(anchor.scheduleType))anchor.scheduleType=anchor.scheduledMonths?.length?'month':anchor.monthWeeks?.length?'week':anchor.weekdays?.length?'day':'none';if(!Array.isArray(anchor.weekdays))anchor.weekdays=[];if(!Array.isArray(anchor.monthWeeks))anchor.monthWeeks=[];if(!Array.isArray(anchor.scheduledMonths))anchor.scheduledMonths=[];}
    upgradePostponementLinks(data);
    return data;
  }
  function upgradePostponementLinks(data){
    const add=(task,entry)=>{if(!task)return;if(!Array.isArray(task.postponements))task.postponements=[];if(!task.postponements.some(item=>item.from===entry.from&&item.to===entry.to))task.postponements.push(entry);};
    for(const [originDate,day] of Object.entries(data.taskHistory||{}))for(const [id,task] of Object.entries(day.tasks||{})){
      if(!task.postponedTo)continue;
      const targetDay=data.taskHistory[task.postponedTo],targetTask=targetDay?.tasks?.[id];if(!targetTask)continue;
      const entry={from:originDate,to:task.postponedTo,at:task.reviewChangedAt||task.doneChangedAt||''};
      add(task,entry);add(targetTask,entry);
      if(!targetTask.originalDate){targetTask.originalDate=originDate;targetTask.manualOccurrence=true;}
    }
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
    const parsed=readStoredState();
    if(parsed && Array.isArray(parsed.routines) && parsed.history) {
      const needsUpgrade=plannerNeedsUpgrade(parsed);
      const normalized=ensurePlannerData(normalizeSeedItemIds(parsed));
      try {writeStoredState(normalized);if(needsUpgrade)localStorage.setItem(PENDING_KEY,'local');} catch {}
      return normalized;
    }
    const fresh = ensurePlannerData(makeSeed());
    try { writeStoredState(fresh); localStorage.setItem(PENDING_KEY,'local'); } catch {}
    return fresh;
  }
  function monthWeekNumber(date){
    const current=safeDate(date),year=current.getFullYear(),month=current.getMonth(),first=new Date(year,month,1),last=new Date(year,month+1,0),firstMonday=new Date(first);
    firstMonday.setDate(first.getDate()-((first.getDay()+6)%7));
    const firstWeekEnd=new Date(firstMonday);firstWeekEnd.setDate(firstWeekEnd.getDate()+6);
    const overlapStart=first>firstMonday?first:firstMonday,overlapEnd=last<firstWeekEnd?last:firstWeekEnd;
    const daysInFirstWeek=Math.round((overlapEnd-overlapStart)/86400000)+1;
    if(daysInFirstWeek<4)firstMonday.setDate(firstMonday.getDate()+7);
    const monday=new Date(current);monday.setDate(current.getDate()-((current.getDay()+6)%7));
    return Math.floor((monday-firstMonday)/604800000)+1;
  }
  function monthWeekMatches(week,date){
    const value=Number(week);
    if(value!==6)return value===monthWeekNumber(date);
    const current=safeDate(date),nextOccurrence=new Date(current);nextOccurrence.setDate(nextOccurrence.getDate()+7);
    return nextOccurrence.getMonth()!==current.getMonth();
  }
  function monthWeekRange(monthKey,week){
    const [year,month]=monthKey.split('-').map(Number),first=new Date(year,month-1,1),last=new Date(year,month,0);
    if(Number(week)===6){const start=new Date(last);start.setDate(last.getDate()-6);return [start,last];}
    const firstMonday=new Date(first);firstMonday.setDate(first.getDate()-((first.getDay()+6)%7));const firstWeekEnd=new Date(firstMonday);firstWeekEnd.setDate(firstWeekEnd.getDate()+6);const overlapStart=first>firstMonday?first:firstMonday,overlapEnd=last<firstWeekEnd?last:firstWeekEnd,daysInFirstWeek=Math.round((overlapEnd-overlapStart)/86400000)+1;
    if(daysInFirstWeek<4)firstMonday.setDate(firstMonday.getDate()+7);
    const start=new Date(firstMonday);start.setDate(start.getDate()+(Number(week)-1)*7);const end=new Date(start);end.setDate(end.getDate()+6);return [start,end];
  }
  function monthWeekLabel(week,withPrefix=true){return Number(week)===6?'Última semana':`${withPrefix?'Semana ':''}${Number(week)}`;}
  function monthlyWeekHeader(monthKey,week){const [start,end]=monthWeekRange(monthKey,week),key=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;return `<th scope="col" class="monthly-week monthly-week-${week}"><button type="button" class="monthly-week-link" data-open-month-week="${key(start)}"><span class="monthly-week-pill">${monthWeekLabel(week).toLowerCase()}</span><small>${escapeHTML(fmtDate(key(start),{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(key(end),{day:'numeric',month:'short'}))}</small></button></th>`;}
  function monthWeekHasFourDays(monthKey,week){if(Number(week)===6)return true;const [start,end]=monthWeekRange(monthKey,week),[year,month]=monthKey.split('-').map(Number),first=new Date(year,month-1,1),last=new Date(year,month,0),overlapStart=start>first?start:first,overlapEnd=end<last?end:last;return overlapEnd>=overlapStart&&Math.round((overlapEnd-overlapStart)/86400000)+1>=4;}
  function monthlyWeeksFor(monthKey){return MONTH_WEEK_OPTIONS.filter(week=>Number(week)!==6&&monthWeekHasFourDays(monthKey,week)).concat(6);}
  function dayIsScheduled(routine, date) {
    if (routine.deleted) return false;
    if (routine.startDate && date < routine.startDate) return false;
    if (routine.endDate && date > routine.endDate) return false;
    if(routine.scheduleType==='week')return Array.isArray(routine.monthWeeks)&&routine.monthWeeks.length>0&&routine.monthWeeks.some(week=>monthWeekMatches(week,date));
    if(routine.scheduleType==='month')return Array.isArray(routine.scheduledMonths)&&routine.scheduledMonths.includes(Number(date.slice(5,7)));
    if(routine.scheduleType&&routine.scheduleType!=='day')return false;
    return (routine.weekdays || []).includes(safeDate(date).getDay());
  }
  function taskIsScheduled(task,date){
    if(!task.startDate&&task.createdAt&&date<String(task.createdAt).slice(0,10))return false;
    if(!dayIsScheduled(task,date))return false;
    if(MONTHLY_TASK_FREQUENCIES.includes(task.frequency)){
      if(!task.startDate||!monthWeekMatches(task.monthWeek||1,date))return false;
      const current=safeDate(date),start=safeDate(task.startDate),months=(current.getFullYear()-start.getFullYear())*12+current.getMonth()-start.getMonth();
      return months>=0&&months%TASK_FREQUENCY_MONTHS[task.frequency]===0;
    }
    if(task.frequency!=='biweekly')return true;
    if(!task.startDate)return false;
    const mondayUTC=value=>{const day=safeDate(value);day.setDate(day.getDate()-(day.getDay()+6)%7);return Date.UTC(day.getFullYear(),day.getMonth(),day.getDate());};
    const weeks=Math.round((mondayUTC(date)-mondayUTC(task.startDate))/604800000);
    return weeks>=0&&weeks%2===0;
  }
  function taskFrequencyLabel(frequency){return TASK_FREQUENCY_LABELS[frequency]||'Semanal';}
  function taskFrequencyGroup(frequency){return MONTHLY_TASK_FREQUENCIES.includes(frequency)?'tasks-monthly':frequency==='biweekly'?'tasks-biweekly':'tasks-weekly';}
  function actionIsScheduled(action,date){
    if(action.deleted)return false;
    if(action.schedule==='date')return action.scheduledDate===date;
    return action.scheduledMonth===date.slice(0,7)&&(!action.week||monthWeekMatches(action.week,date));
  }
  function dailyViewOfGroup(group){return state.dailyViews?.[group]?.view==='primary'?'primary':'secondary';}
  function groupInWeekly(group){return state.dailyViews?.[group]?.weekly!==false;}
  function groupInTimeline(group){return state.dailyViews?.[group]?.timeline!==false;}
  function actionAreaName(action){return state.actionAreas.find(area=>area.id===action.areaId&&!area.deleted)?.name||'';}
  function orderedActionAreas(){return state.actionAreas.filter(area=>!area.deleted).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||a.name.localeCompare(b.name,'pt-BR'));}
  function areaNameKey(name){return String(name||'').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
  function areaSlug(name){return areaNameKey(name).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function ensureProjectArea(data,project){
    if(!project||project.areaId)return;
    const name=String(project.area||'').trim();if(!name)return;
    const key=areaNameKey(name),existing=data.actionAreas.find(area=>!area.deleted&&areaNameKey(area.name)===key);
    if(existing){project.areaId=existing.id;return;}
    const id=`area-proj-${areaSlug(name)||'sem-nome'}`,known=data.actionAreas.find(area=>area.id===id);
    if(known){project.areaId=known.id;return;}
    const area={id,name,color:'#dcebe7',order:data.actionAreas.reduce((max,item)=>Math.max(max,Number(item.order)||0),-1)+1,updatedAt:SEED_TIMESTAMP,deleted:false};
    data.actionAreas.push(area);project.areaId=area.id;
  }
  function actionScheduleLabel(action){
    if(action.schedule==='date'&&action.scheduledDate)return fmtDate(action.scheduledDate,{day:'numeric',month:'short'});
    return action.week?monthWeekLabel(action.week):'';
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
    for(const id of Object.keys(day.tasks||{}))if((!scheduled.has(id)&&!day.tasks[id]?.manualOccurrence)||day.excludedTasks[id]){delete day.tasks[id];changed=true;}
    for(const [id,task] of scheduled){
      if(day.excludedTasks[id])continue;
      let snapshot=day.tasks[id];
      if(!snapshot){snapshot={taskId:id,items:[],done:false,doneTouched:false,doneChangedAt:now,blockStatus:''};day.tasks[id]=snapshot;changed=true;}
      for(const [key,value] of Object.entries({name:task.name,description:task.description||'',icon:task.icon,color:task.color,frequency:task.frequency,scheduledTime:task.scheduledTime||'',durationMinutes:task.durationMinutes||45,consultation:task.consultation===true,kind:task.kind==='block'?'block':'regular',areaId:task.areaId||''})){
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
    postponedOriginsCache = { date: '', map: null };
    localRevision++;
    try { writeStoredState(state); localStorage.setItem(PENDING_KEY,session?.user?.id||'local'); }
    catch { toast('O armazenamento deste navegador está cheio. Exporte seu histórico para guardar uma cópia.'); }
    setSyncStatus(session?.user?'syncing':'offline',session?.user?'Alterações aguardando sincronização...':'Dados neste aparelho');
    scheduleSync();
  }
  function mutateDay(fn) {
    const date=activeRoutineDate||selectedDate,day = ensureDay(date); fn(day); day.updatedAt = stamp(); saveLocal(); renderDay(); renderPlanner(); renderWeekly(); renderSummary(); renderFocusRoutine();
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
    const date=activeRoutineDate||selectedDate,day=ensureDay(date),routine=day.routines[activeRoutineId];
    if(!routine){$('#routine-focus-dialog').close();return;}
    const done=routine.items.filter(item=>item.done).length,total=routine.items.length;
    const focus=$('#routine-focus-dialog');focus.style.setProperty('--routine-color',routine.color);
    $('#focus-date').textContent=fmtDate(date).toLocaleUpperCase('pt-BR');
    $('#focus-routine-icon').textContent=routine.icon;
    $('#focus-routine-name').textContent=routine.name;
    $('#focus-routine-count').textContent=`${routine.scheduledTime?`${routine.scheduledTime} · `:''}${done} de ${total} passos concluídos`;
    $('#focus-routine-description').textContent=routine.description||'';
    $('#focus-routine-description').classList.toggle('hidden',!routine.description);
    $('#focus-progress-bar').style.width=`${total?done/total*100:0}%`;
    $('#focus-steps').innerHTML=routine.items.map(item=>`<label class="focus-step ${item.done?'is-done':''}"><input type="checkbox" data-focus-item="${escapeHTML(item.id)}" ${item.done?'checked':''} ${day.finalized?'disabled':''}><span class="focus-check"></span><span class="focus-step-copy"><span>${escapeHTML(item.label)}</span>${item.description?`<small>${escapeHTML(item.description)}</small>`:''}</span></label>`).join('');
  }
  function openFocusRoutine(id,date=selectedDate) {
    if(!ensureDay(date).routines[id])return;
    activeRoutineId=id;activeRoutineDate=date;renderFocusRoutine();$('#routine-focus-dialog').showModal();
  }
  function renderManage() {
    const routines=state.routines.filter(r=>!r.deleted).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    $('#manage-list').innerHTML = routines.length ? routines.map(r=>{
      const items=r.items.filter(item=>item.active!==false),expanded=openManageRoutines.has(r.id);
      return `<article class="manage-card${expanded?' is-open':''}" style="--routine-color:${escapeHTML(r.color)}"><div class="manage-card-main"><span class="routine-icon">${escapeHTML(r.icon)}</span><div class="manage-info"><strong>${escapeHTML(r.name)}</strong><small>${r.scheduledTime?`${escapeHTML(r.scheduledTime)} · `:''}${items.length} passos · ${r.weekdays.length===7?'todos os dias':r.weekdays.length===5&&r.weekdays.includes(1)&&r.weekdays.includes(5)?'dias úteis':r.weekdays.length===2&&r.weekdays.includes(0)&&r.weekdays.includes(6)?'fim de semana':r.weekdays.map(d=>WEEKDAYS[d]).join(', ')}</small></div><button type="button" class="manage-toggle" data-manage-toggle="${escapeHTML(r.id)}" aria-expanded="${expanded}" aria-controls="manage-steps-${escapeHTML(r.id)}" aria-label="${expanded?'Ocultar':'Mostrar'} passos de ${escapeHTML(r.name)}">▾</button><button type="button" class="small-edit" data-edit="${escapeHTML(r.id)}">Editar</button></div><div id="manage-steps-${escapeHTML(r.id)}" class="manage-step-list${expanded?'':' hidden'}"><ol>${items.map(item=>`<li>${escapeHTML(item.label)}</li>`).join('')}</ol></div></article>`;
    }).join('') : '<div class="empty-state"><span>✦</span><h3>Suas rotinas começam aqui</h3><p>Crie uma rotina que combine com seu dia.</p></div>';
  }
  function renderHistory() {
    const days=Object.keys({...state.history,...(state.dayNotes||{})}).filter(date=>Object.values(state.history[date]?.routines||{}).length||state.dayNotes?.[date]?.text?.trim()).sort((a,b)=>b.localeCompare(a));
    $('#history-list').innerHTML = days.length ? days.map(date=>{
      const day=state.history[date], items=Object.values(day?.routines||{}).flatMap(r=>r.items||[]), done=items.filter(i=>i.done).length, pct=items.length?Math.round(done/items.length*100):0;
      const stats=items.length?`<span class="history-stat"><strong>${done}/${items.length}</strong><small>passos concluídos</small></span><span class="history-meter"><i style="width:${pct}%"></i></span><span class="history-percent">${pct}%</span>`:`<span class="history-stat"><strong>Anotação</strong><small>sem passos registrados</small></span><span class="history-meter"><i style="width:0%"></i></span><span class="history-percent">—</span>`;
      return `<button class="history-card${date<isoToday()&&dayStatus(date).routinePending?' is-incomplete':''}" data-history-date="${date}"><span class="history-date"><strong>${escapeHTML(fmtDate(date,{day:'numeric'}))}</strong><small>${escapeHTML(fmtDate(date,{weekday:'long',month:'long'}))}</small></span>${stats}<span class="history-arrow">→</span></button>`;
    }).join('') : '<div class="empty-state"><span>♡</span><h3>Seu histórico vai aparecer aqui</h3><p>Comece uma rotina e seus passos ficam registrados por dia.</p></div>';
  }
  function taskSnapshots(day,frequency,date=selectedDate,kind='regular',view='',group='',consultation=null){
    return Object.values(day.tasks||{}).filter(task=>(!frequency||task.frequency===frequency)&&(task.kind==='block'?'block':'regular')===kind&&taskIsVisibleOnDay(task,date)&&(consultation===null||taskIsConsultation(task)===consultation)&&(!view||dailyViewOfGroup(group)===view)).sort((a,b)=>(a.scheduledTime||'99:99').localeCompare(b.scheduledTime||'99:99')||a.name.localeCompare(b.name,'pt-BR'));
  }
  function taskArea(task){
    const areaId=task?.areaId||state.tasks.find(entry=>entry.id===(task?.taskId||task?.id))?.areaId||'';
    return state.actionAreas.find(area=>area.id===areaId&&!area.deleted)||null;
  }
  function taskAreaName(task){return taskArea(task)?.name||'';}
  function taskAreaOptions(selected=''){
    const areas=orderedActionAreas();
    const options=areas.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    const fallback=selected&&!areas.some(area=>area.id===selected)?`<option value="${escapeHTML(selected)}">Área indisponível</option>`:'';
    return '<option value="">Sem área</option>'+options+fallback;
  }
  function taskRow(task,showRemove=true,showArea=true,showDescription=false){
    const items=task.items||[],consultation=taskIsConsultation(task),result=blockStatusOf(task),short=value=>fmtDate(value,{day:'2-digit',month:'2-digit'});
    const postponedTo=task.reviewStatus==='postponed'?task.postponedTo:'',history=taskPostponementHistory(task,selectedDate),last=history[history.length-1],postponedFrom=last&&last.to===selectedDate?last.from:'',area=taskArea(task);
    return `<div class="task-entry${showRemove?' has-remove':''}"><button type="button" class="task-row${(task.kind==='block'?Boolean(result):task.done)&&!consultation?' is-done':''}" data-open-task="${escapeHTML(task.taskId)}"><span class="task-row-main"><span class="task-row-icon" aria-hidden="true">${escapeHTML(task.icon||'✓')}</span><span class="task-row-name">${escapeHTML(task.name)}</span>${area&&showArea?`<small class="task-area-badge" style="--tag-color:${escapeHTML(area.color||'#dcebe7')};--tag-ink:${plannerHeadingInk(area.color)}">${escapeHTML(area.name)}</small>`:''}${postponedTo?`<small class="task-postponed-badge is-out">Adiada para ${short(postponedTo)}</small>`:''}${postponedFrom?`<small class="task-postponed-badge is-in">Adiada de ${short(postponedFrom)}</small>`:''}${consultation?'<small class="task-consultation-badge">Consulta</small>':task.kind==='block'?`<small class="task-block-frequency">${taskFrequencyLabel(task.frequency)}</small>${result?`<small class="block-result-badge is-${result}">${blockStatusLabel(result)}</small>`:''}`:''}${task.scheduledTime?`<time>${escapeHTML(task.scheduledTime)}</time>`:''}</span>${showDescription&&task.description?`<span class="task-row-description">${escapeHTML(task.description)}</span>`:''}${items.length?`<span class="task-row-steps">${items.map(item=>`<span class="task-row-step${item.done&&!consultation?' is-done':''}">${escapeHTML(item.label)}</span>`).join('')}</span>`:''}</button>${showRemove?`<button type="button" class="task-remove-day" data-remove-task-day="${escapeHTML(task.taskId)}">Remover deste dia</button>`:''}</div>`;
  }
  function plannerDoneMark(complete){return complete?'<span class="planner-title-done" role="img" aria-label="Dia concluído">✓</span>':'';}
  function taskGroup(day,frequency,planner=false,view='',group='',consultation=null){
    const tasks=taskSnapshots(day,frequency,selectedDate,'regular',view,group,consultation),label=consultation?'Consultas':TASK_FREQUENCY_PLURAL[frequency]||'Semanais',icon=frequency==='biweekly'?'◫':MONTHLY_TASK_FREQUENCIES.includes(frequency)?'▦':'☑';
    const complete=planner&&!consultation&&tasks.length>0&&Boolean(day.finalized);
    if(planner)return `<section class="planner-block planner-task-block${frequency==='biweekly'?' planner-task-biweekly':''}"><h2><button type="button" class="planner-block-link" data-open-task-day><span class="planner-heading-icon" aria-hidden="true">${icon}</span><span>Tarefas ${label.toLowerCase()}</span></button>${plannerDoneMark(complete)}</h2><div class="planner-block-body">${tasks.length?tasks.map(task=>taskRow(task,false,false)).join(''):'<p class="planner-empty">Nenhuma tarefa neste dia.</p>'}</div></section>`;
    return `<section class="task-group"><h3>${label}</h3>${tasks.length?tasks.map(task=>taskRow(task,!day.finalized,true,true)).join(''):'<p class="planner-empty">Nenhuma tarefa neste dia.</p>'}</section>`;
  }
  function monthlyTaskGroups(day,planner=false,view=''){
    const consultation=planner?false:null;
    return MONTHLY_TASK_FREQUENCIES.filter(frequency=>taskSnapshots(day,frequency,selectedDate,'regular',view,'tasks-monthly',consultation).length).map(frequency=>taskGroup(day,frequency,planner,view,'tasks-monthly',consultation)).join('');
  }
  function blockGroup(day,planner=false,view=''){
    const tasks=taskSnapshots(day,null,selectedDate,'block',view,'blocks'),complete=planner&&tasks.length>0&&Boolean(day.finalized);
    if(planner)return `<section class="planner-block planner-task-block planner-block-tasks"><h2><button type="button" class="planner-block-link" data-open-task-day><span class="planner-heading-icon" aria-hidden="true">▣</span><span>Blocos</span></button>${plannerDoneMark(complete)}</h2><div class="planner-block-body">${tasks.length?tasks.map(task=>taskRow(task,false,false)).join(''):'<p class="planner-empty">Nenhum bloco neste dia.</p>'}</div></section>`;
    return `<section class="task-group task-block-group"><h3>Blocos</h3>${tasks.length?tasks.map(task=>taskRow(task,!day.finalized,true,true)).join(''):'<p class="planner-empty">Nenhum bloco neste dia.</p>'}</section>`;
  }
  function taskManageType(task){return task.consultation===true?'consultation':task.kind==='block'?'block':'regular';}
  function taskManageTypeLabel(task){return task.consultation===true?'Consulta':task.kind==='block'?'Bloco':'Tarefa';}
  function taskManageSortValue(task,key){
    if(key==='name')return task.name;
    if(key==='frequency')return Object.keys(TASK_FREQUENCY_LABELS).indexOf(task.frequency);
    if(key==='type')return ({regular:0,block:1,consultation:2}[taskManageType(task)]);
    if(key==='area')return taskAreaName(task);
    if(key==='days'){const days=[...(task.weekdays||[])].sort((a,b)=>a-b);return days.length?days[0]*10+days.length:99;}
    if(key==='steps')return (task.items||[]).filter(item=>item.active!==false).length;
    if(key==='start')return task.startDate||'9999-12-31';
    return '';
  }
  function sortTaskManageTasks(tasks,key,dir){
    const multiplier=dir==='desc'?-1:1;
    return [...tasks].sort((a,b)=>{
      if(key==='start'&&Boolean(a.startDate)!==Boolean(b.startDate))return a.startDate?-1:1;
      if(key==='area'&&Boolean(taskAreaName(a))!==Boolean(taskAreaName(b)))return taskAreaName(a)?-1:1;
      const left=taskManageSortValue(a,key),right=taskManageSortValue(b,key);
      const result=typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right),'pt-BR');
      return result*multiplier||a.name.localeCompare(b.name,'pt-BR');
    });
  }
  function taskManageTableHtml(tasks){
    const columns=[['name','Tarefa'],['frequency','Frequência'],['type','Tipo'],['area','Área'],['days','Dias'],['steps','Passos'],['start','Início']];
    const sorted=sortTaskManageTasks(tasks,taskManageSort.key,taskManageSort.dir);
    const headers=columns.map(([key,label])=>{
      const active=taskManageSort.key===key,mark=active?(taskManageSort.dir==='asc'?'↑':'↓'):'↕';
      return `<th scope="col" aria-sort="${active?(taskManageSort.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" class="record-sort-button${active?' is-sorted':''}" data-sort-task-manage="${key}">${label}<span class="record-sort-mark" aria-hidden="true">${mark}</span></button></th>`;
    }).join('');
    const rows=sorted.map(task=>{
      const items=(task.items||[]).filter(item=>item.active!==false);
      const days=(task.weekdays||[]).map(day=>WEEKDAYS[day]).join(', ')||'—';
      const frequency=`${taskFrequencyLabel(task.frequency)}${MONTHLY_TASK_FREQUENCIES.includes(task.frequency)?` · ${monthWeekLabel(task.monthWeek||1).toLowerCase()}`:''}`;
      const start=task.startDate?fmtDate(task.startDate,{day:'numeric',month:'short',year:'numeric'}):'—';
      return `<tr class="record-type-table-row"><td><span class="record-type-table-name"><span class="record-type-icon" style="--record-color:${escapeHTML(task.color||'#8fb2aa')}" aria-hidden="true">${escapeHTML(task.icon||'✓')}</span><strong>${escapeHTML(task.name)}</strong></span></td><td>${escapeHTML(frequency)}</td><td>${escapeHTML(taskManageTypeLabel(task))}</td><td>${escapeHTML(taskAreaName(task)||'—')}</td><td>${escapeHTML(days)}</td><td>${items.length}</td><td>${escapeHTML(start)}</td><td><button type="button" class="small-edit" data-edit-task="${escapeHTML(task.id)}">Editar</button></td></tr>`;
    }).join('');
    return `<div class="record-type-table-scroll"><table class="record-type-table task-manage-table"><thead><tr>${headers}<th scope="col" aria-label="Ações"></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function renderTasks(){
    postponedOriginsCache={date:'',map:null};
    $('#task-date').value=selectedDate;
    $('#task-weekday').textContent=fmtDate(selectedDate,{weekday:'long'});
    $('#task-date-label').textContent=fmtDate(selectedDate);
    $('#task-today').classList.toggle('hidden',selectedDate===isoToday());
    renderDayStatus('#task-day-status',selectedDate,'tasks');
    const day=ensureTaskDay(selectedDate);
    $('#finish-tasks-day').textContent=day.finalized?'Tarefas e blocos concluídos ✓':'Concluir tarefas e blocos';
    $('#finish-tasks-day').disabled=Boolean(day.finalized);
    $('#task-day-list').innerHTML=taskGroup(day,'weekly')+taskGroup(day,'biweekly')+monthlyTaskGroups(day)+blockGroup(day);
    const allTasks=state.tasks.filter(task=>!task.deleted),frequencyFilter=$('#task-filter-frequency').value,kindFilter=$('#task-filter-kind').value;
    const areaSelect=$('#task-filter-area'),previousArea=areaSelect.value,areaOptions=orderedActionAreas();
    areaSelect.innerHTML='<option value="">Todas</option>'+areaOptions.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    if([...areaSelect.options].some(option=>option.value===previousArea))areaSelect.value=previousArea;
    const areaFilter=areaSelect.value;
    const taskKind=taskManageType;
    const tasks=allTasks.filter(task=>(!frequencyFilter||task.frequency===frequencyFilter)&&(!kindFilter||taskKind(task)===kindFilter)&&(!areaFilter||(task.areaId||'')===areaFilter)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    $('#task-filter-count').textContent=(frequencyFilter||kindFilter||areaFilter)?`${tasks.length} de ${allTasks.length} ${allTasks.length===1?'item':'itens'}`:'';
    $$('.task-manage-view-button').forEach(button=>{const active=button.dataset.taskManageView===selectedTaskManageView;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    const tableView=selectedTaskManageView==='table';
    $('#task-manage-list').classList.toggle('hidden',tableView);
    $('#task-manage-table').classList.toggle('hidden',!tableView);
    const emptyHtml=allTasks.length?'<div class="empty-state"><span>⌕</span><h3>Nenhuma tarefa encontrada</h3><p>Altere ou limpe os filtros para ver outras tarefas.</p></div>':'<div class="empty-state"><span>✓</span><h3>Suas tarefas começam aqui</h3><p>Crie uma tarefa semanal, quinzenal ou periódica por mês, com passos se desejar.</p></div>';
    $('#task-manage-list').innerHTML=tasks.length?tasks.map(task=>{
      const items=(task.items||[]).filter(item=>item.active!==false),expanded=openManageTasks.has(task.id),area=taskArea(task);
      return `<article class="manage-card task-manage-card${expanded?' is-open':''}" style="--routine-color:${escapeHTML(task.color)}"><div class="manage-card-main"><span class="routine-icon">${escapeHTML(task.icon||'✓')}</span><div class="manage-info"><strong>${escapeHTML(task.name)}</strong><small>${area?`${escapeHTML(area.name)} · `:''}${task.consultation?'Consulta · ':task.kind==='block'?'Bloco · ':''}${taskFrequencyLabel(task.frequency)}${MONTHLY_TASK_FREQUENCIES.includes(task.frequency)?` · ${monthWeekLabel(task.monthWeek||1).toLowerCase()}`:''} · ${items.length} passos · ${(task.weekdays||[]).map(day=>WEEKDAYS[day]).join(', ')}${task.startDate?` · desde ${escapeHTML(fmtDate(task.startDate,{day:'numeric',month:'short',year:'numeric'}))}`:''}</small></div>${items.length?`<button type="button" class="manage-toggle" data-task-manage-toggle="${escapeHTML(task.id)}" aria-expanded="${expanded}" aria-controls="task-manage-steps-${escapeHTML(task.id)}" aria-label="${expanded?'Ocultar':'Mostrar'} passos de ${escapeHTML(task.name)}">▾</button>`:''}<button type="button" class="small-edit" data-edit-task="${escapeHTML(task.id)}">Editar</button></div>${items.length?`<div id="task-manage-steps-${escapeHTML(task.id)}" class="manage-step-list${expanded?'':' hidden'}"><ol>${items.map(item=>`<li>${escapeHTML(item.label)}</li>`).join('')}</ol></div>`:''}</article>`;
    }).join(''):emptyHtml;
    $('#task-manage-table').innerHTML=tasks.length?taskManageTableHtml(tasks):emptyHtml;
    const today=isoToday(),dates=Object.keys(state.taskHistory).filter(date=>date<=today&&Object.values(state.taskHistory[date]?.tasks||{}).some(task=>taskIsVisibleOnDay(task,date))).sort((a,b)=>b.localeCompare(a));
    $('#task-history-list').innerHTML=dates.length?dates.map(date=>{
      const entries=Object.values(state.taskHistory[date].tasks).filter(task=>taskIsVisibleOnDay(task,date)),registered=entries.filter(task=>taskIsRegistered(task)).length,expanded=openTaskHistoryDates.has(date),statusLabel={completed:'Concluída',open:'Pendente','not-realized':'Não realizada',postponed:'Adiada',canceled:'Cancelada'};
      return `<article class="history-card task-history-card${date<isoToday()&&dayStatus(date).taskPending?' is-incomplete':''}${expanded?' is-open':''}"><button type="button" class="task-history-day" data-task-history-date="${date}" aria-label="Abrir tarefas de ${escapeHTML(fmtDate(date))}"><span class="history-date"><strong>${escapeHTML(fmtDate(date,{day:'numeric'}))}</strong><small>${escapeHTML(fmtDate(date,{weekday:'long',month:'long'}))}</small></span><span class="history-stat"><strong>${registered}/${entries.length}</strong><small>tarefas registradas</small></span><span class="history-arrow" aria-hidden="true">→</span></button><button type="button" class="task-history-toggle" data-task-history-toggle="${date}" aria-expanded="${expanded}" aria-controls="task-history-items-${date}" aria-label="${expanded?'Ocultar':'Mostrar'} tarefas de ${escapeHTML(fmtDate(date))}">▾</button><div id="task-history-items-${date}" class="task-history-items${expanded?'':' hidden'}">${entries.map(task=>{const status=taskOccurrenceStatus(task);return `<div class="task-history-item is-${status}"><span class="task-history-icon">${escapeHTML(task.icon||'✓')}</span><span>${escapeHTML(task.name||'Tarefa')}</span><small>${escapeHTML(statusLabel[status]||'Pendente')}</small></div>`;}).join('')}</div></article>`;
    }).join(''):'<div class="empty-state"><span>✓</span><h3>Seu histórico vai aparecer aqui</h3><p>As tarefas programadas ficam registradas por dia.</p></div>';
  }
  function taskOccurrenceStatus(task){
    if(['postponed','canceled','not-realized','completed'].includes(task.reviewStatus))return task.reviewStatus;
    if(task.kind==='block'){const result=blockStatusOf(task);if(result==='realized'||result==='partial')return'completed';if(result==='not-realized')return'not-realized';}
    if(task.done)return'completed';if(task.doneTouched)return'not-realized';return'open';
  }
  function taskOverdueCutoffKey(date=selectedDate){const today=isoToday();return date<today?date:today;}
  function taskOverdueOccurrencesForDates(dates){
    const catalog=new Map(state.tasks.map(task=>[task.id,task])),occurrences=[];
    for(const dateKey of dates){
      const day=state.taskHistory[dateKey],snapshots=day?.tasks||{},excluded=day?.excludedTasks||{},ids=new Set(Object.keys(snapshots));
      for(const task of state.tasks){
        if(task.deleted||taskIsConsultation(task)||excluded[task.id])continue;
        if(dateKey<String(task.startDate||task.createdAt||dateKey).slice(0,10))continue;
        if(taskIsScheduled(task,dateKey))ids.add(task.id);
      }
      for(const id of ids){
        if(excluded[id])continue;
        const catalogTask=catalog.get(id);if(catalogTask?.deleted)continue;
        const source=snapshots[id]||catalogTask;if(!source)continue;
        const task={...source,taskId:source.taskId||id};
        if(taskIsConsultation(task)||taskOccurrenceStatus(task)!=='open')continue;
        occurrences.push({date:dateKey,id,task});
      }
    }
    return occurrences.sort((a,b)=>a.date.localeCompare(b.date)||a.task.name.localeCompare(b.task.name,'pt-BR'));
  }
  function overdueTaskOccurrences(date=selectedDate){
    const cutoffKey=taskOverdueCutoffKey(date),cutoff=safeDate(cutoffKey),weekday=safeDate(date).getDay();
    const activity=[...Object.keys(state.taskHistory||{}),...Object.keys(state.history||{}),...state.tasks.flatMap(task=>[String(task.startDate||'').slice(0,10),String(task.createdAt||'').slice(0,10)])].filter(Boolean).sort();
    const earliestKey=activity[0];if(!earliestKey)return[];
    const earliest=safeDate(earliestKey),dates=[];
    const cursor=new Date(cutoff);cursor.setDate(cursor.getDate()-(((cursor.getDay()-weekday)+7)%7||7));
    for(let weeks=0;weeks<12&&cursor>=earliest;weeks++){dates.push(isoDateKey(cursor));cursor.setDate(cursor.getDate()-7);}
    return taskOverdueOccurrencesForDates(dates);
  }
  function overdueTaskOccurrencesInWeek(date=selectedDate){
    const cutoffKey=taskOverdueCutoffKey(date);
    return taskOverdueOccurrencesForDates(weekDates(date).filter(key=>key<cutoffKey));
  }
  function overdueTaskOccurrencesInMonth(date=selectedDate){
    const cutoffKey=taskOverdueCutoffKey(date),month=String(date).slice(0,7),[year,monthNumber]=month.split('-').map(Number),length=new Date(year,monthNumber,0).getDate(),dates=[];
    for(let day=1;day<=length;day++){const key=`${month}-${String(day).padStart(2,'0')}`;if(key<cutoffKey)dates.push(key);}
    return taskOverdueOccurrencesForDates(dates);
  }
  function overdueActions(date=selectedDate){
    const cutoff=date<isoToday()?date:isoToday();
    return state.actions.filter(action=>!action.deleted&&!action.completed&&!action.study&&!action.leisure&&actionDueDate(action)&&actionDueDate(action)<cutoff).sort((a,b)=>actionDueDate(a).localeCompare(actionDueDate(b))||a.title.localeCompare(b.title,'pt-BR'));
  }
  function taskReviewOccurrences(){
    const today=isoToday(),period=$('#task-review-period').value,end=safeDate(today);end.setDate(end.getDate()-1);let start=new Date(end);
    if(period==='all'){const candidates=[...state.tasks.map(task=>task.startDate).filter(Boolean),...Object.keys(state.taskHistory)];start=safeDate(candidates.sort()[0]||today);const floor=new Date(end);floor.setFullYear(floor.getFullYear()-5);if(start<floor)start=floor;}else start.setDate(start.getDate()-(Number(period)||90)+1);
    const catalog=new Map(state.tasks.filter(task=>!task.deleted).map(task=>[task.id,task])),occurrences=[];
    for(const cursor=new Date(start);cursor<=end;cursor.setDate(cursor.getDate()+1)){
      const date=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`,day=state.taskHistory[date],snapshots=day?.tasks||{},ids=new Set([...Object.keys(snapshots),...state.tasks.filter(task=>!task.deleted&&!task.consultation&&date>=String(task.startDate||task.createdAt||task.updatedAt||date).slice(0,10)&&taskIsScheduled(task,date)).map(task=>task.id)]);
      for(const id of ids){const source=snapshots[id]||catalog.get(id);if(!source||taskIsConsultation(source))continue;const task={...source,taskId:source.taskId||id},status=taskOccurrenceStatus(task);occurrences.push({date,id,task,status});}
    }
    return occurrences.sort((a,b)=>b.date.localeCompare(a.date)||a.task.name.localeCompare(b.task.name,'pt-BR'));
  }
  function renderTaskReviewLegacy(){
    const filters=$('#task-review-filters');if(filters&&!$('#task-review-search'))filters.insertAdjacentHTML('afterbegin','<label>Buscar tarefa<input id="task-review-search" class="text-input" type="search" placeholder="Nome da tarefa"></label>');
    const all=taskReviewOccurrences(),search=($('#task-review-search')?.value||'').trim().toLocaleLowerCase('pt-BR'),frequency=$('#task-review-frequency').value,statusFilter=$('#task-review-status').value,closed=status=>status!=='open',visible=all.filter(item=>{const matchesStatus=!statusFilter||statusFilter==='closed'?(!statusFilter||closed(item.status)):item.status===statusFilter;const matchesSearch=!search||String(item.task.name||'').toLocaleLowerCase('pt-BR').includes(search);return(!frequency||item.task.frequency===frequency)&&matchesStatus&&matchesSearch;});
    const openCount=all.filter(item=>item.status==='open').length,closedCount=all.length-openCount;$('#task-review-summary').innerHTML=`<article><span>ABERTAS</span><strong>${openCount}</strong></article><article><span>FECHADAS</span><strong>${closedCount}</strong></article><article><span>OCORRÊNCIAS</span><strong>${all.length}</strong></article>`;
    const labels={open:'Aberta',completed:'Concluída','not-realized':'Não realizada',postponed:'Adiada',canceled:'Cancelada'},groups=new Map();for(const item of visible){const key=item.task.frequency||'weekly';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
    $('#task-review-list').innerHTML=visible.length?[...groups].map(([frequency,items])=>`<section class="task-review-group"><h3>${TASK_FREQUENCY_PLURAL[frequency]||taskFrequencyLabel(frequency)}</h3>${items.map(({date,id,task,status})=>`<article class="task-review-card is-${status}" data-review-date="${date}" data-review-task="${escapeHTML(id)}"><span class="task-review-icon">${escapeHTML(task.icon||'✓')}</span><div class="task-review-copy"><strong>${escapeHTML(task.name)}</strong><small>Prevista para ${escapeHTML(fmtDate(date,{weekday:'short',day:'numeric',month:'short',year:'numeric'}))}${task.reviewStatus==='postponed'&&task.postponedTo?` · adiada para ${escapeHTML(fmtDate(task.postponedTo,{day:'numeric',month:'short',year:'numeric'}))}`:''}</small></div><span class="task-review-status">${labels[status]}</span><div class="task-review-actions">${status==='open'?'<button type="button" data-review-action="complete">Concluir</button><button type="button" data-review-action="not-realized">Não realizada</button><button type="button" data-review-action="postpone">Adiar</button><button type="button" data-review-action="cancel">Cancelar</button>':'<button type="button" data-review-action="reopen">Reabrir</button>'}</div></article>`).join('')}</section>`).join(''):'<div class="empty-state"><span>✓</span><h3>Nenhuma ocorrência encontrada</h3><p>Altere os filtros ou o período da revisão.</p></div>';
  }
  function renderTaskReview(){
    const filters=$('#task-review-filters');if(filters&&!$('#task-review-search'))filters.insertAdjacentHTML('afterbegin','<label>Buscar tarefa<input id="task-review-search" class="text-input" type="search" placeholder="Nome da tarefa"></label>');
    const all=taskReviewOccurrences(),search=($('#task-review-search')?.value||'').trim().toLocaleLowerCase('pt-BR'),frequency=$('#task-review-frequency').value,statusFilter=$('#task-review-status').value,closed=status=>status!=='open';
    const visible=all.filter(item=>{const matchesStatus=!statusFilter||statusFilter==='closed'?(!statusFilter||closed(item.status)):item.status===statusFilter;return(!frequency||item.task.frequency===frequency)&&matchesStatus&&(!search||String(item.task.name||'').toLocaleLowerCase('pt-BR').includes(search));});
    const openCount=all.filter(item=>item.status==='open').length,closedCount=all.length-openCount;$('#task-review-summary').innerHTML=`<article><span>ABERTAS</span><strong>${openCount}</strong></article><article><span>FECHADAS</span><strong>${closedCount}</strong></article><article><span>OCORRÊNCIAS</span><strong>${all.length}</strong></article>`;
    const labels={open:'Aberta',completed:'Concluída','not-realized':'Não realizada',postponed:'Adiada',canceled:'Cancelada'},groups=new Map();
    for(const item of visible){const key=item.id;if(!groups.has(key))groups.set(key,{task:item.task,items:[]});groups.get(key).items.push(item);}
    const occurrenceCard=({date,id,task,status})=>{const locked=Boolean(state.taskHistory[date]?.finalized);return `<article class="task-review-occurrence is-${status}" data-review-date="${date}" data-review-task="${escapeHTML(id)}"><div class="task-review-occurrence-date"><strong>${escapeHTML(fmtDate(date,{weekday:'short',day:'numeric',month:'short',year:'numeric'}))}</strong>${task.reviewStatus==='postponed'&&task.postponedTo?`<small>Adiada para ${escapeHTML(fmtDate(task.postponedTo,{day:'numeric',month:'short',year:'numeric'}))}</small>`:''}${taskPostponementHistory(task,date).length?`<small class="task-review-postponements">${taskPostponementHistory(task,date).map(entry=>`${escapeHTML(fmtDate(entry.from,{day:'2-digit',month:'2-digit'}))} → ${escapeHTML(fmtDate(entry.to,{day:'2-digit',month:'2-digit'}))}`).join(' · ')}</small>`:''}</div><span class="task-review-status">${labels[status]}</span><div class="task-review-actions">${locked?'<span class="task-review-locked">Dia concluído</span>':status==='open'?'<button type="button" data-review-action="complete">Concluir</button><button type="button" data-review-action="not-realized">Não realizada</button><button type="button" data-review-action="postpone">Adiar</button><button type="button" data-review-action="cancel">Cancelar</button>':'<button type="button" data-review-action="reopen">Reabrir</button>'}</div></article>`;};
    $('#task-review-list').innerHTML=groups.size?[...groups.values()].sort((a,b)=>a.task.name.localeCompare(b.task.name,'pt-BR')).map(({task,items})=>{const open=items.filter(item=>item.status==='open').length,done=items.length-open;return `<details class="task-review-task-group" open><summary><span class="task-review-icon">${escapeHTML(task.icon||'✓')}</span><span class="task-review-task-title"><strong>${escapeHTML(task.name)}</strong><small>${TASK_FREQUENCY_LABELS[task.frequency]||taskFrequencyLabel(task.frequency)} · ${items.length} ${items.length===1?'ocorrência':'ocorrências'}</small></span><span class="task-review-task-counts"><b class="is-open">${open} abertas</b><b class="is-closed">${done} fechadas</b></span></summary><div class="task-review-occurrences">${items.sort((a,b)=>b.date.localeCompare(a.date)).map(occurrenceCard).join('')}</div></details>`}).join(''):'<div class="empty-state"><span>✓</span><h3>Nenhuma ocorrência encontrada</h3><p>Altere os filtros ou o período da revisão.</p></div>';
  }
  function postponedOriginsFor(date){
    if(postponedOriginsCache.date===date&&postponedOriginsCache.map)return postponedOriginsCache.map;
    const map=new Map();
    for(const [originDate,day] of Object.entries(state.taskHistory||{}))for(const [id,task] of Object.entries(day.tasks||{}))if(task.postponedTo===date&&!map.has(id))map.set(id,originDate);
    postponedOriginsCache={date,map};return map;
  }
  function taskPostponementHistory(task,date){
    const list=Array.isArray(task.postponements)?task.postponements:[];
    if(list.length)return list;
    if(task.manualOccurrence&&task.originalDate&&task.originalDate!==date)return [{from:task.originalDate,to:date,at:task.doneChangedAt||task.reviewChangedAt||''}];
    const origin=postponedOriginsFor(date).get(task.taskId||task.id);
    return origin?[{from:origin,to:date,at:''}]:[];
  }
  function postponeTaskOccurrence(date,id){
    const day=ensureTaskDay(date),task=day.tasks[id];if(!task)return false;
    if(day.finalized){toast('Este dia já foi concluído e não pode mais ser alterado.');return false;}
    const suggested=new Date(safeDate(date));suggested.setDate(suggested.getDate()+7);
    const keyOf=value=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
    while(keyOf(suggested)<isoToday())suggested.setDate(suggested.getDate()+7);
    const target=prompt('Para qual data deseja adiar?',keyOf(suggested));
    if(!target||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(target))return false;
    const targetDay=ensureTaskDay(target);
    if(targetDay.finalized){toast('A data escolhida já foi concluída e não pode receber tarefas.');return false;}
    const now=stamp(),history=[...(task.postponements||[]),{from:date,to:target,at:now}];
    task.done=false;task.doneTouched=true;task.reviewStatus='postponed';task.postponedTo=target;task.postponements=history;task.doneChangedAt=now;task.reviewChangedAt=now;day.updatedAt=now;
    const existing=targetDay.tasks[id];
    if(!existing)targetDay.tasks[id]={...structuredClone(task),done:false,doneTouched:false,reviewStatus:'',postponedTo:'',postponements:history,manualOccurrence:true,originalDate:date,items:(task.items||[]).map(item=>({...item,done:false,touched:false}))};
    else existing.postponements=history;
    targetDay.updatedAt=now;saveLocal();return true;
  }
  function undoPostponement(date,id){
    const day=ensureTaskDay(date),task=day.tasks[id];if(!task)return false;
    if(day.finalized){toast('Este dia já foi concluído e não pode mais ser alterado.');return false;}
    if(task.postponedTo){
      const target=task.postponedTo,targetDay=state.taskHistory[target],targetTask=targetDay?.tasks?.[id];
      if(targetDay?.finalized){toast('A data de destino já foi concluída e não pode mais ser alterada.');return false;}
      if(targetTask?.postponedTo){toast('Desfaça primeiro o adiamento mais recente desta ocorrência.');return false;}
      const registered=targetTask&&taskIsRegistered(targetTask);
      const message=registered?`A ocorrência de ${fmtDate(target)} já tem registro. Cancelar o adiamento vai removê-la e reabrir ${fmtDate(date)}. Continuar?`:`Cancelar o adiamento? ${fmtDate(date)} voltará a ficar pendente e a ocorrência de ${fmtDate(target)} será removida.`;
      if(!confirm(message))return false;
      if(targetDay&&targetTask){delete targetDay.tasks[id];targetDay.updatedAt=stamp();}
      task.reviewStatus='';task.postponedTo='';task.doneTouched=false;task.done=false;task.doneChangedAt=stamp();
      const history=(task.postponements||[]).slice();if(history.length&&history[history.length-1].to===target)history.pop();
      if(history.length)task.postponements=history;else delete task.postponements;
      day.updatedAt=stamp();saveLocal();return true;
    }
    const history=taskPostponementHistory(task,date).slice(),last=history[history.length-1];
    if(!last||last.to!==date){toast('Esta ocorrência não foi adiada.');return false;}
    const originDay=ensureTaskDay(last.from),originTask=originDay.tasks[id];
    if(!originTask){toast('A ocorrência original não foi encontrada.');return false;}
    if(originDay.finalized){toast('A data de origem já foi concluída e não pode mais ser alterada.');return false;}
    if(originTask.postponedTo!==date){toast('A ocorrência original já foi alterada. Abra a data de origem para desfazer.');return false;}
    if(!confirm(`Voltar esta ocorrência para ${fmtDate(last.from)}? A ocorrência em ${fmtDate(date)} será removida.`))return false;
    delete day.tasks[id];day.updatedAt=stamp();
    originTask.reviewStatus='';originTask.postponedTo='';originTask.doneTouched=false;originTask.done=false;originTask.doneChangedAt=stamp();
    const originHistory=(originTask.postponements||[]).slice();if(originHistory.length&&originHistory[originHistory.length-1].to===date)originHistory.pop();
    if(originHistory.length)originTask.postponements=originHistory;else delete originTask.postponements;
    originDay.updatedAt=stamp();saveLocal();return true;
  }
  function reviewTaskOccurrence(date,id,action){
    const day=ensureTaskDay(date),task=day.tasks[id];if(!task)return;
    if(day.finalized){toast('Este dia já foi concluído e não pode mais ser alterado.');return;}
    const now=stamp();
    if(action==='complete'){task.done=true;task.doneTouched=true;task.reviewStatus='completed';if(task.kind==='block')task.blockStatus='realized';for(const item of task.items||[]){item.done=true;item.touched=true;item.changedAt=now;}}
    if(action==='not-realized'){task.done=false;task.doneTouched=true;task.reviewStatus='not-realized';if(task.kind==='block')task.blockStatus='not-realized';}
    if(action==='cancel'){task.done=false;task.doneTouched=true;task.reviewStatus='canceled';}
    if(action==='reopen'){task.done=false;task.doneTouched=false;task.reviewStatus='';task.blockStatus='';task.postponedTo='';}
    if(action==='postpone'){if(!postponeTaskOccurrence(date,id))return;}
    task.doneChangedAt=now;task.reviewChangedAt=now;day.updatedAt=now;saveLocal();renderTasks();renderTaskReview();renderPlanner();renderWeekly();renderTaskWeekly();renderTaskCalendar();renderSummary();toast('Ocorrência atualizada.');
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
    $('#task-focus-day').textContent=({planner:'Voltar à visão diária','planner-secondary':'Voltar à visão secundária',weekly:'Voltar à visão semanal',monthly:'Voltar à visão mensal',registries:'Voltar aos processos'}[taskFocusOriginSection]||'Voltar ao dia');
    const done=(task.items||[]).filter(item=>item.done).length,total=task.items?.length||0;
    $('#task-focus-count').textContent=(consultation?`Consulta ${taskFrequencyLabel(task.frequency).toLowerCase()} · sem conclusão necessária`:`${task.kind==='block'?'Bloco':'Tarefa'} ${taskFrequencyLabel(task.frequency).toLowerCase()}${total?` · ${done} de ${total} passos`:''}`)+(locked?' · dia concluído':'');
    $('#task-focus-description').textContent=task.description||'';
    $('#task-focus-description').classList.toggle('hidden',!task.description);
    const focusArea=taskArea(task),areaTag=$('#task-focus-area');
    areaTag.classList.toggle('hidden',!focusArea);areaTag.textContent=focusArea?.name||'';
    if(focusArea){areaTag.style.setProperty('--tag-color',focusArea.color||'#dcebe7');areaTag.style.setProperty('--tag-ink',plannerHeadingInk(focusArea.color));}
    const postponeHistory=taskPostponementHistory(task,date),postponedTo=task.reviewStatus==='postponed'&&task.postponedTo?task.postponedTo:'',lastPostpone=postponeHistory[postponeHistory.length-1],postponedFrom=lastPostpone&&lastPostpone.to===date?lastPostpone.from:'';
    const undoPostpone=$('#task-focus-undo-postpone');undoPostpone.classList.toggle('hidden',locked||!(postponedTo||postponedFrom));undoPostpone.textContent=postponedTo?'Cancelar adiamento':'Voltar à data original';
    $('#task-focus-postpone').classList.toggle('hidden',locked);
    $('#task-focus-remove-day').classList.toggle('hidden',locked);
    const postponeInfo=$('#task-focus-postpone-info');postponeInfo.classList.toggle('hidden',!postponedTo&&!postponedFrom);
    postponeInfo.innerHTML=`${postponedTo?`<strong>Adiada para ${escapeHTML(fmtDate(postponedTo))}</strong>`:postponedFrom?`<strong>Adiada de ${escapeHTML(fmtDate(postponedFrom))}</strong>`:''}${postponeHistory.length?`<ol class="focus-postpone-history">${postponeHistory.map(entry=>`<li><span>${escapeHTML(fmtDate(entry.from,{day:'2-digit',month:'2-digit'}))}</span><i aria-hidden="true">→</i><span>${escapeHTML(fmtDate(entry.to,{day:'2-digit',month:'2-digit'}))}</span></li>`).join('')}</ol>`:''}`;
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
    const day=ensureTaskDay(activeTaskDate||selectedDate);if(day.finalized){toast('Este dia já foi concluído e não pode mais ser alterado.');renderTaskFocus();return;}fn(day);day.updatedAt=stamp();saveLocal();renderTasks();renderPlanner();renderWeekly();renderTaskWeekly();renderTaskCalendar();renderSummary();renderTaskFocus();
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
  function renderWeeklyNotes(dates){
    const label=`${fmtDate(dates[0],{day:'numeric',month:'short'})} a ${fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'})}`;
    $('#weekly-notes-range').textContent=label;$('#weekly-registry-range').textContent=label;
    const notes=$('#weekly-notes-input');if(document.activeElement!==notes)notes.value=state.weekNotes?.[dates[0]]?.text||'';
    const registry=$('#weekly-registry-input');if(document.activeElement!==registry)registry.value=state.weekRegistries?.[dates[0]]?.text||'';
  }
  function renderMonthlyNotes(monthKey){
    const label=fmtDate(`${monthKey}-01`,{month:'long',year:'numeric'});
    $('#monthly-notes-range').textContent=label;$('#monthly-registry-range').textContent=label;
    const notes=$('#monthly-notes-input');if(document.activeElement!==notes)notes.value=state.monthNotes?.[monthKey]?.text||'';
    const registry=$('#monthly-registry-input');if(document.activeElement!==registry)registry.value=state.monthRegistries?.[monthKey]?.text||'';
  }
  function renderTimeline(){
    const unscheduledOpen=$('#planner-timeline .timeline-unscheduled')?.open??true;
    const date=selectedDate,day=ensureDay(date),taskDay=ensureTaskDay(date),areas=orderedAreas();
    const areaById=new Map(areas.map(area=>[area.id,area]));
    const scheduledAnchors=state.anchors.filter(anchor=>areaById.has(anchor.areaId)&&areaById.get(anchor.areaId)?.timelineView!==false&&dayIsScheduled(anchor,date));
    const hasTime=entry=>/^\d{2}:\d{2}$/.test(entry.scheduledTime||'');
    const todayTheme=scheduledAnchors.filter(anchor=>anchor.areaId==='area-tema-do-dia'&&!hasTime(anchor));
    const scheduledRoutines=groupInTimeline('routines')?Object.values(day.routines||{}):[];
    const taskGroup=task=>task.kind==='block'?'blocks':taskIsConsultation(task)?'consultations':taskFrequencyGroup(task.frequency);
    const visibleTasks=Object.values(taskDay.tasks||{}).filter(task=>taskIsVisibleOnDay(task,date)&&groupInTimeline(taskGroup(task)));
    const scheduledActions=groupInTimeline('actions')?state.actions.filter(action=>!action.study&&!action.leisure&&actionIsScheduled(action,date)):[];
    const scheduledStudies=groupInTimeline('studies')?state.actions.filter(action=>action.study&&actionIsScheduled(action,date)):[];
    const scheduledLeisure=groupInTimeline('leisure')?state.actions.filter(action=>action.leisure&&leisureIsScheduled(action,date)):[];
    const timed=[...scheduledRoutines.map(routine=>({...routine,type:'routine',id:routine.routineId})),...visibleTasks.map(task=>({...task,type:'task',id:task.taskId})),...scheduledAnchors.map(anchor=>({...anchor,type:'anchor',name:anchor.title,color:areaById.get(anchor.areaId)?.color||'#8eada8'})),...scheduledActions.map(action=>({...action,type:'action',name:actionDisplayTitle(action)})),...scheduledStudies.map(action=>({...action,type:'study',name:actionDisplayTitle(action)})),...scheduledLeisure.map(action=>({...action,type:'leisure',name:leisureDisplayTitle(action)}))].filter(hasTime).sort((a,b)=>a.scheduledTime.localeCompare(b.scheduledTime));
    const untimedRoutines=scheduledRoutines.filter(routine=>!hasTime(routine));
    const untimedTasks=visibleTasks.filter(task=>!hasTime(task));
    const untimedActions=scheduledActions.filter(action=>!hasTime(action)),untimedStudies=scheduledStudies.filter(action=>!hasTime(action)),untimedLeisure=scheduledLeisure.filter(action=>!hasTime(action));
    const anchors=areas.filter(area=>area.id!=='area-tema-do-dia').map(area=>({area,entries:scheduledAnchors.filter(anchor=>anchor.areaId===area.id&&!hasTime(anchor))})).filter(group=>group.entries.length);
    const minutes=value=>Number(value.slice(0,2))*60+Number(value.slice(3,5));
    const isToday=date===isoToday(),now=new Date();
    const nowMinutes=now.getHours()*60+now.getMinutes();
    const startHour=Math.min(5,...timed.map(entry=>Math.floor(minutes(entry.scheduledTime)/60)),...(isToday?[Math.floor(nowMinutes/60)]:[]));
    const duration=entry=>Math.max(5,Math.min(480,Number(entry.durationMinutes)||45));
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
      {label:'Ações',entries:untimedActions.map(action=>`<button type="button" data-timeline-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(actionDisplayTitle(action))}</button>`)},
      {label:'Estudos',entries:untimedStudies.map(action=>`<button type="button" data-timeline-study="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(actionDisplayTitle(action))}</button>`)},
      {label:'Lazer',entries:untimedLeisure.map(action=>`<button type="button" data-timeline-leisure="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(leisureDisplayTitle(action))}</button>`)}
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
    postponedOriginsCache={date:'',map:null};
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
    const overdue=overdueTaskOccurrences(selectedDate);
    const overdueWeek=overdueTaskOccurrencesInWeek(selectedDate);
    const overdueMonth=overdueTaskOccurrencesInMonth(selectedDate);
    const overdueActionEntries=overdueActions(selectedDate);
    const overdueOccurrenceEntries=occurrenceOverdueInstances(selectedDate);
    const routineBlock=view=>{const entries=dailyViewOfGroup('routines')===view?routines:[],complete=entries.length>0&&Boolean(day.finalized);return `<section class="planner-block planner-routines"><h2><button type="button" class="planner-block-link" data-open-routine-day><span class="planner-heading-icon" aria-hidden="true">☑</span><span>Rotinas do dia</span></button>${plannerDoneMark(complete)}</h2><div class="planner-block-body">${entries.length?entries.map(r=>{const total=(r.items||[]).length,done=(r.items||[]).filter(item=>item.done).length;return `<button type="button" class="planner-routine" data-planner-routine="${escapeHTML(r.routineId)}"><span>${escapeHTML(r.icon)}</span><strong>${escapeHTML(r.name)}</strong><small class="planner-routine-progress" aria-label="${done} de ${total} passos concluídos">${done}/${total}</small>${r.scheduledTime?`<time class="planner-routine-time">${escapeHTML(r.scheduledTime)}</time>`:''}</button>`;}).join(''):'<p class="planner-empty">Nenhuma rotina nesta visão.</p>'}</div></section>`;};
    const overdueTaskCard=(title,icon,entries)=>{
      if(!entries.length)return'';
      const groups=new Map();for(const item of entries){if(!groups.has(item.id))groups.set(item.id,{task:item.task,items:[]});groups.get(item.id).items.push(item);}
      const frequencyOrder=Object.keys(TASK_FREQUENCY_LABELS),groupRank=task=>task.kind==='block'?1:0,frequencyRank=task=>{const index=frequencyOrder.indexOf(task.frequency);return index<0?frequencyOrder.length:index;};
      const list=[...groups.values()].sort((a,b)=>groupRank(a.task)-groupRank(b.task)||frequencyRank(a.task)-frequencyRank(b.task)||a.task.name.localeCompare(b.task.name,'pt-BR'));
      return `<section class="planner-block planner-overdue"><h2><span class="planner-heading-icon" aria-hidden="true">${icon}</span><span>${escapeHTML(title)}</span><span class="planner-overdue-count" title="${list.length} ${list.length===1?'tarefa':'tarefas'} · ${entries.length} ${entries.length===1?'pendência':'pendências'}">${list.length}</span></h2><div class="planner-block-body">${list.map(({task,items})=>{const count=items.length,first=items[0],short=value=>fmtDate(value,{day:'2-digit',month:'2-digit'});const subtitle=count===1?`1 pendência em ${short(first.date)}`:`${count} pendências · desde ${short(first.date)}`;return `<details class="planner-overdue-item"><summary aria-label="${escapeHTML(task.name)} — ${count} ${count===1?'pendência':'pendências'}. Mostrar datas."><span class="planner-item-icon" aria-hidden="true">${escapeHTML(task.icon||'✓')}</span><span class="planner-overdue-copy"><strong>${escapeHTML(task.name)}</strong><small>${escapeHTML(subtitle)}</small></span><span class="planner-overdue-arrow" aria-hidden="true">⌄</span></summary><div class="planner-overdue-dates">${items.map(({date,id})=>`<button type="button" class="planner-overdue-date" data-open-task="${escapeHTML(id)}" data-task-overdue-date="${date}" title="${escapeHTML(fmtDate(date))}" aria-label="${escapeHTML(task.name)} — pendente em ${escapeHTML(fmtDate(date))}. Abrir tarefa.">${short(date)}</button>`).join('')}</div></details>`;}).join('')}</div></section>`;
    };
    const overdueBlock=view=>{
      if(dailyViewOfGroup('overdue')!==view)return'';
      return `${overdueTaskCard('Tarefas vencidas dia','⏰',overdue)}${overdueTaskCard('Tarefas vencidas semana','▤',overdueWeek)}${overdueTaskCard('Tarefas vencidas mês','▦',overdueMonth)}`;
    };
    const overdueActionBlock=view=>{
      const entries=dailyViewOfGroup('actions-overdue')===view?overdueActionEntries:[];if(!entries.length)return'';
      return `<section class="planner-block planner-block-actions planner-overdue-actions"><h2><button type="button" class="planner-block-link" data-open-action-week aria-label="Abrir Ações na visão semanal"><span class="planner-heading-icon" aria-hidden="true">⚑</span><span>Ações vencidas</span></button><span class="planner-overdue-count" title="${entries.length} ${entries.length===1?'ação vencida':'ações vencidas'}">${entries.length}</span></h2><div class="planner-block-body">${entries.map(action=>{const area=state.actionAreas.find(entry=>entry.id===action.areaId&&!entry.deleted),due=actionDueDate(action);return `<div class="planner-item planner-overdue-action${action.parentId?' is-subaction':''}"><span class="planner-item-icon" aria-hidden="true">${escapeHTML(action.icon||'✦')}</span><span class="planner-overdue-action-copy"><button type="button" class="planner-action-link" data-open-action="${escapeHTML(action.id)}">${escapeHTML(actionDisplayTitle(action))}</button><span class="planner-overdue-action-meta"><small class="planner-action-due">${escapeHTML(fmtDate(due,{day:'2-digit',month:'2-digit'}))}</small>${area?`<span class="planner-action-area-tag" style="--tag-color:${escapeHTML(area.color||'#dcebe7')};--tag-ink:${plannerHeadingInk(area.color)}">${escapeHTML(area.name)}</span>`:''}</span></span></div>`;}).join('')}</div></section>`;
    };
    const overdueOccurrenceBlock=view=>{
      const entries=dailyViewOfGroup('occurrences-overdue')===view?overdueOccurrenceEntries:[];if(!entries.length)return'';
      const groups=new Map();for(const entry of entries){if(!groups.has(entry.item.id))groups.set(entry.item.id,{item:entry.item,instances:[]});groups.get(entry.item.id).instances.push(entry);}
      const list=[...groups.values()].sort((a,b)=>a.instances[0].date.localeCompare(b.instances[0].date)||a.item.title.localeCompare(b.item.title,'pt-BR')),short=value=>fmtDate(value,{day:'2-digit',month:'2-digit'});
      return `<section class="planner-block planner-block-occurrences planner-overdue planner-overdue-occurrences"><h2><span class="planner-heading-icon" aria-hidden="true">◉</span><span>Acontecimentos vencidos</span><span class="planner-overdue-count" title="${list.length} ${list.length===1?'acontecimento':'acontecimentos'} · ${entries.length} ${entries.length===1?'pendência':'pendências'}">${list.length}</span></h2><div class="planner-block-body">${list.map(({item,instances})=>{const kind=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder,count=instances.length,first=instances[0],subtitle=count===1?`1 pendência em ${short(first.date)}`:`${count} pendências · desde ${short(first.date)}`;return `<details class="planner-overdue-item"><summary aria-label="${escapeHTML(item.title)} — ${count} ${count===1?'pendência':'pendências'}. Mostrar datas."><span class="planner-item-icon" aria-hidden="true">${escapeHTML(item.icon||kind.icon)}</span><span class="planner-overdue-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(subtitle)} · ${escapeHTML(kind.label)}</small></span><span class="planner-overdue-arrow" aria-hidden="true">⌄</span></summary><div class="planner-overdue-dates">${instances.map(instance=>`<button type="button" class="planner-overdue-date" data-open-occurrence="${escapeHTML(item.id)}" data-occurrence-date="${escapeHTML(instance.date)}" data-occurrence-key="${escapeHTML(instance.key)}" title="${escapeHTML(fmtDate(instance.date))}" aria-label="${escapeHTML(item.title)} — pendente em ${escapeHTML(fmtDate(instance.date))}. Abrir acontecimento.">${short(instance.date)}</button>`).join('')}</div></details>`;}).join('')}</div></section>`;
    };
    const actions=state.actions.filter(action=>!action.deleted&&action.schedule==='date'&&action.scheduledDate===selectedDate&&!action.study&&!action.leisure).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
    const studies=state.actions.filter(action=>!action.deleted&&action.study&&action.schedule==='date'&&action.scheduledDate===selectedDate).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
    const leisure=state.actions.filter(action=>!action.deleted&&action.leisure&&leisureIsScheduled(action,selectedDate)).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
    const actionBlock=view=>{const entries=dailyViewOfGroup('actions')===view?actions:[];return entries.length?`<section class="planner-block planner-block-actions"><h2><span class="planner-heading-icon" aria-hidden="true">✦</span><span>Ações</span></h2><div class="planner-block-body">${entries.map(action=>{const area=state.actionAreas.find(entry=>entry.id===action.areaId&&!entry.deleted);return `<div class="planner-item planner-action-item${action.parentId?' is-subaction':''}"><button type="button" class="planner-action-link" data-open-action="${escapeHTML(action.id)}">${escapeHTML(actionDisplayTitle(action))}</button>${area?`<span class="planner-action-area-tag" style="--tag-color:${escapeHTML(area.color||'#dcebe7')};--tag-ink:${plannerHeadingInk(area.color)}">${escapeHTML(area.name)}</span>`:''}</div>`;}).join('')}</div></section>`:'';};
    const studyBlock=view=>{const entries=dailyViewOfGroup('studies')===view?studies:[];return entries.length?`<section class="planner-block planner-block-studies"><h2><span class="planner-heading-icon">✎</span><span>Estudos</span></h2><div class="planner-block-body">${entries.map(action=>`<div class="planner-item planner-action-item${action.parentId?' is-subaction':''}"><button type="button" class="planner-action-link" data-open-study="${escapeHTML(action.id)}">${escapeHTML(actionDisplayTitle(action))}</button></div>`).join('')}</div></section>`:'';};
    const leisureBlock=view=>{const entries=dailyViewOfGroup('leisure')===view?leisure:[];return entries.length?`<section class="planner-block planner-block-studies"><h2><span class="planner-heading-icon">♡</span><span>Lazer</span></h2><div class="planner-block-body">${entries.map(action=>`<div class="planner-item planner-action-item${action.parentId?' is-subaction':''}"><button type="button" class="planner-action-link" data-open-leisure="${escapeHTML(action.id)}">${escapeHTML(leisureDisplayTitle(action))}</button></div>`).join('')}</div></section>`:'';};
    const habitBlock=view=>{const entries=dailyViewOfGroup('habits')===view?activeHabits():[];if(!entries.length)return'';return `<section class="planner-block planner-habits"><h2><span class="planner-heading-icon" aria-hidden="true">↻</span><span>Hábitos</span></h2><div class="planner-block-body">${entries.map(({project,task})=>{const done=habitDoneOn(task,selectedDate),future=selectedDate>isoToday(),progress=habitProgress(task,selectedDate.slice(0,7));return `<button type="button" class="planner-habit${done?' is-done':''}" style="--habit-color:${escapeHTML(projectAreaColor(project))}" data-toggle-habit="${escapeHTML(task.id)}" data-habit-project="${escapeHTML(project.id)}" data-habit-date="${selectedDate}" ${future?'disabled':''} aria-label="${done?'Desmarcar':'Marcar'} ${escapeHTML(task.title)} em ${escapeHTML(fmtDate(selectedDate))}"><span class="planner-habit-check" aria-hidden="true">${done?'✓':''}</span><span class="planner-habit-name">${escapeHTML(task.icon||'↻')} ${escapeHTML(task.title)}</span><small>${progress.percent===null?'—':`${Math.round(progress.percent)}%`}</small></button>`;}).join('')}</div></section>`;};
    const occurrences=state.occurrences.filter(item=>occurrenceAppearsOn(item,selectedDate)&&occurrenceVisibleOnDate(item,selectedDate)).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
    const occurrenceBlock=view=>{const entries=occurrences.filter(item=>dailyViewOfGroup(`occurrence-${item.type}`)===view);return entries.length?`<section class="planner-block planner-block-occurrences"><h2><span class="planner-heading-icon" aria-hidden="true">◉</span><span>Acontecimentos</span></h2><div class="planner-block-body">${entries.map(item=>{const kind=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder;return `<div class="planner-item planner-action-item occurrence-planner-row"><span class="planner-item-icon" aria-hidden="true">${escapeHTML(item.icon||kind.icon)}</span><button type="button" class="planner-action-link" data-open-occurrence="${escapeHTML(item.id)}" data-occurrence-date="${escapeHTML(selectedDate)}">${escapeHTML(item.title)}</button><span class="occurrence-type occurrence-type-${escapeHTML(item.type)}">${escapeHTML(kind.label)}</span>${item.consultative?'<span class="occurrence-status is-consultative">Consultivo</span>':''}</div>`;}).join('')}</div></section>`:'';};
    const plannerExtras=view=>`${dailyViewOfGroup('routines')===view?routineBlock(view):''}${dailyViewOfGroup('overdue')===view?overdueBlock(view):''}${dailyViewOfGroup('actions-overdue')===view?overdueActionBlock(view):''}${dailyViewOfGroup('occurrences-overdue')===view?overdueOccurrenceBlock(view):''}${dailyViewOfGroup('tasks-weekly')===view?taskGroup(taskDay,'weekly',true,view,'tasks-weekly',false):''}${dailyViewOfGroup('tasks-biweekly')===view?taskGroup(taskDay,'biweekly',true,view,'tasks-biweekly',false):''}${dailyViewOfGroup('tasks-monthly')===view?monthlyTaskGroups(taskDay,true,view):''}${dailyViewOfGroup('consultations')===view?taskGroup(taskDay,null,true,view,'consultations',true):''}${dailyViewOfGroup('blocks')===view?blockGroup(taskDay,true,view):''}${actionBlock(view)}${studyBlock(view)}${leisureBlock(view)}${habitBlock(view)}${occurrenceBlock(view)}`;
    $('#planner-grid').innerHTML=`${primaryBlocks.theme}<div class="planner-areas">${primaryBlocks.other||'<p class="planner-empty">Nenhum tipo de âncora na visão principal.</p>'}</div><div class="planner-extras">${plannerExtras('primary')}</div>`;
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
  function esmaltesData(){return Array.isArray(window.ANCORA_ESMALTES_DATA)?window.ANCORA_ESMALTES_DATA:[];}
  function esmaltesLatestMonth(){const dates=esmaltesData().map(item=>String(item.date||'')).filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date)).sort();return dates.length?dates[dates.length-1].slice(0,7):isoToday().slice(0,7);}
  function esmalteTextColor(color){const hex=String(color||'').replace('#','');if(!/^[0-9a-f]{6}$/i.test(hex))return '#1f2a2a';const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);return (r*299+g*587+b*114)/1000>150?'#1f2a2a':'#ffffff';}
  function esmalteChip(entry){const color=`#${String(entry.color||'D9D9D9').replace('#','')}`;return `<span class="esmalte-chip" style="--esmalte-color:${escapeHTML(color)};--esmalte-text:${esmalteTextColor(color)}" title="${escapeHTML(`${entry.part} · ${entry.name}`)}"><span class="esmalte-chip-name">${escapeHTML(entry.name)}</span></span>`;}
  function renderEsmaltes(){
    if(!selectedEsmaltesMonth)selectedEsmaltesMonth=esmaltesLatestMonth();
    const data=esmaltesData(),byDate=new Map(data.map(day=>[day.date,day.entries||[]])),[year,month]=selectedEsmaltesMonth.split('-').map(Number),first=new Date(year,month-1,1),start=new Date(year,month-1,1-(first.getDay()+6)%7),last=new Date(year,month,0),weeks=Math.ceil(((first.getDay()+6)%7+last.getDate())/7),dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const monthDays=data.filter(day=>String(day.date||'').startsWith(selectedEsmaltesMonth)),monthEntries=monthDays.reduce((sum,day)=>sum+(day.entries||[]).length,0);
    const heads=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map(label=>`<div class="action-calendar-heading">${label}</div>`).join('');
    const cells=[];
    for(let week=0;week<weeks;week++){
      for(let dayIndex=0;dayIndex<7;dayIndex++){
        const date=new Date(start);date.setDate(start.getDate()+week*7+dayIndex);
        const key=dateKey(date),inside=date.getMonth()===month-1,entries=inside?(byDate.get(key)||[]):[];
        const groups=['Mãos','Pés'].map(part=>{const partEntries=entries.filter(entry=>entry.part===part);if(!partEntries.length)return'';return `<div class="esmalte-day-group"><span class="esmalte-part">${escapeHTML(part)}</span><div class="esmalte-chips">${partEntries.map(esmalteChip).join('')}</div></div>`;}).join('');
        cells.push(`<div class="action-calendar-day esmaltes-calendar-day${inside?'':' is-outside'}${key===isoToday()?' is-today':''}"><div class="action-calendar-day-head"><span>${date.getDate()}</span>${entries.length?`<small>${entries.length}</small>`:''}</div><div class="action-calendar-items esmaltes-calendar-items">${groups}</div></div>`);
      }
    }
    const navigator=`<div class="date-navigator occurrence-calendar-navigator esmaltes-calendar-navigator"><button type="button" class="round-button" data-esmalte-month-shift="-1" aria-label="Mês anterior">‹</button><input type="month" value="${escapeHTML(selectedEsmaltesMonth)}" data-esmalte-month aria-label="Escolher mês do registro de esmaltes"><button type="button" class="round-button" data-esmalte-month-shift="1" aria-label="Próximo mês">›</button><button type="button" class="today-button${selectedEsmaltesMonth===isoToday().slice(0,7)?' hidden':''}" data-esmalte-month-today>Atual</button><button type="button" class="text-button" data-esmalte-month-latest>Último registro</button></div>`;
    $('#esmaltes-content').innerHTML=`<div class="occurrence-calendar-heading esmaltes-calendar-heading"><div><h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedEsmaltesMonth}-01`,{month:'long',year:'numeric'}))}</h3><span>${monthDays.length} ${monthDays.length===1?'dia com registro':'dias com registro'} · ${monthEntries} ${monthEntries===1?'esmalte':'esmaltes'}</span></div>${navigator}</div>${monthDays.length?'':'<p class="esmaltes-empty">Nenhum registro de esmalte neste mês.</p>'}<div class="action-calendar-scroll"><div class="action-calendar esmaltes-calendar">${heads}${cells.join('')}</div></div>`;
  }
  function renderSummaryWorkspace(){
    $$('.summary-tab').forEach(button=>{const active=button.dataset.summaryView===selectedSummaryView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const recordsView=selectedSummaryView==='recordacoes',esmaltesView=selectedSummaryView==='esmaltes';
    $('#summary-panel').classList.toggle('hidden',recordsView||esmaltesView);
    $('#summary-recordacoes').classList.toggle('hidden',!recordsView);
    $('#summary-esmaltes').classList.toggle('hidden',!esmaltesView);
    $('#summary-heading').textContent=recordsView?'Recordações.':esmaltesView?'Registro esmaltes.':'Resumo dos seus dias.';
    $('#summary-subtitle').textContent=recordsView?'Abra um mês para ver os registros de cada semana.':esmaltesView?'Veja no calendário os esmaltes usados em cada dia.':'Veja quantos dias ainda têm rotinas ou tarefas pendentes.';
    $('#summary-month-navigator').classList.toggle('hidden',recordsView||esmaltesView);
    if(recordsView)renderRecordacoes();else if(esmaltesView)renderEsmaltes();else renderSummary();
  }
  function weeklyHeaders(dates,kind='both'){
    return dates.map((date,index)=>{const status=dayStatus(date),incomplete=kind==='actions'?false:status.past&&(kind==='tasks'?status.taskPending:status.routinePending||status.taskPending),content=`<strong>${escapeHTML(fmtDate(date,{weekday:'long'}))}</strong><small>${escapeHTML(fmtDate(date,{day:'numeric',month:'short'}))}</small>${incomplete?'<em>Incompleto</em>':''}`,body=kind==='both'?`<button type="button" class="weekly-day-link" data-weekly-open-date="${date}" aria-label="Abrir visão diária de ${escapeHTML(fmtDate(date))}">${content}</button>`:kind==='tasks'?`<button type="button" class="weekly-day-link" data-task-week-open-date="${date}" aria-label="Abrir tarefas do dia de ${escapeHTML(fmtDate(date))}">${content}</button>`:content;return `<th scope="col" class="weekly-day weekly-day-${(index+1)%7}${date===isoToday()?' weekly-today':''}${incomplete?' weekly-incomplete':''}" ${date===isoToday()?'aria-current="date"':''}>${body}</th>`;}).join('');
  }
  function weekRoutinesFor(date){
    const history=state.history[date];
    if(date<isoToday()&&history&&(Object.keys(history.routines||{}).length||history.finalized))return Object.values(history.routines||{}).filter(routine=>!history.excludedRoutines?.[routine.routineId]).map(routine=>({id:routine.routineId,icon:routine.icon,name:routine.name}));
    return state.routines.filter(routine=>!routine.deleted&&dayIsScheduled(routine,date)&&!history?.excludedRoutines?.[routine.id]);
  }
  function renderWeekly(){
    const dates=weekDates(selectedWeekDate);
    $('#weekly-date').value=selectedWeekDate;
    $('#weekly-range-label').textContent=`${fmtDate(dates[0],{day:'numeric',month:'short'})} a ${fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'})}`;
    $('#weekly-today').classList.toggle('hidden',dates.includes(isoToday()));
    const monthWeek=monthWeekNumber(dates[3]);
    const monthWeekBadge=$('#weekly-month-week');monthWeekBadge.textContent=`Semana ${monthWeek}`;monthWeekBadge.title=`Semana ${monthWeek} do mês`;
    renderWeeklyNotes(dates);
    $$('.weekly-tab').forEach(button=>{const active=button.dataset.weeklyView===selectedWeeklyView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const groupsView=selectedWeeklyView==='groups';
    $('#weekly-grid').classList.toggle('hidden',groupsView);
    $('#weekly-groups').classList.toggle('hidden',!groupsView);
    $('#weekly-heading').textContent=groupsView?'Sua semana por grupos.':'Sua semana, de relance.';
    $('#weekly-subtitle').textContent=groupsView?'Ações, tarefas e acontecimentos da semana, organizados por grupo.':'As âncoras de cada tipo distribuídas pelos dias da semana.';
    if(groupsView){renderWeeklyGroups(dates);return;}
    const areas=orderedAreas().filter(area=>area.weeklyView!==false);
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
      ['routines','Rotinas','#e2eee6','☑',(date)=>weekRoutinesFor(date).map(item=>card(item.icon,item.name,`data-weekly-routine="${escapeHTML(item.id)}" data-weekly-routine-date="${date}"`))],
      ['tasks-weekly','Tarefas semanais','#e9e3f0','✓',(_,index)=>taskEntries(index,'weekly').map(item=>card(item.done?'✓':item.icon,item.name,`data-open-task="${escapeHTML(item.taskId)}" data-task-week-date="${dates[index]}" aria-label="${escapeHTML(item.name)}${item.done?' — concluída':' — não concluída'}"`,`weekly-task${item.done?' is-done':''}`))],
      ['tasks-biweekly','Tarefas quinzenais','#eee5dc','◫',(_,index)=>taskEntries(index,'biweekly').map(item=>card(item.done?'✓':item.icon,item.name,`data-open-task="${escapeHTML(item.taskId)}" data-task-week-date="${dates[index]}" aria-label="${escapeHTML(item.name)}${item.done?' — concluída':' — não concluída'}"`,`weekly-task${item.done?' is-done':''}`))],
      ['tasks-monthly','Tarefas mensais','#e6e9f3','▦',(_,index)=>MONTHLY_TASK_FREQUENCIES.flatMap(frequency=>taskEntries(index,frequency).map(item=>card(item.done?'✓':item.icon,item.name,`data-open-task="${escapeHTML(item.taskId)}" data-task-week-date="${dates[index]}" aria-label="${escapeHTML(item.name)}${item.done?' — concluída':' — não concluída'}"`,`weekly-task${item.done?' is-done':''}`)))],
      ['blocks','Blocos','#e6edf2','▣',(_,index)=>taskEntries(index,null,'block',false).map(item=>{const result=blockStatusOf(item);return card(result?'✓':item.icon,item.name,`data-open-task="${escapeHTML(item.taskId)}" data-task-week-date="${dates[index]}"`,`weekly-task${result?' is-done':''}`);} )],
      ['consultations','Consultas','#edf0e5','◌',(_,index)=>taskEntries(index,null,'regular',true).map(item=>card(item.icon,item.name,`data-open-task="${escapeHTML(item.taskId)}" data-task-week-date="${dates[index]}"`))],
      ['actions','Ações','#f3e6d7','✦',(date)=>state.actions.filter(item=>!item.deleted&&!item.study&&!item.leisure&&item.schedule==='date'&&actionIsScheduled(item,date)).map(item=>card(item.icon,actionDisplayTitle(item),`data-open-action="${escapeHTML(item.id)}"`))],
      ['studies','Estudos','#e8e7f3','✎',(date)=>state.actions.filter(item=>!item.deleted&&item.study&&item.schedule==='date'&&actionIsScheduled(item,date)).map(item=>card(item.icon||'✎',actionDisplayTitle(item),`data-open-study="${escapeHTML(item.id)}"`))],
      ['leisure','Lazer','#f4e1e9','♡',(date)=>state.actions.filter(item=>!item.deleted&&item.leisure&&leisureIsScheduled(item,date)).map(item=>card(item.icon||'♡',leisureDisplayTitle(item),`data-open-leisure="${escapeHTML(item.id)}"`))],
      ...Object.entries(OCCURRENCE_TYPES).map(([type,kind])=>[`occurrence-${type}`,`${kind.label}${type==='holiday'?'s':'s'}`,'#e8eeee',kind.icon,(date)=>state.occurrences.filter(item=>!item.deleted&&item.type===type&&occurrenceAppearsOn(item,date)&&occurrenceVisibleOnDate(item,date)).map(item=>card(item.icon||kind.icon,item.title,`data-open-occurrence="${escapeHTML(item.id)}" data-occurrence-date="${date}"`))])
    ];
    const groupRows=groupDefinitions.filter(([key])=>groupInWeekly(key)).map(([,label,color,icon,entriesFor])=>{
      const cells=dates.map((date,index)=>`<td>${entriesFor(date,index).join('')}</td>`).join('');
      return `<tr class="weekly-global-row" style="--area-color:${color}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${icon}</span><span>${escapeHTML(label)}</span></th>${cells}</tr>`;
    }).join('');
    const habitRows=groupInWeekly('habits')?activeHabits().map(({project,task})=>{const cells=dates.map(date=>{const started=!task.startDate||date>=task.startDate,future=date>isoToday(),done=habitDoneOn(task,date);if(!started)return '<td><span class="habit-cell is-off">·</span></td>';const label=`${done?'Desmarcar':'Marcar'} ${task.title} em ${fmtDate(date)}`;return `<td><button type="button" class="habit-cell ${done?'is-done':future?'is-off':'is-missed'}" data-toggle-habit="${escapeHTML(task.id)}" data-habit-project="${escapeHTML(project.id)}" data-habit-date="${date}" ${future?'disabled':''} aria-label="${escapeHTML(label)}">${done?'✓':future?'·':'×'}</button></td>`;}).join('');return `<tr class="weekly-global-row weekly-habit-row" style="--area-color:#e8f1ec;--habit-color:${escapeHTML(projectAreaColor(project))}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">↻</span><span>${escapeHTML(task.title)}</span><small>${escapeHTML(project.title)}</small></th>${cells}</tr>`;}).join(''):'';
    $('#weekly-grid').innerHTML=`<table class="weekly-table"><thead><tr><th scope="col" class="weekly-corner">Tipo / grupo</th>${headers}</tr></thead><tbody>${areaRows}${groupRows}${habitRows}</tbody></table>`;
  }
  function renderWeeklyGroups(dates){
    const dateLabel=value=>fmtDate(value,{day:'2-digit',month:'2-digit'});
    const card=(title,icon,color,items)=>items.length?`<section class="planner-block monthly-group" style="--area-color:${color}"><h2><span class="planner-heading-icon" aria-hidden="true">${icon}</span><span>${escapeHTML(title)}</span><span class="monthly-group-count">${items.length}</span></h2><div class="planner-block-body">${items.join('')}</div></section>`:'';
    const actionItem=(action,kind,date)=>{
      const area=kind==='action'?state.actionAreas.find(entry=>entry.id===action.areaId&&!entry.deleted):null;
      const attribute=kind==='study'?`data-open-study="${escapeHTML(action.id)}"`:kind==='leisure'?`data-open-leisure="${escapeHTML(action.id)}"`:`data-open-action="${escapeHTML(action.id)}"`;
      return `<button type="button" class="monthly-group-item${action.completed?' is-done':''}" ${attribute}><span class="monthly-group-date">${dateLabel(date)}</span><span class="monthly-group-copy"><strong>${escapeHTML(kind==='leisure'?leisureDisplayTitle(action):actionDisplayTitle(action))}</strong>${area?`<small>${escapeHTML(area.name)}</small>`:''}</span>${action.completed?'<span class="monthly-group-done" aria-hidden="true">✓</span>':''}</button>`;
    };
    const actionCard=(kind,title,icon,color)=>{
      const list=state.actions.filter(action=>!action.deleted&&(kind==='action'?!action.study&&!action.leisure:kind==='study'?action.study:action.leisure)&&(kind!=='leisure'||leisureInCalendar(action))).map(action=>{const date=dates.find(day=>kind==='leisure'?leisureIsScheduled(action,day):actionIsScheduled(action,day));return date?{action,date}:null;}).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date)||a.action.title.localeCompare(b.action.title,'pt-BR'));
      return card(title,icon,color,list.map(({action,date})=>actionItem(action,kind,date)));
    };
    const collectTasks=filter=>{
      const found=new Map();
      for(const date of dates){
        const day=state.taskHistory[date],snapshots=day?.tasks||{},excluded=day?.excludedTasks||{};
        for(const [id,snapshot] of Object.entries(snapshots)){
          if(excluded[id])continue;
          const catalog=state.tasks.find(task=>task.id===id);if(catalog?.deleted)continue;
          const source={...snapshot,taskId:id};
          if(!filter(source))continue;
          found.set(id+'|'+date,{id,date,source});
        }
        for(const task of state.tasks){
          if(task.deleted||excluded[task.id]||found.has(task.id+'|'+date)||!filter(task))continue;
          if(taskIsScheduled(task,date))found.set(task.id+'|'+date,{id:task.id,date,source:{...task,taskId:task.id}});
        }
      }
      return [...found.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.source.name.localeCompare(b.source.name,'pt-BR'));
    };
    const taskItem=({id,date,source})=>{const completed=taskOccurrenceStatus(source)==='completed';return `<button type="button" class="monthly-group-item${completed?' is-done':''}" data-open-task="${escapeHTML(id)}" data-task-date="${date}"><span class="monthly-group-date">${dateLabel(date)}</span><span class="monthly-group-copy"><strong>${escapeHTML(source.name)}</strong></span>${completed?'<span class="monthly-group-done" aria-hidden="true">✓</span>':''}</button>`;};
    const taskCards=MONTHLY_TASK_FREQUENCIES.map(frequency=>card(`Tarefas ${TASK_FREQUENCY_PLURAL[frequency].toLowerCase()}`,'▦','#e6e9f3',collectTasks(task=>!task.consultation&&task.kind!=='block'&&task.frequency===frequency).map(taskItem)));
    const occurrenceCards=Object.entries(OCCURRENCE_TYPES).map(([type,kind])=>{
      const items=state.occurrences.filter(item=>!item.deleted&&item.type===type).map(item=>({item,dates:dates.filter(date=>occurrenceAppearsOn(item,date)&&occurrenceVisibleOnDate(item,date))})).filter(entry=>entry.dates.length).sort((a,b)=>a.dates[0].localeCompare(b.dates[0])||a.item.title.localeCompare(b.item.title,'pt-BR'));
      return card(`${kind.label}s`,kind.icon,'#e8e6f2',items.map(({item,dates:occurrenceDates})=>`<button type="button" class="monthly-group-item" data-open-occurrence="${escapeHTML(item.id)}" data-occurrence-date="${occurrenceDates[0]}"><span class="monthly-group-date">${dateLabel(occurrenceDates[0])}</span><span class="monthly-group-copy"><strong>${escapeHTML(item.title)}</strong>${occurrenceDates.length>1?`<small>até ${dateLabel(occurrenceDates[occurrenceDates.length-1])}</small>`:''}</span></button>`));
    });
    const weekHabits=groupInWeekly('habits')?activeHabits():[];
    const habitCard=card('Hábitos','↻','#e8f1ec',weekHabits.map(({project,task})=>{const progress=habitProgress(task,dates[3].slice(0,7));return `<button type="button" class="monthly-group-item habit-item" style="--habit-color:${escapeHTML(projectAreaColor(project))}" data-edit-habit="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}"><span class="monthly-group-date">${progress.done}/${progress.expected}</span><span class="monthly-group-copy"><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(project.title)} · esperado mensal</small></span>${progress.percent===100?'<span class="monthly-group-done" aria-hidden="true">✓</span>':''}</button>`;}));
    const cards=[actionCard('action','Ações','✦','#f3e6d7'),actionCard('study','Estudos','✎','#e8e7f3'),actionCard('leisure','Lazer','♡','#f4e1e9'),...taskCards,...occurrenceCards,habitCard].filter(Boolean);
    $('#weekly-groups').innerHTML=cards.length?cards.join(''):'<div class="empty-state"><span>▦</span><h3>Nenhum item nesta semana</h3><p>Ações, tarefas e acontecimentos da semana aparecem aqui.</p></div>';
  }
  function renderMonthly(){
    const [year,month]=selectedMonthlyMonth.split('-').map(Number),weeks=monthlyWeeksFor(selectedMonthlyMonth);
    const lastDay=new Date(year,month,0).getDate();
    const monthDates=Array.from({length:lastDay},(_,index)=>`${selectedMonthlyMonth}-${String(index+1).padStart(2,'0')}`);
    $('#monthly-date').value=selectedMonthlyMonth;
    $('#monthly-range-label').textContent=fmtDate(`${selectedMonthlyMonth}-01`,{month:'long',year:'numeric'});
    $('#monthly-today').classList.toggle('hidden',selectedMonthlyMonth===isoToday().slice(0,7));
    renderMonthlyNotes(selectedMonthlyMonth);
    $$('.monthly-tab').forEach(button=>{const active=button.dataset.monthlyView===selectedMonthlyView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const groupsView=selectedMonthlyView==='groups';
    $('#monthly-grid').classList.toggle('hidden',groupsView);
    $('#monthly-groups').classList.toggle('hidden',!groupsView);
    $('#monthly-heading').textContent=groupsView?'Seu mês por grupos.':'Suas semanas do mês.';
    $('#monthly-subtitle').textContent=groupsView?'Ações, tarefas e acontecimentos do mês, organizados por grupo.':'Âncoras programadas para semanas específicas, organizadas por tipo.';
    if(groupsView){renderMonthlyGroups(monthDates);return;}
    const datesByWeek=new Map(weeks.map(week=>[week,monthDates.filter(date=>monthWeekMatches(week,date))]));
    const specificAnchors=state.anchors.filter(anchor=>!anchor.deleted&&anchor.scheduleType==='week'&&Array.isArray(anchor.monthWeeks)&&anchor.monthWeeks.length>0&&anchorAppearsInMonth(anchor,selectedMonthlyMonth));
    const areas=orderedAreas().filter(area=>specificAnchors.some(anchor=>anchor.areaId===area.id));
    const headers=weeks.map(week=>{
      const days=datesByWeek.get(week),[start,end]=monthWeekRange(selectedMonthlyMonth,week),key=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,range=days.length?`${fmtDate(key(start),{day:'numeric',month:'short'})} a ${fmtDate(key(end),{day:'numeric',month:'short'})}`:'Sem dias neste mês',content=`<span class="monthly-week-pill">${monthWeekLabel(week).toLowerCase()}</span><small>${escapeHTML(range)}</small>`;
      return `<th scope="col" class="monthly-week monthly-week-${week}${days.length?'':' is-empty'}">${days.length?`<button type="button" class="monthly-week-link" data-open-month-week="${key(start)}" aria-label="Abrir semana de ${escapeHTML(fmtDate(key(start),{day:'numeric',month:'long'}))}">${content}</button>`:content}</th>`;
    }).join('');
    if(!areas.length){$('#monthly-grid').innerHTML=`<table class="weekly-table monthly-table"><thead><tr><th scope="col" class="weekly-corner">Tipo</th>${headers}</tr></thead><tbody><tr><td colspan="${weeks.length+1}" class="monthly-empty">Nenhuma âncora de semanas específicas neste mês. Edite uma âncora e escolha as semanas para vê-la aqui.</td></tr></tbody></table>`;return;}
    const rows=areas.map(area=>{
      const cells=weeks.map(week=>{
        const entries=specificAnchors.filter(anchor=>anchor.areaId===area.id&&anchor.monthWeeks.includes(week)).sort((left,right)=>left.title.localeCompare(right.title,'pt-BR'));
        return `<td>${entries.map(anchor=>`<div class="weekly-anchor monthly-anchor" title="${escapeHTML(anchor.description||anchor.title)}"><span aria-hidden="true">${escapeHTML(anchor.icon||'✦')}</span><span>${escapeHTML(anchor.title)}</span></div>`).join('')}</td>`;
      }).join('');
      return `<tr style="--area-color:${escapeHTML(area.color)}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${AREA_ICONS[area.id]||'✦'}</span><span>${escapeHTML(area.name)}</span></th>${cells}</tr>`;
    }).join('');
    $('#monthly-grid').innerHTML=`<table class="weekly-table monthly-table"><thead><tr><th scope="col" class="weekly-corner">Tipo</th>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  function renderMonthlyGroups(monthDates){
    const monthKey=selectedMonthlyMonth,dateLabel=value=>fmtDate(value,{day:'2-digit',month:'2-digit'});
    const card=(title,icon,color,items)=>items.length?`<section class="planner-block monthly-group" style="--area-color:${color}"><h2><span class="planner-heading-icon" aria-hidden="true">${icon}</span><span>${escapeHTML(title)}</span><span class="monthly-group-count">${items.length}</span></h2><div class="planner-block-body">${items.join('')}</div></section>`:'';
    const actionItem=(action,kind)=>{
      const area=kind==='action'?state.actionAreas.find(entry=>entry.id===action.areaId&&!entry.deleted):null;
      const dateText=action.schedule==='date'?(action.scheduledDate?dateLabel(action.scheduledDate):'—'):(action.week?`Sem ${action.week}`:'Mês');
      const attribute=kind==='study'?`data-open-study="${escapeHTML(action.id)}"`:kind==='leisure'?`data-open-leisure="${escapeHTML(action.id)}"`:`data-open-action="${escapeHTML(action.id)}"`;
      return `<button type="button" class="monthly-group-item${action.completed?' is-done':''}" ${attribute}><span class="monthly-group-date">${escapeHTML(dateText)}</span><span class="monthly-group-copy"><strong>${escapeHTML(kind==='leisure'?leisureDisplayTitle(action):actionDisplayTitle(action))}</strong>${area?`<small>${escapeHTML(area.name)}</small>`:''}</span>${action.completed?'<span class="monthly-group-done" aria-hidden="true">✓</span>':''}</button>`;
    };
    const actionSortKey=action=>action.schedule==='date'?action.scheduledDate||'':`${action.scheduledMonth||''}-${String(action.week||0).padStart(2,'0')}`;
    const actionCard=(kind,title,icon,color)=>{
      const list=state.actions.filter(action=>!action.deleted&&(kind==='action'?!action.study&&!action.leisure:kind==='study'?action.study:action.leisure)&&(kind!=='leisure'||leisureInCalendar(action))&&((action.schedule==='date'&&(action.scheduledDate||'').startsWith(monthKey))||(action.schedule==='month'&&action.scheduledMonth===monthKey))).sort((a,b)=>actionSortKey(a).localeCompare(actionSortKey(b))||a.title.localeCompare(b.title,'pt-BR'));
      return card(title,icon,color,list.map(action=>actionItem(action,kind)));
    };
    const collectTasks=filter=>{
      const found=new Map();
      for(const date of monthDates){
        const day=state.taskHistory[date],snapshots=day?.tasks||{},excluded=day?.excludedTasks||{};
        for(const [id,snapshot] of Object.entries(snapshots)){
          if(excluded[id])continue;
          const catalog=state.tasks.find(task=>task.id===id);if(catalog?.deleted)continue;
          const source={...snapshot,taskId:id};
          if(!filter(source))continue;
          found.set(id+'|'+date,{id,date,source});
        }
        for(const task of state.tasks){
          if(task.deleted||excluded[task.id]||found.has(task.id+'|'+date)||!filter(task))continue;
          if(taskIsScheduled(task,date))found.set(task.id+'|'+date,{id:task.id,date,source:{...task,taskId:task.id}});
        }
      }
      return [...found.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.source.name.localeCompare(b.source.name,'pt-BR'));
    };
    const taskItem=({id,date,source})=>{const completed=taskOccurrenceStatus(source)==='completed';return `<button type="button" class="monthly-group-item${completed?' is-done':''}" data-open-task="${escapeHTML(id)}" data-task-date="${date}"><span class="monthly-group-date">${dateLabel(date)}</span><span class="monthly-group-copy"><strong>${escapeHTML(source.name)}</strong></span>${completed?'<span class="monthly-group-done" aria-hidden="true">✓</span>':''}</button>`;};
    const monthlyCards=MONTHLY_TASK_FREQUENCIES.map(frequency=>card(`Tarefas ${TASK_FREQUENCY_PLURAL[frequency].toLowerCase()}`,'▦','#e6e9f3',collectTasks(task=>!task.consultation&&task.kind!=='block'&&task.frequency===frequency).map(taskItem)));
    const occurrenceCards=Object.entries(OCCURRENCE_TYPES).map(([type,kind])=>{
      const items=state.occurrences.filter(item=>!item.deleted&&item.type===type).map(item=>({item,dates:occurrenceViewDatesInMonth(item,monthKey).filter(date=>occurrenceVisibleOnDate(item,date))})).filter(entry=>entry.dates.length).sort((a,b)=>a.dates[0].localeCompare(b.dates[0])||a.item.title.localeCompare(b.item.title,'pt-BR'));
      return card(`${kind.label}s`,kind.icon,'#e8e6f2',items.map(({item,dates})=>`<button type="button" class="monthly-group-item" data-open-occurrence="${escapeHTML(item.id)}" data-occurrence-date="${dates[0]}"><span class="monthly-group-date">${dateLabel(dates[0])}</span><span class="monthly-group-copy"><strong>${escapeHTML(item.title)}</strong>${dates.length>1?`<small>até ${dateLabel(dates[dates.length-1])}</small>`:''}</span></button>`));
    });
    const monthHabits=activeHabits();
    const habitCard=card('Hábitos','↻','#e8f1ec',monthHabits.map(({project,task})=>{const progress=habitProgress(task,monthKey);return `<button type="button" class="monthly-group-item habit-item" style="--habit-color:${escapeHTML(projectAreaColor(project))}" data-edit-habit="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}"><span class="monthly-group-date">${progress.percent===null?'—':`${Math.round(progress.percent)}%`}</span><span class="monthly-group-copy"><strong>${escapeHTML(task.title)}</strong><small>${progress.done}/${progress.expected} no mês · ${escapeHTML(project.title)}</small></span></button>`;}));
    const cards=[actionCard('action','Ações','✦','#f3e6d7'),actionCard('study','Estudos','✎','#e8e7f3'),actionCard('leisure','Lazer','♡','#f4e1e9'),...monthlyCards,...occurrenceCards,habitCard].filter(Boolean);
    $('#monthly-groups').innerHTML=cards.length?cards.join(''):'<div class="empty-state"><span>▦</span><h3>Nenhum item neste mês</h3><p>Ações, tarefas e acontecimentos do mês aparecem aqui.</p></div>';
  }
  function recordTypeTargetOptions(kind){
    if(kind==='routine')return '<option value="">Selecione o passo…</option>'+state.routines.filter(routine=>!routine.deleted).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(routine=>{
      const steps=(routine.items||[]).filter(item=>item.active!==false);
      if(!steps.length)return '';
      return `<optgroup label="${escapeHTML(`${routine.icon?`${routine.icon} `:''}${routine.name}`)}">${steps.map(item=>`<option value="${escapeHTML(routine.id)}::${escapeHTML(item.id)}">${escapeHTML(item.label)}</option>`).join('')}</optgroup>`;
    }).join('');
    return '<option value="">Selecione…</option>'+state.tasks.filter(task=>!task.deleted).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(task=>`<option value="${escapeHTML(task.id)}">${escapeHTML(task.icon||'✓')} ${escapeHTML(task.name)}${taskIsConsultation(task)?' · Consulta':''}</option>`).join('');
  }
  function updateRecordTypeTargets(preserve=''){
    const select=$('#record-type-target'),current=preserve||select.value;
    select.innerHTML=recordTypeTargetOptions($('#record-type-kind').value);
    if([...select.options].some(option=>option.value===current))select.value=current;
  }
  function updateRecordTypeKindUI(){
    $('#record-type-target-label').textContent=$('#record-type-kind').value==='routine'?'Passo da rotina':'Tarefa vinculada';
    updateRecordTypeTargets();
  }
  function openRecordTypeDialog(id=''){
    const type=state.recordTypes.find(item=>item.id===id&&!item.deleted);
    $('#record-type-form').reset();
    $('#record-type-id').value=type?.id||'';
    $('#record-type-dialog-title').textContent=type?'Editar tipo de processo':'Novo tipo de processo';
    $('#record-type-name').value=type?.name||'';
    $('#record-type-icon').value=type?.icon||'';
    $('#record-type-category').value=type?.category||'record';
    $('#record-type-frequency').value=type?.frequency||'weekly';
    $('#record-type-kind').value=type?.kind||'task';
    $('#record-type-target-label').textContent=$('#record-type-kind').value==='routine'?'Passo da rotina':'Tarefa vinculada';
    const targetValue=type?(type.kind==='routine'?(type.targetId&&type.stepId?`${type.targetId}::${type.stepId}`:''):type.targetId):'';
    updateRecordTypeTargets(targetValue);
    $('#delete-record-type').classList.toggle('hidden',!type);
    $('#record-type-dialog').showModal();
  }
  function saveRecordType(event){
    event.preventDefault();
    const id=$('#record-type-id').value||uid(),name=$('#record-type-name').value.trim(),icon=$('#record-type-icon').value.trim(),category=$('#record-type-category').value,frequency=$('#record-type-frequency').value,kind=$('#record-type-kind').value,targetValue=$('#record-type-target').value;
    if(!name){toast('Dê um nome ao tipo de processo.');return;}
    if(!RECORD_CATEGORY_LABELS[category]){toast('Escolha uma categoria.');return;}
    let targetId=targetValue,stepId='';
    if(kind==='routine'){
      const [routineId,itemId]=targetValue.split('::');targetId=routineId||'';stepId=itemId||'';
      const routine=state.routines.find(item=>item.id===targetId&&!item.deleted);
      if(!routine||!routine.items?.some(item=>item.id===stepId)){toast('Escolha um passo válido da rotina.');return;}
    }else if(!targetValue){toast('Escolha uma tarefa.');return;}
    const existing=state.recordTypes.find(item=>item.id===id),now=stamp(),categoryChanged=existing?.category!==category;
    const next={id,name,icon,category,frequency,kind,targetId,stepId,createdAt:existing?.createdAt||now,categoryUpdatedAt:categoryChanged?now:(existing?.categoryUpdatedAt||''),updatedAt:now,deleted:false};
    if(existing)state.recordTypes=state.recordTypes.map(item=>item.id===id?next:item);else state.recordTypes.push(next);
    selectedRecordTypeCategory='';
    saveLocal();$('#record-type-dialog').close();renderRegistries();toast(`Tipo de processo salvo: ${RECORD_CATEGORY_LABELS[category]||category}.`);
  }
  function deleteRecordType(){
    const id=$('#record-type-id').value,type=state.recordTypes.find(item=>item.id===id&&!item.deleted);if(!type)return;
    if(!confirm(`Excluir “${type.name}”?`))return;
    type.deleted=true;type.updatedAt=stamp();saveLocal();$('#record-type-dialog').close();renderRegistries();toast('Tipo de processo excluído.');
  }
  function recordTypeOccurrences(type,limit=8){
    const target=type.kind==='task'?state.tasks.find(task=>task.id===type.targetId&&!task.deleted):state.routines.find(routine=>routine.id===type.targetId&&!routine.deleted);
    if(!target)return {target:null,step:null,occurrences:[]};
    const step=type.kind==='routine'?((target.items||[]).find(item=>item.id===type.stepId)||null):null;
    if(type.kind==='routine'&&!step)return {target,step:null,occurrences:[]};
    const consultation=type.kind==='task'&&taskIsConsultation(target);
    const today=isoToday(),floor=safeDate(today);floor.setFullYear(floor.getFullYear()-5);
    const startKey=String(target.startDate||target.createdAt||'').slice(0,10),start=startKey?safeDate(startKey):floor,earliest=start>floor?start:floor;
    const occurrences=[],cursor=safeDate(today);
    for(let guard=0;cursor>=earliest&&occurrences.length<limit&&guard<3700;guard++){
      const key=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
      if(type.kind==='task'){
        const day=state.taskHistory[key],snapshot=day?.tasks?.[target.id],excluded=day?.excludedTasks?.[target.id];
        if(!excluded&&(taskIsScheduled(target,key)||snapshot)){
          const record=snapshot?{...snapshot,taskId:target.id}:{...target,taskId:target.id},status=consultation?'completed':taskOccurrenceStatus(record);
          occurrences.push({date:key,status,done:consultation||status==='completed',total:0,doneCount:0});
        }
      }else{
        const day=state.history[key],excluded=day?.excludedRoutines?.[target.id];
        if(!excluded&&dayIsScheduled(target,key)){
          const snapshot=day?.routines?.[target.id],item=snapshot?.items?.find(entry=>entry.id===step.id),done=Boolean(item?.done);
          occurrences.push({date:key,status:done?'completed':(key===today?'open':(day?.finalized?'not-realized':'open')),done,total:0,doneCount:0});
        }
      }
      cursor.setDate(cursor.getDate()-1);
    }
    if(consultation&&!occurrences.length)occurrences.push({date:today,status:'completed',done:true,total:0,doneCount:0});
    return {target,step,occurrences};
  }
  function recordTypeCardStatus(occurrences){
    if(!occurrences.length)return {key:'empty',label:'Sem ocorrências'};
    const effective=occurrences.find(item=>!['postponed','canceled'].includes(item.status));
    if(!effective)return {key:'empty',label:'Sem pendências'};
    if(effective.done)return {key:'ok',label:'Em dia'};
    if(effective.date===isoToday())return {key:'pending',label:'Pendente hoje'};
    return {key:'late',label:'Atrasado'};
  }
  function recordOccurrenceLabel(item){
    return item.done?'Realizado':item.status==='postponed'?'Adiada':item.status==='canceled'?'Cancelada':item.status==='not-realized'?'Não realizado':item.date===isoToday()?'Pendente':'Atrasado';
  }
  function recordTypeInfo(type){
    const {target,step,occurrences}=recordTypeOccurrences(type);
    const linked=type.kind==='task'?Boolean(target):Boolean(target&&step);
    const status=recordTypeCardStatus(occurrences);
    const doneCount=occurrences.filter(item=>item.done).length,rate=occurrences.length?Math.round(doneCount/occurrences.length*100):0;
    const frequency=RECORD_FREQUENCY_LABELS[type.frequency]||'Semanal',category=RECORD_CATEGORY_LABELS[type.category]||'Registro';
    const linkLabel=type.kind==='task'?`Tarefa: ${target?.name||'item não encontrado'}`:`Rotina: ${target?.name||'item não encontrado'}${target&&!step?' · passo não encontrado':step?` · ${step.label}`:''}`;
    return {type,target,step,occurrences,linked,status,doneCount,rate,frequency,category,linkLabel,meta:`${category} · ${linkLabel}`,icon:type.icon||target?.icon||'✍',color:target?.color||'#8fb2aa'};
  }
  function recordTypeCardsHtml(infos){
    return infos.map(info=>{
      const {type,target,occurrences,linked,status,doneCount,rate,frequency,category,linkLabel,icon,color}=info;
      const rows=occurrences.map(item=>{
        const classes=item.done?'is-done':item.date===isoToday()?'is-pending':'is-open';
        const progress=item.total?`<span class="record-occurrence-progress">${item.doneCount}/${item.total}</span>`:'';
        const attributes=linked?type.kind==='task'?`data-record-task="${escapeHTML(target.id)}" data-record-date="${item.date}"`:`data-record-routine="${escapeHTML(target.id)}" data-record-date="${item.date}"`:'disabled';
        return `<li><button type="button" class="record-occurrence ${classes}" ${attributes}><span class="record-occurrence-date">${escapeHTML(fmtDate(item.date,{weekday:'short',day:'2-digit',month:'2-digit'}))}</span><span class="record-occurrence-label">${recordOccurrenceLabel(item)}</span>${progress}</button></li>`;
      }).join('');
      const statusKey=linked?status.key:'empty',statusLabel=linked?status.label:'Sem vínculo';
      return `<article class="record-type-card${linked?'':' is-missing'}" style="--record-color:${escapeHTML(color)}"><header><span class="record-type-icon" aria-hidden="true">${escapeHTML(icon)}</span><div class="record-type-title"><strong>${escapeHTML(type.name)}</strong></div><span class="record-type-status is-${statusKey}">${escapeHTML(statusLabel)}</span></header><div class="record-directory-meta">${recordCategoryTagHtml(type.category,category)}<span class="record-directory-frequency">${escapeHTML(frequency)}</span></div><small class="record-directory-link">${escapeHTML(linkLabel)}</small><div class="record-type-summary"><span>${doneCount} de ${occurrences.length} realizadas</span><span>${rate}%</span></div><ul class="record-type-occurrences">${rows||'<li class="record-occurrence-empty">Nenhuma ocorrência registrada.</li>'}</ul><div class="record-type-actions"><button type="button" class="small-edit" data-edit-record-type="${escapeHTML(type.id)}">Editar</button></div></article>`;
    }).join('');
  }
  function recordTypeSortValue(info,key){
    if(key==='name')return info.type.name;
    if(key==='category')return info.category;
    if(key==='frequency')return Object.keys(RECORD_FREQUENCY_LABELS).indexOf(info.type.frequency);
    if(key==='link')return info.linkLabel;
    if(key==='status')return ({ok:0,pending:1,late:2,empty:3}[info.linked?info.status.key:'empty']);
    if(key==='done')return info.doneCount*1000+info.rate;
    if(key==='last')return info.occurrences[0]?.date||'';
    return '';
  }
  function sortRecordTypeInfos(infos,key,dir){
    const multiplier=dir==='desc'?-1:1;
    return [...infos].sort((a,b)=>{
      const left=recordTypeSortValue(a,key),right=recordTypeSortValue(b,key);
      const result=typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right),'pt-BR');
      return result*multiplier||a.type.name.localeCompare(b.type.name,'pt-BR');
    });
  }
  function recordTypeTableHtml(infos){
    const columns=[['name','Registro'],['category','Categoria'],['frequency','Frequência'],['link','Vínculo'],['status','Status'],['done','Realizadas'],['last','Última']];
    const sorted=sortRecordTypeInfos(infos,recordTypeSort.key,recordTypeSort.dir);
    const headers=columns.map(([key,label])=>{
      const active=recordTypeSort.key===key,mark=active?(recordTypeSort.dir==='asc'?'↑':'↓'):'↕';
      return `<th scope="col" aria-sort="${active?(recordTypeSort.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" class="record-sort-button${active?' is-sorted':''}" data-sort-record="${key}">${label}<span class="record-sort-mark" aria-hidden="true">${mark}</span></button></th>`;
    }).join('');
    return `<div class="record-type-table-scroll"><table class="record-type-table"><thead><tr>${headers}<th scope="col" aria-label="Ações"></th></tr></thead><tbody>${sorted.map(info=>{
      const {type,occurrences,linked,status,doneCount,rate,frequency,category,linkLabel,icon,color}=info;
      const statusKey=linked?status.key:'empty',statusLabel=linked?status.label:'Sem vínculo',latest=occurrences[0];
      return `<tr class="record-type-table-row${linked?'':' is-missing'}"><td><span class="record-type-table-name"><span class="record-type-icon" style="--record-color:${escapeHTML(color)}" aria-hidden="true">${escapeHTML(icon)}</span><strong>${escapeHTML(type.name)}</strong></span></td><td>${escapeHTML(category)}</td><td>${escapeHTML(frequency)}</td><td>${escapeHTML(linkLabel)}</td><td><span class="record-type-status is-${statusKey}">${escapeHTML(statusLabel)}</span></td><td>${occurrences.length?`${doneCount}/${occurrences.length} · ${rate}%`:'—'}</td><td>${latest?`${escapeHTML(fmtDate(latest.date,{day:'2-digit',month:'2-digit'}))} · ${escapeHTML(recordOccurrenceLabel(latest))}`:'—'}</td><td><button type="button" class="small-edit" data-edit-record-type="${escapeHTML(type.id)}">Editar</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function renderRecordTypes(){
    const all=state.recordTypes.filter(item=>!item.deleted),table=selectedRecordTypeView==='table',search=normalizeRecordSearch(recordTypeSearch.trim());
    $$('.record-type-view-button').forEach(button=>{const active=button.dataset.recordTypeView===selectedRecordTypeView;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    $('#record-type-list').classList.toggle('hidden',table);
    $('#record-type-table').classList.toggle('hidden',!table);
    const emptyAll='<div class="empty-state"><span>✍</span><h3>Nenhum tipo de processo ainda</h3><p>Crie um tipo e vincule a uma tarefa ou passo de rotina para acompanhar as ocorrências.</p></div>';
    if(!all.length){
      $('#record-type-filters').innerHTML='';
      if(table){$('#record-type-list').innerHTML='';$('#record-type-table').innerHTML=emptyAll;}
      else{$('#record-type-table').innerHTML='';$('#record-type-list').innerHTML=emptyAll;}
      return;
    }
    const visible=search?all.filter(type=>recordTypeMatchesSearch(type,search)):all;
    const counts={};for(const type of visible)counts[type.category]=(counts[type.category]||0)+1;
    $('#record-type-filters').innerHTML=[['','Todas',visible.length],...Object.entries(RECORD_CATEGORY_LABELS).map(([key,label])=>[key,label,counts[key]||0])].map(([value,label,count])=>`<button type="button" class="record-type-filter${selectedRecordTypeCategory===value?' is-active':''}" data-record-category="${value}" aria-pressed="${selectedRecordTypeCategory===value}">${label}<small>${count}</small></button>`).join('');
    if(!visible.length){
      const emptySearch='<div class="empty-state"><span>✍</span><h3>Nenhum tipo encontrado</h3><p>Revise a busca ou limpe o campo para ver todos os tipos.</p></div>';
      if(table){$('#record-type-list').innerHTML='';$('#record-type-table').innerHTML=emptySearch;}
      else{$('#record-type-table').innerHTML='';$('#record-type-list').innerHTML=emptySearch;}
      return;
    }
    const types=visible.filter(type=>!selectedRecordTypeCategory||type.category===selectedRecordTypeCategory).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    const infos=types.map(recordTypeInfo);
    if(!infos.length){
      const emptyFilter='<div class="empty-state"><span>✍</span><h3>Nenhum tipo nesta categoria</h3><p>Escolha outra categoria ou ajuste a busca.</p></div>';
      if(table){$('#record-type-list').innerHTML='';$('#record-type-table').innerHTML=emptyFilter;}
      else{$('#record-type-table').innerHTML='';$('#record-type-list').innerHTML=emptyFilter;}
      return;
    }
    if(table){$('#record-type-list').innerHTML='';$('#record-type-table').innerHTML=recordTypeTableHtml(infos);}
    else{$('#record-type-table').innerHTML='';$('#record-type-list').innerHTML=recordTypeCardsHtml(infos);}
  }
  function recordTypeTargetLabel(type){
    if(type.kind==='task'){
      const task=state.tasks.find(item=>item.id===type.targetId&&!item.deleted);
      return task?.name||'Item não encontrado';
    }
    const routine=state.routines.find(item=>item.id===type.targetId&&!item.deleted),step=routine?.items?.find(item=>item.id===type.stepId);
    if(!routine)return 'Item não encontrado';
    return `${routine.name}${step?` · ${step.label}`:' · Passo não encontrado'}`;
  }
  function recordCategoryTagHtml(key,label){
    const category=label||RECORD_CATEGORY_LABELS[key]||'Registro';
    return `<span class="record-directory-tag is-${escapeHTML(key)}">${escapeHTML(category)}</span>`;
  }
  function recordDirectoryCardHtml(group){
    const first=group.types[0],color=RECORD_CATEGORY_COLORS[first.category]||'#8fb2aa';
    const categoryOrder=Object.keys(RECORD_CATEGORY_LABELS),frequencyOrder=Object.keys(RECORD_FREQUENCY_LABELS),seen=new Set();
    const entries=[...group.types].sort((a,b)=>categoryOrder.indexOf(a.category)-categoryOrder.indexOf(b.category)||frequencyOrder.indexOf(a.frequency)-frequencyOrder.indexOf(b.frequency)||a.name.localeCompare(b.name,'pt-BR')).filter(type=>{
      const key=[type.category,type.frequency,type.kind,type.targetId,type.stepId].join('::');
      if(seen.has(key))return false;seen.add(key);return true;
    });
    const count=entries.length;
    const rows=entries.map(type=>{
      const category=RECORD_CATEGORY_LABELS[type.category]||'Registro',frequency=RECORD_FREQUENCY_LABELS[type.frequency]||'Semanal';
      return `<div class="record-directory-entry"><div class="record-directory-entry-head">${recordCategoryTagHtml(type.category,category)}<span class="record-directory-frequency">${escapeHTML(frequency)}</span></div><small class="record-directory-link">${escapeHTML(recordTypeTargetLabel(type))}</small></div>`;
    }).join('');
    return `<article class="record-type-card record-directory-card" style="--record-color:${color}"><header><span class="record-type-icon" aria-hidden="true">${escapeHTML(first.icon||'✍')}</span><div class="record-type-title"><strong>${escapeHTML(group.name)}</strong><small>${count===1?'1 cadastro':`${count} cadastros`}</small></div></header><div class="record-directory-entries">${rows}</div></article>`;
  }
  function recordDirectoryGroups(types){
    const groups=new Map();
    for(const type of types){
      const name=String(type.name||'').trim(),key=name.toLocaleLowerCase('pt-BR');
      if(!key)continue;
      if(!groups.has(key))groups.set(key,{name,types:[]});
      groups.get(key).types.push(type);
    }
    return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  }
  function normalizeRecordSearch(value){
    return String(value||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function recordTypeMatchesSearch(type,search){
    if(!search)return true;
    const text=[type.name,RECORD_CATEGORY_LABELS[type.category]||'Registro',RECORD_FREQUENCY_LABELS[type.frequency]||'Semanal',recordTypeTargetLabel(type)].join(' ');
    return normalizeRecordSearch(text).includes(search);
  }
  function renderRecordDirectory(){
    const list=$('#record-directory-list'),allTypes=state.recordTypes.filter(item=>!item.deleted),search=normalizeRecordSearch(recordDirectorySearch.trim());
    const allGroups=recordDirectoryGroups(allTypes),groups=search?recordDirectoryGroups(allTypes.filter(type=>recordTypeMatchesSearch(type,search))):allGroups;
    $('#record-directory-summary').textContent=allGroups.length?(search?`${groups.length} de ${allGroups.length} ${allGroups.length===1?'tópico':'tópicos'}`:`${allGroups.length} ${allGroups.length===1?'tópico':'tópicos'}`):'';
    if(!allGroups.length){list.innerHTML='<div class="empty-state"><span>✍</span><h3>Nenhum acompanhamento cadastrado ainda</h3><p>Crie um tipo na aba Processos para vê-lo listado aqui.</p></div>';return;}
    if(!groups.length){list.innerHTML='<div class="empty-state"><span>✍</span><h3>Nenhum tópico encontrado</h3><p>Revise a busca ou limpe o campo para ver todos os tópicos.</p></div>';return;}
    list.innerHTML=groups.map(recordDirectoryCardHtml).join('');
  }
  function recordLinkedEntries(){
    const items=new Map();
    const ensure=(key,base)=>{if(!items.has(key))items.set(key,{...base,topics:[]});return items.get(key);};
    for(const type of state.recordTypes.filter(item=>!item.deleted)){
      const info=recordTypeInfo(type);if(!info.linked)continue;
      if(type.kind==='task'){
        ensure(`task::${type.targetId}`,{kind:'task',id:type.targetId,name:info.target.name,context:'Tarefa',icon:info.target.icon||'✓',color:info.target.color||'#8fb2aa'}).topics.push({type,info});
      }else{
        ensure(`routine::${type.targetId}::${type.stepId}`,{kind:'routine',id:type.targetId,stepId:type.stepId,name:info.step.label,context:info.target.name,icon:info.target.icon||'✍',color:info.target.color||'#8fb2aa'}).topics.push({type,info});
      }
    }
    return [...items.values()].map(item=>{
      const categoryOrder=Object.keys(RECORD_CATEGORY_LABELS),seen=new Set();
      const topics=[...item.topics].sort((a,b)=>categoryOrder.indexOf(a.type.category)-categoryOrder.indexOf(b.type.category)||a.type.name.localeCompare(b.type.name,'pt-BR')).filter(({type})=>{
        const key=[String(type.name||'').trim().toLocaleLowerCase('pt-BR'),type.category,type.frequency,type.kind,type.targetId,type.stepId].join('::');
        if(seen.has(key))return false;seen.add(key);return true;
      });
      const categories=[...new Set(topics.map(({type})=>type.category))].sort((a,b)=>categoryOrder.indexOf(a)-categoryOrder.indexOf(b)).map(key=>({key,label:RECORD_CATEGORY_LABELS[key]||'Registro'}));
      const info=topics[0].info;
      return {...item,topics,categories,info,status:info.status,occurrences:info.occurrences,doneCount:info.doneCount,rate:info.rate};
    }).sort((a,b)=>a.kind!==b.kind?(a.kind==='task'?-1:1):a.name.localeCompare(b.name,'pt-BR'));
  }
  function recordLinkedCardHtml(item){
    const count=item.topics.length;
    const occurrenceRows=item.occurrences.map(occurrence=>{
      const classes=occurrence.done?'is-done':occurrence.date===isoToday()?'is-pending':'is-open';
      const progress=occurrence.total?`<span class="record-occurrence-progress">${occurrence.doneCount}/${occurrence.total}</span>`:'';
      const attributes=item.kind==='task'?`data-record-task="${escapeHTML(item.id)}" data-record-date="${escapeHTML(occurrence.date)}"`:`data-record-routine="${escapeHTML(item.id)}" data-record-date="${escapeHTML(occurrence.date)}"`;
      return `<li><button type="button" class="record-occurrence ${classes}" ${attributes}><span class="record-occurrence-date">${escapeHTML(fmtDate(occurrence.date,{weekday:'short',day:'2-digit',month:'2-digit'}))}</span><span class="record-occurrence-label">${recordOccurrenceLabel(occurrence)}</span>${progress}</button></li>`;
    }).join('');
    const topicRows=item.topics.map(({type})=>{
      const category=RECORD_CATEGORY_LABELS[type.category]||'Registro',frequency=RECORD_FREQUENCY_LABELS[type.frequency]||'Semanal';
      return `<div class="record-linked-topic"><span class="record-linked-topic-name">${type.icon?`${escapeHTML(type.icon)} `:''}${escapeHTML(type.name)}</span>${recordCategoryTagHtml(type.category,category)}<span class="record-directory-frequency">${escapeHTML(frequency)}</span></div>`;
    }).join('');
    const editAttribute=item.kind==='task'?`data-edit-linked-task="${escapeHTML(item.id)}"`:`data-edit-linked-routine="${escapeHTML(item.id)}"`;
    return `<article class="record-type-card record-linked-card" style="--record-color:${escapeHTML(item.color)}"><header><button type="button" class="record-linked-open" ${editAttribute} aria-label="Editar ${escapeHTML(item.name)}"><span class="record-type-icon" aria-hidden="true">${escapeHTML(item.icon)}</span><span class="record-type-title"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.context)} · ${count} ${count===1?'tópico':'tópicos'}</small></span></button><span class="record-type-status is-${item.status.key}">${escapeHTML(item.status.label)}</span></header><div class="record-type-summary"><span>${item.doneCount} de ${item.occurrences.length} realizadas</span><span>${item.rate}%</span></div><ul class="record-type-occurrences">${occurrenceRows||'<li class="record-occurrence-empty">Nenhuma ocorrência registrada.</li>'}</ul><div class="record-linked-topics"><span class="record-linked-topics-label">Tópicos vinculados</span>${topicRows}</div></article>`;
  }
  function recordLinkedSortValue(item,key){
    if(key==='name')return item.name;
    if(key==='context')return item.context;
    if(key==='category')return item.categories.map(category=>category.label).join(', ');
    if(key==='status')return ({ok:0,pending:1,late:2,empty:3}[item.status.key]??4);
    if(key==='done')return item.doneCount*1000+item.rate;
    if(key==='last')return item.occurrences[0]?.date||'';
    if(key==='topics')return item.topics.map(({type})=>type.name).join(', ');
    return '';
  }
  function sortRecordLinkedItems(items,key,dir){
    const multiplier=dir==='desc'?-1:1;
    return [...items].sort((a,b)=>{
      const left=recordLinkedSortValue(a,key),right=recordLinkedSortValue(b,key);
      const result=typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right),'pt-BR');
      return result*multiplier||a.name.localeCompare(b.name,'pt-BR');
    });
  }
  function recordLinkedTableHtml(items){
    const columns=[['name','Item'],['context','Tipo'],['category','Categoria'],['status','Status'],['done','Realizadas'],['last','Última'],['topics','Tópicos']];
    const sorted=sortRecordLinkedItems(items,recordLinkedSort.key,recordLinkedSort.dir);
    const headers=columns.map(([key,label])=>{
      const active=recordLinkedSort.key===key,mark=active?(recordLinkedSort.dir==='asc'?'↑':'↓'):'↕';
      return `<th scope="col" aria-sort="${active?(recordLinkedSort.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" class="record-sort-button${active?' is-sorted':''}" data-sort-linked="${key}">${label}<span class="record-sort-mark" aria-hidden="true">${mark}</span></button></th>`;
    }).join('');
    return `<div class="record-type-table-scroll"><table class="record-type-table record-linked-table"><thead><tr>${headers}</tr></thead><tbody>${sorted.map(item=>{
      const latest=item.occurrences[0];
      const topics=item.topics.map(({type})=>{
        const category=RECORD_CATEGORY_LABELS[type.category]||'Registro',frequency=RECORD_FREQUENCY_LABELS[type.frequency]||'Semanal';
        return `<span class="record-linked-table-topic"><strong>${type.icon?`${escapeHTML(type.icon)} `:''}${escapeHTML(type.name)}</strong><small>${escapeHTML(category)} · ${escapeHTML(frequency)}</small></span>`;
      }).join('');
      return `<tr class="record-type-table-row"><td><button type="button" class="record-type-table-name record-linked-table-open" ${item.kind==='task'?`data-edit-linked-task="${escapeHTML(item.id)}"`:`data-edit-linked-routine="${escapeHTML(item.id)}"`} aria-label="Editar ${escapeHTML(item.name)}"><span class="record-type-icon" style="--record-color:${escapeHTML(item.color)}" aria-hidden="true">${escapeHTML(item.icon)}</span><strong>${escapeHTML(item.name)}</strong></button></td><td>${escapeHTML(item.context)}</td><td><div class="record-linked-table-categories">${item.categories.map(category=>recordCategoryTagHtml(category.key,category.label)).join('')}</div></td><td><span class="record-type-status is-${item.status.key}">${escapeHTML(item.status.label)}</span></td><td>${item.occurrences.length?`${item.doneCount}/${item.occurrences.length} · ${item.rate}%`:'—'}</td><td>${latest?`${escapeHTML(fmtDate(latest.date,{day:'2-digit',month:'2-digit'}))} · ${escapeHTML(recordOccurrenceLabel(latest))}`:'—'}</td><td><div class="record-linked-table-topics">${topics}</div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function recordLinkedMatchesSearch(item,search){
    if(!search)return true;
    const text=[item.name,item.context,item.status.label,...item.categories.map(category=>category.label),...item.topics.map(({type})=>type.name)].join(' ');
    return normalizeRecordSearch(text).includes(search);
  }
  function renderRecordLinked(){
    const list=$('#record-linked-list'),tableWrap=$('#record-linked-table'),allItems=recordLinkedEntries(),search=normalizeRecordSearch(recordLinkedSearch.trim()),items=search?allItems.filter(item=>recordLinkedMatchesSearch(item,search)):allItems,table=selectedRecordLinkedView==='table';
    $$('.record-linked-view-button').forEach(button=>{const active=button.dataset.recordLinkedView===selectedRecordLinkedView;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    list.classList.toggle('hidden',table);tableWrap.classList.toggle('hidden',!table);
    $('#record-linked-summary').textContent=allItems.length?(search?`${items.length} de ${allItems.length} ${allItems.length===1?'item':'itens'}`:`${allItems.length} ${allItems.length===1?'item':'itens'}`):'';
    if(!allItems.length){
      const empty='<div class="empty-state"><span>✍</span><h3>Nenhuma rotina ou tarefa vinculada ainda</h3><p>Vincule um tópico a uma tarefa ou passo de rotina na aba Processos.</p></div>';
      if(table){list.innerHTML='';tableWrap.innerHTML=empty;}else{tableWrap.innerHTML='';list.innerHTML=empty;}
      return;
    }
    if(!items.length){
      const empty='<div class="empty-state"><span>✍</span><h3>Nenhum item encontrado</h3><p>Revise a busca ou limpe o campo para ver todos os itens.</p></div>';
      if(table){list.innerHTML='';tableWrap.innerHTML=empty;}else{tableWrap.innerHTML='';list.innerHTML=empty;}
      return;
    }
    if(table){list.innerHTML='';tableWrap.innerHTML=recordLinkedTableHtml(items);}
    else{tableWrap.innerHTML='';list.innerHTML=items.map(recordLinkedCardHtml).join('');}
  }
  function weekRegistryLabel(dateKey){
    const dates=weekDates(dateKey),start=safeDate(dates[0]),end=safeDate(dates[6]),pad=value=>String(value).padStart(2,'0');
    return start.getMonth()===end.getMonth()?`${pad(start.getDate())} a ${pad(end.getDate())}-${pad(end.getMonth()+1)}-${end.getFullYear()}`:`${pad(start.getDate())}-${pad(start.getMonth()+1)} a ${pad(end.getDate())}-${pad(end.getMonth()+1)}-${end.getFullYear()}`;
  }
  function renderRecordacoes(){
    const months=new Map(),ensure=key=>{if(!months.has(key))months.set(key,{monthKey:key,monthText:'',weeks:[]});return months.get(key);};
    for(const [key,entry] of Object.entries(state.monthRegistries||{})){
      if(!/^\d{4}-\d{2}$/.test(key))continue;
      const text=String(entry?.text||'').trim();if(text)ensure(key).monthText=text;
    }
    for(const [key,entry] of Object.entries(state.weekRegistries||{})){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(key))continue;
      const text=String(entry?.text||'').trim();if(!text)continue;
      ensure(weekDates(key)[3].slice(0,7)).weeks.push({key,text});
    }
    const byYear=new Map();
    for(const record of months.values()){
      if(!record.monthText&&!record.weeks.length)continue;
      const year=record.monthKey.slice(0,4);if(!byYear.has(year))byYear.set(year,[]);byYear.get(year).push(record);
    }
    if(!byYear.size){$('#recordacoes-list').innerHTML='<div class="empty-state"><span>✍</span><h3>Nenhuma recordação ainda</h3><p>Use os campos “Registro da semana” e “Registro do mês” nas visões semanal e mensal.</p></div>';return;}
    $('#recordacoes-list').innerHTML=[...byYear.keys()].sort().reverse().map(year=>{
      const records=byYear.get(year).sort((a,b)=>a.monthKey.localeCompare(b.monthKey));
      return `<section class="registry-year"><h2>${escapeHTML(year)}</h2>${records.map(record=>{
        record.weeks.sort((a,b)=>a.key.localeCompare(b.key));
        const monthLabel=fmtDate(`${record.monthKey}-01`,{month:'long'}),title=monthLabel.charAt(0).toLocaleUpperCase('pt-BR')+monthLabel.slice(1);
        const count=record.weeks.length,head=`<span class="registry-month-name">${escapeHTML(title)}</span>${count?`<span class="registry-week-count">${count} ${count===1?'semana':'semanas'}</span><span class="registry-arrow" aria-hidden="true">▸</span>`:''}`;
        const monthText=record.monthText?`<p class="registry-month-text">${escapeHTML(record.monthText)}</p>`:'<p class="registry-empty">Sem registro do mês.</p>';
        if(!count)return `<article class="registry-month is-static"><div class="registry-month-head">${head}</div>${monthText}</article>`;
        const weeks=record.weeks.map(week=>`<article class="registry-week"><h4><span>${escapeHTML(weekRegistryLabel(week.key))}</span><span class="registry-week-number">Semana ${monthWeekNumber(weekDates(week.key)[3])}</span></h4><p>${escapeHTML(week.text)}</p></article>`).join('');
        return `<details class="registry-month"><summary><div class="registry-month-head">${head}</div>${monthText}</summary><div class="registry-weeks">${weeks}</div></details>`;
      }).join('')}</section>`;
    }).join('');
  }
  function renderRegistries(){
    $$('.registries-tab').forEach(button=>{const active=button.dataset.registriesView===selectedRegistriesView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const trackersView=selectedRegistriesView==='trackers',itemsView=selectedRegistriesView==='items',linkedView=selectedRegistriesView==='linked';
    $('#registries-trackers').classList.toggle('hidden',!trackersView);
    $('#registries-items').classList.toggle('hidden',!itemsView);
    $('#registries-linked').classList.toggle('hidden',!linkedView);
    $('#registries-heading').textContent=trackersView?'Acompanhamento de processos.':itemsView?'Tópicos cadastrados.':'Rotinas e Tarefas.';
    $('#registries-subtitle').textContent=trackersView?'Veja se os processos ligados a tarefas e rotinas estão em dia.':itemsView?'Veja cada tópico, os processos em que aparece, a frequência e a tarefa ou passo relacionado.':'Veja as tarefas e passos usados nos tópicos, seus processos, o status e as ocorrências do item.';
    if(trackersView)renderRecordTypes();
    if(itemsView)renderRecordDirectory();
    if(linkedView)renderRecordLinked();
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
    const rows=[['weekly','Semanais','#e2eee6','☑','regular','tasks-weekly',false],['biweekly','Quinzenais','#e9e3f0','◫','regular','tasks-biweekly',false],...MONTHLY_TASK_FREQUENCIES.map(frequency=>[frequency,TASK_FREQUENCY_PLURAL[frequency],'#e6e9f3','▦','regular','tasks-monthly',false]),[null,'Consultas','#edf0e5','◌','regular','consultations',true],[null,'Blocos','#e6edf2','▣','block','blocks',null]].map(([frequency,label,color,icon,kind,,consultation])=>{
      const cells=snapshots.map((day,index)=>{
        const tasks=taskSnapshots(day,frequency,dates[index],kind,'','',consultation);
        return `<td>${tasks.map(task=>{const result=blockStatusOf(task),completed=task.kind==='block'?Boolean(result):task.done;return `<button type="button" class="weekly-anchor weekly-task${completed&&!taskIsConsultation(task)?' is-done':''}" data-open-task="${escapeHTML(task.taskId)}" data-task-week-date="${dates[index]}" aria-label="${escapeHTML(task.name)}${taskIsConsultation(task)?' — consulta':task.kind==='block'?` — ${blockStatusLabel(result).toLowerCase()}`:task.done?' — concluída':' — não concluída'}"><span aria-hidden="true">${escapeHTML(task.icon||'✓')}</span><span>${escapeHTML(task.name)}</span>${result&&task.kind==='block'?`<small class="weekly-block-result is-${result}">${blockStatusLabel(result)}</small>`:''}</button>`;}).join('')}</td>`;
      }).join('');
      return `<tr style="--area-color:${color}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${icon}</span><span>${label}</span></th>${cells}</tr>`;
    }).join('');
    $('#task-week-grid').innerHTML=`<table class="weekly-table task-week-table"><thead><tr><th scope="col" class="weekly-corner">Tarefas</th>${weeklyHeaders(dates,'tasks')}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  function taskDatesInMonth(task,monthKey){
    const [year,month]=monthKey.split('-').map(Number),length=new Date(year,month,0).getDate(),dates=[];
    for(let day=1;day<=length;day++){const date=`${monthKey}-${String(day).padStart(2,'0')}`;if(taskIsScheduled(task,date))dates.push(date);}
    return dates;
  }
  function taskPlanningCard(task){
    return `<button type="button" class="weekly-anchor weekly-task task-planning-card" data-edit-task="${escapeHTML(task.id)}"><span aria-hidden="true">${escapeHTML(task.icon||'✓')}</span><span>${escapeHTML(task.name)}<small>${monthWeekLabel(task.monthWeek||1)} · ${(task.weekdays||[]).map(day=>WEEKDAYS[day]).join(', ')}</small></span></button>`;
  }
  function renderTaskMonthly(){
    $('#task-month-date').value=selectedTaskMonth;$('#task-month-range-label').textContent=fmtDate(`${selectedTaskMonth}-01`,{month:'long',year:'numeric'});$('#task-month-today').classList.toggle('hidden',selectedTaskMonth===isoToday().slice(0,7));
    const weeks=monthlyWeeksFor(selectedTaskMonth),headers=weeks.map(week=>monthlyWeekHeader(selectedTaskMonth,week)).join(''),tasks=state.tasks.filter(task=>!task.deleted&&MONTHLY_TASK_FREQUENCIES.includes(task.frequency));
    const rows=MONTHLY_TASK_FREQUENCIES.map(frequency=>{const cells=weeks.map(week=>`<td>${tasks.filter(task=>task.frequency===frequency&&Number(task.monthWeek||1)===week&&taskDatesInMonth(task,selectedTaskMonth).length).map(taskPlanningCard).join('')}</td>`).join('');return `<tr style="--area-color:#e6e9f3"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">▦</span><span>${TASK_FREQUENCY_PLURAL[frequency]}</span></th>${cells}</tr>`;}).join('');
    $('#task-month-grid').innerHTML=`<table class="weekly-table monthly-table task-month-table"><thead><tr><th scope="col" class="weekly-corner">Frequência</th>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  function renderTaskAnnual(){
    $('#task-annual-year').value=String(selectedTaskYear);$('#task-annual-range-label').textContent=String(selectedTaskYear);$('#task-annual-today').classList.toggle('hidden',selectedTaskYear===Number(isoToday().slice(0,4)));
    const months=Array.from({length:12},(_,index)=>`${selectedTaskYear}-${String(index+1).padStart(2,'0')}`),headers=months.map((month,index)=>`<th scope="col" data-open-task-month="${month}"><button type="button" class="annual-month-link" data-open-task-month="${month}"><span class="annual-month-label annual-month-${index+1}">${escapeHTML(fmtDate(`${month}-01`,{month:'short'}))}</span></button></th>`).join(''),tasks=state.tasks.filter(task=>!task.deleted&&MONTHLY_TASK_FREQUENCIES.includes(task.frequency));
    const rows=MONTHLY_TASK_FREQUENCIES.map(frequency=>{const monthly=frequency==='monthly',toggle=monthly?`<button type="button" class="annual-row-toggle" data-toggle-task-annual-monthly aria-expanded="${!taskAnnualMonthlyHidden}" aria-label="${taskAnnualMonthlyHidden?'Mostrar':'Ocultar'} tarefas mensais"><span aria-hidden="true">${taskAnnualMonthlyHidden?'▸':'▾'}</span><span>Mensais</span></button>`:`<span>${TASK_FREQUENCY_PLURAL[frequency]}</span>`;if(monthly&&taskAnnualMonthlyHidden)return `<tr class="task-annual-monthly-row is-collapsed" style="--area-color:#e6e9f3"><th scope="row" colspan="13"><span class="weekly-area-icon" aria-hidden="true">▦</span>${toggle}</th></tr>`;const cells=months.map(month=>`<td>${tasks.filter(task=>task.frequency===frequency&&taskDatesInMonth(task,month).length).map(taskPlanningCard).join('')}</td>`).join('');return `<tr${monthly?' class="task-annual-monthly-row"':''} style="--area-color:#e6e9f3"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">▦</span>${toggle}</th>${cells}</tr>`;}).join('');
    $('#task-annual-grid').innerHTML=`<table class="weekly-table task-annual-table"><thead><tr><th scope="col" class="weekly-corner">Frequência</th>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    setupTopScroll($('#task-annual-grid'));
  }
  function renderTaskCalendar(){
    $('#task-calendar-date').value=selectedTaskMonth;$('#task-calendar-range-label').textContent=fmtDate(`${selectedTaskMonth}-01`,{month:'long',year:'numeric'});$('#task-calendar-today').classList.toggle('hidden',selectedTaskMonth===isoToday().slice(0,7));
    const frequencyFilter=$('#task-calendar-filter-frequency').value,kindFilter=$('#task-calendar-filter-kind').value,taskKind=task=>task.consultation===true?'consultation':task.kind==='block'?'block':'regular';let visibleCount=0,totalCount=0;
    const [year,month]=selectedTaskMonth.split('-').map(Number),first=new Date(year,month-1,1),start=new Date(year,month-1,1-(first.getDay()+6)%7),last=new Date(year,month,0),weeks=Math.ceil(((first.getDay()+6)%7+last.getDate())/7);
    const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const heads=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map(label=>`<div class="action-calendar-heading">${label}</div>`).join('');
    const cells=Array.from({length:weeks*7},(_,index)=>{
      const date=new Date(start);date.setDate(start.getDate()+index);const key=dateKey(date),day=taskWeekSnapshot(key);
      const allTasks=Object.values(day.tasks||{}).filter(task=>taskIsVisibleOnDay(task,key));totalCount+=allTasks.length;const tasks=allTasks.filter(task=>(!frequencyFilter||task.frequency===frequencyFilter)&&(!kindFilter||taskKind(task)===kindFilter)).sort((a,b)=>(a.scheduledTime||'99:99').localeCompare(b.scheduledTime||'99:99')||a.name.localeCompare(b.name,'pt-BR'));visibleCount+=tasks.length;
      const cards=tasks.map(task=>{const consultation=taskIsConsultation(task),result=blockStatusOf(task),completed=!consultation&&(task.kind==='block'?Boolean(result):task.done),kind=consultation?'Consulta':task.kind==='block'?`Bloco · ${blockStatusLabel(result)}`:taskFrequencyLabel(task.frequency);return `<button type="button" class="action-calendar-item task-calendar-item${completed?' is-complete':''}" style="--action-color:${escapeHTML(task.color||'#87aaa2')}" data-open-task="${escapeHTML(task.taskId)}" data-task-calendar-task-date="${key}"><span aria-hidden="true">${escapeHTML(task.icon||'✓')}</span><span>${escapeHTML(task.name)}<small>${escapeHTML(kind)}</small></span></button>`;}).join('');
      return `<div class="action-calendar-day task-calendar-day${date.getMonth()!==month-1?' is-outside':''}${key===isoToday()?' is-today':''}"><div class="action-calendar-day-head"><button type="button" class="task-calendar-day-link" data-task-calendar-date="${key}" aria-label="Abrir tarefas de ${escapeHTML(fmtDate(key))}">${date.getDate()}</button></div><div class="action-calendar-items">${cards}</div></div>`;
    }).join('');
    $('#task-calendar-grid').innerHTML=`<div class="action-calendar-scroll"><div class="action-calendar">${heads}${cells}</div></div>`;
    $('#task-calendar-filter-count').textContent=(frequencyFilter||kindFilter)?`${visibleCount} de ${totalCount} ${totalCount===1?'item no calendário':'itens no calendário'}`:'';
  }
  function actionParent(action){return action?.parentId?state.actions.find(entry=>entry.id===action.parentId&&!entry.deleted)||null:null;}
  function actionDisplayTitle(action){const parent=actionParent(action);return parent?`↳ ${action.title} · ${parent.title}`:action.title;}
  function actionChildren(action){return state.actions.filter(entry=>!entry.deleted&&entry.parentId===action.id).sort((a,b)=>actionDueDate(a).localeCompare(actionDueDate(b))||a.title.localeCompare(b.title,'pt-BR'));}
  function actionParentHint(action){const parent=actionParent(action);return parent?`<small class="action-parent-hint">↳ ${escapeHTML(parent.title)}</small>`:'';}
  function actionCard(action){
    const schedule=actionScheduleLabel(action),children=actionChildren(action),parent=actionParent(action);
    const childList=children.map(child=>`<div class="action-card-child${child.completed?' is-complete':''}"><button type="button" data-toggle-action="${escapeHTML(child.id)}" aria-label="${child.completed?'Reabrir':'Concluir'} ${escapeHTML(child.title)}">${child.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(child.id)}"><strong>${child.icon?`${escapeHTML(child.icon)} `:''}${escapeHTML(child.title)}</strong><small>${escapeHTML(actionScheduleLabel(child)||'Sem período')}</small></button></div>`).join('');
    return `<div class="action-card${action.completed?' is-complete':''}${parent?' is-subaction':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action="${escapeHTML(action.id)}"><button type="button" class="action-card-main" data-edit-action="${escapeHTML(action.id)}" title="Abrir ou arrastar para outro mês"><span class="action-card-title">${action.icon?`<span class="action-card-mark">${escapeHTML(action.icon)}</span>`:''}<strong>${escapeHTML(action.title)}</strong></span>${parent?`<small class="action-parent-hint">↳ ${escapeHTML(parent.title)}</small>`:''}${schedule?`<small>${escapeHTML(schedule)}</small>`:''}</button>${children.length?`<details class="action-card-children"><summary>${children.length} ${children.length===1?'subação':'subações'}</summary><div>${childList}<button type="button" class="action-card-add-child" data-add-subaction="${escapeHTML(action.id)}">＋ Nova subação</button></div></details>`:''}</div>`;
  }
  function actionMonth(action){return action.schedule==='date'?action.scheduledDate?.slice(0,7)||'':action.scheduledMonth||'';}
  function actionWeek(action){return action.schedule==='date'&&action.scheduledDate?monthWeekNumber(action.scheduledDate):Number(action.week)||null;}
  function actionDueDate(action){
    if(action.dueDate)return action.dueDate;
    if(action.schedule==='date')return action.scheduledDate||'';
    if(!/^\d{4}-\d{2}$/.test(action.scheduledMonth||''))return '';
    const [year,month]=action.scheduledMonth.split('-').map(Number),last=new Date(year,month,0).getDate();
    if(!action.week)return `${action.scheduledMonth}-${String(last).padStart(2,'0')}`;
    for(let day=last;day>=1;day--){const date=`${action.scheduledMonth}-${String(day).padStart(2,'0')}`;if(monthWeekMatches(action.week,date))return date;}
    return '';
  }
  function actionStatus(action){return action.completed?'Concluída':actionDueDate(action)<isoToday()&&actionDueDate(action)?'Vencida':'Em aberto';}
  function renderActionWeekly(actions){
    const dates=weekDates(selectedActionWeekDate);
    $('#action-week-date').value=selectedActionWeekDate;
    $('#action-week-today').classList.toggle('hidden',dates.includes(isoToday()));
    const months=new Set(dates.map(date=>date.slice(0,7))),datedActions=actions.filter(action=>action.schedule==='date'&&dates.includes(action.scheduledDate)),undatedActions=actions.filter(action=>action.schedule==='month'&&months.has(action.scheduledMonth)&&(!Number(action.week)||dates.some(date=>monthWeekMatches(action.week,date))));
    const cells=dates.map(date=>{
      const entries=datedActions.filter(action=>actionIsScheduled(action,date));
      return `<td data-action-week-date="${date}"><div class="weekly-action-dropzone">${entries.map(action=>`<div class="weekly-action${action.completed?' is-complete':''}${action.parentId?' is-subaction':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action-week="${escapeHTML(action.id)}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}${actionParentHint(action)}</button></div>`).join('')}</div></td>`;
    }).join('');
    const undatedCards=undatedActions.map(action=>`<div class="weekly-action${action.completed?' is-complete':''}${action.parentId?' is-subaction':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action-week="${escapeHTML(action.id)}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}${actionParentHint(action)}<small>${action.week?monthWeekLabel(action.week):'Mês inteiro'}</small></button></div>`).join('');
    $('#actions-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(dates[0],{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'}))}</h3><div class="weekly-scroll"><table class="weekly-table action-week-table action-weekly-table"><thead><tr><th scope="col" class="weekly-corner">Ações</th>${weeklyHeaders(dates,'actions')}<th scope="col" class="monthly-week monthly-week-undated"><span class="monthly-week-pill">não agendadas</span><small>mês ou semana</small></th></tr></thead><tbody><tr style="--area-color:#f3e6d7"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">✦</span><span>Com data</span></th>${cells}<td class="monthly-undated-cell">${undatedCards||'<span class="planner-empty">Nenhuma ação nesta categoria.</span>'}</td></tr></tbody></table></div>`;
  }
  function renderActionMonthly(actions){
    const [year,month]=selectedActionMonth.split('-').map(Number),weeks=monthlyWeeksFor(selectedActionMonth);
    const headers=weeks.map(week=>monthlyWeekHeader(selectedActionMonth,week)).join('');
    const inMonth=action=>action.schedule==='date'?action.scheduledDate?.slice(0,7)===selectedActionMonth:action.scheduledMonth===selectedActionMonth;
    const datedActions=actions.filter(action=>inMonth(action)&&(action.schedule==='date'||(action.schedule==='month'&&Number(action.week)>0))),undatedActions=actions.filter(action=>inMonth(action)&&action.schedule==='month'&&!Number(action.week));
    const cells=weeks.map(week=>{const weekActions=datedActions.filter(action=>actionWeek(action)===week);return `<td data-action-month-week="${week}">${weekActions.map(action=>`<div class="weekly-action${action.completed?' is-complete':''}${action.parentId?' is-subaction':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action-monthly="${escapeHTML(action.id)}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}${actionParentHint(action)}</button></div>`).join('')}</td>`;}).join('');
    const undatedCards=undatedActions.map(action=>`<div class="weekly-action${action.completed?' is-complete':''}${action.parentId?' is-subaction':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action-monthly="${escapeHTML(action.id)}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}${actionParentHint(action)}<small>${action.week?monthWeekLabel(action.week):'Mês inteiro'}</small></button></div>`).join('');
    $('#actions-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedActionMonth}-01`,{month:'long',year:'numeric'}))}</h3><div class="weekly-scroll"><table class="weekly-table monthly-table action-monthly-table"><thead><tr><th scope="col" class="weekly-corner">Ações</th>${headers}<th scope="col" class="monthly-week monthly-week-undated"><span class="monthly-week-pill">sem data</span><small>mês inteiro</small></th></tr></thead><tbody>${datedActions.length||undatedActions.length?`<tr style="--area-color:#f3e6d7"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">✦</span><span>Com data</span></th>${cells}<td class="monthly-undated-cell">${undatedCards||'<span class="planner-empty">Nenhuma ação</span>'}</td></tr>`:'<tr><td colspan="${weeks.length+2}" class="monthly-empty">Nenhuma ação neste mês.</td></tr>'}</tbody></table></div>`;
  }
  function renderActionList(actions){
    const areaBox=$('#action-filter-area'),areaMenu=$('.multi-select-menu',areaBox),areas=orderedActionAreas(),areaSignature=areas.map(area=>`${area.id}:${area.name}`).join('|');
    if(areaMenu.dataset.signature!==areaSignature){
      const selected=new Set(multiSelectValues(areaBox));
      areaMenu.innerHTML=areas.map(area=>`<label class="multi-select-option"><input type="checkbox" value="${escapeHTML(area.id)}" ${selected.has(area.id)?'checked':''}><span>${escapeHTML(area.name)}</span></label>`).join('')+'<button type="button" class="multi-select-clear">Limpar seleção</button>';
      areaMenu.dataset.signature=areaSignature;
      setMultiSelectValues(areaBox,[...selected]);
    }
    const get=id=>$(id).value;
    const search=get('#action-filter-search').trim().toLocaleLowerCase('pt-BR'),statuses=multiSelectValues('#action-filter-status'),selectedAreas=multiSelectValues(areaBox),schedules=multiSelectValues('#action-filter-schedule'),month=get('#action-filter-month'),weeks=multiSelectValues('#action-filter-week');
    const dueFrom=get('#action-filter-due-from'),dueTo=get('#action-filter-due-to');
    const within=(date,from,to)=>(!from||date&&date>=from)&&(!to||date&&date<=to);
    const filtered=actions.filter(action=>{
      const due=actionDueDate(action),actionWeekValue=actionWeek(action);
      const statusMatches=!statuses.length||statuses.some(status=>(status==='open'&&!action.completed)||(status==='completed'&&action.completed)||(status==='overdue'&&actionStatus(action)==='Vencida'));
      return (!search||[action.title,action.description,action.notes,actionAreaName(action),actionParent(action)?.title].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(search)))
        &&statusMatches
        &&(!selectedAreas.length||selectedAreas.includes(action.areaId))
        &&(!schedules.length||schedules.includes(action.schedule))
        &&(!month||actionMonth(action)===month)
        &&(!weeks.length||(action.schedule==='date'&&action.scheduledDate?weeks.some(week=>monthWeekMatches(Number(week),action.scheduledDate)):actionWeekValue!==null&&weeks.includes(String(actionWeekValue))))
        &&within(due,dueFrom,dueTo);
    });
    const multiplier=actionListSort.dir==='desc'?-1:1,missing=value=>value===''||value===null||value===undefined;
    const sortValue=action=>({title:action.title,parent:actionParent(action)?.title||'',area:actionAreaName(action),month:actionMonth(action),week:actionWeek(action)||'',due:actionDueDate(action),created:(action.createdAt||'').slice(0,10),completed:(action.completedAt||'').slice(0,10),status:{'Vencida':0,'Em aberto':1,'Concluída':2}[actionStatus(action)]??3})[actionListSort.key]??'';
    filtered.sort((a,b)=>{const left=sortValue(a),right=sortValue(b);if(missing(left)!==missing(right))return missing(left)?1:-1;const result=typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right),'pt-BR',{numeric:true});return result*multiplier||a.title.localeCompare(b.title,'pt-BR');});
    const columns=[['title','Ação'],['parent','Ação mãe'],['area','Área'],['month','Mês'],['week','Semana'],['due','Vencimento'],['created','Criação'],['completed','Conclusão'],['status','Estado']],headers=columns.map(([key,label])=>{const active=actionListSort.key===key,mark=active?(actionListSort.dir==='asc'?'↑':'↓'):'↕';return `<th scope="col" aria-sort="${active?(actionListSort.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" class="record-sort-button${active?' is-sorted':''}" data-sort-action="${key}">${label}<span class="record-sort-mark" aria-hidden="true">${mark}</span></button></th>`;}).join('');
    const dateLabel=value=>value?escapeHTML(fmtDate(value.slice(0,10),{day:'2-digit',month:'2-digit',year:'numeric'})):'—';
    const rows=filtered.map(action=>{const due=actionDueDate(action),stateLabel=actionStatus(action),parent=actionParent(action);return `<tr class="${action.completed?'is-complete':''}${parent?' is-subaction':''}"><td><div class="action-list-title"><button type="button" class="action-complete-toggle" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}" aria-pressed="${action.completed?'true':'false'}">${action.completed?'✓':''}</button><span>${parent?'<span class="action-tree-mark">↳</span> ':''}${action.icon?`${escapeHTML(action.icon)} `:''}<strong>${escapeHTML(action.title)}</strong></span></div></td><td>${parent?`<button type="button" class="action-parent-link" data-edit-action="${escapeHTML(parent.id)}">${escapeHTML(parent.title)}</button>`:'—'}</td><td>${escapeHTML(actionAreaName(action)||'—')}</td><td>${actionMonth(action)?escapeHTML(fmtDate(`${actionMonth(action)}-01`,{month:'short',year:'numeric'})):'—'}</td><td>${actionWeek(action)?monthWeekLabel(actionWeek(action)):'—'}</td><td>${dateLabel(due)}</td><td>${dateLabel(action.createdAt||'')}</td><td>${dateLabel(action.completedAt||'')}</td><td><span class="action-status is-${stateLabel==='Concluída'?'done':stateLabel==='Vencida'?'late':'open'}">${stateLabel}</span></td><td><button type="button" class="small-edit" data-edit-action="${escapeHTML(action.id)}">Editar</button></td></tr>`;}).join('');
    $('#actions-content').innerHTML=`<p class="action-list-count">${filtered.length} ${filtered.length===1?'ação encontrada':'ações encontradas'}</p><div class="action-list-scroll action-list-list-scroll"><table class="action-list-table action-list-sortable-table"><thead><tr>${headers}<th scope="col" aria-label="Ações"></th></tr></thead><tbody>${rows||'<tr><td colspan="10" class="action-list-empty">Nenhuma ação corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
  }
  function studyActions(){return state.actions.filter(action=>!action.deleted&&action.study);}
  function studyCard(action,options={}){const drag=options.drag===true?` draggable="true" data-drag-study="${escapeHTML(action.id)}"`:'';return `<div class="weekly-action study-item${action.completed?' is-complete':''}${action.parentId?' is-subaction':''}"${drag} style="--action-color:${escapeHTML(action.color||'#8e7cae')}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}">${action.completed?'✓':'○'}</button><button type="button" data-edit-study="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}${action.parentId?`<small>↳ ${escapeHTML(actionParent(action)?.title||'Matéria')}</small>`:''}${action.schedule==='month'&&action.week?`<small>${escapeHTML(monthWeekLabel(action.week))}</small>`:''}</button></div>`;}
  function renderCatalogSchedule(items,target,label,editAttr,options={}){
    releaseTopScrolls($(target));
    const dates=weekDates(label==='Lazer'?selectedLeisureWeekDate:selectedStudyWeekDate),month=label==='Lazer'?selectedLeisureMonth:selectedStudyMonth;
    const studyMode=label==='Estudos',card=item=>studyMode?studyCard(item,{drag:true}):leisureCard(item,{drag:true});
    const annualNavigation=options.annualNavigation===true,unscheduledColumn=options.unscheduledColumn===true;
    if((label==='Lazer'?leisureView:studyView)==='week'){
      const months=new Set(dates.map(date=>date.slice(0,7)));
      const datedItems=unscheduledColumn?items.filter(item=>item.schedule==='date'&&dates.includes(item.scheduledDate)):items;
      const unscheduledItems=unscheduledColumn?items.filter(item=>item.schedule==='month'&&months.has(item.scheduledMonth)&&(!Number(item.week)||dates.some(date=>monthWeekMatches(item.week,date)))):[];
      const cells=dates.map(date=>`<td data-catalog-date="${date}"${studyMode?` data-study-week-date="${date}"`:` data-catalog-week-date="${date}"`}><div class="weekly-action-dropzone">${datedItems.filter(item=>actionIsScheduled(item,date)).map(card).join('')}</div></td>`).join('');
      if(unscheduledColumn){
        const unscheduledCards=unscheduledItems.map(card).join('');
        $(target).innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(dates[0],{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'}))}</h3><div class="weekly-scroll"><table class="weekly-table action-week-table action-weekly-table"><thead><tr><th scope="col" class="weekly-corner">${label}</th>${weeklyHeaders(dates,'actions')}<th scope="col" class="monthly-week monthly-week-undated"><span class="monthly-week-pill">não agendadas</span><small>mês ou semana</small></th></tr></thead><tbody><tr style="--area-color:${label==='Lazer'?'#f4e1e9':'#e8e7f3'}"><th scope="row"><span class="weekly-area-icon">${label==='Lazer'?'♡':'✎'}</span><span>Com data</span></th>${cells}<td class="monthly-undated-cell">${unscheduledCards||'<span class="planner-empty">Nenhum item.</span>'}</td></tr></tbody></table></div>`;
        return;
      }
      const undatedCards=items.filter(item=>item.schedule==='month'&&!item.week).map(card).join('');
      $(target).innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(dates[0],{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'}))}</h3><div class="action-monthly-layout"><div class="weekly-scroll"><table class="weekly-table action-week-table"><thead><tr><th scope="col" class="weekly-corner">${label}</th>${weeklyHeaders(dates,'actions')}</tr></thead><tbody><tr style="--area-color:${label==='Lazer'?'#f4e1e9':'#e8e7f3'}"><th scope="row"><span class="weekly-area-icon">${label==='Lazer'?'♡':'✎'}</span><span>Planejado</span></th>${cells}</tr></tbody></table></div><aside class="action-monthly-undated"><h4>Sem data específica</h4><p>Itens agendados por mês ou semana.</p><div>${undatedCards||'<span class="planner-empty">Nenhum item.</span>'}</div></aside></div>`;
      return;
    }
    if((label==='Lazer'?leisureView:studyView)==='monthly'){
      const weeks=monthlyWeeksFor(month),headers=weeks.map(week=>monthlyWeekHeader(month,week)).join('');
      const monthItems=items.filter(item=>actionMonth(item)===month),datedItems=monthItems.filter(item=>item.schedule==='date'||Number(item.week)>0),undatedItems=monthItems.filter(item=>item.schedule==='month'&&!item.week);
      const cells=weeks.map(week=>`<td${studyMode?` data-study-month-week="${week}"`:` data-catalog-month-week="${week}"`}>${datedItems.filter(item=>actionWeek(item)===week).map(card).join('')}</td>`).join('');
      const undatedCards=undatedItems.map(card).join('');
      const body=monthItems.length?`<tr style="--area-color:${label==='Lazer'?'#f4e1e9':'#e8e7f3'}"><th scope="row"><span class="weekly-area-icon">${label==='Lazer'?'♡':'✎'}</span><span>Planejado</span></th>${cells}<td class="monthly-undated-cell">${undatedCards||'<span class="planner-empty">Nenhum item</span>'}</td></tr>`:`<tr><td colspan="${weeks.length+2}" class="monthly-empty">${label==='Estudos'?'Nenhuma matéria neste mês.':'Nenhum item neste mês.'}</td></tr>`;
      $(target).innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(`${month}-01`,{month:'long',year:'numeric'}))}</h3><div class="weekly-scroll"><table class="weekly-table monthly-table action-monthly-table"><thead><tr><th scope="col" class="weekly-corner">${label}</th>${headers}<th scope="col" class="monthly-week monthly-week-undated"><span class="monthly-week-pill">sem data</span><small>mês inteiro</small></th></tr></thead><tbody>${body}</tbody></table></div>`;
      return;
    }
    const year=month.slice(0,4),months=Array.from({length:12},(_,index)=>`${year}-${String(index+1).padStart(2,'0')}`),columns=months.map((key,index)=>{
      const entries=items.filter(item=>actionMonth(item)===key),selected=annualNavigation&&key===month;
      const monthLabel=`<span class="annual-month-label${annualNavigation?` annual-month-${index+1}`:''}">${escapeHTML(fmtDate(`${key}-01`,{month:'short'}))}</span>`,monthTarget=studyMode?` data-study-month="${key}"`:'',monthAction=studyMode?`data-open-study-month="${key}"`:`data-open-leisure-month="${key}"`;
      return `<section class="action-month-column${selected?' is-selected':''}" data-catalog-month="${key}"${annualNavigation?monthTarget:''}><header>${annualNavigation?`<button type="button" class="annual-month-link" ${monthAction}>${monthLabel}</button>`:monthLabel}<b>${entries.length}</b></header><div class="action-card-list">${entries.map(card).join('')||'<p class="planner-empty">—</p>'}</div></section>`;
    }).join('');
    $(target).innerHTML=`<h3 class="action-period-title">${year}</h3><div class="action-month-board" role="region" aria-label="${label} por mês" tabindex="0">${columns}</div>`;
    if(annualNavigation){const container=$(target),board=container?.querySelector('.action-month-board'),selected=board?.querySelector('.action-month-column.is-selected');if(board&&selected)board.scrollLeft=Math.max(0,selected.offsetLeft-board.offsetLeft-12);}
    setupTopScroll($(target)?.querySelector('.action-month-board'));
  }
  function renderStudies(){
    const studies=studyActions(), subjects=studies.filter(item=>!item.parentId), children=studies.filter(item=>item.parentId);
    const completedToggle=$('#study-toggle-completed'),supportsCompletedToggle=studyView!=='list';
    completedToggle.classList.toggle('hidden',!supportsCompletedToggle);
    completedToggle.setAttribute('aria-pressed',String(hideCompletedStudies));
    $('#study-toggle-completed-label').textContent=hideCompletedStudies?'Mostrar concluídas':'Ocultar concluídas';
    const viewStudies=supportsCompletedToggle&&hideCompletedStudies?studies.filter(item=>!item.completed):studies;
    $$('.study-tab').forEach(button=>{const active=button.dataset.studyView===studyView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    $('.study-month-navigator').classList.toggle('hidden',studyView==='list'||studyView==='week');$('.study-week-navigator').classList.toggle('hidden',studyView!=='week');
    $('#study-month').value=selectedStudyMonth;$('#study-week-date').value=selectedStudyWeekDate;$('#study-current-month').classList.toggle('hidden',selectedStudyMonth===isoToday().slice(0,7));$('#study-week-today').classList.toggle('hidden',weekDates(selectedStudyWeekDate).includes(isoToday()));
    if(studyView!=='list'){renderCatalogSchedule(viewStudies,'#studies-content','Estudos','data-edit-study',{annualNavigation:true,unscheduledColumn:true});return;}
    const body=studyView==='list'?subjects.map(subject=>`<article class="study-subject-card"><div class="study-subject-head"><span class="project-icon">${escapeHTML(subject.icon||'✎')}</span><div><strong>${escapeHTML(subject.title)}</strong><small>${children.filter(item=>item.parentId===subject.id).length} tópicos</small></div><button type="button" class="small-edit" data-edit-study="${escapeHTML(subject.id)}">Editar</button></div><div class="study-topic-list">${children.filter(item=>item.parentId===subject.id).map(studyCard).join('')||'<p class="planner-empty">Nenhum tópico cadastrado.</p>'}</div><button type="button" class="secondary-button study-add-topic" data-add-study-topic="${escapeHTML(subject.id)}">＋ Novo tópico</button></article>`).join('')||'<div class="empty-state"><h3>Seus estudos começam aqui</h3><p>Cadastre uma matéria e distribua seus tópicos ao longo do tempo.</p></div>':studyView==='week'?`<h3 class="action-period-title">${escapeHTML(fmtDate(weekDates(selectedStudyWeekDate)[0],{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(weekDates(selectedStudyWeekDate)[6],{day:'numeric',month:'short',year:'numeric'}))}</h3><div class="study-week-list">${weekDates(selectedStudyWeekDate).map(date=>{const entries=studies.filter(item=>actionIsScheduled(item,date));return `<section><h4>${escapeHTML(fmtDate(date,{weekday:'long',day:'numeric',month:'short'}))}</h4>${entries.map(studyCard).join('')||'<p class="planner-empty">Nenhum tópico planejado.</p>'}</section>`}).join('')}</div>`:studyView==='monthly'?`<h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedStudyMonth}-01`,{month:'long',year:'numeric'}))}</h3><div class="study-month-grid">${MONTH_WEEK_OPTIONS.map(week=>`<section><h4>${escapeHTML(monthWeekLabel(week))}</h4>${studies.filter(item=>actionMonth(item)===selectedStudyMonth&&actionWeek(item)===week).map(studyCard).join('')||'<p class="planner-empty">Nenhum tópico.</p>'}</section>`).join('')}</div>`:`<h3 class="action-period-title">${selectedStudyMonth.slice(0,4)}</h3><div class="action-month-board study-annual-board">${Array.from({length:12},(_,i)=>{const month=`${selectedStudyMonth.slice(0,4)}-${String(i+1).padStart(2,'0')}`,entries=studies.filter(item=>actionMonth(item)===month);return `<section class="action-month-column"><header><span class="annual-month-label">${escapeHTML(fmtDate(`${month}-01`,{month:'short'}))}</span><b>${entries.length}</b></header><div class="action-card-list">${entries.map(studyCard).join('')||'<p class="planner-empty">—</p>'}</div></section>`}).join('')}</div>`;
    $('#studies-content').innerHTML=body;
  }
  function leisureActions(){return state.actions.filter(action=>!action.deleted&&action.leisure);}
  function orderedLeisureTypes(){return (state.leisureTypes||[]).filter(type=>!type.deleted).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||a.name.localeCompare(b.name,'pt-BR'));}
  function leisureTypeRecord(id){return (state.leisureTypes||[]).find(type=>type.id===id)||null;}
  function leisureTypeName(id){const type=leisureTypeRecord(id);return type?type.name:(id?String(id):'');}
  function leisureTypeLabel(type){return leisureTypeName(type);}
  function leisureTypeUsesSeasons(id){return Boolean(leisureTypeRecord(id)?.usesSeasons);}
  function leisureTypeChip(action){
    const type=leisureTypeRecord(action?.leisureType);if(!type)return '';
    const color=type.color||'#f4e1e9';
    return `<span class="leisure-type-chip" style="--type-color:${escapeHTML(color)};--type-ink:${escapeHTML(plannerHeadingInk(color))}">${type.icon?`${escapeHTML(type.icon)} `:''}${escapeHTML(type.name)}</span>`;
  }
  function leisureSeasonsOf(series){return state.actions.filter(action=>!action.deleted&&action.leisure&&action.seasonOf===series?.id).sort((a,b)=>(Number(a.season)||0)-(Number(b.season)||0));}
  function leisureSeriesOf(action){return action?.seasonOf?state.actions.find(entry=>entry.id===action.seasonOf&&!entry.deleted)||null:null;}
  function leisureIsSeason(action){return Boolean(action?.seasonOf);}
  function leisureHasSeasons(action){return Boolean(action)&&!action.seasonOf&&leisureSeasonsOf(action).length>0;}
  function leisureIsContainer(action){return leisureHasSeasons(action);}
  function leisureInCalendar(action){return Boolean(action)&&!action.backlog&&!leisureIsContainer(action);}
  function leisureIsScheduled(action,date){return leisureInCalendar(action)&&actionIsScheduled(action,date);}
  function leisureSeasonLabel(action){return leisureIsSeason(action)&&action.season?`Temporada ${action.season}`:'';}
  function leisureScheduleSummary(action){
    if(action.backlog)return 'Backlog';
    if(action.schedule==='date')return actionScheduleLabel(action)||'Sem data';
    if(action.scheduledMonth)return `${action.week?monthWeekLabel(action.week):'Mês inteiro'} · ${fmtDate(`${action.scheduledMonth}-01`,{month:'short',year:'numeric'})}`;
    return 'Sem período';
  }
  function leisureDisplayTitle(action){const season=leisureSeasonLabel(action);return season?`${action.title} · ${season}`:action.title;}
  function createLeisureSeason(series,number,now=stamp()){
    const date=isoToday();
    return {id:uid(),parentId:'',study:false,leisure:true,leisureType:series.leisureType||'',backlog:true,seasonOf:series.id,season:number,title:series.title,description:'',notes:'',icon:series.icon||'',color:series.color||'#d58ca6',areaId:'',scheduledTime:'',durationMinutes:null,schedule:'month',scheduledMonth:'',scheduledDate:'',week:null,dueDate:'',createdAt:date,completed:false,completedAt:'',completionChangedAt:'',updatedAt:now,deleted:false};
  }
  function ensureLeisureSeasons(series,count,now=stamp()){
    const target=Math.max(0,Math.min(30,Number(count)||0)),used=new Set(leisureSeasonsOf(series).map(item=>Number(item.season)||0)),created=[];
    for(let number=1;number<=target;number++){if(used.has(number))continue;const season=createLeisureSeason(series,number,now);state.actions.push(season);created.push(season);}
    if(created.length){series.backlog=true;series.updatedAt=now;}
    return created;
  }
  function addNextLeisureSeason(seriesId){
    const series=state.actions.find(entry=>entry.id===seriesId&&!entry.deleted&&entry.leisure);
    if(!series)return null;
    const number=leisureSeasonsOf(series).reduce((max,item)=>Math.max(max,Number(item.season)||0),0)+1,season=createLeisureSeason(series,number);
    state.actions.push(season);series.backlog=true;series.updatedAt=season.updatedAt;
    syncLeisureSeriesCompletion(series.id);
    saveLocal();renderLeisure();toast(`Temporada ${number} adicionada ao backlog.`);
    return season;
  }
  function syncLeisureSeriesCompletion(seriesId){
    const series=state.actions.find(entry=>entry.id===seriesId&&!entry.deleted);if(!series)return;
    const seasons=leisureSeasonsOf(series);if(!seasons.length)return;
    const complete=seasons.every(season=>season.completed),now=stamp();
    series.completed=complete;series.completedAt=complete?(series.completedAt||now):'';series.completionChangedAt=now;series.updatedAt=now;
  }
  function leisureItemCard(action,options={}){
    const backlog=options.backlog===true,drag=options.drag===true?` draggable="true" data-drag-leisure="${escapeHTML(action.id)}"`:'',typeChip=leisureTypeChip(action),season=leisureSeasonLabel(action);
    const meta=[typeChip,season?`<small>${escapeHTML(season)}</small>`:''].filter(Boolean).join('');
    const toggle=backlog?'':`<button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(leisureDisplayTitle(action))}" aria-pressed="${action.completed?'true':'false'}">${action.completed?'✓':'○'}</button>`;
    return `<div class="weekly-action leisure-item${action.completed?' is-complete':''}${backlog?' is-backlog':''}"${drag} style="--action-color:${escapeHTML(action.color||'#d58ca6')}">${toggle}<button type="button" data-edit-leisure="${escapeHTML(action.id)}">${action.icon?`${escapeHTML(action.icon)} `:''}${escapeHTML(action.title)}${meta?`<span class="leisure-item-meta">${meta}</span>`:''}</button>${backlog?`<button type="button" class="leisure-backlog-schedule" data-schedule-leisure="${escapeHTML(action.id)}">Agendar</button>`:''}</div>`;
  }
  function leisureCard(action,options={}){return leisureItemCard(action,options);}
  function leisureSeriesGroup(series){
    const seasons=leisureSeasonsOf(series),done=seasons.filter(season=>season.completed).length,typeIcon=leisureTypeRecord(series.leisureType)?.icon||'📺';
    return `<div class="leisure-series-group"><div class="leisure-series-head"><span class="project-icon">${escapeHTML(series.icon||typeIcon)}</span><div><strong>${escapeHTML(series.title)}</strong>${leisureTypeChip(series)?`<span class="leisure-series-meta">${leisureTypeChip(series)}<small>${done} de ${seasons.length} temporadas</small></span>`:''}</div><button type="button" class="small-edit" data-edit-leisure="${escapeHTML(series.id)}">Editar</button></div><div class="leisure-season-list">${seasons.map(season=>leisureCard(season)).join('')}</div><button type="button" class="secondary-button study-add-topic" data-add-leisure-season="${escapeHTML(series.id)}">＋ Temporada</button></div>`;
  }
  function leisureTypeGroup(typeId,items,options={}){
    if(!items.length)return '';
    const backlog=options.backlog===true,type=leisureTypeRecord(typeId),name=type?.name||(typeId?'Tipo removido':'Sem tipo'),icon=type?.icon||'♡',color=type?.color||'#f4e1e9';
    const count=backlog?items.length:items.reduce((total,item)=>total+1+leisureSeasonsOf(item).length,0);
    const body=items.map(item=>backlog?leisureItemCard(item,{backlog:true}):leisureHasSeasons(item)?leisureSeriesGroup(item):leisureCard(item)).join('');
    return `<article class="study-subject-card leisure-type-group"><div class="study-subject-head"><span class="leisure-type-mark" style="background:${escapeHTML(color)};color:${escapeHTML(plannerHeadingInk(color))}">${escapeHTML(icon)}</span><div><strong>${escapeHTML(name)}</strong><small>${count} ${count===1?'item':'itens'}${backlog?' no backlog':''}</small></div></div><div class="study-topic-list">${body}</div></article>`;
  }
  function leisureTypeGroups(items){
    const groups=new Map();
    for(const item of items){const key=item.leisureType||'';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
    const typeOrder=new Map(orderedLeisureTypes().map((type,index)=>[type.id,index]));
    return [...groups.entries()].sort(([a],[b])=>{
      if(!a)return 1;if(!b)return -1;
      return (typeOrder.get(a)??999)-(typeOrder.get(b)??999)||a.localeCompare(b);
    });
  }
  function leisureBacklogItems(){return leisureActions().filter(item=>item.backlog&&!leisureIsContainer(item));}
  function renderLeisureBacklog(){
    const items=leisureBacklogItems(),groups=leisureTypeGroups(items).map(([typeId,groupItems])=>leisureTypeGroup(typeId,groupItems,{backlog:true})).join('');
    return `<div class="leisure-backlog-intro"><div><div class="eyebrow">FORA DO CALENDÁRIO</div><h3>Seu backlog</h3><p>Filmes, livros, jogos e temporadas que você quer ver, ler ou jogar um dia. Escolha “Agendar” para levar um item ao mês de ${escapeHTML(fmtDate(`${selectedLeisureMonth}-01`,{month:'long',year:'numeric'}))}.</p></div><div class="leisure-backlog-tools"><span class="leisure-backlog-count">${items.length} ${items.length===1?'item':'itens'}</span><label class="leisure-backlog-month"><span>Mês para agendar</span><input type="month" id="leisure-backlog-month" value="${escapeHTML(selectedLeisureMonth)}" aria-label="Mês para agendar itens do backlog"></label></div></div>${groups||`<div class="empty-state"><h3>Seu backlog está vazio</h3><p>Use o botão “＋ Item no backlog” acima para adicionar algo.</p></div>`}`;
  }
  function renderLeisure(){
    const items=leisureActions();
    $$('.leisure-tab').forEach(button=>{const active=button.dataset.leisureView===leisureView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const isList=leisureView==='list',isBacklog=leisureView==='backlog';
    const addItemButton=$('#add-leisure-item');if(addItemButton)addItemButton.textContent=isBacklog?'＋ Item no backlog':'＋ Novo item';
    const supportsCompletedToggle=!isList&&!isBacklog,completedToggle=$('#leisure-toggle-completed');
    completedToggle.classList.toggle('hidden',!supportsCompletedToggle);completedToggle.setAttribute('aria-pressed',String(hideCompletedLeisure));
    $('#leisure-toggle-completed-label').textContent=hideCompletedLeisure?'Mostrar concluídas':'Ocultar concluídas';
    const viewItems=supportsCompletedToggle&&hideCompletedLeisure?items.filter(item=>!item.completed):items;
    $('.leisure-month-navigator').classList.toggle('hidden',isList||isBacklog||leisureView==='week');$('.leisure-week-navigator').classList.toggle('hidden',leisureView!=='week');$('#leisure-month').value=selectedLeisureMonth;$('#leisure-week-date').value=selectedLeisureWeekDate;$('#leisure-current-month').classList.toggle('hidden',selectedLeisureMonth===isoToday().slice(0,7));$('#leisure-week-today').classList.toggle('hidden',weekDates(selectedLeisureWeekDate).includes(isoToday()));
    if(isBacklog){$('#leisure-content').innerHTML=renderLeisureBacklog();return;}
    if(!isList){renderCatalogSchedule(viewItems.filter(leisureInCalendar),'#leisure-content','Lazer','data-edit-leisure',{annualNavigation:true,unscheduledColumn:true});return;}
    const mainItems=items.filter(item=>!item.seasonOf),groups=leisureTypeGroups(mainItems).map(([typeId,groupItems])=>leisureTypeGroup(typeId,groupItems)).join('');
    $('#leisure-content').innerHTML=groups||'<div class="empty-state"><h3>Seu lazer começa aqui</h3><p>Use ＋ Novo item para adicionar filmes, séries, livros ou projetos criativos.</p></div>';
  }
  function scheduleLeisureItem(id){
    const action=state.actions.find(entry=>entry.id===id&&!entry.deleted&&entry.leisure);
    if(!action)return;
    action.backlog=false;action.schedule='month';action.scheduledMonth=selectedLeisureMonth;action.scheduledDate='';action.week=null;action.updatedAt=stamp();
    saveLocal();renderLeisure();renderPlanner();
    toast(`“${leisureDisplayTitle(action)}” agendado para ${fmtDate(`${selectedLeisureMonth}-01`,{month:'long',year:'numeric'})}.`);
  }
  function openNewLeisureItem(backlog=false){
    openActionDialog(null,'',false,true,Boolean(backlog));
  }

  function renderActions(){
    releaseTopScrolls($('#actions-content'));
    const originalActions=state.actions;
    state.actions=originalActions.filter(action=>!action.study&&!action.leisure);
    $('#action-month').value=selectedActionMonth;
    $('#action-current-month').classList.toggle('hidden',selectedActionMonth===isoToday().slice(0,7));
    $('.action-month-navigator').classList.toggle('hidden',actionView==='list'||actionView==='week');
    $('.action-week-navigator').classList.toggle('hidden',actionView!=='week');
    $('#action-list-filters').classList.toggle('hidden',actionView!=='list');
    const completedToggle=$('#action-toggle-completed'),supportsCompletedToggle=actionView!=='list';
    completedToggle.classList.toggle('hidden',!supportsCompletedToggle);
    completedToggle.setAttribute('aria-pressed',String(hideCompletedActions));
    $('#action-toggle-completed-label').textContent=hideCompletedActions?'Mostrar concluídas':'Ocultar concluídas';
    $$('.action-tab').forEach(button=>{const active=button.dataset.actionView===actionView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const actions=state.actions.filter(action=>!action.deleted).sort((a,b)=>(a.scheduledDate||`${a.scheduledMonth}-01`).localeCompare(b.scheduledDate||`${b.scheduledMonth}-01`)||a.title.localeCompare(b.title,'pt-BR'));
    const viewActions=supportsCompletedToggle&&hideCompletedActions?actions.filter(action=>!action.completed):actions;
    const monthOf=action=>action.schedule==='date'?action.scheduledDate?.slice(0,7):action.scheduledMonth;
    const [year,month]=selectedActionMonth.split('-').map(Number);
    if(actionView==='annual'){
      const columns=Array.from({length:12},(_,i)=>{
        const key=`${year}-${String(i+1).padStart(2,'0')}`,entries=viewActions.filter(action=>monthOf(action)===key);
        const name=fmtDate(`${key}-01`,{month:'short'});
        return `<section class="action-month-column${key===selectedActionMonth?' is-selected':''}" data-action-month="${key}"><header><button type="button" class="annual-month-link" data-open-action-month="${key}"><span class="annual-month-label annual-month-${i+1}">${escapeHTML(name)}</span></button><b>${entries.length}</b></header><div class="action-card-list">${entries.map(actionCard).join('')}<button type="button" class="action-add-inline" data-add-action-month="${key}">＋ Adicionar ação</button></div></section>`;
      });
      $('#actions-content').innerHTML=`<h3 class="action-period-title">${year}</h3><div class="action-month-board" role="region" aria-label="Ações por mês" tabindex="0">${columns.join('')}</div>`;
      const board=$('.action-month-board'),selected=$('.action-month-column.is-selected',board);
      if(selected)board.scrollLeft=Math.max(0,selected.offsetLeft-board.offsetLeft-12);
      setupTopScroll(board);
    }else if(actionView==='monthly'){
      renderActionMonthly(viewActions);
    }else if(actionView==='week'){
      renderActionWeekly(viewActions);
    }else if(actionView==='date'){
      const first=new Date(year,month-1,1),start=new Date(year,month-1,1-(first.getDay()+6)%7),last=new Date(year,month,0),weeks=Math.ceil(((first.getDay()+6)%7+last.getDate())/7);
      const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const heads=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map(label=>`<div class="action-calendar-heading">${label}</div>`).join('');
      const cells=Array.from({length:weeks*7},(_,index)=>{
        const day=new Date(start);day.setDate(start.getDate()+index);const key=dateKey(day),entries=viewActions.filter(action=>action.schedule==='date'&&action.scheduledDate===key);
        return `<div class="action-calendar-day${day.getMonth()!==month-1?' is-outside':''}${key===isoToday()?' is-today':''}" data-action-calendar-date="${key}"><div class="action-calendar-day-head"><span>${day.getDate()}</span><button type="button" data-add-action-date="${key}" aria-label="Adicionar ação em ${escapeHTML(fmtDate(key))}">＋</button></div><div class="action-calendar-items">${entries.map(action=>`<div class="action-calendar-item${action.completed?' is-complete':''}${action.parentId?' is-subaction':''}" style="--action-color:${escapeHTML(action.color||'#bbdcd8')}" draggable="true" data-drag-action-calendar="${escapeHTML(action.id)}"><button type="button" data-toggle-action="${escapeHTML(action.id)}" aria-label="${action.completed?'Reabrir':'Concluir'} ${escapeHTML(action.title)}" aria-pressed="${action.completed?'true':'false'}">${action.completed?'✓':'○'}</button><button type="button" data-edit-action="${escapeHTML(action.id)}">${action.icon?`<span>${escapeHTML(action.icon)}</span>`:''}${escapeHTML(action.title)}${actionParentHint(action)}<small>${escapeHTML([actionAreaName(action),`Semana ${monthWeekNumber(key)}`].filter(Boolean).join(' · '))}</small></button></div>`).join('')}</div></div>`;
      }).join('');
      $('#actions-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedActionMonth}-01`,{month:'long',year:'numeric'}))}</h3><div class="action-calendar-scroll"><div class="action-calendar">${heads}${cells}</div></div>`;
    }else{
      renderActionList(actions);
    }
    state.actions=originalActions;
    renderActionAreas();
  }
  function renderActionAreas(){
    const actionAreas=orderedActionAreas();
    $('#action-area-list').innerHTML=actionAreas.length?actionAreas.map((area,index)=>{
      const actionCount=state.actions.filter(action=>!action.deleted&&action.areaId===area.id).length,taskCount=state.tasks.filter(task=>!task.deleted&&task.areaId===area.id).length;
      return `<article class="area-card"><span class="area-swatch" style="background:${escapeHTML(area.color||'#dcebe7')}"></span><strong>${escapeHTML(area.name)}</strong><small class="area-view-tag">${actionCount} ${actionCount===1?'ação':'ações'} · ${taskCount} ${taskCount===1?'tarefa':'tarefas'}</small><div class="area-card-actions"><button type="button" data-move-action-area="up" data-area-id="${escapeHTML(area.id)}" aria-label="Mover ${escapeHTML(area.name)} para cima" ${index===0?'disabled':''}>↑</button><button type="button" data-move-action-area="down" data-area-id="${escapeHTML(area.id)}" aria-label="Mover ${escapeHTML(area.name)} para baixo" ${index===actionAreas.length-1?'disabled':''}>↓</button><button type="button" class="small-edit" data-edit-action-area="${escapeHTML(area.id)}">Editar</button></div></article>`;
    }).join(''):'<p class="planner-empty">Crie áreas para organizar as ações e tarefas.</p>';
  }
  const MENU_ICON_MAX_LENGTH=12;
  function sidebarMenuLinks(){return $$('.sidebar-link[data-section]');}
  function sidebarLinkFor(section){return sidebarMenuLinks().find(link=>link.dataset.section===section)||null;}
  function sidebarSectionLabel(link){
    const copy=link.cloneNode(true);
    copy.querySelector('span')?.remove();
    return copy.textContent.trim()||link.dataset.section;
  }
  function sidebarDefaultIcon(link){
    if(!link.dataset.defaultIcon){
      const icon=MENU_ICON_DEFAULTS.get(link.dataset.section)||link.querySelector('span')?.textContent.trim();
      link.dataset.defaultIcon=icon||'•';
    }
    return link.dataset.defaultIcon;
  }
  function menuIconFor(section){
    const icon=state.menuIcons?.[section];
    return typeof icon==='string'&&icon.trim()?icon:'';
  }
  function applyMenuIcons(){
    for(const link of sidebarMenuLinks()){
      const icon=link.querySelector('span');
      if(icon)icon.textContent=menuIconFor(link.dataset.section)||sidebarDefaultIcon(link);
    }
  }
  function setMenuIcon(section,value){
    const icon=Array.from(value||'').slice(0,MENU_ICON_MAX_LENGTH).join('').trim();
    state.menuIcons=state.menuIcons||{};
    if(icon)state.menuIcons[section]=icon;else delete state.menuIcons[section];
    state.menuIconsUpdatedAt=stamp();
    applyMenuIcons();
    saveLocal();
  }
  function renderMenuIconSettings(){
    const list=$('#menu-icon-list');if(!list)return;
    const links=sidebarMenuLinks();
    list.innerHTML=links.length?links.map(link=>{
      const section=link.dataset.section,label=sidebarSectionLabel(link),custom=menuIconFor(section),defaultIcon=sidebarDefaultIcon(link),icon=custom||defaultIcon;
      return `<div class="menu-icon-row" data-menu-icon-row="${escapeHTML(section)}"><span class="menu-icon-preview" data-menu-icon-preview aria-hidden="true">${escapeHTML(icon)}</span><div class="menu-icon-copy"><strong>${escapeHTML(label)}</strong><small data-menu-icon-status>${custom?'Ícone personalizado':'Ícone padrão'}</small></div><label class="menu-icon-field"><span>Ícone</span><input class="text-input" type="text" maxlength="${MENU_ICON_MAX_LENGTH}" autocomplete="off" spellcheck="false" value="${escapeHTML(icon)}" placeholder="${escapeHTML(defaultIcon)}" data-menu-icon-input="${escapeHTML(section)}" aria-label="Ícone da seção ${escapeHTML(label)}"></label><button type="button" class="small-edit" data-reset-menu-icon="${escapeHTML(section)}" ${custom?'':'disabled'}>Restaurar</button></div>`;
    }).join(''):'<p class="planner-empty">Nenhuma seção encontrada no menu.</p>';
    const reset=$('#reset-menu-icons');if(reset)reset.disabled=!links.some(link=>menuIconFor(link.dataset.section));
  }
  function updateMenuIconRow(input){
    const row=input.closest('.menu-icon-row'),section=input.dataset.menuIconInput;if(!row||!section)return;
    setMenuIcon(section,input.value);
    const link=sidebarLinkFor(section),custom=menuIconFor(section),icon=custom||(link?sidebarDefaultIcon(link):'•');
    row.querySelector('[data-menu-icon-preview]').textContent=icon;
    row.querySelector('[data-menu-icon-status]').textContent=custom?'Ícone personalizado':'Ícone padrão';
    const reset=row.querySelector('[data-reset-menu-icon]');if(reset)reset.disabled=!custom;
    const globalReset=$('#reset-menu-icons');if(globalReset)globalReset.disabled=!Object.keys(state.menuIcons||{}).length;
  }
  function resetMenuIcon(section){
    if(!menuIconFor(section))return;
    delete state.menuIcons[section];state.menuIconsUpdatedAt=stamp();
    saveLocal();renderMenuIconSettings();applyMenuIcons();toast('Ícone restaurado.');
  }
  function resetMenuIcons(){
    if(!Object.keys(state.menuIcons||{}).length)return;
    if(!confirm('Restaurar todos os ícones padrão do menu?'))return;
    state.menuIcons={};state.menuIconsUpdatedAt=stamp();
    saveLocal();renderMenuIconSettings();applyMenuIcons();toast('Ícones do menu restaurados.');
  }
  function renderSettings(){
    $$('.settings-tab').forEach(button=>{const active=button.dataset.settingsView===selectedSettingsView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const areasView=selectedSettingsView==='areas',menuView=selectedSettingsView==='menu',leisureTypesView=selectedSettingsView==='leisure',viewsView=!areasView&&!menuView&&!leisureTypesView;
    $('#settings-views-panel').classList.toggle('hidden',!viewsView);
    $('#settings-areas-panel').classList.toggle('hidden',!areasView);
    $('#settings-leisure-panel').classList.toggle('hidden',!leisureTypesView);
    $('#settings-menu-panel').classList.toggle('hidden',!menuView);
    $('#settings-subtitle').textContent=menuView?'Personalize o ícone de cada seção do menu. Novas seções aparecem aqui automaticamente.':areasView?'Organize as áreas usadas em ações, estudos, lazer e tarefas. Use as setas para definir a ordem.':leisureTypesView?'Crie e organize os tipos de lazer. Tipos com temporadas permitem agendar cada temporada separadamente.':'Escolha onde cada grupo e tipo de âncora aparece nas diferentes visões.';
    renderActionAreas();
    if(menuView)renderMenuIconSettings();
    if(leisureTypesView)renderLeisureTypeSettings();
    applyMenuIcons();
  }
  function moveActionArea(id,direction){
    const areas=orderedActionAreas(),index=areas.findIndex(area=>area.id===id),target=direction==='up'?index-1:index+1;
    if(index<0||target<0||target>=areas.length)return;
    [areas[index],areas[target]]=[areas[target],areas[index]];
    const now=stamp();
    areas.forEach((area,order)=>{if(area.order!==order){area.order=order;area.updatedAt=now;}});
    saveLocal();render();toast('Ordem das áreas atualizada.');
  }
  function leisureTypeUsageCount(id){return state.actions.filter(action=>!action.deleted&&action.leisure&&action.leisureType===id).length;}
  function renderLeisureTypeSettings(){
    const list=$('#leisure-type-list');if(!list)return;
    const types=orderedLeisureTypes();
    list.innerHTML=types.length?types.map((type,index)=>{
      const count=leisureTypeUsageCount(type.id),color=type.color||'#f4e1e9';
      return `<article class="area-card leisure-type-row"><span class="leisure-type-mark" style="background:${escapeHTML(color)};color:${escapeHTML(plannerHeadingInk(color))}">${escapeHTML(type.icon||'✦')}</span><strong>${escapeHTML(type.name)}</strong><small class="area-view-tag">${count} ${count===1?'item':'itens'}${type.usesSeasons?' · temporadas':''}</small><div class="area-card-actions"><button type="button" data-move-leisure-type="up" data-leisure-type-id="${escapeHTML(type.id)}" aria-label="Mover ${escapeHTML(type.name)} para cima" ${index===0?'disabled':''}>↑</button><button type="button" data-move-leisure-type="down" data-leisure-type-id="${escapeHTML(type.id)}" aria-label="Mover ${escapeHTML(type.name)} para baixo" ${index===types.length-1?'disabled':''}>↓</button><button type="button" class="small-edit" data-edit-leisure-type="${escapeHTML(type.id)}">Editar</button></div></article>`;
    }).join(''):'<p class="planner-empty">Nenhum tipo cadastrado. Crie o primeiro para classificar seus itens.</p>';
  }
  function openLeisureTypeDialog(id=null){
    state.leisureTypes=state.leisureTypes||[];
    const type=state.leisureTypes.find(entry=>entry.id===id&&!entry.deleted);
    $('#leisure-type-form').reset();$('#leisure-type-id').value=type?.id||'';
    $('#leisure-type-dialog-title').textContent=type?'Editar tipo':'Novo tipo';
    $('#leisure-type-name').value=type?.name||'';$('#leisure-type-icon').value=type?.icon||'';$('#leisure-type-color').value=type?.color||'#f4e1e9';$('#leisure-type-seasons').checked=type?.usesSeasons===true;
    $('#delete-leisure-type').classList.toggle('hidden',!type);refreshColorPalettes();$('#leisure-type-dialog').showModal();
  }
  function saveLeisureType(event){
    event.preventDefault();state.leisureTypes=state.leisureTypes||[];const name=$('#leisure-type-name').value.trim();if(!name){toast('Dê um nome ao tipo de lazer.');return;}
    const id=$('#leisure-type-id').value||uid(),existing=state.leisureTypes.find(type=>type.id===id),order=existing&&Number.isFinite(Number(existing.order))?existing.order:state.leisureTypes.reduce((max,type)=>Math.max(max,Number(type.order)||0),-1)+1,next={id,name,icon:$('#leisure-type-icon').value.trim(),color:$('#leisure-type-color').value,usesSeasons:$('#leisure-type-seasons').checked,order,updatedAt:stamp(),deleted:false};
    if(existing?.usesSeasons&&!next.usesSeasons&&state.actions.some(action=>!action.deleted&&action.leisure&&action.leisureType===id&&action.seasonOf)){toast('Este tipo tem temporadas em uso. Exclua essas temporadas antes de desativar o uso de temporadas.');return;}
    const index=state.leisureTypes.findIndex(type=>type.id===id);
    if(index<0)state.leisureTypes.push(next);else state.leisureTypes[index]=next;
    saveLocal();$('#leisure-type-dialog').close();renderSettings();renderLeisure();toast('Tipo de lazer salvo.');
  }
  function deleteLeisureType(){
    state.leisureTypes=state.leisureTypes||[];
    const type=state.leisureTypes.find(entry=>entry.id===$('#leisure-type-id').value&&!entry.deleted);if(!type)return;
    const count=leisureTypeUsageCount(type.id);
    if(count){toast(`Este tipo está em ${count} ${count===1?'item':'itens'} de lazer. Troque o tipo desses itens antes de excluí-lo.`);return;}
    if(!confirm(`Excluir o tipo “${type.name}”?`))return;
    type.deleted=true;type.updatedAt=stamp();saveLocal();$('#leisure-type-dialog').close();renderSettings();renderLeisure();toast('Tipo de lazer excluído.');
  }
  function moveLeisureType(id,direction){
    const types=orderedLeisureTypes(),index=types.findIndex(type=>type.id===id),target=direction==='up'?index-1:index+1;
    if(index<0||target<0||target>=types.length)return;
    [types[index],types[target]]=[types[target],types[index]];
    const now=stamp();
    types.forEach((type,order)=>{if(type.order!==order){type.order=order;type.updatedAt=now;}});
    saveLocal();renderSettings();renderLeisure();toast('Ordem dos tipos de lazer atualizada.');
  }
  function openActionDialog(id=null,parentId='',studyMode=false,leisureMode=false,backlogMode=false){
    const action=state.actions.find(entry=>entry.id===id&&!entry.deleted),suggestedParent=!action&&parentId?state.actions.find(entry=>entry.id===parentId&&!entry.deleted):null;
    const editingSeason=Boolean(action?.seasonOf);
    $('#action-form').reset();$('#action-id').value=action?.id||'';$('#action-form').dataset.editingSeason=editingSeason?'true':'false';
    $('#action-study').value=String(action?.study||studyMode||suggestedParent?.study||false);
    $('#action-leisure').value=String(action?.leisure||leisureMode||suggestedParent?.leisure||false);
    const typeSelect=$('#action-leisure-type'),types=orderedLeisureTypes();
    typeSelect.innerHTML='<option value="">Sem tipo</option>'+types.map(type=>`<option value="${escapeHTML(type.id)}">${type.icon?`${escapeHTML(type.icon)} `:''}${escapeHTML(type.name)}</option>`).join('');
    if(action?.leisureType&&leisureTypeRecord(action.leisureType)&&!types.some(type=>type.id===action.leisureType))typeSelect.insertAdjacentHTML('beforeend',`<option value="${escapeHTML(action.leisureType)}">${escapeHTML(leisureTypeName(action.leisureType))} (indisponível)</option>`);
    typeSelect.value=action?.leisureType||(editingSeason?leisureSeriesOf(action)?.leisureType:'')||'';
    $('#action-season').value=action?.season||'';
    $('#action-series-seasons').value=action?leisureSeasonsOf(action).length:1;
    $('#action-leisure-backlog').checked=action?action.backlog===true:Boolean(backlogMode);
    const studyActive=$('#action-study').value==='true',leisureActive=$('#action-leisure').value==='true',isChild=Boolean(action?.parentId||suggestedParent?.id),isSeries=leisureActive&&!editingSeason&&(leisureHasSeasons(action)||leisureTypeUsesSeasons(typeSelect.value));
    $('#action-dialog-title').textContent=action?(action.study?(action.parentId?'Editar tópico':'Editar matéria'):action.leisure?(editingSeason?'Editar temporada':leisureHasSeasons(action)?'Editar série':'Editar item'):'Editar ação'):(studyMode||suggestedParent?.study?(suggestedParent?'Novo tópico':'Nova matéria'):leisureMode||suggestedParent?.leisure?'Novo item':suggestedParent?'Nova subação':'Nova ação');
    $('#action-title').value=action?.title||'';$('#action-description').value=action?.description||'';
    $('#action-icon').value=action?.icon||'';$('#action-color').value=action?.color||suggestedParent?.color||'#bbdcd8';
    const hideArea=studyActive||leisureActive,actionAreas=orderedActionAreas();
    const contextNoun=studyActive?(isChild?'tópico':'matéria'):leisureActive?(editingSeason?'temporada':leisureHasSeasons(action)?'série':'item'):(isChild?'subação':'ação');
    const childSingular=studyActive?'tópico':leisureActive?'item':'subação',childPlural=studyActive?'tópicos':leisureActive?'itens':'subações';
    $('#action-title-label').textContent=studyActive?(isChild?'Nome do tópico':'Nome da matéria'):leisureActive?(editingSeason?'Nome da temporada':leisureHasSeasons(action)?'Nome da série':'Nome do item'):(isChild?'Nome da subação':'Nome da ação');
    $('#action-title').placeholder=studyActive?(isChild?'Ex.: Frações':'Ex.: Matemática'):leisureActive?(editingSeason?'Ex.: Temporada 1':leisureHasSeasons(action)?'Ex.: Dark':'Ex.: Interestelar'):(isChild?'Ex.: Reservar hotel':'Ex.: Preparar viagem');
    $('#action-completed-label').textContent=`${contextNoun.charAt(0).toUpperCase()+contextNoun.slice(1)} concluíd${['tópico','item','série'].includes(contextNoun)&&contextNoun!=='série'?'o':'a'}`;
    $('#delete-action').textContent=editingSeason?'Excluir temporada':`Excluir ${contextNoun}`;$('#action-save').textContent=editingSeason?'Salvar temporada':`Salvar ${contextNoun}`;
    $('#action-area-field').classList.toggle('hidden',hideArea);
    $('#action-area').innerHTML='<option value="">Sem área</option>'+actionAreas.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    if(action?.areaId&&!actionAreas.some(area=>area.id===action.areaId))$('#action-area').insertAdjacentHTML('beforeend',`<option value="${escapeHTML(action.areaId)}">Área indisponível</option>`);
    $('#action-area').value=hideArea?'':(action?.areaId||suggestedParent?.areaId||'');
    const allChildren=action?actionChildren(action):[],children=leisureActive&&!editingSeason?allChildren.filter(item=>!item.seasonOf):allChildren,parentFilter=studyActive?(entry=>entry.study===true):leisureActive?(entry=>entry.leisure===true):(entry=>!entry.study&&!entry.leisure),parentOptions=state.actions.filter(entry=>!entry.deleted&&!entry.parentId&&entry.id!==action?.id&&parentFilter(entry)).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
    const currentParent=action?.parentId?state.actions.find(entry=>entry.id===action.parentId&&!entry.deleted):null;
    if(currentParent&&!parentOptions.some(entry=>entry.id===currentParent.id))parentOptions.unshift(currentParent);
    const parentPlaceholder=studyActive?'Sem matéria':leisureActive?'Sem vínculo':'Ação principal';
    $('#action-parent').innerHTML=`<option value="">${parentPlaceholder}</option>`+parentOptions.map(entry=>`<option value="${escapeHTML(entry.id)}">${escapeHTML(entry.title)}</option>`).join('');
    $('#action-parent').value=action?.parentId||suggestedParent?.id||'';$('#action-parent').disabled=children.length>0||editingSeason;
    $('#action-parent-field').classList.toggle('hidden',editingSeason||((studyActive||leisureActive)&&!isChild));
    $('#action-parent-label').innerHTML=studyActive?'Matéria':leisureActive?'Categoria':'Ação mãe <span class="optional">(opcional)</span>';
    $('#action-parent-hint').textContent=studyActive?'O tópico mantém planejamento, vencimento e conclusão próprios.':leisureActive?'O item mantém planejamento, vencimento e conclusão próprios.':'A subação mantém planejamento, vencimento e conclusão próprios.';
    $('#action-schedule').value=action?.schedule||suggestedParent?.schedule||'month';
    $('#action-scheduled-month').value=action?.scheduledMonth||suggestedParent?.scheduledMonth||suggestedParent?.scheduledDate?.slice(0,7)||(leisureActive?selectedLeisureMonth:selectedActionMonth);
    $('#action-scheduled-date').value=action?.scheduledDate||suggestedParent?.scheduledDate||selectedDate;
    $('#action-time').value=action?.scheduledTime||suggestedParent?.scheduledTime||'';
    $('#action-duration').value=action?.durationMinutes??suggestedParent?.durationMinutes??'';
    $('#action-due').value=action?.dueDate||'';
    $('#action-week').value=action?.week||suggestedParent?.week||'';
    $('#action-completed').checked=action?.completed===true;
    $('#action-created-at').textContent=action?`${['tópico','item'].includes(contextNoun)?'Criado':'Criada'} em ${fmtDate((action.createdAt||action.updatedAt).slice(0,10),{day:'numeric',month:'long',year:'numeric'})}`:'';
    $('#action-created-at').classList.toggle('hidden',!action);
    $('#action-notes').value=action?.notes||'';
    $('#action-notes').placeholder=studyActive?(isChild?'Anotações sobre este tópico':'Anotações sobre esta matéria'):leisureActive?(editingSeason?'Anotações sobre esta temporada':leisureHasSeasons(action)?'Anotações sobre esta série':'Anotações sobre este item'):(isChild?'Anotações sobre esta subação':'Anotações sobre esta ação');
    $('#delete-action').classList.toggle('hidden',!action);
    const seriesSeasons=action&&leisureActive&&!editingSeason?leisureSeasonsOf(action):[],showSeasons=leisureActive&&!editingSeason&&isSeries,showSubactions=Boolean(action)&&!editingSeason&&(leisureActive?showSeasons:!action.parentId);
    $('#action-subactions-section').classList.toggle('hidden',!showSubactions);
    $('#action-subactions-eyebrow').textContent=studyActive?'TÓPICOS':showSeasons?'TEMPORADAS':leisureActive?'ITENS':'SUBAÇÕES';
    $('#add-subaction').textContent=studyActive?'＋ Novo tópico':showSeasons?'＋ Adicionar temporada':leisureActive?'＋ Novo item':'＋ Nova subação';
    $('#add-subaction').dataset.addSeason=showSeasons?action.id:'';
    if(showSeasons){
      $('#action-subactions-count').textContent=seriesSeasons.length?`${seriesSeasons.length} ${seriesSeasons.length===1?'temporada':'temporadas'}`:'Nenhuma temporada';
      $('#action-subactions-list').innerHTML=seriesSeasons.length?seriesSeasons.map(season=>`<button type="button" class="action-dialog-child${season.completed?' is-complete':''}" data-edit-subaction="${escapeHTML(season.id)}"><span>${season.completed?'✓':'○'}</span><strong>Temporada ${escapeHTML(season.season)}</strong><small>${escapeHTML(leisureScheduleSummary(season))}</small></button>`).join(''):'<p class="planner-empty">Adicione temporadas para agendar cada uma separadamente.</p>';
    }else{
      $('#action-subactions-count').textContent=children.length?`${children.length} ${children.length===1?childSingular:childPlural}`:(studyActive?'Nenhum tópico':leisureActive?'Nenhum item':'Nenhuma subação');
      $('#action-subactions-list').innerHTML=children.length?children.map(child=>`<button type="button" class="action-dialog-child${child.completed?' is-complete':''}" data-edit-subaction="${escapeHTML(child.id)}"><span>${child.completed?'✓':'○'}</span><strong>${escapeHTML(child.title)}</strong><small>${escapeHTML(actionScheduleLabel(child)||'Sem período')}</small></button>`).join(''):`<p class="planner-empty">${studyActive?'Crie tópicos para organizar a matéria.':leisureActive?'Crie temporadas para organizar a série.':'Crie ações menores, cada uma com seu próprio planejamento.'}</p>`;
    }
    updateActionSchedule();updateLeisureFields();refreshColorPalettes();if(!$('#action-dialog').open)$('#action-dialog').showModal();
  }
  function updateLeisureFields(){
    const form=$('#action-form'),leisureActive=$('#action-leisure').value==='true',isSeason=form.dataset.editingSeason==='true',typeId=$('#action-leisure-type').value,usesSeasons=leisureTypeUsesSeasons(typeId);
    $('#action-schedule-fields').classList.remove('hidden');
    $('#action-backlog-hint').classList.add('hidden');
    $('#action-series-container-hint').classList.add('hidden');
    $('#action-time-fields').classList.remove('hidden');
    $('#action-due-field').classList.remove('hidden');
    $('#action-completed-field').classList.remove('hidden');
    $('#leisure-extra-fields').classList.toggle('hidden',!leisureActive);
    if(!leisureActive){updateActionSchedule();return;}
    const current=state.actions.find(entry=>entry.id===$('#action-id').value&&!entry.deleted),existingSeasons=current?leisureSeasonsOf(current):[];
    const seriesContainer=leisureActive&&!isSeason&&(existingSeasons.length>0||(usesSeasons&&(Number($('#action-series-seasons').value)||0)>0));
    $('#action-leisure-type-field').classList.toggle('hidden',isSeason);
    $('#action-series-seasons-field').classList.toggle('hidden',isSeason||!usesSeasons);
    $('#action-season-field').classList.toggle('hidden',!isSeason);
    $('#action-backlog-field').classList.toggle('hidden',seriesContainer);
    $('#action-series-seasons-hint').classList.toggle('hidden',isSeason||!usesSeasons);
    $('#action-series-container-hint').classList.toggle('hidden',!seriesContainer);
    $('#action-series-seasons-hint').textContent=existingSeasons.length?`${existingSeasons.length} ${existingSeasons.length===1?'temporada criada':'temporadas criadas'}. Aumente o número para criar as que faltam; diminuir não exclui nenhuma.`:'Ao salvar, as temporadas serão criadas no backlog para agendar separadamente.';
    const backlog=!seriesContainer&&$('#action-leisure-backlog').checked;
    $('#action-schedule-fields').classList.toggle('hidden',backlog||seriesContainer);
    $('#action-time-fields').classList.toggle('hidden',seriesContainer);
    $('#action-due-field').classList.toggle('hidden',seriesContainer);
    $('#action-backlog-hint').classList.toggle('hidden',!backlog||seriesContainer);
    if(!backlog&&!seriesContainer)updateActionSchedule();
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
    const studyFlag=$('#action-study').value==='true',leisureFlag=$('#action-leisure').value==='true',hasParent=Boolean($('#action-parent').value),editingSeason=$('#action-form').dataset.editingSeason==='true',backlogFlag=leisureFlag&&$('#action-leisure-backlog').checked;
    const contextNoun=studyFlag?(hasParent?'tópico':'matéria'):leisureFlag?(editingSeason?'temporada':'item'):(hasParent?'subação':'ação'),contextArticle=['tópico','item'].includes(contextNoun)?'ao':'à';
    if(!title){toast(`Dê um nome ${contextArticle} ${contextNoun}.`);return;}
    const existingId=$('#action-id').value,existing=state.actions.find(action=>action.id===existingId),leisureTypeValue=$('#action-leisure-type').value,existingSeasonCount=existing?leisureSeasonsOf(existing).length:0,seriesContainerFlag=leisureFlag&&!editingSeason&&(existingSeasonCount>0||(leisureTypeUsesSeasons(leisureTypeValue)&&(Number($('#action-series-seasons').value)||0)>0)),containerLike=seriesContainerFlag;
    if(!backlogFlag&&!seriesContainerFlag&&(schedule==='date'?!scheduledDate:!scheduledMonth)){toast('Escolha a data ou o mês, ou deixe o item no backlog.');return;}
    const id=existingId||uid(),now=stamp(),completed=$('#action-completed').checked,parentId=leisureFlag?'':($('#action-parent').disabled?existing?.parentId||'':$('#action-parent').value);
    const parent=parentId?state.actions.find(action=>action.id===parentId&&!action.deleted&&!action.parentId):null;if(parentId&&!parent){toast('Escolha um vínculo válido.');return;}
    const study=$('#action-study').value==='true'||existing?.study===true;
    const leisure=$('#action-leisure').value==='true'||existing?.leisure===true;
    const leisureType=leisure?leisureTypeValue:'',existingSeasons=existing?leisureSeasonsOf(existing):[];
    if(existingSeasons.length&&!leisureTypeUsesSeasons(leisureType)){toast('Este item possui temporadas. Exclua as temporadas antes de trocar para um tipo sem temporadas.');return;}
    const season=editingSeason?Number($('#action-season').value)||null:null;
    if(editingSeason&&(!Number.isInteger(season)||season<1)){toast('Informe um número de temporada válido.');return;}
    if(editingSeason){const series=leisureSeriesOf(existing),duplicate=series?leisureSeasonsOf(series).find(item=>item.id!==existing.id&&Number(item.season)===season):null;if(duplicate){toast(`A Temporada ${season} já existe nesta série.`);return;}}
    const previousTitle=existing?.title||'',previousIcon=existing?.icon||'',previousColor=existing?.color||'';
    const next={id,parentId:parent?.id||'',study,leisure,leisureType:leisure?leisureType:'',backlog:seriesContainerFlag?true:(leisure?backlogFlag:false),seasonOf:existing?.seasonOf||'',season,title,description:$('#action-description').value.trim(),notes:$('#action-notes').value.trim(),icon:$('#action-icon').value.trim(),color:$('#action-color').value,areaId:(study||leisure)?'':$('#action-area').value,scheduledTime:containerLike?'':$('#action-time').value,durationMinutes:containerLike?null:($('#action-duration').value?Number($('#action-duration').value):null),schedule:containerLike?'month':schedule,scheduledMonth:containerLike?'':(schedule==='month'?scheduledMonth:''),scheduledDate:containerLike?'':(schedule==='date'?scheduledDate:''),week:containerLike?null:(schedule==='month'?Number($('#action-week').value)||null:null),dueDate:containerLike?'':$('#action-due').value,createdAt:existing?.createdAt||isoToday(),completed,completedAt:completed?(existing?.completed?existing.completedAt||existing.completionChangedAt||isoToday():isoToday()):'',completionChangedAt:existing?.completed===completed?existing?.completionChangedAt||'':now,updatedAt:now,deleted:false};
    const index=state.actions.findIndex(action=>action.id===id);
    if(index<0)state.actions.push(next);else state.actions[index]=next;
    const saved=state.actions.find(action=>action.id===id)||next;
    if(saved.leisure&&!saved.seasonOf){
      for(const seasonItem of leisureSeasonsOf(saved)){
        if(!previousTitle||seasonItem.title===previousTitle)seasonItem.title=saved.title;
        if(!previousIcon||seasonItem.icon===previousIcon)seasonItem.icon=saved.icon;
        if(!previousColor||seasonItem.color===previousColor)seasonItem.color=saved.color;
        seasonItem.parentId=saved.parentId;seasonItem.leisureType=saved.leisureType;seasonItem.updatedAt=now;
      }
      if(leisureTypeUsesSeasons(saved.leisureType)){
        const requested=Math.max(0,Math.min(30,Number($('#action-series-seasons').value)||0));
        ensureLeisureSeasons(saved,requested,now);
      }
      if(leisureHasSeasons(saved)&&(!existing||existing.completed!==saved.completed)){
        for(const seasonItem of leisureSeasonsOf(saved)){
          if(seasonItem.completed!==saved.completed){seasonItem.completed=saved.completed;seasonItem.completedAt=saved.completed?now:'';seasonItem.completionChangedAt=now;seasonItem.updatedAt=now;}
        }
      }
      if(leisureHasSeasons(saved))syncLeisureSeriesCompletion(saved.id);
    }
    if(saved.seasonOf)syncLeisureSeriesCompletion(saved.seasonOf);
    const monthKey=containerLike?'':(schedule==='date'?scheduledDate:scheduledMonth).slice(0,7);
    if(/^\d{4}-\d{2}$/.test(monthKey)){selectedActionMonth=monthKey;if(leisure)selectedLeisureMonth=monthKey;}
    saveLocal();$('#action-dialog').close();renderActions();renderStudies();renderLeisure();renderPlanner();
    toast(saved.study?(saved.parentId?'Tópico salvo.':'Matéria salva.'):saved.leisure?(saved.seasonOf?'Temporada salva.':leisureHasSeasons(saved)?'Série salva.':saved.backlog?'Item salvo no backlog.':'Item salvo.'):(saved.parentId?'Subação salva.':'Ação salva.'));
  }
  function deleteAction(){
    const action=state.actions.find(entry=>entry.id===$('#action-id').value&&!entry.deleted);if(!action)return;
    const study=action.study===true,leisure=action.leisure===true,season=Boolean(action.seasonOf),child=Boolean(action.parentId),seasons=leisure&&!season?leisureSeasonsOf(action):[],noun=study?(child?'tópico':'matéria'):leisure?(season?'temporada':leisureHasSeasons(action)?'série':'item'):(child?'subação':'ação'),childNoun=study?'tópico':season?'temporada':leisure?'item':'subação',childPlural=study?'tópicos':season?'temporadas':leisure?'itens':'subações';
    const children=actionChildren(action),seasonNote=seasons.length?` As ${seasons.length} ${seasons.length===1?'temporada também será excluída':'temporadas também serão excluídas'}.`:'',kept=children.length?` ${children.length} ${children.length===1?childNoun:childPlural} ${children.length===1?'permanecerá':'permanecerão'} na lista.`:'';
    if(!confirm(`Excluir ${noun} “${action.title}”?${seasonNote}${kept}`))return;
    const now=stamp();action.deleted=true;action.updatedAt=now;
    for(const seasonItem of seasons){seasonItem.deleted=true;seasonItem.updatedAt=now;}
    for(const childItem of children){childItem.parentId='';childItem.updatedAt=now;}
    const seriesId=action.seasonOf;
    if(seriesId){const series=state.actions.find(entry=>entry.id===seriesId&&!entry.deleted);if(series&&!leisureSeasonsOf(series).length){series.completed=false;series.completedAt='';series.backlog=true;series.updatedAt=now;}syncLeisureSeriesCompletion(seriesId);}
    saveLocal();$('#action-dialog').close();renderActions();renderStudies();renderLeisure();renderPlanner();
    const label=noun.charAt(0).toUpperCase()+noun.slice(1),suffix=['tópico','item'].includes(noun)?'o':'a';
    toast(seasons.length?`${label} excluíd${suffix}; ${seasons.length} ${seasons.length===1?'temporada também foi excluída':'temporadas também foram excluídas'}.`:children.length?`${label} excluíd${suffix}; ${children.length} ${children.length===1?childNoun:childPlural} ${children.length===1?'permaneceu':'permaneceram'} na lista.`:`${label} excluíd${suffix}.`);
  }
  function toggleAction(id){
    const action=state.actions.find(entry=>entry.id===id&&!entry.deleted);if(!action)return;
    const scroll=$('.action-month-board')?.scrollLeft;
    action.completed=!action.completed;action.completionChangedAt=stamp();action.completedAt=action.completed?isoToday():'';action.updatedAt=action.completionChangedAt;
    if(action.seasonOf)syncLeisureSeriesCompletion(action.seasonOf);
    saveLocal();renderActions();renderStudies();renderLeisure();if(scroll!==undefined&&$('.action-month-board'))$('.action-month-board').scrollLeft=scroll;renderPlanner();
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
      if(action.week&&Number(action.week)!==6){
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
    if(action.schedule==='date'&&action.scheduledDate===date&&!action.scheduledMonth&&!action.week)return;
    action.schedule='date';action.scheduledDate=date;action.scheduledMonth='';action.week=null;
    action.updatedAt=stamp();selectedActionWeekDate=date;selectedActionMonth=date.slice(0,7);
    saveLocal();renderActions();renderPlanner();toast('Ação movida para a semana escolhida.');
  }
  function moveActionToMonthlyWeek(id,week){
    const action=state.actions.find(entry=>entry.id===id&&!entry.deleted),targetWeek=Number(week);if(!action||!targetWeek)return;
    const [year,month]=selectedActionMonth.split('-').map(Number),lastDay=new Date(year,month,0).getDate();
    const targetDay=Array.from({length:lastDay},(_,index)=>index+1).find(day=>monthWeekMatches(targetWeek,`${selectedActionMonth}-${String(day).padStart(2,'0')}`));
    if(!targetDay)return;
    const date=`${selectedActionMonth}-${String(targetDay).padStart(2,'0')}`;
    if(action.schedule==='date'&&action.scheduledDate===date)return;
    action.schedule='date';action.scheduledDate=date;action.scheduledMonth='';action.week=null;action.updatedAt=stamp();
    saveLocal();renderActions();renderPlanner();toast(`Ação movida para ${monthWeekLabel(targetWeek).toLowerCase()}.`);
  }
  function moveStudyToMonth(id,monthKey){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey))return;
    const study=state.actions.find(entry=>entry.id===id&&!entry.deleted&&entry.study===true);if(!study||actionMonth(study)===monthKey)return;
    const [year,month]=monthKey.split('-').map(Number),lastDay=new Date(year,month,0).getDate();
    if(study.schedule==='date'){
      const day=Math.min(Number(study.scheduledDate?.slice(8,10))||1,lastDay);
      study.scheduledDate=`${monthKey}-${String(day).padStart(2,'0')}`;
    }else{
      study.scheduledMonth=monthKey;
      if(study.week&&Number(study.week)!==6){const weeks=Array.from({length:lastDay},(_,index)=>monthWeekNumber(`${monthKey}-${String(index+1).padStart(2,'0')}`));study.week=Math.min(Number(study.week),Math.max(...weeks));}
    }
    study.updatedAt=stamp();selectedStudyMonth=monthKey;saveLocal();renderStudies();renderPlanner();toast(`Estudo movido para ${fmtDate(`${monthKey}-01`,{month:'long',year:'numeric'})}.`);
  }
  function moveStudyToWeekDate(id,date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const study=state.actions.find(entry=>entry.id===id&&!entry.deleted&&entry.study===true);if(!study)return;
    if(study.schedule==='date'&&study.scheduledDate===date&&!study.scheduledMonth&&!study.week)return;
    study.schedule='date';study.scheduledDate=date;study.scheduledMonth='';study.week=null;study.updatedAt=stamp();selectedStudyWeekDate=date;selectedStudyMonth=date.slice(0,7);
    saveLocal();renderStudies();renderPlanner();toast('Estudo movido para o dia escolhido.');
  }
  function moveStudyToMonthlyWeek(id,week){
    const study=state.actions.find(entry=>entry.id===id&&!entry.deleted&&entry.study===true),targetWeek=Number(week);if(!study||!targetWeek)return;
    const [year,month]=selectedStudyMonth.split('-').map(Number),lastDay=new Date(year,month,0).getDate();
    const targetDay=Array.from({length:lastDay},(_,index)=>index+1).find(day=>monthWeekMatches(targetWeek,`${selectedStudyMonth}-${String(day).padStart(2,'0')}`));
    if(!targetDay)return;
    const date=`${selectedStudyMonth}-${String(targetDay).padStart(2,'0')}`;
    if(study.schedule==='date'&&study.scheduledDate===date)return;
    study.schedule='date';study.scheduledDate=date;study.scheduledMonth='';study.week=null;study.updatedAt=stamp();
    saveLocal();renderStudies();renderPlanner();toast(`Estudo movido para ${monthWeekLabel(targetWeek).toLowerCase()}.`);
  }
  function moveLeisureToMonth(id,monthKey){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey))return;
    const item=state.actions.find(entry=>entry.id===id&&!entry.deleted&&entry.leisure&&leisureInCalendar(entry));if(!item||actionMonth(item)===monthKey)return;
    const [year,month]=monthKey.split('-').map(Number),lastDay=new Date(year,month,0).getDate();
    if(item.schedule==='date'){
      const day=Math.min(Number(item.scheduledDate?.slice(8,10))||1,lastDay);
      item.scheduledDate=`${monthKey}-${String(day).padStart(2,'0')}`;
    }else{
      item.scheduledMonth=monthKey;
      if(item.week&&Number(item.week)!==6){const weeks=Array.from({length:lastDay},(_,index)=>monthWeekNumber(`${monthKey}-${String(index+1).padStart(2,'0')}`));item.week=Math.min(Number(item.week),Math.max(...weeks));}
    }
    item.updatedAt=stamp();selectedLeisureMonth=monthKey;saveLocal();renderLeisure();renderPlanner();toast(`“${leisureDisplayTitle(item)}” movido para ${fmtDate(`${monthKey}-01`,{month:'long',year:'numeric'})}.`);
  }
  function moveLeisureToWeekDate(id,date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const item=state.actions.find(entry=>entry.id===id&&!entry.deleted&&entry.leisure&&leisureInCalendar(entry));if(!item)return;
    if(item.schedule==='date'&&item.scheduledDate===date&&!item.scheduledMonth&&!item.week)return;
    item.schedule='date';item.scheduledDate=date;item.scheduledMonth='';item.week=null;item.updatedAt=stamp();selectedLeisureWeekDate=date;selectedLeisureMonth=date.slice(0,7);
    saveLocal();renderLeisure();renderPlanner();toast(`“${leisureDisplayTitle(item)}” movido para o dia escolhido.`);
  }
  function moveLeisureToMonthlyWeek(id,week){
    const item=state.actions.find(entry=>entry.id===id&&!entry.deleted&&entry.leisure&&leisureInCalendar(entry)),targetWeek=Number(week);if(!item||!targetWeek)return;
    const [year,month]=selectedLeisureMonth.split('-').map(Number),lastDay=new Date(year,month,0).getDate();
    const targetDay=Array.from({length:lastDay},(_,index)=>index+1).find(day=>monthWeekMatches(targetWeek,`${selectedLeisureMonth}-${String(day).padStart(2,'0')}`));
    if(!targetDay)return;
    const date=`${selectedLeisureMonth}-${String(targetDay).padStart(2,'0')}`;
    if(item.schedule==='date'&&item.scheduledDate===date)return;
    item.schedule='date';item.scheduledDate=date;item.scheduledMonth='';item.week=null;item.updatedAt=stamp();
    saveLocal();renderLeisure();renderPlanner();toast(`“${leisureDisplayTitle(item)}” movido para ${monthWeekLabel(targetWeek).toLowerCase()}.`);
  }
  function openActionAreaDialog(id=null){
    const area=state.actionAreas.find(entry=>entry.id===id&&!entry.deleted);
    $('#action-area-form').reset();$('#action-area-id').value=area?.id||'';
    $('#action-area-dialog-title').textContent=area?'Editar área':'Nova área';
    $('#action-area-name').value=area?.name||'';$('#action-area-color').value=area?.color||'#dcebe7';
    $('#delete-action-area').classList.toggle('hidden',!area);refreshColorPalettes();$('#action-area-dialog').showModal();
  }
  function saveActionArea(event){
    event.preventDefault();const name=$('#action-area-name').value.trim();if(!name){toast('Dê um nome à área.');return;}
    const id=$('#action-area-id').value||uid(),existing=state.actionAreas.find(area=>area.id===id),order=existing&&Number.isFinite(Number(existing.order))?existing.order:state.actionAreas.reduce((max,area)=>Math.max(max,Number(area.order)||0),-1)+1,next={id,name,color:$('#action-area-color').value,order,updatedAt:stamp(),deleted:false};
    const index=state.actionAreas.findIndex(area=>area.id===id);
    if(index<0)state.actionAreas.push(next);else state.actionAreas[index]=next;
    saveLocal();$('#action-area-dialog').close();renderActions();renderPlanner();renderTasks();toast('Área salva.');
  }
  function deleteActionArea(){
    const area=state.actionAreas.find(entry=>entry.id===$('#action-area-id').value&&!entry.deleted);if(!area)return;
    if(state.actions.some(action=>!action.deleted&&action.areaId===area.id)||state.tasks.some(task=>!task.deleted&&task.areaId===area.id)){toast('Mova ou exclua as ações e tarefas desta área antes de excluí-la.');return;}
    if(!confirm(`Excluir a área “${area.name}”?`))return;
    area.deleted=true;area.updatedAt=stamp();saveLocal();$('#action-area-dialog').close();renderActions();renderTasks();toast('Área excluída.');
  }
  function occurrenceCompletedKeys(item){return Array.isArray(item.completedDates)?item.completedDates:[];}
  function occurrenceInstanceCompleted(item,key){return Boolean(key)&&occurrenceCompletedKeys(item).includes(key);}
  function occurrenceAfterCompletionDue(item){
    const history=(item.completionHistory||[]).filter(Boolean).sort(),last=history[history.length-1];
    if(!last&&!item.scheduledDate)return '';
    const due=safeDate(last||item.scheduledDate);
    if(last)due.setDate(due.getDate()+Math.max(1,Number(item.intervalDays)||1));
    return isoDateKey(due);
  }
  function occurrenceAnnualDateAllowed(item,date){
    if(item.scheduledDate&&date<item.scheduledDate)return false;
    if(item.startDate&&date<item.startDate)return false;
    if(item.endDate&&date>item.endDate)return false;
    return true;
  }
  function occurrenceLeadDays(item){return item.type==='birthday'?Math.max(0,Math.min(365,Number(item.leadDays)||0)):0;}
  function dateKeyOffset(date,days){const d=safeDate(date);d.setDate(d.getDate()+days);return isoDateKey(d);}
  function occurrenceBirthdayForDate(item,date=''){
    if(item.type!=='birthday'||!item.scheduledDate)return '';
    const ref=date||isoToday(),year=Number(ref.slice(0,4)),mmdd=item.scheduledDate.slice(5),lead=occurrenceLeadDays(item);
    for(const birthday of [`${year}-${mmdd}`,`${year+1}-${mmdd}`]){
      const start=dateKeyOffset(birthday,-lead);
      if(date>=start&&date<=birthday&&occurrenceAnnualDateAllowed(item,birthday))return birthday;
    }
    return '';
  }
  function occurrenceAppearsOn(item,date){
    if(item.deleted)return false;
    if(item.type==='birthday')return Boolean(occurrenceBirthdayForDate(item,date));
    return occurrenceIsScheduled(item,date);
  }
  function occurrenceViewDatesInMonth(item,monthKey){
    const [year,month]=monthKey.split('-').map(Number),length=new Date(year,month,0).getDate(),dates=[];
    for(let day=1;day<=length;day++){const date=`${monthKey}-${String(day).padStart(2,'0')}`;if(occurrenceAppearsOn(item,date))dates.push(date);}
    return dates;
  }
  function occurrenceVisibleOnDate(item,date){return date>=isoToday()||!item.consultative;}
  function occurrenceVisibleInMonth(item,monthKey){
    if(!item.consultative)return true;
    if(item.schedule==='month'&&!item.week)return monthKey>=isoToday().slice(0,7);
    return occurrenceViewDatesInMonth(item,monthKey).some(date=>occurrenceVisibleOnDate(item,date));
  }
  function occurrenceCycleStart(item,date){
    if(item.type!=='cycle'||!date)return date;
    const duration=item.scheduledDate&&item.scheduledEndDate&&item.scheduledEndDate>item.scheduledDate?Math.round((safeDate(item.scheduledEndDate)-safeDate(item.scheduledDate))/86400000):0;
    for(let offset=0;offset<=duration;offset++){
      const candidate=safeDate(date);candidate.setDate(candidate.getDate()-offset);const key=isoDateKey(candidate);
      if(occurrenceRecurrenceStartsOn(item,key))return key;
    }
    return date;
  }
  function occurrenceInstanceKey(item,date=''){
    if(item.type==='birthday'){
      const key=date?occurrenceBirthdayForDate(item,date):`${isoToday().slice(0,4)}-${(item.scheduledDate||'').slice(5)}`;
      return key&&occurrenceAnnualDateAllowed(item,key)?key:'';
    }
    if(item.schedule==='date')return item.scheduledDate||'';
    if(item.schedule==='month')return item.scheduledMonth?`${item.scheduledMonth}${item.week?`-W${item.week}`:''}`:'';
    if(item.schedule==='recurrence'){
      if(item.recurrenceMode==='after-completion'){
        const due=occurrenceAfterCompletionDue(item);
        return due&&occurrenceIsScheduled(item,due)?due:'';
      }
      return item.type==='cycle'&&date?occurrenceCycleStart(item,date):(date||item.scheduledDate||'');
    }
    return '';
  }
  function occurrenceCardKey(item){
    if(item.consultative)return '';
    if(item.type==='birthday')return '';
    if(item.schedule==='date'||item.schedule==='month')return occurrenceInstanceKey(item);
    if(item.schedule==='recurrence'&&item.recurrenceMode==='after-completion')return occurrenceInstanceKey(item);
    return '';
  }
  function occurrenceLatestScheduledKey(item,referenceDate=isoToday()){
    const floor=safeDate(referenceDate);floor.setDate(floor.getDate()-366);
    for(let cursor=safeDate(referenceDate);cursor>=floor;cursor.setDate(cursor.getDate()-1)){
      const key=isoDateKey(cursor);if(occurrenceIsScheduled(item,key))return item.type==='cycle'?occurrenceCycleStart(item,key):key;
    }
    return '';
  }
  function occurrenceListKey(item){
    if(item.consultative)return '';
    if(item.type==='birthday'||item.schedule==='date'||item.schedule==='month')return occurrenceInstanceKey(item);
    if(item.schedule==='recurrence'){
      if(item.recurrenceMode==='after-completion')return occurrenceInstanceKey(item);
      if(item.recurrenceMode==='annual'){
        if(!item.scheduledDate)return '';
        const key=`${isoToday().slice(0,4)}-${item.scheduledDate.slice(5)}`;
        return key<=isoToday()&&occurrenceAnnualDateAllowed(item,key)?key:'';
      }
      return occurrenceLatestScheduledKey(item);
    }
    return '';
  }
  function occurrenceKeyIsFuture(key){
    if(!key)return false;
    if(/^\d{4}-\d{2}-\d{2}$/.test(key))return key>isoToday();
    if(/^\d{4}-\d{2}(-W\d)?$/.test(key))return key.slice(0,7)>isoToday().slice(0,7);
    return false;
  }
  function occurrenceStatusKind(item){
    if(item.consultative)return 'consultative';
    const key=occurrenceListKey(item);
    if(!key)return 'neutral';
    if(occurrenceInstanceCompleted(item,key))return 'completed';
    if(occurrenceKeyIsFuture(key))return 'neutral';
    return 'pending';
  }
  function occurrenceFrequencyLabel(item){
    if(item.type==='birthday')return 'Anual';
    if(item.schedule==='date')return 'Única';
    if(item.schedule==='month')return 'Mensal';
    const mode=item.recurrenceMode||'every-week';
    if(mode==='annual')return 'Anual';
    if(mode==='month-weeks')return 'Semanas do mês';
    if(mode==='after-completion')return 'Após conclusão';
    if(mode==='after-date')return 'Após data';
    return 'Semanal';
  }
  function occurrenceNextDate(item){
    const today=isoToday();
    if(item.type==='birthday'){
      if(!item.scheduledDate)return '';
      for(let year=Number(today.slice(0,4));year<=Number(today.slice(0,4))+1;year++){
        const date=`${year}-${item.scheduledDate.slice(5)}`;
        if(date>=today&&occurrenceAnnualDateAllowed(item,date))return date;
      }
      return '';
    }
    if(item.schedule==='date'){
      if(!item.scheduledDate)return '';
      const end=item.scheduledEndDate||item.scheduledDate;
      if(today>=item.scheduledDate&&today<=end)return today;
      return item.scheduledDate>=today?item.scheduledDate:'';
    }
    if(item.schedule==='month'){
      if(!item.scheduledMonth)return '';
      if(item.scheduledMonth<today.slice(0,7))return '';
      if(!item.week)return `${item.scheduledMonth}-01`;
      return occurrenceDatesInMonth(item,item.scheduledMonth).find(date=>date>=today)||'';
    }
    if(item.schedule==='recurrence'){
      if(item.recurrenceMode==='after-completion'){
        const due=occurrenceInstanceKey(item);
        return due&&due>=today?due:'';
      }
      if(item.recurrenceMode==='annual'){
        if(!item.scheduledDate)return '';
        for(let year=Number(today.slice(0,4));year<=Number(today.slice(0,4))+1;year++){
          const date=`${year}-${item.scheduledDate.slice(5)}`;
          if(date>=today&&occurrenceAnnualDateAllowed(item,date))return date;
        }
        return '';
      }
      const limit=safeDate(today);limit.setDate(limit.getDate()+366);
      for(let cursor=safeDate(today);cursor<=limit;cursor.setDate(cursor.getDate()+1)){
        const date=isoDateKey(cursor);
        if(item.type==='cycle'?occurrenceRecurrenceStartsOn(item,date):occurrenceIsScheduled(item,date))return date;
      }
    }
    return '';
  }
  function occurrenceOldestPendingDate(item){
    if(item.consultative)return '';
    const today=isoToday(),completed=key=>occurrenceInstanceCompleted(item,key);
    let oldest='';
    const consider=date=>{if(date&&date<today&&(!oldest||date<oldest))oldest=date;};
    if(item.type==='birthday'){
      if(!item.scheduledDate)return '';
      const date=`${Number(today.slice(0,4))}-${item.scheduledDate.slice(5)}`;
      if(occurrenceAnnualDateAllowed(item,date)&&!completed(date))consider(date);
      return oldest;
    }
    if(item.schedule==='date'){
      const due=item.scheduledEndDate||item.scheduledDate;
      if(due&&!completed(item.scheduledDate))consider(due);
      return oldest;
    }
    if(item.schedule==='month'){
      if(!item.scheduledMonth)return '';
      const key=occurrenceInstanceKey(item);
      let due='';
      if(item.week){const [,weekEnd]=monthWeekRange(item.scheduledMonth,item.week);due=isoDateKey(weekEnd);}
      else{const [year,month]=item.scheduledMonth.split('-').map(Number);due=isoDateKey(new Date(year,month,0));}
      if(!completed(key))consider(due);
      return oldest;
    }
    if(item.schedule==='recurrence'){
      if(item.recurrenceMode==='after-completion'){
        const due=occurrenceInstanceKey(item);
        if(due&&!completed(due))consider(due);
        return oldest;
      }
      if(item.recurrenceMode==='annual'){
        if(!item.scheduledDate)return '';
        const year=Number(today.slice(0,4));
        for(let y=year-1;y<=year;y++){
          const date=`${y}-${item.scheduledDate.slice(5)}`;
          if(occurrenceAnnualDateAllowed(item,date)&&!completed(date))consider(date);
        }
        return oldest;
      }
      const floor=safeDate(today);floor.setFullYear(floor.getFullYear()-5);
      const start=item.startDate?safeDate(item.startDate):(item.scheduledDate?safeDate(item.scheduledDate):new Date(floor.getTime()));
      const cursor=start<floor?new Date(floor.getTime()):start,end=safeDate(today);
      for(;cursor<end;cursor.setDate(cursor.getDate()+1)){
        const date=isoDateKey(cursor);
        if(!occurrenceIsScheduled(item,date))continue;
        if(item.type==='cycle'&&!occurrenceRecurrenceStartsOn(item,date))continue;
        const key=item.type==='cycle'?occurrenceCycleStart(item,date):date;
        if(!completed(key))consider(key);
      }
    }
    return oldest;
  }
  function occurrenceOverdueInstances(date=selectedDate){
    const cutoff=date<isoToday()?date:isoToday(),end=safeDate(cutoff),instances=[];
    const push=(item,key,display)=>instances.push({item,key,date:display||key});
    for(const item of state.occurrences){
      if(item.deleted||item.consultative)continue;
      if(item.type==='birthday'){
        if(!item.scheduledDate)continue;
        const key=`${cutoff.slice(0,4)}-${item.scheduledDate.slice(5)}`;
        if(key<cutoff&&occurrenceAnnualDateAllowed(item,key)&&!occurrenceInstanceCompleted(item,key))push(item,key,key);
        continue;
      }
      if(item.schedule==='date'){
        const lastDate=item.scheduledEndDate||item.scheduledDate;
        if(!lastDate||lastDate>=cutoff)continue;
        if(!occurrenceInstanceCompleted(item,item.scheduledDate))push(item,item.scheduledDate,lastDate);
        continue;
      }
      if(item.schedule==='month'){
        if(!item.scheduledMonth)continue;
        const key=occurrenceInstanceKey(item);
        let due='';
        if(item.week){const [,weekEnd]=monthWeekRange(item.scheduledMonth,item.week);due=isoDateKey(weekEnd);}
        else{const [year,month]=item.scheduledMonth.split('-').map(Number);due=isoDateKey(new Date(year,month,0));}
        if(due<cutoff&&!occurrenceInstanceCompleted(item,key))push(item,key,due);
        continue;
      }
      if(item.schedule==='recurrence'){
        if(item.recurrenceMode==='after-completion'){
          const due=occurrenceInstanceKey(item);
          if(due&&due<cutoff&&!occurrenceInstanceCompleted(item,due))push(item,due,due);
          continue;
        }
        if(item.recurrenceMode==='annual'){
          if(!item.scheduledDate)continue;
          const key=`${cutoff.slice(0,4)}-${item.scheduledDate.slice(5)}`;
          if(key<cutoff&&occurrenceAnnualDateAllowed(item,key)&&!occurrenceInstanceCompleted(item,key))push(item,key,key);
          continue;
        }
        const windowDays=item.recurrenceMode==='after-date'?Math.max(84,(Number(item.intervalDays)||1)*2):84;
        const floor=safeDate(cutoff);floor.setDate(floor.getDate()-windowDays);
        const start=item.startDate?safeDate(item.startDate):new Date(floor.getTime());
        const cursor=start<floor?new Date(floor.getTime()):start;
        for(;cursor<end;cursor.setDate(cursor.getDate()+1)){
          const key=isoDateKey(cursor);
          if(!occurrenceIsScheduled(item,key))continue;
          if(item.type==='cycle'&&!occurrenceRecurrenceStartsOn(item,key))continue;
          if(!occurrenceInstanceCompleted(item,key))push(item,key,key);
        }
      }
    }
    return instances.sort((a,b)=>a.date.localeCompare(b.date)||a.item.title.localeCompare(b.item.title,'pt-BR'));
  }
  function occurrenceInstanceToggle(id,key){
    const item=state.occurrences.find(entry=>entry.id===id&&!entry.deleted);
    if(!item||!key||item.consultative)return;
    if(item.schedule==='recurrence'&&item.recurrenceMode==='after-completion'){
      if(key!==occurrenceAfterCompletionDue(item))return;
      if(!Array.isArray(item.completionHistory))item.completionHistory=[];
      item.completionHistory.push(isoToday());item.updatedAt=stamp();saveLocal();
      renderOccurrences();renderPlanner();renderWeekly();
      toast('Acontecimento concluído. A próxima ocorrência foi recalculada a partir de hoje.');return;
    }
    const keys=occurrenceCompletedKeys(item),completed=keys.includes(key);
    item.completedDates=completed?keys.filter(entry=>entry!==key):[...keys,key];
    item.updatedAt=stamp();saveLocal();
    renderOccurrences();renderPlanner();renderWeekly();
    toast(completed?'Acontecimento reaberto.':'Acontecimento concluído.');
  }
  function occurrenceFocusKey(item,date=''){
    if(!date&&item.schedule==='recurrence'&&item.recurrenceMode!=='after-completion')return occurrenceLatestScheduledKey(item)||'';
    return occurrenceInstanceKey(item,date||'');
  }
  function occurrenceFocusMonthLabel(item,key){
    if(/^\d{4}-\d{2}(-W\d)?$/.test(key))return fmtDate(`${key.slice(0,7)}-01`,{month:'long',year:'numeric'});
    if(item.schedule==='month'&&item.scheduledMonth)return fmtDate(`${item.scheduledMonth}-01`,{month:'long',year:'numeric'});
    return '';
  }
  function occurrenceFocusScheduleLabel(item){
    if(item.schedule==='recurrence'&&['every-week','month-weeks'].includes(item.recurrenceMode||'every-week')){
      if((item.recurrenceMode||'every-week')==='month-weeks'){
        const weeks=(item.monthWeeks||[]).map(week=>monthWeekLabel(week).toLowerCase()).join(', ')||'sem semanas';
        return `Semanas específicas do mês · ${weeks}`;
      }
      const days=(item.weekdays||[]).map(day=>WEEKDAYS[day]).join(', ')||'sem dias';
      return `Todas as semanas · ${days}`;
    }
    return occurrenceScheduleLabel(item);
  }
  function renderOccurrenceFocus(){
    if(!activeOccurrenceId)return;
    const item=state.occurrences.find(entry=>entry.id===activeOccurrenceId&&!entry.deleted);
    if(!item){$('#occurrence-focus-dialog').close();return;}
    const kind=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder,key=activeOccurrenceKey||occurrenceFocusKey(item,activeOccurrenceDate||''),completed=Boolean(key)&&occurrenceInstanceCompleted(item,key),markable=!item.consultative&&Boolean(key),monthLabel=occurrenceFocusMonthLabel(item,key);
    const birthdayDate=item.type==='birthday'?(activeOccurrenceDate?occurrenceBirthdayForDate(item,activeOccurrenceDate):key):'';
    const displayDate=birthdayDate||(activeOccurrenceDate&&/^\d{4}-\d{2}-\d{2}$/.test(activeOccurrenceDate)?activeOccurrenceDate:(/^\d{4}-\d{2}-\d{2}$/.test(key)?key:''));
    const eyebrow=displayDate?fmtDate(displayDate).toLocaleUpperCase('pt-BR'):monthLabel?monthLabel.toLocaleUpperCase('pt-BR'):kind.label.toLocaleUpperCase('pt-BR');
    const statusClass=item.consultative?'consultative':completed?'done':markable?(occurrenceKeyIsFuture(key)?'neutral':'pending'):'neutral',statusLabel=item.consultative?'Consultivo':completed?'Concluído':markable?(occurrenceKeyIsFuture(key)?'—':'Pendente'):'—',scheduleLabel=occurrenceFocusScheduleLabel(item);
    $('#occurrence-focus-dialog').style.setProperty('--routine-color',item.color||'#5DFF5D');
    $('#occurrence-focus-date').textContent=eyebrow;
    $('#occurrence-focus-icon').textContent=item.icon||kind.icon;
    $('#occurrence-focus-name').textContent=item.title;
    $('#occurrence-focus-count').textContent=`${kind.label} · ${scheduleLabel}${item.consultative?' · Consultivo':''}`;
    $('#occurrence-focus-description').textContent=item.description||'';
    $('#occurrence-focus-description-section').classList.toggle('hidden',!item.description);
    const dataText=displayDate?fmtDate(displayDate,{weekday:'long',day:'numeric',month:'long',year:'numeric'}):monthLabel||scheduleLabel;
    const rows=[['Tipo',escapeHTML(kind.label)],[item.schedule==='recurrence'?'Frequência':'Agendamento',escapeHTML(scheduleLabel)],['Data',escapeHTML(dataText)],['Situação',`<span class="occurrence-status is-${statusClass}">${escapeHTML(statusLabel)}</span>`],['Criado em',item.createdAt?escapeHTML(fmtDate(item.createdAt,{day:'2-digit',month:'2-digit',year:'numeric'})):'—']];
    $('#occurrence-focus-details').innerHTML=rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
    $('#occurrence-focus-completion').classList.toggle('hidden',!markable);
    $('#occurrence-focus-complete').checked=completed;
    const hint=item.consultative?'Acontecimento consultivo: apenas aparece conforme a recorrência, sem marcação de conclusão.':item.schedule==='recurrence'&&item.recurrenceMode==='after-completion'?'A próxima ocorrência será calculada a partir da data de conclusão.':!markable?'Sem ocorrência pendente para concluir.':'';
    $('#occurrence-focus-hint').textContent=hint;$('#occurrence-focus-hint').classList.toggle('hidden',!hint);
    const notes=item.notes||'';
    $('#occurrence-focus-notes-section').classList.toggle('hidden',!notes);
    $('#occurrence-focus-notes').textContent=notes;
  }
  function openOccurrenceFocus(id,date='',key=''){
    const item=state.occurrences.find(entry=>entry.id===id&&!entry.deleted);
    if(!item)return;
    activeOccurrenceId=id;activeOccurrenceDate=date||'';activeOccurrenceKey=key||'';
    renderOccurrenceFocus();$('#occurrence-focus-dialog').showModal();
  }
  function openOccurrenceFocusFromElement(element,fallbackDate=''){
    openOccurrenceFocus(element.dataset.openOccurrence,element.dataset.occurrenceDate||fallbackDate,element.dataset.occurrenceKey||'');
  }
  function occurrenceReviewRange(){
    const period=$('#occurrence-review-period')?.value||'90',today=isoToday(),end=safeDate(today);end.setDate(end.getDate()-1);
    let start;
    if(period==='all'){
      const candidates=state.occurrences.flatMap(item=>[item.scheduledDate,item.scheduledEndDate,item.startDate,item.endDate,(item.createdAt||'').slice(0,10),...(item.completionHistory||[])]).filter(Boolean).sort();
      start=safeDate(candidates[0]||today);
      const floor=new Date(end);floor.setFullYear(floor.getFullYear()-5);if(start<floor)start=floor;
    }else{start=new Date(end);start.setDate(start.getDate()-(Number(period)||90)+1);}
    return {start:isoDateKey(start),end:isoDateKey(end)};
  }
  function occurrenceReviewInstances(){
    const {start,end}=occurrenceReviewRange(),instances=[],within=date=>date>=start&&date<=end;
    const push=(item,key,date,status,extra={})=>instances.push({item,key,date,status,...extra});
    for(const item of state.occurrences){
      if(item.deleted||item.consultative)continue;
      const statusOf=key=>occurrenceInstanceCompleted(item,key)?'completed':'pending';
      if(item.type==='birthday'){
        if(!item.scheduledDate)continue;
        for(let year=Number(start.slice(0,4));year<=Number(end.slice(0,4));year++){
          const date=`${year}-${item.scheduledDate.slice(5)}`;if(within(date)&&occurrenceAnnualDateAllowed(item,date))push(item,date,date,statusOf(date));
        }
        continue;
      }
      if(item.schedule==='date'){
        const date=item.scheduledDate;if(date&&within(date))push(item,date,date,statusOf(date));
        continue;
      }
      if(item.schedule==='month'){
        if(!item.scheduledMonth)continue;
        const key=occurrenceInstanceKey(item);
        let due='';
        if(item.week){const [,weekEnd]=monthWeekRange(item.scheduledMonth,item.week);due=isoDateKey(weekEnd);}
        else{const [year,month]=item.scheduledMonth.split('-').map(Number);due=isoDateKey(new Date(year,month,0));}
        if(within(due))push(item,key,due,statusOf(key));
        continue;
      }
      if(item.schedule==='recurrence'){
        if(item.recurrenceMode==='after-completion'){
          for(const date of (item.completionHistory||[])){
            if(within(date)&&(!item.startDate||date>=item.startDate))push(item,date,date,'completed',{historical:true});
          }
          const due=occurrenceInstanceKey(item);
          if(due&&within(due))push(item,due,due,'pending');
          continue;
        }
        if(item.recurrenceMode==='annual'){
          if(!item.scheduledDate)continue;
          for(let year=Number(start.slice(0,4));year<=Number(end.slice(0,4));year++){
            const date=`${year}-${item.scheduledDate.slice(5)}`;if(within(date)&&occurrenceAnnualDateAllowed(item,date))push(item,date,date,statusOf(date));
          }
          continue;
        }
        const endDate=safeDate(end),cursor=safeDate(start);
        if(item.startDate){const itemStart=safeDate(item.startDate);if(itemStart>cursor)cursor.setTime(itemStart.getTime());}
        for(;cursor<=endDate;cursor.setDate(cursor.getDate()+1)){
          const date=isoDateKey(cursor);
          if(!occurrenceIsScheduled(item,date))continue;
          if(item.type==='cycle'&&!occurrenceRecurrenceStartsOn(item,date))continue;
          push(item,date,date,statusOf(date));
        }
      }
    }
    return instances.sort((a,b)=>b.date.localeCompare(a.date)||a.item.title.localeCompare(b.item.title,'pt-BR'));
  }
  function renderOccurrenceReview(){
    const all=occurrenceReviewInstances(),types=multiSelectValues('#occurrence-review-type'),frequencies=multiSelectValues('#occurrence-review-frequency'),statuses=multiSelectValues('#occurrence-review-status'),search=($('#occurrence-review-search')?.value||'').trim().toLocaleLowerCase('pt-BR');
    const filtered=all.filter(({item,status:kind})=>(!types.length||types.includes(item.type))&&(!frequencies.length||frequencies.includes(occurrenceFrequencyKind(item)))&&(!statuses.length||statuses.includes(kind))&&(!search||[item.title,item.description,item.notes].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(search))));
    const pending=all.filter(entry=>entry.status==='pending').length,completed=all.filter(entry=>entry.status==='completed').length;
    $('#occurrences-content').innerHTML=`<div class="task-review-summary occurrence-review-summary"><article><span>PENDENTES</span><strong>${pending}</strong></article><article><span>CONCLUÍDOS</span><strong>${completed}</strong></article><article><span>TOTAL</span><strong>${all.length}</strong></article></div><div class="task-review-list"></div>`;
    const groups=new Map();
    for(const entry of filtered){
      const title=String(entry.item.title||'').trim();
      if(!groups.has(title))groups.set(title,{title,records:new Map(),entries:[]});
      const group=groups.get(title);
      group.records.set(entry.item.id,entry.item);
      group.entries.push(entry);
    }
    const labels={pending:'Pendente',completed:'Concluído'};
    const list=[...groups.values()].sort((a,b)=>a.title.localeCompare(b.title,'pt-BR')).map(group=>{
      const entries=group.entries.sort((a,b)=>b.date.localeCompare(a.date)),records=[...group.records.values()],primary=records[0],kind=OCCURRENCE_TYPES[primary.type]||OCCURRENCE_TYPES.reminder;
      const groupPending=entries.filter(entry=>entry.status==='pending').length,groupCompleted=entries.length-groupPending;
      const counts=`${groupPending?`<b class="is-pending">${groupPending} ${groupPending===1?'pendente':'pendentes'}</b>`:''}${groupCompleted?`<b class="is-completed">${groupCompleted} ${groupCompleted===1?'concluído':'concluídos'}</b>`:''}`;
      const typeLabels=[...new Set(records.map(record=>(OCCURRENCE_TYPES[record.type]||OCCURRENCE_TYPES.reminder).label))],scheduleText=occurrenceFocusScheduleLabel(primary);
      const detail=records.length>1?`${typeLabels.join(' / ')} · ${records.length} cadastros`:`${typeLabels[0]} · ${scheduleText}`;
      return `<details class="task-review-task-group" open><summary><span class="task-review-icon">${escapeHTML(primary.icon||kind.icon)}</span><span class="task-review-task-title"><strong>${escapeHTML(group.title)}</strong><small>${escapeHTML(detail)}</small></span><span class="task-review-task-counts">${counts}</span></summary><div class="task-review-occurrences">${entries.map(entry=>{
        const entryKind=OCCURRENCE_TYPES[entry.item.type]||OCCURRENCE_TYPES.reminder,recordHint=records.length>1?`<small>${escapeHTML(entryKind.label)} · ${escapeHTML(occurrenceFocusScheduleLabel(entry.item))}</small>`:'';
        const actions=entry.status==='pending'?`<button type="button" data-review-occurrence-action="complete" data-occurrence-id="${escapeHTML(entry.item.id)}" data-occurrence-key="${escapeHTML(entry.key)}" data-occurrence-date="${escapeHTML(entry.date)}">Concluir</button>`:entry.status==='completed'&&!entry.historical?`<button type="button" data-review-occurrence-action="reopen" data-occurrence-id="${escapeHTML(entry.item.id)}" data-occurrence-key="${escapeHTML(entry.key)}" data-occurrence-date="${escapeHTML(entry.date)}">Reabrir</button>`:'';
        return `<article class="task-review-occurrence is-${entry.status}"><div class="task-review-occurrence-date"><strong>${escapeHTML(fmtDate(entry.date,{weekday:'short',day:'numeric',month:'short',year:'numeric'}))}</strong>${recordHint}${entry.historical?'<small>Concluído no histórico</small>':''}</div><span class="task-review-status is-${entry.status}">${labels[entry.status]}</span><div class="task-review-actions">${actions}<button type="button" data-review-occurrence-action="open" data-occurrence-id="${escapeHTML(entry.item.id)}" data-occurrence-key="${entry.historical?'':escapeHTML(entry.key)}" data-occurrence-date="${escapeHTML(entry.date)}">Abrir</button></div></article>`;
      }).join('')}</div></details>`;
    }).join('');
    $('.task-review-list',$('#occurrences-content')).innerHTML=list||'<div class="empty-state"><span>◉</span><h3>Nenhuma pendência encontrada</h3><p>Altere os filtros ou o período da revisão.</p></div>';
  }
  function occurrenceRecurrenceStartsOn(item,date){
    if(item.startDate&&date<item.startDate||item.endDate&&date>item.endDate||item.scheduledDate&&date<item.scheduledDate)return false;
    if(item.recurrenceMode==='annual'){const base=item.scheduledDate;if(!base||date<base||date.slice(5)!==base.slice(5))return false;return true;}
    if(item.recurrenceMode==='after-date'){
      if(!item.scheduledDate||date<item.scheduledDate)return false;const base=safeDate(item.scheduledDate),interval=Math.max(1,Number(item.intervalDays)||1),target=safeDate(base);while(target<safeDate(date))target.setDate(target.getDate()+interval);const targetKey=`${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}-${String(target.getDate()).padStart(2,'0')}`;return date===targetKey;
    }
    if(item.recurrenceMode==='after-completion'){
      const history=(item.completionHistory||[]).filter(Boolean).sort(),last=history[history.length-1];if(!last&&!item.scheduledDate)return false;const due=safeDate(last||item.scheduledDate);if(last)due.setDate(due.getDate()+Math.max(1,Number(item.intervalDays)||1));const dueKey=`${due.getFullYear()}-${String(due.getMonth()+1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}`;return date===dueKey;
    }
    if(item.scheduledDate&&date===item.scheduledDate)return true;
    if(Array.isArray(item.monthWeeks)&&item.monthWeeks.length&&!item.monthWeeks.some(week=>monthWeekMatches(week,date)))return false;
    return (item.weekdays||[]).includes(safeDate(date).getDay());
  }
  function occurrenceIsScheduled(item,date){
    if(item.deleted)return false;
    if(item.schedule==='recurrence'&&item.startDate&&date<item.startDate)return false;
    if(item.schedule==='recurrence'&&item.endDate&&date>item.endDate)return false;
    if((item.dateExceptions||[]).some(exception=>exception.to===date))return true;
    if((item.dateExceptions||[]).some(exception=>exception.from===date))return false;
    if(item.type==='birthday')return Boolean(item.scheduledDate)&&item.scheduledDate.slice(5)===date.slice(5)&&(!item.startDate||date>=item.startDate)&&(!item.endDate||date<=item.endDate)&&occurrenceAnnualDateAllowed(item,date);
    if(item.schedule==='date')return Boolean(item.scheduledDate)&&date>=item.scheduledDate&&date<=(item.scheduledEndDate||item.scheduledDate);
    if(item.schedule==='month')return Boolean(item.week)&&item.scheduledMonth===date.slice(0,7)&&monthWeekMatches(item.week,date);
    if(item.schedule!=='recurrence'||!['reminder','cycle'].includes(item.type))return false;
    if(occurrenceRecurrenceStartsOn(item,date))return true;
    if(item.type!=='cycle'||!item.scheduledDate||!item.scheduledEndDate||item.scheduledEndDate<=item.scheduledDate)return false;
    const duration=Math.round((safeDate(item.scheduledEndDate)-safeDate(item.scheduledDate))/86400000);
    for(let offset=1;offset<=duration;offset++){const candidate=safeDate(date);candidate.setDate(candidate.getDate()-offset);const key=`${candidate.getFullYear()}-${String(candidate.getMonth()+1).padStart(2,'0')}-${String(candidate.getDate()).padStart(2,'0')}`;if(occurrenceRecurrenceStartsOn(item,key))return true;}
    return false;
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
    if(item.type==='birthday'&&item.scheduledDate)return `Todo ano em ${fmtDate(item.scheduledDate,{day:'numeric',month:'long'})}${occurrenceLeadDays(item)?` · ${occurrenceLeadDays(item)} dias antes`:''}`;
    if(item.schedule==='date'&&item.scheduledDate){const start=fmtDate(item.scheduledDate,{day:'numeric',month:'short',year:'numeric'});return item.scheduledEndDate&&item.scheduledEndDate!==item.scheduledDate?`${start} a ${fmtDate(item.scheduledEndDate,{day:'numeric',month:'short',year:'numeric'})}`:start;}
    if(item.schedule==='month')return `${item.week?`${monthWeekLabel(item.week)} · `:''}${fmtDate(`${item.scheduledMonth}-01`,{month:'long',year:'numeric'})}`;
    if(item.recurrenceMode==='annual')return `Anual · ${item.scheduledDate?fmtDate(item.scheduledDate,{day:'numeric',month:'long'}):'sem data agendada'}`;
    if(item.recurrenceMode==='after-date')return `${item.intervalDays||1} ${Number(item.intervalDays)===1?'dia':'dias'} após a data agendada`;
    if(item.recurrenceMode==='after-completion')return `${item.intervalDays||1} ${Number(item.intervalDays)===1?'dia':'dias'} após a conclusão`;
    const days=(item.weekdays||[]).map(day=>WEEKDAYS[day]).join(', '),weeks=item.monthWeeks?.length?` · ${item.monthWeeks.map(week=>monthWeekLabel(week).toLowerCase()).join(', ')}`:'';
    return `${days||'Sem dias'}${weeks}`;
  }
  function occurrenceCard(item,referenceDate=''){
    const type=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder,key=occurrenceCardKey(item),completed=Boolean(key)&&occurrenceInstanceCompleted(item,key);
    const status=item.consultative?'<span class="occurrence-status is-consultative">Consultivo</span>':completed?'<span class="occurrence-status is-done">Concluído</span>':key&&!occurrenceKeyIsFuture(key)?'<span class="occurrence-status is-pending">Pendente</span>':'';
    const detail=`${item.schedule==='recurrence'?escapeHTML(occurrenceScheduleLabel(item)):''}${status?`${item.schedule==='recurrence'?' · ':''}${status}`:''}`;
    return `<div class="action-card occurrence-card${completed?' is-complete':''}" style="--action-color:${escapeHTML(item.color||'#5DFF5D')}"><button type="button" class="action-card-main" data-open-occurrence="${escapeHTML(item.id)}"${referenceDate?` data-occurrence-date="${escapeHTML(referenceDate)}"`:''}${key?` data-occurrence-key="${escapeHTML(key)}"`:''}><span class="action-card-title"><span class="action-card-mark">${escapeHTML(item.icon||type.icon)}</span><strong>${escapeHTML(item.title)}</strong></span>${detail?`<small>${detail}</small>`:''}</button></div>`;
  }
  function renderOccurrenceList(items){
    const search=$('#occurrence-filter-search').value.trim().toLocaleLowerCase('pt-BR'),types=multiSelectValues('#occurrence-filter-type'),schedules=multiSelectValues('#occurrence-filter-schedule'),statuses=multiSelectValues('#occurrence-filter-status'),month=$('#occurrence-filter-month').value;
    const filtered=items.filter(item=>{
      if(search&&![item.title,item.description,item.notes].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(search)))return false;
      if(types.length&&!types.includes(item.type))return false;
      if(schedules.length&&!schedules.includes(item.type==='birthday'?'recurrence':item.schedule))return false;
      if(statuses.length&&!statuses.includes(occurrenceStatusKind(item)))return false;
      if(month&&!(item.schedule==='month'?occurrenceMonth(item,Number(month.slice(0,4)))===month:occurrenceViewDatesInMonth(item,month).some(date=>occurrenceVisibleOnDate(item,date))))return false;
      return true;
    });
    const meta=new Map();
    for(const item of filtered){const key=occurrenceListKey(item),completed=Boolean(key)&&occurrenceInstanceCompleted(item,key);meta.set(item.id,{key,completed,status:occurrenceStatusKind(item),frequency:occurrenceFrequencyLabel(item),next:occurrenceNextDate(item),oldest:occurrenceOldestPendingDate(item)});}
    const sortValue=(item,key)=>{const info=meta.get(item.id)||{};return ({title:item.title,type:OCCURRENCE_TYPES[item.type]?.label||'',frequency:info.frequency||'',schedule:item.type==='birthday'?item.scheduledDate?.slice(5)||'':item.scheduledDate||item.scheduledMonth||item.startDate||'',next:info.next||'9999-12-31',overdue:info.oldest||'9999-12-31',status:({pending:0,completed:1,consultative:2,neutral:3}[info.status]??4),created:(item.createdAt||'').slice(0,10)})[key]??'';};
    const multiplier=occurrenceListSort.dir==='desc'?-1:1,missing=value=>value==='9999-12-31';
    filtered.sort((a,b)=>{const left=sortValue(a,occurrenceListSort.key),right=sortValue(b,occurrenceListSort.key);if(missing(left)!==missing(right))return missing(left)?1:-1;const result=typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right),'pt-BR',{numeric:true});return result*multiplier||a.title.localeCompare(b.title,'pt-BR');});
    const columns=[['title','Acontecimento'],['type','Tipo'],['frequency','Frequência'],['schedule','Agendamento'],['next','Próxima ocorrência'],['overdue','Vencida desde'],['status','Situação'],['created','Criação']],headers=columns.map(([key,label])=>{const active=occurrenceListSort.key===key,mark=active?(occurrenceListSort.dir==='asc'?'↑':'↓'):'↕';return `<th scope="col" aria-sort="${active?(occurrenceListSort.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" class="record-sort-button${active?' is-sorted':''}" data-sort-occurrence="${key}">${label}<span class="record-sort-mark" aria-hidden="true">${mark}</span></button></th>`;}).join('');
    const rows=filtered.map(item=>{const kind=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder,info=meta.get(item.id),key=info.key,completed=info.status==='completed',status=info.status==='consultative'?'<span class="occurrence-status is-consultative">Consultivo</span>':info.status==='completed'?'<span class="occurrence-status is-done">Concluído</span>':info.status==='pending'?'<span class="occurrence-status is-pending">Pendente</span>':'<span class="occurrence-status is-neutral">—</span>',nextLabel=info.next?(item.schedule==='month'&&!item.week?fmtDate(info.next,{month:'short',year:'numeric'}):fmtDate(info.next,{day:'2-digit',month:'2-digit',year:'numeric'})):'—',overdueLabel=info.oldest?fmtDate(info.oldest,{day:'2-digit',month:'2-digit',year:'numeric'}):'—';return `<tr class="${completed?'is-complete':''}"><td><div class="action-list-title"><span>${escapeHTML(item.icon||kind.icon)}</span><button type="button" class="occurrence-list-link" data-open-occurrence="${escapeHTML(item.id)}"${key?` data-occurrence-key="${escapeHTML(key)}"`:''}><strong>${escapeHTML(item.title)}</strong>${item.description?`<small class="occurrence-list-description">${escapeHTML(item.description)}</small>`:''}</button></div></td><td><span class="occurrence-type occurrence-type-${escapeHTML(item.type)}">${escapeHTML(kind.label)}</span></td><td>${escapeHTML(info.frequency)}</td><td>${escapeHTML(occurrenceScheduleLabel(item))}</td><td>${escapeHTML(nextLabel)}</td><td>${info.oldest?`<span class="occurrence-late-date">${escapeHTML(overdueLabel)}</span>`:'—'}</td><td>${status}</td><td>${item.createdAt?escapeHTML(fmtDate(item.createdAt.slice(0,10),{day:'2-digit',month:'2-digit',year:'numeric'})):'—'}</td><td><button type="button" class="small-edit" data-edit-occurrence="${escapeHTML(item.id)}">Editar</button></td></tr>`;}).join('');
    $('#occurrences-content').innerHTML=`<p class="action-list-count">${filtered.length} ${filtered.length===1?'acontecimento encontrado':'acontecimentos encontrados'}</p><div class="action-list-scroll occurrence-list-scroll"><table class="action-list-table occurrence-list-table"><thead><tr>${headers}<th scope="col" aria-label="Ações"></th></tr></thead><tbody>${rows||'<tr><td colspan="9" class="action-list-empty">Nenhum acontecimento corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
  }
  function renderOccurrenceCalendarCells(items,start,weeks,visibleMonth){
    const keyOf=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const weekMarkup=[];
    for(let week=0;week<weeks;week++){
      const days=Array.from({length:7},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+week*7+index);return {date,key:keyOf(date)};});
      const segments=[];
      for(const item of items){
        if(item.schedule==='month')continue;
        if(item.type==='birthday'){
          if(!item.scheduledDate)continue;
          const lead=occurrenceLeadDays(item),weekStart=days[0].key,weekEnd=days[6].key,baseYear=Number(weekStart.slice(0,4));
          for(const birthday of [`${baseYear}-${item.scheduledDate.slice(5)}`,`${baseYear+1}-${item.scheduledDate.slice(5)}`]){
            if(!occurrenceAnnualDateAllowed(item,birthday))continue;
            const windowStart=dateKeyOffset(birthday,-lead);
            if(birthday<weekStart||windowStart>weekEnd)continue;
            let startKey=windowStart>weekStart?windowStart:weekStart,endKey=birthday<weekEnd?birthday:weekEnd;
            if(item.consultative&&startKey<isoToday())startKey=isoToday();
            if(startKey>endKey)continue;
            const first=days.findIndex(day=>day.key===startKey),last=days.findIndex(day=>day.key===endKey);
            if(first>=0&&last>=first)segments.push({item,start:first,end:last});
          }
          continue;
        }
        if(item.schedule==='date'&&item.scheduledDate&&item.scheduledEndDate&&item.scheduledEndDate>item.scheduledDate){
          const minKey=item.consultative?isoToday():'',first=days.findIndex(day=>day.key>=item.scheduledDate&&day.key<=item.scheduledEndDate&&(!minKey||day.key>=minKey)),last=days.findLastIndex(day=>day.key>=item.scheduledDate&&day.key<=item.scheduledEndDate);
          if(first>=0)segments.push({item,start:first,end:last});
        }else days.forEach((day,index)=>{if(occurrenceAppearsOn(item,day.key)&&occurrenceVisibleOnDate(item,day.key))segments.push({item,start:index,end:index});});
      }
      segments.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start)||a.item.title.localeCompare(b.item.title,'pt-BR'));
      const lanes=[];
      for(const segment of segments){let lane=lanes.findIndex(occupied=>Array.from({length:segment.end-segment.start+1},(_,offset)=>!occupied[segment.start+offset]).every(Boolean));if(lane<0){lane=lanes.length;lanes.push(Array(7).fill(false));}for(let index=segment.start;index<=segment.end;index++)lanes[lane][index]=true;segment.lane=lane;}
      for(let dayIndex=0;dayIndex<7;dayIndex++){
        const {date,key}=days[dayIndex],slots=Array.from({length:lanes.length},(_,lane)=>{
          const segment=segments.find(entry=>entry.lane===lane&&entry.start===dayIndex);
          if(segment){const {item}=segment,kind=OCCURRENCE_TYPES[item.type]||OCCURRENCE_TYPES.reminder,span=segment.end-segment.start+1,width=`calc(${span*100}% + ${(span-1)*13}px)`,key=occurrenceInstanceKey(item,days[dayIndex].key),completed=occurrenceInstanceCompleted(item,key),statusText=[completed?'Concluído':'',item.consultative?'Consultivo':''].filter(Boolean).join(' · ');return `<div class="action-calendar-item occurrence-calendar-item occurrence-calendar-range${completed?' is-complete':''}" draggable="true" data-drag-occurrence="${escapeHTML(item.id)}" data-occurrence-date="${days[dayIndex].key}" style="--action-color:${escapeHTML(item.color||'#5DFF5D')};width:${width}"><button type="button" class="occurrence-calendar-main" data-open-occurrence="${escapeHTML(item.id)}" data-occurrence-date="${days[dayIndex].key}" data-occurrence-key="${escapeHTML(key)}"><span>${escapeHTML(item.icon||kind.icon)}</span><span class="occurrence-calendar-copy"><span class="occurrence-calendar-title">${escapeHTML(item.title)}</span>${statusText?`<small>${escapeHTML(statusText)}</small>`:''}</span></button></div>`;}
          return `<span class="occurrence-calendar-slot${segments.some(entry=>entry.lane===lane&&entry.start<dayIndex&&entry.end>=dayIndex)?' is-continuation':''}" aria-hidden="true"></span>`;
        }).join('');
        weekMarkup.push(`<div class="action-calendar-day occurrence-calendar-day${date.getMonth()!==visibleMonth-1?' is-outside':''}${key===isoToday()?' is-today':''}" data-occurrence-calendar-date="${key}"><div class="action-calendar-day-head"><span>${date.getDate()}</span><button type="button" data-add-occurrence-date="${key}" aria-label="Adicionar acontecimento em ${escapeHTML(fmtDate(key))}">＋</button></div><div class="action-calendar-items occurrence-calendar-items">${slots}</div></div>`);
      }
    }
    return weekMarkup.join('');
  }
  function moveOccurrenceToDate(id,date,fromDate=''){fromDate=fromDate||window.__occurrenceDragDate||'';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const item=state.occurrences.find(entry=>entry.id===id&&!entry.deleted);if(!item)return;
    if(item.schedule==='month'){item.schedule='date';item.scheduledDate=date;item.scheduledMonth='';item.week=null;item.scheduledEndDate='';item.updatedAt=stamp();selectedOccurrenceMonth=date.slice(0,7);saveLocal();renderOccurrences();renderPlanner();toast('Acontecimento recebeu uma data específica.');return;}
    if(item.schedule==='recurrence'&&fromDate){if(!Array.isArray(item.dateExceptions))item.dateExceptions=[];item.dateExceptions=item.dateExceptions.filter(exception=>exception.from!==fromDate);item.dateExceptions.push({from:fromDate,to:date});item.updatedAt=stamp();selectedOccurrenceMonth=date.slice(0,7);saveLocal();renderOccurrences();renderPlanner();toast('Data desta ocorrência ajustada.');return;}
    if(item.schedule!=='date'||!item.scheduledDate)return;
    const start=new Date(`${item.scheduledDate}T12:00:00`),end=item.scheduledEndDate?new Date(`${item.scheduledEndDate}T12:00:00`):start,duration=Math.max(0,Math.round((end-start)/86400000));
    const next=new Date(`${date}T12:00:00`);next.setDate(next.getDate()+duration);
    item.scheduledDate=date;item.scheduledEndDate=duration?`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`:'';item.updatedAt=stamp();selectedOccurrenceMonth=date.slice(0,7);saveLocal();renderOccurrences();renderPlanner();toast('Acontecimento movido para a nova data.');
  }
  function occurrenceFrequencyKind(item){
    if(item.type==='birthday')return 'annual';
    if(item.schedule!=='recurrence')return 'none';
    return item.recurrenceMode||'every-week';
  }
  function renderOccurrences(){
    releaseTopScrolls($('#occurrences-content'));
    $('#occurrence-month').value=selectedOccurrenceMonth;
    $('#occurrence-current-month').classList.toggle('hidden',selectedOccurrenceMonth===isoToday().slice(0,7));
    $('.occurrence-month-navigator').classList.toggle('hidden',occurrenceView==='list'||occurrenceView==='week'||occurrenceView==='review'||occurrenceView==='date');
    $('.occurrence-week-navigator').classList.toggle('hidden',occurrenceView!=='week');
    $('#occurrence-list-filters').classList.toggle('hidden',occurrenceView!=='list');
    $('#occurrence-calendar-filters').classList.toggle('hidden',occurrenceView!=='date');
    $('#occurrence-review-filters').classList.toggle('hidden',occurrenceView!=='review');
    $$('.occurrence-tab').forEach(button=>{const active=button.dataset.occurrenceView===occurrenceView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    const calendarView=occurrenceView==='date',calendarTypes=calendarView?multiSelectValues('#occurrence-calendar-filter-type'):[],calendarFrequencies=calendarView?multiSelectValues('#occurrence-calendar-filter-frequency'):[],calendarStatuses=calendarView?multiSelectValues('#occurrence-calendar-filter-status'):[],items=state.occurrences.filter(item=>!item.deleted&&(!calendarTypes.length||calendarTypes.includes(item.type))&&(!calendarFrequencies.length||calendarFrequencies.includes(occurrenceFrequencyKind(item)))&&(!calendarStatuses.length||calendarStatuses.includes(occurrenceStatusKind(item)))),[year,month]=selectedOccurrenceMonth.split('-').map(Number);
    if(occurrenceView==='annual'){
      const months=Array.from({length:12},(_,index)=>`${year}-${String(index+1).padStart(2,'0')}`),headers=months.map((key,index)=>`<th scope="col" data-open-occurrence-month="${key}"><button type="button" class="annual-month-link" data-open-occurrence-month="${key}"><span class="annual-month-label annual-month-${index+1}">${escapeHTML(fmtDate(`${key}-01`,{month:'short'}))}</span></button></th>`).join(''),typeRows=Object.entries(OCCURRENCE_TYPES).map(([type,kind])=>{const cells=months.map(key=>{const entries=items.map(item=>{if(item.type!==type)return null;if(item.schedule==='month')return occurrenceMonth(item,year)===key&&occurrenceVisibleInMonth(item,key)?{item,date:`${key}-01`}:null;const dates=occurrenceViewDatesInMonth(item,key).filter(date=>occurrenceVisibleOnDate(item,date));return dates.length?{item,date:dates[0]}:null;}).filter(Boolean).sort((a,b)=>a.item.title.localeCompare(b.item.title,'pt-BR'));return `<td>${entries.map(({item,date})=>occurrenceCard(item,date)).join('')}</td>`;}).join('');return `<tr style="--area-color:#e8eeee"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${escapeHTML(kind.icon)}</span><span>${escapeHTML(kind.label)}s</span></th>${cells}</tr>`;}).join('');
      $('#occurrences-content').innerHTML=`<h3 class="action-period-title">${year}</h3><div class="weekly-scroll"><table class="weekly-table task-annual-table occurrence-annual-table"><thead><tr><th scope="col" class="weekly-corner">Tipo</th>${headers}</tr></thead><tbody>${typeRows}</tbody></table></div>`;
      setupTopScroll($('#occurrences-content .weekly-scroll'));
    }else if(occurrenceView==='monthly'){
      const weeks=monthlyWeeksFor(selectedOccurrenceMonth), headers=weeks.map(week=>{const [start,end]=monthWeekRange(selectedOccurrenceMonth,week),key=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;return `<th scope="col" class="monthly-week monthly-week-${week}"><button type="button" class="monthly-week-link" data-open-occurrence-week="${key(start)}"><span class="monthly-week-pill">${monthWeekLabel(week).toLowerCase()}</span><small>${escapeHTML(fmtDate(key(start),{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(key(end),{day:'numeric',month:'short'}))}</small></button></th>`;}).join('');
      const visibleDates=item=>occurrenceViewDatesInMonth(item,selectedOccurrenceMonth).filter(date=>occurrenceVisibleOnDate(item,date));
      const entries=items.filter(item=>item.schedule==='month'?occurrenceMonth(item,year)===selectedOccurrenceMonth&&occurrenceVisibleInMonth(item,selectedOccurrenceMonth):visibleDates(item).length>0);
      const typeRows=Object.entries(OCCURRENCE_TYPES).map(([type,kind])=>{const cells=weeks.map(week=>{const cards=entries.flatMap(item=>{if(item.type!==type)return [];if(item.schedule==='month'&&!item.week)return [];if(item.monthWeeks?.length&&!item.monthWeeks.includes(week))return [];if(!item.monthWeeks?.length&&week===6)return [];const dates=visibleDates(item).filter(date=>monthWeekNumber(date)===week);return dates.length?[{item,date:dates[0]}]:[];}).sort((a,b)=>a.item.title.localeCompare(b.item.title,'pt-BR'));return `<td>${cards.map(({item,date})=>occurrenceCard(item,date)).join('')}</td>`;}).join('');return `<tr><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${escapeHTML(kind.icon)}</span><span>${escapeHTML(kind.label)}s</span></th>${cells}</tr>`;}).join('');
      const monthOnly=entries.filter(item=>item.schedule==='month'&&!item.week).map(item=>occurrenceCard(item,`${selectedOccurrenceMonth}-01`)).join('');
      $('#occurrences-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedOccurrenceMonth}-01`,{month:'long',year:'numeric'}))}</h3><div class="weekly-scroll"><table class="weekly-table monthly-table"><thead><tr><th class="weekly-corner">Tipo</th>${headers}</tr></thead><tbody>${typeRows}</tbody></table></div>${monthOnly?`<section class="occurrence-month-undated"><h3>Sem data específica</h3><p>Agendados para algum momento deste mês.</p><div>${monthOnly}</div></section>`:''}`;
    }else if(occurrenceView==='week'){
      const dates=weekDates(selectedOccurrenceWeekDate), entries=items.filter(item=>item.schedule!=='month'&&dates.some(date=>occurrenceAppearsOn(item,date)&&occurrenceVisibleOnDate(item,date)));
      $('#occurrence-week-date').value=selectedOccurrenceWeekDate;
      $('#occurrence-week-today').classList.toggle('hidden',dates.includes(isoToday()));
      const typeRows=Object.entries(OCCURRENCE_TYPES).map(([type,kind])=>`<tr><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${escapeHTML(kind.icon)}</span><span>${escapeHTML(kind.label)}s</span></th>${dates.map(date=>`<td>${entries.filter(item=>item.type===type&&occurrenceAppearsOn(item,date)&&occurrenceVisibleOnDate(item,date)).map(item=>occurrenceCard(item,date)).join('')}</td>`).join('')}</tr>`).join('');
      $('#occurrences-content').innerHTML=`<h3 class="action-period-title">${escapeHTML(fmtDate(dates[0],{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'}))}</h3><div class="weekly-scroll"><table class="weekly-table"><thead><tr><th class="weekly-corner">Tipo</th>${weeklyHeaders(dates,'occurrences')}</tr></thead><tbody>${typeRows}</tbody></table></div>`;
    }else if(occurrenceView==='date'){
      const first=new Date(year,month-1,1),start=new Date(year,month-1,1-(first.getDay()+6)%7),last=new Date(year,month,0),weeks=Math.ceil(((first.getDay()+6)%7+last.getDate())/7),dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const heads=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map(label=>`<div class="action-calendar-heading">${label}</div>`).join('');
      const cells=renderOccurrenceCalendarCells(items,start,weeks,month);
      const monthOnly=items.filter(item=>item.schedule==='month'&&!item.week&&occurrenceMonth(item,year)===selectedOccurrenceMonth&&occurrenceVisibleInMonth(item,selectedOccurrenceMonth)).map(item=>{const key=occurrenceInstanceKey(item),completed=occurrenceInstanceCompleted(item,key),statusText=[completed?'Concluído':'',item.consultative?'Consultivo':''].filter(Boolean).join(' · ');return `<div class="action-calendar-item occurrence-calendar-undated${completed?' is-complete':''}" draggable="true" data-drag-occurrence="${escapeHTML(item.id)}" style="--action-color:${escapeHTML(item.color||'#5DFF5D')}"><button type="button" class="occurrence-calendar-main" data-open-occurrence="${escapeHTML(item.id)}" data-occurrence-key="${escapeHTML(key)}"><span>${escapeHTML(item.icon||'◉')}</span><span class="occurrence-calendar-copy"><span class="occurrence-calendar-title">${escapeHTML(item.title)}</span>${statusText?`<small>${escapeHTML(statusText)}</small>`:''}</span></button></div>`;}).join('');
      const calendarNavigator=`<div class="date-navigator occurrence-calendar-navigator"><button type="button" class="round-button" data-occurrence-calendar-shift="-1" aria-label="Mês anterior">←</button><input type="month" value="${escapeHTML(selectedOccurrenceMonth)}" data-occurrence-calendar-month aria-label="Escolher mês do calendário de acontecimentos"><button type="button" class="round-button" data-occurrence-calendar-shift="1" aria-label="Próximo mês">→</button><button type="button" class="today-button${selectedOccurrenceMonth===isoToday().slice(0,7)?' hidden':''}" data-occurrence-calendar-today>Atual</button></div>`;
      $('#occurrences-content').innerHTML=`<div class="occurrence-calendar-heading"><h3 class="action-period-title">${escapeHTML(fmtDate(`${selectedOccurrenceMonth}-01`,{month:'long',year:'numeric'}))}</h3>${calendarNavigator}</div><div class="action-calendar-scroll"><div class="action-calendar">${heads}${cells}</div></div>${monthOnly?`<section class="occurrence-month-undated"><h3>Sem data específica</h3><p>Arraste para um dia do calendário para definir a data.</p><div>${monthOnly}</div></section>`:''}`;
    }else if(occurrenceView==='review'){
      renderOccurrenceReview();
    }else renderOccurrenceList(items);
  }
  function buildOccurrenceOptions(item={}){
    $('#occurrence-weekday-options').innerHTML=WEEKDAYS.map((day,index)=>`<label class="weekday-option"><input type="checkbox" value="${index}" ${(item.weekdays||[]).includes(index)?'checked':''}><span>${day}</span></label>`).join('');
    $('#occurrence-month-week-options').innerHTML=MONTH_WEEK_OPTIONS.map(week=>`<label class="weekday-option"><input type="checkbox" value="${week}" ${(item.monthWeeks||[]).includes(week)?'checked':''}><span>${monthWeekLabel(week)}</span></label>`).join('');
  }
  function updateOccurrenceForm(){
    const type=$('#occurrence-type').value,schedule=$('#occurrence-schedule'),recurrenceOption=$('#occurrence-schedule option[value="recurrence"]');
    recurrenceOption.disabled=!['reminder','cycle'].includes(type);recurrenceOption.hidden=!['reminder','cycle'].includes(type);
    if(type==='birthday')schedule.value='date';else if(schedule.value==='recurrence'&&!['reminder','cycle'].includes(type))schedule.value='date';
    schedule.disabled=type==='birthday';
    const mode=schedule.value;
    $('#occurrence-month-field').classList.toggle('hidden',mode!=='month');$('#occurrence-date-field').classList.toggle('hidden',mode!=='date');$('#occurrence-recurrence-field').classList.toggle('hidden',mode!=='recurrence');
    $('#occurrence-end-date-field').classList.toggle('hidden',mode!=='date'||!['event','holiday','cycle'].includes(type));
    $('#occurrence-annual-hint').classList.toggle('hidden',type!=='birthday');
    $('#occurrence-lead-days-field').classList.toggle('hidden',type!=='birthday');
    const repeatMode=$('#occurrence-repeat-mode').value,dateBasedMode=['after-completion','annual','after-date'].includes(repeatMode);$('#occurrence-recurrence-date-field').classList.toggle('hidden',mode!=='recurrence');$('#occurrence-recurrence-end-date-field').classList.toggle('hidden',mode!=='recurrence'||type!=='cycle');$('#occurrence-month-weeks-field').classList.toggle('hidden',mode!=='recurrence'||repeatMode!=='month-weeks');$('#occurrence-after-completion-field').classList.toggle('hidden',mode!=='recurrence'||!['after-completion','after-date'].includes(repeatMode));$('#occurrence-weekdays-field').classList.toggle('hidden',mode!=='recurrence'||dateBasedMode);if(repeatMode==='after-date'){$('#occurrence-after-completion-field .field-label').textContent='Repetir quantos dias após a data agendada?';$('#occurrence-after-completion-field .schedule-hint').textContent='As próximas ocorrências são calculadas a partir da data agendada.';}else{$('#occurrence-after-completion-field .field-label').textContent='Repetir quantos dias após concluir?';$('#occurrence-after-completion-field .schedule-hint').textContent='A próxima ocorrência só aparece depois que a anterior for concluída.';}
  }
  function openOccurrenceDialog(id=null){
    const item=state.occurrences.find(entry=>entry.id===id&&!entry.deleted);
    $('#occurrence-form').reset();$('#occurrence-id').value=item?.id||'';$('#occurrence-dialog-title').textContent=item?'Editar acontecimento':'Novo acontecimento';
    $('#occurrence-title').value=item?.title||'';$('#occurrence-type').value=item?.type||'reminder';$('#occurrence-description').value=item?.description||'';$('#occurrence-icon').value=item?.icon||'';$('#occurrence-color').value=item?.color||'#5DFF5D';$('#occurrence-consultative').checked=Boolean(item?.consultative);
    $('#occurrence-schedule').value=item?.schedule||'date';$('#occurrence-scheduled-month').value=item?.scheduledMonth||selectedOccurrenceMonth;$('#occurrence-scheduled-date').value=item?.scheduledDate||selectedDate;$('#occurrence-scheduled-end-date').value=item?.scheduledEndDate||'';$('#occurrence-week').value=item?.week||'';$('#occurrence-lead-days').value=item?.leadDays||0;
    $('#occurrence-repeat-mode').value=item?.recurrenceMode|| (item?.monthWeeks?.length?'month-weeks':'every-week');$('#occurrence-recurrence-date').value=item?.scheduledDate||item?.startDate||selectedDate;$('#occurrence-recurrence-end-date').value=item?.schedule==='recurrence'?item?.scheduledEndDate||'':'';$('#occurrence-interval-days').value=item?.intervalDays||'';$('#occurrence-start').value=item?.startDate||'';$('#occurrence-end').value=item?.endDate||'';$('#occurrence-notes').value=item?.notes||'';
    buildOccurrenceOptions(item);$('#delete-occurrence').classList.toggle('hidden',!item);updateOccurrenceForm();refreshColorPalettes();$('#occurrence-dialog').showModal();
  }
  function saveOccurrence(event){
    event.preventDefault();const title=$('#occurrence-title').value.trim(),type=$('#occurrence-type').value,schedule=type==='birthday'?'date':$('#occurrence-schedule').value,scheduledMonth=$('#occurrence-scheduled-month').value,scheduledDate=$('#occurrence-scheduled-date').value;
    const scheduledEndDate=type==='cycle'&&schedule==='recurrence'?$('#occurrence-recurrence-end-date').value:['event','holiday','cycle'].includes(type)&&schedule==='date'?$('#occurrence-scheduled-end-date').value:'',recurrenceStart=$('#occurrence-start').value,recurrenceEnd=$('#occurrence-end').value;
    if(!title){toast('Dê um nome ao acontecimento.');return;}if(schedule==='date'&&!scheduledDate){toast('Escolha a data do acontecimento.');return;}if(schedule==='month'&&!scheduledMonth){toast('Escolha o mês do acontecimento.');return;}if(schedule==='date'&&scheduledEndDate&&scheduledEndDate<scheduledDate){toast('A data final deve ser igual ou posterior à data inicial.');return;}
    if(schedule==='recurrence'&&recurrenceStart&&recurrenceEnd&&recurrenceEnd<recurrenceStart){toast('O término da recorrência deve ser igual ou posterior ao início.');return;}
    const repeatMode=$('#occurrence-repeat-mode').value,dateBasedMode=['after-completion','annual','after-date'].includes(repeatMode),recurrenceScheduledDate=$('#occurrence-recurrence-date').value,weekdays=dateBasedMode?[]:$$('#occurrence-weekday-options input:checked').map(input=>Number(input.value)),monthWeeks=repeatMode==='month-weeks'?$$('#occurrence-month-week-options input:checked').map(input=>Number(input.value)):[],intervalDays=['after-completion','after-date'].includes(repeatMode)?Number($('#occurrence-interval-days').value)||0:null;
    if(schedule==='recurrence'&&!dateBasedMode&&!weekdays.length){toast('Escolha ao menos um dia da semana.');return;}if(schedule==='recurrence'&&repeatMode==='month-weeks'&&!monthWeeks.length){toast('Escolha ao menos uma semana do mês.');return;}if(schedule==='recurrence'&&['after-completion','after-date'].includes(repeatMode)&&intervalDays<1){toast('Informe um intervalo de dias válido.');return;}if(schedule==='recurrence'&&!recurrenceScheduledDate){toast('Informe a data agendada da primeira ocorrência.');return;}if(schedule==='recurrence'&&scheduledEndDate&&scheduledEndDate<recurrenceScheduledDate){toast('A data final da primeira ocorrência deve ser igual ou posterior à data agendada.');return;}if(schedule==='recurrence'&&recurrenceStart&&recurrenceScheduledDate&&recurrenceScheduledDate<recurrenceStart){toast('A primeira ocorrência não pode ser anterior ao início da recorrência.');return;}if(schedule==='recurrence'&&recurrenceEnd&&recurrenceScheduledDate&&recurrenceScheduledDate>recurrenceEnd){toast('A primeira ocorrência não pode ser posterior ao fim da recorrência.');return;}
    const id=$('#occurrence-id').value||uid(),existing=state.occurrences.find(item=>item.id===id),next={id,title,type,description:$('#occurrence-description').value.trim(),notes:$('#occurrence-notes').value.trim(),icon:$('#occurrence-icon').value.trim(),color:$('#occurrence-color').value,schedule,scheduledMonth:schedule==='month'?scheduledMonth:'',scheduledDate:schedule==='date'?scheduledDate:schedule==='recurrence'?recurrenceScheduledDate:'',scheduledEndDate,week:schedule==='month'?Number($('#occurrence-week').value)||null:null,weekdays:schedule==='recurrence'?weekdays:[],monthWeeks:schedule==='recurrence'?monthWeeks:[],recurrenceMode:schedule==='recurrence'?repeatMode:'',intervalDays:schedule==='recurrence'?intervalDays:null,completionHistory:existing?.completionHistory||[],completedDates:existing?.completedDates||[],consultative:$('#occurrence-consultative').checked,leadDays:type==='birthday'?Math.max(0,Math.min(365,Number($('#occurrence-lead-days').value)||0)):0,dateExceptions:existing?.dateExceptions||[],startDate:schedule==='recurrence'?recurrenceStart:'',endDate:schedule==='recurrence'?recurrenceEnd:'',createdAt:existing?.createdAt||isoToday(),updatedAt:stamp(),deleted:false};
    const index=state.occurrences.findIndex(item=>item.id===id);if(index<0)state.occurrences.push(next);else state.occurrences[index]=next;
    selectedOccurrenceMonth=(schedule==='date'?`${selectedOccurrenceMonth.slice(0,4)}-${scheduledDate.slice(5,7)}`:schedule==='month'?scheduledMonth:schedule==='recurrence'&&recurrenceScheduledDate?recurrenceScheduledDate.slice(0,7):selectedOccurrenceMonth);saveLocal();$('#occurrence-dialog').close();renderOccurrences();renderPlanner();toast('Acontecimento salvo.');
  }
  function deleteOccurrence(){
    const item=state.occurrences.find(entry=>entry.id===$('#occurrence-id').value&&!entry.deleted);if(!item)return;if(!confirm(`Excluir o acontecimento “${item.title}”?`))return;
    item.deleted=true;item.updatedAt=stamp();saveLocal();$('#occurrence-dialog').close();renderOccurrences();renderPlanner();toast('Acontecimento excluído.');
  }
  function anchorDatesInMonth(anchor,monthKey){const [year,month]=monthKey.split('-').map(Number),length=new Date(year,month,0).getDate(),dates=[];for(let day=1;day<=length;day++){const date=`${monthKey}-${String(day).padStart(2,'0')}`;if(dayIsScheduled(anchor,date))dates.push(date);}return dates;}
  function anchorHasSchedule(anchor){return anchor.scheduleType==='day'?(anchor.weekdays||[]).length>0:anchor.scheduleType==='week'?(anchor.monthWeeks||[]).length>0:anchor.scheduleType==='month'?(anchor.scheduledMonths||[]).length>0:false;}
  function anchorAppearsInMonth(anchor,monthKey){if(!anchorHasSchedule(anchor))return false;if(anchor.startDate&&`${monthKey}-31`<anchor.startDate||anchor.endDate&&`${monthKey}-01`>anchor.endDate)return false;if(anchor.scheduleType==='month')return anchor.scheduledMonths.includes(Number(monthKey.slice(5,7)));if(anchor.scheduleType==='week')return anchor.monthWeeks.length>0;return anchorDatesInMonth(anchor,monthKey).length>0;}
  function anchorPlanningCard(anchor,detail='',dragWeek=null){return `<button type="button" class="weekly-anchor weekly-global-item anchor-planning-card" data-edit-anchor="${escapeHTML(anchor.id)}"${dragWeek!==null?` draggable="true" data-drag-anchor-month="${escapeHTML(anchor.id)}" data-drag-anchor-week="${escapeHTML(dragWeek)}"`:''}><span aria-hidden="true">${escapeHTML(anchor.icon||'✦')}</span><span>${escapeHTML(anchor.title)}${detail?`<small>${escapeHTML(detail)}</small>`:''}</span></button>`;}
  function renderAnchorViews(areas,areaById){
    const anchors=state.anchors.filter(anchor=>!anchor.deleted),rowsForDates=dates=>areas.map(area=>{const cells=dates.map(date=>`<td>${anchors.filter(anchor=>anchor.areaId===area.id&&dayIsScheduled(anchor,date)).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR')).map(anchor=>anchorPlanningCard(anchor)).join('')}</td>`).join('');return `<tr style="--area-color:${escapeHTML(area.color)}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${AREA_ICONS[area.id]||'✦'}</span><span>${escapeHTML(area.name)}</span></th>${cells}</tr>`;}).join('');
    $('#anchor-day-date').value=selectedAnchorDate;$('#anchor-day-label').textContent=fmtDate(selectedAnchorDate);$('#anchor-day-today').classList.toggle('hidden',selectedAnchorDate===isoToday());
    const dayAnchors=anchors.filter(anchor=>dayIsScheduled(anchor,selectedAnchorDate)).sort((a,b)=>(areaById.get(a.areaId)?.order??999)-(areaById.get(b.areaId)?.order??999)||a.title.localeCompare(b.title,'pt-BR'));
    $('#anchor-day-list').innerHTML=dayAnchors.length?dayAnchors.map(anchor=>`<article class="anchor-card"><span class="anchor-icon">${escapeHTML(anchor.icon||'✦')}</span><div class="anchor-info"><strong>${escapeHTML(anchor.title)}</strong><small>${escapeHTML(areaById.get(anchor.areaId)?.name||'Tipo indisponível')}${anchor.scheduledTime?` · ${escapeHTML(anchor.scheduledTime)}`:''}</small>${anchor.description?`<p>${escapeHTML(anchor.description)}</p>`:''}</div><button type="button" class="small-edit" data-edit-anchor="${escapeHTML(anchor.id)}">Editar</button></article>`).join(''):'<div class="empty-state"><h3>Nenhuma âncora neste dia</h3><p>Escolha outra data ou crie uma nova âncora.</p></div>';
    const week=weekDates(selectedAnchorWeekDate);$('#anchor-week-date').value=selectedAnchorWeekDate;$('#anchor-week-label').textContent=`${fmtDate(week[0],{day:'numeric',month:'short'})} a ${fmtDate(week[6],{day:'numeric',month:'short',year:'numeric'})}`;$('#anchor-week-today').classList.toggle('hidden',week.includes(isoToday()));$('#anchor-week-grid').innerHTML=`<table class="weekly-table"><thead><tr><th scope="col" class="weekly-corner">Tipo</th>${weeklyHeaders(week,'actions')}</tr></thead><tbody>${rowsForDates(week)}</tbody></table>`;
    const weeks=monthlyWeeksFor(selectedAnchorMonth);$('#anchor-month-date').value=selectedAnchorMonth;$('#anchor-month-label').textContent=fmtDate(`${selectedAnchorMonth}-01`,{month:'long',year:'numeric'});$('#anchor-month-today').classList.toggle('hidden',selectedAnchorMonth===isoToday().slice(0,7));
    const monthHeaders=weeks.map(week=>{const [start,end]=monthWeekRange(selectedAnchorMonth,week),startKey=`${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`,endKey=`${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;return `<th scope="col" class="monthly-week monthly-week-${week}"><span class="monthly-week-pill">${monthWeekLabel(week).toLowerCase()}</span><small>${escapeHTML(fmtDate(startKey,{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(endKey,{day:'numeric',month:'short'}))}</small></th>`}).join(''),monthRows=areas.map(area=>{const cells=weeks.map(week=>`<td data-anchor-month-week="${week}">${anchors.filter(anchor=>anchor.areaId===area.id&&anchor.scheduleType==='week'&&anchorAppearsInMonth(anchor,selectedAnchorMonth)&&(anchor.monthWeeks||[]).includes(week)).map(anchor=>anchorPlanningCard(anchor,monthWeekLabel(week),week)).join('')}</td>`).join('');return `<tr style="--area-color:${escapeHTML(area.color)}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${AREA_ICONS[area.id]||'✦'}</span><span>${escapeHTML(area.name)}</span></th>${cells}</tr>`;}).join('');$('#anchor-month-grid').innerHTML=`<table class="weekly-table monthly-table"><thead><tr><th scope="col" class="weekly-corner">Tipo</th>${monthHeaders}</tr></thead><tbody>${monthRows}</tbody></table>`;
    const months=Array.from({length:12},(_,index)=>`${selectedAnchorYear}-${String(index+1).padStart(2,'0')}`);$('#anchor-annual-year').value=String(selectedAnchorYear);$('#anchor-annual-label').textContent=String(selectedAnchorYear);$('#anchor-annual-today').classList.toggle('hidden',selectedAnchorYear===Number(isoToday().slice(0,4)));const annualHeaders=months.map((month,index)=>`<th scope="col" data-open-anchor-month="${month}"><button type="button" class="annual-month-link" data-open-anchor-month="${month}"><span class="annual-month-label annual-month-${index+1}">${escapeHTML(fmtDate(`${month}-01`,{month:'short'}))}</span></button></th>`).join(''),annualRows=areas.map(area=>{const cells=months.map(monthKey=>`<td>${anchors.filter(anchor=>anchor.areaId===area.id&&anchor.scheduleType==='month'&&anchorAppearsInMonth(anchor,monthKey)).map(anchor=>anchorPlanningCard(anchor)).join('')}</td>`).join('');return `<tr style="--area-color:${escapeHTML(area.color)}"><th scope="row"><span class="weekly-area-icon" aria-hidden="true">${AREA_ICONS[area.id]||'✦'}</span><span>${escapeHTML(area.name)}</span></th>${cells}</tr>`;}).join('');$('#anchor-annual-grid').innerHTML=`<table class="weekly-table task-annual-table"><thead><tr><th scope="col" class="weekly-corner">Tipo</th>${annualHeaders}</tr></thead><tbody>${annualRows}</tbody></table>`;
    setupTopScroll($('#anchor-annual-grid'));
  }
  function renderAnchors(options={}){
    const areas=orderedAreas(),areaById=new Map(areas.map(area=>[area.id,area]));renderAnchorViews(areas,areaById);
    if(selectedAnchorArea&&!areaById.has(selectedAnchorArea))selectedAnchorArea='';$('#anchor-area-filter').innerHTML='<option value="">Todos os tipos</option>'+areas.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');$('#anchor-area-filter').value=selectedAnchorArea;$('#anchor-schedule-filter').value=selectedAnchorSchedule;
    const scheduleLabel=anchor=>anchor.scheduleType==='week'?'Por semana':anchor.scheduleType==='month'?'Por mês':anchor.scheduleType==='day'?'Por dia':'Sem agendamento';
    const scheduleDetail=anchor=>{if(!anchorHasSchedule(anchor))return 'Sem opção marcada';if(anchor.scheduleType==='day')return (anchor.weekdays||[]).sort((a,b)=>a-b).map(day=>WEEKDAYS[day]).join(' · ');if(anchor.scheduleType==='week')return (anchor.monthWeeks||[]).sort((a,b)=>a-b).map(week=>monthWeekLabel(week).toLowerCase()).join(' · ');return (anchor.scheduledMonths||[]).sort((a,b)=>a-b).map(month=>fmtDate(`2020-${String(month).padStart(2,'0')}-01`,{month:'long'})).join(' · ');};
    const allAnchors=state.anchors.filter(anchor=>!anchor.deleted&&(!selectedAnchorArea||anchor.areaId===selectedAnchorArea)&&(!selectedAnchorSchedule||(selectedAnchorSchedule==='none'?!anchorHasSchedule(anchor):anchor.scheduleType===selectedAnchorSchedule))).sort((a,b)=>(areaById.get(a.areaId)?.order??999)-(areaById.get(b.areaId)?.order??999)||a.title.localeCompare(b.title,'pt-BR'));
    $('#anchor-list').innerHTML=allAnchors.length?allAnchors.map(anchor=>`<article class="anchor-card"><span class="anchor-icon">${escapeHTML(anchor.icon||'✦')}</span><div class="anchor-info"><strong>${escapeHTML(anchor.title)}</strong><small>${escapeHTML(areaById.get(anchor.areaId)?.name||'Tipo indisponível')}</small>${anchor.description?`<p>${escapeHTML(anchor.description)}</p>`:''}</div><div class="anchor-schedule-column"><strong>${escapeHTML(scheduleLabel(anchor))}</strong><small>${escapeHTML(scheduleDetail(anchor))}</small></div><button type="button" class="small-edit" data-edit-anchor="${escapeHTML(anchor.id)}">Editar</button></article>`).join(''):'<div class="empty-state"><h3>Nenhuma âncora encontrada</h3><p>Altere os filtros ou crie uma nova âncora.</p></div>';
    $('#area-list').innerHTML=areas.map((area,index)=>`<article class="area-card"><span class="area-swatch" style="background:${escapeHTML(area.color)}"></span><strong>${escapeHTML(area.name)}</strong><div class="area-card-actions"><button type="button" data-move-area="up" data-area-id="${escapeHTML(area.id)}" aria-label="Mover ${escapeHTML(area.name)} para cima" ${index===0?'disabled':''}>↑</button><button type="button" data-move-area="down" data-area-id="${escapeHTML(area.id)}" aria-label="Mover ${escapeHTML(area.name)} para baixo" ${index===areas.length-1?'disabled':''}>↓</button><button type="button" class="small-edit" data-edit-area="${escapeHTML(area.id)}">Editar</button></div></article>`).join('');
    if(!options.preserveSettings){
    $('#daily-view-groups').innerHTML=DAILY_VIEW_GROUPS.map(([key,label,,weekly,timeline])=>`<div class="daily-view-group-row"><strong>${escapeHTML(label)}</strong><label class="daily-view-select"><span>Visão diária</span><select class="text-input" id="daily-view-${key}" data-daily-view-group="${key}"><option value="primary" ${dailyViewOfGroup(key)==='primary'?'selected':''}>Principal</option><option value="secondary" ${dailyViewOfGroup(key)==='secondary'?'selected':''}>Secundária</option></select></label>${weekly?`<label class="daily-weekly-toggle"><input type="checkbox" data-daily-weekly-group="${key}" ${groupInWeekly(key)?'checked':''}><span class="settings-check" aria-hidden="true"></span><span class="settings-toggle-label">Visão semanal</span></label>`:'<span></span>'}${timeline?`<label class="daily-weekly-toggle"><input type="checkbox" data-daily-timeline-group="${key}" ${groupInTimeline(key)?'checked':''}><span class="settings-check" aria-hidden="true"></span><span class="settings-toggle-label">Cronograma</span></label>`:'<span></span>'}</div>`).join('');
    $('#anchor-view-groups').innerHTML=areas.map(area=>`<div class="daily-view-group-row"><strong>${escapeHTML(area.name)}</strong><label class="daily-view-select"><span>Visão diária</span><select class="text-input" data-anchor-daily-view="${escapeHTML(area.id)}"><option value="primary" ${area.dailyView==='primary'?'selected':''}>Principal</option><option value="secondary" ${area.dailyView==='secondary'?'selected':''}>Secundária</option></select></label><label class="daily-weekly-toggle"><input type="checkbox" data-anchor-weekly-view="${escapeHTML(area.id)}" ${area.weeklyView!==false?'checked':''}><span class="settings-check" aria-hidden="true"></span><span class="settings-toggle-label">Visão semanal</span></label><label class="daily-weekly-toggle"><input type="checkbox" data-anchor-timeline-view="${escapeHTML(area.id)}" ${area.timelineView!==false?'checked':''}><span class="settings-check" aria-hidden="true"></span><span class="settings-toggle-label">Cronograma</span></label></div>`).join('');
    }
  }
  function moveAnchorMonthWeek(id,fromWeek,toWeek){
    const anchor=state.anchors.find(item=>item.id===id&&!item.deleted&&item.scheduleType==='week');if(!anchor||fromWeek===toWeek)return;
    const weeks=Array.isArray(anchor.monthWeeks)?anchor.monthWeeks.slice():[];const from=Number(fromWeek),to=Number(toWeek);if(!weeks.includes(from)||!Number.isInteger(to)||to<1||to>6)return;
    anchor.monthWeeks=weeks.filter(week=>Number(week)!==from);if(!anchor.monthWeeks.includes(to))anchor.monthWeeks.push(to);anchor.monthWeeks.sort((a,b)=>a-b);anchor.updatedAt=stamp();saveLocal();renderAnchors();toast(`Âncora movida para ${monthWeekLabel(to).toLowerCase()}.`);
  }
  function persistDailyViewGroups(options={}){
    const now=stamp(),announce=options.announce!==false,preserveSettings=options.preserveSettings===true;
    let changed=false;
    for(const input of $$('#daily-view-groups [data-daily-view-group]')){
      const key=input.dataset.dailyViewGroup,previous=state.dailyViews[key]||{},next={view:input.value==='primary'?'primary':'secondary',weekly:Boolean($(`[data-daily-weekly-group="${key}"]`)?.checked),timeline:Boolean($(`[data-daily-timeline-group="${key}"]`)?.checked)};
      const updated=previous.view!==next.view||previous.weekly!==next.weekly||previous.timeline!==next.timeline;
      state.dailyViews[key]={...next,updatedAt:updated?now:(previous.updatedAt||'')};
      if(updated)changed=true;
    }
    for(const input of $$('#anchor-view-groups [data-anchor-daily-view]')){
      const area=state.areas.find(item=>item.id===input.dataset.anchorDailyView&&!item.deleted);if(!area)continue;
      const next={dailyView:input.value==='secondary'?'secondary':'primary',weeklyView:Boolean($(`[data-anchor-weekly-view="${area.id}"]`)?.checked),timelineView:Boolean($(`[data-anchor-timeline-view="${area.id}"]`)?.checked)};
      const updated=area.dailyView!==next.dailyView||area.weeklyView!==next.weeklyView||area.timelineView!==next.timelineView;
      area.dailyView=next.dailyView;area.weeklyView=next.weeklyView;area.timelineView=next.timelineView;
      if(updated){area.updatedAt=now;changed=true;}
    }
    if(changed)state.dailyViewsUpdatedAt=now;
    saveLocal();
    renderPlanner();renderTimeline();renderWeekly();renderMonthly();renderAnchors({preserveSettings});renderTaskWeekly();renderActions();
    if(announce)toast('Configurações salvas.');
  }
  function saveDailyViewGroups(event){event.preventDefault();persistDailyViewGroups();}
  let projectView='progress',selectedProjectHistoryId='',projectHistoryEditMode=false,projectMonthEditMode=false,selectedProjectCalendarMonth=isoToday().slice(0,7),selectedProjectMonth=isoToday().slice(0,7),activeProjectId='',expandedProjectTasks=new Set(),selectedHabitWeekDate=isoToday(),projectMonthNoteTimer=null;
  const projectOpenNoteMonths=new Set(),projectExtraNoteMonths=new Set();
  const openProjects=new Set(['project-2004']);
  const PROJECT_EXCLUDED_STATUSES=new Set(['Remodelada','Descartada']);
  const projectMonthKey=date=>String(date||isoToday()).slice(0,7).replace('-','');
  const projectValue=value=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?null:Math.max(0,Math.min(100,Number(value)));
  function projectList(){return state.projects.filter(project=>!project.deleted);}
  function projectAreaName(project){return project?actionAreaName(project):'';}
  function projectArea(project){return state.actionAreas.find(area=>area.id===project?.areaId&&!area.deleted)||null;}
  function projectAreaColor(project){
    const area=projectArea(project),color=String(area?.color||'').toLowerCase();
    if(color&&color!=='#dcebe7'&&color!=='#e8e5dd')return color;
    const index=orderedActionAreas().findIndex(item=>item.id===project?.areaId);
    if(index>=0)return PROJECT_AREA_COLORS[index%PROJECT_AREA_COLORS.length];
    const name=area?.name||projectAreaName(project);
    return name?projectColorForArea(name):(project.color||'#6657e8');
  }
  function projectStatusClass(status){return String(status||'Em andamento').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-');}
  function recurringTaskProgress(task){const values=(task.occurrences||[]).filter(item=>item.result!=='skipped'&&item.result!=='scheduled'&&item.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))).map((item,index)=>({value:projectValue(item.progress),weight:index<3?3:index<6?2:1})).filter(item=>item.value!==null);if(!values.length)return projectValue(task.progress);const totalWeight=values.reduce((sum,item)=>sum+item.weight,0);return values.reduce((sum,item)=>sum+item.value*item.weight,0)/totalWeight;}
  function taskProgress(task){if(projectStatusClass(task.status)==='concluida')return 100;if(taskIsHabit(task))return habitProgress(task).percent;if(task.recurring)return recurringTaskProgress(task);return projectValue(task.progress);}
  function projectProgress(project){
    if(projectStatusClass(project.status)==='concluida')return 100;
    if(project.progress!==null&&project.progress!==undefined&&project.progress!=='')return projectValue(project.progress);
    const values=project.tasks.filter(task=>!task.deleted&&!PROJECT_EXCLUDED_STATUSES.has(task.status)).map(taskProgress).filter(value=>value!==null);
    return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
  }
  function projectStatus(project){return project.status||'Em andamento';}
  function ownerEndDate(owner){const own=String(owner?.endDate||'');if(own)return own;if(owner?.projectId){const project=state.projects.find(item=>item.id===owner.projectId);return String(project?.endDate||'');}return '';}
  function ownerStartDate(owner){const own=String(owner?.startDate||'');if(own)return own;if(owner?.projectId){const project=state.projects.find(item=>item.id===owner.projectId);return String(project?.startDate||'');}return '';}
  function ownerStartPeriod(owner){const value=ownerStartDate(owner);return /^\d{4}-\d{2}/.test(value)?value.slice(0,7).replace('-',''):'';}
  function monthAfterCompletion(owner,monthKey){const end=projectStatusClass(owner?.status)==='concluida'&&/^\d{4}-\d{2}/.test(ownerEndDate(owner))?ownerEndDate(owner).slice(0,7):'';if(!end)return false;const raw=String(monthKey||''),key=/^\d{6}$/.test(raw)?`${raw.slice(0,4)}-${raw.slice(4)}`:raw.slice(0,7);return /^\d{4}-\d{2}$/.test(key)&&key>end;}
  function completionPeriod(owner){return projectStatusClass(owner?.status)==='concluida'&&/^\d{4}-\d{2}/.test(ownerEndDate(owner))?ownerEndDate(owner).slice(0,7).replace('-',''):'';}
  function projectStatusForMonth(project,monthKey=selectedProjectMonth){if(monthAfterCompletion(project,monthKey))return'Concluída';const saved=project?.statusHistory?.[projectMonthKey(monthKey)];return saved||projectStatus(project);}
  function projectMonthStatusTag(project,period){const status=monthAfterCompletion(project,period)?'Concluída':project?.statusHistory?.[period];if(!status)return'';return `<span class="project-status project-status-${projectStatusClass(status)} project-history-status" title="${escapeHTML(projectPeriodLabel(period))}: ${escapeHTML(status)}">${escapeHTML(status)}</span>`;}
  function projectStatusForView(project){return projectView==='progress'?projectStatusForMonth(project,selectedProjectMonth):projectStatus(project);}
  const PROJECT_FINAL_STATUSES=new Set(['Concluída','Remodelada','Descartada']);
  function statusIsFinal(status){return PROJECT_FINAL_STATUSES.has(status);}
  function completionEndDate(status,endDate){const value=String(endDate||'').trim();return value||(status==='Concluída'?isoToday():'');}
  function projectIsFinalized(project){return statusIsFinal(projectStatus(project));}
  function projectEndLabel(project){const value=String(project?.endDate||'').slice(0,10);return value?fmtDate(value,{day:'2-digit',month:'2-digit',year:'numeric'}):'';}
  function taskEndLabel(task){const value=String(task?.endDate||'').slice(0,10);return value?fmtDate(value,{day:'2-digit',month:'2-digit',year:'numeric'}):'';}
  function taskStatusForMonth(task,monthKey=selectedProjectMonth){if(monthAfterCompletion(task,monthKey))return'Concluída';const saved=task?.statusHistory?.[projectMonthKey(monthKey)];return saved||task?.status||'Em andamento';}
  function taskMonthStatusTag(task,period){const status=monthAfterCompletion(task,period)?'Concluída':task?.statusHistory?.[period];if(!status)return'';return `<span class="project-status project-status-${projectStatusClass(status)} project-history-status" title="${escapeHTML(projectPeriodLabel(period))}: ${escapeHTML(status)}">${escapeHTML(status)}</span>`;}
  const PROJECT_STATUS_OPTIONS=['Em andamento','Stand-by','Concluída','Remodelada','Descartada'];
  function historyStatusOptions(saved){return `<option value="">—</option>${PROJECT_STATUS_OPTIONS.map(item=>`<option value="${escapeHTML(item)}"${saved===item?' selected':''}>${escapeHTML(item)}</option>`).join('')}`;}
  function taskProgressForMonth(task,monthKey){
    if(monthAfterCompletion(task,monthKey))return 100;
    const recorded=projectValue(task.history?.[projectMonthKey(monthKey)]);if(recorded!==null)return recorded;
    if(monthKey<isoToday().slice(0,7)){
      if(taskIsHabit(task)){const habit=habitHistoryPercent(task,monthKey);if(habit!==null)return habit;}
      if(task.recurring){const recurring=recurringHistoryPercent(task,monthKey);if(recurring!==null)return recurring;}
    }
    return monthKey>=isoToday().slice(0,7)?taskProgress(task):null;
  }
  function taskHistoryValue(task,period){
    if(monthAfterCompletion(task,period))return 100;
    const recorded=projectValue(task?.history?.[period]);if(recorded!==null)return recorded;
    if(!/^\d{6}$/.test(String(period||'')))return null;
    const monthKey=`${period.slice(0,4)}-${period.slice(4)}`;if(monthKey>isoToday().slice(0,7))return null;
    if(taskIsHabit(task))return habitHistoryPercent(task,monthKey);
    return task?.recurring?recurringHistoryPercent(task,monthKey):null;
  }
  function projectHistoryValue(project,period){if(monthAfterCompletion(project,period))return 100;return projectValue(project?.history?.[period]);}
  function recurringHistoryPercent(task,monthKey){
    const period=monthKey.replace('-','');
    const values=(task.occurrences||[]).filter(item=>String(item.period||String(item.date||'').slice(0,7).replace('-',''))===period&&item.result!=='skipped'&&item.result!=='scheduled').map(item=>projectValue(item.progress)).filter(value=>value!==null);
    return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
  }
  function projectProgressForMonth(project,monthKey){
    if(monthAfterCompletion(project,monthKey))return 100;
    const recorded=projectValue(project.history?.[projectMonthKey(monthKey)]);if(recorded!==null)return recorded;
    const values=project.tasks.filter(task=>!task.deleted&&!PROJECT_EXCLUDED_STATUSES.has(taskStatusForMonth(task,monthKey))).map(task=>taskProgressForMonth(task,monthKey)).filter(value=>value!==null);
    if(values.length)return values.reduce((sum,value)=>sum+value,0)/values.length;
    return monthKey>=isoToday().slice(0,7)?projectProgress(project):null;
  }
  function projectProgressForView(project){return projectView==='progress'?projectProgressForMonth(project,selectedProjectMonth):projectProgress(project);}
  function projectMonthPeriod(monthKey=selectedProjectMonth){return projectMonthKey(monthKey);}
  function projectMonthClosed(monthKey=selectedProjectMonth){const period=projectMonthPeriod(monthKey);return projectList().some(project=>Object.prototype.hasOwnProperty.call(project.history||{},period));}
  function projectMonthManualProgress(){return projectMonthEditMode&&selectedProjectMonth<isoToday().slice(0,7);}
  function projectCloseValue(project,monthKey){
    if(monthAfterCompletion(project,monthKey))return 100;
    const current=monthKey===isoToday().slice(0,7);
    if(current)return projectProgress(project);
    const monthly=projectProgressForMonth(project,monthKey);
    return monthly!==null?monthly:projectProgress(project);
  }
  function taskCloseValue(task,monthKey){
    if(monthAfterCompletion(task,monthKey))return 100;
    const current=monthKey===isoToday().slice(0,7);
    if(current)return taskProgress(task);
    const monthly=taskProgressForMonth(task,monthKey);
    return monthly!==null?monthly:taskProgress(task);
  }
  function closeProjectMonth(){
    const monthKey=selectedProjectMonth,period=projectMonthPeriod(monthKey),past=monthKey<isoToday().slice(0,7);
    if(projectMonthEditMode&&past){
      for(const project of projectList()){
        if(!project.statusHistory||typeof project.statusHistory!=='object'||Array.isArray(project.statusHistory))project.statusHistory={};
        project.statusHistory[period]=projectStatusForMonth(project,monthKey);
        for(const task of project.tasks){if(!task.statusHistory||typeof task.statusHistory!=='object'||Array.isArray(task.statusHistory))task.statusHistory={};task.statusHistory[period]=taskStatusForMonth(task,monthKey);task.updatedAt=stamp();}
        project.updatedAt=stamp();
      }
      projectMonthEditMode=false;saveLocal();renderProjects();toast(`Fechamento de ${projectPeriodLabel(period)} salvo.`);return;
    }
    if(!projectMonthEditMode&&projectMonthClosed(monthKey)){toast('Este mês já foi fechado. Use “Reabrir histórico” para editar.');return;}
    projectMonthEditMode=false;
    for(const project of projectList()){
      project.history[period]=projectCloseValue(project,monthKey);
      if(!project.statusHistory||typeof project.statusHistory!=='object'||Array.isArray(project.statusHistory))project.statusHistory={};
      project.statusHistory[period]=projectStatusForMonth(project,monthKey);
      for(const task of project.tasks.filter(item=>!item.deleted)){
        if(!task.statusHistory||typeof task.statusHistory!=='object'||Array.isArray(task.statusHistory))task.statusHistory={};
        task.statusHistory[period]=taskStatusForMonth(task,monthKey);
        if(monthAfterCompletion(task,monthKey))task.history[period]=100;else if(projectValue(task.history?.[period])===null){const value=taskCloseValue(task,monthKey);if(value!==null)task.history[period]=value;}
      }
      project.updatedAt=stamp();
    }
    saveLocal();renderProjects();toast(`Mês de ${projectPeriodLabel(period)} fechado.`);
  }
  function reopenProjectMonthHistory(){
    if(!projectMonthClosed(selectedProjectMonth))return;
    const monthKey=selectedProjectMonth,period=projectMonthPeriod(monthKey);
    if(monthKey>=isoToday().slice(0,7)){
      for(const project of projectList()){
        delete project.history[period];
        for(const task of project.tasks)delete task.history[period];
        project.updatedAt=stamp();
      }
      projectMonthEditMode=true;saveLocal();renderProjects();toast(`Mês de ${projectPeriodLabel(period)} reaberto: progresso automático e status editáveis.`);
      return;
    }
    projectMonthEditMode=true;renderProjects();
  }
  function progressLabel(value){return value===null?'Sem medição':`${Math.round(value)}%`;}
  function historyValueLabel(value){return value===null?'<span class="project-history-empty" title="Sem medição">—</span>':progressLabel(value);}
  function projectFrequencyLabel(frequency){return TASK_FREQUENCY_LABELS[frequency]||'Recorrente';}
  function defaultHabitTarget(frequency){return frequency==='daily'?30:frequency==='weekly'?4:frequency==='biweekly'?2:1;}
  function habitTargetOf(task){const target=Number(task?.habitTarget);return Number.isFinite(target)&&target>0?Math.round(target):defaultHabitTarget(task?.frequency);}
  function taskTypeIsHabit(type){return /h[aá]bito/i.test(String(type||''));}
  function taskIsHabit(task){return taskTypeIsHabit(task?.type);}
  function activeHabits(){return projectList().flatMap(project=>project.tasks.filter(task=>!task.deleted&&taskIsHabit(task)&&task.status==='Em andamento').map(task=>({project,task}))).sort((a,b)=>a.task.title.localeCompare(b.task.title,'pt-BR'));}
  function projectTaskScheduleDates(task,fromDate,toDate){
    if(!task||!fromDate||!toDate||toDate<fromDate)return [];
    const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const from=safeDate(fromDate);let to=safeDate(toDate);
    if(task.endDate&&toDate>task.endDate)to=safeDate(task.endDate);
    if(to<from)return [];
    const frequency=task.frequency||(taskIsHabit(task)?'daily':'monthly');
    const anchorSource=task.startDate||task.createdAt?.slice(0,10)||(task.occurrences||[]).map(item=>item.date).filter(Boolean).sort()[0]||fromDate;
    const anchor=safeDate(anchorSource);
    if(anchor>to)return [];
    const dates=[];
    if(frequency==='daily'||frequency==='weekly'||frequency==='biweekly'){
      const step=frequency==='daily'?1:frequency==='weekly'?7:14,cursor=new Date(anchor);
      if(cursor<from){const diff=Math.floor((from-cursor)/86400000),jump=Math.floor(diff/step)*step;cursor.setDate(cursor.getDate()+jump);while(cursor<from)cursor.setDate(cursor.getDate()+step);}
      while(cursor<=to&&dates.length<800){dates.push(dateKey(cursor));cursor.setDate(cursor.getDate()+step);}
      return dates;
    }
    const stepMonths=TASK_FREQUENCY_MONTHS[frequency]||1;
    for(let index=0;index<800;index++){
      const monthDate=new Date(anchor.getFullYear(),anchor.getMonth()+index*stepMonths,1),monthKey=`${monthDate.getFullYear()}-${String(monthDate.getMonth()+1).padStart(2,'0')}`;
      let expected;
      if(task.monthWeek){
        const [start,end]=monthWeekRange(monthKey,Number(task.monthWeek)),candidate=new Date(start);
        while(candidate<=end&&candidate.getDay()!==anchor.getDay())candidate.setDate(candidate.getDate()+1);
        expected=candidate>end?new Date(start):candidate;
      }else{
        const lastDay=new Date(monthDate.getFullYear(),monthDate.getMonth()+1,0).getDate(),day=Math.min(anchor.getDate(),lastDay);
        expected=new Date(monthDate.getFullYear(),monthDate.getMonth(),day);
      }
      expected.setHours(12,0,0,0);
      if(expected>to)break;
      if(expected>=anchor&&expected>=from)dates.push(dateKey(expected));
    }
    return dates;
  }
  function projectTaskNextDate(task,fromDate=isoToday()){
    if(!task)return '';
    const toDate=task.endDate&&task.endDate>=fromDate?task.endDate:`${Number(fromDate.slice(0,4))+2}-12-31`;
    return projectTaskScheduleDates(task,fromDate,toDate)[0]||'';
  }
  function habitDoneOn(task,date){return (task.occurrences||[]).some(item=>item.date===date&&item.result==='realized');}
  function habitProgress(task,monthKey=isoToday().slice(0,7)){
    if(!taskIsHabit(task)||!/^\d{4}-\d{2}$/.test(monthKey))return{done:0,expected:0,percent:null};
    const current=isoToday().slice(0,7),expected=habitTargetOf(task);
    if(monthKey>current)return{done:0,expected,percent:null};
    const done=new Set((task.occurrences||[]).filter(item=>item.result==='realized'&&String(item.date||'').startsWith(monthKey)).map(item=>item.date)).size;
    return{done,expected,percent:expected?Math.min(100,done/expected*100):null};
  }
  function habitHistoryPercent(task,monthKey){
    if(!taskIsHabit(task)||!/^\d{4}-\d{2}$/.test(monthKey)||monthKey>isoToday().slice(0,7))return null;
    const months=(task.occurrences||[]).map(item=>String(item.date||'').slice(0,7)).filter(key=>/^\d{4}-\d{2}$/.test(key)).sort();
    if(!months.length||monthKey<months[0])return null;
    return habitProgress(task,monthKey).percent;
  }
  function projectPeriodLabel(period){return /^\d{6}$/.test(period)?new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(new Date(Number(period.slice(0,4)),Number(period.slice(4,6))-1,1)):period;}
  const PROJECT_AREA_COLORS=['#6657e8','#d58ca6','#73a47e','#e0a06e','#408a9a','#8e6fa3','#cc7b5b','#4f76b5','#7da44c','#b48c5a'];
  function projectColorForArea(area){let hash=0;for(const char of String(area||''))hash=(hash*31+char.charCodeAt(0))>>>0;return PROJECT_AREA_COLORS[hash%PROJECT_AREA_COLORS.length];}
  function renderProjectFilters(){const area=$('#project-filter-area'),selected=area.value,areas=orderedActionAreas();area.innerHTML='<option value="">Todas</option>'+areas.map(item=>`<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`).join('');area.value=areas.some(item=>item.id===selected)?selected:'';}
  function projectMatchesProgress(value,filter){if(!filter)return true;if(filter==='missing')return value===null;if(value===null)return false;if(filter==='100')return Math.round(value)===100;const [min,max]=filter.split('-').map(Number);return value>=min&&value<=max;}
  function projectTaskTypeMatches(taskType,filter){return !filter||String(taskType||'').split('/').map(part=>part.trim()).includes(filter);}
  function filteredProjects(){
    const area=$('#project-filter-area').value,status=$('#project-filter-status').value,type=$('#project-filter-type').value,recurring=$('#project-filter-recurring').value,year=Number($('#project-filter-year').value)||0,progressFilter=$('#project-filter-progress').value,search=$('#project-filter-search').value.trim().toLocaleLowerCase('pt-BR'),sort=$('#project-sort').value;
    const filtered=projectList().filter(project=>{const tasks=project.tasks.filter(task=>!task.deleted),matchingTask=tasks.some(task=>(!type||projectTaskTypeMatches(task.type,type))&&(!recurring||(recurring==='yes')===task.recurring));return(!area||project.areaId===area)&&(!status||projectStatusForView(project)===status)&&(!type&&!recurring||matchingTask)&&(!year||[project.startDate,project.endDate].some(date=>String(date||'').startsWith(String(year))))&&projectMatchesProgress(projectProgressForView(project),progressFilter)&&(!search||[project.code,project.title,project.description,projectAreaName(project),...tasks.flatMap(task=>[task.code,task.title,task.notes])].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(search)));});
    return filtered.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'pt-BR'):sort==='progress-desc'?(projectProgressForView(b)??-1)-(projectProgressForView(a)??-1):sort==='progress-asc'?(projectProgressForView(a)??101)-(projectProgressForView(b)??101):sort==='updated'?(b.updatedAt||'').localeCompare(a.updatedAt||''):(String(a.code||'').localeCompare(String(b.code||''),'pt-BR',{numeric:true})||(a.order??0)-(b.order??0)));
  }
  function projectTaskRow(project,task,index,total){
    const progress=taskProgressForMonth(task,selectedProjectMonth),currentMonth=selectedProjectMonth===isoToday().slice(0,7),status=taskStatusForMonth(task,selectedProjectMonth),done=status==='Concluída',excluded=PROJECT_EXCLUDED_STATUSES.has(status),habit=taskIsHabit(task),accentColor=habit?projectAreaColor(project):(task.color||project.color||'#6657e8'),period=projectMonthPeriod(),monthClosed=projectMonthClosed(selectedProjectMonth),endLabel=statusIsFinal(status)?taskEndLabel(task):'',autoProgress=habit||task.recurring,autoCompleted=monthAfterCompletion(task,selectedProjectMonth),progressDisabled=autoProgress||autoCompleted||!currentMonth||monthClosed,progressTitle=autoCompleted?'Atividade concluída: meses após o fim são automáticos.':autoProgress?(habit?'Calculado pelas marcações do hábito no mês':'Calculado pelas ocorrências da recorrência'):monthClosed?'Mês fechado. Use Reabrir histórico para editar o progresso salvo.':!currentMonth?'Progresso registrado no mês selecionado':'';return `<div class="project-task-wrap"><div class="project-task-row${done?' is-done':''}${excluded?' is-excluded':''}${habit?' is-habit':''}"${habit?` style="--habit-color:${escapeHTML(projectAreaColor(project))}"`:''}><button type="button" class="project-task-check${habit&&done?' is-habit-done':''}" ${currentMonth&&!monthClosed?'':'disabled'} data-toggle-project-task="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" aria-label="${done?'Reabrir':'Concluir'} ${escapeHTML(task.title)}">${done?'✓':''}</button><span class="project-task-icon" style="color:${escapeHTML(accentColor)}">${escapeHTML(task.icon||'▰')}</span><button type="button" class="project-task-name" data-edit-project-task="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}"><span class="project-task-name-head"><small>${escapeHTML(task.code||'')}</small><span class="project-task-tags"><span class="project-task-type">${escapeHTML(task.type||'Tarefa')}</span>${task.recurring?`<span class="project-task-frequency">${escapeHTML(projectFrequencyLabel(task.frequency))}</span>`:''}<span class="project-task-status is-${projectStatusClass(status)}">${escapeHTML(status)}</span></span></span><span class="project-task-title">${escapeHTML(task.title)}</span>${endLabel?`<small class="project-task-end">Fim ${escapeHTML(endLabel)}</small>`:''}</button><div class="project-task-progress-cell"><div class="project-list-progress"><span style="width:${progress??0}%"></span></div>${projectMonthEditMode?`<select class="project-task-status-input" data-task-status-history="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" data-history-period="${period}" aria-label="Status salvo de ${escapeHTML(task.title)}" ${autoCompleted?'disabled title="Atividade concluída: meses após o fim são automáticos."':''}>${['Em andamento','Stand-by','Concluída','Remodelada','Descartada'].map(item=>`<option${status===item?' selected':''}>${escapeHTML(item)}</option>`).join('')}</select>`:''}${projectMonthManualProgress()?`<input type="number" min="0" max="100" step="1" value="${taskHistoryValue(task,period)??''}" data-project-history-progress="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" data-history-period="${period}" aria-label="Progresso salvo de ${escapeHTML(task.title)}" ${autoCompleted?'disabled title="Atividade concluída: meses após o fim são automáticos."':''}>`:`<input type="number" min="0" max="100" step="1" value="${progress===null?'':Math.round(progress)}" data-project-progress="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" aria-label="Progresso de ${escapeHTML(task.title)}" ${progressDisabled?`disabled title="${escapeHTML(progressTitle)}"`:''}>`}<em>${progress===null?'—':'%'}</em></div><div class="project-row-actions">${task.recurring&&!habit?`<button type="button" class="project-task-occurrence" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" aria-label="Registrar ocorrência de ${escapeHTML(task.title)}" title="Registrar ocorrência">↻</button>`:''}<button type="button" data-move-project-task="up" data-project-id="${escapeHTML(project.id)}" data-project-task-id="${escapeHTML(task.id)}" ${index===0?'disabled':''} aria-label="Mover para cima">↑</button><button type="button" data-move-project-task="down" data-project-id="${escapeHTML(project.id)}" data-project-task-id="${escapeHTML(task.id)}" ${index===total-1?'disabled':''} aria-label="Mover para baixo">↓</button><button type="button" class="small-edit" data-edit-project-task="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Editar</button></div></div></div>`;
  }
  function toggleHabitDate(projectId,taskId,date){
    const{project,task}=findProjectTask(projectId,taskId);if(!task||!taskIsHabit(task)||date>isoToday())return;if(task.startDate&&date<task.startDate){toast('Este hábito ainda não havia começado nesta data.');return;}
    const matches=(task.occurrences||[]).filter(item=>item.date===date),wasDone=matches.some(item=>item.result==='realized');
    if(wasDone){task.occurrences=(task.occurrences||[]).filter(item=>item.date!==date);}
    else if(matches.length){for(const item of matches){item.result='realized';item.progress=100;item.expectedDate=item.expectedDate||date;item.updatedAt=stamp();}}
    else task.occurrences.push({id:uid(),date,expectedDate:date,period:projectMonthKey(date),result:'realized',progress:100,notes:'',updatedAt:stamp()});
    task.updatedAt=stamp();project.updatedAt=stamp();saveLocal();renderProjects();renderPlanner();renderWeekly();renderMonthly();toast(wasDone?'Hábito desmarcado.':'Hábito marcado.');
  }
  function renderHabitsView(){
    const dates=weekDates(selectedHabitWeekDate),habits=activeHabits(),monthKey=selectedHabitWeekDate.slice(0,7),monthLabel=fmtDate(`${monthKey}-01`,{month:'long',year:'numeric'});
    const nav=`<div class="habit-screen-head"><div class="habit-week-nav"><button type="button" class="secondary-button compact-button" data-habit-week-shift="-1" aria-label="Semana anterior">‹</button><h3>${escapeHTML(fmtDate(dates[0],{day:'numeric',month:'short'}))} a ${escapeHTML(fmtDate(dates[6],{day:'numeric',month:'short',year:'numeric'}))}</h3><button type="button" class="secondary-button compact-button" data-habit-week-shift="1" aria-label="Próxima semana">›</button><button type="button" class="text-button" data-habit-week-today>Hoje</button></div><button type="button" class="primary-button" data-add-habit>＋ Novo hábito</button></div>`;
    if(!habits.length)return `${nav}<div class="empty-state"><span>↻</span><h3>Nenhum hábito em andamento</h3><p>Crie uma atividade do tipo Hábito para acompanhar as marcações do mês.</p><button type="button" class="primary-button" data-add-habit>＋ Novo hábito</button></div>`;
    const dayHeaders=dates.map(date=>`<th><span>${escapeHTML(fmtDate(date,{weekday:'short'}))}</span><b>${escapeHTML(fmtDate(date,{day:'numeric'}))}</b></th>`).join('');
    const rows=habits.map(({project,task})=>{
      const progress=habitProgress(task,monthKey),cells=dates.map(date=>{
        const done=habitDoneOn(task,date),future=date>isoToday(),beforeStart=Boolean(task.startDate&&date<task.startDate);
        if(future||beforeStart)return '<td><span class="habit-cell is-off">·</span></td>';
        const label=`${done?'Desmarcar':'Marcar'} ${task.title} em ${fmtDate(date)}`;
        return `<td><button type="button" class="habit-cell ${done?'is-done':'is-missed'}" data-toggle-habit="${escapeHTML(task.id)}" data-habit-project="${escapeHTML(project.id)}" data-habit-date="${date}" aria-label="${escapeHTML(label)}">${done?'✓':'×'}</button></td>`;
      }).join('');
      return `<tr class="habit-row" style="--habit-color:${escapeHTML(projectAreaColor(project))}"><th scope="row"><button type="button" class="habit-name" data-edit-habit="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}"><span aria-hidden="true">${escapeHTML(task.icon||'↻')}</span><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(project.title)}</small></button></th>${cells}<td class="habit-progress"><b>${progress.percent===null?'—':`${Math.round(progress.percent)}%`}</b><small>${progress.expected?`${progress.done}/${progress.expected}`:'sem esperado'}</small></td></tr>`;
    }).join('');
    return `${nav}<p class="habit-screen-month">${escapeHTML(monthLabel)} · ${habits.length} ${habits.length===1?'hábito em andamento':'hábitos em andamento'} · Clique nos dias para marcar; dias futuros ficam bloqueados.</p><div class="habit-screen-scroll"><table class="habit-table"><thead><tr><th scope="col">Hábito</th>${dayHeaders}<th scope="col">Mês</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function projectCard(project){
    const progress=projectProgressForMonth(project,selectedProjectMonth),status=projectStatusForMonth(project,selectedProjectMonth),tasks=project.tasks.filter(task=>!task.deleted).sort((a,b)=>(a.order??0)-(b.order??0)),open=openProjects.has(project.id),areaColor=projectAreaColor(project),period=projectMonthPeriod(),historyValue=projectHistoryValue(project,period),autoCompleted=monthAfterCompletion(project,selectedProjectMonth),finalized=statusIsFinal(status),endLabel=projectEndLabel(project);return `<article class="project-card${open?' is-open':''}" style="--project-color:${escapeHTML(areaColor)}" data-project-id="${escapeHTML(project.id)}"><div class="project-card-head"><button type="button" class="project-expand" data-toggle-project="${escapeHTML(project.id)}" aria-expanded="${open}" aria-label="${open?'Recolher':'Expandir'} ${escapeHTML(project.title)}">${open?'▾':'▸'}</button><span class="project-icon">${escapeHTML(project.icon||'◈')}</span><button type="button" class="project-card-title" data-open-project="${escapeHTML(project.id)}" title="Abrir projeto"><strong><span>P${escapeHTML(project.code||'')}</span> ${escapeHTML(project.title)} <span class="project-card-status is-${projectStatusClass(status)}">${escapeHTML(status)}</span></strong><small>${tasks.length} ${tasks.length===1?'atividade':'atividades'}${finalized&&endLabel?` · Fim ${escapeHTML(endLabel)}`:''}</small></button><button type="button" class="small-edit" data-edit-project="${escapeHTML(project.id)}">Editar</button></div><div class="project-progress-row"><div class="project-progress"><span style="width:${progress??0}%"></span></div>${projectMonthEditMode?`<select class="text-input project-month-status-input" data-project-status-history="${escapeHTML(project.id)}" data-history-period="${period}" aria-label="Status salvo de ${escapeHTML(project.title)}" ${autoCompleted?'disabled title="Projeto concluído: meses após o fim são automáticos."':''}>${['Em andamento','Stand-by','Concluída','Remodelada','Descartada'].map(item=>`<option${status===item?' selected':''}>${escapeHTML(item)}</option>`).join('')}</select>`:''}${projectMonthManualProgress()?`<input class="project-month-history-input" type="number" min="0" max="100" step="1" value="${historyValue??''}" data-project-history="${escapeHTML(project.id)}" data-history-period="${period}" aria-label="Progresso salvo de ${escapeHTML(project.title)}" ${autoCompleted?'disabled title="Projeto concluído: meses após o fim são automáticos."':''}>`:''}<b>${progressLabel(progress)}</b></div>${project.description?`<p class="project-description">${escapeHTML(project.description)}</p>`:''}<div class="project-card-body${open?'':' hidden'}"><div class="project-task-list">${tasks.length?tasks.map((task,index)=>projectTaskRow(project,task,index,tasks.length)).join(''):'<p class="planner-empty">Nenhuma atividade cadastrada.</p>'}</div><button type="button" class="text-button project-add-task" data-add-project-task="${escapeHTML(project.id)}">＋ Adicionar atividade</button></div></article>`;
  }
  function isImportedRecurrenceNote(note){return /^historico carregado dos prints/i.test(String(note||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''));}
  function projectFocusOccurrences(task){
    const occurrences=[...(task.occurrences||[])].filter(item=>item.date);
    const habit=taskIsHabit(task);
    if(!habit){const next=recurrenceNextDate(task);if(next&&!occurrences.some(item=>item.date===next))occurrences.unshift({id:`next-${task.id}-${next}`,date:next,result:'scheduled',progress:null,virtual:true});}
    occurrences.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if(!occurrences.length)return '<div class="project-focus-occurrences"><span class="project-focus-occurrence-empty">Nenhuma recorrência registrada.</span></div>';
    const labels={realized:'Realizada',partial:'Parcial','not-realized':'Não realizada',skipped:'Ignorada',scheduled:'Pendente'};
    const ranked=occurrences.filter(item=>item.result!=='skipped'&&item.result!=='scheduled'&&item.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))),groups=new Map();
    for(const item of occurrences){const key=String(item.date).slice(0,7);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
    const rows=[...groups.entries()].map(([monthKey,items])=>`<div class="project-focus-occurrence-month">${escapeHTML(fmtDate(`${monthKey}-01`,{month:'long',year:'numeric'}))}</div>${items.map(item=>{const result=item.result||'scheduled',value=projectValue(item.progress),progress=value===null?(result==='scheduled'?'—':'Sem medição'):`${Math.round(value)}%`,label=labels[result]||result,index=ranked.indexOf(item),weight=index<0?null:index<3?3:index<6?2:1,counted=weight!==null&&value!==null,weightLabel=counted?`peso ${weight}`:result==='scheduled'?'—':'fora',weightClass=counted?`is-weight-${weight}`:'is-off',weightTitle=counted?`Peso ${weight} no cálculo do progresso`:'Não entra no cálculo do progresso',noteText=item.notes?String(item.notes).trim():'',showNote=Boolean(noteText)&&!isImportedRecurrenceNote(noteText),rescheduled=!habit&&item.expectedDate&&item.expectedDate!==item.date;return `<div class="project-focus-occurrence${habit?' is-habit':''}">${!habit&&!item.virtual?`<button type="button" class="project-focus-occurrence-date" data-focus-project-occurrence-edit="${escapeHTML(item.id)}" data-project-id="${escapeHTML(task.projectId||'')}" data-task-id="${escapeHTML(task.id)}" title="Reagendar ocorrência">${escapeHTML(fmtDate(item.date,{day:'2-digit',month:'short',year:'numeric'}))}</button>`:`<time datetime="${escapeHTML(item.date)}">${escapeHTML(fmtDate(item.date,{day:'2-digit',month:'short',year:'numeric'}))}</time>`}<span class="project-occurrence-result is-${escapeHTML(result)}">${escapeHTML(label)}</span><span class="project-focus-occurrence-value"><b>${escapeHTML(progress)}</b>${habit?'':`<span class="project-occurrence-weight ${weightClass}" title="${escapeHTML(weightTitle)}">${escapeHTML(weightLabel)}</span>`}</span>${(showNote||rescheduled)?`<small>${showNote?escapeHTML(noteText):''}${showNote&&rescheduled?' · ':''}${rescheduled?`Reagendada de ${escapeHTML(fmtDate(item.expectedDate,{day:'2-digit',month:'short'}))}`:''}</small>`:''}</div>`;}).join('')}`).join('');
    return `<div class="project-focus-occurrences">${rows}<p class="project-focus-occurrence-hint">${habit?'Hábito: as marcações do mês definem o progresso mensal.':'Pesos do cálculo geral: 3 ocorrências mais recentes = 3; as 3 seguintes = 2; as demais = 1.'}</p></div>`;
  }
  function projectFocusTaskRow(project,task){
    const progress=taskProgressForMonth(task,selectedProjectMonth),currentMonth=selectedProjectMonth===isoToday().slice(0,7),habit=taskIsHabit(task),habitProgressValue=habit?habitProgress(task,selectedProjectMonth):null,status=taskStatusForMonth(task,selectedProjectMonth),done=status==='Concluída',excluded=PROJECT_EXCLUDED_STATUSES.has(status),expanded=expandedProjectTasks.has(task.id);
    const typeLabel=task.type||(habit?'Hábito':'Tarefa'),taskEnd=statusIsFinal(status)?taskEndLabel(task):'',extraMeta=habit?(status==='Concluída'?'Hábito concluído':(habitProgressValue?`esperado ${habitProgressValue.expected}/mês · ${habitProgressValue.done} marcada${habitProgressValue.done===1?'':'s'}`:'')):(task.recurring?`próxima ${fmtDate(recurrenceNextDate(task),{day:'2-digit',month:'short'})}`:''),extraText=[extraMeta,taskEnd?`Fim ${taskEnd}`:''].filter(Boolean).join(' · ');
    return `<div class="project-focus-task-wrap"><div class="project-focus-task${done?' is-done':''}${excluded?' is-excluded':''}${habit?' is-habit':''}"${habit?` style="--habit-color:${escapeHTML(projectAreaColor(project))}"`:''}><button type="button" class="project-task-check${habit&&done?' is-habit-done':''}" ${currentMonth?'':'disabled'} data-focus-project-task-toggle="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" aria-label="${done?'Reabrir':'Concluir'} ${escapeHTML(task.title)}">${done?'✓':''}</button><div class="project-focus-task-copy"><div class="project-focus-task-head"><small class="project-focus-task-code">${escapeHTML(task.code||'')}</small><div class="project-focus-task-tags"><span class="project-task-type">${escapeHTML(typeLabel)}</span>${task.recurring?`<span class="project-task-frequency">${escapeHTML(projectFrequencyLabel(task.frequency))}</span>`:''}<span class="project-task-status is-${projectStatusClass(status)}">${escapeHTML(status)}</span>${task.recurring&&!habit?`<button type="button" class="project-focus-task-occurrence" data-focus-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" aria-label="Registrar ocorrência de ${escapeHTML(task.title)}" title="Registrar ocorrência">↻</button>`:''}${task.recurring&&!habit?`<button type="button" class="project-focus-task-expand" data-focus-project-task-expand="${escapeHTML(task.id)}" aria-expanded="${expanded}" aria-label="${expanded?'Recolher':'Expandir'} recorrências de ${escapeHTML(task.title)}">${expanded?'▾':'▸'}</button>`:''}</div></div><button type="button" class="project-task-name" data-focus-project-task-edit="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}"><strong>${task.icon?`${escapeHTML(task.icon)} `:''}${escapeHTML(task.title)}</strong></button>${extraText?`<small class="project-focus-task-extra">${escapeHTML(extraText)}</small>`:''}</div><div class="project-focus-task-progress"><div class="project-list-progress"><span style="width:${progress??0}%"></span></div><b>${progressLabel(progress)}</b></div></div>${expanded&&!habit?projectFocusOccurrences(task):''}</div>`;
  }
  function taskProgressSource(task){
    if(taskIsHabit(task)){if(task.status==='Concluída')return 'Hábito concluído — 100%';const progress=habitProgress(task);return `Hábito — ${progress.done} de ${progress.expected} marcações no mês`;}
    if(task.status==='Concluída'&&!task.recurring)return 'Concluída — 100%';
    if(task.recurring){
      const values=(task.occurrences||[]).filter(item=>item.result!=='skipped'&&item.result!=='scheduled'&&item.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(item=>projectValue(item.progress)).filter(value=>value!==null);
      if(values.length)return `Recorrente — média ponderada de ${values.length} ${values.length===1?'ocorrência':'ocorrências'} (pesos 3/2/1)`;
      return projectValue(task.progress)===null?'Recorrente — sem ocorrências medidas e sem progresso manual':'Recorrente — sem ocorrências medidas; usa o progresso manual';
    }
    const manual=projectValue(task.progress);
    return manual===null?'Manual — sem medição':`Manual — ${Math.round(manual)}%`;
  }
  function projectProgressExplanation(project){
    const status=projectStatusForMonth(project,selectedProjectMonth),manual=project.progress!==null&&project.progress!==undefined&&project.progress!=='';
    if(status==='Concluída')return '<p class="project-focus-calc-note">O projeto está marcado como <strong>Concluída</strong>; por isso o progresso é <strong>100%</strong>, independentemente das atividades.</p>';
    if(manual)return `<p class="project-focus-calc-note">O projeto tem um progresso <strong>manual</strong> de <strong>${Math.round(projectValue(project.progress))}%</strong>, que prevalece sobre a média das atividades.</p>`;
    const tasks=project.tasks.filter(task=>!task.deleted).sort((a,b)=>(a.order??0)-(b.order??0)),included=[],missing=[],excluded=[];
    for(const task of tasks){
      if(PROJECT_EXCLUDED_STATUSES.has(task.status)){excluded.push(task);continue;}
      const value=taskProgress(task);
      if(value===null)missing.push(task);else included.push({task,value});
    }
    const values=included.map(item=>item.value),average=values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null,exact=values.every(value=>Number.isInteger(value));
    const formula=values.length?`(${values.map(value=>Math.round(value)).join(' + ')}) ÷ ${values.length} ${exact?'=':'≈'} ${Math.round(average)}%`:'Nenhuma atividade com medição';
    const rows=[...included.map(({task,value})=>`<div class="project-focus-calc-row"><span><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(taskProgressSource(task))}</small></span><b>${Math.round(value)}%</b></div>`),...missing.map(task=>`<div class="project-focus-calc-row"><span><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(taskProgressSource(task))}</small></span><b>—</b></div>`),...excluded.map(task=>`<div class="project-focus-calc-row"><span><strong>${escapeHTML(task.title)}</strong><small>Fora do cálculo — status ${escapeHTML(task.status||'Remodelada')}</small></span><b>fora</b></div>`)];
    return `<div class="project-focus-calc-formula">${escapeHTML(formula)}</div>${rows.length?`<div class="project-focus-calc-list">${rows.join('')}</div>`:''}<p class="project-focus-calc-note">O projeto usa a <strong>média simples</strong> das atividades com medição. Atividades remodeladas, descartadas e sem medição não entram. Dentro de cada atividade: hábito = marcações no mês ÷ esperado mensal; concluída = 100%; recorrente = média ponderada das ocorrências (3 mais recentes com peso 3, as 3 anteriores com peso 2, as demais com peso 1), ignorando ocorrências ignoradas ou programadas; com critérios = média ponderada dos critérios; caso contrário, vale o progresso manual.</p>`;
  }
  function renderProjectFocus(){
    if(!activeProjectId)return;
    const project=projectList().find(item=>item.id===activeProjectId);
    if(!project){$('#project-focus-dialog').close();return;}
    const monthLabel=fmtDate(`${selectedProjectMonth}-01`,{month:'long',year:'numeric'}),monthCurrent=selectedProjectMonth===isoToday().slice(0,7),progress=projectProgressForMonth(project,selectedProjectMonth),tasks=project.tasks.filter(task=>!task.deleted).sort((a,b)=>(a.order??0)-(b.order??0)),status=projectStatusForMonth(project,selectedProjectMonth),area=projectAreaName(project),done=tasks.filter(task=>task.status==='Concluída').length,manual=project.progress!==null&&project.progress!==undefined&&project.progress!=='';
    $('#project-focus-dialog').style.setProperty('--routine-color',projectAreaColor(project));
    $('#project-focus-eyebrow').textContent=`PROJETO P${project.code||''} · ${monthLabel.toLocaleUpperCase('pt-BR')}`;
    $('#project-focus-icon').textContent=project.icon||'◈';
    $('#project-focus-name').textContent=project.title;
    $('#project-focus-meta').textContent=[area||'Sem área',status,statusIsFinal(status)&&projectEndLabel(project)?`Fim ${projectEndLabel(project)}`:''].filter(Boolean).join(' · ');
    $('#project-focus-progress-bar').style.width=`${progress??0}%`;
    $('#project-focus-progress-label').textContent=progressLabel(progress);
    const focusMonthClosed=projectMonthClosed(selectedProjectMonth),focusSnapshot=$('#project-focus-snapshot');
    focusSnapshot.disabled=focusMonthClosed&&!projectMonthEditMode;
    focusSnapshot.textContent=focusMonthClosed&&!projectMonthEditMode?'Mês fechado':'Fechar mês';
    focusSnapshot.title=focusMonthClosed&&!projectMonthEditMode?'Mês fechado. Reabra o histórico na aba Progresso para editar.':projectMonthEditMode?'Salva as edições manuais do histórico e fecha o mês.':'Calcula e fecha o mês selecionado.';
    $('#project-focus-month').value=selectedProjectMonth;
    $('#project-focus-month-status').textContent=[monthCurrent?'Mês atual':'',focusMonthClosed&&!projectMonthEditMode?'Mês fechado':'',projectMonthEditMode?'Editando':''].filter(Boolean).join(' · ');
    $('#project-focus-description').textContent=project.description||'';
    $('#project-focus-description').classList.toggle('hidden',!project.description);
    const dateLabel=value=>value?fmtDate(String(value).slice(0,10),{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
    const details=[['Área',area||'—'],['Status',status],['Cálculo',status==='Concluída'?'Projeto concluído':monthCurrent?(manual?'Manual':'Automático · média das atividades'):'Histórico do mês'],['Início',dateLabel(project.startDate)],['Fim',dateLabel(project.endDate)],['Atividades',`${tasks.length}${done?` · ${done} concluída${done===1?'':'s'}`:''}`],['Recorrentes',String(tasks.filter(task=>task.recurring).length)],['Atualizado',dateLabel(project.updatedAt)]];
    $('#project-focus-details').innerHTML=details.map(([label,value])=>`<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('');
    $('#project-focus-calc-content').innerHTML=monthCurrent?projectProgressExplanation(project):`<p class="project-focus-calc-note">Progresso registrado para <strong>${escapeHTML(monthLabel)}</strong>. O valor vem do histórico mensal do projeto e das atividades.</p>`;
    renderProjectMonthNotes(project);
    const notes=project.notes||'';
    $('#project-focus-notes-section').classList.toggle('hidden',!notes);
    $('#project-focus-notes').textContent=notes;
    $('#project-focus-task-count').textContent=tasks.length?`${tasks.length} ${tasks.length===1?'atividade':'atividades'}${done?` · ${done} concluída${done===1?'':'s'}`:''}`:'Nenhuma atividade';
    $('#project-focus-tasks').innerHTML=tasks.length?tasks.map(task=>projectFocusTaskRow(project,task)).join(''):'<p class="project-focus-empty">Nenhuma atividade cadastrada.</p>';
  }
  function projectNoteLabel(monthKey){return fmtDate(`${monthKey}-01`,{month:'long',year:'numeric'});}
  function projectNotePreview(text){const clean=String(text||'').trim().replace(/\s+/g,' ');return clean?(clean.length>90?`${clean.slice(0,90)}…`:clean):'Sem nota';}
  function projectNoteMonths(project){
    const months=new Set([isoToday().slice(0,7)]);
    if(/^\d{4}-\d{2}$/.test(selectedProjectMonth))months.add(selectedProjectMonth);
    for(const key of Object.keys(project.monthNotes||{}))if(/^\d{4}-\d{2}$/.test(key))months.add(key);
    for(const key of projectExtraNoteMonths)months.add(key);
    return [...months].sort((a,b)=>b.localeCompare(a));
  }
  function renderProjectMonthNotes(project){
    const container=$('#project-focus-month-notes');if(!container)return;
    container.innerHTML=projectNoteMonths(project).map(key=>{
      const text=project.monthNotes?.[key]||'',open=projectOpenNoteMonths.has(key),bodyId=`project-note-${key}`;
      return `<details class="project-month-note" data-project-note-month="${key}" ${open?'open':''}><summary aria-controls="${bodyId}"><span class="project-month-note-title">${escapeHTML(projectNoteLabel(key))}</span><small class="project-month-note-preview" data-project-note-preview="${key}">${escapeHTML(projectNotePreview(text))}</small><span class="project-month-note-arrow" aria-hidden="true">⌄</span></summary><div id="${bodyId}" class="project-month-note-body"><textarea class="text-input" rows="3" maxlength="4000" data-project-note-input="${key}" placeholder="Registro deste mês...">${escapeHTML(text)}</textarea><div class="project-month-note-actions"><button type="button" class="secondary-button compact-button" data-project-note-save="${key}">Salvar nota</button></div></div></details>`;
    }).join('');
    const addInput=$('#project-focus-add-month');if(addInput&&!addInput.value)addInput.value=isoToday().slice(0,7);
  }
  function saveProjectNotes(announce=false){
    const project=projectList().find(item=>item.id===activeProjectId);if(!project)return;
    if(!project.monthNotes||typeof project.monthNotes!=='object'||Array.isArray(project.monthNotes))project.monthNotes={};
    let changed=false;
    for(const textarea of $$('#project-focus-month-notes [data-project-note-input]')){
      const key=textarea.dataset.projectNoteInput,text=textarea.value.trim(),previous=project.monthNotes[key]||'';
      if(text&&text!==previous){project.monthNotes[key]=text;changed=true;}
      else if(!text&&previous){delete project.monthNotes[key];changed=true;}
    }
    if(changed){project.updatedAt=stamp();clearTimeout(projectMonthNoteTimer);projectMonthNoteTimer=null;saveLocal();}
    if(announce){renderProjectFocus();toast('Notas salvas.');}
  }
  function openProjectFocus(id){
    const project=projectList().find(item=>item.id===id);if(!project)return;
    if(activeProjectId!==id){expandedProjectTasks.clear();projectOpenNoteMonths.clear();projectExtraNoteMonths.clear();projectOpenNoteMonths.add(isoToday().slice(0,7));if(/^\d{4}-\d{2}$/.test(selectedProjectMonth))projectOpenNoteMonths.add(selectedProjectMonth);}
    activeProjectId=id;renderProjectFocus();if(!$('#project-focus-dialog').open)$('#project-focus-dialog').showModal();
  }
  function recurrenceNextDate(task){return projectTaskNextDate(task,isoToday());}
  function recurringView(projects){const tasks=projects.flatMap(project=>project.tasks.filter(task=>!task.deleted&&task.recurring).map(task=>({project,task}))).sort((a,b)=>recurrenceNextDate(a.task).localeCompare(recurrenceNextDate(b.task)));if(!tasks.length)return'<div class="empty-state"><span>↻</span><h3>Nenhuma tarefa recorrente</h3><p>Marque uma atividade como recorrente para acompanhá-la por período.</p></div>';return `<div class="recurring-board"><div class="recurring-board-head"><span>Atividade</span><span>Projeto</span><span>Frequência</span><span>Próxima</span><span>Progresso</span><span></span></div>${tasks.map(({project,task})=>{const progress=taskProgress(task),last=[...(task.occurrences||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];return `<div class="recurring-row"><strong><small>${escapeHTML(task.code||'')}</small>${escapeHTML(task.icon||'▰')} ${escapeHTML(task.title)}</strong><span>${escapeHTML(project.title)}</span><span>${escapeHTML(projectFrequencyLabel(task.frequency))}${task.monthWeek?` · ${escapeHTML(monthWeekLabel(task.monthWeek).toLowerCase())}`:''}</span><span>${escapeHTML(fmtDate(recurrenceNextDate(task),{day:'2-digit',month:'short',year:'numeric'}))}</span><span><b>${progressLabel(progress)}</b>${last?`<small>Última: ${escapeHTML(fmtDate(last.date,{day:'2-digit',month:'short'}))}</small>`:''}</span><div><button type="button" class="primary-button compact-button" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Registrar</button><button type="button" class="small-edit" data-edit-project-task="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Editar</button></div></div>`;}).join('')}</div>`;}
  function recurringView(projects){const rows=[];const today=safeDate(isoToday());for(const project of projects)for(const task of project.tasks.filter(item=>!item.deleted&&item.recurring)){const occurrences=task.occurrences||[],dates=occurrences.map(item=>item.date).filter(Boolean);const next=recurrenceNextDate(task);if(next&&!dates.includes(next))dates.push(next);for(const date of dates.sort()){const occurrence=occurrences.find(item=>item.date===date),result=occurrence?.result||'scheduled',value=projectValue(occurrence?.progress),d=safeDate(date),month=fmtDate(date,{month:'short'}),week=Math.ceil(d.getDate()/7);rows.push(`<tr><td><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(task.code||'')} · ${escapeHTML(project.title)}</small></td><td>${escapeHTML(project.code||'')}</td><td>${escapeHTML(fmtDate(date,{day:'2-digit',month:'2-digit',year:'2-digit'}))}</td><td>${escapeHTML(result==='realized'?'Realizada':result==='partial'?'Realizada parcial':result==='not-realized'?'Não realizada':result==='skipped'?'Ignorada':'Programada')}</td><td>${escapeHTML(month)}</td><td>Semana ${week}</td><td>${historyValueLabel(value)}</td><td><button type="button" class="primary-button compact-button" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">${occurrence?'Editar':'Registrar'}</button></td></tr>`);}rows.push(`<tr class="recurring-summary-row"><td><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(task.code||'')} · ${escapeHTML(project.title)}</small></td><td>${escapeHTML(project.code||'')}</td><td>—</td><td>Em andamento</td><td>—</td><td>—</td><td>${progressLabel(taskProgress(task))}</td><td><button type="button" class="small-edit" data-edit-project-task="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Editar</button></td></tr>`);}return rows.length?`<div class="action-list-scroll recurring-history-wrap"><table class="action-list-table recurring-history-table"><thead><tr><th>Atividade</th><th>Projeto</th><th>Data</th><th>Status</th><th>Mês</th><th>Semana</th><th>Progresso</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'<div class="empty-state"><span>↻</span><h3>Nenhuma tarefa recorrente</h3><p>Marque uma atividade como recorrente para acompanhá-la por período.</p></div>';}
  function projectListView(projects){const rows=projects.map(project=>{const progress=projectProgress(project),tasks=project.tasks.filter(task=>!task.deleted),finalized=projectIsFinalized(project),endLabel=projectEndLabel(project);return `<tr><td><span class="project-list-name"><i style="background:${escapeHTML(project.color||'#6657e8')}"></i><b>P${escapeHTML(project.code||'')}</b> ${escapeHTML(project.title)}</span></td><td>${escapeHTML(projectAreaName(project)||'—')}</td><td>${escapeHTML([...new Set(tasks.map(task=>task.type).filter(Boolean))].join(', ')||project.type||'—')}</td><td><span class="project-status project-status-${projectStatusClass(projectStatus(project))}">${escapeHTML(projectStatus(project))}</span></td><td>${finalized?(endLabel?escapeHTML(endLabel):'—'):''}</td><td><div class="project-list-progress"><span style="width:${progress??0}%"></span></div>${progressLabel(progress)}</td><td>${tasks.filter(task=>task.recurring).length}</td><td><button type="button" class="small-edit" data-edit-project="${escapeHTML(project.id)}">Editar</button></td></tr>`;}).join('');return `<p class="action-list-count">${projects.length} ${projects.length===1?'projeto encontrado':'projetos encontrados'}</p><div class="action-list-scroll"><table class="action-list-table project-list-table"><thead><tr><th>Projeto</th><th>Área</th><th>Tipos</th><th>Status</th><th>Fim</th><th>Progresso</th><th>Recorrentes</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="8" class="action-list-empty">Nenhum projeto corresponde aos filtros.</td></tr>'}</tbody></table></div>`;}
  function projectHistoryView(projects){
    if(!selectedProjectHistoryId||!projects.some(project=>project.id===selectedProjectHistoryId))selectedProjectHistoryId=projects[0]?.id||'';
    const project=projects.find(item=>item.id===selectedProjectHistoryId);
    if(!project)return'<div class="empty-state"><h3>Nenhum histórico disponível</h3></div>';
    const periods=projectHistoryPeriodRange([project]);
    const values=periods.map(period=>projectHistoryValue(project,period)).filter(value=>value!==null);
    const points=periods.map((period,index)=>({period,value:projectHistoryValue(project,period),x:periods.length<2?20:20+index*(560/(periods.length-1))})).filter(point=>point.value!==null);
    const path=points.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${(180-point.value*1.5).toFixed(1)}`).join(' ');
    const monthlyHeader=periods.map(period=>`<th class="project-history-month">${escapeHTML(projectPeriodLabel(period))}</th>`).join('');
    const historyCell=(owner,period)=>{const project_=owner===project,value=project_?projectHistoryValue(project,period):taskHistoryValue(owner,period),statusTag=project_?projectMonthStatusTag(project,period):taskMonthStatusTag(owner,period);return `<td>${projectHistoryEditMode?`<input class="project-history-input" type="number" min="0" max="100" step="1" value="${value??''}" data-history-owner="${project_?'project':'task'}" data-history-id="${escapeHTML(owner.id)}" data-history-period="${period}" aria-label="${escapeHTML(projectPeriodLabel(period))}" ${monthAfterCompletion(owner,period)?'disabled title="Mês após o fim: status Concluída e progresso 100% automáticos."':''}>`:historyValueLabel(value)}${statusTag}</td>`;};
    const projectRow=`<tr class="project-history-project-row"><td><strong>P${escapeHTML(project.code||'')} · ${escapeHTML(project.title)}</strong></td><td>${escapeHTML(project.startDate||'—')}</td><td>${escapeHTML(project.endDate||'—')}</td><td>${escapeHTML(projectStatus(project))}</td><td>${progressLabel(projectProgress(project))}</td>${periods.map(period=>historyCell(project,period)).join('')}</tr>`;
    const taskRows=project.tasks.filter(task=>!task.deleted).sort((a,b)=>(a.order??0)-(b.order??0)).map(task=>`<tr><td class="project-history-activity"><span>${escapeHTML(task.code||'')}</span>${escapeHTML(task.title||'')}</td><td>${escapeHTML(task.startDate||project.startDate||'—')}</td><td>${escapeHTML(task.endDate||project.endDate||'—')}</td><td>${escapeHTML(task.status||'Em andamento')}</td><td>${progressLabel(taskProgress(task))}</td>${periods.map(period=>historyCell(task,period)).join('')}</tr>`).join('');
    const actions=projectHistoryEditMode?`<button type="button" class="primary-button compact-button" id="project-history-save">Salvar alterações</button><button type="button" class="secondary-button compact-button" id="project-history-cancel">Cancelar</button>`:`<button type="button" class="secondary-button compact-button" id="project-history-edit">Editar todos os meses</button><button type="button" class="secondary-button compact-button" id="project-history-status">Editar mês</button>`;
    return `<div class="project-history-controls"><label>Projeto<select id="project-history-project" class="text-input">${projects.map(item=>`<option value="${escapeHTML(item.id)}" ${item.id===project.id?'selected':''}>P${escapeHTML(item.code||'')} · ${escapeHTML(item.title)}</option>`).join('')}</select></label><div class="project-history-actions">${actions}<span>${periods.length} períodos registrados</span></div></div><section class="project-history-chart"><h3>Evolução de ${escapeHTML(project.title)}</h3>${points.length>1?`<svg viewBox="0 0 600 210" role="img" aria-label="Evolução mensal do projeto"><line x1="20" y1="30" x2="580" y2="30"></line><line x1="20" y1="105" x2="580" y2="105"></line><line x1="20" y1="180" x2="580" y2="180"></line><path d="${path}"></path>${points.map(point=>`<circle cx="${point.x}" cy="${180-point.value*1.5}" r="4"><title>${escapeHTML(projectPeriodLabel(point.period))}: ${Math.round(point.value)}%</title></circle>`).join('')}</svg>`:'<p class="planner-empty">São necessários pelo menos dois períodos medidos para desenhar o gráfico.</p>'}</section><div class="action-list-scroll project-history-matrix-wrap"><table class="action-list-table project-history-matrix"><thead><tr><th>Atividade</th><th>Início</th><th>Fim</th><th>Status</th><th>% concluído</th>${monthlyHeader}</tr></thead><tbody>${projectRow}${taskRows||`<tr><td colspan="${5+periods.length}">Nenhuma atividade cadastrada.</td></tr>`}</tbody></table></div>`;
  }
  function saveProjectHistoryEdits(){
    const inputs=$$('.project-history-input');
    for(const input of inputs){
      const value=input.value.trim()===''?null:projectValue(input.value),project=projectList().find(item=>item.id===input.dataset.historyId);
      if(input.dataset.historyOwner==='project'){
        if(project){if(value===null)delete project.history[input.dataset.historyPeriod];else project.history[input.dataset.historyPeriod]=value;project.updatedAt=stamp();}
      }else{
        const owner=projectList().find(item=>item.tasks.some(task=>task.id===input.dataset.historyId)),task=owner?.tasks.find(item=>item.id===input.dataset.historyId);
        if(task&&owner){if(value===null)delete task.history[input.dataset.historyPeriod];else task.history[input.dataset.historyPeriod]=value;task.updatedAt=stamp();owner.updatedAt=stamp();}
      }
    }
    saveLocal();projectHistoryEditMode=false;renderProjects();toast('Histórico atualizado.');
  }
  function projectHistoryChart(subject,title){const periods=Object.keys(subject.history||{}).sort(),chartValue=period=>Array.isArray(subject.tasks)?projectHistoryValue(subject,period):taskHistoryValue(subject,period),points=periods.map((period,index)=>({period,value:chartValue(period),x:periods.length<2?20:20+index*(560/(periods.length-1))})).filter(point=>point.value!==null),path=points.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${(180-point.value*1.5).toFixed(1)}`).join(' ');$('#project-chart-title').textContent=`Evolução · ${title}`;$('#project-chart-content').innerHTML=points.length>1?`<section class="project-history-chart project-chart-panel"><svg viewBox="0 0 600 210" role="img" aria-label="Evolução mensal"><line x1="20" y1="30" x2="580" y2="30"></line><line x1="20" y1="105" x2="580" y2="105"></line><line x1="20" y1="180" x2="580" y2="180"></line><path d="${path}"></path>${points.map(point=>`<circle cx="${point.x}" cy="${180-point.value*1.5}" r="4"><title>${escapeHTML(projectPeriodLabel(point.period))}: ${Math.round(point.value)}%</title></circle>`).join('')}</svg><div class="project-chart-periods">${points.map(point=>`<span>${escapeHTML(projectPeriodLabel(point.period))}: <b>${Math.round(point.value)}%</b></span>`).join('')}</div></section>`:'<p class="planner-empty">São necessários pelo menos dois períodos medidos para desenhar o gráfico.</p>';$('#project-chart-dialog').showModal();}
  function openProjectMonthEditor(periodArg){
    const projects=filteredProjects(),periods=projectHistoryPeriodRange(projects);
    if(!periods.length){toast('Ainda não há meses registrados.');return;}
    const wanted=String(periodArg||selectedProjectMonth||'').replace('-','');
    const period=periods.includes(wanted)?wanted:periods[periods.length-1];
    const options=periods.map(item=>`<option value="${item}"${item===period?' selected':''}>${escapeHTML(projectPeriodLabel(item))}</option>`).join('');
    const progressInput=(kind,id,value,name,auto)=>{const initial=auto?100:(value===null||value===undefined?'':value);return `<input class="text-input project-month-progress-input" type="number" min="0" max="100" step="1" placeholder="—" value="${initial}" data-initial-value="${initial}" data-progress-kind="${kind}" data-progress-id="${escapeHTML(id)}" aria-label="Progresso de ${escapeHTML(name)} em ${escapeHTML(projectPeriodLabel(period))}" ${auto?'disabled title="Concluído: meses após o fim são automáticos."':''}>`;};
    const statusSelect=(kind,id,saved,name,auto)=>`<select class="text-input project-month-status-select" data-status-kind="${kind}" data-status-id="${escapeHTML(id)}" aria-label="Status de ${escapeHTML(name)} em ${escapeHTML(projectPeriodLabel(period))}" ${auto?'disabled title="Concluído: meses após o fim são automáticos."':''}>${historyStatusOptions(auto?'Concluída':saved||'')}</select>`;
    const rows=projects.map(project=>{
      const projectAuto=monthAfterCompletion(project,period),projectCompletion=completionPeriod(project),projectCompleted=projectStatusClass(project.status)==='concluida',projectCompletedFrom=projectCompleted&&projectCompletion&&period>=projectCompletion;
      const projectControls=`${statusSelect('project',project.id,project.statusHistory?.[period]||(projectCompletedFrom?'Concluída':''),project.title,projectAuto)}${progressInput('project',project.id,projectValue(project.history?.[period]),project.title,projectAuto)}`;
      const taskRows=project.tasks.filter(task=>!task.deleted).sort((a,b)=>(a.order??0)-(b.order??0)).map(task=>{const auto=monthAfterCompletion(task,period),completion=completionPeriod(task),completed=projectStatusClass(task.status)==='concluida',completedFrom=completed&&completion&&period>=completion;return `<label class="project-month-status-row is-task"><span><small>${escapeHTML(task.code||'')}</small>${escapeHTML(task.title||'')}</span>${statusSelect('task',task.id,task.statusHistory?.[period]||(completedFrom?'Concluída':''),task.title,auto)}${progressInput('task',task.id,taskHistoryValue(task,period),task.title,auto)}</label>`;}).join('');
      return `<section class="project-month-status-group"><label class="project-month-status-row is-project"><span><small>P${escapeHTML(project.code||'')}</small>${escapeHTML(project.title||'')}</span>${projectControls}</label>${taskRows}</section>`;
    }).join('');
    $('#project-chart-title').textContent=`Editar ${projectPeriodLabel(period)}`;
    $('#project-chart-content').innerHTML=`<div class="project-month-status-editor"><div class="project-month-status-period"><label>Mês<select id="project-month-status-period" class="text-input">${options}</select></label><span>Progresso e status do mês. Meses após o fim de itens concluídos são automáticos: Concluída e 100%.</span></div><div class="project-month-status-list">${rows}</div><div class="project-month-status-actions"><button type="button" class="primary-button compact-button" id="project-month-status-save" data-status-period="${period}">Salvar mês</button></div></div>`;
    const dialog=$('#project-chart-dialog');if(!dialog.open)dialog.showModal();
  }
  function saveProjectMonthEdits(period){
    if(!period)return;
    const targetFor=(kind,id)=>{const project=projectList().find(item=>kind==='project'?item.id===id:item.tasks.some(task=>task.id===id));return{project,target:kind==='project'?project:project?.tasks.find(task=>task.id===id)};};
    for(const select of $$('.project-month-status-select')){
      const{project,target}=targetFor(select.dataset.statusKind,select.dataset.statusId);
      if(!target||!project)continue;
      if(!target.statusHistory||typeof target.statusHistory!=='object'||Array.isArray(target.statusHistory))target.statusHistory={};
      if(select.value)target.statusHistory[period]=select.value;else delete target.statusHistory[period];
      target.updatedAt=stamp();project.updatedAt=stamp();
    }
    for(const input of $$('.project-month-progress-input')){
      if(input.value.trim()===String(input.dataset.initialValue??'').trim())continue;
      const{project,target}=targetFor(input.dataset.progressKind,input.dataset.progressId);
      if(!target||!project)continue;
      if(!target.history||typeof target.history!=='object')target.history={};
      const value=input.value.trim()===''?null:projectValue(input.value);
      if(value===null)delete target.history[period];else target.history[period]=value;
      target.updatedAt=stamp();project.updatedAt=stamp();
    }
    saveLocal();$('#project-chart-dialog').close();renderProjects();toast(`Progresso e status de ${projectPeriodLabel(period)} salvos.`);
  }
  function historyEditorPeriods(owner){const completion=completionPeriod(owner),currentPeriod=projectMonthKey(isoToday()),keys=[...new Set([...Object.keys(owner?.history||{}),...Object.keys(owner?.statusHistory||{}),...(completion?[completion]:[])])].filter(period=>/^\d{6}$/.test(period)).sort(),startKey=ownerStartPeriod(owner)||keys[0]||currentPeriod,start=startKey<=currentPeriod?startKey:currentPeriod,periods=[],cursor=safeDate(`${start.slice(0,4)}-${start.slice(4)}-01`),end=safeDate(`${currentPeriod.slice(0,4)}-${currentPeriod.slice(4)}-01`);while(cursor<=end){periods.push(`${cursor.getFullYear()}${String(cursor.getMonth()+1).padStart(2,'0')}`);cursor.setMonth(cursor.getMonth()+1);}return periods;}
  function renderHistoryEditor(selector,owner){const target=$(selector);if(!target)return;target.innerHTML=`<h3>Histórico mensal</h3><p class="schedule-hint">Progresso e status de cada mês. Meses após o fim de itens concluídos são automáticos: Concluída e 100%.</p><div class="project-history-editor-grid">${historyEditorPeriods(owner).map(period=>{const auto=monthAfterCompletion(owner,period),completion=completionPeriod(owner),completed=projectStatusClass(owner?.status)==='concluida',completedFrom=completed&&completion&&period>=completion,progress=auto?100:projectValue(owner?.history?.[period]),status=auto?'Concluída':owner?.statusHistory?.[period]||(completedFrom?'Concluída':'');return `<label${auto?' class="is-auto"':''}><span>${escapeHTML(projectPeriodLabel(period))}</span><input class="text-input" type="number" min="0" max="100" step="1" data-form-history="${period}" value="${progress??''}" aria-label="Progresso de ${escapeHTML(projectPeriodLabel(period))}" ${auto?'disabled title="Mês após o fim: progresso 100% automático."':''}><select class="text-input" data-form-status="${period}" aria-label="Status de ${escapeHTML(projectPeriodLabel(period))}" ${auto?'disabled title="Mês após o fim: status Concluída automático."':''}>${historyStatusOptions(status)}</select></label>`;}).join('')}</div>`;}
  function readHistoryEditor(selector){const history={};$$(`${selector} [data-form-history]`).forEach(input=>{const value=input.value.trim()===''?null:projectValue(input.value);if(value!==null)history[input.dataset.formHistory]=value;});return history;}
  function readStatusHistoryEditor(selector){const statuses={};$$(`${selector} [data-form-status]`).forEach(select=>{statuses[select.dataset.formStatus]=select.value;});return statuses;}
  function applyStatusHistoryEditor(selector,owner){if(!owner)return;const statuses=readStatusHistoryEditor(selector);if(!owner.statusHistory||typeof owner.statusHistory!=='object'||Array.isArray(owner.statusHistory))owner.statusHistory={};for(const [period,value] of Object.entries(statuses)){if(value)owner.statusHistory[period]=value;else delete owner.statusHistory[period];}}
  function projectHistoryRecordedPeriods(projects){const keys=new Set();for(const project of projects){for(const key of Object.keys(project.history||{}))keys.add(key);for(const key of Object.keys(project.statusHistory||{}))keys.add(key);const projectStart=ownerStartPeriod(project);if(projectStart)keys.add(projectStart);const projectCompletion=completionPeriod(project);if(projectCompletion)keys.add(projectCompletion);for(const task of project.tasks||[]){for(const key of Object.keys(task.history||{}))keys.add(key);for(const key of Object.keys(task.statusHistory||{}))keys.add(key);const taskStart=ownerStartPeriod(task);if(taskStart)keys.add(taskStart);const taskCompletion=completionPeriod(task);if(taskCompletion)keys.add(taskCompletion);for(const item of task.occurrences||[]){const key=String(item.date||'').slice(0,7).replace('-','');if(/^\d{6}$/.test(key))keys.add(key);}}}return [...keys].filter(key=>/^\d{6}$/.test(key)).sort();}
  function projectHistoryPeriodRange(projects){const recorded=projectHistoryRecordedPeriods(projects),periods=[],start=recorded[0]||projectMonthKey(isoToday()),endKey=projectMonthKey(isoToday()),cursor=safeDate(`${start.slice(0,4)}-${start.slice(4)}-01`),end=safeDate(`${endKey.slice(0,4)}-${endKey.slice(4)}-01`);while(cursor<=end){periods.push(`${cursor.getFullYear()}${String(cursor.getMonth()+1).padStart(2,'0')}`);cursor.setMonth(cursor.getMonth()+1);}return periods;}
  function projectHistoryAllView(projects){const periods=projectHistoryPeriodRange(projects);const header=periods.map(period=>`<th class="project-history-month" data-history-month-status="${period}" title="Editar progresso e status de ${escapeHTML(projectPeriodLabel(period))}">${escapeHTML(projectPeriodLabel(period))}</th>`).join('');let rows='';for(const project of projects){rows+=`<tr class="project-history-project-row"><td><strong>P${escapeHTML(project.code||'')} · ${escapeHTML(project.title)}</strong><button class="small-edit project-chart-button" type="button" data-project-chart="${escapeHTML(project.id)}">Gráfico</button></td><td>${escapeHTML(project.startDate||'—')}</td><td>${escapeHTML(project.endDate||'—')}</td><td>${escapeHTML(projectStatus(project))}</td><td>${progressLabel(projectProgress(project))}</td>${periods.map(period=>projectHistoryEditMode?`<td><input class="project-history-input" type="number" min="0" max="100" step="1" value="${projectHistoryValue(project,period)??''}" data-history-owner="project" data-history-id="${escapeHTML(project.id)}" data-history-period="${period}" ${monthAfterCompletion(project,period)?'disabled title="Projeto concluído: meses após o fim são automáticos."':''}>${projectMonthStatusTag(project,period)}</td>`:`<td>${historyValueLabel(projectHistoryValue(project,period))}${projectMonthStatusTag(project,period)}</td>`).join('')}</tr>`;for(const task of project.tasks.filter(item=>!item.deleted).sort((a,b)=>(a.order??0)-(b.order??0)))rows+=`<tr><td class="project-history-activity"><span>${escapeHTML(task.code||'')}</span>${escapeHTML(task.title||'')}<button class="small-edit project-chart-button" type="button" data-task-chart="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Gráfico</button></td><td>${escapeHTML(task.startDate||project.startDate||'—')}</td><td>${escapeHTML(task.endDate||project.endDate||'—')}</td><td>${escapeHTML(task.status||'Em andamento')}</td><td>${progressLabel(taskProgress(task))}</td>${periods.map(period=>projectHistoryEditMode?`<td><input class="project-history-input" type="number" min="0" max="100" step="1" value="${taskHistoryValue(task,period)??''}" data-history-owner="task" data-history-id="${escapeHTML(task.id)}" data-history-period="${period}" ${monthAfterCompletion(task,period)?'disabled title="Atividade concluída: meses após o fim são automáticos."':''}>${taskMonthStatusTag(task,period)}</td>`:`<td>${historyValueLabel(taskHistoryValue(task,period))}${taskMonthStatusTag(task,period)}</td>`).join('')}</tr>`;}const actions=projectHistoryEditMode?`<button type="button" class="primary-button compact-button" id="project-history-save">Salvar alterações</button><button type="button" class="secondary-button compact-button" id="project-history-cancel">Cancelar</button>`:`<button type="button" class="secondary-button compact-button" id="project-history-edit">Editar todos os meses</button><button type="button" class="secondary-button compact-button" id="project-history-status">Editar mês</button>`;return `<div class="project-history-controls"><div class="project-history-actions">${actions}<span>${periods.length} períodos até ${escapeHTML(projectPeriodLabel(projectMonthKey(isoToday())))} · ${projects.length} projetos</span></div><p class="project-history-hint">Clique em um mês ou em “Editar mês” para editar progresso e status juntos. “—” = sem medição.</p></div><div class="action-list-scroll project-history-matrix-wrap"><table class="action-list-table project-history-matrix"><thead><tr><th>Projeto / Atividade</th><th>Início</th><th>Fim</th><th>Status</th><th>% concluído</th>${header}</tr></thead><tbody>${rows||`<tr><td colspan="${5+periods.length}">Nenhum projeto cadastrado.</td></tr>`}</tbody></table></div>`;}
  function updateProjectMonthControls(){
    const snapshot=$('#project-snapshot'),reopen=$('#project-reopen-history'),inProgress=projectView==='progress',closed=projectMonthClosed(selectedProjectMonth),past=selectedProjectMonth<isoToday().slice(0,7);
    if(snapshot){
      snapshot.classList.toggle('hidden',!inProgress);
      snapshot.textContent=closed&&!projectMonthEditMode?'Mês fechado':'Fechar mês';
      snapshot.disabled=!inProgress||(closed&&!projectMonthEditMode);
      snapshot.title=!inProgress?'Disponível na aba Progresso.':projectMonthEditMode?(past?'Salva as edições manuais do histórico e fecha o mês.':'Salva os status do mês e fecha com o progresso automático.'):closed?'Mês fechado. Reabra o histórico para editar.':'Calcula e fecha o mês selecionado.';
    }
    if(reopen){
      reopen.textContent=past?'Reabrir histórico':'Reabrir mês';
      reopen.classList.toggle('hidden',!inProgress||!closed||projectMonthEditMode);
    }
  }
  function refreshProjectCardStatus(project){
    const card=document.querySelector(`.project-card[data-project-id="${project.id}"]`);
    if(!card)return;
    const status=projectStatusForMonth(project,selectedProjectMonth),statusTag=card.querySelector('.project-card-status');
    if(statusTag){statusTag.textContent=status;statusTag.className=`project-card-status is-${projectStatusClass(status)}`;}
    const progress=projectProgressForMonth(project,selectedProjectMonth),bar=card.querySelector('.project-progress-row .project-progress span'),label=card.querySelector('.project-progress-row > b');
    if(bar)bar.style.width=`${progress??0}%`;
    if(label)label.textContent=progressLabel(progress);
    const subtitle=card.querySelector('.project-card-title small');
    if(subtitle){const tasks=project.tasks.filter(task=>!task.deleted),finalized=statusIsFinal(status),endLabel=projectEndLabel(project);subtitle.textContent=`${tasks.length} ${tasks.length===1?'atividade':'atividades'}${finalized&&endLabel?` · Fim ${endLabel}`:''}`;}
  }
  function refreshTaskStatusRow(project,task){
    const editButton=document.querySelector(`[data-edit-project-task="${task.id}"][data-project-id="${project.id}"]`),row=editButton?.closest('.project-task-row');
    if(row){
      const status=taskStatusForMonth(task,selectedProjectMonth),completed=status==='Concluída',done=completed,excluded=PROJECT_EXCLUDED_STATUSES.has(status),progress=taskProgressForMonth(task,selectedProjectMonth),statusTag=row.querySelector('.project-task-status'),bar=row.querySelector('.project-task-progress-cell .project-list-progress span'),input=row.querySelector('[data-project-progress]'),unit=row.querySelector('.project-task-progress-cell > em'),check=row.querySelector('.project-task-check');
      row.classList.toggle('is-done',done);row.classList.toggle('is-excluded',excluded);
      if(statusTag){statusTag.textContent=status;statusTag.className=`project-task-status is-${projectStatusClass(status)}`;}
      if(bar)bar.style.width=`${progress??0}%`;
      if(input)input.value=progress===null?'':Math.round(progress);
      if(unit)unit.textContent=progress===null?'—':'%';
      if(check){check.textContent=completed?'✓':'';check.classList.toggle('is-habit-done',taskIsHabit(task)&&completed);check.setAttribute('aria-label',`${completed?'Reabrir':'Concluir'} ${task.title}`);}
    }
    refreshProjectCardStatus(project);
  }
  function renderProjects(){
    renderProjectFilters();
    const content=$('#projects-content');if(!content)return;
    const projects=filteredProjects(),monthLabel=fmtDate(`${selectedProjectMonth}-01`,{month:'long',year:'numeric'}),monthCurrent=selectedProjectMonth===isoToday().slice(0,7),period=projectMonthPeriod(),closed=projectMonthClosed(selectedProjectMonth);
    if(projectMonthEditMode&&!closed&&selectedProjectMonth<isoToday().slice(0,7))projectMonthEditMode=false;
    const monthStatus=projectMonthManualProgress()?'Editando o histórico manualmente · digite os valores salvos':projectMonthEditMode?'Editando os status do mês · progresso automático':closed?'Mês fechado · use “Reabrir histórico” para editar':'As atividades mostram o progresso do mês selecionado';
    $('.project-toolbar').classList.toggle('hidden',projectView==='habits');
    $$('.project-tab').forEach(button=>button.classList.toggle('active',button.dataset.projectView===projectView));
    const monthBar=`<div class="project-month-bar${projectMonthEditMode?' is-editing':''}"><div class="project-month-nav"><button type="button" class="secondary-button compact-button" data-project-month-shift="-1" aria-label="Mês anterior">‹</button><input type="month" id="project-month" class="text-input" value="${selectedProjectMonth}" aria-label="Mês do progresso"><button type="button" class="secondary-button compact-button" data-project-month-shift="1" aria-label="Próximo mês">›</button><button type="button" class="text-button" data-project-month-today>Atual</button></div><span>Progresso de ${escapeHTML(monthLabel)}${monthCurrent?' · mês atual':''} · ${escapeHTML(monthStatus)}</span></div>`;
    if(projectView==='habits')content.innerHTML=renderHabitsView();
    else if(projectView==='progress')content.innerHTML=monthBar+(projects.length?`<div class="project-board">${projects.map(projectCard).join('')}</div>`:'<div class="empty-state"><span>◈</span><h3>Nenhum projeto encontrado</h3><p>Crie um projeto ou ajuste os filtros.</p></div>');
    else if(projectView==='recurring')content.innerHTML=recurringView(projects);
    else if(projectView==='history')content.innerHTML=projectHistoryAllView(projects);
    else content.innerHTML=projectListView(projects);
    content.classList.toggle('is-history-editing',projectMonthEditMode);
    updateProjectMonthControls();
    if($('#project-focus-dialog')?.open)renderProjectFocus();
  }
  function openProjectDialog(id=''){const project=projectList().find(item=>item.id===id);$('#project-form').reset();$('#project-id').value=project?.id||'';$('#project-dialog-title').textContent=project?'Editar projeto':'Novo projeto';$('#project-code').value=project?.code||'';$('#project-order').value=project?.order??projectList().length;$('#project-title').value=project?.title||'';$('#project-description').value=project?.description||'';const projectAreas=orderedActionAreas();$('#project-area').innerHTML='<option value="">Sem área</option>'+projectAreas.map(item=>`<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`).join('');if(project?.areaId&&!projectAreas.some(item=>item.id===project.areaId))$('#project-area').insertAdjacentHTML('beforeend',`<option value="${escapeHTML(project.areaId)}">Área indisponível</option>`);$('#project-area').value=project?.areaId||'';$('#project-status').value=project?.status||'Em andamento';$('#project-start').value=project?.startDate||'';$('#project-end').value=project?.endDate||'';$('#project-icon').value=project?.icon||'◈';$('#project-color').value=project?.color||'#6657e8';$('#project-type').value=project?.type||'Descrição';$('#project-notes').value=project?.notes||'';$('#delete-project').classList.toggle('hidden',!project);renderHistoryEditor('#project-history-editor',project);$('#project-dialog').showModal();}
  function saveProject(event){event.preventDefault();const id=$('#project-id').value||uid(),existing=projectList().find(project=>project.id===id),now=stamp(),code=$('#project-code').value.trim()||String(Date.now()).slice(-6);const areaId=$('#project-area').value;const next={id,code,order:Number($('#project-order').value)||0,title:$('#project-title').value.trim(),description:$('#project-description').value.trim(),areaId,area:actionAreaName({areaId}),status:$('#project-status').value,startDate:$('#project-start').value,endDate:completionEndDate($('#project-status').value,$('#project-end').value),icon:$('#project-icon').value.trim()||'◈',color:$('#project-color').value,type:$('#project-type').value,notes:$('#project-notes').value.trim(),history:existing?.history||{},statusHistory:existing?.statusHistory||{},monthNotes:existing?.monthNotes||{},source:existing?.source||'app',tasks:existing?.tasks||[],updatedAt:now,deleted:false};if(!next.title)return;state.projects=state.projects.filter(project=>project.id!==id);state.projects.push(next);saveLocal();$('#project-dialog').close();renderProjects();toast('Projeto salvo.');}
  function deleteProject(){const id=$('#project-id').value,project=projectList().find(item=>item.id===id);if(!project||!confirm(`Excluir “${project.title}”?`))return;project.deleted=true;project.updatedAt=stamp();saveLocal();$('#project-dialog').close();renderProjects();toast('Projeto excluído.');}
  function updateProjectTaskProgressMode(){const habit=taskTypeIsHabit($('#project-task-type').value),recurring=$('#project-task-recurring').value==='yes',automatic=habit||recurring,mode=$('#project-task-progress-mode');mode.textContent=habit?'Automático (mês)':automatic?'Automático':'Manual';mode.className=`progress-mode ${automatic?'is-automatic':'is-manual'}`;$('#project-task-progress').disabled=automatic;}
  function updateProjectTaskRecurrence(){const habit=taskTypeIsHabit($('#project-task-type').value),recurrenceSelect=$('#project-task-recurring');if(habit)recurrenceSelect.value='yes';recurrenceSelect.disabled=habit;recurrenceSelect.title=habit?'Hábitos são sempre recorrentes. Ajuste a frequência para mudar o período.':'';const recurring=recurrenceSelect.value==='yes';$('#project-task-recurrence-fields').classList.toggle('hidden',!recurring);$('#project-task-month-week')?.closest('.field')?.classList.toggle('hidden',habit);$('#project-task-habit-hint').classList.toggle('hidden',!habit);$('#project-task-habit-target-field').classList.toggle('hidden',!habit);if(habit&&!Number($('#project-task-habit-target').value))$('#project-task-habit-target').value=defaultHabitTarget($('#project-task-frequency').value);updateProjectTaskProgressMode();}
  function updateProjectProgressMode(){const automatic=$('#project-progress').value==='';const mode=$('#project-progress-mode');mode.textContent=automatic?'Automático':'Manual';mode.className=`progress-mode ${automatic?'is-automatic':'is-manual'}`;}
  function openProjectTaskDialog(taskId='',projectId=''){const project=projectList().find(item=>item.id===projectId)||projectList()[0],task=project?.tasks.find(item=>item.id===taskId);$('#project-task-form').reset();$('#project-task-id').value=task?.id||'';$('#project-task-dialog-title').textContent=task?(taskIsHabit(task)?'Editar hábito':'Editar atividade'):'Nova atividade';$('#project-task-project').innerHTML=projectList().map(item=>`<option value="${escapeHTML(item.id)}">P${escapeHTML(item.code||'')} · ${escapeHTML(item.title)}</option>`).join('');$('#project-task-project').value=task?.projectId||project?.id||'';$('#project-task-code').value=task?.code||`${project?.code||''}-${(project?.tasks.filter(item=>!item.deleted).length||0)+1}`;$('#project-task-order').value=task?.order??(project?.tasks.filter(item=>!item.deleted).length||0)+1;$('#project-task-title').value=task?.title||'';$('#project-task-type').value=task?.type||'Tarefa';$('#project-task-recurring').value=task?.recurring?'yes':'no';$('#project-task-frequency').value=task?.frequency||(taskIsHabit(task)?'daily':'monthly');$('#project-task-month-week').value=task?.monthWeek||'';$('#project-task-habit-target').value=task?.habitTarget||defaultHabitTarget(task?.frequency||'monthly');$('#project-task-status').value=task?.status||'Em andamento';$('#project-task-progress').value=taskProgress(task||{})??'';$('#project-task-start').value=task?.startDate||project?.startDate||'';$('#project-task-end').value=task?.endDate||project?.endDate||'';$('#project-task-color').value=task?.color||project?.color||'#6657e8';$('#project-task-notes').value=task?.notes||'';renderHistoryEditor('#project-task-history-editor',task||null);updateProjectTaskRecurrence();$('#delete-project-task').classList.toggle('hidden',!task);$('#project-task-dialog').showModal();}
  function saveProjectTask(event){event.preventDefault();const projectId=$('#project-task-project').value,project=projectList().find(item=>item.id===projectId);if(!project)return;const id=$('#project-task-id').value||uid(),now=stamp();let existing=null;for(const item of projectList())existing=item.tasks.find(task=>task.id===id)||existing;const type=$('#project-task-type').value,habit=taskTypeIsHabit(type),recurring=habit?true:$('#project-task-recurring').value==='yes',status=$('#project-task-status').value,manualProgress=projectValue($('#project-task-progress').value),frequency=recurring?($('#project-task-frequency').value||(habit?'daily':'monthly')):'',monthWeek=recurring&&MONTHLY_TASK_FREQUENCIES.includes(frequency)?Number($('#project-task-month-week').value)||null:null;const task={id,projectId,code:$('#project-task-code').value.trim()||`${project.code}-${$('#project-task-order').value}`,order:Number($('#project-task-order').value)||1,title:$('#project-task-title').value.trim(),type,recurring,frequency,monthWeek,status,progress:habit?null:manualProgress,startDate:$('#project-task-start').value,endDate:completionEndDate(status,$('#project-task-end').value),icon:existing?.icon||'▰',color:$('#project-task-color').value,notes:$('#project-task-notes').value.trim(),criteria:[],occurrences:existing?.occurrences||[],history:existing?.history||{},statusHistory:existing?.statusHistory||{},habitTarget:habit?Math.max(1,Number($('#project-task-habit-target').value)||defaultHabitTarget(frequency)):null,completed:!recurring&&status==='Concluída',updatedAt:now,deleted:false};if(!task.title)return;for(const item of state.projects)item.tasks=(item.tasks||[]).filter(entry=>entry.id!==id);project.tasks.push(task);project.updatedAt=now;saveLocal();$('#project-task-dialog').close();renderProjects();renderPlanner();renderWeekly();renderMonthly();toast(habit?'Hábito salvo.':'Atividade salva.');}
  function openNewHabitDialog(){const project=projectList()[0];if(!project){toast('Crie um projeto primeiro.');return;}openProjectTaskDialog('',project.id);$('#project-task-type').value='Hábito';$('#project-task-recurring').value='yes';$('#project-task-frequency').value='daily';$('#project-task-habit-target').value=defaultHabitTarget('daily');$('#project-task-start').value=isoToday();$('#project-task-dialog-title').textContent='Novo hábito';updateProjectTaskRecurrence();$('#project-task-title').focus();}
  function deleteProjectTask(){const id=$('#project-task-id').value;if(!id||!confirm('Excluir esta atividade?'))return;for(const project of state.projects){const task=project.tasks.find(item=>item.id===id);if(task){task.deleted=true;task.updatedAt=stamp();project.updatedAt=stamp();}}saveLocal();$('#project-task-dialog').close();renderProjects();renderPlanner();renderWeekly();renderMonthly();toast('Atividade excluída.');}
  function deleteProjectOccurrence(projectId,taskId,occurrenceId){const{project,task}=findProjectTask(projectId,taskId);if(!task)return;if(!confirm('Excluir esta ocorrência?'))return;const occurrence=task.occurrences.find(item=>item.id===occurrenceId);task.occurrences=task.occurrences.filter(item=>item.id!==occurrenceId);task.progress=recurringTaskProgress(task);if(occurrence?.period){const remaining=task.occurrences.filter(item=>item.period===occurrence.period&&item.result!=='skipped'&&item.result!=='scheduled').map(item=>projectValue(item.progress)).filter(value=>value!==null);if(remaining.length)task.history[occurrence.period]=remaining.reduce((sum,value)=>sum+value,0)/remaining.length;else delete task.history[occurrence.period];}task.updatedAt=stamp();project.updatedAt=stamp();saveLocal();renderProjects();toast('Ocorrência excluída.');}
  function findProjectTask(projectId,taskId){const project=projectList().find(item=>item.id===projectId),task=project?.tasks.find(item=>item.id===taskId&&!item.deleted);return{project,task};}
  function openProjectOccurrence(projectId,taskId,occurrenceId=''){const{project,task}=findProjectTask(projectId,taskId);if(!task)return;const occurrence=occurrenceId?task.occurrences.find(item=>item.id===occurrenceId):null;$('#project-occurrence-form').reset();$('#project-occurrence-project').value=project.id;$('#project-occurrence-task').value=task.id;$('#project-occurrence-id').value=occurrence?.id||'';$('#project-occurrence-title').textContent=occurrence?'Reagendar ocorrência':'Registrar ocorrência';$('#project-occurrence-task-label').textContent=task.title;$('#project-occurrence-date').value=occurrence?.date||isoToday();$('#project-occurrence-result').value=occurrence?.result||'realized';const progressValue=occurrence?projectValue(occurrence.progress):100;$('#project-occurrence-progress').value=progressValue===null?'':progressValue;$('#project-occurrence-progress').disabled=occurrence?.result==='skipped';$('#project-occurrence-notes').value=occurrence?.notes||'';$('#project-occurrence-save').textContent=occurrence?'Salvar':'Registrar';$('#project-occurrence-dialog').showModal();}
  function saveProjectOccurrence(event){event.preventDefault();const{project,task}=findProjectTask($('#project-occurrence-project').value,$('#project-occurrence-task').value);if(!task)return;const id=$('#project-occurrence-id').value,date=$('#project-occurrence-date').value,result=$('#project-occurrence-result').value,progress=result==='not-realized'?0:result==='skipped'?null:projectValue($('#project-occurrence-progress').value),existing=id?task.occurrences.find(item=>item.id===id):null,oldPeriod=existing?.period||projectMonthKey(existing?.date||''),period=projectMonthKey(date),expectedDate=existing?(existing.expectedDate||existing.date):date,occurrence={id:id||uid(),date,expectedDate,period,result,progress,notes:$('#project-occurrence-notes').value.trim(),updatedAt:stamp()};if(existing)task.occurrences=[...task.occurrences.filter(item=>item.id!==id),occurrence];else task.occurrences.push(occurrence);const recalcPeriod=periodKey=>{if(!periodKey)return;const values=task.occurrences.filter(item=>item.period===periodKey&&item.result!=='skipped').map(item=>projectValue(item.progress)).filter(value=>value!==null);if(values.length)task.history[periodKey]=values.reduce((sum,value)=>sum+value,0)/values.length;else delete task.history[periodKey];};recalcPeriod(period);if(oldPeriod&&oldPeriod!==period)recalcPeriod(oldPeriod);const current=task.occurrences.filter(item=>item.period===period&&item.result!=='skipped').map(item=>projectValue(item.progress)).filter(value=>value!==null);if(current.length)task.progress=current.reduce((sum,value)=>sum+value,0)/current.length;task.updatedAt=stamp();project.updatedAt=stamp();saveLocal();$('#project-occurrence-dialog').close();renderProjects();toast(existing?(existing.date===date?'Ocorrência atualizada.':'Ocorrência reagendada sem alterar a programação.'):'Ocorrência registrada sem encerrar a recorrência.');}
  function toggleProjectTask(id,projectId){const{project,task}=findProjectTask(projectId,id);if(!task)return;task.completed=task.status!=='Concluída';task.status=task.completed?'Concluída':'Em andamento';task.progress=task.completed?100:0;if(task.completed&&!task.endDate)task.endDate=isoToday();task.updatedAt=stamp();project.updatedAt=stamp();saveLocal();renderProjects();}
  function moveProjectTask(projectId,taskId,direction){const project=projectList().find(item=>item.id===projectId);if(!project)return;const tasks=project.tasks.filter(task=>!task.deleted).sort((a,b)=>(a.order??0)-(b.order??0)),index=tasks.findIndex(task=>task.id===taskId),other=index+(direction==='up'?-1:1);if(index<0||other<0||other>=tasks.length)return;[tasks[index].order,tasks[other].order]=[tasks[other].order,tasks[index].order];project.updatedAt=stamp();saveLocal();renderProjects();}
  function render() { applyMenuIcons(); renderDay(); renderManage(); renderHistory(); renderTasks(); renderTaskReview(); renderPlanner(); renderWeekly(); renderMonthly(); renderRegistries(); renderTaskWeekly(); renderTaskMonthly(); renderTaskAnnual(); renderTaskCalendar(); renderSummaryWorkspace(); renderAnchors(); renderActions(); renderStudies(); renderLeisure(); renderProjects(); renderOccurrences(); if($('#routine-focus-dialog').open)renderFocusRoutine(); if($('#task-focus-dialog').open)renderTaskFocus(); }
  function setSection(section){
    currentSection=section;
    $$('.workspace-view').forEach(view=>view.classList.toggle('active-workspace',view.id===`${section}-workspace`));
    $$('.sidebar-link').forEach(link=>{const active=link.dataset.section===section;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    if(section==='actions')renderActions();
    if(section==='studies')renderStudies();
    if(section==='leisure')renderLeisure();
    if(section==='weekly')renderWeekly();
    if(section==='monthly')renderMonthly();
    if(section==='summary')renderSummaryWorkspace();
    if(section==='registries')renderRegistries();
    if(section==='settings')renderSettings();
    if(section==='projects')renderProjects();
    if(section==='occurrences')renderOccurrences();
    if(section==='timeline')renderTimeline();
    document.body.classList.remove('sidebar-open');updateSidebarToggle();
  }
  function openActionsWeek(date=selectedDate){
    selectedActionWeekDate=date;actionView='week';setSection('actions');
    window.scrollTo({top:0,behavior:'smooth'});
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
    $('#task-day-navigator').classList.toggle('hidden',view!=='day');
    $('#task-date-label').classList.toggle('hidden',view!=='day');
    $('#task-open-planner').classList.toggle('hidden',view!=='day');
    if(view==='history'||view==='manage')renderTasks();
    if(view==='week')renderTaskWeekly();
    if(view==='month')renderTaskMonthly();
    if(view==='annual')renderTaskAnnual();
    if(view==='calendar')renderTaskCalendar();
    if(view==='review')renderTaskReview();
  }
  function buildWeekdayOptions(selected=[0,1,2,3,4,5,6],target='#weekday-options') {
    $(target).innerHTML = WEEKDAYS.map((day,i)=>`<label class="weekday-option"><input type="checkbox" value="${i}" ${selected.includes(i)?'checked':''}><span>${day}</span></label>`).join('');
  }
  function buildMonthWeekOptions(selected=[]){
    $('#anchor-month-week-options').innerHTML=MONTH_WEEK_OPTIONS.map(week=>`<label class="weekday-option"><input type="checkbox" value="${week}" ${selected.includes(week)?'checked':''}><span>${monthWeekLabel(week)}</span></label>`).join('');
  }
  function updateAnchorScheduleFields(){const type=$('#anchor-schedule-type').value;$('#anchor-weekdays-field').classList.toggle('hidden',type!=='day');$('#anchor-month-weeks-field').classList.toggle('hidden',type!=='week');$('#anchor-months-field').classList.toggle('hidden',type!=='month');}
  function buildAnchorMonthOptions(selected=[]){const labels=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];$('#anchor-month-options').innerHTML=labels.map((label,index)=>`<label class="weekday-option"><input type="checkbox" value="${index+1}" ${selected.includes(index+1)?'checked':''}><span>${label}</span></label>`).join('');}
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
    const frequency=$('#task-frequency').value,monthly=MONTHLY_TASK_FREQUENCIES.includes(frequency),anchored=frequency==='biweekly'||monthly;
    $('#task-start').required=anchored;
    $('#task-month-week-field').classList.toggle('hidden',!monthly);
    $('#task-biweekly-hint').classList.toggle('hidden',!anchored);
    $('#task-biweekly-hint').textContent=monthly?'A repetição conta a partir do mês da data inicial e ocorre sempre na semana escolhida.':'A repetição quinzenal conta a partir da semana da data inicial, de segunda a domingo.';
    if(anchored&&!$('#task-start').value)$('#task-start').value=selectedDate;
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
    $('#task-area').innerHTML=taskAreaOptions(task?.areaId||'');$('#task-area').value=task?.areaId||'';
    $('#task-month-week').value=String(task?.monthWeek||1);
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
    if((frequency==='biweekly'||MONTHLY_TASK_FREQUENCIES.includes(frequency))&&!$('#task-start').value){toast('Escolha a data inicial desta recorrência.');return;}
    if($('#task-end').value&&$('#task-start').value&&$('#task-end').value<$('#task-start').value){toast('A data final precisa ser igual ou posterior à inicial.');return;}
    const oldItems=new Map((existing?.items||[]).map(item=>[item.id,item]));
    const kind=$('#task-kind').value;
    const next={id,name,description:$('#task-description').value.trim(),notes:existing?$('#task-notes').value.trim():'',icon:$('#task-icon').value.trim()||'✓',color:$('#task-color').value,areaId:$('#task-area').value,scheduledTime:$('#task-time').value,durationMinutes:Number($('#task-duration').value)||45,kind:kind==='block'?'block':'regular',consultation:kind==='consultation',frequency,monthWeek:MONTHLY_TASK_FREQUENCIES.includes(frequency)?Number($('#task-month-week').value)||1:null,weekdays,startDate:$('#task-start').value,endDate:$('#task-end').value,items:items.map(item=>({...oldItems.get(item.id),...item})),createdAt:existing?.createdAt||existing?.updatedAt||stamp(),updatedAt:stamp(),deleted:false};
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
    if(!areas.length){toast('Crie um tipo de âncora antes de adicionar âncoras.');return;}
    $('#anchor-form').reset();$('#anchor-id').value=anchor?.id||'';
    $('#anchor-dialog-title').textContent=anchor?'Editar âncora':'Nova âncora';
    $('#anchor-title').value=anchor?.title||'';$('#anchor-icon').value=anchor?.icon||'✨';
    $('#anchor-description').value=anchor?.description||'';$('#anchor-time').value=anchor?.scheduledTime||'';$('#anchor-duration').value=anchor?.durationMinutes??'';$('#anchor-notes').value=anchor?.notes||'';$('#anchor-notes-field').classList.toggle('hidden',!anchor);
    $('#anchor-area').innerHTML=areas.map(area=>`<option value="${escapeHTML(area.id)}">${escapeHTML(area.name)}</option>`).join('');
    $('#anchor-area').value=anchor?.areaId||areas[0].id;
    $('#anchor-start').value=anchor?.startDate||'';$('#anchor-end').value=anchor?.endDate||'';$('#anchor-schedule-type').value=anchor?.scheduleType||'day';
    buildMonthWeekOptions(anchor?.monthWeeks||[]);buildAnchorMonthOptions(anchor?.scheduledMonths||[]);buildWeekdayOptions(anchor?.weekdays||[],'#anchor-weekday-options');updateAnchorScheduleFields();
    $('#delete-anchor').classList.toggle('hidden',!anchor);$('#anchor-dialog').showModal();
  }
  function saveAnchor(event){
    event.preventDefault();
    const id=$('#anchor-id').value||uid(),existing=state.anchors.find(anchor=>anchor.id===id);
    const title=$('#anchor-title').value.trim(),scheduleType=$('#anchor-schedule-type').value,weekdays=scheduleType==='day'?$$('#anchor-weekday-options input:checked').map(input=>Number(input.value)):[],monthWeeks=scheduleType==='week'?$$('#anchor-month-week-options input:checked').map(input=>Number(input.value)):[],scheduledMonths=scheduleType==='month'?$$('#anchor-month-options input:checked').map(input=>Number(input.value)):[];
    if(!title){toast('Dê um nome à âncora.');return;}
    if(!orderedAreas().some(area=>area.id===$('#anchor-area').value)){toast('Escolha um tipo de âncora disponível.');return;}
    if($('#anchor-end').value&&$('#anchor-start').value&&$('#anchor-end').value<$('#anchor-start').value){toast('A data final precisa ser igual ou posterior à inicial.');return;}
    const next={id,title,icon:$('#anchor-icon').value.trim()||'✦',description:$('#anchor-description').value.trim(),notes:existing?$('#anchor-notes').value.trim():'',scheduledTime:$('#anchor-time').value,durationMinutes:$('#anchor-duration').value?Number($('#anchor-duration').value):null,areaId:$('#anchor-area').value,scheduleType,weekdays,monthWeeks,scheduledMonths,startDate:$('#anchor-start').value,endDate:$('#anchor-end').value,updatedAt:stamp(),deleted:false};
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
    $('#area-dialog-title').textContent=area?'Editar tipo de âncora':'Novo tipo de âncora';
    $('#area-name').value=area?.name||'';$('#area-color').value=area?.color||'#e8e5dd';
    $('#delete-area').classList.toggle('hidden',!area);refreshColorPalettes();$('#area-dialog').showModal();
  }
  function saveArea(event){
    event.preventDefault();const id=$('#area-id').value||uid(),name=$('#area-name').value.trim();
    if(!name){toast('Dê um nome ao tipo de âncora.');return;}
    const existing=state.areas.find(area=>area.id===id);
    const next={id,name,color:$('#area-color').value,dailyView:existing?.dailyView||'primary',weeklyView:existing?.weeklyView??true,timelineView:existing?.timelineView??true,order:existing?.order??state.areas.length,updatedAt:stamp(),deleted:false};
    if(existing)state.areas=state.areas.map(area=>area.id===id?next:area);else state.areas.push(next);
    saveLocal();$('#area-dialog').close();render();toast('Tipo de âncora salvo.');
  }
  function deleteArea(){
    const area=state.areas.find(item=>item.id===$('#area-id').value);if(!area)return;
    if(state.anchors.some(anchor=>!anchor.deleted&&anchor.areaId===area.id)){toast('Mova ou exclua as âncoras deste tipo antes de excluí-lo.');return;}
    if(!confirm(`Excluir o tipo de âncora “${area.name}”?`))return;
    area.deleted=true;area.updatedAt=stamp();saveLocal();$('#area-dialog').close();render();toast('Tipo de âncora excluído.');
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
  function removeTaskFromDay(taskId,date=selectedDate){
    const day=ensureTaskDay(date),task=day.tasks[taskId];if(!task)return;
    if(day.finalized){toast('Este dia já foi concluído e não pode mais ser alterado.');return;}
    if(!confirm(`Remover “${task.name}” de ${fmtDate(date)}? O registro e seus passos serão excluídos somente deste dia. A programação da tarefa continua igual.`))return;
    day.excludedTasks={...day.excludedTasks,[taskId]:stamp()};
    delete day.tasks[taskId];day.updatedAt=stamp();
    if(activeTaskId===taskId&&(activeTaskDate||selectedDate)===date)$('#task-focus-dialog').close();
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
    const rows=[['Data','Frequência','Tipo','Tarefa','Ícone','Tarefa concluída','Resultado do bloco','Adiada para','Histórico de adiamentos','Passo','Passo realizado','Descrição da tarefa','Descrição do passo','Horário sugerido','Duração (minutos)']];
    for(const date of Object.keys(state.taskHistory).sort())for(const task of Object.values(state.taskHistory[date].tasks||{})){
      const consultation=taskIsConsultation(task),postponedTo=task.reviewStatus==='postponed'?(task.postponedTo||''):'',postponeHistory=taskPostponementHistory(task,date).map(entry=>`${entry.from} → ${entry.to}`).join(' | ');
      const base=[date,taskFrequencyLabel(task.frequency),consultation?'Consulta':task.kind==='block'?'Bloco':'Regular',task.name,task.icon,consultation&&!task.done?'Não se aplica':task.done?'Sim':'Não',task.kind==='block'?blockStatusLabel(blockStatusOf(task)):'',postponedTo,postponeHistory];
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

  function mergeState(a={},b={},options={}) {
    const isActionBackup=options.actionBackup===true;
    a=ensurePlannerData(normalizeSeedItemIds(a));b=ensurePlannerData(normalizeSeedItemIds(b),{skipLeisureCategoryMigration:isActionBackup});
    if(isActionBackup){
      b.actions=(b.actions||[]).filter(action=>!action.leisure||action.seasonOf||action.leisureType||action.backlog||action.scheduledMonth||action.scheduledDate||action.scheduledTime||action.dueDate||action.completed).map(action=>action.leisure?{...action,parentId:''}:action);
    }
    const mergeRecords=(left,right)=>{
      const records=new Map();
      for(const record of [...left,...right]){
        const previous=records.get(record.id),currentTime=Date.parse(record.updatedAt||0)||0,previousTime=Date.parse(previous?.updatedAt||0)||0;
        if(!previous||currentTime>=previousTime)records.set(record.id,structuredClone(record));
      }
      return [...records.values()];
    };
    const areas=mergeRecords(a.areas,b.areas),anchors=mergeRecords(a.anchors,b.anchors),tasks=mergeRecords(a.tasks,b.tasks),actions=mergeRecords(a.actions,b.actions),occurrences=mergeRecords(a.occurrences,b.occurrences),actionAreas=mergeRecords(a.actionAreas,b.actionAreas),leisureTypes=mergeRecords(a.leisureTypes,b.leisureTypes),projects=mergeRecords(a.projects,b.projects);
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
    const mergeNotes=(left={},right={})=>{const merged={};for(const key of new Set([...Object.keys(left||{}),...Object.keys(right||{})])){const x=left?.[key],y=right?.[key];merged[key]=structuredClone(!x?y:!y?x:(y.updatedAt||'')>=(x.updatedAt||'')?y:x);}return merged;};
    const weekNotes=mergeNotes(a.weekNotes,b.weekNotes),monthNotes=mergeNotes(a.monthNotes,b.monthNotes),weekRegistries=mergeNotes(a.weekRegistries,b.weekRegistries),monthRegistries=mergeNotes(a.monthRegistries,b.monthRegistries);
    const recordTypesMap=new Map();
    for(const recordType of [...(a.recordTypes||[]),...(b.recordTypes||[])]){
      const existing=recordTypesMap.get(recordType.id);
      if(!existing){recordTypesMap.set(recordType.id,structuredClone(recordType));continue;}
      const latest=(recordType.updatedAt||'')>=(existing.updatedAt||'')?recordType:existing;
      const merged=structuredClone(latest);
      const existingCategoryAt=Date.parse(existing.categoryUpdatedAt||'')||0,recordCategoryAt=Date.parse(recordType.categoryUpdatedAt||'')||0;
      if(existingCategoryAt||recordCategoryAt){
        let categorySource;
        if(recordCategoryAt>existingCategoryAt)categorySource=recordType;
        else if(existingCategoryAt>recordCategoryAt)categorySource=existing;
        else categorySource=existing.category==='record'&&recordType.category!=='record'?recordType:recordType.category==='record'&&existing.category!=='record'?existing:latest;
        merged.category=categorySource.category;
        merged.categoryUpdatedAt=categorySource.categoryUpdatedAt||'';
      }else if(existing.category!==recordType.category){
        const categorySource=existing.category==='record'?recordType:recordType.category==='record'?existing:latest;
        merged.category=categorySource.category;
        merged.categoryUpdatedAt=categorySource.categoryUpdatedAt||'';
      }
      recordTypesMap.set(recordType.id,merged);
    }
    const recordTypes=[...recordTypesMap.values()];
    const leftDailyViews=a.dailyViews||{},rightDailyViews=b.dailyViews||{};
    const leftDailyViewsAt=a.dailyViewsUpdatedAt||'',rightDailyViewsAt=b.dailyViewsUpdatedAt||'';
    const useRightDailyViews=rightDailyViewsAt?rightDailyViewsAt>=leftDailyViewsAt:!leftDailyViewsAt&&Boolean(b.dailyViews);
    const dailyViews={};
    for(const key of new Set([...Object.keys(leftDailyViews),...Object.keys(rightDailyViews)])){
      const x=leftDailyViews[key],y=rightDailyViews[key];
      if(!x){dailyViews[key]=structuredClone(y);continue;}
      if(!y){dailyViews[key]=structuredClone(x);continue;}
      const xTime=Date.parse(x.updatedAt||'')||0,yTime=Date.parse(y.updatedAt||'')||0;
      dailyViews[key]=structuredClone(xTime!==yTime?(yTime>xTime?y:x):(useRightDailyViews?y:x));
    }
    const dailyViewsUpdatedAt=useRightDailyViews?rightDailyViewsAt:leftDailyViewsAt;
    const leftMenuIconsAt=a.menuIconsUpdatedAt||'',rightMenuIconsAt=b.menuIconsUpdatedAt||'';
    const useRightMenuIcons=rightMenuIconsAt?rightMenuIconsAt>=leftMenuIconsAt:!leftMenuIconsAt&&Boolean(b.menuIcons);
    const menuIcons=structuredClone((useRightMenuIcons?b.menuIcons:a.menuIcons)||b.menuIcons||a.menuIcons||{});
    const menuIconsUpdatedAt=useRightMenuIcons?rightMenuIconsAt:leftMenuIconsAt;
    return {version:13,dailyViews,dailyViewsUpdatedAt,menuIcons,menuIconsUpdatedAt,leisureTypes,routines:[...routines.values()],tasks,actions,occurrences,actionAreas,projects,areas,anchors,history,taskHistory,dayNotes,weekNotes,monthNotes,weekRegistries,monthRegistries,recordTypes,globalEntries};
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
  function actionBackupData(){return {version:state.version,actions:state.actions,actionAreas:state.actionAreas,leisureTypes:state.leisureTypes};}
  async function syncActionBackup(initialBackup){
    let backup=initialBackup;
    for(let attempt=0;attempt<7;attempt++){
      state=mergeState(state,backup?.data||{},{actionBackup:true});
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
          state=mergeState(mergeState(state,remote?.data||{}),actionBackup?.data||{},{actionBackup:true});
          await syncActionBackup(actionBackup);
          writeStoredState(state);
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
        try { render(); } catch(renderError) { console.error('Falha ao atualizar a tela após sincronizar:',renderError); }
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
      state=mergeState(mergeState(state,remote?.data||{}),actionBackup?.data||{},{actionBackup:true});
      writeStoredState(state);
      if(JSON.stringify(state)!==JSON.stringify(remote?.data||{})||JSON.stringify(actionBackupData())!==JSON.stringify(actionBackup?.data||{})){
        localStorage.setItem(PENDING_KEY,session.user.id);
        scheduleSync();
      }
      localStorage.setItem(LAST_SYNC_KEY,stamp());try{render();}catch(renderError){console.error('Falha ao atualizar a tela após baixar dados:',renderError);}
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
  function recoveryRequested(){
    try {
      const hash=new URLSearchParams(location.hash.replace(/^#/,'')),query=new URLSearchParams(location.search);
      return hash.get('type')==='recovery'||query.get('type')==='recovery';
    } catch { return false; }
  }
  function enterRecoveryMode() {
    pendingRecovery=false;recoveryMode=true;
    $('#recovery-password').value='';$('#recovery-password-confirm').value='';
    try { const url=new URL(location.href);url.hash='';url.searchParams.delete('type');history.replaceState(null,'',url.toString()); } catch {}
    updateAccountDialog();
    if(!$('#account-dialog').open)$('#account-dialog').showModal();
    setTimeout(()=>$('#recovery-password').focus(),50);
  }
  async function setNewPassword() {
    if(!configureSupabase()||!session?.user)return;
    const password=$('#recovery-password').value,confirmation=$('#recovery-password-confirm').value;
    if(password.length<6){$('#account-status').textContent='A nova senha precisa ter pelo menos 6 caracteres.';$('#recovery-password').focus();return;}
    if(password!==confirmation){$('#account-status').textContent='As senhas não conferem.';$('#recovery-password-confirm').focus();return;}
    const button=$('#save-password');button.disabled=true;
    try {
      const {error}=await supabaseClient.auth.updateUser({password});if(error)throw error;
      recoveryMode=false;$('#recovery-password').value='';$('#recovery-password-confirm').value='';
      updateAccountDialog();
      await pushSync('Senha atualizada.');
      toast('Senha atualizada. Você continua conectado.');
    } catch(error){$('#account-status').textContent=error.message||'Não foi possível atualizar a senha.';}
    finally {button.disabled=false;}
  }
  async function cancelRecovery() {
    recoveryMode=false;
    try { await supabaseClient?.auth.signOut(); } catch {}
    session=null;setSyncStatus('offline','Somente neste aparelho');updateAccountDialog();
    toast('Recuperação cancelada. Você saiu da conta.');
  }
  async function requestPasswordReset() {
    if(!configureSupabase()){updateAccountDialog();return;}
    const email=$('#account-email').value.trim();
    if(!email){$('#account-status').textContent='Informe seu e-mail para receber o link de recuperação.';$('#account-email').focus();return;}
    const button=$('#forgot-password');button.disabled=true;
    try {
      const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}${location.pathname}`});
      if(error)throw error;
      $('#account-status').textContent='Enviamos um link de recuperação para o seu e-mail. Confira também a caixa de spam.';
      toast('Link de recuperação enviado.');
    } catch(error){$('#account-status').textContent=error.message||'Não foi possível enviar o link de recuperação.';}
    finally {button.disabled=false;}
  }
  function updateAccountDialog() {
    const ready=configured(),logged=Boolean(session?.user),recovering=recoveryMode&&logged;
    $('#account-fields').classList.toggle('hidden',logged||!ready);
    $('#recovery-fields').classList.toggle('hidden',!recovering);
    $('#connected-actions').classList.toggle('hidden',!logged||recovering);
    $('#account-status').textContent=!ready?'Configure o Supabase para sincronizar este aplicativo.':recovering?'Link de recuperação reconhecido. Escolha uma nova senha.':syncMessage;
    updateSyncSummary();
  }
  async function initializeSync() {
    pendingRecovery=recoveryRequested();
    if(!configureSupabase()){setSyncStatus('offline','Somente neste aparelho');return;}
    const inRecovery=()=>recoveryMode||pendingRecovery;
    supabaseClient.auth.onAuthStateChange((event,newSession)=>{
      session=newSession;
      if(event==='PASSWORD_RECOVERY'||(inRecovery()&&session?.user)){enterRecoveryMode();return;}
      if(recoveryMode||event==='INITIAL_SESSION')return;
      if(session?.user)pushSync();else setSyncStatus('offline','Somente neste aparelho');
      updateAccountDialog();
    });
    try {
      const {data,error}=await supabaseClient.auth.getSession();if(error)throw error;session=data.session;
      if(session?.user&&inRecovery())enterRecoveryMode();
      else if(session?.user){await pushSync();updateAccountDialog();}
      else if(pendingRecovery){pendingRecovery=false;setSyncStatus('offline','Link de recuperação inválido ou expirado.');}
      else setSyncStatus('offline','Somente neste aparelho');
    } catch(error){console.error('Não foi possível iniciar sincronização:',error);setSyncStatus('error','Salvo neste aparelho · nuvem indisponível');}
    updateAccountDialog();
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
  $('#weekly-notes-input').addEventListener('input',event=>{
    state.weekNotes=state.weekNotes||{};
    state.weekNotes[weekDates(selectedWeekDate)[0]]={text:event.target.value,updatedAt:stamp()};
    saveLocal();
  });
  $('#monthly-notes-input').addEventListener('input',event=>{
    state.monthNotes=state.monthNotes||{};
    state.monthNotes[selectedMonthlyMonth]={text:event.target.value,updatedAt:stamp()};
    saveLocal();
  });
  $('#weekly-registry-input').addEventListener('input',event=>{
    state.weekRegistries=state.weekRegistries||{};
    state.weekRegistries[weekDates(selectedWeekDate)[0]]={text:event.target.value,updatedAt:stamp()};
    saveLocal();
  });
  $('#monthly-registry-input').addEventListener('input',event=>{
    state.monthRegistries=state.monthRegistries||{};
    state.monthRegistries[selectedMonthlyMonth]={text:event.target.value,updatedAt:stamp()};
    saveLocal();
  });
  $('#task-today').onclick=()=>setSelectedDate(isoToday());$('#task-date').onchange=e=>setSelectedDate(e.target.value);
  const shiftSummaryMonth=amount=>{const [year,month]=selectedSummaryMonth.split('-').map(Number);const date=new Date(year,month-1+amount,1);selectedSummaryMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;renderSummary();};
  $('#summary-prev-month').onclick=()=>shiftSummaryMonth(-1);$('#summary-next-month').onclick=()=>shiftSummaryMonth(1);
  $('#summary-today').onclick=()=>{selectedSummaryMonth=isoToday().slice(0,7);renderSummary();};
  $('#summary-date').onchange=event=>{if(event.target.value){selectedSummaryMonth=event.target.value;renderSummary();}};
  $$('.summary-tab').forEach(button=>button.onclick=()=>{const view=button.dataset.summaryView;selectedSummaryView=view==='recordacoes'?'recordacoes':view==='esmaltes'?'esmaltes':'summary';renderSummaryWorkspace();});
  $('#summary-esmaltes').addEventListener('click',event=>{const shift=event.target.closest('[data-esmalte-month-shift]');if(shift){const [year,month]=selectedEsmaltesMonth.split('-').map(Number),date=new Date(year,month-1+Number(shift.dataset.esmalteMonthShift),1);selectedEsmaltesMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;renderEsmaltes();return;}if(event.target.closest('[data-esmalte-month-today]')){selectedEsmaltesMonth=isoToday().slice(0,7);renderEsmaltes();return;}if(event.target.closest('[data-esmalte-month-latest]')){selectedEsmaltesMonth=esmaltesLatestMonth();renderEsmaltes();}});
  $('#summary-esmaltes').addEventListener('change',event=>{if(event.target.matches('[data-esmalte-month]')){selectedEsmaltesMonth=event.target.value||esmaltesLatestMonth();renderEsmaltes();}});
  $('#summary-open-task-review').onclick=()=>{setSection('tasks');setTaskView('review');window.scrollTo({top:0,behavior:'smooth'});};
  $('#summary-content').addEventListener('click',event=>{const button=event.target.closest('[data-summary-date][data-summary-section]');if(!button)return;setSelectedDate(button.dataset.summaryDate);setSection(button.dataset.summarySection==='tasks'?'tasks':'routines');if(button.dataset.summarySection==='tasks')setTaskView('day');else setView('day');});
  $('#weekly-prev').onclick=()=>shiftWeek(-1);$('#weekly-next').onclick=()=>shiftWeek(1);
  $('#weekly-today').onclick=()=>{selectedWeekDate=isoToday();renderWeekly();};
  $('#weekly-date').onchange=e=>{if(e.target.value){selectedWeekDate=e.target.value;renderWeekly();}};
  $$('.weekly-tab').forEach(button=>button.onclick=()=>{selectedWeeklyView=button.dataset.weeklyView==='groups'?'groups':'days';renderWeekly();});
  $('#weekly-groups').addEventListener('click',event=>{
    const task=event.target.closest('[data-open-task]');if(task){openTaskFocus(task.dataset.openTask,task.dataset.taskDate);return;}
    const action=event.target.closest('[data-open-action]');if(action){openActionDialog(action.dataset.openAction);return;}
    const study=event.target.closest('[data-open-study]');if(study){openActionDialog(study.dataset.openStudy,'',true);return;}
    const leisure=event.target.closest('[data-open-leisure]');if(leisure){openActionDialog(leisure.dataset.openLeisure,'',false,true);return;}
    const occurrence=event.target.closest('[data-open-occurrence]');if(occurrence)openOccurrenceFocusFromElement(occurrence);
  });
  const shiftMonthlyMonth=amount=>{const [year,month]=selectedMonthlyMonth.split('-').map(Number),date=new Date(year,month-1+amount,1);selectedMonthlyMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;renderMonthly();};
  $('#monthly-prev').onclick=()=>shiftMonthlyMonth(-1);$('#monthly-next').onclick=()=>shiftMonthlyMonth(1);
  $('#monthly-today').onclick=()=>{selectedMonthlyMonth=isoToday().slice(0,7);renderMonthly();};
  $('#monthly-date').onchange=event=>{if(event.target.value){selectedMonthlyMonth=event.target.value;renderMonthly();}};
  $$('.monthly-tab').forEach(button=>button.onclick=()=>{selectedMonthlyView=button.dataset.monthlyView==='groups'?'groups':'weeks';renderMonthly();});
  $('#monthly-groups').addEventListener('click',event=>{
    const task=event.target.closest('[data-open-task]');if(task){openTaskFocus(task.dataset.openTask,task.dataset.taskDate);return;}
    const action=event.target.closest('[data-open-action]');if(action){openActionDialog(action.dataset.openAction);return;}
    const study=event.target.closest('[data-open-study]');if(study){openActionDialog(study.dataset.openStudy,'',true);return;}
    const leisure=event.target.closest('[data-open-leisure]');if(leisure){openActionDialog(leisure.dataset.openLeisure,'',false,true);return;}
    const occurrence=event.target.closest('[data-open-occurrence]');if(occurrence)openOccurrenceFocusFromElement(occurrence);
  });
  $$('.registries-tab').forEach(button=>button.onclick=()=>{const view=button.dataset.registriesView;selectedRegistriesView=['trackers','items','linked'].includes(view)?view:'trackers';renderRegistries();});
  $$('.add-record-type-button').forEach(button=>button.onclick=()=>openRecordTypeDialog());
  $('#record-type-filters').addEventListener('click',event=>{const button=event.target.closest('[data-record-category]');if(!button)return;selectedRecordTypeCategory=button.dataset.recordCategory||'';renderRecordTypes();});
  $('#record-directory-search').addEventListener('input',event=>{recordDirectorySearch=event.target.value;renderRecordDirectory();});
  $('#record-type-search').addEventListener('input',event=>{recordTypeSearch=event.target.value;renderRecordTypes();});
  $('#record-linked-search').addEventListener('input',event=>{recordLinkedSearch=event.target.value;renderRecordLinked();});
  $$('.record-type-view-button').forEach(button=>button.onclick=()=>{selectedRecordTypeView=button.dataset.recordTypeView==='table'?'table':'cards';renderRecordTypes();});
  $('#record-type-kind').onchange=()=>updateRecordTypeKindUI();
  $('#record-type-form').addEventListener('submit',saveRecordType);
  $('#close-record-type').onclick=$('#cancel-record-type').onclick=()=>$('#record-type-dialog').close();
  $('#delete-record-type').onclick=deleteRecordType;
  for(const selector of ['#record-type-list','#record-type-table'])$(selector).addEventListener('click',event=>{
    const sort=event.target.closest('[data-sort-record]');if(sort){const key=sort.dataset.sortRecord;recordTypeSort=recordTypeSort.key===key?{key,dir:recordTypeSort.dir==='asc'?'desc':'asc'}:{key,dir:['done','last'].includes(key)?'desc':'asc'};renderRecordTypes();return;}
    const edit=event.target.closest('[data-edit-record-type]');if(edit){openRecordTypeDialog(edit.dataset.editRecordType);return;}
    const task=event.target.closest('[data-record-task]');if(task){openTaskFocus(task.dataset.recordTask,task.dataset.recordDate);return;}
    const routine=event.target.closest('[data-record-routine]');if(routine){openFocusRoutine(routine.dataset.recordRoutine,routine.dataset.recordDate);if(!$('#routine-focus-dialog').open)toast('Não há registro desta rotina nesse dia.');return;}
  });
  const openLinkedEdit=event=>{
    const task=event.target.closest('[data-edit-linked-task]');if(task){openTaskDialog(task.dataset.editLinkedTask);return true;}
    const routine=event.target.closest('[data-edit-linked-routine]');if(routine){openRoutineDialog(routine.dataset.editLinkedRoutine);return true;}
    return false;
  };
  $('#record-linked-list').addEventListener('click',event=>{
    if(openLinkedEdit(event))return;
    const task=event.target.closest('[data-record-task]');if(task){openTaskFocus(task.dataset.recordTask,task.dataset.recordDate);return;}
    const routine=event.target.closest('[data-record-routine]');if(routine){openFocusRoutine(routine.dataset.recordRoutine,routine.dataset.recordDate);if(!$('#routine-focus-dialog').open)toast('Não há registro desta rotina nesse dia.');return;}
  });
  $$('.record-linked-view-button').forEach(button=>button.onclick=()=>{selectedRecordLinkedView=button.dataset.recordLinkedView==='table'?'table':'cards';renderRecordLinked();});
  $('#record-linked-table').addEventListener('click',event=>{
    if(openLinkedEdit(event))return;
    const sort=event.target.closest('[data-sort-linked]');if(!sort)return;
    const key=sort.dataset.sortLinked;
    recordLinkedSort=recordLinkedSort.key===key?{key,dir:recordLinkedSort.dir==='asc'?'desc':'asc'}:{key,dir:['done','last'].includes(key)?'desc':'asc'};
    renderRecordLinked();
  });
  $('#task-week-prev').onclick=()=>shiftTaskWeek(-1);$('#task-week-next').onclick=()=>shiftTaskWeek(1);
  $('#task-week-today').onclick=()=>{selectedTaskWeekDate=isoToday();renderTaskWeekly();};
  $('#task-week-date').onchange=e=>{if(e.target.value){selectedTaskWeekDate=e.target.value;renderTaskWeekly();}};
  const syncTaskFilters=(source,renderSource=true)=>{const calendar=source==='calendar',frequency=$(calendar?'#task-calendar-filter-frequency':'#task-filter-frequency').value,kind=$(calendar?'#task-calendar-filter-kind':'#task-filter-kind').value;$(calendar?'#task-filter-frequency':'#task-calendar-filter-frequency').value=frequency;$(calendar?'#task-filter-kind':'#task-calendar-filter-kind').value=kind;if(renderSource)renderTasks();renderTaskCalendar();};
  $('#task-manage-filters').addEventListener('change',()=>syncTaskFilters('manage'));
  $('#task-calendar-filters').addEventListener('change',()=>syncTaskFilters('calendar'));
  $('#task-review-filters').addEventListener('change',renderTaskReview);$('#task-review-filters').addEventListener('input',event=>{if(event.target.id==='task-review-search')renderTaskReview();});
  $('#task-review-clear').onclick=()=>{$('#task-review-search').value='';$('#task-review-frequency').value='';$('#task-review-status').value='open';$('#task-review-period').value='90';renderTaskReview();};
  $('#task-review-list').addEventListener('click',event=>{const action=event.target.closest('[data-review-action]'),card=event.target.closest('[data-review-date][data-review-task]');if(action&&card)reviewTaskOccurrence(card.dataset.reviewDate,card.dataset.reviewTask,action.dataset.reviewAction);});
  const clearTaskFilters=()=>{$('#task-filter-frequency').value='';$('#task-filter-kind').value='';$('#task-filter-area').value='';$('#task-calendar-filter-frequency').value='';$('#task-calendar-filter-kind').value='';renderTasks();renderTaskCalendar();};
  $('#task-clear-filters').onclick=$('#task-calendar-clear-filters').onclick=clearTaskFilters;
  $('#task-manage-areas').onclick=()=>{$('#task-dialog').close();selectedSettingsView='areas';setSection('settings');$('#settings-workspace .area-settings-panel')?.scrollIntoView({behavior:'smooth',block:'start'});};
  const renderTaskMonthViews=()=>{renderTaskMonthly();renderTaskCalendar();};
  const shiftTaskMonth=amount=>{const [year,month]=selectedTaskMonth.split('-').map(Number),date=new Date(year,month-1+amount,1);selectedTaskMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;renderTaskMonthViews();};
  $('#task-month-prev').onclick=$('#task-calendar-prev').onclick=()=>shiftTaskMonth(-1);$('#task-month-next').onclick=$('#task-calendar-next').onclick=()=>shiftTaskMonth(1);
  $('#task-month-today').onclick=$('#task-calendar-today').onclick=()=>{selectedTaskMonth=isoToday().slice(0,7);renderTaskMonthViews();};
  $('#task-month-date').onchange=$('#task-calendar-date').onchange=event=>{if(event.target.value){selectedTaskMonth=event.target.value;renderTaskMonthViews();}};
  $('#task-annual-prev').onclick=()=>{selectedTaskYear--;renderTaskAnnual();};$('#task-annual-next').onclick=()=>{selectedTaskYear++;renderTaskAnnual();};$('#task-annual-today').onclick=()=>{selectedTaskYear=Number(isoToday().slice(0,4));renderTaskAnnual();};$('#task-annual-year').onchange=event=>{const year=Number(event.target.value);if(year>=2000&&year<=2100){selectedTaskYear=year;renderTaskAnnual();}};
  const shiftActionWeek=amount=>{const date=safeDate(selectedActionWeekDate);date.setDate(date.getDate()+amount*7);selectedActionWeekDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;renderActions();};
  $('#action-week-prev').onclick=()=>shiftActionWeek(-1);$('#action-week-next').onclick=()=>shiftActionWeek(1);
  $('#action-week-today').onclick=()=>{selectedActionWeekDate=isoToday();renderActions();};
  $('#action-week-date').onchange=e=>{if(e.target.value){selectedActionWeekDate=e.target.value;renderActions();}};
  $$('.action-tab').forEach(button=>button.onclick=()=>{actionView=button.dataset.actionView;renderActions();});
  $('#action-toggle-completed').onclick=()=>{hideCompletedActions=!hideCompletedActions;renderActions();};
  $('#action-list-filters').addEventListener('input',renderActions);
  $('#action-list-filters').addEventListener('change',renderActions);
  $('#action-clear-filters').onclick=()=>{
    $('#action-filter-search').value='';
    $('#action-filter-month').value='';
    $('#action-filter-due-from').value='';
    $('#action-filter-due-to').value='';
    $$('#action-list-filters [data-multi-select]').forEach(clearMultiSelect);
    renderActions();
  };
  const shiftActionPeriod=amount=>{const [year,month]=selectedActionMonth.split('-').map(Number),next=new Date(year,month-1+(actionView==='annual'?amount*12:amount),1);selectedActionMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;renderActions();};
  $('#action-prev-month').onclick=()=>shiftActionPeriod(-1);$('#action-next-month').onclick=()=>shiftActionPeriod(1);
  $('#action-current-month').onclick=()=>{selectedActionMonth=isoToday().slice(0,7);renderActions();};
  $('#action-month').onchange=event=>{if(event.target.value){selectedActionMonth=event.target.value;renderActions();}};
  recurringView=projects=>{const statusLabel={realized:'Realizada',partial:'Realizada parcial','not-realized':'Não realizada',skipped:'Ignorada',scheduled:'Programada'},rows=[];for(const project of projects){for(const task of (project.tasks||[]).filter(item=>!item.deleted&&item.recurring)){const occurrences=Array.isArray(task.occurrences)?task.occurrences:[];if(!occurrences.length)rows.push(`<tr class="recurring-summary-row"><td><strong>${escapeHTML(task.title||'Atividade')}</strong><small>${escapeHTML(task.code||'')}</small></td><td>${escapeHTML(project.title||'')}</td><td>—</td><td>Sem ocorrências</td><td>${progressLabel(taskProgress(task))}</td><td><button type="button" class="primary-button compact-button" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Registrar</button></td></tr>`);else for(const item of [...occurrences].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))))rows.push(`<tr><td><strong>${escapeHTML(task.title||'Atividade')}</strong><small>${escapeHTML(task.code||'')}</small></td><td>${escapeHTML(project.title||'')}</td><td>${escapeHTML(item.date||'—')}</td><td>${escapeHTML(statusLabel[item.result]||item.result||'Programada')}</td><td>${progressLabel(projectValue(item.progress))}</td><td><button type="button" class="primary-button compact-button" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Registrar</button></td></tr>`);}}return `<div class="action-list-scroll recurring-history-wrap"><table class="action-list-table recurring-history-table"><thead><tr><th>Atividade</th><th>Projeto</th><th>Data</th><th>Status</th><th>Progresso</th><th></th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="6" class="action-list-empty">Nenhuma tarefa recorrente corresponde aos filtros.</td></tr>'}</tbody></table></div>`;};
  recurringView=()=>{const area=$('#project-filter-area').value,status=$('#project-filter-status').value,type=$('#project-filter-type').value,recurrence=$('#project-filter-recurring').value,year=$('#project-filter-year').value,progressFilter=$('#project-filter-progress').value,sort=$('#project-sort').value,search=$('#project-filter-search').value.trim().toLocaleLowerCase('pt-BR'),statusLabel={realized:'Realizada',partial:'Realizada parcial','not-realized':'Não realizada',skipped:'Ignorada',scheduled:'Programada'};let entries=projectList().flatMap(project=>(project.tasks||[]).filter(task=>!task.deleted&&task.recurring&&!taskIsHabit(task)).map(task=>({project,task}))).filter(({project,task})=>{const dates=[task.startDate,task.endDate,...(task.occurrences||[]).map(item=>item.date)];return recurrence!=='no'&&(!area||project.areaId===area)&&(!status||(task.status||'Em andamento')===status)&&(!type||projectTaskTypeMatches(task.type,type))&&(!year||dates.some(date=>String(date||'').startsWith(String(year))))&&projectMatchesProgress(taskProgress(task),progressFilter)&&(!search||[project.code,project.title,projectAreaName(project),task.code,task.title,task.notes].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(search)));});entries.sort((a,b)=>sort==='title'?a.task.title.localeCompare(b.task.title,'pt-BR'):sort==='progress-desc'?(taskProgress(b.task)??-1)-(taskProgress(a.task)??-1):sort==='progress-asc'?(taskProgress(a.task)??101)-(taskProgress(b.task)??101):sort==='updated'?(b.task.updatedAt||'').localeCompare(a.task.updatedAt||''):String(a.task.code||'').localeCompare(String(b.task.code||''),'pt-BR',{numeric:true}));const rows=[];for(const{project,task}of entries){const occurrences=Array.isArray(task.occurrences)?[...task.occurrences].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))):[],actions=`<div class="recurring-history-actions"><button type="button" class="primary-button compact-button" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Registrar</button><button type="button" class="small-edit" data-edit-project-task="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Editar</button></div>`;if(!occurrences.length)rows.push(`<tr class="recurring-summary-row"><td><strong>${escapeHTML(task.title||'Atividade')}</strong><small>${escapeHTML(task.code||'')}</small></td><td>${escapeHTML(project.title||'')}</td><td>—</td><td>Sem ocorrências</td><td>${progressLabel(taskProgress(task))}</td><td>${actions}</td></tr>`);else occurrences.forEach(item=>rows.push(`<tr><td><strong>${escapeHTML(task.title||'Atividade')}</strong><small>${escapeHTML(task.code||'')}</small></td><td>${escapeHTML(project.title||'')}</td><td>${escapeHTML(item.date||'—')}</td><td>${escapeHTML(statusLabel[item.result]||item.result||'Programada')}</td><td>${progressLabel(projectValue(item.progress))}</td><td>${actions}</td></tr>`));}return `<div class="action-list-scroll recurring-history-wrap"><table class="action-list-table recurring-history-table"><thead><tr><th>Atividade</th><th>Projeto</th><th>Data</th><th>Status</th><th>Progresso</th><th></th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="6" class="action-list-empty">Nenhuma tarefa recorrente corresponde aos filtros.</td></tr>'}</tbody></table></div>`;};
  recurringView=()=>{const area=$('#project-filter-area').value,status=$('#project-filter-status').value,type=$('#project-filter-type').value,recurrence=$('#project-filter-recurring').value,year=$('#project-filter-year').value,progressFilter=$('#project-filter-progress').value,sort=$('#project-sort').value,search=$('#project-filter-search').value.trim().toLocaleLowerCase('pt-BR'),statusLabel={realized:'Realizada',partial:'Realizada parcial','not-realized':'Não realizada',skipped:'Ignorada',scheduled:'Programada'};let entries=projectList().flatMap(project=>(project.tasks||[]).filter(task=>!task.deleted&&task.recurring&&!taskIsHabit(task)).map(task=>({project,task}))).filter(({project,task})=>{const dates=[task.startDate,task.endDate,...(task.occurrences||[]).map(item=>item.date)];return recurrence!=='no'&&(!area||project.areaId===area)&&(!status||(task.status||'Em andamento')===status)&&(!type||projectTaskTypeMatches(task.type,type))&&(!year||dates.some(date=>String(date||'').startsWith(String(year))))&&projectMatchesProgress(taskProgress(task),progressFilter)&&(!search||[project.code,project.title,projectAreaName(project),task.code,task.title,task.notes].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(search)));});entries.sort((a,b)=>sort==='title'?a.task.title.localeCompare(b.task.title,'pt-BR'):sort==='progress-desc'?(taskProgress(b.task)??-1)-(taskProgress(a.task)??-1):sort==='progress-asc'?(taskProgress(a.task)??101)-(taskProgress(b.task)??101):sort==='updated'?(b.task.updatedAt||'').localeCompare(a.task.updatedAt||''):String(a.task.code||'').localeCompare(String(b.task.code||''),'pt-BR',{numeric:true}));const rows=[];for(const{project,task}of entries){const occurrences=Array.isArray(task.occurrences)?[...task.occurrences].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))):[];rows.push(`<tr class="recurring-parent-row"><td><strong>${escapeHTML(task.title||'Atividade')}</strong><small>${escapeHTML(task.code||'')} · ${escapeHTML(projectFrequencyLabel(task.frequency))}</small></td><td>${escapeHTML(project.title||'')}</td><td>—</td><td>${escapeHTML(task.status||'Em andamento')}</td><td><strong>${progressLabel(taskProgress(task))}</strong></td><td><div class="recurring-history-actions"><button type="button" class="primary-button compact-button" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Registrar</button><button type="button" class="small-edit" data-edit-project-task="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Editar</button></div></td></tr>`);if(!occurrences.length)rows.push(`<tr class="recurring-occurrence-row is-empty"><td><span class="recurring-indent">↳</span> Nenhuma ocorrência registrada</td><td></td><td>—</td><td>Sem ocorrências</td><td>—</td><td></td></tr>`);else occurrences.forEach(item=>rows.push(`<tr class="recurring-occurrence-row"><td><span class="recurring-indent">↳</span> Ocorrência <small>${escapeHTML(task.title||'')}</small></td><td>${escapeHTML(project.title||'')}</td><td>${escapeHTML(item.date||'—')}</td><td>${escapeHTML(statusLabel[item.result]||item.result||'Programada')}</td><td>${progressLabel(projectValue(item.progress))}</td><td><button type="button" class="recurring-delete-button" data-delete-project-occurrence="${escapeHTML(item.id)}" data-project-id="${escapeHTML(project.id)}" data-task-id="${escapeHTML(task.id)}">Excluir</button></td></tr>`));}return `<div class="action-list-scroll recurring-history-wrap"><table class="action-list-table recurring-history-table"><thead><tr><th>Atividade / Ocorrência</th><th>Projeto</th><th>Data</th><th>Status</th><th>Progresso</th><th></th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="6" class="action-list-empty">Nenhuma tarefa recorrente corresponde aos filtros.</td></tr>'}</tbody></table></div>`;};
  function projectRecurringEntries(){const area=$('#project-filter-area').value,status=$('#project-filter-status').value,type=$('#project-filter-type').value,recurrence=$('#project-filter-recurring').value,year=$('#project-filter-year').value,progressFilter=$('#project-filter-progress').value,sort=$('#project-sort').value,search=$('#project-filter-search').value.trim().toLocaleLowerCase('pt-BR');let entries=projectList().flatMap(project=>(project.tasks||[]).filter(task=>!task.deleted&&task.recurring&&!taskIsHabit(task)).map(task=>({project,task}))).filter(({project,task})=>{const dates=[task.startDate,task.endDate,...(task.occurrences||[]).map(item=>item.date)];return recurrence!=='no'&&(!area||project.areaId===area)&&(!status||(task.status||'Em andamento')===status)&&(!type||projectTaskTypeMatches(task.type,type))&&(!year||dates.some(date=>String(date||'').startsWith(String(year))))&&projectMatchesProgress(taskProgress(task),progressFilter)&&(!search||[project.code,project.title,projectAreaName(project),task.code,task.title,task.notes].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(search)));});return entries.sort((a,b)=>sort==='title'?a.task.title.localeCompare(b.task.title,'pt-BR'):sort==='progress-desc'?(taskProgress(b.task)??-1)-(taskProgress(a.task)??-1):sort==='progress-asc'?(taskProgress(a.task)??101)-(taskProgress(b.task)??101):sort==='updated'?(b.task.updatedAt||'').localeCompare(a.task.updatedAt||''):String(a.task.code||'').localeCompare(String(b.task.code||''),'pt-BR',{numeric:true}));}
  function recurringNextOccurrence(task){const date=recurrenceNextDate(task);return date?{ id:`next-${task.id}-${date}`,date,result:'scheduled',progress:null,virtual:true}:null;}
  function projectCalendarView(){const month=isoToday().slice(0,7),[year,monthNumber]=month.split('-').map(Number),first=new Date(year,monthNumber-1,1),days=new Date(year,monthNumber,0).getDate(),leading=(first.getDay()+6)%7,entries=projectRecurringEntries(),byDate=new Map();for(const{project,task}of entries){const items=[...(task.occurrences||[])];const next=recurringNextOccurrence(task);if(!items.some(item=>item.date===next.date))items.push(next);for(const item of items){if(!item.date.startsWith(month))continue;if(!byDate.has(item.date))byDate.set(item.date,[]);byDate.get(item.date).push({project,task,item});}}const cells=[];for(let index=0;index<leading;index++)cells.push('<div class="project-calendar-day is-empty"></div>');for(let day=1;day<=days;day++){const date=`${year}-${String(monthNumber).padStart(2,'0')}-${String(day).padStart(2,'0')}`,items=byDate.get(date)||[];cells.push(`<div class="project-calendar-day"><strong>${day}</strong>${items.map(({project,task,item})=>`<button type="button" class="project-calendar-item is-${escapeHTML(item.result||'scheduled')}" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" data-project-occurrence-date="${item.date}" title="${escapeHTML(project.title)}">${escapeHTML(task.title)}</button>`).join('')}</div>`);}return `<div class="project-calendar-heading"><h3>${escapeHTML(fmtDate(`${month}-01`,{month:'long',year:'numeric'}))}</h3><span>${entries.length} tarefas recorrentes</span></div><div class="project-calendar-grid"><div class="project-calendar-weekday">Seg</div><div class="project-calendar-weekday">Ter</div><div class="project-calendar-weekday">Qua</div><div class="project-calendar-weekday">Qui</div><div class="project-calendar-weekday">Sex</div><div class="project-calendar-weekday">Sáb</div><div class="project-calendar-weekday">Dom</div>${cells.join('')}</div>`;}
  recurringView=()=>{const entries=projectRecurringEntries(),statusLabel={realized:'Realizada',partial:'Realizada parcial','not-realized':'Não realizada',skipped:'Ignorada',scheduled:'Pendente'},rows=[];for(const{project,task}of entries){const occurrences=Array.isArray(task.occurrences)?[...task.occurrences].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))):[],next=recurringNextOccurrence(task);if(!occurrences.some(item=>item.date===next.date))occurrences.push(next);rows.push(`<tr class="recurring-parent-row"><td><strong>${escapeHTML(task.title||'Atividade')}</strong><small>${escapeHTML(task.code||'')} · ${escapeHTML(projectFrequencyLabel(task.frequency))}</small></td><td>${escapeHTML(project.title||'')}</td><td>—</td><td>${escapeHTML(task.status||'Em andamento')}</td><td><strong>${progressLabel(taskProgress(task))}</strong></td><td><div class="recurring-history-actions"><button type="button" class="primary-button compact-button" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" data-project-occurrence-date="${escapeHTML(next.date)}">Registrar</button><button type="button" class="small-edit" data-edit-project-task="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Editar</button></div></td></tr>`);occurrences.forEach(item=>rows.push(`<tr class="recurring-occurrence-row${item.virtual?' is-pending':''}"><td><span class="recurring-indent">↳</span> Ocorrência <small>${escapeHTML(task.title||'')}</small></td><td>${escapeHTML(project.title||'')}</td><td>${escapeHTML(item.date||'—')}</td><td>${escapeHTML(statusLabel[item.result]||item.result||'Programada')}</td><td>${progressLabel(projectValue(item.progress))}</td><td>${item.virtual?'<span class="recurring-pending-label">Pendente</span>':`<button type="button" class="recurring-delete-button" data-delete-project-occurrence="${escapeHTML(item.id)}" data-project-id="${escapeHTML(project.id)}" data-task-id="${escapeHTML(task.id)}">Excluir</button>`}</td></tr>`));}return `<div class="action-list-scroll recurring-history-wrap"><table class="action-list-table recurring-history-table"><thead><tr><th>Atividade / Ocorrência</th><th>Projeto</th><th>Data</th><th>Status</th><th>Progresso</th><th></th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="6" class="action-list-empty">Nenhuma tarefa recorrente corresponde aos filtros.</td></tr>'}</tbody></table></div>`;};
  let projectRecurrenceFilterSaved='';
  function setProjectView(view){
    const recurrence=$('#project-filter-recurring'),previous=projectView,wasSpecial=previous==='recurring'||previous==='calendar',isSpecial=view==='recurring'||view==='calendar';
    if(isSpecial&&!wasSpecial)projectRecurrenceFilterSaved=recurrence.value;
    projectView=view;
    recurrence.disabled=isSpecial;
    if(isSpecial)recurrence.value='yes';
    else if(wasSpecial)recurrence.value=projectRecurrenceFilterSaved;
    $$('.project-tab').forEach(button=>button.classList.toggle('active',button.dataset.projectView===view));
    updateProjectMonthControls();
    if(view==='calendar')$('#projects-content').innerHTML=projectCalendarView();
    else renderProjects();
  }
  document.addEventListener('click',event=>{const button=event.target.closest('.project-tab');if(!button)return;event.preventDefault();setProjectView(button.dataset.projectView);});
  document.addEventListener('click',event=>{const shift=event.target.closest('[data-project-calendar-shift]');if(shift){const date=safeDate(`${selectedProjectCalendarMonth}-01`);date.setMonth(date.getMonth()+Number(shift.dataset.projectCalendarShift));selectedProjectCalendarMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;if(projectView==='calendar')$('#projects-content').innerHTML=projectCalendarView();return;}if(event.target.closest('[data-project-calendar-today]')){selectedProjectCalendarMonth=isoToday().slice(0,7);if(projectView==='calendar')$('#projects-content').innerHTML=projectCalendarView();}});
  recurringView=()=>{const entries=projectRecurringEntries(),labels={realized:'Realizada',partial:'Realizada parcial','not-realized':'Não realizada',skipped:'Ignorada',scheduled:'Pendente'},rows=[];for(const{project,task}of entries){const occurrences=(task.occurrences||[]).filter(item=>item.date).map(item=>({...item,virtual:false})),covered=new Set(occurrences.map(item=>item.expectedDate||item.date)),next=task.status==='Concluída'?null:recurringNextOccurrence(task),items=[...occurrences,...(next&&!covered.has(next.date)?[next]:[])];items.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));rows.push(`<tr class="recurring-parent-row"><td><strong>${escapeHTML(task.title||'Atividade')}</strong><small>${escapeHTML(task.code||'')} · ${escapeHTML(projectFrequencyLabel(task.frequency))}</small></td><td>${escapeHTML(project.title||'')}</td><td>—</td><td>${escapeHTML(task.status||'Em andamento')}</td><td><strong>${progressLabel(taskProgress(task))}</strong></td><td><button type="button" class="small-edit" data-edit-project-task="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}">Editar</button></td></tr>`);const weights=new Map((task.occurrences||[]).filter(item=>item.result!=='skipped'&&item.result!=='scheduled'&&item.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))).map((item,index)=>[item.id||item.date,index<3?3:index<6?2:1]));items.forEach(item=>{const weight=item.virtual?null:weights.get(item.id||item.date)??null,counted=weight!==null&&projectValue(item.progress)!==null,weightClass=counted?`is-weight-${weight}`:'is-off',weightLabel=item.virtual?'':counted?`peso ${weight}`:(item.result==='scheduled'?'—':'fora'),weightMarkup=item.virtual?'':`<span class="project-occurrence-weight ${weightClass}" title="${counted?'Peso no cálculo do progresso':'Não entra no cálculo do progresso'}">${weightLabel}</span>`;rows.push(`<tr class="recurring-occurrence-row${item.virtual?' is-pending':''}"><td><span class="recurring-indent">↳</span> Ocorrência</td><td>${escapeHTML(project.title||'')}</td><td>${escapeHTML(item.date||'—')}</td><td>${escapeHTML(labels[item.result]||item.result||'Programada')}</td><td><span class="project-occurrence-progress">${progressLabel(projectValue(item.progress))}${weightMarkup}</span></td><td>${item.virtual?`<button type="button" class="primary-button compact-button" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" data-project-occurrence-date="${escapeHTML(item.date||'')}">Registrar</button>`:`<button type="button" class="recurring-delete-button" data-delete-project-occurrence="${escapeHTML(item.id)}" data-project-id="${escapeHTML(project.id)}" data-task-id="${escapeHTML(task.id)}">Excluir</button>`}</td></tr>`);});}return `<div class="action-list-scroll recurring-history-wrap"><table class="action-list-table recurring-history-table"><thead><tr><th>Atividade / Ocorrência</th><th>Projeto</th><th>Data</th><th>Status</th><th>Progresso</th><th></th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="6" class="action-list-empty">Nenhuma ocorrência encontrada.</td></tr>'}</tbody></table></div>`;};
  projectCalendarView=()=>{const month=selectedProjectCalendarMonth,[year,monthNumber]=month.split('-').map(Number),first=new Date(year,monthNumber-1,1),days=new Date(year,monthNumber,0).getDate(),leading=(first.getDay()+6)%7,entries=projectRecurringEntries(),byDate=new Map();for(const{project,task}of entries){const occurrences=(task.occurrences||[]).filter(item=>item.date).map(item=>({...item,virtual:false})),covered=new Set(occurrences.map(item=>item.expectedDate||item.date)),expected=task.status==='Concluída'?[]:projectTaskScheduleDates(task,`${month}-01`,`${month}-${String(days).padStart(2,'0')}`),items=[...occurrences,...expected.filter(date=>!covered.has(date)).map(date=>({id:`next-${task.id}-${date}`,date,result:'scheduled',progress:null,virtual:true}))];for(const item of items){if(!String(item.date||'').startsWith(month))continue;if(!byDate.has(item.date))byDate.set(item.date,[]);byDate.get(item.date).push({project,task,item});}}const cells=[];for(let index=0;index<leading;index++)cells.push('<div class="project-calendar-day is-empty"></div>');for(let day=1;day<=days;day++){const date=`${year}-${String(monthNumber).padStart(2,'0')}-${String(day).padStart(2,'0')}`,items=byDate.get(date)||[];cells.push(`<div class="project-calendar-day"><strong>${day}</strong>${items.map(({project,task,item})=>`<button type="button" class="project-calendar-item is-${escapeHTML(item.result||'scheduled')}" data-project-occurrence="${escapeHTML(task.id)}" data-project-id="${escapeHTML(project.id)}" data-project-occurrence-date="${item.date}" ${item.virtual?'':`data-project-occurrence-edit="${escapeHTML(item.id)}" data-project-task-id="${escapeHTML(task.id)}"`}>${escapeHTML(task.title)}</button>`).join('')}</div>`);}return `<div class="project-calendar-heading"><div class="project-calendar-navigation"><button type="button" class="secondary-button compact-button" data-project-calendar-shift="-1">‹</button><h3>${escapeHTML(fmtDate(`${month}-01`,{month:'long',year:'numeric'}))}</h3><button type="button" class="secondary-button compact-button" data-project-calendar-shift="1">›</button><button type="button" class="text-button" data-project-calendar-today>Hoje</button></div><span>${entries.length} tarefas recorrentes</span></div><div class="project-calendar-grid"><div class="project-calendar-weekday">Seg</div><div class="project-calendar-weekday">Ter</div><div class="project-calendar-weekday">Qua</div><div class="project-calendar-weekday">Qui</div><div class="project-calendar-weekday">Sex</div><div class="project-calendar-weekday">Sáb</div><div class="project-calendar-weekday">Dom</div>${cells.join('')}</div>`;};
  for(const selector of ['#project-filter-area','#project-filter-status','#project-filter-type','#project-filter-recurring','#project-filter-year','#project-filter-progress','#project-sort'])$(selector).addEventListener('change',renderProjects);
  for(const selector of ['#project-filter-area','#project-filter-status','#project-filter-type','#project-filter-recurring','#project-filter-year','#project-filter-progress','#project-sort'])$(selector).addEventListener('change',()=>{if(projectView==='calendar')$('#projects-content').innerHTML=projectCalendarView();});
  $('#project-filter-search').addEventListener('input',renderProjects);
  $('#project-filter-search').addEventListener('input',()=>{if(projectView==='calendar')$('#projects-content').innerHTML=projectCalendarView();});
  $('#project-clear-filters').onclick=()=>{$$('#projects-workspace .project-toolbar input').forEach(input=>input.value='');$$('#projects-workspace .project-toolbar select').forEach(select=>select.selectedIndex=0);if(projectView==='recurring'||projectView==='calendar')$('#project-filter-recurring').value='yes';if(projectView==='calendar')$('#projects-content').innerHTML=projectCalendarView();else renderProjects();};
  $('#project-snapshot').onclick=closeProjectMonth;$('#project-reopen-history').onclick=reopenProjectMonthHistory;
  $('#add-project').onclick=()=>openProjectDialog();$('#project-form').addEventListener('submit',saveProject);$('#delete-project').onclick=deleteProject;
  $('#project-form').addEventListener('submit',()=>setTimeout(()=>{const id=$('#project-id').value,project=projectList().find(item=>item.id===id);if(project){project.progress=projectValue($('#project-progress').value);project.updatedAt=stamp();saveLocal();renderProjects();}},0));
  $('#project-form').addEventListener('submit',()=>setTimeout(()=>{const project=projectList().find(item=>item.id===$('#project-id').value);if(project){project.history=readHistoryEditor('#project-history-editor');applyStatusHistoryEditor('#project-history-editor',project);project.updatedAt=stamp();saveLocal();renderProjects();}},0));
  $('#projects-content').addEventListener('click',event=>{const edit=event.target.closest('[data-edit-project]');if(edit)setTimeout(()=>{const project=projectList().find(item=>item.id===edit.dataset.editProject);$('#project-progress').value=project?.progress??'';updateProjectProgressMode();},0);});
  $('#project-task-form').addEventListener('submit',()=>setTimeout(()=>{const taskId=$('#project-task-id').value,owner=projectList().flatMap(project=>project.tasks).find(task=>task.id===taskId);if(owner){owner.history=readHistoryEditor('#project-task-history-editor');applyStatusHistoryEditor('#project-task-history-editor',owner);owner.updatedAt=stamp();saveLocal();renderProjects();}},0));
  $('#project-task-form').addEventListener('submit',saveProjectTask);$('#delete-project-task').onclick=deleteProjectTask;$('#project-task-recurring').onchange=updateProjectTaskRecurrence;$('#project-task-type').onchange=()=>{const habit=taskTypeIsHabit($('#project-task-type').value);if(habit){$('#project-task-recurring').value='yes';if($('#project-task-frequency').value==='monthly')$('#project-task-frequency').value='daily';}$('#project-task-dialog-title').textContent=$('#project-task-id').value?(habit?'Editar hábito':'Editar atividade'):(habit?'Novo hábito':'Nova atividade');updateProjectTaskRecurrence();};
  $('#project-progress').addEventListener('input',updateProjectProgressMode);
  $('#project-form').addEventListener('reset',()=>setTimeout(updateProjectProgressMode,0));
  $('#project-task-progress').addEventListener('input',updateProjectTaskProgressMode);
  $('#project-occurrence-form').addEventListener('submit',saveProjectOccurrence);$('#project-occurrence-result').onchange=event=>{const values={realized:100,partial:50,'not-realized':0};if(event.target.value in values)$('#project-occurrence-progress').value=values[event.target.value];$('#project-occurrence-progress').disabled=event.target.value==='skipped';};
  $('#projects-content').addEventListener('click',event=>{const open=event.target.closest('[data-open-project]');if(open){openProjectFocus(open.dataset.openProject);return;}const occurrenceEdit=event.target.closest('[data-project-occurrence-edit]');if(occurrenceEdit){openProjectOccurrence(occurrenceEdit.dataset.projectId,occurrenceEdit.dataset.projectTaskId,occurrenceEdit.dataset.projectOccurrenceEdit);return;}const expand=event.target.closest('[data-toggle-project]');if(expand){const id=expand.dataset.toggleProject;if(openProjects.has(id))openProjects.delete(id);else openProjects.add(id);renderProjects();return;}const occurrence=event.target.closest('[data-project-occurrence]');if(occurrence){openProjectOccurrence(occurrence.dataset.projectId,occurrence.dataset.projectOccurrence);return;}const toggle=event.target.closest('[data-toggle-project-task]');if(toggle){toggleProjectTask(toggle.dataset.toggleProjectTask,toggle.dataset.projectId);return;}const move=event.target.closest('[data-move-project-task]');if(move){moveProjectTask(move.dataset.projectId,move.dataset.projectTaskId,move.dataset.moveProjectTask);return;}const editTask=event.target.closest('[data-edit-project-task]');if(editTask){openProjectTaskDialog(editTask.dataset.editProjectTask,editTask.dataset.projectId);return;}const addTask=event.target.closest('[data-add-project-task]');if(addTask){openProjectTaskDialog('',addTask.dataset.addProjectTask);return;}const edit=event.target.closest('[data-edit-project]');if(edit)openProjectDialog(edit.dataset.editProject);});
  $('#projects-content').addEventListener('change',event=>{const projectStatusInput=event.target.closest('[data-project-status-history]');if(projectStatusInput){const project=projectList().find(item=>item.id===projectStatusInput.dataset.projectStatusHistory);if(project){if(!project.statusHistory||typeof project.statusHistory!=='object'||Array.isArray(project.statusHistory))project.statusHistory={};project.statusHistory[projectStatusInput.dataset.historyPeriod]=projectStatusInput.value;project.updatedAt=stamp();saveLocal();refreshProjectCardStatus(project);}return;}const taskStatusInput=event.target.closest('[data-task-status-history]');if(taskStatusInput){const{project,task}=findProjectTask(taskStatusInput.dataset.projectId,taskStatusInput.dataset.taskStatusHistory);if(task){if(!task.statusHistory||typeof task.statusHistory!=='object'||Array.isArray(task.statusHistory))task.statusHistory={};task.statusHistory[taskStatusInput.dataset.historyPeriod]=taskStatusInput.value;task.updatedAt=stamp();project.updatedAt=stamp();saveLocal();refreshTaskStatusRow(project,task);}return;}const taskHistory=event.target.closest('[data-project-history-progress]');if(taskHistory){const{project,task}=findProjectTask(taskHistory.dataset.projectId,taskHistory.dataset.projectHistoryProgress);if(task){const period=taskHistory.dataset.historyPeriod,value=projectValue(taskHistory.value);if(value===null)delete task.history[period];else task.history[period]=value;task.updatedAt=stamp();project.updatedAt=stamp();saveLocal();renderProjects();}return;}const projectHistory=event.target.closest('[data-project-history]');if(projectHistory){const project=projectList().find(item=>item.id===projectHistory.dataset.projectHistory);if(project){const period=projectHistory.dataset.historyPeriod,value=projectValue(projectHistory.value);if(value===null)delete project.history[period];else project.history[period]=value;project.updatedAt=stamp();saveLocal();renderProjects();}return;}const progress=event.target.closest('[data-project-progress]');if(progress){const{project,task}=findProjectTask(progress.dataset.projectId,progress.dataset.projectProgress);if(task&&!task.recurring&&!taskIsHabit(task)){task.progress=projectValue(progress.value);task.updatedAt=stamp();project.updatedAt=stamp();saveLocal();renderProjects();}return;}if(event.target.matches('#project-history-project')){selectedProjectHistoryId=event.target.value;projectHistoryEditMode=false;renderProjects();}});
  $('#projects-content').addEventListener('click',event=>{const projectChart=event.target.closest('[data-project-chart]');if(projectChart){const project=projectList().find(item=>item.id===projectChart.dataset.projectChart);if(project)projectHistoryChart(project,`P${project.code||''} · ${project.title}`);return;}const taskChart=event.target.closest('[data-task-chart]');if(taskChart){const project=projectList().find(item=>item.id===taskChart.dataset.projectId),task=project?.tasks.find(item=>item.id===taskChart.dataset.taskChart);if(task)projectHistoryChart(task,`${task.code||''} · ${task.title}`);return;}if(event.target.closest('#project-history-edit')){projectHistoryEditMode=true;renderProjects();return;}if(event.target.closest('#project-history-cancel')){projectHistoryEditMode=false;renderProjects();return;}if(event.target.closest('#project-history-save'))saveProjectHistoryEdits();});
  $('#projects-content').addEventListener('click',event=>{const monthStatus=event.target.closest('[data-history-month-status]');if(monthStatus){openProjectMonthEditor(monthStatus.dataset.historyMonthStatus);return;}if(event.target.closest('#project-history-status'))openProjectMonthEditor();});
  $('#project-chart-content').addEventListener('change',event=>{if(event.target.matches('#project-month-status-period'))openProjectMonthEditor(event.target.value);});
  $('#project-chart-content').addEventListener('click',event=>{const save=event.target.closest('#project-month-status-save');if(save)saveProjectMonthEdits(save.dataset.statusPeriod);});
  $('#projects-content').addEventListener('click',event=>{if(event.target.closest('[data-add-project-task]')){setTimeout(()=>{$('#project-task-start').value='';$('#project-task-end').value='';},0);}});
  $('#projects-content').addEventListener('click',event=>{const button=event.target.closest('[data-delete-project-occurrence]');if(button)deleteProjectOccurrence(button.dataset.projectId,button.dataset.taskId,button.dataset.deleteProjectOccurrence);});
  $('#projects-content').addEventListener('click',event=>{const button=event.target.closest('[data-project-occurrence-date]');if(button)setTimeout(()=>{$('#project-occurrence-date').value=button.dataset.projectOccurrenceDate;},0);});
  $('#projects-content').addEventListener('click',event=>{if(event.target.closest('button,input,select,textarea,a,label'))return;const card=event.target.closest('.project-card[data-project-id]');if(card)openProjectFocus(card.dataset.projectId);});
  $('#project-focus-tasks').addEventListener('click',event=>{const occurrenceRegister=event.target.closest('[data-focus-project-occurrence]');if(occurrenceRegister){openProjectOccurrence(occurrenceRegister.dataset.projectId,occurrenceRegister.dataset.focusProjectOccurrence);return;}const occurrenceEdit=event.target.closest('[data-focus-project-occurrence-edit]');if(occurrenceEdit){openProjectOccurrence(occurrenceEdit.dataset.projectId,occurrenceEdit.dataset.taskId,occurrenceEdit.dataset.focusProjectOccurrenceEdit);return;}const expand=event.target.closest('[data-focus-project-task-expand]');if(expand){const id=expand.dataset.focusProjectTaskExpand;if(expandedProjectTasks.has(id))expandedProjectTasks.delete(id);else expandedProjectTasks.add(id);renderProjectFocus();return;}const toggle=event.target.closest('[data-focus-project-task-toggle]');if(toggle){toggleProjectTask(toggle.dataset.focusProjectTaskToggle,toggle.dataset.projectId);return;}const edit=event.target.closest('[data-focus-project-task-edit]');if(edit)openProjectTaskDialog(edit.dataset.focusProjectTaskEdit,edit.dataset.projectId);});
  $('#close-project-focus').onclick=()=>$('#project-focus-dialog').close();
  $('#project-focus-edit').onclick=()=>{const id=activeProjectId;$('#project-focus-dialog').close();openProjectDialog(id);};
  $('#project-focus-snapshot').onclick=closeProjectMonth;
  $('#project-focus-add-task').onclick=()=>{if(activeProjectId)openProjectTaskDialog('',activeProjectId);};
  $('#project-focus-dialog').addEventListener('click',event=>{const shift=event.target.closest('[data-focus-month-shift]');if(shift){const date=safeDate(`${selectedProjectMonth}-01`);date.setMonth(date.getMonth()+Number(shift.dataset.focusMonthShift));selectedProjectMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;projectMonthEditMode=false;renderProjects();return;}if(event.target.closest('[data-focus-month-today]')){selectedProjectMonth=isoToday().slice(0,7);projectMonthEditMode=false;renderProjects();}});
  $('#project-focus-dialog').addEventListener('change',event=>{if(event.target.matches('#project-focus-month')){selectedProjectMonth=event.target.value||isoToday().slice(0,7);projectMonthEditMode=false;renderProjects();}});
  $('#project-focus-chart').onclick=()=>{const project=projectList().find(item=>item.id===activeProjectId);if(project)projectHistoryChart(project,`P${project.code||''} · ${project.title}`);};
  $('#project-focus-dialog').addEventListener('close',()=>{saveProjectNotes(false);activeProjectId='';expandedProjectTasks.clear();projectOpenNoteMonths.clear();projectExtraNoteMonths.clear();});
  $('#project-focus-month-notes').addEventListener('toggle',event=>{const details=event.target.closest('details[data-project-note-month]');if(!details)return;if(details.open)projectOpenNoteMonths.add(details.dataset.projectNoteMonth);else projectOpenNoteMonths.delete(details.dataset.projectNoteMonth);},true);
  $('#project-focus-month-notes').addEventListener('input',event=>{const textarea=event.target.closest('[data-project-note-input]');if(!textarea)return;const project=projectList().find(item=>item.id===activeProjectId);if(!project)return;if(!project.monthNotes||typeof project.monthNotes!=='object'||Array.isArray(project.monthNotes))project.monthNotes={};const key=textarea.dataset.projectNoteInput,text=textarea.value.trim();if(text)project.monthNotes[key]=text;else delete project.monthNotes[key];project.updatedAt=stamp();const preview=$(`[data-project-note-preview="${key}"]`);if(preview)preview.textContent=projectNotePreview(text);clearTimeout(projectMonthNoteTimer);projectMonthNoteTimer=setTimeout(()=>saveLocal(),600);});
  $('#project-focus-month-notes').addEventListener('click',event=>{const button=event.target.closest('[data-project-note-save]');if(!button)return;saveProjectNotes(false);const project=projectList().find(item=>item.id===activeProjectId),key=button.dataset.projectNoteSave,preview=$(`[data-project-note-preview="${key}"]`);if(preview)preview.textContent=projectNotePreview(project?.monthNotes?.[key]);toast('Nota salva.');});
  $('#project-focus-add-month-btn').addEventListener('click',()=>{const input=$('#project-focus-add-month'),value=input.value;if(!/^\d{4}-\d{2}$/.test(value)){toast('Escolha um mês válido.');return;}projectExtraNoteMonths.add(value);projectOpenNoteMonths.add(value);const project=projectList().find(item=>item.id===activeProjectId);if(project)renderProjectMonthNotes(project);const textarea=$(`[data-project-note-input="${value}"]`);textarea?.focus();});
  $('#projects-content').addEventListener('click',event=>{const shift=event.target.closest('[data-project-month-shift]');if(shift){const date=safeDate(`${selectedProjectMonth}-01`);date.setMonth(date.getMonth()+Number(shift.dataset.projectMonthShift));selectedProjectMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;projectMonthEditMode=false;renderProjects();return;}if(event.target.closest('[data-project-month-today]')){selectedProjectMonth=isoToday().slice(0,7);projectMonthEditMode=false;renderProjects();}});
  $('#projects-content').addEventListener('change',event=>{if(event.target.matches('#project-month')){selectedProjectMonth=event.target.value||isoToday().slice(0,7);projectMonthEditMode=false;renderProjects();}});
  $('#projects-content').addEventListener('click',event=>{const shift=event.target.closest('[data-habit-week-shift]');if(shift){const date=safeDate(selectedHabitWeekDate);date.setDate(date.getDate()+Number(shift.dataset.habitWeekShift)*7);selectedHabitWeekDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;renderProjects();return;}if(event.target.closest('[data-habit-week-today]')){selectedHabitWeekDate=isoToday();renderProjects();return;}if(event.target.closest('[data-add-habit]')){openNewHabitDialog();return;}});
  document.addEventListener('click',event=>{const editHabit=event.target.closest('[data-edit-habit]');if(editHabit){openProjectTaskDialog(editHabit.dataset.editHabit,editHabit.dataset.projectId);return;}const habit=event.target.closest('[data-toggle-habit]');if(habit)toggleHabitDate(habit.dataset.habitProject,habit.dataset.toggleHabit,habit.dataset.habitDate);});
  $('#add-action').onclick=()=>openActionDialog();
  $('#add-study').onclick=()=>openActionDialog(null,'',true);
  $('#add-leisure-item').onclick=()=>openNewLeisureItem(leisureView==='backlog');
  $$('.study-tab').forEach(button=>button.onclick=()=>{studyView=button.dataset.studyView;renderStudies();});
  $('#study-toggle-completed').onclick=()=>{hideCompletedStudies=!hideCompletedStudies;renderStudies();};
  $('#study-prev-month').onclick=()=>{const d=safeDate(`${selectedStudyMonth}-01`);d.setMonth(d.getMonth()-1);selectedStudyMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;renderStudies();};
  $('#study-next-month').onclick=()=>{const d=safeDate(`${selectedStudyMonth}-01`);d.setMonth(d.getMonth()+1);selectedStudyMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;renderStudies();};
  $('#study-current-month').onclick=()=>{selectedStudyMonth=isoToday().slice(0,7);renderStudies();};$('#study-month').onchange=e=>{if(e.target.value){selectedStudyMonth=e.target.value;renderStudies();}};
  $('#study-week-prev').onclick=()=>{const d=safeDate(selectedStudyWeekDate);d.setDate(d.getDate()-7);selectedStudyWeekDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;renderStudies();};
  $('#study-week-next').onclick=()=>{const d=safeDate(selectedStudyWeekDate);d.setDate(d.getDate()+7);selectedStudyWeekDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;renderStudies();};$('#study-week-today').onclick=()=>{selectedStudyWeekDate=isoToday();renderStudies();};$('#study-week-date').onchange=e=>{if(e.target.value){selectedStudyWeekDate=e.target.value;renderStudies();}};
  $('#studies-content').addEventListener('click',event=>{if(Date.now()<ignoreStudyClickUntil){event.preventDefault();return;}const annualMonth=event.target.closest('[data-open-study-month]');if(annualMonth){selectedStudyMonth=annualMonth.dataset.openStudyMonth;studyView='monthly';renderStudies();return;}const edit=event.target.closest('[data-edit-study]');if(edit){openActionDialog(edit.dataset.editStudy,'',true);return;}const topic=event.target.closest('[data-add-study-topic]');if(topic){openActionDialog(null,topic.dataset.addStudyTopic,true);return;}const toggle=event.target.closest('[data-toggle-action]');if(toggle)toggleAction(toggle.dataset.toggleAction);});
  const studiesContent=$('#studies-content');
  let draggedStudyId='',studyDropTarget=null,touchStudyDrag=null;
  const setStudyDropTarget=column=>{
    if(studyDropTarget===column)return;
    studyDropTarget?.classList.remove('is-drop-target');
    studyDropTarget=column;
    studyDropTarget?.classList.add('is-drop-target');
  };
  const clearStudyDropTargets=()=>{
    $$('[data-study-week-date]',studiesContent).forEach(cell=>cell.classList.remove('is-drop-target'));
    $$('[data-study-month-week]',studiesContent).forEach(cell=>cell.classList.remove('is-drop-target'));
    setStudyDropTarget(null);
  };
  studiesContent.addEventListener('dragstart',event=>{
    if(!['annual','monthly','week'].includes(studyView))return;
    const card=event.target.closest('[data-drag-study]');if(!card)return;
    draggedStudyId=card.dataset.dragStudy;card.classList.add('is-dragging');
    event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggedStudyId);
  });
  studiesContent.addEventListener('dragover',event=>{
    if(!draggedStudyId)return;
    if(studyView==='week'){
      const target=event.target.closest('td[data-study-week-date]');
      if(target){event.preventDefault();event.dataTransfer.dropEffect='move';$$('[data-study-week-date]',studiesContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
      return;
    }
    if(studyView==='monthly'){
      const target=event.target.closest('td[data-study-month-week]');
      if(target){event.preventDefault();event.dataTransfer.dropEffect='move';$$('[data-study-month-week]',studiesContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
      return;
    }
    if(studyView==='annual'){
      const board=$('.action-month-board',studiesContent),rect=board?.getBoundingClientRect();
      if(rect&&event.clientX>rect.right-34)board.scrollLeft+=18;
      else if(rect&&event.clientX<rect.left+34)board.scrollLeft-=18;
      const column=event.target.closest('[data-study-month]');setStudyDropTarget(column);
      if(column){event.preventDefault();event.dataTransfer.dropEffect='move';}
    }
  });
  studiesContent.addEventListener('drop',event=>{
    const id=draggedStudyId;if(!id)return;
    if(studyView==='week'){
      const target=event.target.closest('td[data-study-week-date]');
      clearStudyDropTargets();draggedStudyId='';
      if(target){event.preventDefault();moveStudyToWeekDate(id,target.dataset.studyWeekDate);}
      return;
    }
    if(studyView==='monthly'){
      const target=event.target.closest('td[data-study-month-week]');
      clearStudyDropTargets();draggedStudyId='';
      if(target){event.preventDefault();moveStudyToMonthlyWeek(id,target.dataset.studyMonthWeek);}
      return;
    }
    if(studyView==='annual'){
      const column=event.target.closest('[data-study-month]');
      clearStudyDropTargets();draggedStudyId='';
      if(column){event.preventDefault();moveStudyToMonth(id,column.dataset.studyMonth);}
    }
  });
  studiesContent.addEventListener('dragend',()=>{
    studiesContent.querySelector('.weekly-action.is-dragging')?.classList.remove('is-dragging');
    clearStudyDropTargets();draggedStudyId='';
  });
  const finishTouchStudyDrag=()=>{
    if(!touchStudyDrag)return;
    clearTimeout(touchStudyDrag.timer);
    touchStudyDrag.preview?.remove();
    touchStudyDrag.source.classList.remove('is-dragging');
    clearStudyDropTargets();touchStudyDrag=null;
  };
  studiesContent.addEventListener('touchstart',event=>{
    if(!['annual','monthly','week'].includes(studyView)||event.touches.length!==1)return;
    const card=event.target.closest('[data-drag-study]');if(!card)return;
    const touch=event.touches[0];
    touchStudyDrag={id:card.dataset.dragStudy,view:studyView,touchId:touch.identifier,startX:touch.clientX,startY:touch.clientY,x:touch.clientX,y:touch.clientY,source:card,preview:null,active:false,timer:null};
    touchStudyDrag.timer=setTimeout(()=>{
      const drag=touchStudyDrag;if(!drag)return;
      drag.active=true;drag.source.classList.add('is-dragging');
      drag.preview=drag.source.cloneNode(true);drag.preview.removeAttribute('draggable');drag.preview.classList.add('action-drag-preview');
      drag.preview.style.width=`${drag.source.getBoundingClientRect().width}px`;
      document.body.append(drag.preview);
      drag.preview.style.left=`${drag.x}px`;drag.preview.style.top=`${drag.y}px`;
    },300);
  },{passive:true});
  studiesContent.addEventListener('touchmove',event=>{
    const drag=touchStudyDrag;if(!drag)return;
    const touch=[...event.touches].find(item=>item.identifier===drag.touchId);if(!touch)return;
    drag.x=touch.clientX;drag.y=touch.clientY;
    if(!drag.active){if(Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>10)finishTouchStudyDrag();return;}
    event.preventDefault();
    drag.preview.style.left=`${drag.x}px`;drag.preview.style.top=`${drag.y}px`;
    if(drag.view==='week'){const target=document.elementFromPoint(drag.x,drag.y)?.closest('[data-study-week-date]');$$('[data-study-week-date]',studiesContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
    else if(drag.view==='monthly'){const target=document.elementFromPoint(drag.x,drag.y)?.closest('[data-study-month-week]');$$('[data-study-month-week]',studiesContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
    else{const board=$('.action-month-board',studiesContent),rect=board?.getBoundingClientRect();if(rect&&drag.x>rect.right-34)board.scrollLeft+=18;else if(rect&&drag.x<rect.left+34)board.scrollLeft-=18;setStudyDropTarget(document.elementFromPoint(drag.x,drag.y)?.closest('[data-study-month]')||null);}
  },{passive:false});
  studiesContent.addEventListener('touchend',event=>{
    const drag=touchStudyDrag;if(!drag)return;
    const touch=[...event.changedTouches].find(item=>item.identifier===drag.touchId);if(!touch)return;
    const id=drag.id,active=drag.active,view=drag.view,moved=Math.hypot(touch.clientX-drag.startX,touch.clientY-drag.startY)>10,target=document.elementFromPoint(touch.clientX,touch.clientY),date=target?.closest('[data-study-week-date]')?.dataset.studyWeekDate,week=target?.closest('[data-study-month-week]')?.dataset.studyMonthWeek,month=target?.closest('[data-study-month]')?.dataset.studyMonth;
    finishTouchStudyDrag();
    if(!active||!moved)return;
    ignoreStudyClickUntil=Date.now()+500;
    if(view==='week'&&date)moveStudyToWeekDate(id,date);
    else if(view==='monthly'&&week)moveStudyToMonthlyWeek(id,week);
    else if(view==='annual'&&month)moveStudyToMonth(id,month);
  },{passive:true});
  studiesContent.addEventListener('touchcancel',finishTouchStudyDrag);
  const leisureContent=$('#leisure-content');
  let draggedLeisureId='',leisureDropTarget=null,touchLeisureDrag=null;
  const setLeisureDropTarget=column=>{
    if(leisureDropTarget===column)return;
    leisureDropTarget?.classList.remove('is-drop-target');
    leisureDropTarget=column;
    leisureDropTarget?.classList.add('is-drop-target');
  };
  const clearLeisureDropTargets=()=>{
    $$('[data-catalog-week-date]',leisureContent).forEach(cell=>cell.classList.remove('is-drop-target'));
    $$('[data-catalog-month-week]',leisureContent).forEach(cell=>cell.classList.remove('is-drop-target'));
    setLeisureDropTarget(null);
  };
  leisureContent.addEventListener('dragstart',event=>{
    if(!['annual','monthly','week'].includes(leisureView))return;
    const card=event.target.closest('[data-drag-leisure]');if(!card)return;
    draggedLeisureId=card.dataset.dragLeisure;card.classList.add('is-dragging');
    event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggedLeisureId);
  });
  leisureContent.addEventListener('dragover',event=>{
    if(!draggedLeisureId)return;
    if(leisureView==='week'){
      const target=event.target.closest('td[data-catalog-week-date]');
      if(target){event.preventDefault();event.dataTransfer.dropEffect='move';$$('[data-catalog-week-date]',leisureContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
      return;
    }
    if(leisureView==='monthly'){
      const target=event.target.closest('td[data-catalog-month-week]');
      if(target){event.preventDefault();event.dataTransfer.dropEffect='move';$$('[data-catalog-month-week]',leisureContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
      return;
    }
    if(leisureView==='annual'){
      const board=$('.action-month-board',leisureContent),rect=board?.getBoundingClientRect();
      if(rect&&event.clientX>rect.right-34)board.scrollLeft+=18;
      else if(rect&&event.clientX<rect.left+34)board.scrollLeft-=18;
      const column=event.target.closest('[data-catalog-month]');setLeisureDropTarget(column);
      if(column){event.preventDefault();event.dataTransfer.dropEffect='move';}
    }
  });
  leisureContent.addEventListener('drop',event=>{
    const id=draggedLeisureId;if(!id)return;
    if(leisureView==='week'){
      const target=event.target.closest('td[data-catalog-week-date]');
      clearLeisureDropTargets();draggedLeisureId='';
      if(target){event.preventDefault();moveLeisureToWeekDate(id,target.dataset.catalogWeekDate);}
      return;
    }
    if(leisureView==='monthly'){
      const target=event.target.closest('td[data-catalog-month-week]');
      clearLeisureDropTargets();draggedLeisureId='';
      if(target){event.preventDefault();moveLeisureToMonthlyWeek(id,target.dataset.catalogMonthWeek);}
      return;
    }
    if(leisureView==='annual'){
      const column=event.target.closest('[data-catalog-month]');
      clearLeisureDropTargets();draggedLeisureId='';
      if(column){event.preventDefault();moveLeisureToMonth(id,column.dataset.catalogMonth);}
    }
  });
  leisureContent.addEventListener('dragend',()=>{
    leisureContent.querySelector('.weekly-action.is-dragging')?.classList.remove('is-dragging');
    clearLeisureDropTargets();draggedLeisureId='';
  });
  const finishTouchLeisureDrag=()=>{
    if(!touchLeisureDrag)return;
    clearTimeout(touchLeisureDrag.timer);
    touchLeisureDrag.preview?.remove();
    touchLeisureDrag.source.classList.remove('is-dragging');
    clearLeisureDropTargets();touchLeisureDrag=null;
  };
  leisureContent.addEventListener('touchstart',event=>{
    if(!['annual','monthly','week'].includes(leisureView)||event.touches.length!==1)return;
    const card=event.target.closest('[data-drag-leisure]');if(!card)return;
    const touch=event.touches[0];
    touchLeisureDrag={id:card.dataset.dragLeisure,view:leisureView,touchId:touch.identifier,startX:touch.clientX,startY:touch.clientY,x:touch.clientX,y:touch.clientY,source:card,preview:null,active:false,timer:null};
    touchLeisureDrag.timer=setTimeout(()=>{
      const drag=touchLeisureDrag;if(!drag)return;
      drag.active=true;drag.source.classList.add('is-dragging');
      drag.preview=drag.source.cloneNode(true);drag.preview.removeAttribute('draggable');drag.preview.classList.add('action-drag-preview');
      drag.preview.style.width=`${drag.source.getBoundingClientRect().width}px`;
      document.body.append(drag.preview);
      drag.preview.style.left=`${drag.x}px`;drag.preview.style.top=`${drag.y}px`;
    },300);
  },{passive:true});
  leisureContent.addEventListener('touchmove',event=>{
    const drag=touchLeisureDrag;if(!drag)return;
    const touch=[...event.touches].find(item=>item.identifier===drag.touchId);if(!touch)return;
    drag.x=touch.clientX;drag.y=touch.clientY;
    if(!drag.active){if(Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>10)finishTouchLeisureDrag();return;}
    event.preventDefault();
    drag.preview.style.left=`${drag.x}px`;drag.preview.style.top=`${drag.y}px`;
    if(drag.view==='week'){const target=document.elementFromPoint(drag.x,drag.y)?.closest('[data-catalog-week-date]');$$('[data-catalog-week-date]',leisureContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
    else if(drag.view==='monthly'){const target=document.elementFromPoint(drag.x,drag.y)?.closest('[data-catalog-month-week]');$$('[data-catalog-month-week]',leisureContent).forEach(cell=>cell.classList.toggle('is-drop-target',cell===target));}
    else{const board=$('.action-month-board',leisureContent),rect=board?.getBoundingClientRect();if(rect&&drag.x>rect.right-34)board.scrollLeft+=18;else if(rect&&drag.x<rect.left+34)board.scrollLeft-=18;setLeisureDropTarget(document.elementFromPoint(drag.x,drag.y)?.closest('[data-catalog-month]')||null);}
  },{passive:false});
  leisureContent.addEventListener('touchend',event=>{
    const drag=touchLeisureDrag;if(!drag)return;
    const touch=[...event.changedTouches].find(item=>item.identifier===drag.touchId);if(!touch)return;
    const id=drag.id,active=drag.active,view=drag.view,moved=Math.hypot(touch.clientX-drag.startX,touch.clientY-drag.startY)>10,target=document.elementFromPoint(touch.clientX,touch.clientY),date=target?.closest('[data-catalog-week-date]')?.dataset.catalogWeekDate,week=target?.closest('[data-catalog-month-week]')?.dataset.catalogMonthWeek,month=target?.closest('[data-catalog-month]')?.dataset.catalogMonth;
    finishTouchLeisureDrag();
    if(!active||!moved)return;
    ignoreLeisureClickUntil=Date.now()+500;
    if(view==='week'&&date)moveLeisureToWeekDate(id,date);
    else if(view==='monthly'&&week)moveLeisureToMonthlyWeek(id,week);
    else if(view==='annual'&&month)moveLeisureToMonth(id,month);
  },{passive:true});
  leisureContent.addEventListener('touchcancel',finishTouchLeisureDrag);
  $$('.leisure-tab').forEach(button=>button.onclick=()=>{leisureView=button.dataset.leisureView;renderLeisure();});
  $('#leisure-toggle-completed').onclick=()=>{hideCompletedLeisure=!hideCompletedLeisure;renderLeisure();};
  $('#leisure-prev-month').onclick=()=>{const d=safeDate(`${selectedLeisureMonth}-01`);d.setMonth(d.getMonth()-1);selectedLeisureMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;renderLeisure();};$('#leisure-next-month').onclick=()=>{const d=safeDate(`${selectedLeisureMonth}-01`);d.setMonth(d.getMonth()+1);selectedLeisureMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;renderLeisure();};$('#leisure-current-month').onclick=()=>{selectedLeisureMonth=isoToday().slice(0,7);renderLeisure();};$('#leisure-month').onchange=e=>{if(e.target.value){selectedLeisureMonth=e.target.value;renderLeisure();}};
  $('#leisure-week-prev').onclick=()=>{const d=safeDate(selectedLeisureWeekDate);d.setDate(d.getDate()-7);selectedLeisureWeekDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;renderLeisure();};$('#leisure-week-next').onclick=()=>{const d=safeDate(selectedLeisureWeekDate);d.setDate(d.getDate()+7);selectedLeisureWeekDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;renderLeisure();};$('#leisure-week-today').onclick=()=>{selectedLeisureWeekDate=isoToday();renderLeisure();};$('#leisure-week-date').onchange=e=>{if(e.target.value){selectedLeisureWeekDate=e.target.value;renderLeisure();}};
  $('#leisure-content').addEventListener('click',event=>{if(Date.now()<ignoreLeisureClickUntil){event.preventDefault();return;}const annualMonth=event.target.closest('[data-open-leisure-month]');if(annualMonth){selectedLeisureMonth=annualMonth.dataset.openLeisureMonth;leisureView='monthly';renderLeisure();return;}const edit=event.target.closest('[data-edit-leisure]');if(edit){openActionDialog(edit.dataset.editLeisure,'',false,true);return;}const season=event.target.closest('[data-add-leisure-season]');if(season){addNextLeisureSeason(season.dataset.addLeisureSeason);return;}const schedule=event.target.closest('[data-schedule-leisure]');if(schedule){scheduleLeisureItem(schedule.dataset.scheduleLeisure);return;}const toggle=event.target.closest('[data-toggle-action]');if(toggle)toggleAction(toggle.dataset.toggleAction);});
  $('#add-action-area').onclick=()=>openActionAreaDialog();
  $('#action-area-form').addEventListener('submit',saveActionArea);$('#delete-action-area').onclick=deleteActionArea;
  $('#action-area-list').addEventListener('click',event=>{const move=event.target.closest('[data-move-action-area]');if(move){moveActionArea(move.dataset.areaId,move.dataset.moveActionArea);return;}const edit=event.target.closest('[data-edit-action-area]');if(edit)openActionAreaDialog(edit.dataset.editActionArea);});
  $('#leisure-content').addEventListener('change',event=>{if(event.target.id==='leisure-backlog-month'&&event.target.value){selectedLeisureMonth=event.target.value;renderLeisure();}});
  $('#action-schedule').onchange=updateActionSchedule;
  $('#action-leisure-type').onchange=updateLeisureFields;
  $('#action-leisure-backlog').onchange=updateLeisureFields;
  $('#action-parent').onchange=updateLeisureFields;
  $('#leisure-type-form').addEventListener('submit',saveLeisureType);$('#delete-leisure-type').onclick=deleteLeisureType;$('#add-leisure-type').onclick=()=>openLeisureTypeDialog();
  $('#leisure-type-list').addEventListener('click',event=>{const move=event.target.closest('[data-move-leisure-type]');if(move){moveLeisureType(move.dataset.leisureTypeId,move.dataset.moveLeisureType);return;}const edit=event.target.closest('[data-edit-leisure-type]');if(edit)openLeisureTypeDialog(edit.dataset.editLeisureType);});
  $('#action-scheduled-date').onchange=updateActionSchedule;
  $('#action-form').addEventListener('submit',saveAction);$('#delete-action').onclick=deleteAction;
  $('#add-subaction').onclick=()=>{const parentId=$('#action-id').value,seasonParent=$('#add-subaction').dataset.addSeason;if(seasonParent){const season=addNextLeisureSeason(seasonParent);if(season)openActionDialog(season.id);return;}if(parentId)openActionDialog(null,parentId);};
  $('#action-subactions-list').addEventListener('click',event=>{const child=event.target.closest('[data-edit-subaction]');if(child)openActionDialog(child.dataset.editSubaction);});
  $$('.occurrence-tab').forEach(button=>button.onclick=()=>{occurrenceView=button.dataset.occurrenceView;if(occurrenceView==='week'&&selectedOccurrenceWeekDate.slice(0,7)!==selectedOccurrenceMonth)selectedOccurrenceWeekDate=`${selectedOccurrenceMonth}-01`;renderOccurrences();});
  function multiSelectValues(target){const root=typeof target==='string'?$(target):target;return root?[...root.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value):[];}
  function updateMultiSelect(box){if(!box||!box.matches('[data-multi-select]'))return;const checked=[...box.querySelectorAll('input[type="checkbox"]:checked')],toggle=box.querySelector('.multi-select-toggle'),menu=box.querySelector('.multi-select-menu');toggle.textContent=checked.length===0?(box.dataset.placeholder||'Todos'):checked.length===1?checked[0].closest('.multi-select-option').querySelector('span').textContent:`${checked.length} selecionados`;box.classList.toggle('has-value',checked.length>0);toggle.setAttribute('aria-expanded',String(!menu.classList.contains('hidden')));}
  function clearMultiSelect(box){box.querySelectorAll('input[type="checkbox"]').forEach(input=>input.checked=false);updateMultiSelect(box);}
  function setMultiSelectValues(target,values){const box=typeof target==='string'?$(target):target;if(!box)return;const set=new Set(values);box.querySelectorAll('input[type="checkbox"]').forEach(input=>input.checked=set.has(input.value));updateMultiSelect(box);}
  function closeMultiSelects(except){$$('[data-multi-select]').forEach(box=>{if(box===except)return;const menu=box.querySelector('.multi-select-menu');if(menu)menu.classList.add('hidden');box.querySelector('.multi-select-toggle')?.setAttribute('aria-expanded','false');});}
  $$('[data-multi-select]').forEach(updateMultiSelect);
  document.addEventListener('click',event=>{const toggle=event.target.closest('.multi-select-toggle');if(toggle){const box=toggle.closest('[data-multi-select]'),menu=box.querySelector('.multi-select-menu'),open=!menu.classList.contains('hidden');closeMultiSelects(box);menu.classList.toggle('hidden',open);toggle.setAttribute('aria-expanded',String(!open));return;}const clear=event.target.closest('.multi-select-clear');if(clear){const box=clear.closest('[data-multi-select]');clearMultiSelect(box);if(box.closest('#action-list-filters'))renderActions();else if(box.closest('#occurrence-list-filters')||box.closest('#occurrence-calendar-filters')||box.closest('#occurrence-review-filters'))renderOccurrences();return;}if(!event.target.closest('[data-multi-select]'))closeMultiSelects();});
  document.addEventListener('change',event=>{const box=event.target.closest('[data-multi-select]');if(!box)return;updateMultiSelect(box);if(box.closest('#occurrence-list-filters')||box.closest('#occurrence-calendar-filters')||box.closest('#occurrence-review-filters'))renderOccurrences();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMultiSelects();});
  $('#occurrence-list-filters').addEventListener('input',event=>{if(event.target.matches('input[type="search"],input[type="month"]'))renderOccurrences();});
  $('#occurrence-clear-filters').onclick=()=>{$('#occurrence-filter-search').value='';$('#occurrence-filter-month').value='';$$('#occurrence-list-filters [data-multi-select]').forEach(clearMultiSelect);occurrenceListSort={key:'schedule',dir:'asc'};renderOccurrences();};
  const shiftOccurrencePeriod=amount=>{const [year,month]=selectedOccurrenceMonth.split('-').map(Number),next=new Date(year,month-1+(occurrenceView==='annual'?amount*12:amount),1);selectedOccurrenceMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;renderOccurrences();};
  $('#occurrence-prev-month').onclick=()=>shiftOccurrencePeriod(-1);$('#occurrence-next-month').onclick=()=>shiftOccurrencePeriod(1);$('#occurrence-current-month').onclick=()=>{selectedOccurrenceMonth=isoToday().slice(0,7);renderOccurrences();};
  $('#occurrence-month').onchange=event=>{if(event.target.value){selectedOccurrenceMonth=event.target.value;renderOccurrences();}};
  $('#occurrences-content').addEventListener('change',event=>{const input=event.target.closest('[data-occurrence-calendar-month]');if(input?.value){selectedOccurrenceMonth=input.value;renderOccurrences();}});
  const shiftOccurrenceWeek=amount=>{const date=safeDate(selectedOccurrenceWeekDate);date.setDate(date.getDate()+amount*7);selectedOccurrenceWeekDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;selectedOccurrenceMonth=selectedOccurrenceWeekDate.slice(0,7);renderOccurrences();};
  $('#occurrence-week-prev').onclick=()=>shiftOccurrenceWeek(-1);$('#occurrence-week-next').onclick=()=>shiftOccurrenceWeek(1);$('#occurrence-week-today').onclick=()=>{selectedOccurrenceWeekDate=isoToday();selectedOccurrenceMonth=isoToday().slice(0,7);renderOccurrences();};
  $('#occurrence-week-date').onchange=event=>{if(event.target.value){selectedOccurrenceWeekDate=event.target.value;selectedOccurrenceMonth=event.target.value.slice(0,7);renderOccurrences();}};
  $('#add-occurrence').onclick=()=>openOccurrenceDialog();$('#occurrence-form').addEventListener('submit',saveOccurrence);$('#delete-occurrence').onclick=deleteOccurrence;
  $('#occurrence-type').onchange=updateOccurrenceForm;$('#occurrence-schedule').onchange=updateOccurrenceForm;$('#occurrence-repeat-mode').onchange=updateOccurrenceForm;
  $('#occurrence-review-filters').addEventListener('input',event=>{if(event.target.id==='occurrence-review-search'&&occurrenceView==='review')renderOccurrences();});
  $('#occurrence-review-filters').addEventListener('change',event=>{if(event.target.id==='occurrence-review-period'&&occurrenceView==='review')renderOccurrences();});
  $('#occurrence-review-clear').onclick=()=>{$('#occurrence-review-search').value='';$$('#occurrence-review-filters [data-multi-select]').forEach(clearMultiSelect);setMultiSelectValues('#occurrence-review-status',['pending']);$('#occurrence-review-period').value='90';renderOccurrences();};
  if(!$('#occurrence-repeat-mode option[value="annual"]'))$('#occurrence-repeat-mode').insertAdjacentHTML('beforeend','<option value="annual">Anual</option><option value="after-date">Dias após a data agendada</option>');
  $('#occurrence-repeat-mode').addEventListener('change',event=>{if(['annual','after-date'].includes(event.target.value)){$('#occurrence-weekday-options').querySelectorAll('input').forEach(input=>input.checked=false);$('#occurrence-weekdays-field').classList.add('hidden');}if(event.target.value==='after-date'){$('#occurrence-after-completion-field').classList.remove('hidden');$('#occurrence-after-completion-field .field-label').textContent='Repetir quantos dias após a data agendada?';}});
  $('#occurrences-content').addEventListener('click',event=>{const periodShift=event.target.closest('[data-occurrence-calendar-shift]');if(periodShift){shiftOccurrencePeriod(Number(periodShift.dataset.occurrenceCalendarShift));return;}const calendarToday=event.target.closest('[data-occurrence-calendar-today]');if(calendarToday){selectedOccurrenceMonth=isoToday().slice(0,7);renderOccurrences();return;}const sort=event.target.closest('[data-sort-occurrence]');if(sort){const key=sort.dataset.sortOccurrence;occurrenceListSort=occurrenceListSort.key===key?{key,dir:occurrenceListSort.dir==='asc'?'desc':'asc'}:{key,dir:'asc'};renderOccurrences();return;}const reviewAction=event.target.closest('[data-review-occurrence-action]');if(reviewAction){const id=reviewAction.dataset.occurrenceId,key=reviewAction.dataset.occurrenceKey||'',date=reviewAction.dataset.occurrenceDate||'';if(reviewAction.dataset.reviewOccurrenceAction==='open')openOccurrenceFocus(id,date,key);else occurrenceInstanceToggle(id,key);return;}const annualMonth=event.target.closest('[data-open-occurrence-month]');if(annualMonth){selectedOccurrenceMonth=annualMonth.dataset.openOccurrenceMonth;occurrenceView='monthly';renderOccurrences();return;}const open=event.target.closest('[data-open-occurrence]');if(open){openOccurrenceFocusFromElement(open);return;}const edit=event.target.closest('[data-edit-occurrence]');if(edit){openOccurrenceDialog(edit.dataset.editOccurrence);return;}const month=event.target.closest('[data-add-occurrence-month]');if(month){openOccurrenceDialog();$('#occurrence-schedule').value='month';$('#occurrence-scheduled-month').value=month.dataset.addOccurrenceMonth;updateOccurrenceForm();return;}const date=event.target.closest('[data-add-occurrence-date]');if(date){openOccurrenceDialog();$('#occurrence-schedule').value='date';$('#occurrence-scheduled-date').value=date.dataset.addOccurrenceDate;updateOccurrenceForm();}});
  $('#occurrences-content').addEventListener('click',event=>{const occurrenceWeek=event.target.closest('[data-open-occurrence-week]');if(!occurrenceWeek)return;selectedOccurrenceWeekDate=occurrenceWeek.dataset.openOccurrenceWeek;occurrenceView='week';renderOccurrences();});
  let draggedOccurrenceId='',draggedOccurrenceDate='';
  $('#occurrences-content').addEventListener('dragstart',event=>{if(occurrenceView!=='date')return;const card=event.target.closest('[data-drag-occurrence]');if(!card)return;draggedOccurrenceId=card.dataset.dragOccurrence;card.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggedOccurrenceId);});
  $('#occurrences-content').addEventListener('dragover',event=>{if(!draggedOccurrenceId)return;const target=event.target.closest('[data-occurrence-calendar-date]');if(!target)return;event.preventDefault();$$('[data-occurrence-calendar-date]',$('#occurrences-content')).forEach(day=>day.classList.toggle('is-drop-target',day===target));});
  $('#occurrences-content').addEventListener('drop',event=>{if(!draggedOccurrenceId)return;const target=event.target.closest('[data-occurrence-calendar-date]'),id=draggedOccurrenceId;draggedOccurrenceId='';$$('[data-occurrence-calendar-date]',$('#occurrences-content')).forEach(day=>day.classList.remove('is-drop-target'));if(target){event.preventDefault();moveOccurrenceToDate(id,target.dataset.occurrenceCalendarDate);}});
  $('#occurrences-content').addEventListener('dragend',event=>{event.target.closest('[data-drag-occurrence]')?.classList.remove('is-dragging');draggedOccurrenceId='';$$('[data-occurrence-calendar-date]',$('#occurrences-content')).forEach(day=>day.classList.remove('is-drop-target'));});
  const actionsContent=$('#actions-content');
  document.addEventListener('click',event=>{const button=event.target.closest('[data-open-month-week]');if(!button)return;const date=button.dataset.openMonthWeek,root=button.closest('#monthly-grid,#task-month-grid,#actions-content,#studies-content,#leisure-content');if(!root)return;if(root.id==='monthly-grid'){selectedWeekDate=date;setSection('weekly');renderWeekly();window.scrollTo({top:0,behavior:'smooth'});}else if(root.id==='task-month-grid'){selectedTaskWeekDate=date;setTaskView('week');}else if(root.id==='actions-content'){selectedActionWeekDate=date;actionView='week';renderActions();}else if(root.id==='studies-content'){selectedStudyWeekDate=date;studyView='week';renderStudies();}else{selectedLeisureWeekDate=date;leisureView='week';renderLeisure();}});
  let draggedActionId='',draggedWeeklyActionId='',draggedMonthlyActionId='',draggedCalendarActionId='',actionDropTarget=null,touchActionDrag=null,ignoreActionClickUntil=0;
  const setActionDropTarget=column=>{
    if(actionDropTarget===column)return;
    actionDropTarget?.classList.remove('is-drop-target');
    actionDropTarget=column;
    actionDropTarget?.classList.add('is-drop-target');
  };
  actionsContent.addEventListener('dragstart',event=>{
    if(actionView==='date'){
      const calendarCard=event.target.closest('[data-drag-action-calendar]');if(!calendarCard)return;
      draggedCalendarActionId=calendarCard.dataset.dragActionCalendar;calendarCard.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggedCalendarActionId);return;
    }
    const card=event.target.closest('[data-drag-action]');
    if(event.target.closest('.action-card-children')){event.preventDefault();return;}
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
    if(actionView==='date'&&draggedCalendarActionId){const target=event.target.closest('[data-action-calendar-date]');if(target){event.preventDefault();$$('[data-action-calendar-date]',actionsContent).forEach(day=>day.classList.toggle('is-drop-target',day===target));}return;}
    if(actionView==='monthly'&&draggedMonthlyActionId){const target=event.target.closest('[data-action-month-week]');if(target){event.preventDefault();target.classList.add('is-drop-target');}return;}
    if(actionView==='week'&&(draggedWeeklyActionId||event.dataTransfer?.types?.includes('text/plain'))){const target=event.target.closest('td[data-action-week-date]');if(target){event.preventDefault();target.classList.add('is-drop-target');event.dataTransfer.dropEffect='move';}return;}
    if(!draggedActionId)return;
    const board=$('.action-month-board'),rect=board?.getBoundingClientRect();
    if(rect&&event.clientX>rect.right-34)board.scrollLeft+=18;
    else if(rect&&event.clientX<rect.left+34)board.scrollLeft-=18;
    const column=event.target.closest('[data-action-month]');
    setActionDropTarget(column);
    if(column){event.preventDefault();event.dataTransfer.dropEffect='move';}
  });
  actionsContent.addEventListener('drop',event=>{
    if(actionView==='date'&&draggedCalendarActionId){const target=event.target.closest('[data-action-calendar-date]'),id=draggedCalendarActionId;$$('[data-action-calendar-date]',actionsContent).forEach(day=>day.classList.remove('is-drop-target'));draggedCalendarActionId='';if(target){event.preventDefault();moveActionToWeekDate(id,target.dataset.actionCalendarDate);}return;}
    if(actionView==='monthly'&&draggedMonthlyActionId){const target=event.target.closest('[data-action-month-week]'),id=draggedMonthlyActionId;$$('[data-action-month-week]',actionsContent).forEach(cell=>cell.classList.remove('is-drop-target'));draggedMonthlyActionId='';if(target){event.preventDefault();moveActionToMonthlyWeek(id,target.dataset.actionMonthWeek);}return;}
    if(actionView==='week'&&(draggedWeeklyActionId||event.dataTransfer?.types?.includes('text/plain'))){const target=event.target.closest('td[data-action-week-date]'),id=draggedWeeklyActionId||event.dataTransfer?.getData('text/plain');$$('[data-action-week-date]',actionsContent).forEach(cell=>cell.classList.remove('is-drop-target'));draggedWeeklyActionId='';if(target&&id){event.preventDefault();moveActionToWeekDate(id,target.dataset.actionWeekDate);}return;}
    const column=event.target.closest('[data-action-month]'),id=draggedActionId;
    if(column&&id){event.preventDefault();setActionDropTarget(null);draggedActionId='';moveActionToMonth(id,column.dataset.actionMonth);}
  });
  actionsContent.addEventListener('dragend',()=>{
    actionsContent.querySelector('.action-calendar-item.is-dragging')?.classList.remove('is-dragging');$$('[data-action-calendar-date]',actionsContent).forEach(day=>day.classList.remove('is-drop-target'));draggedCalendarActionId='';
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
    const sort=event.target.closest('[data-sort-action]');if(sort){const key=sort.dataset.sortAction;actionListSort=actionListSort.key===key?{key,dir:actionListSort.dir==='asc'?'desc':'asc'}:{key,dir:'asc'};renderActions();return;}
    const annualMonth=event.target.closest('[data-open-action-month]');if(annualMonth){selectedActionMonth=annualMonth.dataset.openActionMonth;actionView='monthly';renderActions();return;}
    const addChild=event.target.closest('[data-add-subaction]');if(addChild){openActionDialog(null,addChild.dataset.addSubaction);return;}
    const toggle=event.target.closest('[data-toggle-action]');if(toggle){toggleAction(toggle.dataset.toggleAction);return;}
    const edit=event.target.closest('[data-edit-action]');if(edit){openActionDialog(edit.dataset.editAction);return;}
    const month=event.target.closest('[data-add-action-month]');if(month){openActionDialog();$('#action-schedule').value='month';$('#action-scheduled-month').value=month.dataset.addActionMonth;updateActionSchedule();return;}
    const date=event.target.closest('[data-add-action-date]');if(date){openActionDialog();$('#action-schedule').value='date';$('#action-scheduled-date').value=date.dataset.addActionDate;updateActionSchedule();}
  });
  $('#planner-grid').addEventListener('click',event=>{
    if(event.target.closest('[data-open-action-week]')){openActionsWeek();return;}
    if(event.target.closest('[data-open-routine-day]')){setSection('routines');setView('day');window.scrollTo({top:0,behavior:'smooth'});return;}
    if(event.target.closest('[data-open-task-day]')){setSection('tasks');setTaskView('day');window.scrollTo({top:0,behavior:'smooth'});return;}
    const routine=event.target.closest('[data-planner-routine]'),task=event.target.closest('[data-open-task]'),action=event.target.closest('[data-open-action]'),study=event.target.closest('[data-open-study]'),leisure=event.target.closest('[data-open-leisure]'),occurrence=event.target.closest('[data-open-occurrence]');if(routine)openFocusRoutine(routine.dataset.plannerRoutine);else if(task)openTaskFocus(task.dataset.openTask,task.dataset.taskOverdueDate||selectedDate);else if(action)openActionDialog(action.dataset.openAction);else if(study)openActionDialog(study.dataset.openStudy,'',true);else if(leisure)openActionDialog(leisure.dataset.openLeisure,'',false,true);else if(occurrence)openOccurrenceFocusFromElement(occurrence,selectedDate);
  });
  $('#planner-timeline').addEventListener('click',event=>{const routine=event.target.closest('[data-timeline-routine]'),task=event.target.closest('[data-timeline-task]'),action=event.target.closest('[data-timeline-action]'),study=event.target.closest('[data-timeline-study]'),leisure=event.target.closest('[data-timeline-leisure]');if(routine)openFocusRoutine(routine.dataset.timelineRoutine);else if(task)openTaskFocus(task.dataset.timelineTask);else if(action)openActionDialog(action.dataset.timelineAction);else if(study)openActionDialog(study.dataset.timelineStudy,'',true);else if(leisure)openActionDialog(leisure.dataset.timelineLeisure,'',false,true);});
  for(const selector of ['#planner-secondary-grid','#task-day-list'])$(selector).addEventListener('click',event=>{
    if(event.target.closest('[data-open-action-week]')){openActionsWeek();return;}
    if(event.target.closest('[data-open-task-day]')){setSection('tasks');setTaskView('day');window.scrollTo({top:0,behavior:'smooth'});return;}
    const openAction=event.target.closest('[data-open-action]');if(openAction){openActionDialog(openAction.dataset.openAction);return;}
    const openOccurrence=event.target.closest('[data-open-occurrence]');if(openOccurrence){openOccurrenceFocusFromElement(openOccurrence,selectedDate);return;}
    const action=event.target.closest('[data-toggle-action]');if(action){toggleAction(action.dataset.toggleAction);return;}
    const remove=event.target.closest('[data-remove-task-day]');if(remove){removeTaskFromDay(remove.dataset.removeTaskDay);return;}
    const button=event.target.closest('[data-open-task]');if(button)openTaskFocus(button.dataset.openTask,button.dataset.taskOverdueDate||selectedDate);
  });
  $('#task-week-grid').addEventListener('click',event=>{const day=event.target.closest('[data-task-week-open-date]'),button=event.target.closest('[data-task-week-date][data-open-task]');if(day){setSelectedDate(day.dataset.taskWeekOpenDate);setTaskView('day');window.scrollTo({top:0,behavior:'smooth'});}else if(button)openTaskFocus(button.dataset.openTask,button.dataset.taskWeekDate,true);});
  for(const selector of ['#task-month-grid','#task-annual-grid'])$(selector).addEventListener('click',event=>{const month=event.target.closest('[data-open-task-month]');if(month){selectedTaskMonth=month.dataset.openTaskMonth;setTaskView('month');return;}const button=event.target.closest('[data-edit-task]');if(button)openTaskDialog(button.dataset.editTask);});
  $('#task-annual-grid').addEventListener('click',event=>{if(!event.target.closest('[data-toggle-task-annual-monthly]'))return;taskAnnualMonthlyHidden=!taskAnnualMonthlyHidden;renderTaskAnnual();});
  $('#task-calendar-grid').addEventListener('click',event=>{const task=event.target.closest('[data-task-calendar-task-date][data-open-task]');if(task){openTaskFocus(task.dataset.openTask,task.dataset.taskCalendarTaskDate,true);return;}const day=event.target.closest('[data-task-calendar-date]');if(day){setSelectedDate(day.dataset.taskCalendarDate);setTaskView('day');window.scrollTo({top:0,behavior:'smooth'});}});
  $('#weekly-grid').addEventListener('click',event=>{const day=event.target.closest('[data-weekly-open-date]'),routine=event.target.closest('[data-weekly-routine]'),task=event.target.closest('[data-task-week-date][data-open-task]'),action=event.target.closest('[data-open-action]'),study=event.target.closest('[data-open-study]'),leisure=event.target.closest('[data-open-leisure]'),occurrence=event.target.closest('[data-open-occurrence]');if(day){setSelectedDate(day.dataset.weeklyOpenDate);setSection('planner');window.scrollTo({top:0,behavior:'smooth'});}else if(routine)openFocusRoutine(routine.dataset.weeklyRoutine,routine.dataset.weeklyRoutineDate);else if(task)openTaskFocus(task.dataset.openTask,task.dataset.taskWeekDate,true);else if(action)openActionDialog(action.dataset.openAction);else if(study)openActionDialog(study.dataset.openStudy,'',true);else if(leisure)openActionDialog(leisure.dataset.openLeisure,'',false,true);else if(occurrence)openOccurrenceFocusFromElement(occurrence);});
  $('#task-focus-complete').onchange=event=>mutateTaskDay(day=>{const task=day.tasks[activeTaskId];if(task&&task.kind!=='block'&&!taskIsConsultation(task)){task.done=event.target.checked;task.doneTouched=true;task.doneChangedAt=stamp();}});
  $('#task-focus-remove-day').onclick=()=>{if(activeTaskId)removeTaskFromDay(activeTaskId,activeTaskDate||selectedDate);};
  $('#task-focus-postpone').onclick=()=>{
    const date=activeTaskDate||selectedDate,id=activeTaskId;if(!id)return;
    if(!postponeTaskOccurrence(date,id))return;
    $('#task-focus-dialog').close();
    renderTasks();renderTaskReview();renderPlanner();renderWeekly();renderTaskWeekly();renderTaskCalendar();renderSummary();toast('Ocorrência adiada.');
  };
  $('#task-focus-undo-postpone').onclick=()=>{
    const date=activeTaskDate||selectedDate,id=activeTaskId;if(!id)return;
    if(!undoPostponement(date,id))return;
    $('#task-focus-dialog').close();
    renderTasks();renderTaskReview();renderPlanner();renderWeekly();renderTaskWeekly();renderTaskCalendar();renderSummary();toast('Adiamento desfeito.');
  };
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
  $('#task-focus-done').onclick=()=>{const taskId=activeTaskId;$('#task-focus-dialog').close();openTaskDialog(taskId);};
  $('#task-focus-dialog').addEventListener('close',()=>{activeTaskId=null;activeTaskDate=null;taskFocusOriginSection=currentSection;if(currentSection==='registries')renderRegistries();});
  $('#close-occurrence-focus').onclick=()=>$('#occurrence-focus-dialog').close();
  $('#occurrence-focus-edit').onclick=()=>{const id=activeOccurrenceId;$('#occurrence-focus-dialog').close();openOccurrenceDialog(id);};
  $('#occurrence-focus-complete').addEventListener('change',()=>{
    const item=state.occurrences.find(entry=>entry.id===activeOccurrenceId&&!entry.deleted);if(!item||item.consultative)return;
    const key=activeOccurrenceKey||occurrenceFocusKey(item,activeOccurrenceDate||'');if(!key)return;
    const recalculates=item.schedule==='recurrence'&&item.recurrenceMode==='after-completion';
    occurrenceInstanceToggle(item.id,key);
    if(recalculates)$('#occurrence-focus-dialog').close();else renderOccurrenceFocus();
  });
  $('#occurrence-focus-dialog').addEventListener('close',()=>{activeOccurrenceId=null;activeOccurrenceDate='';activeOccurrenceKey='';});
  $('#action-dialog').addEventListener('close',()=>{if(currentSection==='monthly')renderMonthly();if(currentSection==='weekly')renderWeekly();});
  $('#occurrence-dialog').addEventListener('close',()=>{if(currentSection==='monthly')renderMonthly();if(currentSection==='weekly')renderWeekly();});
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
  $$('.task-manage-view-button').forEach(button=>button.onclick=()=>{selectedTaskManageView=button.dataset.taskManageView==='table'?'table':'cards';renderTasks();});
  $('#task-manage-table').addEventListener('click',event=>{
    const sort=event.target.closest('[data-sort-task-manage]');
    if(sort){const key=sort.dataset.sortTaskManage;taskManageSort=taskManageSort.key===key?{key,dir:taskManageSort.dir==='asc'?'desc':'asc'}:{key,dir:'asc'};renderTasks();return;}
    const button=event.target.closest('[data-edit-task]');if(button)openTaskDialog(button.dataset.editTask);
  });
  $('#task-history-list').addEventListener('click',event=>{const toggle=event.target.closest('[data-task-history-toggle]');if(toggle){const date=toggle.dataset.taskHistoryToggle,expanded=!openTaskHistoryDates.has(date);if(expanded)openTaskHistoryDates.add(date);else openTaskHistoryDates.delete(date);const card=toggle.closest('.task-history-card');card.classList.toggle('is-open',expanded);card.querySelector('.task-history-items').classList.toggle('hidden',!expanded);toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-label',`${expanded?'Ocultar':'Mostrar'} tarefas de ${fmtDate(date)}`);return;}const button=event.target.closest('[data-task-history-date]');if(button){setSelectedDate(button.dataset.taskHistoryDate);setSection('tasks');setTaskView('day');}});
  $('#task-history-export').onclick=exportTaskCSV;
  $('#add-anchor').onclick=()=>openAnchorDialog();$('#anchor-form').addEventListener('submit',saveAnchor);$('#delete-anchor').onclick=deleteAnchor;$('#daily-view-groups-form').addEventListener('submit',saveDailyViewGroups);
  $('#daily-view-groups-form').addEventListener('change',event=>{if(event.target.matches('[data-daily-view-group],[data-daily-weekly-group],[data-daily-timeline-group],[data-anchor-daily-view],[data-anchor-weekly-view],[data-anchor-timeline-view]'))persistDailyViewGroups({announce:false,preserveSettings:true});});
  $$('.settings-tab').forEach(button=>button.onclick=()=>{selectedSettingsView=['areas','leisure','menu'].includes(button.dataset.settingsView)?button.dataset.settingsView:'views';renderSettings();});
  $('#menu-icon-list').addEventListener('input',event=>{const input=event.target.closest('[data-menu-icon-input]');if(input)updateMenuIconRow(input);});
  $('#menu-icon-list').addEventListener('focusout',event=>{const input=event.target.closest('[data-menu-icon-input]');if(!input||input.value.trim())return;const link=sidebarLinkFor(input.dataset.menuIconInput);if(link)input.value=sidebarDefaultIcon(link);});
  $('#menu-icon-list').addEventListener('change',event=>{const input=event.target.closest('[data-menu-icon-input]');if(!input||input.value.trim())return;const link=sidebarLinkFor(input.dataset.menuIconInput);if(link)input.value=sidebarDefaultIcon(link);});
  $('#menu-icon-list').addEventListener('click',event=>{const button=event.target.closest('[data-reset-menu-icon]');if(button)resetMenuIcon(button.dataset.resetMenuIcon);});
  $('#reset-menu-icons').onclick=resetMenuIcons;
  $$('.anchor-tab').forEach(button=>button.onclick=()=>{anchorView=button.dataset.anchorView;$$('.anchor-tab').forEach(tab=>tab.classList.toggle('active',tab===button));$$('.anchor-view').forEach(view=>view.classList.toggle('active-view',view.id===`anchor-view-${anchorView}`));$('#add-anchor').classList.toggle('hidden',anchorView==='areas');renderAnchors();});
  $('#anchor-schedule-type').onchange=updateAnchorScheduleFields;
  $('#anchor-area-filter').onchange=event=>{selectedAnchorArea=event.target.value;renderAnchors();};$('#anchor-schedule-filter').onchange=event=>{selectedAnchorSchedule=event.target.value;renderAnchors();};
  const anchorDateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const shiftAnchorDay=amount=>{const date=safeDate(selectedAnchorDate);date.setDate(date.getDate()+amount);selectedAnchorDate=anchorDateKey(date);renderAnchors();};
  $('#anchor-day-prev').onclick=()=>shiftAnchorDay(-1);$('#anchor-day-next').onclick=()=>shiftAnchorDay(1);$('#anchor-day-today').onclick=()=>{selectedAnchorDate=isoToday();renderAnchors();};$('#anchor-day-date').onchange=event=>{if(event.target.value){selectedAnchorDate=event.target.value;renderAnchors();}};
  const shiftAnchorWeek=amount=>{const date=safeDate(selectedAnchorWeekDate);date.setDate(date.getDate()+amount*7);selectedAnchorWeekDate=anchorDateKey(date);renderAnchors();};
  $('#anchor-week-prev').onclick=()=>shiftAnchorWeek(-1);$('#anchor-week-next').onclick=()=>shiftAnchorWeek(1);$('#anchor-week-today').onclick=()=>{selectedAnchorWeekDate=isoToday();renderAnchors();};$('#anchor-week-date').onchange=event=>{if(event.target.value){selectedAnchorWeekDate=event.target.value;renderAnchors();}};
  const shiftAnchorMonth=amount=>{const [year,month]=selectedAnchorMonth.split('-').map(Number),date=new Date(year,month-1+amount,1);selectedAnchorMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;renderAnchors();};
  $('#anchor-month-prev').onclick=()=>shiftAnchorMonth(-1);$('#anchor-month-next').onclick=()=>shiftAnchorMonth(1);$('#anchor-month-today').onclick=()=>{selectedAnchorMonth=isoToday().slice(0,7);renderAnchors();};$('#anchor-month-date').onchange=event=>{if(event.target.value){selectedAnchorMonth=event.target.value;renderAnchors();}};
  $('#anchor-annual-prev').onclick=()=>{selectedAnchorYear--;renderAnchors();};$('#anchor-annual-next').onclick=()=>{selectedAnchorYear++;renderAnchors();};$('#anchor-annual-today').onclick=()=>{selectedAnchorYear=Number(isoToday().slice(0,4));renderAnchors();};$('#anchor-annual-year').onchange=event=>{const year=Number(event.target.value);if(year>=2000&&year<=2100){selectedAnchorYear=year;renderAnchors();}};
  for(const selector of ['#anchor-day-list','#anchor-week-grid','#anchor-month-grid','#anchor-annual-grid','#anchor-list'])$(selector).addEventListener('click',event=>{const month=event.target.closest('[data-open-anchor-month]');if(month){selectedAnchorMonth=month.dataset.openAnchorMonth;document.querySelector('.anchor-tab[data-anchor-view="month"]')?.click();return;}const button=event.target.closest('[data-edit-anchor]');if(button)openAnchorDialog(button.dataset.editAnchor);});
  let draggedAnchorMonth=null;
  $('#anchor-month-grid').addEventListener('dragstart',event=>{const card=event.target.closest('[data-drag-anchor-month]');if(!card)return;draggedAnchorMonth={id:card.dataset.dragAnchorMonth,fromWeek:card.dataset.dragAnchorWeek};card.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',card.dataset.dragAnchorMonth);});
  $('#anchor-month-grid').addEventListener('dragend',event=>{event.target.closest('[data-drag-anchor-month]')?.classList.remove('is-dragging');draggedAnchorMonth=null;$$('[data-anchor-month-week]',$('#anchor-month-grid')).forEach(cell=>cell.classList.remove('is-drop-target'));});
  $('#anchor-month-grid').addEventListener('dragover',event=>{const cell=event.target.closest('[data-anchor-month-week]');if(!cell||!draggedAnchorMonth)return;event.preventDefault();$$('[data-anchor-month-week]',$('#anchor-month-grid')).forEach(item=>item.classList.toggle('is-drop-target',item===cell));});
  $('#anchor-month-grid').addEventListener('drop',event=>{const cell=event.target.closest('[data-anchor-month-week]');if(!cell||!draggedAnchorMonth)return;event.preventDefault();const drag=draggedAnchorMonth;draggedAnchorMonth=null;moveAnchorMonthWeek(drag.id,drag.fromWeek,cell.dataset.anchorMonthWeek);});
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
  $('#close-routine-focus').onclick=()=>$('#routine-focus-dialog').close();
  $('#focus-done').onclick=()=>{const routineId=activeRoutineId;$('#routine-focus-dialog').close();openRoutineDialog(routineId);};
  $('#routine-focus-dialog').addEventListener('close',()=>{activeRoutineId=null;activeRoutineDate=null;if(currentSection==='registries')renderRegistries();});
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
  $('#forgot-password').onclick=requestPasswordReset;$('#save-password').onclick=setNewPassword;$('#cancel-recovery').onclick=cancelRecovery;
  $('#sync-now').onclick=()=>pushSync();
  $('#sync-download').onclick=()=>pullSync();
  $('#sync-upload').onclick=()=>pushSync('Dados enviados para a nuvem.');
  $('#sign-out').onclick=async()=>{try{const {error}=await supabaseClient.auth.signOut();if(error)throw error;session=null;setSyncStatus('offline','Somente neste aparelho');updateAccountDialog();toast('Você saiu da conta.');}catch(error){toast(error.message||'Não foi possível sair da conta.');}};
  function refreshCalendarDay(){if(renderedCalendarDate!==isoToday()){renderedCalendarDate=isoToday();render();}}
  window.addEventListener('focus',()=>{refreshCalendarDay();updateTimelineNow();refreshFromCloud();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshCalendarDay();updateTimelineNow();refreshFromCloud();}});
  window.addEventListener('online',refreshFromCloud);
  setInterval(()=>{refreshCalendarDay();updateTimelineNow();refreshFromCloud();},60000);
  const collapsedCategoryRows=new Set();
  function annualViewForRoot(root){if(root.closest('#task-annual-grid'))return'tasks';if(root.closest('#actions-content'))return'actions';if(root.closest('#occurrences-content'))return'occurrences';if(root.closest('#anchor-annual-grid'))return'anchors';return'';}
  function applyAnnualMonthVisibility(root,view){
    const hidden=annualHiddenMonths[view];
    if(!hidden)return;
    root.querySelectorAll('[data-annual-month-key]').forEach(element=>element.classList.toggle('annual-month-is-hidden',hidden.has(element.dataset.annualMonthKey)));
  }
  function enhanceAnnualMonthControls(root=document){
    const tables=root.querySelectorAll('.task-annual-table');
    tables.forEach(table=>{const view=annualViewForRoot(table),headers=[...table.querySelectorAll('thead th')].slice(1);headers.forEach(header=>{const key=header.dataset.openTaskMonth||header.dataset.openOccurrenceMonth||header.dataset.openAnchorMonth;if(!key)return;header.dataset.annualMonthKey=key;header.querySelectorAll(':scope > .annual-month-toggle').length||header.insertAdjacentHTML('beforeend',`<button type="button" class="annual-month-toggle" data-toggle-annual-month="${key}" data-annual-month-view="${view}" aria-label="Ocultar mês">⌄</button>`);[...table.querySelectorAll('tbody tr')].forEach(row=>{const cell=row.children[headers.indexOf(header)+1];if(cell)cell.dataset.annualMonthKey=key;});});applyAnnualMonthVisibility(table,view);});
    root.querySelectorAll('.action-month-column[data-action-month]').forEach(column=>{const view='actions',key=column.dataset.actionMonth;column.dataset.annualMonthKey=key;column.classList.toggle('annual-month-is-hidden',annualHiddenMonths[view].has(key));const header=column.querySelector('header');if(header&&!header.querySelector('.annual-month-toggle'))header.insertAdjacentHTML('beforeend',`<button type="button" class="annual-month-toggle" data-toggle-annual-month="${key}" data-annual-month-view="${view}" aria-label="Ocultar mês">⌄</button>`);});
  }
  function enhanceCollapsibleCategoryRows(root=document){
    $$('.weekly-table tbody tr',root).forEach(row=>{
      const heading=row.querySelector(':scope > th');if(!heading||heading.querySelector('.category-row-toggle')||heading.querySelector('.annual-row-toggle'))return;
      const container=row.closest('[id]'),tables=container?[...container.querySelectorAll('.weekly-table')]:[row.closest('.weekly-table')],table=row.closest('.weekly-table'),tableIndex=Math.max(0,tables.indexOf(table)),label=heading.textContent.trim(),rowIndex=[...row.parentElement.children].indexOf(row),key=`${container?.id||'page'}|${tableIndex}|${label}|${rowIndex}`;
      row.dataset.categoryRowKey=key;const collapsed=collapsedCategoryRows.has(key);row.classList.toggle('is-category-collapsed',collapsed);
      heading.insertAdjacentHTML('beforeend',`<button type="button" class="category-row-toggle" aria-expanded="${!collapsed}" aria-label="${collapsed?'Mostrar':'Ocultar'} categoria ${escapeHTML(label)}"><span aria-hidden="true">${collapsed?'▸':'▾'}</span></button>`);
    });
  }
  document.addEventListener('click',event=>{const button=event.target.closest('.category-row-toggle');if(!button)return;const row=button.closest('tr'),key=row?.dataset.categoryRowKey;if(!row||!key)return;const collapsed=!row.classList.contains('is-category-collapsed');row.classList.toggle('is-category-collapsed',collapsed);if(collapsed)collapsedCategoryRows.add(key);else collapsedCategoryRows.delete(key);button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',`${collapsed?'Mostrar':'Ocultar'} categoria ${row.querySelector(':scope > th')?.textContent.replace(/[\u25b8▾]/g,'').trim()||''}`);button.querySelector('span').textContent=collapsed?'▸':'▾';});
  const categoryRowsObserver=new MutationObserver(()=>enhanceCollapsibleCategoryRows());categoryRowsObserver.observe(document.body,{childList:true,subtree:true});
  const annualMonthsObserver=new MutationObserver(()=>enhanceAnnualMonthControls());annualMonthsObserver.observe(document.body,{childList:true,subtree:true});
  function decorateProjectProgressModes(){const root=$('#projects-content');if(!root)return;$$('[data-project-progress]',root).forEach(input=>{const task=projectList().flatMap(project=>project.tasks).find(item=>item.id===input.dataset.projectProgress),automatic=Boolean(task?.recurring);let badge=input.closest('.project-task-progress-cell')?.querySelector('.progress-mode');if(!badge){badge=document.createElement('span');input.closest('.project-task-progress-cell')?.append(badge);}if(badge){badge.textContent=automatic?'Automático':'Manual';badge.className=`progress-mode ${automatic?'is-automatic':'is-manual'}`;}});$$('.project-card',root).forEach(card=>{const id=card.querySelector('[data-edit-project]')?.dataset.editProject,project=projectList().find(item=>item.id===id),automatic=project?.progress===null||project?.progress===undefined||project?.progress==='';let badge=card.querySelector('.project-progress-row .progress-mode');if(!badge){badge=document.createElement('span');card.querySelector('.project-progress-row')?.append(badge);}if(badge){badge.textContent=automatic?'Automático':'Manual';badge.className=`progress-mode ${automatic?'is-automatic':'is-manual'}`;}});}
  function decorateRecurringStatuses(){const root=$('#projects-content');if(!root)return;$$('.recurring-history-table tbody td:nth-child(4)',root).forEach(cell=>{if(cell.querySelector('.project-status,.project-occurrence-result,.recurring-status'))return;const label=cell.textContent.trim(),normalized=label.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,''),parent=cell.closest('tr')?.classList.contains('recurring-parent-row');if(parent){cell.innerHTML=`<span class="project-task-status is-${projectStatusClass(label)}">${escapeHTML(label)}</span>`;return;}const kind=normalized==='realizada'?'realized':normalized.includes('parcial')?'partial':normalized==='nao realizada'?'not-realized':normalized==='programada'||normalized==='pendente'?'scheduled':normalized==='ignorada'?'skipped':'';cell.innerHTML=`<span class="project-occurrence-result${kind?` is-${kind}`:''}">${escapeHTML(label)}</span>`;});}
  const projectProgressObserver=new MutationObserver(()=>{projectProgressObserver.disconnect();decorateProjectProgressModes();decorateRecurringStatuses();projectProgressObserver.observe($('#projects-content'),{childList:true,subtree:true});});projectProgressObserver.observe($('#projects-content'),{childList:true,subtree:true});
  document.addEventListener('click',event=>{const button=event.target.closest('.annual-month-toggle');if(!button)return;event.preventDefault();event.stopPropagation();const view=button.dataset.annualMonthView,key=button.dataset.toggleAnnualMonth;annualHiddenMonths[view]?.has(key)?annualHiddenMonths[view].delete(key):annualHiddenMonths[view]?.add(key);enhanceAnnualMonthControls();});
  $('#anchor-month-grid').addEventListener('click',event=>{const header=event.target.closest('.monthly-week');if(!header)return;const match=header.className.match(/monthly-week-(\d+)/);if(!match)return;const [start]=monthWeekRange(selectedAnchorMonth,Number(match[1]));selectedAnchorWeekDate=anchorDateKey(start);document.querySelector('.anchor-tab[data-anchor-view="week"]')?.click();});
  document.addEventListener('dragstart',event=>{const card=event.target.closest('[data-drag-occurrence]');if(card)window.__occurrenceDragDate=card.dataset.occurrenceDate||'';});
  document.addEventListener('dragend',()=>{window.__occurrenceDragDate='';});
  function loadProjectRecurrenceHistoryFromScreenshots(){const records=[
    ['sair para comer/beber', [['2026-01-01','not-realized',0],['2026-02-01','not-realized',0],['2026-03-01','realized',100],['2026-04-01','not-realized',0],['2026-05-01','not-realized',0],['2026-06-01','not-realized',0],['2026-07-01','partial',50],['2026-08-01','partial',50],['2026-09-01','realized',100],['2026-10-01','partial',50]]],
    ['intimidade cada duas semanas', [['2026-01-16','not-realized',0],['2026-01-30','not-realized',0],['2026-02-13','not-realized',0],['2026-02-27','not-realized',0],['2026-03-13','not-realized',0],['2026-03-27','not-realized',0],['2026-04-10','not-realized',0],['2026-04-24','not-realized',0],['2026-05-08','not-realized',0],['2026-05-22','not-realized',0],['2026-06-05','not-realized',0],['2026-06-19','not-realized',0],['2026-07-03','not-realized',0],['2026-07-17','not-realized',0],['2026-07-31','not-realized',0]]],
    ['postar conteúdo na confraria', [['2026-02-22','partial',50],['2026-04-26','realized',100],['2026-06-28','realized',100],['2026-08-30','not-realized',0],['2026-10-25','partial',0]]],
    ['conversar com Keller', [['2026-02-06','realized',100],['2026-05-01','not-realized',0],['2026-08-07','realized',100]]],
    ['comentar ou interagir nos posts de outros', [['2026-01-30','partial',50],['2026-02-27','partial',50],['2026-03-27','partial',50],['2026-04-24','not-realized',0],['2026-05-29','partial',50],['2026-06-26','realized',100],['2026-07-31','realized',100],['2026-08-28','partial',0],['2026-09-25','realized',100]]],
    ['rever as situação e atitudes criadas', [['2025-11-25','not-realized',0],['2026-02-24','not-realized',0],['2026-05-26','not-realized',0],['2026-08-26','scheduled',0]]],
    ['postar no Instagram', [['2026-01-15','realized',100],['2026-05-01','realized',100],['2026-08-07','scheduled',0]]],
    ['momento seriados comfort', [['2026-01-14','realized',100],['2026-02-11','realized',100],['2026-03-11','realized',100],['2026-04-08','realized',100],['2026-05-13','not-realized',0],['2026-06-10','not-realized',0],['2026-07-08','partial',50],['2026-08-12','realized',100],['2026-09-09','not-realized',0],['2026-10-14','partial',0]]],
    ['momento de bem-estar', [['2026-01-28','not-realized',0],['2026-02-25','realized',100],['2026-03-25','realized',100],['2026-04-29','not-realized',0],['2026-05-27','not-realized',0],['2026-06-24','realized',100],['2026-07-29','realized',100],['2026-08-26','not-realized',0],['2026-09-30','partial',0],['2026-10-28','scheduled',0]]]
  ];let changed=false;for(const [needle,entries] of records){const normalized=needle.toLocaleLowerCase('pt-BR');for(const project of state.projects||[]){const task=(project.tasks||[]).find(item=>String(item.title||'').toLocaleLowerCase('pt-BR').includes(normalized));if(!task)continue;if(!Array.isArray(task.occurrences))task.occurrences=[];let taskChanged=false;for(const [date,result,progress] of entries){if(task.occurrences.some(item=>item.date===date))continue;task.occurrences.push({id:`screenshot-${task.id}-${date}`,date,period:projectMonthKey(date),result,progress,updatedAt:stamp()});changed=true;taskChanged=true;}task.occurrences.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));if(taskChanged){const updatedAt=stamp();task.updatedAt=updatedAt;project.updatedAt=updatedAt;}}}
    const noteCleanupKey='project-recurrence-screenshot-note-cleanup-v1';
  if(!localStorage.getItem(noteCleanupKey)){
    const updatedAt=stamp();
    for(const project of state.projects||[]){
      let projectChanged=false;
      for(const task of project.tasks||[]){
        let taskChanged=false;
        for(const occurrence of task.occurrences||[]){if(occurrence.notes&&isImportedRecurrenceNote(occurrence.notes)){delete occurrence.notes;taskChanged=true;}}
        if(taskChanged){task.updatedAt=updatedAt;projectChanged=true;}
      }
      if(projectChanged){project.updatedAt=updatedAt;changed=true;}
    }
    localStorage.setItem(noteCleanupKey,'1');
  }
  const migrationKey='project-recurrence-screenshot-migration-v2';if(!localStorage.getItem(migrationKey)){const updatedAt=stamp();for(const project of state.projects||[]){for(const task of project.tasks||[]){if((task.occurrences||[]).some(item=>String(item.id||'').startsWith('screenshot-'))){task.updatedAt=updatedAt;project.updatedAt=updatedAt;changed=true;}}}localStorage.setItem(migrationKey,'1');}
    if(changed)saveLocal();
  }
  loadProjectRecurrenceHistoryFromScreenshots();
  setupColorPalettes();render();initializeSync();
})();
