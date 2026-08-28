import { readFile } from "node:fs/promises";

const [app, styles] = await Promise.all([
  readFile(new URL("../src/app.js", import.meta.url), "utf8"),
  readFile(new URL("../src/styles.css", import.meta.url), "utf8")
]);

const errors = [];

function requireIncludes(label, source, expected) {
  if (!source.includes(expected)) {
    errors.push(`${label}: expected to include ${JSON.stringify(expected)}`);
  }
}

function requireExcludes(label, source, forbidden) {
  if (source.includes(forbidden)) {
    errors.push(`${label}: must not include ${JSON.stringify(forbidden)}`);
  }
}

requireIncludes("app debate hero", app, 'class="debate-gloves-panel"');
requireIncludes("app debate hero", app, 'src="/assets/debate-gloves.png"');
requireIncludes("app sticky header", app, 'class="brand-logo" src="/assets/debate-gloves.png"');
requireIncludes("app sticky header", app, 'class="external-sites"');
requireIncludes("app sticky header", app, "External Sites");
requireIncludes("app sticky header", app, 'class="primary-nav-link');
requireIncludes("app sticky header", app, 'aria-current="page"');
requireIncludes("app sticky header", app, "Search");
requireIncludes("app sticky header", app, "Topics");
requireIncludes("app sticky header", app, "Rankings");
requireIncludes("app sticky header", app, "Backend");
requireIncludes("app sticky header", app, 'class="external-site-popover"');
requireIncludes("app sticky header", app, 'aria-describedby="logfall-menu-popover"');
requireIncludes("app sticky header", app, 'aria-describedby="cogbias-menu-popover"');
requireIncludes("app landing hero", app, 'class="logo-showcase"');
requireIncludes("app landing hero", app, 'src="/assets/slugfester-logo.jpg"');
requireIncludes("app landing actions", app, 'class="landing-actions"');
requireIncludes("app landing summary", app, 'class="landing-stats"');
requireIncludes("app landing topics", app, "Browse all debates by topic");
requireIncludes("app pagination", app, "const LANDING_PAGE_SIZE = 18");
requireIncludes("app pagination", app, "const SEARCH_PAGE_SIZE = 24");
requireIncludes("app pagination", app, "renderPagination");
requireIncludes("app pagination", app, 'class="pagination"');
requireIncludes("app pagination", app, "const landingPager = paginatedItems");
requireIncludes("app pagination", app, "pager: landingPager");
requireIncludes("app landing cards", app, 'class="debate-title-link"');
requireIncludes("app landing cards", app, 'class="card-interlocutor"');
requireIncludes("app search route", app, "renderSearch");
requireIncludes("app search route", app, "searchPathRoutePattern");
requireIncludes("app search route", app, "searchSeo");
requireIncludes("app search route", app, "searchMatchesLabel");
requireIncludes("app search route", app, "Matches:");
requireIncludes("app topics route", app, "renderTopics");
requireIncludes("app topics route", app, "topicsPathRoutePattern");
requireIncludes("app topics route", app, "topicsSeo");
requireIncludes("app topics route", app, "debate.topicCategory");
requireIncludes("app rankings route", app, "renderRankings");
requireIncludes("app rankings route", app, "rankingsPathRoutePattern");
requireIncludes("app rankings route", app, "rankingsSeo");
requireIncludes("app interlocutor route", app, "interlocutorPathRoutePattern");
requireIncludes("app interlocutor route", app, "renderInterlocutorProfile");
requireIncludes("app interlocutor route", app, "interlocutorSeo");
requireIncludes("app rankings page", app, 'class="ranking-list"');
requireIncludes("app rankings page", app, "MIN_RANKED_DEBATE_APPEARANCES = 3");
requireIncludes("app rankings page", app, "rankedInterlocutors");
requireIncludes("app rankings page", app, "rankingState");
requireIncludes("app rankings page", app, "rankingDebates");
requireIncludes("app rankings page", app, 'class="ranking-tool"');
requireIncludes("app rankings page", app, 'class="ranking-topic"');
requireIncludes("app rankings page", app, 'class="ranking-method"');
requireIncludes("app rankings analytics", app, "reasoningTagDistribution");
requireIncludes("app rankings analytics", app, 'class="reasoning-distribution"');
requireExcludes("app rankings analytics", app, "data-reasoning-topic-select");
requireIncludes("app rankings analytics", app, "rankingTagSummary");
requireIncludes("app rankings analytics", app, 'class="ranking-tag-bars"');
requireIncludes("app rankings analytics", app, 'class="ranking-comparison"');
requireIncludes("app rankings analytics", app, 'class="sample-confidence');
requireIncludes("app interlocutor profile", app, 'class="interlocutor-profile-page"');
requireIncludes("app interlocutor profile", app, 'class="profile-score-bands"');
requireIncludes("app interlocutor profile", app, 'class="profile-debate-grid"');
requireIncludes("app topics page", app, 'class="topic-debate-card"');
requireIncludes("app topics page", app, 'class="topic-card-people"');
requireIncludes("app topics page", app, 'class="topic-card-reveal"');
requireIncludes("app topics page", app, "Debate summary and speakers");
requireIncludes("app topics page", app, "Speakers");
requireIncludes("app topics page", app, "topicCategoriesForDebate");
requireIncludes("app topics categories", app, "Cosmological & Contingency Arguments");
requireIncludes("app topics categories", app, "Science and design");
requireIncludes("app topics categories", app, "Meaning and purpose");
requireIncludes("app topics categories", app, "Morality and ethics");
requireExcludes("app topics categories", app, "Science, cosmology, and design");
requireExcludes("app topics categories", app, "Morality, ethics, and meaning");
requireIncludes("app backend route", app, "renderBackend");
requireIncludes("app backend route", app, "backendPathRoutePattern");
requireIncludes("app backend route", app, "assessmentPathRoutePattern");
requireIncludes("app backend route", app, "backendSeo");
requireIncludes("app backend page", app, "<h1>Backend</h1>");
requireIncludes("app backend page", app, "Account personalization and private conversation history are not inputs");
requireIncludes("app search filters", app, 'class="person-filter');
requireIncludes("app search filters", app, 'class="filter-section filter-accordion"');
requireIncludes("app search filters", app, "Interlocutor filters");
requireExcludes("app search filters", app, 'class="topic-filter');
requireExcludes("app search filters", app, "renderTopicFilter");
requireIncludes("app debate numbering", app, "debate.number");
requireIncludes("app debate numbering", app, "debateNumberLabel");
requireIncludes("app debate numbering", app, 'class="debate-number"');
requireIncludes("app scorecard", app, "Open YouTube source");
requireIncludes("app scorecard", app, "GPT 5.5 Extra High");
requireIncludes("app scorecard", app, "5.6 Terra Extra High");
requireIncludes("app scorecard", app, "assessmentModelFor");
requireExcludes("app public source provenance", app, "debate.sourceNote");
requireExcludes("app public scoring provenance", app, "debate.scoringNote");
requireIncludes("app overall commentary", app, "Landed");
requireIncludes("app overall commentary", app, "Whiffed");
requireIncludes("app scorecard", app, 'class="assessment-model"');
requireIncludes("app timestamp links", app, "timestampedYouTubeUrl");
requireIncludes("app timestamp links", app, 'class="timestamp-link"');
requireIncludes("app timestamp links", app, "renderTimestampLink(section.timebox");
requireIncludes("app timestamp links", app, "renderTimestampLink(argument.time");
requireIncludes("app guide", app, "◉ Deeper critiques");
requireIncludes("app argument columns", app, "side-${sideKey}");
requireExcludes("app argument placeholders", app, 'class="argument empty"');
requireIncludes("app Debate 14 AI color sample", app, "logical-extension-editorial-blue");
requireIncludes("app reference route", app, "referencePathRoutePattern");
requireIncludes("app reference route", app, "Why this label appears here");
requireIncludes("app reference route", app, "Back to this debate");
requireIncludes("app reference route", app, "reference-debate-link");
requireIncludes("app reference route", app, "Open debate scorecard");
requireIncludes("app reference route", app, "REFERENCE_CONTEXT_PAGE_SIZE = 16");
requireIncludes("app reference route", app, "referencePageUrl");
requireIncludes("app tag links", app, "referenceOccurrenceId");
requireIncludes("app tag links", app, "referenceHref(tag.url, debate.id, occurrenceId)");
requireIncludes("app tag popovers", app, 'class="tag-popover"');
requireIncludes("app tag popovers", app, "Open the reference page for more.");
requireIncludes("app accessibility", app, 'class="skip-link"');
requireIncludes("app accessibility", app, 'id="main-content"');
requireIncludes("app accessibility", app, "argumentHelpId");
requireIncludes("app accessibility", app, 'aria-describedby="${escapeHtml(tooltipId)}"');
requireIncludes("app performance", app, 'import("./data/debates.js")');
requireIncludes("app performance", app, 'from "./data/debate-summaries.js"');
requireIncludes("app analytics", app, "loadCloudflareAnalytics");

