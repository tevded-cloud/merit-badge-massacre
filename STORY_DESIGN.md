# STORY DESIGN

Merit Badge Massacre. Written 2026-07-28. This document supersedes every earlier note about
onboarding, story cadence, unlock staging and the long game. Every claim about the current
build carries a file path and a line number, and every one of them was read in this repo at
commit c0740d2. Where a number is an estimate rather than a measurement, it says so.

---

## 0. THE SPINE

This is settled. It is the canonical statement of the premise and every future brief cites
this section. Nothing below it may contradict it.

**Belief is sight, and it runs out.** A cryptid is only real while it is believed in, so you
cannot see what you do not believe in. To an adult the ridge at night is empty woods: not
dangerous, not safe, just trees. Belief fades as you grow up and sight fades with it.

- **Small children** believe totally and see everything, and are far too young to be sent
  anywhere. They are at the camp. They are who you are protecting.
- **Teenagers** are the narrow window: still believing, so still able to see, and finally old
  enough to carry a pack, swing a hatchet and walk all night. The player characters are
  teenagers. This is a change. The shipped art brief describes scouts who look about eleven
  and that is now wrong.
- **Adults** cannot see at all. This is why the counselors do not go. Not cowardice,
  incapacity. The woods stopped showing themselves to them.

**The window is closing on the player personally, and that is the real clock in this game.**
The threat is not only dying. It is aging out: one more season and you are just another adult
at the fire who cannot see what is standing in the trees.

**Badges are proof of witness, so the progression system is the horror.** The scouts go out to
earn badges, which is the ordinary in-fiction reason a kid walks into the woods and needs no
justification. But a badge is a signed statement that you saw something. They think they are
earning merit. They are being Signed in instalments, with a ceremony each time. The Badge
Board is complicity, not power. The Field Guide stops being an encyclopedia and becomes
evidence against its author.

**The catalyst: the woods finally starved.** The world got mapped, floodlit and surveyed until
belief fell below the line that keeps a cryptid whole. For thirty years the Sign spread slowly
and quietly, because patience is all a hiding thing can afford. Then the last unmapped stretch
of the ridge went under and patience stopped being an option, so they began Signing everything
that moves at once. That is why the forest went from strange to hostile in one season and why,
this week, it reached the road.

**This is why these scouts can win when nobody could before.** A cryptid at full belief cannot
be hurt by anyone. That is why Troop 12 died and Brock walked down alone: there was never
anything to fight, only something to survive. This is the first generation of them that can
bleed. The player is not braver. The player is late enough.

**The tragedy, which is the point:** being witnessed is the thing they needed, and being
killed is the thing they were avoiding, and the player does both in the same act. The win
condition and the tragedy are identical. Do not resolve this.

**The cold open replaces the tutorial entirely.** The game opens with the player waking alone
in the woods on the night the forest reached the road. That IS the tutorial: you learn to move
because you are moving, to dodge because something came at you and nobody warned you. No menu,
no volunteering, no skip prompt, because it is the story. It ends when you find Camp
Hearthwood.

**The camp is survivors, and it starts as a dump.** Camp Hearthwood is a real, old scout camp,
and the people in it are survivors who got there the same way the player did, in the last week.
Nobody is staff. Nobody chose to be responsible for a child. Every building already painted
stays exactly as it is; what inverts is who is in them and why. A trading post run by a
quartermaster is charming. A trading post run by whoever found it, out of someone else's
stock, is not. Brock has been there thirty years and everyone else arrived last week. He is
the one they trust because he knows the woods. He is also the one who was Signed at eleven.
They do not know what he is. Being Signed is what froze his belief, so he is the only adult
alive who can still see, which is a tell an attentive player can catch long before the reveal.

**The camp is built by the player, from a dump into a working camp.** Camp growth is currently
four silent tiers keyed on lifetime totals (`META.tier()`, js/meta.js:143-150). It becomes
construction the player chooses. This is real scouting craft (pioneering: lashings, spars,
towers, gadgets) and it must be accurate, which is a standing directive for the whole game:
the right knot, the right lashing, the right boat for the right water. A camp lake is still
water, so it is canoes and rowboats and a flat bottomed jon boat, never a fly rod and never a
craft that belongs on a river. Getting it right costs the same as getting it wrong and is
noticed by everyone who has ever done it.

