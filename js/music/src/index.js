// Merit Badge Massacre: the source list for the music render harness.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file.
// tools/render/main.cjs requires it to know which files to hash and hand to the
// render page; tools/render/index.html has the page load them in this order.
//
// helpers load first and register shared globals (MBMSynth).
// compositions load second and each push one object onto MBM_COMPOSITIONS.
'use strict';

var MBM_MUSIC_SOURCES = {
  helpers: [
    'synth.js',
  ],
  compositions: [
    'act1.js',
    'camp.js',
  ],
};

if (typeof window !== 'undefined') window.MBM_MUSIC_SOURCES = MBM_MUSIC_SOURCES;
if (typeof module !== 'undefined' && module.exports) module.exports = MBM_MUSIC_SOURCES;
