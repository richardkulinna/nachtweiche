'use strict';

const E = window.Engine,
  $ = (id) => document.getElementById(id);
const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const padded = (n) => String(n).padStart(2, '0');
const integerFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const decimal = (n) => decimalFormat.format(n);
function fmt(n, precise = false) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 10000) return precise && n < 100 ? decimal(n) : integerFormat.format(Math.floor(n));
  const labels = ['', ' Tsd.', ' Mio.', ' Mrd.', ' Bio.', ' Brd.'];
  const power = Math.floor(Math.log10(n) / 3);
  return labels[power] !== undefined
    ? decimal(Math.floor((n / 10 ** (3 * power)) * 100) / 100) + labels[power]
    : n.toExponential(2).replace('.', ',').replace('e+', 'e');
}
function duration(secs) {
  const mins = Math.floor(secs / 60);
  if (mins < 1) return Math.floor(secs) + ' s';
  return mins < 60 ? mins + ' min' : Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min';
}
const symbols = {
  station: '<path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7"/><path d="M10 8h4"/>',
  network:
    '<path d="m5 17 5-7h5l4-5"/><circle cx="4" cy="18" r="2"/><circle cx="11" cy="9" r="2"/><circle cx="20" cy="4" r="2"/>',
  book: '<path d="M5 3h14v18H5zM8 3v18M11 8h5m-5 4h5"/>',
  settings:
    '<path d="M3 5h18M3 12h18M3 19h18"/><path fill="var(--paper)" d="M8 3h3v5H8zM14 10h3v5h-3zM7 17h3v5H7z"/>',
  sound: '<path d="m3 9 4 0 5-4v14l-5-4H3zM15 8q5 4 0 8m3-11q8 7 0 14"/>',
  mute: '<path d="m3 9 4 0 5-4v14l-5-4H3zM16 9l6 6m0-6-6 6"/>',
  ticket: '<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM15 7v2m0 2v2m0 2v2"/>',
  route:
    '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M7 7h10v5H7zM8 18l-3 3m11-3 3 3M8 15h1m6 0h1"/>',
  rotate: '<path d="M19 9a8 8 0 1 0 .5 5M20 3v6h-6"/><path d="M12 8v4l3 2"/>',
  signal: '<path d="M8 20h10M13 20V4m0 0 7 2-7 4"/><circle cx="6" cy="12" r="2"/>',
  arrow: '<path d="M3 12h16m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  ad: '<path d="m3 10 12-4v12L3 14zm3 5 1 5h3l-1-5m9-6 3-2m-3 6h3"/>',
  gear: '<path d="m12 2 2 3 4-1 1 4 3 2-2 3 1 4-4 1-2 3-3-2-4 1-1-4-3-2 2-3-1-4 4-1z"/><circle cx="12" cy="12" r="3"/>',
  motor: '<path d="M3 8h13v10H3zM7 5h6v3m3 3 5-2v8l-5-2M6 18v2m7-2v2m-6-8h5"/>',
  wide: '<path d="M4 3v17m16-17v17M7 12h10m-7-3-3 3 3 3m4-6 3 3-3 3"/>',
  blade:
    '<circle cx="12" cy="12" r="9"/><path d="m12 12 4-7m-4 7 7 4m-7-4-4 7m4-7-7-4"/><circle cx="12" cy="12" r="1"/>',
  group:
    '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20v-3a6 6 0 0 1 12 0v3zm13-6q5 0 5 5h-3"/>',
};
function icon(name) {
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (symbols[name] || symbols.route) +
    '</svg>'
  );
}
document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = icon(el.dataset.icon)));

