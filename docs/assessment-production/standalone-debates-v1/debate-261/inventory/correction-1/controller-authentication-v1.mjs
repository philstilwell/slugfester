import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileRecord, serializedJson } from './lib/assessment-production-standalone-debate-v1.mjs';
const [shardId, sessionPath] = process.argv.slice(2);
const number = '261';
const read = p => JSON.parse(readFileSync(p));
const route = read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(x => x.debateNumber === number);
const plan = read(`${route.root}/inventory/correction-1/plan.json`);
const shard = plan.packets.find(x => x.shardId === shardId);
assert.ok(shard && sessionPath?.startsWith('/Users/philstilwell/.codex/sessions/'));
assert.deepEqual(fileRecord(shard.packet.path), shard.packet);
const expected = readFileSync(shard.packet.path, 'utf8');
const buffer = readFileSync(sessionPath);
const rows = buffer.toString().trim().split('\n').map(JSON.parse);
const metadata = rows.find(x => x.type === 'session_meta').payload;
const contexts = rows.filter(x => x.type === 'turn_context');
assert.ok(contexts.length && contexts.every(x => x.payload.model === 'gpt-5.6-sol' && x.payload.effort === 'low'));
const calls = rows.filter(x => ['function_call', 'custom_tool_call'].includes(x.payload?.type));
assert.ok(calls.every(x => ['exec', 'send_message'].includes(x.payload.name)));
assert.equal(calls.filter(x => String(x.payload.input ?? x.payload.arguments).includes('apply_patch')).length, 0);
const pages = [];
function inspectText(text) {
  assert.ok(!text.includes('Warning: truncated output') && !text.includes('tokens truncated'));
  for (const line of text.split('\n')) {
    let parsed;
    try { parsed = JSON.parse(line); } catch { continue; }
    if (Number.isInteger(parsed?.start) && Number.isInteger(parsed?.end) && typeof parsed?.text === 'string') pages.push(parsed);
    else if (typeof parsed?.output === 'string') inspectText(parsed.output);
  }
}
for (const row of rows.filter(x => ['function_call_output', 'custom_tool_call_output'].includes(x.payload?.type))) {
  const output = row.payload.output;
  if (Array.isArray(output)) for (const block of output) { if (typeof block.text === 'string') inspectText(block.text); }
  else if (typeof output === 'string') inspectText(output);
}
let next = 0;
for (const page of pages) {
  assert.equal(page.start, next);
  assert.ok(page.end > page.start && page.end - page.start <= 7000);
  assert.equal(page.text, expected.slice(page.start, page.end));
  next = page.end;
}
assert.equal(next, expected.length);
assert.equal(pages.map(p => p.text).join(''), expected);
const path = `${route.root}/inventory/correction-1/${shardId}/reading-authentication.json`;
assert.equal(existsSync(path), false);
const report = {
  schemaVersion: '1.0-authenticated-bounded-repair-reading', status: 'complete-exact-reading-authenticated-release-permitted',
  debateNumber: number, debateId: route.debateId, shardId, agentPath: metadata.agent_path,
  model: 'gpt-5.6-sol', reasoningEffort: 'low', isolation: 'fresh-built-in-subagent-fork-none',
  packet: shard.packet, sessionPrefix: {path:sessionPath, bytes:buffer.length, sha256:createHash('sha256').update(buffer).digest('hex'), observedAt:new Date().toISOString()},
  authenticatedPages: pages.map(({start,end}) => ({start,end})), exactCharacterCount: next, completePacketMatched: true,
  outputTruncations: 0, preReleaseWrites: 0, writablePath: shard.writablePath, allowedFields: shard.allowedFields,
  attemptsAuthorizedAfterRelease: 1, retries: 0, directIncrementalCostUsd: 0
};
writeFileSync(path, serializedJson(report), {flag:'wx'});
console.log(JSON.stringify({agent:metadata.agent_path, shardId, characters:next, pages:pages.length, status:report.status, record:fileRecord(path)},null,2));

