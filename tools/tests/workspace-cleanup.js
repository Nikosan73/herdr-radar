'use strict';

const assert = require('node:assert/strict');
const state = require('../../lib/state');
const { Frame } = require('../../lib/frame');

async function main() {
  let clears = 0;
  let writes = 0;
  state.clearSpaceState = async () => {
    clears += 1;
    return false;
  };
  state.writeSpaceState = async () => {
    writes += 1;
    return true;
  };
  const frame = new Frame('plugin:hhdebb.herdr-radar');
  frame.lastSpace.set('deleted', 'old');
  frame.failedAt.set('space:deleted', { count: 3, until: Date.now() + 60000 });
  const jobs = [];
  frame.spaceJobs(new Map(), new Map(), Date.now(), jobs);
  await Promise.all(jobs);
  assert.equal(frame.lastSpace.has('deleted'), false, 'forget deleted workspace');
  assert.equal(frame.failedAt.has('space:deleted'), false, 'forget its retry deadline');
  assert.equal(clears, 0, 'never clear metadata on a deleted target');

  // A surviving workspace with no agents still needs its neutral badge.
  const workspaces = new Map([['live', 'Live project']]);
  for (let i = 0; i < 2; i += 1) {
    const pending = [];
    frame.spaceJobs(new Map(), workspaces, Date.now(), pending);
    await Promise.all(pending);
  }
  assert.equal(writes, 1, 'paint live workspace once and retain its cache');
  assert.equal(frame.lastSpace.has('live'), true);
  console.log('workspace cleanup: ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
