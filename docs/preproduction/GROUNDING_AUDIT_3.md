# GROUNDING AUDIT, WAVE 3

Date 2026-07-29. Wave 3 covers what waves 1 and 2 did not touch: the horror genre reports (this is a horror game and no horror genre report had been read), the claude-assisted-engine-build domain (how this project is actually being built), QA and shipping discipline, commercial strategy, and what an art bible must specify.

Sixteen readers opened 86 reports. Five auditors judged the harvests against canon and spot checked the citations. Everything below carries a report path with a section or line range, and a repo file with a line number where a repo claim is made. Verbatim quotes are marked. SOURCED means opened and read during this wave. RECALLED means a reader summarised a section that the auditor did not independently reopen.

---

## THE HEADLINE

Ten things, worst first, in plain language.

**1. The game never checked itself against the horror genre.** The repo's own source list at `docs/preproduction/DESIGN_SOURCES.md:23-29` `[spec]` names five relevant library domains: game-systems, game-design, audio, visual, narrative. The `genres/` domain is not on it. The standing rule two lines above at `:21` `[spec]` reads: "A design argument that could have been checked against a report and was not is treated as unverified." By the repo's own rule, every systems argument about fear in this game was unverified until this wave. What the repo had cited nine times was `research/narrative/horror-writing/report.md`, which is a writing report. The horror dialogue was grounded. The horror systems never were. Fix size S, and it gates everything else in this document.

**2. Nothing in the woods is unkillable, and the library says that is the single most valuable thing missing.** `research/genres/survival-horror/report.md:727` `[SOURCED]`, verified verbatim today: "**The unkillable stalker is the most portable single system** and it rides on top of *any* combat level (none to capable) and instantly restores dread." Every creature in this design dies and the room is then safe. Size L.

**3. The live art bible describes the style that was killed.** `ART_STYLE.md:3` `[spec]`: "Everything on screen is drawn in code (js/sprites.js). No image assets." `ART_STYLE.md:8-10` `[spec]`: "Storybook cartoon: soft rounded forms, warm flat colors with baked-in top light and belly shade, a single dark outline, glossy demon eyes on anything corrupted". That is the procedural painter method rejected on 2026-07-29 and the cute register killed by ruling, and it is the stated method of the whole document, so it cannot be amended into compliance. Canon still cites it as authority: `PREMISE_2.md:1874` `[spec]` cites `ART_STYLE.md:38-40` for an IoU threshold that file does not contain. Supersede, do not patch. Size L.

**4. The headline silhouette failure is a borrowed number read backwards.** `PREMISE_2.md:1874-1876` `[spec]` calls "the measured roster mean was 0.430 pairwise IoU against a 0.60 threshold" the worst case in the game. The only 0.60 IoU in the library is `research/visual-trace/scoring-strictness-per-mode/report.md:232` `[SOURCED]`, verified verbatim today: "IoU >= **0.60** between traced and reference 10x10 occupancy grids", a fidelity check where high is good, graded only in `try-to-match` mode. Pairwise distinctness wants overlap LOW. A fidelity floor was applied as a distinctness bar, so the pass and fail directions are inverted. Retract the failure claim, size S. Set a real bar from a silhouette sheet, size M.

**5. The developer cheat overlay is in the public web build and in the installer.** `js/devtools.js` is loaded unconditionally at `index.html:666` `[code]`, and `package.json` `[code]` ships `js/**/*` into the electron-builder output. `research/qa-testing/test-environments-build-management/report.md:328` `[SOURCED]` requires debug tooling gated by build type as a compile time decision, never a runtime flag. Size S to strip on the deploy path, M to make it a real build exclusion.

**6. The commit gate names a check that cannot be run, and there is no verification below the wave gate.** `COMBAT_ARCHITECTURE.md:1122-1123` `[spec]`, verified today: "Every unit is gated by typecheck plus build plus a smoke verification before commit, regardless of who implements it." Verified absent today `[code]`: no `tsconfig.json`, no `jsconfig.json`, no eslint config, no `.github`, and `package.json` has no `test` script. So the gate today means launching Electron and playing. Size S to make the gate honest, M to build the headless smoke.

**7. The repo has no CLAUDE.md, no pillars page, and no agent policy.** Verified absent today: `CLAUDE.md` and `.claude/CLAUDE.md` `[code]`. `research/claude-assisted-engine-build/ai-assisted-development-custom-engine/report.md:507` `[SOURCED per reader]` says an agent lacking in repo convention will "invent its own convention (further fragmenting the codebase with a third way to do" the same thing. Meanwhile the identity of the game is a single line at `PREMISE_2.md:911` `[spec]` inside roughly 1.5MB of canon, so nothing can be pointed at. Size S each.

**8. Nothing about selling this game exists.** No price, no comparable set, no store page plan, no discount policy, no disposition for the free web build. Confirmed at `GROUNDING_AUDIT_1.md:367` `[spec]`: "`monetization/` (27, 0 read), `business-legal/` (5, 0), `process/` (4, 0). Nothing in this wave touches how the thing is sold, licensed or scheduled." The one item that is urgent rather than merely absent is the store page, because `research/monetization/storefronts-platform-economics/report.md:203` `[SOURCED]` calls publishing a page weeks before launch with no wishlist campaign "the single most common and most avoidable commercial failure mode in this domain, independent of platform." Size M, and the clock is already running.

**9. The death walk debt has two unbounded terms.** `COMBAT_ARCHITECTURE.md:60-66` `[spec]`, verified today: the fallen survivor "walks back over 2 plus their lifetime fall count nights, never reset", and unserved nights "bank as debt against the next fall, so the lever bites hardest on the player who dies most." The per survivor walk grows forever and the bank stacks on top. `research/monetization/conversion-retention-as-monetization/report.md:204` `[SOURCED]`: "Disproportionate loss is the loss-aversion engineering tell." That row is written for streak mechanics, so the application is analogy and is labelled as such, but the shape is the same and the fix is one number. Size S.

**10. Co-op is a tone problem, not only a seat count problem.** `research/genres/horror/report.md:101` `[SOURCED]`, verified verbatim today: horror "is near-exclusively single-player craft and dread requires controlling pacing and information for **one** attention". `research/genres/survival-horror/report.md:645` `[SOURCED]`: "**Fear-to-comedy decay in co-op**, a second player breaks isolation; banter dissolves dread; it becomes a comedy." The repo already flags co-op as unowned at `COMBAT_ARCHITECTURE.md:1073-1078` `[spec]`; that fix does not touch this. Size M to reframe co-op as the tense mode, L to fight for the fear.

---

## THE HORROR VERDICT

**The question.** This design hands the player a tool that grows all run with no ceiling, replays the same woods across twenty or more nights, and stars a creature the player is meant to pity. Can that be frightening, and what does it cost?

**The answer is yes, conditionally, and the library is unusually specific about the conditions.**

### Where the design is already right

**Repetition is an asset, not a liability, if the primary fear mechanism is the uncanny.** `research/genres/horror/report.md:248-250` `[SOURCED]`, verified: terror is "**fast to fatigue**, diminishing returns per repetition", while the uncanny is "slow to fatigue; relies on the player's own pattern-recognition, so it's hard to 'show too much of'." The uncanny needs a memorised baseline to violate. Twenty runs through the same woods is the prerequisite for it, not the enemy of it. The named tool is wrongness architecture: geometry that is subtly non functional, a room repeating with small changes. This inverts the project's own stated worry, and it is the single most useful reframe in the wave.

**Thin health against fat hits is doctrine.** `research/genres/survival-horror/report.md:390` `[SOURCED]`: horror health bars "stay *thin* relative to threat damage so a single bad encounter is lethal." Five to eight pips against integer hits of one to three satisfies this. A 3 on Mikey is 60 percent of her. The ruling is endorsed, not merely tolerated.

**Never explaining the token's maker is doctrine.** `research/genres/horror/report.md:613` `[SOURCED]`, motive legibility: the frightening pole is "partially unknowable (cosmic) OR symbolically legible (psychological)"; the failure pole is "a fully-explained, mundane motive collapses mystery into a normal antagonist." `:631` names "**Human proxies**" as a permitted technique: the player experiences the incomprehensible threat's effects, which are legible, while the threat itself is not. A tin token punched into fur by a maker who is never named is a textbook human proxy.

**Blood is allowed only if it asks a question.** `research/genres/horror/report.md:658` `[SOURCED]`, failure "Gore without dread": revulsion is "a **secondary seasoning**, not a primary mechanism on its own", and the named fix pairs body horror with restraint and the unknown ("what caused this? is it still active?"). "The first generation that can bleed" complies only when the blood raises an unanswered question rather than functioning as a splatter budget.

**The sight cost is the best idea in the design and the library has no name for it.** `research/genres/horror/report.md:410` `[SOURCED]` gives the mechanism: fear "tracks *uncertainty of outcome*, and mastery/power reduces uncertainty." Every counter the report offers (scarcity, weapon friction, swarms, a threat class combat cannot solve) is an external tax that a designer must remember to reapply, and `:795` says the power versus vulnerability question "BOTH must re-litigate this choice EVERY act." Sight is internal, automatic and proportional: the same number that buys certainty spends it. The nearest published relative is Amnesia's sanity meter, which the report frames as making the player's own attention a vulnerability. Sanity punishes looking. Sight punishes believing. That is a further step, and it should be treated as the headline system of the game, not a flavour band.

