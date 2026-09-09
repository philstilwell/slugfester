import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const args=process.argv.slice(2);assert.equal(args.length,4);assert.equal(args[0],'--packet');assert.equal(args[2],'--file');
const read=p=>JSON.parse(readFileSync(p,'utf8')),packet=read(args[1]),output=read(args[3]),wc=s=>s.trim().split(/\s+/).length;
assert.deepEqual(Object.keys(output).sort(),['status','shardId','fields'].sort());assert.equal(output.status,'complete-publication-field-repair');assert.equal(output.shardId,packet.shardId);assert.deepEqual(Object.keys(output.fields).sort(),Object.keys(packet.fields).sort());
const errors=[],metrics=[];
for(const [field,value] of Object.entries(output.fields)){assert(typeof value==='string');const words=wc(value),chars=value.length;metrics.push({field,words,characters:chars});
  if(field.endsWith('.critique')){if(words<105||words>130||chars<880)errors.push({field,message:`Critique requires 105–130 words and >=880 characters; found ${words} and ${chars}`});const labels=['Strongest feature:','Principal limitation:','Live burden:','Locked score:'],parts=value.split(/(?=Principal limitation:|Live burden:|Locked score:)/).map(x=>x.trim());if(parts.length!==4||!parts.every((p,i)=>p.startsWith(labels[i])&&/[.!?]$/.test(p))||(value.match(/[.!?](?=\s|$)/g)??[]).length!==4)errors.push({field,message:'Exactly four labeled sentences required'});if(!value.split('Locked score:')[1]?.includes(String(packet.lockedCardScores?.[field]??packet.lockedCardScore)))errors.push({field,message:'Locked score missing'});}
  else if(field.endsWith('.words')){if(words<22||words>28)errors.push({field,message:`Description target 22–28; found ${words}`});}
  else if(words<45||words>130)errors.push({field,message:`Reinforcement requires45–130; found ${words}`});
  if(/and thereby supplies|advances a source-specific claim|inferential bridge remains materially incomplete despite|evidential, interpretive, precision, calibration, or responsiveness|the (?:defense|critique) (?:can|could) /i.test(value))errors.push({field,message:'Rejected generic scaffold retained'});
}
console.log(JSON.stringify({status:errors.length?'failed':'passed',errors,metrics},null,2));if(errors.length)process.exitCode=1;
