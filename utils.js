// utils.js
(function (global) {
  'use strict';
  function rand(n, m){ return Math.floor(Math.random()*(m-n+1))+n; }
  function choice(a){ return a[Math.floor(Math.random()*a.length)]; }
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
  function id(){ return Math.random().toString(36).slice(2, 10); }
  function avg(a){ return a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0; }
  function pct(rec){ var w=+rec.w||0, l=+rec.l||0, t=+rec.t||0; var g=w+l+t; return g ? (w + 0.5*t)/g : 0; }

  global.Utils = { rand, choice, clamp, id, avg, pct };
})(window);
