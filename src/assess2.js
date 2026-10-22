/* ============ 호흡·맥박 사정 결과 카드 ============
   사정 종료 시 병실 화면에 맥박·호흡 결과를 크게 보여 줍니다(평가 모드는 다음 행동 안내 없이 결과만). */
function assessCard(a,site){const st=$('#stage');if(!st||!a)return;let c=$('#asscard');if(!c){c=document.createElement('div');c.id='asscard';st.appendChild(c);}
 const P=S.P,hint=S.mode!=='test';let body,next='',cls;
 if(!a.valid){cls='na';body='<div class="ac-row"><span class="ac-k">판단 불가</span><span class="ac-v">'+a.d.toFixed(1)+'초 — 너무 짧습니다</span></div>';next='5–10초 동안 호흡과 맥박을 함께 확인하세요.';}
 else{
  const pulseOk=a.pulse,br=a.breathing;
  const brTxt=br==='normal'?'정상 호흡':br==='agonal'?'비정상(헐떡임)':'호흡 없음',brCls=br==='normal'?'ok':'bad';
  body='<div class="ac-row"><span class="ac-k">맥박</span><span class="ac-v '+(pulseOk?'ok':'bad')+'">'+(pulseOk?'있음':'없음')+'</span></div><div class="ac-row"><span class="ac-k">호흡</span><span class="ac-v '+brCls+'">'+brTxt+'</span></div>';
  cls=!pulseOk?'arrest':br==='normal'?'stable':'resp';
  if(!pulseOk)next=S.P.compressing||compNow()?'맥박 없음 — 즉시 압박 재개, 2분 뒤 리듬 확인':'심정지 — 즉시 가슴압박을 시작하고 제세동기 패드를 붙이세요.';
  else if(br!=='normal')next='맥박은 있으나 호흡이 비정상 — 백마스크로 6초마다 1회 환기, 2분마다 맥박 재확인'+(S.roscT!=null?' · 조직화된 리듬이면 ROSC 선언':'');
  else next=S.roscT!=null&&!S.roscConfirmed?'맥박·호흡 있음 — 조직화된 리듬이면 [ROSC 선언]':'맥박·호흡 있음 — 감시장치 연결, 활력징후·원인 평가';
 }
 setHTML(c,'<div class="ac-h"><b>호흡·맥박 확인</b><span>'+esc(site||'')+' · '+a.d.toFixed(1)+'초'+(a.d>10?' (10초 초과)':'')+'</span></div>'+body+(hint&&next?'<div class="ac-next">'+esc(next)+'</div>':''));
 c.className='asscard '+cls;void c.offsetWidth;c.classList.add('on');clearTimeout(c._t);c._t=setTimeout(()=>c.classList.remove('on'),hint?6500:4500);
 if(a.valid&&snd.on){try{snd.tone(a.pulse?880:330,0.12,0.04,'sine');setTimeout(()=>snd.tone(a.pulse?1100:260,0.14,0.04,'sine'),140);}catch(e){}}
}
endAssess=(function(orig){return function(auto){const site=S&&S.assess?S.assess.site:'';const n=S?S.assessments.length:0;orig.apply(this,arguments);
 if(S&&S.assessments.length>n){const a=S.assessments[S.assessments.length-1];assessCard(a,site);}};})(endAssess);
