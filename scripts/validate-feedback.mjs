import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderDebateRecommendation } from "../src/data/debate-recommendation.js";
import { initialPageContent } from "./lib/initial-page-content.mjs";
import { correctionsSeo } from "../src/seo.js";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = renderDebateRecommendation();
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "Recommendation field IDs must be unique");
for (const [, id] of html.matchAll(/\bfor="([^"]+)"/g)) assert.ok(ids.includes(id), `Missing labeled field ${id}`);
for (const name of ["debate_url", "email"]) {
  assert.match(html, new RegExp(`<input[^>]+name="${name}"[^>]+required>`), `${name} must be required`);
}
assert.match(html, /name="debate_url" type="url"/);
assert.match(html, /name="email" type="email"/);
assert.match(html, /name="recommendation_reason"[^>]+maxlength="2500"/);
assert.ok(!html.match(/<textarea[^>]+required/), "Explanation remains optional");
assert.match(html, /action="https:\/\/formsubmit.co\/44a747882839a1240511c0b4bca3bd95" method="post"/);
assert.ok(html.includes('name="_next" value="https://slugfester.com/corrections/?recommendation=sent#recommend-a-debate"'));
assert.ok(html.includes('name="_honey" tabindex="-1"'));
assert.ok(!html.includes('name="_captcha"'), "Keep the service's default spam protection");
assert.ok(!html.includes("@yahoo.com"), "Use the approved opaque destination");
assert.ok(!html.includes("Recommendation sent."));
assert.ok(renderDebateRecommendation({ sent: true }).includes('role="status"><strong>Recommendation sent.'));
for (const phrase of ["Two clear opposing positions", "complete exchange", "Usable source material", "topic fit", "Substantive disagreement", "Not already assessed", "separate approval", "not a guaranteed addition"]) {
  assert.ok(html.includes(phrase), `Missing screening guidance: ${phrase}`);
}
assert.ok(app.includes('<a href="${correctionsPath()}">Feedback</a>'));
const page = app.slice(app.indexOf("function renderCorrections()"), app.indexOf("function renderAssessmentPrinciple("));
assert.ok(page.includes("Submitting a report does not guarantee a review, an individual reply, or a change."));
assert.ok(page.includes("This confirms submission only, not a commitment to review or respond."));
assert.ok(page.includes("If a report is taken up"));
assert.ok(!page.includes("delivered for review"));
assert.ok(page.indexOf("renderDebateRecommendation(") > page.indexOf("</form>"), "Suggestion form belongs below Corrections form");
assert.ok(page.indexOf("renderDebateRecommendation(") < page.indexOf('class="corrections-process"'));
assert.ok(initialPageContent("/corrections/").includes(html), "Initial HTML must include the same guidance and working suggestion form");
assert.equal(correctionsSeo().canonicalPath, "/corrections/", "Preserve existing report URLs");
assert.ok(correctionsSeo().title.includes("Feedback"));
console.log("Validated Feedback navigation, screening guidance, required fields, approved delivery, confirmation, and no-JavaScript recommendation form.");
