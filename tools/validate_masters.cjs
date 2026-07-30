// Merit Badge Massacre: THE MASTER FILE GATE. Author tooling, never shipped.
//
// The repo is adopting a master file system: one markdown file per significant
// folder, named after that folder, describing every file in it and linking to
// the masters of its child folders. An agent that reads the root master and
// follows the links gains full project scope before touching anything. That is
// the whole value, and it is entirely dependent on the masters staying true.
// A master that has drifted is worse than no master, because it is read with
// the same trust. This file is the thing that stops the drift.
//
// Run:   npm run masters:check
//        node tools/validate_masters.cjs
//        node tools/validate_masters.cjs --json
//        node tools/validate_masters.cjs --verbose
//        node tools/validate_masters.cjs --selftest
//
// Exit code is 1 if any contract clause fails, 0 otherwise, 2 on a bad
// argument. Warnings never fail the run.
//
// ===========================================================================
// THE MASTER FILE CONTRACT, v1
// ===========================================================================
// Six clauses. Every one of them is enforced below by a named function, and
// every one of them is proved to FIRE (not merely to pass) by --selftest
// against synthetic in memory fixtures. A check that cannot be shown to fail
// is not a check.
//
//   C1 NAMING       A mastered folder F holds exactly one master, named
//                   <basename of F>.md. The repo root's master is
//                   merit-badge-massacre.md, named for the repo FOLDER. That
//                   name is stale as a game title (the working title is PAST
//                   THE TREELINE) and correct as a folder name, because in
//                   this project display names and internal ids stay separate
//                   forever. Enforced by masterNameFor() and checkNaming().
//
//   C2 WHICH FOLDERS  A folder is mastered if it directly contains 3 or more
//                   tracked files (its own master not counted) of which at
//                   least one is a text file (TEXT_EXTENSIONS), OR if it is on
//                   the explicit opt in list (OPT_IN_FOLDERS, today just
//                   assets/, which holds one direct text file and 221 audio
//                   files under it). The list of mastered folders is DERIVED
//                   from the tree by deriveMasteredFolders(), never hard coded,
//                   so adding a fourth file to electron/ automatically demands
//                   electron/electron.md. Folders under the threshold and
//                   folders with no direct files are covered by their nearest
//                   mastered ancestor instead.
//
//   C3 COVERAGE     A master must name, by exact filename, every tracked file
//                   it is responsible for, or cover it with a GROUP line.
//                   Enforced by checkCoverage(). See COVERAGE SET below for
//                   exactly which files that is.
//
//   C4 NO PHANTOMS  Every repo relative path a master mentions must exist on
//                   disk. Enforced by checkPhantoms(). See PATH DETECTION
//                   below for exactly what counts as a path.
//
//   C5 THE LOOP     Every master must contain a markdown link to the master of
//                   each of its DIRECT MASTERED CHILDREN (a mastered folder
//                   below it with no other mastered folder in between), and
//                   every master must be REACHABLE by walking those links from
//                   the root master. Enforced by checkLinks() and walkFromRoot().
//                   The walk is the actual point of the system: a master that
//                   exists, is accurate, and cannot be reached from the root is
//                   invisible to the agent the system was built for.
//
//   C6 HOUSE STYLE  No em dashes, no en dashes, no byte above 0x7F, no emoji
//                   (including escaped forms), in any master. Enforced by
//                   checkHouseStyle().
//
// ===========================================================================
// THE COVERAGE SET: which files a given master is responsible for
// ===========================================================================
// A master's coverage set is every tracked file whose NEAREST MASTERED
// ANCESTOR folder is that master's folder. In practice that is:
//
//   its own direct files (excluding its own master file), PLUS
//   every file in a descendant folder that has no mastered folder of its own
//   sitting between it and this one.
//
// This is the reading that makes clause 2's promise real. Clause 2 says
// folders under the threshold "are covered by their nearest mastered ancestor
// instead"; if coverage stopped at direct files, that sentence would enforce
// nothing and electron/main.cjs would be described by no master anywhere. It
// is also the only reading under which the GROUP mechanism is needed: assets/
// holds exactly ONE direct file (assets/manifest.json), so a direct files only
// rule would never need a bulk line, while the full coverage set for assets/ is
// 223 files (manifest.json, voice/LICENSE-VOICES.md, and 221 .webm).
//
// Concretely, today:
//   .                    18 files (17 direct plus electron/main.cjs)
//   js/                  33
//   js/music/src/        11
//   docs/preproduction/  13
//   tools/                4
//   tools/render/        11
//   tools/voice/          5
//   .claude/agents/       4
//   assets/             223
//
// A file counts as NAMED if its bare filename appears in the master as a whole
// token: not preceded by [A-Za-z0-9_.-] and not followed by [A-Za-z0-9_-]. A
// leading slash IS allowed, so `js/room.js` names room.js. The trailing rule is
// what keeps rooms.js from being credited as room.js and act1.json from being
// credited as act1.js; the leading rule is what keeps audio_director.js from
// being credited as director.js.
//
// A file also counts as named if it matches a GROUP line, which must start at
// the beginning of a line and read:
//
//   GROUP: <glob> (<n> files) <what they are>
//
// Two things about that form are looser than they look, both because real
// master content demanded it:
//
//   SINGULAR IS ALLOWED. "(1 file)" and "(25 files)" are both accepted. A group
//   of one reads wrong in the plural and assets/assets.md has five of them.
//
//   THE DESCRIPTION MAY WRAP. Only the glob and the count are parsed, and only
//   from the GROUP: line itself. The description is prose, it may run onto the
//   following lines, and those continuation lines are ordinary prose to every
//   other check in this file: nothing treats them specially, they are scanned
//   for filenames and paths exactly like the rest of the master.
//
// The glob is expanded against the tracked file list and <n> must equal the
// real match count, so a bulk line cannot quietly go stale. Globs are read as
// repo relative first; if a repo relative read matches nothing and the master
// is not the root master, the glob is retried relative to the master's own
// folder, so both `assets/**/*.webm` and `**/*.webm` work inside assets/assets.md.
// Files a GROUP matches that are OUTSIDE the master's coverage set still count
// toward <n> (the count is a fact about the glob, not about the folder) but
// earn no coverage credit, and a warning says so.
//
// ===========================================================================
// PATH DETECTION: what clause 4 treats as a path, and why
// ===========================================================================
// A false positive here makes the gate annoying and a false negative makes it
// useless, so the rule is deliberately narrow and stated in full.
//
// WHERE tokens are read from: markdown link targets ([text](target), including
// reference definitions and <angle wrapped> targets) and inline code spans
// (`like this`). Fenced code blocks are stripped BEFORE inline code is read,
// so a path inside a ``` block is not checked: fenced blocks hold command
// lines, transcripts and source excerpts, where a nonexistent path is often
// the point. Prose outside code and links is not scanned at all.
//
// WHICH tokens are then treated as paths: a token qualifies if it contains a
// slash OR ends in a known extension (KNOWN_EXTENSIONS). It is rejected if it
// contains whitespace, any of ()[]{}<>|"'`^$;,, a glob character (* or ?), or,
// after the line reference is stripped, a colon. It is rejected if it is a URL
// or mailto:, an in page anchor (#...), or bare . or .. This is what keeps
// `Room.enter()`, `Game.armShot`, `def.scatter`, `PROPS[id].r`,
// `npm run rooms:check` and `Math.random` out of the path set while keeping
// `js/room.js`, `docs\preproduction\RULINGS.md` and `assets/` in it.
//
// The angle bracket rejection is load bearing, not incidental. These documents
// use <placeholder> tokens throughout: `BOSSLINES.<bossId>`,
// `<theme>_<layer>.<hash8>.webm`, `assets/voice/en/<speaker>/`. Every one of
// them is path SHAPED and none of them is a path, so any token containing < or
// > is dropped. A markdown link target wrapped entirely in angle brackets,
// [text](<js/room.js>), is unwrapped first, since there the brackets are
// markdown syntax rather than a placeholder.
//
// Two more shapes are rejected, both of them prose shorthand that the first
// draft of this file wrongly reported as phantoms on real master content:
//
//   A MEMBER EXPRESSION IN FRONT OF THE FIRST SLASH. `Music.goto/setHeat/
//   setPhase/stop` is four method names sharing a receiver, not a path. If the
//   token has a slash and its first segment reads as identifier.identifier
//   without ending in a known extension, it is code, not a path. This is the
//   same rule that already drops `Game.armShot`, just extended past the point
//   where a slash appears. `.claude/agents/agents.md` is unaffected, because a
//   leading dot is not an identifier start.
//
//   A BARE NUMBER AS A PATH SEGMENT. `GROUNDING_AUDIT_1/2/3.md` is three
//   filenames compressed into one citation. No directory in this repo is a
//   bare number, so a numeric segment means alternation shorthand. That claim
//   is not left as a comment: auditNumericSegments() checks it against the real
//   tracked list every run and warns if it ever stops being true, at which
//   point this carve out has to change.
//
// RESOLUTION OF A BARE FILENAME, LAST RESORT. If a slashless token resolves
// neither in the master's own folder nor at the repo root, it is looked up by
// basename across the whole tracked list. Exactly one match resolves it: a
// master citing `RULINGS.md` from .claude/agents/ or `props.js` from tools/ is
// pointing at a file that unambiguously exists, which is what clause 4 asks.
// Two or more matches FAIL as ambiguous and name the candidates, because
// `camp.js` means two different files in this repo and a reader cannot follow
// it. Zero matches fail as a phantom. A token WITH a slash never gets this
// fallback: it claims a location, so it is held to it.
//
// A trailing :12 or :12-40 is stripped before the check, because this project
// cites files that way (js/props.js:160 all over the source comments).
// Backslashes are normalised to forward slashes, because CLAUDE.md and the
// design docs write Windows style paths.
//
// RESOLUTION: a token containing a slash is resolved against the repo root
// first, then against the master's own folder. A token with no slash (a bare
// filename, which is exactly what clause 3 pushes authors to write) is
// resolved against the master's own folder first, then the repo root. Only if
// BOTH fail is it a phantom. Existence is checked against DISK, not against
// the tracked list, so a master may legitimately cite a gitignored build
// output such as tools/render/out/samplecounts.json.
//
// ===========================================================================
// HOW THE TRACKED FILE LIST IS BUILT (no git, on purpose)
// ===========================================================================
// This tool never shells out to git. It walks the filesystem and applies
// .gitignore itself, honouring nested ignore files (there are two today: the
// repo root's, and tools/render/.gitignore which ignores out/, the music build
// staging directory). The supported subset of gitignore syntax is: comments,
// blank lines, negation with !, directory only patterns with a trailing slash,
// anchoring by a leading slash or an embedded slash, and the * ? ** wildcards.
// Last matching rule wins, deeper ignore files layered after shallower ones.
// That subset covers every rule in this repo (node_modules/, dist/,
// __verify_*, out/) and fails loudly rather than silently if it ever meets
// something it cannot parse.
//
// ALWAYS_SKIP_DIRS (.git, node_modules, dist) are skipped whether or not an
// ignore file mentions them.
//
// WATCH_UNTRACKED_DIRS is a tripwire, not a skip list. artifacts/ and
// experiments/ sit in the working tree as leftovers from the procedural art
// method test that was rejected on 2026-07-29. They are not in git. When this
// file was first written they were also not in any .gitignore, which made them
// look tracked: experiments/ (4 files, 3 of them text) would then have derived
// as a TENTH mastered folder, demanding experiments/experiments.md for a dead
// experiment. They are now ignored properly by .gitignore, so nothing here
// skips them by name. The two names stay only as a WARNING check: if either
// one is ever present on disk AND not ignored, the run says so, because that
// is the exact condition that silently grows a phantom master.
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const REPO_BASENAME = path.basename(REPO_ROOT);

