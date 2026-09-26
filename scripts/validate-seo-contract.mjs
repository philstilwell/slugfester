import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedDebates as debates } from "../src/data/debates.js";
import { topicCategoryDefinitions } from "../src/data/topics.js";
import { referenceDefinitions } from "../src/data/references.js";
import { pageUpdates } from "../src/data/page-updates.js";
import { interlocutorAvatars } from "../src/data/interlocutors.js";
import { topicPath, topicSeo, topicsSeo, referenceSeo, interlocutorSeo, withPageUpdate, SITE_URL } from "../src/seo.js";
import { pageHistoryEntry, compactPageDates } from "./lib/seo-page-history.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const history = JSON.parse(read("scripts/seo-page-history.json"));
const sitemap = read("sitemap.xml");
const routes = [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];
assert.equal(routes.length, Object.keys(history).length, "Every indexed page needs a persisted content date");
assert.deepEqual(compactPageDates(history), pageUpdates, "Browser dates must match generated page dates");
for (const [, url, date] of routes) {
  const path = new URL(url).pathname;
  assert.equal(date, history[path].modified, `Sitemap date for ${path}`);
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(date <= new Date().toISOString().slice(0, 10), "No future modification dates");
  const html = read(path === "/" ? "index.html" : `${path.slice(1)}index.html`);
  const schema = JSON.parse(html.match(/id="seo-structured-data">([\s\S]*?)<\/script>/)[1]);
  const page = schema.find((entry) => ["Article", "WebPage", "CollectionPage"].includes(entry["@type"]));
  assert.ok(page, `${path} must describe its actual page type`);
  assert.equal(page.dateModified, date, `Structured update date for ${path}`);
  assert.equal(page.url, url, `Structured page URL for ${path}`);
}
for (const topic of topicCategoryDefinitions) {
  const seo = topicSeo(topic, debates);
  const page = seo.jsonLd.find((entry) => entry["@type"] === "CollectionPage");
  const members = debates.filter((debate) => debate.topicCategory === topic.id);
  assert.equal(page.mainEntity.numberOfItems, members.length);
  assert.equal(page.mainEntity.itemListElement.length, members.length);
  const html = read(`${topicPath(topic).slice(1)}index.html`);
  for (const debate of members) assert.ok(html.includes(`/debate/${debate.id}/`), `Missing ${debate.id} in ${topic.id}`);
  assert.ok(html.includes("About this topic") && html.includes("Explore the assessments"));
}
const topicIndex = topicsSeo(debates).jsonLd.find((entry) => entry["@type"] === "CollectionPage").mainEntity;
assert.equal(topicIndex.numberOfItems, topicCategoryDefinitions.length);
assert.deepEqual(topicIndex.itemListElement.map((entry) => entry.url), topicCategoryDefinitions.map((topic) => SITE_URL + topicPath(topic)));
for (const [type, definitions] of Object.entries(referenceDefinitions)) {
  for (const [slug, reference] of Object.entries(definitions)) {
    const seo = referenceSeo(type, slug, reference);
    const term = seo.jsonLd.find((entry) => entry["@type"] === "DefinedTerm");
    const page = seo.jsonLd.find((entry) => entry["@type"] === "WebPage");
    assert.equal(page.mainEntity["@id"], term["@id"]);
    assert.equal(term.mainEntityOfPage["@id"], page["@id"]);
    const html = read(`reference/${type}/${slug}/index.html`);
    assert.ok(html.includes("Examples from published debates") && html.includes("Watch the original source"), `Missing reference evidence: ${slug}`);
  }
}
const original = { content: "A useful summary", seo: { lastmod: "2026-01-01", jsonLd: [{ dateModified: "2026-01-01" }] }, asset: "/src/app.js?v=1111111111111111" };
assert.deepEqual(
  interlocutorSeo(interlocutorAvatars[0], 2, "2026-01-01", debates.slice(0, 2)),
  interlocutorSeo(interlocutorAvatars[0], 2, "2026-01-01", debates.slice(0, 2).reverse()),
  "Profile metadata must not depend on browser versus build ordering"
);
const first = pageHistoryEntry(undefined, original, "2026-01-01");
assert.deepEqual(pageHistoryEntry(first, original, "2026-02-01"), first, "Rebuilds must not fabricate freshness");
assert.deepEqual(pageHistoryEntry(first, { ...original, seo: { lastmod: "2026-02-01", jsonLd: [{ dateModified: "2026-02-01" }] }, asset: "/src/app.js?v=2222222222222222" }, "2026-02-01"), first, "Cache versions and derived dates are not editorial updates");
assert.equal(pageHistoryEntry(first, { ...original, content: "A corrected summary" }, "2026-02-01").modified, "2026-02-01");
assert.equal(withPageUpdate(topicSeo(topicCategoryDefinitions[0], debates), "2026-01-02").lastmod, "2026-01-02");
const robots = read("robots.txt");
assert.ok(robots.includes("Sitemap: https://slugfester.com/sitemap.xml"));
assert.ok(!/Disallow: \/(?:src|assets|output\/pdf)\//.test(robots), "Reader assets and research PDFs must remain crawlable");
console.log(`Validated SEO contracts for ${routes.length} indexed pages, ${topicCategoryDefinitions.length} topic pages, reference evidence and stable update dates.`);
