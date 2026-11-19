'use strict';

const ROUTE_POSITIONS = [
  [32, 53],
  [96, 53],
  [146, 103],
  [205, 103],
  [255, 53],
  [317, 53],
  [367, 103],
  [428, 103],
  [455, 130],
  [422, 163],
  [359, 163],
  [310, 212],
  [246, 212],
  [196, 162],
  [134, 162],
  [83, 213],
  [32, 213],
  [69, 250],
  [129, 250],
  [178, 299],
  [245, 299],
  [311, 299],
  [364, 246],
  [424, 246],
];

function drawNetworkMap() {
  const path = (from, to) => 'M' + from[0] + ',' + from[1] + ' L' + to[0] + ',' + to[1];
  const grid =
    Array.from({ length: 15 }, (_, i) => '<path d="M' + i * 38 + ' 0v340"/>').join('') +
    Array.from({ length: 10 }, (_, i) => '<path d="M0 ' + i * 38 + 'h500"/>').join('');
  const segments = E.ROUTES.slice(1)
    .map(
      (_, i) =>
        '<path class="map-line ' +
        (i + 1 < s.unlocked ? 'open' : '') +
        '" d="' +
        path(ROUTE_POSITIONS[i], ROUTE_POSITIONS[i + 1]) +
        '"/>',
    )
    .join('');
  const stops = E.ROUTES.map((route, i) => {
    const [x, y] = ROUTE_POSITIONS[i],
      open = i < s.unlocked ? 'open' : '';
    const ring =
      i === s.route
        ? '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="13" fill="none" stroke="var(--accent)" stroke-width="2"/>'
        : '';
    return (
      '<g role="button" tabindex="0" class="map-node" data-route-detail="' +
      i +
      '" aria-label="' +
      esc(route.name) +
      '"><title>' +
      esc(route.name) +
      '</title><circle cx="' +
      x +
      '" cy="' +
      y +
      '" r="17" fill="transparent"/>' +
      ring +
      '<circle class="map-stop ' +
      open +
      ' ' +
      (i === s.route ? 'here' : '') +
      '" cx="' +
      x +
      '" cy="' +
      y +
      '" r="7"/><text class="stop-tag ' +
      open +
      '" x="' +
      x +
      '" y="' +
      (y - 20) +
      '" text-anchor="middle">' +
      padded(i + 1) +
      ' ' +
      esc(route.glyph) +
      '</text></g>'
    );
  }).join('');
  return (
    '<div class="network-map"><span class="eyebrow"><span class="line-mark"></span>Linienplan</span><svg viewBox="0 0 485 345" aria-label="Linienplan mit ' +
    E.ROUTES.length +
    ' Haltestellen"><g stroke="var(--line)" opacity=".39" stroke-width=".65">' +
    grid +
    '</g>' +
    segments +
    stops +
    '</svg><div class="map-info"><span>● In Betrieb</span><span>' +
    s.unlocked +
    ' / ' +
    E.ROUTES.length +
    ' erschlossen</span></div></div>'
  );
}
function renderRoutes() {
  const route = E.ROUTES[view.routeDetail],
    i = view.routeDetail,
    active = i === s.route,
    unlocked = i < s.unlocked;
  const condition = routeRequirement(route);
  return (
    '<div class="net-grid"><div>' +
    drawNetworkMap() +
    '<section class="details-card"><div class="eyebrow">LINIE ' +
    padded(i + 1) +
    '</div><h3>' +
    esc(route.name) +
    '</h3><p class="copy">' +
    esc(route.desc) +
    ' Einfahrt alle ' +
    route.cycle +
    ' s, davon ' +
    Math.min(route.cycle, route.window + s.perks[6]) +
    ' s zum Abfertigen.</p><button class="small-action" data-route="' +
    i +
    '" ' +
    (!unlocked || active ? 'disabled' : '') +
    '>' +
    (active ? 'Hier fährst du' : unlocked ? 'Linie übernehmen' : esc(condition)) +
    '</button></section></div><section class="list-panel"><div class="panel-intro"><h3>Fahrplan</h3><p>Wähle eine Linie. Takt und Fahrgastaufkommen ändern sich mit der Strecke.</p></div><div class="routes-list">' +
    E.ROUTES.map(
      (r, j) =>
        '<button class="route-choice ' +
        (j === i ? 'current ' : '') +
        (j >= s.unlocked ? 'locked' : '') +
        '" data-route-detail="' +
        j +
        '"><span class="route-id">' +
        esc(r.glyph) +
        '</span><span><strong>' +
        esc(r.name) +
        '</strong><small>' +
        r.cycle +
        ' s Takt · ' +
        Math.min(r.cycle, r.window + s.perks[6]) +
        ' s Einfahrt</small></span><span class="micro">' +
        (j === s.route ? 'Aktiv' : j < s.unlocked ? 'Bereit' : 'Gesperrt') +
        '</span></button>',
    ).join('') +
    '</div></section></div>'
  );
}
function routeRequirement(route) {
  return (
    'Ab ' +
    fmt(route.target) +
    ' M Schichtumsatz' +
    (route.shifts ? ' · ' + route.shifts + ' Schichtwechsel' : '')
  );
}
function renderPrestige() {
  const q = E.stats(s),
    next = E.CHAPTERS[s.prestiges + 1];
  const info = [
    ['Abgeschlossene Schichten', fmt(s.prestiges)],
    ['Netzmarken verfügbar', fmt(s.stamps)],
    ['Dauerhafter Fahrgeldfaktor', '×' + decimal(q.metaMultiplier)],
    ['Nächstes Startkapital', fmt(q.nextStartFunds) + ' M'],
  ];
  if (q.autoDispatch)
    info.push(['Automatisch abgefertigt', '<span id="auto-dispatched">' + fmt(s.autoSignals) + '</span>']);
  const perks = E.PERKS.map((p, i) => {
    const cost = E.perkPrice(s, i),
      locked = s.prestiges < (p.shifts || 0);
    const label = locked ? 'Schicht ' + (p.shifts + 1) : s.perks[i] >= p.max ? 'Max' : cost + ' NM';
    return (
      '<div class="shop-item"><span class="tile-icon">' +
      icon(['ticket', 'motor', 'gear', 'signal', 'route', 'station', 'network'][i]) +
      '</span><div><h3>' +
      esc(p.name) +
      '</h3><p>Rang ' +
      s.perks[i] +
      ' / ' +
      p.max +
      ' · ' +
      esc(p.desc) +
      '</p></div><button class="buy" data-perk="' +
      i +
      '" ' +
      (cost > s.stamps ? 'disabled' : '') +
      '>' +
      label +
      '</button></div>'
    );
  }).join('');
  return (
    '<div class="net-grid"><div><article class="dark-card"><div class="eyebrow">KONZESSION · SCHICHT ' +
    padded(s.prestiges + 1) +
    '</div><h2>' +
    esc(q.chapter?.name || 'Freier Betrieb') +
    '</h2><p class="copy">' +
    esc(q.chapter?.desc || 'Das Streckennetz bleibt für weitere Schichtwechsel in Betrieb.') +
    '</p><div class="meter"><b id="prestige-meter"></b></div><div id="prestige-ratio" class="micro"></div><button id="prestige" class="primary"></button></article>' +
    '<section class="details-card"><h3>Deine Konzession</h3>' +
    info
      .map(([k, v]) => '<div class="statline"><span>' + k + '</span><strong>' + v + '</strong></div>')
      .join('') +
    '<p class="copy">' +
    (next
      ? 'Nächste Schicht · <strong>' + esc(next.name) + '</strong>. ' + esc(next.desc)
      : 'Dein Dienstbuch und deine Konzession bleiben bei jedem Schichtwechsel erhalten.') +
    '</p></section></div>' +
    '<section class="list-panel"><div class="panel-intro"><h3>Dauerhafte Vorteile</h3><p>Bezahle mit den Netzmarken aus deinen Schichtwechseln.</p></div>' +
    perks +
    '</section></div>'
  );
}
function renderCourses() {
  const visible = [],
    upcoming = [];
  COURSES.forEach((card, i) => {
    const done = book.done.includes(i),
      active = book.active === i,
      available = card.stops.every((id) => routeNumber(id) < s.unlocked);
    const next = active ? E.ROUTES[routeNumber(card.stops[book.step])] : null;
    const names = card.stops
      .map(
        (id, ix) =>
          '<span class="course-stop ' +
          (done || (active && ix < book.step) ? 'punched' : '') +
          '">' +
          esc(E.ROUTES[routeNumber(id)].name) +
          '</span>',
      )
      .join('<span class="connector">›</span>');
    const required = card.stops.reduce((n, id) => Math.max(n, routeNumber(id)), 0);
    const html =
      '<article class="contract course ' +
      (done ? 'done' : active ? 'ready' : '') +
      '"><span class="ticket-index">KURSKARTE ' +
      padded(i + 1) +
      (done ? ' · GELOCHT' : active ? ' · IM DIENST' : '') +
      '</span><h3>' +
      esc(card.title) +
      '</h3><p>' +
      esc(done ? card.story : card.owner) +
      '</p><div class="course-route">' +
      names +
      '</div><div class="contract-bottom">' +
      (done
        ? '<span class="stamp">' + esc(card.mark) + '</span>'
        : active
          ? '<span>' +
            esc(next?.name || '') +
            ' · ' +
            (book.step + 1) +
            '/' +
            card.stops.length +
            '</span><button class="buy" data-course-go>Zum Halt</button>'
          : '<span>' +
            (available ? 'Bereit' : 'Ab ' + esc(E.ROUTES[required].name)) +
            '</span><button class="buy" data-course="' +
            i +
            '" ' +
            (available ? '' : 'disabled') +
            '>Annehmen</button>') +
      '</div></article>';
    (done || active || available ? visible : upcoming).push(html);
  });
  if (upcoming.length) visible.push(upcoming.shift());
  const archive = upcoming.length
    ? '<details class="future-courses"><summary>Spätere Kurskarten (' +
      upcoming.length +
      ')</summary><div class="journal-grid">' +
      upcoming.join('') +
      '</div></details>'
    : '';
  return (
    '<p class="page-intro">Begleite einen Fahrgast auf mehreren Linien. Gib an jedem Halt bei der Einfahrt das Signal. Eine vollständige Karte bringt einen Stempel und 45 Sekunden Fahrgeld.</p><div class="journal-grid">' +
    visible.join('') +
    '</div>' +
    archive
  );
}
function renderContracts() {
  return (
    '<div class="journal-grid">' +
    E.CONTRACTS.map(
      (c, i) =>
        '<article class="contract" data-contract-card="' +
        i +
        '"><div class="ticket-index">DIENSTAUFTRAG ' +
        padded(i + 1) +
        '</div><h3>' +
        esc(c.name) +
        '</h3><p>' +
        esc(c.desc) +
        '</p><div class="meter"><b></b></div><div class="contract-bottom"><span></span><button class="buy" data-claim="' +
        i +
        '"></button></div></article>',
    ).join('') +
    '</div>'
  );
}
function renderArchive() {
  const rows = [
    ['Fahrgäste gesamt', fmt(s.passengers)],
    ['Umsatz über alle Schichten', fmt(s.total) + ' M'],
    ['Betriebszeit mit Offline-Fortschritt', duration(s.playTime)],
    ['Pünktliche Signale', fmt(s.perfectSignals)],
    ['Längste Anschubserie', fmt(s.peakCombo)],
    ['Flugeinlagen', fmt(s.flings)],
    ['Größtes Liniennetz', s.maxUnlocked + ' / ' + E.ROUTES.length],
    ['Kurskarten gelocht', book.done.length + ' / ' + COURSES.length],
  ];
  return (
    '<div class="net-grid"><section class="list-panel"><div class="panel-intro"><h3>Schichtprotokoll</h3>' +
    rows
      .map(([k, v]) => '<div class="statline"><span>' + k + '</span><strong>' + v + '</strong></div>')
      .join('') +
    '</div><div class="archive-row"><strong>' +
    (s.ended ? 'Die Stadt wacht auf' : 'Ziel der letzten Schicht') +
    '</strong><p>' +
    (s.ended
      ? 'Die Horizontlinie fährt. Das Netz bleibt für weitere Schichten geöffnet.'
      : 'Fahre auf der Horizontlinie und erwirtschafte in dieser Schicht ' +
        fmt(E.stats(s).endTarget) +
        ' M.') +
    '</p></div>' +
    (s.ended
      ? '<div class="archive-row"><button class="small-action" data-show-ending>Abschlussfahrkarte ansehen</button></div>'
      : '') +
    '</section><section class="list-panel"><div class="panel-intro"><h3>Auf dem Bahnsteig</h3><p>Besondere Begegnungen aus deinen Nachtschichten.</p></div>' +
    E.VISITORS.map(
      (v, i) =>
        '<div class="archive-row"><strong>' +
        esc(s.discovered[i] ? v.name : 'Unbekannte Begegnung') +
        '</strong><p>' +
        esc(s.discovered[i] ? v.desc : 'Ein freier Eintrag im Dienstbuch.') +
        '</p></div>',
    ).join('') +
    '</section></div>'
  );
}
