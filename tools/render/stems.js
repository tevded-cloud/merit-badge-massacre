// Merit Badge Massacre: the stem length rules for the music harness.
//
// Loaded as a classic script inside the render page and as a CommonJS module by
// selftest.cjs. No Web Audio API use in here on purpose: everything takes plain
// arrays or an AudioBuffer shaped object, so all of it is testable in node.
//
// Why any of this exists: the game crossfades stems of one theme against each
// other. If two stems of a theme differ by even one sample they drift apart a
// little further on every loop, and after ten minutes the drums are ahead of
// the melody. So the loop length is computed once per theme and every layer is
// held to it exactly.
'use strict';

var MBMStems = (function () {
  // Exact loop length in samples. Rounded once, here, and then reused for every
  // layer, so any rounding error is shared instead of accumulating per layer.
  function themeSampleCount(comp, sampleRate) {
    var bars = Number(comp.bars);
    var beatsPerBar = Number(comp.beatsPerBar || 4);
    var bpm = Number(comp.bpm);
    if (!(bars > 0) || !(beatsPerBar > 0) || !(bpm > 0)) {
      throw new Error('MBMStems: theme "' + comp.id + '" needs positive bpm, bars and beatsPerBar');
    }
    return Math.round(bars * beatsPerBar * (60 / bpm) * sampleRate);
  }

  // Extra samples rendered past the loop so reverb and release tails exist.
  function tailSampleCount(comp, sampleRate) {
    var seconds = comp.tailSeconds === undefined ? 2.5 : Number(comp.tailSeconds);
    if (!(seconds >= 0)) throw new Error('MBMStems: theme "' + comp.id + '" has a bad tailSeconds');
    return Math.round(seconds * sampleRate);
  }

  // Folds the tail back onto the head and returns exactly loopLength frames.
  //
  // A loop that just stops at the loop point clips its own reverb, and you hear
  // the seam every time round. A loop that is actually playing forever has the
  // previous pass's tail sounding over its own opening bar, so that is what
  // this builds: render loop + tail, then add the tail region onto the start.
  function foldTail(buffer, loopLength) {
    var total = buffer.length;
    if (loopLength > total) {
      throw new Error('MBMStems: loop length ' + loopLength + ' exceeds rendered length ' + total);
    }
    var tail = total - loopLength;
    var out = [];
    var peak = 0;
    for (var ch = 0; ch < buffer.numberOfChannels; ch++) {
      var src = buffer.getChannelData(ch);
      var dst = new Float32Array(loopLength);
      for (var i = 0; i < loopLength; i++) dst[i] = src[i];
      for (var j = 0; j < tail; j++) dst[j % loopLength] += src[loopLength + j];
      for (var k = 0; k < loopLength; k++) {
        var a = dst[k] < 0 ? -dst[k] : dst[k];
        if (a > peak) peak = a;
      }
      out.push(dst);
    }
    return { channels: out, length: loopLength, tail: tail, peak: peak };
  }

  function toDb(x) {
    return x > 0 ? 20 * Math.log10(x) : -Infinity;
  }

  // Hard fail if a theme's layers disagree, naming every layer and its count.
  // layers: [{ id, length }]. expected is optional.
  function assertSameLength(themeId, layers, expected) {
    if (!layers || !layers.length) throw new Error('MBMStems: theme "' + themeId + '" rendered no layers');
    var target = expected === undefined ? layers[0].length : expected;
    var bad = [];
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].length !== target) bad.push(layers[i]);
    }
    if (bad.length) {
      var lines = layers.map(function (l) {
        return '    ' + l.id + ': ' + l.length + ' samples' + (l.length === target ? '' : '  <-- wrong');
      }).join('\n');
      throw new Error(
        'Theme "' + themeId + '": layer sample counts do not match.\n' +
        '  every layer of a theme must be exactly ' + target + ' samples, because the game\n' +
        '  crossfades them against each other and any difference drifts on every loop.\n' +
        lines
      );
    }
    return target;
  }

  // assets/music/<theme>_<layer>.<hash8>.webm, and <theme>_<layer>.wav in staging
  function wavName(themeId, layerId) {
    return themeId + '_' + layerId + '.wav';
  }

  function assetName(themeId, layerId, hash8) {
    return themeId + '_' + layerId + '.' + hash8 + '.webm';
  }

  // base carries the drums, so it gets the bitrate. The rest are support.
  function bitrateFor(layerId) {
    return layerId === 'base' ? 96 : 64;
  }

  return {
    themeSampleCount: themeSampleCount,
    tailSampleCount: tailSampleCount,
    foldTail: foldTail,
    assertSameLength: assertSameLength,
    toDb: toDb,
    wavName: wavName,
    assetName: assetName,
    bitrateFor: bitrateFor,
  };
})();

if (typeof window !== 'undefined') window.MBMStems = MBMStems;
if (typeof module !== 'undefined' && module.exports) module.exports = MBMStems;
