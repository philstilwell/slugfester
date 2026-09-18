import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileRecord } from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
import { checkRhetoricalReview } from './tmp-standalone-check-rhetorical.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const serialize=o=>JSON.stringify(o,null,2)+'\n';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
export function prepareRhetoricalAdjudication(debateNumber){
 const rec=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(r=>r.debateNumber===debateNumber);assert(rec);
 const base=rec.root+'/publication/rhetorical-tag-review-1',dest=base+'/adjudication',sourcePacket=read(base+'/packet.json'),model=read(rec.root+'/manifest.json').modelSettings;
 const routes=fs.existsSync(base+'/effective-passes.json')?read(base+'/effective-passes.json').directories:{'pass-a':'pass-a','pass-b':'pass-b'};
 const passes=['pass-a','pass-b'].map(pass=>{const dir=routes[pass];assert(dir===pass||new RegExp('^'+pass+'/replacement-[1-9][0-9]*$').test(dir));const output=read(base+'/'+dir+'/output.json'),approval=read(base+'/'+dir+'/controller-review.json');assert.equal(approval.status,'accepted-for-anonymous-adjudication');assert.equal(approval.output.sha256,fileRecord(base+'/'+dir+'/output.json').sha256);checkRhetoricalReview(output,sourcePacket);return output;});
 const ids=[...sourcePacket.outputContract.reviewedMoveIds,...sourcePacket.outputContract.reviewedOverallBlunderIds];
 const definitions=sourcePacket.referenceDefinitions;
 const union=new Map();
 for(const pass of passes)for(const row of [...pass.candidateReviews,...pass.overallBlunderCandidateReviews]){
   const {decision,context,rationale,...identity}=row;
   const candidate=union.get(row.candidateKey)??{...identity,options:[]};
   candidate.options.push({decision,context,rationale});union.set(row.candidateKey,candidate);
 }
 const ordered=[...union.values()].sort((a,b)=>ids.indexOf(a.moveId??a.blunderId)-ids.indexOf(b.moveId??b.blunderId)||definitions.findIndex(d=>d.type===a.type&&d.label===a.label)-definitions.findIndex(d=>d.type===b.type&&d.label===b.label));
 for(const c of ordered)c.options=c.options.sort((a,b)=>hash(serialize(a)).localeCompare(hash(serialize(b)))).map((o,i)=>({optionId:'anonymous-'+(i+1),...o}));
 const sourcePath=sourcePacket.completeTimestampedTranscript;
 const outputContract={schemaVersion:'1.0-anonymous-rhetorical-adjudication',status:'complete-candidate-union-adjudication',debateNumber,debateId:rec.debateId,reviewedCandidateKeys:ordered.map(c=>c.candidateKey),resolutions:'Exactly one per reviewedCandidateKey in supplied order: {candidateKey,moveId or blunderId,type,label,url,context:8–35words,rationale:at least12words,decision:accepted|rejected}. Identity comes from union; no new candidate or relabeling. Context and rationale may be improved without changing critique or judgment.',audit:{model:model.model,reasoningEffort:model.reasoningEffort,attempts:1,retries:0,directIncrementalCostUsd:0,anonymousReviewOptions:true,completeCandidateUnionReviewed:true,scoresUnavailable:true,existingTagsUnavailable:true,judgmentChanges:0,scoreChanges:0,critiqueChanges:0}};
 const packet={schemaVersion:'1.0-anonymous-rhetorical-adjudication-input',status:'frozen-before-fresh-adjudication',debateNumber,debateId:rec.debateId,sourcePacket:fileRecord(base+'/packet.json'),transcript:fileRecord(sourcePath),controllerOverrides:[],completeCandidateUnion:ordered,expectedCandidateCount:ordered.length,expectedCandidateKeys:ordered.map(c=>c.candidateKey),rules:[
 'Read the complete score-blind source packet, all local definitions, full transcript, corroborating audio context, and every anonymous candidate option. Review every candidate, including candidates suggested by only one reviewer. There are exactly '+ordered.length+' candidates; preserve exact supplied population and order.',
 'Use only the exact local definition and the source-supported defect already present in the frozen critique. A tag does not introduce a new numerical penalty. No quota, forced symmetry, compensation, or relabeling. Distinguish an underdeveloped argument from an actual named defect, and avoid two tags for one defect unless two distinct definition-matching failures are shown.',
 'Identify the assessed speaker\'s own inference. Quoting, reporting, testing, or criticizing someone else\'s alleged fallacy or bias does not itself instantiate that defect. Weak support, an unfinished mechanism, an incomplete analogy, and failure to exclude alternatives do not automatically establish a named fallacy. Contested premises are not automatically circular, and citing a source is not automatically an appeal to authority.',
 'Every accepted or rejected decision needs source-specific rationale of at least12words. Every context is8–35words and describes conduct fitting the label, not a label paraphrase. Use the supplied identity, catalog label and URL exactly.',
 'No primary assessments, aggregate scores, production output with tags, reviewer identities, other debates, frequency baselines, failed outputs, network, Git, credentials, paid APIs or new agents. Complete reading and obtain controller release before drafting. Then validate the complete in-memory draft with checkRhetoricalAdjudication before the single final output write.'
 ],outputContract};
 const files={[dest+'/input.json']:serialize(packet)};
 const inputPaths=[dest+'/input.json',base+'/packet.json',base+'/catalog-snapshot.json',sourcePath,sourcePacket.audioContextPath,'src/data/references.js','tmp-standalone-check-rhetorical.mjs'];
 const text=p=>files[p]??fs.readFileSync(p,'utf8');
 const readingPlan=inputPaths.flatMap(p=>{const lines=text(p).trimEnd().split('\n'),ranges=[];for(let start=0;start<lines.length;){let end=start,size=0;while(end<lines.length&&end-start<200&&(size<12000||end===start))size+=lines[end++].length+1;ranges.push({path:p,firstLine:start+1,lastLine:end});start=end;}return ranges;});
 const instructions={schemaVersion:'1.0-isolated-rhetorical-adjudication-instructions',debateNumber,debateId:rec.debateId,model,packetPath:dest+'/input.json',sourcePath,outputPath:path.resolve(dest+'/output.json'),readingPlan,readingGateRequired:true,instructions:['Read this complete file and every listed range literally in separate bounded calls with no truncation. Notify controller when complete and stop without drafting or writing. Wait for authenticated release.','Use env -u OPENAI_API_KEY -u ANTHROPIC_API_KEY for every shell. After release follow the frozen packet, checker and exact output path; one attempt and one final apply_patch write. No other files.']};
 files[dest+'/execution-instructions.json']=serialize(instructions);
 files[dest+'/execution-plan.json']=serialize({schemaVersion:'1.0-isolated-rhetorical-adjudication-execution-plan',status:'frozen-before-model-execution',debateNumber,debateId:rec.debateId,model,packetPath:instructions.packetPath,sourcePath,outputPath:instructions.outputPath,inputs:[dest+'/execution-instructions.json',...inputPaths].map(p=>({path:p,sha256:hash(text(p)),bytes:Buffer.byteLength(text(p))})),oneAttempt:true,retries:0,forkTurns:'none',readingGateRequired:true,expectedCandidateCount:ordered.length,directIncrementalCostUsd:0});
 for(const p of Object.keys(files))assert(!fs.existsSync(p),'Preserve '+p);
 return{files,summary:{candidates:ordered.length,readingRanges:readingPlan.length,instructionsPath:path.resolve(dest+'/execution-instructions.json')}};
}
if(process.argv[2]==='--debate')console.log(JSON.stringify(prepareRhetoricalAdjudication(process.argv[3])));
