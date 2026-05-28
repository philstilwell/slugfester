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
                "This is a respectable opening because Craig does not make the debate depend on one brittle syllogism. By presenting cosmology, fine-tuning, moral realism, modality, resurrection, and religious experience as a cumulative case, he gives the listener several independent routes into theism. The weakness is that the compression creates a burden-of-proof problem: each component is controversial enough to require its own defense, but the format lets them arrive more as a list of supports than as fully argued premises. The score is strong but not elite because cumulative cases gain resilience from breadth, yet lose force when the links between the pieces and the specifically Christian conclusion are not made explicit. That balance justifies a positive score while keeping the opening short of decisive.",
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
                "This is a strong response because O'Connor identifies the pressure points before trying to refute the conclusion. He does not simply say that God is an unnecessary explanation; he asks whether the universe began, what would count as evidence of a beginning, and whether beginning entails the sort of cause Craig needs. That sequence keeps the objection logically organized and prevents the discussion from becoming a clash of intuitions. The limitation is that the response is mostly a diagnostic frame rather than a completed refutation at this stage. Still, as an opening rebuttal it is high-quality because it announces clear criteria for success and invites the audience to track premises rather than personalities. It earns strength by improving the rules of evaluation before scoring the case.",
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
                "This argument is relevant because a resurrection case, if sound, would move the debate from generic theism toward Christian theism. Craig also chooses recognizable historical claims: burial, empty tomb, appearances, and the disciples' sincere conviction. The problem is that the live presentation treats scholarly agreement and historical-method language as doing more work than the audience can verify in the moment. A resurrection hypothesis has to compete with alternative explanations, assess source reliability, and bridge from reported experiences to divine action. Here those steps are named rather than developed. The score is moderate because the argument has a clear structure, but the warrant is too compressed to earn the confidence its conclusion requires. It needs slower evidential unpacking before functioning as more than cumulative reinforcement.",
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
                "O'Connor's distinction is logically useful: evidence for an early hot, dense state is not automatically evidence for an absolute first moment. That matters because Craig's Kalam route needs more than a dramatic cosmological boundary; it needs a beginning in the relevant metaphysical sense. The rebuttal is strong because it separates observation from extrapolation and reminds listeners that scientific models can underdetermine philosophical conclusions. The weakness is that O'Connor gestures toward surveys and expert disagreement without furnishing enough detail for the audience to weigh the claim independently. Even so, the move successfully lowers the confidence one should place in a simple Big Bang therefore beginning inference. It is a defeater of overstatement, not a complete cosmology in miniature.",
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
                "This is one of Craig's best moments because he slows the exchange down and restores argumentative distinctions. Separating the impossibility of concrete actual infinities from the impossibility of forming an infinite series by successive addition is not pedantry; it changes what O'Connor must answer. If one route fails, the other may still survive. Craig also usefully connects the successive-addition problem to a Zeno-style structure, making the abstract issue easier to follow. The score is high because clarification is a real argumentative virtue here. Its limit is that clarification does not yet prove either premise, but it prevents the critique from winning by attacking a blurred target. That makes it a strong repair move rather than a final demonstration.",
              tags: []
            },
            con: {
              time: "16:00",
              role: "Conceptual rebuttal",
              words:
                "O'Connor argues that Hilbert's Hotel is unintuitive, not contradictory, because 'full' can mean every room is occupied.",
              score: 77,
              critique:
                "O'Connor's response to Hilbert's Hotel is effective at reducing the rhetorical shock of the example. By distinguishing 'full' as every room occupied from 'full' as unable to admit more guests, he shows that the apparent contradiction may partly depend on ordinary-language expectations being imported into an infinite case. That is a good move against arguments that lean heavily on intuition. The limitation is that showing an example is unintuitive rather than contradictory does not by itself show that actual infinities can exist concretely. It also leaves Craig's separate successive-addition argument largely untouched. So the point is sharp and relevant, but narrower than it may first appear. It scores well as deflation, less well as a positive metaphysical alternative.",
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
                "Craig's reply has discipline because he does not leave 'event' as a vague placeholder. Defining an event as a change and allowing a conventional standard interval gives him a countable series for the Kalam argument to operate on. That helps answer O'Connor's question about what exactly would be infinite. The vulnerability is that a conventionally selected unit may not carry the metaphysical weight Craig wants. If the unit is chosen by us for counting convenience, critics can ask whether its resulting infinity reveals a feature of reality or merely of our measuring scheme. The score is mixed-strong because the answer is coherent, but the bridge from convention to ontology remains delicate. The unresolved issue is whether countability here tracks impossibility or bookkeeping.",
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
                "This is a strong diagnostic objection because it asks the Kalam advocate to identify the members of the allegedly impossible infinite series. 'An infinite past' can sound decisive until one asks whether the relevant items are events, moments, seconds, causal stages, physical changes, or something else. O'Connor's point is not merely verbal: different choices may behave differently under relativity, divisibility, or metaphysical theories of time. The move is also useful pedagogically, since it makes the audience notice how much argumentative work is hidden in a phrase like 'traversing the infinite.' It does not yet defeat Craig's answer, but it forces a level of precision the argument needs. Precision pressure is often where abstract arguments either sharpen or quietly collapse.",
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
                "Craig gives the audience an important map of the A-theory and B-theory dispute, and that is valuable because the Kalam argument changes shape depending on one's theory of time. His answer also shows intellectual seriousness: he has not ignored the metaphysical difficulty but has written extensively on it. The weakness is that citing book-length defenses cannot substitute for giving the decisive reason in the live exchange. For listeners who do not already share Craig's tensed theory of time, the appeal may feel like a promissory note. The score reflects a clear and relevant framework, while marking down the fact that the defense is mostly deferred. The framework matters, but the argument still needs live argumentative traction.",
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
                "O'Connor's relativity point is one of his clearest technical challenges because it converts an abstract dispute about time into a concrete example involving clocks. If time does not tick uniformly across reference frames or gravitational contexts, then treating 'one hour' as an uncomplicated metaphysical standard becomes less obvious. The argument is not a knockdown against every version of Craig's view, because a defender might distinguish physical measurement from metaphysical becoming. Still, it places real pressure on any argument that moves too quickly from everyday timekeeping to deep claims about traversed temporal units. The score is high because the objection is accessible, relevant, and difficult to dismiss as mere wordplay. It also helps non-specialists see why the metaphysics matters.",
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
                "Craig's concrete-series reply is internally coherent if one already accepts his tensed theory of time. On that view, the past has been actualized in a way the future has not, even if God knows future events conceptually. This lets him deny that an endless future creates the same problem as a beginningless past. The issue is that the answer depends heavily on the metaphysical framework under dispute. If a listener is unconvinced by A-theory, the past/future asymmetry may look asserted rather than established. The score is moderate because the response is not confused, but its persuasive force is mostly conditional on accepting Craig's prior commitments. It defends consistency more than it compels agreement.",
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
                "O'Connor's symmetry objection is strong because it pressures Craig from inside theistic assumptions rather than from an external naturalistic framework. If God knows future events with perfect specificity, O'Connor asks why those events cannot be collected conceptually in a way analogous to the past. That challenges the claim that only the past has the relevant completeness. The objection is not decisive, because Craig can distinguish knowing future truths from those events being concretely actualized. But the point is valuable because it exposes a potential tension between divine foreknowledge, the ontology of time, and the Kalam's treatment of actual infinities. It is a sharp and fair pressure test. Its strength is dialectical: it uses Craig's own tools.",
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
                "This reply is Craig's weakest major move because it shifts from the particular evidential problem to a broader background argument. Fine-tuning may, if sound, make life more probable on theism than on naturalism, but O'Connor is asking about the distribution and mechanism of suffering within life once life exists. The move therefore risks changing the comparison class: from animal suffering given a world of sentient creatures to sentient life existing at all. That is why the red-herring tag is fair. The argument is not worthless, since total evidence does matter in Bayesian reasoning, but it does not adequately address why predation, disease, starvation, and pain appear built into biological history. The local explanatory debt remains largely unpaid.",
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
                "This is probably O'Connor's strongest argument because it narrows the problem of evil to a class of cases where familiar defenses lose traction. Human free will, soul-making, courage, forgiveness, and moral growth can be offered as explanations for some human suffering, but they do not map cleanly onto hundreds of millions of years of non-human animal pain. The move is powerful because it removes easy answers without needing to prove naturalism true. It asks a focused comparative question: is this kind of suffering more expected on Christian theism or on an unguided natural order? The score is high because the challenge is specific, evidentially serious, and resistant to quick dismissal. It forces theism to explain biological history, not just human morality.",
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
                "Craig's salvation theodicy is logically possible: one can imagine that a world containing natural and moral evil produces conditions under which the optimal number of people freely accept salvation. The problem is epistemic weight. The claim asks listeners to accept a vast hidden causal economy connecting animal suffering, evolutionary history, human development, and eternal salvation. Possibility is not enough; the argument needs some reason to think this connection is likely or at least not ad hoc. The appeal to unknown divine reasons may preserve logical consistency, but it weakens explanatory transparency. The score is therefore modest: the defense blocks a simple contradiction, but does not strongly answer the evidential force of the objection. It explains by expanding mystery rather than reducing it.",
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
                "O'Connor's predation example works because it makes the abstract theodicy pay rent in a concrete case. An unseen animal death, unknown to any human observer, is a hard case for explanations that appeal to moral formation, testimony, courage, or spiritually meaningful response. The example is vivid, but it is not merely an emotional appeal; it tests whether Craig's proposed connection between suffering and salvation can plausibly cover hidden, apparently gratuitous suffering. Its weakness is that a skeptical-theist reply can always say we lack access to the relevant causal consequences. Still, the example helps the audience see what is at stake and keeps the discussion from floating at the level of abstractions. Concrete cases make evasive answers more visible.",
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
                "Craig's pain-awareness distinction is philosophically possible, but it is risky and underdeveloped in the live exchange. Distinguishing first-order pain from second-order awareness may help explain differences between human and animal suffering, yet it does not automatically show that animal pain has greatly reduced moral significance. The burden is especially high because ordinary experience with animals makes their distress seem morally salient. Once O'Connor presses what it would mean to be in pain without knowing one is in pain, the distinction begins to sound unstable to non-specialists. The score is low because the argument may have technical resources behind it, but those resources were not made persuasive in the exchange. Its moral conclusion outruns its demonstrated psychology.",
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
                "This is a very strong conceptual objection because O'Connor translates a technical distinction into a question ordinary listeners can test: what would pain be if there were no awareness of pain? If suffering is an experienced state, then sharply separating pain from awareness can look like an equivocation on the word 'suffering.' O'Connor also makes the moral implication vivid: if animal distress lacks morally relevant awareness, disturbing consequences seem to follow for how we may treat animals. The argument does not settle the science of animal consciousness, but it exposes the philosophical cost of Craig's distinction. The score is high because it is clear, forceful, and directly responsive. It also ties semantics to moral consequences.",
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
                "Craig's shift to degrees of self-consciousness improves the earlier claim because it avoids a crude all-or-nothing distinction. It is plausible that animal minds vary widely and that human first-person agency differs from many animal forms of awareness. But the live argument still leaves a crucial gap: why should morally relevant suffering require full first-person agency rather than some more basic capacity for felt aversion, distress, or pain? The mirror-test discussion also risks making the debate hinge on one imperfect proxy for self-awareness. The score remains low-moderate because the refinement is more nuanced, yet it does not establish the moral conclusion Craig needs. Nuance helps, but it does not settle relevance.",
              tags: []
            },
            con: {
              time: "1:28:05",
              role: "Empirical pushback",
              words:
                "O'Connor argues that sensory dependence gives some reason to think animals may feel pain more intensely, not less.",
              score: 84,
              critique:
                "O'Connor's empirical pushback is a strong reversal because it challenges the assumption that less rationality means less serious suffering. He argues that animals may be more governed by immediate sensory inputs and therefore may experience pain with an intensity humans should not casually minimize. This is not a complete scientific argument, and it would benefit from direct citations to animal-consciousness literature. Still, as a live rebuttal, it prevents the discussion from treating animal pain as automatically lighter or morally peripheral. It also changes the burden: if Craig wants to discount animal suffering, he needs evidence, not merely a conceptual distinction. The score is high because the move is relevant and morally clarifying. It keeps compassion aligned with evidential caution.",
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
                "Craig's modus-ponens strategy is logically valid in form: if God exists and gratuitous suffering is incompatible with God, then good independent evidence for God can support the conclusion that apparently gratuitous suffering is not actually gratuitous. That is an important point, and it prevents the problem of evil from being treated as automatically decisive. The weakness is that the move can become epistemically insulated. If prior theistic confidence is allowed to override every suffering datum, the view risks becoming unfalsifiable in practice. The score is moderate because the reasoning is formally coherent, but its evidential fairness depends on how strong the independent case for God actually is. Without that strength, the move looks circular.",
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
                "O'Connor's close is rhetorically effective because it does not overclaim. He presents himself as an agnostic who sees reasons on both sides, not as someone who has disproved every possible deity. That modesty strengthens the argument because his actual performance focused on undermining specific supports for Craig's Christian theism, especially the Kalam and animal-suffering defenses. The limitation is that agnosticism can leave the audience wanting a more developed positive worldview. Still, the win condition is appropriate: in a debate over whether Craig's case succeeds, O'Connor only needs to show that key premises or explanatory moves are weaker than advertised. The score is high for coherence and restraint. The modest close fits the evidential burden.",
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
                "Craig's appeal to the inner witness of the Holy Spirit is coherent within Christian epistemology and explains why ordinary believers need not master philosophy of religion to be rational believers. As a pastoral or internal account, it has force. In a public debate, however, it weakens the shared argumentative standard. Private religious experience is difficult to adjudicate between competing traditions, incompatible testimonies, and sincere non-experience. It may justify belief for the person who has it, but it cannot easily settle the dispute for outsiders. The score is moderate because the point is relevant to lived faith, yet less persuasive as public evidence in a debate over what all listeners should believe. It persuades insiders more readily than neutral observers.",
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
                "This is a clean final refinement because O'Connor clarifies that the issue is not merely the existence of suffering but its apparent distribution. If suffering were uniform, proportionate, or obviously tied to moral growth, some theodicies would look stronger. But suffering varies wildly by species, birthplace, biology, history, and circumstance, often with no clear connection to desert or spiritual development. That makes the problem probabilistic and distributional rather than simply emotional. The point does not prove atheism, but it raises the explanatory burden for a loving, providential God. The score is high because it sharpens the debate and avoids the caricature that the objection is just discomfort with pain. It leaves the audience with the right question.",
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
