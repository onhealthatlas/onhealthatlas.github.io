/* Lets a map fit its frame on phones, so the page scrolls straight past it.

   A map page that supports this (the family doctors map does) grows to its full height on narrow screens
   and reports that height; this script sets the frame to match. Readers then scroll through the map
   like any other part of the page, instead of scrolling inside the frame first. On wider screens the
   map reports no height, and the frame keeps its usual size from style.css.

   To use it on a map page: add data-fit-height to the <iframe>, and load this file at the end of the page:
     <script src="../../assets/js/map-frame.js"></script>
   Maps that don't support it simply ignore it. */
(function () {
  var frames = Array.prototype.slice.call(document.querySelectorAll('iframe[data-fit-height]'));
  if (!frames.length) return;

  // The screen height the map's own height is based on. 100svh is the visible height with the browser's
  // toolbars showing, which doesn't change as they slide away while scrolling (window.innerHeight does,
  // and the map would jump in size while people scroll).
  var probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  function screenHeight() { return probe.offsetHeight || window.innerHeight; }

  function ask(frame) {   // tell the map to fit its frame
    if (frame.contentWindow) frame.contentWindow.postMessage({ type: 'map:fit-height', viewportHeight: screenHeight() }, '*');
  }
  function frameFor(source) {
    for (var i = 0; i < frames.length; i++) if (frames[i].contentWindow === source) return frames[i];
    return null;
  }

  window.addEventListener('message', function (e) {
    var frame = frameFor(e.source), d = e.data;
    if (!frame || !d || typeof d !== 'object') return;
    if (d.type === 'map:ready') ask(frame);
    else if (d.type === 'map:height') {
      if (typeof d.height === 'number' && d.height > 0 && d.height < 50000) {
        frame.style.height = Math.ceil(d.height) + 'px';
        frame.style.minHeight = '0';
      } else {   // wider screens: back to the size in style.css
        frame.style.height = '';
        frame.style.minHeight = '';
      }
    }
  });
  frames.forEach(function (frame) { frame.addEventListener('load', function () { ask(frame); }); ask(frame); });

  var last = screenHeight();   // turning the phone around changes the screen height
  window.addEventListener('resize', function () {
    var h = screenHeight();
    if (h !== last) { last = h; frames.forEach(ask); }
  });
})();
