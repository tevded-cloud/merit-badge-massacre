# preproduction.md

Master file for `docs/preproduction/`. This folder holds the design canon for the game working
titled PAST THE TREELINE, roughly 1.5 MB across 13 markdown files. There are no child folders here,
so this master has no outgoing master links.

Read this file before opening anything in this folder. Its job is that you open the right document
on the first try and know, before you open it, how much of it is still true.

---

## RULINGS.md OUTRANKS EVERYTHING. READ IT FIRST AND READ IT WHOLE.

`RULINGS.md` (668 lines, the smallest of the load-bearing documents) is the canon of record. It
outranks every other design document in this repo on any point where they disagree: the other 12
files in this folder, and the ones at the repo root (`PREMISE_2.md`, `COMBAT_ARCHITECTURE.md`,
`COOP_DESIGN.md`, `BUILD_ARCHITECTURE.md`, `LEVEL_DESIGN.md`, `AUTHENTICITY.md`, `MOTION_DESIGN.md`,
and the rest). Where a document below it still carries superseded text, RULINGS.md wins and that
document is simply wrong until someone edits it (`RULINGS.md:5-9`).

**A brief cites RULINGS.md. A brief does not cite the design documents.** That sentence is the whole
reason this folder was reorganised. The documents are large, several run past 90 KB, and quoting them
into a brief is how superseded design gets re-imported.

What RULINGS.md contains, in its own five parts:

1. **THE SETTLED DESIGN** (`:20-66`), twelve items that are closed and not up for debate: the reboot
   taken as written, the working title, the five survivors and their one carried tool each, tin and
   the Reading, the sight cost, death as rotation, the roster of three, no firearms above a BB gun,
   difficulty from depth plus opt-in modifiers, controller required and touch dropped, art is
   authored (procedural and code-generated art rejected), full human voice acting as the target.
   Item 11 was AMENDED on 2026-07-30: it used to read "cute is dead everywhere" and ruling 6
   narrowed that, so read the item and ruling 6 together.
2. **EIGHT RULINGS MADE 2026-07-30** (`:70-321`): co-op ships as a separate tense mode over hole
   punching plus a relay library; shipping is Steam only with a playable demo on Steam and the
   browser build retired to an internal build target; one unkillable thing in the woods ships; the
   flagship ability becomes a named swappable active whose effect is modulated by the player's
   passive items; gore is in, with a settings toggle, which forces gore to be authored as separately
   tagged content rather than baked into any base asset; cute is not a north star, which kills cute
   as a target without making a creature that happens to read as cute a defect; and the Signed wear
   human things they have found, which retires scout gear as the rule and keeps the mechanism
   (gear sized for a person, worn by something that does not understand it); and no seed selection
   and no seed input, so the player never sees a seed and starting a night is the only input, with
   the seed kept internal for save and resume, bug reproduction and co-op.
3. **TWO FACTUAL CORRECTIONS** (`:322-430`). Correction 1 retracts the silhouette-distinctness claim:
   canon cited `ART_STYLE.md:38-40` for a 0.60 pairwise IoU bar that file never contained, the real
   0.60 is a fidelity check from a research report where high overlap is good, and it had been
   applied as a distinctness bar where low would be good, so pass and fail were inverted. The
   creator then replaced the requirement rather than fixing the number: what binds now is in-play
   readability measured per creature, plus separation required only between creatures that share a
   room, checkable against the real spawn tables in `js/rooms.js`. Correction 2 flattens the death
   walk: a flat 2 nights every time, no escalation, no banked debt, `META.debt` deleted.
4. **THE ELEVEN CONTRADICTIONS, RESOLVED** (`:431-602`), C-1 through C-11, the places the three
   grounding audits disagreed with each other. Two are pure counting disputes; nine are design
   contradictions and each is resolved with a named winner or a creator ruling.
