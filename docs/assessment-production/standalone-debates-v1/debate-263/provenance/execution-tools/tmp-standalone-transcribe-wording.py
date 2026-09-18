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
parser.add_argument('--execute', action='store_true')
args = parser.parse_args()
registry = json.loads(Path('docs/assessment-production/standalone-debates-v1/registry.json').read_text())
record = next(r for r in registry['debates'] if str(r['debateNumber']) == args.debate)
root = Path(record['root']) / 'audio' / 'supplemental-wording-check-1'
media = Path('output/transcribe') / ('debate' + args.debate + '-wording-check-1') / 'source-clip.webm'
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,start_time,size', '-of', 'json', str(media)]))
duration = float(probe['format']['duration'])
assert 100 < duration < 125
assert os.environ.get('OPENAI_API_KEY')
source_module = Path('/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py')
spec = importlib.util.spec_from_file_location('transcribe_skill', source_module)
skill = importlib.util.module_from_spec(spec)
spec.loader.exec_module(skill)
payload = {'model': 'gpt-4o-transcribe', 'response_format': 'json', 'language': 'en', 'chunking_strategy': 'auto'}
plan = {
    'debateNumber': record['debateNumber'], 'debateId': record['debateId'], 'videoId': record['videoId'],
    'purpose': 'Resolve reviewers’ material wording concern in the fossil-record answer without changing the frozen caption source, inventory, ratings, or confidence values.',
    'sourceMoveIds': ['fossil-record-limits-common-descent'],
    'canonicalSourceUrl': 'https://www.youtube.com/watch?v=' + record['videoId'],
    'requestedClipSourceSeconds': [7197.76, 7304.679],
    'timingLimitation': 'Stream-copy clip includes preroll. Requested range is not asserted as exact clip zero; this is a wording check, not replacement timestamp evidence.',
    'media': {'path': str(media), 'sha256': hashlib.sha256(media.read_bytes()).hexdigest(), 'bytes': media.stat().st_size, 'durationSeconds': duration},
    'transcribeSkillScriptSha256': hashlib.sha256(source_module.read_bytes()).hexdigest(),
    'payload': payload, 'attemptsAllowed': 1, 'automaticRetries': 0,
    'pricingSource': 'https://developers.openai.com/api/docs/pricing',
    'estimatedRateUsdPerMinute': 0.006, 'fullDebateSeconds': 8735,
    'fullDebateEstimateUsd': 8735 / 60 * .006,
    'clipEstimateUsd': duration / 60 * .006,
    'fullDebatePlusClipEstimateUsd': (8735 + duration) / 60 * .006,
    'priorPaidCostUsd': 0, 'cumulativeAuthorizedCapUsd': 1,
    'estimateReportedBeforeCall': True,
    'noTranscriptOrLeadingPromptSent': True,
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
    freeze('execution.json', {'status': 'successful-single-call', 'completedAt': datetime.now(timezone.utc).isoformat(), 'attempts': 1, 'retries': 0, 'usage': data.get('usage'), 'successfulCallEstimatedCostUsd': plan['clipEstimateUsd'], 'failedOrTransportUncertainCalls': 0, 'responseSha256': hashlib.sha256((root/'response.json').read_bytes()).hexdigest(), 'directListeningPerformed': False, 'evidenceMethod': 'Independent audio transcription with no caption prompt'})
    print(json.dumps(data, indent=2))
except Exception as exc:
    freeze('execution.json', {'status': 'failed-or-transport-uncertain-no-retry', 'completedAt': datetime.now(timezone.utc).isoformat(), 'errorType': type(exc).__name__, 'attempts': 1, 'retries': 0, 'possibleIncurredEstimateUsd': plan['clipEstimateUsd'], 'billingNotConfirmed': True})
    print('Transcription failed; preserved attempt. No retry. Error type: ' + type(exc).__name__)
    raise SystemExit(1)