**The younger scouts at camp are named characters.** Children who believe, who can see, and
who cannot be sent. The player characters are the older kids looking after them, which real
scouting has vocabulary for (patrol leader, senior patrol leader, scoutmaster: worldwide terms
going back to 1908, safe to use, unlike any organisation's specific insignia). Nobody
appointed anyone. The kids use the old camp's job titles because those are the only rules
anybody can remember. They are holding on to the vocabulary of a functioning world. Let that be
quietly sad rather than explained.

**Cutscenes: the player keeps the controller.** Every frame of art is code-painted and there is
no artist to draw cinematics, so "cutscene" means things happen around a player who can still
walk. Reserve exactly one true cinematic, where control IS taken, for the True Dawn reveal,
because there taking control away is the content.

**Tone order, locked:** cute, then wrong, and the wrong is allowed to stay. Humour belongs to
characters (Brock is genuinely funny), never to reassurance. Do not resolve discomfort at the
end of a beat. Gore is permitted at Isaac's level but is toggleable, so nothing load-bearing
may depend on it.

---

## 1. THE ONE PAGE

**What is wrong today.** The whole main story is twelve dialogue boxes, about 575 words, behind
a button nobody is told to press (js/dialogue.js:152-256). Nothing limits how many fire per
visit (js/dialogue.js:284-297), so all twelve can empty in one conversation, and a player who
wins their first night arrives with ten of them ready at once. After the first sunrise there is
no new story ever again.

Meanwhile the camp grows a cabin, a lakeshore and a dock while the player looks at a death
screen, with no line, no sound and no camera move (js/meta.js:143-150, js/camp.js:1446-1458).
Two playable characters wake up and the code written to announce them discards it
(js/roster.js:35-37, js/ui.js:918). Eight weapons, patches and skills enter play silently. The
field guide has three entries for twenty one creatures. Half the Troop 12 story is saved and
never shown (js/ui.js:570-591). Turning subtitles off destroys queued story (js/ui.js:858-865).

**What we are doing about it.**

1. **The cold open becomes the tutorial and the first chapter at once.** You wake alone in the
   woods. Movement, then a Signed doe who watches you and does not attack, then a hatchet in a
   stump, then the first thing that comes at you, because now you are armed and therefore a
   witness. Then firelight. Nothing is explained.

2. **One rule governs delivery forever: every camp arrival stages exactly one thing and speaks
   everything else, and the one thing it stages is always the one the night just earned.**

3. **Unlocks become moments in three fixed tiers,** with a budget of eight staged scenes across
   a whole save. The Tally Post gets three of them.

4. **The Field Guide becomes the pull.** Twenty one plates, nine still blank, printed on the
   page. Every creature gets a name and an entry: eighteen payouts aimed at the stretch of
   playtime that currently has none.

5. **The held twist gets five plants and one payoff,** and every plant is walkable past.

**What this costs.** About 180 lines of new writing, roughly 2,600 words. Two or three small
painted props. One large piece of engine work (Brock becomes a character who can walk,
js/camp.js:2973) and one medium one (combat with every reward switched off). One new save field
whose transfer migration must be exact or every camp code in the wild stops working.

Six waves. The game ships after each one.

---

## 2. THE MEASURED STATE

Everything in this section was read. Nothing is estimated except where marked.

### 2.1 What story exists

| Thing | Count | Where |
|---|---|---|
| Brock arc beats (the whole main story) | 12 beats, 24 sentences, about 575 words | js/dialogue.js:152-256 |
| Brock intro lines | 2, of which index 1 is unreachable | js/dialogue.js:93-95, only [0] returned at js/dialogue.js:353-357 |
| Brock death reactions | 13 keys covering 9 of 18 species | js/dialogue.js:96-110 vs js/data.js:152-196 |
| Brock idle pool | 7 | js/dialogue.js:115-124 |
| Brock blink lines | 3 | js/dialogue.js:126-132 |
| Brock tally post lines | 6 | js/dialogue.js:134-141 |
| Brock merit badge lines | 3 | js/dialogue.js:144-148 |
| Quartermaster | 1 intro, 1 ledger line, 6 idles | js/dialogue.js:378-402 |
| Rescued squirrel | 5 | js/dialogue.js:414-421 |
| Scout barks | 34 per scout, 102 total | js/dialogue.js:6-58 |
| Field finds | 24 (14 Troop 12 relics, 10 trail signs) across acts 9 / 8 / 7 | js/finds.js |
| Merit badges | 14, of which 3 hidden | js/feats.js:94-232 |
| Deeper Nights carvings | 6 | js/feats.js:469-500 |
| Creatures with a name the player can read | 3 of 21 | js/data.js:152-196 (18 species, no name or desc field), js/data.js:207-211 (3 bosses) |
| Boss battle lines | 3 | js/dialogue.js:71-75 |
| Killer display names, with zero readers anywhere | 12 | js/dialogue.js:64-69 |

Brock's total addressable pool is 48 lines. The barks are 102, they fire far more often than
Brock does, and every single one is a gag including the death set. Nobody has counted them
against the tone pivot before. See section 12, question 3.

### 2.2 Scene versus pull versus silent

Definition used here. A trip point is **SCENE** if something happens on screen at the moment it
trips or on the very next screen the player sees, without them choosing to go and ask. It is
**PULL** if the content exists but only arrives when the player walks somewhere and presses E
with no indication that anything is waiting. It is **SILENT** if nothing happens anywhere.

There are 45 progression trip points and 14 derived unlocks that hang off them.

| | SCENE | PULL | SILENT |
|---|---|---|---|
| 4 camp growth tiers (js/meta.js:143-150) | | | 4 |
| 2 scout unlocks (js/roster.js:8-20) | | | 2 |
| 1 tally post opening (js/feats.js:512) | | 1 | |
| 14 merit badges | 12 (js/ui.js:929-942) | | 2 (js/ui.js:1961-1963, 2049) |
| 12 Brock arc beats | | 12 | |
| 4 Blink friendship stages (js/camp.js:1215-1234) | 4 | | |
| 2 first meetings (Brock, Quartermaster) | | 2 | |
| 2 act depth flags (js/room.js:262-271) | | | 2 |
| 3 boss-down flags (js/game.js:403-409) | 3 | | |
| 1 rescued squirrel arriving (js/camp.js:778-796) | | | 1 |
| 8 pieces of content entering the pools (js/feats.js:259-263) | | | 8 |
| 6 camp cosmetics | 1 (birdhouse row) | | 5 |
| **Total, 59 events** | **20** | **15** | **24** |

Two sounds fire for progression in the entire game: `AudioSys.play('levelup')` at js/ui.js:942
for a batch of merit badges, and the same call at js/camp.js:1333 for the birdhouse. Nothing
plays for a camp tier, a scout waking, the tally post opening, a Blink stage or any cosmetic.

There are zero scripted camera moves in the camp. js/camp.js:994-1004 is the entire camp
camera: a lerp toward the player and a clamp to the grounds. That single missing tool is why
every unlock is either a text message or nothing.

### 2.3 The current beat cadence

Verified gate clustering, which is why the drip does not drip:

- **Beats 4 and 6 always arrive together.** `flags.act1boss` is written when BRAMBLEBUCK dies
  (js/game.js:403-409 inside `recordBoss`); `flags.act2` is written by the room the player
  walks into seconds later (js/room.js:262-271). Both are only read back at the fire.
- **Beats 10, 11 and 12 are set by one enemy death in one frame.** Killing OLD NOBODY calls
  `recordBoss` (completing `threeKills` and setting `act3boss`), then `if (e.final)
  this.triggerDawn()` fires from the same `killEnemy` (js/game.js:439), and `META.credit`
  increments dawns (js/meta.js:126).
- **Beat 2, which explains the tin token and therefore the whole premise, sits behind one of
  the deepest gates in the game.** Its gate is `arcCodexCount(m, 'seen') >= 2`
  (js/dialogue.js:164) and the codex is only ever written for bosses (js/game.js:418 and
  js/game.js:713), so two sightings means reaching the second boss arena.
- **There is no per-visit lock anywhere.** `brockLine` is called on every E press at the fire
  (js/camp.js:1404-1411 via js/ui.js:1885-1901) and `nextArcLine` returns and consumes a beat
  per call (js/dialogue.js:284-297).

Result, and this is an estimate derived from the HP budget and the playtest note checked in at
js/data.js:200-206 rather than from measured play: twelve authored beats arrive across roughly
five conversations. A player who wins on their first night gets ten of the twelve in one.
After that first dawn, `BROCK.arc` is exhausted forever and every camp visit returns one of 7
idle lines, 3 blink lines, 6 tally post lines or 3 badge lines.

### 2.4 Things a new player is never told

All verified in this repo.

- That the dodge has 0.30 seconds of invulnerability. The only statement anywhere is the
  literal string `IFRAME 0.30s`, built at js/ui.js:1164, inside the pause panel.
- That the dodge is also right mouse button and both Shift keys (js/ui.js:1986).
- That Q fires the active skill and E opens the in-run store (js/ui.js:1989, js/ui.js:1990).
- That the dodge has a name, or that the three scouts have different ones: Sidestep 0.30s
  iframe, Backdraft 0.24s with two charges, Tuck and Roll 0.34s with barge
  (js/data.js:435-443).
- That props are breakable and drop coins and gems, or that the birdhouse in the very first
  room spawns three squirrels when broken (js/props.js:69-73).
- That the bar across the top of the screen is XP, that the gems fill it, and that RANK UP is
  the same system. Three names, none joined up.
- That the camp is where permanent ranks are bought. The button that goes to the camp is
  labelled TITLE and the button that skips the whole meta layer is labelled RETRY
  (js/ui.js:2077-2078).
- That Junie and Gus are playable. Their walk-up prompt is the literal string `zzz`
  (js/camp.js:843).
- That a lore room contains anything. `findSpot` is stored at js/room.js:288 and nothing in
  js/render.js draws it.
- What any of the 18 species are called.

The complete instruction budget for a run is one 12px grey line on the title screen
(index.html:471) which lists six bindings and omits three of them.

### 2.5 Defects that block story work

These are not design opinions. They are bugs that any story beat lands on top of.

1. **Turning subtitles off permanently destroys one-shot story.** `showDialog` plays a click
   and returns before rendering (js/ui.js:858-865), but `brockLine` has already run: the arc
   beat was marked seen and saved (js/dialogue.js:290-292), the badge was acknowledged
   (js/dialogue.js:318-339), `lastRun.ack` was set (js/dialogue.js:361-363) and `tarpAck` was
   spent (js/feats.js:520-526). An accessibility toggle deletes save data.
2. **Camp messages do not wrap.** `renderMsg` (js/camp.js:3094-3107) is a single `measureText`
   and a single `fillText` at italic 13px, scaled by `CAMP_ZOOM 1.25`. The tarp string at
   js/camp.js:1400 is 306 characters, measured, which is roughly 2,000 to 2,700 screen pixels
   and runs off both edges of any normal window. Eighteen other camp messages use the same
   function. This is the channel, not one bad line.
3. **The cabin pinboard counts past its own maximum.** js/camp.js:1389 prints
   `keys.length + ' of 12 pins filled'` with no clamp, against 24 authored finds. (The cabin
   sash next to it is already dynamic, js/camp.js:1371-1377, so only the pinboard is wrong.)
4. **The Field Guide's Troop tab renders 12 rows** over `Object.keys(META.journal)`
   positionally (js/ui.js:570-591). Twelve of the twenty four finds can never be read, and the
   rows that do fill are labelled UNKNOWN SCOUT and then filled with things like A LINE OF HOP
   PRINTS.
5. **`nextFeatLine` eats every badge but the first.** It marks all unacknowledged badges as
   acknowledged in one loop and returns only the first (js/dialogue.js:318-339).
6. **Two merit badges cannot fire with any ceremony.** Feeding the Corkboard and Nothing But
   Lint only move at the Badge Board, `META.buy` does not run `Feats.check`
   (js/meta.js:96-104), and both exits from the panel call `setState('camp')` directly rather
   than a path that refreshes (js/ui.js:1961-1963, js/ui.js:2049).
7. **There is no gore toggle.** `SETTINGS` is exactly
   `{ musicVol, sfxVol, voiceVol, shake, dmgNums, subtitles }` (js/ui.js:11). The tone brief
   requires gore to be toggleable and requires that nothing load-bearing depends on it. Without
   the flag existing that rule cannot be enforced or tested.
8. **There is no flashes toggle and the game already strobes at 4Hz.** js/render.js:713 draws
   an untouchable boss as a white overlay on alternating frames of `Math.floor(this.t * 8)`,
   for the full phase guard at every boss phase change. Four flashes a second is inside the
   band that WCAG and every console certification treat as a seizure risk. The dawn wash is a
   separate full-screen 85 percent white ramp over 2.4 seconds (js/render.js:321-325).

---

## 3. THE CADENCE RULE

> **Every camp arrival stages exactly one thing and speaks everything else, and the one thing
> it stages is always the one the night just earned.**

That is the whole law. Three consequences follow from it and they are all mandatory.

**Nothing is ever held.** If a scene is superseded by a better one on the same arrival, it
fires as a spoken line on that same arrival and is marked permanently so it never comes back
as a scene. A moment that arrives three visits after it was earned reads worse than silence.
This is the single most important thing in this document and it is the thing the shipped game
has no concept of.

**The arc drips at one beat per arrival, most recent first.** Add a `priority` number to each
entry in `BROCK.arc`. When several gates pass at once, deliver the highest priority, not the
first in the array. `firstDawn` outranks `finalDown` outranks `threeKills`, so the night you
kill OLD NOBODY you hear the beat about killing OLD NOBODY, and the other two backfill on
later nights where they read as context rather than as a stale reaction. **This is a field on
an existing entry, not a reorder, and that distinction is load-bearing.** See section 9.

**Nothing is consumed until it has rendered.** Present first, write the flag second. This is
the fix for defect 1 in section 2.5 and every one-shot in this document depends on it.

**What it costs to honour.** One derived field (`paidRun`, the value of `META.runs` the last
time the fire paid out, recomputed rather than stored, see section 9), one `priority` field per
arc beat, a demotion path in `enterCamp` (js/ui.js:247-257), and a rule written into the top of
js/dialogue.js so the next person does not undo it. No new art. No new save field that has to
survive a transfer.

**The one exception, and it is deliberate.** The first dawn spends its whole queue. Every other
night has been exactly one thing, so a night that is four things reads as the world changing
rather than as a backlog clearing. The exception only works because the rule was kept for the
sixty nights before it.

---

## 4. THE PRACTICE CLEARING

The spine settled this: **the cold open is the onboarding.** A permanent practice space still
exists, but it is the veteran's test bench, not how anybody is taught. Both run on the same new
piece of engine, and it gets built once.

### 4.1 The shared engine: a night with the rewards switched off

Both the cold open and the range are a `Game` with combat live and every reward path disabled.
This does not exist today and it is the medium-sized build item in this document. New file,
`js/practice.js`, roughly 350 lines, owning the mode and both callers.

Four things it must get right, all verified as real hazards:

- **No doors.** `Transition._swap` calls `Run.advance` (js/transition.js:158-160), which
  returns null on its first line when `Run.active` is false (js/run.js:901), and then re-places
  the player at the same room's entry point (js/transition.js:162-168). A real door here
  silently teleports the player back to where they came in. Ship these layouts with
  `doors: []` and paint the plaque art onto dwell zones this file owns.
- **No death.** Use the player's existing `p.god`, which `damagePlayer` bails on before
  anything else (js/game.js:470), rather than an HP floor. Add a second guard: an early return
  at the top of `showOver` (js/ui.js:892), because that function calls `META.credit`,
  `Roster.checkUnlocks` and `Feats.check` in three consecutive lines.
- **No rank-up screen.** `gainXP` increments `pendingLevelups` (js/game.js:294-310) and
  `banksLevelups` only defers while the room lock is `clear` (js/ui.js:984-987). Either lock
  the layouts `clear` or guard the frame loop.
- **No music.** `startRun` calls `AudioSys.startMusic` (js/ui.js:169). The practice starter
  must not, or the cold open arrives with the night's score on top of it.

### 4.2 The cold open

Runs once, on `META.runs === 0`. It replaces the title screen for a fresh save (see section 12,
question 1). Estimated six minutes. No menu, no skip prompt, no text of any kind until the very
end.

**Beat 1, WAKE.** Black, then ground, then your own hands. WASD is the only input that does
anything. Not disabled with a message: simply nothing else is bound yet. This is the Vampire
Survivors trick, teaching by removing options, and it is also the story.

**Beat 2, THE DOE.** About ninety seconds along the only walkable line, a doe is standing in
the trail. She is not attacking. She is wearing a tin token the size of a coin, at readable
scale. She watches you go past and she does not follow. **This one image fixes the largest hole
in the shipped game's premise delivery:** the token is currently painted on 8 of 20 critter
painters at about 3 pixels across (the pendant painter is js/sprites.js:241-245; a squirrel is a
56px sprite canvas drawn at 32px wide), and twelve painted critters including OLD NOBODY carry
none at all. Here it is unmissable, once, before anybody explains it.

**Beat 3, THE HATCHET ON THE STUMP.** Lit, obvious, alone. Picking it up is the first time
attacking is possible. The verb arrives as an object found in the woods, not as a line on a
title screen.

**Beat 4, THE LANE.** The moment the hatchet is in your hand, something comes at you down a
corridor you cannot leave. This is the whole dodge lesson and it contains no words. Every game
in this family teaches the dodge by building a situation where not dodging is the obvious
mistake; the shipped game teaches it as the fourth item in a six-item text strip.

**The reason this ordering is the design and not an accident:** the doe does not attack because
you are not yet a witness. You pick up the hatchet, and the woods change. That is the premise,
taught by geometry, with nobody saying anything. Do not add a line here. Do not let anyone add
a line here.

**Beat 5, THE LIGHT THROUGH THE TREES.** Firelight, a cabin footprint with no cabin, and
people. It never announces that it was a tutorial. It is skipped forever after by never being
loaded again, which is the property that makes an island tutorial survive repetition: the
player skips it by walking, not by pressing skip.

### 4.3 The range

Camp Hearthwood's old shooting range, on the south edge of the trailhead. Opt-in, permanent,
and it writes nothing to the save except a visit counter. It is where a veteran feels out
Junie's two charges and Gus's barge, which is content the game currently states nowhere.

**Placement matters and Design 1 got it wrong.** Its own gate spot at (475, 150) sits 180 to
210 units south of the natural line from Brock's fire at (0, -60) (js/camp.js:819) to the trail
sign at (600, -30) (js/camp.js:822). Nobody walks past it. Put the gate on the line, around
(430, -40), with the gap in the fence facing north.

**What is in it.**

- **The swinging pack.** A weighted pack on a guy line off a lashed A-frame: square lashing at
  the apex, sheer lashings on the legs, which is the correct pioneering and will be read by
  people who have done it. Roughly a 2.4 second period. It costs no health. It knocks you flat
  for about 0.7 seconds, dust, and that is all. There is no line to the far target that does
  not cross the arc. **This is the single best idea in any of the four input designs and it is
  the one thing on the range that must never be cut.** The consequence being embarrassment
  rather than damage is what makes a first-timer experiment instead of retreat, and three clean
  passes through a swinging object teaches a 0.30 second window better than the string
  `IFRAME 0.30s` ever will.
- **Straw butts on lashed frames**, for feeling out a weapon. They do not teach hold-versus-
  click and no beat here pretends to. `INPUT.fire` is set from `INPUT.mdown` (js/ui.js:105) and
  the starting slingshot has a 0.42 second cooldown (js/data.js:43), so holding and clicking
  fast are mathematically the same thing. Design 1's straw-butt lesson was impossible and it is
  cut.
- **One butt wears a real neckerchief**, tied in a square knot, faded almost pink, the only
  saturated colour on the range. Knock it down and it does not reset with the others. Brock's
  portrait flips to alarmed for one beat and back to deadpan (js/portraits.js has an `alarmed`
  expression already) and he says nothing. Next visit it is standing again and the knot has been
  retied.
- **The range scoreboard.** Painted camp furniture on the fence at the firing line. Twelve name
  slots, chalk tallies. Eleven names legible and old. The twelfth sanded to bare wood with one
  fresh chalk mark in it. **This is where the twelve-name surface lives**, not in the Field
  Guide, for the reason given in section 7.2. It must not consume a `FINDS` entry.
- **The watcher.** At most once per visit, only after the first shot, only while the player is
  facing downrange, roughly one visit in five. A shape in the gap between two pines behind the
  backstop, at treeline scale. No token, no eyes, no rim light, no sound. It holds 1.2 to 2.0
  seconds and is removed the instant the player's aim comes within 25 degrees of it. **Its tell
  must be visual, not audio.** Design 1 made the tell the tin cans going quiet, which does not
  exist for a deaf player or anyone with effects at zero, and the tone brief's own rule (if a
  toggle can remove it, it cannot be load-bearing) applies to sound as much as to gore. The
  tell is the fireflies over the range going out and coming back.