### Where the design fails the genre

**Sight taxes information. Fear needs fragility.** `research/genres/horror/report.md:355` `[SOURCED]`, verified verbatim today: "*vulnerability is the resource that must never run out*, a game that lets the player become safe (through gear, mastery, or a power curve that outpaces the threat) has spent its own fear budget." The growth curve at `COMBAT_ARCHITECTURE.md:28-30` `[spec]` reaches 3.49x damage and 5.45x throughput with no ceiling, guarded only by sight. Sight makes the player blinder, never more fragile. Nothing in three genre reports treats reduced information as a substitute for reduced safety. Sight is necessary and it is not sufficient.

**The missing half is one thing that does not die.** `research/genres/survival-horror/report.md:885` `[SOURCED]`, verified verbatim today: "**The unkillable stalker is the most portable dread system.** Make it unwinnable, fair, paced, and costly to escape; it rides on any combat level." The named reprieve pattern at `:904` is repel, not kill: you buy time at a scarce resource cost. Mapped onto this game with no invention: it is not on the room's threat count, it does not die, it follows across rooms within one night, and it is pushed back only by Vic's beam or Hollis's fire at battery or fuel cost. It must be paced rather than permanent, because always on numbs. This single system restores the vulnerability the growth curve leaks, makes cleared rooms unsafe, and hands Vic and Hollis the most important job in the night, which is the exact open worry recorded at `COMBAT_ARCHITECTURE.md:1080-1082` `[spec]` ("Vic is stated bad at killing things").

**Conviction resets nightly, so familiarity beats the sight system at the start of every run.** `COMBAT_ARCHITECTURE.md:30` `[spec]`, verified today: "Conviction resets every night." Night twenty act one is therefore played at full sight by a player who has memorised act one. `research/genres/survival-horror/report.md:642` `[SOURCED]`, ranked failure 6: "by hour 10 the corridors and monsters are familiar; the player is comfortable; fear decays", with the fix stated as reuse the space but change the pressure. The design has a depth track and no lifetime track.

**The bestiary re-tone has no anti desensitization plan.** `research/genres/horror/report.md:505-514` `[SOURCED]`, verified verbatim, gives three buildable techniques: false alarms ("a loud noise that turns out to be nothing... recalibrate the player's fear response"), "**Escalate the *rules*, not just the numbers**", and "**Retire threats before they're exhausted**... should generally not return unchanged." The retirement rule is also the premise speaking: a thing witnessed is finished. That is free story, and no preproduction doc contains the concept.