5. **PINNED NUMBERS** (`:603-678`) and **WHAT THESE RULINGS OPENED** (`:679-724`), ten outstanding
   items that this file tracks but does not resolve. The last of them is worth knowing before any
   room authoring starts: measured 2026-07-30, the game has 63 distinct layouts across 27 rooms in
   a night, and that, not the seed space, is what decides whether nights start feeling alike.

One rule inside RULINGS.md that binds anyone quoting it: the research library denominator is
deliberately NOT pinned, because the library is live and grew while the file was being written
(`RULINGS.md:601-618`). Every coverage figure carries the date and the command that produced it.

---

## PICK THE RIGHT DOCUMENT

| If your question is about | Open | Standing |
|---|---|---|
| Anything already ruled | `RULINGS.md` | GOVERNING |
| Premise, world, cast, tone | `PREMISE_2.md` | GOVERNING below RULINGS |
| Combat, economy, run shape, state schema | `COMBAT_ARCHITECTURE.md` | LIVE, with named superseded blocks |
| How to cite the research library | `DESIGN_SOURCES.md` | LIVE convention |
| Which research report to read | `LIBRARY_INDEX.md` | LIVE tool, dated snapshot |
| Enemy time-to-kill bands and roles | `ENEMY_DESIGN.md` ch 1 | SPLIT: bands survive, everything cast-shaped and economic does not |
| Per-boss mechanic reasoning | `BOSS_DESIGN.md` | SPLIT: reasoning survives, damage numbers do not |
| Cutting the old cast without crashing | `SAVE_MIGRATION.md` | LIVE spec, design only, no code |
| What the research library actually said | `GROUNDING_AUDIT_1/2/3.md` | HISTORICAL RECORD, recommendations superseded where RULINGS resolved them |
| Dialogue method and voice construction | `DIALOGUE_DESIGN.md` | METHOD SURVIVES, cast does not |
| The actual lines | `LINE_BOOK.md` | MOSTLY DEAD, the scout tables died with the cast |

---

## THE FILES

### RULINGS.md
The canon of record, written 2026-07-30. See the section above. **STANDING: GOVERNING. Nothing
supersedes it. It is the first file to open and the only one a brief should cite.**

### PREMISE_2.md
The premise canon: the world, the belief-is-sight rule, the five survivors, Brock, the camp, the
bestiary, and the cuts that produced the reboot. It opens with the creator's own rulings block at
`:3-45`, dated 2026-07-29, which binds everything below it in the same file, and which RULINGS.md
then takes as the source of its settled design (`RULINGS.md:22-23`).
**STANDING: GOVERNING below RULINGS.md.** Two known defects, both already corrected elsewhere. Its
silhouette claim at `:1874-1876` was rewritten in place on 2026-07-30 by correction 1, and the
surviving ask now sits at `:1879`. Its open call 29 (`:2016-2018`) asks where the line book lives and
its limitation 3 (`:2029-2031`) drops everything that rested on `DIALOGUE_DESIGN.md` on the grounds
that the file "does not exist on disk"; that search was scoped to the repo root (the parenthetical at
`:1660-1662` lists only root files), and both `DIALOGUE_DESIGN.md` and `LINE_BOOK.md` do exist, in
this folder. Treat open call 29 as answered and the withdrawn clip arithmetic as recoverable.

### COMBAT_ARCHITECTURE.md
The combat, economy and run-shape pass, dated 2026-07-29, 1252 lines. It owns the tool growth model
(conviction), the five tools, the pip health scale, the ledger pick economy, the sight bands, the
state schema and the implementation ledger. It is the most cited document in the folder.
**STANDING: LIVE, and it is the one document that carries RULINGS corrections applied in place.**
Correction 2 (the flat death walk) was edited into it and the corrected text now stands at `:60-66`
with the flat algorithm at `:782-786`, and it cites RULINGS.md by name at `:64` and `:99`.
Two blocks carry explicit annotations, both found by opening the file:
- `:850-851` reads "SUPERSEDED, DO NOT IMPLEMENT THE ABOVE" over the `vic: { arrivesAfter: 3 }` /
  `hollis: { arrivesAfter: 5 }` run-count arrival gate, pointing at RULINGS contradiction C-5.
