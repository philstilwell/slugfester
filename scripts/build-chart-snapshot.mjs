// Explicit, offline refresh only. Ordinary SEO generation never invokes this file.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { publishedDebates } from "../src/data/debates.js";
import { chartFamilies, chartDimensions, chartScopes, classifyChartMove } from "../src/data/chart-definitions.js";
import { chartSnapshotName } from "../src/data/charts.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFile(new URL(path, `file://${root}`), "utf8");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const date = arg("date");
const revision = Number(arg("revision") || 1);
if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Snapshot revision must be a positive integer.");
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) {
  throw new Error("Supply an explicit publication date: npm run charts:build -- --date=YYYY-MM-DD");
}
function parseCsv(text) {
  const rows = []; let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === "," || c === "\n")) { row.push(value.replace(/\r$/, "")); value = ""; if (c === "\n") { rows.push(row); row = []; } }
    else value += c;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift();
  return rows.filter((r) => r.length === headers.length).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}
const taxonomyPath = "docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv";
const taxonomyText = await read(taxonomyPath);
const taxonomy = new Map(parseCsv(taxonomyText).map((r) => [r.id, r]));
const reviewText = await read("docs/charts/position-review.json");
const review = JSON.parse(reviewText);
const dimensions = chartDimensions.map(([key]) => key);
const precision = (f) => f.propositionRecoverability === "failed" ? 35
  : f.termStability === "materially-unstable" || f.scopeStability === "materially-unstable" || f.qualificationExplicitness === "materially-misleading" ? 60
  : f.propositionRecoverability === "partial" || f.termStability === "partly-unstable" || f.scopeStability === "partly-unstable" || f.qualificationExplicitness === "missing" ? 75
  : f.qualificationExplicitness === "implicit" ? 85 : 95;
const calibration = (f) => ({ "radically-overstated": 35, "materially-overstated": 60, "slightly-overstated": 75 })[f.warrantFit]
  ?? (["explicit", "not-needed"].includes(f.qualificationStatus) && ["yes", "not-needed"].includes(f.uncertaintyAcknowledged) ? 95 : 85);
const scopeFor = (d) => review.scopeOverrides[d.number] || (
  ["scripture-jesus-resurrection", "resurrection-miracles", "christian-belief-doctrine", "divine-nature-attributes"].includes(d.topicCategory) ? "religion"
  : ["religion-society-public-reason", "meaning-purpose"].includes(d.topicCategory) ? "society" : "god");

