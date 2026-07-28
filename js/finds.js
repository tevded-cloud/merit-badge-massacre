// Merit Badge Massacre: the things on the ground that are not loot.
//
// Fourteen Troop 12 relics drip the story of the troop Brock brought up the
// ridge and did not bring down, strictly in order. Ten signs teach a tell
// before the thing that owns it turns up, and every one of them ends on a
// concrete instruction you can act on the next time you see the shape.
//
// A find writes exactly one key into META.journal, which is the same journal
// Brock's arc beats count at the fire, so picking things up is what unlocks
// him talking about them. Nothing here renders: Finds.grant hands the card to
// ui.js and the card is a five second guest in the corner.
'use strict';

// Icon ids are the ones SPR.icon actually paints (sprites.js). Anything not in
// that switch falls through to a gold star, so this table only uses names that
// are in it: canteen, boots, fieldguide, rabbitfoot, knives, hatchet, coin,
// lodestone, bugle, whistle, trailmix, bugspray, skillet.
const FINDS = [

  // ------------------------------------------------------------------ act 1
  {
    id: 't12_canteen', kind: 'troop12', act: 1, icon: 'canteen',
    title: 'A Dented Canteen',
    lines: [
      'Army green, hand painted daisies, still half full.',
      'There is a name scratched under the cap, and it is not one of the names Brock says out loud.',
      'The water is fine. You are still not drinking it.',
    ],
  },
  {
    id: 'sign_hopline', kind: 'sign', act: 1, icon: 'rabbitfoot',
    title: 'A Line of Hop Prints',
    lines: [
      'Two big prints, two small, then a stride of nothing at all. Repeat, all the way to the treeline.',
      'Nothing leaves a gap that even by accident. It was aiming.',
      'It cannot steer once it leaves the ground. Step sideways on the launch, not on the landing.',
    ],
  },
  {
    id: 't12_boot', kind: 'troop12', act: 1, icon: 'boots',
    title: 'One Left Boot',
    lines: [
      'Kid sized. Laced neat and double knotted, the way a scoutmaster makes you do it.',
      'No right boot. No pack, no trail, no kid.',
      'Somebody hopped home. That is the version we are going with.',
    ],
  },
  {
    id: 'sign_scrape', kind: 'sign', act: 1, icon: 'hatchet',
    title: 'A Churned Scrape',
    lines: [
      'Somebody dug forty feet of trench with their face.',
      'The trench is dead straight, and it ends at a tree that is missing a lot of bark.',
      'It picks a line and it commits. Stand aside and let the wall finish the job.',
    ],
  },
  {
    id: 't12_note', kind: 'troop12', act: 1, icon: 'fieldguide',
    title: 'A Note in Pencil',
    lines: [
      'Torn off a merit worksheet, folded into a triangle, wedged in a knot of bark.',
      '"brock says stay by the fire. brock is asleep."',
      'The letters get neater toward the end. Whoever wrote it had time.',
    ],
  },
  {
    id: 'sign_pellet', kind: 'sign', act: 1, icon: 'trailmix',
    title: 'An Owl Pellet',
    lines: [
      'Grey, lumpy, packed with little pale bits. Looks exactly like trail mix.',
      'It is not trail mix.',
      'Owls throw in a straight line and cannot lead a moving target. Keep your feet going and nothing lands.',
    ],
  },
  {
    id: 't12_sash', kind: 'troop12', act: 1, icon: 'rabbitfoot',
    title: 'A Sash of Eleven',
    lines: [
      'Eleven badges, sewn on by hand, one of them upside down and very proud of it.',
      'The twelfth is a torn square of thread. Something took it off the sash, not off the shirt.',
      'Eleven out of twelve. That is a passing grade almost anywhere else.',
    ],
  },
  {
    id: 'sign_weave', kind: 'sign', act: 1, icon: 'boots',
    title: 'A Weave in the Frost',
    lines: [
      'One set of paw prints, stitched side to side across the trail like a hem.',
      'It was not lost. It was practicing.',
      'Shoot where it is going, not where it is. It is never where it is.',
    ],
  },
  {
    id: 't12_whittle', kind: 'troop12', act: 1, icon: 'knives',
    title: 'A Whittled Buck',
    lines: [
      'Four inches of pine, sanded smooth, clearly loved.',
      'It has nine antlers. A kid who carved this well did not miscount.',
      'They kept whittling after they saw it. Scouts finish their projects.',
    ],
  },

  // ------------------------------------------------------------------ act 2
  {
    id: 't12_punch', kind: 'troop12', act: 2, icon: 'hatchet',
    title: 'A Tin Punch',
    lines: [
      'A hand punch, the kind for stamping leather, oiled and looked after.',
      'The die is still seated in it, and the die is the sigil. Somebody was making the tokens by hand.',
      'It still works. Please do not test it on anything.',
    ],
  },
  {
    id: 'sign_fives', kind: 'sign', act: 2, icon: 'knives',
    title: 'Claw Marks in Fives',
    lines: [
      'Five thin lines in the bark, at exactly pack height, over and over down the trail.',
      'Five. Like fingers. Something has been checking every bag that came through here.',
      'They arrive in threes and always at your back. Turn before you commit to a reload.',
    ],
  },
  {
    id: 't12_rollbook', kind: 'troop12', act: 2, icon: 'fieldguide',
    title: 'A Damp Roll Book',
    lines: [
      'Attendance, thirty years of weather, still legible if you tilt it at the fire.',
      'Eleven names in a scoutmaster block print. The twelfth line is in a kid\'s handwriting.',
      'Somebody added themselves to the troop. Nobody ever crossed it out.',
    ],
  },
  {
    id: 'sign_scales', kind: 'sign', act: 2, icon: 'bugspray',
    title: 'A Drift of Pale Moth Scales',
    lines: [
      'Silver powder on every leaf in the clearing, ankle deep in the low spots.',
      'Something took the moths out of the air, all of them, in one pass.',
      'The wobble is a shape, not a swerve. Aim at the middle of the S and let it come to you.',
    ],
  },
  {
    id: 't12_blanks', kind: 'troop12', act: 2, icon: 'coin',
    title: 'A Roll of Tin Blanks',
    lines: [
      'Forty little discs, unstamped, threaded on a wire like a keyring.',
      'Forty blanks and one punch. Somebody sat down planning to Sign forty things.',
      'Thirty nine of them are still blank. Take what comfort you can from that.',
    ],
  },
  {
    id: 'sign_hole', kind: 'sign', act: 2, icon: 'coin',
    title: 'A Perfectly Circular Hole',
    lines: [
      'Punched clean through a trail signboard. You can see the whole ridge through it.',
      'The disc that came out of it is nowhere on the ground. Somebody kept it.',
      'The collector fights in rings, ten spokes wide. Stand in a gap, never on a spoke.',
    ],
  },
  {
    id: 't12_lanyard', kind: 'troop12', act: 2, icon: 'lodestone',
    title: 'A Knotted Lanyard',
    lines: [
      'Braided in camp colors, every knot even and tight, gone grey with thirty winters.',
      'Eleven knots. Then a clean length of cord with nothing tied in it at all.',
      'A scout ties one for every night out. Somebody stopped counting on purpose.',
    ],
  },
  {
    id: 't12_letter', kind: 'troop12', act: 2, icon: 'fieldguide',
    title: 'A Letter Never Mailed',
    lines: [
      'Stamped, addressed, sealed, sitting in a mailbox thirty years from the nearest road.',
      '"Dear Mom, we found something and Brock says do not write about it, so this is about the weather."',
      'Four pages about the weather. The last page is not about the weather.',
    ],
  },

  // ------------------------------------------------------------------ act 3
  {
    id: 't12_photo', kind: 'troop12', act: 3, icon: 'fieldguide',
    title: 'A Bad Photograph',
    lines: [
      'Twelve kids in a row, squinting into the sun, one of them making a face.',
      'Eleven are in focus. The twelfth is blurred, and the trees behind the twelfth are sharp.',
      'Cameras do not do that. Everybody says cameras do that.',
    ],
  },
  {
    id: 'sign_tine', kind: 'sign', act: 3, icon: 'bugle',
    title: 'A Shed Antler Tine',
    lines: [
      'Knee high, wrapped in fishing line, with a bicycle bell tied to the point.',
      'Somebody wanted a warning. Somebody got close enough to tie a knot.',
      'Five circles walk out from it in a straight line. Stand off the line, not back from it.',
    ],
  },
  {
    id: 't12_flag', kind: 'troop12', act: 3, icon: 'whistle',
    title: 'A Mended Troop Flag',
    lines: [
      'TROOP 12, gold on green, hemmed by somebody who was learning as they went.',
      'It has been mended eleven times, each patch smaller than the last. The final one is the size of a token.',
      'They kept the flag up with a sewing needle. That is the whole troop, right there.',
    ],
  },
  {
    id: 'sign_rings', kind: 'sign', act: 3, icon: 'skillet',
    title: 'Six Cold Rings',
    lines: [
      'Six scorched circles in the grass, evenly spaced, still warm at the rim.',
      'The grass inside them is not burned. It is stamped.',
      'Stand in one for a full second and it goes out. Leave one lit and something out there gets promoted.',
    ],
  },
  {
    id: 't12_whistle', kind: 'troop12', act: 3, icon: 'whistle',
    title: 'A Whistle With No Pea',
    lines: [
      'Scoutmaster issue, nickel plated, worn bright at the mouthpiece.',
      'The pea has been taken out and the hole sealed with candle wax. It cannot make a sound.',
      'Somebody wanted a whistle that nothing could hear. Somebody was right.',
    ],
  },
  {
    id: 'sign_slowtracks', kind: 'sign', act: 3, icon: 'boots',
    title: 'A Trail That Never Runs',
    lines: [
      'Hoof prints the size of skillets, one stride apart, dead level for a mile.',
      'It never breaks pace. Not once, the whole length of the ridge.',
      'When it finally does, a line lights up first. Cross the line early, never late.',
    ],
  },
  {
    id: 't12_nameplate', kind: 'troop12', act: 3, icon: 'coin',
    title: 'A Nameplate, Sanded Blank',
    lines: [
      'Tin, the size of a badge, the kind that goes on the end of a footlocker.',
      'Somebody sanded the name off, and did it recently: the scratches are still bright.',
      'Brock says do not ask about the twelfth name yet. Some other night, he says.',
    ],
  },
];

