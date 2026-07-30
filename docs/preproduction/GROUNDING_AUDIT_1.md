# GROUNDING AUDIT, WAVE 1

Date 2026-07-29. What the research library says about the rulings in PREMISE_2.md and COMBAT_ARCHITECTURE.md, and what has to change. Wave 1 of a multi-wave pass: this wave read the reports governing controls, HUD, onboarding, accessibility, the roguelite core, the offering system, co-op and pre-production QA. Domains not yet read are listed at the end.

Verification note. I am the synthesist, not a primary reader. I independently opened and read the passages behind 30 of the citations below, across 26 reports and both canon documents, before writing. Every one resolved: the quoted wording is verbatim and the line numbers are correct. Where a reader mislabelled a section, the correction is stated inline. Where a reader's own numbers do not add up, that is stated in COVERAGE.

---

## THE HEADLINE

Twelve things are now in question. Read in this order.

**1. Determinism is the foundation and it is currently being dropped.** `COOP_DESIGN.md:1296` `[spec]` drops the fixed timestep and seeded RNG from minimum viable co-op, and COMBAT_ARCHITECTURE.md rules nothing about seeding at all. The library contradicts this on four independent axes at once: `multiplayer/deterministic-simulation/report.md:74` (SOURCED, verified) says seed based determinism "is far cheaper than full physics/lockstep determinism and is usually worth it regardless of multiplayer status." It is the single thing that makes reconnection, automated seed testing, replay and any future co-op cheap instead of impossible. This is a rewrite anyway. Adopt it inside the reboot. Size M now, L later.

**2. Health and armour are told apart by exactly one channel, and the library says that is not enough.** `COMBAT_ARCHITECTURE.md:440-444` `[spec]` renders padding as pips of a different SHAPE and flags shape as "the one channel nobody checked." `ux-accessibility/color-contrast-accessibility/report.md:242` (SOURCED, verified) names this exact case: for resource type the weak pattern is "colored pip/bar" and the strong pattern is "icon + shape of the meter + label/number + fixed slot," with the acceptance question "can two resources be told apart when both are low?" At 5 to 8 pips with hits of 1, 2 or 3, misreading this is a lost run. The ruling survives; the rendering rule must become three channels. Size S.

**3. The tool grows without a ceiling and nothing scales to meet it.** The tool ends a run at 5.45x throughput (`COMBAT_ARCHITECTURE.md:166-167` `[spec]`, verified) against a fixed authored damage table that scales only with act depth (`:416-422` `[spec]`, verified). `genres/roguelike-roguelite/report.md:581` (SOURCED, verified) names this as failure 6 and gives the fix as "within-run scaling that tracks player power (sec 3f); rubber-band difficulty," and `:524` gives the worked default for this exact profile: "a 5-20 step ascension ladder, each step one tuned modifier." The one mechanism that makes "no ceiling" survivable is the one thing the document defers (`:700-703` `[spec]`, verified as "designed but NOT priced and NOT shipped in this pass"). Size M.

**4. Refusing an offer pays nothing for roughly 22 of the run's 26 picks.** WALK ON "buys nothing except that the ledger count did not move" (`COMBAT_ARCHITECTURE.md:641-646` `[spec]`, verified), and a lower count only buys a sight band at two boundaries, 7 and 15 (`:727` `[spec]`, verified). `genres/deckbuilder/report.md:348-351` (SOURCED, verified) sets the target: skip must be correct "roughly a quarter to a third of offers, illustrative," which against 25.5 picks is 7 to 9 live declines. The design delivers at most 4. The shortfall is structural, not tuning. Size S for the fix (declining pays scrip), M for the fuller package.

**5. The healing drink is on the shared pick-up button, and the library calls this the one non-negotiable case.** `COMBAT_ARCHITECTURE.md:536-547` `[spec]` puts the thermos on interact, names the cost honestly, and invites overrule. `input-controls/context-sensitive-contextual-controls/report.md:963` (SOURCED, verified): "high time pressure AND high resolution uncertainty = mandatory dedicated input. The other three cells are negotiable; that one is not." Overrule it. The layout below has three spare inputs. Size S.

**6. There is no way to take less damage, and at this HP scale that is the highest value thing missing.** `ux-accessibility/difficulty-assist-systems-accessibility/report.md:275` (SOURCED, verified): "The separation of incoming from outgoing damage is the highest-value single split in combat accessibility." At 5 pips with 3 damage act 3 contact and death on the second touch 0.7 seconds later (`COMBAT_ARCHITECTURE.md:396-400, 428-431` `[spec]`, verified), this game has the sharpest possible need and offers nothing. Size M.

**7. The no-assist ruling was made for a reason that does not exist here.** `COMBAT_ARCHITECTURE.md:38` `[spec]` (verified) rules Mikey's shot has "no assist." `input-controls/aiming-aim-assist/report.md:107` (SOURCED, verified) says for single player: "assist can be tuned purely for feel and accessibility rather than opponent-fairness, no cross-player parity constraint exists." There is no PvP to be unfair to. Keep the visible rule (the reticle never moves for the player); add landing forgiveness on Mikey's projectile and friction on Vic's beam. Vic is the stronger case: his verb is FIX, and a held beam on a strafing target is the report's second worst stick deficit. Size S each.

**8. Death punishment escalates forever and lands hardest on the player who is struggling.** `owed = 2 + META.falls[id] + debt`, capped at 6 per walk, residual banked, "Never resets" (`COMBAT_ARCHITECTURE.md:784-795` `[spec]`, verified). `game-design/game-meta-features-systems/report.md:526` (SOURCED, verified) says the between run layer exists to make "failure feel like progress rather than a total loss." Worse: under one tool per character, the thing that transfers across runs is per character mastery, so benching the survivor the player is learning deletes the skill model the genre runs on. Flatten to 2. Move the escalation onto an opt-in harder rung. Size S.

**9. Two characters are built out of the exact composition the photosensitivity report warns about, and nobody flagged it.** `ux-accessibility/photosensitivity-motion/report.md:177` (SOURCED, verified): repeated high contrast patterns are provocative "even without temporal flashing" and "more provocative when the pattern moves, drifts, reverses, or is scrolled." Hollis's attack input IS his movement input, so his burning trail scrolls with the camera by construction. Vic's beam is a hold and release luminance alternation. `:250` (verified): "Centralizing the flash primitive is the highest-leverage engineering move." Build the primitive before the tools are authored, in the same wave as input. Size M.

**10. Save migration names the bugs and names no test.** `COMBAT_ARCHITECTURE.md:1060-1066` `[spec]` (verified) lists the defaulted character, the two dead ids forced into `unlocked`, and the 400 tin banked in `secondwind` with no refund path. `qa-testing/save-load-persistence-state-testing/report.md` sec 15.3 and sec 4.5 (SOURCED per reader, verified by the co-op auditor) require a version matrix with a named owner, retained real fixture saves per shipped version, full chain testing, and a published compatibility bound, because "a silent, undocumented decision to drop support for very old saves is a trust breach." Size M.

**11. A horror cold open cannot be the first thing a player sees.** `PREMISE_2.md:526` `[spec]` (verified) makes Dez's night the cold open and "the first voice in the game." `ux-accessibility/accessibility-communication/report.md` sec 2.1 (SOURCED per reader) requires a static, high contrast, controller navigable safety and access screen "before any logo flash or cinematic." A drip torch and a spotlight are exactly the hazard that rule exists for. Size S.

**12. Full voice acting obliges closed captions, which is an architecture decision now, not a text decision later.** `ux-accessibility/subtitles-captions/report.md:112` (SOURCED, verified): subtitles and captions "are two different accessibility features that happen to share a text-rendering pipeline, not one feature with two names." `:150-152` (verified) gives the honest tier for this scope: "closed captions for critical sounds, every line plus a finite, enumerated set of survival/objective sounds." Pick that tier out loud and build the semantic event schema before the line count grows. Size L.

**And one thing to STOP.** Three proposals reached this wave that must not be built. A cap on active item slots (it would freeze the ledger count, which is simultaneously the sight band input and the flagship's scale term, `COMBAT_ARCHITECTURE.md:747-751` `[spec]`). Item ordering (Balatro's ordering exists because its scoring is a literal left to right pipeline; this game has none). Deck thinning modelling (dilution is a draw-odds phenomenon, `genres/deckbuilder/report.md` sec 3c lines 447-449; this game has no deck, no hand, no draw, so it cannot occur). Also: no spectator system, per `multiplayer/spectator-replay-systems/report.md:75`, which says at this scope do not build it speculatively.

---

## COVERAGE, HONESTLY

Counts taken from the filesystem (`find . -name report.md` under `D:\Programs\GameTev\research` returns 727) and from the readers' own coverage lines.

| Domain | Reports | Read this wave | Left |
|---|---|---|---|
| input-controls | 23 | 23 | 0 |
| ux-accessibility | 36 | 32 full or substantial, 1 headings only | 3 |
| genres | 71 | 14 | 57 |
| game-systems | 49 | 11 | 38 |
| game-dev-teaching | 11 | 11 | 0 |
| qa-testing | 35 | 6 | 29 |
| multiplayer | 18 | 5 | 13 |
| game-design | 5 | 1 | 4 |
| asset-forge | 89 | 0 | 89 |
| visual-trace | 78 | 0 | 78 |
| communities-premises | 60 | 0 | 60 |
| source-code-analysis | 52 | 0 | 52 |
| visual | 47 | 0 | 47 |
| narrative | 39 | 0 | 39 |
| audio | 31 | 0 | 31 |
| monetization | 27 | 0 | 27 |
| claude-assisted-engine-build | 27 | 0 | 27 |
| engine-tech | 8 | 0 | 8 |
| living-world-dialogue | 6 | 0 | 6 |
| generative-assets | 6 | 0 | 6 |
| business-legal | 5 | 0 | 5 |
| process | 4 | 0 | 4 |
| **TOTAL** | **727** | **103** | **624** |

103 of 727 is **14 percent** of the library. The two prior design passes read about 25, roughly 3 percent. So this wave is about four times the grounding, not a complete grounding, and the document you are reading is a correction to two documents, not a finished bible.

Where the readers' numbers do not add up, stated plainly:

