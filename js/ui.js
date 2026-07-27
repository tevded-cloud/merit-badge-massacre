// Merit Badge Massacre: UI shell. Screens, HUD, input, settings, records.
'use strict';

const INPUT = { keys: new Set(), mx: window.innerWidth / 2, my: window.innerHeight / 2, fire: false };

const SETTINGS = { musicVol: 0.8, sfxVol: 0.8, shake: true, dmgNums: true };
try {
  const s = JSON.parse(localStorage.getItem('mbm_settings') || '{}');
  Object.assign(SETTINGS, s);
} catch (e) {}
function saveSettings() {
  try { localStorage.setItem('mbm_settings', JSON.stringify(SETTINGS)); } catch (e) {}
  AudioSys.setVolumes(SETTINGS.musicVol, SETTINGS.sfxVol);
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
const SCREENS = ['title', 'select', 'levelup', 'pause', 'over', 'options', 'shop'];
function setState(s) {
  App.state = s;
  INPUT.fire = false;
  for (const id of SCREENS) {
    const el = $(id);
    if (el) el.classList.toggle('hidden', id !== s);
  }
  $('hud').classList.toggle('hidden', !(App.game && ['play', 'levelup', 'pause', 'over'].includes(s)));
  $('camphint').classList.toggle('hidden', s !== 'camp');
  if (s !== 'camp') closeDialog();
  if (s === 'title') refreshBestLine();
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
    card.addEventListener('click', () => { AudioSys.play('click'); startRun(id); });
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
  AudioSys.setVolumes(SETTINGS.musicVol, SETTINGS.sfxVol);
  AudioSys.startMusic();
  setState('play');
  App.game.bark('runstart');
}

function enterCamp() {
  App.game = null;
  AudioSys.stopMusic();
  if (!App.camp) App.camp = new Camp();
  setState('camp');
}

function quitToTitle() {
  App.game = null;
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
  App.best.runs++;
  App.best.time = Math.max(App.best.time, Math.floor(g.time));
  App.best.kills = Math.max(App.best.kills, g.kills);
  if (won) App.best.dawns++;
  saveBest();
  META.credit(g, won);
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
    ['Rank reached', 'LV ' + g.level],
    ['Critters slain', g.kills],
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
    const card = document.createElement('div');
    card.className = 'card';
    const chip = document.createElement('div');
    chip.className = c.isNew ? 'newchip' : 'lvchip';
    chip.textContent = info.chip;
    const ic = document.createElement('canvas');
    ic.width = 56; ic.height = 56;
    SPR.icon(ic.getContext('2d'), info.icon, 28, 28, 44);
    const name = document.createElement('div');
    name.className = 'cname'; name.textContent = info.name;
    const desc = document.createElement('div');
    desc.className = 'cdesc'; desc.textContent = info.desc;
    const key = document.createElement('div');
    key.className = 'key'; key.textContent = 'PRESS ' + (i + 1);
    card.appendChild(chip); card.appendChild(ic); card.appendChild(name); card.appendChild(desc); card.appendChild(key);
    card.addEventListener('click', () => chooseLevelup(i));
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
function showPause() {
  const g = App.game;
  const wnames = g.weapons.map(w => DATA.weapons[w.id].name + ' LV' + w.lvl).join(' &middot; ');
  const pnames = Object.keys(g.passives).map(id => DATA.passives[id].name + ' LV' + g.passives[id]).join(' &middot; ');
  $('pbuild').innerHTML =
    '<b style="color:#e8e0cc">' + g.char.name + '</b>, ' + fmtTime(g.time) + ' into the night<br>' +
    (wnames || '') + (pnames ? '<br>' + pnames : '');
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
  $('optshake').checked = SETTINGS.shake;
  $('optnums').checked = SETTINGS.dmgNums;
  setState('options');
}
function closeOptions() {
  saveSettings();
  if (App.optionsFrom === 'pause' && App.game) setState('pause');
  else setState('title');
}

// ---------------- HUD ----------------
let buildSig = '';
let toastTimer = 0;

function updateHUD() {
  const g = App.game;
  if (!g) return;
  const p = g.player;
  $('xpfill').style.width = Math.min(100, (g.xp / g.xpNext) * 100) + '%';
  $('lvl').textContent = 'LV ' + g.level;
  $('hpfill').style.width = Math.max(0, (p.hp / p.maxhp) * 100) + '%';
  $('hptext').textContent = Math.ceil(p.hp) + ' / ' + p.maxhp;
  $('timer').textContent = fmtTime(g.time);
  $('kills').textContent = g.kills + ' SLAIN';

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
    const row = $('buildrow');
    row.innerHTML = '';
    for (const w of g.weapons) {
      row.appendChild(makeSlot(DATA.weapons[w.id].icon, w.lvl, DATA.WEAPON_MAX));
    }
    for (const id in g.passives) {
      row.appendChild(makeSlot(DATA.passives[id].icon, g.passives[id], DATA.passives[id].max));
    }
  }
}

function makeSlot(icon, lvl, max) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  const c = document.createElement('canvas');
  c.width = 56; c.height = 56;
  SPR.icon(c.getContext('2d'), icon, 28, 28, 44);
  slot.appendChild(c);
  const pips = document.createElement('div');
  pips.className = 'pips';
  for (let i = 0; i < max; i++) {
    const pip = document.createElement('div');
    pip.className = 'pip' + (i < lvl ? ' on' : '');
    pips.appendChild(pip);
  }
  slot.appendChild(pips);
  return slot;
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
  AudioSys.setVolumes(SETTINGS.musicVol, SETTINGS.sfxVol);
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) { INPUT.keys.add(e.code); return; }
  bootAudio();
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
    case 'select':
      if (e.code === 'Escape') setState('title');
      if (e.code === 'Digit1') startRun('max');
      if (e.code === 'Digit2') startRun('junie');
      if (e.code === 'Digit3') startRun('gus');
      break;
    case 'play':
      if (e.code === 'Escape' || e.code === 'KeyP') showPause();
      if (e.code === 'Space') INPUT.fire = true;
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
  if (e.code === 'Space') INPUT.fire = false;
});

