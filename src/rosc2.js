/* ============ ROSC 이후 처치 안내 패널 ============
   [목표] 탭의 ROSC 이후 항목마다 바로 누를 수 있는 버튼을 붙이고, 다음에 할 일을 강조합니다. */
function roscSteps(){const P=S.P,rc=S.roscConfirmed&&P.pulse,hint=S.mode!=='test';
 const cpr=S.members.filter(m=>m.task==='cpr');const vent=S.members.find(m=>m.task==='bvm'&&m.prog>=m.prep);
 const n=S.nibp.last,afterR=n&&n.ok&&S.roscT!=null&&n.t>S.roscT,map=afterR?Math.round((n.sys+2*n.dia)/3):null;
 const B=(attrs,label,cls)=>'<button class="btn sm'+(cls?' '+cls:'')+'" '+attrs+'>'+label+'</button>';
 const steps=[];
 steps.push({k:'rosc',t:'ROSC 선언',ok:rc,why:'조직화된 리듬 + 맥박 촉지를 확인하고 선언합니다.',act:rc?'':B('data-act="rosc"','ROSC 선언','primary')});
 steps.push({k:'cpr',t:'가슴압박 중지',ok:rc&&!P.compressing&&!cpr.length,why:'맥박이 있으면 압박을 멈춥니다.',act:cpr.map(m=>B('data-stop="'+m.id+'"',esc(m.name)+' 압박 중지')).join('')});
 const mon=[];if(!P.pads)mon.push(B('data-otask="pads"','제세동 패드'));if(!P.probe)mon.push(B('data-otask="spo2"','SpO₂ 센서'));if(!P.etco2Sensor)mon.push(B('data-otask="etco2"','EtCO₂ 센서'));if(!P.cuff)mon.push(B('data-otask="cuff"','혈압 커프'));
 steps.push({k:'mon',t:'감시장치 연결 (ECG·SpO₂·EtCO₂·혈압 커프)',ok:P.pads&&P.probe&&P.etco2Sensor&&P.cuff,why:'목표를 재려면 먼저 센서가 있어야 합니다.',act:mon.join('')});
 const sp=P.probe?Math.round(P.spo2):null;
 steps.push({k:'o2',t:'산소 조절 — SpO₂ 90–98%',v:sp!=null?'현재 '+sp+'%':'센서 없음',ok:rc&&P.spo2>=90&&P.spo2<=98.4,why:'과산소도 해롭습니다. 98% 넘으면 FiO₂를 낮추고, 90% 미만이면 올립니다.',
  act:(vent||P.o2!=='room'||P.airway==='ett'?'<span class="rs-lab">FiO₂</span><div class="seg">'+[1,0.6,0.4,0.3].map(x=>'<button data-act="fio2" data-v="'+x+'" class="'+(P.fio2===x?'on':'')+'">'+Math.round(x*100)+'%</button>').join('')+'</div>':B('data-otask="bvm"','백마스크 환기 시작'))});
 const co=P.etco2Sensor?Math.round(P.etco2):null;
 steps.push({k:'vent',t:'환기 — 10회/분, EtCO₂ 35–45',v:co!=null?'EtCO₂ '+co+(vent?' · '+vent.ventRate+'회/분':''):'EtCO₂ 센서 없음',ok:rc&&P.etco2Sensor&&P.etco2>=35&&P.etco2<=45,why:'과환기는 뇌혈류를 줄입니다. EtCO₂가 낮으면 횟수를 줄이고, 높으면 늘립니다.',
  act:vent?'<span class="rs-lab">횟수</span><div class="seg">'+[8,10,12].map(x=>'<button data-act="vrate" data-m="'+vent.id+'" data-v="'+x+'" class="'+(vent.ventRate===x?'on':'')+'">'+x+'</button>').join('')+'</div>'+(P.etco2Sensor?'':B('data-otask="etco2"','EtCO₂ 센서')):B('data-otask="bvm"','백마스크 환기 시작')+(P.airway!=='ett'?B('data-otask="ett"','기관내삽관'):'')});
 const neOn=S.infusions.some(f=>f.fid==='neD'),nsOn=S.infusions.some(f=>f.fid==='ns500'||f.fid==='ns1000');const bpAct=[];
 const txSince=S.drugs.some(d=>['neD','ns500','ns1000'].includes(d.form)&&(!n||d.t>n.t));
 const meas=P.cuff?B('data-act="nibp"',S.nibp.busy?'측정 중…':(map!=null?'혈압 다시 측정':'혈압 측정'),(txSince||neOn||nsOn)&&!S.nibp.busy?'primary':''):B('data-otask="cuff"','혈압 커프 먼저');
 const txBtns=[];if(map!=null&&map<65&&!txSince){if(!nsOn)txBtns.push(B('data-drug="ns500"','수액 500 mL'));if(!neOn)txBtns.push(B('data-drug="neD"','노르에피네프린'));}
 if(map!=null&&map<65&&txSince){bpAct.push(meas);if(!nsOn)txBtns.push(B('data-drug="ns500"','수액 추가 500 mL'));if(!neOn)txBtns.push(B('data-drug="neD"','노르에피네프린'));bpAct.push(...txBtns);}
 else{bpAct.push(...txBtns,meas);}if(neOn||nsOn)bpAct.push('<span class="rs-lab">'+(neOn?'노르에피네프린':'')+(neOn&&nsOn?'·':'')+(nsOn?'수액':'')+' 주입 중 — 잠시 뒤 다시 측정</span>');
 steps.push({k:'bp',t:'혈압 — MAP ≥ 65 (수축기 ≥ 90)',v:map!=null?'MAP '+map+' ('+n.sys+'/'+n.dia+')':'ROSC 후 측정 없음',ok:rc&&S.bpAfterRosc&&map!=null&&map>=65,why:(map!=null&&map<65&&txSince)?'수액·승압제를 줬으면 먼저 혈압을 다시 재서 효과를 확인하세요. 그래도 낮으면 추가 처치합니다.':'저혈압을 두면 다시 심정지가 올 수 있습니다. 낮으면 수액·혈관수축제 후 다시 잽니다.',act:bpAct.join('')});
 steps.push({k:'ecg',t:'12유도 심전도',ok:rc&&S.ecg12Done,why:'ST 상승이면 응급 관상동맥 조영술을 연계합니다.',act:S.ecg12Done?'':B('data-otask="ecg12"','12유도 시행')});
 steps.push({k:'ttm',t:'체온 조절 결정 (32–37.5 °C)',ok:rc&&S.ttm,why:'지시에 따르지 않으면 36시간 이상 체온 조절, 발열 예방을 결정합니다.',act:S.ttm?'':B('data-act="ttm"','체온 조절 결정')});
 steps.push({k:'stable',t:'안정 유지 30초',v:rc?Math.min(30,Math.floor(S.stable))+'/30초':'',ok:rc&&S.stable>=30,why:'위 목표가 모두 유지되면 30초 뒤 케이스가 끝납니다.',act:''});
 return steps;}
