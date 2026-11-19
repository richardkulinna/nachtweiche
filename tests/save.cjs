'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSaveStore } = require('../save-store.cjs');

const temp = path.resolve(os.tmpdir());
const directory = fs.mkdtempSync(path.join(temp, 'nachtweiche-save-test-'));
try {
  const files = [1, 2].map(n => path.join(directory, 'spielstand-' + n + '.json'));
  const store = createSaveStore(directory);
  const first = { state: { money: 8 } };
  const second = { state: { money: 42 } };
  assert.equal(store.load(), null);
  assert(store.save(first));
  assert(store.save(second));
  assert.deepEqual(store.load(), second);

  const good = fs.readFileSync(files[1], 'utf8');
  const tampered = JSON.parse(good);
  tampered.data = JSON.stringify({ state: { money: 999 } });
  fs.writeFileSync(files[1], JSON.stringify(tampered));
  assert.deepEqual(store.load(), first);
  fs.writeFileSync(files[1], '{');
  fs.writeFileSync(files[1] + '.tmp', good);
  assert.deepEqual(store.load(), first);

  assert(store.save(second));
  assert.deepEqual(store.load(), second);
  assert.equal(store.save(null), false);
  assert.equal(store.save({ huge: 'x'.repeat(2100000) }), false);
  assert.deepEqual(store.load(), second);
  console.log('Passed: normal save, checksum failure, interrupted write, recovery and oversize rejection.');
} finally {
  if (path.dirname(path.resolve(directory)) === temp && path.basename(directory).startsWith('nachtweiche-save-test-')) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
