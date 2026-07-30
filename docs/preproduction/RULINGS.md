# RULINGS

Canon of record for the game working-titled PAST THE TREELINE. Written 2026-07-30.

**This file outranks every other design document on any point where they disagree.** That includes
`docs/preproduction/PREMISE_2.md`, `docs/preproduction/COMBAT_ARCHITECTURE.md`, `COOP_DESIGN.md`,
`BUILD_ARCHITECTURE.md`, `LEVEL_DESIGN.md`, `AUTHENTICITY.md`, `MOTION_DESIGN.md`, the three
grounding audits in this directory, and anything else on disk. Where a document below this one
still carries superseded text, this file wins and the document is wrong until someone edits it.

It exists because the canon is roughly 1.5 MB across a dozen documents, three research grounding
waves overturned a large part of it, the three audits disagree with each other in eleven places, and
two canon claims turned out to be factually wrong. A brief cites this file. A brief does not cite
the design documents.

Every claim here carries a file and a line that was opened during authoring. Sizes are S/M/L/XL.

---

## THE SETTLED DESIGN

Ruled, closed, not up for debate. Sourced from the creator rulings block at
`docs/preproduction/PREMISE_2.md:8-39` plus the rulings recorded in the next section.

1. **THE REBOOT IS TAKEN AS WRITTEN.** Tin cut off the dead, the Reading, the sight cost and the
   cast swap are all accepted. The critic's reframe (survivors inheriting the badge ritual) is
   closed. `PREMISE_2.md:8-9`.
2. **WORKING TITLE: PAST THE TREELINE.** The name search ran clean 2026-07-29. The trademark
   opinion stays open as a pre-store-page item. `PREMISE_2.md:10-13`.
3. **THE FIVE SURVIVORS AND THEIR TOOLS.** One carried tool each, no slots, no weapon pickups, and
   the tool grows for the whole run. DEZ, rock bar, the verb is COMMIT. JUNIOR, snare cable, the
   verb is PREDICT. VIC, spotlight, the verb is FIX. HOLLIS, drip torch, the verb is DENY. MIKEY,
   wrist rocket, the verb is AIM. `COMBAT_ARCHITECTURE.md:32-39`. Mikey is the creator's fifth
   playable, female presenting, pink hair, at `PREMISE_2.md:14-15` and `:50-61`.
4. **TIN AND THE READING.** Tin is the currency and it is Reading-only: it never appears during a
   run. `COMBAT_ARCHITECTURE.md:659`. The Reading is the ritual, one spoken count off `lifetime`,
   once per night, skippable. `PREMISE_2.md:1129` and `:1169`.
5. **THE SIGHT COST.** Taking ledger picks costs sight, priced at the point of decision, with WALK
   ON as the fourth option on every draft. `COMBAT_ARCHITECTURE.md:641-649`. Sight pays the
   pre-room roster read and the crossing route. `COMBAT_ARCHITECTURE.md:651-655`. Bands are LIGHT
   0 to 7, SETTLED 8 to 15, CERTAIN 16 and up. `COMBAT_ARCHITECTURE.md:727`.
6. **DEATH IS ROTATION, NOT GAME OVER, and it is a uniqueness pillar.** Death ends the night. The
   fallen survivor walks back over a flat 2 nights and the player continues as another unlocked
   seer. No escalation, no debt: see CORRECTION 2 below. `PREMISE_2.md:16-21`,
   `COMBAT_ARCHITECTURE.md:60-66` as corrected.
7. **ROSTER OF THREE.** Start with Dez, Junior and Mikey. No roster growth for the first two or
   three runs. Vic and Hollis arrive after that. This replaces lifetime-counter unlocks entirely.
   `PREMISE_2.md:22-25`. The ARRIVAL TRIGGER is reopened by contradiction C-5 below.
8. **NO FIREARMS ABOVE A BB GUN.** The ceiling is a BB gun and it arrives as a legendary drop or a
   late character's carried weapon. `PREMISE_2.md:26-29`.
9. **DIFFICULTY COMES FROM DEPTH PLUS OPT-IN MODIFIERS.** Enemy scaling is by act depth only
   (`COMBAT_ARCHITECTURE.md:416-422`), and the harder night is an opt-in board option, designed but
   not priced and not shipped in this pass (`COMBAT_ARCHITECTURE.md:700-703`). Nothing scales off
   how well the player is doing. The KIND of knob is reopened by contradiction C-4 below.
