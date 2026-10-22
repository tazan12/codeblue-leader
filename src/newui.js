
/* ============ 실사 스테이지 · 새 인터페이스 ============ */
const STAFF_IX={m1:0,m2:1,m3:2,m4:3,m5:4};
function staffImg(id){return IMG.staff[STAFF_IX[id]||0];}
// 사진 좌표(가로 1440 × 세로 849 기준 백분율)
const PT={head:[27.4,49.2],mouth:[31.0,47.6],carotid:[35.4,46.8],chest:[41.6,50.6],padR:[38.6,40.5],padL:[45.6,59.5],armR:[41.5,33.0],handR:[57.4,33.6],armL:[50.5,68.2],femoral:[55.5,52.5],leg:[70.0,42.5],etco2:[24.5,58]};
const STN={cpr:[48.5,9],head:[9.2,49],head2:[9.2,73],pads:[34,84],arm:[48,84],armR:[56,19.5],drug:[62,84],proc:[29,19.5],leg:[76,84]};
Object.assign(TASKS.spo2,{st:'armR'});Object.assign(TASKS.cuff,{st:'armR'});Object.assign(TASKS.ecg12,{st:'pads'});
const ICON={
 cpr:'<svg viewBox="0 0 24 24" fill="none" stroke="#1b2a33" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="M9 3v4M15 3v4M7 7h10"/></svg>',
 etco2:'<svg viewBox="0 0 24 24" fill="none" stroke="#1b2a33" stroke-width="1.8" stroke-linecap="round"><path d="M3 17h3V9h6v8h3V9h6"/></svg>',
 lab:'<svg viewBox="0 0 24 24" fill="none" stroke="#1b2a33" stroke-width="1.8" stroke-linecap="round"><path d="M9 3h6M10 3v13a2 2 0 0 0 4 0V3"/><path d="M10 11h4" stroke="#c42b2b"/></svg>',
 needle:'<svg viewBox="0 0 24 24" fill="none" stroke="#1b2a33" stroke-width="1.8" stroke-linecap="round"><path d="M4 20l9-9M11 7l6 6M14 4l6 6M17 7l-3 3"/></svg>',
 vagal:'<svg viewBox="0 0 24 24" fill="none" stroke="#1b2a33" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M5 21c1-4 4-6 7-6s6 2 7 6"/><path d="M16 8h5"/></svg>'
};
const TILE_IMG={bvm:'bvm',nrb:'nrb',ett:'ett',pads:'pads',spo2:'spo2',cuff:'cuff',iv:'iv',io:'io',ecg12:'defib',auscult:'steth',pocus:'pocus',pericardio:'drug'};
function tileIcon(k){return TILE_IMG[k]?'<img src="'+IMG.eq[TILE_IMG[k]]+'" alt="">':(ICON[k]||ICON.cpr);}
const DOCK_TABS=[['care','처치'],['drug','약물'],['cause','검사·원인'],['team','팀 조정']];
const CARE=['cpr','bvm','ett','nrb','pads','spo2','cuff','etco2','iv','io'];
const CAUSE=['lab','ecg12','auscult','pocus','needle','pericardio','vagal'];
const ROLE_PREF={ett:['전공의','인턴','간호사'],pocus:['전공의','인턴','간호사'],needle:['전공의','인턴','간호사'],pericardio:['전공의','인턴','간호사'],io:['전공의','인턴','간호사'],bvm:['인턴','전공의','간호사'],cpr:['간호사','인턴','전공의'],drug:['간호사','전공의','인턴'],iv:['간호사','인턴','전공의'],lab:['간호사','인턴','전공의']};
const TASK_SUB={cpr:'가슴 누르기',bvm:'30:2 / 10회·분',ett:'전문기도기',nrb:'자발호흡 시',pads:'ECG·제세동',spo2:'손가락 센서',cuff:'NIBP',etco2:'카프노그래피',iv:'18G',io:'경골',lab:'혈액가스·전해질',ecg12:'ST 변화',auscult:'호흡음',pocus:'심장·폐·IVC',needle:'긴장성 기흉',pericardio:'심장눌림증',vagal:'변형 발살바'};

function compRunning(){return S.members.find(m=>m.task==='cpr'&&m.prog>=m.prep);}
function pickMember(key){
 if(S.ui.fixed){const m=M(S.ui.fixed);S.ui.fixed=null;if(m)return m;}
 const pref=ROLE_PREF[key]||['간호사','인턴','전공의'];
 const idle=S.members.filter(m=>!m.task);
 if(!idle.length)return null;
 idle.sort((a,b)=>pref.indexOf(a.role)-pref.indexOf(b.role));
 return idle[0];
}
function orderTask(key,payload){
 const probe={id:'_',task:null};
 if(key==='cpr'){const c=compRunning();if(c&&!S.ui.fixed){const m=pickMember('cpr');if(!m){toast('교대할 수 있는 팀원이 없습니다. 팀원 카드를 눌러 지정하세요.');return;}assign(m,'cpr');return;}}
 if(key!=='cpr'&&key!=='drug'){const blk=taskBlock(key,probe);if(blk){toast(blk);return;}}
 if(key==='bvm'&&S.members.some(m=>m.task==='bvm')){toast('이미 환기 중입니다. 팀 조정 탭에서 환기 횟수를 조절하세요.');return;}
 const m=pickMember(key);
 if(!m){toast('모든 팀원이 업무 중입니다. 아래 팀원 카드를 눌러 지정하면 하던 일을 멈추고 새 업무를 맡습니다.');return;}
 if(key==='drug'&&S.P.access==='none'){toast('정맥로나 골내로가 필요합니다.');return;}
 assign(m,key,payload);
}

