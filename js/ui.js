// Merit Badge Massacre: UI shell. Screens, HUD, input, settings, records.
'use strict';

// The night is a run of rooms now. Flip this to true to bring the 1.0 open
// field back for debugging: startRun then never touches Run, so the director
// spawns off the wall clock exactly as it used to.
const MBM_FIELD = false;

const INPUT = { keys: new Set(), mx: window.innerWidth / 2, my: window.innerHeight / 2, fire: false, mdown: false, dodge: false, skill: false };

const SETTINGS = { musicVol: 0.8, sfxVol: 0.8, voiceVol: 0.9, shake: true, dmgNums: true, subtitles: true };
try {
  const s = JSON.parse(localStorage.getItem('mbm_settings') || '{}');
  Object.assign(SETTINGS, s);
} catch (e) {}
function saveSettings() {
  try { localStorage.setItem('mbm_settings', JSON.stringify(SETTINGS)); } catch (e) {}
  AudioSys.setVolumes({ music: SETTINGS.musicVol, sfx: SETTINGS.sfxVol, voice: SETTINGS.voiceVol });
}

// Build categories: one color, one pip shape, one label, used by the HUD, the
// rank up cards and the pause panel so a weapon reads as a weapon everywhere.
const CAT = {
  gear: { label: 'GEAR', color: '#f4c542', pip: 'sq' },
  patch: { label: 'PATCHES', color: '#7ec87e', pip: 'rd' },
  skill: { label: 'SKILLS', color: '#7ec8e8', pip: 'di' },
  supply: { label: 'SUPPLY', color: '#9aa08c', pip: 'rd' },
};

// ---------------- the run's active skill ----------------
// The one place this file asks game.js about the skill on the button. Every
// read is feature tested, because the runtime lands in game.js on its own
// schedule: a page where it has not landed yet must still show a HUD, a pause
// panel and a touch layer with no active skill in them at all.
function skillOf(g) {
  if (!g || typeof g.skillInfo !== 'function') return null;
  let info = null;
  try { info = g.skillInfo(); } catch (e) { info = null; }
  return (info && info.id) ? info : null;
}

// 1 when it can fire this instant, 0 when it cannot. A missing runtime reads
// as ready, the way touch.js's dodge button treats a missing dodgeReady.
function skillReadyOf(g) {
  if (!g || typeof g.skillReady !== 'function') return 1;
  let v = 1;
  try { v = g.skillReady(); } catch (e) { v = 1; }
  return v > 0 ? 1 : 0;
}

// How full the cooldown sweep is, 0 to 1. 1 means ready, and 1 when there is
// no skill and when the number that came back was not a number.
function skillFracOf(g) {
  if (!g || typeof g.skillCdFrac !== 'function') return 1;
  let v = 1;
  try { v = g.skillCdFrac(); } catch (e) { v = 1; }
  if (typeof v !== 'number' || !(v >= 0)) return 1;
  return v > 1 ? 1 : v;
}

const App = {
  state: 'title',
  game: null,
  camp: null,
  dialogOpen: false,
  char: 'max',
  choices: [],
  optionsFrom: 'title',
  best: { time: 0, kills: 0, dawns: 0, runs: 0 },
};
try {
  const b = JSON.parse(localStorage.getItem('mbm_best') || '{}');
  Object.assign(App.best, b);
} catch (e) {}
function saveBest() {
  try { localStorage.setItem('mbm_best', JSON.stringify(App.best)); } catch (e) {}
}

const $ = id => document.getElementById(id);
const cv = $('cv');
const ctx = cv.getContext('2d');
let DPR = 1;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.floor(window.innerWidth * DPR);
  cv.height = Math.floor(window.innerHeight * DPR);
}
window.addEventListener('resize', resize);
resize();

function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  return (m < 10 ? '0' : '') + m + ':' + ((s % 60) < 10 ? '0' : '') + (s % 60);
}

// ---------------- state machine ----------------
const SCREENS = ['title', 'select', 'levelup', 'pause', 'over', 'options', 'shop', 'runshop', 'journal', 'feats', 'totem'];
const HUD_STATES = ['play', 'levelup', 'pause', 'over', 'runshop'];
function setState(s) {
  App.state = s;
  // Held fire must survive pause/levelup round trips: no new pointerdown
  // event fires for a button that never got released.
  INPUT.fire = s === 'play' && INPUT.mdown;
  for (const id of SCREENS) {
    const el = $(id);
    if (el) el.classList.toggle('hidden', id !== s);
  }
  $('hud').classList.toggle('hidden', !(App.game && HUD_STATES.includes(s)));
  $('camphint').classList.toggle('hidden', s !== 'camp');
  if (s !== 'camp') closeDialog();
  if (s === 'title') refreshBestLine();
  refreshContinue();
  $('tapstart').classList.toggle('hidden', !(Touch.active && s === 'title' && !Touch.started));
}

function refreshBestLine() {
  const el = $('bestline');
  if (App.best.runs > 0) {
    el.classList.remove('hidden');
    el.textContent = 'BEST NIGHT ' + fmtTime(App.best.time) + '  |  MOST SLAIN ' + App.best.kills + '  |  DAWNS SEEN ' + App.best.dawns;
  } else {
    el.classList.add('hidden');
  }
}

// ---------------- character select ----------------
function buildSelect() {
  const row = $('selcards');
  row.innerHTML = '';
  const ids = Object.keys(DATA.characters);
  ids.forEach((id, i) => {
    const c = DATA.characters[id];
    const card = document.createElement('div');
    card.className = 'card';
    const pc = document.createElement('canvas');
    pc.width = 120; pc.height = 130;
    const g = pc.getContext('2d');
    SPR.draw(g, c.spr, 60, 62, 84);
    card.appendChild(pc);
    const name = document.createElement('div');
    name.className = 'cname'; name.textContent = c.name;
    const title = document.createElement('div');
    title.className = 'ctitle'; title.textContent = c.title.toUpperCase();
    const desc = document.createElement('div');
    desc.className = 'cdesc'; desc.textContent = c.desc + ' Starts with: ' + DATA.weapons[c.weapon].name + '.';
    const stats = document.createElement('div');
    stats.className = 'cstats'; stats.textContent = c.stats;
    const key = document.createElement('div');
    key.className = 'key'; key.textContent = 'PRESS ' + (i + 1);
    card.appendChild(name); card.appendChild(title); card.appendChild(desc); card.appendChild(stats); card.appendChild(key);
    card.addEventListener('click', () => { gesture(); AudioSys.play('click'); startRun(id); });
    row.appendChild(card);
  });
}

// ---------------- run flow ----------------
function startRun(charId) {
  // A fresh night replaces any night still on file, before anything else can
  // fail. Whatever was saved is not coming back after this line.
  clearSavedNight();
  App.char = charId;
  App.game = new Game(charId);
  buildSig = '';
  toastTimer = 0;
  AudioSys.init();
  AudioSys.setVolumes({ music: SETTINGS.musicVol, sfx: SETTINGS.sfxVol, voice: SETTINGS.voiceVol });
  AudioSys.startMusic();
  // Order matters: the game exists, then the run plans the night, then the
  // first room is built and entered, all before the first frame renders.
  if (!MBM_FIELD) {
    Run.reset();
    Run.begin(charId);
    Run.advance(null);
  }
  setState('play');
  App.game.bark('runstart');
}

// ---------------- the night in progress ----------------
// A night runs about nineteen minutes, and a closed tab used to cost every
// one of them. run.js writes a snapshot at each room boundary; these are the
// only places it is read, offered and thrown away. Every call is feature
// tested and every element optional, so a page without the button, or a
// browser that refuses storage, plays exactly as it did before.
function savedNight() {
  if (MBM_FIELD) return null;
  if (typeof Run === 'undefined' || !Run || typeof Run.peek !== 'function') return null;
  try { return Run.peek(); } catch (e) { return null; }
}

function clearSavedNight() {
  if (typeof Run === 'undefined' || !Run || typeof Run.clearSave !== 'function') return;
  try { Run.clearSave(); } catch (e) {}
  refreshContinue();
}

// Show or hide the two ways back into a night: the title screen and camp.
function refreshContinue() {
  const snap = savedNight();
  let label = null;
  if (snap && typeof Run.peekLabel === 'function') {
    try { label = Run.peekLabel(); } catch (e) { label = null; }
  }
  const btn = $('btncontinue');
  if (btn) btn.classList.toggle('hidden', !snap);
  const line = $('continueline');
  if (line) {
    line.classList.toggle('hidden', !(snap && label));
    if (label) line.textContent = label;
  }
  const camp = $('campcontinue');
  if (camp) camp.classList.toggle('hidden', !(snap && App.state === 'camp'));
}

// Walk back into the night on file: rebuild the scout, rebuild the plan, and
// enter the room they were about to enter. Any refusal on the way leaves the
// player exactly where they were standing, with the offer withdrawn.
function continueRun() {
  const snap = savedNight();
  if (!snap) { refreshContinue(); return; }
  const g = (typeof Game.restore === 'function') ? Game.restore(snap.game) : null;
  if (!g) { clearSavedNight(); return; }

  App.char = snap.charId;
  App.game = g;
  buildSig = '';
  toastTimer = 0;
  AudioSys.init();
  AudioSys.setVolumes({ music: SETTINGS.musicVol, sfx: SETTINGS.sfxVol, voice: SETTINGS.voiceVol });
  AudioSys.startMusic();

  Run.reset();
  let room = null;
  try { room = Run.resume(snap); } catch (e) { room = null; }
  if (!room) {
    App.game = null;
    Run.reset();
    AudioSys.stopMusic();
    clearSavedNight();
    return;
  }
  setState('play');
}

function enterCamp() {
  App.game = null;
  Run.reset();
  AudioSys.stopMusic();
  // Walking back into camp is the moment the pools are trued up: anything a
  // merit badge opened while you were out is in the level up rotation from
  // here on.
  refreshFeats();
  if (!App.camp) App.camp = new Camp();
  setState('camp');
}

// The one place the rest of the UI asks feats.js to reconcile DATA with the
// save. Feature tested, because a page with feats.js missing must still play.
// Merit badge is the player's word for it; every identifier here stays feat-
// shaped, because that is what the save and four other files call it.
function syncFeatPools() {
  if (typeof Feats === 'undefined' || !Feats) return;
  try { Feats.syncPools(META); } catch (e) {}
}