- **Two post-dawn beats**, both cheap, both aimed at the stretch of playtime that currently has
  nothing in it. After ten range visits, the tally on the board reads one higher than the number
  of shots you took, and nobody corrects it. On the first visit after your first dawn, the
  two-sided sign already reads HOT when you arrive, the rope is already down, and Brock is 600
  units away at the fire.

**Cut from the range:** hot mode (a second combat system with its own no-drops rules, and Design
1's own cut list puts it first), and Wren the named child (a dialogue portrait in this codebase
is 95 to 300 lines of hand-tuned canvas, and naming a younger scout is camp-cast work that
belongs with the camp cast, not smuggled in through a tutorial).

---

## 5. THE BEAT LADDER

This is the heart of the document. Every trigger is stated in real `META` terms. Playtime
figures are **estimates** derived from the audits' HP budget arithmetic and the playtest note at
js/data.js:200-206, not from measured play, and the late ones are soft by hours.

| # | Beat | Trigger | What the player sees | Approx. |
|---|---|---|---|---|
| 1 | WAKE | `META.runs === 0` | Ground, hands, WASD. No menu, no text. | 0:00 |
| 2 | THE DOE | Cold open, fixed | A Signed doe standing in the trail, token at readable size. She watches you go. She does not follow. | 0:02 |
| 3 | THE HATCHET | Cold open, fixed | A hatchet in a stump. Attacking becomes possible. | 0:04 |
| 4 | THE LANE | Cold open, after the hatchet | Something comes at you down a corridor you cannot leave. Space works. Nobody says so. | 0:05 |
| 5 | THE LIGHT | Reaching camp bounds | Firelight, no cabin yet, people. It never says it was a tutorial. | 0:06 |
| 6 | BROCK, FIRST WORDS | `!META.metBrock`, first E at the fire | `BROCK.intro[0]`, the Signing explanation (js/dialogue.js:93). No longer missable: after the cold open the fire is on the path in. | 0:07 |
| 7 | THE ONES WHO CANNOT BE SENT | Camp arrival, tier 0, ambient | Two or three younger scouts at the fire. One uses a job title about somebody nobody appointed. | 0:08 |
| 8 | DEVOURED, AND THE FIRST STICK | `META.deaths === 1` | Results screen now reads KILLED BY: A SQUIRREL (`KILLER_NAMES`, js/dialogue.js:64-69, currently has zero readers anywhere), one scout-specific epitaph, and the reward that each badge actually gave. Walking into camp, a marshmallow stick goes into the memorial grove where you can see it. | 0:14 |
| 9 | FIRST NIGHT | arc `firstNight`, `m.runs >= 1` | "Thirty years ago I brought twelve kids up this ridge. I brought one down. That is a fireside talk for later." Then the fire has nothing more tonight. | 0:16 |
| 10 | THE RULES | Second night, spoken not staged | `BROCK.intro[1]` (js/dialogue.js:94), the rabbit-smiles joke, currently unreachable dead code. It ships, but as a second press, never as a night's whole payout. | 0:24 |
| 11 | THE CABIN GOES UP | Camp build 1, chosen from the work list | The camera does not move. Two survivors are carrying a beam and they do not stop to look at you. The NO CABIN YET sign is pulled up and lying in the dirt. Square lashings on the corner posts, a ridge pole, then a cabin. **Nobody explains why they started building.** | 0:35 |
| 12 | THE FIRST NAMED DEATH | Queue pop, precedence swapped so the last-run reaction comes before the arc beat (js/dialogue.js:358-367) | Brock reacts to the exact thing that killed you, with a usable instruction: "Boars telegraph the charge. Big exclamation of intent. Step LEFT." | 0:45 |
| 13 | BROCK READS A RELIC | Queue pop, any `kind: 'troop12'` find in `META.journal` he has not handled. New table, 14 lines | You hand him the dented canteen. He turns it over, reads the scratched name under the cap without being asked to, and hands it back. | 1:00 |
| 14 | THE TIN, EXPLAINED | arc `twoMarks`, **regated** | Gate today is `arcCodexCount(m, 'seen') >= 2` (js/dialogue.js:164), which means reaching the second boss arena. New gate: one boss seen OR three journal keys. You saw a token on a doe in minute two and somebody finally names it. | 1:15 |
| 15 | THE FIRST GUIDE ENTRY | New: a species crosses its kill threshold and the night ends | The CRYPTIDS tab gains its first real page. A name, and three lines written as a document somebody in the world made. | 1:30 |
| 16 | FIVE GRAVES | arc `fiveGraves`, `m.deaths >= 5` | The existing beat, unchanged, and it lands harder because the grove behind him has five sticks in it you watched go in. | 1:45 |
| 17 | JUNIE WAKES | `Roster.checkUnlocks()` returns `junie` (js/roster.js:12) | The tent flap is open, she is standing outside it with her boots on, and she has one line. The prompt stops reading `zzz`. Currently this announcement is written, returned, and dropped on the floor at js/ui.js:918. | 2:00 |
| 18 | BRAMBLEBUCK | arc `brambleDown`, `flags.act1boss` | One beat, ending on "It was, and I want to stress this, a rabbit." `actTwo` also passed tonight and is deliberately held to next visit, so it gets its own room to be alarming in. | 2:30 |
| 19 | THE FLINCH | Ambient, low chance per camp visit, from about `META.runs >= 12` | The younger scouts keep talking. Brock's head turns to the treeline for about half a second and comes back. Nobody else reacts. Nothing to click. No message. | 3:00 |
| 20 | THE SASH OF ELEVEN | Brock reads `t12_sash` (js/finds.js:76-83) | Eleven badges sewn on by hand, one upside down, and a torn square of thread where the twelfth was. He names which badge was on that square. Nobody told him which one. | 3:30 |
| 21 | THE LAKESHORE | Camp build 2 | You come back and the path is cut, the LAKESHORE CLOSED sign is lying face down in it, and the dock is standing. The canoe and the flat bottomed jon boat arrive one night later, because somebody had to drag a boat down there and that takes a day. | 4:00 |
| 22 | PAST THE TREELINE | arc `actTwo`, `flags.act2` | Different makers stamp those tokens out there. He asks you to bring him one, and says he has been too much of a coward to fetch one himself for thirty years. He is lying and you cannot tell yet. This beat already ships. | 4:30 |
| 23 | THE ROLL BOOK | Brock reads `t12_rollbook` (js/finds.js:123-130) | Eleven names in a scoutmaster's block print and a twelfth line in a kid's handwriting that nobody ever crossed out. He reads it, does not say the name, and changes the subject to the weather. | 5:00 |
| 24 | THE TALLYMAN | arc `tallymanDown`, `flags.act2boss` | "He is very organized about it. There is probably a ledger." By now the player has read enough to hear that differently. | 6:00 |
| 25 | THE FIRST DAWN | `e.final` kill (js/game.js:439) then `META.credit` (js/meta.js:126) | The white wash, THE SUN RISES, and back at camp: **the Uncovering** (section 6.4), the dawn line, the `firstDawn` arc beat, and every badge that landed. This is the one night that spends its whole queue. | 8:00 to 12:00 |
| 26 | THE NIGHT AFTER | New post-dawn arc beat, `dawns >= 1` and one run since | He does not congratulate you. He asks what it was like when OLD NOBODY stopped, and whether it looked at you first, and then he sits with the answer and does not make a joke about it. | 9:00 to 13:00 |
| 27 | THE FIRST BLAZE | First ever `Totem.toggle` to true (js/feats.js:553-561) | Section 6.4. The hatchet fetch, three swings, the post gains its blaze, then two full seconds of nothing, then the fireflies go out. | 10:00 |
| 28 | THE GUIDE FILLS | Remaining species, one per qualifying night | Eighteen entries across the long tail. Every one of them is a thing that used to be an animal. | 10:00 to 18:00 |
| 29 | THE WHISTLE ON THE NAIL | Brock reads `t12_whistle` (js/finds.js:215-221) | A scoutmaster's whistle with the pea taken out and the hole sealed with candle wax. He says "issue whistle, mine's on the nail" and moves on. There is a whistle on a nail by the cabin door. It has no pea either. | 13:00 |
| 30 | THE PHOTOGRAPH | Brock reads `t12_photo` (js/finds.js:179-186) | Twelve kids, eleven in focus, the twelfth blurred while the trees behind the twelfth are sharp. He looks at it for a while and says cameras did that back then. | 15:00 |
| 31 | THE NAMEPLATE | `twelfthname` merit badge completes (js/feats.js:218-227) | He is at the trail sign with a hammer and the sanded nameplate is already nailed up, and he is still standing there looking at it. The prompt becomes "Ask him." He still does not answer, but he stops pretending it is a silly question. | 17:00 |
| 32 | TRUE DAWN | Every creature in the guide written up, then a win | The one true cinematic, the only place control is taken. THE HOLLOW. See section 8. | 18:00 to 20:00+ |

