import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REGISTRY, inside, json, readJson, writeOnce } from './standalone-workflow.mjs';
import { replayPublication } from './standalone-browser-replay.mjs';

export function distribution(values) {
  assert(values.length && values.every(v=>Number.isFinite(v)&&v>=0&&v<=100));
  const buckets=[];
  for(let low=Math.floor(Math.min(...values)/2)*2;low<=Math.max(...values);low+=2)
    buckets.push({range:`${low}–${low+1}`,count:values.filter(v=>v>=low&&v<low+2).length});
  return {sectionSideScores:values.length,minimum:Math.min(...values),maximum:Math.max(...values),buckets};
}

async function catalogue(run) {
  return (await import(pathToFileURL(inside(run.root,'src/data/debates.js')).href)).publishedDebates;
}

export async function reconcileGraph(run) {
  const debates=await catalogue(run);
  const analytics=(await import(pathToFileURL(inside(run.root,'src/data/debate-analytics.js')).href)).debateAnalytics;
  const scores=d=>d.sections.flatMap(s=>[s.score.pro,s.score.con]);
  const target=debates.find(d=>d.id===run.entry.debateId);assert(target,'Integrate and generate the candidate before publication checks');
  assert.equal(Object.keys(analytics).length,debates.length);
  for(const d of debates) assert.deepEqual(analytics[d.id]?.sectionScores,scores(d),`Stale graph data: ${d.id}`);
  return {...distribution(debates.flatMap(scores)),debateNumber:run.entry.debateNumber,contribution:scores(target),publishedDebates:debates.length,eachDebateMatched:true,noScoreCalculation:true};
}

export async function scopeCases(run) {
  const debates=await catalogue(run),result=[];
  for(const entry of readJson(inside(run.root,REGISTRY)).debates) {
    const debate=debates.find(d=>d.id===entry.debateId);if(!debate)continue;
    const file=entry.readerScopeDisclosurePath||`${entry.root}/source/formal-rounds-authorization.json`;
    if(!fs.existsSync(inside(run.root,file))&&!entry.readerScopeDisclosurePath)continue;
    const scope=readJson(inside(run.root,file));
    assert(scope.debateId===debate.id || (scope.debateId===undefined&&scope.debateNumber===debate.number&&scope.videoId===entry.videoId),'Scope identity mismatch');
    assert(typeof scope.requiredReaderDisclosure==='string'&&scope.requiredReaderDisclosure.trim()&&debate.sourceNote.includes(scope.requiredReaderDisclosure),'Scope text mismatch');
    result.push({id:debate.id,number:debate.number,notice:scope.requiredReaderDisclosure});
  }
  return result;
}

export async function browserConfig(run,{origin,prefix=`debate-${run.entry.debateNumber}`,screenshots=true,screenshotDirectory='output/playwright'}={}) {
  assert(/^https?:\/\//.test(origin));assert(/^[a-z0-9-]+$/.test(prefix));
  assert.notEqual(run.entry.validationProfile,'team-approximation-v1','Use the team-specific interaction replay');
  const candidate=readJson(inside(run.root,`${run.base}/publication/output.json`)).candidate;
  assert.equal(candidate.id,run.entry.debateId);assert.equal(candidate.number,run.entry.debateNumber);
  assert.equal(new URL(candidate.youtubeUrl).searchParams.get('v'),run.entry.videoId);
  const raw=(await import(pathToFileURL(inside(run.root,'src/data/debates.js')).href)).debates;
  assert.deepEqual(raw.find(d=>d.id===candidate.id),candidate,'Published candidate differs from the frozen submission');
  const cases=await scopeCases(run),scope=cases.find(x=>x.id===candidate.id);
  const slug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return {candidate,origin:origin.replace(/\/$/,''),prefix,screenshots,screenshotDirectory,requiredReaderDisclosure:scope?.notice||null,scopeCases:cases,
    year:candidate.title.match(/\((\d{4})\)\s*$/)?.[1]||'',videoId:run.entry.videoId,modelLabel:run.manifest.modelSettings.displayLabel,
    tagCount:candidate.sections.flatMap(s=>s.exchanges.flatMap(e=>[e.pro,e.con].filter(Boolean))).reduce((n,c)=>n+c.tags.length,0),
    people:['pro','con'].map(s=>({name:candidate.sides[s].speaker,slug:slug(candidate.sides[s].speaker)})),graph:await reconcileGraph(run)};
}

// Run before the interactive replay: this catches source notices hidden by a successful JS render.
export async function replayStaticScope(page,cfg) {
  const observations=[],screenshots=[];
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    const context=await page.context().browser().newContext({javaScriptEnabled:false,viewport});
    try {
      const p=await context.newPage();
      for(const item of cfg.scopeCases) {
        const response=await p.goto(cfg.origin+'/debate/'+item.id+'/');
        if(response.status()!==200)throw Error('Static HTTP failure '+item.id);
        const notice=p.locator('.seo-fallback > .source-context');await notice.waitFor({state:'visible'});
        if((await notice.locator('span').innerText()).trim()!==item.notice)throw Error('Static notice mismatch '+item.id);
        const nb=await notice.boundingBox(),sb=await p.locator('.seo-fallback > p:not(.eyebrow)').first().boundingBox();
        if(!nb||!sb||nb.y+nb.height>sb.y+1)throw Error('Static scope must precede scores '+item.id);
        const width=await p.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
        if(width.document>width.viewport+1)throw Error('Static overflow '+item.id);
        observations.push({debateNumber:item.number,viewport,noticeBeforeScores:true,noticeExact:true});
        if(item.id===cfg.candidate.id && cfg.screenshots!==false) {
          const file=cfg.screenshotDirectory+'/'+cfg.prefix+'-static-'+viewport.width+'.png';await p.screenshot({path:file});screenshots.push(file);
        }
      }
    } finally {await context.close();}
  }
  return {status:'passed-static-source-scope',observations,screenshots};
}

export async function prepareBrowserReplay(run,args) {
  assert(args.output?.startsWith('.assessment-cache/'),'Generated CLI adapter belongs in ignored runtime storage');
  const cfg=await browserConfig(run,args);
  fs.mkdirSync(inside(run.root,cfg.screenshotDirectory),{recursive:true});
  const source=`async (page) => {\nconst cfg=${JSON.stringify(cfg)};\nconst staticReplay=${replayStaticScope.toString()};\nconst interactiveReplay=${replayPublication.toString()};\nreturn {static:await staticReplay(page,cfg),interactive:await interactiveReplay(page,cfg)};\n}\n`;
  return {status:'prepared-identical-local-and-live-replay',adapter:writeOnce(run.root,args.output,source),graph:cfg.graph,scopeCases:cfg.scopeCases.length};
}