/* ---- 감시장치 ---- */
function ensureMonitor(){
 const cv=$('#mon-cv');requestAnimationFrame(()=>{monSweep=new Sweep(cv,[
  {fn:t=>S.eng.ecg(t),min:-1.5,max:1.8,color:cssv('--ecg')},
  {fn:t=>S.eng.pleth(t),min:-0.1,max:1.4,color:cssv('--pleth')},
  {fn:t=>S.eng.co2(t),min:-2,max:55,color:cssv('--co2')}],112);});
}
function renderMonitorNums(){
 const P=S.P,r=RH[P.rhythm];
 let hr='--';if(P.pads){hr=r.cont?'---':Math.round(P.paceCapture?P.pace.rate:(P.holdUntil>S.t?0:P.hr));}else if(P.probe&&P.pulse)hr=Math.round(P.hr);
 $('#mn-hr .v').textContent=hr;$('#mn-hr').classList.toggle('alarm',P.pads&&(!P.pulse||P.hr<45||P.hr>150));
 $('#mn-hr-s').textContent=P.pace.on?'PACE '+P.pace.rate+'·'+P.pace.mA+'mA':'';
 $('#mn-sp .v').textContent=P.probe?(P.pulse&&!P.compressing?Math.round(P.spo2):'---'):'--';$('#mn-sp').classList.toggle('alarm',P.probe&&(!P.pulse||P.spo2<90));
 const recent=S.t-S.eng.lastVent<30;$('#mn-co .v').textContent=P.etco2Sensor?(recent?Math.round(P.etco2):'0'):'--';
 const n=S.nibp;$('#mn-bp .v').textContent=n.busy?'측정 중':(n.last?(n.last.ok?n.last.txt:'---'):'--/--');
 $('#mn-bp-s').textContent=n.last&&!n.busy?fmt(S.t-n.last.t)+' 전':'';
 $('#b-auto').classList.toggle('on',n.auto);$('#b-read').disabled=!P.pads;
 $('#msg-ecg').textContent=P.pads?(P.compressing?'압박 잡음':''):'리드 없음 · 패드 부착 필요';
 $('#msg-sp').textContent=P.probe?(P.compressing?'신호 불량':''):'센서 없음';
 $('#msg-co').textContent=P.etco2Sensor?(recent?'':'무호흡 30초'):'센서 없음';
}
function openRead(){
 if(!S.P.pads)return;const el=$('#readpop');
 el.innerHTML='<div class="ph" style="margin:0"><span class="label" style="color:var(--mon-ink)">리듬 판독 — 지금 모니터의 리듬을 고르세요'+(compNow()?' · 압박 중':'')+'</span><button class="mbtn" data-act="readClose">닫기</button></div><div class="rg">'+READS.map(([k,l])=>'<button class="r" data-readv="'+k+'">'+esc(l)+'</button>').join('')+'</div>';
 el.hidden=false;
}
function doRead(k){
 const P=S.P,ok=acceptReads(P).includes(k),art=compNow();
 S.readings.push({t:S.t,choice:k,ok,art,actual:P.paceCapture?'PACED':P.rhythm,pulse:P.pulse});
 log('리더 판독: '+READ_NAME[k]+(art?' (압박 중)':''),'act');$('#readpop').hidden=true;
 if(S.mode!=='test')toast(art?'압박 잡음이 섞인 판독입니다. 리듬 확인은 짧게 멈춘 뒤 합니다.':ok?'판독이 맞습니다.':'판독이 실제 리듬과 다릅니다. 다시 보세요.');else toast('판독을 기록했습니다.');
}

