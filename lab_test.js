const stubEl = () => {
  const t = { style:{setProperty(){}}, classList:{add(){},remove(){},toggle(){},contains(){return false}},
    setAttribute(){},getAttribute(){return null},addEventListener(){},appendChild(){},animate(){},focus(){},
    scrollIntoView(){}, getBoundingClientRect(){return{top:0,left:0,width:1200,height:800}},
    innerHTML:"",textContent:"",value:"",hidden:false,parentNode:null,title:"",
    querySelector(){return null},querySelectorAll(){return []} };
  return t;
};
global.window = { SITE:null, matchMedia:()=>({matches:true}), addEventListener(){}, innerWidth:1400,
  scrollTo(){}, pageYOffset:0, devicePixelRatio:1, requestAnimationFrame:()=>0, cancelAnimationFrame(){} };
global.document = { readyState:'complete', addEventListener(){}, documentElement:{scrollHeight:1,className:''},
  querySelector:()=>stubEl(), querySelectorAll:()=>[], getElementById:()=>null, createElement:()=>stubEl(),
  body:{classList:{add(){},remove(){}}}, activeElement:{tagName:'BODY'} };
global.navigator={}; global.location={hash:''}; global.history={replaceState(){}};
global.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
global.requestAnimationFrame=()=>0; global.cancelAnimationFrame=()=>{};
require('./data.js'); window.SITE = global.window.SITE;
require('./app.js');
const L = window.__lab;

const cases = [
  ['AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"', 'FLAG', 'pattern: 20-char AWS key ID'],
  ['ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"', 'CLEAN', 'sequential constant'],
  ['MAX_RETRY_ATTEMPTS_CONFIG = 5', 'CLEAN', 'screaming snake identifier'],
  ['CreateProcessWithLogonW = kernel32.CreateProcessWithLogonW', 'CLEAN', 'CamelCase Win32 binding'],
  ['uses: actions/checkout@v4', 'CLEAN', 'GitHub Action reference'],
  ['api_token = "9f3c1a7be4d2085f6c9a1e73b0d4f82a5c6e91d3"', 'FLAG', 'generic assignment'],
  ['SESSION_KEY = "kJ8x2Qm9vR4tL7nB3wY6cF1dH5sA0pZg"', 'FLAG', 'generic assignment'],
  ['DEPLOY_KEY = "c7a1f9e2b8d40635af9d27c4e8b1a603c7a1f9e2"', 'FLAG', 'generic assignment, 40-hex'],
  ['DB_DSN = "postgres://svc:7d4f9a2c8e1b6035af9d27c4e8b1a603@db:5432/app"', 'FLAG', 'dsn assignment / entropy'],
  ['PAYMENT_GATEWAY_KEY = "9f2c8e1b7a4d6035c9f2e8b1a7d40635"', 'FLAG', 'generic assignment, 32-hex'],
  ['DEBUG = False', 'CLEAN', 'boolean'],
  ['REDIS_URL = "redis://cache:6379/0"', 'CLEAN', 'url, no credential'],
  ['const x = 42; // nothing secret here at all', 'CLEAN', 'prose'],
  ['Run the scanner with /usr/local/bin/python3 on the corpus', 'CLEAN', 'path in a sentence'],
  ['-----BEGIN OPENSSH PRIVATE KEY-----', 'FLAG', 'private key block'],
  ['CHAT_BOT_TOKEN = "bot1-abcdef0123456789abcdef0123456789"', 'FLAG', 'generic assignment, synthetic bot token'],
  ['PASSWORD: "hunter2-long-enough-value"', 'FLAG', 'password assignment'],
  ['entropy_key = "a7Fq2Zm9XvR4tL7nB3wY6cF1dH5sA0pZ"', 'FLAG', 'entropy layer, no pattern keyword'],
];
let pass=0, fail=0;
for (const [line, expect, note] of cases) {
  const r = L.scanLine(line);
  const real = r.pattern.length + r.entropy.length;
  const got = real ? 'FLAG' : 'CLEAN';
  const ok = got === expect;
  ok ? pass++ : fail++;
  console.log(`${ok?'  ok  ':' FAIL'}  ${got.padEnd(5)} (want ${expect.padEnd(5)})  ${note}`);
  console.log(`        ${line}`);
  if (r.pattern.length) console.log(`        pattern : ${r.pattern.map(p=>p.rule+' -> '+L.mask(p.tok)).join(' | ')}`);
  if (r.entropy.length) console.log(`        entropy : ${r.entropy.map(p=>L.mask(p.tok)+' ['+p.why+']').join(' | ')}`);
  if (r.guards.length)  console.log(`        guarded : ${r.guards.map(g=>L.mask(g.tok)+' <- '+g.why).join(' | ')}`);
  if (r.naive.length)   console.log(`        naive>4.5 would flag: ${r.naive.map(n=>n.tok.slice(0,20)+' (H='+n.H.toFixed(2)+')').join(' | ')}`);
}
console.log(`\n─── ${pass} pass / ${fail} fail ───`);
process.exit(fail?1:0);
