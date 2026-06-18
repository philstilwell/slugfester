export const SITE_URL = "https://slugfester.com";
export const SITE_NAME = "Slugfester";
export const SITE_LOCALE = "en_US";
export const SITE_LANGUAGE = "en";
export const SITE_THEME_COLOR = "#13201f";
export const SITE_UPDATED_DATE = "2026-06-18";
export const DEFAULT_TITLE = "Slugfester | YouTube Debate Argument Scorecards";
export const DEFAULT_DESCRIPTION =
  "Explore YouTube debate transcripts as side-by-side argument scorecards with AI-assisted reasoning scores, critique popovers, and contextual fallacy and bias references.";
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

  const truncated = text.slice(0, maxLength - 1);
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: "Slugfester debate scorecards",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: organizationIdentityJsonLd()
  };

  if (topics.length) {
    jsonLd.about = topics.map((topic) => ({
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
  const topics = debates.map((debate) => debate.label);

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: "/",
    lastmod: SITE_UPDATED_DATE,
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

  return {
    title: pageTitle(`${debateNumberLabel(debate)}: ${debate.title}`),
    description: compactText(
      `${debateNumberLabel(debate)} (${debate.label}): ${debate.summary} Scores: ${debate.sides.pro.name} ${debate.score.pro}, ${debate.sides.con.name} ${debate.score.con}.`,
      180
    ),
    canonicalPath: debatePath(debate),
    imagePath: DEFAULT_IMAGE,
    imageAlt: `${debateNumberLabel(debate)} scorecard: ${debate.title}`,
    type: "article",
    articleSection: "Debate scorecards",
    lastmod: modifiedDate,
    publishedTime: debate.date,
    modifiedTime: modifiedDate,
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${debateNumberLabel(debate)}: ${debate.title}`,
        name: `${debateNumberLabel(debate)}: ${debate.title}`,
        description: compactText(debate.summary, 220),
        datePublished: debate.date,
        dateModified: modifiedDate,
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
    lastmod: SITE_UPDATED_DATE,
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

export function assessmentSeo() {
  const description =
    "A detailed explanation of how Slugfester turns debate transcripts into quote-forward AI scorecards, critique popovers, fallacy notes, and overall assessments.";

  return {
    title: pageTitle("The Codex Assessment Process"),
    description,
    canonicalPath: assessmentPath(),
    lastmod: SITE_UPDATED_DATE,
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester assessment process for debate argument scorecards.",
    type: "article",
    articleSection: "Methodology",
    modifiedTime: SITE_UPDATED_DATE,
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "The Codex Assessment Process",
        name: "The Codex Assessment Process",
        description,
        dateModified: SITE_UPDATED_DATE,
        mainEntityOfPage: absoluteUrl(assessmentPath()),
        url: absoluteUrl(assessmentPath()),
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
          "argument analysis",
          "debate transcript assessment",
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
        { name: "Assessment", path: assessmentPath() }
      ])
    ]
  };
}

export function referenceSeo(type, slug, reference) {
  const category = type === "fallacy" ? "Logical fallacy" : "Cognitive bias";
  const sourceName = type === "fallacy" ? "LogFall" : "CogBias";
  const sourceSetUrl =
    type === "fallacy" ? "https://logfall.com/fallacies/" : "https://cogbias.site/biases/";

  return {
    title: pageTitle(`${reference.label} ${category.toLowerCase()}`),
    description: compactText(`${reference.label}: ${reference.definition}`, 170),
    canonicalPath: referencePath(type, slug),
    lastmod: SITE_UPDATED_DATE,
    imagePath: DEFAULT_IMAGE,
    imageAlt: `${reference.label} ${category.toLowerCase()} reference on Slugfester.`,
    type: "article",
    articleSection: category,
    modifiedTime: SITE_UPDATED_DATE,
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
    canonicalPath: "/",
    imagePath: DEFAULT_IMAGE,
    imageAlt: DEFAULT_IMAGE_ALT,
    type: "website",
    robots: "noindex,follow",
    jsonLd: null
  };
}