**What changed from the input designs, and why.**

- Design 2 wanted a strict one-thing-per-night queue that **holds** everything else. Cut,
  because it puts the `firstDawn` reaction two to four real hours after the dawn. Replaced with
  section 3's rule: one staged, everything else spoken now, nothing held.
- Design 2 made night two's whole payout a joke, on the reasoning that it "buys the goodwill
  that night twenty spends." That is the retired warm cadence stated as a scheduling principle.
  The line ships; it is not the payout.
- Design 4 wanted the camp spawn moved to Brock's fire so death delivers. Cut: the fire's
  keep-out circle is `[0, -70, 44]` (js/camp.js:665) so a spawn at (0, -60) is ten units inside
  it and the player is pushed out on frame one, and the trail sign is still a straight walk east
  either way. Death delivers on the results screen instead, which is unavoidable.
- Design 3's cabin beat had Brock say "they were not going to fix any of it until somebody came
  back." Cut. That converts the eerie reading (a camp that repairs itself around you) into a
  warm one about the player being the reason there is hope, and it resolves the discomfort
  inside the same beat. The pulled-up sign in the dirt is the whole beat.

---

## 6. UNLOCKS AS SCENES

### 6.1 The tiering rule

Every unlock is assigned one of three treatments **in advance**, and the assignment is written
down as a rule rather than a list, so the next feature does not drift the count to fifty.

