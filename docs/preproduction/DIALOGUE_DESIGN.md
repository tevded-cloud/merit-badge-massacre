# DIALOGUE_DESIGN.md
merit-badge-massacre. Dated 2026-07-29. Evidence ruled: claims about the code carry file:line; claims from the research library carry the report path and section; guesses say so.

Companion file: LINE_BOOK.md (same directory). That file is the deliverable you approve. This file is why it says what it says.

## 1. The commissioning problem

The game's environment already speaks the target voice: the boss lines, the finds, the totem pool, the late arc beats. The three scouts and the mid-arc Brock beats were written earlier, in a gag-forward register the doctrine has since retired. The result: 111 scout lines hold a single comic note through low health, death, and every named boss. Fear never appears anywhere in the playable cast, and the wrong is never allowed to stay. This pass is a convergence job, not an invention job: pull the character layer up to the register the environment layer already speaks, without breaking a single save key, slot count, or rendered clip that does not have to break.

## 2. The diagnosis

Full text lives with the territory briefs; the load-bearing findings:

- THE SCOUTS ARE NEVER AFRAID (ranked failure 1). The controlled crack, the single most load-bearing horror-dialogue move, never happens (research/narrative/theme-tone-voice/report.md section 4; research/living-world-dialogue/voice-dialect-class-culture-signaling/report.md, Design-Inputs horror row). Every serious beat gets a joke (research/narrative/comedy-humor-in-games/report.md section 6 check 3) and the boss taunts are reassurance leaks (research/narrative/horror-writing/report.md section 7.2).
- The retired joke-chaser cadence survives in five mid-arc Brock closers plus Junie's marshmallow death line (ranked failure 2; STORY_DESIGN.md section 0).
- Doctrine violations needing surgery (ranked failure 3): intro[0] spends the Signing exposition in the first thirty seconds against the twoMarks regate (STORY_DESIGN.md sections 4-5); the died table is ungated against law 4 (js/dialogue.js:437-438); CRITTER.squeaks[4] carries the warm player-is-hope reading where doctrine assigns the squirrel the game's only statement of the witnessed-therefore-killed duality (js/dialogue.js:492; STORY_DESIGN.md:573).
- Junie reads eleven against the teen amendment (ART_STYLE.md amendment 2026-07-28); all three scouts are single-lever types: troop slogan, fire, food (voice-signaling report sections 1-2, the hide-the-name test).
- Info errors: Max's "Two hundred" on a kills>=100 trigger (js/game.js:1341-1344) and "half health" on a sub-30% trigger (js/game.js:1031); Gus's "Time for pancakes" dawn leak.
- Texture: chest[2] pool against a per-chest trigger, no idle escalation, thirty-years tic at catchphrase density, qm/Brock register overlap.

What already works and was ordered to survive: all 5 BOSSLINES and BOSS_EPITHETS verbatim (js/dialogue.js:79-85), the finds set near-wholesale, the totem and blink pools, the birdhouse ladder, NIGHT_CARVINGS, the frozen arc beats, dawn[2], died antlered/behind/mole, the qm intro, squeaks[0-3], and the per-scout keepers.

## 3. The writer contract (binding on all four seats, and on any future line work)

