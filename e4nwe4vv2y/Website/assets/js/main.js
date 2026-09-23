/* Ontario Insights — search and topic filters for the map list. */
(function () {
  var catalogue = document.getElementById('maps');
  if (!catalogue) return;

  var input = document.getElementById('map-search');
  var chips = Array.prototype.slice.call(catalogue.querySelectorAll('.chip'));
  var topics = Array.prototype.slice.call(catalogue.querySelectorAll('.topic'));
  var count = document.getElementById('result-count');
  var empty = document.getElementById('no-results');
  var emptyTerm = document.getElementById('no-results-term');
  var clearBtn = document.getElementById('clear-search');
  var activeTopic = 'all';

  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function apply() {
    var q = norm(input.value.trim());
    var words = q ? q.split(/\s+/) : [];
    var shown = 0;

    topics.forEach(function (topic) {
      var topicMatch = activeTopic === 'all' || topic.getAttribute('data-topic') === activeTopic;
      var visibleInTopic = 0;
      topic.querySelectorAll('.map-item').forEach(function (item) {
        var hay = norm(item.textContent + ' ' + (item.getAttribute('data-keywords') || ''));
        var ok = topicMatch && words.every(function (w) { return hay.indexOf(w) !== -1; });
        item.hidden = !ok;
        if (ok) {
          visibleInTopic++;
          if (!item.classList.contains('is-soon')) shown++;
        }
      });
      topic.hidden = visibleInTopic === 0;
    });

    var filtered = q || activeTopic !== 'all';
    count.textContent = filtered ? 'Showing ' + shown + (shown === 1 ? ' map' : ' maps') : '';
    var none = topics.every(function (t) { return t.hidden; });
    empty.hidden = !none;
    if (none) emptyTerm.textContent = input.value.trim() ? '“' + input.value.trim() + '”' : 'this topic';
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeTopic = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      apply();
    });
  });

  input.addEventListener('input', apply);

  clearBtn.addEventListener('click', function () {
    input.value = '';
    activeTopic = 'all';
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-filter') === 'all' ? 'true' : 'false'); });
    apply();
    input.focus();
  });

  // Allow links like index.html?q=rent or #maps?topic=health to pre-filter.
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get('q')) input.value = params.get('q');
    var t = params.get('topic');
    if (t) chips.forEach(function (c) { if (c.getAttribute('data-filter') === t) c.click(); });
  } catch (e) { /* older browser: no pre-filter */ }

  apply();
})();
