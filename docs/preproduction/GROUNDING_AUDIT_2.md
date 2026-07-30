# GROUNDING AUDIT, WAVE 2

Date 2026-07-29. Wave 2 of the library grounding pass. Wave 1 read 103 of 727 reports and produced GROUNDING_AUDIT_1.md; this wave read the domains that owned live decisions and were untouched: narrative, audio, game-design, living-world-dialogue, monetization, business-legal, process, engine-tech, plus the specific reports wave 1 named as blocking.

Verification note. I am the synthesist, not a primary reader. I was assigned no reports of my own. Before writing I independently opened and re-read the passages behind 24 of the citations below, across 18 reports and 4 repo files. Every one held: the wording is verbatim and the line numbers are correct within one line. Two off by one line references from the readers are corrected inline. Where a reader's own count or attribution does not reconcile, it is named by name in COVERAGE.

---

## THE HEADLINE

Fourteen things have to change. In severity order, in plain words.

**1. Kill the percentage on the refusal payout before anyone builds it.** Wave 1 proposed paying a player who turns down an offer a flat amount plus a slice of the money they already hold (`GROUNDING_AUDIT_1.md:285` `[spec]`, verified). The research on games built around growing numbers names that exact shape as the recipe for a game that solves itself: `genres/idle-incremental/report.md:297` (SOURCED, verified) calls the ratio between how fast income grows and how fast prices grow "the single most important tuning knob in the entire genre: too generous and the game trivializes," and its failure table at `:725` names the outcome, the game "solves itself." Flat only. Wave 1 created this defect. Size S.

**2. Every piece of gear needs its own price. This is the root of the offering problem.** All 96 items currently cost one identical sliver of eyesight (`COMBAT_ARCHITECTURE.md:641-646` `[spec]`, verified). `genres/ccg-tcg/report.md:294` (SOURCED, verified): "Adding an ability must **subtract from the stats**, add a **drawback**, or **raise the cost**." Three offers at one price is not a choice, it is a max operation. Size M.

**3. The carrying capacity must fall below the number of offers, and wave 1's argument against that is arithmetically wrong.** Capacity is 36 against 25.5 expected picks (`COMBAT_ARCHITECTURE.md:1003` `[spec]`, verified, "a 38% margin the file itself advertises"). `GROUNDING_AUDIT_1.md:293` `[spec]` (verified) defends the slack with "With 25.5 picks and a family cap of 6, a player reaches 4 in two families or 6 in one, never both." That is false: 4 plus 4 plus 6 is 14 picks, and 6 in four families is 24 picks, both inside 25.5. Two readers found the capacity defect independently; the arithmetic error is a third proof. Size S.

**4. The game has no map, and the rulebook for its own class calls a game without one incomplete.** `game-systems/top-down-action-adventure-systems-floor/report.md:108` lists "a map or spatial-orientation aid" as a floor row and `:124` (SOURCED, verified) names it as one of "the rows the app most often violated." I grepped `COMBAT_ARCHITECTURE.md` for map, minimap, act map and run map: zero hits `[spec]`. The same report forbids requiring a permanent corner minimap, so an on demand act map satisfies it. Size S to rule, M to ship.

**5. Rule now that the sight price never touches health, armour or the drink.** `top-down-action-adventure-systems-floor/report.md:143` (SOURCED, verified): "the health readout is **always shown during play and is not offered as a toggle**." At 5 to 8 pips with hits worth 1 to 3, a dimmed pip row is a lost night that reads as a bug. Size S, a written rule, no code.

**6. The game's headline secret has no delivery channel that survives its own mechanic.** The reveal currently rides optional sightings (`PREMISE_2.md:1382-1383` `[spec]`, verified), which the sight bands subtract, and canon already records the mechanic as blocked: "So the sight bands have no input to read and no surface to read it on" (`PREMISE_2.md:1250-1251` `[spec]`, verified). `narrative/embedded-found-narrative/report.md:185` (SOURCED, verified): routing a load bearing fact through optional content "punishes exactly the players (skippers, first-timers, action-focused players) who are least likely to seek out the missing piece," and here the punished group is the conviction maximising player, which canon names as the default. The fix is a Layer 0 tell on every room clear, per `:385-409`. Size M.

**7. Co-op as ruled ("direct player to player") cannot ship as stated.** `multiplayer/multiplayer-framework-custom-engine/report.md:83` (SOURCED, verified), the `platform = pc` row: "budget relay fallback (sec 3, sec 9) as a **non-optional layer, not an edge case**, since a meaningful share of PC players sit behind NAT/firewall configurations that defeat direct P2P connection." Same report `:173` (verified): direct connections "expose peer IP addresses to each other unless relayed." Restate the ruling as "no servers that run the game," and adopt hole punching plus relay from a library. Size M to adopt, XL if built.

**8. Cross computer replay determinism is the wrong target, and this overturns one of wave 2's own recommendations.** `read:qa-determinism` recommends budgeting a cross computer replay check before shipping. `multiplayer/deterministic-simulation/report.md:80` (SOURCED, verified), `scope = solo / small-indie`: "Do not build fixed-point math or cross-platform determinism speculatively... scope to same-platform determinism only unless cross-play is an explicit, funded goal," and `:87`: for roguelite action "full fixed-point physics determinism is usually overkill." Nobody in wave 2 was assigned that report, which is how the recommendation got made. Target same build, same machine, and write it down. Size S to decide.

**9. Two characters arrive on a raw run count, and the library forbids that in those words.** `COMBAT_ARCHITECTURE.md:850-851` `[spec]` (verified): `vic: { arrivesAfter: 3 }`, `hollis: { arrivesAfter: 5 }`. `narrative/story-structure-interactive-media/report.md:363` (SOURCED, verified): "**Never gate the meta-arc's beats on time or run-count alone, gate on milestones the player's play produces**," and the roguelite worked example at `:370` specifies "one new lore/relationship beat per unlocked milestone (not per run-count)." Cheap to fix: swap the integer for a condition of the same rough cadence. Size S.

**10. Voice file names are generated from the wording of the line, and the library says the opposite.** `tools/voice/gen.py:319` `[code]` (verified): `filename = f"{slug(entry['category'])}_{slug(entry['slot'])}_{entry['hash8']}.webm"`, and `tools/voice/README.md:138-140` `[code]` (verified): "a line's filename changes only when its *wording* changes." `audio/dialogue-systems-vo-pipeline/report.md:339-341` (SOURCED, verified): "**IDs are immutable once a line has entered recording**... a stable join key, never repurposed." Today every clip is a placeholder, so the fix is free. After casting it is the most expensive retrofit in the pipeline. Size S now, L later.

**11. The platform and money decision is already contradicting itself inside canon.** `COOP_DESIGN.md:962-963` `[spec]` commits to a free web build as the funnel for a paid Steam release. `monetization/storefronts-platform-economics/report.md` sec 7.2 at `:245` (SOURCED, verified): resolve the model and the platform "**as one decision**, not two... explicitly confirm they are not fighting each other's norms before locking either." A permanent free browser product on a wishlist driven storefront is an outside traffic programme you run forever. The monetization reader recommended a demo instead without knowing the ruling existed, so this is a reversal to rule on, not a fresh suggestion. Size M.

**12. There is no target for how long one night takes.** `game-design/core-loop-and-progression-structure/report.md:276` (SOURCED, verified, the reader cited `:275`): the player should know what they are doing "in the next 20 to 40 minutes," and `:281`: "Session length is a design target, not an accident." Twenty seven rooms is unjudgeable without the number. Size S.

**13. Breaking an armour charge has no sound of its own.** `audio/audio-game-feel-juice/report.md` sec 2.3 (SOURCED, verified) sets the test: a player can tell outcomes apart "**from sound alone, with eyes closed**." A re pitched hit fails it. At 0.7s of grace after a hit this is the highest value slot in the mix, not polish. Size S.

**14. Full human voice acting across twenty camp survivors is the named way a dialogue budget gets wasted.** `living-world-dialogue/everyday-npc-dialogue-social-texture/report.md:291` (SOURCED per reader, the tail verified by the narrative auditor at `:288-295`): "dividing evenly is the single most common way scope gets wasted in this layer," producing "a town where every NPC is equally thin." Six to eight deep, the rest on a shared pool. Size S to decide, and it changes the whole recording budget.

---

## COVERAGE, HONESTLY

Counts taken from the filesystem: `find . -name report.md` under `D:\Programs\GameTev\research` returns 727, and the per domain counts below were taken the same way. Wave 1's column is copied from `GROUNDING_AUDIT_1.md:45-69` `[spec]`.

| Domain | Reports | Read wave 1 | Read wave 2, new | Still unread |
|---|---|---|---|---|
| narrative | 39 | 0 | 22 | 17 |
| audio | 31 | 0 | 12 full, 1 section only | 18 |
| game-design | 5 | 1 | 4 | 0 |
| living-world-dialogue | 6 | 0 | 6 | 0 |
| monetization | 27 | 0 | 6 | 21 |
| business-legal | 5 | 0 | 4 | 1 |
| process | 4 | 0 | 2 | 2 |
| engine-tech | 8 | 0 | 4 | 4 |
| visual | 47 | 0 | 6 partial | 41 |
| genres | 71 | 14 | 8 | 49 |
| game-systems | 49 | 11 | 6 | 32 |
| qa-testing | 35 | 6 | 9 | 20 |
| multiplayer | 18 | 5 | 6 | 7 |
| ux-accessibility | 36 | 32 plus 1 headings | 2 new, 3 completed | 2 |
| source-code-analysis | 52 | 0 | 2 | 50 |
| input-controls | 23 | 23 | 0 | 0 |
| game-dev-teaching | 11 | 11 | 0 | 0 |
| asset-forge | 89 | 0 | 0 | 89 |
| visual-trace | 78 | 0 | 0 | 78 |
| communities-premises | 60 | 0 | 0 | 60 |
| claude-assisted-engine-build | 27 | 0 | 0 | 27 |
| generative-assets | 6 | 0 | 0 | 6 |
| **TOTAL** | **727** | **103** | **99** | **525** |

Running total across both waves: **202 of 727, which is 27.8 percent.** Wave 1 alone was 14.2 percent. Two thirds of the library is still unopened, and the three largest unopened domains (asset-forge 89, visual-trace 78, communities-premises 60) are mostly about GameTev's own forge rather than about this game, so the honest figure for this game's relevant library is better than 27.8 percent and still nowhere near complete.

Also read this wave and not counted in the 727: `D:\Programs\GameTev\research\NUMERIC-FLOORS-SPEC.md`, which is the library's numeric registry and sits at the research root, not inside a domain. Wave 1 named it as blocking three decisions; it was read in full this wave.

Where the numbers or the attributions do not reconcile, named by name:

* **`read:core-loop` declared 5 of 5 and two of those were partial.** It said so itself: `game-meta-features-systems` read at Design Inputs, sections 1, 2.1 to 2.2, 2.4, 3 to 7 and 11.1 to 11.3 of 1439 lines, and `chart-taxonomy-recipes` read to section 11 of 507. Honest reporting; the domain is nonetheless complete at 5 of 5 because no other reader touched the remaining three.
* **`read:living-dialogue` declared 6 of 6 and three were partial, and the unread tail mattered.** The narrative auditor opened the tail of `living-world-dialogue/voice-dialect-class-culture-signaling/report.md` at `:344-400` and found the speech signal matrix, which is precisely the artifact that reader's own recommendation depends on. The shop and service tail also holds an unmined complaint and haggle matrix. That harvest is usable and incomplete.
* **`read:telegraph` read all 6 of its reports partially (50 to 79 percent by line count), declared honestly, and its headline finding is wrong.** It claimed a HIGH severity contradiction between the sight bands and telegraph legibility. The audio auditor opened the passages and found nothing in canon routes sight at an active enemy tell: `COMBAT_ARCHITECTURE.md:733-736` `[spec]` scopes the third band to baked ground sign, and `PREMISE_2.md:1383` `[spec]` says the bands "only take away the optional sightings." The real defect is that the exemption is nowhere written down. Substance survives, severity and framing do not.
* **`read:multiplayer-coop` misattributed its single most important citation.** It credited the relay fallback quote to `multiplayer/state-replication-interest-management` at `platform = pc`. That report has no `platform = pc` row and the string "relay" appears zero times in it (the determinism auditor grepped it). The quote is real and lives at `multiplayer/multiplayer-framework-custom-engine/report.md:83`, which I verified myself. Finding real, citation wrong.
* **`read:monetization-steam` misplaced a quote by section.** It put "Test a free starter chapter with a single, clearly priced permanent unlock" in section 8.2. I opened the file: it is at `monetization/premium-buy-to-play/report.md:264`, inside section 11's worked scenarios, and the same line carries the test the reader omitted, "The free portion must be a demo rather than a frustration funnel."
* **`read:qa-determinism` made a recommendation the governing report contradicts.** See headline item 8. It also correctly noted that `qa-testing/determinism-replay-testing/report.md:166` defers: "**This is the full subject of `multiplayer.deterministic-simulation`**." Nobody was assigned that report; the determinism auditor read it unassigned and caught the conflict.
* **`read:narrative-voice` rests one claim on a passage nobody verified.** It cites a fear register table at `PREMISE_2.md:935-939`. The narrative auditor could not confirm it and labelled it reader sourced. Anything built on that table should be checked before it is authored against.
* **Two off by one line references, corrected here:** `game-design/core-loop-and-progression-structure/report.md:275` is actually `:276` for the 20 to 40 minute band, and `COMBAT_ARCHITECTURE.md:161-167` shows Dez's run end interval at **0.461s**, not the 0.40s floor an audio reader used, which drops him just outside the mush band rather than inside it.
* **One arithmetic error in wave 1's own text,** found independently by the loop auditor and confirmed by me at `GROUNDING_AUDIT_1.md:293`. See headline item 3.