10. **CONTROLLER REQUIRED, TOUCH DROPPED.** The touch layout cannot express the design: the shipped
    active skill is already unreachable on touch, and hold-to-wind, held-beam and charge-and-release
    are the resting-thumb verbs glass is structurally worst at.
    `COMBAT_ARCHITECTURE.md:1050-1055`, `GROUNDING_AUDIT_1.md:165-166` and `:191`.
11. **ART IS AUTHORED, MADE WITH THE CREATOR'S OWN TOOL.** Procedural and code-generated art is
    rejected. The register is eerie, cute is dead everywhere, and the register spec goes in an art
    bible handed to GTS. `PREMISE_2.md:36-39`. See TASK: ART BIBLE below.
12. **FULL HUMAN VOICE ACTING IS THE TARGET.** `PREMISE_2.md:94`.

---

## RULINGS MADE 2026-07-30

Four new creator rulings. Quoted text is verbatim.

### 1. CO-OP SHIPS AS A SEPARATE TENSE MODE

Co-op ships, and it does not chase fear. Solo is the horror experience; co-op is its own tense mode
with its own tone target, and it is not measured against solo's dread.

Transport is **hole punching plus a relay library**. Raw peer to peer is not shippable: a meaningful
share of PC players sit behind NAT and firewall configurations that defeat direct connection, and
direct connections expose peer IP addresses to each other unless relayed
(`GROUNDING_AUDIT_2.md:25`, sourcing `multiplayer/multiplayer-framework-custom-engine/report.md:83`
and `:173`). The ruling to restate is "no servers that run the game," not "no servers."

**This reopens reading that wave 3 closed.** `GROUNDING_AUDIT_3.md:320` placed the `multiplayer/`
domain out of scope on the grounds that "Co-op is direct peer to peer with no server, already ruled
at `GROUNDING_AUDIT_1.md:315,574`," and left 13 of its 18 reports unread. That premise is now
superseded, so the exclusion is void and those reports are an OUTSTANDING READING GAP. Recorded
below under WHAT THESE RULINGS OPENED. Size M to adopt the transport decision, XL if any of it is
built in-house rather than taken from a library.

### 2. SHIPPING IS STEAM ONLY, WITH A PLAYABLE DEMO ON STEAM

Steam is the only shipping surface. A playable demo ships on Steam alongside the paid game. The free
browser build is **retired as a shipping surface and kept as an internal build target only**.

This supersedes `COOP_DESIGN.md:962-963`, verified, which reads that "backlog task 30 makes the free
web build the funnel for the paid Steam release." It also settles the platform-and-money pairing
that `GROUNDING_AUDIT_2.md:33` flagged as canon contradicting itself. No audit proposed this exact
shape: audit 2 recommended retiring the web build and time-boxing a demo retired at launch
(`GROUNDING_AUDIT_2.md:133-134`), audit 3 recommended trimming the web build to a labelled shorter
demo and keeping it up (`GROUNDING_AUDIT_3.md:431`). The creator's shape is neither. Size M.

Consequence to carry: the browser build stops being a product, so its constraints (cross-engine
float behaviour, browser discoverability, controller-on-web friction) stop being product
constraints. It remains a fast internal build target and nothing more.

### 3. ONE UNKILLABLE THING IN THE WOODS SHIPS

One creature in the woods cannot be killed. It can be avoided and it can be delayed. It can never be
killed. Every other creature in the design dies; this one does not.

This closes the gap audit 3 opened at `GROUNDING_AUDIT_3.md:15` and `:177` (C5), sourced to
`genres/survival-horror/report.md:883-887`, that the unkillable stalker is the most portable dread
system and the design had nothing like it. Size L.

Open and owned by the horror pass, not by this file: what it is, what delays it, what avoiding it
costs, and whether it crosses acts or lives in one.

### 4. THE FLAGSHIP ABILITY BECOMES A SWAPPABLE ACTIVE

Creator's words, verbatim:

> "Its akin to isaac starting items, its what the player starts with but can be swapped out, however
> what would be unique in our game from isaac is the current items a player has dynamically changes
> the current items effect as well."

The shape:

- Each survivor **starts with a NAMED active** the player can see and read. Not derived, not
  unlabelled, not a surprise.
- **Finding another active offers a swap.** One in, one out. The player chooses.
- **The player's PASSIVE items modulate what the held active does.** The same named active behaves
  differently in a different build. This is the part that is not Isaac.

