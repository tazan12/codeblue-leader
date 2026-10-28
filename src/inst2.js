/* ============ 강사 창 연동 (학생 화면 쪽) ============
   강사 콘솔(별도 창·휴대폰)에서 오는 명령을 실행하고, 실제 상태·수행 지표·관찰 기록·디브리핑 자료를 보냅니다. */
var INST={link:null,seen:0};
instMark=function(txt){S.instr=true;S.hidden.push({t:S.t,text:'[강사] '+txt});};   // 학생 로그에는 남기지 않음 → 디브리핑에만
function instLink(){
 if(INST.link)return INST.link;
 if(window.cblBridge&&window.cblBridge.electron){window.cblBridge.onMsg(instRecv);INST.link={kind:'ipc',send:m=>window.cblBridge.toInst(m)};}
 else if('BroadcastChannel' in window){const bc=new BroadcastChannel('cbl-inst');bc.onmessage=e=>instRecv(e.data);INST.link={kind:'bc',send:m=>{try{bc.postMessage(m);}catch(_){}}};}
 else INST.link={kind:'none',send:()=>{}};
 return INST.link;
}
function instLive(){return !!(INST&&Date.now()-INST.seen<4000);}
function instRecv(m){
 if(!m)return;const was=instLive();INST.seen=Date.now();
 if(!was){toast('강사 창이 연결되었습니다.');if(typeof renderTop==='function')renderTop();}
 if(m.t==='cmd')instDo(m.act,m.a||{});
 instSend();
}
/* ---- 화면 배너 (상황 알림·강사 코칭) ---- */
function instBanner(kind,title,text){const st=$('#stage');if(!st)return;let b=$('#instban');if(!b){b=document.createElement('div');b.id='instban';st.appendChild(b);}
 b.className='instban '+kind;setHTML(b,'<b>'+esc(title)+'</b><span>'+esc(text)+'</span>');void b.offsetWidth;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),kind==='coach'?9000:7000);}
