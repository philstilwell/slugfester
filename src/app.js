import { topicCategoryDefinitions } from "./data/topics.js?v=1be9d9ce36406053";
import { assessmentGuide, debateSectionAnchor, relatedDebates } from "./data/reader-guides.js?v=1be9d9ce36406053";
import { debateSummaries } from "./data/debate-summaries.js?v=1be9d9ce36406053";
import { avatarsForSpeakerText } from "./data/interlocutors.js?v=1be9d9ce36406053";
import { getReferenceDefinition, referenceFromUrl } from "./data/references.js?v=1be9d9ce36406053";
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
  insightsPath,
  insightsSeo,
  insightsMethodsSeo,
  correctionsPath,
  correctionsSeo,
  debateNumberLabel,
  debatePath,
  debateSeo,
  debateDisplayTitle,
  debateYear,
  interlocutorPath,
  interlocutorSeo,
  interlocutorSlug,
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
} from "./seo.js?v=1be9d9ce36406053";

const app = document.querySelector("#app");
let debates = debateSummaries;
let debateAnalyticsPromise;
let sectionScoreExtremesPromise;
let biographiesPromise;
let biographies;
let insightsPromise;
let insightsContent;
let insightsMethodsContent;
let insightsMethodsPromise;
let sectionScoreExtremes = { top: [], bottom: [] };
const debateDetailPromises = new Map();
const referenceAppearancePromises = new Map();
const referenceAppearanceCache = new Map();
let routeSequence = 0;
const LANDING_PAGE_SIZE = 18;
const SEARCH_PAGE_SIZE = 24;
const REFERENCE_CONTEXT_PAGE_SIZE = 16;
const MIN_RANKED_DEBATE_APPEARANCES = 3;
const rankingMinimumOptions = [3, 5, 10];
const PROFILE_SCORE_MINIMUM = 50;
const PROFILE_SCORE_MAXIMUM = 100;
const PROFILE_SCORE_BUCKET_SIZE = 5;
const rankingSortOptions = [
  { value: "average", label: "Highest average" },
  { value: "opponents", label: "Highest Opponents' Avg." },
  { value: "appearances", label: "Most appearances" },
  { value: "name", label: "Name" }
];
const debateHashRoutePattern = /^#\/debate\/([a-z0-9-]+)$/;
const searchHashRoutePattern = /^#\/search$/;
const topicsHashRoutePattern = /^#\/topics$/;
const rankingsHashRoutePattern = /^#\/rankings$/;
const interlocutorHashRoutePattern = /^#\/interlocutor\/([a-z0-9-]+)$/;
const backendHashRoutePattern = /^#\/backend$/;
const assessmentHashRoutePattern = /^#\/assessment$/;
const referenceHashRoutePattern = /^#\/reference\/(fallacy|bias)\/([a-z0-9-]+)(?:\?debate=([a-z0-9-]+))?$/;
const debatePathRoutePattern = /^\/debate\/([a-z0-9-]+)\/?$/;
const searchPathRoutePattern = /^\/search\/?$/;
const topicsPathRoutePattern = /^\/topics\/?$/;
const rankingsPathRoutePattern = /^\/rankings\/?$/;
const interlocutorPathRoutePattern = /^\/interlocutor\/([a-z0-9-]+)\/?$/;
const backendPathRoutePattern = /^\/backend\/?$/;
const insightsPathRoutePattern = /^\/insights(?:\/data-and-methods)?\/?$/;
const correctionsPathRoutePattern = /^\/corrections\/?$/;
const assessmentPathRoutePattern = /^\/assessment\/?$/;
const referencePathRoutePattern = /^\/reference\/(fallacy|bias)\/([a-z0-9-]+)\/?$/;

async function loadDebateAnalytics() {
  if (!debateAnalyticsPromise) {
    debateAnalyticsPromise = import("./data/debate-analytics.js?v=1be9d9ce36406053")
      .then(({ debateAnalytics }) => {
        debates = debateSummaries.map((debate) => ({
          ...debate,
          ...(debateAnalytics[debate.id] || {})
        }));
        return debates;
      })
      .catch((error) => {
        debateAnalyticsPromise = undefined;
        throw error;
      });
  }

  return debateAnalyticsPromise;
}

async function loadSectionScoreExtremes() {
  if (!sectionScoreExtremesPromise) {
    sectionScoreExtremesPromise = import("./data/section-score-extremes.js?v=1be9d9ce36406053")
      .then(({ sectionScoreExtremes: loadedSectionScoreExtremes }) => {
        sectionScoreExtremes = loadedSectionScoreExtremes || sectionScoreExtremes;
        return sectionScoreExtremes;
      })
      .catch((error) => {
        sectionScoreExtremesPromise = undefined;
        throw error;
      });
  }

  return sectionScoreExtremesPromise;
}

async function loadDebateDetail(id) {
  if (!debateDetailPromises.has(id)) {
    const promise = import(`./data/debate-details/${id}.js?v=1be9d9ce36406053`)
      .then(({ debate }) => debate)
      .catch((error) => {
        debateDetailPromises.delete(id);
        throw error;
      });
    debateDetailPromises.set(id, promise);
  }

  return debateDetailPromises.get(id);
}

async function loadReferenceAppearances(type, slug) {
  const key = `${type}/${slug}`;
  if (!referenceAppearancePromises.has(key)) {
    const promise = import(`./data/reference-appearances/${type}-${slug}.js?v=1be9d9ce36406053`)
      .then(({ referenceAppearances }) => {
        referenceAppearanceCache.set(key, referenceAppearances);
        return referenceAppearances;
      })
      .catch((error) => {
        referenceAppearancePromises.delete(key);
        throw error;
      });
    referenceAppearancePromises.set(key, promise);
  }

  return referenceAppearancePromises.get(key);
}

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
  const canonicalUrl = seo.canonicalPath === null ? "" : absoluteUrl(seo.canonicalPath || "/");
  const imageUrl = absoluteUrl(seo.imagePath || "/assets/slugfester-logo.jpg");
  const imageAlt = seo.imageAlt || DEFAULT_IMAGE_ALT;
  const imageWidth = seo.imageWidth || DEFAULT_IMAGE_WIDTH;
  const imageHeight = seo.imageHeight || DEFAULT_IMAGE_HEIGHT;
  const imageType = seo.imageType || DEFAULT_IMAGE_TYPE;
  const robots = seo.robots || DEFAULT_ROBOTS;
  const isArticle = seo.type === "article";
  const updatedTime = seo.updatedTime || seo.modifiedTime || seo.lastmod;

  document.title = seo.title;
  if (canonicalUrl) {
    setCanonical(canonicalUrl);
  } else {
    removeHeadElement('link[rel="canonical"]');
  }
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
  if (canonicalUrl) {
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
  } else {
    removeHeadElement('meta[property="og:url"]');
  }
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

function renderDebateYear(debate) {
  const year = debateYear(debate);
  if (!year) return "";

  return `<span class="debate-title-year" aria-label="Debate year ${escapeHtml(year)}">${escapeHtml(year)}</span>`;
}

function renderDebateTitle(debate) {
  return `${escapeHtml(debateDisplayTitle(debate))}${renderDebateYear(debate)}`;
}

function currentPrimaryNavKey() {
  const { hash, pathname } = window.location;
  if (hash.match(searchHashRoutePattern) || pathname.match(searchPathRoutePattern)) return "search";
  if (hash.match(topicsHashRoutePattern) || pathname.match(topicsPathRoutePattern)) return "topics";
  if (
    hash.match(rankingsHashRoutePattern) ||
    hash.match(interlocutorHashRoutePattern) ||
    pathname.match(rankingsPathRoutePattern) ||
    pathname.match(interlocutorPathRoutePattern)
  ) {
    return "rankings";
  }
  if (
    hash.match(backendHashRoutePattern) ||
    hash.match(assessmentHashRoutePattern) ||
    pathname.match(backendPathRoutePattern) ||
    pathname.match(correctionsPathRoutePattern) ||
    pathname.match(assessmentPathRoutePattern)
  ) {
    return "backend";
  }
  if (
    hash.match(debateHashRoutePattern) ||
    hash.match(referenceHashRoutePattern) ||
    pathname === "/" ||
    pathname.match(debatePathRoutePattern) ||
    pathname.match(referencePathRoutePattern)
  ) {
    return "debates";
  }
  return "";
}