- **Tier A, a staged moment.** The player keeps the controller. A character walks to where the
  thing is, or the thing changes, in front of them. **Eight of these across an entire save.**
  That is a budget.
- **Tier B, a line.** Spoken at the fire on the arrival it was earned. Never held.
- **Tier C, a quiet mark.** The object is simply there next time, and it carries exactly one
  line that waits at it, spoken the first time the player walks over and looks, and never again.

A camp that grows behind your back while you are out is a genuinely eerie idea and it is the
right default for most of this. It only works if the game knows it happened and has something to
say when the player goes and finds it. Without the waiting line it is an asset pop. With it, it
is the camp changing without asking you.

**The arrival rule.** The receipt lands the instant it is earned; the scene waits for camp.
Almost every unlocked object physically is in camp, so camp is the only place it can be staged.
But the run must name what was earned, because eight pieces of gameplay currently enter the
level-up pool with nothing said at all (js/feats.js:259-263). The exception is anything earned
while already standing in camp (the birdhouse, Blink, the Badge Board), which stages on the spot.

**The camera never moves. Characters move instead.** js/camp.js:994-1004 is the entire camp
camera and there is no scripted move anywhere in 3,743 lines. Building one is avoidable and
avoiding it is also better writing: Brock standing somewhere he never stands is a stronger shot
than a camera push at a post.

### 6.2 The eight staged moments

1. The cabin goes up (beat 11).
2. Junie wakes (beat 17). Gus, the second wake, is Tier B: the same beat twice is furniture.
3. The lakeshore path (beat 21).
4. The seventh knock on the birdhouse. **Unchanged.** js/camp.js:1306-1339 already writes the
   counter, runs `Feats.check`, prints an authored line, plays the sound, and because
   `campFeatSig` changed (js/camp.js:89-97) the camp rebakes and four more birdhouses appear in
   the grove around the player. It is the only unlock in the game that happens in the world
   while you watch. Nobody should improve it.
5. The Uncovering (6.4).
6. The first cut (6.4).
7. The nameplate (beat 31).
8. True Dawn (section 8).

### 6.3 Everything else

- **Camp tier 3.** Today the entire payoff for spending 200 badges is a radial gold fill at
  alpha 0.10 plus a 0.04 sine behind the Badge Board, and grepping js/camp.js for `tier >= 3`
  returns exactly one hit (js/camp.js:2840). It is imperceptible on a lit screen and it is the
  only tier with no signpost anywhere telling the player the gate exists. Delete it. The supply
  stall gains a second shelf with stock on it, and **the Quartermaster** says the line, not
  Brock, because this is stock and counting and that is his. He currently has eight lines total
  and nothing to do.
- **Camp tier 4** (the skull on a post) and the five silent cosmetics (js/camp.js:2146 trophy
  row, 2157 bunting, 2178 blink jar, 2069 nameplate, 2237 sash line): Tier C, each with one
  waiting line.
- **The rescued squirrel** arriving (js/camp.js:778-796): Tier B, and the line is not a warm
  one. Under the spine, being witnessed is what they needed and being killed is what they were
  avoiding, and this squirrel is the only object in the game that says so.
- **Blink's four stages**: unchanged, they are already the second best moment in the game. One
  addition: stage four has no `AudioSys` call anywhere in `updateBlink`. Give it `pickup`
  pitched down. A firefly landing is not a fanfare.
- **The eight pieces of content entering the pools**: Tier C. The over-screen receipt names
  them (`reward.label` is authored on every entry at js/feats.js:101-226 and thrown away at
  js/ui.js:932-935), and the card wears a small tin NEW tag the first time it is offered.
- **Merit badges**: the existing over-screen line, plus the reward label. Twelve of fourteen
  already land here.
- **The act 2 and act 3 flags** (js/room.js:262-271): stay silent in the run. They surface as
  arc beats. Correct as is.

### 6.4 THE TALLY POST

The owner named this one, so it gets the detail. It is the best object in the game: it is
player-chosen difficulty, it has six authored dares, it has six authored Brock lines, and it
currently opens in total silence and its introductory prose is physically unreadable.

**What is there today.** A tarp-covered post at (330, -70) with a walk-up prompt from the very
first camp visit (js/camp.js:831). Pressing E prints a 306 character message (js/camp.js:1400,
measured) through a function that does not wrap (js/camp.js:3094-3107), so both ends run off the
screen. It opens at `dawns >= 1` (js/feats.js:512). At that point `Totem.revealLine`
(js/feats.js:520-531) returns one authored speech, once ever, delivered at the fire, about an
object 330 units east that the camera never shows. The six dares pay 15/25/15/20/15/10 and sum
to exactly 2.00x (js/feats.js:583-586, applied in js/meta.js:107-140). Six Brock lines about it
sit in the random idle pool while any blaze is cut (js/dialogue.js:134-141, js/dialogue.js:372).

**THE TARP, READ ACROSS THREE NIGHTS.** Split the one unreadable paragraph into three short
wrapped messages, one per night walked. (Note for the implementer: the once-per-visit lock at
js/camp.js:1146-1150 keys on `META.runs`, which only moves in `META.credit`, so it is a
once-per-night lock, not once per camp entry. That is the right pacing here, but say so in the
brief so nobody is surprised.)

- **Read one:** something tall and narrow under weathered canvas, roped at two heights. Brock,
  from the fire, not looking up: it comes off when you have seen a sunrise and not one hour
  before.
- **Read two:** the loose corner shows planed wood, not bark. Somebody made this.
- **Read three:** the gust holds long enough to show one old blaze already cut into it, low
  down, at a height a child could reach. The line does not explain it. Brock does not comment.

The corner of the tarp already lifts live off `this.t` rather than out of a bake
(js/camp.js:2362-2440), so the plant surface exists.

**THE UNCOVERING (Tier A).** First camp entry with `dawns >= 1` and `flags.tarpAck` still
falsy. This takes the single staged slot for that arrival and outranks the tier 4 skull, the
trophy posts and every merit badge that landed with it.

You spawn at (0, 60) as always and **Brock is not at the fire.** For the first time in the whole
game the man is not where he always is: he is at the trailhead, standing at the post, facing it,
tarp still on. You walk over, which is why no camera move is needed. The prompt reads
`[E] Watch`. Control is never taken. He cuts the two rope lines, two swing sounds about half a
second apart, the canvas comes off in one motion and piles on the dirt, and the post is standing
there. He speaks the existing `revealLine` word for word and he does not look at it while he
says it. Under the post the earth has been swept bare by the canvas dragging off it, and the old
blaze from tarp read three is right there at a child's height. Then he walks back to the fire and
does not raise it again that visit.

**THE HATCHET, AND THE FIRST CUT (Tier A).** These are **one arrival later**, not the same
night. Design 3 stacked all three on the dawn visit and then named that exact stack as the
fatigue failure in its own risk list. It gets split.

His own reveal line says there is a hatchet on the nail by the door, so make it literal. A new
walk-up spot at the cabin door reads `[E] Take the hatchet down`. It is a real walk, west to
east across the whole camp and back. Brock is at the fire and watches you carry it past and says
one short line that is neither a refusal nor permission. He does not stop you. That is the
disapproval: he told you where it was.

Then the first cut. The panel opens, the six dares are there, you pick one, and **the panel
closes and the cut happens in the world.** Three swings: `swing`, `hit`, then a lower `hit`
(js/audio.js has all three). Pale chips of wood using the puff particles the scout swap already
spawns (js/camp.js:882-888). On the third swing `campFeatSig` changes and the rebake at
js/camp.js:1447 fires, so the post gains its blaze and stands taller in the same frame, bright
pale wood through the grey, which is what `renderTallyPost` already draws (js/camp.js:2334-2349).

Then **two full seconds of nothing** while the camp keeps running.

Then the fireflies over the fire go out. All of them, in about half a second, in a ripple that
starts at the trailhead. They come back one at a time over about four seconds. Nobody says a
word about it, then or ever. The firefly zone already exists (js/camp.js:3018) so this is an
alpha ramp, and it is the cheapest genuinely frightening thing anyone proposed.

Every night after the first, the post opens the panel directly with no walk and no swings. **If
that gate is missed the best moment in this document becomes the most annoying one by run
forty.**

**WHAT THE WOODS DO ABOUT IT.** Three layers, permanent from the first cut.

1. At the fire, the first `BROCK.totem` line is pinned as the guaranteed next line rather than
   left to a one-in-six idle roll. It currently reads "now it is marked several times", which
   only fits a repeat, so one new sibling line is needed for a single blaze. Line four, the
   plane-it-smooth line, is pinned to the first `Totem.clear` for the same reason: it is the
   best line in the pool and it is currently a random draw.
2. On any camp visit with blazes cut, the treeline at the trailhead holds one extra dark shape
   that is not there on a bare-post night. It never moves, it is never lit, it is never
   mentioned by any character, and it sits somewhere different each visit. One draw call. **If
   a later pass ever gives it a reveal, a light or a sound, it stops being eerie and becomes a
   monster closet.** Write that into the brief.
