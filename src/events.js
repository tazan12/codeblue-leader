/* ============ 이벤트 ============ */
document.addEventListener('click',e=>{
 snd.init();
 const b=e.target.closest('[data-act],[data-go],[data-mode],[data-case],[data-stop],[data-sel],[data-otask],[data-stask],[data-drug],[data-dtab],[data-stab],[data-readv],[data-algo],[data-dbtab],[data-inf],[data-quiz],[data-site]');
 if(!b){if(e.target===$('#ov')&&!(S&&S.flags.introOpen))closeDlg();return;}
 const d=b.dataset;
 if(d.go){if(d.go==='algo'){openAlgo(0);return;}if(curScreen==='sim'&&S&&!S.ended){S.paused=true;}closeDlg();if(d.go==='menu'&&curScreen==='sim'&&S&&!S.ended){S=null;}showScreen(d.go);return;}
 if(d.mode){SEL.mode=d.mode;if(d.mode==='test'){startCase(testCaseKey(),'test');}else showScreen('pick');return;}
 if(d.case){const rnd0=d.case==='RANDOM',k=rnd0?pick(CASE_KEYS):d.case;window.CBL_RAND=rnd0;startCase(k,SEL.mode);window.CBL_RAND=false;if(S)S.hideName=rnd0;if(rnd0&&S)renderTop();return;}
 if(d.quiz){answerQuiz(b);return;}
 if(d.dbtab){renderDebrief(d.dbtab);return;}
 if(d.algo){openAlgo(+d.algo);return;}
 if(!S&&!['closeDlg','nextQuiz','clearStats','clearYes','custom'].includes(d.act))return;
 if(d.site){if(S.assess&&S.site===d.site&&b.classList.contains('site'))endAssess();else{S.site=d.site;if(b.classList.contains('site')&&!S.assess)startAssess();}renderSim();return;}
 if(d.stop){const m=M(d.stop);if(m){stopTask(m);renderSim();}return;}
 if(d.sel){S.ui.fixed=S.ui.fixed===d.sel?null:d.sel;renderSim();return;}
 if(d.otask||d.stask){orderTask(d.otask||d.stask);renderSim();return;}
 if(d.drug){orderTask('drug',d.drug);renderSim();return;}
 if(d.dtab){S.ui.dtab=d.dtab;renderSim();return;}
 if(d.stab){S.ui.stab=d.stab;renderSim();return;}
 if(d.readv){doRead(d.readv);return;}
 if(d.inf){stopInfusion(d.inf);renderSim();return;}
 const P=S&&S.P;
 switch(d.act){
  case 'introGo':closeDlg();S.paused=false;break;
  case 'closeDlg':closeDlg();break;
  case 'consc':leaderConsc();break;
  case 'codeblue':if(S&&!S.ended)codeBlue();break;
  case 'assess':startAssess();break;
  case 'assessEnd':endAssess();break;
  case 'clear':clearAll();break;
  case 'resume':resumeAll();break;
  case 'read':openRead();break;
  case 'readClose':$('#readpop').hidden=true;break;
  case 'mute':S.alarmMute=S.t<(S.alarmMute||0)?0:S.t+120;break;
  case 'voice':snd.voiceOn=!snd.voiceOn;store.set('cbl_voice',snd.voiceOn);if(!snd.voiceOn&&'speechSynthesis' in window)speechSynthesis.cancel();break;
  case 'ttm':S.ttm=true;log('리더: 지시에 따르지 않아 체온 조절(32–37.5 °C, 36시간 이상, 발열 예방)을 시작하기로 결정했습니다.','act');break;
  case 'feedback':{const m=M(d.m);if(m&&m.task==='cpr'){const tired=(m.fat||0)>=110;m.rate0=110;m.boost=tired?0.25:0.6;if(typeof cprFatigue==='function')cprFatigue(m,0);log('리더 → '+m.name+': "속도 110, 5 cm 이상, 완전히 이완하세요."','comm');if(tired)log(m.name+': "지쳐서 깊이 유지가 어렵습니다. 교대가 필요합니다."','comm');}break;}
  case 'vrate':{const m=M(d.m);if(m){m.ventRate=+d.v;log('리더 → '+m.name+': 환기 '+d.v+'회/분','comm');}break;}
  case 'fio2':P.fio2=+d.v;log('리더: FiO₂ '+Math.round(+d.v*100)+'%로 조정','comm');break;
  case 'drugsel':break;
  case 'drugClose':S.ui.drugOpen=false;break;
  case 'nibp':nibpMeasure(false);break;
  case 'nibpAuto':S.nibp.auto=!S.nibp.auto;S.nibp.lastAuto=S.t-180;log('NIBP 자동 3분 '+(S.nibp.auto?'켬':'끔'),'dev');break;
  case 'en':{const L=[50,70,100,120,150,200];let i=L.indexOf(S.def.energy);i=clamp(i+(+d.v),0,L.length-1);if(S.def.state!=='idle'){toast('충전 중에는 에너지를 바꿀 수 없습니다. 충전을 해제하세요.');break;}S.def.energy=L[i];break;}
  case 'sync':if(S.def.state!=='idle'&&S.def.state!=='charged')break;S.def.sync=!S.def.sync;log('SYNC '+(S.def.sync?'켬':'끔'),'dev');break;
  case 'charge':charge();break;
  case 'disarm':disarm();break;
  case 'shock':pressShock();break;
  case 'pace':togglePace();break;
  case 'pr':paceAdj('rate',+d.v);break;
  case 'pm':paceAdj('mA',+d.v);break;
  case 'pause':S.paused=!S.paused;break;
  case 'sound':snd.on=!snd.on;store.set('cbl_sound',snd.on);if(!snd.on){snd.ambientSync(false);if('speechSynthesis' in window)speechSynthesis.cancel();}break;
  case 'algo':if(S.mode!=='test')openAlgo(0);break;
  case 'endAsk':openDlg('<h2>케이스를 종료할까요?</h2><p>지금 종료하면 미완료로 기록되고 디브리핑으로 이동합니다.</p><div class="acts"><button class="btn" data-act="closeDlg">계속 진행</button><button class="btn danger" data-act="endYes">종료하고 디브리핑</button></div>');break;
  case 'endYes':closeDlg();endCase('stopped');break;
  case 'retry':{const k=S.key,mo=S.mode,cu=S.key==='CUSTOM'?Object.assign({},S.C,{cause:S.C.cause}):null;startCase(k,mo,cu);break;}
  case 'copyReport':{const txt=reportText();const fb=()=>{openDlg('<h2>보고서</h2><p class="muted">아래 내용을 선택해 복사하세요.</p><textarea style="width:100%;height:320px;font-family:var(--f-mono);font-size:12px;margin-top:8px" readonly>'+esc(txt)+'</textarea><div class="acts"><button class="btn" data-act="closeDlg">닫기</button></div>',true);};try{navigator.clipboard.writeText(txt).then(()=>toast('디브리핑 보고서를 복사했습니다.')).catch(fb);}catch(err){fb();}break;}
  case 'nextQuiz':newQuiz();break;
  case 'clearStats':openDlg('<h2>기록을 모두 지울까요?</h2><p>이 브라우저에 저장된 케이스 결과가 삭제되며 되돌릴 수 없습니다.</p><div class="acts"><button class="btn" data-act="closeDlg">취소</button><button class="btn danger" data-act="clearYes">모두 지우기</button></div>');break;
  case 'clearYes':store.set('cbl_cases_v1',[]);closeDlg();renderStats();break;
  case 'custom':startCustom();break;
  case 'inst':instOpen=!instOpen;renderInst();break;
  case 'iRh':{const k=$('#i-rh').value,hr=+$('#i-hr').value||undefined;const wasP=P.pulse;setRhythm(k,hr);if(!wasP&&P.pulse){S.roscT=S.t;S.flags.everRosc=true;P.sbpT=Math.max(P.sbpT,80);}if(P.pulse&&P.sbpT<60)P.sbpT=90;instMark('리듬 → '+RH[k].name);break;}
  case 'iSbp':P.sbpT=+$('#i-sbp').value||P.sbpT;instMark('목표 혈압 '+P.sbpT);break;
  case 'iRosc':if(!P.pulse){doRosc();instMark('ROSC 유도');}break;
  case 'iArr':setRhythm(d.v);instMark('재정지 → '+RH[d.v].name);break;
  case 'iFail':S.flags.forceFail=true;instMark('다음 술기 실패 예약 (심화·평가 모드)');break;
  case 'iCB':if(S.codeBlue.status!=='arrived'){S.codeBlue={status:'coming',req:S.codeBlue.req,arr:S.t};instMark('지원팀 즉시 도착');}break;
  case 'iCause':{const v=$('#i-cause').value;P.cause=v||null;P.causeFixed=!v;instMark('원인 지정 → '+(v?CAUSES[v].name:'없음'));break;}
  case 'iFix':if(P.cause){P.causeFixed=true;instMark('원인 교정 처리');}break;
  case 'iNote':{const v=$('#i-note').value.trim();if(v){S.notes.push({t:S.t,text:v});S.instr=true;$('#i-note').value='';}break;}
 }
 if(S&&curScreen==='sim'){renderSim();renderInst();}
});
document.addEventListener('change',e=>{
 if(e.target.id==='cu-rh'){const r=RH[e.target.value];$('#cu-hr').value=r.hr||0;$('#cu-sbp').value=r.pulse?100:0;$('#cu-sp').value=r.pulse?94:70;}});
