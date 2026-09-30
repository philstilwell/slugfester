import { test } from '@playwright/test';
import { REGISTRY, readJson, openRun } from '../../scripts/lib/standalone-workflow.mjs';
import { browserConfig, replayStaticScope } from '../../scripts/lib/standalone-publication-check.mjs';
import { replayPublication } from '../../scripts/lib/standalone-browser-replay.mjs';
import { publishedDebates } from '../../src/data/debates.js';

test('checks standalone publication before deployment, including static scope and every graph bucket', async ({page,baseURL})=>{
  test.setTimeout(180_000);
  const entries=readJson(REGISTRY).debates.filter(x=>publishedDebates.some(d=>d.id===x.debateId) && x.validationProfile!=='team-approximation-v1');
  const entry=entries.sort((a,b)=>Number(b.debateNumber)-Number(a.debateNumber))[0];
  const cfg=await browserConfig(openRun(process.cwd(),entry.debateNumber),{origin:baseURL,screenshots:false});
  await replayStaticScope(page,cfg);
  await replayPublication(page,cfg);
});
