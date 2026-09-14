import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileRecord, sha256, serializedJson} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
const args = process.argv.slice(2);
assert.equal(args.length, 2); assert.equal(args[0], '--debate');
const registry = JSON.parse(fs.readFileSync('docs/assessment-production/standalone-debates-v1/registry.json'));
const rec = registry.debates.find(item => item.debateNumber === args[1]); assert(rec);
const read = filename => JSON.parse(fs.readFileSync(filename));
const writeNew = (filename, value) => {assert(!fs.existsSync(filename), `Preserve ${filename}`); fs.mkdirSync(path.dirname(filename), {recursive: true}); fs.writeFileSync(filename, serializedJson(value), {flag: 'wx'});};
const auth = read(`${rec.root}/authorization.json`), manifest = read(`${rec.root}/manifest.json`);
assert.equal(auth.identity.debateId, rec.debateId); assert.equal(auth.identity.videoId, rec.videoId);
for (const lock of Object.values(manifest.controlLocks)) assert.equal(sha256(fs.readFileSync(lock.path)), lock.sha256, `Frozen control changed: ${lock.path}`);
for (const lock of Object.values(manifest.sourceLocks)) assert.equal(sha256(fs.readFileSync(lock.path)), lock.sha256, `Frozen source changed: ${lock.path}`);
const originalPacket = read(`${rec.root}/inventory/packet.json`);
const priorRoot = `${rec.root}/inventory/correction-1`, newRoot = `${rec.root}/inventory/exceptional-correction-2`;
const candidate = read(`${priorRoot}/model-output.json`), diagnosis = read(`${priorRoot}/controller-semantic-review.json`);
assert.equal(diagnosis.status, 'rejected-before-judgment');
const sourceSupplement = read(`${rec.root}/source/caption-only-authorization.json`);
const now = new Date().toISOString();
const exceptionPath = `${newRoot}/authorization.json`;
writeNew(exceptionPath, {
  schemaVersion: '1.0-editor-authorized-bounded-prescore-repair', status: 'authorized-before-execution',
  debateNumber: rec.debateNumber, debateId: rec.debateId, authorizedAt: now,
  exactLatestUserMessage: 'Can you proceed?',
  contextualInterpretation: 'After the assistant explained that the transcript is complete but the exhausted inventory correction omitted material exchanges, the editor asked to proceed. Authorize one additional bounded pre-score inventory correction; not unlimited retries.',
  scope: 'Correct the rejected source-grounded argument map: include the omitted paired exchanges, make necessary coherent pre-score sectioning and weight adjustments, use accurate count rationales and exact meaningful quotes, and assess textual speaker attribution using the newly supplied opening-speaker confirmation. Preserve identity, motion, source words/timestamps, all earlier outputs and scoring rules.',
  model: manifest.modelSettings, attempts: 1, retries: 0, recursiveRetryPermitted: false,
  previousAttempt: fileRecord(`${priorRoot}/model-output.json`), diagnostic: fileRecord(`${priorRoot}/controller-semantic-review.json`),
  captionOnlyInstruction: fileRecord(`${rec.root}/source/caption-only-authorization.json`),
  primaryJudgmentsAlreadyExecuted: false, calculatedScoresExist: false, directCostUsd: 0
});
const packet = {
  ...originalPacket,
  schemaVersion: '1.0-exceptional-prescore-inventory-correction-packet',
  candidate, controllerInspection: diagnosis,
  mechanicalFailure: read(`${priorRoot}/mechanical-audit.json`).failures,
  editorSourceInstruction: sourceSupplement,
  sourceComparison: read(`${rec.root}/source/user-transcript-supplement.json`),
  outputPath: path.resolve(`${newRoot}/model-output.json`),
  readingOutputPath: path.resolve(`${newRoot}/reading-authentication.json`),
  additionalRules: [
    'This is one specifically editor-authorized additional correction, before any accepted inventory or scoring. Use a fresh isolated context. Preserve every prior file; only the two absolute outputPath/readingOutputPath destinations are writable, and both must be new. Do not apply a relative-path patch: the shared tool working directory can differ from your shell working directory.',
    'Read this complete packet and the complete indexed transcript in contiguous, nontruncated blocks. You may inspect only this packet and its three named source files. No network, other debates, repository history, biographies, scores, credentials, or other agents. Use env -u OPENAI_API_KEY -u ANTHROPIC_API_KEY for shell commands. No paid tools.',
    'The editor confirms that Sam Harris is the opening speaker and asks for caption/transcript-only assessment. The pasted transcript exactly duplicates the caption words; it is NOT independent corroboration. This new instruction supersedes the old expectation of acquiring audio, not the need for honest confidence. Evaluate each selected proposition and quotation from explicit names, book/research references, question-answer continuity and local turn changes. High textual attribution is allowed only where individually justified; do not make every confidence high to get through a gate. For genuinely unresolved attribution or material wording, keep medium/low and state the exact ambiguity. No audio was verified.',
    'Repair the enumerated omissions with their relevant opponent replies. Preserve the existing substantive moves and stable semantic IDs unless the source directly demonstrates an error; document any necessary change explicitly in correctionDisposition. Do not omit a new or existing load-bearing argument just to achieve balanced counts. The nested-institutions case is not erased by the later agreement about immigration. Do not give either speaker a position they deny.',
    'Semantic resection is allowed before scoring and may require six or seven sections; four to seven remains the hard limit. WeightPercent must be a positive integer per section and sum to 100. Keep coherent exchanges together; maximum four selected moves per side in any section and ordinary maximum three. Every fourth row needs a source-specific preauthorized rationale, never a generic capacity claim.',
    'Recompute all audit counts FROM YOUR FINAL MOVE ARRAY immediately before submission. rationaleRequired = total difference >= 3 OR any section difference >= 2. When true, explain the actual source-based imbalance, identifying the extra distinct arguments and why they cannot be discarded. Do not state that every section differs by at most one if a section differs by two. These computed audit keys are facts, not editorial preferences.',
    'Keep sourceSpan as startEvent/endEvent indexes; the controller will derive exact excerpt and milliseconds. Minimize cross-speaker padding. A small rolling-caption boundary can include words from the adjacent turn, but never attribute those words to the selected speaker or quote them as theirs. A necessary complete span over 2200 characters requires sourceSpanRationale at least 50 characters explaining why a shorter passage loses the claim or its load-bearing reason.',
    'Choose exact 3–18-word quotations that express a meaningful part of the proposition or inference. Avoid cut-off filler strings such as things so i i would never say or womens equality is. You may supply an empty quote array only when a reliable meaningful quote is unavailable, stating why. Never silently correct recognition errors or quote a position the speaker is rejecting as if they endorse it.',
    'Top-level keys and move schema remain those in the base packet and candidate. Every route includes side, speaker, position and 3–7 bridges with exactly one motion tier and at least one central/subsidiary. Every move has importance 1..3 and rationale, burdenContact, inferenceSummary, confidence and rationale fields, and valid earlier response links/components. Sections use weightPercent and weightRationale, never weight/rationale. Generic numeric IDs are prohibited.',
    'CompleteTranscriptCoverage must partition event 0 through the final event without gaps/overlap, linking selected moves and giving concrete dispositions for unselected substantive exchanges. Do not mark the entire political discussion as unrelated if a specific earlier institutional argument bears on the motion. Never invent a disagreement during substantially aligned later conversation.',
    'Before writing, locally validate JSON, chronology, quotation exactness and lengths, excerpt lengths, source endpoint bounds, side/speaker identity, response-link order, unique semantic IDs, section balance/capacity, all reported counts, rationale triggers and weight sum. Drafting and in-memory checks are allowed; one final two-file submission only, with no rewriting afterward. Root independently runs the full repository validator and semantic review.',
    'Do not invent reading completion timestamps. Use the actual current clock or omit your own timestamp, since the controller authenticates the session. Do not claim code validators ran if you only checked JSON syntax. Include the exact ranges you actually read, source hashes, and a concise correctionDisposition. Never create numerical judgments, scores, winner predictions or fallacy/bias tags.'
  ]
};
writeNew(`${newRoot}/packet.json`, packet);
writeNew(`${newRoot}/plan.json`, {
  schemaVersion: '1.0-exceptional-bounded-prescore-execution-plan', status: 'frozen-before-execution', createdAt: now,
  debateNumber: rec.debateNumber, debateId: rec.debateId, authorization: fileRecord(exceptionPath), model: manifest.modelSettings,
  inputFiles: [fileRecord(`${newRoot}/packet.json`), fileRecord(originalPacket.indexedTranscriptPath), fileRecord(originalPacket.eventsPath), fileRecord(originalPacket.completeSourcePath)],
  allowedOutputs: [packet.outputPath, packet.readingOutputPath], originalCandidateMoves: candidate.moves.length, attempts: 1, retries: 0, directCostUsd: 0
});
console.log(JSON.stringify({status: 'exceptional-correction-authorized-and-frozen', packet: path.resolve(`${newRoot}/packet.json`), outputs: [packet.outputPath, packet.readingOutputPath], model: manifest.modelSettings}, null, 2));
