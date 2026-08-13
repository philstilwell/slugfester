import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/production-mutation";

export const CHECKPOINT_V22_PRODUCTION_MUTATION_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-ten-debate-production-mutation";

export const CHECKPOINT_V22_PRODUCTION_MUTATION_ORDER = [
  "50",
  "192",
  "129",
  "40",
  "25",
  "104",
  "22",
  "10",
  "167",
  "122"
];

export const CHECKPOINT_V22_IMMUTABLE_DEBATE_FIELDS = [
  "id",
  "number",
  "title",
  "label",
  "duration",
  "youtubeUrl",
  "motion",
  "sides",
  "topicCategory"
];

export const CHECKPOINT_V22_EXPECTED_CHANGED_DEBATE_FIELDS = [
  "date",
  "summary",
  "sourceNote",
  "scoringNote",
  "quotes",
  "score",
  "sections",
  "overall",
  "assessmentModel",
  "assessmentRubric",
  "logicalExtension"
];

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function serializedJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isWhitespace(value) {
  return value === " " || value === "\t" || value === "\n" || value === "\r";
}

export function findTopLevelDebateObjectSpans(source) {
  const marker = "export const debates = [";
  const markerIndex = source.indexOf(marker);
  assertV4(markerIndex >= 0, "production debates array marker is missing");
  const arrayStart = source.indexOf("[", markerIndex);
  const spans = [];
  let arrayDepth = 1;
  let braceDepth = 0;
  let objectStart = -1;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = arrayStart + 1; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "[") {
      arrayDepth += 1;
      continue;
    }
    if (character === "]") {
      arrayDepth -= 1;
      if (arrayDepth === 0) break;
      continue;
    }
    if (character === "{") {
      if (arrayDepth === 1 && braceDepth === 0) objectStart = index;
      braceDepth += 1;
      continue;
    }
    if (character === "}") {
      braceDepth -= 1;
      assertV4(braceDepth >= 0, "production debates object braces are unbalanced");
      if (arrayDepth === 1 && braceDepth === 0 && objectStart >= 0) {
        spans.push({ start: objectStart, endExclusive: index + 1 });
        objectStart = -1;
      }
    }
  }

  assertV4(arrayDepth === 0, "production debates array is unbalanced");
  assertV4(braceDepth === 0, "production debates object braces are unbalanced");
  assertV4(spans.length > 0, "production debates array has no object spans");
  return spans;
}

export function evaluateDebatesSource(source) {
  const transformed = `${source
    .replace("export const debates =", "const debates =")
    .replace(
      "export const publishedDebates =",
      "const publishedDebates ="
    )}\n;globalThis.__checkpointResult = { debates, publishedDebates };`;
  const context = {};
  vm.runInNewContext(transformed, context, {
    filename: "projected-src-data-debates.js",
    timeout: 10_000
  });
  return context.__checkpointResult;
}

function replacementBytes(candidate) {
  return JSON.stringify(candidate, null, 2).replaceAll("\n", "\n  ");
}

function changedTopLevelFields(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (key) => canonicalJson(before[key]) !== canonicalJson(after[key])
  );
}

function countMoves(candidate) {
  return candidate.sections.reduce(
    (total, section) =>
      total +
      section.exchanges.reduce(
        (sectionTotal, exchange) =>
          sectionTotal + Number(Boolean(exchange.pro)) + Number(Boolean(exchange.con)),
        0
      ),
    0
  );
}

