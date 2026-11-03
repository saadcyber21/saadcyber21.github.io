/* Minimal DOM so the real app.js can be exercised headlessly.
   Asserts the dossier renders every substantive block, and that the
   verification lab still detects, masks and blocks. */
function makeEl(id){
  const listeners={};
  const el={
    _id:id, tagName:(id||'div').toUpperCase(), style:{setProperty(k,v){this[k]=v;}},
    classList:{_s:new Set(),add(...c){c.forEach(x=>el.classList._s.add(x))},remove(...c){c.forEach(x=>el.classList._s.delete(x))},
      toggle(c,f){ if(f===undefined) f=!el.classList._s.has(c); f?el.classList._s.add(c):el.classList._s.delete(c); return f; },
      contains(c){return el.classList._s.has(c)}},
    attrs:{}, _html:'', textContent:'', value:'', hidden:false, title:'', disabled:false,
    children:[], parentNode:null,
    setAttribute(k,v){el.attrs[k]=v; if(k==='value') el.value=v;},
    getAttribute(k){return k in el.attrs?el.attrs[k]:null;},
    addEventListener(t,f){(listeners[t]=listeners[t]||[]).push(f);},
    _fire(t,e){(listeners[t]||[]).forEach(f=>f(e||{preventDefault(){},target:el,key:'',clientX:0,clientY:0}));},
    appendChild(c){c.parentNode=el;el.children.push(c);return c;},
    removeChild(c){el.children=el.children.filter(x=>x!==c);},
    animate(){}, focus(){}, select(){}, scrollIntoView(){}, remove(){},
    getBoundingClientRect(){return {top:0,left:0,right:1200,bottom:800,width:1200,height:800};},
    set innerHTML(v){el._html=v; el.children=[];
      const re=/id="([^"]+)"/g;let m; while((m=re.exec(v))) el.children.push(makeEl(m[1]));},
    get innerHTML(){return el._html;},
    querySelector(s){ for(const c of el.children){ if(c._id && ('#'+c._id)===s) return c; }
                      const q=byId(s.replace('#','')); return q&&q!==el? q : (el.children[0]||makeEl()); },
    querySelectorAll(s){ const key=s.replace('.','').split(/[\s\[]/)[0];
      if(/^\./.test(s)){ const out=[]; const re=new RegExp('class="[^"]*\\b'+key+'\\b','g');
        const n=(el._html.match(re)||[]).length; for(let i=0;i<n;i++) out.push(makeEl()); return out; }
      return el.children; }
  };
  return el;
}
const BY={};
function byId(id){ if(!BY[id]) BY[id]=makeEl(id); return BY[id]; }
const IDS=['mastBuild','mastTitle','mastLoc','mastMail','epigraphText','evStrip','mastProv',
 'dosIntro','dosIntLabel','dosInterests','glance','langEn','langZh','printBtn','printBtn2',
 'principles','dossiers','covLede','asiBody','asiTable',
 'secIn','secPresets','secOut','secVerdict','secRun','secClear',
 'gwIn','gwSigs','gwResult','gwRun','gwBenign','gwHostile','gwEdit',
 'calibCorpus','calibFiles','calibLines','recallList',
 'skills','certs','certCount','edu','xlist','expNote','printContact',
 'controls','systems','ledgerList','timeline','ctlinks','colophon',
 'nav','pal','palIn','palList','palBtn','toast','top','hdr'];
IDS.forEach(byId);
BY['nav']=makeEl('nav'); BY['pal']=makeEl('pal');
global.window={ SITE:null, matchMedia:()=>({matches:true}), addEventListener(){}, innerWidth:1400, innerHeight:900,
  scrollTo(){}, pageYOffset:0, devicePixelRatio:1, requestAnimationFrame:(f)=>{f&&f();return 0;}, cancelAnimationFrame(){},
  open(){}, print(){}, Set };
