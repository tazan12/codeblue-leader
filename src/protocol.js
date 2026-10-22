/* ============ 압박 중단 요청 · 삽관 협조 · 리듬 확인 · ROSC 선언 ============ */
const HOLD_WHY={ett:'기관내삽관',rhythm:'리듬 확인',pulse:'맥박 확인',other:''};
function anyCompPaused(){return S.members.some(m=>m.task==='cpr'&&m.paused);}
function holdComp(reason){
 if(!S)return false;const cps=S.members.filter(m=>m.task==='cpr'&&!m.paused);
 if(!cps.length&&!anyCompPaused()){toast('지금 가슴압박 중인 팀원이 없습니다.');return false;}
 cps.forEach(m=>m.paused=true);
 if(reason==='ett')S.members.filter(m=>m.task==='bvm'&&!m.paused).forEach(m=>{m.paused=true;m.ettPause=true;});
 S.hold={reason:reason||'other',t:S.t};
 log('리더: "가슴압박 잠시 멈추세요!'+(HOLD_WHY[reason]?' — '+HOLD_WHY[reason]:'')+'"','comm');
 vsay('pro','lead_hold',{urgent:true,fb:'가슴압박 잠시 멈추세요!'});
 return true;}
// 삽관: 튜브 통과 단계(마지막 5초)는 압박이 멈춰야 진행
const ETT_ATTEMPT=8; // 마지막 8초 = 후두경 삽입·튜브 통과(환기·압박 중단)
function ettAttempt(m){return m.task==='ett'&&m.prog>=m.prep-ETT_ATTEMPT;}
function stopBagForEtt(m){const bs=S.members.filter(x=>x.task==='bvm'&&x!==m&&!x.paused);
 bs.forEach(x=>{x.paused=true;x.ettPause=true;});
 if(bs.length&&!m.ettBagMsg){m.ettBagMsg=true;log(bs[0].name+': "백마스크 환기 멈춥니다. 삽관하세요."','comm');}}
function ettNeedsHold(m){
 if(!ettAttempt(m))return false;
 if(!m.ettStart){m.ettStart=S.t;log(m.name+': 후두경 삽입 — 삽관 시도 중에는 백마스크 환기를 멈춥니다.','act');}
 stopBagForEtt(m);   // 삽관 시도 중에는 항상 백깅 중단
 if(!compNow()){if(m.ettAsk&&!m.ettGo){m.ettGo=S.t;}return false;}
 if(!m.ettAsk){m.ettAsk=S.t;log(m.name+': "튜브 넣겠습니다. 가슴압박 잠시 멈춰 주세요!"','comm');msayPro(m.name,'ett_ask','튜브 넣겠습니다. 가슴압박 잠시 멈춰 주세요');
  if(S.mode!=='test')toast(m.name+'이(가) 삽관을 위해 압박 중지를 요청합니다. [압박 중지]를 누르세요.');}
 else if(S.t-m.ettAsk>15&&!m.ettNag){m.ettNag=true;log(m.name+': "압박을 멈춰야 튜브를 넣을 수 있습니다!"','warn');}
 return true;}
// 삽관 결과 처리
const __finish3=finishTask;
finishTask=function(m){const k=m.task,was=S.P.airway;__finish3(m);
 if(k!=='ett')return;
 const bag=S.members.filter(x=>x.ettPause);
 if(S.P.airway==='ett'&&was!=='ett'){
  bag.forEach(x=>{x.ettPause=false;x.paused=false;if(x.task==='bvm'&&x!==m)x.task=null;});
  setTimeoutSim(0.4,()=>{log(m.name+': "튜브 위치 확인했습니다. 압박 재개하세요!"','comm');msayPro(m.name,'ett_done','튜브 들어갔습니다. 압박 재개하세요');if(!S.P.pulse)S.flags.ettResume=S.t;});}
 else{bag.forEach(x=>{x.ettPause=false;x.paused=false;});if(bag.length)log(bag[0].name+': 백마스크 환기를 다시 시작합니다(재산소화 후 재시도).','act');}
 m.ettAsk=m.ettGo=m.ettStart=null;m.ettNag=false;m.ettBagMsg=false;};