// A folder needs at least one of these among its direct files to be worth a
// master: three .webm files describe nothing an agent can read.
const TEXT_EXTENSIONS = [
  '.js', '.cjs', '.mjs', '.md', '.json', '.html',
  '.py', '.css', '.txt', '.yml', '.yaml',
];

// Used only by the clause 4 path sniffer, to decide whether an extensionless
// looking token is path shaped. Wider than TEXT_EXTENSIONS on purpose: a
// master may cite an asset or a build artifact.
const KNOWN_EXTENSIONS = TEXT_EXTENSIONS.concat([
  '.webm', '.wav', '.mp3', '.ogg', '.opus',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.ttf', '.otf', '.woff', '.woff2',
  '.log', '.exe', '.zip', '.map', '.lock',
  '.cfg', '.ini', '.sh', '.bat', '.ps1', '.xml', '.csv', '.toml',
]);

const MASTER_THRESHOLD = 3;
const OPT_IN_FOLDERS = ['assets'];
const ALWAYS_SKIP_DIRS = ['.git', 'node_modules', 'dist'];
// Tripwire only. See the header: these are NOT skipped, .gitignore handles
// them, and the run warns if that ever stops being true.
const WATCH_UNTRACKED_DIRS = ['artifacts', 'experiments'];

const ROOT_REL = '.';

// ---------------------------------------------------------------------------
// Small path helpers. Everything internal is a forward slash, repo relative
// path; the root folder is the single character '.'.
// ---------------------------------------------------------------------------
function toRel(p) {
  return p.split(path.sep).join('/');
}

function joinRel(dirRel, name) {
  return (dirRel === ROOT_REL || dirRel === '') ? name : dirRel + '/' + name;
}

function dirOfRel(fileRel) {
  const i = fileRel.lastIndexOf('/');
  return i < 0 ? ROOT_REL : fileRel.slice(0, i);
}

function baseOfRel(rel) {
  const i = rel.lastIndexOf('/');
  return i < 0 ? rel : rel.slice(i + 1);
}

function parentOfFolder(folderRel) {
  if (folderRel === ROOT_REL) return null;
  const i = folderRel.lastIndexOf('/');
  return i < 0 ? ROOT_REL : folderRel.slice(0, i);
}

function extOf(rel) {
  const base = baseOfRel(rel);
  const i = base.lastIndexOf('.');
  return i <= 0 ? '' : base.slice(i).toLowerCase();
}

function isTextFile(rel) {
  return TEXT_EXTENSIONS.indexOf(extOf(rel)) >= 0;
}

function hasKnownExtension(rel) {
  return KNOWN_EXTENSIONS.indexOf(extOf(rel)) >= 0;
}

// C1 NAMING lives here: this one function is the whole naming rule, and every
// other clause asks it rather than building a master path by hand.
function masterNameFor(folderRel, repoBasename) {
  return (folderRel === ROOT_REL ? repoBasename : baseOfRel(folderRel)) + '.md';
}

function masterPathFor(folderRel, repoBasename) {
  return joinRel(folderRel, masterNameFor(folderRel, repoBasename));
}

// ---------------------------------------------------------------------------
// Glob to regex. Segment aware: * and ? never cross a slash, ** does.
// Shared by the gitignore matcher and by GROUP line expansion, so the two
// cannot drift apart.
// ---------------------------------------------------------------------------
function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        const prevIsSlash = (i === 0) || (glob[i - 1] === '/');
        const nextIsSlash = (glob[i + 2] === '/');
        if (prevIsSlash && nextIsSlash) {
          // "**/" means zero or more whole segments, so it must be able to
          // swallow its own trailing slash: a/**/b has to match a/b.
          re += '(?:[^/]+/)*';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.indexOf(c) >= 0) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

function globMatches(glob, rel) {
  return globToRegex(glob).test(rel);
}

// ---------------------------------------------------------------------------
// .gitignore, the supported subset (documented in the header).
// ---------------------------------------------------------------------------
function parseIgnoreText(text) {
  const rules = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    let line = raw.trim();
    if (line === '' || line[0] === '#') continue;
    let negate = false;
    if (line[0] === '!') { negate = true; line = line.slice(1); }
    let dirOnly = false;
    while (line.length > 1 && line[line.length - 1] === '/') {
      dirOnly = true;
      line = line.slice(0, -1);
    }
    let anchored = line.indexOf('/') >= 0;
    if (line[0] === '/') { anchored = true; line = line.slice(1); }
    if (line === '') continue;
    rules.push({ pattern: line, negate, dirOnly, anchored, raw: raw.trim() });
  }
  return rules;
}

// One rule against one path, where relToBase is the candidate's path relative
// to the directory holding the ignore file.
function ignoreRuleMatches(rule, relToBase, isDir) {
  if (rule.dirOnly && !isDir) return false;
  if (rule.anchored) return globMatches(rule.pattern, relToBase);
  // Unanchored: git matches at any depth, so try every suffix that starts on a
  // segment boundary. For node_modules/ that means a nested node_modules is hit
  // too, which is what git does.
  const parts = relToBase.split('/');
  for (let i = 0; i < parts.length; i++) {
    if (globMatches(rule.pattern, parts.slice(i).join('/'))) return true;
  }
  return false;
}

// layers: [{ baseRel, rules }], outermost first. Last match wins.
function isIgnored(layers, rel, isDir) {
  let decision = false;
  for (const layer of layers) {
    let relToBase;
    if (layer.baseRel === ROOT_REL) {
      relToBase = rel;
    } else if (rel === layer.baseRel || rel.indexOf(layer.baseRel + '/') === 0) {
      relToBase = rel.slice(layer.baseRel.length + 1);
    } else {
      continue;
    }
    if (relToBase === '') continue;
    for (const rule of layer.rules) {
      if (ignoreRuleMatches(rule, relToBase, isDir)) decision = !rule.negate;
    }
  }
  return decision;
}

// ---------------------------------------------------------------------------
// The tracked file list. Filesystem only, never git.
// ---------------------------------------------------------------------------
function listTrackedFiles(rootDir) {
  const files = [];
  const notes = [];
  const ignoreFilesSeen = [];

  function walk(dirAbs, dirRel, layers) {
    let entries;
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch (e) {
      notes.push('could not read directory ' + dirRel + ': ' + e.message);
      return;
    }

    const localIgnore = entries.some((e) => e.isFile() && e.name === '.gitignore');
    let nextLayers = layers;
    if (localIgnore) {
      const text = fs.readFileSync(path.join(dirAbs, '.gitignore'), 'utf8');
      nextLayers = layers.concat([{ baseRel: dirRel, rules: parseIgnoreText(text) }]);
      ignoreFilesSeen.push(joinRel(dirRel, '.gitignore'));
    }

    for (const e of entries) {
      const name = e.name;
      const rel = joinRel(dirRel, name);
      const isDir = e.isDirectory();
      if (isDir && ALWAYS_SKIP_DIRS.indexOf(name) >= 0) continue;
      if (isIgnored(nextLayers, rel, isDir)) continue;
      if (isDir) {
        walk(path.join(dirAbs, name), rel, nextLayers);
      } else if (e.isFile()) {
        files.push(rel);
      }
    }
  }

  walk(rootDir, ROOT_REL, []);
  files.sort();
  return { files, notes, ignoreFilesSeen };
}