/* ---- 돌발 상황 ---- */
const INJECT={
 ivLost:{name:'정맥로 빠짐',fn(P){if(P.access==='none')return '혈관 통로가 아직 없습니다';P.access='none';const lost=S.infusions.filter(x=>x.kind==='drip').map(x=>x.name);S.infusions=S.infusions.filter(x=>x.kind!=='drip');log('정맥로 부위가 부어오르고 수액이 들어가지 않습니다 — 혈관 통로를 다시 확보해야 합니다.'+(lost.length?' (지속주입 중단: '+lost.join(', ')+')':''),'warn');}},
 padsOff:{name:'패드 떨어짐',fn(P){if(!P.pads)return '패드가 아직 없습니다';P.pads=false;log('패드 한쪽이 들떠 모니터에 “리드 없음”이 뜹니다 — 패드를 다시 붙여야 합니다.','warn');}},
 tubeOut:{name:'기관내관 빠짐',fn(P){if(P.airway!=='ett')return '삽관 상태가 아닙니다';P.airway='none';P.etco2=Math.min(P.etco2,3);log('환자를 옮기다 기관내관이 빠진 것 같습니다 — EtCO₂ 파형이 사라졌습니다.','warn');}},
 chargeFail:{name:'제세동기 충전 오류(1회)',fn(){S.flags.chargeFail=true;}},
 memberAway:{name:'팀원 1명 호출로 이탈(60초)',fn(){const c=S.members.filter(m=>m.task!=='cpr');if(!c.length)return '보낼 수 있는 팀원이 없습니다';const m=c.find(x=>!x.task)||c[c.length-1];if(m.task)stopTask(m);S.members=S.members.filter(x=>x!==m);(S.away=S.away||[]).push({m,back:S.t+60});log(m.name+': "옆 병실 응급 호출이 와서 잠깐 다녀오겠습니다!"','comm');}},
 family:{name:'보호자 등장',fn(){log('보호자가 병실 문 앞에서 무슨 일이냐며 들어오려 합니다.','info');instBanner('situ','상황','보호자가 들어오려 합니다 — 누가 응대할지 정하세요');}},
 drugOut:{name:'에피네프린 재고 없음(30초)',fn(){S.flags.epiOutUntil=S.t+30;log('응급카트의 에피네프린 앰플이 떨어졌습니다. 약제부에 요청 중(약 30초).','warn');}}
};
const __chargeI=charge;charge=function(){if(S&&S.flags&&S.flags.chargeFail&&S.P.pads){S.flags.chargeFail=false;log('제세동기 오류: 충전이 되지 않았습니다. 다시 충전하세요.','warn');snd.alarmMed&&snd.alarmMed();renderSim();return;}__chargeI.apply(this,arguments);};
const __giveDrugI=giveDrug;giveDrug=function(fid,m){if(S&&S.flags&&S.flags.epiOutUntil>S.t&&FORM[fid]&&FORM[fid].drug==='epi'){log((m?m.name+': ':'')+'에피네프린이 아직 도착하지 않았습니다.','warn');return;}return __giveDrugI.apply(this,arguments);};
const __tickI=tick;tick=function(dt){__tickI(dt);if(S&&S.away&&S.away.length){S.away=S.away.filter(a=>{if(S.t>=a.back){a.m.task=null;a.m.prog=0;a.m.paused=false;S.members.push(a.m);log(a.m.name+': "돌아왔습니다. 무엇을 할까요?"','comm');return false;}return true;});}};
/* ---- 명령 실행 ---- */
function instDo(act,a){
 if(act==='pause'){if(S&&curScreen==='sim'&&!S.ended){S.paused=!S.paused;renderTop();renderSim();}return;}
 if(act==='team'){INST.team=String(a.v||'').slice(0,30);if(S)S.team=INST.team;return;}
 if(act==='nts'){if(S){S.nts=S.nts||{};S.nts[a.k]=+a.v||0;if(S.ended&&curScreen==='debrief')renderDebrief('score');}return;}
 if(act==='mark'){if(S){(S.marks=S.marks||[]).push({t:S.t,kind:a.kind==='good'?'good':'bad',text:String(a.v||'').slice(0,160)});if(S.ended&&curScreen==='debrief')renderDebrief('score');}return;}
 if(act==='showDebrief'){if(S&&S.ended){showScreen('debrief');renderDebrief(a.tab||'score');}return;}
 if(!S||curScreen!=='sim'||S.ended)return;const P=S.P;
 switch(act){
  case 'rh':{const k=a.k;if(!RH[k])return;const hr=a.hr||undefined;const wasP=P.pulse;setRhythm(k,hr);if(!wasP&&P.pulse){S.roscT=S.t;S.flags.everRosc=true;P.sbpT=Math.max(P.sbpT,80);}if(P.pulse&&P.sbpT<60)P.sbpT=90;instMark('리듬 → '+RH[k].name);break;}
  case 'sbp':if(a.v>0){P.sbpT=+a.v;instMark('목표 혈압 '+P.sbpT);}break;
  case 'rosc':if(!P.pulse){doRosc();instMark('ROSC 유도');}break;
  case 'arr':if(RH[a.v]){setRhythm(a.v);instMark('재정지 → '+RH[a.v].name);}break;
  case 'fail':S.flags.forceFail=true;instMark('다음 술기 실패 예약');break;
  case 'cb':if(S.codeBlue.status!=='arrived'){S.codeBlue={status:'coming',req:S.codeBlue.req,arr:S.t};instMark('지원팀 즉시 도착');}break;
  case 'cause':{const v=a.v&&CAUSES[a.v]?a.v:null;P.cause=v;P.causeFixed=!v;instMark('원인 지정 → '+(v?CAUSES[v].name:'없음'));break;}
  case 'fix':if(P.cause){P.causeFixed=true;instMark('원인 교정 처리');}break;
  case 'note':if(a.v){S.notes.push({t:S.t,text:String(a.v).slice(0,300)});S.instr=true;}break;
  case 'inject':{const I=INJECT[a.k];if(!I)return;const r=I.fn(P);if(typeof r==='string'){INST.lastErr=r;return;}instMark('돌발 상황: '+I.name);break;}
  case 'say':{const t=String(a.v||'').trim().slice(0,140);if(!t)return;if(a.kind==='coach'){S.instr=true;S.hidden.push({t:S.t,text:'[강사 코칭] '+t});instBanner('coach','강사 코칭',t);}else{log(t,'info');S.hidden.push({t:S.t,text:'[상황 알림] '+t});instBanner('situ','상황',t);}break;}
  case 'speed':S.speed=clamp(+a.v||1,0.5,3);instMark('진행 속도 '+S.speed+'배');renderTop();break;
  case 'hints':if(S.mode!=='test'){S.hints=!!a.on;instMark('힌트 '+(S.hints?'켬':'끔'));}break;
  case 'end':endCase('stopped');return;
  default:return;
 }
 renderSim();if(instOpen)renderInst();
}
/* ---- 수행 지표·체크리스트 ---- */
function instKpi(){const P=S.P,lp=S.pauses.reduce((a,p)=>Math.max(a,p.len),0),cur=S.curPause?S.t-S.curPause.s:0;
 const comp=S.members.find(m=>m.task==='cpr'&&!m.paused&&m.prog>=m.prep);const epi=S.drugs.filter(d=>d.form==='epi1');
 return {ccf:S.arrestTime>0?Math.round(S.compTime/S.arrestTime*100):null,cur:Math.round(cur*10)/10,longest:Math.round(Math.max(lp,cur)*10)/10,over10:S.pauses.filter(p=>p.len>10).length,
  compName:comp?comp.name:null,stint:comp?Math.round(comp.cprT):0,depth:comp?Math.round(comp.depth*10)/10:null,rate:comp?comp.rate:null,
  epiAgo:epi.length?Math.round(S.t-epi[epi.length-1].t):null,epiN:epi.length,shocks:S.shocks.filter(s=>s.appropriate).length,vent:P.bvm,airway:P.airway,overvent:Math.round(S.overvent||0),cautions:S.cautions.length,crit:S.crit.length};}
