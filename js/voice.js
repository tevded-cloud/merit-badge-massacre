// Merit Badge Massacre: spoken barks. Reports unavailable, so every caller
// falls through to the text bark.
'use strict';

const Voice = {
  available: false,
  speak(sp, text, o) { return null; },
  stop() {},
  preload(sp) { return Promise.resolve(); },
};
