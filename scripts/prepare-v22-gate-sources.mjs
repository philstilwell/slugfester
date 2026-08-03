#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = path.resolve(".");
const gateRoot = path.join(workspaceRoot, "docs", "calibration", "v2.2", "complete-gate");
const rawRoot = path.join(workspaceRoot, "output", "transcribe", "v2.2-audio-verification");
const verifiedAt = "2026-08-03T00:08:00Z";

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

async function fileDigest(filePath) {
  return sha256(await readFile(filePath));
}

function workspaceRelative(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join("/");
}

const debates = [
  {
    debateId: "dillahunty-ten-bruggencate-reasonable-god-2014",
    debateNumber: "05",
    videoId: "OL8LREmbDi0",
    sourceInventory: "docs/calibration/v2.1/complete-gate/inventories/dillahunty-ten-bruggencate-reasonable-god-2014.json",
    references: [
      ["Sye Ten Bruggencate", "sye-ten-bruggencate.wav"],
      ["Matt Dillahunty", "matt-dillahunty.wav"]
    ],
    moves: [
      {
        moveId: "D05-M007",
        originalSpeaker: "Sye Ten Bruggencate",
        resolvedSpeaker: "Sye Ten Bruggencate",
        clip: "D05-M007.wav",
        transcript: "D05-M007.transcript.json",
        verificationExcerpt: "Right, but the fact is you've admitted you could be a brain in a vat.",
        speakerEvidence: "The known-speaker diarization assigns the opening challenge, modal inference, and closing basis question to Sye; Matt's interleaved correction is separately labeled."
      },
      {
        moveId: "D05-M008",
        originalSpeaker: "Matt Dillahunty",
        resolvedSpeaker: "Matt Dillahunty",
        clip: "D05-M008.wav",
        transcript: "D05-M008.transcript.json",
        verificationExcerpt: "If something hasn't been demonstrated to be impossible, is it then possible?",
        speakerEvidence: "The known-speaker diarization assigns both diagnostic questions and their application to Matt; Sye's short answers are separately labeled."
      },
      {
        moveId: "D05-M012",
        originalSpeaker: "Sye Ten Bruggencate",
        resolvedSpeaker: "Sye Ten Bruggencate",
        clip: "D05-M012.wav",
        transcript: "D05-M012.transcript.json",
        verificationExcerpt: "Logical absolutes reflect the thinking of God.",
        speakerEvidence: "The known-speaker diarization identifies Matt's demonstration request, followed by Sye's account and revelation answer."
      },
      {
        moveId: "D05-M013",
        originalSpeaker: "Sye Ten Bruggencate",
        resolvedSpeaker: "Sye Ten Bruggencate",
        clip: "D05-M013.wav",
        transcript: "D05-M013.transcript.json",
        verificationExcerpt: "Is it circular to use your reasoning to justify your reasoning?",
        speakerEvidence: "The known-speaker diarization assigns the repeated circularity challenge and final inference to Sye; Matt's practical-necessity response is distinct."
      },
      {
        moveId: "D05-M015",
        originalSpeaker: "Sye Ten Bruggencate",
        resolvedSpeaker: "Sye Ten Bruggencate",
        clip: "D05-M015.wav",
        transcript: "D05-M015.transcript.json",
        verificationExcerpt: "On what basis do you assume that the future will be like the past?",
        speakerEvidence: "The known-speaker diarization assigns the mortality analogy and renewed induction question to Sye, with Matt's replies separately marked."
      },
      {
        moveId: "D05-M022",
        originalSpeaker: "Matt Dillahunty",
        resolvedSpeaker: "Unidentified audience members",
        clip: "D05-M022.wav",
        transcript: "D05-M022.transcript.json",
        verificationExcerpt: "Is it possible that God has supplied you with a revelation that is at least in part false?",
        speakerEvidence: "Audio and diarization show two audience questions addressed to Sye. Matt did not ask the selected questions; Sye supplied the substantive answers.",
        correction: {
          field: "speaker",
          before: "Matt Dillahunty",
          after: "Unidentified audience members",
          reason: "The v2.1 mixed-dialogue caption span collapsed audience questions and answers and incorrectly attributed the critical move to Matt."
        }
      }
    ]
  },
  {
    debateId: "rasmussen-oppy-ultimate-reality-naturalism-2020",
    debateNumber: "81",
    videoId: "YhqFdIb13bk",
    sourceInventory: "docs/calibration/v2.1/complete-gate/inventories/rasmussen-oppy-ultimate-reality-naturalism-2020.json",
    references: [
      ["Joshua Rasmussen", "joshua-rasmussen.wav"],
      ["Graham Oppy", "graham-oppy.wav"]
    ],
    moves: [
      {
        moveId: "M08",
        originalSpeaker: "Joshua Rasmussen",
        resolvedSpeaker: "Joshua Rasmussen",
        clip: "M08.wav",
        transcript: "M08.transcript.json",
        verificationExcerpt: "What happens if you shave off the arbitrary limits?",
        speakerEvidence: "The span begins with Oppy's historical setup; diarization identifies Rasmussen's response from the arbitrary-limits question onward."
      },
      {
        moveId: "M09",
        originalSpeaker: "Graham Oppy",
        resolvedSpeaker: "Graham Oppy",
        clip: "M09.wav",
        transcript: "M09.transcript.json",
        verificationExcerpt: "One thing that's interesting is your claim that you can deduce all this stuff from supremacy.",
        speakerEvidence: "The span begins with Rasmussen finishing his proposal; known-speaker diarization identifies Oppy's objection after the handoff."
      },
      {
        moveId: "M21",
        originalSpeaker: "Joshua Rasmussen",
        resolvedSpeaker: "Joshua Rasmussen",
        clip: "M21.wav",
        transcript: "M21.transcript.json",
        verificationExcerpt: "Me too, because of these sort of philosophical framings.",
        speakerEvidence: "The span begins with Oppy's neuroscience objection; known-speaker diarization identifies Rasmussen's concession and type-identity reply after the handoff."
      },
      {
        moveId: "M22",
        originalSpeaker: "Joshua Rasmussen",
        resolvedSpeaker: "Joshua Rasmussen",
        clip: "M22.wav",
        transcript: "M22.transcript.json",
        verificationExcerpt: "Distinguishing between type identity and token identity I think is helpful here.",
        speakerEvidence: "Known-speaker diarization separates Oppy's identity-view clarification from Rasmussen's type/token response."
      },
      {
        moveId: "M23",
        originalSpeaker: "Graham Oppy",
        resolvedSpeaker: "Graham Oppy",
        clip: "M23-extended.wav",
        transcript: "M23-extended.transcript.json",
        verificationExcerpt: "On its own, finding some little point on which one worldview seems to have an advantage over the other is generally not very interesting.",
        speakerEvidence: "The original span contains only the moderator's question. Extended audio identifies Oppy's answer from 01:50:33 through 01:52:06, followed by Rasmussen.",
        correction: {
          field: "sourceSpan.endMs and captionExcerpt",
          before: "6623010; moderator-only caption excerpt",
          after: "6726910; audio-verified Oppy answer",
          reason: "The v2.1 anchor ended before the attributed speaker began, so the original span could not support the selected move."
        }
      },
      {
        moveId: "M25",
        originalSpeaker: "Graham Oppy",
        resolvedSpeaker: "Graham Oppy",
        clip: "M25.wav",
        transcript: "M25.transcript.json",
        verificationExcerpt: "That's partly true, but partly not because we kind of know already that there's lots of stuff we just agree about.",
        speakerEvidence: "The span begins with Rasmussen's local-comparison proposal; known-speaker diarization identifies Oppy's qualification after the handoff."
      }
    ]
  },
  {
    debateId: "craig-frazier-goff-folley-god-reality-2026",
    debateNumber: "95",
    videoId: "ZVMMO_kgtDQ",
    sourceInventory: "docs/calibration/v2.1/complete-gate/inventories/craig-frazier-goff-folley-god-reality-2026.json",
    references: [
      ["William Lane Craig", "william-lane-craig.wav"],
      ["Jessica Frazier", "jessica-frazier.wav"],
      ["Philip Goff", "philip-goff.wav"],
      ["Joe Folley", "joe-folley.wav"]
    ],
    moves: [
      {
        moveId: "S5-M4",
        originalSpeaker: "Philip Goff",
        resolvedSpeaker: "Philip Goff",
        clip: "S5-M4.wav",
        transcript: "S5-M4.transcript.json",
        verificationExcerpt: "Imagine someone whose fundamental life goal is counting blades of grass.",
        speakerEvidence: "Known-speaker diarization assigns the Hume discussion and grass-counting counterexample continuously to Goff."
      },
      {
        moveId: "S5-M5",
        originalSpeaker: "Jessica Frazier",
        resolvedSpeaker: "Jessica Frazier",
        clip: "S5-M5.wav",
        transcript: "S5-M5.transcript.json",
        verificationExcerpt: "It means that God is just another authority who, regardless of whether he's moral or not, has got the power to decide for us.",
        speakerEvidence: "Known-speaker diarization separates Folley and Goff's brief setup from Frazier's authority and political-danger objection."
      }
    ]
  }
];

