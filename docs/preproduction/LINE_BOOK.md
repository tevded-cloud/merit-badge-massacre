# MERIT BADGE MASSACRE: THE LINE BOOK
2026-07-29. This is the file you approve. Nothing in it lands in js/dialogue.js, js/finds.js, or js/feats.js until you have read it.

HOW TO REVIEW THIS BOOK
1. Read one speaker straight through, NEW column only, top to bottom. You should hear one person. If any line could belong to a different scout unchanged, flag it: that is the defect this whole pass exists to remove.
2. Then spot check OLD against NEW on the rows that matter to you. Every KEPT row is verbatim source text and costs nothing; every NEW row orphans one rendered clip and costs one synth.
3. Status column: MERGE means the row is inside the mandated scope (death, lowhp, bossnamed, named info bugs, the intro and arc repairs) and can go in now. STAGED means the row waits on your answer to STORY_DESIGN.md section 12 Q3 (whether barks outside death and lowhp get rewritten at all). Nothing STAGED touches code until you say yes.
4. Rows marked (skeptic correction) differ from what the writer seat originally delivered: two read-only skeptic passes condemned the original and the correction is printed here. The condemned text is quoted in DIALOGUE_DESIGN.md section 6 so you can compare.

=====================================================================
MAX (writer seat 1, js/dialogue.js:9-23 and :62)
=====================================================================

| Slot | OLD | NEW | Status |
|---|---|---|---|
| runstart[0] | Troop 13, moving out. | Formation on me. Watch your spacing. | STAGED |
| runstart[1] | Eyes open. Hands steady. | KEPT | free |
| runstart[2] | For the troop. | Somebody walked this line before us. (skeptic correction) | STAGED |
| runstart[3] | Nobody gets Signed tonight. Not on my watch. | KEPT (frozen keeper) | free |
| runstart[4] | Badges up, chins up. | Load up. Voices down. | STAGED |
| runstart[5] | Stay together. Camp Hearthwood does not do rescues twice. | KEPT | free |
| boss[0] | That one has a title. Great. | It has a title. Spread out. | STAGED |
| boss[1] | Steady. Aim for the eyes. | KEPT | free |
| boss[2] | Big ones fall the same way. | Do not stare at it. Shoot. | STAGED |
| boss[3] | It has a name. Do not learn it. | KEPT (frozen keeper) | free |
| boss[4] | Hold the line like Brock taught us. | KEPT | free |
| boss[5] | Big or small, it still counts as one badge. | It is holding the trail. Move. (skeptic correction) | STAGED |
| lowhp[0] | Just a scratch. A big scratch. | Stay up. Stay up. Stay up. | MERGE |
| lowhp[1] | Regroup. Breathe. | KEPT | free |
| lowhp[2] | Not like this. Not tonight. | KEPT | free |
| lowhp[3] | I have had worse at scout camp. Probably. | Hands. Steady. Steady. Please. | MERGE |
| lowhp[4] | Troop 13 does not quit at half health. | On your feet, squad leader. | MERGE |
| lowhp[5] | Hold. HOLD. | KEPT | free |
| chest[0] | Requisitioned. | KEPT | free |
| chest[1] | The troop provides. | Take it. Keep moving. | STAGED |
| revive[0] | A scout finishes the hike. | KEPT | free |
| revive[1] | Not yet. NOT yet. | KEPT | free |
| win[0] | Dawn. We made it. | KEPT | free |
| win[1] | Report: everything is on fire, sir. | Count off while it is light. | STAGED |
| death[0] | Tell them... I earned it... | Hold... somebody hold the... | MERGE |
| death[1] | Somebody... bank my badges... | Who is still up... who is... (skeptic correction) | MERGE |
| death[2] | Tell Brock... I held the line... | Do not... do not look at me... | MERGE |
| death[3] | It is fine. This is fine. Mostly fine. | It learned my name... | MERGE |
| death[4] | Troop 13... does not... run... | I was supposed to... I was... | MERGE |
| kills[0] | That is a lot of paperwork. | A hundred, and it is not dawn yet. | STAGED |
| kills[1] | Two hundred. Somebody count. | A hundred. The forest is counting too. | MERGE (number bug fix) |
| bossnamed.hare | Hold still, it says. Like that has ever worked. | Nobody holds still. Move on my mark. | MERGE |
| bossnamed.vicar | Nothing here is owed to you. Move. | KEPT | free |
| bossnamed.antlered | Troop 13. Hold the line. That is an order and a request. | KEPT (frozen keeper) | free |
| bossnamed.mole | It wants noise. Then we give it noise, together, on my mark. | KEPT (frozen keeper) | free |
| bossnamed.behind | Nobody turns around. Nobody. Eyes front, Troop 13. | KEPT (frozen keeper) | free |
| SELECT_LINES.max | Max steps up. "Troop 13 does not run. Not from squirrels." | Max tightens the sling cord, once, like always. "Eyes open. I go first." | STAGED |

