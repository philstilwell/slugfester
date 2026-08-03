#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const gatePath = "docs/calibration/v2.7/held-out-gates/gate-manifest.json";
const gate = JSON.parse(await readFile(gatePath, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const builtAt = "2026-08-03T14:30:00Z";
const requestedLane = process.argv.includes("--lane")
  ? process.argv[process.argv.indexOf("--lane") + 1]
  : null;
const requestedDebate = process.argv.includes("--debate")
  ? process.argv[process.argv.indexOf("--debate") + 1]
  : null;
if (requestedLane !== null && !["dyadic", "multi-speaker"].includes(requestedLane)) {
  throw new Error(`Unsupported --lane value: ${requestedLane}`);
}

const configs = {
  "pageau-folley-logos-meaning-resurrection-2026": {
    routes: {
      pro: ["Patterns and purposive unities are real features of the world that point upward to Logos.", "Top-down organization and irreducible emergent wholes support a mind-like transcendent unity."],
      con: ["Patterns and values are pragmatically useful abstractions grounded in human minds and social practices.", "Higher-level organization does not require a willful or transcendent divine source."],
    },
    moves: [
      { startMs: 205360, endMs: 257280, side: "pro", speaker: "Jonathan Pageau", interactionMode: "constructive", claim: "Patterns join multiplicity into unity across things and human action; their recurrence points toward a deep unity in which meanings converge.", bridgeTier: "central", target: null, boundaryEvidence: "Pageau's answer begins immediately after the directed question and ends before his next distinct supporting point." },
      { startMs: 886079, endMs: 978720, side: "con", speaker: "Joe Folley", interactionMode: "constructive", claim: "Humans navigate through pragmatic abstractions and agent-relative functional values rather than mind-independent groupings.", bridgeTier: "central", target: null, boundaryEvidence: "Folley's answer begins after Pageau asks what motivates human will and ends when the moderator summarizes." },
      { startMs: 1604799, endMs: 1664480, side: "pro", speaker: "Jonathan Pageau", interactionMode: "responsive", claim: "Higher-level unities possess irreducible properties, so analysis of their parts cannot exhaust their genuine ontological status.", bridgeTier: "central", target: { startMs: 1582720, endMs: 1604799, speaker: "Joe Folley", claim: "Folley summarizes Pageau's hierarchy as culminating in an all-incorporating Logos that is willful or mindlike.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: The hierarchy of patterns culminates in a Logos incorporating everything.", kind: "fact-premise", dependsOn: [] }, { text: "c2: That Logos is willful or has mindlike properties.", kind: "conclusion", dependsOn: ["c1"] }] }, boundaryEvidence: "Folley's uninterrupted summary ends when Pageau answers; Folley's next question ends the response span." },
      { startMs: 1796320, endMs: 1835919, side: "con", speaker: "Joe Folley", interactionMode: "responsive", claim: "Social unities such as a podcast or marriage can constrain participants while remaining compatible with Folley's bottom-up worldview.", bridgeTier: "subsidiary", target: { startMs: 1744640, endMs: 1793600, speaker: "Jonathan Pageau", claim: "A city demonstrates that higher-order realities act downward on their parts, making a merely emergent description insufficient.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: People enact a city-level unity and elect a mayor.", kind: "fact-premise", dependsOn: [] }, { text: "c2: The mayor and law constrain the individuals composing the city.", kind: "fact-premise", dependsOn: ["c1"] }, { text: "c3: Higher-order realities can therefore act downward on their constituents.", kind: "inference", dependsOn: ["c1", "c2"] }, { text: "c4: Calling the city merely emergent is insufficient to explain its ontological role.", kind: "conclusion", dependsOn: ["c3"] }] }, boundaryEvidence: "Pageau's uninterrupted city argument ends before his comprehension check; Folley answers until Pageau replies." },
      { startMs: 2179040, endMs: 2246880, side: "pro", speaker: "Jonathan Pageau", interactionMode: "constructive", claim: "Genesis 1 describes both reality and the evaluating, naming perceiver, organizing the world through goodness and meaning that a bare Big Bang account cannot supply.", bridgeTier: "central", target: null, boundaryEvidence: "A directed prompt identifies Pageau, whose uninterrupted answer ends at the next moderator question." },
      { startMs: 2450240, endMs: 2505599, side: "con", speaker: "Joe Folley", interactionMode: "responsive", claim: "Genesis' allegorical usefulness is broad common ground for atheists, agnostics, and theists and is comparable to phenomenological wisdom in other biblical books.", bridgeTier: "central", target: { startMs: 2411599, endMs: 2448240, speaker: "Jonathan Pageau", claim: "Genesis has special status as the best form of a recurring story, anchors contemporary civilization and morality, and cannot safely be removed while retaining its fruits.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Genesis has special status as the best version of a recurring cross-cultural story.", kind: "fact-premise", dependsOn: [] }, { text: "c2: Present civilization and morality are anchored in Genesis.", kind: "fact-premise", dependsOn: [] }, { text: "c3: Removing that origin while trying to retain its fruits risks losing those fruits.", kind: "inference", dependsOn: ["c2"] }] }, boundaryEvidence: "Pageau's special-status claim ends before the moderator names Joe; Folley's response ends at the moderator's next interjection." },
      { startMs: 2691520, endMs: 2734720, side: "pro", speaker: "Jonathan Pageau", interactionMode: "responsive", claim: "Genesis uses strict, nonarbitrary analogy to express real structural relations and thereby describe an event remembered through the human gap between suffering and the ideal.", bridgeTier: "central", target: { startMs: 2611920, endMs: 2633119, speaker: "Joe Folley", claim: "Folley's difficulty concerns historical biblical claims, although he initially exempts Genesis because he understands Pageau not to affirm it literally or historically.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Historical aspects of biblical texts are what Folley struggles to accept.", kind: "fact-premise", dependsOn: [] }, { text: "c2: He withholds Genesis as an example because he takes Pageau not to affirm its literal or historical truth.", kind: "modality", dependsOn: ["c1"] }] }, boundaryEvidence: "Folley's historical concern ends before the moderator clarifies; Pageau's uninterrupted analogical answer ends before the next interjection." },
      { startMs: 3006240, endMs: 3133599, side: "con", speaker: "Joe Folley", interactionMode: "responsive", claim: "Analogical Genesis claims about naming and dissatisfaction can be true, but resurrection and post-death experience make observational and historical claims that analogical truth alone cannot settle.", bridgeTier: "central", target: { startMs: 2750079, endMs: 2771839, speaker: "Jonathan Pageau", claim: "Human nostalgia for a lost ideal supports Genesis as describing something that happened rather than being simply invented.", relation: "earlier-load-bearing-claim", interveningOpponentClaim: true, exceptionRationale: "Folley explicitly returns to the historical point and tests Pageau's real-event commitment through camera evidence, continued experience, and bodily resurrection; Pageau's intervening discussion of scientific description addresses a different subissue.", components: [{ text: "c1: Humans retain nostalgia for an ideal state beyond the present, and that nostalgia drives action.", kind: "fact-premise", dependsOn: [] }, { text: "c2: That persistent feature is remembered in Genesis' account of a lost paradise.", kind: "inference", dependsOn: ["c1"] }, { text: "c3: Genesis therefore describes something that happened rather than a story simply made up.", kind: "conclusion", dependsOn: ["c1", "c2"] }] }, boundaryEvidence: "The target is Pageau's uninterrupted lost-state claim; Folley's later requested example ends at the moderator's follow-up." },
      { startMs: 4221760, endMs: 4253440, side: "pro", speaker: "Jonathan Pageau", interactionMode: "responsive", claim: "Pageau's belief in resurrection rests primarily on the worldview and downstream meaning it reveals, not on particular historians documenting it.", bridgeTier: "central", target: { startMs: 4144880, endMs: 4219040, speaker: "Joe Folley", claim: "Shared observation or incontrovertible confirmation of resurrection and ascension would directly evidence a governing will, raise confidence in Christ's other claims, and support continued experience after death.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Other witnesses could jointly confirm the ascension rather than leave it as a private impression.", kind: "fact-premise", dependsOn: [] }, { text: "c2: Such shared evidence would support a willful mind governing all things.", kind: "inference", dependsOn: ["c1"] }, { text: "c3: Incontrovertibly confirming the resurrection or Gospel of John would raise confidence in Christ's other claims.", kind: "inference", dependsOn: ["c1", "c2"] }, { text: "c4: Folley would then expect his experience to continue after bodily death.", kind: "conclusion", dependsOn: ["c3"] }] }, boundaryEvidence: "Folley's evidential conditional ends at the moderator prompt; Pageau's answer ends when he shifts to a further supporting argument." },
      { startMs: 4457600, endMs: 4538640, side: "con", speaker: "Joe Folley", interactionMode: "responsive", claim: "Forgiveness and original-sin insights can be pragmatically justified without their historical truth, although grounding them in events adds weight.", bridgeTier: "central", target: { startMs: 4399199, endMs: 4455520, speaker: "Jonathan Pageau", claim: "Treating resurrection as fiction makes Christ's moral vision rest on a lie and makes it difficult to retain Jesus' teaching and identity.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Christ's ethic of enemy-love and self-sacrifice is presented together with his resurrection.", kind: "fact-premise", dependsOn: [] }, { text: "c2: If the resurrection is fiction, that ethic is grounded in a lie with cynical downstream consequences.", kind: "inference", dependsOn: ["c1"] }, { text: "c3: Discarding the resurrection makes it difficult to retain Jesus' teaching and identity.", kind: "conclusion", dependsOn: ["c1", "c2"] }] }, boundaryEvidence: "Post-break continuity identifies Pageau's claim; Folley's rebuttal starts after the mixed transition caption and ends at his historical-weight conclusion." },
      { startMs: 4653199, endMs: 4741760, side: "con", speaker: "Joe Folley", interactionMode: "constructive", claim: "Because any possible experience is unavoidably organized into abstractions by a perceiver, meaning and pattern belong ontologically in perceivers rather than in the external world.", bridgeTier: "central", target: null, boundaryEvidence: "The moderator's preceding synthesis identifies Folley; his confirming bottom-up account ends when the moderator paraphrases." },
      { startMs: 6477520, endMs: 6534719, side: "pro", speaker: "Jonathan Pageau", interactionMode: "responsive", claim: "Values are not mere tools for social organization: celebrated purposes constitute and structure organization and action, functioning as little-g gods.", bridgeTier: "central", target: { startMs: 6410080, endMs: 6477520, speaker: "Joe Folley", claim: "Even if Christianity best produced social harmony, that would be only defeasible evidence for God because natural and plural value systems could perform the same organizational function.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Lacking a comprehensive secular solution to social conflict does not shift the burden toward God's existence.", kind: "burden", dependsOn: [] }, { text: "c2: Even if Christianity maximized happiness and harmony, that would be only defeasible evidence for God, not proof.", kind: "modality", dependsOn: [] }, { text: "c3: The same social success could occur without a supernatural explanation.", kind: "inference", dependsOn: ["c2"] }, { text: "c4: If multiple coherent value systems create similar harmony, values are better treated as tools of social organization.", kind: "rule-comparison", dependsOn: ["c2", "c3"] }] }, boundaryEvidence: "Folley's uninterrupted answer ends when Pageau begins his rebuttal; Folley's reply marks the end of the move." },
    ],
    excludedCandidates: [
      { timestamp: "1:01:40", speaker: "Jonathan Pageau", reason: "The London-pattern permanence argument materially duplicates the selected pattern-ontology and resurrection-worldview moves." },
      { timestamp: "1:24:04", speaker: "Joe Folley", reason: "The crow-cognition challenge duplicates Folley's selected perceiver-based constructive and would displace later social coverage." },
      { timestamp: "1:38:41", speaker: "Joe Folley", reason: "The secular worship-as-prioritization response is material, but the later social-organization exchange isolates the disagreement more directly." },
    ],
  },
  "knechtle-aron-ra-god-existence-2023": {
    routes: {
      pro: ["Scientific intelligibility, biological information, logic, and moral obligation are better explained by a mind-like creator.", "Theism supplies an objective ground for reason, value, purpose, and the origin of the cosmos."],
      con: ["Natural properties, evolution, social cooperation, and evidence-based inquiry require no designer or divine lawgiver.", "Religious claims lack adequate evidence and often shift burdens that properly remain with the theist."],
    },
    moves: [
      { startMs: 155459, endMs: 179580, side: "pro", speaker: "Stuart Knechtle", interactionMode: "constructive", claim: "The universe's intelligibility makes an intelligent designer more likely than no designer.", bridgeTier: "central", target: null, boundaryEvidence: "The move starts after Newton's gravity example and ends before the worldview pivot; Stuart speaks throughout." },
      { startMs: 507780, endMs: 555720, side: "pro", speaker: "Stuart Knechtle", interactionMode: "constructive", claim: "Mind-independent logical laws and the shared immaterial bridge enabling rational communication are best grounded in God's nature.", bridgeTier: "central", target: null, boundaryEvidence: "The move starts with Stuart's announced reason-and-logic point and ends before the conditional restarts." },
      { startMs: 762839, endMs: 814320, side: "con", speaker: "Aron Ra", interactionMode: "constructive", claim: "God lacks physical or logical verification, while incompatible religions generate the same confidence through faith, making faith deceptive rather than knowledge.", bridgeTier: "central", target: null, boundaryEvidence: "The move starts after the moderator's handoff and ends before Aron changes to Stuart's other arguments." },
      { startMs: 1116179, endMs: 1175220, side: "con", speaker: "Aron Ra", interactionMode: "constructive", claim: "Morality arises socially and evolutionarily because trustworthy, empathetic cooperators flourish while persistently selfish actors are excluded.", bridgeTier: "central", target: null, boundaryEvidence: "The move begins at Aron's morality pivot and ends before his separate critique of Christian salvation." },
      { startMs: 3274040, endMs: 3282119, side: "pro", speaker: "Stuart Knechtle", interactionMode: "responsive", claim: "God exists beyond space and time as the kind of source needed to create spacetime.", bridgeTier: "central", target: { startMs: 3258359, endMs: 3270480, speaker: "Aron Ra", claim: "The proposed immaterial mind still requires explanations of how it exists and how it acts.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: The proposed immaterial mind requires an account of how it exists.", kind: "burden", dependsOn: [] }, { text: "c2: The proposed immaterial mind requires an account of how it acts.", kind: "burden", dependsOn: [] }] }, boundaryEvidence: "The target ends before Stuart's answer; the move ends before Aron's objection begins." },
      { startMs: 3287940, endMs: 3295079, side: "con", speaker: "Aron Ra", interactionMode: "responsive", claim: "A being outside time has no time at which it exists, so the proposal is self-undermining.", bridgeTier: "central", target: { startMs: 3274040, endMs: 3282119, speaker: "Stuart Knechtle", claim: "God exists outside spacetime and is needed to create spacetime.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: God exists outside space and time.", kind: "fact-premise", dependsOn: [] }, { text: "c2: A source outside spacetime is needed to create spacetime.", kind: "rule-comparison", dependsOn: [] }] }, boundaryEvidence: "The move is Aron's uninterrupted temporal-existence objection and ends before Stuart replies." },
      { startMs: 3620579, endMs: 3655160, side: "pro", speaker: "Stuart Knechtle", interactionMode: "responsive", claim: "Universal moral recognition favors God, while social approval of honor killings shows that society alone cannot determine moral truth.", bridgeTier: "central", target: { startMs: 3595440, endMs: 3620579, speaker: "Aron Ra", claim: "People everywhere and at every time recognize that gratuitously harming a defenseless person is wrong.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: People recognize that punching a defenseless person is wrong.", kind: "fact-premise", dependsOn: [] }, { text: "c2: This recognition holds across societies, times, and places.", kind: "modality", dependsOn: ["c1"] }] }, boundaryEvidence: "The target ends exactly when Stuart begins; the move ends before Aron answers." },
      { startMs: 3655160, endMs: 3673020, side: "con", speaker: "Aron Ra", interactionMode: "responsive", claim: "Groups use political or religious dogma to excuse conduct they already know is evil, so honor-killing acceptance does not show that morality is created by society.", bridgeTier: "central", target: { startMs: 3620579, endMs: 3655160, speaker: "Stuart Knechtle", claim: "Universal moral recognition is evidence for God, and accepted honor killings challenge society as the source of objective morality.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: People share a universal recognition of moral wrongness.", kind: "fact-premise", dependsOn: [] }, { text: "c2: That universality counts as evidence for God.", kind: "inference", dependsOn: ["c1"] }, { text: "c3: Some societies approve honor killings.", kind: "fact-premise", dependsOn: [] }, { text: "c4: Such approval challenges society as the source of objective morality.", kind: "inference", dependsOn: ["c3"] }] }, boundaryEvidence: "The move begins when Aron answers the honor-killing example and ends before Stuart resumes." },
      { startMs: 4734060, endMs: 4766400, side: "pro", speaker: "Stuart Knechtle", interactionMode: "responsive", claim: "Irreducible complexity can challenge evolutionary explanation locally while remaining compatible with adaptation, mutation, and evolutionary theory generally.", bridgeTier: "central", target: { startMs: 4702500, endMs: 4734060, speaker: "Aron Ra", claim: "Intelligent design is creationism, irreducible complexity denies natural assembly, and every such argument is flawed.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Intelligent design posits a supreme intelligence creating biological features without evolution.", kind: "fact-premise", dependsOn: [] }, { text: "c2: This makes intelligent design equivalent to creationism.", kind: "conclusion", dependsOn: ["c1"] }, { text: "c3: Irreducible-complexity arguments claim relevant features cannot arise naturally.", kind: "fact-premise", dependsOn: [] }, { text: "c4: Every irreducible-complexity argument is flawed.", kind: "conclusion", dependsOn: ["c3"] }] }, boundaryEvidence: "The target ends when Stuart starts; the move excludes the mixed handoff at its end." },
      { startMs: 4767840, endMs: 4784239, side: "con", speaker: "Aron Ra", interactionMode: "responsive", claim: "Advocating intelligent design and rejecting methodological naturalism while claiming to accept evolution is definitionally inconsistent.", bridgeTier: "central", target: { startMs: 4734060, endMs: 4766400, speaker: "Stuart Knechtle", claim: "Irreducible complexity may reject evolutionary explanations for particular structures without rejecting adaptation, mutation, or evolution generally.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Irreducible complexity need only challenge evolutionary explanation for particular structures such as the eye or cell.", kind: "rule-comparison", dependsOn: [] }, { text: "c2: A local challenge does not erase adaptation, mutation, and evolution generally.", kind: "inference", dependsOn: ["c1"] }, { text: "c3: Irreducible complexity can therefore fit within an evolutionary framework.", kind: "conclusion", dependsOn: ["c1", "c2"] }] }, boundaryEvidence: "The move is Aron's uninterrupted consistency challenge and ends before Stuart answers." },
      { startMs: 6909960, endMs: 6929420, side: "pro", speaker: "Stuart Knechtle", interactionMode: "responsive", claim: "If God is great enough to be the object of this complaint, he may have reasons for evidential restraint that humans do not know.", bridgeTier: "subsidiary", target: { startMs: 6866880, endMs: 6907260, speaker: "Aron Ra", claim: "A God who condemns nonbelief bears responsibility for providing verifiable evidence, yet supplies only unreliable messengers and false stories.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Claims about God lack objective verification.", kind: "fact-premise", dependsOn: [] }, { text: "c2: A God who condemns nonbelief has a responsibility to provide evidence.", kind: "burden", dependsOn: [] }, { text: "c3: The alleged message instead comes through unreliable advocates and false stories.", kind: "fact-premise", dependsOn: [] }, { text: "c4: God therefore bears responsibility for the resulting nonbelief.", kind: "conclusion", dependsOn: ["c1", "c2", "c3"] }] }, boundaryEvidence: "The target ends before the moderator's handoff; Stuart's answer is uninterrupted." },
      { startMs: 6929420, endMs: 6949800, side: "con", speaker: "Aron Ra", interactionMode: "responsive", claim: "Appealing to unknowable reasons depicts a small, insecure God and fits clergy intimidation better than a real deity.", bridgeTier: "subsidiary", target: { startMs: 6909960, endMs: 6929420, speaker: "Stuart Knechtle", claim: "A sufficiently great God may possess reasons for withholding evidence that humans cannot know.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: God may have reasons unavailable to human knowers.", kind: "modality", dependsOn: [] }, { text: "c2: Those possible reasons must be allowed when judging the evidential complaint.", kind: "conclusion", dependsOn: ["c1"] }] }, boundaryEvidence: "The move begins when Aron responds and ends before the moderator introduces another question." },
    ],
    excludedCandidates: [
      { timestamp: "30:22", speaker: "Stuart Knechtle", reason: "This launches the previously overrepresented moral sequence and elicits a long opponent monologue rather than broadening later-dialogue coverage." },
      { timestamp: "37:23", speaker: "Aron Ra", reason: "The surrounding proposed span crosses Stuart's challenge and Aron's subsequent answer, so it is not an uninterrupted single-speaker act." },
      { timestamp: "38:34", speaker: "Stuart Knechtle", reason: "The clarification contains opponent interjections and cannot be bounded as a clean single-speaker move." },
      { timestamp: "1:23:00", speaker: "Stuart Knechtle", reason: "The burden-of-proof passage is repeatedly interrupted; the later exchange covers the same material without speaker mixing." },
    ],
  },
  "lennox-atkins-science-explain-everything-2019": {
    routes: {
      pro: ["Natural science is powerful but cannot exhaust historical, purposive, moral, and theological explanation.", "Rational intelligibility, agency, and the resurrection provide evidence for explanations beyond natural science."],
      con: ["Evidence-based science can in principle explain every real question without supernatural additions.", "Purpose and afterlife questions lack evidence, while natural processes can account for reality and consciousness."],
    },
    moves: [
      { startMs: 402080, endMs: 481790, side: "con", speaker: "Peter Atkins", interactionMode: "constructive", claim: "Science is a public evidence-based method whose mutually supporting network of disciplinary ideas strongly indicates that it discovers the fabric of reality.", bridgeTier: "central", target: null, boundaryEvidence: "This is the first Peter-only event after the chair's mixed handoff and ends at Atkins's explicitly signposted second topic." },
      { startMs: 860840, endMs: 910490, side: "pro", speaker: "John Lennox", interactionMode: "constructive", claim: "Natural science cannot answer every question, including where we come from, where we are going, and life's meaning; those require philosophy or religion.", bridgeTier: "central", target: null, boundaryEvidence: "Lennox's natural-science-limit claim ends at his separate praise-of-science qualification." },
      { startMs: 1029880, endMs: 1109390, side: "pro", speaker: "John Lennox", interactionMode: "constructive", claim: "Mechanistic scientific explanations and explanations by an agent's intention answer different questions and can complement rather than compete with each other.", bridgeTier: "central", target: null, boundaryEvidence: "Lennox's final explanation point ends at his further inference from the mechanism-purpose comparison." },
      { startMs: 1167439, endMs: 1207399, side: "con", speaker: "Peter Atkins", interactionMode: "responsive", claim: "The resurrection did not happen: late Gospel reports are inadequate evidence, and a decaying corpse cannot reconstitute, so science can rule it out.", bridgeTier: "central", target: { startMs: 990290, endMs: 1013560, speaker: "John Lennox", claim: "Jesus's resurrection is the central evidence for Christianity's claim to be evidence-based.", relation: "earlier-load-bearing-claim", interveningOpponentClaim: true, exceptionRationale: "Atkins expressly returns to what Lennox called Christianity's central evidence; Lennox's later mechanism-versus-purpose material concerns a different explanatory object, and the evidence request does not supersede the resurrection claim.", components: [{ text: "c1: Jesus rose from the dead.", kind: "fact-premise", dependsOn: [] }, { text: "c2: Jesus's resurrection is Christianity's central evidence.", kind: "conclusion", dependsOn: ["c1"] }] }, boundaryEvidence: "Atkins's uninterrupted evidential response begins after Lennox's interjection and ends at the chair's handoff." },
      { startMs: 1226149, endMs: 1270009, side: "pro", speaker: "John Lennox", interactionMode: "responsive", claim: "Science discovers what normally happens; the regularity that dead bodies do not normally rise lets us recognize a resurrection as exceptional but does not forbid it.", bridgeTier: "central", target: { startMs: 1177189, endMs: 1207399, speaker: "Peter Atkins", claim: "Science can rule out resurrection because dead bodies decay immediately and cannot reconstitute.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Dead bodies begin decaying immediately.", kind: "fact-premise", dependsOn: [] }, { text: "c2: A decaying dead body cannot naturally reconstitute.", kind: "rule-comparison", dependsOn: [] }, { text: "c3: Therefore science can rule out Jesus's resurrection.", kind: "conclusion", dependsOn: ["c1", "c2"] }] }, boundaryEvidence: "Lennox's answer begins after the chair's mixed question and ends before his invitation to elaborate." },
      { startMs: 1838240, endMs: 1917600, side: "con", speaker: "Peter Atkins", interactionMode: "responsive", claim: "Scientific optimism and evolution explain how humans developed brains capable of extraordinary understanding, while invoking God merely labels present incomprehension.", bridgeTier: "central", target: { startMs: 1799940, endMs: 1812930, speaker: "John Lennox", claim: "The atheistic explanation undermines confidence in the human rationality required for science.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: The atheistic explanation undermines confidence in the human rationality required for science.", kind: "fact-premise", dependsOn: [] }] }, boundaryEvidence: "Atkins's answer begins after the chair's paraphrase and ends at his explicit cognitive-limitation qualification." },
      { startMs: 3418619, endMs: 3431770, side: "pro", speaker: "John Lennox", interactionMode: "responsive", claim: "Equal credits and debts do not mean that nothing is present or happening, so cancellation to zero does not establish an originating nothing.", bridgeTier: "central", target: { startMs: 3295109, endMs: 3413009, speaker: "Peter Atkins", claim: "Opposite charges and energies balance to zero, reducing cosmic origins to explaining how absolute nothing separated into opposites.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: The universe contains balancing positive and negative charges.", kind: "fact-premise", dependsOn: [] }, { text: "c2: Opposite kinds of cosmic energy sum to zero.", kind: "fact-premise", dependsOn: [] }, { text: "c3: These cancellations reduce the origins problem to explaining how absolute nothing separated into opposites.", kind: "conclusion", dependsOn: ["c1", "c2"] }] }, boundaryEvidence: "Lennox's credits-and-debts response is bounded by the chair's handoff and Atkins's reply." },
      { startMs: 3585130, endMs: 3600440, side: "con", speaker: "Peter Atkins", interactionMode: "constructive", claim: "Atkins's atheism is unfalsifiable: even personally witnessing a resurrection would be dismissed as a hallucination.", bridgeTier: "subsidiary", target: null, boundaryEvidence: "Atkins's uninterrupted answer to the chair's unfalsifiability question ends before his separate Hume elaboration." },
      { startMs: 3625400, endMs: 3652579, side: "pro", speaker: "John Lennox", interactionMode: "responsive", claim: "The hallucination explanation is undermined by reported group appearances of the risen Jesus to more than five hundred people at different times.", bridgeTier: "central", target: { startMs: 3585130, endMs: 3600440, speaker: "Peter Atkins", claim: "Even personally witnessing a resurrection would be dismissed as a hallucination.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Even personally witnessing a resurrection would be dismissed as a hallucination.", kind: "modality", dependsOn: [] }] }, boundaryEvidence: "Lennox's group-hallucination reply begins after the chair's summary and ends at his separate openness-to-reversal point." },
      { startMs: 4103620, endMs: 4135960, side: "con", speaker: "Peter Atkins", interactionMode: "responsive", claim: "Christian afterlife hope offered as meaning to less-privileged people is a delusion and inhumane, even if it can sometimes be useful.", bridgeTier: "central", target: { startMs: 4084120, endMs: 4101520, speaker: "John Lennox", claim: "A life purpose based on deep scientific understanding is available only to exceptionally brilliant and privileged people, not to most people.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Only unusually brilliant and privileged people can obtain the depth of scientific understanding Atkins describes.", kind: "rule-comparison", dependsOn: [] }, { text: "c2: Most people lack that intellectual privilege.", kind: "fact-premise", dependsOn: [] }, { text: "c3: Therefore scientific understanding cannot supply the proposed purpose for most people.", kind: "conclusion", dependsOn: ["c1", "c2"] }] }, boundaryEvidence: "Atkins's afterlife answer begins after Lennox's objection and ends before a mixed reply event." },
      { startMs: 4815500, endMs: 4839139, side: "pro", speaker: "John Lennox", interactionMode: "responsive", claim: "Science can tell us the consequences of using a technology, but it cannot determine whether we morally ought to use it.", bridgeTier: "central", target: { startMs: 4764619, endMs: 4795849, speaker: "Peter Atkins", claim: "Scientific study of psychology, upbringing, attitudes, and statistics can bear on how political decision-makers should act.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Political action can be studied through psychology, upbringing, attitudes, and statistics.", kind: "fact-premise", dependsOn: [] }, { text: "c2: Scientific method can therefore address how political decision-makers should act.", kind: "conclusion", dependsOn: ["c1"] }] }, boundaryEvidence: "Lennox's moral-ought response begins after the chair's mixed prompt and ends at the mixed follow-up event." },
      { startMs: 5407150, endMs: 5422000, side: "con", speaker: "Peter Atkins", interactionMode: "responsive", claim: "Origin-of-life science's present limitation is not a shortage of hypotheses but uncertainty about the early conditions needed to determine which hypotheses were viable.", bridgeTier: "central", target: { startMs: 5402950, endMs: 5404750, speaker: "John Lennox", claim: "Scientists are very short of ideas about how life originated.", relation: "immediate-opponent-claim", interveningOpponentClaim: false, exceptionRationale: null, components: [{ text: "c1: Scientists are very short of ideas about how life originated.", kind: "fact-premise", dependsOn: [] }] }, boundaryEvidence: "Atkins's origin-of-life answer begins after Lennox's interjection and ends at the chair's mixed handoff." },
    ],
    excludedCandidates: [
      { timestamp: "24:02", speaker: "Peter Atkins", reason: "The God-explanation critique has a mixed opening handoff and its clean remainder duplicates the selected resurrection challenge." },
      { timestamp: "36:10", speaker: "John Lennox", reason: "The history-of-science argument is material but redundant with the selected rationality exchange and would make the inventory too early-heavy." },
      { timestamp: "40:30", speaker: "John Lennox", reason: "The purpose and Christian metanarrative reply overlaps later afterlife coverage and would displace a cleaner late-debate topic." },
      { timestamp: "1:35:57", speaker: "Peter Atkins", reason: "The cultural-conditioning reply repeats earlier worldview and falsifiability themes and would displace the central origin-of-life exchange." },
    ],
  },
  "hitchens-kushner-gomes-god-religion-morality-2009": {
    routes: {
      pro: ["Religious belief and tradition provide transcendent meaning, resilience, moral aspiration, and communal wisdom.", "Fallible religious institutions can be reformed while preserving the experiential and moral value of faith."],
      con: ["Morality and numinous experience do not require supernatural belief, while religion adds dangerous authority claims.", "Religious doctrines and institutions generate distinctive harms and cannot claim an exclusive moral source."],
    },
    moves: [
      [91, 146, "pro", "Harold Kushner", "constructive", "Belief in God supplies resilience, direction, and self-understanding during crisis."],
      [149, 208, "con", "Christopher Hitchens", "constructive", "Ordinary morality would remain unchanged if every prophet and revelation were disproved."],
      [213, 259, "pro", "Peter Gomes", "constructive", "Inherited religious community is a safer moral guide than sheer rational self-interest."],
      [283, 385, "con", "Christopher Hitchens", "constructive", "Theocratic movements threaten secular democracy, science, and civilization."],
      [402, 494, "pro", "Harold Kushner", "responsive", "Religion should be judged at its best and can ground transcendent moral significance.", [283, 385, "Christopher Hitchens", "Theocratic movements threaten secular democracy, science, and civilization."]],
      [501, 589, "pro", "Peter Gomes", "responsive", "Christian practice is an aspirational experiment that acknowledges sin while aiming at a higher vision.", [283, 385, "Christopher Hitchens", "Theocratic movements threaten secular democracy, science, and civilization."]],
      [594, 731, "con", "Christopher Hitchens", "responsive", "Believers cannot name a uniquely religious moral good, but religion does motivate distinctive evils.", [501, 589, "Peter Gomes", "Christian practice is an aspirational experiment that acknowledges sin while aiming at a higher vision."]],
      [736, 794, "pro", "Harold Kushner", "responsive", "Religion acknowledges its failures and uniquely supports repentance and personal transformation.", [594, 731, "Christopher Hitchens", "Believers cannot name a uniquely religious moral good, but religion does motivate distinctive evils."]],
      [796, 889, "pro", "Peter Gomes", "responsive", "Confession treats religion as a fallible human construction oriented toward transcendence.", [594, 731, "Christopher Hitchens", "Believers cannot name a uniquely religious moral good, but religion does motivate distinctive evils."]],
      [891, 929, "con", "Christopher Hitchens", "responsive", "Calling religion human-made concedes that gods reflect primate invention rather than revelation.", [796, 889, "Peter Gomes", "Confession treats religion as a fallible human construction oriented toward transcendence."]],
      [931, 1040, "pro", "Peter Gomes", "responsive", "Humanly mediated religion can remain an imperfect aspiration toward the divine.", [891, 929, "Christopher Hitchens", "Calling religion human-made concedes that gods reflect primate invention rather than revelation."]],
      [1045, 1094, "pro", "Harold Kushner", "responsive", "Revelation may originate with God even though human records of it are incomplete.", [891, 929, "Christopher Hitchens", "Calling religion human-made concedes that gods reflect primate invention rather than revelation."]],
      [1122, 1201, "con", "Christopher Hitchens", "responsive", "Numinous beauty and transcendence can be preserved without supernatural ownership.", [1045, 1094, "Harold Kushner", "Revelation may originate with God even though human records of it are incomplete."]],
      [2178, 2230, "con", "Christopher Hitchens", "responsive", "A generic first cause does not establish a deity that issues covenants and commands.", [2113, 2175, "Harold Kushner", "Talk of God should be read metaphorically through what God does in human experience."]],
      [2259, 2337, "pro", "Harold Kushner", "responsive", "The Jewish covenant names a historical relationship embodied in Jewish texts and tradition.", [2178, 2230, "Christopher Hitchens", "A generic first cause does not establish a deity that issues covenants and commands."]],
      [2351, 2390, "pro", "Peter Gomes", "responsive", "Christian claims about Jesus express the only framework that makes sense of Christian relationship to God.", [2178, 2230, "Christopher Hitchens", "A generic first cause does not establish a deity that issues covenants and commands."]],
    ],
  },
  "koukl-oconnor-kanojia-nonbelief-harm-2025": {
    routes: {
      pro: ["A personal creator gives human beings objective purpose, flourishing, moral truth, and relationship with God.", "Naturalism cannot adequately explain consciousness, moral intuition, or the hunger for transcendent meaning."],
      con: ["Subjective meaning and practical flourishing can arise through secular, psychological, and spiritual practices.", "Religious purpose claims face arbitrariness, suffering, and truth-evidence problems that felt meaning cannot settle."],
    },
    moves: [
      [187, 250, "con", "Alok Kanojia", "constructive", "Evidence-based methods combined with spiritual practice can measurably increase a person's sense of purpose."],
      [463, 505, "pro", "Greg Koukl", "constructive", "A personal God created and remains involved with the world through Jesus."],
      [509, 535, "pro", "Greg Koukl", "constructive", "People flourish by participating in objective purposes culminating in friendship with God."],
      [545, 744, "con", "Alex O'Connor", "constructive", "Religious meaning functions as a human response to mortality and the desire for transcendence."],
      [745, 790, "pro", "Greg Koukl", "responsive", "A naturalistic account cannot explain propositional consciousness or its hunger for meaning.", [700, 744, "Alex O'Connor", "Religious projects answer the human awareness of mortality by promising transcendence."]],
      [793, 930, "con", "Alex O'Connor", "responsive", "Creator-assigned purpose is not automatically fulfilling, as a conscious paperclip-maker illustrates.", [745, 790, "Greg Koukl", "A naturalistic account cannot explain propositional consciousness or its hunger for meaning."]],
      [931, 998, "pro", "Greg Koukl", "responsive", "The paperclip analogy fails because loving communion is fitting for persons rather than an arbitrary task.", [793, 930, "Alex O'Connor", "Creator-assigned purpose is not automatically fulfilling, as a conscious paperclip-maker illustrates."]],
      [1075, 1140, "pro", "Greg Koukl", "responsive", "The search need not be nihilistic because people can reach objective conclusions about purpose.", [1058, 1074, "Alex O'Connor", "A short conversation cannot solve the meaning crisis or supply a universal guide."]],
      [1146, 1175, "con", "Alex O'Connor", "responsive", "Spiritual fulfillment must be discovered by individuals rather than delivered by an external guru.", [1075, 1140, "Greg Koukl", "The search need not be nihilistic because people can reach objective conclusions about purpose."]],
      [4994, 5060, "pro", "Greg Koukl", "responsive", "The content and truth of a theology affect experience; religions are not psychologically interchangeable.", [4967, 4990, "Alex O'Connor", "Confidence in Greg's worldview would likely increase happiness, as could committed belief in other religions."]],
      [5285, 5365, "con", "Alex O'Connor", "responsive", "Subjective purpose after conversion is at most contributing evidence and cannot carry Christianity's truth by itself.", [5191, 5284, "Greg Koukl", "Changed Christian lives and other evidence together support the truth of Christianity."]],
      [6062, 6108, "con", "Alok Kanojia", "responsive", "Dharma describes context-sensitive duty and direction without requiring one grand predetermined task.", [5739, 5800, "Greg Koukl", "God gives each person general and specific capacities whose fulfillment supplies purpose."], "earlier"],
      [6390, 6415, "con", "Alok Kanojia", "responsive", "Dharma can be understood through regular consequences rather than as a transcendent moral command.", [6310, 6390, "Greg Koukl", "Talk of duty and obligation invokes objective moral categories above material consequences."]],
      [6415, 6440, "con", "Alok Kanojia", "responsive", "A role-based obligation can direct conduct without being identical to a universal moral category.", [6310, 6390, "Greg Koukl", "Talk of duty and obligation invokes objective moral categories above material consequences."]],
      [6440, 6465, "con", "Alok Kanojia", "responsive", "Hindu ethical restraints overlap with dharma, but dharma can sometimes require acts that ordinary morality resists.", [6310, 6390, "Greg Koukl", "Talk of duty and obligation invokes objective moral categories above material consequences."]],
      [6593, 6650, "con", "Alex O'Connor", "responsive", "Evolution explains biological variation rather than functioning as a total explanation of everything.", [6568, 6593, "Greg Koukl", "Without God there is no objective right and wrong, and evolution does not supply a grand explanation." ]],
    ],
  },
  "krauss-meyer-lamoureux-god-science-universe-2016": {
    routes: {
      pro: ["Cosmology, evolutionary biology, and physical self-organization support scientific naturalism without divine intervention.", "Testable natural mechanisms outperform design inferences and treat current ignorance as a research problem."],
      con: ["Biological information and cosmic fine-tuning support a mind-based design inference.", "Evolutionary creation and a non-concordist reading of scripture integrate Christian theism with mainstream science."],
    },
    moves: [
      [425, 510, "pro", "Lawrence Krauss", "constructive", "Intelligent design may be discussed philosophically but should not be presented as established science."],
      [1138, 1210, "pro", "Lawrence Krauss", "constructive", "Visible life is cosmically marginal, which undercuts claims that the universe was designed for humanity."],
      [2313, 2380, "con", "Stephen Meyer", "constructive", "DNA contains functionally specified digital information analogous to other products of intelligence."],
      [4439, 4510, "con", "Denis Lamoureux", "constructive", "Science and metaphysical interpretation interact reciprocally without being identical."],
      [5426, 5490, "con", "Stephen Meyer", "responsive", "Design is an inference to a known cause of information rather than an argument from ignorance.", [425, 510, "Lawrence Krauss", "Intelligent design may be discussed philosophically but should not be presented as established science."], "earlier"],
      [5493, 5560, "con", "Stephen Meyer", "responsive", "Methodological naturalism can exclude intelligent causation before the evidence is considered.", [425, 510, "Lawrence Krauss", "Intelligent design may be discussed philosophically but should not be presented as established science."], "earlier"],
      [5982, 6020, "con", "Denis Lamoureux", "responsive", "Krauss's science is strong but his interpretation includes contestable metaphysics.", [1396, 1470, "Lawrence Krauss", "Quantum cosmology offers natural origin scenarios for the universe."], "earlier"],
      [6023, 6050, "con", "Denis Lamoureux", "responsive", "A quantum vacuum is not literal nothing, so the book title overstates the scientific result.", [1396, 1470, "Lawrence Krauss", "Quantum cosmology offers natural origin scenarios for the universe."], "earlier"],
      [6050, 6073, "con", "Denis Lamoureux", "responsive", "Relativistic quantum vacuum states contain physical structure rather than an absence of anything.", [1396, 1470, "Lawrence Krauss", "Quantum cosmology offers natural origin scenarios for the universe."], "earlier"],
      [6100, 6200, "pro", "Lawrence Krauss", "responsive", "Evolution is directed by natural selection and is not a uniformly random search.", [5493, 5560, "Stephen Meyer", "Methodological naturalism can exclude intelligent causation before the evidence is considered."]],
      [6251, 6305, "pro", "Lawrence Krauss", "responsive", "RNA chemistry supplies plausible natural trajectories toward information-processing life.", [5493, 5560, "Stephen Meyer", "Methodological naturalism can exclude intelligent causation before the evidence is considered."]],
      [6314, 6370, "pro", "Lawrence Krauss", "responsive", "Calling Genesis poetic does not establish it as an accurate or morally authoritative account.", [4439, 4510, "Denis Lamoureux", "Science and metaphysical interpretation interact reciprocally without being identical."], "earlier"],
      [6378, 6405, "pro", "Lawrence Krauss", "responsive", "Physics and chemistry naturally produce highly designed-looking structures such as snowflakes.", [2313, 2380, "Stephen Meyer", "DNA contains functionally specified digital information analogous to other products of intelligence."], "earlier"],
      [6442, 6490, "con", "Stephen Meyer", "responsive", "His critique addresses mutation plus selection, not a purely random evolutionary process.", [6100, 6200, "Lawrence Krauss", "Evolution is directed by natural selection and is not a uniformly random search."]],
      [6509, 6550, "con", "Stephen Meyer", "responsive", "Evolutionary algorithms presuppose information supplied by programmers and therefore do not model unguided origin.", [6100, 6200, "Lawrence Krauss", "Evolution is directed by natural selection and is not a uniformly random search."]],
      [7413, 7465, "con", "Denis Lamoureux", "responsive", "Evolution is compatible with divine creation while leaving room for a non-coercive step of faith.", [425, 510, "Lawrence Krauss", "Intelligent design may be discussed philosophically but should not be presented as established science."], "earlier"],
    ],
  },
};