// Claim anything that has come true, then true up the pools. Called walking
// into camp and opening the merit badge board, because plenty of conditions
// finish without a run in between: buying ranks moves spent, knocking moves
// birdhouses. A card sitting at a hundred percent with no ribbon on it would
// be a bug the player can see. The run end ceremony in showOver does its own
// call so it can announce what landed.
function refreshFeats() {
  if (typeof Feats === 'undefined' || !Feats) return [];
  let earned = [];
  try { earned = Feats.check(META) || []; } catch (e) { earned = []; }
  syncFeatPools();
  if (earned.length) flagFeatFlash(earned);
  return earned;
}

function quitToTitle() {
  // A decided run (death or dawn animation in progress) must still credit
  // badges, counts and Brock's memory; only a live run may be forfeited.
  const g = App.game;
  if (g && g.phase !== 'play') {
    showOver(g.phase === 'dawn' || g.phase === 'win');
    return;
  }
  // Abandoning is a decision, and it ends the night: nothing left to continue.
  clearSavedNight();
  App.game = null;
  Run.reset();
  AudioSys.stopMusic();
  setState('title');
}

// ---------------- badge board ----------------
function openShop() {
  buildShop();
  setState('shop');
}
function buildShop() {
  $('shopbal').textContent = META.badges + ' BADGES';
  const rows = $('shoprows');
  rows.innerHTML = '';
  for (const id in METADEFS) {
    const def = METADEFS[id];
    const rank = META.rank(id);
    const cost = META.cost(id);
    const row = document.createElement('div');
    row.className = 'shoprow';
    const ic = document.createElement('canvas');
    ic.width = 88; ic.height = 88;
    ic.style.width = '44px'; ic.style.height = '44px';
    const g = ic.getContext('2d');
    g.scale(2, 2);
    SPR.icon(g, def.icon, 22, 22, 34);
    const info = document.createElement('div');
    info.className = 'shopinfo';
    const pips = [];
    for (let i = 0; i < def.ranks; i++) {
      pips.push('<div class="pip' + (i < rank ? ' on' : '') + '"></div>');
    }
    info.innerHTML =
      '<div class="shopname">' + def.name + ' <span class="shopper">' + def.per + '</span></div>' +
      '<div class="shopdesc">' + def.desc + '</div>' +
      '<div class="shoppips">' + pips.join('') + '</div>';
    const buyWrap = document.createElement('div');
    buyWrap.className = 'shopbuy';
    const btn = document.createElement('button');
    btn.className = 'btn small';
    if (cost == null) {
      btn.textContent = 'MAXED';
      btn.disabled = true;
    } else {
      btn.textContent = cost + ' BADGES';
      btn.disabled = META.badges < cost;
      btn.addEventListener('click', () => {
        gesture();
        if (META.buy(id)) {
          AudioSys.play('chest');
          buildShop();
        } else {
          AudioSys.play('hurt');
        }
      });
    }
    buyWrap.appendChild(btn);
    row.appendChild(ic); row.appendChild(info); row.appendChild(buyWrap);
    rows.appendChild(row);
  }
}

// ---------------- the store (in run) ----------------
// Three things a scout can buy mid night, paid for in Cookie Money.
const RUNSHOP = [
  { id: 'snack', name: 'TRAIL SNACK', cost: 12, icon: 'firstaid', desc: 'Stale granola and a lie about protein.', per: 'Heal 30 HP' },
  { id: 'patch', name: 'SEW A PATCH', cost: 22, icon: 'trailmix', desc: 'Sewn on right here, by feel, in the dark.', per: 'One badge, chosen for you' },
  { id: 'drop', name: 'SUPPLY DROP', cost: 30, icon: 'chest', desc: 'Whatever the quartermaster can spare.', per: 'One weapon, chosen for you' },
];

function patchPool(g) {
  const out = [];
  const held = Object.keys(g.passives).length;
  for (const id in DATA.passives) {
    const cur = g.passives[id] || 0;
    if (cur > 0 && cur < DATA.passives[id].max) out.push({ kind: 'passive', id, isNew: false, lvl: cur + 1 });
    else if (cur === 0 && held < DATA.PASSIVE_SLOTS) out.push({ kind: 'passive', id, isNew: true, lvl: 1 });
  }
  return out;
}

function gearPool(g) {
  const out = [];
  for (const w of g.weapons) {
    if (w.lvl < DATA.WEAPON_MAX) out.push({ kind: 'weapon', id: w.id, isNew: false, lvl: w.lvl + 1 });
  }
  if (g.weapons.length < DATA.WEAPON_SLOTS) {
    for (const id in DATA.weapons) {
      if (!g.weapons.find(w => w.id === id)) out.push({ kind: 'weapon', id, isNew: true, lvl: 1 });
    }
  }
  return out;
}

function shopHere(g) {
  if (!g || !g.room || !g.room.def || g.room.def.type !== 'shop') return false;
  if (g.phase !== 'play') return false;
  const p = g.player;
  return Math.hypot(p.x, p.y) <= 120;
}

function openRunShop() {
  if (!App.game) return;
  buildRunShop();
  setState('runshop');
}

function runshopAvailable(g, item) {
  if (item.id === 'snack') return g.player.hp < g.player.maxhp;
  if (item.id === 'patch') return patchPool(g).length > 0;
  return gearPool(g).length > 0;
}

function coinTag(n) {
  const wrap = document.createElement('span');
  wrap.style.display = 'inline-flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '6px';
  const c = document.createElement('canvas');
  c.width = 36; c.height = 36;
  c.style.width = '18px'; c.style.height = '18px';
  const g = c.getContext('2d');
  g.scale(2, 2);
  SPR.icon(g, 'coin', 9, 9, 17);
  const t = document.createElement('span');
  t.textContent = String(n);
  wrap.appendChild(c); wrap.appendChild(t);
  return wrap;
}

function buildRunShop() {
  const g = App.game;
  if (!g) return;
  $('rsbal').textContent = g.coins + ' COOKIE MONEY';
  const rows = $('rsrows');
  rows.innerHTML = '';
  for (const item of RUNSHOP) {
    const row = document.createElement('div');
    row.className = 'shoprow';
    const ic = document.createElement('canvas');
    ic.width = 88; ic.height = 88;
    ic.style.width = '44px'; ic.style.height = '44px';
    const ig = ic.getContext('2d');
    ig.scale(2, 2);
    SPR.icon(ig, item.icon, 22, 22, 34);
    const info = document.createElement('div');
    info.className = 'shopinfo';
    info.innerHTML =
      '<div class="shopname">' + item.name + ' <span class="shopper">' + item.per + '</span></div>' +
      '<div class="shopdesc">' + item.desc + '</div>';
    const buyWrap = document.createElement('div');
    buyWrap.className = 'shopbuy';
    const btn = document.createElement('button');
    btn.className = 'btn small';
    const stocked = runshopAvailable(g, item);
    if (!stocked) {
      btn.textContent = 'SOLD OUT';
      btn.disabled = true;
    } else {
      btn.appendChild(coinTag(item.cost));
      btn.disabled = g.coins < item.cost;
      btn.addEventListener('click', () => { gesture(); runshopBuy(item); });
    }
    buyWrap.appendChild(btn);
    row.appendChild(ic); row.appendChild(info); row.appendChild(buyWrap);
    rows.appendChild(row);
  }
}

function runshopBuy(item) {
  const g = App.game;
  if (!g || g.coins < item.cost || !runshopAvailable(g, item)) { AudioSys.play('hurt'); return; }
  if (item.id === 'snack') {
    const p = g.player;
    p.hp = Math.min(p.maxhp, p.hp + 30);
    g.spawnNum(p.x, p.y - 26, '+30', '#7ec87e', true);
    g.toast('TRAIL SNACK', '#7ec87e');
  } else {
    const pool = item.id === 'patch' ? patchPool(g) : gearPool(g);
    const c = pool[(Math.random() * pool.length) | 0];
    g.applyChoice(c);
    const info = g.choiceInfo(c);
    g.toast(info.name.toUpperCase() + ' LV ' + c.lvl, '#f4c542');
  }
  g.coins -= item.cost;
  AudioSys.play('chest');
  buildRunShop();
}

// ---------------- the field guide ----------------
let journalTab = 'cryptids';

function openJournal() {
  journalTab = 'cryptids';
  buildJournal();
  setState('journal');
}

function showJournalTab(tab) {
  journalTab = tab;
  buildJournal();
}

function bossRoll() {
  const out = [];
  const tiers = (typeof DATA !== 'undefined' && DATA.bossTiers) || {};
  for (const k of Object.keys(tiers)) {
    const list = tiers[k] || [];
    for (const def of list) if (def && out.indexOf(def) === -1) out.push(def);
  }
  return out;
}

// The codex has been written by several hands over the run system's life, so
// read every shape it has ever taken rather than trusting one.
function codexState(id) {
  const e = META.codex && META.codex[id];
  if (!e) return 'unknown';
  const killed = e === 'killed' || e.killed === true ||
    (typeof e.killed === 'number' && e.killed > 0) ||
    (typeof e.kills === 'number' && e.kills > 0);
  if (killed) return 'killed';
  return 'seen';
}

function buildJournal() {
  $('jtab_cryptids').classList.toggle('on', journalTab === 'cryptids');
  $('jtab_troop').classList.toggle('on', journalTab === 'troop');
  const body = $('jbody');
  body.innerHTML = '';
  if (journalTab === 'cryptids') body.appendChild(journalCryptids());
  else body.appendChild(journalTroop());
}

function journalCryptids() {
  const grid = document.createElement('div');
  grid.className = 'jgrid';
  for (const def of bossRoll()) {
    const state = codexState(def.id);
    const card = document.createElement('div');
    card.className = 'jcard' + (state === 'killed' ? ' killed' : '');
    if (state === 'unknown') {
      const q = document.createElement('div');
      q.className = 'junknown';
      q.textContent = '?';
      card.appendChild(q);
    } else {
      const c = document.createElement('canvas');
      c.width = 120; c.height = 120;
      const g = c.getContext('2d');
      if (state === 'seen') {
        SPR.draw(g, def.spr, 60, 62, 92, { tint: '#241b30' });
        g.fillStyle = '#4a5566';
        g.font = 'bold 34px Verdana, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(def.id || '?').charAt(0).toUpperCase(), 60, 62);
      } else {
        SPR.draw(g, def.spr, 60, 62, 92);
      }
      card.appendChild(c);
    }
    const name = document.createElement('div');
    name.className = 'jname';
    name.textContent = state === 'killed' ? def.name : (state === 'seen' ? 'SEEN, NOT NAMED' : 'UNRECORDED');
    card.appendChild(name);
    const sub = document.createElement('div');
    sub.className = 'jsub';
    const ep = (typeof BOSS_EPITHETS !== 'undefined' && BOSS_EPITHETS) ? BOSS_EPITHETS[def.id] : null;
    sub.textContent = state === 'killed' ? (ep || 'put down') : (state === 'seen' ? 'It got away.' : 'Nothing in the guide.');
    card.appendChild(sub);
    grid.appendChild(card);
  }
  return grid;
}