const snapshot = {
  schemaVersion: 1, date, revision, sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  catalogueCount: publishedDebates.length,
  sources: { taxonomy: { path: taxonomyPath, sha256: hash(taxonomyText) }, positions: { path: "docs/charts/position-review.json", sha256: hash(reviewText) }, classifier: { path: "src/data/chart-definitions.js", sha256: hash(await read("src/data/chart-definitions.js")) } },
  families: chartFamilies.map(({ id, label }) => ({ id, label })), dimensions: chartDimensions, scopes: chartScopes,
  debates: [], moves: [], exclusions: [], ledgerHashes: {}
};
if (review.caseReview) snapshot.sources.caseReview = { path: review.caseReview, sha256: hash(await read(review.caseReview)) };
for (const d of publishedDebates) {
  const prior = taxonomy.get(d.id);
  const reviewed = Object.hasOwn(review.additionalPositions, d.number);
  const supporting = prior ? prior.included === "True" ? prior.theist_side : null : reviewed ? review.additionalPositions[d.number] : null;
  if (!supporting) {
    const status = prior || reviewed ? "reviewed-exclusion" : "pending-review";
    const reason = prior?.reason || review.exclusionReasons[d.number];
    if (status === "reviewed-exclusion" && !reason?.trim()) throw new Error(`Reviewed exclusion needs a reason: ${d.id}`);
    snapshot.exclusions.push({ number: d.number, id: d.id, status, reason: reason || "Position classification awaits review." });
    continue;
  }
  if (!["pro", "con"].includes(supporting)) throw new Error(`Invalid supporting side: ${d.id}`);
  const adapterPath = `docs/assessment-ledgers/${d.id}.json`;
  const adapterText = await read(adapterPath);
  const adapter = JSON.parse(adapterText);
  if (adapter.debateId !== d.id) throw new Error(`Ledger identity mismatch: ${d.id}`);
  const ledgerText = adapter.scoringJudgment ? null : await read(adapter.evidenceLocks.finalLedger.path);
  const ledger = adapter.scoringJudgment || JSON.parse(ledgerText);
  snapshot.ledgerHashes[d.id] = { adapter: hash(adapterText), ...(ledgerText ? { finalLedger: hash(ledgerText) } : {}) };
  const judged = new Map(ledger.moves.map((m) => [m.moveId, m]));
  const calculated = new Map();
  for (const section of adapter.calculated.sections) for (const side of ["pro", "con"]) for (const m of section.sides[side].moves) calculated.set(m.moveId, { ...m, side });
  const debateIndex = snapshot.debates.length;
  snapshot.debates.push({ id: d.id, number: d.number, title: d.title, scope: scopeFor(d), generation: adapter.scoringJudgment ? "campaign" : "standalone", supporting, speakers: [d.sides[supporting].speaker, d.sides[supporting === "pro" ? "con" : "pro"].speaker], positions: [d.sides[supporting].name, d.sides[supporting === "pro" ? "con" : "pro"].name], sections: d.sections.map((s) => s.title) });
  const seen = new Set();
  for (const [sectionIndex, section] of d.sections.entries()) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) {
    const m = exchange[side]; if (!m) continue;
    const locked = judged.get(m.ledgerMoveId), calculatedMove = calculated.get(m.ledgerMoveId);
    if (!locked || !calculatedMove || locked.side !== side || calculatedMove.side !== side || calculatedMove.score !== m.score) throw new Error(`Published/locked move mismatch: ${d.id} ${m.ledgerMoveId}`);
    if (seen.has(m.ledgerMoveId)) continue; seen.add(m.ledgerMoveId);
    let values;
    if (calculatedMove.dimensions) values = dimensions.map((key) => calculatedMove.dimensions[key]);
    else if (locked.finalDimensions) values = dimensions.map((key) => locked.finalDimensions[key].value);
    else values = dimensions.map((key) => key === "precisionClarity" ? precision(locked.precisionFindings) : key === "calibrationCharity" ? Math.round((calibration(locked.calibrationFindings) + locked.ratings.representationalCharity.value) / 2) : locked.ratings[key].value);
    if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) throw new Error(`Missing dimension: ${d.id} ${m.ledgerMoveId}`);
    if (!["constructive", "reply", "concession"].includes(locked.moveKind)) throw new Error(`Unknown move kind: ${locked.moveKind}`);
    snapshot.moves.push({ d: debateIndex, id: m.ledgerMoveId, p: side === supporting ? 0 : 1, f: classifyChartMove(m, section), k: locked.moveKind, v: m.score, x: values, s: sectionIndex, t: m.time, q: m.words, speaker: locked.speaker || m.speaker || d.sides[side].speaker });
  }
}
const body = JSON.stringify(snapshot);
const snapshotName = chartSnapshotName(snapshot);
const archive = `docs/charts/snapshots/${snapshotName}.json`;
await mkdir(new URL("docs/charts/snapshots/", `file://${root}`), { recursive: true });
try { await access(new URL(archive, `file://${root}`)); if (!process.argv.includes("--replace-same-date")) throw new Error(`Snapshot ${snapshotName} already exists. Use a new date or --revision=N; --replace-same-date is only for an unpublished correction.`); } catch (e) { if (e.code !== "ENOENT") throw e; }
await writeFile(new URL(archive, `file://${root}`), `${body}\n`);
await writeFile(new URL("src/data/chart-snapshot.js", `file://${root}`), `// Manually published snapshot. Regenerate only with npm run charts:build.\nexport const chartSnapshot = ${body};\n`);
console.log(`Charts snapshot ${snapshotName}: ${snapshot.debates.length}/${snapshot.catalogueCount} debates, ${snapshot.moves.length} unique assessed moves, ${snapshot.exclusions.length} exclusions. ${body.length} bytes.`);
