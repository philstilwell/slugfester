import { mkdtemp, mkdir, copyFile, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { sha256 } from "./assessment-production-post-canary-batch-17-production-publication.mjs";

export const POST_CANARY_BATCH_17_GENERATED_SEO_CORRECTION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-17/production-publication/generated-seo-correction";
export const POST_CANARY_BATCH_17_GENERATED_SEO_CORRECTION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-17-generated-seo-derivative-correction";
export const POST_CANARY_BATCH_17_GENERATED_SEO_OUTPUT_COUNT = 380;
export const POST_CANARY_BATCH_17_GENERATOR_INPUT_PATHS = Object.freeze([
  "package.json",
  "scripts/generate-seo-pages.mjs",
  "src/seo.js",
  "src/data/debates.js",
  "src/data/interlocutors.js",
  "src/data/references.js"
]);

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(absolutePath)));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

export function generatedPathSetDigest(records) {
  return sha256(records.map((record) => `${record.path}\n`).sort().join(""));
}

export function generatedInventoryDigest(records) {
  return sha256(
    records
      .map(
        (record) =>
          `${record.path}\t${record.baselineSha256}\t${record.baselineBytes}\t${record.proposedSha256}\t${record.proposedBytes}\n`
      )
      .sort()
      .join("")
  );
}

export async function runIsolatedBatch17SeoGenerator(repositoryRoot) {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "slugfester-batch-17-seo-")
  );
  try {
    for (const relativePath of POST_CANARY_BATCH_17_GENERATOR_INPUT_PATHS) {
      const destination = path.join(temporaryRoot, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(repositoryRoot, relativePath), destination);
    }
    const run = spawnSync(
      process.execPath,
      [path.join(temporaryRoot, "scripts/generate-seo-pages.mjs")],
      { cwd: temporaryRoot, encoding: "utf8" }
    );
    if (run.status !== 0) {
      throw new Error(
        `isolated SEO generator failed: ${run.stderr || run.stdout}`
      );
    }
    const excluded = new Set(POST_CANARY_BATCH_17_GENERATOR_INPUT_PATHS);
    const generatedPaths = (await walkFiles(temporaryRoot))
      .map((absolutePath) => path.relative(temporaryRoot, absolutePath).split(path.sep).join("/"))
      .filter((relativePath) => !excluded.has(relativePath))
      .sort();
    const outputs = await Promise.all(
      generatedPaths.map(async (relativePath) => {
        const content = await readFile(path.join(temporaryRoot, relativePath));
        return {
          path: relativePath,
          sha256: sha256(content),
          bytes: content.length,
          content
        };
      })
    );
    return {
      stdout: run.stdout,
      stderr: run.stderr,
      outputs,
      pathSetSha256: generatedPathSetDigest(outputs)
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