function journalTroop() {
  const wrap = document.createElement('div');
  wrap.className = 'jrows';
  const keys = Object.keys((META && META.journal) || {});
  for (let i = 0; i < 12; i++) {
    const row = document.createElement('div');
    row.className = 'jrow' + (keys[i] ? ' filled' : '');
    const n = document.createElement('div');
    n.className = 'jn';
    n.textContent = (i + 1) + '.';
    const w = document.createElement('div');
    w.className = 'jw';
    // A journal key is a find id. Show what the find is called when the table
    // knows it, and fall back to the raw key for anything it does not.
    const def = (typeof Finds !== 'undefined' && Finds && keys[i]) ? Finds.byId(keys[i]) : null;
    const label = def ? def.title : keys[i];
    w.textContent = keys[i] ? String(label).toUpperCase() : 'UNKNOWN SCOUT';
    row.appendChild(n); row.appendChild(w);
    wrap.appendChild(row);
  }
  return wrap;
}

// ---------------- merit badges ----------------
// One card per dare. The board is sorted by nearness, so the top row is always
// the three things you are closest to, and the cards you have claimed sit
// under them wearing a ribbon and their own emblem. The three hidden ones stay
// dark at the bottom and will not say what they are until the night they go
// gold.
//
// The player calls these merit badges, which is what the game is named after.
// The screen is MERIT BADGES; THE BADGE BOARD is the shop, up in openShop, and
// the two must never blur. Underneath, nothing was renamed: openFeats,
// buildFeats, refreshFeats, featFlash, the SCREENS entry 'feats' and every
// featsomething element id and class stay exactly as they were, because the
// save file and four other files already speak that language.
//
// featFlash carries the ids earned by the run that just ended, so the first
// time you open the board afterwards those cards pulse and then stop.
let featFlash = [];
const TAU_UI = Math.PI * 2;

// A padlock, drawn the way every other icon in this UI is drawn. Rewards that
// are not a weapon or a patch get this instead of a silhouette: open once the
// merit badge is claimed, shut while it is not.
function drawLockGlyph(g, x, y, size, open) {
  const u = size / 28;
  g.save();
  g.translate(x, y);
  g.scale(u, u);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = open ? '#f4c542' : '#4e5560';
  g.lineWidth = 2.6;
  g.beginPath();
  if (open) g.arc(-3.5, -5, 5.5, Math.PI, TAU_UI * 0.75);
  else g.arc(0, -5, 5.5, Math.PI, 0);
  g.stroke();
  if (!open) {
    g.beginPath();
    g.moveTo(-5.5, -5); g.lineTo(-5.5, -1);
    g.moveTo(5.5, -5); g.lineTo(5.5, -1);
    g.stroke();
  }
  g.fillStyle = open ? '#f4c542' : '#2b3341';
  g.strokeStyle = open ? '#8a6a1d' : '#4e5560';
  g.lineWidth = 1.6;
  g.beginPath(); g.roundRect(-9, -1, 18, 14, 3); g.fill(); g.stroke();
  g.fillStyle = open ? '#5a4410' : '#151a22';
  g.beginPath(); g.arc(0, 5.5, 2.2, 0, TAU_UI); g.fill();
  g.restore();
}

function openFeats() {
  refreshFeats();
  buildFeats();
  setState('feats');
}

// Anything that earns a merit badge outside the run flow (the camp birdhouse)
// tells the board about it here, so it flashes the next time the board opens.
function flagFeatFlash(ids) {
  if (!ids || !ids.length) return;
  for (const id of ids) if (featFlash.indexOf(id) === -1) featFlash.push(id);
}

function featRewardIcon(row) {
  const ic = document.createElement('canvas');
  ic.width = 80; ic.height = 80;
  const g = ic.getContext('2d');
  g.scale(2, 2);

  // An earned badge wears its own emblem, the same one the sash gets. Two
  // feature tests, because both halves arrive from other files: feats.js may
  // not know emblemFor, and sprites.js may not have painted this emblem yet.
  // SPR.get throws for a painter nobody wrote, which is the existence check,
  // and that throw is not allowed to escape a card.
  const name = (typeof Feats !== 'undefined' && Feats && Feats.emblemFor) ? Feats.emblemFor(row.id) : null;
  let painted = false;
  if (row.done && name) {
    try { SPR.get(name); SPR.draw(g, name, 20, 20, 36); painted = true; } catch (e) { painted = false; }
  }

  // Unearned is exactly what it always was, and so is an earned badge whose
  // emblem is missing: the faint reward silhouette, or a padlock. The shut
  // padlock is what keeps the three hidden ones secret until they go gold.
  if (!painted) {
    const rw = row.reward || {};
    const def = (typeof Feats !== 'undefined' && Feats) ? Feats.rewardDef(rw) : null;
    const paints = (rw.kind === 'weapon' || rw.kind === 'patch') && def && def.icon;
    if (paints) {
      // Unearned rewards are painted faint: you can see the shape of the thing
      // you are working toward without it looking like you already have it.
      g.globalAlpha = row.done ? 1 : 0.4;
      SPR.icon(g, def.icon, 20, 20, 34);
      g.globalAlpha = 1;
    } else {
      drawLockGlyph(g, 20, 20, 30, row.done);
    }
  }
  return ic;
}

function buildFeats() {
  const grid = $('featsgrid');
  grid.innerHTML = '';
  const rows = (typeof Feats !== 'undefined' && Feats) ? Feats.progressList(META) : [];
  let claimed = 0;
  for (const r of rows) if (r.done) claimed++;
  $('featsum').textContent = claimed + ' of ' + rows.length + ' claimed';

  for (const r of rows) {
    const card = document.createElement('div');
    card.className = 'featcard' +
      (r.done ? ' done' : '') +
      (r.dark ? ' dark' : '') +
      (featFlash.indexOf(r.id) !== -1 ? ' flash' : '');

    if (r.done) {
      const rib = document.createElement('div');
      rib.className = 'fribbon';
      rib.textContent = 'CLAIMED';
      card.appendChild(rib);
    }

    const head = document.createElement('div');
    head.className = 'fhead';
    head.appendChild(featRewardIcon(r));
    const titles = document.createElement('div');
    const nm = document.createElement('div');
    nm.className = 'fname';
    nm.textContent = r.name;
    const rw = document.createElement('div');
    rw.className = 'freward';
    rw.textContent = r.dark ? 'REWARD UNKNOWN' : ((r.reward && r.reward.label) || '');
    titles.appendChild(nm); titles.appendChild(rw);
    head.appendChild(titles);
    card.appendChild(head);

    const cond = document.createElement('div');
    cond.className = 'fcond';
    cond.textContent = r.line;
    card.appendChild(cond);

    const bar = document.createElement('div');
    bar.className = 'featbar';
    const fill = document.createElement('div');
    fill.className = 'featfill';
    fill.style.width = Math.round(Math.max(0, Math.min(1, r.p)) * 100) + '%';
    bar.appendChild(fill);
    card.appendChild(bar);

    const foot = document.createElement('div');
    foot.className = 'featfoot';
    const left = document.createElement('span');
    left.textContent = r.done ? 'EARNED' : r.text;
    const right = document.createElement('span');
    right.textContent = Math.round(Math.max(0, Math.min(1, r.p)) * 100) + '%';
    foot.appendChild(left); foot.appendChild(right);
    card.appendChild(foot);

    grid.appendChild(card);
  }
  // The flash is a one time greeting, not a permanent state.
  featFlash = [];
}

// ---------------- the tally post ----------------
// Six blazes cut into the post with a hatchet. Each one is a promise the night
// will be worse and a percentage on every badge it banks. Only the ids are
// stored, and the badge multiplier is applied in META.credit. The screen id
// stays 'totem' so old saves and state names keep working.
function openTotem() {
  buildTotem();
  setState('totem');
}

function buildTotem() {
  const rows = $('carverows');
  rows.innerHTML = '';
  if (typeof Totem === 'undefined' || !Totem) return;
  const mult = Totem.badgeMult(META);
  const n = Totem.active(META).length;
  $('totemmult').textContent = mult.toFixed(2) + 'x BADGES';
  $('totemsub').textContent =
    n === 0 ? 'Nothing cut. The night is only the night.' :
    n >= Totem.list.length ? 'Every blaze cut. Whatever is out there has been fully briefed.' :
    n + ' of ' + Totem.list.length + ' cut. The woods have been told.';

  for (const c of Totem.list) {
    const on = Totem.on(c.id, META);
    const row = document.createElement('div');
    row.className = 'carverow' + (on ? ' on' : '');
    const notch = document.createElement('div');
    notch.className = 'carvenotch';
    const info = document.createElement('div');
    info.className = 'carveinfo';
    const nm = document.createElement('div');
    nm.className = 'carvename'; nm.textContent = c.name;
    const ds = document.createElement('div');
    ds.className = 'carvedesc'; ds.textContent = c.desc;
    const nt = document.createElement('div');
    nt.className = 'carvenote'; nt.textContent = c.note;
    info.appendChild(nm); info.appendChild(ds); info.appendChild(nt);
    const pct = document.createElement('div');
    pct.className = 'carvepct'; pct.textContent = '+' + c.bonus + '%';
    const wrap = document.createElement('div');
    wrap.className = 'shopbuy';
    const btn = document.createElement('button');
    btn.className = 'btn small';
    btn.textContent = on ? 'CUT' : 'SMOOTH';
    btn.addEventListener('click', () => {
      gesture();
      Totem.toggle(c.id, META);
      AudioSys.play(Totem.on(c.id, META) ? 'chest' : 'click');
      buildTotem();
    });
    wrap.appendChild(btn);
    row.appendChild(notch); row.appendChild(info); row.appendChild(pct); row.appendChild(wrap);
    rows.appendChild(row);
  }
}

// ---------------- dialogue ----------------
// The portrait card at the dialog's left edge. Everything here is feature
// tested: with portraits.js absent, or a speaker nobody painted, the card
// stays hidden and the dialog is exactly the plain box it always was.
let dlgPortId = null;
function updateDialogPortrait(name, expression) {
  const card = $('dlgport');
  if (!card) return;
  const have = typeof Portraits !== 'undefined' && Portraits;
  const id = have ? Portraits.idFor(name) : null;
  const src = id && Portraits.has(id) ? Portraits.get(id, expression || 'neutral') : null;
  if (!src) {
    card.classList.add('hidden');
    card.classList.remove('on');
    $('dialog').classList.remove('withport');
    dlgPortId = null;
    return;
  }
  const cv2 = $('dlgportcv');
  const g = cv2.getContext('2d');
  g.clearRect(0, 0, cv2.width, cv2.height);
  g.drawImage(src, 0, 0, cv2.width, cv2.height);
  $('dlgportname').textContent = name;
  $('dialog').classList.add('withport');
  card.classList.remove('hidden');
  // A new speaker slides in; an expression swap on the same speaker is
  // instant, per line, like the text.
  if (dlgPortId !== id) {
    dlgPortId = id;
    card.classList.remove('on');
    void card.offsetWidth;
    card.classList.add('on');
  } else {
    card.classList.add('on');
  }
}

