# Merit Badge Massacre

A top down action roguelite about the last three scouts of Camp Hearthwood.

A cryptid nobody believes in starves, so the ones out past the treeline Sign the
wildlife: a little tin token stamped into the fur, and whatever wears it believes
forever after. A Signed critter then goes looking for the one thing in these
woods that says it is not real, which turns out to be an eleven year old in a
neckerchief holding a merit badge for knowing better. Troop 13 walks out anyway.
The badges do not earn themselves.

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
You mostly pick your own way through. Clear a room and its doors light up with
a card showing what is behind each one, two or three of them, and the door you
take is the room you get. The one exception is the room before each boss:
there is only ever one door out of it, and you already know where it goes.

Critters drop merit badges. Enough badges is a rank up, and a rank up deals you
three cards: a new weapon, another level on one you carry, a patch that changes
how you fight, or a skill that fires on its own. Manual weapons shoot where you
aim. Attacks physically grow as your damage grows.

Coins drop too. Cookie Money spends at the store rooms mid night, and whatever
you did not spend turns into badges when the night ends, whether that is at
dawn or face down in the leaves.

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
- **The Tally Post**: a weathered post at the trailhead. Take a hatchet to it
  before you leave and cut one blaze per dare, up to six. Each one makes the
  night harder and multiplies the badges you bring home, and the post stands
  taller for every mark on it. It comes out from under its tarp once you have
  seen a sunrise.
- **The old cabin**, which unlocks after your first night out: your bunk, a
  footlocker, a pinboard, a window, the sash with every emblem you have earned
  stitched onto it, and **the Field Guide** on the lamp table, which is what you
  have met and what you have killed plus the notes Troop 12 left behind.
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
- Space, or Shift, or right click: dodge
- Q: fire the skill in your slot, once you have earned one
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

In camp there is no aiming and nothing to dodge, so the right hand side changes:
a button appears wherever you can do something and says what it is, from
"Talk to Scoutmaster Brock" to "Take the trail as Gus". MENU, in the corner,
does what Escape does: it backs out of a panel, then out of the cabin, then out
of camp, and it pauses a night.

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

## Deploying to tevded.com/critters

Every `<script>` in `index.html` carries a `?v=` build stamp. A browser caches
`js/game.js` forever otherwise, so a deploy without a new stamp is invisible to
anybody who has already played: they keep running the copy they downloaded the
first time, and the site looks like it did not update.

BUMP THE STAMP ON EVERY DEPLOY. It is idempotent, so re-running this is safe:

    python -c "import re,pathlib; p=pathlib.Path('index.html'); s=p.read_text(encoding='utf-8'); s=re.sub(r'(<script src=\"js/[A-Za-z0-9_]+\.js)(\?v=[^\"]*)?(\")', r'\1?v=NEWSTAMP\3', s); p.write_text(s,encoding='utf-8',newline='')"

Then copy `index.html`, `js/*.js` and `assets/manifest.json` into
`tevded-site/public/critters/`, and run `npm run deploy` there (vite build plus
wrangler deploy).

VERIFY ON THE REAL DOMAIN, and do not trust what the browser shows you: fetch
the files with `cache: 'no-store'` and compare byte counts against the repo.
A stale browser cache has twice now looked exactly like a failed deploy.
