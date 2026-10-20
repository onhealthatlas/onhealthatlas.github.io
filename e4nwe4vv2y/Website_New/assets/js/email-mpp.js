/* Ontario Reality Check: "Email your MPP" (email-your-mpp.html).
   Everything happens in the visitor's browser. Nothing they type is sent anywhere or stored: the message opens in
   their own email app, or they copy it. The data (MPPs, riding figures, postal areas) is in assets/data/mpps.js. */
(function () {
  var D = window.MPP_DATA;
  var tool = document.getElementById('mpp-tool');
  if (!D || !tool) return;

  var FR = (document.documentElement.lang || '').slice(0, 2) === 'fr';
  var LOC = FR ? 'fr-CA' : 'en-CA';
  var NB = ' ';
  var S = FR ? {
    invalid: 'Entrez un code postal, comme M3C' + NB + '1A1.',
    notOntario: 'Ce code postal ne semble pas être en Ontario. Les codes postaux de l’Ontario commencent par K, L, M, N ou P.',
    notFound: 'Nous n’avons pas pu associer ce code postal à une circonscription. Choisissez votre circonscription dans la liste ci-dessous.',
    split: function (fsa) { return 'Le secteur postal ' + fsa + ' est partagé entre plusieurs circonscriptions. Choisissez la vôtre' + NB + ':'; },
    share: function (p) { return p < 1 ? 'moins de 1' + NB + '% des résidents' : 'environ ' + p + NB + '% des résidents'; },
    yourMpp: function (g) { return g === 'f' ? 'Votre députée' : g === 'm' ? 'Votre député' : 'Votre membre de l’Assemblée législative'; },
    mppFor: function (r) { return 'Circonscription' + NB + ': ' + r; },
    copy: 'Copier', copied: 'Copié', copyFailed: 'Impossible de copier. Sélectionnez le texte et copiez-le vous-même.',
    yourName: '[Votre nom]'
  } : {
    invalid: 'Enter a postal code, like M3C 1A1.',
    notOntario: 'That doesn’t look like an Ontario postal code. Ontario postal codes start with K, L, M, N or P.',
    notFound: 'We couldn’t match that postal code to a riding. Choose your riding from the list below.',
    split: function (fsa) { return 'The postal area ' + fsa + ' is split between ridings. Choose yours:'; },
    share: function (p) { return p < 1 ? 'under 1% of residents' : 'about ' + p + '% of residents'; },
    yourMpp: function () { return 'Your MPP'; },
    mppFor: function (r) { return 'MPP for ' + r; },
    copy: 'Copy', copied: 'Copied', copyFailed: 'Couldn’t copy. Select the text and copy it yourself.',
    yourName: '[Your name]'
  };

  var $ = function (id) { return document.getElementById(id); };
  var postalForm = $('postal-form'), postal = $('postal'), postalMsg = $('postal-msg'), select = $('riding');
  var choices = $('choices'), result = $('mpp-result'), compose = $('compose');
  var toLine = $('to-line'), ccList = $('cc-list'), sender = $('sender'), subject = $('subject'), message = $('message');
  var mailto = $('mailto'), copyStatus = tool.querySelector('.copy-status');
  var current = null, postalCode = '', dirty = false;

  function rname(r) { return FR ? r.fr : r.en; }
  function shownName(r) { return FR ? r.mpp.replace(/^Hon\.\s+/, 'L’hon. ') : r.mpp; }
  function plainName(r) { return r.mpp.replace(/^Hon\.\s+/, ''); }
  function de(n) { return /^[aeiouéèêîôœ]/i.test(n) ? 'd’' + n : 'de ' + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---- the riding list ----
  Object.keys(D.ridings)
    .sort(function (a, b) { return rname(D.ridings[a]).localeCompare(rname(D.ridings[b]), LOC); })
    .forEach(function (id) {
      var o = document.createElement('option');
      o.value = id; o.textContent = rname(D.ridings[id]);
      select.appendChild(o);
    });

  // ---- the copied addresses (ticked by default) ----
  D.cc.forEach(function (c, i) {
    var label = document.createElement('label');
    label.className = 'cc-item';
    label.innerHTML = '<input type="checkbox" checked data-cc="' + esc(c.email) + '"> <span>' + esc(FR ? c.fr : c.en) +
      ' <span class="addr">' + esc(c.email) + '</span></span>';
    ccList.appendChild(label);
  });
  ccList.addEventListener('change', updateMailto);

  // ---- the suggested message ----
  function buildSubject(r) {
    return FR ? 'L’accès aux médecins de famille dans la circonscription ' + de(r.fr) : 'Access to family doctors in ' + r.en;
  }
  function signature() {
    var name = sender.value.trim() || S.yourName;
    return name + (postalCode ? '\n' + postalCode : '');
  }
  function buildMessage(r) {
    var R = rname(r), parts;
    if (FR) {
      var hello = r.g === 'm' ? 'Monsieur le député,' : r.g === 'f' ? 'Madame la députée,' : 'Bonjour ' + plainName(r) + ',';
      var facts = 'En Ontario, 4,3' + NB + 'millions de personnes ne sont inscrites auprès d’aucun médecin de famille. ' +
        (r.d60 != null ? 'Dans notre circonscription, environ ' + r.d60 + NB + '% des médecins de famille qui y pratiquent ont 60' + NB +
          'ans ou plus, et bon nombre d’entre eux prendront leur retraite au cours des prochaines années. ' :
          'De nombreux médecins de famille approchent de la retraite. ') +
        '(Source' + NB + ': Ontario Rostering Physician and Patient Counts Report, janvier 2026.)';
      parts = [hello,
        'J’habite dans la circonscription ' + de(R) + ' et je vous écris au sujet de l’accès aux médecins de famille dans notre collectivité.',
        facts,
        'Le premier ministre a promis de rattacher chaque personne en Ontario à un médecin de famille ou à une équipe de soins ' +
        'primaires. Que faites-vous pour que les gens de notre circonscription puissent avoir un médecin de famille, et quand ' +
        'pouvons-nous nous attendre à des résultats?',
        'Dans l’attente de votre réponse, je vous prie d’agréer mes salutations distinguées.',
        signature()];
    } else {
      var factsEn = 'Across Ontario, 4.3 million people are not registered with a family doctor. ' +
        (r.d60 != null ? 'In ' + R + ', about ' + r.d60 + '% of the family doctors who practise in the riding are 60 or older, ' +
          'and many of them will retire in the next few years. ' : 'Many family doctors are close to retirement. ') +
        '(Source: Ontario Rostering Physician and Patient Counts Report, January 2026.)';
      parts = ['Dear ' + plainName(r) + ',',
        'I live in ' + R + ', and I’m writing about access to family doctors in our community.',
        factsEn,
        'The Premier has promised to connect everyone in Ontario to a family doctor or primary care team. What are you doing ' +
        'to make sure people in ' + R + ' can get a family doctor, and when can we expect results?',
        'I look forward to your reply.',
        'Sincerely,\n' + signature()];
    }
    return parts.join('\n\n');
  }

  function fill() {
    if (!current) return;
    subject.value = buildSubject(current);
    message.value = buildMessage(current);
    dirty = false;
    updateMailto();
  }

  function ccChecked() {
    return Array.prototype.slice.call(ccList.querySelectorAll('input:checked')).map(function (i) { return i.getAttribute('data-cc'); });
  }
  function updateMailto() {
    if (!current) return;
    var q = [];
    var cc = ccChecked();
    if (cc.length) q.push('cc=' + cc.join(','));
    q.push('subject=' + encodeURIComponent(subject.value));
    q.push('body=' + encodeURIComponent(message.value.replace(/\r?\n/g, '\r\n')));
    mailto.href = 'mailto:' + current.email + '?' + q.join('&');
  }

  // ---- choosing a riding ----
  function choose(id, fromSelect) {
    var r = D.ridings[id];
    if (!r) return;
    current = r;
    if (!fromSelect) select.value = id;
    result.innerHTML = '<p class="mpp-label">' + esc(S.yourMpp(r.g)) + '</p>' +
      '<p class="mpp-name">' + esc(shownName(r)) + '</p>' +
      '<p class="mpp-riding">' + esc(S.mppFor(rname(r))) + '</p>';
    result.hidden = false;
    toLine.innerHTML = '<span>' + esc(shownName(r)) + ' <span class="addr">' + esc(r.email) + '</span></span>';
    compose.hidden = false;
    fill();
  }

  function showChoices(fsa, parts) {
    choices.innerHTML = '';
    var p = document.createElement('p');
    p.textContent = S.split(fsa);
    choices.appendChild(p);
    parts.forEach(function (part) {
      var r = D.ridings[part[0]];
      if (!r) return;
      var label = document.createElement('label');
      label.className = 'choice';
      label.innerHTML = '<input type="radio" name="riding-choice" value="' + part[0] + '"> <span>' + esc(rname(r)) +
        ' <span class="share">(' + esc(S.share(part[1])) + ')</span></span>';
      choices.appendChild(label);
    });
    choices.hidden = false;
  }
  choices.addEventListener('change', function (e) { if (e.target.name === 'riding-choice') choose(e.target.value); });

  function lookUp() {
    var code = postal.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    postalMsg.textContent = '';
    postal.removeAttribute('aria-invalid');
    choices.hidden = true;
    // a new search starts afresh: hide any MPP found earlier
    current = null; result.hidden = true; compose.hidden = true; select.value = '';
    if (!/^[A-Z]\d[A-Z]/.test(code)) { postalMsg.textContent = S.invalid; postal.setAttribute('aria-invalid', 'true'); postal.focus(); return; }
    if ('KLMNP'.indexOf(code[0]) === -1) { postalMsg.textContent = S.notOntario; postal.setAttribute('aria-invalid', 'true'); postal.focus(); return; }
    postalCode = /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(code) ? code.slice(0, 3) + ' ' + code.slice(3) : '';
    if (postalCode) postal.value = postalCode;
    var fsa = code.slice(0, 3), parts = D.fsa[fsa];
    if (!parts || !parts.length) { postalMsg.textContent = S.notFound; select.focus(); return; }
    if (parts.length === 1) { choose(parts[0][0]); result.focus(); return; }
    showChoices(fsa, parts);
    var first = choices.querySelector('input');
    if (first) first.focus();
  }
  postalForm.addEventListener('submit', function (e) { e.preventDefault(); lookUp(); });
  select.addEventListener('change', function () {
    if (!select.value) return;
    choices.hidden = true;
    choose(select.value, true);
  });

  // ---- editing ----
  message.addEventListener('input', function () { dirty = true; updateMailto(); });
  subject.addEventListener('input', updateMailto);
  sender.addEventListener('input', function () {
    if (!current) return;
    if (!dirty) { message.value = buildMessage(current); updateMailto(); }
  });
  $('reset-message').addEventListener('click', fill);

  // ---- copying (for webmail) ----
  function copyText(text, done) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }
  tool.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b || !current) return;
    var what = b.getAttribute('data-copy');
    var text = what === 'to' ? current.email : what === 'cc' ? ccChecked().join(', ') : what === 'subject' ? subject.value : message.value;
    copyText(text, function (ok) {
      copyStatus.textContent = ok ? '' : S.copyFailed;
      if (!ok) return;
      var label = b.getAttribute('data-label') || b.textContent;
      b.setAttribute('data-label', label);
      b.textContent = S.copied;
      setTimeout(function () { b.textContent = label; }, 2000);
    });
  });

  // ---- links like email-your-mpp.html?postal=M3C1A1 or ?riding=20 ----
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get('riding') && D.ridings[params.get('riding')]) choose(params.get('riding'));
    else if (params.get('postal')) { postal.value = params.get('postal'); lookUp(); }
  } catch (e) { /* older browser */ }
})();
