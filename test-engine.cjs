'use strict';

const assert = require('node:assert/strict');
const Engine = require('./engine.js');

const first = Engine.create();
assert.equal(Engine.buy(first, 2), true);
assert.equal(Engine.buy(first, 0), false);
assert.equal(Engine.selectRoute(first, 1), false);
assert.equal(Engine.selectBlade(first, 1), false);
assert.equal(Engine.signal(first), true);
assert.equal(first.perfectSignals, 1);

const signalBaseline = Engine.create();
const signalVeteran = Engine.create();
signalVeteran.passengers = 100000000;
Engine.signal(signalBaseline);
Engine.signal(signalVeteran);
assert.equal(signalVeteran.total, signalBaseline.total);

const card = Engine.create();
card.total = Engine.ROUTES[1].target - 1;
card.runTotal = card.total;
const targetBonus = Engine.stats(card).income * 45;
assert.ok(Math.abs(Engine.cardBonus(card) - targetBonus) < .0001);
assert.ok(card.runTotal >= Engine.ROUTES[1].target && card.unlocked === 2);
assert.equal(card.events[0].kind, 'card');
assert.equal(Engine.signal(first), false);
for (let index = 0; index < 12; index++) {
  assert.equal(Engine.spin(first, 1.4), true);
  assert.equal(Engine.spin(first), false);
  Engine.step(first, .6);
}
assert.equal(first.flings, 12);
assert.equal(first.peakCombo, 12);
assert.equal(Engine.claim(first, 2), true);
assert.equal(Engine.claim(first, 2), false);
Engine.step(first, 4);
assert.equal(first.combo, 0);
assert.ok(first.momentum < 1 && first.momentum > 0);
assert.ok(first.unlocked > 1);
assert.equal(Engine.selectRoute(first, 1), true);
Engine.step(first, 12);
assert.equal(Engine.stats(first).window, false);
assert.equal(Engine.signal(first), true);
assert.equal(first.perfectSignals, 1);

const restored = Engine.load(JSON.parse(JSON.stringify(first)));
for (const key of ['money', 'total', 'route', 'flings', 'playTime']) assert.equal(restored[key], first[key]);
assert.ok(Array.isArray(restored.events));
const malformed = Engine.load({
  money: Infinity, levels: [-1, 'bad', 900], route: 999, blade: 4, unlocked: 999,
  signal: -1, momentum: 99, playTime: 1e190, runTime: 1e190, nextVisitor: 0,
});
assert.equal(malformed.money, 0);
assert.equal(malformed.levels[0], 0);
assert.equal(malformed.levels[1], 0);
assert.equal(malformed.levels[2], 480);
assert.equal(malformed.route, 0);
assert.equal(malformed.blade, 0);
assert.ok(malformed.playTime < 1e190);
assert.ok(Number.isFinite(Engine.stats(malformed).income));
assert.equal(Engine.buy(malformed, 'constructor'), false);
assert.equal(Engine.buyPerk(malformed, 'constructor'), false);
assert.equal(Engine.claim(malformed, 'constructor'), false);
const offline = Engine.offline(restored, 48 * 3600);
assert.equal(offline.seconds, 24 * 3600);
assert.ok(offline.earned > 0 && offline.passengers > 0);
assert.ok(restored.discovered.filter(Boolean).length >= 4);
assert.ok(restored.events.some(event => event.kind === 'arrival' && event.route));
assert.equal(Engine.step(restored, -1), restored);
assert.ok(restored.events.length <= 12);

const coarse = Engine.create();
const fine = Engine.create();
Engine.step(coarse, 240);
for (let sample = 0; sample < 960; sample++) Engine.step(fine, .25);
assert.ok(Math.abs(coarse.money - fine.money) < .0001);
assert.deepEqual(coarse.discovered, fine.discovered);

const transition = Engine.create();
const requirement = Engine.stats(transition).prestigeCost;
transition.runTotal = requirement;
transition.total = requirement;
const beforeReset = Engine.stats(transition);
assert.equal(Engine.prestige(transition), true);
assert.equal(transition.runTotal, 0);
assert.equal(transition.total, requirement);
assert.equal(transition.money, beforeReset.nextStartFunds);
assert.equal(transition.stamps, beforeReset.prestigeReward);
assert.ok(Engine.metaMultiplier(transition) > 1.35);
assert.ok(Engine.stats(transition).prestigeCost > requirement);
assert.equal(Engine.buyPerk(transition, 0), true);
assert.ok(Engine.metaMultiplier(transition) > 1.6);

const automated = Engine.load({ version: 3, money: 100, prestiges: 3 });
const unautomated = Engine.create();
assert.equal(Engine.stats(unautomated).autoDispatch, false);
assert.equal(Engine.stats(automated).autoDispatch, true);
assert.ok(Engine.stats(automated).autoIncome > 0);
assert.equal(Engine.perkPrice(automated, 5), Infinity);
Engine.signal(automated);
Engine.step(automated, 19);
assert.equal(automated.autoSignals, 1);
assert.equal(automated.perfectSignals, 1);
assert.equal(Engine.load(JSON.parse(JSON.stringify(automated))).lastAuto, automated.lastAuto);

const latePerk = Engine.load({ version: 3, prestiges: 5, stamps: 2, levels: [0, 0, 0, 0, 50] });
assert.equal(Engine.maxBlade(latePerk), Engine.BLADES.length - 1);
assert.ok(Engine.buyPerk(latePerk, 6));
assert.equal(Engine.stats(latePerk).windowLength, Engine.ROUTES[0].window + 1);

