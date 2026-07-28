// Merit Badge Massacre: every word anyone says. Scout barks fire during runs,
// Scoutmaster Brock holds court at the campfire and remembers your last night.
// BROCK.arc is the slow drip of the Troop 12 story, gated on META progress and
// delivered one beat at a time from brockLine().
'use strict';

const BARKS = {
  max: {
    runstart: ['Troop 13, moving out.', 'Eyes open. Hands steady.', 'For the troop.', 'Nobody gets Signed tonight. Not on my watch.', 'Badges up, chins up.', 'Stay together. Camp Hearthwood does not do rescues twice.'],
    boss: ['That one has a title. Great.', 'Steady. Aim for the eyes.', 'Big ones fall the same way.', 'It has a name. Do not learn it.', 'Hold the line like Brock taught us.', 'Big or small, it still counts as one badge.'],
    lowhp: ['Just a scratch. A big scratch.', 'Regroup. Breathe.', 'Not like this. Not tonight.', 'I have had worse at scout camp. Probably.', 'Troop 13 does not quit at half health.', 'Hold. HOLD.'],
    chest: ['Requisitioned.', 'The troop provides.'],
    revive: ['A scout finishes the hike.', 'Not yet. NOT yet.'],
    win: ['Dawn. We made it.', 'Report: everything is on fire, sir.'],
    death: ['Tell them... I earned it...', 'Somebody... bank my badges...', 'Tell Brock... I held the line...', 'It is fine. This is fine. Mostly fine.', 'Troop 13... does not... run...'],
    kills: ['That is a lot of paperwork.', 'Two hundred. Somebody count.'],
    bossnamed: {
      hare: 'Hold still, it says. Like that has ever worked.',
      vicar: 'Nothing here is owed to you. Move.',
      antlered: 'Troop 13. Hold the line. That is an order and a request.',
    },
  },
  junie: {
    runstart: ['Time to earn my FIRE badge.', 'Ha ha ha ha. Okay. Focus.', 'Smells like s\'mores and vengeance.', 'They are all Signed and I am ALL fire.', 'Who wants to see something get REALLY believed in.', 'Focus. Focus. Fire first, focus second.'],
    boss: ['Ooh, a BIG candle.', 'You ever seen a deer cry? Wanna?', 'I am going to need more marshmallows.', 'It has a WHOLE NAME. I am so excited.', 'Ooh, it is famous. Famous things burn great.', 'Bigger tin, bigger fire. Math.'],
    lowhp: ['Ow ow ow OW.', 'Bad bunnies! BAD!', 'I am mostly fine. Mostly.', 'That is going to leave a hilarious scar.', 'Okay THAT one I felt.', 'Still on fire! Wait, is that me?'],
    chest: ['Presents! For me!', 'Ooh, shiny shiny.'],
    revive: ['Can not stop, will not stop.', 'The fire says get UP.'],
    win: ['The sun! My other favorite fire!', 'We won! Nobody check the forest.'],
    death: ['Cold... why is it cold...', 'No fire... no fire anywhere...', 'Tell the marshmallows... I loved them...', 'This is... a really bad campfire story...', 'I bet I still... look cool...'],
    kills: ['I lost count at a hundred!', 'The smoke smells like victory.'],
    bossnamed: {
      hare: 'BRAMBLEBUCK! I have wanted to meet you since orientation!',
      vicar: 'Ooh, the collector. Collect THIS.',
      antlered: 'Big Nobody! I brought extra matches, just for you!',
    },
  },
  gus: {
    runstart: ['I brought snacks for after.', 'Big night. Bigger appetite.', 'Gus is here. Relax, everybody.', 'Whatever it believes in, I believe in lunch.', 'Let us get this over with, I am hungry.', 'Slow and steady. Mostly slow.'],
    boss: ['That is a lot of critter.', 'You look like you skip breakfast.', 'I have a skillet with your name on it.', 'Oh, this one has a whole legend. Fancy.', 'Big name, big target.', 'I have been hungrier than this. Barely.'],
    lowhp: ['I have been hit in the snacks.', 'Everything hurts. Even the trail mix.', 'Walk it off. Walk it off.', 'That woke me up, at least.', 'I am fine. The trail mix is not.', 'Rude. Very rude.'],
    chest: ['Ooh. Heavier than it looks.', 'Is there food in this one?'],
    revive: ['Nap is over.', 'You woke me up. Rude.'],
    win: ['Dawn already? Time for pancakes.', 'We survived. Who wants eggs?'],
    death: ['Someone... eat my rations...', 'Do not let this go to waste... any of it...', 'Tell them I finished my snacks first...', 'Worth it. The snacks were worth it...', 'Nap time... forever, I guess...'],
    kills: ['I count them like sheep.', 'A hundred down. Arms are noodles.'],
    bossnamed: {
      hare: 'The hopping one. I have heard the stories. Underwhelming so far.',
      vicar: 'You are not getting my snacks. Try the badges instead.',
      antlered: 'OLD NOBODY. I have skipped fewer meals than you have skipped centuries.',
    },
  },
};

