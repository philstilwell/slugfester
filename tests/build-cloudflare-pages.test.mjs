import assert from 'node:assert/strict';
import { copyFile, lstat, mkdir, mkdtemp, readFile, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { buildCloudflarePages, linkedDownloads, publicDirectories, publicRootFiles } from '../scripts/build-cloudflare-pages.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'slugfester-pages-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of publicDirectories) await mkdir(join(root, dir), { recursive: true });
  for (const file of publicRootFiles) await writeFile(join(root, file), 'Slugfester');
  await mkdir(join(root, 'config/cloudflare'), { recursive: true });
  for (const file of ['_headers', '_redirects']) await copyFile(new URL(`../config/cloudflare/${file}`, import.meta.url), join(root, 'config/cloudflare', file));
  return root;
}

test('preserves public pages and linked downloads without exposing internal folders', async t => {
  const root = await fixture(t);
  const index = '<a href="/docs/charts/snapshots/current.json">Data</a><a href="/output/pdf/paper.pdf">Paper</a>';
  await writeFile(join(root, 'index.html'), index);
  for (const path of ['docs/charts/snapshots/current.json', 'output/pdf/paper.pdf', 'assessment/private.json', 'docs/unlinked.md', 'assets/.env']) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), '{}');
  }
  await writeFile(join(root, 'src/app.js'), 'export const value = 1;');
  const result = await buildCloudflarePages(root, { commit: 'a'.repeat(40) });
  assert.equal(result.linkedDownloads, 2);
  assert.equal(await readFile(join(root, 'dist/cloudflare/index.html'), 'utf8'), index);
  assert.equal(await readFile(join(root, 'dist/cloudflare/docs/charts/snapshots/current.json'), 'utf8'), '{}');
  assert.equal(await readFile(join(root, 'dist/cloudflare/output/pdf/paper.pdf'), 'utf8'), '{}');
  for (const path of ['assessment/private.json', 'docs/unlinked.md', 'assets/.env', 'config', '.git']) await assert.rejects(lstat(join(root, 'dist/cloudflare', path)), { code: 'ENOENT' });
  const marker = JSON.parse(await readFile(join(root, 'dist/cloudflare/_slugfester-deployment.json'), 'utf8'));
  assert.equal(marker.sourceCommit, 'a'.repeat(40));
  assert.equal(marker.host, 'cloudflare-pages');
  await buildCloudflarePages(root); // Our own previous build is safely replaceable.
});

test('missing public downloads fail instead of publishing broken links', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'index.html'), '<a href="/output/pdf/missing.pdf">PDF</a>');
  await assert.rejects(buildCloudflarePages(root), { code: 'ENOENT' });
});

test('symlinks cannot expose files outside the published directories', async t => {
  const root = await fixture(t);
  await symlink(join(root, 'index.html'), join(root, 'assets/leak.html'));
  await assert.rejects(buildCloudflarePages(root), /regular file/);
});

test('oversized assets are rejected before upload', async t => {
  const root = await fixture(t);
  const path = join(root, 'assets/too-big.bin');
  await writeFile(path, '');
  await truncate(path, 25 * 1024 * 1024 + 1);
  await assert.rejects(buildCloudflarePages(root), /25 MiB/);
});

test('an unrelated output directory is never erased', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'dist/cloudflare'), { recursive: true });
  await writeFile(join(root, 'dist/cloudflare/keep.txt'), 'keep');
  await assert.rejects(buildCloudflarePages(root), /unmarked directory/);
  assert.equal(await readFile(join(root, 'dist/cloudflare/keep.txt'), 'utf8'), 'keep');
});

test('extracts only explicit public research and PDF paths, rejecting traversal later', () => {
  assert.deepEqual(linkedDownloads('/docs/analysis/study/results.json?q=1 /output/pdf/paper.pdf /docs/private.json /assessment/secrets.json'), ['docs/analysis/study/results.json', 'output/pdf/paper.pdf']);
});

test('keeps the alternate host out of search indexes and canonicalizes www', async () => {
  const headers = await readFile(new URL('../config/cloudflare/_headers', import.meta.url), 'utf8');
  const redirects = await readFile(new URL('../config/cloudflare/_redirects', import.meta.url), 'utf8');
  assert.match(headers, /https:\/\/slugfester\.pages\.dev\/\*\n  X-Robots-Tag: noindex/);
  assert.match(redirects, /https:\/\/www\.slugfester\.com\/\* https:\/\/slugfester\.com\/:splat 301/);
});
