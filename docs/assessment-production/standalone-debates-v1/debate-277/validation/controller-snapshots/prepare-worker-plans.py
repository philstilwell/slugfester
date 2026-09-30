import argparse, hashlib, json
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--debate', required=True)
p.add_argument('--phase', choices=['primary', 'adjudication', 'publication'], required=True)
a = p.parse_args()
root = Path.cwd()
registry = json.loads((root/'docs/assessment-production/standalone-debates-v1/registry.json').read_text())
entry = next(x for x in registry['debates'] if x['debateNumber'] == a.debate)
base = root/entry['root']
manifest = json.loads((base/'manifest.json').read_text())
assert manifest['debateId'] == entry['debateId']

def record(p):
    p = p.resolve()
    assert p.is_relative_to(root)
    data = p.read_bytes()
    return {'path':str(p.relative_to(root)), 'sha256':hashlib.sha256(data).hexdigest(), 'bytes':len(data)}

shared = [root/manifest['sourceLocks']['indexedTranscript']['path'], base/'source/assessment-source-notes.md', base/'source/source-lock.json']
if a.phase == 'primary':
    folder = base/'judgments'
    inputs = [folder/'contract.md', folder/'judgment-packet.json', base/'inventory/inventory.json', *shared, root/'docs/reassessment-rubric-v2.1.md', root/'docs/assessment-production-workflow.md', folder/'validator-excerpt.txt', folder/'check-judgment.mjs']
    targets = [(folder/x, {'pass':x}) for x in ['pass-a','pass-b']]
elif a.phase == 'adjudication':
    folder = base/'adjudication'
    inputs = [folder/'contract.md', folder/'packet.json', base/'inventory/inventory.json', *shared, base/'audio/audio-verification.json', root/'docs/reassessment-rubric-v2.1.md', folder/'validator-excerpt.txt', folder/'check-adjudication.mjs']
    targets = [(folder, {})]
else:
    folder = base/'publication'
    inputs = [folder/'contract.md', folder/'build-packet.json', folder/'skeleton.json', base/'inventory/inventory.json', base/'final-ledger/final-ledger.json', base/'score-pass/output.json', *shared, folder/'reference-metrics.json', folder/'check-publication.mjs']
    targets = [(folder, {})]

records = [record(x) for x in inputs]
for target, fields in targets:
    target.mkdir(parents=True, exist_ok=True)
    output = target/('first-submission-parts.json' if a.phase == 'publication' else 'output.json')
    planpath = target/'execution-plan.json'
    assert not output.exists() and not planpath.exists()
    plan = {'schemaVersion':'1.0-isolated-worker-execution-plan','status':'frozen-before-execution','phase':a.phase,'debateNumber':a.debate,'debateId':entry['debateId'],**fields,'model':manifest['modelSettings'],'allowedInputs':records,'fullReadRequiredForAllAllowedInputs':True,'outputPath':str(output),'allowedOutputPaths':[str(output)],'portableOutputPath':str(output.relative_to(root)),'attempts':1,'retries':0,'directIncrementalCostUsd':0,'instructions':'Confirm absolute destination and fully read every allowlisted input without truncation. Send checkpoint and await authenticated reading release. Build the actual unsaved candidate in small persistent-memory chunks. Validate through the allowed stdin checker; emit the complete checked unsaved JSON for controller source/editorial review. Await separate submission release, save the approved bytes once, then stop. No candidate temporary files or other inputs.','isolation':'Fresh subscription context, fork none, protocol-restricted disjoint inputs/output; no OS sandbox claimed.'}
    planpath.write_text(json.dumps(plan,indent=2)+'\n')
    print(json.dumps({'plan':record(planpath),'outputPath':str(output),'phase':a.phase,**fields}))
