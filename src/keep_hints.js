function labTable(l){const v=l.vals;const rows=[['pH',v.pH.toFixed(2),v.pH<7.35||v.pH>7.45],['PaCO₂',v.pCO2+' mmHg',v.pCO2>45||v.pCO2<35],['PaO₂',v.pO2+' mmHg',v.pO2<60],['HCO₃⁻',v.HCO3+' mEq/L',v.HCO3<22],['젖산',v.lac+' mmol/L',v.lac>2],['칼륨',v.K+' mEq/L',v.K>5.5||v.K<3.5],['나트륨',v.Na+' mEq/L',false],['마그네슘',v.Mg+' mg/dL',v.Mg<1.7],['혈당',v.Glu+' mg/dL',v.Glu<70],['혈색소',v.Hb+' g/dL',v.Hb<10]];
 return'<p class="label" style="margin-top:6px">'+fmt(l.req)+' 채혈</p><table>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="'+(r[2]?'hi':'')+'">'+r[1]+'</td></tr>').join('')+'</table>';}
function hints(){
 const P=S.P,out=[],arrest=!P.pulse,ns=S.shocks.filter(s=>s.arrest&&s.appropriate).length;
 if(S.conscAt==null)out.push('의식 확인부터 시작하세요. 반응이 없으면 바로 코드블루를 요청합니다.');
 if(S.codeBlue.status==='idle'&&(arrest||S.C.unstable))out.push('제세동기와 응급카트는 코드블루 팀이 가져옵니다.');
 if(!S.assessments.length&&S.conscAt!=null)out.push('호흡과 맥박을 동시에 5–10초 안에 확인하세요. 사정 종료를 직접 눌러야 기록됩니다.');
 if(arrest){
  if(!P.compressing&&!S.assess)out.push('가슴압박이 진행되고 있지 않습니다. 중단은 10초 안으로 줄이세요.');
  if(!P.pads&&S.cart)out.push('제세동 패드를 붙여 리듬을 확인하세요.');
  if(P.compressing&&!P.bvm)out.push('환기 담당자가 없습니다. 백마스크 환기(30:2)를 배정하세요.');
  if(RH[P.rhythm].shock&&P.pads)out.push('충격 리듬입니다. 압박 중에 충전하고, 모두 떨어진 뒤 충격, 곧바로 압박을 재개하세요.');
  if(!RH[P.rhythm].shock&&P.pads&&P.epiCirc<1)out.push('비충격 리듬에서는 에피네프린을 가능한 빨리 투여합니다.');
  if(RH[P.rhythm].shock&&ns>=2&&P.epiCirc<1)out.push('두 번째 제세동 뒤 에피네프린을 투여할 시점입니다.');
  if(RH[P.rhythm].shock&&ns>=3&&!P.antiarr)out.push('세 번의 제세동 후에도 지속되면 아미오다론 300 mg 또는 리도카인을 고려하세요.');
  if(P.access==='none')out.push('정맥로를 먼저 시도하고, 어려우면 골내로를 확보합니다.');
  if(P.rhythm==='PEA'&&P.cause&&!P.causeFixed)out.push('PEA에서는 가역적 원인을 찾으세요. 병력, 검사, 청진, 현장 초음파가 단서가 됩니다.');
  if(P.rhythm==='TDP'&&!P.mg)out.push('Torsades de Pointes에는 황산마그네슘을 투여합니다.');
  if(P.etco2Sensor&&P.etco2>30&&P.compressing)out.push('압박 중 EtCO₂가 갑자기 올랐습니다. ROSC를 의심하고 리듬과 맥박을 확인하세요.');
  if(S.cycleStart!=null&&P.compressing&&S.t-S.cycleStart>=120)out.push('2분이 지났습니다. 압박자를 교대하면서 리듬을 확인하세요.');
 } else {
  if(S.roscT!=null&&!S.roscConfirmed)out.push('관류 리듬이 보입니다. [압박 중지] 후 맥박을 확인하고, 맥박이 있으면 [ROSC 선언]을 누르세요.');
  if(S.roscConfirmed){if(P.spo2>98.4&&P.probe)out.push('SpO₂가 높습니다. FiO₂를 낮춰 90–98%로 맞추세요.');if(P.etco2Sensor&&(P.etco2<35||P.etco2>45))out.push('EtCO₂가 목표를 벗어났습니다. 환기 횟수를 10회/분 근처로 조정하세요.');if(P.sbp<90)out.push('ROSC 후 저혈압이 계속되면 다시 심정지가 올 수 있습니다. 수액이나 혈관수축제를 쓰세요.');if(!S.ecg12Done)out.push('12유도 심전도로 ST 상승을 확인하세요.');}
  if(!P.pads&&S.cart)out.push('패드를 붙이면 리듬 감시와 조율·심율동전환을 바로 할 수 있습니다.');
  if(!P.probe)out.push('맥박산소측정기를 부착하세요.');if(!P.cuff)out.push('혈압 커프를 감고 측정하세요.');
  if(P.access==='none')out.push('정맥로를 확보하세요.');
  if(['SB','AVB3'].includes(P.rhythm)&&!P.paceCapture){out.push(P.rhythm==='AVB3'?'3도 방실차단은 아트로핀 효과가 낮습니다. 경피 조율을 준비하세요.':'증상 있는 서맥에는 아트로핀 1 mg을 먼저 투여합니다.');if(P.pace.on)out.push('조율 전류를 10 mA씩 올려 포획을 확인하세요.');}
  if(P.rhythm==='SVT')out.push(P.sbp<90?'불안정한 SVT입니다. 동기화 심율동전환(100 J)을 준비하세요. 의식이 있으면 진정 후 시행합니다.':'미주신경 자극 후 아데노신 6 mg, 효과가 없으면 12 mg을 투여합니다.');
  if(P.rhythm==='AF')out.push(P.sbp<90?'불안정하면 동기화 심율동전환(200 J).':'안정한 심방세동은 딜티아젬이나 베타차단제로 심박수를 조절합니다.');
  if(P.rhythm==='VTP')out.push(P.sbp<90?'불안정한 VT는 동기화 심율동전환(100 J).':'안정한 VT에는 아미오다론 150 mg 10분 주입을 고려합니다.');
  if(S.treatedAt!=null&&!S.bpAfterTx)out.push('치료 후 혈압을 다시 측정하세요.');
 }
 if(!out.length)out.push('지금은 추가 조언이 없습니다. 환자 상태를 계속 관찰하세요.');
 return out;
}
function hintHTML(){const hs=hints();return hs.slice(0,4).map(h=>'<div class="hint">'+esc(h)+'</div>').join('');}

