/**
 * HA Tools — Email & Reports — bundle loader.
 * Loads each contained tool from /local/community/ha-tools-email-reports/.
 */
(function() {
  var BASE = '/local/community/ha-tools-email-reports/';
  var BUST = '?_=' + Date.now();
  function load(file) {
    return new Promise(function(resolve) {
      var s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = BASE + file + BUST;
      s.onload = function() { resolve(file); };
      s.onerror = function() { console.warn('[ha-tools-email-reports] failed: ' + file); resolve(null); };
      document.head.appendChild(s);
    });
  }
  var FILES = ["ha-energy-email.js", "ha-log-email.js", "ha-smart-reports.js"];
  Promise.all(FILES.map(load)).then(function(r) {
    var ok = r.filter(Boolean).length;
    console.info('%c HA Tools — Email & Reports %c v4.0.0 — ' + ok + '/' + FILES.length + ' loaded',
      'background:#3b82f6;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px 0 0 4px;',
      'background:#e0f2fe;color:#1e40af;font-weight:bold;padding:2px 6px;border-radius:0 4px 4px 0;');
  });
})();
