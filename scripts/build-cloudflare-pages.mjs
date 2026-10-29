import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const publicDirectories = ['assets', 'backend', 'charts', 'corrections', 'debate', 'insights', 'interlocutor', 'rankings', 'reference', 'search', 'src', 'topics'];
export const publicRootFiles = ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'feed.xml', 'site.webmanifest'];
const marker = '_slugfester-deployment.json';
const maxFileBytes = 25 * 1024 * 1024;
const maxFileCount = 20_000;

// Include the research downloads readers can actually reach, not whole research folders.
export function linkedDownloads(text) {
  return [...new Set([...text.matchAll(/\/(?:docs\/(?:analysis|charts)\/[a-zA-Z0-9_./-]+\.(?:json|csv|md|py)|output\/pdf\/[a-zA-Z0-9_.-]+\.pdf)(?![a-zA-Z0-9_.-])/g)].map(match => match[0].slice(1)))];
}

export async function buildCloudflarePages(root, { commit = process.env.CF_PAGES_COMMIT_SHA || null } = {}) {
  root = resolve(root);
  const output = join(root, 'dist', 'cloudflare');
  const files = new Map();
  async function add(path) {
    if (path.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.'))) throw new Error(`Unsafe public path: ${path}`);
    const absolute = resolve(root, path);
    if (!absolute.startsWith(root + sep)) throw new Error(`Path escapes repository: ${path}`);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Public file must be a regular file: ${path}`);
    if (stat.size > maxFileBytes) throw new Error(`File exceeds Cloudflare Pages' 25 MiB limit: ${path}`);
    files.set(path, stat.size);
  }
  async function walk(dir) {
    if ((await lstat(join(root, dir))).isSymbolicLink()) throw new Error(`Symlink is not a public directory: ${dir}`);
    for (const entry of (await readdir(join(root, dir), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.')) continue;
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else await add(path);
    }
  }
  for (const file of publicRootFiles) await add(file);
  for (const dir of publicDirectories) await walk(dir);
  const downloadPaths = new Set();
  for (const path of files.keys()) {
    if (!/\.(?:html|js|css|json|xml|webmanifest)$/.test(path)) continue;
    for (const download of linkedDownloads(await readFile(join(root, path), 'utf8'))) downloadPaths.add(download);
  }
  for (const download of [...downloadPaths].sort()) await add(download);
  if (files.size + 3 > maxFileCount) throw new Error(`Too many public files for the Cloudflare Pages free plan: ${files.size + 3}`);
  // Never replace an arbitrary pre-existing folder. Only replace our marked build.
  try {
    const existing = JSON.parse(await readFile(join(output, marker), 'utf8'));
    if (existing.site !== 'slugfester.com' || existing.host !== 'cloudflare-pages') throw new Error('Unrecognized previous build');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try {
      await lstat(output);
      throw new Error(`Refusing to replace an unmarked directory: ${output}`);
    } catch (statError) {
      if (statError.code !== 'ENOENT') throw statError;
    }
  }
  await mkdir(dirname(output), { recursive: true });
  const temporary = await mkdtemp(join(dirname(output), '.cloudflare-build-'));
  try {
    for (const path of [...files.keys()].sort()) {
      await mkdir(dirname(join(temporary, path)), { recursive: true });
      await copyFile(join(root, path), join(temporary, path));
    }
    for (const file of ['_headers', '_redirects']) await copyFile(join(root, 'config', 'cloudflare', file), join(temporary, file));
    await writeFile(join(temporary, marker), JSON.stringify({ site: 'slugfester.com', host: 'cloudflare-pages', sourceCommit: commit, publicFiles: files.size }, null, 2) + '\n');
    await rm(output, { recursive: true, force: true });
    await rename(temporary, output);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
  return { output: relative(root, output), files: files.size + 3, bytes: [...files.values()].reduce((a, b) => a + b, 0), linkedDownloads: downloadPaths.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  console.log(JSON.stringify(await buildCloudflarePages(root), null, 2));
}