function instChecklist(){const C=S.C,first=(arr,f)=>{const x=arr.find(f);return x?x.t:null;};
 const items=[['의식 확인',S.conscAt],['코드블루 호출',S.codeBlue.req],['호흡·맥박 사정',S.assessments[0]?S.assessments[0].s:null]];
 if(!C.pulseCase){items.push(['가슴압박 시작',S.firstComp],['환기 시작',S.firstBvm],['패드 부착',S.firstPads],['첫 리듬 판독',first(S.readings,r=>!r.art)]);
  if(C.shockable)items.push(['첫 제세동',first(S.shocks,s=>s.appropriate&&s.arrest)]);
  items.push(['정맥로·골내로',S.firstAccess],['에피네프린',first(S.drugs,d=>d.form==='epi1')]);
  if(C.shockable)items.push(['항부정맥제',first(S.drugs,d=>['amio300','lido1'].includes(d.form))]);else items.push(['원인 탐색',first(S.procs,p=>p.k==='pocus')||(S.labs[0]?S.labs[0].req:null)]);
  items.push(['전문기도기',first(S.procs,p=>p.k==='ett'&&p.ok)],['ROSC 선언',S.roscConfirmT!=null?S.roscConfirmT:null]);}
 else items.push(['패드(ECG)',S.firstPads],['SpO₂',S.firstProbe],['혈압 측정',S.firstBP],['정맥로',S.firstAccess],['리듬 판독',first(S.readings,r=>r.ok)],['1차 치료',S.firstDef]);
 return items.map(([l,t])=>({l,t:t==null?null:Math.round(t)}));}
/* ---- 디브리핑 질문 자동 생성 (PEARLS 흐름) ---- */
function instDebrief(){const R=S.result;if(!R)return null;const k=instKpi(),q=[],good=[];
 R.items.forEach(i=>{if(i.max>0&&i.pts>=i.max*0.9)good.push(i.label+' ('+i.detail+')');});
 const add=(cond,txt)=>{if(cond)q.push(txt);};
 add(k.longest>10,'가장 길었던 압박 중단은 '+k.longest+'초였습니다. 그때 무엇을 하고 있었고, 어떻게 줄일 수 있을까요?');
 add(k.ccf!=null&&k.ccf<80,'압박 분율이 '+k.ccf+'%였습니다. 압박이 끊긴 순간들을 함께 찾아볼까요?');
 add((S.fatOver||0)>0,'한 사람이 2분 30초 넘게 압박했습니다. 교대 시점을 누가, 어떻게 알렸어야 할까요?');
 add(S.firstComp!=null&&S.firstComp>60,'가슴압박 시작이 '+fmt(S.firstComp)+'였습니다. 시작을 늦춘 요인은 무엇이었나요?');
 add(!S.C.pulseCase&&S.firstBvm==null,'심정지 동안 환기를 시작하지 않았습니다. 기도·호흡 담당을 어떻게 정할 수 있었을까요?');
 add(k.overvent>=30,'삽관 후 과환기가 '+k.overvent+'초 있었습니다. 환기 속도를 어떻게 모니터하고 피드백할까요?');
 add(S.drugs.some(d=>d.lvl==='wrong'),'적응증이 맞지 않는 약물이 있었습니다. 투여 전 확인 절차(폐쇄 루프)를 어떻게 했나요?');
 add(S.crit.length>0,'중대 오류가 '+S.crit.length+'건 있었습니다: '+S.crit.map(c=>c.text).slice(0,2).join(' / ')+' — 같은 상황이 오면 무엇을 다르게 할까요?');
 add(S.C.pulseCase&&S.firstDef==null,'1차 치료를 시작하지 못했습니다. 불안정 징후를 어떻게 판단했나요?');
 add(S.readings.some(r=>!r.ok&&!r.art),'리듬 판독이 틀린 적이 있었습니다. 어떤 특징을 보고 판단했나요?');
 R.items.filter(i=>i.max>0&&i.pts<i.max*0.6).forEach(i=>{if(q.length<9&&!q.some(x=>x.indexOf(i.label)>=0))q.push('“'+i.label+'” 점수가 낮았습니다('+i.detail+'). 그 순간 무엇이 어려웠고, 팀이 무엇을 할 수 있었을까요?');});
 (S.marks||[]).filter(m=>m.kind==='bad').forEach(m=>q.push(fmt(m.t)+' 장면: '+(m.text||'강사가 표시한 개선 장면')+' — 그때 팀 안에서 무슨 일이 있었나요?'));
 return {reaction:['지금 기분이 어떤가요? 가장 먼저 떠오르는 장면은 무엇인가요?'],description:['리더로서 이 케이스를 한두 문장으로 요약해 볼까요? (환자 상태, 주요 처치, 결과)'],
  analysis:q.slice(0,9),good:good.slice(0,5).concat((S.marks||[]).filter(m=>m.kind==='good').map(m=>fmt(m.t)+' '+(m.text||'좋았던 장면'))),
  summary:['오늘 배운 것 중 다음 실제 상황에서 바로 쓸 한 가지는 무엇인가요?']};}
