export const SITE_URL = "https://slugfester.com";
export const SITE_NAME = "Slugfester";
export const SITE_LOCALE = "en_US";
export const SITE_LANGUAGE = "en";
export const SITE_THEME_COLOR = "#13201f";
export const SITE_UPDATED_DATE = "2026-08-30";
export const SITE_TIME_ZONE_OFFSET = "-04:00";
export const SITE_UPDATED_DATETIME = `${SITE_UPDATED_DATE}T12:00:00${SITE_TIME_ZONE_OFFSET}`;
export const DEFAULT_TITLE = "Slugfester | YouTube Debate Argument Scorecards";
export const DEFAULT_DESCRIPTION =
  "Explore YouTube debate transcripts as side-by-side argument scorecards with AI reasoning scores, critique popovers, and fallacy or bias references.";
export const DEFAULT_IMAGE = "/assets/social-card.png";
export const DEFAULT_IMAGE_ALT =
  "Slugfester debate scorecards with boxing gloves and argument analysis.";
export const DEFAULT_IMAGE_WIDTH = 1200;
export const DEFAULT_IMAGE_HEIGHT = 630;
export const DEFAULT_IMAGE_TYPE = "image/png";
export const DEFAULT_ROBOTS = "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

function latestIsoDate(...dates) {
  const values = dates.filter(Boolean);
  return values.length ? values.sort().at(-1) : SITE_UPDATED_DATE;
}

function latestDebateDate(debates = []) {
  return latestIsoDate(...debates.map((debate) => debate?.date), SITE_UPDATED_DATE);
}

function seoDateTime(date = SITE_UPDATED_DATE) {
  const value = String(date || SITE_UPDATED_DATE);
  return value.includes("T") ? value : `${value}T12:00:00${SITE_TIME_ZONE_OFFSET}`;
}

function uniqueNames(values = [], limit = 48) {
  const seen = new Set();
  const names = [];

  values.forEach((value) => {
    const name = String(value || "").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key) || names.length >= limit) return;
    seen.add(key);
    names.push(name);
  });

  return names;
}

function speakerLabel(value = "") {
  const names = String(value)
    .split(/\s*(?:,| and | & )\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
  const labels = names.map((name) => {
    const cleaned = name.replace(/^\(([^)]+)\)$/, "$1").replace(/\s+\([^)]*\)/g, "").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    return parts.at(-1) || cleaned || name;
  });

  if (labels.length > 1) return `${labels[0]} +${labels.length - 1}`;
  return labels.join(" & ");
}

function debateSearchTitle(debate) {
  return `${debateNumberLabel(debate)}: ${speakerLabel(debate.sides.pro.speaker)} vs ${speakerLabel(
    debate.sides.con.speaker
  )}`;
}

function organizationIdentityJsonLd() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL
  };
}

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).href;
}

export function debatePath(debateOrId) {
  const id = typeof debateOrId === "string" ? debateOrId : debateOrId.id;
  return `/debate/${encodeURIComponent(id)}/`;
}

export function searchPath() {
  return "/search/";
}

export function topicsPath() {
  return "/topics/";
}

export function rankingsPath() {
  return "/rankings/";
}

export function interlocutorSlug(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function interlocutorPath(personOrName) {
  const name = typeof personOrName === "string" ? personOrName : personOrName.name;
  return `/interlocutor/${encodeURIComponent(interlocutorSlug(name))}/`;
}

export function backendPath() {
  return "/backend/";
}

export function correctionsPath() {
  return "/corrections/";
}

export function assessmentPath() {
  return "/assessment/";
}

export function referencePath(type, slug, debateId = "") {
  const source = debateId ? `?debate=${encodeURIComponent(debateId)}` : "";
  return `/reference/${encodeURIComponent(type)}/${encodeURIComponent(slug)}/${source}`;
}

export function debateNumberLabel(debate) {
  return `Debate ${debate.number}`;
}

export function compactText(value = "", maxLength = 158) {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, Math.max(0, maxLength - 3));
  const lastSpace = truncated.lastIndexOf(" ");
  const cleanCut = truncated
    .slice(0, lastSpace > 80 ? lastSpace : truncated.length)
    .trim()
    .replace(/[.,;:!?]+$/, "");
  return `${cleanCut}...`;
}

