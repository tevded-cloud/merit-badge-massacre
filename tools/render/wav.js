// Merit Badge Massacre: 16 bit WAV writer and reader for the music harness.
//
// Loaded two ways on purpose: as a classic script inside the render page, and
// as a CommonJS module by encode.cjs and selftest.cjs. Keep it dependency free
// and keep both entry points working.
'use strict';

var MBMWav = (function () {
  // mulberry32 again: the dither has to be repeatable or two renders of the
  // same composition would produce different files and the render cache would
  // be lying about what changed.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function writeAscii(view, offset, text) {
    for (var i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  }

  // channels: array of Float32Array (or plain arrays), all the same length.
  // opts: { sampleRate, dither }  dither is TPDF at one LSB, on by default.
  // Returns a Uint8Array holding a complete RIFF/WAVE file.
  function encodeWav(channels, opts) {
    opts = opts || {};
    if (!channels || !channels.length) throw new Error('encodeWav: no channels');
    var numCh = channels.length;
    var frames = channels[0].length;
    for (var c = 1; c < numCh; c++) {
      if (channels[c].length !== frames) {
        throw new Error('encodeWav: channel ' + c + ' has ' + channels[c].length +
          ' frames, channel 0 has ' + frames);
      }
    }
    var sampleRate = opts.sampleRate || 48000;
    var bytesPerSample = 2;
    var blockAlign = numCh * bytesPerSample;
    var dataBytes = frames * blockAlign;
    var buf = new ArrayBuffer(44 + dataBytes);
    var view = new DataView(buf);

    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);          // PCM chunk size
    view.setUint16(20, 1, true);           // format: PCM
    view.setUint16(22, numCh, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 8 * bytesPerSample, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataBytes, true);

    var dither = opts.dither === undefined ? true : !!opts.dither;
    var r = rng(opts.seed === undefined ? 0x00D1DDE7 : opts.seed);
    var off = 44;
    for (var i = 0; i < frames; i++) {
      for (var ch = 0; ch < numCh; ch++) {
        var s = channels[ch][i];
        if (!(s === s)) s = 0; // NaN guard: one bad sample must not poison the file
        var q = s * 32767;
        // triangular dither, one LSB peak to peak, decorrelates the truncation
        if (dither) q += (r() + r() - 1);
        q = Math.round(q);
        if (q > 32767) q = 32767;
        if (q < -32768) q = -32768;
        view.setInt16(off, q, true);
        off += 2;
      }
    }
    return new Uint8Array(buf);
  }

  function readAscii(view, offset, len) {
    var s = '';
    for (var i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
    return s;
  }

  // Reads the header of a RIFF/WAVE file and reports what is actually in it.
  // Chunk walking, not a fixed 44 byte assumption, so a file written by ffmpeg
  // or anything else with extra chunks still reads correctly.
  function readWavInfo(bytes) {
    var view = bytes instanceof DataView
      ? bytes
      : new DataView(bytes.buffer || bytes, bytes.byteOffset || 0, bytes.byteLength || bytes.length);
    if (view.byteLength < 12) throw new Error('readWavInfo: file too short');
    if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') {
      throw new Error('readWavInfo: not a RIFF/WAVE file');
    }
    var pos = 12;
    var fmt = null;
    var dataBytes = null;
    while (pos + 8 <= view.byteLength) {
      var id = readAscii(view, pos, 4);
      var size = view.getUint32(pos + 4, true);
      var body = pos + 8;
      if (id === 'fmt ' && size >= 16) {
        fmt = {
          format: view.getUint16(body, true),
          channels: view.getUint16(body + 2, true),
          sampleRate: view.getUint32(body + 4, true),
          bitsPerSample: view.getUint16(body + 14, true),
        };
      } else if (id === 'data') {
        dataBytes = Math.min(size, view.byteLength - body);
        // a truncated file is worth knowing about, so record both
        if (size > view.byteLength - body) dataBytes = view.byteLength - body;
      }
      pos = body + size + (size % 2);
    }
    if (!fmt) throw new Error('readWavInfo: no fmt chunk');
    if (dataBytes === null) throw new Error('readWavInfo: no data chunk');
    var blockAlign = fmt.channels * (fmt.bitsPerSample / 8);
    if (!blockAlign) throw new Error('readWavInfo: zero block align');
    return {
      channels: fmt.channels,
      sampleRate: fmt.sampleRate,
      bitsPerSample: fmt.bitsPerSample,
      dataBytes: dataBytes,
      samples: Math.floor(dataBytes / blockAlign),
      seconds: Math.floor(dataBytes / blockAlign) / fmt.sampleRate,
    };
  }

  return { encodeWav: encodeWav, readWavInfo: readWavInfo };
})();

if (typeof window !== 'undefined') window.MBMWav = MBMWav;
if (typeof module !== 'undefined' && module.exports) module.exports = MBMWav;
