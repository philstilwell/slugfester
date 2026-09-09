import assert from 'node:assert/strict';
import {publicationCards,validateTeamProse} from './assessment-team-prose-v1.mjs';
export function applyCorrectedTeamProse(prior,score,diagnostics,packet,replacement){
 assert.deepEqual(Object.keys(replacement).sort(),['status','shardId','fields'].sort());assert.equal(replacement.status,'complete-publication-field-repair');assert.equal(replacement.shardId,packet.shardId);assert.deepEqual(Object.keys(replacement.fields),Object.keys(packet.fields));assert.equal(Object.keys(replacement.fields).length,1);
 const next=structuredClone(prior),candidate=next.candidate;
 const [field,text]=Object.entries(replacement.fields)[0];assert(field.endsWith('.critique'));assert(typeof text==='string');const words=text.trim().split(/\s+/).length;assert(words>=105&&words<=130);assert(text.length>=880);const parts=text.split(/(?=Principal limitation:|Live burden:|Locked score:)/).map(x=>x.trim()),labels=['Strongest feature:','Principal limitation:','Live burden:','Locked score:'];assert.equal(parts.length,4);assert(parts.every((p,i)=>p.startsWith(labels[i])&&/[.!?]$/.test(p)));assert.equal((text.match(/[.!?](?=\s|$)/g)??[]).length,4);assert(parts[3].includes(String(packet.lockedCardScore)));assert(!/\bcattle\b/i.test(text));
 const keys=field.split('.');let target=candidate;for(const k of keys.slice(0,-1))target=target[k];assert.equal(target[keys.at(-1)],packet.fields[field]);assert.equal(target.ledgerMoveId,packet.source[0].moveId);target[keys.at(-1)]=text;
 const scoreMoves=new Map(score.sections.flatMap(s=>Object.values(s.sides).flatMap(x=>x.moves)).map(m=>[m.moveId,m]));
 for(const card of publicationCards(candidate)){const value=scoreMoves.get(card.ledgerMoveId).score;if(card.ledgerMoveId!==packet.source[0].moveId)assert.equal(card.score,value,'An unrelated card score changed');card.score=value;}
 candidate.sections.forEach((section,i)=>{for(const side of ['pro','con'])section.score[side]=score.sections[i].sides[side].score;});
 for(const side of ['pro','con']){candidate.score[side]=score.overall[side].score;candidate.overall[side].score=score.overall[side].score;}candidate.score.winner=score.winner;candidate.teamDiagnostics=structuredClone(diagnostics);
 // Factual provenance notes are generated from the authorized correction, not
 // a second editorial rewrite or an alteration of argumentative content.
 candidate.sourceNote+=' One caption word, “chattel,” was corrected following user confirmation and agreement with the saved audio transcription.';
 assert(candidate.scoringNote.includes('independent reviews and one final calculation'));
 candidate.scoringNote=candidate.scoringNote.replace('independent reviews and one final calculation','independent reviews and a fixed calculation method; a confirmed transcription correction received two fresh clarity-only reviews and one authorized replacement calculation, with the original result retained in the audit record');
 assert.equal(validateTeamProse(candidate).status,'passed');return next;
}
export function validateCorrectedProseProvenance(run,prior){
 const execution=run.read(run.local('publication/prose-execution.json')),amendment=run.read(run.correction.assessmentAmendment.path);assert.equal(execution.status,'passed-publication-prose');assert.equal(execution.correctionKind,'authorized-source-word-clarity-correction');
 for(const k of ['authorization','assessmentAmendment','priorExecution','priorOutput','output'])run.check(execution[k]);assert.deepEqual(execution.assessmentAmendment,run.correction.assessmentAmendment);assert.deepEqual(execution.priorOutput,prior.execution.output);assert.equal(execution.priorExecution.path,run.historicalLocal('publication/prose-execution.json'));
 const ctx=execution.context;for(const k of ['intent','dispatch','packet','prompt','output'])run.check(ctx[k]);assert.equal(ctx.modelSlug,'gpt-5.6-sol');assert.equal(ctx.reasoningEffort,'low');assert.equal(ctx.forkTurns,'none');assert.equal(ctx.attempts,1);assert.equal(ctx.directIncrementalCostUsd,0);assert.equal(ctx.authentication,'ChatGPT subscription');assert(!prior.agents.has(ctx.agentId));const dispatch=run.read(ctx.dispatch.path);assert.equal(dispatch.agentId,ctx.agentId);
 const intent=run.read(ctx.intent.path);assert.equal(intent.attemptsAllowed,1);assert.deepEqual(intent.packet,ctx.packet);assert.deepEqual(intent.prompt,ctx.prompt);assert.equal(intent.output,ctx.output.path);
 const packet=run.read(ctx.packet.path),scoreAtt=run.read(amendment.scoreAttestation.path);assert.deepEqual(packet.assessmentAmendment,run.correction.assessmentAmendment);assert.deepEqual(packet.authorization,execution.authorization);
 const scores=run.read(scoreAtt.output.path),diagnostics=run.read(run.local('score-pass/diagnostics.json')),publication=applyCorrectedTeamProse(prior.publication,scores,diagnostics,packet,run.read(ctx.output.path));assert.deepEqual(run.read(execution.output.path),publication);assert.deepEqual(execution.validation,validateTeamProse(publication.candidate));assert.equal(execution.otherEditorialFieldChanges,0);assert.equal(execution.directIncrementalCostUsd,0);
 return {execution,publication,agents:new Set([...prior.agents,ctx.agentId]),prior};
}
