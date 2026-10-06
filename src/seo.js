import { topicCategoryDefinitions } from "./data/topics.js?v=239c23dccc1563a2";

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
  "Compare debates on God, science, ethics and philosophy through transcript-based argument scores, detailed critiques, speaker records and source links.";
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

function speakerNames(value = "") {
  return String(value)
    .split(/\s*(?:,| and | & )\s*/i)
    .map((name) => name.trim())
    .map((name) => name.replace(/^\(([^)]+)\)$/, "$1").replace(/\s+\([^)]*\)/g, "").trim())
    .filter(Boolean);
}

function speakerLabel(value = "") {
  return speakerSummary(speakerNames(value));
}

function speakerSummary(names = []) {
  const labels = names.map((name) => {
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.at(-1) || name;
  });

  if (labels.length > 1) return `${labels[0]} +${labels.length - 1}`;
  return labels.join(" & ");
}

export function debateDisplayTitle(debate) {
  return String(debate?.title || "").replace(/\s*\((?:19|20)\d{2}(?:, formal rounds)?\)\s*$/, "").trim();
}

export function debateYear(debate) {
  const explicitYear = String(debate?.year || "").match(/^(?:19|20)\d{2}$/)?.[0];
  const titleYear = String(debate?.title || "").match(/\(((?:19|20)\d{2})\)\s*$/)?.[1];
  const idYear = String(debate?.id || "").match(/-((?:19|20)\d{2})$/)?.[1];
  return explicitYear || titleYear || idYear || "";
}

export function debateTitleWithYear(debate) {
  const title = debateDisplayTitle(debate);
  const year = debateYear(debate);
  return year ? `${title} · ${year}` : title;
}

function debateTopicTitle(debate) {
  const title = debateDisplayTitle(debate);
  const normalizeNamePunctuation = (value) => value.replace(/[‘’]/g, "'").toLocaleLowerCase();
  const matchingTitle = normalizeNamePunctuation(title);
  const participantIndexes = [
    ...speakerNames(debate.sides.pro.speaker),
    ...speakerNames(debate.sides.con.speaker)
  ]
    .map((name) => matchingTitle.indexOf(normalizeNamePunctuation(name)))
    .filter((index) => index >= 0)
    .sort((first, second) => first - second);
  const firstParticipantIndex = participantIndexes[0];
  let topic = "";

  if (Number.isFinite(firstParticipantIndex)) {
    if (firstParticipantIndex <= 4) {
      const colonIndex = title.indexOf(":");
      if (colonIndex >= 0) topic = title.slice(colonIndex + 1);
    } else {
      topic = title.slice(0, firstParticipantIndex);
    }
  }

  return topic.replace(/\s*[:–—-]+\s*$/, "").trim() || debate.label;
}

function compactTitlePart(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;

  const candidate = text.slice(0, Math.max(1, maxLength - 1));
  const lastSpace = candidate.lastIndexOf(" ");
  const cleanCut = candidate
    .slice(0, lastSpace > 12 ? lastSpace : candidate.length)
    .trim()
    .replace(/[,:;]+$/, "");
  return `${cleanCut}…`;
}

function debateSearchTitle(debate, participantsBySide = {}) {
  const proNames = participantsBySide.pro?.map((person) => person.name).filter(Boolean) || [];
  const conNames = participantsBySide.con?.map((person) => person.name).filter(Boolean) || [];
  const speakers = `${proNames.length ? speakerSummary(proNames) : speakerLabel(debate.sides.pro.speaker)} vs ${conNames.length ? speakerSummary(conNames) : speakerLabel(debate.sides.con.speaker)}`;
  const yearSuffix = debateYear(debate) ? ` · ${debateYear(debate)}` : "";
  const topicBudget = Math.max(16, 66 - speakers.length - 3 - yearSuffix.length);
  return `${compactTitlePart(debateTopicTitle(debate), topicBudget)} — ${speakers}${yearSuffix}`;
}

