/**
 * Hide native-shell-only UI on the live AddFame site:
 * the Verified Creator purchase, and the PWA "install the app" sheet.
 *
 * This is the only file with the match rules. Android copies it into the APK
 * at build time and injects it at document start. iOS bundles this same file
 * and injects it at document start. Do not copy the rules into Java or Swift.
 *
 * The website is not modified. If a rule matches nothing, the page is left
 * as it is. A throw inside a scan is swallowed so the site keeps working.
 *
 * Runs only on addfame.ro (and subdomains). Stripe, Instagram and Facebook
 * pages loaded in the same WebView are ignored.
 *
 * Update this file when the live copy changes. The rules prefer visible text,
 * titles, hrefs and the settings route over CSS class names.
 *
 * Hidden (purchase):
 *   - Sidebar button whose text contains "Verified Creator" and
 *     "Activează acum" or "NN RON/lună". The collapsed icon button is matched
 *     by its title "Verified Creator — NN RON/lună".
 *   - Top bar button whose text matches "Verified — NN RON/lună".
 *   - The fixed checkout overlay (wallet / transfer bancar / Stripe) when its
 *     text is about Verified Creator or the badge and also about paying.
 *   - The settings card headed "Devino Verified Creator" (price, wallet line,
 *     activate button, auto-renew line), including the copy on
 *     /cum-functioneaza/influencer/settings.
 *   - A "Reînnoiește" button that sits inside the already-active Verified card.
 *   - Announcements and notification rows that ask the user to buy or renew
 *     the badge (see isPurchasePrompt). A link whose href contains pay=stripe
 *     is always treated as that checkout.
 *   - fetch / XHR to /api/badge/stripe, /api/badge/wallet, /api/badge/bank
 *     and /api/stripe/badge-payment-intent.
 *
 * Left visible:
 *   - The sidebar / settings card of someone who already has the badge
 *     ("Verified Creator" + "Activ din" / "Expiră"). Only the renew button goes.
 *   - "Verified Creator activ!" and "Badge Verified Creator activat!" notices.
 *   - Identity verification ("Identitate verificată", "badge-ul de identitate").
 *   - Unrelated renewals ("Reînnoiește parola") and the +50 RON referral bonus.
 *   - Profile stars, brand filters, onboarding copy that does not ask for payment.
 *
 * On /influencer/settings?tab=verified and the same tab under
 * /cum-functioneaza (with or without &pay=stripe), a user who is not already
 * verified sees only this sentence in place of the purchase card:
 *   Verified Creator nu este disponibil în aplicație.
 * No price, link, or instruction to buy somewhere else. An already verified
 * user keeps the active card.
 *
 * Also hidden (PWA install — Apple review treats this as a website install
 * prompt inside an app):
 *   - The sheet titled "Instalează aplicația!" (Share / "Pas N din N",
 *     "Poate mai târziu", "Următorul pas", Android "Adaugă pe ecranul
 *     principal" / "Add to Home Screen" / "Instalare cu un singur tap").
 *     PWAInstallModal and PWAInstallBanner are the same sheet.
 *   - beforeinstallprompt, so Android never shows the browser install bar.
 *   - The instructions on /influencer/install-app. That route shows
 *     "Ești deja în aplicația AddFame." instead of the steps.
 *   - A push row whose text tells the user to install via Safari Share /
 *     "Adaugă pe ecranul principal". The normal "Activează" push control stays.
 */
