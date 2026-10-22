/* ============ 사용자 정의 케이스 설계실 ============
   · 저장 라이브러리(이 PC/브라우저) · 기존 케이스를 틀로 불러오기 · 복제·삭제
   · 환자·시작 상태·가역적 원인·검사값 · 치료 지연 시 악화
   · 시나리오 이벤트(시작 후 N초 / ROSC 후 N초): 리듬 변화, 혈압, 재정지, ROSC, 술기 실패, 상황 메시지, 검사 결과
   · 팀 구성(처음 인원, 지원팀 도착 시간, 응급카트 비치)
   · 학습 목표(시작 화면) · 디브리핑 포인트(결과 화면)
   · 공유: 케이스 코드 복사/붙여넣기, 파일 저장/열기 */
const CU_KEY='cbl_custom_v2';
const CU_EV_TYPES={rhythm:'리듬 변화',sbp:'목표 혈압',arrest:'심정지',rosc:'ROSC',fail:'다음 술기 실패',msg:'상황 메시지',lab:'검사 결과 도착',cause:'원인 교정됨'};
let CU={edit:null,open:false,imp:false};
function cuList(){return store.get(CU_KEY,[]);}
function cuSave(list){store.set(CU_KEY,list);}
function cuId(){return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function cuBlank(){return {id:null,v:2,title:'',age:60,sex:'남성',wt:65,story:'병동에서 갑자기 상태가 변했습니다.',rhythm:'VF',hr:0,sbp:0,spo2:90,cause:'',labs:'',
 det:{on:false,at:180,sbp:65,arrestAt:300,to:'PEA'},events:[],crew:3,cbDelay:10,cartReady:false,objectives:'',debrief:''};}
function cuFromPreset(k){const c=CASES[k],b=cuBlank();const m=(c.who||'').match(/(\d+)세\s*(남성|여성)?\s*·?\s*(\d+)?\s*kg?/);
 Object.assign(b,{title:c.name+' (변형)',rhythm:c.rhythm,hr:c.hr||RH[c.rhythm].hr||0,sbp:c.sbp||0,spo2:c.spo2||(RH[c.rhythm].pulse?96:85),story:c.story||'',cause:c.cause&&c.cause!=='random'?c.cause:''});
 if(m){b.age=+m[1];if(m[2])b.sex=m[2];if(m[3])b.wt=+m[3];}
 if(c.labs)b.labs=Object.keys(c.labs).map(x=>x+'='+c.labs[x]).join(', ');
 if(c.det)b.det={on:true,at:c.det.at,sbp:c.det.sbp,arrestAt:c.det.arrestAt,to:c.det.to};
 return b;}
function cuParseLabs(s){const o={};String(s||'').split(/[,\n;]/).forEach(p=>{const m=p.match(/^\s*([A-Za-z가-힣₂0-9]+)\s*[=:]\s*([-\d.]+)\s*$/);if(m)o[m[1]]=+m[2];});return o;}
function cuValidate(c){const err=[],r=RH[c.rhythm];
 if(!c.title.trim())err.push('케이스 제목을 입력하세요.');
 if(!r)err.push('첫 리듬을 고르세요.');
 if(r&&r.pulse){if(!(c.sbp>=40&&c.sbp<=220))err.push('맥박이 있는 리듬은 수축기 혈압을 40–220 사이로 입력하세요.');if(!(c.hr>=20&&c.hr<=260))err.push('심박수를 20–260 사이로 입력하세요.');}
 if(!(c.spo2>=50&&c.spo2<=100))err.push('SpO₂는 50–100 사이로 입력하세요.');
 if(c.det.on&&r&&r.pulse&&!(c.det.arrestAt>c.det.at))err.push('악화 설정: 심정지 시점이 혈압 저하 시점보다 늦어야 합니다.');
 c.events.forEach((e,i)=>{if(!(e.sec>=0))err.push('이벤트 '+(i+1)+': 시점(초)을 입력하세요.');if(e.type==='rhythm'&&!RH[e.v])err.push('이벤트 '+(i+1)+': 리듬을 고르세요.');if((e.type==='msg'||e.type==='lab')&&!String(e.v||'').trim())err.push('이벤트 '+(i+1)+': 내용을 입력하세요.');});
 return err;}
/* ---- 설계 → 실행용 케이스 ---- */
function cuToCase(c){const r=RH[c.rhythm];
 const C={group:'사용자 정의',name:c.title||('사용자 정의 · '+r.name),rhythm:c.rhythm,hr:r.pulse?(+c.hr||r.hr):0,sbp:r.pulse?(+c.sbp||100):0,spo2:+c.spo2||94,
  cause:(!r.pulse&&c.cause)?c.cause:null,who:c.age+'세 '+c.sex+' · '+c.wt+' kg',story:c.story,unstable:r.pulse&&(+c.sbp<90),
  custom:true,cuId:c.id,crew:+c.crew||3,cbDelay:Math.max(0,+c.cbDelay||0),cartReady:!!c.cartReady,events:(c.events||[]).map(e=>Object.assign({},e)),objectives:c.objectives,debrief:c.debrief};
 const labs=cuParseLabs(c.labs);if(Object.keys(labs).length)C.labs=labs;
 if(r.pulse&&c.det&&c.det.on)C.det={at:+c.det.at,sbp:+c.det.sbp,arrestAt:+c.det.arrestAt,to:c.det.to};
 if(r.pulse&&C.unstable&&['SVT','AF','AFL','VTP'].includes(c.rhythm))C.def=['sync'];
 return C;}
function cuRun(c){const err=cuValidate(c);if(err.length){toast(err[0]);return;}startCase('CUSTOM',SEL.mode,cuToCase(c));}
/* ---- 실행 중 지원: 팀 구성·지원팀 시간·시나리오 이벤트 ---- */
const __startCaseCu=startCase;
startCase=function(key,mode,custom){const r=__startCaseCu.apply(this,arguments);
 if(S&&S.C&&S.C.custom){const C=S.C;
  if(C.crew===2&&S.members.length>2){S.members=S.members.slice(0,2);}
  if(C.cartReady){S.cart=true;log('응급카트와 제세동기가 병실에 있습니다.','info');}
  S.cuEv=(C.events||[]).map(e=>Object.assign({done:false},e));
 }return r;};
const __tickCu=tick;
tick=function(dt){__tickCu(dt);if(!S||S.ended||!S.C||!S.C.custom)return;const P=S.P,C=S.C;
 if(S.codeBlue.status==='coming'&&!S.codeBlue.cuAdj){S.codeBlue.cuAdj=true;S.codeBlue.arr=S.codeBlue.req+C.cbDelay;if(C.cbDelay!==10)log('지원팀 도착까지 약 '+C.cbDelay+'초 걸립니다.','info');}
 for(const e of (S.cuEv||[])){if(e.done)continue;const base=e.when==='rosc'?S.roscT:0;if(base==null)continue;if(S.t<base+(+e.sec||0))continue;e.done=true;cuFire(e);}
};
function cuFire(e){const P=S.P;
 switch(e.type){
  case 'rhythm':{if(!RH[e.v])return;const wasP=P.pulse;setRhythm(e.v,+e.hr||undefined);if(!wasP&&P.pulse){S.roscT=S.t;S.flags.everRosc=true;P.sbpT=Math.max(P.sbpT,80);}if(P.pulse&&P.sbpT<60)P.sbpT=90;S.hidden.push({t:S.t,text:'[시나리오] 리듬 → '+RH[e.v].name});break;}
  case 'sbp':if(+e.v>0){P.sbpT=+e.v;S.hidden.push({t:S.t,text:'[시나리오] 목표 혈압 '+e.v});}break;
  case 'arrest':{const to=RH[e.v]&&!RH[e.v].pulse?e.v:'VF';if(P.pulse){setRhythm(to);S.hidden.push({t:S.t,text:'[시나리오] 심정지 → '+RH[to].name});}break;}
  case 'rosc':if(!P.pulse){doRosc();S.hidden.push({t:S.t,text:'[시나리오] ROSC'});}break;
  case 'fail':S.flags.forceFail=true;S.hidden.push({t:S.t,text:'[시나리오] 다음 술기 실패'});break;
  case 'msg':log(String(e.v).slice(0,200),'info');toast(String(e.v).slice(0,90));break;
  case 'lab':log('검사 결과: '+String(e.v).slice(0,200),'dev');toast('검사 결과가 나왔습니다');break;
  case 'cause':if(P.cause&&!P.causeFixed){P.causeFixed=true;S.flags.causeFixT=S.t;S.hidden.push({t:S.t,text:'[시나리오] 원인 교정'});}break;
 }}
/* ---- 시작 화면·디브리핑에 학습 목표 ---- */
const __openIntroCu=openIntro;
openIntro=function(){__openIntroCu.apply(this,arguments);if(!S||!S.C||!S.C.custom)return;const dlg=$('#dlg');if(!dlg)return;const acts=dlg.querySelector('.acts');
 const obj=String(S.C.objectives||'').split('\n').map(x=>x.trim()).filter(Boolean);
 let h='';if(obj.length)h+='<div class="cu-obj"><b>학습 목표</b><ul>'+obj.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>';
 const tm=[];if(S.C.crew===2)tm.push('현장 인원은 간호사 2명입니다');if(S.C.cartReady)tm.push('응급카트가 이미 병실에 있습니다');if(S.C.cbDelay!==10)tm.push('지원팀은 호출 후 약 '+S.C.cbDelay+'초 뒤 도착합니다');
 if(tm.length)h+='<p class="muted cu-team">'+tm.map(esc).join(' · ')+'</p>';
 if(h&&acts)acts.insertAdjacentHTML('beforebegin',h);};
const __renderDebriefCu=renderDebrief;
renderDebrief=function(tab){__renderDebriefCu.apply(this,arguments);if(!S||!S.C||!S.C.custom||tab!=='score')return;const el=$('#scr-debrief');if(!el)return;
 const obj=String(S.C.objectives||'').split('\n').map(x=>x.trim()).filter(Boolean),db=String(S.C.debrief||'').split('\n').map(x=>x.trim()).filter(Boolean);if(!obj.length&&!db.length)return;
 const box=document.createElement('div');box.className='cu-dbox';
 box.innerHTML=(obj.length?'<div><b>이 케이스의 학습 목표</b><ul>'+obj.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'')+(db.length?'<div><b>디브리핑 질문·포인트</b><ul>'+db.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'');
 const head=el.querySelector('.db-head');if(head)head.insertAdjacentElement('afterend',box);else el.prepend(box);};
/* ---- 케이스 선택 화면: 라이브러리 + 설계실 ---- */
const __renderPickCu=renderPick;
renderPick=function(){__renderPickCu.apply(this,arguments);const el=$('#scr-pick');const old=el.querySelector('.builder');if(!old)return;
 const box=document.createElement('div');box.className='builder cu';box.id='cu-box';old.replaceWith(box);cuRender();};
function cuRhOpts(sel,pulseOnly,arrestOnly){return Object.keys(RH).filter(k=>(!pulseOnly||RH[k].pulse)&&(!arrestOnly||!RH[k].pulse)).map(k=>'<option value="'+k+'"'+(k===sel?' selected':'')+'>'+esc(RH[k].name)+'</option>').join('');}
function cuRender(){const box=$('#cu-box');if(!box)return;const list=cuList();
 let h='<div class="cu-head"><div><h3>사용자 정의 케이스</h3><p class="muted">수업 목표에 맞는 케이스를 만들어 저장하고, 코드로 다른 PC와 공유합니다.</p></div><div class="cu-hbtn"><button class="btn primary" data-cu="new">새 케이스 만들기</button><button class="btn" data-cu="imp">가져오기</button></div></div>';
 if(CU.imp)h+='<div class="cu-imp"><label for="cu-code">케이스 코드 붙여넣기 (또는 .json 파일 열기)</label><textarea id="cu-code" rows="4" placeholder="CBL1:… 로 시작하는 코드"></textarea><div class="cu-row"><input type="file" id="cu-file" accept=".json,application/json"><span class="sp"></span><button class="btn" data-cu="impCancel">닫기</button><button class="btn primary" data-cu="impGo">가져오기</button></div></div>';
 h+=list.length?'<div class="cu-lib">'+list.map(c=>{const r=RH[c.rhythm]||{name:'?'};return'<div class="cu-card"><div class="cu-ct"><b>'+esc(c.title)+'</b><span>'+esc(r.name)+(r.pulse?' · HR '+c.hr+' · BP '+c.sbp:'')+(c.cause?' · 원인 '+esc((CAUSES[c.cause]||{}).name||''):'')+(c.events&&c.events.length?' · 이벤트 '+c.events.length+'개':'')+'</span></div><div class="cu-cb"><button class="btn sm primary" data-cu="run" data-id="'+c.id+'">시작</button><button class="btn sm" data-cu="edit" data-id="'+c.id+'">편집</button><button class="btn sm" data-cu="dup" data-id="'+c.id+'">복제</button><button class="btn sm" data-cu="share" data-id="'+c.id+'">공유</button><button class="btn sm danger" data-cu="del" data-id="'+c.id+'">삭제</button></div></div>';}).join('')+'</div>':'<p class="muted cu-empty">저장된 케이스가 없습니다. [새 케이스 만들기]로 시작하세요. 기존 케이스를 틀로 불러와 고칠 수도 있습니다.</p>';
 if(CU.edit)h+=cuEditorHTML(CU.edit);
 box.innerHTML=h;}
function cuEditorHTML(c){const r=RH[c.rhythm]||RH.VF,pulse=r.pulse;
 const sec=(n,t,body)=>'<fieldset class="cu-sec"><legend><span>'+n+'</span>'+t+'</legend>'+body+'</fieldset>';
 let h='<div class="cu-ed" id="cu-ed"><div class="cu-edh"><h3>'+(c.id?'케이스 편집':'새 케이스')+'</h3><div class="cu-row"><label for="cu-tpl" class="muted">틀 불러오기</label><select id="cu-tpl"><option value="">— 기존 케이스 선택 —</option>'+CASE_KEYS.filter(k=>CASES[k].rhythm).map(k=>'<option value="'+k+'">'+esc(CASES[k].name)+'</option>').join('')+'</select></div></div>';
 h+=sec(1,'기본 정보','<div class="fgrid"><div class="field w3"><label for="cu-title">케이스 제목</label><input id="cu-title" data-f="title" value="'+esc(c.title)+'" placeholder="예: 투석 환자의 고칼륨 서맥 → PEA"></div><div class="field"><label for="cu-age">나이</label><input id="cu-age" data-f="age" type="number" value="'+c.age+'"></div><div class="field"><label for="cu-sex">성별</label><select id="cu-sex" data-f="sex"><option'+(c.sex==='남성'?' selected':'')+'>남성</option><option'+(c.sex==='여성'?' selected':'')+'>여성</option></select></div><div class="field"><label for="cu-wt">체중 kg</label><input id="cu-wt" data-f="wt" type="number" value="'+c.wt+'"></div><div class="field w6"><label for="cu-story">상황 설명 (학생에게 보이는 첫 정보)</label><textarea id="cu-story" data-f="story" rows="2">'+esc(c.story)+'</textarea></div></div>');
 h+=sec(2,'시작 상태','<div class="fgrid"><div class="field w2"><label for="cu-rh">첫 리듬</label><select id="cu-rh" data-f="rhythm">'+cuRhOpts(c.rhythm)+'</select></div><div class="field"><label for="cu-hr">심박수</label><input id="cu-hr" data-f="hr" type="number" value="'+c.hr+'"'+(pulse?'':' disabled')+'></div><div class="field"><label for="cu-sbp">수축기 혈압</label><input id="cu-sbp" data-f="sbp" type="number" value="'+c.sbp+'"'+(pulse?'':' disabled')+'></div><div class="field"><label for="cu-sp">SpO₂</label><input id="cu-sp" data-f="spo2" type="number" value="'+c.spo2+'"></div><div class="field"><label for="cu-cause">가역적 원인</label><select id="cu-cause" data-f="cause"'+(pulse?' disabled':'')+'><option value="">없음</option>'+Object.keys(CAUSES).map(k=>'<option value="'+k+'"'+(c.cause===k?' selected':'')+'>'+CAUSES[k].name+'</option>').join('')+'</select></div>'+
  '<div class="field w6"><label for="cu-labs">검사값 (검사 탭에 표시, 예: K=7.8, Hb=6.3, pH=7.1, lac=8)</label><input id="cu-labs" data-f="labs" value="'+esc(c.labs)+'"></div></div><p class="muted cu-note">'+(pulse?'맥박이 있는 리듬입니다. 수축기 혈압 90 미만이면 불안정으로 보고, 빈맥은 동기화 심율동전환이 1차 치료가 됩니다.':'심정지 리듬입니다. 원인을 고르면 그 원인을 교정해야 ROSC가 됩니다(PEA·무수축).')+'</p>');
 h+=sec(3,'치료하지 않으면 (맥박 있는 리듬)',pulse?'<div class="fgrid"><div class="field w2"><label class="cu-chk"><input type="checkbox" data-f="det.on"'+(c.det.on?' checked':'')+'> 악화 진행 켜기</label></div><div class="field"><label for="cu-dat">혈압 저하 시점(초)</label><input id="cu-dat" data-f="det.at" type="number" value="'+c.det.at+'"></div><div class="field"><label for="cu-dsbp">떨어질 혈압</label><input id="cu-dsbp" data-f="det.sbp" type="number" value="'+c.det.sbp+'"></div><div class="field"><label for="cu-darr">심정지 시점(초)</label><input id="cu-darr" data-f="det.arrestAt" type="number" value="'+c.det.arrestAt+'"></div><div class="field"><label for="cu-dto">심정지 리듬</label><select id="cu-dto" data-f="det.to">'+cuRhOpts(c.det.to,false,true)+'</select></div></div><p class="muted cu-note">1차 치료(약물·조율·전기치료)를 하면 악화가 멈춥니다.</p>':'<p class="muted cu-note">심정지 리듬에는 해당하지 않습니다.</p>');
 const evRows=c.events.map((e,i)=>{const t=e.type;let val='';
  if(t==='rhythm')val='<select data-ev="'+i+'" data-k="v">'+cuRhOpts(e.v)+'</select><input data-ev="'+i+'" data-k="hr" type="number" placeholder="HR" value="'+(e.hr||'')+'">';
  else if(t==='arrest')val='<select data-ev="'+i+'" data-k="v">'+cuRhOpts(e.v||'VF',false,true)+'</select>';
  else if(t==='sbp')val='<input data-ev="'+i+'" data-k="v" type="number" placeholder="mmHg" value="'+(e.v||'')+'">';
  else if(t==='msg'||t==='lab')val='<input class="wide" data-ev="'+i+'" data-k="v" placeholder="'+(t==='msg'?'예: 보호자가 DNR 서류를 가져왔습니다':'예: K 7.9 mmol/L')+'" value="'+esc(e.v||'')+'">';
  return'<div class="cu-ev"><select data-ev="'+i+'" data-k="when"><option value="t"'+(e.when!=='rosc'?' selected':'')+'>시작 후</option><option value="rosc"'+(e.when==='rosc'?' selected':'')+'>ROSC 후</option></select><input data-ev="'+i+'" data-k="sec" type="number" value="'+e.sec+'" class="sec"><span>초</span><select data-ev="'+i+'" data-k="type">'+Object.keys(CU_EV_TYPES).map(k=>'<option value="'+k+'"'+(k===t?' selected':'')+'>'+CU_EV_TYPES[k]+'</option>').join('')+'</select>'+val+'<button class="btn sm danger" data-cu="evDel" data-i="'+i+'" title="삭제">×</button></div>';}).join('');
 h+=sec(4,'시나리오 이벤트','<p class="muted cu-note">정해진 시점에 자동으로 일어나는 일입니다. 예: ROSC 후 90초에 VF 재정지, 시작 후 60초에 검사 결과 도착.</p>'+(evRows||'<p class="muted cu-empty">이벤트가 없습니다.</p>')+'<div class="cu-row"><button class="btn sm" data-cu="evAdd">+ 이벤트 추가</button><span class="sp"></span><button class="btn sm" data-cu="evPreset" data-p="rearrest">예시: ROSC 후 재정지</button><button class="btn sm" data-cu="evPreset" data-p="lab">예시: 검사 결과</button></div>');
 h+=sec(5,'팀과 환경','<div class="fgrid"><div class="field"><label for="cu-crew">처음 현장 인원</label><select id="cu-crew" data-f="crew"><option value="3"'+(c.crew!=2?' selected':'')+'>3명 (간호사 2·인턴 1)</option><option value="2"'+(c.crew==2?' selected':'')+'>2명 (간호사 2)</option></select></div><div class="field"><label for="cu-cbd">지원팀 도착 (초)</label><input id="cu-cbd" data-f="cbDelay" type="number" value="'+c.cbDelay+'"></div><div class="field w2"><label class="cu-chk"><input type="checkbox" data-f="cartReady"'+(c.cartReady?' checked':'')+'> 응급카트·제세동기가 처음부터 병실에 있음</label></div></div>');
 h+=sec(6,'학습 목표와 디브리핑','<div class="fgrid"><div class="field w3"><label for="cu-obj">학습 목표 (한 줄에 하나, 시작 화면에 표시)</label><textarea id="cu-obj" data-f="objectives" rows="3" placeholder="고칼륨혈증을 의심하고 염화칼슘을 투여한다">'+esc(c.objectives)+'</textarea></div><div class="field w3"><label for="cu-db">디브리핑 질문·포인트 (결과 화면에 표시)</label><textarea id="cu-db" data-f="debrief" rows="3" placeholder="어떤 단서로 원인을 의심했나요?">'+esc(c.debrief)+'</textarea></div></div>');
 h+='<div class="cu-err" id="cu-err"></div><div class="cu-row cu-foot"><button class="btn" data-cu="cancel">닫기</button><span class="sp"></span><button class="btn" data-cu="try">저장하지 않고 시작</button><button class="btn" data-cu="save">저장</button><button class="btn primary" data-cu="saveRun">저장하고 시작</button></div></div>';
 return h;}
function cuSetField(c,f,v){if(f.startsWith('det.')){c.det[f.slice(4)]=v;return;}c[f]=v;}
function cuReadInputs(){const c=CU.edit;if(!c)return;const ed=$('#cu-ed');if(!ed)return;
 ed.querySelectorAll('[data-f]').forEach(inp=>{const f=inp.dataset.f;let v=inp.type==='checkbox'?inp.checked:inp.value;if(inp.type==='number')v=inp.value===''?0:+inp.value;if(f==='crew')v=+v;cuSetField(c,f,v);});
 ed.querySelectorAll('[data-ev]').forEach(inp=>{const e=c.events[+inp.dataset.ev];if(!e)return;const k=inp.dataset.k;e[k]=(k==='sec'||k==='hr'||(k==='v'&&e.type==='sbp'))?(inp.value===''?0:+inp.value):inp.value;});}
function cuShowErr(err){const el=$('#cu-err');if(el)el.innerHTML=err.length?err.map(x=>'<div>'+esc(x)+'</div>').join(''):'';}
function cuEncode(c){const o=Object.assign({},c);delete o.id;try{return 'CBL1:'+btoa(unescape(encodeURIComponent(JSON.stringify(o))));}catch(e){return '';}}
function cuDecode(s){s=String(s||'').trim();try{let o;if(s.startsWith('CBL1:'))o=JSON.parse(decodeURIComponent(escape(atob(s.slice(5)))));else o=JSON.parse(s);if(!o||!o.rhythm||!RH[o.rhythm])return null;const b=cuBlank();Object.assign(b,o);b.det=Object.assign(cuBlank().det,o.det||{});b.events=Array.isArray(o.events)?o.events.filter(e=>e&&CU_EV_TYPES[e.type]).slice(0,40):[];b.id=null;return b;}catch(e){return null;}}
function cuShare(c){const code=cuEncode(c);
 openDlg('<h2>케이스 공유</h2><p class="muted">이 코드를 복사해 다른 PC의 [가져오기]에 붙여넣으면 같은 케이스가 만들어집니다. 설치판에서는 파일로도 저장할 수 있습니다.</p><textarea id="cu-share" rows="6" readonly style="width:100%;font-family:var(--f-mono);font-size:12px">'+esc(code)+'</textarea><div class="acts"><button class="btn" data-act="closeDlg">닫기</button><button class="btn" data-cu="file" data-id="'+(c.id||'')+'">파일로 저장</button><button class="btn primary" data-cu="copy">코드 복사</button></div>',true);}
function cuFile(c){try{const blob=new Blob([JSON.stringify(Object.assign({},c,{id:undefined}),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(c.title||'case').replace(/[\\/:*?"<>|]/g,'_')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast('파일 저장을 시작했습니다. 저장이 안 되면 코드 복사를 쓰세요.');}catch(e){toast('이 환경에서는 파일 저장이 막혀 있습니다. 코드 복사를 쓰세요.');}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cu]');if(!b)return;e.preventDefault();e.stopPropagation();const a=b.dataset.cu,id=b.dataset.id;const list=cuList();const find=()=>list.find(x=>x.id===id);
 if(a!=='new'&&a!=='imp'&&a!=='impGo'&&a!=='impCancel'&&a!=='copy'&&a!=='file')cuReadInputs();
 switch(a){
  case 'new':CU.edit=cuBlank();CU.imp=false;cuRender();setTimeout(()=>{const t=$('#cu-title');if(t){t.focus();t.scrollIntoView({block:'center',behavior:'smooth'});}},50);return;
  case 'edit':{const c=find();if(c){CU.edit=JSON.parse(JSON.stringify(c));cuRender();setTimeout(()=>{const t=$('#cu-ed');if(t)t.scrollIntoView({block:'start',behavior:'smooth'});},50);}return;}
  case 'dup':{const c=find();if(c){const n=JSON.parse(JSON.stringify(c));n.id=cuId();n.title=c.title+' (복사본)';list.push(n);cuSave(list);cuRender();toast('복제했습니다.');}return;}
  case 'del':{if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='한 번 더';setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.textContent='삭제';}},2500);return;}cuSave(list.filter(x=>x.id!==id));if(CU.edit&&CU.edit.id===id)CU.edit=null;cuRender();toast('삭제했습니다.');return;}
  case 'run':{const c=find();if(c)cuRun(c);return;}
  case 'share':{const c=find();if(c)cuShare(c);return;}
  case 'copy':{const t=$('#cu-share');if(!t)return;const v=t.value;const ok=()=>toast('코드를 복사했습니다.');try{navigator.clipboard.writeText(v).then(ok).catch(()=>{t.select();toast('코드를 선택했습니다. Ctrl+C로 복사하세요.');});}catch(_){t.select();toast('코드를 선택했습니다. Ctrl+C로 복사하세요.');}return;}
  case 'file':{const c=find()||CU.edit;if(c)cuFile(c);return;}
  case 'imp':CU.imp=!CU.imp;cuRender();return;
  case 'impCancel':CU.imp=false;cuRender();return;
  case 'impGo':{const c=cuDecode(($('#cu-code')||{}).value);if(!c){toast('코드를 읽을 수 없습니다. 전체를 붙여넣었는지 확인하세요.');return;}c.id=cuId();list.push(c);cuSave(list);CU.imp=false;cuRender();toast('“'+c.title+'” 케이스를 가져왔습니다.');return;}
  case 'cancel':CU.edit=null;cuRender();return;
  case 'evAdd':CU.edit.events.push({when:'t',sec:60,type:'msg',v:''});cuRender();return;
  case 'evDel':CU.edit.events.splice(+b.dataset.i,1);cuRender();return;
  case 'evPreset':if(b.dataset.p==='rearrest')CU.edit.events.push({when:'rosc',sec:90,type:'arrest',v:'VF'});else CU.edit.events.push({when:'t',sec:60,type:'lab',v:'K 7.9 mmol/L, pH 7.12'});cuRender();return;
  case 'try':case 'save':case 'saveRun':{const c=CU.edit;const err=cuValidate(c);cuShowErr(err);if(err.length){toast(err[0]);return;}
   if(a!=='try'){if(!c.id){c.id=cuId();list.push(JSON.parse(JSON.stringify(c)));}else{const i=list.findIndex(x=>x.id===c.id);if(i>=0)list[i]=JSON.parse(JSON.stringify(c));else list.push(JSON.parse(JSON.stringify(c)));}cuSave(list);toast('저장했습니다.');}
   if(a==='save'){cuRender();return;}CU.edit=null;cuRun(c);return;}
 }},true);
document.addEventListener('change',e=>{const t=e.target;
 if(t.id==='cu-file'&&t.files&&t.files[0]){const fr=new FileReader();fr.onload=()=>{const ta=$('#cu-code');if(ta)ta.value=String(fr.result||'');};fr.readAsText(t.files[0]);return;}
 if(!CU.edit)return;
 if(t.id==='cu-tpl'&&t.value){const keep=CU.edit.id;CU.edit=cuFromPreset(t.value);CU.edit.id=keep;cuRender();toast('틀을 불러왔습니다. 필요한 부분을 고치세요.');return;}
 if(t.id==='cu-rh'){cuReadInputs();const r=RH[t.value];if(r.pulse){if(!CU.edit.hr)CU.edit.hr=r.hr||80;if(!CU.edit.sbp)CU.edit.sbp=100;CU.edit.cause='';}else{CU.edit.hr=0;CU.edit.sbp=0;}cuRender();return;}
 if(t.dataset&&t.dataset.k==='type'){cuReadInputs();const e2=CU.edit.events[+t.dataset.ev];e2.v=e2.type==='rhythm'?'VF':e2.type==='arrest'?'VF':e2.type==='sbp'?90:'';cuRender();return;}
},true);
if(window.CB){CB.tick=tick;CB.startCase=startCase;}