- `:613` reads "The economy chapter's `r = floor(hits / 40)` formula is STRUCK", because a per-hit
  counter is kill-driven power under a room-clear model.
Two blocks are superseded and NOT annotated, so they read as live and are not:
- `:41-47`, the three-way derived ability (unlabelled button, shape selected from six authored
  deliveries, scale off the square root of the ledger count). RULING 4 killed shape-selection-from-
  nothing and the unlabelled button. The ruling takes the fallback this same passage already names
  at `:46-47`.
- `:65`, the one-page summary still reading "Vic arrives after run 3 and Hollis after run 5", which
  is the same superseded gate its own `:850` block strikes.

### DESIGN_SOURCES.md
31 lines. The standing convention wiring the GameTev research library at `D:\Programs\GameTev\research`
into this repo's design work: where the library lives, the citation rule (report path plus section, at
the claim, no bare "the research says"), the three disciplines that ride along (fidelity, honest gaps,
authority caps), and the rule that a design argument checkable against a report and not checked is
treated as unverified (`:21`).
**STANDING: LIVE. It is a convention, not a design claim, so no ruling touches it.** One known gap,
raised by wave 3 and not yet applied: its domain list at `:23-29` names five relevant domains and does
not include the genres domain, which is why the horror systems argument went ungrounded
(`GROUNDING_AUDIT_3.md:13`, fix C4 at `:175`, size S).

