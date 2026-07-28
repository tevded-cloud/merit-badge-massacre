// Merit Badge Massacre: a fake Web Audio graph, for testing compositions in node.
//
// Electron cannot be launched from every environment the code gets edited in,
// but a composition is just a function that builds a graph, so the graph can be
// built against a stand in and inspected. This does not make a sound. What it
// catches is everything that would otherwise only surface as a red line in the
// render page: a helper that does not exist, a note name with a typo, a NaN
// where a time should be, an exponential ramp to zero (which real Web Audio
// throws on), a stop before a start.
//
// Used by selftest.cjs. Nothing ships this.
'use strict';

function isTime(t) { return typeof t === 'number' && isFinite(t) && t >= 0; }
function isNum(v) { return typeof v === 'number' && isFinite(v); }

function makeContext(opts) {
  opts = opts || {};
  const ctx = {
    sampleRate: opts.sampleRate || 48000,
    currentTime: 0,
    length: opts.length || 0,
    problems: [],
    stats: { nodes: 0, oscillators: 0, sources: 0, params: 0, maxTime: 0, buffers: 0, bufferSamples: 0 },
  };

  function fail(message) { ctx.problems.push(message); }
  function seeTime(t) { if (isTime(t) && t > ctx.stats.maxTime) ctx.stats.maxTime = t; }

  function param(owner, name, value, o) {
    o = o || {};
    ctx.stats.params++;
    const p = {
      __param: true,
      __owner: owner,
      __name: name,
      value: value,
      events: [],
      setValueAtTime(v, t) {
        if (!isNum(v)) fail(owner + '.' + name + '.setValueAtTime got a bad value: ' + v);
        if (!isTime(t)) fail(owner + '.' + name + '.setValueAtTime got a bad time: ' + t);
        if (o.positive && v <= 0) fail(owner + '.' + name + ' set to ' + v + ', must be positive');
        seeTime(t);
        p.events.push(['set', v, t]);
        return p;
      },
      linearRampToValueAtTime(v, t) {
        if (!isNum(v)) fail(owner + '.' + name + '.linearRamp got a bad value: ' + v);
        if (!isTime(t)) fail(owner + '.' + name + '.linearRamp got a bad time: ' + t);
        seeTime(t);
        p.events.push(['lin', v, t]);
        return p;
      },
      exponentialRampToValueAtTime(v, t) {
        // real Web Audio throws RangeError on a zero or negative target
        if (!isNum(v) || v === 0) fail(owner + '.' + name + '.exponentialRamp to ' + v + ' is illegal');
        if (!isTime(t)) fail(owner + '.' + name + '.exponentialRamp got a bad time: ' + t);
        seeTime(t);
        p.events.push(['exp', v, t]);
        return p;
      },
      setTargetAtTime(v, t, tau) {
        if (!isNum(v)) fail(owner + '.' + name + '.setTargetAtTime got a bad value: ' + v);
        if (!isTime(t)) fail(owner + '.' + name + '.setTargetAtTime got a bad time: ' + t);
        if (!isNum(tau) || tau <= 0) fail(owner + '.' + name + '.setTargetAtTime got a bad tau: ' + tau);
        seeTime(t);
        p.events.push(['target', v, t]);
        return p;
      },
      cancelScheduledValues(t) { seeTime(t); return p; },
    };
    return p;
  }

  function node(kind) {
    ctx.stats.nodes++;
    return {
      context: ctx,
      __kind: kind,
      __in: 0,
      __out: [],
      connect(target) {
        if (!target || (!target.__kind && !target.__param)) {
          fail(kind + '.connect() got something that is not a node or a param');
          return target;
        }
        if (target.__kind) target.__in++;
        this.__out.push(target);
        return target;
      },
      disconnect() {},
    };
  }

  ctx.destination = node('destination');

  ctx.createGain = function () {
    const n = node('gain');
    n.gain = param('gain', 'gain', 1);
    return n;
  };

  ctx.createStereoPanner = function () {
    const n = node('panner');
    n.pan = param('panner', 'pan', 0);
    return n;
  };

  ctx.createBiquadFilter = function () {
    const n = node('biquad');
    n.type = 'lowpass';
    n.frequency = param('biquad', 'frequency', 350, { positive: true });
    n.Q = param('biquad', 'Q', 1);
    n.gain = param('biquad', 'gain', 0);
    n.detune = param('biquad', 'detune', 0);
    return n;
  };

  ctx.createWaveShaper = function () {
    const n = node('shaper');
    n.curve = null;
    n.oversample = 'none';
    return n;
  };

  ctx.createConvolver = function () {
    const n = node('convolver');
    n.buffer = null;
    n.normalize = true;
    return n;
  };

  ctx.createDelay = function (max) {
    if (max !== undefined && (!isNum(max) || max <= 0)) fail('createDelay got a bad max: ' + max);
    const n = node('delay');
    n.__max = max === undefined ? 1 : max;
    n.delayTime = param('delay', 'delayTime', 0);
    return n;
  };

  ctx.createOscillator = function () {
    const n = node('oscillator');
    ctx.stats.oscillators++;
    n.type = 'sine';
    n.frequency = param('oscillator', 'frequency', 440);
    n.detune = param('oscillator', 'detune', 0);
    n.__started = null;
    n.start = function (t) {
      const at = t === undefined ? 0 : t;
      if (!isTime(at)) { fail('oscillator.start got a bad time: ' + at); return; }
      if (n.__started !== null) fail('oscillator started twice');
      n.__started = at;
      seeTime(at);
    };
    n.stop = function (t) {
      const at = t === undefined ? 0 : t;
      if (!isTime(at)) { fail('oscillator.stop got a bad time: ' + at); return; }
      if (n.__started === null) fail('oscillator stopped without being started');
      else if (at < n.__started) fail('oscillator stops at ' + at + ' before it starts at ' + n.__started);
      seeTime(at);
    };
    return n;
  };

  ctx.createBufferSource = function () {
    const n = node('source');
    ctx.stats.sources++;
    n.buffer = null;
    n.loop = false;
    n.loopStart = 0;
    n.loopEnd = 0;
    n.playbackRate = param('source', 'playbackRate', 1);
    n.detune = param('source', 'detune', 0);
    n.__started = null;
    n.start = function (t, offset) {
      const at = t === undefined ? 0 : t;
      if (!isTime(at)) { fail('source.start got a bad time: ' + at); return; }
      if (offset !== undefined && !isTime(offset)) fail('source.start got a bad offset: ' + offset);
      if (!n.buffer) fail('source started with no buffer');
      else if (offset !== undefined && offset >= n.buffer.duration && !n.loop) {
        fail('source starts at offset ' + offset.toFixed(3) + ' s in a buffer only ' +
          n.buffer.duration.toFixed(3) + ' s long, so it plays nothing');
      }
      n.__started = at;
      seeTime(at);
    };
    n.stop = function (t) {
      const at = t === undefined ? 0 : t;
      if (!isTime(at)) { fail('source.stop got a bad time: ' + at); return; }
      if (n.__started === null) fail('source stopped without being started');
      else if (at < n.__started) fail('source stops at ' + at + ' before it starts at ' + n.__started);
      seeTime(at);
    };
    return n;
  };

  ctx.createBuffer = function (channels, length, sampleRate) {
    if (!(channels > 0) || !(length > 0) || !(sampleRate > 0)) {
      fail('createBuffer(' + channels + ', ' + length + ', ' + sampleRate + ') is not valid');
      return null;
    }
    ctx.stats.buffers++;
    ctx.stats.bufferSamples += channels * length;
    const data = [];
    for (let c = 0; c < channels; c++) data.push(new Float32Array(length));
    return {
      numberOfChannels: channels,
      length: length,
      sampleRate: sampleRate,
      duration: length / sampleRate,
      getChannelData: (c) => data[c],
    };
  };

  return ctx;
}

module.exports = { makeContext };
