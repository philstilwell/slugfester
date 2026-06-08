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
requireIncludes("app sticky header", app, "Search");
requireIncludes("app sticky header", app, "Assessment");
requireIncludes("app sticky header", app, 'class="external-site-popover"');
requireIncludes("app sticky header", app, 'aria-describedby="logfall-menu-popover"');
requireIncludes("app sticky header", app, 'aria-describedby="cogbias-menu-popover"');
requireIncludes("app landing hero", app, 'class="logo-showcase"');
requireIncludes("app landing hero", app, 'src="/assets/slugfester-logo.jpg"');
requireIncludes("app landing topics", app, 'class="topic-divider"');
requireIncludes("app landing topics", app, 'class="topic-list"');
requireIncludes("app landing cards", app, 'class="debate-title-link"');
requireIncludes("app search route", app, "renderSearch");
requireIncludes("app search route", app, "searchPathRoutePattern");
requireIncludes("app search route", app, "searchSeo");
requireIncludes("app search route", app, "searchMatchesLabel");
requireIncludes("app search route", app, "Matches:");
requireIncludes("app assessment route", app, "renderAssessment");
requireIncludes("app assessment route", app, "assessmentPathRoutePattern");
requireIncludes("app assessment route", app, "assessmentSeo");
requireIncludes("app assessment page", app, "The Codex Assessment Process");
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
requireIncludes("app scorecard", app, 'class="assessment-model"');
requireIncludes("app timestamp links", app, "timestampedYouTubeUrl");
requireIncludes("app timestamp links", app, 'class="timestamp-link"');
requireIncludes("app timestamp links", app, "renderTimestampLink(section.timebox");
requireIncludes("app timestamp links", app, "renderTimestampLink(argument.time");
requireIncludes("app guide", app, "◉ Deeper critiques");
requireIncludes("app reference route", app, "referencePathRoutePattern");
requireIncludes("app reference route", app, "Why this label appears here");
requireIncludes("app reference route", app, "Back to this debate");
requireIncludes("app reference route", app, "reference-debate-link");
requireIncludes("app reference route", app, "Open debate scorecard");
requireIncludes("app tag links", app, "referenceOccurrenceId");
requireIncludes("app tag links", app, "referenceHref(tag.url, debate.id, occurrenceId)");
requireIncludes("app tag popovers", app, 'class="tag-popover"');
requireIncludes("app tag popovers", app, "Click button for more info.");

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
requireIncludes("landing topics", styles, ".topic-divider");
requireIncludes("landing topics", styles, ".topic-list");
requireIncludes("landing card links", styles, ".debate-title-link");
requireIncludes("search page", styles, ".search-page");
requireIncludes("search page", styles, ".search-match-label");
requireIncludes("search page", styles, ".person-filter");
requireIncludes("search page", styles, ".filter-accordion");
requireExcludes("search page", styles, ".topic-filter");
requireIncludes("search page", styles, ".search-result");
requireIncludes("search result links", app, 'class="debate-title-link search-result-title-link"');
requireIncludes("assessment page", styles, ".assessment-page");
requireIncludes("assessment page", styles, ".assessment-hero");
requireIncludes("assessment page", styles, ".assessment-stamp");
requireIncludes("assessment page", styles, ".process-steps");
requireIncludes("assessment page", styles, ".score-band");
requireIncludes("assessment page", styles, ".assessment-example");
requireIncludes("debate numbering", styles, ".debate-number");
requireIncludes("debate numbering", styles, ".card-label");
requireIncludes("timestamp links", styles, ".timestamp-link");
requireIncludes("assessment model", styles, ".assessment-model");
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
requireIncludes("argument cards", styles, "min-height: 0;");

requireExcludes("sticky header", styles, ".brand-gloves");
requireExcludes("scorecard", styles, ".scoreboard-gloves");
requireExcludes("argument cards", styles, "min-height: 190px;");

if (errors.length > 0) {
  console.error(`Design template validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Validated locked debate page design.");
