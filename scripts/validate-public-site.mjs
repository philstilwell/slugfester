import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { publishedDebates as debates } from "../src/data/debates.js";
import { interlocutorAvatars, avatarsForSpeakerText } from "../src/data/interlocutors.js";
import { referenceDefinitions } from "../src/data/references.js";
import {
  SITE_URL,
  backendPath,
  correctionsPath,
  debatePath,
  interlocutorPath,
  rankingsPath,
  referencePath,
  searchPath,
  topicsPath
} from "../src/seo.js";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const errors = [];

function fail(message) {
  errors.push(message);
}

function fileForPathname(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === "/"
    ? "index.html"
    : decoded.endsWith("/")
      ? `${decoded.slice(1)}index.html`
      : decoded.slice(1);
  const file = normalize(join(root, relative));
  if (!file.startsWith(`${normalize(root)}${sep}`)) {
    throw new Error(`Unsafe public path: ${pathname}`);
  }
  return file;
}

function decodeAttribute(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapSet = new Set(sitemapUrls);

if (!sitemapUrls.length) fail("sitemap.xml contains no URLs");
if (sitemapSet.size !== sitemapUrls.length) fail("sitemap.xml contains duplicate URLs");

const appearingPeople = new Map();
debates.forEach((debate) => {
  ["pro", "con"].forEach((sideKey) => {
    avatarsForSpeakerText(debate.sides[sideKey].speaker).forEach((person) => {
      appearingPeople.set(person.name, person);
    });
  });
});

const expectedPaths = [
  "/",
  searchPath(),
  topicsPath(),
  rankingsPath(),
  backendPath(),
  correctionsPath(),
  ...debates.map(debatePath),
  ...[...appearingPeople.values()].map(interlocutorPath),
  ...Object.entries(referenceDefinitions).flatMap(([type, definitions]) =>
    Object.keys(definitions).map((slug) => referencePath(type, slug))
  )
];

expectedPaths.forEach((pathname) => {
  const url = new URL(pathname, SITE_URL).href;
  if (!sitemapSet.has(url)) fail(`Missing sitemap URL: ${url}`);
});

if (sitemapSet.size !== expectedPaths.length) {
  fail(`Sitemap has ${sitemapSet.size} URLs; expected ${expectedPaths.length}`);
}

const canonicalOwners = new Map();
sitemapUrls.forEach((urlString) => {
  const url = new URL(urlString);
  const file = fileForPathname(url.pathname);
  if (!existsSync(file)) {
    fail(`Missing generated page for ${url.pathname}: ${file}`);
    return;
  }

  const html = readFileSync(file, "utf8");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  if (canonical !== url.href) {
    fail(`${url.pathname} canonical is ${canonical || "missing"}; expected ${url.href}`);
  }
  if (canonicalOwners.has(canonical)) {
    fail(`Duplicate canonical ${canonical} on ${canonicalOwners.get(canonical)} and ${url.pathname}`);
  }
  canonicalOwners.set(canonical, url.pathname);

  if (!html.includes('rel="alternate" type="application/atom+xml"')) {
    fail(`${url.pathname} does not advertise the updates feed`);
  }

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = decodeAttribute(match[1]);
    if (!value || value.startsWith("#") || value.startsWith("data:") || value.startsWith("mailto:")) continue;

    let linked;
    try {
      linked = new URL(value, url);
    } catch {
      fail(`${url.pathname} contains an invalid URL attribute: ${value}`);
      continue;
    }
    if (linked.origin !== SITE_URL) continue;

    const linkedFile = fileForPathname(linked.pathname);
    if (!existsSync(linkedFile)) {
      fail(`${url.pathname} links to missing local resource ${linked.pathname}`);
    }
  }
});

interlocutorAvatars.forEach((person) => {
  const avatar = fileForPathname(person.src);
  if (!existsSync(avatar)) fail(`Missing avatar for ${person.name}: ${person.src}`);
});

debates.forEach((debate) => {
  const detail = join(root, "src", "data", "debate-details", `${debate.id}.js`);
  if (!existsSync(detail)) fail(`Missing split detail data for Debate ${debate.number}: ${debate.id}`);
  if (!/^https:\/\/(www\.)?youtube\.com\/watch\?v=/.test(debate.youtubeUrl)) {
    fail(`Debate ${debate.number} has an unexpected YouTube URL: ${debate.youtubeUrl}`);
  }
});

for (const asset of [
  "/assets/favicon.svg",
  "/assets/favicon.png",
  "/assets/apple-touch-icon.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/social-card.png",
  "/assets/debate-gloves.png",
  "/assets/slugfester-logo.jpg",
  "/feed.xml",
  "/robots.txt",
  "/site.webmanifest"
]) {
  if (!existsSync(fileForPathname(asset))) fail(`Missing required public asset: ${asset}`);
}

const feed = existsSync(join(root, "feed.xml")) ? readFileSync(join(root, "feed.xml"), "utf8") : "";
const feedEntries = [...feed.matchAll(/<entry>/g)].length;
if (feedEntries !== Math.min(25, debates.length)) {
  fail(`feed.xml has ${feedEntries} entries; expected ${Math.min(25, debates.length)}`);
}
const newestDebate = [...debates].sort((a, b) => Number(b.number) - Number(a.number))[0];
if (newestDebate && !feed.includes(new URL(debatePath(newestDebate), SITE_URL).href)) {
  fail(`feed.xml does not contain newest Debate ${newestDebate.number}`);
}

if (errors.length) {
  console.error(`Public-site integrity validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Validated ${sitemapUrls.length} public routes, ${debates.length} debate detail files, ${appearingPeople.size} generated profiles, and ${interlocutorAvatars.length} avatar assets.`
);