function renderPrimaryNavLink(key, href, label, activeKey) {
  const active = key === activeKey;
  return `<a class="primary-nav-link${active ? " active" : ""}" href="${escapeHtml(href)}"${active ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
}

function renderShell(content) {
  const activeNavKey = insightsPathRoutePattern.test(window.location.pathname) ? "insights" : currentPrimaryNavKey();
  const mainContent = content.replace(
    "<main",
    '<main id="main-content" tabindex="-1"'
  );

  return `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <header class="site-header">
      <a class="brand" href="/" aria-label="Slugfester home">
        <img class="brand-logo" src="/assets/debate-gloves.png" alt="" width="444" height="444">
        <span class="brand-name">Slugfester</span>
      </a>
      <nav aria-label="Primary">
        ${renderPrimaryNavLink("debates", "/", "Debates", activeNavKey)}
        ${renderPrimaryNavLink("search", searchPath(), "Search", activeNavKey)}
        ${renderPrimaryNavLink("topics", topicsPath(), "Topics", activeNavKey)}
        ${renderPrimaryNavLink("rankings", rankingsPath(), "Rankings", activeNavKey)}
        ${renderPrimaryNavLink("insights", insightsPath(), "Insights", activeNavKey)}
        ${renderPrimaryNavLink("backend", backendPath(), "Backend", activeNavKey)}
        <span class="external-sites">
          <button class="external-sites-label" type="button" aria-expanded="false" aria-controls="external-sites-links">
            External <span class="external-sites-chevron" aria-hidden="true">▾</span>
          </button>
          <span class="external-sites-links" id="external-sites-links" hidden>
            <a href="https://logfall.com/" target="_blank" rel="noopener noreferrer" aria-labelledby="logfall-menu-name" aria-describedby="logfall-menu-description">
              <strong id="logfall-menu-name">LogFall <span aria-hidden="true">↗</span></strong>
              <span class="external-site-description" id="logfall-menu-description">Logical fallacies explained with examples and practice tools.</span>
            </a>
            <a href="https://cogbias.site/" target="_blank" rel="noopener noreferrer" aria-labelledby="cogbias-menu-name" aria-describedby="cogbias-menu-description">
              <strong id="cogbias-menu-name">CogBias <span aria-hidden="true">↗</span></strong>
              <span class="external-site-description" id="cogbias-menu-description">Cognitive biases explained, with tools for clearer judgment.</span>
            </a>
          </span>
        </span>
      </nav>
    </header>
    ${mainContent}
    <footer class="site-footer">
      <div>
        <a class="footer-brand" href="/">Slugfester</a>
        <p>Transcript-grounded argument scorecards. Scores evaluate the reasoning presented, not a person's worth or a worldview's final truth.</p>
      </div>
      <nav aria-label="Footer">
        <a href="${searchPath()}">Search</a>
        <a href="${topicsPath()}">Topics</a>
        <a href="${rankingsPath()}">Rankings</a>
        <a href="${insightsPath()}">Insights</a>
        <a href="${backendPath()}">Method</a>
        <a href="${correctionsPath()}">Corrections</a>
        <a href="/feed.xml">Updates feed</a>
        <a href="https://logfall.com/" target="_blank" rel="noopener noreferrer">LogFall</a>
        <a href="https://cogbias.site/" target="_blank" rel="noopener noreferrer">CogBias</a>
      </nav>
    </footer>
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

function renderPagination({ label, pager, itemLabel, hrefForPage, position }) {
  if (pager.totalPages <= 1) return "";

  const visiblePages = pager.totalPages <= 7
    ? Array.from({ length: pager.totalPages }, (_, index) => index + 1)
    : [...new Set([1, pager.page - 1, pager.page, pager.page + 1, pager.totalPages])]
        .filter((page) => page >= 1 && page <= pager.totalPages)
        .sort((a, b) => a - b);
  const pageLinks = visiblePages
    .map((page, index) => {
      const previousPage = visiblePages[index - 1];
      const gap = previousPage && page - previousPage > 1
        ? '<span class="pagination-ellipsis" aria-hidden="true">…</span>'
        : "";
      const link = page === pager.page
        ? `<span class="pagination-page active" aria-current="page">${page}</span>`
        : `<a class="pagination-page" href="${escapeHtml(hrefForPage(page))}" aria-label="Page ${page}">${page}</a>`;

      return `${gap}${link}`;
    })
    .join("");

  const previous = pager.page > 1
    ? `<a class="pagination-control" href="${escapeHtml(hrefForPage(pager.page - 1))}">Previous</a>`
    : `<span class="pagination-control disabled" aria-disabled="true">Previous</span>`;
  const next = pager.page < pager.totalPages
    ? `<a class="pagination-control" href="${escapeHtml(hrefForPage(pager.page + 1))}">Next</a>`
    : `<span class="pagination-control disabled" aria-disabled="true">Next</span>`;

  return `
    <nav class="pagination" aria-label="${escapeHtml(label)} ${escapeHtml(position)} pagination">
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
  const landingPager = paginatedItems(debates, LANDING_PAGE_SIZE, landingState.page);
  const debateCards = landingPager.items.map(renderDebateCard).join("");
  const recentDebates = [...debates]
    .sort((first, second) => Number(second.number) - Number(first.number))
    .slice(0, 4);
  const interlocutorCount = searchFacets().people.length;
  const topicCount = topicGroupsForDebates().length;

  app.innerHTML = renderShell(`
    <main class="landing">
      <section class="landing-panel">
        <div class="intro-copy">
          <p class="eyebrow">Video debate transcript scorecards</p>
          <h1>Slugfester!</h1>
          <p class="lede">Follow the reasoning, not the rhetoric. Slugfester turns debate transcripts into side-by-side maps of claims and rebuttals, with AI-generated scores, timestamped sources, and deeper critiques behind every ◉.</p>
          <div class="landing-actions">
            <a class="button primary" href="#debates-heading">Browse scorecards</a>
            <a class="button secondary" href="${searchPath()}">Search the archive</a>
          </div>
          <dl class="landing-stats" aria-label="Slugfester archive summary">
            <div><dt>Debates/<wbr>Scorecards</dt><dd>${debates.length}</dd></div>
            <div><dt>Interlocutors</dt><dd>${interlocutorCount}</dd></div>
            <div><dt>Topic clusters</dt><dd>${topicCount}</dd></div>
          </dl>
          <div class="landing-topic-link">
            <div class="landing-topic-browse">
              <span>Looking for a subject?</span>
              <a href="${topicsPath()}">Browse all debates by topic</a>
            </div>
            <p>New debate assessments are added nearly every month.</p>
            <p class="landing-reassessment-note">The next site-wide reassessment is tentatively scheduled for spring 2027.</p>
            <p><a href="${insightsPath()}">What are we learning? Explore the research insights.</a></p>
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

      ${renderRecentAssessments(recentDebates)}

      <section class="debate-list" aria-labelledby="debates-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Scorecards</p>
            <h2 id="debates-heading">Debates</h2>
          </div>
          <p class="section-summary">Browse all ${debates.length} transcript-grounded assessments.</p>
        </div>
        ${renderPagination({
          hrefForPage: (page) => landingUrl({ page }),
          itemLabel: "debates",
          label: "Landing debate cards",
          pager: landingPager,
          position: "above results"
        })}
        <div class="debate-grid">${debateCards}</div>
        ${renderPagination({
          hrefForPage: (page) => landingUrl({ page }),
          itemLabel: "debates",
          label: "Landing debate cards",
          pager: landingPager,
          position: "below results"
        })}
      </section>
    </main>
  `);
}

function formatDisplayDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value || "");

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function renderRecentAssessments(recentDebates) {
  return `
    <section class="recent-assessments" aria-labelledby="recent-assessments-heading">
      <div class="section-heading recent-assessments-heading">
        <div>
          <p class="eyebrow">New in the archive</p>
          <h2 id="recent-assessments-heading">Recently added assessments</h2>
        </div>
        <div class="recent-assessments-actions">
          <p>Start with the newest debate additions.</p>
        </div>
      </div>
      <div class="recent-assessment-grid">
        ${recentDebates.map(renderRecentAssessmentCard).join("")}
      </div>
    </section>
  `;
}

function renderRecentAssessmentCard(debate) {
  const people = uniqueInterlocutorsForDebate(debate);

  return `
    <article class="recent-assessment-card">
      <div class="recent-assessment-meta">
        ${renderDebateNumber(debate)}
        <span>Published or updated ${escapeHtml(formatDisplayDate(debate.date))}</span>
      </div>
      <h3><a href="${escapeHtml(debatePath(debate))}">${renderDebateTitle(debate)}</a></h3>
      <p>${escapeHtml(debate.label)}</p>
      <div class="recent-assessment-footer">
        <span class="recent-assessment-people" aria-label="Interlocutor profiles">
          ${people.map(renderCardInterlocutor).join("")}
        </span>
        <span class="recent-assessment-scores" aria-label="Overall side scores">
          <strong class="teal">${debate.score.pro}</strong>
          <i aria-hidden="true">/</i>
          <strong class="coral">${debate.score.con}</strong>
        </span>
      </div>
    </article>
  `;
}

function renderDebateCard(debate) {
  const people = uniqueInterlocutorsForDebate(debate);

  return `
    <article class="debate-card">
      <div class="card-topline">
        <span class="card-label">${renderDebateNumber(debate)}<span>${escapeHtml(debate.label)}</span></span>
        <span>${escapeHtml(debate.duration)}</span>
      </div>
      <h3><a class="debate-title-link" href="${escapeHtml(debatePath(debate))}">${renderDebateTitle(debate)}</a></h3>
      <p class="motion">${escapeHtml(debate.motion)}</p>
      <p>${escapeHtml(debate.summary)}</p>
      <div class="card-interlocutors" aria-label="Interlocutor profiles">
        ${people.map(renderCardInterlocutor).join("")}
      </div>
      <div class="side-score-strip" aria-label="Overall scores">
        ${renderMiniScore(debate.sides.pro.name, debate.score.pro, "teal")}
        ${renderMiniScore(debate.sides.con.name, debate.score.con, "coral")}
      </div>
      <div class="card-actions">
        <a class="button primary" href="${escapeHtml(debatePath(debate))}">Open Debate Assessment</a>
        <a class="button secondary" href="${escapeHtml(debate.youtubeUrl)}" target="_blank" rel="noopener noreferrer">YouTube Source</a>
      </div>
    </article>
  `;
}

function renderCardInterlocutor(person) {
  return `
    <a class="card-interlocutor" href="${escapeHtml(interlocutorPath(person))}" aria-label="Open ${escapeHtml(person.name)}'s interlocutor profile" title="${escapeHtml(person.name)}">
      <img src="${escapeHtml(person.src)}" alt="" width="512" height="512" loading="lazy" decoding="async">
    </a>
  `;
}

function renderMiniScore(label, score, color) {
  return `
    <div class="mini-score ${color}">
      <span>${escapeHtml(label)}</span>
      <strong>${score}</strong>
      <i style="--score-width:${score}%" aria-hidden="true"></i>
    </div>
  `;
}

function normalizeSearchValue(value = "") {
  return String(value)
    .replaceAll("’", "'")
    .toLowerCase()
    .trim();
}

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
  const matches = topicCategoryDefinitions.filter((category) =>
    category.keywords.some((keyword) => source.includes(keyword))
  );
  const primary = topicCategoryDefinitions.find((category) => category.id === debate.topicCategory);

  return primary ? [primary, ...matches.filter((category) => category.id !== primary.id)] : [];
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
    const primaryCategory = topicCategoryDefinitions.find(
      (category) => category.id === debate.topicCategory
    ) || fallbackTopicCategory;
    groups.get(primaryCategory.id).debates.push(debate);
  });

  return [...groups.values()].filter((group) => group.debates.length > 0);
}

function reasoningTagDistribution() {
  return topicGroupsForDebates().map((group) => {
    const totals = {
      debates: group.debates.length,
      scoredMoves: 0,
      fallacies: 0,
      biases: 0
    };

    group.debates.forEach((debate) => {
      ["pro", "con"].forEach((sideKey) => {
        const summary = debate.tagSummary?.[sideKey];
        if (!summary) return;
        totals.scoredMoves += summary.scoredMoves;
        totals.fallacies += summary.fallacies;
        totals.biases += summary.biases;
      });
    });

    return {
      ...group,
      ...totals,
      fallacyRate: totals.scoredMoves ? (totals.fallacies / totals.scoredMoves) * 100 : 0,
      biasRate: totals.scoredMoves ? (totals.biases / totals.scoredMoves) * 100 : 0
    };
  });
}

function reasoningTagTotals(topics) {
  return topics.reduce(
    (total, topic) => ({
      debates: total.debates + topic.debates,
      scoredMoves: total.scoredMoves + topic.scoredMoves,
      fallacies: total.fallacies + topic.fallacies,
      biases: total.biases + topic.biases
    }),
    { debates: 0, scoredMoves: 0, fallacies: 0, biases: 0 }
  );
}

function formatTagRate(rate) {
  return `${Number(rate).toFixed(1)} per 100`;
}

function renderReasoningTagReadout(topics) {
  const totals = reasoningTagTotals(topics);
  const fallacyRate = totals.scoredMoves ? (totals.fallacies / totals.scoredMoves) * 100 : 0;
  const biasRate = totals.scoredMoves ? (totals.biases / totals.scoredMoves) * 100 : 0;

  return `
    <div class="reasoning-readout-focus">
      <span>Corpus overview</span>
      <strong>All topic clusters</strong>
    </div>
    <dl class="reasoning-readout-stats">
      <div><dt>Scorecards</dt><dd>${totals.debates}</dd></div>
      <div><dt>Scored moves</dt><dd>${totals.scoredMoves}</dd></div>
      <div class="fallacy"><dt>Fallacy tags</dt><dd>${totals.fallacies} <small>${formatTagRate(fallacyRate)}</small></dd></div>
      <div class="bias"><dt>Bias tags</dt><dd>${totals.biases} <small>${formatTagRate(biasRate)}</small></dd></div>
    </dl>
  `;
}

function renderReasoningTopicRow(topic, maximumRate) {
  const fallacyWidth = maximumRate ? (topic.fallacyRate / maximumRate) * 100 : 0;
  const biasWidth = maximumRate ? (topic.biasRate / maximumRate) * 100 : 0;

  return `
    <li class="reasoning-topic-row">
      <div class="reasoning-topic-name">
        <strong>${escapeHtml(topic.title)}</strong>
        <span>${topic.debates} ${topic.debates === 1 ? "scorecard" : "scorecards"} · ${topic.scoredMoves} scored moves</span>
      </div>
      <div class="reasoning-rate-bars">
        <div class="reasoning-rate-bar">
          <span>Fallacies</span>
          <span class="reasoning-bar-track" aria-hidden="true"><i class="fallacy" style="--bar-width: ${fallacyWidth.toFixed(2)}%"></i></span>
          <strong>${formatTagRate(topic.fallacyRate)}</strong>
        </div>
        <div class="reasoning-rate-bar">
          <span>Biases</span>
          <span class="reasoning-bar-track" aria-hidden="true"><i class="bias" style="--bar-width: ${biasWidth.toFixed(2)}%"></i></span>
          <strong>${formatTagRate(topic.biasRate)}</strong>
        </div>
      </div>
    </li>
  `;
}

function renderReasoningDistribution(topics) {
  const maximumRate = Math.max(
    1,
    ...topics.flatMap((topic) => [topic.fallacyRate, topic.biasRate])
  );

  return `
    <section class="reasoning-distribution" aria-labelledby="reasoning-distribution-heading">
      <div class="reasoning-distribution-heading">
        <div>
          <p class="eyebrow">Named assessment tags</p>
          <h2 id="reasoning-distribution-heading">Reasoning flags by topic</h2>
          <p>Rates show cited fallacy and bias tags per 100 scored argument and rebuttal moves.</p>
        </div>
      </div>
      <div class="reasoning-distribution-readout">
        ${renderReasoningTagReadout(topics)}
      </div>
      <div class="reasoning-distribution-legend" aria-label="Reasoning tag legend">
        <span><i class="fallacy"></i> Logical fallacy tags</span>
        <span><i class="bias"></i> Cognitive bias tags</span>
        <small>Topic groups use each scorecard's primary Slugfester category.</small>
      </div>
      <ol class="reasoning-topic-chart">
        ${topics.map((topic) => renderReasoningTopicRow(topic, maximumRate)).join("")}
      </ol>
      <p class="reasoning-distribution-note">These are counts of named assessment tags, not independent findings that every cited fallacy or bias is established across the corpus.</p>
    </section>
  `;
}

function sectionScoreDistribution() {
  const scores = debates.flatMap((debate) => debate.sectionScores || []);

  if (!scores.length) {
    return { buckets: [], highest: 0, lowest: 0, maximumCount: 0, axisMaximum: 0, total: 0 };
  }

  const lowest = Math.min(...scores);
  const highest = Math.max(...scores);
  const firstBucket = Math.floor(lowest / 2) * 2;
  const lastBucket = Math.floor(highest / 2) * 2;
  const bucketCounts = new Map();

  scores.forEach((score) => {
    const bucket = Math.floor(score / 2) * 2;
    bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
  });

  const buckets = Array.from(
    { length: (lastBucket - firstBucket) / 2 + 1 },
    (_, index) => {
      const start = firstBucket + index * 2;
      return {
        start,
        end: Math.min(start + 1, 100),
        count: bucketCounts.get(start) || 0
      };
    }
  );

  const maximumCount = Math.max(...buckets.map((bucket) => bucket.count));
  const axisMaximum = Math.ceil((maximumCount * 1.1) / 20) * 20;

  return {
    buckets,
    highest,
    lowest,
    maximumCount,
    axisMaximum,
    total: scores.length
  };
}

function renderRubricExtremeExample(example, index, group) {
  const debate = {
    id: example.debateId,
    title: example.debateTitle,
    year: example.debateYear
  };
  const moveScore = Number.isFinite(example.representativeMoveScore)
    ? example.representativeMoveScore
    : null;
  const analysisHeading = moveScore === null
    ? "Why this move received its score"
    : `Why this move received ${moveScore}/100`;
  const strengthLabel = group === "top" ? "Score-raising features" : "Credit-worthy features";
  const limitationLabel = group === "top" ? "Remaining weaknesses" : "Score-lowering features";

  return `
    <li class="rubric-extreme-card rubric-extreme-card--${group}">
      <div class="rubric-extreme-card-heading">
        <span>${index + 1}</span>
        <strong class="${scoreTone(example.score)}">${example.score}</strong>
      </div>
      <h4>${escapeHtml(example.sectionTitle)}</h4>
      <p class="rubric-extreme-speaker">${escapeHtml(example.speaker)}’s side</p>
      <a href="${escapeHtml(debatePath(example.debateId))}">Debate ${escapeHtml(example.debateNumber)}: ${renderDebateTitle(debate)}</a>
      <div class="rubric-extreme-assessment">
        ${example.representativeMove ? `
          <p class="rubric-extreme-move">
            <span>Representative assessed move${moveScore === null ? "" : ` <b class="rubric-extreme-move-score">${moveScore}/100</b>`}</span>
            ${escapeHtml(example.representativeMove)}
          </p>
        ` : ""}
        ${example.scoreFeatures?.strength || example.scoreFeatures?.limitation ? `
          <div class="rubric-extreme-analysis">
            <strong>${analysisHeading}</strong>
            ${example.scoreFeatures.strength ? `<p><span>${strengthLabel}</span>${escapeHtml(example.scoreFeatures.strength)}</p>` : ""}
            ${example.scoreFeatures.limitation ? `<p><span>${limitationLabel}</span>${escapeHtml(example.scoreFeatures.limitation)}</p>` : ""}
          </div>
        ` : ""}
      </div>
    </li>
  `;
}

function renderRubricExtremesAccordion(extremes) {
  if (!extremes.top?.length || !extremes.bottom?.length) return "";

  return `
    <details class="rubric-extremes-accordion">
      <summary>
        <span>
          <span class="backend-objectivity-kicker">Standards in practice</span>
          <strong>Compare the top three and bottom three sections</strong>
          <small>Open six real examples from the current catalogue</small>
        </span>
        <i aria-hidden="true"></i>
      </summary>
      <div class="rubric-extremes-content">
        <p class="rubric-extremes-intro">These are section-side scores, not overall debate results. Each representative move is one part of its section; the section score combines all selected moves after weighting more important arguments more heavily. High scores reward clear, well-supported reasoning that meets the other side’s strongest point. Low scores reflect serious gaps in support, logic, relevance, responsiveness, precision, or fairness—not whether Slugfester agrees with the conclusion.</p>
        <div class="rubric-extremes-grid">
          <section class="rubric-extremes-column rubric-extremes-column--top" aria-labelledby="rubric-extremes-top-heading">
            <div>
              <p class="eyebrow">Highest section-side scores</p>
              <h3 id="rubric-extremes-top-heading">Top three</h3>
              <p>These sections combine strong evidence or warrant with direct engagement, disciplined scope, and fair treatment of alternatives.</p>
            </div>
            <ol>
              ${extremes.top.map((example, index) => renderRubricExtremeExample(example, index, "top")).join("")}
            </ol>
          </section>
          <section class="rubric-extremes-column rubric-extremes-column--bottom" aria-labelledby="rubric-extremes-bottom-heading">
            <div>
              <p class="eyebrow">Lowest section-side scores</p>
              <h3 id="rubric-extremes-bottom-heading">Bottom three</h3>
              <p>These sections retain some argumentative value but contain major unsupported steps, missed objections, overstatement, or weak evidential control.</p>
            </div>
            <ol>
              ${extremes.bottom.map((example, index) => renderRubricExtremeExample(example, index, "bottom")).join("")}
            </ol>
          </section>
        </div>
        <p class="rubric-extremes-note">Ties are resolved by catalogue order. These examples update when the site’s debate data is regenerated.</p>
      </div>
    </details>
  `;
}

function sectionScoreBarColor(index, bucketCount) {
  const position = bucketCount > 1 ? index / (bucketCount - 1) : 0.5;
  const goldPosition = 0.7;
  const beforeGold = position <= goldPosition;
  const segmentProgress = beforeGold
    ? position / goldPosition
    : (position - goldPosition) / (1 - goldPosition);
  const startWeight = ((1 - segmentProgress) * 100).toFixed(1);
  const endWeight = (segmentProgress * 100).toFixed(1);
  const startColor = beforeGold ? "--rubric-chart-red" : "--gold";
  const endColor = beforeGold ? "--gold" : "--teal";

  return `color-mix(in srgb, var(${startColor}) ${startWeight}%, var(${endColor}) ${endWeight}%)`;
}

function renderSectionScoreDistribution(distribution) {
  if (!distribution.total) return "";

  const middleCount = Math.round(distribution.axisMaximum / 2);
  const bars = distribution.buckets
    .map((bucket, index) => {
      const height = distribution.axisMaximum
        ? (bucket.count / distribution.axisMaximum) * 100
        : 0;
      const color = sectionScoreBarColor(index, distribution.buckets.length);
      const range = `${bucket.start}–${bucket.end}`;
      const countLabel = `${bucket.count.toLocaleString("en-US")} ${bucket.count === 1 ? "section-side score" : "section-side scores"}`;

      return `
        <li class="section-score-bucket${bucket.count ? " populated" : ""}" aria-label="${range} percent: ${countLabel}" title="${range}%: ${countLabel}">
          <span class="section-score-bar-column" style="--bar-height: ${height.toFixed(2)}%; --bar-color: ${color}" aria-hidden="true">
            <span>${bucket.count.toLocaleString("en-US")}</span>
            <i></i>
          </span>
          <strong aria-hidden="true">${range}</strong>
        </li>
      `;
    })
    .join("");

  return `
    <section class="section-score-distribution backend-rubric-evidence" aria-labelledby="section-score-distribution-heading">
      <div class="section-score-distribution-heading">
        <div>
          <p class="eyebrow">Rubric quality check</p>
          <h2 id="section-score-distribution-heading">How section scores are distributed</h2>
          <p>This chart shows how often each section-side score occurs across the published catalogue. The range shows that assessments use different score bands, but spread alone cannot establish that the rubric is accurate or consistent across reviewers and assessment periods. Open the examples below to examine the reasoning behind high and low marks; the measurement and ranking studies further down this page examine consistency and uncertainty.</p>
        </div>
        <dl class="section-score-distribution-summary">
          <div><dt>Section-side scores</dt><dd>${distribution.total.toLocaleString("en-US")}</dd></div>
          <div><dt>Observed range</dt><dd>${distribution.lowest}–${distribution.highest}</dd></div>
          <div><dt>Bucket width</dt><dd>2 points</dd></div>
        </dl>
      </div>
      <figure class="section-score-chart-figure">
        <div class="section-score-chart-frame">
          <div class="section-score-y-axis" aria-hidden="true">
            <span>${distribution.axisMaximum.toLocaleString("en-US")}</span>
            <span>${middleCount.toLocaleString("en-US")}</span>
            <span>0</span>
          </div>
          <div class="section-score-chart-scroll" tabindex="0" aria-label="Scrollable vertical bar chart of section-side score counts">
            <ol class="section-score-chart" style="--bucket-count: ${distribution.buckets.length}">
              ${bars}
            </ol>
          </div>
        </div>
        <figcaption>This chart includes the two side scores assigned within every published debate section—not overall debate scores or interlocutor averages. Vertical axis: number of scores. Horizontal axis: two-percentage-point score ranges. Bar colors progress through the site’s coral, gold, and teal palette as scores increase. Numbers above the bars are counts.</figcaption>
      </figure>
      ${renderRubricExtremesAccordion(sectionScoreExtremes)}
    </section>
  `;
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

function rankingState() {
  const params = new URLSearchParams(window.location.search);
  const topic = params.get("topic") || "all";
  const minimum = Number.parseInt(params.get("minimum"), 10);
  const sort = params.get("sort") || "average";
  const knownPeople = new Set(searchFacets().people.map((person) => person.name));
  const comparisonA = params.get("compare-a") || "";
  const comparisonB = params.get("compare-b") || "";

  return {
    topic:
      topic === "all" || topicCategoryDefinitions.some((category) => category.id === topic)
        ? topic
        : "all",
    minimum: rankingMinimumOptions.includes(minimum)
      ? minimum
      : MIN_RANKED_DEBATE_APPEARANCES,
    sort: rankingSortOptions.some((option) => option.value === sort) ? sort : "average",
    comparisonA: knownPeople.has(comparisonA) ? comparisonA : "",
    comparisonB: knownPeople.has(comparisonB) && comparisonB !== comparisonA ? comparisonB : ""
  };
}

function rankingUrl(state) {
  const params = new URLSearchParams();

  if (state.topic !== "all") params.set("topic", state.topic);
  if (state.minimum !== MIN_RANKED_DEBATE_APPEARANCES) {
    params.set("minimum", String(state.minimum));
  }
  if (state.sort !== "average") params.set("sort", state.sort);
  if (state.comparisonA) params.set("compare-a", state.comparisonA);
  if (state.comparisonB) params.set("compare-b", state.comparisonB);

  const query = params.toString();
  return `${rankingsPath()}${query ? `?${query}` : ""}`;
}

function isOneOnOneDebate(debate) {
  return ["pro", "con"].every(
    (sideKey) => avatarsForSpeakerText(debate.sides[sideKey].speaker).length === 1
  );
}

function rankingDebates(state) {
  return debates.filter((debate) => {
    if (debate.interlocutorRankingEligible === false) return false;
    if (!isOneOnOneDebate(debate)) return false;
    const matchesTopic =
      state.topic === "all" ||
      topicCategoriesForDebate(debate).some((category) => category.id === state.topic);

    return matchesTopic;
  });
}

function rankingTopicSummary(appearances) {
  const topics = new Map();

  appearances.forEach((appearance) => {
    appearance.categories.forEach((category) => {
      const topic = topics.get(category.id) || {
        ...category,
        appearances: 0,
        totalScore: 0
      };
      topic.appearances += 1;
      topic.totalScore += appearance.score;
      topics.set(category.id, topic);
    });
  });

  return [...topics.values()]
    .map((topic) => ({ ...topic, averageScore: topic.totalScore / topic.appearances }))
    .sort(
      (a, b) =>
        b.appearances - a.appearances ||
        b.averageScore - a.averageScore ||
        a.title.localeCompare(b.title)
    )[0];
}

function sampleConfidence(appearances) {
  if (appearances <= 3) {
    const scorecardLabel = appearances === 1 ? "One scorecard provides" : `${appearances} scorecards provide`;
    return {
      tone: "limited",
      label: "Limited sample",
      description: `${scorecardLabel} an early signal, not a settled ranking.`
    };
  }

  if (appearances <= 6) {
    return {
      tone: "developing",
      label: "Developing sample",
      description: "Several scorecards provide useful context, though more appearances can still move the average."
    };
  }

  return {
    tone: "established",
    label: "Established sample",
    description: "A broader scorecard sample makes the average more stable."
  };
}

function scoreMedian(scores) {
  const ordered = [...scores].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function profileScoreDistribution(records) {
  const scores = records.map((record) => record.score);
  const lowest = Math.min(...scores);
  const highest = Math.max(...scores);
  const spread = highest - lowest;
  const median = scoreMedian(scores);
  const consistency =
    scores.length < 2
      ? "One scorecard; too early to assess consistency"
      : spread <= 7
      ? "Tight score spread"
      : spread <= 15
        ? "Moderate score spread"
        : "Wide score spread";
  const bands = Array.from(
    {
      length:
        (PROFILE_SCORE_MAXIMUM - PROFILE_SCORE_MINIMUM) /
        PROFILE_SCORE_BUCKET_SIZE
    },
    (_, index) => {
      const minimum = PROFILE_SCORE_MINIMUM + index * PROFILE_SCORE_BUCKET_SIZE;
      const maximum =
        minimum + PROFILE_SCORE_BUCKET_SIZE === PROFILE_SCORE_MAXIMUM
          ? PROFILE_SCORE_MAXIMUM
          : minimum + PROFILE_SCORE_BUCKET_SIZE - 1;

      return {
        count: scores.filter(
          (score) =>
            score >= minimum &&
            (maximum === PROFILE_SCORE_MAXIMUM ? score <= maximum : score < minimum + PROFILE_SCORE_BUCKET_SIZE)
        ).length,
        label: `${minimum}–${maximum}`
      };
    }
  );

  return {
    median,
    lowest,
    highest,
    consistency,
    maximumBandCount: Math.max(1, ...bands.map((band) => band.count)),
    bands
  };
}

function profileTopicBreakdown(records) {
  const topics = new Map();

  records.forEach((record) => {
    record.categories.forEach((category) => {
      const topic = topics.get(category.id) || { ...category, appearances: 0, totalScore: 0 };
      topic.appearances += 1;
      topic.totalScore += record.score;
      topics.set(category.id, topic);
    });
  });

  return [...topics.values()]
    .map((topic) => ({ ...topic, averageScore: topic.totalScore / topic.appearances }))
    .sort((a, b) => b.appearances - a.appearances || b.averageScore - a.averageScore || a.title.localeCompare(b.title));
}

function profileOpponentBreakdown(records) {
  const opponents = new Map();

  records.forEach((record) => {
    record.opponents.forEach((opponent) => {
      const current = opponents.get(opponent.name) || {
        ...opponent,
        appearances: 0,
        totalOpponentScore: 0
      };
      current.appearances += 1;
      current.totalOpponentScore += record.opponentScore;
      opponents.set(opponent.name, current);
    });
  });

  return [...opponents.values()]
    .map((opponent) => ({
      ...opponent,
      averageOpponentScore: opponent.totalOpponentScore / opponent.appearances
    }))
    .sort((a, b) => b.appearances - a.appearances || b.averageOpponentScore - a.averageOpponentScore || a.name.localeCompare(b.name));
}

function rankingTagSummary(records) {
  const totals = {
    scoredMoves: 0,
    fallacies: 0,
    biases: 0
  };

  records.forEach(({ debate, sideKey }) => {
    const summary = debate.tagSummary?.[sideKey];
    if (!summary) return;
    totals.scoredMoves += summary.scoredMoves;
    totals.fallacies += summary.fallacies;
    totals.biases += summary.biases;
  });

  return {
    ...totals,
    fallacyRate: totals.scoredMoves ? (totals.fallacies / totals.scoredMoves) * 100 : 0,
    biasRate: totals.scoredMoves ? (totals.biases / totals.scoredMoves) * 100 : 0
  };
}

function rankedInterlocutors(state) {
  const people = new Map();

  rankingDebates(state).forEach((debate) => {
    ["pro", "con"].forEach((sideKey) => {
      const side = debate.sides[sideKey];
      const opponentSideKey = sideKey === "pro" ? "con" : "pro";
      const score = debate.score[sideKey];
      const opponentScore = debate.score[opponentSideKey];
      const categories = topicCategoriesForDebate(debate);
      const opponents = avatarsForSpeakerText(debate.sides[opponentSideKey].speaker);

      avatarsForSpeakerText(side.speaker).forEach((avatar) => {
        const person = people.get(avatar.name) || {
          ...avatar,
          appearances: 0,
          totalScore: 0,
          totalOpponentScore: 0,
          records: []
        };

        person.appearances += 1;
        person.totalScore += score;
        person.totalOpponentScore += opponentScore;
        person.records.push({
          categories,
          debate,
          opponentScore,
          score,
          sideKey,
          opponents
        });
        people.set(avatar.name, person);
      });
    });
  });

  return [...people.values()]
    .filter((person) => person.appearances >= state.minimum)
    .map((person) => ({
      ...person,
      averageOpponentScore: person.totalOpponentScore / person.appearances,
      averageScore: person.totalScore / person.appearances,
      strongestTopic: rankingTopicSummary(person.records),
      tagSummary: rankingTagSummary(person.records)
    }))
    .sort((a, b) => {
      if (state.sort === "appearances") {
        return b.appearances - a.appearances || b.averageScore - a.averageScore || a.name.localeCompare(b.name);
      }
      if (state.sort === "opponents") {
        return (
          b.averageOpponentScore - a.averageOpponentScore ||
          b.averageScore - a.averageScore ||
          a.name.localeCompare(b.name)
        );
      }
      if (state.sort === "name") return a.name.localeCompare(b.name);

      return b.averageScore - a.averageScore || b.appearances - a.appearances || a.name.localeCompare(b.name);
    })
    .map((person, index) => ({ ...person, rank: index + 1 }));
}

function formatAverageScore(score) {
  return Number(score).toFixed(1).replace(/\.0$/, "");
}

function formatOpponentBreakdownScore(opponent) {
  return formatAverageScore(opponent.averageOpponentScore);
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
    debate.year,
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

function navigateRankings(state) {
  const next = rankingUrl(state);
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
          <p class="topics-lede">Each debate appears under its main question. Additional topic tags connect related themes across categories.</p>
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

function renderRankings() {
  const state = rankingState();
  const filteredDebates = rankingDebates(state);
  const rankings = rankedInterlocutors(state);
  const reasoningTopics = reasoningTagDistribution();
  const rankingTagMaximum = Math.max(
    1,
    ...rankings.flatMap((person) => [person.tagSummary.fallacyRate, person.tagSummary.biasRate])
  );
  const topicOptions = [
    { value: "all", label: "All topics" },
    ...topicGroupsForDebates().map((group) => ({ value: group.id, label: group.title }))
  ];
  const hasFilters =
    state.topic !== "all" ||
    state.minimum !== MIN_RANKED_DEBATE_APPEARANCES ||
    state.sort !== "average";
  setSeo(rankingsSeo(debates, rankings.length));

  app.innerHTML = renderShell(`
    <main class="rankings-page">
      <section class="rankings-hero">
        <div>
          <p class="eyebrow">Published score averages</p>
          <h1>Rankings & Flags</h1>
          <p class="rankings-lede">Rank speakers by their published overall scores, with the context to compare topics, sample size, and opponents faced.</p>
        </div>
        <aside class="rankings-summary" aria-label="Rankings summary">
          <span>Qualified interlocutors</span>
          <strong>${rankings.length}</strong>
          <span>Filtered scorecards</span>
          <strong>${filteredDebates.length}</strong>
        </aside>
      </section>

      ${renderRankingComparison(state)}

      <section class="rankings-list-section" aria-labelledby="rankings-list-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Overall score leaderboard</p>
            <h2 id="rankings-list-heading">${escapeHtml(rankingHeading(state.sort))}</h2>
          </div>
          <div class="rankings-notes">
            <p class="rankings-note">${rankings.length ? `Showing ${rankings.length} interlocutors from ${filteredDebates.length} matching scorecards.` : "No interlocutors meet the current minimum."}</p>
            <p class="rankings-context-note">Group debate scores are not factored into interlocutors' 1-on-1 debate scorecard averages.</p>
          </div>
        </div>
        <section class="ranking-tool" aria-label="Ranking controls">
          <form class="ranking-form">
            <span class="ranking-control">
              <label for="ranking-topic">Topic focus</label>
              <select id="ranking-topic" name="topic">
                ${renderRankingOptions(topicOptions, state.topic)}
              </select>
            </span>
            <span class="ranking-control">
              <label for="ranking-minimum">Minimum debates</label>
              <select id="ranking-minimum" name="minimum">
                ${rankingMinimumOptions
                  .map(
                    (minimum) =>
                      `<option value="${minimum}"${minimum === state.minimum ? " selected" : ""}>${minimum}+ appearances</option>`
                  )
                  .join("")}
              </select>
            </span>
            <span class="ranking-control">
              <label for="ranking-sort">Sort by</label>
              <select id="ranking-sort" name="sort">
                ${renderRankingOptions(rankingSortOptions, state.sort)}
              </select>
            </span>
            <div class="ranking-form-actions">
              <button class="button primary" type="submit">Apply</button>
              ${hasFilters ? `<button class="button secondary" type="button" data-clear-rankings>Reset</button>` : ""}
            </div>
          </form>
        </section>
        ${
          rankings.length
            ? `<ol class="ranking-list">${rankings.map((person) => renderRankingCard(person, rankingTagMaximum)).join("")}</ol>`
            : `<div class="empty-results"><strong>No rankings matched.</strong><span>Try a lower minimum or broaden the topic focus.</span></div>`
        }
        ${renderRankingMethod()}
      </section>

      ${renderReasoningDistribution(reasoningTopics)}
    </main>
  `);

  bindRankingControls(state);
}

function renderRankingOptions(options, selectedValue) {
  return options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`
    )
    .join("");
}

