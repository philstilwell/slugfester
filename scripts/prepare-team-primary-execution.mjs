import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileRecord} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');
const run=openTeamRun(args[1]),source=validateTeamSourceStage(run);
const packet=fileRecord(run.local('judgments/judgment-packet.json'));
const passes=['pass-a','pass-b'].map(pass=>{
  const folder=run.local(`judgments/${pass}`);mkdirSync(folder,{recursive:true});
  const output=`${folder}/output.json`;
  const prompt=`You are the isolated score-blind primary judge for ${pass}. Read the entire frozen packet ${packet.path}, and only its referenced rubric, method, schema, inventory and inventory audit. Packet SHA256 ${packet.sha256}. Follow all packet instructions and the existing multi-speaker primary-judgment schema. Write a complete JSON judgment to ${output} using apply_patch. Set pass exactly ${pass}. Include exactly every move once in packet order, all six integer dimensions and source-specific rationales of at least 40 characters, assessmentConfidence, both burden-completion adjustments, and truthful isolation/audit fields. Do not calculate any move/section/side scores or winner. Judge the actual incremental contribution, not teammates' repetition or reputation. A defect has one primary home; add a second dimension effect only for a distinct consequence. A contested premise is not automatically incoherent. No other pass, other debate, publication prose, prior score, web, biographies, credentials, paid API, or external tool research. You may inspect ONLY validateMultiSpeakerPrimaryJudgment and its structural helper functions in scripts/lib/assessment-production-multi-speaker-approximation-v1.mjs to validate this output; do not run scoring functions. No additional worker. One primary attempt; if validation fails, preserve the output and report the failure rather than revise or retry. Return output hash and actual completion status.\n`;
  const promptPath=`${folder}/prompt.txt`;writeFileSync(promptPath,prompt,{flag:'wx'});
  return {pass,prompt:fileRecord(promptPath),packet,output,attemptsAllowed:1};
});
writeFileSync(run.local('judgments/execution-intent.json'),JSON.stringify({status:'frozen-before-execution',createdAt:new Date().toISOString(),modelSlug:'gpt-5.6-sol',modelLabel:'5.6 Sol',reasoningEffort:'low',authentication:'ChatGPT subscription',isolation:'Fresh built-in contexts with no conversation inheritance; instruction-scoped file allowlists, disjoint outputs, no paid inference or credential use.',directIncrementalCostUsd:0,passes},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(passes));
