import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { publishedDebates as debates } from "../src/data/debates.js";
import { avatarsForSpeakerText, interlocutorAvatars } from "../src/data/interlocutors.js";

const [app, styles] = await Promise.all([
  readFile(new URL("../src/app.js", import.meta.url), "utf8"),
  readFile(new URL("../src/styles.css", import.meta.url), "utf8")
]);

const errors = [];

const avatarNames = new Set();
for (const [index, avatar] of interlocutorAvatars.entries()) {
  const label = `interlocutor avatar ${index + 1}`;
  if (!avatar.name?.trim()) errors.push(`${label}: name must be a non-empty string`);
  if (!Array.isArray(avatar.aliases) || avatar.aliases.some((alias) => !alias?.trim())) {
    errors.push(`${label}: aliases must contain only non-empty strings`);
  }
  if (!/^\/assets\//.test(avatar.src || "")) {
    errors.push(`${label}: src must use a root-relative /assets/ path`);
  } else if (!existsSync(new URL(`..${avatar.src}`, import.meta.url))) {
    errors.push(`${label}: ${avatar.src} does not exist`);
  }

  const normalizedName = avatar.name?.trim().toLowerCase();
  if (normalizedName && avatarNames.has(normalizedName)) {
    errors.push(`${label}: name must be unique (case-insensitive)`);
  }
  if (normalizedName) avatarNames.add(normalizedName);
}