var INST_META={rh:Object.keys(RH).map(k=>[k,RH[k].name]),causes:Object.keys(CAUSES).map(k=>[k,CAUSES[k].name]),inject:Object.keys(INJECT).map(k=>[k,INJECT[k].name])};
var MODE_NAME={basic:'기초',adv:'심화',test:'평가'};
function instState(){
 const o={t:'state',meta:INST_META,screen:curScreen,has:!!(S&&curScreen==='sim'&&!S.ended),team:INST.team||'',err:INST.lastErr||null};INST.lastErr=null;
 o.history=store.get('cbl_cases_v1',[]).slice(-40).reverse().map(x=>({d:x.d,team:x.team||'',name:x.name,mode:MODE_NAME[x.mode]||x.mode,score:x.score,grade:x.grade,pass:x.pass,outcome:x.outcome,time:x.time}));
 if(!S)return o;
 o.caseName=S.C.name;o.modeName=MODE_NAME[S.mode]||S.mode;o.time=S.t;o.paused=S.paused;o.ended=!!S.ended;o.speed=S.speed||1;o.hints=!!S.hints;o.testMode=S.mode==='test';
 o.marks=(S.marks||[]).slice(-30);o.nts=S.nts||{};o.notes=S.notes.slice(-8);
 o.checklist=instChecklist();o.kpi=instKpi();
 if(S.ended){o.result={total:S.result.total,grade:S.result.grade,pass:S.result.pass,outcome:S.outcome,items:S.result.items.map(i=>({cat:i.cat,label:i.label,pts:i.pts,max:i.max,detail:i.detail}))};o.debrief=instDebrief();o.crit=S.crit.map(c=>({t:c.t,text:c.text}));o.cautions=S.cautions.slice(-10).map(c=>({t:c.t,text:c.text}));}
 if(!o.has&&!S.ended)return o;
 const P=S.P;
 o.P={rhythm:P.rhythm,rhName:RH[P.rhythm].name,pulse:P.pulse,paceCapture:P.paceCapture,hr:P.hr,sbp:P.sbp,sbpT:P.sbpT,spo2:P.spo2,etco2:P.etco2,cause:P.cause,causeName:P.cause?CAUSES[P.cause].name:null,causeFixed:P.causeFixed,epiCirc:P.epiCirc,antiarr:P.antiarr,access:P.access,airway:P.airway,pads:P.pads};
 o.comp=compNow();try{o.mon=monShown();}catch(e){o.mon=null;}
 o.def=({idle:'대기',charging:'충전 중',charged:'충전 완료',syncing:'동기화 대기'})[S.def.state]||S.def.state;
 o.cb=({idle:'미호출',coming:'오는 중',arrived:'도착'})[S.codeBlue.status]||S.codeBlue.status;
 o.team2=S.members.map(m=>({name:m.name,role:m.role,task:m.task?(TASKS[m.task]&&TASKS[m.task].busy)||m.task:null,paused:!!m.paused,pct:m.prep?Math.min(100,Math.round(m.prog/m.prep*100)):100})).concat((S.away||[]).map(a=>({name:a.m.name,role:a.m.role,task:'자리 비움',away:Math.round(a.back-S.t)})));
 o.log=S.log.slice(-18).reverse().map(e=>({t:e.t,text:e.text,type:e.type}));
 o.script=(S.cuEv||[]).map(e=>({when:e.when,sec:e.sec,type:e.type,v:e.v,done:e.done}));
 return o;
}
function instSend(){if(!INST.link||!instLive())return;try{INST.link.send(instState());}catch(e){}}
/* ---- 결과 기록에 팀 이름 ---- */
const __endCaseI=endCase;endCase=function(){const was=S&&S.ended;__endCaseI.apply(this,arguments);if(!was&&S&&S.ended){try{const list=store.get('cbl_cases_v1',[]);if(list.length){const L=list[list.length-1];L.team=S.team||INST.team||'';L.marks=(S.marks||[]).length;store.set('cbl_cases_v1',list);}}catch(e){}instSend();}};
/* ---- 학생 디브리핑에 강사 관찰 ---- */
const NTS_DOM=[['lead','리더십·역할 분담'],['comm','의사소통(폐쇄 루프)'],['aware','상황 인식'],['res','자원 활용·지원 요청'],['team','팀워크·상호 존중']];
const __renderDebriefI=renderDebrief;
renderDebrief=function(tab){__renderDebriefI.apply(this,arguments);if(!S||tab!=='score')return;const marks=S.marks||[],nts=S.nts||{};const rated=NTS_DOM.filter(d=>nts[d[0]]);if(!marks.length&&!rated.length)return;
 const el=$('#scr-debrief');if(!el)return;const box=document.createElement('div');box.className='inst-dbox';
 box.innerHTML='<b>강사 관찰</b>'+(rated.length?'<div class="nts">'+rated.map(d=>'<span>'+d[1]+' <i>'+'●'.repeat(nts[d[0]])+'<em>'+'●'.repeat(5-nts[d[0]])+'</em></i></span>').join('')+'</div>':'')+
  (marks.length?'<ul>'+marks.map(m=>'<li class="'+m.kind+'"><time>'+fmt(m.t)+'</time>'+(m.kind==='good'?'잘한 점':'개선점')+(m.text?' — '+esc(m.text):'')+'</li>').join('')+'</ul>':'');
 const head=el.querySelector('.db-head');if(head)head.insertAdjacentElement('afterend',box);else el.prepend(box);};