export function buildDebatesProjection({ source, currentDebates, candidatesByNumber }) {
  const spans = findTopLevelDebateObjectSpans(source);
  assertV4(
    spans.length === currentDebates.length,
    "production debate object span count does not match imported debates"
  );
  const indexByNumber = new Map(
    currentDebates.map((debate, index) => [debate.number, index])
  );
  const targetIndexes = new Set();
  const records = [];

  for (const debateNumber of CHECKPOINT_V22_PRODUCTION_MUTATION_ORDER) {
    const index = indexByNumber.get(debateNumber);
    const candidate = candidatesByNumber.get(debateNumber);
    assertV4(Number.isInteger(index), `${debateNumber}: production debate is missing`);
    assertV4(candidate, `${debateNumber}: final candidate is missing`);
    const before = currentDebates[index];
    assertV4(
      candidate.number === debateNumber && candidate.id === before.id,
      `${debateNumber}: candidate identity mismatch`
    );
    for (const field of CHECKPOINT_V22_IMMUTABLE_DEBATE_FIELDS) {
      assertV4(
        canonicalJson(candidate[field]) === canonicalJson(before[field]),
        `${debateNumber}: immutable field ${field} changed`
      );
    }
    const changedFields = changedTopLevelFields(before, candidate);
    assertV4(
      canonicalJson([...changedFields].sort()) ===
        canonicalJson([...CHECKPOINT_V22_EXPECTED_CHANGED_DEBATE_FIELDS].sort()),
      `${debateNumber}: changed top-level field set drifted`
    );

    const span = spans[index];
    const beforeObject = source.slice(span.start, span.endExclusive);
    const replacement = replacementBytes(candidate);
    targetIndexes.add(index);
    records.push({
      debateNumber,
      debateId: candidate.id,
      sourceObjectIndex: index,
      sourceSpan: span,
      beforeObjectBytes: Buffer.byteLength(beforeObject),
      beforeObjectSha256: sha256(beforeObject),
      replacementBytes: Buffer.byteLength(replacement),
      replacementSha256: sha256(replacement),
      changedTopLevelFields: changedFields,
      immutableIdentityAndDisplayFieldsVerified:
        CHECKPOINT_V22_IMMUTABLE_DEBATE_FIELDS,
      currentDate: before.date,
      proposedDate: candidate.date,
      currentScore: before.score,
      proposedScore: candidate.score,
      sections: candidate.sections.length,
      moves: countMoves(candidate),
      replacement
    });
  }

  let cursor = 0;
  let projectedSource = "";
  const outsideTargetSpanSegments = [];
  for (const record of [...records].sort(
    (left, right) => left.sourceSpan.start - right.sourceSpan.start
  )) {
    const untouchedSegment = source.slice(cursor, record.sourceSpan.start);
    outsideTargetSpanSegments.push(untouchedSegment);
    projectedSource += untouchedSegment;
    projectedSource += record.replacement;
    cursor = record.sourceSpan.endExclusive;
  }
  const untouchedTail = source.slice(cursor);
  outsideTargetSpanSegments.push(untouchedTail);
  projectedSource += untouchedTail;

  const evaluated = evaluateDebatesSource(projectedSource);
  assertV4(
    evaluated.debates.length === currentDebates.length &&
      evaluated.publishedDebates.length === currentDebates.length,
    "projected production source changed debate counts"
  );
  for (const record of records) {
    const projected = evaluated.publishedDebates.find(
      (debate) => debate.number === record.debateNumber
    );
    assertV4(
      canonicalJson(projected) ===
        canonicalJson(candidatesByNumber.get(record.debateNumber)),
      `${record.debateNumber}: projected debate differs from final candidate`
    );
  }

  const otherObjectBuffers = spans
    .map((span, index) => ({ span, index }))
    .filter(({ index }) => !targetIndexes.has(index))
    .map(({ span }) => source.slice(span.start, span.endExclusive));
  const otherObjects = otherObjectBuffers.join("");
  const outsideTargetSpans = outsideTargetSpanSegments.join("");

  return {
    projectedSource,
    projectedDebates: evaluated.publishedDebates,
    records,
    sourceProof: {
      beforeBytes: Buffer.byteLength(source),
      beforeSha256: sha256(source),
      projectedAfterBytes: Buffer.byteLength(projectedSource),
      projectedAfterSha256: sha256(projectedSource),
      debateObjects: spans.length,
      replacedDebateObjects: records.length,
      unchangedDebateObjects: spans.length - records.length,
      unchangedDebateObjectBytes: Buffer.byteLength(otherObjects),
      unchangedDebateObjectSha256: sha256(otherObjects),
      outsideTargetSpanBytes: Buffer.byteLength(outsideTargetSpans),
      outsideTargetSpanSha256: sha256(outsideTargetSpans),
      outsideTargetSpansPreservedByExactSlicing: true
    }
  };
}

