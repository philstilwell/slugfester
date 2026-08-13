function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function asBuffer(raw) {
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) {
    return Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
  }
  throw new TypeError("git status output must be a Buffer or Uint8Array");
}

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(`${label} is not valid UTF-8: ${error.message}`);
  }
}

function findNul(bytes, offset, label) {
  const end = bytes.indexOf(0, offset);
  invariant(end >= 0, `${label} is not NUL terminated`);
  return end;
}

export function parseGitStatusPorcelainV1Z(raw) {
  const bytes = asBuffer(raw);
  const entries = [];
  let offset = 0;

  while (offset < bytes.length) {
    const recordEnd = findNul(bytes, offset, `record ${entries.length}`);
    const record = bytes.subarray(offset, recordEnd);
    invariant(record.length >= 4, `record ${entries.length} is too short`);
    invariant(record[2] === 0x20, `record ${entries.length} has no status/path separator`);

    const status = String.fromCharCode(record[0], record[1]);
    const path = decodeUtf8(record.subarray(3), `record ${entries.length} path`);
    invariant(path.length > 0, `record ${entries.length} has an empty path`);
    offset = recordEnd + 1;

    const entry = { status, path };
    if (status.includes("R") || status.includes("C")) {
      const originalPathEnd = findNul(
        bytes,
        offset,
        `record ${entries.length} original path`
      );
      const originalPath = decodeUtf8(
        bytes.subarray(offset, originalPathEnd),
        `record ${entries.length} original path`
      );
      invariant(
        originalPath.length > 0,
        `record ${entries.length} has an empty original path`
      );
      entry.originalPath = originalPath;
      offset = originalPathEnd + 1;
    }

    entries.push(entry);
  }

  return entries;
}

export function exactChangedPaths(raw) {
  return parseGitStatusPorcelainV1Z(raw).map(({ path }) => path);
}
