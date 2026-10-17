'use strict';

// Herdr keeps the view override in the server's memory only. When it is lost,
// the panel falls back to Herdr's own order while the group headers are still
// placed for the plugin's, and a header lands mid-group (#49). The daemon puts
// the chosen order back on a timer; these pin down what that re-apply does.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const view = require('../lib/view');

test('the chosen order is set again', async (t) => {
  t.mock.method(view, 'mode', () => 'grouped');
  const apply = t.mock.method(view, 'apply', async () => ({ result: { active: true } }));
  await view.reassert();
  assert.equal(apply.mock.callCount(), 1);
  assert.deepEqual(apply.mock.calls[0].arguments, ['grouped']);
});

test("Herdr's own order, once chosen, is left alone", async (t) => {
  t.mock.method(view, 'mode', () => null);
  const apply = t.mock.method(view, 'apply', async () => null);
  const clear = t.mock.method(view, 'clear', async () => null);
  assert.equal(await view.reassert(), null);
  assert.equal(apply.mock.callCount(), 0, 'nothing is set');
  assert.equal(clear.mock.callCount(), 0, "and another source's view is not cleared");
});

test('the daemon re-applies on a timer and a view switch waits for it', () => {
  const daemon = fs.readFileSync(path.join(__dirname, '..', 'lib', 'daemon.js'), 'utf8');
  assert.match(
    daemon,
    /setInterval\(\(\) => \{\s*if \(stopping \|\| reasserting\) return;\s*reasserting = view\s*\.reassert\(\)/,
  );
  assert.match(daemon, /view: async \(message\) => \{\s*await reasserting;/);
});