### LIBRARY_INDEX.md
1663 lines, generated by parsing the frontmatter of every report.md under
`D:\Programs\GameTev\research`, selected by `genre_profiles` per that library's LIBRARY_SPEC.md,
not assembled by hand. For each report it prints the path, the word count, and a `determines` list.
**Its purpose is selection: point a design pass at the reports that determine the decision it is
making, by reading the machine-readable `determines` field, instead of guessing at filenames**
(`:29-31`).
**STANDING: LIVE AS A TOOL, DATED AS DATA.** The library is outside this repo and is still being
written, so this file is a snapshot, not a live view. It records 727 reports at `:5`, which matches
what waves 1 and 2 counted; wave 3 counted 729, and RULINGS.md records 729 authored reports on the
evening of 2026-07-30 after four reports were authored in six hours (`RULINGS.md:601-618`). Re-run
the count before quoting coverage, and expect it to have moved. The per-domain table at `:11-27` is
stale in the same direction: `visual` is listed at 2 reports and three new visual reports landed on
2026-07-30, one of which (the visual domain's species-silhouette-morphology report) bears directly on correction 1 and
is flagged in RULINGS.md as required reading before the art bible.

### ENEMY_DESIGN.md
420 lines, dated 2026-07-29. Three chapters: the TTK pivot doctrine, a roster ledger grading every
body in the game against it, and an economy rebalance. Written against the creator's commission that
the game had drifted into survivors-style low-hp fodder.
**STANDING: SPLIT, and the split is stated by COMBAT_ARCHITECTURE.md, which read it and ruled on it.**
- **Chapter 1's TTK bands SURVIVE.** `COMBAT_ARCHITECTURE.md:639`: "Its TTK bands survive untouched:
  they govern hits per body, which this model does not price." Take the bands and the role taxonomy.
- **Chapter 3's income and margin analysis is VOID.** `COMBAT_ARCHITECTURE.md:634-638`: chapter 3
  holds spawn tables and per-kill xp fixed and protects a 3.5% margin, and "Under a room model that
  margin analysis is void and it is not preserved." Income stops being a function of bodies, and the
  gem shower, the magnet and the XP rank machine are all deleted (`COMBAT_ARCHITECTURE.md:58, :93`).
  So the badge-income arithmetic at `ENEMY_DESIGN.md:43` is denominated in a currency system that no
  longer exists.
- **Its measurements are cast-shaped and the cast is gone.** Chapter 1 measures against Max, Junie
  and Gus by name (`:28-37`), and `COMBAT_ARCHITECTURE.md:617-618` calls its 2.2 mean-hits figure "a
  Max-shaped reference figure ... from a cast the premise deletes."
- **Its damage-values carve-out is dead.** `:81` says enemy damage values stay put "because flat
  armour chaff-hit immunity is Gus's identity". Damage was re-authored as integers of 1, 2 or 3 on a
  pip scale with percentage armour replaced by padding charges (`COMBAT_ARCHITECTURE.md:49-51`,
  table at `:416-422`), so both the reason and the values are superseded.

### BOSS_DESIGN.md
637 lines, dated 2026-07-29, the largest file here at 146 KB. One chapter per boss (BRAMBLEBUCK,
MAWMOLE, THE TALLYMAN, THE BEHIND, OLD NOBODY, in night order), and inside each a mechanic ledger:
every mechanic with its code citation, the goal it serves, the library grounding, and a verdict of
KEEPS ITS REASON or HAS NO REASON YET.
**STANDING: THE REASONING SURVIVES, THE NUMBERS DO NOT.** The mechanic-by-mechanic verdicts are the
value here and nothing has overturned them; the file is also where the doc-versus-code conflicts are
recorded honestly (for example the huntSpot permanence conflict at `:183` and `:199`, and the stale
audio-director comment at `:251`). What does not carry: its damage figures are expressed in the
pre-pip float model. Boss damage is now an authored integer, 2 in act 1 and 3 in acts 2 and 3
(`COMBAT_ARCHITECTURE.md:422`), and `DATA.dmgScale` is removed from the boss path at
`js/director.js:325` (`COMBAT_ARCHITECTURE.md:409`), so multipliers like the phase 1 stamp's `dmg
0.8x` (`BOSS_DESIGN.md:31`) and hp pinned to `max(18, round(45*dmgMul))` (`:33`) are quoting a model
that was replaced. Take the argument, re-derive the number. Its cost estimates are also given in days,
which this repo's style rules do not use; size them S/M/L/XL when you carry them forward.

### SAVE_MIGRATION.md
350 lines. A specification only, no code written or changed. It maps the blast radius of cutting the
three old character ids (`max`, `junie`, `gus`) out of `DATA.characters`, file by file with a severity
column, then what an existing player loses, a recommended migration, a test list, and open calls. Its
methodology section at `:26-56` states exactly which greps were run and which matches were excluded as
unrelated, so its coverage claim is auditable.
**STANDING: LIVE, and it is the document that proves the cast cut is a crash, not a rename.** It
documents five Critical rows where cutting the cast throws immediately rather than degrading: the
load-time fallback that resets an unknown `selected` to the deleted `'max'` (`js/meta.js:44`), the
`Run.begin()` fallback chain ending in `'max'` (`js/run.js:807`), the unguarded `Game` constructor
that throws `Cannot read properties of undefined (reading 'hp')` (`js/game.js:87-89, 114`), the
hardcoded Digit1/2/3 shortcuts on the character-select screen (`js/ui.js:2001-2003`), and the camp
scene's spot list dereferencing `DATA.characters[META.selected].name` with no guard, called on every
interaction check (`js/camp.js:850`).
That stale line has been fixed: the document used to record that `RULINGS.md` did not exist yet, and
it now says RULINGS.md exists, outranks it, and is where the cast, roster size and arrival rules are
settled while this document deliberately left them open. Its `:67` row on `js/roster.js:8-20` anticipated the ruling
correctly, and RULINGS C-5 has since moved arrival gating from run counts to milestones the player's
play produces, which is a further change that row does not carry.

### GROUNDING_AUDIT_1.md, GROUNDING_AUDIT_2.md, GROUNDING_AUDIT_3.md
603, 750 and 476 lines, three waves of a research-library grounding pass, all dated 2026-07-29. Each
has the same skeleton: THE HEADLINE (the wave's ranked findings), COVERAGE HONESTLY (which reports
were read, with the numbers the readers actually produced), WHAT MUST CHANGE, THE FIVE SURFACES,
WHAT IS STILL UNGROUNDED, and OPEN CALLS. Wave 1 read controls, HUD, onboarding, accessibility, the
roguelite core, co-op and pre-production QA. Wave 2 read narrative, audio, game-design,
living-world-dialogue, monetization, business-legal, process and engine-tech. Wave 3 read the horror
genre reports, the claude-assisted-engine-build domain, QA and shipping discipline, commercial
strategy, and what an art bible must specify.

**STANDING, and this is the important part: THEY ARE THE RECORD, NOT THE RULING.**

- **What they are still good for.** They are the only place the research library's actual content is
  written down inside this repo. Every finding carries a report path with a section or line range and
  a verification marker (SOURCED means opened and read this wave, RECALLED means summarised by a
  reader and not reopened by the auditor). The coverage tables are the honest account of what has and
  has not been read, including the reading gaps. If you need to know what the library says on a
  question, these are the files. If you need to know which reports have never been opened, the
  COVERAGE sections are the answer.
- **What must NOT be taken from them.** Their recommendations, wherever RULINGS.md resolved the
  point. The three audits disagreed with each other in eleven places, and RULINGS.md C-1 through C-11
  names a winner in every one. Quoting a losing audit sentence into a brief re-imports design the
  creator already killed. Worked examples: audit 3's C15 proposes CAPPING the death walk at banked
  debt 3 and per-survivor 5, and C-1 closes it by ruling in favour of flat; audit 3's item 4 at `:19`
  recommends setting a real pairwise silhouette bar from a silhouette sheet, and correction 1
  retracted the whole pairwise requirement rather than re-baring it; audit 1 filed run-count roster
  arrival under WHAT THE LIBRARY CONFIRMS at `:190`, a heading whose whole purpose is that settled
  things stay settled, and C-5 reopens it explicitly and rules against it.
- **One structural trap named in RULINGS.md itself** (`:521-523`, C-9): two audit sentences can each
  be true at different levels and still produce a brief that argues with itself if both are copied
  verbatim. Cite the ruling, not the pair.
- **One scope decision inside audit 3 is void.** `GROUNDING_AUDIT_3.md:320` placed the multiplayer domain's
  domain out of scope because co-op was ruled direct peer to peer, leaving 13 of its 18 reports
  unread. RULING 1 and C-2 overturned that premise, so the exclusion is void and those 13 reports are
  an outstanding reading gap.
- **Two audit findings have since been closed by things landing on disk**, so do not re-raise them:
  audit 3's item 7 at `:25` reports no `CLAUDE.md` and no agent policy in the repo, and both
  `CLAUDE.md` and `AGENT_POLICY.md` are present at the repo root now; audit 3's item 6 at `:23`
  reports `package.json` with no test script against a smoke test that did not exist, and
  `tools/smoke.cjs` is on disk.

### DIALOGUE_DESIGN.md
123 lines, dated 2026-07-29. The reasoning behind the line book: the commissioning problem, the
diagnosis with its ranked failures, a thirteen-point writer contract binding on all four writer
seats, four voice bibles, what was kept and why, what two adversarial skeptic passes killed, and an
implementation plan.
**STANDING: THE METHOD SURVIVES, THE CAST DOES NOT.** The transferable parts are real and should be
reused rather than reinvented: the slot-preservation discipline (runtime tables, per-slot counts and
key sets are frozen, and arc beat ids are append-only save keys, `:25`), the WORDING IS IDENTITY rule
(every changed line orphans one rendered clip and costs one synth, every unchanged line is free,
`:26`), the render rules and length bounds keyed to the actual wrap and bubble code (`:27-28`), the
crack budget as the load-bearing horror-dialogue move (`:31`), the hide-the-name test for voice
convergence, and the NEVER SAID OUT LOUD list (`:34`). What does not survive: its four voice bibles
at `:41-75` are Max, Junie, Gus and Brock. Max, Junie and Gus were cut by the reboot
(`PREMISE_2.md:952-960` states the cuts and the reasons). Brock survives, but he keeps the name and
loses the species and the rank and becomes the camp's caretaker (`PREMISE_2.md:195`), so his
"scoutmaster procedure lexicon" lever at `:71` is written for a role he no longer holds. Its `:17`
also depends on the teenage-proportion amendment that died with `ART_STYLE.md` and is recorded as
homeless pending the new art bible.

### LINE_BOOK.md
314 lines, dated 2026-07-29. The deliverable: an OLD-versus-NEW table per speaker with a MERGE or
STAGED status on every row, plus the finds, the carvings and the critter squeaks. It is an approval
surface, gated on the creator reading it before any line lands in code (`DIALOGUE_DESIGN.md:106`).
**STANDING: MOSTLY DEAD AS TEXT, LIVE AS A FORMAT.** Three of its four speaker tables are Max
(`:11-59`), Junie (`:62-115`) and Gus (`:116-168`), all cut. Seat 4, BROCK AND THE WORLD (`:169-304`),
is the part with a future: Brock survives as a character, and `PREMISE_2.md:1651-1654` puts real
numbers on it, about 29 of his 72 rendered clips needing re-rendering and about 43 surviving
untouched. The finds, the six NIGHT_CARVINGS and the critter squeaks are world text rather than cast
text and are not cut by the reboot. Nothing here has landed in code: the review gate was never
passed. The format itself (slot, OLD, NEW, status, with skeptic corrections printed inline and the
condemned text preserved in the companion file) is worth reusing for the new cast.

---

## KNOWN GAPS IN THIS FOLDER

Recorded, not fixed by this master.

1. **Seven items are outstanding by RULINGS.md's own account** (`:637-668`): the 13 unread
   multiplayer domain reports (size M), the undecided suspend-and-resume question which gates the
   determinism unit's scope (size S to decide), the unwritten art bible (size L, and rulings 6 and 7
   added four more decisions to it: the eye proportion, which species carry what found human gear,
   whether that gear varies by act or depth, and whether any of it is a readable tell), the ruled
   but undesigned unkillable thing (size L), the five named starting actives that do not exist (size
   L), the character arrival triggers that need authoring as milestones (size S), and the gore
   toggle's unspecified surface and plumbing, meaning the settings UI, the tag vocabulary and the
   filter (size M).
2. **`COMBAT_ARCHITECTURE.md:41-47` and `:65` are superseded and unannotated.** Every other
   superseded block in that file carries a marker. These two do not, so they read as live.
3. **`PREMISE_2.md` open call 29 is answered but still open in the text.** The line book is at
   `docs/preproduction/LINE_BOOK.md` and its reasoning at `docs/preproduction/DIALOGUE_DESIGN.md`;
   the withdrawn clip arithmetic at `PREMISE_2.md:1657-1665` could be restored from the real files.
4. ~~`SAVE_MIGRATION.md` recording that RULINGS.md does not exist.~~ FIXED 2026-07-30, in the same
   commit that landed this master.
5. **`DESIGN_SOURCES.md:23-29` still omits the genres domain**, which is the gap that let the
   horror systems argument go ungrounded through two waves.
6. **`LIBRARY_INDEX.md` is a 2026-07-29 snapshot of a library that is still being written.** Its
   counts are provably behind. Re-run the count before quoting coverage.
7. **The three grounding audits carry no supersession banner.** Nothing inside them says which of
   their recommendations RULINGS.md overturned. That mapping exists only in RULINGS.md C-1 through
   C-11, which is why this master leads with it.