3. In the run, at the first room's lock-in, one toast in the post's pale wood colour rather
   than the usual gold, using the existing primitive (js/game.js:290): something out here has
   already read the post. No hitstop, no card, no pause.

Brock's own line says the blazes are read the way you read a trail sign, loudly and from a long
way off (js/dialogue.js:136). Today nothing out there ever acts as though it read anything, so
the post is a difficulty slider with good copy. These three make it a message that gets
answered.

---

## 7. THE PULL

### 7.1 The session shape

A night is roughly 5 minutes early and 20 to 35 minutes late (estimate, from the audits' HP
budgets, not measured). The loop is: go out, come back, one thing changed at camp, one page in
the book moved, one blank line on the board got closer.

**A losing run must always move the book forward.** That is the whole retention thesis and it is
what the shipped game does not do. A player stuck on BRAMBLEBUCK today has exhausted every gate
they can reach and gets idle lines forever.

### 7.2 The Field Guide is the pull

**The plate count.** One printed line at the foot of the guide, in Brock's block capitals rather
than the scout's hand: `THIS GUIDE WAS PRINTED WITH 21 PLATES.` Later, `21 PLATES. 9 STILL
BLANK.` That single sentence does the entire job of Hades' prophecy list. It gives the total, it
gives away nothing about the contents, it is a real property of a printed field guide rather
than a UI element, and it refuses to show 21 empty boxes on run one, which would read as
homework.

**The unseen shows up as blank paper, not as a checklist.** A creature you have never met has no
card at all. One you have met but not written up shows a silhouette, a blank ruled name line,
and the scout's own scrawled description. One you have written up has a name and three lines
written as a document somebody in the world made, never in the voice of the game. That voice
constraint is what produces eerie prose instead of explanatory prose and it costs nothing to
enforce.

**How an entry gets written.** Kills of that species cross a small threshold **and the night
ends.** Death counts. (Design 4 gated this on "reaching camp alive", which was a blocking
error: `META.credit` is called from exactly one place, js/ui.js:917, and the only alive exit is
a dawn, so the entire early-game pull would not have existed until after the win.) Derive the
per-species threshold from the existing pick weights in `DATA.rosters` (js/data.js:239-251)
rather than hand-tuning eighteen numbers. **Never show the number.** The card is unwritten or
written, and the only visible number in the whole guide is the plate count.

**What a finished entry pays.** It pays in **sight, never in stats**, because stats collide with
the eight permanent ranks on the Badge Board. A written-up species **gains a second tell**: the
instruction from its sign find surfaces on the telegraph. The base telegraph is never touched.
Design 4 wanted an unwritten species to show a *dimmer, shorter* telegraph, and that is cut: it
is a difficulty penalty aimed at the player who is already losing, it stacks with the generic
death line on the same condition, and its own proposed fix (an options toggle) would make it
non-load-bearing and therefore not a reward. **Belief adds sight. It never subtracts it.**

**And Brock cannot name a thing you have not named.** The nine species with no `BROCK.died` key
(js/dialogue.js:96-110 covers 9 of 18; the missing nine are ticktot, pineconepuffer, chipchoir,
bogfrog, stiltheron, sapperrat, ashelk, cindercrow and quarrybadger, js/data.js:179-195) get
their nine lines, and the specific line is gated on the entry existing. That turns the single
largest content gap in the game into a design rule and makes the most repeated writing in the
game a reward.

**The Troop 12 surface is split in two.** The current tab renders twelve numbered rows over a
flat journal object that holds both relics and trail signs, so a player sees A LINE OF HOP
PRINTS sitting in a slot that reads as a missing child, and twelve finds can never be shown at
all. Replace it with two plain lists: **RELICS** (14 rows, all displayable) and **SIGNS** (10
rows). **The twelve-name surface moves to the range scoreboard** (section 4.3), because that is
a scoresheet with twelve name slots and relics are objects, not names. Both Design 2 and Design
4 rebuilt the roll as a name list fed by relics and both reproduced the exact bug they had
diagnosed.

Before touching any of this, decide which twelve `fieldscholar` counts. It needs 12 journal
entries of any kind (js/feats.js:141-148, `have: m => featJournalCount(m), need: 12`) and its
description says "Fill all twelve pins on the cabin board", and the pinboard hardcodes twelve
(js/camp.js:1389). Those three twelves are currently the same twelve by accident.

### 7.3 The next page

A third tab, appearing only after the first entry is written: three things the troop has heard,
each written as a rumour, each naming what to do without naming what you get.
`Feats.progressList(META)` (js/feats.js:392-426) already sorts unearned rows by nearness and
already returns hidden rows carrying only their hint, so this is
`rows.filter(r => !r.done).slice(0, 3)` with no new sorting code.

Three is a rumour. Fourteen cards at 0 of 1000 is homework, which is what the Merit Badge Board
currently shows on the first camp visit before the player has walked once (js/camp.js:826, the
board spot is unconditional).

### 7.4 The returning player

Nothing in the shipped game survives a reload as a marker. `featFlash` is a module-level array
(js/ui.js:609) cleared on first render (js/ui.js:753) and `META.save` writes no equivalent key,
so a badge earned before closing the tab is indistinguishable from one earned months ago.

Fix: persist an unseen set (badges not yet viewed, entries not yet read, a beat waiting at the
fire) and surface it **in camp**, not on the death screen, because a cold-booting player never
passes through the death screen. A pip on the badge rack, a pip on the guide, and Brock's
walk-up prompt reading something other than the default when he has something to say. Then one
line on the camp letterhead (js/camp.js:3063-3072, which currently prints only CAMP HEARTHWOOD
and a badge count) naming the last night: what killed you, or that you saw a dawn.

---

## 8. THE HELD TWIST

Brock was the twelfth kid. He has been Signed since he was eleven, which is what froze his
belief and is why he is the only adult alive who can still see. The camp is a leash.

**The scheduling law:** the plant may sit on optional content, the payoff may not. Every plant
below is walkable past. The payoff sits on something a completionist structurally crosses.

**The five plants, in the order a player meets them.**

1. **The flinch** (beat 19, from about run 12). Brock's head turns to the treeline for half a
   second and comes back. Nobody else reacts. **Nothing to click, nothing to read, no message.**
   This is the purest one and it is also the most fragile: the temptation will be to add a
   prompt so players do not miss it, and that kills it. A plant a player cannot walk past is not
   a plant, it is an announcement.
2. **The sash of eleven** (beat 20). He names which badge was on the torn square. It reads as a
   scoutmaster knowing his own troop's sashes, which is exactly what it should read as.
3. **The roll book** (beat 23). Eleven names in a scoutmaster's block print and a twelfth line
   in a kid's handwriting that nobody crossed out. He reads it and does not say the name. **The
   strongest one**, because every player forms the wrong theory here (some other kid added
   himself), and it is Brock adding himself.
4. **The whistle on the nail** (beat 29). He mentions his own whistle in passing. There is a
   whistle on a nail by the cabin door and it has no pea either. This one requires the player to
   walk to a nail nobody has ever asked them to look at.
5. **The photograph** (beat 30). Twelve kids, eleven in focus, the twelfth blurred while the
   trees behind the twelfth are sharp. He says cameras did that back then. **A lot of players
   work it out here, and that is correct.** A twist nobody can solve is a twist nobody was told.

Plus one plant that is not Brock: **the range scoreboard**, available from the first range
visit, twelve slots, eleven old names, the twelfth sanded to bare wood with one fresh chalk mark
in it. The first Troop 12 object the player ever touches is not a memorial, it is a scoresheet,
and somebody is still scoring.

**Why the plants are structurally sound.** Everything Brock says is already true and already
deniable. The `actTwo` beat that ships today has him call himself a coward for never fetching a
token in thirty years (js/dialogue.js:199-203). He does not need one. That is a lie the player
cannot detect and it is already in the build.

**The middle stage: the nameplate** (beat 31). At the emotional peak of the shipped arc he says
"do not ask me about the twelfth name yet. Some other night" (js/dialogue.js:244) and **there is
no other night anywhere in the code.** No true-dawn state, no flag, nothing; the only payoff for
the hidden `twelfthname` merit badge is a small tin rectangle drawn silently on a signpost
(js/feats.js:218-227, js/camp.js:2068-2077). Beat 31 makes it the promise half kept: he has
already nailed it up, he is still standing there, and the prompt becomes "Ask him." He still
does not answer. He stops pretending it is a silly question. That is the difference and it is
enough.

**The payoff: True Dawn.** Every creature in the guide written up, then a win. It opens THE
HOLLOW, which is authored, has its own dedicated render theme (js/rooms.js:2130-2146,
js/render.js:1492-1584) and is explicitly skipped by `layoutsFor` (js/run.js:57-58,
js/run.js:440). It is the one place control is taken, because there taking control away is the
content.

**Be honest about who sees it.** This gate is a small single-digit percentage of buyers. **The
version of this story that most players get has to stand on its own**, and that is a first-class
deliverable, not a residue. A player who quits at hour six should be able to say: *the camp is
haunted by something the counselor knows about and will not name.* Every plant above is checked
against that sentence, which is why four of the five sit in acts 1 and 2 and why the flinch,
which needs no find at all, is the earliest.

---

## 9. WHAT THIS COSTS

### 9.1 New save fields, and the transfer code

**Read this section before touching js/meta.js.** I read the transfer code in full and verified
its shape.

The camp transfer code fingerprints seven id tables and covers **the first N ids of each table
in order**, N being the count the code itself stores (js/meta.js:236-248). So:

- **Appending** to `FINDS`, `FEATS`, `BROCK.arc`, `NIGHT_CARVINGS`, `DATA.characters`,
  `METADEFS` or `DATA.bosses` is **safe** and every code already in the wild keeps working.
- **A reorder, an insert at the front, a rename or a deletion** inside those first N refuses
  every code in the wild. Retiming a beat therefore happens by changing its `gate` function or
  adding a `priority` field, **never** by moving an array entry. The regate of `twoMarks` in
  beat 14 is safe for exactly this reason.
- **The fixed header between the fingerprint and the first bit-list cannot grow.** Adding one
  byte there refuses every existing code. `packFlags` (js/meta.js:402-412) uses bit values 1,
  2, 4, 8, 16 and 32, so **there are exactly two spare travelling boolean bits in the entire
  game: 64 and 128.** Spend them deliberately.
- **`META.flags` keys outside the packed set do not travel.** The apply block
  (js/meta.js:701-715) rebuilds flags from scratch and writes only `feats`, `featAck`,
  `arcSeen`, `night.carvings`, `tarpAck`, `blinkFriend`, `metQuartermaster`, `act2`, `act3` and
  `blink`. Anything else evaporates when a player moves from laptop to phone.

**Consequences for this design.**

| New state | Decision |
|---|---|
| The arc queue and the per-arrival lock | **Derived, never stored.** Recompute from the gates plus `flags.arcSeen` on camp entry. Survives transfer for free. |
| Cold open done | **Derived** from `META.runs === 0`, which already travels. Do not spend a flag bit on it. |
| Range visited | Local only. It is a tutorial affordance, not progress. |
| Camp build choices | A new appended bit-list of build ids, with its own append-only table. |
| **The species guide** | **A new `META.guide` field, NOT `META.codex`.** |

**The guide field is the sharpest edge in this document and both Design 2 and Design 4 got it
wrong.** They put 18 species into `META.codex`. Three separate readers count every key in that
object on the assumption it holds three bosses: `featCodex` (js/feats.js:66-83) would self-award
the Naturalist and Trophy Wall merit badges off three squirrels, `arcCodexCount`
(js/dialogue.js:267-275) would fire the `twoMarks` beat ("you have gotten a good look at two of
them now") off two squirrels, and `codexHasKill` (js/camp.js:786-796) would put the rescued
squirrel at the fire after the first kill of anything. Worse, the transfer writer walks
`t.bosses` and emits two varints per boss id (js/meta.js:469-485), so any non-boss key is
**silently dropped** on transfer with no refusal and no warning.

Putting species in their own `META.guide` leaves `codex` as the boss-only table every existing
reader assumes and touches nothing. Travel it as **one bit per species** (written up or not),
appended at the end of the writer body, with its own append-only id table, and include that
table in the fingerprint **only when its stored count is above zero**, so old codes still read.
Kill tallies stay in localStorage where they cost nothing. This matters for size as well as
safety: a filled camp today is about 118 characters, and the stated purpose of the code
(js/meta.js:157-167) is that you can read it down a phone.

### 9.2 New writing

| Block | Lines | Approx. words | Notes |
|---|---|---|---|
| 18 species names and guide entries | 54 | 700 | The cheapest large block. Carries the whole long tail. |
| 18 new arc beats (10 of them post-dawn) | 36 | 900 | The hardest writing in the document. All Brock, with jokes that do not reassure. |
| 14 relic reactions | 14 | 350 | Highest value per line. Every twist plant rides on these. |
| 9 missing `BROCK.died` keys | 9 | 120 | Against the most repeated beat in the game. |
| 15 scout epitaphs (5 per scout) | 15 | 90 | Isaac's trick. One line gives a failed run a shape. |
| 9 missing `KILLER_NAMES` entries | 9 | 20 | Wiring a table that has zero readers today. |
| Tally post: 3 tarp reads, 1 single-blaze line, 1 hatchet line | 5 | 120 | |
| Quiet-mark waiting lines (6 cosmetics, 1 shelf, 1 squirrel) | 8 | 150 | |
| Range and cold open | ~12 | 200 | Brock only. No new speakers. |
| **Total** | **~180 lines** | **~2,600 words** | |

For scale: one arc beat is about 9 lines of js/dialogue.js and one find is about 10 lines of
js/finds.js.

### 9.3 New art

Small, and deliberately so.

- 2 to 3 code-painted props for the range (straw butt, A-frame with correct lashings, swinging
  pack) and the range scoreboard.
- The Signed doe in the cold open reuses the existing doe painter with the pendant painter
  (js/sprites.js:241-245) called at a much larger draw width.
- The treeline watcher reuses the existing pine palette. One silhouette.
- **No new dialogue portraits.** A portrait in this codebase is 95 to 300 lines of hand-tuned
  canvas and there are six today. `idFor` returns null for an unknown speaker and the dialogue
  box simply draws no card, so any new speaker can ship without one.

### 9.4 New engine work

Largest first.

1. **Brock becomes a character who can walk.** He is furniture today: drawn at a hardcoded
   (58, -46) inside the per-frame sorted draw list (js/camp.js:2973), with a hardcoded keep-out
   (js/camp.js:667) and a fixed interact spot (js/camp.js:819). No position state, no walk
   state, no face state. The idlers already have exactly that machinery (js/camp.js:1008-1100)
   so it is bounded, but the Uncovering, the hatchet watch, the nameplate scene and the flinch
   all depend on it, and the fire interact must refuse to return a Brock line while he is
   standing 330 units east.
2. **The practice mode** (section 4.1). One file, both callers.
3. **The camp work list.** Replacing `META.tier()` as the pacing authority. **Blast radius
   measured:** 30 reads of `tier` in js/camp.js, covering walk rects, keep-outs, spots, the
   ground bake, the treeline, furniture, fireflies and the window glow. Nothing outside
   js/camp.js and js/meta.js reads it at all. Keep `tier()` as the render authority and add the
   chosen-build list as a separate gate that feeds it, so camp rendering does not have to learn
   a new vocabulary to get pacing.
4. **`renderMsg` wraps** and is height-aware, with the walk-up prompt repositioning when a
   message is up.
5. **Present-then-consume** across `showDialog`, `nextArcLine`, `nextFeatLine` and
   `Totem.revealLine`.
6. **The lore-room find gets a renderer.** `findSpot` is stored (js/room.js:288) and nothing
   draws it, and three lore layouts ship with `spawnMarkers: []` so the find lands at the
   geometric room centre in a room whose doors are open on arrival.
7. **`SETTINGS.gore` and `SETTINGS.flashes`**, three lines each plus an option row. Route the
   4Hz phase-guard strobe (js/render.js:713) and the dawn wash (js/render.js:321-325) through
   the second one.

### 9.5 Not costed here, but somebody must

**The Steam build has zero achievements and zero Steam integration.** A grep for achievement,
steamworks, greenworks and steam_api across js/, index.html, electron/ and package.json returns
nothing. Meanwhile fourteen merit badges already carry names, hidden flags, progress conditions,
reward labels and painted emblems (js/feats.js:94-232). On Steam the achievement list is the
store page's proof of depth and the discoverability surface for hidden content. Map the fourteen
one-to-one before building any new progress-tracking UI. That is shell work (an IPC preload,
`contextIsolation` is already on) and it belongs in its own unit.

**There is no way to start a second playthrough.** `localStorage.removeItem` appears exactly
once in the whole codebase (js/run.js:199) and it clears the mid-run night snapshot, not the
camp. The camp lives in one key, `mbm_meta` (js/meta.js:60). A game whose payoff is a twist and
whose standard reward is a replay that reads differently structurally cannot offer one. That is
an Options panel entry with a two-step confirm plus a completed-camp record that survives it,
and it is a release blocker, not polish.

**The voice pipeline is built and keyed to line text.** `tools/voice/lines.json` holds 156
dumped lines and `dump_lines.cjs` keys each file on the first 8 hex of a sha1 of the spoken
text, so **every rewrite in this document orphans a generated clip.** Sequence it: freeze the
text first, generate second. Also note `assets/manifest.json` ships with an empty files map so
`Voice.available` is false, `dump_lines.cjs:34` exports only BARKS, SELECT_LINES, BROCK and
BOSSLINES, and js/voice.js:32's priority ladder has no camp or dialogue trigger at all.

**Nothing in this document is written for the phone**, and the free web build is the funnel.
`#dialog` is `width:min(680px,86vw)` with a portrait card at `flex:0 0 130px` that never shrinks
(index.html:235-251) and `#dlgtext` has a min-height and no max-height and no overflow. Phone
layout should become a required section in every future story brief, the same way file paths
are.