requireExcludes("app sticky header", app, "brand-gloves");
requireExcludes("app scorecard", app, "scoreboard-gloves");

requireIncludes(
  "hero columns",
  styles,
  "grid-template-columns: minmax(0, 1fr) minmax(128px, 178px) 270px;"
);
requireIncludes("hero gloves", styles, ".debate-gloves-panel");
requireIncludes("external links", styles, ".external-sites");
requireIncludes("external links", styles, ".external-sites-label");
requireIncludes("external links", styles, ".external-sites-links");
requireIncludes("external links", styles, ".external-site-popover");
requireIncludes("external links", styles, ".external-site-item:focus-within .external-site-popover");
requireIncludes("primary nav", styles, ".primary-nav-link");
requireIncludes("primary nav", styles, ".site-header nav a.primary-nav-link");
requireIncludes("primary nav", styles, ".primary-nav-link.active");
requireIncludes("primary nav", styles, "padding: 5px 10px;");
requireIncludes("primary nav", styles, "--glove-red: #b91f24;");
requireIncludes("primary nav", styles, "background: var(--glove-red);");
requireIncludes("primary nav", styles, "box-shadow: 0 7px 7px rgba(185, 31, 36, 0.24);");
requireIncludes("primary nav", styles, "color: #ffffff;");
requireIncludes("landing actions", styles, ".landing-actions");
requireIncludes("landing summary", styles, ".landing-stats");
requireIncludes("landing topics", styles, ".landing-topic-link");
requireIncludes("pagination", styles, ".pagination");
requireIncludes("landing card links", styles, ".debate-title-link");
requireIncludes("landing card links", styles, ".card-interlocutor");
requireIncludes("search page", styles, ".search-page");
requireIncludes("search page", styles, ".search-hero h1");
requireIncludes("search page", styles, ".search-match-label");
requireIncludes("search page", styles, ".person-filter");
requireIncludes("search page", styles, ".filter-accordion");
requireIncludes("search page", styles, "max-height: min(420px, 48vh);");
requireIncludes("search page", styles, "overflow-y: auto;");
requireExcludes("search page", styles, ".topic-filter");
requireIncludes("search page", styles, ".search-result");
requireIncludes("search result links", app, 'class="debate-title-link search-result-title-link"');
requireIncludes("search result links", app, 'class="result-person" href="${escapeHtml(interlocutorPath(person))}"');
requireIncludes("topics page", styles, ".topics-page");
requireIncludes("topics page", styles, ".topics-hero");
requireIncludes("topics page", styles, ".topics-hero h1");
requireIncludes("topics page", styles, ".topic-jump-list");
requireIncludes("topics page", styles, "grid-template-columns: repeat(4, minmax(0, 1fr));");
requireIncludes("topics page", styles, ".topic-debate-card");
requireIncludes("topics page", styles, ".topic-card-people");
requireIncludes("topics page", styles, ".topic-card-reveal");
requireIncludes("topics page", styles, "min-height: 210px;");
requireIncludes("topics page", styles, "inset: 0;");
requireIncludes("topics page", styles, "font-size: 0.66rem;");
requireIncludes("topics page", styles, ".topic-debate-card:hover .topic-card-reveal");
requireIncludes("topics page", styles, ".topic-debate-card:focus-within .topic-card-reveal");
requireIncludes("rankings page", styles, ".rankings-page");
requireIncludes("rankings page", styles, ".rankings-hero");
requireIncludes("rankings page", styles, ".ranking-list");
requireIncludes("rankings page", styles, ".ranking-card");
requireIncludes("rankings page", styles, ".ranking-tool");
requireIncludes("rankings page", styles, ".ranking-topic");
requireIncludes("rankings page", styles, ".ranking-method");
requireIncludes("rankings analytics", styles, ".reasoning-distribution");
requireIncludes("rankings analytics", styles, ".reasoning-topic-row");
requireIncludes("rankings analytics", styles, ".reasoning-bar-track");
requireExcludes("rankings analytics", styles, ".reasoning-topic-control");
requireIncludes("rankings analytics", styles, ".ranking-tag-bars");
requireIncludes("rankings analytics", styles, ".ranking-comparison");
requireIncludes("rankings analytics", styles, ".sample-confidence");
requireIncludes("interlocutor profile", styles, ".interlocutor-profile-page");
requireIncludes("interlocutor profile", styles, ".profile-score-bands");
requireIncludes("interlocutor profile", styles, ".profile-debate-grid");
requireIncludes("assessment page", styles, ".assessment-page");
requireIncludes("assessment page", styles, ".assessment-hero");
requireIncludes("assessment page", styles, ".assessment-hero h1");
requireIncludes("assessment page", styles, ".assessment-stamp");
requireIncludes("assessment page", styles, ".process-steps");
requireIncludes("assessment page", styles, ".score-band");
requireIncludes("assessment page", styles, ".assessment-example");
requireIncludes("debate numbering", styles, ".debate-number");
requireIncludes("debate numbering", styles, ".card-label");
requireIncludes("timestamp links", styles, ".timestamp-link");
requireIncludes("assessment model", styles, ".assessment-model");
requireIncludes("page headers", styles, "font-size: clamp(2.4rem, 5.6vw, 4.8rem);");
requireIncludes("page headers", styles, "line-height: 0.92;");
requireIncludes("landing debate grid", styles, "grid-template-columns: repeat(3, minmax(0, 1fr));");
requireIncludes("landing image", styles, "width: min(100%, 420px);");
requireIncludes("debate title", styles, "font-size: clamp(1.5rem, 3.9vw, 3.35rem);");
requireIncludes("tag popovers", styles, ".tag-popover");
requireIncludes("tag popovers", styles, ".tag-wrap:hover .tag-popover");
requireIncludes("reference nav", styles, ".reference-nav");
requireIncludes("reference links", styles, ".reference-debate-link");
requireIncludes("reference links", styles, ".reference-debate-return");
requireIncludes("reference anchors", styles, "scroll-margin-top: 92px;");
requireIncludes("argument grid", styles, ".exchange-grid");
requireIncludes("argument grid", styles, "align-items: start;");
requireIncludes("argument columns", styles, ".argument.side-pro");
requireIncludes("argument columns", styles, ".argument.side-con");
requireIncludes(
  "mobile argument columns",
  styles,
  ".argument.side-pro,\n  .argument.side-con {\n    grid-column: 1;"
);
requireIncludes("argument cards", styles, "min-height: 0;");
requireIncludes(
  "Debate 14 AI color sample",
  styles,
  ".logical-extension.logical-extension-editorial-blue"
);
requireIncludes("accessibility", styles, ".skip-link");
requireIncludes("accessibility", styles, "@media (prefers-reduced-motion: reduce)");
requireIncludes("performance", styles, "content-visibility: auto;");
requireIncludes("footer", styles, ".site-footer");

requireExcludes("sticky header", styles, ".brand-gloves");
requireExcludes("scorecard", styles, ".scoreboard-gloves");
requireExcludes("argument cards", styles, "min-height: 190px;");

if (errors.length > 0) {
  console.error(`Design template validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Validated locked debate page design.");
