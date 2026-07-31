# agents.md

Master file for `.claude/agents/`. This folder holds 4 agent definitions. There are no child folders
here, so this master has no outgoing master links.

**These files are not documentation. They are instructions that other agents load and obey as their
own system prompt.** A stale line in one of them does not sit quietly in a document, it propagates
into work. That is not hypothetical here: `sprite-artist.md` carried "you are NOT abandoning the
cute" against a repo `CLAUDE.md` that read "cute is dead", and a subagent handed both follows its own
agent definition, because that is what an agent definition is for. Both of those lines are now
superseded by RULING 6, which is exactly why the rule below matters more than the example.

So the standing notes below matter more than usual, and the rule for this folder is: **read the agent
file, then check its claims against `docs/preproduction/RULINGS.md`, which outranks every design
document in this repo.** Where they disagree, RULINGS.md wins and the agent file is wrong until
someone edits it.

All four files now name `docs/preproduction/RULINGS.md` and state that it outranks everything:
`sprite-artist.md:9`, `sound-designer.md:18`, `release-gate.md:44` and `level-designer.md:21`,
checked with a grep for RULINGS across all four files. That was true of only one of them before
2026-07-30.

**A correction pass ran on all four files on 2026-07-30, and a RULINGS PASS followed it the same
day.** What both fixed is recorded below under WHAT THE 2026-07-30 PASSES FIXED. The short version:
the correction pass fixed the retracted silhouette rule, the dead art document, the old cast, the
retired deploy target and the missing automated gates, and deliberately marked three tone questions
OPEN rather than guessing at them. The creator then RULED on all three (GORE, CUTE, and whose gear
the Signed wear), and the rulings pass wrote the answers into the files in the places the questions
used to be. **Nothing in this folder is marked open any more**, checked with a case-insensitive grep
for "open question" across all four agent definitions: the surviving hits are in this master,
describing the history, plus one sentence at `sprite-artist.md:153` recording that those questions
WERE ruled. No agent definition carries an open marker.

---

## THE FILES

### level-designer.md
163 lines. **Model: fable** (frontmatter `:4`). The house level designer, for room layout, room
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
bugs rather than an accepted baseline is a deliberate correction and stays. Its tone dependency
section at `:105-133` was rewritten by the rulings pass: cute is not a north star at `:116-122`,
gore is in with a settings toggle at `:123-129`, and the pointer it used to carry into
`sprite-artist.md`'s open cute question is gone because that question is answered. It still names
the gore tag vocabulary and the filter as not settled and not the level designer's to invent.

### release-gate.md
233 lines. **Model: opus** (frontmatter `:4`). The pre-ship verification pass. It certifies and does
not implement, runs a twelve-area matrix (cold boot, a winning run, new systems, balance,
performance, controller, packaged desktop, save migration, the automated gates, final sweep,
distinctiveness, the gore toggle) and returns SHIP or DO NOT SHIP with defects ranked by player
impact. Its rule zero
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
- The mobile-touch correction is still in. Area 6 at `:109-111` reads "Touch support is dropped by
  ruling; controller support is the replacement and is required", and it correctly refuses to certify
  that area PASS on keyboard and mouse alone. Re-verified 2026-07-30: a grep for gamepad across `js/`
  returns zero hits, so the area still fails by definition. A case-insensitive grep for touch, mobile
  and phone across all four agent files returns no surviving mobile touch test anywhere; the only
  other hits are the ordinary English "touch only the files your task names".
- Area 9 at `:129-156` is new and carries all three automated gates with their known standings, so a
  gate agent can no longer report the failing rooms baseline as a fresh break. Its record of the
  smoke test was updated again on 2026-07-30 when the seed stream split took that suite from four
  checks to eight.
- RULING 8 (no seed selection, no seed input) landed in area 1 at `:76-83`: the cold boot walk now
  confirms no screen shows, offers or accepts a seed, while recording that the seed still exists
  internally because save, resume and bug reproduction depend on it.
- **Area 12 at `:175-196` is new on the rulings pass.** Gore ships with a settings toggle
  (RULINGS.md ruling 5), so the gate now verifies that the toggle exists, that its state survives a
  reload, that with it off no gore is drawn or played in a run, at camp or on the death and results
  screens, that it changes ONLY gore, and that the game is still unsettling with it off. It is
  written to return NOT APPLICABLE today rather than PASS or FAIL, because neither the content nor
  the toggle exists: settings are one object at `js/ui.js:11` (`musicVol`, `sfxVol`, `voiceVol`,
  `shake`, `dmgNums`, `subtitles`) persisted to `mbm_settings` at `js/ui.js:17` with no gore key,
  and a case-insensitive grep for gore, gory and blood across `js/` finds no gore system, only
  prose, the `blood` trait FAMILY name at `js/pool.js:41`, a card palette at `js/sprites.js:2486`
  and one dialogue line at `js/dialogue.js:103`. The area count moved from eleven to twelve and
  `:3`, `:63`, `:164` and `:223` were updated together.

