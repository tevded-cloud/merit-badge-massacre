# Merit Badge Massacre

Troop 13 vs. the Cult of the Antlered One. A top-down survivors-like where the
woodland critters found a religion with horns, and three scout kids did not
sign the attendance sheet.

Every sprite, sound and song is generated in code. There are no asset files.

## Play it right now

Open `index.html` in any modern browser. That is the whole game.

Or serve it (avoids any browser file restrictions):

```
npx http-server . -p 8317
```

## Controls

- WASD or arrow keys: move
- Mouse: aim
- Hold left click (or Space): attack
- 1 / 2 / 3: pick cards and scouts
- P or Esc: pause
- M: mute, F: fullscreen

## The run

Survive the night. Bosses arrive at 5:00 and 10:00. The Antlered One walks at
14:00, and dawn only comes when it dies. Critters drop merit badges (XP), rank
up to choose new gear: manual weapons fire where you aim, skills trigger
themselves. Attacks physically grow as your damage grows. Elites drop chests
with free upgrades. Records persist between sessions.

Scouts: Max (slingshot, balanced), Junie (marshmallow roaster, fast and
fragile), Gus (hand axe, walking bear box).

## Desktop build (Steam)

The repo doubles as an Electron app:

```
npm install
npm start          # run windowed
npm run dist       # build the Windows installer into dist/
```

For a Steam depot, upload the packaged output from `npm run pack`
(`dist/win-unpacked`) with SteamPipe as usual. Steamworks overlay and
achievements would need the Steamworks SDK wired into the Electron shell;
the game itself has no external dependencies and runs fully offline.