* The controls verdict says in one place that it was "written against 23 harvested report readings across four readers" and in another that "none of the seventeen reports address" a topic. The 23 figure is right: the four controls readers between them named all 23 reports in `input-controls/`, and the directory holds exactly 23. The "seventeen" is a slip. Coverage of input-controls this wave is complete.
* The genre-adjacent reader claims "5 reports assigned, 5 read in full" but names and cites only three (`genres/deckbuilder`, `genres/auto-battlers`, `genres/tower-defense`). Two readings are unaccounted for. I have counted 5 in the table because the reader asserts it, and I am flagging it here rather than silently trusting or silently docking it. Anything in that harvest resting on the two unnamed reports should be treated as unverified.
* The HUD verdict labels two of its own claims as unverified by the verdict agent (`ui-scaling-visual-customization`, `feedback-game-feel-ux`). Those two are carried below with the same label.
* `ux-accessibility/pause-action-scope-addendum/report.md` was opened at headings only by one auditor and read by nobody. It owns the pause contract and is listed in WHAT IS STILL UNGROUNDED.
* Three ux-accessibility reports are genuinely unread: `input-remapping-alternative-inputs`, `creation-flow-census`, `dcc-viewport-conventions-census`. The last two are GameTev forge reports and are not about this game. The real ux gap is one report, `input-remapping-alternative-inputs`.

---

## WHAT MUST CHANGE

Consolidated from all five audits, deduplicated, ranked by severity then by how much later work depends on it. Every entry: the ruling, what the library says, the citation, severity, size.

### 1. Adopt a fixed timestep and a seeded run RNG, inside the reboot. HIGHEST. Size M.
Ruling in question: `COOP_DESIGN.md:1296` `[spec]` drops both from minimum viable co-op; COMBAT_ARCHITECTURE.md rules nothing about seeding. Library: seed based determinism is "far cheaper than full physics/lockstep determinism and is usually worth it regardless of multiplayer status" (`multiplayer/deterministic-simulation/report.md:74`, SOURCED, verified). The roguelite co-op reconnection row wants "deterministic or snapshot-cheap state" (`multiplayer/disconnection-reconnection-host-migration/report.md:70`, SOURCED, verified). Seeded bots plus run generation invariant checks are "one of the single highest-ROI bot-testing applications in the whole domain" (`qa-testing/automated-playtesting-test-bots/report.md:79`, SOURCED per reader). With seeding, input resim replay is near free (`multiplayer/spectator-replay-systems/report.md:68`, SOURCED per reader). Against that, `COOP_DESIGN.md:955-961` `[spec]` documents a live simulation with variable dt, roughly 85 `rand`/`pick` calls and seventeen raw `Math.random` calls. Retrofitting is the costliest version of this work.

### 2. Health and padding need three channels, not one. SHIP BLOCKER. Size S.
Ruling in question: `COMBAT_ARCHITECTURE.md:440-444` `[spec]`, padding renders as pips of a different SHAPE. Library: "Never encode critical information in a single channel" (`ux-accessibility/hud-interface-ux/report.md:258`, SOURCED, verified) and the resource-type row's strong pattern is "icon + shape of the meter + label/number + fixed slot" with the test "can two resources be told apart when both are low?" (`ux-accessibility/color-contrast-accessibility/report.md:242`, SOURCED, verified). The integer ruling is untouched. The render rule becomes: distinct shape, plus a fixed slot the other type never enters, plus a distinct break signal. Grayscale test at final icon size before art lock; flash test both states under a sub-second exposure (`hud-interface-ux/report.md:264`, verified, "literally test each HUD state with a sub-second flash").

### 3. Ship a night ladder. HIGH. Size M.
Ruling in question: uncapped tool growth (5.45x at run end, `COMBAT_ARCHITECTURE.md:166-167` `[spec]`) against depth-only enemy scaling (`:416-422` `[spec]`), with the harder night deferred (`:700-703` `[spec]`). Library: the ladder is the named fix for three separate failure modes, 4, 6 and 10 (`genres/roguelike-roguelite/report.md:579, 581, 585`, SOURCED, verified), and the worked default for this profile is "a 5-20 step ascension ladder, each step one tuned modifier" (`:524`, verified). Eight rungs, each a change to a constant that already exists. Detail in THE FIVE SURFACES.

### 4. Refusal must pay continuously. HIGH. Size S for the payout, M for the exit signs.
Ruling in question: WALK ON "buys nothing except that the ledger count did not move" (`COMBAT_ARCHITECTURE.md:641-646` `[spec]`, verified), with sight bands at 0 to 7, 8 to 15, 16 and up (`:727` `[spec]`, verified). Library: skip must be correct "roughly a quarter to a third of offers, illustrative" (`genres/deckbuilder/report.md:348-351`, SOURCED, verified). Note the failure row that actually applies is Trivial drafting at `:692`, not No thinning at `:694`: the thinning row's root cause is draw dilution, which needs a deck. Declining should pay scrip, shaped on the one interest anchor the library carries (`game-systems/deckbuilder-card-systems-floor/report.md:277`, community grade, advisory only).

### 5. The thermos gets its own input. HIGH. Size S.
Ruling in question: `COMBAT_ARCHITECTURE.md:536-547` `[spec]`, thermos on the shared interact verb, mitigated by giving it priority at 2 pips or below. Library: "high time pressure AND high resolution uncertainty = mandatory dedicated input. The other three cells are negotiable; that one is not" (`input-controls/context-sensitive-contextual-controls/report.md:963`, SOURCED, verified). The document's mitigation is a resolution-priority tweak, which is a fix for the negotiable cells, and it fires exactly when a mis-resolve is most expensive. The document invites overrule at `:546-547` `[spec]`.

### 6. Ship an incoming damage dial. HIGH. Size M.
Ruling in question: no assist options of any kind exist. Library: "The separation of incoming from outgoing damage is the highest-value single split in combat accessibility... Lowering incoming damage helps a player who can execute but cannot survive mistakes" (`ux-accessibility/difficulty-assist-systems-accessibility/report.md:275`, SOURCED, verified). Same passage: in any no-damage or invulnerability mode, "keep the hit, threat, and hazard feedback intact." Frame the control as "Enemy Damage," not "Easy." Does not touch enemy behaviour, so the room clear economy is untouched. Note this is separate from run risk: the same report at sec 10.1 keeps run risk at the authored default, which CONFIRMS death ends the night.

### 7. Add bounded assist for Vic and Mikey, stated per device. HIGH. Size S each.
Ruling in question: `COMBAT_ARCHITECTURE.md:38` `[spec]`, "a charged single shot with travel time and no assist." Library: the single player row says assist here is a feel and accessibility choice with "no cross-player parity constraint" (`input-controls/aiming-aim-assist/report.md:107`, SOURCED, verified). Projectile weapons "often lean more on output-space bullet magnetism... than input-space rotational magnetism" (sec 2.2, SOURCED per reader), which preserves AIM as the verb because the skill under test is the lead. Vic is the stronger case: a held beam on a strafing target is the report's second worst stick deficit, remedied by reticle friction plus capped rotational magnetism (sec 3.1, sec 3.2). sec 5.5 requires the team be able to state assist tier per device or it will "have an emergent, undocumented one." Write one line: mouse none, pad friction on Vic and landing forgiveness on Mikey, nothing else.

### 8. Flatten the walk back to two nights. HIGH. Size S.
Ruling in question: `COMBAT_ARCHITECTURE.md:784-795` `[spec]`, escalating and never resetting. Library: the between run layer exists so failure "feel[s] like progress rather than a total loss" (`game-design/game-meta-features-systems/report.md:526`, SOURCED, verified), and for a struggling player the posture is "so weak players still progress between runs; add assists" (`genres/roguelike-roguelite/report.md:110`, SOURCED, verified). Under one tool per character, systemic mastery is per character, so benching the survivor being learned removes the transfer the genre's skill model depends on (`:509-513`). Change `owed` to a flat 2, delete `META.debt`, keep `META.falls` as a lifetime tally the Reading can speak. This also deletes the zero-sendable branch and a whole worked case.

### 9. Centralize the flash and pattern primitive before tool authoring. HIGH. Size M.
Ruling in question: Hollis's fused move-and-attack and Vic's held beam, neither flagged as a photosensitivity surface anywhere in either canon document. Library: repeated high contrast patterns are provocative "even without temporal flashing" and worse when scrolled (`ux-accessibility/photosensitivity-motion/report.md:177`, SOURCED, verified); "Centralizing the flash primitive is the highest-leverage engineering move... flashes can only come from these N controlled places" (`:250`, verified). Analyse the worst legal composite (overlapping trail segments plus camera pan plus any low-health overlay), not the single asset. Prefer a ramp on and off for the beam over an instant toggle. Lands in the same wave as input, for the same reason the document already gives at `:1050` `[spec]`.

### 10. Build the save migration test artifact and publish the bound. HIGH. Size M.
Ruling in question: `COMBAT_ARCHITECTURE.md:1060-1066` `[spec]` names the bugs, names no test. Library: a version matrix with a named owner, real retained fixture saves from every shipped version, and full chain (not per step) testing (`qa-testing/save-load-persistence-state-testing/report.md` sec 4.3, sec 15.3, SOURCED per readers, sec 15.3 verified by the co-op auditor); a published bound because "a silent, undocumented decision to drop support for very old saves is a trust breach" (sec 4.5). Named patterns that map onto the three bugs: "Wrong default applied" for the defaulted character (force a re-pick screen, never a silent default), "Enum/ID remapping breaks" for the dead ids (strip them, do not let them dangle), and a direct write to `badges` for the banked Second Wind refund since `buy()` only ever increments.

### 11. Put a safety and access gate before the cold open. HIGH. Size S.
Ruling in question: `PREMISE_2.md:526` `[spec]`, Dez's night is the cold open and the first voice in the game. Library: "The boot sequence must not rely on the feature it is asking the player to enable... Avoid unskippable flashing, forced camera motion, tiny legal/setup text, timed prompts that expire" and the pattern is a static, high contrast, controller navigable screen "before any logo flash or cinematic" (`ux-accessibility/accessibility-communication/report.md` sec 2.1 lines 129-131, SOURCED per reader). Content of the gate: language, text size, captions, flash and motion reduction, incoming damage dial.

### 12. Commit to closed captions, and build the semantic event schema now. HIGH FOR ARCHITECTURE. Size L.
Ruling in question: full human voice acting is the target; nothing says which caption tier. Library: subtitles and captions are "two different accessibility features that happen to share a text-rendering pipeline, not one feature with two names" (`ux-accessibility/subtitles-captions/report.md:112`, SOURCED, verified), and the honest tier for this scope is "closed captions for critical sounds, every line plus a finite, enumerated set of survival/objective sounds" (`:150-152`, verified). Same file: overclaiming a tier is the harm; picking a lower tier and saying so is defensible. Separately, captions cannot carry direction, so a directional or urgency indicator is its own small system (`ux-accessibility/visualizing-audio-cues/report.md` sec 1.2, SOURCED per reader).

### 13. Build co-op reconnection. HIGH. Size S.
Ruling in question: `COOP_DESIGN.md:986-992` `[spec]` ships no host migration and ends the run on host quit; nothing designs a guest reconnect. Library: "reconnection into an in-progress run must be cheap and frequent-case, not an edge case" (`multiplayer/disconnection-reconnection-host-migration/report.md:70`, SOURCED, verified) and at indie scope "build a real grace-window + reconnect-token system" (`:80`, verified). Cheap here because the room boundary save tuple is already the resync payload (`COOP_DESIGN.md:993-999` `[spec]`).

