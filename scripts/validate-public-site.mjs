import { existsSync, readFileSync } from "node:fs";
import "./validate-reader-features.mjs";
import "./validate-interlocutor-bios.mjs";
import { dirname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { publishedDebates as debates } from "../src/data/debates.js";
import { interlocutorAvatars, avatarsForSpeakerText } from "../src/data/interlocutors.js";
import { referenceDefinitions } from "../src/data/references.js";
import {
  SITE_URL,
  backendPath,
  insightsPath,
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
  insightsPath(),
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
const titleOwners = new Map();
const descriptionOwners = new Map();
const browserAssetVersions = new Set();
sitemapUrls.forEach((urlString) => {
  const url = new URL(urlString);
  const file = fileForPathname(url.pathname);
  if (!existsSync(file)) {
    fail(`Missing generated page for ${url.pathname}: ${file}`);
    return;
  }

  const html = readFileSync(file, "utf8");
  for (const asset of ["app.js", "styles.css"]) {
    const version = html.match(new RegExp(`/src/${asset.replace(".", "\\.")}\\?v=([a-f0-9]{16})`))?.[1];
    if (!version) fail(`${url.pathname} is missing a content-versioned ${asset}`);
    else browserAssetVersions.add(version);
  }
  if (!html.includes("form-action 'self' https://formsubmit.co")) {
    fail(`${url.pathname} cannot submit the approved forms after internal navigation`);
  }
  const titleMatches = [...html.matchAll(/<title>([^<]+)<\/title>/g)];
  const title = decodeAttribute(titleMatches[0]?.[1] || "");
  if (titleMatches.length !== 1) {
    fail(`${url.pathname} has ${titleMatches.length} title elements; expected 1`);
  } else if (title.length < 20 || title.length > 90) {
    fail(`${url.pathname} title has ${title.length} characters; expected 20–90`);
  } else if (titleOwners.has(title)) {
    fail(`Duplicate title "${title}" on ${titleOwners.get(title)} and ${url.pathname}`);
  }
  titleOwners.set(title, url.pathname);

  const descriptionMatches = [
    ...html.matchAll(/<meta name="description" content="([^"]+)">/g)
  ];
  const description = decodeAttribute(descriptionMatches[0]?.[1] || "");
  if (descriptionMatches.length !== 1) {
    fail(`${url.pathname} has ${descriptionMatches.length} meta descriptions; expected 1`);
  } else if (description.length < 60 || description.length > 170) {
    fail(`${url.pathname} meta description has ${description.length} characters; expected 60–170`);
  } else if (descriptionOwners.has(description)) {
    fail(
      `Duplicate meta description on ${descriptionOwners.get(description)} and ${url.pathname}`
    );
  }
  descriptionOwners.set(description, url.pathname);

  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  if (canonical !== url.href) {
    fail(`${url.pathname} canonical is ${canonical || "missing"}; expected ${url.href}`);
  }
  if (canonicalOwners.has(canonical)) {
    fail(`Duplicate canonical ${canonical} on ${canonicalOwners.get(canonical)} and ${url.pathname}`);
  }
  canonicalOwners.set(canonical, url.pathname);

  const robots = html.match(/<meta name="robots" content="([^"]+)">/)?.[1] || "";
  if (!robots.startsWith("index,follow")) {
    fail(`${url.pathname} is in the sitemap but has robots content "${robots || "missing"}"`);
  }

  const ogUrl = html.match(/<meta property="og:url" content="([^"]+)">/)?.[1];
  if (ogUrl !== canonical) fail(`${url.pathname} Open Graph URL does not match its canonical`);
  for (const requiredMeta of [
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'name="twitter:card"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:image"'
  ]) {
    if (!html.includes(`<meta ${requiredMeta}`)) {
      fail(`${url.pathname} is missing ${requiredMeta}`);
    }
  }

  if (html.includes('<div id="app"></div>')) {
    fail(`${url.pathname} still ships an empty JavaScript-only app shell`);
  }
  const fallback = html.match(/<main class="(?:seo-fallback|insights-page)"[\s\S]*?<\/main>/)?.[0] || "";
  if (!fallback) {
    fail(`${url.pathname} is missing pre-rendered fallback content`);
  } else {
    const heading = decodeAttribute(fallback.match(/<h1>([^<]+)<\/h1>/)?.[1] || "");
    const summary = decodeAttribute(fallback.match(/<p>([^<]+)<\/p>/)?.[1] || "");
    const links = [...fallback.matchAll(/<a href="([^"]+)">/g)];
    if (heading.length < 2) fail(`${url.pathname} fallback is missing a useful H1`);
    if (summary.length < 50) fail(`${url.pathname} fallback summary is too short`);
    if (links.length < 5) fail(`${url.pathname} fallback has fewer than 5 crawlable links`);
  }

  const structuredDataText = html.match(
    /<script type="application\/ld\+json" id="seo-structured-data">([\s\S]*?)<\/script>/
  )?.[1];
  let structuredData = [];
  try {
    structuredData = JSON.parse(structuredDataText || "null");
  } catch (error) {
    fail(`${url.pathname} has invalid JSON-LD: ${error.message}`);
  }
  if (!Array.isArray(structuredData)) {
    fail(`${url.pathname} JSON-LD is not an array`);
    structuredData = [];
  }
  const structuredTypes = new Set(structuredData.map((entry) => entry?.["@type"]));
  for (const requiredType of ["Organization", "WebSite", "BreadcrumbList"]) {
    if (!structuredTypes.has(requiredType) && url.pathname !== "/") {
      fail(`${url.pathname} JSON-LD is missing ${requiredType}`);
    }
  }
  if (url.pathname.startsWith("/debate/")) {
    const article = structuredData.find((entry) => entry?.["@type"] === "Article");
    if (!article) fail(`${url.pathname} JSON-LD is missing Article`);
    if (!article?.mentions?.every((entry) => entry?.["@type"] === "Person")) {
      fail(`${url.pathname} Article does not identify its interlocutors as people`);
    }
  }
  if (url.pathname.startsWith("/interlocutor/")) {
    const collection = structuredData.find((entry) => entry?.["@type"] === "CollectionPage");
    if (!collection) fail(`${url.pathname} JSON-LD is missing CollectionPage`);
    if (collection?.about?.["@type"] !== "Person") {
      fail(`${url.pathname} CollectionPage is not linked to its interlocutor`);
    }
    if (collection?.mainEntity?.["@type"] !== "ItemList") {
      fail(`${url.pathname} CollectionPage is missing its debate ItemList`);
    }
  }
  if (url.pathname.startsWith("/reference/") && !structuredTypes.has("DefinedTerm")) {
    fail(`${url.pathname} JSON-LD is missing DefinedTerm`);
  }

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

if (browserAssetVersions.size !== 1) fail("Public pages disagree on the browser asset version");
const browserVersion = [...browserAssetVersions][0];
const appSource = readFileSync(join(root, "src/app.js"), "utf8");
for (const match of appSource.matchAll(/\.\/(?:data\/[^"'`?]+|seo\.js)\?v=([^"'`]+)/g)) {
  if (match[1] !== browserVersion) fail(`Browser import has a stale data version: ${match[0]}`);
}

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
