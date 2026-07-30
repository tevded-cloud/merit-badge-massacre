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

All four files now name `docs/preproduction/RULINGS.md` and state that it outranks everything:
`sprite-artist.md:9`, `sound-designer.md:18`, `release-gate.md:44` and `level-designer.md:21`,
checked with a grep for RULINGS across all four files. That was true of only one of them before
2026-07-30.

**A correction pass ran on all four files on 2026-07-30.** What it fixed and what it deliberately
refused to fix are recorded below, under WHAT THE 2026-07-30 PASS FIXED and WHAT IS MARKED OPEN. The
short version: the retracted silhouette rule, the dead art document, the old cast, the retired deploy
target and the missing automated gates are corrected; GORE and CUTE are marked open in the files
rather than decided, because nothing in canon settles either one.

---

## THE FILES

### level-designer.md
157 lines. **Model: fable** (frontmatter `:4`). The house level designer, for room layout, room
shape, traps, hazards, set pieces, door placement, paths and spawn choreography in `js/rooms.js`,
`js/room.js`, `js/props.js` and the world dressing in `js/render.js` (all four verified present).
It carries the measured state of the level set so an agent does not rediscover it, the three
directions the creator named (rooms should not be rectangles, a trope is a contract, trails must look
walked), the rules that hold regardless, and a five-step verification loop built on
`npm run rooms:check`.
**STANDING: SOUND. THE AUTHORITY LINE IS FIXED.** Its "before designing anything" list at `:21-30`
now reads RULINGS.md first and states that LEVEL_DESIGN.md is binding on everything RULINGS.md does
not cover and loses where the two disagree. Its measured state at `:36-49` is dated 2026-07-28 and
was re-run on 2026-07-30 with identical figures (33 of 46 layouts failing, 85 failures, 165 skips,
exit 1), recorded in the file at `:49-50`. Its instruction at `:52-56` to treat those failures as
bugs rather than an accepted baseline is a deliberate correction and stays.

### release-gate.md
197 lines. **Model: opus** (frontmatter `:4`). The pre-ship verification pass. It certifies and does
not implement, runs an eleven-area matrix (cold boot, a winning run, new systems, balance,
performance, controller, packaged desktop, save migration, the automated gates, final sweep,
distinctiveness) and returns SHIP or DO NOT SHIP with defects ranked by player impact. Its rule zero
at `:49-61` refuses to certify a tree that moved underneath it, and it instructs its own agent to
check this file against the repo on every run, because it rotted once already.
**STANDING: CORRECTED 2026-07-30, AND ITS ASSET COUNT WAS WRONG.**
- The shipping surface is fixed. The description at `:3` no longer triggers on a deploy to
  tevded.com/critters, and `:29-34` states the Steam-only ruling with the browser build kept as the
  internal build target.
- The asset count was WRONG and is now measured. It read "223 audio asset files under assets\".
  Counted on disk 2026-07-30: 221 `.webm`, 1 `manifest.json`, 1 `assets/voice/LICENSE-VOICES.md` and
  the folder master `assets/assets.md`, so 224 files of which 223 are covered by that master. The old
  figure counted a licence file and a master file as audio. `:19-27` now carries the breakdown, and
  `npm run masters:check` independently reports 223 files to cover in `assets/`.
- The mobile-touch correction is still in. Area 6 at `:102-104` reads "Touch support is dropped by
  ruling; controller support is the replacement and is required", and it correctly refuses to certify
  that area PASS on keyboard and mouse alone. Re-verified 2026-07-30: a grep for gamepad across `js/`
  returns zero hits, so the area still fails by definition. A case-insensitive grep for touch, mobile
  and phone across all four agent files returns no surviving mobile touch test anywhere; the only
  other hits are the ordinary English "touch only the files your task names".
- Area 9 at `:122-142` is new and carries all three automated gates with their known standings, so a
  gate agent can no longer report the failing rooms baseline as a fresh break.

### sound-designer.md
187 lines. **Model: fable** (frontmatter `:4`). The house sound designer, for music, sound effects,
positional audio, mixing and voice direction across `js/audio.js`, `js/music.js`, `js/music/src/*`,
`js/voice.js`, `js/audio_director.js`, `js/footsteps.js`, `tools/render` and `tools/voice` (all
verified present). It encodes the bus graph, the positional-audio recipe table, the live-mixed
four-stem music model, the loop-seam trap, the voice pipeline, and a seven-step verification loop
that insists on measured numbers rather than reasoned ones.
**STANDING: THE AUDIO ENGINEERING IS SOLID AND UNAFFECTED BY THE REBOOT. THE TONE SECTION IS NOW TWO
OPEN QUESTIONS.** Everything about buses, ducking, emitters, stems, quantisation and the loop trap is
about the code and the mix, and no ruling touches it. Its governing rule at `:91-97`, that baked
assets are an enhancement layer and the game must sound finished with the whole assets directory
deleted, is the strongest line in the file and should survive any rewrite. Its voice recipes at
`:99-111` survive in part: Brock keeps his name and his clips (`docs/preproduction/PREMISE_2.md:195`,
`:823`), and Old Nobody is a boss, not a member of the cut cast. The old-cast opening line is fixed at
`:7-8`, and a canon-authority block was added at `:16-31`.

