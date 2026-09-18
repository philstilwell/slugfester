import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileRecord, validateStandaloneAdjudication } from './scripts/lib/assessment-production-standalone-debate-v1.mjs';

export function auditAdjudicationSession(debateNumber, sessionPath, options = {}) {
  const read = p => JSON.parse(fs.readFileSync(p));
  const record = read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(r => r.debateNumber === debateNumber);
  assert(record, 'Current debate must be registered');
  const base = options.adjudicationRoot ?? record.root + '/adjudication';
  const plan = read(base + '/execution-plan.json');
  const instructions = read(base + '/execution-instructions.json');
  const output = fs.existsSync(plan.outputPath) ? read(plan.outputPath) : null;
  const packet = read(instructions.packetPath);
  assert(output || options.readingGateOnly, 'Adjudication output is missing');
  const schemaValidation = output ? validateStandaloneAdjudication(output, packet) : { status: 'not-run-reading-checkpoint-only' };
  for (const lock of plan.inputs) assert.equal(fileRecord(lock.path).sha256, lock.sha256, 'Changed frozen input: ' + lock.path);
  const sessionBytes = fs.readFileSync(sessionPath);
  const rows = sessionBytes.toString().trim().split('\n').map(JSON.parse);
  const calls = new Map(rows.filter(r => r.type === 'response_item' && ['function_call', 'custom_tool_call'].includes(r.payload.type)).map(r => [r.payload.call_id, r]));
  const input = r => r?.payload.input ?? r?.payload.arguments ?? '';
  const unwrap = v => {
    if (Array.isArray(v)) return v.map(unwrap).join('\n');
    if (v && typeof v === 'object') return typeof v.output === 'string' ? unwrap(v.output) : typeof v.text === 'string' ? unwrap(v.text) : JSON.stringify(v);
    if (typeof v !== 'string') return String(v);
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed) && parsed.every(x => x && typeof x === 'object' && (typeof x.text === 'string' || typeof x.output === 'string'))) return unwrap(parsed);
      if (parsed && typeof parsed === 'object' && (typeof parsed.output === 'string' || (parsed.type === 'text' && typeof parsed.text === 'string'))) return unwrap(parsed);
      return v;
    } catch { return v; }
  };
  const returns = rows.filter(r => r.type === 'response_item' && ['function_call_output', 'custom_tool_call_output'].includes(r.payload.type)).map(r => ({ row: r, text: unwrap(r.payload.output), call: calls.get(r.payload.call_id) }));
  const submissions = [...calls.values()].filter(r => input(r).includes('tools.apply_patch('));
  const firstSubmission = submissions[0]?.ordinal ?? Infinity;
  const priorReturns = returns.filter(r => r.row.ordinal < firstSubmission);
  const visibleLines = new Set(priorReturns.flatMap(r => r.text.split('\n').map(l => l.trim())).filter(Boolean));
  const inputAuthentication = plan.inputs.map(lock => {
    const raw = fs.readFileSync(lock.path, 'utf8').trimEnd();
    const lines = [...new Set(raw.split('\n').map(l => l.trim()).filter(Boolean))];
    const completeDocumentCalls = priorReturns.filter(r => r.text.includes(raw)).map(r => r.row.payload.call_id);
    const missingLines = completeDocumentCalls.length ? [] : lines.filter(l => !visibleLines.has(l));
    return { ...lock, complete: !missingLines.length, uniqueNonemptyLines: lines.length, literalVisibleLines: lines.length - missingLines.length, missingLineCount: missingLines.length, completeDocumentCalls, method: 'Only literal returned lines before submission are credited; projected JSON may require separate controller review.' };
  });
  const sourceLock = plan.inputs.find(l => l.path.endsWith('/indexed-transcript.txt'));
  assert(sourceLock);
  const sourceLines = fs.readFileSync(sourceLock.path, 'utf8').trimEnd().split('\n');
  const exactLines = new Set(priorReturns.flatMap(r => r.text.split('\n')));
  const sourceReadCalls = priorReturns.filter(r => sourceLines.some(line => r.text.split('\n').includes(line))).map(r => r.row.payload.call_id);
  const missingSourceEvents = sourceLines.filter(l => !exactLines.has(l)).map(l => Number(l.split('\t')[0]));
  const actualModels = rows.filter(r => r.type === 'turn_context').map(r => ({ model: r.payload.model, reasoningEffort: r.payload.effort }));
  assert(actualModels.length && actualModels.every(m => m.model === plan.model.model && m.reasoningEffort === plan.model.reasoningEffort));
  const completeSourceRead = missingSourceEvents.length === 0;
  return {
    schemaVersion: '1.0-isolated-adjudication-execution-audit',
    status: completeSourceRead && inputAuthentication.every(r => r.complete) ? 'input-authenticated-controller-review-required' : 'rejected-required-input-reading-incomplete',
    debateNumber, debateId: record.debateId,
    agentPath: rows.find(r => r.type === 'session_meta')?.payload.agent_path,
    model: plan.model, actualModels,
    session: { path: sessionPath, bytes: sessionBytes.length, sha256: crypto.createHash('sha256').update(sessionBytes).digest('hex') },
    executionPlan: fileRecord(base + '/execution-plan.json'),
    output: output ? fileRecord(path.relative(process.cwd(), plan.outputPath)) : null,
    schemaValidation, frozenInputHashesUnchanged: true,
    inputAuthentication,
    sourceReading: { source: sourceLock, expectedEvents: sourceLines.length, authenticatedEvents: sourceLines.length - missingSourceEvents.length, completeSourceReadBeforeSubmission: completeSourceRead, authenticatedReadCallIds: sourceReadCalls, missingEventRanges: missingSourceEvents.reduce((ranges, n) => { const last = ranges.at(-1); if (last && last[1] + 1 === n) last[1] = n; else ranges.push([n, n]); return ranges; }, []) },
    claimedReadingAuthentication: output?.readingAuthentication ?? null,
    submissionCalls: submissions.map(r => ({ callId: r.payload.call_id, timestamp: r.timestamp, outputPathPresent: input(r).includes(plan.outputPath) })),
    toolCallEvidence: priorReturns.filter(r => /tools\.exec_command|tools\.write_stdin/.test(input(r.call))).map(r => ({ callId: r.row.payload.call_id, timestamp: r.row.timestamp, commandSha256: crypto.createHash('sha256').update(input(r.call)).digest('hex'), commandPreview: input(r.call).slice(0,2000), outputCharacters: r.text.length, truncated: /tokens truncated|Warning: truncated output/.test(r.text) })),
    attempts: 1, retries: 0, directIncrementalCostUsd: 0,
    auditedAt: new Date().toISOString()
  };
}
if (process.argv[2]) console.log(JSON.stringify(auditAdjudicationSession(process.argv[2], process.argv[3]), null, 2));