// The one question every piece of spoken text asks before it draws. Kept on
// window so the canvas side of the game (barks, the camp's subtitle line) can
// ask it too without reaching into the settings object itself.
function subtitlesOn() {
  return !(typeof SETTINGS !== 'undefined' && SETTINGS && SETTINGS.subtitles === false);
}
window.subtitlesOn = subtitlesOn;

let dlgTimer = null;
function showDialog(text, speaker, expression) {
  // Subtitles off means no written lines anywhere, so the box itself never
  // opens: an empty plaque would be worse than none. Voice, where a line has
  // any, is untouched and still plays.
  if (!subtitlesOn()) {
    AudioSys.play('click');
    return;
  }
  App.dialogOpen = true;
  $('dialog').classList.remove('hidden');
  const name = speaker || 'SCOUTMASTER BROCK';
  $('dlgname').textContent = name;
  updateDialogPortrait(name, expression);
  const el = $('dlgtext');
  el.textContent = '';
  let i = 0;
  if (dlgTimer) clearInterval(dlgTimer);
  dlgTimer = setInterval(() => {
    i += 2;
    el.textContent = text.slice(0, i);
    if (i >= text.length) { clearInterval(dlgTimer); dlgTimer = null; }
  }, 16);
  AudioSys.play('click');
}
function closeDialog() {
  if (!App.dialogOpen) return;
  App.dialogOpen = false;
  if (dlgTimer) { clearInterval(dlgTimer); dlgTimer = null; }
  $('dialog').classList.add('hidden');
  dlgPortId = null;
  const card = $('dlgport');
  if (card) card.classList.remove('on');
}

function showOver(won) {
  const g = App.game;

  // Died or saw the sun, either way the night is spent. game.js drops the
  // snapshot the moment it decides; this is the belt to that pair of braces.
  clearSavedNight();

  // Cookie Money is spent or it is turned in. Either way it leaves the run as
  // badges before the camp counts anything, and only ever once.
  if (!g._cashedOut) {
    g._cashedOut = true;
    const rate = (DATA.COINS && DATA.COINS.convert) || 0;
    const coins = Math.max(0, Math.floor(g.coins || 0));
    const paid = coins * rate;
    g.badges += paid;
    g.coins = 0;
    g._turnedIn = { coins, paid };
  }
  const turned = g._turnedIn || { coins: 0, paid: 0 };

  App.best.runs++;
  App.best.time = Math.max(App.best.time, Math.floor(g.time));
  App.best.kills = Math.max(App.best.kills, g.kills);
  if (won) App.best.dawns++;
  saveBest();
  META.credit(g, won);
  if (typeof Roster !== 'undefined' && Roster && typeof Roster.checkUnlocks === 'function') Roster.checkUnlocks();

  // The claim ceremony. Merit badges are checked once, here, after the night's
  // numbers are banked, so a badge about lifetime badges can land on the run
  // that earned them. Anything new is announced and flagged for the board.
  let earned = [];
  if (typeof Feats !== 'undefined' && Feats) {
    try { earned = Feats.check(META) || []; } catch (e) { earned = []; }
    syncFeatPools();
  }
  featFlash = earned.slice();
  const fe = $('overfeats');
  if (fe) {
    if (earned.length) {
      const names = earned.map(id => {
        const d = Feats.byId(id);
        return 'MERIT BADGE EARNED: ' + String((d && d.name) || id).toUpperCase();
      });
      fe.textContent = '';
      names.forEach((t, i) => {
        if (i) fe.appendChild(document.createElement('br'));
        fe.appendChild(document.createTextNode(t));
      });
      fe.classList.remove('hidden');
      AudioSys.play('levelup');
    } else {
      fe.textContent = '';
      fe.classList.add('hidden');
    }
  }
  AudioSys.stopMusic();

  const t = $('overtitle');
  t.textContent = won ? 'DAWN' : 'DEVOURED';
  t.className = won ? 'win' : 'lose';
  $('oversub').textContent = won
    ? 'Troop 13 survives. Old Nobody does not.'
    : 'The forest keeps score. The camp keeps your badges.';
  const grid = $('overstats');
  grid.innerHTML = '';
  const cr = META.lastCredit || { base: g.badges, paid: g.badges, mult: 1, bonus: 0 };
  const lines = [
    ['Survived', fmtTime(g.time)],
    ['Reached', 'Act ' + (g.act || 1) + ', room ' + ((g.roomIdx || 0) + 1)],
    ['Rank reached', 'LV ' + g.level],
    ['Critters slain', g.kills],
    ['Cookie Money turned in', turned.coins + ' for +' + turned.paid + ' badges'],
  ];
  if (cr.mult > 1) {
    lines.push(['Badges earned', '+' + cr.base]);
    lines.push(['Deeper Nights ' + cr.mult.toFixed(2) + 'x', '+' + cr.bonus]);
  }
  lines.push(['Badges banked', '+' + cr.paid]);
  lines.push(['Camp balance', META.badges]);
  lines.forEach(([k, v]) => {
    const ke = document.createElement('div'); ke.className = 'k'; ke.textContent = k;
    const ve = document.createElement('div'); ve.className = 'v'; ve.textContent = v;
    grid.appendChild(ke); grid.appendChild(ve);
  });
  setState('over');
}

// ---------------- level up ----------------
// A locked fight banks rank ups: three cards in the middle of a wave is a
// freeze frame nobody asked for. A cleared room, a shop, a rest stop or the
// old open field all resolve them the moment they land.
function banksLevelups(g) {
  const r = g && g.room;
  return !!(r && r.lock === 'clear' && r.state === 'active');
}

function catOf(c) {
  if (c.kind === 'weapon') return 'gear';
  if (c.kind === 'passive') return 'patch';
  return 'supply';
}

function chipsOf(c) {
  if (c.kind === 'weapon') {
    const def = DATA.weapons[c.id];
    const mode = def.kind === 'manual' ? 'AIMED' : 'AUTO';
    return c.isNew ? ['NEW GEAR', mode] : ['GEAR', 'LV ' + c.lvl];
  }
  if (c.kind === 'passive') return c.isNew ? ['NEW PATCH'] : ['PATCH', 'LV ' + c.lvl];
  return ['SUPPLY'];
}

// Only speaks up when the choice would eat one of the last free slots.
function slotHint(g, c) {
  if (c.kind === 'weapon' && c.isNew) {
    const used = g.weapons.length, max = DATA.WEAPON_SLOTS;
    if (used >= max - 1) return used + ' / ' + max + ' Gear slots used';
  }
  if (c.kind === 'passive' && c.isNew) {
    const used = Object.keys(g.passives).length, max = DATA.PASSIVE_SLOTS;
    if (used >= max - 1) return used + ' / ' + max + ' Patch slots used';
  }
  return null;
}

function showLevelup() {
  const g = App.game;
  g.pendingLevelups--;
  App.choices = g.levelPool(3);
  if (App.choices.length === 0) {
    // nothing to offer: tiny heal instead
    g.player.hp = Math.min(g.player.maxhp, g.player.hp + 15);
    if (g.pendingLevelups <= 0) { setState('play'); return; }
    return showLevelup();
  }
  AudioSys.play('levelup');
  const row = $('lucards');
  row.innerHTML = '';
  App.choices.forEach((c, i) => {
    const info = g.choiceInfo(c);
    const cat = CAT[catOf(c)];
    const card = document.createElement('div');
    card.className = 'card cat';
    card.style.setProperty('--cat', cat.color);
    const band = document.createElement('div');
    band.className = 'band';
    card.appendChild(band);
    const chips = document.createElement('div');
    chips.className = 'chips';
    chipsOf(c).forEach((text, ci) => {
      const chip = document.createElement('div');
      chip.className = 'chip ' + (ci === 0 ? 'solid' : 'ghost');
      chip.textContent = text;
      chips.appendChild(chip);
    });
    card.appendChild(chips);
    const ic = document.createElement('canvas');
    ic.width = 56; ic.height = 56;
    SPR.icon(ic.getContext('2d'), info.icon, 28, 28, 44);
    card.appendChild(ic);
    const hint = slotHint(g, c);
    if (hint) {
      const sh = document.createElement('div');
      sh.className = 'slothint';
      sh.textContent = hint;
      card.appendChild(sh);
    }
    const name = document.createElement('div');
    name.className = 'cname'; name.textContent = info.name;
    const desc = document.createElement('div');
    desc.className = 'cdesc'; desc.textContent = info.desc;
    const key = document.createElement('div');
    key.className = 'key'; key.textContent = 'PRESS ' + (i + 1);
    card.appendChild(name); card.appendChild(desc); card.appendChild(key);
    card.addEventListener('click', () => { gesture(); chooseLevelup(i); });
    row.appendChild(card);
  });
  setState('levelup');
}

function chooseLevelup(i) {
  const g = App.game;
  if (!g || App.state !== 'levelup' || !App.choices[i]) return;
  AudioSys.play('click');
  g.applyChoice(App.choices[i]);
  if (g.pendingLevelups > 0) showLevelup();
  else setState('play');
}

// ---------------- pause ----------------
// One line of numbers per thing you carry, computed off the live stats rather
// than the tuning table, so a level 4 slingshot reads as a level 4 slingshot.
function weaponStat(g, w) {
  const st = w.stats || {};
  const out = [];
  if (st.dmg) out.push('DMG ' + Math.round(st.dmg * g.dmgMul));
  else if (st.dps) out.push('DPS ' + Math.round(st.dps * g.dmgMul));
  if (st.count > 1) out.push('x' + st.count);
  else if (st.radius) out.push('R ' + Math.round(st.radius));
  if (st.cd) out.push('CD ' + (st.cd * (st.cdFactor || 1) * g.cdMul).toFixed(2) + 's');
  else if (st.tick) out.push('EVERY ' + st.tick.toFixed(2) + 's');
  else if (st.hitCd) out.push('HIT ' + st.hitCd.toFixed(2) + 's');
  return out.join('  ');
}