Every reader in this wave that declared a partial read declared it in its own coverage line. No reader in this wave claimed a count I could not reconcile with its citations, which is the failure wave 1 caught and this wave did not repeat.

---

## WHAT MUST CHANGE

Consolidated from five audits and eighteen reader harvests, deduplicated, ranked by severity then by how much later work depends on it. Every entry names the ruling, the library, the citation, severity and size. Items already ruled by wave 1 are not repeated unless wave 2 found a second citation or a defect in wave 1's own fix.

### 1. Strike the percentage from the refusal payout. HIGHEST. Size S.
Ruling: `GROUNDING_AUDIT_1.md:285` `[spec]` (verified) shapes refusal as "a flat scrip stipend **plus a capped percentage of scrip held**." Library: `genres/idle-incremental/report.md:297` (SOURCED, verified) and the failure row at `:725` (verified). Against flat priced sinks (the SIT at 15 and one act 3 shop slot, `COMBAT_ARCHITECTURE.md:705-712` `[spec]`, verified) a payout that compounds is the named recipe for a solved game. Flat stipend only.

### 2. Give every item its own price. HIGHEST. Size M for the pool, S for the schema.
Ruling: one shared sight tick for all 96 items (`COMBAT_ARCHITECTURE.md:641-646` `[spec]`, verified). Library: `genres/ccg-tcg/report.md:294` (SOURCED, verified) and the failure it names, strictly better cards "collapse a cost slot to one obvious choice" (`:287`). Split the pool: roughly a third plain, a third carrying a stated drawback at the same tick, a third build around at a doubled tick. Two axes, not one.

### 3. Cut capacity below the pick count. HIGH. Size S.
Ruling: `FAMILY_CAP = 6` against 25.5 picks, 36 capacity (`COMBAT_ARCHITECTURE.md:341, 1003` `[spec]`, verified). Library: `genres/ccg-tcg/report.md:392` (SOURCED, verified), copy limits "force **variety and consistency to trade** off." Wave 1's counter argument is arithmetically wrong (headline 3). Set `FAMILY_CAP = 4`, giving 24 capacity. A filled family stops being offered, so nothing ever leaves the build and the single acquisition ruling is untouched.

### 4. Adopt the fixed timestep and seeded RNG inside the reboot, scoped to same machine. HIGH. Size M.
This is wave 1's change 1, confirmed by three further reports and one scope correction. Confirmations: `engine-tech/engine-architecture-subsystems-game-loop/report.md:86` roguelite row wants a fixed timestep "if any of the run's outcome depends on frame-sensitive timing" (SOURCED per reader), and `multiplayer/multiplayer-framework-custom-engine/report.md` Design Inputs, `session_model = roguelite-runs (co-op)`, wants "deterministic or semi-deterministic state that can cheaply re-sync a rejoining player mid-run" (SOURCED per reader). Correction: `multiplayer/deterministic-simulation/report.md:80` and `:87` (SOURCED, verified) scope this to same platform only. Also `:85` (verified): "Determinism is a foundational architectural decision made at core-loop design time, not a retrofit." Repo: `js/ui.js:2136` `[code]` clamps dt inside a raw animation frame loop, and 55 unseeded `Math.random` call sites exist across 14 files, with one injectable seam already at `js/pool.js:238` `[code]`. Tie break note for the future: that engine report's table argues both ways at `:88` and `:90`; the profile row wins here because this game is frame sensitive by design.

### 5. Restate the co-op ruling and adopt relay plus hole punching. HIGH. Size M to adopt.
See headline 7. Also `multiplayer/multiplayer-framework-custom-engine/report.md:192` (SOURCED, verified): NAT traversal is "arguably the single most 'don't reinvent this' layer in the whole stack. **Adopt.**" Everything else in co-op v1 gets simpler, not harder: listen server with the host authoritative (`:173`, verified), replicate everything to everyone at two players (`multiplayer/state-replication-interest-management/report.md:68`, SOURCED per auditor), no rewind lag compensation because there is no player versus player, no cross player anti duplication because nothing crosses between saves.

### 6. Build a Layer 0 tell for the sight cost. HIGH. Size M.
See headline 6. `narrative/embedded-found-narrative/report.md:385-409` (SOURCED, verified) gives the three layer architecture whose Layer 0 test is "remove ALL found content... does the plot still fully make sense? MUST be YES." Fire one non verbal, non optional tell on every conviction tick, independent of sight band so it survives the Certain band.

### 7. Write the sight carve out as a rule, not an implication. HIGH. Size S.
Nothing in canon routes sight at an active enemy tell, and nothing in canon says it never will. What sight does take is not flavour: the pre room roster read is threat composition, which sits at Tier 2 on the salience ladder in `ux-accessibility/cognitive-load-player-attention/report.md` sec 6.1 at `:272` (SOURCED, verified), "TIER 2 -- useful input to the CURRENT decision, not fatal to miss." The Certain band opens at ledger 16, which `COMBAT_ARCHITECTURE.md:725-729` `[spec]` (verified) derives to land within a sixth of a pick of the act 2 to act 3 boundary, exactly where the 3 damage rows live (`:416-422` `[spec]`). `visual/animation-principles-games/report.md` sec 8.2 at `:804` (SOURCED, verified): "**Telegraph duration must scale with the punishment.**" So the system degrades a Tier 2 preview at the depth where punishment peaks, and never states that the Tier 1 channel is exempt. Write the exemption.

### 8. Rule that sight never touches the vitals cluster. HIGH. Size S, rule only.
See headline 5. Health, padding and thermos are out of scope for the sight price, permanently, in writing.

### 9. Ship an act map. HIGH. Size S to rule, M to build.
See headline 4. One button, on demand, showing rooms cleared and rooms ahead in this act, sharing a screen with the door sign. The report's own anti floor at `:313` and `:317` forbids requiring a persistent minimap, so on demand is the correct form, not a corner overlay.

### 10. Change Vic's and Hollis's arrival to a play produced milestone. HIGH. Size S.
See headline 9. The document's own defence at `COMBAT_ARCHITECTURE.md:864-866` `[spec]` ("It unlocks options, not strength") answers a strength objection; the library's rule carries no strength qualifier and is about pacing.

### 11. Fix the voice line ID before casting. HIGH FOR TIMING. Size S now.
See headline 10. Adopt `<CHARACTER>_<CATEGORY>_<CONTEXT>_<NNN>` per `audio/dialogue-systems-vo-pipeline/report.md` sec 3.2, drop the wording hash from the filename, move it to a manifest as `text_hash` plus a `status` field (draft, synth placeholder, recorded, QA passed). `:348` (SOURCED, verified) gives the behaviour on a rewrite: the line's status flips to stale, it does not silently keep playing old audio and it does not silently get a new ID.

### 12. Name and declare True Dawn the meta climax. HIGH. Size M.
`narrative/story-structure-interactive-media/report.md:368` (SOURCED, verified): a roguelite with a defined win state "needs the meta-layer to build toward and deliver a genuine [section 4] style envelope climax," and `:370` wants "a final run-type reserved for after the last meta-milestone that is deliberately harder and more narratively loaded than any regular run." Correction to `read:narrative-core`, which said nothing in canon names one: True Dawn is named at `PREMISE_2.md:1449` `[spec]`, gated on a creature count, with the twelfth name as its payoff. This is a promotion, not an invention, and its creature count gate already satisfies item 10's rule.

### 13. Resolve the platform and money pairing as one ruling. HIGH. Size M.
See headline 11. Recommended shape from the shipping auditor: Steam primary, premium, and the free web build retired as a public product and kept as an internal build target, because a controller required game fits browser play badly and the web row's near zero built in discoverability makes it a cost rather than a funnel (`monetization/storefronts-platform-economics/report.md`, Design Inputs `platform = web`, SOURCED).

### 14. Add a semantic event layer for audio and captions. HIGH FOR ARCHITECTURE. Size S now.
Name `HitConfirm(source, direction, pips)`, `PaddingAbsorb`, `PaddingBreak`, `LowPips`, `DangerTelegraph`, `RoomClear`, `PickChain(step)` as events rather than direct play calls. This is what wave 1's caption commitment hangs off (`GROUNDING_AUDIT_1.md:120-121` `[spec]`), and it is the same controlled vocabulary discipline as `audio/dialogue-systems-vo-pipeline` sec 3.2. `audio/audio-implementation-event-systems/report.md` sec 2 (SOURCED per reader) defines an event as "a behavior, potentially with zero, one, or many underlying audio assets."

### 15. Give padding break its own sound family. MEDIUM HIGH. Size S.
See headline 13. Six outcome families minimum: 1, 2 and 3 pip hits, padding absorb, padding break, miss, separated on all four of the levers in `audio/audio-game-feel-juice/report.md` sec 2.3 (pitch register, timbral character, envelope shape, layer count, SOURCED, verified).

### 16. Make the three damage integers three weight classes, not three volumes. MEDIUM HIGH. Size M.
`audio/audio-game-feel-juice/report.md` sec 3.4 (SOURCED, verified) gives Light, Medium and Heavy bands in Hz and ms. Correction to the harvest: that table is tagged `[P]` and says "illustrative, not measured; tune by ear against the game's own references," so it ships as a starting reference, not a floor. sec 9.2 names the failure: "every normal hit sounds like a crit, nothing left to escalate to."

### 17. Make Vic's battery a live parameter and protect it in the mix. MEDIUM HIGH. Size S.
`audio/audio-implementation-event-systems/report.md:314` (SOURCED, verified) gives the exact analog: "**health  to  heartbeat / intensity / EQ:** low health drives a heartbeat loop's rate and a" filter. One parameter from 0 to 1. Then tag it and every threat tell into the protected class per `ux-accessibility/audio-mix-accessibility/report.md:338` (SOURCED, verified): "Build a metadata class for cues that must remain audible under dialogue clarity: threat tells, objective alarms," and `:478`, immediate threat must "Remain detectable under music/effects/dialogue/voice chat and every output profile; true-mono safe." Without the tag, a night mode or a dialogue duck silently deletes Vic's only resource readout.

### 18. Make the recovery from a fall payable, and bank what the night earned. MEDIUM HIGH. Size S.
`genres/dungeon-crawler/report.md:402-406` (SOURCED, verified) prices every recovery it models: "town resurrection at a cost (money, a chance of failure, a permanent stat loss), a **corpse-retrieval** mechanic (your bodies stay where they fell; a new party can recover them), or a **warp-home consumable**," aiming at "meaningful loss, not rage-quit." The current walk back is a timer with no player action. Corpse retrieval is the one importable mechanic, and it reuses the hand placed per act find that already exists (`COMBAT_ARCHITECTURE.md:486` `[spec]`). Separately, `game-systems/shattered-pixel-dungeon-experience-ledger/report.md:179` (SOURCED, verified) names the death screen's contents and adds that "a badge may be earned even in a losing attempt," so a fall must still bank its tin.