document.addEventListener('keydown',e=>{
 if(e.target.matches('input,textarea,select'))return;
 if(e.key==='Escape'){if(!$('#ov').hidden&&!(S&&S.flags.introOpen))closeDlg();else if(instOpen){instOpen=false;renderInst();}return;}
 if(curScreen!=='sim'||!S||S.ended||!$('#ov').hidden)return;
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key===' '){e.preventDefault();S.paused=!S.paused;}
 else if(e.key==='c'||e.key==='C')charge();else if(e.key==='s'||e.key==='S')pressShock();else if(e.key==='a'||e.key==='A')clearAll();else if(e.key==='r'||e.key==='R')resumeAll();else if((e.key==='h'||e.key==='H')&&typeof holdComp==='function')holdComp('other');else return;
 renderSim();
});
let rsT=null;window.addEventListener('resize',()=>{clearTimeout(rsT);rsT=setTimeout(()=>{if(monSweep)monSweep.resize();if(heroSweep)heroSweep.resize();learnObjs.forEach(o=>o.sw.resize());if(quizObj)quizObj.sw.resize();if(curScreen==='debrief'&&$('#tl'))drawTimeline();},150);});
$('#go-home').addEventListener('click',()=>{if(curScreen==='sim'&&S&&!S.ended){S.paused=true;openDlg('<h2>처음 화면으로 갈까요?</h2><p>진행 중인 케이스는 저장되지 않습니다.</p><div class="acts"><button class="btn" data-act="pauseOff">계속 진행</button><button class="btn danger" data-go="menu">나가기</button></div>');}else showScreen('menu');});
document.addEventListener('click',e=>{if(e.target.closest('[data-act="pauseOff"]')){closeDlg();if(S)S.paused=false;}});
window.CB={get S(){return S;},startCase,tick,endCase,score,render:()=>renderSim()};
$('#hero-img').src=IMG.hero;(function(){const v=$('#hero-vid');if(!v||typeof HEROVID==='undefined')return;if(document.documentElement.classList.contains('calm'))return;v.hidden=false;v.muted=true;v.src=(v.canPlayType('video/mp4; codecs="avc1.640028"')?HEROVID.mp4:HEROVID.webm);v.addEventListener('playing',()=>v.classList.add('ready'),{once:true});v.addEventListener('error',()=>{v.hidden=true;});const p=v.play();if(p&&p.catch)p.catch(()=>{});})();
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.mem[data-sel]')){e.preventDefault();e.target.click();}},true);
showScreen('menu');requestAnimationFrame(frame);
