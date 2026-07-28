// Merit Badge Massacre: UI shell. Screens, HUD, input, settings, records.
'use strict';

// The night is a run of rooms now. Flip this to true to bring the 1.0 open
// field back for debugging: startRun then never touches Run, so the director
// spawns off the wall clock exactly as it used to.
const MBM_FIELD = false;

const INPUT = { keys: new Set(), mx: window.innerWidth / 2, my: window.innerHeight / 2, fire: false, mdown: false, dodge: false };

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
const SCREENS = ['title', 'select', 'levelup', 'pause', 'over', 'options', 'shop', 'runshop', 'journal'];
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

function enterCamp() {
  App.game = null;
  Run.reset();
  AudioSys.stopMusic();
  if (!App.camp) App.camp = new Camp();
  setState('camp');
}

function quitToTitle() {
  // A decided run (death or dawn animation in progress) must still credit
  // badges, counts and Brock's memory; only a live run may be forfeited.
  const g = App.game;
  if (g && g.phase !== 'play') {
    showOver(g.phase === 'dawn' || g.phase === 'win');
    return;
  }
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
  const killed = e === 'killed' || e.killed === true || (typeof e.kills === 'number' && e.kills > 0);
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
    w.textContent = keys[i] ? String(keys[i]).toUpperCase() : 'UNKNOWN SCOUT';
    row.appendChild(n); row.appendChild(w);
    wrap.appendChild(row);
  }
  return wrap;
}

// ---------------- dialogue ----------------
let dlgTimer = null;
function showDialog(text) {
  App.dialogOpen = true;
  $('dialog').classList.remove('hidden');
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
}

function showOver(won) {
  const g = App.game;

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
  AudioSys.stopMusic();

  const t = $('overtitle');
  t.textContent = won ? 'DAWN' : 'DEVOURED';
  t.className = won ? 'win' : 'lose';
  $('oversub').textContent = won
    ? 'Troop 13 survives. The Antlered One does not.'
    : 'The forest keeps score. The camp keeps your badges.';
  const grid = $('overstats');
  grid.innerHTML = '';
  [
    ['Survived', fmtTime(g.time)],
    ['Reached', 'Act ' + (g.act || 1) + ', room ' + ((g.roomIdx || 0) + 1)],
    ['Rank reached', 'LV ' + g.level],
    ['Critters slain', g.kills],
    ['Cookie Money turned in', turned.coins + ' for +' + turned.paid + ' badges'],
    ['Badges banked', '+' + g.badges],
    ['Camp balance', META.badges],
  ].forEach(([k, v]) => {
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
function showOptions(from) {
  App.optionsFrom = from;
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

  const sig = g.weapons.map(w => w.id + w.lvl).join(',') + '|' + Object.keys(g.passives).map(id => id + g.passives[id]).join(',');
  if (sig !== buildSig) {
    buildSig = sig;
    buildGroups(g);
  }
  updateSkillPips(g);
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
  }));
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

window.addEventListener('keydown', (e) => {
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
      if (e.code === 'Enter' || e.code === 'Space') { AudioSys.play('click'); enterCamp(); }
      break;
    case 'camp': {
      if (e.code === 'Escape') {
        if (App.dialogOpen) { closeDialog(); break; }
        setState('title');
        break;
      }
      if (e.code === 'KeyJ') {
        if (App.dialogOpen) { closeDialog(); break; }
        AudioSys.play('click');
        openJournal();
        break;
      }
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
        if (App.dialogOpen) { closeDialog(); break; }
        const act = App.camp && App.camp.interact();
        if (!act) break;
        if (act.type === 'run') { AudioSys.play('click'); startRun(META.selected); }
        else if (act.type === 'shop') { AudioSys.play('click'); openShop(); }
        else if (act.type === 'talk') showDialog(act.line);
        else if (act.type === 'select') AudioSys.play('pickup');
      }
      break;
    }
    case 'shop':
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
$('btnshopback').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('camp'); });
$('btnrsback').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('play'); });
$('btnjback').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('camp'); });
$('jtab_cryptids').addEventListener('click', () => { gesture(); AudioSys.play('click'); showJournalTab('cryptids'); });
$('jtab_troop').addEventListener('click', () => { gesture(); AudioSys.play('click'); showJournalTab('troop'); });
$('btnresume').addEventListener('click', () => { gesture(); AudioSys.play('click'); setState('play'); });
$('btnquit').addEventListener('click', () => { gesture(); AudioSys.play('click'); quitToTitle(); });
$('btnmute').addEventListener('click', () => {
  gesture();
  AudioSys.setMuted(!AudioSys.muted);
  $('btnmute').textContent = AudioSys.muted ? 'UNMUTE' : 'MUTE';
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

// ---------------- main loop ----------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Sticks resolve before the simulation reads input, never after.
  Touch.update(dt);

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
  } else if (App.camp && (App.state === 'camp' || App.state === 'shop' || App.state === 'journal')) {
    if (App.state === 'camp' && !App.dialogOpen) App.camp.update(dt);
    App.camp.render(ctx, window.innerWidth, window.innerHeight);
  } else {
    // idle backdrop behind menus
    ctx.fillStyle = '#0a0e0a';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  Touch.render(ctx, window.innerWidth, window.innerHeight);
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
buildSelect();
setState('title');
requestAnimationFrame(frame);
