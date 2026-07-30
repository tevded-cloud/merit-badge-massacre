# SAVE MIGRATION SPEC

This is a specification only. No code has been written or changed as part of
this document. Every file and line cited below was opened and read during
this pass; none are guessed.

Scope note: this document is about the save system and the camp transfer
code, both keyed today to the three old character ids (max, junie, gus).
Content authoring for the five new characters (art, voice, dialogue, camp
layout) is a separate, much larger body of work. Where a blast radius row is
really a content gap rather than a save bug, it is marked as such, because
fixing the save logic alone will not make the game run with the new cast.

`docs\preproduction\RULINGS.md` DID NOT EXIST when this document was written
and it exists now. It outranks this document, so check it before acting on
anything below: it is where the cast, the roster size and the arrival rules
are settled, and this document deliberately treated those as open. The repo's
own `CLAUDE.md` was updated while this document was being written and now names
the new cast: five non-scout survivors, Dez, Junior, Vic, Hollis, and Mikey,
working title PAST THE TREELINE. Nothing else about them (stats, unlock
order, starting scout) is known from any file opened for this pass, so this
document treats their specifics as open questions, not decided facts.

---

## THE BLAST RADIUS

### Methodology

Two greps were run against `js\` (not the rest of the repo: not `index.html`,
not `tools\`, not `assets\`):

1. A loose word-boundary grep, `\bmax\b|\bjunie\b|\bgus\b`, across `js\`.
   This was too noisy to use directly: it also matches `Math.max`, the
   generic string `'max'` used as a fold-mode name in `js\traits.js` (lines
   688-691, 704, 982) and as a field-name lookup in `js\game.js:40`, and the
   audio parameter name `'max'` in `js\audio.js:586`. All of these were
   opened and confirmed to be unrelated to the character id and are
   excluded from the table below.
2. A precise quoted-string grep, `['"](max|junie|gus)['"]`, across `js\`,
   which is what most of the table below is drawn from.
3. A supporting grep for the access patterns `DATA\.characters`,
   `ROSTER\[`, `Roster\.`, `\.selected\b`, `\.unlocked\b`, and `charId`
   across `js\`, to find sites that read the tables without spelling an id
   literally.
4. Targeted checks of `js\devtools.js`, `js\finds.js`, and `js\feats.js`
   for quoted `max`/`junie`/`gus`: none found.
5. A count of `characters[` occurrences per file to cross-check nothing was
   missed: `camp.js` (1), `game.js` (2), `meta.js` (1), `run.js` (2),
   `ui.js` (1). All six files and all matching lines are accounted for in
   the table below.

This is not a whole-repo claim. A quick directory listing (not a grep) of
`assets\voice\en\` also found character-named folders `max`, `junie`, `gus`
sitting alongside boss and story names (`antlered`, `behind`, `brock`,
`hare`, `mole`, `qm`, `vicar`). Voice line assets are keyed to the same
three ids outside `js\` entirely; this was not investigated further and is
flagged here only as a place the same problem class continues.

### A. Save and progression logic (this document's actual subject)

| File : line | What it does today | What breaks when the three characters are cut | Severity |
|---|---|---|---|
| `js\data.js:12-37` | `DATA.characters` holds exactly `max`, `junie`, `gus`. This is the table everything else in this list ultimately reads. | This is the change itself, not a bug. Everything below is a consequence of this table losing all three of its keys. | Root cause |
| `js\meta.js:44` | `if (!DATA.characters[this.selected]) this.selected = 'max';` On load, an unrecognized selected character is reset to `'max'`. | The fallback target is itself one of the three deleted ids. A save with any invalid `selected` (including every existing save once `max` is gone) is "corrected" to a value that still is not a valid character. | Critical |
| `js\meta.js:54` | `if (this.runs > 0 && this.unlocked.length === 0) this.unlocked.push('junie', 'gus');` One-time backfill for saves from before the unlocked list existed. | Hardcodes two ids being deleted. A save that still qualifies for this backfill (old enough to have `runs > 0` and an empty `unlocked` list) gets handed two characters that no longer exist. | High |
| `js\meta.js:679` | Inside `Transfer.apply()`: `next.selected = d.selected || 'max';` Same fallback pattern as line 44, but on the transfer-code import path. | Same failure as line 44: the fallback target does not exist. Only reachable when a transfer code decodes with no selected character recorded, which the fingerprint check (see below) makes rare, but the bug is the same class. | High |
| `js\meta.js:680` | `next.unlocked = (d.unlocked || []).slice();` Overwrites the local unlocked list with whatever an imported transfer code carried, with no validation against the current character table. | Contrast with `Transfer.mergeBest()` at roughly `js\meta.js:637-649`, which deliberately takes the higher of two values and never regresses. `unlocked` has no equivalent care: it is a flat overwrite. In practice this is defused by the fingerprint check refusing mismatched codes outright (see the row below), but the overwrite itself still has no independent validation if that check is ever loosened. | Medium |
| `js\roster.js:8-20` | `ROSTER` defines unlock conditions and hint text for `max`, `junie`, `gus`, driven by `META.lifetime` and `META.dawns` counters. | The ruling replaces counter-driven unlocks entirely (arrival and survivor-return-after-death instead). This table has to be rewritten for the new cast regardless of the save question; it is not a case of "fix the migration and this resolves itself." | High (content + logic) |
| `js\roster.js:25-30` | `isUnlocked(id)`: `const r = ROSTER[id]; if (!r) return false;` An id with no `ROSTER` entry is treated as locked, not as an error. | An old save's `unlocked` list containing `'junie'` or `'gus'` does not crash here; it just silently stops granting anything, forever, once those ids are removed from `ROSTER`. No error, no message, just quiet loss. | Medium |
| `js\meta.js:189-198` (`tables()`), comments at `js\meta.js:169-180` and `:228-235`, refusal at `js\meta.js:573-578` | The camp transfer code fingerprints the first N ids of `Object.keys(DATA.characters)`. Appending to the table is safe for old codes; a deletion (or reorder, or rename) moves the fingerprint, and an inbound code encoded against the old table is refused outright with the message "That code counts against a different list of scouts, badges and cryptids than this game has." | This is by design, confirmed by the doctrine comments and by the actual refusal code, not a bug. Cutting three characters and adding five moves the fingerprint, so every transfer code issued before this change stops working the moment it does. | By design (see "what an existing player loses") |
| `js\run.js:277-278` | `parseSave()`, validating a mid-night snapshot: if `s.charId` is not a key in `DATA.characters`, the whole snapshot is discarded (returns `null`). | Safe: no crash. A player with an in-progress night saved under an old character loses the "continue where you left off" offer for that one night. Their camp (currency, unlocks, upgrades) is untouched; only the unfinished night is thrown away. | Low |
| `js\game.js:2462, 2467-2468` | `Game.restore()`, the equivalent validation for a mid-night player build: `if (typeof DATA === 'undefined' || !DATA || !DATA.characters) return null;` ... `if (typeof id !== 'string' || !DATA.characters[id]) return null;` | Same shape and same safety as the row above: discards rather than crashes. | Low |
| `js\run.js:807` | `Run.begin()`: `this.charId = charId || ((typeof META !== 'undefined' && META && META.selected) || 'max');` Three-step fallback chain ending in the literal `'max'`. | If nothing upstream supplies a valid charId, this hands `'max'` to `Game`'s constructor, which does not check it (see next row). This is a live crash path, not just a stale default: see "what an existing player loses" for how a returning player reaches it. | Critical |
| `js\game.js:87-89, 114` | `Game` constructor: `const c = DATA.characters[charId]; this.charId = charId; this.char = c;` then, building the player entity, `hp: c.hp + hearty, maxhp: c.hp + hearty,` with no null check on `c`. | If `charId` is any id not in `DATA.characters` (which includes `'max'` after the cut, and includes any stale id left over from an old save), this throws `TypeError: Cannot read properties of undefined (reading 'hp')` immediately on constructing a run. Nothing catches this. | Critical |
| `js\ui.js:2001-2003` | On the character-select screen, `Digit1`/`Digit2`/`Digit3` keyboard shortcuts call `startRun('max')`, `startRun('junie')`, `startRun('gus')` directly, hardcoded, independent of what `DATA.characters` actually contains. | Pressing 1, 2, or 3 on that screen after the cut runs straight into the `Game` constructor crash above, on every keypress, for any player who tries the old muscle-memory shortcut. Contrast with `js\ui.js:132-155` (`buildSelect()`), which is built dynamically from `Object.keys(DATA.characters)` and needs no change at all. | Critical |
| `js\camp.js:850` | Building the camp scene's list of interactive spots: `{ id: 'sign', ..., label: 'Take the trail as ' + DATA.characters[META.selected].name }` No guard on `DATA.characters[META.selected]` existing. | If `META.selected` is not a valid key (true for every returning player once `max` is gone, because the load-time fallback at `meta.js:44` also targets `max`), this throws immediately: `Cannot read properties of undefined (reading 'name')`. `spots()` is called every interaction check, at `js\camp.js:984` and `js\camp.js:1383`. | Critical |
| `js\camp.js:3240`, `js\sprites.js:5457, 5461, 5463`, `js\sprites.js:1566-1570` (`SCOUT_OPTS`) | `renderPlayer()` calls `SPR.drawScout(ctx, META.selected, ...)` every frame the camp scene is open. Inside `drawScout`, `const skin = SCOUT_OPTS[id].skin;` has no guard, and `SCOUT_OPTS` only has entries for `max`, `junie`, `gus` (`js\sprites.js:1566-1570`). | Same failure family as the row above, but per-frame rather than per-interaction, and it will keep failing even after `META.selected` is pointed at a valid new character, because `SCOUT_OPTS` (and the matching `CHARS` art blocks in `js\portraits.js`, see below) have no entries for the five new arrivals yet. This is a content gap, not something a save migration script can fix by itself. | Critical, and content work regardless of the migration |
| `js\camp.js:650-660` (`scoutSpots()`, `tentFor()`) and `js\camp.js:2118` (tent-drawing loop) | Camp layout hardcodes an array of exactly three entries keyed to `max`, `junie`, `gus`, with fixed screen positions, names, and (in the tent loop) a flip flag. | Does not scale to five characters as written, independent of any save question. Idlers and tents for the two new arrivals beyond whatever three-slot layout exists today have nowhere defined to stand. Content/layout work. | High (content, not a save bug) |
| `js\portraits.js:696, 791, 1078` (`CHARS.max`, `CHARS.junie`, `CHARS.gus`) and `:1873-1875` (`idFor()` regex matching `MAX`/`JUNIE`/`GUS` in dialogue speaker text) | Large, hand-painted portrait art blocks per character, and a speaker-name-to-portrait-id mapping. | Five new characters need five new portrait blocks and five new `idFor()` matches; nothing here is data-driven off `DATA.characters`. Content work, not a save bug. | Medium (content) |
| `js\dialogue.js:100-101` (`BROCK.address`), used at `js\dialogue.js:379` | `address: { max: 'squad leader', junie: 'the fire hazard', gus: 'big fella' }`, read as `(BROCK.address && BROCK.address[META.selected]) || 'scout'`. | Has its own safe fallback (`'scout'`), so no crash. A new character is addressed generically until custom lines are written for them. Content, not a save bug. | Low |
| `js\reticle.js:11` (`COLORS`), used at `:340` | `{ max: '#c0392b', junie: '#d8722f', gus: '#8c5c9c' }`, read as `COLORS[g.charId] \|\| DEFAULT_COLOR`. | Safe fallback to a default color. A new character's aim reticle is a generic yellow until a signature color is assigned. Cosmetic. | Low |
| `js\voice.js:139` | `const speaker = (typeof META !== 'undefined' && META && META.selected) || 'max';` used to warm the voice-line asset cache for whoever is selected. | Not fatal: an unknown group name resolves to nothing loaded rather than an error (per the comment at `js\voice.js:149`). Worst case is a stale or missing voice-line preload, not a crash. | Low |
| `js\ui.js:66` | `App.char: 'max'` as the initial value of a piece of UI state, before any real selection happens. | Believed harmless: overwritten by `startRun()` before it is read for anything meaningful. Flagged for completeness, not because it does anything on its own. | Info |
| `js\game.js:501, 509` | `Game.bark()`: `const lines = (BARKS[this.charId] || {})[trigger];` Guarded, no crash if `this.charId` has no `BARKS` entry. | Safe: a character with no bark lines defined just never barks. `BARKS` (`js\dialogue.js:7` onward) is currently keyed to `max`, `junie`, `gus` and needs five new blocks written. Content, not a save bug. | Low |

### B. Not opened in depth, flagged only

- `assets\voice\en\` has folders named `max`, `junie`, `gus` alongside boss
  and story names. Not investigated beyond the directory listing above.
- `tools\manifest.cjs` and `tools\voice\dump_lines.cjs` were not opened;
  they are the tools that presumably build the manifest these folder names
  feed into, and were out of scope for a `js\`-only pass.

---

## WHAT AN EXISTING PLAYER LOSES

In plain terms, for someone who has a save on their machine right now.

**Their banked currency, upgrades, camp look, journal, and boss field guide
are not deleted by this change.** Those fields (badges, lifetime, spent,
dawns, deaths, runs, upgrades, journal, flags, codex, counters, camp) are
plain numbers and objects with no character id baked into them. Cutting
three characters does not touch that data on disk.

**But without a fix, the game will not get far enough to show them any of
it.** The safety net the code already has for "your selected character is
gone" (`js\meta.js:44`) resets it to `'max'`, and `'max'` is one of the
three ids being deleted. The very first time the camp scene tries to draw
the player's scout (`js\camp.js:3240`, every frame) or build the "take the
trail" sign (`js\camp.js:850`, on every interaction check), the game throws
an error. Practically, this means: the player's progress is intact on disk,
but the game crashes on the first frame of the camp screen and they cannot
see, use, or even confirm any of it until this is fixed. This is the
single most important thing this document is about.

**Their unlocked characters are gone in effect, if not in the save file
itself.** Whatever was in the `unlocked` list (old ids `junie` and/or
`gus`) will silently stop meaning anything once `ROSTER` (`js\roster.js`)
no longer has entries for those ids. The ids stay in the save file, taking
up a few bytes, and grant nothing. See Open Call 2 for what to do about
this.

**Their camp transfer codes stop working, by design, not by accident.**
The transfer code format fingerprints the character table it was built
against (`js\meta.js:189-198`, refusal logic at `:573-578`). Cutting three
characters and adding five changes that fingerprint, so any code generated
before this update is refused the moment it is pasted into an updated game,
with the message "That code counts against a different list of scouts,
badges and cryptids than this game has." A player mid-way through moving
their camp from one device to another when this update lands will need to
finish that move before updating, or start over and generate a fresh code
after both devices are on the new version.

---

## THE RECOMMENDED MIGRATION

Six decisions, each with options, consequences, and a recommendation.
Numbered to match the Open Calls section below, since these are the same
questions restated as design proposals rather than as questions.

**1. The new default character id and the broken fallback.**
The fallback at `js\meta.js:44` (and its twin at `js\meta.js:679`) must stop
pointing at `'max'`. Recommend replacing the hardcoded literal with a
computed default: the first id in whatever the new starting roster turns
out to be (source of truth still pending, see Open Call 1), read the same
way `js\ui.js:132` already reads the character list, so the fallback can
never again point at a deleted id just because someone forgot to update a
string literal in a second file. Effort: S.

**2. A save whose selected character no longer exists.**
Beyond the fallback itself, the player should be told something changed
rather than silently reassigned. Recommend a one-time check on load: if the
saved `selected` is not a recognized id, set it to the computed default
above and raise a flag the game reads once to show a short message (see
Open Call 6). Effort: S, plus the message itself, which is a content task
sized separately.

**3. The old unlocked list.**
Recommend discarding the two old ids (they mean nothing under the new
unlock rule, which is arrival and survivor-return rather than a lifetime
counter) and granting all five new characters unlocked as a one-time launch
gift for any save that already has `runs > 0` (i.e., already has a lived-in
camp). See Open Call 2 for the full reasoning. Effort: S, this reuses the
same one-time-backfill shape already in `js\meta.js:54`.

**4. Currency spent on a since-removed upgrade.**
Confirmed: nothing in the current Badge Board (`secondwind` included) is
being removed by the character-roster change. `secondwind` costs 400
badges for one rank with no refund path anywhere in the code (checked: a
grep for `refund`, `sell(`, and `respec` across `js\` found no purchase
reversal mechanism at all). This is a real gap, but it is not a casualty of
this particular change; it is a standing risk that would matter the day any
upgrade is retired. Recommend building a small general-purpose refund pass
now, while the migration code is already being written and tested, rather
than waiting for the day it is needed under time pressure: on load, for
any upgrade id in a save's `upgrades` that no longer exists in `METADEFS`,
credit back the badges that were spent on it. Effort: S, and it can share
its plumbing with the one-time-migration pass from item 2.

**5. Save versioning.**
Recommend adding a small integer version field, written by `save()` and
read by `load()`, starting now. Every migration after this one gets to ask
"what version is this save" instead of re-inventing a detection trick per
field, the way `js\meta.js:46-51` already does informally for the story
fields (journal, flags, codex). Suggested shape: a single top-level
number, bumped once per shape-breaking change, checked once at the top of
`load()`, with migrations expressed as a small ordered list of functions
that each know how to step a save from one version to the next. Effort: S
to add the field; the migration-function scaffolding is closer to M, but
is what turns every future breaking change into a much smaller, well-worn
task than this one.

**6. Previously issued transfer codes.**
Recommend leaving the existing behavior alone: it already refuses
mismatched codes outright and explains why, which is the safe option (see
Open Call 5). Effort: none, this is confirmation, not new work.

**Not part of this migration, flagged so it is not mistaken for covered:**
authoring the five new characters into `DATA.characters`, `ROSTER`,
`SCOUT_OPTS` and the matching sprite work, `CHARS` in `js\portraits.js`,
`BARKS` in `js\dialogue.js`, `BROCK.address`, the reticle color table, and
the camp layout (`scoutSpots`, `tentFor`, the tent-drawing loop). None of
this is fixed by a save migration; all of it is required before the game
can run with the new cast at all, migration or not. Effort: XL, and it is
its own body of work with its own brief.

---

## WHAT MUST BE TESTED

Fixtures for the smoke test being built in parallel:

1. **A fresh save.** No `mbm_meta` key in storage at all. Confirms the
   normal first-run path (`js\meta.js:38-56`) still produces a playable
   default character and does not accidentally trip any migration logic
   meant for old saves.
2. **A save from the current version, with progress.** `runs > 0`,
   nonzero `lifetime`/`badges`, a nonempty `upgrades` object, `selected`
   set to one of `max`/`junie`/`gus`, `unlocked` containing zero, one, or
   two of the old ids. This is the median real-world case and should be
   tried in all three `selected` variants plus at least two `unlocked`
   variants.
3. **A save with an unknown character selected.** `selected` set to a
   string that never existed (simulates hand-edited storage or a future
   version skipping this one). Confirms the fallback lands on a real,
   valid character and not on a second broken default.
4. **A save with `selected` missing entirely**, as distinct from fixture 3.
   `undefined`/absent is not the same code path as "present but wrong" in
   every language, and `js\meta.js:41` (`if (s[k] !== undefined) this[k] =
   s[k];`) specifically only overwrites when the key is present, so a
   missing key leaves whatever `META.selected`'s own default already is.
5. **A save carrying an old, now-orphaned upgrade id** in `upgrades` (to
   exercise the refund pass from migration item 4), both with and without
   other real upgrades alongside it.
6. **A corrupt save.** Unparseable JSON, and separately, valid JSON that is
   not an object (an array, a string, `null`). `js\meta.js:39-40` already
   wraps this in `try/catch` with a `{}` fallback; confirm that still holds
   once migration logic is added on top.
7. **A save with an in-progress night** (the separate `mbm_run` snapshot,
   not `mbm_meta`) recorded under an old character id, to confirm
   `js\run.js:277-278` discards it cleanly rather than the resumed game
   crashing mid-load.
8. **A transfer code generated before this change**, pasted into a build
   after it, to confirm the refusal message actually fires (this is meant
   to fail, per the migration section: it is a pass/fail test on the
   refusal itself, not on data landing correctly).
9. **A save whose `unlocked` list is not an array** (a string, a number,
   an object). `js\meta.js:45` already guards this on load
   (`if (!Array.isArray(this.unlocked)) this.unlocked = [];`); confirm the
   guard still runs before any new migration logic reads the list.

---

## OPEN CALLS

1. Which of the five new arrivals should a returning player's save default
   to, once their old character is gone? Options: pick one specific
   character as the standing default for every returning player; show a
   one-time pick-your-character screen the first time an old save is
   opened after the update; or default to whichever of the five the new
   opening story introduces first. A single standing default is fastest
   to build but is an invisible choice made for the player. A one-time
   pick screen costs one extra confirmation but respects that this is
   effectively a fresh choice being forced on them. Tying it to story
   order is elegant if the story order already exists, but adds a
   dependency on content that may not be ready yet. Recommendation: the
   one-time pick screen, with the story-order approach as a fallback if
   that screen cannot be built in time.

2. Should a returning player's unlocked characters be reset to just the
   new starting roster, or should their history count for something?
   Options: wipe to whatever the new starting roster is; grant all five
   new characters unlocked immediately, as a one-time "the troop changed,
   here is the new one" gift; or try to translate their old unlock
   progress (badges banked, nights survived) into the new unlock rule.
   A plain wipe is simplest but a veteran player loses any sense that
   their history mattered. Granting everyone unlocked is generous, easy,
   and avoids the awkwardness of asking a returning player to re-earn
   something under a system they never played, though it does skip the
   new unlock system's intended pacing for that one save. Trying to
   translate old progress into the new rule is the most work and may not
   even be possible, since the new unlock rule is tied to story beats and
   character deaths rather than a number that a lifetime badge count maps
   onto. Recommendation: grant all five unlocked as a one-time gift for
   any save that already shows played history.

3. Money spent on a permanent upgrade that the game later removes
   currently has no way to be returned; nothing is being removed from the
   upgrade board by this particular change, but the gap is real and would
   matter the next time something is retired. Should a general "give the
   money back" rule be built now, while this migration work is already
   underway? Options: do nothing until it actually happens; or build a
   one-time pass that finds any paid-for upgrade the game no longer
   recognizes and refunds what was paid for it. Doing nothing costs
   nothing today but risks a future update quietly deleting paid progress
   with no way to notice or undo it. Building the refund pass now costs a
   small amount of extra work but reuses the same one-time-migration
   machinery already needed for the character-unlock question above.
   Recommendation: build it now, sized small, since the plumbing is
   shared.

4. Should saves start carrying a version number? Nothing does today.
   Options: keep detecting old save shapes informally, the way a couple
   of fields already do (checking whether a piece is present and giving
   it a default if not); or add a small version number to every save and
   every transfer code so an old save is instantly recognized rather than
   inferred field by field. The informal approach costs nothing right now
   but every future change has to invent its own detection trick, and
   those get harder to keep straight the more of them pile up. A real
   version number costs a small amount of work today and makes every
   future change smaller and safer. Recommendation: add the version
   number now, specifically because this character cut is the first
   breaking change; a version number is most useful when it starts before
   the first break, not after several have already happened undetected.

5. What should happen to a camp transfer code (the paperwork for moving
   progress between two devices) that was generated before this update?
   Options: accept it anyway and leave the character-related parts blank
   or wrong; refuse it outright with a message explaining why, which is
   what the code already does automatically today; or try to accept the
   parts of it that did not change while refusing only the parts that did.
   Accepting a mismatched code is dangerous: a player could be shown a
   camp that is subtly wrong in ways they would not notice until much
   later. The existing automatic refusal is safe but blunt: the entire
   code is refused even though only the character list changed, not the
   badges or the merit badges or the story progress. Splitting a code into
   "still valid" and "no longer valid" parts would need real engineering
   work, since the format was not built to be read in pieces.
   Recommendation: keep the existing refusal exactly as it already
   behaves, and make sure the in-game message a player sees explains that
   the troop roster changed, in plain words, rather than showing the
   existing technical refusal text as-is.

6. A returning player's save may point at a character that no longer
   exists, and the game's own safety net for that situation currently
   points at another character that also no longer exists. Once that is
   fixed (see the recommended migration), what should the player actually
   see the first time they open the game after the update? Options: switch
   them to the new default with no explanation; show a short one-time
   message explaining the cast changed and who they are playing now; or
   drop them straight into a fresh character-pick screen as if they were a
   brand new player. A silent switch is fastest but reads as a bug to
   anyone who notices their character changed with no warning. A short
   one-time message costs a little writing and a little code to show it
   once, but directly answers the question a returning player will
   otherwise be left to guess at. Treating them as a brand new player
   reuses an existing screen but undersells that their currency and
   unlocks (per call 2) actually did carry over. Recommendation: the
   one-time message.