---

## 10. THE BUILD ORDER

Every wave ships on its own. No wave depends on a later one. No early wave spends save budget a
later one needs.

**WAVE 0. PREREQUISITES.** No new content. These are bugs that every beat lands on top of.
Present-then-consume. `renderMsg` wraps. The pinboard clamp and the twelve-row cap, and the
decision about which twelve `fieldscholar` counts. `refreshFeats` on the Badge Board exits.
`SETTINGS.gore` and `SETTINGS.flashes`. Write the transfer rules from section 9.1 into
js/meta.js's own header, which today states the append rule for tables and says nothing about
the byte layout or the two spare flag bits.

**WAVE 1. THE RECEIPT AND THE CADENCE.** The cheapest large win in the document: about 9 lines
of new writing, no new art, no new save field. `reward.label` on the over screen. KILLED BY via
`KILLER_NAMES` plus the nine missing entries. Capture `Roster.checkUnlocks()`. Relabel and
reroute RETRY and TITLE. The scout epitaphs. One arc beat per arrival with the `priority` field
and the demotion path. Precedence swapped so Brock reacts to the night before he tells a story.
The nine missing `BROCK.died` keys. Fix `nextFeatLine`. Ship `BROCK.intro[1]`.

**WAVE 2. ONE MOMENT IN THE WORLD.** Design 3's tiering rule, minus Brock walking. The
three-part tarp read. The Uncovering, delivered at the fire for now, wrapped. The hatchet fetch
and the first cut with the firefly ramp. The Junie wake. Quiet marks with waiting lines on the
five silent cosmetics. The tier 3 glow replaced by the Quartermaster's second shelf. Blink's
missing sound. The lore-room find gets a renderer.

