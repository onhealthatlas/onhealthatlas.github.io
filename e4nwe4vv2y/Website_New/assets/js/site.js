/* Ontario Reality Check: small features used on several pages. */
(function () {
  var FR = (document.documentElement.lang || '').slice(0, 2) === 'fr';

  // "Copy link to this map" (map pages)
  var copy = document.getElementById('copy-link');
  if (copy) {
    if (!navigator.clipboard || !window.isSecureContext) copy.hidden = true;
    else {
      var label = copy.textContent;
      copy.addEventListener('click', function () {
        navigator.clipboard.writeText(window.location.href.split('#')[0]).then(function () {
          copy.textContent = copy.getAttribute('data-done');
          setTimeout(function () { copy.textContent = label; }, 2500);
        });
      });
    }
  }

  // Links marked data-focus-search (e.g. "Search your riding"): bring the map into view and put the cursor in its
  // search box. The map listens for the message (see the map's own index.html).
  Array.prototype.forEach.call(document.querySelectorAll('[data-focus-search]'), function (link) {
    link.addEventListener('click', function (e) {
      var frame = document.querySelector('.map-frame iframe');
      if (!frame) return;
      e.preventDefault();
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      frame.parentNode.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () {
        try { frame.contentWindow.postMessage({ type: 'map:focus-search' }, '*'); } catch (err) { /* map not ready */ }
      }, reduce ? 0 : 450);
    });
  });

  // Email sign-up form. Not connected to a mailing service until data-endpoint is filled in (see README.md).
  var S = FR ? {
    email: 'Entrez votre adresse courriel, comme nom@exemple.ca.',
    consent: 'Cochez la case pour confirmer que vous voulez recevoir ces courriels.',
    notYet: 'Merci! Les inscriptions ne sont pas encore ouvertes. Revenez bientôt.',
    sent: 'Merci! Surveillez vos courriels pour confirmer votre inscription.'
  } : {
    email: 'Enter your email address, like name@example.com.',
    consent: 'Tick the box to confirm you’d like these emails.',
    notYet: 'Thanks! Sign-up isn’t open yet. Please check back soon.',
    sent: 'Thanks! Check your email to confirm your sign-up.'
  };
  Array.prototype.forEach.call(document.querySelectorAll('form[data-signup]'), function (form) {
    var status = form.querySelector('.form-status');
    var email = form.querySelector('input[type="email"]');
    var consent = form.querySelector('input[name="consent"]');
    function say(text, isError, focus) {
      status.textContent = text;
      status.classList.toggle('is-error', !!isError);
      if (focus) focus.focus();
    }
    form.addEventListener('submit', function (e) {
      var endpoint = (form.getAttribute('data-endpoint') || '').trim();
      if (!email.value.trim() || !email.checkValidity()) { e.preventDefault(); say(S.email, true, email); return; }
      if (!consent.checked) { e.preventDefault(); say(S.consent, true, consent); return; }
      if (!endpoint) { e.preventDefault(); say(S.notYet); return; }
      // Connected: post the address to the mailing service (it opens in a new tab and handles confirmation).
      email.name = form.getAttribute('data-field') || 'email';
      form.action = endpoint;
      form.method = 'post';
      form.target = '_blank';
      consent.removeAttribute('name');            // the service only needs the address
      setTimeout(function () { consent.setAttribute('name', 'consent'); }, 0);
      say(S.sent);
    });
  });
})();
