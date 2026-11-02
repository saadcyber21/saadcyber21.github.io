/* Minimal DOM so the real app.js can be exercised headlessly. */
function cssGetSel(sel){
  if(sel[0]!=='.') return null;
  const parts=sel.split(/\s+/).filter(Boolean).map(p=>p.replace(/^[^.#]/,''));
  const cls=sel.split('.').pop().split(/[\s\[]/)[0];
  return {tag:null,cls};
}
let REG=[];
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
      const re=/id="([^"]+)"/g;let m; while((m=re.exec(v))) el.children.push(makeEl(m[1]));
      // also register class-bearing nodes count for smoke checks
      el._counts={ finding:(v.match(/class="finding/g)||[]).length,
                   dossier:(v.match(/class="dossier/g)||[]).length,
                   pr:(v.match(/class="pr /g)||[]).length,
                   ccard:(v.match(/class="ccard/g)||[]).length,
                   asi:(v.match(/class="asi /g)||[]).length,
                   seg:(v.match(/class="seg"/g)||[]).length,
                   ledrow:(v.match(/class="ledrow/g)||[]).length,
                   tli:(v.match(/class="tli/g)||[]).length,
                   sysrow:(v.match(/class="sysrow/g)||[]).length,
                   pitem:(v.match(/class="pitem/g)||[]).length,
                   cl:(v.match(/class="cl"/g)||[]).length,
                   sigrow:(v.match(/class="sigrow/g)||[]).length,
                   gwrow:(v.match(/class="gwrow/g)||[]).length,
                   ctl:(v.match(/class="ctl"/g)||[]).length,
                   hs:(v.match(/class="hs"/g)||[]).length };
    },
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
const IDS=['dosTitle','dosLoc','dosMail','dosIntro','dosInterests','dosIntLabel','glance','printBtn','skills','certs','certCount','edu','xlist','expNote','printContact','bootLines','bootBar','boot','bootSkip','field','avatar','whoName','console','heroStats',
 'principles','dossiers','ring','asiList','secIn','secPresets','secOut','secVerdict','secRun','secClear',
 'gwIn','gwSigs','gwResult','gwRun','gwBenign','gwHostile','gwEdit','recallList','controls','systems',
 'ledgerList','timeline','ctlinks','nav','pal','palIn','palList','palBtn','toast','top','hdr','sbar','p-calib'];
IDS.forEach(byId);
BY['nav']=makeEl('nav'); BY['pal']=makeEl('pal');
// hero canvas must NOT provide getContext (initField bails cleanly)
global.window={ SITE:null, matchMedia:()=>({matches:true}), addEventListener(){}, innerWidth:1400, innerHeight:900,
  scrollTo(){}, pageYOffset:0, devicePixelRatio:1, requestAnimationFrame:()=>0, cancelAnimationFrame(){},
  open(){}, Set };
global.document={ readyState:'complete', addEventListener(){}, documentElement:{scrollHeight:9000,className:'',style:{}},
  querySelector:(s)=> s[0]==='#'? byId(s.slice(1)) : makeEl(),
  querySelectorAll:(s)=>{ if(/^\./.test(s)){const k=s.slice(1).split(/[\s\[]/)[0];return [makeEl(),makeEl()];} return []; },
  getElementById:(id)=> BY[id]||null, createElement:()=>makeEl(),
  body:{classList:{add(){},remove(){}}}, activeElement:{tagName:'BODY'} };
global.navigator={clipboard:{writeText:()=>Promise.resolve()}};
global.location={hash:''}; global.history={replaceState(){}};
global.IntersectionObserver=class{constructor(){}observe(){}unobserve(){}disconnect(){}};
global.requestAnimationFrame=()=>0; global.cancelAnimationFrame=()=>{};
global.getComputedStyle=()=>({});

require('./data.js'); window.SITE=global.window.SITE;
require('./app.js');

const checks=[
 ['principles', /class="pr /, 3, 'principle cards'],
 ['dossiers', /class="dossier /, 4, 'dossier articles'],
 ['dossiers', /class="mc"/, 16, 'metric cells (4x4)'],
 ['dossiers', /what it does not do/, 4, 'honest-limitation blocks'],
 ['dossiers', /class="cmd"/, 4, 'reproduce commands'],
 ['ring', /class="seg"/, 10, 'ASI ring segments'],
 ['ring', /rgba\(94,234,212/, 1, 'covered segment fill'],
 ['ring', /rgba\(255,92,92/, 1, 'blind-spot segment fill'],
 ['asiList', /class="asi /, 10, 'ASI list rows'],
 ['asiList', /blind spot/, 4, 'blind spot labels'],
 ['controls', /class="ccard/, 4, 'control-plane cards'],
 ['systems', /class="sysrow/, 3, 'systems rows'],
 ['systems', /stated limitation/, 3, 'systems caveats'],
 ['ledgerList', /class="ledrow/, 7, 'ledger entries'],
 ['timeline', /class="tli/, 4, 'timeline entries'],
 ['ctlinks', /class="ctl"/, 4, 'contact links'],
 ['nav', /data-t="/, 7, 'nav links'],
 ['secPresets', /class="pset"/, 8, 'scanner presets'],
 ['gwSigs', /class="sigrow"/, 7, 'gateway signatures'],
 ['recallList', /99.5%|100.0%/, 1, 'recall figures'],
];
let pass=0,fail=0;
for(const [id,re,min,label] of checks){
  const h=BY[id]._html||''; const n=(h.match(new RegExp(re.source,'g'))||[]).length;
  const ok=n>=min; ok?pass++:fail++;
  console.log(`${ok?'  ok  ':' FAIL'}  ${label.padEnd(30)} found ${n} (need >=${min}) in #${id}`);
}
// palette items
BY['palIn'].value=''; 
console.log('\n--- interactive smoke ---');
try{ BY['secIn'].value='AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"'; BY['secRun']._fire('click');
  const f=(BY['secOut']._html.match(/class="finding/g)||[]).length;
  const leak=/AKIAIOSFODNN7EXAMPLE/.test(BY['secOut']._html+BY['secVerdict']._html);
  console.log(`${f>0?'  ok  ':' FAIL'}  scan produced ${f} finding(s); secret leaked in output: ${leak}`);
  leak?fail++:pass++; f>0?pass++:fail++;
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
}catch(e){console.log(' FAIL benign threw',e.message);fail++;}
// telemetry + counters render after the boot overlay finishes (reduced-motion path: ~700ms)
setTimeout(()=>{
  const late=[['console',/class="cl"/,10,'telemetry rows'],['heroStats',/data-to="/,4,'hero counters']];
  for(const [id,re,min,label] of late){
    const h=BY[id]._html||''; const n=(h.match(new RegExp(re.source,'g'))||[]).length;
    const ok=n>=min; ok?pass++:fail++;
    console.log(`${ok?'  ok  ':' FAIL'}  ${label.padEnd(30)} found ${n} (need >=${min}) in #${id}`);
  }
  const masked=/AKIA\*+MPLE/.test(BY['secOut']._html);
  console.log(`${masked?'  ok  ':' FAIL'}  evidence is masked in output`); masked?pass++:fail++;
  // résumé layer
const late2=[['dosIntro',/class="zh"|<p>/,1,'intro paragraphs'],['glance',/class="g"/,4,'glance tiles'],
 ['skills',/class="skg"/,5,'skill groups'],['skills',/evtag evidence/,5,'evidence tags'],
 ['certs',/class="cn"/,10,'certifications'],['edu',/BSc in Cybersecurity/,1,'education'],
 ['xlist',/class="xentry/,3,'experience entries'],['xlist',/employer withheld/,3,'anonymisation tags'],
 ['printContact',/6291773764/,1,'phone in print block']];
for(const [id,re,min,label] of late2){
  const h=BY[id]._html||''; const n=(h.match(new RegExp(re.source,'g'))||[]).length;
  const ok=n>=min; ok?pass++:fail++;
  console.log(`${ok?'  ok  ':' FAIL'}  ${label.padEnd(26)} found ${n} (need >=${min}) in #${id}`);
}
console.log(`\n─── ${pass} pass / ${fail} fail ───`);
  process.exit(fail?1:0);
}, 1400);
