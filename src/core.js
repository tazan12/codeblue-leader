
'use strict';
/* ============ 공통 도구 ============ */
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
function setHTML(el,h){if(el&&el._h!==h){el.innerHTML=h;el._h=h;}}
function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
let toastT=null;
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200);}

/* ============ 리듬 정의 ============ */
const RH={
 NSR:{name:'정상 동율동',pulse:true,hr:82,beat:'narrow',feat:'규칙적, 60–100회/분, 모든 QRS 앞에 같은 모양의 P파',tx:'치료 대상이 아닙니다. 환자 상태와 원인을 확인합니다.'},
 ST:{name:'동성 빈맥',pulse:true,hr:116,beat:'narrow',feat:'규칙적, 100회/분 초과, P파 정상',tx:'통증·발열·저혈량·저산소 같은 원인을 교정합니다. ROSC 직후에도 흔합니다.'},
 SB:{name:'동성 서맥',pulse:true,hr:40,beat:'narrow',feat:'규칙적, 50회/분 미만, P파와 QRS가 1:1',tx:'증상이 있으면 아트로핀 1 mg, 효과가 없으면 경피 조율이나 도파민·에피네프린 주입.'},
 AVB3:{name:'3도 방실차단',pulse:true,hr:34,beat:'wide',pIndep:78,feat:'P파와 QRS가 서로 무관하게 뛰고, 넓은 이탈 박동',tx:'아트로핀 효과가 낮습니다. 경피 조율을 바로 준비하고 정맥 조율로 연결합니다.'},
 SVT:{name:'상심실성 빈맥(SVT)',pulse:true,hr:188,beat:'noP',feat:'규칙적, 좁은 QRS, 150–250회/분, P파가 보이지 않음',tx:'안정: 미주신경 자극 → 아데노신 6 mg → 12 mg. 불안정: 동기화 심율동전환.'},
 AF:{name:'심방세동',pulse:true,hr:150,beat:'noP',irregular:true,base:'fib',feat:'불규칙하게 불규칙, P파 없음, 기저선 잔떨림',tx:'안정: 딜티아젬·베타차단제로 심박수 조절. 불안정: 동기화 심율동전환.'},
 AFL:{name:'심방조동',pulse:true,hr:150,beat:'noP',base:'flutter',feat:'톱니 모양 F파, 2:1 전도면 약 150회/분',tx:'심박수 조절 또는 동기화 심율동전환. 아데노신은 F파를 드러내는 데 쓰입니다.'},
 VTP:{name:'심실빈맥(맥박 있음)',pulse:true,hr:168,beat:'vt',feat:'넓은 QRS(0.12초 이상), 규칙적, 120회/분 초과',tx:'안정: 아미오다론 150 mg 10분 주입. 불안정: 동기화 심율동전환.'},
 PVT:{name:'무맥성 심실빈맥',pulse:false,shock:true,hr:192,beat:'vt',feat:'모양은 VT와 같고 맥박이 없음',tx:'즉시 제세동 후 CPR 2분. 심실세동과 같은 흐름입니다.'},
 VF:{name:'심실세동',pulse:false,shock:true,cont:'vf',feat:'불규칙한 진동, 식별할 수 있는 QRS 없음',tx:'즉시 제세동 → 바로 CPR 2분 → 리듬 확인을 반복합니다.'},
 TDP:{name:'Torsades de Pointes',pulse:false,shock:true,cont:'tdp',feat:'QRS 진폭이 기준선을 감고 돌듯 커졌다 작아짐',tx:'맥박이 없으면 제세동. 황산마그네슘 1–2 g.'},
 PEA:{name:'무맥성 전기활동(PEA)',pulse:false,hr:48,beat:'pea',feat:'조직화된 리듬이 보이지만 맥박이 만져지지 않음',tx:'CPR, 에피네프린 조기 투여, 가역적 원인(5H·5T) 탐색.'},
 ASY:{name:'무수축',pulse:false,cont:'flat',feat:'거의 평탄한 선. 리드 연결과 감도를 확인',tx:'CPR과 에피네프린 조기 투여. 제세동 대상이 아닙니다.'}
};
const READS=[['NSR','정상 동율동'],['ST','동성 빈맥'],['SB','동성 서맥'],['AVB3','3도 방실차단'],['SVT','상심실성 빈맥(SVT)'],['AF','심방세동'],['AFL','심방조동'],['VT','심실빈맥(넓은 QRS)'],['VF','심실세동'],['TDP','Torsades de Pointes'],['ASY','무수축'],['ORG','조직화된 리듬 · 맥박 확인 필요'],['PACED','심박조율 리듬(포획)']];
const READ_NAME=Object.fromEntries(READS);
function acceptReads(P){if(P.paceCapture)return['PACED'];return({NSR:['NSR','ORG'],ST:['ST','ORG'],SB:['SB','ORG'],AVB3:['AVB3'],SVT:['SVT'],AF:['AF'],AFL:['AFL'],VTP:['VT'],PVT:['VT'],VF:['VF'],TDP:['TDP','VT'],PEA:['ORG','SB','NSR'],ASY:['ASY']})[P.rhythm]||[];}

/* ============ 파형 엔진 ============ */
function g(x,m,s,a){const d=(x-m)/s;return a*Math.exp(-0.5*d*d);}
const TPL={
 narrow:(d,k)=>g(d,-0.16*k,0.022,0.13)+g(d,-0.028,0.008,-0.12)+g(d,0,0.011,1.05)+g(d,0.028,0.01,-0.28)+g(d,0.27*k,0.05*k,0.28),
 noP:(d,k)=>g(d,-0.028,0.008,-0.1)+g(d,0,0.011,1.0)+g(d,0.028,0.01,-0.25)+g(d,0.23*k,0.045*k,0.22),
 wide:(d)=>g(d,0,0.04,0.85)+g(d,0.08,0.035,-0.45)+g(d,0.34,0.07,-0.3),
 vt:(d)=>g(d,0,0.05,1.25)+g(d,0.12,0.05,-0.85),
 pea:(d)=>g(d,-0.02,0.01,-0.08)+g(d,0,0.02,0.55)+g(d,0.04,0.018,-0.2)+g(d,0.3,0.06,0.13),
 p:(d)=>g(d,0,0.024,0.13),
 spike:(d)=>g(d,0,0.0028,1.5),
 paced:(d)=>g(d,0,0.0028,1.5)+g(d,0.06,0.04,0.95)+g(d,0.14,0.04,-0.45)+g(d,0.36,0.07,-0.32),
 comp:(d)=>g(d,0.09,0.06,1.05)-g(d,0.22,0.06,0.32),
 pleth:(d)=>g(d,0.18,0.07,1)+g(d,0.38,0.06,0.28)
};
const QRSK={narrow:1,noP:1,wide:1,vt:1,pea:1,paced:1};
class Engine{
 constructor(src){this.src=src;this.ev=[];this.nB=0.4;this.nP=0.2;this.nC=0;this.nPace=0;this.nV=1.2;this.cc=0;this.lastRh=null;this.lastVent=-99;this.onBeat=null;this.tcur=0;}
 step(t){
  const P=this.src(),r=RH[P.rhythm],LA=0.4;
  if(P.rhythm!==this.lastRh){this.ev=this.ev.filter(e=>e.t<=t||e.k==='comp'||e.k==='vent');this.nB=t+0.3;this.lastRh=P.rhythm;}
  const pacing=P.pace&&P.pace.on&&P.pads, capt=pacing&&P.paceCapture;
  if(r.beat){while(this.nB<=t+LA){const bt=this.nB;let iv=60/clamp(P.hr,15,300);if(r.irregular)iv*=0.6+Math.random()*0.8;
    if(!(P.holdUntil&&bt<P.holdUntil)&&!capt)this.ev.push({t:bt,k:r.beat,perf:!!P.pulse,kf:clamp(iv/0.8,0.45,1.25)});
    this.nB=bt+(P.holdUntil&&bt<P.holdUntil?0.25:iv);}}else this.nB=t+0.3;
  if(r.pIndep){while(this.nP<=t+LA){this.ev.push({t:this.nP,k:'p'});this.nP+=60/r.pIndep;}}else this.nP=t;
  if(pacing){if(this.nPace<t)this.nPace=t+0.1;while(this.nPace<=t+LA){this.ev.push({t:this.nPace,k:capt?'paced':'spike',perf:capt});this.nPace+=60/P.pace.rate;}}else this.nPace=t;
  if(P.compressing){if(this.nC<t)this.nC=t+0.05;while(this.nC<=t+LA){this.ev.push({t:this.nC,k:'comp',a:clamp(P.compDepth/5.5,0.4,1.3)});this.cc++;let iv=60/clamp(P.compRate,40,180);
    if(P.bvm&&P.airway!=='ett'&&this.cc%30===0){this.ev.push({t:this.nC+0.9,k:'vent',d:1.2},{t:this.nC+2.3,k:'vent',d:1.3});iv+=3.4;}
    this.nC+=iv;}}else{this.nC=t;this.cc=0;}
  const asyncV=P.bvm&&(P.airway==='ett'||!P.compressing), spont=P.breathing==='normal'&&!P.bvm;
  if(asyncV||spont){if(this.nV<t)this.nV=t+0.5;const ivv=asyncV?60/clamp(P.ventRate||10,4,40):60/16;while(this.nV<=t+LA){this.ev.push({t:this.nV,k:'vent',d:Math.min(2.6,ivv-0.6)});this.nV+=ivv;}}else this.nV=t+1;
  if(this.ev.length>500||(this.ev.length&&this.ev[0].t<t-5))this.ev=this.ev.filter(e=>e.t>t-5);
 }
 advance(t){ // 이벤트 통과 감지(심음·호기 시각)
  for(const e of this.ev){if(!e.seen&&e.t<=t){e.seen=true;if(e.k==='vent')this.lastVent=e.t;else if(e.perf&&QRSK[e.k]&&this.onBeat)this.onBeat(e);}}
 }
 ecg(t){const P=this.src();if(!P.pads)return null;const r=RH[P.rhythm];let v=0;
  for(const e of this.ev){const d=t-e.t;if(d<-0.25||d>0.6)continue;if(e.k==='vent')continue;if(e.k==='comp')v+=TPL.comp(d)*e.a*0.95;else v+=TPL[e.k](d,e.kf||1);}
  if(r.cont==='vf')v+=P.vfAmp*(Math.sin(2*Math.PI*4.6*t+1.4*Math.sin(0.9*t))*0.9+0.55*Math.sin(2*Math.PI*6.4*t+2.1)+0.35*Math.sin(2*Math.PI*2.9*t+0.4*Math.sin(0.5*t)));
  else if(r.cont==='tdp'){const env=0.25+1.05*Math.abs(Math.sin(Math.PI*t/2.6));v+=env*Math.sin(2*Math.PI*3.7*t)*0.9+0.12*Math.sin(2*Math.PI*1.1*t);}
  else if(r.cont==='flat')v+=0.025*Math.sin(2*Math.PI*0.27*t);
  if(r.base==='fib')v+=0.045*(Math.sin(2*Math.PI*6.7*t)+Math.sin(2*Math.PI*8.9*t+1.2)+0.8*Math.sin(2*Math.PI*5.1*t+2.4));
  else if(r.base==='flutter'){const ph=(t*5)%1;v+=(ph<0.78?-0.22*ph/0.78:-0.22*(1-ph)/0.22)+0.11;}
  return v+(Math.random()-0.5)*0.025;}
 pleth(t){const P=this.src();if(!P.probe)return null;let v=0;const amp=clamp((P.sbp||0)/115,0.15,1.2);
  for(const e of this.ev){const d=t-e.t;if(d<0||d>0.9)continue;if(e.perf&&QRSK[e.k])v+=TPL.pleth(d)*amp;else if(e.k==='comp')v+=TPL.pleth(d*1.4)*0.3*(P.compQ||0.4);}
  return v;}
 co2(t){const P=this.src();if(!P.etco2Sensor)return null;let v=0;
  for(const e of this.ev){if(e.k!=='vent')continue;const d=t-e.t,dur=e.d;if(d<0.55||d>0.55+dur+0.2)continue;const x=d-0.55;const s=x<0.15?x/0.15:x<dur?1+0.06*(x-0.15)/dur:Math.max(0,1-(x-dur)/0.18);v=Math.max(v,s);}
  return v*(P.etco2||0);}
}
class Sweep{
 constructor(cv,ch,pps){this.cv=cv;this.ch=ch;this.pps=pps||110;this.last=null;this.bg=cssv('--mon')||'#050a09';this.resize();}
 resize(){const r=this.cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1;this.w=Math.max(60,r.width);this.h=Math.max(40,r.height);this.cv.width=Math.round(this.w*dpr);this.cv.height=Math.round(this.h*dpr);this.ctx=this.cv.getContext('2d');this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.fillStyle=this.bg;this.ctx.fillRect(0,0,this.w,this.h);this.prev=this.ch.map(()=>null);}
 draw(t,eng){if(this.last==null||t<this.last||t-this.last>1){this.last=t;this.prev=this.ch.map(()=>null);return;}
  const c=this.ctx,n=this.ch.length,rowH=this.h/n,step=1/250;c.lineWidth=1.7;c.lineJoin='round';
  for(let ts=this.last+step;ts<=t;ts+=step){if(eng){eng.step(ts);eng.advance(ts);}const x=(ts*this.pps)%this.w;c.fillStyle=this.bg;c.fillRect(x+0.5,0,12,this.h);
   for(let i=0;i<n;i++){const ch=this.ch[i];const v=ch.fn(ts);const top=i*rowH;if(v==null){this.prev[i]=null;continue;}
    const y=clamp(top+rowH*(1-(v-ch.min)/(ch.max-ch.min)),top+2,top+rowH-2);const p=this.prev[i];
    if(p&&x>p.x){c.strokeStyle=ch.color;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(x,y);c.stroke();}this.prev[i]={x,y};}}
  this.last=t;}
}

