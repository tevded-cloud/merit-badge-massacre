# tools/voice/

The voice line pipeline. Author tooling, never shipped and never loaded by
the game: `js/voice.js` is still a stub (`available: false`) until playback
is wired in separately. Driven by `npm run audio:voice`, which runs
`dump_lines.cjs` then `gen.py` in that order. Read `README.md` in this folder
first; it is the full setup and workflow guide and this master only
summarizes what each file's job is.

- `README.md`: setup (Python 3.10+, `pip install kokoro soundfile`,
  espeak-ng, ffmpeg on PATH) and the full two command workflow, including how
  to dial in one character's sound with `--speaker`/`--limit`/`--force`
  before running the full batch. Also documents the named post effect chains
  and the antlered one's stacked dual pitch layer voice, which nothing else
  in this folder explains.

- `dump_lines.cjs`: first step of `npm run audio:voice`. Evaluates
  `js/dialogue.js` as data (never touches it otherwise) and flattens every
  voiceable line into `tools/voice/lines.json`, one entry per line with
  `speaker`, `category`, `slot`, `text`, `spokenText`, `hash8`, and `scout`
  where a placeholder was substituted. `hash8` (first 8 hex chars of
  `sha1(spokenText)`) is the content key the rest of the pipeline keys
  incremental generation and output filenames on, so only a wording change
  triggers a re-synthesis.

- `gen.py`: second step of `npm run audio:voice`. Reads `lines.json` and
  `voices.json`, synthesizes any line whose output file is missing through
  kokoro (TTS), pitch shifts per layer through ffmpeg, mixes down stacked
  layers, applies named post effect chains, and encodes to WebM/Opus (24 kHz
  mono, 32 kbps) under `assets/voice/en/<speaker>/`. Flags: `--dry-run`,
  `--speaker <name>`, `--limit <n>`, `--force`. Also appends one dated entry
  to `assets/voice/LICENSE-VOICES.md` on every real (non `--dry-run`) run.

- `lines.json`: generated output of `dump_lines.cjs`, and the input `gen.py`
  actually reads. Not hand edited; regenerate it by re-running
  `dump_lines.cjs` (or the full `npm run audio:voice`) after
  `js/dialogue.js` changes.

- `voices.json`: the character recipe table `gen.py` reads: one entry per
  speaker with `engine`, `voice` id, `speed`, `pitchSemitones` (or `stacked`
  plus `mix` for a multi layer voice like the antlered one), and an ordered
  `post` effect chain list. Every field is documented in the file's own
  `_readme` array, since plain JSON has no comment syntax. Editing this file
  alone does not force a re-render of existing files, because `gen.py`'s
  incremental check is keyed on line wording (`hash8`), not on the recipe;
  see `README.md`'s "recipe evaluation round" for the `--force` workflow.