### sound-designer.md
212 lines. **Model: fable** (frontmatter `:4`). The house sound designer, for music, sound effects,
positional audio, mixing and voice direction across `js/audio.js`, `js/music.js`, `js/music/src/*`,
`js/voice.js`, `js/audio_director.js`, `js/footsteps.js`, `tools/render` and `tools/voice` (all
verified present). It encodes the bus graph, the positional-audio recipe table, the live-mixed
four-stem music model, the loop-seam trap, the voice pipeline, and a seven-step verification loop
that insists on measured numbers rather than reasoned ones.
**STANDING: THE AUDIO ENGINEERING IS SOLID AND UNAFFECTED BY THE REBOOT. THE TONE SECTION NOW
CARRIES TWO RULINGS.** Everything about buses, ducking, emitters, stems, quantisation and the loop trap is
about the code and the mix, and no ruling touches it. Its governing rule at `:91-97`, that baked
assets are an enhancement layer and the game must sound finished with the whole assets directory
deleted, is the strongest line in the file and should survive any rewrite. Its voice recipes at
`:99-111` survive in part: Brock keeps his name and his clips (`docs/preproduction/PREMISE_2.md:195`,
`:823`), and Old Nobody is a boss, not a member of the cut cast. The old-cast opening line is fixed at
`:7-8`, and a canon-authority block was added at `:16-31`. Its tone section at `:113-175` was
rewritten by the rulings pass and now states answers rather than questions: GORE IS IN WITH A
SETTINGS TOGGLE at `:121-152`, which names this file's own "Never gory" line as dead and restates
the tagged-content rule for audio (never bake a squelch into a cue that also carries the hit), and
CUTE IS NOT A NORTH STAR at `:154-175`, which kills the old "unsettling BECAUSE it is still cute"
line without licensing an overcorrection into growls.

### sprite-artist.md
385 lines, by far the longest of the four, and the one that changed most on 2026-07-30. **Model:
fable** (frontmatter `:4`). The house artist, for sprite, painter, portrait and visual asset work in
`js/sprites.js` and `js/portraits.js` (both verified present). It carries the style laws, the costume
and prop density bar, the eerie register argument, production rules and a five-step verification loop.
**STANDING: THE STALE DOCTRINE IS OUT AND ALL THREE OF ITS TONE QUESTIONS ARE NOW RULED INSIDE IT.**
- Its opening at `:7-29` states the method honestly in two halves: the code is code-painted today and
  you match it if you touch it, and the ruling is that authored assets replace it, arriving one name
  at a time through the `SPR.get` seam at `js/sprites.js:5375-5381` (verified: `get` is defined at
  `js/sprites.js:5375-5381` and exported at `:5636`).
- The retracted pairwise silhouette bar is gone from the production rules and replaced at `:312-339`
  by per-creature readability plus shared-room separation, with the spawn tables in `js/rooms.js`
  named as where the check actually runs.
- **The three rulings live at `:157-185` (CUTE IS NOT A NORTH STAR), `:187-234` (GORE IS IN, WITH A
  SETTINGS TOGGLE) and `:112-143` (THE SIGNED WEAR HUMAN THINGS THEY HAVE FOUND).** Each carries the
  creator's verbatim words. The rules that used to hang off the open questions now carry the answer
  in place: `:53-56` states `cuteEye()` as an internal id and a code fact rather than tone
  direction; `:75-84` re-derives the IDENTITY eye law from READABILITY, keeps the face-readability
  requirement binding, and names the one-third-of-head-width proportion as undecided and the art
  bible's; `:251-256` states the tone ordering with both the cute first beat and the joke third beat
  gone; and `:140-143` records what ruling 7 does NOT settle.
- **This is still the file to read most carefully before dispatching an art brief**, not because it
  teaches dead doctrine but because it is where the register, the gore architecture and the Signed
  gear rules all live, and because the things it names as UNDECIDED (the eye proportion, the two-tier
  line weight, the gore tag vocabulary) are ones an agent must ask about rather than pick.

---

## WHAT THE 2026-07-30 PASSES FIXED

Recorded so the same corrections are not made twice, and so anyone can check the transcription
against its source. Items 1 to 7 are the correction pass. Items 8 to 10 are the rulings pass that
followed it the same day. All line numbers are POST-RULINGS-PASS, because that pass moved most of
`sprite-artist.md`.