1. SLOT PRESERVATION. Runtime tables, per-slot counts, key sets, array lengths frozen: 37 slots per scout, Brock table shapes, qm 8, BOSSLINES/BOSS_EPITHETS 5 keys, CRITTER 5. Arc beat ids are append-only save keys (js/dialogue.js:179-181; js/meta.js:547, :706-707).
2. WORDING IS IDENTITY. Every changed line orphans one rendered clip and costs one synth; every unchanged line is free (tools/voice/gen.py:318-320, :392-399). Rewording a keeper is a defect twice.
3. RENDER RULES. Camp lines put every spoken word inside double quotes; barks are quoteless and spoken verbatim; {scout} is the only permitted token (tools/voice/dump_lines.cjs:60-107, :291-297); BOSSLINES stay lowercase; ALL CAPS only where TTS should stress the word; plain punctuation.
4. LENGTH BOUNDS. Combat slots (boss, lowhp) 2 to 8 words, one bubble of 2 wrapped lines at the 26-char wrap (js/render.js:725-759); bossnamed answers under roughly 12 words (js/director.js:646-649); camp lines one idea per line.
5. TONE REGISTER. Cute, then wrong, and the wrong stays. No line comforts or reduces uncertainty about outcome ("for now" permitted, "we're safe" never). Signing played straight in every mouth.
6. HUMOR RULES. All humor is a specific character coping with real stakes. A joke fires only after a beat lands, never closes a heavy beat; deaths, dawns, and named-boss beats are true peaks. No memes, no winking, no forced randomness.
7. THE CRACK BUDGET. Each scout's register breaks exactly at death and low health: shorter, imperfect, un-composed (research/narrative/dialogue-writing/report.md section 2; theme-tone-voice report section 4). Everywhere else it holds.
8. VOICES ARE MULTI-LEVER TEENAGERS. No small-child diction. At least three levers each; every rewritten set passes the three-ways test blind. Brock's thirty-years anchor: max three instances outside frozen keepers. Quartermaster routes through counting and stock.
9. INFO SURVIVES FLAVOR. Tells front-load; no spoken number contradicts its trigger; no build arithmetic or UI vocabulary in anyone's mouth (BUILD_ECONOMY_3.md 294-297).
10. NEVER SAID OUT LOUD. The threat's full rules, origin, or motive; the twelfth name before True Dawn; the setting by name; the treeline watcher; the firefly blackout; the flinch; tarp read three; why the survivors build; "Leave No Trace"; any [LIKELY] figure as fact; any invented younger-scout name.
11. OPEN QUESTIONS ARE WALLS. No bark scope beyond death and lowhp without the creator's answer on STORY_DESIGN.md section 12 Q3; no rank-vocabulary resolution; no item flavor names; no co-op acknowledgment anywhere (COOP_DESIGN.md section 1).
12. CODE GATES ARE NOT WRITER JOBS, FLAG THEM. See section 7.
13. STYLE. No em dashes or en dashes anywhere.

## 4. The four voice bibles

### MAX (seat 1)
The readable one, the control you learn the game on. Brock addresses him as squad leader (js/dialogue.js:101). A teenager who has decided that if he keeps giving orders, the night stays organized, and if the night stays organized, nobody gets Signed. The orders are his armor; the horror of his voice is what happens when the orders stop having anyone to land on.

Levers: (1) patrol fieldcraft used correctly: formation, spacing, mark, count off, eyes front, hold, cover (voice-signaling report section 5, occupation as the lowest-risk differentiator); (2) rhythm: imperative first, feelings never, two-beat declaratives, shorter under pressure (voice-signaling report section 1, the rhythm lever: a person under real pressure defaults to short sentences; citation corrected from section 4 by the craft skeptic); (3) noticing: positions, spacing, exits, who is where; he counts people, not kills; (4) refusals: never names fear, never reassures, fear comes out as instructions (research/narrative/dialogue-writing/report.md section 5).

Sanctioned quirk: troop commands issued whether or not anyone is there to take them. This quirk is HIS ALONE; no other scout may address people who are not there. Troop 13 slogan survives only inside the two frozen keepers (bossnamed antlered and behind); zero new instances. The crack: imperative structure fails, orders repeat, orders turn inward, a please leaks in; at death the sentences do not finish.

Touchstones: "Nobody gets Signed tonight. Not on my watch." / "It has a name. Do not learn it." / "Troop 13. Hold the line. That is an order and a request." / "Hold. HOLD." Near-miss controls (NOT him): "Just a scratch. A big scratch." / "Big ones fall the same way." / "It is fine. This is fine. Mostly fine."

Humor budget near zero: dry procedure delivered flat. Info discipline: tells lead, no number contradicts its trigger.

### JUNIE (seat 2)
Anchor: a teenager who loves fire because fire is the only thing in these woods that does what she tells it, and the love stays louder than the fear right up until it is not. Fast, fragile, compensating; the mania is a coping engine, not a child squealing at sparks.

Levers: (1) working firecraft used correctly: matches, strike, catch, tinder, dry, lit, out, smoke, cold; banned small-child diction (shiny, presents, bunnies, ooh); (2) rhythm: fast clipped bursts, doubled words, self-regulation out loud; excitement runs long, fear runs short (voice-signaling report section 1, rhythm lever and pressure-shortens-sentences; citation corrected from section 4 by the craft skeptic); (3) noticing: heat, light, dryness, smoke, the age of wood, whether a thing fears fire; wrongness reaches her as fire-logic failure; (4) refusals: never scared, never safe, never a request for help, never a pun on Signing.