**The three-way derivation from nothing is DEAD.** `COMBAT_ARCHITECTURE.md:41-47` currently
specifies an unlabelled button whose SHAPE is selected by the leading ledger family from six
authored deliveries, whose PAYLOAD is armed through the trait substrate, and whose SCALE is the
tool's damage multiplier times the square root of the ledger count. Shape-selection-from-nothing and
the unlabelled button are both struck. Payload modulation survives in the new form: it is exactly
"the current items dynamically change the current item's effect."

**This needs no new architecture.** The same passage already names the fallback:
`COMBAT_ARCHITECTURE.md:46-47` says the derived ability "ships as the static swappable active if
that question fails." The ruling takes that fallback. And the slot budget already allows for it:
`BUILD_ARCHITECTURE.md:33` reads "a run holds four weapons, one active skill and one keystone, and
those six things are capped forever," and `BUILD_ARCHITECTURE.md:396` reads "**CAPPED AT ONE: the
active skill.** It owns a button." Both verified. One active, one button, swappable. The
architecture already says so.

One consequence to record: `GROUNDING_AUDIT_1.md:169` argued against building an active-slot cap
because it would freeze the ledger count as a scale term. Under this ruling the ledger count is no
longer a scale term for the active, so that argument no longer applies. The cap of one was already
in `BUILD_ARCHITECTURE.md` regardless.

---

## THE TWO FACTUAL CORRECTIONS

### CORRECTION 1: THE SILHOUETTE RULE

**What canon claimed.** `PREMISE_2.md:1874-1876`, verified, headed "Silhouette distinctness is the
worst case that exists," cited `ART_STYLE.md:38-40` as requiring a tell readable at 30 px, and
reported "the measured roster mean was 0.430 pairwise IoU against a 0.60 threshold."

**Three separate failures, all verified at source.**

1. **The cited authority contains no such number.** `ART_STYLE.md:38-40` read, in full, before
   supersession: "**Silhouette carries identity**: each species must read at 30 pixels by outline
   alone (squirrel tail, rabbit ears, boar tusks, owl discs, beaver tail, fox ears, stag antlers).
   Design the silhouette before the details." No IoU, no 0.60, no distinctness metric of any kind.
2. **The 0.60 is a FIDELITY check and it was applied backwards.** It comes from
   `D:\Programs\GameTev\research\visual-trace\scoring-strictness-per-mode\report.md:232`, opened
   and verified: a table row reading "`silhouette-adherence` | not graded | IoU at or above 0.60
   between traced and reference 10x10 occupancy grids." It measures how closely a traced sprite
   matches ITS OWN reference, in one authoring mode. HIGH overlap means GOOD. Canon applied it as a
   DISTINCTNESS bar between DIFFERENT creatures, where LOW overlap would be good. Pass and fail are
   inverted. A 0.430 read as a failure against that bar is, in the number's real direction, not a
   failure of anything.
3. **Even in its correct direction the number is provisional.** The same report tags the whole
   numeric block at `:237-239`: "Every numeric value above (0.60 IoU, plus or minus 8 units, plus
   or minus 20% relative error, the one-mismatch tolerance) is this report's own reasoned default."
   It is a report's working default, not a library floor.

**The creator then replaced the requirement entirely rather than correcting the number.** Verbatim:

> "there is no reason 2 outlines couldnt be similar, like what if 2 people describe a similar dog
> you know? the point is it shouldnt make the same dog for 2 different users"

Pairwise distinctness across the roster was never the right measurement. Two creatures that resemble
each other in life are SUPPOSED to resemble each other on screen. A rabbit and a hare reading
similarly is correct, not a defect.

**WHAT REPLACES IT.**

- **IN-PLAY READABILITY, measured per creature and never per pair.** Does this creature read as what
  it is, at true game scale, in motion, with its tell named. That is the rule `ART_STYLE.md:38`
  already stated correctly, and it is the one rule of that document carried forward into the stub
  that replaces it.
