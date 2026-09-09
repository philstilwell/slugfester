import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileRecord,validateMultiSpeakerAudioVerification} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');
const run=openTeamRun(args[1]),source=validateTeamSourceStage(run);assert(source.ownershipRecovery);
const audio=run.read(run.local('audio/audio-verification.json'));validateMultiSpeakerAudioVerification(audio,source.inventory,{expectedInventorySha256:source.packet.inventory.sha256});audio.inputRecords.forEach(run.check);
const packet=fileRecord(run.local('judgments/judgment-packet.json'));
for(const pass of ['pass-a','pass-b']){
  const folder=run.baseLocal(`recovery/audio-ownership-1/${pass}`);mkdirSync(folder,{recursive:true});
  const output=`${folder}/output.json`,promptPath=`${folder}/prompt.txt`;
  const prompt=`You are the fresh isolated replacement primary judge for ${pass}. Working directory ${process.cwd()}. Read the entire ${packet.path} (SHA256 ${packet.sha256}), its embedded corrected inventory, accepted inventory audit, named rubric and method. Your ONLY writable judgment fields are the two listed affected move judgments and both dependent burdenCompletionAdjustment sides. Follow the packet outputContract exactly, setting pass to ${pass}. The other 20 move judgments are hidden and will be preserved exactly by the controller. Do not open original primary outputs, the other pass, other debates, old scores, publication, biographies, web, credentials or paid tools. Assess each actual speaker only for the corrected selected evidence; do not transfer the excluded teammate's conclusion or overstatement to the selected speaker. Use the full source burden map for the side adjustments, keeping a distinct unscored consequence for any nonzero adjustment. No totals, winner, new moves, tags or score calculation. Write one JSON output with apply_patch to ${output}. One attempt; preserve a failed result and report it rather than revise. You may run node scripts/validate-team-ownership-replacement.mjs --packet ${packet.path} --output ${output} --pass ${pass}; this validator reads only the new packet and your output. No extra workers. Return hash and status.\n`;
  writeFileSync(promptPath,prompt,{flag:'wx'});
  writeFileSync(`${folder}/execution-intent.json`,JSON.stringify({status:'frozen-before-execution',at:new Date().toISOString(),pass,modelSlug:'gpt-5.6-sol',reasoningEffort:'low',authentication:'ChatGPT subscription',forkTurns:'none',attemptsAllowed:1,directIncrementalCostUsd:0,packet,prompt:fileRecord(promptPath),audio:fileRecord(run.local('audio/audio-verification.json')),output},null,2)+'\n',{flag:'wx'});
}
console.log('Two disjoint replacement prompts frozen after accepted source and audio gates.');