function pipRow(cat, lvl, max) {
  const pips = document.createElement('div');
  pips.className = 'pips';
  for (let i = 0; i < max; i++) {
    const pip = document.createElement('div');
    pip.className = 'pip ' + CAT[cat].pip + (i < lvl ? ' on' : '');
    pips.appendChild(pip);
  }
  return pips;
}

function pauseEntry(cat, icon, name, lvl, max, stat) {
  const row = document.createElement('div');
  row.className = 'pentry';
  const c = document.createElement('canvas');
  c.width = 52; c.height = 52;
  const g = c.getContext('2d');
  g.scale(2, 2);
  SPR.icon(g, icon, 13, 13, 22);
  row.appendChild(c);
  const body = document.createElement('div');
  const nm = document.createElement('div');
  nm.className = 'pename'; nm.textContent = name;
  body.appendChild(nm);
  const st = document.createElement('div');
  st.className = 'pstat'; st.textContent = stat || '';
  body.appendChild(st);
  body.appendChild(pipRow(cat, lvl, max));
  row.appendChild(body);
  return row;
}

function pauseColumn(cat, entries) {
  const col = document.createElement('div');
  col.className = 'pcol';
  col.style.setProperty('--cat', CAT[cat].color);
  const label = document.createElement('div');
  label.className = 'pclabel';
  label.textContent = CAT[cat].label;
  col.appendChild(label);
  if (!entries.length) {
    const none = document.createElement('div');
    none.className = 'pempty';
    none.textContent = 'nothing yet';
    col.appendChild(none);
  }
  for (const e of entries) col.appendChild(e);
  return col;
}

function buildPauseCols(g) {
  const wrap = $('pbuild');
  wrap.innerHTML = '';

  const gear = g.weapons.map(w => {
    const def = DATA.weapons[w.id];
    return pauseEntry('gear', def.icon, def.name, w.lvl, DATA.WEAPON_MAX, weaponStat(g, w));
  });
  const patches = Object.keys(g.passives).map(id => {
    const def = DATA.passives[id];
    return pauseEntry('patch', def.icon, def.name, g.passives[id], def.max, def.per);
  });
  const d = (g.char && g.char.dodge) || null;
  const charges = (d && d.charges) || 1;
  const skills = [pauseEntry(
    'skill', 'dodge', (d && d.name) || 'Dodge', g.dodgeReady ? g.dodgeReady() : charges, charges,
    d ? ('CD ' + d.cd.toFixed(2) + 's  IFRAME ' + d.iframe.toFixed(2) + 's') : ''
  )];
  // The active skill, when the run has one, reads the same way the dodge does:
  // one pip, lit when it can fire, and its cooldown on the stat line. The
  // number comes from the table when the table carries one, and from the live
  // sweep when it does not, so the line is never blank and never invented.
  const sk = skillOf(g);
  if (sk) {
    const sdef = (typeof DATA !== 'undefined' && DATA && DATA.skills) ? DATA.skills[sk.id] : null;
    const cd = (sdef && typeof sdef.cd === 'number' && sdef.cd > 0) ? sdef.cd : null;
    const ready = skillReadyOf(g);
    const pct = Math.round(skillFracOf(g) * 100) + '%';
    const stat = cd != null
      ? ('CD ' + cd.toFixed(2) + 's  ' + (ready ? 'READY' : pct))
      : (ready ? 'READY' : pct + ' CHARGED');
    skills.push(pauseEntry('skill', sk.icon, sk.name, ready, 1, stat));
  }

  wrap.appendChild(pauseColumn('gear', gear));
  wrap.appendChild(pauseColumn('patch', patches));
  wrap.appendChild(pauseColumn('skill', skills));
}

function showPause() {
  const g = App.game;
  $('phead').innerHTML =
    '<b style="color:#e8e0cc">' + g.char.name + '</b>, ' + runLabel(g) +
    ' &middot; ' + fmtTime(g.time) + ' into the night &middot; ' + g.coins + ' Cookie Money';
  buildPauseCols(g);
  const grid = $('pstats');
  grid.innerHTML = '';
  g.statsSummary().forEach(([k, v]) => {
    const ke = document.createElement('div'); ke.className = 'k'; ke.textContent = k;
    const ve = document.createElement('div'); ve.className = 'v'; ve.textContent = v;
    grid.appendChild(ke); grid.appendChild(ve);
  });
  $('btnmute').textContent = AudioSys.muted ? 'UNMUTE' : 'MUTE';
  setState('pause');
}

// ---------------- options ----------------
// ---------------- camp transfer ----------------
// Progress lives in one browser, so a phone and a laptop are two camps that
// have never met. The code in this panel is the paperwork between them.
// meta.js owns the packing; this owns the buttons and the plain words.
let tfPending = null;

function transferOn() {
  return typeof Transfer !== 'undefined' && Transfer && typeof Transfer.make === 'function';
}

function tfSay(text, kind) {
  const el = $('tfmsg');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('hidden', !text);
  el.classList.toggle('bad', kind === 'bad');
  el.classList.toggle('good', kind === 'good');
}

function tfShowConfirm(lines) {
  const box = $('tfconfirm');
  const sum = $('tfsummary');
  if (!box || !sum) return;
  sum.textContent = '';
  const head = document.createElement('div');
  head.textContent = 'That code carries:';
  sum.appendChild(head);
  for (const line of lines || []) {
    const d = document.createElement('div');
    d.textContent = '  ' + line;
    sum.appendChild(d);
  }
  box.classList.remove('hidden');
}

function tfReset() {
  tfPending = null;
  const box = $('tfconfirm');
  if (box) box.classList.add('hidden');
  tfSay('', null);
}

// Called every time the panel opens, so the code always describes the camp as
// it stands right now rather than as it stood when the page loaded.
function buildTransfer() {
  const block = $('transfer');
  if (!block) return;
  if (!transferOn()) { block.classList.add('hidden'); return; }
  block.classList.remove('hidden');
  tfReset();
  const box = $('tfcode');
  if (box) {
    let code = '';
    try { code = Transfer.make(App.best); } catch (e) { code = ''; }
    box.value = code;
  }
  const inp = $('tfin');
  if (inp) inp.value = '';
}

function tfCopy() {
  const box = $('tfcode');
  if (!box || !box.value) return;
  let done = false;
  try {
    box.focus();
    box.select();
    box.setSelectionRange(0, box.value.length);
    done = document.execCommand && document.execCommand('copy');
  } catch (e) { done = false; }
  if (!done && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(box.value).then(
      () => tfSay('Code copied. Paste it into the game on the other device.', 'good'),
      () => tfSay('Could not reach the clipboard. Select the code and copy it by hand.', 'bad')
    );
    return;
  }
  if (done) tfSay('Code copied. Paste it into the game on the other device.', 'good');
  else tfSay('Could not reach the clipboard. Select the code and copy it by hand.', 'bad');
}

// Read only: nothing is written until the player agrees to the summary.
function tfRead() {
  if (!transferOn()) return;
  const inp = $('tfin');
  const res = Transfer.read(inp ? inp.value : '');
  if (!res || !res.ok) {
    tfReset();
    tfSay((res && res.why) || 'That code could not be read.', 'bad');
    AudioSys.play('click');
    return;
  }
  tfPending = res.data;
  tfSay('', null);
  tfShowConfirm(res.lines);
  AudioSys.play('click');
}

function tfApply() {
  if (!tfPending || !transferOn()) return;
  let best = null;
  // Hand the local records in explicitly. Transfer merges best-of, so an
  // arriving camp can raise a record but never pull one back down.
  try { best = Transfer.apply(tfPending, App.best); } catch (e) { best = null; }
  if (!best) { tfReset(); tfSay('That camp could not be brought in.', 'bad'); return; }
  Object.assign(App.best, best);
  saveBest();
  // The camp scene is built from the save, and the save just changed.
  App.camp = null;
  // A night in progress belonged to the camp that was here a moment ago.
  clearSavedNight();
  syncFeatPools();
  refreshBestLine();
  // The panel already showed the full list and the player agreed to it. The
  // toast is the receipt, so it takes the headline and stops.
  const lines = Transfer.describe(tfPending);
  tfReset();
  buildTransfer();
  tfSay('Camp restored: ' + lines.slice(0, 3).join(', ') + '.', 'good');
  AudioSys.play('levelup');
}

function showOptions(from) {
  App.optionsFrom = from;
  buildTransfer();
  $('optmusic').value = Math.round(SETTINGS.musicVol * 100);
  $('optsfx').value = Math.round(SETTINGS.sfxVol * 100);
  $('optvoice').value = Math.round(SETTINGS.voiceVol * 100);
  $('optsubs').checked = SETTINGS.subtitles;
  $('optshake').checked = SETTINGS.shake;
  $('optnums').checked = SETTINGS.dmgNums;
  setState('options');
}
function closeOptions() {
  saveSettings();
  if (App.optionsFrom === 'pause' && App.game) setState('pause');
  else setState('title');
}

// A slider dragged across its track fires input every few pixels. One
// audition every 120ms, on the bus the slider actually controls.
let auditionT = 0;
function audition(bus) {
  const now = performance.now();
  if (now - auditionT < 120) return;
  auditionT = now;
  if (bus === 'sfx') AudioSys.play('click');
  else if (bus === 'voice' && typeof Voice !== 'undefined' && Voice && Voice.available) {
    Voice.speak(META.selected, 'Check.', null);
  }
}

// ---------------- HUD ----------------
let buildSig = '';
let toastTimer = 0;

function runLabel(g) {
  if (MBM_FIELD || !Run.active || !g.room) return fmtTime(g.time);
  const total = Run.roomsInAct(g.act) || 1;
  return 'ACT ' + g.act + '  ROOM ' + ((g.roomIdx || 0) + 1) + '/' + total;
}

function updateHUD() {
  const g = App.game;
  if (!g) return;
  const p = g.player;
  $('xpfill').style.width = Math.min(100, (g.xp / g.xpNext) * 100) + '%';
  $('lvl').textContent = 'LV ' + g.level;
  $('hpfill').style.width = Math.max(0, (p.hp / p.maxhp) * 100) + '%';
  $('hptext').textContent = Math.ceil(p.hp) + ' / ' + p.maxhp;
  const rooms = !MBM_FIELD && Run.active && !!g.room;
  const timer = $('timer');
  timer.textContent = runLabel(g);
  timer.classList.toggle('room', rooms);
  $('kills').textContent = g.kills + ' SLAIN';
  $('coinval').textContent = g.coins;

  const banked = g.pendingLevelups > 0 && banksLevelups(g);
  const lupip = $('lupip');
  lupip.classList.toggle('hidden', !banked);
  if (banked) lupip.textContent = 'LV UP x' + g.pendingLevelups;

  $('shophint').classList.toggle('hidden', !shopHere(g));

  updateDodgePips(g);

  const boss = g.activeBoss;
  const bb = $('bossbar');
  if (boss) {
    bb.classList.remove('hidden');
    $('bossname').textContent = boss.name;
    $('bossfill').style.width = Math.max(0, (boss.hp / boss.maxhp) * 100) + '%';
  } else {
    bb.classList.add('hidden');
  }

  // The skill id is part of the signature: the SKILLS group grows a second
  // slot when the run has a skill, so a rebuild has to happen the moment that
  // changes, or the group would be a run behind for the rest of the night.
  const sk = skillOf(g);
  const sig = g.weapons.map(w => w.id + w.lvl).join(',') + '|' +
    Object.keys(g.passives).map(id => id + g.passives[id]).join(',') + '|' + (sk ? sk.id : '');
  if (sig !== buildSig) {
    buildSig = sig;
    buildGroups(g);
  }
  updateSkillPips(g);
  updateActiveSkill(g);
}