**Withholding is allowed only because a hit is survivable.** `research/genres/stealth/report.md:510` `[SOURCED]` states the test verbatim: "RULE: if the player ever dies and says 'I had no way to know,' a legibility channel is missing." Its horror section says horror breaks its own legibility rule on purpose and that it works "**only** because the consequence is a survivable chase, not an instant death." The resolution the library itself supplies: sight may tax anticipatory information (the pre room roster read, the route preview at THE CROSSING, which is already the design's instinct at `COMBAT_ARCHITECTURE.md:651-655` `[spec]`) and may never tax reactive information (wind ups, current threat position once engaged, what just hurt you). Write that as a band invariant before the sight counter is built. Cheap now, expensive as a retrofit.

**Two people talking is the cure for fear.** Covered in the headline. The library offers three fixes and the cheap one is per player supplies.

### The part the library cannot answer

**Roguelite horror is an open problem in the library, not a solved one.** `research/genres/survival-horror/report.md:965` `[SOURCED]`, verified verbatim today: procedural run based horror "trades the safe-room curve and save-tension for permadeath stakes and procedural threat; whether it can sustain *dread* (vs. *tension*) over many runs is open." The central problem of this game is named by the library and answered by nobody in it.

**Top down horror is absent.** The horror report carries exactly one `perspective =` row, `:100`, and it is `first-person` (verified by reading the Design-Inputs table today). Every atmosphere lever it names assumes an embodied camera: restricted field of view, peripheral vision, footstep and breathing audio tied to the camera. `genres/stealth` covers top down but only for legibility, never for dread. A top down camera shows the player the room, so architectural concealment is structurally unavailable and something else has to substitute. This is the same gap the art surface reached independently from `research/visual/composition-framing-visual-hierarchy/report.md` `[SOURCED per reader]`, whose horror row asks for restricted sightlines that the top down row says the camera cannot give.

**The mourned monster.** All three reports treat the creature as a thing to fear. The symbolically legible pole is the nearest neighbour and it stops well short of pity, grief, or a win condition that is also a loss. Owner: `narrative/`, which wave 2 is reading now.

### Verdict

Yes, this can be frightening, and the price is four items: one unkillable per night, a lifetime escalation track parallel to depth, a written rule that certainty never hides a warning, and a vision limit that gives a top down camera back its concealment. Add one cheap gate before any of it: `research/genres/horror/report.md:989-991` `[SOURCED]`, verified verbatim, Stage 0 is "one small space, no confirmed threat, deliberate lighting and sound design only. Get a playtester to say 'this feels wrong' with **zero** combat, jump-scares, or monster present." That is the only test that checks the eerie and never cute ruling directly, it costs S, and it precedes tool authoring.

One last thing this surface asks for and nobody owns: a silence budget. `research/genres/horror/report.md` section 3b names sound the single most powerful horror tool, with silence as a weapon and unverifiable audio cues. Full human voice acting is a content decision. The fear decision is how much silence the game buys, and the specific risk the report names is a channel mismatch, an enemy that is audibly loud while designed as silent. Chatty survivors under an eerie ruling is that mismatch.

---

## THE METHOD VERDICT

The library holds a domain about exactly this project's situation, `claude-assisted-engine-build`, 27 reports. Before this wave it had been read zero times (`GROUNDING_AUDIT_1.md:63` `[spec]`). The domain about how this project is built was the one nobody opened. That is the finding, and everything below follows from it.

### The honest judgment

**Two design passes shipped at roughly three percent grounding and had to be audited afterwards.** `GROUNDING_AUDIT_1.md:71` `[spec]` records the coverage. `research/claude-assisted-engine-build/avoiding-ai-slop-craft-taste-distinctiveness/report.md` `[SOURCED]` supplies the mechanism at section 5: undirected generation lands on the training distribution centroid. A pass grounded at three percent is close to undirected. The 28 corrections wave 1 produced are the identity leak ratchet caught early, which is the system working, but the cheaper order is to ground first.

**The volume is itself a symptom.** `AUTHENTICITY.md` is 224KB, `PREMISE_2.md` 160KB, `LIBRARY_INDEX.md` 197KB, against zero shipped reboot slice. The same report at section 8 `[SOURCED per reader]` names this precisely: "the strongest narrative craft is frequently *subtractive*", and additive volume "reads as *thoroughness* ... and is actually the *absence* of the editorial judgment that would have cut it."

**What the project already does right by these reports.** Named exclusions applied by name, which the slop report calls the highest leverage line in a brief. Candidates rejected with the generic reason stated. The taste ownership rule already written into canon at `PREMISE_2.md:458-460` `[spec]`: "There is no automated gate for 'this portrait looks cheap,' so the portrait and sprite work is quality-model work." That is the report's own section 7 restated in the creator's words, arrived at independently.

**The fleet made three verifiable errors in this session, and all three are the same error.**

* `read:build-method-4` wrote "No seed appears in `js/rooms.js` [code], a run that soft-locks a player currently cannot be reproduced by the team." False. `js/run.js:76-98` `[code]` implements mulberry32 with `read` and `seek` so the stream cursor serialises, and `js/run.js:805-809` `[code]` seeds every run from a stored number with a comment naming `entropySeed()` "the one sanctioned entropy read in the whole run system." The real gap is smaller and different: 57 `Math.random` calls remain across `js/` (counted read only today; the auditor counted 55, so the number moves), meaning the stream is seeded but not exclusive.
* `read:art-bible-1` guessed the 0.60 threshold "likely lives in `visual-trace.silhouette-first-character-read`". A grep of that file returns zero hits for that figure. The reader labelled it a guess, which is correct practice, but the guess then travelled.
* `read:build-method-5` wrote a coverage line saying "Could not open: none" and then, in section 5, said of `ai-assisted-development-custom-engine` "I could not open it." That report was never on its list and was read in full by `read:build-method-2`, so the gap it reported is not real.

All three are the same failure class, and the library names it. `research/source-code-analysis/limits-hallucination-ai-code-analysis/report.md` section 4.1 `[SOURCED per reader]`, the completeness tell: "any claim about a codebase using the words 'all,' 'every,' 'only,' 'none,' or 'never'... produced without an actual exhaustive tool-run behind it, should be treated as false until proven otherwise." An assertion of absence is a completeness claim. This fleet made three of them and got three wrong.

### Where the library contradicts a standing rule, loudly

**One contradiction, and it is a process ruling.** The standing rule allows gates batched per wave with one commit per unit. `research/claude-assisted-engine-build/guardrails-ai-driven-game-development/report.md:632` `[SOURCED]`, verified verbatim today: "A unit that has been built, run, observed to work, and committed is a *safe point* and a state the project can always return to. The stream of these safe points is what turns 'the agent made a mistake somewhere in the last three hours' from a catastrophe into 'roll back to the last green commit'." The commit is a recovery point BECAUSE the unit was verified first. Batching the gate to the wave makes every per unit commit an unverified snapshot, which is the exact thing commit per unit exists to prevent. Severity moderate to high. The resolution is cheap and does not trim anything the creator values: keep the wave gate, add a fast automatic per unit smoke below it. This does not touch the skeptic pass rule and does not touch the pace rule.

**One second order tension, medium, resolvable.** `research/claude-assisted-engine-build/reusable-claude-skills-prompt-libraries/report.md:141` `[SOURCED]` predicts that for high content volume "the highest-value library entries [will] be `new-<content-type>-from-template` scaffolds", worked at `:206` and `:589` as `new-enemy-from-template`. The recorded originality doctrine bans shared templates for anything a person can see, hear or feel. Not a collision: template the plumbing (registration, pip wiring, spawn table) and mark creature identity, tone and name as invoker supplied parameters, never fixed defaults. The same report at `:270` and `:391` sets the build trigger at three repetitions, so nothing should be built yet either way.

**One rotted guardrail.** `.claude/agents/release-gate.md:11-12` `[spec]`, verified verbatim today: "Vanilla JS plus Canvas 2D, no build step, no asset files." The repo holds 223 files under `assets/` `[code]` and `package.json` `[code]` defines electron-builder `pack` and `dist`. Gate area 6 tests mobile touch, which the reboot dropped by ruling. A rotted guardrail manufactures confidence while catching nothing.

**One instruction that rebuilds the same sensor every wave.** `.claude/agents/release-gate.md:96-97` `[spec]`, verified today: "Any test file you add goes in the repo root prefixed `__verify_` (gitignored) and you DELETE it before reporting." (Note: `read:build-method-1` cited these at `:75-76`; the true lines are `:96-97` and `:98`. Substance held, refs drifted.) `verification-loops-build-run-observe-fix` section 9 `[SOURCED per reader]` says a recurring verification gap is the trigger to build the mechanism. Delete one offs, promote anything used twice into `tools/`, where `tools/validate_rooms.cjs` `[code]` already proves the pattern.

### What should change about how the work is done

In order, and all of it is S or M.

1. **`CLAUDE.md` at repo root.** Commands, the canonical pattern file (nominate `js/traits.js:494-496` `[code]`, the `SURFACES` and `SCOPE_TABLE` audit that fails loudly on a missing cell), the validator template (`tools/validate_rooms.cjs`), pointers to the three canon docs, and a Gotchas section seeded with the reboot's own corrections, starting with "cute is dead" as a DON'T entry. Size S.
2. **`npm test`, headless, one seeded night.** Boots without a window, calls the run entry seam that already exists at `js/run.js:805` `[code]`, advances a fixed tick count, dumps structured JSON, exits with a status code. First assertion is a save round trip, because it has no feel component and it is the highest risk thing the tool rewrite touches. Size M. This is also the thing that turns a per unit commit into a real safe point.
3. **Determinism grep gate wired into that test.** `GROUNDING_AUDIT_1.md:307` `[spec]` already specifies it. Baseline today's 57 hits and ratchet down; do not require zero on day one. Size S.
4. **`docs/preproduction/PILLARS.md`, one page.** One line identity, three to five pillars each with a test and a rejects, per speaker voice for the five plus the Signed plus UI, a THINGS WE ARE NOT list harvested from existing exclusions, three named weirdness swings. Owner is the creator. Every future brief points here instead of at 1.5MB. Size S.
5. **A tenth gate area: DISTINCTIVENESS.** Substitution test against one named other roguelite, intra game line swap test, one idea test per room. The current nine areas contain zero craft lines. Size S.
6. **Fix the rotted gate.** Rewrite the repo description, swap MOBILE for CONTROLLER, add a guardrail health line to the audit cadence. Size S.
7. **`AGENT_POLICY.md`, four tiers.** Tier 3 ask first: mass delete, history rewrite, dependency install, `npm run dist`, anything touching save format. Tier 4 never without the creator at the keyboard: force push, deploy, credentials. Today the only written policy lives inside one agent file at `.claude/agents/release-gate.md:98` `[spec]`, so every brief restates it or forgets it. Size S.
8. **Keystone content.** One finished thing (Dez's night, or one room end to end) that every later brief says match THIS. Hand authored keystone content is the named mitigation for product scale identity leak, which is invisible piece by piece. Size M.
9. **Per wave paperwork.** A write set table checked pairwise disjoint before dispatch, and a written review budget estimate before fan out rather than a skeptic pass only after. `research/claude-assisted-engine-build/agentic-multi-agent-orchestration-game-dev/report.md:739` and `:1112` `[SOURCED]`: the orchestrator owns "the write-set map... the completion ledger... and the integration plan". Add a named reconciliation step after a wave's commits land, because a per unit check cannot see an enum spelled two ways across units. Size S.
10. **A proof rule for completeness claims.** Any subagent statement of the form "all callers", "safe to delete", "no seed exists", "nothing references this" is not accepted into a brief or a commit message until the orchestrator has independently grepped or opened it. This session produced three such claims and three were wrong. Make it a fixed rule, not a judgment call. Size S.
11. **Trust ledger with decay.** Rows: combat and tool code, room data, save and meta, audio pipeline, portraits, dialogue. Save and any future co-op net carry a permanent hard list annotation. Decay triggers: dependency upgrade, refactor of the domain's own code, any verified failure, elapsed time with no hard case. Size S.

Deferred on purpose: structured JSON logging (do it once the combat loop stops moving), screenshot diffing (needs stable reference art, and the GTS pipeline is not wired), a skill library (wait for three repetitions), the big file split (only what the rewrite already opens; `research/claude-assisted-engine-build/ai-legible-codebase/report.md:315` `[SOURCED]`, verified verbatim today, says "**Line count is a smell, not a law**", and puts the real trigger at a file re-read piecemeal more than once in one session).

---

## COVERAGE, HONESTLY

Counted today by listing `D:\Programs\GameTev\research`. The library now holds **729** report directories excluding `_sweeps`, up from the 727 quoted at wave 1 (`visual-trace/` grew by two). Wave 2 is still running on narrative, audio, game-design and the core loop gaps, so its reads are not countable here and are marked in flight.

| Domain | Total | Read wave 1 | Read wave 3 | Still unread |
|---|---|---|---|---|
| genres | 71 | 14 | 9 | 48 |
| game-systems | 49 | 11 | 6 | 32 |
| claude-assisted-engine-build | 27 | 0 | 24 | 3 |
| qa-testing | 35 | 6 | 19 | 10 |
| monetization | 27 | 0 | 12 | 15 |
| source-code-analysis | 52 | 0 | 6 | 46 |
| visual | 47 | 0 | 4 | 43 |
| asset-forge | 89 | 0 | 4 | 85 |
| visual-trace | 80 | 0 | 2 | 78 |
| all other domains (audio, narrative, living-world-dialogue, ux-accessibility, input-controls, multiplayer, game-design, game-dev-teaching, communities-premises, engine-tech, generative-assets, business-legal, process) | 252 | 72 | 0 | 180, minus whatever wave 2 lands |
| **TOTAL** | **729** | **103** | **86** | **540** |

Running total across waves 1 and 3: **189 of 729, which is 25.9 percent**. Wave 2 will move it and is not counted here. Rounded down, not up.

Notes that keep the table honest:

* The wave 1 per domain split is only partly stated in `GROUNDING_AUDIT_1.md`. Genres 14, game-systems 11, qa-testing 6, multiplayer 5, game-design 1 are named at `:363-370` `[spec]`. The remaining 72 are distributed across ux-accessibility, input-controls, game-dev-teaching and others without a per domain count in that document, so they sit in one row rather than being invented into rows.
* The qa-testing wave 3 count of 19 assumes no overlap with wave 1's six. `read:qa-discipline` verified no overlap for its own seven. The other twelve were not cross checked against wave 1's unnamed three, so 25 read is a ceiling, not a floor.
* Three monetization reports were opened at row level only for routing, not read: `in-game-economy-design-balancing`, `virtual-currency-design`, `subscription-game-pass-models`. They are counted as unread.
* Two of the four `visual/` reports (`species-silhouette-morphology`, `art-direction-visual-identity`) were read partially, roughly the first third, and the reader said so. They are counted as read because every citation drawn from them is inside the read range.
* The three unread `claude-assisted-engine-build` reports are named and are: `claude-assisted-workflow-setup`, `functional-cursor-recipes`, `godot-headless-failure-markers`.

**Readers whose claims did not reconcile.** No reader inflated its assigned count. Every one of the sixteen listed reports it opened, and the auditors' spot checks (12, 7, 14, 12 and 10 citations across the five surfaces) held in the large majority of cases. The exceptions, all named already above or in the surface sections: `read:build-method-4` asserted an absence in `js/rooms.js` that the repo contradicts; `read:build-method-5` wrote a coverage line that contradicts its own section 5; `read:build-method-1` drifted two line refs by about twenty lines in `.claude/agents/release-gate.md`; `read:art-bible-1` guessed a source for the 0.60 figure that does not contain it, correctly labelled as a guess; `read:qa-discipline` claimed the 85 room validator failures "sit undifferentiated", contradicted by `LEVEL_DESIGN.md:1824-1843` `[spec]`; `read:qa-quality` posed a co-op topology question already answered at `GROUNDING_AUDIT_1.md:315` and `:574` `[spec]`; `read:monetization-ethics` attributed `dlc-expansions-episodic/report.md:59` to a section number it does not carry and to a Design-Inputs condition that does not fire for a run based game; `read:monetization-store` supported a PC demo recommendation with `premium-buy-to-play/report.md:213`, a mobile scoped row. In every one of those eight cases the underlying recommendation survived; the citation did not say what was claimed.

---

## WHAT MUST CHANGE

Consolidated across the five surfaces, deduplicated, ranked. Severity then size.

**C1. CRITICAL. Strip the developer overlay from anything the public can run.** `index.html:666` `[code]`, `package.json` files glob `[code]`, `README.md:139-141` `[spec]` documents a web deploy copying `js/*.js` to the public site. Source: `research/qa-testing/test-environments-build-management/report.md:328` `[SOURCED]`. Size S on the deploy path, M as a real build configuration exclusion.

**C2. CRITICAL. Supersede `ART_STYLE.md`.** It is the killed method and the killed register, and it is still cited as authority by `PREMISE_2.md:1874` `[spec]`. Mark the old file historical, do not amend it. Source: `ART_STYLE.md:3,8-10,24-27,42` `[spec]` against `research/visual/color-theory-palettes/report.md:66` `[SOURCED]`. Size L.

**C3. CRITICAL. Retract the 0.430 against 0.60 silhouette failure and set a real bar.** Source: `research/visual-trace/scoring-strictness-per-mode/report.md:232` `[SOURCED]`, verified verbatim. Size S to retract, M to replace with a maximum pairwise overlap measured off a black silhouette sheet.

**C4. HIGH. Add the `genres/` domain to `DESIGN_SOURCES.md:23-29` and re-audit the tone ruling through it.** Source: the repo's own standing rule at `DESIGN_SOURCES.md:21` `[spec]`. Size S. Gate the rest of the horror work behind this.

**C5. HIGH. Ship one unkillable per night.** Four rules: unwinnable, fair and readable, paced not permanent, costly to escape. Repelled by Vic's beam or Hollis's fire at resource cost. Source: `research/genres/survival-horror/report.md:727,885,904` `[SOURCED]`. Size L.

**C6. HIGH. Author a lifetime nights escalation track parallel to depth.** Three or four states keyed to lifetime night count: more sign, fewer safe beats, the pursuer arriving earlier, the fire costing more. Source: `research/genres/survival-horror/report.md:642` `[SOURCED]`; the reset is at `COMBAT_ARCHITECTURE.md:30` `[spec]`. Size M.

**C7. HIGH. Rewrite the commit gate to what the repo can run, and build the thing it should run.** Today: `npm run rooms:check` compared against a recorded number, `npm run pack`, one named smoke path. Then build `npm test`. Source: `COMBAT_ARCHITECTURE.md:1122-1123` `[spec]` against verified absence of any typechecker `[code]`, plus `research/claude-assisted-engine-build/game-engine-specific-mcp-servers-tools/report.md:993` `[SOURCED]`, headless "run one scenario and exit with a status code" as "the single most valuable piece of a custom engine's connection surface". Size S then M.

**C8. HIGH. Write a rollback into the deploy procedure.** `README.md:128-145` `[spec]` documents cache busting and post deploy byte verification and says nothing about getting the previous build back. Source: `research/qa-testing/live-ops-post-launch-qa/report.md:78` `[SOURCED]` (keep the previous build one click away) and `:419` "An untested safety net is not a safety net". Rehearse it once. Size S.

**C9. HIGH. Publish the store page now, not near launch.** Source: `research/monetization/storefronts-platform-economics/report.md:203` `[SOURCED]`, verbatim: "the single most common and most avoidable commercial failure mode in this domain, independent of platform." Size M, starting immediately.

**C10. HIGH. Write the closure ruling: premium, one time purchase, no IAP, no real money bridge to tin or scrip, ever, with one future one time expansion left open under written rules.** Source: `research/monetization/premium-buy-to-play/report.md:258` `[SOURCED]`, the worked "Small-team narrative horror" scenario: repeated commercial prompts would break dread, the ending supplies a completeness boundary, and a later expansion "must be a separately intelligible story, not the withheld resolution." Plus `research/monetization/minors-spending-protections/report.md:75` `[SOURCED]`, the roguelite row: meta progression purchases must never be randomized or urgency framed, and the bar tightens if the audience skews young. Size S.

**C11. HIGH. Add `CLAUDE.md`, `PILLARS.md` and `AGENT_POLICY.md`.** Sources as in THE METHOD VERDICT. Size S each.

**C12. HIGH. Add a fast per unit smoke below the wave gate.** This is the one place the library directly contradicts a standing rule. Source: `research/claude-assisted-engine-build/guardrails-ai-driven-game-development/report.md:632` `[SOURCED]`, verified verbatim. Size M, shared with C7.

**C13. MEDIUM HIGH. Write the sight band invariant before the counter is built: certainty may take anticipatory information and may never take reactive information.** Source: `research/genres/stealth/report.md:510` `[SOURCED]` and its horror section. Size S now, L as a retrofit.

**C14. MEDIUM HIGH. Rebuild the palette against the horror row.** Dark dominant low key base, desaturated, one sickly off hue, exactly ONE reserved warning hue, and that hue belongs to the tin token and Signed blood alone. The current anchors at `ART_STYLE.md:42` `[spec]` are labelled "bumped 2026-07-27: hotter, more chroma" and spend three saturated warms plus gold, so no hue is reserved and the token's red cannot mean threat. Source: `research/visual/color-theory-palettes/report.md:66` `[SOURCED]`, verified verbatim today. Size M.

**C15. MEDIUM HIGH. Cap the death walk debt.** Source: `COMBAT_ARCHITECTURE.md:60-66` `[spec]`, verified today, plus `research/monetization/conversion-retention-as-monetization/report.md:204` `[SOURCED]` as labelled analogy and `research/monetization/in-game-economy-design-balancing/report.md:72` `[SOURCED]` as the real owner: meta sinks "should buy permanent expansion of options, not relief from a manufactured run-difficulty tax". Proposed numbers, which are a pick and not a citation: banked debt capped at 3 nights, per survivor walk capped at 5. Size S.

**C16. MEDIUM. Build the anti desensitization plan into the bestiary re-tone.** False alarm rate as a tuned constant, behaviour state escalation keyed to lifetime encounters with a family, and a named retirement point per family. Source: `research/genres/horror/report.md:505-514` `[SOURCED]`. Size M for false alarms, L for retirement.

**C17. MEDIUM. Determinism gate.** `GROUNDING_AUDIT_1.md:307` `[spec]` rules it; 57 `Math.random` calls remain in `js/` `[code]`, counted today. Source: `research/claude-assisted-engine-build/guardrails-ai-driven-game-development/report.md:149` and `:314` `[SOURCED]`, standing CI check not a one off. Size S.

**C18. MEDIUM. Room solvability validator over the state space, not the spatial graph, with a 100 out of 100 bar.** Source: `research/claude-assisted-engine-build/procedural-content-generation-pipelines-claude/report.md:711,716,1018` `[SOURCED]`: "for a runtime generator, '99/100 solvable' is a *failure* criterion", and an assistant told only "check reachability" builds the cheaper insufficient one. Home: `tools/validate_rooms.cjs` `[code]`, which already runs 50 predicates in 7 groups. Size M.

**C19. MEDIUM. Write a blocking list, and put the flash and motion toggle on it.** Start from the correction at `LEVEL_DESIGN.md:1824-1843` `[spec]`. Add settings surviving a survivor swap. Source: `research/qa-testing/accessibility-testing/report.md:94` `[SOURCED]`, a broken photosensitivity toggle in horror is "a real-harm regression, not a cosmetic one", and `:96`, settings must persist across procedural runs and meta resets. Size S.

**C20. MEDIUM. Re-derive the room bug counts.** `LEVEL_DESIGN.md:1832-1836` `[spec]` records D2 failing in 28 of 46 layouts, E3 25, D3 20. A read only run of `tools/validate_rooms.cjs` during this wave produced D2 18, D3 15, E3 15, with the 85 failures and 33 layouts totals matching the earlier baseline at `:1808-1811` `[spec]`. Re-record and note the validator version. Source: `research/qa-testing/bug-reporting-tracking/report.md:389` `[SOURCED]`, closure requires independent re confirmation against the original repro standard. Size S.

**C21. MEDIUM. Write one paragraph per character of what winning looks like.** Five asymmetric kits and no per side target. Source: `research/qa-testing/balance-systems-testing/report.md:35` `[SOURCED]`, asymmetric design is validated per side against its own intended win condition, not against parity. Size M, design work.

**C22. MEDIUM. Add one adversarial probe row for the Signing loop.** Certainty is the hoarded resource and sight is the price. Source: `research/qa-testing/balance-systems-testing/report.md:255` `[SOURCED]`, resource hoarding is "a strategy that wins by accumulating a resource... far beyond what any legitimate use requires", probed at `:257` by checking whether marginal value fails to decay or there is no opportunity cost to not spending. `GROUNDING_AUDIT_1.md:325` `[spec]` already rules an adversarial min max pass on paper, so this is one row on an existing ruling. Size S.

**C23. MEDIUM. Lock the creature cell size at 32 px and rebuild silhouettes as a set.** Already implied twice: `ART_STYLE.md:38-40` `[spec]` "read at 30 pixels", `PREMISE_2.md:58` `[spec]` "survives 32px". At that band the library allows three to four identifying carriers with a two pixel minimum feature, and any member under the floor must merge rather than shrink. Source: `research/visual/species-silhouette-morphology/report.md:125-126,269,455` `[SOURCED per reader]` and `research/visual/composition-framing-visual-hierarchy/report.md:258` `[SOURCED]`, the black silhouette sheet, because "individually-approved silhouettes routinely turn out to collide once seen as a set". Size M.

**C24. MEDIUM. Reverse the boss telegraph hold.** One reader recommended holding boss telegraph timing because the game has no invulnerability window. The game has two: `COMBAT_ARCHITECTURE.md:425` `[spec]` sets `p.iframe = 0.7` after every hit, and section 2.3's dodge table at `:514-521` `[spec]` gives per character windows of 0.24 to 0.34 with cooldowns 0.85 to 1.4. The DECLINED i-frame quote in `research/asset-forge/boss-encounter-recipes/report.md:117-118` `[SOURCED]` is about GTS's own generated Godot floor, not this game. Proceed. Size S to correct the record.

**C25. MEDIUM. Fix the mobile ruling drift in the ledger.** `COMBAT_ARCHITECTURE.md` ledger unit 3 `[spec]` still reads "Input: controller plus a touch layout that can express the design", and `js/touch.js` exists `[code]`. Touch is dropped by ruling. This decides whether a mobile compatibility axis exists at all. Size S.

**C26. LOW. Difficulty modifiers should be scarcity dials, not stat dials.** Source: `research/genres/survival-horror/report.md:335` `[SOURCED]`: "the cleanest horror difficulty knob is **resource availability**, not enemy HP/damage; harder = scarcer, which *increases* tension rather than just frustration." No conflict with opt in itself. Size S.

**C27. LOW. Standing rule on THE SIT: scrip is never purchasable and healing never gains a purchase valve.** `COMBAT_ARCHITECTURE.md:477-480` `[spec]` prices the guaranteed heal at 15 scrip to put healing in competition with the shop. Source: `research/monetization/dark-patterns-in-monetization/report.md:254` `[SOURCED]`, where genuine pacing friction "should not have a purchase-based release valve at all", and `research/monetization/monetization-model-overview-selection/report.md:74` `[SOURCED]`, avoid selling survival relief that manufactures inconvenience in order to monetize its removal. There is no violation today. Write the rule so there never is. Size S.

**C28. LOW. State once, in the room spec, that procedural room layout and procedural art are different surfaces.** The PCG report never treats pixel or vector synthesis as one of its technique classes, so "procedural rooms, fine" and "procedural art, rejected" do not conflict, and nobody should later conflate them. Source: `research/claude-assisted-engine-build/procedural-content-generation-pipelines-claude/report.md` technique class table `[SOURCED per reader]`. Size S.

---

## THE FIVE SURFACES

### Surface 1: HORROR

Verdict NEEDS CHANGES, and the process finding is larger than any design finding. Full proposal:

* **Add `genres/` to the source list and re-audit the tone ruling through it.** Do this first; it is the gate everything else passes through. Size S.
* **One unkillable per night**, specified against the four rules at `survival-horror/report.md:885`: not on the room threat count, does not die, follows across rooms within one night, repelled only by Vic's beam or Hollis's fire at battery or fuel cost, paced rather than always on. Size L.
* **Build the atmosphere toy before any creature.** Stage 0 from `horror/report.md:989-991`: one small space, no confirmed threat, lighting and sound only, and a playtester says "this feels wrong" with zero combat and no monster present. If the empty room is not unsettling, no amount of content saves the game. Size S.
* **Lifetime nights escalation track** parallel to depth, three or four authored states. Size M.
* **Budget the silence.** The fear decision is the silence budget and the unverifiable cue set, and neither exists. Named risk: a channel mismatch where the design says silent and the audio says loud. Chatty survivors under an eerie ruling is that mismatch. Size M.
* **Anti desensitization**: false alarms as a tuned rate, rules escalation before numbers escalation, and named retirement per creature family, which the premise already justifies in fiction. Size M to L.
* **The release beat is a system, not a location.** The safe room "exists to make the corridor frightening" (`survival-horror/report.md` section 3c `[SOURCED per reader]`), and the named failure is the exhausted safe room, the identical safe beat repeated. The camp fire with four small children at it is already the strongest release object in the premise. It must vary in form across nights, carry low grade pressure of its own (the scrip price already does this), and stay scarce. Size M.

### Surface 2: METHOD

Verdict NEEDS CHANGES, with two sub areas genuinely undesigned: the per unit verification loop (nothing exists below the wave gate) and the distinctiveness gate (zero craft lines in a nine area matrix). The eleven item plan is in THE METHOD VERDICT above and is not repeated here. Two additions from the code rewrite reading that belong to this surface:

* **A migration plan document before the tool rewrite dispatches.** `research/source-code-analysis/analysis-driven-refactoring-migration-planning/report.md` section 3 `[SOURCED per reader]` gives four questions (complete change set, component level map, topological order, blast radius risk), and section 4 gives the rule: a large change executes as many small independently shippable steps, never as one all or nothing rewrite. Size M.
* **A dead code removal playbook.** `research/source-code-analysis/dead-code-reachability-analysis/report.md` section 1 `[SOURCED per reader]`: "'this code is dead, therefore safe to delete' is not an observation a tool reports, it is an assertion of safety." Section 4.5 names serialization, config and engine reflection as the caveats, and the confidence table puts anything serialization touched in the never auto delete tier. Applied here: the XP system, the sprite painters, and the magnet pickup's hook contract get deprecate then remove in small batches, and the hook shape gets frozen until all its call sites move together. Size M.

### Surface 3: QA AND SHIPPING

Verdict NEEDS CHANGES, not undesigned: the repo already holds three real QA artifacts (the room validator, a written baseline and correction record, and a ten row playtest plan at `COMBAT_ARCHITECTURE.md:1087-1117` `[spec]`, of which items 5, 9 and 10 are the premise's own load bearing tests). One page, six items:

1. **Ship build hygiene rule.** No debug surface reaches a build the public can run, and the rule applies to any future level select or invincibility tool at the moment it is written. Size S.
2. **A runnable gate replacing the unrunnable one.** Per unit: `npm run rooms:check` against recorded numbers, `npm run pack`, one named smoke path, and a verification pass by someone who did not write the fix. Size S.
3. **One bug file, with the validator as its own live record.** Fields do not shrink at solo scope even though the ceremony does: title, repro from a known state, expected and actual, severity and priority as separate fields, evidence, environment, frequency as an honest ratio. Triage cadence can be as small as thirty minutes on a fixed day (`research/qa-testing/triage-bug-workflow/report.md:73` `[SOURCED]`). Size S.
4. **A written blocking list.** D1, D2, D3, E3, E4 block; the ratchet predicates do not. Add the flash and motion toggle and settings surviving a survivor swap. Size S.
5. **A five line release checklist.** Rollback payload staged, blocking list clean, accessibility toggles verified, overnight soak run, build number and one line changelog recorded. Size S.
6. **Overnight unattended soak, once determinism lands.** "a single overnight unattended soak run... before every release is a realistic, cheap minimum bar" (`research/qa-testing/stress-soak-stability-testing/report.md:78` `[SOURCED]`). Size M, depends on `GROUNDING_AUDIT_1.md:307`.

Deferred on purpose: any visual snapshot suite. Building references against code drawn placeholders before the authored asset swap wastes the work, and a mass re flag after a real art pass "is not evidence the suite is broken... it's evidence the suite is working" (`research/qa-testing/visual-snapshot-regression-testing/report.md:319` `[SOURCED]`). Start it after the swap, on HUD pips and the sight meter first. Compatibility target when a build goes wide: 3 to 6 PC configs spanning both major GPU vendors and a genuine low end box, plus browser smoke for the web build.

### Surface 4: COMMERCIAL AND ETHICS

Verdict split. Selling it is UNDESIGNED. Progression ethics is NEEDS CHANGES, small, and the economy is otherwise unusually well aligned with the library.

* **Ruling A, closure.** Premium, one time purchase, no IAP, no live store, no real money bridge to tin or scrip, ever. One future one time purchase expansion left open and unscoped, bound in advance to the rule that the ending is never the paid unit. Size S.
* **Ruling B, the walk cap.** Banked debt capped at 3 nights, per survivor walk capped at 5. Every death still costs, the escalation still reads, and there is a floor. The numbers are a pick, not a citation. Size S.
* **Ruling C, THE SIT.** Scrip is never purchasable and healing never gains a purchase valve. Replaces the proposed review meeting with a standing rule. Size S.
* **Process D, the price.** Build 8 to 15 genuinely substitutable current premium roguelites matched on audience, subgenre, platform, perceived scope, quality bar and release recency; record list price, typical realized price, review volume, discount timing and depth. Then a conservative cost floor, then a value range from playtest price prompts, then take the overlap. Write down why the number sits where it sits. Source: `research/monetization/pricing-strategy-price-points/report.md:159-161` `[SOURCED]`. Note the report's worked example (floor 14, value 18 to 26, cluster 20 to 25, pick 24.99) is a cozy life sim and is illustrative shape only. Size M.
* **Process E, the store page.** Live months ahead, wishlist velocity tracked as a KPI, demo planned. Size M, starts now.
* **Process F, the discount policy.** Take the lifecycle table verbatim as policy: launch through the trust window, no discount; trust window to 12 months, shallow, at most one moment tied event; 12 to 24 months, moderate, one or two events a year; 24 months and beyond, deeper acceptable. Absolute: never a fabricated "was" price (`research/monetization/sales-discounts-bundles/report.md:220` `[SOURCED]`). Size S.
* **Process G, the KPI sheet.** Revenue per cohort by rough spend tier, a manually tracked refund and complaint count, and a sentiment column, with the structural requirement that the health signals appear in the same review, at the same cadence, seen by the same people, as the revenue numbers (`research/monetization/monetization-kpis-analytics/report.md:300` `[SOURCED]`). Size S.

What the library confirms and nobody had credited: the 16 entry camp board at `COMBAT_ARCHITECTURE.md:690-703` `[spec]` sells options only, "owning more is more choices and never more strength in a single night", and "nothing on the board can buy a survivor" at `:65` `[spec]`. That is exactly the shape `in-game-economy-design-balancing/report.md:72` `[SOURCED]` asks for. The badge and tin economy at `js/meta.js:99-100` `[code]` has no real money hook. Room clears not kills survives every check. No monetization row contradicts anything ruled.

One dissolved question: the roguelite sale cadence and the horror tone cadence do not conflict. `sales-discounts-bundles/report.md:75` and `:82` `[SOURCED]` both say moment tied rather than calendar tied.

### Surface 5: ART BIBLE

Verdict UNDESIGNED, with the aggravating factor that a live art bible exists and contradicts two rulings in its own first ten lines. The new bible should be authored on the library's own fourteen section spine (`research/visual/art-direction-visual-identity/report.md:752-774` `[SOURCED per reader]`), for GTS authored assets, never for code painters. Minimum contents with numbers:

0. **Identity header.** One line, three to five pillars, the screenshot test (crop the HUD, can a stranger name us). Anti reference stated by name: storybook cartoon, cute eyes, warm flat colour.
1. **Palette.** Dark dominant low key base, desaturated, one sickly off hue, exactly ONE reserved warning hue, and that hue belongs to the tin token and Signed blood. Fire and Vic's beam become value and temperature events, not additional saturated hues. State a saturation ceiling as a number.
2. **Shape and silhouette.** Cell size locked at 32 px, each roster member assigned a distinct row of the sixteen family carrier matrix, merge rather than shrink below the feature floor, and the black silhouette sheet as a gate before any body is detailed.
3. **Distinctness metric, redefined.** A stated pairwise maximum occupancy overlap on a 10x10 grid at 32 px, chosen from the sheet pass and recorded as this project's own default, not as a library citation.
4. **Line quality.** Carry forward the one clean survivor of the old file: two tier weights, 2.4 silhouette and 1.0 interior, single outline colour (`ART_STYLE.md:15-17` `[spec]`).
5. **Lighting.** Three sources only (Vic's beam, Hollis's fire, the camp fire) and what each MEANS narratively. `PREMISE_2.md:1876-1879` `[spec]` already flags that no light model exists.
6. **Sight cost colour script.** The world's palette drains as tool conviction rises. This is the strongest single idea in either art harvest: it makes the game's central theme visible with zero HUD cost, using a technique the colour report already names and gives a method for.
7. **Held tool draw order, stated once.** The shipped precedent draws a held item behind the top garment because the rig has no hand primitive. GTS assets should state front or behind explicitly rather than inherit that accident.
8. **Signature colour per hero, tied to the tool.** The accent channel is scarce in the shipped vocabulary, so it must be assigned deliberately. Mikey's pink hair needs a second, non hue tell as well, because the rule is at least two channels and one of them not hue.
9. **VFX, materials, contrast and animation feel** sections present even if short. VFX is named by the report as the top coherence breaker on most teams.
10. **Telegraph silhouette rule.** Each creature's wind up frame is checked against the ground it fights on, separately from its idle pose, because the wind up is the load bearing silhouette in any attack.

---

## WHAT IS STILL UNGROUNDED

### The wave 4 plan

Read these, in this order, because each one owns a live open question this wave could not close.

1. **`game-design/core-loop-and-progression-structure`** and the rest of `game-design/` (5 total, 1 read). Owns how harsh a roguelite death penalty should be, which is the walk cap question, and the act structure of a night. Wave 2 may already be here; confirm before dispatching.
2. **`qa-testing/determinism-replay-testing` (re-read against a concrete spec), `ci-cd-build-pipeline`, `regression-smoke-sanity-testing`, `smoke-ci-automation`, `crash-error-reporting-telemetry`, `platform-compliance-certification`.** Six reports, and together they close the entire verification surface plus the Steam submission path that `README.md:123-125` `[spec]` already names.
3. **`monetization/in-game-economy-design-balancing` and `virtual-currency-design`.** The two reports most relevant to the tin and scrip economy, opened at row level only this wave.
4. **`business-legal/` (5, 0 read) plus `qa-testing/platform-compliance-certification` and `multiplayer/platform-console-certification-requirements`.** The age rating question for a horror game whose protagonists are minors and whose premise is eleven dead children is real, it is not outside the library, and three reports mention ESRB and PEGI. Also `business-legal/minors-data-privacy-coppa-compliance` for a teenage audience.
5. **`visual/lighting-as-mood-storytelling`, `visual/shadows`, `visual/animation-principles-games`, `visual/visual-accessibility`, `visual/ui-visual-design-hud`.** Five reports that own the vision limit, the light model that does not exist, attack animation timing, colourblind verification and the HUD icon set.
6. **`visual-trace/creature-interview-script`, `visual-trace/emblem-badge-decomposition`, `visual-trace/figure-ground-separation`, `visual-trace/accent-selection-accentswatch`, `asset-forge/hud-icon-glyph-recipes`.** Creature identity and re-tone, the tin token as a recurring maker's mark, and the real time HUD glyph set.
7. **`claude-assisted-engine-build/claude-assisted-workflow-setup`, `functional-cursor-recipes`, `godot-headless-failure-markers`.** The three unread in the domain, listed for completeness; only the first looks likely to pay.
8. **`input-controls/device-support-hot-swapping`.** Controller input automated testing is enumerated by no report read in this wave, and this is the closest owner.

Genuinely unowned anywhere in the library, and therefore house synthesis or nothing: whether roguelite structure can sustain dread rather than tension over many runs; top down horror atmosphere; the mourned monster and a win condition that is also a loss; permadeath with roster rotation where the player continues as someone else; voice performance as a fear channel (the horror report names writing, never delivery or casting); and whether an agent's "I fixed it" carries the same trust profile as a human developer's, which all nineteen QA reports assume away.

### What is genuinely NOT about this game

Do not read these out of completionism.

* **`asset-forge/` (89 reports, 4 read).** These document GTS's own internal shape grammar recipes. Art technique is out of scope by ruling, and the icon recipes report states its own scope in its Design-Inputs table: it is built for card and turn based systems, and for a game with no such system "none of the seven icons is ever minted; this report contributes nothing to that project" `[SOURCED per reader]`. Read only the handful that own a real question: `hud-icon-glyph-recipes`, `blender-parametric-rig-recipes`, `sprite-rig-expansion-recipes`, `day-night-weather-cycle-recipes`. That is 4 of 89.
* **`generative-assets/` (6, 0 read).** Same reason, plus the code generated art method is rejected by ruling.
* **`source-code-analysis/` (52, 6 read).** The six read cover the refactor planning need completely. The other 46 are static analysis theory (abstract interpretation, points to alias analysis, CodeQL and Datalog querying, intermediate representations) written for large polyglot codebases. This is 35,000 lines of hand written JS in one language. Read `change-impact-analysis` if the tool rewrite stalls, and nothing else.
* **`communities-premises/` (60, 0 read).** Nothing in this wave or wave 1 has named a question it owns.
* **`multiplayer/` (18, 5 read).** Co-op is direct peer to peer with no server, already ruled at `GROUNDING_AUDIT_1.md:315,574` `[spec]`. The load and scale reports do not apply. `platform-console-certification-requirements` is the exception, for the rating question.
* **The mobile and console halves of every compatibility, input and certification report.** Touch is dropped and no console is named.

---

## OPEN CALLS

Thirty one questions, deduplicated across sixteen readers and five auditors, renumbered, written so they can be answered cold. Each states what is true today, what each option does, and a recommendation.

### Horror and the woods

**1. Should the woods contain one thing that cannot be killed?**
Today every creature dies and the room is then safe afterwards. **A, add it:** one thing per night that follows you between rooms, never dies, and can only be pushed back for a few seconds by Vic's spotlight or Hollis's fire at the cost of battery or fuel. Cleared rooms stop being safe, and the two characters who are worst at killing get the most important job in the game. Costs a pursuit and pathing system, an appearance schedule, and audio. Size L. **B, do not:** the game stays a room clear game, and late run fear rests entirely on the sight cost, which makes you blinder but never more fragile. **Recommendation: A.** It is the one system the library names as the highest value portable fix, and it is the missing half of the growth problem.

**2. Does the world get worse the more nights you survive, or only the deeper you go in one night?**
Every night currently starts from the same baseline, so by night twenty the opening is a place you have memorised. **A, add a lifetime track:** the first act at night fifteen is visibly worse than at night two, with more traces, fewer safe beats, the pursuer arriving sooner. Size M. **B, leave it:** the opening of every run stays comfortable and slowly teaches the player that the first third is not dangerous. **Recommendation: A**, and it is free story, because a world that worsens as you survive is the premise saying the sanctuary is losing.

**3. Should a creature type stop appearing once you have seen it enough times?**
The library says a monster fully learned should be retired or changed rather than shown again unchanged. The premise says the same thing in fiction: a thing witnessed is finished. **A, retire them:** each kind has an encounter count after which it never returns in that save. The player's own progress empties the woods. Costs more kinds than you would otherwise ship. Size L. **B, keep them forever:** cheaper, but the twentieth encounter is not frightening and the fiction quietly stops being true. **Recommendation: A**, phased: retire two kinds first and see whether the loss registers.

**4. May certainty ever hide something that could kill you?**
The sight cost currently takes planning knowledge: reading a room before entering, seeing the route ahead. The question is whether it may ever take a warning, meaning the wind up before a hit, where something is once it is chasing you, or what just hurt you. **A, never:** certainty takes only what you would have used to plan, and deaths always feel earned. **B, sometimes:** scarier for about an hour, then it reads as the game cheating. Every report touching this says withholding is fair only when the player can still survive and recover. **Recommendation: A**, written down before the sight counter is built. Cheap now, very expensive to retrofit.

**5. Is co-op a horror game or a tense game?**
Two people talking to each other is the natural cure for being frightened, and two reports say so in almost the same words. **A, accept it:** co-op is officially the tense mode, tuned and marketed that way. Free. **B, fight for the fear:** force the players apart for stretches, give each separate supplies, tie their fates together. Size L, and it makes co-op less fun for people who came to play together. **Recommendation: A**, keeping one piece of B: separate supplies, because it is cheap and it stops one player carrying the other. This is separate from the seat count problem already flagged in the combat doc.

**6. Should the top down camera get a real vision limit (a lit radius or fog), or should dread come from darkness and colour alone?**
A top down camera shows the player everything nearby, which is the opposite of how horror normally builds dread, and every atmosphere technique the horror report names assumes a first person camera. **A, build the vision limit:** the only way to get concealment back, but it is core loop and engine work, and canon already notes no light model exists. **B, palette and darkness only:** cheap, gets eerie, does not get frightening. **Recommendation: A**, and note this is a core loop call, not an art call.

**7. Should how much the woods show you be a number on screen, or only felt in the rendering?**
**A, no number:** the world itself gets foggier and less detailed and nothing is labelled. Harder to balance, but every dread report read treats a visible fail margin readout as the thing that kills tension. **B, a meter:** easy to plan around, easy to tune, and it turns the game's central idea into a stat. **Recommendation: A.**

**8. Should there be a visible moment where the player chooses to make a piece of gear more reliable, knowing it costs sight later?**
The premise says the player runs this operation unknowingly. **A, keep it fully invisible:** protects the tragic surprise, but risks the mechanic never being noticed at all. **B, occasional visible optional choice:** the overall system stays opaque, but once in a while the player makes a discrete trade at the fire and half sees the shape of it. **Recommendation: B**, because a system nobody notices is not a theme, it is bookkeeping.

**9. Should supply runs into the woods be mostly small fights, or long quiet stretches with rare serious encounters?**
**A, quiet stretches:** navigate, listen, use a tool for a brief window of information, correct course, with confrontation rare and severe. This is the pattern that made a mundane job in a terrifying place work elsewhere. **B, steady fights:** consistent with the rest of the game and easier to tune. **Recommendation: A** for supply runs specifically, keeping combat density concentrated in room clear encounters.

**10. Should the low background dread sound keep playing during fights?**
**A, keep it running under fights, quieter, with no upbeat score:** matches every dread focused game read and fits a tone where winning is also a loss. **B, switch to combat music:** standard for action games, and it undercuts the mood exactly when it matters. **Recommendation: A.**

**11. When a sent survivor dies, does their gear stay out in the woods?**
**A, leave it where they fell,** recoverable once by the next survivor sent, forfeit permanently if that one also falls first. Gives a reason to revisit the place someone died and ties the roster together. **B, it returns to camp automatically:** simpler, and throws the connection away. **Recommendation: A.**

**12. Should each of the five tools share one stamina style resource, or keep its own private one?**
Today each tool has its own resource (wind time, battery, cable count) and there is no shared bar spanning attack and dodge. The soulslike reading treats one shared slow refilling bar as the thing that makes hits feel weighed rather than mashed. **A, keep them separate:** preserves each character's distinct feel, and risks combat reading as press button then wait. **B, add a shared bar:** classic tension, and a sixth rule on top of five already different verbs. **Recommendation: A**, with the departure written down in the combat doc as deliberate, and with no free dodge that ignores the character's own resource.

**13. Should a cleared room stay lit and safe for the rest of that night?**
**A, yes:** the walk home gets progressively faster and safer, which turns surviving a stretch into a visible reward. **B, no:** every step stays tense, which is what survival design usually wants, and the walk back risks reading as punishment. **Recommendation: A** for ground already taken, while pushing deeper stays dangerous no matter what. Note this interacts with call 1: if an unkillable follows you, a lit room is safer but not safe, which is the best version of both.

### Method and how the work is done

**14. Check every unit, or only at the end of a wave?**
Today one nine area check runs when a wave ends. **A, keep that alone:** cheap, but a bad change can hide inside a wave and rolling back throws away everything since. **B, add a fast automatic smoke per unit** (boots, plays one seeded night, checks the save survives) and keep the big check at the wave end. Costs one M build. **Recommendation: B.** This is the only place the library directly contradicts a standing rule, and the fix does not trim the skeptic pass or slow the pace.

**15. Write the "how this codebase works" page before the tool rewrite, or during?**
**A, before:** costs a small unit up front, and every session touching weapons, pickups, HUD, roster and save reads the same conventions. **B, during:** starts faster, risks five sessions inventing five shapes for the same thing. **Recommendation: A**, kept short and scoped to the systems the rewrite touches.

**16. One page of what the game is and refuses to be: build it or leave the refusals scattered?**
They currently live as single lines inside roughly 1.5MB, so no agent can be pointed at them. **Recommendation: build it, the creator owns it, every brief points there.** Size S.

**17. Cap the next design pass?**
The design corpus is now larger than most shipped game bibles and there is no reboot slice to play. **A, no cap:** more prose. **B, cap it:** the next pass must output edits to existing documents plus one buildable thing. **Recommendation: B.**

**18. One file listing what an assistant may never do without you looking first?**
Suggested: rewriting history, deleting folders, installing packages, touching the save format, anything that deploys or spends. **A, per brief as now:** restated every time, eventually forgotten. **B, one file every agent inherits. Recommendation: B.**

**19. Build one finished piece of the game as the reference before broad design continues?**
**A, keep designing broadly:** faster on paper. **B, build one finished thing** (Dez's night, or one room end to end) and make every later request match it. **Recommendation: B.** Hand authored keystone content is the library's named strongest defence against drifting generic, and the drift is invisible piece by piece.

**20. Delete the throwaway test scripts, or promote the repeated ones?**
The gate currently orders every temporary verification file deleted before reporting, so the same sensor is rebuilt from scratch each wave. **Recommendation: delete one offs, promote anything used twice into `tools/`,** where the room validator already proves the pattern.

**21. When a new creature is added, automate both the wiring and the creature, or only the wiring?**
**A, both:** faster, and produces machine templated creatures, which is the flat quality already ruled out. **B, wiring only:** registration, pip wiring and spawn table are templated; identity, tone, behaviour and name stay hand decided. **Recommendation: B**, and build no template at all until the same request has come up three times under the new premise.

**22. Do parallel agents get their own copy of the project, or share one folder with assigned files?**
**A, separate copies for anything that writes:** nothing one agent does can corrupt another's unfinished work, at the cost of setup time and disk. **B, shared folder:** faster to set up, and an agent that strays outside its assigned files damages another's work silently. **Recommendation: A** for writers, shared folder only for read and report agents.

**23. How much should an agent's own claim that it checked something be trusted?**
This session produced three confident statements of absence and all three were wrong. **A, trust the claim:** faster per unit. **B, require the actual search output before the claim counts:** slower, and it is exactly the gap that produced the three errors. **Recommendation: B**, as a fixed rule for completeness claims specifically ("all callers", "safe to delete", "no seed exists"), not a judgment call made fresh each time.

**24. Should the XP system and sprite painters be deleted in one pass, or deprecated and removed in small batches?**
**A, one pass:** fast, and if a save file or some other invisible reference still points at the old code, the break has no obvious suspect among many removed pieces. **B, gradual:** each small step is easy to watch and undo. **Recommendation: B**, treated as close to a hard rule here rather than a style choice, because serialization touched code is in the never auto delete tier.

### QA and shipping

**25. The developer cheat overlay is in the public web build and the installer right now. Remove it from shipped builds, or leave it?**
Removing costs one deploy step change and the ability to demo cheats to yourself on the live site. Leaving it means anyone who finds the key on the public site gets spawn, warp and live tuning controls. **Recommendation: remove from anything public, keep it in local runs.** Size S.

**26. The commit gate says typecheck and the repo has no typechecker. Rewrite the gate, or add one?**
**A, rewrite now** to what actually runs (room validator, pack, smoke), which makes the gate honest immediately. **B, add a real static checker**, which catches a class of bug the current gate cannot, at the cost of a medium unit. **Recommendation: A now, B later.**

**27. The recorded room bug counts do not match what the validator prints today. Re-record, or investigate why they differ?**
Re-recording is fast and gives a trustworthy comparison point. Investigating tells you whether a validator change silently moved the goalposts, which is worth knowing before those numbers become a release gate. **Recommendation: do both in one pass.** Size S.

**28. Should the flash and motion toggle be a written release blocker, not just a settings feature?**
Blocking means a build with a broken toggle does not go out even if everything else is ready. Not blocking means it is treated as polish and can regress unnoticed. The library calls a broken toggle here a real harm regression, specifically for horror. **Recommendation: blocking.** Size S.

**29. Write one paragraph of what winning looks like for each of the five, before any balance testing?**
With it, you can tell "different by design" from "broken". Without it, every balance finding is arguable and nothing can be settled. **Recommendation: write them.** Size M, design work.

**30. Build the overnight unattended soak run, or test by hand?**
Automation costs a medium unit and only works after the seeded fixed step foundation lands, and nobody can sit and watch eight hours of runs for a slow leak. **Recommendation: build it, sequenced after determinism.**

**31. Should captions be required infrastructure from the start, before full voice acting exists?**
**A, require a caption entry at the moment any line is authored:** a small ongoing discipline cost per line. **B, add captions later as a pass once the voice work is recorded:** the two reports that touch this both name audio added without a caption registration step as the most common real world failure, discovered after recording, when it is expensive. **Recommendation: A**, before the voice line count grows.

### Commercial

**32. What happens to the free web version once a paid version exists?**
**A, take it down:** goodwill lost, paid promise clean. **B, trim it to a clearly labelled shorter demo and keep that up:** the web build becomes a wishlist funnel and the paid promise stays honest. **C, leave the full free version live:** nobody has a reason to buy. **Recommendation: B.**

**33. Cap the death walk debt, or leave it unbounded?**
Unbounded, the player already struggling most gets a hole that deepens every time. Capped (proposed: 3 banked nights, 5 night walk ceiling), every death still costs and the dread still lands, but there is a floor. **Recommendation: cap.**

**34. Is one future paid expansion left open, or is the game closed forever after purchase?**
**A, closed forever:** simplest, no future revenue path. **B, left open under written rules** (the ending is never sold, no live store, no currency bridge to real money): the same simplicity today, and nobody relitigates it later under revenue pressure. **Recommendation: B, rules written now.**

**35. Does the price get built by research or picked by instinct?**
Research means assembling 8 to 15 real comparable current roguelites and triangulating a cost floor, a value range and a competitive range, size M. Instinct is free and usually lands wrong in one direction. **Recommendation: research, and write down why the number sits where it does.**

**36. Does the store page go up now or near launch?**
Now means months of wishlist accumulation, which is the mechanism the library names as decisive on PC. Near launch is the named number one avoidable commercial failure. **Recommendation: now.**

**37. Should regional purchasing power pricing be turned on?**
The storefront provides this natively, and the library treats it as a genuine fairness mechanism when used to widen honest access. **Recommendation: yes, with a periodic review rather than set and forget.**

**38. Should THE SIT's price get a review meeting, or a standing rule?**
A meeting produces a written answer to a question that is not currently live (no real money touches scrip). A standing rule ("no purchase valve on healing, ever, and scrip is never purchasable") closes it permanently at lower cost. **Recommendation: the rule, skip the meeting.**

### Art

**39. Replace the art style guide outright, or keep it as a record of the old build?**
It says everything is drawn in code with no image assets and describes the look as storybook cartoon with cute eyes. Both are ruled out, and it is still being cited as authority by the premise document. Replacing means one new document and a pass over every doc that cites it. Keeping it means the only file named "art style guide" keeps contradicting the rulings. **Recommendation: supersede it, and keep the old file only if it is clearly marked historical.**

**40. Rebuild the palette, or keep the hot anchors?**
The current anchors were deliberately made hotter and more saturated in July. The library's horror direction is the opposite: dark, drained, one reserved warning colour. Rebuilding is a repaint of every body. Keeping them means the ruled tone lives only in subject matter and not in colour, and the tin token's red cannot read as threat because fire and glow already own red. **Recommendation: rebuild, and reserve red for the token and blood alone.**

**41. Retract the silhouette failure number, or keep it?**
The claim that creature silhouettes fail (0.430 against a 0.60 bar) borrows a number from a check that measures whether a traced copy matches its original, where high is good. For telling creatures apart, low is good. Keeping it anchors every downstream plan to a metric read backwards. Retracting costs a fresh measurement pass on a black silhouette sheet. **Recommendation: retract, run the sheet, set the project's own maximum overlap bar from what the sheet shows.**

**42. Lock creature on screen size at 32 px now, or reopen it?**
Two documents already imply it (30 px in the style guide, 32 px in the premise). Locking at 32 lands inside the library's band that permits three to four identifying features with a two pixel minimum, so ears, antlers and tails can exist. Dropping toward 16 px would force most species into merged shapes. **Recommendation: lock 32 px now, because nothing else in the bestiary can be specified until it is.**

**43. Proceed with boss telegraph timing now, or keep the hold?**
One reader recommended holding because the game supposedly has no dodge invulnerability. It has two windows already: 0.7 seconds after every hit, and per character dodges of 0.24 to 0.34 seconds. **Recommendation: proceed.** The hold was based on a report describing a different codebase.

**44. Does Mikey need a second, non colour way to be told apart?**
Her pink hair is currently described in canon as a silhouette free identity signal that survives small sizes. The rule the library states is at least two channels, one of them not hue. **A, colour only:** should read fine against a desaturated woods palette. **B, add one shape tell:** insurance for colour vision differences and for low visibility moments under Vic's beam or Hollis's smoke. **Recommendation: B**, small now, expensive once her art is locked.

**45. Redesign the bestiary creature by creature, or as one batch pass with all silhouettes side by side?**
The measured collision almost certainly happened because creatures were approved one at a time. **Recommendation: the batch pass, on a sheet of solid black shapes at one scale, before any single body gets finished detail.**

---

**COVERAGE LINE.** Assigned: synthesise five surface audits and sixteen reader harvests into one ruling document. Read: all five audits and all sixteen harvests in full. Opened read only for verification during synthesis: `research/genres/horror/report.md` (lines 99-102, 248-250, 353-357, 505-514, 613, 631, 658, 989-991), `research/genres/survival-horror/report.md` (335, 390, 642, 645, 725-730, 883-887, 904, 963-967), `research/genres/stealth/report.md` (510), `research/claude-assisted-engine-build/avoiding-ai-slop-craft-taste-distinctiveness/report.md` (622-626), `research/claude-assisted-engine-build/guardrails-ai-driven-game-development/report.md` (630-634), `research/claude-assisted-engine-build/ai-legible-codebase/report.md` (313-323), `research/visual-trace/scoring-strictness-per-mode/report.md` (230-234), `research/visual/color-theory-palettes/report.md` (64-68), plus directory listings of all 23 domains for the coverage table. Repo files opened read only: `docs/preproduction/DESIGN_SOURCES.md` (18-31), `docs/preproduction/COMBAT_ARCHITECTURE.md` (28-34, 60-66, 1120-1125), `docs/preproduction/PREMISE_2.md` (1873-1878), `docs/preproduction/GROUNDING_AUDIT_1.md` (340-380), `ART_STYLE.md` (1-12, 38-44), `.claude/agents/release-gate.md` (8-14, 94-99), `package.json` (1-20), `index.html` (664-668), plus existence checks on `CLAUDE.md`, `.claude/CLAUDE.md`, `tsconfig.json`, `jsconfig.json`, eslint config and `.github` (all absent), a count of `Math.random` in `js/` (57) and a count of files under `assets/` (223). Could not open: none. No git command was run. No file in `D:\Programs\merit-badge-massacre` or `D:\Programs\GameTev` was modified.