global.document={ readyState:'complete', addEventListener(){}, documentElement:{scrollHeight:9000,className:'',style:{},scrollTop:0},
  querySelector:(s)=> s[0]==='#'? byId(s.slice(1)) : makeEl(),
  querySelectorAll:(s)=>{ if(/^\./.test(s)){const k=s.slice(1).split(/[\s\[]/)[0];return [makeEl(),makeEl()];} return []; },
  getElementById:(id)=> BY[id]||null, createElement:()=>makeEl(),
  body:{classList:{add(){},remove(){}}}, activeElement:{tagName:'BODY'} };
global.navigator={clipboard:{writeText:()=>Promise.resolve()}};
global.location={hash:''}; global.history={replaceState(){}};
global.IntersectionObserver=class{constructor(){}observe(){}unobserve(){}disconnect(){}};
global.requestAnimationFrame=(f)=>{f&&f();return 0;}; global.cancelAnimationFrame=()=>{};
global.getComputedStyle=()=>({});

require('./data.js'); window.SITE=global.window.SITE;
require('./app.js');

const S=window.SITE;
const checks=[
 ['mastTitle', /Cybersecurity Engineer/, 1, 'masthead title'],
 ['mastProv', new RegExp(S.meta.buildDate), 1, 'provenance carries build date'],
 ['evStrip', /class="ev-tile"/, 4, 'evidence tiles'],
 ['evStrip', /source:/, 4, 'every tile cites a source'],
 ['principles', /class="maxim/, 3, 'method maxims'],
 ['dossiers', /class="exhibit/, 4, 'exhibits'],
 ['dossiers', /class="mc"/, 16, 'metric cells (4x4)'],
 ['dossiers', /What it does not do/, 4, 'honest-limitation blocks'],
 ['dossiers', /ex-verify/, 4, 'reproduce blocks'],
 ['asiBody', /class="covrow/, 10, 'coverage rows'],
 ['asiBody', /blind spot/, 4, 'blind spots stated'],
 ['controls', /class="ccard/, 4, 'control-plane cards'],
 ['systems', /class="sysrow/, 3, 'systems rows'],
 ['systems', /stated limitation/, 3, 'systems caveats'],
 ['ledgerList', /class="ledrow/, 7, 'ledger entries'],
 ['timeline', /class="tli/, 5, 'timeline entries'],
 ['ctlinks', /class="ctl"/, 4, 'contact actions'],
 ['nav', /data-t="/, 8, 'header nav links'],
 ['secPresets', /class="pset"/, 7, 'scanner presets'],
 ['gwSigs', /class="sigrow"/, 7, 'gateway signatures'],
 ['recallList', /99\.5%|100\.0%/, 1, 'recall figures'],
 ['colophon', /no trackers|no frameworks/, 1, 'colophon constraints'],
 ['dosIntro', /<p>/, 2, 'intro paragraphs'],
 ['glance', /class="g"/, 4, 'glance tiles'],
 ['skills', /class="skg"/, 5, 'skill groups'],
 ['skills', /evtag evidence/, 5, 'evidence tags'],
 ['certs', /class="cn"/, 10, 'certifications'],
 ['edu', /BSc in Cybersecurity/, 1, 'education'],
 ['xlist', /class="xentry/, 3, 'experience entries'],
 ['xlist', /employer withheld/, 3, 'anonymisation tags'],
 ['printContact', /6291773764/, 1, 'phone in print block'],
];
let pass=0,fail=0;
for(const [id,re,min,label] of checks){
  const h=(BY[id]._html||'')+(BY[id].textContent||'');
  const n=(h.match(new RegExp(re.source,'g'))||[]).length;
  const ok=n>=min; ok?pass++:fail++;
  console.log(`${ok?'  ok  ':' FAIL'}  ${label.padEnd(30)} found ${n} (need >=${min}) in #${id}`);
}
console.log('\n--- interactive smoke ---');
try{ BY['secIn'].value='AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"'; BY['secRun']._fire('click');
  const f=(BY['secOut']._html.match(/class="finding/g)||[]).length;
  const leak=/AKIAIOSFODNN7EXAMPLE/.test(BY['secOut']._html+BY['secVerdict']._html);
  const masked=/AKIA\*+MPLE/.test(BY['secOut']._html);
  console.log(`${f>0?'  ok  ':' FAIL'}  scan produced ${f} finding(s); secret leaked in output: ${leak}`);
  leak?fail++:pass++; f>0?pass++:fail++;
  console.log(`${masked?'  ok  ':' FAIL'}  evidence is masked in output`); masked?pass++:fail++;
}catch(e){console.log(' FAIL scan threw',e.message);fail++;}
try{ BY['gwHostile']._fire('click');
  const blocked=/BLOCKED/.test(BY['gwResult']._html); const code=/406/.test(BY['gwResult']._html);
  console.log(`${blocked&&code?'  ok  ':' FAIL'}  hostile tool call -> blocked=${blocked} 406=${code}`);
  blocked&&code?pass++:fail++;
}catch(e){console.log(' FAIL gateway threw',e.message);fail++;}
try{ BY['gwBenign']._fire('click');
  const allowed=/ALLOWED/.test(BY['gwResult']._html)&&/200 OK/.test(BY['gwResult']._html);
  console.log(`${allowed?'  ok  ':' FAIL'}  benign tool call -> allowed=${allowed}`);
  allowed?pass++:fail++;
}catch(e){console.log(' FAIL gateway threw',e.message);fail++;}
try{ BY['langZh']._fire('click');
  const zh=/我是/.test(BY['dosIntro']._html)&&/雇主名称略/.test(BY['xlist']._html);
  console.log(`${zh?'  ok  ':' FAIL'}  language switch renders Chinese intro + anonymisation label`);
  zh?pass++:fail++;
  BY['langEn']._fire('click');
}catch(e){console.log(' FAIL lang switch threw',e.message);fail++;}
try{ BY['palBtn']._fire('click');
  const items=(BY['palList']._html.match(/class="pitem/g)||[]).length;
  console.log(`${items>=20?'  ok  ':' FAIL'}  palette lists ${items} targets`);
  items>=20?pass++:fail++;
}catch(e){console.log(' FAIL palette threw',e.message);fail++;}
console.log(`\n─── ${pass} pass / ${fail} fail ───`);
process.exit(fail?1:0);
