// Merit Badge Massacre: the render page.
//
// Loads every composition source from js/music/src, renders each layer of each
// theme through its own OfflineAudioContext, folds the reverb tail back onto the
// head so the loop is seamless, proves every layer of a theme is exactly the
// same length, and hands finished 16 bit WAVs to the main process.
//
// Nothing here touches the disk. The only way out is window.mbmRender.
'use strict';

(function () {
  var api = window.mbmRender;
  var logEl = document.getElementById('log');

  function say(line, cls) {
    var div = document.createElement('div');
    if (cls) div.className = cls;
    div.textContent = line;
    logEl.appendChild(div);
    try { api.log(line); } catch (e) { /* main went away, the page is done anyway */ }
  }

  // ----------------------------------------------------------------
  // Loading composition sources
  //
  // The main process sends the source text, and it runs here as an inline
  // classic script. A syntax error or a throw inside one of those does not come
  // back to the caller, it goes to window.onerror, so that is trapped and
  // turned back into a normal failure with the file name attached.
  // ----------------------------------------------------------------
  var lastError = null;
  window.addEventListener('error', function (e) {
    lastError = (e.message || 'error') +
      (e.lineno ? ' (line ' + e.lineno + (e.colno ? ':' + e.colno : '') + ')' : '');
  });

  function runScript(src) {
    lastError = null;
    var el = document.createElement('script');
    // sourceURL so devtools and any stack trace name the real file
    el.textContent = String(src.code) + '\n//# sourceURL=' + src.url + '\n';
    document.head.appendChild(el);
    if (lastError) {
      throw new Error('js/music/src/' + src.name + ' did not run:\n  ' + lastError);
    }
  }

  // Each composition source pushes onto MBM_COMPOSITIONS when it runs, so
  // loading them one at a time is what tells us which theme came from which
  // file. No filename convention is assumed: a file may register more than one
  // theme, or none.
  async function loadSources(job) {
    for (var h = 0; h < job.helpers.length; h++) {
      runScript(job.helpers[h]);
    }
    if (!window.MBMSynth) throw new Error('js/music/src/synth.js ran but did not define MBMSynth');

    window.MBM_COMPOSITIONS = window.MBM_COMPOSITIONS || [];
    var found = [];
    for (var i = 0; i < job.compositions.length; i++) {
      var src = job.compositions[i];
      var before = window.MBM_COMPOSITIONS.length;
      runScript(src);
      var added = window.MBM_COMPOSITIONS.slice(before);
      if (!added.length) {
        throw new Error('js/music/src/' + src.name + ' registered no composition.\n' +
          '  Every composition file must push one object onto MBM_COMPOSITIONS.');
      }
      for (var j = 0; j < added.length; j++) {
        validate(added[j], src.name);
        found.push({ comp: added[j], source: src.name, hash: src.hash });
      }
    }
    return found;
  }

  function validate(comp, sourceName) {
    var where = 'js/music/src/' + sourceName;
    if (!comp || typeof comp !== 'object') throw new Error(where + ' registered something that is not an object');
    if (!comp.id) throw new Error(where + ' registered a composition with no id');
    if (!(comp.bpm > 0)) throw new Error(where + ': theme "' + comp.id + '" has no bpm');
    if (!(comp.bars > 0)) throw new Error(where + ': theme "' + comp.id + '" has no bars');
    if (!Array.isArray(comp.layers) || !comp.layers.length) {
      throw new Error(where + ': theme "' + comp.id + '" has no layers');
    }
    var seen = {};
    comp.layers.forEach(function (l) {
      if (!l || !l.id) throw new Error(where + ': theme "' + comp.id + '" has a layer with no id');
      if (typeof l.render !== 'function') {
        throw new Error(where + ': layer "' + l.id + '" of theme "' + comp.id + '" has no render function');
      }
      if (seen[l.id]) throw new Error(where + ': theme "' + comp.id + '" has two layers called "' + l.id + '"');
      seen[l.id] = true;
    });
  }

  // ----------------------------------------------------------------
  // Rendering
  // ----------------------------------------------------------------
  function ditherSeed(text) {
    var h = 0x811C9DC5;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  function dbText(peak) {
    var d = MBMStems.toDb(peak);
    return (d === -Infinity ? '-inf' : d.toFixed(1)) + ' dBFS';
  }

  async function renderLayer(comp, layer, sampleRate, total) {
    var ctx = new OfflineAudioContext({
      numberOfChannels: 2,
      length: total,
      sampleRate: sampleRate,
    });
    var master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    await layer.render(ctx, master, comp.bpm, comp.bars);
    var buffer = await ctx.startRendering();

    if (buffer.length !== total) {
      throw new Error('Theme "' + comp.id + '", layer "' + layer.id + '": rendered ' +
        buffer.length + ' samples, asked for ' + total + '.');
    }
    return buffer;
  }

  async function renderTheme(entry, job) {
    var comp = entry.comp;
    var sampleRate = job.sampleRate;
    var loop = MBMStems.themeSampleCount(comp, sampleRate);
    var tail = MBMStems.tailSampleCount(comp, sampleRate);
    var total = loop + tail;

    say('theme ' + comp.id + ': ' + comp.bpm + ' bpm, ' + comp.bars + ' bars, ' +
      (comp.key || 'no key given') + ', ' + comp.layers.length + ' layer(s), ' +
      loop + ' samples (' + (loop / sampleRate).toFixed(3) + ' s), ' +
      (tail / sampleRate).toFixed(2) + ' s tail folded back');

    var baked = [];
    for (var i = 0; i < comp.layers.length; i++) {
      var layer = comp.layers[i];
      var t0 = Date.now();
      var buffer = await renderLayer(comp, layer, sampleRate, total);
      var folded = MBMStems.foldTail(buffer, loop);
      baked.push({ id: layer.id, length: folded.length, peak: folded.peak, channels: folded.channels });
      var line = '  ' + comp.id + '/' + layer.id + ': ' + folded.length + ' samples, peak ' +
        dbText(folded.peak) + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s';
      if (folded.peak > 1) say(line + '  CLIPPING, turn this layer down', 'bad');
      else if (folded.peak > 0.95) say(line + '  very hot', 'warn');
      else if (folded.peak < 0.02) say(line + '  nearly silent, is that intended?', 'warn');
      else say(line, 'ok');
    }

    // The whole point of the harness. Nothing is written until this passes.
    MBMStems.assertSameLength(comp.id, baked, loop);

    var layersOut = [];
    for (var k = 0; k < baked.length; k++) {
      var b = baked[k];
      var name = MBMStems.wavName(comp.id, b.id);
      var bytes = MBMWav.encodeWav(b.channels, {
        sampleRate: sampleRate,
        dither: true,
        seed: ditherSeed(comp.id + '/' + b.id),
      });
      var written = await api.write(name, bytes);
      layersOut.push({
        id: b.id,
        wav: name,
        samples: b.length,
        peak: Number(b.peak.toFixed(6)),
        peakDb: Number(MBMStems.toDb(b.peak).toFixed(2)),
        bitrateKbps: MBMStems.bitrateFor(b.id),
        wavBytes: written.bytes,
      });
      b.channels = null; // let the render of the next theme have the memory back
    }

    return {
      hash: entry.hash,
      source: entry.source,
      bpm: comp.bpm,
      bars: comp.bars,
      beatsPerBar: comp.beatsPerBar || 4,
      key: comp.key || null,
      notes: comp.notes || null,
      sampleRate: sampleRate,
      samples: loop,
      tailSamples: tail,
      seconds: Number((loop / sampleRate).toFixed(4)),
      renderedAt: new Date().toISOString(),
      layers: layersOut,
    };
  }

  // ----------------------------------------------------------------
  // Run
  // ----------------------------------------------------------------
  async function run() {
    var job = await api.job();
    var found = await loadSources(job);

    var wanted = found;
    if (job.only && job.only.length) {
      var ids = {};
      job.only.forEach(function (id) { ids[id] = true; });
      wanted = found.filter(function (e) { return ids[e.comp.id]; });
      var missing = job.only.filter(function (id) {
        return !found.some(function (e) { return e.comp.id === id; });
      });
      if (missing.length) {
        throw new Error('--only named theme(s) that do not exist: ' + missing.join(', ') +
          '\n  themes found: ' + found.map(function (e) { return e.comp.id; }).join(', '));
      }
    }

    var themes = [];
    var rendered = 0;
    var skipped = 0;

    for (var i = 0; i < wanted.length; i++) {
      var entry = wanted[i];
      var comp = entry.comp;
      var cached = job.cache ? job.cache[comp.id] : null;
      var loop = MBMStems.themeSampleCount(comp, job.sampleRate);

      var unchanged = !job.force && cached && cached.hash === entry.hash &&
        cached.wavsPresent && cached.samples === loop &&
        cached.sampleRate === job.sampleRate;

      if (unchanged) {
        var keep = {};
        Object.keys(cached).forEach(function (k) { if (k !== 'wavsPresent') keep[k] = cached[k]; });
        say('theme ' + comp.id + ': unchanged since the last render, skipping');
        themes.push({ id: comp.id, status: 'skipped', entry: keep });
        skipped++;
        continue;
      }

      var built = await renderTheme(entry, job);
      themes.push({ id: comp.id, status: 'rendered', entry: built });
      rendered++;
    }

    return { rendered: rendered, skipped: skipped, themes: themes };
  }

  function boot() {
    if (!api) {
      // Without the preload bridge there is no way to tell the main process
      // anything, so all this can do is say so on a page nobody is looking at.
      // main.cjs has its own timer for exactly this case.
      logEl.textContent = 'The preload bridge did not load: window.mbmRender is missing.';
      return;
    }
    run().then(function (summary) {
      return api.done(summary);
    }, function (err) {
      say(String(err && err.message ? err.message : err), 'bad');
      return api.fail(err && err.stack ? err.stack : String(err));
    });
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
