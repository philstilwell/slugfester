import argparse
import hashlib
import importlib.util
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from openai import OpenAI

parser = argparse.ArgumentParser()
parser.add_argument('--debate', required=True)
parser.add_argument('--clip', type=int, required=True)
parser.add_argument('--move', required=True)
parser.add_argument('--first-event', type=int)
parser.add_argument('--last-event', type=int)
parser.add_argument('--execute', action='store_true')
args = parser.parse_args()
def read(p):
    return json.loads(Path(p).read_text())
record = next(r for r in read('docs/assessment-production/standalone-debates-v1/registry.json')['debates'] if str(r['debateNumber']) == args.debate)
base = Path(record['root'])
inventory = read(base / 'inventory/inventory.json')
move = next(m for m in inventory['moves'] if m['moveId'] == args.move)
root = base / 'audio' / ('supplemental-wording-check-' + str(args.clip))
media = Path('output/transcribe') / ('debate' + args.debate + '-wording-check-' + str(args.clip)) / 'source-clip.webm'
duration = float(json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(media)]))['format']['duration'])
start = move['sourceSpan']['startMs'] / 1000 - 10
end = move['sourceSpan']['endMs'] / 1000 + 10
assert (args.first_event is None) == (args.last_event is None)
if args.first_event is not None:
    assert move['sourceSpan']['startEvent'] <= args.first_event <= args.last_event <= move['sourceSpan']['endEvent']
    events = read(Path('.assessment-cache/captions') / record['videoId'] / 'events.json')
    start = events[args.first_event]['startMs'] / 1000 - 10
    end = (events[args.last_event]['startMs'] + events[args.last_event]['durationMs']) / 1000 + 10
assert 0 < duration < end - start + 15
assert duration >= end - start - 1
assert media.stat().st_size < 25 * 1024 * 1024
assert os.environ.get('OPENAI_API_KEY')
prior_plans = [read(p) for p in (base / 'audio').glob('supplemental-wording-check-*/plan.json')]
prior_estimate = sum(p['clipEstimateUsd'] for p in prior_plans)
full_seconds = read(base / 'source/source-lock.json')['content']['sourceDurationMs'] / 1000
estimate = duration / 60 * .006
assert full_seconds / 60 * .006 <= 1
assert prior_estimate + estimate <= 1
source_module = Path('/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py')
spec = importlib.util.spec_from_file_location('transcribe_skill', source_module)
skill = importlib.util.module_from_spec(spec)
spec.loader.exec_module(skill)
payload = {'model': 'gpt-4o-transcribe', 'response_format': 'json', 'language': 'en', 'chunking_strategy': 'auto'}
plan = {
    'debateNumber': record['debateNumber'], 'debateId': record['debateId'], 'videoId': record['videoId'],
    'purpose': 'Resolve independent reviewer wording concerns; verify what was said, not empirical truth. Preserve frozen captions, inventory, ratings and confidence.',
    'sourceMoveIds': [args.move], 'canonicalSourceUrl': 'https://www.youtube.com/watch?v=' + record['videoId'],
    'requestedClipSourceSeconds': [start, end],
    'focusedSourceEventRange': [args.first_event, args.last_event] if args.first_event is not None else None,
    'timingLimitation': 'Stream-copy clip may include preroll; no new exact word timestamps are inferred.',
    'media': {'path': str(media), 'sha256': hashlib.sha256(media.read_bytes()).hexdigest(), 'bytes': media.stat().st_size, 'durationSeconds': duration},
    'transcribeSkillScriptSha256': hashlib.sha256(source_module.read_bytes()).hexdigest(),
    'payload': payload, 'attemptsAllowed': 1, 'automaticRetries': 0,
    'pricingSource': 'https://developers.openai.com/api/docs/pricing', 'tokenPricingSource': 'https://developers.openai.com/api/docs/models/gpt-4o-transcribe',
    'estimatedRateUsdPerMinute': .006, 'inputUsdPerMillion': 2.5, 'outputUsdPerMillion': 10,
    'fullDebateSeconds': full_seconds, 'fullDebateEstimateUsd': full_seconds / 60 * .006,
    'fullDebateTranscriptionPlanned': False,
    'fullDebateCostDisposition': 'Reference estimate only: complete frozen public captions already exist, and no full-debate paid call is planned or made. Only the bounded verification clips consume the cumulative cap.',
    'clipEstimateUsd': estimate, 'priorPaidCallsConservativeEstimateUsd': prior_estimate,
    'fullDebatePlusAllClipsEstimateUsd': full_seconds / 60 * .006 + prior_estimate + estimate,
    'maximumPlannedCumulativeCostUsd': prior_estimate + estimate,
    'cumulativeAuthorizedCapUsd': 1, 'estimateReportedBeforeCall': True, 'noTranscriptOrLeadingPromptSent': True,
}
if not args.execute:
    print(json.dumps(plan, indent=2))
    raise SystemExit()
root.mkdir(parents=True, exist_ok=True)
def freeze(name, data):
    with (root / name).open('x') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
freeze('plan.json', plan)
freeze('attempt-started.json', {'startedAt': datetime.now(timezone.utc).isoformat(), 'attempt': 1, 'retries': 0, 'inputSha256': plan['media']['sha256']})
try:
    with OpenAI(max_retries=0, timeout=120) as client:
        result = skill._run_one(client, media, payload)
    data = result.model_dump()
    freeze('response.json', data)
    usage = data['usage']
    cost = (usage['input_tokens'] * 2.5 + usage['output_tokens'] * 10) / 1000000
    freeze('execution.json', {'status': 'successful-single-call', 'completedAt': datetime.now(timezone.utc).isoformat(), 'attempts': 1, 'retries': 0, 'usage': usage, 'knownSuccessfulCallCostUsd': cost, 'maximumPossibleTotalCostUsd': max(cost, estimate), 'costBasis': 'Returned usage and published token rates, not an independently inspected invoice; maximum retains the larger frozen duration estimate. No uncertain paid calls.', 'failedOrTransportUncertainCalls': 0, 'responseSha256': hashlib.sha256((root/'response.json').read_bytes()).hexdigest(), 'directListeningPerformed': False, 'evidenceMethod': 'Independent audio transcription with no caption prompt'})
    print(json.dumps(data, indent=2))
except Exception as exc:
    freeze('execution.json', {'status': 'failed-or-transport-uncertain-no-retry', 'completedAt': datetime.now(timezone.utc).isoformat(), 'errorType': type(exc).__name__, 'attempts': 1, 'retries': 0, 'possibleIncurredEstimateUsd': estimate, 'billingNotConfirmed': True})
    print('Transcription failed; preserved attempt. No retry. Error type: ' + type(exc).__name__)
    raise SystemExit(1)
