'use strict';

// A worktree's corner says "cut from the project above". In the plugin's own
// order that is always true, because the family key holds a family in one
// block. In Herdr's order (`order = off`) a worktree opened later is appended
// to the end of the list, and the corner would hang it off whichever project
// sits above it (#54). Such a worktree is drawn as one whose parent is absent:
// the repo name on a row of its own, no tee into a stranger.

const test = require('node:test');
const assert = require('node:assert/strict');

const herdr = require('../lib/herdr');
const state = require('../lib/state');
const { Frame } = require('../lib/frame');

// Herdr's workspace order from the report: app, its first worktree, an
// unrelated project, a worktree of app opened later, another project.
const entries = ['app', 'feature', 'other', 'hotfix', 'scratch'].map((ws) => ({
  pane: `${ws}:p1`,
  workspace: ws,
  tab: `${ws}:t1`,
  name: 'claude',
  title: 'x',
}));
const parents = new Map([
  ['feature', 'app'],
  ['hotfix', 'app'],
]);
const worktrees = new Map([
  ['feature', 'app'],
  ['hotfix', 'app'],
]);

function treeFor(viewMode) {
  const frame = new Frame('test');
  const ranks = frame.sortKeys(entries, parents, worktrees);
  const displayEntries = frame.displayOrder(entries, viewMode, ranks);
  return { tree: frame.strayWorktrees(displayEntries, ranks, worktrees), displayEntries };
}

test('in Herdr order a worktree away from its family is drawn as an orphan', () => {
  const { tree } = treeFor(null);
  assert.equal(tree.parentOf.get('feature'), 'app', 'the worktree under its parent keeps the tree');
  assert.equal(tree.parentOf.has('hotfix'), false, 'the stray is no longer a child');
  assert.equal(tree.orphanRepo.get('hotfix'), 'app', 'it names its repo inline instead');
  assert.equal(tree.nested('hotfix'), true, 'and still sits one level in');
});

test('in the plugin order a family is one block, so nothing is detached', () => {
  const { tree, displayEntries } = treeFor('grouped');
  const order = [...new Set(displayEntries.map((entry) => entry.workspace))];
  const family = ['app', 'feature', 'hotfix'].map((ws) => order.indexOf(ws)).sort((a, b) => a - b);
  assert.equal(family[2] - family[0], 2, `the family is contiguous in ${order.join(', ')}`);
  assert.equal(tree.parentOf.get('hotfix'), 'app');
  assert.equal(tree.orphanRepo.has('hotfix'), false);
});

test('writeGroups gives the stray a repo row and no tee into the project above', async (t) => {
  const sent = new Map();
  t.mock.method(herdr, 'reportMetadataAsync', async (pane, _source, tokens) => {
    sent.set(pane, tokens);
    return true;
  });
  const { tree } = treeFor(null);
  const labels = new Map(entries.map((entry) => [entry.workspace, entry.workspace]));
  await state.writeGroups('test', entries, labels, new Set(), { parentOf: tree.parentOf, orphanRepo: tree.orphanRepo });
  assert.match(sent.get('feature:p1').group, /[├└]─ /, 'the attached worktree keeps its corner');
  assert.equal(sent.get('hotfix:p1').group_parent, 'app', 'the stray gets its repo on a row of its own');
  assert.doesNotMatch(sent.get('hotfix:p1').group, /├─/, 'and no tee continuing a stranger');
  assert.equal(sent.get('other:p1').group_parent, null, 'the project above is left alone');
});