/* ---- 강사 창 열기 ---- */
function openInstWin(){
 instLink();
 if(window.cblBridge&&window.cblBridge.openInst){window.cblBridge.openInst();toast('강사 창을 열었습니다. 보조 모니터가 있으면 그쪽에 뜹니다.');return;}
 let w=null;try{w=window.open(location.href.split('#')[0]+'#instructor','cbl-instructor','width=1220,height=860');}catch(e){}
 if(w){toast('강사 창을 열었습니다. 노트북 화면 쪽으로 옮겨 두세요.');return;}
 openDlg('<h2>강사 창을 열 수 없는 환경입니다</h2><p>지금 보고 있는 웹 미리보기는 새 창 열기를 막고 있습니다. 다음 중 하나를 쓰세요.</p><ul><li><b>설치판(코드블루 리더 앱)</b> — 강사 창이 보조 모니터에 자동으로 열리고, 휴대폰 조종도 됩니다.</li><li>같은 브라우저에서 이 페이지 주소 끝에 <code>#instructor</code>를 붙여 새 창으로 열면 자동 연결됩니다.</li></ul><div class="acts"><button class="btn" data-act="closeDlg">닫기</button><button class="btn primary" data-act="instDrawer">이 화면 안에서 간단 강사 패널 열기</button></div>',true);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="instWin"],[data-act="instDrawer"]');if(!b)return;e.stopPropagation();e.preventDefault();
 if(b.dataset.act==='instWin')openInstWin();else{closeDlg();if(S&&curScreen==='sim'){instOpen=true;renderInst();}else toast('케이스를 시작한 뒤 열 수 있습니다.');}},true);
if(window.CB){CB.tick=tick;CB.endCase=endCase;}
(function(){
 if(location.hash==='#instructor'){try{const v=document.getElementById('hero-vid');if(v){v.pause();v.removeAttribute('src');}}catch(e){}curScreen='inst';if(typeof startInstConsole==='function')startInstConsole();return;}
 instLink();setInterval(instSend,400);
 try{document.documentElement.classList.remove('proj');store.set('cbl_proj',false);}catch(e){}
})();
