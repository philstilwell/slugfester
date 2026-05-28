const fallacy = (slug) => `https://logfall.com/fallacies/${slug}/`;
const bias = (slug) => `https://cogbias.site/biases/${slug}/`;

export const debates = [
  {
    id: "craig-oconnor-god-debate-2026",
    title: "Alex O'Connor vs William Lane Craig: Does God Exist?",
    label: "Christian theism",
    date: "2026-05-21",
    duration: "1 hr 49 min",
    youtubeUrl: "https://www.youtube.com/watch?v=TAW6-_L4z9M",
    motion:
      "Does God exist, and do cosmology, fine-tuning, morality, resurrection, and suffering support or undermine Christian theism?",
    summary:
      "Craig builds a cumulative case for Christian theism; O'Connor presses the Kalam argument, time, infinity, and animal suffering.",
    sourceNote:
      "Built from the Chrome-generated NoteGPT transcript plus YouTube chapter timing. Analytical summaries are condensed and lightly cleaned; direct quotes are kept short.",
    scoringNote:
      "Scores are AI-generated estimates based on conventional notions of logical coherence, relevance to the motion, evidential support, rebuttal quality, and absence of logical fallacies or cognitive-bias-driven overreach.",
    quotes: {
      pro: {
        text: "God is the best explanation",
        context:
          "Craig's case is cumulative: cosmology, fine-tuning, morality, resurrection, and religious experience are presented as mutually reinforcing evidence for Christian theism."
      },
      con: {
        text: "Did the universe have a beginning?",
        context:
          "O'Connor's core move is diagnostic: test the Kalam's premises and then ask whether animal suffering is expected under Christian theism."
      }
    },
    sides: {
      pro: {
        name: "Theist",
        speaker: "William Lane Craig",
        color: "teal"
      },
      con: {
        name: "Agnostic atheist",
        speaker: "Alex O'Connor",
        color: "coral"
      }
    },
    score: {
      pro: 71,
      con: 80
    },
    sections: [
      {
        title: "Opening case and first response",
        timebox: "02:08-15:23",
        score: {
          pro: 76,
          con: 80
        },
        exchanges: [
          {
            pro: {
              time: "05:50",
              role: "Cumulative case",
              words:
                "Craig stacks cosmology, fine-tuning, objective morality, modal possibility, resurrection evidence, and personal experience into one cumulative theistic case.",
              score: 78,
              critique:
                "The cumulative structure is strong because no single premise carries all the weight. The risk is compression: several large arguments are asserted faster than they can be tested.",
              tags: [
                {
                  label: "Belief bias",
                  type: "bias",
                  url: bias("belief-bias")
                }
              ]
            },
            con: {
              time: "11:31",
              role: "Burden test",
              words:
                "O'Connor asks whether the universe began, how we would know, and why a beginning would require the kind of cause Craig wants.",
              score: 82,
              critique:
                "Very strong framing. He targets the load-bearing premises instead of merely denying the conclusion, which keeps the exchange analytical rather than tribal.",
              tags: []
            }
          },
          {
            pro: {
              time: "07:50",
              role: "Historical claim",
              words:
                "Craig appeals to the empty tomb, appearances, and disciples' sincere belief as evidence for the resurrection hypothesis.",
              score: 70,
              critique:
                "Relevant to Christian theism, but too compressed here. The historical criteria and rival explanations are invoked more than demonstrated in this segment.",
              tags: [
                {
                  label: "Appeal to authority",
                  type: "fallacy",
                  url: fallacy("appeal-to-authority")
                }
              ]
            },
            con: {
              time: "12:31",
              role: "Scientific challenge",
              words:
                "O'Connor distinguishes the Big Bang as a hot dense state from proof of an absolute first moment.",
              score: 78,
              critique:
                "Good precision. The point usefully separates cosmological evidence from philosophical extrapolation, though the survey appeal would need fuller sourcing.",
              tags: [
                {
                  label: "Authority bias",
                  type: "bias",
                  url: bias("authority-bias")
                }
              ]
            }
          }
        ]
      },
      {
        title: "Infinity and the Kalam",
        timebox: "15:23-31:20",
        score: {
          pro: 80,
          con: 78
        },
        exchanges: [
          {
            pro: {
              time: "25:44",
              role: "Clarification",
              words:
                "Craig separates two Kalam supports: actual infinities cannot exist concretely, and an infinite series cannot be formed by successive addition.",
              score: 84,
              critique:
                "This is one of Craig's strongest moves. He repairs the map of the debate and shows that O'Connor had folded two distinct arguments together.",
              tags: []
            },
            con: {
              time: "16:00",
              role: "Conceptual rebuttal",
              words:
                "O'Connor argues that Hilbert's Hotel is unintuitive, not contradictory, because 'full' can mean every room is occupied.",
              score: 77,
              critique:
                "A useful semantic challenge. It weakens the intuitive shock of the hotel example, but does less against Craig's independent successive-addition argument.",
              tags: [
                {
                  label: "Equivocation",
                  type: "fallacy",
                  url: fallacy("equivocation")
                }
              ]
            }
          },
          {
            pro: {
              time: "28:44",
              role: "Standard event",
              words:
                "Craig defines events as changes and says a standard interval, chosen conventionally, can still count elapsed past events.",
              score: 76,
              critique:
                "The answer is technically disciplined, but it leans on a conventional unit to support a metaphysical conclusion about reality.",
              tags: [
                {
                  label: "Special pleading",
                  type: "fallacy",
                  url: fallacy("special-pleading")
                }
              ]
            },
            con: {
              time: "20:00",
              role: "Unit challenge",
              words:
                "O'Connor asks what the infinite series is a series of: events, moments, seconds, hours, or something else.",
              score: 81,
              critique:
                "Strong diagnostic question. It forces the abstract Kalam language to specify the real-world items allegedly being traversed.",
              tags: [
                {
                  label: "Ambiguity effect",
                  type: "bias",
                  url: bias("ambiguity-effect")
                }
              ]
            }
          }
        ]
      },
      {
        title: "Time, relativity, and actualized past",
        timebox: "38:04-46:40",
        score: {
          pro: 74,
          con: 82
        },
        exchanges: [
          {
            pro: {
              time: "40:19",
              role: "Framework defense",
              words:
                "Craig explains the A-theory/B-theory divide and says later work defends the tensed view needed by his preferred Kalam route.",
              score: 75,
              critique:
                "Helpful conceptual scaffolding. The limitation is that it gestures toward book-length defenses rather than winning the point in the live exchange.",
              tags: [
                {
                  label: "Appeal to authority",
                  type: "fallacy",
                  url: fallacy("appeal-to-authority")
                }
              ]
            },
            con: {
              time: "38:49",
              role: "Relativity challenge",
              words:
                "O'Connor argues that an objective hour is not metaphysically simple because clocks run differently under relativity.",
              score: 83,
              critique:
                "Clear and concrete. The satellite-clock example gives the audience a physical handle on what could otherwise sound like verbal fog.",
              tags: []
            }
          },
          {
            pro: {
              time: "46:19",
              role: "Concrete-series reply",
              words:
                "Craig distinguishes God's conceptual knowledge of future events from a concrete temporal series that is always finite and increasing.",
              score: 73,
              critique:
                "Coherent within Craig's own time theory, but less compelling to anyone who rejects the underlying A-theory commitments.",
              tags: [
                {
                  label: "Confirmation bias",
                  type: "bias",
                  url: bias("confirmation-bias")
                }
              ]
            },
            con: {
              time: "44:49",
              role: "Symmetry objection",
              words:
                "O'Connor asks why a non-existing past is actual while a known future is not, especially if God knows all future events.",
              score: 80,
              critique:
                "A sharp internal pressure point. It uses Craig's own divine-foreknowledge commitments to test his past/future asymmetry.",
              tags: []
            }
          }
        ]
      },
      {
        title: "Animal suffering and theodicy",
        timebox: "1:01:22-1:18:20",
        score: {
          pro: 62,
          con: 87
        },
        exchanges: [
          {
            pro: {
              time: "1:04:22",
              role: "Probability reply",
              words:
                "Craig says animal suffering is ultimately more probable on theism because life itself is more probable under fine-tuning plus God.",
              score: 58,
              critique:
                "This sidesteps the local datum. Fine-tuning may be relevant globally, but it does not directly explain why suffering is built into biological history.",
              tags: [
                {
                  label: "Red herring",
                  type: "fallacy",
                  url: fallacy("red-herring")
                },
                {
                  label: "Base-rate neglect",
                  type: "bias",
                  url: bias("base-rate-neglect")
                }
              ]
            },
            con: {
              time: "1:02:52",
              role: "Central challenge",
              words:
                "O'Connor argues that free will, soul-making, and higher-order-good theodicies do not readily apply to non-human animals.",
              score: 88,
              critique:
                "The strongest anti-theistic argument of the debate. It narrows the problem of evil to cases where common theodicies have little traction.",
              tags: []
            }
          },
          {
            pro: {
              time: "1:08:52",
              role: "Salvation theodicy",
              words:
                "Craig suggests a world with natural and moral evil may optimize the number of people who freely embrace salvation.",
              score: 64,
              critique:
                "This is logically possible, but very speculative. It asks listeners to accept a large unseen causal story without much independent evidence.",
              tags: [
                {
                  label: "Argument from ignorance",
                  type: "fallacy",
                  url: fallacy("argument-from-ignorance")
                }
              ]
            },
            con: {
              time: "1:10:17",
              role: "Pressure example",
              words:
                "O'Connor presses whether an unseen instance of predation is really necessary for human salvation.",
              score: 86,
              critique:
                "The example is vivid without being merely emotional. It forces the abstract theodicy to face a concrete hidden suffering case.",
              tags: [
                {
                  label: "Scope neglect",
                  type: "bias",
                  url: bias("scope-neglect")
                }
              ]
            }
          }
        ]
      },
      {
        title: "Animal consciousness and moral relevance",
        timebox: "1:19:10-1:33:40",
        score: {
          pro: 57,
          con: 86
        },
        exchanges: [
          {
            pro: {
              time: "1:20:20",
              role: "Pain distinction",
              words:
                "Craig says animals may have pain awareness without the second-order self-awareness that makes human suffering qualitatively distinct.",
              score: 56,
              critique:
                "The distinction is philosophically possible, but the live defense sounded under-evidenced and morally unstable under O'Connor's follow-up.",
              tags: [
                {
                  label: "Special pleading",
                  type: "fallacy",
                  url: fallacy("special-pleading")
                }
              ]
            },
            con: {
              time: "1:21:20",
              role: "Conceptual objection",
              words:
                "O'Connor argues that suffering without awareness of suffering is close to self-contradictory: pain is an experienced phenomenon.",
              score: 88,
              critique:
                "Very strong. The challenge converts a technical distinction into a plain question about what pain could even mean without awareness.",
              tags: [
                {
                  label: "Equivocation",
                  type: "fallacy",
                  url: fallacy("equivocation")
                }
              ]
            }
          },
          {
            pro: {
              time: "1:26:20",
              role: "Degree reply",
              words:
                "Craig shifts to degrees of self-consciousness, from primitive mirror-test cases to full first-person agency.",
              score: 59,
              critique:
                "More nuanced than the first claim, but it still does not show that morally relevant pain requires full first-person agency.",
              tags: []
            },
            con: {
              time: "1:28:05",
              role: "Empirical pushback",
              words:
                "O'Connor argues that sensory dependence gives some reason to think animals may feel pain more intensely, not less.",
              score: 84,
              critique:
                "A strong reversal. It does need more direct scientific citation, but it prevents the debate from treating animal pain as automatically lighter.",
              tags: []
            }
          }
        ]
      },
      {
        title: "Final framing",
        timebox: "1:37:14-1:45:20",
        score: {
          pro: 65,
          con: 82
        },
        exchanges: [
          {
            pro: {
              time: "1:38:14",
              role: "Modus ponens",
              words:
                "Craig says if there are good grounds for God, then gratuitous suffering does not exist, even if we do not know why.",
              score: 66,
              critique:
                "Valid as a conditional strategy, but it risks making the suffering evidence unfalsifiable once prior theistic confidence is high enough.",
              tags: [
                {
                  label: "Begging the question",
                  type: "fallacy",
                  url: fallacy("begging-the-question")
                }
              ]
            },
            con: {
              time: "1:39:29",
              role: "Agnostic close",
              words:
                "O'Connor says there are good reasons to believe in God and good reasons to doubt those reasons.",
              score: 81,
              critique:
                "Intellectually modest and rhetorically effective. It also accurately narrows his win condition: showing the Kalam unsound, not disproving every God.",
              tags: []
            }
          },
          {
            pro: {
              time: "1:44:14",
              role: "Interior witness",
              words:
                "Craig says ordinary believers can know God through the witness of the Holy Spirit apart from arguments and evidence.",
              score: 63,
              critique:
                "Pastorally coherent, but it weakens the public argument standard. Private warrant cannot easily settle a public dispute between incompatible experiences.",
              tags: [
                {
                  label: "Subjective validation",
                  type: "bias",
                  url: bias("subjective-validation")
                }
              ]
            },
            con: {
              time: "1:45:14",
              role: "Arbitrariness point",
              words:
                "O'Connor clarifies that the issue is not just suffering, but its apparent arbitrariness across birth, species, and circumstance.",
              score: 83,
              critique:
                "A clean final refinement. It makes the problem probabilistic and distributional, not merely emotional.",
              tags: []
            }
          }
        ]
      }
    ],
    overall: {
      pro: {
        score: 71,
        strengths: [
          "Craig's best moments came when he distinguished the two philosophical supports for the Kalam and clarified A-theory versus B-theory stakes.",
          "The cumulative-case strategy was resilient: cosmology, fine-tuning, morality, resurrection, and religious experience each supplied partial support.",
          "He repeatedly framed the debate probabilistically, which made his case harder to dismiss with one isolated objection."
        ],
        blunders: [
          {
            text:
              "The animal-suffering reply often moved from the local problem to fine-tuning or unknown divine reasons, leaving the specific suffering datum underexplained.",
            links: [
              {
                label: "Red herring",
                url: fallacy("red-herring")
              },
              {
                label: "Argument from ignorance",
                url: fallacy("argument-from-ignorance")
              }
            ]
          },
          {
            text:
              "The claim that animal pain lacks the same self-aware suffering looked under-supported and invited a damaging conceptual challenge.",
            links: [
              {
                label: "Special pleading",
                url: fallacy("special-pleading")
              }
            ]
          }
        ]
      },
      con: {
        score: 80,
        strengths: [
          "O'Connor consistently attacked load-bearing premises instead of merely denying Craig's conclusion.",
          "His strongest material was the animal-suffering challenge, especially the point that standard human-focused theodicies do not transfer neatly to non-human animals.",
          "He ended with a modest agnostic posture, which matched the evidence he had actually argued for."
        ],
        blunders: [
          {
            text:
              "Several scientific and survey-based claims were used quickly, and the page would benefit from direct citations before treating them as settled.",
            links: [
              {
                label: "Authority bias",
                url: bias("authority-bias")
              }
            ]
          },
          {
            text:
              "Some Kalam objections pressured Craig's preferred framing without fully answering the separate successive-addition argument.",
            links: [
              {
                label: "Ambiguity effect",
                url: bias("ambiguity-effect")
              }
            ]
          }
        ]
      }
    }
  }
];