const Finds = {
  total: FINDS.length,

  // id to def, built on first ask and kept.
  byId(id) {
    if (!this._map) {
      this._map = {};
      for (let i = 0; i < FINDS.length; i++) this._map[FINDS[i].id] = FINDS[i];
    }
    return this._map[id] || null;
  },

  // The journal is the save, so it is read defensively: an old save may not
  // have the key at all, and nothing here is allowed to be the thing that
  // throws during a run.
  journal() {
    if (typeof META === 'undefined' || !META) return {};
    if (!META.journal || typeof META.journal !== 'object') META.journal = {};
    return META.journal;
  },

  has(id) { return !!this.journal()[id]; },

  forAct(act) {
    const a = act > 0 ? act : 1;
    const out = [];
    for (let i = 0; i < FINDS.length; i++) if (FINDS[i].act === a) out.push(FINDS[i]);
    return out;
  },

  remaining(act) {
    const list = this.forAct(act);
    let n = 0;
    for (let i = 0; i < list.length; i++) if (!this.has(list[i].id)) n++;
    return n;
  },

  // The next thing this act owes you. The table is authored in the order the
  // act hands them over, relics and signs interleaved, so walking it and
  // taking the first unfound entry keeps each kind in its own sequence: a
  // relic never arrives before the relic that sets it up, and a sign never
  // teaches a tell out of turn.
  nextFor(act) {
    const list = this.forAct(act);
    for (let i = 0; i < list.length; i++) if (!this.has(list[i].id)) return list[i].id;
    return null;
  },

  // Write the key, bank it, put the card up. Granting something already in the
  // journal does nothing and says so, so callers can be careless.
  grant(g, id) {
    const def = this.byId(id);
    if (!def) return false;
    const j = this.journal();
    if (j[def.id]) return false;
    j[def.id] = true;
    if (typeof META !== 'undefined' && META && typeof META.save === 'function') META.save();
    if (typeof showFindCard === 'function') showFindCard(def);
    return true;
  },
};
