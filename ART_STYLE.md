# ART_STYLE.md: SUPERSEDED 2026-07-30

**This document is dead. Do not follow it, do not cite it, do not amend it.** Its previous contents
are in git history and nowhere else. The replacement art bible is NOT YET WRITTEN.

## Why it could not be amended

Two of its foundations were ruled dead, and one of them was its stated method, which governed every
other rule in the file.

1. **The method.** The old line 3 read: "Everything on screen is drawn in code (js/sprites.js). No
   image assets." Procedural and code-generated art was tested and rejected by the creator on
   2026-07-29. Art is authored, made with the creator's own tool, and handed over as assets
   (`docs/preproduction/PREMISE_2.md:36-39`).
2. **The register.** The old lines 9 to 11 specified "Storybook cartoon: soft rounded forms, warm
   flat colors with baked-in top light and belly shade, a single dark outline, glossy demon eyes on
   anything corrupted." Cute is dead everywhere by creator ruling
   (`docs/preproduction/PREMISE_2.md:36-39`), the tone is eerie and adult played straight, and the
   `cuteEye` contract the old file carried at its line 149 does not survive.

A style guide whose stated method and stated register are both void cannot be patched into
compliance, because every rule under them was written to serve them.

## The one rule that survives, quoted

From the old line 38 to 40, carried forward verbatim:

> **Silhouette carries identity**: each species must read at 30 pixels by outline alone (squirrel
> tail, rabbit ears, boar tusks, owl discs, beaver tail, fox ears, stag antlers). Design the
> silhouette before the details.

This is a READABILITY rule, measured per creature: does it read as what it is, at true game scale,
in motion, with its tell named. It is method-independent, so it survives the rejection of the
drawing method. The 30 versus 32 pixel question is open and belongs to the new art bible.

## What replaced the distinctness requirement

Canon previously claimed a pairwise silhouette distinctness bar, citing this file's lines 38 to 40
for a 0.60 IoU threshold. **This file never contained that number.** The full correction is at
`docs/preproduction/RULINGS.md`, correction 1. In short:

- The 0.60 came from a research report where it is a FIDELITY check (how closely a traced sprite
  matches its own reference, where HIGH is good). It was applied as a DISTINCTNESS bar between
  different creatures (where LOW would be good), which inverts pass and fail.
- The creator replaced the requirement rather than correcting the number: two creatures that
  resemble each other in life are supposed to resemble each other on screen.
- What binds now: in-play readability per creature (the rule quoted above), and separation required
  ONLY between creatures that share a room, checkable against the real spawn tables in
  `js/rooms.js` (per-room `cast` maps, the `waves` arrays, and `WAVE_TEMPLATES` at `js/rooms.js:107`).
- Non-convergence (two users never getting the same thing) is a property of a generator, not of a
  shipped asset. It belongs to the creator's separate tool track and is not a requirement of this
  game.

## Two things that died with this file and need a decision in the new bible

Recorded so they are not lost, not carried forward as law:

1. **The two-tier line weight rule** (old lines 15 to 17), which `GROUNDING_AUDIT_3.md:285` named as
   the one clean survivor of the old file. It is a rendering convention tied to the rejected method.
   Decide it fresh.
2. **The teenage proportion amendment** (old lines 125 to 159), a CONTENT decision that sat inside a
   dead METHOD document. `AUTHENTICITY.md:783`, `docs/preproduction/DIALOGUE_DESIGN.md:17`,
   `docs/preproduction/PREMISE_2.md:942` and `.claude/agents/sprite-artist.md:151` all depend on it.
   It needs re-homing, not deleting.

## Where the replacement lives

The art bible that replaces this file is not written. It is tracked in the plan at
`~\.claude\plans\` and recorded as outstanding in `docs/preproduction/RULINGS.md` under WHAT THESE
RULINGS OPENED. Size L.

Until it exists, `docs/preproduction/RULINGS.md` is the only art authority, and it rules on exactly
two things: the readability rule quoted above, and the shared-room separation requirement. Anything
else about the look of this game is undecided, and a brief that needs it must say so rather than
quote a dead file.
