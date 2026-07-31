import { debates } from "./data/debates.js";
import { avatarsForSpeakerText } from "./data/interlocutors.js";
import { getReferenceDefinition, referenceFromUrl } from "./data/references.js";
import {
  DEFAULT_IMAGE_ALT,
  DEFAULT_IMAGE_HEIGHT,
  DEFAULT_IMAGE_TYPE,
  DEFAULT_IMAGE_WIDTH,
  DEFAULT_ROBOTS,
  SITE_LOCALE,
  SITE_NAME,
  SITE_THEME_COLOR,
  absoluteUrl,
  backendPath,
  backendSeo,
  debateNumberLabel,
  debatePath,
  debateSeo,
  landingSeo,
  notFoundSeo,
  referencePath,
  referenceSeo,
  searchPath,
  searchSeo,
  topicsPath,
  topicsSeo
} from "./seo.js";

const app = document.querySelector("#app");
const DEBATE_PAGE_SIZE = 84;
const debateHashRoutePattern = /^#\/debate\/([a-z0-9-]+)$/;
const searchHashRoutePattern = /^#\/search$/;
const topicsHashRoutePattern = /^#\/topics$/;
const backendHashRoutePattern = /^#\/backend$/;
const assessmentHashRoutePattern = /^#\/assessment$/;
const referenceHashRoutePattern = /^#\/reference\/(fallacy|bias)\/([a-z0-9-]+)(?:\?debate=([a-z0-9-]+))?$/;
const debatePathRoutePattern = /^\/debate\/([a-z0-9-]+)\/?$/;
const searchPathRoutePattern = /^\/search\/?$/;
const topicsPathRoutePattern = /^\/topics\/?$/;
const backendPathRoutePattern = /^\/backend\/?$/;
const assessmentPathRoutePattern = /^\/assessment\/?$/;
const referencePathRoutePattern = /^\/reference\/(fallacy|bias)\/([a-z0-9-]+)\/?$/;

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const anchorSlug = (value = "") =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function timestampToSeconds(value = "") {
  const normalized = String(value).trim();
  if (!/^\d+:\d{2}(?::\d{2})?$/.test(normalized)) return null;

  const parts = normalized.split(":").map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function timestampStart(value = "") {
  return String(value).split(/[–—-]/)[0]?.trim() || "";
}

function timestampedYouTubeUrl(youtubeUrl, timestamp) {
  const seconds = timestampToSeconds(timestampStart(timestamp));
  if (seconds === null) return youtubeUrl;

  try {
    const url = new URL(youtubeUrl);
    url.searchParams.set("t", `${seconds}s`);
    return url.href;
  } catch {
    return youtubeUrl;
  }
}

const scoreTone = (score) => {
  if (score >= 80) return "strong";
  if (score >= 65) return "mixed";
  return "weak";
};

const average = (values) =>
  Math.round(values.reduce((total, value) => total + value, 0) / values.length);

const legacyAssessmentModel = "GPT 5.5 Extra High";
const currentAssessmentModel = "5.6 Terra Extra High";
const terraAssessmentFirstDebate = 131;

function assessmentModelFor(debate) {
  if (debate?.assessmentModel) return debate.assessmentModel;

  return Number.parseInt(debate?.number, 10) >= terraAssessmentFirstDebate
    ? currentAssessmentModel
    : legacyAssessmentModel;
}

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.append(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function setCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.append(element);
  }

  element.setAttribute("href", href);
}

function removeHeadElement(selector) {
  document.head.querySelector(selector)?.remove();
}

function setStructuredData(jsonLd) {
  const id = "seo-structured-data";
  let element = document.getElementById(id);

  if (!jsonLd) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    document.head.append(element);
  }

  element.textContent = JSON.stringify(jsonLd);
}

function setSeo(seo) {
  const canonicalUrl = absoluteUrl(seo.canonicalPath || "/");
  const imageUrl = absoluteUrl(seo.imagePath || "/assets/slugfester-logo.jpg");
  const imageAlt = seo.imageAlt || DEFAULT_IMAGE_ALT;
  const imageWidth = seo.imageWidth || DEFAULT_IMAGE_WIDTH;
  const imageHeight = seo.imageHeight || DEFAULT_IMAGE_HEIGHT;
  const imageType = seo.imageType || DEFAULT_IMAGE_TYPE;
  const robots = seo.robots || DEFAULT_ROBOTS;
  const isArticle = seo.type === "article";
  const updatedTime = seo.updatedTime || seo.modifiedTime || seo.lastmod;

  document.title = seo.title;
  setCanonical(canonicalUrl);
  setMeta('meta[name="description"]', { name: "description", content: seo.description });
  setMeta('meta[name="robots"]', { name: "robots", content: robots });
  setMeta('meta[name="author"]', { name: "author", content: SITE_NAME });
  setMeta('meta[name="application-name"]', { name: "application-name", content: SITE_NAME });
  setMeta('meta[name="apple-mobile-web-app-title"]', {
    name: "apple-mobile-web-app-title",
    content: SITE_NAME
  });
  setMeta('meta[name="theme-color"]', { name: "theme-color", content: SITE_THEME_COLOR });
  setMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
  setMeta('meta[property="og:locale"]', { property: "og:locale", content: SITE_LOCALE });
  setMeta('meta[property="og:title"]', { property: "og:title", content: seo.title });
  setMeta('meta[property="og:description"]', { property: "og:description", content: seo.description });
  setMeta('meta[property="og:type"]', { property: "og:type", content: seo.type || "website" });
  setMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
  if (updatedTime) {
    setMeta('meta[property="og:updated_time"]', {
      property: "og:updated_time",
      content: updatedTime
    });
  } else {
    removeHeadElement('meta[property="og:updated_time"]');
  }
  setMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
  setMeta('meta[property="og:image:secure_url"]', {
    property: "og:image:secure_url",
    content: imageUrl
  });
  setMeta('meta[property="og:image:type"]', { property: "og:image:type", content: imageType });
  setMeta('meta[property="og:image:width"]', {
    property: "og:image:width",
    content: imageWidth
  });
  setMeta('meta[property="og:image:height"]', {
    property: "og:image:height",
    content: imageHeight
  });
  setMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: imageAlt });
  if (isArticle && seo.articleSection) {
    setMeta('meta[property="article:section"]', {
      property: "article:section",
      content: seo.articleSection
    });
  } else {
    removeHeadElement('meta[property="article:section"]');
  }
  if (isArticle && seo.publishedTime) {
    setMeta('meta[property="article:published_time"]', {
      property: "article:published_time",
      content: seo.publishedTime
    });
  } else {
    removeHeadElement('meta[property="article:published_time"]');
  }
  if (isArticle && seo.modifiedTime) {
    setMeta('meta[property="article:modified_time"]', {
      property: "article:modified_time",
      content: seo.modifiedTime
    });
  } else {
    removeHeadElement('meta[property="article:modified_time"]');
  }
  setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: seo.title });
  setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: seo.description });
  setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
  setMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt", content: imageAlt });
  setStructuredData(seo.jsonLd);
}

function renderDebateNumber(debate) {
  return `
    <span class="debate-number" aria-label="${escapeHtml(debateNumberLabel(debate))}">
      ${escapeHtml(debate.number)}
    </span>
  `;
}

