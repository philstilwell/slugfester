import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publishedDebates} from '../../src/data/debates.js';
import {debateAnalytics} from '../../src/data/debate-analytics.js';
import {fileRecord} from '../../scripts/lib/assessment-production-standalone-debate-v1.mjs';
const args=process.argv.slice(2),di=args.indexOf('--debate');assert(di>=0);
const read=p=>JSON.parse(fs.readFileSync(p));
const entry=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(e=>e.debateNumber===args[di+1]);assert(entry);
const baseline=read(`${entry.root}/source/catalogue-baseline.json`),target=publishedDebates.find(d=>d.id===entry.debateId);
const scores=d=>d.sections.flatMap(s=>[s.score.pro,s.score.con]);
const histogram=values=>{assert(values.length&&values.every(Number.isFinite));const out={};for(let n=Math.floor(Math.min(...values)/2)*2;n<=Math.max(...values);n+=2)out[`${n}–${n+1}`]=values.filter(v=>v>=n&&v<n+2).length;return out;};
if(args.includes('--pre-integration-check')){
 assert(!target);const values=publishedDebates.flatMap(scores);assert.equal(publishedDebates.length,baseline.publishedDebates);assert.equal(values.length,baseline.sectionSideScores);assert.deepEqual(histogram(values),baseline.buckets);
 for(const d of publishedDebates)assert.deepEqual(debateAnalytics[d.id]?.sectionScores,scores(d));
 console.log(JSON.stringify({status:'passed-existing-catalogue-baseline-fixture',debates:publishedDebates.length,scores:values.length}));process.exit(0);
}
assert(target);
const all=publishedDebates.flatMap(scores),others=publishedDebates.filter(d=>d.id!==entry.debateId).flatMap(scores),addition=scores(target);
assert.equal(publishedDebates.length,baseline.publishedDebates+1);assert.equal(others.length,baseline.sectionSideScores);assert.deepEqual(histogram(others),baseline.buckets,'previous published histogram changed');
const perDebate=publishedDebates.map(d=>{const expected=scores(d);assert.deepEqual(debateAnalytics[d.id]?.sectionScores,expected,`${d.id}: generated section scores differ`);return {debateNumber:d.number,debateId:d.id,sectionScores:expected};});
assert.equal(Object.keys(debateAnalytics).length,publishedDebates.length);
const result={status:'passed-catalogue-and-generated-analytics-reconciliation',debateNumber:entry.debateNumber,debateId:entry.debateId,publishedDebates:publishedDebates.length,sectionSideScores:all.length,minimum:Math.min(...all),maximum:Math.max(...all),buckets:histogram(all),newDebateContribution:{scores:addition,count:addition.length,buckets:histogram(addition)},priorCatalogueUnchanged:true,baseline:fileRecord(`${entry.root}/source/catalogue-baseline.json`),catalogue:fileRecord('src/data/debates.js'),generatedAnalytics:fileRecord('src/data/debate-analytics.js'),perDebate,measurement:'Finite published section.score.pro and section.score.con values, retaining duplicates. No assessment scores were recalculated. Browser observations must independently match this complete distribution.'};
const out=`${entry.root}/rendering/expected-section-distribution.json`;
if(args.includes('--check-only'))console.log(JSON.stringify({status:'passed-check-only',publishedDebates:result.publishedDebates,total:all.length,contribution:addition,buckets:result.buckets}));
else{assert(!fs.existsSync(out));fs.mkdirSync(`${entry.root}/rendering`,{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,record:fileRecord(out),total:all.length,contribution:addition}));}
