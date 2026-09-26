import { createHash } from "node:crypto";

// Cache versions and modification dates are consequences, not editorial changes.
function contentOnly(value) {
  if (Array.isArray(value)) return value.map(contentOnly);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !["lastmod", "modifiedTime", "updatedTime", "dateModified"].includes(key))
      .map(([key, item]) => [key, contentOnly(item)]));
  }
  return typeof value === "string" ? value.replace(/\?v=[a-f0-9]{16}/g, "?v=CONTENT") : value;
}

export function pageHistoryEntry(previous, content, today) {
  const fingerprint = createHash("sha256").update(JSON.stringify(contentOnly(content))).digest("hex");
  return previous?.fingerprint === fingerprint
    ? previous
    : { fingerprint, modified: today };
}

export function compactPageDates(history) {
  const counts = new Map();
  for (const { modified } of Object.values(history)) counts.set(modified, (counts.get(modified) || 0) + 1);
  const defaultDate = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
  return {
    defaultDate,
    overrides: Object.fromEntries(Object.entries(history).filter(([, value]) => value.modified !== defaultDate).map(([path, value]) => [path, value.modified]))
  };
}