function makeSlot(cat, icon, lvl, max) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  const c = document.createElement('canvas');
  c.width = 56; c.height = 56;
  SPR.icon(c.getContext('2d'), icon, 28, 28, 44);
  slot.appendChild(c);
  slot.appendChild(pipRow(cat, lvl, max));
  return slot;
}

function emptySlot() {
  const slot = document.createElement('div');
  slot.className = 'slot empty';
  return slot;
}

function makeGroup(cat, fill) {
  const group = document.createElement('div');
  group.className = 'bgroup';
  group.style.setProperty('--cat', CAT[cat].color);
  const label = document.createElement('div');
  label.className = 'glabel';
  label.textContent = CAT[cat].label;
  group.appendChild(label);
  const slots = document.createElement('div');
  slots.className = 'gslots';
  fill(slots);
  group.appendChild(slots);
  return group;
}

function buildGroups(g) {
  const row = $('buildrow');
  row.innerHTML = '';

  row.appendChild(makeGroup('gear', slots => {
    for (const w of g.weapons) slots.appendChild(makeSlot('gear', DATA.weapons[w.id].icon, w.lvl, DATA.WEAPON_MAX));
    for (let i = g.weapons.length; i < DATA.WEAPON_SLOTS; i++) slots.appendChild(emptySlot());
  }));

  row.appendChild(makeGroup('patch', slots => {
    const ids = Object.keys(g.passives);
    for (const id of ids) slots.appendChild(makeSlot('patch', DATA.passives[id].icon, g.passives[id], DATA.passives[id].max));
    for (let i = ids.length; i < DATA.PASSIVE_SLOTS; i++) slots.appendChild(emptySlot());
  }));

  row.appendChild(makeGroup('skill', slots => {
    const d = (g.char && g.char.dodge) || null;
    const charges = (d && d.charges) || 1;
    const slot = makeSlot('skill', 'dodge', 0, charges);
    slot.lastChild.id = 'skillpips';
    slots.appendChild(slot);
    const sk = skillOf(g);
    if (sk) slots.appendChild(makeSkillSlot(sk));
  }));
}

// The active skill's slot: the dodge's neighbour in the SKILLS group, built
// only for a run that actually has a skill. Everything that moves on it is
// written by updateActiveSkill, from the per frame path.
function makeSkillSlot(info) {
  const slot = document.createElement('div');
  slot.className = 'slot skillslot';
  slot.id = 'activeskill';
  const c = document.createElement('canvas');
  c.width = 56; c.height = 56;
  try { SPR.icon(c.getContext('2d'), info.icon, 28, 28, 44); } catch (e) {}
  slot.appendChild(c);
  const sweep = document.createElement('div');
  sweep.className = 'sksweep';
  sweep.id = 'skillsweep';
  slot.appendChild(sweep);
  // On a phone the button under the right thumb is the affordance, so a
  // keyboard hint there would be taking up room to tell a lie.
  if (!(typeof Touch !== 'undefined' && Touch && Touch.active)) {
    const key = document.createElement('div');
    key.className = 'skkey';
    key.textContent = 'Q';
    slot.appendChild(key);
  }
  return slot;
}

// The dodge pips are the only HUD state that moves every frame, so they are
// written directly instead of through the build signature.
function updateSkillPips(g) {
  const pips = $('skillpips');
  if (!pips) return;
  const ready = g.dodgeReady ? g.dodgeReady() : 0;
  for (let i = 0; i < pips.childElementCount; i++) {
    pips.children[i].classList.toggle('on', i < ready);
  }
}

// The cooldown sweep is a conic gradient rewritten as it moves: the dark wedge
// covers what is still recharging and retreats clockwise as the skill fills,
// so ready is a clean, full colour icon under a soft glow. Written from here
// rather than from buildGroups, which only runs when the build changes, and
// guarded for the slot being absent, because a run with no skill never builds
// one. The gradient string is only rebuilt on a whole degree of change.
function updateActiveSkill(g) {
  const slot = $('activeskill');
  if (!slot) return;
  slot.classList.toggle('ready', skillReadyOf(g) > 0);
  const sweep = $('skillsweep');
  if (!sweep) return;
  const deg = Math.round(skillFracOf(g) * 360);
  if (sweep._deg === deg) return;
  sweep._deg = deg;
  sweep.style.background = deg >= 360 ? 'none' :
    'conic-gradient(from 0deg, rgba(0,0,0,0) 0deg, rgba(0,0,0,0) ' + deg + 'deg, ' +
    'rgba(6,8,11,0.78) ' + deg + 'deg, rgba(6,8,11,0.78) 360deg)';
}

function updateDodgePips(g) {
  const wrap = $('dodgepips');
  const d = (g.char && g.char.dodge) || null;
  const charges = (d && d.charges) || 1;
  if (wrap.childElementCount !== charges) {
    wrap.innerHTML = '';
    for (let i = 0; i < charges; i++) {
      const cell = document.createElement('div');
      cell.className = 'dpip';
      const fill = document.createElement('div');
      fill.className = 'dfill';
      cell.appendChild(fill);
      wrap.appendChild(cell);
    }
  }
  const ready = g.dodgeReady ? g.dodgeReady() : charges;
  const frac = g.dodgeCdFrac ? g.dodgeCdFrac() : 1;
  for (let i = 0; i < wrap.childElementCount; i++) {
    const cell = wrap.children[i];
    const fill = cell.firstChild;
    const on = i < ready;
    cell.classList.toggle('on', on);
    fill.style.height = on ? '100%' : (i === ready ? Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%' : '0%');
  }
}

function drainToasts(dt) {
  const g = App.game;
  const el = $('toast');
  toastTimer -= dt;
  if (toastTimer <= 0) {
    if (g && g.toasts.length) {
      const t = g.toasts.shift();
      el.textContent = t.text;
      el.style.color = t.color;
      el.style.opacity = 1;
      toastTimer = 2.2;
    } else {
      el.style.opacity = 0;
    }
  } else if (toastTimer < 0.4) {
    el.style.opacity = toastTimer / 0.4;
  }
}

// ---------------- the skill button, on touch ----------------
// js/touch.js owns the two sticks and the dodge button, and is frozen this
// wave, so the skill's button is placed, painted and captured from here
// without touching a line of it. Touch.layout() is its read only door.
//
// The geometry continues dodgeAnchor's reasoning one step further out. That
// function puts the dodge button up and inboard of the aim stick along a 3-4-5
// diagonal, so it can never sit under the aiming thumb. This button takes the
// same step again, from the dodge button, at a distance of
// buttonR + grab + SK_R + grab: far enough that the two drawn rings never
// touch, and far enough that neither button's capture circle reaches into the
// other, so a thumb going for one can never fire the other. A short screen
// flattens the climb, and the gap is then bought back sideways rather than
// given up, exactly the way dodgeAnchor buys it back.
const SK_R = 32;      // drawn ring radius
const SK_EDGE = 16;   // mirrors touch.js EDGE: nothing draws closer to a rim
let skillFlash = 0;

function clampUI(v, lo, hi) {
  if (hi < lo) return (lo + hi) / 2;
  return v < lo ? lo : (v > hi ? hi : v);
}

// Slide x along the row y sits on until it is `want` from `from`, heading in
// `dir` (-1 left, +1 right). Returns x untouched when there is already room,
// or when the screen is too tight for the clamp to give it.
function pushClear(x, y, from, want, dir, minX, maxX) {
  const dy = from.y - y;
  if (Math.hypot(from.x - x, dy) >= want) return x;
  const across = Math.sqrt(Math.max(0, want * want - dy * dy));
  return clampUI(from.x + dir * across, minX, maxX);
}

function skillAnchor() {
  if (typeof Touch === 'undefined' || !Touch || typeof Touch.layout !== 'function') return null;
  const L = Touch.layout();
  const w = window.innerWidth, h = window.innerHeight;
  const minX = SK_R + SK_EDGE, maxX = w - SK_R - SK_EDGE;
  const minY = SK_R + SK_EDGE, maxY = h - SK_R - SK_EDGE;
  const b = L.dodge;
  // Inboard is away from whichever edge the dodge button is leaning on.
  const dir = b.x > w / 2 ? -1 : 1;
  // Both capture circles end up strictly apart rather than exactly tangent:
  // the two grabs put them edge to edge, the four buys a little daylight.
  const want = L.buttonR + L.grab + SK_R + L.grab + 4;
  const stickWant = L.radius + SK_R + 6;
  // 0.6 and 0.8 are a whole 3-4-5 triangle, so the offset is exactly `want`
  // long and the gap the button keeps is the gap it promises.
  let x = clampUI(b.x + dir * want * 0.6, minX, maxX);
  const y = clampUI(b.y - want * 0.8, minY, maxY);
  x = pushClear(x, y, b, want, dir, minX, maxX);
  // Then both stick rest anchors. The aim stick is bought away from inboard,
  // the move stick sits on the far side and pushes back the other way, and
  // neither push is allowed to walk into the dodge button: that clearance is
  // the one thing that is never given up, so a push that would break it is
  // dropped rather than taken.
  const sticks = [{ at: L.aim, dir: dir }, { at: L.move, dir: -dir }];
  for (const s of sticks) {
    const cand = pushClear(x, y, s.at, stickWant, s.dir, minX, maxX);
    if (Math.hypot(b.x - cand, b.y - y) >= want) x = cand;
  }
  return { x, y };
}

// Read only, in the same spirit as Touch.layout(): where the button landed and
// every clearance it is actually keeping, so the geometry can be checked with
// no screen and no thumbs.
function skillButtonLayout() {
  if (typeof Touch === 'undefined' || !Touch || typeof Touch.layout !== 'function') return null;
  const at = skillAnchor();
  if (!at) return null;
  const L = Touch.layout();
  const d = p => Math.hypot(at.x - p.x, at.y - p.y);
  return {
    x: at.x, y: at.y, r: SK_R, grab: SK_R + L.grab,
    toDodge: d(L.dodge), toAim: d(L.aim), toMove: d(L.move),
    // Air between the drawn rings, and between the two capture circles.
    ringGapDodge: d(L.dodge) - (SK_R + L.buttonR),
    ringGapAim: d(L.aim) - (SK_R + L.radius),
    ringGapMove: d(L.move) - (SK_R + L.radius),
    grabGapDodge: d(L.dodge) - (SK_R + L.grab) - (L.buttonR + L.grab),
  };
}
window.skillButtonLayout = skillButtonLayout;

// touch.js paints its ring exactly this way: a dark disc under a two pixel
// stroke, both scaled off the one alpha.
function skillRing(ctx, x, y, r, alpha, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU_UI);
  ctx.fillStyle = 'rgba(10,12,16,' + (alpha * 0.5).toFixed(3) + ')';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color.replace('ALPHA', alpha.toFixed(3));
  ctx.stroke();
}