// ---------------------------------------------------------------------------
// C2: derive which folders are mastered. Pure, so --selftest can hand it a
// made up file list and watch the rule move.
// ---------------------------------------------------------------------------
function deriveMasteredFolders(files, optIn, repoBasename) {
  const direct = new Map();     // folderRel -> [fileRel]
  const allFolders = new Set([ROOT_REL]);

  for (const f of files) {
    const d = dirOfRel(f);
    if (!direct.has(d)) direct.set(d, []);
    direct.get(d).push(f);
    let cur = d;
    while (cur !== null) {
      allFolders.add(cur);
      cur = parentOfFolder(cur);
    }
  }

  const optInSet = new Set(optIn);
  const mastered = [];
  const folderList = Array.from(allFolders).sort();

  for (const folder of folderList) {
    const directFiles = direct.get(folder) || [];
    const ownMaster = masterPathFor(folder, repoBasename);
    const counted = directFiles.filter((f) => f !== ownMaster);
    const byThreshold = counted.length >= MASTER_THRESHOLD && counted.some(isTextFile);
    const byOptIn = optInSet.has(folder);
    if (byThreshold || byOptIn) {
      mastered.push({ rel: folder, reason: byThreshold ? 'threshold' : 'opt-in', directCount: counted.length });
    }
  }

  return { mastered, direct, allFolders: folderList };
}

// ---------------------------------------------------------------------------
// The model every check reads: mastered folders, each with its master path,
// its coverage set and its direct mastered children.
// ---------------------------------------------------------------------------
function buildModel(files, optIn, repoBasename) {
  const der = deriveMasteredFolders(files, optIn, repoBasename);
  const masteredSet = new Set(der.mastered.map((m) => m.rel));

  function nearestMasteredAncestor(folderRel) {
    let cur = folderRel;
    while (cur !== null) {
      if (masteredSet.has(cur)) return cur;
      cur = parentOfFolder(cur);
    }
    return null;
  }

  const folders = der.mastered.map((m) => ({
    rel: m.rel,
    reason: m.reason,
    directCount: m.directCount,
    masterRel: masterPathFor(m.rel, repoBasename),
    coverage: [],
    children: [],
  }));
  const byRel = new Map(folders.map((f) => [f.rel, f]));

  // COVERAGE SET: every tracked file lands on exactly one master, the nearest
  // mastered folder at or above it. A master never has to describe itself.
  for (const f of files) {
    const owner = nearestMasteredAncestor(dirOfRel(f));
    if (owner === null) continue;
    const entry = byRel.get(owner);
    if (f === entry.masterRel) continue;
    entry.coverage.push(f);
  }

  // DIRECT MASTERED CHILDREN: the nearest mastered folder strictly above.
  for (const f of folders) {
    if (f.rel === ROOT_REL) continue;
    const parentFolder = parentOfFolder(f.rel);
    const owner = parentFolder === null ? null : nearestMasteredAncestor(parentFolder);
    if (owner !== null && byRel.has(owner)) byRel.get(owner).children.push(f.rel);
  }
  for (const f of folders) f.children.sort();

  return { repoBasename, files, folders, byRel, masteredSet, rootRel: ROOT_REL };
}

// ---------------------------------------------------------------------------
// C3: coverage. A file is covered if it is named as a whole token or matched
// by a GROUP line.
// ---------------------------------------------------------------------------
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The whole token rule, spelled out in the header: not preceded by
// [A-Za-z0-9_.-] and not followed by [A-Za-z0-9_-].
function namesFile(text, filename) {
  const re = new RegExp('(^|[^A-Za-z0-9_.\\-])' + escapeRegex(filename) + '($|[^A-Za-z0-9_\\-])');
  return re.test(text);
}

// "files?" because a group of one reads as "(1 file)"; "(.*)$" because the
// description is prose that may wrap onto the following lines, so only the
// glob and the count are required to be on the GROUP: line itself.
const GROUP_LINE_RE = /^GROUP:[ \t]+(\S+)[ \t]+\((\d+)[ \t]+files?\)[ \t]*(.*)$/;

function parseGroupLines(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '');
    if (line.indexOf('GROUP:') !== 0) continue;
    const m = GROUP_LINE_RE.exec(line);
    if (m) {
      out.push({ line: i + 1, glob: m[1], claimed: Number(m[2]), note: m[3].trim(), malformed: false, raw: line });
    } else {
      out.push({ line: i + 1, glob: null, claimed: null, note: null, malformed: true, raw: line });
    }
  }
  return out;
}

// Repo relative first; retry folder relative if that matched nothing and the
// master is not the root master. Returns the matches plus which reading won.
function expandGroupGlob(glob, folderRel, files) {
  const repoMatches = files.filter((f) => globMatches(glob, f));
  if (repoMatches.length > 0 || folderRel === ROOT_REL) {
    return { matches: repoMatches, resolved: 'repo-relative', effectiveGlob: glob };
  }
  const scoped = folderRel + '/' + glob.replace(/^\.?\//, '');
  const scopedMatches = files.filter((f) => globMatches(scoped, f));
  if (scopedMatches.length > 0) {
    return { matches: scopedMatches, resolved: 'folder-relative', effectiveGlob: scoped };
  }
  return { matches: [], resolved: 'repo-relative', effectiveGlob: glob };
}

function checkCoverage(entry, text, files, findings) {
  const groups = parseGroupLines(text);
  const coveredByGroup = new Set();

  for (const g of groups) {
    if (g.malformed) {
      findings.push({
        clause: 'C3', severity: 'fail', folder: entry.rel, master: entry.masterRel,
        message: 'malformed GROUP line at line ' + g.line + '. The form is ' +
          '"GROUP: <glob> (<n> files) <what they are>", where "file" and "files" are ' +
          'both accepted and the description may wrap onto the following lines. Got: ' + g.raw,
      });
      continue;
    }
    const exp = expandGroupGlob(g.glob, entry.rel, files);
    if (exp.matches.length !== g.claimed) {
      findings.push({
        clause: 'C3', severity: 'fail', folder: entry.rel, master: entry.masterRel,
        message: 'GROUP line ' + g.line + ' claims ' + g.claimed + ' file(s) for glob ' + g.glob +
          ' but it matches ' + exp.matches.length + ' tracked file(s)' +
          (exp.resolved === 'folder-relative' ? ' (read folder relative as ' + exp.effectiveGlob + ')' : '') + '.',
      });
    }
    let outside = 0;
    const own = new Set(entry.coverage);
    for (const m of exp.matches) {
      if (own.has(m)) coveredByGroup.add(m);
      else outside++;
    }
    if (outside > 0) {
      findings.push({
        clause: 'C3', severity: 'warn', folder: entry.rel, master: entry.masterRel,
        message: 'GROUP line ' + g.line + ' (' + g.glob + ') matches ' + outside +
          ' file(s) outside this master\'s coverage set. They count toward the number in ' +
          'parentheses but earn no coverage credit here.',
      });
    }
  }

  const uncovered = [];
  for (const f of entry.coverage) {
    if (coveredByGroup.has(f)) continue;
    if (namesFile(text, baseOfRel(f))) continue;
    uncovered.push(f);
  }

  if (uncovered.length) {
    findings.push({
      clause: 'C3', severity: 'fail', folder: entry.rel, master: entry.masterRel,
      message: uncovered.length + ' of ' + entry.coverage.length +
        ' file(s) in this master\'s coverage set are never named and match no GROUP line.',
      files: uncovered,
    });
  }

  return { uncovered, groups };
}

// ---------------------------------------------------------------------------
// C4: phantom paths.
// ---------------------------------------------------------------------------
function stripFencedBlocks(text) {
  // Replace fenced blocks with blank lines so line numbers stay honest.
  const lines = text.split(/\r?\n/);
  let inFence = false;
  const out = [];
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      out.push('');
      continue;
    }
    out.push(inFence ? '' : line);
  }
  return out.join('\n');
}

function extractPathTokens(text) {
  const bare = stripFencedBlocks(text);
  const tokens = [];

  function push(value, kind, index) {
    const upto = bare.slice(0, index);
    const line = upto.split('\n').length;
    tokens.push({ value, kind, line });
  }

  const linkRe = /\[[^\]\n]*\]\(\s*([^)\s]+)(?:\s+"[^"\n]*")?\s*\)/g;
  let m;
  while ((m = linkRe.exec(bare)) !== null) push(m[1], 'link', m.index);

  const refRe = /^[ \t]*\[[^\]\n]+\]:[ \t]+(\S+)/gm;
  while ((m = refRe.exec(bare)) !== null) push(m[1], 'link-ref', m.index);

  const codeRe = /`([^`\n]+)`/g;
  while ((m = codeRe.exec(bare)) !== null) push(m[1], 'code', m.index);

  return tokens;
}

const LINE_REF_RE = /:\d+(?:-\d+)?$/;

// identifier.identifier, the shape of a member expression. A leading dot does
// not qualify, which is what keeps .claude/ out of it.
const MEMBER_EXPR_RE = /^[A-Za-z_$][A-Za-z0-9_$]*\.[A-Za-z_$]/;

// The narrow rule, stated in full in the header.
function pathShape(rawToken) {
  let tok = String(rawToken).trim();
  if (tok.length > 1 && tok[0] === '<' && tok[tok.length - 1] === '>') tok = tok.slice(1, -1);
  if (tok === '' || tok === '.' || tok === '..') return null;
  if (/\s/.test(tok)) return null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(tok)) return null;
  if (/^mailto:/i.test(tok)) return null;
  if (tok[0] === '#') return null;
  if (/[()[\]{}<>|"'`^$;,]/.test(tok)) return null;
  if (/[*?]/.test(tok)) return null;

  const hadLineRef = LINE_REF_RE.test(tok);
  if (hadLineRef) tok = tok.replace(LINE_REF_RE, '');
  tok = tok.split('#')[0];
  if (tok === '') return null;
  if (tok.indexOf(':') >= 0) return null;

  const slashed = tok.replace(/\\/g, '/').replace(/^\.\//, '');
  // A trailing slash is a directory marker, and it is what makes `assets/` path
  // shaped, so the slash test runs BEFORE it is trimmed off.
  const hadSlash = slashed.indexOf('/') >= 0;
  const norm = slashed.replace(/\/+$/, '');
  if (norm === '' || norm === '.' || norm === '..') return null;
  if (!hadSlash && !hasKnownExtension(norm)) return null;

  const segments = norm.split('/');
  // Prose shorthand, both documented in the header.
  if (hadSlash && MEMBER_EXPR_RE.test(segments[0]) && !hasKnownExtension(segments[0])) return null;
  if (segments.some((s) => /^\d+$/.test(s))) return null;

  return { path: norm, hadLineRef, hadSlash };
}

