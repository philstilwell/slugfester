const panelDebateIds = new Set([
  "williams-goff-oldfield-oconnor-between-god-atheism-2024",
  "knechtle-oconnor-halper-biblical-god-2024",
  "carroll-shermer-hutchinson-dsouza-science-religion-2012",
  "singer-frazier-swinburne-oconnor-morality-2025",
  "hitchens-kushner-gomes-god-religion-morality-2009",
  "krauss-meyer-lamoureux-god-science-universe-2016",
  "craig-frazier-goff-folley-god-reality-2026",
  "knechtle-aronra-tjump-christianity-true-2023",
  "craig-williams-hossenfelder-zizek-god-reality-2026",
  "horn-bertuzzi-oconnor-schmid-problem-evil-2022",
  "knechtles-oconnor-bible-ethics-grace-2024",
  "alexander-moody-carroll-novella-death-2014",
  "koukl-oconnor-kanojia-nonbelief-harm-2025",
  "onaiyekan-widdecombe-fry-hitchens-catholic-church-force-good-2009",
  "dawkins-williams-kenny-humanity-ultimate-origins-2012",
  "enoch-sampson-loeb-lutz-moral-realism-2024"
]);

function withoutTerminalPunctuation(value) {
  return String(value || "").trim().replace(/[.!?]+$/, "");
}

function buildSideContribution(debate, sideKey) {
  const side = debate.sides[sideKey];
  const overall = debate.overall[sideKey];
  const strengths = overall.strengths.map(withoutTerminalPunctuation);
  const limitation = withoutTerminalPunctuation(overall.blunders[0].text);
  const sectionNames = debate.sections
    .slice(0, 3)
    .map((section) => section.title)
    .join(", ");

  return {
    finalArgument: {
      thesis: `The AI steelman for ${side.name} combines the side's strongest recorded claims into a measured case that directly answers the clearest objection raised in the debate.`,
      premises: [
        `The case's strongest foundation is this recorded point: ${strengths[0]}.`,
        `A second supporting consideration is this recorded point: ${strengths[1]}.`,
        strengths[2]
          ? `The cumulative case also gains support from this recorded point: ${strengths[2]}.`
          : `The case should connect its conclusion explicitly to the evidence discussed across ${sectionNames}, instead of relying on one isolated exchange.`,
        `The strengthened position must directly answer this recorded limitation: ${limitation}.`
      ],
      conclusion: `Therefore, ${side.name} is supported only insofar as this combined case explains the debate's central evidence better than its rival while surviving the stated limitation.`
    },
    newArguments: [
      {
        title: "Comparative prediction test",
        text: `A stronger version would turn the motion into a comparison of expectations. The ${side.name} side should identify which observations are more likely if its account is correct, which are more likely under the rival account, and what evidence would change the conclusion. Applied to the question—${debate.motion}—this approach replaces isolated possibility claims with a cumulative test and prevents one attractive example from carrying the entire case.`
      },
      {
        title: "Objection stress test",
        text: `The case can gain credibility by adopting its opponent's strongest pressure point: ${limitation}. Rather than dismissing that concern, the side should state a specific repair, acknowledge what remains uncertain, and describe how an observer could distinguish its explanation from the leading alternatives. A conclusion that survives this stress test is stronger because it shows where the argument could fail and why the available evidence still favors it.`
      }
    ]
  };
}

export function addMissingAiContributions(debates) {
  debates.forEach((debate) => {
    if (!panelDebateIds.has(debate.id) || debate.logicalExtension) return;

    debate.logicalExtension = {
      pro: buildSideContribution(debate, "pro"),
      con: buildSideContribution(debate, "con")
    };
  });
}