function personIdentityJsonLd(name, imagePath = "") {
  const url = absoluteUrl(interlocutorPath(name));
  return {
    "@type": "Person",
    "@id": `${url}#person`,
    name,
    url,
    ...(imagePath ? { image: absoluteUrl(imagePath) } : {})
  };
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

// Use the same recorded page-change date in initial HTML and after navigation.
export function withPageUpdate(seo, date) {
  if (!date || seo.canonicalPath === null) return seo;
  const jsonLd = seo.jsonLd?.map((entry) =>
    ["Article", "WebPage", "CollectionPage"].includes(entry["@type"])
      ? { ...entry, dateModified: date }
      : entry
  );
  return { ...seo, lastmod: date, ...(seo.type === "article" ? { modifiedTime: date } : {}), jsonLd };
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

export function topicPath(topicOrId) {
  const id = typeof topicOrId === "string" ? topicOrId : topicOrId.id;
  return `/topics/${encodeURIComponent(id)}/`;
}

export function topicSeo(topic, debates = []) {
  const matches = debates.filter((debate) => debate.topicCategory === topic.id)
    .sort((a, b) => Number(b.number) - Number(a.number));
  const description = compactText(`Explore ${matches.length} assessed debates on ${topic.title.toLowerCase()}, with argument critiques, speaker records and original sources. ${topic.description}`);
  return {
    title: pageTitle(`${topic.shortLabel} debates & analysis`),
    heading: `${topic.title}: debates and analysis`,
    description, canonicalPath: topicPath(topic), lastmod: latestDebateDate(matches),
    imagePath: DEFAULT_IMAGE, imageAlt: DEFAULT_IMAGE_ALT, type: "website",
    relatedLinks: [{ href: topicsPath(), label: "All debate topics" }],
    jsonLd: [organizationJsonLd(), websiteJsonLd(),
      {
        "@context": "https://schema.org", "@type": "CollectionPage",
        "@id": absoluteUrl(`${topicPath(topic)}#webpage`),
        name: `${topic.title}: debates and analysis`, description,
        url: absoluteUrl(topicPath(topic)), inLanguage: SITE_LANGUAGE,
        isPartOf: { "@id": WEBSITE_ID }, about: { "@type": "Thing", name: topic.title },
        mainEntity: {
          "@type": "ItemList", name: `${topic.title} debate assessments`, numberOfItems: matches.length,
          itemListElement: matches.map((debate, index) => ({
            "@type": "ListItem", position: index + 1,
            url: absoluteUrl(debatePath(debate)), name: debateTitleWithYear(debate)
          }))
        }
      },
      breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }, { name: "Topics", path: topicsPath() }, { name: topic.title, path: topicPath(topic) }])
    ]
  };
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

export function insightsPath() {
  return "/insights/";
}

export function insightsSeo() {
  const description = "Seven research findings from Slugfester’s debate archive: evidence, score gaps, slogans, fallacy counts and ranking reliability, with figures and limitations.";
  return {
    title: pageTitle("Insights from the debates"), heading: "Insights from the debates",
    description, canonicalPath: insightsPath(), lastmod: "2026-09-05",
    jsonLd: [
      organizationJsonLd(), websiteJsonLd(),
      { "@context": "https://schema.org", "@type": "CollectionPage", name: "Insights from the debates", description, url: absoluteUrl(insightsPath()), dateModified: "2026-09-05", isPartOf: { "@id": WEBSITE_ID } },
      breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }, { name: "Insights", path: insightsPath() }])
    ]
  };
}

export function insightsMethodsSeo() {
  const description = "The evidence, calculations, limitations and downloadable research data behind Slugfester’s seven Insights studies.";
  return {
    title: pageTitle("Insights: data and methods"), heading: "Data and methods",
    description, canonicalPath: "/insights/data-and-methods/", lastmod: "2026-09-05",
    jsonLd: [organizationJsonLd(), websiteJsonLd(),
      {
        "@context": "https://schema.org", "@type": "WebPage",
        "@id": absoluteUrl("/insights/data-and-methods/#webpage"),
        name: "Insights: data and methods", description,
        url: absoluteUrl("/insights/data-and-methods/"), inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID }
      },
      breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }, { name: "Insights", path: insightsPath() }, { name: "Data and methods", path: "/insights/data-and-methods/" }])]
  };
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
    description: "Independent, AI-assisted analysis of the reasoning presented in public debates.",
    publishingPrinciples: absoluteUrl(backendPath()),
    correctionsPolicy: absoluteUrl(correctionsPath()),
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
  const recentDebates = [...debates]
    .sort((first, second) => Number(second.number) - Number(first.number))
    .slice(0, 12);

  return {
    title: DEFAULT_TITLE,
    heading: "Slugfester debate scorecards",
    description: DEFAULT_DESCRIPTION,
    canonicalPath: "/",
    lastmod: latestDebateDate(debates),
    imagePath: DEFAULT_IMAGE,
    imageAlt: DEFAULT_IMAGE_ALT,
    type: "website",
    relatedLinks: recentDebates.map((debate) => ({
      href: debatePath(debate),
      label: `${debateNumberLabel(debate)}: ${debateTitleWithYear(debate)}`
    })),
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(topics),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": absoluteUrl("/#webpage"),
        name: "Slugfester debate scorecards",
        description: DEFAULT_DESCRIPTION,
        url: absoluteUrl("/"),
        inLanguage: SITE_LANGUAGE,
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: { "@id": absoluteUrl("/#newest-debates") }
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "@id": absoluteUrl("/#newest-debates"),
        name: "Slugfester debate scorecards",
        description: "Recently added transcript-grounded debate assessments.",
        numberOfItems: recentDebates.length,
        itemListElement: recentDebates.map((debate, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(debatePath(debate)),
          name: `${debateNumberLabel(debate)}: ${debateTitleWithYear(debate)}`
        }))
      }
    ]
  };
}

