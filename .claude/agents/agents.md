# agents.md

Master file for `.claude/agents/`. This folder holds 4 agent definitions. There are no child folders
here, so this master has no outgoing master links.

**These files are not documentation. They are instructions that other agents load and obey as their
own system prompt.** A stale line in one of them does not sit quietly in a document, it propagates
into work. A subagent that reads "cute is dead" in the repo's CLAUDE.md and "you are NOT abandoning
the cute" in its own agent definition will follow the agent definition, because that is what an agent
definition is for.

So the standing notes below matter more than usual, and the rule for this folder is: **read the agent
file, then check its claims against `docs/preproduction/RULINGS.md`, which outranks every design
document in this repo.** Where they disagree, RULINGS.md wins and the agent file is wrong until
someone edits it.

Only one of the four files mentions RULINGS.md at all. That is `sprite-artist.md`, at `:18` and
`:20`. `level-designer.md`, `sound-designer.md` and `release-gate.md` do not reference it, which was
checked with a grep for RULINGS across all four files.

---

## THE FILES

### level-designer.md
127 lines. **Model: fable** (frontmatter `:4`). The house level designer, for room layout, room
shape, traps, hazards, set pieces, door placement, paths and spawn choreography in `js/rooms.js`,
`js/room.js`, `js/props.js` and the world dressing in `js/render.js` (all four verified present).
It carries the measured state of the level set so an agent does not rediscover it, the three
directions the creator named (rooms should not be rectangles, a trope is a contract, trails must look
walked), the rules that hold regardless, and a five-step verification loop built on
`npm run rooms:check`.
**STANDING: LARGELY SOUND, WITH ONE AUTHORITY LINE THAT IS NOW WRONG.** Its measured state at
`:27-38` is explicitly dated 2026-07-28 and its validator figures (46 layouts, 33 failing at least
one predicate, 85 failures) match what the repo's own CLAUDE.md records, so it is honest about its
own age. Its instruction at `:40-44` to treat those failures as bugs rather than an accepted baseline
is a deliberate correction and should stay.

