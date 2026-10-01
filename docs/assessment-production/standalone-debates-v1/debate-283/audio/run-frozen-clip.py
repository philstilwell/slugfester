"""One explicit, frozen audio input per invocation; no automatic paid retry."""
import argparse
import hashlib
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("--plan", required=True)
p.add_argument("--clip", required=True)
a = p.parse_args()
root = Path.cwd().resolve()
plan_path = (root / a.plan).resolve()
plan = json.loads(plan_path.read_text())
registry = json.loads((root / "docs/assessment-production/standalone-debates-v1/registry.json").read_text())
entry = next(x for x in registry["debates"] if x["debateNumber"] == plan["debateNumber"])
assert entry["debateId"] == plan["debateId"] and entry["videoId"] == plan["videoId"]
assert plan_path.is_relative_to(root / entry["root"])
assert plan["automaticRetries"] == 0

def checked(rec):
    path = (root / rec["path"]).resolve()
    assert path.is_relative_to(root)
    data = path.read_bytes()
    assert len(data) == rec["bytes"] and hashlib.sha256(data).hexdigest() == rec["sha256"]
    return path

checked(plan["inventory"])
checked(plan["acquisition"])
for rec in plan["tools"]:
    checked(rec)
clip = next(x for x in plan["clips"] if x["clipId"] == a.clip)
audio = checked(clip)
refs = [(x["speaker"], checked(x)) for x in plan["knownSpeakers"]]
out = root / clip["responsePath"]
attempt = root / clip["attemptPath"]
completion = root / clip["completionPath"]
assert not any(x.exists() for x in [out, attempt, completion])
assert clip["attemptLimit"] == 1
index = plan["clips"].index(clip)
for prev in plan["clips"][:index]:
    state = json.loads((root / prev["completionPath"]).read_text())
    assert state["status"] == "succeeded", "Earlier paid input unresolved; no automatic continuation."
out.parent.mkdir(parents=True, exist_ok=True)
skill = Path(plan["transcribeSkillCli"]["externalLocalPath"])
assert hashlib.sha256(skill.read_bytes()).hexdigest() == plan["transcribeSkillCli"]["sha256"]
spec = importlib.util.spec_from_file_location("frozen_transcribe_skill", skill)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
from openai import OpenAI
client = OpenAI(max_retries=0, timeout=plan["timeoutSeconds"])
names, references = module._parse_known_speakers([name + "=" + str(path) for name, path in refs])
args = argparse.Namespace(model=plan["model"], response_format=plan["responseFormat"], chunking_strategy=plan["chunkingStrategy"], language=plan["language"], prompt=None)
payload = module._build_payload(args, names, references)
now = lambda: datetime.now(timezone.utc).isoformat()
with attempt.open("x") as f:
    json.dump({"status":"started-once", "startedAt":now(), "clipId":a.clip, "inputSha256":clip["sha256"], "model":plan["model"], "automaticRetries":0, "planningAllowanceUsd":clip["planningAllowanceUsd"]}, f, indent=2)
try:
    result = module._run_one(client, audio, payload)
    raw = module._format_output(result, plan["responseFormat"])
    with out.open("x") as f:
        f.write(raw + "\n")
    data = json.loads(raw)
    state = {"status":"succeeded", "completedAt":now(), "clipId":a.clip, "responseSha256":hashlib.sha256(out.read_bytes()).hexdigest(), "responseBytes":out.stat().st_size, "usage":data.get("usage"), "duration":data.get("duration"), "requestId":getattr(result,"_request_id",None), "automaticRetries":0}
except Exception as exc:
    state = {"status":"failed-or-transport-uncertain", "completedAt":now(), "clipId":a.clip, "exceptionType":type(exc).__name__, "httpStatus":getattr(exc,"status_code",None), "requestId":getattr(exc,"request_id",None), "automaticRetries":0, "maximumPossibleCallCostUsd":clip["planningAllowanceUsd"]}
    with completion.open("x") as f:
        json.dump(state, f, indent=2)
    print(json.dumps(state))
    raise SystemExit(1)
with completion.open("x") as f:
    json.dump(state, f, indent=2)
print(json.dumps(state))
