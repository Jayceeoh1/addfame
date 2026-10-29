/**
 * Exercises mobile/hide-verified-purchase.js against fixture markup.
 * No extra dependencies: `node hide-verified-purchase.test.js`
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = fs.readFileSync(path.join(__dirname, 'hide-verified-purchase.js'), 'utf8');
const NOTICE = 'Verified Creator nu este disponibil în aplicație.';

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function createDocument() {
  function collect(root, acc) {
    (root.children || []).forEach(function (child) {
      acc.push(child);
      collect(child, acc);
    });
  }

  function matches(el, selector) {
    selector = selector.trim();
    if (!el || el.nodeType !== 1) return false;
    if (selector === 'a[href*="pay=stripe"]') {
      return el.tagName === 'A' && String(el.getAttribute('href') || '').indexOf('pay=stripe') !== -1;
    }
    var attrMatch = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attrMatch) {
      var actual = el.getAttribute(attrMatch[1]);
      if (actual == null) return false;
      return attrMatch[2] == null || actual === attrMatch[2];
    }
    return el.tagName === selector.toUpperCase();
  }

  function make(tag) {
    const el = {
      nodeType: 1,
      tagName: String(tag || 'DIV').toUpperCase(),
      children: [],
      parentElement: null,
      parentNode: null,
      className: '',
      attrs: {},
      _text: '',
      style: {},
    };
    Object.defineProperty(el, 'textContent', {
      get: function () {
        if (this.children.length) return this.children.map(function (child) { return child.textContent || ''; }).join('');
        return this._text || '';
      },
      set: function (value) {
        this.children.length = 0;
        this._text = value == null ? '' : String(value);
      },
    });
    Object.defineProperty(el, 'innerText', {
      get: function () { return this.textContent; },
      set: function (value) { this.textContent = value; },
    });
    el.setAttribute = function (name, value) {
      this.attrs[name] = String(value);
      if (name === 'class') this.className = String(value);
    };
    el.getAttribute = function (name) {
      if (Object.prototype.hasOwnProperty.call(this.attrs, name)) return this.attrs[name];
      if (name === 'class') return this.className || null;
      return null;
    };
    el.appendChild = function (child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentElement = this;
      child.parentNode = this;
      this.children.push(child);
      return child;
    };
    el.insertBefore = function (child, ref) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentElement = this;
      child.parentNode = this;
      var index = this.children.indexOf(ref);
      if (index === -1) this.children.push(child);
      else this.children.splice(index, 0, child);
      return child;
    };
    el.removeChild = function (child) {
      var index = this.children.indexOf(child);
      if (index !== -1) this.children.splice(index, 1);
      child.parentElement = null;
      child.parentNode = null;
      return child;
    };
    el.querySelectorAll = function (selector) {
      var found = [];
      collect(this, found);
      var parts = String(selector).split(',');
      return found.filter(function (node) {
        return parts.some(function (part) { return matches(node, part); });
      });
    };
    el.querySelector = function (selector) {
      return this.querySelectorAll(selector)[0] || null;
    };
    return el;
  }

  const document = make('#document');
  document.nodeType = 9;
  document.documentElement = make('html');
  document.head = make('head');
  document.body = make('body');
  document.appendChild(document.documentElement);
  document.documentElement.appendChild(document.head);
  document.documentElement.appendChild(document.body);
  document.createElement = function (tag) { return make(tag); };
  document.addEventListener = function () {};
  return document;
}

function mount(document, parent, spec) {
  const el = document.createElement(spec.tag || 'div');
  if (spec.id) el.setAttribute('id', spec.id);
  if (spec.className) el.setAttribute('class', spec.className);
  if (spec.title) el.setAttribute('title', spec.title);
  if (spec.href) el.setAttribute('href', spec.href);
  if (spec.text) el.textContent = spec.text;
  (spec.children || []).forEach(function (child) { mount(document, el, child); });
  parent.appendChild(el);
  return el;
}

function byId(document, id) {
  const all = [];
  (function walk(node) {
    (node.children || []).forEach(function (child) {
      if (child.getAttribute && child.getAttribute('id') === id) all.push(child);
      walk(child);
    });
  })(document);
  return all[0] || null;
}

function hidden(el) {
  let node = el;
  while (node) {
    if (node.getAttribute && node.getAttribute('data-af-hide') === 'verified-purchase') return true;
    node = node.parentElement;
  }
  return false;
}

function run(hostname, pathname, search, build) {
  const document = createDocument();
  const listeners = {};
  const sandbox = {
    window: null,
    document: document,
    location: {
      hostname: hostname,
      pathname: pathname,
      search: search,
      origin: 'https://' + hostname,
    },
    history: {
      pushState: function () {},
      replaceState: function () {},
    },
    MutationObserver: function () {
      this.observe = function () {};
    },
    Promise: Promise,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    URL: URL,
    URLSearchParams: URLSearchParams,
    Response: Response,
    XMLHttpRequest: function XMLHttpRequest() {},
    console: console,
  };
  sandbox.window = sandbox;
  sandbox.window.addEventListener = function (type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
  };
  sandbox.XMLHttpRequest.prototype = { open: function () {}, send: function () {} };
  document.addEventListener = function () {};
  if (build) build(document);
  vm.runInContext(SOURCE, vm.createContext(sandbox), { filename: 'hide-verified-purchase.js' });
  return Promise.resolve()
    .then(function () { return Promise.resolve(); })
    .then(function () { return Promise.resolve(); })
    .then(function () {
      return { document: document, sandbox: sandbox, listeners: listeners };
    });
}

const checks = [];
function check(name, fn) {
  checks.push(Promise.resolve().then(fn).then(function () {
    console.log('ok  ' + name);
  }, function (error) {
    console.error('FAIL ' + name);
    console.error(error && error.stack || error);
    process.exitCode = 1;
  }));
}

check('hides the purchase UI and keeps an active badge', function () {
  return run('addfame.ro', '/influencer/settings', '?tab=verified&pay=stripe', function (document) {
    const page = document.body;
    mount(document, page, {
      tag: 'nav',
      children: [
        {
          tag: 'div', id: 'sidebar-buy',
          children: [{
            tag: 'button', id: 'sidebar-button',
            children: [
              { tag: 'span', text: 'Verified Creator' },
              { tag: 'span', text: 'Activează acum' },
              { tag: 'span', text: '50 RON/lună' },
            ],
          }],
        },
        {
          tag: 'div', id: 'sidebar-active',
          children: [
            { tag: 'span', text: 'Verified Creator' },
            { tag: 'span', text: 'Expiră 22 nov' },
          ],
        },
        {
          tag: 'button', id: 'collapsed', title: 'Verified Creator — 50 RON/lună',
          children: [{ tag: 'span' }],
        },
      ],
    });
    mount(document, page, {
      tag: 'header',
      children: [
        { tag: 'button', id: 'topbar', text: 'Verified — 50 RON/lună' },
        { tag: 'span', id: 'bonus', text: '+50 RON la înregistrare' },
      ],
    });
    mount(document, page, {
      tag: 'div', id: 'modal', className: 'fixed inset-0 bg-black/60 z-[100]',
      children: [
        { tag: 'h2', text: 'Verified Creator — 50 RON/lună' },
        { tag: 'p', text: 'Plătești 50 RON/lună. Profilul tău apare primul.' },
        { tag: 'button', text: 'Din wallet' },
        { tag: 'button', text: 'Transfer bancar' },
        { tag: 'div', text: 'Card online (Stripe)' },
      ],
    });
    mount(document, page, {
      tag: 'div', id: 'success', className: 'fixed inset-0 bg-black/60',
      children: [
        { tag: 'h3', text: 'Felicitări! 🎉' },
        { tag: 'h3', text: 'Ești Verified Creator!' },
        { tag: 'button', text: 'Super, mulțumesc!' },
      ],
    });
    mount(document, page, {
      tag: 'div', id: 'invite', className: 'fixed inset-0',
      children: [
        { tag: 'h2', text: 'Invitație nouă' },
        { tag: 'button', text: 'Mai târziu' },
        { tag: 'button', text: 'Vezi invitația' },
      ],
    });
    mount(document, page, {
      tag: 'div', id: 'devino',
      children: [
        { tag: 'h2', text: 'Devino Verified Creator' },
        { tag: 'p', text: 'Abonament lunar · 50 RON/lună' },
        { tag: 'p', text: 'Wallet disponibil 10 RON' },
        { tag: 'button', id: 'activate', text: 'Activează Verified Creator — 50 RON/lună' },
        { tag: 'p', text: 'Abonament lunar 50 RON/lună. Se reînnoiește automat.' },
      ],
    });
    mount(document, page, {
      tag: 'div', id: 'announcements',
      children: [
        {
          tag: 'div', id: 'renew-ann',
          children: [
            { tag: 'p', text: 'Abonamentul Verified Creator a expirat' },
            { tag: 'p', text: 'Badge-ul tău auriu a expirat. Reînnoiește din Settings pentru a apărea primul.' },
            { tag: 'a', href: '/influencer/settings?tab=verified&pay=stripe', text: 'Reînnoiește' },
          ],
        },
        {
          tag: 'div', id: 'active-ann',
          children: [
            { tag: 'p', text: 'Verified Creator activ!' },
            { tag: 'p', text: 'Profilul tău apare primul la branduri.' },
          ],
        },
      ],
    });
    mount(document, page, {
      tag: 'button', id: 'notif-renew',
      text: 'Abonamentul Verified Creator a expirat. Reînnoiește din Settings.',
    });
    mount(document, page, {
      tag: 'button', id: 'notif-active',
      text: 'Badge Verified Creator activat!',
    });
    mount(document, page, {
      tag: 'button', id: 'password',
      text: 'Reînnoiește parola',
    });
    mount(document, page, {
      tag: 'div', id: 'identity',
      children: [
        { tag: 'p', text: 'Identitate verificată' },
        { tag: 'p', text: 'Profilul tău are badge-ul de identitate verificată vizibil brandurilor.' },
      ],
    });
    mount(document, page, {
      tag: 'div', id: 'stats',
      children: [
        { tag: 'h3', text: 'Statisticile tale de performanță' },
        { tag: 'p', text: 'Total câștigat 120 RON' },
      ],
    });
  }).then(function (page) {
    const document = page.document;
    assert(hidden(byId(document, 'sidebar-button')), 'sidebar purchase button');
    assert(!hidden(byId(document, 'sidebar-active')), 'sidebar active badge');
    assert(hidden(byId(document, 'collapsed')), 'collapsed sidebar title');
    assert(hidden(byId(document, 'topbar')), 'top bar price button');
    assert(!hidden(byId(document, 'bonus')), 'referral bonus');
    assert(hidden(byId(document, 'modal')), 'wallet/bank/stripe modal');
    assert(!hidden(byId(document, 'success')), 'post-purchase confirmation');
    assert(!hidden(byId(document, 'invite')), 'brand invite popup');
    assert(hidden(byId(document, 'devino')), 'settings purchase card');
    assert(hidden(byId(document, 'activate')), 'activate button');
    assert(hidden(byId(document, 'renew-ann')), 'renew announcement');
    assert(!hidden(byId(document, 'active-ann')), 'activation announcement');
    assert(hidden(byId(document, 'notif-renew')), 'renew notification');
    assert(!hidden(byId(document, 'notif-active')), 'activation notification');
    assert(!hidden(byId(document, 'password')), 'password renewal');
    assert(!hidden(byId(document, 'identity')), 'identity verification');
    assert(!hidden(byId(document, 'stats')), 'performance stats');
    const notice = document.querySelector('[data-af-verified-notice]');
    assert(notice, 'neutral notice');
    assert(notice.textContent === NOTICE, 'notice copy');
    assert(!notice.getAttribute('href'), 'notice has no link');
    assert(!/RON|stripe|wallet|site/i.test(notice.textContent), 'notice has no price or instructions');
  });
});

check('keeps an active badge and hides only renew', function () {
  return run('addfame.ro', '/influencer/settings', '?tab=verified', function (document) {
    mount(document, document.body, {
      tag: 'div', id: 'active-card',
      children: [
        { tag: 'h2', text: 'Verified Creator' },
        { tag: 'p', text: 'Activ din 1 ianuarie 2026' },
        { tag: 'p', text: 'Activ până pe 1 februarie 2026' },
        { tag: 'button', id: 'renew', text: 'Reînnoiește' },
        { tag: 'p', text: 'Apari primul' },
      ],
    });
    mount(document, document.body, {
      tag: 'div', id: 'sidebar-active',
      children: [
        { tag: 'span', text: 'Verified Creator' },
        { tag: 'span', text: 'Expiră 22 nov' },
      ],
    });
  }).then(function (page) {
    assert(!hidden(byId(page.document, 'active-card')), 'active settings card');
    assert(hidden(byId(page.document, 'renew')), 'renew button');
    assert(!hidden(byId(page.document, 'sidebar-active')), 'sidebar active badge');
    assert(!page.document.querySelector('[data-af-verified-notice]'), 'no unavailable notice for an active badge');
  });
});

check('does not block an unrelated wallet payment', function () {
  const document = createDocument();
  const calls = [];
  const sandbox = {
    document: document,
    location: { hostname: 'addfame.ro', pathname: '/', search: '', origin: 'https://addfame.ro' },
    history: { pushState: function () {}, replaceState: function () {} },
    MutationObserver: function () { this.observe = function () {}; },
    Promise: Promise,
    setTimeout: setTimeout,
    URL: URL,
    URLSearchParams: URLSearchParams,
    Response: Response,
    XMLHttpRequest: function XMLHttpRequest() {},
    fetch: function (url) {
      calls.push(String(url));
      return Promise.resolve({ ok: true, status: 200 });
    },
  };
  sandbox.window = sandbox;
  sandbox.window.addEventListener = function () {};
  sandbox.XMLHttpRequest.prototype = { open: function () {}, send: function () {} };
  document.addEventListener = function () {};
  vm.runInContext(SOURCE, vm.createContext(sandbox), { filename: 'hide-verified-purchase.js' });
  return sandbox.fetch('/api/wallet/submit-payment', { method: 'POST' }).then(function (res) {
    assert(res.status === 200, 'unrelated payment status');
    assert(calls[0] === '/api/wallet/submit-payment', 'unrelated payment reached the network');
    return sandbox.fetch('/api/badge/bank', { method: 'POST' });
  }).then(function (blocked) {
    assert(blocked.status === 403, 'bank badge route blocked');
    assert(calls.length === 1, 'blocked route did not call through');
  });
});

check('ignores other hosts and an empty addfame page', function () {
  return run('js.stripe.com', '/v3', '', function (document) {
    mount(document, document.body, { tag: 'button', id: 'stripe', text: 'Verified — 50 RON/lună' });
  }).then(function (page) {
    assert(!hidden(byId(page.document, 'stripe')), 'stripe host is left alone');
    assert(!page.sandbox.__afHideVerifiedPurchase, 'script did not arm itself off-site');
    return run('addfame.ro', '/auth/login', '', function (document) {
      mount(document, document.body, { tag: 'h1', text: 'Intră în cont' });
      mount(document, document.body, { tag: 'button', id: 'login', text: 'Continuă' });
    });
  }).then(function (page) {
    assert(!hidden(byId(page.document, 'login')), 'login button stays');
    assert(!page.document.querySelector('[data-af-verified-notice]'), 'no notice on login');
  });
});

check('hides the PWA install sheet and blocks beforeinstallprompt', function () {
  return run('addfame.ro', '/influencer/dashboard', '', function (document) {
    mount(document, document.body, {
      tag: 'div', id: 'pwa', className: 'fixed inset-0 z-[9999]',
      children: [
        { tag: 'h2', text: 'Instalează aplicația! 🚀' },
        { tag: 'p', text: 'Acces rapid, notificări instant, experiență nativă' },
        { tag: 'p', text: 'Apasă butonul Share' },
        { tag: 'p', text: 'Găsești butonul Share (pătrățel cu săgeată) în bara de jos a Safari' },
        { tag: 'p', text: 'Pas 1 din 3' },
        { tag: 'button', id: 'later', text: 'Poate mai târziu' },
        { tag: 'button', id: 'next', text: 'Următorul pas →' },
      ],
    });
    mount(document, document.body, {
      tag: 'div', id: 'android-sheet', className: 'fixed inset-0',
      children: [
        { tag: 'h2', text: 'Instalează aplicația!' },
        { tag: 'p', text: 'Pași de instalare pe Android:' },
        { tag: 'p', text: 'Selectează "Adaugă pe ecranul principal"' },
        { tag: 'button', text: 'Instalează' },
      ],
    });
    mount(document, document.body, {
      tag: 'div', id: 'push-ok',
      children: [
        { tag: 'div', text: 'Notificări push pe acest dispozitiv' },
        { tag: 'button', id: 'push-on', text: 'Activează' },
      ],
    });
    mount(document, document.body, {
      tag: 'div', id: 'push-safari',
      children: [
        { tag: 'div', text: 'Notificări pe telefon' },
        { tag: 'div', id: 'safari-hint', text: 'Pe iPhone: deschide AddFame în Safari → Distribuie → „Adaugă pe ecranul principal”, apoi activează notificările din aplicația instalată.' },
      ],
    });
    mount(document, document.body, {
      tag: 'div', id: 'benefit',
      children: [{ tag: 'p', text: 'Acces rapid de pe ecran principal' }],
    });
    mount(document, document.body, {
      tag: 'h1', id: 'page-title', text: 'Campanii',
    });
  }).then(function (page) {
    const document = page.document;
    assert(hidden(byId(document, 'pwa')), 'iOS install sheet');
    assert(hidden(byId(document, 'later')), 'Poate mai târziu');
    assert(hidden(byId(document, 'next')), 'Următorul pas');
    assert(hidden(byId(document, 'android-sheet')), 'Android add-to-home sheet');
    assert(!hidden(byId(document, 'push-on')), 'normal push toggle');
    assert(hidden(byId(document, 'safari-hint')), 'Safari home-screen hint');
    assert(!hidden(byId(document, 'push-ok')), 'push row without install steps');
    assert(!hidden(byId(document, 'benefit')), 'benefit line that only mentions the home screen');
    assert(!hidden(byId(document, 'page-title')), 'page title');
    var prevented = false;
    var stopped = false;
    var handler = (page.listeners.beforeinstallprompt || [])[0];
    assert(typeof handler === 'function', 'beforeinstallprompt listener');
    handler({
      preventDefault: function () { prevented = true; },
      stopImmediatePropagation: function () { stopped = true; },
    });
    assert(prevented && stopped, 'beforeinstallprompt is swallowed');
  });
});

check('replaces the install-app instructions', function () {
  return run('addfame.ro', '/influencer/install-app', '', function (document) {
    mount(document, document.body, {
      tag: 'div', id: 'install-page',
      children: [
        { tag: 'h1', text: 'Instalează AddFame' },
        { tag: 'p', text: 'Adaugă aplicația pe ecranul principal pentru acces rapid, fără să deschizi browser-ul.' },
        { tag: 'h2', text: 'Apasă butonul Share' },
        { tag: 'p', text: 'Alege „Add to Home Screen"' },
      ],
    });
  }).then(function (page) {
    assert(hidden(byId(page.document, 'install-page')), 'install-app steps');
    var notice = page.document.querySelector('[data-af-pwa-notice]');
    assert(notice && notice.textContent === 'Ești deja în aplicația AddFame.', 'already-in-app notice');
    assert(!/Share|Safari|Home Screen|RON/i.test(notice.textContent), 'notice has no install steps');
  });
});

check('settings checkout outside the verified tab does not insert the notice', function () {
  return run('addfame.ro', '/cum-functioneaza/influencer/settings', '?tab=account', function (document) {
    mount(document, document.body, {
      tag: 'div', id: 'devino',
      children: [
        { tag: 'h2', text: 'Devino Verified Creator' },
        { tag: 'button', text: 'Activează Verified Creator — 50 RON/lună' },
        { tag: 'p', text: 'Se reînnoiește automat.' },
      ],
    });
  }).then(function (page) {
    assert(hidden(byId(page.document, 'devino')), 'purchase card still hidden');
    assert(!page.document.querySelector('[data-af-verified-notice]'), 'notice only on the verified tab');
  });
});

Promise.all(checks).then(function () {
  if (process.exitCode) {
    console.error('hide-verified-purchase tests failed');
  } else {
    console.log('all hide-verified-purchase checks passed');
  }
});