function rankingHeading(sort) {
  const headings = {
    average: "Ranked by average score",
    opponents: "Ranked by Opponents' Avg.",
    appearances: "Ranked by appearances",
    name: "Ranked alphabetically"
  };

  return headings[sort] || headings.average;
}

function renderSampleConfidence(appearances) {
  const confidence = sampleConfidence(appearances);

  return `<span class="sample-confidence ${confidence.tone}" title="${escapeHtml(confidence.description)}"><i aria-hidden="true"></i>${escapeHtml(confidence.label)}</span>`;
}

function renderComparisonOptions(people, selectedName, placeholder) {
  return [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...people.map(
      (person) =>
        `<option value="${escapeHtml(person.name)}"${person.name === selectedName ? " selected" : ""}>${escapeHtml(person.name)}</option>`
    )
  ].join("");
}

function renderScoreHistogram(
  distribution,
  {
    className = "",
    ariaLabel = "Overall score distribution from 50 to 100",
    caption = "Bar height shows the number of published scorecards in each range."
  } = {}
) {
  const figureClass = ["profile-score-histogram", className].filter(Boolean).join(" ");

  return `
    <figure class="${escapeHtml(figureClass)}">
      <div class="profile-score-chart">
        <span class="profile-score-y-label" aria-hidden="true">Scorecards</span>
        <ol class="profile-score-bars" aria-label="${escapeHtml(ariaLabel)}">
          ${distribution.bands
            .map((band) => {
              const height = (band.count / distribution.maximumBandCount) * 100;
              return `
                <li class="${band.count ? "has-score" : "is-empty"}" data-score-bucket="${escapeHtml(band.label)}" data-score-count="${band.count}" aria-label="${escapeHtml(band.label)}: ${band.count} ${band.count === 1 ? "scorecard" : "scorecards"}">
                  <strong class="profile-score-bar-count" aria-hidden="true">${band.count || ""}</strong>
                  <span class="profile-score-bar" aria-hidden="true"><i style="--bar-height: ${height.toFixed(2)}%"></i></span>
                  <span class="profile-score-bucket-label" aria-hidden="true">${escapeHtml(band.label)}</span>
                </li>
              `;
            })
            .join("")}
        </ol>
      </div>
      <figcaption>${escapeHtml(caption)}</figcaption>
    </figure>
  `;
}

function renderComparisonPerson(person, maximumBandCount) {
  const distribution = {
    ...profileScoreDistribution(person.records),
    maximumBandCount
  };

  return `
    <article class="comparison-person" data-comparison-person="${escapeHtml(person.name)}" data-average-score="${person.averageScore}" data-opponents-average="${person.averageOpponentScore}" data-appearances="${person.appearances}">
      <a class="comparison-person-identity" href="${escapeHtml(interlocutorPath(person))}">
        <img src="${escapeHtml(person.src)}" alt="${escapeHtml(person.name)}" width="512" height="512" loading="lazy" decoding="async">
        <span>
          <strong>${escapeHtml(person.name)}</strong>
          <small>${person.appearances} ${person.appearances === 1 ? "scorecard" : "scorecards"}</small>
        </span>
      </a>
      <dl class="comparison-person-stats">
        <div><dt>Avg.</dt><dd class="${scoreTone(Math.round(person.averageScore))}">${formatAverageScore(person.averageScore)}</dd></div>
        <div><dt>Opponents' Avg.</dt><dd class="${scoreTone(Math.round(person.averageOpponentScore))}">${formatAverageScore(person.averageOpponentScore)}</dd></div>
        <div><dt>Fallacies</dt><dd class="fallacy">${formatTagRate(person.tagSummary.fallacyRate)}</dd></div>
        <div><dt>Biases</dt><dd class="bias">${formatTagRate(person.tagSummary.biasRate)}</dd></div>
      </dl>
      ${renderScoreHistogram(distribution, {
        className: "comparison-score-histogram",
        ariaLabel: `${person.name} overall score distribution from 50 to 100`,
        caption: "Overall scores by five-point range; both graphs use the same vertical scale."
      })}
    </article>
  `;
}

function renderRankingComparison(state) {
  const allPeople = [...searchFacets().people].sort((first, second) =>
    first.name.localeCompare(second.name, "en", { sensitivity: "base" })
  );
  const comparisonRankings = rankedInterlocutors({ ...state, minimum: 1, sort: "name" });
  const first = comparisonRankings.find((person) => person.name === state.comparisonA);
  const second = comparisonRankings.find((person) => person.name === state.comparisonB);
  const selectedBoth = state.comparisonA && state.comparisonB;
  const maximumBandCount =
    first && second
      ? Math.max(
          profileScoreDistribution(first.records).maximumBandCount,
          profileScoreDistribution(second.records).maximumBandCount
        )
      : 1;
  const comparisonContent =
    first && second
      ? `<div class="comparison-results">${renderComparisonPerson(first, maximumBandCount)}${renderComparisonPerson(second, maximumBandCount)}</div>`
      : `<p class="comparison-empty">${selectedBoth ? "One selected interlocutor has no qualifying scorecards in the current topic focus." : "Choose two interlocutors to compare their score averages, opponents faced, and named reasoning-tag rates."}</p>`;

  return `
    <section class="ranking-comparison" aria-labelledby="ranking-comparison-heading">
      <div class="ranking-comparison-heading">
        <div>
          <p class="eyebrow">Head-to-head</p>
          <h2 id="ranking-comparison-heading">Compare interlocutors</h2>
          <p>Comparison follows the current topic focus and uses all available appearances within it.</p>
        </div>
      </div>
      <form class="ranking-comparison-form">
        <label class="ranking-control" for="ranking-comparison-a">
          <span>First interlocutor</span>
          <select id="ranking-comparison-a" name="comparison-a">
            ${renderComparisonOptions(allPeople, state.comparisonA, "Choose an interlocutor")}
          </select>
        </label>
        <div class="ranking-comparison-versus" aria-hidden="true">
          <img src="/assets/debate-gloves.png" alt="" width="444" height="444">
        </div>
        <label class="ranking-control" for="ranking-comparison-b">
          <span>Second interlocutor</span>
          <select id="ranking-comparison-b" name="comparison-b">
            ${renderComparisonOptions(allPeople, state.comparisonB, "Choose an interlocutor")}
          </select>
        </label>
        <div class="ranking-comparison-actions">
          <button class="button primary" type="submit">Compare</button>
          ${selectedBoth ? `<button class="button secondary" type="button" data-clear-comparison>Clear</button>` : ""}
        </div>
      </form>
      ${comparisonContent}
    </section>
  `;
}