/* ============ 소리 ============ */
const snd={ctx:null,on:store.get('cbl_sound',true),
 init(){if(!this.ctx){try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume();},
 tone(f,d,v,type,f2){if(!this.on||!this.ctx)return;const c=this.ctx,o=c.createOscillator(),gn=c.createGain(),n=c.currentTime;o.type=type||'sine';o.frequency.setValueAtTime(f,n);if(f2)o.frequency.linearRampToValueAtTime(f2,n+d);gn.gain.setValueAtTime(0.0001,n);gn.gain.exponentialRampToValueAtTime(v||0.05,n+0.01);gn.gain.exponentialRampToValueAtTime(0.0001,n+d);o.connect(gn).connect(c.destination);o.start(n);o.stop(n+d+0.05);},
 beat(sp){this.tone(380+clamp(sp-70,0,30)*14,0.08,0.035);},
 click(){this.tone(1100,0.03,0.02,'square');},
 charge(){this.tone(300,4.8,0.025,'sine',1400);},
 ready(){this.tone(990,0.14,0.05,'square');},
 shock(){this.tone(110,0.3,0.12,'sawtooth',50);},
 alarm(){this.tone(880,0.12,0.04,'triangle');}
};

/* ============ 케이스·원인·약물 ============ */
const CAUSES={
 hypovolemia:{name:'저혈량',who:'66세 남성 · 70 kg',story:'대장 수술 후 1일째입니다. 배액관으로 선홍색 혈액이 많이 나온 뒤 반응이 없습니다.',labs:{Hb:6.3,lac:9.6},pocus:'심장이 작고 과수축, 하대정맥이 허탈되어 있습니다.',fixTxt:'수액 급속 주입과 출혈 조절'},
 hyperkalemia:{name:'고칼륨혈증',who:'58세 여성 · 54 kg',story:'혈액투석 환자입니다. 투석을 두 번 거른 뒤 근력 저하를 호소하다 반응이 없어졌습니다.',labs:{K:7.9},pocus:'심장 운동이 미약하고 심낭삼출은 없습니다.',fixTxt:'염화칼슘 정맥 투여'},
 hypoxia:{name:'저산소증',who:'77세 남성 · 63 kg',story:'뇌졸중 후 삼킴 장애가 있는 환자입니다. 식사 중 심한 기침과 청색증이 생긴 뒤 반응이 없습니다.',labs:{pO2:41,pCO2:74,pH:7.01},pocus:'심장 운동이 미약합니다.',fixTxt:'효과적인 환기와 전문기도기'},
 tension:{name:'긴장성 기흉',who:'55세 남성 · 80 kg',story:'우측 쇄골하 중심정맥관을 넣고 10분 뒤 호흡곤란을 호소하다 반응이 없습니다.',labs:{},pocus:'우측 폐 미끄러짐이 보이지 않고 하대정맥이 확장되어 있습니다.',ausc:'우측 호흡음이 들리지 않습니다.',fixTxt:'바늘 감압 후 흉관 삽입'},
 tamponade:{name:'심장눌림증',who:'62세 여성 · 57 kg',story:'개심술 후 3일째입니다. 흉관 배액이 갑자기 줄더니 혈압이 떨어지다 반응이 없습니다.',labs:{},pocus:'심낭삼출이 많고 우심실이 확장기에 눌립니다.',fixTxt:'심낭천자'}
};
const CASES={
 VF:{group:'심정지 · 충격 리듬',name:'심실세동',rhythm:'VF',who:'68세 남성 · 72 kg',story:'관상동맥 질환으로 입원한 환자입니다. 화장실에서 돌아온 직후 침대에 쓰러져 반응이 없습니다.'},
 PVT:{group:'심정지 · 충격 리듬',name:'무맥성 심실빈맥',rhythm:'PVT',who:'59세 여성 · 61 kg',story:'확장성 심근병증 환자입니다. 가슴 두근거림을 호소한 뒤 갑자기 의식을 잃었습니다.'},
 TDP:{group:'심정지 · 충격 리듬',name:'Torsades de Pointes',rhythm:'TDP',who:'47세 여성 · 55 kg',story:'구토·설사로 입원해 QT를 늘리는 약물을 투여받던 중 몸을 떨더니 반응이 없습니다.',labs:{K:2.9,Mg:1.1}},
 ASY:{group:'심정지 · 비충격 리듬',name:'무수축',rhythm:'ASY',who:'81세 남성 · 58 kg',story:'폐렴으로 입원한 고령 환자입니다. 새벽 순회 중 반응이 없는 상태로 발견되었습니다.'},
 PEA:{group:'심정지 · 비충격 리듬',name:'PEA · 원인 무작위',rhythm:'PEA',cause:'random',who:'',story:''},
 BRADY:{group:'서맥',name:'증상 있는 동성 서맥',rhythm:'SB',hr:38,sbp:78,spo2:94,who:'74세 여성 · 52 kg',story:'어지럼과 식은땀을 호소하며 눈앞이 캄캄하다고 합니다. 베타차단제를 복용 중입니다.',det:{at:200,sbp:66,arrestAt:330,to:'PEA'},def:['atro1','pace','dopaD','epiD']},
 AVB3:{group:'서맥',name:'3도 방실차단',rhythm:'AVB3',hr:33,sbp:72,spo2:93,who:'79세 남성 · 66 kg',story:'실신 후 병동으로 옮겨졌습니다. 의식이 흐려지고 피부가 차갑습니다.',det:{at:180,sbp:62,arrestAt:300,to:'ASY'},def:['pace','dopaD','epiD']},
 SVTU:{group:'빈맥',name:'불안정 SVT',rhythm:'SVT',hr:196,sbp:76,spo2:95,unstable:true,who:'52세 여성 · 60 kg',story:'갑자기 시작된 두근거림과 가슴 압박감을 호소합니다. 얼굴이 창백하고 혼란스러워합니다.',det:{at:200,sbp:64,arrestAt:320,to:'VF'},def:['sync']},
 SVTS:{group:'빈맥',name:'안정 SVT',rhythm:'SVT',hr:182,sbp:122,spo2:98,who:'34세 남성 · 74 kg',story:'운동 후 시작된 두근거림이 20분째 계속됩니다. 의식은 명료하고 대화가 됩니다.',def:['vagal','aden6','aden12','sync']},
 AF:{group:'빈맥',name:'빠른 심실반응 심방세동',rhythm:'AF',hr:154,sbp:106,spo2:96,who:'71세 여성 · 58 kg',story:'고관절 수술 후 2일째입니다. 두근거림과 가벼운 호흡곤란을 호소합니다.',def:['dilt15','meto5','sync']},
 VTP:{group:'빈맥',name:'맥박이 있는 심실빈맥',rhythm:'VTP',hr:170,sbp:98,spo2:95,who:'63세 남성 · 78 kg',story:'심근경색 병력이 있습니다. 가슴 불편감과 두근거림이 있지만 묻는 말에 대답합니다.',det:{at:240,sbp:78,arrestAt:360,to:'PVT'},def:['amio150i','sync']}
};
const CASE_KEYS=Object.keys(CASES);
function defFor(rh){return({SB:['atro1','pace','dopaD','epiD'],AVB3:['pace','dopaD','epiD'],SVT:['vagal','aden6','aden12','sync'],AF:['dilt15','meto5','sync'],AFL:['dilt15','meto5','sync','aden6'],VTP:['amio150i','sync']})[rh]||[];}
const DRUGS=[
 {id:'epi',name:'에피네프린',forms:[{id:'epi1',label:'1 mg 급속주입',kind:'push'},{id:'epiD',label:'5 µg/min 지속주입',kind:'drip'}],info:'심정지: 1 mg을 3–5분마다. 비충격 리듬은 가능한 빨리, 충격 리듬은 첫 제세동 이후에. 서맥·저혈압에는 2–10 µg/min 지속주입.'},
 {id:'amio',name:'아미오다론',forms:[{id:'amio300',label:'300 mg 급속주입 (심정지 첫 용량)',kind:'push'},{id:'amio150',label:'150 mg 급속주입 (심정지 추가)',kind:'push'},{id:'amio150i',label:'150 mg 10분 주입 (맥박 있는 빈맥)',kind:'timed',dur:600}],info:'제세동에 반응하지 않는 VF·pVT: 300 mg, 이후 150 mg 한 번. 맥박이 있는 넓은 QRS 빈맥: 150 mg을 10분에 걸쳐.'},
 {id:'lido',name:'리도카인',forms:[{id:'lido1',label:'1–1.5 mg/kg (100 mg)',kind:'push'},{id:'lido2',label:'0.5–0.75 mg/kg 추가 (50 mg)',kind:'push'}],info:'아미오다론 대신 쓸 수 있습니다. VF·pVT에서 1–1.5 mg/kg, 이후 0.5–0.75 mg/kg, 총 3 mg/kg까지.'},
 {id:'atro',name:'아트로핀',forms:[{id:'atro1',label:'1 mg 정맥 주사',kind:'push'}],info:'증상 있는 서맥의 1차 약물. 3–5분마다, 총 3 mg까지. 무수축·PEA에는 쓰지 않으며 고도 방실차단에는 효과가 낮습니다.'},
 {id:'aden',name:'아데노신',forms:[{id:'aden6',label:'6 mg 급속주입 + 식염수 20 mL',kind:'push'},{id:'aden12',label:'12 mg 급속주입',kind:'push'}],info:'규칙적인 좁은 QRS 빈맥에 사용합니다. 투여 직후 짧은 무수축이 보일 수 있습니다. 불규칙하거나 다형성인 넓은 QRS 빈맥에는 쓰지 않습니다.'},
 {id:'dilt',name:'딜티아젬',forms:[{id:'dilt15',label:'15 mg (0.25 mg/kg) 2분간',kind:'push'}],info:'심방세동·조동의 심박수 조절과 SVT에 사용합니다. 저혈압, 심부전, 넓은 QRS 빈맥에는 피합니다.'},
 {id:'meto',name:'메토프롤롤',forms:[{id:'meto5',label:'5 mg 정맥 주사',kind:'push'}],info:'베타차단제로 심박수를 조절합니다. 저혈압, 급성 심부전, 기관지 연축에 주의합니다.'},
 {id:'mg',name:'황산마그네슘',forms:[{id:'mg2',label:'2 g 정맥 주사',kind:'push'}],info:'Torsades de Pointes에 1–2 g. QT가 정상인 심실세동에는 일상적으로 쓰지 않습니다.'},
 {id:'dopa',name:'도파민',forms:[{id:'dopaD',label:'10 µg/kg/min 지속주입',kind:'drip'}],info:'아트로핀에 반응하지 않는 서맥, 저혈압에 5–20 µg/kg/min.'},
 {id:'ne',name:'노르에피네프린',forms:[{id:'neD',label:'0.1 µg/kg/min 지속주입',kind:'drip'}],info:'ROSC 이후 평균동맥압 65 mmHg 미만(수축기 90 미만)일 때 혈압 유지에 사용합니다.'},
 {id:'mdz',name:'미다졸람 (진정)',forms:[{id:'mdz2',label:'2 mg 정맥 주사',kind:'push'}],info:'의식 있는 환자의 동기화 심율동전환·경피 심박조율 전 진정에 씁니다. 저혈압·호흡 억제에 주의하고 소량씩 나눠 투여합니다.'},
 {id:'ns',name:'생리식염수',forms:[{id:'ns500',label:'500 mL 급속 주입',kind:'timed',dur:60},{id:'ns1000',label:'1000 mL 급속 주입',kind:'timed',dur:100}],info:'저혈량이 의심되는 PEA, ROSC 이후 저혈압에 사용합니다. 시뮬레이션에서는 주입 시간을 줄였습니다.'},
 {id:'ca',name:'염화칼슘',forms:[{id:'ca1',label:'10% 10 mL (1 g) 정맥 주사',kind:'push'}],info:'고칼륨혈증, 저칼슘혈증, 칼슘통로차단제 중독이 의심될 때 사용합니다. 일상적인 투여는 권장되지 않습니다.'},
 {id:'bic',name:'탄산수소나트륨',forms:[{id:'bic50',label:'50 mEq 정맥 주사',kind:'push'}],info:'고칼륨혈증, 삼환계 항우울제 중독 같은 특정 상황에서만 고려합니다.'}
];
const FORM={};DRUGS.forEach(d=>d.forms.forEach(f=>{FORM[f.id]=Object.assign({drug:d.id,dname:d.name},f);}));
const CREW0=[{id:'m1',name:'하늘',role:'간호사'},{id:'m2',name:'도현',role:'간호사'},{id:'m3',name:'서진',role:'인턴'}];
const CREW_CB=[{id:'m4',name:'민서',role:'전공의'},{id:'m5',name:'지우',role:'간호사'}];

/* 팀 업무 */
const TASKS={
 cpr:{label:'가슴압박 시작',busy:'가슴압박',prep:1.5,contact:true,cont:true,grp:'순환',st:'cpr'},
 bvm:{label:'백마스크 환기',busy:'환기',prep:4,contact:true,cont:true,grp:'기도·호흡',st:'head'},
 ett:{label:'기관내삽관',busy:'기관내삽관',prep:20,contact:true,grp:'기도·호흡',st:'head',cart:true,fail:0.3},
 nrb:{label:'비재호흡 마스크 15 L',busy:'산소 적용',prep:4,grp:'기도·호흡',st:'head'},
 pads:{label:'제세동 패드 부착',busy:'패드 부착',prep:7,contact:true,grp:'감시',st:'pads',cart:true},
 spo2:{label:'맥박산소측정기',busy:'SpO₂ 부착',prep:4,grp:'감시',st:'arm'},
 cuff:{label:'혈압 커프',busy:'커프 부착',prep:6,grp:'감시',st:'arm'},
 etco2:{label:'EtCO₂ 센서',busy:'EtCO₂ 연결',prep:5,grp:'감시',st:'head2',cart:true},
 ecg12:{label:'12유도 심전도',busy:'12유도 기록',prep:15,contact:true,grp:'감시',st:'proc',cart:true},
 iv:{label:'정맥로 확보',busy:'정맥로 확보',prep:20,contact:true,grp:'혈관·약물',st:'arm',fail:0.3},
 io:{label:'골내로 확보',busy:'골내로 확보',prep:12,contact:true,grp:'혈관·약물',st:'leg',cart:true},
 drug:{label:'약물 투여…',busy:'약물 투여',prep:5,grp:'혈관·약물',st:'drug',cart:true},
 lab:{label:'채혈·검사 의뢰',busy:'채혈',prep:10,contact:true,grp:'혈관·약물',st:'arm'},
 auscult:{label:'흉부 청진',busy:'청진',prep:6,contact:true,grp:'원인 탐색',st:'proc'},
 pocus:{label:'현장 초음파',busy:'초음파',prep:9,contact:true,grp:'원인 탐색',st:'proc',cart:true},
 needle:{label:'바늘 감압(우측)',busy:'바늘 감압',prep:12,contact:true,grp:'원인 탐색',st:'proc',cart:true},
 pericardio:{label:'심낭천자',busy:'심낭천자',prep:22,contact:true,grp:'원인 탐색',st:'proc',cart:true},
 vagal:{label:'미주신경 자극',busy:'변형 발살바',prep:12,contact:true,grp:'원인 탐색',st:'proc'}
};
const GROUPS=['순환','기도·호흡','감시','혈관·약물','원인 탐색'];

/* ============ 상태 ============ */
let S=null, SEL={mode:'basic'}, curScreen='menu';
function newPatient(C){
 const r=RH[C.rhythm];
 return {rhythm:C.rhythm,hr:C.hr||r.hr||0,hrT:C.hr||r.hr||0,sbp:r.pulse?(C.sbp||118):0,sbpT:r.pulse?(C.sbp||118):0,spo2:C.spo2||(r.pulse?96:70),etco2:r.pulse?38:4,
  breathing:r.pulse?'normal':(r.shock?'agonal':'none'),mental:r.pulse?((C.sbp||118)<75?'통증에만 반응':'음성에 반응'):'무반응',pulse:r.pulse,
  pads:false,probe:false,cuff:false,etco2Sensor:false,airway:'none',bvm:false,o2:'room',fio2:1,ventRate:10,access:'none',
  compressing:false,compRate:0,compDepth:0,compQ:0,pace:{on:false,rate:70,mA:0},paceCapture:false,paceTh:Math.round(rnd(55,85)/5)*5,
  holdUntil:0,vfAmp:0.6,cause:null,causeFixed:true,epiCirc:0,epiUntil:-1,antiarr:false,mg:false,atropine:0,noFlow:0,goodCpr:0,bvmSec:0};
}
function buildCase(key,custom){
 let C=Object.assign({},key==='CUSTOM'?custom:CASES[key]);
 C.key=key;
 if(C.cause==='random')C.cause=pick(Object.keys(CAUSES));
 if(C.cause&&CAUSES[C.cause]){const cz=CAUSES[C.cause];if(!C.who)C.who=cz.who;if(!C.story)C.story=cz.story;}
 const r=RH[C.rhythm];C.arrest=!r.pulse;C.shockable=!!r.shock;C.pulseCase=r.pulse;
 if(!C.def)C.def=defFor(C.rhythm);
 return C;
}
function startCase(key,mode,custom){
 const C=buildCase(key,custom);
 const P=newPatient(C);
 if(C.cause){P.cause=C.cause;P.causeFixed=false;}
 S={mode,key,C,P,t:0,paused:false,ended:false,adv:mode!=='basic',hints:mode!=='test',
  members:CREW0.map(mkMember),sel:'m1',site:'경동맥',log:[],cart:false,codeBlue:{status:'idle'},
  assess:null,consc:null,conscAt:null,assessments:[],firstComp:null,compTime:0,qualTime:0,arrestTime:0,pauses:[],curPause:null,cycleStart:null,
  def:{energy:200,state:'idle',chT:0,chargedAt:0,sync:false,syncWait:null,lastBeep:0},nibp:{busy:false,start:0,last:null,auto:false,lastAuto:-999},
  labs:[],pending:[],infusions:[],drugs:[],shocks:[],readings:[],crit:[],cautions:[],procs:[],trace:[],hidden:[],notes:[],
  stable:0,arrestStart:C.arrest?0:null,flags:{},roscT:null,roscAt:null,changeAt:null,firstPads:null,firstProbe:null,firstBP:null,firstAccess:null,firstDef:null,firstDefKey:null,treatedAt:null,
  bpAfterTx:false,bpAfterRosc:false,roscConfirmed:false,hypoT:0,ventHigh:0,lastTraceT:-1,instr:false,ui:{drug:'epi',tab:'log',drugOpen:false,hint:0},
  pocusDone:false,auscDone:false,ecg12Done:false,ttm:false,overvent:0};
 S.members.forEach(m=>{m.ventRate=S.adv?Math.round(rnd(16,22)):10;});
 S.eng=new Engine(()=>S.P);
 S.eng.onBeat=()=>{if(S.P.probe&&!S.paused)snd.beat(S.P.spo2);};
 if(mode!=='basic')S.members.forEach(m=>{m.rate=Math.round(rnd(102,128));});
 log('케이스 시작: '+C.who+(C.story?' — '+C.story:''),'info');
 showScreen('sim');buildRoom();monSweep=null;ensureMonitor();
 openIntro();
}
function mkMember(d){return {id:d.id,name:d.name,role:d.role,task:null,prog:0,prep:0,paused:false,cprT:0,rate:110,depth:5.4,depth0:5.4,payload:null,ventRate:S&&S.adv?Math.round(rnd(16,22)):10};}
function M(id){return S.members.find(m=>m.id===id);}
function log(text,type){if(!S)return;S.log.push({t:S.t,text,type:type||'act'});}
function crit(text){S.crit.push({t:S.t,text});log('중대 오류: '+text,'crit');}
function caution(text){S.cautions.push({t:S.t,text});log('주의: '+text,'warn');}

/* ============ 리더 행동 ============ */
function leaderConsc(){
 if(S.flags.conscBusy)return;S.flags.conscBusy=true;log('리더: 환자 어깨를 두드리며 큰 소리로 부릅니다.','comm');
 setTimeoutSim(2,()=>{S.flags.conscBusy=false;const m=S.P.mental;if(S.conscAt==null)S.conscAt=S.t;S.conscLast=S.t;log('의식 확인: '+m+(m==='무반응'?' — 반응이 없습니다.':''),'act');});
}
function codeBlue(){
 if(S.codeBlue.status!=='idle')return;S.codeBlue={status:'coming',req:S.t,arr:S.t+10};log('코드블루 요청: 소생팀과 제세동기·응급카트를 호출했습니다. 약 10초 후 도착합니다.','act');snd.click();
}
function compNow(){return S.members.some(m=>m.task==='cpr'&&!m.paused&&m.prog>=m.prep);}
function startAssess(){
 if(S.assess)return;
 if(compNow()){toast('가슴압박 중에는 호흡과 맥박을 정확히 사정할 수 없습니다. "모두 떨어지세요"로 잠시 멈추세요.');return;}
 S.assess={s:S.t,site:S.site};log('리더: 호흡·맥박 동시 사정 시작 ('+S.site+')','comm');
}
function endAssess(auto){
 const a=S.assess;if(!a)return;S.assess=null;const d=S.t-a.s,P=S.P;
 const br=P.breathing==='normal'?'정상 호흡':P.breathing==='agonal'?'비정상 호흡(헐떡임)':'호흡 없음';
 let res;
 if(d<3){res='사정 시간이 너무 짧아 판단할 수 없습니다';}
 else res=(P.pulse?'맥박 촉지됨':'맥박 없음')+' · '+br;
 const rec={s:a.s,d,pulse:P.pulse,breathing:P.breathing,valid:d>=3,afterRosc:S.roscT!=null&&a.s>S.roscT};
 S.assessments.push(rec);
 log('호흡·맥박 사정 ('+a.site+', '+d.toFixed(1)+'초): '+res+(auto?' — 15초 초과로 자동 종료':''),d>10?'warn':'act');
 if(d>10)caution('호흡·맥박 사정이 10초를 넘었습니다.');
 
}
function clearAll(){
 let n=0;S.members.forEach(m=>{if(m.task&&TASKS[m.task].contact&&!m.paused){m.paused=true;n++;}});
 S.clearT=S.t;log('리더: "모두 떨어지세요!"'+(n?' — '+n+'명이 손을 뗐습니다.':''),'comm');snd.click();
}
function resumeAll(){
 let n=0;S.members.forEach(m=>{if(m.paused){m.paused=false;n++;}});
 if(n)log('리더: "처치 재개하세요." — '+n+'명이 하던 업무를 이어갑니다.','comm');
}
function setTimeoutSim(sec,fn){(S.timers=S.timers||[]).push({at:S.t+sec,fn});}

/* ============ 업무 배정 ============ */
function taskBlock(key,m){
 const T=TASKS[key],P=S.P;
 if(T.cart&&!S.cart)return'응급카트가 아직 없습니다. 코드블루를 요청하세요.';
 switch(key){
  case 'pads':if(P.pads)return'이미 부착됨';break;
  case 'spo2':if(P.probe)return'이미 부착됨';break;
  case 'cuff':if(P.cuff)return'이미 부착됨';break;
  case 'etco2':if(P.etco2Sensor)return'이미 연결됨';if(P.airway==='none'&&!P.bvm&&!S.members.some(x=>x.task==='bvm')&&P.breathing!=='normal')return'백마스크 또는 기관내관에 연결합니다';break;
  case 'ett':if(P.airway==='ett')return'이미 삽관됨';break;
  case 'iv':if(P.access!=='none')return'혈관로 있음';break;
  case 'io':if(P.access!=='none')return'혈관로 있음';break;
  case 'drug':if(P.access==='none')return'정맥로나 골내로가 필요합니다';break;
  case 'ecg12':if(!P.pulse)return'맥박이 있는 환자에게 시행합니다';break;
  case 'vagal':if(!P.pulse||P.mental==='무반응')return'의식이 있고 맥박이 있는 환자에게 시행합니다';break;
  case 'nrb':if(P.airway==='ett')return'기관내관으로 환기 중';break;
 }
 if(m.task===key&&TASKS[key].cont)return'진행 중';
 return null;
}
function assign(m,key,payload){
 const T=TASKS[key];const blk=taskBlock(key,m);if(blk){toast(blk);return;}
 if(m.task)stopTask(m,true);
 if(key==='cpr'){const other=S.members.find(x=>x.task==='cpr'&&x!==m);if(other){m.handoff=other.id;}}
 if(key==='bvm'){const other=S.members.find(x=>x.task==='bvm'&&x!==m);if(other)stopTask(other);}
 if(key==='ett'){S.members.filter(x=>x.task==='bvm'&&x!==m).forEach(x=>x.ettWait=true);}
 m.task=key;m.prog=0;m.prep=T.prep;m.paused=false;m.payload=payload||null;if(key==='cpr'){m.cprT=0;if(S.adv){m.depth0=rnd(5.0,5.8);m.depth=m.depth0;}}
 const what=key==='drug'?FORM[payload].dname+' '+FORM[payload].label:T.label.replace('…','');
 log('리더 → '+m.name+': '+what,'comm');log(m.name+': "'+what+', 하겠습니다."','comm');snd.click();
}
function stopTask(m,silent){
 if(!m.task)return;const T=TASKS[m.task];
 if(!silent)log('리더 → '+m.name+': '+T.busy+' 중지','comm');
 m.task=null;m.prog=0;m.paused=false;m.payload=null;m.handoff=null;
}
function finishTask(m){
 const k=m.task,P=S.P,T=TASKS[k];
 const fail=S.adv&&T.fail&&(S.flags.forceFail||Math.random()<T.fail);
 if(fail&&S.flags.forceFail)S.flags.forceFail=false;
 switch(k){
  case 'cpr':{const wasHand=!!m.handoff;if(m.handoff){const o=M(m.handoff);if(o&&o.task==='cpr'){o.task=null;log(o.name+' → '+m.name+': 가슴압박 교대','comm');}m.handoff=null;}
   log(m.name+': 가슴압박 시작합니다.','act');if(P.pulse&&!S.flags.cprPulse&&!(wasHand&&S.roscT!=null&&!S.roscConfirmed)){S.flags.cprPulse=true;caution('맥박이 있는 환자에게 가슴압박을 시작했습니다.');}return;}
  case 'bvm':P.o2='bvm';log(m.name+': 백마스크 환기 시작'+(P.airway==='ett'?' (기관내관 연결)':' (30:2)'),'act');return;
  case 'ett':
   if(fail){log(m.name+': 삽관 실패 — 성대가 보이지 않습니다. 다른 팀원이 백마스크 환기를 이어갑니다.','warn');S.procs.push({t:S.t,k:'ett',ok:false});S.members.forEach(x=>x.ettWait=false);m.task=null;m.prog=0;return;}
   P.airway='ett';S.procs.push({t:S.t,k:'ett',ok:true});S.members.filter(x=>x.ettWait).forEach(x=>{x.ettWait=false;if(x.task==='bvm'&&x!==m){x.task=null;}});
   log(m.name+': 기관내삽관 완료. 양측 호흡음 확인, 이제 6초마다 1회 환기합니다.','dev');m.task='bvm';m.prog=m.prep=0;m.cprT=0;
   if(P.cause==='hypoxia'&&!P.causeFixed){} return;
  case 'nrb':S.flags.nrb=true;if(P.o2==='room')P.o2='nrb';log(m.name+': 비재호흡 마스크 15 L 적용'+(P.breathing!=='normal'?' — 자발호흡이 없어 효과가 없습니다.':''),P.breathing!=='normal'?'warn':'act');break;
  case 'pads':P.pads=true;if(S.firstPads==null)S.firstPads=S.t;log(m.name+': 제세동 패드 부착 완료. 모니터에 리듬이 표시됩니다.','dev');break;
  case 'spo2':P.probe=true;if(S.firstProbe==null)S.firstProbe=S.t;log(m.name+': 맥박산소측정기 부착','dev');break;
  case 'cuff':P.cuff=true;log(m.name+': 혈압 커프 부착','dev');break;
  case 'etco2':P.etco2Sensor=true;log(m.name+': EtCO₂ 센서 연결','dev');break;
  case 'iv':if(fail){log(m.name+': 정맥로 실패 — 혈관이 터졌습니다. 다시 시도하거나 골내로를 고려하세요.','warn');break;}
   P.access='iv';if(S.firstAccess==null)S.firstAccess=S.t;log(m.name+': 18G 정맥로 확보','dev');break;
  case 'io':P.access='io';if(S.firstAccess==null)S.firstAccess=S.t;log(m.name+': 경골 골내로 확보','dev');break;
  case 'drug':giveDrug(m.payload,m);break;
  case 'lab':S.labs.push({req:S.t,ready:S.t+60,vals:labVals()});log(m.name+': 채혈 완료. 결과는 약 1분 뒤 나옵니다.','act');break;
  case 'ecg12':S.ecg12Done=true;log(m.name+': 12유도 심전도 — '+ecg12Text(),'dev');break;
  case 'auscult':{S.auscDone=true;let r;if(P.cause==='tension'&&!P.causeFixed)r=CAUSES.tension.ausc;else if(P.bvm||P.airway==='ett'||P.breathing==='normal')r='양측 호흡음이 들립니다.';else r='환기가 없어 호흡음이 들리지 않습니다.';log(m.name+': 청진 — '+r,'act');break;}
  case 'pocus':{S.pocusDone=true;let r;if(compNow()){r='가슴압박 중이라 영상을 얻지 못했습니다. 리듬 확인 시 10초 안에 보세요.';}
   else if(P.cause&&!P.causeFixed)r=CAUSES[P.cause].pocus;else if(!P.pulse)r=(P.rhythm==='ASY'?'심장 운동이 없습니다.':'미약하고 비효과적인 심장 운동이 보입니다.');else r=S.roscT!=null?'좌심실 수축이 감소해 있습니다.':'심낭삼출은 없고 심실 수축은 보존되어 있습니다.';
   S.procs.push({t:S.t,k:'pocus'});log(m.name+': 현장 초음파 — '+r,'act');break;}
  case 'needle':S.procs.push({t:S.t,k:'needle'});if(P.cause==='tension'&&!P.causeFixed){P.causeFixed=true;S.flags.causeFixT=S.t;log(m.name+': 바늘 감압(2번째 늑간 쇄골중앙선, 또는 성인은 4–5번째 늑간 중액와선 앞쪽) — 공기가 빠져나옵니다.','dev');}else{log(m.name+': 바늘 감압 시행 — 공기 배출 없음.','warn');caution('근거 없이 바늘 감압을 시행했습니다.');}break;
  case 'pericardio':S.procs.push({t:S.t,k:'pericardio'});if(P.cause==='tamponade'&&!P.causeFixed){P.causeFixed=true;S.flags.causeFixT=S.t;log(m.name+': 심낭천자 — 혈성 삼출액 120 mL 배액','dev');}else{log(m.name+': 심낭천자 — 삼출액이 나오지 않습니다.','warn');caution('근거 없이 심낭천자를 시행했습니다.');}break;
  case 'vagal':markDef('vagal');if(P.rhythm==='SVT'&&Math.random()<0.3){convert('NSR',92,C().sbp>100?C().sbp:112,'미주신경 자극으로 동율동 전환');}else log(m.name+': 변형 발살바 시행 — 리듬 변화 없음','act');break;
 }
 if(!T.cont){log(m.name+': '+T.busy+' 완료했습니다.','comm');m.task=null;m.prog=0;m.payload=null;}
}
function C(){return S.C;}
function ecg12Text(){const P=S.P;if(P.rhythm==='AF')return'심방세동, 빠른 심실반응, 급성 ST 변화 없음';if(P.rhythm==='SVT')return'좁은 QRS 규칙적 빈맥, P파 보이지 않음';if(P.rhythm==='VTP')return'넓은 QRS 단형 빈맥, 방실해리 의심';if(P.rhythm==='AVB3')return'완전 방실차단, 넓은 이탈 리듬';if(S.roscT!=null)return S.flags.stemi?'II·III·aVF ST 분절 상승 — 응급 관상동맥 중재 의뢰 고려':'광범위 ST 분절 하강, 급성 ST 상승은 없음';return'동율동, 급성 변화 없음';}
function labVals(){
 const P=S.P;const v={pH:7.39,pCO2:40,pO2:90,HCO3:24,K:4.2,Na:139,Glu:128,Hb:13.1,Mg:2.0,lac:1.4};
 if(!P.pulse)Object.assign(v,{pH:7.13,pCO2:57,pO2:58,HCO3:17,lac:7.4});
 else if(S.roscT!=null)Object.assign(v,{pH:7.25,pCO2:Math.round(40*Math.pow(10/P.ventRate,0.6)),pO2:Math.round(70+300*(P.fio2-0.21)),HCO3:19,lac:5.1});
 if(S.C.labs)Object.assign(v,S.C.labs);
 if(P.cause&&!P.causeFixed)Object.assign(v,CAUSES[P.cause].labs);
 if(P.cause==='hyperkalemia'&&P.causeFixed)v.K=6.4;
 return v;
}

/* ============ 약물 ============ */
function lastGiven(fid){for(let i=S.drugs.length-1;i>=0;i--)if(S.drugs[i].form===fid)return S.drugs[i].t;return null;}
function judge(fid){
 const P=S.P,arrest=!P.pulse,rh=P.rhythm,shk=!!RH[rh].shock,ns=S.shocks.filter(s=>s.arrest).length,post=S.roscT!=null&&P.pulse;
 const R=(lvl,msg)=>({lvl,msg:msg||''});
 switch(fid){
  case 'epi1':{if(!arrest)return R('wrong','맥박이 있는 환자에게 1 mg 급속주입은 위험합니다. 서맥·저혈압에는 지속주입을 씁니다.');const l=lastGiven('epi1');if(l!=null&&S.t-l<170)return R('caution','에피네프린 반복 간격이 3분보다 짧습니다.');if(shk&&ns<1)return R('caution','충격 리듬에서는 제세동을 먼저 시행합니다.');return R('ok');}
  case 'epiD':case 'dopaD':if(arrest)return R('wrong','심정지 중 지속주입은 적응증이 아닙니다.');if(['SB','AVB3'].includes(rh)||P.sbp<90)return R('ok');return R('caution','서맥이나 저혈압이 없는 환자입니다.');
  case 'neD':if(arrest)return R('wrong','심정지 중에는 쓰지 않습니다.');if(P.sbp<90)return R('ok');return R('caution','혈압이 유지되는 환자입니다.');
  case 'amio300':if(!arrest)return R('wrong','맥박이 있는 VT는 150 mg 10분 주입을 씁니다.');if(!shk)return R('wrong','비충격 리듬에는 항부정맥제를 쓰지 않습니다.');if(lastGiven('amio300')!=null)return R('caution','300 mg은 이미 투여했습니다. 추가 용량은 150 mg입니다.');if(ns<3)return R('caution','보통 세 번째 제세동 이후에 투여합니다.');return R('ok');
  case 'amio150':if(!arrest)return R('wrong','맥박이 있는 빈맥에는 10분 주입을 씁니다.');if(!shk)return R('wrong','비충격 리듬에는 항부정맥제를 쓰지 않습니다.');if(lastGiven('amio300')==null)return R('caution','첫 용량은 300 mg입니다.');return R('ok');
  case 'amio150i':if(arrest)return R('wrong','심정지에는 급속주입 용량을 씁니다.');if(rh==='VTP')return R('ok');if(['AF','AFL','SVT'].includes(rh))return R('caution','이 리듬의 1차 약물이 아닙니다.');return R('wrong','적응증이 없는 리듬입니다.');
  case 'lido1':case 'lido2':if(arrest&&shk)return ns<3?R('caution','보통 세 번째 제세동 이후에 투여합니다.'):R('ok');if(rh==='VTP')return R('caution','맥박 있는 VT에서는 2차 선택입니다.');return R('wrong','적응증이 없는 리듬입니다.');
  case 'atro1':if(arrest)return R('wrong','무수축·PEA에 아트로핀은 권장되지 않습니다.');if(P.atropine>=3)return R('wrong','총 3 mg을 넘었습니다.');if(['SB','AVB3'].includes(rh)&&!P.paceCapture){const l=lastGiven('atro1');if(l!=null&&S.t-l<150)return R('caution','반복 간격이 3분보다 짧습니다.');return R('ok');}return R('wrong','서맥이 아닌 환자입니다.');
  case 'aden6':case 'aden12':if(arrest)return R('wrong','심정지에는 쓰지 않습니다.');if(rh==='SVT')return(fid==='aden12'&&lastGiven('aden6')==null)?R('caution','첫 용량은 6 mg입니다.'):R('ok');if(rh==='AF')return R('wrong','불규칙한 빈맥에는 쓰지 않습니다.');if(rh==='AFL'||rh==='VTP')return R('caution','전환 효과는 기대하기 어렵고 진단 목적으로만 고려합니다.');return R('wrong','적응증이 없는 리듬입니다.');
  case 'dilt15':case 'meto5':if(arrest)return R('wrong','심정지에는 쓰지 않습니다.');if(P.sbp<90)return R('wrong','저혈압 환자에게 심박수 조절제는 위험합니다.');if(['AF','AFL','SVT'].includes(rh))return R('ok');if(rh==='VTP')return R('wrong','넓은 QRS 빈맥에는 쓰지 않습니다.');return R('wrong','적응증이 없는 리듬입니다.');
  case 'mg2':if(rh==='TDP')return R('ok');if(shk)return R('caution','QT가 정상인 VF·pVT에는 일상 투여가 권장되지 않습니다.');return R('caution','적응증이 뚜렷하지 않습니다.');
  case 'ns500':case 'ns1000':return R('ok');
  case 'mdz2':if(arrest)return R('wrong','심정지 중에는 진정제가 필요하지 않습니다.');if(P.mental==='무반응')return R('caution','이미 반응이 없는 환자입니다.');if(P.sbp<90)return R('caution','저혈압 환자입니다. 용량을 줄이고 혈압을 감시하세요.');return R('ok');
  case 'ca1':if(P.cause==='hyperkalemia')return R('ok');return R('caution','일상적 칼슘 투여는 권장되지 않습니다.');
  case 'bic50':if(P.cause==='hyperkalemia')return R('ok');return R('caution','일상적 투여는 권장되지 않습니다.');
 }
 return R('ok');
}
function giveDrug(fid,m){
 const F=FORM[fid],P=S.P,j=judge(fid);
 S.drugs.push({t:S.t,form:fid,name:F.dname+' '+F.label,lvl:j.lvl,msg:j.msg,rh:P.rhythm});
 log((m?m.name+': ':'')+F.dname+' '+F.label+' 투여'+(P.access==='io'?' (골내)':''),'drug');
 if(j.lvl==='wrong'){S.wrongN=(S.wrongN||0)+1;caution('부적절한 약물 — '+j.msg);}else if(j.lvl==='caution')caution(j.msg);
 if((fid==='epi1'&&P.pulse)||((fid==='aden6'||fid==='aden12')&&(P.rhythm==='AF'||P.rhythm==='TDP')))crit(F.dname+': '+j.msg);
 if(fid==='atro1')P.atropine++;
 if(F.kind==='push')S.pending.push({fid,c:0,need:fid.startsWith('aden')?3:10,pulse:P.pulse});
 else if(F.kind==='timed')S.infusions.push({fid,kind:'timed',el:0,dur:F.dur,name:F.dname+' '+F.label});
 else{S.infusions=S.infusions.filter(x=>x.fid!==fid);S.infusions.push({fid,kind:'drip',el:0,name:F.dname+' '+F.label});}
 if(C().def.includes(fid)&&j.lvl!=='wrong')markDef(fid);
}
function markDef(k){if(!S.C.def.includes(k))return;if(S.firstDef==null){S.firstDef=S.t;S.firstDefKey=k;}S.treated=true;if(S.treatedAt==null)S.treatedAt=S.t;}
function drugEffect(fid,givenPulse){
 const P=S.P,rh=P.rhythm;
 switch(fid){
  case 'epi1':if(!P.pulse){P.epiCirc++;P.epiUntil=S.t+240;}else if(givenPulse){P.hrT+=35;P.sbpT+=45;if(Math.random()<0.35)setRhythm('VTP',172);}break;
  case 'amio300':case 'amio150':case 'lido1':case 'lido2':if(!P.pulse)P.antiarr=true;break;
  case 'atro1':if(rh==='SB'&&!P.paceCapture){if(Math.random()<0.8){P.hrT=Math.min(78,Math.max(P.hrT,P.hr)+20);P.sbpT=Math.max(P.sbpT,62+P.hrT*0.55);log('아트로핀 후 심박수가 오르고 있습니다.','info');}}else if(rh==='AVB3'&&Math.random()<0.15){P.hrT=Math.min(48,P.hrT+8);}break;
  case 'aden6':case 'aden12':{const ok=rh==='SVT'&&Math.random()<(fid==='aden6'?0.55:0.85);P.holdUntil=S.t+(rh==='SVT'||rh==='AF'||rh==='AFL'||rh==='NSR'||rh==='ST'?3.2:0);
   if(ok)setTimeoutSim(3.2,()=>{convert('NSR',92,Math.max(112,S.P.sbp),'아데노신 투여 후 동율동 전환');});
   else if(rh==='AF'&&Math.random()<0.25)setTimeoutSim(3,()=>setRhythm('VF'));break;}
  case 'dilt15':case 'meto5':if(rh==='AF'||rh==='AFL'){S.flags.rateCtl=true;P.sbpT-=8;}else if(rh==='SVT'&&Math.random()<0.55)convert('NSR',90,Math.max(110,P.sbp),'심박수 조절제 투여 후 동율동 전환');if(P.sbp<90)P.sbpT-=25;break;
  case 'mg2':P.mg=true;break;
  case 'mdz2':S.sedT=S.t;if(P.mental==='명료')P.mental='기면';log('진정 효과: 환자가 졸려 하며 반응이 느려집니다.','info');if(P.sbp>95)P.sbpT-=6;break;
  case 'ca1':if(P.cause==='hyperkalemia'&&!P.causeFixed){P.causeFixed=true;S.flags.causeFixT=S.t;log('칼슘 투여 후 심전도 QRS가 좁아집니다.','info');}break;
 }
}
function infusionDone(f){
 const P=S.P;log(f.name+' 주입 완료','drug');
 if(f.fid.startsWith('ns')){if(P.cause==='hypovolemia'&&!P.causeFixed){P.causeFixed=true;S.flags.causeFixT=S.t;}if(P.pulse)P.sbpT+=f.fid==='ns1000'?16:10;}
}
function stopInfusion(fid){const f=S.infusions.find(x=>x.fid===fid);if(!f)return;S.infusions=S.infusions.filter(x=>x!==f);log('리더: '+f.name+' 중지','comm');}

/* ============ 리듬 전환 ============ */
function setRhythm(key,hr){
 const P=S.P,was=P.pulse;P.rhythm=key;P.hr=hr||RH[key].hr||0;P.hrT=P.hr;P.pulse=RH[key].pulse;
 S.hidden.push({t:S.t,text:'리듬 변화 → '+RH[key].name});
 if(was&&!P.pulse){S.arrestStart=S.t;P.sbp=0;P.sbpT=0;P.noFlow=0;P.goodCpr=0;P.epiCirc=0;P.antiarr=false;S.flags.asyRoll=false;S.flags.tdpRoll=false;S.roscAt=null;S.roscConfirmed=false;S.stable=0;S.hidden.push({t:S.t,text:'심정지 발생'});S.flags.rearrest=(S.flags.rearrest||0)+(S.roscT!=null?1:0);if(P.paceCapture)P.paceCapture=false;}
 if(!was&&P.pulse){P.sbp=Math.max(P.sbp,70);}
}
function convert(key,hr,sbp,msg){setRhythm(key,hr);S.P.sbpT=sbp;S.treated=true;if(S.treatedAt==null)S.treatedAt=S.t;S.flags.converted=S.t;S.hidden.push({t:S.t,text:msg});}
function doRosc(){
 const P=S.P;setRhythm('ST',Math.round(rnd(98,112)));P.sbp=Math.round(rnd(72,82));P.sbpT=Math.round(rnd(74,84));P.etco2=Math.max(P.etco2,36)+6;P.spo2=86;P.breathing='none';
 S.roscT=S.t;S.flags.everRosc=true;S.flags.stemi=S.C.rhythm==='VF'||S.C.rhythm==='PVT';S.hypoT=0;S.hidden.push({t:S.t,text:'자발순환 회복(ROSC)'});
}

/* ============ 제세동 ============ */
function charge(){const d=S.def;if(!S.P.pads){toast('패드를 먼저 부착하세요.');return;}if(d.state!=='idle')return;d.state='charging';d.chT=S.t+5;log('제세동기 충전 시작 ('+d.energy+' J'+(d.sync?', SYNC':'')+')','dev');snd.charge();}
function disarm(){if(S.def.state==='idle')return;S.def.state='idle';S.def.syncWait=null;log('충전 해제','dev');}
function pressShock(){
 const d=S.def;if(d.state!=='charged')return;
 if(d.sync){d.syncWait=S.t;d.state='syncing';log('SYNC 충격 버튼 누름 — QRS 동기화 대기','dev');return;}
 deliverShock(false);
}
function deliverShock(sync){
 const d=S.def,P=S.P,rh=P.rhythm,r=RH[rh];d.state='idle';d.syncWait=null;
 const contact=S.members.filter(m=>m.task&&TASKS[m.task].contact&&!m.paused&&m.prog>0);
 const rec={t:S.t,e:d.energy,sync,rh,arrest:!P.pulse,contact:contact.map(m=>m.name),ok:false,appropriate:false,resume:null};
 snd.shock();log('충격 전달: '+d.energy+' J'+(sync?' (동기화)':''),'shock');
 if(contact.length){contact.forEach(m=>crit(m.name+'이(가) 환자와 접촉한 상태에서 충격이 전달되었습니다.'));}
 const pacedNote=P.pace.on;
 if(!P.pulse){
  if(r.shock&&!sync){
   rec.appropriate=true;const n=S.shocks.filter(s=>s.arrest&&s.appropriate).length+1;
   let p=[0.2,0.32,0.42,0.5][Math.min(3,n-1)]+(S.t<P.epiUntil?0.18:0)+(P.antiarr?0.25:0)+(rh==='TDP'&&P.mg?0.35:0)+(S.flags.lastCycleQ||0.5)*0.12;
   if(d.energy<120){p*=0.6;caution('심정지 제세동 에너지가 낮습니다 (이상파형 120–200 J 권장).');}
   if(rh==='TDP'&&!P.mg)p=Math.min(p,0.3);
   if(S.mode==='basic'&&n>=4&&P.epiCirc>=1&&P.antiarr)p=1;
   if(Math.random()<clamp(p,0,0.92)){rec.ok=true;S.roscAt=S.t+rnd(6,20);setRhythm('PEA',62);S.flags.organizedAfterShock=true;S.hidden.push({t:S.t,text:'제세동 후 조직화된 리듬'});}
   else if(n>=2&&Math.random()<0.12){setRhythm(Math.random()<0.5?'ASY':'PVT');}
  } else if(r.shock&&sync){caution('무맥성 리듬은 비동기 제세동으로 치료합니다.');rec.appropriate=false;}
  else{caution('비충격 리듬('+r.name+')에는 제세동이 효과가 없습니다.');}
 } else {
  const tach=['SVT','AF','AFL','VTP'].includes(rh);
  if(sync&&tach){rec.appropriate=true;const ok={SVT:d.energy>=100?0.9:d.energy>=50?0.75:0.55,AFL:d.energy>=200?0.9:d.energy>=100?0.8:0.6,AF:d.energy>=200?0.85:d.energy>=120?0.65:0.4,VTP:d.energy>=100?0.88:0.6}[rh];const rec2={SVT:100,AFL:200,AF:200,VTP:100}[rh];if(d.energy<rec2)caution('동기화 심율동전환 에너지가 권장보다 낮습니다 ('+RH[rh].name+' '+rec2+' J 권장).');
   if(P.mental!=='무반응'&&!(S.sedT!=null&&S.t-S.sedT<900)){S.flags.noSedShock=true;caution('의식 있는 환자에게 진정 없이 동기화 심율동전환을 시행했습니다.');}
      if(Math.random()<ok){rec.ok=true;convert('NSR',88,Math.max(112,P.sbp+20),'동기화 심율동전환 성공');markDef('sync');}else log('리듬 변화 없음 — 에너지를 올려 다시 시도할 수 있습니다.','warn');}
  else if(!sync&&tach){crit('맥박이 있는 빈맥에 동기화 없이 충격을 주었습니다.');if(Math.random()<0.35)setRhythm('VF');else if(Math.random()<0.6){convert('NSR',90,110,'비동기 충격 후 전환');}}
  else{crit('관류 리듬('+r.name+')에 충격을 주었습니다.');if(Math.random()<0.4)setRhythm('VF');}
 }
 if(pacedNote&&!P.pulse)caution('심박조율 중에는 충격 전에 조율을 확인하세요.');
 S.shocks.push(rec);
}
function togglePace(){
 const p=S.P.pace;if(!S.P.pads){toast('패드를 먼저 부착하세요.');return;}p.on=!p.on;
 if(p.on){log('경피 심박조율 시작: '+p.rate+' ppm, '+p.mA+' mA','dev');if(!S.P.pulse&&!S.flags.pacearrest){S.flags.pacearrest=true;caution('심정지에는 심박조율이 권장되지 않습니다.');S.shocks.push({t:S.t,e:0,pace:true,arrest:true,appropriate:false});}}
 else{log('경피 심박조율 중지','dev');S.P.paceCapture=false;}
}
function paceAdj(k,dv){const p=S.P.pace;if(k==='rate')p.rate=clamp(p.rate+dv,40,130);else p.mA=clamp(p.mA+dv,0,200);if(p.on)log('조율 설정: '+p.rate+' ppm, '+p.mA+' mA','dev');}

/* ============ 혈압·검사 ============ */
function nibpMeasure(auto){const n=S.nibp;if(!S.P.cuff){if(!auto)toast('혈압 커프를 먼저 감으세요.');return;}if(n.busy)return;n.busy=true;n.start=S.t;if(!auto)log('NIBP 측정 시작','dev');}
function nibpTick(){const n=S.nibp,P=S.P;
 if(n.busy&&S.t-n.start>=16){n.busy=false;let res;
  if(!P.pulse||P.sbp<40)res={txt:'측정 불가',ok:false};else if(P.compressing)res={txt:'측정 오류 (움직임)',ok:false};
  else{const s=Math.round(P.sbp+rnd(-3,3));res={sys:s,dia:Math.round(s*0.62),ok:true,txt:s+'/'+Math.round(s*0.62)};}
  res.t=S.t;n.last=res;log('NIBP: '+res.txt+(res.ok?' mmHg (평균 '+Math.round((res.sys+2*res.dia)/3)+')':''),'dev');
  if(res.ok){if(S.firstBP==null)S.firstBP=S.t;if(S.treatedAt!=null&&n.start>S.treatedAt)S.bpAfterTx=true;if(S.roscT!=null&&n.start>S.roscT)S.bpAfterRosc=true;}}
 if(n.auto&&!n.busy&&P.cuff&&S.t-n.lastAuto>=180){n.lastAuto=S.t;nibpMeasure(true);}
}

/* ============ 매 0.1초 ============ */
function tick(dt){
 const P=S.P;S.t+=dt;const t=S.t;
 if(S.timers){const due=S.timers.filter(x=>x.at<=t);S.timers=S.timers.filter(x=>x.at>t);due.forEach(x=>x.fn());}
 if(S.ended)return;
 // 코드블루
 if(S.codeBlue.status==='coming'&&t>=S.codeBlue.arr){S.codeBlue.status='arrived';S.cart=true;CREW_CB.forEach(d=>{const m=mkMember(d);if(S.adv)m.rate=Math.round(rnd(102,128));S.members.push(m);});log('코드블루 팀 도착: 민서(전공의), 지우(간호사) — 제세동기와 응급카트를 가져왔습니다.','dev');buildRoom();}
 // 제세동기
 const d=S.def;
 if(d.state==='charging'&&t>=d.chT){d.state='charged';d.chargedAt=t;log('충전 완료 ('+d.energy+' J)','dev');}
 if(d.state==='charged'){if(t-d.lastBeep>=1){d.lastBeep=t;snd.ready();}if(t-d.chargedAt>45){d.state='idle';log('충전 후 45초가 지나 에너지가 자동으로 해제되었습니다.','warn');}}
 if(d.state==='syncing'){const r=RH[P.rhythm];if(r.beat&&!(P.holdUntil>t)){if(t-d.syncWait>=0.4)deliverShock(true);}else if(t-d.syncWait>6){d.state='charged';d.chargedAt=t;d.syncWait=null;log('동기화할 QRS를 찾지 못해 충격이 취소되었습니다. 무맥성 리듬이면 SYNC를 끄세요.','warn');S.flags.syncFail=true;}}
 // 팀원
 for(const m of S.members){if(!m.task||m.paused)continue;if(m.prog<m.prep){if(typeof ettNeedsHold==='function'&&ettNeedsHold(m))continue;m.prog+=dt;if(m.prog>=m.prep){m.prog=m.prep;finishTask(m);}}
  else if(m.task==='cpr'){m.cprT+=dt;if(m.cprT>(m.maxStint||0))m.maxStint=m.cprT;}}
 const comp=S.members.find(m=>m.task==='cpr'&&!m.paused&&m.prog>=m.prep);
 const wasComp=P.compressing;P.compressing=!!comp;
 if(comp){P.compRate=comp.rate;P.compDepth=comp.depth;const rd=comp.rate<100?100-comp.rate:comp.rate>120?comp.rate-120:0;const dd=comp.depth<5?5-comp.depth:comp.depth>6?comp.depth-6:0;P.compQ=clamp(1-rd/25-dd/1.2,0,1);}else P.compQ=0;
 const vent=S.members.find(m=>m.task==='bvm'&&!m.paused&&m.prog>=m.prep);P.bvm=!!vent;P.ventRate=vent?vent.ventRate:10;
 if(P.bvm)P.o2='bvm';else if(P.o2==='bvm')P.o2=S.flags.nrb?'nrb':'room';
 if(S.assess&&P.compressing){S.assess=null;log('가슴압박 재개로 호흡·맥박 사정이 중단되었습니다.','warn');}
 if(S.assess&&t-S.assess.s>15)endAssess(true);
 // 지표
 const arrest=!P.pulse;
 if(arrest){S.arrestTime+=dt;if(P.bvm){S.ventArrest=(S.ventArrest||0)+dt;if(S.firstBvm==null)S.firstBvm=t;}if(P.compressing){S.compTime+=dt;S.qualTime+=dt*P.compQ;if(P.compQ>=0.6)P.goodCpr+=dt;}else P.noFlow+=dt;
  if(P.airway==='ett'&&P.bvm&&P.ventRate>12)S.overvent+=dt;}
 if(arrest&&S.firstComp!=null&&!P.compressing){if(!S.curPause)S.curPause={s:t-dt,len:0,rh:P.rhythm};S.curPause.len+=dt;}
 if(P.compressing&&!wasComp){
  if(S.firstComp==null){S.firstComp=t;S.cycleStart=t;S.cycleQ={sum:0,n:0};}
  else if(S.curPause){S.pauses.push(S.curPause);if(S.curPause.len>=3){closeCycle(S.curPause);S.cycleStart=t;}S.curPause=null;}
  const ls=S.shocks.length?S.shocks[S.shocks.length-1]:null;if(ls&&ls.resume==null&&ls.arrest)ls.resume=t-ls.t;
 }
 if(P.compressing&&S.cycleQ){S.cycleQ.sum+=P.compQ;S.cycleQ.n++;}
 if(!arrest&&S.curPause){S.pauses.push(S.curPause);S.curPause=null;}
 // 약물 순환
 for(const gq of S.pending){if(P.pulse||P.compressing)gq.c+=dt;if(gq.c>=gq.need){gq.done=true;drugEffect(gq.fid,gq.pulse);}}
 S.pending=S.pending.filter(x=>!x.done);
 for(const f of S.infusions){f.el+=dt;if(f.kind==='timed'&&f.el>=f.dur){f.done=true;infusionDone(f);}}
 S.infusions=S.infusions.filter(f=>!f.done);
 physiology(dt);
 nibpTick();
 // 안정
 const st=stableNow();
 S.stable=st?S.stable+dt:0;
 if(conditions().every(c=>c.ok))endCase('success');
 if(t-S.lastTraceT>=1){S.lastTraceT=t;S.trace.push({t:Math.round(t),hr:P.pulse||P.pads?Math.round(P.paceCapture?P.pace.rate:(RH[P.rhythm].cont?0:P.hr)):null,sbp:P.pulse?Math.round(P.sbp):0,c:P.compressing?1:0,rh:P.rhythm,co2:Math.round(P.etco2),sp:Math.round(P.spo2),pulse:P.pulse});}
}
function closeCycle(pause){(S.cycles=S.cycles||[]).push({s:S.cycleStart,e:pause.s,pause:pause.len,rh:pause.rh,q:S.cycleQ&&S.cycleQ.n?S.cycleQ.sum/S.cycleQ.n:0});S.flags.lastCycleQ=S.cycleQ&&S.cycleQ.n?S.cycleQ.sum/S.cycleQ.n:0.5;S.cycleQ={sum:0,n:0};}
function physiology(dt){
 const P=S.P,t=S.t;
 if(!P.pulse){
  P.sbp=0;P.mental='무반응';P.breathing=(RH[P.rhythm].shock&&t-(S.arrestStart||0)<50&&S.roscT==null)?'agonal':'none';
  P.vfAmp=clamp(0.62-P.noFlow*0.0016,0.12,0.62);
  const vent=P.bvm||P.airway==='ett';
  const tgt=P.compressing?(vent?9+15*P.compQ:6+8*P.compQ):3;P.etco2+=(tgt-P.etco2)*Math.min(1,dt*0.6);
  P.spo2=Math.max(55,P.spo2-0.25*dt);
  if(P.bvm)P.bvmSec+=dt;
  if(P.cause==='hypoxia'&&!P.causeFixed&&(P.airway==='ett'&&P.bvm||P.bvmSec>=90)){P.causeFixed=true;S.flags.causeFixT=t;log('환기가 유지되면서 저산소증이 교정되고 있습니다.','info');}
  if(P.rhythm==='PEA'&&S.roscAt==null&&!S.flags.organizedAfterShock){if(P.causeFixed&&P.epiCirc>=1&&P.goodCpr>=100)S.roscAt=t+rnd(15,40);}
  if(P.rhythm==='ASY'){if(!S.flags.asyRoll&&P.epiCirc>=1&&P.goodCpr>=120){S.flags.asyRoll=true;if(Math.random()<0.45)S.changeAt={t:t+rnd(8,25),to:'VF'};}
   if(S.flags.asyRoll&&!S.changeAt&&P.epiCirc>=2&&P.goodCpr>=220&&S.roscAt==null)S.roscAt=t+rnd(15,40);}
  if(S.changeAt&&t>=S.changeAt.t){setRhythm(S.changeAt.to);S.changeAt=null;}
  if(P.rhythm==='TDP'&&P.mg&&!S.flags.tdpRoll){S.flags.tdpRoll=true;if(Math.random()<0.3)S.roscAt=t+rnd(10,30);}
  if(S.roscAt!=null&&t>=S.roscAt){S.roscAt=null;if(P.goodCpr>=20||S.flags.organizedAfterShock)doRosc();else S.roscAt=t+5;}
  if(P.rhythm==='VF'&&P.noFlow>200&&!S.flags.vfDecay){S.flags.vfDecay=true;setRhythm('ASY');}
  if(P.noFlow>=300||t-(S.arrestStart||0)>=20*60)endCase('death');
 } else {
  S.flags.organizedAfterShock=false;
  // 조율
  if(P.pace.on&&P.pads&&['SB','AVB3'].includes(P.rhythm)){const cap=P.pace.mA>=P.paceTh;if(cap!==P.paceCapture){P.paceCapture=cap;if(cap){log('포획 확인: 조율 스파이크마다 넓은 QRS가 따라오고 맥박이 촉지됩니다.','dev');markDef('pace');}else log('포획 소실','warn');}}
  else if(P.paceCapture)P.paceCapture=false;
  if(P.paceCapture){P.hr=P.pace.rate;P.sbpT=Math.max(P.sbpT,96+(P.pace.rate-60)*0.5);if(P.mental!=='무반응'&&P.pace.mA>=50&&!S.flags.paceSed){S.flags.paceSed=true;log('참고: 의식이 있는 환자는 조율 중 진통·진정을 고려합니다.','info');}}
  const pres=S.infusions.filter(f=>f.kind==='drip'&&['epiD','dopaD','neD'].includes(f.fid));
  if(pres.length){if(['SB','AVB3'].includes(P.rhythm)&&!P.paceCapture&&pres.some(f=>f.fid!=='neD')){P.hrT=Math.max(P.hrT,P.rhythm==='AVB3'?56:72);markDef(pres[0].fid);}P.sbpT=Math.max(P.sbpT,104);}
  P.hr+=clamp(P.hrT-P.hr,-6*dt,6*dt);P.sbp+=clamp(P.sbpT-P.sbp,-3*dt,3*dt);
  let spT;if(P.bvm||P.airway==='ett')spT=P.fio2>=0.95?100:P.fio2>=0.55?98:P.fio2>=0.38?96:94;else spT=P.o2==='nrb'?98:(S.C.spo2||95);
  if(S.roscT!=null)spT=Math.min(spT,P.bvm||P.airway==='ett'?spT:91);
  P.spo2+=clamp(spT-P.spo2,-0.6*dt,0.6*dt);
  const coT=P.bvm?38*Math.pow(10/clamp(P.ventRate,4,40),0.6):38;P.etco2+=(coT-P.etco2)*Math.min(1,dt*0.4);
  if(S.roscT!=null){P.mental='무반응';P.breathing=t-S.roscT>90&&!P.bvm?'normal':'none';
   if(P.sbp<90&&!P.compressing){S.hypoT+=dt;if(S.hypoT>(S.mode==='basic'?300:220)){S.hypoT=0;setRhythm(Math.random()<0.5?'PEA':'VF');S.hidden.push({t,text:'ROSC 후 저혈압 지속으로 재정지'});}}else S.hypoT=Math.max(0,S.hypoT-dt);
   if(!P.bvm&&P.breathing==='none'&&t-S.roscT>20){P.spo2=Math.max(70,P.spo2-0.8*dt);}}
  else{P.mental=P.sbp<75?'통증에만 반응':'음성에 반응';P.breathing='normal';}
  // 악화
  const det=S.C.det;
  if(det&&!S.treated&&!S.flags.det1&&t>=det.at){S.flags.det1=true;P.sbpT=Math.min(P.sbpT,det.sbp);S.hidden.push({t,text:'치료 지연으로 혈압 저하'});}
  if(det&&!S.treated&&!S.flags.det2&&t>=det.arrestAt){S.flags.det2=true;setRhythm(det.to);S.hidden.push({t,text:'치료 지연으로 심정지'});}
  const ai=S.infusions.find(f=>f.fid==='amio150i');
  if(ai&&P.rhythm==='VTP'&&ai.el>40&&Math.random()<dt/140)convert('NSR',90,118,'아미오다론 주입 중 동율동 전환');
  if(S.flags.rateCtl&&['AF','AFL'].includes(P.rhythm))P.hrT=Math.min(P.hrT,96);
 }
}
function stableNow(){const P=S.P;if(!P.pulse||P.compressing||P.sbp<90)return false;const hr=P.paceCapture?P.pace.rate:P.hr;
 if(['VTP','SVT'].includes(P.rhythm))return false;if(hr<50||hr>120)return false;if(P.rhythm==='AF'&&hr>110)return false;return true;}
function conditions(){
 const P=S.P;
 if(S.C.pulseCase&&S.roscT==null){
  return[{label:'리듬·혈역학 안정 30초',ok:S.stable>=30,v:Math.min(30,Math.floor(S.stable))+'/30초'},{label:'ECG·SpO₂ 연결',ok:P.pads&&P.probe},{label:'치료 후 혈압 측정',ok:S.bpAfterTx}];
 }
 const rc=S.roscConfirmed&&P.pulse;
 return[
  {label:'ROSC 선언 (리듬+맥박 확인 후)',ok:rc},
  {label:'가슴압박 중지',ok:rc&&!P.compressing},
  {label:'ECG·SpO₂·EtCO₂ 연결',ok:P.pads&&P.probe&&P.etco2Sensor},
  {label:'SpO₂ 90–98%',ok:rc&&P.spo2>=90&&P.spo2<=98.4,v:P.probe&&P.pulse?Math.round(P.spo2)+'%':''},
  {label:'EtCO₂ 35–45 mmHg (환기 10회/분)',ok:rc&&P.etco2Sensor&&P.etco2>=35&&P.etco2<=45,v:P.etco2Sensor?Math.round(P.etco2):''},
  {label:'ROSC 후 측정 MAP ≥ 65',ok:rc&&S.bpAfterRosc&&S.nibp.last&&S.nibp.last.ok&&(S.nibp.last.sys+2*S.nibp.last.dia)/3>=65&&S.nibp.last.t>S.roscT,v:S.nibp.last&&S.nibp.last.ok&&S.roscT!=null&&S.nibp.last.t>S.roscT?'MAP '+Math.round((S.nibp.last.sys+2*S.nibp.last.dia)/3):''},
  {label:'12유도 심전도',ok:rc&&S.ecg12Done},
  {label:'체온 조절 결정',ok:rc&&S.ttm},
  {label:'안정 유지 30초',ok:rc&&S.stable>=30,v:rc?Math.min(30,Math.floor(S.stable))+'/30초':''}
 ];
}

/* ============ 루프 ============ */
let uiHold=false;document.addEventListener('pointerdown',()=>{uiHold=true;},true);document.addEventListener('pointerup',()=>{setTimeout(()=>{uiHold=false;},60);},true);document.addEventListener('pointercancel',()=>{uiHold=false;},true);
let lastFrame=0,acc=0,monSweep=null,heroSweep=null,heroEng=null,heroT=0,learnObjs=[],quizObj=null,uiAcc=0;
function frame(ts){
 const dt=Math.min(0.1,(ts-(lastFrame||ts))/1000);lastFrame=ts;
 if(curScreen==='sim'&&S&&!S.paused&&!S.ended&&!document.hidden){acc+=dt*(S.speed||1);while(acc>=0.1){acc-=0.1;tick(0.1);}
  if(monSweep)monSweep.draw(S.t+acc,S.eng);uiAcc+=dt;if(uiAcc>=0.25&&!uiHold){uiAcc=0;renderSim();if(instOpen)renderInst();}}
 if(curScreen==='menu'&&heroSweep){heroT+=dt;heroCycle();heroSweep.draw(heroT,heroEng);}
 if(curScreen==='learn'){learnObjs.forEach(o=>{o.t+=dt;o.sw.draw(o.t,o.eng);});if(quizObj){quizObj.t+=dt;quizObj.sw.draw(quizObj.t,quizObj.eng);}}
 requestAnimationFrame(frame);
}
function fakeP(rh,opt){return Object.assign({rhythm:rh,hr:RH[rh].hr||0,pads:true,probe:true,etco2Sensor:false,pulse:RH[rh].pulse,sbp:RH[rh].pulse?115:0,pace:{on:false,rate:70,mA:0},paceCapture:false,compressing:false,bvm:false,airway:'none',breathing:'none',holdUntil:0,vfAmp:0.5,ventRate:10,etco2:0,compQ:0,compDepth:5,compRate:110},opt||{});}
function mkStrip(cv,P){const eng=new Engine(()=>P);const sw=new Sweep(cv,[{fn:t=>eng.ecg(t),min:-1.3,max:1.6,color:cssv('--ecg')}],95);return{eng,sw,t:0,P};}

/* ============ 오버레이 ============ */
function openDlg(html,wide){$('#dlg').className='dlg'+(wide?' wide':'');$('#dlg').innerHTML=html;$('#ov').hidden=false;}
function closeDlg(){$('#ov').hidden=true;if(S&&S.flags.introOpen){S.flags.introOpen=false;S.paused=false;}}
function openIntro(){
 S.paused=true;S.flags.introOpen=true;const md={basic:'기초 훈련: 팀원 술기 실패가 없고 힌트와 알고리즘을 볼 수 있습니다.',adv:'심화 훈련: 정맥로·삽관이 실패할 수 있고, 압박 담당자는 시간이 지나면 깊이가 얕아지며, 환기 담당자는 너무 빠르게 짤 수 있습니다.',test:'평가 모드: 힌트·알고리즘·약물 정보가 없습니다. 80점 이상, 중대 오류 없음, 목표 달성이면 통과입니다.'}[S.mode];
 openDlg('<span class="label">'+((S.mode==='test'||S.hideName||window.CBL_RAND)?(S.mode==='test'?'평가 케이스':'무작위 케이스'):esc(S.C.group||'사용자 정의'))+'</span><h2>'+((S.mode==='test'||S.hideName||window.CBL_RAND)?'병동 응급 호출':esc(S.C.name))+'</h2><p><b>'+esc(S.C.who)+'</b></p><p style="margin-top:6px">'+esc(S.C.story)+'</p>'+
  '<p style="margin-top:12px">당신은 팀 리더입니다. 현장에는 간호사 2명과 인턴 1명이 있습니다. 먼저 환자를 깨워 반응을 보고, 반응이 없으면 곧바로 <b>코드블루를 호출</b>한 뒤 <b>호흡과 맥박을 함께</b> 확인하세요. 팀원을 고른 뒤 왼쪽 업무 버튼으로 지시합니다.</p>'+
  '<p class="muted" style="margin-top:8px;font-size:13px">'+md+'</p><div class="acts"><button class="btn" data-go="menu">취소</button><button class="btn hot" data-act="introGo">시뮬레이션 시작</button></div>');
}
function openRead(){
 if(!S.P.pads)return;openDlg('<h2>리듬 판독</h2><p class="muted">지금 모니터의 리듬을 고르세요.'+(compNow()?' 압박 중에는 잡음 때문에 판독이 부정확할 수 있습니다.':'')+'</p><div class="readgrid">'+READS.map(([k,l])=>'<button class="btn" data-readv="'+k+'">'+esc(l)+'</button>').join('')+'</div><div class="acts"><button class="btn" data-act="closeDlg">닫기</button></div>');
}
function doRead(k){
 const P=S.P,ok=acceptReads(P).includes(k),art=compNow();
 S.readings.push({t:S.t,choice:k,ok,art,actual:P.paceCapture?'PACED':P.rhythm,pulse:P.pulse});
 log('리더 판독: '+READ_NAME[k]+(art?' (압박 중)':''),'act');closeDlg();
 if(S.mode!=='test')toast(art?'압박 잡음이 섞인 상태의 판독입니다. 리듬 확인은 짧게 멈춘 뒤 합니다.':ok?'판독이 맞습니다.':'판독이 실제 리듬과 다릅니다. 다시 보세요.');else toast('판독을 기록했습니다.');
}
const ALGO=[
 ['첫 대응','<ol><li>주변 안전 확인 후 어깨를 두드리며 반응을 확인합니다.</li><li>반응이 없으면 <b>코드블루</b>로 소생팀과 제세동기를 요청합니다.</li><li><b>호흡과 맥박을 동시에</b> 5–10초 확인합니다. 헐떡임은 정상 호흡이 아닙니다.</li><li>정상 호흡과 확실한 맥박이 없으면 즉시 가슴압박을 시작하고, 패드를 붙여 리듬을 봅니다.</li></ol><h4>고품질 CPR</h4><ul><li>속도 100–120회/분, 깊이 약 5 cm(6 cm 넘지 않게), 완전한 이완.</li><li>중단은 10초 이내, 압박 분율은 높게 유지합니다.</li><li>전문기도기 전 30:2, 전문기도기 후 6초마다 1회(10회/분) 환기.</li><li>2분마다 압박자를 바꾸고 리듬을 확인합니다.</li></ul>'],
 ['충격 리듬','<p>심실세동, 무맥성 심실빈맥, Torsades de Pointes</p><ol><li>제세동 1회: 이상파형 120–200 J(제조사 권장, 모르면 최대), 충전은 압박 중에.</li><li>충격 직후 맥박 확인 없이 <b>CPR 2분</b>. 정맥로를 우선 시도하고 어려우면 골내로.</li><li>리듬 확인 → 여전히 충격 리듬이면 제세동 → CPR 2분. 이 무렵 <b>에피네프린 1 mg</b>, 이후 3–5분마다.</li><li>세 번째 제세동 이후에도 지속되면 <b>아미오다론 300 mg</b>(추가 150 mg) 또는 <b>리도카인 1–1.5 mg/kg</b>.</li><li>Torsades de Pointes에는 <b>황산마그네슘 1–2 g</b>.</li></ol><p class="note">전문기도기와 EtCO₂ 감시를 고려합니다. 압박 중 EtCO₂가 갑자기 오르면 ROSC를 의심합니다.</p>'],
 ['비충격 리듬','<p>무수축, 무맥성 전기활동(PEA)</p><ol><li>CPR 2분씩 반복하고 정맥로 또는 골내로를 확보합니다.</li><li><b>에피네프린 1 mg을 가능한 빨리</b>, 이후 3–5분마다.</li><li>2분마다 리듬 확인. 충격 리듬으로 바뀌면 충격 리듬 흐름으로 넘어갑니다.</li><li>가역적 원인을 찾아 교정합니다(5H·5T 탭).</li></ol><p class="note">무수축·PEA에는 제세동과 심박조율이 권장되지 않습니다. 아트로핀은 쓰지 않습니다.</p>'],
 ['서맥','<p>심박수 50회/분 미만이면서 증상이 있을 때</p><ol><li>기도·산소, 심전도·혈압·SpO₂ 감시, 정맥로, 12유도 심전도.</li><li>저혈압, 의식 변화, 쇼크, 흉통, 급성 심부전 같은 불안정 징후를 확인합니다.</li><li><b>아트로핀 1 mg</b> 정맥 주사, 3–5분마다, 총 3 mg까지.</li><li>효과가 없으면 <b>경피 심박조율</b>(포획될 때까지 전류를 올림) 또는 <b>도파민 5–20 µg/kg/min</b>, <b>에피네프린 2–10 µg/min</b> 주입.</li><li>전문가 자문과 정맥 조율을 준비합니다.</li></ol>'],
 ['빈맥','<p>맥박이 있고 심박수가 대개 150회/분을 넘을 때</p><ol><li>원인을 찾고 산소, 감시, 정맥로를 확보합니다.</li><li><b>불안정</b>하면 즉시 <b>동기화 심율동전환</b>. 좁고 규칙적(SVT) 100 J, 심방세동·심방조동 200 J, 넓고 규칙적(단형 VT) 100 J. 의식이 있으면 가능한 한 진정 후 시행합니다. 넓고 불규칙하면 제세동 용량(비동기).</li><li><b>안정 · 좁은 QRS</b>: 먼저 변형 발살바 등 미주신경 자극을 시도합니다. 리듬이 규칙적인데 계속되면 <b>아데노신 6 mg 급속 정주</b>, 효과가 없으면 <b>12 mg</b>. 그래도 지속되면 심박수 조절 약물(베타차단제·칼슘통로차단제)을 검토합니다.</li><li><b>안정 · 넓은 QRS</b>: 모양이 하나로 일정하고 규칙적일 때에 한해 아데노신을 써 볼 수 있습니다. 항부정맥제로는 <b>아미오다론 150 mg을 10분에 걸쳐</b> 투여하고, 심장 전문의와 상의합니다.</li></ol><p class="note">아데노신을 불규칙하거나 다형성인 넓은 QRS 빈맥에 쓰면 심실세동으로 나빠질 수 있습니다.</p>'],
 ['ROSC 이후','<ol><li>SpO₂ <b>90–98%</b>가 되도록 산소 농도를 낮춥니다.</li><li>평균동맥압 <b>65 mmHg 이상</b>(병상에서는 수축기 90 mmHg 이상을 함께 확인). 수액과 혈관수축제를 씁니다.</li><li>환기 약 10회/분, EtCO₂ <b>35–45 mmHg</b>. 과환기를 피합니다.</li><li><b>12유도 심전도</b>로 ST 상승을 확인하고 관상동맥 중재를 고려합니다.</li><li>지시에 따르지 않으면 <b>체온 조절</b>(32–37.5 °C, 36시간 이상, 발열 예방)을 결정합니다.</li><li>원인 교정과 집중치료 연계.</li></ol>'],
 ['5H·5T','<h4>5H</h4><ul><li>저혈량 — 수액, 출혈 조절</li><li>저산소 — 환기, 전문기도기</li><li>산증(수소이온) — 환기, 원인 교정</li><li>저·고칼륨 — 고칼륨이면 칼슘, 탄산수소나트륨</li><li>저체온 — 가온</li></ul><h4>5T</h4><ul><li>긴장성 기흉 — 바늘 감압, 흉관</li><li>심장눌림증 — 심낭천자</li><li>독성물질 — 해독제</li><li>폐동맥 혈전 — 혈전용해 고려</li><li>관상동맥 혈전 — 관상동맥 중재</li></ul><p class="note">이 시뮬레이터의 PEA 케이스는 병력, 혈액검사, 청진, 현장 초음파 결과로 원인을 추정할 수 있습니다.</p>']
];
function openAlgo(i){i=i||0;openDlg('<h2>알고리즘 요약</h2><p class="muted" style="font-size:13px">2025 한국 심폐소생술 가이드라인을 참고해 정리한 교육용 요약입니다.'+(S&&curScreen==='sim'?' 시뮬레이션은 계속 진행됩니다.':'')+'</p><div class="algo-tabs">'+ALGO.map((a,j)=>'<button class="btn sm'+(j===i?' on':'')+'" data-algo="'+j+'">'+a[0]+'</button>').join('')+'</div><div class="algo-body">'+ALGO[i][1]+'</div><div class="acts"><button class="btn" data-act="closeDlg">닫기</button></div>',true);}

/* ============ 강사 모드 ============ */
let instOpen=false;
function renderInst(){
 const el=$('#inst');if(!instOpen||!S||curScreen!=='sim'){el.hidden=true;return;}el.hidden=false;const P=S.P;
 setHTML(el,'<div class="ph"><h3>강사 모드</h3><button class="btn sm" data-act="inst">닫기</button></div>'+
  '<div class="inst-truth"><b>실제 상태</b><span>리듬: '+esc(RH[P.rhythm].name)+(P.paceCapture?' (조율 포획)':'')+' · 맥박 '+(P.pulse?'있음':'없음')+'</span><span>HR '+Math.round(P.hr)+' · SBP '+Math.round(P.sbp)+' · SpO₂ '+Math.round(P.spo2)+' · EtCO₂ '+Math.round(P.etco2)+'</span><span>원인: '+(P.cause?CAUSES[P.cause].name+(P.causeFixed?' (교정됨)':' (미교정)'):'없음')+' · 조율 역치 '+P.paceTh+' mA</span><span>에피 순환 '+P.epiCirc+'회 · 항부정맥제 '+(P.antiarr?'예':'아니오')+' · 양질 CPR '+Math.round(P.goodCpr)+'초</span></div>'+
  '<div class="igrp"><span class="label">리듬 변경</span><div class="row"><select id="i-rh">'+Object.keys(RH).map(k=>'<option value="'+k+'">'+esc(RH[k].name)+'</option>').join('')+'</select><input id="i-hr" type="number" placeholder="HR" style="width:70px"><button class="btn sm" data-act="iRh">적용</button></div></div>'+
  '<div class="igrp"><span class="label">목표 수축기 혈압</span><div class="row"><input id="i-sbp" type="number" value="'+Math.round(P.sbpT)+'" style="width:80px"><button class="btn sm" data-act="iSbp">적용</button></div></div>'+
  '<div class="igrp"><span class="label">이벤트</span><div class="row"><button class="btn sm" data-act="iRosc">ROSC 유도</button><button class="btn sm" data-act="iArr" data-v="VF">재정지 · VF</button><button class="btn sm" data-act="iArr" data-v="PEA">재정지 · PEA</button><button class="btn sm" data-act="iArr" data-v="ASY">무수축</button><button class="btn sm" data-act="iFail">다음 술기 실패</button><button class="btn sm" data-act="iCB">지원팀 즉시 도착</button></div></div>'+
  '<div class="igrp"><span class="label">가역적 원인</span><div class="row"><select id="i-cause"><option value="">없음</option>'+Object.keys(CAUSES).map(k=>'<option value="'+k+'"'+(P.cause===k?' selected':'')+'>'+CAUSES[k].name+'</option>').join('')+'</select><button class="btn sm" data-act="iCause">지정</button><button class="btn sm" data-act="iFix">교정 처리</button></div></div>'+
  '<div class="igrp"><span class="label">강사 메모 (디브리핑에 표시)</span><textarea id="i-note" rows="3" placeholder="예: 3분 시점 역할 분담이 불명확함"></textarea><button class="btn sm" data-act="iNote">메모 기록</button>'+(S.notes.length?'<div class="log">'+S.notes.map(n=>'<div class="inst"><time>'+fmt(n.t)+'</time><span>'+esc(n.text)+'</span></div>').join('')+'</div>':'')+'</div>'+
  '<p class="muted" style="font-size:12px;margin-top:14px">강사 개입 기록은 디브리핑에 함께 남고, 통계에는 “강사 개입” 표시가 붙습니다.</p>');
}
function instMark(txt){S.instr=true;S.hidden.push({t:S.t,text:'[강사] '+txt});log('[강사] '+txt,'inst');}

/* ============ 종료·채점 ============ */
function endCase(outcome){
 if(!S||S.ended)return;S.ended=true;S.outcome=outcome;if(S.curPause){S.pauses.push(S.curPause);S.curPause=null;}
 if(S.cycleStart!=null&&S.cycleQ&&S.cycleQ.n)(S.cycles=S.cycles||[]).push({s:S.cycleStart,e:S.t,pause:0,rh:S.P.rhythm,q:S.cycleQ.sum/S.cycleQ.n,last:true});
 log(outcome==='success'?'케이스 완료: 목표를 달성했습니다.':outcome==='death'?'환자 사망: 소생에 실패했습니다.':'리더가 케이스를 종료했습니다.','info');
 S.result=score();
 const list=store.get('cbl_cases_v1',[]);list.push({d:new Date().toISOString(),mode:S.mode,key:S.key,name:S.C.name,score:S.result.total,grade:S.result.grade,pass:S.result.pass,outcome,time:Math.round(S.t),instr:S.instr});store.set('cbl_cases_v1',list.slice(-300));
 instOpen=false;renderInst();showScreen('debrief');renderDebrief('score');
}
function lin(v,good,bad,max){if(v==null)return 0;if(good<bad)return max*clamp((bad-v)/(bad-good),0,1);return max*clamp((v-bad)/(good-bad),0,1);}
function score(){
 const P=S.P,Cc=S.C,items=[],add=(cat,label,pts,max,detail)=>items.push({cat,label,pts:Math.round(pts*10)/10,max,detail});
 const firstAssess=S.assessments[0];
 const seq=(S.conscAt!=null?3:0)+(S.codeBlue.req!=null&&(S.conscAt==null||S.codeBlue.req-S.conscAt<=30)?3:0)+(firstAssess&&firstAssess.d>=5&&firstAssess.d<=10?4:firstAssess&&firstAssess.valid?2:0);
 add('평가','초기 대응 순서',seq,10,(S.conscAt!=null?'의식 확인 '+fmt(S.conscAt):'의식 확인 없음')+' · '+(S.codeBlue.req!=null?'코드블루 '+fmt(S.codeBlue.req):'코드블루 없음')+' · '+(firstAssess?'호흡·맥박 '+firstAssess.d.toFixed(1)+'초':'동시 사정 없음'));
 const wrongN=S.drugs.filter(d=>d.lvl==='wrong').length;
 const badElec=S.shocks.filter(s=>!s.appropriate).length;
 if(!Cc.pulseCase){
  add('CPR','가슴압박 시작',lin(S.firstComp,30,90,10),10,S.firstComp!=null?fmt(S.firstComp)+'에 시작':'시작하지 않음');
  const ccf=S.arrestTime>0?S.compTime/S.arrestTime:0;add('CPR','압박 분율',lin(ccf,0.8,0.4,15),15,Math.round(ccf*100)+'% (목표 80% 이상)');
  const q=S.compTime>0?S.qualTime/S.compTime:0;add('CPR','압박 속도·깊이',S.compTime>0?lin(q,0.9,0.5,10):0,10,'목표 범위 유지 '+Math.round(q*100)+'%');
  const longest=S.pauses.reduce((a,p)=>Math.max(a,p.len),0),over=S.pauses.filter(p=>p.len>10).length;
  add('CPR','압박 중단 관리',S.firstComp==null?0:Math.max(0,lin(longest,10,25,10)-Math.max(0,over-1)*2),10,'최장 '+longest.toFixed(1)+'초 · 10초 초과 '+over+'회');
  {const fl=S.fatLow||0,fo=S.fatOver||0;const mx=Math.max(0,...S.members.map(m=>m.maxStint||0));const need=S.compTime>=110;const pts=need?clamp(10-fo*3-Math.min(5,fl/12),0,10):10;add('CPR','압박자 교대(피로 관리)',pts,10,need?('최장 연속 압박 '+fmt(mx)+' · 2분 30초 초과 '+fo+'회 · 2분 넘겨 깊이 5 cm 미만 '+Math.round(fl)+'초'):'교대가 필요할 만큼 길게 압박하지 않음');}
  {const fb=S.firstBvm,cov=S.arrestTime>0?(S.ventArrest||0)/S.arrestTime:0,ov=S.overvent||0,ett=P.airway==='ett';let ap=(fb!=null?lin(fb,60,180,4):0)+(S.arrestTime>0?lin(cov,0.85,0.4,3):0)+(ov<20?2:ov<60?1:0)+(!ett||P.etco2Sensor?1:0);
   add('기도·환기','환기 시작·유지',ap,10,(fb!=null?'백마스크 '+fmt(fb):'환기 시작 없음')+' · 심정지 중 환기 '+Math.round(cov*100)+'%'+(ett?' · 삽관 후 과환기 '+Math.round(ov)+'초'+(P.etco2Sensor?' · EtCO₂ 확인':' · EtCO₂ 미연결'):''));}
  const goodShocks=S.shocks.filter(s=>s.appropriate&&s.arrest);
  if(Cc.shockable){const fs=goodShocks[0];let p=fs?lin(fs.t,90,240,15):0;if(fs&&fs.e<120)p-=5;p-=badElec*5;add('전기치료','첫 제세동',Math.max(0,p),15,fs?fmt(fs.t)+' · '+fs.e+' J'+(badElec?' · 부적절 '+badElec+'회':''):'제세동 없음');}
  else{const late=goodShocks.length;add('전기치료','부적절한 전기치료 회피',badElec?0:15,15,badElec?'비충격 리듬 충격·조율 '+badElec+'회':'부적절한 충격 없음'+(late?' · 리듬 변화 후 제세동 '+late+'회':''));}
  const epis=S.drugs.filter(d=>d.form==='epi1'&&!d.rh.match(/^(NSR|ST|SB|AVB3|SVT|AF|AFL|VTP)$/));let ep=0,ed='투여 없음';
  if(epis.length){const f=epis[0].t;if(Cc.shockable){const s2=goodShocks[1];ep=s2&&f>=s2.t?6:goodShocks[0]&&f>=goodShocks[0].t?4:2;ed='첫 투여 '+fmt(f)+(s2?' (2번째 제세동 '+fmt(s2.t)+')':'');}else{ep=lin(f,300,600,6);ed='첫 투여 '+fmt(f);}
   const iv=[];for(let i=1;i<epis.length;i++)iv.push(epis[i].t-epis[i-1].t);ep+=iv.length?(iv.every(x=>x>=170&&x<=310)?4:iv.every(x=>x>=140&&x<=370)?2:0):((S.t-epis[0].t)<330?4:0);if(iv.length)ed+=' · 간격 '+iv.map(x=>fmt(x)).join(', ');}
  else if(Cc.shockable&&goodShocks.length<2&&S.roscT!=null){ep=10;ed='2번째 제세동 전 ROSC — 해당 없음';}
  add('약물','에피네프린 시점·간격',ep,10,ed);
  if(Cc.shockable){const aa=S.drugs.find(d=>['amio300','lido1'].includes(d.form));let ap=0,adt='투여 없음';const s3=goodShocks[2];
   if(aa){ap=s3&&aa.t>=s3.t?5:goodShocks[1]&&aa.t>=goodShocks[1].t?3:1;adt=FORM[aa.form].dname+' '+fmt(aa.t);}else if(!s3&&S.roscT!=null){ap=5;adt='3번째 제세동 전 ROSC — 해당 없음';}
   if(Cc.rhythm==='TDP'){const mg=S.drugs.find(d=>d.form==='mg2');ap=mg?5:Math.min(ap,2);adt+=mg?' · 마그네슘 '+fmt(mg.t):' · 마그네슘 없음';}
   add('약물','항부정맥제',ap,5,adt);}
  else{let cp=0,cd='';if(P.cause||Cc.cause){const fixed=P.causeFixed;cp=(S.labs.length||S.pocusDone||S.auscDone?2:0)+(fixed?3:0);cd='원인: '+CAUSES[Cc.cause].name+(fixed?' 교정':' 미교정')+(S.pocusDone?' · 초음파':'')+(S.labs.length?' · 검사':'');}else{cp=S.labs.length||S.pocusDone?5:2;cd=S.labs.length||S.pocusDone?'원인 탐색 시행':'원인 탐색 없음';}add('원인','가역적 원인 탐색',cp,5,cd);}
  const rd=S.readings.filter(r=>!r.art);const rok=rd.filter(r=>r.ok).length;add('판독','리듬 판독',rd.length?10*rok/rd.length:0,10,rd.length?rok+'/'+rd.length+' 정확'+(S.readings.length>rd.length?' · 압박 중 판독 '+(S.readings.length-rd.length)+'회 제외':''):'판독 기록 없음');
  add('안전','약물 안전',Math.max(0,5-2.5*wrongN),5,wrongN?'부적절 약물 '+wrongN+'회':'부적절 약물 없음');
  if(S.roscT!=null){const post=conditions().slice(3,8);const okn=post.filter(c=>c.ok).length;add('ROSC 이후','소생 후 목표',okn,5,okn+'/5 목표 달성'+(okn<5?' — 미달: ':'')+post.filter(c=>!c.ok).map(c=>c.label).join(', '));}
 } else {
  const mon=[S.firstPads,S.firstProbe,S.firstBP].reduce((a,t)=>a+lin(t,60,180,5),0);add('평가','감시장치 연결',mon,15,'패드 '+(S.firstPads!=null?fmt(S.firstPads):'—')+' · SpO₂ '+(S.firstProbe!=null?fmt(S.firstProbe):'—')+' · 첫 혈압 '+(S.firstBP!=null?fmt(S.firstBP):'—'));
  add('평가','정맥로 확보',lin(S.firstAccess,90,240,10),10,S.firstAccess!=null?fmt(S.firstAccess):'확보 안 함');
  const rd=S.readings.filter(r=>!r.art);const firstOk=rd.find(r=>r.ok);let rp=0;if(firstOk)rp=S.firstDef==null||firstOk.t<=S.firstDef?15:8;add('판독','리듬 판독',rp,15,firstOk?'정확 판독 '+fmt(firstOk.t)+(S.firstDef!=null&&firstOk.t>S.firstDef?' (치료 이후)':''):'정확한 판독 없음');
  {let tp=S.firstDef!=null?Math.max(5,lin(S.firstDef,150,420,25)):0,td=S.firstDef!=null?fmt(S.firstDef)+' · '+defName(S.firstDefKey):'적절한 치료 없음';if(!Cc.unstable&&S.firstDefKey==='sync'&&Cc.def[0]!=='sync'){tp=Math.min(tp,10);td+=' · 안정 상태에서 약물·미주신경 자극 전에 전기치료';}if(S.flags.noSedShock){tp=Math.max(0,tp-5);td+=' · 진정 없이 의식 있는 환자에게 충격';}add('치료','1차 치료 시점',tp,25,td);}
  add('안전','약물·전기치료 안전',Math.max(0,15-5*wrongN-5*badElec),15,(wrongN?'부적절 약물 '+wrongN+'회':'부적절 약물 없음')+(badElec?' · 부적절 충격 '+badElec+'회':''));
  add('평가','치료 후 재평가',S.bpAfterTx?10:0,10,S.bpAfterTx?'치료 후 혈압 측정함':'치료 후 혈압 측정 없음');
  add('CPR','악화 예방',S.hidden.some(h=>h.text==='치료 지연으로 심정지'||h.text==='심정지 발생')?0:15,15,S.hidden.some(h=>h.text==='심정지 발생')?'심정지로 진행':'심정지 없이 관리');
 }
 const max=items.reduce((a,i)=>a+i.max,0);let total=items.reduce((a,i)=>a+i.pts,0);total=Math.round(clamp(total/max*100,0,100));
 if(S.outcome==='death')total=Math.min(total,55);if(S.outcome==='stopped')total=Math.min(total,69);
 const grade=total>=90?'A':total>=80?'B':total>=70?'C':total>=60?'D':'F';
 const pass=S.outcome==='success'&&S.crit.length===0&&total>=80;
 return{items,total,grade,pass};
}
function defName(k){if(!k)return'';if(k==='pace')return'경피 심박조율 포획';if(k==='sync')return'동기화 심율동전환';if(k==='vagal')return'미주신경 자극';return FORM[k]?FORM[k].dname+' '+FORM[k].label:k;}
function checklist(){
 const P=S.P,Cc=S.C,L=[];const it=(ok,txt,t)=>L.push({ok,txt,t});
 it(S.conscAt!=null,'의식 확인',S.conscAt);it(S.codeBlue.req!=null,'코드블루 요청',S.codeBlue.req);
 const fa=S.assessments[0];it(fa?(fa.d>=5&&fa.d<=10):false,'호흡·맥박 동시 사정 5–10초',fa?fa.s:null);
 it(S.firstPads!=null,'제세동 패드 부착',S.firstPads);it(S.readings.some(r=>r.ok&&!r.art),'정확한 리듬 판독',(S.readings.find(r=>r.ok&&!r.art)||{}).t);
 it(S.firstAccess!=null,'정맥로·골내로 확보',S.firstAccess);it(S.firstProbe!=null,'맥박산소측정기',S.firstProbe);
 if(!Cc.pulseCase){it(S.firstComp!=null,'가슴압박 시작',S.firstComp);it(S.members.some(m=>m.task==='bvm')||S.log.some(l=>l.text.includes('백마스크 환기 시작')),'환기 배정',null);
  it(S.drugs.some(d=>d.form==='epi1'),'에피네프린 투여',(S.drugs.find(d=>d.form==='epi1')||{}).t);
  it(S.procs.some(p=>p.k==='ett'&&p.ok),'전문기도기 삽관',(S.procs.find(p=>p.k==='ett'&&p.ok)||{}).t);
  it(S.log.some(l=>l.text.includes('EtCO₂ 센서 연결')),'EtCO₂ 감시',null);
  const sr=S.shocks.filter(s=>s.arrest&&s.appropriate&&s.resume!=null);it(sr.length?sr.every(s=>s.resume<=5):(Cc.shockable?false:null),'충격 후 5초 안에 압박 재개',null);
  it(S.roscT!=null,'자발순환 회복',S.roscT);it(S.roscConfirmed,'ROSC 후 재사정',S.roscConfirmT);it(S.bpAfterRosc,'ROSC 후 혈압 측정',null);it(S.ecg12Done,'12유도 심전도',null);it(S.ttm,'목표체온 조절 결정',null);
  it(S.overvent<30?true:false,'전문기도기 후 과환기 없음',null);}
 else{it(S.firstBP!=null,'혈압 측정',S.firstBP);it(S.firstDef!=null,'적절한 1차 치료',S.firstDef);it(S.bpAfterTx,'치료 후 혈압 재측정',null);it(S.ecg12Done,'12유도 심전도',null);}
 it(S.crit.length===0,'중대 안전 오류 없음',null);
 return L;
}
function renderDebrief(tab){
 const R=S.result,el=$('#scr-debrief');
 const outTxt={success:S.C.pulseCase&&S.roscT==null?'환자 안정화':'ROSC 후 안정화',death:'환자 사망',stopped:'미완료 종료'}[S.outcome];
 let h='<div class="db-head"><div class="grade '+R.grade+'">'+R.grade+'</div><div><span class="label">'+({basic:'기초 훈련',adv:'심화 훈련',test:'평가 모드'}[S.mode])+' · '+esc(S.C.group||'사용자 정의')+'</span><h2>'+esc(S.C.name)+' — '+outTxt+'</h2><p class="muted">'+R.total+'점 · 소요 '+fmt(S.t)+(S.mode==='test'?' · '+(R.pass?'<b style="color:var(--ok)">통과</b>':'<b style="color:var(--bad)">불통과</b>'):'')+(S.instr?' · 강사 개입':'')+'</p></div>'+
  '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn" data-act="copyReport">보고서 복사</button><button class="btn" data-act="retry">같은 케이스 다시</button><button class="btn primary" data-go="menu">처음 화면</button></div></div>';
 h+='<div class="db-tabs">'+[['score','성적'],['check','수행 점검'],['cycles','2분 주기'],['chart','경과 그래프'],['log','전체 기록']].map(([k,l])=>'<button data-dbtab="'+k+'" class="'+(tab===k?'on':'')+'">'+l+'</button>').join('')+'</div>';
 if(S.crit.length)h+='<div class="crit-box"><b>중대 오류 '+S.crit.length+'건</b><br>'+S.crit.map(c=>fmt(c.t)+' '+esc(c.text)).join('<br>')+'</div>';
 if(tab==='score'){h+='<div class="tbl-wrap"><table class="score"><thead><tr><th>영역</th><th>항목</th><th>근거</th><th style="text-align:right">점수</th></tr></thead><tbody>'+R.items.map(i=>'<tr><td class="muted">'+esc(i.cat)+'</td><td>'+esc(i.label)+'</td><td>'+esc(i.detail)+'</td><td class="p">'+(i.max?'<span class="sbar"><i style="width:'+Math.round(i.pts/i.max*100)+'%"></i></span>'+i.pts+'/'+i.max:'+'+i.pts)+'</td></tr>').join('')+'</tbody></table></div>';
  if(S.cautions.length)h+='<h3 style="margin:16px 0 6px;font-size:15px">주의 기록</h3><div class="log">'+S.cautions.map(c=>'<div class="warn"><time>'+fmt(c.t)+'</time><span>'+esc(c.text)+'</span></div>').join('')+'</div>';
  if(S.notes.length)h+='<h3 style="margin:16px 0 6px;font-size:15px;color:var(--inst)">강사 메모</h3><div class="log">'+S.notes.map(c=>'<div class="inst"><time>'+fmt(c.t)+'</time><span>'+esc(c.text)+'</span></div>').join('')+'</div>';
  h+='<p class="muted" style="font-size:12.5px;margin-top:14px">자체 교육용 채점입니다. 공식 자격 평가를 대신하지 않습니다.</p>';}
 else if(tab==='check'){h+='<div class="checklist">'+checklist().map(c=>'<div class="'+(c.ok==null?'na':c.ok?'ok':'no')+'"><span class="m">'+(c.ok==null?'–':c.ok?'✓':'✗')+'</span><span>'+esc(c.txt)+'</span><span class="tt">'+(c.t!=null?fmt(c.t):'')+'</span></div>').join('')+'</div>';}
 else if(tab==='cycles'){const cy=S.cycles||[];if(!cy.length)h+='<p class="muted">CPR 주기가 기록되지 않았습니다. 맥박이 있는 케이스이거나 압박을 시작하지 않았습니다.</p>';
  else h+='<div class="tbl-wrap"><table class="score"><thead><tr><th>주기</th><th>압박 구간</th><th>길이</th><th>압박 질</th><th>뒤이은 중단</th><th>중단 시 리듬</th><th>이 주기의 처치</th></tr></thead><tbody>'+cy.map((c,i)=>{const acts=S.drugs.filter(d=>d.t>=c.s&&d.t<c.e+c.pause).map(d=>FORM[d.form].dname).concat(S.shocks.filter(s=>!s.pace&&s.t>=c.s&&s.t<=c.e+c.pause+0.5).map(s=>'충격 '+s.e+'J'));
   return'<tr><td>'+(i+1)+'</td><td class="num">'+fmt(c.s)+'–'+fmt(c.e)+'</td><td class="num">'+fmt(c.e-c.s)+'</td><td class="num">'+Math.round(c.q*100)+'%</td><td class="num" style="'+(c.pause>10?'color:var(--bad);font-weight:600':'')+'">'+(c.last?'—':c.pause.toFixed(1)+'초')+'</td><td>'+esc(RH[c.rh]?RH[c.rh].name:'')+'</td><td>'+esc(acts.join(', ')||'—')+'</td></tr>';}).join('')+'</tbody></table></div><p class="muted" style="font-size:12.5px;margin-top:8px">압박이 3초 이상 멈춘 지점을 주기의 경계로 봅니다. 목표: 주기 2분, 중단 10초 이내.</p>';}
 else if(tab==='chart'){h+='<canvas id="tl"></canvas><p class="muted" style="font-size:12.5px;margin-top:6px">초록 선: 심박수 · 하늘색 선: 수축기 혈압 · 아래 띠: 가슴압박 · 주황 삼각형: 충격 · 점: 약물 · 세로선: 숨겨진 상태 변화</p>';}
 else{const all=S.log.concat(S.hidden.map(x=>({t:x.t,text:'[상태] '+x.text,type:'inst'}))).sort((a,b)=>a.t-b.t);h+='<div class="log">'+all.map(e=>'<div class="'+e.type+'"><time>'+fmt(e.t)+'</time><span>'+esc(e.text)+'</span></div>').join('')+'</div>';}
 el.innerHTML=h;
 if(tab==='chart')requestAnimationFrame(drawTimeline);
}
function drawTimeline(){
 const cv=$('#tl');if(!cv)return;const r=cv.getBoundingClientRect(),dpr=devicePixelRatio||1;cv.width=r.width*dpr;cv.height=r.height*dpr;const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 const W=r.width,H=r.height,L=40,Rr=10,T=12,B=56;const tr=S.trace;const tmax=Math.max(60,S.t);const X=t=>L+(W-L-Rr)*t/tmax,Y=v=>T+(H-T-B)*(1-v/200);
 const ink=cssv('--ink'),muted=cssv('--muted'),line=cssv('--line');c.font='11px '+cssv('--f-mono');
 c.strokeStyle=line;c.fillStyle=muted;c.lineWidth=1;for(let v=0;v<=200;v+=50){c.beginPath();c.moveTo(L,Y(v));c.lineTo(W-Rr,Y(v));c.stroke();c.fillText(v,6,Y(v)+4);}
 const step=tmax>600?120:60;for(let t=0;t<=tmax;t+=step){c.fillText(fmt(t),X(t)-14,H-6);}
 S.hidden.forEach(hh=>{c.strokeStyle=cssv('--inst');c.setLineDash([3,3]);c.beginPath();c.moveTo(X(hh.t),T);c.lineTo(X(hh.t),H-B);c.stroke();c.setLineDash([]);});
 const plot=(key,col)=>{c.strokeStyle=col;c.lineWidth=2;c.beginPath();let on=false;tr.forEach(p=>{const v=p[key];if(v==null){on=false;return;}if(!on){c.moveTo(X(p.t),Y(v));on=true;}else c.lineTo(X(p.t),Y(v));});c.stroke();};
 plot('hr',cssv('--ok'));plot('sbp',cssv('--pleth'));
 c.fillStyle=cssv('--team');tr.forEach(p=>{if(p.c)c.fillRect(X(p.t),H-B+8,Math.max(1,X(1)-X(0)+0.5),10);});c.fillStyle=muted;c.fillText('압박',4,H-B+17);
 S.shocks.filter(s=>!s.pace).forEach(s=>{c.fillStyle=cssv('--accent');c.beginPath();c.moveTo(X(s.t),H-B+22);c.lineTo(X(s.t)-6,H-B+34);c.lineTo(X(s.t)+6,H-B+34);c.fill();});
 S.drugs.forEach(d=>{c.fillStyle=d.lvl==='wrong'?cssv('--bad'):ink;c.beginPath();c.arc(X(d.t),H-B+28,3.5,0,7);c.fill();});
}
function reportText(){
 const R=S.result;let s='[코드블루 리더 디브리핑]\n'+S.C.name+' / '+({basic:'기초 훈련',adv:'심화 훈련',test:'평가 모드'}[S.mode])+'\n결과: '+({success:'안정화',death:'사망',stopped:'미완료'}[S.outcome])+' · '+R.total+'점 ('+R.grade+') · 소요 '+fmt(S.t)+(S.mode==='test'?' · '+(R.pass?'통과':'불통과'):'')+'\n\n[성적]\n';
 R.items.forEach(i=>s+='- '+i.label+': '+i.pts+(i.max?'/'+i.max:'')+' ('+i.detail+')\n');
 if(S.crit.length){s+='\n[중대 오류]\n';S.crit.forEach(c=>s+='- '+fmt(c.t)+' '+c.text+'\n');}
 s+='\n[수행 점검]\n';checklist().forEach(c=>s+=(c.ok==null?'– ':c.ok?'✓ ':'✗ ')+c.txt+(c.t!=null?' ('+fmt(c.t)+')':'')+'\n');
 if(S.notes.length){s+='\n[강사 메모]\n';S.notes.forEach(n=>s+='- '+fmt(n.t)+' '+n.text+'\n');}
 s+='\n[기록]\n';S.log.forEach(e=>s+=fmt(e.t)+' '+e.text+'\n');return s;
}

/* ============ 다른 화면 ============ */
function showScreen(k){
 curScreen=k;try{$('#toast').hidden=true;}catch(e){}document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!=='scr-'+k);
 if(k!=='learn'){learnObjs=[];quizObj=null;}
 if(k==='menu')initHero();if(k==='pick')renderPick();if(k==='learn')renderLearn();if(k==='stats')renderStats();if(k==='help')renderHelp();
 renderTop();renderInst();window.scrollTo(0,0);
}
const HERO_SEQ=[['NSR',82],['AF',128],['VTP',168],['VF',0],['SB',42],['AFL',150]];
function initHero(){const cv=$('#hero-cv');requestAnimationFrame(()=>{heroT=0;heroP=fakeP('NSR');heroEng=new Engine(()=>heroP);heroSweep=new Sweep(cv,[{fn:t=>heroEng.ecg(t),min:-1.3,max:1.6,color:cssv('--ecg')}],110);heroIdx=-1;});}
let heroP=null,heroIdx=-1;
function heroCycle(){const i=Math.floor(heroT/7)%HERO_SEQ.length;if(i!==heroIdx){heroIdx=i;const[k,hr]=HERO_SEQ[i];heroP.rhythm=k;heroP.hr=hr||RH[k].hr||0;heroP.pulse=RH[k].pulse;$('#hm-name').textContent='II · '+RH[k].name;$('#hm-hr').textContent=RH[k].cont?'---':hr;}}
function renderPick(){
 const el=$('#scr-pick');const mode=SEL.mode;const mname={basic:'기초 훈련',adv:'심화 훈련'}[mode];
 const groups={};CASE_KEYS.forEach(k=>{const g=CASES[k].group;(groups[g]=groups[g]||[]).push(k);});
 const stats=store.get('cbl_cases_v1',[]);
 el.innerHTML='<div class="pick-head"><div><span class="label">'+mname+'</span><h2>케이스 선택</h2></div><button class="btn hot" data-case="RANDOM">무작위 케이스</button></div><div class="case-groups">'+
  Object.keys(groups).map(g=>'<div class="cg"><h3>'+g+'</h3><div class="list">'+groups[g].map(k=>{const n=stats.filter(s=>s.key===k).length;return'<button class="case" data-case="'+k+'"><b>'+esc(CASES[k].name)+'</b><span>'+esc(CASES[k].who||'원인 5가지 중 하나')+'</span><span class="n">'+(n?'수행 '+n+'회':'처음')+'</span></button>';}).join('')+'</div></div>').join('')+'</div>'+
  '<div class="builder"><h3>사용자 정의 케이스</h3><p class="muted">수업 목표에 맞게 첫 리듬, 활력징후, 가역적 원인, 상황 설명을 정해 케이스를 만듭니다.</p><div class="fgrid">'+
  '<div class="field w2"><label for="cu-rh">첫 리듬</label><select id="cu-rh">'+Object.keys(RH).map(k=>'<option value="'+k+'">'+esc(RH[k].name)+'</option>').join('')+'</select></div>'+
  '<div class="field"><label for="cu-hr">심박수</label><input id="cu-hr" type="number" value="80"></div><div class="field"><label for="cu-sbp">수축기 혈압</label><input id="cu-sbp" type="number" value="100"></div><div class="field"><label for="cu-sp">SpO₂</label><input id="cu-sp" type="number" value="94"></div>'+
  '<div class="field"><label for="cu-cause">가역적 원인</label><select id="cu-cause"><option value="">없음</option>'+Object.keys(CAUSES).map(k=>'<option value="'+k+'">'+CAUSES[k].name+'</option>').join('')+'</select></div>'+
  '<div class="field w2"><label for="cu-who">환자</label><input id="cu-who" value="60세 · 65 kg"></div><div class="field w3"><label for="cu-story">상황</label><input id="cu-story" value="병동에서 갑자기 상태가 변했습니다."></div>'+
  '<div class="field"><label>&nbsp;</label><button class="btn primary" data-act="custom">만들고 시작</button></div></div><p class="muted" style="font-size:12px;margin-top:8px">맥박 여부는 리듬에 따라 정해집니다. 원인은 심정지 리듬일 때 ROSC 조건이 됩니다.</p></div>';
}
function startCustom(){
 const rh=$('#cu-rh').value;const r=RH[rh];const cz=$('#cu-cause').value||null;
 const custom={group:'사용자 정의',name:'사용자 정의 · '+r.name,rhythm:rh,hr:+$('#cu-hr').value||r.hr,sbp:r.pulse?(+$('#cu-sbp').value||100):0,spo2:+$('#cu-sp').value||94,cause:r.pulse?null:cz,who:$('#cu-who').value,story:$('#cu-story').value,unstable:r.pulse&&(+$('#cu-sbp').value<90)};
 if(r.pulse&&custom.sbp<90&&['SVT','AF','AFL','VTP'].includes(rh))custom.def=['sync'];
 startCase('CUSTOM',SEL.mode,custom);
}
function testCaseKey(){const list=store.get('cbl_cases_v1',[]).filter(x=>x.mode==='test'&&x.pass);const c={};CASE_KEYS.forEach(k=>c[k]=list.filter(x=>x.key===k).length);const min=Math.min(...Object.values(c));return pick(CASE_KEYS.filter(k=>c[k]===min));}
const LEARN=[['NSR'],['ST'],['SB'],['AVB3'],['SVT'],['AF'],['AFL'],['VTP'],['VF'],['TDP'],['PEA'],['ASY'],['SB',{pace:{on:true,rate:70,mA:80},paceCapture:true},'심박조율 리듬(포획)','조율 스파이크 직후 넓은 QRS가 뒤따름','포획을 확인했으면 맥박과 혈압으로 기계적 포획도 확인합니다.']];
function renderLearn(){
 const el=$('#scr-learn');
 el.innerHTML='<div class="pick-head"><div><span class="label">학습</span><h2>리듬 학습</h2></div></div><div class="quiz" id="quiz"></div><div class="rgrid">'+LEARN.map((l,i)=>{const r=RH[l[0]];return'<div class="rcard"><canvas id="lc'+i+'"></canvas><div class="b"><b>'+esc(l[2]||r.name)+'</b><p>'+esc(l[3]||r.feat)+'</p><p class="tx">'+esc(l[4]||r.tx)+'</p></div></div>';}).join('')+'</div>';
 requestAnimationFrame(()=>{learnObjs=LEARN.map((l,i)=>mkStrip($('#lc'+i),fakeP(l[0],l[1])));newQuiz();});
}
let quizState={n:0,ok:0};
function newQuiz(){
 const pool=['NSR','ST','SB','AVB3','SVT','AF','AFL','VTP','VF','TDP','ASY'];const k=pick(pool);const rk={VTP:'VT'}[k]||k;
 const wrong=READS.filter(x=>x[0]!==rk&&!['ORG','PACED'].includes(x[0])).sort(()=>Math.random()-0.5).slice(0,3);const opts=wrong.concat([READS.find(x=>x[0]===rk)]).sort(()=>Math.random()-0.5);
 const q=$('#quiz');q.innerHTML='<div class="ph"><h3>판독 퀴즈</h3><span class="muted num">'+quizState.ok+' / '+quizState.n+' 정답</span></div><canvas id="qcv"></canvas><div class="qopts">'+opts.map(o=>'<button class="btn" data-quiz="'+o[0]+'" data-ans="'+rk+'">'+esc(o[1])+'</button>').join('')+'</div><p id="qfb" class="muted" style="margin-top:8px;font-size:13px"></p>';
 requestAnimationFrame(()=>{quizObj=mkStrip($('#qcv'),fakeP(k,{hr:k==='SB'?42:RH[k].hr}));});
}
function answerQuiz(btn){
 if(btn.closest('.qopts').dataset.done)return;btn.closest('.qopts').dataset.done=1;const ans=btn.dataset.ans,ok=btn.dataset.quiz===ans;quizState.n++;if(ok)quizState.ok++;
 document.querySelectorAll('[data-quiz]').forEach(b=>{if(b.dataset.quiz===ans)b.classList.add('right');else if(b===btn)b.classList.add('wrong');});
 const key=Object.keys(RH).find(k=>(({VTP:'VT'})[k]||k)===ans);$('#qfb').innerHTML=(ok?'<b style="color:var(--ok)">정답</b> — ':'<b style="color:var(--bad)">오답</b> — 정답은 '+esc(READ_NAME[ans])+'. ')+esc(RH[key].feat)+' <button class="btn sm" data-act="nextQuiz">다음 문제</button>';
}
function renderStats(){
 const list=store.get('cbl_cases_v1',[]);const el=$('#scr-stats');
 const n=list.length,avg=n?Math.round(list.reduce((a,x)=>a+x.score,0)/n):0,passN=list.filter(x=>x.mode==='test'&&x.pass).length,testN=list.filter(x=>x.mode==='test').length,succ=list.filter(x=>x.outcome==='success').length;
 let h='<div class="pick-head"><div><span class="label">이 브라우저에 저장된 기록</span><h2>기록·통계</h2></div>'+(n?'<button class="btn danger" data-act="clearStats">기록 지우기</button>':'')+'</div>';
 h+='<div class="stats-sum"><div class="dtile"><span class="l">수행한 케이스</span><span class="v">'+n+'</span></div><div class="dtile"><span class="l">평균 점수</span><span class="v">'+(n?avg:'—')+'</span></div><div class="dtile"><span class="l">안정화 성공</span><span class="v">'+(n?Math.round(succ/n*100)+'%':'—')+'</span></div><div class="dtile"><span class="l">평가 통과</span><span class="v">'+passN+'/'+testN+'</span></div></div>';
 if(!n)h+='<p class="muted">아직 기록이 없습니다. 케이스를 끝내면 결과가 여기에 쌓입니다. 기록은 이 브라우저에만 저장됩니다.</p>';
 else{h+='<canvas id="st-cv" style="width:100%;height:160px;display:block;margin-bottom:12px"></canvas><div class="tbl-wrap"><table class="score"><thead><tr><th>일시</th><th>방식</th><th>케이스</th><th>결과</th><th style="text-align:right">점수</th></tr></thead><tbody>'+list.slice().reverse().map(x=>'<tr><td class="num">'+new Date(x.d).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+'</td><td>'+({basic:'기초',adv:'심화',test:'평가'}[x.mode])+'</td><td>'+esc(x.name)+(x.instr?' <span class="chip inst">강사 개입</span>':'')+'</td><td>'+({success:'안정화',death:'사망',stopped:'미완료'}[x.outcome])+(x.mode==='test'?(x.pass?' · 통과':' · 불통과'):'')+'</td><td class="p">'+x.score+' ('+x.grade+')</td></tr>').join('')+'</tbody></table></div>';}
 el.innerHTML=h;
 if(n)requestAnimationFrame(()=>{const cv=$('#st-cv');const r=cv.getBoundingClientRect(),dpr=devicePixelRatio||1;cv.width=r.width*dpr;cv.height=r.height*dpr;const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);const W=r.width,H=r.height,pts=list.slice(-30);const X=i=>36+(W-46)*(pts.length<2?0.5:i/(pts.length-1)),Y=v=>10+(H-30)*(1-v/100);
  c.font='11px '+cssv('--f-mono');c.fillStyle=cssv('--muted');c.strokeStyle=cssv('--line');[0,50,80,100].forEach(v=>{c.beginPath();c.moveTo(36,Y(v));c.lineTo(W-10,Y(v));c.stroke();c.fillText(v,6,Y(v)+4);});
  c.strokeStyle=cssv('--team');c.lineWidth=2;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(X(i),Y(p.score)):c.moveTo(X(i),Y(p.score)));c.stroke();pts.forEach((p,i)=>{c.fillStyle=p.outcome==='success'?cssv('--team'):cssv('--bad');c.beginPath();c.arc(X(i),Y(p.score),i===pts.length-1?5:3,0,7);c.fill();});c.fillStyle=cssv('--muted');c.fillText('최근 '+pts.length+'회 점수 추이',36,H-6);});
}
function renderHelp(){
 $('#scr-help').innerHTML='<div class="pick-head"><div><span class="label">안내</span><h2>사용법</h2></div></div><div class="prose">'+
 '<h3>화면 구성</h3><ul><li><b>상단</b>: 경과 시간, 케이스, 압박 분율·현재 중단·2분 주기·에피네프린 간격, 알고리즘·일시정지·소리·강사 창 버튼.</li><li><b>왼쪽</b>: 병실 사진(팀원 위치, 부착 장비, 말풍선, 가슴압박 계수기), 그 아래 리더 행동(의식 확인, 코드블루, 호흡·맥박 사정, <b>압박 중지</b>, 모두 떨어지세요, 처치 재개, 리듬 판독, <b>ROSC 선언</b>), 팀원 카드, 처치·약물·검사·팀 조정 탭.</li><li><b>오른쪽</b>: 감시장치(ECG·맥파·카프노그래피·혈압), 제세동기·조율기, 목표·기록·검사·도움말 탭.</li></ul>'+
 '<h3>기본 흐름</h3><ol><li>환자를 불러 반응을 봅니다. 반응이 없으면 코드블루를 호출합니다(병실 벽의 전화를 눌러도 됩니다). 제세동기와 응급카트, 지원 인력 2명은 약 10초 뒤 도착합니다.</li><li>호흡·맥박 동시 사정을 시작하고 5–10초 사이에 <b>사정 종료</b>를 누릅니다. 맥박 위치는 경동맥과 대퇴동맥 중에서 고릅니다.</li><li>할 일을 누르면 쉬는 팀원 중 알맞은 사람이 맡습니다. 특정 팀원에게 시키려면 팀원 카드를 먼저 누릅니다. 여러 팀원이 동시에 일합니다.</li><li>리듬 확인(2분마다): <b>압박 중지</b>(또는 리듬 판독 → 압박 멈추고 확인) → 리듬 판독 기록 → 충격 리듬이면 충전 → <b>모두 떨어지세요</b> → 충격 → <b>처치 재개</b>. 충전은 압박 중에 미리 해두면 중단이 짧아집니다. 중단이 10초를 넘으면 경고가 울립니다.</li><li>기관내삽관은 준비하는 동안 압박을 계속하고, 마지막 삽입 단계(약 8초)에만 압박과 백마스크 환기를 멈춥니다. 성공하면 튜브 위치 확인 후 압박을 재개하고 6초마다 1회 환기합니다.</li><li><b>압박자 피로</b>: 한 사람이 오래 누르면 1–2분 뒤부터 깊이가 줄고 2분 30초를 넘기면 속도도 떨어집니다. 압박 계수기 아래 시간 막대와 경고를 보고 2분마다(리듬 확인 때) 압박자를 바꾸세요.</li><li>약물은 정맥로나 골내로가 있어야 하고, 혈액이 순환해야(맥박 또는 압박) 효과가 납니다.</li></ol>'+
 '<h3>ROSC 이후</h3><p>관류 리듬이 보이면 압박을 멈추고 호흡·맥박을 다시 사정해 맥박을 확인한 뒤 <b>ROSC 선언</b>을 누릅니다. 환기 담당 팀원을 고르면 환기 횟수와 FiO₂를 조절할 수 있습니다. SpO₂ 90–98%, EtCO₂ 35–45, 측정 MAP 65 이상, 12유도 심전도, 체온 조절(32–37.5 °C) 결정까지 마치고 30초 안정되면 케이스가 끝납니다. 저혈압을 오래 두면 다시 심정지가 올 수 있습니다.</p>'+
 '<h3>강사 창 (듀얼 모니터)</h3><p>상단 <b>강사 창 열기</b>를 누르면 강사 콘솔이 별도 창으로 열립니다(설치판은 보조 모니터에 자동 배치). 콘솔은 네 탭으로 되어 있습니다.</p><ul><li><b>진행 조종</b>: 실제 리듬·활력징후·팀 상태를 보며 ROSC 유도, 재정지, 술기 실패, 리듬·혈압·원인 변경. <b>돌발 상황</b>(정맥로 빠짐, 패드 떨어짐, 기관내관 빠짐, 충전 오류, 팀원 이탈, 보호자 등장, 약물 재고 없음)을 넣어 대처 능력을 훈련하고, 학생 화면에 <b>상황 알림</b>이나 <b>코칭 힌트</b>를 보냅니다. 진행 속도(0.5–3배)와 힌트 켜기·끄기도 여기서 바꿉니다.</li><li><b>관찰·평가</b>: 압박 분율, 중단 시간, 압박자 교대, 에피네프린 간격 같은 지표와 핵심 행동 체크리스트가 자동으로 기록됩니다. 장면마다 잘한 점(G)·개선점(B)을 표시하고, 리더십·의사소통 등 비기술적 역량을 1–5점으로 평가합니다.</li><li><b>디브리핑</b>: 케이스가 끝나면 점수 내역, 놓친 부분, 표시한 장면을 묶어 PEARLS 흐름(반응 → 기술 → 분석 → 요약)의 질문 안내를 자동으로 만듭니다. 학생 화면 디브리핑에도 강사 관찰이 함께 나옵니다.</li><li><b>수업 기록</b>: 팀(조) 이름을 붙여 결과를 남기고, 최근 기록을 엑셀로 붙여넣을 수 있게 복사합니다.</li></ul><p><b>마우스가 하나일 때</b> — 강사 창 단축키: R(ROSC)·V(VF)·P(PEA)·A(무수축)·F(술기 실패)는 두 번 눌러 실행, C(지원팀)·H(원인 교정)·Space(일시정지)·G/B(장면 표시)·1–4(탭). 설치판에서는 학생 화면이 선택돼 있어도 <b>Ctrl+Alt+같은 글자</b>로 바로 실행됩니다. 설치판의 <b>휴대폰 연결</b>을 켜면 같은 Wi-Fi의 휴대폰·태블릿에서 QR 코드로 강사 콘솔을 열어 손에 들고 조종할 수 있습니다.</p>'+
 '<h3>채점</h3><p>심정지 케이스는 초기 대응, 가슴압박 시작·분율·속도와 깊이·중단 관리, <b>압박자 교대(피로 관리)</b>, <b>기도·환기</b>(백마스크 시작, 환기 유지, 삽관 후 과환기·EtCO₂ 확인), 전기치료, 에피네프린, 항부정맥제 또는 원인 탐색, 리듬 판독, 약물 안전, 소생 후 목표로 채점합니다. 맥박이 있는 케이스는 감시장치, 정맥로, 판독, 1차 치료 시점(안정 빈맥은 약물·미주신경 자극 우선, 의식 있으면 진정 후 전기치료), 안전, 재평가, 악화 예방으로 채점합니다. 환자와 접촉한 상태의 충격, 맥박이 있는 환자에게 비동기 충격, 맥박이 있는 환자에게 에피네프린 1 mg 급속주입 같은 행동은 중대 오류입니다.</p>'+
 '<h3>단축키</h3><ul><li>Space: 일시정지 · Esc: 창 닫기 · H: 압박 중지 · A: 모두 떨어지세요 · C: 충전 · S: 충격 · R: 처치 재개</li><li>설치판: F11 전체 화면 · Ctrl +/− 확대·축소 · Ctrl 0 화면에 맞춤</li></ul>'+
 '<h3>알림</h3><p>교육용 시뮬레이션이며 실제 진료 지침, 의학적 판단, 공식 자격 과정을 대신하지 않습니다. 생리 반응과 확률은 학습을 위해 단순화했습니다. 기록은 이 브라우저에만 저장됩니다.</p></div>';
}