1. **The retracted pairwise silhouette requirement is out of `sprite-artist.md`.** It read that every
   new creature must be distinguishable from every existing one by outline alone, tested against the
   whole roster. `RULINGS.md` correction 1 retracted exactly that and replaced it. The file now
   carries, at `:312-339`, in-play readability measured PER CREATURE, and separation required only
   between creatures that SHARE A ROOM, checked against the per-room `cast` maps, the `waves` arrays
   and `WAVE_TEMPLATES` at `js/rooms.js:107`. The creator's framing (two creatures that resemble each
   other in life are supposed to resemble each other on screen) is quoted in substance, and
   non-convergence is named as a property of a generator rather than of this game, so it cannot be
   smuggled back in. The old method sentence, "Test it against the whole roster, not against your
   favourites", is deleted. The verification loop step 3 at `:362-369` is rewritten to match.
   `release-gate.md:151-158` carries the same guard, because its area 11 is called DISTINCTIVENESS
   and could be misread as a per-pair check.
2. **Nothing cites `ART_STYLE.md` as authority any more.** A grep for ART_STYLE across the four files
   returns hits only at `sprite-artist.md:33`, `:39`, `:70`, `:277`, `:315`, `:320` and
   `release-gate.md:14`,
   and every one of them names it as superseded or as a stub that records something, never as a rule
   to follow. The two-tier line weight rule at `sprite-artist.md:69-74` is now stated as UNDECIDED
   (the stub records it as died-with-the-file), with the numbers kept only as what existing painters
   already use. The teenage proportion amendment is transcribed in full at `sprite-artist.md:263-281`
   with an explicit note that its home document is gone, the art bible has not re-homed it, and
   nobody should go looking for it at the end of `ART_STYLE.md`.
3. **Code-painted art is reframed, not deleted.** The craft knowledge (helpers, five-level lighting,
   bake discipline) is kept and labelled as how the CURRENT code works and what to match if you touch
   it: `sprite-artist.md:13-29`, `:297-303`, `:350-352` and the verification loop at `:357-369`. The
   ruling that authored assets replace it, and the `SPR.get` seam that makes the swap per name, are
   stated with it.
4. **The cast is fixed in the three files that carried the old one, and the ids are protected in all
   four.** `sprite-artist.md:42-47` and `:263-267`, `sound-designer.md:7-8` and `:24-31`,
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
   ten to eleven on that pass, and from eleven to twelve on the rulings pass (see item 10).
7. **`level-designer.md` states the real precedence.** `:21-30`. RULINGS.md first, LEVEL_DESIGN.md
   binding on the rest, RULINGS.md wins where they disagree. The same phrasing was checked in the
   other three files: none of them called any design document binding law.
8. **GORE IS RULED: IN, WITH A SETTINGS TOGGLE.** RULINGS.md ruling 5, with the creator's verbatim
   words carried there and in both files that used to argue about it. `sound-designer.md`'s "Never
   gory" is DEAD and `sprite-artist.md`'s permission is CONFIRMED rather than tolerated. The answer
   sits where each question sat: `sprite-artist.md:187-234` and `sound-designer.md:121-152`, with the
   consequence for wet details on hazards and set pieces written into `level-designer.md:123-129`.
   The architectural half is RESTATED rather than dropped: gore is separately tagged content that
   can simply not be shown, never baked into a base asset, which is the old "separate, last-applied
   layer in every painter" principle re-derived for authored assets. The rule that survived the
   question is kept in every file and is now more load bearing, not less: IF THE TOGGLE CAN REMOVE
   IT, IT CANNOT BE LOAD-BEARING. `release-gate.md` gained AREA 12 for it at `:162-183`, and its
   area count moved to twelve at `:3`, `:63`, `:151` and `:210`.
9. **CUTE IS RULED: NOT A NORTH STAR.** RULINGS.md ruling 6, which also AMENDS settled item 11's
   "cute is dead everywhere" wording rather than leaving canon disagreeing with itself. The
   distinction is the whole ruling: cute is never a target, and a creature that happens to read as
   cute is not a defect. Written at `sprite-artist.md:157-185`, `sound-designer.md:154-175` and
   `level-designer.md:116-122`. The craft rules that hung off the question were separated one at a
   time: the eye size law is RE-DERIVED FROM READABILITY and keeps its full force with the specific
   proportion now undecided (`sprite-artist.md:75-84`), `cuteEye()` is stated as an internal id and a
   code fact rather than doctrine (`:53-56`), and the tone ordering lost both the cute first beat and
   the joke third beat (`:251-256`). **No rule saying creatures must not look cute was added
   anywhere, on purpose**, because the ruling forbids that overcorrection.
