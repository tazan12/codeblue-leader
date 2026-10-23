/* ============ 실음성(TTS 녹음) · 제세동기 음향 · 역동적 연출 ============ */
const VXMAP={하늘:['F1',1.0],지우:['F1',1.07],민서:['F2',1.0],도현:['M1',1.0],서진:['M2',0.98]};
const VX={buf:{},q:[],cur:null,rev:null};
function vxHas(set,key){return typeof VOXDATA!=='undefined'&&VOXDATA[set]&&VOXDATA[set][key];}
async function vxBuffer(set,key){const id=set+'/'+key;if(VX.buf[id])return VX.buf[id];if(!vxHas(set,key)||!snd.ctx)return null;
 const s=atob(VOXDATA[set][key]),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);
 try{VX.buf[id]=await snd.ctx.decodeAudioData(a.buffer);}catch(e){VX.buf[id]=null;}return VX.buf[id];}
function vxReverb(){if(VX.rev||!snd.ctx)return VX.rev;const c=snd.ctx,len=Math.floor(c.sampleRate*0.9),b=c.createBuffer(2,len,c.sampleRate);
 for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
 const cv=c.createConvolver();cv.buffer=b;const g=c.createGain();g.gain.value=0.16;cv.connect(g).connect(c.destination);VX.rev=cv;return cv;}
async function vxPlayNow(it){const b=await vxBuffer(it.set,it.key);if(!b){VX.cur=null;if(it.fb)snd._say0(it.fb,it.fbo||{});vxNext();return;}
 const c=snd.ctx,src=c.createBufferSource();src.buffer=b;src.playbackRate.value=it.rate||1;
 const g=c.createGain();g.gain.value=(it.vol||1)*0.95;let node=src;
 if(it.pa){const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=320;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3400;const ws=c.createWaveShaper();const k=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;k[i]=Math.tanh(2.2*x)/Math.tanh(2.2);}ws.curve=k;node.connect(hp);hp.connect(lp);lp.connect(ws);node=ws;g.gain.value*=0.8;}
 node.connect(g);g.connect(c.destination);const rv=vxReverb();if(rv){const sg=c.createGain();sg.gain.value=it.pa?0.9:0.35;g.connect(sg);sg.connect(rv);}
 VX.cur={src,it};src.onended=()=>{if(VX.cur&&VX.cur.src===src){VX.cur=null;setTimeout(vxNext,120);}};src.start();}
function vxNext(){if(VX.cur||!VX.q.length)return;vxPlayNow(VX.q.shift());}
function vsay(set,key,o){o=o||{};if(!snd.on||!snd.voiceOn)return;if(!snd.ctx)snd.init&&snd.init();if(!snd.ctx)return;
 if(!vxHas(set,key)){if(o.fb)snd._say0(o.fb,o.fbo||{});return;}
 const it={set,key,rate:o.rate,vol:o.vol,pa:o.pa,fb:o.fb,fbo:o.fbo};
 if(o.urgent){VX.q=VX.q.filter(x=>x.urgent);if(VX.cur){try{VX.cur.src.stop();}catch(e){}VX.cur=null;}VX.q.unshift(Object.assign(it,{urgent:true}));vxNext();return;}
 if(VX.q.length>=3)VX.q.shift();VX.q.push(it);vxNext();}
const LASTSAY={};
function msay(name,key,fb){const now=performance.now();if(key==='done'&&LASTSAY[name]&&now-LASTSAY[name]<4500)return;LASTSAY[name]=now;const v=VXMAP[name]||['F1',1];vsay(v[0],key,{rate:v[1],fb,fbo:Object.assign({rate:1.18},(typeof VOICE!=='undefined'&&VOICE[name])||{})});}
// 기존 합성 음성은 보조(fallback)로만 사용
snd._say0=(function(f){return function(t,o){if(!t)return;return f(t,o||{});};})(snd.say.bind(snd));
const SAY_CLIP={'모두 떨어지세요!':['leader','clear',{urgent:true}],'충전 중입니다':['device','charging',{}],'충전 완료. 쇼크 버튼을 누르세요.':['device','charged',{}],'쇼크가 전달되었습니다':['device','shocked',{urgent:true}],'코드블루, 코드블루. 7병동 3호실. 코드블루.':['page','codeblue',{pa:true}]};
snd.say=function(text,opt){const m=SAY_CLIP[text];if(m){vsay(m[0],m[1],Object.assign({fb:text,fbo:opt},m[2]));return;}this._say0(text,opt);};