const SELECT_LINES = {
  max: 'Max steps up. "Troop 13 does not run. Not from squirrels."',
  junie: 'Junie grins. "I already lit the roaster. It is not even dark yet."',
  gus: 'Gus stands, dusting crumbs. "Fine. But we eat after."',
};

// Boss ids never change, they are save keys. The prose that goes with each
// one is the new cryptid lore: BRAMBLEBUCK (hare), THE TALLYMAN (vicar),
// OLD NOBODY / HOLLOWANTLER (antlered).
const KILLER_NAMES = {
  squirrel: 'a squirrel', rabbit: 'a rabbit', doe: 'a doe', bat: 'a bat',
  raccoon: 'a raccoon', owl: 'an owl', boar: 'a boar', fox: 'a fox',
  beaver: 'a beaver', hare: 'BRAMBLEBUCK', vicar: 'THE TALLYMAN',
  antlered: 'OLD NOBODY',
};

// Battle barks a boss can speak mid fight. Plain strings; any letter spaced,
// slow delivery is a render concern for whatever draws these, not stored here.
const BOSSLINES = {
  hare: 'hold still. it is only a pin.',
  vicar: 'everything you have is owed.',
  antlered: 'somebody tell them about me.',
};

const BOSS_EPITHETS = {
  hare: 'the one that hops',
  vicar: 'the collector',
  antlered: 'the first story',
};

