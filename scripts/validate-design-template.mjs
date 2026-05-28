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
requireIncludes("app debate hero", app, 'src="./assets/debate-gloves.png"');
requireIncludes("app sticky header", app, 'class="brand-logo" src="./assets/debate-gloves.png"');
requireIncludes("app landing hero", app, 'class="logo-showcase"');
requireIncludes("app landing hero", app, 'src="./assets/slugfester-logo.jpg"');
requireIncludes("app scorecard", app, "Open YouTube source");
requireIncludes("app guide", app, "◉ Deeper critiques");

requireExcludes("app sticky header", app, "brand-gloves");
requireExcludes("app scorecard", app, "scoreboard-gloves");

requireIncludes(
  "hero columns",
  styles,
  "grid-template-columns: minmax(0, 1fr) minmax(128px, 178px) 270px;"
);
requireIncludes("hero gloves", styles, ".debate-gloves-panel");
requireIncludes("landing image", styles, "width: min(100%, 420px);");
requireIncludes("debate title", styles, "font-size: clamp(1.5rem, 3.9vw, 3.35rem);");
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