function relativeToRoot(root, file) {
  const relative = path.relative(root, file);
  assertV4(!relative.startsWith(".."), `generated output escaped root: ${file}`);
  return relative;
}

export async function renderSeoOutputsInMemory({ root, debates, tag }) {
  const generatorPath = path.join(root, "scripts/generate-seo-pages.mjs");
  const raw = await readFile(generatorPath, "utf8");
  const writes = new Map();
  globalThis.__checkpointSeoMock = {
    mkdir: async () => {},
    rm: async () => {},
    readFile: async () => {
      throw new Error("SEO write-mode projection unexpectedly read an output file");
    },
    writeFile: async (file, content) => writes.set(file, String(content)),
    log: () => {}
  };

  let source = raw;
  const substitutions = [
    [
      'import { mkdir, readFile, rm, writeFile } from "node:fs/promises";',
      "const { mkdir, readFile, rm, writeFile } = globalThis.__checkpointSeoMock;"
    ],
    [
      'import { publishedDebates as debates } from "../src/data/debates.js";',
      `const debates = ${JSON.stringify(debates)};`
    ],
    [
      'from "../src/data/interlocutors.js";',
      `from ${JSON.stringify(pathToFileURL(path.join(root, "src/data/interlocutors.js")).href)};`
    ],
    [
      'from "../src/data/references.js";',
      `from ${JSON.stringify(pathToFileURL(path.join(root, "src/data/references.js")).href)};`
    ],
    [
      'from "../src/seo.js";',
      `from ${JSON.stringify(pathToFileURL(path.join(root, "src/seo.js")).href)};`
    ],
    [
      'const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));',
      `const root = ${JSON.stringify(root)};`
    ],
    [
      'const checkOnly = process.argv.includes("--check");',
      "const checkOnly = false;"
    ],
    ["console.log(", "globalThis.__checkpointSeoMock.log("]
  ];
  for (const [before, after] of substitutions) {
    assertV4(source.includes(before), `SEO projection substitution missing: ${before}`);
    source = source.replace(before, after);
  }

  try {
    const moduleUrl =
      `data:text/javascript;base64,${Buffer.from(source).toString("base64")}` +
      `#${encodeURIComponent(tag)}-${sha256(JSON.stringify(debates)).slice(0, 16)}`;
    await import(moduleUrl);
  } finally {
    delete globalThis.__checkpointSeoMock;
  }

  return new Map(
    [...writes.entries()].map(([file, content]) => [
      relativeToRoot(root, file),
      content
    ])
  );
}

export function summarizeSeoProjection({ beforeOutputs, afterOutputs }) {
  assertV4(
    beforeOutputs.size === afterOutputs.size,
    "SEO output count changed during projection"
  );
  const changed = [];
  const unchanged = [];
  for (const [outputPath, afterContent] of afterOutputs) {
    assertV4(
      beforeOutputs.has(outputPath),
      `new SEO output path appeared: ${outputPath}`
    );
    const beforeContent = beforeOutputs.get(outputPath);
    const record = {
      path: outputPath,
      beforeBytes: Buffer.byteLength(beforeContent),
      beforeSha256: sha256(beforeContent),
      projectedAfterBytes: Buffer.byteLength(afterContent),
      projectedAfterSha256: sha256(afterContent)
    };
    if (beforeContent === afterContent) {
      unchanged.push({
        path: outputPath,
        bytes: record.beforeBytes,
        sha256: record.beforeSha256
      });
    } else {
      changed.push(record);
    }
  }
  changed.sort((left, right) => left.path.localeCompare(right.path));
  unchanged.sort((left, right) => left.path.localeCompare(right.path));
  return {
    generatedOutputs: afterOutputs.size,
    changedOutputs: changed,
    unchangedOutputs: unchanged.length,
    unchangedOutputsManifestSha256: sha256(serializedJson(unchanged))
  };
}

export function publicProjectionRecord(record) {
  const { replacement, ...publicRecord } = record;
  return publicRecord;
}