- **SEPARATION IS REQUIRED ONLY BETWEEN CREATURES THAT SHARE A ROOM.** Two creatures that never
  spawn together carry no distinctness obligation toward each other, so the check is against the
  real spawn tables rather than an abstract N-by-N matrix.

  Where those tables live, opened and verified: **`js/rooms.js`**. Each room definition carries a
  `cast:` weight map naming exactly the species that room can deal (for example
  `js/rooms.js:247`, `cast: { rabbit: 2.2, doe: 1.4, squirrel: 0.7, chipchoir: 0.6 }`), plus a
  `waves:` array whose spawn entries either draw from that cast with `id: 'auto'` (for example
  `js/rooms.js:225-229`) or name a species outright. Named set pieces live in `WAVE_TEMPLATES` at
  `js/rooms.js:107`, six of them, each with an explicit species list (for example `js/rooms.js:111`,
  `spawns: [{ id: 'rabbit', n: 26, mode: 'ring', r: 291 }]`); a room's wave calls one by name through
  the `ref` field documented at `js/rooms.js:70-71`. The co-occurrence set for any creature is
  therefore derivable: union of every room `cast` it appears in, plus every `WAVE_TEMPLATES` entry
  and inline wave that names it.

  Correction to a common assumption: **`js/data.js` holds no wave or formation tables.** A grep for
  `formation|FORMATION|waves|WAVES` over `js/data.js` returns zero matches. What `js/data.js` holds
  is the stat tables the room tables reference by id: the species rows at `js/data.js:152-196` and
  the five bosses at `js/data.js:255-261`.
- **NON-CONVERGENCE IS NOT THIS GAME'S REQUIREMENT.** "Two users must not get the same thing" is a
  property of a GENERATOR, not of a shipped asset. This game ships one authored set of creatures,
  the same set for everybody, which is correct. Non-convergence belongs to the creator's separate
  tool track and is out of scope here.

**RETRACTED TOGETHER, all three:** the 0.430 measurement, the 0.60 figure, and the claim that
silhouette distinctness is this game's worst problem. It was not this game's worst problem and it
was not measured against a real bar.

Applied to canon on 2026-07-30. The claim stood at the pre-edit `PREMISE_2.md:1874-1876` and was
rewritten in place; post-edit the surviving ask (the human cast has no assigned identity signals)
is at `PREMISE_2.md:1879`. `ART_STYLE.md` was superseded to a stub in the same pass, so the
citation it could not support no longer exists to be miscited. No errata section was added; this
file is the record of what changed.

### CORRECTION 2: THE DEATH WALK

**What canon encoded.** An escalating absence with banked debt, in three places, all verified:

1. `COMBAT_ARCHITECTURE.md:60-66`, the prose ruling: the fallen survivor "walks back over 2 plus
   their lifetime fall count nights, never reset," and when the roster would empty "the unserved
   nights bank as debt against the next fall, so the lever bites hardest on the player who dies
   most."
