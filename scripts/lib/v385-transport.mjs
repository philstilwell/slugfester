export function extractTransportEvents(stderr) {
  const ansi = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
  const lines = stderr.replace(ansi, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines
    .filter((line) => /^Reconnecting\.\.\./i.test(line) || /\bresponse\s+stream\b.*\b(?:disconnect|reconnect|resum|recover)/i.test(line) || /\bstream\s+(?:was\s+)?(?:disconnect|reconnect|resum|recover)/i.test(line) || /\b(?:disconnect|reconnect|resum|recover)\w*\b.*\bresponse\s+stream\b/i.test(line))
    .map((line) => line.slice(0, 600));
}

export function classifyTransportEventCount(count, normalMaximum, hardMaximum) {
  if (!Number.isInteger(count) || count < 0) throw new Error("transport event count must be a nonnegative integer");
  if (!Number.isInteger(normalMaximum) || !Number.isInteger(hardMaximum) || normalMaximum < 0 || hardMaximum < normalMaximum) throw new Error("transport event thresholds invalid");
  return count <= normalMaximum ? "clean" : count <= hardMaximum ? "recovered-degraded" : "invalid";
}
