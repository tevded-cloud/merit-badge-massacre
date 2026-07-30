# merit-badge-massacre

THE ROOT MASTER. Start here. Read this file, then follow its links, and you will
have the whole project's scope before you open a single source file.

## Two things that are true before anything else

**1. `docs/preproduction/RULINGS.md` OUTRANKS EVERY OTHER DOCUMENT IN THIS
REPO.** Not just the design documents in `docs/preproduction/`, but every one of
the ten at this level too. It exists because three research grounding audits
contradicted each other in eleven places and two claims in canon were factually
wrong. A document here can look authoritative, carry line numbers, read as
binding law, and still be superseded on exactly the point you are about to cite.
Check RULINGS.md first, every time.

**2. THE NAMES IN THIS REPO ARE STALE ON PURPOSE.** The folder, the README and
every internal id still say Merit Badge Massacre and still name three scouts
(max, junie, gus). The working title is PAST THE TREELINE and the cast is five
non-scout survivors (Dez, Junior, Vic, Hollis, Mikey). Nothing has been renamed
in code, deliberately, because in this project DISPLAY NAMES AND INTERNAL IDS
STAY SEPARATE FOREVER: renaming a thing in fiction never moves a storage key, a
feat id, a painter id or a save field. Do not "fix" a name you find in source,
in a voice folder, or in this file's own filename.

## The reading loop

Every significant folder holds a master named after itself, listing every file
in it and linking to the masters below it. Following the links from here reaches
all of them. `npm run masters:check` is the gate that keeps it true: it fails
when a folder gains a file its master does not name, when a master cites a path
that does not exist, or when a master becomes unreachable from this one.

- [js/js.md](js/js.md): the game. 33 plain script files, no module system, no
  bundler. Because nothing in the source says what depends on what, that master
  carries the load order, which IS the dependency contract. Read it before
  opening anything in `js/`.
- [docs/preproduction/preproduction.md](docs/preproduction/preproduction.md):
  the 13 pre-production design documents, including RULINGS.md itself, and the
  standing of each one (what still governs, what was superseded and by what).
- [tools/tools.md](tools/tools.md): the build and verification tooling, and the
  two automated gates. Links on to the music renderer and the voice pipeline.
- [assets/assets.md](assets/assets.md): the 223 shipped audio files and the
  manifest that makes them data rather than hard-coded paths.
- [.claude/agents/agents.md](.claude/agents/agents.md): the four agent
  definitions. These are instructions other agents load and obey, so a stale
  line in one of them propagates into work.

Folders with no master of their own, covered here instead: `electron/` holds one
file, `electron/main.cjs`, the desktop shell entry point named by package.json's
`main`. `docs/` holds no files directly, only `docs/preproduction/`.
`assets/voice/` holds one file, covered by the assets master.

## How the game is built and shipped

`index.html` is the whole application shell: it loads all 33 scripts as plain
`<script src>` tags in a fixed order, and it is where the canvas and the DOM
overlays live. There is no bundler and no build step for the code.

SHIPPING IS RULED STEAM ONLY, with a playable demo on Steam. The browser build
is retired as a shipping surface and kept as the internal build target, so it is
still how the game is run and tested, just not how it reaches players. The
desktop package is Electron: `package.json` holds the scripts, the dependency
set and the `build` block electron-builder reads, and `package-lock.json` pins
it. `.gitignore` is short on purpose and its one non-obvious entry covers the
2026-07-29 art method test, whose output stays on disk as the evidence for a
decision already recorded.

## How agents work here

- `CLAUDE.md` is loaded automatically into every session in this repo. It holds
  the verified command list, the canonical pattern to imitate, the validator
  pattern, and the GOTCHAS that have actually cost this project time. Its most
  important entry is the COMPLETENESS CLAIM RULE: no statement of the form "all
  callers", "nothing references this", "no seed exists" or "safe to delete"
  enters a brief or a commit until it has been independently grepped. Three such
  claims were made in one session recently and all three were false.
- `AGENT_POLICY.md` is the tiered permissions policy: what an agent may do
  without asking, and what needs permission first. Agents do not run git; the
  orchestrator commits.