2. `COMBAT_ARCHITECTURE.md:771-773`, the state schema, declaring `META.falls` ("lifetime falls,
   monotonic up, never reset") and `META.debt` ("nights owed but not served").
3. `COMBAT_ARCHITECTURE.md:784-795`, the algorithm: `owed = 2 + META.falls[id] + (META.debt[id] ||
   0)`, a zero-sendable branch banking `owed` in full, a per-walk cap of `Math.min(6, owed)` with
   the residual carried, closing at `:795` with "First fall: 3 nights out. Fourth fall: 6 nights
   out. Never resets."

**THE RULING: FLAT.** Death ends the night. The survivor returns after a couple of nights, the same
couple every time. **No escalation. No debt. No lifetime term in the walk length.**

`META.falls` survives as a lifetime tally the Reading can speak, because it is a record and not a
lever. `META.debt` is deleted outright.

Applied to canon on 2026-07-30. Edited at these PRE-EDIT line numbers, which is where the superseded
text stood before the fix: `COMBAT_ARCHITECTURE.md:60-66` (the prose ruling), `:773` (the
`META.debt` field), `:777-781` (the write-ordering worked numbers), `:784-795` (the algorithm),
`:797-803` (the banking defence), `:827` (the carryover list), `:98` (the ruling-6 interpretation
fork), `:836` (the lore verdict's closing line), `:1130` and `:1132` (implementation ledger units 4
and 6, which listed `debt` as a migration field and "the debt-banking short walk" as a deliverable).
The last six are the same mechanic's other encodings; leaving them would have orphaned the
correction. Post-edit, the death rotation ruling still stands at `COMBAT_ARCHITECTURE.md:60-66` and
the flat algorithm is at `:782-786`.

---

## THE CONTRADICTIONS, RESOLVED

The prior read-only pass identified **eleven** places where the three audits disagree with each
other, not nine. Two of the eleven (C-7 and C-8) are pure counting disputes with no design content
and are settled under PINNED NUMBERS below. That leaves **nine design contradictions**, resolved
here. All eleven are listed so none of them can be re-imported later.

### C-1. THE DEATH WALK. Audits 1 and 2 win.

`GROUNDING_AUDIT_1.md:108-109` says flatten `owed` to 2, delete `META.debt`, move escalation to the
opt-in ladder. `GROUNDING_AUDIT_2.md:226-227` marks it "CONFIRMED, already struck by wave 1" with
two further citations. `GROUNDING_AUDIT_3.md:197` (C15) proposes CAPPING instead, banked debt at 3
and the per-survivor walk at 5, and labels those numbers "a pick and not a citation."

**Resolution: flat, per CORRECTION 2. Audit 3's C15 is CLOSED BY RULING, not carried forward.** Any
ledger that re-imports a bounded escalation is re-importing something the creator already killed.

The harsher walk has one legitimate home and it is already written: `GROUNDING_AUDIT_1.md:263`, rung
8 of the opt-in night ladder, verbatim "a fall costs four walk nights instead of two." Opt-in only,
never the default.

### C-2. CO-OP TRANSPORT. Audit 2 wins.

`GROUNDING_AUDIT_2.md:25` and `:109-110`: direct player to player "cannot ship as stated," adopt hole
punching plus relay as a non-optional layer. `GROUNDING_AUDIT_3.md:320` treats direct peer to peer
as settled, citing `GROUNDING_AUDIT_1.md:315` and `:574` (both verified: peer, no host handover), and
uses it to place `multiplayer/` out of scope, leaving 13 of 18 reports unread.

**Resolution: audit 2 wins, and RULING 1 above adopts it.** Audit 3 rested its scope decision on a
ruling that had already been overturned by the time it wrote. **The 13 unread multiplayer reports are
now a real reading gap and are recorded as OUTSTANDING below.** Resolving C-2 changes audit 3's
reading plan, not only the co-op design.

### C-3. SHIPPING SURFACE. Settled by creator ruling, in a shape no audit proposed.

Three dispositions were on the table: `GROUNDING_AUDIT_2.md:133-134` (retire the web build, keep it
internal, Steam primary and premium), `GROUNDING_AUDIT_3.md:431` (option B, trim the web build to a
labelled shorter demo and keep it up), and audit 2's separate demo shape (time-boxed, retired at
launch). Canon committed to a fourth thing at `COOP_DESIGN.md:962-963`.

**Resolution: RULING 2 above. Steam only, plus a playable demo on Steam, web build internal.** None
of the three audit dispositions is adopted as written.

### C-4. DIFFICULTY KNOBS: STAT DIAL VERSUS SCARCITY DIAL. Both, split by audience.

`GROUNDING_AUDIT_1.md:102-103` wants an incoming damage dial, sourced to
`ux-accessibility/difficulty-assist-systems-accessibility/report.md:275`, framed as ACCESSIBILITY,
labelled "Enemy Damage" and not "Easy," explicitly separated from run risk.
`GROUNDING_AUDIT_3.md:219` (C26) says "the cleanest horror difficulty knob is resource availability,
not enemy HP/damage," sourced to `genres/survival-horror/report.md:335`, and sidesteps rather than
resolves the assist dial by saying "No conflict with opt in itself."

**Resolution: they answer different questions and both ship, but they must be labelled differently
and must never share a screen.** Reasoning: audit 1's dial exists so a player who can execute but
cannot survive mistakes can finish the game at all; it is an accessibility control and it must not
be presented as a difficulty setting. Audit 3's dial exists to make the game HARDER for a player who
wants that, and scarcity is the right lever there because it raises tension where enemy HP raises
frustration. The failure mode is putting them in one list, where the accessibility dial reads as
"Easy" and the scarcity dial reads as a stat tweak. Two surfaces, two vocabularies.

One thing audit 1 did not reconcile with itself: its own opt-in night ladder at
`GROUNDING_AUDIT_1.md:263` mixes both kinds, with a rung reading "ranged shot damage +1 in act 3,"
which is a stat dial sitting on the difficulty side. **That rung is to be re-authored as a scarcity
rung when the ladder is priced**, since settled design item 9 puts the harder night on the board and
`COMBAT_ARCHITECTURE.md:700-703` confirms it is designed but not priced. Size M for the split, S for
the ladder rung.

