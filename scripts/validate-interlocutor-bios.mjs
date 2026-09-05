import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedDebates } from "../src/data/debates.js";
import { avatarsForSpeakerText } from "../src/data/interlocutors.js";
import { biographyFor, renderBiography } from "../src/data/interlocutor-bios.js";
import { interlocutorPath, interlocutorSeo } from "../src/seo.js";

const people = new Map();
for (const debate of publishedDebates) {
  for (const side of Object.values(debate.sides)) {
    for (const person of avatarsForSpeakerText(side.speaker)) people.set(person.name, person);
  }
}
for (const person of people.values()) {
  const bio = biographyFor(person);
  assert(bio, `Missing biography: ${person.name}`);
  assert(bio.text.split(/\s+/).length >= 20 && bio.text.split(/\s+/).length <= 90, `Biography length: ${person.name}`);
  assert(!/\b(TODO|TBD|lorem ipsum)\b/i.test(bio.text), `Unfinished biography: ${person.name}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(bio.reviewed) && Number.isFinite(Date.parse(bio.reviewed)), `Review date: ${person.name}`);
  assert(bio.sources.length > 0, `Missing biography source: ${person.name}`);
  for (const source of bio.sources) assert.equal(new URL(source.url).protocol, "https:");
  const html = readFileSync(new URL(`..${interlocutorPath(person)}index.html`, import.meta.url), "utf8");
  assert(html.includes(renderBiography(person, bio, 2)), `Static biography missing: ${person.name}`);
  const seo = interlocutorSeo(person, 0, bio.reviewed, [], bio);
  assert(seo.jsonLd.some((item) => item.about?.description === bio.text), `Structured biography missing: ${person.name}`);
}
assert.equal(biographyFor("No such interlocutor"), null);
console.log(`Validated source-backed biographies for all ${people.size} published interlocutors.`);