/* ---- 상단 바 ---- */
function renderTop(){
 const ctx=$('#tb-ctx'),act=$('#tb-actions');const proj=document.documentElement.classList.contains('proj');
 if(curScreen==='sim'&&S){
  const P=S.P,arrest=!P.pulse,modeName={basic:'기초 훈련',adv:'심화 훈련',test:'평가 모드'}[S.mode];
  const ccf=S.arrestTime>5?Math.round(S.compTime/S.arrestTime*100):null;const pause=S.curPause?S.curPause.len:0;
  const cyc=S.cycleStart!=null&&P.compressing?S.t-S.cycleStart:null;const le=lastGiven('epi1');const ea=le!=null?S.t-le:null;
  const kp=(cls,l,v)=>'<div class="kpi '+cls+'"><span class="l">'+l+'</span><span class="v">'+v+'</span></div>';
  setHTML(ctx,'<span class="tb-clock num">'+fmt(S.t)+'</span><div class="tb-case"><b>'+(S.mode==='test'?'평가 케이스':(S.hideName||window.CBL_RAND)?'무작위 케이스':esc(S.C.name))+'</b><span>'+modeName+(S.paused?' · 일시정지':'')+(S.instr?' · 강사 개입':'')+'</span></div>'+
   '<div class="kpis">'+kp(ccf!=null&&ccf<60?'alert':ccf>=80?'good':'','압박 분율',ccf==null?'—':ccf+'%')+kp(pause>10?'alert':'','현재 중단',arrest&&S.firstComp!=null&&!P.compressing?pause.toFixed(0)+'초':'—')+kp(cyc!=null&&cyc>=120?'due':'','CPR 주기',cyc!=null?fmt(cyc):'—')+kp(ea==null?'':ea>=180&&ea<=300?'due':ea>300&&arrest?'alert':'','에피네프린',ea!=null?fmt(ea):'—')+'</div>');
  setHTML(act,'<button class="btn sm" data-act="algo"'+(S.mode==='test'?' disabled':'')+'>알고리즘</button><button class="btn sm" data-act="pause">'+(S.paused?'계속':'일시정지')+'</button><button class="btn sm'+(snd.on?' on':'')+'" data-act="sound">효과음 '+(snd.on?'켬':'끔')+'</button><button class="btn sm'+(snd.voiceOn&&snd.on?' on':'')+'" data-act="voice">음성 '+(snd.voiceOn?'켬':'끔')+'</button><button class="btn sm'+(typeof instLive==='function'&&instLive()?' on':'')+'" data-act="instWin" style="color:var(--inst)" title="강사용 조작 창을 따로 엽니다. 보조 모니터(노트북 화면)에 두고 쓰세요.">'+(typeof instLive==='function'&&instLive()?'강사 창 ● 연결됨':'강사 창 열기')+'</button><button class="btn sm danger" data-act="endAsk">케이스 종료</button>');
 } else {setHTML(ctx,'');setHTML(act,'<button class="btn sm'+(typeof instLive==='function'&&instLive()?' on':'')+'" data-act="instWin" style="color:var(--inst)" title="강사용 조작 창을 따로 엽니다. 보조 모니터(노트북 화면)에 두고 쓰세요.">'+(typeof instLive==='function'&&instLive()?'강사 창 ● 연결됨':'강사 창 열기')+'</button>'+(curScreen==='menu'?'':'<button class="btn sm" data-go="menu">처음 화면</button>'));}
}

