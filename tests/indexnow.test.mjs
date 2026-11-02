import assert from 'node:assert/strict';
import test from 'node:test';
import { changedPublicUrls, productionContains, submissionBody, submitIndexNow } from '../scripts/notify-indexnow.mjs';
const commit = 'a'.repeat(40);
const config = { host: 'slugfester.com', key: 'b'.repeat(32), keyLocation: 'https://slugfester.com/indexnow-key.txt' };
test('submits content changes and removals, ignoring dates alone and invalid routes', () => {
  assert.deepEqual(changedPublicUrls({ '/': { fingerprint: 'same', modified: 'old' }, '/removed/': { fingerprint: 'old' } }, { '/': { fingerprint: 'same', modified: 'new' }, '/insights/debate-evidence/': { fingerprint: 'new' }, '/private.json': { fingerprint: 'new' } }), ['https://slugfester.com/insights/debate-evidence/', 'https://slugfester.com/removed/']);
});
test('refuses foreign hosts, query strings and malformed ownership keys', () => {
  for (const url of ['https://example.com/', 'https://slugfester.com/?token=x', 'https://slugfester.com/private.json']) assert.throws(() => submissionBody(config, [url]));
  assert.throws(() => submissionBody({ ...config, key: 'bad' }, ['https://slugfester.com/']));
});
test('waits for matching production and ownership before making one submission', async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('.json')) return { ok: true, json: async () => ({ site: 'slugfester.com', host: 'cloudflare-pages', sourceCommit: commit }) };
    if (url.endsWith('.txt')) return { ok: true, text: async () => config.key + '\n' };
    return { status: 202 };
  };
  assert.equal((await submitIndexNow(submissionBody(config, ['https://slugfester.com/']), { commit, request })).status, 202);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[2].options.body).urlList, ['https://slugfester.com/']);
});
test('does not notify before a production deployment or with a mismatched ownership file', async () => {
  const body = submissionBody(config, ['https://slugfester.com/']);
  await assert.rejects(submitIndexNow(body, { commit, attempts: 1, request: async () => ({ ok: false }) }), /nothing submitted/);
  let calls = 0;
  await assert.rejects(submitIndexNow(body, { commit, request: async () => ++calls === 1 ? { ok: true, json: async () => ({ site: 'slugfester.com', host: 'cloudflare-pages', sourceCommit: commit }) } : { ok: true, text: async () => 'wrong' } }), /ownership file/);
  assert.equal(calls, 2);
});
test('newer production must be authenticated as a descendant', async () => {
  assert.equal(await productionContains(commit, 'c'.repeat(40), async () => ({ ok: true, json: async () => ({ status: 'ahead' }) })), true);
  assert.equal(await productionContains(commit, 'c'.repeat(40), async () => ({ ok: true, json: async () => ({ status: 'diverged' }) })), false);
});