// 로그 문장 → 음성 클립 키
function taskAckKey(what){for(const k in TASKS){if(TASKS[k].label.replace('…','')===what)return 'ack_'+k;}for(const f in FORM){if(FORM[f].dname+' '+FORM[f].label===what)return 'dack_'+f;}return 'ok';}
function drugGoKey(s){let best=null;for(const f in FORM){const p=FORM[f].dname+' '+FORM[f].label;if(s.startsWith(p)&&(!best||p.length>best[1]))best=[f,p.length];}return best?'dgo_'+best[0]:null;}
const LINE_KEYS=[['가슴압박 시작합니다','cpr_go'],['백마스크 환기 시작 (기관내관','bvm_ett'],['백마스크 환기 시작','bvm_go'],['제세동 패드 부착 완료','pads_ok'],['맥박산소측정기 부착','spo2_ok'],['혈압 커프 부착','cuff_ok'],['EtCO₂ 센서 연결','etco2_ok'],['18G 정맥로 확보','iv_ok'],['경골 골내로 확보','io_ok'],['기관내삽관 완료','ett_ok'],['삽관 실패','ett_fail'],['정맥로 실패','iv_fail'],['자발호흡이 없어','nrb_warn'],['비재호흡 마스크 15 L 적용','nrb_ok'],['채혈 완료','lab_ok'],['12유도 심전도','ecg12_ok'],['청진 —','auscult_ok'],['현장 초음파','pocus_ok'],['공기가 빠져나옵니다','needle_ok'],['공기 배출 없음','needle_no'],['혈성 삼출액','peri_ok'],['삼출액이 나오지 않습니다','peri_no'],['변형 발살바','vagal_ok'],['지쳐서','tired'],['완료했습니다','done']];
fxFromLog=function(t,type){
 if(!S||curScreen!=='sim')return;
 if(t.includes('패드 부착 완료'))snd.peel();
 if(t.includes('혈압 커프 부착'))snd.velcro();
 if(t.includes('정맥로 확보')||t.includes('골내로 확보'))snd.click2();
 if(t.startsWith('코드블루 팀 도착')){snd.steps(9);snd.cart();setTimeout(()=>msay('민서','arrive','코드블루 팀 도착했습니다'),2600);return;}
 if(t.startsWith('리더: 환자 어깨를')){vsay('leader','consc',{fb:'괜찮으세요? 눈 떠 보세요!'});return;}
 if(t.startsWith('리더: 호흡·맥박 동시 사정')){vsay('leader','assess',{});return;}
 if(t.startsWith('리더: "처치 재개하세요')){vsay('leader','resume',{fb:'처치 재개하세요'});return;}
 if(t.startsWith('리더 → ')){const rest=t.slice(5),nm=rest.split(':')[0];const m=S.members.find(x=>x.name===nm);if(!m)return;
  if(rest.includes(' 중지'))setTimeout(()=>msay(nm,'stop','네, 중지하겠습니다'),500);
  else if(rest.includes('속도 110'))setTimeout(()=>msay(nm,'feedback_ok','네'),400);
  return;}
 const sw=t.match(/^(\S+) → (\S+): 가슴압박 교대/);if(sw){msay(sw[2],'swap','교대하겠습니다');return;}
 const m=S.members.find(x=>t.startsWith(x.name+': '));if(!m)return;
 let s=t.slice(m.name.length+2).trim();
 if(type==='drug'){const k=drugGoKey(s);if(k)msay(m.name,k,s.split(' (')[0]+' 들어갔습니다');return;}
 if(!['comm','act','dev','warn'].includes(type))return;
 const ack=s.match(/^"(.+), 하겠습니다\."$/);if(ack){msay(m.name,taskAckKey(ack[1]),ack[1]+' 하겠습니다');return;}
 for(const [p,k] of LINE_KEYS){if(s.includes(p)){msay(m.name,k,s.replace(/["“”]/g,'').split(' — ')[0].slice(0,38));return;}}
};

/* ---------- 제세동기 음향 ---------- */
Object.assign(snd,{
 chargeWhine(dur){if(!this.on||!this.ctx)return;this.stopWhine();const c=this.ctx,n=c.currentTime,o=c.createOscillator(),o2=c.createOscillator(),bp=c.createBiquadFilter(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();
  o.type='sawtooth';o2.type='sine';o.frequency.setValueAtTime(420,n);o.frequency.exponentialRampToValueAtTime(3300,n+dur);o2.frequency.setValueAtTime(840,n);o2.frequency.exponentialRampToValueAtTime(6600,n+dur);
  bp.type='bandpass';bp.Q.value=3.5;bp.frequency.setValueAtTime(700,n);bp.frequency.exponentialRampToValueAtTime(4200,n+dur);
  lfo.frequency.value=11;lg.gain.value=18;lfo.connect(lg);lg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001,n);g.gain.exponentialRampToValueAtTime(0.03,n+0.25);g.gain.setValueAtTime(0.03,n+dur-0.1);g.gain.exponentialRampToValueAtTime(0.012,n+dur);
  const g2=c.createGain();g2.gain.value=0.25;o.connect(bp);o2.connect(g2);g2.connect(bp);bp.connect(g).connect(c.destination);
  o.start(n);o2.start(n);lfo.start(n);const end=n+dur+0.05;o.stop(end);o2.stop(end);lfo.stop(end);this._whine={o,o2,lfo,g};},
 stopWhine(){if(this._whine&&this.ctx){const w=this._whine,n=this.ctx.currentTime;try{w.g.gain.cancelScheduledValues(n);w.g.gain.setValueAtTime(w.g.gain.value,n);w.g.gain.exponentialRampToValueAtTime(0.0001,n+0.08);w.o.stop(n+0.1);w.o2.stop(n+0.1);w.lfo.stop(n+0.1);}catch(e){}}this._whine=null;},
 readyBeep(){this.at(1046,0.11,0.045,'square',0);this.at(1318,0.11,0.045,'square',0.16);},
 shockFx(){if(!this.on||!this.ctx)return;this.stopWhine();
  this.at(2200,0.012,0.08,'square',0);this.burst(0.02,'highpass',3500,0.7,0.25,0.005);   // 릴레이
  this.burst(0.09,'bandpass',2600,0.8,0.32,0.012);this.burst(0.18,'lowpass',900,0.7,0.18,0.02); // 방전
  this.at(72,0.42,0.32,'sine',0.015,32);this.at(140,0.18,0.12,'triangle',0.02,60);           // 쿵
  this.burst(0.35,'lowpass',260,0.8,0.12,0.06);this.at(980,0.06,0.03,'sine',0.55);},
 disarmFx(){this.stopWhine();this.at(1300,0.42,0.04,'sine',0,180);this.burst(0.25,'lowpass',500,0.6,0.03,0.05);},
 knob(){this.at(1800,0.025,0.03,'square');this.at(900,0.02,0.02,'square',0.03);},
 syncBeep(){this.at(1500,0.05,0.035,'sine');this.at(1500,0.05,0.035,'sine',0.12);},
 qrsBeep(sp){const f=clamp(380+((sp||97)-80)*22,330,850);this.at(f,0.07,0.022,'sine');}
});
snd.charge=function(){this.chargeWhine(5);};
deliverShock=(function(orig){return function(sync){snd.shockFx();__deliverShock(sync);setTimeout(()=>vsay('device','shocked',{fb:'쇼크가 전달되었습니다'}),650);};})();
const __disarm2=disarm;disarm=function(){const was=S&&S.def.state;__disarm2();if(was&&was!=='idle'){snd.disarmFx();vsay('device','disarm',{});}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="en"],[data-act="sync"],[data-act="pr"],[data-act="pm"]');if(b&&S){snd.init&&snd.init();if(b.dataset.act==='sync')snd.syncBeep();else snd.knob();}},true);

/* ---------- 역동적 연출: 압박·환기 이벤트 동기 애니메이션 ---------- */
let cprHud={n:0,v:0,lastComp:-9,lastVent:-9,depth:0};
function anim(el,frames,ms){if(!el||!el.animate)return;try{el.animate(frames,{duration:ms,easing:'linear'});}catch(e){}}
function fxPush(e){const P=S.P,a=clamp(e.a||1,0.4,1.3),iv=60/clamp(P.compRate||110,60,170),ms=Math.max(260,Math.min(520,iv*920));
 anim($('#pt-cpr'),[{transform:'translateY(0) scaleY(1)'},{transform:'translateY('+(1.6+2.4*a).toFixed(2)+'%) scaleY('+(1-0.035*a).toFixed(3)+')',offset:0.4,easing:'ease-in'},{transform:'translateY(0) scaleY(1)',easing:'cubic-bezier(.2,.7,.3,1)'}],ms);
 anim($('#cg'),[{transform:'none'},{transform:'scale('+(1-0.018*a).toFixed(3)+','+(1-0.075*a).toFixed(3)+')',offset:0.42},{transform:'none'}],ms);
 anim($('#scene'),[{transform:'none'},{transform:'translateY('+(0.32*a).toFixed(2)+'%)',offset:0.42},{transform:'none'}],ms);
 const pf=$('#pressfx');anim(pf,[{opacity:0.95,transform:'translate(-50%,-50%) scale(.55)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.35)'}],ms+120);
 const now=S.t;if(now-cprHud.lastVent<0.6&&cprHud.v>=2){}
 if(cprHud.v>0&&now-cprHud.lastVent>0.4){cprHud.n=0;cprHud.v=0;}
 cprHud.n++;cprHud.lastComp=now;cprHud.depth=(S.P.compDepth||5.5)*(0.95+0.05*a);hudUpdate(true);}
function fxBreath(e){const P=S.P,d=Math.max(0.8,Math.min(2.2,(e.d||1.2)))*1000;
 if(P.bvm||P.airway==='ett'){snd.whoosh();anim($('#pt-bag'),[{transform:'none',filter:'none'},{transform:'scaleX(.86) scaleY(.965)',filter:'brightness(1.08)',offset:0.35},{transform:'none',filter:'none'}],Math.min(1100,d));
  anim($('#cg'),[{transform:'none'},{transform:'scale(1.022,1.07)',offset:0.5},{transform:'none'}],d);
  const r=$('#rise');anim(r,[{opacity:0,transform:'scale(.96)'},{opacity:1,transform:'scale(1.05)',offset:0.5},{opacity:0,transform:'scale(.96)'}],d);
  if(P.compressing&&P.airway!=='ett'){cprHud.v++;cprHud.lastVent=S.t;hudUpdate(false);}}}
function hudUpdate(pop){const h=$('#cprhud');if(!h||!S)return;const P=S.P,ett=P.airway==='ett';
 const vMode=!ett&&cprHud.v>0&&S.t-cprHud.lastVent<2.2;
 h.classList.toggle('vent',vMode);
 $('#ch-n').textContent=vMode?('환기 '+cprHud.v):String(cprHud.n);
 $('#ch-of').textContent=vMode?'/ 2':(ett?'연속':'/ 30');
 const dep=cprHud.depth||0;$('#ch-d').style.height=clamp(dep/7*100,0,100)+'%';
 const okD=dep>=5&&dep<=6.2,okR=P.compRate>=100&&P.compRate<=120;h.classList.toggle('bad',!vMode&&(!okD||!okR));
 $('#ch-m').textContent=Math.round(P.compRate||0)+'/분 · '+dep.toFixed(1)+' cm';
 const cm=S.members.find(m=>m.task==='cpr'&&!m.paused&&m.prog>=m.prep),fe=$('#ch-f');if(fe){if(cm&&!vMode){const ft=cm.cprT||0,lv=(cm.depth<5&&(cm.fat||0)>=90)?'bad':ft>=110?'warn':'';fe.className='ch-f '+lv;fe.innerHTML='<span>'+esc(cm.name)+' '+fmt(ft)+'</span><i style="width:'+clamp(ft/120*100,0,100)+'%"></i>'+(lv==='bad'?'<em>피로 — 교대</em>':lv==='warn'?'<em>교대 준비</em>':'');}else fe.innerHTML='';}
 if(pop&&!vMode){const n=$('#ch-n');anim(n,[{transform:'scale(1.28)'},{transform:'scale(1)'}],180);}}
function ensureHud(){const st=$('#stage');if(!st||$('#cprhud'))return;const d=document.createElement('div');d.className='cprhud';d.id='cprhud';
 d.innerHTML='<div class="ch-top"><span class="ch-lab">가슴압박</span></div><div class="ch-row"><b id="ch-n">0</b><span id="ch-of">/ 30</span></div><div class="ch-gauge"><i id="ch-d"></i><em title="목표 5–6 cm"></em></div><div class="ch-m" id="ch-m">— /분</div><div class="ch-f" id="ch-f"></div>';st.appendChild(d);}
const __fxTick2=fxTick;
fxTick=function(){__fxTick2();if(!S||curScreen!=='sim')return;const P=S.P;
 if(!S.eng._fx2){S.eng._fx2=true;S.eng.onComp=(e)=>{if(!S.paused){snd.thud(e.a);try{fxPush(e);}catch(x){}}};S.eng.onVent=(e)=>{if(!S.paused){try{fxBreath(e);}catch(x){}}};
  S.eng.onBeat=(e)=>{if(S.paused||!snd.on)return;const P=S.P;if((P.pads||P.probe)&&P.pulse){snd.qrsBeep(P.probe?P.spo2:97);const m=$('#mn-hr .v');if(m)anim(m,[{textShadow:'0 0 14px currentColor',transform:'scale(1.06)'},{textShadow:'0 0 0 transparent',transform:'scale(1)'}],220);}};}
 ensureHud();const h=$('#cprhud');if(h){const show=P.compressing||(S.t-cprHud.lastVent<2.2&&cprHud.v>0);h.classList.toggle('on',show);if(!P.compressing&&S.t-cprHud.lastComp>3){cprHud.n=0;cprHud.v=0;}}
 const d=S.def;if(d.state==='charged'&&!S.paused){const now=performance.now();if(!d._rb||now-d._rb>900){d._rb=now;snd.readyBeep();}}
};
const __cb2=codeBlue;codeBlue=function(){const was=S.codeBlue.status;__cb2();if(was==='idle'&&S.codeBlue.status!=='idle')vsay('leader','call',{urgent:true});};
const __charge2=charge;charge=function(){if(S&&!S.P.pads)vsay('device','nopads',{});__charge2();};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="sync"]');if(b&&S)setTimeout(()=>{if(S.def.sync)vsay('device','sync',{});},0);});

/* ---- 압박자 크기 보정(손 위치 고정, 0.82배) + 기관내관 환기 시 얼굴이 움직이지 않게 ---- */
(function(){const c=IMG.patch&&IMG.patch.cpr;if(c&&!c._scaled){const s=0.82,hx=45.19,hy=47.3,rx=(hx-c.x)/c.w,hTot=61.013,ry=(hy-c.y)/hTot;
 c.w=+(c.w*s).toFixed(3);c.x=+(hx-rx*c.w).toFixed(3);c.y=+(hy-ry*hTot*s+1).toFixed(3);c._scaled=true;}})();