### 19. Write a session length target. MEDIUM HIGH. Size S.
See headline 12. Write 25 to 35 minutes, inside the report's own 20 to 40 band, and tune room length against it.

### 20. Give each of the six families one thing it may never do. MEDIUM. Size S, authoring only.
`genres/ccg-tcg/report.md:351` (SOURCED, verified): "the denial is as load-bearing as the grant, because it's what keeps two-colour and three-colour decks feeling different from each other instead of converging on one optimal pile of the best cards." Six written lines, no code. Cheapest item on this list.

### 21. Draw late picks from a separate build around tier. MEDIUM. Size M.
`genres/ccg-tcg/report.md` sec 3a point 6 (the power tier ladder is also a teaching ladder, SOURCED per reader) and `genres/looter-shooter/report.md:303-304, :315` (SOURCED per reader, verified by the loop auditor): "Pure number-chase plateaus; perk/build chase sustains." Raise build around weight hard past ledger count 16, which is also the Certain boundary, so the pool shift and the sight shift are one beat.

### 22. Give Certain a payoff. MEDIUM. Size M.
`COMBAT_ARCHITECTURE.md:651-655` `[spec]` (verified) gives Light the roster read and the crossing route. Certain gets neither. `game-design/core-loop-and-progression-structure/report.md:330` (SOURCED, verified) names the failure, "Over-systemed, under-looped... every system must feed a loop the player actually runs; cut or fold in dangling systems." One payoff the woods give only to someone who stopped looking, cheap, non informational.

### 23. Build the run end and return screens. MEDIUM. Size M.
`game-design/game-flow-endings-recipes/report.md` sec 3.1 and sec 3.2 (SOURCED per reader, verified by the loop auditor at `:199, :232, :516`): roguelite action wants a true fail state, no lives, a primary action targeted under 5 seconds back into play, and a named field list. Fields for this game: nights survived, cause of death, act and room reached, tin banked, conviction reached, lifetime falls. Primary action "Send the next scout." Its missing twin is a RETURN screen that states plainly what carried over unchanged.

### 24. Guarantee reactivity for Brock and Roz inside the existing line budget. MEDIUM. Size S to spec.
`COMBAT_ARCHITECTURE.md:939` `[spec]` (verified) rules "Nothing else speaks," on an 18 line budget. `narrative/companion-npc-writing/report.md:391` (SOURCED, verified): "Guarantee tier-1 (major-beat) reactivity for every companion, always," and `:524`, "Make reactivity tier 1 non-negotiable." Brock and Roz are this game's only companion shaped figures. Priced honestly under full voice acting: state keying the return line and the Reading line at three variants each is roughly four to six extra clips per speaker, not free, and the frozen string lint at `COMBAT_ARCHITECTURE.md:947-951` `[spec]` has to cover every variant key.

### 25. Concentrate the camp voice budget. MEDIUM. Size S to decide.
See headline 14. Lead cast of six to eight at 8 to 15 authored lines each, hub figures at double or triple, and the remaining twelve to fourteen survivors on a shared class level pool with light per speaker variation (`living-world-dialogue/everyday-npc-dialogue-social-texture/report.md:288-295`, SOURCED, verified by the narrative auditor).

### 26. Write Mikey's character sheet before any of her lines. MEDIUM. Size S.
`PREMISE_2.md:50-61` `[spec]` (verified) gives her Name, Age, Was, Tool, play identity, a candidate stake and the pink hair note, and no fear register. No bark pool can be authored from that. `narrative/character-writing-arcs/report.md` sec 11.3 (SOURCED per reader) holds the anchor template.

### 27. Keep the tin stamp a world object and keep combat readouts plain. MEDIUM. Size S, a decision.
`read:narrative-world` proposed routing the sight band and ledger HUD through the tin stamp. Its own citation says the opposite: `narrative/diegetic-ui-as-narrative/report.md:106` (SOURCED, verified) for top down and isometric perspectives, "signage/set dressing carries more narrative weight than UI-as-narrative (embodiment is weaker); invest in environmental text and object arrangement over interface framing." It also cuts against wave 1's item 15, which wants the thermos marks in their own slot for legibility. Keep the stamp as a world object and a between runs screen.

### 28. Pause registers only in the play scene. MEDIUM. Size S.
`ux-accessibility/pause-action-scope-addendum/report.md` sec 2 (SOURCED per reader): the pause action "fires only when the play scene has input focus. Every other screen... binds the same physical input... to that screen's own back/close action, never to pause," and "no screen outside the play scene may register an independent pause handler." sec 3: a settings screen opened from pause backs out to the pause menu, not to gameplay. This is the verbatim rule wave 1's change 24 needed and could not cite. Note the same report does not decide what freezes; that is a separate ruling (open call 121).

### 29. Build one focus and activate model for the draft, the door sign and the reroll and lock buttons. MEDIUM. Size M.
`ux-accessibility/input-remapping-alternative-inputs/report.md` sec 3.1 (SOURCED per reader): full remapping "includes hidden edges: menu tabs, map zoom, photo mode, minigames... confirmation dialogs." sec 4.3 and sec 5.3 require "a device-neutral focus/activate model... that any input (or the OS's scanning layer) can drive." Wave 1 named this as blocked on an unread report; the report is now read and the answer is one navigation model, built once.

### 30. Tag every HUD element with a stable id and a priority before art lock. MEDIUM. Size S.
`ux-accessibility/ui-scaling-visual-customization/report.md` sec 2.2 (SOURCED per reader): every element needs a "stable semantic ID" and a "task priority field" with the vocabulary critical, contextual, optional, decorative, because "a common and damaging error is leaving priority implicit, so that 'hide the HUD' treats a critical damage indicator and a decorative frame flourish identically." This is wave 1's change 26, previously carried unverified, now sourced.

### 31. Reserve a top draw layer and shrink juice as enemy count rises. MEDIUM. Size M.
`visual/visual-readability-clarity-game-feel/report.md` sec 10.4 (SOURCED, verified by the audio auditor): the hazard layer renders at the top of draw order "regardless of what particle/flash chaos is happening beneath it... this layer gets essentially NONE of the juice budget." sec 6 point 7 and sec 10.1: flash duration and particle count, size and lifetime scale down as simultaneous event count rises, because overlapping flashes "can, for a brief but real window, erase the crowd's silhouette information entirely." Hollis's fire and Vic's beam are the exact case.

### 32. Do not add screen shake. CONFIRMATION, not a change. Size zero.
`visual/visual-readability-clarity-game-feel/report.md:525` (SOURCED, verified): for roguelite action "screen shake is nearly forbidden past the earliest, calmest moments of the game." The absence of a shake system in canon is correct. If any is ever added, sec 9.4's shake stack cap applies: clamp the summed offset or take the largest active shake, never sum.

### 33. Hybrid audio, not pure procedural, for the signature set. MEDIUM. Size M.
`audio/procedural-synthesized-audio/report.md` sec 11.2 at `:852` (SOURCED, verified): "proceduralize the *numerous, repeated* events (hits, deaths, ambient tension); keep the *rare, defining* events as hand-authored samples," because over proceduralizing would blur the memorable moments into the same texture as everything else. This is not the art technique verdict transplanted: `audio/sound-design-fundamentals/report.md:364-365` (SOURCED per auditor) says pure synthesis "tends to read as clean and controlled, which is exactly wrong for anything that needs to feel physical, dangerous, or alive." Roughly ten to twenty signature sounds hand built, everything else stays code generated.

### 34. Split the save state and version it from save one. MEDIUM. Size M.
`engine-tech/save-systems-serialization-versioning/report.md` sec 1.1 (SOURCED per reader): serializing the runtime object graph directly is "the single most expensive mistake a save system can make"; sec 3.1: every save needs a version tag "even before there is any migration logic to run"; sec 5.2: content IDs must be "explicit strings or stable GUIDs... never derived from list position." Repo: `js/meta.js:25` defaults the selected character to a hard coded id, `:44` coerces unknown ids back to it, and `:54` force injects two dead ids into the unlocked list, guarded by `if (this.runs > 0 && this.unlocked.length === 0)` `[code]`. That is the enum and ID remap anti pattern by name. Note the correction: `read:engine-web` overstated the guard as "any save with runs>0."

### 35. Decide, in writing, whether a night can be suspended and resumed. MEDIUM. Size S to decide.
`qa-testing/save-load-persistence-state-testing/report.md:71` (SOURCED per auditor), `genre = card-deckbuilder / roguelite-runs`: mid run save state including "**RNG stream position**" must resume "byte-for-byte identical to how it would have played uninterrupted," and any drift is "a **blocker-severity bug**." If the answer is yes, the determinism work acquires a hard requirement. Nobody in either wave was assigned this report; the determinism auditor read it unassigned.

### 36. Start the save fixture archive and turn on error tracking now. MEDIUM. Size S each.
`qa-testing/regression-smoke-sanity-testing/report.md:64-65` (SOURCED, verified by the determinism auditor): treat "does a save from three builds ago still load" as a standing regression case, and build the roguelite suite around seeded replayable runs because "seed N produces the same run shape" is a stable automatable oracle. `qa-testing/crash-error-reporting-telemetry/report.md`, `platform = web` row (SOURCED per reader): lean on non fatal JS exception telemetry rather than native crash dumps, and the roguelite row: "attach the seed and run-state to every crash report by default."

### 37. Two CI jobs, in order. MEDIUM. Size M.
Run twice compare on the same build, continuously, because determinism is "actively, continuously at risk from any single change" (`qa-testing/determinism-replay-testing/report.md:190`, SOURCED per auditor). Then a headless economy bot walking the room clear and ledger loop against the worked table at `COMBAT_ARCHITECTURE.md:161-167` `[spec]` (verified) with instrumented invariants, because "only the crash oracle is close to free" (`qa-testing/automated-playtesting-test-bots/report.md:184`, SOURCED, verified) and "infrastructure precedes bot sophistication" (`:239`, verified).

### 38. Commission the trademark opinion and add a re check clause. MEDIUM. Size S.
`business-legal/ip-asset-licensing-for-shipping/report.md` sec 7.2 (SOURCED per reader): clearance runs "**Before committing to a name or logo**, before it appears on a store page, in marketing material, or in a public announcement," and sec 7.3 adds what neither harvest carried: "**Re-run the clearance check before major rebrands or before a sequel reuses the name/logo**." Repo: `PREMISE_2.md:13` `[spec]`, "The trademark opinion stays open as a pre-store-page item."

### 39. Build one voice contractor template before the first session. MEDIUM. Size S.
`business-legal/basic-contracts-for-solo-small-teams/report.md` sec 2.1 (SOURCED per reader): "Paying a freelance contractor for their work does not, by itself, transfer ownership," and sec 2.3: use both a work for hire label and a present tense assignment clause, because "Relying on the work-for-hire label alone, without the assignment clause as backup, is a common and specifically risky mistake." A clip manifest already exists at `tools/voice/lines.json` (referenced `PREMISE_2.md:1446` `[spec]`), so the rights chain on anything already recorded needs checking too.

### 40. Start the ratings content log from risks the repo already recorded. MEDIUM. Size S.
`PREMISE_2.md:1813-1814` `[spec]` already flags that "spotlighting deer is a wildlife crime, and a 16-year-old girl running a trapline is a reputationally loaded hobby on a store page." Junior's trapline is `PREMISE_2.md:189` `[spec]` and Vic's jacklight `:191` and `:594` `[spec]`, and each IS that character's only weapon all run. `business-legal/platform-storefront-tos-distribution-agreements/report.md` sec 6.4 (SOURCED per reader): an inaccurate ratings submission is "a breach in its own right, independent of the ratings board's own consequences."

### 41. Write the discount policy before launch. LOW MEDIUM. Size S.
`monetization/sales-discounts-bundles/report.md` sec 2.5 (SOURCED per reader): "the single most common way teams fail this section is not choosing badly once, it is **never choosing at all**." Its sec 2.4 ladder is explicitly illustrative. The genre row at `:82`: tie sales to run content updates rather than dates, because "the 'wait for the next sale' risk is acute in a genre with strong word-of-mouth-driven late adoption."

### 42. Resolve the pricing row conflict explicitly rather than averaging it. LOW MEDIUM. Size M.
`monetization/pricing-strategy-price-points/report.md` Design Inputs preamble (SOURCED per reader): "A conflict between rows is a design question to resolve, not permission to average them away." The roguelite row wants "a modest, honest price point"; the solo and small indie row, tagged `[E]`, says "do not let competitive anchoring push a price below what the real production cost requires." Full human voice acting pushes the floor up while the genre pushes the number down. Write the resolution as a sentence.

