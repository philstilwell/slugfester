import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileRecord, serializedJson, validateStandaloneInventory} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
const args = process.argv.slice(2);
assert.equal(args.length, 6);
assert.equal(args[0], '--debate'); assert.equal(args[2], '--attempt'); assert.equal(args[4], '--session');
const read = p => JSON.parse(fs.readFileSync(p));
const registry = read('docs/assessment-production/standalone-debates-v1/registry.json');
const rec = registry.debates.find(r => r.debateNumber === args[1]); assert(rec);
assert.match(args[3], /^[a-z0-9-]+$/);
const root = rec.root, attempt = `${root}/inventory/${args[3]}`;
const auth = read(`${root}/authorization.json`), manifest = read(`${root}/manifest.json`);
const candidatePath = `${attempt}/source-expanded-candidate.json`, candidate = read(candidatePath);
const rawPath = `${attempt}/model-output.json`, rawHash = fileRecord(rawPath).sha256;
const reviewPath = `${root}/source/text-attribution-review.json`, review = read(reviewPath);
const eventPath = `.assessment-cache/captions/${rec.videoId}/events.json`, events = read(eventPath);
const fullText = events.map(e => e.text).join(' ').replace(/\s+/g, ' ').trim();
assert.equal(candidate.debateNumber, rec.debateNumber); assert.equal(candidate.debateId, rec.debateId);
assert.equal(candidate.motion, auth.identity.motion); assert.equal(read(`${attempt}/mechanical-audit.json`).failures.length, 0);
for (const p of [`${root}/inventory/inventory.json`, `${root}/judgments/pass-a/output.json`, `${root}/judgments/pass-b/output.json`, `${root}/score-pass/output.json`]) assert(!fs.existsSync(p), `Already frozen/executed: ${p}`);
assert.deepEqual(review.moves.map(m => m.moveId), candidate.moves.map(m => m.moveId));
for (const anchor of Object.values(review.anchors)) assert(fullText.includes(anchor.exactText), `Missing source anchor: ${anchor.exactText}`);
const changes = [];
for (const [i, move] of candidate.moves.entries()) {
  const item = review.moves[i]; assert.equal(item.side, move.side);
  assert(item.anchors.every(k => review.anchors[k]));
  assert.equal(item.confidence, 'high'); assert(item.rationale.length >= 80);
  changes.push({moveId: move.moveId, before: {confidence: move.attributionConfidence, rationale: move.attributionRationale}, after: {confidence: item.confidence, rationale: `${item.rationale} Text-based identity review only; no audio was checked.`}});
  move.attributionConfidence = item.confidence;
  move.attributionRationale = changes.at(-1).after.rationale;
}
const coverageEdits = [];
const blocks = Array.isArray(candidate.completeTranscriptCoverage) ? candidate.completeTranscriptCoverage : candidate.completeTranscriptCoverage.blocks;
for (const [i, block] of blocks.entries()) if (block.reason.includes('конец')) {
  const before = block.reason; block.reason = before.replace('конец represented', 'represented');
  assert.notEqual(before, block.reason); coverageEdits.push({blockIndex: i, before, after: block.reason});
}
assert.equal(coverageEdits.length, 1);
const validation = validateStandaloneInventory(candidate, events);
const before = read(candidatePath);
for (const [i, move] of candidate.moves.entries()) {
  const {attributionConfidence: a, attributionRationale: b, ...rest} = move;
  const {attributionConfidence: c, attributionRationale: d, ...old} = before.moves[i];
  assert.deepEqual(rest, old, `Non-attribution move field changed: ${move.moveId}`);
}
for (const key of Object.keys(before).filter(k => !['moves', 'completeTranscriptCoverage'].includes(k))) assert.deepEqual(candidate[key], before[key]);
const sessionBytes = fs.readFileSync(args[5]), session = sessionBytes.toString().trim().split('\n').map(JSON.parse);
const meta = session.find(x => x.type === 'session_meta').payload;
const turns = session.filter(x => x.type === 'turn_context');
assert(turns.length && turns.every(x => x.payload.model === manifest.modelSettings.model && x.payload.effort === manifest.modelSettings.reasoningEffort));
const calls = session.filter(x => x.payload.type === 'custom_tool_call');
const outputs = session.filter(x => x.payload.type === 'custom_tool_call_output');
const sourceReadRanges = [[1,600],[601,1200],[1201,1800],[1801,events.length]];
const packetReadRanges = [[1,260],[261,620],[621,1200],[1201,1590]];
for (const [filename, ranges] of [['indexed-transcript.txt',sourceReadRanges], ['packet.json',packetReadRanges]]) for (const [a,b] of ranges) {
  const call = calls.find(x => x.payload.input.includes(filename) && x.payload.input.includes(`${a},${b}p`)); assert(call, `Missing complete read ${filename} ${a}-${b}`);
  const out = outputs.find(x => x.payload.call_id === call.payload.call_id); assert(out);
  assert(!/tokens truncated|Warning: truncated output/i.test(JSON.stringify(out.payload.output)), `Required read truncated: ${filename} ${a}-${b}`);
}
const reading = read(`${attempt}/reading-authentication.json`), plan = read(`${attempt}/plan.json`);
for (const record of plan.inputFiles) assert.equal(fileRecord(record.path).sha256, record.sha256);
assert.equal(reading.sourceHashes.packetSha256, fileRecord(`${attempt}/packet.json`).sha256);
const allowedOutputCalls = calls.filter(x => /writeFileSync/.test(x.payload.input));
assert.equal(allowedOutputCalls.length, 1, 'Unexpected number of final write submissions');
const finalWrite = allowedOutputCalls[0];
assert(finalWrite.payload.input.includes('P.outputPath') || finalWrite.payload.input.includes('P.inventoryOutputPath') || finalWrite.payload.input.includes('outputPath'));
const now = new Date().toISOString();
const writes = [
  [`${attempt}/execution.json`, {
    schemaVersion:'1.0-authenticated-prescore-execution', status:'completed-and-authenticated', debateNumber:rec.debateNumber, debateId:rec.debateId,
    model:manifest.modelSettings, agentPath:meta.agent_path, sessionId:meta.id,
    sessionRecord:{path:args[5],sha256:crypto.createHash('sha256').update(sessionBytes).digest('hex'),bytes:sessionBytes.length},
    startedAt:session[0].timestamp, completedAt:session.at(-1).timestamp, authenticatedAt:now,
    freshContext:true,forkTurns:'none',inputFiles:plan.inputFiles,
    additionalProceduralInput:{path:'/Users/philstilwell/.codex/skills/reassess-slugfester-debates/SKILL.md',sha256:crypto.createHash('sha256').update(fs.readFileSync('/Users/philstilwell/.codex/skills/reassess-slugfester-debates/SKILL.md')).digest('hex'),purpose:'Mandatory skill instruction read; not debate evidence or legacy scoring data.'},
    fullRequiredReadsUntruncated:true,sourceReadRanges,packetReadRanges,
    redundantOutputTruncations:outputs.filter(x=>/tokens truncated|Warning: truncated output/i.test(JSON.stringify(x.payload.output))).map(x=>({timestamp:x.timestamp,disposition:'Redundant packet query or in-memory draft display; complete required packet/source reads above were untruncated.'})),
    finalOutput:fileRecord(rawPath),readingAuthentication:fileRecord(`${attempt}/reading-authentication.json`),
    finalWriteTimestamp:finalWrite.timestamp,attempts:1,retries:0,finalSubmissions:1,
    apiKeyHandling:'Evidence processing and drafting commands removed OPENAI_API_KEY and ANTHROPIC_API_KEY. The initial read-only procedural skill-file read did not unset them; no credential read or metered API execution occurred. Do not attest that the underlying runtime environment was purged.',
    isolationAudit:'Tool-call inspection found no other debate, legacy judgment, score, ranking, winner, publication prose, network, or credential input. Root task messages were not inherited.',
    directCostUsd:0
  }],
  [`${root}/inventory/inventory.json`,candidate],
  [`${attempt}/controller-acceptance.json`, {
    schemaVersion:'1.0-prelock-controller-acceptance',status:'accepted-after-source-review',debateNumber:rec.debateNumber,debateId:rec.debateId,acceptedAt:now,
    rawOutput:fileRecord(rawPath),expandedCandidate:fileRecord(candidatePath),textAttributionReview:fileRecord(reviewPath),
    source:eventPath,validation,attributionChanges:changes,internalCoverageCopyEdits:coverageEdits,
    unchanged:'All selected move IDs, speaker identities, propositions, reasons, inferences, source words/timestamps, quotes, importance, burden links, sections, weights, and capacity/count audits are identical to the expanded worker candidate. Only attribution confidence/rationales and one non-substantive coverage-copy token changed before canonical acceptance.',
    sourceAudioDisposition:'No audio acquired, listened to, or transcribed. Text-based identity review resolves the selected proposition owners, not every word boundary. Material-wording confidence remains as reported, and either judge may flag a substantive uncertainty before adjudication.',
    primaryJudgmentsAlreadyExecuted:false,scorePassAlreadyExecuted:false,directCostUsd:0
  }]
];
for (const [p] of writes) assert(!fs.existsSync(p), `Preserve existing ${p}`);
for (const [p, value] of writes) {fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, serializedJson(value), {flag:'wx'});}
const preservedManifest = `${root}/inventory/manifest-before-inventory-lock.json`;
assert(!fs.existsSync(preservedManifest)); fs.copyFileSync(`${root}/manifest.json`,preservedManifest,fs.constants.COPYFILE_EXCL);
for (const [key, p] of Object.entries({inventory:`${root}/inventory/inventory.json`,inventoryAcceptance:`${attempt}/controller-acceptance.json`,inventoryExecution:`${attempt}/execution.json`,textAttributionReview:reviewPath,captionOnlyAuthorization:`${root}/source/caption-only-authorization.json`,userTranscriptSupplement:`${root}/source/user-transcript-supplement.json`})) manifest.sourceLocks[key]=fileRecord(p);
manifest.inventoryAcceptedAt=now;
fs.writeFileSync(`${root}/manifest.json`,serializedJson(manifest));
assert.equal(fileRecord(rawPath).sha256,rawHash);
console.log(JSON.stringify({inventory:fileRecord(`${root}/inventory/inventory.json`),validation,sourceMethod:'Text only; no audio verified',directCostUsd:0},null,2));
