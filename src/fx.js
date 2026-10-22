
/* ============ 음향·음성 ============ */
Object.assign(snd,{
 voiceOn:store.get('cbl_voice',true),noise:null,amb:null,
 nb(){if(!this.noise&&this.ctx){const c=this.ctx,b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=b;}return this.noise;},
 burst(dur,type,freq,q,gain,delay,f2){if(!this.on||!this.ctx)return;const c=this.ctx,n=c.currentTime+(delay||0),s=c.createBufferSource();s.buffer=this.nb();s.loop=true;const f=c.createBiquadFilter();f.type=type||'lowpass';f.frequency.setValueAtTime(freq||800,n);if(f2)f.frequency.linearRampToValueAtTime(f2,n+dur);f.Q.value=q||0.7;const g=c.createGain();g.gain.setValueAtTime(0.0001,n);g.gain.exponentialRampToValueAtTime(gain||0.05,n+Math.min(0.03,dur/3));g.gain.exponentialRampToValueAtTime(0.0001,n+dur);s.connect(f).connect(g).connect(c.destination);s.start(n);s.stop(n+dur+0.05);},
 at(f,d,v,type,delay,f2){if(!this.on||!this.ctx)return;const c=this.ctx,n=c.currentTime+(delay||0),o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,n);if(f2)o.frequency.exponentialRampToValueAtTime(f2,n+d);g.gain.setValueAtTime(0.0001,n);g.gain.exponentialRampToValueAtTime(v||0.05,n+0.012);g.gain.exponentialRampToValueAtTime(0.0001,n+d);o.connect(g).connect(c.destination);o.start(n);o.stop(n+d+0.05);},
 thud(depth){const v=0.05*clamp(depth||1,0.5,1.3);this.at(95,0.11,v,'sine',0,48);this.burst(0.05,'lowpass',700,0.8,0.018);},
 whoosh(){this.burst(0.75,'bandpass',900,0.6,0.045,0,1600);this.burst(0.5,'lowpass',500,0.7,0.02,0.75);},
 zap(){this.burst(0.09,'highpass',2400,0.5,0.22);this.at(130,0.32,0.16,'sawtooth',0,38);this.at(60,0.25,0.12,'sine',0.02,30);},
 alarmHigh(){[0,0.2,0.4,1.0,1.2].forEach(d=>this.at(960,0.13,0.045,'square',d));},
 alarmMed(){[0,0.3,0.6].forEach(d=>this.at(620,0.18,0.035,'triangle',d));},
 nibpSnd(){if(!this.on||!this.ctx)return;const c=this.ctx,n=c.currentTime,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(85,n);o.frequency.linearRampToValueAtTime(110,n+7);f.type='lowpass';f.frequency.value=420;g.gain.setValueAtTime(0.0001,n);g.gain.exponentialRampToValueAtTime(0.02,n+0.2);g.gain.setValueAtTime(0.02,n+7);g.gain.exponentialRampToValueAtTime(0.0001,n+7.3);o.connect(f).connect(g).connect(c.destination);o.start(n);o.stop(n+7.4);this.burst(1.6,'highpass',3000,0.5,0.03,7.4);},
 chime(){this.at(784,0.7,0.05,'sine',0);this.at(659,0.9,0.05,'sine',0.45);this.at(523,1.1,0.045,'sine',0.9);},
 ring(){[0,0.45].forEach(d=>this.at(425,0.35,0.03,'sine',d));},
 steps(n){for(let i=0;i<(n||8);i++){this.burst(0.07,'lowpass',380+Math.random()*120,0.9,0.03+Math.random()*0.02,i*0.31+Math.random()*0.04);}},
 cart(){this.burst(2.2,'lowpass',260,0.8,0.035,0.2);for(let i=0;i<7;i++)this.burst(0.03,'bandpass',2200,2,0.012,0.3+i*0.28+Math.random()*0.1);},
 peel(){this.burst(0.28,'highpass',1800,0.6,0.05,0,5000);},
 velcro(){for(let i=0;i<9;i++)this.burst(0.035,'bandpass',2600,1.2,0.035,i*0.045);},
 click2(){this.at(1600,0.03,0.025,'square');},
 ambientSync(want){if(!this.ctx)return;if(want&&this.on&&!this.amb){const c=this.ctx,s=c.createBufferSource();s.buffer=this.nb();s.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=320;const g=c.createGain();g.gain.value=0.018;const o=c.createOscillator();o.frequency.value=100;const og=c.createGain();og.gain.value=0.0025;s.connect(f).connect(g).connect(c.destination);o.connect(og).connect(c.destination);s.start();o.start();this.amb={s,o};}
  else if((!want||!this.on)&&this.amb){try{this.amb.s.stop();this.amb.o.stop();}catch(e){}this.amb=null;}},
 say(text,opt){if(!this.on||!this.voiceOn||!('speechSynthesis' in window))return;try{const ss=speechSynthesis;if(opt&&opt.urgent)ss.cancel();else if(ss.pending&&(this._q||0)>=2)return;const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';const vs=ss.getVoices().filter(v=>/^ko/i.test(v.lang));if(vs.length)u.voice=vs[(opt&&opt.vi||0)%vs.length];u.pitch=(opt&&opt.pitch)||1;u.rate=(opt&&opt.rate)||1.12;u.volume=(opt&&opt.vol)||0.95;this._q=(this._q||0)+1;u.onend=u.onerror=()=>{this._q=Math.max(0,(this._q||1)-1);};ss.speak(u);}catch(e){}}
});
const VOICE={하늘:{pitch:1.15,vi:0},도현:{pitch:0.78,vi:1},서진:{pitch:0.9,vi:1},민서:{pitch:1.02,vi:0},지우:{pitch:1.25,vi:0}};
const __log=log;
log=function(text,type){__log(text,type);try{fxFromLog(String(text),type);}catch(e){}};
function fxFromLog(t,type){
 if(!S||curScreen!=='sim')return;
 if(t.includes('패드 부착 완료'))snd.peel();
 if(t.includes('혈압 커프 부착'))snd.velcro();
 if(t.includes('정맥로 확보')||t.includes('골내로 확보'))snd.click2();
 if(t.startsWith('코드블루 팀 도착')){snd.steps(9);snd.cart();}
 const m=S.members.find(x=>t.startsWith(x.name+': '));
 if(m&&(type==='comm'||type==='act'||type==='dev'||type==='warn')){let s=t.slice(m.name.length+2).replace(/["“”]/g,'');s=s.split(' — ')[0].split('. ')[0].replace(/\.$/,'');if(s.length>38)s=s.slice(0,38);snd.say(s,Object.assign({rate:1.18},VOICE[m.name]||{}));}
}
const __clearAll=clearAll;clearAll=function(){__clearAll();snd.say('모두 떨어지세요!',{urgent:false,pitch:0.85,rate:1.05,vi:1});};
const __charge=charge;charge=function(){const was=S.def.state;__charge();if(was==='idle'&&S.def.state==='charging')snd.say('충전 중입니다',{pitch:0.6,rate:1.0,vi:1});};
const __pressShock=pressShock;pressShock=function(){__pressShock();};
const __deliverShock=deliverShock;deliverShock=function(sync){snd.zap();__deliverShock(sync);setTimeout(()=>snd.say('쇼크가 전달되었습니다',{pitch:0.6,rate:1.0,vi:1}),450);};
const __codeBlue=codeBlue;codeBlue=function(){const was=S.codeBlue.status;__codeBlue();if(was==='idle'&&S.codeBlue.status!=='idle'){snd.ring();setTimeout(()=>{snd.chime();setTimeout(()=>snd.say('코드블루, 코드블루. 7병동 3호실. 코드블루.',{pitch:1.0,rate:1.0,vol:0.9}),1500);},900);}};
const __nibp=nibpMeasure;nibpMeasure=function(auto){const was=S.nibp.busy;__nibp(auto);if(!was&&S.nibp.busy)snd.nibpSnd();};
Engine.prototype.advance=function(t){
 for(const e of this.ev){if(!e.seen&&e.t<=t){e.seen=true;
  if(e.k==='vent'){this.lastVent=e.t;if(this.onVent)this.onVent(e);}
  else if(e.k==='comp'){if(this.onComp)this.onComp(e);}
  else if(e.perf&&QRSK[e.k]&&this.onBeat)this.onBeat(e);}}
};
let alarmT={hi:-99,med:-99};
function fxTick(){
 if(!S||curScreen!=='sim')return;
 const P=S.P,run=!S.paused&&!S.ended;
 snd.ambientSync(run);
 if(!S.eng.onComp){S.eng.onComp=(e)=>{if(!S.paused)snd.thud(e.a);};S.eng.onVent=()=>{if(!S.paused&&S.P.bvm)snd.whoosh();};}
 if(!run)return;
 const muted=S.t<(S.alarmMute||0);
 const hi=P.pads&&['VF','PVT','TDP','ASY'].includes(P.rhythm);
 const med=(P.probe&&P.pulse&&P.spo2<88)||(P.pads&&P.pulse&&(P.hr<45||P.hr>150));
 if(!muted&&hi&&S.t-alarmT.hi>6){alarmT.hi=S.t;snd.alarmHigh();}
 else if(!muted&&!hi&&med&&S.t-alarmT.med>10){alarmT.med=S.t;snd.alarmMed();}
 const d=S.def;if(d.state==='charged'&&!d._said){d._said=true;snd.say('충전 완료. 쇼크 버튼을 누르세요.',{pitch:0.6,rate:1.05,vi:1});}if(d.state!=='charged')d._said=false;
 const mb=$('#b-mute');if(mb){mb.classList.toggle('on',muted);mb.textContent=muted?'알람 무음 '+Math.ceil((S.alarmMute-S.t))+'초':'알람 무음';}
}
