const ANSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const STRUCTURED_RETRY_PATTERN = /^(?<timestamp>\S+)\s+WARN\s+codex_core::responses_retry:\s+stream disconnected - retrying sampling request \((?<ordinal>\d+)\/(?<maximum>\d+)(?: in (?<delay>[^)]+))?\)\.\.\.\s+turn_id=(?<turnId>\S+)\s+retries=(?<retries>\d+)\s+max_retries=(?<maxRetries>\d+)\b(?<detail>.*)$/;

export function parseStructuredStreamRetries(log) {
  const events = [];
  for (const sourceLine of String(log).split(/\r?\n/)) {
    const line = sourceLine.replace(ANSI_PATTERN, "");
    const match = line.match(STRUCTURED_RETRY_PATTERN);
    if (!match) continue;
    const event = {
      timestamp: match.groups.timestamp,
      component: "codex_core::responses_retry",
      turnId: match.groups.turnId,
      retryOrdinal: Number(match.groups.ordinal),
      retryMaximum: Number(match.groups.maximum),
      retries: Number(match.groups.retries),
      maxRetries: Number(match.groups.maxRetries)
    };
    if (match.groups.delay) event.delay = match.groups.delay;
    const detail = match.groups.detail.trim();
    if (detail) event.detail = detail;
    events.push(event);
  }
  return events;
}

export function validateStructuredStreamRetries(events) {
  for (const event of events) {
    if (!Number.isInteger(event.retryOrdinal) || event.retryOrdinal < 1) throw new Error("stream retry ordinal invalid");
    if (!Number.isInteger(event.retryMaximum) || event.retryMaximum < event.retryOrdinal) throw new Error("stream retry maximum invalid");
    if (!Number.isInteger(event.retries) || event.retries !== event.retryOrdinal) throw new Error("stream retry counter mismatch");
    if (!Number.isInteger(event.maxRetries) || event.maxRetries !== event.retryMaximum) throw new Error("stream retry maximum mismatch");
    if (!event.turnId) throw new Error("stream retry turn ID missing");
  }
  return events;
}