function renderRankingCard(person, maximumTagRate) {
  const profileHref = interlocutorPath(person);
  const debateLabel = `${person.appearances} ${person.appearances === 1 ? "debate" : "debates"}`;
  const firstName = person.name.trim().split(/\s+/)[0];
  const topic = person.strongestTopic;
  const { fallacyRate, biasRate } = person.tagSummary;
  const fallacyWidth = maximumTagRate ? (fallacyRate / maximumTagRate) * 100 : 0;
  const biasWidth = maximumTagRate ? (biasRate / maximumTagRate) * 100 : 0;

  return `
    <li>
      <article class="ranking-card" data-ranking-person="${escapeHtml(person.name)}" data-average-score="${person.averageScore}" data-opponents-average="${person.averageOpponentScore}" data-appearances="${person.appearances}">
        <a class="ranking-card-main" href="${escapeHtml(profileHref)}" aria-label="Open ${escapeHtml(person.name)}'s debate profile">
          <span class="ranking-place" aria-label="Rank ${person.rank}">${person.rank}</span>
          <img src="${escapeHtml(person.src)}" alt="${escapeHtml(person.name)}" width="512" height="512" loading="lazy" decoding="async">
          <span class="ranking-person">
            <strong>${escapeHtml(person.name)}</strong>
            <span class="ranking-appearance-line"><small>${escapeHtml(debateLabel)}</small>${renderSampleConfidence(person.appearances)}</span>
            <small class="ranking-topic">Most common topic: ${escapeHtml(topic?.title || "Uncategorized")}</small>
            <span class="ranking-tag-bars" aria-label="${escapeHtml(person.name)}'s reasoning-tag rates">
              <span class="ranking-tag-rate fallacy">
                <span>Fallacies</span>
                <span class="ranking-tag-track" aria-hidden="true"><i style="--bar-width: ${fallacyWidth.toFixed(2)}%"></i></span>
                <strong>${formatTagRate(fallacyRate)}</strong>
              </span>
              <span class="ranking-tag-rate bias">
                <span>Biases</span>
                <span class="ranking-tag-track" aria-hidden="true"><i style="--bar-width: ${biasWidth.toFixed(2)}%"></i></span>
                <strong>${formatTagRate(biasRate)}</strong>
              </span>
            </span>
          </span>
          <span class="ranking-score-pair">
            <span class="ranking-score ${scoreTone(Math.round(person.averageScore))}">
              <small>${escapeHtml(firstName)}'s avg.</small>
              <strong>${escapeHtml(formatAverageScore(person.averageScore))}</strong>
            </span>
            <span class="ranking-score ${scoreTone(Math.round(person.averageOpponentScore))}">
              <small>Opponents' Avg.</small>
              <strong>${escapeHtml(formatAverageScore(person.averageOpponentScore))}</strong>
            </span>
          </span>
        </a>
      </article>
    </li>
  `;
}

function renderRankingMethod() {
  return `
    <details class="ranking-method">
      <summary>Ranking method</summary>
      <div>
        <p>Each average uses the published overall score for that speaker's side of every matching ranking-eligible debate. Multi-speaker approximations and any other scorecard explicitly marked ineligible are omitted rather than assigning a shared team score to each participant.</p>
        <p>Topic filters include any debate assigned to the selected category. The Opponents' Avg. sort uses the published overall scores of the opponents each person faced.</p>
        <p>These figures assess the reasoning performance recorded in Slugfester scorecards. They do not establish the truth of a speaker's conclusions, expertise, or personal worth.</p>
      </div>
    </details>
  `;
}

function profileForSlug(slug) {
  return rankedInterlocutors({ topic: "all", minimum: 1, sort: "name" }).find(
    (person) => interlocutorSlug(person.name) === slug
  );
}

function profileAvatarForSlug(slug) {
  for (const debate of debates) {
    for (const sideKey of ["pro", "con"]) {
      const avatar = avatarsForSpeakerText(debate.sides[sideKey].speaker).find(
        (person) => interlocutorSlug(person.name) === slug
      );
      if (avatar) return avatar;
    }
  }

  return null;
}

function profileTeamRecords(personName) {
  return debates.flatMap((debate) => {
    if (isOneOnOneDebate(debate)) return [];

    return ["pro", "con"]
      .filter((sideKey) =>
        avatarsForSpeakerText(debate.sides[sideKey].speaker).some(
          (person) => person.name === personName
        )
      )
      .map((sideKey) => ({ debate, sideKey }));
  });
}