/* ---- 스테이지 ---- */
function buildRoom(){
 const st=$('#stage');if(!st)return;
 const at=(p)=>'left:'+p[0]+'%;top:'+p[1]+'%';
 const hs=(p,w,act,label)=>'<button class="hs" style="'+at(p)+';width:'+w+'%;aspect-ratio:1" data-'+act+' aria-label="'+label+'"><span>'+label+'</span></button>';
 const pt=(k)=>{const o=IMG.patch[k];return '<img class="pt" id="pt-'+k+'" src="'+o.src+'" alt="" style="left:'+o.x+'%;top:'+o.y+'%;width:'+o.w+'%">';};
 st.innerHTML='<div class="cam" id="cam"><div class="scene" id="scene"><img class="stage-img" src="'+IMG.room+'" alt="병상에 누운 환자를 위에서 본 병실 사진">'+
  '<div class="chg" id="cg"><div class="chest" style="background-image:url('+IMG.room+')"></div>'+pt('pads')+'</div>'+
  ['io','iv','cuff','spo2','nrb','ett','bvm'].map(pt).join('')+'<img class="pt" id="pt-bag" src="'+IMG.patch.bvm.src+'" alt="" style="left:'+IMG.patch.bvm.x+'%;top:'+IMG.patch.bvm.y+'%;width:'+IMG.patch.bvm.w+'%">'+
  '<div class="cyan" id="cyan"></div><div class="rise" id="rise"></div><div class="pressfx" id="pressfx"></div>'+pt('cpr')+
  '<div class="drip" id="drip"><i></i><i></i><i></i></div><div class="ivtag" id="ivtag"></div><div class="lamp"></div></div>'+
  hs(PT.chest,9,'stask="cpr"','가슴압박')+hs([26.5,48],8,'stask="bvm"','기도·환기')+hs(PT.padR,6,'stask="pads"','패드 부착')+hs(PT.armL,6,'stask="iv"','정맥로')+hs(PT.armR,6,'stask="cuff"','혈압 커프')+hs(PT.handR,5,'stask="spo2"','SpO₂ 센서')+hs(PT.leg,7,'stask="io"','골내로')+
  '<button class="site" data-site="경동맥" style="'+at(PT.carotid)+'" aria-label="경동맥에서 맥박 확인"></button><button class="site" data-site="대퇴동맥" style="'+at(PT.femoral)+'" aria-label="대퇴동맥에서 맥박 확인"></button>'+
  '<div class="cart" id="cart"><img src="'+IMG.eq.defib+'" alt=""><span>제세동기·응급카트</span></div>'+
  '<div id="toks"></div></div>'+
  '<div class="flash" id="flash"></div><div class="glow" id="glow"></div><div class="beacon" id="beacon"></div><div class="cbband" id="cbband"><b>CODE BLUE</b><span>7병동 3호실 · 소생팀 출동</span></div>'+
  '<div class="stage-info" id="stage-info"></div>'+
  '<button class="phone" id="phone" data-act="codeblue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg><span id="phone-t">코드블루 요청</span></button>';
 const g=$('#toks');g._sig=null;g._known=new Set(S?S.members.map(m=>m.id):[]);
 st._fx={shocks:S?S.shocks.length:0,vent:0,rosc:false};
}
function fxOnce(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);clearTimeout(el['_t'+cls]);el['_t'+cls]=setTimeout(()=>el.classList.remove(cls),ms);}
function tokPos(){
 const used={},res={};let idle=0;
 S.members.forEach(m=>{const st=m.task?TASKS[m.task].st:null;if(!st||!STN[st]){res[m.id]=[93.5,27+idle*15];idle++;return;}
  const k=used[st]||0;used[st]=k+1;const p=STN[st];res[m.id]=[p[0]+k*7.5,p[1]];});
 return res;
}
function lastSay(m){for(let i=S.log.length-1;i>=0;i--){const e=S.log[i];if(S.t-e.t>3.6)break;if(e.type==='comm'&&e.text.startsWith(m.name+': '))return e.text.slice(m.name.length+2);}return null;}
function renderStage(){
 const st=$('#stage'),P=S.P;if(!st||!st.firstChild)return;
 const on=(id,v)=>{const e=st.querySelector('#pt-'+id);if(!e)return;const was=e.classList.contains('on');e.classList.toggle('on',!!v);if(v&&!was)fxOnce(e,'pop',900);};
 on('pads',P.pads);on('cuff',P.cuff);on('spo2',P.probe);on('iv',P.access==='iv');on('io',P.access==='io');
 on('ett',P.airway==='ett');on('bvm',P.bvm&&P.airway!=='ett');{const bg=st.querySelector('#pt-bag');if(bg)bg.classList.toggle('on',!!(P.bvm&&P.airway!=='ett'));}on('nrb',P.o2==='nrb'&&!P.bvm&&P.airway!=='ett');on('cpr',P.compressing);
 $('#cart').classList.toggle('on',S.cart);
 $('#cyan').style.opacity=!P.pulse?0.95:(P.spo2<88?0.5:0);
 const cp=$('#pt-cpr'),pf=$('#pressfx'),cmp=(60/Math.max(60,P.compRate||110)).toFixed(3)+'s';cp.style.setProperty('--cmp',cmp);pf.style.setProperty('--cmp',cmp);pf.classList.toggle('on',P.compressing);
 const fx=st._fx||(st._fx={shocks:0,vent:0,rosc:false});
 const cg=$('#cg'),sc=$('#scene');cg.style.setProperty('--cmp',cmp);sc.style.setProperty('--cmp',cmp);
 cg.classList.toggle('cpr',P.compressing);sc.classList.toggle('cprs',P.compressing);
 const spont=P.pulse&&P.breathing==='normal'&&!P.bvm&&!P.compressing;cg.classList.toggle('breathe',spont);cg.classList.toggle('fast',spont&&(P.sbp<85||P.spo2<90));
 cg.classList.toggle('agonal',!P.pulse&&P.breathing==='agonal'&&!P.compressing&&!P.bvm);
 const cbOn=S.codeBlue.status==='coming';$('#beacon').classList.toggle('on',cbOn||(!P.pulse&&S.t<(S.codeBlue.arr||0)+6));$('#cbband').classList.toggle('on',cbOn);
 if(fx.rh!==P.rhythm){if(fx.rh&&P.pads)fxOnce($('#monitor'),'rchange',1600);fx.rh=P.rhythm;}
 if(S.eng.lastVent>fx.vent+0.5){fx.vent=S.eng.lastVent;if(P.bvm||P.airway==='ett'){fxOnce($('#pt-bag'),'vent',900);fxOnce($('#pt-ett'),'vent',900);fxOnce($('#rise'),'up',1100);fxOnce(cg,'vent',1100);}}
 const nsh=S.shocks.filter(x=>!x.pace).length;if(nsh>fx.shocks){fx.shocks=nsh;fxOnce($('#flash'),'go',650);fxOnce($('#cam'),'jolt',520);fxOnce(cg,'twitch',600);}
 if(S.roscConfirmed&&!fx.rosc){fx.rosc=true;fxOnce($('#glow'),'go',2200);}
 const inf=S.infusions.find(f=>f.fid.startsWith('ns'))||S.infusions[0];const ivOn=P.access==='iv'&&inf;
 $('#drip').classList.toggle('on',!!ivOn);const tg=$('#ivtag');tg.classList.toggle('on',!!ivOn);if(ivOn){const t=esc(inf.name)+(inf.kind==='timed'?' · '+Math.round(inf.el/inf.dur*100)+'%':' · 주입 중');if(tg._h!==t){tg.innerHTML='<i></i>'+t;tg._h=t;}}
 st.querySelectorAll('.site').forEach(s=>{s.classList.toggle('on',s.dataset.site===S.site);s.classList.toggle('checking',!!S.assess&&s.dataset.site===S.site);});
 const ph=$('#phone'),cb=S.codeBlue.status;ph.disabled=cb!=='idle';$('#phone-t').textContent=cb==='idle'?'코드블루 요청':cb==='coming'?'출동 중 '+Math.max(0,Math.ceil(S.codeBlue.arr-S.t))+'초':'코드블루 팀 도착';
 const g=$('#toks'),sig=S.members.map(m=>m.id).join(',');
 const fresh=[];if(g._sig!==sig){g._sig=sig;g._known=g._known||new Set();S.members.forEach(m=>{if(!g._known.has(m.id)){fresh.push(m.id);g._known.add(m.id);}});g.innerHTML=S.members.map(m=>'<button class="tok" data-sel="'+m.id+'" id="tok-'+m.id+'" aria-label="'+esc(m.name)+' 지정"><span class="ring"><img src="'+staffImg(m.id)+'" alt=""></span><span class="tag"></span><span class="bubble" hidden></span></button>').join('');}
 const pos=tokPos();
 S.members.forEach(m=>{const e=g.querySelector('#tok-'+m.id);if(!e)return;const p=pos[m.id];const pk=p[0]+','+p[1];if(fresh.includes(m.id)){e.style.left='106%';e.style.top=p[1]+'%';fxOnce(e,'walk',1500);requestAnimationFrame(()=>requestAnimationFrame(()=>{e.style.left=p[0]+'%';}));}else{if(e._pk&&e._pk!==pk)fxOnce(e,'walk',950);e.style.left=p[0]+'%';e.style.top=p[1]+'%';}e._pk=pk;e.classList.toggle('rt',p[0]>78);
  const T=m.task?TASKS[m.task]:null;const pct=T?(m.prog<m.prep?Math.round(m.prog/m.prep*100):100):0;e.querySelector('.ring').style.setProperty('--p',pct+'%');
  e.classList.toggle('sel',S.ui.fixed===m.id);e.classList.toggle('paused',!!m.paused);
  const tag=esc(m.name)+(T?' · <b>'+esc(m.task==='drug'&&m.payload?FORM[m.payload].dname:T.busy)+'</b>':'');const te=e.querySelector('.tag');if(te._h!==tag){te.innerHTML=tag;te._h=tag;}
  const say=lastSay(m),b=e.querySelector('.bubble');if(say){if(b.textContent!==say)b.textContent=say;b.hidden=false;}else b.hidden=true;});
 const last=S.assessments.length?S.assessments[S.assessments.length-1]:null;
 const chips=[['의식',S.conscLast!=null?P.mental:'미확인',S.conscLast!=null&&P.mental==='무반응'?'bad':''],['맥박',last&&last.valid?(last.pulse?'있음':'없음')+' '+fmt(last.s):'미확인',last&&last.valid&&!last.pulse?'bad':last&&last.valid?'ok':''],
  ['기도',P.airway==='ett'?'기관내관':P.bvm?'백마스크':P.o2==='nrb'?'NRB':'—',''],['혈관',P.access==='iv'?'정맥로':P.access==='io'?'골내로':'—','']];
 setHTML($('#stage-info'),'<div class="chips">'+chips.map(c=>'<span class="chip '+c[2]+'">'+c[0]+' '+esc(c[1])+'</span>').join('')+'</div>');
 setHTML($('#story'),'<b>'+esc(S.C.who||'')+'</b><span>'+esc(S.C.story||'')+'</span>');
}