The fear tell: Junie afraid is Junie by subtraction. Fire talk drops out or turns into failure, word count collapses, exclamation disappears. Her one refusal breaks exactly once: the please in death[2]. Humor: fire logic applied with a straight face to things fire logic should not cover; internal logic always (comedy report section 7, section 2.6).

Touchstones: "Ha ha ha ha. Okay. Focus." / "Cold... why is it cold..." / "No fire... no fire anywhere..." / "I bet I still... look cool..." / the mole and behind keepers. Near-miss controls: "Presents! For me!" / "Famous things burn great." / "They are all Signed and I am ALL fire."

### GUS (seat 3)
Anchor: the biggest kid in the troop, who talks the way he packs: nothing wasted, everything shared, and he puts his body between the danger and everyone else because that is the one thing he is sure he knows how to do.

Levers: (1) provisions as care, not gags: a food word is allowed only when doing survival or generosity work ("Someone... eat my rations..." is the template); (2) noticing: weight, size, space, ground; he reads a threat by the load it puts on the world; (3) rhythm: short declaratives, one idea per line, understatement, words spent like rations; (4) refusal as armor: negation is his defiance; (5) protective positioning: his body goes into sentences the way it goes into doorways. Note after the skeptic pass: positioning must be phrased through his own body ("It comes through me first"), never as commands to companions; orders addressed to nobody are Max's quirk, and a solo run has no one to stand behind him (COOP_DESIGN.md section 1).

Never says: fear by name ("I am not scared" appears exactly once, at death, as denial failing mid-line); safety; speculation about what the Signed want; little-kid diction. The crack at lowhp and death only: fragments, repeated self-instruction, the body failing the steadiness that defines him, the big kid feeling small at the end.

Touchstones: "Whatever it believes in, I believe in lunch." / "Someone... eat my rations..." / "Nope. I am facing this way now. Permanently." Near-miss controls: "Underwhelming so far." / "Nap time... forever, I guess..." / "Is there food in this one?"

### BROCK, THE QUARTERMASTER, THE FOUND-TEXT NARRATOR (seat 4)
Brock: deadpan older man, thirty years at this fire, every statement simultaneously true and deniable (STORY_DESIGN.md section 8). The game's licensed comic voice (comedy report sections 6 and 8). Levers: scoutmaster procedure lexicon; short declaratives stacked, then one long sentence when he circles something he will not say; he counts heads without saying so; refusals: the twelfth name, the threat's rules, any species the player has not written up (STORY_DESIGN.md section 7.2 law 4), and comfort. His care arrives as instruction. The controlled crack is spent exactly once in shipped text, dawn[2]; no new line may spend a second. A joke may sit mid-beat as coping, never close a heavy beat. Thirty-years anchor after this pass: exactly two instances outside frozen keepers (arc firstNight_1, dawn[0]), under the cap of three. Arc closer shape: re-anchor on the specific thing the gate counted, recontextualize, let the wrong stay standing. Near-miss controls: "Do not worry, the fire keeps them out." / "The Signing works like this." / any new "Thirty years I..." opener.

Quartermaster: one lead lever pushed hard, INVENTORY. Everything, including people, is stock, counts, copies, rates, shelf positions. Brock talks about the woods and never paperwork; the Quartermaster talks about paperwork and never the woods directly; the woods appear only as unexplained discrepancies in the inventory. He never speculates, never comforts, never says why a count is off. A number said twice is this character terrified.

Found-text narrator: close third voice describing evidence, never conclusions (research/narrative/show-dont-tell-in-games/report.md section 2.1). Three-line shape: the object plain, the one wrong detail, then dread left standing or (sign entries) the actionable tell. No third line restates what line 2 implied. Narrator-armor winks capped at the three that exist.

## 5. What was KEPT and why

Keeping is not laziness; it is the clip economy and the doctrine. Every kept line keeps its rendered clip for free (tools/voice/gen.py:392-399), and the diagnosis named a keep list whose rewording is a defect twice. Kept: the frozen scout keepers (Max runstart[3], boss[3], bossnamed antlered/mole/behind; Junie both cold death lines, "look cool", mole, behind, "Okay. Focus."; Gus rations, behind, "I believe in lunch"); Brock's totem and blink pools whole, the frozen arc beats, dawn[2], the three tell-carrying died lines; the qm intro and five of six idles; 71 of 72 find lines including all six standouts; all six carvings; squeaks[0-3]. Three Junie judgment keeps stand with reasons on record (revive[1], kills[0], her select line), and the skeptics verified kills[0] trigger-true against js/game.js:1341-1344. Gus chest[0] was returned to KEPT by the craft skeptic: the seat's trim burned a synth deleting an interjection the diagnosis never condemned for Gus.