Max skeptic corrections in this table:
- runstart[2]: the seat's "New blazes on the trail. Not ours." pre-spent the totem[5] marked-wood revelation and near-quoted its clinching phrase. The seat's own flagged fallback is used instead.
- boss[5]: "It is wearing a token. Move." named the token in a pool that could someday fire before the twoMarks reveal, and told the player what the screen already shows. Replaced with a positioning read, which is his noticing lever.
- death[1]: "I lost count. I lost count." collided verbatim with Junie's kept kills[0] "I lost count at a hundred!". Replaced with the headcount loss, which is his tragedy (he counts people, not kills), in the unfinished-sentence death register his bible mandates.
- Staging wall: seat 1 delivered all 20 changes as merge-ready with no Q3 staging note. Both skeptics condemned that. The wall is now applied: death, lowhp, kills[1], and bossnamed.hare merge; the other ten rows are STAGED with the other two scouts' staged sets. The tone skeptic would also merge kills[0]; the craft skeptic stages it because the old line carried no number and so it is not a bug fix. The stricter ruling is printed. Overrule it if you want kills[0] in the first wave.
- death[2] "Do not... do not look at me..." was checked against the squirrel's new duality line (end of this book). Phrasing is not close; both stand. If you read them as too close, Max's seat has already agreed theirs yields.

=====================================================================
JUNIE (writer seat 2, js/dialogue.js:25-41 and :63)
=====================================================================

