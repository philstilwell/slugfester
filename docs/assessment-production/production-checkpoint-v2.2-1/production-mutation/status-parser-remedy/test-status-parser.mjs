#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  exactChangedPaths,
  parseGitStatusPorcelainV1Z
} from "./status-parser.mjs";

const requiredFirstPath =
  "debate/craig-harris-moral-foundations-2011/index.html";
const requiredUntrackedPath =
  "docs/assessment-ledgers/craig-harris-moral-foundations-2011.json";

const fixture = Buffer.from(
  ` M ${requiredFirstPath}\0?? ${requiredUntrackedPath}\0`,
  "utf8"
);
const fixtureEntries = parseGitStatusPorcelainV1Z(fixture);
assert.deepEqual(fixtureEntries, [
  { status: " M", path: requiredFirstPath },
  { status: "??", path: requiredUntrackedPath }
]);
assert.deepEqual(exactChangedPaths(fixture), [
  requiredFirstPath,
  requiredUntrackedPath
]);
assert.equal(fixture[0], 0x20);

const renameFixture = Buffer.from("R  new-name\0old-name\0", "utf8");
assert.deepEqual(parseGitStatusPorcelainV1Z(renameFixture), [
  { status: "R ", path: "new-name", originalPath: "old-name" }
]);
assert.throws(
  () => parseGitStatusPorcelainV1Z(Buffer.from(` M ${requiredFirstPath}`)),
  /not NUL terminated/
);
assert.throws(
  () => parseGitStatusPorcelainV1Z(` M ${requiredFirstPath}\0`),
  /Buffer or Uint8Array/
);

const temporaryRepository = mkdtempSync(
  path.join(tmpdir(), "slugfester-status-parser-")
);

try {
  const runGit = (args, options = {}) =>
    execFileSync("git", args, {
      cwd: temporaryRepository,
      stdio: options.stdio ?? "pipe",
      encoding: options.encoding
    });

  runGit(["init", "--quiet"]);
  runGit(["config", "user.name", "Slugfester Parser Test"]);
  runGit(["config", "user.email", "slugfester-parser-test@example.invalid"]);

  const trackedAbsolutePath = path.join(temporaryRepository, requiredFirstPath);
  mkdirSync(path.dirname(trackedAbsolutePath), { recursive: true });
  writeFileSync(trackedAbsolutePath, "baseline\n", "utf8");
  writeFileSync(path.join(temporaryRepository, "sitemap.xml"), "baseline\n", "utf8");
  const trackedLedgerPlaceholder = path.join(
    temporaryRepository,
    "docs/assessment-ledgers/.gitkeep"
  );
  mkdirSync(path.dirname(trackedLedgerPlaceholder), { recursive: true });
  writeFileSync(trackedLedgerPlaceholder, "", "utf8");
  runGit([
    "add",
    requiredFirstPath,
    "sitemap.xml",
    "docs/assessment-ledgers/.gitkeep"
  ]);
  runGit(["commit", "--quiet", "-m", "parser fixture baseline"]);

  writeFileSync(trackedAbsolutePath, "projected\n", "utf8");
  const untrackedAbsolutePath = path.join(
    temporaryRepository,
    requiredUntrackedPath
  );
  mkdirSync(path.dirname(untrackedAbsolutePath), { recursive: true });
  writeFileSync(untrackedAbsolutePath, "{}\n", "utf8");

  const rawStatus = runGit(["status", "--porcelain=v1", "-z"]);
  assert.equal(Buffer.isBuffer(rawStatus), true);
  assert.equal(rawStatus[0], 0x20);

  const actualEntries = parseGitStatusPorcelainV1Z(rawStatus);
  assert.equal(actualEntries[0].status, " M");
  assert.equal(actualEntries[0].path, requiredFirstPath);
  assert.deepEqual(
    actualEntries.map(({ path: entryPath }) => entryPath),
    [requiredFirstPath, requiredUntrackedPath]
  );

  console.log(
    JSON.stringify(
      {
        status: "passed",
        fixtureRecords: fixtureEntries.length,
        actualGitRecords: actualEntries.length,
        actualFirstStatus: actualEntries[0].status,
        actualFirstRawByte: rawStatus[0],
        actualFirstPath: actualEntries[0].path,
        completeFirstPathPreserved: actualEntries[0].path === requiredFirstPath,
        whitespaceTrimmingPerformed: false,
        meteredApiCostUsd: 0
      },
      null,
      2
    )
  );
} finally {
  rmSync(temporaryRepository, { recursive: true, force: true });
}