export function pageTitle(title = "") {
  return title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
}

export function imageObject(
  path = DEFAULT_IMAGE,
  alt = DEFAULT_IMAGE_ALT,
  width = DEFAULT_IMAGE_WIDTH,
  height = DEFAULT_IMAGE_HEIGHT
) {
  return {
    "@type": "ImageObject",
    url: absoluteUrl(path),
    width,
    height,
    caption: alt
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    ...organizationIdentityJsonLd(),
    logo: imageObject("/assets/debate-gloves.png", "Slugfester boxing gloves logo", 444, 444)
  };
}

export function websiteJsonLd(topics = []) {
  const topicNames = uniqueNames(topics);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: "Slugfester debate scorecards",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: organizationIdentityJsonLd(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl(`${searchPath()}?q={search_term_string}`)
      },
      "query-input": "required name=search_term_string"
    }
  };

  if (topicNames.length) {
    jsonLd.about = topicNames.map((topic) => ({
      "@type": "Thing",
      name: topic
    }));
  }

  return jsonLd;
}

export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function landingSeo(debates = []) {
  const topics = uniqueNames(debates.map((debate) => debate.label));

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: "/",
    lastmod: latestDebateDate(debates),
    imagePath: DEFAULT_IMAGE,
    imageAlt: DEFAULT_IMAGE_ALT,
    type: "website",
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(topics),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Slugfester debate scorecards",
        description: "Clean URLs for Slugfester's debate transcript scorecards.",
        itemListElement: debates.map((debate, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(debatePath(debate)),
          name: `${debateNumberLabel(debate)}: ${debate.title}`
        }))
      }
    ]
  };
}

