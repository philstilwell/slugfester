import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { debates } from './src/data/debates.js';
import { fileRecord } from './scripts/lib/assessment-production-standalone-debate-v1.mjs';

export function preparePublicationFiles(debateNumber) {
  const read = p => JSON.parse(fs.readFileSync(p));
  const registry = read('docs/assessment-production/standalone-debates-v1/registry.json');
  const rec = registry.debates.find(r => r.debateNumber === debateNumber);
  assert(rec);
  const base = rec.root, dest = base + '/publication';
  const identity = read(base + '/authorization.json').identity;
  const manifest = read(base + '/manifest.json');
  const ledgerPath = base + '/final-ledger/final-ledger.json';
  const scorePath = base + '/score-pass/output.json';
  const ledger = read(ledgerPath), scores = read(scorePath);
  assert.equal(scores.status, 'single-deterministic-score-pass-complete');
  assert.equal(scores.debateId, rec.debateId);
  assert.equal(ledger.debateId, rec.debateId);
  assert(fs.existsSync(base + '/score-pass/attestation.json'));
  const byId = new Map(ledger.moves.map(m => [m.moveId, m]));
  const time = ms => { const seconds = Math.floor(ms / 1000); return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0'); };
  const sections = scores.sections.map(s => {
    const moves = ledger.moves.filter(m => m.sectionId === s.sectionId);
    const sideCards = Object.fromEntries(['pro', 'con'].map(side => [side, s.sides[side].moves.map(m => ({ ledgerMoveId: m.moveId, time: time(byId.get(m.moveId).sourceSpan.startMs), score: m.score, role: '', words: '', critique: '', tags: [] }))]));
    const exchanges = Array.from({ length: Math.max(sideCards.pro.length, sideCards.con.length) }, (_, i) => Object.fromEntries(['pro', 'con'].filter(side => sideCards[side][i]).map(side => [side, sideCards[side][i]])));
    return { sectionId: s.sectionId, title: s.title, timebox: time(Math.min(...moves.map(m => m.sourceSpan.startMs))) + '–' + time(Math.max(...moves.map(m => m.sourceSpan.endMs))), score: { pro: s.sides.pro.score, con: s.sides.con.score }, exchanges };
  });
  const minutes = Math.round(read('.assessment-cache/captions/' + rec.videoId + '/manifest.json').durationSeconds / 60);
  assert(Number.isFinite(minutes));
  const skeleton = {
    number: rec.debateNumber, id: rec.debateId,
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    title: identity.title, label: identity.label, topicCategory: identity.topicCategory, youtubeUrl: identity.canonicalUrl,
    duration: Math.floor(minutes / 60) + ' hr ' + minutes % 60 + ' min', motion: identity.motion,
    assessmentModel: manifest.modelSettings.displayLabel, assessmentRubric: 'Slugfester Reassessment Rubric v2', sourceNote: '', scoringNote: '',
    sides: Object.fromEntries(['pro', 'con'].map((side, i) => [side, { name: identity[side].position, speaker: identity[side].speaker, color: i ? 'coral' : 'teal' }])),
    score: { pro: scores.overall.pro.score, con: scores.overall.con.score, winner: scores.winner }, summary: '',
    quotes: { pro: { text: '', context: '' }, con: { text: '', context: '' } }, sections,
    overall: Object.fromEntries(['pro', 'con'].map(side => [side, { score: scores.overall[side].score, strengths: ['', '', ''], blunders: [{ text: '', links: [] }, { text: '', links: [] }] }])),
    logicalExtension: Object.fromEntries(['pro', 'con'].map(side => [side, { finalArgument: { thesis: '', premises: ['', '', '', '', ''], conclusion: '' }, newArguments: Array.from({ length: 3 }, () => ({ title: '', text: '' })) }]))
  };
  const wc = s => String(s).trim().split(/\s+/).filter(Boolean).length;
  const excludedNumbers = new Set(registry.debates.map(r => Number(r.debateNumber)));
  const refs = debates.filter(d => Number(d.number) < Number(debateNumber) && !excludedNumbers.has(Number(d.number))).slice(-25);
  assert.equal(refs.length, 25);
  const means = refs.map(d => { const cards = d.sections.flatMap(s => s.exchanges.flatMap(e => ['pro', 'con'].flatMap(side => e[side] ? [e[side]] : []))); return Number((cards.reduce((sum, c) => sum + wc(c.words), 0) / cards.length).toFixed(1)); }).sort((a, b) => a - b);
  const benchmark = { schemaVersion: '1.0-standalone-prepublication-depth-benchmark', debateNumber, debateId: rec.debateId, source: fileRecord('src/data/debates.js'), referenceWindow: { debateNumbers: refs.map(d => d.number), count: refs.length, excludesAllRegisteredStandaloneDebates: true }, argumentMean: { minimum: means[0], median: means[12], maximum: means.at(-1) }, requiredArgumentMinimumMean: Number(Math.max(20, means[12] - 1).toFixed(1)), participantJudgmentsAffected: false, proseSharedWithWriter: false };
  const snapshots = Object.fromEntries([
    ['output-contract.md', '/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md'],
    ['add-debate-skill.md', '/Users/philstilwell/.codex/skills/add-slugfester-youtube-debate/SKILL.md'],
    ['single-debate-runbook.md', '/Users/philstilwell/.codex/skills/add-slugfester-youtube-debate/references/single-debate-runbook.md']
  ].map(([name, source]) => [dest + '/control-snapshots/' + name, fs.readFileSync(source, 'utf8')]));
  const controls = ['docs/assessment-production-workflow.md', 'docs/reassessment-rubric-v2.1.md', 'docs/assessment-workflow-v4.2.21.17.41.md', ...Object.keys(snapshots), 'scripts/lib/assessment-production-standalone-debate-v1.mjs', 'tmp-standalone-check-publication.mjs'];
  const inputText = p => snapshots[p] ?? fs.readFileSync(p, 'utf8');
  const sourcePath = '.assessment-cache/captions/' + rec.videoId + '/indexed-transcript.txt';
  const audioContextPath = base + '/adjudication/audio-context.json';
  const allowedInputs = [ledgerPath, scorePath, sourcePath, audioContextPath, ...controls].map(p => { const text = inputText(p); return { path: p, bytes: Buffer.byteLength(text), sha256: crypto.createHash('sha256').update(text).digest('hex') }; });
  const readingPlan = allowedInputs.flatMap(lock => { const lines = inputText(lock.path).trimEnd().split('\n'), ranges = []; for (let start = 0; start < lines.length;) { let end = start, size = 0; while (end < lines.length && end - start < 200 && (size < 12000 || end === start)) size += lines[end++].length + 1; ranges.push({ path: lock.path, firstLine: start + 1, lastLine: end }); start = end; } return ranges; });
  const outputRequirements = { schemaVersion: '1.0-standalone-publication-output', protocolId: manifest.protocolId, status: 'complete-publication-prose-candidate', debateNumber, debateId: rec.debateId, audit: { model: manifest.modelSettings.model, reasoningEffort: manifest.modelSettings.reasoningEffort, directIncrementalCostUsd: 0, cardCount: ledger.moves.length, sectionCount: sections.length, tagsDeferred: true, blunderLinksDeferred: true, scoresChanged: false, publicationAttempt: 1 } };
  const packet = {
    schemaVersion: '1.0-standalone-publication-packet', status: 'frozen-before-publication-context', debateNumber, debateId: rec.debateId, model: manifest.modelSettings,
    ledgerPath, scorePath, sourcePath, transcriptPath: '.assessment-cache/captions/' + rec.videoId + '/transcript.txt', audioContextPath,
    outputPath: path.resolve(dest + '/output.json'), lockedCandidateSkeleton: skeleton, argumentMinimumMean: benchmark.requiredArgumentMinimumMean,
    readingGate: { beforeDrafting: true, controllerAuthenticationRequired: true, outputForbiddenUntilControllerRelease: true }, readingPlan, allowedInputs,
    sourceDisposition: { completeAutomaticEnglishCaptions: true, independentCaptionBlindAudioTranscriptionClips: read(base + '/audio/audio-verification.json').supplementalChecks.length, directListening: false, fullDebateAudioVerified: false, quotePolicy: 'Only exact frozen quoteEligibleExactSpans; do not silently correct captions in direct quotations.', primarySpeakerScopeException: identity.primarySpeakerScopeException },
    writingContract: [
      'Fill only empty prose strings in lockedCandidateSkeleton. Preserve all nonempty strings, numbers, structure, move order, scores, roles of sides, timestamps, identity and empty tags/blunder links. Every scored move appears exactly once.',
      'Read every listed input range completely and literally before drafting. Use bounded separate calls; fix missing/truncated reads. At the reading checkpoint send the controller a message and stop without drafting. Wait for explicit controller release.',
      'After release draft all prose in memory. Run checkPublication on the COMPLETE in-memory output through --check-stdin before the single final apply_patch write. Fix any unsaved draft errors in memory, not by repeatedly editing a submitted file. One attempt, no retries, no placeholders, no additional files.',
      'Each description should normally contain 22–28 words and state the move’s claim, reason or comparison, and intended inference or consequence. Never add an unsupported premise for length. Roles are concise 1–5-word labels.',
      'Each critique must contain 105–130 words, at least 880 characters, and exactly four sentences, labeled Strongest feature:, Principal limitation:, Live burden:, Locked score: in that order. Aim near 120–125 words only where needed to meet character depth naturally; never use decorative padding. Discuss the particular inference, evidence, strongest live objection and remaining burden. Caption noise is not a participant defect. Critiques must fit the locked dimensions and score without generic interchangeable tails, stock paragraphs or repetitive filler. Check both words and characters for every critique before submission.',
      'Summary 18–28 words preferred; formal range 8–35. Quote 6–14 words preferred; formal range 3–18, exact source substring. Quote context 12–55 words. Select representative argument-bearing statements, not applause or personal remarks.',
      'Provide exactly three concrete overall strengths and two material blunders per side. Aim 16–24 words per item with substantive scope, not cryptic headlines. Base commentary on weighted locked performance; do not characterize the worldview itself as disproved.',
      'Provide a strengthened final argument with thesis, five premises and proportionate conclusion per side, plus three genuinely distinct new reinforcing arguments. Thesis about 28–36 words, premises 24–29, conclusion 26–34, reinforcing prose 80–100 (hard 45–130); lengths guide depth and are not padding quotas. Each item needs new inferential substance and a source-aware novelty explanation.',
      'AI Contribution must sound like natural philosophical argument, not a generation template. Begin with the substantive claim, reason, contrast or consequence. No AI-generated extension, AI-developed extension, possible extension, AI reconstruction, unassailable, repeated a-model-would launchers, mirrored paragraph scaffolds or interchangeable abstractions. One section-level disclosure is handled by the renderer; do not repeat provenance inside individual contributions. Preserve ordinary punctuation.',
      'The source note must disclose complete automatic captions, limited independent caption-blind transcription of the stated number of clips, no direct listening or complete-audio verification, and quote-versus-condensation distinction. Name the excluded hosts: Dan Panetti and Caleb, the unnamed moderator, and Larry Taylor; excluded host advocacy totals about 4 minutes 58 seconds or 3.45% of the assessed window. Neither side receives credit or penalty for excluded participation or dependent replies. Do not describe supplemental transcription as historical or scientific fact verification.',
      'The scoring note must explicitly call scores AI-generated estimates of argument performance rather than truth and distinguish the unscored AI Contribution.',
      'Output includes the required wrapper identity, candidate, sourceQuoteAudit (pro then con), noveltyMap and exact audit object. sourceQuoteAudit fields: side, speaker, moveId, text, sourcePath equal ledgerPath, transcriptPath, startEvent,endEvent,startMs,endMs copied from that ledger move, quoteEligibleExactSpan copied verbatim, exactMatch:true.',
      'noveltyMap order: pro finalArgument,newArguments[0],newArguments[1],newArguments[2], then con same order. Each item has side, field, path equal candidate.logicalExtension.SIDE.FIELD, sourceMoveIds, explanation of at least 12 words, hypothetical:true. Empty sourceMoveIds is allowed only for an explained genuinely new line.',
      'Do not access other debates, legacy prose, raw primary passes, failed attempts, Git, external research, credentials, paid APIs or new agents. Use env -u OPENAI_API_KEY -u ANTHROPIC_API_KEY for shells. Subscription-backed direct additional cost is zero.'
    ], outputRequirements
  };
  const serialize = o => JSON.stringify(o, null, 2) + '\n';
  const packetContent = serialize(packet);
  const packetRecord = { path: dest + '/input-bundle.json', bytes: Buffer.byteLength(packetContent), sha256: crypto.createHash('sha256').update(packetContent).digest('hex') };
  const plan = { schemaVersion: '1.0-isolated-publication-execution-plan', status: 'frozen-before-model-execution', debateNumber, debateId: rec.debateId, model: manifest.modelSettings, inputs: [packetRecord, ...allowedInputs], sourcePath, packetPath: packetRecord.path, outputPath: packet.outputPath, oneAttempt: true, retries: 0, forkTurns: 'none', readingGateRequired: true, directIncrementalCostUsd: 0 };
  const files = { ...snapshots, [dest + '/editorial-depth-benchmark.json']: serialize(benchmark), [packetRecord.path]: packetContent, [dest + '/execution-plan.json']: serialize(plan) };
  for (const p of Object.keys(files)) assert(!fs.existsSync(p), 'Preserve ' + p);
  return { files, summary: { packetPath: path.resolve(packetRecord.path), outputPath: packet.outputPath, readingRanges: readingPlan.length, cards: ledger.moves.length, sections: sections.length, argumentMinimumMean: packet.argumentMinimumMean } };
}
if (process.argv[2] === '--debate') console.log(JSON.stringify(preparePublicationFiles(process.argv[3])));