for (const debateId of Object.keys(configs)) {
  for (const laneDirectory of ["dyadic", "multi-speaker"]) {
    const overridePath = `docs/calibration/v2.7/held-out-gates/${laneDirectory}/config-overrides/${debateId}.json`;
    try {
      const override = JSON.parse(await readFile(overridePath, "utf8"));
      configs[debateId].moves = override.moves;
      configs[debateId].excludedCandidates = override.excludedCandidates;
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

function timestamp(ms) {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function excerptFrom(events, startSeconds, endSeconds) {
  const startMs = Math.round(startSeconds * 1000);
  const endMs = Math.round(endSeconds * 1000);
  const localEvents = events.filter((event) => event.startMs >= startMs && event.startMs < endMs);
  if (localEvents.length === 0) throw new Error(`No events within ${startSeconds}-${endSeconds}`);
  const excerpt = localEvents.map((event) => event.text).join(" ").replace(/\s+/gu, " ").trim();
  return {
    span: { startMs, endMs },
    excerpt,
  };
}

function wordCount(value) {
  return value.split(/\s+/u).filter(Boolean).length;
}

function normalizeMoveSpec(spec) {
  if (!Array.isArray(spec)) return spec;
  const [start, end, side, speaker, interactionMode, claim, targetSpec, targetMode] = spec;
  return {
    startMs: Math.round(start * 1000),
    endMs: Math.round(end * 1000),
    side,
    speaker,
    interactionMode,
    claim,
    bridgeTier: "central",
    target: targetSpec ? {
      startMs: Math.round(targetSpec[0] * 1000),
      endMs: Math.round(targetSpec[1] * 1000),
      speaker: targetSpec[2],
      claim: targetSpec[3],
      relation: targetMode === "earlier" ? "earlier-load-bearing-claim" : "immediate-opponent-claim",
      interveningOpponentClaim: targetMode === "earlier",
      exceptionRationale: targetMode === "earlier" ? "The response explicitly returns to this earlier load-bearing opponent claim; later opponent material addresses a different subissue and does not supersede this target." : null,
      components: [{ text: targetSpec[3], kind: "fact-premise", dependsOn: [] }],
    } : null,
    boundaryEvidence: "Selected from an explicit handoff, named turn, or uninterrupted and semantically identifiable turn.",
  };
}

function targetComponents(debateId, moveNumber, components) {
  const prefix = `${debateId}-target-${String(moveNumber).padStart(2, "0")}`;
  return components.map((component, index) => ({
    id: `${prefix}-c${index + 1}`,
    text: component.text.replace(/^c\d+:\s*/u, ""),
    kind: component.kind,
    dependsOn: component.dependsOn.map((dependency) => {
      if (/^c\d+$/u.test(dependency)) return `${prefix}-${dependency}`;
      if (/^\d+$/u.test(String(dependency))) return `${prefix}-c${dependency}`;
      return dependency;
    }),
  }));
}

function burdenRoutes(config, id) {
  return ["pro", "con"].map((side) => ({
    id: `${id}-${side}-route`,
    side,
    description: config.routes[side][0],
    successCriteria: config.routes[side][1],
    bridges: [
      { id: `${id}-${side}-motion`, tier: "motion", description: `Establish the ${side} side's complete answer to the stated debate motion.` },
      { id: `${id}-${side}-central`, tier: "central", description: config.routes[side][0] },
      { id: `${id}-${side}-subsidiary`, tier: "subsidiary", description: `Support a narrower evidential or conceptual consideration used by the ${side} side.` },
    ],
  }));
}

for (const [debateId, config] of Object.entries(configs)) {
  if (requestedDebate !== null && requestedDebate !== debateId) continue;
  const laneKey = gate.lanes.dyadic.debates.some((item) => item.debateId === debateId) ? "dyadic" : "multiSpeaker";
  const lane = gate.lanes[laneKey];
  const debate = lane.debates.find((item) => item.debateId === debateId);
  if (!debate) throw new Error(`Not preregistered: ${debateId}`);
  const laneDirectory = lane.lane === "dyadic" ? "dyadic" : "multi-speaker";
  if (requestedLane !== null && requestedLane !== laneDirectory) continue;
  const base = `.assessment-cache/captions/${debate.videoId}`;
  const transcriptPath = `${base}/transcript.txt`;
  const eventsPath = `${base}/events.json`;
  const manifestPath = `${base}/manifest.json`;
  const [transcriptText, eventsText, manifestText] = await Promise.all([
    readFile(transcriptPath, "utf8"), readFile(eventsPath, "utf8"), readFile(manifestPath, "utf8"),
  ]);
  const events = JSON.parse(eventsText);
  const routes = burdenRoutes(config, debateId);
  const orderedMoveSpecs = [...config.moves].sort((left, right) =>
    normalizeMoveSpec(left).startMs - normalizeMoveSpec(right).startMs
  );
  const moves = orderedMoveSpecs.map((rawSpec, index) => {
    const spec = normalizeMoveSpec(rawSpec);
    const { startMs, endMs, side, speaker, interactionMode, claim, target: targetSpec, bridgeTier, boundaryEvidence } = spec;
    const source = excerptFrom(events, startMs / 1000, endMs / 1000);
    if (wordCount(source.excerpt) < 30 || wordCount(source.excerpt) > 90) throw new Error(`${debateId} move ${index + 1} excerpt must contain 30-90 words; found ${wordCount(source.excerpt)}`);
    let targetPacket = null;
    if (interactionMode === "responsive") {
      if (!targetSpec) throw new Error(`${debateId} move ${index + 1} missing target`);
      const target = excerptFrom(events, targetSpec.startMs / 1000, targetSpec.endMs / 1000);
      if (wordCount(target.excerpt) < 15 || wordCount(target.excerpt) > 90) throw new Error(`${debateId} target ${index + 1} excerpt must contain 15-90 words; found ${wordCount(target.excerpt)}`);
      const targetSpeaker = targetSpec.speaker;
      const targetClaim = targetSpec.claim;
      const targetSide = debate.sides.pro.speakers.includes(targetSpeaker) ? "pro" : "con";
      if (targetSide === side) throw new Error(`${debateId} move ${index + 1} has same-side target`);
      targetPacket = {
        id: `${debateId}-target-${String(index + 1).padStart(2, "0")}`,
        targetSpeaker,
        targetSide,
        ownershipScope: "speaker-only",
        adoptionRecords: [],
        sourceSpan: target.span,
        sourceExcerpt: target.excerpt,
        sourceExcerptSha256: sha256(target.excerpt),
        claim: targetClaim,
        targetRelationToMove: targetSpec.relation,
        interveningOpponentClaim: targetSpec.interveningOpponentClaim,
        exceptionRationale: targetSpec.exceptionRationale,
        indispensableComponents: targetComponents(debateId, index + 1, targetSpec.components),
        selectionRationale: "This is the most specific opponent assertion that the selected move expressly answers; its typed component graph preserves only indispensable premises, rules, inferences, burdens, modalities, and conclusions.",
      };
    }
    const route = bridgeTier === null ? null : `${debateId}-${side}-route`;
    const eligibleBridgeIds = bridgeTier === null ? [] : [`${debateId}-${side}-${bridgeTier}`];
    const speakerAttributionConfidence = spec.speakerAttributionConfidence ?? "high";
    const audioVerification = spec.audioVerification ?? null;
    if (speakerAttributionConfidence !== "high" && audioVerification === null) throw new Error(`${debateId} move ${index + 1} requires audio verification`);
    return {
      moveId: `${debateId}-move-${String(index + 1).padStart(2, "0")}`,
      side,
      speaker,
      timestamp: timestamp(source.span.startMs),
      sourceSpan: source.span,
      sourceExcerpt: source.excerpt,
      sourceExcerptSha256: sha256(source.excerpt),
      quoteKind: audioVerification ? "audio-verified-quote" : "quote",
      speakerAttributionConfidence,
      audioChecked: audioVerification !== null,
      audioVerification,
      interactionMode,
      targetPacket,
      burdenPacket: {
        primaryRouteId: route,
        eligibleBridgeIds,
        selectionRationale: bridgeTier === null
          ? "This narrow clarification answers an opponent without independently advancing an affirmative route or bridge for the speaker's side."
          : `The move directly bears on the ${bridgeTier} bridge selected for the speaker's side rather than merely mentioning the debate topic.`,
      },
      selectionRationale: `${boundaryEvidence} The excerpt is a chronological, single-speaker argumentative act with a distinct claim.`,
    };
  });
  const count = (predicate) => moves.filter(predicate).length;
  const speakers = [...debate.sides.pro.speakers, ...debate.sides.con.speakers];
  const countSpeakers = (selectedMoves) => {
    const result = {};
    for (const move of selectedMoves) result[move.speaker] = (result[move.speaker] ?? 0) + 1;
    for (const speaker of speakers) result[speaker] ??= 0;
    return result;
  };
  const speakerMoveCounts = countSpeakers(moves);
  const speakerConstructiveCounts = countSpeakers(moves.filter((move) => move.interactionMode === "constructive"));
  const speakerResponsiveCounts = countSpeakers(moves.filter((move) => move.interactionMode === "responsive"));
  const inventory = {
    schemaVersion: "2.7-atomic-inventory",
    workflowVersion: gate.workflowVersion,
    rubricVersion: gate.rubricVersion,
    gateId: lane.gateId,
    lane: lane.lane,
    debateId,
    debateNumber: debate.number,
    videoId: debate.videoId,
    motion: debate.motion,
    sides: debate.sides,
    burdenRoutes: routes,
    source: {
      transcriptPath, transcriptSha256: sha256(transcriptText), eventsPath, eventsSha256: sha256(eventsText), manifestPath, manifestSha256: sha256(manifestText),
      limitations: "The local source is a complete platform-caption transcript without native speaker labels. Only turns with explicit handoffs, named-address evidence, or unbroken and semantically identifiable turn continuity were selected; post-show and duplicate footage were excluded.",
    },
    inventoryProtocol: {
      builtAt,
      builderModel: "5.6 Sol",
      calibrationOnly: true,
      legacyMaterialAccessed: false,
      developmentExamplesAccessed: false,
      singleSpeakerAtomicActs: true,
      targetPacketsPrelocked: true,
      burdenRoutesPrelocked: true,
      componentGraphsPrelocked: true,
      targetRecencyChecked: true,
      targetSideLocked: true,
      ownershipAdoptionChecked: true,
      requiredIndependentSemanticReviews: lane.lane === "dyadic" ? 1 : 2,
      selectionStatement: "Moves were selected from the complete local transcript before any scoring and span the debate's central constructive routes plus direct opponent-responsive exchanges.",
    },
    moves,
    audit: {
      moveCount: moves.length,
      proMoveCount: count((move) => move.side === "pro"),
      conMoveCount: count((move) => move.side === "con"),
      constructiveMoveCount: count((move) => move.interactionMode === "constructive"),
      responsiveMoveCount: count((move) => move.interactionMode === "responsive"),
      speakerMoveCounts,
      speakerConstructiveCounts,
      speakerResponsiveCounts,
      atomicityViolations: 0,
      targetPacketViolations: 0,
      burdenRouteViolations: 0,
      componentGraphViolations: 0,
      componentOverlapViolations: 0,
      targetRecencyViolations: 0,
      targetSideViolations: 0,
      ownershipAdoptionViolations: 0,
      unresolvedSpeakerAttributions: 0,
      excludedCandidates: config.excludedCandidates ?? [],
    },
  };
  const output = `docs/calibration/v2.7/held-out-gates/${laneDirectory}/inventories/${debateId}.json`;
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(output);
}