function renderProfileMetric(label, value, tone = "") {
  return `<div class="profile-metric${tone ? ` ${tone}` : ""}"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderProfileDistribution(distribution, appearances, person) {
  return `
    <section class="profile-distribution" data-score-median="${distribution.median}" data-score-lowest="${distribution.lowest}" data-score-highest="${distribution.highest}" aria-labelledby="profile-distribution-heading">
      <div class="profile-section-heading">
        <div>
          <p class="eyebrow">Score profile</p>
          <h2 id="profile-distribution-heading">Distribution, not a sequence</h2>
        </div>
        <p>Overall scores are grouped into fixed five-point buckets so every interlocutor uses the same 50–100 scale.</p>
      </div>
      <div class="profile-distribution-overview">
        <strong>${escapeHtml(distribution.consistency)}</strong>
        <span>Median ${formatAverageScore(distribution.median)} · Range ${distribution.lowest}–${distribution.highest} · ${appearances} ${appearances === 1 ? "scorecard" : "scorecards"}</span>
      </div>
      <div class="profile-bio-chart">
        ${biographies.renderBiography(person)}
        ${renderScoreHistogram(distribution)}
      </div>
    </section>
  `;
}

function renderProfileTopics(topics) {
  return `
    <section class="profile-breakdown" aria-labelledby="profile-topics-heading">
      <div class="profile-section-heading">
        <div>
          <p class="eyebrow">Topic record</p>
          <h2 id="profile-topics-heading">Performance by topic</h2>
        </div>
      </div>
      <ol class="profile-breakdown-list">
        ${topics
          .map(
            (topic) => `
              <li data-topic-name="${escapeHtml(topic.title)}" data-topic-average="${topic.averageScore}" data-topic-appearances="${topic.appearances}">
                <span><strong>${escapeHtml(topic.title)}</strong><small>${topic.appearances} ${topic.appearances === 1 ? "scorecard" : "scorecards"}</small></span>
                <b class="${scoreTone(Math.round(topic.averageScore))}">${formatAverageScore(topic.averageScore)}</b>
              </li>
            `
          )
          .join("")}
      </ol>
    </section>
  `;
}

function renderProfileOpponents(opponents, person) {
  return `
    <section class="profile-breakdown profile-opponents" aria-labelledby="profile-opponents-heading">
      <div class="profile-section-heading">
        <div>
          <p class="eyebrow">Opponents faced</p>
          <h2 id="profile-opponents-heading">Debate opponents</h2>
        </div>
        <p>Right-hand values are matchup scores against ${escapeHtml(person.name)}—not opponents’ overall profile averages.</p>
      </div>
      <ol class="profile-opponent-list">
        ${opponents
          .map(
            (opponent) => `
              <li data-opponent-name="${escapeHtml(opponent.name)}" data-opponent-average="${opponent.averageOpponentScore}" data-opponent-meetings="${opponent.appearances}">
                <a href="${escapeHtml(interlocutorPath(opponent))}">
                  <img src="${escapeHtml(opponent.src)}" alt="${escapeHtml(opponent.name)}" width="512" height="512" loading="lazy" decoding="async">
                  <span><strong>${escapeHtml(opponent.name)}</strong><small>${opponent.appearances} ${opponent.appearances === 1 ? "meeting · matchup score" : "meetings · matchup average"}</small></span>
                </a>
                <b class="${scoreTone(Math.round(opponent.averageOpponentScore))}">${formatOpponentBreakdownScore(opponent)}</b>
              </li>
            `
          )
          .join("")}
      </ol>
    </section>
  `;
}

function renderProfileDebateCard(record, person) {
  const debate = record.debate;
  const opponentNames = record.opponents.map((opponent) => opponent.name).join(", ");

  return `
    <article class="profile-debate-card" data-debate-record="${escapeHtml(debate.id)}" data-person-score="${record.score}" data-opponent-score="${record.opponentScore}">
      <p class="eyebrow">${escapeHtml(debateNumberLabel(debate))}</p>
      <h3><a href="${escapeHtml(debatePath(debate))}">${renderDebateTitle(debate)}</a></h3>
      <p>${escapeHtml(debate.label)}</p>
      <span class="profile-debate-opponent">Against ${escapeHtml(opponentNames || "the opposing side")}</span>
      <dl>
        <div><dt>${escapeHtml(person.name.split(/\s+/)[0])}'s score</dt><dd class="${scoreTone(record.score)}">${record.score}</dd></div>
        <div><dt>Opponents' score</dt><dd class="${scoreTone(record.opponentScore)}">${record.opponentScore}</dd></div>
      </dl>
    </article>
  `;
}

function renderProfileTeamScorecards(records) {
  if (!records.length) return "";

  return `
    <section class="profile-scorecards" aria-labelledby="profile-team-scorecards-heading">
      <div class="profile-section-heading">
        <div>
          <p class="eyebrow">Team record</p>
          <h2 id="profile-team-scorecards-heading">Team and panel appearances</h2>
        </div>
        <p>These scorecards assess a combined side. They remain available to read but do not affect this interlocutor’s individual averages, distribution, or opponent record.</p>
      </div>
      <div class="profile-debate-grid">
        ${records
          .map(
            ({ debate, sideKey }) => `
              <article class="profile-debate-card">
                <p class="eyebrow">${escapeHtml(debateNumberLabel(debate))}</p>
                <h3><a href="${escapeHtml(debatePath(debate))}">${renderDebateTitle(debate)}</a></h3>
                <p>${escapeHtml(debate.label)}</p>
                <span class="profile-debate-opponent">Side: ${escapeHtml(debate.sides[sideKey].speaker)}</span>
                <p>Shared side score excluded from the individual record.</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderInterlocutorProfile(slug) {
  const eligibleProfile = profileForSlug(slug);
  const person = eligibleProfile || profileAvatarForSlug(slug);

  if (!person) {
    setSeo(notFoundSeo());
    app.innerHTML = renderShell(`
      <main class="not-found">
        <p class="eyebrow">No profile</p>
        <h1>Interlocutor not found</h1>
        <a class="button primary" href="${rankingsPath()}">Back to Rankings</a>
      </main>
    `);
    return;
  }

  const teamScorecards = profileTeamRecords(person.name).sort(
    (a, b) => Number.parseInt(a.debate.number, 10) - Number.parseInt(b.debate.number, 10)
  );
  const teamProfileLastmod = teamScorecards.map(({ debate }) => debate.date).filter(Boolean).sort().at(-1);

  if (!eligibleProfile) {
    setSeo(
      interlocutorSeo(
        person,
        0,
        teamProfileLastmod,
        teamScorecards.map(({ debate }) => debate),
        biographies.biographyFor(person)
      )
    );
    app.innerHTML = renderShell(`
      <main class="interlocutor-profile-page" data-profile-name="${escapeHtml(person.name)}" data-one-on-one-count="0" data-team-count="${teamScorecards.length}">
        <a class="back-link profile-back-link" href="${rankingsPath()}">Back to Rankings & Flags</a>

        <section class="profile-hero">
          <div class="profile-identity">
            <img src="${escapeHtml(person.src)}" alt="${escapeHtml(person.name)}" width="512" height="512" decoding="async">
            <div>
              <p class="eyebrow">Interlocutor profile</p>
              <h1>${escapeHtml(person.name)}</h1>
              <p>No eligible one-on-one scorecards yet. Team and panel appearances are listed separately below.</p>
              <span class="sample-confidence limited"><i aria-hidden="true"></i>No 1-on-1 sample</span>
            </div>
          </div>
          <dl class="profile-hero-scores">
            ${renderProfileMetric("1-on-1 scorecards", "0")}
            ${renderProfileMetric("Team appearances", String(teamScorecards.length))}
          </dl>
        </section>

        ${biographies.renderBiography(person, undefined, 2)}
        ${renderProfileTeamScorecards(teamScorecards)}
      </main>
    `);
    return;
  }

  const distribution = profileScoreDistribution(person.records);
  const topics = profileTopicBreakdown(person.records);
  const opponents = profileOpponentBreakdown(person.records);
  const confidence = sampleConfidence(person.appearances);
  const scorecards = [...person.records].sort(
    (a, b) => Number.parseInt(a.debate.number, 10) - Number.parseInt(b.debate.number, 10)
  );
  const profileLastmod = [...person.records.map(({ debate }) => debate.date), teamProfileLastmod]
    .filter(Boolean)
    .sort()
    .at(-1);

  setSeo(
    interlocutorSeo(
      person,
      person.appearances,
      profileLastmod,
      [
        ...scorecards.map(({ debate }) => debate),
        ...teamScorecards.map(({ debate }) => debate)
      ],
      biographies.biographyFor(person)
    )
  );
  app.innerHTML = renderShell(`
    <main class="interlocutor-profile-page" data-profile-name="${escapeHtml(person.name)}" data-one-on-one-count="${person.appearances}" data-team-count="${teamScorecards.length}" data-average-score="${person.averageScore}" data-opponents-average="${person.averageOpponentScore}">
      <a class="back-link profile-back-link" href="${rankingsPath()}">Back to Rankings & Flags</a>

      <section class="profile-hero">
        <div class="profile-identity">
          <img src="${escapeHtml(person.src)}" alt="${escapeHtml(person.name)}" width="512" height="512" decoding="async">
          <div>
            <p class="eyebrow">Interlocutor profile</p>
            <h1>${escapeHtml(person.name)}</h1>
            <p>${person.appearances} published 1-on-1 ${person.appearances === 1 ? "scorecard" : "scorecards"} across ${topics.length} ${topics.length === 1 ? "topic" : "topics"}.${teamScorecards.length ? ` ${teamScorecards.length} ${teamScorecards.length === 1 ? "team appearance is" : "team appearances are"} listed separately.` : ""}</p>
            <span class="sample-confidence ${confidence.tone}" title="${escapeHtml(confidence.description)}"><i aria-hidden="true"></i>${escapeHtml(confidence.label)}</span>
          </div>
        </div>
        <dl class="profile-hero-scores">
          ${renderProfileMetric("Average score", formatAverageScore(person.averageScore), scoreTone(Math.round(person.averageScore)))}
          ${renderProfileMetric("Opponents' Avg.", formatAverageScore(person.averageOpponentScore), scoreTone(Math.round(person.averageOpponentScore)))}
          ${renderProfileMetric("Fallacies", formatTagRate(person.tagSummary.fallacyRate), "fallacy")}
          ${renderProfileMetric("Biases", formatTagRate(person.tagSummary.biasRate), "bias")}
        </dl>
      </section>

      ${renderProfileDistribution(distribution, person.appearances, person)}

      <section class="profile-detail-grid">
        ${renderProfileTopics(topics)}
        ${renderProfileOpponents(opponents, person)}
      </section>

      <section class="profile-scorecards" aria-labelledby="profile-scorecards-heading">
        <div class="profile-section-heading">
          <div>
            <p class="eyebrow">Linked record</p>
            <h2 id="profile-scorecards-heading">1-on-1 debate scorecards</h2>
          </div>
          <p>Open a scorecard to read the transcript-grounded assessment behind its published score.</p>
        </div>
        <div class="profile-debate-grid">
          ${scorecards.map((record) => renderProfileDebateCard(record, person)).join("")}
        </div>
      </section>

      ${renderProfileTeamScorecards(teamScorecards)}
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
        <span>${escapeHtml(debate.label)}${renderDebateYear(debate)}</span>
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
  const resultPager = paginatedItems(matches, SEARCH_PAGE_SIZE, state.page);
  const hasFilters = Boolean(state.query.trim() || state.people.length);

  app.innerHTML = renderShell(`
    <main class="search-page">
      <section class="search-hero">
        <div>
          <p class="eyebrow">Search scorecards</p>
          <h1>Find debates</h1>
        </div>
        <p class="search-count" role="status" aria-live="polite">${matches.length} of ${debates.length} debates</p>
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
                pager: resultPager,
                position: "above results"
              })}
              <div class="search-result-list">${resultPager.items.map(renderSearchResult).join("")}</div>
              ${renderPagination({
                hrefForPage: (page) => searchUrl({ ...state, page }),
                itemLabel: "debates",
                label: "Search results",
                pager: resultPager,
                position: "below results"
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
      <img src="${escapeHtml(person.src)}" alt="" width="512" height="512" loading="lazy" decoding="async">
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
          <h3><a class="debate-title-link search-result-title-link" href="${escapeHtml(debatePath(debate))}">${renderDebateTitle(debate)}</a></h3>
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
        <a class="button secondary" href="${escapeHtml(debate.youtubeUrl)}" target="_blank" rel="noopener noreferrer">YouTube Source</a>
      </div>
    </article>
  `;
}

function renderResultPerson(person) {
  return `
    <a class="result-person" href="${escapeHtml(interlocutorPath(person))}" aria-label="Open ${escapeHtml(person.name)}'s interlocutor profile">
      <img src="${escapeHtml(person.src)}" alt="" width="512" height="512" loading="lazy" decoding="async">
      <span>${escapeHtml(person.name)}</span>
    </a>
  `;
}

function renderInsights() {
  const methods = window.location.pathname.includes("/data-and-methods");
  setSeo(methods ? insightsMethodsSeo() : insightsSeo());
  app.innerHTML = renderShell(`<main class="insights-page">${methods ? insightsMethodsContent() : insightsContent()}</main>`);
}

function renderBackend() {
  const sectionScores = sectionScoreDistribution();
  const recommendationSent =
    new URLSearchParams(window.location.search).get("recommendation") === "sent";
  setSeo(backendSeo());

  app.innerHTML = renderShell(`
    <main class="assessment-page backend-page">
      <section class="assessment-hero">
        <div>
          <p class="eyebrow">Backend</p>
          <h1>Backend</h1>
          <p class="assessment-lede">This is the machinery behind Slugfester: complete debate transcripts are converted into auditable argument maps, independently reviewed, scored under one published rubric, and checked before publication.</p>
        </div>
        <aside class="assessment-stamp" aria-label="Backend model">
          <span>Latest full reassessment workflow</span>
          <strong>5.6 Sol · low</strong>
          <p>Two fresh, isolated, score-blind judgments were made for each eligible debate. Disagreements were adjudicated separately, and repository code—not the model—calculated the published totals.</p>
        </aside>
      </section>

      <section class="backend-summary" aria-labelledby="backend-summary-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Assessment update</p>
            <h2 id="backend-summary-heading">A careful attempt at objective scoring</h2>
          </div>
          <p class="section-summary">Updated September 5, 2026</p>
        </div>
        <div class="backend-summary-panel">
          <div class="backend-summary-copy">
            <p><strong>Objectivity here means disciplined consistency, not infallibility.</strong> Slugfester applies the same evidential and logical standards to both sides, excludes applause, reputation, charisma, and agreement with a conclusion, and treats every score as an AI-assisted estimate of the argument actually presented.</p>
            <p>The recent campaign reviewed the complete transcript chain, hid prior scores and prose from new judgments, used two independent reviews, isolated disagreements, verified uncertain audio, calculated totals mechanically, and preserved the evidence needed to audit the result. Failed attempts were retained rather than quietly replaced.</p>
            <p>The next site-wide reassessment is tentatively scheduled for spring 2027, when sources and quality controls permit. Future reviews may correct or refine assessments, but they should use a frozen method, preserve earlier records, and never change scores merely to produce a preferred winner.</p>
          </div>
          <div class="backend-summary-stats" aria-label="Reassessment compute summary">
            <article class="backend-summary-stat--compute">
              <span>Recorded model work</span>
              <strong>≈83 hr</strong>
              <p>conservative aggregate compute estimate for the completed reassessment campaign</p>
              <p class="backend-summary-stat-note">Each new debate requires 1-2 hours to process and add.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="backend-selection" id="recommend-a-debate" aria-labelledby="backend-selection-heading">
        <div class="backend-selection-copy">
          <p class="eyebrow">Catalogue scope</p>
          <h2 id="backend-selection-heading">How debates enter Slugfester</h2>
          <p><strong>The selection process is somewhat arbitrary.</strong> Slugfester is a curated catalogue, not a random or representative sample of all public debates. We favor videos that clearly fit within one of the ${topicCategoryDefinitions.length} topic categories listed on the site. Choices also reflect available complete sources, topics likely to interest readers, recognizable or recurring interlocutors, and whether a debate can be processed reliably with the current workflow.</p>
          <p>That means catalogue-wide patterns describe the debates published here; they should not be treated as a neutral sample of every topic, viewpoint, speaker, or debate format. Reader recommendations help broaden the pool considered for future additions, but a recommendation does not guarantee assessment.</p>
        </div>
        <div class="backend-recommendation-card">
          <div>
            <p class="eyebrow">Reader recommendation</p>
            <h3>Recommend a debate</h3>
            <p>Send a public debate link for consideration. Both fields are required.</p>
          </div>
          ${recommendationSent ? '<p class="backend-recommendation-success" role="status"><strong>Recommendation sent.</strong> Thank you—we’ll review the debate for possible inclusion.</p>' : ""}
          <form class="backend-recommendation-form" action="https://formsubmit.co/44a747882839a1240511c0b4bca3bd95" method="post" accept-charset="UTF-8">
            <input type="hidden" name="_subject" value="Slugfester debate recommendation">
            <input type="hidden" name="_template" value="table">
            <input type="hidden" name="_next" value="https://slugfester.com/backend/?recommendation=sent#recommend-a-debate">
            <label class="backend-recommendation-honey" aria-hidden="true">
              Leave this field empty
              <input type="text" name="_honey" tabindex="-1" autocomplete="off">
            </label>
            <label for="recommended-debate-url">Debate URL</label>
            <input id="recommended-debate-url" name="debate_url" type="url" inputmode="url" autocomplete="url" placeholder="https://www.youtube.com/watch?v=…" maxlength="500" required>
            <label for="recommender-email">Your email address</label>
            <input id="recommender-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" maxlength="254" required>
            <button class="button primary" type="submit">Send recommendation</button>
          </form>
          <p class="backend-recommendation-privacy">Your URL and email are delivered to the site administrator through FormSubmit. Your email will be used only if follow-up about the recommendation is needed.</p>
        </div>
      </section>

      <section class="backend-objectivity" aria-labelledby="backend-objectivity-heading">
        <details class="backend-objectivity-accordion">
          <summary>
            <span>
              <span class="backend-objectivity-kicker">Plain-English methodology</span>
              <strong id="backend-objectivity-heading">How Slugfester works toward a fair assessment</strong>
              <small>Open the complete scoring, review, and fallacy-or-bias process</small>
            </span>
            <i aria-hidden="true"></i>
          </summary>
          <div class="backend-objectivity-content">
            <p class="backend-objectivity-intro"><strong>No procedure can remove judgment entirely.</strong> The aim is to make that judgment consistent, evidence-based, resistant to avoidable influence, and open to checking. The same sequence and standards are applied to both sides.</p>
            <ol class="backend-objectivity-steps">
              <li>
                <h3>Start with the complete source</h3>
                <p>The full available debate transcript is collected with timestamps and checked against its source. Each passage is tied to the correct speaker. If the speaker cannot be identified confidently from the transcript, the audio must be checked before that passage can affect the result.</p>
              </li>
              <li>
                <h3>Define what each side must establish</h3>
                <p>Before scoring, the central question, each side's stated position, and the burdens each side actually accepts are written down. A critic is not required to prove the opposite conclusion merely for challenging an argument, unless that critic also takes on a positive claim.</p>
              </li>
              <li>
                <h3>Map the debate before seeing any scores</h3>
                <p>The transcript is divided into topic sections and individual argumentative moves. Replies are connected to the strongest point they address. Each move receives an importance level from 1 to 3, and every section receives a percentage of the whole debate. Those choices are locked before numerical scoring, and prior scorecards, winners, and critiques are hidden.</p>
              </li>
              <li>
                <h3>Review every move twice and independently</h3>
                <p>Two separate reviews examine the same locked evidence under the same rubric without seeing each other's work. They judge the argument presented—not the speaker's reputation, confidence, wit, worldview, popularity, or audience reaction.</p>
                <ul>
                  <li><strong>25% logical coherence:</strong> Do the premises and conclusion fit together without contradiction or an invalid step?</li>
                  <li><strong>20% evidence and support:</strong> Are factual claims supported, and is the bridge from evidence to conclusion defended?</li>
                  <li><strong>20% responsiveness:</strong> Does the move answer the strongest relevant point rather than a weaker substitute?</li>
                  <li><strong>15% relevance and burden:</strong> Does it advance the position the speaker actually undertook to defend?</li>
                  <li><strong>10% precision and clarity:</strong> Are the important terms, limits, and level of confidence clear and stable?</li>
                  <li><strong>10% calibration and charity:</strong> Does confidence match the evidence, and is the opposing position represented fairly?</li>
                </ul>
              </li>
              <li>
                <h3>Resolve disagreements without quietly averaging them</h3>
                <p>Fixed comparison rules identify meaningful differences between the two reviews. A separate review then considers only the disputed evidence and anonymized alternatives. Required audio checks and disputes must be resolved before scoring can continue. Failed or invalid attempts are preserved rather than silently replaced until a preferred answer appears.</p>
              </li>
              <li>
                <h3>Calculate each move and section score</h3>
                <p>Software combines the six ratings using the fixed percentages above to produce each move score. Within a section, every move's score is multiplied by its previously locked importance. Those results are added and divided by the total importance. This lets central arguments count more than minor remarks without allowing anyone to adjust the section after seeing who is ahead.</p>
              </li>
              <li>
                <h3>Calculate the comprehensive score</h3>
                <p>Each section score is multiplied by the section's previously locked share of the debate, and those weighted results are combined. The default final adjustment is zero. A change from −5 to +5 is allowed only for a debate-wide success or failure that affects a stated burden and has not already influenced any move, section, importance value, or other score. The software calculates the final number; it is never manually nudged to select a winner.</p>
              </li>
              <li>
                <h3>Treat debates with three or more speakers as team assessments</h3>
                <p><strong>Short answer: no individual score is inferred.</strong> The current public scorecard format stores one comprehensive score for each side. When several interlocutors are grouped on a side, that number describes the combined case; it is not treated as evidence that every teammate contributed equally or personally earned the same result.</p>
                <p>Individual argument cards remain attached to the person who actually made the move. A teammate's argument is not credited to someone else merely because they share a side, unless the other speaker explicitly adopts it. This preserves speaker ownership within the analysis even though the final number is still side-level.</p>
                <p>Team and panel scorecards remain available as assessments of their two sides, but they are excluded from individual rankings, profile averages, score distributions, and opponent records. The newer multi-speaker method treats their results as approximate, checks speaker handoffs and selected passages against the audio, and tests whether the leading side changes when contributions are rebalanced or one teammate is removed.</p>
              </li>
              <li>
                <h3>Review fallacies and cognitive biases separately</h3>
                <p>These labels are checked apart from the numerical totals. Every locked move is reviewed against the available definitions in two blind passes, with old tags and the other review hidden. A separate reviewer considers the anonymized candidates, followed by a conservative source check.</p>
                <ul>
                  <li>A <strong>logical fallacy</strong> is mentioned only when a named error is genuinely present in the reasoning and helps explain why the inference is weaker.</li>
                  <li>A <strong>cognitive bias</strong> is mentioned only when a recognizable tendency materially shapes the selection, framing, or evaluation of evidence. Holding a viewpoint or reaching a disputed conclusion is not enough.</li>
                  <li>Merely incomplete support, a contestable premise, or a weak analogy does not automatically justify a named label. When uncertain, the label is omitted.</li>
                  <li>An accepted label receives a transcript-specific explanation and a reference link. It never creates an extra score penalty; the underlying weakness is counted once in the ordinary rubric.</li>
                </ul>
              </li>
              <li>
                <h3>Lock, reconstruct, and audit the publication</h3>
                <p>Only after the scores and labels are settled are the reader-facing summaries and critiques assembled. The published result must reproduce the locked calculations exactly. Quotes, speaker attribution, move coverage, links, page behavior, and the full site are checked before release. Later corrections remain possible, but they require a new traceable assessment rather than an invisible rewrite.</p>
              </li>
            </ol>
            <p class="backend-objectivity-limit"><strong>What this achieves:</strong> a repeatable and inspectable estimate of how well each side argued in this particular transcript. It does not establish which worldview is ultimately true, and it does not make an AI-assisted judgment infallible.</p>
          </div>
        </details>
      </section>

      <section class="backend-technical" aria-labelledby="backend-technical-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Technical detail</p>
            <h2 id="backend-technical-heading">Controls behind the current assessments</h2>
          </div>
          <p class="section-summary">For readers who want the implementation details</p>
        </div>
        <p class="backend-technical-intro">The production campaign used the promoted adjudicated-consensus workflow for eligible two-person debates. The controls below reduce avoidable bias and inconsistency; they cannot turn a model judgment into ground truth.</p>
        <div class="backend-technical-grid">
          <article>
            <h3>Locked source chain</h3>
            <p>Each debate required a complete local transcript, timestamped caption events, and a source manifest. SHA-256 content hashes—a digital fingerprint used to detect any change—were checked before semantic work. Debates with more than two substantive speakers were not forced through the two-sided workflow.</p>
          </article>
          <article>
            <h3>Score-blind construction</h3>
            <p>Prior scores, critiques, winners, tags, Overall Commentary, and AI Extension prose were kept outside the judgment context. The argument inventory, source spans, section membership, response links, and importance weights were frozen before either scoring judgment began.</p>
          </article>
          <article>
            <h3>Independent judgments</h3>
            <p>Two fresh 5.6 Sol contexts at low reasoning effort reviewed the same locked packet in isolation through the ChatGPT subscription. Neither saw the other judgment. Execution records retained the actual model label, authentication method, copied-input size, output hashes, elapsed time, and validation result.</p>
          </article>
          <article>
            <h3>Disagreement and audio gates</h3>
            <p>Code extracted categorical and numerical disagreements using fixed rules. Every move below high speaker-attribution confidence required audio verification. A third isolated context saw only disputed evidence and anonymous alternatives; no unresolved required check could enter a final ledger.</p>
          </article>
          <article>
            <h3>Mechanical scoring</h3>
            <p>The two judgments and any adjudicated fields were merged into a resolved ledger. Repository code then ran one deterministic score pass using fixed dimension weights, importance-weighted section means, prelocked section weights, and a bounded −5 to +5 burden-completion adjustment. Models did not author totals, and scores were not manually tuned.</p>
          </article>
          <article>
            <h3>Publication and replay</h3>
            <p>Readable summaries and critiques were reconstructed only after scores were locked. Exact-quote rules, field-level repair limits, semantic checks, generated-page comparison, desktop and mobile rendering, keyboard operation, and repository-wide validation all had to pass before publication.</p>
          </article>
        </div>
        <p class="backend-technical-note"><strong>What ≈83 hours means.</strong> This is the recorded time spent inside the assessment model across the completed campaign—including failed and recovery attempts—not the length of the videos or time spent waiting. It is a conservative minimum because three brief recovery runs did not retain usable timing data.</p>
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
          <li><span>01</span><strong>Lock the source.</strong><p>Complete timestamped transcripts and their content hashes are checked before analysis begins.</p></li>
          <li><span>02</span><strong>Map without prior scores.</strong><p>The motion, burdens, argument units, replies, sections, and importance values are frozen without exposing legacy assessments.</p></li>
          <li><span>03</span><strong>Review twice.</strong><p>Two isolated judgments apply the same six-dimension rubric to the same score-blind packet without seeing one another.</p></li>
          <li><span>04</span><strong>Resolve disagreements.</strong><p>Code extracts disputed fields, uncertain speaker attribution triggers audio checks, and a separate judgment adjudicates only what remains disputed.</p></li>
          <li><span>05</span><strong>Calculate once.</strong><p>A fully resolved ledger enters one deterministic score pass. The model never supplies the published move, section, or overall totals.</p></li>
          <li><span>06</span><strong>Reconstruct and audit.</strong><p>Readable prose, exact quotations, generated pages, desktop and mobile layouts, and the complete repository are validated before publication.</p></li>
        </ol>
      </section>

      <section class="assessment-rubric" aria-labelledby="assessment-rubric-heading">
        <div class="section-heading">
          <p class="eyebrow">Rubric v2</p>
          <h2 id="assessment-rubric-heading">How the numbers are earned</h2>
        </div>
        <p class="assessment-rubric-intro">The v2 reassessment method scores the transcript performance before calculating totals. The same definitions and burdens apply to both sides; applause, status, and agreement with a conclusion do not count.</p>
        <div class="principle-grid rubric-dimensions">
          ${renderAssessmentPrinciple("25% · Logical coherence", "Do the conclusion and intermediate claims follow without contradiction, equivocation, or an invalid inference?")}
          ${renderAssessmentPrinciple("20% · Evidence and warrant", "Are factual claims supported, and are the bridges from evidence to conclusion defended?")}
          ${renderAssessmentPrinciple("20% · Responsiveness", "Does the move engage the strongest relevant point rather than a weaker substitute or diversion?")}
          ${renderAssessmentPrinciple("15% · Relevance and burden", "Does the move advance the side's actual burden on the motion without shifting or inflating it?")}
          ${renderAssessmentPrinciple("10% · Precision and clarity", "Are the terms, scope, modality, and confidence sufficiently clear and stable?")}
          ${renderAssessmentPrinciple("10% · Calibration and charity", "Does confidence match the evidence while treating live alternatives fairly?")}
        </div>
        <div class="rubric-formulas" aria-label="Rubric score formulas">
          <article><strong>Move</strong><code>.25L + .20E + .20R + .15B + .10P + .10C</code></article>
          <article><strong>Section</strong><code>importance-weighted mean of the selected moves</code></article>
          <article><strong>Overall</strong><code>prelocked section-weighted mean + −5…+5 burden adjustment</code></article>
        </div>
        <h3 class="score-bands-heading">Score bands</h3>
        <div class="score-band-list">
          ${renderScoreBand("90-100", "Exceptional", "A clear, relevant, well-supported move that anticipates the strongest obvious replies and survives them.", 96)}
          ${renderScoreBand("80-89", "Strong", "A persuasive argument or rebuttal with minor gaps, compressed support, or uncertainty that does not defeat the main point.", 86)}
          ${renderScoreBand("70-79", "Solid", "A coherent and relevant move that helps the side's case but needs more evidence, precision, or follow-through.", 76)}
          ${renderScoreBand("60-69", "Mixed", "A partially useful move that depends on thin warrants, speculative links, or an incomplete answer to the objection.", 66)}
          ${renderScoreBand("50-59", "Weak", "A move with serious missing evidence, misframing, evasiveness, or poor contact with the opponent's actual claim.", 56)}
          ${renderScoreBand("<50", "Defective", "A move that is irrelevant, circular, self-undermining, or fallacious at the point where the argument needs support.", 42)}
        </div>
      </section>

      ${renderSectionScoreDistribution(sectionScores)}

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
          <p>Assessments are grounded in the debate transcript and Slugfester's published rubric. Account personalization and private conversation history are not inputs to the site's assessment data. Like any AI-assisted evaluation, the results remain open to revision and reader scrutiny.</p>
          <p>Named fallacies and biases are routed through Slugfester reference pages first. Those pages give the basic definition, explain the debate-specific occurrence, link back to the source debate, and then point to LogFall or CogBias for deeper external treatment.</p>
        </div>
      </section>

      <section class="backend-report" aria-labelledby="backend-report-heading">
        <div class="backend-report-panel">
          <header class="backend-report-header">
            <span class="backend-objectivity-kicker">Research library</span>
            <h2 id="backend-report-heading">Corpus-level analysis papers</h2>
            <p>Seven expanded research papers, with a shared September 4, 2026 snapshot of 253 assessments</p>
            <p><a class="button primary" href="${insightsPath()}">Explore the findings on Insights</a></p>
          </header>
          <div class="backend-objectivity-content backend-report-content">
            <div class="backend-report-copy">
              <p class="eyebrow">Astra-era research edition · September 4, 2026 · Plain-language revision</p>
              <h3>Clearer explanations, fully explained graphs, and conclusions you can check</h3>
              <p>All seven papers now use plainer language, numbered arguments leading to clear conclusions, and a reading key for every graph. Worked examples explain the statistics without assuming prior knowledge. The papers share a frozen archive of <strong>253 assessments</strong>: 237 comparable one-on-one scoring records, including 187 religious-versus-skeptical comparisons. Each paper states which records it uses and what its findings cannot establish.</p>
              <p>The first group explains the 6.34-point mean non-theist advantage, maps its topic differences, and examines slogan-like reasoning. The second asks how much the formal CON role explains and why a fallacy count is not a complete measure of debate quality. The final group examines whether scores from different assessment processes are comparable and how much confidence to place in exact speaker ranks.</p>
              <p><strong>New analysis is not new scoring.</strong> The original debate scores remain unchanged. Six papers reanalyze existing assessments; the slogan paper was replaced on September 5 with a fresh, direct reading of all 187 relevant transcripts. These papers are intended as a stable baseline until the next major GPT-model review, with genuine corrections remaining possible in the meantime. A newer model's accuracy and fairness should be tested, not assumed.</p>
              <p>The papers distinguish observed findings from proposed explanations, show counterexamples, and identify what could change their conclusions. The position studies classify the side actually argued, rather than equating <em>PRO</em> with theism. <a href="/insights/data-and-methods/">Inspect the methods, classifications, calculations, and source records.</a></p>
            </div>
            <div class="backend-report-library" aria-label="Corpus-level analysis papers">
              <section class="backend-report-group" aria-labelledby="backend-report-theist-heading">
                <div class="backend-report-group-heading">
                  <span>Part one</span>
                  <h3 id="backend-report-theist-heading">Theist and non-theist performance</h3>
                  <p>The central score gap, where it is largest, and one proposed rhetorical mechanism.</p>
                </div>
                <div class="backend-report-grid">
              <article class="backend-report-card">
                <span>Paper one · Score-gap diagnosis</span>
                <h4>Why Do the Theist Sides Score Lower?</h4>
                <p>Across 187 relevant debates, the non-theist side averages 6.34 points higher and leads in 160 assessments. Support for claims shows the largest gap among the six scoring areas. Support, consistent reasoning, and answers to objections together make up about three-quarters of the overall score difference.</p>
                <p>The paper tests the <strong>faith-to-debate hypothesis</strong>: standards that sustain personal faith may carry into public debate without supplying enough reason for an unconvinced listener. It asks what connects possibility to probability, religious benefit to truth, or a gap in one explanation to support for another. The conclusion separates the observed weaknesses from their still-unproved cause. Theist counterexamples and checks using different selections keep the claim open to criticism.</p>
                <dl>
                  <div>
                    <dt>Coverage</dt>
                    <dd>187 debates · 4,086 moves</dd>
                  </div>
                  <div>
                    <dt>Mean score advantage</dt>
                    <dd>6.34 points out of 100</dd>
                  </div>
                  <div>
                    <dt>Length and figures</dt>
                    <dd>14 pages · 5 figures</dd>
                  </div>
                </dl>
                <a class="button primary backend-report-link" href="/output/pdf/why-do-the-theist-sides-score-lower.pdf?v=20260904-astra253-r2" type="application/pdf" target="_blank" rel="noopener">Read “Why Do the Theist Sides Score Lower?”</a>
                <small>September 4 edition. Includes score reconstruction, evidence thresholds, new-debate comparisons, worked explanations of uncertainty, source-linked cases, rival explanations, and conditions that would weaken the hypothesis.</small>
              </article>

              <article class="backend-report-card">
                <span>Paper two · Topic, burden, and rubric map</span>
                <h4>Where Is the Theist Disadvantage Largest?</h4>
                <p>Religion, culture, and meaning has the largest observed mean gap: 8.27 points across 22 debates, with the non-theist side higher in 21 and one tie. Resurrection debates are closer, averaging 3.53 points across 17 comparisons. The paper explains both the topic differences and why overlapping uncertainty makes an exact topic ranking fragile.</p>
                <p>Its most useful question is what supports the next step: from religious usefulness to truth, from a necessary foundation to a personal God, or from possible divine reasons to an explanation of the suffering we see. Fully explained graphs show the topic differences, how often each side scores higher, and why the exact order of topics is uncertain.</p>
                <dl>
                  <div>
                    <dt>Coverage</dt>
                    <dd>187 debates · 8 topic groups</dd>
                  </div>
                  <div>
                    <dt>Largest topic mean</dt>
                    <dd>8.27 points · 21 of 22 higher</dd>
                  </div>
                  <div>
                    <dt>Length and figures</dt>
                    <dd>15 pages · 5 figures</dd>
                  </div>
                </dl>
                <a class="button primary backend-report-link" href="/output/pdf/where-is-the-theist-disadvantage-largest.pdf?v=20260904-astra253-r2" type="application/pdf" target="_blank" rel="noopener">Read “Where Is the Theist Disadvantage Largest?”</a>
                <small>September 4 edition. Includes all eight topic denominators, direction counts, uncertainty, topic-order resampling, a scoring-dimension map, close resurrection cases, and practical guidance for evaluating the inference that carries a conclusion.</small>
              </article>

              <article class="backend-report-card">
                <span>Paper three · Direct slogan study</span>
                <h4>Are Theist Arguments More Often Slogan-Like?</h4>
                <p>A fresh review of all 187 relevant transcripts replaces the earlier score-based warning test. It finds 77 theist and 19 non-theist uses of slogans that both replace a needed reason and shut out criticism. Allowing for speech length and giving each debate equal weight, the rates are 0.56 and 0.16 uses per 10,000 words. The broader unsupported-slogan difference is less secure, and 144 debates have no protected slogan detected on either side.</p>
                <p>Four fully explained graphs show rates, how widely the uses occur, checks across different selections, and emotional wording. Close readings include Sye Ten Bruggencate, Christopher Hitchens, and John Lennox, distinguishing missing support from claims that block correction. Lennox supplies four unsupported slogans but only one confirmed protected slogan across eight debates. The paper explains the limits of one AI reader and why emotional language does not establish that emotion caused religious belief.</p>
                <dl>
                  <div>
                    <dt>Direct review coverage</dt>
                    <dd>187 complete retained transcripts</dd>
                  </div>
                  <div>
                    <dt>Protected-slogan rate difference</dt>
                    <dd>+0.40 theist uses per 10,000 words</dd>
                  </div>
                  <div>
                    <dt>Length and figures</dt>
                    <dd>17 pages · 4 figures</dd>
                  </div>
                </dl>
                <a class="button primary backend-report-link" href="/output/pdf/are-theist-arguments-more-often-slogan-like.pdf?v=20260905-direct187-r1" type="application/pdf" target="_blank" rel="noopener">Read “Are Theist Arguments More Often Slogan-Like?”</a>
                <small>September 5 direct-review edition, using the September 4 archive of 253 assessments. Includes plain-language definitions, word denominators, uncertainty, concentration and borderline checks, timestamped examples, and a numbered conclusion. The original debate scores and the other six papers are unchanged. <a href="https://github.com/philstilwell/slugfester/tree/main/docs/analysis/direct-slogan-study-2026-09-04" target="_blank" rel="noopener">Inspect the direct-study data and methods.</a></small>
              </article>
                </div>
              </section>

              <section class="backend-report-group" aria-labelledby="backend-report-patterns-heading">
                <div class="backend-report-group-heading">
                  <span>Part two</span>
                  <h3 id="backend-report-patterns-heading">Broader corpus findings and alternative explanations</h3>
                  <p>A formal-side countercheck and the cumulative pattern behind most lower scores.</p>
                </div>
                <div class="backend-report-grid">
              <article class="backend-report-card">
                <span>Paper four · Nominal-side alternative test</span>
                <h4>Does the CON Side Have an Inherent Advantage?</h4>
                <p>CON averages 4.70 points above PRO across 237 comparable debates, but the raw contrast mixes role, position, and speaker differences. The theist occupies PRO in 164 of 187 classified comparisons; when the theist occupies CON, the nominal role contrast reverses to −3.26 points.</p>
                <p>The expanded data retain evidence for a modest residual: outside the religious comparison, CON leads by 1.54 points and its simple resampling interval is just above zero. Among 31 speakers observed in both roles, however, the weighted estimate is only 0.80 points and its interval includes zero. Worked examples explain why neither an inherent large CON bonus nor the complete absence of role effects has been established.</p>
                <dl>
                  <div>
                    <dt>Coverage</dt>
                    <dd>237 debates · 31 crossover speakers</dd>
                  </div>
                  <div>
                    <dt>Raw CON advantage</dt>
                    <dd>4.70 points · 176 of 237 higher</dd>
                  </div>
                  <div>
                    <dt>Length and figures</dt>
                    <dd>13 pages · 4 figures</dd>
                  </div>
                </dl>
                <a class="button primary backend-report-link" href="/output/pdf/does-the-con-side-have-an-inherent-advantage.pdf?v=20260904-astra253-r2" type="application/pdf" target="_blank" rel="noopener">Read “Does the CON Side Have an Inherent Advantage?”</a>
                <small>September 4 edition. Includes position reversals, balanced orientation groups, same-person comparisons, uncertainty, a worked composition example, and separate proposed tests of label bias and argumentative burden.</small>
              </article>

              <article class="backend-report-card">
                <span>Paper five · Fallacy and cumulative-loss analysis</span>
                <h4>Beyond the Fallacy Count</h4>
                <p>The expanded evidence changes the old paper's framing. Overall, 150 of 243 lower-scoring sides—61.7%—have no named-fallacy tag. But that rate is 80.8% in the earlier assessment process and only 14.5% in the later one. The archive-wide majority is real, yet it is not a stable rule of debate or of the current process.</p>
                <p>The deeper conclusion survives: a missing label is not a clean bill of health. Among 147 comparable untagged losses, 74.8% trail on five or six scoring dimensions. Conversely, a higher-scoring side carries a named-fallacy tag in 51 decisive assessments. The paper explains cumulative weaknesses, the changing use of labels, and why inspecting an unmet burden is more informative than merely counting familiar errors.</p>
                <dl>
                  <div>
                    <dt>Coverage</dt>
                    <dd>253 assessments · 5,492 moves</dd>
                  </div>
                  <div>
                    <dt>Losses without a fallacy tag</dt>
                    <dd>150 of 243 · 61.7%</dd>
                  </div>
                  <div>
                    <dt>Length and figures</dt>
                    <dd>13 pages · 4 figures</dd>
                  </div>
                </dl>
                <a class="button primary backend-report-link" href="/output/pdf/debates-are-usually-lost-without-a-named-fallacy.pdf?v=20260904-astra253-r2" type="application/pdf" target="_blank" rel="noopener">Read “Beyond the Fallacy Count”</a>
                <small>September 4 edition of “Debates Are Usually Lost Without a Named Fallacy.” Includes the process-level reversal, all four winner/loser tag patterns, cumulative dimension deficits, source-linked cases, and a worked example of a changing archive majority.</small>
              </article>
                </div>
              </section>

              <section class="backend-report-group" aria-labelledby="backend-report-measurement-heading">
                <div class="backend-report-group-heading">
                  <span>Part three</span>
                  <h3 id="backend-report-measurement-heading">Measurement reliability</h3>
                  <p>Whether assessment generations and public speaker rankings support direct comparison.</p>
                </div>
                <div class="backend-report-grid">
              <article class="backend-report-card">
                <span>Paper six · Measurement audit</span>
                <h4>Are All Slugfester Assessments on the Same Scale?</h4>
                <p>The earlier 179 assessments average 81.32 points per side; the later 58 average 78.51, a 2.82-point difference. Among 51 people assessed in both groups, 45 score lower later. The six scoring areas also move together more closely later. A new graph shows an important clue: earlier clarity marks use just four different values, while later marks use 41.</p>
                <p>The paper explains several possible reasons for these changes without claiming to have proved their cause. It proposes a practical next-assessment plan: shared test debates, clearer examples for each scoring area, mixed review batches, hidden old scores, repeated checks, and independent review of the source passages. It also explains why adding 2.82 points to every later score would not be a justified fix.</p>
                <dl>
                  <div>
                    <dt>Coverage</dt>
                    <dd>253 published · 237 comparable records</dd>
                  </div>
                  <div>
                    <dt>Locked move analysis</dt>
                    <dd>5,282 verified scored moves</dd>
                  </div>
                  <div>
                    <dt>Length and figures</dt>
                    <dd>17 pages · 6 figures</dd>
                  </div>
                </dl>
                <a class="button primary backend-report-link" href="/output/pdf/are-all-slugfester-assessments-on-the-same-scale.pdf?v=20260904-astra253-r2" type="application/pdf" target="_blank" rel="noopener">Read “Are All Slugfester Assessments on the Same Scale?”</a>
                <small>Plain-language September 4 edition. Includes six graphs, possible reasons why the marks move together, a check of which exact marks were used, and a detailed plan to reduce unfair early-versus-later differences in the next full assessment.</small>
              </article>

              <article class="backend-report-card">
                <span>Paper seven · Ranking reliability and uncertainty</span>
                <h4>Do Slugfester Rankings Measure Stable Performance?</h4>
                <p>The broad speaker order holds up better than the exact places. Among people with at least six appearances, dividing their records into two random halves produces fairly similar rankings: their typical order-agreement score is 0.86 on a scale where +1 means the same order. A simple five-name illustration explains this measure, called Spearman rank correlation. The typical score gap between neighboring averages is only 0.17 points.</p>
                <p><strong>Resampled ranks</strong> reuse each person's recorded scores. <strong>Model ranks</strong> also allow for the score variation seen across the wider group. Their typical range widths are 12 and 19 places. The paper explains each method, shows why neither guarantees a future rank, and walks through real rows for Joseph Schmid, Sean Carroll, and Matt Dillahunty before presenting all 50 eligible speakers. It also explains why the other speakers are not in that table.</p>
                <dl>
                  <div>
                    <dt>Coverage</dt>
                    <dd>237 debates · 474 appearances</dd>
                  </div>
                  <div>
                    <dt>Default ranked field</dt>
                    <dd>50 speakers · minimum 3</dd>
                  </div>
                  <div>
                    <dt>Length and figures</dt>
                    <dd>20 pages · 6 figures</dd>
                  </div>
                </dl>
                <a class="button primary backend-report-link" href="/output/pdf/do-slugfester-rankings-measure-stable-performance.pdf?v=20260904-astra253-r2" type="application/pdf" target="_blank" rel="noopener">Read “Do Slugfester Rankings Measure Stable Performance?”</a>
                <small>Plain-language September 4 edition. Includes six figures, an illustrated guide to rank correlation, clear definitions of every table column, three worked rows, and the complete 50-speaker table. Rank ranges describe calculations within this fixed group—not personal worth or guaranteed future performance.</small>
              </article>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  `);
}

function correctionReportUrl(debate = null) {
  const params = new URLSearchParams();
  if (debate?.id) params.set("debate", debate.id);
  const query = params.toString();
  return `${correctionsPath()}${query ? `?${query}` : ""}#report-scorecard-issue`;
}

function renderCorrections() {
  const params = new URLSearchParams(window.location.search);
  const reportSent = params.get("report") === "sent";
  const selectedDebate = debates.find((debate) => debate.id === params.get("debate"));
  const reportedPageUrl = selectedDebate
    ? absoluteUrl(debatePath(selectedDebate))
    : "";
  const reportSubject = selectedDebate
    ? `Slugfester scorecard issue: Debate ${selectedDebate.number}`
    : "Slugfester scorecard issue";
  setSeo(correctionsSeo());

  app.innerHTML = renderShell(`
    <main class="corrections-page">
      <section class="corrections-hero">
        <div>
          <p class="eyebrow">Accountability</p>
          <h1>Corrections & revisions</h1>
          <p class="corrections-lede">Slugfester assessments are intended to be transparent and revisable. If a score, quotation, speaker attribution, source link, or displayed calculation looks wrong, readers should have a direct way to flag it and see what changed afterward.</p>
        </div>
        <aside class="corrections-action-card">
          <span>Found a possible problem?</span>
          <strong>Send the exact page and evidence.</strong>
          <p>A private report goes directly to the site administrator for checking. Material corrections are recorded publicly below.</p>
          <a class="button primary" href="#report-scorecard-issue">Report a possible correction</a>
        </aside>
      </section>

      <section class="correction-report-section" id="report-scorecard-issue" aria-labelledby="correction-report-heading">
        <div class="correction-report-intro">
          <p class="eyebrow">Reader report</p>
          <h2 id="correction-report-heading">Report a possible scorecard issue</h2>
          <p>Identify the exact page and explain what appears incorrect. A timestamp, transcript passage, calculation, screenshot link, or other evidence will make the report easier to check.</p>
          ${selectedDebate ? `<p class="correction-report-context"><strong>Selected scorecard:</strong> Debate ${escapeHtml(selectedDebate.number)} · ${renderDebateTitle(selectedDebate)}</p>` : ""}
        </div>
        <div class="correction-report-card">
          ${reportSent ? '<p class="correction-report-success" role="status"><strong>Report sent.</strong> Thank you—the possible issue has been delivered for review.</p>' : ""}
          <form class="correction-report-form" action="https://formsubmit.co/44a747882839a1240511c0b4bca3bd95" method="post" accept-charset="UTF-8">
            <input type="hidden" name="_subject" value="${escapeHtml(reportSubject)}">
            <input type="hidden" name="_template" value="table">
            <input type="hidden" name="_next" value="https://slugfester.com/corrections/?report=sent#report-scorecard-issue">
            ${selectedDebate ? `<input type="hidden" name="debate_id" value="${escapeHtml(selectedDebate.id)}">` : ""}
            <label class="correction-report-honey" aria-hidden="true">
              Leave this field empty
              <input type="text" name="_honey" tabindex="-1" autocomplete="off">
            </label>

            <label for="reported-page-url">Scorecard page URL</label>
            <input id="reported-page-url" name="page_url" type="url" inputmode="url" autocomplete="url" placeholder="https://slugfester.com/debate/…" maxlength="500" value="${escapeHtml(reportedPageUrl)}" required>

            <label for="scorecard-issue-type">Type of issue</label>
            <select id="scorecard-issue-type" name="issue_type" required>
              <option value="" selected disabled>Select the closest category</option>
              <option>Displayed calculation or average</option>
              <option>Score or section weighting</option>
              <option>Quotation or transcript wording</option>
              <option>Speaker attribution</option>
              <option>Source or timestamp link</option>
              <option>Fallacy or bias label</option>
              <option>Other presentation or accessibility issue</option>
            </select>

            <label for="scorecard-observed-problem">What looks wrong?</label>
            <textarea id="scorecard-observed-problem" name="observed_problem" rows="5" maxlength="4000" placeholder="Identify the exact score, passage, label, link, or behavior in question." required></textarea>

            <label for="scorecard-supporting-evidence">Supporting evidence</label>
            <textarea id="scorecard-supporting-evidence" name="supporting_evidence" rows="5" maxlength="4000" placeholder="Include a timestamp, transcript passage, calculation, screenshot link, or source when possible." required></textarea>

            <label for="scorecard-suggested-correction">Suggested correction <span>(optional)</span></label>
            <textarea id="scorecard-suggested-correction" name="suggested_correction" rows="3" maxlength="2500" placeholder="Explain what you think the page should show and why."></textarea>

            <label for="scorecard-reporter-email">Your email address</label>
            <input id="scorecard-reporter-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" maxlength="254" required>

            <button class="button primary" type="submit">Send issue report</button>
          </form>
          <p class="correction-report-privacy">The report and your email are delivered privately to the site administrator through FormSubmit. Your email will be used only if clarification is needed. Any material correction will be summarized in the public revision log.</p>
        </div>
      </section>

      <section class="corrections-process" aria-labelledby="corrections-process-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Review standard</p>
            <h2 id="corrections-process-heading">What happens after a report</h2>
          </div>
          <p class="section-summary">Reports do not change scores automatically.</p>
        </div>
        <ol class="corrections-process-list">
          <li><span>01</span><div><strong>Reproduce the issue.</strong><p>The public page, source data, and relevant transcript passage are checked independently of the proposed fix.</p></div></li>
          <li><span>02</span><div><strong>Classify the change.</strong><p>Presentation and calculation defects can be corrected directly. A substantive reassessment must follow the published assessment process rather than silently changing a judgment.</p></div></li>
          <li><span>03</span><div><strong>Validate site-wide effects.</strong><p>Any change to shared calculations is checked across profiles, rankings, comparison graphs, topic summaries, and debate pages before release.</p></div></li>
          <li><span>04</span><div><strong>Record material revisions.</strong><p>Changes that affect interpretation, eligibility, attribution, or displayed scores are added to the public record below.</p></div></li>
        </ol>
      </section>

      <section class="revision-log" aria-labelledby="revision-log-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Public record</p>
            <h2 id="revision-log-heading">Recent material revisions</h2>
          </div>
          <p class="section-summary">This reader-facing log begins August 30, 2026. The complete technical history remains available in the linked changes.</p>
        </div>
        <ol class="revision-log-list">
          <li>
            <time datetime="2026-09-05">September 5, 2026</time>
            <div><h3>Form access, data freshness, and score context corrected</h3><p>Recommendation and correction forms now work after navigating from another page. Published code and debate data receive matching content versions to prevent older cached data from accompanying an updated page. Single-scorecard profiles no longer suggest established consistency, and the rubric chart now explains that score spread alone does not establish accuracy. The spring 2027 reassessment plan is consistent across the site. No assessment scores were changed.</p></div>
          </li>
          <li>
            <time datetime="2026-08-30">August 30, 2026</time>
            <div><h3>Team scores removed from individual records</h3><p>Shared scores from team and panel debates were separated from individual profiles, rankings, score distributions, and opponent records. Those appearances remain readable as team assessments.</p><a href="https://github.com/philstilwell/slugfester/commit/60545ad3c" target="_blank" rel="noopener noreferrer">Review the recorded change</a></div>
          </li>
          <li>
            <time datetime="2026-08-30">August 30, 2026</time>
            <div><h3>Opponent values clarified as matchup scores</h3><p>Profile opponent rows were clarified so the right-hand value is visibly the opponent's score in that meeting, or the average of those matchup scores across repeat meetings—not the opponent's overall profile average.</p><a href="https://github.com/philstilwell/slugfester/commit/86c96b1cc" target="_blank" rel="noopener noreferrer">Review the recorded change</a></div>
          </li>
          <li>
            <time datetime="2026-08-30">August 30, 2026</time>
            <div><h3>Average-score presentation audited</h3><p>Whole-number averages no longer display a misleading trailing decimal, profile dates now reflect their underlying records, and site-wide profile calculations were checked for consistent one-on-one eligibility.</p><a href="https://github.com/philstilwell/slugfester/commit/8dda5229f" target="_blank" rel="noopener noreferrer">Review the recorded change</a></div>
          </li>
        </ol>
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

function bindRankingControls(state) {
  const page = app.querySelector(".rankings-page");
  if (!page) return;

  page.querySelector(".ranking-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    navigateRankings({
      ...state,
      topic: form.get("topic") || "all",
      minimum: Number.parseInt(form.get("minimum"), 10),
      sort: form.get("sort") || "average"
    });
  });

  page.querySelector("[data-clear-rankings]")?.addEventListener("click", () => {
    navigateRankings({
      ...state,
      topic: "all",
      minimum: MIN_RANKED_DEBATE_APPEARANCES,
      sort: "average"
    });
  });

  page.querySelector(".ranking-comparison-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    navigateRankings({
      ...state,
      comparisonA: form.get("comparison-a") || "",
      comparisonB: form.get("comparison-b") || ""
    });
  });

  page.querySelector("[data-clear-comparison]")?.addEventListener("click", () => {
    navigateRankings({ ...state, comparisonA: "", comparisonB: "" });
  });
}

function renderDebate(id, loadedDebate = null) {
  const debate = loadedDebate || debates.find((item) => item.id === id);

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

  renderDebateObject(debate);
}

function renderDebateObject(
  debate,
  { calibrationPreview = false, publicationStagingPreview = false } = {}
) {
  const preview = calibrationPreview || publicationStagingPreview;
  const seo = debateSeo(debate, {
    pro: avatarsForSpeakerText(debate.sides.pro.speaker),
    con: avatarsForSpeakerText(debate.sides.con.speaker)
  });
  setSeo(preview
    ? {
        ...seo,
        canonicalPath: null,
        jsonLd: null,
        robots: "noindex,nofollow",
        title: `${calibrationPreview ? "[Calibration preview]" : "[Publication staging preview]"} ${seo.title}`
      }
    : seo);

  const sectionScores = debate.sections.flatMap((section) => [
    section.score.pro,
    section.score.con
  ]);

  app.innerHTML = renderShell(`
    <main class="debate-page"${calibrationPreview ? ' data-calibration-preview="true"' : publicationStagingPreview ? ' data-publication-staging-preview="true"' : ""}>
      <section class="debate-hero">
        <div>
          <a class="back-link" href="/">Back to debates</a>
          ${calibrationPreview ? '<p class="source-note calibration-preview-note"><strong>Calibration preview:</strong> recovered diagnostic output only. This scorecard is excluded from production data and rankings.</p>' : ""}
          ${publicationStagingPreview ? '<p class="source-note calibration-preview-note"><strong>Publication staging preview:</strong> validated canary candidate only. This scorecard remains excluded from production data and rankings pending rendering and mutation authorization.</p>' : ""}
          <p class="eyebrow">${escapeHtml(debateNumberLabel(debate))} · ${escapeHtml(debate.label)} · Last rendered: ${escapeHtml(debate.date)}</p>
          <h1>${renderDebateTitle(debate)}</h1>
          <p class="motion large">${escapeHtml(debate.motion)}</p>
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
          <a class="button secondary" href="${escapeHtml(debate.youtubeUrl)}" target="_blank" rel="noopener noreferrer">Open YouTube source</a>
          ${preview ? "" : `<a class="scorecard-correction-link" href="${escapeHtml(correctionReportUrl(debate))}" data-document-navigation>Report a possible scorecard issue</a>`}
        </aside>
      </section>

      ${renderAssessmentGuide(debate)}
      ${renderQuoteCards(debate)}
      ${renderScoringNote(debate)}
      ${renderInteractionGuide()}

      <section class="columns-head" aria-label="Debate sides">
        ${renderSideHeading(debate.sides.pro, "teal")}
        ${renderSideHeading(debate.sides.con, "coral")}
      </section>

      ${renderDebateScoreProfileGrid(debate)}

      ${debate.sections.map((section, index) => renderSection(section, debate, index)).join("")}
      ${renderOverall(debate)}
      ${renderLogicalExtension(debate)}
      ${preview ? "" : renderRelatedDebates(debate)}
    </main>
  `);
}

export function renderCalibrationDebate(debate) {
  renderDebateObject(debate, { calibrationPreview: true });
}

function renderAssessmentGuide(debate) {
  const guide = assessmentGuide(debate);
  const outcome = guide.higherSide
    ? `The published overall scores favor ${debate.sides[guide.higherSide].speaker} by ${Number(guide.gap.toFixed(1))} ${guide.gap === 1 ? "point" : "points"}.`
    : "The published overall scores are tied.";
  return `<section class="assessment-guide" aria-labelledby="assessment-guide-heading">
    <p class="eyebrow">The assessment in brief</p>
    <h2 id="assessment-guide-heading">What decided this assessment?</h2>
    <p class="assessment-guide-summary">${escapeHtml(guide.summary)}</p>
    <p>${escapeHtml(outcome)} <a href="#overall-heading">Read the full overall commentary</a>.</p>
    <div class="assessment-guide-grid">${guide.sides.map((side) => `<article class="assessment-guide-side ${side.key === "pro" ? "teal" : "coral"}">
      <h3>${escapeHtml(side.speaker)}</h3>
      ${side.strongest ? `<p class="eyebrow">A highest-scoring contribution · ${side.strongest.argument.score}/100</p>
      <p>${escapeHtml(side.strongest.argument.words)}</p>
      <a href="#${debateSectionAnchor(side.strongest.sectionIndex)}">Read the exchange and critique</a> · ${renderTimestampLink(side.strongest.argument.time, debate.youtubeUrl, `Watch ${side.speaker}'s contribution at ${side.strongest.argument.time}`)}` : ""}
      ${side.strength ? `<p><strong>${side.strengthIsMove ? "Why this contribution scored well." : "A strength in the overall assessment."}</strong> ${escapeHtml(side.strength)}</p>` : ""}
      ${side.limitation ? `<p><strong>A key limitation in the overall assessment.</strong> ${escapeHtml(side.limitation)}</p>` : ""}
    </article>`).join("")}</div>
    <p class="source-note">Drawn from this scorecard’s existing summary, critiques and overall commentary—not a new judgment. The highlighted contributions illustrate strengths; they do not alone determine the overall scores. Ties between moves use the first displayed example. Shared-side assessments describe the side, not each participant individually.</p>
  </section>`;
}

function renderRelatedDebates(debate) {
  const related = relatedDebates(debate, debateSummaries, uniqueInterlocutorsForDebate);
  if (!related.length) return "";
  return `<section class="related-debates" aria-labelledby="related-debates-heading">
    <p class="eyebrow">Keep exploring</p>
    <h2 id="related-debates-heading">Related debates</h2>
    <p>Follow the question further, or hear a familiar interlocutor in a different exchange. Suggestions reflect topics and participants, not an endorsement of a position.</p>
    <div class="related-debate-grid">${related.map((item) => `<div class="related-debate-item">
      <h3>${escapeHtml(item.label)}</h3><p class="related-debate-reason">${escapeHtml(item.reason)}</p>
      ${renderRecentAssessmentCard(item.debate)}
    </div>`).join("")}</div>
  </section>`;
}

export function renderPublicationStagingDebate(debate) {
  renderDebateObject(debate, { publicationStagingPreview: true });
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
    <span class="speaker-avatar-stack" aria-label="Interlocutor profiles">
      ${avatars
        .map(
          (avatar) => `
            <a class="speaker-avatar-link" href="${escapeHtml(interlocutorPath(avatar))}" aria-label="Open ${escapeHtml(avatar.name)}'s interlocutor profile" title="${escapeHtml(avatar.name)}">
              <img
                class="speaker-avatar"
                src="${escapeHtml(avatar.src)}"
                alt=""
                width="512"
                height="512"
                loading="lazy"
                decoding="async"
              >
            </a>
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
  const model = assessmentModelFor(debate);
  const rubric = debate.assessmentRubric
    ? ` — Rubric: ${escapeHtml(debate.assessmentRubric)}.`
    : "";

  return `
    <section class="scoring-note" aria-label="Scoring note">
      <strong>AI-generated scorecard</strong>
      <span>Scores are AI-generated estimates of argumentative performance.</span>
      <span class="assessment-model">Assessments made by ${escapeHtml(model)}.${rubric}</span>
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

function renderDebateScoreProfileGrid(debate) {
  const profilesByName = new Map(
    rankedInterlocutors({ topic: "all", minimum: 1, sort: "name" }).map((person) => [person.name, person])
  );
  const proHistories = debateScoreHistoriesForSide(debate.sides.pro, profilesByName);
  const conHistories = debateScoreHistoriesForSide(debate.sides.con, profilesByName);
  const proHistory = proHistories.length === 1 ? proHistories : [];
  const conHistory = conHistories.length === 1 ? conHistories : [];
  if (!proHistories.length && !conHistories.length) return "";

  const maximumBandCount = Math.max(
    1,
    ...[...proHistory, ...conHistory]
      .map((history) => history.distribution?.maximumBandCount || 0)
  );

  return `
    <section class="debate-score-profile-grid" aria-label="Interlocutor score profiles">
      <div class="debate-score-profile-slot">${
        proHistory.length
          ? renderDebateScoreHistories(proHistory, maximumBandCount, "teal")
          : renderMultiInterlocutorRecordNote(proHistories, "teal")
      }</div>
      <div class="debate-score-profile-slot">${
        conHistory.length
          ? renderDebateScoreHistories(conHistory, maximumBandCount, "coral")
          : renderMultiInterlocutorRecordNote(conHistories, "coral")
      }</div>
    </section>
  `;
}

function renderMultiInterlocutorRecordNote(histories, tone) {
  if (histories.length <= 1) return "";

  return `
    <p class="debate-multi-interlocutor-note ${escapeHtml(tone)}">
      <strong>Individual records</strong>
      <span>Click a specific avatar above to view that interlocutor’s individual record.</span>
    </p>
  `;
}

function debateScoreHistoriesForSide(side, profilesByName) {
  const interlocutors = [
    ...new Map(
      avatarsForSpeakerText(side.speaker).map((avatar) => [avatar.name, avatar])
    ).values()
  ];

  return interlocutors.map((avatar) => {
    const person = profilesByName.get(avatar.name);
    return {
      person: person || avatar,
      appearances: person?.appearances || 0,
      distribution: person ? profileScoreDistribution(person.records) : null
    };
  });
}

function renderDebateScoreHistories(histories, maximumBandCount, tone) {
  if (!histories.length) return "";

  return `
    <div class="debate-score-profiles ${escapeHtml(tone)}">
      ${histories
        .map(
          ({ person, appearances, distribution }) => `
            <section class="debate-score-profile">
              <div class="debate-score-profile-heading">
                <h3><a href="${escapeHtml(interlocutorPath(person))}">${escapeHtml(person.name)}</a></h3>
                <span>${appearances} eligible 1-on-1 ${appearances === 1 ? "scorecard" : "scorecards"}</span>
              </div>
              ${
                distribution
                  ? renderScoreHistogram(
                      { ...distribution, maximumBandCount },
                      {
                        className: "debate-score-histogram",
                        ariaLabel: `${person.name} published 1-on-1 overall score distribution from 50 to 100`,
                        caption: "Published 1-on-1 overall scores in five-point ranges. Every graph on this page uses the same vertical scale."
                      }
                    )
                  : '<p class="debate-score-empty">No eligible 1-on-1 scorecards yet.</p>'
              }
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderQuoteCard(side, quote, tone) {
  if (!quote) return "";

  return `
    <article class="quote-card ${tone}">
      <span class="quote-side">${escapeHtml(side.name)} · ${escapeHtml(side.speaker)}</span>
      <blockquote>"${escapeHtml(quote.text)}"</blockquote>
      <p>${escapeHtml(quote.context)}</p>
      <span class="quote-card-mark" aria-hidden="true">"</span>
    </article>
  `;
}

function renderSection(section, debate, index = 0) {
  return `
    <section class="debate-section" id="${debateSectionAnchor(index)}">
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
  if (!argument) return "";

  return `
    <article class="argument ${tone} side-${sideKey}">
      <div class="argument-meta">
        <span>${renderTimestampLink(argument.time, debate.youtubeUrl, `Open YouTube source at ${argument.time}`)}</span>
        <span>${escapeHtml(argument.role)}</span>
        <strong class="${scoreTone(argument.score)}">${argument.score}</strong>
      </div>
      <p>${escapeHtml(argument.words)}</p>
      <div class="argument-footer">
        ${renderCritique(argument, debate, section, sideKey)}
        ${renderTags(argument.tags, debate, section, sideKey, argument)}
      </div>
    </article>
  `;
}

function renderTimestampLink(label, youtubeUrl, ariaLabel) {
  const href = timestampedYouTubeUrl(youtubeUrl, label);

  return `
    <a class="timestamp-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(ariaLabel)}">
      ${escapeHtml(label)}
    </a>
  `;
}

function argumentHelpId(prefix, debate, section, sideKey, argument) {
  return [prefix, debate.id, sideKey, section.title, argument.time, argument.role]
    .map(anchorSlug)
    .filter(Boolean)
    .join("-");
}

function renderCritique(argument, debate, section, sideKey) {
  const tooltipId = argumentHelpId("critique", debate, section, sideKey, argument);

  return `
    <span class="critique">
      <button type="button" aria-label="Critique for ${escapeHtml(argument.role)}" aria-describedby="${escapeHtml(tooltipId)}">◉</button>
      <span class="critique-popover" id="${escapeHtml(tooltipId)}" role="tooltip">
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
  const tooltipId = `tag-help-${occurrenceId}`;

  return `
    <span class="tag-wrap">
      <a class="tag ${escapeHtml(tag.type)}" href="${escapeHtml(localHref)}" aria-describedby="${escapeHtml(tooltipId)}">
        ${escapeHtml(tag.label)}
      </a>
      <span class="tag-popover" id="${escapeHtml(tooltipId)}" role="tooltip">
        <strong>${escapeHtml(tag.label)}</strong>
        <em>${category}</em>
        ${definition ? `<span>${escapeHtml(definition.definition)}</span>` : ""}
        <span class="tag-context">${escapeHtml(tag.context)}</span>
        <span class="tag-popover-note">Open the reference page for more.</span>
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
      <h3>Landed</h3>
      <ul>
        ${overall.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
      <h3>Whiffed</h3>
      <ul>
        ${overall.blunders.map((blunder) => renderBlunder(blunder, debateId)).join("")}
      </ul>
    </article>
  `;
}

function renderLogicalExtension(debate) {
  if (!debate.logicalExtension) return "";

  return `
    <section class="logical-extension" aria-labelledby="ai-contribution-heading">
      <div class="section-heading logical-extension-heading">
        <div>
          <p class="eyebrow">AI contribution</p>
          <h2 id="ai-contribution-heading">AI Contribution</h2>
        </div>
        <p class="section-summary">An AI-generated steelman of where each case could go next.</p>
      </div>
      <details class="ai-extension-accordion">
        <summary>
          <span>
            <strong>Explore the AI-generated arguments</strong>
            <small>Strengthened final arguments and new reinforcements for both sides</small>
          </span>
          <i aria-hidden="true"></i>
        </summary>
        <div class="ai-extension-accordion-content">
          <p class="logical-extension-intro">
            This section is an AI-generated contribution for Slugfester—not a transcript summary, a quotation, or a claim that any speaker made these arguments in this form. The AI independently extends and strengthens both positions against the clearest objections raised in the exchange. It does not affect the debate scores.
          </p>
          <div class="logical-extension-grid">
            ${renderLogicalExtensionSide(debate.sides.pro, debate.logicalExtension.pro, "teal")}
            ${renderLogicalExtensionSide(debate.sides.con, debate.logicalExtension.con, "coral")}
          </div>
        </div>
      </details>
    </section>
  `;
}

function renderLogicalExtensionSide(side, extension, tone) {
  const finalArgument = extension.finalArgument;

  return `
    <article class="logical-extension-side ${tone}">
      <header class="logical-extension-side-heading">
        <span>${escapeHtml(side.name)}</span>
        <h3>${escapeHtml(side.speaker)}</h3>
      </header>

      <section class="extended-final-argument">
        <p class="extension-label">Strengthened final argument</p>
        <p class="extension-thesis">${escapeHtml(finalArgument.thesis)}</p>
        <ol class="extension-premises">
          ${finalArgument.premises
            .map(
              (premise, index) => `
                <li>
                  <span>Premise ${index + 1}</span>
                  <p>${escapeHtml(premise)}</p>
                </li>
              `
            )
            .join("")}
        </ol>
        <div class="extension-conclusion">
          <span>Conclusion</span>
          <p>${escapeHtml(finalArgument.conclusion)}</p>
        </div>
      </section>

      <section class="new-arguments">
        <h4>New reinforcing arguments</h4>
        <div class="new-argument-list">
          ${extension.newArguments
            .map(
              (argument) => `
                <article class="new-argument">
                  <h5>${escapeHtml(argument.title)}</h5>
                  <p>${escapeHtml(argument.text)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    </article>
  `;
}

function renderBlunder(blunder, debateId) {
  const links = blunder.links
    .map(
      (link) => {
        const href = referenceHref(link.url, debateId);
        const isInternal = href.startsWith("/") || href.startsWith("#/");
        const target = isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
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
  const hashOccurrenceId = referenceOccurrenceFromHash();
  const linkedAppearanceIndex = hashOccurrenceId
    ? appearances.findIndex((appearance) => referenceOccurrenceId(appearance) === hashOccurrenceId)
    : -1;
  const requestedPage = linkedAppearanceIndex >= 0
    ? Math.floor(linkedAppearanceIndex / REFERENCE_CONTEXT_PAGE_SIZE) + 1
    : positivePage(new URLSearchParams(window.location.search).get("page"));
  const appearancePager = paginatedItems(
    appearances,
    REFERENCE_CONTEXT_PAGE_SIZE,
    requestedPage
  );

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
          <a class="button primary" href="${escapeHtml(reference.externalUrl)}" target="_blank" rel="noopener noreferrer">
            Read the in-depth ${source} entry
          </a>
        </div>
      </section>
      ${
        appearances.length
          ? `
            <section class="reference-contexts" aria-labelledby="reference-contexts-heading">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Debate context</p>
                  <h2 id="reference-contexts-heading">Why this label appears here</h2>
                </div>
                <p class="section-summary">${appearances.length} transcript-grounded occurrence${appearances.length === 1 ? "" : "s"}.</p>
              </div>
              ${renderPagination({
                hrefForPage: (page) => referencePageUrl(type, slug, sourceDebateId, page),
                itemLabel: "occurrences",
                label: `${reference.label} debate contexts`,
                pager: appearancePager,
                position: "above results"
              })}
              <div class="reference-context-list">
                ${appearancePager.items.map(renderReferenceAppearance).join("")}
              </div>
              ${renderPagination({
                hrefForPage: (page) => referencePageUrl(type, slug, sourceDebateId, page),
                itemLabel: "occurrences",
                label: `${reference.label} debate contexts`,
                pager: appearancePager,
                position: "below results"
              })}
            </section>
          `
          : ""
      }
    </main>
  `);
}

function referenceOccurrenceFromHash() {
  if (!window.location.hash || window.location.hash.startsWith("#/")) return "";

  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "";
  }
}

function referencePageUrl(type, slug, sourceDebateId, page) {
  const params = new URLSearchParams();
  if (sourceDebateId) params.set("debate", sourceDebateId);
  if (page > 1) params.set("page", page);
  const query = params.toString();

  return `${referencePath(type, slug)}${query ? `?${query}` : ""}`;
}

function findSourceDebate(sourceDebateId, appearances) {
  const explicitDebate = debates.find((debate) => debate.id === sourceDebateId);
  if (explicitDebate) return explicitDebate;

  const uniqueDebates = [...new Map(appearances.map((appearance) => [appearance.debate.id, appearance.debate])).values()];
  return uniqueDebates.length === 1 ? uniqueDebates[0] : null;
}

function collectReferenceAppearances(type, slug) {
  return referenceAppearanceCache.get(`${type}/${slug}`) || [];
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
        <a href="${escapeHtml(debateHref)}">Open debate scorecard: ${escapeHtml(debateNumberLabel(appearance.debate))} · ${renderDebateTitle(appearance.debate)}</a>
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

function renderRouteLoading() {
  app.innerHTML = renderShell(`
    <main class="route-loading" aria-live="polite" aria-busy="true">
      <span class="route-loading-mark" aria-hidden="true">◉</span>
      <p>Loading scorecard data…</p>
    </main>
  `);
}

async function route({ focusMain = false } = {}) {
  const sequence = ++routeSequence;
  const hash = window.location.hash;
  const debateMatch =
    hash.match(debateHashRoutePattern) || window.location.pathname.match(debatePathRoutePattern);
  const searchMatch =
    hash.match(searchHashRoutePattern) || window.location.pathname.match(searchPathRoutePattern);
  const topicsMatch =
    hash.match(topicsHashRoutePattern) || window.location.pathname.match(topicsPathRoutePattern);
  const rankingsMatch =
    hash.match(rankingsHashRoutePattern) || window.location.pathname.match(rankingsPathRoutePattern);
  const interlocutorMatch =
    hash.match(interlocutorHashRoutePattern) || window.location.pathname.match(interlocutorPathRoutePattern);
  const backendMatch =
    hash.match(backendHashRoutePattern) ||
    window.location.pathname.match(backendPathRoutePattern) ||
    hash.match(assessmentHashRoutePattern) ||
    window.location.pathname.match(assessmentPathRoutePattern);
  const correctionsMatch = window.location.pathname.match(correctionsPathRoutePattern);
  const insightsMatch = window.location.pathname.match(insightsPathRoutePattern);
  const referenceMatch =
    hash.match(referenceHashRoutePattern) ||
    window.location.pathname.match(referencePathRoutePattern);
  const debateId = debateMatch ? decodeURIComponent(debateMatch[1]) : "";
  const knownDebate = debateId
    ? debateSummaries.some((debate) => debate.id === debateId)
    : false;
  const referenceType = referenceMatch?.[1] || "";
  const referenceSlug = referenceMatch?.[2] || "";
  const knownReference = referenceMatch
    ? Boolean(getReferenceDefinition(referenceType, referenceSlug))
    : false;
  const needsAnalytics = Boolean(
    rankingsMatch || interlocutorMatch || backendMatch || (debateMatch && knownDebate)
  );
  const loaders = [];

  if (interlocutorMatch && !biographies) {
    biographiesPromise ||= import("./data/interlocutor-bios.js?v=1be9d9ce36406053")
      .then((module) => { biographies = module; })
      .catch((error) => { biographiesPromise = undefined; throw error; });
    loaders.push(biographiesPromise);
  }

  if (insightsMatch && window.location.pathname.includes("/data-and-methods") && !insightsMethodsContent) {
    insightsMethodsPromise ||= import("./data/insights-methods.js?v=1be9d9ce36406053")
      .then((module) => { insightsMethodsContent = module.renderInsightsMethodsContent; })
      .catch((error) => { insightsMethodsPromise = undefined; throw error; });
    loaders.push(insightsMethodsPromise);
  }

  if (insightsMatch && !insightsContent) {
    insightsPromise ||= import("./data/insights.js?v=1be9d9ce36406053")
      .then((module) => { insightsContent = module.renderInsightsContent; })
      .catch((error) => { insightsPromise = undefined; throw error; });
    loaders.push(insightsPromise);
  }

  if (needsAnalytics && debates === debateSummaries) {
    loaders.push(loadDebateAnalytics());
  }
  if (backendMatch && !sectionScoreExtremes.top.length) {
    loaders.push(loadSectionScoreExtremes());
  }
  if (debateMatch && knownDebate) {
    loaders.push(loadDebateDetail(debateId));
  }
  if (referenceMatch && knownReference) {
    loaders.push(loadReferenceAppearances(referenceType, referenceSlug));
  }

  let loadedData = [];
  if (loaders.length) {
    renderRouteLoading();

    try {
      loadedData = await Promise.all(loaders);
    } catch {
      if (sequence !== routeSequence) return;
      app.innerHTML = renderShell(`
        <main class="not-found">
          <p class="eyebrow">Data unavailable</p>
          <h1>The scorecards could not load.</h1>
          <p>Please check your connection and try again.</p>
          <a class="button primary" href="${escapeHtml(window.location.href)}">Retry</a>
        </main>
      `);
      return;
    }

    if (sequence !== routeSequence) return;
  }

  if (debateMatch) {
    const loadedDebate = loadedData.find((value) => value?.id === debateId) || null;
    renderDebate(debateId, loadedDebate);
  } else if (searchMatch) {
    renderSearch();
  } else if (topicsMatch) {
    renderTopics();
  } else if (rankingsMatch) {
    renderRankings();
  } else if (interlocutorMatch) {
    renderInterlocutorProfile(decodeURIComponent(interlocutorMatch[1]));
  } else if (insightsMatch) {
    renderInsights();
  } else if (backendMatch) {
    renderBackend();
  } else if (correctionsMatch) {
    renderCorrections();
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

  if (focusMain && !window.location.hash) {
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }
  scrollToHashTargetAfterRender();
}

function shouldHandleInternally(link) {
  if (
    link.target ||
    link.hasAttribute("download") ||
    link.hasAttribute("data-document-navigation")
  ) return false;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (
    url.hash &&
    !url.pathname.match(debatePathRoutePattern) &&
    !url.pathname.match(searchPathRoutePattern) &&
    !url.pathname.match(topicsPathRoutePattern) &&
    !url.pathname.match(rankingsPathRoutePattern) &&
    !url.pathname.match(interlocutorPathRoutePattern) &&
    !url.pathname.match(backendPathRoutePattern) &&
    !url.pathname.match(insightsPathRoutePattern) &&
    !url.pathname.match(correctionsPathRoutePattern) &&
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
    rankingsPathRoutePattern.test(url.pathname) ||
    interlocutorPathRoutePattern.test(url.pathname) ||
    backendPathRoutePattern.test(url.pathname) ||
    insightsPathRoutePattern.test(url.pathname) ||
    correctionsPathRoutePattern.test(url.pathname) ||
    assessmentPathRoutePattern.test(url.pathname) ||
    referencePathRoutePattern.test(url.pathname)
  );
}

function setExternalSitesOpen(menu, open) {
  const links = menu.querySelector(".external-sites-links");
  menu.querySelector(".external-sites-label").setAttribute("aria-expanded", String(open));
  links.hidden = !open;
  if (open) {
    links.style.right = "0px";
    const bounds = links.getBoundingClientRect();
    const offset = bounds.left < 16
      ? bounds.left - 16
      : Math.max(0, bounds.right - document.documentElement.clientWidth + 16);
    links.style.right = `${offset}px`;
  }
}

window.addEventListener("resize", () => {
  const menu = document.querySelector(".external-sites");
  if (menu) setExternalSitesOpen(menu, false);
});

document.addEventListener("pointerover", (event) => {
  const menu = event.target.closest?.(".external-sites");
  if (event.pointerType !== "mouse" || !menu || menu.contains(event.relatedTarget)) return;
  setExternalSitesOpen(menu, true);
});

document.addEventListener("pointerout", (event) => {
  const menu = event.target.closest?.(".external-sites");
  if (event.pointerType !== "mouse" || !menu || menu.contains(event.relatedTarget)) return;
  if (!menu.querySelector(".external-sites-links").contains(document.activeElement)) {
    setExternalSitesOpen(menu, false);
  }
});

document.addEventListener("focusout", (event) => {
  const menu = event.target.closest?.(".external-sites");
  if (menu && !menu.contains(event.relatedTarget)) setExternalSitesOpen(menu, false);
});

document.addEventListener("keydown", (event) => {
  const menu = document.querySelector(".external-sites");
  if (event.key !== "Escape" || !menu || menu.querySelector(".external-sites-links").hidden) return;
  setExternalSitesOpen(menu, false);
  if (menu.contains(document.activeElement)) menu.querySelector(".external-sites-label").focus();
});

document.addEventListener("click", (event) => {
  const menu = document.querySelector(".external-sites");
  const trigger = event.target.closest?.(".external-sites-label");
  if (menu && trigger) {
    setExternalSitesOpen(menu, trigger.getAttribute("aria-expanded") !== "true");
    return;
  }
  if (menu && !menu.contains(event.target)) setExternalSitesOpen(menu, false);

  const link = event.target.closest("a");
  if (link?.matches(".skip-link")) {
    event.preventDefault();
    const main = document.getElementById("main-content");
    if (!main) return;

    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start" });
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${window.location.search}#main-content`
    );
    return;
  }
  if (!link || !shouldHandleInternally(link)) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();

  const url = new URL(link.href, window.location.href);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.pushState({}, "", next);
  }
  void route({ focusMain: true });
  window.scrollTo(0, 0);
});

window.addEventListener("hashchange", route);
window.addEventListener("popstate", () => void route({ focusMain: true }));
void route();