| Slot | OLD | NEW | Status |
|---|---|---|---|
| runstart[0] | Time to earn my FIRE badge. | Dry night. Good. Everything catches. | STAGED |
| runstart[1] | Ha ha ha ha. Okay. Focus. | KEPT | free |
| runstart[2] | Smells like s'mores and vengeance. | Dark already. Fine. I brought my own light. | STAGED |
| runstart[3] | They are all Signed and I am ALL fire. | The dark wants tonight. So does my fire. (skeptic correction) | STAGED |
| runstart[4] | Who wants to see something get REALLY believed in. | Roaster is hot. Stay off my trail. | STAGED |
| runstart[5] | Focus. Focus. Fire first, focus second. | Matches counted. Twice. Okay. Go. | STAGED |
| boss[0] | Ooh, a BIG candle. | Big one. It is not scared of me. | STAGED |
| boss[1] | You ever seen a deer cry? Wanna? | It walked through my fire. Nothing does that. | STAGED |
| boss[2] | I am going to need more marshmallows. | Everything burns. Even that. Probably. | STAGED |
| boss[3] | It has a WHOLE NAME. I am so excited. | Named ones smell different. Older smoke. | STAGED |
| boss[4] | Ooh, it is famous. Famous things burn great. | It is old. Old wood catches fast. | STAGED |
| boss[5] | Bigger tin, bigger fire. Math. | Big tin. Bad night. (skeptic correction) | STAGED |
| lowhp[0] | Ow ow ow OW. | Okay. Okay. Not okay. | MERGE |
| lowhp[1] | Bad bunnies! BAD! | Smoke everywhere. None of it mine. (skeptic correction) | MERGE |
| lowhp[2] | I am mostly fine. Mostly. | Hands shaking. Cannot strike a match. | MERGE |
| lowhp[3] | That is going to leave a hilarious scar. | Getting cold. Move. Move. | MERGE |
| lowhp[4] | Okay THAT one I felt. | Do not go out. Do not go out. | MERGE |
| lowhp[5] | Still on fire! Wait, is that me? | Getting dim. Getting dim. (skeptic correction) | MERGE |
| chest[0] | Presents! For me! | Dibs on anything that burns. | STAGED |
| chest[1] | Ooh, shiny shiny. | If it burns, it rides with me. (skeptic correction) | STAGED |
| revive[0] | Can not stop, will not stop. | Still lit. Still lit. (skeptic correction) | STAGED |
| revive[1] | The fire says get UP. | KEPT (writer's judgment: mania as devotion, on-lever) | free |
| win[0] | The sun! My other favorite fire! | The sun. The one fire I did not light. | STAGED |
| win[1] | We won! Nobody check the forest. | Made it. Tonight, anyway. | STAGED |
| death[0] | Cold... why is it cold... | KEPT (diagnosis keeper) | free |
| death[1] | No fire... no fire anywhere... | KEPT (diagnosis keeper) | free |
| death[2] | Tell the marshmallows... I loved them... | Somebody... light something... please... | MERGE |
| death[3] | This is... a really bad campfire story... | Struck it... nothing caught... (skeptic correction) | MERGE |
| death[4] | I bet I still... look cool... | KEPT (diagnosis keeper) | free |
| kills[0] | I lost count at a hundred! | KEPT (trigger-true at kills>=100, js/game.js:1341-1344; she is not a counter, which is the point) | free |
| kills[1] | The smoke smells like victory. | A hundred. The smoke smells the same. (skeptic correction) | STAGED |
| bossnamed.hare | BRAMBLEBUCK! I have wanted to meet you since orientation! | A pin. It is calling that a pin. | MERGE |
| bossnamed.vicar | Ooh, the collector. Collect THIS. | It cannot have the matches. Not the matches. | MERGE |
| bossnamed.antlered | Big Nobody! I brought extra matches, just for you! | You are so old. Nothing that old should move. | MERGE |
| bossnamed.mole | It is blind! HEY! OVER HERE! I am the loudest thing alive! | KEPT (diagnosis keeper) | free |
| bossnamed.behind | I keep looking and it keeps not being there. I hate it. I love it. | KEPT (diagnosis keeper) | free |
| SELECT_LINES.junie | Junie grins. "I already lit the roaster. It is not even dark yet." | KEPT (writer's judgment: compulsion, not glee) | free |

Junie skeptic corrections in this table:
- runstart[3]: the seat's "They believe forever. I just need tonight." restated the exact belief clause that seat 4's intro rewrite exists to remove, and could fire on run one, falsifying the twoMarks regate. Re-angled through her fire lever against the night; the belief rule is gone from the line.
- boss[5]: "That tin looks new." brushed the token reveal in a pool that could go live for a future named threat. The seat's own offered swap-in is used.
- lowhp[1]: "Too many. Too many." was bare repetition with zero lever content, movable to Max or Gus unchanged, and part of a three-way crack-device collapse at low health. Re-levered through smoke: the danger read is now unmistakably hers.
- lowhp[5]: "Ha. Ha. Not funny anymore." was the slowest half-second danger read in her pool. Since the seat was being revised anyway, it now reads herself as a fire going dim: doubled words stay (her sanctioned device) but the content is fire-lever, unmovable.
- chest[1]: "Dry matches. Finally." asserted chest contents on a per-chest trigger (js/director.js:52-56); most chests do not contain matches, and a rarity-shaped "Finally" self-contradicts by the third chest. Replaced with a content-neutral fire-lever line.
- revive[0]: "Not out yet. Not out yet." sat one word from Max's kept revive[1] "Not yet. NOT yet.". The going-out-of-a-fire reading is now explicit and the overlap is gone.
- death[3]: "Matches... left pocket... take them..." repeated the bequeathing-supplies death beat that is Gus's template keeper ("Someone... eat my rations..."). Re-angled onto her failure lever, fragment shape kept. Her notes promised to yield on close collisions; held to it.
- kills[1]: "A hundred. The woods are not emptier." was interchangeable with Gus's and near-identical in angle to Max's. Re-angled through smoke; the count stays because it is trigger-true.

=====================================================================
GUS (writer seat 3, js/dialogue.js:43-57 and :64)
=====================================================================

| Slot | OLD | NEW | Status |
|---|---|---|---|
| runstart[0] | I brought snacks for after. | Packed for three nights. Just in case. | STAGED |
| runstart[1] | Big night. Bigger appetite. | Ground is wrong tonight. Walk heavy. (skeptic correction) | STAGED |
| runstart[2] | Gus is here. Relax, everybody. | Heavy pack. Light feet. Go. (skeptic correction) | STAGED |
| runstart[3] | Whatever it believes in, I believe in lunch. | KEPT (diagnosis keeper) | free |
| runstart[4] | Let us get this over with, I am hungry. | One foot, then the other. All night. | STAGED |
| runstart[5] | Slow and steady. Mostly slow. | KEPT | free |
| boss[0] | That is a lot of critter. | Bigger than I pictured. A lot bigger. | STAGED |
| boss[1] | You look like you skip breakfast. | Heavy steps. I dodge early. (skeptic correction) | STAGED |
| boss[2] | I have a skillet with your name on it. | It comes through me first. | STAGED |
| boss[3] | Oh, this one has a whole legend. Fancy. | The stories were about this one. | STAGED |
| boss[4] | Big name, big target. | Big does not mean slow. | STAGED |
| boss[5] | I have been hungrier than this. Barely. | Room just got smaller. | STAGED |
| lowhp[0] | I have been hit in the snacks. | Okay. That one was real. | MERGE |
| lowhp[1] | Everything hurts. Even the trail mix. | Do not fall. Not here. | MERGE |
| lowhp[2] | Walk it off. Walk it off. | KEPT | free |
| lowhp[3] | That woke me up, at least. | Hands are shaking. Hands never shake. | MERGE |
| lowhp[4] | I am fine. The trail mix is not. | Quit it. QUIT IT. | MERGE |
| lowhp[5] | Rude. Very rude. | It is faster than me. | MERGE |
| chest[0] | Ooh. Heavier than it looks. | KEPT (skeptic correction: the trim burned a synth on a line the diagnosis never condemned for Gus; reverted, clip saved) | free |
| chest[1] | Is there food in this one? | Split it even, later. | STAGED |
| revive[0] | Nap is over. | Up. I am up. | STAGED |
| revive[1] | You woke me up. Rude. | That was close. Too close. | STAGED |
| win[0] | Dawn already? Time for pancakes. | Dawn. We get to be hungry tomorrow. | MERGE (ranked failure 5 leak fix) |
| win[1] | We survived. Who wants eggs? | Still standing. Did not think I would be. (skeptic correction) | STAGED |
| death[0] | Someone... eat my rations... | KEPT (diagnosis keeper, the template) | free |
| death[1] | Do not let this go to waste... any of it... | KEPT | free |
| death[2] | Tell them I finished my snacks first... | Keep them fed... somebody... | MERGE |
| death[3] | Worth it. The snacks were worth it... | I am not scared... I am not... | MERGE |
| death[4] | Nap time... forever, I guess... | I feel... small... | MERGE |
| kills[0] | I count them like sheep. | A hundred. Arms are heavy. Keep going. | STAGED |
| kills[1] | A hundred down. Arms are noodles. | A hundred. Every one was heavy. (skeptic correction) | STAGED |
| bossnamed.hare | The hopping one. I have heard the stories. Underwhelming so far. | A pin does not land that heavy. (skeptic correction) | MERGE |
| bossnamed.vicar | You are not getting my snacks. Try the badges instead. | I share. I do not owe. There is a difference. | MERGE |
| bossnamed.antlered | OLD NOBODY. I have skipped fewer meals than you have skipped centuries. | I am not telling anybody anything. | MERGE |
| bossnamed.mole | MAWMOLE. All that digging and it still has not found lunch. | It wants my voice. It can go hungry. | MERGE |
| bossnamed.behind | THE BEHIND. Nope. I am facing this way now. Permanently. | KEPT (diagnosis keeper) | free |
| SELECT_LINES.gus | Gus stands, dusting crumbs. "Fine. But we eat after." | Gus gets up slow and shoulders the pack like it is nothing. "Fine. But we eat after." (narration only, spokenText unchanged, zero synth) | STAGED |

Gus skeptic corrections in this table:
- runstart[1]: "The dark got here early tonight." touched none of his five levers and failed the move-test outright: atmospheric filler in a book whose doctrine is that identity survives with the name hidden. Rerouted through his ground and weight levers, on the shape the skeptic supplied.
- runstart[2]: "Stay behind me when it gets loud." addressed companions who do not exist in a solo run (COOP_DESIGN.md section 1), and orders-to-nobody is Max's sanctioned quirk, not his. Replaced with a load-and-body line; "It goes through me first" was avoided because boss[2] already owns that register.
- boss[1]: "Dodge early." was an info-first tactical imperative addressed to nobody, which is Max's command lever. Converted to a Gus-shaped declarative.
- win[1]: "Still standing. All of us. Good." implied a party on a solo run, the exact leak the seats scrubbed out of Junie's old "We won!". Replaced with the craft skeptic's no-plural rewrite.
- kills[1]: "A hundred, and the woods are still full." was interchangeable with Junie's and identical in angle to Max's. Re-angled through weight, his lever.
- bossnamed.hare: the "Keep moving." tail was a command to nobody (Max's quirk), and both his and Junie's hare answers took the same refute-the-euphemism angle. The tail is dropped and the refutation now runs through weight, so the two answers split angles (Junie keeps the euphemism-horror, Gus carries the weight of the thing).
- chest[0]: reverted to KEPT per the craft skeptic; the seat's own notes arithmetic is corrected by this revert (29 changed voiced lines, not 30; the select change still costs zero because hash8 keys on spokenText, tools/voice/gen.py:318-320 and :392-399).

=====================================================================
BROCK AND THE WORLD (writer seat 4)
=====================================================================
All seat 4 rows are inside mandate (intro regate is ranked failure 3, arc closers are ranked failure 2, the qm and finds items are named in the diagnosis): every NEW row here is MERGE. All OLD text was verified verbatim against source in the seat's session.

## BROCK.address (dialogue.js:101)
| Slot | OLD | NEW |
|---|---|---|
| address.max | squad leader | KEPT |
| address.junie | the fire hazard | KEPT |
| address.gus | big fella | KEPT |

## BROCK.intro (dialogue.js:102-105)
| Slot | OLD | NEW |
|---|---|---|
| intro[0] {warm} | Scoutmaster Brock pokes the fire. "New blood. Good. Every critter out here that has truly seen one of them believes forever after, and belief like that leaves a mark, a little tin stamp pressed into the fur. We call that getting Signed. Earn badges. Come back alive. In that order, preferably." | Scoutmaster Brock pokes the fire. "New blood. Good. Rules of Camp Hearthwood: respect the fire, bank your badges, and if a rabbit smiles at you, it already believes in something you really do not want it to. Earn badges. Come back alive. In that order, preferably." |
| intro[1] | "Rules of Camp Hearthwood: respect the fire, bank your badges, and if a rabbit smiles at you, it already believes in something you really do not want it to." | "You will have questions. Keep them. Out here the answers arrive on their own schedule, and it has never once been a schedule I would have picked." (slot currently unreachable, dialogue.js:421-425; text provided in case it gets wired) |

## BROCK.died (dialogue.js:106-122)
| Slot | OLD | NEW |
|---|---|---|
| died.squirrel {closeup} | "A squirrel. You were bested by a SQUIRREL. I have led this troop thirty years and it does not get less embarrassing." | "A squirrel. You were bested by a SQUIRREL. It does not get less embarrassing, and believe me, I have given it every opportunity." |
| died.rabbit {deadpan} | "A rabbit got you. They hop, {scout}. You can see the whole attack coming from the air." | KEPT |
| died.doe {deadpan} | "Killed by a doe. Gentle eyes, they said. Nature is healing, they said." | KEPT |
| died.bat | "Bats. Hate the wobble. Everyone hates the wobble." | KEPT |
| died.raccoon | "A raccoon. It probably went through your pack afterwards. They always do." | KEPT |
| died.owl | "The owls spit feathers. Keep your feet moving and they cannot lead the shot." | KEPT |
| died.boar | "Boars telegraph the charge. Big exclamation of intent. Step LEFT, {scout}." | KEPT |
| died.fox | "Foxes weave. Stop shooting where they were and shoot where they are going." | KEPT |
| died.beaver {deadpan} | "A beaver. Death by municipal engineering. There is a badge for irony somewhere." | KEPT |
| died.hare | "BRAMBLEBUCK. Signed young, they say, back when the tokens were still hand stamped. Every third landing it sprays. Count the hops, kid." | KEPT |
| died.vicar | "THE TALLYMAN got you. Everything you own, he considers a loan. Stay off his rings and mind the raccoons he calls." | KEPT |
| died.antlered {warm} | "OLD NOBODY. HOLLOWANTLER, if you want its whole name, though nobody out there wants to be caught saying it twice. You got further than most of Troop 12 ever did. Again." | KEPT (diagnosis keeper) |
| died.mole | "MAWMOLE. Blind since before either of us was born and it has never once needed eyes: every shot you fire is you telling it exactly where to come up. It is only worth hitting when the nose is out, {scout}. The rest is dirt." | KEPT (diagnosis keeper) |
| died.behind {alarmed} | "THE BEHIND. You cannot shoot a thing that is not there, and it is never there. Take the cover away from it. Every stump you break is one less place in the world for it to stand." | KEPT (diagnosis keeper) |
| died.generic | "Back again, {scout}. The forest keeps score, and so do I. Spend some badges before you go back out." | KEPT (serves as the gate-miss fallback once the codex gate lands) |

## BROCK.dawn (dialogue.js:128-140)
| Slot | OLD | NEW |
|---|---|---|
| dawn[0] {warm} | "You saw the dawn. Thirty years I have run this camp and I can count dawn-watchers on one paw." He salutes with the coffee. | KEPT (permitted thirty-years instance) |
| dawn[1] {alarmed} | "OLD NOBODY is down and the sun came up. Do not get comfortable. Antlers grow back, and so, probably, does he." | KEPT |
| dawn[2] {warm} | "THE BEHIND is down and the sun came up. Thirty years I have felt something at my shoulder on this ridge. This morning there is nothing there, and I find I do not know what to do with my hands." | KEPT (frozen keeper, the controlled crack) |

## BROCK.idle (dialogue.js:141-149)
All seven KEPT verbatim: "The Badge Board takes badges, not promises." / "Cocoa heals. That is not camp wisdom, that is medical fact out here." / "Hold your ground near the fire all you want. Out there, keep moving." / "Elites glow red. Chests fall out of them. Draw your own conclusions." / "I knew that stag when he was a fawn. Before he got Signed. Shame. Great rack, though." / "Second Wind is not a myth. It is a purchase." / "You aim with your eyes, not your feet. Strafe, {scout}. Strafe." (The diagnosis faulted the pool's structure, not its wording; the escalation and retirement ask is a code gate, flagged in DIALOGUE_DESIGN.md.)

## BROCK.blink (dialogue.js:152-156), protected pool
All three KEPT verbatim (Blink is a named second-best moment; the pool is frozen).

## BROCK.totem (dialogue.js:160-167), keep-verbatim pool
All six KEPT verbatim, including totem[5] ("Marking wood to say you were here. That is their habit, not ours." He lets that sit. "And the woods have never once failed to notice.").

## BROCK.feats (dialogue.js:170-174)
All three KEPT verbatim.

## BROCK.arc (dialogue.js:182-297), 13 beats x 2, ids and order frozen
| Slot | OLD | NEW |
|---|---|---|
| firstNight_0 {warm} | "Back already." Brock does not look up from the fire. "Good. That means you are still breathing. Sit. I only tell this story once, and I am not repeating the good parts." | KEPT |
| firstNight_1 | "Thirty years ago I brought twelve kids up this ridge. I brought one down. That is a fireside talk for later. Tonight, go get badges." | KEPT (load-bearing thirty-years instance) |
| twoMarks_0 {alarmed} | "You have gotten a good look at two of them now. Notice the tin? Every marked critter wears one, pressed right into the fur. Somebody out there is stamping those by hand." | KEPT (frozen keeper; with intro[0] rewritten this is the first token explanation) |
| twoMarks_1 | "Do not ask me who. I have theories. None of them let me sleep." | KEPT |
| firstPage_0 | "You are keeping notes. Good. Nobody who ever camped this ridge before you wrote a single thing down, and look how that went." | KEPT |
| firstPage_1 | "Keep the journal. I will read it when you are done needing it. Preferably a long time from now." | KEPT |
| brambleDown_0 | "BRAMBLEBUCK, down. First one Signed, if the old stories are even true, which means you just beat the one with seniority." | KEPT |
| brambleDown_1 | "Do not let it go to your head. It was, and I want to stress this, a rabbit." | "Every story about that rabbit ends with the scout running. Yours did not. The woods have never had to finish that sentence before, so sleep close to the fire tonight." |
| fiveGraves_0 {deadpan} | "Five times back to this fire in a body bag, more or less. I stopped flinching around number three. Professional courtesy." | KEPT |
| fiveGraves_1 | "You keep coming back, though. That is either grit or a badge quota you are very committed to. I am choosing to believe grit." | "You keep coming back. Whatever it is that keeps deciding to let you, I have stopped trusting it, and I would like you to stop trusting it too." |
| actTwo_0 {alarmed} | "You are past the treeline proper now. Further than I go. Further than most of my old troop got." A pause. "Different makers stamp those tokens out there. Different hands, different tin. They compete. I do not know for what." | KEPT (frozen keeper) |
| actTwo_1 | "Bring me one, if you can pry it loose. I have wanted to look at one up close for thirty years. I have also, and I cannot stress this enough, been too much of a coward." | KEPT (frozen keeper, the planted lie) |
| fullJournal_0 | "That journal of yours is getting thick. You have written down more about this ridge than I managed in thirty years, and I LIVE here." | "That journal of yours is getting thick. Nobody has ever kept a record of this ridge for this long, and I am starting to think the ridge knows it." |
| fullJournal_1 | "Feel free to be smug about it. Once." | "Keep writing anyway. I could not tell you what the woods make of a record like that, and I notice nobody has ever made them find out." (skeptic correction) |
| tallymanDown_0 {deadpan} | "THE TALLYMAN, finally handled. He has been walking off with badges since before you were born. Did you get any of them back?" | KEPT |
| tallymanDown_1 | "No? Of course not. He is very organized about it. There is probably a ledger." | "No? Then it is all still somewhere. He was collecting, not keeping, and whatever he was collecting FOR has not been paid yet." |
| actThree_0 | "This deep, the maps stop helping. This deep, Camp Hearthwood stops being the last camp on the ridge and starts being the last camp, period." | KEPT (frozen keeper) |
| actThree_1 | "Bring back whatever you find. I am done being surprised at my age. I would just like to be informed." | KEPT (frozen keeper) |
| threeKills_0 | "Three of the named ones, put down for good. That is not luck, kid. That is a pattern. I am almost proud, which is new for me." | KEPT |
| threeKills_1 | "Try not to let it go to your head twice in one season." | "Understand what a pattern means out here. You are not a lucky scout anymore. You are the thing that happens to them, and they do not have a story for that yet." |
| finalDown_0 {warm} | "OLD NOBODY. HOLLOWANTLER, if you want its whole name, though nothing out there wants to hear it said twice. Down. Thirty years running this camp did not prepare me for how quiet that would be." | KEPT (frozen keeper) |
| finalDown_1 | "I had a whole speech ready. I am not giving it tonight. Go celebrate. And do not ask me about the twelfth name yet. Some other night." | KEPT (frozen keeper) |
| firstDawn_0 {warm} | "You saw a whole dawn out there and came back to tell me about it. Sit by the fire. The actual seat, not the log with the splinter." | KEPT (frozen keeper) |
| firstDawn_1 | "Thirty years I ran this camp on the theory that somebody eventually would. Thank you for proving the theory. Cocoa is on me tonight." | KEPT (frozen keeper) |
| behindDown_0 {alarmed} | "THE BEHIND. In thirty years not one scout has been able to tell me what it looks like, and I notice you have not offered either." | KEPT (frozen keeper) |
| behindDown_1 | "Do not. I have thought about it every night since I was younger than you and I have decided I would rather go on not knowing. Eat something." | KEPT (frozen keeper) |

fullJournal_1 skeptic correction: the seat's "Keep writing anyway. Everything out there depends on being forgotten. I want to know what they do about a scout who will not." stated a threat rule backwards (STORY_DESIGN.md:45-53: the Signed depend on being believed, and the player wins because belief has faded), in the mouth of a character whose bible lists never-explains-rules as a refusal, while grazing the duality reserved for the squirrel (STORY_DESIGN.md:573). The replacement keeps the shape and asserts nothing about what anything out there depends on.

## Totem.revealLine (feats.js:520-531)
KEPT verbatim. Code gap stands: spoken via campSpeak but never collected by dump_lines.cjs:40-46, so it currently plays silent. Collection fix is a code gate, not a text change.

## QUARTERMASTER (dialogue.js:451-464)
| Slot | OLD | NEW |
|---|---|---|
| qm.intro {disapproval} | The Quartermaster looks up from a ledger thicker than you are. "Name?" You start to answer. "Not yours. The inventory has names. You are the thing that makes the inventory smaller." | KEPT (frozen keeper) |
| qm.idle[0] | "Requisition forms are in triplicate now. The forest keeps eating the second copy." | "Requisition forms go out in triplicate. I file the first, I send the third up the hill, and the second goes to whoever keeps taking it off the wire overnight." |
| qm.idle[1] {disapproval} | "We are down to four tin cups. If a raccoon has the fifth, it signed nothing for it." | KEPT |
| qm.idle[2] | "Cookie Money is not legal tender. It is cookie money. It becomes badges at my table and nowhere else, and the rate is fair because I set it." | KEPT |
| qm.idle[3] {disapproval} | "Do not ask what is in the barrels. They are labeled. The label says BARREL." | KEPT |
| qm.idle[4] {alarmed} | "I count marshmallows by the bag, not the piece. Learned that the hard way. Junie was involved." | KEPT |
| qm.idle[5] {warm} | "Lost and found out here is the whole forest, kid. Found is just the part I keep on shelves." | KEPT |
| qm.coins | "Your Cookie Money from last night cleared. Counted, converted, logged, stamped. If the badge number felt small, take it up with the ledger. The ledger does not care." | KEPT |

## FOUND TEXTS (js/finds.js:18-241, subtitle-only, never voiced)
One change in the whole set; everything else KEPT verbatim, including all six standouts (note, letter, roll book, lanyard, whistle, photograph), which are untouchable.

| Entry | Lines | Status |
|---|---|---|
| t12_canteen | Army green, hand painted daisies, still half full. / There is a name scratched under the cap, and it is not one of the names Brock says out loud. / The water is fine. You are still not drinking it. | KEPT |
| sign_hopline | Two big prints, two small, then a stride of nothing at all. Repeat, all the way to the treeline. / Nothing leaves a gap that even by accident. It was aiming. / It cannot steer once it leaves the ground. Step sideways on the launch, not on the landing. | KEPT |
| t12_boot | Kid sized. Laced neat and double knotted, the way a scoutmaster makes you do it. / No right boot. No pack, no trail, no kid. / Somebody hopped home. That is the version we are going with. | KEPT (armor wink 1 of 3) |
| sign_scrape | Somebody dug forty feet of trench with their face. / The trench is dead straight, and it ends at a tree that is missing a lot of bark. / It picks a line and it commits. Stand aside and let the wall finish the job. | KEPT |
| t12_note | Torn off a merit worksheet, folded into a triangle, wedged in a knot of bark. / "brock says stay by the fire. brock is asleep." / The letters get neater toward the end. Whoever wrote it had time. | KEPT (standout) |
| sign_pellet | Grey, lumpy, packed with little pale bits. Looks exactly like trail mix. / It is not trail mix. / Owls throw in a straight line and cannot lead a moving target. Keep your feet going and nothing lands. | KEPT |
| t12_sash | Eleven badges, sewn on by hand, one of them upside down and very proud of it. / The twelfth is a torn square of thread. Something took it off the sash, not off the shirt. / Eleven out of twelve. That is a passing grade almost anywhere else. | KEPT |
| sign_weave | One set of paw prints, stitched side to side across the trail like a hem. / It was not lost. It was practicing. / Shoot where it is going, not where it is. It is never where it is. | KEPT |
| t12_whittle | Four inches of pine, sanded smooth, clearly loved. / It has nine antlers. A kid who carved this well did not miscount. / They kept whittling after they saw it. Scouts finish their projects. | KEPT |
| t12_punch | A hand punch, the kind for stamping leather, oiled and looked after. / The die is still seated in it, and the die is the sigil. Somebody was making the tokens by hand. / It still works. Please do not test it on anything. | KEPT (armor wink 2 of 3) |
| sign_fives | Five thin lines in the bark, at exactly pack height, over and over down the trail. / Five. Like fingers. Something has been checking every bag that came through here. / They arrive in threes and always at your back. Turn before you commit to a reload. | KEPT |
| t12_rollbook | Attendance, thirty years of weather, still legible if you tilt it at the fire. / Eleven names in a scoutmaster block print. The twelfth line is in a kid's handwriting. / OLD: Somebody added themselves to the troop. Nobody ever crossed it out. NEW: Nobody ever crossed it out. | line 3 TRIMMED (diagnosis-specified; the restating clause goes, the dread clause stands) |
| sign_scales | Silver powder on every leaf in the clearing, ankle deep in the low spots. / Something took the moths out of the air, all of them, in one pass. / The wobble is a shape, not a swerve. Aim at the middle of the S and let it come to you. | KEPT |
| t12_blanks | Forty little discs, unstamped, threaded on a wire like a keyring. / Forty blanks and one punch. Somebody sat down planning to Sign forty things. / Thirty nine of them are still blank. Take what comfort you can from that. | KEPT (armor wink 3 of 3) |
| sign_hole | Punched clean through a trail signboard. You can see the whole ridge through it. / The disc that came out of it is nowhere on the ground. Somebody kept it. / The collector fights in rings, ten spokes wide. Stand in a gap, never on a spoke. | KEPT |
| t12_lanyard | Braided in camp colors, every knot even and tight, gone grey with thirty winters. / Eleven knots. Then a clean length of cord with nothing tied in it at all. / A scout ties one for every night out. Somebody stopped counting on purpose. | KEPT (standout) |
| t12_letter | Stamped, addressed, sealed, sitting in a mailbox thirty years from the nearest road. / "Dear Mom, we found something and Brock says do not write about it, so this is about the weather." / Four pages about the weather. The last page is not about the weather. | KEPT (standout) |
| t12_photo | Twelve kids in a row, squinting into the sun, one of them making a face. / Eleven are in focus. The twelfth is blurred, and the trees behind the twelfth are sharp. / Cameras do not do that. Everybody says cameras do that. | KEPT (standout) |
| sign_tine | Knee high, wrapped in fishing line, with a bicycle bell tied to the point. / Somebody wanted a warning. Somebody got close enough to tie a knot. / Five circles walk out from it in a straight line. Stand off the line, not back from it. | KEPT |
| t12_flag | TROOP 12, gold on green, hemmed by somebody who was learning as they went. / It has been mended eleven times, each patch smaller than the last. The final one is the size of a token. / They kept the flag up with a sewing needle. That is the whole troop, right there. | KEPT |
| sign_rings | Six scorched circles in the grass, evenly spaced, still warm at the rim. / The grass inside them is not burned. It is stamped. / Stand in one for a full second and it goes out. Leave one lit and something out there gets promoted. | KEPT |
| t12_whistle | Scoutmaster issue, nickel plated, worn bright at the mouthpiece. / The pea has been taken out and the hole sealed with candle wax. It cannot make a sound. / Somebody wanted a whistle that nothing could hear. Somebody was right. | KEPT (standout) |
| sign_slowtracks | Hoof prints the size of skillets, one stride apart, dead level for a mile. / It never breaks pace. Not once, the whole length of the ridge. / When it finally does, a line lights up first. Cross the line early, never late. | KEPT |
| t12_nameplate | Tin, the size of a badge, the kind that goes on the end of a footlocker. / Somebody sanded the name off, and did it recently: the scratches are still bright. / Brock says do not ask about the twelfth name yet. Some other night, he says. | KEPT |

## NIGHT_CARVINGS (feats.js:469-500), subtitle-only
All six KEPT verbatim (TIGHTER WOODS, THE MARK SPREADS, LEAN SEASON, SHARP TEETH, THE LONG WALK, NOTHING WASTED).

=====================================================================
CRITTER (js/dialogue.js:487-493), assembly seat
=====================================================================
This rewrite was assigned to no seat by the four-territory split; both skeptics ruled the book incomplete without it (it is the game's only statement of the witnessed-therefore-killed duality, STORY_DESIGN.md:573). Written at assembly. Subtitle-only: dump_lines.cjs excludes CRITTER on purpose, so the change costs zero synths.

| Slot | OLD | NEW |
|---|---|---|
| squeaks[0-3] | (unchanged, diagnosis keepers) | KEPT |
| squeaks[4] | It is here because you kept coming back. | It needed to be seen. Being seen is what kills things here. |

The duality is stated and left unresolved: no warmth, no reading where the player is the reason for hope. Checked against Max death[2] ("Do not... do not look at me..."): phrasing is not close, both stand; Max's seat yields if you rule otherwise.