### 14. Tell the permadeath and roster rule in words, before the first death. MEDIUM HIGH. Size S.
Ruling in question: nothing in either document plans this, and the death rotation is a pillar. Library: "Is it safety-critical or irreversible (permadeath rule, save-overwrite, unwinnable-flee encounter)? Concise-tell (T), early, in a low-value context... Letting the player discover it by failing costs trust" (`ux-accessibility/onboarding-tutorial-design/report.md:733`, SOURCED, verified). The character-swap literacy itself belongs elsewhere: "Post-death is the highest-value teaching surface" (`:564`, verified).

### 15. Move the thermos marks out of the health pip row. MEDIUM HIGH. Size S.
Ruling in question: `COMBAT_ARCHITECTURE.md:537-539` `[spec]`, the charge count renders "INSIDE the health pip row, which is an existing fixture and not a new position." That dodges a position cost by putting three mark families into one chunk at 5 to 8 pip scale. Fails the "two resources told apart when both are low" test (`color-contrast-accessibility/report.md:242`, verified) and fails the fixed-slot half of the strong pattern. `hud-interface-ux` sec 3.1 wants vitals chunked, which is not the same as merged. Own slot, same cluster.

### 16. Strike the two board entries that sell strength. MODERATE. Size S, one line.
Ruling in question: `COMBAT_ARCHITECTURE.md:695` `[spec]` (verified) sells "the night's first room entered with the tool already at conviction 3" and "10 scrip in the pocket" among the starting kit variants. Library: "the compelling version unlocks options, not strength" (`game-design/game-meta-features-systems/report.md:527`, SOURCED, verified) and the failure-3 fix column reads "favor content-unlock over power; cap power meta" (`genres/roguelike-roguelite/report.md:578`, verified). A head start on an uncapped curve is the uncapped curve, earlier. The document's own defence caps power rather than removing it, which is the paired posture that requires the ladder. Fix item 3 or fix this; do not leave both open. Replacements: a pre-chosen first escalation branch, the sit available in act 1, a choice of two act 1 entrances, the thermos at 4 pulls. Total stays 16 entries at 6,400 tin.

### 17. Add one pity guarantee. MODERATE. Size S.
Ruling in question: pick COUNT is deterministic (25.5 expected, `COMBAT_ARCHITECTURE.md:629` `[spec]`, verified) but pick CONTENT is pool RNG plus branch shapes, and WALK ON lets a player self-inflict a dead run. No pity rule exists anywhere. Library: failure 7 is "a bad early offering dooms the run; no comeback," fixed by "pity timers; a guaranteed mid-run power pick" (`genres/roguelike-roguelite/report.md:582`, SOURCED, verified). One branch: if no keystone-tier item has been taken by room 13, room 13's offer guarantees one.

### 18. Price elite clears differently. MEDIUM. Size M.
Ruling in question: the income model pays 1 pick per arming clear, 3 per boss, 1 per loot cache (`COMBAT_ARCHITECTURE.md:629` `[spec]`), pricing elites identically to chaff rooms. Library: "elite (harder combat, always rewards a relic)" (`game-systems/slay-the-spire-experience-ledger/report.md:159`, SOURCED, verified). With integer pips and integer hits, an optional harder room is the most legible risk price this game can charge.

### 19. Ship hold-to-toggle on every sustained hold, day one. MEDIUM. Size S.
Ruling in question: four of five tools are sustained holds with no alternative. Library: hold-to-toggle is "the single most reusable fix in this whole family... It costs almost nothing to implement" (`input-controls/specialized-adaptive-controllers/report.md:716`, SOURCED, verified), and the toggle candidate list literally includes "light" (`ux-accessibility/reducing-physical-demand/report.md:138`, SOURCED, verified). The roguelite-specific rule adds "motor-mode persistence across every weapon, form, boss, and meta menu, because a per-form reset forces reconfiguration mid-momentum" (`:558`, verified), which maps directly onto survivor swap. Implement as a mapping-layer flag, never a gameplay branch.

### 20. Give family collection three steps, not one. LOW MEDIUM. Size S.
Ruling in question: six family keystones, each gated on holding three DIFFERENT items of that family (`PREMISE_2.md:1329` `[spec]`, verified), against a per family cap of six (`COMBAT_ARCHITECTURE.md:337-341` `[spec]`, verified). Library: "assign each unit a trait pair, set 2/4/6 step-function breakpoints, ensure overlap" (`genres/auto-battlers/report.md:452`, SOURCED, verified), because "bonuses are step functions, not linear, which is what makes them spikes" (`:411`). One step at 3 wastes the headroom the pool already allows. With 25.5 picks and a cap of 6, a player reaches 4 in two families or 6 in one, never both, which is the commit versus pivot puzzle.

### 21. Name the disconnection before the fiction. MEDIUM. Size S.
Ruling in question: `COOP_DESIGN.md:990-992` `[spec]`, "The results screen says a scout walked home, not a network error." Library requires the opposite ordering: an explicit "the host disconnected and a new host could not be established" state "rather than a frozen screen with no explanation" (`multiplayer/disconnection-reconnection-host-migration/report.md` sec 5.4, SOURCED per reader). Fiction on top of a stated cause is fine; fiction instead of the cause is the trust failure. Interface text, not a spoken beat, so it costs no voice line.

### 22. Re-derive the co-op economy layer, or stop costing co-op. HIGH FOR PLANNING. Size M.
Ruling in question: `COOP_DESIGN.md:532` (one shared XP bar), `:558` (one purse), `:688-707` (downed and revived) and the MVP keep-list at `:1288-1294` `[spec]` all survive into "minimum viable." The reboot deletes the XP bar and rules that death ends the night. Library: no multiplayer report addresses reward attribution; the five read are transport and session reports. Stated as a gap, not derived.

### 23. Rewrite the combat document's co-op alarm; it is factually wrong. MEDIUM. Size S.
Ruling in question: `COMBAT_ARCHITECTURE.md:1073-1077` `[spec]` (verified) says co-op "makes duplicate scouts mandatory because three cannot fill four seats," citing `js/roster.js:8-20`. Four seats was ruled out: "Ship two... Four is ruled out, not deferred" (`COOP_DESIGN.md:361-369` `[spec]`, verified). The roster it cites is the dead three-name one. With five names and two seats, duplicates are only possible by free lobby choice. Correct residual problem is one line: forbid duplicate picks in the lobby.

### 24. Write the pause contract. MEDIUM. Size S.
Ruling in question: no pause contract exists anywhere. Library: "Document, explicitly, which clocks stop," and a pause that leaves required VO or a timer running "is a false pause" (`ux-accessibility/cognitive-accessibility/report.md` sec 7.1, SOURCED per the HUD auditor). Vic's battery drain and Hollis's burning ground are both clocks that will be wrong on the first pause implementation if nobody writes the table.

### 25. Write down that Hollis is an exemption, not a template. MEDIUM. Size S.
Ruling in question: Hollis's attack input and movement input are the same input. Library, the top-down row: "keep these as two separate action bindings even when input-scarce, since overloading one axis for both movement and aim is a common and costly design mistake" (`input-controls/control-scheme-design/report.md:108`, SOURCED, verified). Hollis survives it because the trail is not aimed, so no targeting degree of freedom is lost. The next tool authored on his pattern will lose an aim axis and the warning will apply in full. Independently, three other reports classify his shape as a relief pattern, not a hazard (`ux-accessibility/reducing-physical-demand/report.md` sec 3.2, "Single-button macro / combined action"; `input-controls/combat-action-input/report.md` sec 3.2 context/state multipliers). So this is a footnote to write, not a design to change.

### 26. Give every HUD element a semantic id and a priority tag before the art pass. LOW, CHEAP NOW. Size S.
Library: `ux-accessibility/ui-scaling-visual-customization/report.md` sec 2.1 to sec 2.2 per the HUD harvest. LABELLED UNVERIFIED: neither the HUD verdict agent nor I opened this report. Treat as a cheap hedge, not a proven requirement, until read.

### 27. Retire undesigned item 2. LOW, HYGIENE. Size S.
Ruling in question: `COMBAT_ARCHITECTURE.md:1050-1055` `[spec]` still owns "the touch layout cannot express the design" to the input unit. The touch drop retires it. The library supports the drop rather than merely permitting it: on glass "there is no actuation force: contact is activation" (`input-controls/touch-mobile-input/report.md` sec 2.1, SOURCED per reader), and hold-to-wind, held-beam and charge-and-release are the resting-thumb verbs it names as structurally hardest. The genre's normal answer on glass is auto-attack and auto-aim, which would delete the hand-worked tool the premise is about.

### 28. Four things not to build.
* **No active-slot cap.** It would freeze the ledger count, which is both the sight band input and the flagship's scale term (`COMBAT_ARCHITECTURE.md:747-751` `[spec]`, verified). The proposal comes from `game-systems/balatro-experience-ledger/report.md:102`, a turn-based class whose own floor report DECLINES every real-time concept (`game-systems/deckbuilder-card-systems-floor/report.md:231-245`, SOURCED per reader).
* **No item ordering.** Balatro's ordering exists because scoring is a literal left to right pipeline (`balatro-experience-ledger/report.md:123`). This game reads the item set through `js/traits.js` (`COMBAT_ARCHITECTURE.md:44` `[spec]`, verified).
* **No dilution modelling and no removal service on dilution grounds.** Dilution is a draw-odds phenomenon, "roughly, via hypergeometric probability" (`genres/deckbuilder/report.md` sec 3c lines 447-449, SOURCED per reader). No deck, no hand, no draw. The single-acquisition ruling survives. What it cannot survive is being kept with no substitute, because an early mispick is permanent in two systems at once; the substitutes are the hold mechanic and the escalating re-offer, below.
* **No spectator system.** "Skip building spectator/replay infrastructure speculatively... do not build GOTV-style relay or scrubbing playback at this scope" (`multiplayer/spectator-replay-systems/report.md:75`, SOURCED per reader).

---

## WHAT THE LIBRARY CONFIRMS

Short, so settled things stay settled.

