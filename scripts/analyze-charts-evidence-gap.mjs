// Descriptive analysis of a fixed public snapshot; never rescores or refreshes it.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const input = "docs/charts/snapshots/2026-10-08-r2.json";
const text = fs.readFileSync(root + input, "utf8"), s = JSON.parse(text);
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const sha = a => createHash("sha256").update(a).digest("hex");
const evidence = s.dimensions.findIndex(([k]) => k === "evidenceWarrant");
if (evidence !== 1) throw new Error("Unexpected evidence dimension");
function summarize({ scope = "all", role = null, family = null, generation = null, omitSpeaker = null } = {}) {
  const rows = [];
  for (const [i, d] of s.debates.entries()) {
    if (scope !== "all" && d.scope !== scope || generation && d.generation !== generation || omitSpeaker && d.speakers.includes(omitSpeaker)) continue;
    const sides = [0, 1].map(p => s.moves.filter(m => m.d === i && m.p === p && (!role || m.k === role) && (!family || m.f.includes(family))));
    if (omitSpeaker && sides.flat().some(m => m.speaker === omitSpeaker)) continue;
    if (!sides.every(ms => ms.length)) continue; // Matched comparisons require both sides.
    rows.push({ number: d.number, id: d.id, counts: sides.map(a => a.length),
      means: sides.map(ms => s.dimensions.map((_, j) => mean(ms.map(m => m.x[j])))),
      thresholds: Array.from({ length: 11 }, (_, k) => ({ threshold: 50 + k * 5, rates: sides.map(ms => 100 * mean(ms.map(m => +(m.x[evidence] < 50 + k * 5)))) })) });
  }
  return { debates: rows.length, moves: [0, 1].map(p => rows.reduce((n, r) => n + r.counts[p], 0)),
    dimensionMeans: s.dimensions.map((d, j) => ({ key: d[0], label: d[1], values: [0, 1].map(p => mean(rows.map(r => r.means[p][j]))) })),
    thresholds: Array.from({ length: 11 }, (_, k) => ({ threshold: 50 + k * 5, rates: [0, 1].map(p => mean(rows.map(r => r.thresholds[k].rates[p]))) })),
    evidenceHigher: [0, 1].map(p => rows.filter(r => r.means[p][evidence] > r.means[1 - p][evidence]).length),
    evidenceTied: rows.filter(r => r.means[0][evidence] === r.means[1][evidence]).length,
    rows };
}
const all = summarize();
const slim = ({ rows, ...x }) => x;
const scopes = s.scopes.filter(([id]) => id !== "all").map(([id, label]) => ({ id, label, ...slim(summarize({ scope: id })) }));
const roles = ["constructive", "reply"].map(id => ({ id, ...slim(summarize({ role: id })) }));
const formats = ["campaign", "standalone"].map(id => ({ id, ...slim(summarize({ generation: id })) }));
const speakers = [...new Set(s.moves.map(m => m.speaker))];
const omissions = speakers.map(speaker => { const r = summarize({ omitSpeaker: speaker }); const v = r.dimensionMeans[evidence].values; return { speaker, retained: r.debates, omitted: all.debates - r.debates, gap: v[1] - v[0] }; });
const families = s.families.map(f => {
  const sides = [0, 1].map(p => {
    const groups = s.debates.map((_, i) => s.moves.filter(m => m.d === i && m.p === p && m.f.includes(f.id))).filter(ms => ms.length);
    return { debates: groups.length, rate70: mean(groups.map(ms => 100 * mean(ms.map(m => +(m.x[evidence] < 70))))) };
  });
  return { ...f, sides, paired: slim(summarize({ family: f.id })) };
});
const models = {};
for (const d of s.debates) {
  const bytes = fs.readFileSync(root + `docs/assessment-ledgers/${d.id}.json`);
  if (sha(bytes) !== s.ledgerHashes[d.id].adapter) throw new Error(`Ledger has changed since capture: ${d.id}`);
  const a = JSON.parse(bytes); models[a.model] = (models[a.model] || 0) + 1;
}
// Independent flat-group reconciliation of every scope, dimension and threshold.
for (const [id] of [["all"], ...s.scopes.filter(([id]) => id !== "all")]) {
  const a = id === "all" ? all : summarize({ scope: id });
  for (let p = 0; p < 2; p++) {
    const buckets = new Map();
    for (const m of s.moves) if (m.p === p && (id === "all" || s.debates[m.d].scope === id)) {
      if (!buckets.has(m.d)) buckets.set(m.d, []); buckets.get(m.d).push(m.x);
    }
    for (let j = 0; j < 6; j++) {
      const x = [...buckets.values()].reduce((a, b) => a + b.reduce((c, d) => c + d[j], 0) / b.length, 0) / buckets.size;
      if (Math.abs(x - a.dimensionMeans[j].values[p]) > 1e-9) throw new Error("Mean mismatch");
    }
    for (const t of a.thresholds) {
      const x = [...buckets.values()].reduce((a, b) => a + 100 * b.filter(d => d[evidence] < t.threshold).length / b.length, 0) / buckets.size;
      if (Math.abs(x - t.rates[p]) > 1e-9) throw new Error("Threshold mismatch");
    }
  }
}
const output = { edition: "2026-10-08", input, inputSha256: sha(text), snapshotDate: s.date, snapshotRevision: s.revision, snapshotSourceCommit: s.sourceCommit,
  catalogueAtCapture: s.catalogueCount, included: s.debates.length, excluded: s.exclusions.length, uniqueMoves: s.moves.length, models,
  method: "Unweighted moves within each debate and side, equal weight across paired debates; strict evidence score < threshold. Family display rates may have different side-specific denominators. No inferential significance or causal claim.",
  all: slim(all), scopes, roles, formats, families, leaveOneSpeakerOut: { minimumGap: Math.min(...omissions.map(x => x.gap)), maximumGap: Math.max(...omissions.map(x => x.gap)), results: omissions }, debateRows: all.rows };
const destination = "docs/charts/evidence-explanation-2026-10-08/analysis.json";
fs.writeFileSync(root + destination, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ output: destination, evidence: all.dimensionMeans[evidence], below70: all.thresholds[4], roles: roles.map(r => ({ role: r.id, n: r.debates, means: r.dimensionMeans[evidence].values })), formats: formats.map(r => ({ format: r.id, n: r.debates, means: r.dimensionMeans[evidence].values })), omissionGap: [output.leaveOneSpeakerOut.minimumGap, output.leaveOneSpeakerOut.maximumGap] }, null, 2));