await mkdir(path.join(gateRoot, "audio-verification"), { recursive: true });
await mkdir(path.join(gateRoot, "inventories"), { recursive: true });

for (const debate of debates) {
  const rawDebateRoot = path.join(rawRoot, debate.videoId);
  const sourceAudioPath = path.join(rawDebateRoot, "source.m4a");
  const sourceInventoryPath = path.join(workspaceRoot, debate.sourceInventory);
  const sourceInventorySource = await readFile(sourceInventoryPath, "utf8");
  const sourceInventory = JSON.parse(sourceInventorySource);

  const referenceRecords = [];
  for (const [speaker, fileName] of debate.references) {
    const referencePath = path.join(rawDebateRoot, "refs", fileName);
    referenceRecords.push({
      speaker,
      localPath: workspaceRelative(referencePath),
      sha256: await fileDigest(referencePath),
      durationSeconds: 8
    });
  }

  const moveRecords = [];
  for (const move of debate.moves) {
    const clipPath = path.join(rawDebateRoot, "clips", move.clip);
    const transcriptPath = path.join(rawDebateRoot, "transcripts", move.transcript);
    const transcript = JSON.parse(await readFile(transcriptPath, "utf8"));
    moveRecords.push({
      moveId: move.moveId,
      originalSpeaker: move.originalSpeaker,
      resolvedSpeaker: move.resolvedSpeaker,
      status: "verified",
      verificationConfidence: "high",
      method: "gpt-4o-transcribe-diarize with known-speaker references, checked against the local caption event chain",
      clip: {
        localPath: workspaceRelative(clipPath),
        sha256: await fileDigest(clipPath),
        durationSeconds: transcript.duration
      },
      transcript: {
        localPath: workspaceRelative(transcriptPath),
        sha256: await fileDigest(transcriptPath),
        model: "gpt-4o-transcribe-diarize",
        responseFormat: "diarized_json"
      },
      verificationExcerpt: move.verificationExcerpt,
      speakerEvidence: move.speakerEvidence,
      ...(move.correction ? { sourceQaCorrection: move.correction } : {})
    });
  }

  const audioAudit = {
    schemaVersion: "2.2-audio-verification",
    workflowVersion: "Slugfester Reassessment Workflow v2.2",
    debateId: debate.debateId,
    videoId: debate.videoId,
    calibrationOnly: true,
    verifiedAt,
    sourceAudio: {
      sourceUrl: `https://www.youtube.com/watch?v=${debate.videoId}`,
      localPath: workspaceRelative(sourceAudioPath),
      sha256: await fileDigest(sourceAudioPath),
      storage: "ignored local artifact"
    },
    speakerReferences: referenceRecords,
    moves: moveRecords,
    totals: {
      mediumOrLowMoves: moveRecords.length,
      verified: moveRecords.length,
      unresolved: 0,
      verificationRate: 1,
      sourceQaCorrections: moveRecords.filter((move) => move.sourceQaCorrection).length
    },
    costScope: {
      approved: true,
      estimate: "$0.10–$0.50 expected; $1 ceiling",
      billableModelCalls: moveRecords.length + (debate.debateId === "rasmussen-oppy-ultimate-reality-naturalism-2020" ? 1 : 0),
      note: "The extra #81 call verified the corrected M23 span. Rejected preflight calls produced no transcript artifact."
    }
  };
  const audioAuditPath = path.join(gateRoot, "audio-verification", `${debate.debateId}.json`);
  const audioAuditSource = `${JSON.stringify(audioAudit, null, 2)}\n`;
  await writeFile(audioAuditPath, audioAuditSource);
  const audioAuditSha256 = sha256(audioAuditSource);

  const verificationByMoveId = new Map(moveRecords.map((move) => [move.moveId, move]));
  const inventory = structuredClone(sourceInventory);
  inventory.schemaVersion = "2.2-argument-inventory";
  inventory.workflowVersion = "Slugfester Reassessment Workflow v2.2";
  inventory.rubricVersion = "Slugfester Reassessment Rubric v2.2";
  inventory.debateNumber = debate.debateNumber;
  inventory.controlledRerun = {
    sourceInventory: debate.sourceInventory,
    sourceInventorySha256: sha256(sourceInventorySource),
    unchanged: ["burdens", "sections", "section weights", "move IDs", "move sides", "move importance"],
    permittedSourceQaChanges: ["audio verification metadata", "D05-M022 speaker correction", "M23 source-span repair"]
  };
  inventory.source.audioVerification = workspaceRelative(audioAuditPath);
  inventory.source.audioVerificationSha256 = audioAuditSha256;
  inventory.source.audioSpotCheckPerformed = true;
  inventory.source.audioSpotChecksPerformed = true;

  for (const section of inventory.sections) {
    for (const move of section.moves) {
      const verification = verificationByMoveId.get(move.id);
      if (!verification) continue;
      move.audioChecked = true;
      move.audioVerification = {
        status: "verified",
        path: workspaceRelative(audioAuditPath),
        sha256: audioAuditSha256,
        resolvedSpeaker: verification.resolvedSpeaker
      };
      move.speaker = verification.resolvedSpeaker;
      if (verification.sourceQaCorrection) move.sourceQaCorrection = verification.sourceQaCorrection;
      if (move.id === "M23") {
        move.sourceSpan.endMs = 6726910;
        move.captionExcerpt = "On its own, finding some little point on which one worldview seems to have an advantage over the other, all else being equal, is generally going to turn out not to be very interesting. The question you really want to know is which is a better worldview, because careful selection can make either worldview look better with respect to one datum.";
        move.quoteKind = "audio-verified-condensation";
      }
    }
  }

  const inventoryPath = path.join(gateRoot, "inventories", `${debate.debateId}.json`);
  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      debates: debates.length,
      mediumOrLowMovesVerified: debates.reduce((total, debate) => total + debate.moves.length, 0),
      unresolved: 0,
      sourceQaCorrections: 2,
      outputRoot: workspaceRelative(gateRoot)
    },
    null,
    2
  )
);