// DODGE is one word, so the skill gets one word too: the first, cut to the
// width the ring can hold.
function skillLabel(info) {
  const raw = String((info && info.name) || 'SKILL').trim();
  const first = raw.split(/\s+/)[0] || 'SKILL';
  return first.toUpperCase().slice(0, 8);
}

// The one gate both the painting and the capture ask: sticks on, a run with a
// skill in it, and the game actually being played.
function touchSkillLive() {
  if (typeof Touch === 'undefined' || !Touch || !Touch.active) return null;
  if (App.state !== 'play') return null;
  const info = skillOf(App.game);
  if (!info) return null;
  const at = skillAnchor();
  return at ? { info, at } : null;
}

function drawSkillButton(ctx, dt) {
  // The flash decays whether or not the button is on screen this frame.
  if (skillFlash > 0) skillFlash = Math.max(0, skillFlash - (dt || 0));
  if (!ctx) return;
  const live = touchSkillLive();
  if (!live) return;
  const g = App.game;
  const ready = skillReadyOf(g);
  const frac = skillFracOf(g);
  const color = ready > 0 ? 'rgba(126,200,232,ALPHA)' : 'rgba(140,150,165,ALPHA)';
  const alpha = 0.35 + (skillFlash > 0 ? 0.25 : 0);
  ctx.save();
  skillRing(ctx, live.at.x, live.at.y, SK_R, alpha, color);
  if (ready <= 0 && frac < 1) {
    ctx.beginPath();
    ctx.arc(live.at.x, live.at.y, SK_R - 6, -Math.PI / 2, -Math.PI / 2 + frac * TAU_UI);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(126,200,232,0.5)';
    ctx.stroke();
  }
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(232,224,204,' + (ready > 0 ? 0.85 : 0.35) + ')';
  ctx.fillText(skillLabel(live.info), live.at.x, live.at.y);
  ctx.restore();
}

// Capture phase, on window, so this runs before the pointerdown listener
// touch.js installed on the canvas: a thumb inside the button is claimed here
// and the event is stopped dead, so touch.js never sees it and can never
// mistake it for the start of a stick. Nothing below runs for a mouse or a
// pen, or on a device where the sticks are off, so keyboard and mouse play is
// untouched by all of it.
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  const live = touchSkillLive();
  if (!live) return;
  const grab = SK_R + (Touch.layout().grab || 0);
  if (Math.hypot(e.clientX - live.at.x, e.clientY - live.at.y) > grab) return;
  e.preventDefault();
  e.stopPropagation();
  gesture();
  INPUT.skill = true;
  skillFlash = 0.18;
}, { capture: true, passive: false });

// ---------------- the find card ----------------
// Picking something up off the trail is never an interruption. The card slides
// into the bottom left corner, says its piece for five seconds and leaves. It
// takes no clicks (pointer-events are off), it pauses nothing, and two finds
// arriving together queue instead of fighting over the corner.
//
// index.html does not know this thing exists: the element and its styles are
// both made here, on first use. The icon is a small canvas, the same way every
// other icon in this UI is drawn, because SPR.icon paints to a context.
const FIND_HOLD = 5;      // seconds the card stays up
const FIND_GAP = 0.4;     // beat between one card leaving and the next arriving

const findQueue = [];
let findCard = null;
let findPhase = 'idle';   // idle, show, gap
let findT = 0;

function findCardStyle() {
  if (document.getElementById('findcardcss')) return;
  const st = document.createElement('style');
  st.id = 'findcardcss';
  st.textContent =
    '#findcard{position:fixed;left:18px;bottom:18px;z-index:55;width:296px;' +
    'display:flex;gap:11px;padding:12px 14px;box-sizing:border-box;' +
    'border-radius:10px;background:rgba(14,16,20,0.94);' +
    'border:1px solid rgba(244,197,66,0.45);box-shadow:0 8px 24px rgba(0,0,0,0.55);' +
    'pointer-events:none;font-family:Verdana,sans-serif;color:#e8e0cc;' +
    'transform:translateX(-120%);opacity:0;' +
    'transition:transform 340ms cubic-bezier(0.2,0.9,0.3,1),opacity 340ms ease}' +
    '#findcard.on{transform:translateX(0);opacity:1}' +
    '#findcard canvas{width:34px;height:34px;flex:0 0 34px;margin-top:1px}' +
    '#findcard .fbody{min-width:0}' +
    '#findcard .ftitle{font-size:11px;font-weight:bold;letter-spacing:1.4px;' +
    'text-transform:uppercase;color:#f4c542}' +
    '#findcard .fline{font-size:11px;line-height:1.45;color:#c6c0af;margin-top:5px}' +
    '#findcard .fkind{font-size:9px;letter-spacing:1.6px;text-transform:uppercase;' +
    'color:#7f8a72;margin-top:8px}';
  document.head.appendChild(st);
}

function buildFindCard() {
  findCardStyle();
  const el = document.createElement('div');
  el.id = 'findcard';
  const ic = document.createElement('canvas');
  ic.width = 68; ic.height = 68;
  const body = document.createElement('div');
  body.className = 'fbody';
  const title = document.createElement('div');
  title.className = 'ftitle';
  const lines = document.createElement('div');
  const kind = document.createElement('div');
  kind.className = 'fkind';
  body.appendChild(title); body.appendChild(lines); body.appendChild(kind);
  el.appendChild(ic); el.appendChild(body);
  document.body.appendChild(el);
  findCard = { el, ic, title, lines, kind };
  return findCard;
}

function startFindCard(def) {
  const c = findCard || buildFindCard();
  const g = c.ic.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.ic.width, c.ic.height);
  g.scale(2, 2);
  SPR.icon(g, def.icon, 17, 17, 30);
  c.title.textContent = def.title;
  c.lines.innerHTML = '';
  const lines = def.lines || [];
  for (let i = 0; i < lines.length; i++) {
    const row = document.createElement('div');
    row.className = 'fline';
    row.textContent = lines[i];
    c.lines.appendChild(row);
  }
  c.kind.textContent = def.kind === 'sign' ? 'A sign on the trail' : 'Troop 12';
  // Commit the off screen position before asking for the slide, or the browser
  // batches both and the card simply appears.
  void c.el.offsetWidth;
  c.el.classList.add('on');
  findPhase = 'show';
  findT = FIND_HOLD;
  AudioSys.play('chest');
}

// Called by Finds.grant. Queueing is all it does: the loop puts cards up.
function showFindCard(def) {
  if (def) findQueue.push(def);
}

function drainFinds(dt) {
  if (findPhase === 'idle') {
    if (findQueue.length) startFindCard(findQueue.shift());
    return;
  }
  findT -= dt;
  if (findT > 0) return;
  if (findPhase === 'show') {
    if (findCard) findCard.el.classList.remove('on');
    findPhase = 'gap';
    findT = FIND_GAP;
    return;
  }
  findPhase = 'idle';
  if (findQueue.length) startFindCard(findQueue.shift());
}

// ---------------- input ----------------
let audioBooted = false;
function bootAudio() {
  if (audioBooted) return;
  audioBooted = true;
  AudioSys.init();
  AudioSys.setVolumes({ music: SETTINGS.musicVol, sfx: SETTINGS.sfxVol, voice: SETTINGS.voiceVol });
}

// Every gesture handler starts here: the browser only lets audio wake up
// inside a real user gesture, and it goes back to sleep on its own.
function gesture() {
  bootAudio();
  AudioSys.poke();
}

// ---------------- the two camp verbs ----------------
// Escape and E, in camp, as functions. A phone has neither key, so touch.js
// paints a MENU button and an INTERACT button and calls straight into these.
// They are written out here rather than left inline in the key handler so that
// there is exactly one behaviour to keep working: the button and the key run
// the same lines, and neither can drift away from the other.

// Escape, in camp. A dialog closes first. Inside the cabin, Escape is the
// door: leaving camp from in here used to drop the player at the title with
// the camp still set to 'cabin', so walking back in put them straight back
// inside a room they had just left. One step out, then the next Escape leaves
// camp.
function campEscape() {
  if (App.dialogOpen) { closeDialog(); return; }
  if (App.camp && App.camp.scene === 'cabin') {
    AudioSys.play('click');
    App.camp.exitCabin();
    return;
  }
  setState('title');
}

// E, in camp: whatever the scout is standing next to.
function campInteract() {
  if (App.dialogOpen) { closeDialog(); return; }
  const act = App.camp && App.camp.interact();
  if (!act) return;
  if (act.type === 'run') { AudioSys.play('click'); startRun(META.selected); }
  else if (act.type === 'shop') { AudioSys.play('click'); openShop(); }
  else if (act.type === 'feats') { AudioSys.play('click'); openFeats(); }
  else if (act.type === 'totem') { AudioSys.play('click'); openTotem(); }
  else if (act.type === 'talk') {
    // a line is a plain string, or { t, e } carrying an expression tag
    const ln = act.line;
    if (ln && typeof ln === 'object') showDialog(ln.t, act.speaker, ln.e);
    else showDialog(ln, act.speaker);
  }
  else if (act.type === 'select') AudioSys.play('pickup');
}

window.campEscape = campEscape;
window.campInteract = campInteract;

