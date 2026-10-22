/* ============ 알고리즘 요약: 흐름도 (algo2.js) ============
   core.js의 ALGO 배열 항목을 제자리에서 수정합니다.
   - 각 탭 앞에 인라인 SVG 흐름도를 붙이고 기존 설명은 아래에 둡니다.
   - 기존 문구 중 2025 지침 수치와 어긋나는 부분을 문자열 치환으로 바로잡습니다. */
(function(){
 if(typeof ALGO==='undefined'||!Array.isArray(ALGO))return;

 /* ---------- 기존 문구 보정 ---------- */
 const FIX=[
  ['첫 대응','깊이 약 5 cm(6 cm 넘지 않게)','깊이 5–6 cm'],
  ['충격 리듬','이 무렵 <b>에피네프린 1 mg</b>, 이후 3–5분마다.','두 번째 제세동 뒤 <b>에피네프린 1 mg</b>, 이후 3–5분마다.'],
  ['충격 리듬','또는 <b>리도카인 1–1.5 mg/kg</b>.','또는 <b>리도카인 1–1.5 mg/kg</b>(추가 0.5–0.75 mg/kg).'],
  ['빈맥','좁고 규칙적 50–100 J, 심방세동 120–200 J, 넓고 규칙적 100 J.','좁고 규칙적(SVT) 100 J, 심방세동·심방조동 200 J, 넓고 규칙적(단형 심실빈맥) 100 J. 가능하면 진정 후 시행합니다.'],
  ['ROSC 이후','SpO₂ <b>92–98%</b>','SpO₂ <b>90–98%</b>'],
  ['ROSC 이후','EtCO₂ <b>35–45 mmHg</b>.','EtCO₂ <b>35–45 mmHg</b>(PaCO₂ 35–45 mmHg).'],
  ['ROSC 이후','<b>12유도 심전도</b>로 ST 상승을 확인하고 관상동맥 중재를 고려합니다.','<b>12유도 심전도</b>로 ST 상승을 확인하고, ST 상승이면 <b>응급 관상동맥 조영술</b>을 시행합니다.'],
  ['ROSC 이후','지시에 따르지 않으면 <b>목표체온 조절</b>을 결정합니다.','지시에 따르지 않으면 <b>체온 조절</b>: 32–37.5 °C를 최소 36시간 유지하고 발열을 예방합니다.']
 ];
 const idx=t=>ALGO.findIndex(a=>a[0]===t);
 FIX.forEach(([t,a,b])=>{const i=idx(t);if(i<0)return;if(ALGO[i][1].indexOf(a)>=0)ALGO[i][1]=ALGO[i][1].split(a).join(b);});

 /* ---------- SVG 흐름도 빌더 ---------- */
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const TYPES={start:'시작·상태',act:'처치·평가',dec:'판단',drug:'약물',shock:'전기치료',ok:'회복·확인',note:'참고'};
 // 노드 접점
 const T=n=>[n.x,n.y-n.h/2],B=n=>[n.x,n.y+n.h/2],L=n=>[n.x-n.w/2,n.y],R=n=>[n.x+n.w/2,n.y];
 // 마름모 좌·우 변 위의 점(dy: 중심에서의 세로 거리)
 const DL=(n,dy)=>[n.x-n.w/2*(1-Math.abs(dy)/(n.h/2)),n.y+dy],DR=(n,dy)=>[n.x+n.w/2*(1-Math.abs(dy)/(n.h/2)),n.y+dy];

 function nodeSVG(n){
  const {t,x,y,w,h}=n;let s='';
  const x0=x-w/2,y0=y-h/2;
  if(t==='dec'){
   const p=`${x},${y0} ${x+w/2},${y} ${x},${y0+h} ${x0},${y}`;
   s+=`<polygon class="fb" points="${p}"/><polygon class="fn fn-dec" points="${p}"/>`;
  }else{
   const rx=t==='start'||t==='ok'?h/2:t==='shock'?4:t==='drug'?14:8;
   s+=`<rect class="fb" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${rx}"/><rect class="fn fn-${t}" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${rx}"/>`;
   if(t==='shock')s+=`<path class="fz" d="M${x0+9} ${y-8}l-5 9h5l-3 8 8-11h-5l3-6z"/>`;
  }
  const ls=n.l,lh=[18].concat(ls.slice(1).map(()=>15));
  const tot=lh.reduce((a,b)=>a+b,0);let yy=y-tot/2+13;
  ls.forEach((ln,i)=>{s+=`<text class="${i?'t2':'t1'}" x="${x}" y="${yy.toFixed(1)}">${esc(ln)}</text>`;yy+=lh[i+1]||0;});
  return '<g>'+s+'</g>';
 }
 function edgeSVG(e,mid){
  const d='M'+e.p.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L');
  let s=`<path class="fe${e.dash?' dash':''}" d="${d}"${e.dash?'':` marker-end="url(#${mid})"`}/>`;
  if(e.lb)s+=`<text class="el" x="${e.lx}" y="${e.ly}" text-anchor="${e.a||'middle'}">${esc(e.lb)}</text>`;
  return s;
 }
 let uid=0;
 function chart(o){
  const mid='fa'+(++uid);const N=o.n;const used={};
  Object.values(N).forEach(n=>used[n.t]=1);
  let s=`<svg viewBox="0 0 ${o.W} ${o.H}" role="img" aria-label="${esc(o.title)} 흐름도" preserveAspectRatio="xMidYMin meet">`+
   `<defs><marker id="${mid}" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fh" d="M0 0L10 5L0 10z"/></marker></defs>`;
  (o.hd||[]).forEach(h=>{s+=`<text class="hd" x="${h[0]}" y="${h[1]}">${esc(h[2])}</text>`;});
  o.e.forEach(e=>s+=edgeSVG(e,mid));
  Object.values(N).forEach(n=>s+=nodeSVG(n));
  s+='</svg>';
  const leg=Object.keys(TYPES).filter(k=>used[k]).map(k=>`<span class="lg"><i class="sw sw-${k}"></i>${TYPES[k]}</span>`).join('');
  return `<figure class="algo-fig"><div class="algo-fig-h"><span>흐름도</span><b>${esc(o.title)}</b></div>${s}<figcaption class="algo-legend">${leg}${o.cap?`<span class="cap">${o.cap}</span>`:''}</figcaption></figure>${o.after||''}`;
 }
 const nd=(t,x,y,w,h,l)=>({t,x,y,w,h,l});
 const E=(p,lb,lx,ly,a,dash)=>({p,lb,lx,ly,a,dash});

 const charts={};

 /* 1. 첫 대응 */
 (function(){
  const n={
   s:nd('start',110,52,190,54,['반응 없음','안전 확인 후 자극']),
   c:nd('act',335,52,190,54,['코드블루 호출','소생팀·제세동기 요청']),
   d1:nd('dec',570,52,200,88,['호흡·맥박','5–10초 동시 확인']),
   p:nd('act',805,52,160,54,['맥박 있음','환기 보조·감시']),
   cpr:nd('act',570,185,220,54,['가슴압박 즉시','30:2 · 100–120회/분']),
   pad:nd('act',300,185,200,54,['패드 부착','충전 중에도 압박']),
   d2:nd('dec',300,300,190,84,['리듬 분석','충격 필요?']),
   sh:nd('shock',100,300,160,54,['제세동 1회','→ 충격 리듬 탭']),
   ns:nd('act',570,300,220,54,['CPR 2분 지속','→ 비충격 리듬 탭'])
  };
  charts['첫 대응']=chart({title:'인지에서 첫 리듬 판단까지',W:900,H:350,n,e:[
   E([R(n.s),L(n.c)]),E([R(n.c),L(n.d1)]),
   E([R(n.d1),L(n.p)],'있음',697,42),
   E([B(n.d1),T(n.cpr)],'없음 · 헐떡임',580,138,'start'),
   E([L(n.cpr),R(n.pad)]),E([B(n.pad),T(n.d2)]),
   E([L(n.d2),R(n.sh)],'예',192,290),
   E([R(n.d2),L(n.ns)],'아니오',428,290)
  ],after:'<div class="algo-chips"><span>속도 100–120회/분</span><span>깊이 5–6 cm</span><span>매번 완전 이완</span><span>중단 10초 이내</span><span>기도기 전 30:2</span><span>기도기 후 6초마다 1회</span><span>2분마다 교대·리듬 확인</span></div>'});
 })();

 /* 2. 충격 리듬 */
 (function(){
  const cx=[150,460,770],ys=[62,142,222,318];
  const n={
   s1:nd('shock',cx[0],ys[0],240,52,['제세동 ①','이상파형 120–200 J']),
   c1:nd('act',cx[0],ys[1],240,52,['CPR 2분','IV·IO 확보']),
   k1:nd('dec',cx[0],ys[3],190,80,['리듬 확인','10초 이내']),
   s2:nd('shock',cx[1],ys[0],240,52,['제세동 ②','같거나 더 높은 에너지']),
   c2:nd('act',cx[1],ys[1],240,52,['CPR 2분','전문기도기·EtCO₂ 고려']),
   e2:nd('drug',cx[1],ys[2],240,52,['에피네프린 1 mg','이후 3–5분마다']),
   k2:nd('dec',cx[1],ys[3],190,80,['리듬 확인','10초 이내']),
   s3:nd('shock',cx[2],ys[0],240,52,['제세동 ③','같거나 더 높은 에너지']),
   c3:nd('act',cx[2],ys[1],240,52,['CPR 2분','원인 교정(5H·5T)']),
   a3:nd('drug',cx[2],ys[2],240,52,['아미오다론 300 mg','또는 리도카인 1–1.5 mg/kg']),
   k3:nd('dec',cx[2],ys[3],190,80,['리듬 확인','10초 이내']),
   rp:nd('drug',cx[2],452,260,84,['같은 주기 반복','에피네프린 3–5분마다','아미오다론 150 mg 1회 추가','또는 리도카인 0.5–0.75 mg/kg']),
   no:nd('note',305,452,520,64,['리듬 확인에서 충격 리듬이 아니면','무수축·PEA → 비충격 흐름   |   정돈된 리듬 → 맥박 확인 → ROSC 이후'])
  };
  const gx1=305,gx2=615;
  charts['충격 리듬']=chart({title:'심실세동 · 무맥성 심실빈맥',W:930,H:500,n,
   hd:[[cx[0],20,'1주기'],[cx[1],20,'2주기'],[cx[2],20,'3주기 이후']],
   e:[
   E([B(n.s1),T(n.c1)]),E([B(n.c1),T(n.k1)]),
   E([B(n.s2),T(n.c2)]),E([B(n.c2),T(n.e2)]),E([B(n.e2),T(n.k2)]),
   E([B(n.s3),T(n.c3)]),E([B(n.c3),T(n.a3)]),E([B(n.a3),T(n.k3)]),
   E([R(n.k1),[gx1,ys[3]],[gx1,ys[0]],L(n.s2)],'충격 지속',gx1,200),
   E([R(n.k2),[gx2,ys[3]],[gx2,ys[0]],L(n.s3)],'충격 지속',gx2,200),
   E([B(n.k3),T(n.rp)],'충격 지속',782,387,'start'),
   E([R(n.rp),[914,452],[914,ys[0]],R(n.s3)]),
   E([B(n.k1),[cx[0],420]],'아니오',160,392,'start'),
   E([B(n.k2),[cx[1],420]],'아니오',470,392,'start')
  ],cap:'충전은 압박 중에, 충격 직후 맥박 확인 없이 압박 재개'});
 })();

 /* 3. 비충격 리듬 */
 (function(){
  const n={
   s:nd('start',115,60,190,54,['무수축 · PEA','CPR 시작 · IV/IO']),
   e1:nd('drug',350,60,200,54,['에피네프린 1 mg','가능한 빨리']),
   c:nd('act',600,60,210,54,['CPR 2분','기도 관리 · EtCO₂']),
   d:nd('dec',600,192,200,84,['리듬 확인','10초 이내']),
   sh:nd('shock',815,192,150,54,['충격 리듬','→ 제세동 흐름']),
   c2:nd('act',330,192,220,54,['CPR 2분','5H·5T 원인 교정']),
   e2:nd('drug',105,192,170,54,['에피네프린','3–5분마다 반복']),
   r:nd('ok',600,305,220,54,['맥박 확인','→ ROSC 이후'])
  };
  charts['비충격 리듬']=chart({title:'무수축 · 무맥성 전기활동',W:900,H:345,n,e:[
   E([R(n.s),L(n.e1)]),E([R(n.e1),L(n.c)]),E([B(n.c),T(n.d)]),
   E([R(n.d),L(n.sh)],'충격',720,182),
   E([DL(n.d,-11),[440,181]],'비충격 지속',482,170),
   E([[440,203],DL(n.d,11)],'2분 뒤',482,222),
   E([R(n.e2),L(n.c2)],'',0,0,'',true),
   E([B(n.d),T(n.r)],'맥박 있는 리듬',612,258,'start')
  ],cap:'제세동·심박조율·아트로핀은 쓰지 않음'});
 })();

 /* 4. 서맥 */
 (function(){
  const n={
   s:nd('start',110,52,190,56,['증상 있는 서맥','대개 50회/분 미만']),
   a:nd('act',345,52,210,56,['초기 평가','산소·감시·IV·12유도']),
   d1:nd('dec',590,52,200,88,['불안정한가?']),
   o:nd('act',808,52,150,56,['감시·관찰','원인 찾기']),
   nt:nd('note',335,142,330,46,['불안정 징후','저혈압 · 의식 변화 · 쇼크 · 흉통 · 급성 심부전']),
   at:nd('drug',590,178,230,56,['아트로핀 1 mg','3–5분마다 · 총 3 mg까지']),
   d2:nd('dec',590,292,190,80,['반응 있나?']),
   ok:nd('ok',808,292,150,56,['감시 지속','원인 교정']),
   tcp:nd('shock',350,292,200,56,['경피 심박조율','포획까지 출력 올림']),
   inf:nd('drug',112,292,200,70,['약물 주입','도파민 5–20 µg/kg/min','에피네프린 2–10 µg/min']),
   ex:nd('act',350,398,240,56,['전문가 자문','정맥 심박조율 준비'])
  };
  charts['서맥']=chart({title:'맥박 있는 서맥',W:900,H:440,n,e:[
   E([R(n.s),L(n.a)]),E([R(n.a),L(n.d1)]),
   E([R(n.d1),L(n.o)],'아니오',712,42),
   E([B(n.d1),T(n.at)],'예',600,124,'start'),
   E([B(n.at),T(n.d2)]),
   E([R(n.d2),L(n.ok)],'예',709,282),
   E([L(n.d2),R(n.tcp)],'아니오',473,282),
   E([R(n.inf),L(n.tcp)],'또는',231,282,'middle',true),
   E([B(n.tcp),T(n.ex)]),
   E([B(n.inf),[112,398],L(n.ex)])
  ]});
 })();

 /* 5. 빈맥 */
 (function(){
  const n={
   s:nd('start',110,52,190,56,['맥박 있는 빈맥','대개 150회/분 이상']),
   a:nd('act',340,52,210,56,['초기 평가','산소·감시·IV·12유도']),
   d1:nd('dec',580,52,200,88,['불안정한가?']),
   cv:nd('shock',815,52,190,56,['동기화 심율동전환','가능하면 진정 후']),
   en:nd('note',815,158,190,100,['에너지(이상파형)','심방세동·조동 200 J','좁고 규칙적 100 J','단형 심실빈맥 100 J','다형성 → 비동기 제세동']),
   d2:nd('dec',580,196,190,84,['QRS 폭은?','0.12초 기준']),
   vg:nd('act',340,196,200,56,['미주신경 자극','변형 발살바 등']),
   a1:nd('drug',340,304,210,56,['아데노신 6 mg','급속 정주 후 식염수']),
   a2:nd('drug',340,400,210,56,['아데노신 12 mg','효과 없으면']),
   rc:nd('act',340,496,240,56,['심박수 조절 검토','베타차단제·칼슘통로차단제']),
   d3:nd('dec',580,334,190,88,['규칙적이고','단형인가?']),
   wa:nd('drug',580,450,210,56,['아데노신 고려','규칙·단형일 때만']),
   am:nd('drug',815,450,190,56,['아미오다론 150 mg','10분에 걸쳐 · 자문']),
   xx:nd('act',815,334,190,56,['아데노신 쓰지 않음','전문의 자문'])
  };
  charts['빈맥']=chart({title:'맥박 있는 빈맥',W:920,H:540,n,e:[
   E([R(n.s),L(n.a)]),E([R(n.a),L(n.d1)]),
   E([R(n.d1),L(n.cv)],'예',700,42),
   E([B(n.cv),T(n.en)],'',0,0,'',true),
   E([B(n.d1),T(n.d2)],'아니오 · 안정',590,128,'start'),
   E([L(n.d2),R(n.vg)],'좁음',462,186),
   E([B(n.vg),T(n.a1)],'규칙적 · 지속',350,252,'start'),
   E([B(n.a1),T(n.a2)]),E([B(n.a2),T(n.rc)],'지속',350,450,'start'),
   E([L(n.vg),[200,196],[200,496],L(n.rc)],'불규칙',200,350),
   E([B(n.d2),T(n.d3)],'넓음',590,264,'start'),
   E([B(n.d3),T(n.wa)],'예',590,400,'start'),
   E([R(n.wa),L(n.am)],'지속',702,440),
   E([R(n.d3),L(n.xx)],'아니오',698,322)
  ],cap:'불규칙하거나 다형성인 넓은 QRS에는 아데노신 금지'});
 })();

 /* 6. ROSC 이후 */
 (function(){
  const n={
   r:nd('ok',105,56,170,56,['ROSC','맥박·혈압 회복']),
   v:nd('act',340,56,230,66,['환기 · 산소','SpO₂ 90–98%','EtCO₂ 35–45 mmHg']),
   bp:nd('act',600,56,230,66,['혈압 유지','평균동맥압 65 이상','수축기 90 mmHg 이상']),
   ecg:nd('act',600,176,230,56,['12유도 심전도','가능한 빨리']),
   cag:nd('act',822,290,156,56,['관상동맥 조영술','응급 시행']),
   d:nd('dec',600,290,210,84,['지시에 따르나?']),
   tc:nd('act',330,290,230,70,['체온 조절','32–37.5 °C · 36시간 이상','발열 예방']),
   icu:nd('act',600,404,250,56,['집중치료','원인 교정 · 지속 재평가'])
  };
  charts['ROSC 이후']=chart({title:'자발순환 회복 직후',W:920,H:445,n,e:[
   E([R(n.r),L(n.v)]),E([R(n.v),L(n.bp)]),E([B(n.bp),T(n.ecg)]),
   E([R(n.ecg),[822,176],T(n.cag)],'ST 상승',770,166),
   E([B(n.ecg),T(n.d)]),
   E([L(n.d),R(n.tc)],'아니오',470,280),
   E([B(n.d),T(n.icu)],'예',610,356,'start'),
   E([B(n.tc),[330,404],L(n.icu)]),
   E([B(n.cag),[822,404],R(n.icu)])
  ],cap:'과환기 피하기 · 저산소 피하기 · 저혈압 피하기'});
 })();

 /* 7. 5H·5T */
 (function(){
  const H=['저혈량 → 수액·지혈','저산소 → 환기·기도 확보','산증 → 환기·원인 교정','저·고칼륨 → 전해질 교정','저체온 → 가온'];
  const Tt=['긴장성 기흉 → 바늘 감압','심장눌림증 → 심낭천자','독성물질 → 해독제','폐색전 → 혈전용해 고려','관상동맥 혈전 → 재관류'];
  const n={c:nd('start',450,172,190,64,['가역적 원인','병력·검사·초음파'])};const e=[];
  H.forEach((t,i)=>{const k='h'+i;n[k]=nd('act',150,52+i*60,260,42,[t]);e.push(E([L(n.c),R(n[k])],'',0,0,'',true));});
  Tt.forEach((t,i)=>{const k='t'+i;n[k]=nd('act',750,52+i*60,260,42,[t]);e.push(E([R(n.c),L(n[k])],'',0,0,'',true));});
  charts['5H·5T']=chart({title:'원인 → 대표 처치',W:900,H:320,n,e,hd:[[150,18,'5H'],[750,18,'5T']]});
 })();

 ALGO.forEach(a=>{if(charts[a[0]])a[1]=charts[a[0]]+a[1];});
})();
