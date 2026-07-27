// Merit Badge Massacre: every word anyone says. Scout barks fire during runs,
// Scoutmaster Brock holds court at the campfire and remembers your last night.
'use strict';

const BARKS = {
  max: {
    runstart: ['Troop 13, moving out.', 'Eyes open. Hands steady.', 'For the troop.'],
    boss: ['That one has a title. Great.', 'Steady. Aim for the eyes.', 'Big ones fall the same way.'],
    lowhp: ['Just a scratch. A big scratch.', 'Regroup. Breathe.', 'Not like this. Not tonight.'],
    chest: ['Requisitioned.', 'The troop provides.'],
    revive: ['A scout finishes the hike.', 'Not yet. NOT yet.'],
    win: ['Dawn. We made it.', 'Report: everything is on fire, sir.'],
    death: ['Tell them... I earned it...'],
    kills: ['That is a lot of paperwork.', 'Two hundred. Somebody count.'],
  },
  junie: {
    runstart: ['Time to earn my FIRE badge.', 'Ha ha ha ha. Okay. Focus.', 'Smells like s\'mores and vengeance.'],
    boss: ['Ooh, a BIG candle.', 'You ever seen a deer cry? Wanna?', 'I am going to need more marshmallows.'],
    lowhp: ['Ow ow ow OW.', 'Bad bunnies! BAD!', 'I am mostly fine. Mostly.'],
    chest: ['Presents! For me!', 'Ooh, shiny shiny.'],
    revive: ['Can not stop, will not stop.', 'The fire says get UP.'],
    win: ['The sun! My other favorite fire!', 'We won! Nobody check the forest.'],
    death: ['Cold... why is it cold...'],
    kills: ['I lost count at a hundred!', 'The smoke smells like victory.'],
  },
  gus: {
    runstart: ['I brought snacks for after.', 'Big night. Bigger appetite.', 'Gus is here. Relax, everybody.'],
    boss: ['That is a lot of critter.', 'You look like you skip breakfast.', 'I have a skillet with your name on it.'],
    lowhp: ['I have been hit in the snacks.', 'Everything hurts. Even the trail mix.', 'Walk it off. Walk it off.'],
    chest: ['Ooh. Heavier than it looks.', 'Is there food in this one?'],
    revive: ['Nap is over.', 'You woke me up. Rude.'],
    win: ['Dawn already? Time for pancakes.', 'We survived. Who wants eggs?'],
    death: ['Someone... eat my rations...'],
    kills: ['I count them like sheep.', 'A hundred down. Arms are noodles.'],
  },
};

const SELECT_LINES = {
  max: 'Max steps up. "Troop 13 does not run. Not from squirrels."',
  junie: 'Junie grins. "I already lit the roaster. It is not even dark yet."',
  gus: 'Gus stands, dusting crumbs. "Fine. But we eat after."',
};

const KILLER_NAMES = {
  squirrel: 'a squirrel', rabbit: 'a rabbit', doe: 'a doe', bat: 'a bat',
  raccoon: 'a raccoon', owl: 'an owl', boar: 'a boar', fox: 'a fox',
  beaver: 'a beaver', hare: 'the Hare of Perdition', vicar: 'the Trash Vicar',
  antlered: 'the Antlered One',
};

const BROCK = {
  intro: [
    'Scoutmaster Brock pokes the fire. "New blood. Good. The critters out there found religion, and it is not the friendly kind. Earn badges. Come back alive. In that order, preferably."',
    '"Rules of Camp Hearthwood: respect the fire, bank your badges, and if a rabbit smiles at you, it is not smiling."',
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
    hare: '"The Hare of Perdition. Every third landing it sprays. Count the hops, kid."',
    vicar: '"The Trash Vicar got you. Stay off his rings and mind the raccoons he calls."',
    antlered: '"The Antlered One itself. You got further than most of my troop ever did. Again."',
    generic: '"Back again. The forest keeps score, and so do I. Spend some badges before you go back out."',
  },
  dawn: [
    '"You saw the dawn. Thirty years I have run this camp and I can count dawn-watchers on one paw." He salutes with the coffee.',
    '"The Antlered One is down and the sun came up. Do not get comfortable. Antlers grow back."',
  ],
  idle: [
    '"The Badge Board takes badges, not promises."',
    '"Cocoa heals. That is not camp wisdom, that is medical fact out here."',
    '"Hold your ground near the fire all you want. Out there, keep moving."',
    '"Elites glow red. Chests fall out of them. Draw your own conclusions."',
    '"I knew that stag when he was a fawn. Shame. Great pendant, though."',
    '"Second Wind is not a myth. It is a purchase."',
    '"You aim with your eyes, not your feet. Strafe, kid. Strafe."',
  ],
};

function brockLine() {
  if (!META.metBrock) {
    META.metBrock = true;
    META.save();
    return BROCK.intro[0];
  }
  const last = META.lastRun;
  if (last && !last.ack) {
    last.ack = true;
    META.save();
    if (last.result === 'dawn') return BROCK.dawn[(Math.random() * BROCK.dawn.length) | 0];
    const line = BROCK.died[last.killer];
    return line || BROCK.died.generic;
  }
  return BROCK.idle[(Math.random() * BROCK.idle.length) | 0];
}
