(function () {
  'use strict';
  if (window.AscoreMarketing) return;
  const PIXEL = '1058485446949199';
  const GA4 = 'G-MX800C01N9';
  // Owner confirmed Enhanced Measurement OFF for this stream on 2026-10-06.
  // Keep it off in GA Admin; send_page_view:false alone cannot disable history events.
  const GA4_READY = true;
  const CONSENT = 'ascore-marketing-consent-v2', SENT = 'ascore-marketing-purchases-v1', GA_SENT = 'ascore-analytics-purchases-v1';
  const PUBLIC = new Set(['/', '/work/', '/services/', '/about/', '/contact/', '/services/brand-creative/', '/services/digital-experiences/', '/services/3d-immersive/', '/services/growth-automation/', '/services/uae-business-services/', '/courses/', '/courses/meta-ads/', '/courses/practical-ai/', '/courses/checkout/']);
  const path = () => '/' + location.pathname.split('/').filter(Boolean).join('/') + (location.pathname === '/' ? '' : '/');
  const privateHash = () => /^#(?:portal|login|signup|admin-setup)(?:$|[/?])/i.test(location.hash);
  const publicPage = () => PUBLIC.has(path()) && !privateHash();
  const sensitiveReferrer = (() => { try { const u = new URL(document.referrer); return u.origin === location.origin && (!safeQuery(u.search) || u.pathname.startsWith('/portal/') || /^#(?:portal|login|signup|admin-setup)/i.test(u.hash)); } catch { return false; } })();
  function safeQuery(search) { return [...new URLSearchParams(search)].every(([key, value]) => /^(?:fbclid|utm_source|utm_medium|utm_campaign|utm_content|utm_term|utm_id)$/.test(key) && /^[A-Za-z0-9_.~-]{1,256}$/.test(value)); }
  const eligible = () => publicPage() && safeQuery(location.search) && !sensitiveReferrer;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* A blocked storage API must not prevent a choice. */ } };
  function consentChoice() {
    const saved = read(CONSENT, null);
    return saved?.version === 2 && ['granted', 'denied'].includes(saved.value) && Number.isFinite(saved.at) && saved.at <= Date.now() && Date.now() - saved.at <= 180 * 86400000 ? saved : null;
  }
  // Earlier Meta-only grants do not authorize Google Analytics.
  let choice = consentChoice();
  // A browser's privacy signal always wins over a previously stored grant.
  const privacySignal = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  const granted = () => choice?.value === 'granted' && !privacySignal();
  let loaded = false, attempted = false, initialized = false, lastPage = null, pending = null, settingsOpen = !choice;
  let googleLoaded = false, googleAttempted = false, googleInitialized = false, googleLastPage = null, googlePending = null, googleConsent = false;
  let widget;
  const sentInMemory = new Set(), googleSentInMemory = new Set();
  const googleConsentState = analytics => ({analytics_storage: analytics, ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
  window['ga-disable-' + GA4] = true;
  function revokeGoogle() {
    window['ga-disable-' + GA4] = true;
    if (googleAttempted && window.gtag && googleConsent) window.gtag('consent', 'update', googleConsentState('denied'));
    googleConsent = false; googleLastPage = null;
  }
  function revoke() { if (window.fbq) window.fbq('consent', 'revoke'); revokeGoogle(); }
  function sentEvents(key = SENT) { const saved = read(key, []); return Array.isArray(saved) ? saved.filter(e => e && /^[a-f0-9]{64}$/.test(e.id) && Number.isFinite(e.at) && e.at <= Date.now() && Date.now() - e.at < 30 * 86400000).slice(-100) : []; }
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
  function googlePage() {
    const current = path();
    const titles = {'/': 'Ascore', '/courses/': 'Ascore courses', '/courses/meta-ads/': 'Ascore Meta Ads course', '/courses/practical-ai/': 'Ascore Practical AI course', '/courses/checkout/': 'Ascore course checkout'};
    // Never read a customer-controlled title, query, fragment or referrer.
    return {page_location: location.origin + current, page_title: titles[current] || 'Ascore ' + current.split('/').filter(Boolean).join(' ').replaceAll('-', ' '), page_referrer: ''};
  }
  function flushGooglePurchase() {
    if (!googlePending || !googleLoaded || !googleInitialized || !granted() || !eligible() || !GA4_READY) return;
    const receipt = googlePending; googlePending = null;
    const sent = sentEvents(GA_SENT);
    if (googleSentInMemory.has(receipt.paymentEventId) || sent.some(e => e.id === receipt.paymentEventId)) return;
    window.gtag('event', 'purchase', {...googlePage(), send_to: GA4, transaction_id: receipt.paymentEventId, currency: 'AED', value: receipt.totalMinor / 100, items: receipt.items.map(id => ({item_id: id, item_name: id === 'meta' ? 'Meta Ads PDF course' : 'Practical AI PDF course', price: 49.99, quantity: 1}))});
    googleSentInMemory.add(receipt.paymentEventId);
    write(GA_SENT, [...sent, {id: receipt.paymentEventId, at: Date.now()}].slice(-100));
  }
  function trackGooglePage() {
    if (!GA4_READY || !googleLoaded || !granted() || !eligible()) { revokeGoogle(); return; }
    window['ga-disable-' + GA4] = false;
    if (!googleConsent) { window.gtag('consent', 'update', googleConsentState('granted')); googleConsent = true; }
    const page = googlePage();
    window.gtag('set', page);
    if (!googleInitialized) {
      window.gtag('config', GA4, {send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 180 * 86400, cookie_update: false});
      googleInitialized = true;
    }
    if (path() !== googleLastPage) { window.gtag('event', 'page_view', {...page, send_to: GA4}); googleLastPage = path(); }
    flushGooglePurchase();
  }
  function loadGoogle() {
    if (!GA4_READY || !granted() || !eligible()) { revokeGoogle(); return; }
    if (googleLoaded) { trackGooglePage(); return; }
    if (googleAttempted) return;
    googleAttempted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', googleConsentState('denied'));
    window.gtag('set', {allow_google_signals: false, allow_ad_personalization_signals: false, ads_data_redaction: true, url_passthrough: false, ...googlePage()});
    window.gtag('js', new Date());
    // No config or event is queued until the SDK loads and consent is rechecked.
    const script = document.createElement('script'); script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4; script.referrerPolicy = 'no-referrer';
    script.onload = () => { googleLoaded = true; trackGooglePage(); };
    script.onerror = revokeGoogle;
    document.head.append(script);
  }
  function trackPage() {
    if (!loaded || !granted() || !eligible()) { if (window.fbq) window.fbq('consent', 'revoke'); return; }
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
    loadGoogle();
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
    window.fbq('consent', 'revoke');
    const script = document.createElement('script');
    script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'; script.referrerPolicy = 'no-referrer';
    script.onload = () => { loaded = true; trackPage(); };
    script.onerror = () => { window.fbq('consent', 'revoke'); }; // One blocked provider must not block the other.
    document.head.append(script);
  }
  function render() {
    if (!widget) return;
    widget.hidden = !publicPage();
    widget.querySelector('[data-marketing-panel]').hidden = !settingsOpen;
    widget.querySelector('[data-marketing-settings]').hidden = settingsOpen;
    widget.querySelector('[data-marketing-status]').textContent = privacySignal() ? 'Your browser requests tracking to stay off.' : granted() ? 'Measurement is allowed. You can change this anytime.' : 'Analytics and marketing measurement are off.';
    widget.querySelector('[data-marketing-allow]').disabled = privacySignal();
    widget.querySelector('[data-marketing-settings]').setAttribute('aria-expanded', String(settingsOpen));
  }
  function sync() {
    if (!eligible()) { pending = null; googlePending = null; }
    if (!eligible()) lastPage = null;
    render(); load();
  }
  function decide(value) {
    choice = {version: 2, value, at: Date.now()}; write(CONSENT, choice);
    settingsOpen = false;
    if (value !== 'granted') { pending = null; googlePending = null; lastPage = null; revoke(); }
    sync(); widget?.querySelector('[data-marketing-settings]').focus({preventScroll: true});
  }
  window.AscoreMarketing = Object.freeze({
    verifiedPurchase(receipt) {
      if (path() !== '/courses/checkout/' || !eligible() || !receipt || receipt.paymentStatus !== 'paid' || receipt.currency !== 'AED' || !/^[a-f0-9]{64}$/.test(receipt.paymentEventId) || !Array.isArray(receipt.items) || !receipt.items.length || receipt.items.length > 2 || new Set(receipt.items).size !== receipt.items.length || receipt.items.some(id => !['meta', 'ai'].includes(id)) || receipt.totalMinor !== receipt.items.length * 4999) return false;
      pending = {paymentEventId: receipt.paymentEventId, totalMinor: receipt.totalMinor, items: [...receipt.items]};
      googlePending = {paymentEventId: receipt.paymentEventId, totalMinor: receipt.totalMinor, items: [...receipt.items]};
      load(); flushPurchase(); flushGooglePurchase(); return true;
    }
  });
  function mount() {
    widget = document.createElement('aside'); widget.className = 'ascore-marketing'; widget.setAttribute('aria-label', 'Analytics and marketing privacy choices');
    widget.innerHTML = '<section data-marketing-panel id="ascore-marketing-panel" aria-labelledby="ascore-marketing-title"><h2 id="ascore-marketing-title">Your measurement choice</h2><p>Allow Google Analytics and Meta Pixel to measure public visits and confirmed purchases? They use cookies and share activity with Google and Meta. Your choice won’t affect browsing or the cart.</p><p data-marketing-status></p><div class="ascore-marketing-actions"><button type="button" data-marketing-deny>Keep measurement off</button><button type="button" data-marketing-allow>Allow measurement</button></div></section><button type="button" data-marketing-settings aria-controls="ascore-marketing-panel" aria-expanded="false">Measurement settings</button>';
    widget.querySelector('[data-marketing-deny]').onclick = () => decide('denied');
    widget.querySelector('[data-marketing-allow]').onclick = () => decide('granted');
    widget.querySelector('[data-marketing-settings]').onclick = () => { settingsOpen = true; render(); widget.querySelector('[data-marketing-deny]').focus({preventScroll: true}); };
    document.body.append(widget); sync();
  }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method]; history[method] = function () { const result = original.apply(this, arguments); sync(); return result; };
  }
  for (const event of ['popstate', 'hashchange', 'pageshow']) window.addEventListener(event, sync);
  window.addEventListener('storage', event => { if (event.key === CONSENT || event.key === null) { choice = consentChoice(); settingsOpen = !choice; if (!granted()) { pending = null; googlePending = null; lastPage = null; } sync(); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true}); else mount();
})();