export function debateSeo(debate) {
  const modifiedDate = latestIsoDate(debate.date, SITE_UPDATED_DATE);
  const publishedTime = seoDateTime(debate.date);
  const modifiedTime = seoDateTime(modifiedDate);

  return {
    title: pageTitle(debateSearchTitle(debate)),
    description: compactText(
      `${debateNumberLabel(debate)} scorecard: ${debate.summary} Scores: ${debate.sides.pro.name} ${debate.score.pro}; ${debate.sides.con.name} ${debate.score.con}.`,
      158
    ),
    canonicalPath: debatePath(debate),
    imagePath: DEFAULT_IMAGE,
    imageAlt: `${debateNumberLabel(debate)} scorecard: ${debate.title}`,
    type: "article",
    articleSection: "Debate scorecards",
    lastmod: modifiedDate,
    publishedTime,
    modifiedTime,
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${debateNumberLabel(debate)}: ${debate.title}`,
        name: `${debateNumberLabel(debate)}: ${debate.title}`,
        description: compactText(debate.summary, 220),
        datePublished: publishedTime,
        dateModified: modifiedTime,
        mainEntityOfPage: absoluteUrl(debatePath(debate)),
        url: absoluteUrl(debatePath(debate)),
        image: imageObject(),
        thumbnailUrl: absoluteUrl(DEFAULT_IMAGE),
        inLanguage: SITE_LANGUAGE,
        articleSection: "Debate scorecards",
        isAccessibleForFree: true,
        author: organizationIdentityJsonLd(),
        publisher: organizationIdentityJsonLd(),
        isPartOf: {
          "@type": "WebSite",
          "@id": WEBSITE_ID,
          name: SITE_NAME,
          url: SITE_URL
        },
        about: [
          debate.label,
          debate.motion,
          debate.sides.pro.speaker,
          debate.sides.con.speaker
        ].map((name) => ({
          "@type": "Thing",
          name
        })),
        keywords: [
          debate.label,
          debate.sides.pro.speaker,
          debate.sides.con.speaker,
          debate.sides.pro.name,
          debate.sides.con.name,
          "debate scorecard",
          "argument analysis"
        ],
        citation: debate.youtubeUrl
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: `${debateNumberLabel(debate)}: ${debate.title}`, path: debatePath(debate) }
      ])
    ]
  };
}

export function searchSeo(debates = []) {
  return {
    title: pageTitle("Search debate scorecards"),
    description: `Filter ${debates.length} Slugfester debate scorecards by interlocutor and text.`,
    canonicalPath: searchPath(),
    lastmod: latestDebateDate(debates),
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester debate search with interlocutors.",
    type: "website",
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Search Slugfester debate scorecards",
        description: `Filter ${debates.length} Slugfester debate scorecards by interlocutor and text.`,
        url: absoluteUrl(searchPath()),
        isPartOf: {
          "@id": WEBSITE_ID
        },
        mainEntity: {
          "@type": "ItemList",
          name: "Debate scorecards",
          numberOfItems: debates.length,
          itemListElement: debates.map((debate, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(debatePath(debate)),
            name: `${debateNumberLabel(debate)}: ${debate.title}`
          }))
        }
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: "Search", path: searchPath() }
      ])
    ]
  };
}

export function topicsSeo(debates = []) {
  const topics = uniqueNames(debates.map((debate) => debate.label));
  const description = `Browse ${debates.length} Slugfester debate scorecards grouped by recurring topics, with compact debate links and participant portraits.`;

  return {
    title: pageTitle("Debates by topic"),
    description,
    canonicalPath: topicsPath(),
    lastmod: latestDebateDate(debates),
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester topic index with compact debate cards.",
    type: "website",
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(topics),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Slugfester debates by topic",
        description,
        url: absoluteUrl(topicsPath()),
        isPartOf: {
          "@id": WEBSITE_ID
        },
        about: topics.map((topic) => ({
          "@type": "Thing",
          name: topic
        })),
        mainEntity: {
          "@type": "ItemList",
          name: "Debate topics",
          numberOfItems: debates.length,
          itemListElement: debates.map((debate, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(debatePath(debate)),
            name: `${debateNumberLabel(debate)}: ${debate.label}`
          }))
        }
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: "Topics", path: topicsPath() }
      ])
    ]
  };
}

export function rankingsSeo(debates = [], rankedInterlocutorCount = 0) {
  const description = `Compare average overall debate scores for ${rankedInterlocutorCount || "qualifying"} Slugfester interlocutors and topic-level reasoning flags across ${debates.length} scorecards.`;

  return {
    title: pageTitle("Rankings & Flags"),
    description,
    canonicalPath: rankingsPath(),
    lastmod: latestDebateDate(debates),
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester flags and rankings for debate scorecards.",
    type: "website",
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Slugfester Rankings & Flags",
        description,
        url: absoluteUrl(rankingsPath()),
        isPartOf: {
          "@id": WEBSITE_ID
        },
        about: ["debate performance", "average argument scores", "interlocutors"].map((name) => ({
          "@type": "Thing",
          name
        }))
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: "Rankings", path: rankingsPath() }
      ])
    ]
  };
}

export function interlocutorSeo(person, appearances = 0, updatedDate = SITE_UPDATED_DATE) {
  const profilePath = interlocutorPath(person);
  const appearanceLabel = `${appearances} eligible 1-on-1 ${appearances === 1 ? "debate scorecard" : "debate scorecards"}`;
  const description = appearances
    ? `${person.name}'s Slugfester debate profile, including published score averages, opponents faced, topic performance, and ${appearanceLabel}.`
    : `${person.name}'s Slugfester debate profile links team or panel appearances; shared side scores are excluded from individual averages.`;

  return {
    title: pageTitle(`${person.name} debate profile`),
    description,
    canonicalPath: profilePath,
    lastmod: updatedDate || SITE_UPDATED_DATE,
    imagePath: DEFAULT_IMAGE,
    imageAlt: `${person.name}'s Slugfester debate profile.`,
    type: "website",
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: `${person.name} debate profile`,
        description,
        url: absoluteUrl(profilePath),
        isPartOf: {
          "@id": WEBSITE_ID
        },
        mainEntity: {
          "@type": "Person",
          name: person.name,
          ...(person.placeholder ? {} : { image: absoluteUrl(person.src) })
        }
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: "Rankings", path: rankingsPath() },
        { name: person.name, path: profilePath }
      ])
    ]
  };
}