// 삽관 업무가 중지되면 멈췄던 백깅 재개
const __stop3=stopTask;
stopTask=function(m,silent){const was=m.task;__stop3(m,silent);if(was==='ett'){S.members.filter(x=>x.ettPause).forEach(x=>{x.ettPause=false;x.paused=false;});m.ettAsk=m.ettGo=m.ettStart=null;m.ettNag=false;m.ettBagMsg=false;}};
function msayPro(name,key,fb){const v=VXMAP[name]||['F1',1];vsay('pro',v[0]+'_'+key,{rate:v[1],fb,fbo:Object.assign({rate:1.15},(typeof VOICE!=='undefined'&&VOICE[name])||{})});}

// 재개 시 중단 기록
const __resume3=resumeAll;
resumeAll=function(){const h=S.hold;__resume3();
 if(h){const len=S.t-h.t;S.holds=(S.holds||[]).concat([{reason:h.reason,t:h.t,len}]);S.hold=null;S.flags.ettResume=null;
  if(len>10&&!P_arrestOver())caution((HOLD_WHY[h.reason]||'압박')+' 때문에 가슴압박이 '+len.toFixed(1)+'초 중단되었습니다(목표 10초 미만).');}};
function P_arrestOver(){return S.P.pulse;}

// 리듬 판독: 압박 중이면 중단 요청 먼저
const __openRead3=openRead;
openRead=function(){if(!S.P.pads)return;
 if(compNow()){openDlg('<h2>리듬 확인</h2><p>가슴압박 중에는 압박 잡음 때문에 리듬을 판독할 수 없습니다.</p><p class="muted" style="margin-top:6px">압박을 <b>잠시 멈추고</b> 리듬을 확인한 뒤, 10초 안에 압박을 재개하세요. 충격 리듬이면 충전하는 동안 압박을 계속합니다.</p><div class="acts"><button class="btn" data-act="closeDlg">취소</button><button class="btn hot" data-act="holdread">압박 멈추고 리듬 확인</button></div>');return;}
 __openRead3();};

// ROSC 선언
function lastPulseCheck(){for(let i=S.assessments.length-1;i>=0;i--){const a=S.assessments[i];if(a.valid)return a;}return null;}
function roscDeclare(){
 const P=S.P,a=lastPulseCheck(),recent=a&&(S.t-(a.s+a.d))<=30;
 if(S.roscConfirmed){toast('이미 ROSC를 선언했습니다.');return;}
 if(!P.pads){openDlg('<h2>ROSC 선언 전 확인</h2><p>모니터(패드)가 연결되지 않아 조직화된 리듬을 확인할 수 없습니다. 패드를 먼저 붙이세요.</p><div class="acts"><button class="btn" data-act="closeDlg">닫기</button></div>');return;}
 if(!recent){openDlg('<h2>ROSC 선언 전 확인</h2><p>ROSC는 <b>조직화된 리듬</b>과 <b>맥박 촉지</b>로 선언합니다. 최근 30초 안에 확인한 맥박이 없습니다.</p><ol style="margin:.6rem 0 0 1.1rem;line-height:1.7"><li>압박을 잠시 멈춥니다.</li><li>모니터 리듬이 조직화되어 있는지 봅니다.</li><li>경동맥에서 5–10초 맥박을 확인합니다.</li></ol><div class="acts"><button class="btn" data-act="closeDlg">취소</button><button class="btn hot" data-act="roscCheck">압박 멈추고 맥박 확인</button></div>');return;}
 if(!a.pulse){S.flags.badRosc=(S.flags.badRosc||0)+1;caution('맥박이 확인되지 않았는데 ROSC를 선언하려 했습니다.');openDlg('<h2>ROSC가 아닙니다</h2><p>최근 맥박 확인에서 <b>맥박이 없었습니다</b>. 조직화된 리듬이라도 맥박이 없으면 무맥성 전기활동(PEA)입니다.</p><p class="muted" style="margin-top:6px">즉시 가슴압박을 재개하고 에피네프린과 가역적 원인을 검토하세요.</p><div class="acts"><button class="btn hot" data-act="closeDlgResume">압박 재개</button></div>');return;}
 // 선언
 S.roscConfirmed=true;S.roscConfirmT=S.t;S.roscDeclared=S.t;
 S.members.filter(m=>m.task==='cpr').forEach(m=>{m.task=null;m.prog=0;m.paused=false;m.handoff=null;});
 S.members.filter(m=>m.paused&&m.task!=='cpr').forEach(m=>m.paused=false);S.hold=null;
 log('리더: "ROSC입니다! 맥박 확인됐습니다. 가슴압박 중지, ROSC 후 치료를 시작합니다."','comm');
 log('ROSC 선언 ('+fmt(S.t)+') — 혈압·SpO₂ 92–98%·EtCO₂ 35–45·환기 10회/분·12유도 심전도·목표체온 조절을 확인하세요.','dev');
 vsay('pro','lead_rosc',{urgent:true,fb:'ROSC입니다! 맥박 확인됐습니다. 가슴압박 중지.'});
 setTimeout(()=>vsay('pro','lead_post',{fb:'ROSC 후 치료 시작합니다. 혈압, 산소포화도, 호기말 이산화탄소 확인하세요.'}),300);
 showRoscBanner();}