function normaliseRel(rel) {
  const parts = [];
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length === 0) return null;   // escapes the repo
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return parts.length ? parts.join('/') : null;
}

function candidatesFor(pathRel, folderRel) {
  const repoFirst = pathRel.indexOf('/') >= 0;
  const scoped = folderRel === ROOT_REL ? pathRel : folderRel + '/' + pathRel;
  const list = repoFirst ? [pathRel, scoped] : [scoped, pathRel];
  const out = [];
  for (const c of list) {
    const n = normaliseRel(c);
    if (n !== null && out.indexOf(n) < 0) out.push(n);
  }
  return out;
}

function buildBasenameIndex(files) {
  const index = new Map();
  for (const f of files) {
    const b = baseOfRel(f);
    if (!index.has(b)) index.set(b, []);
    index.get(b).push(f);
  }
  return index;
}

// The claim the numeric segment carve out rests on, checked rather than
// asserted: no tracked path in this repo has a bare number for a segment.
function auditNumericSegments(files) {
  const hits = files.filter((f) => f.split('/').some((s) => /^\d+$/.test(s)));
  return hits;
}

function checkPhantoms(entry, text, existsPath, basenameIndex, findings) {
  const tokens = extractPathTokens(text);
  const phantoms = [];
  const seen = new Set();
  for (const t of tokens) {
    const shaped = pathShape(t.value);
    if (!shaped) continue;
    const cands = candidatesFor(shaped.path, entry.rel);
    if (cands.some((c) => existsPath(c))) continue;

    // Last resort for a slashless token: a unique basename anywhere in the
    // tracked list is unambiguous, so it is not a phantom. See the header.
    let ambiguous = null;
    if (!shaped.hadSlash) {
      const matches = basenameIndex.get(shaped.path) || [];
      if (matches.length === 1) continue;
      if (matches.length > 1) ambiguous = matches;
    }

    const key = t.value + '@' + t.line;
    if (seen.has(key)) continue;
    seen.add(key);
    phantoms.push({ token: t.value, line: t.line, tried: cands, ambiguous: ambiguous });
  }
  if (phantoms.length) {
    const amb = phantoms.filter((p) => p.ambiguous).length;
    findings.push({
      clause: 'C4', severity: 'fail', folder: entry.rel, master: entry.masterRel,
      message: phantoms.length + ' path(s) mentioned by this master cannot be followed' +
        (amb ? ' (' + amb + ' of them ambiguous rather than absent)' : '') + '.',
      paths: phantoms,
    });
  }
  return phantoms;
}

// ---------------------------------------------------------------------------
// C5: the loop. Links to direct mastered children, then the walk.
// ---------------------------------------------------------------------------
function extractLinkTargets(text) {
  const bare = stripFencedBlocks(text);
  const out = [];
  const linkRe = /\[[^\]\n]*\]\(\s*([^)\s]+)(?:\s+"[^"\n]*")?\s*\)/g;
  let m;
  while ((m = linkRe.exec(bare)) !== null) out.push(m[1]);
  const refRe = /^[ \t]*\[[^\]\n]+\]:[ \t]+(\S+)/gm;
  while ((m = refRe.exec(bare)) !== null) out.push(m[1]);
  return out;
}

function linkResolvesTo(target, folderRel, wantedRel) {
  let tok = String(target).trim();
  if (tok.length > 1 && tok[0] === '<' && tok[tok.length - 1] === '>') tok = tok.slice(1, -1);
  tok = tok.split('#')[0].replace(/\\/g, '/');
  if (tok === '') return false;
  for (const c of candidatesFor(tok.replace(/^\.\//, ''), folderRel)) {
    if (c === wantedRel) return true;
  }
  return false;
}

function checkLinks(entry, text, model, findings) {
  const targets = extractLinkTargets(text);
  const linked = [];
  for (const childRel of entry.children) {
    const childMaster = model.byRel.get(childRel).masterRel;
    const ok = targets.some((t) => linkResolvesTo(t, entry.rel, childMaster));
    if (ok) linked.push(childRel);
    else {
      findings.push({
        clause: 'C5', severity: 'fail', folder: entry.rel, master: entry.masterRel,
        message: 'no markdown link to the master of direct mastered child ' + childRel +
          ' (expected a link to ' + childMaster + '). Without it the walk from the root master ' +
          'cannot reach that master and everything below it.',
      });
    }
  }
  return linked;
}

// The walk. Only masters that EXIST take part: a missing master is already a
// C1 failure and reporting it twice as an orphan would bury the real signal.
function walkFromRoot(model, present, linkedBy, findings) {
  const rootEntry = model.byRel.get(ROOT_REL);
  if (!rootEntry || !present.has(ROOT_REL)) {
    findings.push({
      clause: 'C5', severity: 'fail', folder: ROOT_REL, master: rootEntry ? rootEntry.masterRel : '(none)',
      message: 'the walk cannot start: the root master is missing, so no master is reachable ' +
        'by the route the system exists to provide.',
    });
    return { reached: new Set(), orphans: [] };
  }

  const reached = new Set([ROOT_REL]);
  const queue = [ROOT_REL];
  while (queue.length) {
    const cur = queue.shift();
    for (const child of (linkedBy.get(cur) || [])) {
      if (reached.has(child)) continue;
      if (!present.has(child)) continue;
      reached.add(child);
      queue.push(child);
    }
  }

  const orphans = [];
  for (const f of model.folders) {
    if (reached.has(f.rel)) continue;
    if (!present.has(f.rel)) continue;
    // Who should have linked it: its direct mastered parent.
    let linker = null;
    for (const g of model.folders) {
      if (g.children.indexOf(f.rel) >= 0) { linker = g; break; }
    }
    orphans.push({ folder: f.rel, master: f.masterRel, linker: linker ? linker.masterRel : '(none)' });
    findings.push({
      clause: 'C5', severity: 'fail', folder: f.rel, master: f.masterRel,
      message: 'ORPHAN: ' + f.masterRel + ' exists but cannot be reached by walking links from ' +
        masterPathFor(ROOT_REL, model.repoBasename) + '. It should be linked from ' +
        (linker ? linker.masterRel : '(no mastered parent found)') + '.',
    });
  }
  return { reached, orphans };
}

// ---------------------------------------------------------------------------
// C6: house style.
// ---------------------------------------------------------------------------
// Built from character codes, not written as literals, so this file stays pure
// ASCII and obeys the same house rule it enforces. A gate that violates its own
// check is a bad joke waiting for someone to notice.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function isEmojiCodePoint(cp) {
  return (cp >= 0x1F000 && cp <= 0x1FAFF) ||
    (cp >= 0x2600 && cp <= 0x27BF) ||
    (cp >= 0x2B00 && cp <= 0x2BFF) ||
    cp === 0xFE0F || cp === 0x200D ||
    (cp >= 0x1F1E6 && cp <= 0x1F1FF);
}

function checkHouseStyle(entry, text, findings) {
  const lines = text.split(/\r?\n/);
  const hits = [];

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    let col = line.indexOf(EM_DASH);
    if (col >= 0) hits.push({ kind: 'em dash', line: lineNo, col: col + 1, detail: 'U+2014' });
    col = line.indexOf(EN_DASH);
    if (col >= 0) hits.push({ kind: 'en dash', line: lineNo, col: col + 1, detail: 'U+2013' });

    for (let i = 0; i < line.length; i++) {
      const code = line.charCodeAt(i);
      if (code > 0x7F) {
        const cp = line.codePointAt(i);
        if (cp !== 0x2014 && cp !== 0x2013) {
          hits.push({
            kind: isEmojiCodePoint(cp) ? 'emoji' : 'non-ASCII byte',
            line: lineNo, col: i + 1,
            detail: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          });
        }
        break;   // one report per line is enough to send someone to the line
      }
    }

    // Escaped forms, which the ASCII scan above cannot see.
    let m;
    const uBraceRe = /\\u\{([0-9a-fA-F]{2,6})\}/g;
    while ((m = uBraceRe.exec(line)) !== null) {
      const cp = parseInt(m[1], 16);
      if (isEmojiCodePoint(cp)) hits.push({ kind: 'escaped emoji', line: lineNo, col: m.index + 1, detail: m[0] });
    }
    const uRe = /\\u([0-9a-fA-F]{4})/g;
    while ((m = uRe.exec(line)) !== null) {
      const cp = parseInt(m[1], 16);
      if (isEmojiCodePoint(cp) || (cp >= 0xD800 && cp <= 0xDBFF)) {
        hits.push({ kind: 'escaped emoji', line: lineNo, col: m.index + 1, detail: m[0] });
      }
      if (cp === 0x2014 || cp === 0x2013) {
        hits.push({ kind: 'escaped dash', line: lineNo, col: m.index + 1, detail: m[0] });
      }
    }
    const entRe = /&#(x?)([0-9a-fA-F]+);/g;
    while ((m = entRe.exec(line)) !== null) {
      const cp = parseInt(m[2], m[1] ? 16 : 10);
      if (isEmojiCodePoint(cp)) hits.push({ kind: 'escaped emoji', line: lineNo, col: m.index + 1, detail: m[0] });
      if (cp === 0x2014 || cp === 0x2013) hits.push({ kind: 'escaped dash', line: lineNo, col: m.index + 1, detail: m[0] });
    }
  });

  if (hits.length) {
    findings.push({
      clause: 'C6', severity: 'fail', folder: entry.rel, master: entry.masterRel,
      message: hits.length + ' house style violation(s): no em dashes, no en dashes, ASCII only, no emoji.',
      hits: hits,
    });
  }
  return hits;
}