### C-5. CHARACTER ARRIVAL GATING. Audit 2 wins, and this is EXPLICITLY REOPENED.

`GROUNDING_AUDIT_1.md:190` filed run-count arrival under WHAT THE LIBRARY CONFIRMS: "Roster arrival
gated on run count. A knowing departure from `:578`, and a safe one." `GROUNDING_AUDIT_2.md:29` and
`:124-125` rule the opposite: `narrative/story-structure-interactive-media/report.md:363` reads
"Never gate the meta-arc's beats on time or run-count alone, gate on milestones the player's play
produces."

**Resolution: audit 2 wins. Gate Vic's and Hollis's arrival on milestones the player's play
produces, not on a raw run count.** Audit 2 read the narrative domain, which wave 1 did not read at
all, so it has the better standing.

**THIS ITEM IS EXPLICITLY REOPENED.** Audit 1 filed it under a heading whose whole purpose is that
settled things stay settled, so without this paragraph it reads as closed. It is not closed.
`COMBAT_ARCHITECTURE.md:850-851` still carries `vic: { arrivesAfter: 3 }` and
`hollis: { arrivesAfter: 5 }`, and `:864-866` still defends it. That text is superseded by this
ruling and was NOT edited in this pass. Size S to change, and it lands in implementation ledger unit
4 (`COMBAT_ARCHITECTURE.md:1130`).

### C-6. DETERMINISM SCOPE. Same machine only. Audit 3 must be corrected.