### sprite-artist.md
351 lines, by far the longest of the four, and the one that changed most on 2026-07-30. **Model:
fable** (frontmatter `:4`). The house artist, for sprite, painter, portrait and visual asset work in
`js/sprites.js` and `js/portraits.js` (both verified present). It carries the style laws, the costume
and prop density bar, the eerie register argument, production rules and a five-step verification loop.
**STANDING: THE STALE DOCTRINE IS OUT. TWO TONE QUESTIONS ARE NOW MARKED OPEN INSIDE IT.**
- Its opening at `:7-29` states the method honestly in two halves: the code is code-painted today and
  you match it if you touch it, and the ruling is that authored assets replace it, arriving one name
  at a time through the `SPR.get` seam at `js/sprites.js:5375-5381` (verified: `get` is defined at
  `js/sprites.js:5375-5381` and exported at `:5636`).
- The retracted pairwise silhouette bar is gone from the production rules and replaced at `:282-309`
  by per-creature readability plus shared-room separation, with the spawn tables in `js/rooms.js`
  named as where the check actually runs.
- The two open questions live at `:139-161` (CUTE) and `:163-203` (GORE), and the rules that hang off
  them point back at them: `:52` for `cuteEye()`, `:73-78` for the eye size law, `:220-226` for the
  tone ordering.
- **This is still the file to read most carefully before dispatching an art brief**, not because it
  now teaches dead doctrine but because two of its tone questions are open and an agent must ask
  rather than pick.

---

## WHAT THE 2026-07-30 PASS FIXED

Recorded so the same corrections are not made twice, and so anyone can check the transcription
against its source.

1. **The retracted pairwise silhouette requirement is out of `sprite-artist.md`.** It read that every
   new creature must be distinguishable from every existing one by outline alone, tested against the
   whole roster. `RULINGS.md` correction 1 retracted exactly that and replaced it. The file now
   carries, at `:282-309`, in-play readability measured PER CREATURE, and separation required only
   between creatures that SHARE A ROOM, checked against the per-room `cast` maps, the `waves` arrays
   and `WAVE_TEMPLATES` at `js/rooms.js:107`. The creator's framing (two creatures that resemble each
   other in life are supposed to resemble each other on screen) is quoted in substance, and
   non-convergence is named as a property of a generator rather than of this game, so it cannot be
   smuggled back in. The old method sentence, "Test it against the whole roster, not against your
   favourites", is deleted. The verification loop step 3 at `:332-339` is rewritten to match.
   `release-gate.md:151-158` carries the same guard, because its area 11 is called DISTINCTIVENESS
   and could be misread as a per-pair check.
2. **Nothing cites `ART_STYLE.md` as authority any more.** A grep for ART_STYLE across the four files
   returns hits only at `sprite-artist.md:33`, `:38`, `:68`, `:247`, `:285`, `:290` and
   `release-gate.md:14`,
   and every one of them names it as superseded or as a stub that records something, never as a rule
   to follow. The two-tier line weight rule at `sprite-artist.md:67-72` is now stated as UNDECIDED
   (the stub records it as died-with-the-file), with the numbers kept only as what existing painters
   already use. The teenage proportion amendment is transcribed in full at `sprite-artist.md:233-251`
   with an explicit note that its home document is gone, the art bible has not re-homed it, and
   nobody should go looking for it at the end of `ART_STYLE.md`.
3. **Code-painted art is reframed, not deleted.** The craft knowledge (helpers, five-level lighting,
   bake discipline) is kept and labelled as how the CURRENT code works and what to match if you touch
   it: `sprite-artist.md:13-29`, `:267-273`, `:320-322` and the verification loop at `:327-339`. The
   ruling that authored assets replace it, and the `SPR.get` seam that makes the swap per name, are
   stated with it.
4. **The cast is fixed in the three files that carried the old one, and the ids are protected in all
   four.** `sprite-artist.md:41-46` and `:233-237`, `sound-designer.md:7-8` and `:24-31`,
   `release-gate.md:36-42` and `:69-75`, plus `level-designer.md:7-11`, which had no cast reference
   to fix. Every one of them says the same two things: the cast is Dez, Junior, Vic, Hollis and
   Mikey, and the internal ids (`max`, `junie`, `gus`) are never to be renamed, because display names
   and internal ids are separate forever.
5. **`release-gate.md` no longer gates a product that was retired.** `:3` and `:29-34`.
6. **`release-gate.md` can see the automated gates.** New area 9 at `:122-142` lists all three with
   the standings measured on 2026-07-30: `npm test` (`tools/smoke.cjs`) 4 pass 0 fail exit 0, with
   the 51-site `Math.random` ratchet; `npm run masters:check` (`tools/validate_masters.cjs`) 9 of 9
   masters, 0 failures, exit 0; `npm run rooms:check` (`tools/validate_rooms.cjs`) 33 of 46 layouts
   failing, 85 failures, 165 skips, EXIT 1 AS THE KNOWN STATE. The area count in the file moved from
   ten to eleven, and `:3`, `:63`, `:151` and `:187` were updated together.
