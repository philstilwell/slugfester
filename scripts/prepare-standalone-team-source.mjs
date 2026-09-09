import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileRecord } from "./lib/assessment-production-multi-speaker-approximation-v1.mjs";
const args = process.argv.slice(2);
assert.equal(args.length, 4, "usage: --debate NNN --identity identity.json");
assert.equal(args[0], "--debate"); assert.equal(args[2], "--identity");
const number = args[1]; assert.match(number, /^\d{2,}$/);
const input = JSON.parse(readFileSync(args[3], "utf8"));
assert.equal(input.identity.debateNumber, number);
const registryPath = "docs/assessment-production/standalone-debates-v1/registry.json";
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
assert.equal(number, String(Math.max(...registry.debates.map(d => Number(d.debateNumber))) + 1));
assert(!registry.debates.some(d => d.videoId === input.identity.videoId || d.debateId === input.identity.debateId));
const root = `docs/assessment-production/standalone-debates-v1/debate-${number}`;
assert(!existsSync(root), "existing debate files must be preserved");
const cache = `.assessment-cache/captions/${input.identity.videoId}`;
mkdirSync(cache, { recursive: true });
for (const file of ["transcript.txt", "events.json", "manifest.json", "captions.srv3.xml"]) {
  assert(!existsSync(`${cache}/${file}`));
  copyFileSync(`${input.captionDirectory}/${file}`, `${cache}/${file}`);
}
const source = JSON.parse(readFileSync(`${cache}/manifest.json`, "utf8"));
assert.equal(source.videoId, input.identity.videoId);
assert.equal(fileRecord(`${cache}/transcript.txt`).sha256, source.transcriptSha256);
assert.equal(fileRecord(`${cache}/events.json`).sha256, source.normalizedEventsSha256);
assert.equal(fileRecord(`${cache}/captions.srv3.xml`).sha256, source.rawCaptionSha256);
const events = JSON.parse(readFileSync(`${cache}/events.json`, "utf8"));
let end = 0; let prior = -1; const gaps = [];
for (const event of events) {
  assert(Number.isInteger(event.startMs) && event.startMs >= prior && event.text.trim());
  if (event.startMs > end + 20000) gaps.push({startMs:end,endMs:event.startMs});
  prior = event.startMs; end = Math.max(end, event.startMs + event.durationMs);
}
assert.equal(events.length, source.eventCount);
const json = (p, value) => { assert(!existsSync(p)); writeFileSync(p, JSON.stringify(value, null, 2)+"\n"); };
mkdirSync(`${root}/source`, {recursive:true}); mkdirSync(`${root}/inventory`, {recursive:true});
const head = execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim();
const authorization = {
  schemaVersion:"1.0-standalone-team-authorization", validationProfile:"team-approximation-v1",
  status:"source-and-inventory-authorized", authorizedAt:new Date().toISOString(),
  userAuthorization:"User approved implementing two-team support and processing this recording, preserving individual move attribution and preventing duplicate team credit.",
  identity:input.identity, repositoryBaseline:head,
  execution:{modelSlug:"gpt-5.6-sol",modelLabel:"5.6 Sol",reasoningEffort:"low",authentication:"ChatGPT subscription",primaryPasses:2,isolatedContexts:true},
  cost:{directIncrementalCostUsd:0,paidTranscriptionMaximumUsd:1,paidEstimateRequiredBeforeCall:true},
  gates:{oneScorePass:true,allSelectedMovesAudioVerified:true,independentInventoryAudit:true,historicalEvidenceImmutable:true,publicationRequiresCompleteTeamAudit:true},
  repair:{inventoryCorrectionCyclesMaximum:1,publicationWritableLeafFieldsMaximum:2,attemptsPerPublicationShard:1},
  allowedPaths:[root,cache]
};
json(`${root}/authorization.json`,authorization);
const controlPaths = ["docs/assessment-standalone-team-debate-v1.md","docs/assessment-multi-speaker-approximation-workflow-v1.md","docs/reassessment-rubric-v2.1.md","scripts/lib/assessment-production-multi-speaker-approximation-v1.mjs","scripts/lib/assessment-standalone-team-debate-v1.mjs","scripts/lib/reassessment-scoring.mjs","docs/assessment-production/score-stability-policy-v2.2-promotion.json","scripts/lib/assessment-production-score-stability-policy-active.mjs","scripts/test-assessment-production-score-stability-policy-active.mjs"];
json(`${root}/manifest.json`, {schemaVersion:"1.0-standalone-team-source-manifest",status:"source-locked-before-inventory",identity:input.identity,authorization:fileRecord(`${root}/authorization.json`),controls:controlPaths.map(fileRecord),source:["transcript.txt","events.json","manifest.json","captions.srv3.xml"].map(f=>fileRecord(`${cache}/${f}`)),publicationReady:false});
json(`${root}/source/source-lock.json`, {identity:input.identity,manifest:source,coverage:{firstStartMs:events[0].startMs,maximumEndMs:end,gapsOver20Seconds:gaps},participants:{dyadicGatePassed:false,teamModeAuthorized:true},status:"complete-caption-candidate-scope-review-required"});
registry.debates.push({debateNumber:number,debateId:input.identity.debateId,videoId:input.identity.videoId,root,validationProfile:"team-approximation-v1",status:"source-and-inventory-authorized",productionLedger:{path:`docs/assessment-ledgers/${input.identity.debateId}.json`}});
writeFileSync(registryPath, JSON.stringify(registry,null,2)+"\n");
console.log(JSON.stringify({root,cache,coverageEndMs:end,gaps,authorization:fileRecord(`${root}/authorization.json`)},null,2));
