import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const origin = 'https://slugfester.com';
const root = fileURLToPath(new URL('../', import.meta.url));

export function changedPublicUrls(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(path => /^\/(?:[a-z0-9-]+\/)*$/.test(path))
    .filter(path => before[path]?.fingerprint !== after[path]?.fingerprint)
    .sort().map(path => origin + path);
}

export function submissionBody(config, urls) {
  if (config.host !== 'slugfester.com' || !/^[a-f0-9]{32}$/.test(config.key) || config.keyLocation !== `${origin}/indexnow-key.txt`) throw new Error('Invalid IndexNow ownership configuration');
  const urlList = [...new Set(urls)];
  if (!urlList.length || urlList.length > 10000) throw new Error('IndexNow requires 1–10,000 changed URLs');
  for (const value of urlList) {
    const url = new URL(value);
    if (url.origin !== origin || url.username || url.password || url.search || url.hash || !/^\/(?:[a-z0-9-]+\/)*$/.test(url.pathname)) throw new Error(`Not a canonical public page: ${value}`);
  }
  return { ...config, urlList };
}

// Accept a newer production revision only when GitHub confirms it contains our revision.
export async function productionContains(expected, live, request = fetch) {
  if (!/^[a-f0-9]{40}$/.test(expected) || !/^[a-f0-9]{40}$/.test(live || '')) return false;
  if (live === expected) return true;
  const response = await request(`https://api.github.com/repos/philstilwell/slugfester/compare/${expected}...${live}`, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) return false;
  return ['ahead', 'identical'].includes((await response.json()).status);
}

export async function submitIndexNow(body, { commit, request = fetch, attempts = 40, pause = () => new Promise(r => setTimeout(r, 15000)) } = {}) {
  submissionBody(body, body.urlList);
  if (!/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('A verified production commit is required');
  let ready = false;
  for (let i = 0; i < attempts; i++) {
    const result = await request(`${origin}/_slugfester-deployment.json`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
    if (result.ok) {
      const marker = await result.json();
      if (marker.site === 'slugfester.com' && marker.host === 'cloudflare-pages' && await productionContains(commit, marker.sourceCommit, request)) { ready = true; break; }
    }
    if (i + 1 < attempts) await pause();
  }
  if (!ready) throw new Error('The tested revision is not yet verified on the production website; nothing submitted');
  const key = await request(body.keyLocation, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!key.ok || (await key.text()).trim() !== body.key) throw new Error('The public IndexNow ownership file does not match; nothing submitted');
  const response = await request('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000)
  });
  if (![200, 202].includes(response.status)) throw new Error(`IndexNow returned HTTP ${response.status}; check the submission before retrying`);
  return { status: response.status, urls: body.urlList.length, message: response.status === 202 ? 'URLs received; ownership validation pending' : 'URLs received' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const value = flag => args[args.indexOf(flag) + 1];
  const git = (...params) => execFileSync('git', params, { cwd: root, encoding: 'utf8' }).trim();
  const commit = args.includes('--commit') ? value('--commit') : git('rev-parse', 'HEAD');
  const base = args.includes('--base') ? value('--base') : `${commit}^`;
  if (!/^[a-f0-9]{40}$/.test(commit) || !/^[a-f0-9]{40}\^?$/.test(base)) throw new Error('Use full commit identities');
  const history = ref => JSON.parse(git('show', `${ref}:scripts/seo-page-history.json`));
  const urls = args.includes('--url') ? args.flatMap((arg, i) => arg === '--url' ? [args[i + 1]] : []) : changedPublicUrls(history(base), history(commit));
  if (!urls.length) console.log('No public content changes to submit.');
  else {
    const body = submissionBody(JSON.parse(await readFile(new URL('../config/indexnow.json', import.meta.url), 'utf8')), urls);
    if (!args.includes('--submit')) console.log(JSON.stringify({ dryRun: true, urls: body.urlList }, null, 2));
    else console.log(JSON.stringify(await submitIndexNow(body, { commit }), null, 2));
  }
}