Verification recorded by the tone skeptic so it is not re-run: slot integrity 6/6/6/2/2/2/5/2 plus 5 bossnamed plus 1 select per scout (37 each) against js/dialogue.js:9-65; Brock tables and 13x2 arc rows intact; qm at exactly 8; 24 finds x 3 at js/finds.js; 6 carvings; no keys added, removed, or reordered; all spot-checked KEPT lines verbatim against source including the rollbook OLD text (js/finds.js:124-129); bossnamed presumptions grounded (js/dialogue.js:80-83); kills trigger once-only at kills>=100 (js/game.js:1341-1344); intro[1] unreachable and the died-table gate absent confirmed at js/dialogue.js:421-438; thirty-years cap holds at exactly 2 outside keepers; no em or en dash anywhere; no new proper names.

## 6. The skeptic process and what it killed

Two read-only skeptic passes ran over the four territory books: a tone skeptic (voice convergence, story fidelity, solo fiction) and a craft skeptic (doctrine, scope walls, line mechanics). Both returned FIXABLE. Every blocker and fix is applied in LINE_BOOK.md; the condemned text is preserved here because honest verdicts are the point.

Killed and replaced:
- Three-way kills[1] convergence. Max "A hundred. The forest is counting too.", Junie "A hundred. The woods are not emptier.", Gus "A hundred, and the woods are still full.": three seats independently wrote one line, failing the hide-the-name test the seats themselves cite. Max keeps the counting angle (his lever); Junie re-angled through smoke ("A hundred. The smoke smells the same."); Gus through weight ("A hundred. Every one was heavy.").
- Junie runstart[3] "They believe forever. I just need tonight.": restated the belief clause seat 4's intro rewrite exists to remove, falsifying the twoMarks regate on run one. Re-angled off the belief rule entirely ("The dark wants tonight. So does my fire.").
- Max death[1] "I lost count. I lost count.": verbatim clause collision with Junie's kept kills[0]. Replaced with the lost headcount ("Who is still up... who is..."), his people-counting tragedy.
- The crack-device collapse at low health: all three seats claimed bare repetition as fear syntax. Junie lowhp[1] "Too many. Too many." (zero lever content, movable unchanged) re-levered through smoke; Junie revive[0] "Not out yet. Not out yet." (one word from Max's kept "Not yet. NOT yet.") re-levered to the fire reading ("Still lit. Still lit."). Max's tripled "Stay up" stands now that the device is no longer shared at the same slots.
- Gus runstart[1] "The dark got here early tonight.": failed the move-test outright, atmospheric filler touching none of his five levers. Rerouted through ground and weight.
- Max runstart[2] "New blazes on the trail. Not ours.": pre-spent the totem[5] marked-wood revelation and near-quoted its clinching phrase. The seat's own fallback shipped.
- Gus win[1] "Still standing. All of us. Good." and runstart[2] "Stay behind me when it gets loud.": solo-fiction leaks (COOP_DESIGN.md section 1) plus poaching Max's orders-to-nobody quirk. Both rewritten without a plural or an addressee.
- BLOCKER: CRITTER.squeaks[4] (js/dialogue.js:492) was assigned to no seat while being the diagnosed ranked failure 3 item and the game's only statement of the witnessed-therefore-killed duality (STORY_DESIGN.md:573). Written at assembly: "It needed to be seen. Being seen is what kills things here." Subtitle-only, zero synth.
- BLOCKER: seat 4 arc.fullJournal_1 "Everything out there depends on being forgotten.": stated a threat rule backwards (STORY_DESIGN.md:45-53: the Signed depend on belief; the player wins because belief has faded), from a character who never explains rules, while grazing the squirrel's reserved duality. Replaced with the skeptic's withheld-curiosity rewrite (see LINE_BOOK.md).
- Junie chest[1] "Dry matches. Finally.": asserted chest contents on a per-chest trigger (js/director.js:52-56); a rarity-shaped line in a common slot. Replaced content-neutral.
- Junie death[3] "Matches... left pocket... take them...": duplicated Gus's template bequeathing-at-death keeper. Re-angled onto her failure lever.
- Junie lowhp[5] and the token-brushing boss[5] pair, Gus's hare tail and boss[1] tail: note-level items, all retouched while the seats' batches were already open (harder danger read for lowhp[5]; Junie's own swap-in "Big tin. Bad night."; a positioning read for Max's boss[5] satisfying both skeptics; Gus tails converted to declaratives and his hare answer pushed to the weight angle so the two hare answers split).
- Process kills: seat 1 shipped roughly ten out-of-scope rows with no Q3 staging wall while seats 2 and 3 staged theirs; the identical wall is now applied to Max (death, lowhp, kills[1], bossnamed.hare merge; the rest staged). Seat 4's notes claim that "getting Signed" appears nowhere before twoMarks was false (Max runstart[3] keeper, Brock idle[4], died.hare all pre-fire); the claim is corrected to what actually holds: the token mechanism explanation first occurs at twoMarks, and the word circulating earlier pre-dates this pass. Two bibles cited pressure-shortens-sentences to voice-signaling section 4; the claim lives in section 1 and is reattributed above. Gus's notes arithmetic corrected by the chest[0] revert.

One skeptic conflict, resolved stricter: the tone skeptic would merge Max kills[0] now as an info fix; the craft skeptic stages it because the old line carried no number. It is STAGED; the creator can overrule.

## 7. Implementation plan

Step 1, THE REVIEW GATE: THE CREATOR READS THE LINE BOOK BEFORE ANY LINE LANDS IN CODE. LINE_BOOK.md is the approval surface. No text swap, no synth, no commit before that read.

Step 2, mechanical text swap, merge wave (approved scope): the MERGE rows only. Pure string replacement in js/dialogue.js (scout death/lowhp pools, kills[1] fixes, bossnamed answers, intro[0]/intro[1], died.squirrel, five arc closers, qm idle[0], squeaks[4]), js/finds.js (rollbook line 3 trim). No key, array length, or order changes anywhere; slot structure is verified frozen (section 5). One commit per territory, orchestrator commits.

Step 3, staged wave: the STAGED rows (Max 10, Junie 17, Gus 16 slots) wait on the creator's answer to STORY_DESIGN.md section 12 Q3. They are written, skeptic-passed, and printed in the book; merging them is the same mechanical swap.

Step 4, voice re-render. Wording is identity: hash8 keys on spokenText (tools/voice/gen.py:318-320, :392-399), so every changed line is one orphaned clip and one new synth, every kept line free. Real numbers from the ground inventory (37 clips per scout on disk per tools/voice/lines.json; Brock and qm counts per the seat 4 audit):
- Merge wave: Max 10, Junie 11, Gus 13, Brock 9, Quartermaster 1 = 44 synths.
- Staged wave (behind Q3): Max 10, Junie 17, Gus 16 = 43 synths.
- Full approval total: 87 new clips; 101 voiced lines keep their clips for free.
- Zero-cost text changes: Gus select narration (spokenText unchanged), the rollbook trim and squeaks[4] (subtitle-only; finds never render voice per js/finds.js:10-11, and dump_lines.cjs excludes CRITTER by design).
- Brock {scout} lines expand to 3 recordings each, but every {scout} line in this pass is KEPT, so the expansion costs nothing here.

Step 5, code gates (orchestrator work, not writing; all flagged, none fixed by this pass): the died-table codex gate per law 4 (js/dialogue.js:437-438; died.generic is the ready fallback); intro[1] unreachable (js/dialogue.js:421-425; replacement text ready if wired); Totem.revealLine spoken via campSpeak but never collected (js/feats.js:520-531; tools/voice/dump_lines.cjs:40-46), collection fix only, text frozen; squeaks[4] wiring if any (text supplied); qm idle escalation and retirement within the frozen 8 slots; dead KILLER_NAMES table; silent Check audition (js/ui.js:1368-1376).

Step 6, gates before commit, identical regardless of who wrote what: the game boots, a run reaches a boss, a death fires the new pool, no console errors, and a diff audit confirming only string literals changed.

Open questions still walled: Q3 bark scope (STORY_DESIGN.md section 12), rank vocabulary, item flavor names, naming freeze. Nothing in either file resolves them.
