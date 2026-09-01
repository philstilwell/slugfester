import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { publishedDebates as debates } from "../src/data/debates.js";
import { avatarsForSpeakerText } from "../src/data/interlocutors.js";
import { referenceDefinitions, referenceFromUrl } from "../src/data/references.js";
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
  backendPath,
  backendSeo,
  correctionsPath,
  correctionsSeo,
  assessmentPath,
  assessmentSeo,
  debatePath,
  debateSeo,
  interlocutorPath,
  interlocutorSeo,
  landingSeo,
  notFoundSeo,
  referencePath,
  referenceSeo,
  rankingsPath,
  rankingsSeo,
  searchPath,
  searchSeo,
  topicsPath,
  topicsSeo
} from "../src/seo.js";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const checkOnly = process.argv.includes("--check");
const assetVersion = "20260901-newest-debate-copy-v1";
const interlocutorAssetVersion = "20260901-newest-debate-copy-v1";
const rankingsAssetVersion = "20260901-newest-debate-copy-v1";
const debateAssetVersion = "20260901-newest-debate-copy-v1";
const backendAssetVersion = "20260901-newest-debate-copy-v1";

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

function contentSecurityPolicy(structuredData = "", allowExternalForm = false) {
  const structuredDataHash = structuredData
    ? ` 'sha256-${createHash("sha256").update(structuredData).digest("base64")}'`
    : "";

  return [
    "default-src 'self'",
    `script-src 'self' https://static.cloudflareinsights.com${structuredDataHash}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    `form-action 'self'${allowExternalForm ? " https://formsubmit.co" : ""}`,
    "upgrade-insecure-requests"
  ].join("; ");
}

function sentence(value = "") {
  const text = String(value).trim();
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function fallbackHeading(seo = {}) {
  if (seo.heading) return seo.heading;
  return String(seo.title || DEFAULT_TITLE).split(` | ${SITE_NAME}`)[0] || SITE_NAME;
}

function fallbackMarkup(seo, summary) {
  const links = [
    { href: "/", label: "Browse debates" },
    { href: searchPath(), label: "Search scorecards" },
    { href: topicsPath(), label: "Browse topics" },
    { href: rankingsPath(), label: "Compare interlocutors" },
    { href: backendPath(), label: "Read the assessment method" },
    ...(seo.relatedLinks || [])
  ];
  const uniqueLinks = [
    ...new Map(
      links
        .filter(({ href, label }) => href && label)
        .map((link) => [String(link.href), link])
    ).values()
  ].slice(0, 25);

  return `<main class="seo-fallback" id="main-content">
      <p class="eyebrow">${escapeHtml(SITE_NAME)}</p>
      <h1>${escapeHtml(fallbackHeading(seo))}</h1>
      <p>${escapeHtml(summary || seo.description || DEFAULT_DESCRIPTION)}</p>
      <nav aria-label="Explore Slugfester">
        ${uniqueLinks
          .map(({ href, label }) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
          .join("\n        ")}
      </nav>
    </main>`;
}

function renderHtml(seo, noscriptText, pageAssetVersion = assetVersion) {
  const canonicalUrl = seo.canonicalPath === null ? "" : absoluteUrl(seo.canonicalPath || "/");
  const imageUrl = absoluteUrl(seo.imagePath || "/assets/slugfester-logo.jpg");
  const imageAlt = seo.imageAlt || DEFAULT_IMAGE_ALT;
  const imageWidth = seo.imageWidth || DEFAULT_IMAGE_WIDTH;
  const imageHeight = seo.imageHeight || DEFAULT_IMAGE_HEIGHT;
  const imageType = seo.imageType || DEFAULT_IMAGE_TYPE;
  const robots = seo.robots || DEFAULT_ROBOTS;
  const updatedTime = seo.updatedTime || seo.modifiedTime || seo.lastmod;
  const structuredData = jsonScript(seo.jsonLd);
  const securityPolicy = contentSecurityPolicy(
    structuredData,
    seo.canonicalPath === backendPath() || seo.canonicalPath === correctionsPath()
  );
  const articleMeta = [
    seo.type === "article" && seo.articleSection
      ? `<meta property="article:section" content="${escapeHtml(seo.articleSection)}">`
      : "",
    seo.type === "article" && seo.publishedTime
      ? `<meta property="article:published_time" content="${escapeHtml(seo.publishedTime)}">`
      : "",
    seo.type === "article" && seo.modifiedTime
      ? `<meta property="article:modified_time" content="${escapeHtml(seo.modifiedTime)}">`
      : ""
  ]
    .filter(Boolean)
    .join("\n    ");
  const articleMetaBlock = articleMeta ? `${articleMeta}\n    ` : "";
  const updatedMeta = updatedTime
    ? `<meta property="og:updated_time" content="${escapeHtml(updatedTime)}">\n    `
    : "";
  const fallback = fallbackMarkup(seo, noscriptText);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${escapeHtml(securityPolicy)}">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(seo.description || DEFAULT_DESCRIPTION)}">
    <meta name="robots" content="${escapeHtml(robots)}">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta name="author" content="${escapeHtml(SITE_NAME)}">
    <meta name="application-name" content="${escapeHtml(SITE_NAME)}">
    <meta name="apple-mobile-web-app-title" content="${escapeHtml(SITE_NAME)}">
    <meta name="theme-color" content="${escapeHtml(SITE_THEME_COLOR)}">
    <meta name="msapplication-TileColor" content="${escapeHtml(SITE_THEME_COLOR)}">
    <meta name="msapplication-TileImage" content="/assets/icon-512.png">
    <title>${escapeHtml(seo.title || DEFAULT_TITLE)}</title>
${canonicalUrl ? `    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">\n` : ""}    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
    <meta property="og:locale" content="${escapeHtml(SITE_LOCALE)}">
    <meta property="og:title" content="${escapeHtml(seo.title || DEFAULT_TITLE)}">
    <meta property="og:description" content="${escapeHtml(seo.description || DEFAULT_DESCRIPTION)}">
    <meta property="og:type" content="${escapeHtml(seo.type || "website")}">
${canonicalUrl ? `    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">\n` : ""}    ${updatedMeta}<meta property="og:image" content="${escapeHtml(imageUrl)}">
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
    <link rel="alternate" type="application/atom+xml" title="Slugfester new debate assessments" href="/feed.xml">
    <link rel="stylesheet" href="/src/styles.css?v=${pageAssetVersion}">
    ${structuredData ? `<script type="application/ld+json" id="seo-structured-data">${structuredData}</script>` : ""}
  </head>
  <body>
    <div id="app">
      ${fallback}
    </div>
    <noscript><p class="seo-noscript">Interactive filters and detailed critique controls require JavaScript; the page summary and links above remain available.</p></noscript>
    <script type="module" src="/src/app.js?v=${pageAssetVersion}"></script>
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

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function atomFeed(debates) {
  const recent = [...debates]
    .sort((first, second) => Number(second.number) - Number(first.number))
    .slice(0, 25);
  const updated = `${latestDate()}T12:00:00-04:00`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Slugfester new debate assessments</title>
  <subtitle>Recently published transcript-grounded debate scorecards.</subtitle>
  <id>${escapeXml(absoluteUrl("/"))}</id>
  <link href="${escapeXml(absoluteUrl("/feed.xml"))}" rel="self" type="application/atom+xml"/>
  <link href="${escapeXml(absoluteUrl("/"))}" rel="alternate" type="text/html"/>
  <updated>${escapeXml(updated)}</updated>
${recent
  .map((debate) => {
    const url = absoluteUrl(debatePath(debate));
    const entryUpdated = `${debate.date}T12:00:00-04:00`;
    return `  <entry>
    <title>${escapeXml(`Debate ${debate.number}: ${debate.title}`)}</title>
    <id>${escapeXml(url)}</id>
    <link href="${escapeXml(url)}" rel="alternate" type="text/html"/>
    <updated>${escapeXml(entryUpdated)}</updated>
    <summary>${escapeXml(debate.summary)}</summary>
  </entry>`;
  })
  .join("\n")}
</feed>
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

function debateSummary(debate) {
  return {
    id: debate.id,
    number: debate.number,
    title: debate.title,
    label: debate.label,
    date: debate.date,
    duration: debate.duration,
    youtubeUrl: debate.youtubeUrl,
    motion: debate.motion,
    summary: debate.summary,
    topicCategory: debate.topicCategory,
    sides: debate.sides,
    score: debate.score,
    sections: debate.sections.map((section) => ({ title: section.title }))
  };
}

function debateParticipantsBySide(debate) {
  return {
    pro: avatarsForSpeakerText(debate.sides.pro.speaker),
    con: avatarsForSpeakerText(debate.sides.con.speaker)
  };
}

function tagSummaryForSide(debate, sideKey) {
  return debate.sections.reduce(
    (totals, section) =>
      section.exchanges.reduce((sectionTotals, exchange) => {
        const move = exchange[sideKey];
        if (!move) return sectionTotals;

        sectionTotals.scoredMoves += 1;
        (move.tags || []).forEach((tag) => {
          if (tag.type === "fallacy") sectionTotals.fallacies += 1;
          if (tag.type === "bias") sectionTotals.biases += 1;
        });
        return sectionTotals;
      }, totals),
    { scoredMoves: 0, fallacies: 0, biases: 0 }
  );
}

function debateAnalytics(debate) {
  return {
    ...(debate.interlocutorRankingEligible === false
      ? { interlocutorRankingEligible: false }
      : {}),
    sectionScores: debate.sections.flatMap((section) =>
      [section.score?.pro, section.score?.con].filter(Number.isFinite)
    ),
    tagSummary: {
      pro: tagSummaryForSide(debate, "pro"),
      con: tagSummaryForSide(debate, "con")
    }
  };
}

function referenceAppearance(debate, section, sideKey, argument, tag) {
  return {
    debate: {
      id: debate.id,
      number: debate.number,
      title: debate.title,
      label: debate.label,
      youtubeUrl: debate.youtubeUrl,
      sides: debate.sides
    },
    section: { title: section.title },
    sideKey,
    side: debate.sides[sideKey],
    argument: {
      time: argument.time,
      role: argument.role,
      words: argument.words
    },
    tag: {
      type: tag.type,
      label: tag.label,
      url: tag.url,
      context: tag.context
    }
  };
}

pageOutputs.set(
  join(root, "src/data/debate-summaries.js"),
  `// Generated by scripts/generate-seo-pages.mjs. Do not edit directly.\nexport const debateSummaries = ${JSON.stringify(debates.map(debateSummary), null, 2)};\n`
);

pageOutputs.set(
  join(root, "src/data/debate-analytics.js"),
  `// Generated by scripts/generate-seo-pages.mjs. Do not edit directly.\nexport const debateAnalytics = ${JSON.stringify(Object.fromEntries(debates.map((debate) => [debate.id, debateAnalytics(debate)])))};\n`
);

debates.forEach((debate) => {
  pageOutputs.set(
    join(root, "src/data/debate-details", `${debate.id}.js`),
    `// Generated by scripts/generate-seo-pages.mjs. Do not edit directly.\nexport const debate = ${JSON.stringify(debate)};\n`
  );
});

const referenceAppearances = new Map();

debates.forEach((debate) => {
  debate.sections.forEach((section) => {
    section.exchanges.forEach((exchange) => {
      ["pro", "con"].forEach((sideKey) => {
        const argument = exchange[sideKey];
        if (!argument) return;

        (argument.tags || []).forEach((tag) => {
          const reference = referenceFromUrl(tag.url);
          if (!reference) return;

          const key = `${reference.type}/${reference.slug}`;
          const appearances = referenceAppearances.get(key) || [];
          appearances.push(referenceAppearance(debate, section, sideKey, argument, tag));
          referenceAppearances.set(key, appearances);
        });
      });
    });
  });
});

Object.entries(referenceDefinitions).forEach(([type, definitions]) => {
  Object.keys(definitions).forEach((slug) => {
    pageOutputs.set(
      join(root, "src/data/reference-appearances", `${type}-${slug}.js`),
      `// Generated by scripts/generate-seo-pages.mjs. Do not edit directly.\nexport const referenceAppearances = ${JSON.stringify(referenceAppearances.get(`${type}/${slug}`) || [])};\n`
    );
  });
});

const interlocutorProfiles = new Map();

debates.forEach((debate) => {
  const isOneOnOne = ["pro", "con"].every(
    (sideKey) => avatarsForSpeakerText(debate.sides[sideKey].speaker).length === 1
  );
  ["pro", "con"].forEach((sideKey) => {
    avatarsForSpeakerText(debate.sides[sideKey].speaker).forEach((person) => {
      const profile = interlocutorProfiles.get(person.name) || {
        person,
        appearances: 0,
        latestDate: debate.date,
        debates: []
      };
      if (!profile.debates.some((profileDebate) => profileDebate.id === debate.id)) {
        profile.debates.push(debate);
      }
      if (isOneOnOne && debate.interlocutorRankingEligible !== false) {
        profile.appearances += 1;
      }
      if (debate.date && (!profile.latestDate || debate.date > profile.latestDate)) {
        profile.latestDate = debate.date;
      }
      interlocutorProfiles.set(person.name, profile);
    });
  });
});

function addPage(pathname, seo, noscriptText, fallbackLastmod = latest) {
  const lastmod = seo.lastmod || seo.modifiedTime || fallbackLastmod;
  const pageAssetVersion = pathname.startsWith("/debate/")
    ? debateAssetVersion
    : pathname.startsWith("/interlocutor/")
      ? interlocutorAssetVersion
      : pathname === backendPath()
        ? backendAssetVersion
        : pathname === rankingsPath()
          ? rankingsAssetVersion
          : assetVersion;
  pageOutputs.set(outputPathForRoute(pathname), renderHtml(seo, noscriptText, pageAssetVersion));
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
  topicsPath(),
  topicsSeo(debates),
  "Browse Slugfester debate scorecards by recurring topic clusters."
);

addPage(
  rankingsPath(),
  rankingsSeo(debates),
  "Compare Slugfester interlocutor scores and topic-level reasoning flags across published debate assessments."
);

[...interlocutorProfiles.values()]
  .sort((a, b) => a.person.name.localeCompare(b.person.name))
  .forEach(({ person, appearances, latestDate, debates: profileDebates }) => {
    addPage(
      interlocutorPath(person),
      interlocutorSeo(person, appearances, latestDate, profileDebates),
      `${person.name}'s Slugfester profile includes score averages, opponents faced, topic performance, and linked debate scorecards.`
    );
  });

addPage(
  backendPath(),
  backendSeo(),
  "Backend explains Slugfester's full-transcript review, independent judgments, deterministic scoring, validation controls, update plans, and campaign compute estimate."
);

addPage(
  correctionsPath(),
  correctionsSeo(),
  "Report a possible Slugfester scorecard issue and review the public correction record."
);

addPage(
  assessmentPath(),
  assessmentSeo(),
  "The old Assessment page name has been replaced by Backend."
);

debates.forEach((debate) => {
  addPage(
    debatePath(debate),
    debateSeo(debate, debateParticipantsBySide(debate)),
    `${sentence(debate.summary)} Overall side scores: ${debate.sides.pro.name} ${debate.score.pro}; ${debate.sides.con.name} ${debate.score.con}. The full scorecard maps transcript-grounded claims, rebuttals, critiques, and timestamped sources.`
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
pageOutputs.set(join(root, "feed.xml"), atomFeed(debates));
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
  await rm(join(root, "topics"), { recursive: true, force: true });
  await rm(join(root, "rankings"), { recursive: true, force: true });
  await rm(join(root, "interlocutor"), { recursive: true, force: true });
  await rm(join(root, "backend"), { recursive: true, force: true });
  await rm(join(root, "corrections"), { recursive: true, force: true });
  await rm(join(root, "assessment"), { recursive: true, force: true });
  await rm(join(root, "src/data/debate-details"), { recursive: true, force: true });
  await rm(join(root, "src/data/reference-appearances"), { recursive: true, force: true });
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