## The design documents at this level, and what each one is still worth

All ten predate RULINGS.md. Several describe themselves as binding law, and
several are partly superseded. The standing below is what matters; the size is
there because these are large and reading the wrong one is expensive.

- `AUTHENTICITY.md` (225 KB, the largest file in the repo). A reference, not an
  essay: it answers "what does a correct X look like, and what else has to be
  there" for the real-world subjects the game draws. Use its section index, read
  the entry, stop. Still binding, below RULINGS.md.
- `LEVEL_DESIGN.md` (93 KB). The binding doctrine for combat rooms, written as
  predicates over a `RoomDef` so `tools/validate_rooms.cjs` can enforce it
  without a human. Still binding, below RULINGS.md, and it is the document the
  layout validator's failing baseline is measured against.
- `MOTION_DESIGN.md` (133 KB). Binding law for how everything moves. Every claim
  about the game as it stands carries a path and a line. Its references to
  ART_STYLE.md are historical and are marked as such.
- `STORY_DESIGN.md` (77 KB). Onboarding, story cadence, unlock staging and the
  long game. Its section 0 was the canonical premise statement BEFORE the
  reboot, so read `docs/preproduction/PREMISE_2.md` and RULINGS.md for the
  premise instead, and take the cadence and staging craft from here.
- `BUILD_ARCHITECTURE.md` (76 KB). How a night's build is assembled in 3.0, and
  the document implementation briefs cite. It supersedes parts of
  `BUILD_ECONOMY_3.md` and its section 7 (line 998) lists exactly which parts
  stand and which do not, so nobody cites the wrong one by accident. Its cap of
  one active skill owning one button is what makes the ruled swappable active
  need no new architecture.
- `BUILD_ECONOMY_3.md` (53 KB). The earlier build economy design. Partly
  superseded as above: do not cite it without checking section 7 of
  `BUILD_ARCHITECTURE.md` first. Deliberately contains no item names or flavour
  text, because naming is story-carrying content and the tone doctrine changed.
- `COOP_DESIGN.md` (78 KB). The co-op design. Superseded in at least two places
  by ruling: co-op now ships as a separate tense mode rather than chasing fear,
  and `COOP_DESIGN.md:962-963`'s commitment to a free browser build is dead
  under the Steam-only ruling. Its C7 doctrine, that the simulation draws from
  one random stream so a replay and a desync check have one place to seed, is
  live and was finally wired into the code on 2026-07-30.
- `CAMP_DESIGN.md` (82 KB). The hub redesign, companion to LEVEL_DESIGN.md,
  which explicitly does not govern it: the hub borrows the composition rules and
  refuses the combat numbers, because a nook you can stand in is a bug in an
  arena and the point of a hub. Its line numbers are hints against `js/camp.js`
  as of 2026-07-28 and it names a searchable landmark first for that reason.
- `AUDIO_2.1.md` (42 KB). The plan for the game's own music and voices, shipped
  as 2.1. Written against a separate worktree on the `v2.1-audio` branch. Every
  number in it is labelled MEASURED, COMPUTED or ESTIMATE, which is the habit to
  copy. It defers to `.claude/agents/sound-designer.md` where they disagree.
- `ART_STYLE.md` (4 KB). DEAD. A stub that exists only to say so and to carry
  the one rule that survived it. Its method (everything drawn in code, no image
  assets) and its storybook cartoon register were both ruled dead, and since the
  method governed every other rule in the file it could not be amended. The art
  bible that replaces it IS NOT YET WRITTEN. Do not take art direction from it,
  and do not cite it.

## README.md is stale and is not a design document

`README.md` is the public-facing description and it still describes the game
that was replaced: three scouts, an eleven year old protagonist, Troop 13, and
art and audio entirely generated in code. Every one of those is superseded. It
has not been rewritten because the working title, the cast and the store
positioning are still moving, and rewriting it once at the end is cheaper than
tracking the reboot with it. Treat it as a historical artifact until then, and
do not seed a brief from it.