const fineCosts = Engine.load({ version: 3, money: 1e10, levels: [20] });
const { base, growth } = Engine.UPGRADES[0];
assert.equal(Engine.price(fineCosts, 0, 6), Math.ceil(base * growth ** 20));
assert.equal(Engine.load({ version: 1, levels: [21] }).levels[0], 26);

const bulk = Engine.create();
bulk.money = 1000;
const amount = Engine.maxAffordable(bulk, 4);
assert.ok(amount >= 3);
const spend = Engine.price(bulk, 4, amount);
assert.ok(Engine.price(bulk, 4, amount + 1) > bulk.money);
assert.ok(Engine.buyMax(bulk, 4));
assert.equal(bulk.money, 1000 - spend);
assert.equal(bulk.levels[4], amount);
assert.ok(Engine.maxBlade(bulk) >= 1);
assert.equal(Engine.selectBlade(bulk, 1), true);

function invest(state, active) {
  // A repeatable, moderately attentive player. Balance levels instead of optimizing every purchase.
  let bought = 0;
  while (true) {
    let candidate = -1;
    let candidateCost = Infinity;
    for (const [index, upgrade] of Engine.UPGRADES.entries()) {
      if (upgrade.id === 'getriebe' && !active) continue;
      const cost = Engine.price(state, index);
      const weighted = cost / [1.05, .37, 1.6, .9, .74, 1.3, 1][index];
      if (cost <= state.money && weighted < candidateCost) {
        candidate = index;
        candidateCost = weighted;
      }
    }
    if (!Engine.buy(state, candidate)) return bought;
    bought++;
  }
}

function play(hours, active, attendance = 120, spinEvery = 2, stepSize = 1) {
  const state = Engine.create();
  const shifts = [];
  const lines = [];
  const returnToTram = [];
  let longestGap = 0;
  let lastPurchase = 0;
  let ending = null;
  for (let second = 0; second < hours * 3600; second += stepSize) {
    const attending = active && second % 600 < attendance;
    if (attending) {
      if (second % spinEvery === 0) Engine.spin(state, 1.3);
      const status = Engine.stats(state);
      if (status.window && status.signalReady) Engine.signal(state);
    }
    if (second % 30 === 0) {
      if (state.unlocked > 1 && returnToTram.length <= state.prestiges) returnToTram.push(state.runTime);
      if (state.unlocked > lines.length) lines.push(...Array(state.unlocked - lines.length).fill(second));
      for (let contract = 0; contract < Engine.CONTRACTS.length; contract++) Engine.claim(state, contract);
      if (state.prestiges < Engine.stats(state).campaignShifts && Engine.prestige(state)) {
        shifts.push(second);
        const priorities = active && attendance >= 600 ? [0, 1, 2, 6, 5, 4, 3] : [5, 1, 0, 2, 6, 4, 3];
        while (priorities.some(perk => Engine.buyPerk(state, perk))) {}
      }
      Engine.selectRoute(state, state.unlocked - 1);
      if (invest(state, active) && ending === null) {
        longestGap = Math.max(longestGap, second - lastPurchase);
        lastPurchase = second;
      }
      const availableBlade = Engine.maxBlade(state);
      Engine.selectBlade(state, Math.min(availableBlade, attending ? 2 : 5));
    }
    Engine.step(state, stepSize);
    if (ending === null && state.ended) ending = second;
  }
  return { state, shifts, lines, returnToTram, longestGap, ending };
}

const mixed = play(10, true);
const idle = play(10, false);
const lateMixed = play(48, true);
const lateIdle = play(60, false);
const dedicated = play(24, true, 600, 1);
const stress = play(16, true, 600, .5, .5);
const summarize = ({ state, shifts, lines, returnToTram, longestGap, ending }) => ({
  total: Math.round(state.total), runTotal: Math.round(state.runTotal), passengers: Math.round(state.passengers),
  highestLine: Engine.ROUTES[state.maxUnlocked - 1].name, shifts, lines, returnToTram, longestGap, ending,
  autoSignals: state.autoSignals,
});
console.log('10h mixed', summarize(mixed));
console.log('10h idle', summarize(idle));
console.log('48h mixed', summarize(lateMixed));
console.log('60h idle', summarize(lateIdle));
console.log('24h dedicated', summarize(dedicated));
console.log('16h high intensity', summarize(stress));

assert.ok(mixed.state.total > idle.state.total);
assert.ok(mixed.state.perfectSignals >= 50);
assert.ok(mixed.state.prestiges >= 2);
assert.ok(idle.state.prestiges >= 1);
assert.equal(mixed.ending, null);
assert.equal(idle.ending, null);
assert.ok(lateMixed.ending >= 18 * 3600 && lateMixed.ending < 30 * 3600);
assert.ok(lateIdle.ending > lateMixed.ending && lateIdle.ending < 36 * 3600);
assert.ok(stress.ending >= 10 * 3600 && stress.ending < 12 * 3600);
assert.ok(dedicated.ending >= stress.ending && dedicated.ending < 16 * 3600);
assert.ok(stress.longestGap <= 180 && lateMixed.longestGap <= 300);
assert.ok(stress.state.autoSignals > 100 && lateIdle.state.autoSignals > 100);
assert.equal(stress.lines.length, Engine.ROUTES.length);
assert.ok(lateIdle.state.total > idle.state.total * 1.5);
assert.ok(lateIdle.returnToTram[1] < lateIdle.returnToTram[0] / 2);
assert.ok(lateIdle.state.ended && lateIdle.state.prestiges === Engine.CHAPTERS.length - 1);
assert.ok(Engine.prestige(lateIdle.state));
assert.ok(lateIdle.state.ended && lateIdle.state.prestiges === Engine.CHAPTERS.length);
assert.ok(Engine.stats(lateIdle.state).prestigeCost > Engine.stats(idle.state).prestigeCost);
