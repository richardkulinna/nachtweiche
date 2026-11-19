'use strict';
// Real window smoke test. The app receives a fresh, isolated test profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { createSaveStore } = require('../save-store.cjs');
const { spawn } = require('node:child_process');
const { setTimeout: wait } = require('node:timers/promises');
const root = path.resolve(__dirname, '..');
const exe = path.resolve(process.argv[2] || path.join(root, 'Release', 'Nachtweiche.exe'));
const output = path.resolve(process.argv[3] || path.join(root, 'test-results'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nachtweiche-test-'));
const errors = [];
async function portNumber() {
  const s = net.createServer();
  await new Promise((resolve) => s.listen(0, '127.0.0.1', resolve));
  const port = s.address().port;
  await new Promise((resolve) => s.close(resolve));
  return port;
}
async function connect(port) {
  let target;
  for (let i = 0; i < 180; i++) {
    try {
      target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(
        (p) => p.type === 'page' && p.url.includes('index.html'),
      );
    } catch {}
    if (target) break;
    await wait(300);
  }
  assert(target, 'Game window did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl),
    requests = new Map();
  let id = 0;
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(
        message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text,
      );
    if (!message.id) return;
    const pending = requests.get(message.id);
    if (!pending) return;
    requests.delete(message.id);
    message.error ? pending.reject(Error(message.error.message)) : pending.resolve(message.result);
  };
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      requests.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  await send('Runtime.enable');
  await send('Page.enable');
  async function evalJS(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails)
      throw Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    return res.result.value;
  }
  async function until(expression) {
    for (let i = 0; i < 120; i++) {
      if (await evalJS(expression)) return;
      await wait(75);
    }
    throw Error('Condition failed: ' + expression);
  }
  async function click(selector) {
    const pos = await evalJS(
      '(()=>{const el=document.querySelector(' +
        JSON.stringify(selector) +
        ');if(!el||el.disabled||!el.getClientRects().length)return null;el.scrollIntoView({block:"nearest"});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()',
    );
    assert(pos, 'Missing visible control ' + selector);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...pos, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      ...pos,
      button: 'left',
      clickCount: 1,
    });
    await wait(70);
  }
  async function shot(name) {
    const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(data, 'base64'));
  }
  return { send, evalJS, click, until, shot, close: () => ws.close() };
}
async function run() {
  fs.mkdirSync(output, { recursive: true });
  const port = await portNumber();
  const isDev = path.basename(exe).toLowerCase() === 'electron.exe';
  const args = [...(isDev ? [root] : []), '--test-profile=' + profile, '--test-debug-port=' + port];
  let child = spawn(exe, args, { windowsHide: true, stdio: 'ignore' });
  let client;
  try {
    client = await connect(port);
    const { send, evalJS, until, click, shot } = client;
    await until(
      'document.readyState==="complete" && typeof scene!=="undefined" && !!document.querySelector("#show-shop")',
    );
    await until('document.querySelector("#world").width>300');
    await shot('01-stellwerk');
    assert.equal(await evalJS('document.querySelector("#place").textContent'), 'Kesselplatz');
    assert.equal(await evalJS('s.levels[2]'), 0);
    assert.equal(await evalJS('document.querySelector("#workbench").open'), false);
    await click('#show-shop');
    await shot('01b-werkstatt');
    await click('[data-buy="2"]');
    assert.equal(await evalJS('s.levels[2]'), 1, 'Starter motor purchase');
    assert.equal(await evalJS('document.querySelectorAll("[data-buy]")[2].disabled'), true);
    await click('#close-shop');
    const keypress = async (key, code, keyCode) => {
      for (const type of ['keyDown', 'keyUp']) {
        await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode });
      }
    };
    await keypress('w', 'KeyW', 87);
    assert(await evalJS('document.querySelector("#workbench").open'), 'Keyboard opens workshop');
    await keypress('w', 'KeyW', 87);
    await keypress(' ', 'Space', 32);
    assert(await evalJS('s.momentum>0 && !document.querySelector("#workbench").open'), 'Space spins after closing the workshop');
    await wait(350);
    // Exercise the actual mouse gesture around the rendered gate.
    const center = await evalJS(
      '(()=>{const c=scene.gateCenter(),r=document.querySelector("#world").getBoundingClientRect();return {x:c.x+r.x,y:c.y+r.y}})()',
    );
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: center.x + 37,
      y: center.y,
      button: 'left',
      clickCount: 1,
    });
    for (let i = 1; i <= 36; i++) {
      const theta = (i * Math.PI) / 9;
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: center.x + 37 * Math.cos(theta),
        y: center.y + 28 * Math.sin(theta),
        buttons: 1,
      });
      await wait(20);
    }
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: center.x + 37,
      y: center.y,
      button: 'left',
    });
    assert(await evalJS('s.flings>=1 && s.momentum>0'), 'Actual circular gesture');
    await click('#signal');
    assert(await evalJS('s.signals>=1'), 'Signal button');
    await click('[data-tab="network"]');
    await shot('02-liniennetz');
    await click('[data-route-detail="1"]');
    assert(await evalJS('document.querySelector("[data-route]").disabled'), 'Locked line');
    await click('[data-network="courses"]');
    assert.equal(await evalJS('document.querySelectorAll(".course").length'), 16);
    await click('[data-network="prestige"]');
    assert.equal(await evalJS('document.querySelector("#prestige").disabled'), true);
    await click('[data-tab="journal"]');
    await click('[data-journal="archive"]');
    await click('#settings');
    await click('[data-setting="mono"]');
    assert(await evalJS('document.body.classList.contains("mono")'));
    await click('[data-setting="reduced"]');
    await click('[data-save]');
    assert(await evalJS('nachtHost.load().prefs.mono'));
    await click('[data-dialog-close]');
    await click('[data-tab="station"]');
    await click('#show-shop');
    await click('[data-bench="blades"]');
    assert(await evalJS('document.querySelectorAll("[data-blade]").length>=5'));
    await click('[data-bench="upgrades"]');
    await click('[data-qty="max"]');
    await click('#close-shop');
    const originalDocument = await evalJS('performance.timeOrigin');
    await send('Page.reload');
    await until(
      'performance.timeOrigin!==' +
        originalDocument +
        ' && document.readyState==="complete" && typeof s!=="undefined" && document.querySelector("#world").width>300 && s.levels[2]===1',
    );
    assert(await evalJS('prefs.mono'), 'Preferences round trip');
    // Seed representative later campaigns via the same validated save format the app reads.
    await evalJS(
      'Object.assign(s,E.load({...E.create(),money:5e6,total:5e6,runTotal:5e6,passengers:2000,runPassengers:2000,levels:[8,8,8,8,6,8,8]}));prefs.mono=false;prefs.reduced=false;applyPrefs();render()',
    );
    await click('[data-tab="network"]');
    await click('[data-network="courses"]');
    await click('[data-course="0"]');
    assert.equal(await evalJS('book.active'), 0);
    const arrive = async () => {
      await evalJS(
        's.runTime=(Math.ceil(s.runTime/E.ROUTES[s.route].cycle)+1)*E.ROUTES[s.route].cycle-4.6;s.playTime=s.runTime+50;s.lastSignal=-100;render()',
      );
      await click('#signal');
    };
    await arrive();
    assert.equal(await evalJS('book.step'), 1);
    await click('[data-tab="network"]');
    await click('[data-network="courses"]');
    await click('[data-course-go]');
    assert.equal(await evalJS('s.route'), 1);
    await arrive();
    assert(await evalJS('book.done.includes(0)'));
    await click('[data-dialog-close]');
    await click('[data-tab="journal"]');
    await click('[data-journal="contracts"]');
    await click('[data-claim="0"]');
    assert(await evalJS('s.claimed[0]'));
    await click('[data-tab="network"]');
    await click('[data-network="prestige"]');
    await click('#prestige');
    await click('[data-dialog-close]');
    assert.equal(await evalJS('s.prestiges'), 0, 'Cancel prestige');
    await click('#prestige');
    await click('[data-confirm-prestige]');
    assert.equal(await evalJS('s.prestiges'), 1);
    await click('[data-perk="0"]');
    assert(await evalJS('s.perks[0]===1 && book.done.includes(0) && s.claimed[0]'));
    await evalJS(
      'Object.assign(s,E.load({...s,prestiges:8,route:E.ROUTES.length-2,runTotal:9e17,total:9e17,money:1e16,levels:[33,30,31,31,30,30,30],blade:E.BLADES.length-1}));prefs.theme="dark";applyPrefs();navigate("station");',
    );
    await wait(400);
    await shot('03-spaetschicht');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 900,
      height: 570,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await wait(300);
    await shot('04-kompakt');
    assert(
      await evalJS(
        'document.documentElement.scrollWidth<=innerWidth && ["spin","signal","show-shop"].every(id=>document.getElementById(id).getBoundingClientRect().bottom<=innerHeight+4)',
      ),
      'Small desktop layout fits',
    );
    await click('[data-tab="network"]');
    await click('[data-network="routes"]');
    const last = await evalJS('E.ROUTES.length-1');
    await evalJS('s.runTotal=E.stats(s).endTarget*.95;render()');
    await click('[data-route-detail="' + last + '"].route-choice');
    await click('[data-route="' + last + '"]');
    await click('#settings');
    await evalJS('s.runTotal=E.stats(s).endTarget-1;E.step(s,1);render()');
    assert.equal(await evalJS('document.querySelector("#dialog-title").textContent'), 'Einstellungen');
    await click('[data-dialog-close]');
    await until(
      's.ended && document.querySelector("#dialog-title").textContent==="Die Stadt wacht auf" && document.querySelector("#dialog").open',
    );
    await shot('05-finale');
    await click('[data-dialog-close]');
    assert(await evalJS('save() && nachtHost.load().state.ended'), 'Finale persisted');
    const endingTarget = await evalJS('E.stats(s).endTarget');
    await evalJS('setTimeout(()=>window.close(),40);true');
    client.close();
    client = null;
    for (let i = 0; i < 120 && child.exitCode === null; i++) await wait(100);
    assert.notEqual(child.exitCode, null, 'First process closed');
    const store = createSaveStore(profile),
      snap = store.load();
    assert(snap.state.ended && snap.book.done.includes(0));
    snap.state.ended = false;
    snap.state.runTotal = endingTarget - 1;
    snap.at = Date.now() - 3600000;
    delete snap.book.endingSeen;
    delete snap.book.ending;
    assert(store.save(snap));
    child = spawn(exe, args, { windowsHide: true, stdio: 'ignore' });
    client = await connect(port);
    await client.until('document.querySelector("#dialog-title")?.textContent==="Willkommen zurück"');
    assert(
      await client.evalJS('s.ended && offlineSummary.seconds>=3595 && offlineSummary.earned>0'),
      'Earned offline at actual relaunch',
    );
    await client.click('[data-dialog-close]');
    await client.until(
      'document.querySelector("#dialog-title").textContent==="Die Stadt wacht auf" && document.querySelector("#dialog").open',
    );
    await client.click('[data-dialog-close]');
    assert(
      await client.evalJS('nachtHost.load().book.endingSeen && (Date.now()-nachtHost.load().at)<10000'),
      'Offline interval consumed and ending recorded',
    );
    assert.deepEqual(errors, [], 'Renderer exceptions');
    console.log(
      'Passed: launch, input, purchases, route map, signals, course sequence, contracts, settings, reload, prestige, perks, compact layout, queued ending, offline credit and real exit/relaunch.',
    );
  } finally {
    if (client) {
      try {
        await client.evalJS('setTimeout(()=>window.close(),50);true');
      } catch {}
      client.close();
    }
    for (let i = 0; i < 50 && child.exitCode === null; i++) await wait(100);
    if (child.exitCode === null) child.kill();
    if (child.exitCode !== null && path.dirname(path.resolve(profile)) === path.resolve(os.tmpdir()) &&
        path.basename(profile).startsWith('nachtweiche-test-')) {
      fs.rmSync(profile, {recursive: true, force: true, maxRetries: 4, retryDelay: 100});
    }
    console.log('Screenshots: ' + output);
  }
}
run().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
