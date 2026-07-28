# Merit Badge Massacre

Troop 13 vs. the Cult of the Antlered One. A top down action roguelite where
the woodland critters found a religion with horns, and three scout kids did not
sign the attendance sheet.

Every sprite, every sound effect and every note of music is generated in code
when the page loads. There are no art files and no audio files to download.

## Play it right now

Open `index.html` in any modern browser. That is the whole game.

Or serve it, which avoids the file restrictions some browsers put on local
pages:

```
npx http-server . -p 8317
```

## The night

You walk out of camp into a night that runs three acts: THE UNDERSTORY, then
THE SOG, then THE BURN. Each act is a chain of rooms, eight then nine then ten,
and each one ends with a boss.

Rooms come in flavours: a straight fight, an elite with a chest, a store, a
loot room, somewhere quiet to breathe, and a lore room with something to find.
You never get marched through them. Clear a room and its doors light up with a
card showing what is behind each one, two or three of them, and the door you
take is the room you get.

Critters drop merit badges. Enough badges is a rank up, and a rank up deals you
three cards: a new weapon, another level on one you carry, a patch that changes
how you fight, or a skill that fires on its own. Manual weapons shoot where you
aim. Attacks physically grow as your damage grows.

Coins drop too. Cookie Money spends at the store rooms mid night, and whatever
you did not spend turns into badges at dawn.

The bosses, in order: BRAMBLEBUCK at the end of act one, THE TALLYMAN at the
end of act two, and OLD NOBODY at the end of act three. Put OLD NOBODY down and
the sun comes up.

## Camp Hearthwood

Between nights you walk around camp. It is small at first and it grows as your
lifetime badge count grows.

- **Scoutmaster Brock**, at the fire, who has opinions about all of this.
- **The Badge Board**: permanent ranks bought with banked badges. More health,
  more damage, faster legs, a revive. They never expire.
- **Merit Badges**: standing dares, and the game is named after them. Earning
  one is permanent, most of them open something new up for good, and every
  emblem you earn is stitched onto the sash in your cabin.
- **The Totem**: carvings you switch on before you leave. Each one makes the
  night harder and multiplies the badges you bring home. It opens once you have
  seen a sunrise.
- **The Field Guide**: what you have met and what you have killed, plus the
  notes Troop 12 left behind.
- **The old cabin**, which unlocks after your first night out, with a
  footlocker, a pinboard and a window.
- **The other two scouts**, waiting around camp. Walk up to one and you play as
  them tonight instead.
- **The trailhead sign**: take the trail and the night begins.

Scouts: Max (slingshot, steady), Junie (marshmallow roaster, fast and fragile),
Gus (hand axe, built like a bear box).

## Controls

Keyboard and mouse:

- WASD or the arrow keys: move
- Mouse: aim
- Hold left click: attack
- Space: dodge
- E: interact, and open the store when you are standing in one
- 1 / 2 / 3: pick a rank up card
- J: Field Guide, B: Merit Badges (in camp)
- P or Esc: pause. In camp, Esc backs out one step: out of the cabin first, then
  out of camp
- M: mute, F: fullscreen

Phone and tablet: the on screen sticks turn themselves on when the device is a
touch device, and stay off everywhere else. Left thumb moves. Right thumb aims,
and holding it fires. The button up and inside of the aim stick dodges, and its
face shows the recharge. Tap once at the title to go full screen and land in
landscape.

## Options

Music, sound and voice volume, subtitles, screen shake and damage numbers. All
of it is remembered, along with your camp, between sessions.

## Desktop build

The repo doubles as an Electron app:

```
npm install
npm start          # run it windowed
npm run pack       # unpacked build into dist/win-unpacked
npm run dist       # Windows installer into dist/
```

For a Steam depot, upload `dist/win-unpacked` with SteamPipe as usual. The
Steamworks overlay and achievements would need the Steamworks SDK wired into
the Electron shell. The game itself has no external dependencies and runs fully
offline.