const __renderSideR=renderSide;
function roscStepsHTML(){const steps=roscSteps(),next=steps.findIndex(s=>!s.ok),hint=S.mode!=='test';
 return '<div class="rsteps">'+(S.roscConfirmed?'':'<p class="rs-top">맥박이 돌아온 것 같다면: 압박을 멈추고 리듬·맥박을 확인한 뒤 <b>ROSC 선언</b>부터 하세요.</p>')+steps.map((s,i)=>'<div class="rs '+(s.ok?'ok':i===next?'next':'')+'"><div class="rs-h"><i>'+(s.ok?'✓':(i+1))+'</i><b>'+esc(s.t)+'</b>'+(s.v?'<span class="num">'+esc(s.v)+'</span>':'')+'</div>'+(!s.ok&&i===next&&s.why&&hint?'<p class="rs-why">'+esc(s.why)+'</p>':'')+(!s.ok&&s.act?'<div class="rs-act">'+s.act+'</div>':'')+'</div>').join('')+'</div>';}
renderSide=function(){
 const use=S&&(S.ui.stab||'goal')==='goal'&&S.roscT!=null&&(S.P.pulse||S.roscConfirmed);
 if(!use)return __renderSideR.apply(this,arguments);
 const o=setHTML;setHTML=function(el,h){if(el&&el.id==='sbody'){const a=h.indexOf('<div class="cond">');if(a>=0){let b=h.indexOf('<div class="infl">',a);if(b<0)b=h.length;h=h.slice(0,a).replace('ROSC 이후 목표 · 완료 조건','ROSC 이후 처치 — 순서대로 진행')+roscStepsHTML()+h.slice(b);}}return o(el,h);};
 try{return __renderSideR.apply(this,arguments);}finally{setHTML=o;}};
const __roscDeclareR=roscDeclare;
roscDeclare=function(){const was=S&&S.roscConfirmed;__roscDeclareR.apply(this,arguments);if(S&&!was&&S.roscConfirmed){S.ui.stab='goal';renderSim();if(S.mode!=='test')toast('오른쪽 [목표] 탭에서 ROSC 이후 처치를 순서대로 진행하세요.');}};