* **Power from room clears, not kills.** "HADES and ISAAC have no XP leveling" is on the anti-floor list (`game-systems/roguelite-dungeon-systems-floor/report.md:286`, SOURCED, verified). Hades pays "roughly one reward per chamber" (`game-systems/hades-experience-ledger/report.md:147`).
* **Deleting the XP bar.** "the player can't act differently at 4,993/5,000" is the standard cut (`ux-accessibility/hud-interface-ux/report.md:199`, SOURCED, verified). And "no character-level or XP-threshold system exists anywhere in this class" (`game-systems/deckbuilder-card-systems-floor/report.md:208`).
* **Three offers plus a decline, on clear.** "choose 1 of 3 (skippable)" (`game-systems/slay-the-spire-experience-ledger/report.md:287`) and "commonly 3, plus a 'skip'" (`genres/deckbuilder/report.md:329`). 25.5 picks over roughly 26 rooms is dead on the class rhythm.
* **A derived, non-chosen flagship is legitimate.** "ISAAC hands most items over with no choice" sits on the anti-floor (`game-systems/roguelite-dungeon-systems-floor/report.md:284`, SOURCED, verified), which downgrades "a drafted power-CHOICE screen at every reward" out of the class floor. Note the survivors class pulls the other way, and its floor row is "a between-upgrade choice presentation (the player picks power)" (`game-systems/survivors-horde-systems-floor/report.md:105`); the ledger draft plus WALK ON satisfies that anyway.
* **Pips at 5 to 8.** Inside the documented 2..100 band (`game-systems/survivors-horde-systems-floor/report.md:222`), and padding as a hit-eating buffer matches the Isaac soul and bone heart grammar (`game-systems/binding-of-isaac-experience-ledger/report.md:100-116`).
* **Death ends the night, run save cleared, meta persists.** This is the floor row verbatim: "a run-persist-but-death-ends save model (suspend/resume a run; death is final)" (`game-systems/roguelite-dungeon-systems-floor/report.md:112`, SOURCED, verified). Build suspend-and-resume and death-is-final as two distinct behaviours.
* **Run risk stays at the authored default.** `ux-accessibility/difficulty-assist-systems-accessibility/report.md` sec 10.1 keeps run risk at default and separates it from the permanent profile. Death ends the night is not an accessibility barrier to remove.
* **The 0.7 second post-hit grace.** Brotato's formula caps at 0.4s (`game-systems/survivors-horde-systems-floor/report.md:222`); the document's arithmetic is right and no floor row is violated.
* **Six families is the right archetype count.** "A 200-card pool where only 2 archetypes are ever good has less real depth than a 100-card pool with 6 healthy archetypes" (`genres/deckbuilder/report.md:437`).
* **The sight cost as an upfront legible price is exactly the pattern.** "The downside must be legible before commitment (shown plainly, not hidden), or 'greed' reads as a trap rather than a decision" (`genres/deckbuilder/report.md:365`, SOURCED, verified). The fiction already supplies the curse card; it only needs printing on the offer.
* **Roster arrival gated on run count.** A knowing departure from `:578`, and a safe one: failure 3's root cause is "unlocks tied to volume ('play 50 runs')," and thresholds of 3 and 5 are a drip feed, which is the same row's own fix.
* **Dropping touch.** Not merely permitted, supported. See change 27.
* **Right stick free for aim.** Top-down is where the right stick "becomes a genuine free slot, a free-aim reticle" (`input-controls/gamepad-controller-input/report.md:511-512`, SOURCED, verified).
* **Input before tool authoring.** "nowhere in gameplay code should a raw button/axis identifier appear" (`input-controls/specialized-adaptive-controllers/report.md` sec 2). `COMBAT_ARCHITECTURE.md:1046-1049` `[spec]` already says this.
* **Dez's zero cancel window.** "no cancel window at all" is a real class where "its risk IS the design" (`input-controls/combat-action-input/report.md:848, 876`).
* **No lockstep for co-op; host simulates, guests predict their own scout.** Full lockstep "is usually unnecessary" for online co-op (`multiplayer/deterministic-simulation/report.md:76`, SOURCED, verified).
* **Two seats, invite code, friends only, no matchmaking.** Fits "small session sizes, session-scoped connections, moderate security needs" (`multiplayer/networking-transport-library-selection/report.md:96`).
* **No leaver penalty.** "favor pausing/holding and AI substitution over strict penalties" (`multiplayer/disconnection-reconnection-host-migration/report.md:75`, SOURCED, verified).
* **No floating damage numbers.** None of the three canon roguelite games record them (`game-systems/roguelite-dungeon-systems-floor/report.md` sec 1 and sec 9).
* **Eerie without strobe.** Dread from uncertainty rather than an unavoidable strobe (`ux-accessibility/photosensitivity-motion/report.md` sec 1.4).
* **3D look sensitivity is out of scope by the library's own declaration** for top-down perspective (`input-controls/3d-look-sensitivity-defaults/report.md` Design-Inputs). Do not spend on it.
* **Room-clear picks replace the XP bar's real job.** The XP curve "does not decide how strong the player is, it decides HOW OFTEN the player is asked to choose" (`game-systems/vampire-survivors-experience-ledger/report.md` sec 15.2). Room clears are that cadence. Answered.

Three things the readers flagged as gaps are already closed and should not be reopened: the survivors-class "no moment where the player picks power" row (the dungeon class demotes it, `roguelite-dungeon-systems-floor/report.md:284`); "replace the XP bar's pacing function" (room-clear picks are the cadence, `COMBAT_ARCHITECTURE.md:621-632` `[spec]`); and "should carryover convert to shared unlocks" (nothing strength-shaped carries, `:827-829` `[spec]`, verified).

---

## THE FIVE SURFACES

### SURFACE 1: CONTROLS AND INPUT

**Architecture, built first.** Four layers: device, mapping, context, gameplay, with a per-binding dead zone and curve processor slot. One logical action named ToolUse, bound once, with each character's verb logic reading phases off it. A single action expresses "press, hold, tap, hold-and-release-to-fire, and chord activation entirely as a choice of which phase gameplay listens to plus a mapping-layer trigger config, with zero per-action edge-detection code in gameplay" (`input-controls/input-system-architecture/report.md:573-575`, SOURCED, verified). No five hardcoded verbs. Effort M to design, L to ship, matching the document's own estimate at `COMBAT_ARCHITECTURE.md:1046-1048` `[spec]`.

**Layout.**
* Left stick: Move. For Hollis this is also the attack, with no second binding.
* Right stick: Aim, decoupled from movement facing.
* Right trigger: ToolUse. Dez hold to wind, release locks the swing. Vic held equals beam draining, release recharges. Mikey hold charges, release fires. Junior press places the loop. Hollis unbound, see OPEN CALLS.
* Left bumper: Dodge.
* Right bumper: Flagship ability.
* South face: Interact. Free and uncontested because there is no jump.
* North face (or one d-pad direction): Thermos, dedicated.
* West and East face and the remaining d-pad: reserved unbound at launch. "deliberately leave some of the most reachable inputs unbound... rather than filling every face button and bumper with the current (small) action list just because they're available" (`input-controls/control-scheme-design/report.md:985`, SOURCED, verified). Reader correction on the record: this was cited in one harvest as "sec 10.2"; the text is at `:985` and the rule is also stated at `:353`. The finding is real, the section label was loose.
* L3 and R3 unbound. Start pauses.
* One tool per character with no weapon slots is what makes the reserved-unbound rule affordable here: there is no weapon-swap input to spend.

**Feel contracts.** Dez is the charge-and-release primitive: acknowledgment cue on the frame the button goes down, a charge-held cue that grows through the hold, then zero cancel window on release. Buffer the wind-up start only, never the locked swing; destructive committed actions prefer "NO buffer and an explicit not-ready feedback over any silent queue" (`input-controls/input-buffering-timing-windows/report.md` sec 2.6). Vic needs per-frame continuous feedback for drain and recharge in distinct languages, not bookend cues. Mikey needs an exponential or dual-zone aim curve with a small inner dead zone; the roguelite row requires "the same precision-curve rigor as competitive-shooter for the aim stick" (`input-controls/dead-zones-sensitivity-response-curves/report.md:116`). On the inner dead zone number, a reader correction: it was presented in one harvest as a "3-10%" spec. The source hedges, "often illustrative 3-10%, because every extra percent of inner dead zone is fine-aim precision" lost (`:557`, SOURCED, verified). Treat it as a starting band to tune down from, not a number to ship. Junior's placement is a generic queued-action buffer with a generous window, not a timing test.

**Cadence growth is the sharpest engineering directive on this surface.** Because the tool grows all run with no ceiling, the buffer window cannot be a constant. "as the action's frequency rises, the window must shrink to keep it a small fraction of the inter-action interval, or stale buffered presses will start colliding with fresh intent" (`input-controls/input-buffering-timing-windows/report.md:944`, SOURCED, verified). Derive every window as a fraction of current cadence, per tier. And as cadence rises, tuning resolution tightens to single frames (`input-controls/control-feel-responsiveness/report.md` sec 4.2).

**Remap and accessibility floor.** Full remap on every action including menu navigation, scheme-scoped so a keyboard rebind never touches pad bindings. The marginal cost of full over partial remap "is almost entirely UI and policy work, not gameplay-code work" (`input-controls/input-remapping-rebinding/report.md` sec 1). Hold-to-toggle as a mapping-layer flag on Dez's wind, Vic's beam, and Mikey's charge, shipped day one. A loosen-timing-windows toggle separate from difficulty, because the roguelite row names tight dodge windows as where roguelites most often fail timing tolerance (`input-controls/specialized-adaptive-controllers/report.md` sec 7). No action anywhere may require two simultaneous inputs; audit Mikey's aim-plus-charge for exactly that, and offer a sequential path. Device switching uses threshold-gated hysteresis, never last-device-polled (`input-controls/device-support-hot-swapping/report.md` sec 2).

**Haptics.** A cheap, non-fatiguing per-action vocabulary, short ticks, "never a long sustain on a constantly-repeated action" (`input-controls/haptics-rumble-force-feedback/report.md` Design-Inputs, roguelite twin-stick row). Swell for Dez's wind resolving into a thud on connect. Sustained low hum for Vic modulated by battery state so the player feels the drain without a HUD glance, encoding information in the temporal pattern rather than amplitude. Texture for standing in Hollis's fire, distinct from taking damage so the two burns do not collide.

### SURFACE 2: HUD, ONBOARDING AND ACCESSIBILITY

**The vitals cluster.** One chunk at a screen edge (top-down tolerates denser peripheral panels, `ux-accessibility/hud-interface-ux/report.md` Design-Inputs), three slots left to right in a fixed order that never reflows: HEALTH (5 to 8 filled circles, per `COMBAT_ARCHITECTURE.md:49` `[spec]`), PADDING (0 to 4 plates, a hard edged rectangular silhouette, in its own slot health never enters), THERMOS (3 tick marks, third slot, visually smallest). Three channels carry the health and padding distinction: shape, fixed slot, break behaviour. Colour is a fourth, reinforcing only. Grayscale test at final icon size before art lock. Flash test both states, exposure "well under a second" (`hud-interface-ux/report.md:264`, verified): a fresh viewer must report which of health-lost and padding-broken just happened. No numeric HP readout in the default state; small integer counts read as silhouette, and exact numbers go to depth-on-demand (sec 4.4).

