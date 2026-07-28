// Merit Badge Massacre: spoken barks. The game ships and plays perfectly with
// no assets/ folder at all (see js/assets.js's own header comment): with no
// manifest, or a manifest with no voice entries, `available` stays false and
// every method below is a safe no-op, exactly like the original stub.
//
// Routing note (read js/audio.js before changing this): AudioSys owns a
// private `voiceBus` GainNode and a private AudioContext (`ac`), but neither
// is exposed on the object AudioSys returns (only init/play/cue/hold/poke/
// setMuted/setVolumes/duck/setListener/emitter/playAt/startMusic/stopMusic/
// setIntensity and the muted/started/emitterCount getters are public). There
// is no way for an outside module to connect a node into AudioSys's real
// voice bus without editing audio.js. Since this file may only touch itself,
// Voice owns a second, private AudioContext of its own (same lazy, wrapped
// in try/catch pattern AudioSys uses for its `ac`) and mixes SETTINGS.voiceVol
// on its own gain node, once, using the same perceptual curve AudioSys uses
// for its voice bus (HEADROOM.voice = 0.9 in audio.js, duplicated here as
// VOICE_HEADROOM since it is not exported). Ducking music/sfx during a line
// still goes through the real, public AudioSys.duck(), which only ever
// touches AudioSys's own bus nodes and works regardless of which AudioContext
// is asking.
'use strict';