function currentPrimaryNavKey() {
  const { hash, pathname } = window.location;
  if (hash.match(searchHashRoutePattern) || pathname.match(searchPathRoutePattern)) return "search";
  if (hash.match(topicsHashRoutePattern) || pathname.match(topicsPathRoutePattern)) return "topics";
  if (
    hash.match(backendHashRoutePattern) ||
    hash.match(assessmentHashRoutePattern) ||
    pathname.match(backendPathRoutePattern) ||
    pathname.match(assessmentPathRoutePattern)
  ) {
    return "backend";
  }
  if (hash.match(debateHashRoutePattern) || pathname === "/" || pathname.match(debatePathRoutePattern)) {
    return "debates";
  }
  return "";
}

function renderPrimaryNavLink(key, href, label, activeKey) {
  const active = key === activeKey;
  return `<a class="primary-nav-link${active ? " active" : ""}" href="${escapeHtml(href)}"${active ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
}

function renderShell(content) {
  const activeNavKey = currentPrimaryNavKey();

  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Slugfester home">
        <img class="brand-logo" src="/assets/debate-gloves.png" alt="" width="444" height="444">
        <span class="brand-name">Slugfester</span>
      </a>
      <nav aria-label="Primary">
        ${renderPrimaryNavLink("debates", "/", "Debates", activeNavKey)}
        ${renderPrimaryNavLink("search", searchPath(), "Search", activeNavKey)}
        ${renderPrimaryNavLink("topics", topicsPath(), "Topics", activeNavKey)}
        ${renderPrimaryNavLink("backend", backendPath(), "Backend", activeNavKey)}
        <span class="external-sites" aria-label="External Sites">
          <span class="external-sites-label">External Sites</span>
          <span class="external-sites-links">
            <span class="external-site-item">
              <a href="https://logfall.com/" target="_blank" rel="noreferrer" aria-describedby="logfall-menu-popover">LogFall</a>
              <span class="external-site-popover" id="logfall-menu-popover" role="tooltip">
                <strong>LogFall</strong>
                Logical fallacy reference used for Slugfester's fallacy labels and source links.
              </span>
            </span>
            <span class="external-site-item">
              <a href="https://cogbias.site/" target="_blank" rel="noreferrer" aria-describedby="cogbias-menu-popover">CogBias</a>
              <span class="external-site-popover" id="cogbias-menu-popover" role="tooltip">
                <strong>CogBias</strong>
                Cognitive bias reference used for Slugfester's bias labels and source links.
              </span>
            </span>
          </span>
        </span>
      </nav>
    </header>
    ${content}
  `;
}

