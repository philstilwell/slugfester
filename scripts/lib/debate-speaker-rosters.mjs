export const MULTI_SPEAKER_ROSTERS = Object.freeze({
  "williams-goff-oldfield-oconnor-between-god-atheism-2024": { pro: ["Rowan Williams", "Philip Goff", "Elizabeth Oldfield"], con: ["Alex O'Connor"] },
  "knechtle-oconnor-halper-biblical-god-2024": { pro: ["Cliffe Knechtle", "Stuart Knechtle"], con: ["Alex O'Connor", "Phil Halper"] },
  "carroll-shermer-hutchinson-dsouza-science-religion-2012": { pro: ["Sean Carroll", "Michael Shermer"], con: ["Ian Hutchinson", "Dinesh D'Souza"] },
  "singer-frazier-swinburne-oconnor-morality-2025": { pro: ["Peter Singer", "Jessica Frazier", "Richard Swinburne"], con: ["Alex O'Connor"] },
  "hitchens-kushner-gomes-god-religion-morality-2009": { pro: ["Harold Kushner", "Peter Gomes"], con: ["Christopher Hitchens"] },
  "krauss-meyer-lamoureux-god-science-universe-2016": { pro: ["Lawrence Krauss"], con: ["Stephen Meyer", "Denis Lamoureux"] },
  "craig-frazier-goff-folley-god-reality-2026": { pro: ["William Lane Craig"], con: ["Jessica Frazier", "Philip Goff", "Joe Folley"] },
  "knechtle-aronra-tjump-christianity-true-2023": { pro: ["Cliffe Knechtle", "Stuart Knechtle"], con: ["Aron Ra", "Tom Jump"] },
  "craig-williams-hossenfelder-zizek-god-reality-2026": { pro: ["William Lane Craig", "Rowan Williams"], con: ["Sabine Hossenfelder", "Slavoj Žižek"] },
  "horn-bertuzzi-oconnor-schmid-problem-evil-2022": { pro: ["Trent Horn", "Cameron Bertuzzi"], con: ["Alex O'Connor", "Joe Schmid"] },
  "knechtles-oconnor-bible-ethics-grace-2024": { pro: ["Cliffe Knechtle", "Stuart Knechtle"], con: ["Alex O'Connor"] },
  "alexander-moody-carroll-novella-death-2014": { pro: ["Eben Alexander", "Raymond Moody"], con: ["Sean Carroll", "Steven Novella"] },
  "koukl-oconnor-kanojia-nonbelief-harm-2025": { pro: ["Greg Koukl"], con: ["Alex O'Connor", "Alok Kanojia"] },
  "onaiyekan-widdecombe-fry-hitchens-catholic-church-force-good-2009": { pro: ["John Onaiyekan", "Ann Widdecombe"], con: ["Stephen Fry", "Christopher Hitchens"] },
  "dawkins-williams-kenny-humanity-ultimate-origins-2012": { pro: ["Rowan Williams"], con: ["Richard Dawkins", "Anthony Kenny"] },
  "enoch-sampson-loeb-lutz-moral-realism-2024": { pro: ["David Enoch", "Eric Sampson"], con: ["Don Loeb", "Matthew Lutz"] }
});

export function debateSpeakerRoster(debate) {
  return MULTI_SPEAKER_ROSTERS[debate.id] ?? { pro: [debate.sides.pro.speaker], con: [debate.sides.con.speaker] };
}

