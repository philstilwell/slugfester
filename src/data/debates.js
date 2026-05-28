const fallacy = (slug) => `https://logfall.com/fallacies/${slug}/`;
const bias = (slug) => `https://cogbias.site/biases/${slug}/`;

export const debates = [
  {
    id: "civic-energy-transition-demo",
    title: "Civic Energy Transition",
    label: "Demo transcript",
    date: "2026-05-28",
    duration: "42 min",
    youtubeUrl: "https://www.youtube.com/results?search_query=urban+energy+transition+debate",
    motion: "Should cities require all-electric systems in new public buildings by 2030?",
    summary:
      "A compact demonstration debate showing how transcript excerpts, critiques, scores, and reference links fit together.",
    sides: {
      pro: {
        name: "Affirmative",
        speaker: "Rina Vale",
        color: "teal"
      },
      con: {
        name: "Negative",
        speaker: "Marcus Hale",
        color: "coral"
      }
    },
    score: {
      pro: 76,
      con: 68
    },
    sections: [
      {
        title: "Opening claims",
        timebox: "00:00-09:40",
        score: {
          pro: 78,
          con: 65
        },
        exchanges: [
          {
            pro: {
              time: "01:12",
              role: "Claim",
              words:
                "New public buildings last for decades. If we keep installing gas systems now, we lock residents into avoidable maintenance, indoor air risks, and future retrofit costs.",
              score: 82,
              critique:
                "Strong time-horizon framing: the argument ties today's construction choices to future cost exposure. It would be stronger with a concrete retrofit-cost range.",
              tags: [
                {
                  label: "Status quo bias",
                  type: "bias",
                  url: bias("status-quo-bias")
                }
              ]
            },
            con: {
              time: "02:04",
              role: "Rebuttal",
              words:
                "That assumes the electric grid will be clean and resilient by then. A mandate before the grid is ready could simply move emissions and outages somewhere else.",
              score: 74,
              critique:
                "Good conditional rebuttal because it attacks an assumption rather than the conclusion alone. It needs local grid projections to show the risk is probable, not just possible.",
              tags: [
                {
                  label: "Planning fallacy",
                  type: "bias",
                  url: bias("planning-fallacy")
                }
              ]
            }
          },
          {
            pro: {
              time: "04:18",
              role: "Evidence",
              words:
                "The city already buys renewable power for municipal accounts, so the building standard would align capital projects with an energy contract we have already adopted.",
              score: 77,
              critique:
                "Relevant local evidence. The argument gains force because it connects the mandate to an existing policy commitment instead of treating the city as a blank slate.",
              tags: []
            },
            con: {
              time: "05:31",
              role: "Challenge",
              words:
                "A contract on paper is not the same as physical reliability. If winter demand spikes, residents will not care that the accounting looks green.",
              score: 67,
              critique:
                "The distinction between accounting and reliability is fair. The jab about what residents will care about adds heat but not much proof.",
              tags: [
                {
                  label: "Appeal to emotion",
                  type: "fallacy",
                  url: fallacy("appeal-to-emotion")
                }
              ]
            }
          }
        ]
      },
      {
        title: "Cost and feasibility",
        timebox: "09:40-23:15",
        score: {
          pro: 73,
          con: 71
        },
        exchanges: [
          {
            pro: {
              time: "10:22",
              role: "Claim",
              words:
                "The construction premium is shrinking each year. The city should set a clear 2030 target now, then use competitive bids to keep the transition disciplined.",
              score: 75,
              critique:
                "Moderately strong: it combines direction with procurement discipline. The phrase 'shrinking each year' needs trend data to avoid sounding like a hopeful generalization.",
              tags: [
                {
                  label: "Optimism bias",
                  type: "bias",
                  url: bias("optimism-bias")
                }
              ]
            },
            con: {
              time: "11:47",
              role: "Rebuttal",
              words:
                "Every major city project goes over budget. Adding an electric mandate guarantees another expensive symbolic gesture.",
              score: 54,
              critique:
                "This overgeneralizes from project overruns to a guaranteed failure. It also labels the policy symbolic before assessing its operational effects.",
              tags: [
                {
                  label: "Hasty generalization",
                  type: "fallacy",
                  url: fallacy("hasty-generalization")
                },
                {
                  label: "Availability heuristic",
                  type: "bias",
                  url: bias("availability-heuristic")
                }
              ]
            }
          },
          {
            pro: {
              time: "14:03",
              role: "Counter",
              words:
                "The budget problem is real, but it argues for staged standards and published cost benchmarks, not for building new facilities around fuel systems we plan to retire.",
              score: 83,
              critique:
                "Excellent rebuttal structure: it concedes the live concern, narrows the implication, and offers a governance mechanism instead of dismissing the objection.",
              tags: []
            },
            con: {
              time: "16:11",
              role: "Evidence",
              words:
                "Hospitals and shelters need backup heat. Until batteries and heat pumps are proven in emergencies here, the mandate creates a public-safety gamble.",
              score: 79,
              critique:
                "Strongest negative argument so far. It names high-stakes edge cases and asks for local proof under stress conditions.",
              tags: [
                {
                  label: "Base-rate neglect",
                  type: "bias",
                  url: bias("base-rate-neglect")
                }
              ]
            }
          }
        ]
      },
      {
        title: "Equity and implementation",
        timebox: "23:15-36:50",
        score: {
          pro: 79,
          con: 67
        },
        exchanges: [
          {
            pro: {
              time: "24:02",
              role: "Claim",
              words:
                "Low-income neighborhoods usually get the oldest, least efficient public buildings. A new standard should start with libraries, clinics, and schools in those areas.",
              score: 81,
              critique:
                "Persuasive equity linkage. It turns a citywide technical standard into a prioritization rule, which makes the policy easier to evaluate.",
              tags: []
            },
            con: {
              time: "25:36",
              role: "Rebuttal",
              words:
                "If the city cared about those neighborhoods, it would fix crime and housing first instead of chasing fashionable climate targets.",
              score: 46,
              critique:
                "This changes the subject from building standards to other civic problems. Those problems may matter, but they do not answer whether the proposal improves public buildings.",
              tags: [
                {
                  label: "Red herring",
                  type: "fallacy",
                  url: fallacy("red-herring")
                },
                {
                  label: "False dilemma",
                  type: "fallacy",
                  url: fallacy("false-dilemma")
                }
              ]
            }
          },
          {
            pro: {
              time: "29:44",
              role: "Rebuttal",
              words:
                "The city can address safety, housing, and public infrastructure at the same time. The question tonight is whether new public buildings should be built to the standard we already know they will need.",
              score: 84,
              critique:
                "Clean reset. It identifies the false either-or structure and returns the exchange to the motion without dodging the other concerns.",
              tags: [
                {
                  label: "False dilemma",
                  type: "fallacy",
                  url: fallacy("false-dilemma")
                }
              ]
            },
            con: {
              time: "31:28",
              role: "Counter",
              words:
                "A narrow mandate can still crowd out attention and staff time. The proposal needs a cap, a waiver process, and public reporting before it deserves a yes.",
              score: 78,
              critique:
                "Solid practical counterproposal. It improves the negative side by moving from rejection to conditions under which the policy could be responsibly tested.",
              tags: []
            }
          }
        ]
      }
    ],
    overall: {
      pro: {
        score: 78,
        strengths: [
          "Built a consistent case around asset life cycles, avoided future retrofit costs, and policy alignment.",
          "Handled the strongest cost objection by conceding budget risk and proposing benchmarks.",
          "Used equity as a prioritization mechanism rather than as a slogan."
        ],
        blunders: [
          {
            text:
              "Several claims relied on future cost and grid assumptions without numerical ranges.",
            links: [
              {
                label: "Planning fallacy",
                url: bias("planning-fallacy")
              }
            ]
          },
          {
            text:
              "The opening would benefit from clearer base rates for retrofit costs and emergency performance.",
            links: [
              {
                label: "Base-rate neglect",
                url: bias("base-rate-neglect")
              }
            ]
          }
        ]
      },
      con: {
        score: 68,
        strengths: [
          "Pressed the affirmative on reliability, emergency performance, and budget controls.",
          "Gained ground when it offered waiver and reporting conditions instead of blanket opposition.",
          "Correctly separated renewable accounting from physical grid resilience."
        ],
        blunders: [
          {
            text:
              "The broad claim that every city project overruns budget treated memorable failures as decisive evidence.",
            links: [
              {
                label: "Hasty generalization",
                url: fallacy("hasty-generalization")
              },
              {
                label: "Availability heuristic",
                url: bias("availability-heuristic")
              }
            ]
          },
          {
            text:
              "The equity exchange drifted into crime and housing, which distracted from the building-standard motion.",
            links: [
              {
                label: "Red herring",
                url: fallacy("red-herring")
              },
              {
                label: "False dilemma",
                url: fallacy("false-dilemma")
              }
            ]
          }
        ]
      }
    }
  }
];
