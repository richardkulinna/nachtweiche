(function () {
  'use strict';

  const UPGRADES = [
    { id: 'werbung', name: 'Werbung', desc: 'Mehr Fahrgäste finden den Weg zu deiner Station.', base: 14, growth: 1.76 },
    { id: 'getriebe', name: 'Getriebe', desc: 'Ein kräftigerer Anschub hält den Schwung länger.', base: 21, growth: 1.77 },
    { id: 'automatik', name: 'Automatik', desc: 'Der Motor lässt das Drehkreuz auch ohne Anschub schneller laufen.', base: 8, growth: 1.77 },
    { id: 'tuerweite', name: 'Türweite', desc: 'Mehr Durchsatz für volle Bahnsteige und breite Gruppen.', base: 31, growth: 1.76 },
    { id: 'fluegel', name: 'Flügel', desc: 'Verbessert den Durchsatz und schaltet neue Flügelformen frei.', base: 44, growth: 1.78 },
    { id: 'fahrpreis', name: 'Fahrpreis', desc: 'Jeder Durchgang bringt mehr Fahrgeld.', base: 33, growth: 1.79 },
    { id: 'gruppen', name: 'Gruppen', desc: 'Gruppen reisen effizienter und lassen mehr Fahrgeld zurück.', base: 51, growth: 1.77 },
  ];

  const ROUTES = [
    { id: 'bus', name: 'Nachtbus', glyph: 'B', desc: 'Ein ruhiger Takt für den Anfang.', target: 0, cycle: 24, window: 6, yield: 1, traffic: 1, shifts: 0 },
    { id: 'tram', name: 'Straßenbahn', glyph: 'T', desc: 'Häufige Ankünfte und verlässliche Einnahmen.', target: 90, cycle: 21, window: 5, yield: 1.08, traffic: 1.2, shifts: 0 },
    { id: 'metro', name: 'U-Bahn', glyph: 'U', desc: 'Dichte Pendlerwellen am unterirdischen Bahnsteig.', target: 560, cycle: 28, window: 6, yield: 1.17, traffic: 1.58, shifts: 0 },
    { id: 'zug', name: 'Regionalzug', glyph: 'R', desc: 'Längere Pausen und volle Züge aus dem Umland.', target: 3300, cycle: 37, window: 7, yield: 1.44, traffic: 1.86, shifts: 0 },
    { id: 'express', name: 'Nacht-Express', glyph: 'X', desc: 'Genaues Abfertigen lohnt sich hier besonders.', target: 18000, cycle: 36, window: 5, yield: 1.96, traffic: 1.72, shifts: 0 },
    { id: 'faehre', name: 'Hafenfähre', glyph: 'F', desc: 'Wenige Ankünfte, dafür ein langes Abfertigungsfenster.', target: 65000, cycle: 51, window: 12, yield: 1.72, traffic: 2.22, shifts: 0 },
    { id: 'flug', name: 'Flughafen', glyph: 'A', desc: 'Seltene Ankünfte mit hohem Fahrpreis.', target: 220000, cycle: 47, window: 7, yield: 2.49, traffic: 1.95, shifts: 0 },
    { id: 'post', name: 'Nachtpost', glyph: 'P', desc: 'Fracht und Besatzungen treffen in engem Takt ein.', target: 1700000, cycle: 25, window: 5, yield: 2.33, traffic: 2.48, shifts: 1 },
    { id: 'tunnel', name: 'Basistunnel', glyph: 'S', desc: 'Ein Pendlerstrom tief unter der Stadt.', target: 8700000, cycle: 32, window: 8, yield: 2.57, traffic: 2.88, shifts: 1 },
    { id: 'magnet', name: 'Magnetschwebebahn', glyph: 'M', desc: 'Große Spitzen bei kurzen Aufenthalten.', target: 32000000, cycle: 30, window: 5, yield: 3.32, traffic: 2.77, shifts: 2 },
    { id: 'pol', name: 'Polarlinie', glyph: 'K', desc: 'Expeditionen reisen in großen Gruppen.', target: 132000000, cycle: 44, window: 10, yield: 3.50, traffic: 3.05, shifts: 2 },
    { id: 'kontinental', name: 'Kontinentalzug', glyph: 'C', desc: 'Doppellange Züge aus dem Fernverkehr.', target: 350000000, cycle: 53, window: 9, yield: 3.72, traffic: 3.22, shifts: 2 },
    { id: 'ozean', name: 'Ozeanlinie', glyph: 'O', desc: 'Die Passagierspitze bleibt lange genug für ein verlässliches Signal.', target: 900000000, cycle: 56, window: 15, yield: 3.99, traffic: 3.15, shifts: 3 },
    { id: 'meerbruecke', name: 'Meeresbrücke', glyph: 'Ü', desc: 'Schwere Doppelzüge bringen lange Reisegruppen.', target: 7300000000, cycle: 47, window: 11, yield: 4.30, traffic: 3.64, shifts: 3 },
    { id: 'fracht', name: 'Frachtkorridor', glyph: 'G', desc: 'Automatisch abgefertigte Konvois bringen 30 % mehr Fahrgeld.', target: 34000000000, cycle: 57, window: 12, yield: 4.5, traffic: 4.31, shifts: 4, automatic: 1.30 },
    { id: 'stratosphaere', name: 'Stratosphären-Shuttle', glyph: 'L', desc: 'Kurzer Aufenthalt mit 30 % Aufschlag auf pünktliche Abfertigung.', target: 130000000000, cycle: 35, window: 5, yield: 5.15, traffic: 4.08, shifts: 4, dispatch: 1.30 },
    { id: 'kontinentalring', name: 'Kontinentalring', glyph: 'I', desc: 'Viele Anschlüsse im besonders langen Ankunftsfenster.', target: 600000000000, cycle: 42, window: 14, yield: 5.34, traffic: 4.65, shifts: 5, automatic: 1.15 },
    { id: 'versuch', name: 'Versuchstunnel', glyph: 'V', desc: 'Versuchsfahrten mit dichtem Takt und 40 % höherem Signalbonus.', target: 1800000000000, cycle: 25, window: 5, yield: 5.84, traffic: 4.58, shifts: 5, dispatch: 1.40 },
    { id: 'vakuum', name: 'Vakuumlinie', glyph: 'W', desc: 'Die Leitstelle fertigt Druckschleusen automatisch effizienter ab.', target: 8000000000000, cycle: 54, window: 10, yield: 6.07, traffic: 5.12, shifts: 6, automatic: 1.40 },
    { id: 'zubringer', name: 'Zubringer Null', glyph: 'Ø', desc: 'Testzug mit besonders kurzem Aufenthalt und 50 % mehr Signalbonus.', target: 25000000000000, cycle: 29, window: 4, yield: 6.38, traffic: 5.04, shifts: 6, dispatch: 1.50 },
    { id: 'polarring', name: 'Polarring', glyph: 'N', desc: 'Große Fernreisegruppen und 50 % mehr Fahrgeld bei Automatik-Abfertigung.', target: 100000000000000, cycle: 56, window: 16, yield: 6.74, traffic: 5.94, shifts: 7, automatic: 1.50 },
    { id: 'horizont', name: 'Horizontlinie', glyph: 'H', desc: 'Verbindet alle Takte des Netzes an einem Bahnsteig.', target: 320000000000000, cycle: 40, window: 8, yield: 7.05, traffic: 5.8, shifts: 7, dispatch: 1.20, automatic: 1.25 },
  ];

  const BLADES = [
    { id: 'kreuz', name: 'Vierkreuz', desc: 'Ausgewogener Durchsatz und kräftiger Anschub.', level: 0, capacity: 1, push: 1, idle: 1, timing: 1 },
    { id: 'bogen', name: 'Bogenflügel', desc: '35 % mehr Platz. Im Ankunftsfenster passieren noch mehr Gruppen. Der Anschub ist schwächer.', level: 3, capacity: 1.35, push: .8, idle: 1, timing: 1, crowds: 1.16 },
    { id: 'spirale', name: 'Spiralflügel', desc: '35 % stärkerer Anschub. Der Motor läuft langsamer.', level: 6, capacity: 1.02, push: 1.35, idle: .88, timing: 1 },
    { id: 'lamelle', name: 'Lamellenrad', desc: '24 % mehr Motorkraft. Der Anschub ist schwächer.', level: 10, capacity: 1, push: .73, idle: 1.24, timing: 1 },
    { id: 'stern', name: 'Sternflügel', desc: '45 % stärkeres Signal bei pünktlicher Abfertigung.', level: 15, capacity: 1.09, push: 1.09, idle: 1, timing: 1.45 },
    { id: 'resonanz', name: 'Resonanzflügel', desc: '45 % mehr Fahrgeld bei automatischer Abfertigung. Der Anschub ist schwächer.', level: 50, shifts: 4, capacity: 1.20, push: .84, idle: 1.16, timing: 1, automatic: 1.45 },
  ];

  const PERKS = [
    { id: 'netzkasse', name: 'Netzkasse', desc: '+18 % Fahrgeld je Rang.', max: 8 },
    { id: 'nachtstrom', name: 'Nachtstrom', desc: '+18 % Motorleistung je Rang.', max: 8 },
    { id: 'werkzeugkasten', name: 'Werkzeugkasten', desc: '−8 % Ausbaukosten je Rang.', max: 6 },
    { id: 'leitstelle', name: 'Leitstelle', desc: 'Pünktliche Signale bringen je Rang 20 % mehr Fahrgeld.', max: 6 },
    { id: 'vorlauf', name: 'Vorlauf', desc: 'Jeder Rang startet neue Schichten mit einer zusätzlichen Linie und 25 Fahrgeld.', max: 4 },
    { id: 'taktsteuerung', name: 'Taktsteuerung', desc: 'Ab der vierten Konzession gewährt jeder Rang 30 % mehr Fahrgeld bei automatischer Abfertigung.', max: 6, shifts: 4 },
    { id: 'fensterdienst', name: 'Fensterdienst', desc: 'Ab der fünften Konzession verlängert jeder Rang das Abfertigungsfenster um eine Sekunde.', max: 5, shifts: 5 },
  ];

  const CONTRACTS = [
    { id: 'erste', name: 'Erste Schicht', desc: 'Lass 80 Fahrgäste durchs Drehkreuz.', target: 80, reward: 45, metric: 'passengers' },
    { id: 'plan', name: 'Nach Plan', desc: 'Setze 5 pünktliche Signale.', target: 5, reward: 180, metric: 'perfectSignals' },
    { id: 'hand', name: 'Handbetrieb', desc: 'Erreiche eine Serie von 12 Anschüben.', target: 12, reward: 160, metric: 'peakCombo' },
    { id: 'netz', name: 'Netzanschluss', desc: 'Erschließe 5 Linien in einer Schicht.', target: 5, reward: 1300, metric: 'unlocked' },
    { id: 'stadt', name: 'Stadt in Bewegung', desc: 'Befördere 6.000 Fahrgäste.', target: 6000, reward: 4500, metric: 'passengers' },
    { id: 'wechsel', name: 'Schlüsselübergabe', desc: 'Schließe zwei Schichtwechsel ab.', target: 2, reward: 44000, metric: 'prestiges' },
    { id: 'durchgehend', name: 'Durchgehend geöffnet', desc: 'Befördere 250.000 Fahrgäste.', target: 250000, reward: 280000, metric: 'passengers' },
    { id: 'takt', name: 'Im Takt', desc: 'Setze 50 pünktliche Signale.', target: 50, reward: 310000, metric: 'perfectSignals' },
    { id: 'horizont', name: 'Letzte Abfahrt', desc: 'Erreiche das Betriebsziel auf der Horizontlinie.', target: 1, reward: 15000000, metric: 'ended' },
    { id: 'fernverkehr', name: 'Fernverkehrsnetz', desc: 'Befördere 50 Millionen Fahrgäste.', target: 50000000, reward: 540000000, metric: 'passengers' },
    { id: 'morgen', name: 'Morgenschicht', desc: 'Schließe fünf Schichtwechsel ab.', target: 5, reward: 9500000000, metric: 'prestiges' },
    { id: 'reserve', name: 'Taktreserve', desc: 'Setze 500 pünktliche Signale.', target: 500, reward: 15000000000, metric: 'perfectSignals' },
    { id: 'taktanlage', name: 'Taktanlage erprobt', desc: 'Fertige 150 Verbindungen automatisch ab.', target: 150, reward: 18000000000, metric: 'autoSignals' },
    { id: 'versuchsfeld', name: 'Versuchsfeld', desc: 'Erschließe 17 Linien in einer Schicht.', target: 17, reward: 170000000000, metric: 'unlocked' },
    { id: 'nullserie', name: 'Nullserie', desc: 'Befördere 2 Milliarden Fahrgäste.', target: 2000000000, reward: 65000000000000, metric: 'passengers' },
    { id: 'betriebsrat', name: 'Endloser Takt', desc: 'Schließe neun Schichtwechsel ab.', target: 9, reward: 1000000000000000000, metric: 'prestiges' },
  ];

  const VISITORS = [
    { id: 'pendler', name: 'Pendlerwelle', glyph: '↑', desc: 'Eine volle Verbindung bringt kurzfristig mehr Fahrgäste.' },
    { id: 'inspektion', name: 'Streckenprüfung', glyph: '◇', desc: 'Die Prüfung gewährt eine Prämie für deinen Ausbaustand.' },
    { id: 'nachtzug', name: 'Anschlussgruppe', glyph: '▦', desc: 'Ein Anschluss schickt unplanmäßig eine Reisegruppe.' },
    { id: 'mechanik', name: 'Mobiler Werkdienst', glyph: '⊕', desc: 'Ein Werkdienst gibt dem Drehkreuz neuen Schwung.' },
    { id: 'sonderfahrt', name: 'Sonderfahrt', glyph: '★', desc: 'Auf den Fernlinien bringt eine Sonderfahrt hohes Fahrgeld.' },
  ];

  const CHAPTERS = [
    { name: 'Stadtbetrieb', target: 640000, desc: 'Nachtbusse, Regionalverkehr und der erste Flughafenanschluss.' },
    { name: 'Fernnetz', target: 18000000, desc: 'Nachtpost und Basistunnel nehmen den Betrieb auf.' },
    { name: 'Schnellverkehr', target: 520000000, desc: 'Magnetschwebebahn, Polarlinie und die ersten Kontinentalzüge.' },
    { name: 'Übersee', target: 18000000000, desc: 'Ozeanlinie, Meeresbrücke und die erste automatische Abfertigung starten.' },
    { name: 'Leitstellenbetrieb', target: 280000000000, desc: 'Die Leitstelle erweitert die Automatik. Taktsteuerung und Resonanzflügel werden verfügbar.' },
    { name: 'Versuchsbetrieb', target: 4400000000000, desc: 'Fensterdienst und Versuchstunnel erweitern den Fahrplan.' },
    { name: 'Fernversuche', target: 60000000000000, desc: 'Die Leitstelle testet die Vakuumlinie und Zubringer Null.' },
    { name: 'Horizont', target: 1350000000000000, desc: 'Polarring und Horizontlinie schließen das Streckennetz.' },
  ];
  const CAMPAIGN_SHIFTS = CHAPTERS.length - 1;
  const END_TARGET = 800000000000000;
  const AUTO_DISPATCH_SHIFT = 3;
  const OFFLINE_LIMIT = 24 * 60 * 60;
  const NUMBER_LIMIT = 1e190;
  const LEVEL_LIMIT = 480;
  const FINE_LEVEL = 20;
  const FINE_STEPS = 6;
  const SIGNAL_INTERVAL = 16;

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function safe(value, low = 0, high = NUMBER_LIMIT) {
    return Number.isFinite(value) ? clamp(value, low, high) : low;
  }

  function create() {
    return {
      version: 3, money: 8, total: 0, runTotal: 0, passengers: 0, runPassengers: 0,
      playTime: 0, runTime: 0, levels: UPGRADES.map(() => 0), momentum: 0, combo: 0,
      route: 0, blade: 0, unlocked: 1, maxUnlocked: 1, stamps: 0, prestiges: 0,
      perks: PERKS.map(() => 0), claimed: CONTRACTS.map(() => false), signals: 0,
      perfectSignals: 0, autoSignals: 0, flings: 0, peakCombo: 0, discovered: VISITORS.map(() => false),
      ended: false, events: [], serial: 0, turns: 0, lastSpin: -100, lastSignal: -100,
      lastAuto: -100, rushUntil: 0, boostUntil: 0, nextVisitor: 42, visitCount: 0,
    };
  }

  function load(raw) {
    const state = create();
    if (!raw || typeof raw !== 'object') return state;
    for (const key of ['money', 'total', 'runTotal', 'passengers', 'runPassengers', 'turns']) {
      state[key] = safe(raw[key] ?? state[key]);
    }
    for (const key of ['playTime', 'runTime', 'rushUntil', 'boostUntil', 'nextVisitor']) {
      state[key] = safe(raw[key] ?? state[key], 0, 1e9);
    }
    for (const key of ['prestiges', 'stamps', 'combo', 'signals', 'perfectSignals', 'flings',
      'peakCombo', 'visitCount', 'serial', 'autoSignals']) {
      state[key] = Math.floor(safe(raw[key], 0, Number.MAX_SAFE_INTEGER));
    }
    state.runTime = Math.min(state.runTime, state.playTime);
    state.runTotal = Math.min(state.runTotal, state.total);
    state.runPassengers = Math.min(state.runPassengers, state.passengers);
    state.rushUntil = Math.min(state.rushUntil, state.runTime + 30);
    state.boostUntil = Math.min(state.boostUntil, state.runTime + 30);
    state.nextVisitor = clamp(state.nextVisitor, state.runTime, state.runTime + 100);
    state.lastSpin = safe(raw.lastSpin ?? -100, -100, state.runTime);
    state.lastSignal = safe(raw.lastSignal ?? -100, -100, state.runTime);
    state.lastAuto = safe(raw.lastAuto ?? -100, -100, state.runTime);
    state.momentum = safe(raw.momentum, 0, 1);
    state.levels = UPGRADES.map((_, index) => {
      const rank = Math.floor(safe(raw.levels?.[index], 0, LEVEL_LIMIT));
      return raw.version < 3 && rank > FINE_LEVEL ? Math.min(LEVEL_LIMIT, FINE_LEVEL + (rank - FINE_LEVEL) * FINE_STEPS) : rank;
    });
    state.perks = PERKS.map(({ max, shifts = 0 }, index) => state.prestiges < shifts ? 0 : Math.floor(safe(raw.perks?.[index], 0, max)));
    state.claimed = CONTRACTS.map((_, index) => raw.claimed?.[index] === true);
    state.discovered = VISITORS.map((_, index) => raw.discovered?.[index] === true);
    state.ended = raw.ended === true;
    readNetwork(state);
    state.maxUnlocked = Math.max(state.unlocked, Math.floor(safe(raw.maxUnlocked, 1, ROUTES.length)));
    state.route = Math.floor(safe(raw.route, 0, state.unlocked - 1));
    state.blade = Math.floor(safe(raw.blade, 0, BLADES.length - 1));
    if (state.blade > maxBlade(state)) state.blade = 0;
    return state;
  }

  function price(state, index, quantity = 1) {
    const upgrade = UPGRADES[index];
    if (!Number.isInteger(index) || !upgrade || !Number.isInteger(quantity) || quantity < 1 || state.levels[index] + quantity > LEVEL_LIMIT) return Infinity;
    const start = state.levels[index];
    const coarse = Math.min(quantity, Math.max(0, FINE_LEVEL - start));
    const fine = quantity - coarse;
    const coarseCost = upgrade.base * Math.pow(upgrade.growth, start) * geometricSeries(upgrade.growth, coarse);
    const fineGrowth = Math.pow(upgrade.growth, 1 / FINE_STEPS);
    const fineBase = upgrade.base * ((fineGrowth - 1) / (upgrade.growth - 1));
    const fineCost = fineBase * Math.pow(upgrade.growth, powerLevel(start + coarse)) * geometricSeries(fineGrowth, fine);
    return Math.ceil((coarseCost + fineCost) * Math.pow(.92, state.perks[2]));
  }

  function geometricSeries(growth, quantity) {
    return (Math.pow(growth, quantity) - 1) / (growth - 1);
  }

  function powerLevel(level) {
    return level <= FINE_LEVEL ? level : FINE_LEVEL + (level - FINE_LEVEL) / FINE_STEPS;
  }

  function buy(state, index, quantity = 1) {
    const cost = price(state, index, quantity);
    if (cost > state.money) return false;
    state.money -= cost;
    state.levels[index] += quantity;
    return true;
  }

  function maxAffordable(state, index) {
    if (price(state, index) > state.money) return 0;
    let low = 1;
    let high = LEVEL_LIMIT - state.levels[index];
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (price(state, index, middle) <= state.money) low = middle;
      else high = middle - 1;
    }
    return low;
  }

  function buyMax(state, index) {
    return buy(state, index, maxAffordable(state, index));
  }

  function maxBlade(state) {
    return BLADES.findLastIndex(blade => blade.level <= state.levels[4] && state.prestiges >= (blade.shifts ?? 0));
  }

  function phaseAt(route, time) {
    return (time + 5) % route.cycle;
  }

  function routeWindow(state, route = ROUTES[state.route]) {
    return Math.min(route.cycle, route.window + state.perks[6]);
  }

  function economy(state, arrival, momentum = state.momentum, time = state.runTime) {
    const [ads, gears, motor, width, wings, ticket, groups] = state.levels.map(powerLevel);
    const route = ROUTES[state.route];
    const blade = BLADES[state.blade];
    const traffic = .32 * route.traffic * Math.pow(1.099, ads) * Math.pow(1.03, groups)
      * (arrival ? 1.72 * (blade.crowds ?? 1) : 1) * (time < state.rushUntil ? 1.37 : 1);
    const capacity = .48 * blade.capacity * Math.pow(1.12, width) * Math.pow(1.03, wings);
    const automatic = blade.idle * Math.pow(1.098, motor) * (1 + .18 * state.perks[1]);
    const served = (traffic * (capacity * 2.1)) / (traffic + capacity * 2.1) * automatic;
    const fare = route.yield * Math.pow(1.101, ticket) * Math.pow(1.041, groups) * metaMultiplier(state);
    const momentumBonus = 1 + momentum * (1.0 + .038 * gears) * blade.push;
    const boosted = time < state.boostUntil ? 1.28 : 1;
    const turnRate = .16 + Math.min(.62, .026 * motor) + momentum * .87;
    return { traffic, capacity, fare, served: served * momentumBonus, income: served * fare * momentumBonus * boosted, turnRate };
  }

  function metaMultiplier(state) {
    return (1 + .18 * state.perks[0]) * (1 + .38 * state.prestiges);
  }

  function prestigeCost(state) {
    return CHAPTERS[state.prestiges]?.target
      ?? Math.min(NUMBER_LIMIT, CHAPTERS.at(-1).target * Math.pow(4.2, state.prestiges - CAMPAIGN_SHIFTS));
  }

  function prestigeReward(state, cost = prestigeCost(state)) {
    if (state.runTotal < cost) return 0;
    return Math.min(24, 2 + Math.min(8, state.prestiges) + Math.floor(Math.log(state.runTotal / cost) / Math.log(2)));
  }

  function startingCapital(state, cost = prestigeCost(state)) {
    return 8 + 25 * state.perks[4] + Math.floor(cost * .004);
  }

  function stats(state) {
    const route = ROUTES[state.route];
    const routePhase = phaseAt(route, state.runTime);
    const windowLength = routeWindow(state, route);
    const window = routePhase < windowLength;
    const signalCooldown = Math.max(0, SIGNAL_INTERVAL - (state.runTime - state.lastSignal));
    const cost = prestigeCost(state);
    const reward = prestigeReward(state, cost);
    const values = economy(state, window);
    const automatic = automaticYield(state, route);
    return {
      ...values, throughput: values.served, routePhase, routeIn: window ? 0 : route.cycle - routePhase,
      windowRemaining: window ? windowLength - routePhase : 0, windowLength, window, signalReady: signalCooldown === 0,
      signalCooldown, prestigeReady: reward > 0, prestigeCost: cost, prestigeReward: reward,
      unlocked: state.unlocked, served: state.passengers,
      turns: state.turns, endTarget: END_TARGET, metaMultiplier: metaMultiplier(state),
      nextStartFunds: startingCapital(state, cost),
      chapter: CHAPTERS[state.prestiges] ?? null, campaignShifts: CAMPAIGN_SHIFTS,
      autoDispatch: state.prestiges >= AUTO_DISPATCH_SHIFT, autoIncome: automatic.amount / route.cycle,
    };
  }

  function event(state, title, text, kind, amount = 0, visitor) {
    state.events.unshift({ id: ++state.serial, time: state.playTime, title, text, kind, amount, visitor });
    if (state.events.length > 12) state.events.length = 12;
  }

  function readNetwork(state, report = false) {
    while (state.unlocked < ROUTES.length) {
      const next = ROUTES[state.unlocked];
      if ((state.runTotal < next.target && state.perks[4] < state.unlocked) || state.prestiges < next.shifts) break;
      state.unlocked++;
      state.maxUnlocked = Math.max(state.maxUnlocked, state.unlocked);
      if (report) event(state, next.name, 'Linie freigeschaltet.', 'route');
    }
    if (!state.ended && state.route === ROUTES.length - 1 && state.runTotal >= END_TARGET) {
      state.ended = true;
      event(state, '05:00 · Die Stadt wacht auf', 'Auf der Horizontlinie treffen alle Verbindungen ein. Deine Nachtweiche bleibt in Betrieb.', 'ending');
    }
  }

  function credit(state, money, passengers = 0) {
    state.money = Math.min(NUMBER_LIMIT, state.money + money);
    state.total = Math.min(NUMBER_LIMIT, state.total + money);
    state.runTotal = Math.min(NUMBER_LIMIT, state.runTotal + money);
    state.passengers = Math.min(NUMBER_LIMIT, state.passengers + passengers);
    state.runPassengers = Math.min(NUMBER_LIMIT, state.runPassengers + passengers);
    readNetwork(state, true);
  }

  function visit(state, values) {
    const count = state.visitCount++;
    const options = state.route >= 5 ? VISITORS.length : VISITORS.length - 1;
    const index = count % options;
    const visitor = VISITORS[index];
    state.discovered[index] = true;
    state.nextVisitor += 49 + (count * 19) % 31;
    let amount = 0;
    if (index === 0) state.rushUntil = state.runTime + 18;
    if (index === 1) {
      amount = values.income * (4 + .55 * powerLevel(state.levels[4]));
      credit(state, amount);
    }
    if (index === 2 || index === 4) {
      const people = values.served * (index === 2 ? 8 : 13);
      amount = people * values.fare * (index === 2 ? 1 : 1.35);
      credit(state, amount, people);
    }
    if (index === 3) state.momentum = Math.min(1, state.momentum + .48);
    event(state, visitor.name, visitor.desc, 'visitor', amount, visitor.id);
  }

  function automaticYield(state, route) {
    if (state.prestiges < AUTO_DISPATCH_SHIFT) return { people: 0, amount: 0 };
    const { served, fare } = economy(state, true, 0);
    const blade = BLADES[state.blade];
    const tier = Math.min(CAMPAIGN_SHIFTS, state.prestiges) - AUTO_DISPATCH_SHIFT;
    const load = tier === 0 ? .55 : 2.35 + .50 * (tier - 1);
    const people = served * route.cycle * load;
    const amount = people * fare * (route.automatic ?? 1) * (blade.automatic ?? 1) * (1 + .30 * state.perks[5]);
    return { people, amount };
  }

  function autoDispatch(state, route) {
    if (state.runTime - state.lastAuto < route.cycle * .85) return;
    const { people, amount } = automaticYield(state, route);
    if (amount === 0) return;
    state.lastAuto = state.runTime;
    state.autoSignals++;
    credit(state, amount, people);
    event(state, 'Automatisch abgefertigt', route.name, 'automatic', amount);
  }

  function step(state, seconds) {
    let remaining = safe(seconds, 0, OFFLINE_LIMIT);
    while (remaining > 0) {
      const route = ROUTES[state.route];
      const phase = phaseAt(route, state.runTime);
      const untilArrival = route.cycle - phase;
      const windowLength = routeWindow(state, route);
      const arrival = phase < windowLength;
      if (state.runTime >= state.nextVisitor) visit(state, economy(state, arrival));
      const untilVisitor = state.nextVisitor - state.runTime;
      const untilRushEnd = state.rushUntil > state.runTime ? state.rushUntil - state.runTime : Infinity;
      const untilBoostEnd = state.boostUntil > state.runTime ? state.boostUntil - state.runTime : Infinity;
      const delta = Math.min(remaining, arrival ? windowLength - phase : untilArrival,
        untilVisitor || Infinity, untilRushEnd, untilBoostEnd);
      if (delta < 1e-8) {
        state.playTime += delta;
        state.runTime += delta;
        remaining -= delta;
        // A sub-precision boundary must not trap the clock at the same value.
        if (remaining > 1e-8) {
          const nudge = Math.min(remaining, 1e-8);
          state.playTime += nudge;
          state.runTime += nudge;
          remaining -= nudge;
        }
        continue;
      }
      const decay = 3.8 + .42 * powerLevel(state.levels[1]);
      const averageMomentum = state.momentum * (-Math.expm1(-delta / decay) * decay / delta);
      const values = economy(state, arrival, averageMomentum, state.runTime + delta / 2);
      state.playTime += delta;
      state.runTime += delta;
      state.momentum *= Math.exp(-delta / decay);
      state.turns = Math.min(NUMBER_LIMIT, state.turns + delta * values.turnRate);
      if (state.runTime - state.lastSpin > 2.5) state.combo = 0;
      credit(state, values.income * delta, values.served * delta);
      if (delta === untilArrival) {
        event(state, route.name, 'Die Verbindung ist eingetroffen. Das Abfertigungsfenster ist offen.', 'arrival');
        state.events[0].route = route.id;
        autoDispatch(state, route);
      }
      if (state.runTime >= state.nextVisitor) visit(state, economy(state, phaseAt(route, state.runTime) < windowLength));
      remaining -= delta;
    }
    return state;
  }

  function offline(state, seconds) {
    const elapsed = safe(seconds, 0, OFFLINE_LIMIT);
    const earned = state.total;
    const passengers = state.passengers;
    step(state, elapsed);
    return { seconds: elapsed, earned: state.total - earned, passengers: state.passengers - passengers };
  }

  function spin(state, strength = 1) {
    const force = safe(strength, .25, 2);
    if (state.runTime - state.lastSpin < .33) return false;
    if (state.runTime - state.lastSpin > 2.5) state.combo = 0;
    state.lastSpin = state.runTime;
    state.combo++;
    state.peakCombo = Math.max(state.peakCombo, state.combo);
    const blade = BLADES[state.blade];
    state.momentum = Math.min(1, state.momentum + ((.16 + .17 * force) * blade.push * (1 + .035 * powerLevel(state.levels[1]))));
    const { fare, served } = economy(state, phaseAt(ROUTES[state.route], state.runTime) < routeWindow(state));
    const people = (.65 + served * .75) * force * (1 + .035 * Math.min(state.combo, 15));
    credit(state, people * fare, people);
    if (force >= 1.25) state.flings++;
    if ([5, 12, 25, 50, 100].includes(state.combo)) {
      if (state.combo % 5 === 0) state.boostUntil = Math.max(state.boostUntil, state.runTime + 6);
      event(state, `${state.combo} Anschübe`, 'Das Drehkreuz zieht in Serie durch.', 'combo');
    }
    return true;
  }

  function signal(state) {
    const values = stats(state);
    if (!values.signalReady) return false;
    const route = ROUTES[state.route];
    state.lastSignal = state.runTime;
    state.signals++;
    const people = values.throughput * (values.window ? 8 + route.cycle / 9 : 1.8);
    const bonus = BLADES[state.blade].timing * (1 + state.perks[3] * .20) * (route.dispatch ?? 1);
    const payout = people * values.fare * (values.window ? bonus : 1);
    if (values.window) {
      state.perfectSignals++;
      state.boostUntil = state.runTime + 16;
    }
    credit(state, payout, people);
    event(state, values.window ? 'Pünktlich abgefertigt' : 'Signal gegeben',
      values.window ? 'Die Verbindung war im richtigen Fenster.' : 'Einzelne Fahrgäste passieren das Drehkreuz.',
      values.window ? 'perfect' : 'signal', payout);
    return true;
  }

  function cardBonus(state) {
    const before = state.money;
    credit(state, stats(state).income * 45);
    const amount = state.money - before;
    event(state, 'Kurskarte abgeschlossen', 'Die Leitstelle schreibt 45 Sekunden Fahrgeld gut.', 'card', amount);
    return amount;
  }

  function selectRoute(state, index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.unlocked) return false;
    if (index === state.route) return false;
    state.route = index;
    readNetwork(state, true);
    return true;
  }

  function selectBlade(state, index) {
    if (!Number.isInteger(index) || !BLADES[index] || index > maxBlade(state) || index === state.blade) return false;
    state.blade = index;
    return true;
  }

  function contractProgress(state, index) {
    const contract = CONTRACTS[index];
    if (!Number.isInteger(index) || !contract) return 0;
    const progress = contract.metric === 'unlocked' ? state.maxUnlocked : Number(state[contract.metric]);
    return Math.min(contract.target, Math.floor(progress));
  }

  function claim(state, index) {
    const contract = CONTRACTS[index];
    if (!Number.isInteger(index) || !contract || state.claimed[index] || contractProgress(state, index) < contract.target) return false;
    state.claimed[index] = true;
    credit(state, contract.reward);
    event(state, contract.name, 'Auftrag abgeschlossen.', 'contract', contract.reward);
    return true;
  }

  function perkPrice(state, index) {
    const perk = PERKS[index];
    if (!Number.isInteger(index) || !perk || state.perks[index] >= perk.max || state.prestiges < (perk.shifts ?? 0)) return Infinity;
    return 1 + state.perks[index];
  }

  function buyPerk(state, index) {
    const cost = perkPrice(state, index);
    if (cost > state.stamps) return false;
    state.stamps -= cost;
    state.perks[index]++;
    readNetwork(state, true);
    return true;
  }

  function prestige(state) {
    const reward = prestigeReward(state);
    if (!reward) return false;
    const funds = startingCapital(state);
    state.stamps += reward;
    state.prestiges++;
    Object.assign(state, {
      money: funds, runTotal: 0, runPassengers: 0, runTime: 0,
      levels: UPGRADES.map(() => 0), momentum: 0, combo: 0, route: 0, blade: 0, unlocked: 1,
      lastSpin: -100, lastSignal: -100, lastAuto: -100, rushUntil: 0, boostUntil: 0, nextVisitor: 42, visitCount: 0,
    });
    event(state, 'Schichtwechsel', `${reward} Netzmarken und ${new Intl.NumberFormat('de-DE', { notation: 'compact' }).format(funds)} Fahrgeld für die nächste Schicht.`, 'prestige', reward);
    readNetwork(state, true);
    return true;
  }

  const Engine = { UPGRADES, ROUTES, BLADES, PERKS, CONTRACTS, VISITORS, CHAPTERS, create, load, step,
    offline, spin, signal, cardBonus, price, buy, buyMax, selectRoute, selectBlade, stats, contractProgress,
    claim, prestige, perkPrice, buyPerk, maxAffordable, maxBlade, metaMultiplier };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  if (typeof window !== 'undefined') window.Engine = Engine;
})();
