# Merit Badge Massacre: art style guide

Everything on screen is drawn in code (js/sprites.js). No image assets. This
document is the contract: follow it and any new character, enemy, item, or
prop will sit naturally next to the existing cast.

## The style in one line

Storybook cartoon: soft rounded forms, warm flat colors with baked-in top
light and belly shade, a single dark outline, glossy demon eyes on anything
corrupted, and everything alive through motion, not frames.

## Hard rules

1. **One outline color everywhere**: `#181008`, line width about 1.6 at
   sprite scale. Nothing on screen uses a different outline.
2. **Shading is baked, never gradient-banded**: every major form is drawn
   with the `blob()` helper, which adds one lower shade pass (about 24% dark)
   and one upper-left highlight pass (about 17% warm white). Do not hand
   paint gradients on bodies.
3. **Supersample 2x**: all painters bake through `mk(w, h, fn)` which renders
   at double resolution. Draw in logical units, never pixels.
4. **Corrupted creatures get `demonEye()`**: glossy red iris, vertical slit,
   white specular dot. The helper also registers the eye position so the
   renderer can pulse a red glow. Friendly characters get `cuteEye()`: black
   bead plus specular. This is the single strongest theme signal, never skip it.
5. **Every critter carries one tell of the cult**: gold pendant (`pendant()`),
   red eyes, or a rune. Cute first, wrong second.
6. **Silhouette carries identity**: each species must read at 30 pixels by
   outline alone (squirrel tail, rabbit ears, boar tusks, owl discs, beaver
   tail, fox ears, stag antlers). Design the silhouette before the details.

## Palette anchors

- Outline `#181008`, night ground `#131a11`, clearing `#1c2415`
- Fur browns `#8a4423 #a4552c #b25f31 #7a4e2c`, tans `#c69a63 #d8b174`
- Cream and bone `#e8cfa5 #e9e4da #d8cfc0`, grays `#9aa0a8 #6e6a62`
- Cult red `#c0392b`, glow red `#f03818`, gold `#f4c542 #e3b341`
- Scout khaki `#c9a86a`, forest green `#5c7248`, navy `#3a4a63`
- Fire `#ffdc8c #ff8c28 #c83c0a`, holy water `#7ec8e8`

## Animation rules (procedural, no frame sheets)

- **Scouts** use `SPR.drawScout()`: articulated legs swinging from the hips
  with lift and ground bounce, torso leaning into the run, weapon arm aimed
  at the cursor with recoil. Idle is a slow breathing sway.
- **Critters** animate by gait in `renderEnemy`: walkers waddle (rotation
  oscillation), hoppers squash on landing and stretch mid-air, bats wingbeat
  by fast vertical squash plus hover bob, chargers lean headlong and tremble
  during windup, stunned things wobble.
- **Deaths are scenes, not fades**: enemies inflate into a white silhouette
  pop with a smoke puff and an escaping red soul wisp. The player death is
  staged: hitstop, hat physics, body down, ghost rises, camera pushes in.
- **Big moments chew time**: level ups, boss entrances, chests, and revives
  all use hitstop plus a screen flash in their signature color (gold for
  progress, red for threat).

## Adding a new critter (checklist)

1. Pick the silhouette tell and one cult tell.
2. Painter in js/sprites.js: tail or wings first (behind), body `blob`,
   head `blob`, ears, muzzle, `demonEye` x2, feet, `pendant`.
   Twenty to thirty lines. Bake box roughly 50 to 60 units wide.
3. Entry in DATA.enemies with `w` (draw width), `r` (about 0.38 w), a `move`
   gait, and pool timing.
4. If it needs a new gait, add a case to the gait block in `renderEnemy`,
   built from rotation, squash, and hover only.