const BROCK = {
  intro: [
    'Scoutmaster Brock pokes the fire. "New blood. Good. Every critter out here that has truly seen one of them believes forever after, and belief like that leaves a mark, a little tin stamp pressed into the fur. We call that getting Signed. Earn badges. Come back alive. In that order, preferably."',
    '"Rules of Camp Hearthwood: respect the fire, bank your badges, and if a rabbit smiles at you, it already believes in something you really do not want it to."',
  ],
  died: {
    squirrel: '"A squirrel. You were bested by a SQUIRREL. I have led this troop thirty years and it does not get less embarrassing."',
    rabbit: '"A rabbit got you. They hop, kid. You can see the whole attack coming from the air."',
    doe: '"Killed by a doe. Gentle eyes, they said. Nature is healing, they said."',
    bat: '"Bats. Hate the wobble. Everyone hates the wobble."',
    raccoon: '"A raccoon. It probably went through your pack afterwards. They always do."',
    owl: '"The owls spit feathers. Keep your feet moving and they cannot lead the shot."',
    boar: '"Boars telegraph the charge. Big exclamation of intent. Step LEFT."',
    fox: '"Foxes weave. Stop shooting where they were and shoot where they are going."',
    beaver: '"A beaver. Death by municipal engineering. There is a badge for irony somewhere."',
    hare: '"BRAMBLEBUCK. Signed young, they say, back when the tokens were still hand stamped. Every third landing it sprays. Count the hops, kid."',
    vicar: '"THE TALLYMAN got you. Everything you own, he considers a loan. Stay off his rings and mind the raccoons he calls."',
    antlered: '"OLD NOBODY. HOLLOWANTLER, if you want its whole name, though nobody out there wants to be caught saying it twice. You got further than most of Troop 12 ever did. Again."',
    generic: '"Back again. The forest keeps score, and so do I. Spend some badges before you go back out."',
  },
  dawn: [
    '"You saw the dawn. Thirty years I have run this camp and I can count dawn-watchers on one paw." He salutes with the coffee.',
    '"OLD NOBODY is down and the sun came up. Do not get comfortable. Antlers grow back, and so, probably, does he."',
  ],
  idle: [
    '"The Badge Board takes badges, not promises."',
    '"Cocoa heals. That is not camp wisdom, that is medical fact out here."',
    '"Hold your ground near the fire all you want. Out there, keep moving."',
    '"Elites glow red. Chests fall out of them. Draw your own conclusions."',
    '"I knew that stag when he was a fawn. Before he got Signed. Shame. Great rack, though."',
    '"Second Wind is not a myth. It is a purchase."',
    '"You aim with your eyes, not your feet. Strafe, kid. Strafe."',
  ],
  // Once the firefly has properly moved in, Brock pretends not to be charmed
  // about it. He fails. Mixed into the idle pool when META.flags.blinkFriend.
  blink: [
    '"That bug follows you everywhere now. I do not name wildlife. If I did, which I do not, that one is Blink."',
    '"Your firefly sat on my ledger hand for an hour last night. Got nothing done. It can stay."',
    '"Thirty years on this ridge and the woods finally sent us something that is not trying to eat anyone. Do not tell it I said that."',
  ],
  // Twelve gated story beats, delivered one at a time, oldest unseen and
  // gate-passing beat first. Each gate reads META defensively so it still
  // works if a save is missing journal, flags, or codex entirely.
  arc: [
    {
      id: 'firstNight',
      gate: m => (m.runs || 0) >= 1,
      lines: [
        '"Back already." Brock does not look up from the fire. "Good. That means you are still breathing. Sit. I only tell this story once, and I am not repeating the good parts."',
        '"Thirty years ago I brought twelve kids up this ridge. I brought one down. That is a fireside talk for later. Tonight, go get badges."',
      ],
    },
    {
      id: 'twoMarks',
      gate: m => arcCodexCount(m, 'seen') >= 2,
      lines: [
        '"You have gotten a good look at two of them now. Notice the tin? Every marked critter wears one, pressed right into the fur. Somebody out there is stamping those by hand."',
        '"Do not ask me who. I have theories. None of them let me sleep."',
      ],
    },
    {
      id: 'firstPage',
      gate: m => arcJournalKeys(m) >= 1,
      lines: [
        '"You are keeping notes. Good. Nobody who ever camped this ridge before you wrote a single thing down, and look how that went."',
        '"Keep the journal. I will read it when you are done needing it. Preferably a long time from now."',
      ],
    },
    {
      id: 'brambleDown',
      gate: m => arcFlag(m, 'act1boss'),
      lines: [
        '"BRAMBLEBUCK, down. First one Signed, if the old stories are even true, which means you just beat the one with seniority."',
        '"Do not let it go to your head. It was, and I want to stress this, a rabbit."',
      ],
    },
    {
      id: 'fiveGraves',
      gate: m => (m.deaths || 0) >= 5,
      lines: [
        '"Five times back to this fire in a body bag, more or less. I stopped flinching around number three. Professional courtesy."',
        '"You keep coming back, though. That is either grit or a badge quota you are very committed to. I am choosing to believe grit."',
      ],
    },
    {
      id: 'actTwo',
      gate: m => arcFlag(m, 'act2'),
      lines: [
        '"You are past the treeline proper now. Further than I go. Further than most of my old troop got." A pause. "Different makers stamp those tokens out there. Different hands, different tin. They compete. I do not know for what."',
        '"Bring me one, if you can pry it loose. I have wanted to look at one up close for thirty years. I have also, and I cannot stress this enough, been too much of a coward."',
      ],
    },
    {
      id: 'fullJournal',
      gate: m => arcJournalKeys(m) >= 8,
      lines: [
        '"That journal of yours is getting thick. You have written down more about this ridge than I managed in thirty years, and I LIVE here."',
        '"Feel free to be smug about it. Once."',
      ],
    },
    {
      id: 'tallymanDown',
      gate: m => arcFlag(m, 'act2boss'),
      lines: [
        '"THE TALLYMAN, finally handled. He has been walking off with badges since before you were born. Did you get any of them back?"',
        '"No? Of course not. He is very organized about it. There is probably a ledger."',
      ],
    },
    {
      id: 'actThree',
      gate: m => arcFlag(m, 'act3'),
      lines: [
        '"This deep, the maps stop helping. This deep, Camp Hearthwood stops being the last camp on the ridge and starts being the last camp, period."',
        '"Bring back whatever you find. I am done being surprised at my age. I would just like to be informed."',
      ],
    },
    {
      id: 'threeKills',
      gate: m => arcCodexCount(m, 'killed') >= 3,
      lines: [
        '"Three of the named ones, put down for good. That is not luck, kid. That is a pattern. I am almost proud, which is new for me."',
        '"Try not to let it go to your head twice in one season."',
      ],
    },
    {
      id: 'finalDown',
      gate: m => arcFlag(m, 'act3boss'),
      lines: [
        '"OLD NOBODY. HOLLOWANTLER, if you want its whole name, though nothing out there wants to hear it said twice. Down. Thirty years running this camp did not prepare me for how quiet that would be."',
        '"I had a whole speech ready. I am not giving it tonight. Go celebrate. And do not ask me about the twelfth name yet. Some other night."',
      ],
    },
    {
      id: 'firstDawn',
      gate: m => (m.dawns || 0) >= 1,
      lines: [
        '"You saw a whole dawn out there and came back to tell me about it. Sit by the fire. The actual seat, not the log with the splinter."',
        '"Thirty years I ran this camp on the theory that somebody eventually would. Thank you for proving the theory. Cocoa is on me tonight."',
      ],
    },
  ],
};