**Hit confirmation, three outcomes, three signals.** Damage 1, 2 or 3 must be legible as an integer at the instant it lands. Author one semantic hit event carrying source, direction and pip amount; screen flash, controller pulse and sound each subscribe. Padding break gets its own sound family, not a variant of the hit sound. One shared impact effect across different outcome states is the archetypal feedback failure (`ux-accessibility/feedback-game-feel-ux/report.md` sec 3.2, RECALLED from harvest, not opened by the verdict agent or by me).

**The flagship ability icon.** Readiness is a critical element: it may intensify, it may never be hidden (`hud-interface-ux/report.md:358`, SOURCED, verified). Its derived identity is this surface's genuinely novel problem, and one passage bears on it that no reader cited: "the sort is not permanent, re-run it when the verb-set changes... build the sec 2 sort at least once per distinct play-context" (`:217`, SOURCED, verified). That converts the problem from "an icon whose meaning drifts" into "a small enumerated set of derivation families, each of which is its own sort." Design the icon as a live readout composed from the leading family, not a picked glyph, and cap the families at six, which is the constant `js/pool.js:41` already implies (`PREMISE_2.md:1251` `[spec]`, verified). The library's standing warning applies and should be written down: an invented signifier only stays legible if used with total consistency (`ux-accessibility/affordances-signifiers-signposting/report.md` sec 3.3), and this is the one signifier designed to drift.

**Onboarding order,** derived from the dependency chain verb, consequence, state, choice, combination, exception, mastery (`ux-accessibility/onboarding-tutorial-design/report.md` sec 5.1) and the one-new-thing rule (sec 5.3):
1. Tool verb, wordlessly, in the cold open. Motive, notice, attempt, consequence, one variation. No other system present.
2. One felt instance of the derived ability, unexplained. Not the rule, one occurrence.
3. Sight baseline shown, then one small attributable loss the player can point at. A player cannot recognize a deviation from normal until they have internalized what normal is (`ux-accessibility/teaching-complex-asymmetric-systems/report.md` sec 5.1).
4. Permadeath and the roster rule, told in words, early, in a low-value context (`onboarding-tutorial-design/report.md:733`, verified).
5. Character swap literacy in the death recap, because "Post-death is the highest-value teaching surface" (`:564`, verified).
Five tools get one shared lesson shape filled five specific ways; the teaching burden grows faster than the number of roles, so separate the shared core from the per-role specifics (`teaching-complex-asymmetric-systems/report.md` sec 4.4). The restart loop must carry near zero ceremony (`ux-accessibility/usability-friction/report.md` sec 14.8).

**Boot flow.** Static, high contrast, controller navigable gate before the cold open: language, text size, captions, flash and motion reduction, incoming damage dial. A dedicated top-level Accessibility category reachable from the front end AND the pause menu, never nested (`ux-accessibility/settings-options-ux/report.md` sec 6.2). Preferences global, run-specific choices per save (sec 9.4), which resolves the settings-persist-across-survivor-swap question by rule: control and access settings are preferences, therefore global. This matches the roguelite motor-mode persistence rule at `reducing-physical-demand/report.md:558` (verified).

**Re-entry.** The death-and-return structure makes every player a returning player. Apply the time-away-scaled digest at survivor granularity (`ux-accessibility/cognitive-accessibility/report.md` sec 9.1): on picking up a survivor who has been away two nights, show who and where, what changed, active build, one safe next action.

**Photosensitivity pipeline.** Avoid, analyze, warn, reduce. One centralized flash and pattern primitive with authored contrast and area bounds, a stacking budget, and one reduced-mode substitution point the reduce-flashing option flips. Analyse the worst legal composite, not the isolated asset, because "every asset passes in isolation, and the composition fails" is the named failure. Ramp the beam on and off rather than instant toggle.

**Caption architecture.** Commit to closed captions for critical sounds. Build the semantic event registry now. Add a directional and urgency indicator as its own small system, because captions own what and who while the visual channel owns where, how far, how fast (`ux-accessibility/visualizing-audio-cues/report.md` sec 1.2).

**Semantic seams, now.** Every health, hit and threat event authored as data, not as hardcoded VFX and SFX, because "the original inaccessible assumption is not a single line of code, it is a decision that gets replicated by every later author who trusted it" (`ux-accessibility/designing-accessibility-from-day-one/report.md` sec 1.2). Every scalable HUD element gets a stable semantic id, a priority tag, and bound size, position and colour variables before the art pass.

**Validation, when a build exists.** Moderated formative rounds of roughly five fresh players; concurrent think-aloud during slack, retrospective replay for combat and death, because narrating during timing-critical play destroys the thing being measured (`ux-accessibility/playtesting-usability-testing/report.md` sec 5.3). The single-tool question is longitudinal by nature and needs a panel playing multiple full nights. Watch for the wrong-mental-model signature (`ux-accessibility/ux-metrics-telemetry/report.md` sec 8.5): flat, confident, repeated wrong use of the flagship that never self-corrects. Run-level cohorts, not calendar-day retention; death-cause as a core-tier event (sec 17).

### SURFACE 3: THE ROGUELITE CORE

**A. THE NIGHT LADDER.** Eight rungs, inside the library's 5 to 20 band, each step one tuned modifier. Opt-in at send-off, one rung unlocked per True Dawn, cumulative, each rung a change to a constant that already exists so nothing new is built: (1) the sit costs 25 scrip; (2) the thermos starts at 2 pulls; (3) the sight bands shift down one boundary, Settled at 5 picks and Certain at 12; (4) padding does not refill at the sit; (5) one extra elite per act; (6) ranged shot damage +1 in act 3; (7) dry socks drop once per run instead of once per act; (8) a fall costs four walk nights instead of two. This is the board's deferred third tier, priced and shipped. Rung 8 is where the escalating bench belongs, opt-in, which is the library's own framing that the ladder "is how you respect both novices and experts" (`genres/roguelike-roguelite/report.md:518`). Size M, no new systems.

**B. THE WEIGHT, within-run.** One hidden number, `weight = conviction + ledger count`, expected 51.9 at run end. Act 3's enemy HP band becomes a function of weight rather than an authored constant. Damage integers stay authored, because at 5 to 8 pips the integer is the legibility channel and the count is not. The tuning target is the library's: "Tune so the median run is uncertain into the late game" (`genres/roguelike-roguelite/report.md:592`). Nothing renders. Hidden, not a visible heat number, because a visible numeric ladder reads as a video-game HUD element the tone should avoid. Size M, gated on the playtest at `COMBAT_ARCHITECTURE.md:1094` `[spec]`.

**C. THE FALL, REWRITTEN.** Keep death ends the night, the write inside `credit` after `runs++`, the results line, the pinboard drawing, the idlers closing up. Change `owed` to a flat 2. Delete `META.debt` and remove `META.falls` from the arithmetic, keeping it as a lifetime tally the Reading can speak. First fall and fourth fall are both two nights out. The escalation survives as ladder rung 8. This kills the zero-sendable branch's entire reason to exist.

**D. THE PITY RULE.** If no keystone-tier item has been taken by room 13, the room 13 offer guarantees one. Room 13 is already the middle escalation threshold, so no new event fires. Size S, one branch in the offer weight machinery.

**E. THE BOARD, CORRECTED.** Strike the conviction-3 start and the 10 scrip. Replace with options: a pre-chosen first escalation branch; the sit available in act 1 instead of act 3; a choice of two act 1 entrances at send-off; the thermos at 4 pulls. Keep the one-at-a-time rule. Total stays 16 entries at 6,400 tin, so the 19.2 night completion is untouched.

**F. TWO SAVE BEHAVIOURS, NOT ONE.** A player quitting mid-night resumes exactly where they left off. A character dying mid-night is not resumable into that dead state. Both are hard floor rows (`game-systems/roguelite-dungeon-systems-floor/report.md:112, 214-216`, SOURCED, verified). Add the escalation branch state to the run save so the suspend half stays true.

**G. UNCHANGED AND CORRECT.** The room-clear income model, the boss at 3 picks, WALK ON, what carries and what does not.

**H. THE CAMP AS A REAL SPACE.** Both close precedents make the between-run hub an explorable space with voiced characters reacting to how and where the run ended (`game-systems/hades-experience-ledger/report.md` sec 6, sec 9). That is where the full voice acting investment pays, in repeated short voiced returns rather than one-off cutscenes.

**I. THE HEADLINE POWER-CURVE DIFFERENCE, STATED.** Both canon games run two channels: an in-run accumulation that resets, and a between-run meta layer that is pure upside. This game's Signing corruption inverts the polarity of the second. That inversion is the actual innovation relative to both precedents and should be treated as the headline, not buried inside a generic progression system.

### SURFACE 4: THE OFFERING PROBLEM

**The draft card.** Three offers plus WALK ON, on every arming clear. Each card prints, before commit: the family sigil, the breakpoint it advances (for example "Wood 3 of 4"), and the ledger count the pick will move you to with the next band boundary marked on the same line. This serves `genres/deckbuilder/report.md:365` literally: the downside legible before commitment.

**Refusal pays continuously, in scrip.** Replace the threshold-only reward. Declining pays a flat scrip stipend plus a capped percentage of scrip held, so refusing early compounds and refusing everything still caps out. Shaped on the one interest anchor the library carries (`game-systems/deckbuilder-card-systems-floor/report.md:277`, community grade, ADVISORY ONLY, and turn-based, so the number does not transfer). This is safe income precisely because `DATA.COINS.convert: 2` is deleted (`COMBAT_ARCHITECTURE.md:709-712` `[spec]`, verified), so scrip cannot leak into tin, and because scrip already has two sinks (the SIT at 15, the act 3 sink). Tune so that 7 to 9 declines out of 25.5 is break-even.

**The door sign.** Adopt the Hades signature affordance: "each exit of an entered chamber displays a symbol naming the reward behind clearing toward it... read before committing" (`game-systems/hades-experience-ledger/report.md:131`, SOURCED, verified). Where an act offers two exits, the sign names ledger draft, scrip cache, supply cache, or the SIT. Taking one declines the other. This is refusal that deletes nothing, costs the one-tool ruling nothing, and is thematically exact: it is baked ground sign, the thing the Light band already reads from the door (`COMBAT_ARCHITECTURE.md:651` `[spec]`, verified). It also gives sight a payoff at every room instead of once per act. Size M on its own.

**Reroll and lock, priced in scrip.** Both ship together in a real-time roguelite (`game-systems/brotato-experience-ledger/report.md:215, 240`). Reroll escalates within one draft and resets at the next, "a cost that starts low and increases with each reroll this shop visit" (`game-systems/balatro-experience-ledger/report.md:244`). LOCK is the important one and neither reader proposed it: locking one of the three offered items so it returns next draft converts WALK ON from asceticism into a plan. Refusal stops being a sacrifice and becomes timing. This plus the escalating re-offer is what pays for keeping the never-leaves-the-build ruling.