/* ---- 제세동기 ---- */
function renderDefib(){
 const d=S.def,P=S.P,charged=d.state==='charged',guide=S.mode!=='test';
 const contact=S.members.some(m=>m.task&&TASKS[m.task].contact&&!m.paused&&m.prog>0);
 const paused=S.members.some(m=>m.paused);
 const lastShock=S.shocks.length?S.shocks[S.shocks.length-1]:null;
 const nClear=guide&&(charged||d.state==='charging')&&contact,nShock=guide&&charged&&!contact,nResume=guide&&paused&&d.state==='idle'&&lastShock&&S.t-lastShock.t<20;
 const nsh=S.shocks.filter(x=>!x.pace).length;
 setHTML($('#defib'),
  '<div class="drow"><span class="label">제세동기</span><div class="energy"><button class="btn sm ghost" data-act="en" data-v="-1" aria-label="에너지 낮춤">−</button><span class="val num">'+d.energy+'<small> J</small></span><button class="btn sm ghost" data-act="en" data-v="1" aria-label="에너지 높임">+</button></div>'+
  '<button class="btn sm'+(d.sync?' on':'')+'" data-act="sync">SYNC '+(d.sync?'켬':'끔')+'</button><button class="btn sm'+(P.pace.on?' on':'')+'" data-act="pace">PACE '+(P.pace.on?'켬':'끔')+'</button>'+
  '<span class="dstate">'+(P.pads?'패드 연결':'패드 없음')+(nsh?' · 충격 '+nsh+'회':'')+(d.state==='charging'?' · 충전 '+Math.max(0,Math.ceil(d.chT-S.t))+'초':charged?' · 충전 완료':'')+'</span>'+
  (d.state!=='idle'?'<button class="btn sm ghost" data-act="disarm">충전 해제</button>':'')+'</div>'+
  '<div class="steps">'+
   '<button class="step" data-act="charge"'+(d.state!=='idle'||!P.pads?' disabled':'')+'><i>1 · C</i>'+(d.state==='charging'?'충전 중':'충전')+'</button>'+
   '<button class="step'+(nClear?' next':'')+'" data-act="clear"><i>2 · A</i>모두 떨어지세요</button>'+
   '<button class="step'+(nResume?' next':'')+'" data-act="resume"'+(paused?'':' disabled')+'><i>4</i>처치 재개</button>'+
   '<button class="shock'+(charged?' armed':'')+(d.state==='charging'?' charging':'')+'" data-act="shock" style="--chg:'+(d.state==='charging'?Math.round(clamp(1-(d.chT-S.t)/5,0,1)*100):0)+'%"'+(charged?'':' disabled')+'>'+(d.state==='syncing'?'동기화 대기':'SHOCK')+'<small>3 · S'+(nShock?' · 지금':'')+'</small></button>'+
  '</div>'+
  (P.pace.on?'<div class="pace"><span class="label">경피 조율</span><span class="grp">속도 <b class="pv num">'+P.pace.rate+'</b> ppm <button class="btn sm ghost" data-act="pr" data-v="-10">−</button><button class="btn sm ghost" data-act="pr" data-v="10">+</button></span><span class="grp">전류 <b class="pv num">'+P.pace.mA+'</b> mA <button class="btn sm ghost" data-act="pm" data-v="-10">−</button><button class="btn sm ghost" data-act="pm" data-v="10">+</button></span><span class="dstate">'+(P.paceCapture?'포획됨':'포획 안 됨')+'</span></div>':''));
}