10. **WHOSE GEAR THE SIGNED WEAR IS RULED: HUMAN THINGS THEY HAVE FOUND.** RULINGS.md ruling 7.
    Scout gear is retired AS THE RULE and kept as one allowed source among many, because the cast
    are no longer scouts. The mechanism is untouched and keeps its reasoning: gear sized for a
    person, worn wrong by something that does not understand it, reading as TAKEN FROM SOMEBODY
    rather than tailored to the animal, with the mascot test kept verbatim. The Token rule stays
    separate and intact. Written at `sprite-artist.md:112-143`, which also records at `:140-143`
    what the ruling does NOT settle. **No canonical list of gear was written, on purpose**: the
    creator's "who knows" is deliberate range.

---

## WHAT WAS OPEN AND IS NOW CLOSED BY RULING

**Nothing in this folder is marked open any more.** The three questions the correction pass marked
open on 2026-07-30 were all ruled by the creator later the same day, and the files carry the answers
in the places the questions stood. Checked with a case-insensitive grep for "open question" across
all four agent definitions: the only hit outside this master is `sprite-artist.md:153`, a sentence
recording that those questions WERE ruled.

They are recorded here so nobody reopens them, and so a reader who remembers the questions can find
what replaced them. **What each ruling did NOT settle is listed with it, because that is what is
still genuinely the creator's to answer.**

1. **GORE. CLOSED: IN, WITH A SETTINGS TOGGLE.** RULINGS.md ruling 5, and item 8 above for where it
   landed. What it was: `sound-designer.md` said "Never gory", `sprite-artist.md` said gore is
   allowed at Isaac's level and toggleable, and at the time a case-insensitive grep for gore, gory
   and blood over `docs/preproduction/RULINGS.md` returned ZERO hits, so nothing in canon settled
   it. Canon settles it now. **NOT SETTLED: the settings UI, the tag vocabulary, and how the filter
   is implemented.** All three are tracked in RULINGS.md under WHAT THESE RULINGS OPENED, and all
   four files that touch gore say plainly that they are not the agent's to invent.
2. **CUTE. CLOSED: NOT A NORTH STAR.** RULINGS.md ruling 6, and item 9 above. The ruling also
   amended settled item 11's "cute is dead everywhere" wording, so canon no longer disagrees with
   itself on the point. **NOT SETTLED: the register spec itself, which belongs to the unwritten art
   bible, and the eye proportion the retired cute-register number expressed.**
3. **WHOSE GEAR THE SIGNED WEAR. CLOSED: HUMAN THINGS THEY HAVE FOUND.** RULINGS.md ruling 7, and
   item 10 above. Scout gear stops being the rule and becomes one allowed source; the mechanism
   (sized for a person, worn by something that does not understand it, taken from somebody) is
   untouched. **NOT SETTLED: which species carry what, whether gear varies by act or by depth, and
   whether any gear is authored as a readable tell rather than as decoration.** Art bible work.

---

## KNOWN GAPS

What is still wrong or missing in or around this folder, **NOT FIXED**.

1. **The art bible does not exist, so the leftovers of the three rulings cannot be closed from
   inside this folder.** `ART_STYLE.md` is a superseded stub and `docs/preproduction/RULINGS.md`
   records the replacement as outstanding, size L. RULINGS.md now rules on four art points
   (per-creature readability, shared-room separation, the register with cute not a north star, and
   what the Signed wear), and the bible owns the rest: the eye proportion, the two-tier line weight,
   the teenage proportion amendment, which species carry what gear, whether gear varies by act or
   depth, and whether gear is a readable tell.
2. **The `ART_STYLE.md` stub's citation into this folder is now stale, and this folder cannot fix
   it.** The stub names `.claude/agents/sprite-artist.md:151` at `ART_STYLE.md:63` as one of four
   things depending on the teenage proportion amendment. That amendment is now transcribed at
   `sprite-artist.md:263-281`, so the stub's line number points at the wrong place, and the rulings
   pass moved it again. Whoever owns `ART_STYLE.md` should re-point it.
3. **The teenage proportion amendment has no home document.** `sprite-artist.md:263-281` carries a
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
6. **The repo's `CLAUDE.md` gotcha at `:118` still reads "Cute is dead", and this folder cannot fix
   it.** RULING 6 narrowed that: cute is not a north star and is never aimed for, but a creature
   that happens to read as cute is not a defect. The line as written invites the overcorrection the
   ruling forbids. The four agent files carry the ruled wording, so an agent that loads both now
   gets the narrow version from its own definition, but whoever owns `CLAUDE.md` should land the
   amendment there too.
7. **Area 12 of `release-gate.md` has nothing to gate yet.** Gore ships by ruling and neither the
   content nor the toggle exists. The area is written to return NOT APPLICABLE rather than PASS or
   FAIL until they do, which is honest but is not a check that has ever run.
