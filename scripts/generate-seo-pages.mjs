import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { debates } from "../src/data/debates.js";
import { referenceDefinitions } from "../src/data/references.js";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE_ALT,
  DEFAULT_IMAGE_HEIGHT,
  DEFAULT_IMAGE_TYPE,
  DEFAULT_IMAGE_WIDTH,
  DEFAULT_ROBOTS,
  DEFAULT_TITLE,
  SITE_LOCALE,
  SITE_THEME_COLOR,
  SITE_NAME,
  absoluteUrl,
  assessmentPath,
  assessmentSeo,
  debatePath,
  debateSeo,
  landingSeo,
  notFoundSeo,
  referencePath,
  referenceSeo,
  searchPath,
  searchSeo
} from "../src/seo.js";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const checkOnly = process.argv.includes("--check");
const cloudflareWebAnalytics =
  "<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"05c16e0e536340d0a1e0fdcaa6451389\"}'></script><!-- End Cloudflare Web Analytics -->";

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

function sentence(value = "") {
  const text = String(value).trim();
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function renderHtml(seo, noscriptText) {
  const canonicalUrl = absoluteUrl(seo.canonicalPath || "/");
  const imageUrl = absoluteUrl(seo.imagePath || "/assets/slugfester-logo.jpg");
  const imageAlt = seo.imageAlt || DEFAULT_IMAGE_ALT;
  const imageWidth = seo.imageWidth || DEFAULT_IMAGE_WIDTH;
  const imageHeight = seo.imageHeight || DEFAULT_IMAGE_HEIGHT;
  const imageType = seo.imageType || DEFAULT_IMAGE_TYPE;
  const robots = seo.robots || DEFAULT_ROBOTS;
  const structuredData = jsonScript(seo.jsonLd);
  const articleMeta = [
    seo.articleSection
      ? `<meta property="article:section" content="${escapeHtml(seo.articleSection)}">`
      : "",
    seo.publishedTime
      ? `<meta property="article:published_time" content="${escapeHtml(seo.publishedTime)}">`
      : "",
    seo.modifiedTime
      ? `<meta property="article:modified_time" content="${escapeHtml(seo.modifiedTime)}">`
      : ""
  ]
    .filter(Boolean)
    .join("\n    ");
  const articleMetaBlock = articleMeta ? `${articleMeta}\n    ` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(seo.description || DEFAULT_DESCRIPTION)}">
    <meta name="robots" content="${escapeHtml(robots)}">
    <meta name="author" content="${escapeHtml(SITE_NAME)}">
    <meta name="application-name" content="${escapeHtml(SITE_NAME)}">
    <meta name="apple-mobile-web-app-title" content="${escapeHtml(SITE_NAME)}">
    <meta name="theme-color" content="${escapeHtml(SITE_THEME_COLOR)}">
    <meta name="msapplication-TileColor" content="${escapeHtml(SITE_THEME_COLOR)}">
    <meta name="msapplication-TileImage" content="/assets/icon-512.png">
    <title>${escapeHtml(seo.title || DEFAULT_TITLE)}</title>
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
    <meta property="og:locale" content="${escapeHtml(SITE_LOCALE)}">
    <meta property="og:title" content="${escapeHtml(seo.title || DEFAULT_TITLE)}">
    <meta property="og:description" content="${escapeHtml(seo.description || DEFAULT_DESCRIPTION)}">
    <meta property="og:type" content="${escapeHtml(seo.type || "website")}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:type" content="${escapeHtml(imageType)}">
    <meta property="og:image:width" content="${escapeHtml(imageWidth)}">
    <meta property="og:image:height" content="${escapeHtml(imageHeight)}">
    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
    ${articleMetaBlock}<meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(seo.title || DEFAULT_TITLE)}">
    <meta name="twitter:description" content="${escapeHtml(seo.description || DEFAULT_DESCRIPTION)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="/assets/favicon.png" type="image/png" sizes="128x128">
    <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
    <link rel="mask-icon" href="/assets/favicon.svg" color="#d35d47">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    <link rel="stylesheet" href="/src/styles.css">
    ${structuredData ? `<script type="application/ld+json" id="seo-structured-data">${structuredData}</script>` : ""}
  </head>
  <body>
    <div id="app"></div>
    <noscript>${escapeHtml(noscriptText)}</noscript>
    <script type="module" src="/src/app.js"></script>
    ${cloudflareWebAnalytics}
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

function manifestJson() {
  return `${JSON.stringify(
    {
      name: SITE_NAME,
      short_name: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f4f8f7",
      theme_color: SITE_THEME_COLOR,
      icons: [
        {
          src: "/assets/favicon.png",
          sizes: "128x128",
          type: "image/png"
        },
        {
          src: "/assets/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png"
        },
        {
          src: "/assets/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/assets/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        }
      ],
      screenshots: [
        {
          src: "/assets/social-card.png",
          sizes: "1200x630",
          type: "image/png",
          form_factor: "wide"
        }
      ]
    },
    null,
    2
  )}\n`;
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

addPage(
  searchPath(),
  searchSeo(debates),
  "Search Slugfester debate scorecards by interlocutor and text."
);

addPage(
  assessmentPath(),
  assessmentSeo(),
  "The Codex Assessment Process explains how Slugfester creates quote-forward AI debate scorecards."
);

debates.forEach((debate) => {
  addPage(
    debatePath(debate),
    debateSeo(debate),
    `${sentence(debate.title)} Slugfester provides a side-by-side argument scorecard for this debate.`,
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
pageOutputs.set(join(root, "site.webmanifest"), manifestJson());

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
  await rm(join(root, "assessment"), { recursive: true, force: true });
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