### 43. Run the capacity check before the next scope lock. LOW MEDIUM. Size S.
`process/solo-dev-workload-burnout-management/report.md` sec 12.1 (SOURCED per reader): nominal available hours times a realism discount of 0.5 to 0.7, because "first estimate is usually optimistic by 30-50%," re run quarterly, and sec 15: "Schedule against the realistically discounted hours estimate... not the optimistic nominal."

### 44. Fold the escalating walk back into the opt in rung. CONFIRMED, already struck by wave 1. Size S.
Third citation: `genres/tactical-rpg-srpg/report.md:1275` (SOURCED, verified), permadeath "is an emotional/design mechanic first, a difficulty knob second." Fourth: `genres/dungeon-crawler/report.md` sec 5 failure row "Permadeath = rage-quit," root cause "perma-loss with **no recovery path**." Flat two nights stands; the harsher version belongs on the opt in ladder.

---

## THE FOUR HARDEST PROBLEMS

Four things this project has been unable to solve. Wave 2 was pointed at all four. Honest verdicts.

### 1. The sight cost: getting stronger gives the player less information.

**Verdict: the library does not model this. The creator is inventing without precedent. Wave 2 did not solve it, but it did build a cited fence around it.**

Three independent readers went looking and all three came back empty. `read:offering-scarcity`: "No report in my set contains a mechanic where acquiring power reduces what the player can perceive." `read:cognitive-attention` went further and explained why, which is the single most useful finding on this surface: every teaching method in its five reports assumes signification gets quieter as mastery grows because the player has built durable chunks (`ux-accessibility/cognitive-load-player-attention/report.md` sec 2.3 and sec 5.3, `ux-accessibility/affordances-signifiers-signposting/report.md` sec 3.4, SOURCED per reader). Sight does the reverse on purpose: it un teaches a mastered player. No report in this library models deliberately reversing chunking. The loop auditor put the count on it: unprecedented in all twenty one reports read across both waves on that surface.

What wave 2 did produce is a fence, and it is entirely cited:
* Sight may never touch the vitals cluster (`top-down-action-adventure-systems-floor/report.md:143`, verified).
* Sight may never touch an active enemy telegraph, because telegraph legibility must scale up with punishment exactly where sight currently scales down (`visual/animation-principles-games/report.md:804`, verified; `COMBAT_ARCHITECTURE.md:725-729` and `:416-422` `[spec]`, verified).
* Sight may never touch anything at Tier 1 salience (`cognitive-load-player-attention/report.md` sec 6.1, verified).
* Sight may never take away the ability to recover the task after an interruption, which `ux-accessibility/cognitive-accessibility/report.md` sec 3 (SOURCED per reader) calls "simply a locked door" for a player with memory or attention differences.
* Whatever sight does take must have a visible traceable cause on the player's own body or kit, because `narrative/mechanics-as-metaphor/report.md` sec 6 (SOURCED, verified by the audio auditor) requires that "The player must notice the cost/constraint/irreversibility, not just experience it passively."

And one prediction, which is the most valuable warning in this wave: `affordances-signifiers-signposting/report.md` sec 7.4 (SOURCED per reader) says a single betrayal by a signifier collapses trust in every signifier, "because the player has no way to know the betrayal was a one-off." A system whose premise is that the game will progressively stop telling you things is the single system in this design most exposed to that collapse. Buildable, but only with the two channel split (world sight degrades, combat sight never does) held without a single exception.

### 2. The roster bench: a character who dies and sits out while you play someone else.

**Verdict: the library does not model this either. Every component of a fix is sourced; the shape itself is not.**

`read:bench-gap` read the five nearest reports and the finding is precise. `genres/dungeon-crawler/report.md` sec 3c models permadeath, wipes, costed resurrection, corpse retrieval, warp home and lineage: every recovery restores the character now at a price, or replaces them permanently, and none sits them out. `genres/tactical-rpg-srpg/report.md` sec 3f models four things only, permadeath, casual and classic toggles, structural permadeath in runs, and knockout but revivable, and its comparison matrix at sec 6.1 runs the wrong way: Final Fantasy Tactics is "KO to crystal (lose unit if not revived in time)," Tactics Ogre "yes (revive window)." Those are countdowns to permanent loss, the exact inverse of a countdown to return. `genres/jrpg/report.md` sec 3e has a bench, but it is a voluntary party swap and its only modelled failure is the benched going stale. `genres/crpg-western-rpg/report.md` sec 3g's only bench is "bench the objector," a roleplay action. `game-systems/shattered-pixel-dungeon-experience-ledger/report.md` sec 6 has no roster continuity at all. An involuntary, timed, recoverable absence with the character returning intact has no precedent in any of them.

What is sourced, and it is enough to build with:
* Recovery must be payable, not only waited out (`dungeon-crawler:402-406`, verified).
* A fall must still bank (`shattered-pixel-dungeon:179`, verified).
* The absent must be present at camp, because relationship is the only retention lever the library offers for a character you cannot use (`jrpg` sec 3e at `:548-550`, SOURCED per reader).
* Catch up belongs on the return, not on the bench, because in this game it is the player's hands that go stale, not the character's numbers (transposed from `jrpg` sec 5 at `:692`, SOURCED per reader, and labelled a transposition by its own reader).
* The bench must bind or be admitted to be flavour (`tactical-rpg-srpg:513`, verified: permadeath makes the roster "a **managed resource, not an infinite bench**"). At five unlocked and a flat two nights, three survivors are always sendable, so today it is flavour.
* Lineage, the library's only model for carrying anything across a lost character, is forbidden here by the one tool per person ruling: nobody can inherit the bar (`dungeon-crawler:407-409`, verified). So this game takes grief without continuity and owes the player continuity at camp instead.

### 3. The unmechanised Signing: the premise says progression IS the horror, but the mechanics only narrate it.

**Verdict: partly solved, and this is the one hard problem the library does own.**

Two reports govern it and both were read this wave. `narrative/ludonarrative-harmony-dissonance/report.md` sec 4 (SOURCED per reader) sets the bar as Rung 3 of its meaning ladder with a generative test: "would a player who never read a line of text still arrive at the theme through play alone?" `narrative/mechanics-as-metaphor/report.md` sec 6 (SOURCED, verified) sets the legibility requirement: the player must notice the cost, not merely experience it, and must be able to trace why the mechanic feels the way it does. Measured against those two, the current design fails for a nameable reason, not a vague one: there is no per tick tell, and there is no visible cause. Nothing on screen connects "I trusted my gear" to "the woods showed me less," so the theme is currently carried by text about the mechanic rather than by the mechanic.

Three concrete things closed part of this gap:
* The Layer 0 tell on every conviction tick (`embedded-found-narrative:385-409`, verified) makes the spend noticed.
* A visible cause on the character's own body or kit, taught once cleanly before it ever competes with combat (`affordances-signifiers-signposting` sec 3.2 and sec 7.5, SOURCED per reader), makes it traceable.
* `read:narrative-branch` produced the only proposal in either wave where the player actually performs a Signing rather than being told they are running one: a person found alive in the woods, with HELP, WALK ON, and SIGN THEM as three options, the third applying the belief mechanic to a person for an immediate ledger pick at a sight cost. That is value against value per `narrative/choice-consequence-design/report.md` sec 8 (SOURCED per reader, "Value vs. value, not good vs. evil... Costs on both sides, always"), and it computes the premise inside a moment of play. It is also a new feature nobody asked for, so it is an open call, not a change.

What remains genuinely open: whether the horror survives being legible. No report answers that, and `read:cognitive-attention` names the deepest version of the problem, which is that the whole library assumes players can learn to read a system, while this one is designed to be invisible to the person inside it.

### 4. The offering problem: 26 picks from 96 with no scarcity, so taking everything is correct.

**Verdict: solved. This is the clearest win of the wave, and wave 2 also found a defect in wave 1's own fix.**

The diagnosis moved one level deeper than wave 1's. Wave 1 said skipping pays nothing. Wave 2 says the real fault is that all 96 items cost the same, so the best of three is always the biggest number, which is `genres/ccg-tcg/report.md:287`'s named failure, strictly better cards "collapse a cost slot to one obvious choice." Three cited fixes, in order of importance:

1. Price the items differently: a drawback, a reduced magnitude, or a raised sight cost, one of the three, always (`ccg-tcg:294`, verified).
2. Put capacity below the pick count so every yes costs a future yes (`ccg-tcg:392`, verified). Wave 1's counter argument does not survive arithmetic.
3. Deny each family one thing, so the six families diverge instead of converging (`ccg-tcg:351`, verified).

Plus a late tier so picks 18 to 26 change a verb rather than a number (`looter-shooter` sec 3e, SOURCED per reader), and the strike of the percentage payout (`idle-incremental:297`, verified). Two things remain unsourced on this surface and both are named honestly: no report in either wave costs a decision made in real time with enemies alive, and the skip rate target lives in `genres/deckbuilder`, which wave 1 read and wave 2 did not re open.

---

## THE FIVE SURFACES

Each audit's design section, in full.

### SURFACE 1. The core loop, the bench, and the offering

**The price axis.** Split 96 items three ways: roughly 32 plain (shared sight tick only), roughly 32 drawback bearing (slower wind, shorter beam, torch burns hotter and shorter, fewer recoverable bearings) at the same tick, roughly 32 build around at a **double** tick. Each item schema gains `drawback_id` and `sight_cost` (1 or 2). Three offers then compare on two axes instead of one. Per `ccg-tcg:294`.

**Capacity.** `FAMILY_CAP = 4`. Capacity 24 against 25.5 picks. A filled family stops being offered; nothing is removed, so single acquisition is intact. Per `ccg-tcg:392`.

**Denials.** One authored line per family, six lines total. Reach never buys damage. Damage never shortens recovery. Per `ccg-tcg:351`.

**Late tier.** Build around weight rises hard past ledger count 16, which is the Certain boundary (`COMBAT_ARCHITECTURE.md:727` `[spec]`), so the pool shift and the sight shift are the same beat. Per `ccg-tcg` sec 3a ladder and `looter-shooter:315`.

**Refusal.** Door sign primary (`GROUNDING_AUDIT_1.md:287`). Flat stipend fallback, no percentage. Per `idle-incremental:297`.

**The act map.** One button, on demand, shows rooms cleared and rooms ahead in this act, plus the door sign for the current room's exits. Not persistent. Per `top-down floor:108, :124, :313`.

**The run end screen.** Trigger on death or dawn. Fields per `game-flow-endings-recipes:232, :516`: nights survived, cause of death (the last enemy or hazard id that fired damage), act and room reached, tin banked, conviction reached, lifetime falls. Primary action "Send the next scout," target under 5 seconds back into play (`:199`, `roguelite-action` row). Tin banks even on a fall (`shattered-pixel-dungeon:179`).