export function backendSeo({ legacy = false } = {}) {
  const description =
    "How Slugfester uses complete transcripts, independent AI judgments, deterministic scoring, audio checks, and repository validation to build debate scorecards.";
  const updatedDate = "2026-08-28";

  return {
    title: pageTitle("Backend"),
    description,
    canonicalPath: backendPath(),
    robots: legacy ? "noindex,follow" : DEFAULT_ROBOTS,
    lastmod: updatedDate,
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester backend process for debate argument scorecards.",
    type: "article",
    articleSection: "Methodology",
    modifiedTime: seoDateTime(updatedDate),
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Backend",
        name: "Backend",
        description,
        dateModified: seoDateTime(updatedDate),
        mainEntityOfPage: absoluteUrl(backendPath()),
        url: absoluteUrl(backendPath()),
        image: imageObject(),
        thumbnailUrl: absoluteUrl(DEFAULT_IMAGE),
        inLanguage: SITE_LANGUAGE,
        articleSection: "Methodology",
        isAccessibleForFree: true,
        author: organizationIdentityJsonLd(),
        publisher: organizationIdentityJsonLd(),
        isPartOf: {
          "@type": "WebSite",
          "@id": WEBSITE_ID,
          name: SITE_NAME,
          url: SITE_URL
        },
        about: [
          "AI debate scorecards",
          "argument analysis",
          "debate transcript backend",
          "logical coherence",
          "fallacy detection",
          "cognitive bias"
        ].map((name) => ({
          "@type": "Thing",
          name
        }))
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: "Backend", path: backendPath() }
      ])
    ]
  };
}

export function correctionsSeo() {
  const description =
    "Report a possible Slugfester scorecard issue and review the public record of material scoring, attribution, and presentation corrections.";

  return {
    title: pageTitle("Corrections & revisions"),
    description,
    canonicalPath: correctionsPath(),
    lastmod: SITE_UPDATED_DATE,
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester corrections and revision record.",
    type: "website",
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Slugfester corrections and revisions",
        description,
        url: absoluteUrl(correctionsPath()),
        dateModified: seoDateTime(SITE_UPDATED_DATE),
        isPartOf: {
          "@id": WEBSITE_ID
        }
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: "Corrections", path: correctionsPath() }
      ])
    ]
  };
}

export function assessmentSeo() {
  return backendSeo({ legacy: true });
}

export function referenceSeo(type, slug, reference) {
  const category = type === "fallacy" ? "Logical fallacy" : "Cognitive bias";
  const sourceName = type === "fallacy" ? "LogFall" : "CogBias";
  const sourceSetUrl =
    type === "fallacy" ? "https://logfall.com/fallacies/" : "https://cogbias.site/biases/";

  return {
    title: pageTitle(`${reference.label} ${category.toLowerCase()}`),
    description: compactText(`${reference.label}: ${reference.definition}`, 158),
    canonicalPath: referencePath(type, slug),
    lastmod: SITE_UPDATED_DATE,
    imagePath: DEFAULT_IMAGE,
    imageAlt: `${reference.label} ${category.toLowerCase()} reference on Slugfester.`,
    type: "article",
    articleSection: category,
    modifiedTime: SITE_UPDATED_DATETIME,
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        name: reference.label,
        description: reference.definition,
        url: absoluteUrl(referencePath(type, slug)),
        mainEntityOfPage: absoluteUrl(referencePath(type, slug)),
        inDefinedTermSet: {
          "@type": "DefinedTermSet",
          name: sourceName,
          url: sourceSetUrl
        },
        sameAs: reference.externalUrl,
        additionalType: category
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: reference.label, path: referencePath(type, slug) }
      ])
    ]
  };
}

export function notFoundSeo() {
  return {
    title: pageTitle("Page not found"),
    description: "This Slugfester page could not be found.",
    canonicalPath: null,
    imagePath: DEFAULT_IMAGE,
    imageAlt: DEFAULT_IMAGE_ALT,
    type: "website",
    robots: "noindex,follow",
    jsonLd: null
  };
}