**WAVE 3. BROCK MOVES.** No new writing. Give him position, walk and face state. Re-stage the
Uncovering at the post. The nameplate scene. The flinch.

**WAVE 4. THE GUIDE GETS WORDS.** 54 lines. Eighteen names and entries, the `META.guide` field
with the transfer migration in the exact shape from section 9.1, the plate count, the
relics/signs split, the NEXT PAGE tab, the second-tell reward, and the death lines gated on the
entry existing.

**WAVE 5. THE ARC EXTENDS.** About 50 lines and the hardest writing here. Eighteen appended arc
beats, ten of them post-dawn. Fourteen relic reactions. The five plants land in this wave and
the wave is not done until they have been read back against the sentence in section 8.

**WAVE 6. THE COLD OPEN, THEN THE RANGE.** Same engine, built once, in that order. The cold open
is the story and the range is the amenity. The camp work list lands here too, because it is the
same "the camp is a record of your nights" idea and it is the one that touches 30 call sites.

**WAVE 7, ONLY IF THE GAME EARNS IT.** THE HOLLOW, the fourth act slot in js/run.js, and the
game's first control-taking sequence. True Dawn.

---

## 11. WHAT WE ARE NOT DOING

So nobody re-proposes it.

1. **Telegraph gating (an unwritten species showing a dimmer, shorter tell).** It is a
   difficulty penalty aimed at the player who is already losing, dressed as a story reward, it
   stacks with the generic death line on the same condition, and no automated gate catches "the
   new player can no longer read the boar charge." Replaced by adding a second tell instead of
   removing the first.
2. **The Tallyman tearing pages out of the guide.** Cheap to build, which is exactly why it gets
   built before it is thought through. Every guard it needs (one per night, always recoverable,
   never the page just written, an options toggle) makes it weaker. His coin skim
   (js/director.js:805-816) is untouched. Revisit after Wave 5 if the guide is carrying its
   weight.
3. **Five staged camp build sequences.** One staged build (the cabin). The rest are chosen from
   the work list and are standing when you get back, which is cheaper and is the better reading.
4. **Design 2's queue as stored state.** Proven: `flags` keys outside the packed set do not
   survive a transfer (js/meta.js:701-715). The queue is derived.
5. **Moving the camp spawn point to the fire.** It lands inside the fire's keep-out circle
   (js/camp.js:665) and it does not stop anyone walking east to the trail anyway.
6. **Hot mode on the range** (the straw butts getting up and attacking). A second combat system
   with its own no-drops rules, for a space whose value is the swinging pack.
7. **Wren, or any named younger scout invented in a tutorial.** A portrait is 95 to 300 lines of
   canvas, and naming the children at camp is camp-cast work.
8. **The straw-butt hold-versus-click lesson.** Impossible: `INPUT.fire = INPUT.mdown`
   (js/ui.js:105) and the slingshot's 0.42 second cooldown (js/data.js:43) make holding and
   clicking fast identical.
9. **A shareable seed code on the results screen.** Genuinely cheap (`Run.seed` is already
   stored at js/run.js:791 and js/meta.js:395-399 already groups a string in fives) but it is the
   only proposal in four documents that is not story delivery, and it competes for the same
   screen space as all of Wave 1.
10. **A camera primitive for the camp.** Every scene here moves a character instead. If somebody
    later decides a scene wants a camera push, it gets built once, carefully, respecting the
    grounds clamp, and every scene in section 6 gets rechecked at that point rather than
    retrofitted.
11. **Any new fixed field in the transfer code header.** On sight, forever. Two spare flag bits,
    then appended bit-lists with a conditional fingerprint.
12. **Rebuilding the Troop 12 roll as a twelve-row name list fed by relics.** Two designs
    proposed it and both reproduced the bug they had just diagnosed. Relics are objects, not
    names.

---

## 12. OPEN QUESTIONS FOR TEDDY

Five. Recommendation first, then the alternative.

**1. On a brand new save, does the cold open replace the title screen entirely, so the game
opens on black and the player's hands with no menu anywhere?**
*Recommendation: yes.* The spine says no menu and no volunteering, and a title screen in front
of it undoes the whole point: the player has already agreed to play a game, so waking in the
woods becomes a level rather than a thing that happened to them. The cost is that a fresh save
has no visible OPTIONS until the cold open ends, which means no volume slider for six minutes.
*Alternative: title screen first, cold open on ENTER CAMP.* Safer, keeps options reachable,
loses the ambush.

**2. When we rewrite a story beat for tone, do saves that already heard the old version get the
new one?**
*Recommendation: yes, once, via a one-time migration that clears `flags.arcSeen` for beats whose
text changed.* `arcSeen` is one-shot, so without this a mid-save player can never hear a
rewritten beat and the pivot only reaches new players. Re-firing is defensible because the gates
are still passed by progress they kept. The risk is a returning player hearing three beats they
half remember in one visit.
*Alternative: new saves only.* Zero risk, and everybody currently playing keeps the old warm
version of the game forever.

**3. The 102 scout barks are all gags, including all 15 death barks ("Tell the marshmallows... I
loved them..."). They fire far more often than Brock does and nobody has counted them against
the pivot. Do they get rewritten?**
*Recommendation: rewrite the 15 death barks and the 18 low-health barks, leave runstart, boss
and win funny.* The character is allowed to be funny; the moment is not allowed to be reassured,
and dying is the heaviest beat the game has and the one it repeats most. That is 33 lines.
*Alternative: leave all 102.* They are good jokes and they are the loudest, most frequently
heard writing in the game, so changing them changes what the game feels like more than anything
else in this document.

**4. Who decides what gets built at camp next: the player picks from a work list, or the camp
builds itself in a fixed order as you play?**
*Recommendation: the player picks, from a clipboard on a nail by the cabin door, three offered
at a time.* The spine says construction the player chooses, and choosing is what makes the camp
a record of your nights rather than furniture that appeared. It costs one small panel and it is
the difference between "I built the dock" and "the dock showed up."
*Alternative: fixed order, no panel.* Cheaper, keeps the pacing exactly predictable, and loses
the ownership.

**5. True Dawn currently requires killing every one of 21 creatures at least once and then
winning. That is a small single-digit percentage of buyers seeing the one true cutscene in the
game. Does the gate stay that high?**
*Recommendation: keep it.* A twist everybody trips over is not held, and the near-miss version
(the nameplate scene, beat 31) is genuinely satisfying on its own, so the ninety-plus percent
still get an ending. The condition is also a byproduct of playing well rather than a counter,
which is the right shape.
*Alternative: lower it to something like fifteen creatures plus a win, or all three bosses plus
a win.* More people see the payoff, and the payoff stops being the thing a completionist earns.

---

*End of document. Every file path and line number above was read in this repository at commit
c0740d2 on 2026-07-28. Playtime figures in section 5 are estimates derived from the audits' HP
budget arithmetic and the playtest note at js/data.js:200-206, not from measured play.*
