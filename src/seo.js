export const SITE_URL = "https://slugfester.com";
export const SITE_NAME = "Slugfester";
export const DEFAULT_TITLE = "Slugfester";
export const DEFAULT_DESCRIPTION =
  "Slugfester turns YouTube debate transcripts into side-by-side argument scorecards with AI-generated reasoning scores, critique popovers, and contextual fallacy and bias references.";
export const DEFAULT_IMAGE = "/assets/slugfester-logo.jpg";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).href;
}

export function debatePath(debateOrId) {
  const id = typeof debateOrId === "string" ? debateOrId : debateOrId.id;
  return `/debate/${encodeURIComponent(id)}/`;
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

export function landingSeo(debates = []) {
  const topics = debates.map((debate) => `${debate.number} ${debate.label}`).join(" | ");

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: "/",
    imagePath: DEFAULT_IMAGE,
    type: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        about: topics
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Slugfester debate scorecards",
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
  return {
    title: pageTitle(`${debateNumberLabel(debate)}: ${debate.title}`),
    description: compactText(
      `${debateNumberLabel(debate)} (${debate.label}): ${debate.summary} Scores: ${debate.sides.pro.name} ${debate.score.pro}, ${debate.sides.con.name} ${debate.score.con}.`,
      180
    ),
    canonicalPath: debatePath(debate),
    imagePath: DEFAULT_IMAGE,
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${debateNumberLabel(debate)}: ${debate.title}`,
      description: compactText(debate.summary, 220),
      dateModified: debate.date,
      url: absoluteUrl(debatePath(debate)),
      image: absoluteUrl(DEFAULT_IMAGE),
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL
      },
      about: [
        debate.label,
        debate.motion,
        debate.sides.pro.speaker,
        debate.sides.con.speaker
      ],
      citation: debate.youtubeUrl
    }
  };
}

export function referenceSeo(type, slug, reference) {
  const category = type === "fallacy" ? "Logical fallacy" : "Cognitive bias";

  return {
    title: pageTitle(`${reference.label} ${category.toLowerCase()}`),
    description: compactText(`${reference.label}: ${reference.definition}`, 170),
    canonicalPath: referencePath(type, slug),
    imagePath: DEFAULT_IMAGE,
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: reference.label,
      description: reference.definition,
      url: absoluteUrl(referencePath(type, slug)),
      inDefinedTermSet: reference.externalUrl,
      additionalType: category
    }
  };
}

export function notFoundSeo() {
  return {
    title: pageTitle("Page not found"),
    description: "This Slugfester page could not be found.",
    canonicalPath: "/",
    imagePath: DEFAULT_IMAGE,
    type: "website",
    robots: "noindex,follow",
    jsonLd: null
  };
}