7. **`level-designer.md` states the real precedence.** `:21-30`. RULINGS.md first, LEVEL_DESIGN.md
   binding on the rest, RULINGS.md wins where they disagree. The same phrasing was checked in the
   other three files: none of them called any design document binding law.

---

## WHAT IS MARKED OPEN, NOT ANSWERED

These are live questions and the files now say so instead of asserting opposite certainties. **Do not
resolve them in a brief. They are the creator's to answer.**

1. **GORE.** `sound-designer.md` said "Never gory"; `sprite-artist.md` said gore is allowed at
   Isaac's level and is toggleable. A case-insensitive grep for gore, gory and blood over
   `docs/preproduction/RULINGS.md` returns ZERO hits, so nothing in canon settles it, and both claims
   predate the reboot. It is now written as an open question in both files, at
   `sprite-artist.md:163-203` and `sound-designer.md:120-137`. The architecture the sprite file
   specified for it (a separate last-applied layer inside every painter, behind a flag, argued as
   cheap "because our art is code") is called out as written for the retired method, so the
   implementation half is open too. The one rule kept in both files because it survives either
   answer: IF THE TOGGLE CAN REMOVE IT, IT CANNOT BE LOAD-BEARING, meaning whatever carries the
   unease has to work with the toggle off.
2. **CUTE.** `RULINGS.md:60` rules the register eerie and says cute is dead everywhere, and the
   repo's `CLAUDE.md` gotcha calls any friendly, big-eyed, storybook treatment a defect. Against that,
   `sprite-artist.md` argued for cute SHAPES with wrong details, an ordering that begins at cute, and
   an identity law requiring eyes at a third of the head width, with `cuteEye()` named among the
   helpers. Both sides are now stated in the files rather than one deleting the other, at
   `sprite-artist.md:139-161`, `sound-designer.md:139-152` and `level-designer.md:117-122`, with the
   distinction that matters written out: the governing text kills a cute FEELING, and the sprite file
   argues for cute CONSTRUCTION, which is a different claim nobody has ruled on. The instruction in
   every case is to ASK before painting a face, pitching a critter's voice, or naming a set piece.
   The craft rules are neither deleted nor endorsed.
3. **WHOSE GEAR THE SIGNED WEAR.** Marked open on this pass, not anticipated by the brief that
   ordered it. `sprite-artist.md:106-127`. That file's lore rule read "the Signed wear SCAVENGED
   SCOUT GEAR" and now reads scavenged HUMAN gear, with the scout reading named as the 2026-07-28
   wording and flagged open. It was written when the cast were scouts. The cast is no longer scouts, and the badge economy
   that carried the scout imagery is itself proposed for replacement by the enemy's own tin at
   `docs/preproduction/PREMISE_2.md:1033-1038`, which is a recommendation and not a ruling.
   RULINGS.md does not rule on it. What the file keeps as surviving regardless is the mechanism: the
   Signed wear HUMAN gear TAKEN FROM SOMEBODY, worn by something that does not understand it.

---

## KNOWN GAPS

What is still wrong or missing in or around this folder, **NOT FIXED**.

1. **The art bible does not exist, so the two open questions above cannot be closed from inside this
   folder.** `ART_STYLE.md` is a superseded stub and `docs/preproduction/RULINGS.md` records the
   replacement as outstanding, size L. Until it is written, RULINGS.md rules on exactly two art
   points (per-creature readability and shared-room separation) and everything else about the look of
   this game is undecided.
2. **The `ART_STYLE.md` stub's citation into this folder is now stale, and this folder cannot fix
   it.** The stub names `.claude/agents/sprite-artist.md:151` as one of four things depending on the
   teenage proportion amendment. That amendment is now transcribed at `sprite-artist.md:233-251`, so
   the stub's line number points at the wrong place. Whoever owns `ART_STYLE.md` should re-point it.
3. **The teenage proportion amendment has no home document.** `sprite-artist.md:233-251` carries a
   working transcription, which is a copy and not an authority. The art bible owns re-homing it.
4. **Nothing in this folder covers the four newest systems in the rulings**: the swappable named
   active, the unkillable thing, milestone-gated character arrival, and co-op transport. Checked
   with a case-insensitive grep for unkillable, swappable, "active skill", arrival, arrives, co-op,
   coop, multiplayer, relay and "hole punch" across all four agent definitions: zero hits, the only
   matches in the folder being this paragraph. That is not rot, it is scope: no agent has been
   written for run architecture or for co-op.
5. **Area 6 of `release-gate.md` still fails by definition.** No gamepad code exists anywhere in
   `js/` (grep for gamepad across `js/`, zero hits, re-checked 2026-07-30), and controller support is
   required by ruling. The gate is correct to refuse that area; the work has not landed.