### release-gate.md
140 lines. **Model: opus** (frontmatter `:4`). The pre-ship verification pass. It certifies and does
not implement, runs a ten-area matrix (cold boot, a winning run, new systems, balance, performance,
controller, packaged desktop, save migration, final sweep, distinctiveness) and returns SHIP or DO NOT
SHIP with defects ranked by player impact. Its rule zero at `:20-32` refuses to certify a tree that
moved underneath it, and it instructs its own agent to check this file against the repo on every run,
because it rotted once already.
**STANDING: BOTH RECENT CORRECTIONS LANDED, VERIFIED.**
- The asset-count correction is in and is correct. `:14-16` now reads that there are 223 audio asset
  files under `assets\`. Counted on disk with `find assets -type f | wc -l`: 223. Matches exactly.
- The mobile-touch correction is in. Area 6 at `:69-71` now reads "Touch support is dropped by
  ruling; controller support is the replacement and is required", and it correctly refuses to certify
  that area PASS on keyboard and mouse alone. A case-insensitive grep for touch, mobile and phone
  across all four agent files returns no surviving mobile touch test anywhere; the only other hits
  are the ordinary English "touch only the files your task names".

### sound-designer.md
131 lines. **Model: fable** (frontmatter `:4`). The house sound designer, for music, sound effects,
positional audio, mixing and voice direction across `js/audio.js`, `js/music.js`, `js/music/src/*`,
`js/voice.js`, `js/audio_director.js`, `js/footsteps.js`, `tools/render` and `tools/voice` (all
verified present). It encodes the bus graph, the positional-audio recipe table, the live-mixed
four-stem music model, the loop-seam trap, the voice pipeline, and a seven-step verification loop
that insists on measured numbers rather than reasoned ones.
**STANDING: THE AUDIO ENGINEERING IS SOLID AND UNAFFECTED BY THE REBOOT. THE TONE SECTION IS
SUPERSEDED.** Everything about buses, ducking, emitters, stems, quantisation and the loop trap is
about the code and the mix, and no ruling touches it. Its governing rule at `:74-80`, that baked
assets are an enhancement layer and the game must sound finished with the whole assets directory
deleted, is the strongest line in the file and should survive any rewrite. Its voice recipes at
`:83-88` survive in part: Brock keeps his name and his clips (`docs/preproduction/PREMISE_2.md:195`,
`:823`), and Old Nobody is a boss, not a member of the cut cast.

### sprite-artist.md
220 lines, the longest of the four. **Model: fable** (frontmatter `:4`). The house artist, for
sprite, painter, portrait and visual asset work in `js/sprites.js` and `js/portraits.js` (both
verified present). It carries the style laws, the costume and prop density bar, the eerie register
argument, the gore-toggle rule, production rules and a five-step verification loop.
**STANDING: ITS OPENING WAS CORRECTED AND THE CORRECTION IS GOOD. THE REST OF THE FILE WAS NOT
UPDATED TO MATCH.** The correction at `:14-20` is right and well written: it declares `ART_STYLE.md`
superseded and no longer binding, says both its method (code painted) and its register (storybook
cartoon) were ruled dead, points at `docs/preproduction/RULINGS.md` as the document that outranks
everything, and instructs the agent to ask rather than invent when RULINGS.md does not answer a
question. This matches the `ART_STYLE.md` stub on disk, which says the same thing about itself.
**The problem is that the correction was made in one section and the file has eleven other sections.**
The body still teaches the register, the method and the silhouette rule that the correction and
RULINGS.md killed. The specific lines are listed as gaps below. **This is the file in this folder
most likely to propagate superseded doctrine into work, and the one to read most carefully before
dispatching an art brief.**

---

## KNOWN GAPS

Found by reading all four files in full, recorded here, **NOT FIXED** (this master does not own these
files). Listed so the orchestrator can decide what to correct and in what order.

### sprite-artist.md, highest priority

1. **`:189-191` re-states the retracted pairwise silhouette requirement.** It reads that every new
   creature must be distinguishable from every existing one by outline alone, and to test it against
   the whole roster. `RULINGS.md` correction 1 retracted exactly this: distinctness is measured per
   creature as in-play readability, never per pair, and separation is required only between creatures
   that share a room, checked against the real spawn tables in `js/rooms.js`. This is the single most
   consequential stale line in the folder, because it sends an art agent to do an N-by-N comparison
   the creator ruled was never the right measurement.
2. **`:95-98` makes cute load-bearing.** "Cute shapes, wrong details... You are NOT making monsters,
   and you are NOT abandoning the cute." `RULINGS.md:59-61` (settled item 11) rules the register
   eerie and cute dead everywhere, sourced to `PREMISE_2.md:36-39`. The repo's CLAUDE.md says the same
   in one line.
3. **`:143-146` still orders the tone cute-first.** "The order is now CUTE, THEN WRONG, AND THE WRONG
   IS ALLOWED TO STAY." The second half survives the ruling. The first half does not.
4. **`:149-161` is written for the deleted cast and points at a dead document.** The section is headed
   "The scouts are teenagers", names Max, Junie and Gus at `:155`, and at `:156` instructs the agent to
   "Read the age amendment at the end of ART_STYLE.md before touching any scout". That amendment died
   with the file: the `ART_STYLE.md` stub records it at `:61-64` as one of two things that need a
   decision in the new art bible, and names `.claude/agents/sprite-artist.md:151` as one of four
   places that depend on it. So this instruction sends the agent to a document that no longer contains
   the thing it is being sent for.
5. **`:42` carries the two-tier line weight rule** (silhouette edges 2.4, interior details 1.0). The
   `ART_STYLE.md` stub at `:58-60` records this as the second thing that died with that file, a
   rendering convention tied to the rejected method, to be decided fresh in the new bible. It is
   presented here as a live law.
6. **Several production rules assume code-painted art, which is the rejected method.** `:8` ("every
   piece of art is code painted vector work baked once at load"), `:118-122` (gore as a last-applied
   branch inside every painter, argued as cheap "because our art is code"), `:176-181` (bake at
   supersample 3), `:200` ("Everything bakes once: spend hundreds of draw ops freely"), and the
   verification loop at `:209-211` (reading baked pixels off an offscreen canvas). Authored assets are
   the ruling (`RULINGS.md:59-61`). Note that the code in the repo is still code-painted today, so
   these lines describe the present accurately even though they describe a method that is being
   retired; that is a judgement call for whoever rewrites the file, not a simple deletion.
7. **`:29` names `cuteEye()` for friendlies as a helper to know before writing a stroke.** The
   `cuteEye` contract is explicitly dead: `PREMISE_2.md:36-39` ruling 8 and the `ART_STYLE.md` stub
   `:15-19`.
8. **`:22` and `:182-183` refer to "the scouts" and "three scouts" as the cast.** The cast is five
   non-scout survivors.

### release-gate.md

9. **`:3` names a deploy target the shipping ruling retired.** The description reads "Use before ANY
   deploy to tevded.com/critters". RULING 2 (`RULINGS.md:88-102`) makes Steam the only shipping
   surface and retires the browser build to an internal build target. The gate itself is still the
   right thing to run before an internal build; the trigger sentence describes a product that no
   longer exists.
10. **`:14` still cites `ART_STYLE.md` as the reference for how sprites are made.** That document is a
    superseded stub. The sentence around it is factually correct about today's code; only the citation
    is dead.
11. **`:41` describes a veteran save as having "all scouts"**, old-cast vocabulary.
12. **The ten-area matrix has no entry for the engine smoke test.** Area 9 runs `npm run rooms:check`
    only. `tools/smoke.cjs` is on disk. Whether it belongs in the matrix is a decision, not an
    obvious defect, but the gate currently cannot see it.

### sound-designer.md

13. **`:96-98` carries a tone rule that is superseded twice over.** It reads "Tone: cute first, wrong
    second, funny third. Never gory. A critter that has been Signed is unsettling because it is still
    cute, not because it growls." The cute-first ordering was already replaced inside this repo on
    2026-07-28 by `sprite-artist.md:143`, which names that exact phrase as the rule it supersedes, and
    cute was then killed outright by ruling. "Never gory" also directly contradicts
    `sprite-artist.md:101`, which permits gore at Isaac's level behind a toggle. Two agent files
    currently instruct opposite things about the same game.
14. **`:8` describes the game as "about scout kids and cryptid-marked woodland critters".** The cast
    is five non-scout survivors and the working title is PAST THE TREELINE.

### level-designer.md

15. **`:17-19` calls `LEVEL_DESIGN.md` binding law.** "Read LEVEL_DESIGN.md COMPLETELY. It is binding
    law, including the validator baseline section at the end." `RULINGS.md:5-9` names `LEVEL_DESIGN.md`
    specifically as one of the documents it outranks. The instruction should be to read it and defer
    to RULINGS.md where they disagree, which is close to what the next sentence already asks for
    ("say so in your report rather than picking silently") but weaker than the ruling requires.
16. **`:89-97` hedges on a tone question that is now settled.** It tells the agent that if the tone
    doctrine has not been settled yet, say so and design mechanics first. It is settled: eerie and
    adult, cute dead, per `RULINGS.md:59-61`.

### Across all four

17. **No agent file names the current cast or the working title.** A grep for Dez, Junior, Hollis,
    Mikey and Treeline across all four files returns zero hits. A grep for the old cast and for
    "scout" returns hits in three of the four (`sprite-artist.md`, `sound-designer.md`,
    `release-gate.md`).
18. **Three of four never mention `docs/preproduction/RULINGS.md`.** Only `sprite-artist.md` does. An
    agent loading `level-designer.md`, `sound-designer.md` or `release-gate.md` has no pointer to the
    document that outranks everything it is being told.