function showRoscBanner(){const st=$('#stage');if(!st)return;let b=$('#roscban');if(!b){b=document.createElement('div');b.id='roscban';b.className='roscban';st.appendChild(b);}
 b.innerHTML='<div class="rb-k">ROSC</div><div class="rb-t">자발순환 회복 선언 · '+fmt(S.t)+'</div><div class="rb-c">'+['기도·EtCO₂ 35–45','SpO₂ 90–98%','환기 10회/분','SBP ≥ 90 · MAP ≥ 65','12유도 심전도','목표체온 조절'].map(x=>'<span>'+x+'</span>').join('')+'</div>';
 b.classList.remove('on');void b.offsetWidth;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),7000);}

// 맥박 확인 후 자동 확정 대신: 리더가 선언하도록 안내
endAssess=(function(orig){return function(auto){const wasConf=S.roscConfirmed;const before=S.assessments.length;
 const keep=S.roscConfirmed;S.__noAutoRosc=true;orig(auto);
 if(!keep&&S.roscConfirmed&&!S.roscDeclared){S.roscConfirmed=false;S.roscConfirmT=null;}
 const a=S.assessments.length>before?S.assessments[S.assessments.length-1]:null;
 if(a&&a.valid&&a.pulse&&!S.roscConfirmed&&S.firstComp!=null){log('맥박이 촉지됩니다. 조직화된 리듬과 함께 확인되면 [ROSC 선언]을 누르세요.','info');if(S.mode!=='test')toast('맥박 촉지 — 조직화된 리듬이면 ROSC를 선언하세요.');}
 if(a&&a.valid&&!a.pulse&&S.hold&&S.hold.reason==='pulse'){log('맥박이 없습니다. 즉시 압박을 재개하세요.','warn');}
};})(endAssess);