function positivePage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function paginatedItems(items, pageSize, requestedPage) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(positivePage(requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return {
    end,
    items: items.slice(start, end),
    page,
    start,
    total,
    totalPages
  };
}

function renderPagination({ label, pager, itemLabel, hrefForPage }) {
  if (pager.totalPages <= 1) return "";

  const pageLinks = Array.from({ length: pager.totalPages }, (_, index) => {
    const page = index + 1;

    return page === pager.page
      ? `<span class="pagination-page active" aria-current="page">${page}</span>`
      : `<a class="pagination-page" href="${escapeHtml(hrefForPage(page))}">${page}</a>`;
  }).join("");

  const previous = pager.page > 1
    ? `<a class="pagination-control" href="${escapeHtml(hrefForPage(pager.page - 1))}">Previous</a>`
    : `<span class="pagination-control disabled" aria-disabled="true">Previous</span>`;
  const next = pager.page < pager.totalPages
    ? `<a class="pagination-control" href="${escapeHtml(hrefForPage(pager.page + 1))}">Next</a>`
    : `<span class="pagination-control disabled" aria-disabled="true">Next</span>`;

  return `
    <nav class="pagination" aria-label="${escapeHtml(label)} pagination">
      <span class="pagination-summary">Showing ${pager.start + 1}-${pager.end} of ${pager.total} ${escapeHtml(itemLabel)}</span>
      <span class="pagination-controls">
        ${previous}
        <span class="pagination-pages">${pageLinks}</span>
        ${next}
      </span>
    </nav>
  `;
}

function landingPaginationState() {
  const params = new URLSearchParams(window.location.search);

  return {
    page: positivePage(params.get("page") || params.get("debatePage") || params.get("topicPage"))
  };
}

function landingUrl(state = {}) {
  const params = new URLSearchParams();
  const page = positivePage(state.page);

  if (page > 1) params.set("page", page);

  const query = params.toString();
  return `/${query ? `?${query}` : ""}`;
}

function renderLanding() {
  setSeo(landingSeo(debates));

  const landingState = landingPaginationState();
  const landingPager = paginatedItems(debates, DEBATE_PAGE_SIZE, landingState.page);
  const debateCards = landingPager.items.map(renderDebateCard).join("");
  const topicList = landingPager.items
    .map((debate) => `${escapeHtml(debate.number)} ${escapeHtml(debate.label)}`)
    .join('<span aria-hidden="true"> | </span>');

  app.innerHTML = renderShell(`
    <main class="landing">
      <section class="landing-panel">
        <div class="intro-copy">
          <p class="eyebrow">Video debate transcript scorecards</p>
          <h1>Slugfester</h1>
          <p class="lede">Debate transcripts turned into side-by-side argument maps for ease of reader assessment.  Each claim and rebuttal receives AI scores, and every ◉ opens a deeper critique of the reasoning.</p>
          <div class="topic-divider" aria-hidden="true"></div>
          <div class="topic-list-wrap">
            <p class="topic-list" aria-label="Topics mentioned in currently listed debates">${topicList}</p>
            ${renderPagination({
              hrefForPage: (page) => landingUrl({ page }),
              itemLabel: "debates",
              label: "Landing topic list",
              pager: landingPager
            })}
          </div>
        </div>
        <figure class="logo-showcase">
          <img
            src="/assets/slugfester-logo.jpg"
            alt="Slugfester illustrated debate crest"
            width="603"
            height="900"
          >
        </figure>
      </section>

      <section class="debate-list" aria-labelledby="debates-heading">
        <div class="section-heading">
          <p class="eyebrow">Scorecards</p>
          <h2 id="debates-heading">Debates</h2>
        </div>
        ${renderPagination({
          hrefForPage: (page) => landingUrl({ page }),
          itemLabel: "debates",
          label: "Landing debate cards",
          pager: landingPager
        })}
        <div class="debate-grid">${debateCards}</div>
        ${renderPagination({
          hrefForPage: (page) => landingUrl({ page }),
          itemLabel: "debates",
          label: "Landing debate cards",
          pager: landingPager
        })}
      </section>
    </main>
  `);
}

function renderDebateCard(debate) {
  return `
    <article class="debate-card">
      <div class="card-topline">
        <span class="card-label">${renderDebateNumber(debate)}<span>${escapeHtml(debate.label)}</span></span>
        <span>${escapeHtml(debate.duration)}</span>
      </div>
      <h3><a class="debate-title-link" href="${escapeHtml(debatePath(debate))}">${escapeHtml(debate.title)}</a></h3>
      <p class="motion">${escapeHtml(debate.motion)}</p>
      <p>${escapeHtml(debate.summary)}</p>
      <div class="side-score-strip" aria-label="Overall scores">
        ${renderMiniScore(debate.sides.pro.name, debate.score.pro, "teal")}
        ${renderMiniScore(debate.sides.con.name, debate.score.con, "coral")}
      </div>
      <div class="card-actions">
        <a class="button primary" href="${escapeHtml(debatePath(debate))}">Open Debate Assessment</a>
        <a class="button secondary" href="${escapeHtml(debate.youtubeUrl)}" target="_blank" rel="noreferrer">YouTube Source</a>
      </div>
    </article>
  `;
}

function renderMiniScore(label, score, color) {
  return `
    <div class="mini-score ${color}">
      <span>${escapeHtml(label)}</span>
      <strong>${score}</strong>
      <i style="--score-width:${score}%"></i>
    </div>
  `;
}

function normalizeSearchValue(value = "") {
  return String(value)
    .replaceAll("’", "'")
    .toLowerCase()
    .trim();
}

const topicCategoryDefinitions = [
  {
    id: "cosmological-arguments",
    title: "Cosmological arguments and contingency",
    shortLabel: "Cosmological arguments",
    description:
      "Kalam, contingency, beginnings, finitude, fine-tuning, cosmic evidence, and arguments from the universe to God or necessary reality.",
    keywords: [
      "cosmology",
      "cosmological",
      "cosmic",
      "big bang",
      "fine-tuning",
      "kalam",
      "nothing",
      "nothingness",
      "temporal infinity",
      "beginning",
      "contingency",
      "necessary foundation",
      "argument from limits",
      "causal principle",
      "universe",
      "universe origins"
    ]
  },
  {
    id: "science-design",
    title: "Science and design",
    shortLabel: "Science & design",
    description:
      "Scientific explanation, biological design, origins of life, naturalism, physics-informed evidence, and the evidential reach of empirical methods.",
    keywords: [
      "science",
      "scientific",
      "scientism",
      "design",
      "dna",
      "origin of life",
      "evolution",
      "digital physics",
      "quantum",
      "physicalism",
      "naturalism"
    ]
  },
  {
    id: "scripture-jesus-resurrection",
    title: "Scripture, Jesus, and resurrection",
    shortLabel: "Scripture & resurrection",
    description:
      "Biblical reliability, Jesus traditions, resurrection arguments, miracles, Christianity's central historical claims, and scriptural morality.",
    keywords: [
      "jesus",
      "resurrection",
      "bible",
      "biblical",
      "scripture",
      "christology",
      "new testament",
      "gospel",
      "gospels",
      "contradictions",
      "ancient christianity",
      "christianity true",
      "miracles",
      "slavery"
    ]
  },
  {
    id: "meaning-purpose",
    title: "Meaning and purpose",
    shortLabel: "Meaning & purpose",
    description:
      "Religious meaning, purpose, human value, existential orientation, mythic frameworks, and whether secular or theistic views better ground significance.",
    keywords: [
      "meaning",
      "purpose",
      "value",
      "values",
      "logos",
      "archetypes",
      "memes",
      "hell",
      "self-exile"
    ]
  },
  {
    id: "morality-ethics",
    title: "Morality and ethics",
    shortLabel: "Morality & ethics",
    description:
      "Objective morality, moral realism, ethical feeling, moral responsibility, metaethics, and social or secular moral frameworks.",
    keywords: [
      "morality",
      "moral",
      "ethics",
      "ethical",
      "objective",
      "objectivist",
      "emotivism",
      "realism",
      "anti-realism",
      "responsibility",
      "authority"
    ]
  },
  {
    id: "evil-suffering-hiddenness",
    title: "Evil, suffering, and hiddenness",
    shortLabel: "Evil & suffering",
    description:
      "The problem of evil, animal suffering, divine hiddenness, moral narrative, and whether suffering undermines theistic claims.",
    keywords: ["evil", "suffering", "hiddenness", "animal suffering", "problem of evil"]
  },
  {
    id: "mind-consciousness-free-will",
    title: "Mind, consciousness, and free will",
    shortLabel: "Mind & freedom",
    description:
      "Consciousness, mind-brain relation, agent causation, free will, idealism, and whether mental reality points beyond materialism.",
    keywords: [
      "consciousness",
      "mind",
      "brain",
      "mind-brain",
      "free will",
      "freedom",
      "compatibilism",
      "libertarian",
      "agent causation",
      "agent",
      "idealism",
      "emergent mind",
      "physicalism"
    ]
  },
  {
    id: "logic-reason-presuppositions",
    title: "Logic, reason, and presuppositions",
    shortLabel: "Logic & reason",
    description:
      "Logic, rationality, evidence, skepticism, presuppositional arguments, burden of proof, and the conditions for intelligible inquiry.",
    keywords: [
      "logic",
      "presupposition",
      "presuppositions",
      "reason",
      "rational",
      "rationality",
      "transcendental",
      "evidence",
      "skepticism",
      "inquiry",
      "disagreement",
      "burden",
      "proof"
    ]
  },
  {
    id: "religion-society-public-reason",
    title: "Religion, society, and public reason",
    shortLabel: "Religion & society",
    description:
      "Religion in public life, secular humanism, civilization, social order, Islam, political authority, and the future of human communities.",
    keywords: [
      "religion",
      "public reason",
      "civilization",
      "faith",
      "secular",
      "humanism",
      "social",
      "society",
      "islam",
      "peace",
      "power",
      "iraq",
      "anti-theism",
      "human future"
    ]
  },
  {
    id: "god-theism-atheism",
    title: "God, theism, and atheism",
    shortLabel: "God & theism",
    description:
      "Direct cases for and against God, theism, atheism, divine reality, classical theism, and broad explanatory comparisons.",
    keywords: [
      "god",
      "theism",
      "atheism",
      "atheist",
      "christian theism",
      "classical theism",
      "divine",
      "ultimate reality",
      "belief in god",
      "does god exist"
    ]
  }
];

const fallbackTopicCategory = {
  id: "broader-debate-questions",
  title: "Broader debate questions",
  shortLabel: "General philosophy",
  description:
    "Debates whose strongest recurring theme does not cleanly fit the primary Slugfester topic clusters."
};

function topicMatchText(debate) {
  return normalizeSearchValue(debate.label);
}

function topicCategoriesForDebate(debate) {
  const source = topicMatchText(debate);
  return topicCategoryDefinitions.filter((category) =>
    category.keywords.some((keyword) => source.includes(keyword))
  );
}

function topicTagsForDebate(debate) {
  const matches = topicCategoriesForDebate(debate);
  const tags = matches.length
    ? matches.map((category) => category.shortLabel)
    : [fallbackTopicCategory.shortLabel];

  return [...new Set(tags)].slice(0, 4);
}

function topicGroupsForDebates() {
  const groups = new Map(
    [...topicCategoryDefinitions, fallbackTopicCategory].map((category) => [
      category.id,
      { ...category, debates: [] }
    ])
  );

  debates.forEach((debate) => {
    const primaryCategory = topicCategoriesForDebate(debate)[0] || fallbackTopicCategory;
    groups.get(primaryCategory.id).debates.push(debate);
  });

  return [...groups.values()].filter((group) => group.debates.length > 0);
}

function uniqueInterlocutorsForDebate(debate) {
  const avatars = [
    ...avatarsForSpeakerText(debate.sides.pro.speaker),
    ...avatarsForSpeakerText(debate.sides.con.speaker)
  ];
  return [...new Map(avatars.map((avatar) => [avatar.name, avatar])).values()];
}

function searchFacets() {
  const people = new Map();

  debates.forEach((debate) => {
    uniqueInterlocutorsForDebate(debate).forEach((avatar) => {
      const current = people.get(avatar.name) || { ...avatar, count: 0 };
      current.count += 1;
      people.set(avatar.name, current);
    });
  });

  return {
    people: [...people.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  };
}

function searchState() {
  const params = new URLSearchParams(window.location.search);
  return {
    page: positivePage(params.get("page")),
    query: params.get("q") || "",
    people: params.getAll("person")
  };
}

function searchUrl(state) {
  const params = new URLSearchParams();

  if (state.query.trim()) params.set("q", state.query.trim());
  state.people.forEach((person) => params.append("person", person));
  if (positivePage(state.page) > 1) params.set("page", positivePage(state.page));

  const query = params.toString();
  return `${searchPath()}${query ? `?${query}` : ""}`;
}

function debateSearchText(debate) {
  return [
    debate.number,
    debate.title,
    debate.label,
    debate.motion,
    debate.summary,
    debate.sides.pro.name,
    debate.sides.pro.speaker,
    debate.sides.con.name,
    debate.sides.con.speaker,
    ...debate.sections.map((section) => section.title)
  ].join(" ");
}

function debateMatchesSearch(debate, state) {
  const people = uniqueInterlocutorsForDebate(debate).map((avatar) => avatar.name);
  const selectedPeopleMatch = state.people.every((person) => people.includes(person));
  const query = normalizeSearchValue(state.query);
  const queryMatch = !query || normalizeSearchValue(debateSearchText(debate)).includes(query);

  return selectedPeopleMatch && queryMatch;
}

function searchMatchesLabel(state) {
  const query = state.query.trim();
  const terms = [...(query ? [`"${query}"`] : []), ...state.people];
  return terms.length ? terms.join(" | ") : "all debates";
}

function toggleValue(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function navigateSearch(state) {
  const next = searchUrl(state);
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.pushState({}, "", next);
  }
  route();
}

function renderTopics() {
  setSeo(topicsSeo(debates));

  const groups = topicGroupsForDebates();
  const topicCards = groups
    .map(
      (group) => `
        <a class="topic-jump" href="#topic-${escapeHtml(group.id)}">
          <span>${escapeHtml(group.title)}</span>
          <strong>${group.debates.length}</strong>
        </a>
      `
    )
    .join("");

  app.innerHTML = renderShell(`
    <main class="topics-page">
      <section class="topics-hero">
        <div>
          <p class="eyebrow">Topic index</p>
          <h1>Debates by topic</h1>
          <p class="topics-lede">Recurring Slugfester themes gathered into compact clusters, with abbreviated debate cards for fast browsing.</p>
        </div>
        <aside class="topics-summary" aria-label="Topic catalog summary">
          <span>Topic clusters</span>
          <strong>${groups.length}</strong>
          <span>Debate scorecards</span>
          <strong>${debates.length}</strong>
        </aside>
      </section>

      <nav class="topic-jump-list" aria-label="Topic categories">
        ${topicCards}
      </nav>

      <section class="topic-category-list" aria-label="Debates grouped by topic">
        ${groups.map(renderTopicGroup).join("")}
      </section>
    </main>
  `);
}

function renderTopicGroup(group) {
  return `
    <section class="topic-category" id="topic-${escapeHtml(group.id)}">
      <div class="topic-category-heading">
        <div>
          <p class="eyebrow">${group.debates.length} debates</p>
          <h2>${escapeHtml(group.title)}</h2>
        </div>
        <p>${escapeHtml(group.description)}</p>
      </div>
      <div class="topic-card-grid">
        ${group.debates.map(renderTopicDebateCard).join("")}
      </div>
    </section>
  `;
}

function renderTopicDebateCard(debate) {
  const people = uniqueInterlocutorsForDebate(debate);
  const tags = topicTagsForDebate(debate);
  const speakers = [debate.sides.pro.speaker, debate.sides.con.speaker].join(" | ");

  return `
    <article class="topic-debate-card">
      <a class="topic-card-title" href="${escapeHtml(debatePath(debate))}" aria-label="Open ${escapeHtml(debateNumberLabel(debate))}: ${escapeHtml(debate.label)}">
        ${renderDebateNumber(debate)}
        <span>${escapeHtml(debate.label)}</span>
      </a>
      <div class="topic-chip-row" aria-label="Topics">
        ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="topic-card-bottom">
        <span class="topic-card-people" aria-label="Interlocutor photos">
          ${people
            .map(
              (person) => `
                <img
                  src="${escapeHtml(person.src)}"
                  alt=""
                  width="512"
                  height="512"
                  loading="lazy"
                  decoding="async"
                >
              `
            )
            .join("")}
        </span>
        <span class="topic-card-duration">${escapeHtml(debate.duration)}</span>
      </div>
      <div class="topic-card-reveal" aria-label="Debate summary and speakers">
        <div>
          <span>Summary</span>
          <p>${escapeHtml(debate.summary)}</p>
        </div>
        <div>
          <span>Speakers</span>
          <p>${escapeHtml(speakers)}</p>
        </div>
      </div>
    </article>
  `;
}

function renderSearch() {
  setSeo(searchSeo(debates));

  const state = searchState();
  const facets = searchFacets();
  const matches = debates.filter((debate) => debateMatchesSearch(debate, state));
  const resultPager = paginatedItems(matches, DEBATE_PAGE_SIZE, state.page);
  const hasFilters = Boolean(state.query.trim() || state.people.length);

  app.innerHTML = renderShell(`
    <main class="search-page">
      <section class="search-hero">
        <div>
          <p class="eyebrow">Search scorecards</p>
          <h1>Find debates</h1>
        </div>
        <p class="search-count">${matches.length} of ${debates.length} debates</p>
      </section>

      <section class="search-tool" aria-label="Search filters">
        <form class="search-form" role="search">
          <label for="search-query">Text</label>
          <div class="search-input-row">
            <input id="search-query" name="q" type="search" value="${escapeHtml(state.query)}" placeholder="speaker, claim, title">
            <button class="button primary" type="submit">Apply</button>
            ${hasFilters ? `<button class="button secondary" type="button" data-clear-search>Clear</button>` : ""}
          </div>
        </form>

        <details class="filter-section filter-accordion" ${state.people.length ? "open" : ""}>
          <summary class="filter-heading">
            <span class="filter-heading-copy">
              <strong>Interlocutor filters</strong>
              <small>Open this section to include one or more debate participants in the search.</small>
            </span>
            <span class="filter-count">${state.people.length ? `${state.people.length} selected` : "Any"}</span>
          </summary>
          <div class="interlocutor-filter-list">
            ${facets.people.map((person) => renderPersonFilter(person, state.people.includes(person.name))).join("")}
          </div>
        </details>
      </section>

      <section class="search-results" aria-labelledby="search-results-heading">
        <div class="section-heading">
          <p class="eyebrow search-match-label">Matches: ${escapeHtml(searchMatchesLabel(state))}</p>
          <h2 id="search-results-heading">Debates</h2>
        </div>
        ${
          matches.length
            ? `
              ${renderPagination({
                hrefForPage: (page) => searchUrl({ ...state, page }),
                itemLabel: "debates",
                label: "Search results",
                pager: resultPager
              })}
              <div class="search-result-list">${resultPager.items.map(renderSearchResult).join("")}</div>
              ${renderPagination({
                hrefForPage: (page) => searchUrl({ ...state, page }),
                itemLabel: "debates",
                label: "Search results",
                pager: resultPager
              })}
            `
            : `<div class="empty-results"><strong>No debates matched.</strong><span>Try fewer people or a broader text search.</span></div>`
        }
      </section>
    </main>
  `);

  bindSearchControls(state);
}

function renderPersonFilter(person, selected) {
  return `
    <button class="person-filter ${selected ? "active" : ""}" type="button" data-filter-type="person" data-filter-value="${escapeHtml(person.name)}" aria-pressed="${selected}">
      <img src="${escapeHtml(person.src)}" alt="${escapeHtml(person.name)}" width="512" height="512" loading="lazy" decoding="async">
      <span>${escapeHtml(person.name)}</span>
      <strong>${person.count}</strong>
    </button>
  `;
}

function renderSearchResult(debate) {
  const people = uniqueInterlocutorsForDebate(debate);

  return `
    <article class="search-result">
      <div class="card-topline">
        <span class="card-label">${renderDebateNumber(debate)}<span>${escapeHtml(debate.label)}</span></span>
        <span>${escapeHtml(debate.duration)}</span>
      </div>
      <div class="search-result-main">
        <div>
          <h3><a class="debate-title-link search-result-title-link" href="${escapeHtml(debatePath(debate))}">${escapeHtml(debate.title)}</a></h3>
          <p class="motion">${escapeHtml(debate.motion)}</p>
          <p>${escapeHtml(debate.summary)}</p>
        </div>
        <div class="result-people" aria-label="Interlocutors">
          ${people.map(renderResultPerson).join("")}
        </div>
      </div>
      <div class="side-score-strip" aria-label="Overall scores">
        ${renderMiniScore(debate.sides.pro.name, debate.score.pro, "teal")}
        ${renderMiniScore(debate.sides.con.name, debate.score.con, "coral")}
      </div>
      <div class="card-actions">
        <a class="button primary" href="${escapeHtml(debatePath(debate))}">Open Debate Assessment</a>
        <a class="button secondary" href="${escapeHtml(debate.youtubeUrl)}" target="_blank" rel="noreferrer">YouTube Source</a>
      </div>
    </article>
  `;
}

function renderResultPerson(person) {
  return `
    <span class="result-person">
      <img src="${escapeHtml(person.src)}" alt="" width="512" height="512" loading="lazy" decoding="async">
      <span>${escapeHtml(person.name)}</span>
    </span>
  `;
}

function renderBackend() {
  setSeo(backendSeo());

  app.innerHTML = renderShell(`
    <main class="assessment-page">
      <section class="assessment-hero">
        <div>
          <p class="eyebrow">Backend</p>
          <h1>Backend</h1>
          <p class="assessment-lede">This is the machinery behind Slugfester: transcripts are cleaned, quotes are anchored, arguments are paired by issue, and each move is scored against ordinary standards of logical coherence, evidential support, responsiveness, and fallacy avoidance.</p>
        </div>
        <aside class="assessment-stamp" aria-label="Backend model">
          <span>Current default model</span>
          <strong>${escapeHtml(currentAssessmentModel)}</strong>
          <p>Debates 01-130 were assessed with ${escapeHtml(legacyAssessmentModel)}. Beginning with Debate 131, new assessments use ${escapeHtml(currentAssessmentModel)}. A score describes the reasoning in the transcript, not whether a worldview is finally true.</p>
        </aside>
      </section>

      <section class="assessment-principles" aria-labelledby="assessment-principles-heading">
        <div class="section-heading">
          <p class="eyebrow">Inputs</p>
          <h2 id="assessment-principles-heading">What the backend reads</h2>
        </div>
        <div class="principle-grid">
          ${renderAssessmentPrinciple("Transcript ground", "The transcript is the evidential floor. The backend may condense wording for readability, but quoted material must remain traceable to what was actually said.")}
          ${renderAssessmentPrinciple("Debate frame", "The motion, central question, speakers, roles, time ranges, and source notes are captured so every local score is judged against the live dispute.")}
          ${renderAssessmentPrinciple("Argument units", "Claims and rebuttals are grouped by issue rather than by every interruption, allowing readers to compare like with like across the two columns.")}
          ${renderAssessmentPrinciple("Reference layer", "Fallacy and bias labels are added only when they explain a specific weakness, then routed through local context pages before external references.")}
        </div>
      </section>

      <section class="assessment-flow" aria-labelledby="assessment-flow-heading">
        <div class="section-heading">
          <p class="eyebrow">Pipeline</p>
          <h2 id="assessment-flow-heading">How a debate becomes a scorecard</h2>
        </div>
        <ol class="process-steps">
          <li><span>01</span><strong>Ingest the source.</strong><p>YouTube captions or supplied transcripts are cleaned lightly, timestamped, and marked with source notes so readers know what material was assessed.</p></li>
          <li><span>02</span><strong>Map the debate.</strong><p>The backend identifies the motion, recurring topics, speaker roles, side labels, and representative quotes that best encapsulate each position.</p></li>
          <li><span>03</span><strong>Pair the exchanges.</strong><p>Sections are organized around argumentative movement: one side's claim, the other side's answer, and the issue that connects them.</p></li>
          <li><span>04</span><strong>Score the reasoning.</strong><p>Each move is scored for relevance, warrant strength, evidence, internal consistency, burden discipline, and responsiveness to objections.</p></li>
          <li><span>05</span><strong>Attach critiques.</strong><p>The ◉ popovers give the fuller diagnosis: what was strong, what was missing, and how any fallacy or bias affected the score.</p></li>
          <li><span>06</span><strong>Publish indexes.</strong><p>The same data powers clean debate pages, timestamped YouTube links, search filters, topic cards, and fallacy or bias reference pages.</p></li>
        </ol>
      </section>

      <section class="assessment-rubric" aria-labelledby="assessment-rubric-heading">
        <div class="section-heading">
          <p class="eyebrow">Rubric</p>
          <h2 id="assessment-rubric-heading">How the numbers read</h2>
        </div>
        <div class="score-band-list">
          ${renderScoreBand("90-100", "Exceptional", "A clear, relevant, well-supported move that anticipates the strongest obvious replies and survives them.", 96)}
          ${renderScoreBand("80-89", "Strong", "A persuasive argument or rebuttal with minor gaps, compressed support, or uncertainty that does not defeat the main point.", 86)}
          ${renderScoreBand("70-79", "Solid", "A coherent and relevant move that helps the side's case but needs more evidence, precision, or follow-through.", 76)}
          ${renderScoreBand("60-69", "Mixed", "A partially useful move that depends on thin warrants, speculative links, or an incomplete answer to the objection.", 66)}
          ${renderScoreBand("50-59", "Weak", "A move with serious missing evidence, misframing, evasiveness, or poor contact with the opponent's actual claim.", 56)}
          ${renderScoreBand("<50", "Defective", "A move that is irrelevant, circular, self-undermining, or fallacious at the point where the argument needs support.", 42)}
        </div>
      </section>

      <section class="assessment-examples" aria-labelledby="assessment-examples-heading">
        <div class="section-heading">
          <p class="eyebrow">Examples</p>
          <h2 id="assessment-examples-heading">What the backend notices</h2>
        </div>
        <div class="example-grid">
          ${renderAssessmentExample(
            "Quote anchoring",
            "Example move: a speaker says a premise is 'obvious' while the transcript shows no supporting argument nearby.",
            "The score drops because assertion is not the same as warrant. The backend privileges quotes that expose the actual inferential step, so readers can see whether the speaker gave evidence or merely named a conclusion."
          )}
          ${renderAssessmentExample(
            "Rebuttal contact",
            "Example move: an opponent answers a cosmological argument by disputing whether observed causation can be projected beyond physical contexts.",
            "That scores better than dismissing the case as 'just faith' because it identifies the live warrant. The backend rewards replies that touch the actual hinge of the argument."
          )}
          ${renderAssessmentExample(
            "Fallacy pressure",
            "Example move: a conclusion is smuggled into a premise and then presented as independently established.",
            "A begging-the-question tag appears only when the circularity does real work. The backend does not use fallacy labels as decorative insults; the label must explain why the reasoning weakens."
          )}
          ${renderAssessmentExample(
            "Bias pressure",
            "Example move: a speaker highlights favorable cases while ignoring nearby counterexamples that would complicate the same standard.",
            "A confirmation-bias note appears when selective attention changes the evidence assessment. Having a worldview is not itself the problem; filtering the data through it can be."
          )}
        </div>
      </section>

      <section class="assessment-detail" aria-labelledby="assessment-detail-heading">
        <div>
          <p class="eyebrow">Limits</p>
          <h2 id="assessment-detail-heading">What the backend does not claim</h2>
        </div>
        <div class="assessment-detail-copy">
          <p>The backend does not decide which religion, philosophy, or political position is true. It scores the performance of the argument in the transcript: definitions, evidence, warrants, rebuttals, and logical discipline.</p>
          <p>A true claim can be defended badly, and a false claim can be argued with unusual care. Scores therefore track argumentative execution, not moral worth, charisma, crowd reaction, or agreement with the conclusion.</p>
          <p>Named fallacies and biases are routed through Slugfester reference pages first. Those pages give the basic definition, explain the debate-specific occurrence, link back to the source debate, and then point to LogFall or CogBias for deeper external treatment.</p>
        </div>
      </section>
    </main>
  `);
}

function renderAssessmentPrinciple(title, text) {
  return `
    <article class="principle-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
}

function renderScoreBand(range, label, text, width) {
  return `
    <article class="score-band" style="--band-width:${width}%">
      <div>
        <strong>${escapeHtml(range)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
      <p>${escapeHtml(text)}</p>
      <i aria-hidden="true"></i>
    </article>
  `;
}

function renderAssessmentExample(title, move, assessment) {
  return `
    <article class="assessment-example">
      <h3>${escapeHtml(title)}</h3>
      <p class="example-move">${escapeHtml(move)}</p>
      <p>${escapeHtml(assessment)}</p>
    </article>
  `;
}

function bindSearchControls(state) {
  const page = app.querySelector(".search-page");
  if (!page) return;

  page.querySelector(".search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = page.querySelector("#search-query")?.value || "";
    navigateSearch({ ...state, page: 1, query });
  });

  page.querySelector("[data-clear-search]")?.addEventListener("click", () => {
    navigateSearch({ page: 1, query: "", people: [] });
  });

  page.querySelectorAll("[data-filter-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.filterType;
      const value = button.dataset.filterValue;
      const query = page.querySelector("#search-query")?.value || state.query;

      if (type === "person") {
        navigateSearch({ ...state, page: 1, query, people: toggleValue(state.people, value) });
      }
    });
  });
}

function renderDebate(id) {
  const debate = debates.find((item) => item.id === id);

  if (!debate) {
    setSeo(notFoundSeo());
    app.innerHTML = renderShell(`
      <main class="not-found">
        <p class="eyebrow">No scorecard</p>
        <h1>Debate not found</h1>
        <a class="button primary" href="/">Back to debates</a>
      </main>
    `);
    return;
  }

  setSeo(debateSeo(debate));

  const sectionScores = debate.sections.flatMap((section) => [
    section.score.pro,
    section.score.con
  ]);

  app.innerHTML = renderShell(`
    <main class="debate-page">
      <section class="debate-hero">
        <div>
          <a class="back-link" href="/">Back to debates</a>
          <p class="eyebrow">${escapeHtml(debateNumberLabel(debate))} · ${escapeHtml(debate.label)} · Last rendered: ${escapeHtml(debate.date)}</p>
          <h1>${escapeHtml(debate.title)}</h1>
          <p class="motion large">${escapeHtml(debate.motion)}</p>
          ${debate.sourceNote ? `<p class="source-note">${escapeHtml(debate.sourceNote)}</p>` : ""}
        </div>
        <figure class="debate-gloves-panel" aria-hidden="true">
          <img src="/assets/debate-gloves.png" alt="" width="444" height="444">
        </figure>
        <aside class="scoreboard" aria-label="Debate score summary">
          <div>
            <span>Average section score</span>
            <strong>${average(sectionScores)}</strong>
          </div>
          ${renderMiniScore(debate.sides.pro.name, debate.score.pro, "teal")}
          ${renderMiniScore(debate.sides.con.name, debate.score.con, "coral")}
          <a class="button secondary" href="${escapeHtml(debate.youtubeUrl)}" target="_blank" rel="noreferrer">Open YouTube source</a>
        </aside>
      </section>

      ${renderQuoteCards(debate)}
      ${renderScoringNote(debate)}
      ${renderInteractionGuide()}

      <section class="columns-head" aria-label="Debate sides">
        ${renderSideHeading(debate.sides.pro, "teal")}
        ${renderSideHeading(debate.sides.con, "coral")}
      </section>

      ${debate.sections.map((section) => renderSection(section, debate)).join("")}
      ${renderOverall(debate)}
    </main>
  `);
}

function renderSideHeading(side, tone) {
  return `
    <div class="side-heading ${tone}">
      <span class="side-name">${escapeHtml(side.name)}</span>
      <div class="side-speaker-lockup">
        ${renderSpeakerAvatars(side.speaker)}
        <strong>${escapeHtml(side.speaker)}</strong>
      </div>
    </div>
  `;
}

function renderSpeakerAvatars(speakerText) {
  const avatars = [
    ...new Map(
      avatarsForSpeakerText(speakerText).map((avatar) => [avatar.src, avatar])
    ).values()
  ];
  if (!avatars.length) return "";

  return `
    <span class="speaker-avatar-stack" aria-hidden="true">
      ${avatars
        .map(
          (avatar) => `
            <img
              class="speaker-avatar"
              src="${escapeHtml(avatar.src)}"
              alt=""
              width="512"
              height="512"
              loading="lazy"
              decoding="async"
            >
          `
        )
        .join("")}
    </span>
  `;
}

function renderInteractionGuide() {
  return `
    <section class="interaction-guide" aria-label="How to read critiques">
      <strong>◉ Deeper critiques</strong>
      <span>Mouse over the ◉ symbols, or focus them with the keyboard, to open a longer critique of each scored argument.</span>
    </section>
  `;
}

function renderScoringNote(debate) {
  if (!debate.scoringNote) return "";

  const model = assessmentModelFor(debate);

  return `
    <section class="scoring-note" aria-label="Scoring note">
      <strong>AI-generated scorecard</strong>
      <span>${escapeHtml(debate.scoringNote)}</span>
      <span class="assessment-model">Assessments made by ${escapeHtml(model)}.</span>
    </section>
  `;
}

function renderQuoteCards(debate) {
  if (!debate.quotes) return "";

  return `
    <section class="quote-panel" aria-label="Position quotes">
      <div class="quote-panel-head">
        <div>
          <p class="eyebrow">Representative transcript quotes</p>
          <h2>Positions in their words</h2>
        </div>
      </div>
      <div class="quote-grid">
        ${renderQuoteCard(debate.sides.pro, debate.quotes.pro, "teal")}
        ${renderQuoteCard(debate.sides.con, debate.quotes.con, "coral")}
      </div>
    </section>
  `;
}

function renderQuoteCard(side, quote, tone) {
  if (!quote) return "";

  return `
    <article class="quote-card ${tone}">
      <span class="quote-side">${escapeHtml(side.name)} · ${escapeHtml(side.speaker)}</span>
      <blockquote>"${escapeHtml(quote.text)}"</blockquote>
      <p>${escapeHtml(quote.context)}</p>
    </article>
  `;
}

function renderSection(section, debate) {
  return `
    <section class="debate-section">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">${renderTimestampLink(section.timebox, debate.youtubeUrl, `Open YouTube source at ${section.timebox}`)}</p>
          <h2>${escapeHtml(section.title)}</h2>
        </div>
        <div class="section-score-pair">
          ${renderSectionScore(debate.sides.pro.name, section.score.pro)}
          ${renderSectionScore(debate.sides.con.name, section.score.con)}
        </div>
      </div>
      <div class="exchange-grid">
        ${section.exchanges
          .map(
            (exchange) => `
              ${renderArgument(exchange.pro, "teal", debate, section, "pro")}
              ${renderArgument(exchange.con, "coral", debate, section, "con")}
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSectionScore(label, score) {
  return `
    <div class="section-score ${scoreTone(score)}">
      <span>${escapeHtml(label)}</span>
      <strong>${score}</strong>
    </div>
  `;
}

function renderArgument(argument, tone, debate, section, sideKey) {
  if (!argument) {
    return `<article class="argument empty" aria-hidden="true"></article>`;
  }

  return `
    <article class="argument ${tone}">
      <div class="argument-meta">
        <span>${renderTimestampLink(argument.time, debate.youtubeUrl, `Open YouTube source at ${argument.time}`)}</span>
        <span>${escapeHtml(argument.role)}</span>
        <strong class="${scoreTone(argument.score)}">${argument.score}</strong>
      </div>
      <p>${escapeHtml(argument.words)}</p>
      <div class="argument-footer">
        ${renderCritique(argument)}
        ${renderTags(argument.tags, debate, section, sideKey, argument)}
      </div>
    </article>
  `;
}

function renderTimestampLink(label, youtubeUrl, ariaLabel) {
  const href = timestampedYouTubeUrl(youtubeUrl, label);

  return `
    <a class="timestamp-link" href="${escapeHtml(href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(ariaLabel)}">
      ${escapeHtml(label)}
    </a>
  `;
}

function renderCritique(argument) {
  return `
    <span class="critique">
      <button type="button" aria-label="Critique for ${escapeHtml(argument.role)}">◉</button>
      <span class="critique-popover" role="tooltip">
        <strong>${argument.score}/100 · ${escapeHtml(argument.role)}</strong>
        <span>${escapeHtml(argument.critique)}</span>
      </span>
    </span>
  `;
}

function renderTags(tags = [], debate, section, sideKey, argument) {
  if (!tags.length) {
    return `<span class="tag clean">No named fallacy</span>`;
  }

  return tags
    .map((tag) => renderTag(tag, debate, section, sideKey, argument))
    .join("");
}

function renderTag(tag, debate, section, sideKey, argument) {
  const reference = referenceFromUrl(tag.url);
  const definition = reference ? getReferenceDefinition(reference.type, reference.slug) : null;
  const category = tag.type === "fallacy" ? "Logical fallacy" : "Cognitive bias";
  const occurrenceId = referenceOccurrenceId({ debate, section, sideKey, argument, tag });
  const localHref = referenceHref(tag.url, debate.id, occurrenceId);

  return `
    <span class="tag-wrap">
      <a class="tag ${escapeHtml(tag.type)}" href="${escapeHtml(localHref)}">
        ${escapeHtml(tag.label)}
      </a>
      <span class="tag-popover" role="tooltip">
        <strong>${escapeHtml(tag.label)}</strong>
        <em>${category}</em>
        ${definition ? `<span>${escapeHtml(definition.definition)}</span>` : ""}
        <span class="tag-context">${escapeHtml(tag.context)}</span>
        <span class="tag-popover-note">Click button for more info.</span>
      </span>
    </span>
  `;
}

function referenceHref(url, debateId = "", occurrenceId = "") {
  const reference = referenceFromUrl(url);
  if (!reference) return url;

  const hash = occurrenceId ? `#${encodeURIComponent(occurrenceId)}` : "";
  return `${referencePath(reference.type, reference.slug, debateId)}${hash}`;
}

function referenceOccurrenceId({ debate, section, sideKey, argument, tag }) {
  const reference = referenceFromUrl(tag.url);
  const side = debate.sides[sideKey];
  const parts = [
    "occurrence",
    reference?.type || tag.type,
    reference?.slug || tag.label,
    debate.id,
    side?.speaker || sideKey,
    section.title,
    argument.time,
    argument.role
  ];

  return parts.map(anchorSlug).filter(Boolean).join("-");
}

function renderOverall(debate) {
  return `
    <section class="overall" aria-labelledby="overall-heading">
      <div class="section-heading">
        <p class="eyebrow">Final read</p>
        <h2 id="overall-heading">Overall commentary</h2>
      </div>
      <div class="overall-grid">
        ${renderOverallSide(debate.sides.pro, debate.overall.pro, "teal", debate.id)}
        ${renderOverallSide(debate.sides.con, debate.overall.con, "coral", debate.id)}
      </div>
    </section>
  `;
}

function renderOverallSide(side, overall, tone, debateId) {
  return `
    <article class="overall-side ${tone}">
      <div class="overall-score">
        <span>${escapeHtml(side.name)} · ${escapeHtml(side.speaker)}</span>
        <strong>${overall.score}</strong>
      </div>
      <h3>Strengths</h3>
      <ul>
        ${overall.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
      <h3>Logical blunders</h3>
      <ul>
        ${overall.blunders.map((blunder) => renderBlunder(blunder, debateId)).join("")}
      </ul>
    </article>
  `;
}

function renderBlunder(blunder, debateId) {
  const links = blunder.links
    .map(
      (link) => {
        const href = referenceHref(link.url, debateId);
        const isInternal = href.startsWith("#/");
        const target = isInternal ? "" : ' target="_blank" rel="noreferrer"';
        return `<a href="${escapeHtml(href)}"${target}>${escapeHtml(link.label)}</a>`;
      }
    )
    .join(" ");

  return `<li>${escapeHtml(blunder.text)} <span class="inline-links">${links}</span></li>`;
}

function renderReference(type, slug, sourceDebateId = "") {
  const reference = getReferenceDefinition(type, slug);

  if (!reference) {
    setSeo(notFoundSeo());
    app.innerHTML = renderShell(`
      <main class="not-found">
        <p class="eyebrow">No reference</p>
        <h1>Reference not found</h1>
        <a class="button primary" href="/">Back to debates</a>
      </main>
    `);
    return;
  }

  setSeo(referenceSeo(type, slug, reference));

  const category = type === "fallacy" ? "Logical fallacy" : "Cognitive bias";
  const source = type === "fallacy" ? "LogFall" : "CogBias";
  const appearances = collectReferenceAppearances(type, slug);
  const sourceDebate = findSourceDebate(sourceDebateId, appearances);

  app.innerHTML = renderShell(`
    <main class="reference-page">
      <nav class="reference-nav" aria-label="Reference navigation">
        <a class="back-link" href="/">Back to debates</a>
        ${sourceDebate ? `<span aria-hidden="true">|</span><a class="back-link" href="${escapeHtml(debatePath(sourceDebate))}">Back to this debate</a>` : ""}
      </nav>
      <section class="reference-card ${escapeHtml(type)}">
        <p class="eyebrow">${category}</p>
        <h1>${escapeHtml(reference.label)}</h1>
        <p>${escapeHtml(reference.definition)}</p>
        <div class="reference-actions">
          <a class="button primary" href="${escapeHtml(reference.externalUrl)}" target="_blank" rel="noreferrer">
            Read the in-depth ${source} entry
          </a>
        </div>
      </section>
      ${
        appearances.length
          ? `
            <section class="reference-contexts" aria-labelledby="reference-contexts-heading">
              <div class="section-heading">
                <p class="eyebrow">Debate context</p>
                <h2 id="reference-contexts-heading">Why this label appears here</h2>
              </div>
              <div class="reference-context-list">
                ${appearances.map(renderReferenceAppearance).join("")}
              </div>
            </section>
          `
          : ""
      }
    </main>
  `);
}

function findSourceDebate(sourceDebateId, appearances) {
  const explicitDebate = debates.find((debate) => debate.id === sourceDebateId);
  if (explicitDebate) return explicitDebate;

  const uniqueDebates = [...new Map(appearances.map((appearance) => [appearance.debate.id, appearance.debate])).values()];
  return uniqueDebates.length === 1 ? uniqueDebates[0] : null;
}

function collectReferenceAppearances(type, slug) {
  const appearances = [];

  debates.forEach((debate) => {
    debate.sections.forEach((section) => {
      section.exchanges.forEach((exchange) => {
        ["pro", "con"].forEach((sideKey) => {
          const argument = exchange[sideKey];
          if (!argument) return;

          argument.tags.forEach((tag) => {
            const reference = referenceFromUrl(tag.url);
            if (reference?.type !== type || reference.slug !== slug) return;

            appearances.push({
              debate,
              section,
              sideKey,
              side: debate.sides[sideKey],
              argument,
              tag
            });
          });
        });
      });
    });
  });

  return appearances;
}

function renderReferenceAppearance(appearance) {
  const debateHref = debatePath(appearance.debate);
  const occurrenceId = referenceOccurrenceId(appearance);

  return `
    <article class="reference-context-card" id="${escapeHtml(occurrenceId)}">
      <div class="card-topline">
        <a class="reference-debate-link" href="${escapeHtml(debateHref)}">${escapeHtml(debateNumberLabel(appearance.debate))} · ${escapeHtml(appearance.debate.label)}</a>
        <span>${renderTimestampLink(appearance.argument.time, appearance.debate.youtubeUrl, `Open YouTube source at ${appearance.argument.time}`)}</span>
      </div>
      <h3>${escapeHtml(appearance.section.title)}</h3>
      <p class="reference-speaker">${escapeHtml(appearance.side.name)} · ${escapeHtml(appearance.side.speaker)} · ${escapeHtml(appearance.argument.role)}</p>
      <blockquote>${escapeHtml(appearance.argument.words)}</blockquote>
      <p>${escapeHtml(appearance.tag.context)}</p>
      <p class="reference-debate-return">
        <a href="${escapeHtml(debateHref)}">Open debate scorecard: ${escapeHtml(debateNumberLabel(appearance.debate))} · ${escapeHtml(appearance.debate.title)}</a>
      </p>
    </article>
  `;
}

function scrollToHashTarget(hash = window.location.hash) {
  if (!hash || hash.startsWith("#/")) return false;

  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    return false;
  }

  const target = document.getElementById(id);
  if (!target) return false;

  target.scrollIntoView({ block: "start" });
  return true;
}

function scrollToHashTargetAfterRender() {
  window.requestAnimationFrame(() => {
    scrollToHashTarget();
  });
}

function route() {
  const hash = window.location.hash;
  const debateMatch =
    hash.match(debateHashRoutePattern) || window.location.pathname.match(debatePathRoutePattern);
  const searchMatch =
    hash.match(searchHashRoutePattern) || window.location.pathname.match(searchPathRoutePattern);
  const topicsMatch =
    hash.match(topicsHashRoutePattern) || window.location.pathname.match(topicsPathRoutePattern);
  const backendMatch =
    hash.match(backendHashRoutePattern) ||
    window.location.pathname.match(backendPathRoutePattern) ||
    hash.match(assessmentHashRoutePattern) ||
    window.location.pathname.match(assessmentPathRoutePattern);
  const referenceMatch =
    hash.match(referenceHashRoutePattern) ||
    window.location.pathname.match(referencePathRoutePattern);

  if (debateMatch) {
    renderDebate(decodeURIComponent(debateMatch[1]));
  } else if (searchMatch) {
    renderSearch();
  } else if (topicsMatch) {
    renderTopics();
  } else if (backendMatch) {
    renderBackend();
  } else if (referenceMatch) {
    const sourceDebateId =
      referenceMatch[3] || new URLSearchParams(window.location.search).get("debate") || "";
    renderReference(referenceMatch[1], referenceMatch[2], sourceDebateId);
  } else if (window.location.pathname !== "/") {
    setSeo(notFoundSeo());
    app.innerHTML = renderShell(`
      <main class="not-found">
        <p class="eyebrow">No page</p>
        <h1>Page not found</h1>
        <a class="button primary" href="/">Back to debates</a>
      </main>
    `);
  } else {
    renderLanding();
  }

  scrollToHashTargetAfterRender();
}

function shouldHandleInternally(link) {
  if (link.target || link.hasAttribute("download")) return false;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (
    url.hash &&
    !url.pathname.match(debatePathRoutePattern) &&
    !url.pathname.match(searchPathRoutePattern) &&
    !url.pathname.match(topicsPathRoutePattern) &&
    !url.pathname.match(backendPathRoutePattern) &&
    !url.pathname.match(assessmentPathRoutePattern) &&
    !url.pathname.match(referencePathRoutePattern)
  ) {
    return false;
  }

  return (
    url.pathname === "/" ||
    debatePathRoutePattern.test(url.pathname) ||
    searchPathRoutePattern.test(url.pathname) ||
    topicsPathRoutePattern.test(url.pathname) ||
    backendPathRoutePattern.test(url.pathname) ||
    assessmentPathRoutePattern.test(url.pathname) ||
    referencePathRoutePattern.test(url.pathname)
  );
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link || !shouldHandleInternally(link)) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();

  const url = new URL(link.href, window.location.href);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.pushState({}, "", next);
  }
  route();
  window.scrollTo(0, 0);
});

window.addEventListener("hashchange", route);
window.addEventListener("popstate", route);
route();