export function debateSeo(debate, participantsBySide = {}) {
  const modifiedDate = latestIsoDate(debate.date, SITE_UPDATED_DATE);
  const publishedTime = seoDateTime(debate.date);
  const modifiedTime = seoDateTime(modifiedDate);
  const mappedParticipants = [
    ...(participantsBySide.pro || []),
    ...(participantsBySide.con || [])
  ];
  const participantNames = uniqueNames(
    mappedParticipants.length
      ? mappedParticipants.map((person) => person.name)
      : [
          ...speakerNames(debate.sides.pro.speaker),
          ...speakerNames(debate.sides.con.speaker)
        ]
  );
  const participantByName = new Map(mappedParticipants.map((person) => [person.name, person]));
  const participants = participantNames.map((name) => {
    const person = participantByName.get(name);
    return person
      ? personIdentityJsonLd(person.name, person.placeholder ? "" : person.src)
      : { "@type": "Person", name };
  });
  const relatedLinks = [
    ...topicCategoryDefinitions.filter((topic) => topic.id === debate.topicCategory).map((topic) => ({
      href: topicPath(topic), label: `More debates on ${topic.title.toLowerCase()}`
    })),
    ...mappedParticipants.map((person) => ({
      href: interlocutorPath(person),
      label: `${person.name} debate profile`
    })),
    { href: debate.youtubeUrl, label: "Original YouTube debate" },
    ...(debate.additionalSources || []).map((source) => ({ href: source.url, label: source.label }))
  ];

  return {
    title: pageTitle(debateSearchTitle(debate, participantsBySide)),
    heading: debateTitleWithYear(debate),
    description: compactText(`${debateSearchTitle(debate, participantsBySide)}. ${debate.motion} Read the argument scores, critiques and original sources.`),
    canonicalPath: debatePath(debate),
    imagePath: DEFAULT_IMAGE,
    imageAlt: `${debateNumberLabel(debate)} scorecard: ${debateTitleWithYear(debate)}`,
    type: "article",
    articleSection: "Debate scorecards",
    lastmod: modifiedDate,
    publishedTime,
    modifiedTime,
    relatedLinks,
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${debateNumberLabel(debate)}: ${debateTitleWithYear(debate)}`,
        name: `${debateNumberLabel(debate)}: ${debateTitleWithYear(debate)}`,
        description: compactText(debate.summary, 220),
        datePublished: publishedTime,
        dateModified: modifiedTime,
        mainEntityOfPage: absoluteUrl(debatePath(debate)),
        url: absoluteUrl(debatePath(debate)),
        image: imageObject(),
        thumbnailUrl: absoluteUrl(DEFAULT_IMAGE),
        inLanguage: SITE_LANGUAGE,
        articleSection: "Debate scorecards",
        temporalCoverage: debateYear(debate) || undefined,
        isAccessibleForFree: true,
        author: organizationIdentityJsonLd(),
        publisher: organizationIdentityJsonLd(),
        isPartOf: {
          "@type": "WebSite",
          "@id": WEBSITE_ID,
          name: SITE_NAME,
          url: SITE_URL
        },
        about: [debate.label, debate.motion].map((name) => ({
          "@type": "Thing",
          name
        })),
        mentions: participants,
        keywords: [
          debate.label,
          ...participantNames,
          debate.sides.pro.name,
          debate.sides.con.name,
          "debate scorecard",
          "argument analysis"
        ],
        citation: debate.youtubeUrl
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: `${debateNumberLabel(debate)}: ${debateTitleWithYear(debate)}`, path: debatePath(debate) }
      ])
    ]
  };
}

export function searchSeo(debates = []) {
  return {
    title: pageTitle("Search debate transcripts & scorecards"),
    heading: "Search debate scorecards",
    description: `Filter ${debates.length} Slugfester debate scorecards by interlocutor and text.`,
    canonicalPath: searchPath(),
    lastmod: latestDebateDate(debates),
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester debate search with interlocutors.",
    type: "website",
    relatedLinks: topicCategoryDefinitions.map((topic) => ({
      href: topicPath(topic),
      label: topic.title
    })),
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
            name: `${debateNumberLabel(debate)}: ${debateTitleWithYear(debate)}`
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
    title: pageTitle("Debate topics & argument scorecards"),
    heading: "Debates by topic",
    description,
    canonicalPath: topicsPath(),
    lastmod: latestDebateDate(debates),
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester topic index with compact debate cards.",
    type: "website",
    relatedLinks: topicCategoryDefinitions.map((topic) => ({
      href: topicPath(topic),
      label: topic.title
    })),
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
          numberOfItems: topicCategoryDefinitions.length,
          itemListElement: topicCategoryDefinitions.map((topic, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(topicPath(topic)),
            name: topic.title
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

export function rankingsSeo(debates = []) {
  const description = `Compare Slugfester speakers by average 1-on-1 debate scores, opponents and reasoning flags. Explore records drawn from ${debates.length} published scorecards.`;

  return {
    title: pageTitle("Debate speaker rankings & score comparison"),
    heading: "Rankings & Flags",
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

export function interlocutorSeo(
  person,
  appearances = 0,
  updatedDate = SITE_UPDATED_DATE,
  profileDebates = [],
  biography = null
) {
  updatedDate = [updatedDate, biography?.reviewed].filter(Boolean).sort().at(-1) || SITE_UPDATED_DATE;
  const profilePath = interlocutorPath(person);
  const appearanceLabel = `${appearances} eligible 1-on-1 ${appearances === 1 ? "debate scorecard" : "debate scorecards"}`;
  const description = appearances
    ? compactText(`${person.name}: ${appearanceLabel}, with scores and opponents. ${biography?.text || "Explore the published arguments and topic performance."}`)
    : `${person.name}'s Slugfester debate profile links team or panel appearances; shared side scores are excluded from individual averages.`;
  const uniqueDebates = [
    ...new Map(profileDebates.filter(Boolean).map((debate) => [debate.id, debate])).values()
  ].sort((first, second) => Number(second.number) - Number(first.number));
  const personEntity = personIdentityJsonLd(person.name, person.placeholder ? "" : person.src);
  if (biography) personEntity.description = biography.text;

  return {
    title: pageTitle(
      appearances ? `${person.name} debate record & scores` : `${person.name} debate appearances`
    ),
    heading: person.name,
    biography,
    description,
    canonicalPath: profilePath,
    lastmod: updatedDate || SITE_UPDATED_DATE,
    imagePath: person.placeholder ? DEFAULT_IMAGE : person.src,
    imageAlt: person.placeholder ? DEFAULT_IMAGE_ALT : `Illustrated portrait of ${person.name}, whose debate record appears on Slugfester.`,
    imageWidth: person.placeholder ? DEFAULT_IMAGE_WIDTH : 512,
    imageHeight: person.placeholder ? DEFAULT_IMAGE_HEIGHT : 512,
    imageType: person.placeholder ? DEFAULT_IMAGE_TYPE : person.src.endsWith(".webp") ? "image/webp" : person.src.endsWith(".png") ? "image/png" : "image/jpeg",
    twitterCard: person.placeholder ? "summary_large_image" : "summary",
    type: "website",
    relatedLinks: uniqueDebates.slice(0, 20).map((debate) => ({
      href: debatePath(debate),
      label: `${debateNumberLabel(debate)}: ${debateTitleWithYear(debate)}`
    })),
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${person.name} debate record and scorecards`,
        description,
        url: absoluteUrl(profilePath),
        dateModified: seoDateTime(updatedDate || SITE_UPDATED_DATE),
        isPartOf: {
          "@id": WEBSITE_ID
        },
        about: personEntity,
        mainEntity: {
          "@type": "ItemList",
          name: `${person.name} debate scorecards and appearances`,
          numberOfItems: uniqueDebates.length,
          itemListElement: uniqueDebates.map((debate, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(debatePath(debate)),
            name: `${debateNumberLabel(debate)}: ${debateTitleWithYear(debate)}`
          }))
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
    "Follow Slugfester’s illustrated assessment process: source checks, independent AI reviews, scoring rules, fallacy checks and worked examples.";
  const updatedDate = "2026-09-26";

  return {
    title: pageTitle("How Slugfester scores debates"),
    heading: "Backend",
    description,
    canonicalPath: backendPath(),
    robots: legacy ? "noindex,follow" : DEFAULT_ROBOTS,
    lastmod: updatedDate,
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester backend process for debate argument scorecards.",
    type: "article",
    articleSection: "Methodology",
    modifiedTime: seoDateTime(updatedDate),
    relatedLinks: [
      {
        href: "/output/pdf/why-do-the-theist-sides-score-lower.pdf",
        label: "PDF report: Why Do the Theist Sides Score Lower?"
      },
      {
        href: "/output/pdf/where-is-the-theist-disadvantage-largest.pdf",
        label: "PDF report: Where Is the Theist Disadvantage Largest?"
      },
      {
        href: "/output/pdf/are-theist-arguments-more-often-slogan-like.pdf",
        label: "PDF report: Are Theist Arguments More Often Slogan-Like?"
      },
      {
        href: "/output/pdf/does-the-con-side-have-an-inherent-advantage.pdf",
        label: "PDF report: Does the CON Side Have an Inherent Advantage?"
      },
      {
        href: "/output/pdf/debates-are-usually-lost-without-a-named-fallacy.pdf",
        label: "PDF report: Beyond the Fallacy Count"
      },
      {
        href: "/output/pdf/are-all-slugfester-assessments-on-the-same-scale.pdf",
        label: "PDF report: Are All Slugfester Assessments on the Same Scale?"
      },
      {
        href: "/output/pdf/do-slugfester-rankings-measure-stable-performance.pdf",
        label: "PDF report: Do Slugfester Rankings Measure Stable Performance?"
      }
    ],
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "How Slugfester assesses and scores debates",
        name: "How Slugfester assesses and scores debates",
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
          "debate selection",
          "debate recommendations",
          "argument analysis",
          "theist and non-theist corpus analysis",
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
    "Send Slugfester feedback: report a scorecard issue, recommend an online debate, review eligibility criteria, and see the public corrections record.";
  const updatedDate = "2026-09-28";

  return {
    title: pageTitle("Feedback, corrections & debate suggestions"),
    heading: "Corrections & feedback",
    description,
    canonicalPath: correctionsPath(),
    lastmod: updatedDate,
    imagePath: DEFAULT_IMAGE,
    imageAlt: "Slugfester feedback, debate recommendations, and corrections.",
    type: "website",
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Slugfester feedback and corrections",
        description,
        url: absoluteUrl(correctionsPath()),
        dateModified: seoDateTime(updatedDate),
        isPartOf: {
          "@id": WEBSITE_ID
        }
      },
      breadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: "Feedback", path: correctionsPath() }
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
  const url = absoluteUrl(referencePath(type, slug));

  return {
    title: pageTitle(`${reference.label}: ${category.toLowerCase()} in debates`),
    heading: reference.label,
    description: compactText(`${reference.label}: ${reference.definition}`, 158),
    canonicalPath: referencePath(type, slug),
    lastmod: SITE_UPDATED_DATE,
    imagePath: DEFAULT_IMAGE,
    imageAlt: `${reference.label} ${category.toLowerCase()} reference on Slugfester.`,
    type: "article",
    articleSection: category,
    modifiedTime: SITE_UPDATED_DATETIME,
    relatedLinks: [
      { href: reference.externalUrl, label: `Read the in-depth ${sourceName} entry` }
    ],
    jsonLd: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name: reference.label,
        description: reference.definition,
        url, inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: { "@id": `${url}#definition` }
      },
      {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "@id": `${url}#definition`,
        name: reference.label,
        description: reference.definition,
        url: absoluteUrl(referencePath(type, slug)),
        mainEntityOfPage: { "@id": `${url}#webpage` },
        inDefinedTermSet: {
          "@type": "DefinedTermSet",
          name: sourceName,
          url: sourceSetUrl
        },
        sameAs: reference.externalUrl,
        disambiguatingDescription: category
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
    heading: "Page not found",
    description: "This Slugfester page could not be found.",
    canonicalPath: null,
    imagePath: DEFAULT_IMAGE,
    imageAlt: DEFAULT_IMAGE_ALT,
    type: "website",
    robots: "noindex,follow",
    jsonLd: null
  };
}