const storageKey = 'nachtweiche-v1';
function loadSnapshot() {
  try {
    return window.nachtHost ? window.nachtHost.load() : JSON.parse(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}
const saved = loadSnapshot();
const s = E.load(saved?.state);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const preference = (val, fallback) => (Number.isFinite(val) ? clamp(val, 0, 1) : fallback);
const prefs = {
  theme: saved?.prefs?.theme === 'dark' ? 'dark' : 'light',
  mono: saved?.prefs?.mono === true,
  contrast: saved?.prefs?.contrast === true,
  reduced: saved?.prefs?.reduced ?? matchMedia('(prefers-reduced-motion: reduce)').matches,
  sound: saved?.prefs?.sound !== false,
  volume: preference(saved?.prefs?.volume, 0.48),
  music: preference(saved?.prefs?.music, 0.38),
  detail: preference(saved?.prefs?.detail, 0.75),
  brightness: clamp(preference(saved?.prefs?.brightness, 1), 0.65, 1),
};
const validCard = (i) => Number.isInteger(i) && i >= 0 && i < COURSES.length;
const book = {
  done: [...new Set((Array.isArray(saved?.book?.done) ? saved.book.done : []).filter(validCard))],
  active: -1,
  step: 0,
};
if (validCard(saved?.book?.active) && !book.done.includes(saved.book.active)) {
  book.active = saved.book.active;
  book.step = clamp(Math.floor(Number(saved.book.step) || 0), 0, COURSES[book.active].stops.length - 1);
}
const view = {
  tab: 'station',
  bench: 'upgrades',
  network: 'routes',
  journal: 'contracts',
  qty: 1,
  routeDetail: s.route,
};
const audio = new StationSound();
const scene = new NachtScene($('world'));
const shopIcons = ['ad', 'gear', 'motor', 'wide', 'blade', 'ticket', 'group'];
const placeNames = {
  bus: 'Kesselplatz',
  tram: 'Lindenmarkt',
  metro: 'Unter den Bögen',
  zug: 'Nordbahnhof',
  express: 'Uhrenturm',
  faehre: 'Westhafen',
  flug: 'Tempelfeld',
  post: 'Briefbahnhof',
  tunnel: 'Tiefenwerk',
  magnet: 'Schwebewerk',
  pol: 'Nordlichtkai',
  kontinental: 'Grenzbahnhof',
  ozean: 'Ozeankai',
  horizont: 'Morgenrot',
};
const routeNumber = (id) => E.ROUTES.findIndex((r) => r.id === id);
const scrollCache = {};
let offlineSummary = null,
  opening = true,
  endingPending = s.ended && saved?.book?.endingSeen !== true;
let lastEvent = s.serial,
  lastSaveProblem = false,
  lastSaveAt = performance.now(),
  lastClock = performance.now(),
  lastWall = Date.now(),
  lastUI = 0,
  lastFrame = 0,
  lastPanelKey = '',
  lastShop = '',
  lastAnnouncement = '',
  toastTimer = 0,
  wasEnded = s.ended;
if (saved && Number.isFinite(saved.at) && saved.at > 0) {
  const delta = Math.max(0, (Date.now() - saved.at) / 1000);
  if (delta > 1) {
    const result = E.offline(s, delta);
    if (result.seconds >= 60) offlineSummary = result;
  }
  lastEvent = s.serial;
}
function applyPrefs() {
  document.body.dataset.theme = prefs.theme;
  document.body.classList.toggle('contrast', prefs.contrast);
  document.body.classList.toggle('mono', prefs.mono);
  document.body.classList.toggle('low-motion', prefs.reduced);
  document.body.style.setProperty('--brightness', prefs.brightness);
  $('sound').innerHTML = '<i>' + icon(prefs.sound ? 'sound' : 'mute') + '</i>';
  $('sound').setAttribute('aria-label', prefs.sound ? 'Ton ausschalten' : 'Ton einschalten');
  $('sound').setAttribute('aria-pressed', String(prefs.sound));
  audio.set(prefs.sound, prefs.volume, prefs.music);
}
function advanceClock() {
  const wall = Date.now(),
    mono = performance.now();
  let dt = Math.max(0, (mono - lastClock) / 1000);
  const wallDelta = (wall - lastWall) / 1000;
  if (wallDelta > dt + 30) dt = wallDelta; // Windows sleep can stop the monotonic timer.
  lastClock = mono;
  lastWall = wall;
  if (dt > 0) E.step(s, dt);
}
function save() {
  advanceClock();
  const snapshot = { format: 1, at: Date.now(), state: s, book, prefs };
  let ok = false;
  try {
    if (window.nachtHost) ok = window.nachtHost.save(snapshot);
    else {
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
      ok = true;
    }
  } catch {}
  if (!ok && !lastSaveProblem) toast('Speichern fehlgeschlagen. Prüfe den freien Speicherplatz.');
  lastSaveProblem = !ok;
  lastSaveAt = performance.now();
  return ok;
}
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
}
function popup(message) {
  if (view.tab !== 'station') return;
  if (prefs.reduced) {
    $('ticker').textContent = message;
    return;
  }
  const el = document.createElement('span');
  el.className = 'pop';
  el.textContent = message;
  el.style.left = ((s.combo % 3) - 1) * 14 + 'px';
  $('scene-feedback').append(el);
  setTimeout(() => el.remove(), 1280);
}
function openDialog(title, html) {
  if ($('workbench').open) $('workbench').close();
  $('dialog-title').textContent = title;
  $('dialog-body').innerHTML = html;
  if (!$('dialog').open) $('dialog').showModal();
}
function selected(attr, val, css = 'selected') {
  document.querySelectorAll('[' + attr + ']').forEach((el) => {
    const hit = el.getAttribute(attr) === String(val);
    el.classList.toggle(css, hit);
    el.setAttribute('aria-pressed', String(hit));
  });
}
function navigate(tab, sub) {
  if (!['station', 'network', 'journal'].includes(tab)) return;
  if ($('workbench').open) $('workbench').close();
  if (view.tab !== tab) scrollCache[view.tab] = window.scrollY;
  view.tab = tab;
  if (sub) view[tab] = sub;
  for (const key of ['station', 'network', 'journal']) $(key + '-view').hidden = key !== tab;
  selected('data-tab', tab, 'active');
  lastPanelKey = '';
  render();
  window.scrollTo(0, sub ? 0 : scrollCache[tab] || 0);
}
function stationGoal() {
  const claimable = E.CONTRACTS.findIndex((c, i) => !s.claimed[i] && E.contractProgress(s, i) >= c.target);
  if (claimable >= 0)
    return {
      type: 'claim',
      index: claimable,
      label: 'PRÄMIE BEREIT',
      title: E.CONTRACTS[claimable].name,
      value: '+' + fmt(E.CONTRACTS[claimable].reward) + ' M',
    };
  if (book.active >= 0 && routeNumber(COURSES[book.active].stops[book.step]) < s.unlocked) {
    const card = COURSES[book.active],
      r = E.ROUTES[routeNumber(card.stops[book.step])];
    return {
      type: 'course',
      label: 'AKTIVE KURSKARTE',
      title: card.title,
      value: r.name + ' · ' + (book.step + 1) + '/' + card.stops.length,
    };
  }
  if (s.route + 1 < s.unlocked)
    return {
      type: 'line',
      index: s.unlocked - 1,
      label: 'NEUE LINIE BEREIT',
      title: E.ROUTES[s.unlocked - 1].name,
      value: 'Linie ansehen',
    };
  if (E.stats(s).prestigeReady)
    return {
      type: 'prestige',
      label: 'KONZESSION BEREIT',
      title: 'Schichtwechsel',
      value: '+' + E.stats(s).prestigeReward + ' NM',
    };
  const i = E.CONTRACTS.findIndex((c, i) => !s.claimed[i]);
  return i >= 0
    ? {
        type: 'contract',
        label: 'NÄCHSTER AUFTRAG',
        title: E.CONTRACTS[i].name,
        value: fmt(E.contractProgress(s, i)) + ' / ' + fmt(E.CONTRACTS[i].target),
      }
    : { type: 'archive', label: 'DIENSTBUCH', title: 'Schichtprotokoll', value: 'Öffnen' };
}
function buildShop() {
  if (lastShop === view.bench) return;
  const offset = savedShopScroll[view.bench] || 0;
  lastShop = view.bench;
  const items = view.bench === 'upgrades' ? E.UPGRADES : E.BLADES;
  $('shop-list').innerHTML = items
    .map(
      (item, i) =>
        '<div class="shop-item" title="' +
        esc(item.desc) +
        '"><div class="tile-icon">' +
        icon(view.bench === 'upgrades' ? shopIcons[i] : 'blade') +
        '</div><div><h3>' +
        esc(item.name) +
        '</h3><p data-sub="' +
        i +
        '"></p></div><button class="buy" ' +
        (view.bench === 'upgrades' ? 'data-buy' : 'data-blade') +
        '="' +
        i +
        '"></button></div>',
    )
    .join('');
  $('shop-list').scrollTop = offset;
}
const savedShopScroll = {};
function shopUpdate() {
  buildShop();
  $('quantity').hidden = view.bench !== 'upgrades';
  selected('data-bench', view.bench);
  selected('data-qty', view.qty);
  const short = [
    'Zulauf',
    'bei Vollschwung',
    'Durchsatz',
    'Platz',
    'Platz',
    'Fahrgeld je Gast',
    'Einnahmen',
  ];
  const measures = ['traffic', 'income', 'throughput', 'capacity', 'capacity', 'fare', 'income'];
  const base = E.stats(s),
    fullSpin = E.stats({ ...s, momentum: 1 });
  $('shop-list')
    .querySelectorAll('.shop-item')
    .forEach((row, i) => {
      const btn = row.querySelector('button'),
        detail = row.querySelector('p');
      if (view.bench === 'upgrades') {
        const count = view.qty === 'max' ? Math.max(1, E.maxAffordable(s, i)) : view.qty;
        const price = E.price(s, i, count);
        const forecast = { ...s, levels: [...s.levels], momentum: i === 1 ? 1 : s.momentum };
        forecast.levels[i] += count;
        const measure = measures[i],
          old = (i === 1 ? fullSpin : base)[measure],
          after = E.stats(forecast)[measure];
        const gain = old > 0 ? Math.round(1000 * (after / old - 1)) / 10 : 0;
        detail.textContent =
          'St. ' +
          s.levels[i] +
          (Number.isFinite(price) ? ' · +' + decimal(gain) + ' % ' + short[i] : ' · Voll ausgebaut');
        btn.disabled = s.money < price;
        btn.textContent = Number.isFinite(price) ? fmt(price) + ' M' : 'Max';
        btn.title =
          E.UPGRADES[i].desc + ' · ' + count + ' Stufe(n) für ' + integerFormat.format(price) + ' M';
        btn.setAttribute(
          'aria-label',
          E.UPGRADES[i].name + ' ausbauen, ' + count + ' Stufen, ' + fmt(price) + ' Mark',
        );
      } else {
        const b = E.BLADES[i],
          locked = i > E.maxBlade(s);
        detail.textContent = b.desc;
        btn.disabled = locked || i === s.blade;
        btn.textContent = locked
          ? s.prestiges < (b.shifts || 0)
            ? 'Schicht ' + (b.shifts + 1)
            : 'Ab St. ' + b.level
          : i === s.blade
            ? 'Montiert'
            : 'Einsetzen';
        btn.classList.toggle('equipped', i === s.blade);
        btn.setAttribute('aria-label', b.name + ' · ' + btn.textContent);
      }
    });
}
function primaryUpdate(q) {
  const r = E.ROUTES[s.route];
  $('money').textContent = fmt(s.money);
  $('income').textContent = fmt(q.income + q.autoIncome, true);
  $('money').parentElement.title =
    integerFormat.format(Math.floor(s.money)) + ' Mark · ' + fmt(s.passengers) + ' Fahrgäste gesamt';
  $('income').parentElement.title = q.autoDispatch
    ? 'Mit durchschnittlichem Fahrgeld aus automatischer Abfertigung'
    : 'Fahrgeld pro Sekunde';
  $('place').textContent = placeNames[r.id] || r.name;
  $('shift-code').textContent = 'Schicht ' + (s.prestiges + 1);
  $('line-plate').lastElementChild.textContent = r.name;
  $('spin').title =
    'Schwungrad · ' + Math.round(s.momentum * 100) + ' %' + (s.combo >= 3 ? ' · Serie ' + s.combo : '');
  $('signal').disabled = !q.signalReady;
  $('signal').classList.toggle('signal-ready', q.window && q.signalReady);
  $('signal').querySelector('span').textContent =
    q.window && q.signalReady
      ? 'Abfertigen · ' + Math.ceil(q.windowRemaining) + ' s'
      : q.window
        ? 'Zug am Gleis'
        : 'Einfahrt in ' + Math.ceil(q.routeIn) + ' s';
  $('signal').title = q.signalReady
    ? 'Signal geben. Während der Einfahrt gibt es eine Prämie.'
    : 'Signal lädt noch ' + Math.ceil(q.signalCooldown) + ' s.';
  $('signal').setAttribute('aria-label', $('signal').title);
  $('scene-hint').hidden = s.playTime > 65 || s.peakCombo >= 3 || s.prestiges > 0;
  if ($('workbench').open) {
    $('shop-cash').textContent = fmt(s.money) + ' M';
    const g = stationGoal();
    $('next-job').querySelector('.eyebrow').textContent = g.label;
    $('job-name').textContent = g.title;
    $('job-progress').textContent = g.value;
    shopUpdate();
  }
}
function panelsUpdate(q) {
  if (view.tab === 'station') return;
  const tab = view.tab,
    sub = view[tab],
    container = $(tab + '-content');
  const key = [
    tab,
    sub,
    view.routeDetail,
    s.route,
    s.unlocked,
    s.prestiges,
    s.stamps,
    s.ended,
    s.perks,
    book.active,
    book.step,
    book.done.length,
    s.discovered,
    sub === 'archive' ? Math.floor(s.playTime / 5) : '',
  ].join('/');
  if (lastPanelKey !== key) {
    const scroller = container.querySelector('.routes-list'),
      offset = scroller?.scrollTop || 0;
    const focused = document.activeElement,
      focusKey =
        focused && container.contains(focused)
          ? Array.from(focused.attributes).find((x) => x.name.startsWith('data-'))
          : null;
    container.innerHTML =
      tab === 'network'
        ? sub === 'routes'
          ? renderRoutes()
          : sub === 'courses'
            ? renderCourses()
            : renderPrestige()
        : sub === 'contracts'
          ? renderContracts()
          : renderArchive();
    const newScroller = container.querySelector('.routes-list');
    if (newScroller) newScroller.scrollTop = offset;
    if (focusKey)
      container
        .querySelector('[' + focusKey.name + '="' + CSS.escape(focusKey.value) + '"]')
        ?.focus({ preventScroll: true });
    lastPanelKey = key;
  }
  selected('data-' + tab, sub);
  if (tab === 'journal' && sub === 'contracts')
    container.querySelectorAll('[data-contract-card]').forEach((row, i) => {
      const c = E.CONTRACTS[i],
        progress = E.contractProgress(s, i),
        ready = progress >= c.target,
        claimed = s.claimed[i],
        btn = row.querySelector('button');
      row.classList.toggle('ready', ready && !claimed);
      row.classList.toggle('done', claimed);
      row.querySelector('.meter b').style.width = (100 * progress) / c.target + '%';
      row.querySelector('.contract-bottom span').textContent = fmt(progress) + ' / ' + fmt(c.target);
      btn.disabled = claimed || !ready;
      btn.textContent = claimed ? 'Eingelöst' : (ready ? 'Einlösen · ' : '') + '+' + fmt(c.reward) + ' M';
    });
  if (tab === 'network' && sub === 'prestige') {
    const dispatched = $('auto-dispatched');
    if (dispatched) dispatched.textContent = fmt(s.autoSignals);
    $('prestige-meter').style.width = clamp((100 * s.runTotal) / q.prestigeCost, 0, 100) + '%';
    $('prestige-ratio').textContent = fmt(s.runTotal) + ' / ' + fmt(q.prestigeCost) + ' M Schichtumsatz';
    $('prestige').disabled = !q.prestigeReady;
    $('prestige').textContent = q.prestigeReady
      ? 'Schicht wechseln · +' + q.prestigeReward + ' NM'
      : 'Schichtwechsel gesperrt';
  }
}
function render() {
  const q = E.stats(s);
  if (view.tab === 'station') primaryUpdate(q);
  else panelsUpdate(q);
  $('network-dot').hidden = s.route >= s.unlocked - 1 && !q.prestigeReady;
  $('journal-dot').hidden = !E.CONTRACTS.some(
    (c, i) => !s.claimed[i] && E.contractProgress(s, i) >= c.target,
  );
  updateAnnouncements();
}
function updateAnnouncements() {
  const fresh = s.events.filter((e) => e.id > lastEvent).reverse();
  for (const e of fresh) {
    const recent = s.playTime - e.time < 6;
    if (e.kind === 'route' && recent) {
      toast('Neue Linie erschlossen · ' + e.title);
      audio.effect('route');
    }
    if (e.kind === 'visitor' && recent) {
      audio.effect('notify');
      if (view.tab === 'station' && !$('workbench').open && !$('dialog').open) toast(e.title);
    }
    lastAnnouncement =
      e.kind === 'arrival'
        ? e.title + ' fährt ein. Jetzt lohnt sich ein Signal.'
        : e.title + ' · ' + e.text;
  }
  lastEvent = s.serial;
  if (lastAnnouncement) $('ticker').textContent = lastAnnouncement;
  if (s.ended && !wasEnded) {
    wasEnded = true;
    endingPending = true;
    rememberEnding();
    save();
  }
  showPendingEnding();
}
function showPendingEnding() {
  if (!endingPending || opening || $('dialog').open || $('workbench').open) return;
  endingPending = false;
  book.endingSeen = true;
  showEnding();
  save();
}
function rememberEnding() {
  if (!book.ending)
    book.ending = {
      time: s.playTime,
      passengers: s.passengers,
      prestiges: s.prestiges,
      perfect: s.perfectSignals,
      combo: s.peakCombo,
    };
}
if (s.ended) {
  book.endingSeen = saved?.book?.endingSeen === true;
  const en = saved?.book?.ending;
  if (
    en &&
    ['time', 'passengers', 'prestiges', 'perfect', 'combo'].every(
      (k) => Number.isFinite(en[k]) && en[k] >= 0,
    )
  )
    book.ending = en;
  else rememberEnding();
}
function showEnding() {
  rememberEnding();
  const en = book.ending;
  openDialog(
    'Die Stadt wacht auf',
    '<div class="eyebrow"><span class="signal-dot"></span>05:00 · ABSCHLUSSFAHRKARTE</div><h3>Endstation Morgenrot</h3><p>Das erste Tageslicht fällt durch die Tür. Auf der Anzeigetafel leuchten alle Anschlüsse. Die Frühschicht hebt die Hand zum Gruß.</p>' +
      [
        ['Betriebszeit', duration(en.time)],
        ['Fahrgäste', fmt(en.passengers)],
        ['Schichtwechsel', fmt(en.prestiges)],
        ['Pünktliche Signale', fmt(en.perfect)],
        ['Längste Anschubserie', fmt(en.combo)],
      ]
        .map(([k, v]) => '<div class="statline"><span>' + k + '</span><strong>' + v + '</strong></div>')
        .join('') +
      '<div class="dialog-actions"><button class="primary" data-dialog-close>Weiterfahren</button></div>',
  );
  audio.effect('ending');
}
function spin(strength = 1) {
  advanceClock();
  audio.wake();
  if (strength === 1 && s.momentum > 0.82) strength = 1.3;
  const money = s.money;
  if (!E.spin(s, strength)) return;
  audio.effect('spin', s.combo);
  if (strength >= 1.25) scene.burst(Math.min(1, strength / 2));
  popup((s.combo >= 3 ? 'Serie ' + s.combo + ' · ' : '') + '+' + fmt(s.money - money, true) + ' M');
  render();
}
function coursePunch() {
  const i = book.active;
  if (i < 0) return;
  const card = COURSES[i];
  if (card.stops[book.step] !== E.ROUTES[s.route].id) return;
  book.step++;
  if (book.step === card.stops.length) {
    book.done.push(i);
    book.active = -1;
    book.step = 0;
    const bonus = E.cardBonus(s);
    audio.effect('stamp');
    openDialog(
      'Kurskarte gelocht',
      '<span class="ticket-index">KURSKARTE ' +
        padded(i + 1) +
        '</span><h3>' +
        esc(card.title) +
        '</h3><p>' +
        esc(card.story) +
        '</p><div class="statline"><span>Sammlerstempel</span><strong>' +
        esc(card.mark) +
        '</strong></div><div class="statline"><span>Fahrgeldprämie</span><strong>+' +
        fmt(bonus, true) +
        ' M</strong></div><div class="dialog-actions"><button class="primary" data-dialog-close>Weiterfahren</button><button class="secondary" data-open-courses>Zu den Kurskarten</button></div>',
    );
  } else toast('Kurskarte gelocht · Nächster Halt ' + E.ROUTES[routeNumber(card.stops[book.step])].name);
  save();
}
function signal() {
  advanceClock();
  audio.wake();
  const perfect = E.stats(s).window,
    before = s.money;
  if (!E.signal(s)) return;
  audio.effect(perfect ? 'perfect' : 'signal');
  popup((perfect ? 'Pünktlich!  ' : '') + '+' + fmt(s.money - before, true) + ' M');
  if (perfect) coursePunch();
  render();
}
function goToCourseStop() {
  if (book.active < 0) return;
  const target = routeNumber(COURSES[book.active].stops[book.step]);
  if (target >= s.unlocked) {
    view.routeDetail = target;
    navigate('network', 'routes');
    toast('Dieser Halt öffnet später in der Schicht.');
    return;
  }
  if (s.route !== target) {
    E.selectRoute(s, target);
    audio.effect('switch');
    save();
  }
  view.routeDetail = target;
  navigate('station');
  toast('Kurskarte · Bei Einfahrt das Signal geben.');
}
function acceptCourse(i) {
  if (
    !validCard(i) ||
    book.done.includes(i) ||
    !COURSES[i].stops.every((id) => routeNumber(id) < s.unlocked)
  )
    return;
  book.active = i;
  book.step = 0;
  save();
  goToCourseStop();
}
function requestCourse(i) {
  if (book.active >= 0 && book.active !== i) {
    openDialog(
      'Kurskarte wechseln?',
      '<p>Deine begonnene Karte „' +
        esc(COURSES[book.active].title) +
        '“ beginnt beim nächsten Annehmen wieder am ersten Halt.</p><div class="dialog-actions"><button class="primary" data-confirm-course="' +
        i +
        '">Karte wechseln</button><button class="secondary" data-dialog-close>Behalten</button></div>',
    );
  } else acceptCourse(i);
}
function chooseRoute(i) {
  if (E.selectRoute(s, i)) {
    view.routeDetail = i;
    audio.effect('route');
    toast(E.ROUTES[i].name + ' übernommen');
    save();
    navigate('station');
  }
}
function claim(i) {
  if (E.claim(s, i)) {
    audio.effect('stamp');
    toast('Auftrag eingelöst · +' + fmt(E.CONTRACTS[i].reward) + ' M');
    save();
    render();
  }
}
function requestPrestige() {
  const q = E.stats(s);
  if (!q.prestigeReady) return;
  openDialog(
    'Schicht übergeben?',
    '<p>Du erhältst <strong>' +
      q.prestigeReward +
      ' Netzmarken</strong> und startest am Kesselplatz mit ' +
      fmt(q.nextStartFunds) +
      ' M. Der Werkstattausbau und die Linieneinnahmen dieser Schicht beginnen von vorn.</p><p>Aufträge, Kurskarten, bisherige Fahrgastzahlen und Konzessionsvorteile behältst du.</p><div class="dialog-actions"><button class="primary" data-confirm-prestige>Schicht übergeben</button><button class="secondary" data-dialog-close>Weiterfahren</button></div>',
  );
}
function settings() {
  const check = (key, label) =>
    '<label class="setting">' +
    label +
    '<input data-setting="' +
    key +
    '" type="checkbox" ' +
    (prefs[key] ? 'checked' : '') +
    '></label>';
  const range = (key, label, min = 0) =>
    '<label class="setting">' +
    label +
    '<input data-setting="' +
    key +
    '" type="range" min="' +
    min +
    '" max="100" value="' +
    Math.round(prefs[key] * 100) +
    '"></label>';
  openDialog(
    'Einstellungen',
    '<label class="setting">Beleuchtung<select data-setting="theme"><option value="light" ' +
      (prefs.theme === 'light' ? 'selected' : '') +
      '>Papier</option><option value="dark" ' +
      (prefs.theme === 'dark' ? 'selected' : '') +
      '>Nachtschicht</option></select></label>' +
      check('mono', 'Schwarzweiß') +
      check('contrast', 'Hoher Kontrast') +
      check('reduced', 'Bewegung reduzieren') +
      range('brightness', 'Papierhelligkeit', 65) +
      range('detail', 'Szenendetails und Menge') +
      check('sound', 'Ton eingeschaltet') +
      range('volume', 'Gesamtlautstärke') +
      range('music', 'Musiklautstärke') +
      '<div class="dialog-actions"><button class="secondary" data-save>Jetzt speichern</button><button class="secondary" data-help>Handbuch</button></div><p class="dialog-foot">Automatische Speicherung alle 15 Sekunden und beim Schließen. F11 schaltet das Vollbild um.</p>',
  );
}
function help() {
  openDialog(
    'Handbuch',
    [
      '<p>Jeder Fahrgast am Drehkreuz zahlt Fahrgeld. Die Tür läuft von selbst. Mit Anschub wird sie schneller.</p>',
      '<h3>Das Schwungrad</h3><p>Ziehe Kreise um die Tür oder drücke die Leertaste. Schnelle Bögen geben mehr Schwung und lassen Reisende kurz abheben. Mehrere Anschübe hintereinander bilden eine Serie.</p>',
      '<h3>Die Einfahrt</h3><p>Drücke F oder „Abfertigen“, solange eine Verbindung am Gleis hält. Ein pünktliches Signal bringt eine Prämie und erhöht kurz die Einnahmen. Ein frühes Signal fertigt einzelne Reisende ab.</p>',
      '<h3>Werkstatt und Linien</h3><p>W öffnet die Werkstatt. Werbung bringt Reisende, Türweite schafft Platz, der Motor erhöht den Durchsatz. Neue Flügel kannst du unter Türflügel einsetzen. Im Liniennetz übernimmst du neue Strecken.</p>',
      '<h3>Optionale Ziele</h3><p>Im Dienstbuch löst du Auftragsprämien ein. Im Liniennetz findest du Kurskarten. Fahre ihre Halte der Reihe nach an und gib jeweils ein pünktliches Signal.</p>',
      '<h3>Schichtwechsel</h3><p>Unter Konzession siehst du das nächste Kapitel, Startkapital und dauerhafte Vorteile. Das Betriebsziel steht im Archiv. Nach dem Finale kannst du weiterfahren.</p>',
      '<h3>Speichern und Bedienung</h3><p>Beim Schließen wird gespeichert. Der Bahnhof verdient während deiner Abwesenheit bis zu 24 Stunden weiter. Tab und Eingabe bedienen Menüs, Esc schließt sie. F1 öffnet dieses Handbuch, F11 das Vollbild.</p>',
      '<p>Mit Controller wechseln die Schultertasten die Ansicht. Steuerkreuz, A und B bedienen Menüs. X gibt Schub, Y das Signal.</p>',
      '<p class="dialog-foot">Nachtweiche 1.0 · Fahrgeld in Mark (M), Netzmarken in NM.</p>',
    ].join(''),
  );
}
function clickAction(e) {
  const b = e.target.closest('button,[data-route-detail]');
  if (!b || b.disabled) return;
  audio.wake();
  const d = b.dataset;
  if (b.id === 'spin') spin();
  else if (b.id === 'signal') signal();
  else if (b.id === 'show-shop') toggleShop();
  else if (b.id === 'close-shop') $('workbench').close();
  else if (b.id === 'sound') {
    prefs.sound = !prefs.sound;
    applyPrefs();
    audio.wake();
    if (prefs.sound) audio.effect('switch');
    save();
  } else if (b.id === 'settings') settings();
  else if (b.id === 'help' || 'help' in d) help();
  else if ('dialogClose' in d) $('dialog').close();
  else if (d.tab) navigate(d.tab);
  else if (d.network) navigate('network', d.network);
  else if (d.journal) navigate('journal', d.journal);
  else if (d.bench) {
    savedShopScroll[view.bench] = $('shop-list').scrollTop;
    view.bench = d.bench;
    render();
  } else if (d.qty) {
    view.qty = d.qty === 'max' ? 'max' : Number(d.qty);
    render();
  } else if ('buy' in d) {
    const i = Number(d.buy),
      before = s.levels[i];
    if (view.qty === 'max' ? E.buyMax(s, i) : E.buy(s, i, view.qty)) {
      audio.effect('buy');
      toast(
        E.UPGRADES[i].name +
          ' · Stufe ' +
          s.levels[i] +
          (s.levels[i] - before > 1 ? ' (+' + (s.levels[i] - before) + ')' : ''),
      );
      save();
      render();
    }
  } else if ('blade' in d) {
    if (E.selectBlade(s, Number(d.blade))) {
      audio.effect('switch');
      save();
      render();
    }
  } else if ('routeDetail' in d) {
    view.routeDetail = Number(d.routeDetail);
    render();
  } else if ('route' in d) chooseRoute(Number(d.route));
  else if ('claim' in d) claim(Number(d.claim));
  else if ('perk' in d) {
    if (E.buyPerk(s, Number(d.perk))) {
      audio.effect('buy');
      save();
      render();
    }
  } else if ('course' in d) requestCourse(Number(d.course));
  else if ('courseGo' in d) goToCourseStop();
  else if ('confirmCourse' in d) {
    $('dialog').close();
    acceptCourse(Number(d.confirmCourse));
  } else if ('openCourses' in d) {
    $('dialog').close();
    navigate('network', 'courses');
  } else if (b.id === 'prestige') requestPrestige();
  else if ('confirmPrestige' in d && E.prestige(s)) {
    $('dialog').close();
    view.routeDetail = s.route;
    audio.effect('prestige');
    save();
    navigate('network', 'prestige');
    toast('Neue Schicht eröffnet. Deine Netzmarken sind bereit.');
  } else if ('showEnding' in d) showEnding();
  else if ('save' in d) {
    if (save()) {
      b.textContent = 'Gespeichert ✓';
      toast('Spielstand gespeichert.');
    }
  } else if (b.id === 'next-job') {
    const g = stationGoal();
    if (g.type === 'claim') claim(g.index);
    else if (g.type === 'course') goToCourseStop();
    else if (g.type === 'line') {
      view.routeDetail = g.index;
      navigate('network', 'routes');
    } else if (g.type === 'prestige') navigate('network', 'prestige');
    else navigate('journal', g.type === 'archive' ? 'archive' : 'contracts');
  }
}
document.addEventListener('click', clickAction);
function toggleShop() {
  if ($('workbench').open) {
    $('workbench').close();
    return;
  }
  if ($('dialog').open || view.tab !== 'station') return;
  $('workbench').showModal();
  $('show-shop').setAttribute('aria-expanded', 'true');
  render();
}
$('workbench').addEventListener('close', () => $('show-shop').setAttribute('aria-expanded', 'false'));
$('workbench').addEventListener('click', (e) => {
  if (e.target !== $('workbench')) return;
  const b = $('workbench').getBoundingClientRect();
  if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)
    $('workbench').close();
});
$('dialog').addEventListener('input', (e) => {
  const key = e.target.dataset.setting;
  if (!key || !(key in prefs)) return;
  prefs[key] =
    e.target.type === 'checkbox'
      ? e.target.checked
      : e.target.type === 'range'
        ? Number(e.target.value) / 100
        : e.target.value;
  applyPrefs();
  audio.wake();
});
$('dialog').addEventListener('change', (e) => {
  if (e.target.dataset.setting) save();
});
$('dialog').addEventListener('click', (e) => {
  const dlg = $('dialog');
  if (e.target !== dlg) return;
  const box = dlg.getBoundingClientRect();
  if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)
    dlg.close();
});
let drag = null;
function pointerAngle(e) {
  const box = $('world').getBoundingClientRect(),
    c = scene.gateCenter();
  return Math.atan2(e.clientY - box.top - c.y, e.clientX - box.left - c.x);
}
$('world').addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || drag) return;
  audio.wake();
  $('world').setPointerCapture(e.pointerId);
  drag = {
    id: e.pointerId,
    angle: pointerAngle(e),
    moved: 0,
    travel: 0,
    x: e.clientX,
    y: e.clientY,
    last: performance.now(),
  };
});
$('world').addEventListener('pointermove', (e) => {
  if (drag?.id !== e.pointerId) return;
  const angle = pointerAngle(e),
    diff = Math.atan2(Math.sin(angle - drag.angle), Math.cos(angle - drag.angle));
  drag.angle = angle;
  drag.travel += diff;
  drag.moved += Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
  drag.x = e.clientX;
  drag.y = e.clientY;
  if (Math.abs(drag.travel) >= 0.7) {
    const now = performance.now(),
      speed = Math.abs(drag.travel) / Math.max(0.03, (now - drag.last) / 1000);
    spin(clamp(0.7 + speed * 0.19, 0.7, 2));
    drag.travel = 0;
    drag.last = now;
  }
});
$('world').addEventListener('pointerup', (e) => {
  if (drag?.id !== e.pointerId) return;
  if (drag.moved < 9) spin();
  drag = null;
});
for (const evt of ['pointercancel', 'lostpointercapture'])
  $('world').addEventListener(evt, () => {
    drag = null;
  });