for (const debate of debates) {
  const idYear = Number(String(debate.id || "").match(/-((?:19|20)\d{2})$/)?.[1]);
  if (!Number.isInteger(debate.year) || debate.year < 1900 || debate.year > 2099) {
    errors.push(`${debate.id}: year must be an integer from 1900 through 2099`);
  }
  if (idYear !== debate.year) {
    errors.push(`${debate.id}: year ${debate.year} must match the year in the debate ID`);
  }
  if (/\((?:19|20)\d{2}\)\s*$/.test(debate.title || "")) {
    errors.push(`${debate.id}: title must not contain a trailing parenthesized year`);
  }

  for (const side of [debate.sides?.pro, debate.sides?.con]) {
    if (side?.speaker && avatarsForSpeakerText(side.speaker).length === 0) {
      errors.push(`${debate.id}: ${side.speaker} must resolve to a registered interlocutor`);
    }
  }
}

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
requireIncludes("app landing update cadence", app, "New debate assessments are added nearly every month.");
requireIncludes("app recent assessment wording", app, "Start with the newest debate additions.");
requireExcludes("app recent assessment wording", app, "Start with the newest scorecard numbers.");
requireIncludes("app pagination", app, "const LANDING_PAGE_SIZE = 18");
requireIncludes("app pagination", app, "const SEARCH_PAGE_SIZE = 24");
requireIncludes("app pagination", app, "renderPagination");
requireIncludes("app pagination", app, 'class="pagination"');
requireIncludes("app pagination", app, "const landingPager = paginatedItems");
requireIncludes("app pagination", app, "pager: landingPager");
requireIncludes("app landing cards", app, 'class="debate-title-link"');
requireIncludes("app debate years", app, "function renderDebateYear(debate)");
requireIncludes("app debate years", app, 'class="debate-title-year"');
requireIncludes("app debate years", app, "renderDebateTitle(debate)");
requireIncludes("app landing cards", app, 'class="card-interlocutor"');
requireIncludes("app landing scorecard count", app, "Debates/Scorecards");
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
requireIncludes("app rankings page", app, "Group debate scores are not factored into interlocutors' 1-on-1 debate scorecard averages.");
requireIncludes("app rankings analytics", app, "reasoningTagDistribution");
requireIncludes("app rankings analytics", app, 'class="reasoning-distribution"');
requireExcludes("app rankings analytics", app, "data-reasoning-topic-select");
requireIncludes("app rankings analytics", app, "rankingTagSummary");
requireIncludes("app rankings analytics", app, 'class="ranking-tag-bars"');
requireIncludes("app rankings analytics", app, 'class="ranking-comparison"');
requireIncludes("app rankings comparison histogram", app, 'className: "comparison-score-histogram"');
requireIncludes("app rankings comparison alphabetization", app, 'first.name.localeCompare(second.name, "en", { sensitivity: "base" })');
requireIncludes("app rankings one-on-one eligibility", app, "if (!isOneOnOneDebate(debate)) return false;");
requireIncludes("app profile opponent score formatting", app, "formatOpponentBreakdownScore(opponent)");
requireIncludes("app profile opponent score explanation", app, "Right-hand values are matchup scores against");
requireIncludes("app profile opponent score distinction", app, "not opponents’ overall profile averages");
requireIncludes("app profile opponent matchup label", app, "meeting · matchup score");
requireIncludes("app profile opponent spacing hook", app, 'class="profile-breakdown profile-opponents"');
requireIncludes("app profile team score exclusion", app, "Shared side score excluded from the individual record.");
requireIncludes("app profile group-only state", app, "No eligible one-on-one scorecards yet.");
requireIncludes("app backend rubric evidence", app, "sectionScoreDistribution");
requireIncludes("app backend rubric data loading", app, "rankingsMatch || interlocutorMatch || backendMatch");
requireIncludes("app backend rubric evidence", app, "The rubric distinguishes stronger from weaker sections");
requireIncludes("app backend rubric evidence", app, "two-percentage-point score ranges");
requireIncludes("app backend rubric evidence", app, "not overall debate scores or interlocutor averages");
requireIncludes("app rankings analytics", app, 'class="sample-confidence');
requireIncludes("app interlocutor profile", app, 'class="interlocutor-profile-page"');
requireIncludes("app interlocutor profile", app, 'class="profile-score-bars"');
requireIncludes("app debate score histograms", app, 'className: "debate-score-histogram"');
requireIncludes("app debate score histogram placement", app, 'class="debate-score-profile-grid"');
requireIncludes("app debate score histogram single-interlocutor rule", app, "proHistories.length === 1");
requireIncludes("app debate multi-interlocutor note", app, "Click a specific avatar above");
requireIncludes("app debate score histogram eligibility", app, "eligible 1-on-1");
requireIncludes("app interlocutor score range", app, "const PROFILE_SCORE_MINIMUM = 50;");
requireIncludes("app interlocutor score range", app, "const PROFILE_SCORE_MAXIMUM = 100;");
requireIncludes("app interlocutor score bucket", app, "const PROFILE_SCORE_BUCKET_SIZE = 5;");
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
requireIncludes("app backend update date", app, "Updated September 2, 2026");
requireIncludes("app backend review cadence", app, "approximately twice a year");
requireIncludes("app backend selection limitation", app, "The selection process is somewhat arbitrary.");
requireIncludes("app backend selection sampling caveat", app, "not a random or representative sample");
requireIncludes("app backend selection category preference", app, "clearly fit within one of the ten topic categories listed on the site");
requireIncludes("app backend recommendation form", app, 'class="backend-recommendation-form"');
requireIncludes("app backend recommendation URL", app, 'name="debate_url" type="url"');
requireIncludes("app backend recommendation email", app, 'name="email" type="email"');
requireIncludes("app backend recommendation destination", app, "https://formsubmit.co/44a747882839a1240511c0b4bca3bd95");
requireExcludes("app backend recommendation email privacy", app, "philstilwell@yahoo.com");
requireIncludes("app scorecard report route", app, "correctionReportUrl");
requireIncludes("app scorecard report form", app, 'class="correction-report-form"');
requireIncludes("app scorecard report page URL", app, 'name="page_url" type="url"');
requireIncludes("app scorecard report issue type", app, 'name="issue_type" required');
requireIncludes("app scorecard report evidence", app, 'name="supporting_evidence"');
requireIncludes("app scorecard report confirmation", app, "Report sent.");
requireExcludes("app scorecard report email privacy", app, "philstilwell@yahoo.com");
requireIncludes("app backend compute disclosure", app, "What ≈83 hours means.");
requireIncludes("app backend new debate compute", app, "New debates require about 1.5 hours each to process and add.");
requireExcludes("app backend published-catalogue card", app, "<span>Published catalogue</span>");
requireExcludes("app backend dyadic-coverage card", app, "<span>Current v2 coverage</span>");
requireIncludes("app backend compute card", app, "Reassessment compute summary");
requireExcludes("app backend calibration distinction", app, "promoted calibration debates");
requireIncludes("app backend technical detail", app, 'class="backend-technical"');
requireIncludes("app backend objectivity accordion", app, '<details class="backend-objectivity-accordion">');
requireIncludes("app backend rubric examples accordion", app, '<details class="rubric-extremes-accordion">');
requireIncludes("app backend rubric examples columns", app, 'class="rubric-extremes-grid"');
requireIncludes("app backend rubric examples top", app, "Highest section-side scores");
requireIncludes("app backend rubric examples bottom", app, "Lowest section-side scores");
requireIncludes("app backend rubric move-score explanation", app, "Why this move received");
requireIncludes("app backend rubric high-score features", app, "Score-raising features");
requireIncludes("app backend rubric low-score features", app, "Score-lowering features");
requireExcludes("app backend rubric examples accordion default", app, '<details class="rubric-extremes-accordion" open>');
requireIncludes("app backend section score explanation", app, "multiplied by its previously locked importance");
requireIncludes("app backend comprehensive score explanation", app, "The default final adjustment is zero");
requireIncludes("app backend multi-speaker score disclosure", app, "no individual score is inferred");
requireIncludes("app backend multi-speaker ranking policy", app, "excluded from individual rankings, profile averages, score distributions, and opponent records");
requireIncludes("app backend fallacy and bias explanation", app, "Review fallacies and cognitive biases separately");
requireExcludes("app backend objectivity accordion default", app, '<details class="backend-objectivity-accordion" open>');
requireIncludes("app backend current section scoring", app, "importance-weighted mean of the selected moves");
requireIncludes("app backend current overall scoring", app, "prelocked section-weighted mean + −5…+5 burden adjustment");
requireExcludes("app backend retired section scoring", app, ".70 move mean + .10 coverage");
requireExcludes("app backend retired overall scoring", app, ".70 centrality-weighted sections");
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
requireExcludes("app retired Debate 14 AI color sample", app, "logical-extension-editorial-blue");
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
requireIncludes("app performance", app, 'import("./data/debate-analytics.js?v=');
requireIncludes("app performance", app, 'import(`./data/debate-details/${id}.js?v=');
requireIncludes("app performance", app, 'import(`./data/reference-appearances/${type}-${slug}.js?v=');
requireIncludes("app performance", app, 'from "./data/debate-summaries.js?v=');
requireExcludes("app performance", app, 'import("./data/debates.js');
requireExcludes("app analytics", app, "loadCloudflareAnalytics");
requireExcludes("app analytics", app, "cloudflareinsights.com/beacon.min.js");

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
requireIncludes("backend objectivity single column", styles, ".backend-objectivity-steps {\n  display: grid;\n  grid-template-columns: 1fr;");
requireIncludes("rankings vertical section score chart", styles, ".section-score-chart");
requireIncludes("rankings vertical section score bars", styles, "height: var(--bar-height);");
requireIncludes("pagination", styles, ".pagination");
requireIncludes("landing card links", styles, ".debate-title-link");
requireIncludes("debate year styling", styles, ".debate-title-year");
requireIncludes("debate year styling", styles, "transform: translateY(0.12em);");
requireIncludes("debate year styling", styles, ".debate-hero h1 .debate-title-year");
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
requireIncludes("rankings comparison histogram", styles, ".profile-score-histogram.comparison-score-histogram");
requireIncludes("rankings analytics", styles, ".sample-confidence");
requireIncludes("interlocutor profile", styles, ".interlocutor-profile-page");
requireIncludes("interlocutor profile", styles, ".profile-score-bars");
requireIncludes("interlocutor profile", styles, ".profile-score-bar");
requireIncludes("debate score histograms", styles, ".profile-score-histogram.debate-score-histogram");
requireIncludes("debate score histogram placement", styles, ".debate-score-profile-grid");
requireIncludes("debate multi-interlocutor note", styles, ".debate-multi-interlocutor-note");
requireIncludes("interlocutor profile gradient", styles, ".profile-score-bars li:nth-child(1)");
requireIncludes("interlocutor profile gradient", styles, ".profile-score-bars li:nth-child(10)");
requireIncludes("interlocutor profile width", styles, "width: min(52%, 640px);");
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
  "site-wide AI dark middle tier",
  styles,
  "linear-gradient(145deg, #173f4c 0%, #123641 58%, #0f3039 100%)"
);
requireExcludes("retired Debate 14 AI color sample", styles, "logical-extension-editorial-blue");
requireIncludes("accessibility", styles, ".skip-link");
requireIncludes("accessibility", styles, "@media (prefers-reduced-motion: reduce)");
requireIncludes("performance", styles, "content-visibility: auto;");
requireIncludes("backend technical detail", styles, ".backend-technical {");
requireIncludes("backend selection disclosure", styles, ".backend-selection {");
requireIncludes("backend recommendation form", styles, ".backend-recommendation-form {");
requireIncludes("profile opponent heading spacing", styles, ".profile-opponents .profile-section-heading {");
requireIncludes("backend rubric evidence", styles, ".backend-page .backend-rubric-evidence");
requireIncludes("backend rubric examples accordion", styles, ".rubric-extremes-accordion {");
requireIncludes("backend rubric examples columns", styles, ".rubric-extremes-grid {");
requireIncludes("backend rubric assessed move grouping", styles, ".rubric-extreme-assessment {");
requireIncludes("backend rubric move score", styles, ".rubric-extreme-move-score {");
requireIncludes("backend rubric example explanation", styles, ".rubric-extreme-analysis {");
requireIncludes("backend objectivity accordion", styles, ".backend-objectivity-accordion {");
requireIncludes("backend compact technical type", styles, "font-size: 0.86rem;");
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