**The fall and the return.** Flat 2 nights (wave 1's change, confirmed). One retrievable object per fallen survivor, hand placed in the act where they fell, on a later night; carrying it home cuts the walk by exactly one night, floor of one night served. A handful of camp lines per survivor spoken while they are away. Return screen states plainly what carried over unchanged.

**Session target.** Write 25 to 35 minutes, inside the report's 20 to 40 `[P]` band, and tune room length against it.

**The night, charted as beats** (from `read:core-loop`, per `core-loop` sec 5 and sec 12.4):

```
[moment]    Send-off: pick survivor, pick one kit variant
[loop]      Room cycle: enter, clear, draft or walk on, door   (loops back)
[system]    Conviction (grows on every clear, never resets in-run)
[system]    Sight (falls as the ledger count rises)
[moment]    THE SIT (act interlude, silent, once per act)
[milestone] Act boss cleared            (CHAPTER-CLOSING)
[choice]    THE CROSSING: which entrance (Light only)
   ...acts 2 and 3 repeat, no crossing after act 3...
[milestone] Act 3 boss cleared, then True Dawn (terminal)
[moment]    THE ARRIVAL at camp
[system]    The Board (options only)
[milestone] The Reading (lifetime count spoken)
```

**Three save dictionaries, kept separate** (`journey-act-chapter-structure-recipes` sec 8.3, `game-flow-endings-recipes` sec 6.1 to sec 6.2): `acts_reached`, `runs_completed` plus `best_run_stats`, and `endings_seen`. Additive schema rung each, empty default on migration. Design these before the save migration test artifact is written, not after.

**True Dawn as an ending table, not one hardcoded scene** (`game-flow-endings-recipes` sec 4.1 to sec 4.2): ordered rows, first subset match wins, 1 to 3 macro flags per row, 2 to 5 rows plus a mandatory fallback, slides modular and keyed to one flag each. sec 4.4's lint: every flag the game accumulates must appear in at least one row, and an accumulated flag no row reads is "the single worst failure mode this section names."

**Credits and attract loop** (`game-flow-endings-recipes` sec 5 and sec 7): 30px per second, 30 second floor, any input skips, fade to calm over 1.5s; attract loop at 25s idle, motion only, never a full screen brightness cycle, ceilings of 3 Hz and 25 percent single frame coverage, which are the same ceilings wave 1 already centralised for the flash primitive.

### SURFACE 2. Narrative, voice and the unmechanised Signing

**Reveal architecture, three layers** (`embedded-found-narrative/report.md:385-409`). Layer 0, every player, fires on every conviction tick at `onRoomClear`: one non optional, non verbal tell that something was spent. Not a bar, not a line. Independent of sight band, so it survives the Certain band. Layer 1, on route: one staged vignette per room, self contained and re legible in one pass. Layer 2: a cross run codex assembling one line fragments, which is the guide already named at `PREMISE_2.md:1380`.

**Meta arc schedule.** Vic and Hollis on play produced milestones. Thread "why the dead come back": PLANT on the first walk back line, ESCALATE once on the second character's walk back, PAYOFF at True Dawn, with the knowledge flag boolean and monotonic. Brock's act 2 ask gated to fire only on a journey where Junior's disclosure has not been crossed (`reveal-setup-payoff-recipes/report.md:577`: "Never ship a `PAYOFF` binding without at least a `PLANT` binding earlier in the journey's topology").

**Camp voice, with numbers.** Lead cast of six to eight (the five playable plus Brock, Roz, one more) get full pools of 8 to 15 authored lines each, hub figures at double or triple that, and the remaining twelve to fourteen survivors share a class level common pool with light per speaker variation (`everyday-npc-dialogue-social-texture/report.md:288-295`). Author the non leads from the speech signal matrix at `voice-dialect-class-culture-signaling/report.md:344-400`, which is a fill two rows per cell grid across class, culture, occupation and age. Use the same artifact to give Mikey her anchor.

**Last night's outcome, three depths, three speakers** (`everyday-npc-dialogue-social-texture/report.md:245-249`): Level 1 ambient mood with no specifics, Level 2 a fragment with a name or shape, Level 3 the specific opinionated version from a hub figure. One fact ledger entry per night, retired each run.

**Bark budgeting by trigger frequency, not flat count** (`narrative/barks-ambient-dialogue/report.md:259` and the estimator at `:464`): RARE 1 to 3 variants, OCCASIONAL 4 to 7, FREQUENT 8 to 20 plus. Re cut the inherited nine category, 36 bark shape (`PREMISE_2.md:1643` `[spec]`) against a 27 room night before anything is rendered.

**A delivery plan table for the 18 frozen lines** (`narrative-design-vs-game-writing` sec 2's deliverable list, SOURCED per reader): the budget is entirely writing deliverables with no document naming which channel (bark, cutscene, environmental) each line uses.

### SURFACE 3. Audio, telegraphing and the sight cost

**A. The four layer contract**, adapted from the bullet hell stack at `visual-readability-clarity-game-feel` sec 10.4:
* L0 background: desaturated, static, zero attention budget. This and the optional sightings content are the only things SIGHT may touch.
* L1 enemies: outlined, type differentiated silhouettes; hit flash duration and burst count, size and lifetime scale **down** as simultaneous event count rises (sec 6 point 7, sec 10.2).
* L2 player VFX, including Hollis's fire and Vic's beam glow: reserved value band, contrast capped so it cannot compete upward.
* L3 SACRED: active enemy telegraphs, incoming hazards, and the player's own pip loss and padding break signal. Top of draw order unconditionally, floor contrast maintained in every sight band including CERTAIN, and per sec 10.4 "this layer gets essentially NONE of the juice budget."

**B. Hit grammar.** Six outcome families minimum (1, 2 and 3 pip, padding absorb, padding break, miss), separated on all four sec 2.3 levers. Pair a 2 to 4 frame hitstop with the flash on 2 and 3 damage only, using sec 7.5's 60fps timeline: contact at frame 0, flash held at full through frames 0 to 3, simulation resumes frame 4, flash fades after. sec 7.5: "the freeze doesn't just add weight, it is functionally a READABILITY AID."

**C. Vic.** One hum loop, one parameter `battery` 0 to 1, driving filter cutoff plus tremolo rate plus pitch on a curve. Tagged into the protected critical cue class. True mono fold verified explicitly, since the beam's whole job is pulling something toward you from off screen.

**D. Hollis.** `sound-design-fundamentals/report.md:1187` gives the bed recipe: "seamless loop point, subtle random variation layer so it's not obviously looping," plus a sparse random accent layer. The standing in fire damage tick is a separate event, never part of the bed.

**E. Room clear chain.** `audio-game-feel-juice` sec 11A.4: "a well-tuned rising pitch-step per pickup, capped at an octave with a satisfying 'topped out' tone change at the ceiling." Design it against the run total, not the room: `COMBAT_ARCHITECTURE.md:719-725` `[spec]` derives 25.50 cumulative picks, so roughly 26 steps per run.

**F. Voice IDs.** Adopt `<CHARACTER>_<CATEGORY>_<CONTEXT>_<NNN>` (`dialogue-systems-vo-pipeline` sec 3.2 pattern block). Drop `hash8` from the filename; move it to a manifest as `text_hash` plus a `status` field (draft, synth placeholder, recorded, QA passed).

**G. Dez's tail.** Author his swing tail under 400 ms so he can never enter the mush band, since his run end interval is 0.461s and `weapon-combat-audio` sec 3B.4 puts Medium at roughly 130 to 400 ms and Low above 500 ms.

### SURFACE 4. Determinism, engine, co-op and test discipline

**Determinism contract, written once, at core loop time.** Target level: same build, same platform (`deterministic-simulation` sec 2.2 tier 2). Cross platform bit exactness is explicitly out of scope and out of budget. Floating point stays; fixed point math is not built.

**The deterministic boundary.** Draw it explicitly (`deterministic-simulation` sec 6.5 at `:318`): inside are tool state, pip damage, padding charges, conviction, ledger draws, enemy AI, room generation. Outside are particles, camera shake, ambient audio, hit flash, and anything the beam or the torch draws. State placed inside "inherits every constraint... every piece placed on the cosmetic side is free of all of them." Cosmetic RNG may keep `Math.random`, which alone removes a large share of the 55 call sites from the retrofit.

**Loop.** Replace `js/ui.js:2129-2140` `[code]` with an accumulator: fixed sim ticks, render at whatever the animation frame gives (`deterministic-simulation` sec 6.2). The report's illustrative rate is 60 ticks per second and it says so explicitly; the library gives no authoritative tick number, so pick 60 and record it as a decision, not a citation.

**RNG.** One `RUN_SEED` per night (matches conviction resetting nightly, `COMBAT_ARCHITECTURE.md:30` `[spec]`), one named stream per subsystem so adding a call site in one subsystem cannot shift another's sequence. Extend the seam already at `js/pool.js:238` `[code]`.

**Iteration order.** Sort by stable entity id before any order sensitive pass; never iterate object key or hash order (`deterministic-simulation` sec 6.3 at `:310`). This is the trap that survives every other fix.

**Recording.** Input stream tagged by tick, seeds, build id (`determinism-replay-testing` sec 5.1). Checksum granularity: periodic full state every N ticks plus bisection, not an end of run summary (sec 3.3 at `:143`).

**CI, two jobs.** (a) Run twice compare on the same build, continuous. (b) A headless economy bot walking the room clear and ledger loop against `COMBAT_ARCHITECTURE.md:161-167` `[spec]`, with instrumented invariants (conviction bound, damage multiplier ceiling, family tally). Job (a) precedes job (b).

**Co-op v1.** Listen server, host authoritative, guest predicts only its own scout. No interest management, no delta or quantization pipeline, no lag compensation rewind, no cross player idempotency. Adopt a transport plus NAT traversal library with relay fallback as a required, tested path. Each player's lobby roster is drawn from their own save, so a survivor walking back on one player's file does not block the other player bringing their own copy.

**Save and reboot hygiene.** A migration step chain with a version tag from save one, an explicit ID remap table rather than a silent default, a retained fixture save archived per shipped build and loaded in CI, and a visible build id in game so a bug report can be tied to an exact build.

### SURFACE 5. Shipping: store, demo, ratings and contracts

**A. Platform and model ruling, one paragraph in PREMISE_2.** Name the primary storefront, name the free web build's status (retired, demo only, or permanent), and state that the pair does not fight its own norms (`storefronts-platform-economics/report.md` sec 7.2). Recommended shape: Steam primary, premium, and the free web build retired as a shipping surface and kept only as an internal build target, since a controller required game fits browser play badly and the web row's near zero built in discoverability makes it a cost, not a funnel.

**B. The demo, specified as content.** Build one demo, time boxed to festival windows and retired at launch (`storefronts-platform-economics` sec 2.3: treat "a demo, participation in a platform sales/discovery event, or a festival slot as wishlist-acquisition tools, not just marketing exposure"). Cut point: far enough for the SIGHT price to become visible at least once, because sec 3.1's value test is depth and replayability and because sec 11's worked scenario bars a free portion that reads as a frustration funnel. One character, not five, so the one tool forever commitment lands.

**C. Pricing record.** Assemble 8 to 15 genuinely substitutable current roguelite action titles (`pricing-strategy-price-points` sec 4.1, the number is the report's), record list price, realized price, review volume, discount history, edition structure. Compute the cost floor including voice acting. Write the row conflict resolution as a sentence, not a split the difference number. Every comparable verified at decision time; the report says stale numbers actively mislead.

**D. Store page as a workstream with four separate beats,** not one dump: announcement, gameplay reveal, demo release, release date reveal, each timed for wishlist velocity (`storefronts-platform-economics` sec 2.3). Tags accurate: roguelite action, horror adjacent, single player, controller (sec 4.3, mis tagged genres "reliably hurt recommendation match quality"). Captions commitment stated on the page.

**E. Discount guardrails, written now:** no discount through the trust window; shallow only through month 12; moderate at 12 to 24 months; deeper past 24 (`sales-discounts-bundles` sec 2.4, explicitly illustrative). Tie every event to a run content update. Deviation requires a documented decision (sec 2.5).

**F. Legal pack:** trademark opinion commissioned before any public beat; one voice contract template (scope, take count, format, payment plus kill fee, revision count, present tense assignment plus work for hire backstop, credit line) signed before each session; a running ratings content log seeded with violence, permadeath framing, fire, animal trapping and spotlighting, minors in peril, language.

**G. Capacity check before the next scope lock.** `solo-dev-workload-burnout-management` sec 12.1's arithmetic: nominal available hours times a realism discount of 0.5 to 0.7, re run quarterly.

---

## WHAT IS STILL UNGROUNDED

The plan for wave 3. 525 reports unread.

### Tier 1: a live decision is blocked on an unread report

**`audio/spatial-3d-audio`, `audio/ambience-soundscapes`, `audio/audio-emotion-psychoacoustics`, `audio/audio-accessibility`, `ux-accessibility/visualizing-audio-cues`.** Five reports, all unassigned this wave (the audio auditor opened only sec 7 of the first to close a gap). They own the compensating channel for the sight cost: if the woods show you less, sound must show you more, and the pre room roster read that Certain deletes is the exact thing a rougher audio version could carry. Wave 1 cited `visualizing-audio-cues` without opening it.

**`genres/deckbuilder`.** Read in wave 1, not re opened. Owns the skip rate target (roughly a quarter to a third of offers) that the whole refusal design is tuned against, and the combinatorial depth test that would answer whether 96 items across 6 families actually produce distinct builds.

**`qa-testing/multiplayer-desync-exploit-cheat-testing` and `qa-testing/network-testing-simulation`.** Unread in both waves. Own desync detection and latency and packet loss injection for the listen server model this wave just specified.

**`multiplayer/disconnection-reconnection-host-migration`.** Wave 1 cited `:70` and mined nothing further. Owns reconnect mid night, which is wave 1's change 13.

**`business-legal/indie-business-structure-tax-basics`.** The one business-legal report nobody read. Owns business entity, payee setup and tax forms, which are a hard precondition for any storefront payout.

**`monetization/monetization-kpis-analytics` and `monetization/subscription-game-pass-models`.** The first is cross referenced by name in `storefronts-platform-economics` sec 2.3 and owns wishlist and conversion definitions. The second owns catalog and subscription deals as an alternative to a free funnel, named as an option at `premium-buy-to-play/report.md:213`.

**`qa-testing/beta-early-access-community-testing`** was read, but its finding needs a decision, not more reading: sec 1.1 (SOURCED per reader) says closed alpha, closed beta, open beta, PTR and Early Access "are five distinct programs" and "conflating them is the single most common planning error," and sec 1.4 says "Early Access is not a test phase, it is a commercial release model."

### Tier 2: domains that own live open questions and are still mostly unread

**`narrative/` (17 left).** Specifically `narrative/horror-writing` and `narrative/theme-tone-voice` (the second was read by `read:cognitive-attention` but only for the sight mechanic, not for register), which `PREMISE_2.md` sec 9 already leans on for the eerie adult tone. Also `narrative/environmental-storytelling` names procedural authoring of staged tableaux at scale as its own unresolved open question, which matters because this game's rooms are procedurally assembled.

**`audio/` (18 left).** `audio/voice-acting-casting-direction` was read; `audio/adaptive-interactive-music`, `audio/music-tension-pacing`, `audio/audio-direction-sonic-identity`, `audio/dynamic-mixing-mastering` and `audio/audio-optimization` were read by one reader and are not exhausted. The genuine gap both audio readers found independently is browser and Web Audio budgets: no report in the domain names browser, Web Audio or HTML5 anywhere. That is a library gap with no owner, not a routing failure.

**`visual/` (41 left).** All six read reports were read partially. `visual/visual-accessibility` (colourblind and photosensitivity mechanics), `visual/ui-visual-design-hud` beyond sec 12.1, and `visual/camera-systems` sec 7 (the shake system) are all deferred to by reports read this wave. Top down telegraph craft specifically, meaning ground decal radius conventions and arena scale wind up staging, is unaddressed by every visual report read.

**`genres/` (49 left) and `game-systems/` (32 left).** Two gaps wave 1 named remain open after wave 2 read ten more: no report anywhere models a roster bench, and no report models a single weapon no slot character or an uncapped growth curve. Wave 2 adds a third: `NUMERIC-FLOORS-SPEC.md` sec 8.2 (SOURCED per reader) queues `roguelite-dungeon` and `top-down-action-adventure` behind four already proven classes, so **every timing number in `COMBAT_ARCHITECTURE.md` is in house and ungroundable today**. The three action ledgers read this wave publish zero frame level timing numbers: iframes, coyote time, buffers, respawn duration and stamina rates are all marked not documented.

**`qa-testing/` (20 left), `multiplayer/` (7 left), `source-code-analysis/` (50 left), `engine-tech/` (4 left).** The engine and browser stack is the sharpest remaining hole: no report in any domain read across both waves addresses browser storage eviction, Gamepad API polling reliability, animation frame timing guarantees, or desktop wrapper save locations. `qa-testing/compatibility-device-testing` is the nearest unread candidate.

### Tier 3: topics no report in either wave addresses at all

* Power that buys away information. Unprecedented in 202 reports. In house invention, and it must be labelled one wherever it appears in a design document.
* An involuntary timed recoverable roster absence. Same status.
* A roster where every member has a different verb, and what happens to the player's hands when a character is taken away. All five bench reports model roles inside one shared verb set.
* Co-op and the reveal: whose knowledge state fires a payoff when two players hold different ones. No report read resolves it.
* Co-op and divergent sight: two players standing in the same room disagreeing about what is in it.
* Real time offering: no report in either wave costs a decision made with enemies alive.
* The special button whose ability is derived from the item set. Wave 1 named it undesignable in plain words and wave 2 did not move it. See the note at the end of OPEN CALLS.
* Whether a synthesised stand in voice tier is defensible against human voice acting. No report in the audio or narrative domains models it either way.
* A worked case at 5 to 8 pips. Every weight, distinctness and telegraph principle in this wave had to be mapped onto pip counts by inference.

---

## OPEN CALLS

Every question from every audit and every reader, deduplicated and renumbered. Numbering continues from wave 1, which ended at 64, so no number means two things. Each call states the choice in ordinary words, what happens under each option, and the recommendation. Assume the reader has not read anything above.

### The offering, and what a night is

**65. When you turn down an offer, should the payment be the same small amount every time, or should it grow with how much money you have already saved?**
The plan from the last pass says a fixed amount plus a slice of what you already hold. The research on games built around growing numbers says a payout that scales while prices do not is the single named recipe for a game that solves itself: refuse everything early, buy late, win. A fixed amount stays predictable and cannot run away. Recommendation: fixed only. This is the most urgent item in this document.

**66. Should some gear carry a real downside, instead of every piece costing the same?**
Today all 96 pieces cost one identical sliver of eyesight, so the best of three offers is always just the biggest number. Giving a third of them a real drawback (slower swing, shorter beam, torch burns out faster) and a third a doubled eyesight price makes the three cards actually compete. The cost is a writing and tuning pass over the pool. Recommendation: yes, and this matters more than 65.

**67. Should you be able to carry fewer pieces than you are offered?**
You get about 26 offers and can hold 36, so accepting nearly everything is free. Lowering the ceiling to about 24 means every yes costs a future yes. Nothing is ever taken from you; offers simply stop in a category you have filled. Recommendation: yes, drop the per kind limit from six to four.

**68. Should the last third of the night's offers come from a separate, stranger set of gear?**
If one pool feeds every offer, your twenty fourth pick is as likely to be dull filler as your second. Reserving the build changing items for late makes the end of a night the most interesting part. The cost is authoring two tiers instead of one. Recommendation: yes.

**69. Should each of the six kinds of gear have one thing it is never allowed to do?**
Without a stated limit per kind, the six kinds blur and choosing between them stops meaning anything. Giving each a flat prohibition (this kind never increases damage, that kind never shortens recovery) makes two players' nights diverge for free. Six lines of writing, no code. Recommendation: yes. Cheapest change in this document.

**70. Should turning down an offer prove itself right immediately, or only at the two points in the night where your eyesight changes tier?**
At present a refusal in the last stretch is worth nothing you can see. If good eyesight paid something in every room (reading what waits behind a door, seeing which way the ground leads), every refusal proves itself right away. The cost is building a per room payoff instead of two. Recommendation: pay something every room, using the door sign already proposed.

**71. Should a survivor be able to change their gear between nights, back at camp?**
The rule that gear never leaves you holds inside a night and is what makes certainty feel permanent. If it also holds forever, players will never try an unfamiliar build, because a bad guess is stuck to them. Allowing a change at camp keeps the in night rule intact. Recommendation: allow it at camp only, never mid night.

**72. How long is one night meant to take?**
No number exists anywhere. The research's stated band for a shaped session is 20 to 40 minutes. Without a target, nobody can judge whether 27 rooms is right. Recommendation: write 25 to 35 minutes now and tune room length to it.

**73. Does the player ever get to look at a map of the night?**
The rulebook for this kind of game treats some way to see where you are as a basic requirement, met by all three of its reference games, and calls a game without one incomplete. Nothing in the design mentions a map anywhere. A permanent corner minimap is explicitly not what is wanted. Recommendation: an on demand map opened with a button, showing rooms cleared and rooms ahead in this act, sharing a screen with the door sign.

**74. Does the last third of the night give anything back, or only take?**
Early on you can read a room from the doorway and choose your route. Late you get nothing for it, and a system that stops paying anything is flagged in the research as a design smell. Recommendation: one payoff the woods give only to someone who stopped looking, cheap and not made of information.

**75. Is the last act meant to feel blind, and are we willing to write that down as a cost?**
The rule about not changing the rules on someone in the final stretch says the player should not lose a practised skill at the moment of highest pressure. That is exactly what happens here, on purpose. Options: keep it and state plainly in the design document that the last act is meant to feel blind, move the change one act earlier so there is time to adapt, or soften it so something still reads at the doorway. Recommendation: keep it, and write down that it is a cost. Hiding that it is a cost is the only real mistake available here.

**76. What pulls a player straight back in after a night ends?**
Right now dying takes your character away for two nights and hands you a different one, which reads as a penalty. The research says the moment you stop is the strongest place to make someone want to start again. Options: put the next scout's unspent kit choice and the number spoken at camp onto the death screen itself so the next night is already half chosen, or leave the death screen bare. Recommendation: the first. It costs one screen, not a system.

**77. Does the ending have variations, or exactly one?**
The final scene currently exists as one authored payoff. The research budgets two to five real endings for a game that wants them, each chosen by one to three things the save remembers, with the differences made of reusable pieces rather than separately authored scenes. Options: one fixed ending, or one ending with two or three lines that change based on what the player learned and who was standing at the end. Recommendation: the second, and there must always be a default so a save that learned nothing still gets a real ending rather than an error.

**78. Are you shipping credits?**
Nothing anywhere mentions them. The research treats a rushed or absent credits roll as a small letdown placed immediately after the biggest moment in the game. Recommendation: yes, roughly 30 to 45 seconds, skippable with any button.

**79. Should the title screen move when it is left alone?**
The research recommends a slow idle state after about 25 seconds of no input, made of gentle motion only, never anything that pulses or flashes the whole screen. Recommendation: build it, and put it under the same flash safety limits already planned for the game rather than treating it as a separate thing.

### Death, the bench and the roster

**80. When a survivor dies, should the player be able to find something of theirs in the woods on a later night and bring it home to get them back sooner?**
Right now a dead survivor is simply gone for a fixed two nights and nothing the player does changes that. The alternative places one small object of theirs (a notebook, a pouch, a battery) where they fell, findable on a later night, worth one night off the absence. It reuses a placed find slot that already exists. The research is unanimous that a death should cost something the player can pay, not only something they wait out. Recommendation: yes, capped at one night.

**81. While a survivor is away, should the other people at camp talk about them by name?**
Either the absence is a locked portrait, or the camp reacts: someone asks after them, someone will not sit in their spot. The first costs nothing. The second costs a handful of spoken lines per person and is the only method the research offers for keeping a player attached to a character they cannot currently play. Recommendation: yes, a small number of lines per survivor, reused across their absences.

**82. When a survivor comes back after missing nights, should their first night back be slightly gentler?**
They come back exactly as they were; the problem is that the player has spent several nights holding a completely different tool and has lost the feel of this one. Options: change nothing, or give a small head start on the first night back (the game already has a version of this). Doing nothing risks dying again immediately with the character you just got back, which doubles the punishment. Recommendation: give the head start, and say plainly on the return screen that it is a one night thing.

**83. Should some nights suit particular survivors better than others?**
Today almost any survivor can be sent on any night, so losing one changes who you are holding but not what the night is. If certain rooms favour a particular tool, losing a survivor genuinely changes the next few nights. The risk is that a player who loses the right person for tonight feels shut out. Recommendation: yes, but lightly, one favoured room class per act, never a hard requirement.

**84. Should a night that ends in death still bank what the player earned?**
Either the fall wipes the night, or the money collected up to that point still comes home and is read out at the fire. The comparable game in the research awards its milestone even on a losing attempt. Wiping the night makes a late death take two things at once. Recommendation: bank it, and print the number on the same screen that names who is walking home.

**85. Should the game ever be able to leave the player with only one survivor to choose from?**
With all five unlocked and absences fixed at two nights, at most two people are ever away, so the loss never actually restricts the player. Making absences bite harder restores that pressure but punishes the player who is already struggling. Recommendation: leave the normal game as it is, and put the harsher version on the opt in harder setting.

### Sight, health, and what is always visible

**86. Can the "you see less" price ever dim the health display?**
The rulebook for this kind of game says the health readout is always visible and never hideable, in all three of its reference games. With five to eight health points and hits worth one to three, a misread is a lost night that reads as a bug rather than as theme. Recommendation: rule this week that the price only ever touches the world, never health, armour or the drink.

**87. Should an enemy's attack warning always be drawn clearly, no matter how much the forest has stopped showing the player?**
As written, the fading sight system only hides optional wildlife and ground tracks, but nothing on paper says attack warnings are protected. Options: write the exemption, so warnings and damage flashes always draw on top at full contrast, which costs one rendering order rule; or leave it unstated and let it be decided by whoever builds it first. Recommendation: write the exemption.

**88. Should the pre room preview that fading sight takes away be replaced by something, or simply lost?**
The preview is real tactical information, not decoration, and it disappears exactly when enemies start hitting for 3 of your 5 to 8 health. Options: lose it as designed and accept that late rooms are entered blind; or lose the visual read but let sound carry a rougher version, so you hear the roster without seeing it, which fits the fiction that belief is sight and hearing is not belief. Recommendation: the second, and route it to the sound research nobody has opened yet.

**89. Should the player be able to see, on their own character, why their sight is fading?**
A visible cause (clouding at the edge of vision, a change in how the tool is held) lets players connect "I trust my gear more" to "I see less" and experience it as an idea. An invisible cause is eerier at first, but the research predicts most people will assume the game is broken, and worse, will stop trusting everything else the game shows them, including the parts still working. Recommendation: give it a visible cause, even a subtle one, and teach it cleanly the first time it happens.

**90. Should sight loss reset when a character dies and comes home?**
Resetting gives the mechanic a rhythm and stops it from only ever getting worse. Keeping it permanent tells a stronger long term story about a character drifting away from the world, but risks making a character you have invested in for a long time simply unplayable. Recommendation: reset on death, which matches the existing rule that a fallen survivor returns after a couple of nights.

**91. In two player co-op, should both players see the same amount of the world, or can one player's gear confidence dim the world only for them?**
Shared vision is simpler and stops one player accidentally hiding a threat from the other. Individual vision is truer to the idea that belief is personal, but two people looking at the same room and disagreeing about what is in it tends to feel broken rather than eerie. Nothing in the research answers this. Recommendation: keep vision shared in co-op, even at some cost to the idea.

**92. Should there be a setting that keeps the extra layer of the world visible for players who need it?**
For players with memory or attention difficulties, a world that progressively stops telling them things is a locked door rather than a mood. Recommendation: yes, and frame it as a character trait the player picks ("clear eyes") rather than a difficulty slider, so using it does not feel like admitting you are playing wrong.

### The secret, the story, the ending

**93. Should the game's core secret (that trusting your gear is what blinds you) be guaranteed to every player, or only found by exploring?**
Today it reaches players only through optional content that the same mechanic removes, which means the players who lean hardest into the intended way of playing see it least. Guaranteeing it means one small mandatory beat on every room clear, and costs a little mystery. Leaving it optional is purer horror and most people will never get it. Recommendation: guarantee it, and keep the found material as texture.

**94. Do Vic and Hollis still arrive after a fixed number of nights?**
Keeping the count is simplest and already written. Changing it to something the player did (first time reaching the third act, first survivor lost) costs a small amount of new condition code and makes their arrival read as caused rather than counted down to. The research states this rule flatly and without qualification. Recommendation: change it, keep the same rough timing.

**95. Is the final scene the ending?**
It already exists as an unbuilt scene gated on having seen every creature, and the game currently has no other big final moment. Making it the ending means the "why the dead come back" secret lands there and the twelfth name is the last thing the player reads. Not making it the ending leaves the game without a climax. Recommendation: make it the ending.

**96. Should the camp character's request in the second act be blocked until it can land honestly?**
One playable character secretly touched one of the tokens before the game starts. Much later a camp character asks her to bring him one, believing nobody has ever touched one. If the player knows the secret at that point, the scene reads as him either lying to her face or being oblivious, and nobody has written an excuse. Options: block the request from firing on a night where that character has already disclosed it, or accept that players will notice the seam. Recommendation: block it.

**97. Do the two adults at camp get to notice you?**
Right now they say the same lines forever, no matter how many survivors have fallen or what you have bought. Giving them a handful of variants is mostly a writing cost, but under full voice acting each variant is a real recorded clip and a new item the build has to check. Recommendation: yes, but capped at three variants on two lines that already exist rather than new lines.

**98. Do all twenty camp survivors get real dialogue?**
Full depth for twenty is hundreds of voiced lines. Depth for six to eight, with the rest sharing a pool, is what the research explicitly recommends and roughly a third of the cost. It also names spreading the budget evenly as the single most common way this kind of writing gets wasted. Recommendation: six to eight deep, the rest shared.

**99. Does Mikey get a full character sheet before anything of hers is written?**
She is the only one of the five without the fields the other four have (what she is afraid of, what she is wrong about, what she wants). Writing her lines first and back filling the character risks a voice assembled from nothing. Recommendation: write the sheet first.

**100. Does each of the five get a small personal arc, or is the story only in the world?**
A personal arc per character makes the late reveal feel individually earned; a world only approach is cheaper to write consistently across five people. Nothing in the research answers it directly. Recommendation: a light arc each, since it best fits the emotional target, but this is a judgement call.

**101. Does each survivor keep a running personal record of what they have witnessed?**
Building it now, even as a few simple pages with one owner, is cheap and stops later writing from contradicting itself. Skipping it is faster today and risks the story quietly drifting or repeating itself as more gets written. Recommendation: build the small version now.

**102. Should the on screen readouts look like real objects the kids would carry, or like clean game numbers?**
One reader proposed routing the sight count and item tallies through the tin stamp that already exists in the story. Its own source says the opposite for a game seen from above: spend on the world and its signage, not on making the interface look like an object. It also cuts against an earlier decision to give the drink its own clearly readable slot. Recommendation: keep the tin stamp as a real object in the world and on the between nights screen, and keep combat readouts plain and instantly readable.

**103. Should teaching at camp happen only through characters talking, or also in plain text for the two most serious rules?**
Character taught works well for ordinary repeatable things. It is not reliable on its own for anything a player could genuinely miss and regret, such as permanent death and the roster swap. Recommendation: characters teach the ordinary things; the two serious rules are said once by a character and also shown as text.

**104. How many ways should a camp character be able to say the same everyday thing before it repeats?**
Saying the identical line every time reads as fake quickly; unlimited unique lines are not affordable with full voice acting. Recommendation: three to five variations per common situation per key survivor.

**105. In co-op, if a camp character is warm with one player and cold with the other, should both players hear that difference at the same time?**
Two players hearing contradictory treatment of the same person in the same moment tends to feel broken rather than personal. Recommendation: keep shared camp moments identical for whoever is present, and save any "this person remembers you" touches for moments only one player is there for.

**106. Should there be a person found alive in the woods, who the player can help, walk past, or use the belief magic on?**
This is a new feature nobody asked for, proposed by one reader and worth a yes or no before anything else about it is decided. Helping costs something now and adds a person to the camp head count. Walking on costs nothing now. The third option applies the game's belief magic to a person for an immediate reward at a sight cost, which is the sharpest and most upsetting version of the game's whole idea, and the only proposal in either pass where the player actually performs the thing the premise says they are unknowingly doing. Recommendation: yes to the encounter, yes to all three options, with the third kept restrained rather than graphic.

**107. If that encounter exists, should walking away be completely free, or quietly cost something later?**
Completely free trains players to stop taking the choice seriously. A harsh punishment turns "no" into a trap nobody picks twice. Recommendation: a small, slow cost, never a jump scare.

**108. If that encounter exists, should the same people ever come back on a later night?**
Most being one time keeps the writing cost small. Two or three recurring ones give the "the game remembers" payoff the research says matters most. Recommendation: mostly one time, two or three recurring.

### Sound

**109. Should a broken armour charge get its own sound, or a re pitched version of the normal hit sound?**
A re pitched hit is cheaper and risks a player not noticing they lost their only buffer, which matters when a hit can land every 0.7 seconds. Recommendation: its own sound family.

**110. Should the flashlight's hum change continuously as the battery drains, and be marked as a sound the game is never allowed to quiet?**
Continuous change costs one parameter curve and lets that character's player track the battery without looking. Marking it protected stops a later "night mode" or a dialogue volume pass from silently deleting it. Recommendation: yes to both.

**111. Should voice line filenames stop being generated from the line's own wording, this week?**
Today every voice file is a placeholder, so the change is free. Once real actors have recorded, the same change is the most expensive retrofit in the whole pipeline, because the filename changes every time a word changes and the old recording is orphaned with no rename, no flag and no cross reference. Recommendation: fix now.

**112. Should roughly ten to twenty signature sounds be hand built while everything else stays code generated?**
All code generated keeps the pipeline simple and risks the boss roar, the armour break and each character's signature tool all sounding like everything else. Note this is not the same question as the art one: audio's own research treats the mixed approach as the professional default rather than a compromise. Recommendation: hand build the small set.

**113. Should the heavy character's swing sound be shortened now, before it becomes a problem?**
His swings get roughly twice as fast by the end of a night. If every swing plays a full length sound and they start firing faster than the sound finishes, the ending blurs instead of feeling powerful. Checking now is cheap; diagnosing it later inside a vague "the ending feels off" report is not. Recommendation: author his tail short enough that he can never enter that range.

**114. Should the game adopt a formal naming system for sound events now, while the list is small?**
Right now the code just calls a play function with a string. As voice lines grow toward the full acting goal and more cues get added, an informal system gets harder to audit, and the planned captions feature has to attach to something. Recommendation: now. It costs almost nothing at the current size.

**115. Should the music's rising tension use the same hidden power number the combat design already uses, or its own?**
Tying them means one thing to tune. Keeping them separate means more control and more bookkeeping. The research describes tying them as the natural low cost approach. Recommendation: tie them.

**116. Should one person be formally named as the owner of how the game sounds?**
Nobody holds this job today. The research is blunt that skipping it is the most common reason a game's audio ends up inconsistent even when every individual sound is good. This is a hat someone already on the project wears, not a hire. Recommendation: yes.

### Controls, the screen, and settings

**117. Should the item pick screen, the door choice and the reroll and keep buttons all work with just two inputs, one to move between choices and one to pick?**
Building it this way now is cheap and works for every controller, including limited and adaptive ones. Skipping it and adding it later means rebuilding those screens. Recommendation: yes, from the start.

**118. When the player pauses, should the flashlight battery and the spreading fire actually stop?**
Freezing everything is the safe, expected choice. Letting them keep running would raise the tension of pausing but risks feeling unfair. Nothing read settles it either way. Recommendation: freeze everything by default, and reconsider only if playtesting says the tone needs an unstoppable clock.

**119. Should the slingshot character's charge and aim be allowed one after the other, not only at the same time?**
Requiring both at once locks out a player who cannot operate a stick and hold a button simultaneously. Recommendation: add a lock aim option so the two can be done in sequence.

**120. Should a character winding up an attack show something building on their body, not just vibration in the controller?**
It is cheap to add to work already planned, and it is what teaches the timing to players who play with sound off or who do not feel subtle vibration. Recommendation: yes.

**121. Should hit effects automatically get smaller and shorter the more enemies are on screen?**
This is one formula, not hand tuning every fight. It also directly protects against the flashing pattern risk already flagged for two characters, since a crowd all flashing together is exactly the pattern that risk warns about. Recommendation: yes.

**122. Where should the "take less damage" setting live?**
The last pass put it on the screen that appears before the game starts. The reference game for precision play deliberately puts its equivalent inside the pause menu, so a player who is struggling does not have to quit and restart to get help. Recommendation: both places.

**123. Should the game show the player how many times they have died?**
The reference game keeps a running never resetting count but hides it behind an off by default setting, so most players never see it. This game already plans to keep a lifetime tally for the camp characters to speak. Recommendation: keep the tally, add an optional display, default off. The eerie tone never carries a permanent scoreboard.

**124. Should healing come from fighting well rather than from paying?**
Right now healing comes from a carried flask and from paying at a fire once per act. One reference game refills both healing and ammunition only through landing hits, so the cautious keep your distance style starves and the aggressive style sustains itself. That is the library's only worked example of making a very small health pool push a player forward. It also risks punishing the two characters whose tools are slow. Recommendation: keep the current model for now, and revisit only if playtests show players retreating rather than pressing.

**125. Should we pay to have the research library write proper numbers sections for the two kinds of game this actually is?**
The library has a strict format for recording real, sourced numbers (how long a run is, how much health a player starts with, how often rewards arrive) and has filled it in for four kinds of game. Neither kind this game belongs to is one of them, and both sit at the back of the queue. Consequence of not doing it: every timing number in this game stays an in house judgement call with nothing behind it, which is acceptable but must be stated out loud in the numbers document rather than implied to be grounded. Recommendation: commission the top down one first, because it already contains three real data points that would close a range immediately.

### Engine, testing and co-op

**126. Two friends playing together: connect straight to each other, or allow a small helper service that introduces the two computers and passes traffic through when their home routers refuse a direct link?**
Direct only: a real share of friend pairs simply cannot connect, and every pair that does connect shows each player the other's home IP address. With the helper: everyone can play, nobody's address is exposed on relayed connections, and it is a cheap piece of plumbing that never touches game logic. Recommendation: allow it, and restate the ruling as "no servers that run the game."

**127. Do we promise that a night plays back identically on a different computer, or only on the same one?**
Same computer only is the cheap achievable bar and catches essentially every internal bug. Promising the same result across different computers and browsers is, per the research, close to a full rewrite of the game's maths layer, and is the wrong spend for a two player co-op game with no competition in it. Recommendation: same computer, written down as a decision. This overturns a recommendation made elsewhere in this same pass.

**128. Can a player quit in the middle of a night and pick it up later?**
If yes, the game must freeze and restore its exact position in its random sequence, or a resumed night silently plays out differently from an uninterrupted one, which the research rates as the most severe class of bug. If no, quitting loses the night, which fits "death ends the night" and costs nothing to build. Recommendation: no mid night resume for now, and say so explicitly.

**129. Do the fixed clock and seeded randomness go in during the reboot, or after?**
During: it touches the same loop the tool rewrite is already opening, and everything after it (repeatable bug reports, automatic checking of the endless growth curve, co-op) becomes cheap. After: every system built in between has to be reopened, and the research calls that retrofit close to the most expensive version of this work. Recommendation: during.

**130. Do we build the graphics free overnight test of the growth curve before there is anything to play?**
Building it means the no ceiling growth maths gets checked automatically every time a number changes, and it is also the thing that runs the 30 nights the design already asks for. Not building it means someone has to remember to play a full night by hand after every tuning change, which will not happen. Recommendation: build it, right after 129 lands.

**131. Should old character progress saves from before the reboot load at all?**
The current save code already silently forces broken saves into a default state rather than telling anyone. Options: commit to always supporting old saves, which is ongoing bookkeeping every time save data changes shape; or declare a clean break at the reboot and only support saves from that point. Recommendation: the clean break, stated in writing, since pretending otherwise just recreates the current silent default bug under a new shape.

**132. Should we sketch a one page map of which systems touch which, before splitting the reboot across parallel work?**
A cheap map (which files the weapon system touches, which touch the save system) prevents two workstreams stepping on each other and catches "these two always break together" pairs that are not obvious from reading either file. Recommendation: yes, before parallel work starts.

**133. Should we start saving one real save file from every version of the build, starting today?**
Starting now means every future save format change gets tested against real old saves, and the three known save bugs get a fixture that proves they are fixed. Waiting means those bugs stay live with nothing testing them. Costs one file per release. Recommendation: start now.

**134. Should we turn on basic error tracking on the live web build now, instead of waiting?**
Turning it on now means we see real crashes and real save failures happening to real players, months early and cheaply, since a browser game needs no native crash infrastructure. Leaving it off means no visibility into what is already breaking for people already playing. Recommendation: turn it on.

**135. Should we deliberately test interrupted saves, full storage and dropped connections before shipping, even though nothing forces us to?**
Testing it ourselves finds the class of bug that console certification exists to catch, on our own schedule. The specific risk (an interrupted save write) is the exact bug already found once in this codebase. Recommendation: yes.

**136. Should we write down now who is allowed to pull back a bad update, and do one practice run of reverting the live build?**
Writing it down means the decision is made before anything breaks. Practising the revert means we find out calmly whether it works, while there is time to fix it. Recommendation: yes to both.

**137. In co-op, does each player choose from their own unlocked survivors, or only from the host's?**
A character belongs to whoever unlocked and cared for it. Each player's own progress deciding what they can bring is also the simpler data model. Recommendation: each player's own, with a separate rule that two players cannot pick the same character in one session.

**138. In co-op, does a room cleared together count fully for both players?**
Full credit to both is the only version simple enough to build without inventing new bookkeeping, and it matches how a solo clear already works. Splitting it would need a way to decide who did the work. Recommendation: full credit to both. This confirms the same recommendation made in the previous pass.

### Money, store and legal

**139. There is an old plan on file to give the game away free in a web browser and use that to push people toward buying the full game on a PC store. Do we keep it?**
Keeping it means running two versions forever, and the research is blunt that a browser release brings almost no built in audience, so all the traffic has to be bought or earned by hand on top of everything else. Dropping it means one paid version plus a demo that goes away after launch, which is how games at this price normally get found. It also matters that this game requires a controller, which browser players usually do not have plugged in. Recommendation: drop the free browser release as a public product and keep a demo instead. Note this reverses a decision already written into the project's own documents, so it needs a real ruling rather than a silent drift.

**140. If we make a demo, how far into the game should it go?**
A short slice is cheap but shows only basic fighting, and the thing that makes this game unusual (the more certain you are of your gear, the less the woods show you) never appears, so it undersells the price. A longer slice costs more to polish and spends more of the surprise. Recommendation: far enough that the sight cost visibly bites at least once, with one character rather than all five.

**141. Full human voice acting is expensive, and the research says that cost sets a floor under the price while also saying this kind of game does best at a modest price. Which wins?**
Pricing high to cover the voice work risks looking overpriced next to similar games. Pricing modestly risks not covering what was actually spent. The research forbids splitting the difference and says to resolve the conflict explicitly. Recommendation: decide the voice scope first (all five plus twenty camp characters, or leads only), then set the price, and write down which rule you followed and why.

**142. Is this launching on PC only, or is a console version planned later?**
This changes the store cut, how the game gets discovered, and what certification work exists at all. The research says platform and business model must be decided together, not separately. Recommendation: decide it alongside 139 and 141, in one paragraph.

**143. When the game reaches a paid store, should it launch as a finished game or as an early access game?**
A finished launch needs the content to already feel complete on day one. Early access lets it launch smaller and grow, but commits to a written, dated public roadmap and steady updates, and letting that promise go quiet is one of the most damaging things that can happen to a small game's reputation. The research also warns that leaving this label unnamed is the single most common planning error in this area. Recommendation: name it explicitly, either way, before the store page exists.

**144. Do we write the sale policy before launch, or decide when the first sale comes up?**
Writing it now protects launch buyers and stops discounts creeping deeper over time. Deciding later keeps flexibility, but the research names drifting with no policy as the most common failure. Recommendation: write it now: no discount during an initial trust window, shallow only in the first year, and every sale attached to a content update rather than a random date.

**145. Should the price be different in different countries?**
This is normal practice and considered fair when done honestly, but it needs periodic upkeep as currency values shift and a plan for people buying from a cheaper region to resell. Recommendation: yes in principle, revisit with real numbers once a base price exists.

**146. Do we pay for a real trademark opinion on the game's name now?**
The name passed a basic search, but our own notes already say three ordinary words make a weak trademark, and the research says the check belongs before the name appears anywhere public. Waiting saves a small cost now and risks a rename after marketing has been spent. Recommendation: commission it now, and add a standing rule to re check the name before any sequel or rebrand.

**147. Should every voice actor sign a contract before recording, even for a small part?**
Paying someone for voice work does not by itself mean we own the recording. Without a signed agreement, a sequel could need to re clear a favourite character's voice, and the original actor could say no or ask for more. Placeholder clips already exist in the project, so the ownership chain on anything already made needs checking too. Recommendation: yes, always, signed before the session, covering ownership, usage and credit.

**148. Do we start the ratings content list today?**
Two of the five characters are built on activities our own notes already flag as risky on a store page (spotlighting deer, running a trapline), plus fire, teenage characters and permanent death. Answering the official ratings questionnaire inaccurately later is treated as breaking the store contract, separately from anything the ratings board does. Recommendation: yes, start the list now, seeded with those items.

**149. Should someone formally check the plan against the written design documents on a schedule?**
There is a documented method for this and it costs time each time it runs. Not doing it risks quietly losing track of what was cut on purpose versus what just got missed. Recommendation: run a light version at each major planning turn, starting with this reboot.

**150. Is the pace we are planning realistic for one person?**
Research on solo developer burnout says first schedules are almost always too optimistic by a third to a half, and the gap usually gets closed by unpaid overtime rather than being caught. Recommendation: do an honest hours available check before locking the next block of scope, and redo it every few months.

### Questions that could not be made plain

Two things could not be written as a question a person can answer cold. Per the standing rule, that is recorded here as evidence about the design rather than hidden.

**A. The one special button whose ability is derived from your item set.** To ask about it plainly, the reader has to already hold three stacked derivations at once: which family is currently leading, what that family's shape maps to, and how the shape changes when the leading family changes mid night. Wave 1 named it undesignable in plain words and wave 2 did not move it. The document's own ship condition (`COMBAT_ARCHITECTURE.md:341-343` `[spec]`, verified) is an instrumented test across 30 nights with a median of three or more shape changes required, which is an admission that nobody can predict what the system does. Recommendation for the creator: treat "does this system survive at all" as the question, not "how should it work," and note that lowering the family cap to four (call 67) changes the answer, because a lower cap makes the leading family move more often, not less.

**B. Why the sight bands land where they do.** The three bands are derived from an expected pick count that depends on the boss payout being exactly 3, and the document says so: at the original payout of 2 the boundaries fall to 6.3 and 13.8 and the bands stop lining up with the acts (`COMBAT_ARCHITECTURE.md:719-736` `[spec]`, verified). One authored constant is holding two systems together. That cannot be asked as a plain question because the honest version is "are you comfortable that changing one reward number silently moves when the player goes blind," which is a warning, not a choice.

---

## COVERAGE LINE

Assigned: synthesise five surface audits and eighteen reader harvests into one document. I was assigned no reports as a primary reader. Opened and read this pass, at the cited passages, to verify rather than to harvest: `genres/ccg-tcg/report.md` (`:287, :294, :351, :392`), `genres/idle-incremental/report.md` (`:297, :725`), `genres/dungeon-crawler/report.md` (`:402-409`), `genres/tactical-rpg-srpg/report.md` (`:513, :1275`), `game-systems/top-down-action-adventure-systems-floor/report.md` (`:108, :124, :143`), `game-systems/shattered-pixel-dungeon-experience-ledger/report.md` (`:179-180`), `game-design/core-loop-and-progression-structure/report.md` (`:217, :276, :281, :330`), `narrative/embedded-found-narrative/report.md` (`:185, :385-392`), `narrative/story-structure-interactive-media/report.md` (`:363, :368, :370`), `multiplayer/multiplayer-framework-custom-engine/report.md` (`:83, :173, :192`), `multiplayer/deterministic-simulation/report.md` (`:80, :85, :87`), `audio/dialogue-systems-vo-pipeline/report.md` (`:339-341, :348`), `audio/procedural-synthesized-audio/report.md` (`:852`), `audio/audio-implementation-event-systems/report.md` (`:314` via auditor, section verified), `visual/animation-principles-games/report.md` (`:804`), `visual/visual-readability-clarity-game-feel/report.md` (`:77, :525`), `ux-accessibility/cognitive-load-player-attention/report.md` (`:272`), `monetization/premium-buy-to-play/report.md` (`:264`), `monetization/storefronts-platform-economics/report.md` (`:245`). Repo files opened: `docs/preproduction/GROUNDING_AUDIT_1.md` (full), `docs/preproduction/COMBAT_ARCHITECTURE.md` (at `:155-170, :336-345, :641-660, :705-736, :850-851, :939, :1000-1006`), `tools/voice/gen.py:319`, `tools/voice/README.md:138-140`. Domain report counts taken from the filesystem directly.

Twenty four citations spot checked by opening the source. Twenty four held. Two off by one line references corrected (`core-loop:275` is `:276`; Dez's run end is 0.461s, not 0.40s). One arithmetic error in wave 1's own text confirmed at `GROUNDING_AUDIT_1.md:293`. Nothing failed to open. Nothing was written or modified outside the scratchpad.

Claims relayed on a reader's word and not verified by me are labelled SOURCED per reader or SOURCED per auditor in the text above. The largest such block is the ux-accessibility set from `read:tier1-blocked` and the business-legal and process set from `read:business-process`; neither was re opened by me.
