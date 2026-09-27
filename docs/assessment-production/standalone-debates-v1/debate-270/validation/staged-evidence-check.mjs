import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const args=process.argv.slice(2),n=args[args.indexOf('--debate')+1];
assert(args.includes('--debate')&&/^\d{3,}$/.test(n));
const r=JSON.parse(fs.readFileSync('docs/assessment-production/standalone-debates-v1/registry.json')).debates.find(x=>x.debateNumber===n);assert(r);
const git=(...a)=>execFileSync('git',a,{maxBuffer:64*1024*1024}),hash=b=>createHash('sha256').update(b).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(p+'/'+x.name):[p+'/'+x.name]);
const owned=walk(r.root), staged=git('diff','--cached','--name-only','-z').toString().split('\0').filter(Boolean),indexFiles=new Set(git('ls-files','-z').toString().split('\0'));
const allowed=p=>p.startsWith(r.root+'/')||p===r.productionLedger.path||['docs/assessment-production/standalone-debates-v1/registry.json','docs/calibration/v2.1/corpus-transcript-audit.json','src/data/debates.js','src/data/interlocutors.js','src/data/interlocutor-bios.js','tests/site-quality/site-quality.spec.mjs','scripts/seo-page-history.json','src/app.js','src/seo.js','src/data/page-updates.js','src/data/debate-analytics.js','src/data/debate-summaries.js','feed.xml','sitemap.xml','index.html','404.html'].includes(p)||/^(?:assessment|backend|corrections|debate|insights|interlocutor|rankings|reference|search|topics)\/.*index\.html$/.test(p)||p==='src/data/debate-details/'+r.debateId+'.js'||/^src\/data\/reference-appearances\/(?:bias-confirmation-bias|fallacy-equivocation|fallacy-red-herring)\.js$/.test(p);
assert(staged.length>0);for(const p of staged)assert(allowed(p),'Out-of-scope staged path: '+p);
const files=[...new Set([...owned,r.productionLedger.path,...staged])];
const hashes=new Map(),scanned=[];
for(const p of files){
  assert(indexFiles.has(p),'Required file is not staged: '+p);
  const b=fs.readFileSync(p),ib=git('show',':'+p);assert(b.equals(ib),'Index differs from working evidence: '+p);
  hashes.set(hash(b),p);
  if(!/\.(?:png|jpg|webp)$/.test(p)){
    const s=b.toString();
    for(const [label,re] of [['private-key',/-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/],['api-key',/(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{30,}/],['github-token',/gh[pousr]_[A-Za-z0-9]{30,}/],['signed-media-query',/[?&](?:X-Amz-Signature|signature|sig|lsig|access_token)=/i]])assert(!re.test(s),'Sensitive-content pattern '+label+' in '+p);
  }
  scanned.push({path:p,sha256:hash(b),bytes:b.length});
}
const references=[],failures=[];
const baseline=JSON.parse(fs.readFileSync(r.root+'/source/crash-resume-upstream-audit.json')).upstreamHead;
function matchesBaseline(p,expected){try{return hash(git('show',baseline+':'+p))===expected;}catch{return false;}}
function visit(v,owner){
  if(!v||typeof v!=='object')return;
  if(typeof v.path==='string'&&/^[a-f0-9]{64}$/.test(v.sha256??'')){
    let p=v.path;if(path.isAbsolute(p)&&p.startsWith(process.cwd()+'/'))p=path.relative(process.cwd(),p);
    if(/^(docs|src|scripts|tests|assets)\//.test(p)){
      let actual=null;if(indexFiles.has(p))actual=hash(git('show',':'+p));
      if(actual===v.sha256)references.push({owner,path:p,status:'exact-staged-hash'});
      else if(hashes.has(v.sha256))references.push({owner,path:p,status:'historical-bytes-preserved',preservedAt:hashes.get(v.sha256)});
      else if(matchesBaseline(p,v.sha256))references.push({owner,path:p,status:'immutable-baseline',gitCommit:baseline});
      else if(v.gitCommit){try{assert.equal(hash(git('show',v.gitCommit+':'+p)),v.sha256);references.push({owner,path:p,status:'immutable-history'});}catch{failures.push({owner,path:p,reason:'historical-hash'});}}
      else failures.push({owner,path:p,reason:actual?'hash-mismatch':'not-staged'});
    }
  }
  for(const value of Object.values(v))visit(value,owner);
}
for(const p of owned.filter(p=>p.endsWith('.json')))visit(JSON.parse(fs.readFileSync(p)),p);
visit(JSON.parse(fs.readFileSync(r.productionLedger.path)),r.productionLedger.path);
console.log(JSON.stringify({status:failures.length?'failed':'passed',debateNumber:n,stagedFiles:staged.length,requiredEvidenceFiles:owned.length,authenticatedReferences:references.length,historicalPreservedReferences:references.filter(x=>x.status==='historical-bytes-preserved').length,sensitivePatterns:0,failures},null,2));
assert.equal(failures.length,0,'Unreconciled durable references');
