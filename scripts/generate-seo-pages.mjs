import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { debates } from "../src/data/debates.js";
import { referenceDefinitions } from "../src/data/references.js";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  absoluteUrl,
  debatePath,
  debateSeo,
  landingSeo,
  notFoundSeo,
  referencePath,
  referenceSeo
} from "../src/seo.js";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const checkOnly = process.argv.includes("--check");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jsonScript(value) {
  if (!value) return "";
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function renderHtml(seo, noscriptText) {
  const canonicalUrl = absoluteUrl(seo.canonicalPath || "/");
  const imageUrl = absoluteUrl(seo.imagePath || "/assets/slugfester-logo.jpg");
  const robots = seo.robots || "index,follow,max-image-preview:large";
  const structuredData = jsonScript(seo.jsonLd);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(seo.description || DEFAULT_DESCRIPTION)}">
    <meta name="robots" content="${escapeHtml(robots)}">
    <title>${escapeHtml(seo.title || DEFAULT_TITLE)}</title>
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
    <meta property="og:title" content="${escapeHtml(seo.title || DEFAULT_TITLE)}">
    <meta property="og:description" content="${escapeHtml(seo.description || DEFAULT_DESCRIPTION)}">
    <meta property="og:type" content="${escapeHtml(seo.type || "website")}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(seo.title || DEFAULT_TITLE)}">
    <meta name="twitter:description" content="${escapeHtml(seo.description || DEFAULT_DESCRIPTION)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    <link rel="icon" href="/assets/favicon.png" type="image/png" sizes="128x128">
    <link rel="stylesheet" href="/src/styles.css">
    ${structuredData ? `<script type="application/ld+json" id="seo-structured-data">${structuredData}</script>` : ""}
  </head>
  <body>
    <div id="app"></div>
    <noscript>${escapeHtml(noscriptText)}</noscript>
    <script type="module" src="/src/app.js"></script>
  </body>
</html>
`;
}

function outputPathForRoute(pathname) {
  if (pathname === "/") return join(root, "index.html");
  return join(root, pathname.replace(/^\/|\/$/g, ""), "index.html");
}

function latestDate() {
  return debates
    .map((debate) => debate.date)
    .sort()
    .at(-1);
}

function sitemapXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeHtml(url.loc)}</loc>
    <lastmod>${escapeHtml(url.lastmod)}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>
`;
}

const pageOutputs = new Map();
const sitemapUrls = [];
const latest = latestDate();

function addPage(pathname, seo, noscriptText, lastmod = latest) {
  pageOutputs.set(outputPathForRoute(pathname), renderHtml(seo, noscriptText));
  if (seo.robots !== "noindex,follow") {
    sitemapUrls.push({ loc: absoluteUrl(pathname), lastmod });
  }
}

addPage(
  "/",
  landingSeo(debates),
  "Slugfester lists YouTube debate transcript scorecards with argument scores, critique popovers, and fallacy or bias references."
);

debates.forEach((debate) => {
  addPage(
    debatePath(debate),
    debateSeo(debate),
    `${debate.title}. Slugfester provides a side-by-side argument scorecard for this debate.`,
    debate.date
  );
});

Object.entries(referenceDefinitions).forEach(([type, definitions]) => {
  Object.entries(definitions).forEach(([slug, reference]) => {
    addPage(
      referencePath(type, slug),
      referenceSeo(type, slug, reference),
      `${reference.label}: ${reference.definition}`
    );
  });
});

pageOutputs.set(
  join(root, "404.html"),
  renderHtml(notFoundSeo(), "This Slugfester page could not be found.")
);
pageOutputs.set(
  join(root, "robots.txt"),
  `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("/sitemap.xml")}
`
);
pageOutputs.set(join(root, "sitemap.xml"), sitemapXml(sitemapUrls));

async function ensureMatches(file, expected) {
  let actual = "";
  try {
    actual = await readFile(file, "utf8");
  } catch {
    throw new Error(`${file} is missing`);
  }

  if (actual !== expected) {
    throw new Error(`${file} is out of date; run npm run seo`);
  }
}

if (!checkOnly) {
  await rm(join(root, "debate"), { recursive: true, force: true });
  await rm(join(root, "reference"), { recursive: true, force: true });
}

for (const [file, content] of pageOutputs) {
  if (checkOnly) {
    await ensureMatches(file, content);
  } else {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  }
}

console.log(`${checkOnly ? "Validated" : "Generated"} ${pageOutputs.size} SEO file${pageOutputs.size === 1 ? "" : "s"}.`);