// -- BROCK.arc helpers: everything here reads META defensively so it still
// works before journal/flags/codex exist on a save, or in a stubbed test. --

function arcJournalKeys(m) {
  const j = (m && m.journal) || {};
  return Object.keys(j).length;
}

function arcCodexCount(m, kind) {
  const c = (m && m.codex) || {};
  let n = 0;
  for (const id in c) {
    const e = c[id];
    if (e && e[kind]) n++;
  }
  return n;
}

function arcFlag(m, name) {
  const f = (m && m.flags) || {};
  return !!f[name];
}

// First unseen, gate-passing arc beat, or null if none is ready. Marks the
// beat as seen and saves as a side effect, so it only ever fires once.
function nextArcLine() {
  if (!META.flags) META.flags = {};
  if (!META.flags.arcSeen) META.flags.arcSeen = {};
  const seen = META.flags.arcSeen;
  for (const beat of BROCK.arc) {
    if (seen[beat.id]) continue;
    if (!beat.gate(META)) continue;
    seen[beat.id] = true;
    META.save();
    return beat.lines.join(' ');
  }
  return null;
}

function brockLine() {
  if (!META.metBrock) {
    META.metBrock = true;
    META.save();
    return BROCK.intro[0];
  }
  const arcLine = nextArcLine();
  if (arcLine) return arcLine;
  const last = META.lastRun;
  if (last && !last.ack) {
    last.ack = true;
    META.save();
    if (last.result === 'dawn') return BROCK.dawn[(Math.random() * BROCK.dawn.length) | 0];
    const line = BROCK.died[last.killer];
    return line || BROCK.died.generic;
  }
  const pool = arcFlag(META, 'blinkFriend') ? BROCK.idle.concat(BROCK.blink) : BROCK.idle;
  return pool[(Math.random() * pool.length) | 0];
}

// ---------------------------------------------------------------------------
// THE QUARTERMASTER: a stout older scout who runs the supply stall by the
// Badge Board. Dialogue only for now; he runs nothing yet.
const QUARTERMASTER = {
  intro: 'The Quartermaster looks up from a ledger thicker than you are. "Name?" You start to answer. "Not yours. The inventory has names. You are the thing that makes the inventory smaller."',
  idle: [
    '"Requisition forms are in triplicate now. The forest keeps eating the second copy."',
    '"We are down to four tin cups. If a raccoon has the fifth, it signed nothing for it."',
    '"Cookie Money is not legal tender. It is cookie money. It becomes badges at my table and nowhere else, and the rate is fair because I set it."',
    '"Do not ask what is in the barrels. They are labeled. The label says BARREL."',
    '"I count marshmallows by the bag, not the piece. Learned that the hard way. Junie was involved."',
    '"Lost and found out here is the whole forest, kid. Found is just the part I keep on shelves."',
  ],
  // Spoken once per finished night: the camp converts leftover Cookie Money
  // to badges at dawn, and he is the one holding the ledger when it happens.
  coins: '"Your Cookie Money from last night cleared. Counted, converted, logged, stamped. If the badge number felt small, take it up with the ledger. The ledger does not care."',
};

// One line per ask: the intro once, then the dawn ledger beat once per run,
// then the idle pool. Gates read META defensively like Brock's do.
function quartermasterLine() {
  if (!META.flags) META.flags = {};
  if (!META.flags.metQuartermaster) {
    META.flags.metQuartermaster = true;
    META.save();
    return QUARTERMASTER.intro;
  }
  const last = META.lastRun;
  if (last && !last.qmAck) {
    last.qmAck = true;
    META.save();
    return QUARTERMASTER.coins;
  }
  return QUARTERMASTER.idle[(Math.random() * QUARTERMASTER.idle.length) | 0];
}

// THE RESCUED CRITTER: an unmarked squirrel by the fire, there because you
// put something down that would have had it. Squeaks, with subtitle flavor.
const CRITTER = {
  squeaks: [
    'Squeak! (It puffs out its chest. No tin pendant. Just fur.)',
    'Squeak squeak. (It hops onto your boot, reconsiders, hops off with dignity.)',
    '(It holds up an acorn. It is showing you the acorn. It puts the acorn away.)',
    'Squeak. (It glances at the treeline, then presses a little closer to the fire.)',
    '(A small, unmarked squirrel. It is here because you kept coming back.)',
  ],
};

function critterLine() {
  return CRITTER.squeaks[(Math.random() * CRITTER.squeaks.length) | 0];
}