`GROUNDING_AUDIT_1.md:307` specifies "same seed plus same inputs replays a night exactly" with a CI
grep gate. `GROUNDING_AUDIT_2.md:27` amends the scope to same platform only, sourced to
`multiplayer/deterministic-simulation/report.md:80` ("scope to same-platform determinism only unless
cross-play is an explicit, funded goal") and `:87`, and states outright that this overturns one of
wave 2's own recommendations. `GROUNDING_AUDIT_3.md:201` (C17) then cites wave 1's version
approvingly without carrying wave 2's scope correction.

**Resolution: SAME BUILD, SAME MACHINE ONLY.** Cross-computer replay determinism is not a target and
is not to be budgeted. Audit 3 propagated the un-amended version and is corrected here. Note that
RULING 2 strengthens this: with the browser build retired as a product, cross-engine float behaviour
stops being a shipping concern at all. Size S to write down, M for the fixed-timestep and seeded-RNG
unit itself.

### C-7. THE `Math.random` BASELINE COUNT. Not a design conflict. Settled under PINNED NUMBERS.

Three numbers exist because three scopes were used: `COOP_DESIGN.md:955-961` counts seventeen direct
calls in simulation files, `GROUNDING_AUDIT_2.md:107` says 55 across 14 files,
`GROUNDING_AUDIT_3.md:201` says 57. All three are arithmetically correct under their own scope. See
PINNED NUMBERS.

### C-8. LIBRARY SIZE AND COVERAGE DENOMINATORS. Not a design conflict. Settled under PINNED NUMBERS.

`GROUNDING_AUDIT_1.md:43` and `:69` use 727. `GROUNDING_AUDIT_2.md:45` and `:73` use 727.
`GROUNDING_AUDIT_3.md:135` uses 729 and notes `visual-trace/` grew by two. The library grew between
waves. See PINNED NUMBERS.

### C-9. THE CAMP BOARD: two entries struck versus the board credited. Compatible, both stand.

`GROUNDING_AUDIT_1.md:132-133` strikes two specific board entries, "the night's first room entered
with the tool already at conviction 3" and "10 scrip in the pocket" at `COMBAT_ARCHITECTURE.md:695`,
because "the compelling version unlocks options, not strength"
(`game-design/game-meta-features-systems/report.md:527`). `GROUNDING_AUDIT_3.md:273` credits the same
16-entry board at `COMBAT_ARCHITECTURE.md:690-703` as "exactly the shape
`in-game-economy-design-balancing/report.md:72` asks for" and files it under what the library
confirms.

**Resolution: both stand, and they are not in conflict once you separate the levels.** Audit 3 is
judging the board's POSTURE (options not strength, nothing buys a survivor), which is correct and
stays confirmed. Audit 1 is judging two INDIVIDUAL ENTRIES that violate that same posture. A board
that sells options is right; two entries inside it that sell strength are wrong, and striking them
makes audit 3's verdict more true rather than less. **Strike the two entries. Keep the board.**
Audit 1 names four replacements (a pre-chosen first escalation branch, the act 1 sit, a choice of two
act 1 entrances, the thermos at 4 pulls) and the total stays 16 entries at 6,400 tin. Size S.

The collision is a transcription hazard, not a design one: an implementer who copies both audit
sentences verbatim into one brief will produce a brief that argues with itself. Cite this ruling
instead.

### C-10. THERMOS MARKS VERSUS THE TIN STAMP. Both stand. Audit 2's own flag is over-read.

`GROUNDING_AUDIT_1.md:129-130` (item 15) wants the thermos charge marks out of the health pip row
and into their own slot in the same cluster, because merging two resources into one chunk fails the
"two resources told apart when both are low" test. `GROUNDING_AUDIT_2.md:175-176` (item 27) keeps the
tin stamp as a world object and keeps combat readouts plain, and notes of itself: "It also cuts
against wave 1's item 15."

**Resolution: both stand. Audit 2 flagged a tension that does not actually exist.** Item 15 is about
WHERE a readout sits inside the HUD vitals cluster. Item 27 is about whether a readout should be
rendered AS a diegetic object instead of as HUD. Giving the thermos its own plain slot in the vitals
cluster satisfies both: it is not merged into the pip row, and it is not routed through the tin
stamp. The tin stamp stays a world object and a between-runs screen. Size S each, and they can be
done in the same unit.

### C-11. SUSPEND AND RESUME. Audit 2 wins: it is undecided, so decide it.

`GROUNDING_AUDIT_1.md:273` (surface F) asserts two save behaviours as hard floor rows and instructs
building both. `GROUNDING_AUDIT_2.md:199-200` (item 35) says decide in writing whether a night can be
suspended and resumed, and notes that nobody in either wave was assigned the governing report, which
the determinism auditor read unassigned.

**Resolution: audit 2 wins on process. Audit 1 asserted a requirement from an unassigned reading, so
it is not settled and must not be transcribed as a floor.** This is a live creator decision and it is
recorded as OUTSTANDING below.

Reasoning for why this one cannot be quietly defaulted: the answer changes the determinism unit's
scope. `qa-testing/save-load-persistence-state-testing/report.md:71`, as quoted at
`GROUNDING_AUDIT_2.md:200`, requires a mid-run save to carry the RNG stream position and to resume
"byte-for-byte identical to how it would have played uninterrupted," with any drift a
blocker-severity bug. If suspend-and-resume ships, the RNG cursor becomes a save field and a test
gate; if it does not, it does not. That is a size difference inside C-6's work, so deciding it late
is expensive. Size S to decide, M in consequence.

---

## PINNED NUMBERS

Three documents state these differently. These are the numbers, with their scopes, and each was
re-run on 2026-07-30.

### The `Math.random` baseline: 55 occurrences at top level, of which 51 are real call sites

Grep run: `grep -o 'Math\.random' js/*.js | wc -l` in `D:\Programs\merit-badge-massacre`. Result:
**55 occurrences across 53 lines in 12 files** (`js/render.js:1854` carries three on one line).

**Reported honestly, because the count does not mean what the brief for this file assumed.** The 55
INCLUDES comment prose, not just call sites. Four of the matched lines are comments mentioning
`Math.random` rather than calling it: `js/traits.js:53`, `js/traits.js:79`, `js/pool.js:230`, and
`js/game.js:241`. The brief named only `js/traits.js` and `js/pool.js`; `js/game.js:241` is a fourth.
Removing all four gives **51 real call sites across 49 lines in 11 files** (`js/traits.js` drops out
entirely, since both of its matches are comments).

**PINNED: 51 real call sites, scoped to top-level `js/*.js`, excluding comment-only mentions. Use 55
only when quoting the raw grep.** Every ratchet and CI gate cites 51 and states this scope.

The other two numbers reconcile exactly once scope is stated, which closes C-7:

- **57** (`GROUNDING_AUDIT_3.md:201`) is the RECURSIVE count under `js/`. Verified:
  `grep -ro 'Math\.random' js/ | wc -l` returns 57 across 14 files. The extra two are
  `js/music/src/synth.js:1` (a real call site, outside the simulation) and
  `js/music/src/README.md:1` (a markdown file, not code at all).
- **14 files** (`GROUNDING_AUDIT_2.md:107`) is the recursive file count. Audit 2 paired the
  top-level occurrence count (55) with the recursive file count (14), which is why its sentence
  reads oddly. Neither number was wrong; they came from two different runs.
- **Seventeen** (`COOP_DESIGN.md:955-961`) counts direct calls in the SIMULATION files only, which
  is a narrower set than either.

### The research library denominator: 729 report directories

Counted at `D:\Programs\GameTev\research` on 2026-07-30. `find . -mindepth 2 -maxdepth 2 -type d |
wc -l` returns **732**. Three of those are infrastructure, not topics: `visual-trace/_index`,
`visual-trace/_scripts`, and `_sweeps/mention-census-2026-07` (`_sweeps` is not a research domain;
the other 22 top-level directories are). **732 minus 3 is 729**, which matches
`GROUNDING_AUDIT_3.md:135` exactly, including its stated exclusion of `_sweeps`.

**DO NOT PIN THIS NUMBER. THE LIBRARY IS LIVE AND IT GREW WHILE THIS DOCUMENT WAS BEING WRITTEN.**

Wave 1 and wave 2 counted 727 (`GROUNDING_AUDIT_1.md:43`, `GROUNDING_AUDIT_2.md:45`). Wave 3 counted
729. This document's first draft counted 729 topic directories against 728 authored reports and
footnoted the gap as `visual/stylized-proportion-registers`, a topic with no report yet. That
footnote was true when written and false within the hour: the orchestrator re-ran the count the same
evening and got 729 authored reports, because that report was authored at 16:01 on 2026-07-30, along
with `visual/species-silhouette-morphology`, `visual/smooth-body-construction` and
`asset-forge/sprite-animation-pose-recipes`. Four reports in six hours.

The cause is not an error anywhere. The creator authors library reports in a separate window while
this project runs, so the denominator moves under any document that quotes it.

**THE RULE, which replaces the pinned number:** every coverage figure carries the date and the
command that produced it, never a bare count. Re-run
`find . -name report.md | wc -l` at `D:\Programs\GameTev\research` before quoting coverage, and
expect it to differ from the last time. Recorded measurements so far: 727 (waves 1 and 2), 729
(wave 3), 729 authored reports at 2026-07-30 evening.

NOTE FOR THE ART WORK: three of the four newest reports are visual, and
`visual/species-silhouette-morphology` bears directly on correction 1 below, which replaced this
project's silhouette requirement. Read it before the art bible is written.

### Reports read across the three waves: 288

Verified by opening all three coverage tables: `GROUNDING_AUDIT_1.md:69` reads 103 of 727,
`GROUNDING_AUDIT_2.md:71` reads 99 this wave for a running 202 of 727 at `:73`, and
`GROUNDING_AUDIT_3.md:151` reads 86 in wave 3 for a running 189 of 729 at `:153` with wave 2
uncounted. **103 plus 99 plus 86 is 288.**

**PINNED: 288 of 729, which is 39.5 percent.** Neither audit 2's 202 nor audit 3's 189 is the full
figure: each was missing a wave the other had. Note audit 3 excluded wave 2 explicitly because it
was still in flight, so 189 is honest for what it claimed and wrong as a total.

---

## WHAT THESE RULINGS OPENED

Outstanding, tracked, not resolved by this file.

1. **13 unread `multiplayer/` reports.** Reopened by RULING 1 and C-2. `GROUNDING_AUDIT_3.md:320`
   lists the domain at 18 reports with 5 read, excluded on a premise that no longer holds. The
   reading gap is real. Size M.
2. **Suspend and resume is undecided.** C-11. It gates the shape of the determinism unit. Size S to
   decide.
3. **The art bible is not written.** ART_STYLE.md was superseded on 2026-07-30 and replaced with a
   stub; nothing replaces it yet. Tracked in the plan at `~\.claude\plans\`. Size L. Two specific
   things died with that file and need a decision in the new bible: the two-tier line weight rule,
   and the teenage-proportion amendment that four other documents cite. Both are recorded in the
   ART_STYLE.md stub.
4. **The unkillable thing is ruled but not designed.** RULING 3. Size L.
5. **The named starting actives do not exist.** RULING 4 requires one named active per survivor,
   five of them, plus the passive-modulation rules. Size L.
6. **Character arrival triggers need authoring.** C-5. Milestones, not run counts. Size S.