// ---------------------------------------------------------------------------
// The analysis pass. Pure over (model, env), so --selftest can feed it fixtures.
//   env.readMaster(relPath) -> string | null   (null means the file is absent)
//   env.existsPath(relPath) -> boolean         (file OR directory, on disk)
// ---------------------------------------------------------------------------
function analyzeMasters(model, env) {
  const findings = [];
  const present = new Set();
  const linkedBy = new Map();
  const perMaster = [];
  const basenameIndex = buildBasenameIndex(model.files);

  for (const entry of model.folders) {
    const text = env.readMaster(entry.masterRel);
    if (text === null || text === undefined) {
      // C1 / C2: the folder derived as mastered and its master is not there.
      findings.push({
        clause: 'C1', severity: 'fail', folder: entry.rel, master: entry.masterRel,
        message: 'MISSING: ' + entry.rel + ' derives as a mastered folder (' + entry.reason +
          ', ' + entry.directCount + ' direct file(s)) but ' + entry.masterRel + ' does not exist.',
      });
      perMaster.push({
        folder: entry.rel, master: entry.masterRel, present: false, reason: entry.reason,
        coverage: entry.coverage.length, children: entry.children, uncovered: null,
        phantoms: null, styleHits: null,
      });
      continue;
    }
    present.add(entry.rel);

    const cov = checkCoverage(entry, text, model.files, findings);
    const phantoms = checkPhantoms(entry, text, env.existsPath, basenameIndex, findings);
    const linked = checkLinks(entry, text, model, findings);
    const style = checkHouseStyle(entry, text, findings);
    linkedBy.set(entry.rel, linked);

    perMaster.push({
      folder: entry.rel, master: entry.masterRel, present: true, reason: entry.reason,
      coverage: entry.coverage.length, children: entry.children,
      uncovered: cov.uncovered, phantoms: phantoms, styleHits: style,
      groups: cov.groups.filter((g) => !g.malformed).map((g) => ({ glob: g.glob, claimed: g.claimed })),
    });
  }

  const walk = walkFromRoot(model, present, linkedBy, findings);

  return { findings, perMaster, present, reached: walk.reached, orphans: walk.orphans };
}

// ---------------------------------------------------------------------------
// --selftest. Every check below is shown to FIRE against a synthetic fixture,
// then shown to pass against a clean one. Nothing here touches the real repo.
// ---------------------------------------------------------------------------
function makeEnv(masterTexts, existingPaths) {
  const exists = new Set(existingPaths);
  return {
    readMaster: (rel) => (Object.prototype.hasOwnProperty.call(masterTexts, rel) ? masterTexts[rel] : null),
    existsPath: (rel) => exists.has(rel),
  };
}

// A small synthetic repo: root (4 files) -> src/ (3 files) -> src/deep/ (3
// files), plus thin/ (1 file, below the threshold) and bulk/ (opt in, 1 text
// file plus 5 blobs). Deliberately shaped like the real one.
const FIX_FILES = [
  'README.md', 'index.html', 'package.json', 'notes.txt',
  'thin/only.js',
  'src/alpha.js', 'src/beta.js', 'src/gamma.js',
  'src/deep/one.js', 'src/deep/two.js', 'src/deep/three.js',
  'bulk/manifest.json',
  'bulk/a.webm', 'bulk/b.webm', 'bulk/c.webm', 'bulk/d.webm', 'bulk/e.webm',
];
const FIX_ROOT_NAME = 'fixture-repo';

function fixtureModel() {
  return buildModel(FIX_FILES, ['bulk'], FIX_ROOT_NAME);
}

function fixtureExisting() {
  const dirs = ['thin', 'src', 'src/deep', 'bulk'];
  return FIX_FILES.concat(dirs).concat([
    'fixture-repo.md', 'src/src.md', 'src/deep/deep.md', 'bulk/bulk.md',
  ]);
}

function cleanMasters() {
  return {
    'fixture-repo.md': [
      '# fixture-repo',
      '',
      'Root master. Files here: README.md, index.html, package.json, notes.txt.',
      'The one file folder thin/ has no master of its own, so its only.js is described here.',
      '',
      'Children: [src](src/src.md), [bulk](bulk/bulk.md).',
      '',
    ].join('\n'),
    'src/src.md': [
      '# src',
      '',
      'Holds alpha.js, beta.js and gamma.js.',
      'Child master: [deep](deep/deep.md).',
      '',
    ].join('\n'),
    'src/deep/deep.md': [
      '# deep',
      '',
      'Holds one.js, two.js and three.js.',
      '',
    ].join('\n'),
    'bulk/bulk.md': [
      '# bulk',
      '',
      'Holds manifest.json plus the blobs.',
      'GROUP: bulk/*.webm (5 files) the pre rendered blobs',
      '',
    ].join('\n'),
  };
}

function runAnalysis(masters) {
  const model = fixtureModel();
  return analyzeMasters(model, makeEnv(masters, fixtureExisting()));
}

function firedClauses(res) {
  return res.findings.filter((f) => f.severity === 'fail').map((f) => f.clause);
}

function expectThrow(fn, msg) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(msg);
}

function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function check(name, fn) {
  try {
    fn();
    return { name, status: 'pass', detail: '' };
  } catch (e) {
    return { name, status: 'fail', detail: (e && e.message) ? e.message : String(e) };
  }
}