/* ---- 지시 도크 ---- */
function renderDock(){
 const P=S.P,a=S.assess,ad=a?S.t-a.s:0,cb=S.codeBlue.status,tab=S.ui.dtab||'care';
 let h='<div class="lead">'+
  '<button class="btn" data-act="consc"'+(S.flags.conscBusy?' disabled':'')+'>의식 확인</button>'+
  '<button class="btn'+(cb==='idle'?' hot':'')+'" data-act="codeblue"'+(cb!=='idle'?' disabled':'')+'>'+(cb==='idle'?'코드블루 요청':cb==='coming'?'출동 중 '+Math.max(0,Math.ceil(S.codeBlue.arr-S.t))+'초':'코드블루 도착')+'</button>'+
  '<div class="assess">'+(a?'<button class="btn sm primary" data-act="assessEnd">사정 종료</button>':'<button class="btn sm" data-act="assess">호흡·맥박 사정</button>')+
  '<div class="seg"><button data-site="경동맥" class="'+(S.site==='경동맥'?'on':'')+'">경동맥</button><button data-site="대퇴동맥" class="'+(S.site==='대퇴동맥'?'on':'')+'">대퇴</button></div><span class="t num'+(a?(ad>10?' over':ad>=5?' ok':''):'')+'">'+(a?ad.toFixed(1):'—')+'</span></div>'+
  '<button class="btn" data-act="clear">모두 떨어지세요</button><button class="btn" data-act="resume"'+(S.members.some(m=>m.paused)?'':' disabled')+'>처치 재개</button>'+
  '<button class="btn" data-act="read"'+(P.pads?'':' disabled title="패드나 심전도 전극을 붙이면 판독할 수 있습니다"')+'>리듬 판독</button>'+
  (S.roscConfirmed&&P.pulse?'<button class="btn'+(S.ttm?'':' primary')+'" data-act="ttm"'+(S.ttm?' disabled':'')+'>'+(S.ttm?'목표체온 결정됨':'목표체온 조절 결정')+'</button>':'')+
 '</div>';
 h+='<div class="roster">'+S.members.map(m=>{const T=m.task?TASKS[m.task]:null;let st=T?(m.prog<m.prep?T.busy+' 준비 중':T.busy):'대기 — 지시 가능';if(m.task==='drug'&&m.payload)st='약물: '+FORM[m.payload].dname;if(m.paused)st+=' · 손 뗌';
  if(m.task==='cpr'&&m.prog>=m.prep)st+=' '+fmt(m.cprT);const pct=T&&m.prog<m.prep?Math.round(m.prog/m.prep*10)*10:(T&&T.cont?100:0);
  return '<div class="mem'+(T?' busy':'')+(m.paused?' paused':'')+(S.ui.fixed===m.id?' sel':'')+'" role="button" tabindex="0" data-sel="'+m.id+'"><img src="'+staffImg(m.id)+'" alt=""><div style="min-width:0"><div class="nm">'+esc(m.name)+'<small>'+esc(m.role)+'</small></div><div class="ts">'+esc(st)+'</div>'+(T?'<div class="bar"><i style="width:'+pct+'%"></i></div>':'')+'</div>'+(T?'<button class="x" data-stop="'+m.id+'" aria-label="'+esc(m.name)+' 업무 중지" title="업무 중지">✕</button>':'')+'</div>';}).join('')+'</div>';
 const fx=S.ui.fixed?M(S.ui.fixed):null;
 h+='<div class="dtabs">'+DOCK_TABS.map(([k,l])=>'<button data-dtab="'+k+'" class="'+(tab===k?'on':'')+'">'+l+'</button>').join('')+'</div>';
 h+='<p class="dhint">'+(fx?'<b>'+esc(fx.name)+'</b>에게 다음 지시가 갑니다 (하던 업무는 멈춤). 카드를 다시 누르면 해제.':'할 일을 누르면 쉬는 팀원 중 알맞은 사람이 맡습니다. 특정 팀원은 카드를 먼저 누르세요.')+'</p>';
 if(tab==='care'||tab==='cause'){
  const keys=tab==='care'?CARE:CAUSE;
  h+='<div class="tiles">'+keys.map(k=>{const who=S.members.find(m=>m.task===k);let lab=TASKS[k].label.replace('…','');let blk=taskBlock(k,{id:'_',task:null});
   if(k==='cpr'&&compRunning()){lab='가슴압박 교대';blk=null;}
   if(k==='bvm'&&who)blk='진행 중';
   return '<button class="tile'+(who?' active':'')+'" data-otask="'+k+'"'+(blk?' disabled title="'+esc(blk)+'"':'')+'><span class="ic">'+tileIcon(k)+'</span><span class="tx">'+esc(lab)+'<small>'+esc(who?who.name+' 진행 중':TASK_SUB[k]||'')+'</small></span>'+(who?'<img class="who" src="'+staffImg(who.id)+'" alt="">':'')+'</button>';}).join('')+'</div>';
 } else if(tab==='drug'){
  if(P.access==='none')h+='<p class="dhint" style="color:var(--warn)">정맥로나 골내로를 먼저 확보해야 약물을 줄 수 있습니다.</p>';
  if(!S.cart)h+='<p class="dhint" style="color:var(--warn)">약물은 응급카트에 있습니다. 코드블루를 요청하세요.</p>';
  const dis=P.access==='none'||!S.cart;
  h+='<div class="drugs">'+DRUGS.map(D=>'<div class="dcard"><div class="dh"><b>'+esc(D.name)+'</b>'+(lastGivenDrug(D.id)!=null?'<span class="chip team">'+fmt(S.t-lastGivenDrug(D.id))+' 전</span>':'')+'</div><div class="doses">'+D.forms.map(f=>'<button class="btn sm" data-drug="'+f.id+'"'+(dis?' disabled':'')+'>'+esc(S.mode==='test'?f.label.replace(/\s*\([^)]*\)\s*$/,''):f.label)+'</button>').join('')+'</div>'+(S.hints?'<div class="info">'+esc(D.info)+'</div>':'')+'</div>').join('')+'</div>';
 } else {
  const c=compRunning(),v=S.members.find(m=>m.task==='bvm'&&m.prog>=m.prep);
  h+='<div class="ctrl">';
  if(c){const rateX=clamp((c.rate-80)/60,0,1)*100,depX=clamp((c.depth-3.5)/3,0,1)*100;
   h+='<div class="box"><span class="label">가슴압박 · '+esc(c.name)+' '+fmt(c.cprT)+'</span><div class="cprq"><span>속도</span><div class="meter"><span class="zone" style="left:33.3%;width:33.3%"></span><span class="pin" style="left:'+rateX+'%"></span></div><span class="num">'+Math.round(c.rate)+'/분</span><span>깊이</span><div class="meter"><span class="zone" style="left:50%;width:33.3%"></span><span class="pin" style="left:'+depX+'%"></span></div><span class="num">'+c.depth.toFixed(1)+' cm</span></div><div style="display:flex;gap:.3rem;flex-wrap:wrap"><button class="btn sm" data-act="feedback" data-m="'+c.id+'">피드백: 110회/분 · 5–6 cm</button><button class="btn sm" data-otask="cpr">교대</button></div></div>';}
  else h+='<div class="box"><span class="label">가슴압박</span><span class="muted" style="font-size:.82rem">진행 중인 압박이 없습니다.</span></div>';
  if(v){h+='<div class="box"><span class="label">환기 · '+esc(v.name)+(P.airway==='ett'?' · 기관내관':'')+'</span>'+((P.airway==='ett'||!P.compressing)?'<div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap"><span style="font-size:.78rem">횟수</span><div class="seg">'+[8,10,12,20].map(x=>'<button data-act="vrate" data-m="'+v.id+'" data-v="'+x+'" class="'+(v.ventRate===x?'on':'')+'">'+x+'</button>').join('')+'</div><span class="muted" style="font-size:.74rem">회/분</span></div>':'<span class="muted" style="font-size:.78rem">압박 중 30:2로 환기합니다.</span>')+
   '<div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap"><span style="font-size:.78rem">FiO₂</span><div class="seg">'+[1,0.6,0.4,0.3].map(x=>'<button data-act="fio2" data-v="'+x+'" class="'+(P.fio2===x?'on':'')+'">'+Math.round(x*100)+'%</button>').join('')+'</div></div></div>';}
  else h+='<div class="box"><span class="label">환기</span><span class="muted" style="font-size:.82rem">환기 담당자가 없습니다.</span></div>';
  h+='</div>';
 }
 setHTML($('#dock'),h);
}
function lastGivenDrug(id){for(let i=S.drugs.length-1;i>=0;i--)if(FORM[S.drugs[i].form].drug===id)return S.drugs[i].t;return null;}

