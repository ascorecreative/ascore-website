(function () {
  'use strict';
  if (window.AscoreMarketing) return;
  const PIXEL = '1058485446949199';
  const CONSENT = 'ascore-marketing-consent-v1', SENT = 'ascore-marketing-purchases-v1';
  const PUBLIC = new Set(['/', '/work/', '/services/', '/about/', '/contact/', '/services/brand-creative/', '/services/digital-experiences/', '/services/3d-immersive/', '/services/growth-automation/', '/services/uae-business-services/', '/courses/', '/courses/meta-ads/', '/courses/practical-ai/', '/courses/checkout/']);
  const path = () => '/' + location.pathname.split('/').filter(Boolean).join('/') + (location.pathname === '/' ? '' : '/');
  const privateHash = () => /^#(?:portal|login|signup|admin-setup)(?:$|[/?])/i.test(location.hash);
  const publicPage = () => PUBLIC.has(path()) && !privateHash();
  const sensitiveReferrer = (() => { try { const u = new URL(document.referrer); return u.origin === location.origin && (!safeQuery(u.search) || u.pathname.startsWith('/portal/') || /^#(?:portal|login|signup|admin-setup)/i.test(u.hash)); } catch { return false; } })();
  function safeQuery(search) { return [...new URLSearchParams(search)].every(([key, value]) => /^(?:fbclid|utm_source|utm_medium|utm_campaign|utm_content|utm_term|utm_id)$/.test(key) && /^[A-Za-z0-9_.~-]{1,256}$/.test(value)); }
  const eligible = () => publicPage() && safeQuery(location.search) && !sensitiveReferrer;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* A blocked storage API must not prevent a choice. */ } };
  let choice = read(CONSENT, null);
  if (!choice || choice.version !== 1 || !['granted', 'denied'].includes(choice.value) || !Number.isFinite(choice.at) || Date.now() - choice.at > 180 * 86400000) choice = null;
  // A browser's privacy signal always wins over a previously stored grant.
  const privacySignal = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  const granted = () => choice?.value === 'granted' && !privacySignal();
  let loaded = false, attempted = false, initialized = false, lastPage = null, pending = null, settingsOpen = !choice;
  let widget;
  const sentInMemory = new Set();
  function revoke() { if (window.fbq) window.fbq('consent', 'revoke'); }
  function sentEvents() { const saved = read(SENT, []); return Array.isArray(saved) ? saved.filter(e => e && /^[a-f0-9]{64}$/.test(e.id) && Number.isFinite(e.at) && Date.now() - e.at < 30 * 86400000).slice(-100) : []; }
  function flushPurchase() {
    if (!pending || !loaded || !initialized || !granted() || !eligible()) return;
    const receipt = pending; pending = null;
    const sent = sentEvents();
    if (sentInMemory.has(receipt.paymentEventId) || sent.some(e => e.id === receipt.paymentEventId)) return;
    // Event IDs contain no email, order identifier, receipt token or PDF capability.
    window.fbq('trackSingle', PIXEL, 'Purchase', {currency: 'AED', value: receipt.totalMinor / 100, content_type: 'product', content_ids: receipt.items, contents: receipt.items.map(id => ({id, quantity: 1, item_price: 49.99})), num_items: receipt.items.length}, {eventID: receipt.paymentEventId});
    sentInMemory.add(receipt.paymentEventId);
    write(SENT, [...sent, {id: receipt.paymentEventId, at: Date.now()}].slice(-100));
  }
  function trackPage() {
    if (!loaded || !granted() || !eligible()) { revoke(); return; }
    if (!initialized) {
      window.fbq('set', 'autoConfig', false, PIXEL);
      window.fbq('optOut', PIXEL, 'AutomaticMatching');
      window.fbq('init', PIXEL);
      initialized = true;
    }
    window.fbq('consent', 'grant');
    const current = path();
    if (current !== lastPage) { window.fbq('trackSingle', PIXEL, 'PageView'); lastPage = current; }
    flushPurchase();
  }
  function load() {
    if (!granted() || !eligible()) { revoke(); return; }
    if (loaded) { trackPage(); return; }
    if (attempted) return;
    attempted = true;
    // Standard Meta queue; no init or event is queued while the SDK is in flight.
    if (!window.fbq) {
      const fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
      fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
      window.fbq = fbq; window._fbq = fbq;
    }
    // Meta's SDK otherwise installs its own history observer and duplicates SPA
    // PageViews. Our observer excludes private routes and sensitive URLs. Safe campaign tags remain available after consent.
    window.fbq.disablePushState = true;
    revoke();
    const script = document.createElement('script');
    script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'; script.referrerPolicy = 'no-referrer';
    script.onload = () => { loaded = true; trackPage(); };
    script.onerror = () => { revoke(); }; // Ad blockers must not affect the storefront.
    document.head.append(script);
  }
  function render() {
    if (!widget) return;
    widget.hidden = !publicPage();
    widget.querySelector('[data-marketing-panel]').hidden = !settingsOpen;
    widget.querySelector('[data-marketing-settings]').hidden = settingsOpen;
    widget.querySelector('[data-marketing-status]').textContent = privacySignal() ? 'Your browser requests tracking to stay off.' : granted() ? 'Marketing measurement is on.' : 'Marketing measurement is off.';
    widget.querySelector('[data-marketing-allow]').disabled = privacySignal();
    widget.querySelector('[data-marketing-settings]').setAttribute('aria-expanded', String(settingsOpen));
  }
  function sync() {
    if (!publicPage()) pending = null;
    if (!eligible()) lastPage = null;
    render(); load();
  }
  function decide(value) {
    choice = {version: 1, value, at: Date.now()}; write(CONSENT, choice);
    settingsOpen = false;
    if (value !== 'granted') { pending = null; revoke(); }
    sync(); widget?.querySelector('[data-marketing-settings]').focus({preventScroll: true});
  }
  window.AscoreMarketing = Object.freeze({
    verifiedPurchase(receipt) {
      if (path() !== '/courses/checkout/' || !eligible() || !receipt || receipt.paymentStatus !== 'paid' || receipt.currency !== 'AED' || !/^[a-f0-9]{64}$/.test(receipt.paymentEventId) || !Array.isArray(receipt.items) || !receipt.items.length || receipt.items.length > 2 || new Set(receipt.items).size !== receipt.items.length || receipt.items.some(id => !['meta', 'ai'].includes(id)) || receipt.totalMinor !== receipt.items.length * 4999) return false;
      pending = {paymentEventId: receipt.paymentEventId, totalMinor: receipt.totalMinor, items: [...receipt.items]};
      load(); flushPurchase(); return true;
    }
  });
  function mount() {
    widget = document.createElement('aside'); widget.className = 'ascore-marketing'; widget.setAttribute('aria-label', 'Marketing privacy choices');
    widget.innerHTML = '<section data-marketing-panel id="ascore-marketing-panel" aria-labelledby="ascore-marketing-title"><h2 id="ascore-marketing-title">Your marketing choice</h2><p>Allow Meta Pixel to measure visits and confirmed purchases? It uses cookies and shares activity with Meta. Your choice won’t affect browsing or the cart.</p><p data-marketing-status></p><div class="ascore-marketing-actions"><button type="button" data-marketing-deny>Keep marketing off</button><button type="button" data-marketing-allow>Allow marketing</button></div></section><button type="button" data-marketing-settings aria-controls="ascore-marketing-panel" aria-expanded="false">Marketing settings</button>';
    widget.querySelector('[data-marketing-deny]').onclick = () => decide('denied');
    widget.querySelector('[data-marketing-allow]').onclick = () => decide('granted');
    widget.querySelector('[data-marketing-settings]').onclick = () => { settingsOpen = true; render(); widget.querySelector('[data-marketing-deny]').focus({preventScroll: true}); };
    document.body.append(widget); sync();
  }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method]; history[method] = function () { const result = original.apply(this, arguments); sync(); return result; };
  }
  for (const event of ['popstate', 'hashchange', 'pageshow']) window.addEventListener(event, sync);
  window.addEventListener('storage', event => { if (event.key === CONSENT) { choice = read(CONSENT, null); settingsOpen = !choice; sync(); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true}); else mount();
})();
