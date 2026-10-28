/* ============ 강사 콘솔 (별도 창 / 휴대폰) ============
   탭: 진행 조종 · 관찰·평가 · 디브리핑 · 수업 기록
   전송: Electron IPC(cblBridge) / HTTP SSE(/remote, 휴대폰) / BroadcastChannel(브라우저 다른 창) */
(function(){
function makeLink(onMsg){
  if(window.cblBridge&&window.cblBridge.electron){window.cblBridge.onMsg(onMsg);return {kind:'ipc',send:m=>window.cblBridge.toStudent(m)};}
  if(/^https?:$/.test(location.protocol)&&/^\/remote/.test(location.pathname)){
    const pin=(new URLSearchParams(location.search).get('pin'))||'';
    const es=new EventSource('/events?pin='+encodeURIComponent(pin));es.onmessage=e=>{try{onMsg(JSON.parse(e.data));}catch(_){}};
    return {kind:'http',send:m=>fetch('/cmd?pin='+encodeURIComponent(pin),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m)}).then(r=>{if(r.status===403)IC.bad='PIN이 맞지 않습니다';}).catch(()=>{})};
  }
  if('BroadcastChannel' in window){const bc=new BroadcastChannel('cbl-inst');bc.onmessage=e=>onMsg(e.data);return {kind:'bc',send:m=>bc.postMessage(m)};}
  return {kind:'none',send:()=>{}};
}
const IC={st:null,seen:0,link:null,bad:null,armEnd:0,remote:null,tab:'run',arm:{},wasEnded:false,sig:{}};
window.IC=IC;
const q=s=>document.querySelector(s);
const h=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mmss=t=>{if(t==null)return '—';t=Math.max(0,Math.floor(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
const KEYS=[['R','rosc','ROSC 유도',1],['V','arrVF','재정지 · VF',1],['P','arrPEA','재정지 · PEA',1],['A','arrASY','무수축',1],['F','fail','다음 술기 실패',1],['C','cb','지원팀 즉시 도착',0],['H','fix','원인 교정',0],['Space','pause','일시정지 / 계속',0]];
const NTS=[['lead','리더십·역할 분담'],['comm','의사소통(폐쇄 루프)'],['aware','상황 인식'],['res','자원 활용·지원 요청'],['team','팀워크·상호 존중']];
const SAY_PRESET=[['situ','보호자가 상황을 계속 묻습니다'],['situ','검사실에서 칼륨 수치 이상을 알려 왔습니다'],['situ','주치의가 전화로 상황 보고를 요청합니다'],['coach','리듬 확인 시간입니다 — 2분이 지났습니다'],['coach','압박 중단이 길어지고 있습니다'],['coach','역할을 소리 내어 지정해 보세요'],['coach','가역적 원인(5H·5T)을 점검해 보세요']];
function send(act,a){IC.link.send({t:'cmd',act,a:a||{}});flash(act);}
function flash(act){document.querySelectorAll('[data-ic="'+act+'"]').forEach(b=>{b.classList.add('sent');setTimeout(()=>b.classList.remove('sent'),500);});}
function onMsg(m){if(!m||m.t!=='state')return;IC.st=m;IC.seen=Date.now();if(m.ended&&!IC.wasEnded){IC.wasEnded=true;setTab('deb');}if(!m.ended&&m.has){if(IC.wasEnded&&IC.tab==='deb')setTab('run');IC.wasEnded=false;}if(m.err)toastC(m.err);render();}
function toastC(t){const el=q('#ic-toast');if(!el)return;el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),2600);}
function shell(){
  document.title='강사 콘솔 · 코드블루 리더';
  const root=document.createElement('div');root.id='instcon';
  root.innerHTML='<header class="ic-top"><div class="ic-brand"><b>강사 콘솔</b><span>코드블루 리더</span></div><div class="ic-conn" id="ic-conn"></div><div class="ic-mini" id="ic-mini"></div><div class="ic-clock" id="ic-clock">--:--</div></header>'+
  '<nav class="ic-tabs" id="ic-tabs"><button data-tab="run" class="on"><kbd>1</kbd>진행 조종</button><button data-tab="obs"><kbd>2</kbd>관찰·평가</button><button data-tab="deb"><kbd>3</kbd>디브리핑</button><button data-tab="cls"><kbd>4</kbd>수업 기록</button></nav>'+
  '<main id="ic-pane-run" class="ic-main"><section class="ic-col"><div class="ic-card" id="ic-truth"></div><div class="ic-card"><h4>팀 상태</h4><div id="ic-team"></div></div><div class="ic-card ic-logc"><h4>최근 기록 <small>학생 화면 로그</small></h4><div id="ic-log" class="ic-log"></div></div></section>'+
  '<section class="ic-col"><div class="ic-card"><h4>빠른 이벤트 <small>위험한 키(R·V·P·A·F)는 두 번 눌러 실행</small></h4><div class="ic-quick">'+KEYS.map(k=>'<button class="ic-btn'+(k[1]==='pause'?' ic-pause':'')+(k[1]==='rosc'?' ic-good':'')+(/^arr/.test(k[1])?' ic-bad':'')+'" data-ic="'+k[1]+'"><kbd>'+k[0]+'</kbd><span>'+k[2]+'</span></button>').join('')+'</div></div>'+
  '<div class="ic-card"><h4>돌발 상황 넣기 <small>대처 능력 훈련</small></h4><div class="ic-chips" id="ic-inject"></div></div>'+
  '<div class="ic-card"><h4>학생 화면에 보내기</h4><div class="ic-row"><input id="ic-say" class="ic-grow" maxlength="140" placeholder="예: 보호자가 DNR 여부를 묻습니다"><button class="ic-btn sm" data-ic="saySitu" title="병실 안에서 일어난 일처럼 보입니다">상황 알림</button><button class="ic-btn sm ic-coach" data-ic="sayCoach" title="강사 코칭으로 표시되고 디브리핑에 기록됩니다">코칭 힌트</button></div><div class="ic-chips sm">'+SAY_PRESET.map((p,i)=>'<button class="ic-chip '+p[0]+'" data-ic="preset" data-i="'+i+'">'+h(p[1])+'</button>').join('')+'</div></div>'+
  '<div class="ic-card"><h4>환자 상태 직접 바꾸기</h4><div class="ic-row"><select id="ic-rh" class="ic-grow"></select><input id="ic-hr" type="number" inputmode="numeric" placeholder="HR"><button class="ic-btn sm" data-ic="rh">리듬 적용</button></div><div class="ic-row"><input id="ic-sbp" type="number" inputmode="numeric" placeholder="목표 SBP"><button class="ic-btn sm" data-ic="sbp">혈압 적용</button><select id="ic-cause" class="ic-grow"></select><button class="ic-btn sm" data-ic="cause">원인 지정</button></div></div>'+
  '<div class="ic-card"><h4>진행 제어</h4><div class="ic-row"><span class="ic-lab">속도</span><div class="ic-seg" id="ic-speed">'+[0.5,1,2,3].map(v=>'<button data-ic="speed" data-v="'+v+'">'+v+'×</button>').join('')+'</div><span class="ic-lab">힌트</span><div class="ic-seg" id="ic-hints"><button data-ic="hintsOn">켬</button><button data-ic="hintsOff">끔</button></div><span class="ic-sp"></span><button class="ic-btn sm ic-danger" data-ic="end">케이스 종료</button></div><div id="ic-script"></div></div>'+
  '<div class="ic-card" id="ic-remote"></div></section></main>'+
  '<main id="ic-pane-obs" class="ic-main" hidden><section class="ic-col"><div class="ic-card"><h4>실시간 수행 지표</h4><div class="ic-kpis" id="ic-kpis"></div></div><div class="ic-card"><h4>핵심 행동 체크리스트 <small>자동 기록 · 시작 후 경과</small></h4><div id="ic-check" class="ic-check"></div></div></section>'+
  '<section class="ic-col"><div class="ic-card"><h4>장면 표시 <small>G 잘한 점 · B 개선점 — 디브리핑 타임라인에 남음</small></h4><div class="ic-row"><input id="ic-mark" class="ic-grow" maxlength="160" placeholder="짧은 설명(선택) 예: 폐쇄 루프로 약물 확인"><button class="ic-btn sm ic-good" data-ic="markGood">+ 잘한 점</button><button class="ic-btn sm ic-bad" data-ic="markBad">− 개선점</button></div><div id="ic-marks" class="ic-marks"></div></div>'+
  '<div class="ic-card"><h4>팀 수행 평가 <small>비기술적 역량 1–5 · 학생 디브리핑에 표시</small></h4><div id="ic-nts" class="ic-nts"></div></div>'+
  '<div class="ic-card"><h4>강사 메모 <small>디브리핑에만 표시</small></h4><textarea id="ic-note" rows="2" placeholder="예: 3분 시점 역할 분담 불명확"></textarea><div class="ic-row"><button class="ic-btn sm" data-ic="note">메모 기록</button></div><div id="ic-notes" class="ic-log"></div></div></section></main>'+
  '<main id="ic-pane-deb" class="ic-main ic-one" hidden><div id="ic-deb"></div></main>'+
  '<main id="ic-pane-cls" class="ic-main ic-one" hidden><div class="ic-card"><h4>팀(조) 이름</h4><div class="ic-row"><input id="ic-teamname" class="ic-grow" maxlength="30" placeholder="예: 3조 · 김OO 리더"><button class="ic-btn sm" data-ic="team">지정</button><span class="ic-muted" id="ic-teamcur"></span></div><p class="ic-muted">지정하면 다음에 끝나는 케이스 결과에 팀 이름이 붙습니다.</p></div><div class="ic-card"><h4>이 PC의 최근 수행 기록 <small>최근 40건</small></h4><div class="ic-row"><span class="ic-sp"></span><button class="ic-btn sm" data-ic="csv">CSV 복사(엑셀 붙여넣기)</button></div><div id="ic-hist" class="ic-tablewrap"></div><textarea id="ic-csv" rows="4" hidden readonly></textarea></div></main>'+
  '<div class="ic-toast" id="ic-toast"></div><footer class="ic-foot">학생 화면에는 강사 조작이 보이지 않습니다(상황 알림·코칭 힌트는 보임). 디브리핑에는 모두 기록됩니다.<span id="ic-gk"></span></footer>';
  document.body.appendChild(root);document.documentElement.classList.add('instwin');
  root.addEventListener('change',e=>{if(e.target.matches('select'))e.target.dataset.touched='1';});
  root.addEventListener('click',e=>{const t=e.target.closest('#ic-tabs [data-tab]');if(t){setTab(t.dataset.tab);return;}const b=e.target.closest('[data-ic]');if(!b)return;doAct(b.dataset.ic,b);});
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input,textarea,select'))return;if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(/^[1-4]$/.test(e.key)){setTab(['run','obs','deb','cls'][+e.key-1]);return;}
    const k=e.key===' '?'Space':e.key.toUpperCase();
    if(k==='G'){doAct('markGood');return;}if(k==='B'){doAct('markBad');return;}
    const hit=KEYS.find(x=>x[0]===k);if(!hit)return;e.preventDefault();
    if(hit[3]){const now=Date.now();if(now-(IC.arm[k]||0)<1500){IC.arm[k]=0;doAct(hit[1]);}else{IC.arm[k]=now;toastC(hit[2]+' — 한 번 더 누르면 실행');}}else doAct(hit[1]);
  });
  if(window.cblBridge&&window.cblBridge.electron)q('#ic-gk').textContent=' 학생 화면을 클릭해 둔 상태에서도 Ctrl+Alt+같은 글자로 바로 실행됩니다.';
}
function setTab(t){if(!['run','obs','deb','cls'].includes(t))return;IC.tab=t;document.querySelectorAll('#ic-tabs [data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));['run','obs','deb','cls'].forEach(x=>{const p=q('#ic-pane-'+x);if(p)p.hidden=x!==t;});IC.sig={};render();}
function doAct(a,b){
  if(a==='rh'){send('rh',{k:q('#ic-rh').value,hr:+q('#ic-hr').value||0});delete q('#ic-rh').dataset.touched;return;}
  if(a==='sbp'){const v=+q('#ic-sbp').value;if(v)send('sbp',{v});return;}
  if(a==='cause'){send('cause',{v:q('#ic-cause').value});delete q('#ic-cause').dataset.touched;return;}
  if(a==='note'){const v=q('#ic-note').value.trim();if(v){send('note',{v});q('#ic-note').value='';toastC('메모를 기록했습니다');}return;}
  if(a==='saySitu'||a==='sayCoach'){const v=q('#ic-say').value.trim();if(!v){toastC('보낼 내용을 입력하세요');return;}send('say',{v,kind:a==='sayCoach'?'coach':'situ'});q('#ic-say').value='';toastC('학생 화면에 보냈습니다');return;}
  if(a==='preset'){const p=SAY_PRESET[+b.dataset.i];send('say',{v:p[1],kind:p[0]});toastC('학생 화면에 보냈습니다');return;}
  if(a==='inject'){send('inject',{k:b.dataset.k});toastC(b.textContent+' — 넣었습니다');return;}
  if(a==='speed'){send('speed',{v:+b.dataset.v});return;}
  if(a==='hintsOn'||a==='hintsOff'){send('hints',{on:a==='hintsOn'});return;}
  if(a==='markGood'||a==='markBad'){const inp=q('#ic-mark');const v=inp?inp.value.trim():'';send('mark',{kind:a==='markGood'?'good':'bad',v});if(inp)inp.value='';toastC((a==='markGood'?'잘한 점':'개선점')+' 장면을 표시했습니다');return;}
  if(a==='nts'){send('nts',{k:b.dataset.k,v:+b.dataset.v});return;}
  if(a==='team'){const v=q('#ic-teamname').value.trim();send('team',{v});toastC(v?'팀 이름: '+v:'팀 이름을 지웠습니다');return;}
  if(a==='showDebrief'){send('showDebrief',{tab:b&&(b.dataset.dtab||b.dataset.tab)||'score'});toastC('학생 화면에 디브리핑을 띄웠습니다');return;}
  if(a==='csv'){copyCsv();return;}
  if(a==='end'){if(Date.now()-IC.armEnd<3000){send('end');IC.armEnd=0;}else{IC.armEnd=Date.now();document.querySelectorAll('[data-ic="end"]').forEach(x=>{x.textContent='한 번 더 누르면 종료';setTimeout(()=>{x.textContent='케이스 종료';},3000);});}return;}
  if(a==='remote'||a==='remoteOff'){remote(a==='remote');return;}
  if(/^arr/.test(a)){send('arr',{v:a.slice(3)});return;}
  send(a);
}
function fillSelects(meta){
  const r=q('#ic-rh'),c=q('#ic-cause'),inj=q('#ic-inject');
  if(r&&!r.options.length&&meta&&meta.rh)r.innerHTML=meta.rh.map(x=>'<option value="'+x[0]+'">'+h(x[1])+'</option>').join('');
  if(c&&!c.options.length&&meta&&meta.causes)c.innerHTML='<option value="">원인 없음</option>'+meta.causes.map(x=>'<option value="'+x[0]+'">'+h(x[1])+'</option>').join('');
  if(inj&&!inj.children.length&&meta&&meta.inject)inj.innerHTML=meta.inject.map(x=>'<button class="ic-chip warn" data-ic="inject" data-k="'+x[0]+'">'+h(x[1])+'</button>').join('');
}
function setIf(sel,key,html){const el=q(sel);if(!el)return;if(IC.sig[sel]===key)return;IC.sig[sel]=key;el.innerHTML=html;}
function render(){
  const s=IC.st,live=s&&Date.now()-IC.seen<3500;
  const conn=q('#ic-conn');
  if(conn)conn.innerHTML=IC.bad?'<i class="off"></i>'+h(IC.bad):live?'<i class="on"></i>연결됨'+(s.caseName&&(s.has||s.ended)?' · '+h(s.caseName)+' <em>'+h(s.modeName)+'</em>':' · 케이스 대기 중')+(s.team?' · <b>'+h(s.team)+'</b>':''):'<i class="off"></i>학생 화면을 찾는 중… 코드블루 리더 본 화면이 열려 있어야 합니다';
  if(!s)return;fillSelects(s.meta);
  const ck=q('#ic-clock');ck.textContent=(s.has||s.ended)?mmss(s.time)+(s.ended?' · 종료':s.paused?' · 일시정지':'')+(s.speed&&s.speed!==1?' · '+s.speed+'×':''):'--:--';ck.classList.toggle('paused',!!s.paused);
  const pb=q('[data-ic="pause"] span');if(pb)pb.textContent=s.paused?'계속 진행':'일시정지';
  document.querySelectorAll('#ic-speed button').forEach(b=>b.classList.toggle('on',+b.dataset.v===(s.speed||1)));
  document.querySelectorAll('#ic-hints button').forEach(b=>{b.classList.toggle('on',(b.dataset.ic==='hintsOn')===!!s.hints);b.disabled=!!s.testMode;});
  if(s.has){const cs=q('#ic-cause');if(cs&&document.activeElement!==cs&&!cs.dataset.touched)cs.value=s.P.cause||'';const rs=q('#ic-rh');if(rs&&document.activeElement!==rs&&!rs.dataset.touched)rs.value=s.P.rhythm;}
  if(IC.tab==='run')renderRun(s);else if(IC.tab==='obs')renderObs(s);else if(IC.tab==='deb')renderDeb(s);else renderCls(s);
  renderRemote();
}
function vit(l,v,sub,off){return '<div class="'+(off?'off':'')+'"><small>'+l+'</small><b>'+h(v)+'</b><em>'+h(sub)+'</em></div>';}
function renderRun(s){
  const mini=q('#ic-mini');
  if(!s.has){mini.innerHTML='';q('#ic-truth').innerHTML='<h4>실제 환자 상태</h4><p class="ic-muted">'+(s.ended?'케이스가 끝났습니다. [디브리핑] 탭에서 정리 자료를 보세요.':'학생 화면에서 케이스를 시작하면 실제 리듬과 활력징후가 여기에 표시됩니다.')+'</p>';q('#ic-team').innerHTML='';q('#ic-log').innerHTML='';q('#ic-script').innerHTML='';IC.sig['#ic-script']=null;return;}
  const P=s.P;
  mini.innerHTML='<b class="'+(P.pulse?'ok':'bad')+'">'+h(P.rhName)+'</b> 실제 HR '+Math.round(P.hr)+' · SBP '+Math.round(P.sbp)+(s.comp?' · 압박 중':'');
  q('#ic-truth').innerHTML='<h4>환자 상태 <small>리듬·실제 생리 값은 학생에게 보이지 않음</small></h4>'+
   '<div class="ic-rhy'+(P.pulse?' ok':' arrest')+'"><b>'+h(P.rhName)+'</b><span>'+(P.pulse?'맥박 있음':'맥박 없음')+(P.paceCapture?' · 조율 포획':'')+'</span></div>'+
   (s.mon?'<div class="ic-monrow"><h5>학생 모니터에 보이는 값 <small>학생 화면과 같음</small></h5><div class="ic-vit ic-shown">'+
     vit('HR',s.mon.hr,s.mon.sensors.pads?'ECG 패드':(s.mon.sensors.probe?'SpO₂ 맥박':'리드 없음'),!s.mon.sensors.pads&&!s.mon.sensors.probe)+
     vit('NIBP',s.mon.bp,s.mon.sensors.cuff?(s.mon.bpAgo!=null?mmss(s.mon.bpAgo)+' 전 측정':'측정 전'):'커프 없음',!s.mon.sensors.cuff)+
     vit('SpO₂',s.mon.sp,s.mon.sensors.probe?(s.mon.spMsg||'연결됨'):'센서 없음',!s.mon.sensors.probe)+
     vit('EtCO₂',s.mon.co,s.mon.sensors.etco2?'연결됨':'센서 없음',!s.mon.sensors.etco2)+'</div></div>':'')+
   '<h5 class="ic-h5">실제 생리 값 <small>장치 연결과 관계없는 시뮬레이션 내부 값</small></h5>'+
   '<div class="ic-vit ic-real"><div><small>HR</small><b>'+Math.round(P.hr)+'</b></div><div><small>SBP</small><b>'+Math.round(P.sbp)+'</b><em>목표 '+Math.round(P.sbpT)+'</em></div><div><small>SpO₂</small><b>'+Math.round(P.spo2)+'</b></div><div><small>EtCO₂</small><b>'+Math.round(P.etco2)+'</b></div></div>'+
   '<div class="ic-tags"><span class="'+(s.comp?'on':'')+'">'+(s.comp?'가슴압박 중':'압박 없음')+'</span><span>제세동기 '+h(s.def)+'</span><span>기도 '+({none:'없음',ett:'기관내관'}[P.airway]||h(P.airway))+'</span><span>혈관 '+({none:'없음',iv:'정맥로',io:'골내로'}[P.access]||h(P.access))+'</span><span>원인 '+h(P.causeName||'없음')+(P.cause?(P.causeFixed?' (교정됨)':' (미교정)'):'')+'</span><span>에피 '+P.epiCirc+'회</span><span>항부정맥제 '+(P.antiarr?'투여':'미투여')+'</span><span>지원팀 '+h(s.cb)+'</span></div>';
  if(document.activeElement!==q('#ic-sbp')&&!q('#ic-sbp').value)q('#ic-sbp').placeholder='목표 '+Math.round(P.sbpT);
  q('#ic-team').innerHTML=s.team2.map(m=>'<div class="ic-mem"><b>'+h(m.name)+'</b><small>'+h(m.role)+'</small><span class="'+(m.away!=null||m.paused?'hold':m.task?'busy':'')+'">'+(m.away!=null?'자리 비움 · '+m.away+'초 뒤 복귀':m.task?h(m.task)+(m.paused?' (중단)':m.pct<100?' '+m.pct+'%':''):'대기')+'</span></div>').join('');
  q('#ic-log').innerHTML=s.log.map(e=>'<div class="'+h(e.type)+'"><time>'+mmss(e.t)+'</time><span>'+h(e.text)+'</span></div>').join('');
  const sc=s.script||[];setIf('#ic-script',JSON.stringify(sc),sc.length?'<h4 style="margin-top:12px">시나리오 대본 <small>사용자 정의 케이스</small></h4><div class="ic-script">'+sc.map(e=>'<div class="'+(e.done?'done':'')+'"><time>'+(e.when==='rosc'?'ROSC+':'')+e.sec+'초</time><span>'+h({rhythm:'리듬 변화',sbp:'목표 혈압',arrest:'심정지',rosc:'ROSC',fail:'술기 실패',msg:'상황 메시지',lab:'검사 결과',cause:'원인 교정'}[e.type]||e.type)+(e.v?' · '+h(e.v):'')+'</span><em>'+(e.done?'완료':'대기')+'</em></div>').join('')+'</div>':'');
}
function renderObs(s){
  const k=s.kpi;
  if(!k){q('#ic-kpis').innerHTML='<p class="ic-muted">케이스가 시작되면 표시됩니다.</p>';q('#ic-check').innerHTML='';}
  else{
   const tile=(l,v,cls,sub)=>'<div class="ic-kpi '+(cls||'')+'"><small>'+l+'</small><b>'+v+'</b>'+(sub?'<em>'+sub+'</em>':'')+'</div>';
   q('#ic-kpis').innerHTML=(k.ccf!=null?tile('압박 분율',k.ccf+'%',k.ccf>=80?'good':k.ccf>=60?'warn':'bad','목표 80% 이상'):'')+tile('현재 중단',k.cur+'초',k.cur>10?'bad':k.cur>7?'warn':'')+tile('최장 중단',k.longest+'초',k.longest>10?'bad':'good','10초 초과 '+k.over10+'회')+
    tile('압박자',k.compName?h(k.compName)+' '+mmss(k.stint):'—',k.stint>=150?'bad':k.stint>=110?'warn':'',k.depth?k.rate+'/분 · '+k.depth+' cm':'')+tile('마지막 에피 후',k.epiAgo!=null?mmss(k.epiAgo):'—',k.epiAgo!=null&&k.epiAgo>300?'warn':'','총 '+k.epiN+'회')+
    tile('제세동',k.shocks+'회','')+tile('환기',k.vent?'시행 중':'없음',k.vent?'good':'warn',k.airway==='ett'?'기관내관 · 과환기 '+k.overvent+'초':'')+tile('주의·중대 오류',k.cautions+' · '+k.crit,k.crit?'bad':k.cautions>3?'warn':'');
   q('#ic-check').innerHTML=(s.checklist||[]).map(c=>'<div class="'+(c.t!=null?'ok':'')+'"><i></i><span>'+h(c.l)+'</span><time>'+(c.t!=null?mmss(c.t):'—')+'</time></div>').join('');
  }
  const marks=s.marks||[];setIf('#ic-marks',JSON.stringify(marks),marks.length?marks.slice().reverse().map(m=>'<div class="'+m.kind+'"><time>'+mmss(m.t)+'</time><b>'+(m.kind==='good'?'+':'−')+'</b><span>'+h(m.text||(m.kind==='good'?'잘한 장면':'개선할 장면'))+'</span></div>').join(''):'<p class="ic-muted">아직 표시한 장면이 없습니다.</p>');
  const nts=s.nts||{};setIf('#ic-nts',JSON.stringify(nts),NTS.map(d=>'<div class="ic-ntsrow"><span>'+d[1]+'</span><div class="ic-seg">'+[1,2,3,4,5].map(v=>'<button data-ic="nts" data-k="'+d[0]+'" data-v="'+v+'" class="'+(nts[d[0]]===v?'on':'')+'">'+v+'</button>').join('')+'</div></div>').join('')+'<p class="ic-muted">1 미흡 · 3 보통 · 5 우수</p>');
  const notes=s.notes||[];setIf('#ic-notes',JSON.stringify(notes),notes.map(n=>'<div class="inst"><time>'+mmss(n.t)+'</time><span>'+h(n.text)+'</span></div>').join(''));
}
function renderDeb(s){
  if(!s.ended||!s.result){setIf('#ic-deb','wait','<div class="ic-card"><h4>디브리핑 안내</h4><p class="ic-muted">케이스가 끝나면 점수, 놓친 부분, 강사가 표시한 장면을 묶어 <b>PEARLS 흐름(반응 → 기술 → 분석 → 요약)</b>의 질문 안내를 자동으로 만듭니다. 진행 중에는 [관찰·평가] 탭에서 장면을 표시하고 팀 수행을 평가해 두세요.</p></div>');return;}
  const R=s.result,D=s.debrief||{};const key=JSON.stringify([R.total,s.time,(s.marks||[]).length,s.nts||{}]);
  const sec=(t,arr,cls)=>arr&&arr.length?'<div class="ic-pearl '+(cls||'')+'"><h5>'+t+'</h5><ul>'+arr.map(x=>'<li>'+h(x)+'</li>').join('')+'</ul></div>':'';
  const nts=s.nts||{};const rated=NTS.filter(d=>nts[d[0]]);
  setIf('#ic-deb',key,'<div class="ic-card ic-res"><div class="ic-grade g'+h(R.grade)+'">'+h(R.grade)+'</div><div><b>'+R.total+'점</b> · '+({success:'안정화',death:'환자 사망',stopped:'미완료 종료'}[R.outcome]||'')+(s.testMode?(R.pass?' · <span class="okc">통과</span>':' · <span class="badc">불통과</span>'):'')+'<div class="ic-muted">'+h(s.caseName)+' · '+h(s.modeName)+' · '+mmss(s.time)+(s.team?' · '+h(s.team):'')+'</div></div><span class="ic-sp"></span><button class="ic-btn sm" data-ic="showDebrief" data-dtab="score">학생 화면: 점수</button><button class="ic-btn sm" data-ic="showDebrief" data-dtab="timeline">학생 화면: 타임라인</button></div>'+
   '<div class="ic-two"><div class="ic-card"><h4>디브리핑 질문 안내 <small>PEARLS</small></h4>'+sec('① 반응',D.reaction)+sec('② 기술',D.description)+sec('③ 분석 — 이번 케이스에서 짚을 점',D.analysis&&D.analysis.length?D.analysis:['큰 문제 없이 진행되었습니다. 잘된 점이 왜 잘되었는지 함께 정리해 보세요.'],'focus')+sec('잘한 점 — 강화할 행동',D.good,'good')+sec('④ 요약',D.summary)+'</div>'+
   '<div class="ic-card"><h4>점수 내역</h4><div class="ic-items">'+R.items.map(i=>'<div class="'+(i.max&&i.pts<i.max*0.6?'low':'')+'"><span>'+h(i.cat)+' · '+h(i.label)+'</span><b>'+i.pts+'/'+i.max+'</b><em>'+h(i.detail)+'</em></div>').join('')+'</div>'+
   ((s.crit&&s.crit.length)?'<h4 style="margin-top:12px">중대 오류</h4>'+s.crit.map(c=>'<div class="ic-critl"><time>'+mmss(c.t)+'</time>'+h(c.text)+'</div>').join(''):'')+
   (rated.length?'<h4 style="margin-top:12px">팀 수행 평가</h4>'+rated.map(d=>'<div class="ic-ntsv"><span>'+d[1]+'</span><b>'+nts[d[0]]+'/5</b></div>').join(''):'')+
   ((s.marks||[]).length?'<h4 style="margin-top:12px">표시한 장면</h4>'+(s.marks||[]).map(m=>'<div class="ic-markl '+m.kind+'"><time>'+mmss(m.t)+'</time>'+(m.kind==='good'?'+ ':'− ')+h(m.text||'')+'</div>').join(''):'')+'</div></div>');
}
function renderCls(s){
  q('#ic-teamcur').textContent=s.team?'현재: '+s.team:'';
  const hst=s.history||[];setIf('#ic-hist',JSON.stringify(hst),hst.length?'<table class="ic-table"><thead><tr><th>일시</th><th>팀</th><th>케이스</th><th>모드</th><th>점수</th><th>결과</th><th>소요</th></tr></thead><tbody>'+hst.map(x=>{const d=new Date(x.d);return'<tr><td>'+(d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+'</td><td>'+h(x.team||'—')+'</td><td>'+h(x.name)+'</td><td>'+h(x.mode)+'</td><td><b>'+x.score+'</b> '+h(x.grade)+'</td><td>'+(x.mode==='평가'?(x.pass?'통과':'불통과'):({success:'안정화',death:'사망',stopped:'중단'}[x.outcome]||''))+'</td><td>'+mmss(x.time)+'</td></tr>';}).join('')+'</tbody></table>':'<p class="ic-muted">아직 기록이 없습니다.</p>');
}
function copyCsv(){const hst=(IC.st&&IC.st.history)||[];const rows=[['일시','팀','케이스','모드','점수','등급','결과','소요(초)']].concat(hst.map(x=>[x.d,x.team||'',x.name,x.mode,x.score,x.grade,x.mode==='평가'?(x.pass?'통과':'불통과'):x.outcome,x.time]));
  const csv=rows.map(r=>r.map(v=>String(v==null?'':v).replace(/\t/g,' ')).join('\t')).join('\n');
  const ta=q('#ic-csv');const done=()=>toastC('복사했습니다. 엑셀에 붙여넣으세요.');
  const fb=()=>{ta.hidden=false;ta.value=csv;ta.select();toastC('선택했습니다. Ctrl+C로 복사하세요.');};
  try{navigator.clipboard.writeText(csv).then(done).catch(fb);}catch(e){fb();}}
function renderRemote(){
  const el=q('#ic-remote');if(!el)return;
  if(!(window.cblBridge&&window.cblBridge.remote)){el.hidden=true;return;}
  const r=IC.remote;
  if(!r||!r.on){if(el.dataset.v!=='off'){el.dataset.v='off';el.innerHTML='<h4>휴대폰·태블릿으로 조종</h4><p class="ic-muted">같은 Wi-Fi의 휴대폰에서 이 콘솔을 열어, 마우스 없이 손에 들고 조작합니다.</p><button class="ic-btn sm" data-ic="remote">휴대폰 연결 켜기</button>';}return;}
  const v='on'+r.pin+r.urls.join();if(el.dataset.v===v)return;el.dataset.v=v;
  el.innerHTML='<h4>휴대폰·태블릿으로 조종 <small>켜짐</small></h4><div class="ic-qr">'+(r.qr?'<img src="'+r.qr+'" alt="접속 QR">':'')+'<div><p>휴대폰 카메라로 QR을 찍거나 주소를 입력하세요.</p>'+r.urls.map(u=>'<code>'+h(u)+'</code>').join('')+'<p>PIN <b class="ic-pin">'+h(r.pin)+'</b></p></div></div><button class="ic-btn sm" data-ic="remoteOff">연결 끄기</button>';
}
function remote(on){window.cblBridge.remote(on).then(r=>{IC.remote=r;renderRemote();if(r&&r.err)toastC(r.err);}).catch(()=>{});}
window.startInstConsole=function(){
  if(IC.link)return;shell();IC.link=makeLink(onMsg);
  const hello=()=>IC.link.send({t:'hello'});hello();setInterval(hello,1500);setInterval(render,1000);render();
  if(window.cblBridge&&window.cblBridge.remote)window.cblBridge.remote('status').then(r=>{IC.remote=r;renderRemote();}).catch(()=>{});
};
if(window.CBL_STANDALONE_CONSOLE)document.addEventListener('DOMContentLoaded',()=>window.startInstConsole());
})();