/* ---- 오른쪽 아래 ---- */
function renderSide(){
 const tab=S.ui.stab||'goal';
 const tabs=[['goal','목표'],['log','기록'],['labs','검사'+(S.labs.some(l=>S.t>=l.ready&&!l.seen)?' •':'')],['hint','도움말']];
 setHTML($('#stabs'),tabs.map(([k,l])=>'<button data-stab="'+k+'" class="'+(tab===k?'on':'')+'">'+l+'</button>').join(''));
 let h='';
 if(tab==='goal'){const cs=conditions();h='<div class="pt-sum"><b>'+esc(S.C.who||'')+'</b>'+esc(S.C.story||'')+'</div><div class="ph"><h3>'+(S.C.pulseCase&&S.roscT==null?'완료 조건':'ROSC 이후 목표 · 완료 조건')+'</h3><span class="muted num">'+cs.filter(c=>c.ok).length+'/'+cs.length+'</span></div><div class="cond">'+cs.map(c=>'<div class="'+(c.ok?'ok':'no')+'"><i>'+(c.ok?'✓':'')+'</i><span>'+esc(c.label)+(c.v?' <span class="muted num">'+esc(c.v)+'</span>':'')+'</span></div>').join('')+'</div>'+
  (S.infusions.length?'<div class="infl"><span class="label">주입 중</span>'+S.infusions.map(f=>'<div><span>'+esc(f.name)+(f.kind==='timed'?' <span class="muted num">'+Math.round(f.el/f.dur*100)+'%</span>':'')+'</span><button class="btn sm" data-inf="'+f.fid+'">중지</button></div>').join('')+'</div>':'');}
 else if(tab==='log'){h='<div class="log">'+S.log.slice().reverse().slice(0,140).map(e=>'<div class="'+e.type+'"><time>'+fmt(e.t)+'</time><span>'+esc(e.text)+'</span></div>').join('')+'</div>';}
 else if(tab==='labs'){const ready=S.labs.filter(l=>S.t>=l.ready);ready.forEach(l=>l.seen=true);
  h=!S.labs.length?'<p class="muted">검사·원인 탭에서 채혈을 지시하면 약 1분 뒤 결과가 나옵니다.</p>':'<div class="labs">'+S.labs.slice().reverse().map(l=>S.t<l.ready?'<p class="muted">'+fmt(l.req)+' 채혈 · 결과 대기 '+Math.ceil(l.ready-S.t)+'초</p>':labTable(l)).join('')+'</div>';}
 else h=S.hints?hintHTML():'<p class="muted">평가 모드에서는 도움말을 제공하지 않습니다.</p>';
 setHTML($('#sbody'),h);
}
function renderSim(){if(!S)return;try{fxTick();}catch(e){}renderTop();renderStage();renderMonitorNums();renderDefib();renderDock();renderSide();}