// EtCO₂ 급상승 → ROSC 가능성 안내
let etco2Hist=[];
function protoTick(){if(!S||curScreen!=='sim'||S.paused||S.ended)return;const P=S.P;
 if(P.etco2Sensor&&P.compressing&&!P.pulse){etco2Hist.push([S.t,P.etco2]);etco2Hist=etco2Hist.filter(x=>S.t-x[0]<12);}
 else if(P.etco2Sensor&&P.compressing&&P.pulse&&!S.flags.etco2Rise){const old=etco2Hist.length?etco2Hist[0][1]:null;if(old!=null&&P.etco2-old>=10){S.flags.etco2Rise=S.t;log('EtCO₂가 갑자기 '+Math.round(old)+' → '+Math.round(P.etco2)+' mmHg로 올랐습니다 — ROSC 가능성. 다음 리듬 확인 때 맥박을 확인하세요.','info');}}
 // 중단 타이머 표시
 const st=$('#stage');if(!st)return;let pt=$('#pausehud');if(!pt){pt=document.createElement('div');pt.id='pausehud';pt.className='pausehud';st.appendChild(pt);}
 const cp=S.curPause,show=!P.pulse&&S.firstComp!=null&&!P.compressing&&cp;
 pt.classList.toggle('on',!!show);
 if(show){const L=cp.len;pt.classList.toggle('warn',L>=7&&L<10);pt.classList.toggle('over',L>=10);
  const why=S.hold?(HOLD_WHY[S.hold.reason]||''):(S.assess?'맥박 확인':'');
  pt.innerHTML='<span class="ph-l">압박 중단'+(why?' · '+why:'')+'</span><b>'+L.toFixed(1)+'<small>초</small></b><i style="width:'+Math.min(100,L/10*100)+'%"></i>';
  if(L>=10&&!cp._beeped){cp._beeped=true;snd.alarmMed&&snd.alarmMed();vsay('pro','lead_10s',{fb:'중단 10초입니다. 바로 압박 재개하세요!'});}}
}
const __renderSim3=renderSim;renderSim=function(){__renderSim3();try{protoTick();protoDock();}catch(e){console.error(e);}};
// 하단 지휘 버튼 보강
function protoDock(){const lead=document.querySelector('#dock .lead');if(!lead)return;const P=S.P;
 S.members.forEach(m=>{const card=document.querySelector('.mem[data-sel="'+m.id+'"] .ts');if(!card)return;if(m.task==='ett'&&ettAttempt(m))card.textContent=(compNow()?'삽관 대기 · 압박 중지 필요':'삽관 시도 중 · 환기 중단');else if(m.task==='ett')card.textContent='삽관 준비 중 · 환기 계속';else if(m.ettPause)card.textContent='환기 중단 (삽관 중)';});
 const ettWait=S.members.find(m=>m.task==='ett'&&m.ettAsk&&!m.ettGo&&compNow());
 let hb=lead.querySelector('[data-act="hold"]');
 if(!hb){hb=document.createElement('button');hb.className='btn';hb.dataset.act='hold';const clr=lead.querySelector('[data-act="clear"]');lead.insertBefore(hb,clr);}
 const canHold=compNow();hb.disabled=!canHold&&!ettWait;hb.textContent=ettWait?'압박 중지 · 삽관':'압박 중지';hb.classList.toggle('hot',!!ettWait);hb.classList.toggle('pulse',!!ettWait);
 const rb=lead.querySelector('[data-act="resume"]');if(rb){const need=!!(S.flags.ettResume||(S.hold&&S.curPause&&S.curPause.len>5));rb.classList.toggle('hot',need);rb.classList.toggle('pulse',need);}
 let rs=lead.querySelector('[data-act="rosc"]');
 if(!rs){rs=document.createElement('button');rs.className='btn';rs.dataset.act='rosc';rs.textContent='ROSC 선언';const rd=lead.querySelector('[data-act="read"]');rd&&rd.after?rd.after(rs):lead.appendChild(rs);}
 const showR=S.firstComp!=null&&!S.roscConfirmed;rs.hidden=!showR;const a=lastPulseCheck(),ready=a&&a.pulse&&S.t-(a.s+a.d)<=30;rs.classList.toggle('primary',!!ready);rs.classList.toggle('pulse',!!ready);}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||!S)return;const a=b.dataset.act;
 if(a==='hold'){holdComp(S.members.some(m=>m.task==='ett'&&m.ettAsk&&!m.ettGo)?'ett':'other');}
 else if(a==='holdread'){closeDlg();holdComp('rhythm');__openRead3();}
 else if(a==='rosc'){roscDeclare();}
 else if(a==='roscCheck'){closeDlg();if(compNow())holdComp('pulse');startAssess();}
 else if(a==='closeDlgResume'){closeDlg();resumeAll();}
 else return;
 setTimeout(()=>{if(S&&curScreen==='sim')renderSim();},0);});

/* ---- SYNC 켜짐: 모니터 QRS 위에 동기화 표식 ---- */
(function(){const base=Sweep.prototype.draw;
 Sweep.prototype.draw=function(t,eng){const t0=this.last;base.call(this,t,eng);
  if(this!==monSweep||!S||!S.def||!S.def.sync||!eng||t0==null||t<=t0||!S.P.pads)return;
  const c=this.ctx;c.fillStyle='#f4f7f8';
  for(const e of eng.ev){if(e.t>t0&&e.t<=t&&QRSK[e.k]){const x=(e.t*this.pps)%this.w;c.beginPath();c.moveTo(x-4.5,3);c.lineTo(x+4.5,3);c.lineTo(x,10.5);c.closePath();c.fill();}}
 };})();