(function () {
  'use strict';

  if (window.__afHideVerifiedPurchase) return;

  var NOTICE = 'Verified Creator nu este disponibil în aplicație.';
  var PWA_NOTICE = 'Ești deja în aplicația AddFame.';
  var MARK = 'verified-purchase';
  var NOTICE_ATTR = 'data-af-verified-notice';
  var PWA_NOTICE_ATTR = 'data-af-pwa-notice';

  try {
    var host = String((location && location.hostname) || '').toLowerCase();
    if (host !== 'addfame.ro' && host.slice(-12) !== '.addfame.ro') return;
    window.__afHideVerifiedPurchase = 1;
    install();
  } catch (e) {}

  function install() {
    blockInstallPrompt();

    var style = document.createElement('style');
    style.setAttribute('data-af-hide-style', 'verified-purchase');
    style.textContent = '[data-af-hide="' + MARK + '"]{display:none !important;}';
    (document.head || document.documentElement).appendChild(style);

    var scheduled = false;
    var scanning = false;
    function schedule() {
      if (scheduled || scanning) return;
      scheduled = true;
      var run = function () {
        scheduled = false;
        scanning = true;
        try { scan(); } catch (err) {}
        scanning = false;
      };
      if (typeof Promise === 'function') Promise.resolve().then(run);
      else setTimeout(run, 0);
    }

    if (typeof MutationObserver === 'function' && document.documentElement) {
      try {
        // Ignore mutations caused by scan itself (the notice node). A follow-up
        // timer still covers a React commit that lands in the same turn.
        new MutationObserver(function () {
          if (!scanning) schedule();
        }).observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true
        });
      } catch (err) {}
    }

    document.addEventListener('DOMContentLoaded', schedule);
    window.addEventListener('load', schedule);
    window.addEventListener('popstate', schedule);
    wrapHistory('pushState');
    wrapHistory('replaceState');
    document.addEventListener('click', onClick, true);
    patchFetch();
    patchXHR();

    // Client-rendered checkout opens ~300ms after hydration.
    // The PWA sheet calls setShow(true) two seconds after mount.
    schedule();
    setTimeout(schedule, 50);
    setTimeout(schedule, 300);
    setTimeout(schedule, 800);
    setTimeout(schedule, 2000);
    setTimeout(schedule, 2600);

    function wrapHistory(name) {
      try {
        var original = history && history[name];
        if (typeof original !== 'function') return;
        history[name] = function () {
          var result = original.apply(history, arguments);
          schedule();
          return result;
        };
      } catch (err) {}
    }
  }

  function textOf(el) {
    if (!el) return '';
    var raw = '';
    try {
      if (typeof el.innerText === 'string' && el.innerText) raw = el.innerText;
    } catch (err) {}
    if (!raw) raw = el.textContent || '';
    return String(raw).replace(/\s+/g, ' ').trim();
  }

  function attr(el, name) {
    if (!el || !el.getAttribute) return '';
    return el.getAttribute(name) || '';
  }

  function classOf(el) {
    if (!el) return '';
    var value = attr(el, 'class');
    if (value) return value;
    var raw = el.className;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw.baseVal === 'string') return raw.baseVal;
    return '';
  }

  function hide(el) {
    if (!el || el.nodeType !== 1) return;
    if (attr(el, 'data-af-hide') === MARK) return;
    var tag = el.tagName;
    if (tag === 'BODY' || tag === 'HTML' || tag === 'MAIN' || tag === 'NAV' || tag === 'HEADER') return;
    el.setAttribute('data-af-hide', MARK);
  }

  // Same idea as the unpublished web detector: a pay=stripe href, or text that
  // is both about the badge and asking the user to pay. Confirmations that the
  // badge is already active do not ask to pay, so they stay.
  function isPurchasePrompt(text, link) {
    link = link || '';
    if (/[?&]pay=stripe(?:&|$)/.test(link)) return true;
    text = String(text || '').toLowerCase();
    var aboutBadge = text.indexOf('verified creator') !== -1 ||
      text.indexOf('badge-ul') !== -1 ||
      text.indexOf('badge verificat') !== -1;
    var asksToPay = text.indexOf('reînnoiește') !== -1 ||
      text.indexOf('reinnoieste') !== -1 ||
      text.indexOf('a expirat') !== -1 ||
      text.indexOf('activează') !== -1 ||
      text.indexOf('activeaza') !== -1 ||
      text.indexOf('devino') !== -1;
    return aboutBadge && asksToPay;
  }

  function onVerifiedSettings() {
    var path = String((location && location.pathname) || '/').replace(/\/+$/, '') || '/';
    if (path !== '/influencer/settings' && path !== '/cum-functioneaza/influencer/settings') return false;
    try {
      return new URLSearchParams(location.search || '').get('tab') === 'verified';
    } catch (err) {
      return /(?:^|[?&])tab=verified(?:&|$)/.test(location.search || '');
    }
  }

  function isOverlay(el) {
    var cls = classOf(el);
    return /(^|\s)fixed(\s|$)/.test(cls) && /(^|\s)inset-0(\s|$)/.test(cls);
  }

  function isBadgeCheckoutText(text) {
    if (/Ești Verified Creator/i.test(text) &&
      !/Din wallet|Transfer bancar|Card online|Preț badge|Activează|RON\s*\/\s*lună|Generează factura|Stripe/i.test(text)) {
      return false;
    }
    var about = /Verified Creator|\bbadge\b/i.test(text);
    var paying = /Din wallet|Transfer bancar|Card online|Stripe|Preț badge|RON\s*\/\s*lună|Generează factura|Plată securizată/i.test(text);
    return about && paying;
  }

  function findOverlay(el) {
    var node = el;
    var hops = 0;
    while (node && hops < 12) {
      if (isOverlay(node)) return node;
      node = node.parentElement;
      hops++;
    }
    return null;
  }

  function hideControl(el) {
    var parent = el.parentElement;
    if (parent && parent.tagName === 'DIV') {
      var parentText = textOf(parent);
      var own = textOf(el);
      var controls = parent.querySelectorAll ? parent.querySelectorAll('button, a') : [];
      if (own && parentText === own && parentText.length < 800 && controls.length <= 1) {
        hide(parent);
        return;
      }
    }
    hide(el);
  }

  // "Activ din" / "Activ până" / "Expiră 12 nov" — the card of someone who already
  // has the badge. "a expirat" in a renew notice must not match this.
  function isActiveVerifiedText(text) {
    return /Verified Creator/i.test(text) && /Activ din|Activ până|Expiră\s/i.test(text);
  }

  function insideHidden(el) {
    var node = el;
    while (node) {
      if (attr(node, 'data-af-hide') === MARK) return true;
      node = node.parentElement;
    }
    return false;
  }

  function inActiveVerifiedCard(el) {
    var node = el && el.parentElement;
    var hops = 0;
    while (node && hops < 8) {
      var text = textOf(node);
      if (text.length > 2500) return false;
      if (isActiveVerifiedText(text)) return true;
      node = node.parentElement;
      hops++;
    }
    return false;
  }

  function isPurchaseControl(el) {
    var tag = el.tagName;
    if (tag !== 'BUTTON' && tag !== 'A') return false;
    var label = textOf(el);
    var title = attr(el, 'title');
    var href = attr(el, 'href');
    if (/Verified\s*[—–\-]\s*\d+\s*RON/i.test(label) && label.length < 80) return true;
    if (/Verified Creator\s*[—–\-]\s*\d+\s*RON/i.test(title)) return true;
    if (/Verified Creator/i.test(label) && /Activează acum|\d+\s*RON\s*\/\s*lună/i.test(label) && label.length < 700) return true;
    if (/Activează Verified Creator/i.test(label)) return true;
    if (/Activează\s*[—–\-]\s*\d+\s*RON/i.test(label) && label.length < 120) return true;
    if (/Confirmă\s*[—–\-]\s*\d+\s*RON/i.test(label) && label.length < 120) return true;
    if (/[?&]pay=stripe(?:&|$)/.test(href)) return true;
    if (/^Reînnoiește$/i.test(label) && inActiveVerifiedCard(el)) return true;
    if (/^Reinnoieste$/i.test(label) && inActiveVerifiedCard(el)) return true;
    return false;
  }

  function hideDevinoCard(heading) {
    var node = heading;
    var hops = 0;
    while (node && hops < 8) {
      var text = textOf(node);
      if (text.length > 4000) return;
      if (/Devino Verified Creator/i.test(text) &&
        /Activează Verified Creator|Se reînnoiește automat|Wallet disponibil/i.test(text)) {
        hide(node);
        if (onVerifiedSettings() && !hasActiveVerifiedCard()) ensureNotice(node);
        return;
      }
      node = node.parentElement;
      hops++;
    }
  }

  function ensureNotice(anchor) {
    if (!onVerifiedSettings()) return;
    if (document.querySelector && document.querySelector('[' + NOTICE_ATTR + ']')) return;
    var notice = document.createElement('p');
    notice.setAttribute(NOTICE_ATTR, '');
    notice.textContent = NOTICE;
    notice.setAttribute('style', 'margin:16px 0;padding:16px 18px;border-radius:12px;background:#f8fafc;color:#111827;font:600 15px/1.45 system-ui,sans-serif;');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(notice, anchor);
  }

  function removeNotice() {
    if (!document.querySelectorAll) return;
    var nodes = document.querySelectorAll('[' + NOTICE_ATTR + ']');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  // Hide the smallest button, link or div that contains the prompt so a list of
  // announcements does not disappear along with one purchase pitch.
  function hidePromptBlock(start) {
    if (!start || start.nodeType !== 1) return;
    if (insideHidden(start)) return;
    var node = start;
    var hops = 0;
    while (node && hops < 8 && node !== document.body && node !== document.documentElement) {
      var tag = node.tagName;
      if (tag === 'MAIN' || tag === 'NAV' || tag === 'HEADER') return;
      var text = textOf(node);
      if (text.length > 1800) return;
      if (isActiveVerifiedText(text)) return;
      if (node.querySelector && node.querySelector('[' + NOTICE_ATTR + ']')) return;
      var link = attr(node, 'href');
      if (!link && node.querySelector) {
        var anchor = node.querySelector('a[href*="pay=stripe"]');
        if (anchor) link = attr(anchor, 'href');
      }
      if ((tag === 'BUTTON' || tag === 'A' || tag === 'DIV' || tag === 'LI' || tag === 'ARTICLE' || tag === 'SECTION') &&
        isPurchasePrompt(text, link)) {
        hide(node);
        return;
      }
      node = node.parentElement;
      hops++;
    }
  }

  function scan() {
    if (!document.querySelectorAll) return;

    // Remove the notice when this is not the verified tab, or when the active
    // card is on screen. Do not add it back in that same pass.
    if (!onVerifiedSettings() || hasActiveVerifiedCard()) removeNotice();

    var controls = document.querySelectorAll('button, a');
    for (var i = 0; i < controls.length; i++) {
      if (isPurchaseControl(controls[i])) hideControl(controls[i]);
    }

    var headings = document.querySelectorAll('h1, h2, h3');
    for (var h = 0; h < headings.length; h++) {
      var heading = headings[h];
      if (attr(heading, 'data-af-hide') === MARK) continue;
      var headingText = textOf(heading);
      if (/^Devino Verified Creator$/i.test(headingText)) hideDevinoCard(heading);
      var overlay = findOverlay(heading);
      if (overlay && isBadgeCheckoutText(textOf(overlay))) hide(overlay);
    }

    var blocks = document.querySelectorAll('p, button, a, h1, h2, h3');
    for (var b = 0; b < blocks.length; b++) {
      var block = blocks[b];
      if (attr(block, 'data-af-hide') === MARK) continue;
      var sample = textOf(block);
      if (sample.length > 800) continue;
      if (isPurchasePrompt(sample, attr(block, 'href'))) hidePromptBlock(block);
    }

    hidePwaInstall();
  }

  // The install sheet, the /influencer/install-app instructions, and the
  // Safari "add to home screen" hint. A lone "ecran principal" benefit line
  // is not enough.
  function isHomeScreenInstall(text) {
    if (!text) return false;
    if (/Instaleaz[ăa]\s+aplica[tț]ia/i.test(text)) return true;
    if (/Instalat cu succes/i.test(text) && /ecran/i.test(text)) return true;
    if (/Instaleaz[ăa]\s+AddFame/i.test(text) && /ecran|Share|Safari|Home Screen/i.test(text)) return true;
    var home = /Adaug[ăa]\s+(pe|la)\s+ecran(ul)?\s+principal|Add to Home Screen|Add to Home screen|ecranul principal/i.test(text);
    var how = /Share|Distribuie|Safari|Pași de instalare|Install app|Instalare cu un singur tap|Pas\s+\d+\s+din\s+\d+|meniul/i.test(text);
    return home && how;
  }

  function onInstallPage() {
    var path = String((location && location.pathname) || '/').replace(/\/+$/, '') || '/';
    return path === '/influencer/install-app';
  }

  function hasSmallerInstallChild(node) {
    var kids = node.children || [];
    var own = textOf(node);
    for (var i = 0; i < kids.length; i++) {
      var childText = textOf(kids[i]);
      if (childText.length > 12 && childText.length < own.length && isHomeScreenInstall(childText)) return true;
    }
    return false;
  }

  function largestInstallShell(start) {
    var node = start;
    var chosen = null;
    var hops = 0;
    while (node && hops < 14 && node !== document.body && node !== document.documentElement) {
      var text = textOf(node);
      if (text.length > 8000) break;
      if (!isHomeScreenInstall(text)) break;
      if (node.tagName === 'DIV' || node.tagName === 'SECTION' || node.tagName === 'MAIN') chosen = node;
      node = node.parentElement;
      hops++;
    }
    return chosen;
  }

  function ensurePwaNotice(anchor) {
    if (!onInstallPage()) return;
    if (document.querySelector && document.querySelector('[' + PWA_NOTICE_ATTR + ']')) return;
    var notice = document.createElement('p');
    notice.setAttribute(PWA_NOTICE_ATTR, '');
    notice.textContent = PWA_NOTICE;
    notice.setAttribute('style', 'margin:24px 16px;padding:16px 18px;border-radius:12px;background:#f8fafc;color:#111827;font:600 15px/1.45 system-ui,sans-serif;text-align:center;');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(notice, anchor);
  }

  function removePwaNotice() {
    if (onInstallPage() || !document.querySelectorAll) return;
    var nodes = document.querySelectorAll('[' + PWA_NOTICE_ATTR + ']');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  function hidePwaInstall() {
    if (!onInstallPage()) removePwaNotice();
    if (!document.querySelectorAll) return;
    var nodes = document.querySelectorAll('h1, h2, h3, p, div');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (insideHidden(node)) continue;
      var text = textOf(node);
      if (text.length < 8 || text.length > 8000) continue;
      if (!isHomeScreenInstall(text)) continue;
      var overlay = findOverlay(node);
      if (overlay && isHomeScreenInstall(textOf(overlay))) {
        hide(overlay);
        continue;
      }
      if (onInstallPage()) {
        var shell = largestInstallShell(node);
        if (shell) {
          hide(shell);
          ensurePwaNotice(shell);
        }
        continue;
      }
      if (hasSmallerInstallChild(node)) continue;
      hide(node);
    }
  }

  function blockInstallPrompt() {
    if (!window.addEventListener) return;
    window.addEventListener('beforeinstallprompt', function (event) {
      try {
        if (event && event.preventDefault) event.preventDefault();
        if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
      } catch (err) {}
    }, true);
  }

  function hasActiveVerifiedCard() {
    var headings = document.querySelectorAll('h1, h2, h3');
    for (var i = 0; i < headings.length; i++) {
      if (!/^Verified Creator$/i.test(textOf(headings[i]))) continue;
      if (inActiveVerifiedCard(headings[i])) return true;
    }
    return false;
  }

  function onClick(event) {
    try {
      var node = event.target;
      if (node && node.nodeType !== 1) node = node.parentElement;
      var hops = 0;
      while (node && hops < 8) {
        var href = attr(node, 'href');
        if (href && /[?&]pay=stripe(?:&|$)/.test(href)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (attr(node, 'data-af-hide') === MARK) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        node = node.parentElement;
        hops++;
      }
    } catch (err) {}
  }

  function requestUrl(input) {
    if (!input) return '';
    if (typeof input === 'string') return input;
    if (typeof input.url === 'string') return input.url;
    return '';
  }

  function isBadgeApi(url) {
    var path = '';
    try {
      path = new URL(url, (location && location.origin) || 'https://addfame.ro').pathname;
    } catch (err) {
      path = String(url || '').split('?')[0];
    }
    return /\/api\/badge\/(?:stripe|wallet|bank)\/?$/.test(path) ||
      /\/api\/stripe\/badge-payment-intent\/?$/.test(path);
  }

  function blockedResponse() {
    try {
      return Promise.resolve(new Response(JSON.stringify({ error: NOTICE }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }));
    } catch (err) {
      return Promise.reject(new Error(NOTICE));
    }
  }

  function patchFetch() {
    if (typeof window.fetch !== 'function') return;
    var original = window.fetch;
    window.fetch = function (input) {
      try {
        if (isBadgeApi(requestUrl(input))) return blockedResponse();
      } catch (err) {}
      return original.apply(this, arguments);
    };
  }

  function patchXHR() {
    if (typeof XMLHttpRequest !== 'function') return;
    var original = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try { this.__afBlockBadge = isBadgeApi(url); } catch (err) { this.__afBlockBadge = false; }
      return original.apply(this, arguments);
    };
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      if (this.__afBlockBadge) {
        try { this.abort(); } catch (err) {}
        return;
      }
      return send.apply(this, arguments);
    };
  }
})();