/* ---- 시작 안내 ---- */
function openIntro(){
 S.paused=true;S.flags.introOpen=true;const md={basic:'기초 훈련: 팀원 술기 실패가 없고, 제세동기에 다음 단계가 표시되며 힌트와 알고리즘을 볼 수 있습니다. 압박자는 2분쯤 지나면 지쳐 깊이가 얕아지니 교대하세요.',adv:'심화 훈련: 정맥로·삽관이 실패할 수 있고, 압박 담당자는 1–2분 뒤부터 지쳐 깊이가 얕아지고(교대 필요), 환기 담당자는 너무 빠르게 짤 수 있습니다.',test:'평가 모드: 힌트·알고리즘·단계 안내·약물 정보가 없습니다. 80점 이상, 중대 오류 없음, 목표 달성이면 통과입니다.'}[S.mode];
 openDlg('<span class="label">'+((S.mode==='test'||S.hideName||window.CBL_RAND)?(S.mode==='test'?'평가 케이스':'무작위 케이스'):esc(S.C.group||'사용자 정의'))+'</span><h2>'+((S.mode==='test'||S.hideName||window.CBL_RAND)?'병동 응급 호출':esc(S.C.name))+'</h2><img class="intro-img" src="'+IMG.room+'" alt=""><p><b>'+esc(S.C.who)+'</b></p><p style="margin-top:.3rem;color:var(--ink2)">'+esc(S.C.story)+'</p>'+
  '<p style="margin-top:.8rem;color:var(--ink2)">당신은 팀 리더입니다. 현장에는 간호사 2명과 인턴 1명이 있습니다. 환자를 깨워 반응을 보고, 반응이 없으면 <b>코드블루 호출</b>, 이어서 <b>호흡과 맥박을 함께</b> 확인하는 것으로 시작하세요. 아래 도크의 할 일을 누르거나 병실 사진에서 환자 몸(가슴, 머리, 팔, 다리)을 누르면 알맞은 팀원이 맡습니다.</p>'+
  '<p class="muted" style="margin-top:.5rem;font-size:.84rem">'+md+' 단축키: Space 일시정지 · C 충전 · A 모두 떨어지세요 · S 충격 · R 처치 재개</p><div class="acts"><button class="btn" data-go="menu">취소</button><button class="btn hot" data-act="introGo">시뮬레이션 시작</button></div>',true);
}
function setProj(v,quiet){document.documentElement.classList.toggle('proj',v);store.set('cbl_proj',v);if(!quiet){try{if(v&&!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});else if(!v&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch(e){}toast(v?'강의 화면: 전체 화면 + 글자·버튼 크게. 끄려면 다시 누르거나 Esc.':'강의 화면을 껐습니다.');}setTimeout(()=>{if(monSweep)monSweep.resize();if(heroSweep)heroSweep.resize();learnObjs.forEach(o=>o.sw.resize());if(quizObj)quizObj.sw.resize();},60);}