function runSelftest() {
  const results = [];

  // -- glob and gitignore primitives ---------------------------------------
  results.push(check('globToRegex: * stays inside a segment, ** crosses segments', () => {
    assertTrue(globMatches('a/*.js', 'a/b.js'), 'a/*.js should match a/b.js');
    assertTrue(!globMatches('a/*.js', 'a/b/c.js'), '* must not cross a slash');
    assertTrue(globMatches('a/**/*.webm', 'a/b/c/d.webm'), '** must cross segments');
    assertTrue(globMatches('a/**/*.webm', 'a/d.webm'), '**/ must also match zero segments');
    assertTrue(!globMatches('a/**/*.webm', 'b/d.webm'), 'the anchor must still bind');
  }));

  results.push(check('gitignore: dir only, unanchored depth, negation, last match wins', () => {
    const rules = parseIgnoreText('# a comment\n\nnode_modules/\ndist/\n__verify_*\n');
    const layers = [{ baseRel: ROOT_REL, rules }];
    assertTrue(isIgnored(layers, 'node_modules', true), 'node_modules/ must be ignored as a dir');
    assertTrue(!isIgnored(layers, 'node_modules', false), 'a trailing slash pattern must not hit a file');
    assertTrue(isIgnored(layers, 'js/node_modules', true), 'an unanchored pattern matches at any depth');
    assertTrue(isIgnored(layers, '__verify_thing.cjs', false), 'a wildcard pattern must hit');
    assertTrue(!isIgnored(layers, 'js/data.js', false), 'a normal source file must survive');

    const nested = [
      { baseRel: ROOT_REL, rules: parseIgnoreText('*.wav\n') },
      { baseRel: 'tools/render', rules: parseIgnoreText('!keep.wav\n') },
    ];
    assertTrue(isIgnored(nested, 'a/x.wav', false), 'the outer rule applies');
    assertTrue(!isIgnored(nested, 'tools/render/keep.wav', false), 'a deeper negation must win');
  }));

  // -- C2 derivation --------------------------------------------------------
  results.push(check('C2 FIRES: the threshold and the text file requirement both bind', () => {
    const der = deriveMasteredFolders(FIX_FILES, ['bulk'], FIX_ROOT_NAME);
    const rels = der.mastered.map((m) => m.rel).sort();
    assertEq(rels.join(','), '.,bulk,src,src/deep', 'derived mastered folders');
    assertTrue(rels.indexOf('thin') < 0, 'thin/ has 1 file and must NOT be mastered');

    // Three files, none of them text: must NOT derive.
    const blobsOnly = deriveMasteredFolders(['b/x.webm', 'b/y.webm', 'b/z.webm'], [], 'r');
    assertTrue(blobsOnly.mastered.map((m) => m.rel).indexOf('b') < 0,
      'a folder of three blobs and no text file must not derive as mastered');

    // Adding a fourth file to a one file folder must flip it on by itself.
    const grown = deriveMasteredFolders(FIX_FILES.concat(['thin/b.js', 'thin/c.js']), ['bulk'], FIX_ROOT_NAME);
    assertTrue(grown.mastered.map((m) => m.rel).indexOf('thin') >= 0,
      'thin/ must derive as mastered once it holds three files');

    // The master itself must not be counted toward its own threshold.
    const selfCount = deriveMasteredFolders(['b/b.md', 'b/x.js', 'b/y.js'], [], 'r');
    assertTrue(selfCount.mastered.map((m) => m.rel).indexOf('b') < 0,
      'a folder whose third file is its own master must not clear the threshold');
  }));

  results.push(check('C1 NAMING: the root master is named for the repo folder', () => {
    assertEq(masterNameFor(ROOT_REL, 'merit-badge-massacre'), 'merit-badge-massacre.md', 'root master name');
    assertEq(masterPathFor('js/music/src', 'r'), 'js/music/src/src.md', 'nested master path');
    assertEq(masterPathFor('.claude/agents', 'r'), '.claude/agents/agents.md', 'dotted folder master path');
  }));

  results.push(check('coverage set: a file under an unmastered folder rolls up to its nearest mastered ancestor', () => {
    const model = fixtureModel();
    const root = model.byRel.get(ROOT_REL);
    assertTrue(root.coverage.indexOf('thin/only.js') >= 0,
      'thin/only.js must be the root master\'s responsibility');
    assertTrue(root.coverage.indexOf('src/alpha.js') < 0,
      'src/alpha.js belongs to src/src.md, not to the root');
    assertEq(root.coverage.length, 5, 'root coverage: 4 direct plus thin/only.js');
    assertEq(model.byRel.get('bulk').coverage.length, 6, 'bulk coverage: manifest plus 5 blobs');
    assertEq(model.byRel.get('.').children.join(','), 'bulk,src', 'root direct mastered children');
    assertEq(model.byRel.get('src').children.join(','), 'src/deep', 'src direct mastered children');
  }));

  // -- the clean fixture must pass ------------------------------------------
  results.push(check('the clean fixture passes every clause (the gate is not stuck on)', () => {
    const res = runAnalysis(cleanMasters());
    const fails = res.findings.filter((f) => f.severity === 'fail');
    assertEq(fails.length, 0, 'clean fixture failures: ' + JSON.stringify(fails.map((f) => f.clause + ' ' + f.message)));
    assertEq(res.reached.size, 4, 'the walk must reach all four masters');
  }));

  // -- C3 uncovered file FIRES ----------------------------------------------
  results.push(check('C3 FIRES: an uncovered file', () => {
    const m = cleanMasters();
    m['src/src.md'] = m['src/src.md'].replace('alpha.js, beta.js and gamma.js', 'alpha.js and beta.js');
    const res = runAnalysis(m);
    const f = res.findings.filter((x) => x.clause === 'C3' && x.severity === 'fail');
    assertEq(f.length, 1, 'exactly one C3 failure expected');
    assertEq(f[0].files.join(','), 'src/gamma.js', 'the uncovered file must be named');
  }));

  results.push(check('C3 FIRES: a near miss filename earns no credit (rooms.js is not room.js)', () => {
    assertTrue(!namesFile('this master mentions rooms.js only', 'room.js'),
      'rooms.js must not be credited as room.js');
    assertTrue(!namesFile('this master mentions audio_director.js only', 'director.js'),
      'audio_director.js must not be credited as director.js');
    assertTrue(!namesFile('this master mentions act1.json only', 'act1.js'),
      'act1.json must not be credited as act1.js');
    assertTrue(namesFile('see js/room.js for the door code', 'room.js'),
      'a path form must credit the bare filename');
    assertTrue(namesFile('the file is `room.js`.', 'room.js'),
      'a trailing full stop must not block the credit');
    assertTrue(namesFile('room.js', 'room.js'), 'a bare filename alone must credit');
  }));

  // -- C3 GROUP count FIRES -------------------------------------------------
  results.push(check('C3 FIRES: a wrong GROUP count', () => {
    const m = cleanMasters();
    m['bulk/bulk.md'] = m['bulk/bulk.md'].replace('(5 files)', '(4 files)');
    const res = runAnalysis(m);
    const f = res.findings.filter((x) => x.clause === 'C3' && x.severity === 'fail');
    assertTrue(f.length >= 1, 'a wrong GROUP count must fail');
    assertTrue(f[0].message.indexOf('claims 4 file(s)') >= 0, 'the message must show both numbers: ' + f[0].message);
    assertTrue(f[0].message.indexOf('matches 5 tracked file(s)') >= 0, 'the message must show the real count');
  }));

  results.push(check('C3 FIRES: a malformed GROUP line', () => {
    const m = cleanMasters();
    m['bulk/bulk.md'] = m['bulk/bulk.md'].replace(
      'GROUP: bulk/*.webm (5 files) the pre rendered blobs',
      'GROUP: bulk/*.webm - the pre rendered blobs');
    const res = runAnalysis(m);
    const f = res.findings.filter((x) => x.clause === 'C3' && x.message.indexOf('malformed') >= 0);
    assertEq(f.length, 1, 'a malformed GROUP line must fail on its own');
  }));

  results.push(check('C3: a singular "(1 file)" GROUP line is accepted and still counted', () => {
    const files = FIX_FILES.filter((f) => f !== 'bulk/b.webm' && f !== 'bulk/c.webm' &&
      f !== 'bulk/d.webm' && f !== 'bulk/e.webm');
    const model = buildModel(files, ['bulk'], FIX_ROOT_NAME);
    const m = cleanMasters();
    m['bulk/bulk.md'] = m['bulk/bulk.md'].replace(
      'GROUP: bulk/*.webm (5 files) the pre rendered blobs',
      'GROUP: bulk/*.webm (1 file) the one remaining blob');
    const ok = analyzeMasters(model, makeEnv(m, fixtureExisting()));
    assertEq(ok.findings.filter((x) => x.severity === 'fail').length, 0,
      'singular must parse and cover: ' + JSON.stringify(ok.findings.map((x) => x.message)));

    // And the count is still checked when it is singular.
    m['bulk/bulk.md'] = m['bulk/bulk.md'].replace('(1 file)', '(2 files)');
    const bad = analyzeMasters(model, makeEnv(m, fixtureExisting()));
    assertTrue(bad.findings.some((x) => x.clause === 'C3' && x.message.indexOf('claims 2 file(s)') >= 0),
      'a wrong count must still fail when the real count is 1');
  }));

  results.push(check('C3: a GROUP description that wraps onto following lines is accepted', () => {
    const m = cleanMasters();
    m['bulk/bulk.md'] = m['bulk/bulk.md'].replace(
      'GROUP: bulk/*.webm (5 files) the pre rendered blobs',
      'GROUP: bulk/*.webm (5 files) the pre rendered blobs, baked by the\n' +
      'offline renderer and named `<theme>_<layer>.<hash8>.webm`.\nSee the notes above.');
    const res = runAnalysis(m);
    assertEq(res.findings.filter((x) => x.severity === 'fail').length, 0,
      'a wrapped description must not break the parse or the phantom scan: ' +
      JSON.stringify(res.findings.map((x) => x.message)));

    const parsed = parseGroupLines(m['bulk/bulk.md']);
    assertEq(parsed.length, 1, 'the continuation lines must not read as extra GROUP lines');
    assertEq(parsed[0].glob, 'bulk/*.webm', 'the glob comes off the GROUP: line only');
    assertEq(parsed[0].claimed, 5, 'the count comes off the GROUP: line only');
  }));

  results.push(check('C4: an angle bracket placeholder is not a path', () => {
    assertEq(pathShape('BOSSLINES.<bossId>'), null, 'a dotted placeholder must not be a path');
    assertEq(pathShape('<theme>_<layer>.<hash8>.webm'), null, 'a templated filename must not be a path');
    assertEq(pathShape('assets/voice/en/<speaker>/'), null, 'a templated directory must not be a path');
    assertEq(pathShape('<bossId>'), null, 'a bare placeholder must not be a path');
    // The one angle bracket case that IS markdown syntax rather than a placeholder.
    assertEq(pathShape('<js/room.js>').path, 'js/room.js', 'an angle wrapped link target must unwrap');
    const m = cleanMasters();
    m['bulk/bulk.md'] += '\nEach one is a `BOSSLINES.<bossId>` line named `<theme>_<layer>.<hash8>.webm`.\n';
    assertEq(runAnalysis(m).findings.filter((x) => x.clause === 'C4').length, 0,
      'placeholders in a real master must not register as phantoms');
  }));

  results.push(check('C3: a GROUP glob resolves folder relative when the repo relative read matches nothing', () => {
    const m = cleanMasters();
    m['bulk/bulk.md'] = m['bulk/bulk.md'].replace('GROUP: bulk/*.webm', 'GROUP: *.webm');
    const res = runAnalysis(m);
    const f = res.findings.filter((x) => x.severity === 'fail');
    assertEq(f.length, 0, 'a folder relative glob must still cover: ' + JSON.stringify(f.map((x) => x.message)));
  }));

  // -- C4 phantom FIRES -----------------------------------------------------
  results.push(check('C4 FIRES: a phantom path', () => {
    const m = cleanMasters();
    m['src/src.md'] += '\nSee [the gone one](src/vanished.js) for the rest.\n';
    const res = runAnalysis(m);
    const f = res.findings.filter((x) => x.clause === 'C4');
    assertEq(f.length, 1, 'exactly one C4 failure expected');
    assertEq(f[0].paths[0].token, 'src/vanished.js', 'the phantom must be named');
  }));

  results.push(check('C4: a line reference is stripped and a real path still passes', () => {
    const m = cleanMasters();
    m['src/src.md'] += '\nThe door code is at `src/alpha.js:160` and the block at `src/beta.js:12-40`.\n';
    const res = runAnalysis(m);
    assertEq(res.findings.filter((x) => x.clause === 'C4').length, 0,
      'a :line suffix must not turn a real path into a phantom');
  }));

  results.push(check('C4: the path sniffer keeps prose and code identifiers out', () => {
    assertEq(pathShape('Room.enter()'), null, 'a call must not be a path');
    assertEq(pathShape('Game.armShot'), null, 'a member expression must not be a path');
    assertEq(pathShape('Math.random'), null, 'Math.random must not be a path');
    assertEq(pathShape('def.scatter'), null, 'a field must not be a path');
    assertEq(pathShape('npm run rooms:check'), null, 'a command line must not be a path');
    assertEq(pathShape('https://example.com/a.js'), null, 'a URL must not be a path');
    assertEq(pathShape('#a-heading'), null, 'an anchor must not be a path');
    assertEq(pathShape('assets/**/*.webm'), null, 'a glob must not be a path (GROUP owns globs)');
    assertTrue(pathShape('js/room.js') !== null, 'a real repo path must be a path');
    assertEq(pathShape('js/room.js').path, 'js/room.js', 'a real path passes through unchanged');
    assertEq(pathShape('docs\\preproduction\\RULINGS.md').path, 'docs/preproduction/RULINGS.md',
      'backslashes must normalise');
    assertEq(pathShape('js/props.js:160').path, 'js/props.js', 'a line reference must be stripped');
    assertEq(pathShape('assets/').path, 'assets', 'a trailing slash directory must be checked');
    assertEq(pathShape('README.md').path, 'README.md', 'a bare filename with a known extension is a path');
  }));

  results.push(check('C4: prose shorthand with slashes in it is not a path', () => {
    assertEq(pathShape('Music.goto/setHeat/setPhase/stop'), null,
      'four method names sharing a receiver must not be a path');
    assertEq(pathShape('Room.enter/buildGrid'), null, 'the same shape with two members');
    assertEq(pathShape('GROUNDING_AUDIT_1/2/3.md'), null,
      'three filenames compressed into one citation must not be a path');
    assertTrue(pathShape('.claude/agents/agents.md') !== null,
      'a leading dot folder must survive the member expression rule');
    assertEq(pathShape('.claude/agents/agents.md').path, '.claude/agents/agents.md', 'and unchanged');
    assertTrue(pathShape('js/music/src/synth.js') !== null, 'a real nested path must survive both rules');
    assertTrue(pathShape('package.json') !== null, 'a dotted name with a known extension is still a path');
  }));

  results.push(check('C4: the numeric segment carve out is audited, not assumed', () => {
    assertEq(auditNumericSegments(['js/data.js', 'assets/music/act1_l1.webm']).length, 0,
      'a clean tree must produce no audit hits');
    assertEq(auditNumericSegments(['assets/voice/en/2/x.webm']).join(','), 'assets/voice/en/2/x.webm',
      'a real numeric directory must be reported, because it invalidates the carve out');
  }));

  results.push(check('C4: a unique bare filename from another folder resolves, a duplicate FIRES', () => {
    const files = ['a/one.js', 'a/two.js', 'a/three.js', 'b/one.js', 'b/x.js', 'b/y.js', 'solo.md'];
    const index = buildBasenameIndex(files);
    const exists = (rel) => files.indexOf(rel) >= 0;
    // The master doing the citing is in c/, so nothing below resolves locally
    // and every case actually reaches the fallback under test.
    const entry = { rel: 'c', masterRel: 'c/c.md' };

    // solo.md lives at the repo root, cited bare from c/. Unique, so followable.
    let findings = [];
    checkPhantoms(entry, 'see `solo.md` for the rest', exists, index, findings);
    assertEq(findings.length, 0, 'a unique basename must resolve wherever it lives');

    // three.js lives only in a/, cited bare from b/. Unique, so followable.
    findings = [];
    checkPhantoms(entry, 'it loads `three.js` first', exists, index, findings);
    assertEq(findings.length, 0, 'a unique basename in a sibling folder must resolve');

    // one.js exists twice. A reader cannot follow it.
    findings = [];
    checkPhantoms(entry, 'it also loads `one.js`', exists, index, findings);
    assertEq(findings.length, 1, 'an ambiguous basename must fail');
    assertEq(findings[0].paths[0].ambiguous.join(','), 'a/one.js,b/one.js',
      'the failure must name both candidates');
    assertTrue(findings[0].message.indexOf('ambiguous') >= 0, 'and say so: ' + findings[0].message);

    // gone.js exists nowhere. Still a phantom, fallback or no fallback.
    findings = [];
    checkPhantoms(entry, 'it also loads `gone.js`', exists, index, findings);
    assertEq(findings.length, 1, 'a bare filename that exists nowhere must still fail');
    assertEq(findings[0].paths[0].ambiguous, null, 'and must not be labelled ambiguous');

    // A token WITH a slash claims a location and is held to it, no fallback.
    findings = [];
    checkPhantoms(entry, 'it also loads `c/three.js`', exists, index, findings);
    assertEq(findings.length, 1, 'a wrong directory must fail even though the basename is unique');
  }));

  results.push(check('C4: a bare filename resolves against the master\'s own folder first', () => {
    const m = cleanMasters();
    m['src/deep/deep.md'] += '\nThe entry point is `one.js`.\n';
    const res = runAnalysis(m);
    assertEq(res.findings.filter((x) => x.clause === 'C4').length, 0,
      'src/deep/deep.md naming one.js must resolve to src/deep/one.js, not to a root one.js');
  }));

  results.push(check('C4: a path inside a fenced block is not checked', () => {
    const m = cleanMasters();
    m['src/deep/deep.md'] += '\n```\nnode tools/imaginary/thing.cjs --out no/such/place.txt\n```\n';
    const res = runAnalysis(m);
    assertEq(res.findings.filter((x) => x.clause === 'C4').length, 0,
      'fenced blocks are excluded from the phantom scan on purpose');
  }));

  // -- C5 missing link and orphan FIRE --------------------------------------
  results.push(check('C5 FIRES: a missing link to a direct mastered child', () => {
    const m = cleanMasters();
    m['src/src.md'] = m['src/src.md'].replace('Child master: [deep](deep/deep.md).', 'No child link here.');
    const res = runAnalysis(m);
    const link = res.findings.filter((x) => x.clause === 'C5' && x.message.indexOf('no markdown link') >= 0);
    assertEq(link.length, 1, 'the missing link must fail');
    assertTrue(link[0].message.indexOf('src/deep/deep.md') >= 0, 'the message must name the expected target');
  }));

  results.push(check('C5 FIRES: an ORPHAN master, naming it and where it should have been linked', () => {
    const m = cleanMasters();
    m['src/src.md'] = m['src/src.md'].replace('Child master: [deep](deep/deep.md).', 'No child link here.');
    const res = runAnalysis(m);
    const orph = res.findings.filter((x) => x.clause === 'C5' && x.message.indexOf('ORPHAN') >= 0);
    assertEq(orph.length, 1, 'exactly one orphan expected');
    assertTrue(orph[0].message.indexOf('src/deep/deep.md') >= 0, 'the orphan must be named');
    assertTrue(orph[0].message.indexOf('should be linked from src/src.md') >= 0,
      'the message must say where the link belongs: ' + orph[0].message);
    assertEq(res.reached.size, 3, 'the walk must reach three of the four masters');
  }));

  results.push(check('C5: a link to a grandchild does not excuse the missing direct link', () => {
    const m = cleanMasters();
    // Root links straight past src/ to src/deep/deep.md. The walk would reach
    // deep, but src/src.md still owes its direct child a link.
    m['src/src.md'] = m['src/src.md'].replace('Child master: [deep](deep/deep.md).', 'No child link here.');
    m['fixture-repo.md'] = m['fixture-repo.md'].replace(
      'Children: [src](src/src.md), [bulk](bulk/bulk.md).',
      'Children: [src](src/src.md), [bulk](bulk/bulk.md), [deep](src/deep/deep.md).');
    const res = runAnalysis(m);
    assertTrue(res.findings.some((x) => x.clause === 'C5' && x.message.indexOf('no markdown link') >= 0),
      'the direct link is still owed even when the walk gets there another way');
  }));

  // -- C1 missing master FIRES ----------------------------------------------
  results.push(check('C1 FIRES: a missing master', () => {
    const m = cleanMasters();
    delete m['src/deep/deep.md'];
    const res = runAnalysis(m);
    const miss = res.findings.filter((x) => x.clause === 'C1');
    assertEq(miss.length, 1, 'exactly one missing master expected');
    assertTrue(miss[0].message.indexOf('src/deep/deep.md does not exist') >= 0,
      'the message must name the missing file: ' + miss[0].message);
    assertTrue(!res.findings.some((x) => x.message.indexOf('ORPHAN') >= 0),
      'a missing master must not also be reported as an orphan');
  }));

  results.push(check('C1 FIRES: a missing ROOT master stops the walk with one clear finding', () => {
    const m = cleanMasters();
    delete m['fixture-repo.md'];
    const res = runAnalysis(m);
    assertTrue(res.findings.some((x) => x.clause === 'C1' && x.message.indexOf('fixture-repo.md does not exist') >= 0),
      'the root master must be reported missing');
    assertTrue(res.findings.some((x) => x.clause === 'C5' && x.message.indexOf('walk cannot start') >= 0),
      'the walk must say it cannot start');
    assertEq(res.reached.size, 0, 'nothing is reachable without the root master');
  }));

  // -- C6 house style FIRES -------------------------------------------------
  results.push(check('C6 FIRES: an em dash', () => {
    const m = cleanMasters();
    m['src/deep/deep.md'] = m['src/deep/deep.md'].replace('Holds one.js', 'Holds ' + EM_DASH + ' one.js');
    const res = runAnalysis(m);
    const f = res.findings.filter((x) => x.clause === 'C6');
    assertEq(f.length, 1, 'the em dash must fail');
    assertEq(f[0].hits[0].kind, 'em dash', 'it must be reported as an em dash');
    assertEq(f[0].hits[0].line, 3, 'the line number must point at it');
  }));

  results.push(check('C6 FIRES: an en dash, a non-ASCII byte, a literal emoji and an escaped emoji', () => {
    const cases = [
      { text: 'a ' + EN_DASH + ' b', kind: 'en dash' },
      { text: 'caf' + String.fromCharCode(0xE9) + ' notes', kind: 'non-ASCII byte' },
      { text: 'ship it \u{1F680}', kind: 'emoji' },
      { text: 'ship it \\u{1F680}', kind: 'escaped emoji' },
      { text: 'ship it \\ud83d\\ude80', kind: 'escaped emoji' },
      { text: 'ship it &#x1F680;', kind: 'escaped emoji' },
      { text: 'a \\u2014 b', kind: 'escaped dash' },
    ];
    for (const c of cases) {
      const findings = [];
      const hits = checkHouseStyle({ rel: 'x', masterRel: 'x/x.md' }, c.text, findings);
      assertEq(findings.length, 1, 'no finding for ' + JSON.stringify(c.text));
      assertTrue(hits.some((h) => h.kind === c.kind),
        'expected a ' + c.kind + ' hit for ' + JSON.stringify(c.text) + ', got ' + JSON.stringify(hits));
    }
    const clean = [];
    checkHouseStyle({ rel: 'x', masterRel: 'x/x.md' }, 'plain ASCII prose, commas and colons only.', clean);
    assertEq(clean.length, 0, 'clean ASCII must not fire');
  }));

  // -- the assertion helpers themselves -------------------------------------
  results.push(check('the selftest\'s own assertions throw when they should', () => {
    expectThrow(() => assertEq(1, 2, 'x'), 'assertEq did not throw on a mismatch');
    expectThrow(() => assertTrue(false, 'x'), 'assertTrue did not throw on false');
  }));

  return results;
}