const Voice = (() => {
  const KEY_SEP = ' ';
  const COOLDOWN_MS = 600;       // no two line starts closer together than this
  const FADE_SEC = 0.06;         // cut-in and stop() both fade over this long
  const DECODE_CACHE_MAX = 40;   // LRU cap on decoded AudioBuffers
  const VOICE_HEADROOM = 0.9;    // mirrors js/audio.js HEADROOM.voice

  // Priority ladder, highest first. Any trigger not in this list (including
  // null/undefined, e.g. the options-menu "Check." audition ping) ranks
  // below every named tier.
  const PRIORITY_ORDER = ['death', 'boss', 'revive', 'lowhp', 'win', 'chest', 'runstart', 'kills', 'idle'];
  const PRIORITY_RANK = {};
  PRIORITY_ORDER.forEach((name, i) => { PRIORITY_RANK[name] = PRIORITY_ORDER.length - i; });
  function priorityRank(name) {
    return (typeof name === 'string' && PRIORITY_RANK[name]) || 0;
  }

  let voiceAvailable = false;
  let initPromise = null;
  let vac = null; // Voice's own private AudioContext, created on first real playback

  const textMap = new Map();       // speaker + KEY_SEP + spokenText -> manifest path
  const decodeCache = new Map();   // manifest path -> decoded AudioBuffer, LRU by insertion order
  const missingLogged = new Set(); // speaker + KEY_SEP + text already warned about
  const unloadedLogged = new Set();// manifest path already warned about (bytes not fetched yet)

  let current = null;    // { token, rank, src, gain, duckHandle, dur } or null when idle
  let seq = 0;
  let lastStartMs = -Infinity;

  // -----------------------------------------------------------------------
  // Text normalization: mirrors tools/voice/dump_lines.cjs's extractSpoken()
  // exactly (that script is what produced the manifest's spokenText values),
  // plus an extra whitespace collapse for robustness. Rule: if the raw bark
  // text contains "double quoted" spans, only those spans (concatenated with
  // a space, quotes stripped) were spoken; a line with no quotes at all
  // (every current scout bark, every BOSSLINES entry) is spoken in full.
  // Most bark text already equals its own spokenText (no quotes, no stray
  // whitespace), so the exact match in resolvePath() below is the common
  // case and this normalization is the fallback for narrated lines like
  // Brock's campfire dialogue.
  // -----------------------------------------------------------------------
  function normalizeSpoken(text) {
    const spans = [];
    const re = /"([^"]*)"/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const span = m[1].replace(/\s+/g, ' ').trim();
      if (span) spans.push(span);
    }
    if (spans.length) return spans.join(' ');
    return text.replace(/\s+/g, ' ').trim();
  }

  function resolvePath(speaker, text) {
    if (!speaker || typeof text !== 'string') return null;
    const direct = textMap.get(speaker + KEY_SEP + text);
    if (direct) return direct;
    const norm = normalizeSpoken(text);
    if (norm !== text) {
      const viaNorm = textMap.get(speaker + KEY_SEP + norm);
      if (viaNorm) return viaNorm;
    }
    return null;
  }

  function logMissing(speaker, text) {
    const key = speaker + KEY_SEP + text;
    if (missingLogged.has(key)) return;
    missingLogged.add(key);
    console.info('Voice: no recorded line for ' + speaker + ': ' + JSON.stringify(text));
  }

  function logUnloaded(path) {
    if (unloadedLogged.has(path)) return;
    unloadedLogged.add(path);
    console.info('Voice: ' + path + ' resolved but is not loaded yet, skipping playback this time.');
  }

  // -----------------------------------------------------------------------
  // Manifest indexing
  // -----------------------------------------------------------------------
  function indexManifest(manifest) {
    textMap.clear();
    let sawVoiceEntry = false;
    const files = (manifest && manifest.files) || {};
    Object.keys(files).forEach((rel) => {
      const val = files[rel];
      if (!val || typeof val !== 'object' || !val.speaker) return;
      sawVoiceEntry = true;
      if (typeof val.spokenText === 'string' && val.spokenText) {
        const key = val.speaker + KEY_SEP + val.spokenText;
        if (!textMap.has(key)) textMap.set(key, rel);
      }
    });
    voiceAvailable = sawVoiceEntry;
  }

  // -----------------------------------------------------------------------
  // Boot: load the manifest, then warm the selected scout's lines and the
  // camp (Brock) group in the background. Safe to call repeatedly (memoized)
  // and safe to call before META/Assets fully exist, since Assets.loadManifest
  // and Assets.loadGroup both always resolve, never throw, and META is only
  // read from inside the async continuation, by which point every other
  // script tag (meta.js included) has already run.
  // -----------------------------------------------------------------------
  function init() {
    if (initPromise) return initPromise;
    if (typeof Assets === 'undefined' || !Assets || typeof Assets.loadManifest !== 'function') {
      initPromise = Promise.resolve(false);
      return initPromise;
    }
    initPromise = Assets.loadManifest().then((ok) => {
      if (!ok) { voiceAvailable = false; return false; }
      indexManifest(Assets.manifest);
      if (!voiceAvailable) return false;
      const speaker = (typeof META !== 'undefined' && META && META.selected) || 'max';
      if (typeof Assets.loadGroup === 'function') {
        Assets.loadGroup('voice:' + speaker).catch(() => {});
        Assets.loadGroup('camp').catch(() => {});
      }
      return true;
    }, () => { voiceAvailable = false; return false; });
    return initPromise;
  }

  // -----------------------------------------------------------------------
  // Voice's own tiny mixer: one AudioContext, created lazily on first real
  // playback (never during boot, so a page with no assets never creates one
  // at all), one fresh gain node per line so a cut-in fade never touches the
  // next line's node.
  // -----------------------------------------------------------------------
  function ensureContext() {
    if (vac) return vac;
    try {
      vac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { vac = null; }
    return vac;
  }

  function poke() {
    if (vac && vac.state === 'suspended') {
      try { vac.resume(); } catch (e) {}
    }
  }

  function voiceGain() {
    const raw = (typeof SETTINGS !== 'undefined' && SETTINGS && typeof SETTINGS.voiceVol === 'number')
      ? SETTINGS.voiceVol : 0.9;
    const v = Math.max(0, Math.min(1, raw));
    return VOICE_HEADROOM * v * v; // same perceptual curve as AudioSys's own bus gain
  }

  function decodeBytes(bytes) {
    ensureContext();
    const copy = bytes.slice(0); // decodeAudioData can detach its input in some engines; never hand out Assets' own stored buffer
    return new Promise((resolve, reject) => {
      try {
        const maybe = vac.decodeAudioData(copy, resolve, reject);
        if (maybe && typeof maybe.then === 'function') maybe.then(resolve, reject);
      } catch (e) { reject(e); }
    });
  }

  // -----------------------------------------------------------------------
  // LRU cache of decoded AudioBuffers, capacity 40. Map preserves insertion
  // order, so "delete then re-set" moves an entry to the most-recently-used
  // end and the oldest key is always the first one when the cap is exceeded.
  // -----------------------------------------------------------------------
  function cacheGet(path) {
    if (!decodeCache.has(path)) return null;
    const buf = decodeCache.get(path);
    decodeCache.delete(path);
    decodeCache.set(path, buf);
    return buf;
  }

  function cachePut(path, buf) {
    if (decodeCache.has(path)) decodeCache.delete(path);
    decodeCache.set(path, buf);
    while (decodeCache.size > DECODE_CACHE_MAX) {
      const oldest = decodeCache.keys().next().value;
      decodeCache.delete(oldest);
    }
  }

  // -----------------------------------------------------------------------
  // Playback / overlap control
  // -----------------------------------------------------------------------
  function cutCurrent(fadeSec) {
    if (!current) return;
    const c = current;
    current = null;
    if (c.duckHandle) { try { c.duckHandle.release(); } catch (e) {} }
    if (c.src && c.gain) {
      try {
        const t = vac.currentTime;
        c.gain.gain.cancelScheduledValues(t);
        c.gain.gain.setValueAtTime(c.gain.gain.value, t);
        c.gain.gain.linearRampToValueAtTime(0, t + fadeSec);
        c.src.onended = null;
        setTimeout(() => {
          try { c.src.stop(); } catch (e) {}
          try { c.src.disconnect(); c.gain.disconnect(); } catch (e) {}
        }, fadeSec * 1000 + 20);
      } catch (e) {}
    }
  }

  function beginPlayback(token, buffer) {
    if (!current || current.token !== token) return; // superseded or stopped while decoding
    ensureContext();
    poke();
    const src = vac.createBufferSource();
    src.buffer = buffer;
    const gainNode = vac.createGain();
    gainNode.gain.value = voiceGain();
    src.connect(gainNode);
    gainNode.connect(vac.destination);

    const duckHandle = (typeof AudioSys !== 'undefined' && AudioSys && typeof AudioSys.duck === 'function')
      ? AudioSys.duck({ music: -6, sfx: -2.5, hold: buffer.duration, release: 0.4 })
      : { release() {} };

    current.src = src;
    current.gain = gainNode;
    current.duckHandle = duckHandle;
    current.dur = buffer.duration;

    src.onended = () => {
      if (current && current.token === token) {
        try { current.duckHandle.release(); } catch (e) {}
        current = null;
      }
      try { src.disconnect(); gainNode.disconnect(); } catch (e) {}
    };
    try { src.start(0); } catch (e) {}
  }

  function speak(speakerId, text, opts) {
    if (!voiceAvailable) return null;
    if (typeof speakerId !== 'string' || !speakerId) return null;
    const path = resolvePath(speakerId, text);
    if (!path) { logMissing(speakerId, text); return null; }

    const rank = priorityRank(opts && opts.priority);
    const nowMs = performance.now();

    if (current) {
      if (rank <= current.rank) return null; // lower or equal drops silently, bubble still shows
      cutCurrent(FADE_SEC);
    } else if (nowMs - lastStartMs < COOLDOWN_MS) {
      return null; // global cooldown between fresh line starts
    }

    const token = ++seq;
    current = { token, rank, src: null, gain: null, duckHandle: null, dur: null };
    lastStartMs = nowMs;

    const cached = cacheGet(path);
    if (cached) {
      beginPlayback(token, cached);
      return { dur: cached.duration };
    }

    if (typeof Assets === 'undefined' || !Assets || typeof Assets.get !== 'function') {
      current = null;
      return null;
    }
    const bytes = Assets.get(path);
    if (!bytes) {
      // Resolved to a real line, but its group was never preloaded (or is
      // still loading) so the bytes are not in hand yet. Release the
      // reserved slot rather than leave a phantom "line playing" forever.
      current = null;
      logUnloaded(path);
      return null;
    }

    decodeBytes(bytes).then((buffer) => {
      if (!current || current.token !== token) return;
      cachePut(path, buffer);
      beginPlayback(token, buffer);
    }).catch(() => {
      if (current && current.token === token) current = null;
    });

    return { dur: null }; // duration is unknown until decode resolves; caller already treats a falsy dur as "keep default timing"
  }

  function stop() {
    cutCurrent(FADE_SEC);
  }

  function preload(sp) {
    if (typeof Assets === 'undefined' || !Assets || typeof Assets.loadGroup !== 'function') return Promise.resolve();
    return Assets.loadGroup('voice:' + sp).then(() => {}, () => {});
  }

  // Self-boot: kicks off manifest load (and, if it yields voice entries, the
  // selected scout's and camp's background preload) as soon as this script
  // runs, with no other file needing to call Voice.init() for the common
  // case. init() stays exported and safe to call again (memoized) for a
  // future explicit boot hook, e.g. from ui.js's own startup sequence.
  try { init(); } catch (e) {}

  return {
    get available() { return voiceAvailable; },
    init,
    speak,
    stop,
    preload,
  };
})();
