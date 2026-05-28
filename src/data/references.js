export const referenceDefinitions = {
  fallacy: {
    "appeal-to-authority": {
      label: "Appeal to authority",
      definition:
        "Relying on a person or institution's status as if it settles the argument, especially when the relevant evidence, expertise, or consensus has not been shown.",
      externalUrl: "https://logfall.com/fallacies/appeal-to-authority/"
    },
    "argument-from-ignorance": {
      label: "Argument from ignorance",
      definition:
        "Treating a claim as true because it has not been disproved, or false because it has not been proved, rather than supplying positive evidence.",
      externalUrl: "https://logfall.com/fallacies/argument-from-ignorance/"
    },
    "begging-the-question": {
      label: "Begging the question",
      definition:
        "Assuming, directly or indirectly, the very point that needs to be established, so the conclusion is smuggled into the premises.",
      externalUrl: "https://logfall.com/fallacies/begging-the-question/"
    },
    equivocation: {
      label: "Equivocation",
      definition:
        "Shifting the meaning of a key word or phrase during the argument, making the reasoning seem stronger than it is.",
      externalUrl: "https://logfall.com/fallacies/equivocation/"
    },
    "red-herring": {
      label: "Red herring",
      definition:
        "Diverting attention from the issue under dispute to a related but less relevant point, leaving the original challenge insufficiently answered.",
      externalUrl: "https://logfall.com/fallacies/red-herring/"
    },
    "special-pleading": {
      label: "Special pleading",
      definition:
        "Applying an exception or different standard to one side of the argument without giving a principled reason for the difference.",
      externalUrl: "https://logfall.com/fallacies/special-pleading/"
    }
  },
  bias: {
    "ambiguity-effect": {
      label: "Ambiguity effect",
      definition:
        "Preferring clearer or more familiar claims over uncertain ones, even when the uncertain option may deserve serious consideration.",
      externalUrl: "https://cogbias.site/biases/ambiguity-effect/"
    },
    "authority-bias": {
      label: "Authority bias",
      definition:
        "Giving extra weight to a claim because it comes from a perceived authority, sometimes beyond what the evidence itself supports.",
      externalUrl: "https://cogbias.site/biases/authority-bias/"
    },
    "base-rate-neglect": {
      label: "Base-rate neglect",
      definition:
        "Underweighting general background rates or prior probabilities while focusing too heavily on a vivid specific case or local detail.",
      externalUrl: "https://cogbias.site/biases/base-rate-neglect/"
    },
    "belief-bias": {
      label: "Belief bias",
      definition:
        "Judging an argument by whether its conclusion feels believable instead of evaluating whether the conclusion follows from the premises.",
      externalUrl: "https://cogbias.site/biases/belief-bias/"
    },
    "confirmation-bias": {
      label: "Confirmation bias",
      definition:
        "Seeking, interpreting, or remembering evidence in ways that favor an existing view while discounting contrary information.",
      externalUrl: "https://cogbias.site/biases/confirmation-bias/"
    },
    "scope-neglect": {
      label: "Scope neglect",
      definition:
        "Failing to adjust judgment in proportion to the scale, number, or magnitude of what is being discussed.",
      externalUrl: "https://cogbias.site/biases/scope-neglect/"
    },
    "subjective-validation": {
      label: "Subjective validation",
      definition:
        "Treating a claim as especially accurate or meaningful because it feels personally resonant or confirms one's private experience.",
      externalUrl: "https://cogbias.site/biases/subjective-validation/"
    }
  }
};

export function getReferenceDefinition(type, slug) {
  return referenceDefinitions[type]?.[slug] || null;
}

export function referenceFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const slug = parts[1];

    if (parsed.hostname === "logfall.com" && parts[0] === "fallacies" && slug) {
      return { type: "fallacy", slug };
    }

    if (parsed.hostname === "cogbias.site" && parts[0] === "biases" && slug) {
      return { type: "bias", slug };
    }
  } catch {
    return null;
  }

  return null;
}