// ---------------------------------------------------------------------------
// Report and CLI.
// ---------------------------------------------------------------------------
function padEnd(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

function printSelftestReport(results) {
  const lines = [];
  lines.push('MASTER FILE GATE: selftest, ' + results.length + ' check(s)');
  lines.push('');
  results.forEach((r) => {
    lines.push('  ' + padEnd(r.status.toUpperCase(), 6) + r.name);
    if (r.status === 'fail') lines.push('        ' + r.detail);
  });
  const failed = results.filter((r) => r.status === 'fail').length;
  lines.push('');
  lines.push('TOTAL: ' + (results.length - failed) + ' pass, ' + failed + ' fail.');
  return lines.join('\n');
}

function printReport(ctx, opts) {
  const { model, analysis, tracked, warnings } = ctx;
  const lines = [];
  lines.push('MASTER FILE GATE (contract v1)');
  lines.push('  repo root:     ' + REPO_ROOT);
  lines.push('  tracked files: ' + tracked.files.length +
    ' (filesystem walk, .gitignore honoured, ' + tracked.ignoreFilesSeen.length + ' ignore file(s) read)');
  lines.push('');
  lines.push('DERIVED MASTERED FOLDERS (C2): ' + model.folders.length);
  analysis.perMaster.forEach((pm) => {
    const status = !pm.present ? 'MISSING'
      : (analysis.reached.has(pm.folder) ? 'ok' : 'ORPHAN');
    lines.push('  ' + padEnd(pm.folder === ROOT_REL ? '.' : pm.folder + '/', 22) +
      padEnd('-> ' + pm.master, 42) +
      padEnd(status, 9) +
      pm.coverage + ' file(s) to cover, ' + pm.children.length + ' child master(s), by ' + pm.reason);
  });

  const fails = analysis.findings.filter((f) => f.severity === 'fail');
  const warns = analysis.findings.filter((f) => f.severity === 'warn').concat(warnings);

  const CLAUSE_TITLES = {
    C1: 'C1 NAMING and presence',
    C2: 'C2 which folders are mastered',
    C3: 'C3 coverage',
    C4: 'C4 no phantoms',
    C5: 'C5 the loop',
    C6: 'C6 house style',
  };

  lines.push('');
  if (!fails.length) {
    lines.push('FAILURES: none. Every derived master exists, covers its files, cites only real');
    lines.push('paths, links its children, is reachable from the root master, and is clean ASCII.');
  } else {
    lines.push('FAILURES: ' + fails.length);
    ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].forEach((clause) => {
      const group = fails.filter((f) => f.clause === clause);
      if (!group.length) return;
      lines.push('');
      lines.push('  ' + CLAUSE_TITLES[clause] + ' (' + group.length + ')');
      group.forEach((f) => {
        lines.push('    ' + f.master + ': ' + f.message);
        if (f.files) {
          const show = opts.verbose ? f.files : f.files.slice(0, 12);
          show.forEach((x) => lines.push('        ' + x));
          if (!opts.verbose && f.files.length > show.length) {
            lines.push('        ... and ' + (f.files.length - show.length) + ' more (--verbose for all)');
          }
        }
        if (f.paths) {
          const show = opts.verbose ? f.paths : f.paths.slice(0, 12);
          show.forEach((p) => lines.push('        line ' + p.line + ': ' + p.token +
            (p.ambiguous ? '  (AMBIGUOUS, matches ' + p.ambiguous.join(' and ') + ')'
              : (p.tried.length ? '  (tried ' + p.tried.join(', ') + ')' : ''))));
          if (!opts.verbose && f.paths.length > show.length) {
            lines.push('        ... and ' + (f.paths.length - show.length) + ' more (--verbose for all)');
          }
        }
        if (f.hits) {
          const show = opts.verbose ? f.hits : f.hits.slice(0, 12);
          show.forEach((h) => lines.push('        line ' + h.line + ' col ' + h.col + ': ' + h.kind + ' ' + h.detail));
          if (!opts.verbose && f.hits.length > show.length) {
            lines.push('        ... and ' + (f.hits.length - show.length) + ' more (--verbose for all)');
          }
        }
      });
    });
  }

  if (warns.length) {
    lines.push('');
    lines.push('WARNINGS: ' + warns.length + ' (these never fail the run)');
    warns.forEach((w) => lines.push('    ' + w.message));
  }

  lines.push('');
  lines.push('TOTAL: ' + (model.folders.length - fails.filter((f) => f.clause === 'C1').length) +
    ' of ' + model.folders.length + ' derived master(s) present, ' +
    analysis.reached.size + ' reachable from the root master, ' +
    fails.length + ' failure(s), ' + warns.length + ' warning(s).');
  return lines.join('\n');
}