document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'F1') {
    e.preventDefault();
    if ($('workbench').open) $('workbench').close();
    if ($('dialog').open && $('dialog-title').textContent === 'Handbuch') $('dialog').close();
    else help();
    return;
  }
  if ($('dialog').open) return;
  if (e.code === 'KeyW' && !e.repeat && view.tab === 'station') {
    e.preventDefault();
    toggleShop();
    return;
  }
  if ($('workbench').open) return;
  if (e.target.closest('.map-node') && ['Enter', ' '].includes(e.key)) {
    e.preventDefault();
    e.target.closest('.map-node').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return;
  }
  if (e.target.matches('input,select,textarea')) return;
  if (view.tab === 'station' && e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) spin();
  }
  if (view.tab === 'station' && e.code === 'KeyF') {
    e.preventDefault();
    if (!e.repeat) signal();
  }
});
let previousPad = [],
  padLastMove = 0;
function gamepad(now) {
  const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
  if (!pad) {
    previousPad = [];
    return;
  }
  const down = pad.buttons.map((b) => b.pressed),
    edge = (i) => down[i] && !previousPad[i],
    modal = $('dialog').open ? $('dialog') : $('workbench').open ? $('workbench') : null;
  if (edge(1) && modal) modal.close();
  if (!modal) {
    if (edge(2) && view.tab === 'station') spin();
    if (edge(3) && view.tab === 'station') signal();
    const tabs = ['station', 'network', 'journal'];
    if (edge(4) || edge(5)) navigate(tabs[(tabs.indexOf(view.tab) + (edge(5) ? 1 : 2)) % 3]);
    if (edge(9)) settings();
  }
  const dx =
    (down[15] ? 1 : 0) - (down[14] ? 1 : 0) + (Math.abs(pad.axes[0]) > 0.6 ? Math.sign(pad.axes[0]) : 0);
  const dy =
    (down[13] ? 1 : 0) - (down[12] ? 1 : 0) + (Math.abs(pad.axes[1]) > 0.6 ? Math.sign(pad.axes[1]) : 0);
  if ((dx || dy) && now - padLastMove > 175) {
    padLastMove = now;
    const focusable = [
      ...(modal || document).querySelectorAll('button:not(:disabled),select,input,[tabindex="0"]'),
    ].filter((el) => el.getClientRects().length);
    const focused = focusable.indexOf(document.activeElement);
    focusable[(focused + (dx + dy < 0 ? -1 : 1) + focusable.length) % focusable.length]?.focus();
  }
  if (edge(0)) document.activeElement?.click?.();
  previousPad = down;
}
function drawFrame(now) {
  requestAnimationFrame(drawFrame);
  if (document.hidden || now - lastFrame < (prefs.reduced ? 100 : 1000 / 36)) return;
  lastFrame = now;
  advanceClock();
  gamepad(now);
  if (view.tab === 'station') {
    const q = E.stats(s),
      r = E.ROUTES[s.route],
      visitor = s.events.find((e) => e.kind === 'visitor' && s.playTime - e.time < 12);
    scene.draw(
      {
        speed: s.momentum,
        angle: s.turns * Math.PI * 2,
        level: s.levels.reduce((a, b) => a + b, 0),
        route: s.route,
        routeId: r.id,
        prestige: s.prestiges,
        autoDispatch: q.autoDispatch,
        blade: s.blade,
        crowd: clamp(0.08 + Math.log1p(q.throughput) * 0.13 + (q.window ? 0.16 : 0), 0, 1),
        wide: clamp(s.levels[3] / 18, 0, 1),
        arrival: q.window ? r.id : '',
        combo: s.combo,
        theme: prefs.theme,
        reduced: prefs.reduced,
        contrast: prefs.contrast,
        detail: prefs.detail,
        special: visitor?.visitor || '',
      },
      now / 1000,
    );
  }
  audio.tick(s.route, s.momentum);
  if (now - lastUI >= 160) {
    lastUI = now;
    render();
  }
}
applyPrefs();
navigate('station');
if (offlineSummary) {
  save();
  if (!$('dialog').open)
    openDialog(
      'Willkommen zurück',
      '<div class="eyebrow"><span class="signal-dot"></span>NACHTPROTOKOLL</div><h3>Der Bahnhof lief weiter.</h3><p>Während deiner Abwesenheit hat die Automatik Fahrgäste abgefertigt.</p><div class="statline"><span>Gewertete Betriebszeit</span><strong>' +
        duration(offlineSummary.seconds) +
        '</strong></div><div class="statline"><span>Fahrgeld</span><strong>+' +
        fmt(offlineSummary.earned, true) +
        ' M</strong></div><div class="statline"><span>Fahrgäste</span><strong>+' +
        fmt(offlineSummary.passengers) +
        '</strong></div><div class="dialog-actions"><button class="primary" data-dialog-close>Schicht übernehmen</button></div>',
    );
}
opening = false;
showPendingEnding();
for (const modal of [$('dialog'), $('workbench')]) modal.addEventListener('close', showPendingEnding);
setInterval(() => {
  advanceClock();
  if (performance.now() - lastSaveAt >= 15000) save();
}, 1000);
document.addEventListener('visibilitychange', () => {
  advanceClock();
  if (document.hidden) save();
  else render();
});
window.addEventListener('beforeunload', save);
requestAnimationFrame(drawFrame);
