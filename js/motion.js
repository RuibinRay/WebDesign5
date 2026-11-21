/*
 * Motion setting, read before the page paints.
 * Full motion by default on desktop (the brand is the motion). Phones and tablets
 * follow the system "reduce motion" switch. A visitor's own choice, made with the
 * footer button, is remembered and always wins.
 */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  var saved = null;
  try { saved = localStorage.getItem('kalypt.motion'); } catch (e) {}
  var touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var sysReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (saved === 'reduce' || (saved === null && touch && sysReduce)) d.classList.add('reduce');
  /* ?sync: testing aid for background tabs, where animation frames never fire */
  if (/[?&]sync\b/.test(location.search)) {
    /* every error from the first moment is kept in window.__errs */
    window.__errs = [];
    window.addEventListener('error', function (e) { window.__errs.push(e.message + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno); });
    window.requestAnimationFrame = function (f) { return setTimeout(function () { f(performance.now()); }, 16); };
    window.cancelAnimationFrame = clearTimeout;
  }
})();