function collectWarnings(tracked) {
  const warnings = [];

  // The tripwire: these two are known to be untracked leftovers. If a walk
  // that only honours .gitignore still picks files up out of one of them, the
  // ignore rule has been lost and a phantom master is one file away.
  WATCH_UNTRACKED_DIRS.forEach((d) => {
    if (!fs.existsSync(path.join(REPO_ROOT, d))) return;
    const leaked = tracked.files.filter((f) => f.indexOf(d + '/') === 0);
    if (leaked.length) {
      warnings.push({
        clause: 'C0', severity: 'warn',
        message: d + '/ is present in the working tree and NOT ignored: ' + leaked.length +
          ' file(s) from it are being counted as tracked. It is a leftover from the rejected ' +
          '2026-07-29 art method test and is not in git, so it should be ignored or deleted. ' +
          'Left as is, it can derive as a mastered folder and demand a master for dead work.',
      });
    }
  });

  OPT_IN_FOLDERS.forEach((d) => {
    if (!fs.existsSync(path.join(REPO_ROOT, d))) {
      warnings.push({
        clause: 'C0', severity: 'warn',
        message: 'opt in folder ' + d + '/ does not exist, so OPT_IN_FOLDERS is stale.',
      });
    }
  });

  const numeric = auditNumericSegments(tracked.files);
  if (numeric.length) {
    warnings.push({
      clause: 'C0', severity: 'warn',
      message: numeric.length + ' tracked path(s) now have a bare number for a path segment (e.g. ' +
        numeric[0] + '). The clause 4 sniffer drops such tokens as alternation shorthand ' +
        '(GROUNDING_AUDIT_1/2/3.md), so that carve out is no longer safe and needs rewriting.',
    });
  }

  return warnings;
}

function main() {
  const argv = process.argv.slice(2);
  const opts = { json: false, selftest: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') opts.json = true;
    else if (argv[i] === '--selftest') opts.selftest = true;
    else if (argv[i] === '--verbose') opts.verbose = true;
    else {
      console.error('validate_masters: unknown argument ' + argv[i]);
      console.error('usage: node tools/validate_masters.cjs [--json] [--verbose] [--selftest]');
      process.exit(2);
    }
  }

  if (opts.selftest) {
    const results = runSelftest();
    const failed = results.filter((r) => r.status === 'fail');
    if (opts.json) {
      process.stdout.write(JSON.stringify({
        generatedAt: new Date().toISOString(), mode: 'selftest', results,
        pass: results.length - failed.length, fail: failed.length,
      }, null, 2) + '\n');
    } else {
      console.log(printSelftestReport(results));
    }
    process.exit(failed.length ? 1 : 0);
    return;
  }

  const tracked = listTrackedFiles(REPO_ROOT);
  const model = buildModel(tracked.files, OPT_IN_FOLDERS, REPO_BASENAME);
  const env = {
    readMaster(rel) {
      const abs = path.join(REPO_ROOT, rel);
      try {
        if (!fs.existsSync(abs)) return null;
        return fs.readFileSync(abs, 'utf8');
      } catch (e) { return null; }
    },
    existsPath(rel) {
      return fs.existsSync(path.join(REPO_ROOT, rel));
    },
  };
  const analysis = analyzeMasters(model, env);
  const warnings = collectWarnings(tracked).concat(
    tracked.notes.map((n) => ({ clause: 'C0', severity: 'warn', message: n })));

  const fails = analysis.findings.filter((f) => f.severity === 'fail');

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      generatedAt: new Date().toISOString(),
      mode: 'check',
      repoRoot: REPO_ROOT,
      contract: 'v1',
      trackedFileCount: tracked.files.length,
      ignoreFilesRead: tracked.ignoreFilesSeen,
      masteredFolders: model.folders.map((f) => ({
        folder: f.rel, master: f.masterRel, reason: f.reason,
        directFileCount: f.directCount, coverageCount: f.coverage.length,
        children: f.children.map((c) => model.byRel.get(c).masterRel),
        present: analysis.present.has(f.rel),
        reachable: analysis.reached.has(f.rel),
      })),
      findings: analysis.findings,
      warnings: warnings,
      orphans: analysis.orphans,
      fail: fails.length,
    }, null, 2) + '\n');
  } else {
    console.log(printReport({ model, analysis, tracked, warnings }, opts));
  }

  process.exit(fails.length ? 1 : 0);
}

main();
