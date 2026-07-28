// Merit Badge Massacre: optional asset layer.
// The game ships and plays perfectly with no assets/ folder at all. Everything here is
// an enhancement: if the manifest is missing, available stays false, every getter
// returns null, and callers keep using the procedural art and audio.
'use strict';

const Assets = (() => {
  const BASE = 'assets/';
  const MAX_PARALLEL = 6;

  const store = new Map();  // manifest relative path -> ArrayBuffer
  const sizes = new Map();  // manifest relative path -> declared bytes
  const warned = new Set(); // paths already reported, so one warning each
  const allPaths = [];
  let manifestPromise = null;

  function norm(p) {
    let s = String(p == null ? '' : p).replace(/\\/g, '/').replace(/^\.\//, '');
    while (s.charAt(0) === '/') s = s.slice(1);
    if (s.indexOf(BASE) === 0) s = s.slice(BASE.length);
    return s;
  }

  function addFile(p, bytes) {
    const key = norm(p);
    if (!key || sizes.has(key)) return;
    sizes.set(key, Math.max(0, Number(bytes) || 0));
    allPaths.push(key);
  }

  // files may be { "art/x.png": 1234 }, { "art/x.png": { bytes } }, or an array of
  // strings or of { path, bytes }. Anything else simply yields no known files.
  function indexFiles(raw) {
    const files = raw && raw.files;
    const sizeOf = (v) => (v && typeof v === 'object' ? (v.bytes != null ? v.bytes : v.size) : v);
    if (Array.isArray(files)) {
      files.forEach((e) => {
        if (typeof e === 'string') addFile(e, 0);
        else if (e) addFile(e.path, sizeOf(e));
      });
    } else if (files && typeof files === 'object') {
      Object.keys(files).forEach((k) => addFile(k, sizeOf(files[k])));
    }
  }

  // Prefix and extension matching only, no real globbing: "art/**", "art/*",
  // "art/*.png", "**/*.ogg". A single star stays inside one folder, ** goes deep.
  function matches(pattern, path) {
    const pat = norm(pattern);
    const star = pat.indexOf('*');
    if (star < 0) return pat === path;
    const prefix = pat.slice(0, star);
    if (path.indexOf(prefix) !== 0) return false;
    const rest = path.slice(prefix.length);
    if (pat.indexOf('**') < 0 && rest.indexOf('/') >= 0) return false;
    const tail = pat.slice(pat.lastIndexOf('*') + 1);
    if (tail && tail.charAt(0) === '.') return rest.length > tail.length && path.slice(-tail.length) === tail;
    return true;
  }

  function expand(name) {
    const groups = (api.manifest && api.manifest.groups) || null;
    const spec = groups ? groups[name] : null;
    const list = Array.isArray(spec) ? spec : (typeof spec === 'string' ? [spec] : null);
    if (!list) return [];
    const out = [];
    const seen = new Set();
    const take = (p) => { if (!seen.has(p)) { seen.add(p); out.push(p); } };
    list.forEach((entry) => {
      const pat = norm(entry);
      if (!pat) return;
      if (pat.indexOf('*') < 0) { take(pat); return; }
      allPaths.forEach((p) => { if (matches(pat, p)) take(p); });
    });
    return out;
  }

  async function fetchOne(path) {
    if (store.has(path)) return true;
    try {
      const res = await fetch(BASE + path, { cache: 'no-cache' });
      const type = (res.headers.get('content-type') || '').toLowerCase();
      // An HTML body is a host's 404 page, never an asset. Never hand that to decodeAudioData.
      if (!res.ok || type.indexOf('text/html') >= 0) throw new Error('bad response');
      store.set(path, await res.arrayBuffer());
      return true;
    } catch (e) {
      if (!warned.has(path)) { warned.add(path); console.warn('Assets: skipped ' + path); }
      return false;
    }
  }

  function runGroup(name, onProgress) {
    const paths = api.available ? expand(name) : [];
    let total = paths.reduce((n, p) => n + (sizes.get(p) || 0), 0);
    // A manifest with no byte counts would freeze a progress bar, so count files instead.
    const flat = total === 0 && paths.length > 0;
    if (flat) total = paths.length;
    const weight = (p) => (flat ? 1 : (sizes.get(p) || 0));
    let done = 0, loaded = 0, failed = 0, next = 0;
    const report = () => {
      if (typeof onProgress !== 'function') return;
      try { onProgress(done, total); } catch (e) { /* a caller's UI must not stop the load */ }
    };
    report();
    const worker = async () => {
      while (next < paths.length) {
        const p = paths[next++];
        if (await fetchOne(p)) loaded++; else failed++;
        done += weight(p);
        report();
      }
    };
    const crew = [];
    for (let i = 0; i < Math.min(MAX_PARALLEL, paths.length); i++) crew.push(worker());
    const summary = () => ({ group: name, loaded, failed });
    return Promise.all(crew).then(summary, summary);
  }

  const api = {
    available: false,
    manifest: null,

    // Always resolves. A missing or unreachable manifest is the normal shipping state.
    loadManifest() {
      if (manifestPromise) return manifestPromise;
      manifestPromise = (async () => {
        try {
          if (typeof fetch !== 'function') throw new Error('no fetch');
          const res = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
          const type = (res.headers.get('content-type') || '').toLowerCase();
          if (!res.ok || type.indexOf('text/html') >= 0) throw new Error('no manifest');
          const raw = await res.json();
          if (!raw || typeof raw !== 'object') throw new Error('bad manifest');
          api.manifest = raw;
          indexFiles(raw);
          api.available = true;
        } catch (e) {
          api.manifest = null;
          api.available = false;
          console.info('Assets: no asset pack found, using built-in art and audio.');
        }
        return api.available;
      })();
      return manifestPromise;
    },

    // Always resolves, with { group, loaded, failed }. Unknown groups load nothing.
    loadGroup(name, onProgress) {
      return (manifestPromise || api.loadManifest()).then(
        () => runGroup(name, onProgress),
        () => runGroup(name, onProgress)
      );
    },

    get(path) { return store.get(norm(path)) || null; },
    has(path) { return store.has(norm(path)); },
  };

  return api;
})();