window.addEventListener('keydown', (e) => {
  // A text field owns its own keys. The transfer panel has two of them, and
  // inside one an M is a letter, not the mute button. Escape steps out of the
  // field so the next Escape closes the screen the way it always has.
  const el = e.target;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
    if (e.code === 'Escape' && typeof el.blur === 'function') el.blur();
    return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) { INPUT.keys.add(e.code); return; }
  gesture();
  INPUT.keys.add(e.code);

  if (e.code === 'KeyM') {
    AudioSys.setMuted(!AudioSys.muted);
    if (App.state === 'pause') $('btnmute').textContent = AudioSys.muted ? 'UNMUTE' : 'MUTE';
    return;
  }
  if (e.code === 'KeyF') {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (err) {}
    return;
  }

  switch (App.state) {
    case 'title':
      if (e.code === 'KeyC' && savedNight()) { AudioSys.play('click'); continueRun(); break; }
      if (e.code === 'Enter' || e.code === 'Space') { AudioSys.play('click'); enterCamp(); }
      break;
    case 'camp': {
      if (e.code === 'Escape') { campEscape(); break; }
      if (e.code === 'KeyC' && savedNight()) {
        if (App.dialogOpen) { closeDialog(); break; }
        AudioSys.play('click');
        continueRun();
        break;
      }
      if (e.code === 'KeyJ') {
        if (App.dialogOpen) { closeDialog(); break; }
        AudioSys.play('click');
        openJournal();
        break;
      }
      if (e.code === 'KeyB') {
        if (App.dialogOpen) { closeDialog(); break; }
        AudioSys.play('click');
        openFeats();
        break;
      }
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') campInteract();
      break;
    }
    case 'shop':
      if (e.code === 'Escape' || e.code === 'KeyE') { AudioSys.play('click'); setState('camp'); }
      break;
    case 'feats':
      if (e.code === 'Escape' || e.code === 'KeyB' || e.code === 'KeyE') { AudioSys.play('click'); setState('camp'); }
      break;
    case 'totem':
      if (e.code === 'Escape' || e.code === 'KeyE') { AudioSys.play('click'); setState('camp'); }
      break;
    case 'journal':
      if (e.code === 'Escape' || e.code === 'KeyJ') { AudioSys.play('click'); setState('camp'); }
      if (e.code === 'Digit1') { AudioSys.play('click'); showJournalTab('cryptids'); }
      if (e.code === 'Digit2') { AudioSys.play('click'); showJournalTab('troop'); }
      break;
    case 'runshop':
      if (e.code === 'Escape' || e.code === 'KeyE') { AudioSys.play('click'); setState('play'); }
      break;
    case 'select':
      if (e.code === 'Escape') setState('title');
      if (e.code === 'Digit1') startRun('max');
      if (e.code === 'Digit2') startRun('junie');
      if (e.code === 'Digit3') startRun('gus');
      break;
    case 'play':
      if (e.code === 'Escape' || e.code === 'KeyP') showPause();
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') INPUT.dodge = true;
      // Q is the active skill. It is an edge, like dodge: readInput consumes
      // it and clears it, so holding the key does not hold the skill down.
      if (e.code === 'KeyQ') INPUT.skill = true;
      if (e.code === 'KeyE' && shopHere(App.game)) { AudioSys.play('click'); openRunShop(); }
      break;
    case 'levelup':
      if (e.code === 'Digit1') chooseLevelup(0);
      if (e.code === 'Digit2') chooseLevelup(1);
      if (e.code === 'Digit3') chooseLevelup(2);
      break;
    case 'pause':
      if (e.code === 'Escape' || e.code === 'KeyP') setState('play');
      break;
    case 'over':
      if (e.code === 'KeyR' || e.code === 'Enter') { startRun(App.char); }
      if (e.code === 'Escape') { enterCamp(); }
      break;
    case 'options':
      if (e.code === 'Escape') closeOptions();
      break;
  }
});

window.addEventListener('keyup', (e) => {
  INPUT.keys.delete(e.code);
});

window.addEventListener('pointermove', (e) => {
  if (Touch.active && e.pointerType === 'touch') return;
  INPUT.mx = e.clientX;
  INPUT.my = e.clientY;
});
cv.addEventListener('pointerdown', (e) => {
  gesture();
  // On a touch device the sticks own the canvas; a thumb is not a mouse.
  if (Touch.active && e.pointerType === 'touch') return;
  if (e.button === 0) {
    INPUT.mdown = true;
    if (App.state === 'play') INPUT.fire = true;
  }
  if (e.button === 2 && App.state === 'play') INPUT.dodge = true;
});
window.addEventListener('pointerup', (e) => {
  if (Touch.active && e.pointerType === 'touch') return;
  if (e.button === 0) { INPUT.mdown = false; INPUT.fire = false; }
});
window.addEventListener('blur', () => {
  INPUT.keys.clear();
  INPUT.fire = false;
  INPUT.mdown = false;
  if (App.state === 'play' && App.game) showPause();
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------------- buttons ----------------
$('btnstart').addEventListener('click', () => { gesture(); AudioSys.play('click'); enterCamp(); });
// Both doors back into a night on file. Optional elements: an older page that
// does not carry them simply has no way in, and nothing throws on boot.
for (const id of ['btncontinue', 'campcontinue']) {
  const el = $(id);
  if (el) el.addEventListener('click', () => { gesture(); AudioSys.play('click'); continueRun(); });
}
$('btnshopback').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('camp'); });
$('btnrsback').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('play'); });
$('btnjback').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('camp'); });
$('btnfeatsback').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('camp'); });
$('btntotemback').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('camp'); });
$('btntotemclear').addEventListener('click', () => {
  gesture(); AudioSys.play('click');
  if (typeof Totem !== 'undefined' && Totem) Totem.clear(META);
  buildTotem();
});
$('jtab_cryptids').addEventListener('click', () => { gesture(); AudioSys.play('click'); showJournalTab('cryptids'); });
$('jtab_troop').addEventListener('click', () => { gesture(); AudioSys.play('click'); showJournalTab('troop'); });
$('btnresume').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('play'); });
$('btnquit').addEventListener('click', () => { gesture(); AudioSys.play('click'); quitToTitle(); });
$('btnmute').addEventListener('click', () => {
  gesture();
  AudioSys.setMuted(!AudioSys.muted);
  $('btnmute').textContent = AudioSys.muted ? 'UNMUTE' : 'MUTE';
});
// The store hint doubles as the door into the store on a touch device: there
// is no E key to press, so the words themselves are the button. The stylesheet
// only lets taps through to it on a page the sticks are on, and the guards
// below are the same two the E key answers to, so a mouse changes nothing.
$('shophint').addEventListener('click', () => {
  if (!(typeof Touch !== 'undefined' && Touch && Touch.active)) return;
  if (App.state !== 'play' || !shopHere(App.game)) return;
  gesture(); AudioSys.play('click'); openRunShop();
});
$('btnretry').addEventListener('click', () => { gesture(); AudioSys.play('click'); startRun(App.char); });
$('btntitle').addEventListener('click', () => { gesture(); AudioSys.play('click'); enterCamp(); });
$('btnoptions').addEventListener('click', () => { gesture(); AudioSys.play('click'); showOptions('title'); });
$('btnpauseopts').addEventListener('click', () => { gesture(); AudioSys.play('click'); showOptions('pause'); });
$('btnoptback').addEventListener('click', () => { gesture(); AudioSys.play('click'); closeOptions(); });
$('optmusic').addEventListener('input', () => { SETTINGS.musicVol = $('optmusic').value / 100; saveSettings(); });
$('optsfx').addEventListener('input', () => { SETTINGS.sfxVol = $('optsfx').value / 100; saveSettings(); audition('sfx'); });
$('optvoice').addEventListener('input', () => { SETTINGS.voiceVol = $('optvoice').value / 100; saveSettings(); audition('voice'); });
$('optsubs').addEventListener('change', () => { SETTINGS.subtitles = $('optsubs').checked; saveSettings(); });
$('optshake').addEventListener('change', () => { SETTINGS.shake = $('optshake').checked; saveSettings(); });
$('optnums').addEventListener('change', () => { SETTINGS.dmgNums = $('optnums').checked; saveSettings(); });
// The transfer panel. Every element is optional: a page built before this
// section existed simply has no transfer controls and boots the same.
(function wireTransfer() {
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', () => { gesture(); fn(); }); };
  on('btntfcopy', tfCopy);
  on('btntfload', tfRead);
  on('btntfyes', tfApply);
  on('btntfno', () => { AudioSys.play('click'); tfReset(); });
  const inp = $('tfin');
  if (inp) {
    inp.addEventListener('keydown', (e) => { if (e.code === 'Enter') tfRead(); });
    // Typing a new code puts any pending confirmation away.
    inp.addEventListener('input', () => { if (tfPending) tfReset(); });
  }
  const code = $('tfcode');
  if (code) code.addEventListener('click', () => { try { code.select(); } catch (e) {} });
})();

// ---------------- main loop ----------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  // Clamped at both ends. The ceiling keeps a tab that was in the background
  // from arriving as one enormous step. The floor is the cheaper guard: a
  // negative delta ages particles backwards, and a particle with a negative
  // age asks the canvas for a negative radius, which throws. performance.now()
  // is monotonic so nothing can produce one today, and this is one word.
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;

  // Sticks resolve before the simulation reads input, never after.
  Touch.update(dt);
  // The find card lives outside every screen: it comes and goes on its own.
  drainFinds(dt);

  const g = App.game;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  if (g) {
    if (App.state === 'play') {
      g.update(dt);
      if (App.state === 'play') {
        if (g.phase === 'over') { showOver(false); }
        else if (g.phase === 'win') { showOver(true); }
        else if (g.pendingLevelups > 0 && g.phase === 'play' && !banksLevelups(g)) { showLevelup(); }
      }
    }
    g.render(ctx, window.innerWidth, window.innerHeight);
    updateHUD();
    drainToasts(dt);
  } else if (App.camp && (App.state === 'camp' || App.state === 'shop' || App.state === 'journal' ||
    App.state === 'feats' || App.state === 'totem')) {
    if (App.state === 'camp' && !App.dialogOpen) App.camp.update(dt);
    App.camp.render(ctx, window.innerWidth, window.innerHeight);
  } else {
    // idle backdrop behind menus
    ctx.fillStyle = '#0a0e0a';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  Touch.render(ctx, window.innerWidth, window.innerHeight);
  // The skill button belongs to the same canvas pass as the sticks, drawn
  // right after them so it sits on top of nothing and under nothing.
  drawSkillButton(ctx, dt);
}

// The Cookie Money icon is the same 20 pixels every frame: draw it once.
(function paintCoinIcon() {
  const c = $('coinic');
  if (!c) return;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.scale(2, 2);
  SPR.icon(g, 'coin', 10, 10, 19);
})();

Touch.init(cv);
// The pools are reconciled once at boot, before anything can start a run, so
// a locked weapon is never in the level up rotation on a fresh page.
syncFeatPools();
buildSelect();
setState('title');
requestAnimationFrame(frame);