window.addEventListener('pointermove', (e) => {
  INPUT.mx = e.clientX;
  INPUT.my = e.clientY;
});
cv.addEventListener('pointerdown', (e) => {
  bootAudio();
  if (e.button === 0 && App.state === 'play') INPUT.fire = true;
});
window.addEventListener('pointerup', (e) => {
  if (e.button === 0) INPUT.fire = false;
});
window.addEventListener('blur', () => {
  INPUT.keys.clear();
  INPUT.fire = false;
  if (App.state === 'play' && App.game) showPause();
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------------- buttons ----------------
$('btnstart').addEventListener('click', () => { bootAudio(); AudioSys.play('click'); enterCamp(); });
$('btnshopback').addEventListener('click', () => { AudioSys.play('click'); setState('camp'); });
$('btnresume').addEventListener('click', () => { AudioSys.play('click'); setState('play'); });
$('btnquit').addEventListener('click', () => { AudioSys.play('click'); quitToTitle(); });
$('btnmute').addEventListener('click', () => {
  AudioSys.setMuted(!AudioSys.muted);
  $('btnmute').textContent = AudioSys.muted ? 'UNMUTE' : 'MUTE';
});
$('btnretry').addEventListener('click', () => { AudioSys.play('click'); startRun(App.char); });
$('btntitle').addEventListener('click', () => { AudioSys.play('click'); enterCamp(); });
$('btnoptions').addEventListener('click', () => { AudioSys.play('click'); showOptions('title'); });
$('btnpauseopts').addEventListener('click', () => { AudioSys.play('click'); showOptions('pause'); });
$('btnoptback').addEventListener('click', () => { AudioSys.play('click'); closeOptions(); });
$('optmusic').addEventListener('input', () => { SETTINGS.musicVol = $('optmusic').value / 100; saveSettings(); });
$('optsfx').addEventListener('input', () => { SETTINGS.sfxVol = $('optsfx').value / 100; saveSettings(); AudioSys.play('click'); });
$('optshake').addEventListener('change', () => { SETTINGS.shake = $('optshake').checked; saveSettings(); });
$('optnums').addEventListener('change', () => { SETTINGS.dmgNums = $('optnums').checked; saveSettings(); });

// ---------------- main loop ----------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const g = App.game;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  if (g) {
    if (App.state === 'play') {
      g.update(dt);
      if (App.state === 'play') {
        if (g.phase === 'over') { showOver(false); }
        else if (g.phase === 'win') { showOver(true); }
        else if (g.pendingLevelups > 0 && g.phase === 'play') { showLevelup(); }
      }
    }
    g.render(ctx, window.innerWidth, window.innerHeight);
    updateHUD();
    drainToasts(dt);
  } else if (App.camp && (App.state === 'camp' || App.state === 'shop')) {
    if (App.state === 'camp' && !App.dialogOpen) App.camp.update(dt);
    App.camp.render(ctx, window.innerWidth, window.innerHeight);
  } else {
    // idle backdrop behind menus
    ctx.fillStyle = '#0a0e0a';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

buildSelect();
setState('title');
requestAnimationFrame(frame);
