/* ============ 압박자 피로 모델 ============
   근거: 압박 1~2분 이후 깊이가 눈에 띄게 줄고, 압박자 본인은 피로를 잘 자각하지 못함 →
   가이드라인은 2분마다(리듬 확인 때) 압박자 교대를 권고. 여기서는
   · 75초부터 깊이 서서히 감소, 120초 이후 가속, 150초 이후 속도도 느려짐
   · 쉬면(다른 역할·대기) 피로가 회복됨 → 2분 교대를 지키면 품질 유지
   · 경고: 압박 HUD 피로 표시, 2분 교대 알림, 깊이 저하 경보, 팀원 대사
   · 평가: '압박 속도·깊이'(자동 반영) + '압박자 교대(피로 관리)' 항목 */
function cprFatigue(m,dt){
 dt=dt||0;const f=m.fat||0;
 if(m.depth0==null)m.depth0=5.5;if(m.rate0==null)m.rate0=m.rate;
 const k=S.adv?1:0.85;
 let loss=f<75?0:(f-75)/60*0.3;if(f>120)loss+=0.32*Math.pow((f-120)/60,1.4);loss*=k;
 m.boost=Math.max(0,(m.boost||0)-dt*0.03);
 m.depth=clamp(m.depth0-loss+m.boost,3.4,6.3);
 m.rate=Math.round(m.rate0-(f>150?Math.min(14,(f-150)/60*6):0));
 if(!dt)return;
 // 경고 단계 (스틴트별 1회)
 const hintMode=S.mode!=='test';
 if(m.cprT>=110&&!(m.fw&1)){m.fw|=1;if(hintMode){fatBanner('교대 준비','압박 '+fmt(m.cprT)+' — 다음 리듬 확인 때 압박자를 바꾸세요','warn');}}
 if(m.depth<5&&f>=90&&!(m.fw&2)){m.fw|=2;log(m.name+': "팔에 힘이 빠집니다… 교대해 주세요!"','comm');
  if(hintMode){fatBanner('압박 깊이 저하','피로로 깊이가 '+m.depth.toFixed(1)+' cm까지 떨어졌습니다 — 즉시 교대','bad');snd.alarmMed&&snd.alarmMed();}
  S.fatLog.push({t:S.t,text:m.name+' 피로로 깊이 5 cm 미만'});}
 if(m.cprT>=150&&!(m.fw&4)){m.fw|=4;S.fatOver++;caution('압박자 교대 지연: '+m.name+' 2분 30초 넘게 연속 압박');}
 if(m.cprT>=210&&!(m.fw&8)){m.fw|=8;log(m.name+': "더는 깊이를 유지 못 하겠습니다!"','comm');if(hintMode)fatBanner('교대 지연 3분 30초','압박 품질이 크게 떨어졌습니다','bad');}
}
function fatBanner(k,t,lv){const st=$('#stage');if(!st)return;let b=$('#fatban');if(!b){b=document.createElement('div');b.id='fatban';b.className='fatban';st.appendChild(b);}
 b.className='fatban '+(lv||'warn');setHTML(b,'<b>'+esc(k)+'</b><span>'+esc(t)+'</span>');void b.offsetWidth;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),5200);}
// 시작 시 상태
const __startCaseFat=startCase;
startCase=function(){const r=__startCaseFat.apply(this,arguments);if(S){S.fatOver=0;S.fatLow=0;S.fatLog=[];S.members.forEach(m=>{m.fat=0;});}return r;};
// 매 틱: 휴식 회복 + 저품질 시간 누적 + 깊이 갱신
const __tickFat=tick;
tick=function(dt){
 if(S&&!S.ended){if(S.fatLog==null){S.fatOver=0;S.fatLow=0;S.fatLog=[];}
  for(const m of S.members){const active=m.task==='cpr'&&!m.paused&&m.prog>=m.prep;
   if(active){m.fat=(m.fat||0)+dt;cprFatigue(m,dt);}else if(m.fat>0)m.fat=Math.max(0,m.fat-dt*0.8);}}
 __tickFat(dt);
 if(S&&!S.ended&&S.P.compressing){const c=S.members.find(m=>m.task==='cpr'&&!m.paused&&m.prog>=m.prep);if(c&&c.depth<5&&(c.fat||0)>=90&&c.cprT>=125)S.fatLow+=dt;}
};
// 압박 배정: 새 스틴트 → 경고 초기화, 남은 피로 반영
const __assignFat=assign;
assign=function(m,key){const r=__assignFat.apply(this,arguments);if(key==='cpr'&&m.task==='cpr'){m.fw=0;m.depth0=S.adv?(m.depth0f||(m.depth0f=rnd(5.0,5.8))):5.5;if(m.rate0==null)m.rate0=m.rate;m.boost=0;cprFatigue(m,0);}return r;};
if(window.CB){CB.tick=tick;CB.startCase=startCase;}
