import assert from 'node:assert/strict';
import {referenceDefinitions} from '../../src/data/references.js';
import {publicationCards,validateTeamProse,wordCount} from './assessment-team-prose-v1.mjs';
import {validateTeamTagReview,validateTeamTagAdjudication,teamTagUnion,publicTag,teamTagReviewBase} from './assessment-team-tags-v1.mjs';
import {validateSecondProseException} from './assessment-team-prose-exception-v1.mjs';
import {validateTeamProseRestoration} from './assessment-team-prose-restoration-v1.mjs';
import {validateCorrectedProseProvenance} from './assessment-team-corrected-prose-v1.mjs';
const assertExecution=meta=>{assert.equal(meta.modelSlug,'gpt-5.6-sol');assert.equal(meta.reasoningEffort,'low');assert.equal(meta.authentication,'ChatGPT subscription');assert.equal(meta.directIncrementalCostUsd,0);assert.equal(meta.forkTurns,'none');assert.equal(meta.attempts,1);assert(meta.agentId);};
const setField=(object,field,value)=>{const keys=field.split('.');let target=object;for(const key of keys.slice(0,-1))target=target[key];assert.equal(typeof target[keys.at(-1)],'string');target[keys.at(-1)]=value;};
export function validateTeamProseProvenance(run){
  if(run.correction){assert(!run.record.publicationHold,'Correction must be activated before publication');const historical={...run,correction:null,local:run.historicalLocal};return validateCorrectedProseProvenance(run,validateTeamProseProvenance(historical));}
  assert(!run.record.publicationHold,'Unresolved publication hold: do not continue or publish');
  const {read,check,local}=run,execution=read(local('publication/prose-execution.json'));assert.equal(execution.status,'passed-publication-prose');
  for(const key of ['plan','priorStop','priorRepairCheckpoint','exceptionAuthorization','output'])check(execution[key]);
  const initial=execution.initial;assertExecution(initial);for(const key of ['intent','dispatch','packet','prompt','output','rejection'])check(initial[key]);
  const initialIntent=read(initial.intent.path);assert.equal(initialIntent.output,initial.output.path);assert.deepEqual(initialIntent.packet,initial.packet);assert.deepEqual(initialIntent.prompt,initial.prompt);
  const expected=read(initial.output.path),plan=read(execution.plan.path),checkpoint=read(execution.priorRepairCheckpoint.path),authority=read(execution.exceptionAuthorization.path),stop=read(execution.priorStop.path);
  assert.deepEqual(plan.initial,initial.output);assert.deepEqual(plan.rejection,initial.rejection);assert.deepEqual(authority.allowedFields,stop.exhaustedFields);assert.equal(authority.additionalAttempts,1);assert.equal(authority.paidCallsAuthorized,0);check(authority.priorOutput);check(authority.stop);assert.deepEqual(authority.stop,execution.priorStop);
  const allowed=new Set(plan.shards.flatMap(s=>s.fields));assert.equal(allowed.size,plan.fieldCount);assert(plan.shards.every(s=>s.fields.length>=1&&s.fields.length<=2));
  const applied=new Set(),agents=new Set([initial.agentId]);
  const restored=validateTeamProseRestoration(run);check(execution.serializationRestoration);check(execution.thirdCheckpoint);
  const restoration=read(execution.serializationRestoration.path);assert.equal(restoration.status,'passed-exact-draft-serialization-restoration');check(restoration.authorization);check(restoration.output);assert.deepEqual(read(restoration.authorization.path),restored.authority);assert.deepEqual(read(restoration.output.path),restored.output);assert.deepEqual(restoration.validation,restored.validation);assert.equal(restoration.newModelCalls,0);assert.equal(restoration.textChanges,0);assert.equal(restoration.scoreChanges,0);assert.equal(restoration.originalAgentId,restored.dispatch.agentId);assert(!agents.has(restored.dispatch.agentId));agents.add(restored.dispatch.agentId);
  for(const [field,value] of Object.entries(restored.output.fields)){assert(allowed.has(field)&&!applied.has(field));setField(expected.candidate,field,value);applied.add(field);}
  const second=validateSecondProseException(run);check(execution.secondException);check(execution.secondCheckpoint);assert.deepEqual(read(execution.secondException.path),second.execution);
  for(const old of second.authority.priorOutputs){check(old);for(const [field,value] of Object.entries(read(old.path).fields)){if(second.authority.allowedFields.includes(field))continue;assert(allowed.has(field)&&!applied.has(field));setField(expected.candidate,field,value);applied.add(field);}}
  for(const old of checkpoint.completed){for(const key of ['intent','dispatch','packet','prompt','output','validation'])check(old[key]);if(old.status!=='failed-repair-preserved')continue;
    const output=read(old.output.path);assert.deepEqual(old.failedFields,authority.allowedFields);assert.deepEqual(old.output,authority.priorOutput);
    for(const field of old.passingFields){assert(allowed.has(field));setField(expected.candidate,field,output.fields[field]);applied.add(field);}
  }
  for(const context of execution.contexts){assertExecution(context);assert(!agents.has(context.agentId));agents.add(context.agentId);for(const key of ['intent','dispatch','packet','prompt','output'])check(context[key]);if(context.additionalInstruction)check(context.additionalInstruction);if(context.currentStatusSupplement){check(context.currentStatusSupplement);assert.deepEqual(context.currentStatusSupplement,second.execution.supplement);}
    const intent=read(context.intent.path),dispatch=read(context.dispatch.path),packet=read(context.packet.path),output=read(context.output.path);assert.equal(intent.output,context.output.path);assert.deepEqual(intent.packet,context.packet);assert.deepEqual(intent.prompt,context.prompt);assert.equal(dispatch.agentId,context.agentId);assert.equal(intent.attemptsAllowed,1);
    assert.equal(output.status,'complete-publication-field-repair');assert.equal(output.shardId,packet.shardId);assert.deepEqual(Object.keys(output.fields).sort(),Object.keys(packet.fields).sort());
    const keys=Object.keys(output.fields);assert(keys.length<=2);if(context.exception){const a=context.exception==='second'?second.authority:authority;assert.deepEqual(keys,a.allowedFields);check(intent.authorization);check(intent.guard);assert.deepEqual(intent.authorization,context.exception==='second'?second.execution.authorization:execution.exceptionAuthorization);}else{const shard=plan.shards.find(s=>s.shardId===output.shardId);assert(shard);assert.deepEqual(shard.packet,context.packet);assert.deepEqual(shard.prompt,context.prompt);}
    for(const [field,value] of Object.entries(output.fields)){assert(allowed.has(field));assert(!applied.has(field));assert.equal(typeof value,'string');setField(expected.candidate,field,value);applied.add(field);}
  }
  assert.deepEqual([...applied].sort(),[...allowed].sort());assert.deepEqual(execution.changedFields.toSorted(),[...allowed].sort());assert.deepEqual(read(execution.output.path),expected);
  assert.equal(execution.judgmentChanges,0);assert.equal(execution.scoreChanges,0);assert.equal(execution.additionalDirectCostUsd,0);assert.deepEqual(execution.validation,validateTeamProse(expected.candidate));assert.equal(execution.validation.status,'passed');
  const packet=read(initial.packet.path);
  const unchanged=(template,actual)=>{if(template==='WRITE'){assert(typeof actual==='string'&&actual&&actual!=='WRITE');return;}if(template&&typeof template==='object'){assert.deepEqual(Object.keys(actual),Object.keys(template));for(const key of Object.keys(template))unchanged(template[key],actual[key]);}else assert.deepEqual(actual,template);};unchanged(packet.candidateTemplate,expected.candidate);
  const novelty=expected.noveltyMap,items=['pro','con'].flatMap(side=>expected.candidate.logicalExtension[side].newArguments.map(a=>({side,title:a.title})));assert.equal(novelty.length,items.length);
  novelty.forEach((n,i)=>{assert.equal(n.side,items[i].side);assert.equal(n.title,items[i].title);assert(wordCount(n.distinctContribution)>=12);assert(Array.isArray(n.sourceMoveIds));assert(n.sourceMoveIds.every(id=>packet.source.moves.some(m=>m.moveId===id)));});
  return {execution,publication:expected,agents};
}
export function validateTeamTagProvenance(run,source,prose){
  const {read,check,local}=run,route=run.record.rhetoricalTagReview;assert(route);
  const execution=read(route.executionPath),audit=read(route.auditPath);assert.equal(execution.status,'passed-two-blind-reviews-adjudication-and-final-definition-check');assert.equal(audit.status,'passed-rhetorical-tag-review');assert.equal(execution.debateId,run.record.debateId);assert.equal(audit.debateId,run.record.debateId);
  for(const key of ['catalogSnapshot','sourcePacket','proseOutput'])check(execution[key]);assert.deepEqual(execution.proseOutput,prose.execution.output);
  const packet=read(execution.sourcePacket.path),catalog=Object.entries(referenceDefinitions).flatMap(([type,definitions])=>Object.entries(definitions).map(([slug,d])=>({type,slug,label:d.label,definition:d.definition,url:d.externalUrl})));
  assert.deepEqual(read(execution.catalogSnapshot.path),catalog);assert.deepEqual(packet.catalog,catalog);
  const cards=publicationCards(prose.publication.candidate),expectedMoves=cards.map(c=>{const m=source.inventory.moves.find(m=>m.moveId===c.ledgerMoveId);return {moveId:m.moveId,speaker:m.speaker,side:m.side,proposition:m.proposition,sourceSpan:m.sourceSpan,incrementalContribution:m.incrementalContribution,respondsToIds:m.respondsToIds,critique:c.critique.split('Locked score:')[0].replace(/\b\d+(?:\/100)?\b/g,'[number omitted]').trim()};});assert.deepEqual(packet.moves,expectedMoves);
  assert.equal(execution.contexts.length,3);assert.equal(new Set(execution.contexts.map(c=>c.agentId)).size,3);
  for(const c of execution.contexts){assertExecution(c);assert(!prose.agents.has(c.agentId));assert.equal(c.retries,0);for(const k of ['intent','dispatch','input','prompt','output'])check(c[k]);const intent=read(c.intent.path),dispatch=read(c.dispatch.path);assert.equal(intent.attemptsAllowed,1);assert.equal(intent.output,c.output.path);assert.deepEqual(intent.packet,c.input);assert.deepEqual(intent.prompt,c.prompt);assert.equal(dispatch.agentId,c.agentId);}
  const reviewers=execution.contexts.filter(c=>c.role.startsWith('blind-review-'));assert.equal(reviewers.length,2);reviewers.forEach(c=>assert.deepEqual(c.input,execution.sourcePacket));const reviews=reviewers.map(c=>read(c.output.path));reviews.forEach(r=>validateTeamTagReview(packet,r));
  for(const c of reviewers){const pass=c.role==='blind-review-a'?'pass-a':'pass-b',base=teamTagReviewBase(run,pass);assert.equal(c.intent.path,`${base}/execution-intent.json`);assert.equal(c.dispatch.path,`${base}/dispatch.json`);if(run.record.rhetoricalReviewRecovery?.pass===pass){assert.deepEqual(c.authorizedReplacement,run.record.rhetoricalReviewRecovery);const failure=read(c.authorizedReplacement.priorFailure.path);assert.notEqual(c.agentId,read(failure.originalDispatch.path).agentId);}}
  const adjudicator=execution.contexts.find(c=>c.role==='anonymous-adjudication');assert(adjudicator);const adjudicationPacket=read(adjudicator.input.path),adjudication=read(adjudicator.output.path);assert.deepEqual(adjudicationPacket.moves,packet.moves);assert.deepEqual(adjudicationPacket.candidates,teamTagUnion(packet,reviews));validateTeamTagAdjudication(adjudicationPacket,adjudication);
  const expected=structuredClone(prose.publication),accepted=adjudication.decisions.filter(d=>d.decision==='accepted').map(publicTag);
  for(const card of publicationCards(expected.candidate))card.tags=accepted.filter(t=>t.moveId===card.ledgerMoveId).map(({moveId,rationale,...tag})=>tag);
  assert.deepEqual(read(local('publication/output.json')),expected);assert.deepEqual(audit.reviewedMoveIds,packet.moves.map(m=>m.moveId));assert.deepEqual(audit.candidateReviews,adjudication.decisions);assert.deepEqual(audit.acceptedTags,publicationCards(expected.candidate).flatMap(c=>accepted.filter(t=>t.moveId===c.ledgerMoveId)));assert.deepEqual(audit.controllerOverrides,[]);
  assert.equal(audit.audit.judgmentChanges,0);assert.equal(audit.audit.scoreChanges,0);assert.equal(audit.audit.moveChanges,0);
  return {execution,audit,publication:expected};
}
export function validateTeamEditorialAndRendering(run,candidate){
  const audit=run.read(run.local('publication/editorial-audit.json'));assert.equal(audit.status,'passed-source-specific-publication-review');assert.deepEqual(audit.reviewedMoveIds,publicationCards(candidate).map(c=>c.ledgerMoveId));
  for(const key of ['claimReasonInference','critiqueSpecificity','scoreConsistency','quoteContext','overallMateriality','novelty','naturalPunctuation','nonformulaicBothSides']){assert.equal(audit.checks[key].passed,true);assert(wordCount(audit.checks[key].rationale)>=12);}
  const rendering=run.read(run.local('rendering/audit.json'));assert.equal(rendering.status,'passed-team-publication-rendering');assert.deepEqual(rendering.viewports.map(v=>[v.width,v.height]),[[1440,1000],[390,844]]);
  for(const v of rendering.viewports){assert.equal(v.consoleErrors,0);assert.equal(v.failedResources,0);assert.equal(v.horizontalOverflow,false);assert.equal(v.pointerAndKeyboardPassed,true);assert.equal(v.correctScoresAndOwnership,true);run.check(v.collapsedScreenshot);run.check(v.openedScreenshot);}assert.equal(rendering.viewports[1].distantTapAfterCritiquePassed,true);
  assert.deepEqual(rendering.profileChecks.map(p=>p.speaker),['pro','con'].flatMap(side=>candidate.sides[side].speakers));for(const p of rendering.profileChecks){assert.equal(p.teamAppearanceListed,true);assert.equal(p.teamScoreExcludedFromIndividualAverage,true);assert.equal(p.biographyVisible,true);}
  for(const key of ['homepage','debateRoute','search','topicPage','sitemap','rankingExclusion'])assert.equal(rendering.siteChecks[key],true);
  assert.equal(rendering.cleanup.browserSessionsRemaining,0);assert.equal(rendering.cleanup.temporaryServersRemaining,0);
  return {audit,rendering};
}