**Whetting, not half the pool.** The claim that roughly half of 96 items should be upgrade tokens has no source anyone could verify. The real-time canon gives a narrower evidenced version: "a Pom of Power upgrades a held Boon by one rarity tier" and "a Daedalus Hammer chamber offers a choice between two weapon-specific upgrade clauses altering a core attack" (`game-systems/hades-experience-ledger/report.md:221`). Build 8 to 12 whetting items that raise one held item a tier, plus one hammer-style tool event per act offering a choice of two clauses. Half the pool as upgrades would starve the six-family breakpoint math.

**Breakpoints at 2, 4, 6.** A minor at 2, the keystone at 4, a capstone at 6 (`genres/auto-battlers/report.md:452`, verified). With 25.5 picks and a family cap of 6, a player reaches 4 in two families or 6 in one, never both. That makes concentration beat breadth at equal pick count without any cap on total picks.

**The elite door.** Elite rooms optional, marked on the door sign, paying a draft from a restricted high-tier slice. Entry price is pips.

**Where the ledger count and the build live.** On demand, not on the standing HUD: "Rather than stacking every Boon icon on screen, the full build is exposed through an on-demand overlay called up by holding an input" (`hades-experience-ledger/report.md:127`, SOURCED, verified). This unblocks the counter the document calls missing at `COMBAT_ARCHITECTURE.md:743` `[spec]` without a HUD fight.

**Junior specifically.** His placed loops are structurally tower defense objects. Differentiate loop types by which enemy trait they answer, make the trigger radius as legible as a TD range circle, and give him a reclaim or relay action, or placement becomes purely additive (`genres/tower-defense/report.md` sec 3b to sec 3d). Rooms for Junior and Hollis want chokepoint geometry and objectives beyond kill-everything, or the placement tools have nothing to control (`genres/tactical-rpg-srpg/report.md` sec 3a to sec 3c, sec 3f).

**Not built:** no active slot cap, no item ordering, no dilution modelling.

**Total effort for the full package: L.** The exit signs alone are M; the decline payout is S.

### SURFACE 5: CO-OP AND PRODUCTION READINESS

**Determinism unit, inside the reboot. Size M.** One fixed-step accumulator driving the simulation. One named RNG stream per run, seeded from the run seed, with the cursor serialised alongside the seed, plan, act and room index the room-boundary save already carries. A CI grep gate failing the build on `Math.random`, `Date.`, `performance.now` and `window.` inside simulation files, which is `COOP_DESIGN.md:1070-1076`'s invariant C7 `[spec]` promoted from a co-op prerequisite to a base-game one. Deliverable: same seed plus same inputs replays a night exactly. This one unit buys reconnection resync, seeded invariant bots, replay, and any future co-op at once.

**Co-op v1, unchanged where it was right.** Two seats. Invite by link or six-character code, friends only, both present in camp before the run starts, no drop-in. Host-authoritative binary quantised snapshots at 30 Hz, roughly 1.2 KB per tick, about 37 KB/s per guest (`COOP_DESIGN.md:978-984` `[spec]`, measured against the real field list). Guests predict their own scout only.

**Transport, corrected.** The library's recommended picks are ENet or netcode.io plus reliable.io (`multiplayer/networking-transport-library-selection/report.md:96`, SOURCED, verified). Both are native libraries. This is a browser build funnelling a paid Steam release (`COOP_DESIGN.md:961-965` `[spec]`), so WebRTC DataChannel is forced and that row does not apply. Say so rather than claiming confirmation.

