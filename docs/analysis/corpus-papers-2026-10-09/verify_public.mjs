import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedDebates } from "../../../src/data/debates.js";
import { avatarsForSpeakerText } from "../../../src/data/interlocutors.js";
import { researchInsights, researchEdition } from "../../../src/data/insights.js";

const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url)));
const result = read("results.json"), records = read("debates.json");
const classifications = new Map(records.map(r => [r.id, r]));
const close = (a,b) => assert(Math.abs(a-b)<1e-10, `${a} != ${b}`);
const average = values => values.reduce((a,b)=>a+b,0)/values.length;
const selected = publishedDebates.filter(d => classifications.get(d.id)?.theist_side && classifications.get(d.id).cohort !== "unlocked");
assert.equal(selected.length,234);
const gaps=selected.map(d=>{const t=classifications.get(d.id).theist_side; return d.score[t === "pro" ? "con" : "pro"]-d.score[t];});
close(average(gaps),result.p1.gap.mean);
assert.equal(gaps.filter(x=>x>0).length,result.p1.gap.positive);
assert.equal(gaps.filter(x=>x<0).length,result.p1.gap.negative);
close(average(selected.filter(d=>+d.number>253).map(d=>{const t=classifications.get(d.id).theist_side;return d.score[t === "pro" ? "con" : "pro"]-d.score[t];})),result.p1.sensitivity.new_since_september.mean);
for (const topic of result.p2.topics) {
  const group=selected.filter(d=>classifications.get(d.id).topic===topic.topic);
  assert.equal(group.length,topic.n);
  close(average(group.map(d=>{const t=classifications.get(d.id).theist_side;return d.score[t === "pro" ? "con" : "pro"]-d.score[t];})),topic.mean);
}
let decisive=0,untagged=0,labels=0,moves=0;
for(const d of publishedDebates){
  const sides=Object.fromEntries(["pro","con"].map(side=>[side,d.sections.flatMap(s=>s.exchanges.flatMap(e=>[e[side]].flat().filter(Boolean)))]));
  for(const cards of Object.values(sides))for(const m of cards){moves++;labels+=(m.tags||[]).filter(t=>t.type==="fallacy").length;}
  if(d.score.pro===d.score.con)continue;
  decisive++;
  const side=d.score.pro<d.score.con ? "pro":"con";
  if(sides[side].every(m=>!(m.tags||[]).some(t=>t.type==="fallacy")))untagged++;
}
assert.equal(decisive,result.p5.decisive);assert.equal(untagged,result.p5.losses_without_fallacy);
assert.equal(moves,result.counts.public_moves);assert.equal(labels,result.derived.public_label_instances);
const scores=new Map();
for(const d of publishedDebates){
  if(classifications.get(d.id)?.cohort==="unlocked")continue;
  assert.equal(d.assessmentModel,"5.6 Sol");
  for(const side of ["pro","con"]){
    const people=avatarsForSpeakerText(d.sides[side].speaker);assert.equal(people.length,1);
    const name=people[0].name;if(!scores.has(name))scores.set(name,[]);scores.get(name).push(d.score[side]);
  }
}
const ranked=[...scores].filter(([name,ss])=>ss.length>=3).sort((a,b)=>average(b[1])-average(a[1])||b[1].length-a[1].length||(a[0]<b[0]?-1:a[0]>b[0]?1:0));
assert.equal(ranked.length,result.p7.ranked_speakers);
ranked.forEach(([name,ss],i)=>{assert.equal(name,result.p7.ranking[i].speaker);assert.equal(ss.length,result.p7.ranking[i].n);close(average(ss),result.p7.ranking[i].mean);});
assert.equal(researchEdition.counts.published,publishedDebates.length);
assert.equal(researchInsights[0].statistic,`${result.p1.gap.mean.toFixed(2)} points`);
assert.equal(researchInsights[3].statistic,`${result.p4.raw.mean.toFixed(2)} → ${result.p4.same_speaker_weighted.estimate.toFixed(2)}`);
assert.equal(researchInsights[4].statistic,`${(100*untagged/decisive).toFixed(1)}%`);
assert.equal(researchInsights[6].statistic,result.p7.split_half.median.toFixed(2));
assert.match(researchInsights[6].statisticLabel,/ranking agreement.*1.00 means identical order/);
assert.match(researchInsights[6].explanation,/31 people.*3,000 random splits/);
assert.match(researchInsights[6].limitation,/not accuracy percentages or future-win probabilities/);
assert.equal(result.historical_direct.new_transcripts_reviewed,0);
console.log("Independent JavaScript checks passed: public score gaps, eight topic means, annotation inventory, complete ranking field, model labels and shared website headlines.");
