# Merit Badge Massacre: art style guide

Everything on screen is drawn in code (js/sprites.js). No image assets. This
document is the contract: follow it and any new character, enemy, item, or
prop will sit naturally next to the existing cast.

## The style in one line

Storybook cartoon: soft rounded forms, warm flat colors with baked-in top
light and belly shade, a single dark outline, glossy demon eyes on anything
corrupted, and everything alive through motion, not frames.

## Hard rules

1. **One outline color everywhere**: `#181008`. Line weight is two tier
   since the 2026-07-27 amendment: silhouette edges 2.4, interior details
   1.0. Nothing on screen uses a different outline color.
2. **Shading is baked, never gradient-banded**: every major form is drawn
   with the `apoly()` or `blob()` helper, which adds one lower shade pass
   (about 24% dark) and one upper-left highlight pass (about 17% warm
   white). Do not hand paint gradients on bodies.
3. **Supersample 2x**: all painters bake through `mk(w, h, fn)` which renders
   at double resolution. Draw in logical units, never pixels.
4. **Corrupted creatures get `demonEye()`**: glossy red iris, vertical slit,
   white specular dot. The helper also registers the eye position so the
   renderer can pulse a red glow. Friendly characters get `cuteEye()`: black
   bead plus specular. This is the single strongest theme signal, never skip it.
5. **Every critter carries one tell that it has been Signed**: the stamped tin
   Token (`pendant()`), red eyes, or the eye-in-ring Sign. Cute first, wrong
   second.
6. **Silhouette carries identity**: each species must read at 30 pixels by
   outline alone (squirrel tail, rabbit ears, boar tusks, owl discs, beaver
   tail, fox ears, stag antlers). Design the silhouette before the details.

## Palette anchors (bumped 2026-07-27: hotter, more chroma)

- Outline `#181008`, night ground `#131a11`, clearing `#1c2415` (the two
  ground colors are render side and unchanged)
- Fur brown mid `#b85a24`, dark `#8f3f18`, light `#cc6d2c`, tan `#d7a45f`
- Cream and bone `#e8cfa5 #e9e4da #d8cfc0`, grey `#98a4b2`
- Mark red `#d4402c`, glow red `#ff4a20`, gold `#f4c542 #e3b341`
- Scout khaki `#c9a86a`, forest green `#5c7248`, navy `#3a4a63`
- Fire `#ffdc8c #ff8c28 #c83c0a`, creek water `#7ec8e8`

## Amendment 2026-07-27: structured high fidelity

The cast moved off single-blob construction onto structured, painted
characters. The bar: at 40 pixels each character looks like a more skilled
artist drew the same character; at 3x it has twice the drawing in it. This
section supersedes anything above that it contradicts; everything it does
not mention stays binding.

1. **Construction**: carrying forms are structured shapes drawn with
   `apoly()` (rounded corner polygons, corner radius per vertex: 2 to 5 on
   big forms, tighter on points). Structure is a tool, not the mandate:
   use it where it adds craft (shoulders and tailoring, hat brims, wedge
   snouts, haunch masses, ear and tail points) and keep organic curves
   wherever they serve the animal. Faces stay big, readable, and forward:
   if a shape change costs face readability, the shape change loses.
   Anatomy overlaps: head over chest, haunch over belly, hands over body,
   with a soft contact shadow tucked under each overlap. Acute tips (hat
   brims, leaf ears) use `lens()` because arcTo trims sharp corners.
2. **Five level lighting**, baked by the shared `shadePass()` in both
   `blob()` and `apoly()`: midtone band, core shadow, warm ground bounce
   on the underside, upper-left highlight, and an opt-in hue shifted rim
   arc along the upper left (browns rim warm orange, greys cool blue,
   greens yellow green: `rim` flag, never on small details).
3. **Fur is shaped clumps, not noise**: `clump()` petals laid in rows
   (`furRow()`) back to front with alternating value steps, 3 to 5 value
   levels per material, micro highlights on clumps where the eye goes.
   Deliberate fur breaks may cut into a silhouette as notch vertices or
   outlined edge clumps; richest detail lives on face, chest, and paws,
   lower bodies stay simpler.
4. **Two tier outlines**: silhouette edges lineWidth 2.4, interior details
   1.0. Same outline color `#181008` everywhere.
5. **Craft details carry speculars**: claws (`claw()`), teeth, noses, and
   eyes each get a wet dot; thin parts (inner ears, wing membranes) get a
   translucency hint (a hot lighter core).
6. **Eyes**: `demonEye()` renders 20 percent bigger than its call radius,
   with a second wet specular at lower right and a lower lid crescent in
   a darker head tint (painters pass the tint). The eye pair owns at
   least a third of the head width. `cuteEye()` renders 15 percent
   bigger, plus the lower lid highlight. Scouts look about eleven and
   about to be brave.
7. **One accent each**: every creature carries exactly one saturated non
   brown accent. Pink inner ears, bone tusks, and the owl's gold beak and
   talons count. The raccoon carries a `#4a76a8` bandana scrap. The
   beaver's incisors are iron orange, like a real beaver's.
8. **Scouts**: defined shoulder line, tapered torso with a hem, pocket
   flaps, collar points, kerchief as a sharp triangle with a proper knot,
   segmented limbs with knee and boot breaks in `drawScout`'s procedural
   legs, hats with crisp wedge brims and structured crowns.
9. **Palette**: the anchors above are the bumped set. Night ground and
   clearing colors are render side, leave them.
10. **Supersample is 3x** in `mk()` (was 2x) so the added detail survives
    the bake. Everything still bakes once at load; runtime cost unchanged.
11. **Hit readability rules over depth**: shapes must read under squash,
    rot, flip, white flash, and tint, and silhouettes must read at 30
    pixels. Depth that turns to mud at game scale is wasted.

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

1. Pick the silhouette tell and one Signed tell.
2. Painter in js/sprites.js: tail or wings first (behind), body `apoly`
   with haunch and chest planes, head `apoly` with a snout wedge, pointed
   ears, muzzle, `demonEye` x2 with the head's lid tint, feet with claw
   ticks, `pendant`. Twenty to forty lines. Bake box roughly 50 to 60
   units wide.
3. Entry in DATA.enemies with `w` (draw width), `r` (about 0.38 w), a `move`
   gait, and pool timing.
4. If it needs a new gait, add a case to the gait block in `renderEnemy`,
   built from rotation, squash, and hover only.