**Reconnection. Size S.** On drop detection, hold the seat. Grace window to the end of the current room, capped at 120 seconds (illustrative; sec 4.1 explicitly warns against copying another game's published number). Opaque session-scoped reconnect token issued at lobby join. Resync on return: full snapshot, never delta, since run state is small (sec 4.3). Headcount changes apply only at a room boundary, because the room advances on a living-to-`waveTotal` ratio and rescaling mid-wave either strands the room or opens the doors instantly (`COOP_DESIGN.md:1000-1002` `[spec]`). While the seat is held, the remaining player continues; the absent scout stands idle and untargetable, no AI substitute, because one tool is one identity and an AI Dez is a worse lie than an absent one.

**Host drop.** No migration, v1 or ever. The run ends, each peer continues solo from their own room-boundary save, and the screen states the host disconnected before it says a scout walked home.

**Duplicate scouts: forbid at the lobby.** Five names, two seats, unique picks enforced in lobby UI. This deletes the mirror-character problem and lets `charId`-keyed logic assume distinctness, which is cheaper than invariant C8's "nothing keys off character uniqueness" (`COOP_DESIGN.md:1078-1082` `[spec]`). Design call, not derived: the five multiplayer reports do not address roster composition.

**Room-clear attribution, proposed not derived.** Conviction is per scout. A room clear ticks every living scout present, because the ruling is that power comes from clears and both players cleared it. Each player's flagship derives from their own ledger only; nothing is pooled and nothing is combined. This keeps synchronised state to per-player ledgers, the cheapest possible snapshot format. Flagged: no report in any harvest covers this.

**Spectating: none.** If the determinism unit lands, add input-resim replay of a seeded run later as a share artifact. Not now.

**Save migration. Size M.** Version matrix artifact with a named owner, because an unowned matrix "is the artifact most likely to silently rot." Retain a real, organically played fixture save from every shipped version. Migration steps, each explicit: strip the dead unlocked ids rather than letting them dangle; replace the defaulted character with a forced re-pick screen on first load rather than a silent default; refund the banked Second Wind by writing directly to `badges`, since `buy()` only ever increments and there is no decrement path. Publish the bound: the last major version loads, older starts fresh.

**Balance and bots, in order.** Adversarial min-max pass on paper now, before any content lands: state the win condition, then at every decision point ask whether a rational optimizer would always make one choice, then push any candidate to its logical extreme by repetition. Pairwise strategy-space matrix over the growth axes. Every number in the numbers document tagged as a hypothesis until measured, because "This strategy feels overpowered" is a hypothesis, not a finding. Bots only after a playable slice: monkey bot plus crash oracle first (the only near-free oracle), then seeded run-invariant checks (every seed completable, resources in bounds). A bot with no oracle "can play the game for a thousand hours and produce zero actionable findings."

**Console certification is conditional and currently inapplicable.** If console is ever targeted, mid-run disconnect handling without corrupting shared run state is release-blocking (`multiplayer/platform-console-certification-requirements/report.md:101`). Web plus Steam today, so this is a watch item.

**One process finding that applies to this whole programme.** The prior pass declared seven domains UNDESIGNED after sampling roughly 25 of 727 reports. `game-dev-teaching/design-critique-revision-loops/report.md` sec 1 and sec 9 name that shape: a critique "ends in three things a creator can use: a named risk, a smaller prototype, and a test," and the failure mode "Verdict substitution" is "the critique reads as a grade... optimizing for sounding decisive instead of transferring judgment." Adopt as a standing rule: before any pass declares a domain undesigned, it must state which reports in that domain it opened. Size S to adopt.

---

## WHAT IS STILL UNGROUNDED

This is the plan for wave 2. 624 reports unread.

### Tier 1: decisions actively blocked on an unread report

**`ux-accessibility/input-remapping-alternative-inputs`.** Cited by name across the targeting, difficulty and testing reports; assigned to nobody. Answers controller HUD focus and navigation semantics, and the adaptive-input verification methodology behind the remap floor. Blocks: the settings menu design, and the controller navigation of the draft overlay, door sign, and reroll and lock buttons, which no report read this wave covers.

**`ux-accessibility/pause-action-scope-addendum`.** Opened at headings only, read by nobody. Owns which screen holds the pause input and the pause scope contract for a roguelite. Blocks: change 24, the pause clock table for Vic's battery and Hollis's fire.

**`D:\Programs\GameTev\research\NUMERIC-FLOORS-SPEC.md`.** The library's own numeric registry, at the research root, assigned to nobody on any surface. Blocks: locking the growth curve, the conviction bands, and the reward cadence.

**`ux-accessibility/audio-mix-accessibility`.** Read to sec 2.4 only (about 200 of 1,074 lines). Blocks: Vic's beam-drain audio tell, threat tells, and the whole non-visual channel the HUD design leans on.

**`ux-accessibility/low-vision-screen-reader-support`** from sec 10 onward, and **`ux-accessibility/information-architecture-menu-flow`** controller-first sections (read to line 339 of 980). Block: menu screen-reader posture and controller-first menu flow.

**`ux-accessibility/ui-scaling-visual-customization`** and **`ux-accessibility/feedback-game-feel-ux`**. Both cited in the HUD design above and neither opened by the verdict agent or by me. Change 26 rests entirely on the first; the hit-confirmation design leans on the second. Read both before acting on either.

### Tier 2: whole domains that own live open questions

**`narrative/` (39 reports, 0 read) and `living-world-dialogue/` (6, 0 read).** Owns: whether the walk-back beat can carry its voice line forever; the Quartermaster's scrip line and any decline acknowledgement; the camp's voiced return beats; whether the tutorial should be in-fiction (an NPC teaching in the world) or a conventional UI tutorial, which `game-dev-teaching/teach-me-how-model/report.md:284` names `living-world-dialogue.dialogue-as-tutorial-feedback` as the owner of. Note one naming ruling in COMBAT_ARCHITECTURE.md already cites `research/narrative/naming-nomenclature/report.md` sec 3.2, so the domain is already load-bearing on a shipped decision and unread.

**`audio/` (31, 0 read).** Owns: the padding-break sound family, the per-damage-integer sound legibility, Vic's drain language, and the whole voice acting pipeline this game's target implies.

**`qa-testing/` (35, 6 read).** Unread and directly load-bearing: `ci-cd-build-pipeline`, `crash-error-reporting-telemetry`, `launch-day-qa`, `platform-compliance-certification`, `beta-early-access-community-testing`, `regression-smoke-sanity-testing`, `network-testing-simulation`, `multiplayer-desync-exploit-cheat-testing`, `accessibility-testing`. Also `determinism-replay-testing` was read but not mined against a concrete determinism spec; it is the natural companion to change 1 and should be re-read.

**`multiplayer/` (18, 5 read).** The five read are transport and session reports. Nothing read addresses reward attribution in co-op, which is change 22.

**`genres/` (71, 14 read).** Two specific gaps named by readers: no report read models a roster bench (a character sitting out N future sessions while another is played), which is the single largest structural gap in the whole wave, with `dungeon-crawler` and `tactical-rpg-srpg` glossaries both listing "permadeath of a character within a roster." And Vic's sustained single-target channel has no genre report owning it as a primary subject; Mikey's player-aimed travel-time projectile likewise (the shmup report explicitly disclaims aiming skill as its domain).

**`game-systems/` (49, 11 read).** No report read documents a single-weapon no-slot character (all three survivors-class canon games run multi-item builds), or an uncapped growth curve (every documented curve is finite and stepped), or a held-and-draining resource tied to the fire button, or an attack input fused with movement.

**`game-design/` (5, 1 read).** `core-loop-and-progression-structure` and `journey-act-chapter-structure-recipes` both unread and both obviously relevant to a three-act night and a room-clear loop. `game-flow-endings-recipes` unread and relevant to True Dawn.

**`monetization/` (27, 0 read), `business-legal/` (5, 0), `process/` (4, 0).** Nothing in this wave touches how the thing is sold, licensed or scheduled.

**`visual/` (47), `visual-trace/` (78), `asset-forge/` (89), `generative-assets/` (6), `source-code-analysis/` (52), `communities-premises/` (60), `engine-tech/` (8), `claude-assisted-engine-build/` (27).** 367 reports. Art technique is out of scope by ruling, so most of `asset-forge` and `generative-assets` are correctly deprioritized for this game, but `visual/` almost certainly owns enemy telegraphing craft, which two genre reports independently name as the top fairness requirement at 5 to 8 pips, and `source-code-analysis/` may own the browser-build and engine constraints the determinism unit has to live inside.

### Tier 3: topics no report in this wave addresses at all

* The flagship ability's behaviour-resolution logic as a function of the item set. Seventeen input reports, thirteen ux reports and eleven game-systems reports touched it and none solve it. The nearest lead is the HUD sort re-run rule at `hud-interface-ux/report.md:217`.
* A mechanic where the player's own mastery REDUCES the information the game gives back. No report models the sight-cost inversion as a named pattern. Nearest owners: `ux-accessibility/cognitive-load-player-attention` sec 6 salience tiers, and the game-design difficulty material.
* The roster bench, as above.
* Whether 96 items across 6 families actually produce distinct builds. `genres/deckbuilder/report.md:437` gives the combinatorial-depth test; running it needs a pool audit, not another report.
* The exact reroll and lock price curve for a real-time roguelite. No report gives a number. This is an in-house tuning job, not a citation.

---

## OPEN CALLS

Every question from every audit and every reader, deduplicated, renumbered, in plain words. Each: the choice, what happens under each option, the recommendation.

### Controls and feel

**1. Should the spotlight and the slingshot get hidden help on a controller, given the design says no help?**
Keeping the rule literally means nothing assists the player and a controller simply aims worse than a mouse. The alternative keeps the visible rule (the crosshair never moves by itself) but quietly forgives near misses after the shot has left, and lets the beam stick slightly to a target already under it. Recommendation: the second. There is no competitor to be unfair to, and the first makes the pad feel broken rather than hard.

**2. Should the hot drink share the pick-up button or get its own?**
Sharing saves a button and costs a lost heal in exactly the rooms where a heal decides the run. Its own button costs one slot from a layout that currently has three spare. Recommendation: its own button.

**3. What happens when someone plays the torch character and pulls the attack trigger out of habit?**
Leave it dead and silent, give it a small secondary use, or show a one-time prompt the first time that character is played. Recommendation: the one-time prompt. Cheapest, and it prevents the impression that the controller is broken.

**4. Should the hold-before-it-counts threshold be one number for everyone, or tuned per character?**
One number keeps timing consistent across the roster. Per character fits each tool's weight but means relearning on every survivor swap. Recommendation: per character, since the player is already relearning an entire verb on each swap.

**5. Should a press that arrives just before the character can start winding up be remembered and honoured?**
Remembering it makes the character feel reliable without making the fight easier. Remembering nothing anywhere risks the swing feeling stiff early and broken by the end. Recommendation: remember the start of the wind-up only, and keep the locked swing itself completely rigid.

**6. Should the heavy weapon's feel stay heavy as it speeds up across a run, or shift toward light and snappy?**
Shifting shows growth but risks ending the run holding what feels like a different tool. Preserving heaviness protects identity but risks sluggishness at top speed. Recommendation: let it shift, tuned in very fine increments near the top of the curve.

**7. Should releasing the charged shot at exactly full power give a bonus?**
A bonus adds a second timing skill on top of aiming. No bonus keeps all the skill in the aim itself, which matters more when there is no aiming help. Recommendation: no bonus. Cap and release.

**8. If the beam is interrupted for a moment, does its progress reset instantly or hold briefly?**
Instant reset punishes any slip. A brief hold is kinder but blurs when it is safe to look away. Recommendation: a short hold, small enough to go unnoticed in normal play.

**9. Should every attack that currently needs a button held also work as tap to start, tap to stop?**
It changes nothing about what the attacks do and opens the roster to players who cannot sustain a press. It costs one flag in the input layer. Recommendation: yes, with hold staying the default feel, shipped day one rather than added later.

**10. Should aiming and charging be allowed one after the other, not only at the same time?**
This matters for players who can only produce one input at a time. Recommendation: yes, as an alternate scheme, not the default.

**11. Should the game guarantee that nothing anywhere ever requires two buttons pressed at the same instant?**
Adopting it now costs almost nothing; retrofitting it later is expensive. Recommendation: yes, adopt it as a standing rule from the start.

**12. Should there be a setting that loosens tight reaction windows, separate from difficulty?**
The library names tight dodge windows as where this genre most often fails players who need more time. Recommendation: yes, ship a generous-timing toggle alongside the normal default.

**13. Should each character's signature feeling come through the controller's vibration, including on cheap controllers?**
Recommendation: yes, with a simple version on basic controllers and a richer one where supported, so nobody with a plain controller is left out.

**14. Should the slingshot get an optional small motion-tilt aim on handhelds?**
Only matters if a handheld release ever happens. Recommendation: leave it until a handheld release is actually on the table.

### Health, the screen, and feedback

**15. Should armour sit in its own slot beside health, or nested inside the health row?**
Own slot: the two states never blur, and it costs a little width. Nested: saves space, risks a misread at the exact moment it matters. Recommendation: own slot.

**16. Should the hot drink's charges keep sharing the health row?**
Sharing avoids buying screen space but puts three different things in one small cluster. Separating costs one position. Recommendation: separate slot, same cluster.

**17. Should health and armour use different shapes, and should those shapes be tested at their real final size before the art is locked?**
Shape survives colourblindness and peripheral vision better than colour, but a shape difference can vanish on a small mark. Recommendation: yes to different shapes, and test at the smallest size they will actually render at, in grayscale, before art lock, not after.

**18. Should a broken armour charge get its own sound and flash, separate from a normal hit?**
A distinct effect is safer to read at a glance and costs extra audio work. Sharing the effect is cheaper but risks players not noticing armour was spent. Recommendation: at minimum a distinct sound, since sound is readable without eyes leaving the fight.

**19. Should every hit always show a consistent signal for exactly how much damage it did?**
With health this low, misreading a hit is a fairness problem, not a polish problem. Recommendation: treat it as a basic requirement, and build it as one shared event that the flash, the sound and the controller all read from.

**20. Should the one-button ability show short on-screen text the first few times its behaviour changes, even though the finished design wants it wordless?**
Text teaches fast but costs the wordless feel. Silence keeps the mood but risks players never learning to watch the button. Recommendation: a brief fading cue for the first one or two changes per character, then silence.

**21. Should the small counter that used to track experience be replaced with something, such as rooms cleared tonight, or removed entirely?**
Every comparable game shows some progress readout and it helps a run feel like it is going somewhere. Recommendation: replace it, do not remove it outright.

**22. Should bosses have a health bar?**
Two of the three closest comparable games have one. It gives players something to read in a fight they cannot otherwise gauge. Recommendation: yes.

### Safety, access and settings

**23. Should a safety and comfort screen appear before the opening scene?**
It costs a few seconds for players who skip it, and it is the only way a player who needs flash reduction gets it before the torch and the spotlight appear. Recommendation: yes.

**24. Should the game offer a setting that reduces the damage the player takes, without changing how enemies behave?**
Offering it keeps the fight identically hard to play while removing the one-unlucky-hit run loss. Not offering it keeps a single authored difficulty. Recommendation: offer it, off by default, reachable before the first real threat, and labelled "Enemy Damage" rather than "Easy."

**25. Should captions cover important non-dialogue sounds, or only spoken lines?**
Fuller coverage costs building an event list now; retrofitting costs far more. The woods lean heavily on sound cues a spoken-lines-only system would leave silent. Recommendation: commit to critical-sound captions and say so plainly on the store page.

**26. Should subtitles default to on at boot, or should the game ask once before the first line is spoken?**
Defaulting on protects players who never open settings. Asking once respects players who do not want text, at the cost of one step. Recommendation: ask once, on the safety screen from question 23.

**27. Should there be an on-screen indicator showing where an important sound is coming from and how urgent it is, on top of the caption text?**
Text alone cannot keep up with a direction that changes fast. Recommendation: yes, as its own small system rather than stretching captions to do a job they cannot do fast enough.

**28. Should the fire trail and the spotlight go through a dedicated flashing-safety check before either character ships?**
This means checking the worst realistic screen (several overlapping fire trails, the camera moving, a player flicking the light on and off), not each effect on its own. Recommendation: yes, and route both through one controlled effect system so the check is possible at all.

**29. Should a player's control and access settings stay the same when the game switches them to a different survivor?**
Keeping them means configuring once. Resetting means reconfiguring mid-momentum after every death. Recommendation: keep them, and treat this as an architecture requirement now rather than a later patch.

**30. Should there be a floor on how little the world is allowed to show a fully certain, fully geared player?**
Without a floor, an expert late in a long run could end up effectively unable to see, which reads as broken rather than as the intended price. With a floor, the theme softens but the game stays playable at every stage. Recommendation: set a floor, and treat its exact value as something to test rather than a concession.

### Teaching

**31. Should the permadeath and roster rule be said in words before the first death?**
Saying it protects trust. Staying silent preserves the shock once, then costs trust. Recommendation: say it, early, in a quiet moment, in a character's voice.

**32. When a player first loses a piece of their vision because their gear got more reliable, should the game say what happened, or let them work it out?**
Saying it protects trust, because an unexplained loss reads as a bug. Staying silent preserves mystery but risks feeling unfair the first time. Recommendation: say it once, briefly, right after the first small loss, in a character's voice, not a system message. Keep it untraceable moment to moment after that, but make sure a player can look back afterwards and connect it to a choice.

**33. When a survivor dies, should the game show what caused it before handing over the next character?**
A short cause-of-death beat teaches the lesson the death was meant to teach. Cutting away saves time but risks the death feeling random. Recommendation: a brief, specific recap tied to the exact mistake, and put the character-swap explanation there too.

**34. Should the very first playable scene hint at the "your gear grows the more you trust it" system at all?**
Hinting risks overloading a scene that already teaches a weapon and a vision cost. Total silence risks the player never noticing the system exists. Recommendation: show one small unexplained instance of it working, and explain nothing yet.

**35. Should five separate first-use lessons be written, or one shared lesson with the weapon swapped?**
Five cost more but teach each tool honestly; a thrown rock bar and a held spotlight do not behave alike. One shared lesson is cheaper and will teach some tools badly. Recommendation: write one shared shape (what to try, what failure looks like, what success looks like) and fill it in five specific ways.

**36. Should a returning player be able to skip parts of a new survivor's introduction they have already proven they know?**
Skipping respects their time. Always repeating feels patronising after the first death. Recommendation: keep world and movement basics silent for a returning player, but always give each survivor's own tool a short mandatory first demonstration, since the tool is genuinely new every time.

**37. Should the game hold back from letting two ability-changing items stack early in a run?**
Holding back makes cause and effect clear. Allowing it from the first pickup matches the grows-all-run idea more purely but risks the player never learning what causes what. Recommendation: hold back for the first item or two each run, then open it up.

**38. Should there be a small safe practice space outside a real night?**
It relieves the "learning the timing costs you the run" problem without changing the death rule at all. Recommendation: yes, a minimal one.

### The run and its rewards

**39. Should turning down an offer pay a small amount of pocket money every time, or only pay off by keeping you in a better seeing state?**
Paying every time makes declining a real choice all run and is tunable to a target rate. Paying only through the seeing state means declining is worthless for roughly 22 of the run's 26 offers, because that state only changes at two points. Recommendation: pay a small amount every time, on top of the seeing benefit.

**40. Should the player be able to hold one of the three offered things so it shows up again at the next offer, for a small price?**
With it, declining becomes a plan instead of a loss. Without it, every decline is permanent and players will hoard rather than pass. Recommendation: yes, hold exactly one, priced in pocket money.

**41. Should the exits of a room show what clearing toward them pays, before you commit to one?**
With it, choosing one exit means declining the other, which creates real scarcity without ever taking anything away. Without it, the only scarcity is the three-way offer. Recommendation: yes, and note it also gives good eyesight something to do in every room instead of once per act.

**42. Should the player ever be able to give up something already carried in exchange for something else?**
Allowing it fixes early mistakes and matches what the closest comparable game does. Forbidding it keeps the fiction clean, since the point is that certainty cannot be un-decided, but it means an early wrong turn is permanent in both the power system and the seeing system at once. Recommendation: keep the ban, and pay for it by shipping the hold mechanic (question 40) and the escalating re-offer, which give forward control rather than backward undo.

**43. Should harder optional rooms pay a better class of reward?**
With it, the strongest gear costs health to reach, which fits the theme and gives skilled players a lever. Without it, every room pays the same and there is no reason to take a risk. Recommendation: yes, one restricted better tier, entered by choice, marked on the exit before you commit.

**44. Should collecting several of the same kind step up two or three times instead of once?**
Three steps make concentrating clearly better than spreading, and give a mid-run decision about whether to commit or switch. One step means everything past the third of a kind is flat and the choice ends early. Recommendation: three steps.

**45. Should the game guarantee one strong item partway through a night if the player has not found one?**
Guaranteeing it prevents a night that was doomed by bad luck. Not guaranteeing it keeps every night's shape honest. Recommendation: guarantee it once, at the midpoint, and only when nothing strong has landed.

**46. Should the reward for clearing a room be handed over immediately, or only when the player chooses to move on?**
Immediate is simpler and always fair. Delayed creates a small push-or-bank moment but adds one more decision per room. Recommendation: delayed, tied to leaving, since the design already frames progress as choices under uncertainty.

**47. Should the camp store be allowed to sell anything that makes the player start a night stronger?**
Allowing it is simpler and two entries already do it. Refusing it keeps the promise that the store sells choices, not power. Recommendation: refuse it, and swap those two entries for choices.

**48. Should the woods get harder as the player's kit gets stronger inside a single night, or only as the night gets deeper?**
Only-deeper is what is written now and it lets a strong build flatten the back half. Tracking the kit keeps the last act uncertain but makes the numbers harder to tune and needs a playtest. Recommendation: track the kit, applied to how tough enemies are, never to how much damage a hit does.

**49. Should there be a set of optional harder settings the player unlocks by winning, and should the level be visible as a number?**
Yes gives experts somewhere to go and is the standard answer in every comparable game studied. No keeps the build smaller now. A visible number rewards mastery; a hidden one protects the tone. Recommendation: yes, eight of them, each a single change to a number that already exists, and keep any within-night scaling hidden while the opt-in rungs themselves are named and visible at send-off.

### Death and the roster

**50. Should a survivor's absence after a death get longer every time it happens, or stay the same length?**
Longer punishes the struggling player hardest and takes away the character they are learning, which is the thing the research says skill actually transfers through. The same length keeps the loss real but keeps the retry available. Recommendation: the same length, two nights, with the escalating version moved onto an opt-in harder rung.

**51. Should a survivor who dies and comes back after missing a couple of nights come back exactly as they left?**
Nothing in any comparable game benches a character, so there is no precedent either way. Resetting their gear growth adds a second punishment on top of the absence. Recommendation: come back untouched, since the growth belongs to the character, so death costs playtime with a favourite rather than lost progress. Show the player plainly what carried over and what did not.

**52. Should the three starting survivors be the same for every player, or should the player choose which three of the five start unlocked?**
Fixed keeps the teaching order controlled. Player-chosen adds replay variety at the cost of authoring five different first-three paths. Recommendation: fixed.

### Co-op and foundations

**53. Should the seeded, fixed-step foundation be built now, inside the reboot, even though co-op is far off?**
Building now costs a medium unit and makes reconnection, automated seed testing and shareable run replays cheap later. Deferring saves that unit and makes all three expensive or impossible, because retrofitting this into a live simulation is the costliest version of the work. Recommendation: build it now.

**54. When a partner's connection drops mid-room, should the run pause or continue with their character standing idle?**
Pausing protects the missing player's night but freezes the other player at an arbitrary moment. Continuing keeps the pressure honest and risks the returning player rejoining into a worse position. Recommendation: continue, hold the seat to the end of the room capped at two minutes, and let the remaining player choose to wait at the door.

**55. When the host quits, should the screen say the connection ended, or only tell the in-world story?**
Only the story reads as a bug to a player who knows their friend quit, and an unexplained end is the actual trust breach. Naming it costs one line of interface text. Recommendation: name the disconnection first, then the story line.

**56. Can two players pick the same survivor?**
Allowing it means two identical characters with one identical tool, which the one-tool identity makes stark. Forbidding it costs a lobby rule and one refusal message, and makes the code cheaper. Recommendation: forbid it.

**57. When two players clear a room together, does each of them advance, or do they share one advance?**
Each advancing is generous and matches the rule that clearing, not killing, is what pays. Sharing keeps a duo run's total power equal to a solo run's and makes co-op a difficulty choice rather than a power choice. Recommendation: each advances, and tune enemy counts rather than the reward.

**58. Can a survivor who is currently walking back after a death be pulled into a co-op seat?**
No research read this wave addresses it. Recommendation: no, because the whole point of the walk is that they are unavailable, and an exception here quietly deletes the cost.

**59. Should the game run on players' own machines connecting to each other, or on servers you pay for?**
Peer connections avoid server cost but need extra work when the host leaves. Servers avoid that entirely but cost money forever. Recommendation: peer, with no host handover, and spend the saved effort on making rejoining work well.

### Testing and housekeeping

**60. How far back should old saves be promised to load, and should that promise be written down before the format changes?**
Leaving it unstated means the first breakage is discovered by players. Stating it now costs a sentence and gives testing a target. Recommendation: state it now as "the last major version loads, anything older starts fresh."

**61. Should the currency banked into the deleted survivability upgrade be refunded, converted, or left stranded?**
Stranding it silently punishes the most invested returning players. Refunding it to the general pool is one migration step and is the only option that survives an audit. Recommendation: refund to the general pool and say so on first load.

**62. Should someone deliberately try to break the growth numbers now, hunting for the single strongest build, before more content exists?**
Doing it now costs almost nothing and is the strongest signal available before there are real players. Waiting treats a document full of unvalidated numbers as settled. Recommendation: do it now, on paper, and tag every unmeasured number in the numbers document as a hypothesis until it is measured.

**63. Should automated bots be built before a playable slice exists?**
A bot needs a running game and something telling it what wrong looks like; built earlier it produces reports nobody can act on. Recommendation: wait for a playable slice, then start with the cheapest bot (plays randomly, reports crashes) before anything smarter.

**64. Should the "does the growing tool stay interesting" test use the same players across many nights, or fresh players each time?**
Repeated players show whether interest holds but become experts who no longer react like newcomers. Fresh players protect honest first reactions but can never prove interest on night ten. Recommendation: run both, as separate studies, and never ask players directly whether they noticed the ability changing, because asking teaches them to look for it.

### One question that cannot be made plain, and what that means

There is a question this wave could not phrase in ordinary words: how the one-button ability should decide what it does. In the canon it currently reads as three separate derivations stacked on one button. Its shape comes from whichever family the player holds most of, chosen from six authored deliveries. Its payload comes from the same trait substrate the weapon uses. Its scale is the weapon's damage multiplier times the square root of the number of items held (`COMBAT_ARCHITECTURE.md:40-47` `[spec]`, verified). Three inputs, three different mechanisms, one unlabelled button, and the player is never told any of it.

Every attempt to write that as a plain choice produced a sentence a player could not follow, which is the signal. Nothing in 103 reports solves it, and the nearest useful lead is a HUD rule about re-running the element sort whenever the verb set changes (`ux-accessibility/hud-interface-ux/report.md:217`, SOURCED, verified), which says: stop treating this as one icon whose meaning drifts, and start treating it as a small, named, enumerated set of behaviours, each of which is its own thing to read and learn. So the honest call is not a question but a recommendation: before this ships, reduce the ability to a countable list of named behaviours the player can eventually learn to recognise, and derive only which one fires, not three independent properties at once. The document itself already gates the whole feature behind a prototype question and names a static fallback (`COMBAT_ARCHITECTURE.md:46-47` `[spec]`, verified). That gate is the right instinct. Tighten what is being gated.

---

## READING ACCOUNT

I was assigned no reports as a primary reader; I am the synthesist. I opened and read, in full at the cited passages, 26 reports plus `PREMISE_2.md` and `COMBAT_ARCHITECTURE.md` and `COOP_DESIGN.md`, verifying 30 distinct citations. None failed to open. No cited passage failed verification. Two were mislabelled by section by their original readers and are corrected inline (the reserve-unbound rule, and the aim dead zone band). One reader's report count does not reconcile and is flagged in COVERAGE (genre-adjacent). Two citations carried into THE FIVE SURFACES are labelled unverified because no agent in this wave opened their source (`ui-scaling-visual-customization`, `feedback-game-feel-ux`).
